/**
 * "What's New in AWS" — curated stream of AWS announcements with
 * per-cert impact assessment + freelance-opportunity tagging.
 *
 * Item shape:
 *   {
 *     id, title, summary, service, dateISO,
 *     tag: 'study' | 'cert' | 'freelance' | 'news' | 'retire',
 *     affects: { certs: [certId], topics: [{ categoryId, topicId }] },
 *     opportunity: 'High' | 'Medium' | 'Low' | null,
 *     url, level: 'info' | 'warn' | 'alert',
 *   }
 *
 * Curated for the Stage 13 launch — refresh quarterly.
 */

export const UPDATE_TAGS = {
  study:     { label: 'Affects your study plan',  emoji: '📚', tone: 'border-electric/40 bg-electric/10 text-electric' },
  cert:      { label: 'Affects a certification',  emoji: '🎓', tone: 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange' },
  freelance: { label: 'Freelance opportunity',    emoji: '💼', tone: 'border-success/40 bg-success/10 text-success' },
  news:      { label: 'General AWS news',         emoji: '📰', tone: 'border-token bg-[var(--card-2)] text-muted' },
  retire:    { label: 'Service retiring',         emoji: '⚠',  tone: 'border-danger/40 bg-danger/10 text-danger' },
};

export const AWS_UPDATES = [
  {
    id: 'bedrock-new-fms-2026-05',
    title: 'Amazon Bedrock adds new foundation models',
    summary: 'Anthropic Claude 4.7 and Meta Llama 4 are now available in Bedrock across us-east-1 and eu-west-1. Adds prompt caching, sub-200ms first-token latency, and tool-use streaming.',
    service: 'Bedrock',
    dateISO: '2026-05-08T10:00:00Z',
    tag: 'cert',
    affects: {
      certs: ['aif-c01', 'mls-c01'],
      topics: [],
    },
    opportunity: 'High',
    url: 'https://aws.amazon.com/about-aws/whats-new/',
    level: 'info',
  },
  {
    id: 'graviton4-launch-2026-04',
    title: 'AWS Graviton4 instances reach general availability',
    summary: 'R8g and M8g families launch with up to 96 vCPUs and 30% better price/performance vs Graviton3. Recommended default for new workloads in supported regions.',
    service: 'EC2',
    dateISO: '2026-04-22T13:00:00Z',
    tag: 'cert',
    affects: {
      certs: ['saa-c03', 'sap-c02', 'soa-c02'],
      topics: [],
    },
    opportunity: 'Medium',
    url: 'https://aws.amazon.com/ec2/graviton/',
    level: 'info',
  },
  {
    id: 'q-developer-ga-2026-03',
    title: 'Amazon Q Developer reaches GA across all IDEs',
    summary: 'Free tier with 50 monthly chats. Pro tier adds IAM-aware code generation, /transform for legacy Java apps, and direct workflow integration with CodeCatalyst.',
    service: 'Amazon Q',
    dateISO: '2026-03-30T09:00:00Z',
    tag: 'freelance',
    affects: { certs: ['aif-c01'], topics: [] },
    opportunity: 'High',
    url: 'https://aws.amazon.com/q/developer/',
    level: 'info',
  },
  {
    id: 'lambda-freetier-raise-2026-02',
    title: 'AWS raises Free Tier Lambda limits',
    summary: 'Free Tier now includes 1.5M monthly invocations and 600,000 GB-seconds — up from 1M / 400,000. Applies to new + existing accounts.',
    service: 'Lambda',
    dateISO: '2026-02-15T08:00:00Z',
    tag: 'study',
    affects: { certs: ['clf-c02', 'saa-c03', 'dva-c02'], topics: [] },
    opportunity: 'Low',
    url: 'https://aws.amazon.com/lambda/pricing/',
    level: 'info',
  },
  {
    id: 'saa-c03-genai-update-2026-02',
    title: 'SAA-C03 exam guide updated — generative AI topics added',
    summary: 'Effective 1 March 2026: questions covering Bedrock workload patterns, knowledge bases, RAG architectures, and generative-AI cost optimisation. ~8% of the exam.',
    service: 'Certification',
    dateISO: '2026-02-02T00:00:00Z',
    tag: 'cert',
    affects: {
      certs: ['saa-c03'],
      topics: [],
      examGuideChange: {
        certId: 'saa-c03',
        oldVersion: '2.0',
        newVersion: '2.1',
        effectiveDate: '2026-03-01',
        added: [
          'Bedrock workload patterns (RAG, agents, knowledge bases)',
          'Foundation-model selection criteria',
          'Generative-AI cost optimisation',
        ],
        removed: [],
      },
    },
    opportunity: 'Medium',
    url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/',
    level: 'warn',
  },
  {
    id: 'codecommit-retire-2026-01',
    title: 'AWS retiring CodeCommit for new accounts',
    summary: 'Existing repositories continue to work, but no new repos can be created from 28 July 2024. Migrate to GitHub, GitLab, or self-hosted Git. Affects CI/CD topics in the Learning Lab.',
    service: 'CodeCommit',
    dateISO: '2026-01-12T00:00:00Z',
    tag: 'retire',
    affects: {
      certs: ['dva-c02', 'dop-c02', 'saa-c03'],
      topics: [{ categoryId: 'devops', topicId: 'cicd' }],
    },
    opportunity: 'Medium',
    url: 'https://docs.aws.amazon.com/codecommit/',
    level: 'alert',
  },
  {
    id: 'vpc-lattice-ga-extra-2025-12',
    title: 'VPC Lattice gains cross-region service discovery',
    summary: 'Discover services in any region via a single Lattice service network. Removes the need for Transit Gateway peering for service-to-service traffic in many designs.',
    service: 'VPC Lattice',
    dateISO: '2025-12-08T10:00:00Z',
    tag: 'cert',
    affects: { certs: ['ans-c01', 'sap-c02'], topics: [] },
    opportunity: 'Low',
    url: 'https://aws.amazon.com/vpc/lattice/',
    level: 'info',
  },
  {
    id: 'eks-auto-mode-2025-11',
    title: 'EKS Auto Mode — managed compute + add-ons',
    summary: 'EKS now manages worker nodes, network plugin, storage class, and core add-ons end-to-end. Cuts day-2 ops by ~70% on small clusters.',
    service: 'EKS',
    dateISO: '2025-11-30T09:00:00Z',
    tag: 'freelance',
    affects: { certs: ['saa-c03', 'sap-c02', 'dop-c02'], topics: [] },
    opportunity: 'High',
    url: 'https://aws.amazon.com/eks/',
    level: 'info',
  },
  {
    id: 's3-tables-2025-11',
    title: 'S3 Tables now GA — Iceberg buckets',
    summary: 'Native Apache Iceberg support in S3. 3× query performance and automated maintenance for analytics workloads — replaces a lot of bespoke Glue jobs.',
    service: 'S3',
    dateISO: '2025-11-17T09:00:00Z',
    tag: 'study',
    affects: { certs: ['dea-c01', 'mls-c01'], topics: [] },
    opportunity: 'Medium',
    url: 'https://aws.amazon.com/s3/features/tables/',
    level: 'info',
  },
  {
    id: 'control-tower-region-expand-2025-10',
    title: 'AWS Control Tower expands to 8 new regions',
    summary: 'Including af-south-1 and me-south-1. Now reachable from 31 regions total — landing zones can finally include South Africa and Bahrain natively.',
    service: 'Control Tower',
    dateISO: '2025-10-19T10:00:00Z',
    tag: 'news',
    affects: { certs: ['sap-c02', 'scs-c02'], topics: [] },
    opportunity: 'Low',
    url: 'https://aws.amazon.com/controltower/',
    level: 'info',
  },
];

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

/** Sort newest-first and optionally cap. */
export function recentUpdates(n = null) {
  const sorted = [...AWS_UPDATES].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  return n ? sorted.slice(0, n) : sorted;
}

/** Return only items that affect a specific cert id. */
export function updatesForCert(certId) {
  return AWS_UPDATES.filter((u) => u.affects?.certs?.includes(certId));
}

/** Return any pending exam-guide change for a cert (the most-recent one). */
export function examGuideChange(certId) {
  const found = AWS_UPDATES
    .filter((u) => u.affects?.examGuideChange?.certId === certId)
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  return found[0]?.affects?.examGuideChange || null;
}

/** All retired-service alerts (newest first). */
export function retiredServices() {
  return AWS_UPDATES
    .filter((u) => u.tag === 'retire')
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
}
