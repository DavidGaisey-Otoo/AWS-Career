/**
 * fixtures.js — 8 realistic test scenarios spanning typical SAA-grade
 * project types. Each defines what a senior architect would flag.
 *
 * The `expectedRules` are concrete ruleIds we EXPECT to fire. If they
 * don't, the corresponding agent has a gap.
 *
 * Sourced from real AWS Well-Architected reviews + post-mortems I've
 * seen + known-bad patterns documented by AWS Support.
 */

export const SCENARIOS = [
  // ════════════════════════════════════════════════════════════════
  // 1. PCI-DSS e-commerce platform
  // ════════════════════════════════════════════════════════════════
  {
    id: 'pci-ecommerce',
    name: 'PCI-DSS e-commerce, UK retail, 50K concurrent',
    brief: `Build a production e-commerce platform for a UK retail client.
    PCI-DSS scope — processes card payments. GDPR compliance required.
    50,000 concurrent users at peak. 1M+ product SKUs. Real-time inventory.
    Multi-region (UK + Ireland for failover). 5-year order history retention.
    ML-driven product recommendations. Customer support live chat. Production launch in 6 weeks.`,
    services: ['alb', 'ec2', 'lambda', 'dynamodb', 'aurora', 's3', 'cloudfront', 'cognito', 'sqs', 'cloudwatch', 'vpc'],
    region: 'eu-west-2',
    level: 'intermediate',
    expectedRules: [
      'COMPLIANCE-KMS-001',       // PCI without KMS
      'COMPLIANCE-CT-001',        // PCI without CloudTrail
      'COMP-PCI-WAF-001',         // PCI without WAF
      'COMP-PCI-CRM-001',         // PCI Customer Responsibility Matrix
      'COMP-PCI-SEGMENT-001',     // PCI scope segmentation
      'DB-AZ-001',                // Production RDS no Multi-AZ
      'DB-BACKUP-001',            // No PITR
      'NET-VPCEP-S3-001',         // S3 + Lambda in VPC, no endpoint
      'NET-VPCEP-DDB-001',        // DDB + Lambda in VPC, no endpoint
      'COST-ALERTS-001',          // Production no billing alerts
      'STORAGE-S3-VER-001',       // Production S3 no versioning
      'PERF-DDB-HOT-001',         // 1M SKUs high cardinality
      'ARCH-MULTIREGION-001',     // Multi-region pattern needs Route 53 failover
      'COMP-GDPR-DPA-001',        // GDPR needs DPA
      'SEC-API-AUTH-001',         // Cognito present but API auth not specified
    ],
    shouldNotFire: [
      'COMP-GDPR-REGION-001',     // eu-west-2 IS EU
      'COMP-HIPAA-BAA-001',       // Not HIPAA
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 2. HIPAA healthcare data platform
  // ════════════════════════════════════════════════════════════════
  {
    id: 'hipaa-healthcare',
    name: 'HIPAA healthcare PHI lake + analytics',
    brief: `Build a HIPAA-compliant patient health data platform for a US
    healthcare provider. Store PHI (medical records, lab results, imaging metadata).
    Production workload. Multi-AZ required. ML for clinical decision support.
    Encryption at rest + in transit mandatory. CloudTrail audit logging required.
    Multi-region disaster recovery (us-east-1 primary, us-west-2 standby).`,
    services: ['rds', 's3', 'lambda', 'sagemaker', 'cognito', 'vpc'],
    region: 'us-east-1',
    level: 'senior',
    expectedRules: [
      'COMP-HIPAA-BAA-001',       // HIPAA needs BAA
      'COMP-HIPAA-SVC-001',       // HIPAA service eligibility
      'COMPLIANCE-KMS-001',       // HIPAA without KMS in services list
      'COMPLIANCE-CT-001',        // HIPAA without CloudTrail
      'DB-AZ-001',                // RDS Multi-AZ for production
      'DB-BACKUP-001',            // No PITR mentioned
      'REL-DR-001',               // DR strategy
      'S3-ENCRYPT-001',           // Production S3 without explicit encryption
      'STORAGE-S3-VER-001',       // No versioning
    ],
    shouldNotFire: [
      'COMP-GDPR-REGION-001',     // Not GDPR
      'COMP-PCI-WAF-001',         // Not PCI
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 3. Real-time IoT high-throughput pipeline
  // ════════════════════════════════════════════════════════════════
  {
    id: 'iot-pipeline',
    name: 'IoT 1M devices, 10K events/sec real-time pipeline',
    brief: `Build a real-time IoT data pipeline. 1 million connected devices
    sending telemetry. Peak 10,000 events per second. Process events, store
    aggregates, alert on anomalies. Production workload.`,
    services: ['lambda', 'kinesis', 'dynamodb', 's3', 'cloudwatch'],
    region: 'us-east-1',
    level: 'intermediate',
    expectedRules: [
      'PERF-DDB-HOT-001',         // 1M devices = hot partition risk
      'PERF-LAMBDA-CONCURRENCY-001', // 10K/sec exceeds default Lambda concurrency
      'COST-ALERTS-001',
      'STORAGE-S3-VER-001',
      'REL-DR-001',               // No DR mentioned
    ],
    shouldNotFire: [
      'COMP-HIPAA-BAA-001',
      'COMP-PCI-WAF-001',
      'DB-AZ-001',                // No RDS in services
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 4. ML training + inference pipeline
  // ════════════════════════════════════════════════════════════════
  {
    id: 'ml-pipeline',
    name: 'ML training + inference pipeline, long-running',
    brief: `Build an ML pipeline: nightly model training on 100GB datasets
    (long-running batch jobs), then deploy models for real-time inference.
    Production workload.`,
    services: ['lambda', 's3', 'sagemaker', 'ec2'],
    region: 'us-east-1',
    level: 'intermediate',
    expectedRules: [
      'COMPUTE-LAMBDA-TIMEOUT-001', // Lambda for ML training = 15-min timeout problem
      'COST-ALERTS-001',
      'STORAGE-S3-VER-001',
      'PERF-COLD-START-001',
      'COMPUTE-ASG-001',          // EC2 without ASG
    ],
    shouldNotFire: [
      'COMP-PCI-WAF-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 5. Mobile backend, high concurrency, cost-sensitive startup
  // ════════════════════════════════════════════════════════════════
  {
    id: 'mobile-backend',
    name: 'Mobile backend, $5K/mo budget, 100K MAU',
    brief: `Build a mobile app backend for a startup. 100K MAU, expecting
    spiky traffic. Budget: $5,000/month max. Production.`,
    services: ['lambda', 'apigateway', 'dynamodb', 'cognito', 's3', 'cloudfront'],
    region: 'us-east-1',
    level: 'beginner',
    expectedRules: [
      'COST-ALERTS-001',
      'STORAGE-S3-VER-001',
      'NET-WAF-001',              // CloudFront production without WAF
      'COST-SAVINGS-PLANS-001',   // Production should consider Savings Plans
    ],
    shouldNotFire: [
      'COMP-HIPAA-BAA-001',
      'COMP-PCI-WAF-001',
      'DB-AZ-001',                // No RDS
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 6. Multi-region active-active for resilience
  // ════════════════════════════════════════════════════════════════
  {
    id: 'multi-region-aa',
    name: 'Multi-region active-active SaaS',
    brief: `SaaS application requires 99.99% SLA. Multi-region active-active.
    Production. EU customers and US users. GDPR compliance required. Real-time data sync.`,
    services: ['route53', 'aurora', 'cloudfront', 'lambda', 's3', 'cloudwatch'],
    region: 'eu-west-1',
    level: 'senior',
    expectedRules: [
      'REL-DR-001',               // DR strategy needs explicit
      'DB-AURORA-GLOBAL-001',     // Multi-region Aurora needs Global DB
      'ARCH-MULTIREGION-001',     // Route 53 failover pattern
      'COMP-GDPR-DPA-001',        // EU customer data
      'STORAGE-S3-CRR-001',       // Multi-region needs CRR
    ],
    shouldNotFire: [
      'COMP-GDPR-REGION-001',     // eu-west-1 IS EU
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 7. Hybrid cloud + on-prem integration
  // ════════════════════════════════════════════════════════════════
  {
    id: 'hybrid-cloud',
    name: 'Hybrid cloud integration, on-prem datacenter',
    brief: `Connect 3 on-prem datacenters to AWS. Need consistent network,
    private connectivity, DNS resolution both ways. Production. 10 Gbps
    sustained bandwidth.`,
    services: ['vpc', 'route53', 'lambda', 'ec2'],
    region: 'us-east-1',
    level: 'senior',
    expectedRules: [
      'NET-TGW-001',              // Hub-and-spoke pattern needed
      'NET-DIRECT-CONNECT-001',   // 10 Gbps sustained = Direct Connect
      'NET-DNS-RESOLVER-001',     // Two-way DNS = Route 53 Resolver
      'REL-DR-001',
    ],
    shouldNotFire: [
      'COMP-HIPAA-BAA-001',
      'COMP-PCI-WAF-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 8. Beginner first AWS project — Free Tier
  // ════════════════════════════════════════════════════════════════
  {
    id: 'beginner-freetier',
    name: 'Beginner first project, Free Tier focus',
    brief: `Beginner building first AWS project. Simple static website with
    a contact form. Want to stay on Free Tier. Demo for portfolio.`,
    services: ['s3', 'cloudfront', 'lambda', 'dynamodb'],
    region: 'eu-west-1',
    level: 'beginner',
    expectedRules: [
      'COST-FREETIER-AWARENESS-001', // Beginner-tier reminder
    ],
    shouldNotFire: [
      'DB-AZ-001',                // Not production
      'COMPLIANCE-KMS-001',       // No compliance
      'COMP-HIPAA-BAA-001',
      'COMP-PCI-WAF-001',
      'NET-NAT-AZ-001',           // No NAT mentioned
      'COMPUTE-LAMBDA-TIMEOUT-001',
    ],
  },
];
