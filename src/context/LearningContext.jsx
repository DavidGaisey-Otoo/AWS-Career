import { createContext, useCallback, useContext, useMemo } from 'react';
import { LEARNING_CATEGORIES } from '../data/learning.js';
import { WHITEPAPERS } from '../data/whitepapers.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

const LearningContext = createContext(null);

// Per-topic state (deep-merge default into stored value)
const TOPIC_DEFAULTS = {
  conceptRead: false,
  labCompleted: false,
  quizPassed: false,
  bookmarked: false,
  lastStudied: null,
  notes: '',
  quizScores: [],          // [{ score, total, at }]
  flashcardStatus: {},     // { [cardId]: 'known' | 'learning' | 'hard' }
  labMinutes: 0,
  labDifficulty: 0,
  labNotes: '',
};

const WP_DEFAULTS = {
  read: false,
  notes: '',
  flashcardStatus: {},
  lastReadAt: null,
};

const DEFAULT_STATE = {
  topics: {},          // { [topicId]: TOPIC_DEFAULTS }
  whitepapers: {},     // { [wpId]: WP_DEFAULTS }
  digestRead: {},      // { 'YYYY-MM-DD': true }
  digestSaved: [],     // [{ date, itemKey, snippet }]
  fontScale: 1,        // 0.9 / 1 / 1.1 / 1.25
  filters: { difficulty: 'all', status: 'all', bookmarked: false },
};

// Mastery score: 0-100 from concept + lab + quiz + flashcards.
function computeMastery(state, topic) {
  let score = 0;
  if (state.conceptRead) score += 30;
  if (state.labCompleted) score += 25;
  // Best quiz score (out of 100)
  const bestPct = state.quizScores.reduce((m, s) => Math.max(m, (s.score / s.total) * 100), 0);
  score += Math.round(bestPct * 0.25);
  // Flashcard "known" coverage
  const totalCards = (topic.flashcards || []).length || 1;
  const knownCount = Object.entries(state.flashcardStatus)
    .filter(([, v]) => v === 'known').length;
  score += Math.round((knownCount / totalCards) * 20);
  return Math.min(100, Math.round(score));
}

export function LearningProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::learning`, DEFAULT_STATE);

  // --- topic state accessors ---
  const getTopicState = useCallback((topicId) => {
    return { ...TOPIC_DEFAULTS, ...(state.topics?.[topicId] || {}) };
  }, [state.topics]);

  const patchTopic = useCallback((topicId, patch) => {
    setState((s) => ({
      ...s,
      topics: {
        ...s.topics,
        [topicId]: { ...TOPIC_DEFAULTS, ...(s.topics?.[topicId] || {}), ...patch },
      },
    }));
  }, [setState]);

  const toggleBookmark = useCallback((topicId) => {
    setState((s) => {
      const cur = { ...TOPIC_DEFAULTS, ...(s.topics?.[topicId] || {}) };
      return {
        ...s,
        topics: { ...s.topics, [topicId]: { ...cur, bookmarked: !cur.bookmarked } },
      };
    });
  }, [setState]);

  const markConceptRead = useCallback((topicId, val = true) => {
    patchTopic(topicId, { conceptRead: val, lastStudied: new Date().toISOString() });
  }, [patchTopic]);

  const markLabCompleted = useCallback((topicId, val = true) => {
    patchTopic(topicId, { labCompleted: val, lastStudied: new Date().toISOString() });
  }, [patchTopic]);

  const recordQuizScore = useCallback((topicId, score, total) => {
    setState((s) => {
      const cur = { ...TOPIC_DEFAULTS, ...(s.topics?.[topicId] || {}) };
      const passed = (score / total) >= 0.8;
      return {
        ...s,
        topics: {
          ...s.topics,
          [topicId]: {
            ...cur,
            quizScores: [...cur.quizScores, { score, total, at: new Date().toISOString() }].slice(-20),
            quizPassed: cur.quizPassed || passed,
            lastStudied: new Date().toISOString(),
          },
        },
      };
    });
  }, [setState]);

  const setFlashcardStatus = useCallback((topicId, cardId, status) => {
    setState((s) => {
      const cur = { ...TOPIC_DEFAULTS, ...(s.topics?.[topicId] || {}) };
      const fs = { ...cur.flashcardStatus, [cardId]: status };
      return {
        ...s,
        topics: { ...s.topics, [topicId]: { ...cur, flashcardStatus: fs, lastStudied: new Date().toISOString() } },
      };
    });
  }, [setState]);

  const setTopicNotes = useCallback((topicId, notes) => {
    patchTopic(topicId, { notes });
  }, [patchTopic]);

  const setLabFields = useCallback((topicId, patch) => {
    patchTopic(topicId, patch);
  }, [patchTopic]);

  // --- whitepaper state ---
  const getWPState = useCallback((wpId) => ({
    ...WP_DEFAULTS, ...(state.whitepapers?.[wpId] || {}),
  }), [state.whitepapers]);

  const setWPRead = useCallback((wpId, val = true) => {
    setState((s) => ({
      ...s,
      whitepapers: {
        ...s.whitepapers,
        [wpId]: {
          ...WP_DEFAULTS, ...(s.whitepapers?.[wpId] || {}),
          read: val, lastReadAt: new Date().toISOString(),
        },
      },
    }));
  }, [setState]);

  const setWPNotes = useCallback((wpId, notes) => {
    setState((s) => ({
      ...s,
      whitepapers: {
        ...s.whitepapers,
        [wpId]: { ...WP_DEFAULTS, ...(s.whitepapers?.[wpId] || {}), notes },
      },
    }));
  }, [setState]);

  // --- digest ---
  const markDigestRead = useCallback((dateKey) => {
    setState((s) => ({ ...s, digestRead: { ...s.digestRead, [dateKey]: true } }));
  }, [setState]);

  const saveDigestItem = useCallback((dateKey, itemKey, snippet) => {
    setState((s) => ({
      ...s,
      digestSaved: [...s.digestSaved, { dateKey, itemKey, snippet, at: new Date().toISOString() }].slice(-100),
    }));
  }, [setState]);

  // --- UI prefs ---
  const setFontScale = useCallback((n) => setState((s) => ({ ...s, fontScale: n })), [setState]);
  const setFilters = useCallback((patch) => {
    setState((s) => ({ ...s, filters: { ...s.filters, ...patch } }));
  }, [setState]);

  const resetLearning = useCallback(() => setState(DEFAULT_STATE), [setState]);

  // --- derived ---
  const categoryStats = useMemo(() => {
    return LEARNING_CATEGORIES.map((cat) => {
      let conceptDone = 0, labDone = 0, quizDone = 0, masterySum = 0;
      for (const t of cat.topics) {
        const ts = { ...TOPIC_DEFAULTS, ...(state.topics?.[t.id] || {}) };
        if (ts.conceptRead) conceptDone += 1;
        if (ts.labCompleted) labDone += 1;
        if (ts.quizPassed) quizDone += 1;
        masterySum += computeMastery(ts, t);
      }
      const total = cat.topics.length;
      return {
        id: cat.id,
        total,
        conceptPct: total ? Math.round((conceptDone / total) * 100) : 0,
        labPct: total ? Math.round((labDone / total) * 100) : 0,
        quizPct: total ? Math.round((quizDone / total) * 100) : 0,
        avgMastery: total ? Math.round(masterySum / total) : 0,
      };
    });
  }, [state.topics]);

  const bookmarkedTopics = useMemo(() => {
    const out = [];
    for (const cat of LEARNING_CATEGORIES) {
      for (const t of cat.topics) {
        if (state.topics?.[t.id]?.bookmarked) {
          out.push({ category: cat, topic: t });
        }
      }
    }
    return out;
  }, [state.topics]);

  const recentTopics = useMemo(() => {
    const arr = [];
    for (const cat of LEARNING_CATEGORIES) {
      for (const t of cat.topics) {
        const ts = state.topics?.[t.id];
        if (ts?.lastStudied) {
          arr.push({ category: cat, topic: t, at: ts.lastStudied });
        }
      }
    }
    arr.sort((a, b) => new Date(b.at) - new Date(a.at));
    return arr.slice(0, 10);
  }, [state.topics]);

  const overallProgress = useMemo(() => {
    let mastery = 0;
    let count = 0;
    for (const cs of categoryStats) {
      mastery += cs.avgMastery * cs.total;
      count += cs.total;
    }
    return count ? Math.round(mastery / count) : 0;
  }, [categoryStats]);

  const wpProgress = useMemo(() => {
    const read = WHITEPAPERS.filter((w) => state.whitepapers?.[w.id]?.read).length;
    return { read, total: WHITEPAPERS.length };
  }, [state.whitepapers]);

  const masteryFor = useCallback((topicId) => {
    const cat = LEARNING_CATEGORIES.find((c) => c.topics.some((t) => t.id === topicId));
    if (!cat) return 0;
    const topic = cat.topics.find((t) => t.id === topicId);
    return computeMastery(getTopicState(topicId), topic);
  }, [getTopicState]);

  const value = useMemo(() => ({
    state,
    categoryStats,
    bookmarkedTopics,
    recentTopics,
    overallProgress,
    wpProgress,
    getTopicState,
    masteryFor,
    toggleBookmark,
    markConceptRead,
    markLabCompleted,
    recordQuizScore,
    setFlashcardStatus,
    setTopicNotes,
    setLabFields,
    getWPState,
    setWPRead,
    setWPNotes,
    markDigestRead,
    saveDigestItem,
    setFontScale,
    setFilters,
    resetLearning,
  }), [
    state, categoryStats, bookmarkedTopics, recentTopics, overallProgress, wpProgress,
    getTopicState, masteryFor, toggleBookmark, markConceptRead, markLabCompleted,
    recordQuizScore, setFlashcardStatus, setTopicNotes, setLabFields,
    getWPState, setWPRead, setWPNotes,
    markDigestRead, saveDigestItem, setFontScale, setFilters, resetLearning,
  ]);

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
}

export function useLearning() {
  const ctx = useContext(LearningContext);
  if (!ctx) throw new Error('useLearning must be used within LearningProvider');
  return ctx;
}
