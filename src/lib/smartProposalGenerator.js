/**
 * smartProposalGenerator.js — FR-02
 *
 * A structured 6-section proposal generator that:
 *   1. Reads any job description
 *   2. Extracts the client's exact problem, services, level, budget
 *   3. Emits a personalised proposal in this fixed shape:
 *        HOOK · UNDERSTANDING · MY APPROACH · WHY ME · TIMELINE · CALL TO ACTION
 *   4. Targets 200-350 words by default
 *   5. Supports `seed` for "Regenerate" variation and `lengthMode` for
 *      Shorten / Expand
 *
 * This is intentionally pure (no React) so the UI can call it once on
 * mount, again on Regenerate, etc. — easy to unit-test, easy to swap
 * the templating later.
 *
 * It REUSES the existing analyzeJobDescription() from freelanceEngine
 * for the JD extraction step so we don't duplicate that intelligence.
 */

import { analyzeJobDescription } from './freelanceEngine.js';

// ════════════════════════════════════════════════════════════════════
// Never infer certifications or delivery history from a job description.
// Those are identity claims and must come from verified profile evidence.

// ════════════════════════════════════════════════════════════════════
// Service explainers — kept short, plain-English, used in MY APPROACH
// ════════════════════════════════════════════════════════════════════
const APPROACH_PHRASES = {
  ec2:        'Provision right-sized EC2 instances with Auto Scaling so you only pay for what you actually use',
  lambda:     'Build the core logic as Lambda functions so there are no idle servers to manage',
  s3:         'Use S3 with lifecycle rules for durable, cheap object storage',
  cloudfront: 'Put CloudFront in front so global users get sub-100ms response times',
  dynamodb:   'Model the data in DynamoDB with on-demand capacity to handle traffic spikes',
  rds:        'Stand up a Multi-AZ RDS database with automated backups and point-in-time recovery',
  aurora:     'Use Aurora for production-grade SQL with up to 15 read replicas',
  vpc:        'Lay down a secure VPC with public/private subnets across two Availability Zones',
  iam:        'Lock everything down with IAM least-privilege roles — no long-lived keys',
  ecs:        'Containerise the workload on ECS Fargate so there are no EC2 hosts to patch',
  eks:        'Run the platform on EKS with managed node groups and IRSA for pod-level IAM',
  fargate:    'Use Fargate so containers are billed per second with zero infra to manage',
  apigateway: 'Expose the API through API Gateway with usage plans, throttling, and built-in auth',
  cognito:    'Hand authentication to Cognito so you get sign-in, MFA, and federation out of the box',
  cloudfront_acm: 'Add a custom domain through Route 53 + ACM for free TLS',
  route53:    'Manage DNS in Route 53 with health-checked failover records',
  cloudwatch: 'Wire CloudWatch dashboards + alarms so you know about problems before users do',
  cloudformation: 'Define everything in CloudFormation so the stack is one-click reproducible',
  terraform:  'Write the infra as Terraform modules so changes go through code review',
  sagemaker:  'Host the ML model on a SageMaker endpoint with autoscaling',
  bedrock:    'Wire Bedrock for the LLM calls — no GPU servers to babysit',
  glue:       'Stage the ETL on Glue jobs triggered by S3 events',
  athena:     'Query the lake directly with Athena — pay per scanned GB, no cluster',
  redshift:   'Land the warehouse on Redshift Serverless so analytics scales without ops',
  kinesis:    'Stream events through Kinesis for real-time processing',
  vpn:        'Stand up a Site-to-Site VPN for the secure on-prem connection',
  'direct connect': 'Light up a Direct Connect link for dedicated low-latency bandwidth',
  tgw:        'Use a Transit Gateway as the network hub between accounts',
  'transit gateway': 'Use a Transit Gateway as the network hub between accounts',
  codepipeline: 'Automate releases on CodePipeline so every push runs tests + deploys',
};

// ════════════════════════════════════════════════════════════════════
// Hook variations — picked by seed so Regenerate gives a different one
// ════════════════════════════════════════════════════════════════════
function pickHook(seed, painPoint, projectTitle, primaryService) {
  const variants = [
    `${painPoint}${endPunct(painPoint)} I would start by confirming the scope, constraints, and success checks before proposing an AWS design.`,
    `It sounds like ${shortPain(painPoint)} is the main concern. I would confirm the impact and acceptance criteria before choosing an AWS design.`,
    `I reviewed your post carefully. ${primaryService.toUpperCase()} may fit ${shortPain(painPoint)}, but I would validate the requirements and alternatives first.`,
    `Your project caught my eye because ${shortPain(painPoint)} can be broken into clear, reviewable AWS milestones.`,
    `Quick proposal for "${projectTitle}" — I think you'll like how lean the AWS approach makes this.`,
  ];
  return variants[seed % variants.length];
}

// ════════════════════════════════════════════════════════════════════
// Why-Me variations
// ════════════════════════════════════════════════════════════════════
function pickWhyMe(seed, primaryService) {
  const variants = [
    `I use an evidence-first workflow: agreed requirements, a reviewable ${primaryService.toUpperCase()} design, infrastructure-as-code where supported, validation results, and written handover notes. Any experience or certification claim should be added only when you can verify it.`,
    `You would receive a scoped plan, architecture diagram, cost assumptions, risk register, and acceptance checks before production changes are considered.`,
    `My proposed workflow keeps assumptions visible and separates planning from verified deployment evidence, so you can review every important decision.`,
    `I would begin with a small, agreed milestone and provide the resulting code, test evidence, and documentation for review before expanding the scope.`,
  ];
  return variants[seed % variants.length];
}

// ════════════════════════════════════════════════════════════════════
// CTA variations
// ════════════════════════════════════════════════════════════════════
function pickCta(seed, firstName) {
  const variants = [
    `Happy to jump on a 15-minute call this week to walk through the architecture and confirm scope. Just send me a time that works for you. — ${firstName}`,
    `If this approach lines up with what you had in mind, message me and we can agree the requirements needed for a fixed-scope proposal and milestones. — ${firstName}`,
    `Send me a quick reply if you would like to review the requirements for an architecture diagram and milestone-based estimate. — ${firstName}`,
    `Let's set up a 15-minute discovery call to lock in the scope. Reply with two times that work and I'll send the meeting invite. — ${firstName}`,
  ];
  return variants[seed % variants.length];
}

// ════════════════════════════════════════════════════════════════════
// Timeline builder — sizes itself to the service count
// ════════════════════════════════════════════════════════════════════
function buildTimeline(services, isHourly) {
  const n = services.length || 2;
  // Rough heuristic — small (1-2 svc) = 1-2 wks, medium (3-5) = 3-4 wks, large (6+) = 5-6 wks
  const weeks = n <= 2 ? '1-2 weeks' : n <= 5 ? '3-4 weeks' : '5-6 weeks';
  const milestones = [
    'Discovery — confirm requirements, architecture, scope, cost assumptions, and acceptance checks',
    'Build — implement the agreed milestone and present test or validation evidence for review',
    'Handover — deliver approved code and documentation; production and support terms require separate confirmation',
  ];
  if (isHourly) {
    return `Initial planning estimate: ${weeks}, subject to confirmed scope and dependencies. Billing cadence and timesheet requirements must be agreed in the platform contract. Draft checkpoints:\n${milestones.map((m) => `• ${m}`).join('\n')}`;
  }
  return `Initial planning estimate: ${weeks} from kickoff, subject to confirmed scope, access, dependencies, and client review. Draft milestones:\n${milestones.map((m) => `• ${m}`).join('\n')}`;
}

// ════════════════════════════════════════════════════════════════════
// Main entry
// ════════════════════════════════════════════════════════════════════

/**
 * Generate a structured proposal.
 *
 * @param {Object}  opts
 * @param {string}  opts.jd          — raw job description
 * @param {Object}  opts.profile     — { name, ... } from AppContext
 * @param {number} [opts.seed=0]     — bump to get a different variant
 * @param {string} [opts.lengthMode] — 'normal' | 'short' | 'long'
 * @returns {{ sections: Section[], fullText: string, wordCount: number, analysis: Object, meta: Object }}
 */
export function generateSmartProposal({ jd, profile, seed = 0, lengthMode = 'normal' } = {}) {
  const analysis = analyzeJobDescription(jd) || {
    projectTitle: 'your AWS project',
    painPoint: 'the AWS work you described',
    services: [],
    level: 'Mid',
    isHourly: false,
    clientName: null,
  };

  const firstName = (profile?.name || 'David').split(' ')[0];
  const primaryService = analysis.services?.[0] || 'aws';

  // ──────── HOOK (1 sentence)
  const hook = pickHook(seed, analysis.painPoint, analysis.projectTitle, primaryService);

  // ──────── UNDERSTANDING ("I understand you need…")
  const understandingBits = [];
  understandingBits.push(`I understand you need ${shortPain(analysis.painPoint).toLowerCase()}`);
  if (analysis.services?.length) {
    understandingBits.push(`with a focus on ${analysis.services.slice(0, 3).map((s) => s.toUpperCase()).join(', ')}`);
  }
  if (analysis.budget) {
    understandingBits.push(`inside a ${analysis.budget.currency} ${analysis.budget.low.toLocaleString()}${analysis.budget.high ? `-${analysis.budget.high.toLocaleString()}` : ''} budget`);
  }
  if (analysis.level === 'Senior') understandingBits.push('and delivered to production-grade standards');
  const understanding = capitalise(understandingBits.join(' ')) + '.';

  // ──────── MY APPROACH (numbered, ordered network → security → storage → data → compute → integration → monitoring)
  const ordered = orderServicesForApproach(analysis.services);
  const approachSteps = ordered.length
    ? ordered.map((s) => APPROACH_PHRASES[s] || `Use ${s.toUpperCase()} where it fits the workload best`).slice(0, 6)
    : [
        'Start with a discovery call to lock down requirements and constraints',
        'Design the AWS architecture with cost, security, and reliability baked in',
        'Build it as infrastructure-as-code so it is fully reproducible',
        'Wire monitoring + alarms before go-live so we catch issues early',
      ];
  if (lengthMode === 'short') approachSteps.splice(3);  // cap at 3 steps when shortening
  if (lengthMode === 'long' && approachSteps.length < 6) {
    approachSteps.push('Wire CloudWatch dashboards + alarms so you know about problems before users do');
    approachSteps.push('Hand over runbooks + an architecture diagram so your team owns it after I leave');
  }
  const approach = approachSteps.map((s, i) => `${i + 1}. ${s}.`).join('\n');

  // ──────── WHY ME (process only; never invent credentials or client history)
  const whyMe = pickWhyMe(seed, primaryService);

  // ──────── TIMELINE
  const timeline = buildTimeline(analysis.services, analysis.isHourly);

  // ──────── CTA
  const cta = pickCta(seed, firstName);

  // ──────── Assemble
  const sections = [
    { id: 'hook',          label: 'Hook',          body: hook },
    { id: 'understanding', label: 'Understanding', body: understanding },
    { id: 'approach',      label: 'My Approach',   body: approach },
    { id: 'whyme',         label: 'Why Me',        body: whyMe },
    { id: 'timeline',      label: 'Timeline',      body: timeline },
    { id: 'cta',           label: 'Call To Action', body: cta },
  ];

  // Build full text in a clean, readable format (markdown-flavoured)
  const greeting = analysis.clientName ? `Hi ${analysis.clientName.split(' ')[0]},` : 'Hi there,';
  const fullText = [
    greeting,
    '',
    hook,
    '',
    `**Understanding the project**`,
    understanding,
    '',
    `**My approach**`,
    approach,
    '',
    `**Why me**`,
    whyMe,
    '',
    `**Timeline**`,
    timeline,
    '',
    cta,
  ].join('\n');

  // ──────── Length adjustment if outside the 200-350 target
  let finalText = fullText;
  const wc = wordCount(finalText);

  // If user asked for short and we're over 220, trim the timeline milestones
  if (lengthMode === 'short' && wc > 240) {
    finalText = finalText.replace(/\n• [^\n]+/g, ''); // strip bullet lines
  }
  // If user asked for long and we're under 320, add a Risk Mitigation paragraph
  if (lengthMode === 'long' && wc < 330) {
    const risk = `**Risk mitigation** — I deploy to a staging account first, you sign off, then we cut over to production. Every change is reversible because the stack is in code, and you keep the IAM admin keys at all times — I work with a scoped deployment role you can revoke instantly.`;
    finalText = finalText.replace(/\n\n\*\*Timeline\*\*/, `\n\n${risk}\n\n**Timeline**`);
  }

  return {
    sections,
    fullText: finalText,
    wordCount: wordCount(finalText),
    analysis,
    meta: {
      seed,
      lengthMode,
      claimPolicy: 'evidence-required',
      primaryService,
      firstName,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════

const APPROACH_ORDER = [
  'vpc', 'tgw', 'transit gateway', 'vpn', 'direct connect', 'route53', 'cloudfront',  // network/edge
  'iam', 'cognito',                                                                    // security/identity
  's3',                                                                                // storage
  'dynamodb', 'rds', 'aurora', 'redshift', 'glue', 'athena', 'kinesis',                // data
  'ec2', 'lambda', 'ecs', 'eks', 'fargate', 'sagemaker', 'bedrock',                    // compute
  'apigateway',                                                                        // integration
  'cloudwatch', 'cloudformation', 'terraform', 'codepipeline',                         // ops/observability
];

function orderServicesForApproach(svc) {
  if (!svc || !svc.length) return [];
  const seen = new Set();
  const out = [];
  for (const s of APPROACH_ORDER) {
    if (svc.includes(s) && !seen.has(s)) { out.push(s); seen.add(s); }
  }
  // Append any services we didn't have an order for, in original order
  for (const s of svc) {
    if (!seen.has(s)) { out.push(s); seen.add(s); }
  }
  return out;
}

export function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function endPunct(s) {
  const t = String(s || '').trim();
  if (!t) return '.';
  return /[.!?]$/.test(t) ? '' : '.';
}

function shortPain(s) {
  const t = String(s || '').trim().replace(/[.!?]+$/, '');
  if (t.length <= 100) return t;
  return t.slice(0, 100).replace(/\s\S*$/, '') + '…';
}

function capitalise(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
