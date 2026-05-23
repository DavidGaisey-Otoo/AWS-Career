/**
 * Deterministic Daily Digest generator.
 *
 * Five items per day, seeded by the date, so every user (and every visit
 * on the same day) sees the same digest. Items are mined from the topic
 * catalog + a small library of architecture tips, career insights, and
 * news placeholders.
 *
 * Past digests can be rebuilt by passing the date string explicitly.
 */
import { flattenTopics } from './learning.js';

const ARCHITECTURE_TIPS = [
  'For HA, always span at least 2 AZs. Single-AZ workloads are an outage waiting to happen.',
  'Cache at three layers: CloudFront (edge), ElastiCache (app), DynamoDB Accelerator (DB).',
  'Idempotent design is the foundation of reliable retries. Make every operation safe to repeat.',
  'Decouple producers and consumers with SQS. The slow one no longer crashes the fast one.',
  'Choose stateless app tiers — state belongs in managed services (DDB, RDS, ElastiCache).',
  'Use VPC Endpoints for S3/DynamoDB — saves NAT cost and improves security.',
  'Tag every resource with Team + Env + Project at creation, enforced via SCP.',
  'Multi-AZ first; multi-region only when you have a tested DR runbook.',
  'For least-privilege IAM, start with managed policies, then narrow down via Access Analyzer findings.',
  'Pre-warm Lambda only if you measured a cold-start problem — otherwise it\'s wasted cost.',
  'Enable S3 default encryption + Block Public Access at the account level. Cheaper than a breach.',
  'Health checks should reflect real app health, not just "VM is alive" — use ALB-side checks.',
  'Use Step Functions for workflows with retries, parallel branches, or human approval.',
  'Place NAT Gateways in every AZ you have private subnets in. Single NAT = single point of failure.',
  'Run `terraform plan` in every PR. Drift detection prevents 3am surprises.',
];

const CAREER_INSIGHTS = [
  'Pick one cert and commit. Sprinkling effort across three at once is a guaranteed failure mode.',
  'Your portfolio outperforms your résumé. Build, document, share — three pieces beat ten bullet points.',
  'Networking is a force multiplier on AWS — your existing CCNA-level knowledge transfers directly.',
  'Freelance rates double when you have one verified review. Get that first one at any reasonable price.',
  'On LinkedIn: lead with outcomes, not duties. "Cut latency 40%" beats "Worked on the API".',
  'When applying to UK cloud roles, mention right-to-work upfront — speeds up screening.',
  'Pair a portfolio project with a Hashnode write-up. Hiring managers read both.',
  'Day-rate freelancers earn 2-3× employees but front-load business risk. Plan a 3-month buffer.',
  'Mentors > courses. Find one Cloud Engineer ahead of you and meet monthly.',
  'AWS re:Invent talks have year-round value — pick three a year and study them deeply.',
];

const NEWS_ITEMS = [
  'EBS gp3 is now the default for new volumes — cheaper than gp2 with separately tuneable IOPS/throughput.',
  'CloudFront added Origin Shield as a regional cache layer — improves hit rates at large scale.',
  'IAM Identity Center is the recommended way to do SSO across multiple AWS accounts.',
  'Amazon Bedrock added Anthropic Claude 3.5 Sonnet — frontier-class reasoning in Bedrock.',
  'EC2 instance types now have built-in AWS Nitro EFA support for HPC workloads.',
  'S3 Express One Zone is a single-AZ class with 10× faster latency, for hot data workloads.',
  'Aurora Serverless v2 scales in 0.5 ACU increments now, down from 1 ACU.',
  'Lambda SnapStart for Java cuts cold starts from seconds to ~200 ms with Firecracker snapshots.',
  'GuardDuty now supports EKS audit log monitoring — anomaly detection for Kubernetes API calls.',
  'CloudFront added support for HTTP/3 (QUIC) — better mobile performance over lossy networks.',
];

// Tiny pool of practice question seeds, kept terse so the digest stays scannable.
const PRACTICE_SEEDS = [
  {
    q: 'A static site is served from S3 + CloudFront with custom domain. Where must the ACM certificate live?',
    options: ['Same region as the S3 bucket', 'us-east-1 (N. Virginia)', 'eu-west-2 (London)', 'Any region'],
    answer: 1, why: 'CloudFront requires its TLS certificate in us-east-1, regardless of where the origin is.',
  },
  {
    q: 'You need ordered, exactly-once message processing. Which queue?',
    options: ['SQS Standard', 'SQS FIFO', 'SNS Standard', 'EventBridge'],
    answer: 1, why: 'FIFO guarantees ordering and exactly-once processing within a message group.',
  },
  {
    q: 'A private EC2 needs outbound internet but no inbound. What\'s the cheapest production-grade option?',
    options: ['Public IP', 'NAT Gateway in each AZ', 'IGW direct', 'Transit Gateway'],
    answer: 1, why: 'A NAT Gateway per AZ is standard practice — survives AZ failure and supports egress only.',
  },
  {
    q: 'You want to encrypt every S3 object by default with a customer-managed key. Which option?',
    options: ['SSE-S3', 'SSE-KMS with CMK', 'SSE-C', 'Client-side only'],
    answer: 1, why: 'SSE-KMS with a Customer Managed Key gives you rotation, audit, and IAM-controlled access.',
  },
  {
    q: 'A latency-sensitive global app uses Route 53. Which routing policy?',
    options: ['Simple', 'Weighted', 'Latency', 'Geolocation'],
    answer: 2, why: 'Latency-based routing sends users to the lowest-latency healthy region.',
  },
  {
    q: 'A Lambda exceeds 15 minutes — how to refactor?',
    options: ['Increase timeout to 60 min', 'Use Step Functions to orchestrate multiple Lambdas',
              'Switch to EC2', 'Use Fargate task'],
    answer: 1, why: 'Lambda hard-caps at 15 min; Step Functions or Fargate are the right escape hatches.',
  },
  {
    q: 'For a multi-account org, where do you enforce "no IAM user creation"?',
    options: ['IAM in each account', 'Bucket policy', 'SCP at the OU level', 'CloudFormation StackSet'],
    answer: 2, why: 'SCPs apply organisation-wide and cap what IAM can grant in member accounts.',
  },
];

// ----- helpers -----
function dayKey(date = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`;
}

// Deterministic small hash so the same date always yields the same digest.
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h;
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

export function dailyDigest(date = new Date()) {
  const key = dayKey(date);
  const seed = hash(key);

  // Concept: pick a topic deterministically from the catalog.
  const topics = flattenTopics();
  const conceptEntry = topics[seed % topics.length];

  const practice = pick(PRACTICE_SEEDS, seed >> 3);
  const archTip = pick(ARCHITECTURE_TIPS, seed >> 6);
  const career = pick(CAREER_INSIGHTS, seed >> 9);
  const news = pick(NEWS_ITEMS, seed >> 12);

  return {
    date: key,
    concept: {
      categoryId: conceptEntry.category.id,
      topicId: conceptEntry.topic.id,
      title: conceptEntry.topic.title,
      summary: conceptEntry.topic.summary ||
        conceptEntry.topic.simpleEnglish?.slice(0, 220) || '',
      categoryTitle: conceptEntry.category.title,
    },
    practice: {
      q: practice.q,
      options: practice.options,
      answer: practice.answer,
      why: practice.why,
    },
    archTip,
    career,
    news,
  };
}

// Build the last N daily digests (for "Digest history").
export function digestHistory(n = 14) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(dailyDigest(d));
  }
  return out;
}
