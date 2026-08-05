/**
 * deployAgents/framework.js — base for deployment safety agents.
 *
 * 2 agents inspect the *actual* IaC payload (CFN template, Terraform plan,
 * or AWS CLI bundle) BEFORE it executes against a live AWS account.
 *
 * - Deploy Pre-Flight Auditor — IAM wildcards, missing rollback, public
 *   buckets, hardcoded secrets, security group 0.0.0.0/0, no tags.
 * - Cost Blast-Radius Estimator — NAT Gateways with no VPC endpoints,
 *   GPU instances, cross-region transfer, expensive global tables.
 *
 * Input shapes the master accepts:
 *   { template: string, format: 'cfn'|'terraform'|'cli'|'json',
 *     services: string[], region: string }
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
// IaC parsers (best-effort regex — these are PRE-FLIGHT scans, not
// full HCL/YAML parsers. We catch the common dangerous patterns.)
// ════════════════════════════════════════════════════════════════════

export function detectFormat(text) {
  const t = String(text || '');
  if (/^\s*\{[\s\S]*"AWSTemplateFormatVersion"/i.test(t) || /^\s*AWSTemplateFormatVersion\s*:/m.test(t)) return 'cfn';
  if (/^\s*resource\s+"aws_/m.test(t) || /\+\s*resource\s+"aws_/m.test(t)) return 'terraform';
  if (/\baws\s+\w+\s+(create|put|delete|update|run)/.test(t)) return 'cli';
  if (/^\s*\{/.test(t) && /[Rr]esources/.test(t)) return 'json';
  return 'unknown';
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════

export function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

export function buildContext({ template = '', format = null, services = [], region = null } = {}) {
  const text = String(template || '');
  return {
    template: text,
    lowerTemplate: text.toLowerCase(),
    format: format || detectFormat(text),
    services: services.map((s) => String(s).toLowerCase()),
    region,
    lineCount: text.split('\n').length,
    wordCount: wordCount(text),
  };
}

// EX-25: scoring moved to the shared src/lib/agentScoring.js. The old local
// copy saturated at zero after four criticals, double-counted one root cause
// repeated across resources, and ignored the context the agents had already
// computed. Re-exported here so every existing import keeps working.
export { scoreFromFindings } from '../agentScoring.js';

export function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', tone: 'success' };
  if (score >= 80) return { letter: 'A',  tone: 'success' };
  if (score >= 70) return { letter: 'B',  tone: 'success' };
  if (score >= 60) return { letter: 'C',  tone: 'warning' };
  if (score >= 50) return { letter: 'D',  tone: 'warning' };
  return { letter: 'F', tone: 'danger' };
}
