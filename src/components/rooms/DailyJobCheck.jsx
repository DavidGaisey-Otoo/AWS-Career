import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, ExternalLink, Flame, Minus, Plus, Search, Send } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { DAILY_KEY_SUFFIX, FILTERS, ROUTINE, lastWeek, savedSearches, streak, today, updateToday } from '../../lib/dailyJobCheck.js';
import { StatChip } from '../common/StatChip.jsx';
import { cn } from '../../lib/utils.js';

function Counter({ label, value, onChange }) {
  return (
    <div className="rounded-xl border border-token px-3 py-2 flex items-center justify-between gap-2">
      <span className="text-[12.5px]">{label}</span>
      <span className="flex items-center gap-1.5">
        <button onClick={() => onChange(-1)} className="btn btn-ghost !p-1" aria-label={`One fewer ${label}`}><Minus size={12} /></button>
        <span className="w-6 text-center font-bold tabular-nums">{value}</span>
        <button onClick={() => onChange(1)} className="btn btn-ghost !p-1" aria-label={`One more ${label}`}><Plus size={12} /></button>
      </span>
    </div>
  );
}

/**
 * The daily Upwork routine. The links open Upwork in your own browser;
 * the app never signs in, searches, applies or messages for you.
 */
export function DailyJobCheck() {
  const [log, setLog] = useLocalStorage(`${STORAGE_KEY}${DAILY_KEY_SUFFIX}`, []);
  const day = today(log);
  const week = useMemo(() => lastWeek(log), [log]);
  const run = useMemo(() => streak(log), [log]);
  const searches = useMemo(() => savedSearches(), []);
  const change = (patch) => setLog((l) => updateToday(l, patch));
  const done = new Set(day.done || []);

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatChip layout="stacked" icon={Search} label="Checked today" value={day.checked} />
        <StatChip layout="stacked" icon={Send} label="Applied today" value={`${day.applied} / 3`} tone={day.applied >= 3 ? 'warning' : 'default'} />
        <StatChip layout="stacked" icon={CalendarCheck} label="Last 7 days" value={`${week.checked} checked · ${week.applied} applied`} />
        <StatChip layout="stacked" icon={Flame} label="Days in a row" value={run} tone={run >= 3 ? 'orange' : 'default'} />
      </div>

      <section className="surface rounded-2xl p-4">
        <h2 className="text-[14px] font-bold mb-2">Today's routine</h2>
        <ol className="space-y-1.5">
          {ROUTINE.map((step, i) => (
            <li key={step.id}>
              <label className="flex items-start gap-2 text-[13px] cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={done.has(step.id)} onChange={() => change({ toggle: step.id })} />
                <span className={cn(done.has(step.id) && 'line-through text-muted')}>{i + 1}. {step.text}</span>
              </label>
            </li>
          ))}
        </ol>
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          <Counter label="Posts checked" value={day.checked} onChange={(n) => change({ checked: n })} />
          <Counter label="GO verdicts" value={day.go} onChange={(n) => change({ go: n })} />
          <Counter label="Applied" value={day.applied} onChange={(n) => change({ applied: n })} />
        </div>
      </section>

      <section className="surface rounded-2xl p-4">
        <h2 className="text-[14px] font-bold">Saved searches</h2>
        <p className="text-[12px] text-muted mb-2">Each link opens Upwork with these filters: {FILTERS.join(' · ')}. If Upwork changes its links, the filters may not apply, so glance at them on the page.</p>
        <div className="divide-y divide-[var(--border)]">
          {searches.map((s) => (
            <div key={s.term} className="flex items-center justify-between gap-2 py-2 flex-wrap">
              <span className="text-[13px] font-semibold">{s.term}</span>
              <span className="flex gap-2">
                <a href={s.fixed} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !text-[11.5px] !py-1 inline-flex items-center gap-1">Fixed under $500 <ExternalLink size={11} /></a>
                <a href={s.hourly} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !text-[11.5px] !py-1 inline-flex items-center gap-1">Hourly part-time <ExternalLink size={11} /></a>
              </span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[12.5px]">
        Found one? Paste the whole job page into <Link to="/find/check" className="underline hover:text-aws-orange">Check a job post</Link> for a GO / SKIP verdict.
      </p>
    </div>
  );
}
