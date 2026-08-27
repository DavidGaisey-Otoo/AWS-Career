/**
 * awsServiceMatrix.js — the canonical AWS service catalogue used by the
 * Master Intelligence layer. Every detected service is tagged with:
 *
 *   • freeTier:  'always-free' | 'free-tier-eligible' | 'costs-money'
 *   • costNote:  human-readable cost description
 *   • testMap:   for paid services, the free-tier safe equivalent to use
 *                during testing on your account (per the user's spec).
 *   • aliases:   keyword tokens that signal this service in free text
 *   • category:  'compute' | 'storage' | 'database' | 'network' | 'security' | …
 *
 * NEVER SUBSTITUTE rule: when callers receive an analysis they should
 * render BOTH the requested service AND its testMap separately — never
 * silently swap. The user always knows what was asked for.
 */

export const SERVICE_MATRIX = {
  // ─────────────────────── COMPUTE ───────────────────────
  ec2: {
    id: 'ec2', label: 'EC2', category: 'compute',
    aliases: ['ec2', 'instance', 'virtual machine', 'vm'],
    freeTier: 'free-tier-eligible',
    costNote: '750 hrs/month of t2.micro free on legacy accounts (12 months)',
    testMap: { service: 'ec2', spec: 't2.micro single AZ', cost: '$0 (free tier)' },
  },
  'ec2-t3-large': {
    id: 'ec2-t3-large', label: 'EC2 t3.large', category: 'compute',
    aliases: ['t3.large', 't3 large'],
    freeTier: 'costs-money',
    costNote: '$0.0832/hour ≈ $60/month',
    testMap: { service: 'ec2', spec: 't2.micro', cost: '$0 (free tier)' },
  },
  'ec2-autoscale': {
    id: 'ec2-autoscale', label: 'EC2 Auto Scaling', category: 'compute',
    aliases: ['auto scaling', 'auto scale', 'asg', 'autoscale'],
    freeTier: 'always-free',
    costNote: 'ASG itself is free — you pay for the instances it launches',
    testMap: { service: 'ec2-autoscale', spec: 'Min 1 / Max 1 t2.micro', cost: '$0 (free tier)' },
  },
  lambda: {
    id: 'lambda', label: 'Lambda', category: 'compute',
    aliases: ['lambda', 'serverless function', 'function'],
    freeTier: 'always-free',
    costNote: '1M requests + 400K GB-sec free PER MONTH FOREVER',
  },
  ecs: {
    id: 'ecs', label: 'ECS Fargate', category: 'compute',
    aliases: ['ecs', 'fargate'],
    freeTier: 'costs-money',
    costNote: '~$0.04/hour per vCPU + $0.004/GB-RAM — no free tier',
    testMap: { service: 'ec2', spec: 't2.micro running Docker', cost: '$0' },
  },
  eks: {
    id: 'eks', label: 'EKS', category: 'compute',
    aliases: ['eks', 'kubernetes', 'k8s'],
    freeTier: 'costs-money',
    costNote: '$0.10/hour per cluster (~$73/month) + worker nodes',
    testMap: { service: 'ec2', spec: 'Single t2.micro with Docker', cost: '$0' },
  },
  beanstalk: {
    id: 'beanstalk', label: 'Elastic Beanstalk', category: 'compute',
    aliases: ['beanstalk', 'elastic beanstalk'],
    freeTier: 'always-free',
    costNote: 'Service itself is free — pay only for resources it creates',
  },

  // ─────────────────────── STORAGE ───────────────────────
  s3: {
    id: 's3', label: 'S3', category: 'storage',
    aliases: ['s3', 'bucket', 'object storage'],
    freeTier: 'free-tier-eligible',
    costNote: '5 GB free for 12 months on legacy accounts',
  },
  ebs: {
    id: 'ebs', label: 'EBS', category: 'storage',
    aliases: ['ebs', 'block storage', 'volume'],
    freeTier: 'free-tier-eligible',
    costNote: '30 GB free for 12 months — over that $0.10/GB/month',
  },
  efs: {
    id: 'efs', label: 'EFS', category: 'storage',
    aliases: ['efs', 'elastic file system', 'nfs'],
    freeTier: 'costs-money',
    costNote: '$0.30/GB/month standard',
  },
  glacier: {
    id: 'glacier', label: 'S3 Glacier', category: 'storage',
    aliases: ['glacier', 'archive storage'],
    freeTier: 'costs-money',
    costNote: '$0.004/GB/month + retrieval fees',
  },

  // ─────────────────────── DATABASE ───────────────────────
  rds: {
    id: 'rds', label: 'RDS', category: 'database',
    aliases: ['rds', 'postgresql', 'postgres', 'mysql', 'mariadb', 'sql database', 'relational database'],
    freeTier: 'free-tier-eligible',
    costNote: '750 hrs/month db.t2.micro single-AZ free on legacy (12 months)',
    testMap: { service: 'rds', spec: 'db.t2.micro single-AZ', cost: '$0 (free tier)' },
  },
  'rds-multiaz': {
    id: 'rds-multiaz', label: 'RDS Multi-AZ', category: 'database',
    aliases: ['multi-az', 'multi az', 'rds ha'],
    freeTier: 'costs-money',
    costNote: '2× the single-AZ cost — not free tier eligible',
    testMap: { service: 'rds', spec: 'db.t2.micro single-AZ for testing', cost: '$0 (free tier)' },
  },
  'rds-r5-large': {
    id: 'rds-r5-large', label: 'RDS db.r5.large', category: 'database',
    aliases: ['db.r5.large', 'r5.large'],
    freeTier: 'costs-money',
    costNote: '~$180/month single-AZ, $360/month Multi-AZ',
    testMap: { service: 'rds', spec: 'db.t2.micro single-AZ', cost: '$0 (free tier)' },
  },
  aurora: {
    id: 'aurora', label: 'Aurora Serverless v2', category: 'database',
    aliases: ['aurora', 'aurora serverless'],
    freeTier: 'costs-money',
    costNote: '$0.12/ACU-hour minimum — no scale-to-zero in v2',
    testMap: { service: 'rds', spec: 'db.t2.micro Postgres for testing', cost: '$0 (free tier)' },
  },
  dynamodb: {
    id: 'dynamodb', label: 'DynamoDB', category: 'database',
    aliases: ['dynamodb', 'dynamo', 'nosql'],
    freeTier: 'always-free',
    costNote: '25 GB + 25 WCU/RCU FREE FOREVER (provisioned mode)',
  },
  redshift: {
    id: 'redshift', label: 'Redshift', category: 'database',
    aliases: ['redshift', 'data warehouse'],
    freeTier: 'costs-money',
    costNote: '~$0.25/hour minimum (~$180/month)',
    testMap: { service: 'athena', spec: 'Athena on S3 instead', cost: '$0 (pay per query, very small)' },
  },
  elasticache: {
    id: 'elasticache', label: 'ElastiCache', category: 'database',
    aliases: ['elasticache', 'redis', 'memcached', 'cache cluster'],
    freeTier: 'costs-money',
    costNote: '~$0.017/hour for cache.t3.micro (~$12/month) — no free tier',
    testMap: { service: 'in-memory', spec: 'Local cache in Lambda or DynamoDB DAX (free)', cost: '$0' },
  },

  // ─────────────────────── NETWORK ───────────────────────
  vpc: {
    id: 'vpc', label: 'VPC', category: 'network',
    aliases: ['vpc', 'virtual private cloud'],
    freeTier: 'always-free',
    costNote: 'VPC itself is free — pay for what runs inside it',
  },
  subnet: {
    id: 'subnet', label: 'Subnet', category: 'network',
    aliases: ['subnet', 'public subnet', 'private subnet'],
    freeTier: 'always-free',
    costNote: 'Free',
  },
  igw: {
    id: 'igw', label: 'Internet Gateway', category: 'network',
    aliases: ['internet gateway', 'igw'],
    freeTier: 'always-free',
    costNote: 'Free (pay only for traffic that flows through it)',
  },
  'route-table': {
    id: 'route-table', label: 'Route Table', category: 'network',
    aliases: ['route table', 'routing table'],
    freeTier: 'always-free',
    costNote: 'Free',
  },
  'security-group': {
    id: 'security-group', label: 'Security Group', category: 'network',
    aliases: ['security group', 'sg'],
    freeTier: 'always-free',
    costNote: 'Free',
  },
  nacl: {
    id: 'nacl', label: 'Network ACL', category: 'network',
    aliases: ['network acl', 'nacl', 'subnet acl'],
    freeTier: 'always-free',
    costNote: 'Free',
  },
  'nat-gateway': {
    id: 'nat-gateway', label: 'NAT Gateway', category: 'network',
    aliases: ['nat gateway', 'nat-gateway'],
    freeTier: 'costs-money',
    costNote: '$0.045/hour + $0.045/GB processed ≈ $32-50/month minimum',
    testMap: { service: 'nat-instance', spec: 'NAT Instance on t2.micro', cost: '$0 (free tier)' },
  },
  'nat-instance': {
    id: 'nat-instance', label: 'NAT Instance', category: 'network',
    aliases: ['nat instance', 'nat-instance'],
    freeTier: 'free-tier-eligible',
    costNote: 'Free on t2.micro (counts against EC2 750hr/month limit)',
  },
  alb: {
    id: 'alb', label: 'Application Load Balancer', category: 'network',
    aliases: ['alb', 'application load balancer'],
    freeTier: 'costs-money',
    costNote: '$0.0225/hour ≈ $16/month + LCU usage. ~$0.03 for a 4-hour test.',
    testMap: { service: 'alb', spec: 'Same ALB but destroy after testing', cost: '~$0.03 for 4-hour test' },
  },
  nlb: {
    id: 'nlb', label: 'Network Load Balancer', category: 'network',
    aliases: ['nlb', 'network load balancer'],
    freeTier: 'costs-money',
    costNote: '$0.0225/hour ≈ $16/month + LCU usage',
    testMap: { service: 'nlb', spec: 'Same NLB but destroy after testing', cost: '~$0.03 for 4-hour test' },
  },
  elb: {
    id: 'elb', label: 'Classic Load Balancer', category: 'network',
    aliases: ['elb', 'classic load balancer'],
    freeTier: 'costs-money',
    costNote: '$0.025/hour ≈ $18/month — deprecated, use ALB/NLB',
  },
  'elastic-ip': {
    id: 'elastic-ip', label: 'Elastic IP', category: 'network',
    aliases: ['elastic ip', 'eip'],
    freeTier: 'always-free',
    costNote: 'Free while ATTACHED to a running instance. $3.60/month if UNATTACHED.',
  },
  cloudfront: {
    id: 'cloudfront', label: 'CloudFront', category: 'network',
    aliases: ['cloudfront', 'cdn'],
    freeTier: 'free-tier-eligible',
    costNote: '1 TB out + 10M requests free per month, perpetual',
  },
  route53: {
    id: 'route53', label: 'Route 53', category: 'network',
    aliases: ['route 53', 'route53'],
    freeTier: 'costs-money',
    costNote: 'Hosted zone $0.50/month + queries; domain registration $12+/year',
    testMap: { service: 'cloudfront-url', spec: 'Use *.cloudfront.net for testing', cost: '$0' },
  },
  'direct-connect': {
    id: 'direct-connect', label: 'Direct Connect', category: 'network',
    aliases: ['direct connect', 'dx'],
    freeTier: 'costs-money',
    costNote: '~$0.30/hour per port + port-hour fees',
  },

  // ─────────────────────── SECURITY ───────────────────────
  iam: {
    id: 'iam', label: 'IAM', category: 'security',
    aliases: ['iam', 'identity'],
    freeTier: 'always-free',
    costNote: 'IAM is FREE FOREVER',
  },
  ssm: {
    id: 'ssm', label: 'AWS Systems Manager', category: 'devops',
    aliases: ['ssm', 'systems manager', 'session manager', 'patch manager', 'run command'],
    freeTier: 'always-free',
    costNote: 'Core Systems Manager capabilities for EC2 are generally available without an additional service charge; advanced features and connected-node tiers can cost money',
  },
  backup: {
    id: 'backup', label: 'AWS Backup', category: 'storage',
    aliases: ['aws backup', 'backup vault', 'backup plan'],
    freeTier: 'costs-money',
    costNote: 'Charged for backup storage, restore operations, copies, and data transfer; no blanket zero-cost promise',
    testMap: { service: 'backup', spec: 'Short-retention encrypted EC2/EBS recovery point after account-specific estimate', cost: 'Usage-based' },
  },
  kms: {
    id: 'kms', label: 'KMS', category: 'security',
    aliases: ['kms', 'key management', 'encryption key'],
    freeTier: 'free-tier-eligible',
    costNote: '$1/month per customer-managed key + $0.03 per 10K requests',
  },
  acm: {
    id: 'acm', label: 'ACM Certificate', category: 'security',
    aliases: ['acm', 'certificate manager', 'tls certificate', 'ssl certificate'],
    freeTier: 'always-free',
    costNote: 'Public TLS certs are FREE FOREVER (when used with AWS services)',
  },
  waf: {
    id: 'waf', label: 'WAF', category: 'security',
    aliases: ['waf', 'web application firewall'],
    freeTier: 'costs-money',
    costNote: '$5/month per Web ACL + $1/rule/month + $0.60 per million requests',
    testMap: { service: 'code-rules', spec: 'Skip WAF in test; apply at code level', cost: '$0' },
  },
  shield: {
    id: 'shield', label: 'Shield', category: 'security',
    aliases: ['shield', 'ddos'],
    freeTier: 'free-tier-eligible',
    costNote: 'Standard FREE on CloudFront/ALB; Advanced $3,000/month',
  },
  guardduty: {
    id: 'guardduty', label: 'GuardDuty', category: 'security',
    aliases: ['guardduty'],
    freeTier: 'free-tier-eligible',
    costNote: '30-day free trial, then ~$4/GB CloudTrail + $1/GB VPC flow',
  },
  config: {
    id: 'config', label: 'AWS Config', category: 'security',
    aliases: ['aws config', 'config rules'],
    freeTier: 'costs-money',
    costNote: '$0.003 per item + $0.001 per rule evaluation — small but adds up',
  },
  cloudtrail: {
    id: 'cloudtrail', label: 'CloudTrail', category: 'security',
    aliases: ['cloudtrail', 'audit log'],
    freeTier: 'free-tier-eligible',
    costNote: 'First management-events trail in each region FREE; data events charged',
  },
  'secrets-manager': {
    id: 'secrets-manager', label: 'Secrets Manager', category: 'security',
    aliases: ['secrets manager'],
    freeTier: 'costs-money',
    costNote: '$0.40/secret/month + $0.05 per 10K API calls',
    testMap: { service: 'ssm-parameter', spec: 'SSM Parameter Store (SecureString) — FREE', cost: '$0' },
  },
  'ssm-parameter': {
    id: 'ssm-parameter', label: 'SSM Parameter Store', category: 'security',
    aliases: ['parameter store', 'ssm parameter'],
    freeTier: 'always-free',
    costNote: 'Standard parameters (up to 10,000) FREE FOREVER',
  },
  'security-hub': {
    id: 'security-hub', label: 'Security Hub', category: 'security',
    aliases: ['security hub'],
    freeTier: 'free-tier-eligible',
    costNote: '30-day free trial, then $0.0010 per finding ingested',
  },
  macie: {
    id: 'macie', label: 'Macie', category: 'security',
    aliases: ['macie', 'pii detection'],
    freeTier: 'free-tier-eligible',
    costNote: '30-day trial; $1/GB scanned + $0.10/10K events',
  },

  // ─────────────────────── INTEGRATION ───────────────────────
  apigw: {
    id: 'apigw', label: 'API Gateway', category: 'integration',
    aliases: ['api gateway', 'apigw', 'rest api', 'http api'],
    freeTier: 'free-tier-eligible',
    costNote: '1M API calls/month free for 12 months on legacy; then $1/million',
  },
  sqs: {
    id: 'sqs', label: 'SQS', category: 'integration',
    aliases: ['sqs', 'queue'],
    freeTier: 'always-free',
    costNote: '1 million requests FREE PER MONTH FOREVER',
  },
  sns: {
    id: 'sns', label: 'SNS', category: 'integration',
    aliases: ['sns', 'pub sub', 'topic'],
    freeTier: 'always-free',
    costNote: '1 million publishes + 1 million HTTP/email deliveries FREE FOREVER',
  },
  eventbridge: {
    id: 'eventbridge', label: 'EventBridge', category: 'integration',
    aliases: ['eventbridge', 'event bus', 'cloudwatch events'],
    freeTier: 'free-tier-eligible',
    costNote: 'Default bus events FREE; custom bus $1/million events',
  },
  ses: {
    id: 'ses', label: 'SES', category: 'integration',
    aliases: ['ses', 'simple email'],
    freeTier: 'free-tier-eligible',
    costNote: '62,000 emails/month free from Lambda/EC2; else $0.10/1000',
  },
  step: {
    id: 'step', label: 'Step Functions', category: 'integration',
    aliases: ['step functions', 'state machine'],
    freeTier: 'free-tier-eligible',
    costNote: '4,000 state transitions/month FREE FOREVER',
  },

  // ─────────────────────── DEVOPS / CI-CD ───────────────────────
  cloudformation: {
    id: 'cloudformation', label: 'CloudFormation', category: 'devops',
    aliases: ['cloudformation', 'cfn', 'yaml template'],
    freeTier: 'always-free',
    costNote: 'CloudFormation itself is FREE — pay only for resources created',
  },
  cdk: {
    id: 'cdk', label: 'AWS CDK', category: 'devops',
    aliases: ['cdk', 'aws cdk'],
    freeTier: 'always-free',
    costNote: 'CDK compiles to CloudFormation — both free',
  },
  codedeploy: {
    id: 'codedeploy', label: 'CodeDeploy', category: 'devops',
    aliases: ['codedeploy', 'code deploy'],
    freeTier: 'always-free',
    costNote: 'FREE for EC2/Lambda; $0.02 per on-premises instance update',
  },
  codepipeline: {
    id: 'codepipeline', label: 'CodePipeline', category: 'devops',
    aliases: ['codepipeline', 'pipeline'],
    freeTier: 'free-tier-eligible',
    costNote: 'First pipeline FREE/month; $1/pipeline/month after',
  },
  codebuild: {
    id: 'codebuild', label: 'CodeBuild', category: 'devops',
    aliases: ['codebuild', 'ci build'],
    freeTier: 'free-tier-eligible',
    costNote: '100 build minutes/month FREE on general1.small',
  },
  codecommit: {
    id: 'codecommit', label: 'CodeCommit', category: 'devops',
    aliases: ['codecommit'],
    freeTier: 'free-tier-eligible',
    costNote: '5 active users FREE/month; $1/user after',
  },
  ecr: {
    id: 'ecr', label: 'ECR', category: 'devops',
    aliases: ['ecr', 'container registry'],
    freeTier: 'free-tier-eligible',
    costNote: '500 MB private + 50GB/month transfer FREE for 12 months',
  },

  // ─────────────────────── MONITORING ───────────────────────
  cloudwatch: {
    id: 'cloudwatch', label: 'CloudWatch', category: 'monitoring',
    aliases: ['cloudwatch', 'metrics', 'alarms', 'monitoring'],
    freeTier: 'free-tier-eligible',
    costNote: '10 metrics + 10 alarms + 1M API requests + 5GB logs FREE FOREVER',
  },
  'cloudwatch-logs': {
    id: 'cloudwatch-logs', label: 'CloudWatch Logs', category: 'monitoring',
    aliases: ['cloudwatch logs', 'log group'],
    freeTier: 'free-tier-eligible',
    costNote: '5 GB ingest + 5 GB storage FREE; $0.50/GB ingest after',
  },
  xray: {
    id: 'xray', label: 'X-Ray', category: 'monitoring',
    aliases: ['x-ray', 'xray', 'tracing'],
    freeTier: 'free-tier-eligible',
    costNote: 'First 100K traces/month FREE',
  },

  // ─────────────────────── ML / AI ───────────────────────
  bedrock: {
    id: 'bedrock', label: 'Bedrock', category: 'ai',
    aliases: ['bedrock', 'llm', 'claude', 'foundation model'],
    freeTier: 'costs-money',
    costNote: 'Pay per token — Claude Haiku ~$0.25/M, Sonnet ~$3/M',
  },
  sagemaker: {
    id: 'sagemaker', label: 'SageMaker', category: 'ai',
    aliases: ['sagemaker'],
    freeTier: 'free-tier-eligible',
    costNote: 'Studio 250hr free; training/inference billed per instance',
  },
  rekognition: {
    id: 'rekognition', label: 'Rekognition', category: 'ai',
    aliases: ['rekognition', 'image recognition'],
    freeTier: 'free-tier-eligible',
    costNote: '5,000 images/month FREE for 12 months',
  },
  textract: {
    id: 'textract', label: 'Textract', category: 'ai',
    aliases: ['textract', 'ocr', 'pdf extract'],
    freeTier: 'free-tier-eligible',
    costNote: '1,000 pages/month FREE for 3 months',
  },

  // ─────────────────────── DATA ───────────────────────
  glue: {
    id: 'glue', label: 'Glue', category: 'data',
    aliases: ['glue', 'etl', 'data catalog'],
    freeTier: 'free-tier-eligible',
    costNote: '1M objects in Data Catalog FREE; ETL DPU $0.44/DPU-hour',
  },
  athena: {
    id: 'athena', label: 'Athena', category: 'data',
    aliases: ['athena'],
    freeTier: 'costs-money',
    costNote: '$5 per TB of data scanned — partition data to minimise',
  },
  kinesis: {
    id: 'kinesis', label: 'Kinesis', category: 'data',
    aliases: ['kinesis', 'data stream'],
    freeTier: 'costs-money',
    costNote: '$0.015/shard-hour ≈ $11/month per shard',
  },
  quicksight: {
    id: 'quicksight', label: 'QuickSight', category: 'data',
    aliases: ['quicksight', 'bi dashboard'],
    freeTier: 'free-tier-eligible',
    costNote: 'Standard 30-day trial; Enterprise $18/user/month',
  },
  emr: {
    id: 'emr', label: 'EMR', category: 'data',
    aliases: ['emr', 'spark', 'hadoop'],
    freeTier: 'costs-money',
    costNote: 'EMR surcharge + EC2 cost (typically $5-100/cluster-hour)',
  },

  // ─────────────────────── MIGRATION ───────────────────────
  dms: {
    id: 'dms', label: 'DMS', category: 'migration',
    aliases: ['dms', 'database migration'],
    freeTier: 'free-tier-eligible',
    costNote: '750 hrs/month t2.micro DMS replication FREE for 12 months',
  },
  sct: {
    id: 'sct', label: 'Schema Conversion Tool', category: 'migration',
    aliases: ['sct', 'schema conversion'],
    freeTier: 'always-free',
    costNote: 'FREE download',
  },
};

/**
 * Tag for visual styling. Returns one of:
 *   '✅ always-free'  '✅ free-tier'  '⚠️ small cost'  '❌ costs money'
 */
export function tagOf(service) {
  if (!service) return '';
  if (service.freeTier === 'always-free') return '✅ Always free';
  if (service.freeTier === 'free-tier-eligible') return '✅ Free tier';
  // Heuristic: smaller-cost services get the warning, big-ticket get the red
  const big = /\$\d{2,}/.test(service.costNote || '');
  return big ? '❌ Costs money' : '⚠️ Small cost';
}

/**
 * Build the free-tier mapping table for a given list of resolved services.
 * Returns array of { requested, testVersion, cost }.
 */
export function freeTierMapping(services) {
  const out = [];
  for (const s of services) {
    if (!s) continue;
    if (s.freeTier === 'always-free' || s.freeTier === 'free-tier-eligible') {
      out.push({ requested: s.label, testVersion: s.label + ' (same)', cost: '✅ Free' });
    } else if (s.testMap) {
      out.push({
        requested: s.label,
        testVersion: `${s.testMap.spec}`,
        cost: s.testMap.cost,
      });
    } else {
      out.push({
        requested: s.label,
        testVersion: 'Skip for test or use minimal config',
        cost: s.costNote,
      });
    }
  }
  return out;
}

/**
 * Build an aliases→serviceId lookup (lowercased) for fast detection.
 */
export const ALIAS_INDEX = (() => {
  const idx = new Map();
  for (const s of Object.values(SERVICE_MATRIX)) {
    for (const alias of s.aliases) {
      idx.set(alias.toLowerCase(), s.id);
    }
    idx.set(s.id.toLowerCase(), s.id);
    idx.set(s.label.toLowerCase(), s.id);
  }
  return idx;
})();

/**
 * "Always free" service catalogue — the foundation of zero-cost testing.
 */
export const ALWAYS_FREE_IDS = Object.values(SERVICE_MATRIX)
  .filter((s) => s.freeTier === 'always-free')
  .map((s) => s.id);
