/**
 * master.js — Master Orchestrator.
 *
 * Routes a solution context through every relevant domain expert,
 * collects findings, dedupes, sorts by severity, and produces a unified
 * Review with an overall score + per-expert breakdown.
 *
 * This is the SINGLE entry point any UI should call:
 *
 *   import { runExpertReview } from './lib/expertAgents/master.js';
 *   const review = runExpertReview({ brief, services, region, level, approach, solutionText });
 *   // → { score, findings, perExpert, summary, criticalCount, ... }
 */

import { buildContext, bySeverity, scoreFromFindings, explainScore, SEVERITY } from './framework.js';
import { synthesise } from './synthesis.js';
import { securityArchitect }   from './security.js';
import { databaseArchitect }   from './database.js';
import { networkArchitect }    from './network.js';
import { costOptimizer }       from './cost.js';
import { complianceOfficer }   from './compliance.js';
import { computeArchitect }    from './compute.js';
import { storageArchitect }    from './storage.js';
import { reliabilityEngineer } from './reliability.js';
import { performanceArchitect }       from './performance.js';
import { architecturePatternsExpert } from './architecture.js';

export const ALL_EXPERTS = [
  securityArchitect,
  databaseArchitect,
  networkArchitect,
  costOptimizer,
  complianceOfficer,
  computeArchitect,
  storageArchitect,
  reliabilityEngineer,
  performanceArchitect,       // AUDIT-02 new
  architecturePatternsExpert, // AUDIT-02 new
];

/**
 * Main entry point.
 *
 * @param {Object} input — see buildContext() for the shape
 * @returns {Review}
 */
export function runExpertReview(input) {
  const ctx = buildContext(input);
  const perExpert = {};
  let allFindings = [];

  for (const expert of ALL_EXPERTS) {
    let findings = [];
    try {
      findings = expert.review(ctx) || [];
    } catch (err) {
      console.warn(`[ExpertReview] ${expert.id} threw:`, err);
      findings = [];
    }
    // Annotate each finding with which expert raised it
    findings = findings.map((f) => ({ ...f, expert: expert.id, expertName: expert.name, expertEmoji: expert.emoji }));
    perExpert[expert.id] = {
      expert,
      findings,
      score: scoreFromFindings(findings.filter((f) => f.severity !== 'info')),
      criticalCount: findings.filter((f) => f.severity === 'critical').length,
      highCount: findings.filter((f) => f.severity === 'high').length,
    };
    allFindings.push(...findings);
  }

  // Dedupe — multiple experts sometimes flag the same root cause
  // (e.g. Security + Compliance both notice missing CloudTrail).
  // We keep the first finding for a given ruleId, drop duplicates.
  const seenRules = new Set();
  allFindings = allFindings.filter((f) => {
    if (!f.ruleId) return true;
    if (seenRules.has(f.ruleId)) return false;
    seenRules.add(f.ruleId);
    return true;
  });

  // ── Cross-agent synthesis ────────────────────────────────────────
  // Run AFTER dedupe so compound rules read the same finding set a human
  // reviewer would. These are conclusions no single agent can reach —
  // "unencrypted" plus "PCI-DSS" is an audit failure, not two observations.
  let compound = [];
  try {
    compound = synthesise(allFindings, ctx);
  } catch (err) {
    console.warn('[ExpertReview] synthesis failed:', err);
  }
  // Don't re-raise a compound finding an agent already made verbatim
  const existingRules = new Set(allFindings.map((f) => f.ruleId).filter(Boolean));
  compound = compound.filter((f) => !existingRules.has(f.ruleId));
  allFindings.push(...compound);

  // Sort by severity, then by expert order
  allFindings.sort(bySeverity);

  // Context is passed so scoring can weight findings by relevance —
  // a compliance brief makes security findings count for more.
  const overallScore = scoreFromFindings(allFindings.filter((f) => f.severity !== 'info'), ctx);
  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const highCount     = allFindings.filter((f) => f.severity === 'high').length;
  const mediumCount   = allFindings.filter((f) => f.severity === 'medium').length;
  const lowCount      = allFindings.filter((f) => f.severity === 'low').length;
  const positiveCount = allFindings.filter((f) => f.severity === 'info').length;

  const summary = buildSummary({ overallScore, criticalCount, highCount, mediumCount, totalFindings: allFindings.length });

  return {
    score: overallScore,
    grade: gradeFromScore(overallScore),
    summary,
    findings: allFindings,
    perExpert,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    positiveCount,
    expertCount: ALL_EXPERTS.length,
    // Findings that required two or more agents' observations to reach —
    // surfaced separately so the UI can show them as the senior read.
    compoundFindings: compound,
    compoundCount: compound.length,
    scoreExplanation: explainScore(allFindings.filter((f) => f.severity !== 'info'), ctx),
    runMode: 'rules', // future: 'llm' when Anthropic API is wired
    timestamp: new Date().toISOString(),
  };
}

function gradeFromScore(score) {
  if (score >= 95) return { letter: 'A+', tone: 'success', label: 'Production-ready' };
  if (score >= 90) return { letter: 'A',  tone: 'success', label: 'Strong' };
  if (score >= 80) return { letter: 'B',  tone: 'success', label: 'Solid with minor gaps' };
  if (score >= 70) return { letter: 'C',  tone: 'warning', label: 'Needs improvement' };
  if (score >= 50) return { letter: 'D',  tone: 'warning', label: 'Significant issues' };
  return                  { letter: 'F',  tone: 'danger',  label: 'Do not deploy' };
}

function buildSummary({ overallScore, criticalCount, highCount, mediumCount, totalFindings }) {
  if (criticalCount > 0) {
    return `${criticalCount} critical issue${criticalCount === 1 ? '' : 's'} must be fixed before deployment. Solution scores ${overallScore}/100.`;
  }
  if (highCount > 0) {
    return `${highCount} high-severity issue${highCount === 1 ? '' : 's'} should be addressed. Solution scores ${overallScore}/100 — fixable but not ready.`;
  }
  if (mediumCount > 0) {
    return `${mediumCount} medium recommendation${mediumCount === 1 ? '' : 's'}. Solution scores ${overallScore}/100 — usable but consider the suggestions.`;
  }
  if (totalFindings > 0) {
    return `Only minor recommendations. Solution scores ${overallScore}/100 — looks good.`;
  }
  return `No findings raised. Solution scores ${overallScore}/100 — clean review.`;
}

// Re-export everything callers might need
export { SEVERITY, ALL_EXPERTS as EXPERTS };
