/**
 * AWS Exam Question Bank.
 *
 * Each question carries:
 *   - id: stable hex id
 *   - certIds: list of certs this question is valid for
 *   - domainIds: list of domain ids (allows cross-cert mapping)
 *   - difficulty: 'easy' | 'medium' | 'hard' | 'expert'
 *   - service: tag(s) used by filters
 *   - type: 'single' | 'multi' | 'tf'
 *   - q: prompt (often a scenario)
 *   - options: array of strings
 *   - answer: index | [indices] | 0/1 for tf
 *   - why: explanation when correct
 *   - wrongReasons: { [idx]: 'why this is wrong' }
 *   - docs: AWS docs link
 *   - learningTopic: { categoryId, topicId } pointer to /learning/:cat/:topic
 *   - lastVerified: ISO date
 *
 * Designed to be extended — community-flag and add-question hooks live in
 * the ExamContext.
 */

const q = (id, opts) => ({
  id,
  certIds: opts.certIds || [],
  domainIds: opts.domainIds || [],
  difficulty: opts.difficulty || 'medium',
  service: opts.service || [],
  type: opts.type || 'single',
  q: opts.q,
  options: opts.options,
  answer: opts.answer,
  why: opts.why || '',
  wrongReasons: opts.wrongReasons || {},
  docs: opts.docs || null,
  learningTopic: opts.learningTopic || null,
  lastVerified: opts.lastVerified || '2026-01-15',
});

// ====================================================================
// Cloud Practitioner pool (broad, foundational)
// ====================================================================
const CLF = [
  q('clf-001', {
    certIds: ['clf-c02'], domainIds: ['clf-d1'], difficulty: 'easy',
    q: 'Which AWS pricing principle is best described as "pay only for what you use"?',
    options: ['Reserved capacity', 'Pay-as-you-go', 'Subscription', 'Bring-your-own-license'],
    answer: 1,
    why: 'On-demand consumption billing — the foundational cloud economics model.',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t5' },
  }),
  q('clf-002', {
    certIds: ['clf-c02'], domainIds: ['clf-d1'], difficulty: 'easy',
    q: 'An AZ in AWS contains which of the following?',
    options: ['A region', 'One or more discrete data centers',
              'A single rack in a region', 'A CloudFront edge location'],
    answer: 1,
    why: 'AZs are physically isolated data centers (one or more buildings) with independent power, cooling, and networking.',
    wrongReasons: { 0: 'Regions contain AZs, not the other way round.', 3: 'Edge locations are smaller POPs used by CloudFront.' },
    learningTopic: { categoryId: 'cf', topicId: 'c1-t2' },
  }),
  q('clf-003', {
    certIds: ['clf-c02'], domainIds: ['clf-d2'], difficulty: 'easy',
    q: 'Under the AWS Shared Responsibility Model, who is responsible for patching the guest OS on EC2?',
    options: ['AWS', 'The customer', 'Both share equally', 'The OS vendor'],
    answer: 1,
    why: '"Security IN the cloud" — customers manage the guest OS, including patching.',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t4' },
  }),
  q('clf-004', {
    certIds: ['clf-c02'], domainIds: ['clf-d2'], difficulty: 'medium',
    q: 'Which is true about the AWS root user?',
    options: ['Can be limited via IAM policies',
              'Should be used for daily admin work',
              'Should have MFA enabled and be locked away',
              'Cannot have MFA enabled'],
    answer: 2,
    why: 'Root has unrestricted power and cannot be limited — enable MFA and avoid daily use.',
    wrongReasons: { 0: 'Root cannot be limited.', 1: 'Daily admin should use IAM identities, not root.' },
    learningTopic: { categoryId: 'cf', topicId: 'c1-t3' },
  }),
  q('clf-005', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'easy', service: ['s3'],
    q: 'Which AWS service provides object storage with 11-nines durability?',
    options: ['EBS', 'S3', 'EFS', 'Glacier Tape'],
    answer: 1,
    why: 'S3 is the canonical object store with 99.999999999% (11 nines) durability.',
    learningTopic: { categoryId: 'sto', topicId: 'c3-t1' },
  }),
  q('clf-006', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'easy', service: ['ec2'],
    q: 'What does EC2 stand for?',
    options: ['Elastic Cloud Computing', 'Elastic Compute Cloud',
              'Enhanced Compute Cluster', 'Edge Compute Center'],
    answer: 1,
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t1' },
  }),
  q('clf-007', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'medium', service: ['lambda'],
    q: 'Which option best describes AWS Lambda?',
    options: ['Always-on VM service', 'Container orchestration platform',
              'Serverless function-as-a-service', 'Managed database'],
    answer: 2,
    why: 'Lambda runs code on demand without managing servers.',
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t3' },
  }),
  q('clf-008', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'easy',
    q: 'Which service provides a globally distributed CDN?',
    options: ['Route 53', 'CloudFront', 'Global Accelerator', 'S3 Transfer Acceleration'],
    answer: 1,
    why: 'CloudFront caches content at 400+ edge locations worldwide.',
    learningTopic: { categoryId: 'net', topicId: 'c4-t4' },
  }),
  q('clf-009', {
    certIds: ['clf-c02'], domainIds: ['clf-d4'], difficulty: 'easy',
    q: 'Which AWS Support plan includes 24/7 phone + chat AND full Trusted Advisor checks?',
    options: ['Basic', 'Developer', 'Business', 'Enterprise On-Ramp'],
    answer: 2,
    why: 'Business support unlocks full Trusted Advisor and 24/7 phone + chat.',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t6' },
  }),
  q('clf-010', {
    certIds: ['clf-c02'], domainIds: ['clf-d4'], difficulty: 'medium',
    q: 'Which tool gives you cost forecasting + budget alerts?',
    options: ['AWS Pricing Calculator', 'AWS Budgets',
              'Cost & Usage Report', 'AWS Trusted Advisor'],
    answer: 1,
    why: 'AWS Budgets supports thresholds, forecasted alerts, and per-service breakdowns.',
    learningTopic: { categoryId: 'cost', topicId: 'c13-t1' },
  }),
  q('clf-011', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'medium', type: 'multi',
    q: 'Which of these are fully managed AWS database services? (choose 3)',
    options: ['RDS', 'EC2 running PostgreSQL', 'DynamoDB', 'Aurora', 'Self-managed MongoDB on EC2'],
    answer: [0, 2, 3],
    why: 'RDS, DynamoDB, and Aurora are managed. Anything you install on EC2 yourself is self-managed.',
    learningTopic: { categoryId: 'db', topicId: 'c6-t1' },
  }),
  q('clf-012', {
    certIds: ['clf-c02'], domainIds: ['clf-d2'], difficulty: 'medium', type: 'tf',
    q: 'TRUE OR FALSE: AWS is responsible for encrypting customer data at rest in S3 by default.',
    options: ['True', 'False'],
    answer: 0,
    why: 'Since Dec 2022, all new S3 objects are encrypted with SSE-S3 by default at no cost.',
    learningTopic: { categoryId: 'sto', topicId: 'c3-t1' },
  }),
  q('clf-013', {
    certIds: ['clf-c02'], domainIds: ['clf-d1'], difficulty: 'easy',
    q: 'Which cloud-computing characteristic best describes "spin up 1,000 EC2 instances in minutes for a Black Friday spike"?',
    options: ['Resource pooling', 'Rapid elasticity', 'Broad network access', 'On-demand self-service'],
    answer: 1,
    learningTopic: { categoryId: 'cf', topicId: 'c1-t1' },
  }),
  q('clf-014', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'easy',
    q: 'Which AWS service is most suitable for archiving compliance records you may need to retain for 7 years but rarely access?',
    options: ['S3 Standard', 'EFS', 'S3 Glacier Deep Archive', 'EBS Cold HDD (sc1)'],
    answer: 2,
    why: 'Deep Archive is the cheapest tier; 12-48h retrieval is fine for compliance archives.',
    learningTopic: { categoryId: 'sto', topicId: 'c3-t4' },
  }),
  q('clf-015', {
    certIds: ['clf-c02'], domainIds: ['clf-d4'], difficulty: 'easy',
    q: 'Which pricing option provides the highest discount in exchange for a 3-year commitment?',
    options: ['On-Demand', 'Spot', '1-year Savings Plan', '3-year All Upfront Savings Plan'],
    answer: 3,
    why: 'Longer commit + bigger upfront = up to 72% discount.',
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t5' },
  }),
  q('clf-016', {
    certIds: ['clf-c02'], domainIds: ['clf-d2'], difficulty: 'medium',
    q: 'You want to grant a Lambda function read access to one DynamoDB table. Which is correct?',
    options: ['Hard-code an IAM user access key in the function',
              'Attach an IAM role to the function with a scoped policy',
              'Use the root user credentials',
              'Make the table public'],
    answer: 1,
    why: 'Least-privilege: attach a role to the function with only the required dynamodb actions on that table ARN.',
    learningTopic: { categoryId: 'sec', topicId: 'c5-t1' },
  }),
  q('clf-017', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'], difficulty: 'easy', type: 'multi',
    q: 'Which of these are AWS Compute services? (choose 2)',
    options: ['EC2', 'S3', 'Lambda', 'Route 53'],
    answer: [0, 2],
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t1' },
  }),
  q('clf-018', {
    certIds: ['clf-c02'], domainIds: ['clf-d1'], difficulty: 'medium',
    q: 'Which AWS framework provides design principles across 6 pillars (Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability)?',
    options: ['AWS CAF', 'AWS Well-Architected Framework',
              'AWS Trusted Advisor', 'AWS Migration Hub'],
    answer: 1,
    learningTopic: { categoryId: 'cf', topicId: 'c1-t7' },
  }),
];

// ====================================================================
// Solutions Architect Associate (heaviest pool)
// ====================================================================
const SAA = [
  q('saa-001', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['s3', 'cloudfront'],
    q: 'A static marketing site uses S3 + CloudFront with a custom domain. Where MUST the ACM certificate be issued?',
    options: ['Same region as the bucket', 'us-east-1 (N. Virginia)',
              'Same region as the CloudFront viewer', 'Any region'],
    answer: 1,
    why: 'CloudFront requires its TLS certificate in us-east-1, regardless of the origin\'s region.',
    wrongReasons: { 0: 'Certificate region for CloudFront is decoupled from the S3 bucket region.' },
    learningTopic: { categoryId: 'net', topicId: 'c4-t4' },
  }),
  q('saa-002', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['rds'],
    q: 'What does enabling RDS Multi-AZ deployment provide?',
    options: ['Cross-region disaster recovery',
              'Synchronous standby replica in another AZ for automatic failover',
              'Read scaling across multiple AZs',
              'Encryption at rest'],
    answer: 1,
    why: 'Multi-AZ = synchronous standby in another AZ. Failover is automatic in 60-120 s.',
    wrongReasons: {
      0: 'Multi-region requires Read Replicas in another region, not Multi-AZ.',
      2: 'Read scaling uses Read Replicas. Multi-AZ standby is NOT readable.',
    },
    learningTopic: { categoryId: 'db', topicId: 'c6-t2' },
  }),
  q('saa-003', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['dynamodb'],
    q: 'For an e-commerce app with unpredictable traffic spikes, which DynamoDB capacity mode is best?',
    options: ['Provisioned with auto-scaling', 'On-Demand',
              'Reserved capacity', 'No capacity needed'],
    answer: 1,
    why: 'On-Demand scales instantly with no capacity planning — ideal for spiky workloads.',
    wrongReasons: { 0: 'Provisioned + auto-scale works but has a delay; bursts can throttle.' },
    learningTopic: { categoryId: 'db', topicId: 'c6-t4' },
  }),
  q('saa-004', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['ec2', 'alb'],
    q: 'You deploy an ALB across two AZs with EC2 instances behind it. Cross-zone load balancing is ENABLED. What does this mean?',
    options: ['Traffic is split equally across AZs regardless of target count',
              'Traffic is split equally across all healthy targets regardless of which AZ they\'re in',
              'Disabled by default; enabling adds cost on ALB',
              'Health checks are now cross-region'],
    answer: 1,
    why: 'Cross-zone = the LB load-balances evenly across all targets, no matter which AZ.',
    wrongReasons: { 2: 'Cross-zone is ENABLED by default on ALB at no extra cost (NLB charges for it).' },
    learningTopic: { categoryId: 'net', topicId: 'c4-t5' },
  }),
  q('saa-005', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['s3'],
    q: 'Which storage class is cheapest for data accessed once per quarter with millisecond retrieval?',
    options: ['S3 Standard', 'S3 Standard-IA', 'S3 Glacier Instant Retrieval', 'S3 Glacier Deep Archive'],
    answer: 2,
    why: 'Glacier Instant Retrieval is millisecond access with archival pricing.',
    wrongReasons: { 3: 'Deep Archive is cheaper but 12-48h retrieval.' },
    learningTopic: { categoryId: 'sto', topicId: 'c3-t1' },
  }),
  q('saa-006', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'hard', service: ['iam'], type: 'multi',
    q: 'You attach two IAM policies to a user: Policy A allows s3:*. Policy B denies s3:DeleteObject on bucket "critical". Which actions are EFFECTIVELY allowed? (choose 2)',
    options: ['s3:GetObject on any bucket', 's3:DeleteObject on bucket "critical"',
              's3:DeleteObject on bucket "other"', 'iam:DeleteUser'],
    answer: [0, 2],
    why: 'Explicit Deny always wins, but only for "critical". Other buckets stay allowed by Policy A.',
    wrongReasons: { 1: 'Explicit Deny blocks this.', 3: 'No IAM permission was granted.' },
    learningTopic: { categoryId: 'sec', topicId: 'c5-t1' },
  }),
  q('saa-007', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['lambda', 'sqs'],
    q: 'A Lambda processes messages from an SQS queue. During traffic spikes, downstream APIs throttle. Best mitigation?',
    options: ['Increase Lambda memory',
              'Set the Lambda reserved concurrency to a value that matches downstream limits',
              'Switch SQS to FIFO',
              'Use SNS instead of SQS'],
    answer: 1,
    why: 'Reserved concurrency caps parallel Lambdas so the downstream isn\'t overwhelmed.',
    learningTopic: { categoryId: 'app', topicId: 'c10-t1' },
  }),
  q('saa-008', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['route53'],
    q: 'You want failover between an active us-east-1 site and a passive eu-west-2 site. Which routing policy?',
    options: ['Latency', 'Weighted', 'Failover with health checks', 'Geolocation'],
    answer: 2,
    why: 'Failover routing + health checks promote the secondary when primary fails health.',
    learningTopic: { categoryId: 'net', topicId: 'c4-t3' },
  }),
  q('saa-009', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['vpc'],
    q: 'Which is true about NAT Gateways?',
    options: ['Enable inbound + outbound internet for private subnets',
              'Are placed in private subnets',
              'Enable outbound-only internet for private subnets and are placed in a public subnet',
              'Are free to run'],
    answer: 2,
    learningTopic: { categoryId: 'net', topicId: 'c4-t1' },
  }),
  q('saa-010', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['ec2'],
    q: 'A fault-tolerant batch job runs nightly for 2-3 hours. Best pricing model?',
    options: ['On-Demand', 'Reserved Instances 1-year', 'Spot Instances', 'Dedicated Hosts'],
    answer: 2,
    why: 'Spot saves up to 90%. Interruption is fine for fault-tolerant batch.',
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t5' },
  }),
  q('saa-011', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'hard', service: ['s3', 'aurora'],
    q: 'You need a strongly consistent transactional store + a separate cheap archive. Which combination is BEST?',
    options: ['DynamoDB + S3 Glacier', 'Aurora + S3 with lifecycle to Glacier',
              'RDS + EFS', 'Redshift + S3'],
    answer: 1,
    why: 'Aurora is strongly consistent + ACID. S3 lifecycle ages old data to Glacier cheaply.',
    learningTopic: { categoryId: 'db', topicId: 'c6-t3' },
  }),
  q('saa-012', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['elasticache'],
    q: 'A read-heavy web app shows high RDS CPU. Cheapest mitigation that preserves correctness?',
    options: ['Vertical scale to bigger RDS instance',
              'Add ElastiCache (Redis) for hot reads',
              'Switch to DynamoDB',
              'Add more EC2 read replicas of the app'],
    answer: 1,
    why: 'Caching offloads most reads, cheap + non-invasive. Vertical scale is more expensive.',
    learningTopic: { categoryId: 'db', topicId: 'c6-t5' },
  }),
  q('saa-013', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['sg'], type: 'tf',
    q: 'TRUE OR FALSE: A Security Group is stateful, which means return traffic for an allowed inbound connection is automatically allowed without a corresponding outbound rule.',
    options: ['True', 'False'],
    answer: 0,
    learningTopic: { categoryId: 'net', topicId: 'c4-t2' },
  }),
  q('saa-014', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['s3'],
    q: 'For data with unpredictable access patterns, which storage class minimizes cost without retrieval fees?',
    options: ['S3 Standard', 'S3 Intelligent-Tiering',
              'S3 Standard-IA', 'S3 One Zone-IA'],
    answer: 1,
    why: 'Intelligent-Tiering auto-moves based on access patterns; no retrieval fees.',
    learningTopic: { categoryId: 'cost', topicId: 'c13-t5' },
  }),
  q('saa-015', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['ec2'], type: 'multi',
    q: 'Which combinations provide HA for a stateless web tier? (choose 2)',
    options: ['ASG across 2+ AZs with ALB',
              'Single EC2 in one AZ with EIP',
              'ECS service across 2+ AZs',
              'Single t3.large with hourly snapshots'],
    answer: [0, 2],
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t2' },
  }),
  q('saa-016', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['cloudfront'],
    q: 'A SaaS streams large media files globally. To reduce origin load, which CloudFront feature would you enable?',
    options: ['Origin Shield as a regional cache layer',
              'Custom error pages',
              'Signed URLs',
              'Geo-restriction'],
    answer: 0,
    why: 'Origin Shield consolidates requests, improving cache hit ratio dramatically at scale.',
    learningTopic: { categoryId: 'net', topicId: 'c4-t4' },
  }),
  q('saa-017', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'hard', service: ['vpc'],
    q: 'You have 6 VPCs that all need to talk to each other AND to on-prem. What is the most scalable, manageable design?',
    options: ['Full mesh VPC peering + 6 separate VPN connections',
              'Transit Gateway with VPC + VPN attachments',
              'NAT Gateway per VPC routing across peering',
              'PrivateLink between every pair'],
    answer: 1,
    why: 'TGW solves the N² mesh + provides hybrid via VPN/DX attachments. Operationally simpler.',
    learningTopic: { categoryId: 'net', topicId: 'c4-t8' },
  }),
  q('saa-018', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'easy', service: [],
    q: 'Which AWS tool flags over-provisioned EC2/RDS/EBS resources with rightsizing recommendations?',
    options: ['Trusted Advisor', 'Compute Optimizer', 'Cost Explorer', 'CloudWatch'],
    answer: 1,
    learningTopic: { categoryId: 'cost', topicId: 'c13-t4' },
  }),
  q('saa-019', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'hard', service: ['s3'],
    q: 'You need cross-region disaster recovery for an S3 bucket with full version history preservation. What MUST be enabled?',
    options: ['Versioning on source only',
              'Versioning on both source and destination + CRR rule',
              'Just SSE-KMS encryption',
              'Multi-region access point'],
    answer: 1,
    why: 'CRR requires versioning on BOTH buckets. CRR replicates each version.',
    learningTopic: { categoryId: 'sto', topicId: 'c3-t1' },
  }),
  q('saa-020', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['kinesis'],
    q: 'For a real-time analytics pipeline that fans out the same event to multiple consumers with replay capability, which is best?',
    options: ['SQS Standard', 'SNS', 'Kinesis Data Streams', 'EventBridge default bus'],
    answer: 2,
    why: 'Kinesis retains records for 24h-365d and supports multiple consumers reading independently.',
    learningTopic: { categoryId: 'data', topicId: 'c11-t2' },
  }),

  // ---------- Stage-15 expansion (q21–q55) ----------

  q('saa-021', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['s3', 'kms'],
    q: 'A finance team must store reports in S3 with envelope encryption using a customer-managed key and full audit visibility of every decrypt call. Which configuration meets the requirements with the LEAST operational overhead?',
    options: [
      'SSE-S3 with bucket logging enabled',
      'SSE-KMS using an AWS managed key (aws/s3) with CloudTrail data events',
      'SSE-KMS using a customer-managed CMK with CloudTrail data events on KMS',
      'Client-side encryption with keys stored in Secrets Manager',
    ],
    answer: 2,
    why: 'Customer-managed CMK gives you control over the key policy + rotation; CloudTrail logs every KMS Decrypt call by user for audit.',
    wrongReasons: {
      0: 'SSE-S3 uses AWS-managed keys with no per-call audit.',
      1: 'AWS managed keys (aws/s3) cannot be modified or have custom key policies.',
      3: 'Client-side encryption adds significant operational overhead and Secrets Manager isn\'t designed for KMS.',
    },
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html',
  }),
  q('saa-022', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['rds', 'aurora'],
    q: 'An e-commerce app uses RDS for MySQL. Read traffic at peak overwhelms the writer, causing checkout latency. Architecture must keep writes performant and require minimal code change. What should the SA recommend?',
    options: [
      'Migrate to DynamoDB',
      'Add up to 5 RDS Read Replicas and route SELECTs to the reader endpoint',
      'Increase the writer instance class to db.r6i.16xlarge',
      'Add ElastiCache and cache every SQL response',
    ],
    answer: 1,
    why: 'RDS read replicas absorb SELECT traffic; the app needs only a connection string change.',
    wrongReasons: {
      0: 'Migrating to DynamoDB is a major rewrite.',
      2: 'Scaling vertically is expensive and hits a ceiling.',
      3: 'Caching needs invalidation strategy and code changes.',
    },
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html',
  }),
  q('saa-023', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['cloudfront', 's3'],
    q: 'A media company serves 4K video globally from S3 via CloudFront. They want to reduce origin requests AND restrict viewing to authenticated users. What\'s best?',
    options: [
      'Make the S3 bucket public and use CloudFront geo-restriction',
      'Use CloudFront signed URLs/cookies with an OAC restricting S3 to CloudFront',
      'Use S3 pre-signed URLs and let the player call them directly',
      'Use Lambda@Edge to inspect every request',
    ],
    answer: 1,
    why: 'Signed URLs / signed cookies prove the viewer is authorised; OAC ensures S3 only serves CloudFront. Lower origin load + access control.',
    wrongReasons: {
      0: 'Public bucket defeats access control.',
      2: 'S3 pre-signed URLs bypass CloudFront — no edge caching.',
      3: 'Lambda@Edge works but adds per-request cost vs signed URLs which are free.',
    },
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html',
  }),
  q('saa-024', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['ec2', 'asg'],
    q: 'A workload has predictable Mon-Fri 8am-6pm activity. The team wants to minimise cost while meeting demand. What\'s the optimal capacity strategy?',
    options: [
      'On-Demand only for full burst flexibility',
      'Reserved Instances covering peak capacity',
      'Compute Savings Plan for baseline + scheduled Auto Scaling actions for daytime peaks',
      'Spot Instances only',
    ],
    answer: 2,
    why: 'Savings Plans cover baseline at up to 66% off. Scheduled scaling handles predictable peaks without paying for idle capacity.',
    wrongReasons: {
      0: 'On-Demand is the most expensive.',
      1: 'RIs at peak waste capacity overnight.',
      3: 'Spot can disappear — not safe for a primary workload.',
    },
  }),
  q('saa-025', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['route53', 'cloudfront'],
    q: 'A global SaaS wants 99.99% availability and automatic regional failover for its API. Active-active across two regions, with users hitting whichever region is healthy + closest. What service combination achieves this?',
    options: [
      'Route 53 Failover routing + 1 CloudFront distribution',
      'Route 53 Latency-based routing + health checks per regional endpoint',
      'Global Accelerator with 2 regional endpoint groups',
      'ALB across two regions via cross-region target groups',
    ],
    answer: 2,
    why: 'Global Accelerator provides static anycast IPs, anycast routing to the nearest healthy region, and sub-30-second failover.',
    wrongReasons: {
      0: 'Failover is active-passive, not active-active.',
      1: 'Latency routing + health checks work but Global Accelerator failover is faster (~30s vs DNS TTL).',
      3: 'ALB target groups can\'t span regions.',
    },
    docs: 'https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html',
  }),
  q('saa-026', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['iam', 'sts'],
    q: 'A third-party SaaS needs to read your S3 buckets daily. Most secure approach?',
    options: [
      'Create an IAM user, generate access keys, send the keys to the SaaS',
      'Create an IAM role with the SaaS\'s account as a trusted entity + an external ID, give them the role ARN',
      'Make the bucket public with read-only',
      'Use a presigned URL per object',
    ],
    answer: 1,
    why: 'Cross-account IAM role with external ID is the AWS-recommended pattern for third-party access — no long-lived credentials.',
    wrongReasons: {
      0: 'Long-lived access keys are a major risk if leaked.',
      2: 'Public bucket exposes data to everyone.',
      3: 'Presigned URLs are per-object and have expiry — impractical for daily reads.',
    },
    docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-user_externalid.html',
  }),
  q('saa-027', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['efs', 'ec2'],
    q: '5 EC2 instances in 2 AZs need shared read-write access to the same files with POSIX semantics. Best storage choice?',
    options: ['Shared EBS volume', 'EFS in regional mode', 'S3 mounted via s3fs', 'FSx for Windows File Server'],
    answer: 1,
    why: 'EFS is a managed multi-AZ shared NFS file system with POSIX semantics.',
    wrongReasons: {
      0: 'EBS can be attached to only one instance (with limited multi-attach exceptions).',
      2: 's3fs has no POSIX semantics (no fsync, no atomic rename).',
      3: 'FSx for Windows is SMB, not POSIX.',
    },
  }),
  q('saa-028', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'easy', service: ['vpc'],
    q: 'A private EC2 instance in a private subnet needs to download OS patches from the internet but should NOT be reachable from the internet. What enables outbound-only internet?',
    options: ['Internet Gateway', 'NAT Gateway in a public subnet', 'VPC Endpoint for EC2', 'Direct Connect'],
    answer: 1,
    why: 'NAT Gateway in a public subnet provides outbound-only internet for private subnets.',
    wrongReasons: {
      0: 'IGW makes the resource bidirectionally reachable.',
      2: 'VPC Endpoint is for AWS service traffic, not internet.',
      3: 'Direct Connect is for on-prem links.',
    },
  }),
  q('saa-029', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['s3'],
    q: 'Logs land in S3 daily, accessed for 30 days, then rarely. After 1 year they\'re archived but must be retrievable within 24h. Cheapest lifecycle?',
    options: [
      'Standard → Glacier Instant Retrieval after 90 days',
      'Standard → Standard-IA after 30d → Glacier Flexible Retrieval after 365d',
      'Standard → One Zone-IA after 30d → Glacier Deep Archive after 365d',
      'Glacier Deep Archive from day 1',
    ],
    answer: 1,
    why: 'IA matches the 30-day access pattern; Glacier Flexible (3-5h retrieval) meets the 24h SLA cheaper than Glacier Instant.',
    wrongReasons: {
      0: 'Glacier Instant is overkill for "rarely accessed".',
      2: 'Glacier Deep Archive retrieval is up to 12h — risky vs the 24h SLA + One-Zone IA isn\'t for primary log data.',
      3: 'Cannot read at all for first 30 days without paying retrieval fees.',
    },
  }),
  q('saa-030', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['sqs', 'lambda'],
    q: 'A spike of 50,000 events/sec hits an API that triggers an emailer Lambda. The downstream SMTP provider rate-limits to 50/sec. Best architecture to avoid throttling?',
    options: [
      'Increase Lambda concurrency to handle the burst',
      'Buffer events to SQS Standard; Lambda polls with low reserved concurrency to respect SMTP limits',
      'Use API Gateway throttling at 50 req/sec',
      'Write events to DynamoDB and process with a cron Lambda',
    ],
    answer: 1,
    why: 'SQS acts as a buffer; Lambda reserved concurrency caps the rate downstream. Standard decoupling pattern.',
    wrongReasons: {
      0: 'More concurrency would just hit SMTP throttling faster.',
      2: 'API throttling would drop legitimate user traffic at the edge.',
      3: 'Cron Lambda would have unpredictable batch sizes and lag.',
    },
  }),
  q('saa-031', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'hard', service: ['alb', 'asg'],
    q: 'An ASG behind an ALB has min=2, max=10, desired=4. When CPU > 70% it scales out, when CPU < 30% it scales in. New instances take 6 min to be ready. A traffic spike at 9:00am keeps triggering rapid scale-out then scale-in cycles. What\'s the fix?',
    options: [
      'Reduce health check grace period',
      'Add a longer cooldown period after scaling events',
      'Switch to Step Scaling',
      'Add a warm pool to keep pre-initialised instances on standby',
    ],
    answer: 3,
    why: 'Warm pools pre-initialise instances so scale-out completes in seconds, breaking the oscillation cycle.',
    wrongReasons: {
      0: 'Reducing grace period makes the problem worse.',
      1: 'Cooldown helps but doesn\'t fix the 6-min boot issue.',
      2: 'Step scaling still hits the 6-min boot time.',
    },
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html',
  }),
  q('saa-032', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['secretsmgr'],
    q: 'An EC2-hosted app reads a database password from an .env file checked into Git. What\'s the right fix?',
    options: [
      'Move .env to S3 with KMS encryption',
      'Store the password in Secrets Manager + grant the EC2 instance role secretsmanager:GetSecretValue',
      'Use IAM access keys + AWS CLI to fetch on boot',
      'Encrypt the .env with GPG and check in the encrypted file',
    ],
    answer: 1,
    why: 'Secrets Manager + IAM role = no credentials ever leave AWS, automatic rotation supported.',
    wrongReasons: {
      0: 'S3 is for objects, not secrets — no rotation, audit is per-bucket not per-secret.',
      2: 'IAM access keys on EC2 are an anti-pattern — use instance roles.',
      3: 'Encrypted in Git still leaks via Git history and developer machines.',
    },
  }),
  q('saa-033', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['dynamodb'],
    q: 'A DynamoDB table has an extremely skewed access pattern — 1% of partition keys serve 80% of reads. Throttling alerts fire. What\'s the BEST fix?',
    options: [
      'Increase provisioned RCUs',
      'Switch to on-demand capacity mode',
      'Add a write sharding suffix to the hot partition keys',
      'Add a DynamoDB Accelerator (DAX) cluster',
    ],
    answer: 3,
    why: 'DAX is a managed read-through cache for DynamoDB. Hot keys are served from DAX, eliminating partition throttling.',
    wrongReasons: {
      0: 'More RCUs hit partition limits, not table limits — won\'t fix hot partition.',
      1: 'On-demand still has per-partition limits.',
      2: 'Write sharding is for write hot partitions, not reads.',
    },
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html',
  }),
  q('saa-034', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['ec2'],
    q: 'A stateful trading app cannot tolerate any data loss on instance failure. It runs on a single EC2. Which storage choice protects against an EBS volume failure?',
    options: ['gp3 EBS', 'Instance store', 'EBS with snapshot every 4 hours', 'Mount an EFS volume + sync from local'],
    answer: 3,
    why: 'EFS is multi-AZ replicated. Even if the EBS or instance dies, the EFS data persists.',
    wrongReasons: {
      0: 'gp3 single-AZ — AZ failure loses data.',
      1: 'Instance store is ephemeral.',
      2: 'Snapshots reduce loss to last 4h, not zero.',
    },
  }),
  q('saa-035', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['rds', 'aurora'],
    q: 'A worldwide SaaS needs a primary write region in eu-west-1 with sub-second cross-region read replicas in us-east-1 and ap-southeast-1. What service?',
    options: ['RDS for PostgreSQL with cross-region read replicas', 'Aurora Global Database', 'DynamoDB Global Tables', 'RDS Proxy'],
    answer: 1,
    why: 'Aurora Global Database supports 1 primary + up to 5 read-only regions with typical replication lag under 1 second.',
    wrongReasons: {
      0: 'RDS for PostgreSQL cross-region replication is async and typically 5-60 seconds lag.',
      2: 'DynamoDB Global Tables is multi-region writes but NoSQL.',
      3: 'RDS Proxy is connection pooling, not replication.',
    },
  }),
  q('saa-036', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'hard', service: ['waf', 'cloudfront'],
    q: 'A site experiences credential-stuffing attacks (high volume of failed logins from rotating IPs). Best mitigation?',
    options: [
      'Block all IPs that fail login 3 times via security groups',
      'Use AWS WAF with the AWS Managed Rule Group for Account Takeover Prevention',
      'Add CAPTCHA on every page load',
      'Throttle requests at API Gateway',
    ],
    answer: 1,
    why: 'WAF ATP rule group monitors login endpoints + blocks credential stuffing using AWS threat intel + rate-based rules.',
    wrongReasons: {
      0: 'SGs don\'t do app-level inspection.',
      2: 'CAPTCHA on every page hurts legitimate UX.',
      3: 'API throttle slows legitimate users too.',
    },
    docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-atp.html',
  }),
  q('saa-037', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['kinesis', 'firehose'],
    q: 'Clickstream events from a web app must land in S3 in 5-minute batches, partitioned by date, with no code to manage. Cheapest fit?',
    options: ['Kinesis Data Streams + Lambda + S3', 'Kinesis Data Firehose with dynamic partitioning', 'API Gateway → Lambda → S3', 'SQS → Lambda → S3'],
    answer: 1,
    why: 'Firehose is fully managed batched delivery to S3 with built-in dynamic partitioning by date.',
    wrongReasons: {
      0: 'Data Streams + Lambda has more management overhead and you write the batching.',
      2: 'API Gateway + Lambda would lose batching unless you build it.',
      3: 'SQS isn\'t a streaming service.',
    },
  }),
  q('saa-038', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['ec2'],
    q: 'A fault-tolerant batch job processes 10,000 image-resize tasks per hour. Each task takes ~30 seconds. Cost-optimal compute?',
    options: ['On-Demand t3.medium fleet', 'Spot Fleet with mixed instance types', 'Reserved Instances', 'Fargate'],
    answer: 1,
    why: 'Spot offers up to 90% off; fault-tolerant work tolerates interruption; mixed types diversify capacity pools.',
    wrongReasons: {
      0: 'On-Demand is 4-9x the cost of Spot.',
      2: 'RIs are for steady workloads, not bursty batch.',
      3: 'Fargate is more expensive per CPU-hour and overkill for a batch job.',
    },
  }),
  q('saa-039', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['route53'],
    q: 'A primary region in us-east-1 hosts the app via ALB. A warm-standby in us-west-2 has a smaller ASG. Users should hit primary if healthy; only fall over if primary is down. Which Route 53 routing?',
    options: ['Latency-based', 'Weighted', 'Failover', 'Geolocation'],
    answer: 2,
    why: 'Failover routing with health checks: primary record returns answers if healthy, secondary takes over on failure.',
    wrongReasons: {
      0: 'Latency would send some users to standby in normal operation.',
      1: 'Weighted distributes traffic by ratio — not active/passive.',
      3: 'Geolocation is for compliance/locale routing, not failover.',
    },
  }),
  q('saa-040', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'hard', service: ['sqs', 'sns', 'lambda'],
    q: 'Order events must be processed in strict order per customer, with no duplicates, max 5-second end-to-end latency. Which combination meets ALL requirements?',
    options: [
      'SNS → SQS Standard → Lambda',
      'SNS FIFO → SQS FIFO (customer-id as group ID) → Lambda',
      'EventBridge → Lambda',
      'API Gateway → Lambda',
    ],
    answer: 1,
    why: 'FIFO topic + queue with MessageGroupId = customer-id guarantees in-order, exactly-once processing per customer.',
    wrongReasons: {
      0: 'Standard SQS is at-least-once + no ordering.',
      2: 'EventBridge doesn\'t guarantee order.',
      3: 'API GW → Lambda is synchronous, no buffering.',
    },
  }),
  q('saa-041', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['iam'],
    q: 'A consultant is given temporary access to your AWS account for 2 weeks. Most secure way to grant access?',
    options: [
      'Create an IAM user with a permanent password',
      'Add their personal IAM user from their account as a trusted entity in a cross-account role',
      'Share root user credentials',
      'Use IAM Identity Center with a permission set limited to 14 days max session duration',
    ],
    answer: 3,
    why: 'IAM Identity Center centralises temporary access, no long-lived credentials, full audit, automatic expiry.',
    wrongReasons: {
      0: 'Permanent password = forget to delete = ongoing risk.',
      1: 'Doable but requires the consultant to have IAM in their own account.',
      2: 'Never share root credentials.',
    },
  }),
  q('saa-042', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['vpc', 'dx'],
    q: 'An on-prem datacenter needs a 10 Gbps consistent-latency connection to AWS for sensitive workloads. Internet VPN is too variable. What\'s right?',
    options: ['Site-to-Site VPN', 'AWS Direct Connect dedicated connection', 'Transit Gateway', 'PrivateLink'],
    answer: 1,
    why: 'Direct Connect provides dedicated, consistent-latency physical links from on-prem to AWS.',
    wrongReasons: {
      0: 'VPN runs over internet — variable.',
      2: 'Transit Gateway is a VPC hub, not a circuit.',
      3: 'PrivateLink is for AWS-service private endpoints.',
    },
  }),
  q('saa-043', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['lambda'],
    q: 'A Lambda processes images in /tmp. Some images are 800 MB. The function fails with "no space left on device." Easiest fix?',
    options: [
      'Mount EFS to the Lambda',
      'Increase Lambda ephemeral storage from 512 MB up to 10 GB',
      'Switch to ECS Fargate',
      'Process the image in memory only',
    ],
    answer: 1,
    why: 'Lambda ephemeral storage (/tmp) is configurable up to 10 GB since 2022 — single-click fix.',
    wrongReasons: {
      0: 'EFS works but is overkill for transient processing.',
      2: 'Major architectural change for a 1-click fix.',
      3: '800 MB in memory might exceed Lambda\'s 10 GB memory cap and is wasteful.',
    },
  }),
  q('saa-044', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'easy', service: ['ec2'],
    q: 'Which AWS pricing model gives the steepest discount in exchange for a 1- or 3-year commitment to a specific instance family and region?',
    options: ['On-Demand', 'Standard Reserved Instances', 'Compute Savings Plans', 'Spot Instances'],
    answer: 1,
    why: 'Standard RIs give up to 72% off vs On-Demand for a strict 1y/3y commitment to family + region.',
    wrongReasons: {
      0: 'On-Demand has no discount.',
      2: 'Compute SP gives up to 66% off and is more flexible (any family) but slightly less discount.',
      3: 'Spot is biggest discount but with interruption risk + no commitment.',
    },
  }),
  q('saa-045', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['guardduty'],
    q: 'You want continuous threat detection across all AWS accounts in an Organisation, with no agents to deploy. Which service?',
    options: ['AWS Config', 'AWS GuardDuty (delegated admin in Organisations)', 'AWS Inspector', 'AWS Trusted Advisor'],
    answer: 1,
    why: 'GuardDuty is agentless threat detection from VPC Flow Logs, CloudTrail, DNS logs — works across Org accounts.',
    wrongReasons: {
      0: 'AWS Config is compliance state evaluation, not threat detection.',
      2: 'Inspector scans EC2 + ECR vulnerabilities (requires agent for some checks).',
      3: 'Trusted Advisor is best practices, not threat detection.',
    },
  }),
  q('saa-046', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['dynamodb'],
    q: 'A DynamoDB table holds e-commerce orders. Auditors require immutable history of every change for 90 days. Easiest implementation?',
    options: [
      'Manually backup nightly',
      'Enable DynamoDB Streams → Lambda → write change records to S3 with Object Lock',
      'Enable Point-in-Time Recovery (PITR) for 35 days',
      'Use a versioned S3 bucket as the primary store',
    ],
    answer: 1,
    why: 'Streams capture every change; Object Lock makes the S3 records immutable for the retention period.',
    wrongReasons: {
      0: 'Nightly backup loses intra-day changes.',
      2: 'PITR limit is 35 days + isn\'t designed for audit replay.',
      3: 'DynamoDB is needed for the operational workload.',
    },
  }),
  q('saa-047', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['ecs', 'fargate'],
    q: 'A team wants to run microservices in containers without managing EC2 hosts or capacity. Which fits?',
    options: ['ECS on EC2', 'ECS on Fargate', 'EKS on EC2', 'Beanstalk Docker'],
    answer: 1,
    why: 'Fargate runs containers serverlessly — AWS manages the infrastructure.',
    wrongReasons: {
      0: 'EC2 mode means you manage hosts.',
      2: 'EKS on EC2 same — you manage worker nodes.',
      3: 'Beanstalk abstracts but you still configure underlying instance type.',
    },
  }),
  q('saa-048', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'medium', service: ['s3'],
    q: 'A bucket gets 100 GB/day of inbound writes from PutObject. The team wants the cheapest storage class that still allows immediate reads (no retrieval delay) for the first 30 days.',
    options: ['Standard', 'Standard-IA', 'Intelligent-Tiering', 'One Zone-IA'],
    answer: 2,
    why: 'Intelligent-Tiering auto-moves objects between Frequent and Infrequent tiers based on access — pay for what you use, no retrieval fee.',
    wrongReasons: {
      0: 'Standard costs more if access drops off.',
      1: 'IA has min 30-day billing + per-GB retrieval fee.',
      3: 'One Zone-IA is single-AZ — risk of AZ outage = data loss for new uploads.',
    },
  }),
  q('saa-049', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'hard', service: ['vpc'],
    q: 'A company has 5 VPCs in 3 regions that need full mesh connectivity. Each region also needs an on-prem link. Best design for ongoing simplicity?',
    options: [
      'VPC peering between every pair',
      'Site-to-Site VPN between every VPC',
      'Transit Gateway per region + inter-region TGW peering + Direct Connect to one TGW',
      'PrivateLink endpoints between each pair',
    ],
    answer: 2,
    why: 'TGW per region centralises VPC connectivity; inter-region peering + DX integration scales without n² peering pairs.',
    wrongReasons: {
      0: 'Full-mesh peering = 10 connections per region + no transitivity.',
      1: 'VPNs are inferior to TGW for VPC-to-VPC.',
      3: 'PrivateLink is service-to-service, not VPC-to-VPC routing.',
    },
  }),
  q('saa-050', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'easy', service: ['cloudtrail'],
    q: 'For audit purposes, you must record every API call across every region of an AWS account, sent to a hardened logging account. Most efficient setup?',
    options: [
      'Enable CloudTrail in each region individually',
      'Create a single multi-region trail and send to a centralised S3 bucket in a log archive account',
      'Use CloudWatch Logs',
      'Use AWS Config',
    ],
    answer: 1,
    why: 'A multi-region trail captures all regions; centralised S3 + Object Lock in a separate account is the AWS-recommended audit pattern.',
    wrongReasons: {
      0: 'Per-region trails are 13+ trails to manage.',
      2: 'CloudWatch Logs alone isn\'t auditable storage.',
      3: 'Config is compliance state, not API call history.',
    },
  }),
  q('saa-051', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['cloudfront'],
    q: 'A SPA hosted on S3 has all routes returning 403 when accessed directly (e.g. /pricing). What\'s the fix?',
    options: [
      'Change S3 bucket policy to allow */*',
      'In CloudFront, set a custom error response: map 403 → /index.html with HTTP 200',
      'Move the SPA to EC2',
      'Disable Block Public Access',
    ],
    answer: 1,
    why: 'SPAs need every deep-link to fall back to index.html for client-side routing. CloudFront error responses handle this without security loosening.',
    wrongReasons: {
      0: 'Loose bucket policy = security risk.',
      2: 'Major architecture change.',
      3: 'Doesn\'t fix routing, opens public access.',
    },
  }),
  q('saa-052', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'], difficulty: 'medium', service: ['rds'],
    q: 'A production RDS Multi-AZ MySQL is failing over to the standby on average once per week with no app errors. The team wants to track WHY without restarting. What enables this insight?',
    options: [
      'CloudWatch Logs for OS metrics',
      'Enable Enhanced Monitoring + Performance Insights',
      'VPC Flow Logs',
      'X-Ray',
    ],
    answer: 1,
    why: 'Enhanced Monitoring gives OS-level metrics; Performance Insights gives DB load metrics — together they reveal what triggers failovers.',
    wrongReasons: {
      0: 'Default CloudWatch metrics don\'t include OS internals.',
      2: 'Flow logs are network only.',
      3: 'X-Ray is app-level traces, not RDS internals.',
    },
  }),
  q('saa-053', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'], difficulty: 'easy', service: ['s3'],
    q: 'A static site is uploaded once and served unchanged for 5 years. Cheapest storage class?',
    options: ['Standard', 'Standard-IA', 'Glacier Instant Retrieval', 'Intelligent-Tiering'],
    answer: 0,
    why: 'Static site assets are accessed on every page load — Standard wins because IA + Glacier add per-GB retrieval fees on every download.',
    wrongReasons: {
      1: 'IA charges retrieval per GB — expensive for popular content.',
      2: 'Glacier Instant has retrieval fees too.',
      3: 'Intelligent-Tiering has monitoring fees + may downgrade rarely-changed but frequently-read pages.',
    },
  }),
  q('saa-054', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'], difficulty: 'medium', service: ['kms'],
    q: 'A workload must encrypt 50 GB of data with a CMK rotated every 90 days, with the ability to decrypt OLD data after rotation. Which key type?',
    options: ['Symmetric CMK with automatic rotation', 'Asymmetric KMS key', 'AWS Managed Key', 'Imported key material with manual rotation'],
    answer: 0,
    why: 'KMS symmetric CMKs with automatic rotation preserve previous key material — old data decrypts seamlessly.',
    wrongReasons: {
      1: 'Asymmetric keys are for signing / encryption to other parties.',
      2: 'AWS managed keys rotate every 1 year, not 90 days, and you can\'t configure.',
      3: 'Imported material means YOU manage rotation manually — complex.',
    },
    docs: 'https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html',
  }),
  q('saa-055', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'], difficulty: 'medium', service: ['alb'],
    q: 'A microservices API is path-routed: /users to one service, /orders to another. Best AWS-native router?',
    options: ['CloudFront origin groups', 'Application Load Balancer with path-based listener rules', 'Network Load Balancer', 'Route 53 geolocation'],
    answer: 1,
    why: 'ALB supports path-based routing at the load balancer layer with listener rules.',
    wrongReasons: {
      0: 'CloudFront does edge caching, not flexible app-layer path routing.',
      2: 'NLB is layer 4 (no path awareness).',
      3: 'Route 53 routes by DNS query, not URL path.',
    },
  }),
];

// ====================================================================
// Developer Associate
// ====================================================================
const DVA = [
  q('dva-001', {
    certIds: ['dva-c02'], domainIds: ['dva-d1'], difficulty: 'medium', service: ['lambda'],
    q: 'A Lambda function that imports a heavy ML library has 1.2 s cold starts. Which fix reduces cold start latency the MOST?',
    options: ['Increase function timeout',
              'Provisioned Concurrency',
              'Move heavy imports inside the handler',
              'Switch to Python 2.7'],
    answer: 1,
    why: 'Provisioned Concurrency keeps N warm containers ready — eliminates cold starts.',
    wrongReasons: { 2: 'Moving inside the handler makes it WORSE — imports run on every invoke.' },
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t3' },
  }),
  q('dva-002', {
    certIds: ['dva-c02'], domainIds: ['dva-d1'], difficulty: 'medium', service: ['dynamodb'],
    q: 'You need to query items by a non-primary attribute. Which DynamoDB feature?',
    options: ['Local Secondary Index (LSI)', 'Global Secondary Index (GSI)',
              'Scan operation', 'Table-level filter'],
    answer: 1,
    why: 'GSI lets you query by an alternate partition key + sort key.',
    wrongReasons: { 0: 'LSI shares the table\'s partition key.', 2: 'Scan reads the entire table — wasteful at scale.' },
    learningTopic: { categoryId: 'db', topicId: 'c6-t4' },
  }),
  q('dva-003', {
    certIds: ['dva-c02'], domainIds: ['dva-d2'], difficulty: 'medium', service: ['cognito'],
    q: 'Which Cognito construct stores end-user accounts and handles sign-up + sign-in?',
    options: ['User Pool', 'Identity Pool', 'IAM User', 'STS Federation'],
    answer: 0,
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t3' },
  }),
  q('dva-004', {
    certIds: ['dva-c02'], domainIds: ['dva-d3'], difficulty: 'medium', service: ['sam', 'cloudformation'],
    q: 'You define a serverless app with AWS SAM. What is SAM under the hood?',
    options: ['A new resource provisioning service',
              'A CloudFormation transform for serverless shortcuts',
              'A wrapper around Terraform',
              'A code editor'],
    answer: 1,
    why: 'SAM is an extension of CloudFormation — Transform: AWS::Serverless-2016-10-31.',
    learningTopic: { categoryId: 'dev', topicId: 'c8-t2' },
  }),
  q('dva-005', {
    certIds: ['dva-c02'], domainIds: ['dva-d4'], difficulty: 'medium', service: ['xray'],
    q: 'X-Ray instrumentation in a microservice mesh produces too much data and cost. What helps?',
    options: ['Increase sampling',
              'Sampling rules that reduce the fraction of traced requests',
              'Disable X-Ray',
              'Use CloudWatch only'],
    answer: 1,
    learningTopic: { categoryId: 'obs', topicId: 'c7-t2' },
  }),
  q('dva-006', {
    certIds: ['dva-c02'], domainIds: ['dva-d1'], difficulty: 'hard', service: ['lambda', 'sqs'], type: 'multi',
    q: 'A Lambda processing SQS messages must avoid duplicate processing. Which choices help? (choose 2)',
    options: ['Use SQS FIFO with deduplication ID',
              'Set Lambda visibility timeout shorter than processing time',
              'Make message handling idempotent in code',
              'Reduce Lambda memory'],
    answer: [0, 2],
    why: 'FIFO + content-based dedupe prevents duplicate enqueues. Idempotent handlers absorb residual at-least-once dupes.',
    learningTopic: { categoryId: 'app', topicId: 'c10-t1' },
  }),
  q('dva-007', {
    certIds: ['dva-c02'], domainIds: ['dva-d2'], difficulty: 'medium', service: ['secretsmgr'],
    q: 'Where should DB credentials used by a Lambda be stored?',
    options: ['Hardcoded in code', 'Lambda environment variables in plain text',
              'AWS Secrets Manager retrieved at runtime', 'S3 in a public bucket'],
    answer: 2,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t5' },
  }),
  q('dva-008', {
    certIds: ['dva-c02'], domainIds: ['dva-d3'], difficulty: 'medium', service: ['codedeploy'],
    q: 'For zero-downtime deploys of a Lambda function, which CodeDeploy strategy gradually shifts traffic?',
    options: ['AllAtOnce', 'Canary', 'In-place', 'Recreate'],
    answer: 1,
    why: 'Canary shifts a small % first (e.g. 10%), waits, then the rest. Allows safe rollback on alarm.',
    learningTopic: { categoryId: 'dev', topicId: 'c8-t5' },
  }),
  q('dva-009', {
    certIds: ['dva-c02'], domainIds: ['dva-d1'], difficulty: 'medium', service: ['apigateway'],
    q: 'You expose a Lambda via API Gateway with a custom JWT validator. Which feature accepts a Cognito-issued JWT without your own code?',
    options: ['Lambda authorizer', 'Cognito User Pool authorizer',
              'IAM authorizer', 'No-auth'],
    answer: 1,
    learningTopic: { categoryId: 'app', topicId: 'c10-t6' },
  }),
  q('dva-010', {
    certIds: ['dva-c02'], domainIds: ['dva-d4'], difficulty: 'hard', service: ['lambda'],
    q: 'A Lambda intermittently times out at 30s when calling a slow API. What\'s the BEST fix?',
    options: ['Increase function memory',
              'Increase function timeout AND make the downstream call non-blocking with retry/backoff',
              'Disable retries',
              'Use Step Functions to orchestrate async waits with proper retry/timeout per step'],
    answer: 3,
    why: 'For multi-second waits, Step Functions is better — built-in retries, timeouts per state, no Lambda 15-min cap risk.',
    learningTopic: { categoryId: 'app', topicId: 'c10-t4' },
  }),
  q('dva-011', {
    certIds: ['dva-c02'], domainIds: ['dva-d1'], difficulty: 'easy', service: ['s3'],
    q: 'Which approach lets browser JavaScript upload large objects directly to S3 without proxying through your backend?',
    options: ['Pre-signed URLs', 'Public bucket', 'IAM user keys in browser', 'CORS-only'],
    answer: 0,
    learningTopic: { categoryId: 'sto', topicId: 'c3-t1' },
  }),
  q('dva-012', {
    certIds: ['dva-c02'], domainIds: ['dva-d3'], difficulty: 'medium', service: ['ecs'],
    q: 'Which ECS task placement strategy minimizes the number of EC2 hosts used (cost-optimized)?',
    options: ['binpack', 'spread', 'random', 'mostUsed'],
    answer: 0,
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t4' },
  }),
];

// ====================================================================
// SysOps Associate
// ====================================================================
const SOA = [
  q('soa-001', {
    certIds: ['soa-c02'], domainIds: ['soa-d1'], difficulty: 'medium', service: ['cloudwatch'],
    q: 'Your CloudWatch alarm goes INSUFFICIENT_DATA every weekend. Which is the LIKELY cause?',
    options: ['Region failure', 'Metric is not emitted when service is idle',
              'IAM permissions revoked', 'Threshold too low'],
    answer: 1,
    why: 'If no data points arrive, the alarm has nothing to evaluate. Common with services that only emit metrics under load.',
    learningTopic: { categoryId: 'obs', topicId: 'c7-t1' },
  }),
  q('soa-002', {
    certIds: ['soa-c02'], domainIds: ['soa-d2'], difficulty: 'medium', service: ['ec2', 'asg'],
    q: 'An Auto Scaling Group never replaces a failing instance. Most likely cause?',
    options: ['Health check type is EC2 only — app-layer failures aren\'t detected',
              'No subnets are configured',
              'Launch template is missing AMI',
              'CloudWatch is disabled'],
    answer: 0,
    why: 'EC2 health checks only see "VM is alive". Use ELB health checks for app-level failure detection.',
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t2' },
  }),
  q('soa-003', {
    certIds: ['soa-c02'], domainIds: ['soa-d3'], difficulty: 'medium', service: ['ssm'],
    q: 'Which Systems Manager feature lets you SSH-free shell into EC2 via the AWS console?',
    options: ['Run Command', 'Session Manager', 'Parameter Store', 'Patch Manager'],
    answer: 1,
    why: 'Session Manager opens a browser-based shell with no SSH or port 22 required.',
    learningTopic: { categoryId: 'dev', topicId: 'c8-t4' },
  }),
  q('soa-004', {
    certIds: ['soa-c02'], domainIds: ['soa-d4'], difficulty: 'medium', service: ['guardduty'],
    q: 'Which AWS service uses ML to detect threats by analyzing CloudTrail, VPC Flow Logs, and DNS logs?',
    options: ['Inspector', 'GuardDuty', 'Macie', 'Security Hub'],
    answer: 1,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t3' },
  }),
  q('soa-005', {
    certIds: ['soa-c02'], domainIds: ['soa-d5'], difficulty: 'medium', service: ['route53'],
    q: 'A Route 53 health check shows the endpoint healthy, but users report it\'s down from one region. Which is MOST likely?',
    options: ['DNS TTL is too low',
              'Health check is from a single location — the regional outage isn\'t detected globally',
              'CloudFront cached the failure',
              'IPv6 is disabled'],
    answer: 1,
    why: 'Route 53 health checks come from multiple regions. If you didn\'t configure them to do so, you might miss localized failures. (In practice, Route 53 uses multiple checkers by default — confirm config.)',
    learningTopic: { categoryId: 'net', topicId: 'c4-t3' },
  }),
  q('soa-006', {
    certIds: ['soa-c02'], domainIds: ['soa-d6'], difficulty: 'easy', service: ['s3'],
    q: 'Which S3 feature automatically moves objects to cheaper tiers based on actual access patterns?',
    options: ['Lifecycle rules', 'S3 Intelligent-Tiering',
              'Versioning', 'Cross-region replication'],
    answer: 1,
    learningTopic: { categoryId: 'cost', topicId: 'c13-t5' },
  }),
  q('soa-007', {
    certIds: ['soa-c02'], domainIds: ['soa-d2'], difficulty: 'medium', service: ['ebs'],
    q: 'Which is true about EBS snapshots?',
    options: ['Stored on the EBS volume itself',
              'Stored in S3 internally; incremental after the first',
              'Free of charge',
              'Always cross-region replicated'],
    answer: 1,
    learningTopic: { categoryId: 'sto', topicId: 'c3-t2' },
  }),
  q('soa-008', {
    certIds: ['soa-c02'], domainIds: ['soa-d1'], difficulty: 'medium', service: ['cloudwatch'], type: 'multi',
    q: 'Which CloudWatch alarm thresholds reduce flapping for noisy metrics? (choose 2)',
    options: ['Use percentiles instead of averages',
              'Require "M out of N" data points to alarm',
              'Use a single 1-minute data point',
              'Set the threshold to 0'],
    answer: [0, 1],
    learningTopic: { categoryId: 'obs', topicId: 'c7-t5' },
  }),
  q('soa-009', {
    certIds: ['soa-c02'], domainIds: ['soa-d4'], difficulty: 'easy', service: ['kms'],
    q: 'You need to rotate KMS keys yearly. What\'s required for AWS managed CMKs?',
    options: ['Manual rotation only',
              'Automatic rotation, no action needed',
              'Disable + recreate the key',
              'Not possible'],
    answer: 1,
    why: 'AWS managed keys auto-rotate annually. Customer Managed Keys can opt in.',
    learningTopic: { categoryId: 'sec', topicId: 'c5-t2' },
  }),
  q('soa-010', {
    certIds: ['soa-c02'], domainIds: ['soa-d3'], difficulty: 'medium', service: ['cloudformation'],
    q: 'A CloudFormation stack update fails mid-way. By default, what happens?',
    options: ['The stack is deleted',
              'Rolls back to the previous working state',
              'Stays in failed state forever',
              'Skips the failed resource and continues'],
    answer: 1,
    learningTopic: { categoryId: 'dev', topicId: 'c8-t2' },
  }),
];

// ====================================================================
// Other certs (compact pools, 6-10 each)
// ====================================================================
const DEA = [
  q('dea-001', {
    certIds: ['dea-c01'], domainIds: ['dea-d1'], difficulty: 'medium', service: ['glue'],
    q: 'You crawl 10TB of CSV logs in S3 and want to make queries 10x cheaper. Best step?',
    options: ['Move to Glacier', 'Convert to Parquet with partitions',
              'Use DynamoDB', 'Add an index in S3'],
    answer: 1,
    why: 'Columnar + partitioning means Athena/Spectrum scans drastically less data per query.',
    learningTopic: { categoryId: 'data', topicId: 'c11-t1' },
  }),
  q('dea-002', {
    certIds: ['dea-c01'], domainIds: ['dea-d1'], difficulty: 'medium', service: ['kinesis'],
    q: 'A streaming pipeline ingests 5 MB/sec. The Kinesis shard limit is 1 MB/sec write. How many shards do you need?',
    options: ['1', '5', '10', '50'],
    answer: 1,
    learningTopic: { categoryId: 'data', topicId: 'c11-t2' },
  }),
  q('dea-003', {
    certIds: ['dea-c01'], domainIds: ['dea-d2'], difficulty: 'medium', service: ['redshift'],
    q: 'You need petabyte-scale BI dashboards on data partly in S3 partly in Redshift. Cheapest single tool?',
    options: ['EMR Hive', 'Redshift + Spectrum',
              'Athena only', 'DocumentDB'],
    answer: 1,
    learningTopic: { categoryId: 'db', topicId: 'c6-t6' },
  }),
  q('dea-004', {
    certIds: ['dea-c01'], domainIds: ['dea-d3'], difficulty: 'medium', service: ['glue'],
    q: 'Glue job memory keeps OOMing on a 100GB dataset. Which fix first?',
    options: ['Increase Worker DPU count and switch to G.2X workers',
              'Switch to Glue DataBrew',
              'Move to Lambda',
              'Compress to gzip only'],
    answer: 0,
    learningTopic: { categoryId: 'data', topicId: 'c11-t1' },
  }),
  q('dea-005', {
    certIds: ['dea-c01'], domainIds: ['dea-d4'], difficulty: 'medium', service: ['lake-formation'],
    q: 'Which AWS service provides column-level access control across the data lake?',
    options: ['IAM only', 'Lake Formation', 'KMS', 'Glue Catalog ACLs'],
    answer: 1,
    learningTopic: { categoryId: 'data', topicId: 'c11-t1' },
  }),
  q('dea-006', {
    certIds: ['dea-c01'], domainIds: ['dea-d1'], difficulty: 'hard', service: ['kinesis'], type: 'multi',
    q: 'Which choices help Kinesis consumers handle a hot shard without throughput penalty? (choose 2)',
    options: ['Enhanced fan-out',
              'Reshard to distribute hot partitions',
              'Use SQS instead',
              'Add more producers'],
    answer: [0, 1],
    learningTopic: { categoryId: 'data', topicId: 'c11-t2' },
  }),
  q('dea-007', {
    certIds: ['dea-c01'], domainIds: ['dea-d2'], difficulty: 'medium', service: ['s3'],
    q: 'An Iceberg table on S3 needs ACID + time travel. Where does Iceberg store its metadata?',
    options: ['Inside the data files',
              'In Glue Data Catalog (or an external catalog)',
              'In DynamoDB only',
              'In a separate region'],
    answer: 1,
    learningTopic: { categoryId: 'data', topicId: 'c11-t5' },
  }),
];

const MLA = [
  q('mla-001', {
    certIds: ['mla-c01'], domainIds: ['mla-d1'], difficulty: 'medium', service: ['sagemaker'],
    q: 'Which SageMaker feature centralizes feature engineering for both training and inference?',
    options: ['Model Monitor', 'Feature Store',
              'Pipelines', 'Ground Truth'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
  q('mla-002', {
    certIds: ['mla-c01'], domainIds: ['mla-d2'], difficulty: 'medium', service: ['sagemaker'],
    q: 'A training job runs 4× slower than expected on a GPU instance. First check?',
    options: ['Data is on S3 and being downloaded sequentially per epoch',
              'GPU drivers',
              'Region',
              'Model size'],
    answer: 0,
    why: 'I/O is the most common bottleneck. Use FastFile or Pipe mode, or copy to local SSD upfront.',
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
  q('mla-003', {
    certIds: ['mla-c01'], domainIds: ['mla-d3'], difficulty: 'medium', service: ['sagemaker'],
    q: 'For sparse inference with strict cost limits, which SageMaker endpoint type is best?',
    options: ['Real-time endpoint',
              'Serverless inference',
              'Batch transform',
              'Multi-model endpoint'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t7' },
  }),
  q('mla-004', {
    certIds: ['mla-c01'], domainIds: ['mla-d4'], difficulty: 'medium', service: ['sagemaker'],
    q: 'A production model\'s accuracy drops 8% over a quarter. Which is most useful?',
    options: ['Model Monitor data + prediction drift',
              'CloudTrail',
              'IAM Access Analyzer',
              'AWS Config'],
    answer: 0,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t6' },
  }),
  q('mla-005', {
    certIds: ['mla-c01'], domainIds: ['mla-d2'], difficulty: 'hard', service: ['bedrock'],
    q: 'For a domain-specific chatbot using foundation models, which approach is fastest to ship without retraining the model?',
    options: ['Fine-tuning from scratch',
              'Retrieval-Augmented Generation (RAG) over a vector DB',
              'Continuous pretraining',
              'Use a smaller base model'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t5' },
  }),
  q('mla-006', {
    certIds: ['mla-c01'], domainIds: ['mla-d4'], difficulty: 'medium', service: ['sagemaker'], type: 'tf',
    q: 'TRUE OR FALSE: SageMaker Clarify can detect bias in both training data and trained model predictions.',
    options: ['True', 'False'],
    answer: 0,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t6' },
  }),
];

const SAP = [
  q('sap-001', {
    certIds: ['sap-c02'], domainIds: ['sap-d1'], difficulty: 'hard', service: ['organizations'],
    q: 'A holding company has 60 AWS accounts. They want consolidated billing AND the ability to deny CloudTrail deletion in every account. Best approach?',
    options: ['IAM in each account', 'Organizations + SCP at root OU denying cloudtrail:Delete*',
              'CloudFormation StackSet only', 'AWS Config rule'],
    answer: 1,
    why: 'SCPs at the OU level enforce guardrails across all member accounts.',
    learningTopic: { categoryId: 'sec', topicId: 'c5-t7' },
  }),
  q('sap-002', {
    certIds: ['sap-c02'], domainIds: ['sap-d4'], difficulty: 'hard', service: ['mgn'],
    q: 'A 200-server lift-and-shift migration must complete in 8 weeks with near-zero downtime. Best AWS tool?',
    options: ['CloudEndure / MGN (AWS Application Migration Service)',
              'Snowball Edge', 'Storage Gateway', 'DataSync'],
    answer: 0,
    learningTopic: { categoryId: 'mig', topicId: 'c12-t1' },
  }),
  q('sap-003', {
    certIds: ['sap-c02'], domainIds: ['sap-d2'], difficulty: 'hard', service: ['eventbridge', 'lambda'],
    q: 'You orchestrate a 12-step event-driven workflow with branching, retries, and parallel paths. Which service fits BEST?',
    options: ['Lambda chained via SNS',
              'Step Functions (Standard)',
              'SQS FIFO',
              'EventBridge alone'],
    answer: 1,
    learningTopic: { categoryId: 'app', topicId: 'c10-t4' },
  }),
  q('sap-004', {
    certIds: ['sap-c02'], domainIds: ['sap-d3'], difficulty: 'hard', service: ['vpc', 'tgw'],
    q: 'Two accounts (Prod + Shared Services) need centralized egress through a single inspection VPC. Which design?',
    options: ['NAT in each VPC',
              'Transit Gateway with route table forcing default route to inspection VPC',
              'PrivateLink',
              'Public IPs on workloads'],
    answer: 1,
    learningTopic: { categoryId: 'net', topicId: 'c4-t8' },
  }),
  q('sap-005', {
    certIds: ['sap-c02'], domainIds: ['sap-d2'], difficulty: 'hard', service: ['route53', 'cloudfront'],
    q: 'For sub-100ms global API access with static IPs for firewall whitelisting, which combination?',
    options: ['CloudFront + WAF only',
              'Global Accelerator + ALB',
              'Route 53 Latency only',
              'API Gateway with custom domain'],
    answer: 1,
    why: 'GA gives 2 static anycast IPs + AWS backbone routing — meets the firewall whitelisting + latency requirements.',
    learningTopic: { categoryId: 'net', topicId: 'c4-t10' },
  }),
  q('sap-006', {
    certIds: ['sap-c02'], domainIds: ['sap-d1'], difficulty: 'hard', service: ['iam'], type: 'multi',
    q: 'Which mechanisms can centrally enforce that no IAM user is ever created in a member account? (choose 2)',
    options: ['SCP denying iam:CreateUser',
              'Per-account IAM password policy',
              'AWS Config rule + auto-remediation',
              'CloudFormation deletion policy'],
    answer: [0, 2],
    learningTopic: { categoryId: 'sec', topicId: 'c5-t7' },
  }),
];

const DOP = [
  q('dop-001', {
    certIds: ['dop-c02'], domainIds: ['dop-d1'], difficulty: 'hard', service: ['codepipeline', 'codedeploy'],
    q: 'Your CodeDeploy blue/green deploys to ECS often roll back due to failed canary tests. Which signal best triggers automatic rollback?',
    options: ['Manual rollback only',
              'CloudWatch alarm on canary test failures wired to CodeDeploy alarm rollback',
              'Wait then retry',
              'Restart cluster'],
    answer: 1,
    learningTopic: { categoryId: 'dev', topicId: 'c8-t1' },
  }),
  q('dop-002', {
    certIds: ['dop-c02'], domainIds: ['dop-d2'], difficulty: 'medium', service: ['cdk'],
    q: 'CDK constructs come in three layers — L1, L2, L3. Which is the curated, AWS-best-practice high-level construct?',
    options: ['L1', 'L2', 'L3', 'L0'],
    answer: 1,
    learningTopic: { categoryId: 'dev', topicId: 'c8-t2' },
  }),
  q('dop-003', {
    certIds: ['dop-c02'], domainIds: ['dop-d3'], difficulty: 'hard', service: ['asg'],
    q: 'A stateful app on ASG loses sessions during scale-in. Which feature ensures graceful drainage?',
    options: ['Lifecycle hook for terminating instances',
              'Reduce ASG min size',
              'Disable health checks',
              'Use static EC2'],
    answer: 0,
    learningTopic: { categoryId: 'cmp', topicId: 'c2-t2' },
  }),
  q('dop-004', {
    certIds: ['dop-c02'], domainIds: ['dop-d4'], difficulty: 'medium', service: ['cloudwatch'],
    q: 'Which CloudWatch logs feature provides SQL-like ad-hoc querying over log streams?',
    options: ['Metric Filters', 'CloudWatch Logs Insights',
              'CloudWatch Synthetics', 'OAM'],
    answer: 1,
    learningTopic: { categoryId: 'obs', topicId: 'c7-t3' },
  }),
  q('dop-005', {
    certIds: ['dop-c02'], domainIds: ['dop-d5'], difficulty: 'hard', service: ['eventbridge'],
    q: 'You need automated response to a GuardDuty finding. Which is the most direct chain?',
    options: ['GuardDuty → CloudWatch Alarm → SNS',
              'GuardDuty → EventBridge rule → Lambda',
              'GuardDuty → S3 → SQS',
              'GuardDuty → IAM directly'],
    answer: 1,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t3' },
  }),
  q('dop-006', {
    certIds: ['dop-c02'], domainIds: ['dop-d6'], difficulty: 'medium', service: ['kms'], type: 'tf',
    q: 'TRUE OR FALSE: With CodeBuild + Secrets Manager, you can inject DB credentials into the build environment without storing them in environment variables in the buildspec.',
    options: ['True', 'False'],
    answer: 0,
    learningTopic: { categoryId: 'dev', topicId: 'c8-t1' },
  }),
];

const SCS = [
  q('scs-001', {
    certIds: ['scs-c02'], domainIds: ['scs-d1'], difficulty: 'medium', service: ['guardduty'],
    q: 'GuardDuty produces a finding for an EC2 communicating with a known Bitcoin mining pool. First containment action?',
    options: ['Stop the instance',
              'Isolate via security group with no rules + snapshot for forensics',
              'Delete the instance',
              'Rotate the SSH key'],
    answer: 1,
    why: 'Forensics-friendly isolation: snapshot then quarantine, do NOT delete (loses evidence).',
    learningTopic: { categoryId: 'sec', topicId: 'c5-t3' },
  }),
  q('scs-002', {
    certIds: ['scs-c02'], domainIds: ['scs-d3'], difficulty: 'hard', service: ['waf', 'cloudfront'],
    q: 'You need to block a botnet hitting only the /login path. Which is most precise?',
    options: ['NACL deny all',
              'WAF rate-based rule scoped to /login',
              'Disable CloudFront',
              'Block via IAM'],
    answer: 1,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t4' },
  }),
  q('scs-003', {
    certIds: ['scs-c02'], domainIds: ['scs-d4'], difficulty: 'medium', service: ['iam'],
    q: 'Which mechanism enforces "max-permissions ceiling" on a user regardless of attached policies?',
    options: ['IAM Permission Boundary', 'SCP',
              'Resource policy', 'Trust policy'],
    answer: 0,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t1' },
  }),
  q('scs-004', {
    certIds: ['scs-c02'], domainIds: ['scs-d5'], difficulty: 'medium', service: ['kms'],
    q: 'A customer-managed KMS key must be usable from a second AWS account. What\'s needed?',
    options: ['Cross-account IAM role + grant or key policy referencing the second account',
              'Public key',
              'Copy the key',
              'Cross-region replication'],
    answer: 0,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t2' },
  }),
  q('scs-005', {
    certIds: ['scs-c02'], domainIds: ['scs-d2'], difficulty: 'medium', service: ['cloudtrail'],
    q: 'Which combination prevents tampering with CloudTrail logs in S3?',
    options: ['S3 versioning + bucket policy + log file validation',
              'IAM only',
              'NACL deny',
              'CloudWatch Alarm'],
    answer: 0,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t6' },
  }),
  q('scs-006', {
    certIds: ['scs-c02'], domainIds: ['scs-d6'], difficulty: 'medium', service: ['config'],
    q: 'You need continuous evaluation that every S3 bucket has encryption + BPA. Which service?',
    options: ['Config + managed rules',
              'IAM Access Analyzer',
              'GuardDuty',
              'Macie'],
    answer: 0,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t6' },
  }),
];

const ANS = [
  q('ans-001', {
    certIds: ['ans-c01'], domainIds: ['ans-d1'], difficulty: 'hard', service: ['dx'],
    q: 'On Direct Connect with two connections, you observe asymmetric routing. Which fix is most CORRECT?',
    options: ['Disable BGP',
              'Use AS-path prepend or local preference to force symmetric routing',
              'Lower MTU',
              'Move to VPN'],
    answer: 1,
    learningTopic: { categoryId: 'net', topicId: 'c4-t14' },
  }),
  q('ans-002', {
    certIds: ['ans-c01'], domainIds: ['ans-d2'], difficulty: 'hard', service: ['tgw'],
    q: 'You want east-west isolation between Prod and Dev VPCs via a single Transit Gateway. What\'s the cleanest approach?',
    options: ['Separate TGWs',
              'Single TGW with separate TGW route tables per environment',
              'NACL',
              'PrivateLink'],
    answer: 1,
    learningTopic: { categoryId: 'net', topicId: 'c4-t8' },
  }),
  q('ans-003', {
    certIds: ['ans-c01'], domainIds: ['ans-d3'], difficulty: 'medium', service: ['vpc'],
    q: 'Which AWS feature gives you full packet capture into a 3rd-party IDS in another VPC?',
    options: ['VPC Flow Logs', 'Traffic Mirroring',
              'CloudWatch Logs', 'Reachability Analyzer'],
    answer: 1,
    learningTopic: { categoryId: 'net', topicId: 'c4-t20' },
  }),
  q('ans-004', {
    certIds: ['ans-c01'], domainIds: ['ans-d4'], difficulty: 'hard', service: ['cloudfront', 'waf'],
    q: 'A geo-distributed app must block traffic from sanctioned countries AND scrape attempts globally. Which combo?',
    options: ['CloudFront geo-restriction + WAF with rate-based + IP set + bot control managed rule',
              'NACL only',
              'Security Group',
              'IAM policy'],
    answer: 0,
    learningTopic: { categoryId: 'sec', topicId: 'c5-t4' },
  }),
  q('ans-005', {
    certIds: ['ans-c01'], domainIds: ['ans-d1'], difficulty: 'hard', service: ['route53'], type: 'multi',
    q: 'For hybrid DNS where on-prem resolvers query AWS Private Hosted Zones, which are correct? (choose 2)',
    options: ['Route 53 Resolver Inbound Endpoint',
              'Public DNS',
              'Route 53 Resolver Outbound Endpoint with forwarding rules for on-prem zones',
              'Use Cognito'],
    answer: [0, 2],
    learningTopic: { categoryId: 'net', topicId: 'c4-t3' },
  }),
  q('ans-006', {
    certIds: ['ans-c01'], domainIds: ['ans-d2'], difficulty: 'medium', service: ['eip'],
    q: 'Which is true about Elastic IPs (EIPs)?',
    options: ['Free even if unattached',
              'Cost a small hourly fee when unattached',
              'Auto-released after 5 days idle',
              'Region-independent'],
    answer: 1,
    learningTopic: { categoryId: 'net', topicId: 'c4-t1' },
  }),
];

const DBS = [
  q('dbs-001', {
    certIds: ['dbs-c01'], domainIds: ['dbs-d1'], difficulty: 'medium', service: ['dynamodb'],
    q: 'A workload needs single-digit-ms reads at any scale with predictable cost. Which DB?',
    options: ['RDS MySQL', 'DynamoDB',
              'Redshift', 'Neptune'],
    answer: 1,
    learningTopic: { categoryId: 'db', topicId: 'c6-t4' },
  }),
  q('dbs-002', {
    certIds: ['dbs-c01'], domainIds: ['dbs-d2'], difficulty: 'hard', service: ['dms'],
    q: 'For a homogeneous Oracle → Oracle migration, which tool is required?',
    options: ['Just DMS', 'SCT + DMS',
              'CloudEndure', 'Snowball'],
    answer: 0,
    why: 'Homogeneous migrations don\'t need schema conversion. DMS handles it.',
    learningTopic: { categoryId: 'db', topicId: 'c6-t8' },
  }),
  q('dbs-003', {
    certIds: ['dbs-c01'], domainIds: ['dbs-d4'], difficulty: 'medium', service: ['rds'],
    q: 'Aurora replica lag spiked from 50ms to 5s. First diagnostic?',
    options: ['Network failure', 'Long-running transactions or large DDL on primary',
              'Region down', 'DNS'],
    answer: 1,
    learningTopic: { categoryId: 'db', topicId: 'c6-t3' },
  }),
  q('dbs-004', {
    certIds: ['dbs-c01'], domainIds: ['dbs-d5'], difficulty: 'medium', service: ['rds'],
    q: 'IAM database authentication is supported on which engines?',
    options: ['MySQL + PostgreSQL on RDS/Aurora', 'Only Aurora MySQL',
              'Only PostgreSQL', 'All RDS engines'],
    answer: 0,
    learningTopic: { categoryId: 'db', topicId: 'c6-t2' },
  }),
  q('dbs-005', {
    certIds: ['dbs-c01'], domainIds: ['dbs-d3'], difficulty: 'medium', service: ['rds'], type: 'tf',
    q: 'TRUE OR FALSE: RDS Multi-AZ standby is readable.',
    options: ['True', 'False'],
    answer: 1,
    why: 'Multi-AZ standby is NOT readable. Read Replicas are.',
    learningTopic: { categoryId: 'db', topicId: 'c6-t2' },
  }),
];

const MLS = [
  q('mls-001', {
    certIds: ['mls-c01'], domainIds: ['mls-d3'], difficulty: 'hard', service: ['sagemaker'],
    q: 'You have heavily imbalanced classes (95/5). Which is most likely to help?',
    options: ['Class weighting / SMOTE oversampling',
              'Smaller batch size',
              'Bigger instance',
              'More epochs'],
    answer: 0,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
  q('mls-002', {
    certIds: ['mls-c01'], domainIds: ['mls-d4'], difficulty: 'medium', service: ['sagemaker'],
    q: 'For batch scoring of 10M rows monthly, cheapest option?',
    options: ['Real-time endpoint',
              'Batch Transform',
              'Multi-model endpoint',
              'Provisioned Concurrency'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t7' },
  }),
  q('mls-003', {
    certIds: ['mls-c01'], domainIds: ['mls-d2'], difficulty: 'medium', service: ['sagemaker'],
    q: 'Which SageMaker algorithm is best for time-series forecasting out of the box?',
    options: ['XGBoost', 'DeepAR', 'Linear Learner', 'BlazingText'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
  q('mls-004', {
    certIds: ['mls-c01'], domainIds: ['mls-d1'], difficulty: 'medium', service: ['s3'],
    q: 'You want training to read terabytes from S3 with parallel streams rather than downloading first. Which mode?',
    options: ['Pipe mode (or FastFile)', 'File mode',
              'Local mode', 'Spot mode'],
    answer: 0,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
  q('mls-005', {
    certIds: ['mls-c01'], domainIds: ['mls-d3'], difficulty: 'hard', service: ['sagemaker'], type: 'multi',
    q: 'Which hyperparameter tuning strategies does SageMaker offer? (choose 2)',
    options: ['Bayesian', 'Random', 'Grid (managed)', 'Genetic'],
    answer: [0, 1],
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
];

const AIF = [
  q('aif-001', {
    certIds: ['aif-c01'], domainIds: ['aif-d1'], difficulty: 'easy',
    q: 'Which is a SUPERVISED learning task?',
    options: ['Clustering customers',
              'Spam classification with labeled emails',
              'Anomaly detection without labels',
              'Dimensionality reduction'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t1' },
  }),
  q('aif-002', {
    certIds: ['aif-c01'], domainIds: ['aif-d2'], difficulty: 'easy', service: ['bedrock'],
    q: 'Which AWS service provides API access to multiple foundation models from different providers?',
    options: ['SageMaker JumpStart', 'Amazon Bedrock',
              'Rekognition', 'Comprehend'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t2' },
  }),
  q('aif-003', {
    certIds: ['aif-c01'], domainIds: ['aif-d3'], difficulty: 'medium', service: ['bedrock'],
    q: 'Which Bedrock feature manages document chunking + vector storage for RAG?',
    options: ['Agents', 'Knowledge Bases',
              'Guardrails', 'Studio'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t5' },
  }),
  q('aif-004', {
    certIds: ['aif-c01'], domainIds: ['aif-d4'], difficulty: 'medium',
    q: 'A model produces biased outputs for one demographic. Which AWS service detects bias in model predictions?',
    options: ['SageMaker Clarify', 'Bedrock', 'Rekognition', 'Comprehend'],
    answer: 0,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t6' },
  }),
  q('aif-005', {
    certIds: ['aif-c01'], domainIds: ['aif-d5'], difficulty: 'medium', service: ['bedrock'],
    q: 'Which Bedrock feature filters out PII and harmful topics in responses?',
    options: ['Knowledge Bases', 'Guardrails', 'Agents', 'Studio'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t6' },
  }),
  q('aif-006', {
    certIds: ['aif-c01'], domainIds: ['aif-d2'], difficulty: 'easy',
    q: 'What is "prompt engineering"?',
    options: ['Writing CSS',
              'Crafting effective inputs to elicit better outputs from a foundation model',
              'Tuning hyperparameters',
              'Compiling code'],
    answer: 1,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t2' },
  }),
  q('aif-007', {
    certIds: ['aif-c01'], domainIds: ['aif-d3'], difficulty: 'medium', type: 'tf',
    q: 'TRUE OR FALSE: RAG can ground a foundation model\'s responses in your private documents without retraining the model.',
    options: ['True', 'False'],
    answer: 0,
    learningTopic: { categoryId: 'ai', topicId: 'c9-t5' },
  }),
];

// ====================================================================
// Master pool
// ====================================================================
// EX-01: pull in the premium V2 question pool (scenario-based, 4-paragraph
// explanations, level + topic tagging). Legacy questions remain — V2 just
// extends the pool so selectors return a richer mix.
import { QUESTION_BANK_V2 } from './questionBankV2.js';
// EX-04: extra 30 SAA-C03 scenario questions covering VPC/EC2/X-Ray/RDS/etc.
import { SAA_V2_EXTRAS } from './questionBankV2_saaExtras.js';
// EX-06: another 50 SAA-C03 scenarios — bulk expansion across every topic.
import { SAA_V2_BULK } from './questionBankV2_saaBulk.js';
// EX-07: +100 SAA-C03 scenarios — targets underserved topics (SNS/IAM/KMS/ECS/EKS/Aurora/ElastiCache/Kinesis/Glue/Athena/Redshift/DX/TGW/WAF/Secrets/Step/CloudWatch/EventBridge/Config/CloudTrail/Bedrock).
import { SAA_V2_MEGA } from './questionBankV2_saaMega.js';
// EX-08: +80 multi-service combo scenarios (real-exam style — every Q spans multiple services).
import { SAA_V2_COMBO } from './questionBankV2_saaCombo.js';
// EX-09 batch 1: +80 more SAA topic-pure scenarios (EC2/S3/VPC/RDS/Lambda/DDB/ALB/ASG/CF/R53).
import { SAA_V2_XL } from './questionBankV2_saaXL.js';
// EX-17 fill batches: bring every thin topic to ≥20 questions.
import { SAA_V2_FILL } from './questionBankV2_saaFill.js';
import { SAA_V2_FILL2 } from './questionBankV2_saaFill2.js';
// EX-21: 40 MULTIPLE-RESPONSE ("choose TWO") scenarios. The bank previously
// held only 2 multi-answer questions against an exam that mixes them in
// heavily, so practice did not match the real format.
import { SAA_V2_MULTI } from './questionBankV2_saaMulti.js';

export const QUESTION_BANK = [
  ...QUESTION_BANK_V2,
  ...SAA_V2_EXTRAS,
  ...SAA_V2_BULK,
  ...SAA_V2_MEGA,
  ...SAA_V2_COMBO,
  ...SAA_V2_XL,
  ...SAA_V2_FILL,
  ...SAA_V2_FILL2,
  ...SAA_V2_MULTI,
  ...CLF, ...SAA, ...DVA, ...SOA, ...DEA, ...MLA,
  ...SAP, ...DOP, ...SCS, ...ANS, ...DBS, ...MLS, ...AIF,
];

// ---------- helpers ----------

// EX-03 perf: cache results per cert/domain because the bank has 1700+ items
// and these are called dozens of times per render in the Exam pages. Cache
// keys are immutable strings so no invalidation is needed at runtime.
const _certCache = new Map();
const _domainCache = new Map();

export function questionsForCert(certId) {
  if (_certCache.has(certId)) return _certCache.get(certId);
  const out = QUESTION_BANK.filter((q) => q.certIds.includes(certId));
  _certCache.set(certId, out);
  return out;
}

export function questionsForDomain(certId, domainId) {
  const key = `${certId}::${domainId}`;
  if (_domainCache.has(key)) return _domainCache.get(key);
  const out = QUESTION_BANK.filter((q) =>
    q.certIds.includes(certId) && q.domainIds.includes(domainId));
  _domainCache.set(key, out);
  return out;
}

// Deterministic mulberry32 PRNG so test+rotation feel "random" but are
// repeatable within a single attempt (key by attemptId).
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, seed) {
  const out = arr.slice();
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick exam questions for a cert attempt.
 *  - Tries to respect domain weights (proportional sample if possible).
 *  - Avoids questions already used in the SAME attempt (no duplicates).
 *  - Pads from the broader pool if the cert pool isn't large enough.
 */
/**
 * Target share of multiple-response ("choose TWO/THREE") questions in a
 * generated exam. The real SAA-C03 mixes them in at roughly this rate, and
 * they are where most candidates lose marks because partial credit does not
 * exist. Sampling purely at random from the pool under-represents them
 * badly (the pool is ~6% multi), so the selector reserves a share instead.
 */
const MULTI_RESPONSE_TARGET_RATIO = 0.25;

const isMulti = (q) => q.type === 'multi' && Array.isArray(q.answer) && q.answer.length > 1;

/**
 * Take up to `n` questions from `list`, reserving `ratio` of them for
 * multiple-response format where the list has enough of them. Falls back to
 * single-answer questions rather than returning short.
 */
function sampleWithFormatMix(list, n, seed, ratio) {
  if (n <= 0 || list.length === 0) return [];
  const multi = list.filter(isMulti);
  const single = list.filter((q) => !isMulti(q));

  const wantMulti = Math.min(multi.length, Math.round(n * ratio));
  const pickedMulti = seededShuffle(multi, seed).slice(0, wantMulti);
  const pickedSingle = seededShuffle(single, seed + 1).slice(0, n - pickedMulti.length);

  // If single-answer ran short, backfill with any remaining multi
  const out = [...pickedMulti, ...pickedSingle];
  if (out.length < n) {
    const usedIds = new Set(out.map((q) => q.id));
    out.push(...multi.filter((q) => !usedIds.has(q.id)).slice(0, n - out.length));
  }
  return out;
}

export function pickExamQuestions({
  cert, count, seed = Date.now(), filters = {},
  multiRatio = MULTI_RESPONSE_TARGET_RATIO,
}) {
  const pool = questionsForCert(cert.id).filter((q) =>
    (!filters.difficulty || q.difficulty === filters.difficulty) &&
    (!filters.domainId || q.domainIds.includes(filters.domainId)) &&
    (!filters.service || (q.service || []).includes(filters.service))
  );
  if (pool.length === 0) return [];

  // Proportional-by-domain sampling if pool is larger than target count
  if (!filters.domainId && pool.length >= count) {
    const out = [];
    const used = new Set();
    for (const dom of cert.domains) {
      const share = Math.max(1, Math.round((dom.weight / 100) * count));
      const fromDom = pool.filter((q) => q.domainIds.includes(dom.id) && !used.has(q.id));
      const chosen = sampleWithFormatMix(fromDom, share, seed + hashId(dom.id), multiRatio);
      for (const q of chosen) { out.push(q); used.add(q.id); }
    }
    // Top up if rounding came up short
    if (out.length < count) {
      const remaining = pool.filter((q) => !used.has(q.id));
      const extras = seededShuffle(remaining, seed + 99).slice(0, count - out.length);
      out.push(...extras);
    }
    // Trim + shuffle final order
    return seededShuffle(out, seed + 7).slice(0, count);
  }

  // Single-domain or small-pool path — still honour the format mix
  return seededShuffle(sampleWithFormatMix(pool, count, seed, multiRatio), seed + 3);
}

function hashId(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}
