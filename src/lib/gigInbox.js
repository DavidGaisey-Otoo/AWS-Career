/**
 * gigInbox.js — read the gig packs Claude Code writes, and keep them honest.
 *
 * The pipeline has no AI API. David's Claude Code session (the `gig` skill)
 * writes one folder per job into a private folder on his laptop:
 *
 *   AWS Gigs\
 *     index.json
 *     20261120-some-job\  job.json fit.json proposal.md questions.md plan.md
 *                         diagram.drawio lesson.md cheatsheet.md messages.md
 *                         status.json
 *     checks\2026-11-20.md
 *
 * This module turns those files into something the Gigs tab can show, and
 * it is pure so the rules are testable without a browser. The folder holds
 * client data: nothing here persists file contents to localStorage, and the
 * only file the app ever writes back is status.json.
 *
 * Honesty rules (CLAUDE.md §2) apply to what is shown:
 *   - a missing field reads as unknown, never as a pass;
 *   - a file that will not parse is reported, not silently dropped;
 *   - client-facing text is checked before David copies it.
 */
import { findUnsupportedClaims, CLAIM_LABELS } from './claimSafety.js';

export const GIG_FILES = Object.freeze([
  'job.json', 'fit.json', 'status.json', 'proposal.md', 'questions.md', 'plan.md',
  'diagram.drawio', 'lesson.md', 'cheatsheet.md', 'messages.md',
]);

export const GIG_STAGES = Object.freeze([
  { id: 'new', label: 'New' },
  { id: 'applied', label: 'Applied' },
  { id: 'interview', label: 'Interview' },
  { id: 'won', label: 'Won' },
  { id: 'delivering', label: 'Delivering' },
  { id: 'done', label: 'Done' },
  { id: 'lost', label: 'Lost' },
]);
const STAGE_IDS = new Set(GIG_STAGES.map((s) => s.id));

/** Folder names look like `20261120-short-slug`. Anything else is not a gig. */
export const GIG_ID = /^\d{8}-[a-z0-9][a-z0-9-]{0,80}$/;

/** Upper bound per file, so a stray huge file cannot freeze the tab. */
export const MAX_GIG_FILE_BYTES = 1024 * 1024;

function parseJson(text, name, problems) {
  if (text == null) return null;
  try {
    const value = JSON.parse(text);
    if (value && typeof value === 'object') return value;
    problems.push(`${name} is not a JSON object.`);
  } catch (e) {
    problems.push(`${name} could not be read: ${e.message}`);
  }
  return null;
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const bool = (v) => (typeof v === 'boolean' ? v : null);

/**
 * One gig folder → a view model.
 * @param {string} id folder name
 * @param {Record<string,string>} files file name → text (missing = absent)
 */
export function parseGigFolder(id, files = {}) {
  const problems = [];
  if (!GIG_ID.test(id)) problems.push(`Folder name "${id}" is not in the yyyymmdd-name form.`);

  const jobRaw = parseJson(files['job.json'], 'job.json', problems);
  const fitRaw = parseJson(files['fit.json'], 'fit.json', problems);
  const statusRaw = parseJson(files['status.json'], 'status.json', problems);
  if (!files['job.json']) problems.push('job.json is missing, so the job details are unknown.');

  const client = jobRaw?.client || {};
  const budget = jobRaw?.budget || {};
  const job = {
    title: str(jobRaw?.title) || id,
    url: str(jobRaw?.url),
    source: str(jobRaw?.source),
    sample: jobRaw?.sample === true,
    description: str(jobRaw?.description),
    skills: Array.isArray(jobRaw?.skills) ? jobRaw.skills.filter((s) => typeof s === 'string') : [],
    questions: Array.isArray(jobRaw?.questions) ? jobRaw.questions.filter((s) => typeof s === 'string') : [],
    proposals: jobRaw?.proposals ?? null,
    posted: str(jobRaw?.posted),
    connectsCost: num(jobRaw?.connectsCost),
    client: {
      country: str(client.country),
      paymentVerified: bool(client.paymentVerified),
      spent: num(client.spent),
      hires: num(client.hires),
      rating: num(client.rating),
    },
    budget: {
      type: budget.type === 'fixed' || budget.type === 'hourly' ? budget.type : null,
      min: num(budget.min),
      max: num(budget.max),
    },
  };

  const verdict = ['apply', 'maybe', 'skip'].includes(fitRaw?.verdict) ? fitRaw.verdict : null;
  const fit = {
    score: num(fitRaw?.score),
    verdict,
    reasons: Array.isArray(fitRaw?.reasons) ? fitRaw.reasons.map(String) : [],
    redFlags: Array.isArray(fitRaw?.redFlags) ? fitRaw.redFlags.map(String) : [],
    suggestedBid: fitRaw?.suggestedBid && typeof fitRaw.suggestedBid === 'object' ? {
      type: str(fitRaw.suggestedBid.type),
      amount: num(fitRaw.suggestedBid.amount),
      days: num(fitRaw.suggestedBid.days),
    } : null,
  };
  // A pack that says "apply" while listing red flags contradicts itself;
  // the red flags win.
  if (fit.verdict === 'apply' && fit.redFlags.length) {
    problems.push('fit.json says "apply" but lists red flags. Treat it as "skip" until checked.');
    fit.verdict = 'skip';
  }

  const status = normalizeStatus(statusRaw);

  const docs = {};
  for (const name of ['proposal.md', 'questions.md', 'plan.md', 'lesson.md', 'cheatsheet.md', 'messages.md']) {
    docs[name.replace('.md', '')] = typeof files[name] === 'string' ? files[name] : null;
  }
  const diagramXml = typeof files['diagram.drawio'] === 'string' ? files['diagram.drawio'] : null;

  return {
    id, job, fit, status, docs, diagramXml, problems,
    sample: job.sample,
    checks: {
      proposal: docs.proposal ? checkClientText(docs.proposal) : null,
      questions: docs.questions ? checkClientText(docs.questions) : null,
      messages: docs.messages ? checkClientText(docs.messages) : null,
    },
  };
}

/** A status object the app can trust, whatever was on disk. */
export function normalizeStatus(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    stage: STAGE_IDS.has(s.stage) ? s.stage : 'new',
    connectsSpent: num(s.connectsSpent) ?? 0,
    amount: num(s.amount),
    notes: Array.isArray(s.notes) ? s.notes.map(String) : [],
    updatedAt: str(s.updatedAt),
  };
}

/**
 * Apply a change from the UI. Returns the new status, or throws on a value
 * that would corrupt the file. `now` is injected for tests.
 */
export function updateStatus(status, patch = {}, now = new Date()) {
  const next = { ...normalizeStatus(status) };
  if ('stage' in patch) {
    if (!STAGE_IDS.has(patch.stage)) throw new Error(`Unknown stage "${patch.stage}".`);
    next.stage = patch.stage;
  }
  if ('connectsSpent' in patch) {
    const n = Number(patch.connectsSpent);
    if (!Number.isFinite(n) || n < 0 || n > 1000) throw new Error('Connects spent must be between 0 and 1000.');
    next.connectsSpent = Math.round(n);
  }
  if ('amount' in patch) {
    if (patch.amount === '' || patch.amount == null) next.amount = null;
    else {
      const n = Number(patch.amount);
      if (!Number.isFinite(n) || n < 0) throw new Error('Amount must be a positive number.');
      next.amount = Math.round(n * 100) / 100;
    }
  }
  if (patch.note) next.notes = [...next.notes, `${now.toISOString().slice(0, 10)}: ${String(patch.note).slice(0, 500)}`];
  next.updatedAt = now.toISOString();
  return next;
}

export function serializeStatus(status) {
  return `${JSON.stringify(normalizeStatus(status), null, 2)}\n`;
}

// ═══════════════════════════════════════════════════════════════════════
// Client-facing text checks
// ═══════════════════════════════════════════════════════════════════════

/**
 * Upwork's terms forbid moving contact off the platform before a contract.
 * Anything that looks like a way to reach David outside Upwork is flagged.
 */
const OFF_PLATFORM = [
  { id: 'email', label: 'an email address', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { id: 'phone', label: 'a phone number', pattern: /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?){2,}\d{3,4}\b/ },
  { id: 'chat-app', label: 'an outside chat app (WhatsApp, Telegram, Skype, Signal, WeChat, Discord)', pattern: /\b(?:whats\s?app|telegram|skype|signal app|wechat|discord)\b/i },
  { id: 'move-off', label: 'an offer to talk or pay outside Upwork', pattern: /\b(?:outside (?:of )?upwork|off[- ]platform|pay (?:me )?directly|paypal me)\b/i },
];

/**
 * David holds AWS Certified Cloud Practitioner. He does NOT hold Solutions
 * Architect; "studying for" is the only honest way to mention it.
 */
const FORBIDDEN_CLAIMS = [
  {
    id: 'solutions-architect',
    label: 'claims the Solutions Architect certification (David holds Cloud Practitioner only)',
    test: (t) => /solutions?\s+architect|\bSAA(?:-C0\d)?\b/i.test(t)
      && !/(?:studying|preparing|working)\s+(?:for|towards?)\s+(?:the\s+)?(?:AWS\s+)?(?:solutions?\s+architect|SAA)/i.test(t),
  },
  {
    id: 'professional-cert',
    label: 'claims a Professional or Specialty AWS certification',
    test: (t) => /\b(?:certified|hold|have)\b[^.\n]{0,40}\b(?:professional|specialty)\b/i.test(t) && /aws/i.test(t),
  },
];

/** Certifications and experience David really has; these claims are true. */
const TRUE_CLAIMS = [/cloud practitioner/i, /7\+?\s+years/i, /\bCCSA\b/i];

/**
 * @returns {{ ok:boolean, blockers:string[], verify:string[] }}
 *   blockers — must be fixed before copying (off-platform, false certs)
 *   verify   — claims that need evidence; fine if true, worth a second look
 */
export function checkClientText(text) {
  const value = String(text || '');
  const blockers = [];
  for (const rule of OFF_PLATFORM) if (rule.pattern.test(value)) blockers.push(`Contains ${rule.label}. Keep contact on Upwork until a contract exists.`);
  for (const rule of FORBIDDEN_CLAIMS) if (rule.test(value)) blockers.push(`It ${rule.label}.`);

  const verify = findUnsupportedClaims(value)
    .filter((id) => !(id === 'certification' || id === 'years-experience') || !TRUE_CLAIMS.some((re) => re.test(value)))
    .map((id) => `It ${CLAIM_LABELS[id] || id}. Make sure you can back it up.`);
  return { ok: blockers.length === 0, blockers, verify };
}

// ═══════════════════════════════════════════════════════════════════════
// Teach-me lesson (same format as Exams Study Prep's lib/teach.ts)
// ═══════════════════════════════════════════════════════════════════════

/**
 *   ### Slide title
 *   - point on screen
 *   ~ A → B → C        (flow diagram)
 *   > spoken line
 */
export function parseLesson(md) {
  const slides = [];
  let cur = null;
  for (const raw of String(md || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('### ')) {
      cur = { title: line.slice(4).trim(), points: [], flows: [], say: '' };
      slides.push(cur);
      continue;
    }
    if (!cur) continue;
    if (/^[-•*]\s+/.test(line)) cur.points.push(line.replace(/^[-•*]\s+/, ''));
    else if (line.startsWith('~')) {
      const steps = line.slice(1).split(/\s*(?:→|->)\s*/).map((s) => s.trim()).filter(Boolean);
      if (steps.length > 1) cur.flows.push(steps);
    } else if (line.startsWith('>')) cur.say = `${cur.say} ${line.slice(1).trim()}`.trim();
  }
  // A slide with nothing to say is read from its points, so listen mode
  // never goes silent on a slide.
  for (const s of slides) if (!s.say) s.say = [s.title, ...s.points].join('. ');
  return slides;
}

/** Split text into sentence-sized pieces for speechSynthesis (long utterances stall in Chrome). */
export function speechPieces(text, max = 220) {
  const sentences = String(text || '').replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) || [];
  const out = [];
  for (const s of sentences.map((x) => x.trim()).filter(Boolean)) {
    if (s.length <= max) { out.push(s); continue; }
    let rest = s;
    while (rest.length > max) {
      const cut = rest.lastIndexOf(',', max) > 40 ? rest.lastIndexOf(',', max) + 1 : rest.lastIndexOf(' ', max);
      const at = cut > 0 ? cut : max;
      out.push(rest.slice(0, at).trim());
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

/** messages.md → [{ title, body }] by `## ` headings. */
export function splitSections(md) {
  const out = [];
  let cur = null;
  for (const line of String(md || '').split(/\r?\n/)) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) { cur = { title: h[1].trim(), body: '' }; out.push(cur); continue; }
    if (cur) cur.body += `${line}\n`;
  }
  for (const s of out) s.body = s.body.trim();
  return out.filter((s) => s.body);
}

// ═══════════════════════════════════════════════════════════════════════
// Guides: the advice Claude gives David, kept where he can study it
// ═══════════════════════════════════════════════════════════════════════

/**
 * guides\NN-name.md → { name, title, added, text, slides }.
 * The title is the first `# ` line; `added:` in an HTML comment
 * (<!-- added: 2026-11-20 -->) marks when it was written. A guide written
 * in the lesson format (### slides) can also be read aloud.
 */
export function guideMeta(guide) {
  const text = String(guide?.text || '');
  const title = (/^#\s+(.+)$/m.exec(text)?.[1] || String(guide?.name || 'Guide').replace(/\.md$/i, '').replace(/^\d+-/, '').replace(/-/g, ' ')).trim();
  const added = /<!--\s*added:\s*(\d{4}-\d{2}-\d{2})\s*-->/.exec(text)?.[1] || null;
  return { name: guide?.name || '', title, added, text, slides: parseLesson(text) };
}

/** Numbered order (01-, 02-…), as Claude writes them. */
export function sortGuides(guides = []) {
  return guides.map(guideMeta).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** Guides added in the last `days` days, so the app can say what's new. */
export function newGuides(guides = [], now = new Date(), days = 7) {
  const cutoff = now.getTime() - days * 86400000;
  return guides.filter((g) => g.added && Date.parse(g.added) >= cutoff);
}

// ═══════════════════════════════════════════════════════════════════════
// Board summary
// ═══════════════════════════════════════════════════════════════════════

export function summarizeGigs(gigs = []) {
  const byStage = Object.fromEntries(GIG_STAGES.map((s) => [s.id, 0]));
  let connects = 0;
  let earned = 0;
  let real = 0;
  for (const g of gigs) {
    byStage[g.status.stage] += 1;
    if (g.sample) continue;
    real += 1;
    connects += g.status.connectsSpent || 0;
    if (g.status.stage === 'done' && g.status.amount) earned += g.status.amount;
  }
  return { total: gigs.length, real, byStage, connects, earned };
}

/** Newest first; samples last so real work is on top. */
export function sortGigs(gigs = []) {
  return [...gigs].sort((a, b) => (a.sample - b.sample) || b.id.localeCompare(a.id));
}

/** A one-line money/bid summary, or "unknown" pieces when fields are missing. */
export function budgetLabel(job) {
  const { type, min, max } = job?.budget || {};
  if (!type) return 'Budget unknown';
  const range = min != null && max != null && min !== max ? `$${min}–$${max}` : (max ?? min) != null ? `$${max ?? min}` : 'amount unknown';
  return type === 'hourly' ? `Hourly ${range}/hr` : `Fixed ${range}`;
}
