/**
 * sw.js — Service worker for AWS Career Launchpad Pro.
 *
 * Strategy: network-first for navigations, stale-while-revalidate for assets, network-only
 * for AWS SDK API calls. Means the app launches instantly on second
 * visit (and works offline for content you've already viewed), but
 * any LIVE deploy / API call still hits the network for fresh data.
 *
 * Cache versioning — bump CACHE_VERSION any time we want clients to
 * fully refresh. Old caches get pruned on activate.
 */

const CACHE_VERSION = 'v7-2026-09-cache-optional';
const APP_CACHE = `awscl-app-${CACHE_VERSION}`;

// Assets we want available offline immediately on first visit
const APP_SHELL_FALLBACKS = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.webmanifest',
];

// Origins we MUST NOT cache — live data only
const NETWORK_ONLY_HOSTS = [
  'amazonaws.com',          // any AWS API
  'cloudformation.amazonaws.com',
  'remoteok.com',
  'corsproxy.io',           // RSS proxy for gig feed
  'oauth2.googleapis.com',
  'accounts.google.com',
  'googleapis.com',
];

// ════════════════════════════════════════════════════════════════════
// Lifecycle
// ════════════════════════════════════════════════════════════════════
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL_FALLBACKS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k)));
      } catch {
        // Pruning is housekeeping. If the cache store is unavailable the
        // worker must still activate, because the handlers below work
        // without it — see openCache.
      }
      await self.clients.claim();
    })()
  );
});

// ════════════════════════════════════════════════════════════════════
// Fetch handler
// ════════════════════════════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // SW only proxies GET

  const url = new URL(req.url);

  // Skip cross-origin to-be-network-only hosts
  if (NETWORK_ONLY_HOSTS.some((h) => url.hostname.endsWith(h))) return;

  // HTML/navigation must prefer the latest deployment. Falling back to the
  // cached shell keeps offline support without trapping users on an old UI.
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, true));
    return;
  }

  // Hashed build assets are immutable. Network-first prevents a tab from
  // being handed an obsolete runtime/chunk pairing immediately after deploy;
  // the cache remains an offline fallback.
  if (url.origin === self.location.origin && url.pathname.includes('/assets/')) {
    event.respondWith(networkFirst(req, false));
    return;
  }

  // Other same-origin assets — stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Cross-origin fonts (Google Fonts) — cache first, network fallback
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default — let the browser handle it
});

/**
 * The cache is an optimisation, never a dependency.
 *
 * caches.open() can reject outright — a private window, storage disabled,
 * quota exhausted, or a profile whose cache backend is corrupt, which
 * fails with "Unexpected internal error". Because every handler below
 * opened the cache first and respondWith() turns a rejected promise into
 * net::ERR_FAILED, one broken cache took down every request the worker
 * touched: no chunks, no navigation, a dead app on a working network.
 *
 * Returning null here lets each handler fall through to the network.
 */
async function openCache() {
  try {
    return await caches.open(APP_CACHE);
  } catch {
    return null;
  }
}

/** cache.match that never rejects — a miss and a broken store are the same. */
async function matchIn(cache, req) {
  if (!cache) return null;
  try {
    return (await cache.match(req)) || null;
  } catch {
    return null;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await openCache();
  const cached = await matchIn(cache, req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok && cache) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => cached || Response.error());
  return cached || fetchPromise;
}

async function networkFirst(req, allowShellFallback = false) {
  const cache = await openCache();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(req, { cache: 'no-store', signal: controller.signal });
    if (res.ok && cache) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const exact = await matchIn(cache, req);
    if (exact) return exact;
    if (allowShellFallback) return (await matchIn(cache, './index.html')) || Response.error();
    return Response.error();
  } finally {
    clearTimeout(timeout);
  }
}

async function cacheFirst(req) {
  const cache = await openCache();
  const cached = await matchIn(cache, req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && cache) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return Response.error();
  }
}
