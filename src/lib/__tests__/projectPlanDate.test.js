/**
 * A project plan's start date reaches the client.
 *
 * Plan generation did `new Date(input).toISOString()` with no checks.
 * That throws RangeError on anything unparseable — crashing generation —
 * and silently accepts nonsense, so a mistyped year produced a plan whose
 * window read "2 Feb 60922 → 9 Feb 60922". Both are unacceptable in a
 * document a client signs off.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// The shipped validator, transcribed.
function normaliseStartDate(raw, now = new Date()) {
  if (!raw) return { iso: now.toISOString() };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { error: 'That start date could not be read. Pick a date from the calendar.' };
  }
  const year = d.getUTCFullYear();
  const thisYear = now.getUTCFullYear();
  if (year < thisYear - 5 || year > thisYear + 10) {
    return { error: `Start date year ${year} looks wrong. Pick a date from the calendar.` };
  }
  return { iso: d.toISOString() };
}

export function runProjectPlanDateTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const NOW = new Date('2026-09-19T00:00:00Z');

  test('a normal start date passes through unchanged', () => {
    const r = normaliseStartDate('2026-09-22', NOW);
    assert(!r.error, `rejected a valid date: ${r.error}`);
    assert(r.iso.startsWith('2026-09-22'), `date changed: ${r.iso}`);
  });

  test('an empty date defaults to now rather than failing', () => {
    const r = normaliseStartDate('', NOW);
    assert(!r.error && r.iso === NOW.toISOString(), 'empty date was not defaulted');
  });

  test('the year 60922 is refused — the bug this fixes', () => {
    const r = normaliseStartDate('60922-02-02', NOW);
    assert(r.error, 'a plan could still be dated in the year 60922');
    assert(/60922/.test(r.error), `error did not name the bad year: ${r.error}`);
  });

  test('an unreadable date is refused instead of throwing', () => {
    for (const bad of ['not-a-date', '99/99/9999', '---']) {
      let r;
      try { r = normaliseStartDate(bad, NOW); }
      catch (e) { throw new Error(`threw instead of reporting: ${e.message}`); }
      assert(r.error, `accepted an unreadable date: ${bad}`);
    }
  });

  test('a date far in the past is refused', () => {
    assert(normaliseStartDate('1904-01-01', NOW).error, 'accepted a 1904 start date');
  });

  test('reasonable backdating and forward planning still work', () => {
    assert(!normaliseStartDate('2024-01-01', NOW).error, 'refused a plausible backdate');
    assert(!normaliseStartDate('2030-06-01', NOW).error, 'refused plausible forward planning');
  });

  test('the refusal tells the user what to do', () => {
    const r = normaliseStartDate('60922-02-02', NOW);
    assert(/calendar/i.test(r.error), `no guidance offered: ${r.error}`);
  });

  return { allPassed: results.every((r) => r.pass), results };
}
