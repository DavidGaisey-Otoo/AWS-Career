/**
 * Billing hours is billing money. A timer that ran all night, a session
 * billed twice, or a total rounded in a way the client cannot see would
 * each overcharge someone — so each is checked here.
 */
import {
  billableHours, durationMs, invoiceLinesFor, markBilled, needsCheck, runningEntry,
  startTimer, stopTimer, weekStart, weekSummary,
} from '../timeTracking.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const H = 60 * 60 * 1000;
const T0 = new Date(2026, 10, 18, 9, 0).getTime(); // Wed 18 Nov 2026, 09:00
const iso = (ms) => new Date(ms).toISOString();

export function runTimeTrackingTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('starting a timer stops the one already running — never two at once', () => {
    let e = startTimer([], { job: 'A' }, T0, 'a');
    e = startTimer(e, { job: 'B' }, T0 + H, 'b');
    assert(e.filter((x) => !x.endedAt).length === 1, 'two timers running');
    assert(runningEntry(e).job === 'B', 'wrong timer running');
    assert(durationMs(e.find((x) => x.id === 'a')) === H, 'first timer not stopped at the switch');
  });

  test('a timer needs a job name', () => {
    let threw = false;
    try { startTimer([], { job: '  ' }, T0); } catch { threw = true; }
    assert(threw, 'started a timer with no job');
  });

  test('a running timer counts up to now; a stopped one does not', () => {
    const e = startTimer([], { job: 'A' }, T0, 'a');
    assert(durationMs(e[0], T0 + 2 * H) === 2 * H, 'running duration wrong');
    const s = stopTimer(e, T0 + H);
    assert(durationMs(s[0], T0 + 5 * H) === H, 'stopped timer kept counting');
  });

  test('hours round up to the quarter hour, and zero stays zero', () => {
    assert(billableHours(0) === 0, '0 billed');
    assert(billableHours(1) === 0.25, '1ms not rounded up');
    assert(billableHours(61 * 60000) === 1.25, '61 min wrong');
    assert(billableHours(H) === 1, 'exact hour rounded');
  });

  test('a timer left running overnight is held back for a check, not billed', () => {
    const entries = [
      { id: 'ok', job: 'A', startedAt: iso(T0), endedAt: iso(T0 + 2 * H) },
      { id: 'long', job: 'A', startedAt: iso(T0 - 14 * H), endedAt: iso(T0) },
    ];
    assert(needsCheck(entries[1]) && !needsCheck(entries[0]), 'check flag wrong');
    const out = invoiceLinesFor(entries, 'A', 50, T0 + 3 * H);
    assert(out.lines[0].qty === 2 && out.lines[0].amount === 100, JSON.stringify(out.lines));
    assert(out.toCheck.length === 1 && !out.entryIds.includes('long'), 'long run was billed');
  });

  test('the running session is not billed until it stops', () => {
    const entries = startTimer([], { job: 'A' }, T0, 'r');
    const out = invoiceLinesFor(entries, 'A', 50, T0 + H);
    assert(out.lines.length === 0 && out.running.length === 1, 'billed a running timer');
  });

  test('time already invoiced is never billed twice', () => {
    let entries = [{ id: 'x', job: 'A', startedAt: iso(T0), endedAt: iso(T0 + H) }];
    const first = invoiceLinesFor(entries, 'A', 40, T0 + 2 * H);
    entries = markBilled(entries, first.entryIds, 'INV-0001');
    const second = invoiceLinesFor(entries, 'A', 40, T0 + 2 * H);
    assert(first.lines.length === 1 && second.lines.length === 0, 'billed twice');
  });

  test('the invoice line says how the hours were rounded', () => {
    const out = invoiceLinesFor([{ id: 'x', job: 'Site', startedAt: iso(T0), endedAt: iso(T0 + 50 * 60000) }], 'Site', 40, T0 + H);
    assert(/rounded up to the quarter hour/.test(out.lines[0].desc), out.lines[0].desc);
  });

  test('no rate, no invoice', () => {
    let threw = false;
    try { invoiceLinesFor([], 'A', 0); } catch { threw = true; }
    assert(threw, 'invoiced at a zero rate');
  });

  test('the week starts on Monday and only counts this week', () => {
    const mon = weekStart(T0);
    assert(new Date(mon).getDay() === 1 && new Date(mon).getDate() === 16, `week starts ${new Date(mon)}`);
    const w = weekSummary([
      { id: '1', job: 'A', startedAt: iso(T0), endedAt: iso(T0 + H) },
      { id: '2', job: 'A', startedAt: iso(mon - H), endedAt: iso(mon - H / 2) },
    ], T0 + 2 * H);
    assert(w.totalMs === H, 'last week counted');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
