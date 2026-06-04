/**
 * studyNotesGenerator.js — NT-01 generators.
 *
 * Two entry points:
 *   generateNoteFromWalkthrough(walkthrough, { brief, services, source })
 *   generateNoteFromLesson({ topicId, topicLabel, body, services })
 *
 * Both produce the same Note shape that studyNotesStore.saveNote() takes.
 *
 * For services, we pull canonical "what it is" copy from
 * AWS_SERVICE_CATALOG so notes are accurate + consistent. The "why we
 * chose it" reason is taken from the walkthrough/lesson context if
 * provided, else fallback to the catalog's first trigger reason.
 */

import { AWS_SERVICE_CATALOG } from '../data/awsServiceCatalog.js';

// Curated key-concept hints — short, high-value AWS principles users
// should walk away knowing after almost any project.
const UNIVERSAL_CONCEPTS = [
  'IAM uses least privilege — grant the minimum permissions needed, never `Action: "*"` in production.',
  'AWS resources live in regions — pick one close to your users (latency + data residency).',
  'Pay-per-use pricing — every service can be costed per request/GB/hour. Estimate before deploying.',
  'Free Tier resets monthly for the first 12 months — Lambda + DynamoDB on-demand are always-free for typical learning workloads.',
];

// Common mistakes catalogue keyed by service id — pulled when the
// walkthrough doesn't have its own.
const COMMON_MISTAKES_BY_SERVICE = {
  s3:       'Leaving an S3 bucket public when it should be private (use Block Public Access by default).',
  iam:      'Hard-coding access keys in code instead of using IAM roles + instance profiles.',
  lambda:   'Forgetting Lambda has a 15-minute timeout — long-running jobs need ECS/Fargate or Step Functions instead.',
  ec2:      'Forgetting to tag resources with a project/environment tag → impossible to track cost later.',
  dynamodb: 'Provisioning capacity instead of starting On-Demand — burns money on idle tables in dev.',
  rds:      'Skipping Multi-AZ in production — single-AZ means downtime when AWS does an instance restart.',
  cloudfront: 'Forgetting to invalidate the cache after a content update — users see stale files for hours.',
  vpc:      'Putting databases in public subnets — they should always be in private subnets with no IGW route.',
  apigateway: 'Leaving API Gateway open without throttling or authentication — easy to get a $10k bill from a runaway script.',
  ecs:      'Running containers on EC2 launch type when Fargate would be simpler and cheaper for low-traffic services.',
  cognito:  'Not enabling MFA on the user pool — defeats most of Cognito\'s security value.',
  cloudwatch: 'Setting alarms but no SNS subscription — alarm fires, nobody knows about it.',
};

const GENERIC_MISTAKES = [
  'Skipping the "stop everything when done" step — orphan resources keep billing you long after the project ends.',
  'Building in the AWS Console without writing down each click — you can\'t reproduce it later without Infrastructure-as-Code.',
];

// ════════════════════════════════════════════════════════════════════
// Generator — from a deep walkthrough
// ════════════════════════════════════════════════════════════════════

/**
 * @param {Object} walkthrough — { id, title, brief, services[], steps[], meta }
 * @param {Object} [opts]      — { source: 'walkthrough'|'project', extraServices: [], extraConcepts: [] }
 */
export function generateNoteFromWalkthrough(walkthrough, opts = {}) {
  const title = walkthrough.title || 'AWS project walkthrough';
  const brief = walkthrough.brief || '';
  const services = uniq([...(walkthrough.services || []), ...(opts.extraServices || [])]);
  const steps    = walkthrough.steps || [];

  // What you built — synthesise from title + brief
  const whatYouBuilt = composeWhatYouBuilt({ title, brief, services });

  // Per-service explanations
  const serviceEntries = services.map((sid) => buildServiceEntry(sid, brief, walkthrough)).filter(Boolean);

  // Key concepts — pull from step `what`/`why` excerpts + add universals
  const conceptsFromSteps = collectKeyConceptsFromSteps(steps);
  const keyConcepts = uniqShort([
    ...conceptsFromSteps,
    ...UNIVERSAL_CONCEPTS,
    ...(opts.extraConcepts || []),
  ], 6);

  // 3 things to remember — high-leverage one-liners
  const remembers = composeRemembers(serviceEntries, walkthrough);

  // 2 common mistakes — pull from steps OR service catalogue
  const mistakes = composeMistakes(steps, services);

  // Summary line for library list
  const summary = `${serviceEntries.length} services · ${steps.length} step${steps.length === 1 ? '' : 's'} · ${shortBrief(brief)}`;

  // Tags for filtering
  const tags = services.slice(0, 10);

  return {
    title,
    source: opts.source || 'walkthrough',
    sourceId: walkthrough.id || null,
    summary,
    body: {
      whatYouBuilt,
      services: serviceEntries,
      keyConcepts,
      remembers,
      mistakes,
    },
    tags,
    metadata: {
      region: walkthrough.region,
      level: walkthrough.difficulty,
      stepCount: steps.length,
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// Generator — from a learning lesson / study guide
// ════════════════════════════════════════════════════════════════════

/**
 * @param {Object} lesson — { id, label, body|content, services[] }
 */
export function generateNoteFromLesson(lesson) {
  const title = lesson.label || lesson.title || 'AWS lesson';
  const services = uniq(lesson.services || []);
  const bodyText = lesson.body || lesson.content || '';

  const whatYouBuilt = `Studied ${title}. ${shortBrief(bodyText)}`.trim();
  const serviceEntries = services.map((sid) => buildServiceEntry(sid, bodyText, { title })).filter(Boolean);
  const keyConcepts = uniqShort([
    ...extractSentencesContaining(bodyText, ['important', 'remember', 'note that', 'key point', 'in practice']),
    ...UNIVERSAL_CONCEPTS,
  ], 5);
  const remembers = composeRemembers(serviceEntries, { title });
  const mistakes = composeMistakes([], services);

  return {
    title,
    source: 'lesson',
    sourceId: lesson.id || null,
    summary: `${serviceEntries.length} services · lesson · ${shortBrief(bodyText)}`,
    body: { whatYouBuilt, services: serviceEntries, keyConcepts, remembers, mistakes },
    tags: services.slice(0, 10),
    metadata: { topicSlug: lesson.id },
  };
}

// ════════════════════════════════════════════════════════════════════
// Internal helpers
// ════════════════════════════════════════════════════════════════════

function buildServiceEntry(sid, brief, ctx) {
  const def = AWS_SERVICE_CATALOG[sid];
  if (!def) {
    // Unknown service — still produce a minimal entry so user sees it listed
    return {
      id: sid,
      label: sid.toUpperCase(),
      what: `${sid.toUpperCase()} (canonical service description not in catalogue).`,
      why: `Used in this project per the brief.`,
    };
  }
  return {
    id: def.id,
    label: def.label,
    what: def.what || '',
    why: pickWhyReason(def, brief, ctx),
  };
}

function pickWhyReason(def, brief, ctx) {
  // 1. Look for a trigger whose pattern matched the brief — its `reason`
  //    is the most contextual explanation we have
  if (def.triggers?.length && brief) {
    for (const t of def.triggers) {
      if (t.pattern?.test?.(brief)) return t.reason;
    }
  }
  // 2. Fall back to the first trigger's reason if any
  if (def.triggers?.[0]?.reason) return def.triggers[0].reason;
  // 3. Generic fallback
  return `${def.label} fits this project's ${def.category?.toLowerCase() || 'core'} requirements.`;
}

function composeWhatYouBuilt({ title, brief, services }) {
  if (brief?.trim()) {
    return `${shortBrief(brief, 320)} Project: ${title}.`;
  }
  if (services.length) {
    const list = services.map((s) => AWS_SERVICE_CATALOG[s]?.label || s.toUpperCase()).join(', ');
    return `Built ${title} using ${list}.`;
  }
  return `Completed ${title}.`;
}

function collectKeyConceptsFromSteps(steps) {
  const out = [];
  for (const step of steps || []) {
    // Walkthroughs may have `what`, `why`, or `concept` fields
    if (step.why) out.push(shortBrief(step.why, 180));
    if (step.concept) out.push(shortBrief(step.concept, 180));
  }
  return out.filter(Boolean);
}

function composeRemembers(serviceEntries, walkthrough) {
  const out = [];
  // 1. The highest-leverage service-specific one-liner
  const primary = serviceEntries[0];
  if (primary?.label) {
    out.push(`Use ${primary.label} for this kind of work — it's the AWS-canonical choice.`);
  }
  // 2. IaC reminder (almost always applies)
  out.push(`Write the infrastructure as code (Terraform/CFN) before going to production — you can\'t reproduce a Console click trail.`);
  // 3. Cost reminder
  out.push(`Set a billing alert + budget BEFORE deploying — every AWS bill horror story starts with "I forgot to set an alarm."`);
  return out.slice(0, 3);
}

function composeMistakes(steps, services) {
  const out = [];
  // 1. Pull explicit mistakes from steps (Deep Walkthrough has a `mistakes` array on each step)
  for (const step of steps || []) {
    const arr = step.mistakes || step.commonMistakes;
    if (Array.isArray(arr)) {
      for (const m of arr) {
        if (typeof m === 'string') out.push(m);
        else if (m?.text) out.push(m.text);
        if (out.length >= 2) break;
      }
    }
    if (out.length >= 2) break;
  }
  // 2. Pull from service catalogue mistakes
  if (out.length < 2) {
    for (const sid of services) {
      const m = COMMON_MISTAKES_BY_SERVICE[sid];
      if (m && !out.includes(m)) out.push(m);
      if (out.length >= 2) break;
    }
  }
  // 3. Generic fallbacks
  for (const m of GENERIC_MISTAKES) {
    if (out.length >= 2) break;
    if (!out.includes(m)) out.push(m);
  }
  return out.slice(0, 2);
}

function extractSentencesContaining(text, keywords) {
  if (!text) return [];
  const sentences = String(text).split(/[.!?]\s+/).slice(0, 30);
  const out = [];
  for (const s of sentences) {
    const low = s.toLowerCase();
    if (keywords.some((k) => low.includes(k))) {
      out.push(shortBrief(s.trim(), 200));
    }
  }
  return out;
}

function shortBrief(s, max = 200) {
  const t = String(s || '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s\S*$/, '') + '…';
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function uniqShort(arr, max) {
  return uniq(arr).slice(0, max);
}
