/**
 * presentationAgents/master.js — orchestrator for presentation agents.
 *
 * runPresentationReview({ slides, brief, audience }) → { findings[], ... }
 */

import { narrativeArchitect } from './narrative.js';
import { visualClarityExpert } from './visualClarity.js';
import { bySeverity, buildContext, gradeFromScore, scoreFromFindings, SEVERITY } from './framework.js';

export const ALL_PRESENTATION_AGENTS = [narrativeArchitect, visualClarityExpert];

export function runPresentationReview(input = {}) {
  const ctx = buildContext(input);

  const perAgent = ALL_PRESENTATION_AGENTS.map((agent) => {
    let findings = [];
    try {
      findings = agent.review(ctx) || [];
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[presentationAgents] ${agent.id} threw:`, err);
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
