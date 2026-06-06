/**
 * accountHygieneAgents/framework.js — base for AWS Account Hygiene Auditor.
 *
 * Single agent reviews the *configured state* of a linked AWS account:
 * MFA presence, access key age, root account usage, billing alerts,
 * default VPC, S3 block-public-access, password policy.
 *
 * Input shape (from AWSContext profile):
 *   {
 *     profile: { accessKey, accessKeyCreatedAt, lastUsed,
 *                mfaEnabled, isRoot, userArn, accountId },
 *     billingAlerts: boolean | { count, lowestThreshold },
 *     services: { configEnabled, guardDutyEnabled, cloudTrailEnabled,
 *                 securityHubEnabled, s3BlockPublicAccessEnabled,
 *                 defaultVpcInUse, passwordPolicyCompliant },
 *     supportPlan: 'basic' | 'developer' | 'business' | 'enterprise',
 *     freeTierActive: boolean,
 *   }
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

export function daysSince(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((Date.now() - t) / 86400000);
}

export function buildContext({ profile = {}, billingAlerts = null, services = {}, supportPlan = 'basic', freeTierActive = false } = {}) {
  return {
    profile,
    keyAgeDays:    daysSince(profile.accessKeyCreatedAt || profile.createdAt),
    lastUsedDays:  daysSince(profile.lastUsed || profile.lastUsedAt),
    mfaEnabled:    Boolean(profile.mfaEnabled),
    isRoot:        Boolean(profile.isRoot || /:root\b/.test(String(profile.userArn || ''))),
    hasAccessKey:  Boolean(profile.accessKey),
    services:      services || {},
    billingAlerts,
    supportPlan,
    freeTierActive,
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
