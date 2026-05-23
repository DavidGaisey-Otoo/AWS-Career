import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const WellnessContext = createContext(null);

const DEFAULT_STATE = {
  pomo: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLong: 4,
    soundOn: true,
    dndOn: false,
  },
  pomoLog: [],            // [{ id, at, kind: 'work'|'short'|'long', minutes }]
  schedule: {},           // { 'monday': [{ id, start: 'HH:MM', minutes, kind, label }], 'today': ... }
  scheduleDone: {},       // { [blockId]: ISO }
  energyLog: {},          // { 'YYYY-MM-DD': 1..10 }
  focusLog: [],           // [{ at, score }]
  waterLog: {},           // { 'YYYY-MM-DD': count }
  reminders: {
    water: true,
    eyeBreak: true,
    stretch: true,
  },
  journal: [],            // [{ id, week: 'YYYY-WW', at, answers: { q1, q2, q3, q4, q5 } }]
};

export function WellnessProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::wellness`, DEFAULT_STATE);

  // Snapshot for gamification
  useEffect(() => {
    const pomodorosDone = state.pomoLog.filter((p) => p.kind === 'work').length;
    const journalEntries = state.journal.length;
    window.__wellness_snapshot = { pomodorosDone, journalEntries };
    return () => { delete window.__wellness_snapshot; };
  }, [state]);

  // ---------- pomodoro ----------
  const setPomoSettings = useCallback((patch) => {
    setState((s) => ({ ...s, pomo: { ...s.pomo, ...patch } }));
  }, [setState]);

  const logPomo = useCallback((kind, minutes) => {
    setState((s) => ({
      ...s,
      pomoLog: [{ id: uid(), at: new Date().toISOString(), kind, minutes }, ...s.pomoLog].slice(0, 500),
    }));
  }, [setState]);

  // ---------- schedule ----------
  const addBlock = useCallback((day, block) => {
    setState((s) => ({
      ...s,
      schedule: {
        ...s.schedule,
        [day]: [...(s.schedule[day] || []), { id: uid(), ...block }]
                 .sort((a, b) => a.start.localeCompare(b.start)),
      },
    }));
  }, [setState]);

  const removeBlock = useCallback((day, blockId) => {
    setState((s) => ({
      ...s,
      schedule: { ...s.schedule, [day]: (s.schedule[day] || []).filter((b) => b.id !== blockId) },
    }));
  }, [setState]);

  const toggleBlockDone = useCallback((blockId) => {
    setState((s) => {
      const next = { ...s.scheduleDone };
      if (next[blockId]) delete next[blockId];
      else next[blockId] = new Date().toISOString();
      return { ...s, scheduleDone: next };
    });
  }, [setState]);

  // ---------- wellness logs ----------
  const setEnergy = useCallback((score) => {
    const today = new Date().toISOString().slice(0, 10);
    setState((s) => ({ ...s, energyLog: { ...s.energyLog, [today]: score } }));
  }, [setState]);

  const logFocus = useCallback((score) => {
    setState((s) => ({ ...s, focusLog: [{ at: new Date().toISOString(), score }, ...s.focusLog].slice(0, 200) }));
  }, [setState]);

  const incWater = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setState((s) => ({ ...s, waterLog: { ...s.waterLog, [today]: (s.waterLog[today] || 0) + 1 } }));
  }, [setState]);

  const setReminders = useCallback((patch) => {
    setState((s) => ({ ...s, reminders: { ...s.reminders, ...patch } }));
  }, [setState]);

  // ---------- journal ----------
  const addJournal = useCallback((entry) => {
    const week = isoWeekKey(new Date());
    setState((s) => ({
      ...s,
      journal: [{ id: uid(), at: new Date().toISOString(), week, ...entry }, ...s.journal],
    }));
  }, [setState]);

  // ---------- derived ----------
  const todayKey = new Date().toISOString().slice(0, 10);
  const pomodorosToday = useMemo(() =>
    state.pomoLog.filter((p) => p.kind === 'work' && p.at.startsWith(todayKey)).length,
  [state.pomoLog, todayKey]);

  const waterToday = state.waterLog[todayKey] || 0;
  const energyToday = state.energyLog[todayKey] || null;

  // 14-day burnout signal: high study minutes AND no rest days
  const burnoutRisk = useMemo(() => {
    const last14 = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const sessions = state.pomoLog.filter((p) => p.kind === 'work' && p.at.startsWith(key)).length;
      last14.push({ key, sessions });
    }
    const totalSessions = last14.reduce((s, d) => s + d.sessions, 0);
    const restDays = last14.filter((d) => d.sessions === 0).length;
    let level = 'low';
    if (totalSessions > 60 && restDays < 2) level = 'high';
    else if (totalSessions > 40 && restDays < 4) level = 'moderate';
    const recommendRest = level === 'high';
    return { level, totalSessions, restDays, recommendRest };
  }, [state.pomoLog]);

  // Streak of "followed schedule" days
  const scheduleStreak = useMemo(() => {
    // Count consecutive days back from today where at least one block was marked done
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const has = Object.values(state.scheduleDone).some((iso) => iso.startsWith(key));
      if (has) streak++;
      else break;
    }
    return streak;
  }, [state.scheduleDone]);

  const resetWellness = useCallback(() => setState(DEFAULT_STATE), [setState]);

  const value = useMemo(() => ({
    state,
    setPomoSettings, logPomo,
    addBlock, removeBlock, toggleBlockDone,
    setEnergy, logFocus, incWater, setReminders,
    addJournal,
    pomodorosToday, waterToday, energyToday,
    burnoutRisk, scheduleStreak,
    resetWellness,
  }), [
    state, setPomoSettings, logPomo, addBlock, removeBlock, toggleBlockDone,
    setEnergy, logFocus, incWater, setReminders, addJournal,
    pomodorosToday, waterToday, energyToday, burnoutRisk, scheduleStreak, resetWellness,
  ]);

  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness() {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error('useWellness must be used within WellnessProvider');
  return ctx;
}

function isoWeekKey(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date - firstThursday) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
