/**
 * Proposal template library — 12 proven templates by AWS project type.
 *
 * Each template ships with a structured body so the proposal builder can
 * generate a personalised draft by interpolating {placeholders} with
 * extracted job details and the user's profile.
 *
 * Placeholders the engine knows how to fill:
 *   {client_name} {project_title} {pain_point} {primary_service}
 *   {your_first_name} {years_experience} {top_cert} {turnaround}
 *   {budget} {currency} {nearest_portfolio} {timezone_overlap}
 */

const t = (id, opts) => ({ id, ...opts });

export const PROPOSAL_TEMPLATES = [
  t('infra-setup', {
    type: 'AWS infrastructure setup',
    icon: '🏗',
    rating: 5,
    description: 'For greenfield account setup, landing zones, and VPC design.',
    services: ['vpc', 'iam', 'cloudformation', 's3'],
    hook:
      'Hi {client_name} — landing zones are something I do almost every week. The way you described "{pain_point}" tells me you need a setup that scales without you having to redesign it 6 months from now.',
    experience:
      'I\'ve set up production AWS environments across 8 projects, including a multi-account org for a fintech with strict compliance + a Transit Gateway hub-and-spoke for a 6-VPC enterprise. Every one of them ships with IaC (Terraform or CDK) so future you can reproduce it in minutes.',
    approach: [
      'Day 1: Discovery call to confirm regulatory scope, account topology, and identity provider.',
      'Day 2-3: CIDR planning + IaC scaffold (VPC, subnets, route tables, NAT, IGW, Transit Gateway if needed).',
      'Day 4-5: IAM Identity Center setup, SCP guardrails, baseline security alarms.',
      'Day 6: Walkthrough call + documentation + handoff runbook.',
    ],
    fit:
      'I treat IaC and documentation as deliverables, not afterthoughts. You won\'t have a "black box" you can\'t change.',
    cta:
      'Could we jump on a 15-minute call this {turnaround}? I\'ll come with two questions about your environment and one early observation about your CIDR plan.',
  }),

  t('migration', {
    type: 'Cloud migration project',
    icon: '🚚',
    rating: 5,
    description: 'Lift-and-shift or replatform migrations to AWS.',
    services: ['mgn', 'dms', 'ec2', 'rds'],
    hook:
      'Hi {client_name} — migrations live or die on the cutover plan, not the pretty diagram. Your post made me think your biggest risk is "{pain_point}". Let me show you how I\'d de-risk it.',
    experience:
      'Last migration I led was 32 on-prem workloads → AWS in 9 weeks with zero unplanned downtime. We used MGN for the lift-and-shift cohort and DMS for the databases, kept dual-write going during cutover, then rolled traffic via Route 53 weighted routing.',
    approach: [
      'Week 1: Application Discovery + dependency mapping. Pick the 6 R for each workload.',
      'Week 2-3: Stand up landing zone if it doesn\'t exist + replication agents.',
      'Week 4+: Wave-based cutovers, each wave with its own runbook + rollback path.',
    ],
    fit:
      'I size each migration wave to fit your team\'s on-call capacity. We do not do "big bang" cutovers.',
    cta:
      'Ready to chat about your application inventory? I can be on a call within {turnaround} and I\'ll bring a wave-planning template you can keep either way.',
  }),

  t('serverless', {
    type: 'Serverless application',
    icon: '⚡',
    rating: 5,
    description: 'Lambda + API Gateway + DynamoDB CRUD or event-driven.',
    services: ['lambda', 'apigateway', 'dynamodb', 'iam'],
    hook:
      'Hi {client_name} — building serverless is my favourite kind of work, and "{pain_point}" is exactly the kind of problem it eats for breakfast.',
    experience:
      'I\'ve shipped 6 serverless backends in production. The most recent: a multi-tenant SaaS API on Lambda + API Gateway + DynamoDB serving 4M+ requests/month at under $40 in AWS bill.',
    approach: [
      'Define the API contract first (OpenAPI). No code until both sides agree.',
      'DynamoDB single-table or multi-table — sized to your access patterns.',
      'Lambda per route, IAM scoped to least-privilege, X-Ray traces on day one.',
      'CDK or SAM template you own from day one.',
    ],
    fit:
      'Most freelancers will hand you 4 Lambdas and a working API. I hand you the deploy pipeline, alarms, and an explicit cost model too.',
    cta:
      'Want a 20-min call this {turnaround}? I\'ll bring a sketch of the API + 3 sharpening questions on auth.',
  }),

  t('network', {
    type: 'Network design',
    icon: '🌐',
    rating: 5,
    description: 'VPC architecture, hybrid connectivity, Transit Gateway.',
    services: ['vpc', 'tgw', 'dx', 'vpn', 'route53'],
    hook:
      'Hi {client_name} — networking is my deep specialty (CCNA background + AWS Advanced Networking experience). "{pain_point}" jumped off your post because that\'s usually a routing or asymmetric-traffic problem.',
    experience:
      'I\'ve designed a hub-and-spoke Transit Gateway for a 9-account enterprise + a hybrid DX + Site-to-Site VPN failover for a logistics company. Both shipped with Reachability Analyzer + Flow Logs from day one.',
    approach: [
      'Discovery: CIDR ranges, on-prem prefixes, BGP ASNs.',
      'Design doc: hub-and-spoke topology + route table strategy + security tiers.',
      'Build: IaC for VPCs, TGW, route tables, SGs/NACLs, NAT.',
      'Verify: Reachability Analyzer + iperf + intentional failover test.',
    ],
    fit:
      'You won\'t find many freelancers who can read a BGP table AND write Terraform. I do both.',
    cta:
      'Have 15 mins this {turnaround}? I\'ll come with two questions about your current topology + an instinct about the route propagation.',
  }),

  t('security-audit', {
    type: 'Security audit',
    icon: '🛡',
    rating: 5,
    description: 'Defense-in-depth review, IAM cleanup, compliance baseline.',
    services: ['iam', 'guardduty', 'securityhub', 'cloudtrail'],
    hook:
      'Hi {client_name} — security audits are 80% knowing where to look. From "{pain_point}", I already have a hypothesis: it\'s probably an over-broad IAM policy or a default-public S3 bucket.',
    experience:
      'I\'ve run security audits against 5 production AWS environments. Average findings: 12 high-severity, 30+ medium. Every report comes with a prioritised remediation backlog + IaC patches for the top 5.',
    approach: [
      'Day 1-2: Enable Security Hub + GuardDuty (if off), establish baseline.',
      'Day 3-4: IAM Access Analyzer review, KMS key audit, network exposure scan.',
      'Day 5: Report with severity-ranked findings + IaC patches for the critical ones.',
    ],
    fit:
      'I don\'t just hand you a 40-page PDF. You get the fixed code for the worst 5 issues, ready to deploy.',
    cta:
      'Can we chat for 20 mins this {turnaround}? I\'ll walk you through how I scope an audit and what the deliverables look like.',
  }),

  t('cicd', {
    type: 'DevOps pipeline',
    icon: '🔁',
    rating: 5,
    description: 'CI/CD pipelines on CodePipeline or GitHub Actions.',
    services: ['codepipeline', 'codebuild', 'codedeploy', 'ecr', 'ecs'],
    hook:
      'Hi {client_name} — deploys should be a non-event. If "{pain_point}" is happening, your pipeline is doing too much by hand.',
    experience:
      'I\'ve built pipelines for 7 production stacks: monoliths, microservices on ECS, serverless via SAM, and static sites on S3+CloudFront. Average lead time after my work: under 15 minutes from commit to prod.',
    approach: [
      'Map your current deploy flow + identify manual steps.',
      'Pipeline-as-code (CodePipeline YAML or GitHub Actions workflow) in your repo.',
      'Test gates, manual approval before prod, automated rollback on alarms.',
      'Slack notifications + dashboards so the team sees deploys.',
    ],
    fit:
      'After I leave, your team owns the pipeline because it\'s code in your repo, not magic in my head.',
    cta:
      'A quick 15-min call this {turnaround} to see your current setup? I\'ll come with a pipeline diagram for your stack.',
  }),

  t('cost-opt', {
    type: 'Cost optimization',
    icon: '💰',
    rating: 5,
    description: 'Right-sizing, Savings Plans, lifecycle, network egress.',
    services: ['ec2', 's3', 'cloudwatch', 'cost-explorer'],
    hook:
      'Hi {client_name} — cost optimization is a numbers game with a few high-leverage moves. From "{pain_point}", I\'d bet $1 your top 3 cost items are EC2, NAT/data transfer, and orphaned EBS.',
    experience:
      'My last cost engagement cut a $14k/month bill to $8.2k in 4 weeks — without touching production reliability. The fixes: right-size 22 EC2s, S3 Intelligent-Tiering, kill 4 idle NAT Gateways, commit baseline to Compute Savings Plans.',
    approach: [
      'Day 1-2: Pull last 90 days of CUR + identify top 10 cost lines.',
      'Day 3-5: Rightsize EC2 + RDS via Compute Optimizer + manual review.',
      'Day 6-8: Savings Plan + lifecycle + egress review.',
      'Day 9-10: Documented playbook so future you keeps the savings.',
    ],
    fit:
      'I price this work as a % of savings + a small base fee. You only pay me if I actually save you money.',
    cta:
      'Want a no-obligation 30-min call this {turnaround}? I\'ll bring 3 questions and an instinct about your biggest line item.',
  }),

  t('db-migration', {
    type: 'Database migration',
    icon: '🗄',
    rating: 4,
    description: 'On-prem → RDS, MySQL → Aurora, schema conversion.',
    services: ['rds', 'dms', 'aurora', 'secretsmgr'],
    hook:
      'Hi {client_name} — databases are where migrations earn or lose their reputation. "{pain_point}" tells me you want a cutover plan, not just replication.',
    experience:
      'My last DB migration moved 320 GB of MySQL to Aurora MySQL with under 90 seconds of write downtime via DMS + replica promotion. Validated row-count + smoke tests on every cutover.',
    approach: [
      'Schema survey + Schema Conversion Tool if engines differ.',
      'DMS task: full-load + CDC. Validate row counts.',
      'Cutover plan: a runbook with rollback paths at every step.',
      'Read replica + Multi-AZ for the new prod.',
    ],
    fit:
      'I do the migration WITH your DBAs, not at them. The runbook is co-authored.',
    cta:
      'Free for a 20-min call this {turnaround}? I\'ll bring a sample cutover runbook + 3 questions about your DB.',
  }),

  t('monitoring', {
    type: 'Monitoring + observability setup',
    icon: '📊',
    rating: 4,
    description: 'CloudWatch dashboards, alarms, log strategy, SLOs.',
    services: ['cloudwatch', 'xray', 'sns', 'cloudtrail'],
    hook:
      'Hi {client_name} — "{pain_point}" sounds like an observability gap, not just a noisy alarm problem. Your team is paged but doesn\'t know what to look at.',
    experience:
      'I\'ve built observability stacks for 4 production teams. The pattern: SLIs first, dashboards second, alarms last. The result: 70%+ reduction in pager noise + sub-5-minute MTTD.',
    approach: [
      'Define 4-6 SLIs that reflect customer experience.',
      'Build dashboard-as-code (CDK or JSON).',
      'Composite alarms over single-metric alarms.',
      'Log Insights queries saved + linked from dashboards.',
    ],
    fit:
      'I have a strong opinion: alerts that don\'t require action are noise. I help you delete bad alarms, not add more.',
    cta:
      'A 20-min call this {turnaround}? I\'ll come with two questions and a sample SLI menu.',
  }),

  t('dr', {
    type: 'Disaster recovery',
    icon: '🛟',
    rating: 5,
    description: 'Multi-region DR, RPO/RTO planning, failover drills.',
    services: ['route53', 'rds', 's3', 'cloudfront'],
    hook:
      'Hi {client_name} — "{pain_point}" tells me you\'ve probably got hope-based DR. We can change that without doubling your bill.',
    experience:
      'I designed a Pilot Light DR for a payments company: RPO 5 min, RTO 30 min, ~12% incremental cost. We drilled it quarterly until it worked under stress.',
    approach: [
      'Pick a strategy: Backup / Pilot Light / Warm Standby / Multi-Site.',
      'Set RPO and RTO targets up front. Everything else flows from there.',
      'Replicate: S3 CRR + RDS cross-region replica + Secrets Manager replication.',
      'Failover wiring: Route 53 health checks + low-TTL records.',
      'Tabletop drill at the end. Untested DR is broken DR.',
    ],
    fit:
      'Most "DR setups" never get tested. I will not call this done until we drill it together.',
    cta:
      'Let\'s talk this {turnaround} — 20 mins to set RPO/RTO targets and pick a strategy.',
  }),

  t('container-platform', {
    type: 'Container platform',
    icon: '📦',
    rating: 4,
    description: 'ECS Fargate or EKS for a stack of services.',
    services: ['ecs', 'eks', 'ecr', 'alb'],
    hook:
      'Hi {client_name} — running containers in production is two-thirds platform, one-third application. "{pain_point}" usually means the platform piece needs love.',
    experience:
      'I\'ve set up ECS Fargate clusters for 3 SaaS apps and an EKS platform for a data engineering team. Both with full IaC, blue-green deploys, and cost dashboards.',
    approach: [
      'ECS or EKS? Driven by your team\'s comfort with k8s, not religion.',
      'Cluster + ECR + ALB target groups + service discovery via Cloud Map.',
      'Blue/green via CodeDeploy or Argo Rollouts (EKS).',
      'Cost guardrails: Compute SP + Spot for fault-tolerant services.',
    ],
    fit:
      'I\'ll match the platform to your team, not to my hot take.',
    cta:
      'Want a 20-min call this {turnaround}? I\'ll come with two questions about your current stack.',
  }),

  t('cdn-static', {
    type: 'CDN-fronted static site',
    icon: '🌍',
    rating: 4,
    description: 'S3 + CloudFront + Route 53 + ACM, fast and cheap.',
    services: ['s3', 'cloudfront', 'route53', 'acm'],
    hook:
      'Hi {client_name} — sub-100ms global delivery for under $5/mo is right in my wheelhouse. "{pain_point}" can usually be fixed in 2-3 days with the right stack.',
    experience:
      'I\'ve shipped 12 production static sites on AWS — including a multi-region one with cross-region failover for a non-profit. Lighthouse scores of 95+ on every one.',
    approach: [
      'S3 bucket + Block Public Access (CloudFront OAC instead).',
      'CloudFront distribution + ACM cert in us-east-1.',
      'Route 53 alias + WAF rate-based rule for bot protection.',
      'Deploy pipeline: GitHub Actions → S3 sync + cache invalidation.',
    ],
    fit:
      'Cheap-but-good is a real product strategy. I love these projects.',
    cta:
      'A quick 10-min call this {turnaround}? I\'ll come with a Lighthouse audit of your current site.',
  }),
];

// Common opener variants used when no template is selected
export const GENERIC_HOOKS = [
  'Hi {client_name} — read your post twice. "{pain_point}" is something I\'ve solved before, and I think I see a fast path through it.',
  'Hi {client_name} — your timing is good. I just finished a similar AWS project last month, and the lessons are fresh.',
  'Hello {client_name} — quick proposal: I think I can move this forward in {turnaround}. Here\'s how.',
];

export function templateById(id) {
  return PROPOSAL_TEMPLATES.find((t) => t.id === id) || null;
}
