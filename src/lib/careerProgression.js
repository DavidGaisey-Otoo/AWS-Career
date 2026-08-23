const LEVELS = [
  {
    id: 'entry', label: 'Entry Level', minScore: 0,
    headline: 'Entry-Level AWS Cloud & Network Engineer',
    scope: 'Guided AWS builds, cloud/network support, documentation, diagrams, troubleshooting, and clearly scoped implementations.',
  },
  {
    id: 'mid', label: 'Mid Level', minScore: 70,
    headline: 'AWS Cloud & Network Engineer',
    scope: 'Independent delivery of scoped workloads with evidence, testing, rollback guidance, and client handover.',
  },
  {
    id: 'senior', label: 'Senior Level', minScore: 90,
    headline: 'Senior AWS Solutions & Network Engineer',
    scope: 'Complex production ownership, architecture trade-offs, operational leadership, and evidenced client outcomes.',
  },
];

export function assessCareerProgression({ portfolioIntelligence = {}, projectStats = [], projects = [], proposals = [] } = {}) {
  const completed = projectStats.filter((p) => p.status === 'complete');
  const evidenced = completed.filter((p) => p.detailScore >= 0.6);
  const completedIds = new Set(completed.map((p) => p.id));
  const advanced = projects.filter((p) => completedIds.has(p.id) && ['advanced', 'expert'].includes(String(p.difficulty).toLowerCase())).length;
  const hired = proposals.filter((p) => p.status === 'hired').length;
  const coveredDomains = (portfolioIntelligence.coverageArr || []).filter((d) => d.done > 0).length;

  const score = Math.min(100, Math.round(
    Math.min(completed.length, 8) * 5
    + Math.min(evidenced.length, 5) * 6
    + Math.min(coveredDomains, 6) * 3
    + Math.min(hired, 3) * 4
  ));

  const midReady = score >= 70 && completed.length >= 3 && evidenced.length >= 2 && coveredDomains >= 3;
  const seniorReady = score >= 90 && completed.length >= 8 && evidenced.length >= 5 && advanced >= 2 && hired >= 3;
  const current = seniorReady ? LEVELS[2] : midReady ? LEVELS[1] : LEVELS[0];
  const next = current.id === 'entry' ? LEVELS[1] : current.id === 'mid' ? LEVELS[2] : null;

  const requirements = current.id === 'entry' ? [
    { label: 'Complete 3 portfolio projects', current: completed.length, target: 3 },
    { label: 'Add strong evidence to 2 completed projects', current: evidenced.length, target: 2 },
    { label: 'Practise across 3 AWS skill domains', current: coveredDomains, target: 3 },
    { label: 'Reach a 70/100 evidence score', current: score, target: 70 },
  ] : current.id === 'mid' ? [
    { label: 'Complete 8 portfolio projects', current: completed.length, target: 8 },
    { label: 'Add strong evidence to 5 completed projects', current: evidenced.length, target: 5 },
    { label: 'Complete 2 advanced projects', current: advanced, target: 2 },
    { label: 'Record 3 genuinely hired proposals', current: hired, target: 3 },
    { label: 'Reach a 90/100 evidence score', current: score, target: 90 },
  ] : [];

  return {
    current, next, score, requirements,
    evidence: { completed: completed.length, evidenced: evidenced.length, coveredDomains, advanced, hired },
    disclaimer: 'Career level is estimated from evidence stored in this app. It is not a certification or an employer-verified title.',
  };
}

export const CAREER_LEVELS = LEVELS;
