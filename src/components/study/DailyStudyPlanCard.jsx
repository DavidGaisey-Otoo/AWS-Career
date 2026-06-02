/**
 * DailyStudyPlanCard.jsx — EX-20 Daily Study Scheduler UI.
 *
 * Three states:
 *   1. NO SETUP   → setup form (cert + exam date + hours/day)
 *   2. SETUP DONE → today's plan with blocks + Mark Done + streak
 *   3. COMPLETED  → congratulatory state with streak + tomorrow tease
 *
 * Mounted on Dashboard + Learn pages. Persisted in localStorage —
 * no backend.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, CheckCircle2, Clock, Flame, RefreshCw, Settings, Sparkles,
  Target, ChevronRight, RotateCcw,
} from 'lucide-react';
import { CERTS } from '../../data/certs.js';
import {
  getSchedulerSetup, saveSchedulerSetup, clearSchedulerSetup,
  getTodayPlan, markTodayDone, regenerateTodayPlan,
  getSchedulerSummary, daysToExam,
} from '../../lib/studyScheduler.js';
import { cn } from '../../lib/utils.js';

export function DailyStudyPlanCard({ compact = false }) {
  const [tick, setTick] = useState(0);   // bump to re-read storage
  const summary = useMemo(() => getSchedulerSummary(), [tick]);
  const plan = useMemo(() => (summary.hasSetup ? getTodayPlan() : null), [summary.hasSetup, tick]);
  const [showSetup, setShowSetup] = useState(!summary.hasSetup);

  // Sync setup-visibility whenever storage refreshes
  useEffect(() => { if (summary.hasSetup) setShowSetup(false); }, [summary.hasSetup]);

  if (showSetup || !summary.hasSetup) {
    return <SetupCard
      compact={compact}
      currentSetup={summary.hasSetup ? summary : null}
      onSaved={() => { setTick((t) => t + 1); setShowSetup(false); }}
      onCancel={summary.hasSetup ? () => setShowSetup(false) : undefined}
    />;
  }

  return <PlanCard
    compact={compact}
    summary={summary}
    plan={plan}
    onDone={() => { markTodayDone(); setTick((t) => t + 1); }}
    onRegenerate={() => { regenerateTodayPlan(); setTick((t) => t + 1); }}
    onEditSetup={() => setShowSetup(true)}
  />;
}

// ════════════════════════════════════════════════════════════════════
// Setup form
// ════════════════════════════════════════════════════════════════════
function SetupCard({ compact, currentSetup, onSaved, onCancel }) {
  const [certId, setCertId] = useState(currentSetup?.certId || 'saa-c03');
  const [examDate, setExamDate] = useState(currentSetup?.examDate || defaultExamDate());
  const [hoursPerDay, setHoursPerDay] = useState(currentSetup?.hoursPerDay || 1);
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!certId) return setError('Pick a certification.');
    if (!examDate) return setError('Pick your exam date.');
    const days = daysToExam(examDate);
    if (days != null && days < 0) return setError('Exam date is in the past — pick a future date.');
    if (!hoursPerDay || hoursPerDay < 0.25) return setError('Set at least 15 minutes per day (0.25 hours).');
    saveSchedulerSetup({ certId, examDate, hoursPerDay: Number(hoursPerDay) });
    onSaved?.();
  }

  return (
    <section className={cn('surface rounded-2xl p-5 border-l-4 border-l-aws-orange', compact && 'p-4')}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2.5">
          <Calendar size={18} className="text-aws-orange mt-0.5" />
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Daily study plan</div>
            <h3 className="text-base font-extrabold">
              {currentSetup ? 'Update your study plan' : 'Set your exam date to unlock your daily plan'}
            </h3>
            <p className="text-[12px] opacity-75 mt-0.5">
              Your daily plan auto-generates based on days remaining, weak topics, and what you haven\'t covered.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Field label="Certification">
            <select
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              className="input"
            >
              {CERTS.map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Exam date">
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="input"
            />
          </Field>

          <Field label="Study hours / day">
            <select
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
              className="input"
            >
              <option value={0.25}>0.25 hr (15 min)</option>
              <option value={0.5}>0.5 hr (30 min)</option>
              <option value={0.75}>0.75 hr (45 min)</option>
              <option value={1}>1 hr</option>
              <option value={1.5}>1.5 hr</option>
              <option value={2}>2 hr</option>
              <option value={3}>3 hr</option>
              <option value={4}>4 hr</option>
            </select>
          </Field>
        </div>

        {error && <div className="text-xs text-danger font-bold">{error}</div>}

        {examDate && (() => {
          const d = daysToExam(examDate);
          if (d == null || d < 0) return null;
          return (
            <div className="text-[12px] opacity-75">
              <Sparkles size={11} className="inline -mt-0.5 mr-1 text-aws-orange" />
              {d === 0 ? 'Your exam is today — focus on a final review.'
                : `${d} day${d === 1 ? '' : 's'} until exam → ${Math.round(d * (Number(hoursPerDay) || 1))} hours of total study planned.`}
            </div>
          );
        })()}

        <div className="flex flex-wrap gap-2 pt-1">
          <button type="submit" className="btn btn-primary">
            <Calendar size={14} /> {currentSetup ? 'Save changes' : 'Unlock my daily plan'}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
          )}
        </div>

        <style>{`.input { width: 100%; background: var(--card-2); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 600; color: var(--text); outline: none; }
        .input:focus { border-color: #FF9900; }`}</style>
      </form>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">{label}</div>
      {children}
    </label>
  );
}

function defaultExamDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ════════════════════════════════════════════════════════════════════
// Daily plan card
// ════════════════════════════════════════════════════════════════════
function PlanCard({ compact, summary, plan, onDone, onRegenerate, onEditSetup }) {
  const cert = CERTS.find((c) => c.id === summary.certId);
  const blocks = plan?.blocks || [];
  const totalMin = blocks.reduce((s, b) => s + (b.minutes || 0), 0);
  const days = summary.daysToExam;
  const examDate = summary.examDate;

  return (
    <section className="surface rounded-2xl p-5 border-l-4 border-l-aws-orange space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Calendar size={18} className="text-aws-orange mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-2 flex-wrap">
              <span>Today's study plan</span>
              {plan?.completed && <span className="px-1.5 py-0.5 rounded-full bg-success/15 text-success text-[9.5px]">✓ Done</span>}
            </div>
            <h3 className="text-base font-extrabold truncate">{cert?.code} · {cert?.name}</h3>
            <div className="text-[11.5px] opacity-75 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span><Clock size={10} className="inline -mt-0.5 mr-0.5" /> {totalMin} min</span>
              {days != null && (
                <span><Target size={10} className="inline -mt-0.5 mr-0.5" />
                  {days === 0 ? 'Exam TODAY' : days < 0 ? 'Exam was on ' + examDate : `${days} day${days === 1 ? '' : 's'} to exam`}</span>
              )}
              <span><Flame size={10} className={cn('inline -mt-0.5 mr-0.5', summary.streak > 0 ? 'text-warning' : 'opacity-60')} />
                {summary.streak}-day streak</span>
              <span className="opacity-60">· {summary.totalCompleted} days completed total</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={onRegenerate} title="Re-roll today's plan"
            className="p-1.5 rounded-lg text-muted hover:text-current hover:bg-[var(--card-2)] transition">
            <RefreshCw size={14} />
          </button>
          <button onClick={onEditSetup} title="Change exam date / hours"
            className="p-1.5 rounded-lg text-muted hover:text-current hover:bg-[var(--card-2)] transition">
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Blocks */}
      {blocks.length === 0 ? (
        <div className="text-sm opacity-70 italic text-center py-4">
          No blocks generated for today — try re-rolling or pick a cert with questions.
        </div>
      ) : (
        <ol className="space-y-1.5">
          {blocks.map((b, i) => <BlockRow key={b.id} block={b} index={i + 1} done={plan?.completed} />)}
        </ol>
      )}

      {/* Footer — Mark Done */}
      <div className="pt-2 border-t border-token">
        {plan?.completed ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] opacity-80 font-semibold inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-success" />
              You\'re done for today — see you tomorrow for the next plan.
            </div>
            <button onClick={onRegenerate} className="text-[11px] font-bold text-muted hover:text-current inline-flex items-center gap-1">
              <RotateCcw size={11} /> Re-do today
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] opacity-70 italic">
              Work through each block (click to jump in), then tick today off.
            </div>
            <button onClick={onDone} className="btn btn-primary text-xs">
              <CheckCircle2 size={14} /> Mark today done
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function BlockRow({ block, index, done }) {
  const kindStyle = {
    weak:  { tag: 'Weak', cls: 'bg-danger/15 text-danger border-danger/30' },
    new:   { tag: 'New',  cls: 'bg-aws-orange/15 text-aws-orange border-aws-orange/30' },
    drill: { tag: 'Drill',cls: 'bg-success/15 text-success border-success/30' },
  };
  const k = kindStyle[block.kind] || kindStyle.new;
  return (
    <li>
      <Link
        to={block.to}
        className={cn(
          'flex items-center gap-3 rounded-xl border border-token bg-[var(--card-2)]/40 px-3 py-2.5 hover:border-aws-orange/40 transition group',
          done && 'opacity-60'
        )}
      >
        <span className="text-xl flex-shrink-0">{block.icon || '📚'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-extrabold truncate flex items-center gap-2">
            <span className="opacity-50 text-[10px]">{index}.</span>
            {block.label}
          </div>
          <div className="text-[10.5px] opacity-70 mt-0.5 flex items-center gap-2">
            <span className={cn('px-1.5 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wide', k.cls)}>{k.tag}</span>
            <span><Clock size={9} className="inline -mt-0.5 mr-0.5" />{block.minutes} min</span>
          </div>
        </div>
        <ChevronRight size={14} className="opacity-50 group-hover:opacity-100 group-hover:text-aws-orange transition" />
      </Link>
    </li>
  );
}
