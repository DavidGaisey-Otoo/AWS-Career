import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Play, Receipt, Square, Trash2 } from 'lucide-react';
import { EmptyState } from '../common/EmptyState.jsx';
import { StatChip } from '../common/StatChip.jsx';
import { Button } from '../ui/Button.jsx';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { useWorkspace } from '../../hooks/useWorkspace.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import {
  durationMs, formatHM, invoiceLinesFor, markBilled, needsCheck, runningEntry,
  startTimer, stopTimer, weekSummary,
} from '../../lib/timeTracking.js';
import { cn } from '../../lib/utils.js';

const inputCls = 'w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm focus-ring focus:border-aws-orange';

/**
 * Jobs → Time. Start a timer on a job, see the week, and turn a job's
 * finished hours into a draft invoice. The rules — one timer at a time,
 * quarter-hour rounding, never billing twice, holding back a timer left
 * running overnight — live in lib/timeTracking.js.
 */
export function TimeTracker() {
  const [entries, setEntries] = useLocalStorage(`${STORAGE_KEY}::timesheet`, []);
  const [rate, setRate] = useLocalStorage(`${STORAGE_KEY}::timesheet::rate`, '');
  const [job, setJob] = useState('');
  const [client, setClient] = useState('');
  const [now, setNow] = useState(Date.now());
  const { state, addInvoice } = useFreelance();
  const workspace = useWorkspace();
  const toast = useToast();

  const running = runningEntry(entries);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const knownJobs = useMemo(() => {
    const names = new Set((workspace?.projects || []).map((p) => p.title).filter(Boolean));
    for (const e of entries) if (e?.job) names.add(e.job);
    return [...names];
  }, [workspace, entries]);

  const week = weekSummary(entries, now);
  const currency = state?.goals?.currency || 'USD';

  const start = () => {
    try {
      setEntries((list) => startTimer(list, { job, client }, Date.now()));
      setNow(Date.now());
    } catch (e) { toast.error(e.message); }
  };
  const stop = () => { setEntries((list) => stopTimer(list, Date.now())); setNow(Date.now()); };
  const remove = (id) => {
    if (!window.confirm('Delete this time entry?')) return;
    setEntries((list) => list.filter((e) => e.id !== id));
  };

  const invoice = (jobName, jobClient) => {
    let out;
    try { out = invoiceLinesFor(entries, jobName, rate, Date.now()); }
    catch (e) { toast.error(e.message); return; }
    if (!out.lines.length) {
      toast.warning(out.running.length ? 'Stop the timer first — a running session is not billed.' : 'No unbilled, finished time on this job.');
      return;
    }
    if (out.toCheck.length && !window.confirm(`${out.toCheck.length} session(s) ran over 10 hours and were left out — check them before billing. Make the invoice from the rest?`)) return;
    const ref = `time-${Date.now()}`;
    addInvoice({
      clientName: jobClient || '',
      projectTitle: jobName,
      currency,
      lineItems: out.lines,
      taxPct: 0,
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Hours from the time tracker, rounded up to the quarter hour.',
      source: ref,
    });
    setEntries((list) => markBilled(list, out.entryIds, ref));
    toast.success(`Draft invoice made: ${out.lines[0].qty} h for ${jobName}. Review it before sending.`);
  };

  const recent = entries.slice(0, 15);

  return (
    <div className="space-y-6">
      <section className="surface rounded-2xl p-4 space-y-3" aria-label="Timer">
        {running ? (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted">Timing</div>
              <div className="text-lg font-extrabold truncate">{running.job}</div>
              {running.client && <div className="text-xs text-muted">{running.client}</div>}
            </div>
            <div className="text-3xl font-black tabular-nums" aria-live="off">{formatHM(durationMs(running, now))}</div>
            <Button variant="danger" icon={Square} onClick={stop}>Stop</Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <label className="space-y-1">
              <span className="text-xs font-bold text-muted">Job</span>
              <input list="time-jobs" value={job} onChange={(e) => setJob(e.target.value)} placeholder="Which job are you working on?" className={inputCls} />
              <datalist id="time-jobs">{knownJobs.map((j) => <option key={j} value={j} />)}</datalist>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-muted">Client (optional)</span>
              <input value={client} onChange={(e) => setClient(e.target.value)} className={inputCls} />
            </label>
            <Button icon={Play} onClick={start}>Start timer</Button>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="This week">
        <StatChip layout="stacked" icon={Clock} value={formatHM(week.totalMs)} label="Hours this week" />
        <StatChip layout="stacked" icon={Receipt} value={week.jobs.length} label="Jobs worked this week" />
        <label className="surface rounded-2xl p-4 block">
          <span className="text-xs font-bold text-muted">Hourly rate ({currency})</span>
          <input type="number" min="0" step="1" value={rate} onChange={(e) => setRate(e.target.value)}
                 placeholder="e.g. 35" className={cn(inputCls, 'mt-2')} />
          <Link to="/find/rates" className="mt-1 inline-block text-[11px] text-muted hover:text-current">Not sure? Rate calculator →</Link>
        </label>
      </section>

      <section className="space-y-2" aria-labelledby="week-jobs">
        <h2 id="week-jobs" className="text-base font-extrabold">This week, by job</h2>
        {week.jobs.length === 0 ? (
          <EmptyState tone="quiet" icon={Clock} title="No time logged this week" description="Start the timer when you start work on a job. Stop it when you stop." />
        ) : (
          <ul className="surface rounded-2xl divide-y divide-[var(--border)]">
            {week.jobs.map((j) => (
              <li key={j.job} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate">{j.job}</div>
                  <div className="text-xs text-muted">{j.client || 'Client not recorded'} · {j.entries} session{j.entries === 1 ? '' : 's'}</div>
                </div>
                <div className="text-sm font-black tabular-nums">{formatHM(j.ms)}</div>
                <Button size="sm" variant="outline" icon={Receipt} onClick={() => invoice(j.job, j.client)}>Make invoice</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section className="space-y-2" aria-labelledby="recent-time">
          <h2 id="recent-time" className="text-base font-extrabold">Recent sessions</h2>
          <ul className="surface rounded-2xl divide-y divide-[var(--border)] text-xs">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3">
                <span className="flex-1 min-w-0 truncate"><strong>{e.job}</strong> · {new Date(e.startedAt).toLocaleString()}</span>
                {needsCheck(e, now) && <span className="inline-flex items-center gap-1 text-warning"><AlertTriangle size={12} /> over 10 h — check</span>}
                {e.billed && <span className="text-success">invoiced</span>}
                {!e.endedAt && <span className="text-aws-orange">running</span>}
                <span className="tabular-nums font-bold">{formatHM(durationMs(e, now))}</span>
                <button onClick={() => remove(e.id)} aria-label="Delete entry" className="text-muted hover:text-danger focus-ring rounded"><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted">
            Invoices made here are drafts. Open <Link to="/clients/paperwork?tab=invoices" className="underline">Contracts &amp; invoices</Link> to check and send them.
          </p>
        </section>
      )}
    </div>
  );
}
