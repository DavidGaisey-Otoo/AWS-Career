/**
 * interviewAgents/framework.js — Interview Answer Coach.
 *
 * Single agent reviews an answer to a behavioural/technical interview question.
 * Checks STAR structure, specificity, length, filler words, jargon control.
 *
 * Input: { question, answer, questionType: 'behavioural' | 'technical' | 'system-design' }
 */

export const SEVERITY = {
  critical: { rank: 0, label: 'Critical', tone: 'danger' },
  high:     { rank: 1, label: 'High',     tone: 'danger' },
  medium:   { rank: 2, label: 'Medium',   tone: 'warning' },
  low:      { rank: 3, label: 'Low',      tone: 'sky' },
  info:     { rank: 4, label: 'Info',     tone: 'success' },
};

export function bySeverity(a, b) { return (SEVERITY[a.severity]?.rank ?? 99) - (SEVERITY[b.severity]?.rank ?? 99); }

export function finding({ severity, title, body, fix, ruleId, evidence }) {
  return { severity, title, body, fix: fix || null, ruleId: ruleId || null, evidence: evidence || null };
}

export const WEAK_WORDS = ['like', 'um', 'uh', 'basically', 'literally', 'kind of', 'sort of', 'you know', 'i guess', 'whatever', 'stuff', 'things'];

export const STAR_MARKERS = {
  situation: /\b(when i was|in my (?:previous|last|current) (?:role|job|project)|at (?:my|the)|context|background|situation|the (?:project|team|client) was|we were)\b/i,
  task:      /\b(my task|my (?:role|responsibility)|i was (?:asked|responsible|tasked)|i needed to|the (?:goal|target|requirement) was|we had to)\b/i,
  action:    /\b(i (?:built|implemented|designed|deployed|wrote|created|introduced|chose|decided|investigated|migrated|refactored|automated|set up|configured|debugged|fixed|architected|led|negotiated)|my approach|i started by)\b/i,
  result:    /\b(the (?:result|outcome|impact) was|we (?:achieved|delivered|shipped|saved|cut|reduced|increased|launched)|this (?:resulted|led) (?:in|to)|measurable|metrics?|kpi|in the end|by the end)\b/i,
};

export const NUMBER_RX = /\b\d+\s*(?:%|percent|x|hours?|days?|weeks?|months?|years?|clients?|users?|customers?|projects?|requests?|tps|qps|ms|s|gb|tb|engineers?|team members?)\b/i;

export function wordCount(text) { return String(text || '').trim().split(/\s+/).filter(Boolean).length; }

export function countMatches(text, words) {
  const lower = String(text || '').toLowerCase();
  return words.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(lower));
}

export function buildContext({ question = '', answer = '', questionType = 'behavioural' } = {}) {
  const text = String(answer || '');
  return {
    question: String(question || ''),
    answer: text,
    questionType,
    wordCount: wordCount(text),
    weakWords: countMatches(text, WEAK_WORDS),
    starParts: {
      situation: STAR_MARKERS.situation.test(text),
      task:      STAR_MARKERS.task.test(text),
      action:    STAR_MARKERS.action.test(text),
      result:    STAR_MARKERS.result.test(text),
    },
    hasNumber: NUMBER_RX.test(text),
  };
}

export function scoreFromFindings(findings) {
  if (!findings || findings.length === 0) return 100;
  const weights = { critical: -25, high: -10, medium: -4, low: -1, info: 0 };
  return Math.max(0, Math.min(100, 100 + findings.reduce((s, f) => s + (weights[f.severity] || 0), 0)));
}

export function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', tone: 'success' };
  if (score >= 80) return { letter: 'A',  tone: 'success' };
  if (score >= 70) return { letter: 'B',  tone: 'success' };
  if (score >= 60) return { letter: 'C',  tone: 'warning' };
  if (score >= 50) return { letter: 'D',  tone: 'warning' };
  return { letter: 'F', tone: 'danger' };
}
