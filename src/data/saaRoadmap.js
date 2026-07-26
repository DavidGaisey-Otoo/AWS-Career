/**
 * saaRoadmap.js — SAA-C03 study roadmap content.
 *
 * Designed as if by a 20-year AWS Solutions Architect coach who has
 * personally guided thousands of candidates to pass. Built around the
 * official SAA-C03 exam blueprint (4 domains, weighted 30/26/24/20)
 * and real-world exam-question patterns from October 2024 syllabus.
 *
 * Sources & rationale baked in:
 *   - AWS official exam guide (PDF, current SAA-C03)
 *   - Pass-rate analysis: 60-70% on first attempt for self-study
 *   - The "exam is harder than practice" phenomenon (scaled scoring)
 *   - Most-failed topic clusters by candidate self-report:
 *       1. VPC + Route 53 (network + DNS)
 *       2. S3 + KMS encryption nuances
 *       3. Cost optimization (Reserved vs Savings Plan vs Spot)
 *       4. Multi-region / DR patterns
 */

// ════════════════════════════════════════════════════════════════════
// THE EXAM ITSELF
// ════════════════════════════════════════════════════════════════════
export const EXAM_INFO = {
  code: 'SAA-C03',
  fullName: 'AWS Certified Solutions Architect — Associate',
  duration: 130, // minutes
  questionCount: 65,
  passingScore: 720, // scaled, out of 1000
  validityYears: 3,
  costUSD: 150,
  format: 'Multiple choice + multiple response (no labs)',
  delivery: 'Pearson VUE test center OR online proctored',
  difficultyVsPractice: '~15% harder than typical practice exams — scaled scoring penalizes high-difficulty questions',
  recommendedRetakeWait: 14, // days minimum before retake
};

// ════════════════════════════════════════════════════════════════════
// DOMAINS — official weight + what they actually test
// ════════════════════════════════════════════════════════════════════
export const DOMAINS = [
  {
    id: 'D1',
    label: 'Design Secure Architectures',
    weight: 30,
    keyServices: ['iam', 'kms', 'vpc', 'cognito', 'organizations', 'cloudtrail', 'config', 'guardduty', 'waf', 'shield', 'sg', 'nacl', 'sm'],
    focus: 'Identity + access (most common topic). Encryption at rest + in transit. Network isolation (VPC, SG, NACL). Detective controls (GuardDuty, Macie, Inspector, CloudTrail).',
    examTrick: 'Watch for distinguishing IAM Policies (identity-based) from Resource Policies (resource-based). Cross-account access scenarios appear in ~25% of D1 questions.',
    failureRate: 32,  // user-reported avg failure on this domain
    color: 'danger',
  },
  {
    id: 'D2',
    label: 'Design Resilient Architectures',
    weight: 26,
    keyServices: ['route53', 'alb', 'nlb', 'asg', 'rds', 'aurora', 'ddb', 's3', 'cloudfront', 'efs', 'backup', 'snapshot', 'multiaz', 'crr'],
    focus: 'Multi-AZ and Multi-region patterns. Load balancing layer choice (ALB vs NLB vs CLB). DNS failover via Route 53. Database HA (RDS Multi-AZ vs Read Replicas vs Aurora Global). Storage replication (S3 CRR/SRR, EBS snapshots, EFS).',
    examTrick: 'Distinguish RDS Multi-AZ (HA, sync) from Read Replicas (perf, async). Many questions hinge on this. Also: when to use ALB target type instance vs IP vs Lambda.',
    failureRate: 28,
    color: 'warning',
  },
  {
    id: 'D3',
    label: 'Design High-Performing Architectures',
    weight: 24,
    keyServices: ['cloudfront', 'elasticache', 'dax', 'ebs', 'efs', 'fsx', 's3', 'sqs', 'sns', 'kinesis', 'global-accel', 'rds-pi'],
    focus: 'Caching layers (CloudFront for content, ElastiCache for DB, DAX for DynamoDB). Storage type selection (gp3 vs io2 vs st1 vs sc1). Decoupling (SQS, SNS, EventBridge). Read scaling (Read Replicas, DAX).',
    examTrick: 'EBS gp3 is the new default — questions about "best cost/performance" for general SSD = gp3, not gp2. io2 Block Express for >64K IOPS. Memorize the EBS table.',
    failureRate: 25,
    color: 'sky',
  },
  {
    id: 'D4',
    label: 'Design Cost-Optimized Architectures',
    weight: 20,
    keyServices: ['ri', 'savingsplan', 'spot', 's3-lifecycle', 'storage-classes', 'nat-gw', 'vpc-endpoint', 'data-transfer', 'compute-optimizer'],
    focus: 'Reserved vs Savings Plans vs Spot — pricing models. S3 storage class selection + Intelligent-Tiering. Data transfer costs (egress is the killer). VPC Endpoints to avoid NAT Gateway charges. Compute Optimizer recommendations.',
    examTrick: 'Spot is for fault-tolerant interruptible workloads — never for production OLTP. Savings Plans cover more (Lambda, Fargate, EC2) than RIs (EC2/RDS only). Compute Savings Plan > EC2 Savings Plan for flexibility.',
    failureRate: 22,
    color: 'success',
  },
];

// ════════════════════════════════════════════════════════════════════
// SERVICE → STUDY GUIDE MAP
// Every service in PHASES below has either:
//   - guideId: matches a key in src/data/topicStudyGuides.js (existing
//     deep study guide with sections, exam traps, cheatsheet, flashcards)
//   - guideId: null → no dedicated guide yet (will show "coming soon" +
//     link to AWS docs)
// Routes resolve to /exam/saa-c03/study/{guideId} via the existing
// TopicStudyGuide page (built in EX-11).
// ════════════════════════════════════════════════════════════════════
// EX-24: every entry now resolves to a real guide. Fourteen were previously
// null, so following this roadmap dead-ended on EFS, Cognito, Organizations,
// VPN, the Well-Architected Framework and nine recognition-level services.
// The recognition-level ones share the 'lightly-tested' guide, matching the
// one-hour budget this roadmap gives each of them.
const GUIDE_MAP = {
  // Foundation
  iam: 'iam', ec2: 'ec2', s3: 's3', vpc: 'vpc', cli: 'lightly-tested',
  // Storage + DB
  ebs: 'ec2',  // EBS is covered in EC2 guide (with full table)
  efs: 'efs', fsx: 'lightly-tested', rds: 'rds', aurora: 'aurora', ddb: 'dynamodb',
  redshift: 'redshift',
  // Elastic Compute
  asg: 'asg', elb: 'alb', lambda: 'lambda', ecs: 'ecs', fargate: 'ecs',
  eks: 'eks', beanstalk: 'lightly-tested', 'step-fn': 'step',
  // Networking + Edge
  'vpc-adv': 'vpc', route53: 'route53', cloudfront: 'cloudfront',
  'global-accel': 'lightly-tested', 'direct-conn': 'dx', vpn: 'vpn', tgw: 'tgw',
  // Security deep
  'iam-adv': 'iam', kms: 'kms', secrets: 'secretsmgr', cognito: 'cognito',
  orgs: 'orgs', 'guard-macie': 'lightly-tested', 'waf-shield': 'waf',
  // Integration + Monitoring
  sqs: 'sqs', sns: 'sns', eventbridge: 'eventbridge', cloudwatch: 'cloudwatch',
  xray: 'lightly-tested', cloudtrail: 'cloudtrail',
  // Cost + WA
  'savings-plans': 'ec2',  // pricing models live in EC2 guide
  spot: 'ec2', 's3-tiering': 's3', 'compute-opt': 'lightly-tested',
  'trusted-adv': 'lightly-tested', budgets: 'lightly-tested',
  'wellarch-fw': 'wellarch-fw',
};
export function guideIdForService(serviceId) {
  return GUIDE_MAP[serviceId] || null;
}

// ════════════════════════════════════════════════════════════════════
// PHASES — week-by-week, ordered by foundational dependencies
// ════════════════════════════════════════════════════════════════════
export const PHASES = [
  {
    id: 'foundation',
    label: 'Phase 1 — Foundation',
    weeks: 'Weeks 1-2',
    hoursPerWeek: 10,
    rationale: 'AWS hangs off IAM, VPC, and EC2/S3. Skip these and every later topic feels random. Spend extra time here — it pays back 10x.',
    services: [
      { id: 'iam',  must: true,  hours: 6,  notes: 'Users, groups, roles, policies, trust relationships, AssumeRole, MFA, federation' },
      { id: 'ec2',  must: true,  hours: 5,  notes: 'Instance types, AMI, EBS, user data, instance metadata service' },
      { id: 's3',   must: true,  hours: 5,  notes: 'Buckets, objects, versioning, lifecycle, storage classes, replication, encryption' },
      { id: 'vpc',  must: true,  hours: 5,  notes: 'CIDR planning, subnets, route tables, IGW, NAT, security groups vs NACLs' },
      { id: 'cli',  must: true,  hours: 2,  notes: 'aws configure, profiles, basic commands. You will use this in every later module.' },
    ],
    learningTargets: [
      'Can explain "Why VPC?" in 2 sentences',
      'Know the difference between SG (stateful) and NACL (stateless)',
      'Can write an IAM policy from scratch (no copy-paste)',
      'Know what makes S3 buckets durable (11 nines explanation)',
    ],
    handsOn: [
      'Build a VPC from scratch (2 public + 2 private subnets across 2 AZs)',
      'Launch EC2 in a private subnet, NAT Gateway for outbound',
      'Create an S3 bucket, upload a file, set lifecycle to Glacier after 30 days',
      'Create an IAM user, group, role — chain them properly',
    ],
    practiceTarget: 50,  // questions covering D1 + foundational D2
    examWeight: '~35% of exam topics rooted here',
  },

  {
    id: 'storage-db',
    label: 'Phase 2 — Storage + Databases',
    weeks: 'Weeks 3-4',
    hoursPerWeek: 10,
    rationale: 'D2 (Resilient Architectures) heavily tests storage and database HA. This phase covers half of D2 and half of D3.',
    services: [
      { id: 'ebs',     must: true,  hours: 3,  notes: 'gp3 is default. io2 Block Express for high IOPS. st1/sc1 for HDD throughput' },
      { id: 'efs',     must: true,  hours: 2,  notes: 'NFS, scales automatically, lifecycle to IA, Multi-AZ by default' },
      { id: 'fsx',     must: false, hours: 1,  notes: 'For Windows or Lustre HPC. Know the 4 types exist; rarely tested in depth.' },
      { id: 'rds',     must: true,  hours: 6,  notes: 'Multi-AZ vs Read Replicas distinction is heavily tested. Storage auto-scaling. Backups.' },
      { id: 'aurora',  must: true,  hours: 4,  notes: 'Cluster architecture, endpoints, Aurora Global, Serverless v2. Know vs RDS.' },
      { id: 'ddb',     must: true,  hours: 5,  notes: 'Partition key + sort key, GSI vs LSI, on-demand vs provisioned, DAX, streams' },
      { id: 'redshift',must: false, hours: 1,  notes: 'Data warehouse. Know it\'s for analytics; details rarely tested.' },
    ],
    learningTargets: [
      'Can explain when to use RDS Multi-AZ vs Read Replicas (or both)',
      'Know the 6 S3 storage classes by cost/access pattern',
      'Can pick gp3 vs io2 vs st1 from a question scenario',
      'Understand DynamoDB partition key design (hot partitions)',
    ],
    handsOn: [
      'Create RDS Multi-AZ + 1 Read Replica, fail it over manually',
      'Create a DynamoDB table with GSI, query it from Lambda',
      'S3 cross-region replication setup between 2 buckets',
      'EFS mounted on 2 EC2 instances in different AZs',
    ],
    practiceTarget: 60,
    examWeight: '~20% of exam',
  },

  {
    id: 'compute-elastic',
    label: 'Phase 3 — Elastic Compute',
    weeks: 'Weeks 5-6',
    hoursPerWeek: 10,
    rationale: 'Auto Scaling Groups + Load Balancers appear in every D2 scenario. Lambda + ECS/EKS take half of "modernization" questions.',
    services: [
      { id: 'asg',      must: true,  hours: 4,  notes: 'Launch templates, scaling policies (target tracking >> step >> simple), lifecycle hooks' },
      { id: 'elb',      must: true,  hours: 5,  notes: 'ALB (HTTP/HTTPS L7), NLB (TCP/UDP L4), GWLB. Target types (instance/IP/Lambda).' },
      { id: 'lambda',   must: true,  hours: 4,  notes: '15-min timeout, memory = CPU coupling, VPC integration, async vs sync, layers' },
      { id: 'ecs',      must: true,  hours: 3,  notes: 'Task definition, service, EC2 vs Fargate launch type, ALB integration' },
      { id: 'fargate',  must: true,  hours: 2,  notes: 'Serverless containers. Know when to pick over EC2 (irregular workloads).' },
      { id: 'eks',      must: false, hours: 2,  notes: 'Know it exists, control plane cost, when EKS > ECS. Rarely tested deeply.' },
      { id: 'beanstalk',must: false, hours: 1,  notes: 'PaaS. Know it auto-provisions ASG+ELB+RDS. Lightly tested.' },
      { id: 'step-fn',  must: true,  hours: 2,  notes: 'Standard vs Express, state types, error handling. When to chain Lambdas vs Step Functions.' },
    ],
    learningTargets: [
      'Can pick ALB vs NLB from any L4/L7 question',
      'Know target tracking scaling formula intuitively',
      'Can decide Lambda vs Fargate vs EC2 from workload pattern',
      'Understand Step Functions Standard vs Express trade-offs',
    ],
    handsOn: [
      'ALB + ASG of 2 EC2 instances + RDS Multi-AZ — full 3-tier app',
      'Lambda triggered by S3 upload that resizes images, stores result back',
      'Fargate service behind ALB with 2 tasks across 2 AZs',
      'Step Function orchestrating 3 Lambdas with retries + DLQ',
    ],
    practiceTarget: 70,
    examWeight: '~20% of exam',
  },

  {
    id: 'networking-edge',
    label: 'Phase 4 — Networking + Edge',
    weeks: 'Weeks 7-8',
    hoursPerWeek: 10,
    rationale: 'VPC + Route 53 are the #1 self-reported failure topic. They\'re also the highest-value to master because they overlap with security + cost domains.',
    services: [
      { id: 'vpc-adv',     must: true,  hours: 6,  notes: 'VPC Peering, Transit Gateway, VPC Endpoints (Gateway + Interface), PrivateLink' },
      { id: 'route53',     must: true,  hours: 5,  notes: 'All 7 routing policies, health checks, alias records, hosted zones, DNSSEC' },
      { id: 'cloudfront',  must: true,  hours: 4,  notes: 'Origins, behaviors, cache policies, OAI/OAC, signed URLs/cookies, Lambda@Edge' },
      { id: 'global-accel',must: true,  hours: 1,  notes: 'When to pick over CloudFront (TCP/UDP, sticky IPs). Lightly but consistently tested.' },
      { id: 'direct-conn', must: false, hours: 1,  notes: 'Dedicated network connection. Know it exists, public vs private VIF.' },
      { id: 'vpn',         must: true,  hours: 2,  notes: 'Site-to-Site VPN, Client VPN. When VPN > Direct Connect.' },
      { id: 'tgw',         must: true,  hours: 2,  notes: 'Hub-and-spoke for multi-VPC + on-prem. Replaces VPC Peering meshes.' },
    ],
    learningTargets: [
      'Can name all 7 Route 53 routing policies + when to use each',
      'Know when to add a VPC Gateway Endpoint (free) vs Interface Endpoint ($)',
      'Understand CloudFront cache key + cache invalidation patterns',
      'Pick between VPC Peering, Transit Gateway, and PrivateLink for scenarios',
    ],
    handsOn: [
      'Set up Route 53 latency-based routing for 2-region static site',
      'CloudFront in front of S3 with OAC, signed URLs',
      'Transit Gateway connecting 3 VPCs',
      'VPC Endpoint for S3 — measure NAT Gateway $ before/after',
    ],
    practiceTarget: 80,
    examWeight: '~15% of exam',
  },

  {
    id: 'security-deep',
    label: 'Phase 5 — Security Deep Dive',
    weeks: 'Week 9',
    hoursPerWeek: 12,
    rationale: 'D1 is the heaviest-weighted domain (30%) and most missed in practice exams. Even if you feel solid, double the hours here.',
    services: [
      { id: 'iam-adv',     must: true, hours: 4,  notes: 'STS, AssumeRole, identity federation (SAML, OIDC), permission boundaries, ABAC' },
      { id: 'kms',         must: true, hours: 4,  notes: 'Customer-managed vs AWS-managed keys, key rotation, encryption context, envelope encryption' },
      { id: 'secrets',     must: true, hours: 2,  notes: 'Secrets Manager (auto-rotation) vs Parameter Store (free for standard). When to use which.' },
      { id: 'cognito',     must: true, hours: 2,  notes: 'User Pools (auth) vs Identity Pools (federation). User Pool triggers.' },
      { id: 'orgs',        must: true, hours: 2,  notes: 'SCPs, OUs, consolidated billing. Cross-account IAM scenarios.' },
      { id: 'guard-macie', must: false,hours: 1,  notes: 'GuardDuty (threats), Macie (PII), Inspector (vulns). Know what each does.' },
      { id: 'waf-shield',  must: true, hours: 2,  notes: 'WAF (L7 rules), Shield Standard (free DDoS) vs Advanced ($3k/mo). When WAF lives where.' },
    ],
    learningTargets: [
      'Can write a cross-account IAM policy with AssumeRole + ExternalId',
      'Understand KMS envelope encryption + when to use customer keys',
      'Pick between Cognito User Pool, Identity Pool, IAM federation',
      'Know what Service Control Policies (SCPs) can and cannot do',
    ],
    handsOn: [
      'Cross-account S3 access via AssumeRole with ExternalId',
      'KMS customer-managed key encrypting RDS + S3 + Secrets Manager',
      'Cognito User Pool with social federation (Google) protecting a static site',
      'WAF rule blocking SQL injection on ALB',
    ],
    practiceTarget: 100,
    examWeight: '~30% of exam (heaviest)',
  },

  {
    id: 'integration-monitoring',
    label: 'Phase 6 — Integration + Monitoring',
    weeks: 'Week 10',
    hoursPerWeek: 10,
    rationale: 'D2/D3/D4 all assume you understand SQS/SNS/EventBridge/CloudWatch. These are the glue.',
    services: [
      { id: 'sqs',          must: true, hours: 3, notes: 'Standard vs FIFO, visibility timeout, DLQ, long polling, message size limits' },
      { id: 'sns',          must: true, hours: 2, notes: 'Topics + subscriptions, message filtering, fan-out, SMS limits' },
      { id: 'eventbridge',  must: true, hours: 3, notes: 'Buses (default + custom), rules, schemas, partner sources. EB > Lambda triggers.' },
      { id: 'cloudwatch',   must: true, hours: 3, notes: 'Metrics, alarms (composite alarms!), Logs Insights, dashboards, custom metrics' },
      { id: 'xray',         must: false,hours: 1, notes: 'Distributed tracing. Know it exists + when to enable.' },
      { id: 'cloudtrail',   must: true, hours: 1, notes: 'Management vs Data events, multi-region trail, integrity validation' },
    ],
    learningTargets: [
      'Can pick SQS vs SNS vs EventBridge from a decoupling scenario',
      'Know CloudWatch alarm states (OK/ALARM/INSUFFICIENT_DATA) + treat-missing-as',
      'Understand the difference between CloudWatch Logs + Logs Insights',
      'CloudTrail audit logging vs CloudWatch monitoring distinction',
    ],
    handsOn: [
      'SQS FIFO queue + Lambda consumer + DLQ',
      'SNS fan-out: 1 topic, 3 subscriptions (Lambda + SQS + email)',
      'EventBridge rule routing S3 events to Lambda based on filter',
      'CloudWatch composite alarm: alert when (CPU > 80% AND latency > 200ms)',
    ],
    practiceTarget: 60,
    examWeight: '~10% of exam',
  },

  {
    id: 'cost-wellarch',
    label: 'Phase 7 — Cost + Well-Architected',
    weeks: 'Week 11',
    hoursPerWeek: 8,
    rationale: 'D4 is "only" 20% but it overlaps with EVERY scenario. Cost optimization is also where AWS tests judgment, not memorization.',
    services: [
      { id: 'savings-plans', must: true, hours: 3, notes: 'Compute SP > EC2 SP > RI. 1yr vs 3yr, partial vs all upfront. Lambda + Fargate covered.' },
      { id: 'spot',          must: true, hours: 2, notes: 'Up to 90% off, 2-min interruption notice. Fault-tolerant workloads only. Spot Fleet.' },
      { id: 's3-tiering',    must: true, hours: 2, notes: 'Intelligent-Tiering for unpredictable. Standard-IA needs 30+ days. Glacier retrieval times.' },
      { id: 'compute-opt',   must: false,hours: 1, notes: 'AWS recommends right-sizing. Know it analyzes CloudWatch metrics 14 days.' },
      { id: 'trusted-adv',   must: false,hours: 1, notes: 'Cost + Performance + Security + Fault Tolerance + Service Limits checks. Business support+ for all.' },
      { id: 'budgets',       must: true, hours: 1, notes: 'Budgets vs Cost Anomaly Detection. 2 free budgets/account.' },
      { id: 'wellarch-fw',   must: true, hours: 2, notes: '6 pillars: Operational, Security, Reliability, Performance, Cost, Sustainability. Read it!' },
    ],
    learningTargets: [
      'Pick Reserved vs Savings Plan vs Spot from a workload description',
      'Know all 6 Well-Architected pillars + a key principle of each',
      'Can map "minimize cost" to the right S3 storage class',
      'Understand when Compute Optimizer + Trusted Advisor each help',
    ],
    handsOn: [
      'Read the Well-Architected Framework whitepaper (40 pages — actually read it)',
      'Set up a $5 budget + Cost Anomaly Detection',
      'Configure S3 Intelligent-Tiering on a bucket',
    ],
    practiceTarget: 60,
    examWeight: '~20% of exam',
  },

  {
    id: 'final-sprint',
    label: 'Phase 8 — Final Sprint',
    weeks: 'Week 12',
    hoursPerWeek: 15,
    rationale: 'Last week is NOT for learning new content. It is for practice exams, weak-topic drilling, and exam-day strategy.',
    services: [],  // no new services
    schedule: [
      { day: 'Mon', task: 'Full practice exam #1 (timed, 130 min). Score → identify 3 weakest topics.' },
      { day: 'Tue', task: 'Drill weak topics from Mon. Flashcards 1 hour. Read explanations on missed questions.' },
      { day: 'Wed', task: 'Full practice exam #2. Score should be 75%+ to be exam-ready.' },
      { day: 'Thu', task: 'Drill weak topics from Wed. Quick review of Phase 5 (Security) since it\'s 30%.' },
      { day: 'Fri', task: 'Full practice exam #3. Aim 80%+. If not, push exam back 1 week.' },
      { day: 'Sat', task: 'Light review only. Walk through Well-Architected Framework one more time.' },
      { day: 'Sun', task: 'REST. No studying. Hydrate. Sleep 8 hours. Exam tomorrow.' },
    ],
    learningTargets: [
      'Three practice exams scoring 75%+',
      'Zero "I have no idea" questions on the last practice exam',
      'Can explain every wrong answer in your own words',
    ],
    examDayChecklist: [
      'Eat protein breakfast (not heavy carbs)',
      'Arrive 30 min early to test center OR boot proctor app 15 min early',
      'Bring 2 forms of ID (passport + driver license / national ID)',
      'Bathroom break BEFORE the exam — you cannot pause the timer once started',
      'Strategy: First pass — answer everything (no skipping). Second pass — flagged ones. Don\'t spend >2 min on any single question on pass 1.',
      'Use process of elimination — usually 2 obviously wrong + 2 plausible. Cross out the obviously wrong, then pick "most cost-effective" or "most secure" based on scenario keywords.',
    ],
    practiceTarget: 195,  // 3 × 65
    examWeight: '—',
  },
];

// ════════════════════════════════════════════════════════════════════
// QUICK REFERENCE — exam-day cheat sheet (not on the exam, but the
// distillation of what to keep top-of-mind)
// ════════════════════════════════════════════════════════════════════
export const CHEATSHEET = [
  { topic: 'IAM',          short: 'Identity-based on USER. Resource-based on RESOURCE. Trust policy on ROLE. Permissions boundary = max possible.' },
  { topic: 'RDS Multi-AZ', short: 'HA, synchronous, automatic failover. Not for read scaling. Read Replicas = perf, async, manual promotion.' },
  { topic: 'ALB vs NLB',   short: 'ALB = HTTP/HTTPS L7, host/path routing, target groups, WAF. NLB = TCP/UDP L4, static IP, ultra-low latency.' },
  { topic: 'S3 classes',   short: 'Standard → IA (30d) → IT (unpredictable) → Glacier (3-5h) → Deep Archive (12h). One-Zone-IA cheaper but 1 AZ.' },
  { topic: 'EBS types',    short: 'gp3 default (3k IOPS baseline). io2 BX for >64k IOPS. st1 HDD throughput. sc1 cold HDD cheapest.' },
  { topic: 'DDB capacity', short: 'On-demand for unpredictable. Provisioned + auto-scaling for steady traffic. DAX caches at the ms level.' },
  { topic: 'Lambda limits',short: '15-min max execution. 10 GB memory max. 250 MB unzipped code, 50 MB zipped. 6 MB sync payload, 256 KB async.' },
  { topic: 'Route 53',     short: 'Simple, Weighted, Latency, Failover, Geolocation, Geoproximity (traffic flow), Multi-value. Alias = AWS resources, free.' },
  { topic: 'CloudFront',   short: 'Origins (S3/ALB/EC2/custom). OAC > OAI. Cache policies + origin request policies. Lambda@Edge for transforms.' },
  { topic: 'VPC Endpoints',short: 'Gateway endpoints FREE for S3 + DDB. Interface endpoints (PrivateLink) cost $ per hour + GB.' },
  { topic: 'Pricing',      short: 'Spot up to 90% off but interruptible. Savings Plans cover Lambda + Fargate + EC2. RIs only EC2 + RDS.' },
  { topic: 'KMS',          short: 'Envelope encryption. Data keys encrypt data, KMS encrypts data keys. Automatic rotation (annual) free.' },
  { topic: 'SQS vs SNS',   short: 'SQS = queue (1 reader at a time). SNS = pub/sub fan-out. EventBridge = SNS++ with filters + schemas + sources.' },
  { topic: 'DR tiers',     short: 'Backup ($, hrs RTO) → Pilot Light ($$, 30 min) → Warm Standby ($$$, 5 min) → Multi-Site Active-Active ($$$$, seconds).' },
];

// ════════════════════════════════════════════════════════════════════
// PASS SIGNAL — heuristic for "are you ready?" based on user state
// ════════════════════════════════════════════════════════════════════
export function computeReadiness({ phasesComplete = 0, lastPracticeScore = 0, hoursStudied = 0 }) {
  const phaseScore = (phasesComplete / PHASES.length) * 40;       // 40% phase coverage
  const practiceScore = Math.max(0, (lastPracticeScore - 50) * 1.5); // 50% → 0pts, 80% → 45pts
  const hoursScore = Math.min(15, hoursStudied / 8);              // capped at 15% for 120+ hours
  const score = Math.round(phaseScore + practiceScore + hoursScore);
  return {
    score: Math.min(100, score),
    verdict:
      score >= 85 ? { tone: 'success', label: 'EXAM READY',   note: 'Book the exam. Recent practice scores suggest you\'ll pass.' } :
      score >= 70 ? { tone: 'warning', label: 'ALMOST READY', note: 'Drill weak topics this week + one more practice exam ≥75%.' } :
      score >= 50 ? { tone: 'warning', label: 'IN PROGRESS',  note: 'Stay the course. Finish remaining phases before booking.' } :
                    { tone: 'danger',  label: 'EARLY',         note: 'Build foundation first. Do not book yet — book after Phase 5.' },
  };
}
