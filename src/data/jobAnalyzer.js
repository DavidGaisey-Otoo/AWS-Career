/**
 * Job Analyzer engine — heuristic extraction of project type, AWS services,
 * timeline, budget, difficulty, user-match%, missing-info questions, and
 * deployment recommendations.
 *
 * No real LLM: regex + scoring tables. Pure functions so they can be unit
 * tested or called from anywhere.
 */

// ----------------------------------------------------------------------
// Sample jobs (real-ish job descriptions to seed the UI)
// ----------------------------------------------------------------------

export const SAMPLE_JOBS = [
  {
    id: 'infra-setup-25',
    label: 'Quick infra setup ($25 fixed)',
    text:
`AWS Infrastructure Setup needed — small budget ($25 fixed) but quick win.

I need someone to spin up a basic AWS environment for a Node.js side project:
- One EC2 t3.small instance (Ubuntu 22.04) for the API
- An RDS PostgreSQL instance (single AZ is fine, this is dev)
- Route 53 record pointing api.myapp.dev to the EC2 public IP
- Basic security group locking SSH to my IP only
- Set up CloudWatch alarms for CPU > 80% and disk > 75%

Should take an experienced AWS person 1-2 hours. Need it done in the next 24 hours. Pay $25 fixed on delivery. Bonus $5 if you also write a short README on how to SSH in and restart the service.`,
  },
  {
    id: 'sa-1-3mo',
    label: 'Solutions Architect (1–3 months)',
    text:
`Senior AWS Solutions Architect — 1 to 3 months, contract, remote.

We're a Series-B fintech migrating from a single-VPC monolith to a multi-account landing zone using AWS Control Tower + Organizations. You will:

- Design and document the target landing zone (logging, audit, security, prod, dev, sandbox accounts).
- Implement guardrails via SCPs and Config rules.
- Migrate workloads from the existing VPC into the new accounts using Transit Gateway.
- Set up centralized logging to a hardened S3 bucket with KMS + Object Lock.
- Implement SSO via IAM Identity Center with our Okta IdP.
- Deliver runbooks and an internal training session.

Must have: 5+ years AWS, Control Tower / Landing Zone Accelerator experience, Terraform fluency, deep VPC + networking, security mindset.

Rate: flexible — quote your monthly rate. Start date: ASAP. We're in EU timezone.`,
  },
  {
    id: 'devops-migration-1000',
    label: 'DevOps migration ($1,000 fixed)',
    text:
`Need a DevOps engineer to migrate our small SaaS from Heroku to AWS. Fixed price $1,000.

Current setup on Heroku:
- 1 web dyno (Node.js / Express)
- 1 worker dyno (BullMQ)
- Heroku Postgres
- Heroku Redis
- ~3,000 active users, low traffic

Target on AWS:
- ECS Fargate for web + worker (2 tasks each, with auto-scaling on CPU)
- ALB in front with TLS via ACM
- RDS Postgres db.t3.small Multi-AZ
- ElastiCache Redis (cache.t3.micro)
- CodePipeline + CodeBuild for CI/CD from our GitHub repo
- CloudWatch logs + alarms wired to Slack

Must do zero-downtime DB cutover with logical replication. Budget includes documentation. Need it done in 3 weeks.`,
  },
  {
    id: 'network-design-hourly',
    label: 'Network design ($75–100/hr)',
    text:
`Network Architect — hourly contract, $75-100/hr depending on experience, ~40 hours total.

We have 3 AWS accounts (prod, staging, shared services) and an on-prem datacenter in Frankfurt. Need to design and implement:

- Transit Gateway as the hub, attached to all 3 VPCs + 1 Direct Connect gateway to on-prem.
- Route tables and propagation so prod can talk to shared services but not staging.
- AWS Network Firewall in a centralized inspection VPC for egress filtering.
- DNS resolution between on-prem and AWS via Route 53 Resolver inbound/outbound endpoints.
- Document the IP plan (no overlapping CIDRs) and route policy.

Deliverables: architecture diagrams (draw.io), Terraform modules, a runbook for adding a new account.

Need to start within 2 weeks. Must have Direct Connect experience.`,
  },
];

// ----------------------------------------------------------------------
// SERVICE MAP — keyword → canonical AWS service id (matches archStudio ids)
// ----------------------------------------------------------------------

const SERVICE_PATTERNS = [
  // Compute
  { id: 'ec2',        re: /\b(ec2|virtual machine|t[234][a-z]?\.(?:nano|micro|small|medium|large|xlarge))\b/i },
  { id: 'lambda',     re: /\b(lambda|serverless function)\b/i },
  { id: 'ecs',        re: /\b(ecs)\b/i },
  { id: 'fargate',    re: /\b(fargate)\b/i },
  { id: 'eks',        re: /\b(eks|kubernetes|k8s)\b/i },
  { id: 'beanstalk',  re: /\b(beanstalk)\b/i },
  // Storage
  { id: 's3',         re: /\b(s3|bucket|object storage)\b/i },
  { id: 'ebs',        re: /\b(ebs)\b/i },
  { id: 'efs',        re: /\b(efs|file system)\b/i },
  { id: 'glacier',    re: /\b(glacier|archive storage)\b/i },
  // Database
  { id: 'rds',        re: /\b(rds|postgres|postgresql|mysql|mariadb|sql server)\b/i },
  { id: 'aurora',     re: /\b(aurora)\b/i },
  { id: 'dynamodb',   re: /\b(dynamodb|dynamo db|nosql)\b/i },
  { id: 'elasticache',re: /\b(elasticache|redis|memcached)\b/i },
  { id: 'redshift',   re: /\b(redshift|data warehouse)\b/i },
  // Network
  { id: 'vpc',        re: /\b(vpc|virtual private cloud|subnet|cidr)\b/i },
  { id: 'alb',        re: /\b(alb|application load balancer|load balancer)\b/i },
  { id: 'nlb',        re: /\b(nlb|network load balancer)\b/i },
  { id: 'cloudfront', re: /\b(cloudfront|cdn|edge caching)\b/i },
  { id: 'route53',    re: /\b(route ?53|dns|domain name)\b/i },
  { id: 'apigateway', re: /\b(api gateway|rest api|http api)\b/i },
  { id: 'tgw',        re: /\b(transit gateway|tgw|hub.and.spoke)\b/i },
  { id: 'dx',         re: /\b(direct connect)\b/i },
  { id: 'vpn',        re: /\b(vpn|site.to.site)\b/i },
  { id: 'privatelink',re: /\b(privatelink|vpc endpoint)\b/i },
  // Security
  { id: 'iam',        re: /\b(iam|identity|role|polic(?:y|ies)|sso|identity center)\b/i },
  { id: 'kms',        re: /\b(kms|encryption at rest|cmk|customer managed key)\b/i },
  { id: 'waf',        re: /\b(waf|web firewall)\b/i },
  { id: 'guardduty',  re: /\b(guardduty)\b/i },
  { id: 'cloudtrail', re: /\b(cloudtrail|audit log)\b/i },
  { id: 'secretsmgr', re: /\b(secrets manager|parameter store)\b/i },
  { id: 'cognito',    re: /\b(cognito|user pool|authentication)\b/i },
  { id: 'shield',     re: /\b(shield|ddos)\b/i },
  { id: 'securityhub',re: /\b(security hub|config rules?|scp)\b/i },
  // Monitoring + integration
  { id: 'cloudwatch', re: /\b(cloudwatch|metric|alarm|log group)\b/i },
  { id: 'xray',       re: /\b(x.?ray|trace|tracing)\b/i },
  { id: 'sns',        re: /\b(sns|notification topic)\b/i },
  { id: 'sqs',        re: /\b(sqs|queue|bullmq)\b/i },
  { id: 'eventbridge',re: /\b(eventbridge|event bus)\b/i },
  { id: 'step',       re: /\b(step functions|state machine|workflow orchestration)\b/i },
  // DevOps
  { id: 'codepipeline',re: /\b(codepipeline|ci\/?cd pipeline)\b/i },
  { id: 'codebuild',  re: /\b(codebuild)\b/i },
  { id: 'codedeploy', re: /\b(codedeploy)\b/i },
  { id: 'codecommit', re: /\b(codecommit)\b/i },
  // External
  { id: 'onprem',     re: /\b(on.?prem|datacenter|data center|colo)\b/i },
];

// ----------------------------------------------------------------------
// Project-type classifier
// ----------------------------------------------------------------------

const TYPE_RULES = [
  { type: 'Landing Zone / Multi-account', re: /\b(landing zone|control tower|organizations|multi.account|scp|service control polic)\b/i },
  { type: 'Network Architecture',         re: /\b(transit gateway|direct connect|hub.and.spoke|network firewall|route 53 resolver)\b/i },
  { type: 'Cloud Migration',              re: /\b(migrat\w+|cutover|lift.and.shift|re.host|re.platform|heroku|on.prem)\b/i },
  { type: 'CI/CD Pipeline',               re: /\b(codepipeline|codebuild|codedeploy|github actions|ci\/?cd|pipeline)\b/i },
  { type: 'Serverless API',               re: /\b(api gateway|lambda|serverless|dynamodb)\b/i },
  { type: 'Container Workload',           re: /\b(ecs|fargate|eks|kubernetes)\b/i },
  { type: 'Data Pipeline / Analytics',    re: /\b(kinesis|glue|athena|redshift|data lake|etl)\b/i },
  { type: 'Static Site / CDN',            re: /\b(static site|cloudfront|s3 hosting|static website)\b/i },
  { type: 'Database / Storage',           re: /\b(rds|aurora|dynamodb|backup|restore|replicat)\b/i },
  { type: 'Security / Compliance',        re: /\b(soc ?2|hipaa|pci|iso 27001|audit|guardduty|security hub)\b/i },
  { type: 'Disaster Recovery',            re: /\b(disaster recovery|dr |pilot light|warm standby|active.active|failover)\b/i },
  { type: 'Quick Infra Setup',            re: /\b(spin up|set up|setup|configure|infrastructure setup|provision)\b/i },
];

function classifyType(text) {
  for (const r of TYPE_RULES) if (r.re.test(text)) return r.type;
  return 'General AWS Engineering';
}

// ----------------------------------------------------------------------
// Budget + timeline extractors
// ----------------------------------------------------------------------

function extractBudget(text) {
  // Hourly with range
  const hourlyRange = text.match(/\$(\d{2,4})\s*[-–to]+\s*\$?(\d{2,4})\s*\/?\s*(?:hr|hour|hourly)/i);
  if (hourlyRange) return { kind: 'hourly', min: +hourlyRange[1], max: +hourlyRange[2], label: `$${hourlyRange[1]}–$${hourlyRange[2]}/hr` };

  const hourlySingle = text.match(/\$(\d{2,4})\s*\/?\s*(?:hr|hour|hourly)/i);
  if (hourlySingle) return { kind: 'hourly', min: +hourlySingle[1], max: +hourlySingle[1], label: `$${hourlySingle[1]}/hr` };

  // Fixed price
  const fixed = text.match(/\$(\d{1,3}(?:,\d{3})*|\d{2,6})\s*(?:fixed|flat|on delivery|budget|total)?/i);
  if (fixed) {
    const amount = +fixed[1].replace(/,/g, '');
    return { kind: 'fixed', amount, label: `$${amount.toLocaleString()} fixed` };
  }

  if (/\bflexible\b/i.test(text) || /\bquote your\b/i.test(text)) {
    return { kind: 'open', label: 'Open / quote your rate' };
  }
  return { kind: 'unknown', label: 'Not stated' };
}

function extractTimeline(text) {
  const m1 = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(hour|day|week|month)s?/i);
  if (m1) return { kind: 'range', min: +m1[1], max: +m1[2], unit: m1[3], label: `${m1[1]}–${m1[2]} ${m1[3]}s` };

  const m2 = text.match(/(?:in|within)\s*(?:the\s*next\s*)?(\d+)\s*(hour|day|week|month)s?/i);
  if (m2) return { kind: 'eta', value: +m2[1], unit: m2[2], label: `within ${m2[1]} ${m2[2]}${+m2[1] === 1 ? '' : 's'}` };

  const m3 = text.match(/(\d+)\s*(week|month)s?\s*(?:contract|engagement)?/i);
  if (m3) return { kind: 'fixed', value: +m3[1], unit: m3[2], label: `${m3[1]} ${m3[2]}${+m3[1] === 1 ? '' : 's'}` };

  if (/asap|urgent|right away|immediately/i.test(text)) return { kind: 'asap', label: 'ASAP' };
  return { kind: 'unknown', label: 'Not stated' };
}

// ----------------------------------------------------------------------
// Difficulty + match scoring
// ----------------------------------------------------------------------

const DIFFICULTY_TERMS = [
  { score: 4, re: /\b(senior|architect|lead|principal|expert|5\+ years|landing zone|terraform fluency|control tower|direct connect|zero.downtime)\b/i },
  { score: 3, re: /\b(devops|migration|multi.az|multi.region|production|sla|compliance|hipaa|pci|soc ?2)\b/i },
  { score: 2, re: /\b(setup|deploy|configure|migrate|automation|ci\/?cd|api)\b/i },
  { score: 1, re: /\b(quick|simple|small|basic|hello world|tutorial|spin up)\b/i },
];

function difficultyOf(text) {
  let max = 1;
  for (const r of DIFFICULTY_TERMS) if (r.re.test(text)) max = Math.max(max, r.score);
  return { score: max, label: ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'][max] };
}

// User-match% — heuristic, weighted by:
// - difficulty vs skill (placeholder skill = "intermediate AWS solutions architect")
// - whether the project type is in the user's strong areas
// - timeline reasonableness
function matchScore(text, type, diff, profile) {
  // Default profile if none provided
  const me = profile || {
    level: 3, // 1..5
    strongAreas: ['Serverless API', 'Container Workload', 'CI/CD Pipeline', 'Quick Infra Setup', 'Database / Storage'],
    weakAreas:   ['Landing Zone / Multi-account', 'Network Architecture', 'Security / Compliance'],
  };

  let score = 60;
  // Match difficulty against skill
  const gap = diff.score - me.level;
  score -= gap * 12; // each level above me costs 12
  // Strong area bonus
  if (me.strongAreas.includes(type)) score += 18;
  if (me.weakAreas.includes(type)) score -= 12;
  // CI/CD or basic infra → keyword bonuses
  if (/\b(node\.?js|express|github|docker)\b/i.test(text)) score += 6;
  if (/\b(java|\.net|c#|cobol|sap)\b/i.test(text))         score -= 8;

  return Math.max(5, Math.min(98, Math.round(score)));
}

// ----------------------------------------------------------------------
// Missing-info question generator
// ----------------------------------------------------------------------

const REQUIRED_CHECKS = [
  { id: 'aws-account', re: /\b(aws account|account id|existing aws|provide.*account)\b/i,
    q: 'Do you already have an AWS account I should deploy into, or should I deploy on my own and hand over?' },
  { id: 'region',      re: /\b(us.east|us.west|eu.west|eu.central|ap.south|ap.southeast|region)\b/i,
    q: 'Which AWS region (or regions) should this run in?' },
  { id: 'traffic',     re: /\b(users?|requests?|rps|qps|traffic|peak|concurrent)\b/i,
    q: 'What is the expected traffic (users, RPS, peak vs steady state)?' },
  { id: 'data-size',   re: /\b(\d+\s*gb|\d+\s*tb|database size|data size)\b/i,
    q: 'How much data are we storing in the database / S3 today, and growth per month?' },
  { id: 'compliance',  re: /\b(hipaa|pci|soc ?2|gdpr|iso 27001|compliance)\b/i,
    q: 'Are there any compliance requirements (HIPAA, PCI, SOC 2, GDPR)?' },
  { id: 'auth',        re: /\b(cognito|okta|auth0|sso|oauth|user pool|authentication)\b/i,
    q: 'What auth system should this integrate with (Cognito, Okta, custom)?' },
  { id: 'iac',         re: /\b(terraform|cloudformation|cdk|pulumi|iac)\b/i,
    q: 'Do you have a preferred IaC tool (Terraform, CDK, CloudFormation)?' },
  { id: 'monitoring',  re: /\b(datadog|new relic|grafana|prometheus|cloudwatch|monitoring)\b/i,
    q: 'Is CloudWatch enough, or are you using Datadog / New Relic / Grafana?' },
  { id: 'backups',     re: /\b(backup|rpo|rto|snapshot|recovery)\b/i,
    q: 'What are your backup + RPO / RTO targets?' },
  { id: 'budget-cap',  re: /\$\d+|budget/i,
    q: 'Is there a monthly AWS spend cap I should design within?' },
];

function missingInfo(text) {
  const out = [];
  for (const c of REQUIRED_CHECKS) if (!c.re.test(text)) out.push({ id: c.id, question: c.q });
  return out.slice(0, 6); // cap at 6 most relevant
}

// ----------------------------------------------------------------------
// Deployment recommendation
// ----------------------------------------------------------------------

function deploymentRecommendation({ budget, timeline, difficulty, type, services }) {
  // Small fixed price + tight timeline → Console + CLI
  if (
    budget.kind === 'fixed' && budget.amount <= 100 ||
    (timeline.kind === 'eta' && timeline.unit === 'hour') ||
    timeline.kind === 'asap'
  ) {
    return {
      tag: 'Console + CLI',
      reason: 'Tight budget or fast turnaround — use Console for first-time setup, capture commands in CLI for the runbook.',
      pros: ['Fastest path to a working environment', 'Easy to demo to client during build'],
      cons: ['Not repeatable without effort — capture every click in a doc'],
    };
  }

  // Big contracts / landing zone / network arch → Terraform
  if (
    type === 'Landing Zone / Multi-account' ||
    type === 'Network Architecture' ||
    services.includes('tgw') || services.includes('dx') ||
    (budget.kind === 'fixed' && budget.amount >= 500) ||
    (budget.kind === 'hourly' && budget.max >= 70) ||
    timeline.kind === 'fixed' && timeline.unit === 'month'
  ) {
    return {
      tag: 'Terraform (IaC)',
      reason: 'Multi-account / network / sizeable budget — Terraform gives the client an auditable, reusable codebase.',
      pros: ['Reusable across environments', 'Diffable in code review', 'Tear-down + rebuild safely'],
      cons: ['Slower first-day delivery', 'Client needs to maintain state backend'],
    };
  }

  // Medium SaaS migrations + container workloads → CDK / CloudFormation
  if (
    services.includes('ecs') || services.includes('fargate') || services.includes('eks') ||
    type === 'Cloud Migration' || type === 'CI/CD Pipeline'
  ) {
    return {
      tag: 'CDK or CloudFormation',
      reason: 'App-tier deployment with multiple resources — CDK lets you template environments quickly while staying in code.',
      pros: ['Type-safe, easy diffing', 'Pairs well with CodePipeline'],
      cons: ['CDK adds a build step', 'Less portable than Terraform for multi-cloud'],
    };
  }

  return {
    tag: 'CLI scripts + Console',
    reason: 'Single workload — script the repeatable bits with CLI / Bash, do the one-offs in Console.',
    pros: ['Low ceremony', 'Easy to hand off as a shell script'],
    cons: ['No drift detection — recommend Terraformising later'],
  };
}

// ----------------------------------------------------------------------
// Workflow suggestions
// ----------------------------------------------------------------------

function workflows({ type, services, deployment, budget }) {
  const out = [];
  // Always offer to generate an architecture from the JD
  out.push({
    id: 'generate-architecture',
    label: 'Generate Architecture',
    blurb: 'Open Architecture Studio with these services pre-loaded and laid out.',
    to: '/architecture',
    primary: true,
  });
  // Always offer to generate a proposal
  out.push({
    id: 'generate-proposal',
    label: 'Generate Proposal',
    blurb: 'Draft a client-ready proposal based on this JD + your match score.',
    to: '/freelance',
  });

  // Show "Build on My Account" if we'd benefit from a sandbox demo
  if (services.some((s) => ['ec2', 's3', 'lambda', 'rds', 'apigateway'].includes(s))) {
    out.push({
      id: 'build-on-my-account',
      label: 'Build on My Account',
      blurb: 'Deploy a small demo into your Free-Tier AWS profile with auto-destroy on.',
      to: '/aws-accounts',
    });
  }

  // For Terraform-recommended jobs, surface the method detector
  if (deployment.tag === 'Terraform (IaC)') {
    out.push({
      id: 'open-method-detector',
      label: 'Open Method Detector',
      blurb: 'See the Console/CLI/Terraform/CFN tradeoff for this scope.',
      to: '/build',
    });
  }

  // Cheap fixed price → market context
  if (budget.kind === 'fixed' && budget.amount < 100) {
    out.push({
      id: 'check-market',
      label: 'Check market rate',
      blurb: 'Compare this rate vs typical $25-150 quick-infra gigs.',
      to: '/market',
    });
  }

  return out;
}

// ----------------------------------------------------------------------
// Main entry point
// ----------------------------------------------------------------------

/**
 * Suggest a clean project name from the JD + classified type.
 *
 * Rules:
 *  - Prefer a quoted noun phrase if present.
 *  - Else use the first H1-style line ("# ..." or short opener).
 *  - Else derive from the classified type + headline services.
 */
function suggestProjectName(text, type, services) {
  // 1. Look for a markdown-ish heading on the first line
  const firstLine = text.split('\n').find((l) => l.trim().length > 4) || '';
  const head = firstLine.replace(/^[#*\s-]+/, '').trim();
  if (head && head.length <= 80 && /\b(setup|migration|design|build|deploy|implementation|engagement|architecture|optimization)\b/i.test(head)) {
    return head.replace(/\s+—.*$/, '').slice(0, 70);
  }

  // 2. Quoted phrase like "AWS Infrastructure Setup"
  const m = text.match(/"([^"]{6,60})"/);
  if (m) return m[1];

  // 3. Derive from type + 1-2 services
  const svcLabels = (services || []).slice(0, 2).map((s) => s.toUpperCase()).join(' + ');
  return svcLabels ? `${type} — ${svcLabels}` : type;
}

/**
 * Pull a likely client name / company from the JD.
 * Looks for:
 *  - "for <Company>" patterns
 *  - "We're a <industry> at <Company>"
 *  - Capitalised noun phrase followed by Inc/Ltd/Co.
 */
function suggestClientCompany(text) {
  const patterns = [
    /\bfor\s+([A-Z][\w&.\-]+(?:\s+[A-Z][\w&.\-]+){0,3})/,
    /\bWe(?:'re|\s+are)\s+([A-Z][\w&.\-]+(?:\s+[A-Z][\w&.\-]+){0,3})/,
    /\b([A-Z][\w&.\-]+(?:\s+[A-Z][\w&.\-]+){0,3})\s+(?:Inc|Ltd|Co\.|LLC|GmbH)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) return m[1].trim();
  }
  return '';
}

export function analyzeJob(text, profile) {
  const cleaned = (text || '').trim();
  if (!cleaned) return null;

  const services = [];
  const seen = new Set();
  for (const s of SERVICE_PATTERNS) {
    if (s.re.test(cleaned) && !seen.has(s.id)) {
      services.push(s.id);
      seen.add(s.id);
    }
  }

  const type = classifyType(cleaned);
  const budget = extractBudget(cleaned);
  const timeline = extractTimeline(cleaned);
  const difficulty = difficultyOf(cleaned);
  const match = matchScore(cleaned, type, difficulty, profile);
  const missing = missingInfo(cleaned);
  const deployment = deploymentRecommendation({ budget, timeline, difficulty, type, services });
  const wf = workflows({ type, services, deployment, budget });

  // Red flags + green flags
  const flags = [];
  if (budget.kind === 'fixed' && budget.amount <= 25) flags.push({ kind: 'red', msg: 'Very low fixed price — only take if you can finish in <2 hours.' });
  if (budget.kind === 'unknown') flags.push({ kind: 'amber', msg: 'No budget stated — ask before quoting.' });
  if (timeline.kind === 'asap') flags.push({ kind: 'amber', msg: 'ASAP timeline — confirm a hard deadline.' });
  if (services.includes('dx') && !/\b(provid|existing|already setup)\b/i.test(cleaned)) {
    flags.push({ kind: 'red', msg: 'Direct Connect mentioned — verify the circuit is already provisioned before quoting.' });
  }
  if (match >= 80) flags.push({ kind: 'green', msg: 'Strong match for your profile.' });
  if (deployment.tag === 'Terraform (IaC)' && (budget.kind === 'fixed' && budget.amount < 300)) {
    flags.push({ kind: 'amber', msg: 'IaC scope at fixed price under $300 — re-scope before committing.' });
  }

  return {
    services,
    type,
    budget,
    timeline,
    difficulty,
    match,
    missing,
    deployment,
    workflows: wf,
    flags,
    wordCount: cleaned.split(/\s+/).length,
    // Cross-page autofill helpers (Stage 13.5)
    suggestedName:    suggestProjectName(cleaned, type, services),
    suggestedClient:  suggestClientCompany(cleaned),
    // Raw input — Master Intelligence layer re-analyses this
    rawText: cleaned,
  };
}
