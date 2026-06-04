/**
 * proactiveSuggestions.js — Phase 5 (audit follow-up).
 *
 * Scans the user's current context (brief + services + region + level
 * + recent activity) and emits an ordered list of warnings + suggestions
 * BEFORE the user makes a mistake. Pure functions, no React.
 *
 * Examples of what it catches:
 *   - "Brief mentions UK clients but you picked us-east-1" (region mismatch)
 *   - "You're touching S3 + IAM but haven't done the root-MFA setup"
 *     (referencing the AC-01 checklist state)
 *   - "Lambda + 15-min-timeout warning when brief mentions video transcoding"
 *   - "Brief mentions HIPAA but you skipped the compliance services"
 *
 * Consumed by SmartProposalGenerator, NewWalkthrough, JobAnalyzer —
 * surfaces as a yellow/orange banner at the top of those pages.
 */

import { recommendApproach } from './approachRecommender.js';
import { detectLocation } from './rateBenchmark.js';

// ════════════════════════════════════════════════════════════════════
// Rule definitions
// Each rule is a pure function: (ctx) => SuggestionList. The ctx shape:
//   {
//     brief: string,
//     services: string[],          // detected service ids (lowercase)
//     region: string,              // selected region, e.g. 'eu-west-1'
//     level: 'beginner'|'intermediate'|'senior',
//     setupChecklist: { [itemId]: { done: bool } },  // AC-01 state
//   }
// ════════════════════════════════════════════════════════════════════

const RULES = [
  // ─────── Region mismatches ───────
  function regionVsClientLocation(ctx) {
    const out = [];
    if (!ctx.brief || !ctx.region) return out;
    const loc = detectLocation(ctx.brief);
    if (!loc.confident) return out;

    // Map detected client location → preferred AWS region prefix
    const prefMap = {
      usa:       ['us-'],
      uk:        ['eu-west-2', 'eu-west-1'],
      europe:    ['eu-'],
      australia: ['ap-southeast-2', 'ap-southeast-4'],
      africa:    ['af-', 'eu-west-1', 'eu-south-1'],
    };
    const prefs = prefMap[loc.id];
    if (!prefs) return out;

    const matches = prefs.some((p) => ctx.region.startsWith(p));
    if (!matches) {
      out.push({
        id: 'region-mismatch',
        severity: 'warning',
        title: `Region mismatch — ${ctx.region} vs ${loc.id.toUpperCase()} client`,
        body: `The brief signals a ${loc.id.toUpperCase()} client (matched "${loc.evidence}") but you've picked ${ctx.region}. Consider ${prefs[0]} for lower latency + data-residency compliance.`,
        action: { label: `Use ${prefs[0]} instead`, hint: 'Change in the region selector' },
      });
    }
    return out;
  },

  // ─────── Multi-region warnings ───────
  function multiRegionDataTransfer(ctx) {
    const out = [];
    if (!ctx.services?.length) return out;
    const has = (id) => ctx.services.includes(id);
    // S3 + Lambda + CloudFront — typical multi-region scenario
    if (has('s3') && has('cloudfront')) {
      out.push({
        id: 'cloudfront-region-cost',
        severity: 'info',
        title: 'CloudFront is global — your S3 bucket region matters less than you think',
        body: `CloudFront caches at edge locations worldwide; your origin bucket can stay in one region. Beware: cross-region S3 → Lambda calls incur data transfer charges. Keep S3 + Lambda in the same region.`,
      });
    }
    if (has('s3') && has('lambda') && !ctx.region) {
      out.push({
        id: 'lambda-s3-same-region',
        severity: 'warning',
        title: 'Pick a region before deploying Lambda + S3',
        body: `Lambda calling S3 across regions costs $0.02/GB. Put both in the same region from the start.`,
      });
    }
    return out;
  },

  // ─────── Setup checklist gaps ───────
  function unmetSecurityBaseline(ctx) {
    const out = [];
    if (!ctx.setupChecklist) return out;
    const isProduction = /\b(production|prod|client|live|customer)\b/i.test(ctx.brief || '');
    if (!isProduction) return out;

    const cl = ctx.setupChecklist;
    const missing = [];
    if (!cl['root-mfa']?.done)      missing.push('Root MFA');
    if (!cl['iam-admin-user']?.done) missing.push('IAM Admin user');
    if (!cl['iam-user-mfa']?.done)   missing.push('IAM user MFA');
    if (!cl['billing-alerts']?.done) missing.push('Billing alerts');
    if (!cl['cloudtrail']?.done)     missing.push('CloudTrail');

    if (missing.length >= 3) {
      out.push({
        id: 'baseline-gaps',
        severity: 'danger',
        title: `Production-grade work but baseline security gaps: ${missing.length} items`,
        body: `Before deploying client work, lock down: ${missing.join(', ')}. AWS Account Manager → My Setup Documentation has the checklist with CLI verification commands.`,
        action: { label: 'Open Setup Documentation', to: '/aws-accounts' },
      });
    }
    return out;
  },

  // ─────── Lambda 15-min limit ───────
  function lambdaTimeoutWarning(ctx) {
    const out = [];
    if (!ctx.services?.includes('lambda')) return out;
    const longRunning = /\b(video (transcod|process|render)|batch process|machine learning training|ml training|long[- ]?running|hours? to|days? to|migration|etl pipeline|data warehouse load)\b/i;
    if (longRunning.test(ctx.brief || '')) {
      out.push({
        id: 'lambda-timeout-risk',
        severity: 'warning',
        title: 'Lambda has a 15-minute timeout — your workload may not fit',
        body: `The brief hints at long-running work (video transcoding / batch processing / ML training / migration). Lambda will hard-timeout at 15 min. Consider ECS Fargate (no time limit), Step Functions (chain Lambdas), or EC2.`,
        action: { label: 'Add ECS Fargate to services', hint: 'Replace lambda with ecs+fargate' },
      });
    }
    return out;
  },

  // ─────── Compliance signals ───────
  function complianceGap(ctx) {
    const out = [];
    const brief = ctx.brief || '';
    const services = ctx.services || [];
    const complianceMap = {
      hipaa: { keywords: /\b(hipaa|phi|protected health|medical record|patient data)\b/i,
               needed: ['kms', 'cloudtrail', 'vpc'], label: 'HIPAA' },
      pci:   { keywords: /\b(pci[- ]?dss|payment card|credit card data|cardholder)\b/i,
               needed: ['kms', 'cloudtrail', 'vpc', 'waf'], label: 'PCI-DSS' },
      gdpr:  { keywords: /\b(gdpr|eu data|data residency|right to be forgotten)\b/i,
               needed: ['kms'], label: 'GDPR' },
      soc2:  { keywords: /\b(soc ?2|soc-2|soc2 type ii)\b/i,
               needed: ['cloudtrail', 'iam', 'kms'], label: 'SOC 2' },
    };
    for (const [key, def] of Object.entries(complianceMap)) {
      if (!def.keywords.test(brief)) continue;
      const missing = def.needed.filter((s) => !services.includes(s));
      if (missing.length > 0) {
        out.push({
          id: `compliance-${key}`,
          severity: 'danger',
          title: `${def.label} mentioned — missing services: ${missing.map((s) => s.toUpperCase()).join(', ')}`,
          body: `Brief mentions ${def.label} compliance but your service list doesn't include ${missing.join('/').toUpperCase()}. ${def.label} typically requires encryption-at-rest (KMS), audit logging (CloudTrail), and network isolation (VPC).`,
        });
      }
    }
    return out;
  },

  // ─────── Free Tier risk ───────
  function freeTierBlowoutRisk(ctx) {
    const out = [];
    if (!ctx.services?.length) return out;
    // EC2 + RDS + multi-AZ = guaranteed over Free Tier
    const expensiveCombo = ctx.services.includes('rds') && ctx.services.includes('ec2');
    if (expensiveCombo && ctx.level === 'beginner') {
      out.push({
        id: 'freetier-blowout',
        severity: 'warning',
        title: `RDS + EC2 — you'll exceed the Free Tier within hours`,
        body: `RDS counts every hour the DB instance exists (even idle), EC2 t2.micro is capped at 750 hrs/month combined. Running both 24/7 = ~$30-50/mo unless you destroy at end of day.`,
        action: { label: 'Add auto-destroy timer', hint: 'AWS Account Manager has resource ledger + emergency stop' },
      });
    }
    return out;
  },

  // ─────── Approach vs services mismatch ───────
  function approachMismatch(ctx) {
    const out = [];
    if (!ctx.brief) return out;
    const rec = recommendApproach({ brief: ctx.brief, services: ctx.services, freelance: true });
    if (rec.recommended === 'console' && ctx.services?.length >= 5) {
      out.push({
        id: 'console-too-complex',
        severity: 'info',
        title: `${ctx.services.length} services + Console approach = a long click-trail`,
        body: `Console works for 1-3 services but at this scale you'd be clicking for hours and the client can't reproduce it. Switch to Terraform or CloudFormation.`,
      });
    }
    return out;
  },
];

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/**
 * Run all rules against the given context. Returns suggestions sorted
 * by severity (danger first, then warning, then info).
 *
 * @param {Object} ctx
 * @returns {Suggestion[]}
 */
export function getProactiveSuggestions(ctx) {
  const all = [];
  for (const rule of RULES) {
    try {
      const r = rule(ctx) || [];
      for (const s of r) all.push(s);
    } catch (err) {
      console.warn('[proactiveSuggestions] rule failed:', err);
    }
  }
  return all.sort(bySeverity);
}

const SEVERITY_RANK = { danger: 0, warning: 1, info: 2 };
function bySeverity(a, b) {
  return (SEVERITY_RANK[a.severity] ?? 99) - (SEVERITY_RANK[b.severity] ?? 99);
}

/**
 * Convenience helper that loads ctx pieces from the various stores so
 * callers don't have to plumb them all.
 */
export function buildContextFromBrief({ brief, services = [], region, level = 'beginner' }) {
  let setupChecklist = {};
  try {
    const raw = localStorage.getItem('awscl-pro::v1::setup-checklist');
    if (raw) setupChecklist = JSON.parse(raw);
  } catch {}
  return { brief, services, region, level, setupChecklist };
}
