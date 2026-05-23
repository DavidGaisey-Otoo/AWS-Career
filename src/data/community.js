/**
 * Seed data for the Community section — sample forum posts, study buddies,
 * project showcase entries, success stories. The user adds their own on top.
 */

const day = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString();
};

export const FORUM_CATEGORIES = [
  { id: 'general',    label: 'General',       icon: '💬' },
  { id: 'services',   label: 'AWS Services',  icon: '☁' },
  { id: 'exam-tips',  label: 'Exam Tips',     icon: '🎓' },
  { id: 'career',     label: 'Career',        icon: '💼' },
  { id: 'projects',   label: 'Projects',      icon: '🛠' },
  { id: 'jobs',       label: 'Jobs',          icon: '📌' },
];

export const SAMPLE_POSTS = [
  {
    id: 'p-001',
    category: 'services',
    title: 'When do you actually need Transit Gateway vs VPC peering?',
    body: 'Working on a 4-VPC setup that needs to talk to each other and on-prem. Is TGW overkill at 4 VPCs?',
    author: { id: 'u-akua', name: 'Akua Mensah', country_flag: '🇬🇭', isMentor: true },
    at: day(1),
    tags: ['vpc', 'tgw', 'networking'],
    upvotes: 24,
    replies: [
      {
        id: 'r-001',
        author: { id: 'u-priya', name: 'Priya Sharma', country_flag: '🇮🇳', isMentor: true },
        at: day(1),
        body: 'Rule of thumb: 3+ VPCs with on-prem connectivity = TGW. Peering becomes a mesh nightmare past 3 VPCs.',
        upvotes: 31,
        solution: true,
      },
      {
        id: 'r-002',
        author: { id: 'u-carlos', name: 'Carlos Mendoza', country_flag: '🇲🇽' },
        at: day(1),
        body: 'Also TGW route tables let you isolate envs (prod / dev). Hard to do with peering.',
        upvotes: 12,
      },
    ],
  },
  {
    id: 'p-002',
    category: 'exam-tips',
    title: 'Passed SAA-C03 with 879. Here\'s what worked.',
    body: '6 weeks of study. Cantrill course + Tutorials Dojo + 4 mock exams. Notes on networking domain inside.',
    author: { id: 'u-daniel', name: 'Daniel Park', country_flag: '🇰🇷', isMentor: true },
    at: day(2),
    tags: ['saa', 'study-plan'],
    upvotes: 87,
    replies: [
      {
        id: 'r-010',
        author: { id: 'u-yuki', name: 'Yuki Tanaka', country_flag: '🇯🇵' },
        at: day(2), body: 'Congrats! Did you do flashcards too?', upvotes: 6,
      },
    ],
  },
  {
    id: 'p-003',
    category: 'career',
    title: 'Got my first $500 freelance project on Upwork — story',
    body: 'Sent 14 proposals over 3 weeks. The one that landed wasn\'t the cheapest — I think it was the screenshots. Sharing in case it helps anyone.',
    author: { id: 'u-faith', name: 'Faith Asante', country_flag: '🇬🇭' },
    at: day(3),
    tags: ['freelance', 'upwork', 'first-client'],
    upvotes: 52,
    replies: [],
  },
  {
    id: 'p-004',
    category: 'projects',
    title: 'Built my first serverless API — feedback please',
    body: 'Lambda + API Gateway + DynamoDB. GitHub link in showcase. Tell me what you\'d change.',
    author: { id: 'u-bernard', name: 'Bernard Owusu', country_flag: '🇬🇭' },
    at: day(4),
    tags: ['serverless', 'lambda', 'dynamodb'],
    upvotes: 19,
    replies: [],
  },
  {
    id: 'p-005',
    category: 'jobs',
    title: 'Remote Cloud Engineer roles open at a UK SaaS — sharing for visibility',
    body: 'Not affiliated, just saw the posting. Mid-level, £55-70k, fully remote, AWS-heavy.',
    author: { id: 'u-sarah', name: 'Sarah O\'Brien', country_flag: '🇮🇪', isMentor: true },
    at: day(5),
    tags: ['uk', 'remote', 'mid-level'],
    upvotes: 41,
    replies: [],
  },
  {
    id: 'p-006',
    category: 'general',
    title: 'Anyone else find Glue documentation impossibly dense?',
    body: 'Trying to set up a crawler and the docs read like a tax code. Any short intro you\'d recommend?',
    author: { id: 'u-joseph', name: 'Joseph Mensah', country_flag: '🇬🇭' },
    at: day(6),
    tags: ['glue', 'docs', 'beginner'],
    upvotes: 13,
    replies: [],
  },
];

export const STUDY_BUDDIES = [
  { id: 'b-akua',  name: 'Akua Mensah',     level: 'SAA',           tz: 'GMT', country_flag: '🇬🇭', streak: 42, online: true, isMentor: true },
  { id: 'b-priya', name: 'Priya Sharma',    level: 'SAA',           tz: 'IST', country_flag: '🇮🇳', streak: 30, online: true, isMentor: true },
  { id: 'b-faith', name: 'Faith Asante',    level: 'CLF',           tz: 'GMT', country_flag: '🇬🇭', streak: 14, online: false },
  { id: 'b-yuki',  name: 'Yuki Tanaka',     level: 'Developer Assoc', tz: 'JST', country_flag: '🇯🇵', streak: 22, online: false },
  { id: 'b-bern',  name: 'Bernard Owusu',   level: 'SAA',           tz: 'GMT', country_flag: '🇬🇭', streak: 18, online: true },
  { id: 'b-emeka', name: 'Emeka Nwosu',     level: 'CLF',           tz: 'WAT', country_flag: '🇳🇬', streak:  9, online: true },
  { id: 'b-mat',   name: 'Mateusz Kowalski',level: 'SysOps',        tz: 'CET', country_flag: '🇵🇱', streak: 27, online: false },
];

export const SHOWCASE_PROJECTS = [
  {
    id: 's-001',
    title: 'Multi-AZ VPC + ALB landing zone (Terraform)',
    blurb: 'A reusable Terraform module for a 4-subnet VPC with ALB + ASG. Includes drift-detection workflow.',
    author: { id: 'u-akua', name: 'Akua Mensah', country_flag: '🇬🇭' },
    at: day(1),
    githubStars: 124,
    upvotes: 56,
    comments: 8,
    tags: ['vpc', 'terraform', 'alb'],
    featured: true,
  },
  {
    id: 's-002',
    title: 'Serverless Todo API with Cognito + Lambda + DDB',
    blurb: 'SAM template that ships a CRUD API with hosted UI auth in <100 LOC.',
    author: { id: 'u-bernard', name: 'Bernard Owusu', country_flag: '🇬🇭' },
    at: day(2),
    githubStars: 38,
    upvotes: 24,
    comments: 4,
    tags: ['lambda', 'cognito', 'sam'],
  },
  {
    id: 's-003',
    title: 'Cost dashboard for a small AWS bill',
    blurb: 'CloudFormation + CloudWatch dashboard JSON for visualising a sub-$1k/mo AWS bill.',
    author: { id: 'u-daniel', name: 'Daniel Park', country_flag: '🇰🇷' },
    at: day(3),
    githubStars: 71,
    upvotes: 33,
    comments: 6,
    tags: ['cost', 'cloudwatch'],
  },
  {
    id: 's-004',
    title: 'Bedrock RAG starter — Knowledge Bases + Lambda',
    blurb: 'CDK starter for a RAG system: docs in S3, Bedrock KB, Lambda answer router.',
    author: { id: 'u-priya', name: 'Priya Sharma', country_flag: '🇮🇳' },
    at: day(4),
    githubStars: 92,
    upvotes: 48,
    comments: 12,
    tags: ['bedrock', 'rag', 'cdk'],
  },
];

export const SUCCESS_STORIES = [
  {
    id: 'ss-001',
    category: 'first-client',
    headline: 'Landed my first $1,200 client — 6 weeks after starting',
    body: 'I almost gave up at proposal #11. The one that landed wasn\'t a fancy proposal — I just asked one specific question about their architecture and showed I\'d read their post carefully.',
    author: { id: 'u-faith', name: 'Faith Asante', country_flag: '🇬🇭' },
    at: day(2),
    hearts: 142, comments: 18,
  },
  {
    id: 'ss-002',
    category: 'cert',
    headline: 'Passed Solutions Architect Associate (873)',
    body: 'Networking domain crushed me on the mocks until I started using Reachability Analyzer in a lab account. Made the concepts tangible.',
    author: { id: 'u-bernard', name: 'Bernard Owusu', country_flag: '🇬🇭' },
    at: day(5),
    hearts: 89, comments: 11,
  },
  {
    id: 'ss-003',
    category: 'income',
    headline: 'First $1k month, second $3k month',
    body: 'The compounding is real. Months 1-2 were brutal. Month 4 is where things tipped.',
    author: { id: 'u-daniel', name: 'Daniel Park', country_flag: '🇰🇷' },
    at: day(10),
    hearts: 211, comments: 27,
  },
  {
    id: 'ss-004',
    category: 'job-offer',
    headline: 'Remote Cloud Engineer offer from a UK fintech — £62k',
    body: 'Took 4 months of building + posting on LinkedIn. The recruiter found me, not the other way around.',
    author: { id: 'u-sarah', name: 'Sarah O\'Brien', country_flag: '🇮🇪' },
    at: day(14),
    hearts: 178, comments: 22,
  },
];

export const SUCCESS_CATEGORIES = [
  { id: 'first-client', label: 'First client',         icon: '🤝' },
  { id: 'cert',         label: 'Certification earned', icon: '🎓' },
  { id: 'income',       label: 'Income milestone',     icon: '💰' },
  { id: 'job-offer',    label: 'Job offer',            icon: '💼' },
];
