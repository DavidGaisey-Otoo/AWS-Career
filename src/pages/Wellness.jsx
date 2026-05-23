import { motion } from 'framer-motion';
import {
  Activity, AlertOctagon, Battery, Calendar, ClipboardCopy, Coffee, Droplet,
  Eye, Heart, Pause, Play, Plus, Quote, RotateCcw, Sparkles, Square, Sun,
  Target, Timer, Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useWellness } from '../context/WellnessContext.jsx';
import { cn, uid, formatDate } from '../lib/utils.js';

const TABS = [
  { id: 'pomodoro', label: 'Pomodoro',  icon: Timer },
  { id: 'schedule', label: 'Schedule',  icon: Calendar },
  { id: 'wellness', label: 'Wellness',  icon: Heart },
  { id: 'journal',  label: 'Reflection',icon: Quote },
];

export default function Wellness() {
  const [tab, setTab] = useState('pomodoro');
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Wellness + productivity"
        title="Sustainable beats heroic."
        subtitle="Pomodoro timer, daily schedule, body trackers, weekly reflection. Burnout is the enemy of compounding."
        icon={Heart}
      />

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                      tab === t.id ? 'bg-gradient-aws text-ink-950 shadow-glow-orange' : 'text-muted hover:text-current'
                    )}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <motion.div key={tab}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {tab === 'pomodoro' && <Pomodoro />}
        {tab === 'schedule' && <SchedulePlanner />}
        {tab === 'wellness' && <WellnessTrackers />}
        {tab === 'journal'  && <ReflectionJournal />}
      </motion.div>
    </div>
  );
}

// ============================ POMODORO ============================

function Pomodoro() {
  const { state, setPomoSettings, logPomo, pomodorosToday } = useWellness();
  const toast = useToast();
  const [mode, setMode] = useState('work');         // work | short | long
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(state.pomo.workMinutes * 60);
  const [sessionsThisRun, setSessionsThisRun] = useState(0);
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Recompute secondsLeft when mode changes
  useEffect(() => {
    const m = mode === 'work' ? state.pomo.workMinutes
            : mode === 'short' ? state.pomo.shortBreakMinutes
            : state.pomo.longBreakMinutes;
    setSecondsLeft(m * 60);
  }, [mode, state.pomo]);

  // Tick
  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          handleComplete();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const handleComplete = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    chime(state.pomo.soundOn);
    const m = mode === 'work' ? state.pomo.workMinutes
            : mode === 'short' ? state.pomo.shortBreakMinutes
            : state.pomo.longBreakMinutes;
    logPomo(mode, m);
    toast.success(mode === 'work' ? `Work session #${pomodorosToday + 1} complete.` : 'Break done.', {
      description: mode === 'work' ? 'Time to stretch + drink water.' : 'Back to deep work.',
    });
    // Auto-advance
    if (mode === 'work') {
      const nextSessions = sessionsThisRun + 1;
      setSessionsThisRun(nextSessions);
      const next = nextSessions % state.pomo.sessionsBeforeLong === 0 ? 'long' : 'short';
      setMode(next);
    } else {
      setMode('work');
    }
  };

  const totalSec = (mode === 'work' ? state.pomo.workMinutes
                 : mode === 'short' ? state.pomo.shortBreakMinutes
                 : state.pomo.longBreakMinutes) * 60;
  const pct = Math.round(((totalSec - secondsLeft) / totalSec) * 100);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const breakSuggestions = [
    'Stand up. Walk to the nearest window.',
    'Drink a full glass of water.',
    'Stretch shoulders + neck for 60 seconds.',
    'Look at something 20 feet away for 20 seconds.',
    'Do 10 push-ups or squats.',
    'Splash cold water on your face.',
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="surface rounded-3xl p-6 gradient-border relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col items-center">
          {/* Mode pills */}
          <div className="inline-flex items-center bg-[var(--card-2)] border border-token rounded-xl p-1 mb-5">
            {[{ id: 'work', label: 'Work' }, { id: 'short', label: 'Short break' }, { id: 'long', label: 'Long break' }].map((m) => (
              <button key={m.id} onClick={() => { setMode(m.id); setRunning(false); }}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-bold transition',
                        mode === m.id ? 'bg-aws-orange text-ink-950' : 'text-muted hover:text-current'
                      )}>{m.label}</button>
            ))}
          </div>

          {/* Big ring + time */}
          <div className="relative">
            <svg width={260} height={260} viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="46" fill="none" stroke="var(--card-2)" strokeWidth="6" />
              <motion.circle
                cx="50" cy="50" r="46" fill="none" strokeLinecap="round"
                stroke="url(#pgrad)" strokeWidth="6"
                strokeDasharray={`${(pct / 100) * 289} 289`}
                transition={{ duration: 0.4 }}
              />
              <defs>
                <linearGradient id="pgrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#FF9900" />
                  <stop offset="100%" stopColor="#00D4FF" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-5xl font-black tabular-nums tracking-tight">{fmt(secondsLeft)}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">{mode}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-5 flex items-center gap-2">
            {!running ? (
              <button onClick={() => setRunning(true)} className="btn btn-primary">
                <Play size={14} /> Start
              </button>
            ) : (
              <button onClick={() => setRunning(false)} className="btn btn-primary">
                <Pause size={14} /> Pause
              </button>
            )}
            <button onClick={() => { setRunning(false); setSecondsLeft(totalSec); }} className="btn btn-ghost">
              <Square size={14} /> Stop
            </button>
            <button onClick={() => { setRunning(false); setSecondsLeft(totalSec); }} className="btn btn-ghost">
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          {/* Counters */}
          <div className="mt-5 grid grid-cols-3 gap-2 text-xs w-full max-w-md">
            <Stat label="Today"   value={`${pomodorosToday} 🍅`} />
            <Stat label="This run" value={sessionsThisRun} />
            <Stat label="Mode"    value={mode === 'work' ? 'Focus' : 'Break'} />
          </div>
        </div>
      </div>

      {/* Settings + suggestions */}
      <div className="space-y-3">
        <div className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Settings</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <NumField label="Work min"  value={state.pomo.workMinutes}  onChange={(v) => setPomoSettings({ workMinutes: clamp(v, 5, 120) })} />
            <NumField label="Short min" value={state.pomo.shortBreakMinutes} onChange={(v) => setPomoSettings({ shortBreakMinutes: clamp(v, 1, 60) })} />
            <NumField label="Long min"  value={state.pomo.longBreakMinutes}  onChange={(v) => setPomoSettings({ longBreakMinutes: clamp(v, 1, 60) })} />
            <NumField label="Sessions/long" value={state.pomo.sessionsBeforeLong} onChange={(v) => setPomoSettings({ sessionsBeforeLong: clamp(v, 2, 8) })} />
          </div>
          <div className="mt-3 space-y-1.5">
            <Check label="Gentle sound on end" checked={state.pomo.soundOn}
                   onChange={(v) => setPomoSettings({ soundOn: v })} />
            <Check label="Do-not-disturb during work session" checked={state.pomo.dndOn}
                   onChange={(v) => setPomoSettings({ dndOn: v })} />
          </div>
        </div>

        <div className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2 inline-flex items-center gap-1.5">
            <Coffee size={11} className="text-aws-orange" /> Break activity ideas
          </h3>
          <ul className="space-y-1 text-xs">
            {breakSuggestions.map((s) => (
              <li key={s} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================ SCHEDULE ============================

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const BLOCK_KINDS = [
  { id: 'study',    label: 'Study',         color: 'bg-aws-orange/20 text-aws-orange border-aws-orange/40' },
  { id: 'lab',      label: 'Lab',           color: 'bg-electric/20 text-electric border-electric/40' },
  { id: 'exam',     label: 'Practice exam', color: 'bg-warning/20 text-warning border-warning/40' },
  { id: 'break',    label: 'Break',         color: 'bg-success/20 text-success border-success/40' },
  { id: 'exercise', label: 'Exercise',      color: 'bg-success/20 text-success border-success/40' },
  { id: 'sleep',    label: 'Sleep',         color: 'bg-electric/20 text-electric border-electric/40' },
];

function SchedulePlanner() {
  const { state, addBlock, removeBlock, toggleBlockDone, scheduleStreak } = useWellness();
  const todayName = DAYS[(new Date().getDay() + 6) % 7]; // make Monday = index 0
  const [day, setDay] = useState(todayName);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ start: '09:00', minutes: 60, kind: 'study', label: 'Deep work' });

  const list = state.schedule[day] || [];

  const save = () => {
    addBlock(day, draft);
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted mr-1">Day</div>
        {DAYS.map((d) => (
          <button key={d} onClick={() => setDay(d)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11px] font-bold transition border capitalize',
                    day === d ? 'border-aws-orange bg-aws-orange/15 text-aws-orange' : 'border-token text-muted hover:text-current',
                    d === todayName && day !== d && 'text-current'
                  )}>
            {d.slice(0, 3)}{d === todayName ? ' · today' : ''}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="chip border border-token bg-[var(--card-2)] text-[11px] font-bold">
            <Sparkles size={11} className="text-aws-orange" /> Streak: {scheduleStreak}
          </span>
          <button onClick={() => setAdding(true)} className="btn btn-primary !text-xs !py-1.5">
            <Plus size={12} /> Add block
          </button>
        </div>
      </div>

      <div className="surface rounded-2xl p-4">
        {list.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">
            No blocks for {day}. Add one to start.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {list.map((b) => {
              const kind = BLOCK_KINDS.find((k) => k.id === b.kind) || BLOCK_KINDS[0];
              const done = !!state.scheduleDone[b.id];
              const endMins = parseHHMM(b.start) + b.minutes;
              return (
                <li key={b.id} className={cn(
                  'flex items-center gap-3 rounded-xl border p-2.5 transition',
                  done ? 'border-success/40 bg-success/[0.04]' : `${kind.color}`
                )}>
                  <input type="checkbox" checked={done} onChange={() => toggleBlockDone(b.id)}
                         className="w-4 h-4 accent-aws-orange" />
                  <div className="font-extrabold tabular-nums text-xs w-24">
                    {b.start} → {minToHHMM(endMins)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn('text-sm font-extrabold', done && 'line-through opacity-60')}>{b.label}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">{kind.label} · {b.minutes} min</div>
                  </div>
                  <button onClick={() => removeBlock(day, b.id)}
                          className="text-muted hover:text-danger p-1"><Trash2 size={12} /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setAdding(false)} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="relative surface rounded-3xl w-full max-w-sm p-5 gradient-border">
            <h3 className="text-lg font-extrabold tracking-tight mb-3">Add block to {day}</h3>
            <div className="space-y-2 text-xs">
              <NumField label="Start (HH:MM)" value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} type="time" />
              <NumField label="Minutes" value={draft.minutes} onChange={(v) => setDraft({ ...draft, minutes: clamp(Number(v), 5, 720) })} />
              <label className="block">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Kind</span>
                <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}
                        className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
                  {BLOCK_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </label>
              <NumField label="Label" value={draft.label} onChange={(v) => setDraft({ ...draft, label: v })} type="text" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={save} className="btn btn-primary flex-1">Add</button>
              <button onClick={() => setAdding(false)} className="btn btn-ghost">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============================ WELLNESS TRACKERS ============================

function WellnessTrackers() {
  const {
    state, setEnergy, logFocus, incWater, setReminders,
    energyToday, waterToday, burnoutRisk,
  } = useWellness();
  const toast = useToast();
  const [focusInput, setFocusInput] = useState(7);

  // 20-20-20 reminder timer
  useEffect(() => {
    if (!state.reminders.eyeBreak) return;
    const id = setInterval(() => {
      toast.info('Eye break — look 20 feet away for 20 seconds', { duration: 6000 });
    }, 20 * 60 * 1000);
    return () => clearInterval(id);
  }, [state.reminders.eyeBreak, toast]);

  // hourly stretch
  useEffect(() => {
    if (!state.reminders.stretch) return;
    const id = setInterval(() => {
      toast.info('Stretch — neck + shoulders for 60s', { duration: 6000 });
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [state.reminders.stretch, toast]);

  // every-2h water
  useEffect(() => {
    if (!state.reminders.water) return;
    const id = setInterval(() => {
      toast.info('Hydrate — drink a glass of water', { duration: 6000 });
    }, 2 * 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [state.reminders.water, toast]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Sun} label="Energy (today)" value={energyToday ? `${energyToday}/10` : '—'} tone={energyToday >= 7 ? 'text-success' : energyToday >= 4 ? 'text-warning' : 'text-danger'} />
        <Card icon={Droplet} label="Water (today)" value={`${waterToday} glasses`} tone={waterToday >= 6 ? 'text-success' : 'text-muted'} />
        <Card icon={Activity} label="Pomodoros" value={`${state.pomoLog.filter((p) => p.kind === 'work' && p.at.startsWith(new Date().toISOString().slice(0, 10))).length}`} />
        <Card icon={AlertOctagon} label="Burnout risk" value={burnoutRisk.level} tone={burnoutRisk.level === 'high' ? 'text-danger' : burnoutRisk.level === 'moderate' ? 'text-warning' : 'text-success'} />
      </div>

      {burnoutRisk.recommendRest && (
        <div className="surface rounded-2xl p-4 border-l-4 border-l-danger">
          <div className="flex items-start gap-3">
            <AlertOctagon size={20} className="text-danger flex-shrink-0" />
            <div>
              <h4 className="text-sm font-extrabold text-danger">Take a rest day.</h4>
              <p className="text-xs text-muted mt-0.5">
                {burnoutRisk.totalSessions} focus sessions in 14 days with only {burnoutRisk.restDays} rest days. Rest is part of the work.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5">
            <Battery size={11} className="text-aws-orange" /> Morning energy (1–10)
          </h3>
          <div className="flex items-center gap-1 flex-wrap">
            {Array.from({ length: 10 }).map((_, i) => {
              const n = i + 1;
              const selected = energyToday === n;
              return (
                <button key={n} onClick={() => setEnergy(n)}
                        className={cn(
                          'w-9 h-9 rounded-lg text-xs font-extrabold tabular-nums transition',
                          selected ? 'bg-aws-orange text-ink-950 shadow-glow-orange'
                                   : 'bg-[var(--card-2)] text-muted hover:text-current'
                        )}>{n}</button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted mt-2">Logged once per morning. Trends help you find your peak hours.</p>
        </div>

        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5">
            <Target size={11} className="text-aws-orange" /> Focus quality per session (1–10)
          </h3>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={10} value={focusInput}
                   onChange={(e) => setFocusInput(Number(e.target.value))}
                   className="flex-1 accent-aws-orange" />
            <span className="text-xl font-extrabold tabular-nums w-8 text-aws-orange">{focusInput}</span>
            <button onClick={() => { logFocus(focusInput); toast.success('Focus logged'); }}
                    className="btn btn-primary !text-xs">
              <Plus size={12} /> Log
            </button>
          </div>
          {state.focusLog.length > 0 && (
            <ul className="mt-3 grid grid-cols-7 gap-0.5">
              {state.focusLog.slice(0, 21).reverse().map((f, i) => (
                <li key={i} className="aspect-square rounded-sm grid place-items-center text-[10px] font-extrabold tabular-nums"
                    style={{ background: `rgba(255,153,0,${Math.max(0.12, f.score / 10 * 0.8)})`, color: f.score >= 6 ? '#0A0E1A' : '#fff' }}
                    title={`${f.score}/10 · ${formatDate(f.at)}`}>{f.score}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5">
            <Droplet size={11} className="text-aws-orange" /> Water tracker
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black tabular-nums text-aws-orange">{waterToday}</div>
            <div className="text-xs text-muted flex-1">glasses today · aim for 8</div>
            <button onClick={incWater} className="btn btn-primary !text-xs">
              <Plus size={12} /> +1 glass
            </button>
          </div>
        </div>

        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 inline-flex items-center gap-1.5">
            <Eye size={11} className="text-aws-orange" /> Reminders
          </h3>
          <div className="space-y-1.5">
            <Check label="Water every 2 hours"        checked={state.reminders.water}    onChange={(v) => setReminders({ water: v })} />
            <Check label="20-20-20 eye break (20 min)" checked={state.reminders.eyeBreak} onChange={(v) => setReminders({ eyeBreak: v })} />
            <Check label="Hourly stretch reminder"    checked={state.reminders.stretch}  onChange={(v) => setReminders({ stretch: v })} />
          </div>
          <p className="text-[11px] text-muted mt-2">Reminders only run while the app is open in a tab.</p>
        </div>
      </div>
    </div>
  );
}

// ============================ REFLECTION JOURNAL ============================

const REFLECTION_QUESTIONS = [
  'What did I complete this week?',
  'What was my biggest challenge?',
  'What did I learn that surprised me?',
  'What will I focus on next week?',
  'What am I proud of?',
];

function ReflectionJournal() {
  const { state, addJournal } = useWellness();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' });

  const submit = () => {
    if (!answers.q1.trim() && !answers.q2.trim() && !answers.q3.trim() && !answers.q4.trim() && !answers.q5.trim()) {
      toast.warning('Answer at least one question'); return;
    }
    addJournal({ answers });
    setAnswers({ q1: '', q2: '', q3: '', q4: '', q5: '' });
    setOpen(false);
    toast.success('Reflection saved');
  };

  // Positive-pattern detector: find words that appear in >= 2 entries across "proud of" answers.
  const patterns = useMemo(() => {
    if (state.journal.length < 2) return [];
    const freq = {};
    for (const e of state.journal) {
      const txt = (e.answers?.q5 || '') + ' ' + (e.answers?.q3 || '');
      const words = txt.toLowerCase().match(/[a-z]{4,}/g) || [];
      const set = new Set(words.filter((w) => !STOPWORDS.has(w)));
      for (const w of set) freq[w] = (freq[w] || 0) + 1;
    }
    return Object.entries(freq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [state.journal]);

  return (
    <div className="space-y-4">
      <section className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-electric/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center gap-4">
          <Quote size={28} className="text-aws-orange" />
          <div className="flex-1">
            <h3 className="text-lg font-extrabold tracking-tight">Sunday reflection</h3>
            <p className="text-xs text-muted">Five questions, 10 minutes. Patterns appear over weeks.</p>
          </div>
          <button onClick={() => setOpen(true)} className="btn btn-primary">
            <Plus size={14} /> New reflection
          </button>
        </div>
      </section>

      {patterns.length > 0 && (
        <section className="surface rounded-2xl p-4">
          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 inline-flex items-center gap-1.5">
            <Sparkles size={11} /> Positive patterns (auto-detected)
          </h4>
          <ul className="flex flex-wrap gap-1.5">
            {patterns.map(([word, n]) => (
              <li key={word} className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-[11px] font-bold">
                {word} <span className="text-muted font-medium">×{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="surface rounded-2xl p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Past reflections</h3>
        {state.journal.length === 0 ? (
          <p className="text-sm text-muted">No reflections yet.</p>
        ) : (
          <ul className="space-y-3">
            {state.journal.map((e) => (
              <li key={e.id} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                  {e.week} · {formatDate(e.at)}
                </div>
                <dl className="space-y-1.5 text-xs">
                  {REFLECTION_QUESTIONS.map((q, i) => {
                    const v = e.answers?.[`q${i + 1}`];
                    if (!v) return null;
                    return (
                      <div key={i}>
                        <dt className="font-bold text-current">{q}</dt>
                        <dd className="text-muted leading-relaxed whitespace-pre-wrap">{v}</dd>
                      </div>
                    );
                  })}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="relative surface rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-5 gradient-border">
            <h3 className="text-lg font-extrabold tracking-tight mb-3">Weekly reflection</h3>
            <div className="space-y-3">
              {REFLECTION_QUESTIONS.map((q, i) => (
                <label key={i} className="block">
                  <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">{q}</span>
                  <textarea rows={3}
                            value={answers[`q${i + 1}`]}
                            onChange={(e) => setAnswers({ ...answers, [`q${i + 1}`]: e.target.value })}
                            className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg p-2 text-sm focus-ring focus:border-aws-orange resize-y" />
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={submit} className="btn btn-primary">Save reflection</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============================ shared bits ============================

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2 text-center">
      <div className="text-[9px] uppercase tracking-widest font-extrabold text-muted">{label}</div>
      <div className="text-sm font-extrabold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function Card({ icon: Icon, label, value, tone = 'text-current' }) {
  return (
    <div className="surface rounded-2xl p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-2xl font-extrabold tracking-tight', tone)}>{value}</div>
    </div>
  );
}

function NumField({ label, value, onChange, type = 'number' }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
             className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
    </label>
  );
}

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)}
             className="w-3.5 h-3.5 accent-aws-orange" />
      <span>{label}</span>
    </label>
  );
}

function chime(on) {
  if (!on) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.03);
    o.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.5);
  } catch { /* ignore */ }
}

function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n) || 0)); }

function parseHHMM(s) {
  const [h, m] = (s || '00:00').split(':').map(Number);
  return h * 60 + m;
}
function minToHHMM(min) {
  const h = Math.floor(min / 60); const m = min % 60;
  return `${String(h % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const STOPWORDS = new Set(['this','that','from','with','have','were','your','their','them','they','about','what','will','been','being','into','more','most','some','than','then','also','very','just','when','where','which','these','those','only','over','only','really','still','much','many','because','should','would','could']);
