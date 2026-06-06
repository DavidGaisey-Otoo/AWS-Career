/**
 * projectPlanAgents/framework.js — base for project plan reviewer.
 *
 * Single agent reviews a Gantt-style project plan: phase realism, dependencies,
 * missing buffer, no handover, weekend/holiday clashes, headcount sanity.
 *
 * Input shape (from ProjectPlan):
 *   {
 *     plan: { totalDays, phases: [{ name, startDay, endDay, durationDays, tasks: [...] }] },
 *     services: string[], level: 'beginner'|'intermediate'|'senior',
 *     teamSize: number, startDate: ISOString,
 *   }
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

// Typical realistic durations (working days) for common AWS workloads
export const TYPICAL_PHASES = {
  discovery:   { min: 3,  ideal: 7,  max: 14 },
  build:      { min: 10, ideal: 21, max: 60 },
  hardening:  { min: 3,  ideal: 7,  max: 14 },
  handover:   { min: 2,  ideal: 5,  max: 10 },
};

export function buildContext({ plan = {}, services = [], level = 'intermediate', teamSize = 1, startDate = null } = {}) {
  const phases = Array.isArray(plan.phases) ? plan.phases : [];
  const totalDays = Number(plan.totalDays) || phases.reduce((s, p) => s + (Number(p.durationDays) || 0), 0);
  return {
    plan,
    phases,
    totalDays,
    services: services.map((s) => String(s).toLowerCase()),
    level,
    teamSize: Math.max(1, Number(teamSize) || 1),
    startDate,
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
