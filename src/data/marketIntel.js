/**
 * Market Intelligence — curated, realistic AWS freelance market data.
 *
 * The "live" feed is a static-but-realistic sample. The dashboards on top
 * of this data give the user a real feel for the market without us
 * pretending to have a real feed.
 *
 * Last refreshed: 2026-05 (refresh quarterly — update LAST_REFRESHED below).
 */

export const LAST_REFRESHED = '2026-05-15';

// ---------- live job feed (sample) ----------
export const SAMPLE_JOBS = [
  {
    id: 'j-001',
    platform: 'Upwork',
    title: 'AWS Solutions Architect — Build VPC + Transit Gateway hub',
    company: 'Enterprise Fintech',
    region: 'United States',
    rate: { type: 'hourly', min: 60, max: 90, currency: 'USD' },
    level: 'Senior',
    skills: ['vpc', 'tgw', 'dx', 'iam', 'cloudformation'],
    posted: '2026-05-14',
    proposals: 6,
    summary: 'Design a multi-account hub-and-spoke network across 5 VPCs with Transit Gateway, NAT consolidation, and on-prem Direct Connect.',
    matchHints: ['networking', 'tgw', 'vpc'],
  },
  {
    id: 'j-002',
    platform: 'Upwork',
    title: 'Serverless backend on Lambda + DynamoDB',
    company: 'B2B SaaS startup',
    region: 'United Kingdom',
    rate: { type: 'fixed', min: 3500, max: 4500, currency: 'USD' },
    level: 'Mid',
    skills: ['lambda', 'apigateway', 'dynamodb', 'iam', 'cdk'],
    posted: '2026-05-13',
    proposals: 14,
    summary: 'Build a multi-tenant API with Lambda, API Gateway, DynamoDB. Auth via Cognito. CDK preferred.',
    matchHints: ['serverless', 'lambda', 'dynamodb'],
  },
  {
    id: 'j-003',
    platform: 'LinkedIn',
    title: 'Cost optimization sprint — reduce $18k/mo AWS bill',
    company: 'Media tech',
    region: 'Canada',
    rate: { type: 'hourly', min: 75, max: 120, currency: 'USD' },
    level: 'Senior',
    skills: ['ec2', 's3', 'cost-explorer', 'savings-plan'],
    posted: '2026-05-13',
    proposals: 9,
    summary: '4-week engagement. Rightsizing, lifecycle, Savings Plan strategy, egress audit.',
    matchHints: ['cost'],
  },
  {
    id: 'j-004',
    platform: 'Direct',
    title: 'Database migration — MySQL on-prem to Aurora MySQL',
    company: 'Logistics SaaS',
    region: 'Germany',
    rate: { type: 'fixed', min: 5000, max: 7000, currency: 'EUR' },
    level: 'Senior',
    skills: ['rds', 'aurora', 'dms', 'mysql'],
    posted: '2026-05-12',
    proposals: 4,
    summary: '320 GB MySQL migration with under 5 min downtime. DMS + Aurora.',
    matchHints: ['database', 'migration', 'rds'],
  },
  {
    id: 'j-005',
    platform: 'Upwork',
    title: 'Static website on S3 + CloudFront + custom domain',
    company: 'Marketing agency',
    region: 'Australia',
    rate: { type: 'fixed', min: 600, max: 1200, currency: 'USD' },
    level: 'Junior',
    skills: ['s3', 'cloudfront', 'route53', 'acm'],
    posted: '2026-05-12',
    proposals: 28,
    summary: 'Deploy a Hugo-built static site with HTTPS and custom domain.',
    matchHints: ['s3', 'cloudfront', 'static'],
  },
  {
    id: 'j-006',
    platform: 'Upwork',
    title: 'CI/CD pipeline for ECS Fargate microservices',
    company: 'HealthTech',
    region: 'Netherlands',
    rate: { type: 'hourly', min: 50, max: 75, currency: 'EUR' },
    level: 'Mid',
    skills: ['ecs', 'fargate', 'codepipeline', 'ecr', 'codedeploy'],
    posted: '2026-05-11',
    proposals: 11,
    summary: 'Pipeline-as-code for 8 microservices. Blue/green on ECS Fargate.',
    matchHints: ['devops', 'ecs', 'cicd'],
  },
  {
    id: 'j-007',
    platform: 'Direct',
    title: 'Security audit + IAM cleanup — pre-SOC2',
    company: 'PropTech',
    region: 'United Arab Emirates',
    rate: { type: 'fixed', min: 4000, max: 6000, currency: 'USD' },
    level: 'Senior',
    skills: ['iam', 'guardduty', 'securityhub', 'cloudtrail'],
    posted: '2026-05-11',
    proposals: 2,
    summary: '2-week security baseline review ahead of SOC2 Type 1 audit.',
    matchHints: ['security', 'iam', 'audit'],
  },
  {
    id: 'j-008',
    platform: 'LinkedIn',
    title: 'CloudWatch dashboards + SLO alerting',
    company: 'eCommerce',
    region: 'United Kingdom',
    rate: { type: 'hourly', min: 45, max: 70, currency: 'GBP' },
    level: 'Mid',
    skills: ['cloudwatch', 'xray', 'sns', 'lambda'],
    posted: '2026-05-10',
    proposals: 7,
    summary: 'Build observability for Black Friday. SLO-based alarms + on-call dashboards.',
    matchHints: ['monitoring', 'observability'],
  },
  {
    id: 'j-009',
    platform: 'Upwork',
    title: 'Multi-region DR for compliance-driven workload',
    company: 'Banking-as-a-Service',
    region: 'Singapore',
    rate: { type: 'fixed', min: 7500, max: 12000, currency: 'USD' },
    level: 'Senior',
    skills: ['route53', 'rds', 's3', 'cloudfront'],
    posted: '2026-05-10',
    proposals: 5,
    summary: 'Design + drill multi-region DR. RPO < 5 min, RTO < 30 min. Quarterly tabletop required.',
    matchHints: ['dr', 'multi-region'],
  },
  {
    id: 'j-010',
    platform: 'Upwork',
    title: 'Migrate WordPress + DB from shared host to AWS',
    company: 'NGO',
    region: 'Kenya',
    rate: { type: 'fixed', min: 800, max: 1500, currency: 'USD' },
    level: 'Junior',
    skills: ['ec2', 'rds', 'lightsail', 's3'],
    posted: '2026-05-09',
    proposals: 22,
    summary: 'Move a 500-page WordPress site + MySQL DB to AWS. Document everything.',
    matchHints: ['migration', 'wordpress'],
  },
  {
    id: 'j-011',
    platform: 'LinkedIn',
    title: 'EKS platform engineer — multi-tenant clusters',
    company: 'Series-B SaaS',
    region: 'United States',
    rate: { type: 'hourly', min: 90, max: 140, currency: 'USD' },
    level: 'Principal',
    skills: ['eks', 'argocd', 'karpenter', 'helm', 'istio'],
    posted: '2026-05-09',
    proposals: 8,
    summary: 'Long-term contract. Build and operate multi-tenant EKS clusters with Karpenter + Argo Rollouts.',
    matchHints: ['eks', 'kubernetes'],
  },
  {
    id: 'j-012',
    platform: 'Direct',
    title: 'GenAI Bedrock RAG over enterprise docs',
    company: 'Legal tech',
    region: 'United States',
    rate: { type: 'hourly', min: 80, max: 130, currency: 'USD' },
    level: 'Senior',
    skills: ['bedrock', 'opensearch', 'lambda', 'iam'],
    posted: '2026-05-08',
    proposals: 6,
    summary: 'Build a Bedrock-backed RAG over 50k legal docs. Knowledge Bases + OpenSearch.',
    matchHints: ['ai', 'bedrock', 'rag'],
  },
  {
    id: 'j-013',
    platform: 'Upwork',
    title: 'Data lake on S3 + Glue + Athena',
    company: 'Retail analytics',
    region: 'United Kingdom',
    rate: { type: 'fixed', min: 6000, max: 9000, currency: 'GBP' },
    level: 'Senior',
    skills: ['s3', 'glue', 'athena', 'lake-formation'],
    posted: '2026-05-08',
    proposals: 11,
    summary: 'Land daily POS feeds in S3, catalogue with Glue, expose via Athena. Lake Formation for column-level perms.',
    matchHints: ['data', 'lake', 'glue'],
  },
  {
    id: 'j-014',
    platform: 'Upwork',
    title: 'Junior AWS engineer — IaC for small startup',
    company: 'Pre-seed startup',
    region: 'Ghana',
    rate: { type: 'hourly', min: 15, max: 30, currency: 'USD' },
    level: 'Junior',
    skills: ['terraform', 's3', 'ec2', 'rds'],
    posted: '2026-05-07',
    proposals: 18,
    summary: '10-15 hours/week. Help us go from console-clickops to Terraform-managed infra.',
    matchHints: ['terraform', 'iac', 'junior'],
  },
  {
    id: 'j-015',
    platform: 'LinkedIn',
    title: 'AWS Network Engineer — hybrid + SD-WAN',
    company: 'Manufacturing',
    region: 'United States',
    rate: { type: 'hourly', min: 95, max: 140, currency: 'USD' },
    level: 'Principal',
    skills: ['tgw', 'dx', 'vpn', 'bgp', 'cisco'],
    posted: '2026-05-07',
    proposals: 3,
    summary: 'Connect 14 factories via SD-WAN to AWS Transit Gateway with BGP failover.',
    matchHints: ['networking', 'tgw', 'sdwan'],
  },
  {
    id: 'j-016',
    platform: 'Upwork',
    title: 'CloudFormation drift fix + IaC migration',
    company: 'Logistics',
    region: 'Australia',
    rate: { type: 'fixed', min: 1500, max: 2500, currency: 'AUD' },
    level: 'Mid',
    skills: ['cloudformation', 'cdk', 's3', 'ec2'],
    posted: '2026-05-06',
    proposals: 9,
    summary: 'Existing CFN stacks have drift. Reconcile + migrate critical pieces to CDK.',
    matchHints: ['iac', 'cloudformation'],
  },
];

// ---------- skill demand histogram ----------
// Built by counting skill tags across SAMPLE_JOBS at module load.
export function skillDemand() {
  const counts = {};
  for (const job of SAMPLE_JOBS) {
    for (const s of job.skills) counts[s] = (counts[s] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- rates by experience (USD/hr equivalents) ----------
export const RATE_BANDS = [
  { level: 'Junior',    low: 15, mid: 25, high: 40 },
  { level: 'Mid',       low: 40, mid: 60, high: 85 },
  { level: 'Senior',    low: 70, mid: 100, high: 140 },
  { level: 'Principal', low: 110, mid: 150, high: 220 },
];

// ---------- geographic demand ----------
export const REGION_DEMAND = [
  { region: 'United States',       postingsPerMonth: 1450, hireProbability: 0.21, payIndex: 1.0 },
  { region: 'United Kingdom',      postingsPerMonth:  620, hireProbability: 0.24, payIndex: 0.85 },
  { region: 'Germany',             postingsPerMonth:  430, hireProbability: 0.22, payIndex: 0.78 },
  { region: 'Canada',              postingsPerMonth:  390, hireProbability: 0.23, payIndex: 0.82 },
  { region: 'Australia',           postingsPerMonth:  310, hireProbability: 0.20, payIndex: 0.80 },
  { region: 'Netherlands',         postingsPerMonth:  250, hireProbability: 0.22, payIndex: 0.78 },
  { region: 'Singapore',           postingsPerMonth:  180, hireProbability: 0.18, payIndex: 0.80 },
  { region: 'United Arab Emirates', postingsPerMonth: 140, hireProbability: 0.25, payIndex: 0.72 },
  { region: 'Africa (Pan)',         postingsPerMonth: 120, hireProbability: 0.30, payIndex: 0.45 },
  { region: 'Other',                postingsPerMonth:  410, hireProbability: 0.19, payIndex: 0.60 },
];

// ---------- trending specializations (with month-over-month delta) ----------
export const TRENDING = [
  { id: 'genai',     label: 'GenAI on Bedrock',            momPct: 38, hotness: 5 },
  { id: 'eks',       label: 'EKS platform engineering',    momPct: 12, hotness: 4 },
  { id: 'finops',    label: 'FinOps + cost optimization',  momPct: 28, hotness: 5 },
  { id: 'security',  label: 'Security + SOC2 compliance',  momPct: 18, hotness: 4 },
  { id: 'networking',label: 'Advanced networking + TGW',   momPct:  8, hotness: 4 },
  { id: 'datalake',  label: 'Data lake + Iceberg',         momPct: 22, hotness: 4 },
  { id: 'serverless',label: 'Serverless full-stack',       momPct:  6, hotness: 3 },
  { id: 'edge',      label: 'Edge + IoT + 5G Wavelength',  momPct:  3, hotness: 2 },
];

// ---------- certification demand (% of job posts mentioning each cert by name) ----------
export const CERT_DEMAND = [
  { certId: 'saa-c03', mentions: 38 },
  { certId: 'sap-c02', mentions: 22 },
  { certId: 'dop-c02', mentions: 18 },
  { certId: 'scs-c02', mentions: 12 },
  { certId: 'ans-c01', mentions: 11 },
  { certId: 'dva-c02', mentions:  9 },
  { certId: 'soa-c02', mentions:  7 },
  { certId: 'dea-c01', mentions:  6 },
  { certId: 'aif-c01', mentions:  5 },
  { certId: 'clf-c02', mentions:  4 },
];

// ---------- emerging tech alerts ----------
export const EMERGING_ALERTS = [
  { id: 'a1', title: 'Bedrock Agents v2 → tool-use jobs spiking',     impact: 'high' },
  { id: 'a2', title: 'SOC2 audit volume up 25% YoY — security work',  impact: 'medium' },
  { id: 'a3', title: 'EKS Auto Mode adoption → fewer Karpenter gigs', impact: 'medium' },
  { id: 'a4', title: 'AWS Verified Access — replacing VPN projects',  impact: 'medium' },
  { id: 'a5', title: 'Public IPv4 charge → IPv6 migration work',      impact: 'low' },
];

// ---------- seasonal demand pattern (relative index 0-100) ----------
export const SEASONAL = [
  { month: 'Jan', index: 72 }, { month: 'Feb', index: 78 }, { month: 'Mar', index: 88 },
  { month: 'Apr', index: 92 }, { month: 'May', index: 95 }, { month: 'Jun', index: 88 },
  { month: 'Jul', index: 78 }, { month: 'Aug', index: 70 }, { month: 'Sep', index: 92 },
  { month: 'Oct', index: 100 }, { month: 'Nov', index: 85 }, { month: 'Dec', index: 60 },
];

// ---------- competition (low/medium/high) per skill ----------
export const COMPETITION = {
  s3:         'high',
  ec2:        'high',
  cloudfront: 'medium',
  lambda:     'medium',
  dynamodb:   'medium',
  apigateway: 'medium',
  vpc:        'low',
  tgw:        'low',
  dx:         'low',
  bedrock:    'low',
  eks:        'low',
  ans:        'low',
  rds:        'medium',
  aurora:     'low',
  iam:        'high',
  cloudwatch: 'medium',
  xray:       'low',
  glue:       'low',
  athena:     'low',
  bgp:        'low',
};
