/**
 * architecture.js — Architecture Patterns Expert (25 years).
 * NEW in AUDIT-02. Catches pattern-level decisions: multi-region strategy,
 * monolith vs microservices, sync vs async, hub-and-spoke vs mesh.
 */
import { finding } from './framework.js';

export const architecturePatternsExpert = {
  id: 'architecture', name: 'Architecture Patterns Expert', emoji: '🏗️',
  role: 'Principal Solutions Architect', yearsExperience: 25,
  expertiseAreas: [
    'Multi-region patterns (active-active, warm standby, pilot light)',
    'Microservices vs monolith trade-offs',
    'Event-driven vs request-response',
    'Hub-and-spoke (Transit Gateway) vs full-mesh',
    'CQRS + Event Sourcing',
    'Twelve-factor app principles',
  ],
  systemPrompt: 'Principal architect. Picks the right pattern for the constraints. Cites Well-Architected Framework + AWS reference architectures.',

  review(ctx) {
    const out = [];

    // ─── Multi-region without proper pattern ──────────
    if (/multi[- ]?region|cross[- ]?region|multiple regions/i.test(ctx.brief) &&
        !/route 53|failover routing|aurora global|global table/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'high',
        title: 'Multi-region mentioned — strategy pattern not explicit',
        body: 'Multi-region without a defined pattern (active-active, warm standby, pilot light) is hand-waving. RTO/RPO determine the tier: Active-active = secs RTO/RPO but costs ~2x. Warm standby = mins RTO. Pilot light = hours RTO.',
        fix: 'Explicitly pick a DR tier and document RTO/RPO target. Define routing strategy (Route 53 failover vs latency-based vs Global Accelerator).',
        docs: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html',
        ruleId: 'ARCH-MULTIREGION-001',
      }));
    }

    // ─── Aurora multi-region ─────────────────────────
    if ((ctx.has('aurora') || ctx.has('rds')) &&
        /multi[- ]?region/i.test(ctx.brief) && !/global database|aurora global/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'high',
        title: 'Multi-region Aurora — use Aurora Global Database',
        body: 'Aurora Global Database gives <1 second cross-region replication lag, secondary region as full read-only or fast failover (~1 min RTO). Vastly simpler than DIY cross-region replicas.',
        fix: 'Aurora cluster in primary region + Global Cluster secondary in DR region. Failover via managed planned failover or unplanned promotion.',
        docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html',
        ruleId: 'DB-AURORA-GLOBAL-001',
      }));
    }

    // ─── DDB Global Tables for multi-region ──────────
    if (ctx.has('dynamodb') && /multi[- ]?region/i.test(ctx.brief) && !/global table/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Multi-region DynamoDB — use Global Tables',
        body: 'DDB Global Tables provide fully managed multi-region multi-master replication. Sub-second propagation, automatic conflict resolution (last-writer-wins).',
        fix: 'Convert to Global Table. All replica regions become eventually consistent active-active stores.',
        docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html',
        ruleId: 'ARCH-DDB-GLOBAL-001',
      }));
    }

    // ─── S3 cross-region replication ─────────────────
    if (ctx.has('s3') && /multi[- ]?region/i.test(ctx.brief) && !/cross[- ]?region replication|crr|replication rule/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Multi-region S3 — configure Cross-Region Replication (CRR)',
        body: 'For active-active or DR, S3 objects need to be in both regions. CRR replicates within ~15 min by default; Replication Time Control (RTC) SLA = 99.99% in <15 min.',
        fix: 'Replication Configuration with destination bucket in secondary region. Enable Replication Time Control for SLA-bound use cases.',
        docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html',
        ruleId: 'STORAGE-S3-CRR-001',
      }));
    }

    // ─── Hub-and-spoke pattern ────────────────────────
    if ((/multiple (vpcs|accounts)|hub|spoke|hybrid|on[- ]?prem|datacenter/i.test(ctx.brief)) &&
        !/transit gateway|tgw/i.test(ctx.solutionText) && !/peering/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'high',
        title: 'Multi-VPC / hybrid scenario — Transit Gateway is the canonical hub',
        body: 'Connecting 3+ VPCs (or VPCs + on-prem) with VPC Peering creates a full mesh (n×(n-1)/2 connections). At 5 VPCs that\'s 10 peerings — unmanageable. TGW reduces it to n connections.',
        fix: 'Transit Gateway as hub. Attach VPCs + Direct Connect Gateway + Site-to-Site VPN. Routing centralized in TGW route tables.',
        docs: 'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html',
        ruleId: 'NET-TGW-001',
      }));
    }

    // ─── Direct Connect for sustained bandwidth ───────
    if (/10\s*gbps|sustained bandwidth|low[- ]?latency on[- ]?prem|datacenter/i.test(ctx.brief) &&
        !/direct connect|dx/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'high',
        title: 'Sustained high bandwidth on-prem — use Direct Connect, not just VPN',
        body: 'Site-to-Site VPN caps at ~1.25 Gbps per tunnel (without ECMP). For 10 Gbps sustained, Direct Connect (dedicated 1/10/100 Gbps) is the pattern.',
        fix: 'Direct Connect connection + Direct Connect Gateway. Add Site-to-Site VPN as backup over the public internet.',
        docs: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html',
        ruleId: 'NET-DIRECT-CONNECT-001',
      }));
    }

    // ─── Route 53 Resolver for two-way DNS ────────────
    if (/on[- ]?prem|datacenter/i.test(ctx.brief) && /dns/i.test(ctx.brief) &&
        !/route 53 resolver|inbound endpoint|outbound endpoint/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Two-way DNS resolution on-prem ↔ AWS — Route 53 Resolver endpoints',
        body: 'Need inbound endpoint so on-prem can resolve AWS Route 53 private hosted zones, outbound endpoint so AWS resources can forward queries to on-prem DNS.',
        fix: 'Route 53 Resolver inbound + outbound endpoints in the VPC. Conditional forwarding rules.',
        docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html',
        ruleId: 'NET-DNS-RESOLVER-001',
      }));
    }

    // ─── Microservices when overkill ──────────────────
    if (/microservices/i.test(ctx.brief) && ctx.services?.length >= 8 &&
        ctx.userScale && ctx.userScale < 1000 && ctx.budget?.amount && ctx.budget.amount < 1000) {
      out.push(finding({
        severity: 'low',
        title: 'Microservices for low-traffic, low-budget project — may be over-engineered',
        body: 'Microservices add operational complexity (service mesh, observability, deployment pipelines). For <1000 users and <$1K budget, modular monolith on App Runner or Beanstalk is often the better trade-off.',
        fix: 'Start with a modular monolith. Extract microservices when bottlenecks are clear. Don\'t Build Distributed Systems Until You Have To.',
        docs: 'https://martinfowler.com/bliki/MonolithFirst.html',
        ruleId: 'ARCH-MICRO-001',
      }));
    }

    // ─── Sync API when async would be better ─────────
    if (ctx.has('apigateway') && /long[- ]?running|batch|video|ml inference|process file/i.test(ctx.brief) &&
        !/sqs|sns|step function|async/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Sync API for long-running task — clients time out, server scales badly',
        body: 'API Gateway has 30-second integration timeout. For tasks >29s, sync pattern fails. The right pattern is request-acceptance + async processing + status polling or webhook callback.',
        fix: 'API Gateway → SQS → Lambda/ECS worker. Client polls GET /status/{id} or receives SNS webhook on completion. Step Functions for multi-step workflows.',
        docs: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html',
        ruleId: 'ARCH-ASYNC-001',
      }));
    }

    return out;
  },
};
