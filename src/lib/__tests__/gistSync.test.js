/**
 * gistSync.test.js — the sync snapshot must never carry a secret.
 *
 * Why this suite exists: an earlier version uploaded the GitHub PAT and
 * the Google OAuth client secret into the sync gist. GitHub "secret"
 * gists are readable by anyone holding the URL, so that was a real
 * credential leak. These tests are the guard against it coming back.
 *
 * Runs in Node, so localStorage is shimmed below.
 */

// ── localStorage shim ─────────────────────────────────────────────────
// Installed at import (gistSync reads storage at module scope) AND again
// when the suite runs. The re-install matters: other suites in the same
// process install their own shim on the same global, and whichever
// imported last would otherwise own it — leaving these tests writing to
// one store and asserting against another. That exact collision made this
// suite fail the moment a second storage-backed suite was added.
const store = new Map();

function installShim() {
  globalThis.localStorage = {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
  };
}
installShim();

const { snapshotLocalStorage, restoreLocalStorage } = await import('../gistSync.js');

const K = 'awscl-pro::v1';

// Realistic-looking fake credentials (not real, and never were)
const FAKE = {
  classicPat: 'ghp_' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8',
  finePat: 'github_pat_' + '11ABCDEFG0abcdefghijklmn_' + 'OPQRSTUVWXYZ0123456789abcdefghij',
  awsKey: 'AKIA' + 'IOSFODNN7EXAMPLE',
  googleSecret: 'GOCSPX-' + 'abcdefghijklmnop1234',
};

function seed(entries) {
  store.clear();
  for (const [k, v] of Object.entries(entries)) {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/** Flatten a snapshot back to one searchable string. */
function snapshotText(snap) {
  return JSON.stringify(snap);
}

const CHECKS = [
  {
    name: 'the GitHub PAT key is never included in a snapshot',
    run: () => {
      seed({
        [`${K}::github`]: { token: FAKE.classicPat, expiresAt: null },
        [`${K}::notes`]: { a: 'keep me' },
      });
      const snap = snapshotLocalStorage();
      assert(!(`${K}::github` in snap.data), 'the ::github key was included');
      assert(!snapshotText(snap).includes(FAKE.classicPat), 'the PAT leaked into the snapshot');
      assert(`${K}::notes` in snap.data, 'ordinary user data was wrongly dropped');
    },
  },
  {
    name: 'Google OAuth tokens and client secret are never included',
    run: () => {
      seed({
        [`${K}::google`]: { access_token: 'ya29.FAKE', refresh_token: '1//FAKE' },
        [`${K}::google::clientSecret`]: FAKE.googleSecret,
        [`${K}::google::pkce`]: { verifier: 'abc' },
      });
      const snap = snapshotLocalStorage();
      const text = snapshotText(snap);
      assert(!text.includes(FAKE.googleSecret), 'the Google client secret leaked');
      assert(!text.includes('ya29.FAKE'), 'a Google access token leaked');
      assert(!text.includes('1//FAKE'), 'a Google refresh token leaked');
    },
  },
  {
    name: 'a token nested inside otherwise-syncable state is scrubbed',
    run: () => {
      // Legacy AppContext kept the PAT at integrations.githubToken inside
      // ::app — a key that IS synced. The value must be scrubbed in place.
      seed({
        [`${K}::app`]: {
          theme: 'dark',
          integrations: { githubToken: FAKE.classicPat, calendarEnabled: true },
        },
      });
      const snap = snapshotLocalStorage();
      const text = snapshotText(snap);
      assert(!text.includes(FAKE.classicPat), 'nested githubToken leaked');
      assert(text.includes('dark'), 'scrubbing destroyed unrelated settings');
      assert(text.includes('calendarEnabled'), 'scrubbing removed a sibling field it should have kept');
    },
  },
  {
    name: 'raw credential patterns anywhere in a value drop the whole key',
    run: () => {
      seed({
        [`${K}::scratch`]: `my aws key is ${FAKE.awsKey} do not share`,
        [`${K}::scratch2`]: `token ${FAKE.finePat}`,
        [`${K}::safe`]: 'nothing sensitive here',
      });
      const snap = snapshotLocalStorage();
      const text = snapshotText(snap);
      assert(!text.includes(FAKE.awsKey), 'an AWS access key id leaked');
      assert(!text.includes(FAKE.finePat), 'a fine-grained PAT leaked');
      assert(`${K}::safe` in snap.data, 'a harmless key was dropped');
    },
  },
  {
    name: 'AWS credential vault keys are excluded',
    run: () => {
      seed({
        [`${K}::vault`]: { ct: 'encrypted-blob' },
        [`${K}::aws::credentials`]: { accessKeyId: FAKE.awsKey },
      });
      const snap = snapshotLocalStorage();
      assert(Object.keys(snap.data).length === 0, 'vault or raw AWS creds were included');
    },
  },
  {
    name: 'restore re-scrubs, so an old poisoned snapshot cannot reinstate a secret',
    run: () => {
      store.clear();
      // A v1 snapshot captured before the sanitizer existed
      const poisoned = {
        version: 1,
        data: {
          [`${K}::app`]: JSON.stringify({ integrations: { githubToken: FAKE.classicPat } }),
          [`${K}::github`]: JSON.stringify({ token: FAKE.classicPat }),
          [`${K}::notes`]: JSON.stringify({ a: 1 }),
        },
      };
      restoreLocalStorage(poisoned, { mergeStrategy: 'replace' });
      const all = [...store.values()].join('|');
      assert(!all.includes(FAKE.classicPat), 'restore reinstated a leaked PAT into localStorage');
      assert(store.has(`${K}::notes`), 'restore dropped legitimate data');
      assert(!store.has(`${K}::github`), 'restore wrote the blocklisted ::github key');
    },
  },
  {
    name: 'snapshots are stamped v2 so old ones can be detected',
    run: () => {
      seed({ [`${K}::notes`]: { a: 1 } });
      assert(snapshotLocalStorage().version === 2, 'snapshot version was not bumped to 2');
    },
  },
  {
    name: 'fill-missing merge never overwrites existing local data',
    run: () => {
      store.clear();
      localStorage.setItem(`${K}::notes`, JSON.stringify({ local: true }));
      restoreLocalStorage(
        { version: 2, data: { [`${K}::notes`]: JSON.stringify({ remote: true }), [`${K}::new`]: '"x"' } },
        { mergeStrategy: 'fill-missing' }
      );
      assert(localStorage.getItem(`${K}::notes`).includes('local'), 'fill-missing overwrote existing data');
      assert(localStorage.getItem(`${K}::new`) !== null, 'fill-missing skipped a genuinely new key');
    },
  },
];

export function runGistSyncTests() {
  installShim();   // reclaim the global from any other suite's shim
  const results = CHECKS.map((c) => {
    try {
      c.run();
      return { name: c.name, pass: true, error: null };
    } catch (err) {
      return { name: c.name, pass: false, error: String(err.message || err) };
    }
  });
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, total: results.length, allPassed: passed === results.length };
}

export function printGistSyncReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  SYNC SECRET-LEAK TESTS');
  lines.push('═══════════════════════════════════════════════════════════════');
  for (const r of report.results) {
    lines.push(`${r.pass ? '✓' : '✗'} ${r.name}`);
    if (!r.pass) lines.push(`     ${r.error}`);
  }
  lines.push('---------------------------------------------------------------');
  lines.push(`OVERALL: ${report.passed}/${report.total} passed`);
  lines.push('═══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}
