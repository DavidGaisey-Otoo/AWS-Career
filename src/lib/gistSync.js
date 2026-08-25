/**
 * gistSync.js — cross-device sync via an access-controlled private repository.
 *
 * Why this exists:
 *   The app stores everything in localStorage (per-device, no backend).
 *   The user wants to start on laptop and continue on phone. Spinning up
 *   a real backend is a week of work; using the GitHub PAT they already
 *   the user's existing GitHub connection provides a small private store.
 *
 * How it works:
 *   - A snapshot = JSON of every localStorage key under `awscl-pro::v1::*`
 *     (excluding sensitive blobs and ephemeral state).
 *   - On every change (debounced 4s), we update one file with the latest
 *     snapshot.
 *   - On app open (or manual pull), we read that file and restore the
 *     snapshot if it's newer than what's in this browser.
 *   - The private repository name is stored locally and is deterministic.
 *
 * Privacy + safety:
 *   - GitHub enforces repository access; this is not an unlisted Gist.
 *   - We DELIBERATELY skip the encrypted vault blob (cryptoVault) and
 *     raw AWS access keys. Those should never leave the source device
 *     unencrypted.
 *   - Sync can be disabled or the private repository deleted at any time.
 */

import { STORAGE_KEY } from './constants.js';
import {
  clearGithubAppSession, getGithubAccessToken, readGithubAppSession,
} from './githubAppAuth.js';

const SYNC_REPO_NAME   = 'aws-career-launchpad-sync';
const SYNC_REPO_DESC   = 'Private cross-device state for AWS Career Launchpad Pro';
const SYNC_FILE_PATH   = 'awscl-pro-state.json';
const SYNC_REPO_KEY    = `${STORAGE_KEY}::sync::repo`;
// Legacy identifiers are retained only for a one-time safe migration.
const GIST_FILENAME    = 'awscl-pro-state.json';
const GIST_ID_KEY      = `${STORAGE_KEY}::sync::gistId`;
const SYNC_META_KEY    = `${STORAGE_KEY}::sync::meta`;
const SYNC_ENABLED_KEY = `${STORAGE_KEY}::sync::enabled`;
const DEVICE_ID_KEY    = `${STORAGE_KEY}::sync::deviceId`;
const SYNC_BASELINE_KEY = `${STORAGE_KEY}::sync::baseline`;

// Keys we deliberately exclude from sync (sensitive + ephemeral)
const SYNC_BLOCKLIST = [
  `${STORAGE_KEY}::vault`,                    // encrypted AWS cred vault (per-device)
  `${STORAGE_KEY}::deploy::vault`,            //
  `${STORAGE_KEY}::aws::credentials`,         // raw AWS keys (never sync)
  `${STORAGE_KEY}::github`,                   // GitHub PAT (plaintext — must never reach the gist)
  `${STORAGE_KEY}::github-app`,               // GitHub App access + refresh session (per-device)
  `${STORAGE_KEY}::google`,                   // Google OAuth tokens + clientSecret + PKCE state
  `${STORAGE_KEY}::sync::gistId`,             // sync infrastructure itself
  `${STORAGE_KEY}::sync::repo`,
  `${STORAGE_KEY}::sync::meta`,
  `${STORAGE_KEY}::sync::enabled`,
  `${STORAGE_KEY}::sync::deviceId`,
  `${STORAGE_KEY}::sync::baseline`,
];

// Field names that must never appear inside a synced JSON blob, wherever
// they're nested. Legacy AppContext state kept the GitHub token at
// integrations.githubToken inside `::app` / `::profile` — those keys ARE
// synced, so we deep-scrub the parsed JSON before upload AND after pull.
const SECRET_FIELD_NAMES = /^(githubToken|clientSecret|client_secret|accessToken|access_token|refreshToken|refresh_token|secretAccessKey|sessionToken|apiKey|api_key|password|pat|token)$/i;

// Raw secret patterns — if a value string contains one of these after
// scrubbing, we drop the whole key rather than risk uploading it.
const SECRET_VALUE_PATTERNS = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,   // GitHub classic + fine-grained prefixes
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,             // AWS access key id
  /\bGOCSPX-[A-Za-z0-9_-]{10,}\b/,    // Google OAuth client secret
];

function deepScrub(value) {
  if (Array.isArray(value)) return value.map(deepScrub);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_FIELD_NAMES.test(k)) continue;
      out[k] = deepScrub(v);
    }
    return out;
  }
  return value;
}

/**
 * Sanitize a single localStorage value before it may travel.
 * Returns the safe string, or null if the value must be dropped entirely.
 */
function sanitizeValue(raw) {
  if (typeof raw !== 'string') return null;
  let out = raw;
  // JSON blobs get a structural scrub of secret-named fields
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      out = JSON.stringify(deepScrub(parsed));
    }
  } catch { /* not JSON — fall through to pattern check */ }
  // Belt-and-braces: any surviving raw secret pattern → drop the key
  if (SECRET_VALUE_PATTERNS.some((p) => p.test(out))) return null;
  return out;
}

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
    const safe = sanitizeValue(localStorage.getItem(key));
    if (safe === null) continue;
    data[key] = safe;
    count++;
  }
  return {
    version: 2,
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
    // Old snapshots (version 1) may contain secrets captured before the
    // sanitizer existed — scrub on the way back in too, never reinstate.
    const safe = sanitizeValue(value);
    if (safe === null) continue;
    // 'fill-missing' only writes keys this device doesn't have yet
    // (there are no per-key timestamps, so "newer" can't be determined).
    if (mergeStrategy === 'replace' || !localStorage.getItem(key)) {
      localStorage.setItem(key, safe);
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
// GitHub repository API — bare-fetch, no octokit
// ════════════════════════════════════════════════════════════════════

const GITHUB_API = 'https://api.github.com';

async function getToken() {
  // Never silently fall back to an old PAT when a GitHub App session exists.
  // A failed refresh must be surfaced as a reconnect state; otherwise an
  // expired legacy PAT can leave every device stuck on a permanent red badge.
  const hadAppSession = Boolean(readGithubAppSession()?.accessToken);
  if (hadAppSession) {
    const appToken = await getGithubAccessToken().catch(() => null);
    return appToken || null;
  }
  // Sync now uses only the renewable GitHub App connection. Legacy PATs are
  // deliberately ignored: they expire independently and were the source of
  // contradictory green/yellow/red states across browsers.
  return null;
}

async function ghFetch(path, options = {}) {
  const token = await getToken();
  if (!token) throw new Error('No GitHub connection configured');
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
    if (res.status === 403 && /Resource not accessible|permission|repository/i.test(text)) {
      const err = new Error('GITHUB_APP_MISSING_REPOSITORY_PERMISSION');
      err.code = 'GITHUB_APP_MISSING_REPOSITORY_PERMISSION';
      err.status = 403;
      throw err;
    }
    if (res.status === 401) {
      // Tokens may be revoked before their advertised expiry. Clear the bad
      // app session immediately so the UI offers one clean reconnection
      // instead of retrying an invalid credential forever.
      if (readGithubAppSession()?.accessToken) clearGithubAppSession();
      const err = new Error('GITHUB_AUTH_INVALID');
      err.code = 'GITHUB_AUTH_INVALID';
      err.status = 401;
      throw err;
    }
    throw new Error(`GitHub ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export function getStoredSyncRepo() {
  return localStorage.getItem(SYNC_REPO_KEY) || null;
}

function setStoredSyncRepo(fullName) {
  if (fullName) localStorage.setItem(SYNC_REPO_KEY, fullName);
  else localStorage.removeItem(SYNC_REPO_KEY);
}

function readSyncBaseline() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYNC_BASELINE_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

function writeSyncBaseline(data) {
  try { localStorage.setItem(SYNC_BASELINE_KEY, JSON.stringify(data || {})); } catch { /* quota */ }
}

/**
 * Preserve remote values for keys that this device has not changed since its
 * last successful pull/push. Only genuine local edits override the remote.
 * Missing locally-changed keys are tombstones, so deliberate deletions sync.
 */
export function mergeSnapshotData(localData = {}, baselineData = {}, remoteData = {}) {
  const merged = { ...remoteData };
  const keys = new Set([...Object.keys(localData), ...Object.keys(baselineData)]);
  for (const key of keys) {
    const localHas = Object.prototype.hasOwnProperty.call(localData, key);
    const baselineHas = Object.prototype.hasOwnProperty.call(baselineData, key);
    const changed = localHas !== baselineHas || (localHas && localData[key] !== baselineData[key]);
    if (!changed) continue;
    if (localHas) {
      const nested = mergeJsonStorageValue(localData[key], baselineData[key], remoteData[key]);
      merged[key] = nested ?? localData[key];
    }
    else delete merged[key];
  }
  return merged;
}

function parseObjectJson(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

/**
 * Merge independently edited fields inside JSON-backed localStorage records.
 * This prevents a LinkedIn edit on one device from erasing a Hashnode or
 * Upwork edit made on another device. For a true same-field conflict, the
 * current device wins, matching the existing top-level sync policy.
 */
function mergeJsonStorageValue(localRaw, baselineRaw, remoteRaw) {
  const local = parseObjectJson(localRaw);
  const baseline = parseObjectJson(baselineRaw);
  const remote = parseObjectJson(remoteRaw);
  if (!local || !baseline || !remote) return null;
  return JSON.stringify(mergeObjectFields(local, baseline, remote));
}

function mergeObjectFields(local, baseline, remote) {
  const result = { ...remote };
  const keys = new Set([...Object.keys(local), ...Object.keys(baseline)]);
  for (const key of keys) {
    const localHas = Object.prototype.hasOwnProperty.call(local, key);
    const baseHas = Object.prototype.hasOwnProperty.call(baseline, key);
    const localValue = local[key];
    const baseValue = baseline[key];
    const changed = localHas !== baseHas || (localHas && JSON.stringify(localValue) !== JSON.stringify(baseValue));
    if (!changed) continue;
    if (!localHas) { delete result[key]; continue; }
    const remoteValue = remote[key];
    if (isPlainObject(localValue) && isPlainObject(baseValue) && isPlainObject(remoteValue)) {
      result[key] = mergeObjectFields(localValue, baseValue, remoteValue);
    } else {
      result[key] = localValue;
    }
  }
  return result;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

async function getOrCreateSyncRepo() {
  let fullName = getStoredSyncRepo();
  if (!fullName) {
    const me = await ghFetch('/user');
    fullName = `${me.login}/${SYNC_REPO_NAME}`;
  }
  try {
    const repo = await ghFetch(`/repos/${fullName}`);
    if (!repo.private) throw new Error('SYNC_REPOSITORY_NOT_PRIVATE');
    setStoredSyncRepo(repo.full_name);
    return repo;
  } catch (error) {
    if (!/GitHub 404/.test(String(error.message || ''))) throw error;
  }
  const created = await ghFetch('/user/repos', {
    method: 'POST',
    body: JSON.stringify({ name: SYNC_REPO_NAME, description: SYNC_REPO_DESC, private: true, auto_init: true }),
  });
  if (!created.private) throw new Error('SYNC_REPOSITORY_NOT_PRIVATE');
  setStoredSyncRepo(created.full_name);
  return created;
}

async function readRepoSnapshot(repo) {
  try {
    const file = await ghFetch(`/repos/${repo.full_name}/contents/${SYNC_FILE_PATH}`);
    const binary = atob(String(file.content || '').replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const content = new TextDecoder().decode(bytes);
    return { snapshot: JSON.parse(content), sha: file.sha, repoUrl: repo.html_url };
  } catch (error) {
    if (/GitHub 404/.test(String(error.message || ''))) return null;
    throw error;
  }
}

async function readLegacyGist() {
  const id = getStoredGistId();
  if (!id) return null;
  try {
    const gist = await ghFetch(`/gists/${id}`);
    const file = gist?.files?.[GIST_FILENAME];
    if (!file) return null;
    const content = file.truncated ? await fetch(file.raw_url).then((response) => response.text()) : file.content;
    return { id, snapshot: JSON.parse(content) };
  } catch { return null; }
}

async function writeRepoSnapshot(repo, snapshot, sha = null) {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot, null, 2));
  let binary = '';
  // Incremental conversion avoids overflowing the argument stack for larger
  // study histories while preserving every UTF-8 character.
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  const content = btoa(binary);
  const result = await ghFetch(`/repos/${repo.full_name}/contents/${SYNC_FILE_PATH}`, {
    method: 'PUT',
    body: JSON.stringify({ message: 'Update sanitized app state', content, ...(sha ? { sha } : {}) }),
  });
  return { snapshot, repoUrl: repo.html_url, sha: result.content?.sha };
}

async function migrateLegacyGist(repo) {
  const legacy = await readLegacyGist();
  if (!legacy) return null;
  const safeSnapshot = { ...legacy.snapshot, version: 2, data: {} };
  for (const [key, value] of Object.entries(legacy.snapshot?.data || {})) {
    if (SYNC_BLOCKLIST.some((blocked) => key === blocked || key.startsWith(`${blocked}::`))) continue;
    const safe = sanitizeValue(value);
    if (safe !== null) safeSnapshot.data[key] = safe;
  }
  safeSnapshot.keyCount = Object.keys(safeSnapshot.data).length;
  const written = await writeRepoSnapshot(repo, safeSnapshot);
  // Verify the private copy before deleting the unlisted legacy copy.
  const verified = await readRepoSnapshot(repo);
  if (verified?.snapshot?.timestamp === safeSnapshot.timestamp) {
    await ghFetch(`/gists/${legacy.id}`, { method: 'DELETE' }).catch(() => null);
    setStoredGistId(null);
  }
  return written;
}

export async function pullSnapshot() {
  const repo = await getOrCreateSyncRepo();
  let remote = await readRepoSnapshot(repo);
  if (!remote) remote = await migrateLegacyGist(repo);
  if (!remote) return null;
  return { snapshot: remote.snapshot, remoteTimestamp: remote.snapshot.timestamp, repoUrl: remote.repoUrl };
}

// ════════════════════════════════════════════════════════════════════
// Security advisory — set when we detect the gist may hold pre-sanitizer
// secrets. The SyncModal shows a banner + one-click remediation.
// ════════════════════════════════════════════════════════════════════
const ADVISORY_KEY = `${STORAGE_KEY}::sync::advisory`;

function raiseSecurityAdvisory(reason) {
  try {
    if (!localStorage.getItem(ADVISORY_KEY)) {
      localStorage.setItem(ADVISORY_KEY, JSON.stringify({ reason, at: new Date().toISOString() }));
    }
  } catch { /* quota */ }
}

export function readSecurityAdvisory() {
  try {
    const raw = localStorage.getItem(ADVISORY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function dismissSecurityAdvisory() {
  try { localStorage.removeItem(ADVISORY_KEY); } catch { /* */ }
}

/**
 * Nuke-and-repave the sync gist: deleting the gist destroys ALL its
 * revisions (where pre-sanitizer secrets may live), then a fresh gist is
 * created from a sanitized snapshot. Sync stays enabled throughout.
 * The user should still rotate their PAT + Google client secret — code
 * can't un-leak what may have been read already.
 */
export async function recreateSyncGist() {
  const oldId = getStoredGistId();
  // Establish the sanitized private copy first. Never delete the only remote
  // copy before GitHub confirms the replacement was written.
  const res = await pushSnapshot();
  if (oldId) {
    try {
      await ghFetch(`/gists/${oldId}`, { method: 'DELETE' });
    } catch (err) {
      if (!String(err.message || '').includes('404')) throw err;
    }
    setStoredGistId(null);
  }
  dismissSecurityAdvisory();
  return { ok: true, repoUrl: res.repoUrl };
}

/**
 * Push a fresh sanitized snapshot to the private repository.
 */
export async function pushSnapshot() {
  const repo = await getOrCreateSyncRepo();
  const local = snapshotLocalStorage();
  let baseline = readSyncBaseline();

  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await readRepoSnapshot(repo);
    // First run on an upgraded device: treat the last remote copy as the
    // comparison baseline. Differences in this browser are then genuine local
    // edits, while identical/absent data cannot erase newer remote fields.
    if (!baseline) baseline = existing?.snapshot?.data || {};
    const data = mergeSnapshotData(local.data, baseline, existing?.snapshot?.data || {});
    const snapshot = {
      ...local,
      timestamp: new Date().toISOString(),
      keyCount: Object.keys(data).length,
      data,
    };
    try {
      const updated = await writeRepoSnapshot(repo, snapshot, existing?.sha);
      writeSyncBaseline(snapshot.data);
      writeSyncMeta({ lastPushAt: new Date().toISOString(), remoteTimestamp: snapshot.timestamp, lastError: null });
      return { snapshot, repoUrl: updated.repoUrl };
    } catch (error) {
      // Another device updated the file after our read. Re-read, re-merge only
      // our actual local changes, and retry instead of showing a transient red
      // sync error or overwriting the other device.
      if (!/GitHub (409|422)|sha|conflict|does not match/i.test(String(error.message || error)) || attempt === 3) throw error;
    }
  }
  throw new Error('Sync conflict could not be resolved.');
}

/**
 * Decide whether to apply the remote snapshot.
 * Strategy: if remote.timestamp is newer than our last known local snapshot,
 * AND it's from a different device, restore it.
 */
export async function syncOnOpen() {
  if (!isSyncEnabled()) return { applied: false, reason: 'disabled' };
  if (!await getToken()) return { applied: false, reason: 'no-token' };

  try {
    const pulled = await pullSnapshot();
    if (!pulled) return { applied: false, reason: 'no-remote' };

    const meta = readSyncMeta();
    const localTs = meta.remoteTimestamp;
    const remoteTs = pulled.remoteTimestamp;

    // Only apply if remote is strictly newer than what we last pushed/pulled
    if (localTs && remoteTs && new Date(remoteTs) <= new Date(localTs)) {
      if (!readSyncBaseline()) writeSyncBaseline(pulled.snapshot.data);
      return { applied: false, reason: 'local-current', remoteTimestamp: remoteTs };
    }

    // Don't auto-overwrite if the remote is from THIS device (no-op)
    const myDevice = getDeviceId();
    if (pulled.snapshot.deviceId === myDevice) {
      writeSyncBaseline(pulled.snapshot.data);
      return { applied: false, reason: 'same-device', remoteTimestamp: remoteTs };
    }

    restoreLocalStorage(pulled.snapshot, { mergeStrategy: 'replace' });
    writeSyncBaseline(pulled.snapshot.data);
    writeSyncMeta({ lastPullAt: new Date().toISOString(), remoteTimestamp: remoteTs, lastError: null });
    return { applied: true, remoteTimestamp: remoteTs, repoUrl: pulled.repoUrl };
  } catch (err) {
    writeSyncMeta({ lastError: String(err.message || err) });
    return { applied: false, reason: 'error', error: String(err.message || err) };
  }
}

/**
 * Delete the private sync repository and any legacy Gist, then reset state.
 * "Stop syncing + delete cloud data".
 */
export async function deleteSyncGist() {
  const repoName = getStoredSyncRepo();
  const legacyId = getStoredGistId();
  if (!repoName && !legacyId) {
    setSyncEnabled(false);
    return { ok: true, deleted: false };
  }
  try {
    if (repoName) await ghFetch(`/repos/${repoName}`, { method: 'DELETE' });
    if (legacyId) await ghFetch(`/gists/${legacyId}`, { method: 'DELETE' });
  } catch (err) {
    // Treat 404 as "already gone"
    if (!String(err.message || '').includes('404')) throw err;
  }
  setStoredGistId(null);
  setStoredSyncRepo(null);
  setSyncEnabled(false);
  localStorage.removeItem(SYNC_META_KEY);
  localStorage.removeItem(SYNC_BASELINE_KEY);
  return { ok: true, deleted: true };
}
