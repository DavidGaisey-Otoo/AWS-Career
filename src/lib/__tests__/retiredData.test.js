/**
 * Clearing the removed pages' data must never touch live data.
 *
 * The cleanup runs over the same localStorage that holds the vault, the
 * GitHub token, every client job and the session log. A pattern one
 * character too loose (`session` instead of `session::`) would delete the
 * session log along with the exam autosaves, so the live keys are listed
 * here and each one is checked.
 */
import { STORAGE_KEY } from '../constants.js';
import { RETIRED_KEYS, findRetiredData, isRetiredKey, removeRetiredData } from '../retiredData.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const k = (rest) => `${STORAGE_KEY}::${rest}`;

/** Keys live features read today. None of these may ever be cleared. */
const LIVE = [
  'session-log', 'freelance', 'portfolio', 'gig-feed', 'deploy::vault', 'deploy::audit',
  'deploy::settings', 'github', 'github::token', 'aws', 'earn', 'prefs', 'profile',
  'idea-studio::history', 'recorder::sessions', 'route-memory', 'sync::meta',
  'console-walk::s3cf-1', 'walkthrough::mfa-root', 'wizard::project-builder', 'ai',
  'examples', 'learning-path', 'roadmapper', 'uk-client',
];

function makeStorage(entries) {
  const map = new Map(entries);
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (x) => (map.has(x) ? map.get(x) : null),
    removeItem: (x) => { map.delete(x); },
    _keys: () => [...map.keys()],
  };
}

export function runRetiredDataTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('every live key is left alone', () => {
    for (const rest of LIVE) assert(!isRetiredKey(k(rest)), `would delete live key ${rest}`);
  });

  test('the session log survives; only the exam autosave matches session', () => {
    assert(!isRetiredKey(k('session-log')), 'session-log matched');
    assert(isRetiredKey(k('session::exam/saa-c03/standard::answers')), 'exam autosave not matched');
  });

  test('every listed retired key matches', () => {
    for (const rest of RETIRED_KEYS) assert(isRetiredKey(k(rest)), `${rest} not matched`);
  });

  test('keys from other apps and other prefixes are never touched', () => {
    assert(!isRetiredKey('exam'), 'bare key matched');
    assert(!isRetiredKey('other-app::v1::exam'), 'foreign prefix matched');
    assert(!isRetiredKey(`${STORAGE_KEY}exam`), 'missing separator matched');
    assert(!isRetiredKey(null), 'null matched');
  });

  test('removal clears exactly the retired keys and reports their size', () => {
    const live = LIVE.map((rest) => [k(rest), 'keep']);
    const dead = [[k('exam'), '12345'], [k('session::exam/x::seed'), '1']];
    const s = makeStorage([...live, ...dead]);
    const found = findRetiredData(s);
    assert(found.keys.length === 2, `found ${found.keys.length}`);
    const out = removeRetiredData(s);
    assert(out.removed === 2, `removed ${out.removed}`);
    assert(out.bytes === dead.reduce((n, [a, b]) => n + a.length + b.length, 0), 'byte count wrong');
    assert(s._keys().length === LIVE.length, 'a live key was removed');
  });

  test('nothing to remove reads as nothing, not as an error', () => {
    const out = removeRetiredData(makeStorage([[k('freelance'), '{}']]));
    assert(out.removed === 0 && out.bytes === 0, 'reported removals on a clean store');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
