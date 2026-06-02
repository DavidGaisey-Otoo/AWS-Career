/**
 * githubToken.js — single source of truth for the user's GitHub PAT,
 * with expiry tracking and renewal helpers.
 *
 * Why this exists:
 *   GitHub deliberately does NOT expose PAT expiry via API for fine-grained
 *   tokens (security: an attacker who has the token shouldn't be able to
 *   query when it dies). So we ASK the user the expiry date when they paste
 *   the token, store it locally, and warn them as the date approaches.
 *
 * Storage shape (localStorage at `${STORAGE_KEY}::github`):
 *   {
 *     token:        string,         // the PAT itself
 *     expiresAt:    string | null,  // ISO date the user told us
 *     savedAt:      string,         // when WE captured it
 *     lastVerified: string | null,  // last time the token still worked
 *     userLogin:    string | null,  // GitHub username from whoami
 *   }
 */
import { STORAGE_KEY } from './constants.js';
import { whoAmI } from './githubPush.js';

const KEY = `${STORAGE_KEY}::github`;

// Legacy locations the token may have been saved in before this lib existed.
// We check them on read + migrate transparently so the user doesn't have to
// re-paste their token after upgrading.
const LEGACY_KEYS = [
  `${STORAGE_KEY}::app`,          // AppContext.integrations.githubToken lives here
  `${STORAGE_KEY}::github::token`,
];

// ---------------- storage primitives ----------------

export function readToken() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Backward-compat: old storage used a plain string
      if (typeof parsed === 'string') return { token: parsed, expiresAt: null, savedAt: null };
      if (parsed && parsed.token) return parsed;
    }
    // Nothing in the new location — check legacy locations and AUTO-MIGRATE.
    const migrated = migrateFromLegacy();
    if (migrated) return migrated;
    return null;
  } catch {
    return null;
  }
}

/**
 * Look for a token in the old storage paths and copy it forward.
 * Runs lazily on every readToken() call so any subsequent edits via Settings
 * end up in the new location automatically.
 *
 * Known legacy locations:
 *   1. AppContext profile.integrations.githubToken → `${STORAGE_KEY}::profile`
 *   2. AppContext (older) integrations.githubToken → `${STORAGE_KEY}::app`
 *   3. Standalone token storage → `${STORAGE_KEY}::github::token`
 *   4. Last-resort scan: ANY localStorage value containing 'github_pat_'
 */
function migrateFromLegacy() {
  try {
    // 1. AppContext profile object — this is where it ACTUALLY lives
    const profileRaw = localStorage.getItem(`${STORAGE_KEY}::profile`);
    if (profileRaw) {
      const profile = JSON.parse(profileRaw);
      const fromProfile = profile?.integrations?.githubToken;
      if (fromProfile && typeof fromProfile === 'string' && fromProfile.trim()) {
        return persistMigration(fromProfile.trim(), 'profile::integrations');
      }
    }

    // 2. Alternative AppContext key (just in case)
    const appRaw = localStorage.getItem(`${STORAGE_KEY}::app`);
    if (appRaw) {
      const app = JSON.parse(appRaw);
      const fromIntegrations = app?.integrations?.githubToken || app?.profile?.integrations?.githubToken;
      if (fromIntegrations && typeof fromIntegrations === 'string' && fromIntegrations.trim()) {
        return persistMigration(fromIntegrations.trim(), 'app::integrations');
      }
    }

    // 3. Older standalone token-only storage
    const oldRaw = localStorage.getItem(`${STORAGE_KEY}::github::token`);
    if (oldRaw) {
      try {
        const tok = JSON.parse(oldRaw);
        const t = typeof tok === 'string' ? tok : tok?.token;
        if (t && typeof t === 'string' && t.trim()) {
          return persistMigration(t.trim(), 'github::token');
        }
      } catch {
        // It might be a raw string (not JSON)
        if (typeof oldRaw === 'string' && oldRaw.trim().startsWith('github_pat_')) {
          return persistMigration(oldRaw.trim(), 'github::token (raw)');
        }
      }
    }

    // 4. Last-resort scan — look at every key for a github_pat_ value
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_KEY)) continue;
      const v = localStorage.getItem(k) || '';
      // Quick check: does the raw string contain a fine-grained PAT?
      const m = v.match(/"(github_pat_[A-Za-z0-9_]{20,})"/);
      if (m) {
        return persistMigration(m[1], `scan::${k}`);
      }
    }
  } catch {
    // ignore — migration is best-effort
  }
  return null;
}

function persistMigration(token, source) {
  const fresh = {
    token,
    expiresAt: null,
    savedAt: new Date().toISOString(),
    userLogin: null,
    lastVerified: null,
    migratedFrom: source,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh));
  } catch {}
  return fresh;
}

export function writeToken(patch) {
  const current = readToken() || {};
  const next = { ...current, ...patch };
  if (patch.token && !current.savedAt) next.savedAt = new Date().toISOString();
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearToken() {
  localStorage.removeItem(KEY);
}

// ---------------- public API ----------------

/**
 * Days remaining until the PAT expires.
 *  - null  → no expiry date recorded
 *  - +N    → expires in N days
 *  - 0     → expires today
 *  - -N    → expired N days ago
 */
export function daysUntilExpiry(expiresAt) {
  if (!expiresAt) return null;
  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) return null;
  const msPerDay = 86400000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / msPerDay);
}

/**
 * Severity level for the current expiry state.
 *  - 'unknown'  → no expiry recorded
 *  - 'fresh'    → > 30 days remaining
 *  - 'aging'    → 8–30 days remaining
 *  - 'urgent'   → 1–7 days remaining
 *  - 'critical' → 0 days (today)
 *  - 'expired'  → < 0 days
 */
export function expirySeverity(expiresAt) {
  const d = daysUntilExpiry(expiresAt);
  if (d === null) return 'unknown';
  if (d > 30) return 'fresh';
  if (d > 7)  return 'aging';
  if (d > 0)  return 'urgent';
  if (d === 0) return 'critical';
  return 'expired';
}

/**
 * Friendly human label for an expiry state.
 */
export function expiryLabel(expiresAt) {
  const d = daysUntilExpiry(expiresAt);
  if (d === null) return 'Expiry date not set';
  if (d > 1) return `Expires in ${d} days`;
  if (d === 1) return 'Expires tomorrow';
  if (d === 0) return 'Expires today';
  if (d === -1) return 'Expired yesterday';
  return `Expired ${Math.abs(d)} days ago`;
}

/**
 * Direct URL to GitHub's fine-grained PAT regeneration page.
 */
export const GITHUB_TOKEN_PAGE = 'https://github.com/settings/tokens?type=beta';

/**
 * Verifies the saved token still works against GitHub's API, and records
 * the result. Returns { ok, user, message }.
 */
export async function verifyToken() {
  const t = readToken();
  if (!t?.token) return { ok: false, message: 'No token saved.' };
  const result = await whoAmI(t.token);
  if (result.ok) {
    writeToken({
      lastVerified: new Date().toISOString(),
      userLogin: result.user?.login || null,
    });
  }
  return result;
}

/**
 * Convenience guesser for common expiry choices (GitHub UI offers 7/30/60/90/custom/no expiration).
 * Pass `daysFromNow` and get back an ISO date the dropdown would produce.
 */
export function expiryDateFromDays(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + Number(daysFromNow));
  return d.toISOString().slice(0, 10);
}

/**
 * Snooze the warning banner for the given number of hours.
 * Stored separately so the user can dismiss without losing the underlying date.
 */
const SNOOZE_KEY = `${KEY}::snooze-until`;

export function snoozeWarning(hours = 24) {
  const until = Date.now() + hours * 3600_000;
  localStorage.setItem(SNOOZE_KEY, String(until));
}

export function isSnoozed() {
  const v = Number(localStorage.getItem(SNOOZE_KEY)) || 0;
  return Date.now() < v;
}
