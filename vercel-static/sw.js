/**
 * Service-worker kill switch for the Vercel origin.
 *
 * This origin used to serve the whole app, so any browser that opened it
 * registered the app's real service worker here. That worker caches the
 * app shell, which means it can keep serving a stale copy of the app from
 * this origin offline — a ghost second instance with its own localStorage,
 * long after the origin stopped being the app's home.
 *
 * The app is now served only from GitHub Pages. This file replaces the old
 * worker, drops every cache it left behind, and unregisters itself. It must
 * keep being served (not deleted) so browsers holding the old worker have
 * something to update to.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        /* cache API unavailable — unregistering still helps */
      }

      await self.registration.unregister();

      // Reload any open tab on this origin so it follows the redirect to
      // the real app instead of sitting on cached content.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        try {
          client.navigate(client.url);
        } catch {
          /* navigation blocked — the unregister above is the important part */
        }
      }
    })()
  );
});
