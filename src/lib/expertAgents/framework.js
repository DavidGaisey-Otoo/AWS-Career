/**
 * framework.js — EXPERT-01 multi-agent base classes + types.
 *
 * Each domain expert is an object that exports:
 *   {
 *     id, name, role, expertiseAreas[], yearsExperience,
 *     systemPrompt,    // for future LLM-mode wiring
 *     review(ctx)      // pure function, deterministic, returns Findings
 *   }
 *
 * The Master Orchestrator (in master.js) collects all agents' findings,
 * dedupes, sorts by severity, and emits a unified Review.
 *
 * ═══ HONEST SCOPE NOTE ═══
 * These agents are RULE ENGINES, not real AI. They catch common AWS
 * mistakes via hand-coded best-practice checks — covers ~70-80% of
 * what a senior architect would flag on a typical project. For true
 * novel-scenario reasoning, switch to LLM mode (requires API key).
 * Each agent has a systemPrompt ready for that wiring.
 * ═════════════════════════
 */

// ════════════════════════════════════════════════════════════════════
// Severity scale (used by every agent + the orchestrator's UI)
// ════════════════════════════════════════════════════════════════════
export const SEVERITY = {
  critical: { rank: 0, label: 'Critical', tone: 'danger',
              definition: 'Will fail in production or has serious security/cost implications. Must fix.' },
  high:     { rank: 1, label: 'High',     tone: 'danger',
              definition: 'Significantly impacts reliability, security, or cost. Strong recommendation to fix.' },
  medium:   { rank: 2, label: 'Medium',   tone: 'warning',
              definition: 'Not best practice. Consider addressing before production.' },
  low:      { rank: 3, label: 'Low',      tone: 'sky',
              definition: 'Minor optimization or polish. Nice-to-have.' },
  info:     { rank: 4, label: 'Info',     tone: 'success',
              definition: 'Best practice followed, or useful context.' },
};

export function bySeverity(a, b) {
  return (SEVERITY[a.severity]?.rank ?? 99) - (SEVERITY[b.severity]?.rank ?? 99);
}

// ════════════════════════════════════════════════════════════════════
// Helper: build a Finding object with full metadata
// ════════════════════════════════════════════════════════════════════
export function finding({ severity, title, body, fix, docs, ruleId, evidence }) {
  return {
    severity,
    title,
    body,
    fix:      fix || null,
    docs:     docs || null,
    ruleId:   ruleId || null,
    evidence: evidence || null,  // brief excerpt that triggered the rule
  };
}

// ════════════════════════════════════════════════════════════════════
// Helper: regex helpers used across agents
// ════════════════════════════════════════════════════════════════════
export const REGEX = {
  hipaa:     /\b(hipaa|phi|protected health information|patient (data|records?)|medical records?)\b/i,
  pci:       /\b(pci[- ]?dss|cardholder|payment card|credit card data|card processing)\b/i,
  gdpr:      /\b(gdpr|eu data residency|right to be forgotten|data subject)\b/i,
  soc2:      /\b(soc ?2|soc-2)\b/i,
  fedramp:   /\b(fedramp|us govcloud|federal)\b/i,

  production:    /\b(production|prod|live|customer[- ]?facing)\b/i,
  staging:       /\b(staging|stage|pre[- ]?prod|uat)\b/i,
  development:   /\b(development|dev environment|local dev)\b/i,

  longRunning:  /\b(video (transcod|process|render)|batch|ml training|migration|long[- ]running|24\/7)\b/i,
  highTraffic:  /\b(high[- ]?traffic|millions of (users|requests)|scale to)\b/i,
  lowTraffic:   /\b(low[- ]?traffic|hobby|side project|prototype|demo)\b/i,

  realTime:     /\b(real[- ]?time|live stream|websocket|low[- ]?latency)\b/i,
  batchJob:     /\b(batch (process|job)|nightly|cron|scheduled)\b/i,
};

// ════════════════════════════════════════════════════════════════════
// Helper: extract numeric estimates from briefs ($5/mo, 100 users, etc.)
// ════════════════════════════════════════════════════════════════════
export function extractBudget(brief) {
  const m = String(brief || '').match(/\$\s*(\d+)\s*(?:\/\s*(month|mo|hr|year|yr))?/i);
  if (!m) return null;
  return { amount: parseInt(m[1], 10), unit: (m[2] || 'month').toLowerCase() };
}

export function extractUserScale(brief) {
  const text = String(brief || '');
  const m = text.match(/\b(\d+(?:,\d+)*)\s*(?:users?|requests?|customers?|orders?|transactions?)/i);
  if (!m) return null;
  return parseInt(m[1].replace(/,/g, ''), 10);
}

// ════════════════════════════════════════════════════════════════════
// Helper: assemble the standard `ctx` an agent receives
// ════════════════════════════════════════════════════════════════════
export function buildContext({
  brief = '',
  services = [],
  region = null,
  level = 'beginner',     // beginner | intermediate | senior
  approach = 'console',   // console | cli | terraform | cfn
  solutionText = '',      // optional — full text of the generated solution to review
  metadata = {},
} = {}) {
  return {
    brief,
    briefLower: brief.toLowerCase(),
    services: services.map((s) => String(s).toLowerCase()),
    region,
    level,
    approach,
    solutionText,
    has: (svc) => services.map((s) => String(s).toLowerCase()).includes(String(svc).toLowerCase()),
    matches: (regex) => regex.test(brief),
    compliance: {
      hipaa: REGEX.hipaa.test(brief),
      pci:   REGEX.pci.test(brief),
      gdpr:  REGEX.gdpr.test(brief),
      soc2:  REGEX.soc2.test(brief),
      fedramp: REGEX.fedramp.test(brief),
      any: REGEX.hipaa.test(brief) || REGEX.pci.test(brief) || REGEX.gdpr.test(brief) ||
           REGEX.soc2.test(brief) || REGEX.fedramp.test(brief),
    },
    isProduction: REGEX.production.test(brief),
    isLongRunning: REGEX.longRunning.test(brief),
    isHighTraffic: REGEX.highTraffic.test(brief),
    isLowTraffic: REGEX.lowTraffic.test(brief),
    budget: extractBudget(brief),
    userScale: extractUserScale(brief),
    metadata,
  };
}

// ════════════════════════════════════════════════════════════════════
// Helper: derive a 0-100 score from a list of findings
// (used by orchestrator to grade overall solution quality)
// ════════════════════════════════════════════════════════════════════
export function scoreFromFindings(findings) {
  if (!findings || findings.length === 0) return 100;
  const weights = { critical: -25, high: -10, medium: -4, low: -1, info: 0 };
  const total = findings.reduce((sum, f) => sum + (weights[f.severity] || 0), 0);
  return Math.max(0, Math.min(100, 100 + total));
}
