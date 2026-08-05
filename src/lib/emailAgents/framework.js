/**
 * emailAgents/framework.js — shared base for email quality agents.
 *
 * Each agent exports:
 *   {
 *     id, name, role, expertiseAreas[],
 *     review(ctx) → Finding[]
 *   }
 *
 * The Master Orchestrator (master.js) collects findings, dedupes,
 * sorts by severity, computes an overall score + grade.
 *
 * ═══ HONEST SCOPE ═══
 * Rule engines, not LLMs. Catch the ~80% of email mistakes that
 * make outreach get ignored or flagged as spam. For tone-perfect
 * rewriting, the LLM upgrade path exists.
 * ════════════════════
 */

export const SEVERITY = {
  critical: { rank: 0, label: 'Critical', tone: 'danger',
              definition: 'Will hurt deliverability or get the email reported as spam.' },
  high:     { rank: 1, label: 'High',     tone: 'danger',
              definition: 'Significantly reduces reply rates or professional credibility.' },
  medium:   { rank: 2, label: 'Medium',   tone: 'warning',
              definition: 'Best-practice gap — fix to lift the email above average.' },
  low:      { rank: 3, label: 'Low',      tone: 'sky',
              definition: 'Minor polish.' },
  info:     { rank: 4, label: 'Info',     tone: 'success',
              definition: 'Best practice followed.' },
};

export function bySeverity(a, b) {
  return (SEVERITY[a.severity]?.rank ?? 99) - (SEVERITY[b.severity]?.rank ?? 99);
}

export function finding({ severity, title, body, fix, ruleId, evidence }) {
  return {
    severity, title, body,
    fix: fix || null,
    ruleId: ruleId || null,
    evidence: evidence || null,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Shared regex + word lists
// ═══════════════════════════════════════════════════════════════════

// Subset of the most widely-flagged spam-trigger words (Spamhaus + Mailchimp lists)
export const SPAM_WORDS = [
  '100% free', '100% satisfied', 'act now', 'apply now', 'as seen on', 'be your own boss',
  'best price', 'big bucks', 'billion dollars', 'cash bonus', 'cents on the dollar',
  'cheap', 'clearance', 'click here', 'congratulations', 'cost', 'credit card offers',
  'dear friend', 'do it today', 'don\'t delete', 'don\'t hesitate', 'double your income',
  'earn $', 'earn extra cash', 'earn from home', 'easy income', 'eliminate debt',
  'extra income', 'fast cash', 'financial freedom', 'free access', 'free consultation',
  'free gift', 'free hosting', 'free info', 'free investment', 'free membership',
  'free money', 'free preview', 'free quote', 'free sample', 'free trial', 'full refund',
  'get out of debt', 'get paid', 'giveaway', 'guarantee', 'home based', 'income',
  'increase sales', 'increase traffic', 'incredible deal', 'lower interest rate',
  'lower monthly payment', 'lowest price', 'make money', 'million dollars',
  'no catch', 'no cost', 'no credit check', 'no fees', 'no hidden costs',
  'no investment', 'no obligation', 'no purchase necessary', 'no questions asked',
  'no strings attached', 'not spam', 'offer expires', 'once in lifetime', 'order now',
  'order today', 'please read', 'pre-approved', 'prize', 'pure profit',
  'risk-free', 'satisfaction guaranteed', 'save big', 'save money', 'special promotion',
  'this is not spam', 'urgent', 'while supplies last', 'winner', 'winning', 'you are a winner',
  'you have been selected',
];

export const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+/gi;
export const SHORTENER_REGEX = /\b(bit\.ly|tinyurl\.com|goo\.gl|t\.co|ow\.ly|is\.gd|buff\.ly|adf\.ly)\b/i;
export const EMAIL_ADDR_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

// Outreach-specific signal regexes
export const QUESTION_REGEX = /\?/;
export const NUMBER_RESULT_REGEX = /\b\d+\s*(?:%|percent|x|hours?|days?|weeks?|months?|years?|clients?|users?|customers?|projects?|leads?|deals?|cases?|sales?|engagements?|installs?|downloads?|signups?)\b/i;
export const PROOF_REGEX = /\b(certified|aws certified|case study|portfolio|published|featured|trusted by|recommended by|recognised|recognized|years of experience|track record|delivered|launched|managed|architected)\b/i;
export const PERSONAL_HOOK_REGEX = /\b(i (?:noticed|saw|read|loved|enjoyed|came across)|congrats?(?:ulations)? on|i was impressed by|your (?:recent|latest)|i'?ve been following|i found|when i (?:saw|read))\b/i;

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

export function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function countMatches(text, pattern) {
  const m = String(text || '').match(pattern);
  return m ? m.length : 0;
}

export function countSpamWords(text) {
  const lower = String(text || '').toLowerCase();
  return SPAM_WORDS.filter((w) => lower.includes(w));
}

export function isAllCaps(text) {
  const cleaned = String(text || '').replace(/[^A-Za-z]/g, '');
  if (cleaned.length < 4) return false;
  return cleaned === cleaned.toUpperCase();
}

export function youVsIRatio(text) {
  const lower = String(text || '').toLowerCase();
  const you = (lower.match(/\b(you|your|you're|you've|you'll)\b/g) || []).length;
  const i   = (lower.match(/\b(i|my|me|i'm|i've|i'll|mine|myself)\b/g) || []).length;
  return { you, i, ratio: i > 0 ? you / i : you };
}

export function ctaPhrases(text) {
  const phrases = [
    /\bare you (?:free|available|open)\b/i,
    /\bwould you (?:be )?(?:open|interested|available)\b/i,
    /\bcan we (?:hop on|jump on|chat|talk|connect|schedule)\b/i,
    /\bdo you have (?:\d+ )?minutes?\b/i,
    /\blet me know if\b/i,
    /\bworth a (?:quick )?(?:chat|call|conversation)\b/i,
    /\bhappy to (?:share|send|walk you through|book|schedule)\b/i,
    /\bbook (?:a |some |my )?(?:time|call|slot|chat)\b/i,
    /\breply (?:back )?(?:with|if)\b/i,
    /\bshall we (?:set up|book|schedule)\b/i,
    /\b(?:click|tap|follow) (?:the link|here|below)\b/i,
    /\bschedule a (?:call|chat|discovery)\b/i,
  ];
  return phrases.filter((rx) => rx.test(text));
}

// ═══════════════════════════════════════════════════════════════════
// Context builder — what every agent receives
// ═══════════════════════════════════════════════════════════════════

export function buildContext({
  subject = '',
  body = '',
  recipient = {},   // { name, email, company, role }
  intent = 'outreach',  // outreach | proposal | followup | newsletter | transactional
  fromName = '',
  hasUnsubscribe = false,
} = {}) {
  const fullText = `${subject}\n${body}`;
  return {
    subject: String(subject || ''),
    body: String(body || ''),
    fullText,
    fullLower: fullText.toLowerCase(),
    recipient,
    intent,
    fromName: String(fromName || ''),
    hasUnsubscribe: Boolean(hasUnsubscribe),
    bodyWordCount: wordCount(body),
    subjectWordCount: wordCount(subject),
    bodyLinks: (body.match(URL_REGEX) || []),
    spamHits: countSpamWords(fullText),
    youI: youVsIRatio(body),
    ctas: ctaPhrases(body),
  };
}

// ═══════════════════════════════════════════════════════════════════
// Score → grade (same scale as AWS expert agents)
// ═══════════════════════════════════════════════════════════════════

// EX-25: scoring moved to the shared src/lib/agentScoring.js. The old local
// copy saturated at zero after four criticals, double-counted one root cause
// repeated across resources, and ignored the context the agents had already
// computed. Re-exported here so every existing import keeps working.
export { scoreFromFindings } from '../agentScoring.js';

export function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', tone: 'success' };
  if (score >= 80) return { letter: 'A',  tone: 'success' };
  if (score >= 70) return { letter: 'B',  tone: 'success' };
  if (score >= 60) return { letter: 'C',  tone: 'warning' };
  if (score >= 50) return { letter: 'D',  tone: 'warning' };
  return { letter: 'F', tone: 'danger' };
}
