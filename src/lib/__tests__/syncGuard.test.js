import { assessIncoming, describeSnapshot } from '../gistSync.js';

/**
 * Sync used to decide by timestamp alone: newer wins, replace everything.
 *
 * That lost a real account. A throwaway profile created minutes earlier
 * on a different origin was "newer" than a year of work, so it silently
 * replaced it — different name, a third of the progress, no warning and
 * no undo.
 *
 * These tests pin the rule that replaced it: an incoming copy may only be
 * applied silently when it is plausibly the SAME account and not
 * materially smaller. Anything else has to ask.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const P = 'awscl-pro::v1::';

/** Build a snapshot's data map the way the app stores it. */
function snap({ name, questions = 0, padding = 0 }) {
  const attempts = questions ? [{ mode: 'standard', total: questions, correct: 0 }] : [];
  return {
    [`${P}profile`]: JSON.stringify({ name }),
    [`${P}exam`]: JSON.stringify({ certs: { 'saa-c03': { attempts } } }),
    ...(padding ? { [`${P}gig-feed`]: 'x'.repeat(padding) } : {}),
  };
}

export function runSyncGuardTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // ───────────── the incident this prevents ─────────────

  test('a different account cannot silently replace this one', () => {
    const local = snap({ name: 'David Gaisey-Otoo', questions: 125, padding: 50000 });
    const remote = snap({ name: 'Guu', questions: 65, padding: 1000 });
    const v = assessIncoming(local, remote);
    assert(v.safe === false, 'Guu was allowed to overwrite David silently');
    assert(v.reasons.some((r) => /Guu/.test(r) && /David/.test(r)), `reason did not name both accounts: ${JSON.stringify(v.reasons)}`);
  });

  test('the refusal explains itself in terms a person can act on', () => {
    const v = assessIncoming(
      snap({ name: 'David Gaisey-Otoo', questions: 125, padding: 50000 }),
      snap({ name: 'Guu', questions: 65, padding: 1000 })
    );
    assert(v.reasons.length >= 2, 'expected several distinct reasons');
    assert(v.reasons.some((r) => /65/.test(r) && /125/.test(r)), 'question counts were not quoted');
    assert(v.local.name === 'David Gaisey-Otoo' && v.remote.name === 'Guu', 'sides were reported the wrong way round');
  });

  // ───────────── normal syncing must still work ─────────────

  test('the same account syncing from another device is applied silently', () => {
    const local = snap({ name: 'David Gaisey-Otoo', questions: 125, padding: 50000 });
    const remote = snap({ name: 'David Gaisey-Otoo', questions: 140, padding: 52000 });
    const v = assessIncoming(local, remote);
    assert(v.safe === true, `blocked a legitimate sync: ${JSON.stringify(v.reasons)}`);
  });

  test('a brand-new device accepts the cloud copy', () => {
    // Nothing local to lose, so there is nothing to protect.
    const v = assessIncoming({}, snap({ name: 'David Gaisey-Otoo', questions: 125, padding: 50000 }));
    assert(v.safe === true, `a fresh device refused its own data: ${JSON.stringify(v.reasons)}`);
  });

  test('an unnamed local profile does not block a named cloud copy', () => {
    const v = assessIncoming(snap({ name: '', questions: 0 }), snap({ name: 'David Gaisey-Otoo', questions: 125 }));
    assert(v.safe === true, 'an empty profile blocked its own restore');
  });

  // ───────────── the other ways data goes missing ─────────────

  test('a same-named copy that lost progress is still refused', () => {
    // Same person, but the cloud copy has been wiped somehow.
    const local = snap({ name: 'David Gaisey-Otoo', questions: 125, padding: 50000 });
    const remote = snap({ name: 'David Gaisey-Otoo', questions: 0, padding: 100 });
    const v = assessIncoming(local, remote);
    assert(v.safe === false, 'a wiped cloud copy was allowed to overwrite real progress');
  });

  test('a much smaller copy is refused even with matching counts', () => {
    const local = { ...snap({ name: 'D', questions: 10 }), [`${P}gig-feed`]: 'x'.repeat(100000) };
    const remote = { ...snap({ name: 'D', questions: 10 }), [`${P}gig-feed`]: 'x'.repeat(500) };
    assert(assessIncoming(local, remote).safe === false, 'a drastically smaller copy was accepted');
  });

  test('small natural fluctuations are not treated as loss', () => {
    const local = { ...snap({ name: 'D', questions: 10 }), [`${P}gig-feed`]: 'x'.repeat(10000) };
    const remote = { ...snap({ name: 'D', questions: 10 }), [`${P}gig-feed`]: 'x'.repeat(9000) };
    assert(assessIncoming(local, remote).safe === true, 'a 10% cache difference was treated as data loss');
  });

  // ───────────── describeSnapshot ─────────────

  test('describeSnapshot reads identity and volume out of a snapshot', () => {
    const d = describeSnapshot(snap({ name: 'David Gaisey-Otoo', questions: 125, padding: 2048 }));
    assert(d.name === 'David Gaisey-Otoo', `name wrong: ${d.name}`);
    assert(d.questions === 125, `questions wrong: ${d.questions}`);
    assert(d.bytes > 2048, 'bytes not measured');
  });

  test('describeSnapshot copes with missing or malformed data', () => {
    for (const input of [{}, { [`${P}profile`]: 'not json' }, { [`${P}exam`]: '{}' }]) {
      const d = describeSnapshot(input);
      assert(typeof d.questions === 'number', 'questions was not a number');
      assert(d.name === null || typeof d.name === 'string', 'name had an unusable type');
    }
  });

  return { allPassed: results.every((r) => r.pass), results };
}
