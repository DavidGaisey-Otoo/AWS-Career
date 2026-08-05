/**
 * Portfolio project catalog — 8 deeply detailed AWS portfolio projects.
 *
 * Each project ships with: business case, architecture (nodes + edges
 * for diagramming), step-by-step build guide, common errors with fixes,
 * client-presentation talking points, real companies using the pattern,
 * cost notes, and related certifications.
 *
 * IDs are stable so user progress persists across data edits.
 */

const SERVICE_META = {
  s3:           { label: 'S3',            domain: 'storage',     color: '#22D3EE' },
  cloudfront:   { label: 'CloudFront',    domain: 'network',     color: '#A78BFA' },
  route53:      { label: 'Route 53',      domain: 'network',     color: '#F472B6' },
  acm:          { label: 'ACM',           domain: 'security',    color: '#34D399' },
  ec2:          { label: 'EC2',           domain: 'compute',     color: '#FB923C' },
  vpc:          { label: 'VPC',           domain: 'network',     color: '#60A5FA' },
  sg:           { label: 'Security Group',domain: 'security',    color: '#34D399' },
  eip:          { label: 'Elastic IP',    domain: 'network',     color: '#60A5FA' },
  alb:          { label: 'ALB',           domain: 'network',     color: '#A78BFA' },
  asg:          { label: 'Auto Scaling',  domain: 'compute',     color: '#FB923C' },
  lambda:       { label: 'Lambda',        domain: 'compute',     color: '#FB923C' },
  apigateway:   { label: 'API Gateway',   domain: 'network',     color: '#A78BFA' },
  dynamodb:     { label: 'DynamoDB',      domain: 'database',    color: '#F472B6' },
  iam:          { label: 'IAM',           domain: 'security',    color: '#34D399' },
  nat:          { label: 'NAT Gateway',   domain: 'network',     color: '#60A5FA' },
  vpn:          { label: 'Site-to-Site VPN', domain: 'network',  color: '#60A5FA' },
  tgw:          { label: 'Transit Gateway', domain: 'network',   color: '#60A5FA' },
  dx:           { label: 'Direct Connect', domain: 'network',    color: '#60A5FA' },
  codecommit:   { label: 'CodeCommit',    domain: 'devops',      color: '#FBBF24' },
  codebuild:    { label: 'CodeBuild',     domain: 'devops',      color: '#FBBF24' },
  codedeploy:   { label: 'CodeDeploy',    domain: 'devops',      color: '#FBBF24' },
  codepipeline: { label: 'CodePipeline',  domain: 'devops',      color: '#FBBF24' },
  rds:          { label: 'RDS',           domain: 'database',    color: '#F472B6' },
  dms:          { label: 'DMS',           domain: 'database',    color: '#F472B6' },
  secretsmgr:   { label: 'Secrets Manager', domain: 'security',  color: '#34D399' },
  cloudwatch:   { label: 'CloudWatch',    domain: 'monitoring',  color: '#22D3EE' },
  sns:          { label: 'SNS',           domain: 'monitoring',  color: '#22D3EE' },
  cloudtrail:   { label: 'CloudTrail',    domain: 'security',    color: '#34D399' },
};

export const SERVICE_DOMAINS = [
  'compute', 'storage', 'network', 'database', 'security', 'monitoring', 'devops', 'ai',
];

export const DOMAIN_LABEL = {
  compute: 'Compute', storage: 'Storage', network: 'Networking',
  database: 'Database', security: 'Security', monitoring: 'Monitoring',
  devops: 'DevOps', ai: 'AI / ML',
};

export const getServiceMeta = (id) =>
  SERVICE_META[id] || { label: id, domain: 'compute', color: '#FB923C' };

export const DIFFICULTY = {
  beginner:      { label: 'Beginner',         level: 1, color: 'text-success border-success/40 bg-success/10' },
  'beg-int':     { label: 'Beginner–Intermediate', level: 2, color: 'text-success border-success/40 bg-success/10' },
  intermediate:  { label: 'Intermediate',     level: 3, color: 'text-warning border-warning/40 bg-warning/10' },
  'int-adv':     { label: 'Intermediate–Advanced', level: 4, color: 'text-warning border-warning/40 bg-warning/10' },
  advanced:      { label: 'Advanced',         level: 5, color: 'text-danger border-danger/40 bg-danger/10' },
};

export const STATUS = {
  'not-started': { label: 'Not started', color: 'bg-[var(--card-2)] text-muted', emoji: '·' },
  'in-progress': { label: 'In progress', color: 'bg-aws-orange/15 text-aws-orange border border-aws-orange/30', emoji: '◐' },
  'review':      { label: 'Review',      color: 'bg-electric/15 text-electric border border-electric/30', emoji: '◑' },
  'complete':    { label: 'Complete',    color: 'bg-success/15 text-success border border-success/30', emoji: '✓' },
};
export const STATUS_ORDER = ['not-started', 'in-progress', 'review', 'complete'];

export const PRIORITY = {
  immediate: { label: 'Immediate', color: 'text-danger bg-danger/10 border-danger/30' },
  soon:      { label: 'Soon',      color: 'text-warning bg-warning/10 border-warning/30' },
  later:     { label: 'Later',     color: 'text-electric bg-electric/10 border-electric/30' },
};

// ---------- Helper to author build steps tersely ----------
const step = (id, title, subs = [], opts = {}) => ({
  id, title, subs: subs.map((s, i) => ({ id: `${id}-s${i + 1}`, title: s })),
  estMinutes: opts.estMinutes,
});

const err = (problem, fix) => ({ problem, fix });

// ---------- THE 8 PROJECTS ----------
export const PROJECTS = [
  {
    id: 'p-s3-cf',
    n: 1,
    title: 'S3 Static Website with CloudFront',
    tagline: 'A globally distributed static site for under $1/month.',
    summary: 'Host a high-performance company website on AWS with HTTPS, custom domain, and CDN edge caching.',
    businessCase:
      'Small businesses want their marketing site to load instantly worldwide, survive traffic spikes from a viral campaign, and cost almost nothing to run. Traditional shared hosting buckles under load and offers no global edge presence — this is the modern alternative.',
    difficulty: 'beginner',
    services: ['s3', 'cloudfront', 'route53', 'acm'],
    skills: ['S3 hosting', 'Edge CDN caching', 'HTTPS with ACM', 'Custom domain DNS', 'Cache invalidation'],
    estMinutes: 9 * 60,
    estLabel: '8–10 hours',
    clientAppeal: 7,
    certs: ['Cloud Practitioner', 'Solutions Architect Associate'],
    costNotes: 'Free Tier covers ~all of it for low traffic. After Free Tier: ~$0.50–$2/mo at small scale.',
    freeTier: true,
    companies: ['Netflix', 'Airbnb', 'Discord', 'Shopify'],
    architecture: {
      nodes: [
        { id: 'user',   label: 'User',         icon: '👤', x: 50,  y: 100 },
        { id: 'r53',    label: 'Route 53',     service: 'route53',    x: 230, y: 100 },
        { id: 'cf',     label: 'CloudFront',   service: 'cloudfront', x: 420, y: 100 },
        { id: 'acm',    label: 'ACM Cert',     service: 'acm',        x: 420, y: 30  },
        { id: 's3',     label: 'S3 (origin)',  service: 's3',         x: 610, y: 100 },
      ],
      edges: [
        { from: 'user', to: 'r53', label: 'DNS' },
        { from: 'r53',  to: 'cf',  label: 'A/AAAA' },
        { from: 'acm',  to: 'cf',  label: 'TLS', dashed: true },
        { from: 'cf',   to: 's3',  label: 'origin' },
      ],
    },
    prerequisites: ['AWS Free Tier account', 'Domain name (optional — Route 53 can register one)'],
    buildSteps: [
      step('s3cf-1', 'Create + configure the S3 bucket',
        ['Create a globally-unique bucket name matching your domain', 'Enable static website hosting', 'Upload index.html, error.html, and assets', 'Apply a public-read bucket policy scoped only to GetObject']),
      step('s3cf-2', 'Request a TLS certificate in ACM',
        ['Request a public certificate in us-east-1 (required for CloudFront)', 'Add your domain + www subdomain', 'Validate via DNS — create the suggested CNAME']),
      step('s3cf-3', 'Create the CloudFront distribution',
        ['Set the S3 website endpoint as the origin', 'Force HTTPS (redirect HTTP→HTTPS)', 'Attach the ACM certificate', 'Set default root object to index.html', 'Enable compression']),
      step('s3cf-4', 'Wire up Route 53',
        ['Create a hosted zone for your domain (if not already)', 'Add an A/ALIAS record pointing to the CloudFront distribution', 'Add a second ALIAS for the www subdomain']),
      step('s3cf-5', 'Verify + tune',
        ['Hit the site over HTTPS — check the padlock', 'Run a Lighthouse audit', 'Invalidate the cache after every deploy (or use versioned filenames)', 'Set up a CloudWatch billing alert at $1']),
    ],
    commonErrors: [
      err('"403 Forbidden" on the CloudFront URL',
        'The S3 bucket policy is missing or the origin uses the REST endpoint instead of the website endpoint. Use the website endpoint and confirm the bucket policy grants s3:GetObject to everyone (or to the CloudFront OAC).'),
      err('Custom domain shows a TLS warning',
        'The ACM certificate is in the wrong region. CloudFront requires it in us-east-1, regardless of where your other resources live. Re-issue there.'),
      err('Updated HTML still shows old content',
        'CloudFront caches aggressively. Either invalidate /index.html after deploy or use versioned filenames (e.g. main.abc123.css) and configure long Cache-Control.'),
      err('Route 53 record won\'t resolve',
        'DNS propagation can take up to 60 seconds for ALIAS, longer if you previously had a different record cached. Test with `dig your-domain.com @8.8.8.8` to bypass local cache.'),
    ],
    presentation: [
      'Cost: under $2/month at small scale — vs $20+ for shared hosting.',
      'Latency: edge-cached → sub-100ms TTFB anywhere in the world.',
      'No servers to patch — never wake at 3am because a security update broke the site.',
      'Scales automatically — your launch can hit Hacker News without a single config change.',
    ],
  },

  {
    id: 'p-ec2-vpc',
    n: 2,
    title: 'EC2 Web Application behind a Load Balancer',
    tagline: 'A real web app on managed virtual machines, fronted by an ALB.',
    summary: 'Host a dynamic web app on EC2 across two AZs with an Application Load Balancer, security groups, and Elastic IPs.',
    businessCase:
      'Many B2B web apps still need long-running compute — image processing, websockets, legacy frameworks. EC2 + ALB gives you familiar VM hosting with cloud elasticity and zero downtime deploys.',
    difficulty: 'beg-int',
    services: ['ec2', 'vpc', 'sg', 'eip', 'alb', 'asg'],
    skills: ['Server provisioning', 'VPC + subnet design', 'Security group rules', 'Load balancer health checks', 'Auto Scaling Groups', 'Zero-downtime deploys'],
    estMinutes: 13 * 60,
    estLabel: '12–15 hours',
    clientAppeal: 8,
    certs: ['Solutions Architect Associate', 'SysOps Administrator'],
    costNotes: 'Free Tier covers one t2.micro for 12 months. ALB is ~$16/mo + data.',
    freeTier: true,
    companies: ['Slack', 'Reddit', 'GitLab', 'Stripe internal tools'],
    architecture: {
      nodes: [
        { id: 'user', label: 'User',     icon: '👤',   x: 40,  y: 110 },
        { id: 'alb',  label: 'ALB',      service: 'alb', x: 210, y: 110 },
        { id: 'ec2a', label: 'EC2 AZ-A', service: 'ec2', x: 410, y: 50  },
        { id: 'ec2b', label: 'EC2 AZ-B', service: 'ec2', x: 410, y: 170 },
        { id: 'sg',   label: 'SG',       service: 'sg',  x: 590, y: 110 },
      ],
      edges: [
        { from: 'user', to: 'alb',  label: 'HTTPS' },
        { from: 'alb',  to: 'ec2a' },
        { from: 'alb',  to: 'ec2b' },
        { from: 'sg',   to: 'ec2a', dashed: true },
        { from: 'sg',   to: 'ec2b', dashed: true },
      ],
    },
    prerequisites: ['Comfortable on the Linux shell', 'Basic networking knowledge', 'A small web app to deploy'],
    buildSteps: [
      step('ec2-1', 'Design + build the VPC',
        ['Create a /16 VPC', 'Add two public subnets in two AZs', 'Attach an Internet Gateway and a public route table', 'Tag everything consistently']),
      step('ec2-2', 'Launch two EC2 instances',
        ['Launch t2.micro Ubuntu instances in each subnet', 'Create a key pair and store it safely', 'Apply a security group allowing 22 (your IP) and 80 from the ALB SG', 'SSH in and confirm internet works']),
      step('ec2-3', 'Install + run the app',
        ['Install runtime (Node/Python) + reverse proxy (nginx)', 'Clone the app repo, install deps, run on port 3000', 'Configure nginx to proxy 80 → 3000', 'Create a systemd unit for auto-restart']),
      step('ec2-4', 'Create the Application Load Balancer',
        ['Create an ALB across both public subnets', 'Create a target group with /health health check', 'Register both EC2s as targets', 'Test the ALB DNS — both AZs should serve traffic']),
      step('ec2-5', 'Add Auto Scaling',
        ['Create an AMI from your working instance', 'Define a launch template using the AMI', 'Create an ASG (min 2, max 4) across both AZs', 'Add a CPU > 70% scale-out policy']),
      step('ec2-6', 'Lock it down + document',
        ['Restrict SSH to a bastion or SSM Session Manager', 'Enable VPC Flow Logs', 'Write a runbook for incident response', 'Push the architecture diagram to GitHub']),
    ],
    commonErrors: [
      err('ALB returns 502 Bad Gateway',
        'Target group health check is failing. Confirm /health exists on the app, the SG between ALB and EC2 allows port 80/3000, and the app actually returns 200 (not 301).'),
      err('Can\'t SSH after creating SG',
        'Your home IP changed (common with mobile networks). Update the SG ingress rule with your current IP, or move to Session Manager so you don\'t need SSH at all.'),
      err('Auto Scaling launches instances that fail health checks immediately',
        'AMI was taken with the app stopped. SSH in, ensure the systemd service is enabled (`systemctl enable myapp`), then re-create the AMI.'),
      err('NAT charges blowing up the bill',
        'Private instances pulling large container images through a NAT Gateway is expensive. Use a VPC Endpoint for S3/ECR or move to a public subnet with no public IP.'),
    ],
    presentation: [
      'Multi-AZ → tolerates a full availability zone outage with zero customer impact.',
      'ALB health checks pull failed instances out automatically — no pager at 3am.',
      'Auto Scaling means your Black Friday traffic doesn\'t require capacity planning.',
      'Familiar VM model — your team\'s existing playbooks still work.',
    ],
  },

  {
    id: 'p-serverless',
    n: 3,
    title: 'Serverless API with Lambda + API Gateway',
    tagline: 'A scale-to-zero REST API that costs nothing at idle.',
    summary: 'Build a CRUD API with Lambda functions, API Gateway endpoints, DynamoDB persistence, and JWT auth via Cognito.',
    businessCase:
      'Many internal tools and side projects hit the API a few thousand times a day at most. Paying for a 24/7 EC2 instance is waste. Serverless bills only for actual usage and scales from 0 to thousands in seconds.',
    difficulty: 'intermediate',
    services: ['lambda', 'apigateway', 'dynamodb', 'iam'],
    skills: ['Serverless mental model', 'REST API design', 'NoSQL data modeling', 'IAM least privilege', 'Structured logging', 'Cold-start tuning'],
    estMinutes: 17 * 60,
    estLabel: '15–20 hours',
    clientAppeal: 9,
    certs: ['Solutions Architect Associate', 'Developer Associate'],
    costNotes: 'Effectively free under 1M requests/month. Even at 10M, well under $20.',
    freeTier: true,
    companies: ['Coca-Cola order app', 'iRobot', 'The Guardian', 'Bustle'],
    architecture: {
      nodes: [
        { id: 'client', label: 'Client',     icon: '📱',          x: 40,  y: 110 },
        { id: 'apigw',  label: 'API Gateway', service: 'apigateway', x: 210, y: 110 },
        { id: 'lambda', label: 'Lambda',      service: 'lambda',    x: 400, y: 110 },
        { id: 'ddb',    label: 'DynamoDB',    service: 'dynamodb',  x: 580, y: 110 },
        { id: 'iam',    label: 'IAM Role',    service: 'iam',       x: 400, y: 30  },
      ],
      edges: [
        { from: 'client', to: 'apigw', label: 'HTTPS' },
        { from: 'apigw',  to: 'lambda', label: 'invoke' },
        { from: 'iam',    to: 'lambda', dashed: true },
        { from: 'lambda', to: 'ddb',    label: 'CRUD' },
      ],
    },
    prerequisites: ['JavaScript/TypeScript or Python basics', 'Familiarity with REST and JSON'],
    buildSteps: [
      step('sl-1', 'Define the API + data model',
        ['Sketch the endpoints (GET/POST/PUT/DELETE /items)', 'Decide DynamoDB partition key + GSIs', 'Document the JSON contract']),
      step('sl-2', 'Provision DynamoDB',
        ['Create an on-demand table', 'Add a global secondary index for queries you need', 'Seed two test items via the console']),
      step('sl-3', 'Write the Lambda handlers',
        ['Scaffold 4 functions — one per verb', 'Use the AWS SDK with no global state to keep cold starts cheap', 'Add input validation + structured JSON logs', 'Return proper status codes']),
      step('sl-4', 'Create IAM role with least privilege',
        ['Give the Lambda role only dynamodb:GetItem/PutItem/Query/DeleteItem on that table', 'Avoid wildcard resources', 'Test by removing a permission and confirming the right 403']),
      step('sl-5', 'Wire up API Gateway',
        ['Create an HTTP API (cheaper, simpler than REST API)', 'Map each route to the right Lambda', 'Enable CORS for your frontend domain']),
      step('sl-6', 'Add auth with Cognito',
        ['Create a User Pool + app client', 'Attach a JWT authorizer to protected routes', 'Issue a test token and call the API with it']),
      step('sl-7', 'Observability + deploy',
        ['Add CloudWatch alarms on 5xx + p99 latency', 'Enable X-Ray for one Lambda to see the call tree', 'Bundle everything into a SAM/CDK template + deploy']),
    ],
    commonErrors: [
      err('Lambda gets "AccessDenied" calling DynamoDB',
        'IAM role lacks the action or resource is wrong (table ARN vs index ARN). Test the policy in IAM Policy Simulator.'),
      err('CORS error in the browser',
        'API Gateway HTTP API CORS settings are separate from Lambda response headers. Set them on the API itself, not just in the function.'),
      err('Cold starts feel slow',
        'Move heavy imports to module scope so they survive across invocations. Avoid VPC unless required. Consider Provisioned Concurrency for latency-critical endpoints.'),
      err('DynamoDB throws "ValidationException"',
        'You\'re mixing types (e.g. sending a number as string) or missing the partition key. Always Marshall via the document client and log the input.'),
    ],
    presentation: [
      'Zero idle cost — your API costs nothing on weekends.',
      'Scales from one request/sec to ten thousand without redeploying.',
      'No patching, no AMIs, no capacity planning.',
      'Built-in tracing + per-function metrics — debugging is faster than monoliths.',
    ],
  },

  {
    id: 'p-vpc',
    n: 4,
    title: 'VPC Network Design with Hybrid Connectivity',
    tagline: 'Enterprise-grade networking — connect on-prem to AWS securely.',
    summary: 'Design a multi-AZ VPC with public + private subnets, NAT, security tiers, and Site-to-Site VPN/Transit Gateway connectivity.',
    businessCase:
      'Most enterprises run hybrid — some workloads in AWS, some in their existing data center. Reliable, secure, well-segmented connectivity between the two is the foundation everything else sits on. Get this wrong and nothing else works.',
    difficulty: 'intermediate',
    services: ['vpc', 'sg', 'nat', 'vpn', 'tgw'],
    skills: ['Advanced subnetting (CIDR planning)', 'Route table design', 'Defense in depth (SG + NACL)', 'Transit Gateway routing', 'Site-to-Site VPN setup', 'BGP basics'],
    estMinutes: 17 * 60,
    estLabel: '15–20 hours',
    clientAppeal: 9,
    certs: ['Advanced Networking Specialty', 'Solutions Architect Professional'],
    costNotes: 'NAT Gateway is the costly piece (~$32/mo + data). Transit Gateway has hourly + data charges.',
    freeTier: false,
    companies: ['Capital One', 'Liberty Mutual', 'BMW', 'Roche'],
    standout: 'Your networking background gives you an instant edge here — this is the project most likely to land enterprise gigs.',
    architecture: {
      nodes: [
        { id: 'onprem', label: 'On-Prem',       icon: '🏢',   x: 40,  y: 110 },
        { id: 'vpn',    label: 'VPN',           service: 'vpn',  x: 200, y: 110 },
        { id: 'tgw',    label: 'Transit GW',    service: 'tgw',  x: 360, y: 110 },
        { id: 'vpc',    label: 'VPC',           service: 'vpc',  x: 520, y: 110 },
        { id: 'nat',    label: 'NAT',           service: 'nat',  x: 520, y: 30  },
        { id: 'sg',     label: 'SGs / NACLs',   service: 'sg',   x: 700, y: 110 },
      ],
      edges: [
        { from: 'onprem', to: 'vpn',  label: 'IPSec' },
        { from: 'vpn',    to: 'tgw' },
        { from: 'tgw',    to: 'vpc' },
        { from: 'vpc',    to: 'nat',  dashed: true },
        { from: 'vpc',    to: 'sg',   dashed: true },
      ],
    },
    prerequisites: ['Solid IP subnetting', 'Familiarity with routing tables', 'Basic firewall concepts'],
    buildSteps: [
      step('vpc-1', 'CIDR planning',
        ['Pick a /16 that does not overlap on-prem', 'Carve /24 subnets — 2 public, 2 private, 2 reserved per AZ', 'Document the plan in a table before you click anything']),
      step('vpc-2', 'Build the VPC + subnets',
        ['Create the VPC + 6 subnets across 2 AZs', 'Attach an IGW + create public route table', 'Create the NAT Gateway in a public subnet', 'Route private subnets through the NAT']),
      step('vpc-3', 'Layer in defense in depth',
        ['Create tiered Security Groups (web, app, db)', 'Tighten NACLs with stateless allow-rules per tier', 'Document allowed flows in a diagram']),
      step('vpc-4', 'Set up the hybrid connection',
        ['Create a Customer Gateway pointing at on-prem public IP', 'Create the VPN connection (or Direct Connect virtual interface)', 'Configure on-prem side (Cisco/Fortinet/etc.) using AWS-provided config', 'Confirm tunnels up + propagate routes']),
      step('vpc-5', 'Add Transit Gateway',
        ['Create a Transit Gateway in the region', 'Attach VPC + VPN attachments', 'Build a TGW route table for hub-and-spoke', 'Test cross-VPC + on-prem ↔ AWS routing']),
      step('vpc-6', 'Validate + monitor',
        ['Run iperf between on-prem and AWS subnets', 'Enable VPC Flow Logs to CloudWatch + S3', 'Add alarms on REJECT spikes and tunnel down events']),
    ],
    commonErrors: [
      err('VPN tunnels stuck in DOWN state',
        'Mismatched IKE/IPSec parameters between AWS and on-prem device. Use the exact AWS-generated config (Vendor → Platform → Software) and match Phase 1/2 lifetimes precisely.'),
      err('Private subnets can\'t reach the internet',
        'NAT in wrong subnet (it must be in a public subnet with a route to IGW), or the private route table points at the IGW instead of the NAT.'),
      err('Asymmetric routing dropping packets',
        'You\'ve advertised the same prefix from two paths. Use BGP local preference / AS-path prepending to force symmetry, or accept it via stateful inspection.'),
      err('Transit Gateway charges higher than expected',
        'Every VPC↔VPC flow through TGW pays both ingress + egress. For chatty workloads, consider VPC peering instead.'),
    ],
    presentation: [
      'Defense in depth — Security Groups + NACLs + route table boundaries.',
      'Multi-AZ from day one — no single-AZ surprise outage.',
      'Hybrid-ready — connect existing data center workloads without rewriting them.',
      'Audit-friendly — VPC Flow Logs feed straight into your SIEM.',
    ],
  },

  {
    id: 'p-cicd',
    n: 5,
    title: 'CI/CD Pipeline with CodePipeline',
    tagline: 'From git push to production — automated, gated, auditable.',
    summary: 'Build a multi-stage CI/CD pipeline with CodeCommit/GitHub source, CodeBuild tests, CodeDeploy releases, and manual approvals before prod.',
    businessCase:
      'Teams deploying manually ship slow and have higher incident rates. A well-built pipeline turns deploys into a non-event — multiple safe releases per day, full audit trail, instant rollback.',
    difficulty: 'intermediate',
    services: ['codecommit', 'codebuild', 'codedeploy', 'codepipeline'],
    skills: ['Pipeline-as-code', 'Build caching + parallelism', 'Blue/green or rolling deploys', 'Manual approval gates', 'Rollback automation', 'Secret handling in CI'],
    estMinutes: 22 * 60,
    estLabel: '20–25 hours',
    clientAppeal: 9,
    certs: ['Developer Associate', 'DevOps Engineer Professional'],
    costNotes: 'CodePipeline ~$1/pipeline/mo. CodeBuild ~$0.005/minute. Negligible.',
    freeTier: true,
    companies: ['Netflix Spinnaker pattern', 'Capital One', 'Atlassian'],
    architecture: {
      nodes: [
        { id: 'git', label: 'Git push',     icon: '⌥', x: 40,  y: 110 },
        { id: 'src', label: 'CodeCommit',   service: 'codecommit', x: 200, y: 110 },
        { id: 'bld', label: 'CodeBuild',    service: 'codebuild',  x: 380, y: 110 },
        { id: 'apr', label: 'Approval',     icon: '🛑', x: 540, y: 110 },
        { id: 'dep', label: 'CodeDeploy',   service: 'codedeploy', x: 700, y: 110 },
      ],
      edges: [
        { from: 'git', to: 'src' },
        { from: 'src', to: 'bld', label: 'webhook' },
        { from: 'bld', to: 'apr' },
        { from: 'apr', to: 'dep', label: 'manual' },
      ],
    },
    prerequisites: ['A working app + tests', 'Familiarity with git'],
    buildSteps: [
      step('ci-1', 'Pick a source + scaffold',
        ['Use GitHub (most teams) or CodeCommit', 'Wire a webhook → CodePipeline trigger', 'Create the pipeline shell with one stage (Source)']),
      step('ci-2', 'Add the build + test stage',
        ['Author a buildspec.yml with cached dependencies', 'Run linting + unit tests — fail the build on red', 'Publish artifacts + a JUnit-style report', 'Add a build-status badge to your README']),
      step('ci-3', 'Add a staging deploy',
        ['Create a CodeDeploy app + deployment group for staging', 'Use rolling deploy across 2 instances', 'Add a smoke test as a post-deploy hook']),
      step('ci-4', 'Add a manual approval gate',
        ['Insert a manual approval action between staging + prod', 'Configure SNS notification to your email/Slack', 'Document the approval criteria in the pipeline description']),
      step('ci-5', 'Add the prod deploy',
        ['Switch to blue/green for zero-downtime', 'Add auto-rollback on alarms', 'Verify a real change ships end-to-end']),
      step('ci-6', 'Harden + observe',
        ['Restrict the CodeBuild role to least privilege', 'Store secrets in Secrets Manager — never in env-vars in the buildspec', 'Add metrics on pipeline duration + failure rate']),
    ],
    commonErrors: [
      err('Pipeline doesn\'t trigger on push',
        'Webhook secret mismatch or missing branch filter. Re-create the webhook from CodePipeline (not from GitHub) so AWS configures both ends.'),
      err('CodeBuild times out fetching dependencies',
        'Add a cache layer (local cache + S3) and pin versions. Bonus: use a custom image with deps preinstalled.'),
      err('CodeDeploy "Failed to install agent"',
        'Missing IAM role for SSM/CodeDeploy on the target instance. Attach the AmazonSSMManagedInstanceCore + your CodeDeploy permission policy.'),
      err('Manual approval expires after 7 days',
        'AWS hard limit. Build a Lambda that auto-approves stale pipelines after slack confirmation, or alert your team before expiry.'),
    ],
    presentation: [
      'Deploy 10x more often with fewer incidents — measurable DORA gains.',
      'Full audit log — who deployed what, when, and the approver.',
      'Automated rollback on alarms — your worst day becomes a 30-second blip.',
      'Pipeline-as-code reviewed via PR — drift is impossible.',
    ],
  },

  {
    id: 'p-rds',
    n: 6,
    title: 'RDS Database Migration',
    tagline: 'Move a production database to AWS with zero data loss.',
    summary: 'Migrate an on-prem MySQL/Postgres database to RDS using DMS, with Secrets Manager for credentials, backups, and read replicas for scale.',
    businessCase:
      'On-prem databases are operational overhead — patches, backups, hardware refresh, disaster recovery. RDS gets you managed backups, point-in-time recovery, and one-click Multi-AZ for less than the cost of a DBA-hour.',
    difficulty: 'intermediate',
    services: ['rds', 'dms', 'secretsmgr', 'vpc'],
    skills: ['Engine sizing + parameter groups', 'Online migration with CDC', 'Backup + point-in-time recovery', 'Read replicas + connection pooling', 'Credential rotation', 'Cutover planning'],
    estMinutes: 17 * 60,
    estLabel: '15–20 hours',
    clientAppeal: 8,
    certs: ['Solutions Architect Associate', 'Database Specialty'],
    costNotes: 'db.t3.micro Free Tier for 12 months. DMS instance ~$0.20/hr during the migration only.',
    freeTier: true,
    companies: ['Expedia', 'Samsung', 'Verizon Wireless', 'McDonalds'],
    architecture: {
      nodes: [
        { id: 'src', label: 'On-Prem DB',      icon: '💽', x: 40,  y: 110 },
        { id: 'dms', label: 'DMS',             service: 'dms', x: 220, y: 110 },
        { id: 'rds', label: 'RDS Primary',     service: 'rds', x: 400, y: 110 },
        { id: 'rr',  label: 'Read Replica',    service: 'rds', x: 580, y: 50 },
        { id: 'sm',  label: 'Secrets Manager', service: 'secretsmgr', x: 580, y: 170 },
      ],
      edges: [
        { from: 'src', to: 'dms', label: 'CDC' },
        { from: 'dms', to: 'rds' },
        { from: 'rds', to: 'rr',  label: 'replicate' },
        { from: 'sm',  to: 'rds', dashed: true, label: 'creds' },
      ],
    },
    prerequisites: ['SQL fluency', 'Schema migration experience', 'Maintenance window for cutover'],
    buildSteps: [
      step('rds-1', 'Plan + size the target',
        ['Match source engine + version', 'Pick instance class based on IOPS, not just CPU', 'Choose storage type (gp3 vs io1) per workload', 'Plan Multi-AZ for prod']),
      step('rds-2', 'Provision RDS in your VPC',
        ['Launch RDS into private subnets across 2 AZs', 'Apply a DB SG allowing only the app SG on port 5432/3306', 'Store master creds in Secrets Manager (not in env)', 'Enable automated backups + 7-day retention']),
      step('rds-3', 'Stage the migration with DMS',
        ['Create a DMS replication instance in the same VPC', 'Define source + target endpoints', 'Create a task with full-load + CDC', 'Validate row counts after full load']),
      step('rds-4', 'Run the cutover',
        ['Pause writes on the source for the cutover window', 'Wait for DMS to catch up — confirm latency = 0', 'Switch the app\'s connection string to RDS', 'Run a smoke test, then unpause']),
      step('rds-5', 'Add resilience + scale',
        ['Create a cross-AZ read replica', 'Point read-heavy queries at the replica via a separate connection string', 'Time a Multi-AZ failover and document RPO/RTO']),
      step('rds-6', 'Hand off + monitor',
        ['Enable Performance Insights', 'Set alarms on CPU, free storage, replica lag', 'Document the runbook (failover, snapshot restore)']),
    ],
    commonErrors: [
      err('DMS task validation shows row mismatch',
        'Charset mismatch (UTF-8 source → latin1 target) or BLOB truncation. Fix engine settings on the target then restart the task with the validation feature.'),
      err('App can\'t connect to RDS',
        'Almost always SG or subnet routing. RDS endpoint resolves only inside the VPC — your app needs to be in the VPC or use a private link.'),
      err('Replica lag growing unboundedly',
        'Long-running transactions or DDL on the primary blocks replication. Break large updates into chunks, run DDL in off-peak windows.'),
      err('Forgot the password and Secrets Manager rotated it',
        'Use the AWS console "modify" to set a new master password — it propagates to Secrets Manager. Then update any app that hard-coded credentials.'),
    ],
    presentation: [
      'Hands-off ops — managed patching, automated backups, one-click HA.',
      'Point-in-time recovery — restore to any second in the last 35 days.',
      'Read replicas mean scale without re-architecting.',
      'Cost predictable — no DBA at 3am after a disk fails.',
    ],
  },

  {
    id: 'p-monitoring',
    n: 7,
    title: 'CloudWatch Monitoring Dashboard',
    tagline: 'See it before customers do — full-stack observability.',
    summary: 'Build a CloudWatch dashboard, custom metrics, alarms, and SNS notifications across an entire AWS workload with CloudTrail audit logs.',
    businessCase:
      'You can\'t fix what you can\'t see. Most outages are 80% time-to-detect — observability turns 4-hour incidents into 5-minute blips and gives you the data to argue for performance budgets.',
    difficulty: 'int-adv',
    services: ['cloudwatch', 'sns', 'lambda', 'cloudtrail'],
    skills: ['SLI/SLO design', 'Custom metrics via EMF', 'Dashboard composition', 'Alarm thresholds + composite alarms', 'Log Insights queries', 'Audit logging with CloudTrail'],
    estMinutes: 22 * 60,
    estLabel: '20–25 hours',
    clientAppeal: 8,
    certs: ['SysOps Administrator', 'Solutions Architect Professional'],
    costNotes: 'Metrics + logs scale with volume. Set retention + sampling deliberately. Expect $10–50/mo for a small workload.',
    freeTier: true,
    companies: ['Pinterest', 'New York Times', 'Comcast', 'BMW telematics'],
    architecture: {
      nodes: [
        { id: 'svc',    label: 'Workload',    icon: '⚙',         x: 40,  y: 110 },
        { id: 'cw',     label: 'CloudWatch',  service: 'cloudwatch', x: 220, y: 110 },
        { id: 'lambda', label: 'Lambda hook', service: 'lambda',    x: 400, y: 50  },
        { id: 'sns',    label: 'SNS',         service: 'sns',       x: 400, y: 170 },
        { id: 'ct',     label: 'CloudTrail',  service: 'cloudtrail', x: 580, y: 110 },
      ],
      edges: [
        { from: 'svc',    to: 'cw', label: 'metrics + logs' },
        { from: 'cw',     to: 'lambda', label: 'alarm', dashed: true },
        { from: 'cw',     to: 'sns',    label: 'page',  dashed: true },
        { from: 'svc',    to: 'ct',     label: 'audit' },
      ],
    },
    prerequisites: ['An existing workload to monitor', 'Basic understanding of percentiles + averages'],
    buildSteps: [
      step('mon-1', 'Define what to monitor',
        ['List 5 SLIs that reflect customer experience', 'Pick SLOs (e.g. p95 < 500ms, error rate < 0.5%)', 'Decide alarm severity per SLI']),
      step('mon-2', 'Emit custom metrics',
        ['Add EMF logging to one Lambda or app component', 'Verify metrics appear in CloudWatch', 'Add dimensions for tenant/env']),
      step('mon-3', 'Build the dashboard',
        ['Author the dashboard as JSON (under version control)', 'Mix line + number + log-insights widgets', 'Share read-only with a teammate']),
      step('mon-4', 'Add alarms + paging',
        ['Create an SNS topic + email + Slack subscription', 'Wire alarms — single + composite (e.g. high errors AND high latency)', 'Force a fault and confirm the page lands']),
      step('mon-5', 'Centralize logs + write queries',
        ['Forward app logs to CloudWatch Logs', 'Write 3 saved Log Insights queries (errors, p99 lookup, suspicious auth)', 'Schedule a daily digest via Lambda + SNS']),
      step('mon-6', 'Audit with CloudTrail',
        ['Enable a multi-region trail to a hardened S3 bucket', 'Enable log file integrity validation', 'Set an alarm on root account usage']),
    ],
    commonErrors: [
      err('CloudWatch bill explosion',
        'You\'re publishing high-cardinality metrics (per-user, per-request-id). Strip cardinality, sample, and use logs instead of metrics for one-off events.'),
      err('Alarms flap constantly',
        'Thresholds based on averages but workload is bursty. Switch to percentiles + "M out of N" datapoints (e.g. 3 of 5).'),
      err('CloudTrail logs grow huge',
        'Enable Intelligent-Tiering on the trail bucket and set lifecycle to Glacier after 30 days. Audit reads stay fast.'),
      err('Composite alarm never triggers',
        'Underlying alarm in INSUFFICIENT_DATA state — composite logic treats that as not-true. Add a metric math fallback so the alarm always has data.'),
    ],
    presentation: [
      'Mean Time To Detect drops from hours to seconds.',
      'Composite alarms cut paging noise — only fire when multiple signals align.',
      'Audit-ready out of the box — CloudTrail + integrity validation = compliance evidence.',
      'Dashboard-as-code means observability survives team turnover.',
    ],
  },

  {
    id: 'p-dr',
    n: 8,
    title: 'Multi-Region Disaster Recovery',
    tagline: 'Survive a full AWS region failure — tested, not hoped.',
    summary: 'Design and test a multi-region DR strategy with Route 53 failover, S3 cross-region replication, RDS cross-region replicas, and CloudFront edge.',
    businessCase:
      'Regional outages happen — even AWS. For a serious business, "we lost us-east-1 for 6 hours" cannot mean "we lost our business". A tested DR plan is what insurance can\'t replace.',
    difficulty: 'advanced',
    services: ['route53', 'rds', 's3', 'cloudfront'],
    skills: ['DR pattern selection (Pilot Light / Warm Standby / Multi-Site)', 'RPO + RTO targets', 'Route 53 failover routing', 'Cross-region data replication', 'Runbook authoring + drill execution'],
    estMinutes: 27 * 60,
    estLabel: '25–30 hours',
    clientAppeal: 10,
    certs: ['Solutions Architect Professional'],
    costNotes: 'Cost is the second region\'s standing capacity — minimised in Pilot Light, doubled in Multi-Site.',
    freeTier: false,
    companies: ['Stripe', 'Coinbase', 'Capital One', 'Vanguard'],
    architecture: {
      nodes: [
        { id: 'user', label: 'User',          icon: '👤',          x: 40,  y: 110 },
        { id: 'cf',   label: 'CloudFront',    service: 'cloudfront', x: 200, y: 110 },
        { id: 'r53',  label: 'Route 53',      service: 'route53',    x: 360, y: 110 },
        { id: 'r1',   label: 'Region A',      icon: '🌐',          x: 540, y: 50 },
        { id: 'r2',   label: 'Region B (DR)', icon: '🛟',          x: 540, y: 170 },
        { id: 's3',   label: 'S3 CRR',        service: 's3',         x: 720, y: 110 },
      ],
      edges: [
        { from: 'user', to: 'cf' },
        { from: 'cf',   to: 'r53' },
        { from: 'r53',  to: 'r1', label: 'primary' },
        { from: 'r53',  to: 'r2', label: 'failover', dashed: true },
        { from: 'r1',   to: 's3' },
        { from: 'r2',   to: 's3' },
      ],
    },
    prerequisites: ['A working workload in one region', 'Familiarity with DNS + replication concepts'],
    buildSteps: [
      step('dr-1', 'Pick the strategy + targets',
        ['Compare Backup / Pilot Light / Warm Standby / Multi-Site', 'Write down RPO + RTO targets', 'Estimate cost of each option']),
      step('dr-2', 'Replicate data',
        ['Enable S3 Cross-Region Replication with versioning', 'Create a cross-region RDS read replica', 'Replicate Secrets Manager secrets to the DR region']),
      step('dr-3', 'Stand up DR compute (per chosen pattern)',
        ['Bake AMIs / container images and replicate them', 'Pre-provision minimal capacity if Warm Standby', 'Verify DR can boot from cold in your RTO']),
      step('dr-4', 'Wire Route 53 failover',
        ['Create primary + secondary health checks', 'Configure failover routing policy', 'Lower TTL on the failover record (60s)']),
      step('dr-5', 'Run a real DR drill',
        ['Schedule a 60-minute drill in low-traffic hours', 'Force the primary unhealthy (block the health check)', 'Time every step, capture friction', 'Improve the runbook based on findings']),
      step('dr-6', 'Maintain it',
        ['Drill quarterly — undrilled DR is broken DR', 'Track RPO + RTO actuals over time', 'Update runbook after every architecture change']),
    ],
    commonErrors: [
      err('Route 53 doesn\'t fail over fast enough',
        'TTL too high or health check interval too coarse. Use 60s TTL + 10s health checks with 2/3 failure threshold. Failover should land in under 90 seconds.'),
      err('RDS replica fails to promote',
        'Application config still pointing at the old endpoint. Use DNS aliasing (CNAME or Route 53 alias) so the cutover only flips one record.'),
      err('Secrets exist only in primary region',
        'During DR, the secondary can\'t fetch them. Enable Secrets Manager replication to the DR region.'),
      err('DR works in tests, fails in real outage',
        'Tests covered only the happy path. Run chaos drills that include partial failures, dependency failures, and noisy-neighbor scenarios.'),
    ],
    presentation: [
      'Real DR — tested quarterly, not assumed.',
      'Sub-minute failover with Route 53 + health checks.',
      'Audit-ready RPO/RTO measurements after every drill.',
      'Survives the kind of incident that ends competitor businesses.',
    ],
  },
];

// ---------- Lookup helpers ----------
/**
 * BUILD-01: the detail page resolves a project purely from the URL, so this
 * must also find user-authored projects or /portfolio/custom-xyz 404s.
 * Custom projects are generated into this exact shape and live in
 * localStorage; read lazily so this module stays import-free at the top.
 */
export const getProjectById = (id) => {
  const preset = PROJECTS.find((p) => p.id === id);
  if (preset) return preset;
  if (!String(id || '').startsWith('custom-')) return undefined;
  try {
    const raw = localStorage.getItem('awscl-pro::v1::custom-projects');
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.find((p) => p.id === id) : undefined;
  } catch {
    return undefined;
  }
};

export const PORTFOLIO_DOMAIN_COVERAGE = () => {
  // Maps domain → number of projects touching it
  const counts = Object.fromEntries(SERVICE_DOMAINS.map((d) => [d, 0]));
  for (const p of PROJECTS) {
    const seen = new Set();
    for (const sid of p.services) {
      const d = getServiceMeta(sid).domain;
      if (!seen.has(d)) {
        counts[d] += 1;
        seen.add(d);
      }
    }
  }
  return counts;
};
