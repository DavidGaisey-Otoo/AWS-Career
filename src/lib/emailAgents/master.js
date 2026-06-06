/**
 * emailAgents/master.js — orchestrator for the email quality agents.
 *
 * runEmailReview({ subject, body, recipient, intent, fromName, hasUnsubscribe })
 *   → { findings[], score, grade, criticalCount, highCount, mediumCount, perAgent[] }
 */

import { deliverabilityExpert } from './deliverability.js';
import { outreachStrategist } from './outreach.js';
import {
  bySeverity, buildContext, gradeFromScore, scoreFromFindings, SEVERITY,
} from './framework.js';

export const ALL_EMAIL_AGENTS = [deliverabilityExpert, outreachStrategist];

export function runEmailReview(input = {}) {
  const ctx = buildContext(input);

  const perAgent = ALL_EMAIL_AGENTS.map((agent) => {
    let findings = [];
    try {
      findings = agent.review(ctx) || [];
    } catch (err) {
      // Defensive — never let one bad rule kill the whole review
      // eslint-disable-next-line no-console
      console.error(`[emailAgents] ${agent.id} threw:`, err);
    }
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      yearsExperience: agent.yearsExperience,
      expertiseAreas: agent.expertiseAreas,
      findings,
      score: scoreFromFindings(findings),
    };
  });

  // Combine + dedupe by ruleId
  const seen = new Set();
  const combined = [];
  for (const a of perAgent) {
    for (const f of a.findings) {
      const k = f.ruleId || `${a.id}::${f.title}`;
      if (seen.has(k)) continue;
      seen.add(k);
      combined.push({ ...f, agentId: a.id, agentName: a.name });
    }
  }

  combined.sort(bySeverity);

  const score = scoreFromFindings(combined);
  const grade = gradeFromScore(score);

  return {
    findings: combined,
    perAgent,
    score,
    grade,
    criticalCount: combined.filter((f) => f.severity === 'critical').length,
    highCount:     combined.filter((f) => f.severity === 'high').length,
    mediumCount:   combined.filter((f) => f.severity === 'medium').length,
    lowCount:      combined.filter((f) => f.severity === 'low').length,
    runMode: 'rules',
    severityScale: SEVERITY,
  };
}
