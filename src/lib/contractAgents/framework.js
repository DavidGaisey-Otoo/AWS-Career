/**
 * contractAgents/framework.js — base for contract review agents.
 *
 * 2 agents:
 *  - Legal Protection Lawyer — checks 7 protective clauses
 *  - Payment Terms Auditor — net days, late fees, deposit, currency
 */

export const SEVERITY = {
  critical: { rank: 0, label: 'Critical', tone: 'danger' },
  high:     { rank: 1, label: 'High',     tone: 'danger' },
  medium:   { rank: 2, label: 'Medium',   tone: 'warning' },
  low:      { rank: 3, label: 'Low',      tone: 'sky' },
  info:     { rank: 4, label: 'Info',     tone: 'success' },
};

export function bySeverity(a, b) {
  return (SEVERITY[a.severity]?.rank ?? 99) - (SEVERITY[b.severity]?.rank ?? 99);
}

export function finding({ severity, title, body, fix, ruleId, evidence }) {
  return { severity, title, body, fix: fix || null, ruleId: ruleId || null, evidence: evidence || null };
}

// ════════════════════════════════════════════════════════════════════
// Clause detection regexes
// ════════════════════════════════════════════════════════════════════
export const CLAUSES = {
  limitationOfLiability: /\b(limitation of liability|liability is (?:limited|capped)|in no event shall|consequential damages|aggregate liability|liability cap)\b/i,
  ipOwnership:           /\b(intellectual property|ownership|deliverables? (?:shall|will) (?:be |become )?(?:owned|the property))\b/i,
  termination:           /\b(termination|right to terminate|terminate (?:this |the )agreement|notice of termination|terminat(?:e|ion) for (?:cause|convenience))\b/i,
  indemnity:             /\b(indemnif(?:y|ication)|hold harmless|defend and indemnify)\b/i,
  confidentiality:       /\b(confidential|non[- ]disclosure|nda|proprietary information|trade secrets?)\b/i,
  governingLaw:          /\b(governing law|governed by|jurisdiction|applicable law|laws of (?:the )?(?:state|england|wales|scotland|northern ireland))\b/i,
  scopeChange:           /\b(scope (?:of (?:work )?)?change|change order|change request|scope creep|additional (?:work|services)|out[- ]of[- ]scope)\b/i,
  warranty:              /\b(warrant(?:y|ies)|guarantee|as[- ]is|disclaimer of warranty)\b/i,
  forceMajeure:          /\b(force majeure|act of god|circumstances beyond)\b/i,
};

export const PAYMENT_TERMS = {
  netDays:        /\b(net[- ]?(?:7|14|15|30|45|60|90)|due (?:on|within) (?:7|14|15|30|45|60|90)\s*days?)\b/i,
  lateFee:        /\b(late (?:fee|payment|charge)|interest (?:on (?:overdue|late))|\d+\s*%\s*(?:per|each) (?:month|annum|year))\b/i,
  deposit:        /\b(deposit|upfront payment|advance payment|retainer|down payment|\d+\s*%\s+(?:on|at|upfront))\b/i,
  milestones:     /\b(milestone|phase payment|on completion|on (?:hand[- ]?over|delivery|acceptance))\b/i,
  killFee:        /\b(kill fee|cancellation fee|termination fee|no[- ]?fault (?:fee|payment))\b/i,
  autoRenewal:    /\b(auto[- ]?renew(?:al|s|ing)?|automatically renew(?:s|ing|ed)?|renewed automatically)\b/i,
};

export const ONE_SIDED_PHRASES = [
  /\b(?:client|customer|company)\s+(?:may|can|shall|reserves the right to)\s+(?:terminate|cancel|modify|change)\s+(?:at any time|in (?:its|their) sole discretion|without (?:notice|cause))\b/i,
  /\b(?:contractor|consultant|provider|freelancer|developer)\s+(?:shall|will|must)\s+indemnify\b/i,
  /\bunlimited\s+(?:liability|indemnification|warranty)\b/i,
  /\bperpetual\s+(?:license|right|grant)\b/i,
  /\bnon[- ]?compete\s+(?:clause|period|covenant)\b/i,
];

// ════════════════════════════════════════════════════════════════════
export function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function detectClauses(text) {
  const present = {};
  for (const [key, rx] of Object.entries(CLAUSES)) present[key] = rx.test(text);
  return present;
}

export function detectPaymentTerms(text) {
  const present = {};
  for (const [key, rx] of Object.entries(PAYMENT_TERMS)) present[key] = rx.test(text);
  return present;
}

export function findOneSidedPhrases(text) {
  return ONE_SIDED_PHRASES.filter((rx) => rx.test(text));
}

export function buildContext({ contractText = '', clientName = '', currency = 'USD', jurisdiction = '' } = {}) {
  const text = String(contractText || '');
  return {
    contractText: text,
    contractLower: text.toLowerCase(),
    clientName: String(clientName || ''),
    currency: String(currency || 'USD').toUpperCase(),
    jurisdiction: String(jurisdiction || ''),
    wordCount: wordCount(text),
    clauses: detectClauses(text),
    paymentTerms: detectPaymentTerms(text),
    oneSidedPhrases: findOneSidedPhrases(text),
  };
}

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
