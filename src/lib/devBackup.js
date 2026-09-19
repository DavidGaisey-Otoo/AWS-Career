/**
 * devBackup.js — capture this browser's data to a file on disk.
 *
 * ════════════════════════════════════════════════════════════════════
 * DEVELOPMENT ONLY. NEVER SHIPS.
 * ════════════════════════════════════════════════════════════════════
 * Guarded twice, deliberately:
 *   1. `import.meta.env.DEV` — this module does nothing in a production
 *      build, and its caller in main.jsx is behind the same check so the
 *      code is tree-shaken out entirely.
 *   2. The receiving endpoint is a Vite plugin registered with
 *      `apply: 'serve'`, so it exists only under `npm run dev` and is
 *      absent from anything deployed.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * All of this app's data lives in localStorage, which is scoped to one
 * origin in one browser profile. That makes a dev-server origin a
 * genuinely fragile home for real work: clear the browser and it is
 * gone, with no copy anywhere.
 *
 * The app has a perfectly good Export button, but it requires finding
 * it. This takes the same snapshot automatically on page load so a
 * backup exists whether or not anyone remembers to make one.
 *
 * The file contains credentials — the same complete export the UI
 * produces — so it is written to a gitignored path and should be
 * treated accordingly.
 */

const ENDPOINT = '/__local-backup';
const ONCE_KEY = '__awscl_dev_backup_done';

/**
 * Everything this app owns in localStorage, in the UI export's shape.
 *
 * Values are kept as the raw strings localStorage actually holds
 * (schema 2). Parsing them on the way out and re-encoding on the way in
 * corrupted every value that was not JSON, so this stays verbatim and
 * the file imports through Settings → Import backup unchanged.
 */
function snapshot(storageKey) {
  const data = {};
  let keys = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(storageKey)) continue;
    data[k] = localStorage.getItem(k);
    keys++;
  }
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 2,
    origin: window.location.origin,
    keyCount: keys,
    data,
  };
}

/**
 * Post the snapshot to the dev server once per tab.
 * Failures are logged and ignored — a backup helper must never be able
 * to break the app it is backing up.
 */
export async function captureDevBackup(storageKey) {
  try {
    if (sessionStorage.getItem(ONCE_KEY)) return;
    const payload = snapshot(storageKey);
    if (payload.keyCount === 0) return;   // nothing here yet

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = await res.json().catch(() => ({}));
    sessionStorage.setItem(ONCE_KEY, '1');
    console.info(
      `[dev-backup] Saved ${payload.keyCount} keys from ${payload.origin} → ${info.file || 'backup file'}`
    );
  } catch (err) {
    console.warn('[dev-backup] skipped:', err?.message || err);
  }
}
