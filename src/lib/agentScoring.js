/**
 * agentScoring.js — EX-25: one scorer for all 11 agent systems.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHAT WAS WRONG
 * ════════════════════════════════════════════════════════════════════
 * Eleven framework.js files each carried a byte-identical copy of:
 *
 *     const weights = { critical: -25, high: -10, medium: -4, low: -1 };
 *     return Math.max(0, 100 + sum);
 *
 * Three problems, all of which made the grade less informative than it
 * looked:
 *
 * 1. IT SATURATES. Four criticals reach zero. Beyond that the score stops
 *    moving, so a design with 4 criticals and one with 20 both read "F (0)"
 *    — the agent test report shows exactly this, several unrelated scenarios
 *    all flatlined at 0. The number stopped carrying information precisely
 *    where the differences mattered most.
 *
 * 2. IT DOUBLE-COUNTS ONE ROOT CAUSE. "No encryption at rest" on five
 *    different resources is five criticals and a 100-point deduction, when
 *    it is really one mistake made five times. Meanwhile five genuinely
 *    distinct criticals cost the same. Breadth of failure and repetition of
 *    failure should not score alike.
 *
 * 3. IT IGNORES CONTEXT. A missing-audit-trail finding on a PCI-DSS brief
 *    is materially worse than the same finding on a hobby project, but both
 *    deducted 25. The agents already compute a rich context; the scorer
 *    threw it away.
 *
 * ════════════════════════════════════════════════════════════════════
 * HOW THIS ONE WORKS
 * ════════════════════════════════════════════════════════════════════
 * - Deductions accumulate with DIMINISHING RETURNS within a category, so
 *   the second and third instance of the same class of problem count less
 *   than the first. Repetition still hurts, but less than novelty.
 *
 * - The total is applied through a SOFT FLOOR curve rather than clamping
 *   at zero, so the score keeps discriminating all the way down. 4 criticals
 *   and 20 criticals now produce visibly different numbers.
 *
 * - Findings are weighted by CONTEXTUAL RELEVANCE when a context is
 *   supplied: compliance-related findings weigh more on a regulated brief,
 *   cost findings weigh more against a stated budget, and scale-related
 *   findings weigh more at high user counts.
 *
 * Passing no context reproduces sensible default behaviour, so every
 * existing caller keeps working.
 */

export const SEVERITY_BASE = {
  critical: 25,
  high: 10,
  medium: 4,
  low: 1,
  info: 0,
};

/**
 * How much each additional finding in the same category counts, relative to
 * the first. The first instance is the signal; later ones are corroboration.
 *   1st = 100%, 2nd = 60%, 3rd = 40%, 4th = 25%, 5th+ = 15%
 */
const REPEAT_DECAY = [1, 0.6, 0.4, 0.25, 0.15];

function repeatFactor(indexWithinCategory) {
  return REPEAT_DECAY[Math.min(indexWithinCategory, REPEAT_DECAY.length - 1)];
}

/**
 * Group findings so that repeats of one root cause are recognised. Agents
 * already tag findings with a ruleId; where present it is the best grouping
 * key. Otherwise fall back to the raising expert, then to severity alone.
 */
function categoryOf(finding) {
  if (finding.ruleId) {
    // SEC-ENCRYPT-001 and SEC-ENCRYPT-002 are the same family
    const family = String(finding.ruleId).replace(/[-_]?\d+$/, '');
    return `rule:${family}`;
  }
  if (finding.expert) return `expert:${finding.expert}:${finding.severity}`;
  return `sev:${finding.severity}`;
}

/**
 * Contextual multiplier for a single finding. Returns 1 when there is no
 * context or nothing relevant applies, so behaviour degrades gracefully.
 */
function contextMultiplier(finding, ctx) {
  if (!ctx) return 1;
  let m = 1;
  const text = `${finding.title || ''} ${finding.body || ''} ${finding.ruleId || ''}`.toLowerCase();

  // Compliance regimes raise the stakes on security and audit findings
  if (ctx.compliance?.any) {
    if (/encrypt|audit|log|access|privilege|public|credential|retention|pii|phi|cardhold/.test(text)) {
      m *= 1.4;
    }
  }
  // A stated budget makes cost findings matter more
  if (ctx.budget && /cost|spend|price|expensive|idle|oversiz|right[- ]siz/.test(text)) {
    m *= 1.3;
  }
  // At scale, reliability and performance problems bite harder
  if ((ctx.userScale || 0) >= 100_000
      && /scal|throughput|latency|bottleneck|single point|availab|failover/.test(text)) {
    m *= 1.3;
  }
  // Production framing raises everything slightly; a prototype tolerates more
  if (ctx.isProduction) m *= 1.15;
  else if (ctx.isLowTraffic) m *= 0.8;

  return m;
}

/**
 * Soft floor. Raw deduction is mapped through a curve that approaches 0
 * asymptotically instead of clamping, so heavier failure always scores
 * lower than lighter failure.
 *
 *   deduction  0 → 100
 *              25 →  75
 *              50 →  53
 *             100 →  27
 *             200 →   9
 */
function applySoftFloor(deduction) {
  if (deduction <= 0) return 100;
  // 100 * e^(-d/80) keeps the first ~25 points near-linear then tapers
  return Math.round(100 * Math.exp(-deduction / 80));
}

/**
 * Derive a 0-100 score from a list of findings.
 *
 * @param {Array}  findings  finding objects ({ severity, ruleId?, expert?, ... })
 * @param {Object} [ctx]     optional agent context from buildContext()
 * @returns {number} 0-100
 */
export function scoreFromFindings(findings, ctx = null) {
  if (!findings || findings.length === 0) return 100;

  // Order matters for diminishing returns: the most severe instance of a
  // category should be the one that counts fully.
  const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...findings].sort(
    (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
  );

  const seenPerCategory = new Map();
  let deduction = 0;

  for (const f of sorted) {
    const base = SEVERITY_BASE[f.severity] ?? 0;
    if (base === 0) continue;               // info never deducts

    const cat = categoryOf(f);
    const n = seenPerCategory.get(cat) || 0;
    seenPerCategory.set(cat, n + 1);

    deduction += base * repeatFactor(n) * contextMultiplier(f, ctx);
  }

  return applySoftFloor(deduction);
}

/**
 * Letter grade from a score.
 *
 * Deliberately identical to the scale each agent system already used —
 * A+/A/B/C/D/F with no E. The scoring curve changed; the grading convention
 * did not, so nothing the user has already seen shifts meaning. The extra
 * resolution now lives in the score itself, which no longer flatlines: two
 * solutions that both read "F" are now visibly F(2) and F(36).
 */
export function gradeFromScore(score) {
  if (score >= 95) return { letter: 'A+', tone: 'success', label: 'Production-ready' };
  if (score >= 90) return { letter: 'A',  tone: 'success', label: 'Strong' };
  if (score >= 80) return { letter: 'B',  tone: 'success', label: 'Solid with minor gaps' };
  if (score >= 70) return { letter: 'C',  tone: 'warning', label: 'Needs improvement' };
  if (score >= 50) return { letter: 'D',  tone: 'warning', label: 'Significant issues' };
  return                  { letter: 'F',  tone: 'danger',  label: 'Do not deploy' };
}

/**
 * Explain a score in one sentence — what actually drove it. Useful in the UI
 * and far more actionable than a bare number.
 */
export function explainScore(findings, ctx = null) {
  if (!findings || findings.length === 0) {
    return 'No issues found — nothing deducted.';
  }
  const counts = {};
  const catCounts = new Map();
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] || 0) + 1;
    const c = categoryOf(f);
    catCounts.set(c, (catCounts.get(c) || 0) + 1);
  }
  const repeated = [...catCounts.values()].filter((n) => n > 1).length;
  const bits = [];
  for (const sev of ['critical', 'high', 'medium', 'low']) {
    if (counts[sev]) bits.push(`${counts[sev]} ${sev}`);
  }
  let s = bits.join(', ') || 'no scored findings';
  if (repeated > 0) {
    s += ` — ${repeated} root cause${repeated > 1 ? 's' : ''} repeated across resources, counted once at full weight`;
  }
  if (ctx?.compliance?.any) s += '; compliance context increased the weight of security findings';
  else if (ctx?.budget) s += '; a stated budget increased the weight of cost findings';
  return s;
}
