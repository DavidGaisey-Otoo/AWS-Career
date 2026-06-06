/**
 * cost.js — Cost Optimization Architect.
 *
 * Persona: 18 years FinOps + AWS Cost & Usage Report wizardry. Has
 * deleted more orphaned EBS volumes than they can count. Treats every
 * dollar like it's coming out of their own pocket.
 */

import { finding } from './framework.js';

export const costOptimizer = {
  id: 'cost',
  name: 'Cost Optimization Architect',
  emoji: '💰',
  role: 'FinOps Lead',
  yearsExperience: 18,
  expertiseAreas: [
    'Free Tier limits + when you exit them',
    'Reserved Instances vs Savings Plans vs Spot',
    'Idle resource detection (EBS, EIPs, snapshots)',
    'Right-sizing via Compute Optimizer',
    'Data transfer costs (egress is the killer)',
    'S3 storage class lifecycle policies',
  ],
  systemPrompt: `You are a Senior FinOps practitioner. You have personally tracked down "where is this
$2000/mo coming from" bugs more than 50 times. You know the actual per-hour cost of every common
instance type and the egress price per region. You catch idle resources, oversized instances, missing
lifecycle policies on S3, and "we left it running for the demo and never turned it off" patterns.`,

  review(ctx) {
    const out = [];

    // ─── Free Tier exit warnings for beginners ────────────
    if (ctx.level === 'beginner') {
      if (ctx.has('rds') && !ctx.matches(/free tier|db\.t[23]\.micro/i)) {
        out.push(finding({
          severity: 'high',
          title: 'Beginner using RDS without confirming Free Tier instance type',
          body: 'RDS Free Tier is 750 hours/month of db.t2.micro or db.t3.micro for 12 months. Anything else (db.m5, db.r5) bills immediately. Single-AZ only — Multi-AZ doubles the hours so you exhaust the tier in 15 days.',
          fix: 'Use db.t3.micro single-AZ for learning. Set a $5 Billing Alert before deploying anything.',
          docs: 'https://aws.amazon.com/rds/free/',
          ruleId: 'COST-FREETIER-RDS-001',
        }));
      }

      if (ctx.has('ec2') && !ctx.matches(/t[23]\.micro|free tier/i)) {
        out.push(finding({
          severity: 'high',
          title: 'Beginner using EC2 without confirming Free Tier instance type',
          body: 'EC2 Free Tier is 750 hours/month of t2.micro or t3.micro for 12 months. Larger instances bill from minute 1. One forgotten m5.large running 24/7 = ~$70/mo.',
          fix: 'Use t3.micro for learning. Set auto-shutdown via Lambda or Instance Scheduler. Tag every instance with "ttl-days" so you can audit later.',
          docs: 'https://aws.amazon.com/free/',
          ruleId: 'COST-FREETIER-EC2-001',
        }));
      }
    }

    // ─── Multi-AZ doubles cost ───────────────────────────
    if ((ctx.has('rds') || ctx.has('aurora')) && /multi[- ]?az/i.test(ctx.solutionText) &&
        ctx.isLowTraffic && ctx.budget?.amount && ctx.budget.amount < 50) {
      out.push(finding({
        severity: 'medium',
        title: 'Multi-AZ RDS may exceed stated budget for low-traffic dev workload',
        body: 'Multi-AZ doubles your RDS bill (you pay for the standby). If this is dev/test/staging, single-AZ is fine. Reserve Multi-AZ for production where downtime costs > infrastructure.',
        fix: 'Multi-AZ for prod only. For non-prod use single-AZ + frequent snapshots.',
        docs: 'https://aws.amazon.com/rds/pricing/',
        ruleId: 'COST-MULTIAZ-001',
      }));
    }

    // ─── NAT Gateway hourly + data ────────────────────
    if (ctx.has('vpc') && /nat[- ]?gateway/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'NAT Gateway: $32/mo per AZ + $0.045/GB processed',
        body: 'NAT Gateway is one of the most underestimated AWS costs. A single NAT in 1 AZ is ~$32/mo just for being there. Add data processing and surprise bills mount fast.',
        fix: 'For VPC-attached compute that ONLY needs AWS APIs (S3, DDB, SNS, SQS), use VPC Endpoints — free. Only use NAT for outbound internet access (e.g. third-party API calls).',
        docs: 'https://aws.amazon.com/vpc/pricing/',
        ruleId: 'COST-NAT-001',
      }));
    }

    // ─── Untracked storage classes ────────────────────
    if (ctx.has('s3') && !/lifecycle|storage class|glacier|intelligent[- ]?tiering/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'S3 without lifecycle policy — old objects on Standard storage forever',
        body: 'S3 Standard is the most expensive class. Logs, backups, "we might need this later" data should tier down to IA/Glacier after 30/90/180 days. A 100 GB bucket with no lifecycle = $2.30/mo; with Glacier Deep Archive = $0.10/mo.',
          fix: 'Add a lifecycle policy: transition to STANDARD_IA after 30 days, GLACIER after 90 days, expire access logs after 365 days. Use Intelligent-Tiering if access pattern is unpredictable.',
        docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html',
        ruleId: 'COST-S3-LIFECYCLE-001',
      }));
    }

    // ─── Lambda timeout / memory waste ────────────────
    if (ctx.has('lambda') && /memory_size|MemorySize/i.test(ctx.solutionText)) {
      const memMatch = ctx.solutionText.match(/memory_?size[\s:=]+(\d+)/i);
      if (memMatch && parseInt(memMatch[1]) > 1024) {
        out.push(finding({
          severity: 'low',
          title: 'Lambda allocated >1 GB memory — verify with Compute Optimizer',
          body: 'Lambda price is per ms × memory. 3 GB Lambda running 100ms costs the same as a 1 GB Lambda running 300ms. Most workloads don\'t need >1 GB.',
          fix: 'Use AWS Compute Optimizer to find the right memory size. Or use Lambda Power Tuning (open source tool) — set memory based on the cost/perf curve.',
          docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html',
          ruleId: 'COST-LAMBDA-MEM-001',
        }));
      }
    }

    // ─── Missing budget alert ──────────────────────
    if (ctx.isProduction && !ctx.metadata?.setupChecklist?.['billing-alerts']?.done) {
      out.push(finding({
        severity: 'high',
        title: 'Production workload without billing alerts confirmed in AC-01',
        body: 'Every AWS bill horror story starts with "I forgot to set an alarm". Billing alerts via CloudWatch + SNS catch the runaway Lambda, the misconfigured cron, the data transfer surprise.',
        fix: 'Complete the Billing Alerts item in AWS Account Manager → Setup Documentation. Set thresholds at $5, $10, $25 (or your project budget × 0.5, 0.75, 1.0).',
        docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html',
        ruleId: 'COST-ALERTS-001',
      }));
    }

    return out;
  },
};
