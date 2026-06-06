/**
 * blastRadius.js — Cost Blast-Radius Estimator
 *
 * Flags resources that often trigger surprise bills. Doesn't replace
 * the cost estimator — flags PATTERNS that historically cause the
 * "$50k surprise bill" stories.
 */

import { finding } from './framework.js';

export const costBlastRadiusEstimator = {
  id: 'blastRadius',
  name: 'Marcus Chen',
  role: 'Cost Blast-Radius Estimator',
  expertiseAreas: ['AWS cost surprises', 'FinOps', 'Bill protection', 'Free Tier traps'],
  yearsExperience: 14,
  systemPrompt: 'You are a senior FinOps engineer with 14 years experience auditing AWS deploys for cost-spike risks. Flag patterns that historically cause "surprise bill" incidents.',

  review(ctx) {
    const findings = [];
    const { template, lineCount } = ctx;

    if (!template || template.trim().length === 0) return findings;

    // COST-NAT-NO-ENDPOINTS-001 — NAT Gateway with VPC but no VPC endpoints = data transfer fees
    if (/AWS::EC2::NatGateway|aws_nat_gateway/i.test(template) &&
        !/AWS::EC2::VPCEndpoint|aws_vpc_endpoint/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'COST-NAT-NO-ENDPOINTS-001',
        title: 'NAT Gateway without any VPC Endpoints',
        body: 'NAT Gateway charges $0.045 per GB processed. Every S3/DDB call from a private subnet goes through it. Adding VPC Endpoints for S3/DynamoDB is free and cuts NAT traffic 50-80%.',
        fix: 'Add `AWS::EC2::VPCEndpoint` (Gateway) for S3 and DynamoDB at minimum.',
      }));
    }

    // COST-NAT-PER-AZ-001 — multiple NAT Gateways across AZs (1 per AZ at $32/mo each)
    const natMatches = (template.match(/AWS::EC2::NatGateway|aws_nat_gateway/gi) || []).length;
    if (natMatches >= 3) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-NAT-MULTI-AZ-001',
        title: `${natMatches} NAT Gateways detected`,
        body: `Each NAT Gateway is ~$32/month base + data charges. ${natMatches} = ~$${natMatches * 32}/month minimum, regardless of traffic.`,
        fix: 'For dev/staging, use 1 NAT Gateway. For prod, 1 per AZ is correct for HA — confirm the cost is intentional.',
      }));
    }

    // COST-GPU-INSTANCE-001 — GPU/Inferentia instances
    const gpuRx = /InstanceType\s*[:=]\s*['"]?(p2|p3|p3dn|p4|p4d|p5|g4ad|g4dn|g5|g5g|trn1|inf1|inf2|dl1|x2gd|x2idn|x2iezn|u-3tb1|u-6tb1|u-9tb1|u-12tb1|u-18tb1|u-24tb1)/i;
    if (gpuRx.test(template)) {
      const m = template.match(gpuRx);
      findings.push(finding({
        severity: 'high',
        ruleId: 'COST-GPU-INSTANCE-001',
        title: `Expensive instance type detected: ${m ? m[1] : '?'}`,
        body: 'GPU / massive memory instance types run $3-$50+/hour. Even one left running overnight by accident = $50-$1,000+ surprise.',
        fix: 'Confirm this is intentional. Add an AWS Budget alert at 25% / 50% / 90% of monthly forecast. Set up Lambda auto-stop after N hours of idle.',
      }));
    }

    // COST-CROSS-REGION-001 — cross-region replication (S3 CRR / Aurora Global / DDB Global Tables)
    if (/ReplicationConfiguration|aws_s3_bucket_replication/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-S3-CRR-001',
        title: 'S3 cross-region replication configured',
        body: 'S3 CRR charges $0.02/GB for inter-region transfer + destination storage costs. Sustained writes can add $500+/month for moderate workloads.',
        fix: 'Confirm necessity. For DR purposes, consider Backup or PITR instead.',
      }));
    }
    if (/AWS::DynamoDB::GlobalTable|aws_dynamodb_global_table/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-DDB-GLOBAL-001',
        title: 'DynamoDB Global Tables configured',
        body: 'Global Tables 2x your write capacity per region + inter-region replication charges. Easy to overspend.',
        fix: 'Use On-Demand capacity (not Provisioned) for unpredictable workloads. Monitor CloudWatch ConsumedWriteCapacityUnits per region.',
      }));
    }

    // COST-DDB-PROVISIONED-001 — DynamoDB with high provisioned capacity
    const ddbProvisionedRx = /BillingMode\s*[:=]\s*['"]?PROVISIONED|"BillingMode"\s*:\s*"PROVISIONED"/i;
    if (ddbProvisionedRx.test(template)) {
      const wcuRx = /WriteCapacityUnits\s*[:=]\s*['"]?(\d+)/i;
      const rcuRx = /ReadCapacityUnits\s*[:=]\s*['"]?(\d+)/i;
      const wcu = template.match(wcuRx);
      const rcu = template.match(rcuRx);
      const wcuNum = wcu ? parseInt(wcu[1], 10) : 0;
      const rcuNum = rcu ? parseInt(rcu[1], 10) : 0;
      if (wcuNum >= 100 || rcuNum >= 200) {
        findings.push(finding({
          severity: 'medium',
          ruleId: 'COST-DDB-HIGH-CAPACITY-001',
          title: `DynamoDB high provisioned capacity (WCU=${wcuNum}, RCU=${rcuNum})`,
          body: `Provisioned ${wcuNum} WCU + ${rcuNum} RCU = ~$${Math.round(wcuNum * 0.65 + rcuNum * 0.13)}/month minimum, even if idle.`,
          fix: 'Consider On-Demand mode for unpredictable load. Or use auto-scaling with realistic min/max.',
        }));
      }
    }

    // COST-CLOUDFRONT-NO-CACHE-001 — CloudFront with low cache TTL
    if (/AWS::CloudFront::Distribution/i.test(template) &&
        /DefaultTTL\s*[:=]\s*['"]?(0|[1-5]?[0-9])\b/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-CLOUDFRONT-NO-CACHE-001',
        title: 'CloudFront with very low DefaultTTL',
        body: 'TTL < 60s means most requests hit your origin. You pay for both CloudFront AND your origin bandwidth, with no caching benefit.',
        fix: 'Raise DefaultTTL to 300s+ where possible. Use cache invalidation API for must-be-fresh assets.',
      }));
    }

    // COST-LOG-GROUP-NO-RETENTION-001 — CloudWatch log groups with no retention
    if (/AWS::Logs::LogGroup/i.test(template) && !/RetentionInDays/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-LOG-NO-RETENTION-001',
        title: 'CloudWatch LogGroup without RetentionInDays',
        body: 'CloudWatch Logs default to never expire. Storage charges compound forever. A chatty Lambda can accumulate $100s/month.',
        fix: 'Set `RetentionInDays: 30` (or 7 for dev). For long-term storage, ship to S3.',
      }));
    }

    // COST-EIP-UNATTACHED-001 — Elastic IPs (charged when not attached)
    if (/AWS::EC2::EIP/i.test(template) && !/AWS::EC2::EIPAssociation/i.test(template)) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'COST-EIP-UNATTACHED-001',
        title: 'Elastic IP allocated but no Association resource detected',
        body: 'Unattached Elastic IPs cost $0.005/hr (~$3.60/month each) — small but accumulates over years and stacks.',
        fix: 'Add `AWS::EC2::EIPAssociation` to attach to an instance/NAT, or remove the EIP.',
      }));
    }

    // COST-RDS-MULTI-AZ-DEV-001 — Multi-AZ RDS in obviously-dev environments
    const isDev = /\b(dev|development|sandbox|test|staging)\b/i.test(template);
    if (isDev && /MultiAZ\s*[:=]\s*true|"MultiAZ"\s*:\s*true/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-RDS-MULTI-AZ-DEV-001',
        title: 'Multi-AZ RDS in a dev/staging template',
        body: 'Multi-AZ doubles the RDS bill. Generally unnecessary outside prod.',
        fix: 'Disable Multi-AZ for non-prod. Reserve it for prod only.',
      }));
    }

    // COST-NO-BUDGET-001 — large template with no AWS::Budgets::Budget
    if (lineCount > 100 && !/AWS::Budgets::Budget|aws_budgets_budget/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'COST-NO-BUDGET-001',
        title: 'Large template with no AWS Budgets resource',
        body: 'Without a Budget, you have no automatic alerting if monthly spend exceeds expectations.',
        fix: 'Add an `AWS::Budgets::Budget` resource: $X/month with email alerts at 50% / 80% / 100%.',
      }));
    }

    return findings;
  },
};
