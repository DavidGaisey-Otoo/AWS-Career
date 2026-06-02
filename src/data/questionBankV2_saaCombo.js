/**
 * questionBankV2_saaCombo.js — 80 multi-service SAA-C03 scenarios.
 *
 * EX-08: Real exam questions almost always span multiple services. This
 * file lives in its own "Multi-Service Scenarios" topic (because it's the
 * biggest category) AND each question is tagged with all its component
 * services so it also boosts those tiles in the heatmap.
 *
 * Schema identical to V2:
 *   scenario · 4 options · why · per-wrong reasons · concept · topic · docs.
 *
 * Topic on every question is 'Multi-Service' so they aggregate under the
 * Mixed tile. The service[] array carries the real services for cross-tile
 * counting.
 */

const TOPIC = 'Multi-Service';

function pq(id, q) {
  // Auto-add 'mixed' alias so the Multi-Service tile counts every combo.
  const services = ['mixed', ...(q.service || [])];
  return {
    id, certIds: ['saa-c03'], domainIds: q.domainIds || ['saa-d3'],
    difficulty: q.difficulty || 'medium', service: services, type: 'single',
    q: q.scenario, options: q.options, answer: q.answer,
    why: q.why, wrongReasons: q.wrongReasons || {},
    docs: q.docs || null, level: 'Associate', topic: TOPIC,
    concept: q.concept, learningTopic: null,
    lastVerified: '2026-05-30',
  };
}

export const SAA_V2_COMBO = [
  // ════════ S3 + Lambda + DynamoDB + others ════════
  pq('saa-combo-001', {
    service: ['s3','lambda','dynamodb'],
    scenario: 'A retail company uploads CSV order files to S3 every minute. Each row must be validated and written to DynamoDB. Throughput peaks at 5000 rows/second. The team wants minimal code and zero servers.',
    options: [
      'S3 PutObject → S3 Event Notification → Lambda parses CSV → BatchWriteItem to DynamoDB',
      'EC2 cron pulling from S3 every minute',
      'AWS Glue ETL job triggered by S3',
      'Kinesis Data Streams between S3 and DynamoDB',
    ],
    answer: 0,
    why: 'S3 Event Notifications fire a Lambda on every PutObject. Lambda streams the CSV, batches 25 rows per BatchWriteItem call to DynamoDB. Zero servers, scales to thousands of files in parallel, costs pennies.',
    wrongReasons: {
      1: 'Cron is high-latency and you pay for an idle EC2 between runs.',
      2: 'Glue is heavier (per-job billing) and adds minutes of latency per file.',
      3: 'Kinesis adds a hop without solving anything — Lambda direct from S3 events is simpler.',
    },
    concept: 'Event-driven CSV ingest: S3 → Lambda → DynamoDB BatchWrite.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/NotificationHowTo.html',
  }),

  pq('saa-combo-002', {
    service: ['s3','cloudfront','iam','oac'],
    scenario: 'A media company serves video files from S3 via CloudFront. The S3 bucket must be private — only CloudFront should be able to read it. What is the recommended modern approach?',
    options: [
      'CloudFront Origin Access Control (OAC) + bucket policy granting cloudfront.amazonaws.com with the distribution ARN in the SourceArn condition',
      'Make the bucket public + use Referer header check',
      'Legacy Origin Access Identity (OAI)',
      'Presigned URLs only',
    ],
    answer: 0,
    why: 'OAC is the modern replacement for OAI. It supports all S3 regions, all four signature versions, SSE-KMS, and dynamic requests. Bucket policy authorises the CloudFront service principal scoped to that distribution\'s ARN.',
    wrongReasons: {
      1: 'Public buckets violate data-protection baselines; Referer is spoofable.',
      2: 'OAI still works but OAC is the recommended modern path with SSE-KMS support.',
      3: 'Presigned URLs work for some flows but don\'t scale for general public video streaming.',
    },
    concept: 'CloudFront OAC for private-origin S3 buckets.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html',
  }),

  pq('saa-combo-003', {
    service: ['ec2','s3','vpc','endpoint'],
    scenario: 'An EC2 application in a private subnet needs to read 500GB/day from an S3 bucket in the same region. Cost-conscious — the team wants to avoid NAT Gateway data-processing charges.',
    options: [
      'VPC Gateway Endpoint for S3 — free + routes traffic via private AWS network',
      'NAT Gateway in a public subnet',
      'Make EC2 public + restrict by security group',
      'Direct Connect to AWS',
    ],
    answer: 0,
    why: 'S3 Gateway Endpoints are FREE and route private-subnet traffic to S3 via AWS\'s internal network. Saves the $0.045/GB NAT data-processing charge — that\'s ~$22/day saved for 500GB.',
    wrongReasons: {
      1: 'NAT Gateway costs $0.045/GB processed = $22/day for this volume.',
      2: 'Public EC2 expands the attack surface.',
      3: 'DX is for hybrid on-prem connectivity — not relevant inside AWS.',
    },
    concept: 'S3 Gateway VPC Endpoint to avoid NAT Gateway data charges.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html',
  }),

  pq('saa-combo-004', {
    service: ['apigateway','lambda','cognito'],
    scenario: 'A REST API on API Gateway + Lambda must require user authentication. Users sign up + sign in via Google or email/password. Best-managed approach?',
    options: [
      'Cognito User Pool as a Cognito authorizer on API Gateway methods',
      'Lambda authorizer that validates Google JWT manually',
      'Basic Auth in API Gateway',
      'IAM auth + AssumeRole per user',
    ],
    answer: 0,
    why: 'Cognito User Pool supports email/password AND federated identity providers (Google, Facebook, Apple, SAML). Attach it as a Cognito authorizer to API Gateway methods — no Lambda code, no token validation logic.',
    wrongReasons: {
      1: 'Custom Lambda authorizer re-invents what Cognito gives for free.',
      2: 'Basic Auth is plaintext + lacks user lifecycle features.',
      3: 'IAM per end-user doesn\'t scale and Cognito handles the federation natively.',
    },
    concept: 'API Gateway + Cognito User Pool authorizer for end-user auth.',
    docs: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html',
  }),

  pq('saa-combo-005', {
    service: ['kinesis','firehose','s3','athena','glue'],
    scenario: 'A log ingestion pipeline takes 200k events/sec, lands them on S3, and lets analysts query with SQL. They want minimal ops + low cost.',
    options: [
      'Kinesis Data Streams → Firehose (Parquet conversion via Glue schema) → S3 → Athena',
      'Custom EC2 fleet writing JSON to S3 + EMR Spark for queries',
      'DynamoDB Streams → Lambda → S3 → Redshift',
      'SQS → Lambda → S3 → Athena',
    ],
    answer: 0,
    why: 'Kinesis Data Streams handles the 200k/sec ingest; Firehose buffers + writes to S3, converts to Parquet (80-95% scan cost reduction) using a Glue Catalog schema; Athena queries directly. Fully managed throughout.',
    wrongReasons: {
      1: 'EC2 + EMR is huge ops + 10× cost.',
      2: 'DynamoDB Streams aren\'t for raw log ingest at this scale; Redshift adds cluster ops.',
      3: 'SQS isn\'t built for 200k msg/s sustained ingest without significant scaling.',
    },
    concept: 'Modern log lake: Kinesis → Firehose Parquet → S3 → Athena.',
    docs: 'https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html',
  }),

  pq('saa-combo-006', {
    service: ['alb','ecs','fargate','waf','acm'],
    scenario: 'A web app runs on ECS Fargate. It must be accessible via HTTPS, protected against common web attacks, and scale automatically.',
    options: [
      'ALB (HTTPS via ACM cert) → ECS Fargate service + WAF Web ACL on ALB + Application Auto Scaling',
      'EC2 with nginx + LetsEncrypt + iptables',
      'CloudFront + S3 (no app servers)',
      'NLB + Fargate + Lambda for security',
    ],
    answer: 0,
    why: 'Industry-standard stack. ACM provides free public certs auto-renewed. ALB terminates HTTPS. WAF (free managed rule groups) blocks OWASP Top 10. Application Auto Scaling scales tasks on CPU/memory/RPS.',
    wrongReasons: {
      1: 'Self-managed nginx + LE = lots of ops.',
      2: 'S3 is static only — no app servers.',
      3: 'NLB is L4 — doesn\'t support WAF or HTTP routing.',
    },
    concept: 'Standard secure Fargate stack: ALB+ACM+WAF+AutoScaling.',
    docs: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-https-listener.html',
  }),

  pq('saa-combo-007', {
    service: ['step','lambda','sqs','sns','dlq'],
    scenario: 'An order workflow has 6 steps: validate, charge, ship, notify, archive, audit. Some steps can fail transiently. Need retry, branching, and human notification on terminal failure.',
    options: [
      'Step Functions Standard workflow with Task retries + Catch state → SNS notification + SQS DLQ for forensic capture',
      'Single huge Lambda doing all 6 steps',
      'SQS chain — each step is a separate queue + Lambda',
      'Cron jobs polling DynamoDB for state',
    ],
    answer: 0,
    why: 'Step Functions Standard workflows give visual state machines with built-in retry (configurable per state), Catch states for branching on failure, and integrations with SNS for ops notification + SQS for dead-lettering bad payloads.',
    wrongReasons: {
      1: 'Monolithic Lambda is hard to debug + hits 15-min timeout on complex flows.',
      2: 'SQS chain works but lacks centralised state machine visibility.',
      3: 'Cron + DynamoDB reinvents Step Functions poorly.',
    },
    concept: 'Step Functions orchestration with retry + catch + DLQ + SNS.',
    docs: 'https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html',
  }),

  pq('saa-combo-008', {
    service: ['rds','elasticache','aurora'],
    scenario: 'An e-commerce app reads a product catalog 100k times/sec from Aurora MySQL. CPU is at 90%. Most reads are repeated queries for the top 1000 products.',
    options: [
      'Add ElastiCache for Redis as a lazy-loading cache layer in front of Aurora',
      'Add 10 more Aurora read replicas',
      'Upgrade to a 24xlarge instance',
      'Move catalog to DynamoDB',
    ],
    answer: 0,
    why: 'Top 1000 products = 99% of reads from a small hot set. Lazy-loading cache in front of Aurora deflects 95%+ of reads at sub-millisecond latency. Aurora CPU drops drastically. Cheaper than scaling Aurora.',
    wrongReasons: {
      1: 'More replicas help but cost more than a single cache.',
      2: 'Vertical scaling has a ceiling + huge cost.',
      3: 'Full migration is risky + heavy when caching solves the hot-key problem.',
    },
    concept: 'ElastiCache lazy-loading in front of Aurora for hot-key reads.',
    docs: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Strategies.html',
  }),

  pq('saa-combo-009', {
    service: ['cloudfront','s3','lambda-edge'],
    scenario: 'A SaaS app serves customised content per region. The team wants to rewrite URLs at the edge before they reach S3 origin, so /pricing → /us/pricing for US users etc.',
    options: [
      'CloudFront + Lambda@Edge on Viewer Request to rewrite the URI based on cf-viewer-country header',
      'Single CloudFront with no region logic',
      'Multiple CloudFront distributions per region',
      'Route 53 geo-routing to per-region S3 buckets',
    ],
    answer: 0,
    why: 'Lambda@Edge runs at CloudFront edge locations — Viewer Request can modify the URI before cache lookup. Combined with the cf-viewer-country header, you serve geo-localised content from a single distribution + single origin.',
    wrongReasons: {
      1: 'No region logic = no personalisation.',
      2: 'Multiple distributions = management overhead.',
      3: 'Multi-bucket-per-region duplicates data + ops.',
    },
    concept: 'Lambda@Edge URL rewriting for edge personalisation.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-at-the-edge.html',
  }),

  pq('saa-combo-010', {
    service: ['vpc','tgw','vpn','dx'],
    scenario: 'An enterprise has 20 VPCs across 2 regions + 3 on-prem data centres. They need any-to-any connectivity with central control.',
    options: [
      'Transit Gateway in each region + TGW peering + DX/VPN to TGW from on-prem',
      'VPC peering between every pair (20×19 mesh)',
      'A single VPN tunnel through one VPC',
      'NAT Gateway for routing',
    ],
    answer: 0,
    why: 'TGW is the hub-and-spoke pattern for AWS. Each VPC attaches once. TGW peering connects the 2 regions. DX/VPN terminates on TGW for on-prem. Centralised route tables for fine-grained control.',
    wrongReasons: {
      1: 'Mesh is O(n²) — 380 peerings, unmanageable.',
      2: 'Single tunnel = single point of failure + bottleneck.',
      3: 'NAT Gateway is for egress IP translation, not routing.',
    },
    concept: 'TGW hub-and-spoke for large multi-VPC + hybrid networks.',
    docs: 'https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/transit-gateway.html',
  }),

  pq('saa-combo-011', {
    service: ['sqs','lambda','dynamodb'],
    scenario: 'An order intake API writes orders to SQS at peak 10k/sec. A Lambda processes each order and writes to DynamoDB. Occasionally DynamoDB throttles cause failures.',
    options: [
      'SQS + Lambda event source with batch reporting + SQS DLQ + DynamoDB Auto Scaling',
      'API → Lambda directly (no queue)',
      'Kinesis → Lambda',
      'API → SNS → Lambda',
    ],
    answer: 0,
    why: 'SQS absorbs spikes, decouples ingest from processing, retries automatically. Batch reporting (BatchItemFailures) lets Lambda mark individual records as failed without re-processing the whole batch. DLQ captures persistent failures. DynamoDB Auto Scaling adjusts WCU/RCU to demand.',
    wrongReasons: {
      1: 'No queue means traffic spike hits DynamoDB directly = throttles + lost orders.',
      2: 'Kinesis is fine but SQS is simpler when ordering across the whole stream isn\'t needed.',
      3: 'SNS fans out but doesn\'t buffer.',
    },
    concept: 'SQS+Lambda+DLQ+DynamoDB AutoScale for resilient ingest.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html',
  }),

  pq('saa-combo-012', {
    service: ['s3','glacier','lifecycle','cost'],
    scenario: 'A company stores audit logs in S3 — 50TB/year. Logs need to be queryable within 24 hours for 1 year, archived for 7 years total, then deleted.',
    options: [
      'S3 Lifecycle: Standard for 90 days → Standard-IA for 9 months → Glacier Flexible Retrieval for 6 years → expire',
      'Keep everything in Standard for 7 years',
      'Move to Glacier Deep Archive immediately',
      'Delete after 1 year',
    ],
    answer: 0,
    why: 'Tiered lifecycle minimises cost while meeting access SLA. Standard for recent (fast access), Standard-IA for occasional (cheaper), Flexible Retrieval gives minutes-to-hours retrieval — well within 24-hour SLA. Expire at year 7.',
    wrongReasons: {
      1: 'Standard for 7 years is 7× the cost of tiered.',
      2: 'Deep Archive has 12-hour retrieval and isn\'t needed for queryable logs.',
      3: 'Deleting breaks 7-year audit requirement.',
    },
    concept: 'S3 tiered lifecycle to balance retrieval SLA + cost.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html',
  }),

  pq('saa-combo-013', {
    service: ['route53','alb','ec2','failover'],
    scenario: 'A web app must be active in eu-west-1 and stand by in us-east-1. If eu-west-1 ALB health check fails, traffic should switch to us-east-1 automatically.',
    options: [
      'Route 53 Failover routing with health check on the primary ALB; record points to secondary on failure',
      'Round-robin DNS between both regions',
      'CloudFront with origin failover only',
      'Latency-based routing',
    ],
    answer: 0,
    why: 'Route 53 Failover Routing: PRIMARY record points to eu-west-1 ALB with a Route 53 health check; SECONDARY points to us-east-1. On primary failure, DNS automatically switches users to secondary.',
    wrongReasons: {
      1: 'Round-robin sends traffic to a failed region 50% of the time.',
      2: 'CloudFront origin failover only works for CloudFront origins, not direct ALB DNS.',
      3: 'Latency routing optimises speed, not failover.',
    },
    concept: 'Route 53 Failover routing with health checks for cross-region DR.',
    docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html',
  }),

  pq('saa-combo-014', {
    service: ['cognito','s3','iam'],
    scenario: 'A photo app lets users upload to S3 directly from their browser. Each user should only be able to upload to their own /users/{cognitoSub}/ prefix.',
    options: [
      'Cognito Identity Pool → IAM role with S3 policy using ${cognito-identity.amazonaws.com:sub} variable in the resource ARN',
      'Single shared bucket with no restrictions',
      'Server-side proxy for every upload',
      'Pre-signed URLs only',
    ],
    answer: 0,
    why: 'Identity Pool issues temporary AWS credentials per user. IAM policy uses the cognito sub variable to restrict S3 actions to that user\'s prefix only. Each user gets browser-direct uploads but is sandboxed to their folder.',
    wrongReasons: {
      1: 'Shared bucket without restrictions = users can access each other\'s photos.',
      2: 'Server-side proxy adds latency + EC2 cost.',
      3: 'Presigned URLs work for individual files but the per-user prefix approach is cleaner for app-wide enforcement.',
    },
    concept: 'Cognito Identity Pool + IAM variable for per-user S3 prefix.',
    docs: 'https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html',
  }),

  pq('saa-combo-015', {
    service: ['lambda','ecr','vpc'],
    scenario: 'A Lambda must access a private RDS Postgres inside a VPC AND pull large ML models from S3.',
    options: [
      'Lambda in VPC + S3 Gateway Endpoint + RDS in private subnet — no NAT needed',
      'Lambda in VPC + NAT Gateway for S3 access',
      'Lambda outside VPC — accept RDS not reachable',
      'Lambda in VPC + public RDS subnet',
    ],
    answer: 0,
    why: 'Lambda in VPC reaches RDS over private IPs. S3 Gateway Endpoint gives Lambda free + fast S3 access without NAT. Cost-optimal AND secure.',
    wrongReasons: {
      1: 'NAT costs $0.045/GB processed — wasteful for S3.',
      2: 'Lambda must be in VPC to reach private RDS.',
      3: 'Public RDS subnet violates security best practices.',
    },
    concept: 'Lambda in VPC + S3 Gateway Endpoint for free S3 + private RDS.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html',
  }),

  pq('saa-combo-016', {
    service: ['eventbridge','lambda','sns','sqs','dynamodb'],
    scenario: 'An e-commerce platform must emit "order.placed" events that fan out to: inventory service (SQS), notifications service (SNS for email), audit log (DynamoDB), and analytics (Lambda).',
    options: [
      'EventBridge custom bus with 4 rules — one per consumer (SQS, SNS, Lambda direct, DynamoDB via API Destination/Lambda)',
      'SNS topic with 4 subscribers',
      'Lambda that calls each consumer in sequence',
      'Direct Lambda invocations from publisher',
    ],
    answer: 0,
    why: 'EventBridge custom bus + filter rules + multiple targets is the modern event-driven pattern. Each consumer gets only the events it cares about (filter rules), targets can be SQS/SNS/Lambda/etc., and you can add new consumers without changing the publisher.',
    wrongReasons: {
      1: 'SNS works for simple fan-out but lacks rich event filtering + DynamoDB target.',
      2: 'Sequential calls couple consumers + slow the publisher.',
      3: 'Direct Lambda invocations tightly couple publisher to every consumer.',
    },
    concept: 'EventBridge custom bus + rules for decoupled fan-out.',
    docs: 'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-buses.html',
  }),

  pq('saa-combo-017', {
    service: ['s3','dms','rds'],
    scenario: 'A company is migrating a 4TB on-prem Oracle DB to Aurora PostgreSQL. They need ongoing replication during cutover for minimal downtime.',
    options: [
      'AWS SCT to convert schema + AWS DMS with CDC for ongoing replication',
      'Take Oracle dump → load to Aurora once',
      'Snowball Edge to ship the database',
      'Manual mysqldump',
    ],
    answer: 0,
    why: 'SCT (Schema Conversion Tool) converts Oracle schema to Postgres-compatible. DMS with Change Data Capture replicates existing data + ongoing changes — letting you cut over with seconds of downtime, not hours.',
    wrongReasons: {
      1: 'One-time dump means hours of downtime during the gap.',
      2: 'Snowball is for petabyte-scale + can\'t do continuous replication.',
      3: 'mysqldump doesn\'t apply to Oracle.',
    },
    concept: 'SCT + DMS CDC for minimal-downtime heterogeneous DB migration.',
    docs: 'https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html',
  }),

  pq('saa-combo-018', {
    service: ['s3','cloudfront','signed-url','signed-cookies'],
    scenario: 'A streaming service needs to restrict premium video access to paying subscribers, served via CloudFront from a private S3 origin.',
    options: [
      'CloudFront Signed URLs (per file) or Signed Cookies (per session) — backend service generates signatures',
      'OAI / OAC alone (no per-user auth)',
      'WAF IP whitelist',
      'S3 ACLs',
    ],
    answer: 0,
    why: 'Signed URLs or Signed Cookies authorise individual viewers. URLs are per-file (good for download links); Cookies are per-session (good for HLS where many segments are fetched). OAC keeps the bucket private; signatures gate viewers.',
    wrongReasons: {
      1: 'OAC alone keeps S3 private but anyone with the CloudFront URL can fetch.',
      2: 'IP whitelist doesn\'t scale to millions of subscribers.',
      3: 'S3 ACLs don\'t apply when content is served via CloudFront.',
    },
    concept: 'CloudFront Signed URLs + Signed Cookies for paid content.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html',
  }),

  pq('saa-combo-019', {
    service: ['ec2','asg','alb','spot'],
    scenario: 'A batch processing service needs 50-200 EC2 instances depending on workload. The team wants to maximise Spot usage with On-Demand backup for stability.',
    options: [
      'ASG with Mixed Instances Policy: 25% On-Demand baseline + 75% Spot across multiple instance types',
      'Pure Spot ASG (cheap but interruption risk)',
      'Pure On-Demand (no interruptions but 3-4× cost)',
      'Manual Spot Fleet',
    ],
    answer: 0,
    why: 'Mixed Instances Policy lets you set a baseline of On-Demand (e.g. 25%) for stability + the rest on Spot for cost. Multiple instance types reduce Spot interruption risk because you can fall back to other capacity pools.',
    wrongReasons: {
      1: 'Pure Spot risks full interruption of all batch capacity.',
      2: 'Pure On-Demand is 3-4× more expensive than mixed.',
      3: 'Spot Fleet is older + lacks the simplicity of ASG MIP.',
    },
    concept: 'ASG Mixed Instances Policy for Spot+On-Demand stability.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-purchase-options.html',
  }),

  pq('saa-combo-020', {
    service: ['s3','kms','iam'],
    scenario: 'A compliance officer requires that data uploaded to a particular S3 bucket MUST be encrypted with a specific customer-managed KMS key. Reject any upload not using it.',
    options: [
      'Bucket policy: Deny PutObject where s3:x-amz-server-side-encryption-aws-kms-key-id != <key-arn>',
      'Trust uploaders to encrypt',
      'Block all uploads',
      'Use bucket default encryption only',
    ],
    answer: 0,
    why: 'Bucket policy conditions can enforce specific encryption headers at upload time. Combine with a Deny rule on missing/wrong KMS key ID. Default encryption applies post-upload; the policy ENFORCES it pre-upload.',
    wrongReasons: {
      1: 'Trusting uploaders fails audits.',
      2: 'Blocking all uploads breaks the use case.',
      3: 'Default encryption alone doesn\'t reject wrong-key uploads.',
    },
    concept: 'S3 bucket policy enforcing specific KMS key on PutObject.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html',
  }),

  pq('saa-combo-021', {
    service: ['ec2','ebs','snapshot','ami'],
    scenario: 'A company wants daily backups of EC2 instances, retained for 30 days, automatically. Existing AMIs should also be cleaned up after the same period.',
    options: [
      'AWS Backup or Data Lifecycle Manager (DLM) policies on volumes + AMI cleanup rules',
      'Custom Lambda + EventBridge cron',
      'Manual daily snapshot CLI script',
      'Just take a snapshot once',
    ],
    answer: 0,
    why: 'AWS Backup OR DLM both automate snapshot + AMI creation + retention. Tag-based, multi-account, multi-region. Zero custom code, audit-friendly.',
    wrongReasons: {
      1: 'Custom Lambda re-invents the wheel.',
      2: 'Manual scripts forget to run + lack retention enforcement.',
      3: 'One-time snapshot doesn\'t protect ongoing data.',
    },
    concept: 'AWS Backup / DLM for automated EC2 backup lifecycle.',
    docs: 'https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html',
  }),

  pq('saa-combo-022', {
    service: ['dynamodb','streams','lambda','elasticsearch'],
    scenario: 'A team uses DynamoDB for primary storage but needs full-text search on item attributes.',
    options: [
      'DynamoDB Streams → Lambda → OpenSearch (Elasticsearch) index for search',
      'Scan DynamoDB on every search',
      'Replace DynamoDB with OpenSearch',
      'Add a GSI for text search',
    ],
    answer: 0,
    why: 'DynamoDB Streams capture every change. A Lambda processes the stream and indexes the changed items into OpenSearch. Search hits OpenSearch (full-text + fuzzy match); writes still hit DynamoDB.',
    wrongReasons: {
      1: 'Scan is O(N) — never use for search.',
      2: 'OpenSearch alone lacks DynamoDB\'s scale + cost profile for OLTP writes.',
      3: 'GSIs do equality/range, not full-text search.',
    },
    concept: 'DynamoDB Streams + Lambda → OpenSearch for search index.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html',
  }),

  pq('saa-combo-023', {
    service: ['sftp','transfer-family','s3'],
    scenario: 'A B2B platform must accept SFTP file uploads from 50 partners and land them in S3. No EC2 management.',
    options: [
      'AWS Transfer Family SFTP endpoint backed by S3 — managed SFTP, no servers',
      'Self-managed SFTP server on EC2',
      'Partner-direct S3 uploads (changes their workflow)',
      'API Gateway POST',
    ],
    answer: 0,
    why: 'Transfer Family is fully-managed SFTP/FTPS/FTP backed by S3 or EFS. Per-user IAM, audit logs, custom domain. Zero server management.',
    wrongReasons: {
      1: 'Self-managed SFTP = patching, scaling, monitoring overhead.',
      2: 'Changing partner workflow is rarely possible in B2B.',
      3: 'API Gateway isn\'t SFTP — partners need SFTP support.',
    },
    concept: 'AWS Transfer Family for managed SFTP to S3.',
    docs: 'https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html',
  }),

  pq('saa-combo-024', {
    service: ['ec2','asg','alb','sqs'],
    scenario: 'A worker fleet processes jobs from an SQS queue. Scaling should be driven by queue depth, not CPU.',
    options: [
      'ASG target-tracking scaling on the SQS metric ApproximateNumberOfMessagesVisible per instance',
      'Scale on CPU only',
      'Manual scaling',
      'Scale on memory'],
    answer: 0,
    why: 'For worker fleets, the right signal is queue depth ÷ desired capacity per instance. ASG supports target tracking on a custom CloudWatch metric like backlog-per-instance. Scales workers in response to actual work, not just CPU.',
    wrongReasons: {
      1: 'CPU may be misleading (e.g. I/O-bound workers).',
      2: 'Manual doesn\'t react.',
      3: 'Memory may be misleading too.',
    },
    concept: 'ASG target tracking on SQS backlog-per-instance.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html',
  }),

  pq('saa-combo-025', {
    service: ['cloudwatch','sns','lambda','autoremediate'],
    scenario: 'When a CloudWatch alarm fires (e.g. EC2 status check failed), the team wants automatic remediation (reboot the instance).',
    options: [
      'CloudWatch Alarm → SNS → Lambda (or EventBridge → SSM Automation) that reboots the instance',
      'Just alert humans via SNS',
      'Use Auto Scaling',
      'Use Macie'],
    answer: 0,
    why: 'Auto-remediation pattern: alarm fires → SNS notifies Lambda → Lambda calls EC2 RebootInstances. Alternatively use EventBridge with SSM Automation document for canned remediations.',
    wrongReasons: {
      1: 'Alerting alone delays remediation to human response time.',
      2: 'Auto Scaling replaces instances based on health, doesn\'t reboot.',
      3: 'Macie is for PII discovery.',
    },
    concept: 'Self-healing automation via CloudWatch + SNS + Lambda.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/UsingAlarmActions.html',
  }),

  pq('saa-combo-026', {
    service: ['s3','replication','cross-region','dr'],
    scenario: 'Regulatory requirement: all S3 data must exist in a second region (DR) within 15 minutes of being written. RPO ≤ 15 minutes.',
    options: [
      'S3 Cross-Region Replication (CRR) with Replication Time Control (RTC) for 15-minute SLA',
      'Lifecycle move to Glacier',
      'Manual periodic copies via DataSync',
      'Single-region with backups'],
    answer: 0,
    why: 'S3 CRR replicates objects to a target region. Replication Time Control (RTC) gives a 15-minute SLA + replication metrics. Meets the RPO requirement automatically.',
    wrongReasons: {
      1: 'Glacier is archive, not DR target.',
      2: 'DataSync periodic copies don\'t meet 15-minute RPO.',
      3: 'Backups alone don\'t give regional DR.',
    },
    concept: 'S3 CRR + Replication Time Control for 15-minute DR RPO.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html',
  }),

  pq('saa-combo-027', {
    service: ['ec2','privatelink','vpc','endpoint'],
    scenario: 'A SaaS provider hosts a service in their VPC. Customers in OTHER AWS accounts want to consume it privately, without internet or peering.',
    options: [
      'PrivateLink: SaaS publishes NLB-fronted endpoint service; customers create Interface Endpoints in their VPCs',
      'VPC peering with every customer',
      'Public internet endpoint',
      'Transit Gateway shared'],
    answer: 0,
    why: 'PrivateLink lets you expose a service via an NLB-fronted endpoint that customers consume via Interface Endpoints in their VPCs. Traffic stays on AWS backbone, no peering, no IP overlap concerns.',
    wrongReasons: {
      1: 'Peering with every customer is unmanageable + IP overlap risk.',
      2: 'Public defeats the "private" requirement.',
      3: 'TGW sharing works but PrivateLink is the SaaS-pattern recommendation.',
    },
    concept: 'PrivateLink for SaaS service exposure across accounts.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/what-is-privatelink.html',
  }),

  pq('saa-combo-028', {
    service: ['ec2','placement-group','hpc'],
    scenario: 'An HPC cluster needs very low inter-node latency (microseconds). All nodes are the same instance type in one AZ.',
    options: [
      'Cluster Placement Group — packs instances on the same underlying rack',
      'Spread Placement Group',
      'Partition Placement Group',
      'Default placement'],
    answer: 0,
    why: 'Cluster Placement Groups co-locate instances on the same underlying hardware. Provides 10 Gbps+ low-latency networking — required for HPC, MPI, tightly-coupled workloads.',
    wrongReasons: {
      1: 'Spread distributes for fault tolerance — opposite of what HPC wants.',
      2: 'Partition is for distributed apps like HDFS — between Cluster and Spread.',
      3: 'Default placement = random, no low-latency guarantee.',
    },
    concept: 'EC2 Cluster Placement Group for HPC low-latency.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html',
  }),

  pq('saa-combo-029', {
    service: ['ec2','spread-placement','availability'],
    scenario: 'A small cluster (7 critical instances) needs to survive single-hardware failure. They should be placed on distinct racks.',
    options: [
      'Spread Placement Group — each instance on distinct underlying hardware (max 7 per AZ)',
      'Cluster Placement Group',
      'Single instance with auto-recovery',
      'Multiple AMIs'],
    answer: 0,
    why: 'Spread PG places each instance on distinct underlying hardware within an AZ. Limit is 7 instances per AZ per Spread group. Use this when you have few but critical instances.',
    wrongReasons: {
      1: 'Cluster co-locates — opposite of spread.',
      2: 'Single instance = single point of failure.',
      3: 'Multiple AMIs unrelated to placement.',
    },
    concept: 'Spread Placement Group for small critical clusters.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html',
  }),

  pq('saa-combo-030', {
    service: ['organizations','scp','iam'],
    scenario: 'A company\'s Organization has 50 accounts. Security wants to prevent ANY account from disabling CloudTrail or deleting CloudTrail logs.',
    options: [
      'SCP (Service Control Policy) attached at the OU/root denying cloudtrail:Delete*, StopLogging, etc.',
      'IAM policy per account',
      'Permission boundary',
      'Trust the account owners'],
    answer: 0,
    why: 'SCPs apply organization-wide and CANNOT be overridden by account-level IAM. Even root in member accounts can\'t take denied actions. The right tool for org-wide guardrails.',
    wrongReasons: {
      1: 'IAM policies are per-account and account admins can change them.',
      2: 'Permission boundaries limit IAM principals but don\'t apply org-wide.',
      3: 'Trust isn\'t a control.',
    },
    concept: 'SCPs for org-wide guardrails against destructive actions.',
    docs: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html',
  }),

  pq('saa-combo-031', {
    service: ['secretsmgr','rds','lambda'],
    scenario: 'A Lambda function connects to RDS Postgres. Currently the DB password is hard-coded in environment variables. The team wants automatic rotation + audit.',
    options: [
      'Move credentials to Secrets Manager + Lambda reads via SDK at runtime + enable RDS rotation Lambda (30-day)',
      'Parameter Store SecureString',
      'KMS-encrypted env var',
      'Keep it hard-coded but cycle manually'],
    answer: 0,
    why: 'Secrets Manager provides built-in rotation Lambdas for RDS. Lambda reads the current secret on cold start (cache it for warm). On rotation, the new secret is available immediately. CloudTrail logs every Get.',
    wrongReasons: {
      1: 'Parameter Store doesn\'t natively rotate RDS credentials.',
      2: 'KMS-encrypted env still has the secret in deployment config.',
      3: 'Manual rotation gets forgotten.',
    },
    concept: 'Secrets Manager with RDS rotation Lambda for password-less rotation.',
    docs: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets-rds.html',
  }),

  pq('saa-combo-032', {
    service: ['cloudformation','stackset','organizations'],
    scenario: 'A platform team wants to deploy a baseline VPC + IAM roles across 30 AWS accounts in Organizations.',
    options: [
      'CloudFormation StackSets with service-managed permissions targeting OUs',
      'CloudFormation per account manually',
      'Terraform run per account',
      'Click around in each console'],
    answer: 0,
    why: 'StackSets deploys + maintains CloudFormation stacks across multiple accounts + regions from a single source of truth. Service-managed permissions integrate with Organizations for auto-deploy on new accounts.',
    wrongReasons: {
      1: '30× manual operations is error-prone.',
      2: 'Terraform works but StackSets is the AWS-native multi-account answer.',
      3: 'Manual console doesn\'t scale or audit.',
    },
    concept: 'CloudFormation StackSets for multi-account baseline deployment.',
    docs: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html',
  }),

  pq('saa-combo-033', {
    service: ['s3','intelligent-tiering','cost'],
    scenario: 'A data lake has objects whose access patterns are unpredictable. Some get hot weekly, some go cold for years. The team wants automatic cost optimisation without manual lifecycle rules.',
    options: [
      'S3 Intelligent-Tiering — automatic movement between Frequent / Infrequent / Archive tiers based on access',
      'Standard storage class for everything',
      'Glacier Deep Archive for everything',
      'Manual monthly review'],
    answer: 0,
    why: 'Intelligent-Tiering monitors per-object access and auto-moves between Frequent, Infrequent (30-day no access), Archive Instant (90-day), Archive (180-day), Deep Archive (180+) tiers. Small monitoring fee but no retrieval fees.',
    wrongReasons: {
      1: 'Standard is expensive for cold objects.',
      2: 'Deep Archive can\'t serve hot objects quickly.',
      3: 'Manual review doesn\'t scale to millions of objects.',
    },
    concept: 'S3 Intelligent-Tiering for unpredictable-access optimisation.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html',
  }),

  pq('saa-combo-034', {
    service: ['ec2','autoscaling','warm-pool'],
    scenario: 'An ASG launches t3.large instances that take 5 minutes to boot + warm up. During traffic spikes, the warm-up delay causes user-visible latency.',
    options: [
      'ASG Warm Pool — pre-initialised instances held in Stopped state, started on demand in seconds',
      'Larger instance types',
      'Predictive scaling only',
      'Bigger ASG min size always'],
    answer: 0,
    why: 'Warm Pool keeps a pool of pre-initialised (and stopped) instances ready. When the ASG needs to scale, it starts them — much faster than full launch + warm-up. Cost is just EBS storage while stopped.',
    wrongReasons: {
      1: 'Larger instances cost more 24/7.',
      2: 'Predictive scaling helps but Warm Pool is the instant-speedup answer.',
      3: 'Always-on bigger min size wastes money during quiet times.',
    },
    concept: 'ASG Warm Pool for sub-second scale-out from stopped state.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html',
  }),

  pq('saa-combo-035', {
    service: ['rds','readreplica','aurora'],
    scenario: 'An RDS MySQL workload has 95% reads, 5% writes. Read latency is increasing. The team wants horizontal read scaling.',
    options: [
      'Add up to 5 RDS Read Replicas + route reads via separate reader endpoint (app-side logic) OR migrate to Aurora for built-in reader endpoint',
      'Vertical scale only',
      'Move to DynamoDB',
      'Use ElastiCache only'],
    answer: 0,
    why: 'RDS Read Replicas (async replication) handle read scaling — up to 5 (15 with Aurora). App routes writes to writer, reads to a separate replica endpoint. Aurora makes this seamless with built-in reader endpoint.',
    wrongReasons: {
      1: 'Vertical scaling hits a ceiling.',
      2: 'DynamoDB migration is huge effort.',
      3: 'Caching helps but doesn\'t replace replicas for fresh data.',
    },
    concept: 'RDS Read Replicas / Aurora Reader endpoint for read scaling.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html',
  }),

  pq('saa-combo-036', {
    service: ['lambda','provisioned-concurrency','apigw'],
    scenario: 'A Lambda behind API Gateway is hit with sudden burst traffic. Cold-start latency causes p99 spikes. SLA is 200ms p99.',
    options: [
      'Configure Provisioned Concurrency on the Lambda — keeps N instances pre-warmed',
      'Increase Lambda memory only',
      'Move to ECS',
      'Accept the cold starts'],
    answer: 0,
    why: 'Provisioned Concurrency keeps a configured number of Lambda execution environments initialised and ready, eliminating cold starts for that baseline. Pay for the provisioned hours.',
    wrongReasons: {
      1: 'More memory reduces but doesn\'t eliminate cold-start latency.',
      2: 'ECS is a bigger migration.',
      3: 'Cold starts violate the SLA.',
    },
    concept: 'Lambda Provisioned Concurrency to eliminate cold starts.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html',
  }),

  pq('saa-combo-037', {
    service: ['cloudwatch','xray','distributed-tracing'],
    scenario: 'A microservices app (API GW → Lambda → DynamoDB + Lambda → SNS) has intermittent slow requests. The team wants to see end-to-end latency per service.',
    options: [
      'AWS X-Ray with X-Ray SDK instrumentation in each Lambda + API GW + service map view',
      'CloudWatch metrics only',
      'Log every request manually',
      'Use Datadog'],
    answer: 0,
    why: 'X-Ray provides distributed tracing across AWS services. Each Lambda sends segments. The service map shows end-to-end latency, errors, and dependencies. Identifies the bottleneck service instantly.',
    wrongReasons: {
      1: 'CloudWatch metrics show per-service stats but not cross-service traces.',
      2: 'Manual logging won\'t correlate spans automatically.',
      3: 'Datadog works but X-Ray is the AWS-native option.',
    },
    concept: 'AWS X-Ray for end-to-end distributed tracing.',
    docs: 'https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html',
  }),

  pq('saa-combo-038', {
    service: ['s3','event-notification','sqs','lambda'],
    scenario: 'A team wants S3 PutObject events to trigger BOTH a Lambda for image processing AND drop a message on SQS for downstream auditing.',
    options: [
      'S3 Event Notifications → EventBridge → multiple targets (Lambda + SQS)',
      'Single Lambda that also writes to SQS',
      'Two S3 buckets',
      'Polling'],
    answer: 0,
    why: 'Routing S3 events through EventBridge (recommended modern pattern) lets you fan out to multiple targets with filtering. Simpler than the older direct S3 → SQS / Lambda routing if you need multiple consumers.',
    wrongReasons: {
      1: 'Single Lambda couples two unrelated concerns.',
      2: 'Two buckets doubles storage.',
      3: 'Polling wastes resources.',
    },
    concept: 'S3 Events via EventBridge for multi-target fan-out.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html',
  }),

  pq('saa-combo-039', {
    service: ['cognito','apigw','iam'],
    scenario: 'An API needs to support both Cognito-authenticated USER requests AND machine-to-machine (M2M) IAM-signed requests on different routes.',
    options: [
      'API Gateway: Cognito User Pool authorizer on /users/* routes + IAM auth on /m2m/* routes',
      'Single Lambda authorizer handling both',
      'IAM auth everywhere',
      'Public API with manual checks'],
    answer: 0,
    why: 'API Gateway lets you choose auth per route. Cognito authorizer handles end-user JWT validation; IAM auth handles SigV4 signed M2M requests. Each gets the appropriate enforcement.',
    wrongReasons: {
      1: 'Custom Lambda authorizer adds code where built-in works.',
      2: 'IAM doesn\'t fit end-user mobile/web apps cleanly.',
      3: 'Public + manual checks miss auth at the API layer.',
    },
    concept: 'API Gateway per-route auth (Cognito + IAM).',
    docs: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html',
  }),

  pq('saa-combo-040', {
    service: ['rds','aurora','global-database'],
    scenario: 'A SaaS app needs sub-second cross-region read replicas of an Aurora database for global low-latency reads, plus 1-minute RPO disaster recovery to a second region.',
    options: [
      'Aurora Global Database — < 1s cross-region replication + < 1 min RPO failover',
      'RDS Cross-Region Read Replica',
      'DMS continuous replication',
      'Manual snapshot copies'],
    answer: 0,
    why: 'Aurora Global Database uses dedicated storage-level replication (typically < 1 second cross-region lag). Failover to a secondary region in < 1 minute. Up to 5 secondary regions.',
    wrongReasons: {
      1: 'RDS Cross-Region Read Replica has higher lag + longer failover.',
      2: 'DMS isn\'t built for this storage-level replication.',
      3: 'Snapshots don\'t give continuous replication.',
    },
    concept: 'Aurora Global Database for sub-second cross-region replication.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html',
  }),

  pq('saa-combo-041', {
    service: ['cloudwatch','logs','subscription','kinesis','firehose','s3'],
    scenario: 'A team wants to ship CloudWatch Logs from 50+ Lambda functions to S3 + an SIEM in near real time.',
    options: [
      'CloudWatch Logs Subscription Filter → Kinesis Data Firehose → S3 (and a second to the SIEM)',
      'CloudWatch Logs S3 export (batch, 12 hours)',
      'Custom Lambda polling Log Groups',
      'Manual download'],
    answer: 0,
    why: 'Subscription Filters stream logs in real time to Kinesis/Firehose/Lambda. Firehose → S3 + a second subscription to the SIEM. No batch delay, no custom code.',
    wrongReasons: {
      1: 'S3 export is batch — too slow for SIEM.',
      2: 'Custom Lambda polling re-invents Subscription Filters poorly.',
      3: 'Manual = not real-time.',
    },
    concept: 'CloudWatch Logs Subscription Filters → real-time downstream.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Subscriptions.html',
  }),

  pq('saa-combo-042', {
    service: ['kms','s3','dynamodb','rds','aurora'],
    scenario: 'A compliance audit requires SINGLE source of truth for encryption keys used across S3, DynamoDB, RDS, and Aurora — with automatic annual rotation.',
    options: [
      'One Customer-Managed CMK per environment used across S3 SSE-KMS, DynamoDB SSE, RDS storage encryption — enable automatic annual rotation',
      'AWS-managed key per service (no rotation control)',
      'Separate CMK per service (lots to manage)',
      'Disable encryption'],
    answer: 0,
    why: 'A single CMK shared across services (per environment) gives one source of truth, one audit trail, one rotation event. CMK automatic rotation handles the annual requirement.',
    wrongReasons: {
      1: 'AWS-managed keys have 3-year (not annual) rotation + no fine-grained policy.',
      2: 'Per-service CMK adds key sprawl without compliance benefit if a single key is acceptable.',
      3: 'Disabling encryption violates compliance.',
    },
    concept: 'Shared CMK across services + annual rotation for compliance.',
    docs: 'https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html',
  }),

  pq('saa-combo-043', {
    service: ['datasync','s3','efs','fsx'],
    scenario: 'An on-prem NFS server has 200TB of data to migrate to AWS. The team wants to copy continuously then cut over.',
    options: [
      'AWS DataSync agent on-prem with task scheduled to S3/EFS/FSx',
      'rsync over the internet',
      'Snowball Edge one-shot',
      'Storage Gateway file mode'],
    answer: 0,
    why: 'DataSync agent runs on-prem, talks to NFS/SMB, transfers at high speed (10× faster than open-source tools) with checksums + retry. Schedule recurring tasks for incremental sync until cutover.',
    wrongReasons: {
      1: 'rsync over internet is slow + no scheduling tools.',
      2: 'Snowball is great for one-shot bulk but not for continuous sync.',
      3: 'Storage Gateway is for hybrid live access, not migration.',
    },
    concept: 'AWS DataSync for high-speed scheduled on-prem-to-AWS migration.',
    docs: 'https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html',
  }),

  pq('saa-combo-044', {
    service: ['s3','batch','operations'],
    scenario: 'A company has 100 million S3 objects across multiple buckets. They need to invoke a Lambda on each one (for re-encryption, copy, tag, restore).',
    options: [
      'S3 Batch Operations with a Lambda action against an S3 Inventory manifest',
      'List objects manually + invoke Lambda one at a time',
      'Pay for SQS + custom orchestration',
      'Use Glue'],
    answer: 0,
    why: 'S3 Batch Operations runs an operation (Lambda, copy, tag, restore, etc.) against a manifest of objects. Built for this scale. Reports per-object results to S3.',
    wrongReasons: {
      1: 'Manual at 100M scale is impossible.',
      2: 'Custom orchestration re-implements Batch Ops poorly.',
      3: 'Glue is ETL, not per-object actions.',
    },
    concept: 'S3 Batch Operations for billions-of-objects automation.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/batch-ops.html',
  }),

  pq('saa-combo-045', {
    service: ['vpc','flow-logs','cloudwatch','athena'],
    scenario: 'Security needs queryable network traffic logs from a VPC for forensic investigation.',
    options: [
      'VPC Flow Logs to S3 (Parquet) → Athena for SQL queries',
      'VPC Flow Logs to CloudWatch only',
      'Custom packet capture on every instance',
      'CloudTrail'],
    answer: 0,
    why: 'Flow Logs → S3 (Parquet) + Athena gives cost-effective SQL queries against years of network metadata. Much cheaper than CloudWatch Logs for long retention.',
    wrongReasons: {
      1: 'CloudWatch Logs gets expensive at scale; Athena is more analyst-friendly.',
      2: 'Packet capture is invasive + heavy.',
      3: 'CloudTrail captures API calls, not network packets.',
    },
    concept: 'VPC Flow Logs → S3 + Athena for queryable network forensics.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html',
  }),

  pq('saa-combo-046', {
    service: ['s3','select','glacier','select'],
    scenario: 'A 50GB CSV in S3 has 10M rows but the analyst wants just 3 columns. The team wants to avoid downloading the whole file.',
    options: [
      'S3 Select — pushes the column-projection SQL into S3, returning only selected columns',
      'Download all 50GB then parse',
      'Move to DynamoDB',
      'Use Glacier Select'],
    answer: 0,
    why: 'S3 Select runs a SQL expression against an object IN PLACE in S3 and returns only matching rows/columns. Dramatically reduces data transferred + processing time + cost.',
    wrongReasons: {
      1: 'Downloading 50GB is wasteful.',
      2: 'DynamoDB migration is heavy + key-value vs columnar.',
      3: 'Glacier Select is the same idea but for Glacier-stored objects.',
    },
    concept: 'S3 Select for in-place query / projection.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/selecting-content-from-objects.html',
  }),

  pq('saa-combo-047', {
    service: ['cloudfront','origin-failover'],
    scenario: 'A CloudFront distribution has S3 as primary origin. Resilience requirement: if S3 returns 5xx, fall back to a secondary S3 in another region.',
    options: [
      'CloudFront Origin Group with primary + secondary S3, configured for failover on 5xx',
      'Manual switch in DNS',
      'Route 53 failover',
      'No failover support'],
    answer: 0,
    why: 'Origin Groups let CloudFront automatically retry the secondary origin when the primary returns specific error codes (4xx, 5xx). Both buckets configured + CloudFront fails over in seconds.',
    wrongReasons: {
      1: 'Manual DNS switch is slow.',
      2: 'R53 failover changes DNS — slower + caches.',
      3: 'CloudFront has supported origin failover for years.',
    },
    concept: 'CloudFront Origin Group failover.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html',
  }),

  pq('saa-combo-048', {
    service: ['rds','proxy','lambda'],
    scenario: 'A Lambda function connects to RDS Postgres. At high concurrency, RDS connection exhaustion errors appear.',
    options: [
      'Put RDS Proxy in front of RDS — Lambda connects to Proxy, which pools connections to RDS',
      'Increase RDS max_connections to 10000',
      'Move to DynamoDB',
      'Lambda concurrency limit only'],
    answer: 0,
    why: 'RDS Proxy pools + multiplexes connections to RDS. Lambda spawns thousands of concurrent invocations, each opens a Proxy connection but the Proxy holds only a small number to RDS. Solves Lambda+RDS connection storms.',
    wrongReasons: {
      1: 'High max_connections on small RDS = memory pressure.',
      2: 'DynamoDB migration is heavy.',
      3: 'Concurrency limit caps throughput unnecessarily.',
    },
    concept: 'RDS Proxy for Lambda connection pooling.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html',
  }),

  pq('saa-combo-049', {
    service: ['ec2','session-manager','ssm'],
    scenario: 'A team wants shell access to private EC2 instances WITHOUT a bastion host, SSH keys, or open inbound ports.',
    options: [
      'AWS Systems Manager Session Manager — browser/CLI shell via SSM agent, no SSH/port 22',
      'Bastion in public subnet + SSH',
      'EC2 Instance Connect (still needs port 22 open)',
      'Direct Connect'],
    answer: 0,
    why: 'Session Manager establishes a shell via the SSM agent (already on Amazon Linux 2 AMIs). No inbound ports, no SSH keys, full IAM control + session logging to S3/CloudWatch. The modern replacement for bastions.',
    wrongReasons: {
      1: 'Bastion = extra cost + exposed surface.',
      2: 'Instance Connect requires port 22 + bastion or public IP for direct.',
      3: 'DX is for hybrid networking, not shell.',
    },
    concept: 'Session Manager for keyless, port-less shell access.',
    docs: 'https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html',
  }),

  pq('saa-combo-050', {
    service: ['waf','shield','cloudfront','alb'],
    scenario: 'A public-facing app needs protection from large-scale DDoS attacks + OWASP application attacks.',
    options: [
      'CloudFront in front of ALB + AWS WAF Web ACL on the distribution + AWS Shield Advanced (24/7 DDoS response team)',
      'AWS Shield Standard only',
      'Custom EC2 firewall rules',
      'Larger ALB'],
    answer: 0,
    why: 'Shield Standard is automatic + free for L3/L4. Shield Advanced ($3000/mo + cost protection) adds L7 protection, 24/7 SRT, cost reimbursement during attacks. WAF on CloudFront blocks application-layer attacks at the edge.',
    wrongReasons: {
      1: 'Standard doesn\'t cover L7 + lacks SRT.',
      2: 'Custom firewall rules don\'t scale to volumetric DDoS.',
      3: 'Bigger ALB doesn\'t solve DDoS.',
    },
    concept: 'Defence-in-depth: CloudFront + WAF + Shield Advanced.',
    docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/ddos-overview.html',
  }),

  pq('saa-combo-051', {
    service: ['ec2','imdsv2','metadata'],
    scenario: 'A security audit found that EC2 instances are using IMDSv1, which is vulnerable to SSRF attacks for credential theft.',
    options: [
      'Enforce IMDSv2 via launch template / instance metadata options (HttpTokens=required)',
      'Disable instance metadata service entirely',
      'Allow only specific IPs to metadata service',
      'Trust the application'],
    answer: 0,
    why: 'IMDSv2 uses session-based tokens (PUT request to get a token, then GET with token header). Defeats SSRF attacks because attackers can\'t make PUT requests through most SSRF vulnerabilities. AWS recommends enforce IMDSv2.',
    wrongReasons: {
      1: 'Disabling metadata breaks instance profile credential delivery.',
      2: 'IP restrictions don\'t help against SSRF from the instance itself.',
      3: 'Trusting application code violates defence-in-depth.',
    },
    concept: 'IMDSv2 enforcement against SSRF credential theft.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-existing-instances.html',
  }),

  pq('saa-combo-052', {
    service: ['s3','presigned','expiry'],
    scenario: 'A web app needs to allow users to download files from a private S3 bucket. Each download link should expire after 15 minutes.',
    options: [
      'Backend generates S3 Presigned URLs with 15-minute expiry (Expires=900s) for each download',
      'Make the bucket public for download URLs',
      'Pass IAM credentials to the browser',
      'Use bucket ACLs per user'],
    answer: 0,
    why: 'Presigned URLs are time-limited, signed by the backend using its IAM credentials. The frontend never sees AWS credentials. Default lifetime is 15-60 minutes.',
    wrongReasons: {
      1: 'Public bucket defeats privacy.',
      2: 'Passing IAM credentials to browsers is a critical security failure.',
      3: 'Bucket ACLs don\'t scale to per-user dynamic permissions.',
    },
    concept: 'S3 Presigned URLs for time-limited private file access.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html',
  }),

  pq('saa-combo-053', {
    service: ['glue','crawler','catalog','athena'],
    scenario: 'A team dumps daily CSV files into an S3 prefix. They want Athena to query them without manually defining table schemas.',
    options: [
      'Glue Crawler scheduled daily → infers schema + creates/updates table in Glue Catalog → Athena queries it',
      'Manually CREATE TABLE in Athena',
      'Run Glue Job daily',
      'Use Redshift'],
    answer: 0,
    why: 'Glue Crawler scans S3 paths, infers schema (column names, types, partitions), and registers a table in the Glue Catalog. Athena uses the catalog automatically. Re-runs handle schema evolution.',
    wrongReasons: {
      1: 'Manual CREATE doesn\'t handle evolving schemas.',
      2: 'Glue Job is for ETL, not schema discovery.',
      3: 'Redshift is a different stack.',
    },
    concept: 'Glue Crawler → Catalog → Athena schema discovery pipeline.',
    docs: 'https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html',
  }),

  pq('saa-combo-054', {
    service: ['ec2','tagging','cost-allocation'],
    scenario: 'Finance needs to allocate AWS costs to 5 business units, each owning a mix of resources across services.',
    options: [
      'Define cost allocation tags (e.g. BusinessUnit) + activate in Billing + use Cost Explorer / CUR with tag filtering',
      'Separate AWS accounts per BU',
      'CloudWatch dashboards',
      'Manual spreadsheet'],
    answer: 0,
    why: 'Cost allocation tags applied consistently across resources + activated in the Billing console show up in Cost Explorer + Cost & Usage Report. Slice cost by tag value to attribute spend to BUs.',
    wrongReasons: {
      1: 'Separate accounts works (multi-account is even better long-term) but tags within a shared account are the quickest answer if accounts can\'t be split.',
      2: 'CloudWatch is for metrics, not billing.',
      3: 'Manual doesn\'t scale.',
    },
    concept: 'Cost allocation tags + Cost Explorer for chargeback.',
    docs: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html',
  }),

  pq('saa-combo-055', {
    service: ['s3','object-lock','compliance'],
    scenario: 'Compliance requires that financial records in S3 cannot be deleted or modified for 7 years — write-once-read-many (WORM).',
    options: [
      'S3 Object Lock in Compliance Mode with 7-year retention + Legal Hold capability',
      'IAM policy denying Delete*',
      'Versioning + Lifecycle',
      'Glacier Vault Lock'],
    answer: 0,
    why: 'S3 Object Lock in Compliance Mode cannot be removed even by the root account. Combined with a 7-year retention period, no one can delete or modify objects until expiry. Meets SEC 17a-4(f), FINRA, CFTC requirements.',
    wrongReasons: {
      1: 'IAM policies can be changed by admins — doesn\'t meet WORM compliance.',
      2: 'Versioning preserves history but allows deletion of versions.',
      3: 'Glacier Vault Lock is for Glacier-only; Object Lock is the broader S3 answer.',
    },
    concept: 'S3 Object Lock Compliance Mode for WORM.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html',
  }),

  pq('saa-combo-056', {
    service: ['dynamodb','accelerator','dax','cache'],
    scenario: 'A DynamoDB-backed app has sub-10ms read latency but the use case requires sub-millisecond. Read patterns are repetitive.',
    options: [
      'DynamoDB Accelerator (DAX) — in-memory cache cluster for DynamoDB, sub-millisecond reads',
      'ElastiCache for Redis manually integrated',
      'Switch to RDS',
      'Add GSIs'],
    answer: 0,
    why: 'DAX is DynamoDB-native caching that sits transparently in front of tables. Sub-millisecond reads for cached items, automatic cache invalidation on writes. Drop-in for DynamoDB SDK.',
    wrongReasons: {
      1: 'ElastiCache works but requires explicit cache logic + manual invalidation.',
      2: 'RDS doesn\'t solve latency.',
      3: 'GSIs don\'t reduce per-query latency.',
    },
    concept: 'DAX for sub-millisecond DynamoDB reads.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html',
  }),

  pq('saa-combo-057', {
    service: ['s3','transfer-acceleration','global-upload'],
    scenario: 'Users worldwide upload large files to an S3 bucket in us-east-1. APAC and EMEA users see slow upload speeds.',
    options: [
      'S3 Transfer Acceleration — uploads routed via nearest CloudFront edge to S3',
      'Multiple buckets per region',
      'Multipart upload only',
      'Use FTP'],
    answer: 0,
    why: 'Transfer Acceleration uses CloudFront\'s edge network to terminate uploads locally, then ferries data over AWS backbone to the bucket\'s home region. Up to 500% faster for far-from-bucket clients.',
    wrongReasons: {
      1: 'Multiple buckets adds management overhead + cross-region sync.',
      2: 'Multipart upload helps reliability but not necessarily speed across continents.',
      3: 'FTP is slower + insecure.',
    },
    concept: 'S3 Transfer Acceleration for global upload latency.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html',
  }),

  pq('saa-combo-058', {
    service: ['ec2','dedicated-host','license'],
    scenario: 'A company brings their own Windows Server licences with per-socket licensing requirements. They need EC2 with visibility into physical sockets.',
    options: [
      'EC2 Dedicated Hosts — physical server visibility, BYOL compatible',
      'Dedicated Instances',
      'Shared tenancy',
      'Lambda'],
    answer: 0,
    why: 'Dedicated Hosts expose the physical host (sockets, cores) — required for per-socket / per-core BYOL licensing models. Dedicated Instances give isolation but not host-level visibility.',
    wrongReasons: {
      1: 'Dedicated Instances isolate at hardware level but don\'t expose socket info.',
      2: 'Shared tenancy = no licence compliance.',
      3: 'Lambda doesn\'t support BYOL OS.',
    },
    concept: 'Dedicated Hosts for BYOL with per-socket licensing.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-overview.html',
  }),

  pq('saa-combo-059', {
    service: ['s3','event','sqs','lambda','fanout'],
    scenario: 'A team has unreliable Lambda processing of S3 events — sometimes the Lambda fails and events are lost.',
    options: [
      'S3 Events → SQS → Lambda — SQS persists events + retries on Lambda failure + DLQ for permanent failures',
      'S3 Events → Lambda directly (existing)',
      'Polling',
      'Periodic ListObjects'],
    answer: 0,
    why: 'Putting SQS between S3 and Lambda decouples ingestion from processing. Failed processing returns the message to SQS for retry. After maxReceiveCount, it goes to DLQ for investigation. No events lost.',
    wrongReasons: {
      1: 'Direct S3 → Lambda has limited retry; persistent failures get lost.',
      2: 'Polling wastes resources.',
      3: 'Periodic ListObjects misses events between polls.',
    },
    concept: 'SQS between S3 and Lambda for retry + DLQ resilience.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/ways-to-add-notification-config-to-bucket.html',
  }),

  pq('saa-combo-060', {
    service: ['route53','health-check','calculated'],
    scenario: 'A Route 53 record needs to be healthy only if BOTH the primary endpoint AND its database backend are healthy.',
    options: [
      'Route 53 Calculated Health Check combining the two child health checks with AND logic',
      'Single endpoint health check',
      'CloudWatch alarm on both then update DNS manually',
      'Lambda-based custom logic'],
    answer: 0,
    why: 'Calculated Health Checks combine N child health checks with thresholds (e.g. 2 out of 2 healthy = parent healthy). Used to express compound liveness.',
    wrongReasons: {
      1: 'Single check doesn\'t reflect DB health.',
      2: 'Manual is slow.',
      3: 'Lambda re-invents what Calculated does natively.',
    },
    concept: 'Route 53 Calculated Health Checks for compound liveness.',
    docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-creating-deleting.html',
  }),

  pq('saa-combo-061', {
    service: ['ec2','reserved-instances','savings-plans','cost'],
    scenario: 'A workload runs 24/7 on EC2 m5.xlarge with predictable usage for the next 3 years. The team wants maximum cost savings + flexibility to change instance types.',
    options: [
      'Compute Savings Plans (1- or 3-year, applies to EC2 / Fargate / Lambda + any region + any instance family)',
      'Standard Reserved Instances (locked to family)',
      'On-Demand',
      'Spot only'],
    answer: 0,
    why: 'Compute Savings Plans give up to 66% off On-Demand AND apply to ANY EC2 family, ANY region, plus Fargate and Lambda. Maximum flexibility for predictable spend. Standard RIs give a slightly higher discount but lock you into family/region.',
    wrongReasons: {
      1: 'Standard RIs lock to instance family — less flexible than Compute SP.',
      2: 'On-Demand is the most expensive option for predictable usage.',
      3: 'Spot is cheap but interruptible — not for 24/7 reliability.',
    },
    concept: 'Compute Savings Plans for predictable spend with flexibility.',
    docs: 'https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html',
  }),

  pq('saa-combo-062', {
    service: ['fsx','windows','smb','ad'],
    scenario: 'A Windows-based application needs SMB file shares integrated with on-prem Active Directory.',
    options: [
      'Amazon FSx for Windows File Server — native SMB, AD-integrated, NTFS ACLs',
      'EFS (Linux/NFS only)',
      'S3 mounted as filesystem',
      'EBS'],
    answer: 0,
    why: 'FSx for Windows is purpose-built for Windows workloads. Native SMB protocol, joins on-prem AD via AWS Managed AD or AD Connector, supports NTFS ACLs, DFS, shadow copies.',
    wrongReasons: {
      1: 'EFS is NFS only — Windows clients can\'t mount it natively.',
      2: 'S3 mounted via fuse is not NTFS-semantic.',
      3: 'EBS is block storage — not a file share.',
    },
    concept: 'FSx for Windows for AD-integrated SMB.',
    docs: 'https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html',
  }),

  pq('saa-combo-063', {
    service: ['fsx','lustre','hpc'],
    scenario: 'A genomics pipeline needs sub-millisecond file system latency + hundreds of GB/s throughput for HPC compute.',
    options: [
      'Amazon FSx for Lustre — purpose-built HPC file system',
      'EFS',
      'S3',
      'EBS'],
    answer: 0,
    why: 'FSx for Lustre is the HPC-optimised file system on AWS. Sub-ms latency, hundreds of GB/s throughput, integrates with S3 for in/out staging. Designed for genomics, ML, video, financial modelling.',
    wrongReasons: {
      1: 'EFS scales but is general-purpose; not HPC-tier.',
      2: 'S3 is object storage, not POSIX file system.',
      3: 'EBS is per-instance block storage, not shared.',
    },
    concept: 'FSx for Lustre for HPC throughput.',
    docs: 'https://docs.aws.amazon.com/fsx/latest/LustreGuide/what-is.html',
  }),

  pq('saa-combo-064', {
    service: ['sqs','fifo','order','dedup'],
    scenario: 'A payment processor must process transactions IN ORDER and exactly once for each customer.',
    options: [
      'SQS FIFO queue with messageGroupId = customerId + content-based deduplication',
      'SQS Standard queue',
      'SNS Standard topic',
      'No queue'],
    answer: 0,
    why: 'FIFO queues guarantee in-order delivery WITHIN A MESSAGE GROUP (per-customer). Content-based dedup (or explicit dedup ID) ensures exactly-once. Throughput up to 3000 msg/s per group, 300 per group without batching.',
    wrongReasons: {
      1: 'Standard offers best-effort ordering + at-least-once.',
      2: 'SNS Standard same as SQS Standard.',
      3: 'No queue = tight coupling.',
    },
    concept: 'SQS FIFO + messageGroupId + dedup for ordered exactly-once.',
    docs: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html',
  }),

  pq('saa-combo-065', {
    service: ['ebs','io2','iops','database'],
    scenario: 'A high-performance OLTP database on EC2 needs guaranteed 80,000 IOPS with sub-millisecond latency.',
    options: [
      'EBS io2 Block Express volume — up to 256k IOPS + sub-ms latency + 99.999% durability',
      'gp3 with max IOPS',
      'st1 (HDD)',
      'Instance Store'],
    answer: 0,
    why: 'io2 Block Express is the highest-performance EBS tier: up to 256k IOPS, sub-millisecond latency, 99.999% durability. Designed for mission-critical I/O-intensive databases (Oracle, SAP HANA, MS SQL).',
    wrongReasons: {
      1: 'gp3 max IOPS = 16k — insufficient.',
      2: 'st1 is throughput-optimised HDD — slow for OLTP.',
      3: 'Instance Store is ephemeral — data lost on stop/terminate.',
    },
    concept: 'EBS io2 Block Express for highest-IOPS OLTP.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/provisioned-iops.html',
  }),

  pq('saa-combo-066', {
    service: ['s3','sse-c','byok'],
    scenario: 'A client demands they keep the encryption key fully on their side — AWS must NEVER see the unencrypted key material.',
    options: [
      'S3 with SSE-C (Server-Side Encryption with Customer-provided keys) — client sends key with every request, AWS encrypts/decrypts then discards key',
      'S3 with SSE-S3',
      'S3 with SSE-KMS',
      'Client-side encryption only'],
    answer: 0,
    why: 'SSE-C lets the client provide the encryption key on each request. AWS uses it to encrypt/decrypt then discards. AWS never stores the key. Client retains key management.',
    wrongReasons: {
      1: 'SSE-S3 uses AWS-managed keys.',
      2: 'SSE-KMS uses KMS-managed keys (in AWS).',
      3: 'Client-side works but SSE-C is the canonical answer when the client wants AWS to do the encryption with their key.',
    },
    concept: 'S3 SSE-C for customer-held encryption keys.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html',
  }),

  pq('saa-combo-067', {
    service: ['s3','vpc-endpoint','cross-account'],
    scenario: 'A private EC2 in Account A needs to access an S3 bucket in Account B. Bucket policy already allows Account A.',
    options: [
      'S3 Gateway Endpoint in Account A\'s VPC + endpoint policy allowing the cross-account bucket',
      'NAT Gateway',
      'VPC peering',
      'Direct internet'],
    answer: 0,
    why: 'S3 Gateway Endpoints can access S3 buckets in ANY account (subject to bucket + endpoint policies). Adding the cross-account bucket ARN to the endpoint policy lets EC2 reach it privately + freely.',
    wrongReasons: {
      1: 'NAT Gateway is paid data processing.',
      2: 'VPC peering is for VPC-to-VPC, not S3 access.',
      3: 'Direct internet costs NAT GW or public IP.',
    },
    concept: 'S3 Gateway Endpoint policy for cross-account bucket access.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html',
  }),

  pq('saa-combo-068', {
    service: ['guardduty','cloudtrail','vpc-flow','dns'],
    scenario: 'Security wants ML-based threat detection across CloudTrail events, VPC Flow Logs, and DNS queries — without setting up infrastructure.',
    options: [
      'Amazon GuardDuty — fully-managed threat detection ingesting all three data sources',
      'Custom SIEM on EC2',
      'CloudWatch metric alarms only',
      'Inspector'],
    answer: 0,
    why: 'GuardDuty is the AWS-native managed threat detection. Continuously analyses CloudTrail management/data events, VPC Flow Logs, and Route 53 DNS query logs using ML. Findings categorised by severity.',
    wrongReasons: {
      1: 'Custom SIEM = significant engineering.',
      2: 'CloudWatch alarms aren\'t threat detection.',
      3: 'Inspector is for vulnerability scanning, not behavioural threat detection.',
    },
    concept: 'GuardDuty for managed ML-based threat detection.',
    docs: 'https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html',
  }),

  pq('saa-combo-069', {
    service: ['macie','s3','pii'],
    scenario: 'A team must find PII (names, addresses, SSNs) across thousands of S3 buckets.',
    options: [
      'Amazon Macie — ML-based PII discovery for S3, reports findings + risk',
      'Manual scripts running grep',
      'GuardDuty',
      'Athena queries'],
    answer: 0,
    why: 'Macie is purpose-built to discover sensitive data (PII, credentials, financial) in S3 using ML + managed identifiers. Provides risk findings, dashboards, automated continuous scanning.',
    wrongReasons: {
      1: 'Scripts can\'t handle the breadth of PII patterns Macie covers.',
      2: 'GuardDuty is for threat detection, not PII discovery.',
      3: 'Athena queries require knowing structure ahead of time.',
    },
    concept: 'Amazon Macie for S3 PII / sensitive data discovery.',
    docs: 'https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html',
  }),

  pq('saa-combo-070', {
    service: ['inspector','ec2','ecr','vulnerability'],
    scenario: 'A team needs continuous vulnerability assessment for their EC2 instances + container images in ECR.',
    options: [
      'Amazon Inspector v2 — continuous scanning of EC2 + ECR images for CVEs + network reachability',
      'Manual scanning',
      'GuardDuty',
      'Trusted Advisor'],
    answer: 0,
    why: 'Inspector v2 is the AWS-native vulnerability scanner. Continuously scans EC2 instances + ECR container images for CVEs, network exposure, and software vulnerabilities. Findings prioritised by severity.',
    wrongReasons: {
      1: 'Manual scans don\'t stay current.',
      2: 'GuardDuty is behavioural threat detection, not CVE scanning.',
      3: 'Trusted Advisor checks AWS config, not OS-level CVEs.',
    },
    concept: 'Amazon Inspector v2 for EC2 + ECR vulnerability scanning.',
    docs: 'https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html',
  }),

  pq('saa-combo-071', {
    service: ['vpc','nat-gateway','egress-only','ipv6'],
    scenario: 'IPv6 EC2 instances in a private subnet need outbound internet access (no inbound).',
    options: [
      'Egress-Only Internet Gateway (IPv6 equivalent of NAT Gateway)',
      'NAT Gateway (IPv4 only)',
      'Standard Internet Gateway',
      'VPN'],
    answer: 0,
    why: 'Egress-Only Internet Gateway is IPv6-specific: allows outbound IPv6 traffic + blocks unsolicited inbound. NAT Gateway and standard IGW operate on IPv4.',
    wrongReasons: {
      1: 'NAT Gateway is IPv4 only.',
      2: 'Standard IGW allows inbound — defeats security.',
      3: 'VPN is for site-to-site, not general internet egress.',
    },
    concept: 'Egress-Only Internet Gateway for IPv6 outbound.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html',
  }),

  pq('saa-combo-072', {
    service: ['s3','requester-pays'],
    scenario: 'A company publishes a large public dataset on S3. They want the DOWNLOADER to pay for data transfer, not the publisher.',
    options: [
      'Enable S3 Requester Pays on the bucket — downloaders include x-amz-request-payer header + are billed',
      'Make bucket public — publisher pays',
      'Charge users separately',
      'Use CloudFront'],
    answer: 0,
    why: 'Requester Pays shifts data transfer + request costs to the downloader (who must include the x-amz-request-payer header). Publisher only pays for storage. Ideal for open datasets (e.g. AWS Public Datasets).',
    wrongReasons: {
      1: 'Publisher pays all costs.',
      2: 'Out-of-band billing is impractical.',
      3: 'CloudFront still charges the distribution owner.',
    },
    concept: 'S3 Requester Pays for downloader-billed datasets.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html',
  }),

  pq('saa-combo-073', {
    service: ['lambda','layers','dependencies'],
    scenario: 'Multiple Lambda functions share a common 20MB dependency layer. Currently each function deploys with the dep embedded.',
    options: [
      'Lambda Layers — publish the dependency as a layer, attach to all functions',
      'S3 download at runtime',
      'Container image Lambdas only',
      'Smaller dependencies'],
    answer: 0,
    why: 'Layers let multiple functions share libraries without duplicating in each deployment package. Up to 5 layers per function, max 250MB unzipped total.',
    wrongReasons: {
      1: 'Runtime S3 download adds cold-start latency.',
      2: 'Container images work but Layers are simpler for shared deps.',
      3: 'Smaller deps may not be possible.',
    },
    concept: 'Lambda Layers for shared dependency reuse.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html',
  }),

  pq('saa-combo-074', {
    service: ['cloudwatch','metric-filter','logs'],
    scenario: 'A team wants to alert when "ERROR" appears more than 10 times per minute in application logs.',
    options: [
      'CloudWatch Logs Metric Filter on "ERROR" pattern → publishes metric → CloudWatch Alarm threshold ≥10/min',
      'Manual log review',
      'Lambda polling logs',
      'X-Ray'],
    answer: 0,
    why: 'Metric Filters scan log events for patterns and publish to a CloudWatch metric. Set an alarm on that metric for automated alerting. No code required.',
    wrongReasons: {
      1: 'Manual review doesn\'t alert.',
      2: 'Lambda polling re-invents Metric Filters.',
      3: 'X-Ray is for distributed tracing, not log pattern matching.',
    },
    concept: 'CloudWatch Logs Metric Filter + Alarm for log-pattern alerts.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html',
  }),

  pq('saa-combo-075', {
    service: ['s3','mountpoint','fs'],
    scenario: 'A team has an HPC workload that needs to read large S3 objects as if they were local files, without modifying the application.',
    options: [
      'Mountpoint for Amazon S3 — open-source POSIX-like file system client for S3',
      'EFS',
      'FSx for Lustre data repository',
      'Manual download + read'],
    answer: 0,
    why: 'Mountpoint for S3 is an AWS-developed file client that lets applications read/write S3 objects via standard file APIs. High throughput, no migration of data. (FSx Lustre data repository is also valid but heavier.)',
    wrongReasons: {
      1: 'EFS is a separate file system, not direct S3.',
      2: 'FSx Lustre with DRA is valid but heavier than Mountpoint for read-heavy.',
      3: 'Manual download is one-shot, not file-API.',
    },
    concept: 'Mountpoint for S3 for POSIX-like S3 access.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mountpoint.html',
  }),

  pq('saa-combo-076', {
    service: ['cloudwatch','synthetics','canary','dashboard'],
    scenario: 'A team wants to monitor an end-to-end checkout flow + alert on failures + see a status dashboard.',
    options: [
      'CloudWatch Synthetics Canary (Puppeteer script) → CloudWatch metric → Alarm + Dashboard',
      'Manual testing',
      'X-Ray only',
      'GuardDuty'],
    answer: 0,
    why: 'Synthetics canaries simulate user journeys on a schedule. Each step produces metrics + screenshots. Failures fire alarms. Plot canary success in Dashboards.',
    wrongReasons: {
      1: 'Manual testing isn\'t continuous.',
      2: 'X-Ray traces real requests, not synthetic.',
      3: 'GuardDuty is security.',
    },
    concept: 'Synthetics Canary + Alarm + Dashboard for journey monitoring.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html',
  }),

  pq('saa-combo-077', {
    service: ['cloudformation','drift-detection'],
    scenario: 'A platform team wants to detect when someone has manually changed AWS resources outside of CloudFormation stacks.',
    options: [
      'CloudFormation Drift Detection — compares actual state to template, reports drift per resource',
      'CloudTrail event search',
      'Trusted Advisor',
      'Manual review of templates'],
    answer: 0,
    why: 'Drift Detection runs on demand or scheduled; compares each resource\'s actual config to the stack template. Reports drift status (in sync / drifted / not checked) per resource for remediation.',
    wrongReasons: {
      1: 'CloudTrail logs every change but doesn\'t compare to expected state.',
      2: 'Trusted Advisor doesn\'t check CFN drift.',
      3: 'Manual review doesn\'t scale.',
    },
    concept: 'CloudFormation Drift Detection for IaC consistency.',
    docs: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html',
  }),

  pq('saa-combo-078', {
    service: ['route53','resolver','hybrid','dns'],
    scenario: 'On-prem resources need to resolve AWS Route 53 private hosted zones AND vice versa.',
    options: [
      'Route 53 Resolver Inbound (on-prem → AWS) + Outbound (AWS → on-prem) endpoints',
      'Manual DNS forwarding',
      'CloudFront',
      'Direct Connect alone'],
    answer: 0,
    why: 'Route 53 Resolver Endpoints expose Route 53 to on-prem (Inbound) and let AWS forward to on-prem DNS (Outbound). Combined with DX/VPN, gives full hybrid DNS resolution.',
    wrongReasons: {
      1: 'Manual forwarding is fragile + per-resolver config.',
      2: 'CloudFront isn\'t DNS.',
      3: 'DX alone gives connectivity, not DNS resolution.',
    },
    concept: 'Route 53 Resolver Inbound/Outbound for hybrid DNS.',
    docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html',
  }),

  pq('saa-combo-079', {
    service: ['bedrock','rag','opensearch','s3'],
    scenario: 'A company wants a chatbot answering questions about their internal documentation. Documents live in S3.',
    options: [
      'Bedrock Knowledge Bases: index S3 docs into OpenSearch Serverless vector store + RAG with a Bedrock LLM',
      'Train custom LLM',
      'Send full docs to LLM each query',
      'Use Comprehend'],
    answer: 0,
    why: 'Bedrock Knowledge Bases automate RAG: ingest S3 → chunk + embed → store in vector DB (OpenSearch Serverless / Pinecone / etc.) → RetrieveAndGenerate API does retrieval + LLM call. No infra to manage.',
    wrongReasons: {
      1: 'Custom training is months of work + cost.',
      2: 'Full doc in context blows token limits + cost.',
      3: 'Comprehend is NLU, not generative.',
    },
    concept: 'Bedrock Knowledge Bases + OpenSearch for managed RAG.',
    docs: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html',
  }),

  pq('saa-combo-080', {
    service: ['cloudtrail','s3','log','validation'],
    scenario: 'A SecOps team needs forensically-sound CloudTrail logs — provably untampered for audit.',
    options: [
      'CloudTrail with log file integrity validation enabled + delivered to a dedicated S3 bucket with Object Lock',
      'Default CloudTrail to home account',
      'Manual review',
      'Disable CloudTrail'],
    answer: 0,
    why: 'Log file integrity validation produces a signed digest file every hour. Combined with delivery to a tightly-locked S3 bucket (Object Lock + restricted policy + separate log-archive account) gives audit-grade integrity.',
    wrongReasons: {
      1: 'Default home-account delivery is vulnerable to admin tampering.',
      2: 'Manual review doesn\'t prove integrity.',
      3: 'Disabling defeats the purpose.',
    },
    concept: 'CloudTrail log file validation + Object Lock for forensic integrity.',
    docs: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html',
  }),
];
