/**
 * IncomeTrackerCard.jsx — EA-02 Income Tracker UI.
 *
 * Two variants:
 *   - full     — for Freelance Overview tab: goal control, log-payment form,
 *                progress bar, monthly chart, payments list with row actions
 *   - compact  — for Dashboard: just the progress bar + headline + 2 actions
 *                (Log payment opens a modal; View all -> Freelance Overview)
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, DollarSign, TrendingUp, Plus, Trash2, Calendar, BarChart3,
  Trophy, Sparkles, Tag, X, CheckCircle2, AlertCircle, Edit2, ArrowRight,
} from 'lucide-react';
import {
  useIncomeTracker, getMonthStats, getMonthlySeries, getMonthSummary,
  setGoal, addPayment, deletePayment, PLATFORMS, currentMonthKey,
} from '../../lib/incomeTracker.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

// ════════════════════════════════════════════════════════════════════
// FULL — for Freelance Overview tab
// ════════════════════════════════════════════════════════════════════
export function IncomeTrackerCard() {
  const state = useIncomeTracker();
  const toast = useToast();

  const stats = useMemo(() => getMonthStats(state), [state]);
  const series = useMemo(() => getMonthlySeries(state, 6), [state]);
  const summary = useMemo(() => getMonthSummary(stats), [stats]);

  const [goalDraft, setGoalDraft] = useState(state.goal?.amount ?? 500);
  const [showLog, setShowLog] = useState(false);

  function handleSetGoal() {
    setGoal(Number(goalDraft) || 0);
    toast?.success?.(`Goal set to $${Math.round(Number(goalDraft) || 0).toLocaleString()}/mo`);
  }

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-5 gradient-border">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
          EA-02 · Income Tracker
        </div>
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Target size={18} className="text-aws-orange" />
          {stats.monthLabel} progress
        </h2>
        <p className="text-[12.5px] opacity-80 mt-1.5">
          Set a monthly income target, log payments as they hit your account, and watch your progress in real time. Resets at the start of each month — old totals stay in the chart.
        </p>
      </div>

      {/* Big progress card */}
      <ProgressPanel stats={stats} summary={summary} />

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Goal setter */}
        <div className="surface rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
            <Target size={11} /> Monthly goal
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12.5px] opacity-60 font-bold pointer-events-none">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token pl-6 pr-3 py-2 text-[13.5px] font-bold outline-none focus:border-aws-orange"
              />
            </div>
            <button
              onClick={handleSetGoal}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
            >
              Set
            </button>
          </div>
          {state.goal?.setAt && (
            <div className="text-[10.5px] opacity-60">
              Last updated {new Date(state.goal.setAt).toLocaleDateString('en-GB')}
            </div>
          )}
        </div>

        {/* Log payment */}
        <div className="surface rounded-2xl p-4 space-y-2 flex flex-col">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
            <Plus size={11} /> Log a payment
          </div>
          <p className="text-[11.5px] opacity-75 flex-1">
            Manual entry — gig name, amount, date, platform. Lands in the totals immediately.
          </p>
          <button
            onClick={() => setShowLog(true)}
            className="btn btn-primary inline-flex items-center gap-1.5 w-full justify-center"
          >
            <Plus size={13} /> Add payment
          </button>
        </div>
      </div>

      {/* Monthly chart */}
      <MonthlyChart series={series} goal={stats.goal} />

      {/* Payments this month */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <h3 className="text-[13px] font-extrabold flex items-center gap-1.5">
          <DollarSign size={13} className="text-success" />
          {stats.monthLabel} payments ({stats.count})
        </h3>
        {stats.payments.length === 0 ? (
          <div className="text-center py-6 opacity-60 text-[12.5px]">
            No payments logged for this month yet — hit <strong>Add payment</strong> above to get started.
          </div>
        ) : (
          <div className="divide-y divide-token">
            {stats.payments.map((p) => (
              <PaymentRow key={p.id} payment={p} onDelete={() => {
                if (!confirm(`Delete payment "${p.gigName}" for $${p.amount}?`)) return;
                deletePayment(p.id);
                toast?.success?.('Deleted');
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Log payment modal */}
      {showLog && (
        <LogPaymentModal
          onClose={() => setShowLog(false)}
          onSaved={() => {
            setShowLog(false);
            toast?.success?.('Payment logged');
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// COMPACT — for Dashboard widget
// ════════════════════════════════════════════════════════════════════
export function IncomeTrackerWidget() {
  const state = useIncomeTracker();
  const stats = useMemo(() => getMonthStats(state), [state]);
  const [showLog, setShowLog] = useState(false);

  const toneClass = {
    red:    'border-danger/40',
    yellow: 'border-warning/40',
    green:  'border-success/40',
  }[stats.status];

  return (
    <div className={cn('surface rounded-2xl p-4 border', toneClass)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            EA-02 · {stats.monthLabel}
          </div>
          <h3 className="text-[14px] font-extrabold flex items-center gap-1.5">
            <Target size={14} className="text-aws-orange" />
            Income goal
          </h3>
        </div>
        <Link
          to="/freelance"
          className="text-[10.5px] font-bold opacity-70 hover:opacity-100 inline-flex items-center gap-0.5"
        >
          Open <ArrowRight size={10} />
        </Link>
      </div>

      <ProgressBar stats={stats} />

      <div className="text-[11.5px] opacity-90 mt-2 leading-snug">
        {stats.remaining > 0 ? (
          <>
            <strong>${stats.remaining.toLocaleString()}</strong> to go — about{' '}
            <strong>{stats.moreGigsNeeded} more gig{stats.moreGigsNeeded === 1 ? '' : 's'}</strong>{' '}
            at your average rate.
          </>
        ) : (
          <span className="text-success font-bold">🎉 Goal hit! ${(stats.total - stats.goal).toLocaleString()} above target.</span>
        )}
      </div>

      <button
        onClick={() => setShowLog(true)}
        className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
      >
        <Plus size={11} /> Log payment
      </button>

      {showLog && (
        <LogPaymentModal
          onClose={() => setShowLog(false)}
          onSaved={() => setShowLog(false)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Building blocks
// ════════════════════════════════════════════════════════════════════
function ProgressPanel({ stats, summary }) {
  const toneClass = {
    red:    'border-danger/40 bg-danger/5',
    yellow: 'border-warning/40 bg-warning/5',
    green:  'border-success/40 bg-success/5',
  }[stats.status];

  return (
    <div className={cn('surface rounded-2xl border p-5', toneClass)}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="text-[10.5px] font-bold opacity-70 mb-0.5">EARNED THIS MONTH</div>
          <div className="text-3xl font-extrabold text-success">
            ${stats.total.toLocaleString()}
            <span className="text-[14px] opacity-60 font-bold"> / ${stats.goal.toLocaleString()}</span>
          </div>
          <div className="text-[11.5px] opacity-75 mt-0.5">{summary}</div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] font-bold opacity-70 mb-0.5">PROGRESS</div>
          <div className={cn(
            'text-3xl font-extrabold',
            stats.status === 'red' && 'text-danger',
            stats.status === 'yellow' && 'text-warning',
            stats.status === 'green' && 'text-success',
          )}>{stats.pct}%</div>
        </div>
      </div>

      <ProgressBar stats={stats} large />

      {stats.remaining > 0 ? (
        <div className="mt-3 text-[12.5px] opacity-90">
          You need <strong className="text-aws-orange">${stats.remaining.toLocaleString()}</strong> more
          to hit your goal — about{' '}
          <strong className="text-aws-orange">{stats.moreGigsNeeded} more gig{stats.moreGigsNeeded === 1 ? '' : 's'}</strong>{' '}
          at your average rate of ${Math.round(stats.referenceAvg).toLocaleString()}/gig.
        </div>
      ) : stats.goal > 0 ? (
        <div className="mt-3 text-[12.5px] text-success font-bold flex items-center gap-1.5">
          <Trophy size={13} /> Goal smashed — ${(stats.total - stats.goal).toLocaleString()} above target
        </div>
      ) : null}
    </div>
  );
}

function ProgressBar({ stats, large = false }) {
  const toneClass = {
    red:    'bg-danger',
    yellow: 'bg-warning',
    green:  'bg-success',
  }[stats.status];
  return (
    <div className={cn(
      'relative rounded-full overflow-hidden bg-[var(--card-2)] border border-token',
      large ? 'h-3' : 'h-2'
    )}>
      <div
        className={cn('h-full transition-all duration-500', toneClass)}
        style={{ width: `${Math.min(100, stats.pct)}%` }}
      />
    </div>
  );
}

function MonthlyChart({ series, goal }) {
  const max = Math.max(goal || 0, ...series.map((b) => b.total), 1);
  const W = 560;
  const H = 130;
  const barW = (W - 30) / series.length - 8;
  const x0 = 20;

  // Goal line y-coord (only if goal > 0)
  const goalY = goal > 0 ? (H - 28) - (goal / max) * (H - 50) : null;

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-extrabold flex items-center gap-1.5">
          <BarChart3 size={13} className="text-aws-orange" />
          Last 6 months
        </h3>
        {goal > 0 && (
          <div className="text-[10.5px] inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-aws-orange inline-block" />
            <span>Goal ${goal.toLocaleString()}/mo</span>
          </div>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Baseline */}
        <line x1={x0} y1={H - 28} x2={W - 10} y2={H - 28} stroke="currentColor" opacity="0.15" />
        {/* Goal line */}
        {goalY != null && (
          <>
            <line x1={x0} y1={goalY} x2={W - 10} y2={goalY} stroke="currentColor" className="text-aws-orange" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
          </>
        )}
        {series.map((b, i) => {
          const x = x0 + i * (barW + 8);
          const h = (b.total / max) * (H - 50);
          const isOverGoal = goal > 0 && b.total >= goal;
          return (
            <g key={b.monthKey}>
              <rect
                x={x}
                y={H - 28 - h}
                width={barW}
                height={h}
                fill="currentColor"
                className={isOverGoal ? 'text-success' : 'text-aws-orange opacity-70'}
                rx="2"
              />
              {b.total > 0 && (
                <text x={x + barW / 2} y={H - 28 - h - 4} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.75">
                  ${Math.round(b.total).toLocaleString()}
                </text>
              )}
              <text x={x + barW / 2} y={H - 10} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.55">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function PaymentRow({ payment, onDelete }) {
  return (
    <div className="py-2.5 px-1 flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate flex items-center gap-2">
          {payment.gigName}
          <span className="text-[10px] opacity-60 font-normal">
            {payment.platform && payment.platform !== 'direct' && (
              <span className="inline-flex items-center gap-0.5">
                <Tag size={9} /> {PLATFORMS.find((p) => p.id === payment.platform)?.label || payment.platform}
              </span>
            )}
          </span>
        </div>
        <div className="text-[10.5px] opacity-65 mt-0.5 inline-flex items-center gap-1">
          <Calendar size={9} /> {new Date(payment.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div className="text-[14px] font-extrabold text-success flex-shrink-0">
        ${payment.amount.toLocaleString()}
      </div>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-70 hover:!opacity-100 p-1 rounded text-danger transition flex-shrink-0"
        title="Delete payment"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Log payment modal
// ════════════════════════════════════════════════════════════════════
function LogPaymentModal({ onClose, onSaved }) {
  const [gigName, setGigName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [platform, setPlatform] = useState('direct');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e?.preventDefault?.();
    setError('');
    if (!amount || Number(amount) <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    addPayment({ gigName, amount: Number(amount), date, platform, notes });
    onSaved?.();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl p-5 max-w-md w-full border border-token shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              EA-02 · Log payment
            </div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <Plus size={16} className="text-aws-orange" /> Add a gig payment
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--card-2)] transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="text-[10.5px] font-bold opacity-75">GIG NAME</span>
            <input
              type="text"
              value={gigName}
              onChange={(e) => setGigName(e.target.value)}
              placeholder="e.g. Lambda data pipeline for Acme"
              className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[13px] outline-none focus:border-aws-orange"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[10.5px] font-bold opacity-75">AMOUNT</span>
              <div className="relative mt-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12.5px] opacity-60 font-bold pointer-events-none">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  required
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token pl-6 pr-3 py-1.5 text-[13.5px] font-bold outline-none focus:border-aws-orange"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[10.5px] font-bold opacity-75">DATE</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-2 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[10.5px] font-bold opacity-75">PLATFORM</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition',
                    platform === p.id
                      ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                      : 'border-token opacity-70 hover:opacity-100'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-[10.5px] font-bold opacity-75">NOTES (optional)</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you want to remember about this gig"
              className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn btn-primary inline-flex items-center gap-1.5">
              <CheckCircle2 size={13} /> Log payment
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
