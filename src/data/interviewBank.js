/**
 * Mock interview question bank.
 *
 * Each role × level combo defines a 6-7 turn interview sequence:
 *   - 1 warm-up
 *   - 3-4 technical AWS questions
 *   - 1 behavioral
 *   - 1 "your questions for me" turn
 *
 * Each technical question carries:
 *   - keywords: terms a good answer should mention (case-insensitive)
 *   - modelAnswer: a strong sample answer the user can compare against
 *   - competency: which competency this question scores
 */

const t = (q, opts = {}) => ({
  q, kind: opts.kind || 'tech',
  keywords: opts.keywords || [],
  modelAnswer: opts.modelAnswer || '',
  competency: opts.competency || 'general',
});

// ---------------- SOLUTIONS ARCHITECT ----------------

const SA = {
  junior: [
    t('Tell me about a recent AWS project you\'ve worked on.', { kind: 'warmup' }),
    t('Walk me through the AWS Shared Responsibility Model.', {
      keywords: ['aws','customer','of the cloud','in the cloud','patch','iam','encryption'],
      modelAnswer: 'AWS is responsible for security OF the cloud (hardware, hypervisor, networking, regional services). The customer is responsible for security IN the cloud (OS patching, IAM, encryption choices, security group rules, app code). The line shifts with the service — Lambda removes OS responsibility entirely.',
      competency: 'fundamentals',
    }),
    t('How would you choose between S3 storage classes?', {
      keywords: ['standard','intelligent-tiering','infrequent','glacier','deep archive','retrieval','lifecycle'],
      modelAnswer: 'Match access pattern to class. Frequent access: Standard. Mixed/unknown: Intelligent-Tiering. Monthly access: Standard-IA. Quarterly: Glacier Instant. Yearly compliance archive: Deep Archive. Use lifecycle rules to age objects between classes automatically.',
      competency: 'storage',
    }),
    t('What is a VPC and what are its main components?', {
      keywords: ['cidr','subnet','route table','internet gateway','nat','security group','nacl'],
      modelAnswer: 'A VPC is your isolated virtual network in AWS, region-scoped with a CIDR (e.g. 10.0.0.0/16). Key components: subnets (AZ-scoped slices), route tables (decide where traffic goes), Internet Gateway (public route), NAT Gateway (private egress), Security Groups (stateful firewall on instances), NACLs (stateless firewall on subnets).',
      competency: 'networking',
    }),
    t('Tell me about a time you had to learn something quickly. How did you approach it?', { kind: 'behavioral' }),
    t('What questions do you have for me about the role or company?', { kind: 'questions' }),
  ],
  mid: [
    t('Walk me through a recent AWS architecture you designed and the trade-offs you made.', { kind: 'warmup' }),
    t('How would you design a 3-tier web app for high availability across two AZs?',  {
      keywords: ['multi-az','alb','asg','rds','multi-az','private subnet','public subnet','health check'],
      modelAnswer: 'Public subnets in 2 AZs with an ALB. Private subnets in 2 AZs running an Auto Scaling Group of stateless app servers. RDS Multi-AZ for the data tier in a third private subnet pair. Security groups gate traffic flow web → app → db. ALB health checks pull unhealthy targets out.',
      competency: 'architecture',
    }),
    t('A customer says page loads are slow from Europe but fine in the US. Their app is us-east-1 only. Investigate.', {
      keywords: ['cloudfront','latency','rtt','origin','cache','global','tcp'],
      modelAnswer: 'First check: is it pure latency or compute? Use synthetic monitoring from EU to compare TTFB. If TTFB > 200ms it\'s likely latency. Add CloudFront for static assets first (cheap, big win). For dynamic, consider Global Accelerator or a read replica + light EU compute. Measure before/after — don\'t guess.',
      competency: 'troubleshooting',
    }),
    t('Compare SQS Standard vs FIFO. When do you pick each?', {
      keywords: ['exactly-once','ordering','at-least-once','tps','message group','throughput'],
      modelAnswer: 'Standard: at-least-once delivery, unordered, near-unlimited TPS. FIFO: exactly-once delivery, strict ordering within a message group, capped at 3000 TPS with batching. Pick FIFO when ordering or dedupe matters (financial transactions, inventory). Pick Standard for high-throughput unordered work.',
      competency: 'integration',
    }),
    t('Tell me about a time you disagreed with an architectural decision. How did you handle it?', { kind: 'behavioral' }),
    t('What questions do you have for me?', { kind: 'questions' }),
  ],
  senior: [
    t('Walk me through how you\'d migrate a 200-server enterprise to AWS in 12 months.', { kind: 'warmup' }),
    t('Design a multi-region active-active SaaS. What are the data-layer trade-offs?', {
      keywords: ['dynamodb global','aurora global','consistency','conflict','route 53','latency','rpo','rto'],
      modelAnswer: 'Compute is easy — same stack per region behind Route 53 latency routing. Data is hard. DynamoDB Global Tables (last-writer-wins) for simple cases. Aurora Global Database (single writer, async replicas) when you need ACID. Pick per workload — chat messages tolerate eventual; payment ledgers do not. Document RPO/RTO targets and conflict-resolution strategy.',
      competency: 'architecture',
    }),
    t('Your CloudFront-fronted SaaS suddenly serves 80% 502s globally. Walk me through your triage in real time.', {
      keywords: ['origin','health','cloudwatch','status','logs','recent deploy','rollback','tg'],
      modelAnswer: 'First: check CloudWatch for any active alarms + recent deploys. CloudFront 502s typically mean origin issue. Check ALB health — target group failing? If yes, check the recent deploy commit + roll back. Pull CloudFront real-time logs to identify which origins are failing. If just one origin, isolate it. Communicate publicly within 5 minutes.',
      competency: 'incident-response',
    }),
    t('How do you architect for "blast radius" at the AWS Organizations level?', {
      keywords: ['scp','ou','account','separation','log archive','audit','control tower'],
      modelAnswer: 'Account-per-environment-per-team minimum. SCPs at the OU level deny risky actions (delete CloudTrail, change KMS keys). Separate log-archive + audit accounts. Use Control Tower for landing zone. Cross-account roles instead of users. Cost + blast radius isolation in one move.',
      competency: 'security',
    }),
    t('Describe a time you made a decision with incomplete information that had significant consequences.', { kind: 'behavioral' }),
    t('What\'s the engineering org structure here, and what\'s the team\'s biggest open problem?', { kind: 'questions' }),
  ],
  principal: [
    t('You\'re a new principal joining a 50-engineer cloud org. Walk me through your first 90 days.', { kind: 'warmup' }),
    t('How do you design a platform that 50 product teams can self-serve on AWS — without losing security or cost control?', {
      keywords: ['landing zone','golden path','scp','service catalog','iac','platform','guard rails','observability'],
      modelAnswer: 'Build the "golden paths" — opinionated reference architectures via Service Catalog / CDK Constructs. SCPs as guardrails (not gates). Per-team accounts with budget + tag enforcement. Centralized observability + security tooling so teams inherit it. Document the paved road so deviating requires intent, not just laziness.',
      competency: 'platform-engineering',
    }),
    t('Tell me about a costly architectural mistake you owned and what you changed in your process afterwards.', { kind: 'behavioral' }),
    t('What questions do you have for me?', { kind: 'questions' }),
  ],
};

// ---------------- DEVOPS ----------------

const DEVOPS = {
  junior: SA.junior,
  mid: [
    t('Walk me through a CI/CD pipeline you\'ve built recently.', { kind: 'warmup' }),
    t('Design a pipeline that auto-deploys to staging, gates on tests, and requires manual approval for prod.', {
      keywords: ['source','build','test','staging','approval','deploy','rollback'],
      modelAnswer: 'Stages: Source (CodeCommit/GitHub) → Build (CodeBuild with cached deps + unit tests) → Deploy to staging → Smoke tests → Manual approval (SNS notification) → Deploy prod (blue/green or canary) → Auto-rollback on CloudWatch alarm. Pipeline-as-code in git.',
      competency: 'cicd',
    }),
    t('How do you handle secrets in a CodeBuild pipeline?', {
      keywords: ['secrets manager','parameter store','iam','no env var','rotation'],
      modelAnswer: 'Use Secrets Manager (rotated) or SSM Parameter Store (SecureString). Reference them in buildspec via `secrets-manager:` blocks. Never put secrets in plain env vars in the buildspec. Lock down the CodeBuild role to only the secrets it needs.',
      competency: 'security',
    }),
    t('Walk me through a blue/green deploy for a Lambda function.', {
      keywords: ['alias','version','traffic shift','canary','rollback','codedeploy'],
      modelAnswer: 'Publish new version → create/update alias pointing weight at new version (e.g. 10/90 canary). CodeDeploy handles the shift over a configured window. CloudWatch alarms can trigger automatic rollback. Atomic and fast.',
      competency: 'cicd',
    }),
    t('Tell me about an outage you handled. What did you learn?', { kind: 'behavioral' }),
    t('What questions do you have for me?', { kind: 'questions' }),
  ],
  senior: SA.senior,
  principal: SA.principal,
};

// ---------------- DATA ENGINEER ----------------

const DATA = {
  junior: SA.junior,
  mid: [
    t('Walk me through a recent data pipeline you\'ve built.', { kind: 'warmup' }),
    t('You ingest 5 GB/sec of clickstream. Design the ingest + storage + query layer.', {
      keywords: ['kinesis','firehose','s3','parquet','partition','athena','glue'],
      modelAnswer: 'Kinesis Data Streams as ingest (shards = TPS / 1MB). Firehose → S3 batched delivery, converting to Parquet, partitioned by date. Glue Catalog for schema. Athena for ad-hoc SQL. Add Kinesis Data Analytics for real-time aggregation.',
      competency: 'data',
    }),
    t('When do you choose Redshift over Athena?', {
      keywords: ['warehouse','interactive','scan','partition','provisioned','workload'],
      modelAnswer: 'Redshift: fast interactive BI on petabytes, provisioned (or RA3/Serverless). Athena: serverless, pay-per-scan, ad-hoc. Pick Redshift when you need sub-second dashboards. Pick Athena for variable / occasional queries. Spectrum bridges both.',
      competency: 'data',
    }),
    t('How do you partition S3 data for cheap Athena queries?', {
      keywords: ['partition','date','hive','format','parquet','projection'],
      modelAnswer: 'Partition by date (year/month/day) plus high-cardinality natural filters (region, tenant). Use Hive-style paths. Convert to Parquet — columnar + compressed = 10× less scanned data. Use partition projection for cheap discovery.',
      competency: 'data',
    }),
    t('Tell me about a time you balanced data quality vs delivery speed.', { kind: 'behavioral' }),
    t('What questions do you have?', { kind: 'questions' }),
  ],
  senior: SA.senior,
  principal: SA.principal,
};

// ---------------- SECURITY ----------------

const SEC = {
  junior: SA.junior,
  mid: [
    t('Walk me through your last security-focused project.', { kind: 'warmup' }),
    t('How do you detect a compromised IAM access key in production?', {
      keywords: ['cloudtrail','guardduty','anomaly','rotation','access key age','iam access analyzer'],
      modelAnswer: 'GuardDuty surfaces anomalous API patterns from one principal. CloudTrail shows the actual API calls. Have a runbook: rotate or deactivate the key immediately, snapshot logs for forensics, identify blast radius via CloudTrail across regions, notify stakeholders.',
      competency: 'incident-response',
    }),
    t('Walk me through the layers of defense for a public API.', {
      keywords: ['waf','shield','rate','authn','authz','tls','sg','vpc'],
      modelAnswer: 'Edge: CloudFront + WAF (rate limits, OWASP top 10, bot control) + Shield Advanced for DDoS. Auth: Cognito or JWT with short TTLs. Network: ALB in public subnet, app in private. Authz at the app layer (least privilege). TLS everywhere with ACM. Logs to CloudTrail + CloudWatch + central SIEM.',
      competency: 'security',
    }),
    t('Difference between Permission Boundaries, SCPs, and IAM policies?', {
      keywords: ['boundary','scp','identity','resource','organizations'],
      modelAnswer: 'Identity policies grant. Permission boundaries cap what an identity policy can grant (delegation guardrail). SCPs at AWS Organizations cap what IAM can grant across an account. Effective access = intersection of all of them. Explicit DENY beats ALLOW.',
      competency: 'iam',
    }),
    t('Tell me about a time you pushed back on a security shortcut from leadership.', { kind: 'behavioral' }),
    t('What questions do you have?', { kind: 'questions' }),
  ],
  senior: SA.senior,
  principal: SA.principal,
};

// ---------------- NETWORK ----------------

const NET = {
  junior: SA.junior,
  mid: [
    t('Tell me about a recent AWS networking project.', { kind: 'warmup' }),
    t('Design a hub-and-spoke topology connecting 6 VPCs and an on-prem network.', {
      keywords: ['transit gateway','vpn','direct connect','route table','isolation','blackhole'],
      modelAnswer: 'Transit Gateway as the hub. Each VPC attached. On-prem via Site-to-Site VPN (or Direct Connect for serious traffic). Use TGW route tables per environment for isolation. Avoid full-mesh peering — TGW solves the N² problem and integrates hybrid.',
      competency: 'networking',
    }),
    t('Compare Direct Connect vs VPN — when do you pick each?', {
      keywords: ['bandwidth','latency','sla','cost','setup','time','encryption'],
      modelAnswer: 'VPN: encrypted IPSec over internet, set up in hours, no SLA, ~1.25 Gbps per tunnel. Direct Connect: dedicated fiber, weeks to provision, SLA, up to 100 Gbps, no encryption by default. Pick DX for serious bandwidth + predictable performance. Pick VPN for fast spin-up or low-bandwidth needs.',
      competency: 'networking',
    }),
    t('How does Route 53 latency-based routing actually work?', {
      keywords: ['latency measurement','region','dns','client subnet','ttl'],
      modelAnswer: 'AWS continuously measures latency between client subnets and AWS regions. When a DNS query arrives, Route 53 returns the IP of the lowest-latency region\'s endpoint. EDNS Client Subnet helps resolve based on actual user IP rather than resolver IP.',
      competency: 'networking',
    }),
    t('Tell me about a time you debugged a tricky network issue. What was the root cause?', { kind: 'behavioral' }),
    t('What questions do you have?', { kind: 'questions' }),
  ],
  senior: SA.senior,
  principal: SA.principal,
};

// ---------------- SUPPORT ----------------

const SUPPORT = {
  junior: SA.junior,
  mid: [
    t('Walk me through how you triage an unfamiliar AWS issue.', { kind: 'warmup' }),
    t('A customer\'s S3 bucket suddenly stopped accepting uploads. Triage.', {
      keywords: ['block public access','bucket policy','iam','sse','encryption','quota','cloudtrail'],
      modelAnswer: 'First, look at the exact error in CloudTrail. Common causes: Block Public Access changed, bucket policy denies, IAM permission revoked, SSE-KMS key access lost, quota hit, region-wide event. Reproduce with read-only credentials, narrow down to a specific permission boundary.',
      competency: 'troubleshooting',
    }),
    t('How do you read a CloudTrail event to understand a failed IAM action?',  {
      keywords: ['eventSource','eventName','errorCode','accessKeyId','userIdentity','requestParameters'],
      modelAnswer: 'CloudTrail event JSON has eventSource (service), eventName (API call), userIdentity (who), errorCode/errorMessage if denied, requestParameters (the inputs). For AccessDenied, simulate the call in the IAM Policy Simulator with the user + action + resource. The exact denying statement surfaces.',
      competency: 'troubleshooting',
    }),
    t('A Lambda is timing out at 30s. What are the first 3 things you check?', {
      keywords: ['timeout','memory','vpc','cold start','downstream','logs'],
      modelAnswer: '1) The function timeout setting itself — default is 3s. 2) Is it VPC-attached and waiting on a downstream service? 3) Memory — Lambda CPU scales with memory; under-provisioned memory makes everything slow. Then check the actual handler logs for the slow operation.',
      competency: 'troubleshooting',
    }),
    t('Tell me about a customer interaction that went poorly. What did you learn?', { kind: 'behavioral' }),
    t('What questions do you have?', { kind: 'questions' }),
  ],
  senior: SA.senior,
  principal: SA.principal,
};

// ---------------- ML ----------------

const ML = {
  junior: SA.junior,
  mid: [
    t('Tell me about an ML model you\'ve deployed.', { kind: 'warmup' }),
    t('How would you stand up a RAG chatbot using Bedrock + your company\'s docs?',  {
      keywords: ['knowledge base','vector','embedding','retrieval','prompt','guardrail','citation'],
      modelAnswer: 'Bedrock Knowledge Bases manages the chunking + vector storage (OpenSearch / pgvector). Pick an embedding model. Pick a generation model (Claude or Llama). Prompt template includes retrieved passages + citations. Add Bedrock Guardrails to filter PII + harmful topics. Test on golden Q&A set.',
      competency: 'ml-systems',
    }),
    t('Walk me through a SageMaker training job lifecycle.', {
      keywords: ['training job','data','s3','instance','spot','checkpoint','model artefact','endpoint'],
      modelAnswer: 'Define training image + entry script. Point at S3 input. Pick instance type (with Spot for big savings). SageMaker provisions the instance, downloads data, runs training, uploads model artefacts to S3. You can then create an endpoint (real-time / async / serverless / batch transform) from the artefacts.',
      competency: 'ml-systems',
    }),
    t('How do you detect data drift in production?', {
      keywords: ['model monitor','baseline','distribution','statistics','alert','clarify'],
      modelAnswer: 'SageMaker Model Monitor captures inference inputs + outputs to S3, compares against a baseline distribution computed at training time, alerts on statistical drift. Pair with Clarify for explainability + bias drift. Retrain trigger on alert.',
      competency: 'ml-systems',
    }),
    t('Tell me about a time you de-prioritized model accuracy in favor of something else.', { kind: 'behavioral' }),
    t('What questions do you have?', { kind: 'questions' }),
  ],
  senior: SA.senior,
  principal: SA.principal,
};

export const INTERVIEW_BANK = {
  sa: SA, devops: DEVOPS, data: DATA, sec: SEC, net: NET, support: SUPPORT, ml: ML,
};

export const ROLES = [
  { id: 'sa',      label: 'Solutions Architect' },
  { id: 'devops',  label: 'DevOps Engineer' },
  { id: 'data',    label: 'Data Engineer' },
  { id: 'sec',     label: 'Security Engineer' },
  { id: 'net',     label: 'Network Engineer' },
  { id: 'support', label: 'Cloud Support Engineer' },
  { id: 'ml',      label: 'ML Engineer' },
];

export const LEVELS = [
  { id: 'junior',    label: 'Junior' },
  { id: 'mid',       label: 'Mid' },
  { id: 'senior',    label: 'Senior' },
  { id: 'principal', label: 'Principal' },
];

export const COMPANIES = [
  { id: 'startup',    label: 'Startup' },
  { id: 'midsize',    label: 'Mid-size' },
  { id: 'enterprise', label: 'Enterprise' },
];

export function getInterviewQuestions(role, level) {
  return INTERVIEW_BANK[role]?.[level] || INTERVIEW_BANK.sa.mid;
}

/**
 * Score a single answer against keywords + length.
 * Returns { score, hits, missing, length, feedback }.
 */
export function scoreAnswer(question, answer) {
  if (question.kind !== 'tech') {
    // Behavioral / warm-up: score on length + structure cues
    const wc = (answer || '').trim().split(/\s+/).filter(Boolean).length;
    const star = /situation|task|action|result|outcome|impact/i.test(answer || '');
    let score = 30;
    if (wc > 60) score += 20;
    if (wc > 120) score += 20;
    if (star) score += 20;
    score = Math.min(100, score);
    return {
      score,
      hits: star ? ['STAR structure detected'] : [],
      missing: !star ? ['Use STAR (Situation / Task / Action / Result)'] : [],
      length: wc,
      feedback: wc < 30
        ? 'Too short — give a concrete example with a measurable outcome.'
        : star
          ? 'Solid structure. Add a quantified result if you can.'
          : 'Try framing this as STAR: situation, task, action, result.',
    };
  }
  const text = (answer || '').toLowerCase();
  const wc = text.trim().split(/\s+/).filter(Boolean).length;
  const hits = question.keywords.filter((k) => text.includes(k.toLowerCase()));
  const missing = question.keywords.filter((k) => !text.includes(k.toLowerCase()));
  // Score: coverage % × 80 + length bonus up to 20
  const coverage = question.keywords.length === 0 ? 1 : hits.length / question.keywords.length;
  const lenBonus = Math.min(20, Math.round(wc / 4));
  const score = Math.min(100, Math.round(coverage * 80 + lenBonus));
  let feedback;
  if (score >= 80) feedback = 'Strong answer — hits the key concepts and is appropriately detailed.';
  else if (score >= 60) feedback = `Solid foundation. You missed: ${missing.slice(0, 3).join(', ')}.`;
  else if (score >= 35) feedback = `Partial — add depth on: ${missing.slice(0, 4).join(', ')}.`;
  else feedback = `Light answer. The model answer hits: ${question.keywords.slice(0, 5).join(', ')}.`;
  return { score, hits, missing, length: wc, feedback };
}
