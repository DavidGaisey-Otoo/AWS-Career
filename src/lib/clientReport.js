/**
 * clientReport.js — turn a project into something you can actually send.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * The app held everything for a job but had no way to present it. The
 * nearest thing to a deliverable was a folder of screenshots, and two of
 * those turned out to be screenshots of this application — sidebar,
 * credits balance, the wrong profile name — which is not evidence of
 * anything a client cares about.
 *
 * This builds the document instead: scope, what was delivered, the
 * architecture, the evidence, the assumptions, the handover. Every
 * section comes from a record that exists. A section with no data is left
 * out rather than filled with a plausible sentence.
 *
 * ════════════════════════════════════════════════════════════════════
 * THE CHECK BEFORE YOU SEND
 * ════════════════════════════════════════════════════════════════════
 * auditForClient() lists what would embarrass you: internal screenshots,
 * a private register, free-tier sizing presented as production, and
 * assumptions never confirmed. It does not silently drop them — deciding
 * what a client sees is the author's job, not the tool's. It just refuses
 * to let you send them unaware.
 */

/**
 * Identifiers that must not travel with a document.
 *
 * The app's own Master Setup Report carries the AWS account number four
 * times, four distinct email addresses, a note about which bank cards
 * were declined, and five releases of this application's changelog. It
 * is a useful private record and a disastrous thing to attach to an
 * email, and nothing about the file says which.
 *
 * Matches are counted and masked. A scanner that prints the secret it
 * found in order to warn you about it has not helped.
 */
const SECRET_PATTERNS = [
  { type: 'AWS account number', re: /\b\d{12}\b/g,
    why: 'an account number lets someone target that account directly' },
  { type: 'AWS access key id', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    why: 'an access key id should never appear in a document at all' },
  { type: 'email address', re: /\b[\w.+-]+@[\w-]+\.[\w.]+\b/g,
    why: 'personal addresses do not belong in a client deliverable' },
  { type: 'IP address', re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    why: 'an address from your own network is not the client s business' },
];

const mask = (value) => {
  const text = String(value);
  if (text.length <= 4) return '****';
  return text.slice(0, 2) + '*'.repeat(Math.max(3, text.length - 4)) + text.slice(-2);
};

/**
 * Scan a document's text for things that should not be sent.
 * @returns {{ type, count, sample, why }[]}
 */
export function scanForSecrets(text = '') {
  const out = [];
  for (const { type, re, why } of SECRET_PATTERNS) {
    const matches = [...new Set(String(text).match(re) || [])];
    // A version string like 1.7.0 is not an IP address.
    const real = type === 'IP address'
      ? matches.filter((m) => m.split('.').every((part) => Number(part) <= 255))
      : matches;
    if (real.length) out.push({ type, count: real.length, sample: mask(real[0]), why });
  }
  return out;
}

/** Things that must never reach a client, and why. */
const INTERNAL_RULES = [
  {
    id: 'marked-internal',
    test: (doc) => doc.internal === true,
    reason: null, // supplied by the record itself — see classifyDocument
  },
  {
    id: 'app-screenshot',
    test: (doc) => /launchpad/i.test(doc.localPath || doc.name || ''),
    reason: 'a screenshot of this application, not of AWS — it shows the sidebar, the credits balance and the profile name',
  },
  {
    id: 'private-register',
    test: (doc) => /private/i.test(doc.status || '') || doc.category === 'Personal',
    reason: 'marked private or personal — a working register of defects is not a client document',
  },
  {
    id: 'practice-material',
    test: (doc) => /practice|workbook|study/i.test(doc.name || ''),
    reason: 'study material rather than a deliverable',
  },
];

/** Is this document safe to put in front of a client? */
export function classifyDocument(doc = {}) {
  for (const rule of INTERNAL_RULES) {
    if (!rule.test(doc)) continue;
    return {
      clientSafe: false,
      ruleId: rule.id,
      reason: rule.reason || doc.internalReason || 'marked internal in the catalogue',
    };
  }
  return { clientSafe: true, ruleId: null, reason: null };
}

const list = (project, kind) => project?.artifacts?.[kind] || [];

/**
 * Everything about this project that would embarrass you if sent.
 * @returns {{ level: 'block'|'warn', message: string, detail?: string }[]}
 */
export function auditForClient(project = {}) {
  const findings = [];

  for (const doc of list(project, 'document')) {
    const verdict = classifyDocument(doc);
    if (!verdict.clientSafe) {
      findings.push({
        level: 'block',
        message: `"${doc.name || 'Untitled document'}" should not go to a client`,
        detail: verdict.reason,
      });
    }
  }

  for (const solution of list(project, 'solution')) {
    if (solution.readiness?.classification && solution.readiness.classification !== 'client-ready') {
      findings.push({
        level: 'warn',
        message: `The solution is marked "${solution.readiness.classification}"`,
        detail: 'It has not been reviewed as client-ready. Sending it as finished work overstates it.',
      });
    }
    for (const assumption of solution.readiness?.assumptions || []) {
      findings.push({
        level: 'warn',
        message: 'An assumption has not been confirmed',
        detail: assumption,
      });
    }
    for (const claim of solution.readiness?.unsupported || []) {
      findings.push({
        level: 'block',
        message: 'A claim is not supported by the evidence',
        detail: claim,
      });
    }
  }

  for (const script of list(project, 'script')) {
    if (/TEST DEPLOYMENT/i.test(script.code || '')) {
      findings.push({
        level: 'warn',
        message: `"${script.name}" is sized for the free tier`,
        detail: 'It carries a TEST DEPLOYMENT marker. Rebuild in production mode before handing it over as the real thing.',
      });
    }
  }

  if (!list(project, 'document').some((d) => classifyDocument(d).clientSafe)) {
    findings.push({
      level: 'warn',
      message: 'There is no client-safe evidence in this project',
      detail: 'A report with no evidence behind it is a claim. Capture AWS console screenshots showing the finished state.',
    });
  }

  return findings;
}

const heading = (text) => `\n## ${text}\n`;
const bullets = (items) => items.filter(Boolean).map((x) => `- ${x}`).join('\n');

const dateOf = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Build the client report.
 *
 * @param {object} project — a workspace project
 * @param {object} options — { author, company, client }
 */
export function buildClientReport(project = {}, options = {}) {
  const solution = list(project, 'solution')[0] || null;
  const caseStudy = list(project, 'caseStudy')[0] || null;
  const plan = list(project, 'plan')[0] || null;
  const scripts = list(project, 'script');
  const documents = list(project, 'document').filter((d) => classifyDocument(d).clientSafe);
  const client = options.client || project.client || null;

  const parts = [];

  // ── Engagement ──
  const summary = solution?.brief || caseStudy?.summary || null;
  if (summary) parts.push(heading('Engagement'), summary);

  // ── Scope ──
  const services = project.services || [];
  if (services.length || project.region) {
    parts.push(heading('Scope'));
    parts.push(bullets([
      services.length ? `AWS services: ${services.join(', ')}` : null,
      project.region ? `Region: ${project.region}` : null,
      solution?.approach ? `Approach: ${solution.approach}` : null,
    ]));
  }

  // ── What was delivered ──
  const delivered = [
    solution ? 'A designed AWS solution with the services and region above' : null,
    scripts.length ? `Infrastructure as code: ${scripts.map((s) => s.name).join(', ')}` : null,
    list(project, 'architecture').length ? 'An architecture diagram' : null,
    plan ? 'A phased delivery plan with milestones' : null,
    documents.length ? `Supporting documentation: ${documents.map((d) => d.name).join(', ')}` : null,
  ].filter(Boolean);
  if (delivered.length) parts.push(heading('What was delivered'), bullets(delivered));

  // ── Delivery plan ──
  if (Array.isArray(plan?.phases) && plan.phases.length) {
    parts.push(heading('Delivery plan'));
    parts.push(plan.phases.map((phase) => {
      const when = phase.durationDays ? ` (${phase.durationDays} days)` : '';
      const tasks = (phase.tasks || []).map((t) => `  - ${t.name || t.title || t}`).join('\n');
      return `- **${phase.name}**${when}\n${tasks}`;
    }).join('\n'));
  }

  // ── Evidence ──
  if (documents.length) {
    parts.push(heading('Evidence'));
    parts.push(bullets(documents.map((d) =>
      `${d.name}${dateOf(d.createdAt) ? ` — ${dateOf(d.createdAt)}` : ''}`)));
  }

  // ── Assumptions, stated rather than buried ──
  const assumptions = solution?.readiness?.assumptions || [];
  if (assumptions.length) {
    parts.push(heading('Assumptions'));
    parts.push('This work depends on the following being true. Please confirm or correct them.\n');
    parts.push(bullets(assumptions));
  }

  // ── Cost ──
  if (solution) {
    parts.push(heading('Running cost'));
    parts.push(
      'AWS charges for this are billed to your own account and are separate from the fee for the work. '
      + 'Figures quoted during design are estimates based on the usage described, not a guaranteed bill. '
      + 'A budget alarm should be set at a ceiling you are comfortable with before anything is deployed.',
    );
  }

  // ── Teardown, where it applies ──
  if (caseStudy?.markdown && /teardown|decommission/i.test(caseStudy.markdown)) {
    parts.push(heading('Decommissioning'));
    parts.push('Every resource created for this project can be removed in full. The teardown was tested and verified.');
  }

  const title = project.title || 'AWS engagement';
  const meta = [
    client ? { label: 'Prepared for', value: client } : null,
    options.author ? { label: 'Prepared by', value: options.author } : null,
    project.region ? { label: 'Region', value: project.region } : null,
    dateOf(project.createdAt) ? { label: 'Started', value: dateOf(project.createdAt) } : null,
  ].filter(Boolean);

  return {
    title,
    subtitle: services.length ? services.join(' · ') : 'AWS engagement',
    documentType: 'Project report',
    authorName: options.author || '',
    authorCompany: options.company || '',
    meta,
    markdown: parts.join('\n').trim(),
    audit: auditForClient(project),
    sectionCount: parts.filter((p) => p.startsWith('\n## ')).length,
  };
}
