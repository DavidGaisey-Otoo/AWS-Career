/**
 * topicStudyGuides.js — full read-before-you-practice study guides.
 *
 * Surfaced via /exam/:certId/study/:topicId. Each guide is structured so
 * the page renders consistent sections. Missing topics fall back to the
 * brief notes in topicNotes.js with a "fuller guide coming" banner.
 *
 * Schema per topic:
 *   title       — display name + subtitle
 *   estReadMin  — rough read time
 *   overview    — multi-paragraph "what is this and why does it matter"
 *   sections[]  — { title, body, bullets?, table? }
 *                 (body = string; bullets = string[]; table = { headers, rows })
 *   examTraps[] — common wrong-answer patterns
 *   cheatsheet[] — { k, v } quick facts
 *   flashcards[] — { q, a }
 *   resources[] — { label, url }
 */

// EX-24: guides written later for roadmap services that had none (EFS,
// Cognito, Organizations, VPN, Well-Architected, plus a combined guide for
// the recognition-level services). Kept in a separate file to avoid growing
// this one past 4,000 lines; merged into the exported map at the bottom.
import { TOPIC_STUDY_GUIDES_FILL } from './topicStudyGuidesFill.js';

const BASE_GUIDES = {
  // ════════════════════════════════════════════════════════════════════
  mixed: {
    title: 'Multi-Service Scenarios',
    subtitle: 'How real exam questions actually work — combining 2-5 services',
    estReadMin: 8,
    overview: `
Real SAA-C03 exam questions are almost never about ONE service in isolation.
They give you a scenario ("a media company stores videos in S3 and serves them
via CloudFront, with users authenticating through Cognito…") and ask you to
choose the architecture that meets multiple constraints at once: cost,
latency, security, availability, and operational simplicity.

The skill being tested isn't memorising AWS services — it's choosing the
RIGHT COMBINATION. To pass, you need fluency with the canonical patterns
that AWS expects you to recognise.`,
    sections: [
      {
        title: 'The 10 canonical patterns to memorise',
        body: 'These show up in roughly 60% of exam questions. Recognise the shape, recognise the answer.',
        bullets: [
          'S3 + CloudFront + OAC — private origin behind global CDN',
          'EC2 in private subnet + S3 Gateway Endpoint — avoid NAT charges',
          'API Gateway + Lambda + Cognito User Pool authorizer — serverless auth',
          'SQS in front of Lambda → DynamoDB — resilient ingest with retry + DLQ',
          'Kinesis Data Streams → Firehose (Parquet) → S3 → Athena — modern log lake',
          'ALB + ECS Fargate + WAF + ACM — secure auto-scaling web stack',
          'Step Functions orchestrating Lambdas with retry + Catch → SNS notify',
          'Aurora + ElastiCache for Redis — read-heavy SQL with hot-key cache',
          'TGW + DX + VPN — enterprise hub-and-spoke hybrid networking',
          'Route 53 Failover + ALB health check + multi-region — DR routing',
        ],
      },
      {
        title: 'How to read combo questions',
        body: 'Treat each scenario as a checklist:',
        bullets: [
          '1) What are the hard constraints? (cost, latency, RPO/RTO, sovereignty)',
          '2) Which AWS-recommended pattern matches the workload (serverless, container, hybrid…)?',
          '3) Eliminate options that violate ANY constraint — usually 2 of 4 are wrong on this alone',
          '4) Of the remaining 2, which is the SIMPLEST AWS-native solution? (Exam loves managed services)',
          '5) Beware: the cheapest option that meets all constraints is usually right',
        ],
      },
      {
        title: 'Common cost-vs-architecture trade-offs',
        body: 'The exam will often present 4 options where every option works — but only one fits the cost/ops profile.',
        table: {
          headers: ['Constraint', 'Right choice', 'Anti-pattern'],
          rows: [
            ['Cost-conscious + variable traffic', 'Serverless (Lambda/Fargate/DDB On-Demand)', 'Provisioned EC2 24/7'],
            ['Predictable steady-state', 'Reserved Instances / Savings Plans', 'On-Demand'],
            ['Avoid NAT data charges', 'S3 / DynamoDB Gateway Endpoint', 'Route via NAT Gateway'],
            ['Low-latency cross-region writes', 'Aurora Global / DynamoDB Global', 'Cross-Region Read Replica'],
            ['Minimal ops + tiny dev', 'NAT Instance / shared dev account', 'Full prod-grade kit per env'],
            ['Long-term archive', 'S3 Glacier Deep Archive', 'EBS snapshots'],
          ],
        },
      },
      {
        title: 'Security defaults you must know',
        bullets: [
          'IAM: explicit Deny ALWAYS wins, even over root',
          'KMS: 1 customer-managed key per environment with annual rotation',
          'S3: Block Public Access ON at account level',
          'EC2: instance profile, never embedded credentials; IMDSv2 required',
          'Lambda: env vars encrypted with customer-managed KMS, real secrets in Secrets Manager',
          'API Gateway: WAF + Cognito authorizer for end-users, IAM for M2M',
          'CloudTrail: log-archive account + S3 Object Lock for forensic integrity',
        ],
      },
      {
        title: 'High-availability patterns',
        body: 'Almost every SAA question has an availability constraint. Map it to the right tier:',
        table: {
          headers: ['Need', 'Pattern'],
          rows: [
            ['Single-AZ failure tolerance', 'Multi-AZ deployment (RDS/Aurora/EFS/ECS/etc.)'],
            ['Single-region failure tolerance', 'Cross-region read replica or active-active'],
            ['Sub-minute RTO + RPO', 'Aurora Global Database (RPO < 1s, RTO < 1min)'],
            ['Cost-optimised cold DR', 'Pilot light: replicas off in DR region, snapshot replication'],
            ['Strict 5-nines SLA', 'DX Maximum Resiliency + Multi-Region active-active'],
          ],
        },
      },
    ],
    examTraps: [
      'If a question says "minimum operational overhead" — pick the managed AWS service, NOT the EC2 alternative',
      'If a question says "cost-optimised" + "predictable" — pick Reserved / Savings Plans',
      'If a question says "encrypt with customer keys" without "outside AWS" — KMS customer-managed CMK (NOT XKS)',
      'If a question shows VPC + Lambda + S3 — the right answer is almost always "Gateway Endpoint"',
      'Beware option-D distractors that mention services not relevant to the constraint (e.g. Macie when no PII)',
    ],
    cheatsheet: [
      { k: 'Serverless trio', v: 'Lambda + API Gateway + DynamoDB',
        desc: 'Pick when the question says "minimal ops", "no servers", "variable / unpredictable load". Pay-per-request across all three. The most common SAA answer pattern.' },
      { k: 'Container trio', v: 'ECS Fargate + ALB + ACM + WAF',
        desc: 'Pick when the workload is web-app + needs HTTPS + needs L7 protection but you don\'t want to manage EC2. Fargate = no servers; ALB = path/host routing; ACM = free TLS; WAF = OWASP Top 10.' },
      { k: 'Big data trio', v: 'Kinesis + Firehose + S3 (Parquet) + Athena',
        desc: 'Pick for log lakes, click-stream ingest, or any "stream + query later" pattern. Firehose converting to Parquet cuts Athena scan cost 80-95%.' },
      { k: 'Hybrid trio', v: 'TGW + DX + Site-to-Site VPN',
        desc: 'Pick when on-prem network must reach AWS. DX for bandwidth + low latency; VPN for encryption / DX backup; TGW as the hub if many VPCs are involved.' },
      { k: 'CDN + auth trio', v: 'CloudFront + OAC + Signed URLs/Cookies',
        desc: 'Pick when premium / paid content must be globally cached but only paying users can access. OAC keeps S3 private; signed URLs/cookies gate viewers per-session.' },
      { k: 'DR trio', v: 'Route 53 Failover + ALB health check + multi-region',
        desc: 'Pick when "active region fails, secondary takes over automatically". R53 Failover with health check on primary; DNS flips to secondary on failure.' },
      { k: 'Read-scaling trio', v: 'Aurora + Reader endpoint + ElastiCache',
        desc: 'Pick when read traffic ≫ write traffic. Aurora reader endpoint distributes reads; ElastiCache deflects hot-key reads at sub-ms latency.' },
      { k: 'Resilient ingest trio', v: 'API → SQS → Lambda + DLQ',
        desc: 'Pick when downstream may fail or get overwhelmed. SQS absorbs spikes; failed messages auto-retry; DLQ captures persistent failures for investigation.' },
    ],
    flashcards: [
      { q: 'Private EC2 needs S3 access cheaply — which endpoint?', a: 'S3 Gateway VPC Endpoint (free)' },
      { q: 'Real-time SQL on streaming Kinesis data?', a: 'Managed Service for Apache Flink' },
      { q: 'Cross-region active-active SQL writes?', a: 'Aurora Global Database' },
      { q: 'Centralised network firewall for VPC egress?', a: 'AWS Network Firewall' },
      { q: 'Stateful inspection for L7 attacks?', a: 'AWS WAF on CloudFront or ALB' },
    ],
    resources: [
      { label: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/' },
      { label: 'AWS Reference Architectures', url: 'https://aws.amazon.com/architecture/reference-architecture-diagrams/' },
    ],
    decisionTree: {
      title: 'Which compute pattern should I pick?',
      intro: 'The most common SAA question shape: "build a workload with these constraints — which architecture?" Use this routing table.',
      rows: [
        { if: 'Variable / unpredictable traffic + no server ops', then: 'Serverless trio: Lambda + API GW + DynamoDB On-Demand' },
        { if: 'Web app with HTTPS + L7 routing + WAF', then: 'Container stack: ECS Fargate + ALB + ACM + WAF' },
        { if: 'Steady high-utilisation workload (24/7)', then: 'EC2 + Compute Savings Plan + ASG' },
        { if: 'Streaming logs / clicks at high volume', then: 'Kinesis Streams → Firehose (Parquet) → S3 → Athena' },
        { if: 'Hybrid on-prem connectivity', then: 'TGW + DX (or VPN for backup)' },
        { if: 'Global low-latency reads + DR', then: 'CloudFront + Aurora Global Database' },
        { if: 'Async workflow with retry + DLQ', then: 'API → SQS → Lambda + DLQ' },
        { if: 'Multi-step orchestration with branching', then: 'Step Functions Standard with Choice + Catch states' },
      ],
      tip: 'When in doubt, the SIMPLEST AWS-MANAGED option that meets all constraints is almost always correct.',
    },
    workedExamples: [
      {
        title: 'Global media app — minimal ops + sub-100ms reads worldwide',
        scenario: 'A streaming service serves video metadata + thumbnails to users globally. They want sub-100ms reads anywhere, minimal infrastructure to manage, and DR if one region fails. Backend is REST API serving JSON.',
        reasoning: [
          'Identify constraints: GLOBAL, sub-100ms reads, minimal ops, DR. That rules out single-region RDS and self-managed EC2.',
          'API layer: API Gateway + Lambda — fully serverless, no ops. Eliminates ALB + EC2 options.',
          'Data layer: needs sub-100ms reads from anywhere. DynamoDB Global Tables = multi-region active-active with sub-second replication.',
          'Static assets (thumbnails): CloudFront + S3 with OAC. Edge caching gives sub-100ms anywhere globally.',
          'DR: Both DynamoDB Global Tables and CloudFront/S3 already span regions. Route 53 health-check failover for the API endpoint provides automatic regional failover.',
        ],
        answer: 'Route 53 (Failover routing) → API Gateway + Lambda (regional, deployed in 2+ regions) → DynamoDB Global Tables. Static assets: CloudFront → S3 with OAC + Cross-Region Replication. Zero servers, automatic global failover.',
      },
      {
        title: 'Cost-optimised log analytics for a fintech',
        scenario: 'A fintech ingests 50,000 log events/sec, retains 7 years for compliance, and runs ad-hoc SQL analytics weekly. Cost matters more than query latency.',
        reasoning: [
          'Ingest volume = 50k/sec — too high for EventBridge + Lambda direct. Need a stream + buffered delivery.',
          'Kinesis Data Streams ingests; Firehose buffers + delivers to S3.',
          'For 7-year retention, S3 Lifecycle: Standard 30d → Glacier Instant Retrieval 1y → Glacier Deep Archive 6y. Glacier Deep is ~$1/TB/month.',
          'For weekly SQL queries, Athena charges per TB scanned. Firehose Parquet conversion cuts scan cost 80-95% vs raw JSON. Configure Firehose to convert via Glue schema.',
          'Partitioning by date in S3 prefixes enables Athena partition pruning — even cheaper per query.',
        ],
        answer: 'Kinesis Data Streams (sized for 50 shards) → Firehose with Parquet conversion + dynamic partitioning by date → S3 with lifecycle (Standard 30d → Glacier Instant 1y → Glacier Deep 6y) → Athena Workgroup with scan limits.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  s3: {
    title: 'Amazon S3 — Object Storage',
    subtitle: '11-nines durability, infinitely scalable, the foundation of AWS',
    estReadMin: 10,
    overview: `
S3 (Simple Storage Service) is object storage — flat namespace, key→value (the
"key" is the path, the "value" is the file bytes plus metadata). It is NOT a
file system. There are no real folders; prefix-based paths just LOOK like
folders in the console.

S3 powers data lakes, static websites, backups, content distribution origins,
log aggregation, and is the durability anchor for almost every other AWS
service (CloudTrail logs, AWS Backup, Athena, Glue all read/write to S3).
You will see S3 in roughly half of all exam questions.`,
    sections: [
      {
        title: 'Storage classes (the most-tested topic)',
        body: 'Each class trades retrieval cost/time for storage cost. Choose based on access pattern:',
        table: {
          headers: ['Class', 'Use case', 'Min storage', 'Retrieval'],
          rows: [
            ['Standard', 'Frequent access', 'None', 'Milliseconds'],
            ['Intelligent-Tiering', 'Unknown / changing access', 'None', 'Milliseconds (Frequent tier)'],
            ['Standard-IA', 'Infrequent but quick recall', '30 days', 'Milliseconds'],
            ['One Zone-IA', 'Recreate-able infrequent', '30 days', 'Milliseconds (1 AZ only)'],
            ['Glacier Instant Retrieval', 'Archive with ms access', '90 days', 'Milliseconds'],
            ['Glacier Flexible Retrieval', 'Archive', '90 days', '1 min – 12 hrs'],
            ['Glacier Deep Archive', 'Cheapest long-term', '180 days', '12 – 48 hrs'],
          ],
        },
      },
      {
        title: 'Lifecycle rules',
        body: `Lifecycle automates moving objects between classes + deleting them. Common pattern: Standard for 30 days → Standard-IA for 60 days → Glacier Flexible for 5 years → expire. Apply per-bucket or per-prefix or by object tag.`,
        bullets: [
          'Transitions only go one way (cheaper-tier movement) — can\'t lifecycle back to Standard',
          'Minimum storage duration applies (e.g. 30 days in Standard-IA), early deletion charged for the full minimum',
          'Expiry deletes the object; for versioned buckets you can expire non-current versions separately',
        ],
      },
      {
        title: 'Encryption options',
        bullets: [
          'SSE-S3 (AES-256, AWS-managed key) — free, simplest',
          'SSE-KMS (KMS key) — audit trail, customer-managed CMK option, S3 Bucket Keys cut KMS calls 99%',
          'SSE-C (customer-provided key) — AWS never stores the key; you send it with every request',
          'Client-side — encrypt before upload; AWS never sees plaintext',
          'Bucket policy can ENFORCE encryption: Deny s3:PutObject without the right SSE header',
        ],
      },
      {
        title: 'Versioning & MFA Delete',
        body: 'Versioning preserves every overwrite + delete (DELETE creates a "delete marker"). MFA Delete requires an MFA token to permanently delete object versions or disable versioning — extra protection against compromised IAM users.',
        bullets: [
          'Once Versioning is ENABLED, it can only be SUSPENDED, not removed',
          'MFA Delete can ONLY be enabled by the root user via CLI (not console)',
          'Versioning increases storage cost — old versions take space until explicitly deleted',
        ],
      },
      {
        title: 'Replication',
        bullets: [
          'CRR (Cross-Region Replication) — DR, latency optimisation, compliance',
          'SRR (Same-Region Replication) — cross-account audit, log aggregation, change of storage class',
          'Both require Versioning on source + destination',
          'Replication is async — use Replication Time Control (RTC) for 15-min SLA',
          'Replication does NOT replicate objects that existed BEFORE rule creation (use S3 Batch Replication for that)',
        ],
      },
      {
        title: 'Access control hierarchy',
        bullets: [
          'Block Public Access (account + bucket level) — overrides everything else',
          'Bucket Policy (resource-based, JSON) — most common for cross-account / public read',
          'IAM Policy (identity-based) — controls what users / roles in YOUR account can do',
          'Access Points — named endpoints per consumer with own policy',
          'ACLs — legacy, AWS recommends DISABLING them via "Bucket owner enforced"',
        ],
      },
      {
        title: 'Performance + cost optimisation',
        bullets: [
          'Multipart upload required > 5GB, recommended > 100MB (parallel + resume-able)',
          'Transfer Acceleration uses CloudFront edge for fast global uploads (extra cost)',
          'S3 Select reads SQL projection IN-PLACE — avoid downloading entire objects',
          'S3 Inventory generates daily/weekly CSV/Parquet of all objects (cheap audit)',
          'Storage Lens dashboards + recommendations across org',
          'Requester Pays bucket shifts data-transfer cost to downloader',
        ],
      },
    ],
    examTraps: [
      'Bucket names are GLOBALLY UNIQUE (across all AWS) — not per-account',
      'Strong read-after-write consistency for ALL operations (since Dec 2020) — old "eventually consistent" trivia is out',
      'PUT with same-key creates a new version if Versioning ON; overwrite if OFF',
      'You CANNOT lifecycle objects to a COLDER class within the minimum storage duration without paying the minimum',
      'Glacier Vault Lock vs Object Lock: Object Lock is the newer S3-native WORM (use this); Vault Lock is Glacier-only legacy',
      'Cross-region replication does NOT replicate existing objects — only NEW ones after rule creation',
    ],
    cheatsheet: [
      { k: 'Max object size', v: '5 TB (multipart) / 5 GB (single PUT)',
        desc: 'Anything > 100 MB should use multipart upload for parallel transfer + resume on failure.' },
      { k: 'Durability', v: '99.999999999% (11 nines)',
        desc: 'You\'d need to store 10 million objects for 10,000 years to expect to lose one. Highest in AWS.' },
      { k: 'Availability (Standard)', v: '99.99%',
        desc: 'About 52 minutes of unavailability/year. One Zone-IA drops to 99.5% (4 hours/year).' },
      { k: 'Bucket name max length', v: '63 characters',
        desc: 'Globally unique across ALL AWS accounts. Must be DNS-compliant (lowercase, no underscores).' },
      { k: 'Max buckets per account', v: '100 (soft) → 1000',
        desc: 'Soft limit. AWS recommends using ONE bucket with prefixes/Access Points rather than many buckets.' },
      { k: 'Default request rate', v: '3,500 PUT / 5,500 GET per prefix/sec',
        desc: 'Per PREFIX, not per bucket. Spread your key namespace across multiple prefixes for higher throughput.' },
      { k: 'Glacier retrieval times', v: 'Instant (ms) / Flexible (1m-12h) / Deep (12-48h)',
        desc: 'Pick based on how fast you might need it. Deep Archive is 4× cheaper than Standard-IA.' },
      { k: 'Strong consistency', v: 'All operations, since Dec 2020',
        desc: 'Read-after-write + list-after-write all strongly consistent. Old "eventual" trivia is OUT of the exam.' },
    ],
    flashcards: [
      { q: 'Cheapest tier for 10-year compliance archive?', a: 'Glacier Deep Archive (~$1/TB/month)' },
      { q: 'How to enforce KMS encryption on uploads?', a: 'Bucket policy denying PutObject without x-amz-server-side-encryption-aws-kms-key-id' },
      { q: 'Private origin for CloudFront — modern way?', a: 'Origin Access Control (OAC), replaces legacy OAI' },
      { q: 'Need queryable column projection of giant CSV?', a: 'S3 Select' },
      { q: 'Cross-account audit bucket in same region?', a: 'S3 SRR (Same-Region Replication) with cross-account destination' },
    ],
    resources: [
      { label: 'S3 User Guide', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html' },
      { label: 'S3 Best Practices', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html' },
      { label: 'Storage Classes Comparison', url: 'https://aws.amazon.com/s3/storage-classes/' },
    ],
    decisionTree: {
      title: 'Which S3 storage class should I use?',
      intro: 'Match the access pattern to the cheapest class that still meets your retrieval SLA. Don\'t over-pay for Standard if data goes cold.',
      rows: [
        { if: 'Frequent reads (multiple per day)', then: 'S3 Standard' },
        { if: 'Unknown / changing access pattern', then: 'S3 Intelligent-Tiering (auto-moves between tiers)' },
        { if: 'Infrequent (monthly) reads + ms latency required', then: 'Standard-IA' },
        { if: 'Recreate-able + cost more important than 11-9s durability', then: 'One Zone-IA' },
        { if: 'Archive accessed monthly with ms latency', then: 'Glacier Instant Retrieval' },
        { if: 'Archive accessed rarely + 1m-12h retrieval OK', then: 'Glacier Flexible Retrieval' },
        { if: 'Long-term compliance + 12-48h retrieval OK', then: 'Glacier Deep Archive (cheapest)' },
      ],
      tip: 'Use Lifecycle rules to AUTO-TRANSITION between classes as data ages. Don\'t pick a class once and forget it.',
    },
    workedExamples: [
      {
        title: 'Audit logs — 7-year retention, queryable within 24 hours',
        scenario: 'A company stores 50TB/year of audit logs. Logs must be queryable within 24 hours for the first year, then archived for 6 more years before deletion.',
        reasoning: [
          'First 30-90 days: heavily queried (debugging, incidents) — Standard makes sense for fast access.',
          'Days 90-365: occasional queries (quarterly reviews) — IA tier saves cost while keeping millisecond access.',
          'Years 1-7: very rare access (audit only) — but query SLA is 24 hours, so Flexible Retrieval (1m-12h) works. Deep Archive (12-48h) does NOT meet 24h SLA in the worst case.',
          'Year 7: expire to delete.',
          'Lifecycle policy automates all transitions — no manual work.',
        ],
        answer: 'Lifecycle: Standard 0-90d → Standard-IA 90-365d → Glacier Flexible Retrieval 1-7y → expire at year 7. Estimated annual savings vs Standard-only: ~70% on the cold portion.',
      },
      {
        title: 'Public dataset with downloader-paid model',
        scenario: 'A research lab publishes a 200TB genomics dataset. They want global researchers to download freely BUT can\'t afford the data-transfer bill themselves.',
        reasoning: [
          'Default S3 model: publisher (bucket owner) pays for data transfer out — at 200TB scale, this could be $20k+/month.',
          'S3 Requester Pays bucket: configures the bucket so that DOWNLOADERS pay for data transfer + request costs, not the publisher.',
          'Downloaders must include x-amz-request-payer header on requests — confirms they understand they\'ll be billed.',
          'Publisher continues to pay only for STORAGE (~$5,000/month for 200TB Standard).',
          'For even lower storage cost, Intelligent-Tiering moves rarely-accessed parts to cheaper tiers automatically.',
        ],
        answer: 'S3 bucket with Requester Pays ENABLED + Intelligent-Tiering storage class. Lab pays storage only; researchers pay their own egress. The AWS Open Data Program follows this exact pattern.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  ec2: {
    title: 'Amazon EC2 — Elastic Compute Cloud',
    subtitle: 'Virtual servers in the cloud — the original AWS service',
    estReadMin: 9,
    overview: `
EC2 gives you Linux/Windows VMs with full OS control. You pick the instance
type (CPU/RAM/network/storage profile), the AMI (the OS image), the network
(VPC + subnet), security groups (firewall), and storage (EBS volumes).

For SAA-C03 the most tested EC2 areas are: PRICING MODELS (On-Demand vs
Reserved vs Spot vs Savings Plans), AUTO SCALING + Launch Templates, EBS
storage classes (gp3/io2/st1), Placement Groups, and IMDSv2 / instance
profile security.`,
    sections: [
      {
        title: 'Instance family quick map',
        table: {
          headers: ['Family', 'Profile', 'Example workload'],
          rows: [
            ['T (burstable)', 'Cheap, bursty CPU', 'Web servers, dev/test'],
            ['M (general)', 'Balanced CPU/RAM', 'Small DBs, app servers'],
            ['C (compute)', 'High CPU per $', 'Batch processing, gaming servers'],
            ['R (memory)', 'High RAM', 'In-memory DBs, caches'],
            ['I / D', 'Storage-dense', 'NoSQL DBs, data warehouses'],
            ['G / P / Inf / Trn', 'GPU / ML accel', 'ML training, inference'],
            ['HPC6/HPC7', 'HPC-optimised', 'Tightly-coupled MPI'],
          ],
        },
      },
      {
        title: 'Pricing models (heavy on the exam)',
        body: 'Pick based on workload predictability + interruption tolerance:',
        table: {
          headers: ['Model', 'Discount', 'Commit', 'When to use'],
          rows: [
            ['On-Demand', '0%', 'None', 'Unpredictable / short bursts'],
            ['Standard RI', 'up to 72%', '1 or 3 yr (instance family locked)', 'Steady state, predictable'],
            ['Convertible RI', 'up to 66%', '1 or 3 yr (can change family)', 'Steady, may change family'],
            ['Compute Savings Plan', 'up to 66%', '1 or 3 yr commit on $/hr', 'Maximum flexibility (any family, region, Fargate, Lambda)'],
            ['EC2 Instance Savings Plan', 'up to 72%', 'Commit to family + region', 'Predictable family/region'],
            ['Spot', 'up to 90%', 'None (interruptible)', 'Batch, fault-tolerant, CI/CD'],
            ['Dedicated Host', 'BYOL premium', 'On-demand or Reserved', 'BYOL Windows / strict tenancy'],
            ['Dedicated Instance', 'small premium', 'On-demand or Reserved', 'Single-tenant hardware (less granular than Host)'],
          ],
        },
      },
      {
        title: 'EBS volume types',
        table: {
          headers: ['Type', 'Use case', 'Max IOPS', 'Cost'],
          rows: [
            ['gp3', 'General SSD', '16,000', 'Cheapest SSD'],
            ['gp2', 'Legacy general SSD', '16,000', 'Old generation'],
            ['io2', 'High-perf SSD', '64,000', '$$$'],
            ['io2 Block Express', 'Mission-critical', '256,000', '$$$$'],
            ['st1', 'Throughput HDD', '500', 'Cheap, big sequential'],
            ['sc1', 'Cold HDD', '250', 'Cheapest HDD'],
          ],
        },
      },
      {
        title: 'Placement Groups',
        bullets: [
          'Cluster — packs instances on the same rack for low latency (HPC, MPI)',
          'Spread — distinct hardware, max 7 per AZ (small critical clusters)',
          'Partition — distributes across partitions (HDFS, Cassandra)',
        ],
      },
      {
        title: 'Security essentials',
        bullets: [
          'IAM Instance Profile — preferred way to give EC2 AWS API access (NO embedded credentials)',
          'IMDSv2 — session-token based metadata service, defeats SSRF; enforce HttpTokens=required',
          'Security Groups — stateful, return traffic auto-allowed',
          'NACLs — stateless, must allow both directions, evaluated at subnet boundary',
          'KMS for EBS encryption — can be enabled at account level for all new volumes by default',
        ],
      },
      {
        title: 'High availability',
        bullets: [
          'EC2 Auto Recovery — system-status alarm migrates instance to new hardware on failure (same IP, EBS, ID)',
          'Auto Scaling Group across multi-AZ — replaces unhealthy instances automatically',
          'Hibernation — saves RAM to EBS root, restores on Start (encrypted root required)',
          'Stop = keep EBS (no compute charge); Terminate = delete EBS root by default',
        ],
      },
    ],
    examTraps: [
      'Spot is INTERRUPTIBLE with 2-min warning — never for stateful or strict-SLA workloads',
      'Reserved Instances are billed even when STOPPED — Savings Plans are the more flexible answer',
      'Instance Store data is LOST on Stop / Terminate — never for important data',
      'You CANNOT stop an instance-store-backed instance (only EBS-backed)',
      'IMDSv1 is vulnerable to SSRF — always pick IMDSv2 in security questions',
      'Hibernation requires encrypted root + specific instance types + RAM ≤ 150GB',
    ],
    cheatsheet: [
      { k: 'EC2 SLA', v: '99.99% per Region · 99.5% per single instance',
        desc: 'Multi-AZ gives 99.99%; single AZ failure cuts to 99.5%. Always architect across ≥2 AZs for prod.' },
      { k: 'On-Demand billing', v: 'Per-second (60 s minimum) for Linux + Windows',
        desc: 'You pay for the second a Stop is issued, not the full hour. RHEL still bills per-second since 2020.' },
      { k: 'Termination protection', v: 'OFF by default — must enable',
        desc: 'Prevents accidental Terminate via console/API. Standard pattern for prod databases / state-holding boxes.' },
      { k: 'Max EBS per instance', v: '~27 volumes on Linux; fewer on Windows',
        desc: 'NVMe-based instances have higher limits. Plan storage layout up front — adding EBS later requires OS work.' },
      { k: 'Spot interruption warning', v: '2 minutes (via instance metadata)',
        desc: 'Apps should watch http://169.254.169.254/latest/meta-data/spot/instance-action and gracefully drain.' },
      { k: 'AMI vs Snapshot', v: 'AMI = bootable template · Snapshot = volume backup',
        desc: 'AMI launches new instances. Snapshot restores a single volume. AMIs are made of multiple snapshots.' },
      { k: 'Reserved Instance terms', v: '1 or 3 year — All / Partial / No Upfront',
        desc: '3-yr All Upfront = deepest discount (~72%). Compute Savings Plan is more flexible at slightly lower discount.' },
      { k: 'Stop vs Terminate', v: 'Stop keeps EBS (no compute charge) · Terminate deletes root',
        desc: 'Termination deletes the root EBS by default — uncheck "Delete on termination" to keep it.' },
    ],
    flashcards: [
      { q: 'Predictable 3-year always-on workload?', a: '3-year Compute Savings Plan or Standard RI' },
      { q: 'EC2 in private subnet needs to reach S3 cheaply?', a: 'S3 Gateway VPC Endpoint (free)' },
      { q: 'How does EC2 securely access AWS APIs?', a: 'IAM Instance Profile (Role)' },
      { q: 'Need lowest-latency between two EC2 instances?', a: 'Cluster Placement Group + Nitro + ENA' },
      { q: 'Need to preserve RAM overnight to save cost?', a: 'EC2 Hibernation' },
    ],
    resources: [
      { label: 'EC2 User Guide (Linux)', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html' },
      { label: 'EC2 Pricing', url: 'https://aws.amazon.com/ec2/pricing/' },
      { label: 'EBS Volume Types', url: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html' },
    ],
    decisionTree: {
      title: 'Which EC2 pricing model should I pick?',
      intro: 'Pricing model is one of the most-tested EC2 topics. Always map the workload pattern to the right model.',
      rows: [
        { if: 'Unpredictable or short-term workload', then: 'On-Demand (most expensive but no commit)' },
        { if: 'Predictable 24/7 workload, same family forever', then: 'Standard Reserved Instance (up to 72% off)' },
        { if: 'Predictable but might change family / region / use Fargate or Lambda', then: 'Compute Savings Plan (up to 66% off, maximum flexibility)' },
        { if: 'Stateless / fault-tolerant batch (CI, data processing)', then: 'Spot Instances (up to 90% off, 2-min interruption warning)' },
        { if: 'Critical baseline + cheap burst capacity', then: 'ASG Mixed Instances Policy: On-Demand + Spot' },
        { if: 'BYOL with per-socket licensing', then: 'Dedicated Hosts (visibility into sockets)' },
        { if: 'Strict tenancy compliance (no shared hardware)', then: 'Dedicated Instances' },
      ],
      tip: 'For most production workloads, Compute Savings Plan beats Standard RI on flexibility for only a slightly smaller discount.',
    },
    workedExamples: [
      {
        title: 'Batch processing for a data analytics company',
        scenario: 'A company runs nightly batch jobs on EC2 — variable workload (some nights need 200 instances, some need 20). Each job is checkpointable and tolerant of interruption. Cost matters.',
        reasoning: [
          'Variable workload (20-200 instances) → Auto Scaling Group.',
          'Checkpointable + interruption-tolerant = perfect Spot candidate (up to 90% off On-Demand).',
          'Pure Spot risks ALL capacity being interrupted at once during pool shortage. Adding a small On-Demand baseline keeps minimum capacity stable.',
          'Mixed Instances Policy with multiple instance types (m5.large + m5a.large + m5n.large) widens Spot pools → lower interruption rate.',
          'capacityOptimized strategy picks from the deepest Spot pools — minimises interruptions vs lowestPrice.',
        ],
        answer: 'ASG with Mixed Instances Policy: 10% On-Demand baseline + 90% Spot across 3-5 m5-family instance types using capacityOptimized strategy. Combined with checkpointing in S3, the cluster survives interruptions seamlessly. ~85% cheaper than pure On-Demand.',
      },
      {
        title: 'Migrating a stateful workload that can\'t lose memory state',
        scenario: 'An EC2 instance runs a build server that holds 32GB of cached data in memory. Devs use it 9am-6pm. Outside hours it\'s idle but losing the cache costs 30 min of warmup the next day.',
        reasoning: [
          'Stop-then-Start would wipe the in-memory cache — 30 min warmup is unacceptable.',
          'Keeping it running 24/7 wastes 15 hours/day of EC2 cost.',
          'EC2 Hibernation flushes RAM to the encrypted root EBS volume on Stop. On Start, RAM is restored — no warmup.',
          'Requires: supported instance type (m5/c5/r5 family or newer), encrypted root volume, RAM ≤ 150GB.',
          'EventBridge scheduled rule + Lambda can hibernate at 18:00 and Start at 08:30 automatically.',
        ],
        answer: 'Enable Hibernation on the instance (encrypted root + supported type). Schedule via EventBridge → Lambda to hibernate evenings + start mornings. Devs arrive to a warm cache; compute cost drops ~60% with zero workflow disruption.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  vpc: {
    title: 'Amazon VPC — Virtual Private Cloud',
    subtitle: 'Your isolated network in AWS — every other service lives in or connects to a VPC',
    estReadMin: 10,
    overview: `
A VPC is a virtual private network in AWS. It has its own CIDR block (e.g.
10.0.0.0/16), broken into subnets (one per Availability Zone). Each subnet is
either PUBLIC (has a route to the Internet Gateway) or PRIVATE (does not).
Security is enforced at two layers: Security Groups (instance-level, stateful)
and NACLs (subnet-level, stateless).

The exam tests connectivity patterns heavily: how do private resources reach
the internet (NAT)? How do private resources reach AWS services without
internet (Endpoints)? How do VPCs reach each other (peering / TGW) and on-prem
networks (VPN / DX)?`,
    sections: [
      {
        title: 'Core building blocks',
        bullets: [
          'CIDR block — IPv4 range like 10.0.0.0/16. AWS reserves 5 IPs per subnet (first 4 + last)',
          'Subnets — region-scoped, one per AZ; public = has route to IGW, private = no route to IGW',
          'Route Tables — control where traffic goes (associated to subnets)',
          'Internet Gateway (IGW) — horizontally-scaled, redundant; one per VPC',
          'NAT Gateway — managed outbound NAT for private subnets ($32/mo + $0.045/GB)',
          'NAT Instance — self-managed EC2 alternative; cheaper but operational overhead',
          'Egress-Only Internet Gateway — IPv6 equivalent of NAT Gateway',
        ],
      },
      {
        title: 'VPC Endpoints — keep traffic private + save on NAT',
        body: 'Endpoints let resources in a VPC reach AWS services without going through the internet.',
        table: {
          headers: ['Endpoint type', 'Services', 'Cost'],
          rows: [
            ['Gateway', 'S3, DynamoDB only', 'FREE'],
            ['Interface (PrivateLink)', 'Most other AWS services', '$0.01/hr per endpoint per AZ + data charge'],
            ['Gateway Load Balancer endpoint', 'Third-party appliances', 'Paid'],
          ],
        },
      },
      {
        title: 'Connecting VPCs',
        bullets: [
          'VPC Peering — pairwise, non-transitive, no overlapping CIDRs',
          'Transit Gateway — hub-and-spoke for many VPCs + on-prem, transitive routing, scales to thousands',
          'PrivateLink — expose a service across accounts via Interface Endpoints (no peering needed)',
          'TGW Peering — connect TGWs across regions, encrypted on backbone',
        ],
      },
      {
        title: 'Hybrid networking (VPC ↔ on-prem)',
        table: {
          headers: ['Option', 'Speed', 'Cost', 'SLA'],
          rows: [
            ['Site-to-Site VPN', 'Up to 1.25 Gbps per tunnel', 'Low', 'Internet-dependent'],
            ['Direct Connect (DX)', '1-100 Gbps', 'High', 'Reliable + low latency'],
            ['DX + VPN', 'DX speed', 'High', 'IPsec encryption over DX'],
            ['DX Maximum Resiliency', 'Multiple DX', '$$$$', '99.99%'],
          ],
        },
      },
      {
        title: 'Security Groups vs NACLs',
        table: {
          headers: ['Aspect', 'Security Group', 'NACL'],
          rows: [
            ['Level', 'Instance ENI', 'Subnet'],
            ['Stateful?', 'Yes — return traffic auto-allowed', 'No — must allow both directions'],
            ['Rules', 'Allow only', 'Allow + Deny'],
            ['Default', 'Deny all inbound, allow all outbound', 'Default NACL = allow all both ways'],
            ['Rule evaluation', 'All rules evaluated (any match = allow)', 'In numbered order, first match wins'],
          ],
        },
      },
      {
        title: 'Observability + diagnosis',
        bullets: [
          'VPC Flow Logs — capture ENI traffic metadata to S3 / CloudWatch (Parquet to S3 + Athena is most cost-effective)',
          'VPC Reachability Analyzer — graphical path analysis between two ENIs (saves hours of debugging)',
          'Network Access Analyzer — proves "no path exists" from internet to sensitive resources',
          'AWS Network Manager — visualises TGWs, VPNs, DX across the org',
        ],
      },
    ],
    examTraps: [
      'VPC Peering is NON-TRANSITIVE — A↔B + B↔C does NOT give A↔C; use TGW',
      'Gateway Endpoints (S3, DDB) are FREE; Interface Endpoints (all other services) are PAID',
      'NACLs are STATELESS — if you allow inbound 443, you must also allow outbound 1024-65535 (ephemeral)',
      'Cannot change a VPC\'s primary CIDR after creation (can add secondary CIDRs)',
      'Default NAT Gateway only operates in ONE AZ — multi-AZ requires one per AZ',
      'AWS reserves the first 4 IPs + last IP in every subnet (so a /28 = 11 usable, not 16)',
    ],
    cheatsheet: [
      { k: 'Smallest subnet allowed', v: '/28 (16 IPs, 11 usable)',
        desc: 'AWS reserves first 4 + last IP in every subnet. /28 only gives 11 usable — too tight for most production workloads.' },
      { k: 'Largest subnet allowed', v: '/16 (65,531 usable IPs)',
        desc: 'Rarely used for a single subnet. Typical pattern: /16 VPC with multiple /24 subnets per AZ.' },
      { k: 'VPCs per region', v: '5 default (soft limit)',
        desc: 'Raise via Service Quotas. For many VPCs, consider Organizations + a network account hosting TGW.' },
      { k: 'Subnets per VPC', v: '200 (soft limit)',
        desc: 'More than enough for typical 3-AZ × multi-tier (public/private/data) designs.' },
      { k: 'NAT Gateway bandwidth', v: 'Up to 100 Gbps · auto-scales',
        desc: 'But it costs $0.045/GB processed. For S3/DDB use Gateway Endpoints to bypass NAT entirely.' },
      { k: 'DX latency vs internet', v: '~10× lower + predictable',
        desc: 'Internet path varies; DX is dedicated fiber. Required for sub-10ms hybrid latency SLAs.' },
      { k: 'VPC peering cost', v: 'Free intra-region · paid cross-region',
        desc: 'Cross-region peering = standard inter-region data transfer rates. TGW peering also paid.' },
      { k: 'Default route table', v: 'Allows ALL traffic within VPC; ZERO routes out',
        desc: 'Add IGW route (0.0.0.0/0 → igw-xxx) to make a subnet "public". Without it, subnets are private by default.' },
    ],
    flashcards: [
      { q: 'Private EC2 reach S3 without NAT charges?', a: 'S3 Gateway VPC Endpoint (free)' },
      { q: 'Need transitive routing between 20 VPCs?', a: 'Transit Gateway' },
      { q: 'Need encrypted traffic over Direct Connect?', a: 'IPsec VPN over DX, or MACsec at L2' },
      { q: 'Centralised egress firewall for whole VPC?', a: 'AWS Network Firewall' },
      { q: 'IPv6 outbound only (no inbound)?', a: 'Egress-Only Internet Gateway' },
    ],
    resources: [
      { label: 'VPC User Guide', url: 'https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html' },
      { label: 'VPC Endpoints', url: 'https://docs.aws.amazon.com/vpc/latest/privatelink/concepts.html' },
      { label: 'AWS Multi-VPC Whitepaper', url: 'https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/welcome.html' },
    ],
    decisionTree: {
      title: 'How should this connect to that?',
      intro: 'Connectivity questions are the most-tested VPC topic. Match the source/target to the right primitive.',
      rows: [
        { if: 'Private EC2 → S3 / DynamoDB', then: 'Gateway VPC Endpoint (FREE)' },
        { if: 'Private EC2 → other AWS service (SNS/SQS/Secrets/etc.)', then: 'Interface VPC Endpoint (PrivateLink) — paid' },
        { if: 'VPC ↔ VPC (1 pair, same or different account/region)', then: 'VPC Peering (non-transitive)' },
        { if: 'Many VPCs need any-to-any', then: 'Transit Gateway hub-and-spoke' },
        { if: 'Cross-region TGW connectivity', then: 'TGW Peering (encrypted on AWS backbone)' },
        { if: 'SaaS providing service to customers in their own VPCs', then: 'PrivateLink (Interface Endpoint pattern)' },
        { if: 'On-prem network (high bandwidth, low latency)', then: 'Direct Connect + Transit VIF + TGW' },
        { if: 'On-prem backup or quick start', then: 'Site-to-Site VPN over the internet' },
        { if: 'Remote individual users → VPC', then: 'AWS Client VPN' },
      ],
      tip: 'Always check if a Gateway Endpoint exists before reaching for NAT — saves both data charges and improves security.',
    },
    workedExamples: [
      {
        title: 'Three-tier app with public web + private app + private DB',
        scenario: 'Design a VPC for: public web tier (ALB-fronted), private app tier (EC2 in ASG), private DB tier (RDS Multi-AZ). Region: eu-west-1. 3 AZs for HA. App needs S3 access.',
        reasoning: [
          'VPC CIDR: 10.0.0.0/16 — plenty of room. Plan 3 AZs × 3 tiers = 9 subnets.',
          'Public subnets (one per AZ, e.g. 10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24) for ALB + NAT Gateways. Route 0.0.0.0/0 → IGW.',
          'Private app subnets (10.0.10.0/24 etc.) for EC2. Route 0.0.0.0/0 → NAT Gateway in same AZ.',
          'Private DB subnets (10.0.20.0/24 etc.) for RDS. No internet route — DB never reaches out.',
          'App needs S3 → add Gateway Endpoint for S3, avoid paying NAT data transfer for bulk S3 reads.',
          'NAT Gateway in EACH AZ (not just one) for fault tolerance — single NAT = single AZ = AZ-level SPOF.',
        ],
        answer: 'VPC 10.0.0.0/16 in eu-west-1 with 3 AZs. 9 subnets (public/private-app/private-db × 3 AZs). NAT Gateway per AZ in public subnets. S3 Gateway Endpoint on private-app + private-db route tables. ALB in public subnets, EC2 ASG in private-app, RDS Multi-AZ across private-db.',
      },
      {
        title: 'Enterprise with 30 VPCs needing transitive connectivity',
        scenario: 'A bank has 30 VPCs across 2 regions plus 3 on-prem data centres. Each VPC currently peers to ~5 others via VPC Peering. Routing is unmanageable. They want any-to-any.',
        reasoning: [
          'Current peering = O(n²) explosion. 30 VPCs needs ~435 peerings for full mesh. Already unmanageable.',
          'VPC Peering is NON-TRANSITIVE → packets can\'t hop through a peer to reach a third VPC. Forces full mesh.',
          'Transit Gateway is hub-and-spoke + transitive. Each VPC attaches ONCE → 30 attachments instead of 435 peerings.',
          'For 2 regions: one TGW per region + TGW Peering between them (encrypted on AWS backbone).',
          'For on-prem: Direct Connect (or VPN) → Transit VIF → TGW (replaces N Private VIFs to per-VPC connections).',
          'Multiple TGW route tables enforce isolation (e.g. dev vs prod vs shared services) within the hub.',
        ],
        answer: 'Two TGWs (one per region) + TGW Peering between them. All 30 VPCs attached. DX Transit VIF connects on-prem → TGW. Multiple TGW route tables for dev/prod isolation. RAM-shared TGW for cross-account VPC attachments.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  iam: {
    title: 'AWS IAM — Identity and Access Management',
    subtitle: 'Who can do what to which resources — the foundation of AWS security',
    estReadMin: 8,
    overview: `
Every API call to AWS goes through IAM. IAM defines IDENTITIES (users, roles,
groups) and POLICIES (what those identities can do). The exam tests deeply on
policy evaluation logic, the role of resource-based policies, federated access
patterns, and the right tool for each delegation scenario.`,
    sections: [
      {
        title: 'Identities',
        bullets: [
          'IAM User — long-lived identity with password / access keys (avoid for apps, prefer roles)',
          'IAM Role — assumable identity with temporary credentials via STS (USE THIS for apps + cross-account)',
          'IAM Group — collection of users with shared permissions',
          'Root user — owns the account; lock away, enable MFA, never use day-to-day',
          'Federated identities — via SAML, OIDC, Identity Center (workforce SSO)',
          'IAM Identity Center (formerly AWS SSO) — workforce SSO across all org accounts',
        ],
      },
      {
        title: 'Policy types',
        table: {
          headers: ['Type', 'Attached to', 'Purpose'],
          rows: [
            ['Identity-based', 'User / Role / Group', 'Most common — what THIS identity can do'],
            ['Resource-based', 'Resource (S3 bucket, KMS key, etc.)', 'What others can do to THIS resource'],
            ['Permission Boundary', 'User / Role', 'MAX permissions an identity can have'],
            ['SCP (Service Control Policy)', 'OU / Account in Organizations', 'Org-wide guardrail (cannot grant, only deny)'],
            ['Session Policy', 'AssumeRole call', 'Further restrict an assumed session'],
            ['Access Control List (ACL)', 'S3 / VPC subnet', 'Legacy — usually disabled'],
          ],
        },
      },
      {
        title: 'Policy evaluation logic (MUST know)',
        body: 'Every API call evaluated:',
        bullets: [
          '1) Explicit DENY anywhere → DENIED (always wins, even over root)',
          '2) Explicit ALLOW in identity OR resource policy → ALLOWED (if no Deny)',
          '3) Default: DENIED (implicit deny)',
          'SCP must also allow (in Organizations) — SCP is a filter, not a grant',
          'Permission Boundary must also allow (if attached)',
          'Session Policy must also allow (if assuming role with policy)',
        ],
      },
      {
        title: 'Delegation + cross-account patterns',
        bullets: [
          'Cross-account access: identity in Account A assumes role in Account B via STS AssumeRole',
          'External ID — used with vendor cross-account roles to prevent confused-deputy attack',
          'Resource-based policy on the resource in Account B grants the principal in A',
          'SAML federation — corporate IdP → SAML assertion → STS AssumeRoleWithSAML',
          'Web identity federation — OIDC tokens (Cognito, Google, Facebook) → AssumeRoleWithWebIdentity',
        ],
      },
      {
        title: 'IAM features for guardrails + governance',
        bullets: [
          'Permission Boundary — caps the MAX permissions (e.g. delegate role creation to devs with a boundary)',
          'SCPs — org-wide hard guardrails (e.g. "deny cloudtrail:StopLogging in all accounts")',
          'IAM Access Analyzer — finds resources accessible from OUTSIDE your account / org',
          'Credential Reports — CSV audit of every user (MFA, last login, key age)',
          'Access Advisor — shows services NOT used → right-size policies',
        ],
      },
      {
        title: 'Conditions to memorise',
        bullets: [
          'aws:MultiFactorAuthPresent — require MFA',
          'aws:SourceIp — restrict to IP range',
          'aws:SecureTransport — require HTTPS',
          'aws:PrincipalOrgID — restrict to identities in your Organization',
          'aws:RequestedRegion — restrict to specific regions',
          'aws:PrincipalTag/key — match a tag on the calling principal (ABAC pattern)',
          'aws:ResourceTag/key — match a tag on the resource',
        ],
      },
    ],
    examTraps: [
      'Explicit DENY ALWAYS wins — even root cannot override an SCP deny in member accounts',
      'SCPs cannot GRANT permissions — they only filter what IAM policies can allow',
      'Permission Boundaries DO NOT grant permissions on their own — they limit what an attached IAM policy can grant',
      'IAM Roles do NOT have credentials — they have a trust policy + permissions; STS issues temp creds on assume',
      'Resource-based policies + identity policies are UNION — either ALLOW grants access (subject to no Deny)',
      'Cross-account access REQUIRES BOTH sides: identity policy in source + trust policy in target',
    ],
    cheatsheet: [
      { k: 'No policy attached', v: 'Implicit DENY — everything denied',
        desc: 'AWS default-deny. You must explicitly Allow every action. New IAM users/roles can do NOTHING until policies are attached.' },
      { k: 'Managed policies per principal', v: '20 (soft limit)',
        desc: 'Use Permission Boundaries to consolidate. AWS managed policies count toward this; raise via Service Quotas.' },
      { k: 'Inline policy size', v: '2,048 chars (user) / 10,240 (role / group)',
        desc: 'Inline policies are 1:1 attached. For shared logic prefer Customer Managed Policies (versionable, reusable).' },
      { k: 'STS token max duration', v: '12 hours (1 hr if role-chaining)',
        desc: 'Default is 1 hour. Configure DurationSeconds on the AssumeRole call (capped by the role\'s MaxSessionDuration setting).' },
      { k: 'Identity Center accounts', v: 'No hard limit',
        desc: 'Scales to thousands of accounts. The modern workforce SSO answer — supersedes IAM users per account.' },
      { k: 'SCP behaviour', v: 'Filter only — never grants',
        desc: 'SCPs can ONLY restrict what IAM allows. Without a matching IAM Allow, an SCP Allow grants nothing.' },
      { k: 'Permission Boundary', v: 'Caps MAX permissions an identity can have',
        desc: 'Effective permissions = IAM Allow ∩ Boundary Allow. Used to delegate IAM role creation safely.' },
      { k: 'Cross-account access', v: 'Role + Trust Policy + sts:AssumeRole',
        desc: 'NEVER share IAM credentials. The standard pattern: target account creates a role trusting source account; source\'s identity assumes it.' },
    ],
    flashcards: [
      { q: 'How to grant org-wide guardrail blocking CloudTrail delete?', a: 'SCP in Organizations' },
      { q: 'How to delegate role creation safely to devs?', a: 'Permission Boundary requiring boundary on created roles' },
      { q: 'How to prevent confused-deputy in vendor cross-account access?', a: 'External ID in trust policy' },
      { q: 'How to find S3 buckets exposed externally?', a: 'IAM Access Analyzer' },
      { q: 'Cleanest workforce SSO across 50 accounts?', a: 'IAM Identity Center with AD integration' },
    ],
    resources: [
      { label: 'IAM User Guide', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html' },
      { label: 'Policy Evaluation Logic', url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html' },
      { label: 'Identity Center', url: 'https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html' },
    ],
    decisionTree: {
      title: 'Which IAM mechanism fits this access scenario?',
      intro: 'IAM has many primitives. Match the use case to the right one — don\'t default to IAM users.',
      rows: [
        { if: 'EC2 / Lambda / ECS task needs AWS API access', then: 'IAM Role (Instance Profile / Execution Role / Task Role)' },
        { if: 'Workforce needs to sign in to multiple AWS accounts', then: 'IAM Identity Center + corporate IdP' },
        { if: 'Mobile/web app users need scoped AWS access', then: 'Cognito Identity Pool + IAM Role with session tags' },
        { if: 'Vendor needs cross-account access to your account', then: 'IAM Role + Trust Policy with sts:ExternalId' },
        { if: 'Org-wide guardrail "no one can delete CloudTrail"', then: 'SCP at OU level in Organizations' },
        { if: 'Devs need self-service IAM but with limits', then: 'Permission Boundary requiring boundary on created roles' },
        { if: 'Per-user S3 prefix scoping for many users', then: 'IAM Role + session tags + bucket policy with aws:PrincipalTag' },
        { if: 'On-prem app needs short-lived AWS creds', then: 'STS AssumeRoleWithSAML (or WithWebIdentity for OIDC)' },
      ],
      tip: 'If the answer feels like "create an IAM user with access keys" — it\'s almost certainly the wrong answer on the exam. Prefer roles + federation.',
    },
    workedExamples: [
      {
        title: 'Cross-account access to a SaaS vendor — preventing confused-deputy',
        scenario: 'A SaaS monitoring vendor needs read access to your CloudWatch metrics for analysis. They have many customers using the same Lambda functions in their account. How do you grant access without risking that another customer can also assume YOUR role?',
        reasoning: [
          'You\'ll create an IAM Role in YOUR account that the vendor\'s account can assume — standard cross-account pattern.',
          'Risk: If the trust policy only checks the vendor\'s account ID, ANY identity in their account (e.g. another customer\'s session) could potentially assume your role. This is the "confused deputy" problem.',
          'Mitigation: include sts:ExternalId in the trust policy. The vendor must supply a customer-specific secret ID on AssumeRole. Each customer gets a different External ID.',
          'Even if attacker compromises another customer\'s account in the vendor\'s system, they don\'t know YOUR External ID — can\'t assume your role.',
          'Vendor stores per-customer External IDs securely and passes the correct one when assuming your role.',
        ],
        answer: 'IAM Role with Trust Policy: Principal = vendor account ID, Condition = sts:ExternalId equals your unique customer ID. Vendor\'s SDK call: AssumeRole(RoleArn=..., ExternalId="<your-id>"). This is exactly how Datadog, PagerDuty, etc. set up customer cross-account roles.',
      },
      {
        title: 'Self-service IAM with guardrails',
        scenario: 'A platform team has 50 developers. Devs need to create their own IAM roles for Lambda functions but must never grant permissions outside dynamodb:*, s3:GetObject, and cloudwatch logs. How do you enforce this without manually reviewing every role?',
        reasoning: [
          'Manual review doesn\'t scale to 50 devs deploying daily.',
          'SCP could block all IAM actions but that prevents the desired self-service.',
          'Permission Boundaries cap the MAX permissions an IAM principal can have. Even if a dev attaches a broad policy, effective permissions = policy ∩ boundary.',
          'Create a "DevBoundary" managed policy limiting to dynamodb:* + s3:GetObject + logs:*',
          'Create a dev role that allows iam:CreateRole + iam:AttachRolePolicy ONLY if the new role has the DevBoundary attached (using a Condition on iam:PermissionsBoundary).',
          'Devs can self-serve role creation. Boundaries prevent them from ever granting unintended permissions.',
        ],
        answer: 'Create DevBoundary managed policy (allowed actions only). Create DevSelfService role with iam:CreateRole permission CONDITIONED on iam:PermissionsBoundary = DevBoundary ARN. Devs use DevSelfService to create roles; boundaries cap effective permissions automatically.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  lambda: {
    title: 'AWS Lambda — Function as a Service',
    subtitle: 'Run code without managing servers — event-driven, sub-second startup',
    estReadMin: 8,
    overview: `
Lambda runs your code in response to events (HTTP request, S3 upload, SQS
message, EventBridge schedule, etc.) without you provisioning or scaling
servers. You pay per invocation + per GB-second of memory × duration.

The exam tests deeply on Lambda's INTEGRATIONS (which services trigger it),
its execution model (cold starts, concurrency), security (VPC, env vars,
secrets), deployment patterns (versions, aliases, canaries), and when NOT to
use Lambda (long-running, stateful, very-high-memory workloads).`,
    sections: [
      {
        title: 'Execution model',
        bullets: [
          'Cold start — first invocation initialises the runtime + your INIT code (~100ms–2s)',
          'Warm start — subsequent invocations reuse the execution environment (sub-10ms)',
          'Each execution environment handles ONE request at a time (no in-process concurrency)',
          'Concurrent invocations = N execution environments running in parallel',
          'Account default: 1000 concurrent executions (raise via support)',
        ],
      },
      {
        title: 'Concurrency controls',
        bullets: [
          'Reserved Concurrency — guarantees N concurrent executions for this function (others can\'t consume)',
          'Provisioned Concurrency — keeps N execution environments warm (no cold starts; pay hourly)',
          'SnapStart (Java) — snapshots initialised JVM, restores in <200ms — free, no code change',
          'Throttle limit = function concurrency. Hit it → 429 errors',
        ],
      },
      {
        title: 'Integrations + event source types',
        table: {
          headers: ['Source', 'Model', 'Notes'],
          rows: [
            ['API Gateway / ALB / Function URL', 'Sync', 'Request/response'],
            ['S3 / SNS / EventBridge', 'Async (event)', 'Lambda Destinations for success/failure routing'],
            ['SQS / Kinesis / DynamoDB Streams / MSK', 'Poll (event source mapping)', 'Lambda polls + invokes in batches'],
            ['CloudWatch Events / Schedule', 'Async', 'Cron jobs'],
          ],
        },
      },
      {
        title: 'Limits to know',
        bullets: [
          'Max timeout: 15 minutes',
          'Max memory: 10 GB (allocated CPU scales with memory)',
          'Deployment package: 50 MB zipped / 250 MB unzipped (Layer adds 5x250MB)',
          'Container image: up to 10 GB (stored in ECR)',
          'Environment variables: 4 KB total',
          '/tmp storage: 512 MB default, up to 10 GB configurable',
          'Account concurrency: 1000 default (region-wide)',
        ],
      },
      {
        title: 'Networking',
        bullets: [
          'Default: Lambda runs in AWS-managed network with internet access',
          'VPC-attached Lambda: subnets + SG; gets a Hyperplane ENI (shared, scales automatically)',
          'VPC Lambda + Internet — needs NAT Gateway (or VPC Endpoint for S3/DDB)',
          'VPC Lambda + RDS — connect to RDS Proxy to avoid connection storms',
        ],
      },
      {
        title: 'Security best practices',
        bullets: [
          'IAM execution role grants the function its AWS permissions (least-privilege)',
          'Env vars encrypted at rest with KMS (customer-managed for audit)',
          'Real secrets — use Secrets Manager + cache on cold start',
          'Resource-based policy controls WHO can invoke the function (cross-account, S3 event)',
          'Code signing — enforce signed packages via Lambda Code Signing',
        ],
      },
      {
        title: 'Deployment patterns',
        bullets: [
          'Versions — immutable snapshots of code + config (numeric, e.g. v1, v2)',
          'Aliases — pointers to a version (e.g. "live", "staging") that you can re-point',
          'Weighted alias — split traffic 90/10 between two versions for canary',
          'Lambda Destinations — onSuccess + onFailure targets for async invocations',
          'CodeDeploy Lambda — automated canary / linear traffic shift with rollback',
        ],
      },
    ],
    examTraps: [
      'Lambda max timeout = 15 MINUTES. Longer = Step Functions, Fargate, or EC2',
      'Lambda is single-request-per-env. Don\'t cache state expecting persistence (use external state)',
      'Lambda VPC was rewritten — no more ENI-per-execution. If hitting old ENI limits, recreate the function',
      'Provisioned Concurrency ≠ Reserved Concurrency: one keeps warm, the other guarantees a slot',
      'Lambda cold starts CANNOT be eliminated without Provisioned Concurrency / SnapStart',
      'Env vars are NOT a place for highly sensitive secrets — use Secrets Manager',
    ],
    cheatsheet: [
      { k: 'Max execution time', v: '15 minutes per invocation',
        desc: 'Hard limit. Workloads > 15 min need Step Functions (orchestrate multiple Lambdas) or Fargate / Batch.' },
      { k: 'Max memory', v: '128 MB – 10 GB (CPU scales with it)',
        desc: 'CPU is allocated proportionally. 1769 MB = 1 full vCPU. Higher memory often makes functions FINISH faster + cheaper.' },
      { k: 'Default concurrency', v: '1,000 concurrent per region',
        desc: 'Soft limit. Raise via Support. Reserve a slice per critical function with Reserved Concurrency.' },
      { k: 'Free tier', v: '1M requests + 400k GB-seconds / month',
        desc: 'Lifetime free (not just 12 months). Enough for many small apps to run at $0/month.' },
      { k: 'Cold start latency', v: '~100ms Node · 200ms Python · up to 2s Java',
        desc: 'Eliminate via Provisioned Concurrency (any runtime, $) or SnapStart (Java only, free).' },
      { k: 'Deployment package size', v: '50 MB zipped / 250 MB unzipped (Layer ≤ 50 MB)',
        desc: 'Container images allow up to 10 GB — use them when you need ffmpeg, ML models, or custom runtimes.' },
      { k: '/tmp storage', v: '512 MB default · up to 10 GB',
        desc: 'Useful for processing large files in-memory. Configurable per function. Persists across warm invocations.' },
      { k: 'Async retry policy', v: '2 retries with exponential backoff',
        desc: 'For async invocations (S3, EventBridge). Use Lambda Destinations onFailure or DLQ to capture failures.' },
    ],
    flashcards: [
      { q: 'Lambda needs RDS in VPC AND large S3 reads cheaply?', a: 'Lambda in VPC + S3 Gateway Endpoint' },
      { q: 'How to guarantee 100 concurrent executions always?', a: 'Reserved Concurrency = 100' },
      { q: 'How to eliminate Java cold starts free?', a: 'Lambda SnapStart' },
      { q: 'Lambda > 15 minutes runtime?', a: 'Step Functions or Fargate' },
      { q: 'Connection storms to RDS from Lambda?', a: 'RDS Proxy' },
    ],
    resources: [
      { label: 'Lambda Developer Guide', url: 'https://docs.aws.amazon.com/lambda/latest/dg/welcome.html' },
      { label: 'Lambda Best Practices', url: 'https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html' },
      { label: 'Lambda Limits', url: 'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html' },
    ],
    decisionTree: {
      title: 'Lambda or something else?',
      intro: 'Lambda is great but not for everything. Match the workload shape to the right compute option.',
      rows: [
        { if: 'Event-driven, < 15 min, < 10 GB RAM, stateless', then: 'Lambda' },
        { if: 'Long-running > 15 minutes', then: 'Fargate or EC2 + ASG' },
        { if: 'Steady high-utilisation (always-on)', then: 'EC2 with Savings Plan (cheaper than Lambda at 24/7 scale)' },
        { if: 'Container-based, need orchestration', then: 'ECS Fargate or EKS' },
        { if: 'Multi-step workflow with branching + retry', then: 'Step Functions (calling Lambda + other services)' },
        { if: 'High-throughput batch (millions of items)', then: 'AWS Batch with EC2 / Fargate' },
        { if: 'Heavy ML inference with GPU', then: 'SageMaker endpoints or EC2 with GPU' },
      ],
      tip: 'If a workload runs for hours per day at steady load, EC2 with a Savings Plan is usually cheaper than Lambda. Lambda wins on spiky / intermittent / event-driven loads.',
    },
    workedExamples: [
      {
        title: 'Image-processing pipeline that occasionally bursts to 10,000 concurrent uploads',
        scenario: 'A photo app processes user uploads — resize, generate thumbnails, write to DynamoDB. Normal load: 100 uploads/min. Bursts: 10,000 simultaneous. SLA: p95 < 3 seconds.',
        reasoning: [
          'Burst pattern → serverless wins. Provisioning EC2 for 10k peak wastes money 95% of the time.',
          'Direct S3 → Lambda risks throttling at 10k concurrent (account default = 1000).',
          'Decouple via SQS between S3 event and Lambda → queue absorbs the spike, Lambda drains at concurrency limit.',
          'Reserved Concurrency = 1000 on the Lambda guarantees capacity isn\'t starved by other functions.',
          'For p95 < 3s during spikes, image-resize Lambda may have cold-start issues. Provisioned Concurrency = 200 keeps that many warm at all times.',
          'DynamoDB On-Demand handles the write spike automatically.',
        ],
        answer: 'S3 PUT event → SQS → Lambda (Reserved Concurrency 1000, Provisioned Concurrency 200) → DynamoDB On-Demand. SQS DLQ captures persistent failures. Total cost during normal hours: ~$50/mo; during 1-hour burst: ~$15.',
      },
      {
        title: 'Java Lambda with cold-start problem',
        scenario: 'A Java Lambda behind API Gateway has cold starts of ~2 seconds. SLA requires p99 latency under 200ms. The team doesn\'t want to rewrite in Node.js.',
        reasoning: [
          'JVM startup is the main culprit — every cold environment has to initialize the JVM + load classes + warm up JIT.',
          'Provisioned Concurrency keeps N execution environments WARM — eliminates cold starts but costs money for idle warm capacity.',
          'SnapStart (Java only, free) snapshots the initialized JVM after the INIT phase, then restores from snapshot on cold start. ~10× faster cold starts (200ms vs 2s).',
          'SnapStart works with Java 11/17 Corretto runtimes — no app code changes needed (just enable the feature).',
          'For absolutely critical p99, combine SnapStart + Provisioned Concurrency for ~zero cold starts.',
        ],
        answer: 'Enable Lambda SnapStart (Java only, no extra cost). Cold starts drop from ~2s to ~200ms. If still not meeting p99 SLA, layer Provisioned Concurrency on top of SnapStart for baseline warm capacity.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  dynamodb: {
    title: 'Amazon DynamoDB — NoSQL Key-Value & Document Database',
    subtitle: 'Single-digit-millisecond reads at any scale — serverless, fully managed',
    estReadMin: 9,
    overview: `
DynamoDB is a fully-managed NoSQL database. Tables are SCHEMALESS except for
the PRIMARY KEY (partition key, optionally + sort key). Data is auto-sharded
across partitions by hashing the partition key. Reads/writes are billed in
RCU/WCU (provisioned) or per-request (On-Demand).

The exam tests deeply on TABLE DESIGN (primary keys, GSI vs LSI), CAPACITY
MODES (On-Demand vs Provisioned), STREAMS + Triggers, GLOBAL TABLES for
multi-region, BACKUPS (PITR, on-demand), and HOT PARTITION patterns.`,
    sections: [
      {
        title: 'Keys + queries',
        bullets: [
          'Partition Key (Hash Key) — determines which partition stores the item',
          'Sort Key (Range Key) — orders items within a partition; (PK, SK) is the composite primary key',
          'GetItem (PK + SK) — fastest, returns one item',
          'Query (PK + optional SK condition) — within a partition',
          'Scan — reads entire table (avoid; use only as last resort)',
        ],
      },
      {
        title: 'Indexes (heavily tested)',
        table: {
          headers: ['Feature', 'GSI', 'LSI'],
          rows: [
            ['When created', 'Any time', 'Only at table creation'],
            ['Partition key', 'Different from base', 'Same as base'],
            ['Sort key', 'Different from base', 'Different from base'],
            ['Capacity', 'Own RCU/WCU', 'Shares with base'],
            ['Consistency', 'Eventually consistent', 'Strong or eventual'],
            ['Size limit', 'No limit', '10 GB per partition key value'],
          ],
        },
      },
      {
        title: 'Capacity modes',
        bullets: [
          'Provisioned — set RCU/WCU; cheaper for predictable workloads; supports Reserved Capacity',
          'Auto Scaling on Provisioned — scales between min/max based on target utilization',
          'On-Demand — pay per request; no provisioning; best for unpredictable / spiky / new workloads',
          'Switch between modes once per 24 hours per table',
          'RCU/WCU calc: 1 RCU = 4 KB strongly-consistent read (or 8 KB eventually); 1 WCU = 1 KB write',
        ],
      },
      {
        title: 'Hot partition prevention',
        bullets: [
          'A single partition is capped at 3,000 RCU / 1,000 WCU',
          'If one PK gets 90% of traffic → hot partition → throttling',
          'Fix 1: WRITE SHARDING — suffix PK (customerId#shard1, customerId#shard2…)',
          'Fix 2: better key design — distribute load across many PKs',
          'Fix 3: read-heavy → DAX or ElastiCache layer',
        ],
      },
      {
        title: 'Streams + triggers',
        bullets: [
          'DynamoDB Streams — change-data-capture (CDC) of every Insert/Update/Delete',
          'Stream retention: 24 hours',
          'Triggers Lambda (event source mapping) for downstream processing',
          'Use cases: search index (→ OpenSearch), cross-table aggregation, audit, replication',
        ],
      },
      {
        title: 'Multi-region: Global Tables',
        bullets: [
          'Global Tables = multi-region, multi-active replication of a table',
          'Sub-second cross-region replication',
          'Conflict resolution: last-writer-wins (timestamp-based)',
          'Both regions can WRITE — no master/replica',
          'Requires Streams to be enabled',
        ],
      },
      {
        title: 'Backup + restore',
        bullets: [
          'PITR — restore to any second in last 35 days; restored data lands in NEW table',
          'On-Demand Backup — manual snapshot, retained until you delete',
          'Export to S3 — uses PITR backup, no RCU consumed, great for Athena analytics',
        ],
      },
      {
        title: 'Other key features',
        bullets: [
          'TTL — auto-delete items based on epoch timestamp attribute (no RCU consumed)',
          'Transactions — TransactWriteItems / TransactGetItems for ACID across up to 100 items (2x cost)',
          'DAX — DynamoDB Accelerator: in-memory cache for sub-millisecond reads',
          'Conditional writes — succeed only if a condition is met (e.g. attribute_not_exists for "insert if new")',
        ],
      },
    ],
    examTraps: [
      'Scans consume LOTS of RCU and are O(N) — almost never the right answer',
      'LSIs can ONLY be created at table-creation time; GSIs any time',
      'On-Demand mode has NO connection to Provisioned capacity numbers (it just bills per request)',
      'Global Tables require Streams ENABLED + the same table name in each region',
      'Hot partition throttling is per-partition (3k RCU / 1k WCU) regardless of total table capacity',
      'PITR is NOT a backup retention setting — it\'s continuous replay capability up to 35 days',
    ],
    cheatsheet: [
      { k: 'Max item size', v: '400 KB',
        desc: 'Hard limit. Larger blobs go in S3 with the S3 key stored in DynamoDB. Counts all attribute names + values + metadata.' },
      { k: 'Read cost ratio', v: 'Strong consistent = 2× eventually consistent',
        desc: '1 RCU = 1 strongly-consistent read of 4 KB, OR 2 eventually-consistent reads of 4 KB. Default reads are eventually consistent.' },
      { k: 'Max GSIs per table', v: '20',
        desc: 'GSIs can be added/dropped any time. Each has its own RCU/WCU. Use them sparingly — each consumes write capacity.' },
      { k: 'Max LSIs per table', v: '5',
        desc: 'LSIs MUST be defined at table creation. They share base table capacity. Capped at 10 GB per partition key.' },
      { k: 'Per-partition limit', v: '3,000 RCU / 1,000 WCU / 1 MB',
        desc: 'A single partition (hot key) caps here regardless of table\'s total provisioned capacity. Fix: write-sharding.' },
      { k: 'Transactions', v: 'Up to 100 items per Transact call',
        desc: 'TransactWriteItems and TransactGetItems both capped at 100 items. Cost = 2× normal R/W capacity per item.' },
      { k: 'Stream retention', v: '24 hours',
        desc: 'After 24 hours stream records are dropped. Process them via Lambda event source mapping to durable downstream (S3, OpenSearch).' },
      { k: 'PITR window', v: 'Up to 35 days',
        desc: 'Continuous backup, restore to ANY second. For longer retention combine with on-demand backups (kept until you delete).' },
    ],
    flashcards: [
      { q: 'New workload with spiky unpredictable traffic — capacity mode?', a: 'On-Demand' },
      { q: 'One partition key gets 90% of writes — fix?', a: 'Write sharding (add suffix to partition key)' },
      { q: 'Need full-text search on DynamoDB data?', a: 'Streams → Lambda → OpenSearch' },
      { q: 'Multi-region active-active with last-writer-wins?', a: 'Global Tables' },
      { q: 'Need sub-millisecond reads (faster than DynamoDB native)?', a: 'DAX (DynamoDB Accelerator)' },
    ],
    resources: [
      { label: 'DynamoDB Developer Guide', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html' },
      { label: 'DynamoDB Best Practices', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html' },
      { label: 'Single-Table Design', url: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-modeling-nosql-B.html' },
    ],
    decisionTree: {
      title: 'DynamoDB design choice — which feature do I need?',
      intro: 'DynamoDB is feature-rich. Pick the right primitive for each requirement.',
      rows: [
        { if: 'New workload + unpredictable traffic', then: 'On-Demand capacity mode' },
        { if: 'Steady predictable workload', then: 'Provisioned capacity + Auto Scaling (or Reserved capacity)' },
        { if: 'Need to query by attribute OTHER than primary key', then: 'GSI (Global Secondary Index) — addable any time' },
        { if: 'Need stronger consistency on alt key + same partition key', then: 'LSI (must create at table creation)' },
        { if: 'Sub-millisecond cached reads', then: 'DynamoDB Accelerator (DAX)' },
        { if: 'Multi-region active-active writes', then: 'Global Tables' },
        { if: 'Auto-delete old items (e.g. sessions)', then: 'TTL on epoch timestamp attribute (free)' },
        { if: 'Atomic update across multiple items', then: 'Transactions (TransactWriteItems, 2× capacity cost)' },
        { if: 'Stream item changes to OpenSearch / Lambda', then: 'DynamoDB Streams + Lambda event source mapping' },
        { if: 'Restore to any point in last 35 days', then: 'Point-in-Time Recovery (PITR)' },
      ],
      tip: 'Avoid Scan at all costs. If you find yourself reaching for Scan, your data model is probably wrong — add a GSI.',
    },
    workedExamples: [
      {
        title: 'Solving a hot-partition problem',
        scenario: 'A DynamoDB table stores transactions keyed by accountId. One enterprise customer represents 95% of write traffic. The table has 10,000 WCU provisioned but writes are still throttling. Why?',
        reasoning: [
          'DynamoDB shards data by hashing partition key. Each PHYSICAL PARTITION caps at 1,000 WCU.',
          'Even with 10k WCU on the table, ONE partition (one accountId) hits its 1k WCU ceiling and throttles.',
          'Adding more table-level WCU doesn\'t help — the limit is per-partition.',
          'Solution: WRITE SHARDING. Suffix the partition key with a random shard ID: enterprise#0, enterprise#1, ..., enterprise#9.',
          'Each shard goes to a different physical partition → 10x effective write throughput for that customer.',
          'Reads: query all shards and merge in the app, OR use a deterministic shard based on writeTimestamp%10.',
          'Other customers (5% of traffic) don\'t need sharding — they fit comfortably in one partition.',
        ],
        answer: 'Add a write-sharding suffix to the partition key for the heavy customer (enterprise#0...enterprise#9). 10× write throughput. Reads query all shards (small overhead). Other customers keep the unsharded key for simplicity.',
      },
      {
        title: 'Build full-text search on top of DynamoDB',
        scenario: 'An app uses DynamoDB as primary store. PMs want users to search items by free-text (substring, fuzzy). DynamoDB has no native full-text search.',
        reasoning: [
          'Scan + filter would work but is O(N) and expensive — never the answer for real search at scale.',
          'GSIs only support equality + range on indexed attributes — not full-text.',
          'Pattern: keep DynamoDB as system of record + index searchable attributes in OpenSearch.',
          'DynamoDB Streams capture every write. A Lambda processes each stream record and updates the OpenSearch index.',
          'Search hits OpenSearch (sub-100ms full-text + fuzzy match). Writes still hit DynamoDB.',
          'Architecture: DynamoDB → Streams → Lambda (event source mapping) → OpenSearch. Decoupled. No app code changes for writes.',
        ],
        answer: 'DynamoDB Streams ENABLED + Lambda event source mapping consuming stream → indexes items into OpenSearch. App writes go to DynamoDB only. App searches via OpenSearch HTTP API. Standard CDC pattern.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  rds: {
    title: 'Amazon RDS — Relational Database Service',
    subtitle: 'Managed MySQL, Postgres, MariaDB, Oracle, SQL Server — and Aurora',
    estReadMin: 9,
    overview: `
RDS gives you managed relational databases — AWS handles patching, backups,
replication, and failover. You manage the schema + app side. Engines: MySQL,
PostgreSQL, MariaDB, Oracle, SQL Server, and Aurora (AWS-built, MySQL/Postgres-
compatible).

The exam tests heavily on MULTI-AZ vs READ REPLICAS, BACKUP + PITR, MAJOR
VERSION UPGRADES (Blue/Green), ENCRYPTION (requires snapshot copy), CONNECTION
POOLING (RDS Proxy), AURORA features (storage, endpoints, Global Database),
and choosing the right engine.`,
    sections: [
      {
        title: 'Multi-AZ vs Read Replicas (most-tested distinction)',
        table: {
          headers: ['Aspect', 'Multi-AZ', 'Read Replica'],
          rows: [
            ['Purpose', 'High availability + DR', 'Read scaling'],
            ['Sync mode', 'Synchronous', 'Asynchronous'],
            ['Failover', 'Automatic (60–120s)', 'Manual promotion'],
            ['Reads from standby', 'NO (Multi-AZ standby is invisible)', 'YES (each replica is queryable)'],
            ['Cross-region', 'Multi-AZ DB Cluster only (some engines)', 'YES (cross-region replicas)'],
            ['Use case', 'Production availability', 'Read-heavy workloads'],
          ],
        },
      },
      {
        title: 'Backups + PITR',
        bullets: [
          'Automated backups — daily snapshot + transaction logs; retention 0-35 days',
          'PITR — restore to ANY second in retention window; creates NEW instance',
          'Manual snapshots — retained until you delete; shareable across accounts (encrypted snapshots: share via KMS grant)',
          'Cross-region snapshot copy via AWS Backup or EventBridge for DR',
        ],
      },
      {
        title: 'Storage + scaling',
        bullets: [
          'Storage types: gp2 (legacy), gp3 (default), io1/io2 (provisioned IOPS), Magnetic (legacy)',
          'Storage Autoscaling — auto-grows up to a configured max',
          'Cannot SHRINK storage in place — requires dump-restore to new instance',
          'Vertical scaling (instance class change) — brief downtime (single-AZ) or minimal (Multi-AZ)',
        ],
      },
      {
        title: 'Major version upgrades',
        bullets: [
          'In-place upgrade — minutes of downtime, no rollback',
          'Blue/Green Deployments — staging env replicates from prod, sub-minute switch, instant rollback',
          'Always test on a CLONE (Aurora) or restored snapshot first',
        ],
      },
      {
        title: 'Encryption',
        bullets: [
          'Encryption ENABLED at instance creation only',
          'To encrypt EXISTING unencrypted instance: snapshot → copy snapshot with KMS key → restore as new',
          'Encryption covers data at rest, backups, replicas, snapshots',
          'In-transit: enforce via parameter group (rds.force_ssl = 1)',
        ],
      },
      {
        title: 'Authentication options',
        bullets: [
          'Native DB auth (username/password)',
          'IAM database authentication — short-lived (15-min) auth token via STS; works for MySQL + Postgres + Aurora',
          'Kerberos (via AWS Managed Microsoft AD) for SQL Server, Oracle, Postgres',
        ],
      },
      {
        title: 'Aurora specifics',
        bullets: [
          'Storage is shared distributed system — 6 copies across 3 AZs, self-healing',
          'Cluster endpoint (writer) + Reader endpoint (load-balanced reads across replicas)',
          'Up to 15 read replicas (vs 5 for vanilla RDS)',
          'Aurora Serverless v2 — scales in 0.5 ACU increments, supports Multi-AZ + Global DB (unlike v1)',
          'Aurora Global Database — sub-second cross-region replication, < 1 min failover',
          'Aurora Backtrack (MySQL) — in-place rewind up to 72 hours',
          'Aurora Cloning — copy-on-write clone (instant + cheap)',
          'Aurora Parallel Query — pushes scans to storage layer for fast analytics',
        ],
      },
      {
        title: 'Connection management',
        bullets: [
          'RDS Proxy — pools + multiplexes connections (use it for Lambda → RDS to avoid connection storms)',
          'RDS Proxy reduces failover time by holding connections during failover',
          'Secrets Manager integration: rotate DB passwords without app downtime',
        ],
      },
    ],
    examTraps: [
      'Multi-AZ standby is NOT a read replica — you can NOT query it',
      'Read Replicas are async — eventual consistency; not for read-after-write requirements',
      'You CANNOT enable encryption on an existing unencrypted RDS — snapshot + copy + restore is the workflow',
      'Aurora Serverless v1 supports scale-to-zero; v2 has a minimum capacity floor',
      'Aurora Backtrack is MySQL-only (not Postgres)',
      'Restoring from snapshot creates a NEW instance with a NEW endpoint — update app config',
    ],
    cheatsheet: [
      { k: 'Max read replicas (RDS)', v: '5 per primary',
        desc: 'For read scaling on MySQL/Postgres/MariaDB/Oracle. Async replication = eventual consistency. Cross-region supported.' },
      { k: 'Max read replicas (Aurora)', v: '15 per cluster',
        desc: '3× the limit of vanilla RDS. Plus the reader endpoint load-balances reads across all healthy replicas automatically.' },
      { k: 'PITR retention max', v: '35 days (0–35 configurable)',
        desc: 'Set 0 to disable. Restoring creates a NEW instance — old one keeps running. Apps must update endpoint.' },
      { k: 'Manual snapshot retention', v: 'Until you delete',
        desc: 'Survive instance deletion (automated backups don\'t). Shareable cross-account; encrypted ones need KMS grant.' },
      { k: 'Multi-AZ failover', v: '60–120 seconds typical',
        desc: 'DNS endpoint stays the same; CNAME flips to standby. App reconnect logic handles the brief blip.' },
      { k: 'Aurora storage', v: '6 copies across 3 AZs · auto-healing',
        desc: 'Distributed storage system. Survives 2 AZ failures with no data loss. Loss of 3 copies still allows reads.' },
      { k: 'Aurora Global Database', v: '< 1 sec replication · < 1 min failover',
        desc: 'Up to 5 secondary regions. Pick when "global low-latency reads + cross-region DR" both required.' },
      { k: 'Backup window', v: 'Daily automated · configurable 30-min slot',
        desc: 'Small I/O pause during snapshot on single-AZ; no pause on Multi-AZ (taken from standby).' },
    ],
    flashcards: [
      { q: 'Need read scaling for 95% read traffic on RDS MySQL?', a: 'Add Read Replicas or migrate to Aurora' },
      { q: 'Need cross-region active-active SQL writes?', a: 'Aurora Global Database (writer in primary, fast failover to secondary)' },
      { q: 'Lambda → RDS hitting connection limits?', a: 'RDS Proxy for connection pooling' },
      { q: 'Need zero-downtime major version upgrade?', a: 'RDS Blue/Green Deployment' },
      { q: 'Need to restore 6 hours ago without losing recent changes elsewhere?', a: 'Point-in-Time Recovery to that timestamp (creates new instance)' },
    ],
    resources: [
      { label: 'RDS User Guide', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html' },
      { label: 'Aurora User Guide', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html' },
      { label: 'RDS Blue/Green', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html' },
    ],
    decisionTree: {
      title: 'RDS / Aurora design choice',
      intro: 'Which RDS feature fits the requirement?',
      rows: [
        { if: 'High availability (single region)', then: 'Multi-AZ deployment (sync standby, 60-120s failover)' },
        { if: 'Read scaling for read-heavy workload', then: 'Read Replicas (up to 5 RDS / 15 Aurora)' },
        { if: 'Cross-region sub-second replication + DR', then: 'Aurora Global Database' },
        { if: 'Restore to any second in last N days', then: 'Point-in-Time Recovery (PITR)' },
        { if: 'Zero-downtime major version upgrade', then: 'RDS Blue/Green Deployments' },
        { if: 'Connection storms from Lambda', then: 'RDS Proxy for connection pooling' },
        { if: 'Variable / unpredictable load', then: 'Aurora Serverless v2 (auto-scales ACUs)' },
        { if: 'Need ~zero ops + free instant test copies', then: 'Aurora + Cloning (copy-on-write)' },
        { if: 'Need to rewind 2 hours after bad UPDATE', then: 'Aurora MySQL Backtrack (in-place rewind)' },
        { if: 'Auto-rotate DB password every 30 days', then: 'Secrets Manager with built-in RDS rotation Lambda' },
      ],
      tip: 'Multi-AZ ≠ Read Replica. Multi-AZ is for HA (standby is invisible). Read Replicas are for read scaling (queryable).',
    },
    workedExamples: [
      {
        title: 'Cross-region DR with strict RPO + RTO',
        scenario: 'A SaaS app on Aurora Postgres serves users in eu-west-1. Compliance requires: RPO < 1 minute (data loss tolerance), RTO < 5 minutes (downtime tolerance), and failover to us-east-1 in case of regional outage.',
        reasoning: [
          'RPO < 1 min rules out daily snapshot DR — that\'s 24-hour RPO at worst.',
          'Cross-region Read Replicas have ~seconds to minutes of replication lag — borderline. Failover requires manual promotion.',
          'Aurora Global Database: storage-level cross-region replication, typically < 1 second lag. Meets RPO easily.',
          'For RTO: Global Database promoted-secondary failover is < 1 minute (planned) or up to 5 minutes (unplanned). Meets RTO.',
          'Secondary region instances are READ-ONLY normally — promote on failover to become writer.',
          'Costs more than single-region but cheaper than maintaining a full second cluster manually.',
        ],
        answer: 'Aurora Global Database with primary in eu-west-1 + secondary in us-east-1. RPO < 1 sec; RTO < 5 min. Application uses Route 53 Failover routing pointing at the regional cluster endpoint — switches DNS on primary failure.',
      },
      {
        title: 'Fixing Lambda → RDS connection storms',
        scenario: 'A Lambda function processes SQS messages + writes to RDS Postgres. At peak (~200 concurrent invocations), RDS shows "too many connections" errors. Increasing max_connections to 5000 caused memory issues.',
        reasoning: [
          'Each Lambda execution opens its own DB connection. 200 concurrent = 200 connections, ramping fast.',
          'RDS instance memory limits max_connections — raising it too high starves the engine of memory for query execution.',
          'Adding more Read Replicas doesn\'t help writes (still going to the writer).',
          'RDS Proxy sits between Lambda and RDS. Lambda connects to Proxy (cheap, fast). Proxy maintains a small pool to RDS (e.g. 50 conns), multiplexes Lambda requests across them.',
          'Bonus: RDS Proxy holds connections through failover, reducing failover-related app errors.',
          'Bonus 2: RDS Proxy integrates with Secrets Manager for password rotation without app restarts.',
        ],
        answer: 'Deploy RDS Proxy in front of the Aurora cluster. Point Lambda at Proxy endpoint instead of cluster endpoint. Configure Proxy connection pool size based on Lambda concurrency. Connection storms resolved without raising max_connections.',
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  alb: {
    title: 'Elastic Load Balancing (ELB) — ALB / NLB / GLB',
    subtitle: 'L4 + L7 traffic distribution + TLS termination + health checks',
    estReadMin: 7,
    overview: `AWS offers three load balancer types: ALB (L7, HTTP/HTTPS, rich routing), NLB (L4, TCP/UDP/TLS, microsecond latency + static IPs), and GLB (deploys third-party network appliances). The exam tests heavily on choosing the right type and on ALB's L7 routing features.`,
    sections: [
      {
        title: 'ALB vs NLB vs GLB',
        table: {
          headers: ['Feature', 'ALB', 'NLB', 'GLB'],
          rows: [
            ['Layer', 'L7 (HTTP/HTTPS/WS)', 'L4 (TCP/UDP/TLS)', 'L3 (GENEVE)'],
            ['Latency', '~milliseconds', 'Microseconds', 'Low'],
            ['Static IP per AZ', 'No', 'Yes', 'No'],
            ['Path / host routing', 'Yes', 'No', 'No'],
            ['WebSocket / HTTP/2', 'Yes', 'No (passthrough only)', 'No'],
            ['Targets', 'EC2 / IP / Lambda', 'EC2 / IP / ALB', 'Third-party appliances'],
            ['Typical use', 'Web apps, microservices', 'Trading, gaming, on-prem L4', 'Firewalls, IDS chains'],
          ],
        },
      },
      {
        title: 'ALB Listener Rules — the L7 routing engine',
        bullets: [
          'Conditions: path-pattern, host-header, http-header, http-method, query-string, source-IP',
          'Actions: forward (to target group), redirect (URL), fixed-response (200/4xx with body), authenticate-cognito, authenticate-oidc',
          'Rules evaluated in PRIORITY order; default rule catches the rest',
          'Multiple actions per rule (chain auth → forward)',
        ],
      },
      {
        title: 'Target Groups',
        bullets: [
          'Targets: EC2 instances (in ASG ideally), IP addresses (for on-prem / cross-VPC), Lambda functions, Application Load Balancers (for NLB only)',
          'Health checks per target group: configurable path, protocol, port, thresholds, interval, timeout',
          'Cross-zone load balancing: ON by default for ALB (free); OFF by default for NLB (paid when ON)',
          'Deregistration delay: 300s default — drains in-flight requests before stopping traffic',
        ],
      },
      {
        title: 'HTTPS + TLS termination',
        bullets: [
          'ACM provides FREE public certs + auto-renewal; attach to HTTPS listener',
          'SNI supports up to 25 certs per HTTPS listener — many domains on one ALB',
          'NLB can also terminate TLS (since 2019) — useful when you need static IP + TLS',
          'For end-to-end encryption: TLS to ALB, then HTTPS to targets (re-encrypts at backend)',
        ],
      },
      {
        title: 'Sticky sessions + auth',
        bullets: [
          'Sticky sessions: ELB-generated cookie or app-generated cookie pins a user to one target',
          'Useful for legacy stateful apps; long-term, externalise state to ElastiCache / DynamoDB',
          'ALB native auth: OIDC (any provider) or Cognito User Pool — no backend code needed',
          'NLB does not support sticky sessions or auth — that\'s ALB territory',
        ],
      },
    ],
    examTraps: [
      'NLB has STATIC IPs per AZ; ALB has DNS-only (no static IPs without Global Accelerator)',
      'If question mentions path-based / host-based routing → ALB (NLB is L4 only)',
      'If question mentions WebSocket OR HTTP/2 OR gRPC → ALB',
      'If question mentions UDP or "ultra-low latency" → NLB',
      'Classic Load Balancer (CLB) is DEPRECATED — never the right answer on modern SAA-C03',
      'ALB does NOT support direct EC2 instance ID without a Target Group',
    ],
    cheatsheet: [
      { k: 'ALB', v: 'L7 · HTTP/HTTPS · path + host routing',
        desc: 'Default choice for web apps + microservices. Supports WebSocket, gRPC, Lambda targets, OIDC auth.' },
      { k: 'NLB', v: 'L4 · TCP/UDP/TLS · static IP per AZ',
        desc: 'Pick when you need ultra-low latency, raw TCP/UDP, or a fixed IP. Scales to millions of requests/sec.' },
      { k: 'GLB (Gateway LB)', v: 'L3 · GENEVE · third-party appliances',
        desc: 'Specialised — deploys + scales virtual firewalls / IDS. Rarely on SAA exam directly.' },
      { k: 'Connection draining', v: '300s default · 0–3600s',
        desc: 'Lets in-flight requests finish before removing a target. Critical for graceful deploys.' },
      { k: 'Cross-zone LB', v: 'ALB: free, on by default · NLB: paid, off by default',
        desc: 'When ON, traffic is evenly distributed across all targets in all AZs. When OFF, each AZ keeps its share.' },
      { k: 'ALB max targets', v: '1000 per ALB',
        desc: 'Across all target groups attached. Plenty for typical microservices.' },
      { k: 'ALB auth actions', v: 'Cognito User Pool OR OIDC',
        desc: 'Auth happens at the LB — backend never sees unauth\'d requests. Saves writing auth in every service.' },
      { k: 'WAF integration', v: 'Direct attach to ALB / CloudFront',
        desc: 'NLB doesn\'t support WAF (it\'s L4). Put CloudFront in front of NLB if you need WAF + UDP.' },
    ],
    flashcards: [
      { q: 'Need path-based routing /api/* vs /static/*?', a: 'ALB Listener Rules with path-pattern conditions' },
      { q: 'Need static IP for firewall allowlisting?', a: 'NLB (static IP per AZ)' },
      { q: 'Need to terminate SSL for 10 different domains on one LB?', a: 'ALB with multiple ACM certs + SNI' },
      { q: 'Need to authenticate users at the LB without code?', a: 'ALB authenticate-cognito or authenticate-oidc action' },
      { q: 'Need WAF + UDP traffic?', a: 'CloudFront → NLB (WAF on CloudFront only)' },
    ],
    resources: [
      { label: 'ELB Documentation', url: 'https://docs.aws.amazon.com/elasticloadbalancing/' },
      { label: 'ALB Listener Rules', url: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-update-rules.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  asg: {
    title: 'Auto Scaling Groups (ASG)',
    subtitle: 'Maintain a target capacity of EC2 — heal failures + scale to demand',
    estReadMin: 7,
    overview: `An Auto Scaling Group manages a fleet of EC2 instances launched from a Launch Template. It maintains your minimum / desired / maximum capacity, automatically replaces unhealthy instances, and scales in/out based on demand signals (CPU, requests/sec, queue depth, custom metrics, schedule, or ML-predicted load).`,
    sections: [
      {
        title: 'Core configuration',
        bullets: [
          'Launch Template (versioned, modern) replaces deprecated Launch Configurations',
          'Min / Desired / Max — ASG keeps capacity between min and max, targets desired',
          'Multi-AZ — always span ≥2 AZs for production (default termination policy balances across AZs)',
          'Health check types: EC2 (default — instance status) and ELB (target group health)',
          'Health check grace period — give new instances time to boot before health-checking',
        ],
      },
      {
        title: 'Scaling policies — 4 types',
        table: {
          headers: ['Type', 'Description', 'Use when'],
          rows: [
            ['Target Tracking', 'Maintain a metric at target value (e.g. CPU 60%)', 'Most common — set and forget'],
            ['Step Scaling', 'Add/remove N instances based on CloudWatch alarm breach magnitude', 'Custom response curve'],
            ['Simple Scaling', 'Single adjustment per alarm + cooldown', 'Legacy — rarely correct answer'],
            ['Scheduled', 'Adjust capacity at specific times (e.g. office hours)', 'Predictable daily/weekly patterns'],
            ['Predictive', 'ML-forecast 48h ahead and pre-scale', 'Predictable but variable patterns'],
          ],
        },
      },
      {
        title: 'Spot / Mixed Instances Policy',
        bullets: [
          'MIP lets ASG combine On-Demand + Spot across multiple instance types',
          'OnDemandBaseCapacity — fixed On-Demand instances (e.g. 25%) for stability',
          'SpotAllocationStrategy: capacityOptimized (lowest interruption risk) or lowestPrice',
          'Use multiple instance types (m5.large, m5a.large, m5n.large) to widen Spot capacity pools',
        ],
      },
      {
        title: 'Lifecycle hooks',
        bullets: [
          'Pause an instance in Pending (launching) or Terminating state for N minutes',
          'Use cases: warm up caches, drain connections, upload final logs, register with config-mgmt server',
          'Hook waits until your script calls CompleteLifecycleAction or the timeout expires',
        ],
      },
      {
        title: 'Warm Pools',
        bullets: [
          'Pre-initialised instances held in Stopped state, ready to Start on demand (seconds vs minutes)',
          'Cost: only EBS storage charge while stopped',
          'Solves slow-cold-start problem for instances with long boot/warm-up scripts',
        ],
      },
      {
        title: 'Instance Refresh + deployment patterns',
        bullets: [
          'Instance Refresh replaces instances in batches with the new Launch Template version',
          'Configurable warmup + minimum-healthy-percentage to control rollout speed',
          'CodeDeploy integration for blue/green deployments at the ASG layer',
        ],
      },
    ],
    examTraps: [
      'Launch CONFIGURATIONS are DEPRECATED — always pick Launch TEMPLATES',
      'Health check grace period MUST exceed instance + app boot time, or ASG kills it during startup',
      'ELB health check type only kicks in when an ASG is attached to a target group',
      'Spread Placement Group has max 7 instances per AZ — incompatible with large ASGs',
      'ASG does NOT scale RDS or other services — it scales EC2 only',
      'Cross-zone load balancing affects ELB distribution; ASG distribution is governed by AZ + termination policy',
    ],
    cheatsheet: [
      { k: 'Min/Desired/Max', v: 'Boundaries + current target',
        desc: 'ASG keeps capacity between min and max. Desired drives current target. Scaling adjusts Desired automatically.' },
      { k: 'Default termination policy', v: 'Balance AZs → oldest LT → closest to billing hour',
        desc: 'Customisable. OldestInstance / NewestInstance / OldestLaunchConfiguration / OldestLaunchTemplate available.' },
      { k: 'Target Tracking', v: 'Set metric + target value',
        desc: 'Most common. E.g. "CPU at 60%" — ASG scales out when above, in when below. Set-and-forget.' },
      { k: 'Predictive Scaling', v: 'ML forecast 48 hours ahead',
        desc: 'Pre-scales for predictable patterns (daily peaks). Combine with target tracking for reactive correction.' },
      { k: 'Mixed Instances Policy', v: 'On-Demand baseline + Spot top-up',
        desc: 'Best Spot reliability. Use multiple instance types + capacityOptimized strategy.' },
      { k: 'Warm Pool', v: 'Pre-initialised stopped instances',
        desc: 'Eliminates cold-start delay for slow-boot apps. Cost: only EBS while stopped.' },
      { k: 'Lifecycle hooks', v: 'Pause for cleanup before terminate',
        desc: 'Up to 1 hour pause. Run scripts to drain, flush, or upload before instance dies.' },
      { k: 'Instance Refresh', v: 'Rolling replacement with new LT version',
        desc: 'Configurable batch size + healthy percentage. Built-in rollback on failures.' },
    ],
    flashcards: [
      { q: 'Predictable office-hours-only traffic?', a: 'Scheduled scaling actions' },
      { q: 'Slow-booting app + need fast scale-out?', a: 'Warm Pools' },
      { q: 'Maximise Spot savings without interruption risk?', a: 'Mixed Instances Policy + capacityOptimized + many instance types' },
      { q: 'Run cleanup script before instance termination?', a: 'Lifecycle hook on terminating state' },
      { q: 'Roll out new AMI to all ASG instances?', a: 'Instance Refresh' },
    ],
    resources: [
      { label: 'EC2 Auto Scaling User Guide', url: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/' },
      { label: 'Auto Scaling Best Practices', url: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-benefits.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  cloudfront: {
    title: 'Amazon CloudFront — Global CDN',
    subtitle: 'Cache at 600+ edge locations + edge compute + DDoS protection',
    estReadMin: 7,
    overview: `CloudFront is AWS's global content-delivery network. Edge locations cache content close to users, dramatically cutting latency and origin load. Beyond caching, CloudFront supports edge compute (CloudFront Functions + Lambda@Edge), private-content protection (Signed URLs / Cookies), origin access control to private S3, geo restriction, and integration with AWS WAF + Shield Advanced.`,
    sections: [
      {
        title: 'Caching basics',
        bullets: [
          'Distributions point at one or more ORIGINS (S3 bucket, ALB, EC2, on-prem, any HTTP server)',
          'Behaviours define how each path pattern is cached + which origin it goes to',
          'Cache Policies control the cache key (which headers/cookies/queries affect uniqueness) + TTL',
          'Origin Request Policies control what is forwarded TO the origin (separate from cache key)',
          'Invalidations remove cached content within minutes (vs waiting for TTL)',
        ],
      },
      {
        title: 'Private content protection',
        bullets: [
          'Origin Access Control (OAC) — modern way to keep S3 private; CloudFront identity has bucket access',
          'OAI (Origin Access Identity) — legacy; use OAC instead (supports SSE-KMS + all regions)',
          'Signed URLs — per-file, time-limited access (e.g. one premium video download)',
          'Signed Cookies — per-session access to many files (e.g. HLS streaming with many segments)',
          'Trusted Key Groups manage the public keys used to verify signatures',
        ],
      },
      {
        title: 'Edge compute',
        table: {
          headers: ['Feature', 'CloudFront Functions', 'Lambda@Edge'],
          rows: [
            ['Runtime', 'Lightweight JavaScript', 'Node.js / Python'],
            ['Execution time', 'Sub-millisecond', 'Up to 5s (viewer) / 30s (origin)'],
            ['Memory', '2 MB', 'Up to 10 GB'],
            ['Triggers', 'Viewer Request / Response only', 'All 4 events (Viewer + Origin × Req + Res)'],
            ['Cost', 'Very cheap', '~6× more expensive'],
            ['Best for', 'URL rewrites, header manipulation, simple auth', 'Heavy logic, SDK calls, image resizing'],
          ],
        },
      },
      {
        title: 'Geo + security features',
        bullets: [
          'Geo Restriction — allowlist or blocklist by country (built-in, no WAF needed)',
          'AWS WAF — attach a Web ACL to the distribution for OWASP / managed-rule protection at the edge',
          'AWS Shield Standard — automatic + free L3/L4 DDoS protection (every CloudFront distribution)',
          'AWS Shield Advanced — adds L7 protection + 24/7 response team + cost protection',
          'Field-level encryption — encrypts specific fields in POST bodies before they reach origin',
        ],
      },
      {
        title: 'Origin failover + price classes',
        bullets: [
          'Origin Group — primary + secondary origins with automatic failover on 4xx/5xx codes',
          'Price Class 100 (US/Canada/Europe), 200 (+Asia/India/ME), All — cheaper if your users are concentrated',
          'Custom error responses — return a custom page instead of origin\'s error',
        ],
      },
    ],
    examTraps: [
      'OAI is LEGACY — modern answer is OAC (Origin Access Control)',
      'Lambda@Edge runs in regions CLOSEST to the user (not your home region) — design for stateless execution',
      'Geo Restriction is built into CloudFront — don\'t reach for WAF for pure country blocking',
      'CloudFront cache key uses headers/cookies/queries you explicitly include via Cache Policy — by default it ignores them',
      'Signed URL vs Signed Cookies: URL is per-file; Cookies are per-session (many files)',
      'Field-level encryption applies BEFORE origin — origin sees encrypted fields; only your decryption key opens them',
    ],
    cheatsheet: [
      { k: 'Edge locations', v: '600+ globally',
        desc: 'Includes Regional Edge Caches that sit between edge POPs and origins. Caching at the regional layer further reduces origin load.' },
      { k: 'OAC vs OAI', v: 'OAC = modern; OAI = legacy',
        desc: 'Use OAC. Supports all S3 regions, SSE-KMS, and dynamic requests. OAI is being deprecated.' },
      { k: 'Signed URL', v: 'Per-file, time-limited',
        desc: 'Right for direct download links. Cookies are right for session-based access to many files.' },
      { k: 'Signed Cookies', v: 'Per-session, many files',
        desc: 'Set once, browser sends with every CloudFront request. Perfect for HLS video (many segment fetches).' },
      { k: 'Cache invalidation cost', v: 'First 1000 paths/month FREE',
        desc: 'After that, ~$0.005/path. For frequent cache busts, prefer versioned filenames (style.abc123.css) over invalidation.' },
      { k: 'Price Class 100', v: 'US/Canada/EU only — cheapest',
        desc: '~30% savings if your users are concentrated in those regions. Class 200 adds Asia/India/ME.' },
      { k: 'CloudFront Functions', v: 'Sub-ms JS, viewer req/res',
        desc: 'Right for lightweight URL rewrites, header manipulation. Much cheaper than Lambda@Edge.' },
      { k: 'Lambda@Edge', v: 'Heavier, all 4 events',
        desc: 'Right when you need SDK calls, image resizing, full Node/Python. Triggers at viewer OR origin level.' },
    ],
    flashcards: [
      { q: 'Make S3 origin private with modern approach?', a: 'CloudFront Origin Access Control (OAC)' },
      { q: 'Block content for users in specific countries?', a: 'CloudFront Geo Restriction' },
      { q: 'Resize images at the edge with SDK calls?', a: 'Lambda@Edge (CloudFront Functions can\'t)' },
      { q: 'Serve premium video globally to paying users?', a: 'CloudFront + private S3 via OAC + Signed Cookies' },
      { q: 'Add OWASP protection at the edge?', a: 'AWS WAF Web ACL attached to CloudFront' },
    ],
    resources: [
      { label: 'CloudFront Developer Guide', url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html' },
      { label: 'CloudFront Private Content', url: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  route53: {
    title: 'Amazon Route 53 — DNS + Health Checks + Domain Registration',
    subtitle: 'Authoritative DNS with intelligent routing policies + health-based failover',
    estReadMin: 6,
    overview: `Route 53 is AWS's authoritative DNS service. Beyond plain name resolution it offers intelligent routing policies (Latency, Geolocation, Weighted, Failover, Geoproximity, Multivalue) and health checks that automatically remove unhealthy endpoints. It also registers domain names and provides Resolver endpoints for hybrid DNS between VPC + on-prem.`,
    sections: [
      {
        title: 'Routing policies — pick the right one',
        table: {
          headers: ['Policy', 'When to use'],
          rows: [
            ['Simple', 'One record, no logic — basic A/AAAA/CNAME'],
            ['Weighted', 'Split traffic by percentage (A/B testing, canary)'],
            ['Latency', 'Send users to lowest-latency endpoint'],
            ['Geolocation', 'Route by user country/continent (sovereignty)'],
            ['Geoproximity', 'Route by geo + bias to shift traffic (Traffic Flow only)'],
            ['Failover', 'Primary endpoint; switch to secondary on health-check fail'],
            ['Multivalue Answer', 'Return up to 8 healthy records (cheap DNS-level LB)'],
            ['IP-based', 'Map specific client IP ranges to specific endpoints'],
          ],
        },
      },
      {
        title: 'Health checks',
        bullets: [
          'Endpoint health checks — HTTP / HTTPS / TCP against any IP or hostname',
          'Calculated health checks — combine child checks with AND / OR logic',
          'CloudWatch alarm-based — health from any CloudWatch metric',
          'Health checks fire from multiple AWS regions — global aggregation',
          'Health-check-failover requires the routing policy to be Failover',
        ],
      },
      {
        title: 'Record types',
        bullets: [
          'A — IPv4 address',
          'AAAA — IPv6 address',
          'CNAME — canonical name to another DNS name (NOT allowed at apex)',
          'Alias — Route 53-specific; works at apex; points to AWS resources (ALB, CloudFront, S3 website, etc.) — FREE, dynamic',
          'NS / SOA — hosted zone metadata',
          'MX — mail exchanger',
          'TXT — arbitrary text (SPF, DKIM, domain verification)',
          'PTR — reverse DNS',
        ],
      },
      {
        title: 'Hybrid DNS — Resolver Endpoints',
        bullets: [
          'Inbound Resolver Endpoint — on-prem DNS queries resolve Route 53 private hosted zones',
          'Outbound Resolver Endpoint — AWS DNS queries forward to on-prem DNS (e.g. corp.internal)',
          'Resolver Rules tell the outbound endpoint which domains forward where',
          'Pairs with Direct Connect or VPN for full hybrid name resolution',
        ],
      },
      {
        title: 'Private vs Public Hosted Zones',
        bullets: [
          'Public — internet-facing DNS records for a domain you registered or transferred',
          'Private — internal DNS for VPC(s) you associate; not resolvable from internet',
          'Same hosted zone name CAN exist as both public + private (split-horizon DNS)',
        ],
      },
    ],
    examTraps: [
      'CNAMEs are FORBIDDEN at the apex (example.com) — use Alias records for apex pointing to AWS resources',
      'Alias records are FREE and update automatically — prefer over A records with hardcoded IPs',
      'Health checks are NOT free — billed per check per month + ~$0.50 per non-AWS endpoint',
      'Geolocation cannot guarantee zero-latency — Latency policy uses actual network measurements',
      'Multivalue Answer is DNS-level + health-aware — NOT a load balancer (no session persistence)',
      'Route 53 is a global service — no region selector',
    ],
    cheatsheet: [
      { k: 'TTL recommendation', v: 'Low TTL (60s) for failover records · high (1h+) for static',
        desc: 'Lower TTL = faster failover but more DNS queries (cost). Balance based on RTO requirement.' },
      { k: 'Alias vs CNAME', v: 'Alias = AWS-only, free, apex-OK · CNAME = generic DNS',
        desc: 'Always pick Alias when target is AWS (ALB, CloudFront, S3 website, API GW). Avoids CNAME apex restriction.' },
      { k: 'Health check interval', v: '30s default · 10s optional (faster failover)',
        desc: '10s "fast" health checks cost more. Default 30s is typically sufficient.' },
      { k: 'SLA', v: '100% availability',
        desc: 'The ONLY AWS service with a 100% SLA. The DNS layer is bulletproof.' },
      { k: 'Private Hosted Zone', v: 'VPC-only, not internet-resolvable',
        desc: 'Associate one PHZ with multiple VPCs (even cross-account). Common for internal service discovery.' },
      { k: 'Domain transfer', v: 'Route 53 registers + transfers domains',
        desc: 'Acts as registrar for 100+ TLDs. Cheaper than many third-party registrars. Integrates with hosted zones.' },
      { k: 'Resolver Endpoints', v: 'Inbound (on-prem→AWS) + Outbound (AWS→on-prem)',
        desc: 'Required for hybrid DNS. Each endpoint = 2 ENIs in 2 AZs for HA.' },
      { k: 'Failover record', v: 'Primary + Secondary + health check on primary',
        desc: 'DNS automatically returns Secondary if Primary fails health check. The standard cross-region DR pattern.' },
    ],
    flashcards: [
      { q: 'Point example.com (apex) at an ALB?', a: 'Route 53 Alias record (CNAME not allowed at apex)' },
      { q: 'EU users must be served from EU endpoints for GDPR?', a: 'Geolocation routing policy' },
      { q: 'A/B test 90/10 traffic split between two versions?', a: 'Weighted routing policy' },
      { q: 'Send users to lowest-latency endpoint regardless of region?', a: 'Latency routing policy' },
      { q: 'On-prem app needs to resolve aws-only Route 53 zone?', a: 'Inbound Resolver Endpoint' },
    ],
    resources: [
      { label: 'Route 53 Developer Guide', url: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html' },
      { label: 'Routing Policies', url: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  sqs: {
    title: 'Amazon SQS — Simple Queue Service',
    subtitle: 'Decouple producers from consumers with reliable, scalable message queues',
    estReadMin: 6,
    overview: `SQS is a fully-managed message queue. Producers send messages; consumers poll the queue and process them. SQS absorbs spikes, retries failed processing, and isolates producer/consumer failures. The exam tests heavily on Standard vs FIFO, visibility timeout, DLQs, and Lambda integration patterns.`,
    sections: [
      {
        title: 'Standard vs FIFO queues',
        table: {
          headers: ['Feature', 'Standard', 'FIFO'],
          rows: [
            ['Throughput', 'Nearly unlimited', '300 msg/s (3000 with batching) per group'],
            ['Ordering', 'Best-effort', 'STRICT within MessageGroupId'],
            ['Delivery', 'At-least-once (occasional duplicates)', 'Exactly-once (with dedup)'],
            ['Use case', 'Most workloads', 'When order + exact-once matters (payments, accounting)'],
            ['Name suffix', '(none)', 'Must end in .fifo'],
          ],
        },
      },
      {
        title: 'Visibility timeout — the most-tested concept',
        bullets: [
          'When a consumer receives a message, SQS hides it for the visibility timeout (default 30s)',
          'If consumer finishes + DeleteMessage before timeout → message is gone',
          'If consumer crashes (no Delete) → message becomes visible again, another consumer picks it up',
          'Tune visibility timeout to ≥ longest expected processing time',
          'Consumer can extend via ChangeMessageVisibility during processing',
        ],
      },
      {
        title: 'Dead-Letter Queue (DLQ)',
        bullets: [
          'After maxReceiveCount failed attempts, the message moves to the DLQ for forensics',
          'DLQ is a normal SQS queue; you can re-drive messages back to source after fixing the bug',
          'Standard queue → Standard DLQ; FIFO queue → FIFO DLQ',
          'Set up CloudWatch alarms on DLQ depth to alert on persistent failures',
        ],
      },
      {
        title: 'Polling modes',
        bullets: [
          'Short polling (default) — returns immediately even if no messages; can be wasteful + costly',
          'Long polling — waits up to 20 seconds for messages; reduces empty receives → cheaper',
          'Always enable long polling unless you have a specific reason not to',
        ],
      },
      {
        title: 'Lambda integration',
        bullets: [
          'Event source mapping polls SQS + invokes Lambda in batches (default 10 messages)',
          'Lambda scales to match queue depth (up to function concurrency limit)',
          'Batch reporting (BatchItemFailures) lets Lambda partially fail without re-processing the whole batch',
          'For FIFO queues, Lambda processes each MessageGroupId in order (parallel across groups)',
        ],
      },
    ],
    examTraps: [
      'SQS does NOT push — consumers always POLL. (Push-style fan-out is SNS / EventBridge)',
      'Visibility timeout too SHORT = duplicate processing. Too LONG = slow retry on real failures',
      'Standard SQS may DUPLICATE — always make consumers IDEMPOTENT',
      'FIFO throughput is per-MessageGroupId; bad key choice = bottleneck',
      'DLQ uses the receive count from the SOURCE queue, not its own',
      'Maximum message size = 256 KB (use S3 + pointer for larger payloads)',
    ],
    cheatsheet: [
      { k: 'Max message size', v: '256 KB',
        desc: 'For larger payloads, store the body in S3 and put the S3 key in the SQS message. The Extended Client Library does this automatically.' },
      { k: 'Max retention', v: '14 days (default 4)',
        desc: 'After retention expires, message is dropped. Set to 14 days for forensic / replay capability.' },
      { k: 'Visibility timeout', v: '30s default · 0 – 12 hours',
        desc: 'Tune to ≥ longest expected processing time. Too short = duplicates. Too long = slow retry on real failures.' },
      { k: 'Long polling', v: 'Up to 20 seconds (set ReceiveMessageWaitTimeSeconds)',
        desc: 'Always enable for production. Reduces empty receives and lowers cost dramatically.' },
      { k: 'FIFO throughput', v: '300 msg/s per group (3000 with batching)',
        desc: 'Per-MessageGroupId. To scale FIFO, use many group IDs (one per customer, account, region, etc.).' },
      { k: 'Standard throughput', v: 'Nearly unlimited',
        desc: 'No per-queue throughput cap on Standard. Lambda will scale event source mapping up to function concurrency.' },
      { k: 'DLQ', v: 'maxReceiveCount → DLQ',
        desc: 'After N failed receives, message moves to DLQ. Set CloudWatch alarm on DLQ depth to alert on persistent failures.' },
      { k: 'Cost model', v: 'Per million requests (~$0.40)',
        desc: 'Each API call counts. Batching (SendMessageBatch, ReceiveMessage 10-at-once) dramatically reduces cost.' },
    ],
    flashcards: [
      { q: 'Need strict in-order processing per customer?', a: 'FIFO queue with MessageGroupId = customerId' },
      { q: 'Consumer keeps crashing midway through processing?', a: 'Increase visibility timeout OR call ChangeMessageVisibility' },
      { q: 'Persistent processing failures — where to investigate?', a: 'Dead-Letter Queue + CloudWatch alarm on depth' },
      { q: 'Payload bigger than 256 KB?', a: 'Store body in S3, put S3 key in SQS (or use SQS Extended Client)' },
      { q: 'Empty polling responses costing too much?', a: 'Enable long polling (ReceiveMessageWaitTimeSeconds = 20)' },
    ],
    resources: [
      { label: 'SQS Developer Guide', url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html' },
      { label: 'SQS Best Practices', url: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  sns: {
    title: 'Amazon SNS — Simple Notification Service',
    subtitle: 'Pub/sub fan-out — one publish, many subscribers, multiple protocols',
    estReadMin: 5,
    overview: `SNS is push-based pub/sub. Producers publish messages to a TOPIC; subscribers (SQS, Lambda, HTTP/S, email, SMS, mobile push) receive every message. SNS is the canonical fan-out service: one event → many consumers, each filtering for what they care about.`,
    sections: [
      {
        title: 'Standard vs FIFO topics',
        table: {
          headers: ['Feature', 'Standard', 'FIFO'],
          rows: [
            ['Throughput', 'Nearly unlimited', '300 publishes/s (3000 with batching) per group'],
            ['Ordering', 'Best-effort', 'STRICT within MessageGroupId'],
            ['Delivery', 'At-least-once', 'Exactly-once with dedup'],
            ['Subscribers allowed', 'All (SQS, Lambda, HTTP, email, SMS, mobile)', 'SQS FIFO + Lambda + HTTPS firehose only'],
          ],
        },
      },
      {
        title: 'Subscription protocols',
        bullets: [
          'SQS — most common; survives subscriber outages, decouples reliably',
          'Lambda — direct invoke; cleanup must run inside Lambda',
          'HTTP/HTTPS endpoints — webhooks; SNS retries with exponential backoff',
          'Email / SMS — humans (configure SMS spending limits!)',
          'Mobile Push — APNS / FCM / ADM / Baidu via Platform Applications',
          'Kinesis Data Firehose — durable archive to S3 / Redshift',
        ],
      },
      {
        title: 'Filter policies',
        bullets: [
          'JSON pattern on message attributes — subscriber receives only matching messages',
          'Filtering happens at SNS — saves consumer compute cost',
          'E.g. only "customerTier=VIP" messages reach the VIP-handling Lambda',
          'Up to 5 filter policy filter terms by default; can match exact, prefix, anything-but, numeric ranges',
        ],
      },
      {
        title: 'Fan-out patterns',
        bullets: [
          'SNS → multiple SQS queues — each consumer\'s own queue; survives consumer outages',
          'SNS → SQS + Lambda + HTTP — mixed subscriber types in parallel',
          'Cross-region delivery via HTTPS endpoint in another region',
          'Cross-account: topic policy grants Subscribe / Publish to other accounts',
        ],
      },
      {
        title: 'Reliability features',
        bullets: [
          'Dead-Letter Queue at SUBSCRIPTION level — captures messages SNS couldn\'t deliver',
          'Message archiving (with Kinesis Data Firehose subscriber) for replay',
          'Retry policy customisable per subscription (e.g. HTTP endpoint: 3 fast + 3 slow retries)',
          'Server-Side Encryption with KMS for at-rest',
        ],
      },
    ],
    examTraps: [
      'SNS is PUSH (no polling). SQS is PULL. They\'re complementary — often combined as "fan-out to multiple SQS queues"',
      'FIFO SNS only supports FIFO SQS, Lambda, HTTPS firehose (not generic HTTP / email / SMS)',
      'SNS retains messages until delivered OR until retention expires — there is NO long-term storage in SNS itself',
      'SMS pricing is country-dependent and can be VERY expensive — set spending limits',
      'Email subscribers must CONFIRM via the confirmation link before they receive messages',
    ],
    cheatsheet: [
      { k: 'Max message size', v: '256 KB (same as SQS)',
        desc: 'For larger payloads use the Extended Client (stores body in S3, sends pointer).' },
      { k: 'Subscribers per topic', v: '12.5 million (soft)',
        desc: 'Most workloads need a handful. Use filter policies to give each subscriber only what it cares about.' },
      { k: 'Fan-out to SQS', v: 'Each subscriber has own queue',
        desc: 'Standard pattern: SNS topic → many SQS queues → many consumers. Failures isolated per queue.' },
      { k: 'Filter policy', v: 'JSON on message attributes',
        desc: 'Filtering happens at SNS — saves consumer cost. Up to 5 terms per filter; supports prefix, range, anything-but.' },
      { k: 'FIFO SNS', v: 'Order + dedup per MessageGroupId',
        desc: 'Pair with FIFO SQS subscribers. Use cases: accounting events, payment processing — anywhere order matters.' },
      { k: 'Cross-region delivery', v: 'Via HTTPS endpoint',
        desc: 'No direct cross-region topic. Subscribe an SNS topic in region B to an HTTPS endpoint that is your topic in region A.' },
      { k: 'Mobile Push', v: 'APNS / FCM / ADM / Baidu',
        desc: 'SNS abstracts platform-specific push services. Register device tokens as Platform Endpoints.' },
      { k: 'SMS spending limit', v: 'Account-level monthly cap',
        desc: 'Always set it before going live. SMS in some countries is $0.20+/message — bills can spiral fast.' },
    ],
    flashcards: [
      { q: 'One event must reach 5 different services?', a: 'SNS topic with 5 subscriptions (fan-out)' },
      { q: 'Need strict ordering with dedup across subscribers?', a: 'SNS FIFO topic with SQS FIFO subscribers' },
      { q: 'Want to filter messages per subscriber server-side?', a: 'SNS Subscription Filter Policy' },
      { q: 'Need push notifications to iOS + Android?', a: 'SNS Mobile Push with APNS + FCM Platform Applications' },
      { q: 'SNS delivery failed — where does the message go?', a: 'Subscription Dead-Letter Queue (if configured)' },
    ],
    resources: [
      { label: 'SNS Developer Guide', url: 'https://docs.aws.amazon.com/sns/latest/dg/welcome.html' },
      { label: 'SNS Filter Policies', url: 'https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  kms: {
    title: 'AWS KMS — Key Management Service',
    subtitle: 'Centralised encryption key management with FIPS-validated HSMs',
    estReadMin: 7,
    overview: `KMS manages encryption keys for use across AWS services and your apps. Keys never leave KMS unencrypted; KMS performs all encrypt/decrypt operations internally. The exam tests key types (symmetric/asymmetric, AWS-managed/customer-managed), key policies + grants, automatic rotation, envelope encryption, and integration with S3/EBS/RDS/Lambda/etc.`,
    sections: [
      {
        title: 'Key types',
        bullets: [
          'AWS-managed (aws/service-name) — created by AWS services on your behalf; cannot modify policy; rotated every ~3 years',
          'Customer-managed (CMK) — you create + manage; configurable policy, rotation, deletion',
          'AWS-owned — invisible, used by AWS internally; no charge, no visibility',
          'Symmetric (AES-256) — most common; same key encrypts + decrypts',
          'Asymmetric (RSA, ECC) — separate public/private keys for signing or encryption',
          'HMAC keys — message authentication',
        ],
      },
      {
        title: 'Envelope encryption — the foundational pattern',
        bullets: [
          'KMS API can only encrypt payloads up to 4 KB',
          'For larger data: call GenerateDataKey → receive a data key + its encrypted form',
          'Encrypt your data locally with the plaintext data key',
          'Store the encrypted data key alongside the ciphertext',
          'On decrypt: call KMS Decrypt on the encrypted data key → get plaintext key → decrypt data',
          'One KMS call per file regardless of file size — drastically cheaper',
        ],
      },
      {
        title: 'Key policies vs Grants',
        bullets: [
          'Key Policy — the resource-based policy on the CMK; defines who can use it',
          'Default key policy gives root account full control + delegates to IAM',
          'Grants — temporary, scoped delegations (e.g. "let this Lambda use the key for one operation")',
          'Grants can be retired when no longer needed — better than permanent IAM permissions',
          'View Effective Permissions = Key Policy ∩ IAM Policy ∩ Grant',
        ],
      },
      {
        title: 'Key rotation',
        bullets: [
          'Customer-managed CMK — enable automatic ANNUAL rotation (old material kept for decryption of old data)',
          'AWS-managed key — rotated by AWS every ~3 years (no control)',
          'Manual rotation — create a new key, update alias to point to it; old key kept for legacy decryption',
          'Imported key material — you handle rotation manually (no auto)',
        ],
      },
      {
        title: 'Special key stores',
        bullets: [
          'CloudHSM — dedicated HSM in your VPC (FIPS 140-2 Level 3); HSM-only operations',
          'External Key Store (XKS) — key material in YOUR on-prem HSM via XKS proxy (compliance: AWS never sees material)',
          'BYOK — import key material into KMS; you retain the master copy',
        ],
      },
      {
        title: 'Integration highlights',
        bullets: [
          'S3 SSE-KMS — server-side encryption with KMS; enable Bucket Keys to cut per-object KMS calls 99%',
          'EBS — encrypt volumes at creation; whole-account default available',
          'RDS — encryption at creation only; existing instances need snapshot-copy-restore workflow',
          'Secrets Manager — secrets at rest encrypted with KMS',
          'Lambda env vars — KMS-encrypted at rest',
        ],
      },
    ],
    examTraps: [
      'KMS Encrypt API caps at 4 KB — large data REQUIRES envelope encryption',
      'AWS-managed keys CANNOT be deleted or rotated on demand — limited audit/control',
      'KMS key deletion has a 7-30 day pending window — protects against accidental deletion',
      'Key Policy is required — IAM alone CANNOT grant KMS access (the key must allow it)',
      'Multi-region keys are SEPARATE primary/replica keys — they share key material but each is independent',
      'XKS keys never leave on-prem HSM — every encrypt/decrypt operation crosses the network',
    ],
    cheatsheet: [
      { k: 'Symmetric vs Asymmetric', v: 'Symmetric AES-256 (most common) · Asymmetric RSA/ECC (signing)',
        desc: 'Symmetric same key encrypts+decrypts. Asymmetric for signing or sharing public key with external parties.' },
      { k: 'Customer-managed key', v: 'Configurable policy + rotation + delete',
        desc: 'Use when you need fine-grained control, audit trail, or compliance with customer-key requirements.' },
      { k: 'Automatic rotation', v: 'Annual (customer-managed only)',
        desc: 'AWS rotates old material under the hood; old material kept to decrypt previously-encrypted data. Free + transparent.' },
      { k: 'Envelope encryption', v: 'GenerateDataKey + local encrypt',
        desc: 'Required for data > 4 KB. One KMS call per file regardless of size. Cuts cost dramatically vs calling Encrypt per chunk.' },
      { k: 'S3 Bucket Keys', v: '99% cut in KMS calls',
        desc: 'Generates a short-lived bucket-level key; objects reference it. Saves KMS API costs at scale (Black Friday-level throughput).' },
      { k: 'CloudHSM vs KMS', v: 'CloudHSM = single-tenant FIPS L3 · KMS = multi-tenant FIPS L2',
        desc: 'CloudHSM gives you exclusive HSM access (~$1.50/hr per HSM). KMS is cheaper + simpler for most needs.' },
      { k: 'External Key Store (XKS)', v: 'Key material on-prem',
        desc: 'For "AWS must never see the key" compliance. KMS proxies every operation to your HSM. Latency + cost premium.' },
      { k: 'Key deletion window', v: '7 – 30 days',
        desc: 'Schedule deletion; key disabled but recoverable until window expires. Protects against accidental destruction.' },
    ],
    flashcards: [
      { q: 'Need to encrypt a 10GB file with KMS-managed key — pattern?', a: 'Envelope encryption (GenerateDataKey → encrypt locally)' },
      { q: 'Compliance: keys MUST be rotated annually — option?', a: 'Customer-managed CMK with automatic rotation enabled' },
      { q: 'Compliance: AWS must NEVER see key material — option?', a: 'External Key Store (XKS) with on-prem HSM' },
      { q: 'Need to delegate KMS usage to Lambda for ONE operation?', a: 'Create a Grant (retire when done) vs permanent IAM' },
      { q: 'S3 hitting KMS API quota during peak — fix?', a: 'Enable S3 Bucket Keys' },
    ],
    resources: [
      { label: 'KMS Developer Guide', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/overview.html' },
      { label: 'Envelope Encryption', url: 'https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#enveloping' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  ecs: {
    title: 'Amazon ECS — Elastic Container Service',
    subtitle: 'Run containers on AWS — Fargate (serverless) or EC2 (cluster) launch types',
    estReadMin: 7,
    overview: `ECS is AWS's container orchestrator. You define TASK DEFINITIONS (what container image + CPU/memory/network), run them as SERVICES (long-running, auto-restarted) or one-off TASKS. ECS supports two launch types: Fargate (serverless — AWS manages the host) and EC2 (you manage a cluster of EC2 hosts). For pure AWS workloads ECS is simpler than EKS.`,
    sections: [
      {
        title: 'Launch types: Fargate vs EC2',
        table: {
          headers: ['Aspect', 'Fargate', 'EC2 launch type'],
          rows: [
            ['You manage', 'Just task definitions', 'EC2 instances + capacity'],
            ['Billing', 'Per task vCPU/memory/hour', 'Per EC2 instance (and unused capacity)'],
            ['Scaling', 'Instant per task', 'EC2 + tasks (two layers)'],
            ['Best for', 'Variable / spiky workloads, simplicity', 'Steady high-utilisation, custom AMI / GPU'],
          ],
        },
      },
      {
        title: 'Core concepts',
        bullets: [
          'Task Definition — JSON: container image, CPU/memory, env vars, IAM role, network mode, volumes',
          'Task — a running instance of a task definition',
          'Service — keeps N tasks running; integrates with ALB / NLB; auto-recovers failed tasks',
          'Cluster — logical grouping; can mix Fargate + EC2 capacity providers',
        ],
      },
      {
        title: 'IAM roles — two distinct ones',
        bullets: [
          'Task Execution Role — used by the ECS AGENT to pull images from ECR + write to CloudWatch Logs',
          'Task Role — assumed by the CONTAINER for its application-level AWS calls (S3, DynamoDB, etc.)',
          'Don\'t conflate them — Execution Role does NOT need your app\'s permissions',
        ],
      },
      {
        title: 'Networking modes',
        bullets: [
          'awsvpc (default for Fargate) — each task gets its own ENI + IP (most isolated, recommended)',
          'bridge (EC2 only) — Docker bridge network; port mapping',
          'host (EC2 only) — task uses host\'s network directly',
          'none — no external networking',
        ],
      },
      {
        title: 'Capacity Providers + Auto Scaling',
        bullets: [
          'Capacity Provider Strategy lets you mix On-Demand + Spot or Fargate + Fargate Spot',
          'OnDemandBaseCapacity + weights for predictable + cost-optimised',
          'Application Auto Scaling on the SERVICE — scale based on CPU, memory, ALB requests, or SQS depth',
          'Cluster Auto Scaling (EC2 launch type) scales the underlying EC2 fleet based on task demand',
        ],
      },
      {
        title: 'Service integrations',
        bullets: [
          'ALB / NLB — service connects to a target group; ALB does L7 routing per path/host',
          'Service Discovery via AWS Cloud Map — register tasks in private DNS for service-to-service calls',
          'Service Connect — modern service mesh for ECS (envoy-based)',
          'ECS Exec — interactive shell into running Fargate/EC2 task via SSM (no SSH)',
          'CodeDeploy blue/green — zero-downtime deploys with instant rollback',
        ],
      },
    ],
    examTraps: [
      'Fargate has NO SSH and NO host access — use ECS Exec for shell',
      'Task Execution Role ≠ Task Role — Execution is for ECS agent; Task is for app code',
      'Spread + binpack placement strategies COMBINE — list them in order of priority',
      'Fargate tasks have a max ephemeral storage of 200 GB (configurable from 20 GB default)',
      'EC2 launch type requires the ECS agent installed (Amazon ECS-optimised AMI has it)',
      'awsvpc mode is REQUIRED for Fargate and recommended for EC2 (each task gets its own ENI)',
    ],
    cheatsheet: [
      { k: 'Fargate', v: 'Serverless · pay per task vCPU + memory hour',
        desc: 'Pick for variable workloads, microservices, simplicity. No EC2 ops. ~$0.04/hr per vCPU + ~$0.005/hr per GB.' },
      { k: 'EC2 launch type', v: 'You manage cluster; mix instance types',
        desc: 'Pick for steady high-utilisation (full bin-pack), custom AMIs, GPU workloads, or special networking.' },
      { k: 'Task Definition', v: 'JSON: image, resources, IAM, network',
        desc: 'Immutable + versioned. Update by creating a new revision; services roll out to new revision.' },
      { k: 'ECS Service', v: 'Maintains N tasks, integrates LB, auto-recovers',
        desc: 'For long-running apps. Integrates with ALB/NLB target groups. Application Auto Scaling on CPU/memory/SQS.' },
      { k: 'Task Execution Role', v: 'For ECS agent (pull image + log)',
        desc: 'Needs ECR pull + CloudWatch Logs write. ECS provides AmazonECSTaskExecutionRolePolicy managed policy.' },
      { k: 'Task Role', v: 'For container app (S3, DynamoDB, etc.)',
        desc: 'Assumed by the running container. Least-privilege per task — each service gets its own role.' },
      { k: 'Placement strategies', v: 'spread (HA) · binpack (cost) · random',
        desc: 'Combine in order: spread by AZ for HA, then binpack on memory for cost. Most common pairing.' },
      { k: 'Capacity Provider', v: 'On-Demand + Spot mix',
        desc: 'Set base + weight per provider. Fargate Spot up to 70% off but interruptible.' },
    ],
    flashcards: [
      { q: 'Want zero-EC2-ops container hosting?', a: 'Fargate launch type' },
      { q: 'Need shell into a running Fargate container?', a: 'ECS Exec (SSM-backed; no SSH)' },
      { q: 'Container needs to read from S3 — which role?', a: 'Task Role (not Task Execution Role)' },
      { q: 'Auto-scale ECS service based on SQS queue depth?', a: 'Application Auto Scaling target tracking on SQS depth' },
      { q: 'Zero-downtime ECS deploy with rollback?', a: 'CodeDeploy blue/green deployment' },
    ],
    resources: [
      { label: 'ECS Developer Guide', url: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html' },
      { label: 'Fargate', url: 'https://docs.aws.amazon.com/AmazonECS/latest/userguide/what-is-fargate.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  eks: {
    title: 'Amazon EKS — Managed Kubernetes',
    subtitle: 'Managed Kubernetes control plane + EC2 / Fargate worker nodes',
    estReadMin: 7,
    overview: `EKS runs the Kubernetes control plane for you (etcd, API server, scheduler) at a flat $0.10/hr per cluster (~$73/month). You manage worker nodes (EC2 nodegroups, Fargate, or both) plus your app workloads. Pick EKS over ECS when you need Kubernetes ecosystem (Helm, Istio, kubectl skills, multi-cloud portability).`,
    sections: [
      {
        title: 'Worker node options',
        table: {
          headers: ['Option', 'Description', 'When to pick'],
          rows: [
            ['Managed Node Groups', 'EKS provisions + lifecycle-manages EC2 nodes', 'Default for EC2 workers'],
            ['Self-managed nodes', 'You bring your own EC2 + bootstrap', 'Custom AMI / kernel tuning'],
            ['Fargate Profile', 'Serverless per-pod compute', 'Spiky workloads, isolation per pod'],
            ['Karpenter', 'JIT autoscaler picks best instance per pod', 'Cost-optimised flexible scaling'],
          ],
        },
      },
      {
        title: 'IRSA — IAM Roles for Service Accounts',
        bullets: [
          'Maps a Kubernetes ServiceAccount to an IAM role via OIDC',
          'Each POD gets its own IAM role (not the node\'s broad role) — least privilege',
          'Required for any pod that needs AWS API access (S3, DynamoDB, etc.)',
          'Without IRSA, all pods on a node share the node\'s permissions — blast radius too wide',
        ],
      },
      {
        title: 'Networking — VPC CNI',
        bullets: [
          'Default CNI assigns each pod a real VPC IP via secondary IPs on ENIs',
          'Pod IP count limited by ENI × IPs per instance type',
          'Solution: prefix delegation (more IPs per ENI), custom networking (separate pod subnets), or larger instance types',
          'AWS Load Balancer Controller manages ALB/NLB from Kubernetes Ingress / Service resources',
        ],
      },
      {
        title: 'Storage',
        bullets: [
          'EBS CSI driver — dynamic block storage per StatefulSet pod',
          'EFS CSI driver — shared file system across pods',
          'FSx for Lustre CSI — HPC throughput',
          'S3 Mountpoint CSI — POSIX-like S3 access',
        ],
      },
      {
        title: 'Managed add-ons',
        bullets: [
          'EKS Managed Add-ons handle install + upgrade of core components (VPC CNI, kube-proxy, CoreDNS, EBS CSI)',
          'AWS keeps versions Kubernetes-compatible — one-click upgrades',
          'Cluster Insights surface known issues before upgrades',
        ],
      },
    ],
    examTraps: [
      'EKS control plane is NOT free — flat $0.10/hr per cluster regardless of size',
      'ECS is simpler + cheaper for pure-AWS workloads — pick EKS only when you need K8s ecosystem',
      'Pod IP exhaustion is a real EKS problem — plan VPC CIDR + check instance ENI/IP limits',
      'Karpenter is open-source AWS-built — not a managed service; you install it in the cluster',
      'IRSA requires the OIDC provider to be enabled on the cluster',
    ],
    cheatsheet: [
      { k: 'Control plane cost', v: '$0.10/hr (~$73/mo) per cluster',
        desc: 'Flat fee regardless of node count or pod count. Worker nodes billed separately at EC2/Fargate rates.' },
      { k: 'ECS vs EKS', v: 'ECS simpler + cheaper · EKS = K8s ecosystem',
        desc: 'Pick ECS for AWS-native workloads. Pick EKS when you need Helm, Istio, kubectl portability, or existing K8s skills.' },
      { k: 'Fargate Profile', v: 'Selector matches pods → run on Fargate',
        desc: 'Match by namespace + labels. Other pods run on EC2 nodegroups. Mix freely in one cluster.' },
      { k: 'Karpenter', v: 'JIT node autoscaler, cost-optimised',
        desc: 'Picks the cheapest instance type per pending pod (incl. Spot). Faster + cheaper than Cluster Autoscaler.' },
      { k: 'IRSA', v: 'Pod-level IAM via OIDC',
        desc: 'Each ServiceAccount maps to an IAM role. Required for pod-level AWS API access with least privilege.' },
      { k: 'EBS CSI driver', v: 'Per-pod block storage',
        desc: 'For StatefulSet workloads needing persistent block volumes. Each PVC provisions an EBS volume.' },
      { k: 'AWS LB Controller', v: 'K8s Ingress → ALB · Service → NLB',
        desc: 'Watches K8s resources and provisions ALBs/NLBs. Supports path/host routing + SSL termination.' },
      { k: 'Managed Add-ons', v: 'AWS-installed core components',
        desc: 'Hands-off upgrades for VPC CNI, kube-proxy, CoreDNS, EBS CSI. One API call to update versions.' },
    ],
    flashcards: [
      { q: 'EKS cluster monthly control plane cost?', a: '~$73/month ($0.10/hr flat)' },
      { q: 'Pod needs S3 access with least privilege — how?', a: 'IRSA — IAM role mapped to the pod\'s ServiceAccount' },
      { q: 'Cost-optimise EKS nodes with JIT instance selection?', a: 'Karpenter' },
      { q: 'Run serverless pods in EKS?', a: 'Fargate Profile with namespace / label selector' },
      { q: 'Expose multiple K8s services via path-based ALB?', a: 'AWS Load Balancer Controller + Ingress resources' },
    ],
    resources: [
      { label: 'EKS User Guide', url: 'https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html' },
      { label: 'EKS Best Practices', url: 'https://aws.github.io/aws-eks-best-practices/' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  aurora: {
    title: 'Amazon Aurora — Cloud-Native Relational Database',
    subtitle: 'MySQL/Postgres-compatible engine on AWS-built distributed storage',
    estReadMin: 8,
    overview: `Aurora is AWS's purpose-built relational database. Same wire protocol as MySQL/Postgres but rebuilt internals: 6-way replicated storage across 3 AZs (self-healing), separate compute + storage scaling, sub-second cross-region replication via Global Database, copy-on-write Clones, and 72-hour Backtrack. Up to 5x MySQL / 3x Postgres throughput at 1/10th the cost of commercial databases.`,
    sections: [
      {
        title: 'Storage architecture',
        bullets: [
          '6 copies of data across 3 AZs by default',
          'Survives loss of 2 copies with no write impact, 3 copies with no read impact',
          'Storage auto-grows in 10GB increments up to 128TB',
          'Self-healing: corrupted blocks rebuilt automatically',
          'Backups are continuous + incremental — no performance impact',
        ],
      },
      {
        title: 'Endpoints',
        table: {
          headers: ['Endpoint', 'Use'],
          rows: [
            ['Cluster Endpoint', 'Always points to the WRITER instance'],
            ['Reader Endpoint', 'DNS round-robin across all healthy READER replicas'],
            ['Custom Endpoint', 'You define a group of instances (e.g. high-spec readers for analytics)'],
            ['Instance Endpoint', 'Specific instance (rare; use cluster/reader endpoints instead)'],
          ],
        },
      },
      {
        title: 'Aurora-only features',
        bullets: [
          'Backtrack (MySQL) — in-place rewind up to 72 hours; no new instance needed',
          'Cloning — copy-on-write clone of entire cluster; instant + cheap',
          'Parallel Query (MySQL) — pushes scans to storage layer for analytics',
          'Aurora ML — call SageMaker / Comprehend from SQL queries',
          'Aurora Global Database — sub-second cross-region replication + < 1 min failover',
          'Aurora Serverless v2 — scales in 0.5 ACU increments, Multi-AZ + Global compatible',
        ],
      },
      {
        title: 'Read replicas',
        bullets: [
          'Up to 15 read replicas per cluster (vs 5 for RDS)',
          'Sub-10ms replica lag typically (vs RDS\'s async lag)',
          'Replicas can be promoted to writer in < 1 minute on failover',
          'Reader endpoint auto-load-balances across all healthy replicas',
        ],
      },
      {
        title: 'Aurora Global Database',
        bullets: [
          'Primary region + up to 5 secondary regions',
          'Storage-level replication: typically < 1 second cross-region lag',
          'Promote a secondary to primary in < 1 minute (planned failover)',
          'Each secondary supports up to 16 read replicas locally',
          'Use case: global low-latency reads + cross-region DR with strict RPO',
        ],
      },
    ],
    examTraps: [
      'Aurora Serverless v1 has scale-to-zero; v2 has a minimum capacity floor',
      'Aurora Backtrack is MySQL-only (NOT Postgres)',
      'Aurora is NOT 100% MySQL/Postgres compatible — some extensions / replication features differ',
      'Standard Aurora cluster lives in one region; cross-region needs Global Database',
      'Aurora storage costs more per GB than RDS storage, but you only pay for actually used (not provisioned)',
      'Cloning works WITHIN a region — for cross-region copy use snapshots',
    ],
    cheatsheet: [
      { k: 'Storage replication', v: '6 copies across 3 AZs',
        desc: 'Self-healing distributed storage. Survives 2 AZ failures with no write impact, 3 with no read impact.' },
      { k: 'Max read replicas', v: '15 per cluster',
        desc: '3× the vanilla RDS limit. Sub-10ms lag. Reader endpoint round-robins across all healthy replicas.' },
      { k: 'Backtrack', v: 'In-place rewind, up to 72h (MySQL)',
        desc: 'No new instance needed — cluster rolls back to chosen timestamp. Postgres uses PITR instead.' },
      { k: 'Cloning', v: 'Copy-on-write, instant + cheap',
        desc: 'Perfect for spinning up test environments from prod data. Only divergent blocks cost extra storage.' },
      { k: 'Global Database', v: '< 1s replication · < 1 min failover',
        desc: 'Up to 5 secondary regions. Pick when you need both global low-latency reads AND cross-region DR.' },
      { k: 'Serverless v2', v: '0.5 ACU increments · Multi-AZ + Global capable',
        desc: 'Pick over v1 for production. v1 had scale-to-zero but lacked Multi-AZ and Global DB support.' },
      { k: 'Parallel Query', v: 'Pushes scans to storage layer',
        desc: 'MySQL feature. 100×+ speedup on large analytical scans. Storage nodes filter rows before returning.' },
      { k: 'Aurora ML', v: 'SageMaker / Comprehend from SQL',
        desc: 'Native SQL functions call ML endpoints. Inline predictions without app-side round trips.' },
    ],
    flashcards: [
      { q: 'Need to rewind Aurora 2 hours without creating new instance?', a: 'Backtrack (MySQL only)' },
      { q: 'Spin up a test copy of a 5TB prod Aurora cluster instantly?', a: 'Aurora Cloning (copy-on-write)' },
      { q: 'Global app needs sub-second cross-region replication + DR?', a: 'Aurora Global Database' },
      { q: 'Cheapest Aurora option for sporadic dev/test traffic?', a: 'Aurora Serverless v2 with low min ACU' },
      { q: 'Run SageMaker predictions inside SQL queries?', a: 'Aurora ML — native SageMaker integration' },
    ],
    resources: [
      { label: 'Aurora User Guide', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html' },
      { label: 'Aurora Global Database', url: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  elasticache: {
    title: 'Amazon ElastiCache — Managed Redis & Memcached',
    subtitle: 'In-memory cache + key-value store for sub-millisecond latency',
    estReadMin: 6,
    overview: `ElastiCache provides managed Redis or Memcached clusters. Use cases: cache database queries (lazy loading or write-through), session storage, leaderboards (Redis sorted sets), pub/sub messaging (Redis), distributed locking, and rate limiting. Redis is the default choice for new workloads — Memcached only if you specifically need its multi-threaded design with no persistence/replication.`,
    sections: [
      {
        title: 'Redis vs Memcached',
        table: {
          headers: ['Feature', 'Redis', 'Memcached'],
          rows: [
            ['Data types', 'Strings, hashes, lists, sets, sorted sets, streams', 'Strings only'],
            ['Persistence', 'RDB snapshots + AOF', 'None (in-memory only)'],
            ['Replication / HA', 'Yes (primary + replicas)', 'No replication'],
            ['Multi-AZ', 'Yes with auto-failover', 'No'],
            ['Cluster mode (sharding)', 'Yes (Redis Cluster)', 'Yes (client-side hashing)'],
            ['Pub/Sub', 'Yes', 'No'],
            ['Transactions', 'Yes (MULTI/EXEC)', 'No'],
            ['Threading', 'Single-threaded per node', 'Multi-threaded'],
          ],
        },
      },
      {
        title: 'Caching strategies',
        bullets: [
          'Lazy Loading (cache-aside) — read miss → fetch from DB → write to cache; only requested data cached',
          'Write-Through — write to DB AND cache simultaneously; data always fresh in cache',
          'Write-Behind — buffer writes in cache, flush to DB asynchronously (perf gain, durability risk)',
          'TTL — every cached item expires after N seconds; prevents stale data forever',
        ],
      },
      {
        title: 'Redis HA + scaling',
        bullets: [
          'Cluster Mode DISABLED — single shard with replicas (max 5 replicas) — vertical scale',
          'Cluster Mode ENABLED — multi-shard sharding for write scaling — up to 500 shards',
          'Multi-AZ with auto-failover promotes replica on primary failure (< 1 minute)',
          'Read scaling: route reads to replicas via the reader endpoint',
          'Online Resharding lets you add shards without downtime',
        ],
      },
      {
        title: 'Security',
        bullets: [
          'At-rest encryption with KMS (enable at cluster creation only)',
          'In-transit encryption (TLS) — also creation-time only',
          'Redis AUTH token (legacy) or Redis 6+ ACLs (modern user-based)',
          'IAM authentication for Redis 7+ (newer)',
          'VPC + Security Groups for network isolation',
        ],
      },
      {
        title: 'Use case patterns',
        bullets: [
          'Session store — Redis with TTL = session timeout',
          'Leaderboard — Redis sorted set (ZADD/ZRANGE — O(log N))',
          'Rate limiting — Redis INCR + EXPIRE per IP / user / API key',
          'Distributed lock — Redis SETNX / SET NX with TTL',
          'Pub/Sub — Redis PUBLISH / SUBSCRIBE for real-time messaging',
        ],
      },
    ],
    examTraps: [
      'Memcached does NOT persist or replicate — data lost on node failure',
      'At-rest + in-transit encryption MUST be enabled at cluster creation — cannot add later',
      'Redis cluster mode (sharded) requires cluster-aware client library',
      'ElastiCache is in-VPC — apps reach it via private endpoint, not internet',
      'For session store choose Redis (persistence) over Memcached (in-memory only)',
      'DAX is for DynamoDB specifically; ElastiCache is generic',
    ],
    cheatsheet: [
      { k: 'Default choice', v: 'Redis (almost always)',
        desc: 'Rich data types, persistence, replication, pub/sub. Only pick Memcached for very simple high-concurrency key-value with no persistence needs.' },
      { k: 'Lazy Loading', v: 'Cache on miss',
        desc: 'Only requested data lives in cache. Trade-off: first request after miss is slow (cache + DB round trip).' },
      { k: 'Write-Through', v: 'Cache on write',
        desc: 'Cache always fresh. Trade-off: writes are slower (write to both). Many cached items may never be read = wasted memory.' },
      { k: 'Redis Cluster Mode', v: 'Sharded — write scaling',
        desc: 'Enable for write-heavy workloads. Up to 500 shards. Each shard has its own primary + replicas.' },
      { k: 'Multi-AZ failover', v: '< 1 minute (Redis)',
        desc: 'Replica is promoted automatically on primary failure. DNS endpoint stays the same.' },
      { k: 'Encryption rules', v: 'At-rest + in-transit only at CREATE time',
        desc: 'Plan ahead — can\'t enable on existing clusters. Compliance failures = blocking issue for production.' },
      { k: 'Redis Sorted Set', v: 'O(log N) ordered ops',
        desc: 'Perfect for leaderboards, time-series ranking, rate limiting. ZADD/ZRANGE/ZRANK all O(log N).' },
      { k: 'Use vs DynamoDB DAX', v: 'ElastiCache = generic · DAX = DynamoDB-only',
        desc: 'DAX is transparent for DynamoDB SDK. ElastiCache needs app code changes but works with any backend.' },
    ],
    flashcards: [
      { q: 'Sub-millisecond reads for a hot DynamoDB table?', a: 'DAX (DynamoDB-native) — for any backend use ElastiCache' },
      { q: 'Need session storage that survives node failure?', a: 'ElastiCache for Redis (Memcached has no persistence)' },
      { q: 'Need to scale Redis WRITES horizontally?', a: 'Redis Cluster Mode (sharded)' },
      { q: 'Leaderboard with top-N + per-player rank lookups?', a: 'Redis Sorted Set (ZADD/ZRANGE/ZRANK)' },
      { q: 'Cache strategy: load only on miss?', a: 'Lazy Loading (cache-aside)' },
    ],
    resources: [
      { label: 'ElastiCache User Guide', url: 'https://docs.aws.amazon.com/elasticache/latest/red-ug/WhatIs.html' },
      { label: 'Caching Strategies', url: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Strategies.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  kinesis: {
    title: 'Amazon Kinesis — Real-Time Streaming',
    subtitle: 'Data Streams · Firehose · Managed Flink · Video Streams',
    estReadMin: 8,
    overview: `Kinesis is AWS's streaming family. Data Streams = build-your-own consumer (KCL/Lambda); Firehose = managed delivery to S3/Redshift/OpenSearch/Splunk; Managed Service for Apache Flink = real-time SQL/analytics on streams; Video Streams = ingest + analyse video. The exam tests heavily on the difference between Data Streams + Firehose + when to use each.`,
    sections: [
      {
        title: 'The four Kinesis services',
        table: {
          headers: ['Service', 'Purpose', 'Latency'],
          rows: [
            ['Data Streams', 'Ingest + custom consumer apps', '~200ms (sub-sec with EFO)'],
            ['Firehose', 'Managed delivery to S3/Redshift/OpenSearch/Splunk', '60+ seconds (buffered)'],
            ['Managed Flink', 'Real-time SQL / Apache Flink jobs on streams', '<1s for windowed aggs'],
            ['Video Streams', 'Ingest + index + analyse video', 'Streaming'],
          ],
        },
      },
      {
        title: 'Data Streams — capacity math',
        bullets: [
          'Each shard: 1 MB/s in (or 1000 records/sec), 2 MB/s out (across all consumers)',
          'Pricing: $0.015/shard-hour + per-million PUT payload units',
          'Shard math: needed shards = ceil(MB/s in) and ceil(MB/s out ÷ 2)',
          'Resharding: split (1 → 2 shards) or merge (2 → 1); manual or via UpdateShardCount',
          'Retention: 24h default; up to 365 days (paid)',
        ],
      },
      {
        title: 'Enhanced Fan-Out (EFO)',
        bullets: [
          'Standard consumers SHARE the 2 MB/s per-shard read throughput',
          'EFO gives each registered consumer DEDICATED 2 MB/s per shard',
          'Push-based delivery (sub-second) vs standard polling',
          'Cost: $0.015/consumer-shard-hour + per-GB retrieval',
          'Pick EFO when multiple consumers + you need low latency / no contention',
        ],
      },
      {
        title: 'Firehose specifics',
        bullets: [
          'Managed buffer (1-128 MiB) + flush interval (60-900s) → batch write to destination',
          'Inline Lambda transform (per-batch) — masking, normalisation, enrichment',
          'Record format conversion to Parquet or ORC (huge Athena cost savings)',
          'Dynamic Partitioning routes records to S3 paths based on JQ-extracted values',
          'Destinations: S3, Redshift (via S3), OpenSearch, Splunk, HTTP endpoints, third-party (Datadog, MongoDB)',
        ],
      },
      {
        title: 'Managed Flink',
        bullets: [
          'Apache Flink runtime managed by AWS (formerly Kinesis Data Analytics for Apache Flink)',
          'Write apps in SQL, Java, Python, Scala',
          'Sources: Kinesis Streams, MSK, S3',
          'Sinks: Kinesis Streams, Firehose, S3, DynamoDB, OpenSearch',
          'Use for: real-time aggregations, windowed analytics, joins, anomaly detection',
        ],
      },
    ],
    examTraps: [
      'Data Streams = build-your-own consumer; Firehose = AWS delivers for you. They\'re NOT interchangeable',
      'Firehose minimum latency is ~60s (buffered) — NOT real-time for sub-second use cases',
      'Kinesis Data Streams shards do NOT auto-scale — you adjust manually (or via Application Auto Scaling)',
      'Enhanced Fan-Out is per consumer per shard — not free; consider for >2 active consumers',
      'For Kafka workloads use MSK (Managed Streaming for Kafka), not Kinesis',
      'Long retention (>24h) on Data Streams costs extra — set deliberately',
    ],
    cheatsheet: [
      { k: 'Data Streams shard', v: '1 MB/s in · 2 MB/s out · 1000 PUT/s',
        desc: 'Per-shard limits. Calculate shards needed = max of input MB/s and output MB/s ÷ 2.' },
      { k: 'Firehose buffer', v: '1-128 MiB or 60-900s flush',
        desc: 'Whichever fills first triggers delivery. Smaller = lower latency, more S3 PUT cost.' },
      { k: 'Parquet conversion', v: '80-95% Athena scan cost reduction',
        desc: 'Firehose can convert JSON → Parquet/ORC using a Glue schema. Massive savings on downstream queries.' },
      { k: 'Enhanced Fan-Out', v: 'Dedicated 2 MB/s per consumer · push',
        desc: 'Sub-second latency. Use when multiple consumers compete for shard throughput. Costs $0.015/consumer-shard-hr.' },
      { k: 'Data Streams retention', v: '24h default · up to 365 days',
        desc: 'Extended retention enables replay/backfill. Pay per-shard-hour extra for retention beyond 24h.' },
      { k: 'MSK vs Kinesis', v: 'MSK = managed Kafka · Kinesis = AWS-native',
        desc: 'MSK if you already have Kafka clients / want Kafka ecosystem. Kinesis if AWS-native is fine.' },
      { k: 'Dynamic Partitioning', v: 'Firehose routes by JQ value',
        desc: 'Extracts a value from each record and routes to a per-value S3 prefix. Cleaner than post-load Glue ETL.' },
      { k: 'Video Streams', v: 'WebRTC ingest + Rekognition analysis',
        desc: 'Use for surveillance, smart home, ML video pipelines. Different service from Data Streams.' },
    ],
    flashcards: [
      { q: 'Need sub-second processing of streamed events with custom code?', a: 'Kinesis Data Streams + Lambda or KCL' },
      { q: 'Want zero-code delivery of streams to S3 + Parquet conversion?', a: 'Kinesis Data Firehose with Parquet conversion' },
      { q: 'Real-time SQL windowed aggregations?', a: 'Managed Service for Apache Flink' },
      { q: '10 consumers competing for shard throughput — fix?', a: 'Enhanced Fan-Out' },
      { q: 'Already standardised on Apache Kafka?', a: 'Amazon MSK (Managed Streaming for Kafka)' },
    ],
    resources: [
      { label: 'Kinesis Data Streams Guide', url: 'https://docs.aws.amazon.com/streams/latest/dev/introduction.html' },
      { label: 'Kinesis Firehose Guide', url: 'https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  step: {
    title: 'AWS Step Functions — Workflow Orchestration',
    subtitle: 'Coordinate distributed services with visual state machines',
    estReadMin: 7,
    overview: `Step Functions orchestrates multi-step workflows by chaining together Lambda functions, ECS tasks, AWS services, and external APIs. You define state machines in Amazon States Language (ASL) JSON — branching, parallelism, retry, error handling, human-in-the-loop. Two workflow types: STANDARD (long-running, exactly-once, up to 1 year) and EXPRESS (high-volume, at-least-once, up to 5 minutes).`,
    sections: [
      {
        title: 'Standard vs Express workflows',
        table: {
          headers: ['Aspect', 'Standard', 'Express'],
          rows: [
            ['Max duration', '1 year', '5 minutes'],
            ['Execution model', 'Exactly-once', 'At-least-once'],
            ['Pricing', 'Per state transition', 'Per request + per GB-second'],
            ['Visibility', 'Full execution history', 'CloudWatch Logs only'],
            ['Best for', 'Long ops, audit-critical, human-in-loop', 'High-volume event processing'],
          ],
        },
      },
      {
        title: 'State types',
        bullets: [
          'Task — invoke a Lambda, ECS task, AWS service, or activity worker',
          'Choice — conditional branching based on input',
          'Parallel — fan out to multiple branches, wait for all',
          'Map — iterate over an array with configurable concurrency',
          'Wait — pause for time / timestamp',
          'Pass — forward input (transformation only)',
          'Succeed / Fail — terminate execution with status',
        ],
      },
      {
        title: 'Error handling',
        bullets: [
          'Retry — per-Task retry policy with exponential backoff + error class filter',
          'Catch — branch to a recovery state on specific error class',
          'States.ALL — catch-all error class',
          'Combine Retry + Catch — retry transient, fall to recovery on permanent failure',
        ],
      },
      {
        title: 'Service integrations',
        bullets: [
          'AWS SDK integrations — call any AWS API directly from a Task state (no Lambda needed)',
          'Optimised integrations — Lambda, ECS/Fargate, DynamoDB, SNS, SQS, etc. with native input/output mapping',
          '.sync — wait for the integrated service to complete (ECS task, EMR step, Batch job)',
          '.waitForTaskToken — pause for callback (human approval, async external service)',
        ],
      },
      {
        title: 'Use cases',
        bullets: [
          'Order processing workflow (validate → charge → ship → notify)',
          'Data pipeline orchestration (extract → transform → load → audit)',
          'Human approval flows with email link → SendTaskSuccess callback',
          'Saga pattern for distributed transactions with compensating actions',
          'ETL with Map state fan-out across thousands of files',
        ],
      },
    ],
    examTraps: [
      'Standard = exactly-once + 1 year; Express = at-least-once + 5 minutes — pick deliberately',
      '.sync waits for the underlying service to FINISH (not just to start)',
      '.waitForTaskToken pauses indefinitely until your callback resumes it — use for human approval',
      'Map state has MaxConcurrency control — without it, parallelism is unbounded',
      'Step Functions pricing: Standard = per state transition (could be expensive); Express = per request + duration',
      'For simple chains of Lambdas, sometimes Lambda Destinations or EventBridge is enough',
    ],
    cheatsheet: [
      { k: 'Standard workflow', v: '1 year max · exactly-once',
        desc: 'Pick for long-running, audit-critical, human-in-the-loop. Each state transition is billed.' },
      { k: 'Express workflow', v: '5 min max · at-least-once · high-volume',
        desc: 'Pick for streaming event processing, API request orchestration. Cheaper at scale than Standard.' },
      { k: 'Choice state', v: 'Conditional branching',
        desc: 'Evaluate input against rules → route to different next states. The canonical branching primitive.' },
      { k: 'Map state', v: 'Parallel iteration with MaxConcurrency',
        desc: 'Process arrays in parallel. Set MaxConcurrency to throttle. Distributed Map mode handles millions of items.' },
      { k: 'Retry + Catch', v: 'Per-state error handling',
        desc: 'Retry transient errors with backoff; Catch routes permanent failures to recovery branches. Always pair them.' },
      { k: '.waitForTaskToken', v: 'Pause for external callback',
        desc: 'Standard pattern for human approval (email link → SendTaskSuccess). Workflow pauses indefinitely.' },
      { k: 'AWS SDK integrations', v: 'Call any AWS API direct from Task',
        desc: 'No Lambda wrapper needed. Cleaner state machines, fewer functions to deploy.' },
      { k: 'Distributed Map', v: 'Millions of items, parallel children',
        desc: 'For very large fan-outs (S3 batch processing of billions of objects). Sub-workflows per batch.' },
    ],
    flashcards: [
      { q: 'Workflow may take days + human approval — type?', a: 'Standard workflow + .waitForTaskToken' },
      { q: 'High-volume short event processing?', a: 'Express workflow' },
      { q: 'Fan out processing across 1000 images in parallel?', a: 'Map state with MaxConcurrency' },
      { q: 'Need conditional branching based on input?', a: 'Choice state with comparison expression' },
      { q: 'Retry transient errors then fall back on permanent?', a: 'Retry array + Catch array on the Task' },
    ],
    resources: [
      { label: 'Step Functions Developer Guide', url: 'https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html' },
      { label: 'Amazon States Language', url: 'https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  eventbridge: {
    title: 'Amazon EventBridge — Serverless Event Bus',
    subtitle: 'Route events between AWS, SaaS, and your apps with rich filtering',
    estReadMin: 6,
    overview: `EventBridge is the modern serverless event bus. AWS services + SaaS partners + your custom apps publish events to an event bus; rules with filter patterns match events and route them to targets (Lambda, SQS, SNS, Step Functions, API destinations, etc.). It evolved from CloudWatch Events and is now the preferred approach for event-driven architectures.`,
    sections: [
      {
        title: 'Event bus types',
        bullets: [
          'Default bus — receives events from AWS services in your account',
          'Custom bus — for your application events',
          'Partner bus — created when you connect a SaaS partner integration (Datadog, Auth0, Zendesk, etc.)',
        ],
      },
      {
        title: 'Rules + filter patterns',
        bullets: [
          'Rule = filter pattern (which events to match) + targets (where to send)',
          'JSON pattern matching: exact values, prefix, anything-but, numeric ranges, exists',
          'Up to 5 targets per rule (multiple Lambdas, SQS, SNS, Step Functions, etc.)',
          'Input transformer modifies the event JSON before sending to target',
          'Scheduled rules — cron expressions for time-based invocations',
        ],
      },
      {
        title: 'EventBridge Pipes',
        bullets: [
          'Source → optional Filter → optional Enrichment → Target — no Lambda glue code',
          'Sources: SQS, Kinesis, DynamoDB Streams, MSK, RabbitMQ',
          'Targets: Lambda, Step Functions, API destinations, Kinesis, ECS, SQS, SNS, etc.',
          'Enrichment via Lambda, Step Functions, API destination, or API Gateway',
          'Replaces hand-coded Lambda glue for "take from queue, filter, transform, deliver" patterns',
        ],
      },
      {
        title: 'API Destinations',
        bullets: [
          'Send events to external HTTP endpoints (third-party APIs, webhooks)',
          'Connection objects hold auth (Basic, API Key, OAuth)',
          'Built-in retry + DLQ support',
          'Use case: notify partner systems, push to Slack/PagerDuty, third-party SaaS triggers',
        ],
      },
      {
        title: 'Archive + Replay',
        bullets: [
          'Archive — capture matching events to long-term storage (configurable retention)',
          'Replay — re-emit archived events to targets within a time window',
          'Use case: backfill new consumers, test consumer changes against historical data',
        ],
      },
      {
        title: 'Schema Registry',
        bullets: [
          'Auto-discovers event schemas from incoming events',
          'Browse + download as Java/Python/TypeScript classes for type-safe consumers',
          'Versioned, OpenAPI / JSON Schema compatible',
        ],
      },
    ],
    examTraps: [
      'EventBridge is the MODERN replacement for CloudWatch Events — they share the API surface',
      'Up to 5 targets per rule — for more, use multiple rules on the same pattern',
      'Default bus only receives AWS service events; custom apps need a CUSTOM bus',
      'Filter patterns are anchored at the top of the event JSON — careful with nested paths',
      'Schedules use cron OR rate expressions; cron has 6 fields (no day-of-week / day-of-month conflict)',
      'EventBridge has per-rule + per-account event-rate limits — not for raw high-throughput streaming (use Kinesis)',
    ],
    cheatsheet: [
      { k: 'Default bus', v: 'AWS service events',
        desc: 'CloudTrail events, AWS Health, EC2 state changes, S3 events (when via EventBridge), etc.' },
      { k: 'Custom bus', v: 'Your app events',
        desc: 'Create per domain (e.g. "orders", "users"). Publish via PutEvents API.' },
      { k: 'Partner bus', v: 'SaaS integrations',
        desc: 'Datadog, Auth0, Zendesk, Shopify, PagerDuty, etc. publish directly. No webhook code.' },
      { k: 'Pipes', v: 'Source → Filter → Enrich → Target',
        desc: 'Connect SQS/Kinesis/DDB Streams/MSK to any target with no Lambda glue. The modern no-code event router.' },
      { k: 'API Destinations', v: 'External HTTP endpoints',
        desc: 'Send events to third-party APIs with built-in auth, retry, DLQ. Replaces hand-coded HTTP Lambdas.' },
      { k: 'Archive + Replay', v: 'Long-term capture + backfill',
        desc: 'Configurable retention. Replay re-emits to specific targets within a time window — perfect for consumer testing.' },
      { k: 'Schema Registry', v: 'Auto-discover + codegen',
        desc: 'Subscribe a bus, EventBridge infers schemas. Generate type-safe Java/Python/TS classes.' },
      { k: 'Scheduled rules', v: 'Cron OR rate expressions',
        desc: 'Replacement for CloudWatch Events cron. Or use EventBridge Scheduler for more advanced scheduling.' },
    ],
    flashcards: [
      { q: 'One event must fan out to 7 different consumers?', a: 'EventBridge custom bus + multiple rules / multi-target rules' },
      { q: 'Route SQS messages to Step Functions with filter + enrichment — no code?', a: 'EventBridge Pipes' },
      { q: 'Receive events from Datadog / Auth0?', a: 'EventBridge Partner Event Source' },
      { q: 'Need to replay last week\'s events to a new consumer?', a: 'EventBridge Archive + Replay' },
      { q: 'Modern replacement for CloudWatch Events cron?', a: 'EventBridge Scheduled Rules / EventBridge Scheduler' },
    ],
    resources: [
      { label: 'EventBridge User Guide', url: 'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html' },
      { label: 'EventBridge Pipes', url: 'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  cloudwatch: {
    title: 'Amazon CloudWatch — Monitoring & Observability',
    subtitle: 'Metrics · Logs · Alarms · Dashboards · X-Ray traces · Synthetics',
    estReadMin: 7,
    overview: `CloudWatch is AWS's unified monitoring + observability platform: metrics (numeric time-series), logs (text events), alarms (notify when threshold breached), dashboards (visualisations), Synthetics (canary uptime checks), Contributor Insights (top-N analytics), Logs Insights (queryable log SQL), and X-Ray (distributed tracing).`,
    sections: [
      {
        title: 'Metrics',
        bullets: [
          'Standard resolution: 1-minute granularity (most AWS services)',
          'High resolution: 1-second granularity (custom metrics via PutMetricData)',
          'Detailed Monitoring on EC2: 1-minute (vs default 5-minute) — paid',
          'Custom metrics via PutMetricData API + CloudWatch agent on EC2',
          'Dimensions = up to 30 per metric — combine for slicing (e.g. by service, region, environment)',
        ],
      },
      {
        title: 'Logs',
        bullets: [
          'Log Groups → Log Streams → Log Events; collected by CloudWatch agent or service integrations',
          'Retention: configurable per log group (1 day – 10 years or never expire)',
          'Logs Insights — SQL-like queries across log groups (fast aggregations, parse, filter)',
          'Metric Filters — extract metric values from log patterns (e.g. count ERROR lines)',
          'Subscription Filters — stream logs in real time to Lambda / Kinesis / Firehose',
          'Live Tail — streaming console view of recent log events',
        ],
      },
      {
        title: 'Alarms',
        bullets: [
          'State: OK / ALARM / INSUFFICIENT_DATA',
          'Threshold types: static, anomaly detection (ML baseline), metric math expression',
          'Actions: SNS notify, EC2 actions (recover/stop/terminate), Auto Scaling, OpsItem creation',
          'Composite Alarms combine multiple alarms with AND/OR logic',
          'Standard alarm = 60s evaluation; High-resolution alarm = 10s (paid)',
        ],
      },
      {
        title: 'X-Ray — distributed tracing',
        bullets: [
          'Trace a request end-to-end across services (API GW → Lambda → DynamoDB → SNS)',
          'Service map visualises latency + errors per service',
          'Trace segments + subsegments show call hierarchy + timing',
          'Sampling rules control what % of requests are traced (cost control)',
          'Integrates with Lambda, ECS, EC2, ALB, API Gateway natively',
        ],
      },
      {
        title: 'Other features',
        bullets: [
          'Synthetics canaries — Puppeteer/Playwright scripts on schedule (browser-level uptime)',
          'Contributor Insights — top-N analytics from CloudWatch Logs or custom data',
          'CloudWatch RUM — real user monitoring for web apps',
          'Application Signals — auto-instrumented service-level objectives (SLOs)',
          'Anomaly Detection — ML baseline on a metric, alerts on unusual patterns',
        ],
      },
    ],
    examTraps: [
      'EC2 Detailed Monitoring = 1-minute (default is 5-minute) — costs extra',
      'CloudWatch Logs retention is FOREVER by default — set retention per log group to avoid bill shock',
      'Cross-region metric dashboards require manual cross-region setup (no global view by default)',
      'Logs Insights queries scan ALL events in the time range — narrow the time window to control cost',
      'EventBridge replaces CloudWatch Events for new event-routing work — they share API surface',
      'CloudWatch agent (CWA) is REQUIRED for memory + disk metrics on EC2 (default doesn\'t collect)',
    ],
    cheatsheet: [
      { k: 'Detailed Monitoring (EC2)', v: '1-min granularity (vs 5-min)',
        desc: 'Paid feature. Required for sub-5-min scaling reactions or alarms on EC2 metrics.' },
      { k: 'High-Resolution metrics', v: '1-second granularity for custom metrics',
        desc: 'PutMetricData with StorageResolution=1. Use for app-level latency / throughput where seconds matter.' },
      { k: 'Logs retention default', v: 'NEVER EXPIRE',
        desc: 'Set retention per log group at creation. Forgetting = months of accumulated logs and a big bill.' },
      { k: 'Logs Insights', v: 'SQL-like queries across log groups',
        desc: 'Pay per GB scanned. Narrow time range + filter early. Faster than parsing raw log streams.' },
      { k: 'Metric Filter', v: 'Extract metric from log pattern',
        desc: 'Count "ERROR" occurrences → publish to a metric → alarm. Standard log-pattern alerting pattern.' },
      { k: 'Subscription Filter', v: 'Real-time stream to Lambda/Firehose',
        desc: 'Use for SIEM forwarding or real-time log processing. Up to 2 subscriptions per log group.' },
      { k: 'X-Ray', v: 'Distributed tracing across services',
        desc: 'Service map + per-segment latency. Identifies bottlenecks across microservices.' },
      { k: 'Synthetics Canary', v: 'Puppeteer script on schedule',
        desc: 'Browser-level uptime + journey monitoring. Each run produces metrics + screenshots.' },
    ],
    flashcards: [
      { q: 'Need 1-minute EC2 metrics?', a: 'Enable Detailed Monitoring (paid)' },
      { q: 'Alert when "ERROR" appears >10×/min in app logs?', a: 'Metric Filter → CloudWatch Alarm' },
      { q: 'Browser-level monitoring of a critical user journey?', a: 'CloudWatch Synthetics canary' },
      { q: 'End-to-end latency across microservices?', a: 'AWS X-Ray distributed tracing' },
      { q: 'Ship logs in real time to Splunk?', a: 'Subscription Filter → Firehose → Splunk' },
    ],
    resources: [
      { label: 'CloudWatch User Guide', url: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html' },
      { label: 'CloudWatch Logs Insights', url: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  cloudformation: {
    title: 'AWS CloudFormation — Infrastructure as Code',
    subtitle: 'Declarative YAML/JSON templates manage your AWS resources as stacks',
    estReadMin: 7,
    overview: `CloudFormation provisions AWS resources from declarative templates (YAML or JSON). A STACK is the deployed instance of a template; a STACKSET deploys the same template across multiple accounts + regions. CloudFormation handles dependency resolution, parallel creation, rollback on failure, drift detection, and change-set preview.`,
    sections: [
      {
        title: 'Template anatomy',
        bullets: [
          'Parameters — runtime inputs (instance type, environment name)',
          'Mappings — static lookup tables (region → AMI ID)',
          'Conditions — boolean logic for resource creation',
          'Resources — the AWS objects to create (REQUIRED section)',
          'Outputs — values exported for other stacks / human consumption',
          'Metadata, Transform (for SAM/serverless), Rules, Hooks',
        ],
      },
      {
        title: 'Key features',
        bullets: [
          'Change Sets — preview WHAT will change before applying',
          'Drift Detection — compare actual resources vs template; flag manual changes',
          'Stack Policies — protect critical resources from accidental updates',
          'Rollback — failed updates revert automatically to last known good state',
          'Nested Stacks — break large templates into reusable modules',
          'Cross-Stack References — Outputs of one stack consumed via Fn::ImportValue',
          'CDK — write infra in TypeScript/Python/Java/.NET; synthesises to CFN',
        ],
      },
      {
        title: 'StackSets — multi-account, multi-region',
        bullets: [
          'Deploy + maintain a single template across many accounts + regions',
          'Self-managed permissions — IAM roles per target account',
          'Service-managed permissions — integrates with AWS Organizations for auto-deploy on new accounts',
          'Use cases: org-wide baselines (VPCs, IAM roles, GuardDuty, Config rules)',
        ],
      },
      {
        title: 'Intrinsic functions (most-tested)',
        bullets: [
          '!Ref — reference a parameter or resource (returns ID/ARN/Name depending on resource)',
          '!GetAtt — get a specific attribute (e.g. !GetAtt MyBucket.Arn)',
          '!Sub — string substitution (!Sub "arn:aws:s3:::${BucketName}")',
          '!Join, !Split, !Select — string + list manipulation',
          '!If, !Equals, !Not — conditional logic',
          'Fn::ImportValue — reference an Output from another stack',
        ],
      },
      {
        title: 'Best practices',
        bullets: [
          'Use Parameters for environment-specific values, NOT hard-coded',
          'Use AWS::SecretsManager + AWS::SSM::Parameter dynamic references for secrets',
          'Tag every resource for cost allocation + governance',
          'Enable termination protection on prod stacks',
          'Use Change Sets in production before every update',
          'Use SAM for serverless apps (simpler syntax that transforms to CFN)',
        ],
      },
    ],
    examTraps: [
      'Update Behavior depends on the property: some allow in-place update, some require replacement (recreate)',
      'Rollback on failure ALWAYS happens unless you disable it — partial stacks are not retained by default',
      'Cross-stack ImportValue cannot be deleted while another stack imports it — order matters',
      'StackSets need delegated administrator + trusted access enabled in Organizations',
      'CDK ultimately deploys via CloudFormation — same limits, same drift behavior',
      'Drift Detection runs on demand — schedule it via EventBridge for continuous checks',
    ],
    cheatsheet: [
      { k: 'Template languages', v: 'YAML or JSON',
        desc: 'YAML is more readable, supports comments, less syntax noise. AWS examples use YAML.' },
      { k: 'Stack', v: 'Deployed instance of a template',
        desc: 'CFN tracks every resource it created. Deleting the stack deletes the resources (unless DeletionPolicy=Retain).' },
      { k: 'StackSet', v: 'One template across many accounts + regions',
        desc: 'Org-wide baselines. Service-managed permissions auto-deploys to new accounts.' },
      { k: 'Change Set', v: 'Preview WHAT will change before apply',
        desc: 'Critical for production. Shows resource additions, modifications, deletions, replacements (recreate).' },
      { k: 'Drift Detection', v: 'Actual vs template diff per resource',
        desc: 'Detects manual changes outside CFN. Run on demand or schedule via EventBridge for continuous monitoring.' },
      { k: 'DeletionPolicy', v: 'Retain · Snapshot · Delete (default)',
        desc: 'Set on critical resources (RDS, S3 with data) to prevent accidental destruction on stack delete.' },
      { k: 'CDK', v: 'TypeScript/Python/Java/.NET → CFN',
        desc: 'Programmatic infra-as-code. Synthesises to CloudFormation. Same deploy mechanism + drift behavior.' },
      { k: 'SAM', v: 'Serverless-focused CFN transform',
        desc: 'Shorthand for Lambda + API Gateway + DynamoDB stacks. Expands to vanilla CFN at deploy time.' },
    ],
    flashcards: [
      { q: 'Deploy a VPC baseline across 50 accounts in Organizations?', a: 'CloudFormation StackSets with service-managed permissions' },
      { q: 'Preview what an update will change before applying?', a: 'Create a Change Set, review, then execute' },
      { q: 'Prevent stack deletion from destroying an RDS?', a: 'DeletionPolicy: Retain on the RDS resource' },
      { q: 'Detect manual resource changes outside CFN?', a: 'Run Drift Detection on the stack' },
      { q: 'Write infra as TypeScript that deploys via CFN?', a: 'AWS CDK' },
    ],
    resources: [
      { label: 'CloudFormation User Guide', url: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html' },
      { label: 'CloudFormation Best Practices', url: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/best-practices.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  glue: {
    title: 'AWS Glue — Serverless ETL & Data Catalog',
    subtitle: 'Spark-based ETL + a unified metadata catalog for the data lake',
    estReadMin: 6,
    overview: `Glue is two things bundled: 1) a serverless Spark + Python Shell ETL engine for transforming data, and 2) the Glue Data Catalog — a Hive-compatible metadata store that Athena, EMR, Redshift Spectrum, and Lake Formation all use as their single source of truth for "what tables / partitions / schemas exist."`,
    sections: [
      {
        title: 'Core components',
        bullets: [
          'Glue Data Catalog — central metadata store (databases → tables → partitions → columns)',
          'Crawlers — scan S3 / JDBC sources and infer schema → register tables in the Catalog',
          'ETL Jobs — Spark or Python Shell or Ray scripts that transform data',
          'Triggers — cron / on-demand / job-completion triggers',
          'Workflows — multi-job DAGs with conditional triggers',
          'Job Bookmarks — track processed records to enable incremental ETL',
        ],
      },
      {
        title: 'Job types',
        table: {
          headers: ['Type', 'Use'],
          rows: [
            ['Spark', 'Heavy distributed ETL (TB+ datasets)'],
            ['Spark Streaming', 'Process streaming source (Kinesis, Kafka)'],
            ['Python Shell', 'Lightweight scripts (no cluster overhead)'],
            ['Ray (newer)', 'Python-based distributed compute'],
            ['Glue Studio', 'Visual job authoring (drag-drop) → generates Spark code'],
          ],
        },
      },
      {
        title: 'Glue Data Quality + DataBrew',
        bullets: [
          'Glue Data Quality — define + enforce data quality rules; integrates with ETL pipelines',
          'AWS Glue DataBrew — visual no-code data preparation; 250+ built-in transformations',
        ],
      },
      {
        title: 'When to use what',
        bullets: [
          'Schema discovery from S3 → Glue Crawler',
          'Heavy distributed transformations → Glue Spark ETL Jobs',
          'Lightweight Python script → Glue Python Shell (much cheaper than Spark)',
          'No-code visual prep → Glue DataBrew',
          'Multi-step orchestration → Glue Workflows (or Step Functions for cross-service)',
        ],
      },
    ],
    examTraps: [
      'Glue Catalog is shared with Athena, EMR, Redshift Spectrum — registering a table in any of them registers it across all',
      'Crawlers cost per DPU-hour while running — large schemas can rack up cost',
      'Job Bookmarks must be ENABLED explicitly; default is off',
      'Glue is serverless but billed per DPU-hour (5-10x more than EMR for the same Spark code)',
      'Spark Streaming on Glue is for STREAMING transforms — not the same as Managed Flink',
      'Glue + Lake Formation: LF acts as a permission layer on top of Glue Catalog',
    ],
    cheatsheet: [
      { k: 'Data Catalog', v: 'Hive-compatible · shared across Athena/EMR/Redshift',
        desc: 'Single source of truth for table definitions in your data lake. Register once, query from everywhere.' },
      { k: 'Crawler', v: 'Infer schema → register in Catalog',
        desc: 'Scheduled or on-demand. Detects partitions, column types, formats. Updates table when schema evolves.' },
      { k: 'Spark ETL', v: 'Distributed transformations',
        desc: 'For TB+ datasets. Pay per DPU-hour (1 DPU = 4 vCPU + 16 GB RAM). Spark code with AWS-managed runtime.' },
      { k: 'Python Shell', v: 'Lightweight script · no cluster',
        desc: 'Cheap (~1/16 DPU). Use for small files, API calls, simple transforms — NOT distributed processing.' },
      { k: 'Job Bookmarks', v: 'Incremental ETL state',
        desc: 'Tracks processed S3 objects / DB rows. Next run picks up only new data. ENABLE EXPLICITLY.' },
      { k: 'Workflows', v: 'Multi-job DAG with triggers',
        desc: 'Conditional chain of crawlers + jobs. Visual or YAML. Lighter-weight than Step Functions for pure Glue.' },
      { k: 'DataBrew', v: 'Visual no-code prep',
        desc: '250+ built-in transformations. Good for analysts. Generates a recipe that can be re-applied to new data.' },
      { k: 'Glue Data Quality', v: 'Rule-based quality checks',
        desc: 'Define expectations (column not null, range, regex, etc.). Run as part of ETL. Failures emit metrics.' },
    ],
    flashcards: [
      { q: 'Need to discover schema of S3 CSV files automatically?', a: 'Glue Crawler' },
      { q: 'Transform 5TB of JSON to Parquet?', a: 'Glue Spark ETL Job' },
      { q: 'Run a 50-line Python script as ETL — cheapest Glue option?', a: 'Glue Python Shell (not Spark)' },
      { q: 'Only want to process NEW S3 objects on each Glue run?', a: 'Enable Job Bookmarks' },
      { q: 'Multi-step Glue pipeline with conditional triggers?', a: 'Glue Workflows' },
    ],
    resources: [
      { label: 'Glue Developer Guide', url: 'https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html' },
      { label: 'Glue Data Catalog', url: 'https://docs.aws.amazon.com/glue/latest/dg/components-overview.html#data-catalog-intro' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  athena: {
    title: 'Amazon Athena — Serverless SQL on S3',
    subtitle: 'Query data in S3 (and beyond) with standard SQL — pay per TB scanned',
    estReadMin: 6,
    overview: `Athena is serverless SQL — point it at S3 data, define a table (or let Glue Crawler do it), run SQL. You pay per TB scanned ($5/TB). With Athena Federated Query, you can also JOIN data from RDS, DynamoDB, Redshift, etc. Use Workgroups for cost limits + access control.`,
    sections: [
      {
        title: 'Cost optimisation (most-tested)',
        bullets: [
          'Use COLUMNAR formats (Parquet / ORC) — scan only the columns you SELECT',
          'COMPRESS data (Parquet uses gzip/snappy by default)',
          'PARTITION data — Athena prunes partitions based on WHERE clause',
          'Partition Projection — for high-cardinality partitions, project values at query time (no Glue catalog lookup)',
          'Workgroup limits — cap data scanned per query OR per workgroup',
          'Athena queries are charged on DATA SCANNED, not query duration',
        ],
      },
      {
        title: 'Federated Query',
        bullets: [
          'Athena Federated Query uses Lambda-based connectors to read other sources',
          'Built-in connectors: RDS, Aurora, DynamoDB, Redshift, OpenSearch, CloudWatch Logs, etc.',
          'JOIN across S3 + RDS + DynamoDB in a single SQL query',
          'Connector Lambda runs in YOUR account — pay Lambda + Athena costs',
        ],
      },
      {
        title: 'CTAS + INSERT',
        bullets: [
          'CREATE TABLE AS SELECT (CTAS) — materialise query result as a new table (Parquet, partitioned)',
          'INSERT INTO ... SELECT — append to existing table',
          'Use CTAS to convert JSON → Parquet once, then query Parquet for huge cost savings',
        ],
      },
      {
        title: 'Workgroups',
        bullets: [
          'Isolate teams/queries with separate result locations + cost limits',
          'Per-query and per-workgroup data scan limits (in $ or bytes)',
          'Enforce result encryption + workgroup-specific Athena engine version',
          'Cost separation: each workgroup gets its own CloudWatch metrics',
        ],
      },
    ],
    examTraps: [
      'Athena charges on DATA SCANNED — Parquet + partitioning are the two biggest cost levers',
      'Athena doesn\'t move or change data — it reads S3 in-place',
      'Glue Catalog is the default metadata store for Athena (you can use Athena Catalog instead but less common)',
      'Athena Federated Query is for ad-hoc JOINs — not high-throughput ETL (use Glue for that)',
      'Athena Engine Version 2 / 3 are Presto-based; choose the latest in workgroup config',
      'Workgroup limits are HARD blocks — queries fail when exceeded (not throttled)',
    ],
    cheatsheet: [
      { k: 'Pricing', v: '$5 per TB scanned',
        desc: 'Only data SCANNED counts. Parquet + partitioning routinely cut bills 90-99%.' },
      { k: 'Best format', v: 'Apache Parquet (columnar + compressed)',
        desc: 'Scans only columns you SELECT. Combine with snappy / gzip compression for 80-95% size reduction.' },
      { k: 'Partition pruning', v: 'WHERE on partition column → skip files',
        desc: 'Partition data by date / region / type / etc. WHERE on partition col → Athena reads only matching files.' },
      { k: 'Partition Projection', v: 'Project values without Catalog lookup',
        desc: 'For high-cardinality (millions of partitions). Define a projection rule (e.g. dates) → no Catalog scan needed.' },
      { k: 'Federated Query', v: 'JOIN S3 + RDS + DDB in one SQL',
        desc: 'Lambda-based connectors. Pay Lambda + Athena costs. Good for ad-hoc, not bulk ETL.' },
      { k: 'CTAS', v: 'CREATE TABLE AS SELECT → Parquet',
        desc: 'Materialise query results as a Parquet table. Use to convert JSON / CSV to Parquet once.' },
      { k: 'Workgroups', v: 'Cost limits + access isolation',
        desc: 'Separate cost limits per team / workload. Per-query and per-workgroup scan caps. Hard fails on breach.' },
      { k: 'Result location', v: 'S3 path for query output',
        desc: 'Every Athena query writes results to S3. Set lifecycle rules to expire old results and save storage cost.' },
    ],
    flashcards: [
      { q: 'Cheapest format to store S3 data for Athena?', a: 'Apache Parquet (columnar + compressed)' },
      { q: 'Stop a junior analyst from running a $250 scan?', a: 'Workgroup with per-query data scan limit' },
      { q: 'JOIN data from S3 + RDS in a single SQL query?', a: 'Athena Federated Query' },
      { q: 'Convert raw JSON files to Parquet for cheaper future queries?', a: 'CREATE TABLE AS SELECT (CTAS)' },
      { q: 'Million-partition table is slow due to Catalog lookups?', a: 'Enable Partition Projection' },
    ],
    resources: [
      { label: 'Athena User Guide', url: 'https://docs.aws.amazon.com/athena/latest/ug/what-is.html' },
      { label: 'Athena Best Practices', url: 'https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  redshift: {
    title: 'Amazon Redshift — Cloud Data Warehouse',
    subtitle: 'Petabyte-scale columnar warehouse with massively parallel processing',
    estReadMin: 7,
    overview: `Redshift is a managed PB-scale data warehouse. PostgreSQL-compatible SQL with columnar storage + MPP architecture for fast analytics. Two flavours: provisioned (RA3 nodes with managed storage) and Serverless (auto-scales RPUs). Spectrum queries S3 directly without loading. Pick over Athena when you have repeated complex analytics, denormalised tables, and need consistent fast performance.`,
    sections: [
      {
        title: 'Provisioned vs Serverless',
        table: {
          headers: ['Aspect', 'Provisioned', 'Serverless'],
          rows: [
            ['Capacity', 'Pick RA3 node type + count', 'Auto-scales RPUs based on load'],
            ['Billing', 'Per node-hour', 'Per RPU-hour'],
            ['Best for', 'Steady predictable workloads', 'Variable / unpredictable workloads'],
            ['Setup time', 'Minutes (provision cluster)', 'Seconds (define workgroup + namespace)'],
            ['Reserved pricing', 'Yes (up to 75% off)', 'No (on-demand only)'],
          ],
        },
      },
      {
        title: 'Distribution styles',
        bullets: [
          'KEY — rows with same key go to same slice (best for join optimisation when both tables use same key)',
          'EVEN — round-robin (default; safe but causes reshuffles on joins)',
          'ALL — full copy on every node (only for small dimension tables, < few MB per node)',
          'AUTO — Redshift chooses + adjusts based on table size',
        ],
      },
      {
        title: 'Sort keys',
        bullets: [
          'Single / compound sort key — order data by columns commonly filtered',
          'Interleaved sort key — equal priority to several columns (rarely used; high VACUUM cost)',
          'Sort keys enable zone maps that skip blocks on WHERE clauses',
        ],
      },
      {
        title: 'WLM (Workload Management)',
        bullets: [
          'Partition cluster resources into queues (e.g. ETL, BI dashboards, ad-hoc)',
          'Per-queue concurrency, memory %, query priority, timeout',
          'Auto WLM lets Redshift manage based on workload',
          'Use to prevent long ETL from blocking dashboard queries',
        ],
      },
      {
        title: 'Concurrency Scaling + Spectrum',
        bullets: [
          'Concurrency Scaling — transient clusters spin up during peaks to handle extra queries',
          'Pay per second of concurrency scaling usage',
          'Redshift Spectrum — query S3 data lake from Redshift (separate per-TB-scanned cost like Athena)',
          'Data Sharing — share live data across Redshift clusters / accounts without copying',
        ],
      },
      {
        title: 'Loading + ingestion',
        bullets: [
          'COPY command — bulk load from S3 (preferred for big loads)',
          'Auto-Copy — continuously loads new files from S3 prefix',
          'Streaming ingestion from Kinesis Data Streams + MSK',
          'Federated Query — query RDS Postgres / Aurora directly from Redshift',
        ],
      },
    ],
    examTraps: [
      'Redshift is NOT for OLTP — single-row writes are slow; use RDS/Aurora for OLTP',
      'Athena vs Redshift: Athena is ad-hoc on S3 (pay per scan); Redshift is consistent fast performance + complex analytics',
      'KEY distribution requires SAME key on both joined tables — otherwise reshuffle still happens',
      'ALL distribution = full copy on every node — only for small dimensions (< few MB / node)',
      'Concurrency Scaling has its own cost — not free',
      'Redshift Serverless has a minimum capacity floor — not true scale-to-zero',
    ],
    cheatsheet: [
      { k: 'Athena vs Redshift', v: 'Athena = ad-hoc S3 · Redshift = repeated complex',
        desc: 'Athena for occasional / exploratory. Redshift when you have steady analytical queries that justify the cluster cost.' },
      { k: 'Provisioned RA3', v: 'Compute + managed storage scale separately',
        desc: 'Replaced DC2 + DS2. Storage in RMS (Redshift Managed Storage) is decoupled — scale compute without buying storage.' },
      { k: 'Serverless', v: 'Auto-scale RPUs · pay per RPU-hour',
        desc: 'No node management. Best for variable workloads. Min capacity = 8 RPUs (not zero).' },
      { k: 'Distribution: KEY', v: 'Same key co-located',
        desc: 'Pick when joining huge fact + dimension on a shared key. Both tables must use same DIST KEY.' },
      { k: 'Distribution: ALL', v: 'Full copy on every node',
        desc: 'Only for SMALL dimension tables (< few MB / node). Eliminates broadcast on join.' },
      { k: 'Sort key', v: 'Zone map skips blocks',
        desc: 'Order rows by commonly-filtered columns. WHERE on sort key → Redshift reads fewer blocks.' },
      { k: 'WLM queues', v: 'Isolate workload classes',
        desc: 'Separate queues for ETL vs BI vs ad-hoc. Per-queue concurrency, memory, priority.' },
      { k: 'Spectrum', v: 'Query S3 from Redshift',
        desc: 'Extend Redshift queries with cold data in S3. Pay separate per-TB-scanned price. Glue Catalog drives schema.' },
    ],
    flashcards: [
      { q: 'Joining a 1TB fact with a 50-row lookup — distribution style?', a: 'ALL on the lookup table' },
      { q: 'Two huge tables always joined on customer_id?', a: 'KEY distribution on customer_id (both tables)' },
      { q: 'Long ETL is blocking BI dashboards — fix?', a: 'WLM queues to isolate workloads' },
      { q: 'Sudden Black Friday query load — add capacity?', a: 'Concurrency Scaling (transient extra clusters)' },
      { q: 'Cheapest serverless option for variable warehouse load?', a: 'Redshift Serverless (auto-scales RPUs)' },
    ],
    resources: [
      { label: 'Redshift Developer Guide', url: 'https://docs.aws.amazon.com/redshift/latest/dg/welcome.html' },
      { label: 'Redshift Best Practices', url: 'https://docs.aws.amazon.com/redshift/latest/dg/best-practices.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  dx: {
    title: 'AWS Direct Connect (DX)',
    subtitle: 'Dedicated fiber from your data center to AWS — bypass the internet',
    estReadMin: 6,
    overview: `Direct Connect provisions a dedicated network link (1, 10, or 100 Gbps) from your on-prem data center / colo to AWS. It gives consistent low latency, higher bandwidth, and lower data-egress costs than internet/VPN — but adds setup time (weeks) and ongoing cost. The exam tests heavily on VIF types, encryption options, and resilience tiers.`,
    sections: [
      {
        title: 'Virtual Interfaces (VIFs)',
        table: {
          headers: ['VIF', 'Purpose'],
          rows: [
            ['Private VIF', 'Route to your VPC private resources'],
            ['Public VIF', 'Access AWS public services (S3, DynamoDB) over DX backbone'],
            ['Transit VIF', 'Connect to a Transit Gateway (replaces multiple Private VIFs)'],
          ],
        },
      },
      {
        title: 'Encryption',
        bullets: [
          'DX traffic is NOT encrypted by default — physical fiber, but no IP-layer encryption',
          'Option 1: VPN over Public VIF — IPsec tunnel runs over the DX link',
          'Option 2: MACsec on the DX link itself (L2 encryption; requires 10/100 Gbps + supported devices)',
          'For regulated workloads requiring encryption in transit, you MUST add one of these',
        ],
      },
      {
        title: 'Resiliency tiers',
        table: {
          headers: ['Tier', 'Architecture', 'SLA'],
          rows: [
            ['Development / test', '1 DX', '~99%'],
            ['High Resiliency', '2 DX in different locations (or DX + VPN)', '99.9%'],
            ['Maximum Resiliency', '2 DX in 2 separate locations + 2 customer routers', '99.99%'],
          ],
        },
      },
      {
        title: 'Setup options',
        bullets: [
          'Direct connection — order from AWS, install fiber at one of 100+ DX locations',
          'Hosted connection — through a DX Partner (Equinix, etc.) for faster provisioning',
          'Hosted VIF — partner provisions VIF on shared DX (no physical link needed by you)',
          'Setup time: weeks for direct; days for hosted',
        ],
      },
      {
        title: 'Data transfer cost',
        bullets: [
          'DX data egress is significantly cheaper than internet egress',
          'Free intra-region between AWS services',
          'Cross-region DX (via DX Gateway) carries inter-region transfer charges',
          'DX Gateway lets one DX serve VPCs in multiple regions (same account or org)',
        ],
      },
    ],
    examTraps: [
      'DX is NOT encrypted by default — assume questions require explicit encryption (VPN over DX or MACsec)',
      'Private VIF can\'t reach public S3 endpoints — need Public VIF for that, OR use VPC Endpoint',
      'For multi-VPC, use Transit VIF + Transit Gateway (Transit VIF only, not Private VIF)',
      'DX setup takes WEEKS — for urgent needs use VPN first, add DX later',
      'DX is NOT highly available with a single link — single fiber cut = full outage',
      'DX bandwidth is per VIF — VIFs share the underlying connection capacity',
    ],
    cheatsheet: [
      { k: 'Bandwidth options', v: '1 / 10 / 100 Gbps (dedicated) · 50 Mbps-10 Gbps (hosted)',
        desc: 'Dedicated requires ordering a port from AWS. Hosted connections via partner support smaller sub-port bandwidth.' },
      { k: 'Private VIF', v: 'Reach VPC private resources',
        desc: 'BGP peering with your VPC via Virtual Private Gateway. Route private IPs over DX.' },
      { k: 'Public VIF', v: 'Reach AWS public services',
        desc: 'BGP peering for S3, DynamoDB, etc. Use when you want S3 traffic over DX (not internet).' },
      { k: 'Transit VIF', v: 'Reach Transit Gateway',
        desc: 'One Transit VIF connects to a TGW, which fans out to many VPCs. Replaces N Private VIFs.' },
      { k: 'MACsec', v: 'L2 encryption on DX link',
        desc: '10/100 Gbps only. Hardware-level encryption with no IP overhead. Compliance answer for regulated industries.' },
      { k: 'VPN over DX', v: 'IPsec on Public VIF',
        desc: 'Runs an IPsec VPN tunnel over the DX link. Encrypts IP traffic. Simpler than MACsec for any bandwidth.' },
      { k: 'Maximum Resiliency', v: '99.99% SLA · 2 DX × 2 locations',
        desc: '2 DX connections in 2 separate DX locations + 2 customer routers. Survives any single point of failure.' },
      { k: 'DX Gateway', v: 'One DX → multi-region VPCs',
        desc: 'Connects a single DX to VPCs in many regions / accounts. Avoids per-region DX deployments.' },
    ],
    flashcards: [
      { q: 'Need encrypted DX link with high bandwidth?', a: 'MACsec at L2 (10/100 Gbps) OR VPN over Public VIF (any bandwidth)' },
      { q: 'Connect DX to 20 VPCs?', a: 'Transit VIF + Transit Gateway' },
      { q: '99.99% DX availability requirement?', a: 'Maximum Resiliency: 2 DX × 2 locations × 2 routers' },
      { q: 'Reach S3 over DX (not internet)?', a: 'Public VIF or VPC Endpoint via Private VIF' },
      { q: 'Faster than waiting weeks for direct DX?', a: 'Hosted Connection via DX Partner' },
    ],
    resources: [
      { label: 'Direct Connect User Guide', url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html' },
      { label: 'DX Resiliency Recommendations', url: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/maximum_resiliency.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  tgw: {
    title: 'AWS Transit Gateway (TGW)',
    subtitle: 'Hub-and-spoke for VPCs + on-prem at any scale',
    estReadMin: 6,
    overview: `Transit Gateway is the modern hub for connecting many VPCs + on-prem networks. Replaces full-mesh VPC peering (which is non-transitive and O(n²)) with a single regional hub that supports transitive routing. Each VPC attaches once. TGW also peers across regions and accounts.`,
    sections: [
      {
        title: 'Core capabilities',
        bullets: [
          'TRANSITIVE routing — A↔TGW + B↔TGW + C↔TGW gives A↔B + B↔C + A↔C',
          'Up to 5000 VPC attachments per TGW (soft limit)',
          'Cross-region peering — TGW-to-TGW over AWS backbone (encrypted)',
          'Cross-account sharing via AWS Resource Access Manager (RAM)',
          'Routing isolation via multiple route tables — segment traffic',
        ],
      },
      {
        title: 'Attachment types',
        bullets: [
          'VPC attachment — connect a VPC to TGW (one ENI per AZ in the VPC)',
          'VPN attachment — Site-to-Site VPN terminates on TGW',
          'Direct Connect attachment — via Transit VIF',
          'Peering attachment — to another TGW (any region)',
          'Connect attachment — for SD-WAN appliances using GRE + BGP',
        ],
      },
      {
        title: 'Route tables',
        bullets: [
          'Each attachment is associated with a route table + can propagate routes to one or more route tables',
          'Multi-route-table design lets you create segments (e.g. dev / prod, shared services)',
          'Default route table has all attachments by default — customise to enforce isolation',
        ],
      },
      {
        title: 'Multicast',
        bullets: [
          'TGW Multicast Domain enables IP multicast across VPCs',
          'Senders multicast to a group; receivers subscribe',
          'Unique in AWS — EC2 alone doesn\'t natively support multicast',
          'Use case: financial market data, video distribution, certain HPC',
        ],
      },
    ],
    examTraps: [
      'VPC peering is NON-TRANSITIVE — for transitive routing use TGW (the exam loves this distinction)',
      'TGW is per region — for cross-region use TGW Peering (paid + encrypted on backbone)',
      'Each VPC attachment costs $0.05/hr + data transfer — not free like VPC peering',
      'TGW does NOT do NAT — VPCs still need their own internet egress (NAT GW, IGW)',
      'TGW Network Manager visualises TGW + DX + VPN across the org (no extra cost)',
      'Edit route propagation carefully — accidental routes can expose dev to prod',
    ],
    cheatsheet: [
      { k: 'TGW vs VPC peering', v: 'TGW = transitive hub · peering = pairwise non-transitive',
        desc: 'For >5 VPCs or any hub-and-spoke, use TGW. Peering remains good for 1-1 high-throughput links.' },
      { k: 'Attachment cost', v: '$0.05/hr per attachment',
        desc: 'Plus data transfer charges. Cheaper than full-mesh peering at scale but not free.' },
      { k: 'Multi-route table', v: 'Segment traffic between attachments',
        desc: 'Create dev RT + prod RT + shared services RT. Associate attachments to enforce isolation.' },
      { k: 'TGW Peering', v: 'Cross-region TGW-to-TGW',
        desc: 'Encrypted on AWS backbone. Each region still has its own TGW; peering connects them.' },
      { k: 'Cross-account share', v: 'AWS Resource Access Manager (RAM)',
        desc: 'Share TGW with member accounts. Each account attaches its own VPCs without owning the TGW.' },
      { k: 'Direct Connect', v: 'Transit VIF connects DX to TGW',
        desc: 'Single Transit VIF reaches many VPCs through TGW. Replaces N Private VIFs.' },
      { k: 'Multicast support', v: 'Yes — TGW Multicast Domain',
        desc: 'Unique in AWS. Use for financial market data, video distribution, real-time sensor fan-out.' },
      { k: 'Network Manager', v: 'Visualise TGWs + VPNs + DX',
        desc: 'Free centralised dashboard + topology map. Essential for large hybrid networks.' },
    ],
    flashcards: [
      { q: 'Need transitive routing between 20 VPCs + on-prem?', a: 'Transit Gateway hub-and-spoke' },
      { q: 'Connect TGW in eu-west-1 to TGW in us-east-1?', a: 'TGW Peering (encrypted on AWS backbone)' },
      { q: 'Need IP multicast for market data inside AWS?', a: 'TGW Multicast Domain' },
      { q: 'Share a TGW with 50 accounts in your Organization?', a: 'AWS Resource Access Manager (RAM)' },
      { q: 'Replace 20 Private VIFs to many VPCs?', a: 'Single Transit VIF + Transit Gateway' },
    ],
    resources: [
      { label: 'Transit Gateway User Guide', url: 'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html' },
      { label: 'TGW Best Practices', url: 'https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  waf: {
    title: 'AWS WAF — Web Application Firewall',
    subtitle: 'L7 protection against OWASP Top 10, bots, and rate-based abuse',
    estReadMin: 5,
    overview: `WAF is a managed L7 firewall that filters HTTP/HTTPS requests before they reach your application. Attach a Web ACL to CloudFront, ALB, API Gateway, AppSync, or App Runner. Define rules (managed by AWS, by partners, or your own) — match on URI, headers, body, IPs, geo, rate limits.`,
    sections: [
      {
        title: 'Rule types',
        bullets: [
          'Managed Rule Groups — AWS-maintained (Core, KnownBadInputs, SQLi, Linux, etc.)',
          'AWS Marketplace rule groups — third-party (Fortinet, F5, Cyber Security Cloud)',
          'Custom rules — define your own match conditions',
          'Rate-based rules — block IPs exceeding N requests in 5 min',
          'Labels — managed rules attach labels; use in custom rules to refine actions',
        ],
      },
      {
        title: 'Actions',
        bullets: [
          'ALLOW — allow the request',
          'BLOCK — block with 403',
          'COUNT — log only (use for testing rules before enforcing)',
          'CAPTCHA — challenge suspected bots with CAPTCHA',
          'Challenge — silent JavaScript proof-of-work (lighter than CAPTCHA)',
        ],
      },
      {
        title: 'Bot Control',
        bullets: [
          'AWS WAF Bot Control managed rule — categorise bots (verified, signal, etc.)',
          'Common bots (search engines, monitoring) typically Allow',
          'Suspected bots → CAPTCHA or Challenge action',
          'Targeted Bot Control adds advanced bot detection (paid extra)',
        ],
      },
      {
        title: 'Where to attach',
        table: {
          headers: ['Resource', 'Notes'],
          rows: [
            ['CloudFront', 'Block at the edge before traffic reaches origin — best for global apps'],
            ['ALB', 'Regional protection for L7 traffic'],
            ['API Gateway', 'REST + HTTP APIs'],
            ['AppSync', 'GraphQL APIs'],
            ['Cognito User Pool', 'Bot + DDoS protection on auth endpoints'],
            ['App Runner', 'WAF on App Runner services'],
          ],
        },
      },
      {
        title: 'Firewall Manager + central management',
        bullets: [
          'AWS Firewall Manager centrally deploys Web ACLs across multiple accounts in Organizations',
          'Auto-applies to new resources matching the scope',
          'Required for enforcing baseline WAF rules across an enterprise',
        ],
      },
    ],
    examTraps: [
      'WAF is L7 ONLY — for L3/L4 DDoS use AWS Shield (or Shield Advanced)',
      'WAF doesn\'t attach to NLB (NLB is L4) — put CloudFront in front if you need WAF',
      'Rate-based rules use a 5-minute SLIDING window (not per-second)',
      'COUNT action is critical for testing before BLOCK — measure false positives first',
      'WAF charges per Web ACL + per rule + per million requests evaluated',
      'For multi-account, use Firewall Manager to centralize — don\'t deploy per account manually',
    ],
    cheatsheet: [
      { k: 'Managed Rule Groups', v: 'OWASP-grade out of the box',
        desc: 'Core + KnownBadInputs + SQLi + Linux/WindowsOS + many more. AWS maintains them.' },
      { k: 'Rate-based rule', v: '5-min sliding window per IP',
        desc: 'Block IPs exceeding N requests in 5 min. Standard answer for credential stuffing + scraping abuse.' },
      { k: 'CAPTCHA / Challenge', v: 'Block bots without blocking humans',
        desc: 'CAPTCHA = visible challenge. Challenge = silent JS proof-of-work. Pair with Bot Control.' },
      { k: 'COUNT action', v: 'Log only — for testing rules',
        desc: 'Run a rule in COUNT for a week. Review false positives. Then switch to BLOCK with confidence.' },
      { k: 'Attach points', v: 'CloudFront · ALB · API GW · AppSync · Cognito',
        desc: 'Pick CloudFront for global edge protection. Pick ALB/API GW for regional apps.' },
      { k: 'Firewall Manager', v: 'Org-wide WAF policy enforcement',
        desc: 'Central deployment + auto-apply to new resources. The only sane answer for multi-account WAF.' },
      { k: 'NLB doesn\'t support WAF', v: 'L4 — no L7 inspection',
        desc: 'Put CloudFront in front of NLB if you need WAF + UDP/raw TCP.' },
      { k: 'Labels', v: 'Managed rule outputs metadata for custom logic',
        desc: 'Managed rules attach labels (e.g. awswaf:managed:aws:bot-control:verified-bot). Use labels in custom rules for nuanced actions.' },
    ],
    flashcards: [
      { q: 'Block IPs exceeding 1000 req in 5 min?', a: 'WAF Rate-based rule' },
      { q: 'OWASP Top 10 protection without writing custom rules?', a: 'AWS Managed Rule Groups (Core, KnownBadInputs, SQLi)' },
      { q: 'Challenge bots without blocking humans?', a: 'CAPTCHA or Challenge action + Bot Control' },
      { q: 'Deploy WAF to every account in Organizations?', a: 'AWS Firewall Manager' },
      { q: 'Need WAF + UDP traffic — how?', a: 'CloudFront → NLB (WAF only on CloudFront)' },
    ],
    resources: [
      { label: 'WAF Developer Guide', url: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html' },
      { label: 'Managed Rule Groups', url: 'https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  shield: {
    title: 'AWS Shield — DDoS Protection',
    subtitle: 'Shield Standard (free) + Shield Advanced (paid, 24/7 SRT support)',
    estReadMin: 4,
    overview: `Shield protects against Distributed Denial of Service attacks. Shield STANDARD is FREE and automatic for everyone — covers most common L3/L4 attacks. Shield ADVANCED ($3000/mo + traffic fees) adds L7 protection, cost protection (refunds during attacks), 24/7 DDoS Response Team (SRT), and advanced reporting.`,
    sections: [
      {
        title: 'Standard vs Advanced',
        table: {
          headers: ['Feature', 'Standard', 'Advanced'],
          rows: [
            ['Cost', 'FREE (automatic)', '$3000/month + traffic'],
            ['Protected layers', 'L3/L4', 'L3/L4/L7'],
            ['DDoS Response Team', 'No', 'Yes (24/7)'],
            ['Cost protection', 'No', 'Yes — refund for scale-out during attack'],
            ['WAF included', 'Standalone', 'INCLUDED with Advanced subscription'],
            ['Attack reports', 'Limited', 'Detailed real-time'],
          ],
        },
      },
      {
        title: 'Protected resources',
        bullets: [
          'CloudFront distributions',
          'Route 53 hosted zones',
          'Global Accelerator',
          'ALB / NLB / Elastic IP (regional resources)',
          'Application Load Balancer attached resources',
        ],
      },
      {
        title: 'Shield Advanced features',
        bullets: [
          '24/7 access to AWS Shield Response Team (SRT) during attacks',
          'Cost protection: AWS refunds scale-out costs (EC2, ELB, R53) incurred during a DDoS attack',
          'Advanced metrics + dashboards in Shield console',
          'WAF + Firewall Manager included at no additional charge',
          'Health-based detection for endpoints (integrates with R53 health checks)',
        ],
      },
    ],
    examTraps: [
      'Shield STANDARD is automatic + free — every AWS customer gets it; no subscription needed',
      'Shield ADVANCED is $3000/month per ORGANIZATION (not per account) — covers all accounts in the org',
      'L7 (application layer) DDoS requires Shield ADVANCED + WAF combined',
      'For pure DDoS mitigation choose Shield; for app-level attacks (SQLi, XSS, bot scraping) choose WAF',
      'Cost protection only applies if you subscribe BEFORE an attack — retroactive subscription doesn\'t help',
    ],
    cheatsheet: [
      { k: 'Shield Standard', v: 'FREE, automatic L3/L4',
        desc: 'Every CloudFront / R53 / ELB gets this for free. Mitigates the most common volumetric DDoS attacks transparently.' },
      { k: 'Shield Advanced', v: '$3000/month + 24/7 SRT + WAF included',
        desc: 'Per Organization (not per account). Includes WAF + Firewall Manager. Required for L7 protection and cost protection.' },
      { k: 'Cost protection', v: 'Refunds scale-out during attack',
        desc: 'AWS refunds EC2/ELB/R53 traffic-driven scale-out costs if the spike was due to a verified DDoS. Subscribe BEFORE the attack.' },
      { k: 'SRT', v: '24/7 DDoS Response Team',
        desc: 'During an attack, SRT engages within minutes to help mitigate. Only available with Advanced subscription.' },
      { k: 'WAF + Shield Advanced', v: 'Defence in depth for L7',
        desc: 'Shield handles infrastructure DDoS; WAF blocks application-layer attacks. Together = comprehensive coverage.' },
      { k: 'Protected resources', v: 'CloudFront · R53 · GA · ELB · EIP',
        desc: 'Most edge + regional public-facing resources. Add resources to Shield Advanced protection explicitly.' },
    ],
    flashcards: [
      { q: 'Cheapest L3/L4 DDoS protection?', a: 'Shield Standard (FREE, automatic)' },
      { q: 'Need cost refund for scale-out during DDoS?', a: 'Shield Advanced subscription' },
      { q: '24/7 expert help during a DDoS attack?', a: 'Shield Advanced DDoS Response Team (SRT)' },
      { q: 'L7 application-layer DDoS protection?', a: 'Shield Advanced + WAF combined' },
    ],
    resources: [
      { label: 'Shield Developer Guide', url: 'https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  secretsmgr: {
    title: 'AWS Secrets Manager + Parameter Store',
    subtitle: 'Centralised secret storage with auto-rotation + audit',
    estReadMin: 6,
    overview: `Secrets Manager stores secrets (DB passwords, API keys, OAuth tokens) with built-in rotation Lambdas for RDS, DocumentDB, Redshift, and custom secrets. Parameter Store (in SSM) is a lighter-weight alternative — free tier, no rotation, holds plaintext OR SecureString (KMS-encrypted). Both integrate with IAM + KMS + CloudTrail.`,
    sections: [
      {
        title: 'Secrets Manager vs Parameter Store',
        table: {
          headers: ['Aspect', 'Secrets Manager', 'Parameter Store (SSM)'],
          rows: [
            ['Cost', '$0.40/secret/month + $0.05 per 10k API calls', 'FREE (Standard tier)'],
            ['Rotation', 'Built-in for RDS/DocDB/Redshift + custom Lambda', 'No built-in (you script it)'],
            ['Cross-account sharing', 'Resource policy', 'Resource policy (Advanced tier)'],
            ['Max value size', '64 KB', '4 KB (Standard) / 8 KB (Advanced)'],
            ['Versioning', 'Yes (AWSCURRENT, AWSPREVIOUS, AWSPENDING)', 'Yes (versioned)'],
            ['Encryption', 'KMS (always)', 'Plaintext OR SecureString (KMS)'],
          ],
        },
      },
      {
        title: 'Rotation (Secrets Manager only)',
        bullets: [
          'Built-in rotation Lambdas: RDS, DocumentDB, Redshift, generic single-user, generic multi-user',
          'Schedule: daily / monthly / custom cron',
          'Rotation Lambda updates the secret in Secrets Manager AND the DB atomically',
          '4 stages: AWSCURRENT (in use), AWSPENDING (proposed new), AWSPREVIOUS (last), AWSPENDING test phase',
          'Apps that fetch on cold start auto-pick up rotated secret without restart',
        ],
      },
      {
        title: 'Cross-account access',
        bullets: [
          'Resource policy on the secret grants other accounts secretsmanager:GetSecretValue',
          'Combined with KMS key policy (Decrypt permission)',
          'No copies — accessing account reads the live secret from owner account',
        ],
      },
      {
        title: 'Application access patterns',
        bullets: [
          'AWS SDK GetSecretValue — fetch on app startup; cache for warm invocations',
          'Lambda cache extension reduces API calls + cost',
          'ECS task definition secret reference — secret injected as env var at task start',
          'Kubernetes External Secrets operator syncs to K8s Secrets',
          'CloudFormation / CDK dynamic reference: `{{resolve:secretsmanager:my-secret:SecretString:password}}`',
        ],
      },
    ],
    examTraps: [
      'Parameter Store is FREE for Standard tier — choose it for non-rotating values',
      'Secrets Manager charges per secret per month + per API call — not for every parameter',
      'Built-in rotation only covers RDS / DocumentDB / Redshift / generic — other DBs need custom Lambda',
      'Parameter Store hierarchical paths (/app/prod/db/password) enable IAM scoping by path',
      'Secrets Manager values MUST be KMS-encrypted; Parameter Store can be plaintext String or encrypted SecureString',
      'Both integrate with CloudTrail for full audit of GetSecretValue / GetParameter calls',
    ],
    cheatsheet: [
      { k: 'Secrets Manager cost', v: '$0.40/secret/month + $0.05 per 10k API calls',
        desc: 'Per secret. Add per-call cost for high-frequency apps. Cache on app side to reduce calls.' },
      { k: 'Parameter Store cost', v: 'FREE (Standard)',
        desc: 'Standard tier = free, 10k parameters per region, 4 KB max value. Advanced tier ($0.05/param/month) = 100k, 8 KB, policies.' },
      { k: 'Auto-rotation', v: 'Secrets Manager only',
        desc: 'Built-in rotation Lambdas for RDS, DocDB, Redshift. Custom Lambda for everything else.' },
      { k: 'Cross-account', v: 'Resource policy + KMS grant',
        desc: 'Grant secretsmanager:GetSecretValue on the secret AND kms:Decrypt on the encryption key.' },
      { k: 'Version staging', v: 'AWSCURRENT / AWSPENDING / AWSPREVIOUS',
        desc: 'Rotation Lambda creates AWSPENDING, tests it, promotes to AWSCURRENT, demotes old to AWSPREVIOUS.' },
      { k: 'CloudFormation references', v: '{{resolve:secretsmanager:...}}',
        desc: 'Dynamic reference in templates. CloudFormation fetches at deploy time and stores the resolved value securely.' },
      { k: 'Parameter Store SecureString', v: 'KMS-encrypted parameter',
        desc: 'Set Type=SecureString. Caller needs kms:Decrypt on the encryption key. Free encryption with AWS-managed key.' },
      { k: 'Hierarchical paths', v: '/app/env/component/key',
        desc: 'Parameter Store supports paths. IAM can scope to /app/prod/* for production-only access.' },
    ],
    flashcards: [
      { q: 'Rotate RDS password every 30 days automatically?', a: 'Secrets Manager with RDS rotation Lambda' },
      { q: 'Store a feature flag — cheapest option?', a: 'Parameter Store (free, no rotation needed)' },
      { q: 'Share a secret with another AWS account?', a: 'Resource policy on the secret + KMS key policy grant' },
      { q: 'Lambda fetches a secret on every cold start — cost concern?', a: 'Cache result (Lambda Extension or in-process) to cut API calls' },
      { q: 'Reference a secret in CloudFormation template?', a: 'Dynamic reference: {{resolve:secretsmanager:my-secret:SecretString:password}}' },
    ],
    resources: [
      { label: 'Secrets Manager User Guide', url: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html' },
      { label: 'Parameter Store', url: 'https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  config: {
    title: 'AWS Config — Configuration Tracking & Compliance',
    subtitle: 'Track resource state over time + evaluate against rules + auto-remediate',
    estReadMin: 5,
    overview: `AWS Config records the configuration of every AWS resource over time (a config item every time something changes) and lets you write RULES that evaluate compliance. Rules can be AWS-managed (e.g. "s3-bucket-public-read-prohibited") or custom (Lambda-backed). Combined with Conformance Packs + Remediation, Config is the foundation of AWS governance.`,
    sections: [
      {
        title: 'Core capabilities',
        bullets: [
          'Configuration recorder — captures resource state every time something changes',
          'Configuration history — every version of every resource over time',
          'Configuration snapshot — point-in-time inventory of all resources',
          'Configuration aggregator — view multi-account / multi-region Config in one place',
          'Resource timeline — visualise changes per resource for forensics',
        ],
      },
      {
        title: 'Rules + evaluations',
        bullets: [
          'AWS-managed rules — 200+ built-in (e.g. s3-bucket-public-read-prohibited, encrypted-volumes)',
          'Custom rules — Lambda function evaluates resource against your logic',
          'Periodic OR change-triggered evaluation',
          'Compliance result: COMPLIANT / NON_COMPLIANT / NOT_APPLICABLE / INSUFFICIENT_DATA',
        ],
      },
      {
        title: 'Conformance Packs',
        bullets: [
          'Bundle multiple rules + remediations into a YAML pack',
          'Deploy across an Organization (StackSet-style)',
          'AWS provides pre-built packs for HIPAA, PCI-DSS, NIST, CIS, FedRAMP, etc.',
          'Use for compliance baselines across many accounts',
        ],
      },
      {
        title: 'Auto-remediation',
        bullets: [
          'Attach a remediation action (SSM Automation document) to a rule',
          'Triggered automatically on NON_COMPLIANT or manually from console',
          'Examples: tag missing resources, enable encryption, restrict public buckets',
        ],
      },
    ],
    examTraps: [
      'AWS Config is REGIONAL — enable in every region you use; use aggregator for multi-region view',
      'Config charges per recorded item + per rule evaluation — can get expensive in busy accounts',
      'Config is for CONFIGURATION drift; for API call audit use CloudTrail',
      'Conformance Packs are the right answer for org-wide compliance baselines',
      'Custom Rule Lambdas have a 10-min execution limit',
      'Aggregator gives read-only org-wide view — rules still evaluated per account',
    ],
    cheatsheet: [
      { k: 'Configuration recorder', v: 'Captures every resource change',
        desc: 'Per-region. Enable in every region you use. Records to S3 + (optional) SNS notifications.' },
      { k: 'AWS-managed rules', v: '200+ built-in compliance checks',
        desc: 'Cover most common scenarios. Search before writing custom — chances are it exists.' },
      { k: 'Custom rules', v: 'Lambda evaluates resource',
        desc: 'For business-specific logic. Lambda receives resource config JSON, returns compliance verdict.' },
      { k: 'Conformance Pack', v: 'YAML bundle: rules + remediations',
        desc: 'Deploy across Organizations. AWS provides packs for HIPAA, PCI, NIST, CIS, FedRAMP.' },
      { k: 'Remediation', v: 'SSM Automation on non-compliance',
        desc: 'Auto-fix on NON_COMPLIANT. Examples: enable encryption, restrict public buckets, add missing tags.' },
      { k: 'Aggregator', v: 'Multi-account / multi-region view',
        desc: 'Read-only org-wide dashboard. Rules still evaluated per account/region — aggregator just collects results.' },
      { k: 'Config vs CloudTrail', v: 'Config = WHAT changed · CloudTrail = WHO did it + WHEN',
        desc: 'Complementary. Config gives resource state timeline; CloudTrail gives API call timeline.' },
      { k: 'Pricing', v: 'Per recorded item + per rule evaluation',
        desc: 'Each config item ~$0.003. Each rule evaluation ~$0.001. Busy accounts can be 100s of $/month.' },
    ],
    flashcards: [
      { q: 'Deploy 30 compliance rules across 50 accounts?', a: 'AWS Config Conformance Pack via Organizations' },
      { q: 'Auto-fix S3 buckets that become public?', a: 'Config Rule + SSM Automation remediation action' },
      { q: 'Need org-wide read-only Config view?', a: 'Configuration Aggregator' },
      { q: 'Audit: who changed this security group?', a: 'CloudTrail (Config shows WHAT changed, not WHO)' },
      { q: 'Track EBS volume encryption state over time?', a: 'AWS Config rule encrypted-volumes' },
    ],
    resources: [
      { label: 'AWS Config Developer Guide', url: 'https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html' },
      { label: 'Conformance Packs', url: 'https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  cloudtrail: {
    title: 'AWS CloudTrail — API Audit Logging',
    subtitle: 'Records every API call across your account — who, what, when, from where',
    estReadMin: 6,
    overview: `CloudTrail records every API call to AWS (console + SDK + CLI). Each event includes who (IAM identity), what (API action + parameters), when (timestamp), from where (source IP). Default trail captures 90 days of management events for free. Custom trails deliver to S3 for long retention + analysis. The exam loves Config vs CloudTrail distinctions.`,
    sections: [
      {
        title: 'Event types',
        bullets: [
          'Management events — control-plane API calls (e.g. RunInstances, CreateBucket) — FREE for first copy',
          'Data events — data-plane API calls (S3 GetObject, Lambda Invoke, DynamoDB Read) — PAID + opt-in',
          'Insights events — ML-based anomaly detection on management events — PAID',
        ],
      },
      {
        title: 'Trails',
        bullets: [
          'Default 90-day Event History — free, no setup, queryable in console',
          'Custom trail — delivers events to S3 (and optionally CloudWatch Logs)',
          'Org trail — single trail captures events across all accounts in Organizations',
          'Multi-region trail — captures events from every region',
          'Log file integrity validation — digital signatures prove logs are untampered',
        ],
      },
      {
        title: 'CloudTrail Lake',
        bullets: [
          'Fully-managed data lake for CloudTrail events',
          'SQL queries on years of audit data',
          'Up to 7-year retention',
          'No infrastructure — no S3 + Athena setup needed',
          'Pay per ingested event + per query GB',
        ],
      },
      {
        title: 'Architecture best practices',
        bullets: [
          'Send Org trail to a dedicated log-archive account (no admins, S3 Object Lock for WORM)',
          'Enable log file integrity validation',
          'Stream to CloudWatch Logs for real-time alerting (e.g. unauthorised root API call → SNS)',
          'Subscription Filter from CloudWatch Logs → Kinesis → SIEM',
        ],
      },
    ],
    examTraps: [
      'CloudTrail is enabled by default for 90-day Event History — but for LONG retention you must create a custom trail',
      'Data events (S3 / Lambda / DynamoDB) are NOT recorded by default — opt in per resource',
      'For multi-account audit, use Organization Trail (single trail captures all accounts)',
      'Forensic best practice: separate log-archive account with Object Lock — prevents admin tampering',
      'CloudTrail vs Config: CloudTrail = API CALLS (verbs); Config = RESOURCE STATE (nouns over time)',
      'Insights are not free — opt in per trail; charged per million events analysed',
    ],
    cheatsheet: [
      { k: 'Default Event History', v: '90 days · free · console-only',
        desc: 'Every account gets it automatically. For long retention or programmatic access you need a custom trail.' },
      { k: 'Management events', v: 'Control-plane API calls · free for first copy',
        desc: 'RunInstances, CreateBucket, ChangeSecurityGroup, etc. Default events captured. Second trail copy = paid.' },
      { k: 'Data events', v: 'S3 / Lambda / DynamoDB ops · paid · opt-in',
        desc: 'Per-object S3 GetObject, Lambda Invoke, DynamoDB Read. Volume is huge — enable per bucket / function with care.' },
      { k: 'Org trail', v: 'Single trail · all Org accounts',
        desc: 'Created from the management account. Captures events from every member account. The right multi-account pattern.' },
      { k: 'Log file integrity', v: 'Hourly signed digest in S3',
        desc: 'Proves logs haven\'t been altered. Required for forensic / compliance environments.' },
      { k: 'CloudTrail Lake', v: 'Managed SQL · up to 7 years',
        desc: 'Skip the S3 + Athena DIY pattern. AWS manages storage + query. Pay per ingested event + GB queried.' },
      { k: 'Insights', v: 'ML anomaly detection on API patterns',
        desc: 'Detects sudden spikes in error rates, write APIs, IAM changes. Paid per million events analysed.' },
      { k: 'Log-archive account', v: 'Dedicated account + S3 Object Lock',
        desc: 'Industry best practice. No human access. Object Lock for WORM. Survives compromise of any other account.' },
    ],
    flashcards: [
      { q: 'Need to query 3 years of audit logs via SQL — easiest option?', a: 'CloudTrail Lake' },
      { q: 'Org-wide audit with single trail?', a: 'CloudTrail Organization Trail' },
      { q: 'Forensic-grade tamper-proof logs?', a: 'Log file integrity validation + S3 Object Lock in dedicated account' },
      { q: 'Track every S3 GetObject for a sensitive bucket?', a: 'Enable Data Events on that bucket (opt-in, paid)' },
      { q: 'Alert immediately on root user activity?', a: 'CloudWatch Logs Metric Filter on CloudTrail logs → Alarm → SNS' },
    ],
    resources: [
      { label: 'CloudTrail User Guide', url: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html' },
      { label: 'CloudTrail Lake', url: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  bedrock: {
    title: 'Amazon Bedrock — Managed Generative AI',
    subtitle: 'Foundation models + RAG + Agents + Guardrails — serverless GenAI',
    estReadMin: 6,
    overview: `Bedrock is AWS's managed Generative AI platform. Access foundation models (Claude, Llama, Titan, Mistral, Cohere) via one API — no model hosting. Build RAG pipelines with Knowledge Bases; orchestrate multi-step actions with Agents; enforce safety with Guardrails. Pay per token. The SAA exam touches Bedrock at the architecture-pattern level (RAG + Guardrails).`,
    sections: [
      {
        title: 'Core capabilities',
        bullets: [
          'Model invocation — single InvokeModel API across any supported model',
          'Knowledge Bases — managed RAG: ingest S3 docs, auto-chunk + embed, store in vector DB, retrieve + generate',
          'Agents — multi-step orchestration with function calling against your APIs',
          'Guardrails — content filters + denied topics + PII redaction',
          'Model evaluation — compare models on your prompts/test data',
        ],
      },
      {
        title: 'Knowledge Bases (RAG)',
        bullets: [
          'Source: S3 (PDF, DOC, HTML, MD, TXT)',
          'Chunking + embedding handled by Bedrock',
          'Vector stores: OpenSearch Serverless, Pinecone, Redis, RDS Postgres + pgvector',
          'RetrieveAndGenerate API — one call: retrieves relevant chunks + generates answer',
          'Replaces hand-built RAG pipelines with managed alternative',
        ],
      },
      {
        title: 'Agents',
        bullets: [
          'Define an agent with a foundation model + instructions',
          'Add Action Groups — Lambda functions the agent can call',
          'Agent decides which actions to invoke based on user input',
          'Use for: customer service workflows, IT ops automation, multi-step procedures',
        ],
      },
      {
        title: 'Guardrails',
        bullets: [
          'Content filters — hate, violence, sexual, insults, misconduct (configurable strength)',
          'Denied topics — define topics the model must refuse',
          'PII detection + redaction — strip / block PII in inputs or outputs',
          'Word filters — blocklist specific words',
          'Apply to any Bedrock model invocation — pre + post processing',
        ],
      },
      {
        title: 'Pricing models',
        bullets: [
          'On-Demand — pay per input + output token',
          'Provisioned Throughput — reserved capacity for steady high-volume',
          'Batch — async processing of large datasets at lower per-token cost',
        ],
      },
    ],
    examTraps: [
      'Bedrock is SERVERLESS — no model hosting required (unlike SageMaker, where you host)',
      'For chat-with-documents the right answer is Bedrock Knowledge Bases (RAG) — NOT custom training',
      'For multi-step "do X then Y" workflows, Bedrock Agents — NOT raw model calls',
      'Guardrails are pre + post — applied automatically when configured',
      'Bedrock cross-region availability varies by model — check regional support',
      'Sensitive data: enable PII redaction in Guardrails before sending user input',
    ],
    cheatsheet: [
      { k: 'Model access', v: 'Claude · Llama · Titan · Mistral · Cohere · etc.',
        desc: 'One API across all. Switch models without changing app code. Cross-region inference available for some.' },
      { k: 'Knowledge Bases', v: 'Managed RAG — S3 → vector → answer',
        desc: 'Auto-chunk + embed + store. RetrieveAndGenerate API does retrieval + generation in one call.' },
      { k: 'Agents', v: 'Multi-step orchestration with function calling',
        desc: 'Lambda Action Groups give the model tools to call. Agent reasons about which tools to use.' },
      { k: 'Guardrails', v: 'Content filter · denied topics · PII redaction',
        desc: 'Apply pre + post on any model invocation. Strip PII, refuse certain topics, filter harmful content.' },
      { k: 'Vector store options', v: 'OpenSearch Serverless · Pinecone · Redis · pgvector',
        desc: 'Choose based on existing infra. OpenSearch Serverless is the AWS-native default.' },
      { k: 'Pricing', v: 'Per input + output token',
        desc: 'Larger models cost more per token. Use small model + RAG to beat large model on cost AND accuracy.' },
      { k: 'Provisioned Throughput', v: 'Reserved for steady high-volume',
        desc: '1-month or 6-month commit. Lower per-token cost but pay even when idle. For consistent production traffic.' },
      { k: 'Batch processing', v: 'Async bulk inference',
        desc: 'Up to 50% cheaper than on-demand. Submit batches, receive results when done. Good for nightly ML jobs.' },
    ],
    flashcards: [
      { q: 'Build a chatbot answering questions about internal S3 docs?', a: 'Bedrock Knowledge Bases (managed RAG)' },
      { q: 'Need multi-step workflow ("look up customer, then refund")?', a: 'Bedrock Agents with Action Groups' },
      { q: 'Strip PII from user inputs before sending to model?', a: 'Bedrock Guardrails with PII redaction' },
      { q: 'Cheapest pricing for bulk async inference?', a: 'Bedrock Batch processing' },
      { q: 'Need steady production throughput on a foundation model?', a: 'Provisioned Throughput (reserved capacity)' },
    ],
    resources: [
      { label: 'Bedrock User Guide', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html' },
      { label: 'Knowledge Bases', url: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html' },
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  migration: {
    title: 'AWS Migration Services',
    subtitle: 'DataSync · DMS · Snow Family · Storage Gateway · Application Migration',
    estReadMin: 7,
    overview: `AWS has a suite of services for moving data + workloads from on-prem (or another cloud) to AWS. Pick based on data size, network bandwidth, downtime tolerance, source/target type, and whether you need ongoing replication. The exam tests choosing the right tool more than the deep mechanics of each.`,
    sections: [
      {
        title: 'Pick the right migration tool',
        table: {
          headers: ['Need', 'Service'],
          rows: [
            ['Sync files NFS/SMB → S3/EFS/FSx at high speed', 'AWS DataSync'],
            ['Migrate database (with ongoing CDC)', 'AWS Database Migration Service (DMS)'],
            ['Heterogeneous DB (Oracle→Postgres) schema convert', 'AWS Schema Conversion Tool (SCT)'],
            ['Ship PB of data (no bandwidth)', 'Snowball Edge / Snowmobile'],
            ['Hybrid storage extension on-prem', 'Storage Gateway (File / Volume / Tape)'],
            ['Lift-and-shift servers to EC2', 'AWS Application Migration Service (MGN)'],
            ['Containerise on-prem apps to ECS/EKS', 'AWS App2Container'],
            ['Migrate VMware to EC2', 'VMware Cloud on AWS or MGN'],
          ],
        },
      },
      {
        title: 'DataSync',
        bullets: [
          'Agent on-prem connects to NFS / SMB / HDFS / object',
          'Targets: S3, EFS, FSx, other on-prem locations',
          'High-speed: ~10× faster than open-source tools, with checksums + retry',
          'Scheduled or on-demand tasks',
          'Bandwidth throttling + filters per task',
        ],
      },
      {
        title: 'DMS + SCT',
        bullets: [
          'DMS — replicates source → target DB with full-load + continuous CDC',
          'Supports homogeneous (Postgres → Postgres) AND heterogeneous (Oracle → Postgres)',
          'SCT — converts SCHEMA + stored procs for heterogeneous migrations',
          'Cutover with minimal downtime: full load + CDC replicates ongoing changes',
          'DMS Serverless — pay per usage, auto-scales DCU',
        ],
      },
      {
        title: 'Snow Family',
        table: {
          headers: ['Device', 'Capacity', 'Use'],
          rows: [
            ['Snowcone', '~8 TB', 'Small data + edge compute (ruggedised, portable)'],
            ['Snowball Edge', '~80 TB usable', 'Mid-scale data + on-board EC2 compute'],
            ['Snowmobile (deprecated 2024)', '100 PB', 'Exabyte-scale (legacy)'],
          ],
        },
      },
      {
        title: 'Storage Gateway',
        bullets: [
          'File Gateway — NFS / SMB front-end backed by S3',
          'Volume Gateway — iSCSI block storage backed by S3 (cached or stored mode)',
          'Tape Gateway — VTL for backup software, backed by S3 / Glacier',
          'Use for hybrid storage extension without full migration',
        ],
      },
      {
        title: 'Application Migration Service (MGN)',
        bullets: [
          'Lift-and-shift physical / virtual servers to EC2',
          'Continuous replication during migration window',
          'Cutover with minimal downtime by booting EC2 from replicated EBS',
          'Replaces the older CloudEndure Migration service',
        ],
      },
    ],
    examTraps: [
      'Snowball Edge for ONE-SHOT bulk data; DataSync for ongoing/scheduled sync',
      'DMS handles ONGOING REPLICATION (CDC) — Snowball is one-shot only',
      'SCT vs DMS: SCT converts SCHEMA; DMS moves DATA. Use SCT + DMS together for heterogeneous DB migration',
      'File Gateway is for ongoing hybrid access; DataSync is for migration / bulk sync',
      'MGN replaced CloudEndure Migration — pick MGN on the exam',
      'Snowmobile (the truck) was deprecated in 2024 — use Snowball Edge in large quantities instead',
    ],
    cheatsheet: [
      { k: 'DataSync', v: 'High-speed scheduled file sync',
        desc: 'Right answer for "sync on-prem NFS/SMB to S3/EFS/FSx with bandwidth control + checksums".' },
      { k: 'DMS', v: 'DB migration with CDC',
        desc: 'Full load + ongoing CDC. Minimal downtime cutover. Heterogeneous needs SCT for schema first.' },
      { k: 'SCT', v: 'Schema + stored proc conversion',
        desc: 'Oracle → Postgres, SQL Server → MySQL, etc. Generates assessment reports for migration effort.' },
      { k: 'Snowball Edge', v: 'PB-scale one-shot transfer',
        desc: 'Ship physical device. Faster than internet for >50 TB. Includes EC2 compute on the device.' },
      { k: 'Storage Gateway', v: 'Hybrid storage extension',
        desc: 'File / Volume / Tape modes. Not migration — ongoing hybrid access where on-prem stays.' },
      { k: 'Application Migration Svc (MGN)', v: 'Lift-and-shift servers → EC2',
        desc: 'Continuous block-level replication. Cutover boots EC2 from replicated EBS. Minimal downtime.' },
      { k: 'App2Container', v: 'Containerise existing apps → ECS/EKS',
        desc: 'Discover, analyse, containerise Java + .NET apps without rewriting code.' },
      { k: 'Snowmobile DEPRECATED', v: 'Use Snowball Edge in bulk',
        desc: 'The 100 PB truck was retired in 2024. For exabyte migrations, use many Snowball Edges in parallel.' },
    ],
    flashcards: [
      { q: 'Migrate Oracle on-prem → Aurora Postgres with minimal downtime?', a: 'SCT for schema + DMS with CDC for data' },
      { q: 'Ship 500 TB from data center with poor internet?', a: 'Snowball Edge devices (multiple, ship + ingest)' },
      { q: 'Sync 200 TB from NFS to S3 over DX?', a: 'AWS DataSync agent' },
      { q: 'Lift-and-shift 50 physical Linux servers to EC2?', a: 'AWS Application Migration Service (MGN)' },
      { q: 'Need on-prem app to access S3 as NFS?', a: 'Storage Gateway File Gateway' },
    ],
    resources: [
      { label: 'AWS Migration Hub', url: 'https://docs.aws.amazon.com/migrationhub/latest/ug/whatishub.html' },
      { label: 'DataSync', url: 'https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html' },
      { label: 'DMS', url: 'https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html' },
    ],
  },
};

export const TOPIC_STUDY_GUIDES = { ...BASE_GUIDES, ...TOPIC_STUDY_GUIDES_FILL };
