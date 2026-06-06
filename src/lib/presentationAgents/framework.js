/**
 * presentationAgents/framework.js — shared base for presentation
 * quality agents.
 *
 * 2 agents review slide decks:
 *   - Narrative Architect — does the deck tell a story? Problem → solution → proof → ask?
 *   - Visual Clarity Expert — text density, bullet count, hierarchy, projector-readability
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

export function finding({ severity, title, body, fix, ruleId, evidence, slideIndex }) {
  return {
    severity, title, body,
    fix: fix || null,
    ruleId: ruleId || null,
    evidence: evidence || null,
    slideIndex: slideIndex != null ? slideIndex : null,
  };
}

// ════════════════════════════════════════════════════════════════════
// Slide intent — classify each slide's role in the narrative
// ════════════════════════════════════════════════════════════════════
const INTENT_PATTERNS = {
  title:        /\b(welcome|intro|introduction|cover|title)\b/i,
  problem:      /\b(problem|challenge|pain|issue|gap|why now|context)\b/i,
  solution:     /\b(solution|approach|how|methodology|plan|architecture)\b/i,
  proof:        /\b(case stud|results|outcome|portfolio|track record|why us|why me|credentials|certified|delivered)\b/i,
  pricing:      /\b(pric(?:e|ing)|investment|cost|budget|fee|rate)\b/i,
  timeline:     /\b(timeline|schedule|milestone|phase|roadmap|when|next steps?)\b/i,
  ask:          /\b(call to action|next steps?|let'?s|book|schedule|reply|cta|kickoff)\b/i,
  thanks:       /\b(thank|q&a|questions|close|wrap)\b/i,
};

export function classifySlide(slide) {
  const text = `${slide?.title || ''} ${slide?.body || ''} ${(slide?.bullets || []).join(' ')}`;
  for (const [key, rx] of Object.entries(INTENT_PATTERNS)) {
    if (rx.test(text)) return key;
  }
  return 'other';
}

export function classifyDeck(slides) {
  const intents = slides.map(classifySlide);
  const set = new Set(intents);
  return { intents, intentSet: set };
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
export function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function slideWordCount(slide) {
  const titleWords = wordCount(slide?.title);
  const bodyWords  = wordCount(slide?.body);
  const bulletWords = (slide?.bullets || []).reduce((s, b) => s + wordCount(b), 0);
  return titleWords + bodyWords + bulletWords;
}

export function slideBodyWordCount(slide) {
  return wordCount(slide?.body) + (slide?.bullets || []).reduce((s, b) => s + wordCount(b), 0);
}

// ════════════════════════════════════════════════════════════════════
// Context builder
// ════════════════════════════════════════════════════════════════════
export function buildContext({
  slides = [],
  brief = '',
  audience = 'client',  // client | internal | exec
} = {}) {
  const classification = classifyDeck(slides);
  return {
    slides,
    slideCount: slides.length,
    brief: String(brief || ''),
    audience,
    intents: classification.intents,
    intentSet: classification.intentSet,
    totalWords: slides.reduce((s, sl) => s + slideWordCount(sl), 0),
  };
}

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
