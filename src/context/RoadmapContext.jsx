import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { ROADMAP, flattenSubtasks, totalSubtaskCount } from '../data/roadmap.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

const RoadmapContext = createContext(null);

const XP_PER_SUBTASK = 10;
const XP_PER_TASK_COMPLETE = 25;
const XP_PER_PHASE_COMPLETE = 250;

const DEFAULT_STATE = {
  subtasks: {},        // { [subtaskId]: true }
  taskSeconds: {},     // { [taskId]: number }
  taskNotes: {},       // { [taskId]: string }
  taskDifficulty: {},  // { [taskId]: 1..5 }
  taskBlocked: {},     // { [taskId]: { blocked, reason } }
  completedTasks: {},  // { [taskId]: ISOString }
  completedPhases: {}, // { [phaseId]: ISOString }
  xp: 0,
  streak: { current: 0, longest: 0, lastActiveDate: null },
  activity: {},        // { 'YYYY-MM-DD': minutesLogged }
  muted: false,
};

const todayKey = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

const dayDiff = (a, b) => {
  const ms = new Date(b) - new Date(a);
  return Math.round(ms / 86400000);
};

export function RoadmapProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::roadmap`, DEFAULT_STATE);
  // Mirror of state for reducer-free reads — keeps batched callers in sync
  // across the same synchronous click loop (e.g. cascading subtask ticks).
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);
  // ---------- transient UI state ----------
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [xpFloaters, setXpFloaters] = useState([]); // [{ id, amount, x, y }]
  const [achievement, setAchievement] = useState(null); // { title, body, badge }
  const [phaseJustCompleted, setPhaseJustCompleted] = useState(null);

  // Heartbeat for active timers — drives the running clock display
  const [tick, setTick] = useState(0);
  const timers = useRef({}); // { [taskId]: { startedAt, intervalId } }

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  // ---------- mutation helpers (always merge into state) ----------
  const patch = useCallback((updater) => {
    setState((s) => {
      const next = typeof updater === 'function' ? updater(s) : updater;
      return { ...s, ...next };
    });
  }, [setState]);

  // ---------- derived: completion ----------
  const phaseStats = useMemo(() => {
    return ROADMAP.map((phase) => {
      let tasksDone = 0;
      let subsTotal = 0;
      let subsDone = 0;
      for (const task of phase.tasks) {
        subsTotal += task.subtasks.length;
        let allTaskSubsDone = task.subtasks.length > 0;
        for (const sub of task.subtasks) {
          if (state.subtasks[sub.id]) subsDone += 1;
          else allTaskSubsDone = false;
        }
        if (allTaskSubsDone) tasksDone += 1;
      }
      return {
        id: phase.id,
        tasksDone,
        tasksTotal: phase.tasks.length,
        subsDone,
        subsTotal,
        percent: subsTotal === 0 ? 0 : Math.round((subsDone / subsTotal) * 100),
        complete: subsTotal > 0 && subsDone === subsTotal,
      };
    });
  }, [state.subtasks]);

  const overall = useMemo(() => {
    const subsDone = phaseStats.reduce((a, p) => a + p.subsDone, 0);
    const subsTotal = totalSubtaskCount();
    const percent = subsTotal === 0 ? 0 : (subsDone / subsTotal) * 100;
    const phasesComplete = phaseStats.filter((p) => p.complete).length;
    return {
      subsDone,
      subsTotal,
      percent,
      phasesComplete,
      phasesTotal: ROADMAP.length,
    };
  }, [phaseStats]);

  const totalSecondsLogged = useMemo(
    () => Object.values(state.taskSeconds).reduce((a, b) => a + (b || 0), 0),
    [state.taskSeconds]
  );

  // ---------- pace + projected completion ----------
  const pace = useMemo(() => {
    const days = Object.keys(state.activity);
    if (days.length < 3) {
      return { perDay: 0, projectedDays: null, projectedDate: null, status: 'gathering' };
    }
    const sortedDays = days.sort();
    const recent = sortedDays.slice(-14);
    const subsByDay = recent.map((d) => state.activity[d]?.subtasks || 0);
    const avg = subsByDay.reduce((a, b) => a + b, 0) / recent.length;
    const remaining = overall.subsTotal - overall.subsDone;
    if (avg < 0.1) {
      return { perDay: avg, projectedDays: null, projectedDate: null, status: 'stalled' };
    }
    const projectedDays = Math.ceil(remaining / avg);
    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + projectedDays);
    // Status vs. an idealized 1 subtask/day baseline
    const status = avg >= 1.5 ? 'ahead' : avg >= 0.7 ? 'on-track' : 'behind';
    return { perDay: avg, projectedDays, projectedDate, status };
  }, [state.activity, overall.subsDone, overall.subsTotal]);

  // Spawn a UI-only floating "+XP" animation. Does not mutate xp state —
  // xp is mutated inside the unified toggleSubtask reducer below.
  const spawnXPFloater = useCallback((amount, rect, offsetY = 0) => {
    const id = Math.random().toString(36).slice(2);
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + offsetY : 120;
    setXpFloaters((arr) => [...arr, { id, amount, x, y }]);
    setTimeout(() => setXpFloaters((arr) => arr.filter((f) => f.id !== id)), 1500);
  }, []);

  // Time-only activity update (used by timers, not subtasks).
  const recordSeconds = useCallback((seconds) => {
    setState((s) => {
      const key = todayKey();
      const today = s.activity[key] || { subtasks: 0, seconds: 0 };
      return {
        ...s,
        activity: { ...s.activity, [key]: { subtasks: today.subtasks, seconds: today.seconds + seconds } },
      };
    });
  }, [setState]);

  // ---------- tick sound (web audio) ----------
  // Defined here (before toggleSubtask) because toggleSubtask references it
  // in its dep array.
  const playTick = useCallback(() => {
    if (state.muted) return;
    try {
      const ctx = window.__awsclAudio || (window.__awsclAudio = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle';
      o.frequency.value = 880;
      g.gain.value = 0;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.005);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
      o.start();
      o.stop(ctx.currentTime + 0.2);
    } catch {
      /* audio not supported — silently ignore */
    }
  }, [state.muted]);

  // ---------- core action ----------
  // Single PURE functional reducer that handles every consequence of ticking
  // a subtask: completion detection, XP, streak, activity, completion stamps.
  // Because it's pure, React 18 StrictMode's double-invocation produces the
  // same `next` snapshot both times — no duplicated mutations.
  //
  // UI-only side effects (floaters, sound, achievement popup) fire OUTSIDE
  // setState exactly once. Cross-tick prediction uses `stateRef` (synced by
  // useEffect), which is good enough for animations even if a fast cascade
  // makes the prediction slightly racy.
  const toggleSubtask = useCallback((subtaskId, taskId, phaseId, evt) => {
    const rect = evt?.currentTarget?.getBoundingClientRect?.();

    // Predict for UI side effects only — authoritative state lives in setState below.
    // We also synchronously mutate stateRef so a *cascade* of click handlers
    // in the same event loop each see the updated snapshot for its prediction.
    const s0 = stateRef.current;
    const becomingOn = !s0.subtasks[subtaskId];
    const projectedSubs = { ...s0.subtasks, [subtaskId]: becomingOn };
    let willCompleteTask = false;
    let willCompletePhase = false;
    let phaseTitleForPopup = '';
    const projectedRef = { ...s0, subtasks: projectedSubs };
    if (becomingOn) {
      const task = ROADMAP.flatMap((p) => p.tasks).find((t) => t.id === taskId);
      if (task && task.subtasks.every((sub) => projectedSubs[sub.id]) && !s0.completedTasks[taskId]) {
        willCompleteTask = true;
        projectedRef.completedTasks = { ...s0.completedTasks, [taskId]: 'pending' };
        const phase = ROADMAP.find((p) => p.id === phaseId);
        if (phase &&
            phase.tasks.every((t) => t.subtasks.every((sub) => projectedSubs[sub.id])) &&
            !s0.completedPhases[phaseId]) {
          willCompletePhase = true;
          phaseTitleForPopup = phase.title;
          projectedRef.completedPhases = { ...s0.completedPhases, [phaseId]: 'pending' };
        }
      }
    } else {
      if (s0.completedTasks[taskId]) {
        const ct = { ...s0.completedTasks }; delete ct[taskId];
        projectedRef.completedTasks = ct;
      }
      if (s0.completedPhases[phaseId]) {
        const cp = { ...s0.completedPhases }; delete cp[phaseId];
        projectedRef.completedPhases = cp;
      }
    }
    // Sync the ref synchronously — useEffect will overwrite with authoritative
    // state on the next commit, which is fine because the reducer is the source of truth.
    stateRef.current = projectedRef;

    setState((s) => {
      const wasOn = !!s.subtasks[subtaskId];
      const newOn = !wasOn;
      const next = { ...s, subtasks: { ...s.subtasks, [subtaskId]: newOn } };

      if (!newOn) {
        // un-tick: drop dependent completion stamps
        if (s.completedTasks[taskId]) {
          const ct = { ...s.completedTasks }; delete ct[taskId];
          next.completedTasks = ct;
        }
        if (s.completedPhases[phaseId]) {
          const cp = { ...s.completedPhases }; delete cp[phaseId];
          next.completedPhases = cp;
        }
        return next;
      }

      // Compute completion against this functional snapshot
      let xpGained = XP_PER_SUBTASK;
      const task = ROADMAP.flatMap((p) => p.tasks).find((t) => t.id === taskId);
      if (task && task.subtasks.every((sub) => next.subtasks[sub.id]) && !s.completedTasks[taskId]) {
        next.completedTasks = { ...s.completedTasks, [taskId]: new Date().toISOString() };
        xpGained += XP_PER_TASK_COMPLETE;
        const phase = ROADMAP.find((p) => p.id === phaseId);
        if (phase &&
            phase.tasks.every((t) => t.subtasks.every((sub) => next.subtasks[sub.id])) &&
            !s.completedPhases[phaseId]) {
          next.completedPhases = { ...s.completedPhases, [phaseId]: new Date().toISOString() };
          xpGained += XP_PER_PHASE_COMPLETE;
        }
      }
      next.xp = (s.xp || 0) + xpGained;

      // Activity + streak (pure derivations)
      const key = todayKey();
      const today = s.activity[key] || { subtasks: 0, seconds: 0 };
      next.activity = {
        ...s.activity,
        [key]: { subtasks: today.subtasks + 1, seconds: today.seconds },
      };
      const last = s.streak.lastActiveDate;
      if (!last) {
        next.streak = { current: 1, longest: Math.max(1, s.streak.longest), lastActiveDate: key };
      } else if (last === key) {
        next.streak = s.streak; // already counted today
      } else if (dayDiff(last, key) === 1) {
        const current = s.streak.current + 1;
        next.streak = { current, longest: Math.max(current, s.streak.longest), lastActiveDate: key };
      } else {
        next.streak = { current: 1, longest: Math.max(1, s.streak.longest), lastActiveDate: key };
      }
      return next;
    });

    // One-shot UI side effects
    if (becomingOn) {
      spawnXPFloater(XP_PER_SUBTASK, rect);
      if (willCompleteTask)  spawnXPFloater(XP_PER_TASK_COMPLETE, rect, -30);
      if (willCompletePhase) {
        spawnXPFloater(XP_PER_PHASE_COMPLETE, rect, -60);
        setPhaseJustCompleted({ phaseId, title: phaseTitleForPopup });
        setAchievement({
          title: 'Phase complete!',
          body: `${phaseTitleForPopup} — ${XP_PER_PHASE_COMPLETE} XP bonus`,
          badge: '🏆',
        });
      }
      playTick();
    }
  }, [setState, spawnXPFloater, playTick]);

  // ---------- timer ----------
  const isTimerRunning = useCallback((taskId) => !!timers.current[taskId], []);

  const elapsedSeconds = useCallback((taskId) => {
    const base = state.taskSeconds[taskId] || 0;
    const running = timers.current[taskId];
    if (!running) return base;
    return base + Math.floor((Date.now() - running.startedAt) / 1000);
  }, [state.taskSeconds, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = useCallback((taskId) => {
    if (timers.current[taskId]) return;
    timers.current[taskId] = { startedAt: Date.now() };
    setTick((t) => t + 1);
  }, []);

  const stopTimer = useCallback((taskId) => {
    const t = timers.current[taskId];
    if (!t) return;
    const elapsed = Math.floor((Date.now() - t.startedAt) / 1000);
    delete timers.current[taskId];
    setState((s) => ({
      ...s,
      taskSeconds: { ...s.taskSeconds, [taskId]: (s.taskSeconds[taskId] || 0) + elapsed },
    }));
    recordSeconds(elapsed);
    setTick((tk) => tk + 1);
  }, [setState, recordSeconds]);

  const resetTimer = useCallback((taskId) => {
    if (timers.current[taskId]) delete timers.current[taskId];
    setState((s) => ({
      ...s,
      taskSeconds: { ...s.taskSeconds, [taskId]: 0 },
    }));
  }, [setState]);

  // ---------- per-task fields ----------
  const setTaskNotes = useCallback((taskId, notes) => {
    setState((s) => ({ ...s, taskNotes: { ...s.taskNotes, [taskId]: notes } }));
  }, [setState]);

  const setTaskDifficulty = useCallback((taskId, n) => {
    setState((s) => ({ ...s, taskDifficulty: { ...s.taskDifficulty, [taskId]: n } }));
  }, [setState]);

  const setTaskBlocked = useCallback((taskId, blocked, reason = '') => {
    setState((s) => ({
      ...s,
      taskBlocked: { ...s.taskBlocked, [taskId]: { blocked, reason } },
    }));
  }, [setState]);

  // ---------- meta ----------
  const resetRoadmap = useCallback(() => {
    setState(DEFAULT_STATE);
  }, [setState]);

  const setMuted = useCallback((m) => {
    setState((s) => ({ ...s, muted: m }));
  }, [setState]);

  const dismissAchievement = useCallback(() => setAchievement(null), []);
  const consumePhaseJustCompleted = useCallback(() => setPhaseJustCompleted(null), []);

  // ---------- task helpers consumed by UI ----------
  const getTaskState = useCallback((task) => {
    const total = task.subtasks.length;
    const done = task.subtasks.filter((s) => state.subtasks[s.id]).length;
    const blocked = state.taskBlocked[task.id]?.blocked;
    let status = 'not-started';
    if (blocked) status = 'blocked';
    else if (done === total && total > 0) status = 'complete';
    else if (done > 0) status = 'in-progress';
    return { done, total, percent: total ? Math.round((done / total) * 100) : 0, status };
  }, [state.subtasks, state.taskBlocked]);

  const value = useMemo(() => ({
    roadmap: ROADMAP,
    state,
    overall,
    phaseStats,
    totalSecondsLogged,
    pace,
    xpFloaters,
    achievement,
    phaseJustCompleted,
    activeTaskId,
    setActiveTaskId,
    toggleSubtask,
    startTimer, stopTimer, resetTimer, isTimerRunning, elapsedSeconds,
    setTaskNotes, setTaskDifficulty, setTaskBlocked,
    dismissAchievement, consumePhaseJustCompleted,
    resetRoadmap, setMuted, playTick,
    getTaskState,
  }), [
    state, overall, phaseStats, totalSecondsLogged, pace, xpFloaters, achievement,
    phaseJustCompleted, activeTaskId,
    toggleSubtask, startTimer, stopTimer, resetTimer, isTimerRunning, elapsedSeconds,
    setTaskNotes, setTaskDifficulty, setTaskBlocked,
    dismissAchievement, consumePhaseJustCompleted, resetRoadmap, setMuted, playTick,
    getTaskState,
  ]);

  return <RoadmapContext.Provider value={value}>{children}</RoadmapContext.Provider>;
}

export function useRoadmap() {
  const ctx = useContext(RoadmapContext);
  if (!ctx) throw new Error('useRoadmap must be used within RoadmapProvider');
  return ctx;
}
