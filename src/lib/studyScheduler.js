/**
 * studyScheduler.js — EX-20 Daily Study Scheduler.
 *
 * Persists exam date + hours/day per cert. Generates a deterministic
 * day-by-day plan that mixes weak topics, untouched topics, and a
 * Smart Review / practice block.
 *
 * Plans are DAY-DETERMINISTIC (date + cert + hours seed).
 */

import { TOPIC_SERVICES } from '../data/examModes.js';
import { questionsForCert } from '../data/questionBank.js';
import { getSmartReviewState, topicMastery } from './spacedRepetition.js';
import { findSustainedWeakness } from './examWeakness.js';

const STORAGE_KEY = 'awscl-pro::v1::study-scheduler';

// ════════════════════════════════════════════════════════════════════
// Storage helpers
// ════════════════════════════════════════════════════════════════════

function emptyState() {
  return { setup: null, history: {} };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const p = JSON.parse(raw);
    return p && typeof p === 'object' && 'history' in p ? p : emptyState();
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

// ════════════════════════════════════════════════════════════════════
// Date helpers
// ════════════════════════════════════════════════════════════════════

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function todayKey() {
  return ymd(new Date());
}

export function daysToExam(examDate) {
  if (!examDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate + 'T00:00:00');
  return Math.round((exam - today) / (1000 * 60 * 60 * 24));
}

// ════════════════════════════════════════════════════════════════════
// Setup
// ════════════════════════════════════════════════════════════════════

export function getSchedulerSetup() {
  return readState().setup;
}

export function saveSchedulerSetup({ certId, examDate, hoursPerDay }) {
  const state = readState();
  state.setup = {
    certId,
    examDate,
    hoursPerDay: Number(hoursPerDay) || 1,
    createdAt: todayKey(),
  };
  // Clear today's cached plan so it regenerates with the new setup
  delete state.history[todayKey()];
  writeState(state);
}

export function clearSchedulerSetup() {
  const state = readState();
  state.setup = null;
  writeState(state);
}

export function resetScheduler() {
  writeState(emptyState());
}

// ════════════════════════════════════════════════════════════════════
// Streak + history
// ════════════════════════════════════════════════════════════════════

/**
 * Consecutive days completed up to today (or yesterday if today not done).
 */
export function getStreak() {
  const state = readState();
  const hist = state.history || {};
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (!hist[ymd(d)]?.completed) d.setDate(d.getDate() - 1);
  while (true) {
    const key = ymd(d);
    if (hist[key]?.completed) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

export function getCompletedDays(limit = 30) {
  const state = readState();
  const hist = state.history || {};
  return Object.keys(hist).filter((k) => hist[k].completed).sort().slice(-limit);
}

// ════════════════════════════════════════════════════════════════════
// Today's plan — get or generate
// ════════════════════════════════════════════════════════════════════

export function getTodayPlan() {
  const state = readState();
  if (!state.setup) return null;
  const key = todayKey();
  if (state.history[key]?.blocks?.length > 0) {
    return {
      date: key,
      blocks: state.history[key].blocks,
      completed: !!state.history[key].completed,
      completedAt: state.history[key].completedAt || null,
      totalMinutes: state.history[key].blocks.reduce((s, b) => s + (b.minutes || 0), 0),
    };
  }
  const blocks = generateBlocks(state.setup);
  state.history[key] = { completed: false, blocks };
  writeState(state);
  return {
    date: key,
    blocks,
    completed: false,
    completedAt: null,
    totalMinutes: blocks.reduce((s, b) => s + (b.minutes || 0), 0),
  };
}

export function markTodayDone() {
  const state = readState();
  const key = todayKey();
  if (!state.history[key]) state.history[key] = { blocks: [] };
  state.history[key].completed = true;
  state.history[key].completedAt = new Date().toISOString();
  writeState(state);
  return { ...state.history[key], date: key };
}

export function regenerateTodayPlan() {
  const state = readState();
  const key = todayKey();
  if (state.history[key]) delete state.history[key];
  writeState(state);
  return getTodayPlan();
}

// ════════════════════════════════════════════════════════════════════
// Algorithm
// ════════════════════════════════════════════════════════════════════

function seededRandom(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return ((h >>> 0) / 4294967296);
  };
}

function pickFrom(arr, n, rand) {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function generateBlocks(setup) {
  const { certId, hoursPerDay } = setup;
  const totalMinutes = Math.max(15, Math.round(hoursPerDay * 60));
  const seed = `${todayKey()}::${certId}::${hoursPerDay}`;
  const rand = seededRandom(seed);

  // Topic pool
  const allQs = questionsForCert(certId);
  const topicsWithQs = TOPIC_SERVICES.filter((t) => {
    const aliases = (t.aliases || [t.id]).map((a) => a.toLowerCase());
    return allQs.some((q) => (q.service || []).some((s) => aliases.includes(String(s).toLowerCase())));
  });

  // Weak topics — derived from Smart Review mastery (< 50%) + low exam attempts
  const srState = getSmartReviewState(certId);
  const ratedIds = new Set(Object.keys(srState.questions || {}));

  // Sustained-weakness domains from examWeakness (gives extra weight if available)
  let domainWeakness = [];
  try {
    domainWeakness = findSustainedWeakness(certId) || [];
  } catch { domainWeakness = []; }
  const weakDomainIds = new Set(domainWeakness.map((w) => w.domainId));

  // Topic-level weakness via Smart Review mastery + uncovered-domain hint
  const topicsWithMastery = topicsWithQs.map((t) => {
    const aliases = (t.aliases || [t.id]).map((a) => a.toLowerCase());
    const tQs = allQs.filter((q) => (q.service || []).some((s) => aliases.includes(String(s).toLowerCase())));
    const m = topicMastery(certId, tQs);
    const inWeakDomain = tQs.some((q) => (q.domainIds || []).some((d) => weakDomainIds.has(d)));
    return { ...t, _qs: tQs, _mastery: m, _inWeakDomain: inWeakDomain };
  });

  const weakTopics = topicsWithMastery.filter((t) => {
    if (t._mastery.masteryPct != null && t._mastery.masteryPct < 50) return true;
    if (t._inWeakDomain && t._mastery.masteryPct == null) return false;
    return false;
  });

  const untouchedTopics = topicsWithMastery.filter((t) => !t._qs.some((q) => ratedIds.has(q.id)));

  // Time budget split
  const blocks = [];
  const weakAlloc  = Math.round(totalMinutes * 0.40);
  const newAlloc   = Math.round(totalMinutes * 0.30);
  const drillAlloc = Math.max(10, totalMinutes - weakAlloc - newAlloc);

  // Weak topic blocks (fall back to untouched if no weakness signal yet)
  const weakSet = new Set(weakTopics.map((t) => t.id));
  const weakPicks = pickFrom(weakTopics.length ? weakTopics : topicsWithMastery, 2, rand);
  if (weakPicks.length === 0) {
    weakPicks.push(...pickFrom(untouchedTopics.length ? untouchedTopics : topicsWithMastery, 2, rand));
  }
  const weakPer = Math.max(10, Math.floor(weakAlloc / Math.max(1, weakPicks.length)));
  for (const t of weakPicks) {
    if (!t) continue;
    const isWeak = weakSet.has(t.id);
    blocks.push({
      id: `study-${t.id}`,
      type: 'study',
      kind: isWeak ? 'weak' : 'new',
      topic: t.label,
      topicId: t.id,
      icon: t.icon,
      minutes: weakPer,
      label: `${t.label} — ${isWeak ? 'weak area review' : 'study guide'}`,
      to: `/exam/${certId}/study/${t.id}`,
    });
  }

  // Untouched-topic blocks
  const newPicks = pickFrom(
    untouchedTopics.filter((t) => !weakPicks.some((w) => w?.id === t.id)),
    2, rand
  );
  const newPer = Math.max(10, Math.floor(newAlloc / Math.max(1, newPicks.length || 1)));
  for (const t of newPicks) {
    if (!t) continue;
    blocks.push({
      id: `new-${t.id}`,
      type: 'study',
      kind: 'new',
      topic: t.label,
      topicId: t.id,
      icon: t.icon,
      minutes: newPer,
      label: `${t.label} — new topic study`,
      to: `/exam/${certId}/study/${t.id}`,
    });
  }

  // Drill block
  if (ratedIds.size > 0) {
    blocks.push({
      id: 'drill-smart-review',
      type: 'smart-review',
      kind: 'drill',
      topic: 'Smart Review',
      icon: '🧠',
      minutes: drillAlloc,
      label: `Smart Review — spaced repetition (${drillAlloc} min)`,
      to: `/exam/${certId}/run/smartReview`,
    });
  } else {
    const target = weakPicks[0] || newPicks[0] || topicsWithMastery[0];
    if (target) {
      blocks.push({
        id: 'drill-practice',
        type: 'practice',
        kind: 'drill',
        topic: target.label,
        topicId: target.id,
        icon: target.icon,
        minutes: drillAlloc,
        label: `Practice quiz on ${target.label}`,
        to: `/exam/${certId}/run/topic?service=${target.id}`,
      });
    }
  }

  return blocks;
}

// ════════════════════════════════════════════════════════════════════
// Summary for the card
// ════════════════════════════════════════════════════════════════════

export function getSchedulerSummary() {
  const state = readState();
  const setup = state.setup;
  if (!setup) return { hasSetup: false };
  const days = daysToExam(setup.examDate);
  const streak = getStreak();
  const totalCompleted = Object.values(state.history || {}).filter((h) => h.completed).length;
  return {
    hasSetup: true,
    certId: setup.certId,
    examDate: setup.examDate,
    hoursPerDay: setup.hoursPerDay,
    daysToExam: days,
    streak,
    totalCompleted,
  };
}
