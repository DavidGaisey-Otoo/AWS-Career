/**
 * ideaEngine.js v2 — turns a free-form project description into a
 * structured proposal: architecture, services, build plan, cost,
 * compliance considerations, and follow-up questions.
 *
 * No external LLM call. The engine combines three signals:
 *
 *   1. RECIPES   — 25+ canonical project patterns (CRUD, marketplace,
 *                  e-learning, telemedicine, IoT fleet, ML inference, ...)
 *                  Each scored by keyword presence; best match wins.
 *
 *   2. DOMAIN    — industry/compliance hints (healthcare, finance, public-
 *                  sector, education). Adds HIPAA, GDPR, PCI guidance on top.
 *
 *   3. PATTERN   — access patterns (CRUD, realtime, batch, ML inference,
 *                  static, mobile-backend) inferred from verbs + nouns.
 *
 * Fallback: when no recipe matches strongly, the engine synthesises a
 * proposal from the detected domain + pattern + services — STILL useful,
 * never the "I couldn't pin this" embarrassment.
 *
 * Output shape (unchanged from v1 for compat):
 *   { summary, projectType, architecture, services[], buildSteps[], cost,
 *     freeTier, alternatives[], followUps[], confidence, keywords[],
 *     compliance?, considerations?[], answeredAt }
 */

// ─────────────── service definitions ───────────────

const S = {
  // — Compute / hosting —
  s3:         { id: 's3',         label: 'S3',          desc: 'Object storage for files, sites, backups, data lakes.' },
  cloudfront: { id: 'cloudfront', label: 'CloudFront',  desc: 'Global CDN — speeds up assets, HTTPS termination, WAF integration.' },
  route53:    { id: 'route53',    label: 'Route 53',    desc: 'DNS + domain registration.' },
  acm:        { id: 'acm',        label: 'ACM',         desc: 'Free TLS certificates for HTTPS.' },
  amplify:    { id: 'amplify',    label: 'Amplify',     desc: 'Hosting + CI/CD for Next.js / React / Vue apps.' },
  lambda:     { id: 'lambda',     label: 'Lambda',      desc: 'Serverless functions — runs on demand, pay per request.' },
  apigw:      { id: 'apigw',      label: 'API Gateway', desc: 'REST / HTTP / WebSocket API front door for Lambda.' },
  appsync:    { id: 'appsync',    label: 'AppSync',     desc: 'Managed GraphQL with realtime subscriptions.' },
  ec2:        { id: 'ec2',        label: 'EC2',         desc: 'Virtual machines — full OS control.' },
  ecs:        { id: 'ecs',        label: 'ECS Fargate', desc: 'Container orchestration without managing servers.' },
  alb:        { id: 'alb',        label: 'ALB',         desc: 'Layer-7 load balancer — routes HTTP to your servers.' },
  vpc:        { id: 'vpc',        label: 'VPC',         desc: 'Private network. Required for EC2/RDS/ECS in prod.' },

  // — Data —
  dynamodb:   { id: 'dynamodb',   label: 'DynamoDB',    desc: 'Serverless NoSQL — single-digit-ms reads.' },
  rds:        { id: 'rds',        label: 'RDS',         desc: 'Managed relational database (Postgres / MySQL / Aurora).' },
  aurora:     { id: 'aurora',     label: 'Aurora Serverless', desc: 'Auto-scaling Postgres / MySQL that scales to zero.' },
  opensearch: { id: 'opensearch', label: 'OpenSearch',  desc: 'Managed Elasticsearch — full-text search, log analytics.' },
  redshift:   { id: 'redshift',   label: 'Redshift',    desc: 'Petabyte-scale data warehouse for analytics.' },
  athena:     { id: 'athena',     label: 'Athena',      desc: 'SQL queries against S3 data — pay per query.' },
  glue:       { id: 'glue',       label: 'Glue',        desc: 'Serverless ETL + data catalogue.' },
  quicksight: { id: 'quicksight', label: 'QuickSight',  desc: 'BI dashboards.' },
  kinesis:    { id: 'kinesis',    label: 'Kinesis',     desc: 'Real-time streaming ingestion at scale.' },

  // — Auth / identity / security —
  cognito:    { id: 'cognito',    label: 'Cognito',     desc: 'User authentication (sign-in, OAuth, MFA). HIPAA-eligible.' },
  iam:        { id: 'iam',        label: 'IAM',         desc: 'Identity & permissions — never shared, least privilege.' },
  kms:        { id: 'kms',        label: 'KMS',         desc: 'Customer-managed encryption keys.' },
  secrets:    { id: 'secrets',    label: 'Secrets Manager', desc: 'Rotating credentials (DB passwords, API keys).' },
  waf:        { id: 'waf',        label: 'WAF',         desc: 'Web Application Firewall — blocks OWASP / bots / DDoS.' },
  shield:     { id: 'shield',     label: 'Shield',      desc: 'DDoS protection (Standard free, Advanced $3k/mo).' },
  guardduty:  { id: 'guardduty',  label: 'GuardDuty',   desc: 'Continuous threat detection (anomalous IAM, recon, malware).' },
  config:     { id: 'config',     label: 'Config',      desc: 'Records resource changes + checks against rules.' },
  cloudtrail: { id: 'cloudtrail', label: 'CloudTrail',  desc: 'Audit log of every AWS API call — required for HIPAA/PCI.' },

  // — Messaging / integration —
  ses:        { id: 'ses',        label: 'SES',         desc: 'Transactional email at fractions of a cent.' },
  sns:        { id: 'sns',        label: 'SNS',         desc: 'Pub/sub fan-out + SMS notifications.' },
  sqs:        { id: 'sqs',        label: 'SQS',         desc: 'Reliable message queue — decouples producers/consumers.' },
  eventbridge:{ id: 'eventbridge',label: 'EventBridge', desc: 'Event bus for service-to-service triggers + cron.' },
  step:       { id: 'step',       label: 'Step Functions', desc: 'Visual workflow orchestration over Lambda + other AWS APIs.' },
  pinpoint:   { id: 'pinpoint',   label: 'Pinpoint',    desc: 'Multi-channel messaging (SMS, push, email) + campaigns.' },

  // — Observability —
  cloudwatch: { id: 'cloudwatch', label: 'CloudWatch',  desc: 'Metrics, logs, alarms.' },
  xray:       { id: 'xray',       label: 'X-Ray',       desc: 'Distributed tracing across services.' },

  // — AI / ML —
  bedrock:    { id: 'bedrock',    label: 'Bedrock',     desc: 'Managed LLM API — Claude, Llama, Titan, Mistral.' },
  sagemaker:  { id: 'sagemaker',  label: 'SageMaker',   desc: 'Train / deploy custom ML models.' },
  rekognition:{ id: 'rekognition',label: 'Rekognition', desc: 'Pre-built image + video analysis.' },
  transcribe: { id: 'transcribe', label: 'Transcribe',  desc: 'Speech-to-text in many languages.' },
  polly:      { id: 'polly',      label: 'Polly',       desc: 'Text-to-speech with realistic voices.' },
  textract:   { id: 'textract',   label: 'Textract',    desc: 'Extract text + structure from PDFs / scans.' },
  comprehend: { id: 'comprehend', label: 'Comprehend',  desc: 'NLP — entities, sentiment, key phrases, PHI detection.' },
  comprehendmedical: { id: 'comprehendmedical', label: 'Comprehend Medical', desc: 'NLP that extracts medical entities (ICD-10, RxNorm, PHI).' },
  translate:  { id: 'translate',  label: 'Translate',   desc: 'Neural machine translation across 75+ languages.' },
  kendra:     { id: 'kendra',     label: 'Kendra',      desc: 'Enterprise search — natural-language Qs over your docs.' },

  // — Streaming / media —
  ivs:        { id: 'ivs',        label: 'IVS',         desc: 'Interactive Video Service — low-latency live streaming.' },
  mediaconvert:{ id: 'mediaconvert', label: 'MediaConvert', desc: 'Transcode video/audio for adaptive streaming.' },
  chime:      { id: 'chime',      label: 'Chime SDK',   desc: 'Voice/video meetings + messaging SDK.' },

  // — IoT / devices —
  iot:        { id: 'iot',        label: 'IoT Core',    desc: 'Managed MQTT for connected devices.' },
  greengrass: { id: 'greengrass', label: 'Greengrass',  desc: 'Run Lambda on edge devices (offline-tolerant).' },

  // — Payments / finance helpers —
  // (AWS doesn't sell payment processing; we always point to Stripe.)

  // — Misc —
  cdk:        { id: 'cdk',        label: 'CDK',         desc: 'Define infrastructure as code in TypeScript / Python.' },
};

// ─────────────── domain hints (industry / compliance) ───────────────
// Detected separately and OVERLAYED on top of recipe output.

const DOMAINS = [
  {
    id: 'healthcare',
    test: /\b(health|medical|medic|patient|clinic|clinical|hospital|doctor|nurse|telehealth|telemedicine|screening|diagnosis|symptom|prescription|EHR|EMR|HIPAA|PHI|HL7|FHIR|pharma|therapy|mental health|wellness app)\b/i,
    label: 'Healthcare / Medical',
    compliance: ['HIPAA (US)', 'GDPR (EU)', 'NHS DSPT (UK)'],
    addServices: ['cognito', 'kms', 'cloudtrail', 'config', 'guardduty', 'comprehendmedical', 'vpc'],
    considerations: [
      'Sign a Business Associate Agreement (BAA) with AWS BEFORE storing any PHI — see AWS Artifact.',
      'Encrypt all data at rest (S3 SSE-KMS, RDS encryption, DynamoDB encryption) AND in transit (TLS 1.2+).',
      'Use HIPAA-eligible services only — check the AWS HIPAA Eligible Services list. Notably eligible: Lambda, API Gateway, S3, DynamoDB, RDS, Cognito, KMS, CloudTrail, Comprehend Medical, Textract, Transcribe Medical.',
      'Audit everything with CloudTrail + Config — required for HIPAA evidence.',
      'Segregate PHI into a dedicated AWS account (or at minimum a dedicated VPC / S3 prefix with strict IAM).',
      'Provide patient access + breach notification per HIPAA 164.312/164.404.',
      'Run vulnerability scans (Amazon Inspector) on EC2/container workloads.',
      'Consider Macie for PHI/PII detection in S3.',
    ],
  },
  {
    id: 'finance',
    test: /\b(bank|banking|fintech|finance|investment|trading|portfolio|crypto|payment|wallet|invoice|accounting|tax|loan|credit|insurance|PCI|stripe)\b/i,
    label: 'Finance / Fintech',
    compliance: ['PCI-DSS', 'SOC 2', 'GDPR', 'KYC / AML'],
    addServices: ['kms', 'secrets', 'waf', 'guardduty', 'cloudtrail', 'config'],
    considerations: [
      'Never store full card data. Tokenise via Stripe / Adyen / Square — keeps you out of PCI scope.',
      'Use Cognito + MFA for user auth. Enforce strong password policy.',
      'Customer-managed KMS keys for all data at rest. Auto-rotate annually.',
      'Add WAF in front of API Gateway / ALB. Rate-limit auth endpoints.',
      'Enable GuardDuty + Security Hub for continuous threat detection.',
      'Run quarterly external pen-test for SOC 2 / PCI evidence.',
      'Logs to S3 with Object Lock for tamper-proof retention.',
    ],
  },
  {
    id: 'education',
    test: /\b(school|university|student|course|learn(ing)?|class(room)?|exam|grade|teacher|professor|FERPA|LMS|edtech|tutor)\b/i,
    label: 'Education / EdTech',
    compliance: ['FERPA (US)', 'COPPA (under 13)', 'GDPR (EU)'],
    addServices: ['cognito', 'cloudfront', 'mediaconvert'],
    considerations: [
      'If users include children under 13, you fall under COPPA — verifiable parental consent required.',
      'FERPA covers student educational records — restrict access via IAM / Cognito groups.',
      'Use CloudFront signed URLs for paid-content video so links can\'t be shared.',
      'MediaConvert for video transcoding into HLS for adaptive playback.',
    ],
  },
  {
    id: 'gov',
    test: /\b(gov(ernment)?|public sector|civic|municipal|federal|FedRAMP|StateRAMP|GovCloud|county|council|HMG)\b/i,
    label: 'Government / Public sector',
    compliance: ['FedRAMP', 'StateRAMP', 'IL2/4/5/6', 'UK G-Cloud'],
    addServices: ['cloudtrail', 'config', 'guardduty'],
    considerations: [
      'US federal data → AWS GovCloud region (separate accounts, separate API endpoints).',
      'UK public sector → choose a region in the UK (eu-west-2 London) for data residency.',
      'Many services are NOT FedRAMP authorised — check the boundary before designing.',
      'Procurement: G-Cloud framework (UK) or AWS US Federal marketplace.',
    ],
  },
  {
    id: 'ecommerce',
    test: /\b(e?[- ]?commerce|shop|store|cart|checkout|product catalog|marketplace|stripe|seller|buyer|order)\b/i,
    label: 'E-commerce',
    compliance: ['PCI-DSS SAQ-A (if using Stripe Checkout)', 'GDPR', 'consumer-rights laws'],
    addServices: ['cognito', 'ses', 'cloudfront', 'waf'],
    considerations: [
      'Use Stripe Checkout / Apple Pay — PCI scope minimised, you never touch card numbers.',
      'Inventory race conditions: DynamoDB conditional writes or SQS for serialisation.',
      'Order confirmation emails via SES (Transactional sender).',
      'GDPR: cookie consent banner, right-to-erasure flow, data export endpoint.',
      'WAF rules: rate-limit checkout, block scraper bots.',
    ],
  },
  {
    id: 'social',
    test: /\b(social|community|forum|chat|messaging|feed|timeline|follow|share|like|comment|post(s)?\b)\b/i,
    label: 'Social / Community',
    compliance: ['GDPR', 'Section 230 / DSA (EU)', 'COPPA if minors'],
    addServices: ['cognito', 'appsync', 'rekognition', 'comprehend'],
    considerations: [
      'Content moderation: Rekognition for images/video, Comprehend for text toxicity. Human-in-the-loop SQS queue.',
      'Realtime feeds: AppSync subscriptions (GraphQL) or API Gateway WebSocket.',
      'Block-list / report flow + audit log of moderator actions.',
      'EU Digital Services Act: transparency reporting, complaint mechanism, illegal-content takedown SLA.',
    ],
  },
];

// ─────────────── access patterns (HOW the system behaves) ───────────────

const PATTERNS = [
  {
    id: 'static',
    test: /\b(static|landing|portfolio|brochure|marketing|company website|blog(?! engine)|docs site)\b/i,
    label: 'Static site',
    services: ['s3', 'cloudfront', 'acm', 'route53'],
  },
  {
    id: 'crud-web-app',
    test: /\b(web app|application|dashboard|admin|portal|crud|saas|tool)\b/i,
    label: 'CRUD web app',
    services: ['amplify', 's3', 'cloudfront', 'apigw', 'lambda', 'dynamodb', 'cognito'],
  },
  {
    id: 'rest-api',
    test: /\b(rest api|http api|backend api|webhook|microservice)\b/i,
    label: 'REST API',
    services: ['apigw', 'lambda', 'dynamodb', 'cognito', 'cloudwatch'],
  },
  {
    id: 'graphql-api',
    test: /\b(graphql|appsync|subscription)\b/i,
    label: 'GraphQL API',
    services: ['appsync', 'lambda', 'dynamodb', 'cognito'],
  },
  {
    id: 'realtime',
    test: /\b(real[- ]?time|live|chat|presence|notification|websocket|stream(ing)?)\b/i,
    label: 'Real-time',
    services: ['apigw', 'lambda', 'dynamodb', 'sns', 'kinesis'],
  },
  {
    id: 'mobile-backend',
    test: /\b(mobile app|ios|android|react native|flutter)\b/i,
    label: 'Mobile backend',
    services: ['cognito', 'apigw', 'lambda', 'dynamodb', 'pinpoint', 's3'],
  },
  {
    id: 'ml-inference',
    test: /\b(ml|ai|llm|chatbot|recommend|predict|classify|sentiment|summari[sz]e|nlp|gen ?ai|generative)\b/i,
    label: 'ML inference',
    services: ['bedrock', 'lambda', 'apigw', 'dynamodb', 's3'],
  },
  {
    id: 'data-pipeline',
    test: /\b(etl|data lake|pipeline|warehouse|analytic|report|bi|dashboard|kpi)\b/i,
    label: 'Data pipeline',
    services: ['s3', 'glue', 'athena', 'quicksight', 'kinesis'],
  },
  {
    id: 'iot',
    test: /\b(iot|sensor|telemetry|mqtt|device|tracker)\b/i,
    label: 'IoT fleet',
    services: ['iot', 'lambda', 'dynamodb', 'kinesis', 'cloudwatch'],
  },
  {
    id: 'cron',
    test: /\b(scheduled|cron|nightly|daily|recurring|batch)\b/i,
    label: 'Scheduled job',
    services: ['eventbridge', 'lambda', 'sns'],
  },
  {
    id: 'video',
    test: /\b(video|stream(ing)?|broadcast|webinar|vod|live event)\b/i,
    label: 'Video streaming',
    services: ['ivs', 's3', 'mediaconvert', 'cloudfront'],
  },
];

// ─────────────── recipe library (canonical project patterns) ───────────────

const RECIPES = [
  // ─── Static / portfolio ───
  {
    id: 'static-site',
    keywords: ['portfolio', 'landing page', 'static', 'brochure', 'marketing site', 'company website', 'personal site'],
    name: 'Static website',
    typeLabel: 'static-site',
    services: ['s3', 'cloudfront', 'route53', 'acm'],
    blurb: 'Fast, global, basically free — perfect for marketing sites, portfolios, docs.',
    architecture: 'User → Route 53 → CloudFront (HTTPS via ACM) → S3 bucket (HTML/CSS/JS).',
    buildSteps: [
      'Create a globally-unique S3 bucket in your nearest region',
      'Upload your index.html + error.html + assets',
      'Enable static website hosting on the bucket',
      'Request a free ACM cert in us-east-1 (CloudFront requires that region)',
      'Create a CloudFront distribution pointing at the S3 origin',
      'Add a Route 53 ALIAS record for your domain → distribution',
      'Test the HTTPS URL, then invalidate /* after every deploy',
    ],
    cost: { typical: 1, max: 5, free: 'Free Tier covers ~all small-site traffic for 12 months' },
    followUps: ['Custom domain or default *.cloudfront.net?', 'Daily-changing content or rarely?', 'Need a contact form?'],
  },

  // ─── Healthcare ───
  {
    id: 'healthcare-app',
    keywords: ['health screening', 'symptom checker', 'patient portal', 'telemedicine', 'telehealth', 'EHR', 'EMR', 'clinical', 'medical app', 'health app', 'wellness app', 'therapy app', 'mental health', 'prescription'],
    name: 'Healthcare / Patient app (HIPAA-aware)',
    typeLabel: 'healthcare-app',
    services: ['s3', 'cloudfront', 'cognito', 'apigw', 'lambda', 'dynamodb', 'kms', 'cloudtrail', 'config', 'guardduty', 'ses', 'vpc'],
    blurb: 'Web/mobile patient app with HIPAA-aware foundations: encrypted storage, audit trail, BAA-covered services only.',
    architecture: [
      'Frontend (React/Next.js) → S3 + CloudFront (WAF protected)',
      'Auth → Cognito (MFA on, password policy strict, HIPAA-eligible)',
      'API → API Gateway → Lambda (in a private VPC)',
      'Data → DynamoDB (encrypted with customer-managed KMS) or RDS (encrypted, multi-AZ)',
      'PHI processing → Comprehend Medical / Textract Medical (both BAA-eligible)',
      'Audit → CloudTrail + Config rules + GuardDuty findings',
      'Notifications → SES (transactional) / Pinpoint (campaigns)',
    ].join('\n'),
    buildSteps: [
      '✋ FIRST: sign the AWS BAA via AWS Artifact before storing any PHI.',
      'Create a dedicated AWS account (or at minimum a dedicated VPC) for the PHI workload.',
      'Stand up Cognito with required attributes (email + verified) and enforce MFA.',
      'Create a customer-managed KMS key with auto-rotation; encrypt S3 + DynamoDB + RDS with it.',
      'Build the React/Next.js frontend, deploy to S3 + CloudFront (with WAF + AWS Shield Standard).',
      'API Gateway (REST) + Lambda in a private VPC. Lambda assumes a least-privilege IAM role.',
      'DynamoDB tables: enable point-in-time recovery + KMS encryption.',
      'CloudTrail in ALL regions → S3 with Object Lock for tamper-proof retention (7 years for HIPAA).',
      'Config rules: detect public S3 buckets, unencrypted volumes, IAM users without MFA.',
      'GuardDuty + Security Hub enabled in the account.',
      'Patient access flow: per HIPAA 164.524, provide a "download my data" endpoint.',
      'Breach notification runbook documented + tested.',
    ],
    cost: { typical: 30, max: 200, free: 'Free Tier covers most components for 12 months; KMS + CloudTrail data events add ~$5-15/mo' },
    followUps: [
      'How many patients / users (concurrent + total)?',
      'What PHI fields will you store (just contact + answers, or scans / images too)?',
      'US-only or also EU? (HIPAA vs GDPR rules)',
      'Are clinicians signing in, or only patients (different identity flows)?',
      'Do you need an integration with a hospital EHR (HL7 / FHIR)?',
    ],
  },

  // ─── Telemedicine / video consult ───
  {
    id: 'telemedicine',
    keywords: ['video consultation', 'video call doctor', 'tele-consult', 'telemedicine', 'remote consult', 'virtual visit'],
    name: 'Telemedicine (video consult, HIPAA-aware)',
    typeLabel: 'telemedicine',
    services: ['chime', 's3', 'cognito', 'lambda', 'apigw', 'dynamodb', 'kms', 'cloudtrail'],
    blurb: 'Video consultations using Chime SDK (BAA-eligible). Appointments + clinical notes stored encrypted.',
    architecture: 'Patient → React app → Chime SDK media servers. Backend: Cognito auth, API Gateway → Lambda → DynamoDB for appointment + notes (KMS encrypted).',
    buildSteps: [
      'Sign BAA via AWS Artifact (Chime SDK is BAA-eligible).',
      'Create Chime SDK meeting → return JoinToken to client.',
      'React app uses chime-sdk-js to render audio + video.',
      'Lambda creates meetings, records SOAP notes to DynamoDB after the call.',
      'Optional: record meeting to S3 (with encryption + retention) — patient consent required.',
      'Cognito MFA required for clinicians; password + email-OTP for patients.',
    ],
    cost: { typical: 50, max: 300, free: 'Chime SDK: $0.0017/min per attendee' },
    followUps: ['Recording sessions or not?', 'Group calls or 1-on-1?', 'Need a waiting room?'],
  },

  // ─── E-commerce ───
  {
    id: 'ecommerce-store',
    keywords: ['e-commerce', 'ecommerce', 'online shop', 'online store', 'storefront', 'sell products', 'cart', 'checkout', 'stripe'],
    name: 'E-commerce storefront',
    typeLabel: 'ecommerce',
    services: ['amplify', 's3', 'cloudfront', 'apigw', 'lambda', 'dynamodb', 'cognito', 'ses', 'waf'],
    blurb: 'Next.js storefront, Stripe Checkout for payments, DynamoDB for orders, SES for confirmations.',
    architecture: 'User → CloudFront → Next.js (Amplify or S3) → API Gateway → Lambda → DynamoDB. Payments via Stripe Checkout redirect. Webhook from Stripe → Lambda → mark order paid → SES confirmation.',
    buildSteps: [
      'Next.js storefront with product catalogue (data in DynamoDB or Stripe Products).',
      'Cart state in localStorage; checkout creates Stripe Checkout session via Lambda.',
      'Stripe webhook → Lambda → write order to DynamoDB.',
      'SES sends order confirmation to customer + you.',
      'Admin dashboard (Cognito-protected) lists orders, refunds via Stripe API.',
      'WAF rules: rate-limit /checkout, block known scrapers.',
    ],
    cost: { typical: 15, max: 100, free: 'Free Tier covers the bulk; Stripe takes 2.9% + 30¢ per transaction' },
    followUps: ['Digital products, physical, or both?', 'Tax / shipping rules (Stripe Tax handles this)?', 'How many SKUs?'],
  },

  // ─── SaaS ───
  {
    id: 'saas',
    keywords: ['saas', 'subscription app', 'multi-tenant', 'b2b tool', 'team workspace'],
    name: 'Multi-tenant SaaS',
    typeLabel: 'saas',
    services: ['amplify', 'cognito', 'apigw', 'lambda', 'dynamodb', 'ses', 'cloudwatch', 'kms'],
    blurb: 'Cognito user-pools-per-tenant or single-pool-with-tenant-attribute, Stripe Billing for subscriptions.',
    architecture: 'User → Amplify-hosted SPA → Cognito → API Gateway → Lambda. Lambda enforces tenant isolation on every DynamoDB query (partition key prefixed with tenantId).',
    buildSteps: [
      'Cognito user pool with custom attribute `tenantId`.',
      'Sign-up flow assigns tenantId on first user (= new tenant) or via invitation.',
      'Every Lambda extracts tenantId from JWT and prefixes DynamoDB partition keys.',
      'Stripe Billing for subscriptions; webhook updates tenant status in DynamoDB.',
      'Audit log of admin actions in a separate DynamoDB table with TTL.',
      'Per-tenant usage metrics → CloudWatch custom metrics → in-app billing dashboard.',
    ],
    cost: { typical: 25, max: 500, free: 'Free Tier handles dozens of small tenants for 12 months' },
    followUps: ['Free trial or paid only?', 'How much usage per tenant (storage, requests)?', 'Need SSO (SAML/OIDC)?'],
  },

  // ─── REST API ───
  {
    id: 'rest-api',
    keywords: ['rest api', 'http api', 'backend api', 'api that stores', 'webhook handler', 'mobile backend api'],
    name: 'Serverless REST API',
    typeLabel: 'rest-api',
    services: ['apigw', 'lambda', 'dynamodb', 'cognito', 'cloudwatch'],
    blurb: 'API Gateway → Lambda → DynamoDB. Cognito for auth. No servers to manage.',
    architecture: 'Client → API Gateway (REST/HTTP) → Lambda → DynamoDB. Cognito JWT validates requests.',
    buildSteps: [
      'Define resources + methods in API Gateway',
      'Lambda per route (Node 20 / Python 3.12)',
      'DynamoDB table — single-table design where possible',
      'Cognito user pool + JWT authorizer on API Gateway',
      'CloudWatch alarms on 4xx + 5xx + p95 latency',
      'CDK or SAM template for repeatable deploys',
    ],
    cost: { typical: 0, max: 25, free: 'First 1M Lambda + 1M API requests + 25 GB DynamoDB free, forever' },
    followUps: ['Public or auth-required?', 'Request volume per second?', 'Need a public-facing dashboard?'],
  },

  // ─── Chat / messaging ───
  {
    id: 'realtime-chat',
    keywords: ['chat app', 'messaging app', 'realtime chat', 'live chat', 'room chat', 'team chat'],
    name: 'Real-time chat app',
    typeLabel: 'realtime-chat',
    services: ['apigw', 'lambda', 'dynamodb', 'cognito', 's3'],
    blurb: 'API Gateway WebSocket → Lambda → DynamoDB. Cognito for auth. Pinpoint for push notifications.',
    architecture: 'Client → API Gateway WebSocket → Lambda ($connect / $disconnect / sendMessage) → DynamoDB (messages + connection IDs).',
    buildSteps: [
      'API Gateway WebSocket API with routes $connect / $disconnect / $default',
      'Store connection IDs in DynamoDB keyed by userId',
      'Send-message Lambda: fan out to all connections in the room',
      'Cognito for auth — connect with JWT in querystring',
      'Optional: S3 + presigned URLs for file uploads',
      'Pinpoint for push notifications when user is offline',
    ],
    cost: { typical: 5, max: 50, free: 'WebSocket: 1M conn-mins + 1M messages free for 12 months' },
    followUps: ['1-on-1 or rooms / channels?', 'File / image sharing?', 'Typing indicators + read receipts?'],
  },

  // ─── Chatbot / RAG ───
  {
    id: 'rag-chatbot',
    keywords: ['chatbot', 'chat trained on my', 'rag', 'ask questions about my documents', 'document Q&A', 'company knowledge base'],
    name: 'RAG chatbot over your documents',
    typeLabel: 'rag-chatbot',
    services: ['bedrock', 'kendra', 's3', 'lambda', 'apigw', 'opensearch'],
    blurb: 'Ingest PDFs to OpenSearch (vectors) or Kendra; Bedrock LLM answers with citations.',
    architecture: 'PDF upload → S3 → Lambda → chunk + embed (Titan Embeddings) → OpenSearch Serverless. User question → API Gateway → Lambda → semantic search → Bedrock (Claude) → answer with citations.',
    buildSteps: [
      'Upload PDFs to S3 — trigger Lambda on PUT.',
      'Lambda extracts text (Textract for scans, pdf-lib for born-digital), chunks into ~500-token blocks.',
      'Embed each chunk with Bedrock Titan Embeddings, store in OpenSearch Serverless with metadata.',
      'Query Lambda: embed the question, semantic search top-5 chunks, pass to Claude as context.',
      'Return answer + citations (which PDFs + page numbers).',
      'Frontend: simple chat UI on S3 + CloudFront.',
    ],
    cost: { typical: 15, max: 100, free: 'Bedrock pay-per-token; OpenSearch Serverless has a minimum ~$24/mo' },
    followUps: ['How many documents (MBs / GBs)?', 'Public or internal-only?', 'Need conversation history?'],
  },

  // ─── E-learning / LMS ───
  {
    id: 'elearning',
    keywords: ['lms', 'e-learning', 'elearning', 'online courses', 'course platform', 'video courses', 'tutorial site', 'training platform'],
    name: 'E-learning platform',
    typeLabel: 'elearning',
    services: ['amplify', 'cognito', 's3', 'cloudfront', 'mediaconvert', 'apigw', 'lambda', 'dynamodb'],
    blurb: 'Video courses with adaptive streaming, signed URLs to prevent sharing, progress tracking.',
    architecture: 'Instructor uploads .mp4 → S3 → MediaConvert HLS → CloudFront (signed URLs). Students stream in React/Next.js with progress saved to DynamoDB.',
    buildSteps: [
      'S3 upload bucket → MediaConvert HLS preset → output S3 bucket.',
      'CloudFront with signed URLs (KMS-signed keys).',
      'Student app: video player (hls.js), progress beacon to API Gateway → Lambda → DynamoDB.',
      'Quizzes: simple JSON schema, scored in Lambda.',
      'Stripe Billing for course purchases.',
      'Admin dashboard: instructor uploads, enrolment stats, payouts.',
    ],
    cost: { typical: 25, max: 200, free: 'CloudFront 50GB free for 12 months; MediaConvert ~$0.0075/min of HD video' },
    followUps: ['Live or recorded only?', 'How many hours of video?', 'Subscription or pay-per-course?'],
  },

  // ─── IoT ───
  {
    id: 'iot-fleet',
    keywords: ['iot', 'sensor fleet', 'device telemetry', 'mqtt', 'gps tracker', 'asset tracking'],
    name: 'IoT device fleet',
    typeLabel: 'iot',
    services: ['iot', 'lambda', 'dynamodb', 'cloudwatch', 'kinesis'],
    blurb: 'Devices speak MQTT to IoT Core, rules route messages to Lambda / DynamoDB / Kinesis.',
    architecture: 'Device (MQTT/HTTPS) → IoT Core → Rules engine → Lambda + DynamoDB + (Kinesis if high volume).',
    buildSteps: [
      'Register device "things" + X.509 certs.',
      'IoT Rules: SQL-like filters → Lambda / DynamoDB.',
      'CloudWatch dashboard for fleet health.',
      'OTA updates via Jobs service.',
      'Kinesis for high-volume streams (1000+ msgs/sec).',
    ],
    cost: { typical: 5, max: 100, free: 'First 500k messages free for 12 mo' },
    followUps: ['How many devices?', 'Messages per second per device?', 'Realtime alerts or batch?'],
  },

  // ─── ML inference / Gen AI ───
  {
    id: 'genai-app',
    keywords: ['llm app', 'gen ai', 'generative ai', 'ai assistant', 'ai chatbot', 'claude', 'gpt-style', 'summarise documents', 'classify'],
    name: 'Gen AI application',
    typeLabel: 'genai-app',
    services: ['bedrock', 'apigw', 'lambda', 'dynamodb', 's3', 'cognito'],
    blurb: 'Bedrock (Claude / Llama / Titan) behind API Gateway, conversation state in DynamoDB.',
    architecture: 'User → API Gateway → Lambda → Bedrock InvokeModel → response. Conversation saved to DynamoDB.',
    buildSteps: [
      'Enable Bedrock models in your region (request access for Claude / Llama / Titan).',
      'Lambda calls bedrock-runtime InvokeModelWithResponseStream for streaming output.',
      'API Gateway returns streaming response (Lambda Response Streaming).',
      'DynamoDB stores conversation history per session.',
      'Cognito auth + rate-limit at API Gateway (cost protection).',
    ],
    cost: { typical: 10, max: 500, free: 'Pay per token — Claude Haiku ~$0.25/M tokens, Sonnet ~$3/M' },
    followUps: ['Which model (Haiku for cost / Sonnet for quality)?', 'Streaming or batch?', 'Anonymous or authed users?'],
  },

  // ─── Cron / scheduled ───
  {
    id: 'cron',
    keywords: ['scheduled job', 'cron', 'nightly', 'daily report', 'recurring', 'scrape', 'every hour', 'every morning'],
    name: 'Scheduled job',
    typeLabel: 'cron',
    services: ['eventbridge', 'lambda', 'sns', 'ses'],
    blurb: 'EventBridge cron rule → Lambda. Cheap, easy, no servers.',
    architecture: 'EventBridge cron rule → Lambda → (do thing) → SNS / SES on success / failure.',
    buildSteps: [
      'Lambda that does the work (Node/Python)',
      'EventBridge rule with cron expression (e.g. "0 2 * * ? *" for daily 2 AM UTC)',
      'Target: the Lambda',
      'Alarm: CloudWatch on Lambda errors → SNS → email',
    ],
    cost: { typical: 0, max: 1, free: 'Free for tiny workloads' },
    followUps: ['What does the job do?', 'How often?', 'OK with cold-start delay (~200ms)?'],
  },

  // ─── Image / file processing ───
  {
    id: 'image-pipeline',
    keywords: ['resize images', 'image processing', 'photo upload', 'thumbnail', 'convert files', 'file processing'],
    name: 'Image / file processing pipeline',
    typeLabel: 'image-pipeline',
    services: ['s3', 'lambda', 'ses', 'sqs'],
    blurb: 'S3 upload triggers Lambda → process → store result → notify.',
    architecture: 'Upload → S3 → S3 event → Lambda → process (sharp / PIL) → output S3 bucket → SES email user.',
    buildSteps: [
      'Two S3 buckets: uploads + processed.',
      'S3 event on uploads triggers Lambda.',
      'Lambda uses sharp (Node) or Pillow (Python) for resize/transform.',
      'Write result to processed bucket; record metadata in DynamoDB.',
      'SES emails user when ready.',
      'SQS for retry / dead-letter queue.',
    ],
    cost: { typical: 0, max: 10, free: 'Lambda + S3 free tier covers tens of thousands of small images' },
    followUps: ['What transforms (resize, watermark, format change)?', 'Bulk upload or trickle?', 'Public or per-user private?'],
  },

  // ─── Marketplace / two-sided ───
  {
    id: 'marketplace',
    keywords: ['marketplace', 'two-sided', 'sellers and buyers', 'gig economy', 'connect users'],
    name: 'Two-sided marketplace',
    typeLabel: 'marketplace',
    services: ['amplify', 'cognito', 'apigw', 'lambda', 'dynamodb', 's3', 'ses', 'cloudfront'],
    blurb: 'Buyer + seller user types, Stripe Connect for split payouts, listings + reviews.',
    architecture: 'React/Next.js → Cognito (two roles) → API Gateway → Lambda → DynamoDB. Stripe Connect handles platform fees + seller payouts.',
    buildSteps: [
      'Cognito groups: buyers + sellers.',
      'Listings stored in DynamoDB with seller attributes.',
      'Search: simple filter on DynamoDB, or OpenSearch for full-text.',
      'Stripe Connect: sellers onboard with Express accounts, you charge platform fee.',
      'Review system: 1-5 stars + text, moderated via SQS queue.',
      'SES: order notifications, dispute emails.',
    ],
    cost: { typical: 20, max: 200, free: 'Free Tier covers early stages; Stripe Connect 0.25% + $2/active seller/mo' },
    followUps: ['Physical goods, services, or digital?', 'Geography (local or global)?', 'Need messaging between users?'],
  },

  // ─── Container app ───
  {
    id: 'container-app',
    keywords: ['docker', 'container', 'kubernetes', 'k8s', 'ecs', 'fargate', 'long-running process'],
    name: 'Containerised app (ECS Fargate)',
    typeLabel: 'container-app',
    services: ['ecs', 'alb', 'vpc', 'cloudwatch', 'rds'],
    blurb: 'Your Docker image → ECS Fargate → ALB → users. No EC2 to manage.',
    architecture: 'User → ALB → ECS Fargate service → tasks. RDS for relational DB. CloudWatch for logs.',
    buildSteps: [
      'Containerise with a Dockerfile, push to ECR.',
      'Create ECS cluster + Fargate task definition.',
      'Service with desired count (auto-scaling on CPU).',
      'ALB in front, health check on /health.',
      'RDS in private subnets if needed.',
    ],
    cost: { typical: 30, max: 200, free: 'No Free Tier — Fargate ~$30/mo minimum for 1 small task always-on' },
    followUps: ['How many requests per second?', 'Need a database?', 'Auto-scale or fixed size?'],
  },

  // ─── Dashboard / analytics ───
  {
    id: 'analytics-dashboard',
    keywords: ['analytics dashboard', 'kpi dashboard', 'reporting', 'bi dashboard', 'metrics dashboard', 'visualisation'],
    name: 'Analytics dashboard',
    typeLabel: 'analytics-dashboard',
    services: ['s3', 'glue', 'athena', 'quicksight'],
    blurb: 'Drop data into S3 → Glue catalogs it → Athena SQL → QuickSight charts.',
    architecture: 'Data sources → S3 (raw) → Glue Crawler → Glue Catalog → Athena → QuickSight dashboards.',
    buildSteps: [
      'Define an S3 bucket layout (year=/month=/day= partitions).',
      'Glue Crawler builds the catalog table from S3 data.',
      'Athena queries — pay per TB scanned (use partitions to limit).',
      'QuickSight datasets backed by Athena.',
      'SPICE for fast in-memory queries on dashboards.',
    ],
    cost: { typical: 5, max: 80, free: 'Athena: $5/TB scanned; QuickSight $9-18/user/mo' },
    followUps: ['Realtime or daily refresh?', 'Data volume (GB/TB)?', 'Internal team or end-user dashboards?'],
  },

  // ─── Background jobs / video transcode ───
  {
    id: 'video-transcode',
    keywords: ['video transcode', 'video conversion', 'video upload', 'vod', 'video on demand'],
    name: 'Video-on-demand (VOD) pipeline',
    typeLabel: 'video-vod',
    services: ['s3', 'mediaconvert', 'cloudfront', 'lambda', 'dynamodb'],
    blurb: 'S3 upload → MediaConvert HLS → CloudFront. Adaptive bitrate for any device.',
    architecture: 'User uploads .mp4 → S3 → Lambda starts MediaConvert job → HLS variants in output bucket → CloudFront serves m3u8.',
    buildSteps: [
      'Two S3 buckets: source + transcoded.',
      'Lambda listens to source bucket PUT events, calls MediaConvert.',
      'MediaConvert preset: HLS adaptive bitrate (240p / 480p / 720p / 1080p).',
      'CloudFront pointing at transcoded bucket; signed URLs for paid content.',
      'DynamoDB tracks job status; webhook updates UI when ready.',
    ],
    cost: { typical: 10, max: 200, free: 'MediaConvert ~$0.0075/min HD; CloudFront 50GB free' },
    followUps: ['How long are videos (mins)?', 'Live or VOD only?', 'DRM required?'],
  },

  // ─── Notification ───
  {
    id: 'notification',
    keywords: ['notification', 'send sms', 'push notification', 'email alerts'],
    name: 'Notification system',
    typeLabel: 'notification',
    services: ['sns', 'ses', 'pinpoint', 'lambda', 'eventbridge'],
    blurb: 'SNS + SES + Pinpoint for multi-channel alerts triggered by events.',
    architecture: 'Event source → EventBridge → Lambda → SNS (SMS / push) / SES (email) / Pinpoint (campaigns).',
    buildSteps: [
      'Define topic per category (orders, security, marketing).',
      'Lambda chooses channel based on user preferences.',
      'Pinpoint for personalised campaigns + analytics.',
      'CloudWatch alarms for bounce rate (>5% = trouble).',
    ],
    cost: { typical: 1, max: 50, free: 'SNS first 1M publishes free; SES $0.10/1000 emails' },
    followUps: ['Which channels (email/SMS/push)?', 'Volume per day?', 'User-controlled preferences?'],
  },

  // ─── Static blog / CMS ───
  {
    id: 'blog',
    keywords: ['blog engine', 'cms', 'content site', 'publishing', 'newsletter site'],
    name: 'Blog / CMS',
    typeLabel: 'blog',
    services: ['amplify', 's3', 'cloudfront', 'dynamodb', 'lambda', 'apigw'],
    blurb: 'Next.js with MDX or a headless CMS. Comments stored in DynamoDB. SES for newsletter.',
    architecture: 'Posts in MDX → Next.js static build → S3 + CloudFront. Comments via API Gateway + Lambda + DynamoDB. Newsletter via SES.',
    buildSteps: [
      'Next.js or Hugo / Astro static site generator.',
      'MDX posts in a /content folder.',
      'Comments: simple form → API Gateway → Lambda → DynamoDB.',
      'Moderation: comments default to pending; admin approves via dashboard.',
      'SES for newsletter blasts; opt-in confirmation flow.',
    ],
    cost: { typical: 2, max: 15, free: 'Free Tier handles thousands of readers' },
    followUps: ['Just you writing or multiple authors?', 'Need a CMS UI or git-based?', 'Comments / no comments?'],
  },
];

// ─────────────── scoring + matching ───────────────

/**
 * Score how strongly a recipe matches the query.
 * Each keyword phrase that appears = +1 point.
 * Phrases of 2+ words score 2× (they're rarer = stronger signal).
 */
function scoreRecipe(recipe, q) {
  const text = ` ${q.toLowerCase()} `;
  let score = 0;
  const matched = [];
  for (const kw of recipe.keywords) {
    const k = ` ${kw.toLowerCase()} `;
    const altK = kw.toLowerCase();
    if (text.includes(k) || new RegExp(`\\b${altK.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(q)) {
      score += kw.includes(' ') ? 2 : 1;
      matched.push(kw);
    }
  }
  return { score, matched };
}

function bestRecipe(q) {
  const scored = RECIPES
    .map((r) => ({ recipe: r, ...scoreRecipe(r, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored;
}

function detectDomain(q) {
  return DOMAINS.find((d) => d.test.test(q));
}

function detectPatterns(q) {
  return PATTERNS.filter((p) => p.test.test(q));
}

function detectMentionedServices(q) {
  const detected = new Set();
  const lower = q.toLowerCase();
  for (const id of Object.keys(S)) {
    if (lower.includes(id)) detected.add(id);
  }
  const map = {
    bucket: 's3', storage: 's3', file: 's3',
    cdn: 'cloudfront',
    serverless: 'lambda', function: 'lambda',
    api: 'apigw', endpoint: 'apigw',
    nosql: 'dynamodb', database: 'rds', sql: 'rds', postgres: 'rds', mysql: 'rds',
    'virtual machine': 'ec2', vm: 'ec2', server: 'ec2',
    container: 'ecs', docker: 'ecs',
    email: 'ses', notification: 'sns', queue: 'sqs',
    auth: 'cognito', login: 'cognito', signup: 'cognito',
    ml: 'sagemaker', llm: 'bedrock', ai: 'bedrock', claude: 'bedrock',
    image: 'rekognition', ocr: 'textract', pdf: 'textract',
    video: 'mediaconvert', stream: 'kinesis', live: 'ivs',
    chat: 'apigw', websocket: 'apigw',
    cron: 'eventbridge', scheduled: 'eventbridge',
    search: 'opensearch', kendra: 'kendra',
    cache: 'cloudfront',
    cdk: 'cdk', terraform: 'cdk',
  };
  for (const [word, sid] of Object.entries(map)) {
    if (lower.includes(word)) detected.add(sid);
  }
  return [...detected].slice(0, 12);
}

// ─────────────── public entrypoint ───────────────

export function describeIdea(text) {
  const q = (text || '').trim();
  if (!q) {
    return {
      summary: 'Tell me what you want to build — even one line is enough.',
      followUps: ['e.g. "A health screening app for HIPAA"', 'e.g. "A marketplace for handmade crafts"', 'e.g. "A chatbot trained on my PDFs"'],
      confidence: 0,
      answeredAt: new Date().toISOString(),
    };
  }

  const scored = bestRecipe(q);
  const primary = scored[0]?.recipe;
  const alternatives = scored.slice(1, 3).map((s) => s.recipe);
  const domain = detectDomain(q);
  const patterns = detectPatterns(q);

  // ── PRIMARY PATH: a recipe matched
  if (primary && scored[0].score >= 2) {
    return enrichWithDomain(buildFromRecipe(primary, scored, alternatives, q), domain, patterns, q);
  }

  // ── PARTIAL PATH: weak recipe match, but strong domain or pattern signals
  if ((domain || patterns.length > 0) && (primary ? scored[0].score === 1 : true)) {
    const synthesised = synthesiseFromSignals({ q, primary, domain, patterns });
    return enrichWithDomain(synthesised, domain, patterns, q);
  }

  // ── FALLBACK PATH: still try to be useful
  return enrichWithDomain(genericFallback(q), domain, patterns, q);
}

// ─────────────── builders ───────────────

function buildFromRecipe(recipe, scored, alternatives, q) {
  return {
    summary: `${recipe.name} — ${recipe.blurb}`,
    projectType: recipe.typeLabel,
    architecture: recipe.architecture,
    services: recipe.services.map((id) => S[id]).filter(Boolean),
    buildSteps: recipe.buildSteps,
    cost: recipe.cost,
    freeTier: (recipe.cost?.typical || 0) <= 5,
    alternatives: alternatives.map((r) => ({ name: r.name, blurb: r.blurb, services: r.services })),
    followUps: recipe.followUps,
    confidence: Math.min(0.98, 0.6 + scored[0].score * 0.08),
    keywords: scored[0].matched,
    answeredAt: new Date().toISOString(),
  };
}

/**
 * No strong recipe — but we have domain and/or pattern signals.
 * Build a hybrid proposal: pattern's services + domain's services,
 * customised steps, real architecture.
 */
function synthesiseFromSignals({ q, primary, domain, patterns }) {
  const primaryPattern = patterns[0];
  const baseServices = new Set();
  for (const p of patterns) for (const s of p.services) baseServices.add(s);
  if (domain) for (const s of (domain.addServices || [])) baseServices.add(s);
  for (const s of detectMentionedServices(q)) baseServices.add(s);

  const services = [...baseServices].map((id) => S[id]).filter(Boolean);
  const patternLabels = patterns.map((p) => p.label).join(' + ') || 'Custom app';

  const arch = primary?.architecture
    || (primaryPattern
        ? archForPattern(primaryPattern.id, domain)
        : `Custom design — ${patternLabels.toLowerCase()} backed by ${services.slice(0, 4).map((s) => s.label).join(', ')}.`);

  const steps = primary?.buildSteps
    || stepsForPattern(primaryPattern?.id, domain);

  const sum = domain
    ? `${domain.label} project — ${patternLabels.toLowerCase()}. I'll lean on ${services.length} AWS service${services.length === 1 ? '' : 's'} and the compliance considerations below.`
    : `${patternLabels} — built with ${services.slice(0, 4).map((s) => s.label).join(', ')}.`;

  return {
    summary: sum,
    projectType: domain ? domain.id : (primaryPattern?.id || 'custom'),
    architecture: arch,
    services,
    buildSteps: steps,
    cost: estimateCostForPattern(primaryPattern?.id),
    freeTier: true,
    alternatives: [],
    followUps: followUpsForContext({ primary, domain, patterns }),
    confidence: 0.6,
    keywords: [],
    answeredAt: new Date().toISOString(),
  };
}

/**
 * Hard fallback. Even here we extract any services mentioned and stack
 * a reasonable web-app skeleton.
 */
function genericFallback(q) {
  const services = detectMentionedServices(q).map((id) => S[id]).filter(Boolean);
  const fallbackServices = services.length
    ? services
    : [S.s3, S.cloudfront, S.apigw, S.lambda, S.dynamodb, S.cognito];

  return {
    summary: `Looks like a custom app — here's a sensible skeleton you can start from.`,
    projectType: 'custom',
    architecture: `User → CloudFront → ${fallbackServices.find((s) => s.id === 's3') ? 'S3 (frontend)' : 'Amplify (frontend)'} → API Gateway → Lambda → DynamoDB. Cognito for auth.`,
    services: fallbackServices,
    buildSteps: [
      'Pick your users — who they are + how they sign in (Cognito vs anonymous).',
      'Define your data shape — DynamoDB single-table or RDS relational.',
      'Build a thin Lambda for each user action (REST or GraphQL).',
      'Host the frontend on S3 + CloudFront (or Amplify for git-driven deploys).',
      'Add CloudWatch alarms on error rate + cost before going live.',
      'Document a "first deploy" runbook so re-deploying is push-button.',
    ],
    cost: { typical: 5, max: 50, free: 'Free Tier covers most of the above for 12 months' },
    freeTier: true,
    alternatives: [],
    followUps: [
      'Who are the users (B2C, B2B, internal team)?',
      'How many users per day?',
      'Real-time interactions or async OK?',
      'Any compliance constraints (HIPAA / GDPR / PCI)?',
      'What\'s the ONE main thing the app does?',
    ],
    confidence: 0.45,
    keywords: services.map((s) => s.id),
    answeredAt: new Date().toISOString(),
  };
}

/**
 * Layer domain considerations + compliance on top of any proposal.
 */
function enrichWithDomain(proposal, domain, patterns, q) {
  if (!domain) return proposal;
  // Merge domain services into the service list
  const ids = new Set(proposal.services.map((s) => s.id));
  for (const sid of (domain.addServices || [])) {
    if (S[sid] && !ids.has(sid)) proposal.services.push(S[sid]);
  }
  proposal.compliance = domain.compliance;
  proposal.considerations = domain.considerations;
  // Prepend a domain-aware preface to summary if not already domain-aware
  if (proposal.summary && !proposal.summary.toLowerCase().includes(domain.label.toLowerCase())) {
    proposal.summary = `[${domain.label}] ${proposal.summary}`;
  }
  return proposal;
}

// ─────────────── helpers for synthesis ───────────────

function archForPattern(patternId, domain) {
  const isHipaa = domain?.id === 'healthcare';
  switch (patternId) {
    case 'static':
      return 'User → Route 53 → CloudFront → S3.';
    case 'crud-web-app':
      return `User → CloudFront → Amplify/S3 (React) → Cognito (auth${isHipaa ? ' + MFA' : ''}) → API Gateway → Lambda → DynamoDB${isHipaa ? ' (KMS-encrypted)' : ''}.`;
    case 'rest-api':
      return 'Client → API Gateway → Lambda → DynamoDB. Cognito JWT for auth. CloudWatch for observability.';
    case 'graphql-api':
      return 'Client → AppSync (GraphQL) → resolvers → Lambda / DynamoDB. Cognito for auth.';
    case 'realtime':
      return 'Client ↔ API Gateway WebSocket → Lambda → DynamoDB (connections + messages). Optional Kinesis for high-volume streams.';
    case 'mobile-backend':
      return 'Mobile app → Cognito (sign-in / federated identity) → API Gateway → Lambda → DynamoDB. Pinpoint for push.';
    case 'ml-inference':
      return 'User → API Gateway → Lambda → Bedrock (InvokeModel) → response. Conversation context in DynamoDB.';
    case 'data-pipeline':
      return 'Sources → S3 (raw) → Glue → Athena → QuickSight. Kinesis Firehose for streaming sources.';
    case 'iot':
      return 'Devices → MQTT → IoT Core → Rules → Lambda + DynamoDB + Kinesis.';
    case 'cron':
      return 'EventBridge cron → Lambda → (work) → SNS/SES on result.';
    case 'video':
      return 'Upload → S3 → MediaConvert HLS → CloudFront. Optional IVS for live.';
    default:
      return 'Custom — pick the simplest service for each "box" in your data flow.';
  }
}

function stepsForPattern(patternId, domain) {
  const isHipaa = domain?.id === 'healthcare';
  const hipaaPrefix = isHipaa ? ['✋ Sign the AWS BAA via AWS Artifact before storing any PHI.'] : [];
  const common = [
    'Define your users + auth model (Cognito user pool with MFA' + (isHipaa ? ' REQUIRED' : ' optional') + ').',
    'Lay out the data — DynamoDB single-table or RDS relational.',
    'Build one end-to-end happy path before any optimisation.',
    'Add CloudWatch alarms on error rate, latency, cost.',
    'Document a "first deploy" runbook.',
  ];
  switch (patternId) {
    case 'crud-web-app':
      return [...hipaaPrefix,
        'Scaffold the React/Next.js frontend; deploy to Amplify (or S3 + CloudFront).',
        'Cognito user pool — enforce MFA' + (isHipaa ? ', strict password policy, no public sign-up if clinicians only' : '') + '.',
        'API Gateway (HTTP API) with JWT authorizer.',
        'Lambda per resource, IAM role with least privilege.',
        'DynamoDB table' + (isHipaa ? ' encrypted with customer-managed KMS key' : '') + '.',
        ...common.slice(2),
      ];
    case 'rest-api':
      return [...hipaaPrefix,
        'Define resources + methods in API Gateway / OpenAPI spec.',
        'Lambda per route (Node 20 / Python 3.12).',
        'DynamoDB single-table design.',
        'Cognito JWT authorizer on API Gateway.',
        ...common.slice(3),
      ];
    case 'realtime':
      return [
        'API Gateway WebSocket with $connect / $disconnect / sendMessage routes.',
        'Store connection IDs in DynamoDB keyed by userId.',
        'Send-message Lambda fans out to room members.',
        'Cognito JWT in the WebSocket querystring for auth.',
        ...common,
      ];
    case 'ml-inference':
      return [
        'Request Bedrock model access in your region (Claude / Llama / Titan).',
        'Lambda calls bedrock-runtime InvokeModelWithResponseStream.',
        'API Gateway returns streaming response (Lambda Response Streaming).',
        'DynamoDB stores conversation context per session.',
        'Rate-limit at API Gateway to protect cost.',
        ...common.slice(2),
      ];
    case 'data-pipeline':
      return [
        'Lay out S3 buckets — raw / processed / curated.',
        'Glue Crawler to build the catalog from S3.',
        'Athena workgroup with a query result location.',
        'QuickSight datasets backed by Athena.',
        'CloudWatch alarms on Athena cost (cap with workgroup limits).',
      ];
    default:
      return [...hipaaPrefix, ...common];
  }
}

function estimateCostForPattern(patternId) {
  switch (patternId) {
    case 'static':         return { typical: 1,  max: 10,  free: 'Free Tier covers small-site traffic for 12 months' };
    case 'crud-web-app':   return { typical: 5,  max: 50,  free: 'Free Tier handles thousands of users for 12 months' };
    case 'rest-api':       return { typical: 0,  max: 25,  free: 'First 1M Lambda + 1M API requests free, forever' };
    case 'realtime':       return { typical: 5,  max: 60,  free: 'WebSocket: 1M conn-mins + 1M messages free for 12 mo' };
    case 'mobile-backend': return { typical: 10, max: 80,  free: 'Cognito 50k MAU free, forever' };
    case 'ml-inference':   return { typical: 10, max: 500, free: 'Bedrock pay-per-token; Claude Haiku ~$0.25/M tokens' };
    case 'data-pipeline':  return { typical: 5,  max: 80,  free: 'Athena $5/TB scanned; partition data to keep costs down' };
    case 'iot':            return { typical: 5,  max: 100, free: 'First 500k IoT messages free for 12 mo' };
    case 'cron':           return { typical: 0,  max: 1,   free: 'Free for tiny workloads' };
    case 'video':          return { typical: 25, max: 200, free: 'CloudFront 50GB free; MediaConvert ~$0.0075/min HD' };
    default:               return { typical: 5,  max: 50,  free: 'Free Tier covers most of the above for 12 months' };
  }
}

function followUpsForContext({ primary, domain, patterns }) {
  if (primary) return primary.followUps;
  const out = [];
  if (domain?.id === 'healthcare') {
    out.push('Are you storing PHI (any patient-identifiable data) or only de-identified info?');
    out.push('US-only or also EU (HIPAA + GDPR)?');
    out.push('Patients sign in, clinicians sign in, or both?');
  } else if (domain?.id === 'finance') {
    out.push('Storing card data yourself (PCI scope) or via Stripe?');
    out.push('Which regulator (FCA, FINRA, ASIC, etc.)?');
  } else if (domain) {
    out.push(`${domain.label}: which compliance regime applies (${domain.compliance?.join(', ') || 'tell me'})?`);
  }
  out.push('Who are the users + how many per day?');
  out.push('Real-time or async OK?');
  out.push('Custom domain or just default URLs to start?');
  return out;
}

export const KNOWN_SERVICES = S;
export const RECIPE_NAMES = RECIPES.map((r) => r.name);
export const DOMAIN_NAMES = DOMAINS.map((d) => d.label);
