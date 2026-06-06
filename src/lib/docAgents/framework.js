/**
 * docAgents/framework.js — shared base for documentation quality agents.
 *
 * 2 agents review handover docs / runbooks / project documentation:
 *   - Handover Completeness — credentials, runbook, rollback, monitoring,
 *     contacts, known issues
 *   - Technical Accuracy — region clarity, version stamps, broken links,
 *     IAM least-privilege, outdated paths
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
// Section markers — what a complete handover doc should have
// ════════════════════════════════════════════════════════════════════
export const SECTIONS = {
  overview:     /\b(overview|introduction|summary|about this (?:doc|project))\b/i,
  architecture: /\b(architecture|topology|design|system diagram|components?)\b/i,
  prerequisites: /\b(prerequisites?|pre[- ]?requisites?|before you (?:begin|start)|requirements?|what you'?ll need)\b/i,
  credentials:  /\b(credentials?|secrets?|api keys?|access keys?|tokens?|passwords?|iam (?:role|user|policy)|service account)\b/i,
  deployment:   /\b(deploy(?:ment)?|installation|setup|provision(?:ing)?|how to (?:run|deploy|install))\b/i,
  runbook:      /\b(runbook|operations?|day[- ]?to[- ]?day|standard operating|sop)\b/i,
  rollback:     /\b(rollback|revert|undo|recovery|disaster recovery|dr plan)\b/i,
  monitoring:   /\b(monitoring|observability|alerts?|alarms?|metrics?|logs?|dashboards?|cloudwatch)\b/i,
  troubleshooting: /\b(troubleshooting|known (?:issues?|problems?|bugs?)|common (?:issues?|errors?|problems?)|faq)\b/i,
  contacts:     /\b(contacts?|owners?|maintainers?|escalation|on[- ]?call|who to contact)\b/i,
  costs:        /\b(costs?|pricing|monthly (?:bill|estimate|spend)|estimated cost)\b/i,
  security:     /\b(security|access control|permissions?|least[- ]?privilege)\b/i,
};

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
export function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function detectSections(text) {
  // A section is "present" only if the keyword appears AND it's NOT
  // the subject of a TODO/FIXME/TBD stub on the same or next line.
  const stubLine = /\b(?:TODO|FIXME|TBD|XXX)\b[^\n]*/gi;
  // Build a working copy where TODO lines are stripped so they don't
  // satisfy section regexes.
  const cleaned = String(text || '').replace(stubLine, '');

  const present = {};
  for (const [key, rx] of Object.entries(SECTIONS)) {
    present[key] = rx.test(cleaned);
  }
  return present;
}

export function findAwsRegions(text) {
  // us-east-1, eu-west-2, etc
  const m = String(text || '').match(/\b(us|eu|ap|sa|af|me|ca)-(east|west|north|south|central|northeast|southeast|northwest|southwest)-\d\b/gi) || [];
  return [...new Set(m)];
}

export function findUrls(text) {
  // Allow < and > inside URLs so we can catch templated/placeholder URLs
  // like https://<account-id>.s3.amazonaws.com/your-bucket
  return String(text || '').match(/\bhttps?:\/\/[^\s)"']+/gi) || [];
}

// ════════════════════════════════════════════════════════════════════
// Context builder
// ════════════════════════════════════════════════════════════════════
export function buildContext({ docText = '', docType = 'handover', services = [] } = {}) {
  return {
    docText: String(docText || ''),
    docLower: String(docText || '').toLowerCase(),
    docType,
    services,
    wordCount: wordCount(docText),
    sections: detectSections(docText),
    regions: findAwsRegions(docText),
    urls: findUrls(docText),
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
