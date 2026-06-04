/**
 * sw.js — Service worker for AWS Career Launchpad Pro.
 *
 * Strategy: stale-while-revalidate for app shell + assets, network-only
 * for AWS SDK API calls. Means the app launches instantly on second
 * visit (and works offline for content you've already viewed), but
 * any LIVE deploy / API call still hits the network for fresh data.
 *
 * Cache versioning — bump CACHE_VERSION any time we want clients to
 * fully refresh. Old caches get pruned on activate.
 */

const CACHE_VERSION = 'v3-2026-06-launch';  // bumped to bust any stale caches from earlier deploys
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
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k)));
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

  // Same-origin assets — stale-while-revalidate
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

async function staleWhileRevalidate(req) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(req) {
  const cache = await caches.open(APP_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return cached; // returns undefined → browser network error
  }
}
