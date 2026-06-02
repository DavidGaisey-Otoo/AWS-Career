/**
 * questionBankV2.js — premium scenario-based exam questions sourced from
 * the same caliber as the real AWS practice exams (CLF-C02, SAA-C03).
 *
 * EX-01 spec compliance — every question carries:
 *   • scenario:  a multi-sentence real-world scenario (not a definition lookup)
 *   • options:   EXACTLY 4 — A, B, C, D
 *   • answer:    index of the correct option
 *   • why:       why the correct answer is correct (≥ 2 sentences)
 *   • wrongReasons[idx]: WHY each wrong option is wrong (≥ 1 sentence each)
 *   • concept:   one-line "which AWS concept this tests"
 *   • level:     'Foundational' | 'Associate' | 'Professional'
 *   • topic:     'Storage' | 'Compute' | 'Security' | 'Networking' | 'Database' | 'Pricing' | 'Monitoring' | 'Integration' | 'Migration' | 'Analytics' | 'ML/AI'
 *   • docs:      AWS documentation deep link
 *   • lastVerified: ISO date the source content was checked
 *
 * Schema is a strict SUPERSET of questionBank.js — every legacy field still
 * works, so the existing QuestionRenderer + selectors keep working unchanged.
 *
 * Authoring source: SAA-C03 practice dumps + AWS official slide decks (CCP v38, SAA v43).
 */

// EX-01: difficulty + topic constants
const FOUNDATIONAL = 'Foundational';
const ASSOCIATE    = 'Associate';
const PROFESSIONAL = 'Professional';

const T = {
  STORAGE:     'Storage',
  COMPUTE:     'Compute',
  SECURITY:    'Security',
  NETWORKING:  'Networking',
  DATABASE:    'Database',
  PRICING:     'Pricing',
  MONITORING:  'Monitoring',
  INTEGRATION: 'Integration',
  MIGRATION:   'Migration',
  ANALYTICS:   'Analytics',
  ML_AI:       'ML/AI',
};

/**
 * Compact factory — fills sensible defaults + keeps each question entry tight.
 */
function pq(id, q) {
  // Map "level" to legacy "difficulty" so existing selectors keep working
  const legacyDifficulty =
    q.level === 'Foundational' ? 'easy' :
    q.level === 'Associate'    ? 'medium' :
    q.level === 'Professional' ? 'hard' : 'medium';
  return {
    id,
    certIds:    q.certIds,
    domainIds:  q.domainIds || [],
    difficulty: legacyDifficulty,
    service:    q.service || [],
    type:       'single',
    q:          q.scenario,
    options:    q.options,
    answer:     q.answer,
    why:        q.why,
    wrongReasons: q.wrongReasons || {},
    docs:       q.docs || null,
    // NEW EX-01 fields
    level:      q.level,
    topic:      q.topic,
    concept:    q.concept,
    learningTopic: q.learningTopic || null,
    lastVerified:  q.lastVerified || '2026-05-24',
  };
}

// ════════════════════════════════════════════════════════════════════════
// CLOUD PRACTITIONER (CLF-C02) — Foundational
// ════════════════════════════════════════════════════════════════════════

const CLF_V2 = [
  pq('clfv2-001', {
    certIds: ['clf-c02'], domainIds: ['clf-d1'],
    level: FOUNDATIONAL, topic: T.PRICING, service: ['pricing'],
    scenario: 'A startup builds a new application that experiences highly variable, unpredictable traffic — some days hundreds of requests, other days tens of thousands. The CFO wants to avoid paying for idle capacity. Which AWS pricing principle best supports this requirement?',
    options: [
      'Reserved Instances — commit to 1 or 3 years for a discount',
      'Pay-as-you-go — pay only for the compute you actually consume',
      'Dedicated Hosts — pay a flat monthly fee for a physical server',
      'Spot Instances — bid on unused capacity',
    ],
    answer: 1,
    why: 'Pay-as-you-go is the core cloud-economics principle: you are charged only for resources actually used, with no upfront commitment. For unpredictable workloads it is the safest default — costs naturally scale up and down with demand. The CFO never pays for idle capacity because there IS no reservation.',
    wrongReasons: {
      0: 'Reserved Instances require a 1- or 3-year commitment and assume steady, predictable usage — the opposite of this scenario.',
      2: 'Dedicated Hosts charge a flat monthly fee whether you use the host or not, so idle capacity is paid for.',
      3: 'Spot Instances are great for fault-tolerant batch workloads but can be reclaimed with 2-minute notice, making them unsuitable for unpredictable user-facing traffic.',
    },
    concept: 'Cloud pricing models — on-demand vs reserved vs spot.',
    docs: 'https://aws.amazon.com/pricing/',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t5' },
  }),

  pq('clfv2-002', {
    certIds: ['clf-c02'], domainIds: ['clf-d2'],
    level: FOUNDATIONAL, topic: T.SECURITY, service: ['iam', 'shared-responsibility'],
    scenario: 'An organisation migrates a Linux web application to Amazon EC2. Their security team asks who is responsible for installing OS security patches on the EC2 instances. According to the AWS Shared Responsibility Model, who patches the guest operating system?',
    options: [
      'AWS — Amazon patches all EC2 OSes automatically',
      'The customer — security IN the cloud includes guest OS patching',
      'The OS vendor (Red Hat, Canonical) — they patch via their own channel',
      'Split responsibility — AWS patches kernels, the customer patches userland',
    ],
    answer: 1,
    why: 'The Shared Responsibility Model splits duties into "security OF the cloud" (AWS — hardware, hypervisor, facilities) and "security IN the cloud" (customer — guest OS, applications, data, IAM). EC2 is an Infrastructure-as-a-Service offering, so the guest OS lives inside the customer\'s responsibility boundary. The customer must apply OS patches via tools like Systems Manager Patch Manager.',
    wrongReasons: {
      0: 'AWS only manages the hypervisor and physical hardware on EC2 — not the guest OS.',
      2: 'OS vendors publish patches, but applying them to a customer\'s running instance is the customer\'s job.',
      3: 'There is no kernel/userland split in the Shared Responsibility Model — the entire guest OS sits with the customer.',
    },
    concept: 'AWS Shared Responsibility Model — who patches the guest OS on EC2.',
    docs: 'https://aws.amazon.com/compliance/shared-responsibility-model/',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t4' },
  }),

  pq('clfv2-003', {
    certIds: ['clf-c02'], domainIds: ['clf-d2'],
    level: FOUNDATIONAL, topic: T.SECURITY, service: ['iam'],
    scenario: 'A new junior engineer joins the platform team and needs the ability to launch EC2 instances and read CloudWatch logs, but should NOT be able to delete S3 buckets. Following AWS best practices, how should the engineering lead grant this access?',
    options: [
      'Share the root account credentials with the engineer',
      'Create an IAM user, attach a policy that allows the specific actions, and enable MFA',
      'Create a new AWS account, give the engineer admin access there, and link the accounts',
      'Send the engineer the company\'s AWS access key over email',
    ],
    answer: 1,
    why: 'IAM users with least-privilege policies are the AWS-recommended pattern for individual humans needing console + API access. Attaching a policy that allows ONLY the actions required (ec2:RunInstances, logs:DescribeLogStreams, etc.) follows least privilege. Enabling MFA on the IAM user protects against credential theft.',
    wrongReasons: {
      0: 'The root user has unrestricted, unrevocable power and must never be shared or used for daily work.',
      2: 'Creating a new account just for one user is heavy-handed and breaks the least-privilege principle by giving admin where it isn\'t needed.',
      3: 'Sending credentials by email exposes them in plain text and offers no rotation or audit trail.',
    },
    concept: 'IAM users + least-privilege policies + MFA for human identities.',
    docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t4' },
  }),

  pq('clfv2-004', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'],
    level: FOUNDATIONAL, topic: T.NETWORKING, service: ['regions', 'az'],
    scenario: 'A company hosts a healthcare application that must remain available even if an entire data center fails. They are designing the deployment in AWS. Which design pattern best meets the requirement?',
    options: [
      'Deploy across multiple AWS Regions',
      'Deploy across multiple Availability Zones within a single Region',
      'Deploy across multiple subnets in a single Availability Zone',
      'Deploy in a single Edge Location for the lowest latency',
    ],
    answer: 1,
    why: 'Availability Zones are physically isolated data centers within a single Region, each with independent power, cooling, and networking. Deploying across multiple AZs survives a single-data-center failure while keeping latency low (single-millisecond) and avoiding cross-region data-transfer costs. Multi-Region is usually reserved for stricter disaster-recovery requirements.',
    wrongReasons: {
      0: 'Multi-Region adds significant cost + latency + replication complexity, more than is needed to survive one data centre failure.',
      2: 'All subnets in a single AZ share the same data centre — if the AZ fails, all subnets in it fail.',
      3: 'Edge Locations are CloudFront caches, not full compute environments — you cannot run an application there.',
    },
    concept: 'Multi-AZ high availability vs Multi-Region disaster recovery.',
    docs: 'https://aws.amazon.com/about-aws/global-infrastructure/',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t2' },
  }),

  pq('clfv2-005', {
    certIds: ['clf-c02'], domainIds: ['clf-d4'],
    level: FOUNDATIONAL, topic: T.PRICING, service: ['billing', 'budgets'],
    scenario: 'A small business has an AWS account that is part of an Organization. The finance team wants to receive an email alert whenever spending in a given month exceeds $200. They want to set this up with the least operational overhead. Which AWS service should they use?',
    options: [
      'AWS Cost Explorer — review charts each morning',
      'AWS Budgets — define a $200 monthly budget and notification subscriber',
      'AWS CloudTrail — log every spending API call to S3',
      'Amazon CloudWatch metric filter on the billing log group',
    ],
    answer: 1,
    why: 'AWS Budgets is the purpose-built service for proactive cost-threshold alerts. You define a monthly amount, an actual-vs-forecast threshold, and one or more email subscribers — AWS emails them when the threshold is crossed. The first 2 budgets are free per account.',
    wrongReasons: {
      0: 'Cost Explorer is for visualisation and analysis; it doesn\'t push notifications automatically.',
      2: 'CloudTrail logs API calls (audit trail) — it does not track spending or send cost alerts.',
      3: 'CloudWatch metric filters could in theory be wired to billing metrics, but require enabling billing alarms in us-east-1 + SNS + IAM — far more setup than Budgets.',
    },
    concept: 'AWS Budgets for proactive cost-threshold alerts.',
    docs: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t5' },
  }),

  pq('clfv2-006', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'],
    level: FOUNDATIONAL, topic: T.STORAGE, service: ['s3'],
    scenario: 'A media company stores 50 TB of finished films. The films are accessed less than once a year for archival re-publishing but must be retrievable within 12 hours. Cost is the top concern. Which S3 storage class should they choose?',
    options: [
      'S3 Standard — instant access',
      'S3 Standard-Infrequent Access — milliseconds access',
      'S3 Glacier Flexible Retrieval — minutes-to-hours retrieval',
      'S3 Glacier Deep Archive — 12-hour retrieval, lowest cost',
    ],
    answer: 3,
    why: 'S3 Glacier Deep Archive is the lowest-cost S3 storage class (~$0.00099/GB/month, ~$1/TB/month) and is purpose-built for long-term archival where data is accessed less than once a year. Standard retrieval takes up to 12 hours — exactly matching the company\'s SLA requirement. Storage cost beats every other class by 4-23×.',
    wrongReasons: {
      0: 'S3 Standard at ~$0.023/GB/month is ~23× more expensive than Glacier Deep Archive — wasted spend for once-a-year data.',
      1: 'S3 Standard-IA at ~$0.0125/GB/month is still ~12× more expensive than Glacier Deep Archive and has a retrieval fee per GB.',
      2: 'Glacier Flexible Retrieval is cheaper than S3 IA but still ~4× more expensive than Deep Archive — overkill when 12-hour retrieval is acceptable.',
    },
    concept: 'S3 storage classes — cost vs retrieval-time tradeoff.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html',
    learningTopic: { categoryId: 'cf', topicId: 'c1-t3' },
  }),

  pq('clfv2-007', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'],
    level: FOUNDATIONAL, topic: T.COMPUTE, service: ['lambda', 'ec2'],
    scenario: 'A developer writes a simple image-resize function. The function runs only when a user uploads a photo (about 200 uploads per day, each taking ~2 seconds). The developer does not want to manage any servers. Which service is most cost-effective?',
    options: [
      'Amazon EC2 — launch a t3.micro instance and run the function in a Node service',
      'AWS Lambda — invoked on each S3 PUT event',
      'Amazon ECS Fargate — deploy a container that exposes the function',
      'AWS Elastic Beanstalk — managed application platform on EC2',
    ],
    answer: 1,
    why: 'Lambda is event-driven serverless compute, billed per millisecond of execution. At 200 invocations × 2 seconds × tiny memory, the entire workload fits comfortably inside the 1 million-requests-per-month perpetual free tier — total monthly cost ≈ $0. No servers to manage and it scales automatically with upload volume.',
    wrongReasons: {
      0: 'A t3.micro EC2 instance runs 24/7 and costs ~$8/month even when idle — wasteful for 400 seconds/day of work.',
      2: 'Fargate has a ~$30/month floor for keeping a single small task always-on — far above Lambda\'s actual usage cost.',
      3: 'Elastic Beanstalk provisions EC2 + Load Balancer under the hood — same 24/7 cost problem as option A, plus added complexity.',
    },
    concept: 'When to choose serverless (Lambda) over server-based compute.',
    docs: 'https://aws.amazon.com/lambda/pricing/',
    learningTopic: { categoryId: 'cf', topicId: 'c2-t1' },
  }),

  pq('clfv2-008', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'],
    level: FOUNDATIONAL, topic: T.MONITORING, service: ['cloudwatch', 'cloudtrail'],
    scenario: 'A security auditor needs to know exactly which IAM user terminated a production EC2 instance last Friday afternoon. Which AWS service contains this information?',
    options: [
      'Amazon CloudWatch Metrics — graphs of CPU and network usage',
      'AWS CloudTrail — audit log of every AWS API call made',
      'AWS Config — current and historical resource configurations',
      'Amazon Inspector — vulnerability scans of EC2 instances',
    ],
    answer: 1,
    why: 'CloudTrail captures the full audit log of every AWS API call: WHO called WHAT API, on WHICH resource, WHEN, and from which IP. A `TerminateInstances` call records the calling IAM ARN, the instance ID, the timestamp, and source IP — exactly what an auditor needs. The first management-events trail in each region is free.',
    wrongReasons: {
      0: 'CloudWatch Metrics show resource-level metrics (CPU, network) — not who took an action.',
      2: 'AWS Config tracks resource state and changes over time but does not store the IAM identity that made the change in the same audit-grade way.',
      3: 'Inspector scans for vulnerabilities in EC2 / Lambda / container images — it has no audit trail of user actions.',
    },
    concept: 'CloudTrail as the AWS API audit log.',
    docs: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html',
    learningTopic: { categoryId: 'cf', topicId: 'c2-t6' },
  }),

  pq('clfv2-009', {
    certIds: ['clf-c02'], domainIds: ['clf-d4'],
    level: FOUNDATIONAL, topic: T.PRICING, service: ['support'],
    scenario: 'A company uses AWS to run a customer-facing SaaS product. They want 24/7 phone access to AWS support engineers with a < 1-hour response time for production-down issues, but do not need a Technical Account Manager. Which support plan best fits?',
    options: [
      'Basic Support — free',
      'Developer Support — $29/month',
      'Business Support — starts at $100/month',
      'Enterprise On-Ramp Support — starts at $5,500/month',
    ],
    answer: 2,
    why: 'Business Support is the lowest tier with 24/7 phone, chat, and email access plus a < 1-hour response SLA for production-down issues. It also includes full Trusted Advisor checks. It is the right fit for a customer-facing SaaS product without the larger Enterprise cost commitment.',
    wrongReasons: {
      0: 'Basic Support has no technical support — only account/billing help.',
      1: 'Developer Support offers only email support during business hours, no 24/7 access.',
      3: 'Enterprise On-Ramp adds a pool TAM and stricter SLAs (< 30 min for business-critical) — overkill for the stated needs and costs over $5k/month.',
    },
    concept: 'AWS support plan tiers and what each includes.',
    docs: 'https://aws.amazon.com/premiumsupport/plans/',
    learningTopic: { categoryId: 'cf', topicId: 'c4-t2' },
  }),

  pq('clfv2-010', {
    certIds: ['clf-c02'], domainIds: ['clf-d3'],
    level: FOUNDATIONAL, topic: T.DATABASE, service: ['rds', 'dynamodb'],
    scenario: 'An engineering team is building a backend for a mobile multiplayer game. They need a database that handles 100k+ requests per second per item, single-digit-millisecond latency, and no schema migrations. Which AWS database is the best fit?',
    options: [
      'Amazon RDS for PostgreSQL — managed relational database',
      'Amazon DynamoDB — managed NoSQL with on-demand capacity',
      'Amazon Redshift — petabyte-scale data warehouse',
      'Amazon Aurora — MySQL/PostgreSQL-compatible managed RDBMS',
    ],
    answer: 1,
    why: 'DynamoDB is AWS\'s managed NoSQL key-value store designed for single-digit-millisecond latency at any scale. Its on-demand capacity mode automatically handles bursty request rates without provisioning. The schemaless data model means rapid iteration with no migrations as game features evolve.',
    wrongReasons: {
      0: 'RDS Postgres tops out around 10k-30k QPS per instance and requires schema migrations for changes.',
      2: 'Redshift is an analytical data warehouse — query latency is measured in seconds, not milliseconds.',
      3: 'Aurora scales reads well but is still a relational database with schema migrations and lower per-item write throughput than DynamoDB.',
    },
    concept: 'When to choose DynamoDB over RDS for high-throughput, low-latency workloads.',
    docs: 'https://aws.amazon.com/dynamodb/',
    learningTopic: { categoryId: 'cf', topicId: 'c2-t3' },
  }),
];

// ════════════════════════════════════════════════════════════════════════
// SOLUTIONS ARCHITECT ASSOCIATE (SAA-C03) — Associate-level
// Sourced from the SAA-C03 dumps PDF + AWS official slides v43
// ════════════════════════════════════════════════════════════════════════

const SAA_V2 = [
  pq('saav2-001', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    level: ASSOCIATE, topic: T.STORAGE, service: ['s3', 'transfer-acceleration'],
    scenario: 'A company collects 500 GB of sensor data daily from sites across multiple continents, each with a high-speed internet connection. They want to aggregate the data into a single S3 bucket as quickly as possible with minimal operational complexity.',
    options: [
      'Turn on S3 Transfer Acceleration on the destination bucket and use multipart uploads to send data directly to it',
      'Upload to a regional bucket per site then use Cross-Region Replication to copy to the destination bucket',
      'Schedule daily AWS Snowball Edge jobs from each site and then Cross-Region Replicate',
      'Upload to EC2 instances per region, snapshot the EBS volumes, copy snapshots to the destination region, and restore',
    ],
    answer: 0,
    why: 'S3 Transfer Acceleration routes uploads through the nearest CloudFront edge location and over the optimised AWS backbone — speeding global uploads to a single bucket without intermediate hops. Combined with multipart uploads (which parallelise large files), this is the simplest single-component solution that satisfies the speed + low-complexity requirement.',
    wrongReasons: {
      1: 'Adds multiple regional buckets + cross-region replication management overhead. Replication is asynchronous, so total time to single bucket is longer.',
      2: 'Snowball Edge is for sites with limited or no internet — these sites have high-speed connections, so it adds physical-shipping delays unnecessarily.',
      3: 'Far more complex (EC2, EBS snapshots, copy, restore) and slower — and the snapshot path was never optimised for ongoing data ingestion.',
    },
    concept: 'S3 Transfer Acceleration + multipart upload for fast global ingestion to a single bucket.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-storage' },
  }),

  pq('saav2-002', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    level: ASSOCIATE, topic: T.ANALYTICS, service: ['athena', 's3'],
    scenario: 'A company stores application logs as JSON in an Amazon S3 bucket. Engineers occasionally need to run ad-hoc SQL queries on the logs. The team wants the analysis solution to have the LEAST operational overhead.',
    options: [
      'Load all logs into Amazon Redshift and run SQL queries from there',
      'Forward logs to CloudWatch Logs and run CloudWatch Logs Insights queries',
      'Use Amazon Athena to run SQL queries directly against the S3 logs',
      'Catalogue the data with AWS Glue and run queries via a transient EMR Spark cluster',
    ],
    answer: 2,
    why: 'Amazon Athena is serverless and queries data in place on S3 using standard SQL. There are no clusters or servers to manage and you pay only per query ($5 per TB scanned). For occasional ad-hoc analysis on JSON logs already in S3, this is the lowest-overhead choice by a wide margin.',
    wrongReasons: {
      0: 'Redshift requires provisioning a cluster + ETL to load data — significant ongoing operational and cost overhead for occasional queries.',
      1: 'CloudWatch Logs Insights uses a custom query language, not standard SQL, and the logs would need to be re-ingested into CloudWatch first.',
      3: 'Glue + EMR is appropriate for large complex ETL jobs but is enormous overkill for occasional ad-hoc SQL on JSON logs.',
    },
    concept: 'Athena for serverless SQL on S3 data.',
    docs: 'https://docs.aws.amazon.com/athena/latest/ug/what-is.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-analytics' },
  }),

  pq('saav2-003', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    level: ASSOCIATE, topic: T.SECURITY, service: ['s3', 'organizations', 'iam'],
    scenario: 'A management account in AWS Organizations hosts an S3 bucket containing internal reports. Access must be restricted to only IAM principals belonging to accounts inside the organisation, with the least ongoing operational overhead.',
    options: [
      'Add a bucket policy with aws:PrincipalOrgID set to the Organization ID',
      'Create an OU per department and use aws:PrincipalOrgPaths in the bucket policy',
      'Monitor account events with CloudTrail and update the bucket policy reactively via Lambda',
      'Tag every user that needs access and use aws:PrincipalTag in the bucket policy',
    ],
    answer: 0,
    why: 'The aws:PrincipalOrgID condition key matches any principal whose account belongs to the named Organization. Set once in the bucket policy, it automatically covers every current AND future account in the org with zero ongoing changes. This is the AWS-recommended pattern for "allow my org, deny everyone else".',
    wrongReasons: {
      1: 'aws:PrincipalOrgPaths is for OU-level filtering — useful when only some OUs should have access. The scenario says the entire org, so it adds unnecessary granularity.',
      2: 'Reacting to CloudTrail events with Lambda is brittle, has lag, and is custom code where a built-in condition key already solves the problem.',
      3: 'Tagging users in each account is high-overhead, must be synchronised across accounts, and only controls user-level access, not account-level.',
    },
    concept: 'aws:PrincipalOrgID for org-wide bucket policy access control.',
    docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html#condition-keys-principalorgid',
    learningTopic: { categoryId: 'saa', topicId: 'saa-security' },
  }),

  pq('saav2-004', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    level: ASSOCIATE, topic: T.NETWORKING, service: ['vpc', 's3'],
    scenario: 'An EC2 instance in a VPC needs to read application logs from an S3 bucket. The instance has NO route to the internet, NO NAT Gateway, and no VPN. Which solution provides private, in-AWS connectivity to S3?',
    options: [
      'Create a gateway VPC endpoint for S3 and add it to the route table',
      'Forward the logs to CloudWatch Logs and then export them to the S3 bucket',
      'Attach an IAM instance profile to the EC2 instance that grants S3 access',
      'Create an API Gateway with a private link to the S3 endpoint',
    ],
    answer: 0,
    why: 'A Gateway VPC Endpoint for S3 (or DynamoDB) is FREE and provides private connectivity between the VPC and the service without an internet gateway, NAT, or VPN. AWS adds a prefix list to the route table so traffic for S3 takes the private path. The instance still needs an IAM role for permissions, but the network path is solved by the endpoint.',
    wrongReasons: {
      1: 'CloudWatch Logs still needs network connectivity to reach S3 for export, so this doesn\'t solve the underlying problem.',
      2: 'An IAM instance profile grants permission to call S3 but doesn\'t provide a network path. Permission ≠ connectivity.',
      3: 'API Gateway with PrivateLink isn\'t the right pattern — Gateway VPC Endpoint for S3 is purpose-built and free.',
    },
    concept: 'Gateway VPC Endpoint for private S3 access from a VPC.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-networking' },
  }),

  pq('saav2-005', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.NETWORKING, service: ['cloudfront', 's3', 'alb'],
    scenario: 'A global web application has its STATIC assets in S3 and its DYNAMIC content served from EC2 behind an Application Load Balancer. The team wants to reduce latency for users worldwide while keeping the architecture simple and using their existing Route 53 domain.',
    options: [
      'Create a single CloudFront distribution with both the S3 bucket and the ALB as origins, and point Route 53 at the distribution',
      'Create a CloudFront distribution for the ALB only, and use AWS Global Accelerator for the S3 bucket',
      'Create a CloudFront distribution for S3 only, and use AWS Global Accelerator pointing at both the ALB and the CloudFront distribution',
      'Use AWS Global Accelerator with both origins, and split into two domains — one for static, one for dynamic content',
    ],
    answer: 0,
    why: 'CloudFront supports multiple origins on the same distribution, so static (S3) and dynamic (ALB) content can be served via path-pattern behaviours from a single distribution. CloudFront caches both kinds of content at the edge and terminates HTTPS, giving global users low latency with one DNS record in Route 53 — the simplest design that satisfies the requirement.',
    wrongReasons: {
      1: 'Global Accelerator is designed for TCP/UDP layer-4 acceleration and doesn\'t cache content — using it for a static-asset bucket adds cost and no caching benefit.',
      2: 'Putting Global Accelerator in front of CloudFront is redundant — CloudFront already runs at the edge globally.',
      3: 'Two domains complicates the user experience (CORS issues, cookie scope) for no real performance benefit over a single distribution.',
    },
    concept: 'CloudFront multi-origin distribution for combined static + dynamic content.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-overview.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-networking' },
  }),

  pq('saav2-006', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    level: ASSOCIATE, topic: T.SECURITY, service: ['secrets-manager', 'rds'],
    scenario: 'A company runs Amazon RDS for MySQL in 5 AWS Regions. Once a month the team rotates the database credentials. They want the LEAST operational overhead solution.',
    options: [
      'Store credentials in AWS Secrets Manager, enable multi-Region replication, and configure scheduled automatic rotation',
      'Store credentials in SSM Parameter Store as SecureString and replicate manually across Regions; rotate via a Lambda',
      'Store credentials in an S3 bucket with SSE-KMS, and rotate via EventBridge → Lambda',
      'Store credentials in DynamoDB Global Tables encrypted with multi-Region KMS keys; rotate via custom Lambda',
    ],
    answer: 0,
    why: 'AWS Secrets Manager has native multi-Region secret replication AND built-in rotation for RDS engines (MySQL/PostgreSQL/Oracle/MSSQL) — you just attach the rotation Lambda template and set a schedule. The combination eliminates almost all custom code, which directly satisfies the "least operational overhead" requirement.',
    wrongReasons: {
      1: 'SSM Parameter Store doesn\'t support multi-Region replication or automatic rotation natively — you\'d have to build both yourself.',
      2: 'S3 isn\'t a secret store — there\'s no rotation primitive and no per-Region replication for objects via a single API call.',
      3: 'DynamoDB Global Tables is for app data, not credentials, and the entire rotation flow would be custom code — much more overhead than Secrets Manager.',
    },
    concept: 'Secrets Manager multi-Region replication + native RDS rotation.',
    docs: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/create-manage-multi-region-secrets.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-security' },
  }),

  pq('saav2-007', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.COMPUTE, service: ['ec2', 'asg', 'alb'],
    scenario: 'A web application sees predictable daily traffic peaks (3-6pm) and lower nighttime traffic. The architecture is EC2 behind an Application Load Balancer. The team wants the application to automatically have more instances during peaks and fewer during quiet hours, at the lowest cost.',
    options: [
      'Use an Auto Scaling Group with a scheduled scaling action to scale out at 3pm and scale in at 6pm',
      'Run the maximum number of EC2 instances 24/7 to ensure capacity at peak',
      'Use AWS Lambda triggered by ALB to handle peak traffic',
      'Switch to AWS Elastic Beanstalk with the default load balancer',
    ],
    answer: 0,
    why: 'Auto Scaling Groups support both dynamic (CPU-based) and scheduled scaling actions. Scheduled actions fit predictable, time-based peaks perfectly — you can pre-warm instances right before 3pm and scale them back at 6pm. The result: capacity meets demand without overprovisioning, lowering cost vs always-on max capacity.',
    wrongReasons: {
      1: 'Running max capacity 24/7 wastes money during quiet nighttime hours — exactly what scaling is meant to avoid.',
      2: 'Lambda behind ALB is feasible but requires a complete refactor of the application; the question is about scaling EC2, not rewriting.',
      3: 'Elastic Beanstalk just wraps EC2 + ALB + ASG; switching to it doesn\'t add scheduled scaling and adds an unnecessary platform layer.',
    },
    concept: 'Auto Scaling Group scheduled scaling for predictable demand patterns.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-compute' },
  }),

  pq('saav2-008', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.DATABASE, service: ['rds', 'multi-az'],
    scenario: 'A production PostgreSQL database on Amazon RDS must survive an Availability Zone failure with automatic failover. The team also wants read replicas to offload reporting queries. Which configuration meets BOTH requirements?',
    options: [
      'Enable Multi-AZ on the primary, and create read replicas in two other AZs',
      'Create three read replicas in different AZs and promote one if the primary fails',
      'Take hourly snapshots and restore in another AZ on failure',
      'Enable Multi-AZ Cluster (3-instance) only — no separate read replicas needed',
    ],
    answer: 0,
    why: 'Multi-AZ on a single primary creates a synchronous standby in a different AZ used ONLY for failover (not for reads). Read replicas (async) are a separate feature for read offload and can sit in the same AZ or any other. Combining Multi-AZ + read replicas gives you both HA failover AND read scaling — the canonical RDS resilient pattern.',
    wrongReasons: {
      1: 'Read replicas are async — promotion is not automatic for primary failover. There\'s a data-loss window and manual intervention needed.',
      2: 'Restoring snapshots takes minutes-to-hours and loses data since the last snapshot — not acceptable for "survive an AZ failure" SLA.',
      3: 'RDS Multi-AZ Cluster (Aurora-like) is newer; in the standard Multi-AZ instance configuration the standby is not readable, so read offload still requires read replicas.',
    },
    concept: 'RDS Multi-AZ for HA vs Read Replicas for read scaling — two different features.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-database' },
  }),

  pq('saav2-009', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    level: ASSOCIATE, topic: T.INTEGRATION, service: ['sqs', 'lambda'],
    scenario: 'A processing pipeline receives spiky traffic — sometimes 500 requests in a minute, sometimes 50,000. The downstream Lambda function can handle only 100 concurrent executions due to a database limit. Without that limit being exceeded, what is the simplest way to decouple traffic spikes from the consumer?',
    options: [
      'Place an SQS standard queue between the producer and Lambda; set Lambda\'s reserved concurrency to 100',
      'Increase the database connection pool to handle 50,000 simultaneous connections',
      'Use Kinesis Data Streams with one shard and read directly from Lambda',
      'Add a NAT Gateway in front of the Lambda to throttle requests',
    ],
    answer: 0,
    why: 'SQS naturally absorbs spikes by buffering messages until consumers are ready, decoupling producer rate from consumer rate. Setting Lambda\'s reserved concurrency to 100 caps how many parallel Lambdas pull messages, protecting the downstream database. The queue grows during a spike and drains naturally — exactly the decoupling pattern AWS recommends.',
    wrongReasons: {
      1: 'A database can\'t practically scale to 50,000 simultaneous connections, and the question is about decoupling — not brute-forcing capacity.',
      2: 'Kinesis with one shard caps throughput too tightly and offers no spike buffering with the same simplicity.',
      3: 'A NAT Gateway is a network address translator — it has no concept of message throttling or decoupling.',
    },
    concept: 'SQS as a decoupling buffer + Lambda reserved concurrency as a downstream throttle.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-integration' },
  }),

  pq('saav2-010', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'],
    level: ASSOCIATE, topic: T.PRICING, service: ['ec2', 'savings-plans'],
    scenario: 'A SaaS company runs a steady fleet of 50 EC2 instances 24/7 for the foreseeable future. They want to reduce compute spend by up to 72% in exchange for a usage commitment. Which purchasing option offers the deepest savings with the LEAST flexibility cost?',
    options: [
      'On-Demand Instances — no commitment',
      'Spot Instances — bid on spare capacity',
      'Compute Savings Plans (3-year, all upfront)',
      'Reserved Instances with no upfront, 1-year, convertible',
    ],
    answer: 2,
    why: '3-year all-upfront Compute Savings Plans deliver up to 72% off On-Demand for a flat $/hr commitment. They cover any EC2 family/region/OS automatically (more flexible than Standard Reserved Instances). For a steady 24/7 fleet, this is the deepest discount AWS offers outside Spot.',
    wrongReasons: {
      0: 'On-Demand is the most expensive option and earns no discount at all.',
      1: 'Spot can be cheaper but instances can be reclaimed with 2 minutes\' notice — not suitable for a steady 24/7 SaaS fleet.',
      3: 'No-upfront 1-year convertible RIs save ~30%, far less than 72% from a 3-year all-upfront commitment.',
    },
    concept: 'Savings Plans tier of commitment — payment + term + flexibility tradeoffs.',
    docs: 'https://aws.amazon.com/savingsplans/compute-pricing/',
    learningTopic: { categoryId: 'saa', topicId: 'saa-cost' },
  }),

  pq('saav2-011', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    level: ASSOCIATE, topic: T.SECURITY, service: ['kms', 's3'],
    scenario: 'A company\'s compliance team requires all S3 objects to be encrypted at rest using a customer-managed encryption key that they fully control, can audit access to, and can disable in an emergency. Which encryption option meets this requirement?',
    options: [
      'SSE-S3 — server-side encryption with Amazon-managed keys',
      'SSE-KMS with a customer-managed AWS KMS key',
      'SSE-C — server-side encryption with customer-provided keys per object',
      'Client-side encryption with a key kept in the application',
    ],
    answer: 1,
    why: 'SSE-KMS with a customer-managed CMK gives you full key lifecycle control — you can rotate it, disable it (instantly making objects unreadable), and audit every Decrypt/Encrypt call via CloudTrail. AWS manages the integration with S3, so engineering effort is minimal.',
    wrongReasons: {
      0: 'SSE-S3 keys are fully Amazon-managed — you cannot disable, audit, or rotate them.',
      2: 'SSE-C requires the customer to send the key on every PUT/GET — operationally heavy and no centralised audit trail.',
      3: 'Client-side encryption in the application code is the most control but the most complexity, and KMS already meets the requirement with vastly less work.',
    },
    concept: 'SSE-KMS with a customer-managed CMK for control + auditability.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-security' },
  }),

  pq('saav2-012', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.STORAGE, service: ['efs', 'ec2'],
    scenario: 'Three EC2 instances across three Availability Zones need to read and write the SAME files simultaneously. The file system must be POSIX-compliant and scale storage automatically. Which AWS service is the best fit?',
    options: [
      'Amazon EBS attached to all three instances using Multi-Attach',
      'Amazon EFS mounted via NFS from all three instances',
      'Amazon FSx for Windows File Server',
      'Amazon S3 mounted with s3fs-fuse on all three instances',
    ],
    answer: 1,
    why: 'Amazon EFS is a fully managed NFSv4-compatible shared filesystem that scales storage automatically and can be mounted by thousands of EC2 instances simultaneously, even across AZs. It is POSIX-compliant — perfect for traditional file-based workloads needing concurrent shared access.',
    wrongReasons: {
      0: 'EBS Multi-Attach only works for io1/io2 volumes attached to instances IN THE SAME AZ, and requires a cluster-aware filesystem — not a fit for three-AZ workloads.',
      2: 'FSx for Windows is SMB-based and Windows-oriented; the question doesn\'t mention Windows.',
      3: 's3fs-fuse is not truly POSIX-compliant (no rename, eventual consistency for some ops) and adds latency and a 3rd-party dependency.',
    },
    concept: 'EFS for POSIX shared filesystem across multiple AZs.',
    docs: 'https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-storage' },
  }),

  pq('saav2-013', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.COMPUTE, service: ['ec2', 'spot'],
    scenario: 'A batch image-processing job takes 4 hours and can be safely restarted from a checkpoint if interrupted. The CFO wants the cheapest compute option. Which is best?',
    options: [
      'On-Demand EC2 — no commitment',
      'Spot Instances with checkpointing to S3',
      '3-year Reserved Instances',
      'AWS Fargate',
    ],
    answer: 1,
    why: 'Spot Instances offer up to 90% off On-Demand pricing by using unused EC2 capacity. The trade-off — 2-minute interruption warning — is perfectly acceptable for fault-tolerant, checkpointable workloads. For a 4-hour batch with S3 checkpoints, Spot is by far the cheapest option.',
    wrongReasons: {
      0: 'On-Demand is the baseline price — no savings.',
      2: '3-year RI requires a long commitment and assumes steady usage; one batch job per day would leave the RI mostly idle.',
      3: 'Fargate is per-second container compute with no Spot discount available in its standard tier (Fargate Spot exists but is less common for one-off batch jobs).',
    },
    concept: 'Spot for fault-tolerant, checkpointable workloads.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-compute' },
  }),

  pq('saav2-014', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    level: ASSOCIATE, topic: T.MONITORING, service: ['cloudwatch', 'alarm'],
    scenario: 'A team wants to receive an SMS the moment the CPU on a production EC2 instance is sustained above 80% for 5 consecutive minutes. Which combination of services achieves this with the least custom code?',
    options: [
      'CloudWatch alarm on CPUUtilization with an SNS topic that has an SMS subscription',
      'CloudWatch Logs subscription filter → Kinesis → Lambda → SMS via SNS',
      'Run a cron script on the instance that polls top + sends via SES',
      'EventBridge scheduled rule that queries the instance every minute',
    ],
    answer: 0,
    why: 'CloudWatch alarms support a 5-minute sustained-threshold evaluation natively. Wiring the alarm to an SNS topic with an SMS subscription gives one-click delivery to a phone number — no custom code anywhere. This is the canonical AWS pattern for metric-based alerting.',
    wrongReasons: {
      1: 'Massive overkill for a simple CPU metric — and CloudWatch Logs doesn\'t capture CPU.',
      2: 'A cron script on the instance fails if the instance is down — alerts must come from outside the instance.',
      3: 'Polling every minute via EventBridge requires custom code to compare CPU values and is delayed/imprecise vs a CloudWatch alarm.',
    },
    concept: 'CloudWatch alarm → SNS for metric-based alerting.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-monitoring' },
  }),

  pq('saav2-015', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    level: ASSOCIATE, topic: T.INTEGRATION, service: ['sns', 'sqs', 'fanout'],
    scenario: 'When a new order is placed, three downstream systems must each receive the order: a billing service, an inventory service, and an analytics pipeline. Each consumer processes at its own rate and must be decoupled from the others. Which architecture fits?',
    options: [
      'Publish the order to an SNS topic; each consumer subscribes via its own SQS queue (fanout pattern)',
      'Write the order to one SQS queue and have all three services poll the same queue',
      'Write the order to S3 and have each service poll S3 on a schedule',
      'Push the order to all three services via API Gateway',
    ],
    answer: 0,
    why: 'The SNS → SQS fanout is the AWS-canonical pattern for one-event → many-consumers. SNS broadcasts to every subscribed SQS queue; each consumer drains its OWN queue independently. Decoupling is complete: a slow consumer cannot block the others, and consumers can be added/removed without changing the producer.',
    wrongReasons: {
      1: 'A shared SQS queue means each message is processed by ONLY ONE consumer — exactly what you don\'t want for fanout.',
      2: 'S3 polling adds latency, costs and complexity — and doesn\'t natively notify multiple consumers without S3 events + SNS anyway.',
      3: 'Direct API Gateway pushes couple the producer to each consumer\'s availability — defeating the decoupling requirement.',
    },
    concept: 'SNS + SQS fanout for multi-consumer event distribution.',
    docs: 'https://docs.aws.amazon.com/sns/latest/dg/sns-common-scenarios.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-integration' },
  }),

  pq('saav2-016', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    level: ASSOCIATE, topic: T.NETWORKING, service: ['cloudfront', 'waf'],
    scenario: 'A public-facing web application running behind an ALB receives traffic from CloudFront. The security team wants to block SQL-injection and XSS attacks BEFORE they reach the application. Which solution requires the least operational effort?',
    options: [
      'Attach AWS WAF with the AWS-managed "Core rule set" + SQL DB rule set to the CloudFront distribution',
      'Install ModSecurity on every EC2 instance behind the ALB',
      'Write Lambda@Edge functions to parse and filter incoming requests',
      'Configure NACLs in the VPC to block suspicious IP ranges',
    ],
    answer: 0,
    why: 'AWS WAF\'s managed rule groups (Core, SQL Database, Known Bad Inputs) ship pre-built protection against the OWASP Top 10 — SQL injection, XSS, command injection, etc. Attaching them to a CloudFront distribution blocks malicious requests at the edge, before they reach the ALB or EC2. AWS maintains the rules; you just opt in.',
    wrongReasons: {
      1: 'Installing ModSecurity on every instance is operationally heavy (patching, tuning) and processes attacks AFTER they reach the instance — too late.',
      2: 'Lambda@Edge for request filtering is custom code that must be maintained against an evolving attack landscape; WAF managed rules already do this.',
      3: 'NACLs are stateless network ACLs operating at L3/L4 — they cannot inspect HTTP payload for SQLi/XSS patterns.',
    },
    concept: 'AWS WAF managed rule groups attached to CloudFront for L7 protection.',
    docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-security' },
  }),

  pq('saav2-017', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'],
    level: ASSOCIATE, topic: T.STORAGE, service: ['s3', 'lifecycle'],
    scenario: 'A company has 100 TB of compliance documents in S3 Standard. After 30 days the documents are rarely accessed but must be retained for 7 years. They want to minimise storage costs automatically.',
    options: [
      'Create an S3 Lifecycle rule transitioning objects to Standard-IA at 30 days then Glacier Deep Archive at 90 days',
      'Manually move objects to a different bucket every quarter',
      'Use S3 Cross-Region Replication to a cheaper region',
      'Disable versioning to reduce storage cost',
    ],
    answer: 0,
    why: 'S3 Lifecycle rules automatically transition objects between storage classes based on age, with no engineering effort. Moving to Standard-IA at 30 days cuts cost ~46%; transitioning to Glacier Deep Archive at 90 days drops it ~95% from Standard. Over 7 years the savings on 100 TB are enormous.',
    wrongReasons: {
      1: 'Manual moves don\'t scale, add operational burden, and risk human error.',
      2: 'Cross-Region Replication adds cost (replication transfer + storage in the second region) — it doesn\'t reduce storage cost.',
      3: 'Disabling versioning loses change history, doesn\'t move data to cheaper storage, and isn\'t compliance-friendly.',
    },
    concept: 'S3 Lifecycle rules for automatic storage-class transitions.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-storage' },
  }),

  pq('saav2-018', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.DATABASE, service: ['dynamodb', 'streams', 'lambda'],
    scenario: 'When a new user is added to a DynamoDB Users table, the architecture must trigger a welcome-email Lambda function. The trigger must be reliable and require no polling code. Which design is correct?',
    options: [
      'Enable DynamoDB Streams on the table and configure a Lambda trigger',
      'Poll the table every minute with a Lambda and detect new rows by timestamp',
      'Use EventBridge scheduled rule to scan the table for new users hourly',
      'Use S3 Event Notifications on a backup bucket of the table',
    ],
    answer: 0,
    why: 'DynamoDB Streams captures item-level changes in near real-time and can directly invoke a Lambda function for each new/modified/deleted item. No polling code, no scheduling, no missed events — Lambda processes the stream record automatically and you only pay for actual invocations.',
    wrongReasons: {
      1: 'Polling wastes Lambda invocations and has a window where new users could be missed if timestamps aren\'t perfectly synchronised.',
      2: 'Hourly scans are slow + expensive on large tables and don\'t give near-real-time triggers.',
      3: 'S3 Event Notifications only fire on S3 object changes — irrelevant to DynamoDB inserts.',
    },
    concept: 'DynamoDB Streams + Lambda for change data capture without polling.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-database' },
  }),

  pq('saav2-019', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    level: ASSOCIATE, topic: T.NETWORKING, service: ['route53', 'health-check'],
    scenario: 'A company runs an active web stack in eu-west-1 and a standby stack in us-east-1. They want users to be automatically directed to the standby ONLY when the primary stack fails its health check. Which Route 53 routing policy fits?',
    options: [
      'Failover routing with health checks on the primary',
      'Weighted routing 90/10 split between primary and standby',
      'Latency-based routing using each region\'s endpoint',
      'Multi-value answer routing returning both endpoints',
    ],
    answer: 0,
    why: 'Route 53 Failover routing is purpose-built for active-passive disaster recovery. You designate one record as PRIMARY (with a Route 53 health check) and another as SECONDARY. Traffic flows to PRIMARY while the health check is healthy; if it fails, Route 53 automatically directs traffic to SECONDARY — exactly the active/standby pattern.',
    wrongReasons: {
      1: 'Weighted routing always sends some percentage to BOTH endpoints — not the "only on failure" behaviour required.',
      2: 'Latency routing sends users to whichever endpoint has the lowest latency, ignoring active/standby intent.',
      3: 'Multi-value returns multiple records to the client to choose from — it isn\'t a failover primitive.',
    },
    concept: 'Route 53 Failover routing for active-passive DR.',
    docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-networking' },
  }),

  pq('saav2-020', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    level: ASSOCIATE, topic: T.MIGRATION, service: ['snowball', 'dms'],
    scenario: 'A company needs to migrate 80 TB of legacy on-premises data to Amazon S3 within 2 weeks. Their internet link maxes out at 100 Mbps and is also used by the business for daily operations. Which solution best fits the constraint?',
    options: [
      'Order an AWS Snowball Edge Storage Optimized device, copy data locally, ship back to AWS',
      'Use AWS DataSync over the existing 100 Mbps link',
      'Use AWS Storage Gateway in File mode to gradually move data',
      'Upload via S3 Transfer Acceleration over the existing link',
    ],
    answer: 0,
    why: 'At a sustained 100 Mbps with overhead, 80 TB takes ~80 days to upload over the wire — far beyond the 2-week deadline. AWS Snowball Edge ships an 80 TB-capacity device to the customer, who copies data locally at LAN speeds, then ships it back to AWS where it\'s loaded directly into S3. End-to-end is typically 1-2 weeks.',
    wrongReasons: {
      1: 'DataSync over the existing link still saturates the 100 Mbps pipe — same time problem as a vanilla upload, and disrupts daily operations.',
      2: 'Storage Gateway is for ongoing hybrid storage, not bulk one-time migration.',
      3: 'Transfer Acceleration over a 100 Mbps link still tops out at link speed — the bottleneck is the WAN itself.',
    },
    concept: 'Snowball Edge for large data migrations when WAN bandwidth is the limit.',
    docs: 'https://docs.aws.amazon.com/snowball/latest/developer-guide/whatisedge.html',
    learningTopic: { categoryId: 'saa', topicId: 'saa-migration' },
  }),
];

// ════════════════════════════════════════════════════════════════════════
// Export
// ════════════════════════════════════════════════════════════════════════

export const QUESTION_BANK_V2 = [...CLF_V2, ...SAA_V2];

/**
 * Convenience: just the V2 questions that match a cert id.
 */
export function v2QuestionsForCert(certId) {
  return QUESTION_BANK_V2.filter((q) => q.certIds.includes(certId));
}

/**
 * V2-specific shape detector — used by QuestionRenderer to decide whether
 * to show the rich multi-section explanation panel.
 */
export function isV2Question(q) {
  return !!(q && (q.level || q.topic || q.concept));
}
