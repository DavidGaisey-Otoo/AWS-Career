/**
 * synthesis.js — EX-25: cross-agent reasoning.
 *
 * ════════════════════════════════════════════════════════════════════
 * THE GAP THIS FILLS
 * ════════════════════════════════════════════════════════════════════
 * The ten expert agents each review in isolation, and the orchestrator then
 * dedupes and sorts what they return. Nothing ever reads two agents'
 * findings together. That is a real ceiling on how smart the review can be,
 * because a senior architect's most valuable observations are precisely the
 * ones that only exist in combination:
 *
 *   Security says   "the database is not encrypted"       (high)
 *   Compliance says "this brief mentions PCI-DSS"         (info)
 *   → Neither is critical alone. Together they are a failed audit.
 *
 *   Reliability says "single AZ"                          (medium)
 *   Cost says        "Spot instances for the web tier"    (info)
 *   → Together: a single AZ of interruptible capacity. One Spot reclaim
 *     and the whole application is gone. That is critical, and no single
 *     agent can see it.
 *
 * This module runs AFTER all agents report and emits COMPOUND findings —
 * conclusions that require two or more independent observations. They are
 * tagged expert: 'synthesis' so the UI can show who raised them.
 *
 * ════════════════════════════════════════════════════════════════════
 * DESIGN RULES
 * ════════════════════════════════════════════════════════════════════
 * - A compound rule only fires when EVERY precondition is present. No
 *   guessing, no partial matches.
 * - Each rule states which findings triggered it (`from`), so a user can
 *   always trace the reasoning back. An unexplainable escalation is worse
 *   than no escalation.
 * - Rules explain the INTERACTION, not the individual problems — the
 *   agents already said those.
 * - Compound findings can also be POSITIVE: recognising that several good
 *   decisions reinforce each other is genuine signal too.
 */

import { finding } from './framework.js';

/** Does any finding match this predicate? */
const has = (findings, re) =>
  findings.some((f) => re.test(`${f.ruleId || ''} ${f.title || ''} ${f.body || ''}`));

/** Return the findings that matched, for traceability. */
const matching = (findings, re) =>
  findings.filter((f) => re.test(`${f.ruleId || ''} ${f.title || ''} ${f.body || ''}`))
    .map((f) => f.ruleId || f.title);

// ════════════════════════════════════════════════════════════════════
// Compound rules
//
// Each: { id, when(findings, ctx) -> bool, build(findings, ctx) -> finding }
// ════════════════════════════════════════════════════════════════════
const COMPOUND_RULES = [
  {
    id: 'SYN-COMPLIANCE-ENCRYPTION',
    when: (f, ctx) => ctx.compliance?.any && has(f, /encrypt/i),
    build: (f, ctx) => {
      const regime = ctx.compliance.hipaa ? 'HIPAA'
        : ctx.compliance.pci ? 'PCI-DSS'
        : ctx.compliance.gdpr ? 'GDPR'
        : ctx.compliance.fedramp ? 'FedRAMP' : 'the stated compliance regime';
      return finding({
        severity: 'critical',
        ruleId: 'SYN-COMPLIANCE-ENCRYPTION',
        title: `Encryption gap under ${regime} is an audit failure, not a best-practice miss`,
        body: `An encryption finding on its own is a hardening recommendation. On a brief that names ${regime} it becomes a control failure — the auditor does not grade on a curve, and a single unencrypted store can fail the whole assessment.`,
        fix: `Treat every encryption finding here as blocking. Encrypt at rest with a customer-managed KMS key so you control rotation and can evidence it, and enforce TLS in transit. Then document which control each maps to for the auditor.`,
        evidence: matching(f, /encrypt/i).slice(0, 3).join(', '),
      });
    },
  },
  {
    id: 'SYN-SPOT-SINGLE-AZ',
    when: (f, ctx) => (ctx.has('spot') || has(f, /spot/i))
      && (has(f, /single[- ]az|one availability zone|multi[- ]az/i) || !ctx.has('asg')),
    build: (f) => finding({
      severity: 'critical',
      ruleId: 'SYN-SPOT-SINGLE-AZ',
      title: 'Interruptible capacity without spread — one reclaim takes the whole tier',
      body: 'Spot is being used without the diversification that makes it survivable. Spot capacity is reclaimed with two minutes\' notice, and when the fleet sits in one Availability Zone or one instance type, a single reclamation event removes all of it at once. Spot is a cost decision that only works when paired with an availability decision.',
      fix: 'Spread across at least three instance types and two or more Availability Zones, or move the always-on baseline to On-Demand/Savings Plans and keep Spot for the burst layer only.',
      evidence: matching(f, /spot|single[- ]az/i).slice(0, 3).join(', '),
    }),
  },
  {
    id: 'SYN-SCALE-NO-CACHE',
    when: (f, ctx) => (ctx.userScale || 0) >= 100_000
      && !ctx.has('elasticache') && !ctx.has('dax') && !ctx.has('cloudfront')
      && (ctx.has('rds') || ctx.has('aurora') || ctx.has('dynamodb')),
    build: (f, ctx) => finding({
      severity: 'high',
      ruleId: 'SYN-SCALE-NO-CACHE',
      title: `Every read reaches the database at ${Number(ctx.userScale).toLocaleString()} users`,
      body: 'The brief states a user scale that makes an uncached read path the dominant cost and the first thing to fall over, yet no caching layer appears anywhere in the design. This is not a single-service problem, which is why no individual reviewer flagged it — it is the shape of the architecture.',
      fix: 'Add ElastiCache in front of RDS/Aurora, or DAX for DynamoDB, and CloudFront for anything cacheable at the edge. Typically removes the majority of read traffic before it reaches the database.',
    }),
  },
  {
    id: 'SYN-BUDGET-VS-DESIGN',
    when: (f, ctx) => ctx.budget && ctx.budget.amount <= 500
      && (ctx.has('rds-multiaz') || has(f, /multi[- ]az|nat gateway|provisioned iops|dedicated/i)),
    build: (f, ctx) => finding({
      severity: 'high',
      ruleId: 'SYN-BUDGET-VS-DESIGN',
      title: `Design carries always-on costs that will consume a $${ctx.budget.amount}/${ctx.budget.unit} budget`,
      body: 'The stated budget and the chosen components are in tension. Multi-AZ databases, NAT Gateways and provisioned IOPS all bill continuously whether or not anyone uses the system, and at this budget a small number of them account for most of it before a single request is served.',
      fix: 'Decide explicitly which resilience you are buying. Options: VPC Gateway endpoints instead of a NAT Gateway, Single-AZ with automated backups for non-critical data, gp3 instead of provisioned IOPS, and Aurora Serverless v2 so idle time costs little.',
      evidence: matching(f, /multi[- ]az|nat gateway|provisioned iops/i).slice(0, 3).join(', '),
    }),
  },
  {
    id: 'SYN-PROD-NO-OBSERVABILITY',
    when: (f, ctx) => ctx.isProduction
      && has(f, /monitor|alarm|logging|observab|cloudwatch/i)
      && has(f, /backup|recovery|failover|single point/i),
    build: (f) => finding({
      severity: 'high',
      ruleId: 'SYN-PROD-NO-OBSERVABILITY',
      title: 'Production with both a recovery gap and a visibility gap',
      body: 'Each of these would be a manageable weakness on its own. Together they compound: without monitoring you will not learn about the failure quickly, and without the recovery path you cannot act on it when you do. The mean time to recovery is effectively unbounded.',
      fix: 'Close the observability gap first — it is cheaper and it tells you whether the other fixes worked. CloudWatch alarms on the golden signals, routed to SNS, then address the recovery gap.',
      evidence: matching(f, /monitor|alarm|backup|failover/i).slice(0, 4).join(', '),
    }),
  },
  {
    id: 'SYN-PUBLIC-PLUS-SENSITIVE',
    when: (f, ctx) => has(f, /public|0\.0\.0\.0\/0|publicly accessible/i)
      && (ctx.compliance?.any || has(f, /encrypt|sensitive|pii|phi|cardhold/i)),
    build: (f) => finding({
      severity: 'critical',
      ruleId: 'SYN-PUBLIC-PLUS-SENSITIVE',
      title: 'Public exposure on a workload that handles regulated or sensitive data',
      body: 'A public endpoint is a design choice; sensitive data is a constraint. Together they are the combination behind most reported breaches — the exposure is the vector and the data is the consequence. The severity of each finding alone understates the risk of both.',
      fix: 'Remove public exposure entirely where possible: private subnets, VPC endpoints, and CloudFront with Origin Access Control instead of a public bucket. Where a public entry point is genuinely required, put WAF in front of it and confirm the data behind it is encrypted with a customer-managed key.',
      evidence: matching(f, /public|0\.0\.0\.0\/0/i).slice(0, 3).join(', '),
    }),
  },
  {
    id: 'SYN-STATEFUL-AUTOSCALE',
    when: (f, ctx) => (ctx.has('asg') || ctx.has('autoscaling') || has(f, /auto scal/i))
      && has(f, /session|stateful|local (disk|storage)|instance store/i),
    build: (f) => finding({
      severity: 'high',
      ruleId: 'SYN-STATEFUL-AUTOSCALE',
      title: 'Auto Scaling in front of instances that hold state',
      body: 'Scaling and statefulness are individually fine and mutually hostile. Every scale-in event destroys whatever the terminated instance was holding, so the elasticity that was added for resilience becomes a source of user-visible failure — logged-out sessions, lost uploads, missing local files.',
      fix: 'Externalise the state before relying on scaling: ElastiCache or DynamoDB for sessions, EFS for shared files, S3 for uploads. Then the instances are disposable and scaling behaves as intended.',
      evidence: matching(f, /session|stateful|local disk/i).slice(0, 3).join(', '),
    }),
  },
  {
    id: 'SYN-NO-IAC-AT-SCALE',
    when: (f, ctx) => ctx.approach === 'console'
      && (ctx.isProduction || (ctx.userScale || 0) >= 50_000),
    build: (f, ctx) => finding({
      severity: 'medium',
      ruleId: 'SYN-NO-IAC-AT-SCALE',
      title: 'Console-built production infrastructure has no reproducible path',
      body: `A click-built environment cannot be reviewed, versioned, or rebuilt identically after an incident. At ${ctx.isProduction ? 'production' : 'this scale'} that stops being a preference and becomes an operational risk: the recovery procedure is someone remembering what they clicked.`,
      fix: 'Capture the environment as CloudFormation or Terraform before it grows further. The Solution Studio in this app generates both from the same design.',
    }),
  },

  // ── Positive synthesis — mutually reinforcing good decisions ──────
  {
    id: 'SYN-POSITIVE-DEFENCE-IN-DEPTH',
    when: (f, ctx) => {
      const layers = [
        ctx.has('waf'),
        ctx.has('kms') || ctx.has('encryption'),
        ctx.has('cloudtrail'),
        ctx.has('iam'),
        ctx.has('security-group') || ctx.has('nacl'),
      ].filter(Boolean).length;
      return layers >= 4 && !has(f, /critical/i);
    },
    build: () => finding({
      severity: 'info',
      ruleId: 'SYN-POSITIVE-DEFENCE-IN-DEPTH',
      title: 'Layered security — the controls reinforce each other',
      body: 'Four or more independent security layers are present (network, identity, encryption, and audit). This matters more than the sum of the parts: defence in depth means a single misconfiguration does not become a breach, because the next layer still holds.',
      fix: null,
    }),
  },
];

/**
 * Run every compound rule against the collected findings.
 *
 * @param {Array}  findings  all findings from all agents, already deduped
 * @param {Object} ctx       the shared agent context from buildContext()
 * @returns {Array} compound findings, tagged as raised by 'synthesis'
 */
export function synthesise(findings, ctx) {
  if (!Array.isArray(findings) || !ctx) return [];
  const out = [];

  for (const rule of COMPOUND_RULES) {
    let fires = false;
    try {
      fires = !!rule.when(findings, ctx);
    } catch (err) {
      // A malformed context must never take down the whole review
      console.warn(`[synthesis] ${rule.id} threw:`, err);
      continue;
    }
    if (!fires) continue;

    try {
      out.push({
        ...rule.build(findings, ctx),
        expert: 'synthesis',
        expertName: 'Cross-Domain Synthesis',
        expertEmoji: '🔗',
        isCompound: true,
      });
    } catch (err) {
      console.warn(`[synthesis] ${rule.id} failed to build:`, err);
    }
  }

  return out;
}

export const COMPOUND_RULE_COUNT = COMPOUND_RULES.length;
