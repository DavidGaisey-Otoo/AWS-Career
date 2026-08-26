import { lazy } from 'react';

const RECOVERY_KEY = 'awscl:stale-chunk-recovery';
const RECOVERY_WINDOW_MS = 2 * 60 * 1000;

export function isStaleChunkError(error) {
  const message = String(error?.message || error || '');
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .+ failed|error loading dynamically imported module/i.test(message);
}

function recoveryFingerprint(error) {
  const message = String(error?.message || error || '');
  const asset = message.match(/\/assets\/[^\s)]+/i)?.[0] || 'unknown-chunk';
  return `${window.location.pathname}:${asset}`;
}

/**
 * Recover an app tab that remained open across a GitHub Pages deployment.
 * Its old runtime can request hashed chunks that the new release no longer
 * publishes. Local user data is never cleared; only HTTP application caches
 * are removed before one guarded reload.
 */
export async function recoverStaleChunk(error) {
  if (typeof window === 'undefined' || !isStaleChunkError(error)) return false;

  const fingerprint = recoveryFingerprint(error);
  try {
    const previous = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || 'null');
    if (previous?.fingerprint === fingerprint && Date.now() - previous.at < RECOVERY_WINDOW_MS) return false;
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ fingerprint, at: Date.now() }));
  } catch { /* session storage may be unavailable */ }

  try {
    if (window.caches?.keys) {
      const keys = await window.caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('awscl-app-')).map((key) => window.caches.delete(key)));
    }
  } catch { /* a reload still helps without Cache API access */ }

  try {
    const registrations = await navigator.serviceWorker?.getRegistrations?.();
    await Promise.all((registrations || []).map((registration) => registration.update().catch(() => null)));
  } catch { /* offline/unsupported */ }

  window.location.reload();
  return true;
}

export function lazyWithRecovery(importer) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      if (await recoverStaleChunk(error)) {
        // Keep Suspense pending during the few milliseconds before reload.
        return await new Promise(() => {});
      }
      throw error;
    }
  });
}

