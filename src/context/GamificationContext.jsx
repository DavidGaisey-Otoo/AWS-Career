import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useApp } from './AppContext.jsx';
import { useAI } from './AIContext.jsx';
import { useExam } from './ExamContext.jsx';
import { useFreelance } from './FreelanceContext.jsx';
import { useLearning } from './LearningContext.jsx';
import { usePortfolio } from './PortfolioContext.jsx';
import { useRoadmap } from './RoadmapContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import {
  BADGES, LEADERBOARD_SEED, LEADERBOARD_WEEKLY, XP,
  levelForXp, nextLevelInfo,
} from '../data/gamification.js';

const GamificationContext = createContext(null);

const DEFAULT_STATE = {
  bonusXp: 0,                  // additional XP awarded by badge unlocks etc.
  unlockedBadges: {},          // { [badgeId]: ISO date string }
  pendingBadgeQueue: [],       // [{ badgeId, at }]
  pendingLevelUp: null,        // last unhandled level-up { from, to, at }
  acknowledgedLevel: 1,        // highest level the user has "seen"
  loginDays: {},               // { 'YYYY-MM-DD': true }
  lastDailyLoginGrant: null,   // 'YYYY-MM-DD' — guard so we don't double-grant
  streakShieldsUsed: {},       // { 'YYYY-WW': true } — one shield/week
  // Synthetic flags promoted during sessions (live during the tab life)
  sessionStudiedAfterMidnight: false,
};

const todayKey = () => {
  const d = new Date();
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

export function GamificationProvider({ children }) {
  const { profile, addNotification } = useApp();
  const roadmap = useRoadmap();
  const learning = useLearning();
  const exam = useExam();
  const freelance = useFreelance();
  const portfolio = usePortfolio();
  const ai = useAI();

  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::gamification`, DEFAULT_STATE);

  // --------------- daily login XP ---------------
  useEffect(() => {
    const key = todayKey();
    if (state.lastDailyLoginGrant === key) return;
    setState((s) => ({
      ...s,
      bonusXp: (s.bonusXp || 0) + XP.dailyLogin,
      loginDays: { ...s.loginDays, [key]: true },
      lastDailyLoginGrant: key,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --------------- derive a unified context for badge tests ---------------
  const detectionCtx = useMemo(() => {
    // ---- Roadmap signals ----
    const roadmapState = roadmap.state;
    const subtasksDone = Object.values(roadmapState.subtasks || {}).filter(Boolean).length;
    const longestDayMinutes = Math.max(0, ...Object.values(roadmapState.activity || {}));
    const studiedAfterMidnight = state.sessionStudiedAfterMidnight; // session-scoped
    const hour = new Date().getHours();
    const studiedBefore6am = hour < 6 && subtasksDone > 0;
    const studiedAfter3am = hour >= 0 && hour < 4 && subtasksDone > 0;

    // 14-day return detection: most recent activity within 24h, but the gap
    // before that was >= 14 days.
    const days = Object.keys(roadmapState.activity || {}).sort();
    let comebackAfter14d = false;
    if (days.length >= 2) {
      const last = new Date(days[days.length - 1]);
      const prev = new Date(days[days.length - 2]);
      const gapDays = Math.round((last - prev) / 86400000);
      if (gapDays >= 14) comebackAfter14d = true;
    }
    // Weekend weeks: count distinct weeks where both Sat + Sun appear.
    let weekendWeeks = 0;
    const weekHits = {};
    for (const k of days) {
      const dt = new Date(k);
      const dow = dt.getDay(); // 0=Sun,6=Sat
      if (dow !== 0 && dow !== 6) continue;
      const wk = isoWeekKey(dt);
      if (!weekHits[wk]) weekHits[wk] = new Set();
      weekHits[wk].add(dow);
    }
    weekendWeeks = Object.values(weekHits).filter((s) => s.has(0) && s.has(6)).length;

    // Fast-task flag: any task whose logged seconds is < estMinutes × 60 × 0.5
    let fastTaskFlag = false;
    for (const phase of roadmap.roadmap) {
      for (const t of phase.tasks) {
        const sec = roadmapState.taskSeconds?.[t.id] || 0;
        const completedKey = roadmapState.completedTasks?.[t.id];
        if (completedKey && sec > 0 && sec < (t.minutes || 0) * 60 * 0.5) {
          fastTaskFlag = true; break;
        }
      }
      if (fastTaskFlag) break;
    }

    // ---- Learning ----
    let perfectQuizzes = 0;
    let labsDone = 0;
    for (const cat of (learning.state?.topics ? Object.values(learning.state.topics) : [])) {
      labsDone += cat.labCompleted ? 1 : 0;
      for (const sc of cat.quizScores || []) {
        if (sc.total && sc.score === sc.total) perfectQuizzes++;
      }
    }

    // ---- Exam ----
    let bestPercentAny = 0;
    let allDomainsAbove90 = false;
    const exactScores = [];
    for (const cs of exam.certStats) {
      for (const att of (exam.state.certs?.[cs.id]?.attempts || [])) {
        const pct = Math.round((att.correct / att.total) * 100);
        if (pct > bestPercentAny) bestPercentAny = pct;
        if (att.scaledScore) exactScores.push(att.scaledScore);
      }
      // domain mastery all-above-90
      const dom = cs.domainMastery || {};
      const vals = Object.values(dom);
      if (vals.length > 0 && vals.every((v) => v >= 90)) allDomainsAbove90 = true;
    }
    const earnedCount = exam.certStats.filter((c) => c.earned).length;

    // ---- Freelance ----
    const proposalsSent = freelance.state.proposals.length;
    const proposalsResponded = freelance.state.proposals.filter((p) =>
      ['responded', 'hired'].includes(p.status)).length;
    const lifetimeEarningsUSD = freelance.earningsStats.totalUSD;
    const clientsCount = freelance.state.clients.length;
    const fiveStarRatings = freelance.state.clients.filter((c) => (c.rating || 0) >= 5).length;

    // ---- Portfolio ----
    const startedCount = portfolio.projectStats.filter((s) => s.status !== 'not-started').length;
    const completeCount = portfolio.projectStats.filter((s) => s.status === 'complete').length;
    const notesFilledCount = portfolio.projectStats.filter((s) => s.detailScore > 0.2).length;

    // ---- AI / arch ----
    const diagramCount = ai?.state?.diagrams?.length || 0;

    // ---- Community + Wellness (best-effort fallbacks if those contexts mount later) ----
    let community = { helpfulReplies: 0, isMentor: false, postsAuthored: 0 };
    let wellness = { pomodorosDone: 0, journalEntries: 0 };
    try {
      // Lazy read from window so missing contexts don't crash. CommunityProvider + WellnessProvider expose hooks below.
      const c = window.__community_snapshot;
      if (c) community = c;
      const w = window.__wellness_snapshot;
      if (w) wellness = w;
    } catch { /* ignore */ }

    return {
      profile,
      roadmap: {
        subtasksDone,
        streak: roadmapState.streak,
        longestDayMinutes,
        studiedAfterMidnight,
        studiedBefore6am,
        studiedAfter3am,
        comebackAfter14d,
        weekendWeeks,
        fastTaskFlag,
      },
      learning: { perfectQuizzes, labsDone },
      exam: { bestPercentAny, allDomainsAbove90, exactScores, earnedCount },
      freelance: {
        proposalsSent, proposalsResponded, lifetimeEarningsUSD,
        clientsCount, fiveStarRatings, negotiationWin: false,
      },
      portfolio: { startedCount, completeCount, notesFilledCount },
      ai: { diagramCount },
      community,
      wellness,
    };
  }, [profile, roadmap, learning, exam, freelance, portfolio, ai, state.sessionStudiedAfterMidnight]);

  // --------------- compute aggregated XP ---------------
  const xpBreakdown = useMemo(() => {
    const subtasks = detectionCtx.roadmap.subtasksDone * XP.subtask;
    const tasksDone = Object.keys(roadmap.state.completedTasks || {}).length;
    const tasks = tasksDone * XP.task;
    const phases = Object.keys(roadmap.state.completedPhases || {}).length * XP.phase;
    const projects = detectionCtx.portfolio.completeCount * XP.project;
    const quizzes = countTopicsPassedQuiz(learning) * XP.topicQuizPass;
    const labs = detectionCtx.learning.labsDone * XP.labComplete;
    const examPasses = countExamPasses(exam) * XP.examPass;
    const proposals = detectionCtx.freelance.proposalsSent * XP.proposalSent;
    const responses = detectionCtx.freelance.proposalsResponded * XP.clientResponse;
    const clients = detectionCtx.freelance.clientsCount * XP.clientLanded;
    const firstDollar = detectionCtx.freelance.lifetimeEarningsUSD > 0 ? XP.firstDollar : 0;
    const loginBonus = Object.keys(state.loginDays || {}).length * XP.dailyLogin;
    const streak7 = (detectionCtx.roadmap.streak?.longest || 0) >= 7 ? XP.streak7 : 0;
    const streak30 = (detectionCtx.roadmap.streak?.longest || 0) >= 30 ? XP.streak30 : 0;
    const streak100 = (detectionCtx.roadmap.streak?.longest || 0) >= 100 ? XP.streak100 : 0;
    const bonus = state.bonusXp || 0;

    const rows = [
      { label: 'Subtasks ticked',  value: subtasks },
      { label: 'Tasks completed',  value: tasks },
      { label: 'Phases completed', value: phases },
      { label: 'Projects shipped', value: projects },
      { label: 'Topic quizzes passed', value: quizzes },
      { label: 'Labs completed',   value: labs },
      { label: 'Exam passes',      value: examPasses },
      { label: 'Proposals sent',   value: proposals },
      { label: 'Client responses', value: responses },
      { label: 'Clients landed',   value: clients },
      { label: 'First dollar',     value: firstDollar },
      { label: 'Daily logins',     value: loginBonus },
      { label: '7-day streak',     value: streak7 },
      { label: '30-day streak',    value: streak30 },
      { label: '100-day streak',   value: streak100 },
      { label: 'Badge bonuses',    value: bonus },
    ];
    const total = rows.reduce((s, r) => s + r.value, 0);
    return { rows, total };
  }, [detectionCtx, roadmap.state, learning, exam, state]);

  const totalXp = xpBreakdown.total;
  const level = useMemo(() => levelForXp(totalXp), [totalXp]);
  const next = useMemo(() => nextLevelInfo(totalXp), [totalXp]);

  // --------------- detect newly unlocked badges + level-ups ---------------
  const lastLevelRef = useRef(level.n);
  useEffect(() => {
    // Badges
    const newly = [];
    let extraXp = 0;
    for (const b of BADGES) {
      if (state.unlockedBadges[b.id]) continue;
      try {
        if (b.test && b.test(detectionCtx)) {
          newly.push({ badgeId: b.id, at: new Date().toISOString() });
          extraXp += b.xp || 0;
        }
      } catch { /* tolerate test errors */ }
    }
    if (newly.length > 0) {
      setState((s) => ({
        ...s,
        unlockedBadges: {
          ...s.unlockedBadges,
          ...Object.fromEntries(newly.map((n) => [n.badgeId, n.at])),
        },
        pendingBadgeQueue: [...(s.pendingBadgeQueue || []), ...newly],
        bonusXp: (s.bonusXp || 0) + extraXp,
      }));
      // Add a single notification for any batch unlock
      addNotification?.({
        title: newly.length === 1 ? 'Badge unlocked!' : `${newly.length} badges unlocked!`,
        body: newly.slice(0, 3).map((n) => BADGES.find((b) => b.id === n.badgeId)?.name).filter(Boolean).join(', '),
        type: 'success',
      });
    }
  }, [detectionCtx]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Level-ups
    if (level.n > lastLevelRef.current) {
      const from = lastLevelRef.current;
      const to = level.n;
      lastLevelRef.current = level.n;
      setState((s) => ({
        ...s,
        pendingLevelUp: { from, to, at: new Date().toISOString() },
      }));
      addNotification?.({
        title: `Level up — ${level.name}!`,
        body: `You\'ve reached level ${level.n}. Keep going.`,
        type: 'success',
      });
    }
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  const consumeLevelUp = useCallback(() => {
    setState((s) => ({ ...s, pendingLevelUp: null, acknowledgedLevel: s.pendingLevelUp?.to ?? s.acknowledgedLevel }));
  }, [setState]);

  const dismissNextBadge = useCallback(() => {
    setState((s) => {
      const [, ...rest] = s.pendingBadgeQueue || [];
      return { ...s, pendingBadgeQueue: rest };
    });
  }, [setState]);

  // --------------- streak shield: one-per-week protection ---------------
  const weekKey = isoWeekKey(new Date());
  const shieldUsedThisWeek = !!state.streakShieldsUsed[weekKey];
  const useStreakShield = useCallback(() => {
    setState((s) => ({ ...s, streakShieldsUsed: { ...s.streakShieldsUsed, [weekKey]: true } }));
  }, [setState, weekKey]);

  // --------------- leaderboards ---------------
  const leaderboards = useMemo(() => {
    const me = {
      id: 'me',
      name: profile?.name || 'You',
      country: 'Ghana',
      country_flag: '🇬🇭',
      isMe: true,
      xp: totalXp,
    };
    // All-time global: sort by xp
    const global = [...LEADERBOARD_SEED, me]
      .sort((a, b) => b.xp - a.xp)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    // Country (Ghana)
    const country = global.filter((u) => u.country === 'Ghana')
      .map((u, i) => ({ ...u, rank: i + 1 }));

    // Weekly synthetic
    const weeklyMe = { ...me, weeklyXp: Math.min(totalXp, 1800) };
    const weekly = [
      ...LEADERBOARD_SEED.map((u) => ({ ...u, weeklyXp: (LEADERBOARD_WEEKLY.find((w) => w.id === u.id) || {}).weeklyXp || 0 })),
      weeklyMe,
    ].sort((a, b) => b.weeklyXp - a.weeklyXp).map((u, i) => ({ ...u, rank: i + 1 }));

    const myGlobalRank = global.find((u) => u.isMe)?.rank;
    const myCountryRank = country.find((u) => u.isMe)?.rank;
    const myWeeklyRank = weekly.find((u) => u.isMe)?.rank;

    return { global, country, weekly, myGlobalRank, myCountryRank, myWeeklyRank, me };
  }, [totalXp, profile?.name]);

  // --------------- badges by category ---------------
  const badgeView = useMemo(() => {
    return BADGES.map((b) => ({
      ...b,
      unlockedAt: state.unlockedBadges[b.id] || null,
      unlocked: !!state.unlockedBadges[b.id],
    }));
  }, [state.unlockedBadges]);

  const unlockedCount = badgeView.filter((b) => b.unlocked).length;

  // --------------- reset ---------------
  const resetGamification = useCallback(() => setState(DEFAULT_STATE), [setState]);

  const value = useMemo(() => ({
    totalXp,
    level,
    next,
    xpBreakdown,
    badgeView,
    unlockedCount,
    pendingBadgeQueue: state.pendingBadgeQueue,
    pendingLevelUp: state.pendingLevelUp,
    consumeLevelUp,
    dismissNextBadge,
    leaderboards,
    streak: detectionCtx.roadmap.streak,
    shieldUsedThisWeek,
    useStreakShield,
    resetGamification,
  }), [
    totalXp, level, next, xpBreakdown, badgeView, unlockedCount,
    state.pendingBadgeQueue, state.pendingLevelUp,
    consumeLevelUp, dismissNextBadge, leaderboards,
    detectionCtx.roadmap.streak, shieldUsedThisWeek, useStreakShield, resetGamification,
  ]);

  return <GamificationContext.Provider value={value}>{children}</GamificationContext.Provider>;
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within GamificationProvider');
  return ctx;
}

// ---------- helpers ----------

function isoWeekKey(d) {
  // ISO week (yyyy-ww). Good enough for shield rate limiting.
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date - firstThursday) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function countTopicsPassedQuiz(learning) {
  const topics = learning.state?.topics ? Object.values(learning.state.topics) : [];
  return topics.filter((t) => t.quizPassed).length;
}

function countExamPasses(exam) {
  let n = 0;
  for (const certId of Object.keys(exam.state.certs || {})) {
    for (const att of (exam.state.certs[certId].attempts || [])) {
      if (att.passed) n++;
    }
  }
  return n;
}
