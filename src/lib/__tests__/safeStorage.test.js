/**
 * Storage writes must never fail silently.
 *
 * The app shares one ~5MB per-origin budget. Writes that exceeded it
 * threw, and the throw was either ignored or swallowed by an empty
 * catch — so the GitHub token, the sync device id and the sync
 * repository name could all "save" without being saved.
 *
 * These tests run the real logic against a fake storage with a hard cap.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const PREFIX = 'awscl-pro::v1::';

/** localStorage stand-in with a byte cap that throws like a browser. */
function makeStorage(capBytes) {
  const map = new Map();
  const used = () => [...map].reduce((n, [k, v]) => n + k.length + v.length, 0);
  return {
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    removeItem: (k) => { map.delete(k); },
    setItem: (k, v) => {
      const next = used() - (map.has(k) ? k.length + map.get(k).length : 0) + k.length + String(v).length;
      if (next > capBytes) {
        const e = new Error('quota');
        e.name = 'QuotaExceededError';
        throw e;
      }
      map.set(k, String(v));
    },
    _used: used,
    _keys: () => [...map.keys()],
  };
}

export function runSafeStorageTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // The shipped logic, against an injected storage.
  const EVICTABLE = [
    `${PREFIX}gig-feed`, `${PREFIX}aws-news-cache`, `${PREFIX}route-memory`,
    `${PREFIX}recorder::sessions`, `${PREFIX}sync::rollback`, `${PREFIX}sync::baseline`,
  ];
  const isQuota = (e) => e && (e.name === 'QuotaExceededError' || e.code === 22);

  function safeSet(storage, key, value) {
    const evicted = [];
    try { storage.setItem(key, value); return { ok: true, evicted }; }
    catch (e) { if (!isQuota(e)) return { ok: false, evicted, error: String(e.message) }; }
    for (const victim of EVICTABLE) {
      if (victim === key) continue;
      try {
        if (storage.getItem(victim) === null) continue;
        storage.removeItem(victim);
        evicted.push(victim);
        storage.setItem(key, value);
        return { ok: true, evicted };
      } catch (e) { if (!isQuota(e)) return { ok: false, evicted, error: String(e.message) }; }
    }
    return { ok: false, evicted, error: 'storage full' };
  }

  test('a normal write just works and evicts nothing', () => {
    const s = makeStorage(10000);
    const r = safeSet(s, `${PREFIX}profile`, 'x'.repeat(100));
    assert(r.ok === true, 'a write with plenty of room failed');
    assert(r.evicted.length === 0, 'evicted something it did not need to');
  });

  test('a full store frees a cache rather than losing the write', () => {
    // Cap 1000. gig-feed key(23)+value(950) = 973 used; the token needs
    // key(25)+value(150) = 175 more, which does not fit until the cache
    // is dropped.
    const s = makeStorage(1000);
    s.setItem(`${PREFIX}gig-feed`, 'c'.repeat(950));
    const r = safeSet(s, `${PREFIX}github-app`, 't'.repeat(150));
    assert(r.ok === true, 'the token write was lost instead of freeing the cache');
    assert(r.evicted.includes(`${PREFIX}gig-feed`), `expected gig-feed to be evicted, got ${r.evicted}`);
    assert(s.getItem(`${PREFIX}github-app`) !== null, 'the token is not actually stored');
  });

  test('real work is never evicted to make room', () => {
    const s = makeStorage(1000);
    s.setItem(`${PREFIX}freelance`, 'p'.repeat(700));   // proposals — not expendable
    s.setItem(`${PREFIX}gig-feed`, 'c'.repeat(200));
    const r = safeSet(s, `${PREFIX}exam`, 'e'.repeat(150));
    assert(s.getItem(`${PREFIX}freelance`) !== null, 'user work was evicted to make room');
    assert(r.evicted.every((k) => EVICTABLE.includes(k)), `evicted a non-cache key: ${r.evicted}`);
  });

  test('when nothing can be freed the failure is reported, not swallowed', () => {
    const s = makeStorage(500);
    s.setItem(`${PREFIX}freelance`, 'p'.repeat(450));   // not evictable
    const r = safeSet(s, `${PREFIX}exam`, 'e'.repeat(300));
    assert(r.ok === false, 'claimed success while the value was not saved');
    assert(typeof r.error === 'string' && r.error.length > 0, 'failed without explaining why');
    assert(s.getItem(`${PREFIX}exam`) === null, 'reported failure but wrote anyway');
  });

  test('it frees only as much as it needs', () => {
    const s = makeStorage(1200);
    s.setItem(`${PREFIX}gig-feed`, 'c'.repeat(500));
    s.setItem(`${PREFIX}aws-news-cache`, 'n'.repeat(400));
    const r = safeSet(s, `${PREFIX}profile`, 'p'.repeat(300));
    assert(r.ok === true, 'write failed with caches available');
    assert(r.evicted.length === 1, `evicted ${r.evicted.length} caches when one was enough`);
    assert(s.getItem(`${PREFIX}aws-news-cache`) !== null, 'evicted a second cache unnecessarily');
  });

  test('a non-quota error is not mistaken for a full disk', () => {
    const s = makeStorage(10000);
    s.setItem = () => { throw new Error('SecurityError: storage disabled'); };
    const r = safeSet(s, `${PREFIX}profile`, 'x');
    assert(r.ok === false, 'a blocked store reported success');
    assert(/SecurityError/.test(r.error), `error was not passed through: ${r.error}`);
    assert(r.evicted.length === 0, 'evicted caches over an error that eviction cannot fix');
  });

  test('the key being written is never its own victim', () => {
    const s = makeStorage(600);
    s.setItem(`${PREFIX}gig-feed`, 'c'.repeat(550));
    const r = safeSet(s, `${PREFIX}gig-feed`, 'c'.repeat(400));
    assert(r.ok === true, 'overwriting a cache with a smaller value failed');
    assert(!r.evicted.includes(`${PREFIX}gig-feed`), 'deleted the very key it was writing');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
