/**
 * spacedRepetition.js — EX-18 Smart Review storage + selection algorithm.
 *
 * Per-question confidence ratings persisted in localStorage. Selection
 * algorithm prioritises low-confidence questions:
 *   Rating 1 (no idea)  → every session
 *   Rating 2 (unsure)   → every 2 sessions
 *   Rating 3 (got it)   → every 5 sessions
 *   Unrated             → every session (highest priority — never seen)
 *
 * Storage shape (one key per app, all certs nested):
 *   {
 *     byCert: {
 *       'saa-c03': {
 *         sessionCount: 7,
 *         questions: {
 *           'q-id-1': { rating: 1, lastShownSession: 7, totalSeen: 3 },
 *           ...
 *         }
 *       }
 *     }
 *   }
 */

const STORAGE_KEY = 'awscl-pro::v1::exam::smartrev';

// ════════════════════════════════════════════════════════════════════
// Storage helpers
// ════════════════════════════════════════════════════════════════════

function emptyState() {
  return { byCert: {} };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.byCert ? parsed : emptyState();
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function getCertState(certId) {
  const state = readState();
  if (!state.byCert[certId]) {
    state.byCert[certId] = { sessionCount: 0, questions: {} };
    writeState(state);
  }
  return state.byCert[certId];
}

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/**
 * Get the saved state for a cert.
 */
export function getSmartReviewState(certId) {
  return getCertState(certId);
}

/**
 * Record a confidence rating for a question after the user answers.
 * @param {string} certId
 * @param {string} questionId
 * @param {1|2|3} rating
 */
export function recordRating(certId, questionId, rating) {
  if (![1, 2, 3].includes(rating)) return;
  const state = readState();
  if (!state.byCert[certId]) {
    state.byCert[certId] = { sessionCount: 0, questions: {} };
  }
  const cs = state.byCert[certId];
  const prev = cs.questions[questionId] || { totalSeen: 0 };
  cs.questions[questionId] = {
    rating,
    lastShownSession: cs.sessionCount,
    totalSeen: prev.totalSeen + 1,
  };
  writeState(state);
}

/**
 * Increment the session counter — call once per Smart Review session start.
 */
export function startSession(certId) {
  const state = readState();
  if (!state.byCert[certId]) {
    state.byCert[certId] = { sessionCount: 0, questions: {} };
  }
  state.byCert[certId].sessionCount += 1;
  writeState(state);
  return state.byCert[certId].sessionCount;
}

/**
 * Pick the next batch of questions for a Smart Review session.
 *
 * Algorithm:
 *   - Unrated questions: priority 0 (always include first)
 *   - Rating 1: priority 1 (every session)
 *   - Rating 2: priority 2 (if sessions-since-last >= 2)
 *   - Rating 3: priority 3 (if sessions-since-last >= 5)
 *   - Sort by priority asc, then by sessionsAgo desc
 *
 * @param {string} certId
 * @param {Array} allQuestions   the question pool to choose from
 * @param {number} count         max questions to return
 */
export function pickSmartReviewQuestions(certId, allQuestions, count = 20) {
  const state = readState();
  const cs = state.byCert[certId] || { sessionCount: 0, questions: {} };
  const session = cs.sessionCount + 1; // session about to start
  const ranked = [];

  for (const q of allQuestions) {
    const entry = cs.questions[q.id];
    if (!entry) {
      // Unrated — highest priority
      ranked.push({ q, priority: 0, sessionsAgo: Infinity });
      continue;
    }
    const sessionsAgo = session - entry.lastShownSession;
    const r = entry.rating;
    if (r === 1) {
      ranked.push({ q, priority: 1, sessionsAgo });
    } else if (r === 2 && sessionsAgo >= 2) {
      ranked.push({ q, priority: 2, sessionsAgo });
    } else if (r === 3 && sessionsAgo >= 5) {
      ranked.push({ q, priority: 3, sessionsAgo });
    }
    // Otherwise: not due this session
  }

  // If nothing due at all (everything well-mastered + waiting), fall back
  // to the best-due rating-3 set + a handful of random rating-3 to keep
  // the session from being empty.
  if (ranked.length === 0) {
    for (const q of allQuestions) {
      const entry = cs.questions[q.id];
      if (entry && entry.rating === 3) {
        ranked.push({ q, priority: 4, sessionsAgo: session - entry.lastShownSession });
      }
    }
  }

  ranked.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.sessionsAgo - a.sessionsAgo;
  });

  return ranked.slice(0, count).map((r) => r.q);
}

/**
 * Compute mastery 0-100% for a set of questions in a topic.
 * Mastery counts ONLY rated questions: avg(rating) → normalise (1→0%, 3→100%).
 * Unrated questions don't count toward the average — they show as "to do".
 *
 * Returns { masteryPct, rated, total, unrated }.
 */
export function topicMastery(certId, topicQuestions) {
  const state = readState();
  const cs = state.byCert[certId] || { questions: {} };
  let sum = 0;
  let rated = 0;
  for (const q of topicQuestions) {
    const e = cs.questions[q.id];
    if (e && [1, 2, 3].includes(e.rating)) {
      sum += e.rating;
      rated++;
    }
  }
  const total = topicQuestions.length;
  const unrated = total - rated;
  if (rated === 0) {
    return { masteryPct: null, rated: 0, total, unrated };
  }
  // 1 → 0%, 2 → 50%, 3 → 100%
  const avg = sum / rated;
  const masteryPct = Math.round(((avg - 1) / 2) * 100);
  return { masteryPct, rated, total, unrated };
}

/**
 * Aggregate mastery across the cert's whole pool.
 * Returns { masteryPct, rated, total }.
 */
export function certMastery(certId, allQuestions) {
  return topicMastery(certId, allQuestions);
}

/**
 * Reset Smart Review data for one cert (or all).
 */
export function resetSmartReview(certId) {
  const state = readState();
  if (certId) {
    delete state.byCert[certId];
  } else {
    state.byCert = {};
  }
  writeState(state);
}

/**
 * Count of questions due in the next session — used by the dashboard card.
 */
export function dueCount(certId, allQuestions) {
  return pickSmartReviewQuestions(certId, allQuestions, allQuestions.length).length;
}

/**
 * Summary of rating distribution.
 */
export function ratingDistribution(certId, allQuestions) {
  const state = readState();
  const cs = state.byCert[certId] || { questions: {} };
  let r1 = 0, r2 = 0, r3 = 0, unrated = 0;
  for (const q of allQuestions) {
    const e = cs.questions[q.id];
    if (!e) { unrated++; continue; }
    if (e.rating === 1) r1++;
    else if (e.rating === 2) r2++;
    else if (e.rating === 3) r3++;
    else unrated++;
  }
  return { r1, r2, r3, unrated, total: allQuestions.length };
}
