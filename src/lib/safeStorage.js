/**
 * safeStorage.js — localStorage writes that fail loudly, not silently.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * Every byte this app owns shares one ~5MB per-origin budget, and a
 * write that exceeds it throws. Most callers either ignored the throw or
 * wrapped it in an empty catch, so the failure mode was the worst
 * available one: the app carries on as though the write succeeded.
 *
 * That is not theoretical. The GitHub token, the sync device id and the
 * sync repository name were all written unguarded — so at quota a
 * sign-in appears to work and is gone on reload, and sync forgets which
 * repository is its own.
 *
 * Two rules here:
 *
 *   1. Caches are expendable, real work is not. When a write runs out of
 *      room, evict regenerable caches and retry before giving up. The
 *      gig feed is hundreds of KB and refetches itself in seconds;
 *      losing a proposal because of it would be absurd.
 *
 *   2. A write that still cannot be made is REPORTED. The caller learns
 *      it failed and the app can tell the user, instead of everyone
 *      pretending the data is saved.
 */
import { STORAGE_KEY } from './constants.js';

/**
 * Keys safe to drop under pressure, least valuable first. All of these
 * refetch or recompute on their own; none is user-authored.
 */
const EVICTABLE = [
  `${STORAGE_KEY}::gig-feed`,
  `${STORAGE_KEY}::aws-news-cache`,
  `${STORAGE_KEY}::route-memory`,
  `${STORAGE_KEY}::recorder::sessions`,
  `${STORAGE_KEY}::sync::rollback`,
  `${STORAGE_KEY}::sync::baseline`,
];

function isQuotaError(err) {
  if (!err) return false;
  // Browsers disagree on the name and code; match all the known spellings.
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014
  );
}

/** Bytes currently used by this app's keys. */
export function storageUsed() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_KEY)) continue;
      bytes += k.length + (localStorage.getItem(k) || '').length;
    }
  } catch { /* storage unavailable */ }
  return bytes;
}

/** Roughly how full the origin's budget is, 0..1. */
export function storagePressure(capBytes = 5 * 1024 * 1024) {
  return Math.min(1, storageUsed() / capBytes);
}

/**
 * Write a key, making room if needed.
 *
 * @returns {{ ok: boolean, evicted: string[], error?: string }}
 *   ok:false means the value is NOT saved. Callers must not treat that
 *   as success — that is the entire point of this module.
 */
export function safeSet(key, value) {
  const evicted = [];
  try {
    localStorage.setItem(key, value);
    return { ok: true, evicted };
  } catch (err) {
    if (!isQuotaError(err)) {
      return { ok: false, evicted, error: String(err?.message || err) };
    }
  }

  // Out of room. Drop regenerable caches, cheapest first, retrying after
  // each so we free no more than necessary.
  for (const victim of EVICTABLE) {
    if (victim === key) continue;          // never evict what we are writing
    try {
      if (localStorage.getItem(victim) === null) continue;
      localStorage.removeItem(victim);
      evicted.push(victim.replace(`${STORAGE_KEY}::`, ''));
      localStorage.setItem(key, value);
      return { ok: true, evicted };
    } catch (err) {
      if (!isQuotaError(err)) return { ok: false, evicted, error: String(err?.message || err) };
    }
  }

  return {
    ok: false,
    evicted,
    error: 'Browser storage is full and no cache could be freed. Export a backup, then clear old data in Settings → Data management.',
  };
}

/**
 * For call sites that genuinely cannot handle a failure inline. Still
 * never silent: it reports through the callback so the app can surface
 * the problem rather than lose the write without a word.
 */
let onFailure = null;
export function setStorageFailureHandler(fn) { onFailure = typeof fn === 'function' ? fn : null; }

export function safeSetOrWarn(key, value, label = key) {
  const result = safeSet(key, value);
  if (!result.ok) {
    console.error(`[storage] Could not save ${label}: ${result.error}`);
    try { onFailure?.({ key, label, error: result.error }); } catch { /* handler must not break the caller */ }
  } else if (result.evicted.length) {
    console.warn(`[storage] Freed ${result.evicted.join(', ')} to save ${label}.`);
  }
  return result.ok;
}
