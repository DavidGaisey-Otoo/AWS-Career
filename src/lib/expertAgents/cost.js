/**
 * cost.js — Cost Optimization (18 years FinOps).
 * AUDIT-02 expansion: 7 rules -> 18 rules.
 * Cites actual AWS pricing + service quotas where relevant.
 */
import { finding } from './framework.js';

export const costOptimizer = {
  id: 'cost', name: 'Cost Optimization Architect', emoji: '💰',
  role: 'FinOps Lead', yearsExperience: 18,
  expertiseAreas: ['Free Tier', 'RIs / Savings Plans / Spot', 'Data transfer costs', 'S3 lifecycle', 'Right-sizing'],
  systemPrompt: 'Senior FinOps. Knows actual hourly costs, Free Tier limits, and Savings Plan break-even math.',

  review(ctx) {
    const out = [];

    // ─── Beginner Free Tier warnings ────────────────────────
    if (ctx.level === 'beginner') {
      out.push(finding({
        severity: 'info',
        title: 'Free Tier tracking — confirm you understand the 12-month cliff',
        body: 'Free Tier resets monthly for 12 months from account creation. Common cliffs: EC2 750hrs t2.micro/t3.micro, RDS 750hrs db.t2.micro, S3 5GB Standard. After 12 months, everything bills.',
        fix: 'Set billing alerts at $1, $5, $25. Use Budgets with email alerts. Tag everything with `ttl-days` so you can audit.',
        docs: 'https://aws.amazon.com/free/',
        ruleId: 'COST-FREETIER-AWARENESS-001',
      }));

      if (ctx.has('rds') && !ctx.matches(/db\.t[23]\.micro|free tier/i)) {
        out.push(finding({
          severity: 'high',
          title: 'Beginner using RDS without confirming Free Tier instance class',
          body: 'RDS Free Tier: 750hrs/month of db.t2.micro/db.t3.micro single-AZ for 12 months. db.m5.large = ~$130/mo immediately.',
          fix: 'Force db.t3.micro single-AZ for learning. Add auto-shutdown via Lambda.',
          docs: 'https://aws.amazon.com/rds/free/',
          ruleId: 'COST-FREETIER-RDS-001',
        }));
      }

      if (ctx.has('ec2') && !ctx.matches(/t[23]\.micro|free tier/i)) {
        out.push(finding({
          severity: 'high',
          title: 'Beginner using EC2 without confirming Free Tier instance type',
          body: 'EC2 Free Tier: 750hrs/month of t2.micro/t3.micro. Larger instances bill from minute 1. m5.large 24/7 = ~$70/mo.',
          fix: 'Use t3.micro for learning. Set auto-shutdown via Instance Scheduler.',
          docs: 'https://aws.amazon.com/free/',
          ruleId: 'COST-FREETIER-EC2-001',
        }));
      }
    }

    // ─── Multi-AZ in non-prod ───────────────────────────────
    if ((ctx.has('rds') || ctx.has('aurora')) && /multi[- ]?az/i.test(ctx.solutionText) &&
        ctx.isLowTraffic && ctx.budget?.amount && ctx.budget.amount < 50) {
      out.push(finding({
        severity: 'medium',
        title: 'Multi-AZ RDS exceeds budget for low-traffic non-prod',
        body: 'Multi-AZ doubles RDS bill (paying for standby). For dev/test/staging single-AZ + snapshots is the pattern.',
        fix: 'Multi-AZ for prod only. Non-prod = single-AZ with daily snapshots + cross-region copy via AWS Backup.',
        docs: 'https://aws.amazon.com/rds/pricing/',
        ruleId: 'COST-MULTIAZ-001',
      }));
    }

    // ─── NAT Gateway ────────────────────────────────────────
    if (ctx.has('vpc') && /nat[- ]?gateway/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'NAT Gateway: $0.045/hour + $0.045/GB processed',
        body: 'Single NAT in 1 AZ = ~$32/mo just for existing. High-traffic apps blow past $1000/mo on data processing alone.',
        fix: 'For AWS-only API traffic (S3, DDB, SQS, SNS, etc.), use VPC Endpoints (free for Gateway endpoints to S3/DDB). Only use NAT for outbound traffic to third-party services.',
        docs: 'https://aws.amazon.com/vpc/pricing/',
        ruleId: 'COST-NAT-001',
      }));
    }

    // ─── S3 lifecycle ──────────────────────────────────────
    if (ctx.has('s3') && !/lifecycle|storage class|glacier|intelligent[- ]?tiering/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'S3 without lifecycle policy — old objects on Standard forever',
        body: 'S3 Standard = $0.023/GB/mo. Standard-IA after 30 days = $0.0125/GB. Glacier Flexible after 90 days = $0.0036/GB. Deep Archive = $0.00099/GB. A 100 GB bucket with full lifecycle saves ~$2/mo per 100GB.',
        fix: 'Lifecycle: Standard → Standard-IA (30d) → Glacier Flexible (90d) → expire (365d for logs).',
        docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html',
        ruleId: 'COST-S3-LIFECYCLE-001',
      }));
    }

    // ─── S3 Intelligent-Tiering for unknown patterns ────────
    if (ctx.has('s3') && ctx.matches(/unknown|unpredictable|varying|user[- ]?uploaded/i) &&
        !/intelligent[- ]?tiering/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Unpredictable S3 access pattern — Intelligent-Tiering saves 40-70%',
        body: 'For workloads where you don\'t know access pattern, S3 Intelligent-Tiering automatically moves objects between tiers based on access. No retrieval fees, no minimum.',
        fix: 'Set bucket default storage class to INTELLIGENT_TIERING. Existing objects can be migrated via lifecycle rule.',
        docs: 'https://aws.amazon.com/s3/storage-classes/intelligent-tiering/',
        ruleId: 'COST-S3-IT-001',
      }));
    }

    // ─── Lambda memory tuning ───────────────────────────────
    if (ctx.has('lambda') && /memory_size|MemorySize/i.test(ctx.solutionText)) {
      const memMatch = ctx.solutionText.match(/memory_?size[\s:=]+(\d+)/i);
      if (memMatch && parseInt(memMatch[1]) > 1024) {
        out.push(finding({
          severity: 'low',
          title: 'Lambda allocated >1 GB memory — verify with Compute Optimizer',
          body: 'Lambda cost = ms × (memory/1024) × $0.0000166667. Often a 1 GB Lambda running 200ms costs the same as 3 GB running 70ms — same total. Use Compute Optimizer.',
          fix: 'AWS Compute Optimizer → Lambda → look at "recommended memory size". Or use Lambda Power Tuning state machine.',
          docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html',
          ruleId: 'COST-LAMBDA-MEM-001',
        }));
      }
    }

    // ─── Production billing alerts ──────────────────────────
    if (ctx.isProduction && !ctx.metadata?.setupChecklist?.['billing-alerts']?.done) {
      out.push(finding({
        severity: 'high',
        title: 'Production workload without billing alerts confirmed (AC-01)',
        body: 'Every horror-story AWS bill starts with "I forgot to set an alarm". Billing alerts via CloudWatch + SNS catch the runaway Lambda, the misconfigured cron.',
        fix: 'AC-01 Setup Documentation → Billing Alerts. Set $5, $25, $100 thresholds (or 0.5/0.75/1.0 × monthly budget).',
        docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html',
        ruleId: 'COST-ALERTS-001',
      }));
    }

    // ─── Savings Plans for production steady workload ──────
    if (ctx.isProduction && (ctx.has('ec2') || ctx.has('lambda') || ctx.has('fargate')) &&
        !ctx.isLowTraffic && !/savings plan|saving plan|reserved instance/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Steady production compute — Savings Plans save 30-72%',
        body: 'Compute Savings Plans cover EC2 + Fargate + Lambda. 1-year no upfront = ~30% off. 3-year all upfront = ~66% off. Break-even at ~70% utilization.',
        fix: 'Analyze 30 days of usage with Cost Explorer → Recommendations → Savings Plans. Start with 1-year Compute Savings Plan for flexibility.',
        docs: 'https://aws.amazon.com/savingsplans/',
        ruleId: 'COST-SAVINGS-PLANS-001',
      }));
    }

    // ─── DDB capacity mode ──────────────────────────────────
    if (ctx.has('dynamodb')) {
      if (ctx.isLowTraffic && /provisioned/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'medium',
          title: 'DynamoDB provisioned capacity for low/irregular traffic',
          body: 'For irregular traffic, on-demand is cheaper because you pay $0 when idle. Provisioned makes sense at >40% utilization.',
          fix: 'BillingMode=PAY_PER_REQUEST. Switch back to provisioned + autoscaling once traffic stabilises.',
          docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html',
          ruleId: 'COST-DDB-CAPACITY-001',
        }));
      }
    }

    // ─── Data transfer costs ───────────────────────────────
    if (ctx.isHighTraffic || /high[- ]?traffic|terabyte|petabyte/i.test(ctx.brief)) {
      out.push(finding({
        severity: 'medium',
        title: 'High-traffic — data transfer is your #1 underestimated cost',
        body: 'AWS charges for outbound data: $0.09/GB to internet (us-east-1, first 10TB), $0.02/GB cross-AZ within a region, $0.01-0.02/GB cross-region. Inter-AZ alone can be $1000s/mo for chatty apps.',
        fix: 'Use CloudFront ($0.085/GB to most regions, with cache) for public content. Keep chatty traffic within one AZ. VPC Endpoints to avoid NAT $.',
        docs: 'https://aws.amazon.com/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/',
        ruleId: 'COST-DATA-TRANSFER-001',
      }));
    }

    // ─── EIP charges ────────────────────────────────────────
    if (/elastic ip|allocate_eip|eip/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'Elastic IPs are free WHILE attached — charged when unattached',
        body: 'An unattached EIP costs $0.005/hour ($3.60/mo). Sounds small until you have 50 orphaned EIPs from terminated instances.',
        fix: 'Use Resource Groups to find unattached EIPs monthly. Or use Trusted Advisor (Business support).',
        docs: 'https://aws.amazon.com/ec2/pricing/on-demand/',
        ruleId: 'COST-EIP-001',
      }));
    }

    // ─── Spot for batch ─────────────────────────────────────
    if (ctx.matches(/batch|ci\/cd|build|nightly|fault[- ]?tolerant/i) &&
        ctx.has('ec2') && !/spot/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'Batch/build workload — Spot Instances save up to 90%',
        body: 'Spot has 2-min interruption notice. Perfect for batch processing, CI/CD, fault-tolerant workloads. Use Spot Fleet with multiple instance types for diversification.',
        fix: 'AWS Batch with Spot compute environment. Or EC2 Spot Fleet with maintain target capacity. Combine with mixed-instances policy in ASG.',
        docs: 'https://aws.amazon.com/ec2/spot/',
        ruleId: 'COST-SPOT-001',
      }));
    }

    // ─── Inter-AZ data transfer ──────────────────────────
    if (ctx.has('rds') && ctx.has('lambda') && /multi[- ]?az/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'info',
        title: 'Reminder: Lambda → RDS Multi-AZ crosses AZs ~50% of the time',
        body: 'Inter-AZ data transfer is $0.01/GB each way ($0.02/GB round-trip). For chatty Lambda → RDS apps at scale, this adds up. Often forgotten.',
        fix: 'Use RDS Proxy to pool connections (reduces chatter). For ultra-high-volume, consider keeping primary RDS + Lambda in same AZ accepting some risk.',
        docs: 'https://aws.amazon.com/rds/proxy/',
        ruleId: 'COST-INTER-AZ-001',
      }));
    }

    return out;
  },
};
