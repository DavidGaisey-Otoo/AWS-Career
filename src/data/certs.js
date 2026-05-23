/**
 * AWS certification catalog — all 13 paths with exam metadata, domain
 * weightings, study resources, and exam-booking info.
 *
 * Stable ids so user progress (scores, study plans, voucher state) survives.
 */

const LEVELS = {
  foundational: { label: 'Foundational', color: 'text-success border-success/40 bg-success/10', tier: 1 },
  associate:    { label: 'Associate',    color: 'text-aws-orange border-aws-orange/40 bg-aws-orange/10', tier: 2 },
  professional: { label: 'Professional', color: 'text-warning border-warning/40 bg-warning/10', tier: 3 },
  specialty:    { label: 'Specialty',    color: 'text-electric border-electric/40 bg-electric/10', tier: 3 },
};

const d = (id, label, weight, blurb = '') => ({ id, label, weight, blurb });

// ------------------------- 13 CERTS -------------------------
export const CERTS = [
  {
    id: 'clf-c02',
    code: 'CLF-C02',
    name: 'AWS Certified Cloud Practitioner',
    short: 'Cloud Practitioner',
    level: 'foundational',
    questions: 65,
    minutes: 90,
    passScore: 700,        // out of 1000
    prereq: null,
    icon: '☁',
    tagline: 'The entry point — broad cloud + AWS literacy.',
    description:
      'Foundational understanding of AWS Cloud — the value proposition, core services, pricing, support, and shared security model. No hands-on requirement; ideal for sales, project managers, and non-engineers as well as new engineers.',
    domains: [
      d('clf-d1', 'Cloud Concepts',                  24, 'Value, design principles, migration'),
      d('clf-d2', 'Security & Compliance',           30, 'Shared responsibility, IAM, encryption'),
      d('clf-d3', 'Cloud Technology & Services',     34, 'Core services across compute/storage/db/network'),
      d('clf-d4', 'Billing, Pricing & Support',      12, 'Pricing models, support plans, cost tools'),
    ],
    resources: {
      courses: [
        { name: 'AWS Cloud Practitioner Essentials (free, AWS Skill Builder)', rating: 4.7, url: 'https://aws.amazon.com/training/' },
        { name: 'Stephane Maarek — Cloud Practitioner Ultimate (Udemy)', rating: 4.8 },
      ],
      practice: ['Tutorials Dojo Practice Exams', 'AWS Skill Builder Official Practice'],
      whitepapers: ['wp-waf', 'wp-sec'],
      docs: ['https://docs.aws.amazon.com/', 'https://aws.amazon.com/whitepapers/'],
      youtube: ['Be A Better Dev', 'AWS Training Online'],
    },
  },
  {
    id: 'saa-c03',
    code: 'SAA-C03',
    name: 'AWS Certified Solutions Architect — Associate',
    short: 'Solutions Architect Associate',
    level: 'associate',
    questions: 65,
    minutes: 130,
    passScore: 720,
    prereq: null,
    icon: '🏛',
    tagline: 'The industry-standard mid-level AWS cert.',
    description:
      'Design resilient, performant, secure, cost-optimized architectures. The most-taken AWS cert and the highest-ROI starting point for cloud engineers.',
    domains: [
      d('saa-d1', 'Design Secure Architectures',                30),
      d('saa-d2', 'Design Resilient Architectures',             26),
      d('saa-d3', 'Design High-Performance Architectures',      24),
      d('saa-d4', 'Design Cost-Optimized Architectures',        20),
    ],
    resources: {
      courses: [
        { name: 'Stephane Maarek — Ultimate AWS SAA (Udemy)', rating: 4.8 },
        { name: 'Adrian Cantrill — SAA-C03 (learn.cantrill.io)', rating: 4.9 },
      ],
      practice: ['Tutorials Dojo SAA Practice Exams (gold standard)', 'AWS Skill Builder Official Practice'],
      whitepapers: ['wp-waf', 'wp-sec', 'wp-storage', 'wp-network', 'wp-scalable'],
      docs: ['https://docs.aws.amazon.com/vpc/', 'https://docs.aws.amazon.com/s3/'],
      youtube: ['Adrian Cantrill', 'Stephane Maarek'],
    },
  },
  {
    id: 'dva-c02',
    code: 'DVA-C02',
    name: 'AWS Certified Developer — Associate',
    short: 'Developer Associate',
    level: 'associate',
    questions: 65,
    minutes: 130,
    passScore: 720,
    prereq: null,
    icon: '⌨',
    tagline: 'Build, deploy, and debug cloud apps on AWS.',
    description:
      'Developer-focused: SDK use, serverless, CI/CD, security, troubleshooting. Heavy on Lambda, DynamoDB, API Gateway, ECS, CloudFront, Cognito, X-Ray.',
    domains: [
      d('dva-d1', 'Development with AWS Services',  32),
      d('dva-d2', 'Security',                       26),
      d('dva-d3', 'Deployment',                     24),
      d('dva-d4', 'Troubleshooting & Optimization', 18),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — Developer Associate (Udemy)', rating: 4.7 }],
      practice: ['Tutorials Dojo DVA Practice Exams'],
      whitepapers: ['wp-devops', 'wp-micro'],
      docs: ['https://docs.aws.amazon.com/lambda/', 'https://docs.aws.amazon.com/apigateway/'],
      youtube: ['Be A Better Dev', 'Stephane Maarek'],
    },
  },
  {
    id: 'soa-c02',
    code: 'SOA-C02',
    name: 'AWS Certified SysOps Administrator — Associate',
    short: 'SysOps Associate',
    level: 'associate',
    questions: 65,
    minutes: 180,
    passScore: 720,
    prereq: null,
    icon: '🛠',
    tagline: 'Operations + monitoring + automation at scale.',
    description:
      'The most ops-focused associate cert — patching, monitoring, alarms, runbooks, incident response. Includes hands-on lab questions (the only Associate that does).',
    domains: [
      d('soa-d1', 'Monitoring, Logging, Remediation',   20),
      d('soa-d2', 'Reliability & Business Continuity',  16),
      d('soa-d3', 'Deployment, Provisioning, Automation', 18),
      d('soa-d4', 'Security & Compliance',              16),
      d('soa-d5', 'Networking & Content Delivery',      18),
      d('soa-d6', 'Cost & Performance Optimization',    12),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — SysOps Associate (Udemy)', rating: 4.7 }],
      practice: ['Tutorials Dojo SOA Practice Exams'],
      whitepapers: ['wp-waf', 'wp-cost'],
      docs: ['https://docs.aws.amazon.com/AmazonCloudWatch/'],
      youtube: ['Stephane Maarek'],
    },
  },
  {
    id: 'dea-c01',
    code: 'DEA-C01',
    name: 'AWS Certified Data Engineer — Associate',
    short: 'Data Engineer Associate',
    level: 'associate',
    questions: 65,
    minutes: 130,
    passScore: 720,
    prereq: null,
    icon: '📊',
    tagline: 'Data ingestion, storage, transformation, ops.',
    description:
      'Replaces the older Data Analytics Specialty for ingestion/ETL workloads. Heavy on Glue, Kinesis, Athena, Redshift, EMR, Lake Formation.',
    domains: [
      d('dea-d1', 'Data Ingestion & Transformation',     34),
      d('dea-d2', 'Data Store Management',                26),
      d('dea-d3', 'Data Operations & Support',            22),
      d('dea-d4', 'Data Security & Governance',           18),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — Data Engineer Associate (Udemy)', rating: 4.7 }],
      practice: ['Tutorials Dojo DEA Practice Exams'],
      whitepapers: ['wp-bigdata'],
      docs: ['https://docs.aws.amazon.com/glue/'],
      youtube: ['Stephane Maarek'],
    },
  },
  {
    id: 'mla-c01',
    code: 'MLA-C01',
    name: 'AWS Certified Machine Learning Engineer — Associate',
    short: 'ML Engineer Associate',
    level: 'associate',
    questions: 65,
    minutes: 130,
    passScore: 720,
    prereq: null,
    icon: '🧬',
    tagline: 'Operationalize ML on AWS (MLOps focused).',
    description:
      'MLOps-oriented: SageMaker pipelines, model deployment, monitoring, security. Less algorithm theory than the ML Specialty, more engineering.',
    domains: [
      d('mla-d1', 'Data Preparation for ML',     28),
      d('mla-d2', 'ML Model Development',        26),
      d('mla-d3', 'Deployment & Orchestration',  22),
      d('mla-d4', 'ML Solution Monitoring & Maintenance', 24),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — ML Engineer Associate (Udemy)', rating: 4.5 }],
      practice: ['Tutorials Dojo MLA Practice Exams'],
      whitepapers: ['wp-ml'],
      docs: ['https://docs.aws.amazon.com/sagemaker/'],
      youtube: ['AWS Online Tech Talks'],
    },
  },
  {
    id: 'sap-c02',
    code: 'SAP-C02',
    name: 'AWS Certified Solutions Architect — Professional',
    short: 'Solutions Architect Professional',
    level: 'professional',
    questions: 75,
    minutes: 180,
    passScore: 750,
    prereq: 'Recommended: SAA + 2 years AWS experience',
    icon: '🏔',
    tagline: 'The big one — multi-account, hybrid, advanced patterns.',
    description:
      'Long scenario questions. Multi-account org design, migration strategies, advanced networking, hybrid integration. Often considered the hardest AWS cert.',
    domains: [
      d('sap-d1', 'Design for Organizational Complexity',   26),
      d('sap-d2', 'Design for New Solutions',               29),
      d('sap-d3', 'Continuous Improvement for Existing',    25),
      d('sap-d4', 'Accelerate Workload Migration & Modernization', 20),
    ],
    resources: {
      courses: [
        { name: 'Adrian Cantrill — SAP-C02 (learn.cantrill.io)', rating: 4.9 },
        { name: 'Stephane Maarek — SA Pro (Udemy)', rating: 4.7 },
      ],
      practice: ['Tutorials Dojo SAP Practice Exams (essential)', 'Jon Bonso Practice Questions'],
      whitepapers: ['wp-waf', 'wp-micro', 'wp-scalable'],
      docs: ['https://aws.amazon.com/architecture/well-architected/'],
      youtube: ['Adrian Cantrill'],
    },
  },
  {
    id: 'dop-c02',
    code: 'DOP-C02',
    name: 'AWS Certified DevOps Engineer — Professional',
    short: 'DevOps Engineer Professional',
    level: 'professional',
    questions: 75,
    minutes: 180,
    passScore: 750,
    prereq: 'Recommended: DVA or SOA + DevOps experience',
    icon: '🔁',
    tagline: 'Pipelines, IaC, monitoring, security at scale.',
    description:
      'CI/CD, configuration management, monitoring, incident response, security. Mix of Developer + SysOps depth, with heavy CodePipeline / CloudFormation / Lambda emphasis.',
    domains: [
      d('dop-d1', 'SDLC Automation',                    22),
      d('dop-d2', 'Configuration Management & IaC',     17),
      d('dop-d3', 'Resilient Cloud Solutions',          15),
      d('dop-d4', 'Monitoring & Logging',               15),
      d('dop-d5', 'Incident & Event Response',          14),
      d('dop-d6', 'Security & Compliance',              17),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — DevOps Pro (Udemy)', rating: 4.7 }],
      practice: ['Tutorials Dojo DOP Practice Exams'],
      whitepapers: ['wp-devops', 'wp-micro'],
      docs: ['https://docs.aws.amazon.com/codepipeline/'],
      youtube: ['AWS re:Invent CICD talks'],
    },
  },
  {
    id: 'scs-c02',
    code: 'SCS-C02',
    name: 'AWS Certified Security — Specialty',
    short: 'Security Specialty',
    level: 'specialty',
    questions: 65,
    minutes: 170,
    passScore: 750,
    prereq: 'Recommended: SAA + security background',
    icon: '🛡',
    tagline: 'IAM, KMS, GuardDuty, incident response, compliance.',
    description:
      'Deep dive on AWS security tooling — IAM Identity Center, KMS, GuardDuty, Security Hub, Inspector, Macie, Network Firewall, WAF, Shield.',
    domains: [
      d('scs-d1', 'Threat Detection & Incident Response', 14),
      d('scs-d2', 'Security Logging & Monitoring',         18),
      d('scs-d3', 'Infrastructure Security',               20),
      d('scs-d4', 'Identity & Access Management',          16),
      d('scs-d5', 'Data Protection',                       18),
      d('scs-d6', 'Management & Security Governance',      14),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — Security Specialty (Udemy)', rating: 4.7 }],
      practice: ['Tutorials Dojo SCS Practice Exams'],
      whitepapers: ['wp-sec'],
      docs: ['https://docs.aws.amazon.com/security/'],
      youtube: ['AWS Security'],
    },
  },
  {
    id: 'ans-c01',
    code: 'ANS-C01',
    name: 'AWS Certified Advanced Networking — Specialty',
    short: 'Networking Specialty',
    level: 'specialty',
    questions: 65,
    minutes: 170,
    passScore: 750,
    prereq: 'Strong networking background (CCNA-level)',
    icon: '🌐',
    tagline: 'The deepest AWS networking exam — perfect for you.',
    description:
      'Multi-account VPC design, Transit Gateway, Direct Connect, VPN, BGP, hybrid DNS, CloudFront, Global Accelerator, Network Firewall. Your CCNA background is a huge advantage.',
    domains: [
      d('ans-d1', 'Network Design',                       30),
      d('ans-d2', 'Network Implementation',               26),
      d('ans-d3', 'Network Management & Operations',      20),
      d('ans-d4', 'Network Security, Compliance & Governance', 24),
    ],
    resources: {
      courses: [
        { name: 'Adrian Cantrill — ANS-C01 (learn.cantrill.io)', rating: 4.9 },
        { name: 'Stephane Maarek — Networking Specialty (Udemy)', rating: 4.7 },
      ],
      practice: ['Tutorials Dojo ANS Practice Exams'],
      whitepapers: ['wp-network'],
      docs: ['https://docs.aws.amazon.com/vpc/', 'https://docs.aws.amazon.com/directconnect/'],
      youtube: ['Adrian Cantrill', 'AWS Networking talks at re:Invent'],
    },
  },
  {
    id: 'dbs-c01',
    code: 'DBS-C01',
    name: 'AWS Certified Database — Specialty',
    short: 'Database Specialty',
    level: 'specialty',
    questions: 65,
    minutes: 180,
    passScore: 750,
    prereq: 'Recommended: SAA + database background',
    icon: '🗄',
    tagline: 'Pick + design + operate the right AWS database.',
    description:
      'Deep dive on RDS, Aurora, DynamoDB, Redshift, ElastiCache, Neptune, DocumentDB, Timestream. Database design, migration, monitoring, security.',
    domains: [
      d('dbs-d1', 'Workload-Specific Database Design',   26),
      d('dbs-d2', 'Deployment & Migration',              20),
      d('dbs-d3', 'Management & Operations',             18),
      d('dbs-d4', 'Monitoring & Troubleshooting',        18),
      d('dbs-d5', 'Database Security',                   18),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — Database Specialty (Udemy)', rating: 4.5 }],
      practice: ['Tutorials Dojo DBS Practice Exams'],
      whitepapers: ['wp-storage'],
      docs: ['https://docs.aws.amazon.com/rds/', 'https://docs.aws.amazon.com/dynamodb/'],
      youtube: ['AWS Databases'],
    },
  },
  {
    id: 'mls-c01',
    code: 'MLS-C01',
    name: 'AWS Certified Machine Learning — Specialty',
    short: 'ML Specialty',
    level: 'specialty',
    questions: 65,
    minutes: 180,
    passScore: 750,
    prereq: '1-2 years of ML/data science background',
    icon: '🧠',
    tagline: 'ML theory + SageMaker depth.',
    description:
      'Algorithm selection, feature engineering, model tuning, deployment. Heavier on ML theory than the Engineer Associate.',
    domains: [
      d('mls-d1', 'Data Engineering',          20),
      d('mls-d2', 'Exploratory Data Analysis', 24),
      d('mls-d3', 'Modeling',                  36),
      d('mls-d4', 'ML Implementation & Ops',   20),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — ML Specialty (Udemy)', rating: 4.6 }],
      practice: ['Tutorials Dojo MLS Practice Exams'],
      whitepapers: ['wp-ml'],
      docs: ['https://docs.aws.amazon.com/sagemaker/'],
      youtube: ['AWS Machine Learning'],
    },
  },
  {
    id: 'aif-c01',
    code: 'AIF-C01',
    name: 'AWS Certified AI Practitioner',
    short: 'AI Practitioner',
    level: 'foundational',
    questions: 85,
    minutes: 90,
    passScore: 700,
    prereq: null,
    icon: '🤖',
    tagline: 'Foundational AI/ML literacy + AWS generative AI services.',
    description:
      'Newer foundational cert focused on AI/ML concepts, generative AI, prompt engineering, responsible AI, and AWS services (Bedrock, SageMaker, Q, Rekognition, Comprehend).',
    domains: [
      d('aif-d1', 'Fundamentals of AI & ML',           20),
      d('aif-d2', 'Fundamentals of Generative AI',     24),
      d('aif-d3', 'Applications of Foundation Models', 28),
      d('aif-d4', 'Guidelines for Responsible AI',     14),
      d('aif-d5', 'Security, Compliance & Governance for AI Solutions', 14),
    ],
    resources: {
      courses: [{ name: 'Stephane Maarek — AI Practitioner (Udemy)', rating: 4.7 }],
      practice: ['Tutorials Dojo AIF Practice Exams', 'AWS Skill Builder Official Practice'],
      whitepapers: ['wp-ml'],
      docs: ['https://docs.aws.amazon.com/bedrock/'],
      youtube: ['AWS Online Tech Talks'],
    },
  },
];

export const LEVEL_META = LEVELS;
export const LEVEL_ORDER = ['foundational', 'associate', 'professional', 'specialty'];

export const getCert = (id) => CERTS.find((c) => c.id === id);

export const getDomain = (cert, domainId) =>
  cert?.domains.find((d) => d.id === domainId);

// Compute pass-score percent (e.g. 720/1000 = 72%)
export const passPercent = (cert) => Math.round((cert.passScore / 1000) * 100);
