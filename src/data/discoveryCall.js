/**
 * Discovery call prep — pure functions that build a pre-call briefing
 * from a job analysis result, the user's profile, and their portfolio.
 *
 * Output is a structured object the page renders:
 *   { questions, talkingPoints, objections, postCallTemplate, followUp }
 */

// -------------------------------------------------------------
// Project-type → questions map
// -------------------------------------------------------------

const QUESTIONS_BY_TYPE = {
  'Quick Infra Setup': [
    'What is your current AWS setup?',
    'What specific problems are you experiencing?',
    'What does success look like for this project?',
    'What is your expected user traffic?',
    'Do you have compliance requirements?',
    'Do you have an existing AWS account?',
    'What is your budget range?',
    'When do you need this live?',
  ],
  'General AWS Engineering': [
    'What is your current AWS setup?',
    'What specific problems are you experiencing?',
    'What does success look like for this project?',
    'What is your expected user traffic?',
    'Do you have compliance requirements?',
    'Do you have an existing AWS account?',
    'What is your budget range?',
    'When do you need this live?',
  ],
  'Cloud Migration': [
    'What is currently running on-premises (or on which other cloud)?',
    'What is your downtime tolerance during cutover?',
    'Do you have a disaster recovery requirement?',
    'What are your data residency requirements?',
    'Do you have a preferred AWS region?',
    'What is the data volume to migrate? Cold vs hot data split?',
    'Who will validate the cutover on the client side?',
    'Is the migration window a hard date or a flexible window?',
  ],
  'Landing Zone / Multi-account': [
    'How many accounts are you targeting and what is the OU structure?',
    'What is your IdP — Okta, Azure AD, Google?',
    'Centralised logging destination + retention policy?',
    'Are there any SCP guardrails you already enforce?',
    'Who owns each workload account post-launch?',
    'Compliance frameworks you must satisfy (SOC 2, ISO, PCI, HIPAA)?',
  ],
  'Network Architecture': [
    'Existing on-prem connectivity (Direct Connect, VPN, none)?',
    'Account / VPC inventory and CIDR plan today?',
    'East/west or north/south inspection requirements?',
    'DNS — Route 53 only or hybrid with on-prem resolvers?',
    'Latency / bandwidth SLAs?',
    'Who owns IP allocation going forward?',
  ],
  'CI/CD Pipeline': [
    'Source control — GitHub, GitLab, CodeCommit?',
    'How many environments need pipelines (dev / staging / prod)?',
    'Deployment targets — ECS, EKS, EC2, Lambda?',
    'Manual approval gates required where?',
    'Where should secrets live — Parameter Store or Secrets Manager?',
    'Notification preferences — Slack, email?',
  ],
  'Serverless API': [
    'Expected requests per second at launch and 12-month projection?',
    'Auth — Cognito, custom, social, none?',
    'Data model — strongly relational or document/key-value?',
    'Latency budget at p95?',
    'Multi-region requirement?',
    'API observability — CloudWatch only or Datadog/New Relic too?',
  ],
  'Container Workload': [
    'Image registry — ECR, Docker Hub, private?',
    'Service-to-service auth model?',
    'Stateful or stateless workloads?',
    'Sidecar requirements (Envoy, Datadog, OpenTelemetry)?',
    'Autoscaling target — request rate, CPU, custom metric?',
    'Cluster ownership post-launch?',
  ],
  'Data Pipeline / Analytics': [
    'Source systems and their formats?',
    'Hot vs cold path requirements (streaming vs batch)?',
    'Query latency expectation (sub-second, minute, hour)?',
    'PII handling — masking, tokenisation, isolation?',
    'BI tool of choice — QuickSight, Tableau, Looker?',
    'Retention + archive policy?',
  ],
  'Static Site / CDN': [
    'Custom domain + TLS certificate ownership?',
    'CMS or pure static build?',
    'Edge logic needed (Lambda@Edge / CloudFront Functions)?',
    'Geo restrictions?',
    'CI integration — auto-deploy on git push?',
  ],
  'Database / Storage': [
    'Current data size + monthly growth?',
    'RPO / RTO targets?',
    'Backup retention policy?',
    'Compliance scope — encryption, access logging, audit trail?',
    'Read/write split or scale model?',
    'Multi-region or single-region?',
  ],
  'Security / Compliance': [
    'Which framework(s) drive scope — SOC 2, ISO 27001, PCI, HIPAA, GDPR?',
    'Auditor on the engagement?',
    'Existing identity provider?',
    'CSPM tooling in place (Wiz, Prisma, AWS Security Hub)?',
    'Data classification scheme?',
    'Incident response runbook — exists or needed?',
  ],
  'Disaster Recovery': [
    'RPO + RTO targets per workload?',
    'Budget cap on DR — pilot light, warm standby, multi-region active?',
    'Annual DR test cadence required?',
    'Data replication tools in use today?',
    'Failback strategy?',
  ],
  // Cost optimisation isn\'t a Job Analyzer classification today,
  // but expose the question set for manual selection.
  'Cost Optimization': [
    'What is your current monthly AWS spend?',
    'Which services are costing the most?',
    'Have you used AWS Cost Explorer / Compute Optimizer?',
    'Reserved Instances / Savings Plans currently held?',
    'Are there workloads safe to put on Spot or Graviton?',
    'What is your target monthly budget?',
  ],
};

// -------------------------------------------------------------
// Talking points (template substitutions filled at call time)
// -------------------------------------------------------------

function talkingPoints({ profile = {}, certs = [], portfolio = [], type }) {
  const name = profile.name || 'I';
  const certList = certs.length ? certs.join(', ') : 'AWS Cloud Practitioner';
  const recent = portfolio[0] ||
    'a similar AWS architecture engagement';

  return [
    {
      id: 'certs',
      label: 'Lead with certs + relevance',
      text:
`I hold ${certList} which directly covers the ${type || 'AWS engineering'} work you are describing. Happy to share my badges and verification IDs on request.`,
    },
    {
      id: 'recent-project',
      label: 'Anchor on recent comparable project',
      text:
`I recently completed ${recent} — similar shape to what you need. I can walk you through the architecture in a screenshare if useful.`,
    },
    {
      id: 'approach',
      label: 'State your method clearly',
      text:
`My approach for this type of project: lock the architecture and Well-Architected review first, build in my own AWS account, demo end-to-end before any change touches yours, then a single supervised cutover with a written runbook.`,
    },
    {
      id: 'zero-risk',
      label: 'Reduce perceived risk',
      text:
`I test everything in my own account first so there is zero risk to your infrastructure. You only see fully-validated changes, with rollback steps already proven.`,
    },
    {
      id: 'comms',
      label: 'Set comms expectations',
      text:
`Weekly written update with what shipped, what is in flight, what is next. Same-day reply on anything urgent during business hours.`,
    },
  ];
}

// -------------------------------------------------------------
// Objections + responses
// -------------------------------------------------------------

function objections() {
  return [
    {
      objection: 'You have no reviews yet.',
      response: 'I am building my portfolio, so I propose a small first milestone with written scope, acceptance criteria, and evidence for your review. Payment and refund terms must be agreed in the platform contract before work starts.',
    },
    {
      objection: 'Your rate is too high.',
      response: 'I can explain the estimate, narrow the first milestone, and define measurable acceptance criteria. I will not promise results or payment terms that are not written into our contract.',
    },
    {
      objection: 'Can you start today?',
      response: 'I can begin within 48 hours of receiving the signed agreement and deposit. That buffer lets me load context and avoid mistakes from rushing.',
    },
    {
      objection: 'I need someone senior.',
      response: 'That may be a valid requirement. I will not claim senior experience I cannot evidence. I can share relevant portfolio code, state my verified credentials, and suggest a small evaluation milestone—or step aside if senior production ownership is essential.',
    },
    {
      objection: 'We already have an in-house team.',
      response: 'Perfect — I\'m happy to pair with your engineers, document everything they need to own it day 2, and exit cleanly. The goal is to make them faster, not replace them.',
    },
    {
      objection: 'Why not just use a consultancy?',
      response: 'You get one engineer who built it end-to-end — direct accountability, no handoff overhead, faster decisions. For projects under three months that\'s usually the better tradeoff.',
    },
    {
      objection: 'We need to think about it.',
      response: 'Of course. To help that decision: which specific part of the proposal feels uncertain? I can often resolve it on the spot.',
    },
    {
      objection: 'Can you reduce the price by 20%?',
      response: 'I can reduce the scope, the timeline, or the post-delivery support — any of those will lower the price. I don\'t discount the price for the same scope because the quality of the work is what justifies the cost.',
    },
  ];
}

// -------------------------------------------------------------
// Post-call template
// -------------------------------------------------------------

function postCallTemplate(brief = {}) {
  return {
    projectNeeds:    '',
    timeline:        brief.timeline || '',
    budget:          brief.budget   ? `${brief.budget} ${brief.currency || 'USD'}` : '',
    concerns:        '',
    decisionMaker:   '',
    nextStep:        'Send proposal within 24 hours',
    followUpBy:      defaultFollowUpDate(),
  };
}

function defaultFollowUpDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}

// -------------------------------------------------------------
// Follow-up email generator (called after the post-call form is saved)
// -------------------------------------------------------------

function followUpEmail({ profile = {}, client = {}, brief = {}, post = {} }) {
  const first = (client.name || '').split(' ')[0] || 'there';
  return {
    subject: `Great speaking with you — next steps`,
    body:
`Hi ${first},

Thanks for the call. Quick recap of what I heard:

• Project: ${post.projectNeeds || brief.projectTitle || '[project]'}
• Timeline: ${post.timeline || '[timeline]'}
• Budget envelope: ${post.budget || '[budget]'}
• Decision maker: ${post.decisionMaker || '[name]'}

Next step we agreed on:
${post.nextStep || 'Send proposal within 24 hours'}

I will have the proposal in your inbox by ${post.followUpBy ? new Date(post.followUpBy).toDateString() : 'end of tomorrow'}. It will cover scope, timeline, investment, and a payment schedule.

If anything else surfaces in the meantime, just reply to this email and I will fold it in.

Best regards,
${profile.name || 'Your Name'}
${profile.bio ? '' : 'AWS Certified Cloud Engineer'}`,
  };
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------

/**
 * Build the full briefing.
 * @param {object} arg
 *   analysis  — output of analyzeJob() (optional)
 *   profile   — user profile (name, bio)
 *   certs     — array of cert labels
 *   portfolio — array of completed portfolio strings (most recent first)
 *   brief     — { projectTitle, timeline, budget, currency }
 *   client    — { name, company, email }
 */
export function buildBriefing({ analysis = null, profile = {}, certs = [], portfolio = [], brief = {}, client = {} }) {
  const type = analysis?.type || 'General AWS Engineering';
  const questions = QUESTIONS_BY_TYPE[type] || QUESTIONS_BY_TYPE['General AWS Engineering'];
  // Cross-pollinate questions from the Job Analyzer's own missing-info list
  const merged = uniq([
    ...(questions || []),
    ...(analysis?.missing?.map((m) => m.question) || []),
  ]);

  return {
    type,
    questions: merged,
    talkingPoints: talkingPoints({ profile, certs, portfolio, type }),
    objections: objections(),
    postCallTemplate: postCallTemplate(brief),
    followUpFor: (post) => followUpEmail({ profile, client, brief, post }),
  };
}

export function buildFollowUp(args) {
  return followUpEmail(args);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

// Expose every project type so the UI can offer a manual override.
export const PROJECT_TYPES = Object.keys(QUESTIONS_BY_TYPE);
