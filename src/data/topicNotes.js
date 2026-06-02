/**
 * topicNotes.js — quick-reference study notes for every AWS service on
 * the Topic-Level Performance grid. Surfaced inline on the heatmap tile
 * + linked to the Learning Lab for deeper coverage.
 *
 * Schema:
 *   id: matches TOPIC_SERVICES.id
 *   oneLine: 1-sentence summary
 *   keyFacts[]: 4-6 bullet "must know for the exam" facts
 *   examTraps[]: 2-4 common wrong-answer patterns testers fall for
 *   docs: AWS docs deep link
 */

export const TOPIC_NOTES = {
  ec2: {
    oneLine: 'Virtual servers — full OS control. Pay per second on most instance types.',
    keyFacts: [
      'Instance families: T (burstable), M (general), C (compute), R (RAM-heavy), I (storage I/O), G/P (GPU)',
      'Pricing: On-Demand (no commit), Reserved (1-3yr), Savings Plans (flexible), Spot (up to 90% off, interruptible)',
      'Placement groups: Cluster (low latency, 1 AZ), Spread (HA, 1 instance/rack), Partition (HDFS-style)',
      'User data: bash/PowerShell that runs once on first boot',
      'AMI vs Snapshot: AMI = full bootable image (instance template); Snapshot = point-in-time backup of an EBS volume',
    ],
    examTraps: [
      'Spot is NOT for stateful workloads — interrupted with 2-minute warning',
      'Reserved Instances commit even when stopped — Savings Plans are more flexible',
      'You CAN stop an EBS-backed instance (no compute charge), but cannot stop instance-store-backed instances',
    ],
    docs: 'https://docs.aws.amazon.com/ec2/',
  },
  s3: {
    oneLine: 'Object storage. 11 nines of durability. Globally unique bucket names.',
    keyFacts: [
      'Storage classes: Standard, IA, One Zone-IA, Intelligent-Tiering, Glacier Instant/Flexible/Deep Archive',
      'Lifecycle: auto-transition objects between classes; expire/delete on schedule',
      'Versioning: MFA Delete adds protection; once enabled can only be suspended (not removed)',
      'Encryption: SSE-S3 (free), SSE-KMS (audit), SSE-C (customer key), or client-side',
      'Transfer Acceleration uses CloudFront edge for fast global uploads (extra cost)',
      'Bucket policies (JSON) vs IAM policies (user-attached) vs ACLs (legacy, avoid)',
    ],
    examTraps: [
      'Bucket names are GLOBALLY unique — not per-account',
      'Strong read-after-write consistency for ALL operations (since Dec 2020)',
      'Public access default: BLOCKED via account-level Block Public Access since 2023',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonS3/',
  },
  vpc: {
    oneLine: 'Your isolated network in AWS. CIDR-based, region-scoped, with subnets per AZ.',
    keyFacts: [
      'Subnet types: Public (IGW route), Private (NAT-only egress), Isolated (no internet)',
      'Security Groups: stateful, instance-level, ALLOW only — implicit deny',
      'NACLs: stateless, subnet-level, ALLOW + DENY rules, evaluated in order by rule #',
      'Gateway VPC Endpoints: S3 + DynamoDB only, FREE',
      'Interface VPC Endpoints: PrivateLink, paid per AZ + GB',
      'Transit Gateway: hub-and-spoke at scale; supports multi-region peering',
    ],
    examTraps: [
      'VPC peering is NOT transitive — A↔B and B↔C does NOT give A↔C',
      'NAT Gateway costs $0.045/hr + $0.045/GB — expensive at scale',
      'Default Network ACL allows all in + all out; custom NACL denies all by default',
    ],
    docs: 'https://docs.aws.amazon.com/vpc/',
  },
  rds: {
    oneLine: 'Managed relational DB — MySQL, Postgres, MariaDB, Oracle, SQL Server, Aurora.',
    keyFacts: [
      'Multi-AZ = HA (sync standby in 2nd AZ, automatic failover, NOT readable)',
      'Read Replicas = read scaling (async, can be promoted, cross-region OK)',
      'Backup: automated daily + manual snapshots; PITR up to 35 days',
      'Encryption at rest = KMS (cannot encrypt an unencrypted instance — restore from encrypted snapshot)',
      'Performance Insights: free for 7-day retention, view top SQL by load',
    ],
    examTraps: [
      'Multi-AZ standby is NOT a read endpoint — use Read Replicas for read scaling',
      'Cannot enable encryption on an existing unencrypted DB — snapshot, copy as encrypted, restore',
      'Aurora has 6 storage copies across 3 AZs by default — different from RDS',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonRDS/',
  },
  lambda: {
    oneLine: 'Serverless functions. Event-driven. Pay per invocation + GB-seconds.',
    keyFacts: [
      'Max runtime: 15 min; max memory 10GB; max payload 6MB sync / 256KB async',
      'Cold start: first invocation after idle — minimised by Provisioned Concurrency',
      'Concurrency: 1,000 default account limit; reserved concurrency caps per-function',
      'VPC: function gets ENI in subnets; needs NAT for internet egress',
      '1M requests + 400k GB-sec FREE forever',
    ],
    examTraps: [
      'Lambda in public subnet gets NO public IP — still needs NAT Gateway for internet',
      'Synchronous (API Gateway) max 6MB payload — for larger use S3 presigned URLs',
      '@edge has stricter limits (1MB code, 5 sec timeout for viewer events)',
    ],
    docs: 'https://docs.aws.amazon.com/lambda/',
  },
  dynamodb: {
    oneLine: 'Serverless NoSQL key-value + document store. Single-digit ms latency.',
    keyFacts: [
      'Primary key = partition key (HASH) ± sort key (RANGE)',
      'GSI (Global Secondary Index): different partition key, own throughput',
      'LSI (Local Secondary Index): same PK, different sort key — must be created with table',
      'Capacity modes: On-Demand (pay per request) vs Provisioned (RCU/WCU)',
      'Streams: 24-hour rolling log of changes; integrates with Lambda',
      '25 GB + 25 RCU/WCU FREE forever (provisioned mode)',
    ],
    examTraps: [
      'Cannot add LSI after table creation — only GSI',
      'Hot partition: one PK getting too much traffic — solve with key sharding',
      'Scan is expensive — always prefer Query against PK / GSI',
    ],
    docs: 'https://docs.aws.amazon.com/amazondynamodb/',
  },
  alb: {
    oneLine: 'Application Load Balancer — L7 HTTP/HTTPS, path & host routing.',
    keyFacts: [
      'Layer 7 — routes by path, host, header, query string, source IP',
      'Targets: EC2, IP, Lambda, containers (ECS/EKS)',
      'Sticky sessions: cookie-based, optional',
      'WAF + Shield Standard integrate natively',
      'NLB = Layer 4 (TCP/UDP), millions of req/sec, static IP, NO WAF',
    ],
    examTraps: [
      'ALB does NOT support UDP — use NLB',
      'ALB needs at least 2 AZs',
      'Connection draining is now called "deregistration delay" (default 300s)',
    ],
    docs: 'https://docs.aws.amazon.com/elasticloadbalancing/',
  },
  asg: {
    oneLine: 'Auto Scaling Group — automatically launches/terminates EC2 to meet demand.',
    keyFacts: [
      'Scaling policies: Target tracking, Step scaling, Simple scaling, Scheduled scaling',
      'Mixed-instances: % On-Demand baseline + % Spot for cost optimisation',
      'Health checks: EC2 or ELB; unhealthy = terminate + relaunch',
      'Cooldown: pause between scaling actions to let metric settle',
      'Lifecycle hooks: pause launch/terminate for custom actions (e.g. drain)',
    ],
    examTraps: [
      'Target tracking is the recommended default — step scaling for complex cases',
      'Min/Max/Desired: Desired must be between Min and Max',
      'Suspended processes don\'t auto-resume — must manually resume',
    ],
    docs: 'https://docs.aws.amazon.com/autoscaling/',
  },
  cloudfront: {
    oneLine: 'Global CDN. 400+ edge locations. HTTPS, caching, DDoS protection.',
    keyFacts: [
      'Origins: S3, ALB, EC2, MediaPackage, any HTTP server',
      'Cache behaviours: per path-pattern (e.g. /images/* vs /api/*)',
      'OAI / OAC: lock down S3 origin so only CloudFront can read',
      'Signed URLs / Cookies: time-limited access to specific paths',
      'Lambda@Edge runs at the edge for request manipulation',
      '1 TB out + 10M requests FREE per month, perpetual',
    ],
    examTraps: [
      'CloudFront SSL certs MUST be in us-east-1 (ACM)',
      'Invalidations cost $0.005 per path after the first 1000/month',
      'Custom domain needs Route 53 ALIAS or CNAME pointing to *.cloudfront.net',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/',
  },
  route53: {
    oneLine: 'Managed DNS + domain registrar. Health-checks + routing policies.',
    keyFacts: [
      'Routing policies: Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-value',
      'Health checks: HTTP/HTTPS/TCP every 10 or 30 sec from multiple regions',
      'ALIAS records: AWS-only, point to AWS resources, free queries',
      'Public vs Private hosted zones (private resolves inside VPC only)',
      'TTL: lower = faster failover, higher = lower query cost',
    ],
    examTraps: [
      'ALIAS records work for ROOT domain (CNAME does not)',
      'Failover routing requires PRIMARY to have a health check',
      'Geolocation falls back to default record when no match',
    ],
    docs: 'https://docs.aws.amazon.com/Route53/',
  },
  sqs: {
    oneLine: 'Managed message queue. Decouples producers from consumers.',
    keyFacts: [
      'Standard: at-least-once, best-effort ordering, unlimited throughput',
      'FIFO: exactly-once, strict ordering, 3000 msg/sec with batching',
      'Visibility timeout: how long a message is hidden after a receiver picks it up',
      'DLQ: messages that fail processing N times move to a Dead-Letter Queue',
      'Long polling: WaitTimeSeconds up to 20s — reduces empty receives',
    ],
    examTraps: [
      'Standard queue may deliver duplicates — consumers must be idempotent',
      'Max message size 256KB — for larger use S3 + SQS pointer pattern',
      'Visibility timeout too short = duplicate processing; too long = slow retries',
    ],
    docs: 'https://docs.aws.amazon.com/AWSSimpleQueueService/',
  },
  sns: {
    oneLine: 'Pub/sub fan-out. One message → many subscribers (Lambda, SQS, HTTP, SMS, email).',
    keyFacts: [
      'Topics: subscribers attach to topics; one publish triggers all',
      'Subscription types: SQS, Lambda, HTTP/S, email, SMS, mobile push',
      'Message filtering: subscribers filter by message attributes',
      'FIFO topics + FIFO SQS subscribers preserve ordering',
      'Application + delivery retries with exponential backoff',
    ],
    examTraps: [
      'SNS does NOT store messages — if no subscriber, message is lost',
      'SNS + SQS fanout is the canonical pattern for multi-consumer events',
      'SMS delivery is per-message paid + has country-specific opt-in',
    ],
    docs: 'https://docs.aws.amazon.com/sns/',
  },
  iam: {
    oneLine: 'Identity & Access Management. Users, roles, policies, federation.',
    keyFacts: [
      'Principals: users, groups, roles, federated identities',
      'Policy types: Identity-based (attached to user/role), Resource-based (attached to S3 bucket etc.), SCP (org-wide guard)',
      'Roles for EC2/Lambda — never embed access keys',
      'Cross-account access: trust policy in account A + AssumeRole from account B',
      'MFA: required on root + recommended on all human IAM users',
    ],
    examTraps: [
      'Explicit DENY always wins over ALLOW',
      'SCPs do NOT grant permissions — they limit what identity policies CAN grant',
      'IAM is global — no region selection needed',
    ],
    docs: 'https://docs.aws.amazon.com/IAM/',
  },
  kms: {
    oneLine: 'Key Management Service. Generate, store, audit cryptographic keys.',
    keyFacts: [
      'CMK types: AWS-managed (free, AWS rotates), Customer-managed (you control)',
      'Multi-Region keys: same key material across regions, separately auditable',
      'Envelope encryption: data encrypted with data key, data key encrypted by CMK',
      'Key policies + IAM policies + grants — three layers of access control',
      'Auto-rotation: annually for symmetric customer-managed keys',
    ],
    examTraps: [
      'KMS keys are REGIONAL — multi-region keys are the exception',
      'You CANNOT export key material (security feature) — you CAN import once',
      '$1/month per customer-managed CMK + $0.03 per 10k requests',
    ],
    docs: 'https://docs.aws.amazon.com/kms/',
  },
  ecs: {
    oneLine: 'Elastic Container Service. Run Docker containers on EC2 or Fargate.',
    keyFacts: [
      'Launch types: EC2 (you manage capacity) or Fargate (serverless)',
      'Task definition: container spec, CPU/RAM, image, env vars, secrets',
      'Service: long-running tasks behind a load balancer; auto-replaces failed tasks',
      'IAM roles: Task Execution Role (pull image) vs Task Role (app permissions)',
      'Service discovery via Cloud Map + ALB',
    ],
    examTraps: [
      'Fargate has no SSH — use ECS Exec for shell access',
      'awsvpc network mode = each task gets its own ENI (limits task density)',
      'Service auto-scaling = Application Auto Scaling, not ASG',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonECS/',
  },
  eks: {
    oneLine: 'Managed Kubernetes. Control plane handled by AWS. You manage node groups (or use Fargate).',
    keyFacts: [
      'Control plane $0.10/hr per cluster (~$73/mo) — always-on cost',
      'Node groups: Managed (AWS provisions), Self-managed (you create), or Fargate',
      'IAM Roles for Service Accounts (IRSA) = OIDC integration',
      'AWS Load Balancer Controller creates ALB/NLB from Ingress',
      'Cluster Autoscaler or Karpenter for node auto-scaling',
    ],
    examTraps: [
      'EKS Fargate has restrictions (no DaemonSet, no privileged containers)',
      'Cross-AZ data transfer adds cost — colocate pods where possible',
      'kube-proxy + CoreDNS + VPC CNI run as DaemonSets on EC2 nodes',
    ],
    docs: 'https://docs.aws.amazon.com/eks/',
  },
  aurora: {
    oneLine: 'AWS-built RDBMS, MySQL/Postgres compatible. 5× MySQL throughput.',
    keyFacts: [
      'Storage: 6 copies across 3 AZs; auto-grows up to 128TB',
      'Up to 15 Read Replicas + auto-failover in < 30 sec',
      'Aurora Global Database: cross-region replication < 1 sec lag',
      'Aurora Serverless v2: scales compute by 0.5 ACU steps (no scale-to-zero)',
      'Backtrack: rewind in-place up to 72h (MySQL only)',
    ],
    examTraps: [
      'Aurora Serverless v1 was scale-to-zero — v2 has a minimum capacity floor',
      'Reader endpoint load-balances ACROSS readers — single connection picks one',
      'Cluster volume is shared across all instances — pay for storage once',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/',
  },
  elasticache: {
    oneLine: 'Managed Redis / Memcached in-memory cache.',
    keyFacts: [
      'Redis: persistence, pub/sub, clustering, geo — feature-rich',
      'Memcached: simple, multi-threaded, no persistence',
      'Cluster mode: shard data across nodes (Redis) or partition (Memcached)',
      'Caching strategies: Lazy loading (cache-aside), Write-through, TTL',
      'Encryption in transit + at rest, AUTH token for Redis',
    ],
    examTraps: [
      'Memcached has no replication — node failure loses cache',
      'Redis cluster mode required for sharding > 1 shard',
      'No free tier — cache.t3.micro ~$0.017/hr (~$12/month)',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonElastiCache/',
  },
  kinesis: {
    oneLine: 'Real-time streaming data. Sub-second processing, scale via shards.',
    keyFacts: [
      'Data Streams: low-latency processing, retention 1-365 days, you write consumers',
      'Data Firehose: delivery to S3/Redshift/OpenSearch, buffer size + time, NO custom consumers',
      'Data Analytics: SQL/Apache Flink on streams',
      'Shard: 1 MB/s in, 2 MB/s out (5 read consumers); $0.015/shard-hour',
      'Enhanced fan-out: dedicated 2 MB/s per consumer per shard',
    ],
    examTraps: [
      'Firehose has 60-second minimum buffer (cannot do sub-second delivery)',
      'Order is guaranteed PER SHARD only — design partition keys carefully',
      'Cross-region replication is not built-in — use a consumer that re-publishes',
    ],
    docs: 'https://docs.aws.amazon.com/kinesis/',
  },
  glue: {
    oneLine: 'Serverless ETL + Data Catalog.',
    keyFacts: [
      'Crawlers: scan data sources, infer schema, populate Data Catalog',
      'Jobs: Python or Scala Spark, run on managed Spark cluster',
      'Triggers: schedule, event-based (S3 PUT), workflow steps',
      'Data Catalog: central metadata store used by Athena, Redshift Spectrum, EMR',
      'Glue Studio: visual ETL builder',
    ],
    examTraps: [
      'Glue is Spark-based — significant cold-start (~5-10 min) for jobs',
      'Pay per DPU-hour ($0.44) — large jobs add up quickly',
      'Data Catalog has API rate limits — beware of partition explosion',
    ],
    docs: 'https://docs.aws.amazon.com/glue/',
  },
  athena: {
    oneLine: 'Serverless SQL on S3. Pay $5 per TB scanned.',
    keyFacts: [
      'Uses Presto + Glue Data Catalog',
      'Partitioning: PRUNE scanned data via WHERE clauses on partition columns',
      'Columnar formats (Parquet, ORC) cut scan size by 80-95% vs CSV',
      'Workgroups: cost controls, query history isolation',
      'Federated queries: query other AWS services (RDS, DynamoDB) via connectors',
    ],
    examTraps: [
      'CSV is the WORST format — convert to Parquet first',
      'Cross-region S3 scans add transfer cost — keep data + Athena in same region',
      'CTAS + INSERT INTO are how you write Athena results back to S3',
    ],
    docs: 'https://docs.aws.amazon.com/athena/',
  },
  redshift: {
    oneLine: 'Petabyte-scale columnar data warehouse.',
    keyFacts: [
      'Node types: RA3 (separate compute/storage), DC2 (compute-attached SSD)',
      'Distribution styles: KEY, ALL, EVEN, AUTO — affects join performance',
      'Sort keys: compound (default) or interleaved (rarely better)',
      'Concurrency Scaling: spin up transient clusters for read peaks',
      'Federated query + Spectrum: query S3 directly without loading',
    ],
    examTraps: [
      'ALL distribution copies the table to every node — use for small dimensions',
      'VACUUM + ANALYZE required after heavy writes (automatic in newer versions)',
      'Redshift Serverless removes node management — best default for new workloads',
    ],
    docs: 'https://docs.aws.amazon.com/redshift/',
  },
  dx: {
    oneLine: 'Direct Connect — dedicated 1, 10, 100 Gbps fiber from your DC to AWS.',
    keyFacts: [
      'Dedicated (you own port) vs Hosted (sub-1Gbps from a partner)',
      'VIFs: Public (AWS public services), Private (your VPC via VGW), Transit (TGW)',
      'BGP required — supports HA via 2nd DX or active VPN backup',
      'Latency lower + consistent vs internet',
      'Reduced data-egress costs ($/GB) vs internet egress',
    ],
    examTraps: [
      'DX itself is not encrypted — pair with VPN or MACsec for confidentiality',
      'Setup time: weeks-to-months — VPN as instant interim',
      'Public VIF needs a public ASN or AWS-assigned one',
    ],
    docs: 'https://docs.aws.amazon.com/directconnect/',
  },
  tgw: {
    oneLine: 'Transit Gateway — regional hub for VPC + VPN + DX peering.',
    keyFacts: [
      'Replaces full-mesh VPC peering at scale',
      'Attachments: VPC, VPN, DX gateway, peering (cross-region)',
      'Route tables: TGW route table per attachment for segmentation',
      'Inter-region peering: encrypted, AWS backbone',
      'Multicast support — unique among AWS networking products',
    ],
    examTraps: [
      'TGW does NOT support transitive ROUTES between certain attachment types by default — review route tables',
      'Each attachment is $0.05/hr (~$36/month) — costs add up at scale',
      'Inter-region peering charges for both source AND destination region',
    ],
    docs: 'https://docs.aws.amazon.com/vpc/latest/tgw/',
  },
  waf: {
    oneLine: 'Web Application Firewall — L7 OWASP protection in front of CloudFront / ALB / API GW.',
    keyFacts: [
      'Web ACL: rules + default action (allow / block)',
      'Managed rule groups: AWS Core, SQL DB, Known Bad Inputs, etc.',
      'Rate-based rules: block IPs exceeding a request threshold per 5 min',
      'Bot Control: managed rule for bot detection',
      'Logs to S3, Kinesis Firehose, or CloudWatch Logs',
    ],
    examTraps: [
      'WAF attaches to CloudFront / ALB / API Gateway / AppSync only — NOT EC2 directly',
      '$5/month per Web ACL + $1/rule + $0.60 per million requests',
      'Custom rules use regex + size match — XSS / SQLi covered by managed rules',
    ],
    docs: 'https://docs.aws.amazon.com/waf/',
  },
  shield: {
    oneLine: 'DDoS protection — Standard is free, Advanced is paid.',
    keyFacts: [
      'Standard: always on, FREE for CloudFront / ALB / Route 53',
      'Advanced: $3,000/month, 24/7 DRT response, cost protection (refund of spikes)',
      'Advanced includes WAF at no extra charge',
      'Protections: SYN/UDP floods, reflection attacks, application-layer attacks',
      'Shield + WAF + CloudFront = layered defence',
    ],
    examTraps: [
      'Shield Advanced is a 1-YEAR commitment, not month-to-month',
      'Cost-protection refunds apply only to autoscaled spikes during an attack',
      'Doesn\'t protect EC2 directly — protect via ALB or CloudFront',
    ],
    docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/shield-chapter.html',
  },
  secretsmgr: {
    oneLine: 'Rotate + retrieve secrets (DB passwords, API keys). $0.40/secret/month.',
    keyFacts: [
      'Auto-rotation via Lambda for RDS / DocumentDB / Redshift built-in',
      'Cross-region replication for DR',
      'Encrypted with KMS',
      'Resource-based policies for cross-account sharing',
      'Compare with SSM Parameter Store: cheaper (free for standard params) but no auto-rotation',
    ],
    examTraps: [
      'Secrets Manager is paid per secret — SSM Parameter Store is free for SecureString up to 10k params',
      'Rotation Lambda must be in same region as the secret',
      'Versions: only the AWSCURRENT and AWSPREVIOUS are kept by default',
    ],
    docs: 'https://docs.aws.amazon.com/secretsmanager/',
  },
  step: {
    oneLine: 'Visual workflow orchestration over Lambda + other AWS APIs.',
    keyFacts: [
      'States: Task, Choice, Parallel, Map, Wait, Pass, Succeed, Fail',
      'Standard vs Express workflows (Express is cheaper for high-volume short-running)',
      'Retries + catches per state — durable error handling',
      'Visual execution graph for debugging',
      '4,000 state transitions/month FREE',
    ],
    examTraps: [
      'Standard workflows max 1 year execution; Express max 5 min',
      'Map state runs items in parallel — beware Lambda concurrency limits',
      'Choice state for branching, not Task-with-if-logic',
    ],
    docs: 'https://docs.aws.amazon.com/step-functions/',
  },
  cloudwatch: {
    oneLine: 'Metrics, logs, alarms, dashboards. The default observability stack.',
    keyFacts: [
      'Metrics: 1-min default; high-resolution custom = 1-sec ($0.30/metric/month)',
      'Logs: ingest $0.50/GB + storage $0.03/GB — set retention',
      'Alarms: threshold + period + datapoints to alarm → SNS / Auto Scaling',
      'Logs Insights: ad-hoc structured queries against log groups',
      'X-Ray: distributed tracing across services',
    ],
    examTraps: [
      'Billing metrics live ONLY in us-east-1 — alarms must be created there',
      'Default detailed-monitoring is OFF for EC2 (5-min); enable for 1-min metrics',
      'Cross-account observability requires CloudWatch Observability Access Manager',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/',
  },
  eventbridge: {
    oneLine: 'Event bus + cron scheduler for AWS + SaaS + custom events.',
    keyFacts: [
      'Default bus = AWS service events; custom buses for app events',
      'Schemas: discoverable event shapes for typed events',
      'Rules: pattern match + target up to 5 targets per rule',
      'Schedule expressions: rate(5 minutes) or cron(0 9 * * ? *)',
      'EventBridge Pipes: source → filter → enrich → target (no Lambda needed)',
    ],
    examTraps: [
      'Default bus event delivery is async with no built-in retry guarantee — use DLQ',
      'Cron in EventBridge is UTC + 6-field (cron expressions need day-of-week OR day-of-month, not both)',
      'Higher than 100/sec needs Pipes or KDS',
    ],
    docs: 'https://docs.aws.amazon.com/eventbridge/',
  },
  config: {
    oneLine: 'Records resource configs over time + evaluates rules for compliance.',
    keyFacts: [
      'Recorder: scans + stores config snapshots',
      'Rules: managed (AWS-provided) or custom (Lambda)',
      'Conformance packs: bundles of rules with auto-deployment',
      'Remediation: SSM Automation document fixes non-compliant resources',
      'Aggregator: org-wide view across all accounts/regions',
    ],
    examTraps: [
      'Config evaluates periodically OR on change — not real-time',
      '$0.003/item + $0.001/rule evaluation — small but adds up across orgs',
      'Required by SOC2, HIPAA, PCI for change-management evidence',
    ],
    docs: 'https://docs.aws.amazon.com/config/',
  },
  cloudtrail: {
    oneLine: 'API call audit log. Free for first management-events trail per region.',
    keyFacts: [
      'Management events vs Data events vs Insights events',
      'Trail: continuous delivery to S3 (optionally encrypted) + CloudWatch Logs',
      'Multi-region trail = single trail covering all regions',
      'Organization trail = trail covering every account in an org',
      'Log file validation: hash-chain detects tampering',
    ],
    examTraps: [
      'Data events (S3 object-level, Lambda invokes) are NOT logged by default',
      'Insights events are paid extra and analyse activity patterns',
      'S3 Object Lock on trail bucket = compliance-grade immutability',
    ],
    docs: 'https://docs.aws.amazon.com/awscloudtrail/',
  },
  bedrock: {
    oneLine: 'Managed access to foundation models (Claude, Llama, Titan, Mistral, etc.).',
    keyFacts: [
      'Pay per token (prompt + completion); per-model pricing',
      'InvokeModel + InvokeModelWithResponseStream APIs',
      'Knowledge Bases: managed RAG with OpenSearch Serverless vector store',
      'Agents: orchestrated tool-use with Lambda action groups',
      'Guardrails: content filters + denied topics + PII redaction',
    ],
    examTraps: [
      'Models must be REQUESTED ACCESS per-region in the console first',
      'Claude Sonnet ~$3/M tokens, Haiku ~$0.25/M, Opus ~$15/M — pick by quality/cost',
      'No model fine-tuning is free — even on Bedrock',
    ],
    docs: 'https://docs.aws.amazon.com/bedrock/',
  },
  cloudformation: {
    oneLine: 'Infrastructure-as-Code in YAML/JSON. Free service — pay only for the resources created.',
    keyFacts: [
      'Stack = one deployment; Change Set = preview the diff before applying',
      'StackSets: deploy to many accounts + regions in one operation',
      'Drift detection: detect when resources were changed outside the stack',
      'Nested stacks: parent stack with child stacks for reuse',
      'CDK compiles to CloudFormation — same engine, different authoring',
    ],
    examTraps: [
      'Stack rollback on failure is the default — disable for debugging',
      'StackSets requires service-managed permissions in AWS Organizations',
      'Some resources don\'t support update-in-place — replacement triggers downtime',
    ],
    docs: 'https://docs.aws.amazon.com/AWSCloudFormation/',
  },
  migration: {
    oneLine: 'Tools to move data + workloads into AWS — DataSync, DMS, Snowball, Storage Gateway.',
    keyFacts: [
      'DataSync: online file/object sync, NFS/SMB → S3/EFS/FSx',
      'DMS: database migration with optional schema conversion (SCT)',
      'Snowball Edge: ship a 80TB device for offline migration',
      'Snowmobile: 100PB truck (deprecated 2024)',
      'Storage Gateway: hybrid storage — File / Volume / Tape modes',
    ],
    examTraps: [
      'Snowball over slow links: math is roughly 80TB ÷ link speed — switch when > 1 week',
      'DMS replication instance lives in YOUR VPC — bandwidth/sizing matter',
      'SCT runs on a workstation, NOT in AWS — output is reviewed manually',
    ],
    docs: 'https://aws.amazon.com/products/migration-and-transfer/',
  },
};

export function topicNote(id) {
  return TOPIC_NOTES[id] || null;
}
