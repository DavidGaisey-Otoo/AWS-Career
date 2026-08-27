/**
 * awsServiceCatalog.js — AD-02 unified service registry.
 *
 * Single source of truth for the "what does X do?" + "free tier?" data
 * the Service Suggestion chips show in their popovers.
 *
 * Each entry:
 *   id            canonical service id (lowercase, dashed)
 *   label         display name
 *   icon          single emoji
 *   category      Compute | Storage | Database | Networking | Security |
 *                 Integration | Analytics | ML/AI | DevOps | Migration
 *   what          2-sentence plain-English description
 *   freeTier      one-line free-tier headline (or 'No free tier')
 *   triggers      [{ pattern: RegExp, reason: string }]
 *                   pattern = keyword regex
 *                   reason  = "Detected because the brief mentions ..."
 *   companions    [serviceIds] — when this service is picked, suggest these too
 */

export const AWS_SERVICE_CATALOG = {
  // ════════ Compute ════════
  lambda: {
    id: 'lambda', label: 'AWS Lambda', icon: 'λ', category: 'Compute',
    what: 'Run code on events without provisioning servers — pay per millisecond of execution. Perfect for APIs, event handlers, scheduled jobs, and glue logic.',
    freeTier: '1M requests + 400k GB-seconds / month — ALWAYS FREE',
    triggers: [
      { pattern: /\b(serverless|server[- ]?less|function as a service|faas)\b/i, reason: 'Brief mentions serverless — Lambda is the canonical serverless compute.' },
      { pattern: /\b(api|rest api|http api|microservice)\b/i, reason: 'Brief mentions an API — Lambda is the standard backend for serverless APIs.' },
      { pattern: /\b(webhook|event handler|trigger)\b/i, reason: 'Brief mentions webhooks/events — Lambda fires on triggers from S3, SQS, EventBridge, etc.' },
    ],
    companions: ['apigateway', 'iam', 'cloudwatch'],
  },
  ec2: {
    id: 'ec2', label: 'Amazon EC2', icon: '🖥', category: 'Compute',
    what: 'Virtual servers in the cloud — full OS control, any workload. Choose instance size, storage, and pay per second.',
    freeTier: '750 hrs t2.micro/t3.micro / month — 12 months',
    triggers: [
      { pattern: /\b(ec2|virtual machines?|vms?|servers?|wordpress|legacy app|jvm|tomcat|nginx server)\b/i, reason: 'Brief mentions servers / VMs / legacy apps — EC2 is the default lift-and-shift option.' },
      { pattern: /\b(long[- ]?running|always[- ]?on|24\/7)\b/i, reason: 'Brief mentions long-running / always-on workload — EC2 fits when Lambda\'s 15-minute limit is too short.' },
    ],
    companions: ['vpc', 'asg', 'alb', 'iam'],
  },
  ecs: {
    id: 'ecs', label: 'Amazon ECS', icon: '🚢', category: 'Compute',
    what: 'AWS-native container orchestrator — runs Docker containers on EC2 or Fargate. Simpler than EKS for pure-AWS workloads, no control-plane charge.',
    freeTier: 'ECS control plane is FREE — pay only for underlying compute',
    triggers: [
      { pattern: /\b(containers?|docker|dockerised|dockerized|microservices)\b/i, reason: 'Brief mentions containers / Docker — ECS is the simplest AWS container orchestrator.' },
      { pattern: /\b(fargate|serverless containers?)\b/i, reason: 'Brief mentions Fargate / serverless containers — ECS Fargate gives serverless container hosting.' },
    ],
    companions: ['fargate', 'alb', 'iam', 'cloudwatch'],
  },
  eks: {
    id: 'eks', label: 'Amazon EKS', icon: '☸', category: 'Compute',
    what: 'Managed Kubernetes — AWS runs the control plane (etcd, scheduler, API server). Choose EKS when you need K8s ecosystem (Helm, kubectl, Istio) or multi-cloud portability.',
    freeTier: 'No free tier — $0.10/hr per cluster (~$73/month) + node compute',
    triggers: [
      { pattern: /\b(kubernetes|k8s|eks|helm chart|kubectl)\b/i, reason: 'Brief mentions Kubernetes — EKS is AWS\'s managed Kubernetes.' },
    ],
    companions: ['vpc', 'iam', 'cloudwatch'],
  },
  fargate: {
    id: 'fargate', label: 'AWS Fargate', icon: '📦', category: 'Compute',
    what: 'Serverless container compute — runs ECS or EKS tasks without managing EC2. Pay per vCPU + memory hour, no host patching.',
    freeTier: 'No free tier — pay per task vCPU/memory hour',
    triggers: [
      { pattern: /\b(fargate|serverless containers?)\b/i, reason: 'Brief mentions Fargate or serverless containers.' },
    ],
    companions: ['ecs', 'alb', 'iam'],
  },
  asg: {
    id: 'asg', label: 'Auto Scaling Group', icon: '↕', category: 'Compute',
    what: 'Maintains a target fleet of EC2 instances — heals failures and scales to demand. Configure min/max/desired and scaling policies.',
    freeTier: 'ASG itself is FREE — only the EC2s it manages cost money',
    triggers: [
      { pattern: /\b(auto.?scaling|scale up|scale out|scale on demand)\b/i, reason: 'Brief mentions auto-scaling — ASG handles EC2 fleet sizing.' },
      { pattern: /\b(high availability|hot standby|fault tolerant)\b/i, reason: 'Brief mentions HA / fault tolerance — ASG replaces failed EC2 instances automatically.' },
    ],
    companions: ['ec2', 'alb'],
  },

  // ════════ Storage ════════
  s3: {
    id: 's3', label: 'Amazon S3', icon: '🪣', category: 'Storage',
    what: 'Object storage with 11-nines durability and unlimited scale. Stores any file as an object with a key — perfect for static sites, backups, data lakes, and CDN origins.',
    freeTier: '5 GB Standard storage · 20k GET · 2k PUT / month — 12 months',
    triggers: [
      { pattern: /\b(s3|simple storage|object storage|bucket)\b/i, reason: 'Brief mentions S3 / buckets / object storage.' },
      { pattern: /\b(static site|static website|html|css|js|jam.?stack)\b/i, reason: 'Brief mentions static site — S3 hosts static HTML/CSS/JS perfectly.' },
      { pattern: /\b(file upload|uploads?|user files|user generated content|ugc|media)\b/i, reason: 'Brief mentions file uploads / user media — S3 is the right durable storage layer.' },
      { pattern: /\b(backup|archive|cold storage|log dump)\b/i, reason: 'Brief mentions backups / archives — S3 (with Glacier lifecycle) is the canonical archive.' },
      { pattern: /\b(data lake|parquet|csv files|raw data)\b/i, reason: 'Brief mentions data lake — S3 is the standard data lake foundation.' },
    ],
    companions: ['cloudfront', 'iam'],
  },
  ebs: {
    id: 'ebs', label: 'Amazon EBS', icon: '💾', category: 'Storage',
    what: 'Block storage for EC2 — like a virtual hard drive attached over the network. Pick gp3 for general use, io2 for high-IOPS databases.',
    freeTier: '30 GB gp2 storage / month — 12 months',
    triggers: [
      { pattern: /\b(ebs|block storage|disk volume|persistent disk)\b/i, reason: 'Brief mentions block storage — EBS is the EC2 disk option.' },
    ],
    companions: ['ec2'],
  },
  efs: {
    id: 'efs', label: 'Amazon EFS', icon: '🗃', category: 'Storage',
    what: 'Managed NFS file system shared across many EC2 instances or containers simultaneously. Auto-scales storage, Multi-AZ by default.',
    freeTier: '5 GB / month — 12 months',
    triggers: [
      { pattern: /\b(efs|shared file system|nfs|posix file)\b/i, reason: 'Brief mentions shared file system / NFS — EFS is the managed NFS option.' },
    ],
    companions: ['ec2', 'ecs'],
  },

  // ════════ Database ════════
  rds: {
    id: 'rds', label: 'Amazon RDS', icon: '🗄', category: 'Database',
    what: 'Managed relational database — MySQL, PostgreSQL, MariaDB, Oracle, SQL Server. AWS handles patching, backups, failover.',
    freeTier: '750 hrs db.t3.micro + 20 GB storage / month — 12 months',
    triggers: [
      { pattern: /\b(rds|relational(\s+database)?|postgres|postgresql|mysql|mariadb|oracle|sql server|mssql)\b/i, reason: 'Brief mentions a relational database — RDS is the managed option.' },
      { pattern: /\b(transactional|acid|joins|foreign keys?)\b/i, reason: 'Brief mentions ACID transactions / joins — relational DB needed (RDS or Aurora).' },
    ],
    companions: ['vpc', 'secretsmgr', 'cloudwatch'],
  },
  aurora: {
    id: 'aurora', label: 'Amazon Aurora', icon: '🌌', category: 'Database',
    what: 'AWS-built MySQL/Postgres-compatible engine with distributed storage (6 copies across 3 AZs). Higher performance + more replicas than vanilla RDS.',
    freeTier: 'No free tier (RDS free tier excludes Aurora)',
    triggers: [
      { pattern: /\b(aurora|aurora postgres|aurora mysql|aurora serverless)\b/i, reason: 'Brief mentions Aurora.' },
      { pattern: /\b(global database|cross[- ]?region replica|sub[- ]?second lag)\b/i, reason: 'Brief mentions global / cross-region DB — Aurora Global Database fits.' },
    ],
    companions: ['vpc', 'secretsmgr'],
  },
  dynamodb: {
    id: 'dynamodb', label: 'Amazon DynamoDB', icon: '⚡', category: 'Database',
    what: 'Fully-managed NoSQL key-value + document database with single-digit-millisecond reads. Scales infinitely; perfect for high-throughput unpredictable workloads.',
    freeTier: '25 GB storage + 25 RCU + 25 WCU — ALWAYS FREE',
    triggers: [
      { pattern: /\b(dynamodb|dynamo|nosql|key[- ]?value)\b/i, reason: 'Brief mentions DynamoDB / NoSQL / key-value store.' },
      { pattern: /\b(serverless|api)\b/i, reason: 'Brief mentions serverless / API — DynamoDB pairs perfectly with Lambda for serverless data.' },
      { pattern: /\b(session(s)? store|leaderboard|game state|user prefs|profile data)\b/i, reason: 'Brief mentions session/leaderboard/profile data — DynamoDB excels at simple key-value lookups.' },
    ],
    companions: ['iam', 'lambda'],
  },
  elasticache: {
    id: 'elasticache', label: 'Amazon ElastiCache', icon: '🚀', category: 'Database',
    what: 'Managed in-memory cache (Redis or Memcached) with sub-millisecond reads. Perfect for session stores, hot DB caches, leaderboards, and rate limiting.',
    freeTier: '750 hrs cache.t3.micro / month — 12 months',
    triggers: [
      { pattern: /\b(redis|memcached|cache layer|caching)\b/i, reason: 'Brief mentions Redis / Memcached / caching — ElastiCache is the managed option.' },
    ],
    companions: ['vpc'],
  },
  redshift: {
    id: 'redshift', label: 'Amazon Redshift', icon: '📊', category: 'Database',
    what: 'Petabyte-scale data warehouse with columnar storage + MPP. PostgreSQL-compatible SQL for fast analytics on terabytes of data.',
    freeTier: '2-month free trial · dc2.large (160 GB)',
    triggers: [
      { pattern: /\b(redshift|data warehouse|warehouse|olap|bi dashboards?)\b/i, reason: 'Brief mentions a data warehouse / BI — Redshift is the AWS option.' },
    ],
    companions: ['s3', 'iam'],
  },

  // ════════ Networking ════════
  vpc: {
    id: 'vpc', label: 'Amazon VPC', icon: '🔗', category: 'Networking',
    what: 'Your isolated network in AWS — CIDR block, subnets per AZ, route tables, security groups. Every workload runs inside a VPC.',
    freeTier: 'VPC itself is FREE (only NAT GW, Interface Endpoints, VPN cost)',
    triggers: [
      { pattern: /\b(vpc|subnets?|private network|cidr|vpn)\b/i, reason: 'Brief mentions VPC / subnets / private networking.' },
    ],
    companions: ['iam'],
  },
  cloudfront: {
    id: 'cloudfront', label: 'Amazon CloudFront', icon: '🌎', category: 'Networking',
    what: 'Global CDN — caches content at 600+ edge locations close to your users. Dramatically reduces latency + offloads origin traffic.',
    freeTier: '1 TB data out + 10M requests / month — 12 months',
    triggers: [
      { pattern: /\b(cloudfront|cdn|edge cache|content delivery)\b/i, reason: 'Brief mentions CDN / CloudFront.' },
      { pattern: /\b(static site|static website|website|web app|global users)\b/i, reason: 'Brief mentions a website / global users — CloudFront gives sub-100ms loads worldwide.' },
    ],
    companions: ['s3', 'route53', 'acm'],
  },
  route53: {
    id: 'route53', label: 'Amazon Route 53', icon: '🧭', category: 'Networking',
    what: 'Authoritative DNS + domain registrar with intelligent routing policies. Provides 100% availability SLA and health-check failover.',
    freeTier: 'No free tier — $0.50/hosted zone/month',
    triggers: [
      { pattern: /\b(route\s?53|dns|domain|hosted zone|custom domain)\b/i, reason: 'Brief mentions a custom domain / DNS — Route 53 is the AWS DNS service.' },
    ],
    companions: ['cloudfront', 'acm'],
  },
  acm: {
    id: 'acm', label: 'AWS Certificate Manager', icon: '🔐', category: 'Networking',
    what: 'Free public TLS/SSL certificates with auto-renewal. Attaches to CloudFront, ALB, API Gateway — every modern HTTPS endpoint needs one.',
    freeTier: 'Public certs are ALWAYS FREE',
    triggers: [
      { pattern: /\b(https|tls|ssl|certificate|cert)\b/i, reason: 'Brief mentions HTTPS / TLS — ACM provides free auto-renewed certs.' },
    ],
    companions: ['cloudfront', 'alb'],
  },
  alb: {
    id: 'alb', label: 'Application Load Balancer', icon: '⚖', category: 'Networking',
    what: 'L7 load balancer for HTTP/HTTPS with rich routing rules (path, host, headers). Native Cognito + OIDC authentication.',
    freeTier: '750 hrs ALB or NLB / month — 12 months',
    triggers: [
      { pattern: /\b(load balancer|alb|application load balancer|elb)\b/i, reason: 'Brief mentions a load balancer — ALB is the L7 default.' },
      { pattern: /\b(multi(-|\s)az|high availability)\b/i, reason: 'Brief mentions multi-AZ / HA — ALB spreads traffic across AZs.' },
    ],
    companions: ['ec2', 'asg', 'acm'],
  },
  nlb: {
    id: 'nlb', label: 'Network Load Balancer', icon: '⚡', category: 'Networking',
    what: 'L4 load balancer for TCP/UDP/TLS with microsecond latency and static IPs per AZ. Use for trading, gaming, or anything needing raw TCP.',
    freeTier: 'Shared with ALB 750-hour free tier',
    triggers: [
      { pattern: /\b(nlb|network load balancer|udp|tcp load|raw socket)\b/i, reason: 'Brief mentions TCP/UDP load balancing — NLB is the L4 option.' },
    ],
    companions: ['ec2', 'vpc'],
  },
  apigateway: {
    id: 'apigateway', label: 'Amazon API Gateway', icon: '🚪', category: 'Networking',
    what: 'Managed API endpoints — REST, HTTP, or WebSocket — with built-in auth, throttling, caching, and request validation. Lambda or HTTP backends.',
    freeTier: '1M REST OR 1M HTTP API calls / month — 12 months',
    triggers: [
      { pattern: /\b(api gateway|api\s?gw|rest api|http api|web ?sockets?)\b/i, reason: 'Brief mentions API Gateway / REST / HTTP API.' },
      { pattern: /\b(serverless|api|backend)\b/i, reason: 'Brief mentions serverless / API — API Gateway is the standard front door for Lambda APIs.' },
    ],
    companions: ['lambda', 'cognito'],
  },

  // ════════ Security ════════
  iam: {
    id: 'iam', label: 'AWS IAM', icon: '🛡', category: 'Security',
    what: 'Identity + permissions — who can do what to which resources. Every AWS API call goes through IAM evaluation logic.',
    freeTier: 'Always FREE',
    triggers: [
      { pattern: /\b(iam|roles?|policies|permissions|access management)\b/i, reason: 'Brief mentions IAM / roles / permissions.' },
      { pattern: /./i, reason: 'Every AWS project needs IAM for principle-of-least-privilege.' },
    ],
    companions: [],
  },
  kms: {
    id: 'kms', label: 'AWS KMS', icon: '🔑', category: 'Security',
    what: 'Centralised encryption key management with FIPS-validated HSMs. Used by S3, EBS, RDS, DynamoDB, Lambda env vars and more for encryption at rest.',
    freeTier: '20k requests/month — ALWAYS FREE (AWS-managed keys)',
    triggers: [
      { pattern: /\b(kms|encryption keys?|cmk|envelope encryption|encrypt(ed|ion)? at rest)\b/i, reason: 'Brief mentions encryption / KMS.' },
      { pattern: /\b(compliance|hipaa|pci|gdpr|sox|regulated)\b/i, reason: 'Brief mentions compliance — customer-managed KMS keys with rotation are standard for regulated workloads.' },
    ],
    companions: ['iam'],
  },
  cognito: {
    id: 'cognito', label: 'Amazon Cognito', icon: '👤', category: 'Security',
    what: 'User identity for mobile and web apps — sign-up, sign-in, MFA, federation with Google/Facebook/Apple/SAML. 50k MAUs always free.',
    freeTier: '50k monthly active users — ALWAYS FREE',
    triggers: [
      { pattern: /\b(authentication|auth|login|sign[- ]?in|sign[- ]?up|register|user(s)?|account creation|password)\b/i, reason: 'Brief mentions user authentication / login — Cognito User Pool is the managed option.' },
      { pattern: /\b(oauth|saml|sso|federation|social login)\b/i, reason: 'Brief mentions OAuth / SAML / SSO — Cognito federates external IdPs.' },
      { pattern: /\b(cognito|user pool|identity pool)\b/i, reason: 'Brief mentions Cognito directly.' },
    ],
    companions: ['iam', 'apigateway'],
  },
  secretsmgr: {
    id: 'secretsmgr', label: 'AWS Secrets Manager', icon: '🤐', category: 'Security',
    what: 'Stores credentials, API keys, and OAuth tokens with auto-rotation Lambdas for RDS/DocDB/Redshift. KMS-encrypted at rest.',
    freeTier: 'No free tier — $0.40/secret/month',
    triggers: [
      { pattern: /\b(secrets? manager|password rotation|rotate password|api keys?)\b/i, reason: 'Brief mentions secrets / API keys / rotation.' },
      { pattern: /\b(database|rds|aurora)\b/i, reason: 'Brief mentions a database — Secrets Manager rotates DB credentials automatically.' },
    ],
    companions: ['kms'],
  },
  waf: {
    id: 'waf', label: 'AWS WAF', icon: '🧱', category: 'Security',
    what: 'L7 web application firewall — filters HTTP/HTTPS requests at the edge. Blocks OWASP Top 10 attacks, bots, and rate-based abuse.',
    freeTier: 'No free tier — $5 per Web ACL + $1 per rule + per-request',
    triggers: [
      { pattern: /\b(waf|web application firewall|owasp|bot protection|rate limit)\b/i, reason: 'Brief mentions WAF / OWASP / bot protection.' },
    ],
    companions: ['cloudfront', 'alb'],
  },
  shield: {
    id: 'shield', label: 'AWS Shield', icon: '🛡', category: 'Security',
    what: 'DDoS protection — Standard is free + automatic on every CloudFront/ALB/EIP. Advanced ($3000/mo) adds L7 protection + 24/7 response team.',
    freeTier: 'Shield Standard is ALWAYS FREE for everyone',
    triggers: [
      { pattern: /\b(ddos|denial of service|attack mitigation)\b/i, reason: 'Brief mentions DDoS — Shield Standard is auto-enabled; Advanced for premium.' },
    ],
    companions: ['cloudfront'],
  },

  // ════════ Integration ════════
  sqs: {
    id: 'sqs', label: 'Amazon SQS', icon: '📨', category: 'Integration',
    what: 'Managed message queue — decouples producers from consumers, absorbs spikes, retries failures. The standard async messaging layer.',
    freeTier: '1M requests / month — ALWAYS FREE',
    triggers: [
      { pattern: /\b(sqs|queue|async|asynchronous|decouple|background job|worker)\b/i, reason: 'Brief mentions queue / async / background jobs — SQS is the canonical message queue.' },
    ],
    companions: ['lambda', 'iam'],
  },
  sns: {
    id: 'sns', label: 'Amazon SNS', icon: '📢', category: 'Integration',
    what: 'Pub/sub messaging — one publish fans out to many subscribers (Lambda, SQS, email, SMS, mobile push). Perfect for notifications and event broadcasts.',
    freeTier: '1M publishes + 100k email + 1k push — ALWAYS FREE',
    triggers: [
      { pattern: /\b(sns|notifications?|notify|push notification|pub.?sub|fan.?out)\b/i, reason: 'Brief mentions notifications / pub-sub / fan-out — SNS is the broadcast service.' },
      { pattern: /\b(sms|text message)\b/i, reason: 'Brief mentions SMS — SNS delivers SMS to phone numbers (set spending limit!).' },
    ],
    companions: ['sqs', 'lambda'],
  },
  ses: {
    id: 'ses', label: 'Amazon SES', icon: '📧', category: 'Integration',
    what: 'Managed email-sending service for transactional + marketing emails. Cheaper than SaaS providers at scale ($0.10 per 1000 emails).',
    freeTier: '62k emails / month from EC2 or Lambda',
    triggers: [
      { pattern: /\b(ses|email|emails?|transactional email|marketing email|smtp|newsletter)\b/i, reason: 'Brief mentions sending email — SES is the AWS email service.' },
    ],
    companions: ['lambda', 'iam'],
  },
  eventbridge: {
    id: 'eventbridge', label: 'Amazon EventBridge', icon: '🔔', category: 'Integration',
    what: 'Serverless event bus — routes events from AWS services, SaaS partners, and custom apps to many targets. The modern replacement for CloudWatch Events.',
    freeTier: 'AWS-service events ALWAYS FREE · custom events 1M free',
    triggers: [
      { pattern: /\b(eventbridge|event bus|event[- ]?driven|domain events|saga)\b/i, reason: 'Brief mentions events / event-driven — EventBridge is the modern event router.' },
      { pattern: /\b(scheduled|cron|recurring)\b/i, reason: 'Brief mentions scheduled / cron — EventBridge Scheduler handles cron at scale.' },
    ],
    companions: ['lambda', 'sqs'],
  },
  step: {
    id: 'step', label: 'AWS Step Functions', icon: '🪜', category: 'Integration',
    what: 'Workflow orchestration with visual state machines — chains Lambdas, ECS tasks, AWS services with retry, error handling, and human approval.',
    freeTier: '4000 state transitions / month — ALWAYS FREE',
    triggers: [
      { pattern: /\b(step functions?|workflow|orchestrat|state machine|saga pattern|multi[- ]?step process)\b/i, reason: 'Brief mentions a multi-step workflow — Step Functions orchestrates with retry + branching.' },
      { pattern: /\b(human approval|wait for|long[- ]?running process)\b/i, reason: 'Brief mentions human-in-loop — Step Functions .waitForTaskToken pauses for callback.' },
    ],
    companions: ['lambda'],
  },

  // ════════ Monitoring + DevOps ════════
  cloudwatch: {
    id: 'cloudwatch', label: 'Amazon CloudWatch', icon: '📈', category: 'DevOps',
    what: 'Unified monitoring — metrics, logs, alarms, dashboards, and synthetic browser tests. The default observability layer for every AWS workload.',
    freeTier: '10 metrics + 1M API + 5 GB logs + 3 dashboards — ALWAYS FREE',
    triggers: [
      { pattern: /\b(monitoring|metrics|logs?|alarms?|observability|dashboards?|alerts?)\b/i, reason: 'Brief mentions monitoring / logs / alarms — CloudWatch is the default.' },
      { pattern: /./i, reason: 'Every AWS project benefits from CloudWatch alarms + log retention.' },
    ],
    companions: ['sns'],
  },
  ssm: {
    id: 'ssm', label: 'AWS Systems Manager', icon: '⚙', category: 'DevOps',
    what: 'Securely administer, patch, inventory, and automate EC2 instances. Session Manager avoids exposing inbound RDP or SSH when the operating system and agent support the required workflow.',
    freeTier: 'Core EC2 management features generally have no additional service charge; advanced features and connected-node tiers may cost money',
    triggers: [
      { pattern: /\b(ssm|systems manager|session manager|patch manager|run command|secure remote administration)\b/i, reason: 'Brief requests Systems Manager or secure remote administration and patching.' },
    ],
    companions: ['ec2', 'iam', 'cloudwatch'],
  },
  backup: {
    id: 'backup', label: 'AWS Backup', icon: '💾', category: 'Storage',
    what: 'Centralised policy-based backup, retention, restore, and recovery-point management for supported AWS resources.',
    freeTier: 'Usage-based backup storage, restore, copy, and transfer charges; verify current account eligibility and pricing',
    triggers: [
      { pattern: /\b(aws backup|backup vault|backup plan|controlled restore|backup and restore)\b/i, reason: 'Brief explicitly requires managed backup and restore evidence.' },
    ],
    companions: ['ec2', 'iam', 'cloudwatch'],
  },
  cloudtrail: {
    id: 'cloudtrail', label: 'AWS CloudTrail', icon: '🛤', category: 'DevOps',
    what: 'API audit log — records every API call across your account (who, what, when, from where). Free first trail for management events.',
    freeTier: 'First management-event trail FREE · 90-day Event History always free',
    triggers: [
      { pattern: /\b(cloudtrail|audit log|api audit|compliance audit|forensic)\b/i, reason: 'Brief mentions auditing — CloudTrail records every API call.' },
      { pattern: /\b(compliance|hipaa|pci|gdpr|sox|regulated)\b/i, reason: 'Brief mentions compliance — CloudTrail is non-negotiable for audit trails.' },
    ],
    companions: ['s3', 'cloudwatch'],
  },
  cloudformation: {
    id: 'cloudformation', label: 'AWS CloudFormation', icon: '📋', category: 'DevOps',
    what: 'Infrastructure-as-code — declarative YAML templates describing your AWS resources. Change Sets preview updates; Drift Detection flags manual changes.',
    freeTier: 'Always FREE — only deployed resources cost',
    triggers: [
      { pattern: /\b(cloudformation|cfn|iac|infrastructure as code|sam|cdk)\b/i, reason: 'Brief mentions CloudFormation / IaC — CFN is the AWS-native option.' },
    ],
    companions: ['iam'],
  },
  config: {
    id: 'config', label: 'AWS Config', icon: '🩺', category: 'DevOps',
    what: 'Tracks resource configuration over time + evaluates compliance rules. Foundation of AWS governance + drift detection across accounts.',
    freeTier: 'No free tier — per recorded item + per rule evaluation',
    triggers: [
      { pattern: /\b(aws config|compliance check|drift detection|governance)\b/i, reason: 'Brief mentions compliance / drift detection — AWS Config tracks resource state changes.' },
    ],
    companions: ['cloudtrail'],
  },

  // ════════ Analytics + ML ════════
  athena: {
    id: 'athena', label: 'Amazon Athena', icon: '🔍', category: 'Analytics',
    what: 'Serverless SQL on S3 — query data lakes with standard SQL, pay per TB scanned. Parquet + partitioning cut bills 80-95%.',
    freeTier: 'No free tier — $5 per TB scanned',
    triggers: [
      { pattern: /\b(athena|query s3|sql on s3|ad[- ]?hoc analytics)\b/i, reason: 'Brief mentions querying S3 with SQL — Athena is serverless.' },
    ],
    companions: ['s3', 'glue'],
  },
  glue: {
    id: 'glue', label: 'AWS Glue', icon: '🧪', category: 'Analytics',
    what: 'Serverless ETL + Data Catalog. Crawlers infer schema from S3; Spark or Python Shell jobs transform data.',
    freeTier: '1M Catalog requests + 1M Catalog objects ALWAYS FREE',
    triggers: [
      { pattern: /\b(glue|etl|crawler|data catalog|schema inference)\b/i, reason: 'Brief mentions ETL / data catalog — Glue is the AWS option.' },
    ],
    companions: ['s3', 'athena'],
  },
  kinesis: {
    id: 'kinesis', label: 'Amazon Kinesis', icon: '📡', category: 'Analytics',
    what: 'Real-time streaming — ingest, process, deliver high-throughput data streams. Data Streams for custom consumers; Firehose for managed delivery.',
    freeTier: 'No free tier — per shard-hour',
    triggers: [
      { pattern: /\b(kinesis|streaming|real[- ]?time|event stream|click ?stream|log ingest)\b/i, reason: 'Brief mentions real-time streaming — Kinesis is the AWS option.' },
    ],
    companions: ['lambda', 's3'],
  },
  bedrock: {
    id: 'bedrock', label: 'Amazon Bedrock', icon: '🧠', category: 'ML/AI',
    what: 'Serverless access to foundation models (Claude, Llama, Titan, Mistral) via one API. Knowledge Bases for managed RAG; Guardrails for content safety.',
    freeTier: 'No free tier — pay per token',
    triggers: [
      { pattern: /\b(bedrock|llm|gen.?ai|generative ai|chatbot|claude|llama|titan|foundation model)\b/i, reason: 'Brief mentions LLMs / GenAI — Bedrock provides managed foundation models.' },
      { pattern: /\b(rag|retrieval augmented|knowledge base|chat with docs)\b/i, reason: 'Brief mentions RAG / chat with documents — Bedrock Knowledge Bases is the managed RAG service.' },
    ],
    companions: ['s3', 'iam'],
  },
  sagemaker: {
    id: 'sagemaker', label: 'Amazon SageMaker', icon: '🤖', category: 'ML/AI',
    what: 'End-to-end ML platform — build, train, deploy, and monitor custom models. Studio notebooks, training jobs, inference endpoints, model monitor.',
    freeTier: '250 hrs notebook + 50 hrs training / month — 2 months',
    triggers: [
      { pattern: /\b(sagemaker|machine learning|train model|custom model|ml pipeline)\b/i, reason: 'Brief mentions custom ML / model training — SageMaker is the full ML platform.' },
    ],
    companions: ['s3', 'iam'],
  },

  // ════════ Migration ════════
  migration: {
    id: 'migration', label: 'Migration Services', icon: '📦', category: 'Migration',
    what: 'Family of migration tools: DataSync (file sync), DMS (DB migration), MGN (lift-and-shift servers), Snowball (offline TB transfer).',
    freeTier: 'Most tools free during initial migration',
    triggers: [
      { pattern: /\b(migrat|datasync|dms|database migration|lift.?and.?shift|mgn|snowball)\b/i, reason: 'Brief mentions migration — DMS for DBs, MGN for servers, DataSync for files.' },
      { pattern: /\b(on[- ]?prem(ises?)?|legacy)\b/i, reason: 'Brief mentions on-prem / legacy — migration tools needed.' },
    ],
    companions: ['vpc'],
  },
};

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
export function listAllServices() {
  return Object.values(AWS_SERVICE_CATALOG);
}

export function getService(id) {
  return AWS_SERVICE_CATALOG[id] || null;
}

export function getServicesByCategory() {
  const grouped = {};
  for (const svc of listAllServices()) {
    if (!grouped[svc.category]) grouped[svc.category] = [];
    grouped[svc.category].push(svc);
  }
  return grouped;
}
