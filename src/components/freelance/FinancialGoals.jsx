import { CalendarClock, Edit3, Target, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatCurrency } from '../../lib/utils.js';
import { ProgressRing } from '../roadmap/ProgressRing.jsx';

export function FinancialGoals() {
  const { state, setGoals, goalProgress, earningsStats } = useFreelance();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    monthlyTarget: state.goals.monthlyTarget,
    annualTarget: state.goals.annualTarget,
    currency: state.goals.currency,
  });

  const save = () => {
    setGoals({
      monthlyTarget: Number(draft.monthlyTarget) || 0,
      annualTarget: Number(draft.annualTarget) || 0,
      currency: draft.currency,
    });
    toast.success('Targets saved');
    setEditing(false);
  };

  const pctOfMonth = Math.min(100, goalProgress.pctOfMonth);
  const pctOfYear = Math.min(100, goalProgress.pctOfYear);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid gap-5 lg:grid-cols-[200px_1fr] items-center">
          <div className="flex justify-center">
            <ProgressRing percent={pctOfMonth} size={180} stroke={14} accent="rainbow" mega>
              <div className="text-center">
                <div className="text-4xl font-black text-gradient">{pctOfMonth}%</div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">of monthly</div>
              </div>
            </ProgressRing>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Monthly target</h2>
            <p className="text-sm text-muted mt-1">
              {formatCurrency(earningsStats.thisMonthUSD)} of {formatCurrency(goalProgress.monthlyTargetUSD)} earned so far.
            </p>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <Stat icon={CalendarClock} label="Days left" value={goalProgress.daysLeft} />
              <Stat icon={TrendingUp}    label="Daily pace" value={formatCurrency(goalProgress.dailyPace)} />
              <Stat icon={Target}        label="Needed/day" value={formatCurrency(goalProgress.dailyNeededUSD)} />
              <Stat
                icon={Target}
                label="Projected"
                value={formatCurrency(goalProgress.projectedMonthUSD)}
                tone={goalProgress.onTrack ? 'text-success' : 'text-warning'}
              />
            </div>

            <div className={cn(
              'mt-3 rounded-lg border p-2.5 text-xs',
              goalProgress.onTrack
                ? 'border-success/30 bg-success/[0.04] text-success'
                : 'border-warning/30 bg-warning/[0.04] text-warning'
            )}>
              <strong>{goalProgress.onTrack ? 'On track.' : 'Behind pace.'}</strong>{' '}
              {goalProgress.onTrack
                ? 'Keep the daily cadence and you\'ll clear target.'
                : `Lift daily earnings to ${formatCurrency(goalProgress.dailyNeededUSD)} to recover.`}
            </div>
          </div>
        </div>
      </div>

      {/* Yearly + edit */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Annual target</h3>
          <div className="text-2xl font-extrabold tabular-nums">{formatCurrency(earningsStats.ytdUSD)}
            <span className="text-sm text-muted font-semibold ml-1.5">/ {formatCurrency(goalProgress.annualTargetUSD)}</span></div>
          <div className="mt-2 h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
            <div className="h-full bg-gradient-aws transition-all" style={{ width: `${pctOfYear}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted">{pctOfYear}% of annual goal</div>
          <div className="mt-3 text-xs">
            <strong>Break-even:</strong> {formatCurrency(goalProgress.breakEvenUSD)} earnings to cover expenses to date.
          </div>
        </div>

        <div className="surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Set targets</h3>
            {!editing && (
              <button onClick={() => setEditing(true)} className="btn btn-ghost !text-xs !py-1.5">
                <Edit3 size={11} /> Edit
              </button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <Field label="Monthly target" value={draft.monthlyTarget}
                     onChange={(v) => setDraft({ ...draft, monthlyTarget: v })} />
              <Field label="Annual target" value={draft.annualTarget}
                     onChange={(v) => setDraft({ ...draft, annualTarget: v })} />
              <Field label="Currency" as="select" value={draft.currency}
                     onChange={(v) => setDraft({ ...draft, currency: v })}
                     options={['USD', 'GBP', 'EUR', 'GHS', 'AUD']} />
              <div className="flex gap-2 pt-1">
                <button onClick={save} className="btn btn-primary !text-xs flex-1">Save targets</button>
                <button onClick={() => { setDraft(state.goals); setEditing(false); }}
                        className="btn btn-ghost !text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <ul className="text-sm space-y-1.5">
              <li className="flex justify-between"><span>Monthly</span>
                <span className="font-extrabold tabular-nums">{state.goals.currency} {Number(state.goals.monthlyTarget).toLocaleString()}</span></li>
              <li className="flex justify-between"><span>Annual</span>
                <span className="font-extrabold tabular-nums">{state.goals.currency} {Number(state.goals.annualTarget).toLocaleString()}</span></li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = 'text-current' }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-base font-extrabold tabular-nums', tone)}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, as, options = [] }) {
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}
