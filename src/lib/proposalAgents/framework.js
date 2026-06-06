/**
 * proposalAgents/framework.js — shared base for proposal quality agents.
 *
 * 3 agents review the proposal output:
 *   - Persuasion Architect — hook, structure, specificity, story arc
 *   - Pricing Strategist   — pricing clarity, scope, payment terms
 *   - Brand Voice Coach    — tone, jargon, grammar, professionalism
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
// Shared word lists + regexes
// ════════════════════════════════════════════════════════════════════

// Filler words that weaken proposals
export const WEAK_WORDS = [
  'very', 'really', 'just', 'somewhat', 'kind of', 'sort of', 'maybe',
  'perhaps', 'might', 'could possibly', 'try to', 'attempt to', 'hopefully',
  'in my opinion', 'i think', 'i believe', 'i feel', 'i guess',
];

// Jargon that confuses non-technical clients
export const HEAVY_JARGON = [
  'paradigm', 'synergy', 'leverage', 'utilize', 'mission-critical', 'best-of-breed',
  'turnkey', 'holistic', 'low-hanging fruit', 'value-add', 'circle back',
  'idempotent', 'orthogonal', 'monotonic', 'memoization', 'tokenization',
];

// Power words that strengthen proposals (used as positive signals)
export const POWER_WORDS = [
  'guaranteed', 'proven', 'measurable', 'documented', 'shipped',
  'delivered', 'launched', 'reduced', 'increased', 'cut', 'saved',
];

// Pricing signals
export const PRICING_REGEX = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:\/\s*(?:hour|hr|day|week|wk|month|mo|year|yr|project|deliverable)))?/i;
export const PRICING_FREE_REGEX = /\bfree\b|\bno (?:cost|charge|fee)\b/i;
export const TIMELINE_REGEX = /\b\d+\s*(?:hours?|days?|weeks?|months?|sprints?)\b/i;

// Payment terms signals
export const PAYMENT_TERMS_REGEX = /\b(net[- ]?(?:7|14|15|30|45|60|90)|upfront|deposit|milestone|50%|escrow|installment|on (?:delivery|completion|acceptance))\b/i;

// Scope clarity signals
export const SCOPE_OUT_REGEX = /\b(out of scope|not included|excludes?|excluding|does not include|won'?t cover)\b/i;
export const SCOPE_IN_REGEX  = /\b(deliverables?|scope of work|in scope|includes|covered|you'?ll (?:get|receive)|you will (?:get|receive))\b/i;

// Structure markers (what a good proposal should have)
export const SECTION_HEADERS = {
  hook:       /\b(hook|opening|introduction)\b/i,
  understanding: /\b(understand|challenge|problem|context|situation)\b/i,
  approach:   /\b(approach|solution|method|how|plan)\b/i,
  whyMe:      /\b(why me|about me|background|experience|credentials|qualifications)\b/i,
  timeline:   /\b(timeline|schedule|milestones?|phases?|when)\b/i,
  pricing:    /\b(pric(?:e|ing)|cost|investment|rate|fee|budget)\b/i,
  cta:        /\b(call to action|next steps?|let'?s|book|schedule|reply)\b/i,
};

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════

export function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function sentenceCount(text) {
  return (String(text || '').match(/[.!?]+/g) || []).length;
}

export function avgSentenceLength(text) {
  const words = wordCount(text);
  const sentences = Math.max(sentenceCount(text), 1);
  return words / sentences;
}

export function countMatches(text, words) {
  const lower = String(text || '').toLowerCase();
  return words.filter((w) => {
    const rx = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i');
    return rx.test(lower);
  });
}

export function youVsIRatio(text) {
  const lower = String(text || '').toLowerCase();
  const you = (lower.match(/\b(you|your|you're|you've|you'll|yours)\b/g) || []).length;
  const i   = (lower.match(/\b(i|my|me|i'm|i've|i'll|mine|myself)\b/g) || []).length;
  return { you, i, ratio: i > 0 ? you / i : you };
}

// Pick out an "approach phase count" — a proposal should have 3-7 distinct phases
export function detectPhases(text) {
  // Look for "Phase 1", "Step 1", "Week 1", "Milestone 1", numbered lists "1." or "1)"
  const phases = new Set();
  const phaseMatches = text.matchAll(/\b(?:phase|step|week|milestone|stage)\s*(\d+)\b/gi);
  for (const m of phaseMatches) phases.add(parseInt(m[1], 10));
  const numbered = text.matchAll(/(?:^|\n)\s*(\d+)[.)]\s+\S/g);
  for (const m of numbered) phases.add(parseInt(m[1], 10));
  return phases.size;
}

// ════════════════════════════════════════════════════════════════════
// Context builder
// ════════════════════════════════════════════════════════════════════

export function buildContext({
  proposalText = '',
  jobBrief = '',
  clientName = '',
  level = 'intermediate',  // beginner | intermediate | senior
  services = [],
} = {}) {
  const text = String(proposalText || '');
  return {
    proposalText: text,
    proposalLower: text.toLowerCase(),
    jobBrief: String(jobBrief || ''),
    clientName: String(clientName || ''),
    level,
    services,
    wordCount: wordCount(text),
    sentenceCount: sentenceCount(text),
    avgSentenceLength: avgSentenceLength(text),
    youI: youVsIRatio(text),
    weakWords: countMatches(text, WEAK_WORDS),
    jargon: countMatches(text, HEAVY_JARGON),
    powerWords: countMatches(text, POWER_WORDS),
    hasPricing: PRICING_REGEX.test(text) || PRICING_FREE_REGEX.test(text),
    hasTimeline: TIMELINE_REGEX.test(text),
    hasPaymentTerms: PAYMENT_TERMS_REGEX.test(text),
    hasInScope: SCOPE_IN_REGEX.test(text),
    hasOutScope: SCOPE_OUT_REGEX.test(text),
    phaseCount: detectPhases(text),
  };
}

// ════════════════════════════════════════════════════════════════════
// Scoring + grade
// ════════════════════════════════════════════════════════════════════

export function scoreFromFindings(findings) {
  if (!findings || findings.length === 0) return 100;
  const weights = { critical: -25, high: -10, medium: -4, low: -1, info: 0 };
  const total = findings.reduce((s, f) => s + (weights[f.severity] || 0), 0);
  return Math.max(0, Math.min(100, 100 + total));
}

export function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', tone: 'success' };
  if (score >= 80) return { letter: 'A',  tone: 'success' };
  if (score >= 70) return { letter: 'B',  tone: 'success' };
  if (score >= 60) return { letter: 'C',  tone: 'warning' };
  if (score >= 50) return { letter: 'D',  tone: 'warning' };
  return { letter: 'F', tone: 'danger' };
}
