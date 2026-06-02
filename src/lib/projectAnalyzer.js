/**
 * projectAnalyzer.js — the Master Intelligence engine.
 *
 * Takes any free-form input (job description, email, WhatsApp, brief)
 * and returns a complete structured analysis. Used by:
 *   • Job Analyzer
 *   • Portfolio Builder
 *   • Architecture Studio
 *   • Roadmap (when adding a custom task)
 *   • Project Builder wizard
 *   • Idea Studio
 *
 * The seven core rules from the user's instruction:
 *   1. NEVER substitute a requested service
 *   2. NEVER ask what's already answered
 *   3. Auto-detect everything
 *   4. Always suggest the senior-architect-grade thing
 *   5. Be strict with the requested architecture
 *   6. Free-tier intelligence (mapping + warnings)
 *   7. Smart enough for any project
 */

import { SERVICE_MATRIX, ALIAS_INDEX, freeTierMapping, tagOf } from '../data/awsServiceMatrix.js';
import { detectCompliance } from '../data/complianceRules.js';

// ─────────────────── project-type detector ───────────────────

const PROJECT_TYPES = [
  { id: 'web-app',           label: 'Web Application',           test: /\b(website|web\s*app|frontend|backend|node\.?js|python|react|api|rest|http|next\.?js|express|django|flask|laravel|spring)\b/i, suggest: ['ec2', 'lambda', 'apigw'] },
  { id: 'database',          label: 'Database-driven',           test: /\b(database|postgres(ql)?|mysql|mongodb|rds|dynamodb|data\s+storage|records|crud)\b/i, suggest: ['rds', 'dynamodb'] },
  { id: 'networking',        label: 'Networking Infrastructure', test: /\b(vpc|subnet|network|firewall|security\s+group|routing|connectivity|peering|transit\s+gateway|direct\s+connect|nat)\b/i, suggest: ['vpc', 'subnet', 'security-group'] },
  { id: 'serverless',        label: 'Serverless Architecture',   test: /\b(lambda|serverless|function|event[-\s]?driven|no\s+server|pay\s+per\s+request|step\s+functions)\b/i, suggest: ['lambda', 'apigw', 'dynamodb'] },
  { id: 'container',         label: 'Container Architecture',    test: /\b(docker|container|ecs|eks|kubernetes|k8s|fargate|microservice)\b/i, suggest: ['ecs', 'eks', 'ecr'] },
  { id: 'data-pipeline',     label: 'Data Engineering',          test: /\b(etl|pipeline|streaming|kinesis|glue|data\s+lake|analytics|redshift|emr|spark)\b/i, suggest: ['glue', 'athena', 's3', 'kinesis'] },
  { id: 'security',          label: 'Security & Compliance',     test: /\b(waf|security|compliance|pci[-\s]?dss|hipaa|gdpr|encryption|audit|cloudtrail|guardduty|kms)\b/i, suggest: ['cloudtrail', 'kms', 'guardduty'] },
  { id: 'devops',            label: 'DevOps / CI-CD',            test: /\b(ci\/?cd|pipeline|deployment|codedeploy|codepipeline|automation|gitops|terraform|cloudformation|cdk)\b/i, suggest: ['codepipeline', 'codebuild', 'codedeploy'] },
  { id: 'monitoring',        label: 'Monitoring & Observability',test: /\b(monitoring|alerts|cloudwatch|dashboard|metrics|logs|alarms|observability|x-ray)\b/i, suggest: ['cloudwatch', 'cloudwatch-logs', 'xray'] },
  { id: 'migration',         label: 'Migration Project',         test: /\b(migrate|migration|move\s+to\s+aws|on[-\s]?prem(ises)?|lift\s+and\s+shift|dms)\b/i, suggest: ['dms', 'sct'] },
  { id: 'ha',                label: 'High Availability',         test: /\b(high\s+availability|fault\s+toleran[ct]|multi[-\s]?az|disaster\s+recovery|rpo|rto|failover)\b/i, suggest: ['rds-multiaz', 'alb', 'ec2-autoscale'] },
  { id: 'cost-optimization', label: 'Cost Optimisation',         test: /\b(reduce\s+cost|optimi[sz]e\s+cost|cheaper|spot\s+instance|reserved|savings\s+plan)\b/i, suggest: ['lambda', 's3'] },
];

// ─────────────────── urgency detector ───────────────────

const URGENCY_RULES = [
  { level: 'critical', test: /\b(urgent|immediately|asap|emergency|crashed|lost\s+(money|customers|£|\$)|investors|critical|failed|down\s+(now|today)|production\s+down|fire)\b/i },
  { level: 'high',     test: /\b(deadline|this\s+week|by\s+(monday|tuesday|wednesday|thursday|friday)|next\s+\d+\s+days?|tight\s+timeline|launching)\b/i },
];

function detectUrgency(text) {
  for (const r of URGENCY_RULES) {
    if (r.test.test(text)) return r.level;
  }
  return 'normal';
}

// ─────────────────── region detector ───────────────────

const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1', 'eu-south-1',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1',
];

function detectRegion(text) {
  const lower = text.toLowerCase();
  for (const r of AWS_REGIONS) {
    if (lower.includes(r)) return r;
  }
  // Free-text region hints
  if (/\b(uk|britain|england|london|britain)\b/i.test(text)) return 'eu-west-2';
  if (/\b(ireland|dublin)\b/i.test(text)) return 'eu-west-1';
  if (/\b(germany|frankfurt)\b/i.test(text)) return 'eu-central-1';
  if (/\b(eu(rope)?|european)\b/i.test(text)) return 'eu-west-1';
  if (/\b(us|usa|united states|new york|virginia|california)\b/i.test(text)) return 'us-east-1';
  if (/\b(canada|toronto|montreal)\b/i.test(text)) return 'ca-central-1';
  if (/\b(india|mumbai|bangalore)\b/i.test(text)) return 'ap-south-1';
  return null;
}

// ─────────────────── budget + timeline ───────────────────

function detectBudget(text) {
  // Match: $1500, £850, 850 USD, $850 fixed, £3,200, $1,500/month, AWS under $150/month
  const fixed = text.match(/\b(?:[£$€]|usd\s*|eur\s*|gbp\s*)\s*([\d,]+)(?:\s*(?:fixed|total|budget))?/i);
  const monthly = text.match(/\b(?:[£$€]|usd\s*|eur\s*|gbp\s*)\s*([\d,]+)\s*\/?\s*(?:per\s+)?month/i);
  const currency = /£/.test(text) ? 'GBP' : /€/.test(text) ? 'EUR' : 'USD';
  const out = { currency };
  if (fixed) out.fixed = parseInt(fixed[1].replace(/,/g, ''), 10);
  if (monthly) out.monthly = parseInt(monthly[1].replace(/,/g, ''), 10);
  // "AWS under $150/month" pattern
  const awsBudget = text.match(/aws[^.]*?(?:under|below|less\s+than|max(?:imum)?)\s*[£$€]\s*([\d,]+)\s*\/?\s*month/i);
  if (awsBudget) out.awsMonthly = parseInt(awsBudget[1].replace(/,/g, ''), 10);
  return Object.keys(out).length > 1 ? out : null;
}

function detectTimeline(text) {
  const weeks = text.match(/\b(\d+)\s+week(s)?\b/i);
  const days = text.match(/\b(\d+)\s+days?\b/i);
  const months = text.match(/\b(\d+)\s+months?\b/i);
  if (weeks) return `${weeks[1]} week${weeks[2] || ''}`;
  if (days) return `${days[1]} days`;
  if (months) return `${months[1]} month${months[2] || ''}`;
  return null;
}

// ─────────────────── deployment-method detector ───────────────────

function detectDeploymentMethod(text) {
  const found = [];
  if (/\bterraform\b/i.test(text)) found.push('terraform');
  if (/\bcloudformation\b|\bcfn\b/i.test(text)) found.push('cloudformation');
  if (/\bcdk\b/i.test(text)) found.push('cdk');
  if (/\baws\s+cli\b|\bcli\s+commands?\b/i.test(text)) found.push('cli');
  if (/\bconsole\b/i.test(text)) found.push('console');
  if (!found.length) found.push('terraform'); // sensible default for client work
  return found;
}

// ─────────────────── service extractor ───────────────────

/**
 * Walk through aliases and collect every service ID mentioned in the text.
 * Also picks up tier-specific variants (e.g. t3.large, db.r5.large).
 */
function extractServices(text) {
  const lower = ` ${text.toLowerCase()} `;
  const found = new Set();
  for (const [alias, id] of ALIAS_INDEX.entries()) {
    // Word-boundary aware match
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (pattern.test(text)) found.add(id);
  }
  // Specific instance-type detection
  if (/\bt3\.large\b/i.test(text)) found.add('ec2-t3-large');
  if (/\bdb\.r5\.large\b/i.test(text)) found.add('rds-r5-large');
  if (/\bmulti[-\s]?az\b/i.test(text)) found.add('rds-multiaz');
  if (/\bnat\s+instance\b/i.test(text)) { found.add('nat-instance'); found.delete('nat-gateway'); }
  return [...found];
}

// ─────────────────── extracted facts (NEVER ask again) ───────────────────

/**
 * Build a list of facts the input ALREADY answered.
 * The "missing info" UI must never ask about anything on this list.
 */
function extractFacts(text, parsed) {
  const facts = {};
  // Region
  if (parsed.region) facts.region = parsed.region;
  // Budget
  if (parsed.budget?.fixed)   facts.fixedBudget = parsed.budget.fixed + ' ' + parsed.budget.currency;
  if (parsed.budget?.monthly) facts.monthlyBudget = parsed.budget.monthly + ' ' + parsed.budget.currency + '/mo';
  if (parsed.budget?.awsMonthly) facts.awsMonthlyCap = parsed.budget.awsMonthly + ' ' + parsed.budget.currency + '/mo on AWS';
  // Timeline
  if (parsed.timeline) facts.timeline = parsed.timeline;
  // Region-related compliance shortcuts (EU → GDPR)
  if (parsed.compliance?.length) facts.compliance = parsed.compliance.map((c) => c.label).join(', ');
  // Stack
  if (parsed.deploymentMethods?.length) facts.deploymentMethod = parsed.deploymentMethods.join(', ');
  // Project type
  if (parsed.projectTypes?.length) facts.projectType = parsed.projectTypes.map((p) => p.label).join(' + ');
  // Services
  if (parsed.services?.length) facts.servicesRequested = parsed.services.length + ' AWS services';
  // Specific networking spec
  const subnets = text.match(/(\d+)\s+subnets/i);
  if (subnets) facts.subnetCount = subnets[1];
  // Cidrs
  const cidrs = [...text.matchAll(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})\b/g)].map((m) => m[1]);
  if (cidrs.length) facts.cidrBlocks = cidrs.join(', ');
  // AZ count
  const azs = text.match(/\b([a-z]{2}-[a-z]+-\d+[a-z](?:\s+and\s+[a-z]{2}-[a-z]+-\d+[a-z])+)\b/i);
  if (azs) facts.availabilityZones = azs[1];
  // Client name (capitalised company name in the first paragraph)
  const clientMatch = text.match(/\b(?:we\s+are|i\s+work\s+(?:for|at)|client(?:\s+is)?:?)\s+([A-Z][A-Za-z\s.]{2,30})/);
  if (clientMatch) facts.client = clientMatch[1].trim();
  // Deliverables list
  const deliverables = text.match(/deliverables?:\s*([^.]+)/i);
  if (deliverables) facts.deliverables = deliverables[1].trim();
  return facts;
}

// ─────────────────── smart missing-info questions ───────────────────

/**
 * Generate AT MOST 3 questions about info the analyser couldn't extract.
 * Returns [] if everything is already answered.
 */
function missingQuestions(text, parsed, facts) {
  const Q = [];
  const has = (k) => facts[k] != null;

  // Region
  if (!has('region') && parsed.services?.length) {
    Q.push('Which AWS region — UK/EU (eu-west-1/2), US (us-east-1) or somewhere else?');
  }

  // Budget — only ask if monetary terms aren\'t already there
  if (!has('fixedBudget') && !has('monthlyBudget') && !has('awsMonthlyCap')) {
    Q.push('Budget — fixed project fee, monthly AWS cap, or both?');
  }

  // Timeline
  if (!has('timeline')) {
    Q.push('Timeline — when does this need to be live?');
  }

  // Compute model (only if not detected)
  const explicitCompute = parsed.services.some((s) => ['ec2', 'lambda', 'ecs', 'eks', 'beanstalk', 'ec2-t3-large'].includes(s.id));
  if (!explicitCompute && parsed.projectTypes.some((p) => p.id === 'web-app')) {
    Q.push('Compute model — EC2 (full control) or Lambda (serverless)?');
  }

  // Database (only if not detected and project clearly needs one)
  const explicitDb = parsed.services.some((s) => ['rds', 'dynamodb', 'aurora', 'redshift', 'elasticache'].includes(s.id));
  const needsDb = parsed.projectTypes.some((p) => ['web-app', 'database', 'serverless'].includes(p.id));
  if (!explicitDb && needsDb && Q.length < 3) {
    Q.push('Database — relational (RDS Postgres/MySQL) or NoSQL (DynamoDB)?');
  }

  // Domain
  if (!/\b(?:custom\s+domain|domain\s+name|\.(?:com|co\.uk|io|net|org)|\w+\.\w+)\b/i.test(text) && Q.length < 3) {
    if (parsed.projectTypes.some((p) => ['web-app'].includes(p.id))) {
      Q.push('Custom domain — do they already have one (Route 53 or external registrar)?');
    }
  }

  return Q.slice(0, 3);
}

// ─────────────────── match-score for portfolio fit ───────────────────

/**
 * Score how well this job matches a "networking-strong AWS engineer" profile.
 * Used for the "Match score" badge in the Job Analyzer.
 */
function matchScore(parsed) {
  let score = 50;
  const reasons = [];
  if (parsed.projectTypes.some((p) => p.id === 'networking')) { score += 25; reasons.push('Networking — your strength'); }
  if (parsed.projectTypes.some((p) => p.id === 'security'))   { score += 10; reasons.push('Security covered by your training'); }
  if (parsed.projectTypes.some((p) => p.id === 'devops'))     { score += 10; reasons.push('DevOps in your portfolio'); }
  if (parsed.compliance.length)                                { score += 5;  reasons.push(`Compliance: ${parsed.compliance.map((c) => c.label).join(', ')}`); }
  if (parsed.deploymentMethods.includes('terraform'))          { score += 5;  reasons.push('Terraform — you have hands-on'); }
  if (parsed.urgency === 'critical')                           { score += 5;  reasons.push('Urgent jobs pay premium'); }
  return { score: Math.min(99, score), reasons };
}

// ─────────────────── recommended approach ───────────────────

function recommendedApproach(parsed) {
  const lines = [];
  // Pick the dominant deployment method
  const method = parsed.deploymentMethods[0] || 'terraform';
  lines.push({ heading: 'Method', body: `${method.toUpperCase()} — ${parsed.deploymentMethods.includes('terraform') ? 'requested in brief' : 'sensible default for client deliverable'}` });

  // Build a high-level plan
  const stages = [];
  if (parsed.services.some((s) => s.category === 'network')) stages.push('Provision VPC, subnets, IGW, route tables, security groups');
  if (parsed.services.some((s) => s.category === 'database'))   stages.push('Stand up databases with encryption + backups');
  if (parsed.services.some((s) => s.category === 'compute'))    stages.push('Deploy compute (EC2 / Lambda / ECS) with IAM roles');
  if (parsed.services.some((s) => s.category === 'security'))   stages.push('Layer security (WAF / KMS / Secrets Manager / CloudTrail)');
  if (parsed.services.some((s) => s.category === 'monitoring')) stages.push('Wire CloudWatch dashboards + alarms');
  if (parsed.services.some((s) => s.category === 'devops'))     stages.push('Set up CI/CD pipeline + automated deploys');
  stages.push('Smoke-test in test account → handover to client');
  lines.push({ heading: 'Plan', body: stages });

  // Timeline breakdown
  if (parsed.timeline) {
    lines.push({ heading: 'Timeline', body: `Total: ${parsed.timeline}. Suggested split: 30% setup, 50% build, 20% test & handover.` });
  }
  return lines;
}

// ─────────────────── multi-region check ───────────────────

function multiRegionWarning(parsed, contextRegions = []) {
  if (!parsed.region) return null;
  const other = contextRegions.filter((r) => r && r !== parsed.region);
  if (!other.length) return null;
  return {
    detected: parsed.region,
    existing: other,
    message: `You already have resources in ${other.join(', ')}. Deploying to ${parsed.region} too will share your 750hr Free Tier across both — you\'ll burn through it twice as fast.`,
    recommendation: `Use ${other[0]} for testing (where your existing resources live) and reserve ${parsed.region} for client deployment.`,
  };
}

// ─────────────────── main entry ───────────────────

/**
 * Run the full Master Intelligence analysis on a free-text input.
 *
 * Returns:
 *   {
 *     summary, client, urgency, region, budget, timeline,
 *     compliance[], projectTypes[], services[], facts{},
 *     missingQuestions[], matchScore{}, approach[],
 *     freeTierTable[], testDeployment{}, clientScripts{ recommendation },
 *     multiRegion?, considerations[], confidence,
 *     answeredAt
 *   }
 */
export function analyseProject(text, options = {}) {
  const q = (text || '').trim();
  if (!q) {
    return {
      summary: 'Tell me about the job or project — paste the description, an email, even a WhatsApp.',
      missingQuestions: ['What does the client need built?', 'What\'s their budget + timeline?', 'What region?'],
      confidence: 0,
      answeredAt: new Date().toISOString(),
    };
  }

  // Detect everything
  const compliance     = detectCompliance(q);
  const projectTypes   = PROJECT_TYPES.filter((p) => p.test.test(q));
  const urgency        = detectUrgency(q);
  const region         = detectRegion(q);
  const budget         = detectBudget(q);
  const timeline       = detectTimeline(q);
  const deploymentMethods = detectDeploymentMethod(q);

  // Extract services (NEVER substitute)
  const serviceIds = new Set(extractServices(q));
  // Compliance-driven additions (never replaces)
  for (const c of compliance) for (const sid of c.addServices) serviceIds.add(sid);
  // Project-type-driven suggestions (only if NOTHING was specified at all)
  if (!serviceIds.size) for (const p of projectTypes) for (const sid of p.suggest) serviceIds.add(sid);

  const services = [...serviceIds].map((id) => SERVICE_MATRIX[id]).filter(Boolean);

  const parsed = {
    compliance, projectTypes, urgency, region, budget, timeline, deploymentMethods, services,
  };

  const facts = extractFacts(q, parsed);
  const missing = missingQuestions(q, parsed, facts);
  const ms = matchScore(parsed);

  const freeTierTable = freeTierMapping(services);
  const totalTestCost = estimateTestCost(freeTierTable);

  const result = {
    summary: buildSummary(parsed, facts),
    client: facts.client || null,
    urgency,
    region,
    budget,
    timeline,
    deploymentMethods,
    compliance: compliance.map((c) => ({ id: c.id, label: c.label })),
    considerations: compliance.flatMap((c) => c.considerations || []),
    projectTypes: projectTypes.map((p) => ({ id: p.id, label: p.label })),
    services: services.map((s) => ({ ...s, tag: tagOf(s) })),
    facts,
    missingQuestions: missing,
    matchScore: ms,
    approach: recommendedApproach(parsed),
    freeTierTable,
    testDeployment: {
      summary: `Test deployment on YOUR account — ${freeTierTable.length} resources, total cost ≈ ${totalTestCost}.`,
      autoDestroyHours: parsed.services.some((s) => s.freeTier === 'costs-money') ? 4 : 24,
      cost: totalTestCost,
    },
    clientScripts: {
      recommendation: `Use ${deploymentMethods[0]?.toUpperCase() || 'TERRAFORM'} for client deliverable. Generate complete code for all ${services.length} services with the EXACT specs requested (no free-tier substitutions for the client).`,
      methods: deploymentMethods,
    },
    multiRegion: multiRegionWarning(parsed, options.knownRegions || []),
    confidence: services.length ? Math.min(0.97, 0.5 + Math.min(0.4, services.length * 0.04) + (compliance.length ? 0.05 : 0) + (region ? 0.05 : 0)) : 0.3,
    answeredAt: new Date().toISOString(),
  };

  return result;
}

function buildSummary(parsed, facts) {
  const bits = [];
  if (facts.client) bits.push(facts.client);
  if (parsed.urgency === 'critical') bits.push('🔴 URGENT');
  else if (parsed.urgency === 'high') bits.push('🟠 High priority');
  if (parsed.projectTypes.length) bits.push(parsed.projectTypes.map((p) => p.label).join(' + '));
  if (parsed.region) bits.push(`region ${parsed.region}`);
  if (parsed.compliance.length) bits.push(parsed.compliance.map((c) => c.label).join(' + '));
  if (parsed.services.length) bits.push(`${parsed.services.length} AWS services`);
  return bits.join(' · ') || 'AWS project detected';
}

function estimateTestCost(table) {
  let usd = 0;
  for (const row of table) {
    const m = row.cost?.match(/\$([\d.]+)/);
    if (m) usd += parseFloat(m[1]);
  }
  return usd === 0 ? '$0 (all free)' : `~$${usd.toFixed(2)}`;
}

// ─────────────────── multi-region detector (standalone) ───────────────────

/**
 * Exposed separately so any deployment screen can call it directly.
 */
export { multiRegionWarning };
