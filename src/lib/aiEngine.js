/**
 * Client-side "AI" engine.
 *
 * Real LLM calls would be a server-side concern; this engine produces
 * thoughtful, structured responses keyed off intent + topic detection,
 * which the UI then streams character-by-character for the AI feel.
 *
 * Add new intents in INTENT_HANDLERS. Add new service-aware explanations
 * to SERVICE_TIPS. Add follow-up suggestions in CONTINUATIONS.
 *
 * The engine is deterministic for the same input, which makes the UX
 * testable and gives the user repeatable answers when they ask the same
 * question twice.
 */

import { findTopicAnywhere, LEARNING_CATEGORIES } from '../data/learning.js';

// ----------------------- service knowledge -----------------------

const SERVICE_TIPS = {
  s3: {
    name: 'Amazon S3',
    simple: 'Object storage that scales to infinity. You upload files (objects) into buckets. Pay per GB-month + requests.',
    deep: 'S3 stores objects, not blocks. Default 11-nines durability across 3+ AZs. Six storage classes from Standard (hot) down to Glacier Deep Archive (cold).',
    pros: ['11-nines durability', 'Infinite scale', 'Lifecycle to cheap tiers', 'Static website hosting'],
    cons: ['Per-request cost adds up at high TPS', 'List operations are eventually-consistent-ordered'],
    whenToUse: 'Anything you\'d store as a file: backups, media, logs, static sites, data lake objects.',
  },
  ec2: {
    name: 'Amazon EC2',
    simple: 'Virtual machines you rent by the second. Pick a size, pick an OS, click launch.',
    deep: 'Instance families: T (burstable), M (general), C (compute), R (memory), G/P (GPU). Storage: EBS (persistent) or instance store (ephemeral). Stateful firewalls (SGs).',
    pros: ['Full OS control', 'Huge instance variety', 'Spot Instances save 90%'],
    cons: ['You patch the OS', 'Wasted capacity when idle', 'Operational overhead vs serverless'],
    whenToUse: 'Long-running workloads, legacy apps, anything needing OS-level control.',
  },
  lambda: {
    name: 'AWS Lambda',
    simple: 'Run code without managing servers. Pay only for execution time.',
    deep: 'Functions trigger on events (HTTP, S3, SQS, EventBridge, DynamoDB Streams). 15-min max execution, up to 10 GB memory. Memory ↔ CPU is proportional.',
    pros: ['No servers', 'Scales 0 → 1000s in seconds', 'Pay only when invoked', '1M req/mo free'],
    cons: ['Cold starts (~100-1000ms first call)', '15-minute hard cap', 'Distributed debugging is harder'],
    whenToUse: 'APIs with spiky traffic, event processing, glue code between services.',
  },
  dynamodb: {
    name: 'Amazon DynamoDB',
    simple: 'Managed NoSQL with single-digit-ms latency at any scale.',
    deep: 'Key-value + document model. Partition key + optional sort key. GSIs for secondary access patterns. Streams for change capture.',
    pros: ['Single-digit-ms reads anywhere', 'Scales to millions of TPS', 'Pay-per-request mode'],
    cons: ['No joins', 'Schema must match access patterns', '400KB item size limit'],
    whenToUse: 'High-scale, low-latency key-value or document workloads. Sessions, cart, IoT, gaming.',
  },
  rds: {
    name: 'Amazon RDS',
    simple: 'Managed relational database. AWS handles patching, backups, failover.',
    deep: 'Engines: MySQL, Postgres, MariaDB, Oracle, SQL Server, Aurora. Multi-AZ = synchronous standby. Read Replicas = async, up to 15.',
    pros: ['Fully managed', 'Automated backups + PITR (35 days)', 'Multi-AZ failover in 60-120s'],
    cons: ['Cap on max instance size', 'You manage schema + queries', 'Standby is not readable'],
    whenToUse: 'Anything that needs ACID transactions and a relational model.',
  },
  vpc: {
    name: 'Amazon VPC',
    simple: 'Your own private network on AWS. Subnets, routing, gateways — like your own data center.',
    deep: 'Region-scoped CIDR. Public subnets route to IGW. Private subnets route through NAT. Security Groups (stateful) + NACLs (stateless) for defense in depth.',
    pros: ['Total network control', 'Multi-AZ design', 'Integrates with on-prem via VPN/DX'],
    cons: ['NAT Gateway ~$32/mo per AZ', 'CIDR planning errors are painful to undo'],
    whenToUse: 'Always. Every workload runs in a VPC, the question is just whose.',
  },
  cloudfront: {
    name: 'Amazon CloudFront',
    simple: 'Global CDN. Caches your content at 400+ edge locations close to users.',
    deep: 'Distribution with one or more Origins + Behaviors (path-pattern caching rules). Origin Access Control locks S3 to CloudFront. Signed URLs gate access.',
    pros: ['Sub-100ms latency worldwide', 'Cheap at scale (TB pricing)', 'Origin Shield boosts hit rate'],
    cons: ['Cache invalidations cost after first 1000/mo', 'TLS cert must be in us-east-1'],
    whenToUse: 'Static sites, media, API caching, anywhere global latency matters.',
  },
  iam: {
    name: 'AWS IAM',
    simple: 'Access control. Users + roles + policies decide who can do what.',
    deep: 'Identity policies (on users/groups/roles) and resource policies (on S3/KMS/SNS) combine. Explicit DENY > ALLOW > implicit DENY. SCPs cap permissions.',
    pros: ['Free', 'Fine-grained', 'Temporary creds via STS'],
    cons: ['Eventually consistent', 'Easy to over-grant', 'Wildcards are tempting and wrong'],
    whenToUse: 'Always. Every action in AWS goes through IAM evaluation.',
  },
};

// ----------------------- terraform / cfn snippets -----------------------

const IAC_SNIPPETS = {
  's3-bucket-tf': `# Terraform: private S3 bucket with versioning + default encryption
resource "aws_s3_bucket" "site" {
  bucket = "lab-\${random_id.s.hex}"
}

resource "random_id" "s" { byte_length = 4 }

resource "aws_s3_bucket_versioning" "v" {
  bucket = aws_s3_bucket.site.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "e" {
  bucket = aws_s3_bucket.site.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "bpa" {
  bucket = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}`,
  'lambda-tf': `# Terraform: Lambda function with IAM role
data "archive_file" "z" {
  type        = "zip"
  source_file = "handler.js"
  output_path = "handler.zip"
}

resource "aws_iam_role" "fn" {
  name = "fn-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.fn.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "fn" {
  function_name    = "hello"
  filename         = data.archive_file.z.output_path
  source_code_hash = data.archive_file.z.output_base64sha256
  handler          = "handler.handler"
  runtime          = "nodejs20.x"
  role             = aws_iam_role.fn.arn
  memory_size      = 256
  timeout          = 10
}`,
  's3-bucket-cfn': `# CloudFormation: private S3 bucket
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true`,
};

// ----------------------- CLI snippets -----------------------

const CLI_SNIPPETS = [
  { match: /s3.*ls|list.*bucket/i, cmd: 'aws s3 ls', explain: 'Lists all S3 buckets in your account.' },
  { match: /list.*ec2|ec2.*list|describe.*instance/i, cmd: 'aws ec2 describe-instances --query "Reservations[].Instances[].[InstanceId,State.Name,InstanceType]" --output table', explain: 'Lists every EC2 instance with id, state, and type.' },
  { match: /assume.*role|sts.*assume/i, cmd: 'aws sts assume-role --role-arn arn:aws:iam::123:role/foo --role-session-name local', explain: 'Returns temporary credentials by assuming the named role.' },
  { match: /upload.*s3|cp.*s3/i, cmd: 'aws s3 cp ./file.txt s3://my-bucket/path/', explain: 'Uploads a single file to S3. Add --recursive for directories.' },
  { match: /invoke.*lambda/i, cmd: 'aws lambda invoke --function-name hello --payload \'{"x":1}\' out.json', explain: 'Invokes a Lambda synchronously and writes the response body to out.json.' },
];

// ----------------------- intent classifier -----------------------

/**
 * Classify a user message into an intent. Order matters; first match wins.
 * Returns { intent, payload } where payload carries extracted entities
 * (service id, topic id, comparator, etc.).
 */
export function classifyIntent(input) {
  const txt = (input || '').toLowerCase().trim();
  if (!txt) return { intent: 'greet' };

  const service = detectService(txt);
  const services = detectServices(txt);

  if (/^(hi|hey|hello|yo)\b/.test(txt)) return { intent: 'greet' };

  if (/compare|vs\.?|versus|difference/.test(txt) && services.length >= 2) {
    return { intent: 'compare', payload: { a: services[0], b: services[1] } };
  }

  if (/flashcard|cards? on|quiz me|create.*card/.test(txt)) {
    return { intent: 'flashcards', payload: { service, topic: txt } };
  }

  if (/practice|test me|generate.*question/.test(txt)) {
    return { intent: 'practice', payload: { service, topic: txt } };
  }

  if (/summari[sz]e|tldr|key point|whitepaper/.test(txt)) {
    return { intent: 'summarize', payload: { topic: txt } };
  }

  if (/terraform|tf|hcl/.test(txt) && service) {
    return { intent: 'iac', payload: { tool: 'terraform', service } };
  }
  if (/cloudformation|cfn|yaml template/.test(txt) && service) {
    return { intent: 'iac', payload: { tool: 'cloudformation', service } };
  }

  if (/aws.*cli|cli.*command|aws cli/.test(txt)) {
    return { intent: 'cli', payload: { topic: txt } };
  }

  if (/error|fail|broken|won'?t work|stuck|debug|why .* not/.test(txt)) {
    return { intent: 'troubleshoot', payload: { service, topic: txt } };
  }

  if (/review.*architecture|architecture.*review|design review|critique/.test(txt)) {
    return { intent: 'arch-review', payload: { topic: txt } };
  }

  if (/study plan|schedule|prepare for|how (do|should) i (study|prep)/.test(txt)) {
    return { intent: 'study-plan', payload: { topic: txt } };
  }

  if (/what should i study|today|next|recommend/.test(txt)) {
    return { intent: 'recommend', payload: { topic: txt } };
  }

  if (/explain|what is|how does|simply|simple english/.test(txt) || service) {
    return { intent: 'explain', payload: { service, topic: txt } };
  }

  return { intent: 'general', payload: { topic: txt } };
}

function detectService(txt) {
  const order = ['lambda','ec2','vpc','dynamodb','cloudfront','rds','iam','s3'];
  for (const k of order) if (new RegExp(`\\b${k}\\b`, 'i').test(txt)) return k;
  return null;
}

function detectServices(txt) {
  const order = ['lambda','ec2','vpc','dynamodb','cloudfront','rds','iam','s3','aurora','ecs','eks','sqs','sns','eventbridge'];
  const seen = [];
  for (const k of order) if (new RegExp(`\\b${k}\\b`, 'i').test(txt) && !seen.includes(k)) seen.push(k);
  return seen;
}

// ----------------------- response builders -----------------------

const CONTINUATIONS = {
  explain: ['Tell me when to use this vs alternatives', 'Show me Terraform for this', 'Quiz me on it'],
  compare: ['Show me a decision tree', 'Pick one for a startup', 'Pick one for an enterprise'],
  flashcards: ['Make 5 more on the harder edges', 'Quiz me on these'],
  practice: ['Explain the last one in more depth', 'Give me 5 more', 'Make them harder'],
  summarize: ['Summarize it for an exam', 'What are the 3 must-knows?'],
  iac: ['Add a Multi-AZ variant', 'Add cost-saving defaults', 'Add an output for the endpoint'],
  cli: ['How do I script this in a loop?', 'How do I do this in boto3?'],
  troubleshoot: ['What logs should I check first?', 'Give me a checklist'],
  'arch-review': ['Flag the cost risks', 'Suggest a Well-Architected fix'],
  'study-plan': ['Account for 3 hours per day', 'Bias the plan to networking'],
  recommend: ['Show me today\'s lesson', 'Open the practice exam'],
  general: ['Explain it more simply', 'Compare alternatives'],
  greet: ['Quiz me on Solutions Architect topics', 'What should I study today?', 'Explain VPC to me simply'],
};

/**
 * Build a structured response object for a given (intent, payload).
 * Returns:
 *   { text, suggestions: string[], links?: [{label, to|url}] }
 */
export function buildResponse({ intent, payload = {} }) {
  switch (intent) {
    case 'greet':       return greet();
    case 'explain':     return explain(payload.service, payload.topic);
    case 'compare':     return compare(payload.a, payload.b);
    case 'flashcards':  return flashcards(payload.service, payload.topic);
    case 'practice':    return practice(payload.service, payload.topic);
    case 'summarize':   return summarize(payload.topic);
    case 'iac':         return iac(payload.tool, payload.service);
    case 'cli':         return cli(payload.topic);
    case 'troubleshoot':return troubleshoot(payload.service, payload.topic);
    case 'arch-review': return archReview(payload.topic);
    case 'study-plan':  return studyPlan(payload.topic);
    case 'recommend':   return recommend();
    default:            return general(payload.topic);
  }
}

function greet() {
  return {
    text: `Hey! I\'m your AWS study assistant.

I can explain services simply, generate practice questions on any topic, walk through architecture trade-offs, write Terraform, and summarize whitepapers.

Pick one of the suggested questions below, or just ask me anything AWS.`,
    suggestions: CONTINUATIONS.greet,
    links: [],
  };
}

function explain(serviceId, topic) {
  const meta = serviceId ? SERVICE_TIPS[serviceId] : null;
  if (!meta) {
    return {
      text: `Sure — to explain ${topic || 'an AWS service'} crisply, I need a service name (S3, EC2, Lambda, VPC, RDS, DynamoDB, CloudFront, IAM…).

Try "explain S3 simply" or "what is Lambda".`,
      suggestions: ['Explain S3 simply', 'What is Lambda', 'Explain VPC'],
    };
  }
  const text =
`**${meta.name}** in one line: ${meta.simple}

**Under the hood:** ${meta.deep}

**Strengths**
${meta.pros.map((p) => `• ${p}`).join('\n')}

**Trade-offs**
${meta.cons.map((p) => `• ${p}`).join('\n')}

**When to reach for it:** ${meta.whenToUse}`;
  const links = serviceLinks(serviceId);
  return { text, suggestions: CONTINUATIONS.explain, links };
}

function compare(a, b) {
  const A = SERVICE_TIPS[a] || { name: a };
  const B = SERVICE_TIPS[b] || { name: b };
  const text =
`**${A.name} vs ${B.name}**

| | ${A.name} | ${B.name} |
| --- | --- | --- |
| One-liner | ${A.simple || '—'} | ${B.simple || '—'} |
| Use when  | ${A.whenToUse || '—'} | ${B.whenToUse || '—'} |
| Watch out | ${(A.cons?.[0]) || '—'} | ${(B.cons?.[0]) || '—'} |

**Rule of thumb:** start with ${A.name} when you need ${shortPick(A)}. Reach for ${B.name} when ${shortPick(B)}.`;
  return { text, suggestions: CONTINUATIONS.compare };
}

function shortPick(s) {
  return (s.whenToUse || 'the canonical case for it').toLowerCase().replace(/\.$/, '');
}

function flashcards(serviceId, topic) {
  const meta = serviceId ? SERVICE_TIPS[serviceId] : null;
  const cards = meta ? [
    { front: `What is ${meta.name}?`, back: meta.simple },
    { front: `Best use case for ${meta.name}?`, back: meta.whenToUse },
    { front: `Biggest trade-off of ${meta.name}?`, back: meta.cons?.[0] || '—' },
    { front: `${meta.name} pricing model?`, back: pricingFor(serviceId) },
  ] : [
    { front: 'What\'s in a VPC by default?', back: 'A default route table, NACL, security group, and (in default VPCs) one subnet per AZ.' },
    { front: 'Difference between SG and NACL?', back: 'SG is stateful, instance-level, allow-only. NACL is stateless, subnet-level, supports DENY.' },
    { front: 'What\'s the S3 durability number?', back: '11 nines (99.999999999%) across 3+ AZs.' },
    { front: 'Lambda max execution?', back: '15 minutes per invocation.' },
  ];
  const text =
`Here are flashcards on ${meta?.name || topic || 'this topic'}:\n\n${cards.map((c, i) =>
    `**${i + 1}. ${c.front}**\n${c.back}`).join('\n\n')}\n\nWant me to make 5 more on harder edges, or quiz you?`;
  return { text, suggestions: CONTINUATIONS.flashcards };
}

function pricingFor(serviceId) {
  return ({
    s3: 'Per GB-month + per-request + egress.',
    ec2: 'Per second (60s min). Spot saves up to 90%; Savings Plans up to 72%.',
    lambda: 'Per request + per-GB-second.',
    dynamodb: 'On-demand: per request. Provisioned: per RCU/WCU.',
    rds: 'Per hour by instance class + storage GB-month.',
    cloudfront: 'Per GB egress (~$0.085/GB in NA/EU) + per-request.',
    vpc: 'Free; NAT Gateway ~$0.045/hr + $0.045/GB.',
    iam: 'Free.',
  })[serviceId] || 'Pay-as-you-go by resource.';
}

function practice(serviceId, topic) {
  const sample = serviceId === 's3' ? [
    {
      q: 'You need to serve a static site globally with HTTPS on a custom domain. Cheapest production-grade setup?',
      opts: ['S3 in every region', 'S3 + CloudFront + ACM (us-east-1)', 'EC2 nginx in 3 regions', 'Lightsail'],
      a: 1,
      why: 'One S3 origin + CloudFront caches at 400+ edges. ACM must live in us-east-1 for CloudFront.',
    },
    {
      q: 'Which S3 class is cheapest with millisecond retrieval?',
      opts: ['Standard', 'Glacier Instant Retrieval', 'Glacier Deep Archive', 'One Zone-IA'],
      a: 1,
      why: 'Glacier Instant Retrieval is archival pricing with millisecond access.',
    },
  ] : [
    {
      q: 'A Lambda processing SQS messages must handle duplicates. Best mitigation?',
      opts: ['Increase concurrency', 'Make the handler idempotent', 'Disable retries', 'Switch to EventBridge'],
      a: 1,
      why: 'SQS is at-least-once. Idempotent handlers absorb duplicates safely.',
    },
    {
      q: 'Which is true about NAT Gateways?',
      opts: ['Allow inbound from internet', 'Are placed in private subnets', 'Enable outbound from private + live in a public subnet', 'Are free'],
      a: 2,
      why: 'NAT lives in a public subnet, lets private subnets initiate egress, costs hourly + per GB.',
    },
  ];
  const text = `Practice quiz on ${SERVICE_TIPS[serviceId]?.name || topic || 'AWS'}:\n\n` +
    sample.map((q, i) =>
      `**Q${i + 1}. ${q.q}**\n${q.opts.map((o, idx) => `${String.fromCharCode(65 + idx)}. ${o}`).join('\n')}\n\n_Answer: ${String.fromCharCode(65 + q.a)} — ${q.why}_`,
    ).join('\n\n');
  return { text, suggestions: CONTINUATIONS.practice };
}

function summarize(topic) {
  const text =
`Here\'s a 6-bullet summary:

• **Goal:** what the doc is trying to achieve.
• **Pattern:** the canonical AWS-recommended way.
• **Pitfall #1:** the misconception that bites teams most often.
• **Pitfall #2:** the cost trap.
• **Operational note:** the runbook implication.
• **Exam relevance:** what an exam writer is likely to pull from this.

Paste the whitepaper title or topic and I\'ll tailor this to the specific source.`;
  return { text, suggestions: CONTINUATIONS.summarize };
}

function iac(tool, serviceId) {
  const key = `${serviceId}-${tool === 'cloudformation' ? 'cfn' : 'tf'}`;
  // Map serviceId to nearest available snippet
  const lookup = ({
    's3-tf': 's3-bucket-tf',
    's3-cfn': 's3-bucket-cfn',
    'lambda-tf': 'lambda-tf',
  })[`${serviceId}-${tool === 'cloudformation' ? 'cfn' : 'tf'}`];
  const code = lookup ? IAC_SNIPPETS[lookup] : null;
  if (!code) {
    return {
      text:
`I\'ve got templates for S3 (Terraform + CloudFormation) and Lambda (Terraform). For ${serviceId || 'this service'} in ${tool}, try the AWS Provider docs or terraform-aws-modules.

Ask "Terraform for S3" or "CloudFormation for S3 bucket" to see a working snippet.`,
      suggestions: ['Terraform for S3', 'CloudFormation for S3 bucket', 'Terraform for Lambda'],
    };
  }
  const text =
`Here\'s a production-grade ${tool === 'cloudformation' ? 'CloudFormation' : 'Terraform'} snippet:\n\n\`\`\`${tool === 'cloudformation' ? 'yaml' : 'hcl'}\n${code}\n\`\`\`\n\nNotes:\n• Block Public Access is on by default since 2023 — verified above.\n• Versioning is essential for accidental-delete recovery.\n• SSE-S3 (AES256) is the no-cost default; switch to SSE-KMS for compliance.`;
  return { text, suggestions: CONTINUATIONS.iac };
}

function cli(topic) {
  const match = CLI_SNIPPETS.find((s) => s.match.test(topic));
  if (match) {
    return {
      text:
`\`\`\`bash\n${match.cmd}\n\`\`\`\n\n${match.explain}\n\nTip: every AWS CLI command supports \`--query\` for JMESPath filtering and \`--output table\` for human-readable output.`,
      suggestions: CONTINUATIONS.cli,
    };
  }
  return {
    text:
`I have CLI snippets for: listing buckets, listing EC2, STS assume-role, uploading to S3, invoking Lambda.

Tell me what you want to do and I\'ll give you the exact command — e.g. "list all my EC2 instances" or "upload a folder to S3".`,
    suggestions: ['List all my EC2 instances', 'Upload a folder to S3', 'Invoke a Lambda from CLI'],
  };
}

function troubleshoot(serviceId, topic) {
  const checklists = {
    s3: ['Block Public Access turned on but you expected the bucket public', 'Cross-account: bucket policy missing the principal', 'CloudFront caching the failure — invalidate /path', 'Wrong region for ACM cert (CloudFront needs us-east-1)'],
    ec2: ['Security Group: did you allow port + source IP?', 'SSH key permissions: chmod 400 your-key.pem', 'Subnet has no internet route (private subnet?)', 'Did you allocate an Elastic IP for stable public IP?'],
    lambda: ['IAM role lacks the action — check Policy Simulator', 'Cold start vs timeout — increase memory or move heavy imports to module scope', 'Response > 6MB sync limit — switch to async or stream', 'VPC-attached Lambda needs NAT for internet'],
    vpc: ['Route table missing default route to IGW (public) or NAT (private)', 'NACL rule missing the ephemeral port range (32768-65535)', 'Overlapping CIDRs — peering won\'t work', 'NAT in wrong subnet — must be in a public subnet with IGW route'],
    rds: ['Security Group: DB SG must allow the app SG', 'Endpoint resolves only inside the VPC — bastion or VPN to test from laptop', 'Encryption enabled? Cannot enable after creation', 'Default port — Postgres 5432, MySQL 3306'],
    iam: ['Explicit DENY in another policy or SCP', 'Missing condition like aws:SecureTransport', 'STS assume-role needs sts:AssumeRole + trust policy on the role', 'Eventually consistent — wait a few seconds after attaching a policy'],
  };
  const list = (serviceId && checklists[serviceId]) || [
    'Read the CloudTrail event — it shows the exact API call + error',
    'Compare with a known-working environment',
    'Check IAM via the Policy Simulator',
    'Check the SG + NACL + route table',
    'Confirm the resource exists in the region you\'re calling',
  ];
  const text =
`Here\'s the troubleshoot checklist${serviceId ? ` for ${SERVICE_TIPS[serviceId]?.name || serviceId}` : ''}:\n\n${list.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\nPaste the exact error message and I\'ll narrow it down further.`;
  return { text, suggestions: CONTINUATIONS.troubleshoot };
}

function archReview(topic) {
  const text =
`Here\'s how I\'d structure an architecture review:

**1. Reliability**
- Multi-AZ? If any tier is single-AZ, that\'s your first finding.
- Stateful tiers backed by a managed service (RDS, DynamoDB, ElastiCache)?
- Failure modes documented + tested (Chaos drill)?

**2. Security**
- Least-privilege IAM roles per workload?
- Secrets in Secrets Manager (not env vars in code)?
- All data encrypted in transit (TLS) and at rest (SSE)?
- VPC Flow Logs + GuardDuty + CloudTrail enabled?

**3. Performance**
- CDN in front of public traffic (CloudFront)?
- Cache layer (ElastiCache) for hot reads?
- Right instance family? (R for memory, C for compute, T only for low-burst)

**4. Cost**
- NAT Gateways: one per AZ, but minimize by VPC endpoints for S3/DynamoDB.
- Storage tiers: lifecycle to IA / Glacier for cold data.
- Spot/Savings Plans on baseline compute?

**5. Operational excellence**
- Pipeline as code (Terraform/CDK)?
- Dashboards + alarms?
- Runbooks?

Paste your diagram (or describe it) and I\'ll apply this to your design.`;
  return { text, suggestions: CONTINUATIONS['arch-review'] };
}

function studyPlan(topic) {
  const text =
`A solid AWS study plan looks like:

**Week 1-2 — Foundations**
- Cloud concepts, regions/AZs, IAM, billing.
- 2-3 hands-on labs.

**Week 3-5 — Service depth (by exam weighting)**
- For SAA: ~30% security/IAM, ~26% reliability, ~24% performance, ~20% cost.
- Knock out the heaviest domain first.

**Week 6 — Architecture practice**
- Read 3 real reference architectures.
- Build at least one end-to-end.

**Week 7 — Mock exams**
- One full mock per week minimum. Review wrong answers in depth.

**Final week — Review only**
- Re-read your notes. Don\'t learn new topics in week 8.

Use the Study Plan Generator on the AI page to get an exact day-by-day calendar tailored to your exam date and hours per day.`;
  return {
    text,
    suggestions: CONTINUATIONS['study-plan'],
    links: [{ label: 'Open Study Plan Generator', to: '/ai/study-plan' }],
  };
}

function recommend() {
  // Use a deterministic pick from the catalog to suggest something concrete.
  const all = LEARNING_CATEGORIES.flatMap((c) => c.topics.map((t) => ({ c, t })));
  const seed = new Date().toISOString().slice(0, 10);
  const idx = hash(seed) % all.length;
  const pick = all[idx];
  const text =
`Today\'s recommendation: **${pick.t.title}** in *${pick.c.title}*.

${pick.t.summary || pick.t.simpleEnglish?.slice(0, 240) || ''}

Open it in the Learning Lab and aim for 20-30 minutes — read the deep dive, then run the quiz at the bottom.`;
  return {
    text,
    suggestions: CONTINUATIONS.recommend,
    links: [{ label: 'Open this topic', to: `/learning/${pick.c.id}/${pick.t.id}` }],
  };
}

function general(topic) {
  // Try to find a learning topic that mentions the query
  const term = (topic || '').toLowerCase();
  if (term) {
    for (const cat of LEARNING_CATEGORIES) {
      for (const t of cat.topics) {
        if (t.title.toLowerCase().includes(term) ||
            (t.summary || '').toLowerCase().includes(term)) {
          return {
            text:
`The closest Learning Lab topic I have is **${t.title}** in *${cat.title}*.

${t.simpleEnglish || t.summary || ''}

Open it for the full deep dive.`,
            suggestions: CONTINUATIONS.general,
            links: [{ label: 'Open topic', to: `/learning/${cat.id}/${t.id}` }],
          };
        }
      }
    }
  }
  return {
    text:
`I can answer pretty much any AWS question. Try being a bit more specific — name a service, paste an error, or ask for a comparison.

Some prompts that work well:
• "Explain Lambda simply"
• "Compare S3 vs EFS"
• "Why is my Lambda getting AccessDenied to DynamoDB?"
• "Terraform for an S3 bucket"
• "Quiz me on VPC"`,
    suggestions: CONTINUATIONS.general,
  };
}

function serviceLinks(serviceId) {
  const map = {
    s3: { categoryId: 'sto', topicId: 'c3-t1' },
    ec2: { categoryId: 'cmp', topicId: 'c2-t1' },
    lambda: { categoryId: 'cmp', topicId: 'c2-t3' },
    dynamodb: { categoryId: 'db', topicId: 'c6-t4' },
    rds: { categoryId: 'db', topicId: 'c6-t2' },
    vpc: { categoryId: 'net', topicId: 'c4-t1' },
    cloudfront: { categoryId: 'net', topicId: 'c4-t4' },
    iam: { categoryId: 'sec', topicId: 'c5-t1' },
  };
  const ref = map[serviceId];
  return ref ? [{ label: 'Open in Learning Lab', to: `/learning/${ref.categoryId}/${ref.topicId}` }] : [];
}

function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

// ----------------------- streaming helper -----------------------

/**
 * Stream a string out character-by-character (or word-by-word) into a
 * callback. Returns a cancel function. Designed for AbortController-style
 * cleanup in React effects.
 */
export function streamText(text, onChunk, { msPerChunk = 12, chunkSize = 3, onDone } = {}) {
  let cancelled = false;
  let i = 0;
  const tick = () => {
    if (cancelled) return;
    const next = text.slice(0, i);
    onChunk(next);
    if (i >= text.length) { onDone?.(); return; }
    i = Math.min(text.length, i + chunkSize);
    setTimeout(tick, msPerChunk);
  };
  tick();
  return () => { cancelled = true; };
}

// ----------------------- export catalog for the UI -----------------------

export const SUGGESTED_PROMPTS = [
  'Explain Lambda to me simply',
  'Compare S3 vs EFS',
  'Quiz me on VPC fundamentals',
  'What should I study today?',
  'Why is my Lambda getting AccessDenied to DynamoDB?',
  'Terraform for an S3 bucket',
  'Summarize the Well-Architected Framework',
  'Review my 3-tier web architecture',
];
