/**
 * costEstimator.js — line-item monthly + setup cost for a service list.
 *
 * Returns a structured cost report the UI can render as a clean table.
 *
 *   {
 *     monthly: [{ service, qty, unitCost, monthlyCost, note }],
 *     monthlyTotal,
 *     setupTotal,
 *     freeTierSavings,
 *     budgetCheck: { capUsd, status, deltaUsd },
 *     assumptions: [...],
 *   }
 *
 * Two modes:
 *   • 'client'  → uses requested specs (NAT Gateway $32, ALB $16, etc.)
 *   • 'test'    → uses free-tier substitutions
 */

// Approximate steady-state monthly costs (USD)
const MONTHLY = {
  vpc: 0, subnet: 0, igw: 0, 'route-table': 0, 'security-group': 0, nacl: 0,
  iam: 0, acm: 0, cloudformation: 0, cdk: 0, codedeploy: 0, codepipeline: 1, codebuild: 0, codecommit: 0,
  's3': 0.5, ebs: 3, efs: 6,
  dynamodb: 0, ses: 0,
  sqs: 0, sns: 0, eventbridge: 0, step: 0, ssm: 0, 'ssm-parameter': 0,
  // Compute (client mode = always-on)
  ec2: 8,                  // t2.micro 24/7 = ~$8 if not on Free Tier
  'ec2-t3-large': 60,
  'ec2-autoscale': 8,
  lambda: 0,
  ecs: 30, eks: 73, beanstalk: 0,
  // Databases
  rds: 13,                 // db.t2.micro post-free-tier
  'rds-multiaz': 26,
  'rds-r5-large': 180,
  aurora: 90, redshift: 180, elasticache: 12,
  // Network
  'nat-gateway': 32, 'nat-instance': 0,
  alb: 16, nlb: 16, elb: 18,
  'elastic-ip': 0,            // free while attached
  cloudfront: 0,              // 1TB free perpetually
  route53: 1,
  'direct-connect': 220,
  // Security
  kms: 1, waf: 7, shield: 0,
  guardduty: 4, config: 5, cloudtrail: 0, 'secrets-manager': 0.4, 'security-hub': 0, macie: 5,
  // Monitoring
  cloudwatch: 1, 'cloudwatch-logs': 2, xray: 0,
  // AI
  bedrock: 5, sagemaker: 30, rekognition: 0, textract: 0, comprehend: 0, comprehendmedical: 5, translate: 0, kendra: 100,
  // Streaming / media
  ivs: 30, mediaconvert: 5, chime: 10,
  // IoT
  iot: 0, greengrass: 5,
  // Data
  glue: 5, athena: 5, kinesis: 11, quicksight: 9, emr: 80,
  // Migration
  dms: 0, sct: 0,
  apigw: 1,
};

// One-off setup costs (TLS cert generation, key creation, etc.)
const SETUP = {
  acm: 0, kms: 1, vpc: 0,
};

const FREE_TIER_SAVED = {
  ec2: 8, 'ec2-autoscale': 8,
  rds: 13,
  's3': 0.5,
  apigw: 1,
  cloudfront: 0,
  cloudwatch: 1,
};

/**
 * Build the cost report.
 */
export function estimateCosts({ services, mode = 'client', accountTier = 'A', budgetCapUsd = null }) {
  const lines = [];
  let monthlyTotal = 0;
  let setupTotal = 0;
  let savings = 0;

  for (const svc of services) {
    const baseMonthly = MONTHLY[svc.id] ?? 5;
    const setup       = SETUP[svc.id] ?? 0;

    // Test mode: use the free-tier-mapped service's cost
    let effectiveMonthly = baseMonthly;
    let note = '';

    if (mode === 'test') {
      if (svc.freeTier === 'always-free' || (svc.freeTier === 'free-tier-eligible' && accountTier === 'A')) {
        effectiveMonthly = 0;
        savings += baseMonthly;
        note = '✅ Free on your account';
      } else if (svc.testMap?.spec) {
        // Use the mapped service's cost (mostly $0)
        const mappedCost = svc.testMap.cost?.match(/\$([\d.]+)/);
        effectiveMonthly = mappedCost ? parseFloat(mappedCost[1]) : 0;
        savings += baseMonthly - effectiveMonthly;
        note = `🔄 Mapped: ${svc.testMap.spec}`;
      } else {
        note = '⚠ No free equivalent — minimise testing time';
      }
    } else {
      // Client mode: full spec
      if (svc.freeTier === 'always-free') {
        effectiveMonthly = 0;
        note = '✅ Always free';
      } else {
        note = svc.costNote || '';
      }
    }

    lines.push({
      service: svc.label,
      qty: 1,
      unitCost: baseMonthly,
      monthlyCost: effectiveMonthly,
      setup,
      note,
      category: svc.category,
    });

    monthlyTotal += effectiveMonthly;
    setupTotal += setup;
  }

  // Round to cents
  monthlyTotal = Math.round(monthlyTotal * 100) / 100;
  setupTotal   = Math.round(setupTotal * 100) / 100;
  savings      = Math.round(savings * 100) / 100;

  const budgetCheck = budgetCapUsd ? {
    capUsd: budgetCapUsd,
    status: monthlyTotal <= budgetCapUsd ? 'ok' : 'over',
    deltaUsd: Math.round((budgetCapUsd - monthlyTotal) * 100) / 100,
  } : null;

  const assumptions = [];
  if (mode === 'client') {
    assumptions.push('Steady-state pricing: instances on 24/7, ALB always live.');
    assumptions.push('Data transfer not included (varies by traffic).');
    assumptions.push('No Reserved Instances or Savings Plans applied — switching to 1-year RI saves ~30%.');
  } else {
    assumptions.push('Free Tier substitutions where available (NAT Instance, t2.micro, SSM Parameter).');
    assumptions.push(`Account tier: ${accountTier === 'A' ? 'Free Tier Active' : accountTier === 'B' ? 'Free Tier Expired' : 'Credits'}`);
  }

  return {
    mode,
    lines,
    monthlyTotal,
    setupTotal,
    freeTierSavings: savings,
    budgetCheck,
    assumptions,
  };
}

/**
 * Group lines by category for the rendered table.
 */
export function groupLinesByCategory(lines) {
  const out = {};
  for (const ln of lines) {
    const k = ln.category || 'other';
    if (!out[k]) out[k] = [];
    out[k].push(ln);
  }
  return out;
}
