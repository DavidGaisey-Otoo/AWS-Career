/**
 * Architecture Studio service palette + templates.
 *
 * Service icons are emoji glyphs (no asset deps) so the studio works
 * offline. Each service carries an estimated baseline monthly cost
 * (USD) used by the cost-estimator heuristic.
 */

const svc = (id, label, icon, category, monthlyEst = 0) => ({
  id, label, icon, category, monthlyEst,
});

export const SERVICE_PALETTE = [
  // Compute
  svc('ec2',         'EC2',              '🖥',  'compute', 15),
  svc('lambda',      'Lambda',           'λ',   'compute', 2),
  svc('ecs',         'ECS',              '🚢',  'compute', 8),
  svc('eks',         'EKS',              '☸',   'compute', 73),
  svc('fargate',     'Fargate',          '🔲',  'compute', 18),
  svc('asg',         'Auto Scaling',     '↕',   'compute', 0),
  svc('beanstalk',   'Beanstalk',        '🌱',  'compute', 18),
  // Storage
  svc('s3',          'S3',               '🪣',  'storage', 3),
  svc('ebs',         'EBS',              '💽',  'storage', 4),
  svc('efs',         'EFS',              '📁',  'storage', 12),
  svc('glacier',     'Glacier',          '🧊',  'storage', 1),
  // Database
  svc('rds',         'RDS',              '🗄',  'database', 32),
  svc('aurora',      'Aurora',           '🌌',  'database', 60),
  svc('dynamodb',    'DynamoDB',         '⚡',  'database', 8),
  svc('elasticache', 'ElastiCache',      '🚀',  'database', 18),
  svc('redshift',    'Redshift',         '📊',  'database', 220),
  svc('neptune',     'Neptune',          '🌐',  'database', 90),
  // Network
  svc('vpc',         'VPC',              '🔗',  'network', 0),
  svc('subnet',      'Subnet',           '▢',   'network', 0),
  svc('igw',         'Internet GW',      '🚪',  'network', 0),
  svc('nat',         'NAT Gateway',      '🔀',  'network', 33),
  svc('alb',         'ALB',              '⚖',   'network', 18),
  svc('nlb',         'NLB',              '⚖',   'network', 18),
  svc('cloudfront',  'CloudFront',       '🌎',  'network', 10),
  svc('route53',     'Route 53',         '🧭',  'network', 1),
  svc('apigateway',  'API Gateway',      '🚦',  'network', 4),
  svc('tgw',         'Transit GW',       '🛤',  'network', 36),
  svc('vpn',         'VPN',              '🔐',  'network', 36),
  svc('dx',          'Direct Connect',   '🔌',  'network', 220),
  svc('privatelink', 'PrivateLink',      '🔒',  'network', 7),
  svc('ga',          'Global Accelerator','⚡',  'network', 18),
  // Security
  svc('iam',         'IAM',              '🛡',  'security', 0),
  svc('kms',         'KMS',              '🔑',  'security', 1),
  svc('secretsmgr',  'Secrets Manager',  '🤐',  'security', 0.4),
  svc('cognito',     'Cognito',          '👤',  'security', 0),
  svc('waf',         'WAF',              '🧱',  'security', 5),
  svc('shield',      'Shield',           '🛡',  'security', 0),
  svc('guardduty',   'GuardDuty',        '👁',  'security', 4),
  svc('inspector',   'Inspector',        '🔎',  'security', 4),
  svc('securityhub', 'Security Hub',     '⚓',  'security', 3),
  svc('cloudtrail',  'CloudTrail',       '📋',  'security', 2),
  // Monitoring
  svc('cloudwatch',  'CloudWatch',       '📈',  'monitoring', 5),
  svc('xray',        'X-Ray',            '🩻',  'monitoring', 2),
  svc('sns',         'SNS',              '📢',  'monitoring', 0.5),
  // Application Integration
  svc('sqs',         'SQS',              '📨',  'integration', 0.5),
  svc('eventbridge', 'EventBridge',      '📡',  'integration', 1),
  svc('step',        'Step Functions',   '🪜',  'integration', 1),
  // DevOps
  svc('codepipeline','CodePipeline',     '🔧',  'devops', 1),
  svc('codebuild',   'CodeBuild',        '🔨',  'devops', 1),
  svc('codedeploy',  'CodeDeploy',       '📦',  'devops', 0),
  svc('codecommit',  'CodeCommit',       '📚',  'devops', 0),
  svc('ssm',         'Systems Manager',  '⚙',   'devops', 0),
  // External
  svc('user',        'User',             '👤',  'external', 0),
  svc('onprem',      'On-Prem',          '🏢',  'external', 0),
  svc('client',      'Client App',       '📱',  'external', 0),
  svc('internet',    'Internet',         '🌐',  'external', 0),
];

export const PALETTE_CATEGORIES = [
  { id: 'compute',     label: 'Compute' },
  { id: 'storage',     label: 'Storage' },
  { id: 'database',    label: 'Database' },
  { id: 'network',     label: 'Network' },
  { id: 'security',    label: 'Security' },
  { id: 'monitoring',  label: 'Monitor' },
  { id: 'integration', label: 'Integration' },
  { id: 'devops',      label: 'DevOps' },
  { id: 'external',    label: 'External' },
];

export const CATEGORY_COLOR = {
  compute:     '#FB923C',
  storage:     '#22D3EE',
  database:    '#F472B6',
  network:     '#60A5FA',
  security:    '#34D399',
  monitoring:  '#FBBF24',
  integration: '#A78BFA',
  devops:      '#FDE047',
  external:    '#94A3B8',
};

export const getServiceDef = (id) => SERVICE_PALETTE.find((s) => s.id === id);

// ---------- helper to build templates compactly ----------

const node = (id, serviceId, x, y, label) => ({ id, serviceId, x, y, label: label || null });
const edge = (from, to, label, dashed) => ({ from, to, label: label || null, dashed: !!dashed });

// ---------- TEMPLATES ----------

export const TEMPLATES = [
  {
    id: 't-3tier',
    name: '3-tier web application',
    description: 'Classic web → app → database with Multi-AZ.',
    nodes: [
      node('u',  'user',       60,  140, 'Users'),
      node('cf', 'cloudfront', 200, 140),
      node('lb', 'alb',        340, 140),
      node('a',  'ec2',        500, 80,  'Web AZ-A'),
      node('b',  'ec2',        500, 200, 'Web AZ-B'),
      node('db', 'rds',        660, 140, 'Multi-AZ'),
    ],
    edges: [
      edge('u',  'cf', 'HTTPS'),
      edge('cf', 'lb'),
      edge('lb', 'a'),
      edge('lb', 'b'),
      edge('a',  'db', 'SQL'),
      edge('b',  'db', 'SQL'),
    ],
  },
  {
    id: 't-serverless-api',
    name: 'Serverless REST API',
    description: 'API Gateway → Lambda → DynamoDB.',
    nodes: [
      node('c',  'client',     60,  140),
      node('g',  'apigateway', 200, 140),
      node('l',  'lambda',     340, 140),
      node('d',  'dynamodb',   500, 140),
      node('co', 'cognito',    340, 40,  'JWT'),
      node('cw', 'cloudwatch', 500, 260, 'Logs'),
    ],
    edges: [
      edge('c',  'g',  'HTTPS'),
      edge('co', 'g',  'auth', true),
      edge('g',  'l'),
      edge('l',  'd',  'CRUD'),
      edge('l',  'cw', 'logs', true),
    ],
  },
  {
    id: 't-data-lake',
    name: 'Data lake architecture',
    description: 'Ingest → S3 → Glue → Athena.',
    nodes: [
      node('src','onprem',     60,  140, 'Source'),
      node('k',  'apigateway', 200, 140, 'Ingest API'),
      node('l',  'lambda',     340, 140),
      node('s',  's3',         500, 140, 'Raw zone'),
      node('g',  'codepipeline', 500, 50, 'Glue ETL'),   // proxy icon
      node('cur','s3',         660, 140, 'Curated'),
      node('a',  'codecommit', 800, 140, 'Athena'),       // proxy icon
    ],
    edges: [
      edge('src','k'),
      edge('k',  'l'),
      edge('l',  's'),
      edge('s',  'g'),
      edge('g',  'cur'),
      edge('cur','a'),
    ],
  },
  {
    id: 't-cicd',
    name: 'CI/CD pipeline',
    description: 'CodeCommit → CodeBuild → CodeDeploy.',
    nodes: [
      node('d',  'codecommit',   60,  140, 'Source'),
      node('b',  'codebuild',    220, 140, 'Build'),
      node('p',  'codepipeline', 380, 140, 'Pipeline'),
      node('a',  'cloudwatch',   540, 40,  'Approval'),
      node('de', 'codedeploy',   540, 140, 'Deploy'),
      node('e',  'ec2',          700, 140, 'Targets'),
    ],
    edges: [
      edge('d',  'b'),
      edge('b',  'p'),
      edge('p',  'de'),
      edge('a',  'de', 'gate', true),
      edge('de', 'e'),
    ],
  },
  {
    id: 't-dr',
    name: 'Disaster recovery (multi-region)',
    description: 'Active region + warm standby with Route 53 failover.',
    nodes: [
      node('u',  'user',     60,  160),
      node('r',  'route53',  220, 160, 'Failover'),
      node('p',  'ec2',      400, 80,  'Primary region'),
      node('s',  'ec2',      400, 240, 'DR region'),
      node('rep','s3',       600, 160, 'CRR'),
    ],
    edges: [
      edge('u', 'r'),
      edge('r', 'p', 'primary'),
      edge('r', 's', 'failover', true),
      edge('p', 'rep'),
      edge('s', 'rep'),
    ],
  },
  {
    id: 't-microservices',
    name: 'Microservices on EKS',
    description: 'ALB → EKS pods → RDS + DynamoDB + cache.',
    nodes: [
      node('u',  'user',        60,  160),
      node('lb', 'alb',         200, 160),
      node('k',  'eks',         360, 160, 'Pods'),
      node('r',  'rds',         520, 80),
      node('d',  'dynamodb',    520, 160),
      node('c',  'elasticache', 520, 240),
    ],
    edges: [
      edge('u',  'lb'),
      edge('lb', 'k'),
      edge('k',  'r'),
      edge('k',  'd'),
      edge('k',  'c'),
    ],
  },
  {
    id: 't-ml-pipeline',
    name: 'ML training + inference',
    description: 'Data lake → training job → endpoint.',
    nodes: [
      node('s',  's3',          60,  160, 'Train data'),
      node('t',  'fargate',     220, 160, 'Training'),
      node('m',  's3',          380, 160, 'Model artefacts'),
      node('e',  'lambda',      540, 160, 'Inference'),
      node('c',  'cloudwatch',  540, 60,  'Metrics'),
    ],
    edges: [
      edge('s', 't'),
      edge('t', 'm'),
      edge('m', 'e'),
      edge('e', 'c', 'logs', true),
    ],
  },
  {
    id: 't-hub-spoke',
    name: 'Hub-and-spoke network',
    description: '4 spoke VPCs + on-prem via Transit Gateway.',
    nodes: [
      node('o',  'onprem',  60,  160, 'On-prem'),
      node('v',  'vpn',     200, 160),
      node('t',  'tgw',     360, 160, 'Hub'),
      node('a',  'vpc',     520, 60,  'Prod'),
      node('b',  'vpc',     520, 160, 'Stage'),
      node('c',  'vpc',     520, 260, 'Shared'),
    ],
    edges: [
      edge('o', 'v'),
      edge('v', 't'),
      edge('t', 'a'),
      edge('t', 'b'),
      edge('t', 'c'),
    ],
  },
  {
    id: 't-landing-zone',
    name: 'Multi-account landing zone',
    description: 'Org root, log archive + audit + workload accounts.',
    nodes: [
      node('o',  'iam',         60,  160, 'Org root'),
      node('l',  'cloudtrail',  220, 80,  'Log archive'),
      node('au', 'securityhub', 220, 240, 'Audit'),
      node('w1', 'ec2',         380, 80,  'Prod'),
      node('w2', 'ec2',         380, 240, 'Dev'),
    ],
    edges: [
      edge('o',  'l'),
      edge('o',  'au'),
      edge('o',  'w1'),
      edge('o',  'w2'),
    ],
  },
  {
    id: 't-static',
    name: 'Static website + CDN',
    description: 'S3 origin behind CloudFront with custom domain.',
    nodes: [
      node('u',  'user',       60,  160),
      node('r',  'route53',    200, 160),
      node('c',  'cloudfront', 360, 160),
      node('s',  's3',         520, 160, 'Origin'),
      node('a',  'kms',        360, 60,  'ACM cert'),
    ],
    edges: [
      edge('u', 'r'),
      edge('r', 'c'),
      edge('a', 'c', 'TLS', true),
      edge('c', 's'),
    ],
  },
  // ---- additional templates added in Stage 11 ----
  {
    id: 't-evt-micro',
    name: 'Event-driven microservices',
    description: 'EventBridge fans events into independent Lambdas + queues.',
    nodes: [
      node('p',  'apigateway', 60,  160, 'Producer API'),
      node('eb', 'eventbridge', 240, 160),
      node('q1', 'sqs',         420, 70,  'orders queue'),
      node('q2', 'sqs',         420, 260, 'shipping queue'),
      node('l1', 'lambda',      580, 70,  'OrderFn'),
      node('l2', 'lambda',      580, 260, 'ShipFn'),
      node('d',  'dynamodb',    760, 160, 'orders'),
    ],
    edges: [
      edge('p',  'eb', 'event'),
      edge('eb', 'q1', 'order'),
      edge('eb', 'q2', 'ship'),
      edge('q1', 'l1'),
      edge('q2', 'l2'),
      edge('l1', 'd'),
      edge('l2', 'd'),
    ],
  },
  {
    id: 't-dr-pilot',
    name: 'DR — Pilot Light (multi-region)',
    description: 'Cold standby in DR region — fast promote on outage.',
    nodes: [
      node('u',   'user',       60,  160),
      node('cf',  'cloudfront', 200, 160),
      node('r53', 'route53',    340, 160, 'Failover'),
      node('p',   'rds',        500, 70,  'Primary RDS'),
      node('rs',  'rds',        500, 260, 'Replica (warm)'),
      node('s1',  's3',         660, 70,  'S3 primary'),
      node('s2',  's3',         660, 260, 'S3 CRR'),
    ],
    edges: [
      edge('u',   'cf'),
      edge('cf',  'r53'),
      edge('r53', 'p',  'primary'),
      edge('r53', 'rs', 'failover', true),
      edge('p',   'rs', 'replicate', true),
      edge('s1',  's2', 'CRR', true),
    ],
  },
  {
    id: 't-dr-warm',
    name: 'DR — Warm Standby',
    description: 'Minimal capacity always running in DR, scaled on cutover.',
    nodes: [
      node('u',   'user',     60,  160),
      node('r53', 'route53',  220, 160),
      node('a1',  'alb',      380, 70,  'ALB primary'),
      node('a2',  'alb',      380, 260, 'ALB DR'),
      node('e1',  'ec2',      540, 70,  '4× t3.medium'),
      node('e2',  'ec2',      540, 260, '1× t3.medium'),
      node('rds', 'aurora',   720, 160, 'Aurora Global'),
    ],
    edges: [
      edge('u',   'r53'),
      edge('r53', 'a1', 'primary'),
      edge('r53', 'a2', 'warm', true),
      edge('a1',  'e1'),
      edge('a2',  'e2'),
      edge('e1',  'rds'),
      edge('e2',  'rds'),
    ],
  },
  {
    id: 't-vpc-basics',
    name: 'VPC — public + private subnets',
    description: 'Two AZs, NAT in each, IGW for public, defense-in-depth.',
    nodes: [
      node('igw', 'igw',    420, 30,  'IGW'),
      node('p1',  'subnet', 240, 130, 'public-a'),
      node('p2',  'subnet', 600, 130, 'public-b'),
      node('n1',  'nat',    240, 230, 'NAT az-a'),
      node('n2',  'nat',    600, 230, 'NAT az-b'),
      node('pr1', 'subnet', 240, 330, 'private-a'),
      node('pr2', 'subnet', 600, 330, 'private-b'),
      node('e1',  'ec2',    240, 430, 'App az-a'),
      node('e2',  'ec2',    600, 430, 'App az-b'),
    ],
    edges: [
      edge('igw', 'p1'),
      edge('igw', 'p2'),
      edge('p1',  'n1'),
      edge('p2',  'n2'),
      edge('n1',  'pr1'),
      edge('n2',  'pr2'),
      edge('pr1', 'e1'),
      edge('pr2', 'e2'),
    ],
  },
  {
    id: 't-stream',
    name: 'Real-time streaming pipeline',
    description: 'Kinesis → Lambda → S3 + OpenSearch + QuickSight.',
    nodes: [
      node('src', 'client',     60,  160, 'Producers'),
      node('kds', 'sns',        220, 160, 'Kinesis Streams'),
      node('lam', 'lambda',     380, 160, 'Processor'),
      node('fh',  'sns',        540, 60,  'Firehose'),
      node('s3',  's3',         700, 60,  'Data lake'),
      node('os',  'cloudwatch', 540, 260, 'OpenSearch'),
      node('qs',  'cloudwatch', 700, 260, 'QuickSight'),
    ],
    edges: [
      edge('src', 'kds'),
      edge('kds', 'lam'),
      edge('lam', 'fh'),
      edge('fh',  's3',  'Parquet'),
      edge('lam', 'os'),
      edge('os',  'qs'),
    ],
  },
];

// ====================================================================
// Stage 11 — AI diagram generator + intelligence helpers
// ====================================================================

// Keywords map → which services to add to the diagram.
const KEYWORD_SERVICES = [
  // network
  [/\b(vpc|subnet|cidr)\b/i, ['vpc']],
  [/\b(load balancer|alb|elb)\b/i, ['alb']],
  [/\b(nlb|network load balancer)\b/i, ['nlb']],
  [/\b(cloudfront|cdn)\b/i, ['cloudfront']],
  [/\b(route 53|dns|domain)\b/i, ['route53']],
  [/\b(api gateway|rest api|graphql)\b/i, ['apigateway']],
  [/\b(transit gateway|tgw|hub.and.spoke)\b/i, ['tgw']],
  [/\b(vpn|direct connect)\b/i, ['vpn']],
  [/\b(waf|web firewall)\b/i, ['waf']],
  // compute
  [/\b(auto scaling|asg)\b/i, ['ec2', 'asg']],
  [/\b(ec2|virtual machine|server)\b/i, ['ec2']],
  [/\b(lambda|function|serverless)\b/i, ['lambda']],
  [/\b(eks|kubernetes|k8s)\b/i, ['eks']],
  [/\b(ecs|fargate|container)\b/i, ['fargate']],
  // storage
  [/\b(s3|bucket|data lake|static site)\b/i, ['s3']],
  [/\b(glacier|archive)\b/i, ['glacier']],
  [/\b(efs|file system)\b/i, ['efs']],
  // database
  [/\b(rds|mysql|postgres|postgresql)\b/i, ['rds']],
  [/\b(aurora)\b/i, ['aurora']],
  [/\b(dynamodb|dynamo|nosql)\b/i, ['dynamodb']],
  [/\b(elasticache|redis|memcached|cache)\b/i, ['elasticache']],
  [/\b(redshift|warehouse|warehousing)\b/i, ['redshift']],
  // analytics + ML
  [/\b(kinesis|stream)\b/i, ['sns']],
  [/\b(glue|etl)\b/i, ['lambda']],
  [/\b(athena|query)\b/i, ['lambda']],
  [/\b(quicksight|bi|dashboard)\b/i, ['cloudwatch']],
  [/\b(sagemaker|ml|machine learning|model)\b/i, ['eks']],
  [/\b(bedrock|genai|llm|foundation model)\b/i, ['lambda']],
  // monitoring + security
  [/\b(cloudwatch|monitor)\b/i, ['cloudwatch']],
  [/\b(x.?ray|trace)\b/i, ['xray']],
  [/\b(sns|notification|alert)\b/i, ['sns']],
  [/\b(sqs|queue)\b/i, ['sqs']],
  [/\b(eventbridge|event bus)\b/i, ['eventbridge']],
  [/\b(step functions|workflow|orchestrat)\b/i, ['step']],
  [/\b(cognito|auth|login)\b/i, ['cognito']],
  [/\b(secrets manager|secret)\b/i, ['secretsmgr']],
  [/\b(kms|encryption|encrypt)\b/i, ['kms']],
  [/\b(guardduty|threat)\b/i, ['guardduty']],
  [/\b(cloudtrail|audit)\b/i, ['cloudtrail']],
  [/\b(iam|access|role|polic)\b/i, ['iam']],
];

/**
 * Generate a diagram (nodes + edges) from a plain-English description.
 * Layout uses a simple force-of-grouping approach: services placed left to
 * right roughly in flow order, plus a "user" entry node on the far left.
 */
export function generateDiagramFromDescription(text) {
  const found = new Set();
  const ordered = [];
  for (const [re, ids] of KEYWORD_SERVICES) {
    if (re.test(text)) {
      for (const id of ids) {
        if (!found.has(id)) { found.add(id); ordered.push(id); }
      }
    }
  }
  // Always start from user/internet
  if (!found.has('user')) ordered.unshift('user');

  // Lay out in a horizontal flow: 160px between columns, rows wrap at 5.
  const COL_W = 170;
  const ROW_H = 110;
  const ROWS = 4;
  const nodes = ordered.map((sid, i) => ({
    id: `n${i + 1}`,
    serviceId: sid,
    x: 60 + Math.floor(i / ROWS) * COL_W,
    y: 60 + (i % ROWS) * ROW_H,
    label: null,
  }));

  // Connect each node to the next, plus add some sensible cross-links.
  const edges = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({ from: nodes[i].id, to: nodes[i + 1].id, label: null, dashed: false });
  }
  // If we have an ALB + EC2 + RDS, route ALB→EC2→RDS instead of linear
  const idOf = (svcId) => nodes.find((n) => n.serviceId === svcId)?.id;
  if (idOf('alb') && idOf('ec2') && idOf('rds')) {
    edges.push({ from: idOf('alb'), to: idOf('ec2'), label: 'HTTPS', dashed: false });
    edges.push({ from: idOf('ec2'), to: idOf('rds'), label: '3306',  dashed: false });
  }
  return { nodes, edges, services: ordered };
}

/**
 * Pre-loaded example prompts shown in the AI generator.
 */
export const AI_EXAMPLES = [
  {
    label: '3-tier web app',
    text: 'Three tier web application with auto scaling EC2, RDS Multi-AZ database, Application Load Balancer, CloudFront CDN, WAF security, Route 53 DNS',
  },
  {
    label: 'Serverless API',
    text: 'Serverless REST API with Lambda functions, API Gateway, DynamoDB table, Cognito auth, CloudWatch monitoring',
  },
  {
    label: 'Data pipeline',
    text: 'Data pipeline with Kinesis streams, Lambda processing, S3 data lake, Glue ETL, Athena queries, QuickSight',
  },
];

/**
 * Well-Architected check — runs a battery of heuristics on a nodes+edges
 * diagram and returns warnings + fixes.
 */
export function wellArchitectedReport(nodes, edges) {
  const issues = [];
  const has = (id) => nodes.some((n) => n.serviceId === id);
  const count = (id) => nodes.filter((n) => n.serviceId === id).length;

  if (has('ec2') && count('ec2') < 2 && !has('asg')) {
    issues.push({
      severity: 'high',
      pillar: 'Reliability',
      msg: 'Single EC2 instance with no Auto Scaling Group — single point of failure.',
      fix: 'Add an Auto Scaling Group across at least 2 AZs.',
    });
  }
  if (has('rds') && !labelHas(nodes, 'multi-az')) {
    issues.push({
      severity: 'medium',
      pillar: 'Reliability',
      msg: 'RDS present without explicit Multi-AZ label — verify it\'s enabled.',
      fix: 'Set Multi-AZ on the RDS instance for automated failover.',
    });
  }
  if (has('alb') && !has('waf')) {
    issues.push({
      severity: 'medium',
      pillar: 'Security',
      msg: 'Application Load Balancer without WAF.',
      fix: 'Attach AWS WAF with managed rules (CRS + bot control) to the ALB.',
    });
  }
  if (has('s3') && !has('kms')) {
    issues.push({
      severity: 'low',
      pillar: 'Security',
      msg: 'S3 used without an explicit KMS key — confirm SSE encryption is on.',
      fix: 'Enable default bucket encryption (SSE-S3 default, SSE-KMS for compliance).',
    });
  }
  if (has('lambda') && !has('xray')) {
    issues.push({
      severity: 'low',
      pillar: 'Operational excellence',
      msg: 'Lambda without X-Ray tracing.',
      fix: 'Enable Active Tracing on Lambda functions — adds <1ms overhead.',
    });
  }
  if (has('vpc') && !has('cloudtrail')) {
    issues.push({
      severity: 'medium',
      pillar: 'Security',
      msg: 'No CloudTrail in the diagram.',
      fix: 'Enable a multi-region trail to a hardened S3 bucket — required for audit.',
    });
  }
  if (has('rds') && !has('s3') && !has('glacier')) {
    issues.push({
      severity: 'medium',
      pillar: 'Reliability',
      msg: 'No backup destination visible for RDS data.',
      fix: 'Document automated backups + an S3 backup vault for snapshots.',
    });
  }
  if (count('nat') === 1) {
    issues.push({
      severity: 'medium',
      pillar: 'Reliability',
      msg: 'Single NAT Gateway — single AZ outage breaks private-subnet egress.',
      fix: 'Deploy one NAT Gateway per AZ that has private subnets.',
    });
  }
  return {
    score: Math.max(0, 100 - issues.length * 12 - issues.filter((i) => i.severity === 'high').length * 8),
    issues,
  };
}

function labelHas(nodes, txt) {
  return nodes.some((n) => (n.label || '').toLowerCase().includes(txt));
}

/**
 * Cost estimator: sum monthlyEst for known services + sensible region multipliers.
 */
export function estimateMonthly(nodes, region = 'us-east-1') {
  const REGION_MULT = {
    'us-east-1': 1.0, 'us-east-2': 1.0, 'us-west-2': 1.05,
    'eu-west-1': 1.07, 'eu-west-2': 1.08, 'eu-central-1': 1.10,
    'ap-south-1': 1.08, 'ap-southeast-1': 1.12, 'ap-southeast-2': 1.12,
    'ap-northeast-1': 1.12, 'sa-east-1': 1.18,
  };
  const mult = REGION_MULT[region] ?? 1.05;
  let total = 0;
  const rows = [];
  for (const n of nodes) {
    const svc = getServiceDef(n.serviceId);
    if (!svc) continue;
    const cost = (svc.monthlyEst || 0) * mult;
    total += cost;
    rows.push({ label: svc.label, monthly: cost, category: svc.category });
  }
  // Add data transfer guesstimate: $0.09/GB egress × assumed 100 GB
  const egress = 100 * 0.09;
  total += egress;
  rows.push({ label: 'Data transfer out (~100 GB est)', monthly: egress, category: 'network' });
  return { total: Math.round(total), rows: rows.sort((a, b) => b.monthly - a.monthly) };
}

/**
 * Security analyzer — quick coverage map.
 */
export function securityCoverage(nodes) {
  const has = (id) => nodes.some((n) => n.serviceId === id);
  const checks = [
    { id: 'iam',       label: 'IAM roles defined',            ok: has('iam') },
    { id: 'kms',       label: 'KMS encryption at rest',       ok: has('kms') },
    { id: 'waf',       label: 'WAF in front of public edge',  ok: has('waf') },
    { id: 'cloudtrail',label: 'CloudTrail audit logging',     ok: has('cloudtrail') },
    { id: 'guardduty', label: 'GuardDuty threat detection',   ok: has('guardduty') },
    { id: 'secrets',   label: 'Secrets Manager for creds',    ok: has('secretsmgr') },
    { id: 'cognito',   label: 'Auth via Cognito or equivalent', ok: has('cognito') || has('iam') },
  ];
  const passed = checks.filter((c) => c.ok).length;
  return {
    checks,
    score: Math.round((passed / checks.length) * 100),
  };
}

/**
 * Anti-pattern detector — explicit "don't do this" findings.
 */
export function antiPatterns(nodes, edges) {
  const out = [];
  const has = (id) => nodes.some((n) => n.serviceId === id);

  // RDS connected from a public subnet
  if (has('rds')) {
    const rds = nodes.find((n) => n.serviceId === 'rds');
    const incoming = edges.filter((e) => e.to === rds.id);
    const publicSourced = incoming.some((e) => {
      const src = nodes.find((n) => n.id === e.from);
      return src && (src.serviceId === 'user' || src.serviceId === 'internet' || src.serviceId === 'alb');
    });
    if (publicSourced) {
      out.push({
        title: 'Database directly reachable from public source',
        body: 'Databases should never be reachable from the internet or directly from an ALB. Put them in a private subnet behind an app tier.',
      });
    }
  }

  // EC2 without ASG and no ELB — manual server pattern
  if (has('ec2') && !has('asg') && !has('alb') && !has('nlb')) {
    out.push({
      title: 'Pet server pattern',
      body: 'Standalone EC2 with no scaling + no load balancer is fragile. Even one instance should sit behind an ALB target group with a desired count of 1 for easier replacement.',
    });
  }

  // Single-region DR
  if (has('rds') && !labelHas(nodes, 'replica') && !labelHas(nodes, 'cross-region')) {
    out.push({
      title: 'No visible DR target',
      body: 'For production workloads, document the DR strategy: at minimum a cross-region snapshot copy + a tested promote runbook.',
    });
  }

  return out;
}

