/**
 * timeTracking.js — hours worked, per job, and turning them into an invoice.
 *
 * An entry is { id, job, client, startedAt, endedAt|null, note, billed? }.
 * At most one entry is running (endedAt === null) at a time.
 *
 * Honesty rules:
 *  - A timer left running overnight is not silently trusted. Anything over
 *    LONG_RUN_HOURS is flagged for a person to check before it is billed.
 *  - Billable hours are rounded up to the next quarter hour, and the
 *    invoice line says so, so the client sees how the number was made.
 *  - An entry already put on an invoice is never billed twice.
 */

const HOUR = 60 * 60 * 1000;
export const LONG_RUN_HOURS = 10;

function t(v) {
  if (!v) return null;
  const n = new Date(v).getTime();
  return Number.isNaN(n) ? null : n;
}

/** The running entry, if any. */
export function runningEntry(entries = []) {
  return entries.find((e) => e && !e.endedAt) || null;
}

/** Length of an entry in ms; a running one counts up to `now`. */
export function durationMs(entry, now = Date.now()) {
  const start = t(entry?.startedAt);
  if (start === null) return 0;
  const end = entry.endedAt ? t(entry.endedAt) : now;
  if (end === null || end < start) return 0;
  return end - start;
}

/** Should a person look at this entry before it is billed? */
export function needsCheck(entry, now = Date.now()) {
  return durationMs(entry, now) > LONG_RUN_HOURS * HOUR;
}

/** "1:05" style hours:minutes. */
export function formatHM(ms) {
  const mins = Math.floor(ms / 60000);
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
}

/**
 * Start a timer. Stops whatever was running first, so two timers can never
 * run at once and no time is counted twice.
 */
export function startTimer(entries = [], { job, client = '', note = '' }, now = Date.now(), id = `t-${now}`) {
  if (!String(job || '').trim()) throw new Error('Name the job you are timing.');
  const stopped = stopTimer(entries, now);
  return [{ id, job: job.trim(), client: client.trim(), note, startedAt: new Date(now).toISOString(), endedAt: null }, ...stopped];
}

export function stopTimer(entries = [], now = Date.now()) {
  return entries.map((e) => (e && !e.endedAt ? { ...e, endedAt: new Date(now).toISOString() } : e));
}

/** Monday 00:00 local time of the week containing `now`. */
export function weekStart(now = Date.now()) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
}

/** Hours this week, per job, newest job first. */
export function weekSummary(entries = [], now = Date.now()) {
  const from = weekStart(now);
  const byJob = new Map();
  let total = 0;
  for (const e of entries) {
    const start = t(e?.startedAt);
    if (start === null || start < from) continue;
    const ms = durationMs(e, now);
    total += ms;
    const row = byJob.get(e.job) || { job: e.job, client: e.client || '', ms: 0, entries: 0 };
    row.ms += ms; row.entries += 1;
    byJob.set(e.job, row);
  }
  return { from, totalMs: total, jobs: [...byJob.values()].sort((a, b) => b.ms - a.ms) };
}

/** Round up to the next quarter hour. 0 stays 0. */
export function billableHours(ms) {
  if (ms <= 0) return 0;
  return Math.ceil(ms / (15 * 60000)) / 4;
}

/**
 * Invoice lines for one job's unbilled, finished time.
 *
 * Running entries and ones that need a check are left out and returned
 * separately, so the caller can tell the person why they are missing.
 */
export function invoiceLinesFor(entries = [], job, rate, now = Date.now()) {
  const unit = Number(rate);
  if (!Number.isFinite(unit) || unit <= 0) throw new Error('Set an hourly rate above zero.');
  const mine = entries.filter((e) => e && e.job === job && !e.billed);
  const running = mine.filter((e) => !e.endedAt);
  const toCheck = mine.filter((e) => e.endedAt && needsCheck(e, now));
  const billable = mine.filter((e) => e.endedAt && !needsCheck(e, now));
  const ms = billable.reduce((n, e) => n + durationMs(e, now), 0);
  const qty = billableHours(ms);
  const lines = qty > 0 ? [{
    desc: `${job} — ${qty} h (${billable.length} session${billable.length === 1 ? '' : 's'}, rounded up to the quarter hour)`,
    qty, unit, amount: Math.round(qty * unit * 100) / 100,
  }] : [];
  return { lines, entryIds: billable.map((e) => e.id), running, toCheck };
}

/** Mark entries as billed on an invoice, so they are not billed again. */
export function markBilled(entries = [], ids = [], invoiceRef = '') {
  const set = new Set(ids);
  return entries.map((e) => (set.has(e.id) ? { ...e, billed: invoiceRef || true } : e));
}
