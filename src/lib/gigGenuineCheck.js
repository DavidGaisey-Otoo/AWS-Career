/**
 * gigGenuineCheck.js — is a job from the live feed real, current and open
 * to someone working from Ghana?
 *
 * Pure: no browser, no network. The feed calls checkGigGenuine() on every
 * job and hides the ones that fail, so the list only shows work worth
 * reading. A missing fact is "could not tell" (verdict "check"), never a
 * pass: a job with no location rules is not assumed to be open worldwide.
 */

export const GENUINE_MAX_AGE_DAYS = 45;
const DAY = 24 * 60 * 60 * 1000;

/** Scam patterns seen on remote job boards. Any one hides the job. */
const SCAM_SIGNALS = [
  { re: /\b(telegram|whatsapp|signal app|wechat)\b/i, why: 'Asks you to talk on Telegram/WhatsApp instead of the job site.' },
  { re: /\b(registration|application|training|onboarding|starter[- ]kit|processing)\s+fee\b/i, why: 'Asks you to pay a fee to get the job.' },
  { re: /\b(pay|send|deposit)\s+(a|the|an|us)?\s*(small\s+)?(fee|deposit|payment)\b/i, why: 'Asks you to send money.' },
  { re: /\b(purchase|buy)\s+(your\s+own\s+)?(equipment|laptop|software|gift cards?)\b.*\breimburs/i, why: 'Buy-equipment-and-get-reimbursed scheme.' },
  { re: /\b(cheque|check)\s+(to\s+)?(buy|purchase|deposit)\b/i, why: 'Fake-cheque scheme.' },
  { re: /\b(paid|payment|salary)\s+(in|via|with)\s+(crypto|usdt|bitcoin|btc)\b/i, why: 'Pays only in crypto.' },
  { re: /\b(reshipping|package forwarding|receive packages)\b/i, why: 'Package reshipping: a known scam.' },
  { re: /\b(personal bank account|money transfer agent|payment processing agent)\b/i, why: 'Wants to use your bank account.' },
  { re: /\bearn\s+\$?\d[\d,]*\s*(per|\/|a)\s*(day|week)\b.*\b(no experience|easy|from home)\b/i, why: 'Too-good-to-be-true pay promise.' },
  { re: /\bno\s+interview\b/i, why: '"No interview" hiring is a common scam sign.' },
  { re: /\b[\w.+-]+@(gmail|yahoo|hotmail|outlook)\.com\b/i, why: 'Uses a free personal email address instead of a company one.' },
  { re: /\b(question bank|exam answers|leaked (exam|questions))\b/i, why: 'Asks for exam material: dishonest work.' },
];

/** Location words that mean someone in Ghana can apply. */
const OPEN_TO_GHANA = /\b(worldwide|anywhere|all countries|africa|ghana|emea|gmt|utc\s?[+-]?\s?0)\b/i;
/** Remote with no stated rule: unknown, not open. */
const NO_RULE = /^\s*(remote|remote only|100% remote|fully remote)?\s*$/i;
/** Text in the post that restricts who may apply. */
const RESTRICTED_TEXT = [
  /\b(us|u\.s\.|united states|american)\s+(citizens?|residents?|persons?)\b/i,
  /\b(authori[sz]ed|eligible|right)\s+to\s+work\s+in\s+(the\s+)?(us|u\.s\.|united states|uk|united kingdom|eu|europe|canada|australia)\b/i,
  /\b(security|secret|top secret|public trust)\s+clearance\b/i,
  /\bmust\s+(be\s+)?(based|located|reside|live)\s+in\s+(the\s+)?(?!africa|ghana|emea)\w+/i,
  /\b(w-?2|1099)\s+only\b/i,
  /\b(federal|govcon|government contract)\b/i,   // US government work needs US citizenship
];

/** A title that asks for a language other than English. */
const LANGS = 'german|french|dutch|arabic|spanish|portuguese|italian|japanese|mandarin|chinese|polish|turkish|swedish|danish|norwegian|finnish|korean|hebrew|russian';
// Also "Bilingual … Spanish" and "Support Engineer, German" style titles.
const NEEDS_LANGUAGE = new RegExp(`\\b(${LANGS})[- ]speak(?:ing|er)\\b|\\(([^)]*?\\b(?:${LANGS})\\b)[^)]*\\)|\\bbilingual\\b[^()]*?\\b(${LANGS})\\b|,\\s*(${LANGS})\\b`, 'i');

function textOf(gig) {
  return `${gig?.title || ''} ${gig?.description || ''}`;
}

/** Parse a date; anything unparseable, before 2000 or >2 days in the future is unknown. */
export function postedTime(gig, now = Date.now()) {
  if (!gig?.postedAt) return null;
  const t = new Date(gig.postedAt).getTime();
  if (!Number.isFinite(t) || t < Date.UTC(2000, 0, 1) || t > now + 2 * DAY) return null;
  return t;
}

/** 'open' | 'closed' | 'unknown' for an applicant in Ghana. */
export function locationAccess(gig) {
  const text = textOf(gig);
  if (RESTRICTED_TEXT.some((re) => re.test(text))) return 'closed';
  // Found in the full post at parse time (beats a board's "Anywhere").
  if (gig?.facts?.limitedToCountry) return 'closed';
  const loc = String(gig?.location || '').trim();
  if (OPEN_TO_GHANA.test(loc)) return 'open';
  if (NO_RULE.test(loc)) return OPEN_TO_GHANA.test(text) ? 'open' : 'unknown';
  return 'closed';
}

/**
 * Check one job. Returns
 *   { verdict: 'genuine'|'check'|'fake'|'expired'|'not-open',
 *     keep: boolean, label, problems: string[], notes: string[] }
 * keep=false means the feed hides it (still viewable under "screened out").
 */
export function checkGigGenuine(gig, { now = Date.now() } = {}) {
  const problems = [];
  const notes = [];
  const text = textOf(gig);

  for (const signal of SCAM_SIGNALS) {
    if (signal.re.test(text)) problems.push(signal.why);
  }
  if (problems.length) {
    return { verdict: 'fake', keep: false, label: 'Looks like a scam', problems, notes };
  }

  const t = postedTime(gig, now);
  if (t !== null && now - t > GENUINE_MAX_AGE_DAYS * DAY) {
    const days = Math.floor((now - t) / DAY);
    return { verdict: 'expired', keep: false, label: 'Too old: probably filled', problems: [`Posted ${days} days ago.`], notes };
  }
  if (t === null) notes.push('Posting date unknown: check it is still open.');

  const language = NEEDS_LANGUAGE.exec(String(gig?.title || ''));
  if (language) {
    const name = (language[1] || language[3] || language[4] || language[2] || 'another language');
    return {
      verdict: 'not-open', keep: false, label: 'Needs another language',
      problems: [`Needs ${name[0].toUpperCase()}${name.slice(1).toLowerCase()} speakers.`], notes,
    };
  }

  const access = locationAccess(gig);
  if (access === 'closed') {
    return {
      verdict: 'not-open', keep: false, label: 'Not open to Ghana',
      problems: [gig?.facts?.limitedToCountry
        ? `The full post limits who can apply (country, work permit or clearance), even though the board says "${gig?.location || 'remote'}".`
        : `Limited to: ${gig?.location || 'a specific country (see the post)'}.`], notes,
    };
  }
  if (access === 'unknown') notes.push('No country rule shown: confirm Ghana is accepted before applying.');

  if (!gig?.company) notes.push('Company name not shown: look the company up before applying.');
  if (!/^https:\/\//i.test(gig?.url || '')) notes.push('No secure link to the original post.');

  if (notes.length) return { verdict: 'check', keep: true, label: 'Check first', problems, notes };
  return { verdict: 'genuine', keep: true, label: 'Looks genuine', problems, notes };
}

/**
 * Is the job title in David's lane (cloud, AWS, IT/network support,
 * sysadmin, DevOps)? Judged on the title only: boards mention "AWS" in
 * passing inside sales, finance and design posts.
 */
const LANE_TITLE = /\b(aws|amazon web services|cloud|devops|dev ops|sre|site reliability|infrastructure|platform engineer|systems? (admin|administrator|engineer)|sysadmin|network|noc|it (support|specialist|technician|administrator|engineer|analyst)|help ?desk|service desk|desktop support|technical support|tech support|support engineer|security (analyst|engineer)|soc analyst|solutions? (engineer|architect)|linux)\b/i;

export function isInLane(gig) {
  return LANE_TITLE.test(String(gig?.title || ''));
}

/** Count verdicts for the feed's summary line. Off-lane jobs are hidden first. */
export function summarizeGenuine(gigs, opts) {
  const counts = { total: 0, genuine: 0, check: 0, fake: 0, expired: 0, 'not-open': 0, offLane: 0, hidden: 0 };
  for (const gig of gigs || []) {
    counts.total += 1;
    if (!isInLane(gig)) { counts.offLane += 1; counts.hidden += 1; continue; }
    const { verdict, keep } = checkGigGenuine(gig, opts);
    counts[verdict] += 1;
    if (!keep) counts.hidden += 1;
  }
  return counts;
}
