/**
 * gigSolutionPipeline.js — GIG-01 "gig in, solution out".
 *
 * ════════════════════════════════════════════════════════════════════
 * WHAT THIS IS
 * ════════════════════════════════════════════════════════════════════
 * You see a gig. You press one button. This module turns that gig into
 * a complete, reviewed, deployable AWS solution — without you needing
 * to know which services to pick, what to call the stack, which of the
 * four deployment approaches to use, or whether the design is any good.
 *
 * It is an ORCHESTRATOR, not a new brain. Every stage delegates to an
 * engine that already existed and was already tested:
 *
 *   1. UNDERSTAND  → projectAnalyzer.analyseProject  (Master Intelligence)
 *                  + briefExtractor.extractFromBrief (name/timeline/stack)
 *                  + serviceSuggester.suggestServices (AD-02)
 *                  + regionSuggester.suggestRegion    (AD-01)
 *   2. BLUEPRINT   → ranks data/projects.js against the detected services
 *   3. NAME        → derives project/stack/bucket/repo names + tags
 *   4. APPROACH    → approachRecommender.recommendApproach (FR-04)
 *   5. GENERATE    → scriptGenerator {terraform,cfn,cli} + a delivery plan
 *   6. REVIEW      → expertAgents.runExpertReview (10 architects)
 *                  + deployAgents.runDeployReview (pre-flight + blast radius)
 *   7. DEPLOY      → hands a ready CFN template to cfnDeployer (one click)
 *   8. TEARDOWN    → same stack name → cfnDeployer.deleteStack (one click)
 *
 * Everything is synchronous + deterministic: the same gig always produces
 * the same solution, so the UI can re-run it freely and diff nothing.
 *
 * ════════════════════════════════════════════════════════════════════
 * SAFETY
 * ════════════════════════════════════════════════════════════════════
 * This module NEVER touches AWS and NEVER sees credentials. It only
 * produces text (templates, plans, names). Actually calling AWS is the
 * caller's job via cfnDeployer, which enforces its own security model.
 *
 * The `verdict` field is the safety gate the UI must respect:
 *   'ready'      → no critical/high findings; one-click deploy is offered
 *   'fix-first'  → critical or high findings exist; deploy stays behind a
 *                  confirmation that lists what's wrong
 *   'blocked'    → we could not produce a deployable template at all
 */

import { analyseProject } from './projectAnalyzer.js';
import { extractFromBrief } from './briefExtractor.js';
import { suggestServices } from './serviceSuggester.js';
import { suggestRegion } from './regionSuggester.js';
import { recommendApproach, getApproachById, APPROACH_OPTIONS } from './approachRecommender.js';
import { generateTerraform, generateCloudFormation, generateCli } from './scriptGenerator.js';
import { runExpertReview } from './expertAgents/master.js';
import { runDeployReview } from './deployAgents/master.js';
import { upsertSolution } from './solutionStore.js';
import { PROJECTS } from '../data/projects.js';

// ════════════════════════════════════════════════════════════════════
// STAGE 1 — UNDERSTAND
// ════════════════════════════════════════════════════════════════════

/**
 * Fold a gig object (or raw text) into a single brief string that every
 * downstream detector can read.
 */
export function gigToBrief(gig) {
  if (typeof gig === 'string') return gig.trim();
  if (!gig) return '';
  return [
    gig.title,
    gig.company ? `Client: ${gig.company}` : '',
    gig.budget ? `Budget: ${gig.budget}` : '',
    gig.location ? `Location: ${gig.location}` : '',
    gig.description,
    (gig.skills || []).length ? `Skills: ${gig.skills.join(', ')}` : '',
  ].filter(Boolean).join('\n');
}

function understand(brief, options) {
  const analysis  = analyseProject(brief, { knownRegions: options.knownRegions || [] });
  const extracted = extractFromBrief(brief);
  const suggested = suggestServices(brief);
  const region    = suggestRegion({
    brief,
    // extractClientLocation returns { audience, label } — suggestRegion
    // wants the audience id alone. Passing the object silently defeats
    // detection and everything lands in us-east-1.
    audience: extracted.clientLocation?.audience || null,
    compliance: (analysis.compliance || []).map((c) => c.id),
  });

  return {
    analysis,
    extracted,
    suggested,
    region,
    // The service list the rest of the pipeline builds on. analyseProject
    // returns fully-resolved SERVICE_MATRIX entries, which is exactly what
    // scriptGenerator expects — so it is the source of truth here.
    services: analysis.services || [],
    compliance: analysis.compliance || [],
    confidence: analysis.confidence || 0,
  };
}

// ════════════════════════════════════════════════════════════════════
// STAGE 2 — BLUEPRINT MATCH
// ════════════════════════════════════════════════════════════════════

/**
 * Rank the 8 portfolio blueprints against the detected services.
 *
 * Score = overlap between blueprint services and detected services,
 * normalised so a 3-service blueprint isn't beaten purely on size, plus a
 * small bonus when the brief text mentions the blueprint's own keywords.
 */
export function matchBlueprints(brief, services) {
  const detected = new Set(services.map((s) => normaliseServiceId(s.id || s)));
  const text = String(brief || '').toLowerCase();

  const ranked = PROJECTS.map((p) => {
    const bp = new Set((p.services || []).map(normaliseServiceId));
    const overlap = [...bp].filter((id) => detected.has(id));
    const coverage = bp.size ? overlap.length / bp.size : 0;      // how much of the blueprint we need
    const relevance = detected.size ? overlap.length / detected.size : 0; // how much of the need it covers

    // Keyword bonus — blueprint title words appearing in the brief
    const titleWords = p.title.toLowerCase().split(/\W+/).filter((w) => w.length > 4);
    const keywordHits = titleWords.filter((w) => text.includes(w));

    const score = Math.round(
      (coverage * 45) + (relevance * 45) + Math.min(10, keywordHits.length * 5)
    );

    const why = [];
    if (overlap.length) why.push(`Shares ${overlap.length} service${overlap.length > 1 ? 's' : ''}: ${overlap.join(', ')}`);
    if (keywordHits.length) why.push(`Brief mentions "${keywordHits[0]}"`);
    if (coverage === 1) why.push('Covers every service this blueprint needs');

    return { project: p, score, overlap, coverage, relevance, why };
  }).sort((a, b) => b.score - a.score);

  const best = ranked[0];
  // Below 30 the "match" is noise — better to admit it's a custom build.
  const isCustom = !best || best.score < 30;

  return { ranked: ranked.slice(0, 4), best: isCustom ? null : best, isCustom };
}

/** projects.js and awsServiceMatrix use slightly different ids in places. */
function normaliseServiceId(id) {
  const map = {
    apigateway: 'apigw',
    'api-gateway': 'apigw',
    secretsmgr: 'secrets-manager',
    sg: 'security-group',
    asg: 'ec2-autoscale',
  };
  const key = String(id || '').toLowerCase();
  return map[key] || key;
}

// ════════════════════════════════════════════════════════════════════
// STAGE 3 — NAMING
// ════════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'for', 'and', 'with', 'to', 'of', 'on', 'in', 'we', 'our',
  'need', 'needed', 'want', 'looking', 'seeking', 'urgent', 'asap', 'remote',
  'senior', 'junior', 'lead', 'contract', 'freelance', 'developer', 'engineer',
  'consultant', 'expert', 'specialist', 'hire', 'hiring', 'help', 'build',
]);

/**
 * Derive every name the user would otherwise have to invent: a human
 * project name, a CFN-legal stack name, an S3-legal bucket prefix, a repo
 * slug, and the tag set that goes on every deployed resource.
 */
export function deriveNames(brief, { extracted, blueprint, services }) {
  // Prefer the blueprint's proven title, else a cleaned-up version of the
  // extracted name, else build one from the strongest service + a keyword.
  let human = cleanJobTitle(extracted?.projectName || '');
  if (human.length > 60 || human.length < 6) human = '';

  if (!human && blueprint) human = blueprint.project.title;

  if (!human) {
    const keyword = firstMeaningfulWord(brief);
    const lead = services[0]?.label || 'AWS';
    human = keyword ? `${titleCase(keyword)} ${lead} Solution` : `${lead} Solution`;
  }

  const slug = toSlug(human);
  // Drop filler words before truncating so the short name keeps the
  // meaningful part ("ecommerce-platform-migration", not "aws-architect-for-e").
  const meaningful = slug.split('-').filter((w) => w && !STOP_WORDS.has(w) && w.length > 1);
  const short = (meaningful.length ? meaningful : slug.split('-'))
    .slice(0, 4).join('-') || 'aws-project';
  // CFN stack names: letters/digits/hyphens, must start with a letter, <=128
  const stackName = `${short}`.replace(/^[^a-z]/, 'a').slice(0, 100);
  // S3 buckets: lowercase, no underscores, globally unique → suffix added at deploy
  const bucketPrefix = short.replace(/[^a-z0-9-]/g, '').slice(0, 40);

  return {
    projectName: human,
    slug,
    stackName,
    bucketPrefix,
    repoName: short,
    tags: {
      Project: human.slice(0, 60),
      ManagedBy: 'AWS-Career-Launchpad-Pro',
      Environment: 'dev',
    },
  };
}

/**
 * Job posts are titled for hiring, not for the thing being built:
 * "Senior AWS Architect needed for e-commerce migration" describes a
 * PERSON. Strip the hiring language so what's left names the PROJECT.
 */
function cleanJobTitle(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';

  // Leading role phrases up to a "for/to" pivot
  s = s.replace(
    /^(?:senior|junior|lead|principal|staff|freelance|contract|remote|part[- ]time|full[- ]time)?\s*(?:aws|cloud|devops|solutions?)?\s*(?:architect|engineer|developer|consultant|specialist|expert|admin(?:istrator)?)\s+(?:needed|wanted|required)?\s*(?:for|to)\s+/i,
    ''
  );
  // "Looking for someone to build X" / "We need X"
  s = s.replace(/^(?:looking for|seeking|hiring|we (?:need|want|require)|i (?:need|want|require))\s+(?:an?|the|someone to)?\s*/i, '');
  // Trailing hiring noise
  s = s.replace(/\s*[-—–|(]?\s*(?:urgent|asap|remote|contract|freelance|part[- ]time|full[- ]time|\d+\s*(?:hrs?|hours?)\/wk)\b.*$/i, '');
  s = s.replace(/\s+(?:needed|wanted|required|position|role|job|opportunity|vacancy)\s*$/i, '');
  s = s.replace(/^[\s\-—–:|]+|[\s\-—–:|,.]+$/g, '');

  // If stripping ate everything meaningful, fall back to the original
  if (s.split(/\s+/).filter(Boolean).length < 2) return String(raw || '').trim();
  return titleCase(s);
}

function firstMeaningfulWord(brief) {
  const words = String(brief || '').toLowerCase().split(/\W+/);
  return words.find((w) => w.length > 3 && !STOP_WORDS.has(w)) || '';
}

function titleCase(s) {
  return String(s).replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSlug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'aws-project';
}

// ════════════════════════════════════════════════════════════════════
// STAGE 5 — DELIVERY PLAN
// ════════════════════════════════════════════════════════════════════

/**
 * A phase-by-phase delivery plan the user can hand to a client or follow
 * themselves. Built from the blueprint's own build steps when one matched,
 * else synthesised from the detected services.
 */
export function buildDeliveryPlan({ blueprint, services, approach, timeline, names }) {
  const phases = [];

  phases.push({
    id: 'phase-discovery',
    title: 'Discovery + access',
    durationLabel: '0.5 day',
    tasks: [
      'Confirm scope, success criteria, and who signs off',
      'Get AWS account access (or agree you deploy into your own and hand over)',
      'Agree the region and any data-residency constraints',
      'Confirm budget ceiling and set a billing alarm on day one',
    ],
  });

  if (blueprint) {
    for (const step of (blueprint.project.buildSteps || [])) {
      phases.push({
        id: step.id,
        title: step.title,
        durationLabel: null,
        tasks: (step.subs || []).map((s) => s.title || s),
        fromBlueprint: true,
      });
    }
  } else {
    // Custom build — group services into a sensible order
    const groups = [
      { title: 'Networking + security foundation', match: ['vpc', 'subnet', 'igw', 'nat-gateway', 'nat-instance', 'security-group', 'iam', 'kms', 'acm'] },
      { title: 'Data layer',                       match: ['s3', 'rds', 'rds-multiaz', 'dynamodb', 'elasticache'] },
      { title: 'Compute + application',            match: ['ec2', 'ec2-autoscale', 'lambda', 'ecs', 'eks', 'alb', 'apigw'] },
      { title: 'Delivery + edge',                  match: ['cloudfront', 'route53', 'waf'] },
      { title: 'Observability + operations',       match: ['cloudwatch', 'cloudwatch-logs', 'cloudtrail', 'sns', 'secrets-manager', 'ssm-parameter'] },
    ];
    for (const g of groups) {
      const inGroup = services.filter((s) => g.match.includes(normaliseServiceId(s.id)));
      if (!inGroup.length) continue;
      phases.push({
        id: `phase-${toSlug(g.title)}`,
        title: g.title,
        durationLabel: null,
        tasks: inGroup.map((s) => `Provision + configure ${s.label}${s.costNote ? ` (${s.costNote})` : ''}`),
      });
    }
  }

  phases.push({
    id: 'phase-verify',
    title: 'Verify + hand over',
    durationLabel: '0.5 day',
    tasks: [
      `Deploy via ${getApproachById(approach)?.label || 'the chosen approach'} and confirm every resource is healthy`,
      'Run the cost estimate against actuals in Cost Explorer',
      'Write the handover doc: architecture diagram, runbook, teardown steps',
      `Show the client how to tear it all down (stack: ${names.stackName})`,
    ],
  });

  const totalTasks = phases.reduce((n, p) => n + p.tasks.length, 0);

  return {
    phases,
    totalTasks,
    timelineLabel: timeline?.label || null,
    // Rough sizing: ~35 min per task, rounded to half-days
    estimatedDays: Math.max(1, Math.round((totalTasks * 35) / 60 / 8 * 2) / 2),
  };
}

// ════════════════════════════════════════════════════════════════════
// MAIN — run every stage
// ════════════════════════════════════════════════════════════════════

/**
 * @param {Object|string} gig   A GigItem from gigFeed, or raw brief text
 * @param {Object} options      { knownRegions?: string[], mode?: 'test'|'client' }
 * @returns {Solution}
 */
export function runPipeline(gig, options = {}) {
  const brief = gigToBrief(gig);
  const mode = options.mode || 'test';

  // ── 1. UNDERSTAND ────────────────────────────────────────────────
  const understanding = understand(brief, options);
  const { services, analysis, extracted, region } = understanding;

  // ── 2. BLUEPRINT ─────────────────────────────────────────────────
  const blueprints = matchBlueprints(brief, services);

  // ── 3. NAME ──────────────────────────────────────────────────────
  const names = deriveNames(brief, { extracted, blueprint: blueprints.best, services });

  // ── 4. APPROACH ──────────────────────────────────────────────────
  const approachRec = recommendApproach({
    brief,
    services: services.map((s) => s.id),
    freelance: true,
  });

  // ── 5. GENERATE ──────────────────────────────────────────────────
  const genOpts = {
    mode,
    region: region.primary,
    projectName: names.slug,
    environment: mode === 'test' ? 'test' : 'prod',
  };

  const artifacts = {};
  let generationError = null;
  try {
    artifacts.terraform = generateTerraform(services, genOpts);
    artifacts.cfn       = generateCloudFormation(services, genOpts);
    artifacts.cli       = generateCli(services, genOpts);
  } catch (err) {
    generationError = String(err?.message || err);
  }

  const plan = buildDeliveryPlan({
    blueprint: blueprints.best,
    services,
    approach: approachRec.recommended,
    timeline: extracted.timeline,
    names,
  });

  // ── 6. REVIEW ────────────────────────────────────────────────────
  const solutionText = [
    brief,
    artifacts.terraform?.code || '',
    artifacts.cfn?.code || '',
  ].join('\n\n');

  let expert = null;
  let deployReview = null;
  try {
    expert = runExpertReview({
      brief,
      services: services.map((s) => s.id),
      region: region.primary,
      approach: approachRec.recommended,
      solutionText,
    });
  } catch (err) {
    console.warn('[gigSolutionPipeline] expert review failed:', err);
  }
  try {
    if (artifacts.cfn?.code) {
      deployReview = runDeployReview({
        template: artifacts.cfn.code,
        format: 'cfn',
        services: services.map((s) => s.id),
        region: region.primary,
      });
    }
  } catch (err) {
    console.warn('[gigSolutionPipeline] deploy review failed:', err);
  }

  // ── 7. VERDICT — the safety gate the UI must honour ──────────────
  const blockers = [
    ...(expert?.findings || []).filter((f) => f.severity === 'critical'),
    ...(deployReview?.findings || []).filter((f) => f.severity === 'critical'),
  ];
  const highs = [
    ...(expert?.findings || []).filter((f) => f.severity === 'high'),
    ...(deployReview?.findings || []).filter((f) => f.severity === 'high'),
  ];

  // A template with no real resources in it is not deployable, no matter
  // how clean the review came back. Coverage is the honest gate here.
  const coverage = artifacts.cfn?.coverage || null;
  const hasTemplate = !!artifacts.cfn?.code
    && services.length > 0
    && (coverage?.resourceCount || 0) > 0;

  // Four tiers, so an otherwise-excellent design isn't branded broken by
  // a single "high". Only criticals actually stop you.
  const verdict = !hasTemplate ? 'blocked'
                : blockers.length ? 'fix-first'
                : highs.length ? 'caution'
                : 'ready';

  return {
    id: `sol-${toSlug(names.slug)}-${Date.now().toString(36)}`,
    input: {
      brief,
      title: typeof gig === 'string' ? names.projectName : (gig?.title || names.projectName),
      source: typeof gig === 'string' ? 'manual' : (gig?.source || 'manual'),
      sourceLabel: typeof gig === 'string' ? 'Pasted brief' : (gig?.sourceLabel || 'Manual'),
      url: typeof gig === 'string' ? null : (gig?.url || null),
      budget: typeof gig === 'string' ? null : (gig?.budget || null),
    },
    understanding,
    analysis,
    services,
    region,
    blueprints,
    names,
    approach: {
      ...approachRec,
      option: getApproachById(approachRec.recommended),
      allOptions: APPROACH_OPTIONS,
    },
    artifacts,
    generationError,
    plan,
    review: {
      expert,
      deploy: deployReview,
      blockers,
      highs,
      verdict,
      // runExpertReview returns grade as { letter, tone, label } — flatten
      // it so the UI can render it directly without crashing on an object.
      grade: expert?.grade?.letter || null,
      gradeLabel: expert?.grade?.label || null,
      gradeTone: expert?.grade?.tone || null,
    },
    deploy: {
      canOneClick: hasTemplate,
      coverage,
      format: 'cfn',
      stackName: names.stackName,
      region: region.primary,
      template: artifacts.cfn?.code || null,
      // CAPABILITY_NAMED_IAM is required whenever the template creates
      // named IAM resources — our generator does for most stacks.
      capabilities: /AWS::IAM::/.test(artifacts.cfn?.code || '')
        ? ['CAPABILITY_NAMED_IAM']
        : [],
    },
    mode,
    generatedAt: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════
// Saved solutions
//
// Storage lives in solutionStore.js (import-free) so the Dashboard widget
// can read it without pulling this whole engine into the entry bundle.
// Re-exported here so callers have one obvious import.
// ════════════════════════════════════════════════════════════════════

export {
  listSolutions, getSolution, deleteSolution, recordDeployment, listLiveStacks,
} from './solutionStore.js';

/** Solutions are big; we store a trimmed record, not the whole object. */
export function saveSolution(solution) {
  try {
    const record = {
      id: solution.id,
      title: solution.input.title,
      projectName: solution.names.projectName,
      stackName: solution.names.stackName,
      region: solution.region.primary,
      approach: solution.approach.recommended,
      serviceIds: solution.services.map((s) => s.id),
      serviceLabels: solution.services.map((s) => s.label),
      verdict: solution.review.verdict,
      score: solution.review.expert?.score ?? null,
      grade: solution.review.grade ?? null,
      brief: solution.input.brief.slice(0, 2000),
      sourceUrl: solution.input.url,
      sourceLabel: solution.input.sourceLabel,
      templates: {
        cfn: solution.artifacts.cfn?.code || null,
        terraform: solution.artifacts.terraform?.code || null,
        cli: solution.artifacts.cli?.code || null,
      },
      plan: solution.plan,
      deployments: [],
      savedAt: new Date().toISOString(),
    };
    return upsertSolution(record);
  } catch (err) {
    console.warn('[gigSolutionPipeline] save failed:', err);
    return null;
  }
}
