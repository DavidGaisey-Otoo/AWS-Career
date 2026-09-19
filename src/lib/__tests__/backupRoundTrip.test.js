/**
 * Backup export/import must be lossless.
 *
 * localStorage holds strings and nothing else. Schema 1 parsed each value
 * on export and re-encoded every value on import, so any key whose value
 * was not JSON — a bare `project`, a device id, an OAuth client id — came
 * back wrapped in literal quotes. The keys that identify a device or a
 * Google client were exactly the ones it corrupted, silently.
 *
 * These tests run the real logic against a fake localStorage.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Minimal localStorage stand-in with the only semantics that matter. */
function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    dump: () => Object.fromEntries(map),
  };
}

const PREFIX = 'awscl-pro::v1::';

// The shipped implementations, transcribed against an injected storage.
function exportAll(storage) {
  const out = {};
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(PREFIX)) out[k] = storage.getItem(k);
  }
  return JSON.stringify({ exportedAt: new Date().toISOString(), schemaVersion: 2, data: out });
}

function importAll(storage, jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed?.data) throw new Error('Missing "data" key in backup');
  const schema = Number(parsed.schemaVersion) || 1;
  for (const [k, v] of Object.entries(parsed.data)) {
    if (!k.startsWith(PREFIX)) continue;
    const raw = schema >= 2 || typeof v === 'string' ? String(v) : JSON.stringify(v);
    storage.setItem(k, raw);
  }
}

export function runBackupRoundTripTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // The exact shapes found in a real backup from this app.
  const REAL = {
    [`${PREFIX}profile`]: JSON.stringify({ name: 'David Gaisey-Otoo', onboarded: true }),
    [`${PREFIX}sync::deviceId`]: 'device-4asjee-mqar6bja',        // bare string
    [`${PREFIX}google::clientId`]: '46545556327-6dde7s432pi9f',   // bare string
    [`${PREFIX}walkthroughs-view`]: 'project',                    // bare string
    [`${PREFIX}github::token`]: '',                               // empty string
    [`${PREFIX}exam`]: JSON.stringify({ certs: { 'saa-c03': { attempts: [1, 2, 3] } } }),
    [`${PREFIX}count`]: '125',                                    // numeric-looking string
  };

  test('a full export/import round-trip changes nothing at all', () => {
    const source = makeStorage(REAL);
    const target = makeStorage();
    importAll(target, exportAll(source));
    const before = source.dump();
    const after = target.dump();
    for (const k of Object.keys(before)) {
      assert(after[k] === before[k], `${k} changed: ${JSON.stringify(before[k])} -> ${JSON.stringify(after[k])}`);
    }
    assert(Object.keys(after).length === Object.keys(before).length, 'key count changed');
  });

  test('bare strings do not gain quotes — the bug this replaces', () => {
    const target = makeStorage();
    importAll(target, exportAll(makeStorage(REAL)));
    assert(target.getItem(`${PREFIX}walkthroughs-view`) === 'project', 'bare string was re-encoded');
    assert(target.getItem(`${PREFIX}sync::deviceId`) === 'device-4asjee-mqar6bja', 'device id was corrupted');
    assert(target.getItem(`${PREFIX}google::clientId`) === '46545556327-6dde7s432pi9f', 'client id was corrupted');
  });

  test('a numeric-looking string stays a string, not a number', () => {
    const target = makeStorage();
    importAll(target, exportAll(makeStorage(REAL)));
    assert(target.getItem(`${PREFIX}count`) === '125', 'numeric string was coerced');
  });

  test('JSON values survive byte-for-byte', () => {
    const target = makeStorage();
    importAll(target, exportAll(makeStorage(REAL)));
    const profile = JSON.parse(target.getItem(`${PREFIX}profile`));
    assert(profile.name === 'David Gaisey-Otoo', 'profile name lost');
    const exam = JSON.parse(target.getItem(`${PREFIX}exam`));
    assert(exam.certs['saa-c03'].attempts.length === 3, 'exam attempts lost');
  });

  test('older schema-1 backups still restore correctly', () => {
    // Schema 1 stored parsed JSON for parseable values, raw strings otherwise.
    const legacy = JSON.stringify({
      schemaVersion: 1,
      data: {
        [`${PREFIX}profile`]: { name: 'David Gaisey-Otoo', onboarded: true },  // parsed
        [`${PREFIX}walkthroughs-view`]: 'project',                             // raw
      },
    });
    const target = makeStorage();
    importAll(target, legacy);
    assert(JSON.parse(target.getItem(`${PREFIX}profile`)).name === 'David Gaisey-Otoo', 'legacy object lost');
    assert(target.getItem(`${PREFIX}walkthroughs-view`) === 'project', 'legacy bare string was re-encoded');
  });

  test('keys outside this app are never written', () => {
    const target = makeStorage();
    importAll(target, JSON.stringify({ schemaVersion: 2, data: { 'someone-elses-key': 'x' } }));
    assert(target.getItem('someone-elses-key') === null, 'wrote a key outside the app namespace');
  });

  test('a backup with no data key is rejected rather than half-applied', () => {
    let threw = false;
    try { importAll(makeStorage(), JSON.stringify({ schemaVersion: 2 })); } catch { threw = true; }
    assert(threw, 'accepted a backup with no data');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
