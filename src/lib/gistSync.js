/**
 * gistSync.js — cross-device sync via a private GitHub Gist.
 *
 * Why this exists:
 *   The app stores everything in localStorage (per-device, no backend).
 *   The user wants to start on laptop and continue on phone. Spinning up
 *   a real backend is a week of work; using the GitHub PAT they already
 *   have to sync via a *private* Gist solves the same problem in hours.
 *
 * How it works:
 *   - A snapshot = JSON of every localStorage key under `awscl-pro::v1::*`
 *     (excluding sensitive blobs and ephemeral state).
 *   - On every change (debounced 4s), we PATCH the Gist with the latest
 *     snapshot.
 *   - On app open (or manual pull), we GET the Gist and restore the
 *     snapshot if it's newer than what's in this browser.
 *   - The Gist ID is stored in localStorage so subsequent runs reuse it.
 *
 * Privacy + safety:
 *   - The Gist is created as PRIVATE (secret) — only the PAT owner can
 *     read it. The URL is unguessable but is not access-controlled by
 *     anything except being unlisted, so DON'T use this for true secrets.
 *   - We DELIBERATELY skip the encrypted vault blob (cryptoVault) and
 *     raw AWS access keys. Those should never leave the source device
 *     unencrypted.
 *   - Sync can be disabled at any time; the Gist can be deleted from
 *     github.com/settings/gists.
 */

import { STORAGE_KEY } from './constants.js';
import { readToken } from './githubToken.js';

const GIST_DESCRIPTION = 'AWS Career Launchpad Pro — sync snapshot (do not edit by hand)';
const GIST_FILENAME    = 'awscl-pro-state.json';
const GIST_ID_KEY      = `${STORAGE_KEY}::sync::gistId`;
const SYNC_META_KEY    = `${STORAGE_KEY}::sync::meta`;
const SYNC_ENABLED_KEY = `${STORAGE_KEY}::sync::enabled`;
const DEVICE_ID_KEY    = `${STORAGE_KEY}::sync::deviceId`;

// Keys we deliberately exclude from sync (sensitive + ephemeral)
const SYNC_BLOCKLIST = [
  `${STORAGE_KEY}::vault`,                    // encrypted AWS cred vault (per-device)
  `${STORAGE_KEY}::deploy::vault`,            //
  `${STORAGE_KEY}::aws::credentials`,         // raw AWS keys (never sync)
  `${STORAGE_KEY}::sync::gistId`,             // sync infrastructure itself
  `${STORAGE_KEY}::sync::meta`,
  `${STORAGE_KEY}::sync::enabled`,
  `${STORAGE_KEY}::sync::deviceId`,
];

// ════════════════════════════════════════════════════════════════════
// Snapshot helpers — read/write localStorage
// ════════════════════════════════════════════════════════════════════

export function snapshotLocalStorage() {
  const data = {};
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_KEY)) continue;
    if (SYNC_BLOCKLIST.some((b) => key === b || key.startsWith(`${b}::`))) continue;
    // Skip any key that looks like a raw AWS access key
    if (/AKIA[0-9A-Z]{16}/.test(key)) continue;
    data[key] = localStorage.getItem(key);
    count++;
  }
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    deviceId: getDeviceId(),
    keyCount: count,
    data,
  };
}

export function restoreLocalStorage(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.data) {
    throw new Error('Invalid snapshot');
  }
  const { mergeStrategy = 'replace' } = options;
  let written = 0;
  for (const [key, value] of Object.entries(snapshot.data)) {
    if (typeof value !== 'string') continue;
    if (SYNC_BLOCKLIST.some((b) => key === b || key.startsWith(`${b}::`))) continue;
    if (mergeStrategy === 'replace') {
      localStorage.setItem(key, value);
      written++;
    } else if (mergeStrategy === 'keep-newer' && !localStorage.getItem(key)) {
      localStorage.setItem(key, value);
      written++;
    }
  }
  return { written };
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ════════════════════════════════════════════════════════════════════
// Sync meta — track last sync time + remote timestamp
// ════════════════════════════════════════════════════════════════════

export function readSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    return raw ? JSON.parse(raw) : { lastPushAt: null, lastPullAt: null, remoteTimestamp: null, lastError: null };
  } catch {
    return { lastPushAt: null, lastPullAt: null, remoteTimestamp: null, lastError: null };
  }
}

export function writeSyncMeta(patch) {
  const next = { ...readSyncMeta(), ...patch };
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(next));
  return next;
}

export function isSyncEnabled() {
  return localStorage.getItem(SYNC_ENABLED_KEY) === 'true';
}

export function setSyncEnabled(enabled) {
  localStorage.setItem(SYNC_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function getStoredGistId() {
  return localStorage.getItem(GIST_ID_KEY) || null;
}

export function setStoredGistId(id) {
  if (id) localStorage.setItem(GIST_ID_KEY, id);
  else localStorage.removeItem(GIST_ID_KEY);
}

// ════════════════════════════════════════════════════════════════════
// GitHub Gist API — bare-fetch, no octokit
// ════════════════════════════════════════════════════════════════════

const GITHUB_API = 'https://api.github.com';

function getToken() {
  const t = readToken();
  return t?.token || null;
}

async function ghFetch(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('No GitHub token configured');
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Authorization': `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Find an existing sync gist OR create a new one.
 * We identify it by description prefix so we don't need to remember the ID
 * if the user clears storage.
 */
export async function getOrCreateSyncGist() {
  const stored = getStoredGistId();
  if (stored) {
    try {
      const g = await ghFetch(`/gists/${stored}`);
      return g;
    } catch (err) {
      // Stored ID is dead — fall through to re-find/create
      if (!String(err.message || '').includes('404')) throw err;
    }
  }

  // Search the user's gists for one with our description
  const gists = await ghFetch('/gists?per_page=100');
  const found = (gists || []).find((g) => g?.description === GIST_DESCRIPTION);
  if (found) {
    setStoredGistId(found.id);
    return found;
  }

  // Create a new one
  const created = await ghFetch('/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false, // SECRET / private
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(snapshotLocalStorage(), null, 2) },
      },
    }),
  });
  setStoredGistId(created.id);
  return created;
}

/**
 * Pull the latest snapshot from the gist and parse it.
 * Returns { snapshot, remoteTimestamp } or null if no remote data yet.
 */
export async function pullSnapshot() {
  const gist = await getOrCreateSyncGist();
  const file = gist?.files?.[GIST_FILENAME];
  if (!file) return null;
  const content = file.truncated ? await fetch(file.raw_url).then((r) => r.text()) : file.content;
  try {
    const snapshot = JSON.parse(content);
    return { snapshot, remoteTimestamp: snapshot.timestamp, gistUrl: gist.html_url };
  } catch {
    return null;
  }
}

/**
 * Push a fresh snapshot of localStorage to the gist.
 */
export async function pushSnapshot() {
  const gist = await getOrCreateSyncGist();
  const snapshot = snapshotLocalStorage();
  const updated = await ghFetch(`/gists/${gist.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: { content: JSON.stringify(snapshot, null, 2) },
      },
    }),
  });
  writeSyncMeta({ lastPushAt: new Date().toISOString(), remoteTimestamp: snapshot.timestamp, lastError: null });
  return { snapshot, gistUrl: updated.html_url };
}

/**
 * Decide whether to apply the remote snapshot.
 * Strategy: if remote.timestamp is newer than our last known local snapshot,
 * AND it's from a different device, restore it.
 */
export async function syncOnOpen() {
  if (!isSyncEnabled()) return { applied: false, reason: 'disabled' };
  if (!getToken())       return { applied: false, reason: 'no-token' };

  try {
    const pulled = await pullSnapshot();
    if (!pulled) return { applied: false, reason: 'no-remote' };

    const meta = readSyncMeta();
    const localTs = meta.remoteTimestamp;
    const remoteTs = pulled.remoteTimestamp;

    // Only apply if remote is strictly newer than what we last pushed/pulled
    if (localTs && remoteTs && new Date(remoteTs) <= new Date(localTs)) {
      return { applied: false, reason: 'local-current', remoteTimestamp: remoteTs };
    }

    // Don't auto-overwrite if the remote is from THIS device (no-op)
    const myDevice = getDeviceId();
    if (pulled.snapshot.deviceId === myDevice) {
      return { applied: false, reason: 'same-device', remoteTimestamp: remoteTs };
    }

    restoreLocalStorage(pulled.snapshot, { mergeStrategy: 'replace' });
    writeSyncMeta({ lastPullAt: new Date().toISOString(), remoteTimestamp: remoteTs, lastError: null });
    return { applied: true, remoteTimestamp: remoteTs, gistUrl: pulled.gistUrl };
  } catch (err) {
    writeSyncMeta({ lastError: String(err.message || err) });
    return { applied: false, reason: 'error', error: String(err.message || err) };
  }
}

/**
 * Delete the sync gist + reset local sync state. Use this on
 * "Stop syncing + delete cloud data".
 */
export async function deleteSyncGist() {
  const id = getStoredGistId();
  if (!id) {
    setSyncEnabled(false);
    return { ok: true, deleted: false };
  }
  try {
    await ghFetch(`/gists/${id}`, { method: 'DELETE' });
  } catch (err) {
    // Treat 404 as "already gone"
    if (!String(err.message || '').includes('404')) throw err;
  }
  setStoredGistId(null);
  setSyncEnabled(false);
  localStorage.removeItem(SYNC_META_KEY);
  return { ok: true, deleted: true };
}
