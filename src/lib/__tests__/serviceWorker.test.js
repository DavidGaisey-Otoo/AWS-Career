import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

/**
 * The service worker is an optimisation. It must never be the reason the
 * app fails.
 *
 * It was. Every handler opened the cache before doing anything else, and
 * caches.open() can reject outright — a private window, storage turned
 * off, quota exhausted, or a profile whose cache backend is corrupt
 * ("Unexpected internal error"). respondWith() turns a rejected promise
 * into net::ERR_FAILED, so one unavailable cache failed every request the
 * worker touched: no route chunks, no navigation, a dead app on a network
 * that was working perfectly.
 *
 * These tests load the real public/sw.js and drive its fetch handler with
 * the cache broken.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const NETWORK_BODY = 'from-the-network';

/** Load the real worker with a controllable environment around it. */
function loadWorker({ cacheWorks = true, networkWorks = true } = {}) {
  const listeners = {};
  const cache = {
    match: async () => {
      if (!cacheWorks) throw new Error('cache read failed');
      return null;
    },
    put: async () => {},
    addAll: async () => {},
  };

  const context = {
    self: {
      addEventListener: (type, fn) => { listeners[type] = fn; },
      skipWaiting: () => {},
      clients: { claim: async () => {} },
      location: { origin: 'https://example.test' },
    },
    caches: {
      open: async () => {
        if (!cacheWorks) throw new Error('Failed to execute open on CacheStorage: Unexpected internal error.');
        return cache;
      },
      keys: async () => {
        if (!cacheWorks) throw new Error('CacheStorage unavailable');
        return [];
      },
      delete: async () => true,
    },
    fetch: async () => {
      if (!networkWorks) throw new Error('offline');
      return { ok: true, status: 200, body: NETWORK_BODY, clone: () => ({ body: NETWORK_BODY }) };
    },
    Response: { error: () => ({ __isError: true }) },
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    console,
  };
  context.globalThis = context;

  const source = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8');
  runInContext(source, createContext(context));
  return listeners;
}

/** Run the worker's fetch handler and return whatever it responded with. */
async function handle(listeners, { url, mode = 'no-cors', method = 'GET' }) {
  let responded;
  listeners.fetch({
    request: { url, mode, method },
    respondWith: (value) => { responded = value; },
  });
  return responded === undefined ? 'passed-through' : await responded;
}

export async function runServiceWorkerTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test('the worker registers install, activate and fetch handlers', () => {
    const listeners = loadWorker();
    for (const type of ['install', 'activate', 'fetch']) {
      assert(typeof listeners[type] === 'function', `no ${type} handler`);
    }
  });

  // ───────── the failure that killed the app ─────────

  await test('a route chunk still loads when the cache is unavailable', async () => {
    const listeners = loadWorker({ cacheWorks: false });
    const res = await handle(listeners, { url: 'https://example.test/assets/ProjectDetail-abc123.js' });
    assert(!res.__isError, 'a broken cache turned a working request into a network error');
    assert(res.body === NETWORK_BODY, 'the chunk did not come from the network');
  });

  await test('a page navigation still works when the cache is unavailable', async () => {
    const listeners = loadWorker({ cacheWorks: false });
    const res = await handle(listeners, { url: 'https://example.test/#/portfolio/p-s3-cf', mode: 'navigate' });
    assert(!res.__isError, 'a broken cache turned a navigation into an error page');
    assert(res.body === NETWORK_BODY, 'the page did not come from the network');
  });

  await test('other same-origin assets survive a broken cache', async () => {
    const listeners = loadWorker({ cacheWorks: false });
    const res = await handle(listeners, { url: 'https://example.test/favicon.svg' });
    assert(!res.__isError, 'a broken cache broke a same-origin asset');
  });

  await test('fonts survive a broken cache', async () => {
    const listeners = loadWorker({ cacheWorks: false });
    const res = await handle(listeners, { url: 'https://fonts.gstatic.com/s/inter.woff2' });
    assert(!res.__isError, 'a broken cache broke font loading');
  });

  await test('activating does not fail when the cache cannot be pruned', async () => {
    const listeners = loadWorker({ cacheWorks: false });
    let waited;
    listeners.activate({ waitUntil: (p) => { waited = p; } });
    await waited; // must resolve, not reject
  });

  // ───────── it must still behave normally ─────────

  await test('a healthy request is served from the network', async () => {
    const listeners = loadWorker();
    const res = await handle(listeners, { url: 'https://example.test/assets/index-abc.js' });
    assert(res.body === NETWORK_BODY, 'a healthy fetch did not return the network response');
  });

  await test('an offline request with no cache reports an error, not undefined', async () => {
    // respondWith(undefined) is a TypeError in the browser, which surfaces
    // as a broken page rather than a failed request.
    const listeners = loadWorker({ networkWorks: false });
    for (const url of ['https://example.test/assets/x.js', 'https://fonts.gstatic.com/s/i.woff2']) {
      const res = await handle(listeners, { url });
      assert(res !== undefined && res !== 'passed-through', `respondWith got nothing for ${url}`);
      assert(res.__isError, `expected a network error for ${url}`);
    }
  });

  await test('AWS and other live hosts are never intercepted', async () => {
    const listeners = loadWorker();
    for (const url of ['https://ec2.eu-west-2.amazonaws.com/', 'https://oauth2.googleapis.com/token']) {
      const res = await handle(listeners, { url });
      assert(res === 'passed-through', `the worker intercepted ${url}`);
    }
  });

  await test('non-GET requests are left alone', async () => {
    const listeners = loadWorker();
    const res = await handle(listeners, { url: 'https://example.test/api', method: 'POST' });
    assert(res === 'passed-through', 'the worker intercepted a POST');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
