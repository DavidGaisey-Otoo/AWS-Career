/**
 * customProjects.js — BUILD-01: build something that isn't one of the eight.
 *
 * ════════════════════════════════════════════════════════════════════
 * THE GAP
 * ════════════════════════════════════════════════════════════════════
 * The whole guided build experience — Kanban board, tickable build steps,
 * progress tracking, screenshots, notes, common-errors reference, the
 * portfolio detail page and the export — worked only for the eight
 * hardcoded entries in data/projects.js. If you wanted to build anything
 * else there was nowhere to say so, and no way to get that same treatment.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHAT THIS DOES
 * ════════════════════════════════════════════════════════════════════
 * Takes a free-text description and produces an object in EXACTLY the same
 * shape as a preset project, so every existing surface renders it without
 * knowing the difference. Nothing downstream needed changing.
 *
 * The content is not invented — it is assembled from engines that already
 * exist and are already tested:
 *
 *   services + region + cost   → projectAnalyzer.analyseProject
 *   build steps                → gigSolutionPipeline.buildDeliveryPlan
 *   common errors              → expertAgents.runExpertReview, turned into
 *                                "what usually goes wrong here" entries
 *   difficulty + effort        → derived from the service mix
 *
 * Using the expert review to populate commonErrors is the part worth
 * noticing: the same rules that grade a design also predict the mistakes
 * you are most likely to make building it, which is exactly what the
 * preset projects hand-author.
 */

import { STORAGE_KEY } from './constants.js';
import { analyseProject } from './projectAnalyzer.js';
import { runPipeline, buildDeliveryPlan } from './gigSolutionPipeline.js';
import { mapRequirements } from './requirementMapper.js';
import { runExpertReview } from './expertAgents/master.js';
import { getServiceMeta } from '../data/projects.js';
import { SERVICE_MATRIX } from '../data/awsServiceMatrix.js';

const KEY = `${STORAGE_KEY}::custom-projects`;
const MAX_CUSTOM = 30;

// ════════════════════════════════════════════════════════════════════
// Storage
// ════════════════════════════════════════════════════════════════════

export function listCustomProjects() {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function getCustomProject(id) {
  return listCustomProjects().find((p) => p.id === id) || null;
}

export function saveCustomProject(project) {
  try {
    const all = listCustomProjects().filter((p) => p.id !== project.id);
    const next = [project, ...all].slice(0, MAX_CUSTOM);
    localStorage.setItem(KEY, JSON.stringify(next));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('awscl:custom-projects-changed', { detail: { action: 'save', id: project.id } }));
    return project;
  } catch (err) {
    console.warn('[customProjects] save failed:', err);
    return null;
  }
}

export function deleteCustomProject(id) {
  try {
    localStorage.setItem(KEY, JSON.stringify(listCustomProjects().filter((p) => p.id !== id)));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('awscl:custom-projects-changed', { detail: { action: 'delete', id } }));
    return true;
  } catch { return false; }
}

export function isCustomProjectId(id) {
  return String(id || '').startsWith('custom-');
}

// ════════════════════════════════════════════════════════════════════
// Generation
// ════════════════════════════════════════════════════════════════════

/**
 * Difficulty from the shape of the service mix, not a guess.
 *
 * Supporting services are excluded from the count. IAM, CloudWatch and
 * logging are added to every build by the requirement mapper's baseline
 * rule, so counting them pushed even a simple booking site over the
 * "advanced" threshold — the difficulty should reflect what is genuinely
 * hard, not how many boxes appear on the diagram.
 */
const SUPPORTING = ['iam', 'cloudwatch', 'cloudwatch-logs', 'sns', 'ses', 'eventbridge', 'route53'];

function deriveDifficulty(services) {
  const ids = services.map((s) => s.id);
  const substantive = ids.filter((i) => !SUPPORTING.includes(i));

  const advanced = ['eks', 'tgw', 'direct-connect', 'dx', 'kinesis', 'redshift', 'emr', 'msk', 'sagemaker', 'opensearch'];
  const intermediate = ['ecs', 'aurora', 'elasticache', 'waf', 'kms', 'step-functions', 'glue', 'athena'];

  if (ids.some((i) => advanced.includes(i)) || substantive.length >= 8) return 'advanced';
  if (ids.some((i) => intermediate.includes(i)) || substantive.length >= 6) return 'int-adv';
  if (substantive.length >= 4) return 'intermediate';
  return 'beginner';
}

/**
 * Lay services out left-to-right in dependency tiers so the architecture
 * diagram is readable, matching the node/edge shape the preset projects use.
 */
function buildArchitecture(services) {
  const TIERS = [
    ['route53', 'cloudfront', 'waf', 'apigw', 'alb'],          // edge
    ['ec2', 'lambda', 'ecs', 'eks', 'fargate', 'asg'],          // compute
    ['rds', 'aurora', 'dynamodb', 's3', 'elasticache', 'efs'],  // data
    ['iam', 'kms', 'secrets-manager', 'cloudwatch', 'sns'],     // supporting
  ];

  const nodes = [{ id: 'user', label: 'User', icon: '👤', x: 40, y: 120 }];
  const placed = [];
  let x = 210;

  for (const tier of TIERS) {
    const inTier = services.filter((s) => tier.includes(s.id));
    if (!inTier.length) continue;
    inTier.forEach((svc, i) => {
      nodes.push({
        id: svc.id,
        label: svc.label || svc.id,
        service: svc.id,
        x,
        y: 40 + i * 85,
      });
      placed.push(svc.id);
    });
    x += 190;
  }

  // Anything not in a known tier goes in a final column
  const leftovers = services.filter((s) => !placed.includes(s.id));
  leftovers.forEach((svc, i) => {
    nodes.push({ id: svc.id, label: svc.label || svc.id, service: svc.id, x, y: 40 + i * 85 });
  });

  // Chain the columns together so the diagram shows flow
  const edges = [];
  const columns = [...new Set(nodes.map((n) => n.x))].sort((a, b) => a - b);
  for (let c = 0; c < columns.length - 1; c++) {
    const from = nodes.filter((n) => n.x === columns[c]);
    const to = nodes.filter((n) => n.x === columns[c + 1]);
    if (from[0] && to[0]) edges.push({ from: from[0].id, to: to[0].id });
  }

  return { nodes, edges };
}

/**
 * Turn expert-review findings into the "common errors" reference the preset
 * projects hand-author. The rules that grade a design are also the best
 * available predictor of what you will get wrong building it.
 */
function errorsFromReview(review) {
  if (!review?.findings) return [];
  return review.findings
    .filter((f) => ['critical', 'high', 'medium'].includes(f.severity))
    .slice(0, 6)
    .map((f) => ({
      problem: f.title,
      fix: f.fix || f.body || 'Review the AWS documentation for this service.',
    }));
}

/**
 * Generate a full project from a free-text description.
 *
 * @param {Object} opts
 * @param {string} opts.brief   what the user wants to build
 * @param {string} [opts.title] optional explicit title
 * @returns {Object} a project in data/projects.js shape
 */
export function generateCustomProject({ brief, title } = {}) {
  const text = String(brief || '').trim();
  if (!text) throw new Error('Describe what you want to build.');

  // Reuse the full pipeline: region, names, plan, review
  const solution = runPipeline(text, { mode: 'test' });
  const analysis = analyseProject(text, {});

  // Service detection needs BOTH detectors. The pipeline's matches AWS
  // vocabulary, which is right for a technical gig spec but finds nothing
  // in "customers pick a slot and get an SMS reminder". requirementMapper
  // reads product language instead. Union of the two, because a brief can
  // legitimately contain both registers.
  const requirements = mapRequirements(text);
  const serviceIds = [...new Set([
    ...solution.services.map((s) => s.id),
    ...requirements.serviceIds,
  ])];
  const services = serviceIds
    .map((id) => SERVICE_MATRIX[id] || { id, label: id })
    .filter(Boolean);

  let review = null;
  try {
    review = runExpertReview({
      brief: text,
      services: services.map((s) => s.id),
      region: solution.region.primary,
      approach: solution.approach.recommended,
    });
  } catch { /* review is a bonus, not a requirement */ }

  const difficulty = deriveDifficulty(services);

  // Rebuild the plan against the MERGED service list. solution.plan was
  // built from the pipeline's own detection, which finds nothing in plain
  // product language — leaving a booking system with a plan of "discovery"
  // then "hand over" and no build phases in between.
  const plan = buildDeliveryPlan({
    blueprint: solution.blueprints.best,
    services,
    approach: solution.approach.recommended,
    timeline: solution.understanding.extracted.timeline,
    names: solution.names,
  });

  const estMinutes = Math.max(120, plan.estimatedDays * 8 * 60);
  const hours = Math.round(estMinutes / 60);

  // Plan phases → build steps, in the exact shape the detail page ticks off
  const buildSteps = plan.phases.map((phase, i) => ({
    id: `cst-${i + 1}`,
    title: phase.title,
    subs: phase.tasks.map((t, j) => ({ id: `cst-${i + 1}-s${j + 1}`, title: t })),
  }));

  const skills = [...new Set(services.map((s) => s.label).filter(Boolean))].slice(0, 8);
  const freeTier = !services.some((s) => s.freeTier === 'costs-money');

  return {
    id: `custom-${Date.now().toString(36)}`,
    n: 0,                                   // ordering handled by the board
    isCustom: true,
    title: (title || solution.names.projectName || 'My AWS Project').slice(0, 80),
    tagline: `${services.length} AWS service${services.length === 1 ? '' : 's'} · ${solution.region.primary}`,
    summary: analysis.summary || text.slice(0, 200),
    businessCase: text.slice(0, 600),
    difficulty,
    services: services.map((s) => s.id),
    skills,
    estMinutes,
    estLabel: `${Math.max(2, hours - 2)}–${hours + 2} hours`,
    clientAppeal: Math.min(10, 4 + services.length),
    certs: ['Solutions Architect Associate'],
    costNotes: freeTier
      ? `Free Tier covers most of this at low usage. Estimated test cost: ${solution.analysis.testDeployment?.cost || '$0'}.`
      : `Some services here bill from the first hour. Estimated test cost: ${solution.analysis.testDeployment?.cost || 'see Cost Estimator'}. Tear down when finished.`,
    freeTier,
    companies: [],
    architecture: buildArchitecture(services),
    prerequisites: [
      'AWS account with billing alerts configured',
      `Region chosen: ${solution.region.primary}`,
      ...(analysis.missingQuestions || []).slice(0, 2),
    ],
    buildSteps,
    commonErrors: errorsFromReview(review),
    presentation: [
      `Uses ${services.length} AWS services: ${skills.slice(0, 4).join(', ')}.`,
      `Deployed to ${solution.region.primary}.`,
      review ? `Reviewed by ${review.expertCount} architecture specialists — scored ${review.score}/100.` : null,
      freeTier ? 'Runs inside the AWS Free Tier at low usage.' : 'Costed before build; tear down after demo.',
    ].filter(Boolean),

    // Provenance so the UI can show where it came from and re-open the solution
    createdAt: new Date().toISOString(),
    sourceBrief: text.slice(0, 2000),
    reviewScore: review?.score ?? null,
    reviewGrade: review?.grade?.letter ?? null,
    approach: solution.approach.recommended,
    region: solution.region.primary,
    stackName: solution.names.stackName,

    // Why each service is here, in the user's own words — so the plan is
    // inspectable rather than an unexplained list.
    capabilities: requirements.capabilities,
    serviceReasons: requirements.reasons,
  };
}

/**
 * Services on a custom project are plain ids; the board and filters expect
 * to resolve metadata the same way they do for preset projects.
 */
export function customProjectServiceMeta(serviceId) {
  return getServiceMeta(serviceId);
}
