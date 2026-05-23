/**
 * Exam Center Stage 13 add-ons:
 *  - MODE_CONFIGS — definition for the 5 new modes
 *  - TOPIC_SERVICES — the per-service topic grid
 *  - readinessSignal() — "X% likely to pass today" heuristic
 *  - adaptivePool() — feeds the Adaptive runner — surfaces wrong-answered
 *    questions after 2 sessions and over-weights weak services.
 *  - servicePerformance() — % correct per service across all attempts
 *  - BOOKING — Pearson VUE / PSI links + ID + day-of guidance
 */

import { QUESTION_BANK, questionsForCert } from './questionBank.js';
import { LEVEL_META, passPercent } from './certs.js';

// ===================================================================
// Modes
// ===================================================================

export const MODE_CONFIGS = {
  // Existing — kept here for the Card grid so all modes feel equal.
  standard: {
    id: 'standard',
    label: 'Standard',
    icon: '🎓',
    blurb: 'Full mock exam — real time, real pressure.',
    paramsFn: (cert) => ({ count: cert.questions, minutes: cert.minutes, timed: true }),
  },
  practice: {
    id: 'practice',
    label: 'Practice',
    icon: '📋',
    blurb: 'Category practice — pick domain + count.',
    paramsFn: () => ({}),
  },
  learning: {
    id: 'learning',
    label: 'Learning',
    icon: '📖',
    blurb: 'No timer · reveal · mark Got/Still/Hard.',
    paramsFn: () => ({}),
  },
  // ------- NEW Stage 13 modes -------
  timed: {
    id: 'timed',
    label: 'Timed',
    icon: '⏱',
    blurb: 'Real exam pressure simulation. Auto-submits on expire.',
    paramsFn: (cert) => ({ count: cert.questions, minutes: cert.minutes, timed: true, autoStart: true }),
  },
  review: {
    id: 'review',
    label: 'Review',
    icon: '🔍',
    blurb: 'See full explanation after each answer. No timer.',
    paramsFn: () => ({ count: 20, timed: false, autoStart: true }),
  },
  section: {
    id: 'section',
    label: 'Section',
    icon: '🎯',
    blurb: 'Drill one domain. Track domain-specific progress.',
    paramsFn: () => ({ count: 20, timed: false }), // needs domain pick on setup
  },
  topic: {
    id: 'topic',
    label: 'Topic',
    icon: '🧩',
    blurb: 'Pick one AWS service. Find your weak areas fast.',
    paramsFn: () => ({ count: 15, timed: false }), // needs service pick on setup
  },
  final: {
    id: 'final',
    label: 'Final',
    icon: '🏁',
    blurb: 'Randomised final test — readiness assessment.',
    paramsFn: (cert) => ({ count: cert.questions, minutes: cert.minutes, timed: true, autoStart: true }),
  },
};

export const NEW_MODES = ['timed', 'review', 'section', 'topic', 'final'];
export const ALL_MODES = ['standard', 'practice', 'learning', ...NEW_MODES];

// ===================================================================
// Topic services grid (matches IDs used in questionBank `service` tags)
// ===================================================================

export const TOPIC_SERVICES = [
  { id: 'ec2',         label: 'EC2',          icon: '🖥' },
  { id: 's3',          label: 'S3',           icon: '🪣' },
  { id: 'vpc',         label: 'VPC',          icon: '🔗' },
  { id: 'rds',         label: 'RDS',          icon: '🗄' },
  { id: 'lambda',      label: 'Lambda',       icon: 'λ'  },
  { id: 'dynamodb',    label: 'DynamoDB',     icon: '⚡' },
  { id: 'alb',         label: 'ELB / ALB',    icon: '⚖' },
  { id: 'asg',         label: 'Auto Scaling', icon: '↕'  },
  { id: 'cloudfront',  label: 'CloudFront',   icon: '🌎' },
  { id: 'route53',     label: 'Route 53',     icon: '🧭' },
  { id: 'sqs',         label: 'SQS',          icon: '📨' },
  { id: 'sns',         label: 'SNS',          icon: '📢' },
  { id: 'iam',         label: 'IAM',          icon: '🛡' },
  { id: 'kms',         label: 'KMS',          icon: '🔑' },
  { id: 'ecs',         label: 'ECS',          icon: '🚢' },
  { id: 'eks',         label: 'EKS',          icon: '☸'  },
  { id: 'aurora',      label: 'Aurora',       icon: '🌌' },
  { id: 'elasticache', label: 'ElastiCache',  icon: '🚀' },
  { id: 'kinesis',     label: 'Kinesis',      icon: '📡' },
  { id: 'glue',        label: 'Glue',         icon: '🧪' },
  { id: 'athena',      label: 'Athena',       icon: '🔍' },
  { id: 'redshift',    label: 'Redshift',     icon: '📊' },
  { id: 'dx',          label: 'Direct Connect', icon: '🔌' },
  { id: 'tgw',         label: 'Transit GW',   icon: '🛤' },
  { id: 'waf',         label: 'WAF',          icon: '🧱' },
  { id: 'shield',      label: 'Shield',       icon: '🛡' },
  { id: 'secretsmgr',  label: 'Secrets Mgr',  icon: '🤐' },
  { id: 'step',        label: 'Step Functions', icon: '🪜' },
];

// ===================================================================
// Adaptive intelligence
// ===================================================================

/**
 * "You are X% likely to pass today" — combines readiness + recent
 * trend + domain coverage into one number. Same heuristic for every
 * cert so all 13 feel equal in feature parity.
 */
export function readinessSignal(certState, cert) {
  if (!cert) return { pct: 0, reason: 'No cert metadata.' };
  const attempts = certState?.attempts || [];
  if (attempts.length === 0) {
    return { pct: 0, reason: 'No attempts yet — take a Review mode to start.' };
  }
  // Recent 5 attempts weight more
  const recent = attempts.slice(-5);
  const recentAvg = recent.reduce((s, a) => s + (a.scaledScore || 0), 0) / recent.length;
  const passLine = cert.passScore;
  const base = Math.max(0, Math.min(100, (recentAvg / passLine) * 100));

  // Domain coverage penalty — any domain under passPercent(cert) is a drag.
  const byDom = {};
  for (const at of attempts) {
    for (const [dId, v] of Object.entries(at.byDomain || {})) {
      if (!byDom[dId]) byDom[dId] = { c: 0, t: 0 };
      byDom[dId].c += v.correct; byDom[dId].t += v.total;
    }
  }
  const weakDomains = cert.domains.filter((d) => {
    const v = byDom[d.id]; if (!v || v.t === 0) return false;
    return (v.c / v.t) * 100 < passPercent(cert) - 5;
  });
  const dragPct = weakDomains.length * 6;

  const pct = Math.max(0, Math.min(99, Math.round(base - dragPct)));
  let reason = '';
  if (pct >= 80) reason = 'Strong recent scores across most domains — book the exam.';
  else if (pct >= 65) reason = `Almost there. Drill ${weakDomains.length} weak domain${weakDomains.length === 1 ? '' : 's'} for a week.`;
  else if (pct >= 45) reason = 'Solid foundation but more practice needed. Target ≥ 75% on each domain.';
  else reason = 'Early days. Lean on Review mode + Topic drills before another timed mock.';
  return { pct, reason, weakDomains };
}

/**
 * Pool of questions to put in front of the user for adaptive drilling.
 * - Wrong-answered IDs from the last 2 attempts return to the front.
 * - Service breakdown over-weights weak services automatically.
 */
export function adaptivePool(certState, cert) {
  const attempts = certState?.attempts || [];
  const last2 = attempts.slice(-2);
  const wrongIds = new Set();
  for (const at of last2) {
    for (const r of (at.questionResults || [])) {
      if (r.isCorrect === false) wrongIds.add(r.qId);
    }
  }
  const base = questionsForCert(cert.id);
  const wrong = base.filter((q) => wrongIds.has(q.id));
  const rest = base.filter((q) => !wrongIds.has(q.id));
  // Wrong-first ordering — caller can take(n)
  return [...wrong, ...rest];
}

/**
 * Per-service percentage correct across all attempts. Red <60%, amber 60-79%, green ≥80%.
 */
export function servicePerformance(certState, cert) {
  const attempts = certState?.attempts || [];
  const banks = questionsForCert(cert.id);
  const idMap = new Map(banks.map((q) => [q.id, q]));
  const tally = {};
  for (const at of attempts) {
    for (const r of (at.questionResults || [])) {
      const q = idMap.get(r.qId); if (!q) continue;
      for (const s of (q.service || [])) {
        if (!tally[s]) tally[s] = { c: 0, t: 0 };
        tally[s].t += 1;
        if (r.isCorrect) tally[s].c += 1;
      }
    }
  }
  return TOPIC_SERVICES.map((s) => {
    const v = tally[s.id];
    const pct = v?.t ? Math.round((v.c / v.t) * 100) : null;
    return { ...s, pct, attempts: v?.t || 0 };
  });
}

// ===================================================================
// Booking assistant — same shape across every cert
// ===================================================================

export const BOOKING = {
  vendors: [
    {
      id: 'pearson',
      label: 'Pearson VUE',
      blurb: 'Most AWS exams. Online proctored + 4,000+ centres worldwide.',
      url: 'https://www.aws.training/Certification/Schedule',
      online: true,
      testCenter: true,
    },
    {
      id: 'psi',
      label: 'PSI',
      blurb: 'Alternative provider in select regions. Online + centre options.',
      url: 'https://www.aws.training/Certification/Schedule',
      online: true,
      testCenter: false,
    },
  ],
  onlineVsCenter: [
    { feature: 'Convenience',          online: 'Take from home anytime',                center: 'Travel to a centre' },
    { feature: 'Tech requirement',     online: 'Webcam, mic, OnVUE app, stable wifi',    center: 'None' },
    { feature: 'Room rules',           online: 'Empty desk, one monitor, no second person',center: 'Locker for personal items' },
    { feature: 'ID requirement',       online: 'One government photo ID',                center: 'Two IDs (one with photo)' },
    { feature: 'Check-in time',        online: '30 min before — passport scan',          center: '30 min before — physical check' },
    { feature: 'If something breaks',  online: 'Reboot wastes time; proctor can pause',  center: 'Centre staff handle it' },
    { feature: 'Cost',                 online: 'Same price',                             center: 'Same price' },
  ],
  idRequirements: [
    { country: 'United Kingdom',  acceptable: 'Passport · UK driving licence (photo card) · National ID card' },
    { country: 'United States',   acceptable: 'Passport · US driver\'s licence · State ID · Military ID' },
    { country: 'Ghana',           acceptable: 'Passport · Ghana Card · Voter ID with photo' },
    { country: 'India',           acceptable: 'Passport · Aadhaar · Voter ID with photo' },
    { country: 'Nigeria',         acceptable: 'Passport · NIN card · Driver\'s licence' },
    { country: 'Other',           acceptable: 'Passport is universally accepted — when in doubt, use passport.' },
  ],
  examDayChecklist: [
    'Test webcam + mic 24h before (OnVUE has a system test).',
    'Charge laptop + plug in. Wifi on power, not just battery.',
    'Empty desk: no notes, second monitors, drinks (water OK in clear bottle).',
    'No one else in the room. Lock the door.',
    'Bring required ID. Match the name to your AWS account exactly.',
    'Use the bathroom before check-in starts.',
    'Close every other app. Reboot the computer once.',
    'Have your phone face-down out of reach (you\'ll be asked to show the room with it).',
  ],
  whatHappensOnTheDay: [
    'Log into the OnVUE proctoring app 30 min early.',
    'Take 4 room photos (front, back, left, right) + ID photo.',
    'Proctor checks you in (1–10 min wait depending on queue).',
    '65 questions, ~130 minutes (varies by exam). One unscored set is mixed in.',
    'You can flag questions and revisit before submit.',
    'Results show on screen as pass/fail immediately for most exams.',
    'Detailed scaled score + per-domain breakdown lands in your Certmetrics account within 5 business days.',
  ],
  rescheduleCancellation:
    'Free to reschedule up to 24 hours before exam start time via aws.training. If you no-show or reschedule inside 24h you forfeit the fee. Refunds: cancel up to 24h before for full refund.',
};

// ===================================================================
// Tier-aware ranking — used by `Lvl` chip ordering only
// ===================================================================
export const _LEVEL_RANK = LEVEL_META; // re-export to spare extra imports
