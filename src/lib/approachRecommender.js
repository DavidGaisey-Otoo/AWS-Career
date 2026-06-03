/**
 * approachRecommender.js — FR-04
 *
 * Pure engine that recommends the best AWS deployment approach for a
 * given gig / project description.
 *
 * Four options, mutually exclusive:
 *   - console  — best for one-time setups, non-technical clients, small projects
 *   - cli      — best for automation, scripting, repeatable tasks
 *   - terraform — best for IaC, multi-environment, professional clients (the
 *                  default-leaning option for freelance work)
 *   - cfn      — best for AWS-native clients, CDK/SAM users
 *
 * The engine scores each option by counting keyword hits in the brief,
 * then applies a small Terraform bias (since the user said this is the
 * most appropriate default for freelance projects).
 *
 * Returns:
 *   {
 *     recommended: 'terraform',         // id of the winning option
 *     options: [{ id, label, blurb, score, hits[] }, ...],
 *     rationale: '2 sentence explanation',
 *     keywords: { matched: ['terraform', 'IaC'], ... }
 *   }
 */

// ════════════════════════════════════════════════════════════════════
// Option catalogue
// ════════════════════════════════════════════════════════════════════
export const APPROACH_OPTIONS = [
  {
    id: 'console',
    label: 'Console',
    short: 'AWS Console',
    blurb: 'Best for one-time setups, non-technical clients, and small projects.',
    fullBlurb: 'Click-by-click guided setup in the AWS Management Console. Easy for the client to verify visually, but not easily reproducible across environments.',
    icon: 'monitor',
    tone: 'sky',
  },
  {
    id: 'cli',
    label: 'CLI',
    short: 'AWS CLI',
    blurb: 'Best for automation, scripting, and repeatable tasks.',
    fullBlurb: 'Bash scripts using the AWS CLI v2. Lighter than full IaC, easy to wire into CI, great when the client already has runbooks they want to extend.',
    icon: 'terminal',
    tone: 'amber',
  },
  {
    id: 'terraform',
    label: 'Terraform',
    short: 'Terraform IaC',
    blurb: 'Best for infrastructure-as-code, multi-environment, professional clients.',
    fullBlurb: 'HCL modules with state stored in S3 + DynamoDB lock. Tool-of-choice for serious freelance work — multi-cloud-friendly, plan/apply gives the client confidence, easy code-review.',
    icon: 'layers',
    tone: 'orange',
    isFreelanceDefault: true,
  },
  {
    id: 'cfn',
    label: 'CloudFormation',
    short: 'CloudFormation / CDK',
    blurb: 'Best for AWS-native clients, CDK/SAM users.',
    fullBlurb: 'AWS-native IaC in YAML or via CDK/SAM. The right pick when the client already runs on CFN, has IAM that grants the cloudformation:* service, or uses SAM for serverless.',
    icon: 'cloud',
    tone: 'violet',
  },
];

// ════════════════════════════════════════════════════════════════════
// Keyword tables — multi-word phrases listed before single words so they
// score first. Each match adds `weight` to that option's score.
// ════════════════════════════════════════════════════════════════════
const KEYWORDS = {
  terraform: [
    { phrase: 'infrastructure as code', weight: 3 },
    { phrase: 'infrastructure-as-code', weight: 3 },
    { phrase: 'iac',                    weight: 3 },
    { phrase: 'terraform',              weight: 4 },
    { phrase: 'terragrunt',             weight: 3 },
    { phrase: 'multi-environment',      weight: 2 },
    { phrase: 'multi environment',      weight: 2 },
    { phrase: 'multi-account',          weight: 2 },
    { phrase: 'reproducible',           weight: 1 },
    { phrase: 'state file',             weight: 2 },
    { phrase: 'plan and apply',         weight: 2 },
    { phrase: 'professional',           weight: 1 },
    { phrase: 'production grade',       weight: 1 },
    { phrase: 'production-grade',       weight: 1 },
    { phrase: 'multi-cloud',            weight: 2 },
    { phrase: 'gitops',                 weight: 2 },
  ],
  cli: [
    { phrase: 'automate',               weight: 2 },
    { phrase: 'automation',             weight: 2 },
    { phrase: 'script',                 weight: 2 },
    { phrase: 'shell script',           weight: 3 },
    { phrase: 'bash',                   weight: 2 },
    { phrase: 'ci/cd',                  weight: 3 },
    { phrase: 'ci cd',                  weight: 3 },
    { phrase: 'pipeline',               weight: 1 },
    { phrase: 'github actions',         weight: 2 },
    { phrase: 'gitlab ci',              weight: 2 },
    { phrase: 'cron',                   weight: 1 },
    { phrase: 'aws cli',                weight: 3 },
    { phrase: 'cli',                    weight: 1 },
    { phrase: 'jenkins',                weight: 2 },
    { phrase: 'runbook',                weight: 1 },
  ],
  console: [
    { phrase: 'quick setup',            weight: 3 },
    { phrase: 'one time',               weight: 3 },
    { phrase: 'one-time',               weight: 3 },
    { phrase: 'one off',                weight: 2 },
    { phrase: 'one-off',                weight: 2 },
    { phrase: 'point and click',        weight: 3 },
    { phrase: 'point-and-click',        weight: 3 },
    { phrase: 'small project',          weight: 2 },
    { phrase: 'simple',                 weight: 1 },
    { phrase: 'walk me through',        weight: 2 },
    { phrase: 'help me set up',         weight: 2 },
    { phrase: 'no code',                weight: 2 },
    { phrase: 'no-code',                weight: 2 },
    { phrase: 'non technical',          weight: 3 },
    { phrase: 'non-technical',          weight: 3 },
    { phrase: 'demo',                   weight: 1 },
    { phrase: 'proof of concept',       weight: 1 },
    { phrase: 'poc',                    weight: 1 },
  ],
  cfn: [
    { phrase: 'aws native',             weight: 3 },
    { phrase: 'aws-native',             weight: 3 },
    { phrase: 'cloudformation',         weight: 4 },
    { phrase: 'cfn',                    weight: 3 },
    { phrase: 'sam ',                   weight: 3 }, // trailing space to avoid matching "same"
    { phrase: 'serverless application model', weight: 3 },
    { phrase: 'cdk',                    weight: 4 },
    { phrase: 'aws cdk',                weight: 4 },
    { phrase: 'stackset',               weight: 3 },
    { phrase: 'stack set',              weight: 3 },
    { phrase: 'aws::',                  weight: 2 },
  ],
};

// ════════════════════════════════════════════════════════════════════
// Service hints — some services bias toward a specific approach.
// e.g. CDK projects almost always mean CFN, EKS often means Terraform.
// ════════════════════════════════════════════════════════════════════
const SERVICE_BIAS = {
  eks:        { terraform: 2 },
  kubernetes: { terraform: 2 },
  helm:       { terraform: 1 },
  ecs:        { terraform: 1 },
  fargate:    { terraform: 1 },
  apigateway: { cfn: 1, terraform: 1 },
  cognito:    { terraform: 1 },
  sagemaker:  { console: 1, cli: 1 },
  bedrock:    { console: 1 },
  s3:         { cli: 1 },  // common one-off, e.g. "upload to S3"
  iam:        { terraform: 1, cfn: 1 },
};

// ════════════════════════════════════════════════════════════════════
// Main entry
// ════════════════════════════════════════════════════════════════════

/**
 * @param {Object}   opts
 * @param {string}   opts.brief        — raw job/project description
 * @param {string[]} [opts.services]   — detected service ids (lowercase)
 * @param {boolean}  [opts.freelance=true] — apply the small Terraform bias
 * @returns {{ recommended: string, options: Array, rationale: string, keywords: Object }}
 */
export function recommendApproach({ brief = '', services = [], freelance = true } = {}) {
  const text = String(brief || '').toLowerCase();
  const matched = { console: [], cli: [], terraform: [], cfn: [] };
  const scores  = { console: 0, cli: 0, terraform: 0, cfn: 0 };

  // 1) Keyword scan
  for (const [id, kwList] of Object.entries(KEYWORDS)) {
    for (const { phrase, weight } of kwList) {
      if (text.includes(phrase)) {
        scores[id] += weight;
        matched[id].push(phrase);
      }
    }
  }

  // 2) Service bias
  for (const svc of services || []) {
    const bias = SERVICE_BIAS[svc?.toLowerCase()];
    if (bias) {
      for (const [id, w] of Object.entries(bias)) scores[id] += w;
    }
  }

  // 3) Freelance default — Terraform gets a 1-point baseline boost so
  //    that ties resolve in its favour for freelance contexts. Configurable.
  if (freelance) scores.terraform += 1;

  // 4) Pick winner — highest score; if all 0, fall back to Terraform
  let winnerId = 'terraform';
  let winnerScore = scores.terraform;
  for (const id of Object.keys(scores)) {
    if (scores[id] > winnerScore) {
      winnerScore = scores[id];
      winnerId = id;
    }
  }
  // If literally nothing matched anywhere AND we're not in freelance mode,
  // default to Console (safer for non-technical projects)
  if (winnerScore === 0 && !freelance) winnerId = 'console';

  // 5) Build rationale (2 sentences)
  const rationale = buildRationale(winnerId, matched, services, freelance);

  // 6) Decorate options with scores + hits
  const options = APPROACH_OPTIONS.map((o) => ({
    ...o,
    score: scores[o.id],
    hits: matched[o.id],
    recommended: o.id === winnerId,
  }));

  return {
    recommended: winnerId,
    options,
    rationale,
    keywords: matched,
  };
}

// ════════════════════════════════════════════════════════════════════
// Rationale builder — 2 sentences, specific to what was matched
// ════════════════════════════════════════════════════════════════════
function buildRationale(winnerId, matched, services, freelance) {
  const opt = APPROACH_OPTIONS.find((o) => o.id === winnerId);
  const hits = matched[winnerId] || [];

  // Sentence 1 — why this one?
  let s1;
  if (hits.length > 0) {
    const quoted = hits.slice(0, 2).map((h) => `"${h}"`).join(' + ');
    s1 = `Picked ${opt.label} because the brief mentions ${quoted}.`;
  } else if (winnerId === 'terraform' && freelance) {
    s1 = `Defaulting to Terraform — it is the safest choice for freelance AWS work because the client gets a reproducible, code-reviewable stack they can hand to a future team.`;
  } else if (winnerId === 'console' && services.length === 0) {
    s1 = `Picked Console because no specific delivery method or services were called out — easiest for the client to follow visually.`;
  } else {
    s1 = `Picked ${opt.label} as the best fit for the work described.`;
  }

  // Sentence 2 — what does it give them?
  const s2Map = {
    console:   'You will deliver click-by-click instructions with screenshots, perfect when the client wants to verify each step themselves.',
    cli:       'You will deliver bash scripts using the AWS CLI v2 — fast to run, easy to drop into CI, and lightweight to hand over.',
    terraform: 'You will deliver HCL modules with remote state and plan/apply review — the client gets a stack they can drop into Git and reuse across dev/staging/prod.',
    cfn:       'You will deliver CloudFormation templates (or CDK) — pure AWS-native, drift-detected, and uses the cloudformation:* permissions the client already grants.',
  };

  return `${s1} ${s2Map[winnerId]}`;
}

// ════════════════════════════════════════════════════════════════════
// Helper — get one option by id (handy in UI for highlighting)
// ════════════════════════════════════════════════════════════════════
export function getApproachById(id) {
  return APPROACH_OPTIONS.find((o) => o.id === id) || APPROACH_OPTIONS[2]; // default to terraform
}
