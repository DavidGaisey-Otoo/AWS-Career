/**
 * awsPricing.js — PJ-03 simplified AWS pricing model.
 *
 * Per-service free-tier limits + typical after-free-tier monthly cost
 * range. Numbers are based on AWS public us-east-1 pricing (Jan 2026)
 * and a typical "personal portfolio project" usage profile.
 *
 * NOT meant to replace AWS Pricing Calculator — this is for honest
 * order-of-magnitude estimates ("$0 vs $5 vs $50/month") so beginners
 * don't get surprised by bills.
 *
 * Shape per service:
 *   {
 *     freeTier: {
 *       headline: '1M requests / month always free',
 *       limit: '...',
 *       alwaysFree: boolean (true = forever; false = 12 months from signup)
 *     },
 *     afterFreeTier: {
 *       low: <number $/month for low usage>,
 *       high: <number $/month for low-mid usage>,
 *       unit: 'human-readable pricing detail',
 *       explanation: 'plain-english of how AWS charges'
 *     },
 *     freeTierTips: ['actionable tips to stay free'],
 *   }
 */

export const REGION_MULTIPLIERS = {
  'us-east-1':      1.00,
  'us-east-2':      1.00,
  'us-west-1':      1.05,
  'us-west-2':      1.00,
  'eu-west-1':      1.05,
  'eu-west-2':      1.08,
  'eu-west-3':      1.10,
  'eu-central-1':   1.08,
  'eu-north-1':     0.98,
  'eu-south-1':     1.10,
  'ap-northeast-1': 1.15,
  'ap-northeast-2': 1.12,
  'ap-southeast-1': 1.12,
  'ap-southeast-2': 1.15,
  'ap-south-1':     1.00,
  'sa-east-1':      1.25,
  'ca-central-1':   1.05,
  'me-south-1':     1.20,
  'af-south-1':     1.18,
};

export const REGION_LABELS = {
  'us-east-1':      'US East (N. Virginia)',
  'us-east-2':      'US East (Ohio)',
  'us-west-1':      'US West (N. California)',
  'us-west-2':      'US West (Oregon)',
  'eu-west-1':      'EU (Ireland)',
  'eu-west-2':      'EU (London)',
  'eu-west-3':      'EU (Paris)',
  'eu-central-1':   'EU (Frankfurt)',
  'eu-north-1':     'EU (Stockholm)',
  'eu-south-1':     'EU (Milan)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'ap-northeast-2': 'Asia Pacific (Seoul)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-southeast-2': 'Asia Pacific (Sydney)',
  'ap-south-1':     'Asia Pacific (Mumbai)',
  'sa-east-1':      'South America (São Paulo)',
  'ca-central-1':   'Canada (Central)',
  'me-south-1':     'Middle East (Bahrain)',
  'af-south-1':     'Africa (Cape Town)',
};

// ════════════════════════════════════════════════════════════════════
// SERVICE PRICING
// ════════════════════════════════════════════════════════════════════
export const SERVICE_PRICING = {
  // Compute
  ec2: {
    label: 'EC2',
    freeTier: {
      headline: '750 hrs/month t2.micro or t3.micro · 12 months',
      limit: '750 hrs ≈ one always-on small instance for a year',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 7, high: 18,
      unit: 't3.micro on-demand: $0.0104/hr · ~$7.50/mo if always-on',
      explanation: 'Pay per second the instance runs (min 60s). Stopping the instance stops compute charges, but EBS storage still bills.',
    },
    freeTierTips: [
      'Stop EC2 when not in use — only billed while running',
      'Use t3.micro (smaller burstable type) for dev/learning',
      'Terminate (not just stop) unused instances to avoid EBS storage costs',
    ],
  },
  ebs: {
    label: 'EBS',
    freeTier: {
      headline: '30 GB gp2 storage · 12 months',
      limit: '30 GB of general SSD storage',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 1, high: 8,
      unit: 'gp3: $0.08/GB-month · 30 GB ≈ $2.40/mo',
      explanation: 'Pay for provisioned storage (not used) by the GB-month, plus IOPS and throughput beyond gp3 baseline.',
    },
    freeTierTips: [
      'Delete EBS volumes when terminating an instance (untick "Delete on termination" is dangerous after)',
      'Use snapshots sparingly — they cost ~$0.05/GB/mo and accumulate',
    ],
  },
  s3: {
    label: 'S3',
    freeTier: {
      headline: '5 GB Standard storage · 20k GET · 2k PUT/mo · 12 months',
      limit: '5 GB + light traffic — enough for a small static site',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 0.5, high: 5,
      unit: 'Standard: $0.023/GB-mo + $0.0004/1k GET + $0.005/1k PUT',
      explanation: 'Storage is per GB-month. Requests cost per thousand. Data transfer OUT is the bigger bill — first 100 GB/mo free.',
    },
    freeTierTips: [
      'Lifecycle move cold objects to Glacier Deep Archive ($0.00099/GB/mo)',
      'Use CloudFront in front to reduce S3 data-transfer charges',
      'Enable Intelligent-Tiering for unknown access patterns',
    ],
  },
  lambda: {
    label: 'Lambda',
    freeTier: {
      headline: '1M requests + 400k GB-seconds / month — ALWAYS FREE',
      limit: 'Enough for a small API or batch job',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 3,
      unit: '$0.20 per 1M requests + $0.0000166667 per GB-second',
      explanation: 'After free tier: pennies per million invocations. Memory × duration drives the bigger charge.',
    },
    freeTierTips: [
      'Right-size memory — bigger is faster but costs proportionally more per GB-second',
      'Cache values in INIT phase to avoid re-fetching on every invocation',
      'Use Lambda Destinations instead of polling',
    ],
  },
  fargate: {
    label: 'Fargate',
    freeTier: {
      headline: 'No free tier',
      limit: 'Pay per task vCPU + memory hour from minute 1',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 5, high: 30,
      unit: '$0.04048 per vCPU-hr + $0.004445 per GB-hr',
      explanation: '0.25 vCPU + 0.5 GB always-on task ≈ $9/mo. Stop tasks when not needed.',
    },
    freeTierTips: [
      'Use Fargate Spot for non-critical workloads (~70% discount)',
      'Scale down to 0 tasks when idle',
      'For very low traffic, consider Lambda instead',
    ],
  },
  ecs: {
    label: 'ECS',
    freeTier: {
      headline: 'ECS control plane is FREE — pay only for underlying compute',
      limit: 'Control plane always free; EC2 or Fargate billed separately',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 0,
      unit: 'Pay for the EC2 instances or Fargate tasks ECS runs',
      explanation: 'ECS itself costs nothing. Your bill comes from the EC2/Fargate compute behind your tasks.',
    },
    freeTierTips: [
      'Right-size tasks based on actual CPU/memory usage',
      'Use Fargate Spot or EC2 Spot for cost-tolerant workloads',
    ],
  },
  eks: {
    label: 'EKS',
    freeTier: {
      headline: 'No free tier for control plane',
      limit: '$0.10/hour per cluster ≈ $73/month regardless of pod count',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 73, high: 200,
      unit: '$0.10/hr control plane + EC2/Fargate worker costs',
      explanation: 'EKS adds a flat $73/mo just for the managed control plane. Worker nodes (EC2 or Fargate) billed separately.',
    },
    freeTierTips: [
      'Use ECS instead for AWS-only workloads — no control plane charge',
      'Don\'t spin up EKS clusters for short experiments — flat fee runs',
      'Use Karpenter + Spot to cut worker costs',
    ],
  },
  asg: {
    label: 'Auto Scaling',
    freeTier: {
      headline: 'ASG itself is FREE',
      limit: 'You only pay for the EC2 instances it manages',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 0,
      unit: 'No charge for ASG — only the EC2s it provisions',
      explanation: 'ASG orchestrates; instances cost. Use Spot in the mix to save up to 90%.',
    },
    freeTierTips: ['Combine On-Demand baseline + Spot for 50%+ savings'],
  },

  // Database
  rds: {
    label: 'RDS',
    freeTier: {
      headline: '750 hrs db.t2.micro/t3.micro · 20 GB storage · 12 months',
      limit: 'One always-on small DB for a year',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 15, high: 50,
      unit: 'db.t3.micro: $0.018/hr ≈ $13/mo + $0.115/GB-mo storage',
      explanation: 'Charged per hour the DB is running (always-on by design) + storage + backup storage + IOPS.',
    },
    freeTierTips: [
      'Use Aurora Serverless v2 for variable workloads — pay per ACU-second',
      'Stop dev/staging RDS instances overnight to save 60%+',
      'Use Multi-AZ ONLY for production — doubles cost',
    ],
  },
  aurora: {
    label: 'Aurora',
    freeTier: {
      headline: 'No free tier (RDS free tier doesn\'t cover Aurora)',
      limit: 'Pay from minute 1',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 50, high: 150,
      unit: 'db.t4g.medium: $0.073/hr ≈ $53/mo + $0.10/GB storage + $0.20/M I/O',
      explanation: 'Higher base cost than RDS but better performance + features. Serverless v2 scales to fractional ACUs.',
    },
    freeTierTips: [
      'Use Aurora Serverless v2 with min 0.5 ACU — pay only what you use',
      'I/O-Optimised editions: flat I/O pricing for I/O-heavy workloads',
    ],
  },
  dynamodb: {
    label: 'DynamoDB',
    freeTier: {
      headline: '25 GB storage + 25 RCU + 25 WCU — ALWAYS FREE',
      limit: 'Enough for small apps with light reads/writes',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 5,
      unit: 'On-Demand: $1.25/M writes + $0.25/M reads + $0.25/GB-mo',
      explanation: 'Pay per request (On-Demand) or per provisioned RCU/WCU. Most personal apps stay in free tier.',
    },
    freeTierTips: [
      'Use On-Demand mode for low/unknown traffic',
      'Enable TTL to auto-delete old items + reduce storage',
      'PITR adds 20% to storage cost — only enable when needed',
    ],
  },
  elasticache: {
    label: 'ElastiCache',
    freeTier: {
      headline: '750 hrs cache.t2.micro/t3.micro · 12 months',
      limit: 'One always-on small cache for a year',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 12, high: 40,
      unit: 'cache.t3.micro: $0.017/hr ≈ $12/mo per node',
      explanation: 'Per-node hourly charge. Multi-AZ + replicas multiply by node count.',
    },
    freeTierTips: ['Use Serverless ElastiCache for variable loads'],
  },

  // Networking
  vpc: {
    label: 'VPC',
    freeTier: {
      headline: 'VPC itself is FREE',
      limit: 'Subnets, route tables, IGW, security groups, NACLs all free',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 0,
      unit: 'Free — only NAT Gateway, VPC Endpoints (Interface), VPN, DX cost extra',
      explanation: 'VPC primitives are free. The costly things are NAT Gateway ($32+/mo) and Interface Endpoints ($0.01/hr each per AZ).',
    },
    freeTierTips: [
      'Use S3/DynamoDB Gateway Endpoints (free) instead of NAT for those services',
      'Skip NAT Gateway for dev — use NAT Instance on t4g.nano (~$3/mo)',
    ],
  },
  'nat-gateway': {
    label: 'NAT Gateway',
    freeTier: { headline: 'No free tier', limit: 'Pay from minute 1', alwaysFree: false },
    afterFreeTier: {
      low: 32, high: 50,
      unit: '$0.045/hr ≈ $32/mo + $0.045/GB processed',
      explanation: 'Hourly cost + data processing fee. Adds up fast for chatty private subnets.',
    },
    freeTierTips: [
      'Use NAT Instance on t4g.nano for dev (~$3/mo)',
      'S3 + DynamoDB traffic → Gateway Endpoint (free)',
    ],
  },
  cloudfront: {
    label: 'CloudFront',
    freeTier: {
      headline: '1 TB data out + 10M requests/month — 12 months',
      limit: 'Enough for a small public website',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 0, high: 5,
      unit: '$0.085/GB out (US/EU) + $0.0075 per 10k HTTPS requests',
      explanation: 'Pay per GB of cached data delivered + per request. Cheaper than serving directly from S3 for repeat visitors.',
    },
    freeTierTips: [
      'Use Price Class 100 (US/EU only) for 30% savings if your users are there',
      'Set long cache TTL on static assets to maximise cache hits',
    ],
  },
  route53: {
    label: 'Route 53',
    freeTier: { headline: 'No free tier', limit: '$0.50/hosted zone/mo', alwaysFree: false },
    afterFreeTier: {
      low: 0.5, high: 3,
      unit: '$0.50/hosted zone/mo + $0.40 per million queries',
      explanation: 'Cheap. One domain ≈ $0.50/mo + tiny query cost.',
    },
    freeTierTips: ['Use Route 53 Alias records (free) instead of CNAMEs'],
  },
  alb: {
    label: 'ALB',
    freeTier: {
      headline: '750 hrs ALB or NLB · 12 months',
      limit: 'One always-on load balancer for a year',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 16, high: 25,
      unit: 'ALB: $0.0225/hr ≈ $16/mo + $0.008 per LCU-hr',
      explanation: 'Hourly charge + Load Balancer Capacity Units based on traffic.',
    },
    freeTierTips: [
      'Share one ALB across multiple services via path-based routing',
      'For dev environments, use NLB (cheaper LCU pricing) when L7 isn\'t needed',
    ],
  },
  nlb: {
    label: 'NLB',
    freeTier: { headline: '750 hrs ALB/NLB free · 12 months', limit: 'Shared with ALB', alwaysFree: false },
    afterFreeTier: {
      low: 16, high: 22,
      unit: 'NLB: $0.0225/hr ≈ $16/mo + $0.006 per NLCU-hr',
      explanation: 'Similar base cost as ALB; cheaper per-unit pricing for raw throughput.',
    },
    freeTierTips: ['Use only when you need static IP or L4/UDP'],
  },
  apigateway: {
    label: 'API Gateway',
    freeTier: {
      headline: '1M REST calls or 1M HTTP API calls/month · 12 months',
      limit: 'Enough for small APIs',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 0, high: 4,
      unit: 'HTTP API: $1 per million calls · REST: $3.50 per million',
      explanation: 'HTTP API is the cheaper modern choice. REST API has more features (caching, request validation).',
    },
    freeTierTips: [
      'Use HTTP API (cheaper) unless you need REST-specific features',
      'Enable caching on REST API only if hit rate justifies it',
    ],
  },
  sqs: {
    label: 'SQS',
    freeTier: {
      headline: '1M requests/month — ALWAYS FREE',
      limit: 'Per region per month',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 2,
      unit: '$0.40 per million Standard requests, $0.50 per million FIFO',
      explanation: 'Each API call (send, receive, delete) counts as one request. Batching reduces cost.',
    },
    freeTierTips: [
      'Enable long polling (ReceiveMessageWaitTimeSeconds=20) to reduce empty receives',
      'Batch operations (SendMessageBatch, ReceiveMessage MaxNumberOfMessages=10)',
    ],
  },
  sns: {
    label: 'SNS',
    freeTier: {
      headline: '1M publishes + 100k email + 1k push — ALWAYS FREE',
      limit: 'Plus HTTP/SQS subscriptions free at low volume',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 2,
      unit: '$0.50 per million publishes + ~$0.0006/email + $0.00645/SMS (varies by country)',
      explanation: 'SMS pricing varies WILDLY by country — set spending limits early.',
    },
    freeTierTips: [
      'SET SMS SPENDING LIMIT in SNS preferences before going live',
      'Use Email/Lambda subscriptions instead of SMS where possible',
    ],
  },
  eventbridge: {
    label: 'EventBridge',
    freeTier: {
      headline: 'AWS-service events FREE always · custom events 1M free',
      limit: 'Most personal projects stay in free tier',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 2,
      unit: '$1 per million custom events · Schema Registry 5M discoveries free/mo',
      explanation: 'AWS-service events are always free. Custom + Partner events have per-million pricing.',
    },
    freeTierTips: ['Use AWS-service events (e.g. S3 → EventBridge) instead of polling'],
  },
  step: {
    label: 'Step Functions',
    freeTier: {
      headline: '4000 Standard state transitions/month — ALWAYS FREE',
      limit: 'Plenty for personal workflows',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 5,
      unit: 'Standard: $25 per million state transitions · Express: $1 per million + duration',
      explanation: 'Standard workflows charge per state transition (could be expensive). Express workflows are cheaper at high volume.',
    },
    freeTierTips: [
      'Use Express workflows for high-throughput short tasks',
      'Reduce state transitions by combining work into fewer states',
    ],
  },

  // Security
  iam: {
    label: 'IAM',
    freeTier: { headline: 'Always FREE', limit: 'No charge for users/roles/policies', alwaysFree: true },
    afterFreeTier: { low: 0, high: 0, unit: 'Free — only what you DO via IAM costs (API calls to other services)', explanation: 'IAM itself never charges.' },
    freeTierTips: ['Prefer roles over IAM users for apps to avoid credential rotation pain'],
  },
  kms: {
    label: 'KMS',
    freeTier: {
      headline: '20k requests/month — ALWAYS FREE',
      limit: 'Plus AWS-managed keys are always free',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 1, high: 5,
      unit: '$1/key/month + $0.03 per 10k requests',
      explanation: 'Customer-managed keys cost $1/mo each. AWS-managed keys are free. Use S3 Bucket Keys to slash KMS calls 99%.',
    },
    freeTierTips: [
      'Use AWS-managed keys (free) unless you need fine-grained control',
      'Enable S3 Bucket Keys — reduces SSE-KMS calls 99%',
    ],
  },
  secretsmgr: {
    label: 'Secrets Manager',
    freeTier: { headline: '30-day free trial per secret', limit: 'After trial: $0.40/secret/month', alwaysFree: false },
    afterFreeTier: {
      low: 0.4, high: 2,
      unit: '$0.40/secret/mo + $0.05 per 10k API calls',
      explanation: 'Per-secret monthly fee. For non-rotating values, use SSM Parameter Store (free Standard tier).',
    },
    freeTierTips: [
      'Use Parameter Store (free Standard tier) for non-rotating config',
      'Cache secrets in Lambda init to reduce API calls',
    ],
  },
  waf: {
    label: 'WAF',
    freeTier: { headline: 'No free tier', limit: '$5/Web ACL/mo minimum', alwaysFree: false },
    afterFreeTier: {
      low: 5, high: 20,
      unit: '$5/Web ACL/mo + $1/rule/mo + $0.60 per million requests',
      explanation: 'Per Web ACL + per rule + per million requests. Managed rule groups have their own per-month fees.',
    },
    freeTierTips: [
      'Skip WAF for personal projects — Shield Standard auto-protects against most attacks',
      'Use COUNT action to test rules without per-request charges',
    ],
  },
  shield: {
    label: 'Shield Standard',
    freeTier: { headline: 'Shield Standard is ALWAYS FREE for everyone', limit: 'Automatic on CloudFront/R53/ELB/GA', alwaysFree: true },
    afterFreeTier: { low: 0, high: 0, unit: 'Free — Advanced is $3000/mo per Organization', explanation: 'Standard is automatic + free; only Shield Advanced costs money.' },
    freeTierTips: ['You already have it — no action needed'],
  },
  acm: {
    label: 'ACM',
    freeTier: { headline: 'Public certs are ALWAYS FREE', limit: 'Auto-renewed', alwaysFree: true },
    afterFreeTier: { low: 0, high: 0, unit: 'Public certs free · Private CA $400/mo if used', explanation: 'Public SSL certs are free + auto-renewed. Private CA is a paid feature.' },
    freeTierTips: ['Use ACM cert on CloudFront/ALB — free HTTPS everywhere'],
  },
  cognito: {
    label: 'Cognito',
    freeTier: {
      headline: '50k monthly active users — ALWAYS FREE',
      limit: 'For User Pool sign-in',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 5,
      unit: '$0.0055/MAU after free tier (next 50k)',
      explanation: 'Generous free tier covers most personal/portfolio apps.',
    },
    freeTierTips: ['Use Cognito over a custom auth system — free at small scale'],
  },

  // Monitoring + observability
  cloudwatch: {
    label: 'CloudWatch',
    freeTier: {
      headline: '10 metrics + 1M API + 5 GB logs + 3 dashboards — ALWAYS FREE',
      limit: 'Per region',
      alwaysFree: true,
    },
    afterFreeTier: {
      low: 0, high: 5,
      unit: '$0.30/metric/mo · $0.50/GB log ingestion · $0.03/GB log storage',
      explanation: 'Log ingestion + storage is the usual cost driver. Default retention = FOREVER — set per-log-group retention to avoid surprise bills.',
    },
    freeTierTips: [
      'Set log retention per log group (1 day / 7 days / 30 days) — default is FOREVER',
      'Use Metric Filters sparingly — each creates a new billable metric',
    ],
  },
  cloudtrail: {
    label: 'CloudTrail',
    freeTier: { headline: 'First management-event trail FREE', limit: '90-day Event History always free', alwaysFree: true },
    afterFreeTier: {
      low: 0, high: 5,
      unit: '$2 per 100k mgmt events (2nd+ trail) · $0.10 per 100k data events',
      explanation: 'First mgmt-event trail is free. Data events (S3 GetObject, Lambda Invoke) are paid + opt-in.',
    },
    freeTierTips: ['Keep your first trail (free) + enable Data Events sparingly per critical bucket'],
  },
  config: {
    label: 'AWS Config',
    freeTier: { headline: 'No free tier', limit: 'Charges per recorded item + rule evaluation', alwaysFree: false },
    afterFreeTier: {
      low: 5, high: 30,
      unit: '$0.003/config item + $0.001 per rule evaluation',
      explanation: 'Busy accounts with many resources + rules can hit $20-50/mo easily.',
    },
    freeTierTips: [
      'Scope the recorder to specific resource types (not all)',
      'Only enable in regions you actually use',
    ],
  },

  // Analytics
  kinesis: {
    label: 'Kinesis Data Streams',
    freeTier: { headline: 'No free tier', limit: 'Pay per shard-hour from minute 1', alwaysFree: false },
    afterFreeTier: {
      low: 11, high: 50,
      unit: '$0.015 per shard-hour ≈ $11/mo per shard',
      explanation: '1 shard handles 1 MB/s ingest. Pay for shards 24/7 + retention beyond 24h + Enhanced Fan-Out.',
    },
    freeTierTips: ['Use Firehose for buffered delivery — pay per GB ingested, no shard cost'],
  },
  firehose: {
    label: 'Firehose',
    freeTier: { headline: 'No free tier', limit: 'Pay per GB ingested', alwaysFree: false },
    afterFreeTier: {
      low: 0, high: 5,
      unit: '$0.029 per GB ingested (first 500 TB) + format conversion + delivery fees',
      explanation: 'Pay per GB only — no provisioning. Parquet conversion + dynamic partitioning add small fees.',
    },
    freeTierTips: ['Use Parquet conversion + dynamic partitioning to slash downstream Athena costs'],
  },
  athena: {
    label: 'Athena',
    freeTier: { headline: 'No free tier', limit: '$5 per TB scanned', alwaysFree: false },
    afterFreeTier: {
      low: 0, high: 5,
      unit: '$5 per TB scanned (10 MB minimum per query)',
      explanation: 'Pay per query data scan. Parquet + partitioning cut bills 80-95%.',
    },
    freeTierTips: [
      'Convert data to Parquet (columnar) — 80-95% scan cost reduction',
      'Partition data by date/region in S3 prefixes',
      'Use Workgroups to enforce per-query scan limits',
    ],
  },
  glue: {
    label: 'Glue',
    freeTier: { headline: '1M Catalog requests + 1M Catalog objects FREE always', limit: 'ETL jobs are paid', alwaysFree: true },
    afterFreeTier: {
      low: 0, high: 30,
      unit: 'Spark ETL: $0.44 per DPU-hour · Python Shell: $0.44 per DPU-hour · Crawler: $0.44 per DPU-hour',
      explanation: 'Catalog is mostly free. ETL jobs cost per DPU-hour (1 DPU = 4 vCPU + 16 GB RAM).',
    },
    freeTierTips: ['Use Python Shell jobs (1/16 DPU) for light ETL — much cheaper than Spark'],
  },
  redshift: {
    label: 'Redshift',
    freeTier: { headline: '2 months free trial · dc2.large (160 GB)', limit: 'Then $0.25/hr', alwaysFree: false },
    afterFreeTier: {
      low: 180, high: 500,
      unit: 'dc2.large: $0.25/hr ≈ $180/mo · Serverless: pay per RPU-hour',
      explanation: 'Not for personal projects unless you have real analytical workloads. Use Athena instead at small scale.',
    },
    freeTierTips: [
      'Use Athena for occasional analytics on S3 (pay per scan, no cluster)',
      'Pause Redshift clusters when not in use',
    ],
  },

  // Other
  bedrock: {
    label: 'Bedrock',
    freeTier: { headline: 'No free tier for foundation models', limit: 'Pay per token', alwaysFree: false },
    afterFreeTier: {
      low: 0, high: 20,
      unit: 'Varies by model (e.g. Claude Haiku: ~$0.25/M input + $1.25/M output tokens)',
      explanation: 'Pay per input + output token. Small models (Haiku, Titan) much cheaper than large (Claude Opus, Llama 70B).',
    },
    freeTierTips: [
      'Pick the smallest model that meets your quality need',
      'Use Bedrock Knowledge Bases (RAG) to send less context per call',
      'Cache common responses on app side',
    ],
  },
  cloudformation: {
    label: 'CloudFormation',
    freeTier: { headline: 'Always FREE', limit: 'No charge for stacks/templates', alwaysFree: true },
    afterFreeTier: { low: 0, high: 0, unit: 'Free — only the resources it creates cost', explanation: 'CFN itself is free. The deployed resources cost what they normally cost.' },
    freeTierTips: ['Use DeletionPolicy: Retain on critical resources to avoid accidental loss'],
  },
  ssm: {
    label: 'SSM Parameter Store',
    freeTier: { headline: 'Standard tier FREE always', limit: '10k parameters, 4 KB max value', alwaysFree: true },
    afterFreeTier: {
      low: 0, high: 1,
      unit: 'Advanced tier: $0.05/parameter/mo · Standard: free',
      explanation: 'Standard tier covers virtually all personal use cases. Advanced only for cross-account sharing + larger values.',
    },
    freeTierTips: ['Use Parameter Store for non-rotating config (free) — Secrets Manager only for secrets needing rotation'],
  },
  ecr: {
    label: 'ECR',
    freeTier: {
      headline: '500 MB private + 50 GB public storage — 12 months',
      limit: 'Public always free at 50 GB',
      alwaysFree: false,
    },
    afterFreeTier: {
      low: 0, high: 2,
      unit: '$0.10 per GB-month',
      explanation: 'Pay for storage of container images. Public registries free at 50 GB; private 500 MB free 12 months.',
    },
    freeTierTips: ['Set ECR lifecycle policy to delete old image versions'],
  },
  efs: {
    label: 'EFS',
    freeTier: { headline: '5 GB · 12 months', limit: 'Standard storage class', alwaysFree: false },
    afterFreeTier: {
      low: 0.3, high: 5,
      unit: 'Standard: $0.30/GB-mo · Infrequent Access: $0.025/GB-mo',
      explanation: 'Pay only for what you store. IA storage class is 92% cheaper if data is rarely read.',
    },
    freeTierTips: ['Enable Lifecycle Management → move cold files to IA automatically'],
  },
  fsx: {
    label: 'FSx',
    freeTier: { headline: 'No free tier', limit: 'Multiple types: Windows, Lustre, NetApp ONTAP, OpenZFS', alwaysFree: false },
    afterFreeTier: {
      low: 60, high: 300,
      unit: 'Per storage GB-month + throughput + (Windows) AD-integration',
      explanation: 'Expensive — only for production workloads needing Windows SMB or HPC throughput.',
    },
    freeTierTips: ['Use EFS instead of FSx for Lustre unless you need HPC throughput'],
  },
  dx: {
    label: 'Direct Connect',
    freeTier: { headline: 'No free tier', limit: 'Per port-hour + data out', alwaysFree: false },
    afterFreeTier: {
      low: 30, high: 1500,
      unit: 'Hosted 50 Mbps from $30/mo · 1 Gbps dedicated ~$220/mo + data',
      explanation: 'Not a personal-project tool — enterprise hybrid networking only.',
    },
    freeTierTips: ['Use VPN over the internet instead — much cheaper for small workloads'],
  },
  tgw: {
    label: 'Transit Gateway',
    freeTier: { headline: 'No free tier', limit: 'Per attachment-hour + data', alwaysFree: false },
    afterFreeTier: {
      low: 36, high: 200,
      unit: '$0.05/attachment/hr ≈ $36/mo per attachment + data transfer',
      explanation: 'Each VPC attached costs $36/mo. Not for personal projects with <5 VPCs.',
    },
    freeTierTips: ['Use VPC Peering for 1-1 connections (free intra-region)'],
  },
  vpn: {
    label: 'Site-to-Site VPN',
    freeTier: { headline: 'No free tier', limit: 'Per tunnel-hour + data', alwaysFree: false },
    afterFreeTier: {
      low: 36, high: 50,
      unit: '$0.05/tunnel/hr ≈ $36/mo per tunnel',
      explanation: 'Cheap hybrid connectivity option. Add second tunnel for HA.',
    },
    freeTierTips: ['Use one tunnel for dev; two for production HA'],
  },
  migration: {
    label: 'Migration tools',
    freeTier: { headline: 'Most migration tools FREE during initial migration', limit: 'DataSync, DMS, MGN all have free tiers', alwaysFree: true },
    afterFreeTier: {
      low: 0, high: 20,
      unit: 'DataSync: $0.0125/GB · DMS: hourly + storage · MGN: $0.028/hr per server',
      explanation: 'Most pay per task/data only during active migration. Stop after cutover.',
    },
    freeTierTips: ['Schedule migration tools to run only during business hours'],
  },
};

// ════════════════════════════════════════════════════════════════════
// Service ID aliasing — what users / walkthroughs call them
// ════════════════════════════════════════════════════════════════════
const SERVICE_ALIASES = {
  'sns':           'sns',
  'sqs':           'sqs',
  'lambda':        'lambda',
  'fargate':       'fargate',
  'ecs':           'ecs',
  'eks':           'eks',
  's3':            's3',
  'ec2':           'ec2',
  'ebs':           'ebs',
  'rds':           'rds',
  'aurora':        'aurora',
  'dynamodb':      'dynamodb',
  'ddb':           'dynamodb',
  'dax':           'dynamodb',
  'elasticache':   'elasticache',
  'redis':         'elasticache',
  'memcached':     'elasticache',
  'vpc':           'vpc',
  'subnet':        'vpc',
  'nat':           'nat-gateway',
  'nat-gateway':   'nat-gateway',
  'cloudfront':    'cloudfront',
  'route53':       'route53',
  'route-53':      'route53',
  'alb':           'alb',
  'nlb':           'nlb',
  'apigateway':    'apigateway',
  'api-gateway':   'apigateway',
  'apigw':         'apigateway',
  'iam':           'iam',
  'kms':           'kms',
  'secrets':       'secretsmgr',
  'secretsmgr':    'secretsmgr',
  'secrets-manager': 'secretsmgr',
  'ssm':           'ssm',
  'parameter-store': 'ssm',
  'waf':           'waf',
  'shield':        'shield',
  'acm':           'acm',
  'cognito':       'cognito',
  'cloudwatch':    'cloudwatch',
  'cloudwatch-logs': 'cloudwatch',
  'cloudtrail':    'cloudtrail',
  'config':        'config',
  'kinesis':       'kinesis',
  'kinesis-data-streams': 'kinesis',
  'firehose':      'firehose',
  'athena':        'athena',
  'glue':          'glue',
  'redshift':      'redshift',
  'bedrock':       'bedrock',
  'cloudformation':'cloudformation',
  'cfn':           'cloudformation',
  'ecr':           'ecr',
  'efs':           'efs',
  'fsx':           'fsx',
  'dx':            'dx',
  'direct-connect':'dx',
  'directconnect': 'dx',
  'tgw':           'tgw',
  'transit-gateway':'tgw',
  'vpn':           'vpn',
  'asg':           'asg',
  'auto-scaling':  'asg',
  'autoscaling':   'asg',
  'step':          'step',
  'step-functions':'step',
  'eventbridge':   'eventbridge',
  'event-bus':     'eventbridge',
  'datasync':      'migration',
  'dms':           'migration',
  'snowball':      'migration',
  'mgn':           'migration',
  'storage-gateway':'migration',
};

export function resolvePricingKey(serviceId) {
  if (!serviceId) return null;
  return SERVICE_ALIASES[String(serviceId).toLowerCase()] || null;
}
