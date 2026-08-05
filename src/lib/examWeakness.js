/**
 * examWeakness.js — tracks per-domain accuracy across exam attempts and
 * surfaces "weak topic" warnings + targeted recovery plans.
 *
 * EX-02 spec compliance:
 *   • Records every session's per-domain breakdown to localStorage
 *   • Detects sustained weakness — 2-in-a-row sub-60% on the SAME domain
 *   • Detects acute weakness — any session < 40% overall
 *   • Generates a mini study plan tied to the cert's domains + subtopics
 *   • Provides a "Weak Topics" summary used on the Exam Overview page
 *   • Never blocks the exam — all warnings are post-session UI
 *
 * Storage shape (localStorage `awscl-pro::v1::exam::weakness`):
 *   {
 *     attempts: {
 *       [certId]: [
 *         { at, scorePct, byDomain: { [domainId]: { correct, total, pct } } },
 *         ...
 *       ]
 *     }
 *   }
 *
 * Pure functions — caller wraps localStorage access. Easy to unit test.
 */
import { STORAGE_KEY } from './constants.js';

const KEY = `${STORAGE_KEY}::exam::weakness`;
const WEAK_THRESHOLD     = 60;  // <60% = weak
const CRITICAL_THRESHOLD = 40;  // <40% = critical alert
const HISTORY_CAP        = 25;  // keep last 25 attempts per cert

// ─────────────── storage primitives ───────────────

export function readWeakness() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { attempts: {} };
  } catch {
    return { attempts: {} };
  }
}

function writeWeakness(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

/**
 * Record an exam attempt. Called from ExamResults after every standard /
 * practice / timed session.
 *
 * @param {string} certId  e.g. 'clf-c02', 'saa-c03'
 * @param {object} attempt { scoreOverall: 0-100, byDomain: { [id]: {correct, total} } }
 */
export function recordAttempt(certId, attempt) {
  if (!certId || !attempt) return;
  const state = readWeakness();
  if (!state.attempts) state.attempts = {};
  if (!state.attempts[certId]) state.attempts[certId] = [];

  // Normalise byDomain → add pct
  const byDomain = {};
  for (const [dId, dv] of Object.entries(attempt.byDomain || {})) {
    const pct = dv.total > 0 ? Math.round((dv.correct / dv.total) * 100) : 0;
    byDomain[dId] = { correct: dv.correct, total: dv.total, pct };
  }

  // EX-25: per-service results too. Domains are only four buckets, so a
  // domain score cannot tell you what to actually go and study. Services
  // can — and each one maps to a study guide you can open.
  const byService = {};
  for (const [sId, sv] of Object.entries(attempt.byService || {})) {
    const pct = sv.total > 0 ? Math.round((sv.correct / sv.total) * 100) : 0;
    byService[sId] = { correct: sv.correct, total: sv.total, pct };
  }

  state.attempts[certId].unshift({
    at: new Date().toISOString(),
    scorePct: Math.max(0, Math.min(100, Math.round(attempt.scoreOverall))),
    byDomain,
    byService,
  });

  // Cap history so localStorage doesn't bloat
  state.attempts[certId] = state.attempts[certId].slice(0, HISTORY_CAP);
  writeWeakness(state);
  return state.attempts[certId];
}

// ─────────────── analysis ───────────────

/**
 * Return every domain where the user has scored < 60% in their LATEST attempt
 * AND in the previous attempt for that cert (2-in-a-row weakness signal).
 * @returns {Array<{domainId, latestPct, previousPct, severity}>}
 */
export function findSustainedWeakness(certId) {
  const state = readWeakness();
  const attempts = state.attempts?.[certId] || [];
  if (attempts.length < 2) return [];
  const [latest, previous] = attempts;
  const flagged = [];
  for (const [dId, latestData] of Object.entries(latest.byDomain || {})) {
    const prevData = previous.byDomain?.[dId];
    if (!prevData) continue;
    // Only flag if both attempts touched the domain (≥3 questions) AND both < 60%
    if (latestData.total < 3 || prevData.total < 3) continue;
    if (latestData.pct < WEAK_THRESHOLD && prevData.pct < WEAK_THRESHOLD) {
      flagged.push({
        domainId: dId,
        latestPct: latestData.pct,
        previousPct: prevData.pct,
        severity: latestData.pct < CRITICAL_THRESHOLD ? 'critical' : 'warning',
      });
    }
  }
  // Most severe first
  return flagged.sort((a, b) => a.latestPct - b.latestPct);
}

/**
 * Was the user's most recent attempt overall a critical-tier failure (<40%)?
 */
export function isCriticalSession(certId) {
  const state = readWeakness();
  const attempts = state.attempts?.[certId] || [];
  return attempts.length > 0 && attempts[0].scorePct < CRITICAL_THRESHOLD;
}

/**
 * Generate a mini recovery plan for a given domain. Pulls 3 specific
 * subtopics from a domain → subtopic map. If the cert is unknown, falls
 * back to a generic 3-step plan keyed off the domain label.
 */
export function recoveryPlanFor(cert, domainId) {
  const dom = cert?.domains?.find((d) => d.id === domainId);
  if (!dom) return null;
  const subtopics = SUBTOPIC_MAP[cert.id]?.[domainId] || [
    `Re-read the official AWS docs for ${dom.label}`,
    `Take 20 practice questions filtered to ${dom.label}`,
    `Build one hands-on lab covering the most-tested service in ${dom.label}`,
  ];
  return {
    domainId,
    label: dom.label,
    weight: dom.weight,
    subtopics: subtopics.slice(0, 3),
    estimatedHours: 4 + Math.round(dom.weight / 5),
  };
}

/**
 * Build a full summary suitable for the Exam Overview "Weak Topics" card.
 */
export function weaknessSummary(cert) {
  if (!cert) return { topics: [], lastAttempt: null };
  const flagged = findSustainedWeakness(cert.id);
  const state = readWeakness();
  const attempts = state.attempts?.[cert.id] || [];
  return {
    cert,
    lastAttempt: attempts[0] || null,
    attempts,
    topics: flagged.map((f) => ({
      ...f,
      plan: recoveryPlanFor(cert, f.domainId),
      label: cert.domains.find((d) => d.id === f.domainId)?.label || f.domainId,
    })),
    isCritical: isCriticalSession(cert.id),
  };
}

/**
 * Clear all stored weakness records — used by Settings → reset data.
 */
export function clearWeakness() {
  try { localStorage.removeItem(KEY); } catch {}
}

// ─────────────── subtopic map (cert × domain → recovery actions) ───────────────
// Add to this as new questions/topics are written. Falls back to a generic
// plan when an entry isn\'t found.

const SUBTOPIC_MAP = {
  'clf-c02': {
    'clf-d1': [
      'Re-read AWS Cloud Adoption Framework + 6 advantages of the cloud',
      'Memorise the 3 cloud deployment models (public/private/hybrid)',
      'Take 20 practice questions tagged "cloud-concepts"',
    ],
    'clf-d2': [
      'Re-read the Shared Responsibility Model section + diagram',
      'Practice questions on IAM users vs roles vs root',
      'Lab: enable MFA on root + create an IAM admin user',
    ],
    'clf-d3': [
      'Re-read the AWS Global Infrastructure module (regions/AZs/edge)',
      'Memorise S3 storage classes + tradeoffs',
      'Practice questions filtered to "compute" + "storage"',
    ],
    'clf-d4': [
      'Re-read AWS support plans + their SLAs',
      'Memorise pricing models: on-demand vs reserved vs savings plans',
      'Walk through the AWS Pricing Calculator for a sample web app',
    ],
  },
  'saa-c03': {
    'saa-d1': [
      'Re-read IAM Identity-based vs Resource-based policies',
      'Practice S3 bucket policies + organisation-wide access controls',
      'Lab: set up cross-account S3 access using aws:PrincipalOrgID',
    ],
    'saa-d2': [
      'Re-read EC2 Auto Scaling + Multi-AZ patterns',
      'Memorise RDS Multi-AZ vs Read Replicas (HA vs read scale)',
      'Lab: stand up an ALB + ASG + RDS Multi-AZ stack',
    ],
    'saa-d3': [
      'Re-read CloudFront + Global Accelerator + Route 53 routing policies',
      'Memorise SQS vs SNS vs EventBridge use cases',
      'Lab: build a Lambda fan-out via SNS → multiple SQS queues',
    ],
    'saa-d4': [
      'Re-read S3 storage classes + lifecycle rules',
      'Memorise Savings Plans tiers + Spot use cases',
      'Lab: write a lifecycle rule that moves Standard → IA → Glacier',
    ],
  },
};
