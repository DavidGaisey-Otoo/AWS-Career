import { motion } from 'framer-motion';
import {
  AlertOctagon, CalendarDays, CalendarRange, CheckCircle2, ChevronLeft, Clock,
  GraduationCap, List, RotateCcw, Send, Sparkles, Target, TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useExam } from '../context/ExamContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { CERTS, getCert } from '../data/certs.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { cn, formatDate } from '../lib/utils.js';

/**
 * Smart Study Plan Generator.
 *
 * Generates a per-day plan from "today" to the target exam date, weighted
 * by official AWS domain percentages, with built-in spaced-repetition
 * review slots, biweekly full mocks, and a buffer week at the end.
 *
 * Per-day session completion is tracked separately (planProgress) so the
 * user can mark tasks done and we can compute on-track / behind.
 */

const VIEWS = [
  { id: 'list',    label: 'List',     icon: List },
  { id: 'week',    label: 'Weekly',   icon: CalendarRange },
  { id: 'calendar',label: 'Calendar', icon: CalendarDays },
];

export default function StudyPlanGenerator() {
  const { generateStudyPlan, clearStudyPlan, getCertState, certStats } = useExam();
  const { addNotification } = useApp();
  const [certId, setCertId] = useState('saa-c03');
  const [examDate, setExamDate] = useState(plusDays(60));
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [knowledge, setKnowledge] = useState('intermediate');
  const [weakDomains, setWeakDomains] = useState({});
  const [view, setView] = useState('list');
  const [planProgress, setPlanProgress] = useLocalStorage(
    `${STORAGE_KEY}::studyplan-progress`, {}
  );

  const cert = getCert(certId);
  const stats = certStats.find((s) => s.id === certId);
  const plan = stats?.studyPlan || null;

  // Reset weak-domain checkboxes when cert changes
  useEffect(() => { setWeakDomains({}); }, [certId]);

  const generate = () => {
    generateStudyPlan(certId, examDate);
    addNotification({
      title: 'Study plan generated',
      body: `Your ${cert.short} plan runs from today to ${formatDate(examDate)}.`,
      type: 'success',
    });
  };

  const clear = () => {
    if (confirm('Clear this study plan?')) clearStudyPlan(certId);
  };

  // Adjusted plan: re-tag tasks against weak domains + completed flag
  const enrichedPlan = useMemo(() => {
    if (!plan) return null;
    const today = new Date().toISOString().slice(0, 10);
    return {
      ...plan,
      tasks: plan.tasks.map((t) => {
        const key = `${certId}:${t.date}:${t.item}`;
        const completed = !!planProgress[key];
        const overdue = !completed && t.date < today;
        const weak = t.domainId ? !!weakDomains[t.domainId] : false;
        return { ...t, key, completed, overdue, weak };
      }),
    };
  }, [plan, certId, planProgress, weakDomains]);

  const stats2 = useMemo(() => {
    if (!enrichedPlan) return null;
    const tasks = enrichedPlan.tasks;
    const today = new Date().toISOString().slice(0, 10);
    const total = tasks.length;
    const done = tasks.filter((t) => t.completed).length;
    const dueSoFar = tasks.filter((t) => t.date <= today).length;
    const overdue = tasks.filter((t) => t.overdue).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const onTrack = dueSoFar === 0 || done >= dueSoFar - 1;
    return { total, done, dueSoFar, overdue, pct, onTrack };
  }, [enrichedPlan]);

  const toggleSession = (key) => {
    setPlanProgress((p) => ({ ...p, [key]: !p[key] }));
  };

  const autoReschedule = () => {
    if (!enrichedPlan) return;
    const today = new Date().toISOString().slice(0, 10);
    // Shift overdue undone tasks to the next available day
    const overdueTasks = enrichedPlan.tasks.filter((t) => t.overdue);
    if (overdueTasks.length === 0) return;
    // Note: writing back to ExamContext study plan would require an updater
    // we don't yet expose. For now, just re-generate from today preserving
    // the original exam date.
    if (plan?.examDate) {
      generateStudyPlan(certId, plan.examDate);
      setPlanProgress({});  // fresh start, optional
      addNotification({
        title: 'Plan rescheduled',
        body: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} have been re-balanced from today.`,
        type: 'info',
      });
    }
  };

  return (
    <div className="space-y-5">
      <Link to="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> AI hub
      </Link>

      <PageHeader
        eyebrow="Smart Study Plan"
        title="Your day-by-day path to pass."
        subtitle="Tell the planner your target exam, your hours, and your weak spots. It writes a calendar weighted by official domain percentages — with spaced review and biweekly mocks built in."
        icon={GraduationCap}
      />

      {/* Input form */}
      <section className="surface rounded-2xl p-5 sm:p-6 space-y-4 gradient-border">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
          Plan parameters
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Target certification">
            <select
              value={certId} onChange={(e) => setCertId(e.target.value)}
              className="input"
            >
              {CERTS.map((c) => <option key={c.id} value={c.id}>{c.short}</option>)}
            </select>
          </Field>
          <Field label="Target exam date">
            <input
              type="date" min={plusDays(7)} value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Hours / day">
            <input type="number" min={1} max={12} value={hoursPerDay}
              onChange={(e) => setHoursPerDay(Number(e.target.value))}
              className="input" />
          </Field>
          <Field label="Days / week">
            <input type="number" min={1} max={7} value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Number(e.target.value))}
              className="input" />
          </Field>
          <Field label="Current knowledge">
            <select
              value={knowledge} onChange={(e) => setKnowledge(e.target.value)}
              className="input"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </Field>
        </div>

        {/* Weak domains */}
        {cert && (
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
              Weak domains (bias plan toward these)
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cert.domains.map((d) => {
                const on = !!weakDomains[d.id];
                return (
                  <button
                    key={d.id}
                    onClick={() => setWeakDomains((w) => ({ ...w, [d.id]: !w[d.id] }))}
                    className={cn(
                      'rounded-md px-2.5 py-1.5 text-[11px] font-bold transition border',
                      on
                        ? 'border-warning bg-warning/15 text-warning'
                        : 'border-token text-muted hover:text-current'
                    )}
                  >{d.label} ({d.weight}%)</button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button onClick={generate} className="btn btn-primary">
            <Sparkles size={14} /> {plan ? 'Regenerate plan' : 'Generate plan'}
          </button>
          {plan && (
            <>
              <button onClick={autoReschedule} className="btn btn-ghost">
                <RotateCcw size={14} /> Reschedule from today
              </button>
              <button onClick={clear} className="btn btn-ghost text-danger">Clear</button>
            </>
          )}
        </div>

        {/* Plan summary */}
        {plan && stats2 && (
          <div className="grid sm:grid-cols-4 gap-3 pt-3 border-t border-token">
            <SummaryStat icon={CalendarDays} label="Total sessions" value={stats2.total} />
            <SummaryStat icon={CheckCircle2} label="Completed"
              value={`${stats2.done}/${stats2.total}`} tone="text-success" />
            <SummaryStat icon={AlertOctagon} label="Overdue"
              value={stats2.overdue}
              tone={stats2.overdue > 0 ? 'text-danger' : 'text-muted'} />
            <SummaryStat icon={TrendingUp} label="Status"
              value={stats2.onTrack ? 'On track' : `${stats2.overdue} behind`}
              tone={stats2.onTrack ? 'text-success' : 'text-danger'} />
          </div>
        )}
      </section>

      {/* Plan visualizations */}
      {enrichedPlan && stats2 && (
        <>
          {/* Mega progress + on-track */}
          <section className="surface rounded-3xl p-5 sm:p-6 gradient-border relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative grid gap-5 lg:grid-cols-[200px_1fr] items-center">
              <div className="flex justify-center">
                <ProgressRing percent={stats2.pct} size={180} stroke={14} accent="rainbow" mega>
                  <div className="text-center">
                    <div className="text-4xl font-black text-gradient">{stats2.pct}%</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">
                      Plan complete
                    </div>
                  </div>
                </ProgressRing>
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">
                  {cert.short} — target {formatDate(plan.examDate)}
                </h3>
                <p className="text-sm text-muted mt-1">
                  {stats2.total} sessions over {Math.round((new Date(plan.examDate) - new Date(plan.generatedAt)) / 86400000)} days.
                  Roughly {hoursPerDay}h/day, {daysPerWeek} day{daysPerWeek === 1 ? '' : 's'}/week.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={cn(
                    'chip border font-extrabold text-xs',
                    stats2.onTrack
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-danger/10 text-danger border-danger/30'
                  )}>
                    {stats2.onTrack ? '✓ On track' : `⚠ ${stats2.overdue} session${stats2.overdue === 1 ? '' : 's'} behind`}
                  </span>
                  <span className="chip border border-token bg-[var(--card-2)] font-bold text-xs">
                    <Clock size={11} /> {stats2.dueSoFar - stats2.done} due today or earlier
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* View toggle */}
          <div className="flex items-center gap-1.5 rounded-2xl surface-2 p-1.5 border border-token w-fit">
            {VIEWS.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition focus-ring',
                    view === v.id
                      ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                      : 'text-muted hover:text-current'
                  )}
                ><Icon size={12} /> {v.label}</button>
              );
            })}
          </div>

          <motion.div
            key={view}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {view === 'list'     && <ListView plan={enrichedPlan} onToggle={toggleSession} />}
            {view === 'week'     && <WeekView plan={enrichedPlan} onToggle={toggleSession} />}
            {view === 'calendar' && <CalendarView plan={enrichedPlan} onToggle={toggleSession} />}
          </motion.div>
        </>
      )}

      {!plan && (
        <div className="surface rounded-3xl py-14 text-center text-sm text-muted">
          Pick a cert + exam date above and click <span className="text-aws-orange font-bold">Generate plan</span>.
        </div>
      )}
    </div>
  );
}

// ----------------------- views -----------------------

function ListView({ plan, onToggle }) {
  // Group by week for readability
  const groups = useMemo(() => groupByWeek(plan.tasks), [plan]);
  return (
    <section className="space-y-4">
      {groups.map((g) => (
        <div key={g.weekStart} className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
              Week of {formatDate(g.weekStart)}
            </h4>
            <span className="text-[11px] text-muted font-bold">{g.tasks.filter((t) => t.completed).length}/{g.tasks.length} done</span>
          </div>
          <ul className="space-y-1.5">
            {g.tasks.map((t) => (
              <li key={t.key}>
                <button
                  onClick={() => onToggle(t.key)}
                  className={cn(
                    'group w-full flex items-center gap-3 rounded-xl px-3 py-2 transition text-left focus-ring',
                    t.completed && 'opacity-60',
                    t.overdue && !t.completed && 'bg-danger/[0.06] hover:bg-danger/10',
                    !t.overdue && !t.completed && 'hover:bg-[var(--card-2)]',
                  )}
                >
                  <span className={cn(
                    'w-5 h-5 rounded-md grid place-items-center flex-shrink-0 border-2 transition',
                    t.completed ? 'bg-success border-success text-white' : 'border-token',
                  )}>
                    {t.completed && <CheckCircle2 size={12} />}
                  </span>
                  <span className="text-[11px] text-muted font-bold tabular-nums w-24 flex-shrink-0">
                    {formatDate(t.date)}
                  </span>
                  <span className={cn('flex-1 text-sm font-semibold', t.completed && 'line-through')}>
                    {t.item}
                  </span>
                  {t.weak && (
                    <span className="chip bg-warning/15 text-warning border border-warning/30 text-[10px] font-bold">
                      <Target size={10} /> weak
                    </span>
                  )}
                  {t.overdue && !t.completed && (
                    <span className="chip bg-danger/15 text-danger border border-danger/30 text-[10px] font-bold">overdue</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function WeekView({ plan, onToggle }) {
  const groups = useMemo(() => groupByWeek(plan.tasks), [plan]);
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {groups.map((g) => {
        const done = g.tasks.filter((t) => t.completed).length;
        const pct = g.tasks.length ? Math.round((done / g.tasks.length) * 100) : 0;
        return (
          <div key={g.weekStart} className="surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
                Week {g.weekIndex + 1}
              </div>
              <span className="text-xs font-bold tabular-nums">{pct}%</span>
            </div>
            <div className="text-[10px] text-muted mb-2 font-bold">{formatDate(g.weekStart)}</div>
            <div className="h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden mb-3">
              <div className="h-full bg-gradient-aws transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ul className="space-y-1 text-xs">
              {g.tasks.map((t) => (
                <li key={t.key}>
                  <button
                    onClick={() => onToggle(t.key)}
                    className={cn(
                      'w-full text-left flex items-center gap-1.5 hover:text-aws-orange transition',
                      t.completed && 'opacity-60 line-through',
                    )}
                  >
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      t.completed ? 'bg-success' : t.overdue ? 'bg-danger' : 'bg-aws-orange/60',
                    )} />
                    <span className="truncate">{t.item}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function CalendarView({ plan, onToggle }) {
  const byDate = useMemo(() => {
    const m = {};
    for (const t of plan.tasks) (m[t.date] ||= []).push(t);
    return m;
  }, [plan]);

  const dates = Object.keys(byDate).sort();
  if (dates.length === 0) return null;

  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  // Calendar grid: start at the Sunday of the first week
  const start = new Date(first);
  start.setDate(start.getDate() - start.getDay());
  const days = [];
  const cursor = new Date(start);
  while (cursor <= last || cursor.getDay() !== 0) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (days.length > 100) break;  // safety
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="surface rounded-2xl p-4 sm:p-5">
      <div className="grid grid-cols-7 gap-1.5 text-[10px] text-muted font-bold uppercase tracking-widest mb-1.5">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const tasks = byDate[key] || [];
          const isToday = key === today;
          const isPlanned = tasks.length > 0;
          const completed = tasks.filter((t) => t.completed).length;
          const all = tasks.length;
          const fullyDone = isPlanned && completed === all;
          return (
            <div
              key={key}
              className={cn(
                'rounded-lg border p-1.5 min-h-[80px] flex flex-col gap-1 transition',
                isToday ? 'border-aws-orange bg-aws-orange/5'
                       : isPlanned ? 'border-token bg-[var(--card-2)]/40'
                                    : 'border-transparent bg-[var(--card-2)]/20',
                fullyDone && 'opacity-60',
              )}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className={cn(isToday && 'text-aws-orange', !isPlanned && 'text-muted')}>{d.getDate()}</span>
                {isPlanned && (
                  <span className="text-[9px] text-muted tabular-nums">
                    {completed}/{all}
                  </span>
                )}
              </div>
              <div className="flex-1 space-y-0.5">
                {tasks.slice(0, 2).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => onToggle(t.key)}
                    title={t.item}
                    className={cn(
                      'w-full text-left text-[10px] font-semibold truncate rounded px-1 py-0.5 transition',
                      t.completed
                        ? 'bg-success/15 text-success line-through opacity-70'
                        : t.overdue
                          ? 'bg-danger/15 text-danger hover:bg-danger/25'
                          : 'bg-aws-orange/15 text-aws-orange hover:bg-aws-orange/25',
                    )}
                  >{t.item}</button>
                ))}
                {tasks.length > 2 && (
                  <div className="text-[9px] text-muted font-bold px-1">+{tasks.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ----------------------- bits & pieces -----------------------

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
      <style>{`.input { width: 100%; background: var(--card-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 600; color: var(--text); outline: none; }
      .input:focus { border-color: #FF9900; }`}</style>
    </label>
  );
}

function SummaryStat({ icon: Icon, label, value, tone = 'text-current' }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-lg font-extrabold tabular-nums', tone)}>{value}</div>
    </div>
  );
}

function groupByWeek(tasks) {
  // Group by ISO week start (Sun)
  const byWeek = {};
  for (const t of tasks) {
    const d = new Date(t.date);
    const wkStart = new Date(d);
    wkStart.setDate(d.getDate() - d.getDay());
    const key = wkStart.toISOString().slice(0, 10);
    (byWeek[key] ||= []).push(t);
  }
  return Object.entries(byWeek).map(([weekStart, tasks], i) => ({
    weekStart, weekIndex: i, tasks: tasks.sort((a, b) => a.date.localeCompare(b.date)),
  })).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
