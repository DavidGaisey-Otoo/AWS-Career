/**
 * SyncContext.jsx — provides cross-device sync state to the whole app.
 *
 * Behaviour:
 *   - On mount: run syncOnOpen() once. If it applies a snapshot, force
 *     a full window reload so React state resets to the restored values.
 *   - After mount: debounced auto-push every 4s on any localStorage
 *     change (we listen to the 'storage' event + a synthetic 'syncpush'
 *     event so same-tab changes also trigger).
 *   - Exposes pushNow(), pullNow(), enable(), disable() for manual UI.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteSyncGist, isSyncEnabled, pullSnapshot, pushSnapshot, readSyncMeta,
  restoreLocalStorage, setSyncEnabled as setEnabledRaw, snapshotLocalStorage, syncOnOpen, writeSyncMeta,
} from '../lib/gistSync.js';
import { hasGithubAppSession } from '../lib/githubAppAuth.js';

const SyncContext = createContext(null);

const PUSH_DEBOUNCE_MS = 4000;
const LOCAL_CHANGE_SCAN_MS = 2000;
const PULL_INTERVAL_MS = 30_000;
const hasGithubAuth = () => hasGithubAppSession();
const isAuthError = (value) => /GITHUB_AUTH_INVALID|No GitHub connection configured|no-token/i.test(String(value || ''));

export function SyncProvider({ children }) {
  const [status, setStatus] = useState('idle');      // idle | syncing | synced | error | disabled | no-token
  const [meta, setMeta] = useState(() => readSyncMeta());
  const [enabled, setEnabled] = useState(() => isSyncEnabled());
  const [openModal, setOpenModal] = useState(false);
  const [appliedOnOpen, setAppliedOnOpen] = useState(null);
  const [authRevision, setAuthRevision] = useState(0);
  const pushTimer = useRef(null);
  const localDirty = useRef(false);
  const remoteCheckBusy = useRef(false);
  const localFingerprint = useRef(null);
  const pushRetryCount = useRef(0);

  // GitHubAppConnectCard saves the session independently. Re-evaluate sync
  // immediately when that session is created, refreshed, or cleared so the
  // header chip cannot remain yellow while the settings card is green.
  useEffect(() => {
    const onAuthChange = () => setAuthRevision((value) => value + 1);
    window.addEventListener('github-auth-change', onAuthChange);
    return () => window.removeEventListener('github-auth-change', onAuthChange);
  }, []);

  // ──────────────────────────────────────────────────────────────────
  // Initial sync: pull on mount if enabled
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (!hasGithubAuth()) {
      setStatus('no-token');
      return;
    }
    setStatus('syncing');
    syncOnOpen()
      .then(async (result) => {
        setMeta(readSyncMeta());
        if (result.applied) {
          setAppliedOnOpen(result);
          // Force reload so context providers re-read the restored state
          setTimeout(() => window.location.reload(), 400);
        } else if (result.reason === 'no-token' || isAuthError(result.error)) {
          setStatus('no-token');
        } else if (result.reason === 'error') {
          setStatus('error');
        } else {
          // Publish safe local changes that may have been written before this
          // version loaded (older builds did not notify sync on every write).
          await pushSnapshot();
          localFingerprint.current = JSON.stringify(snapshotLocalStorage().data);
          setMeta(readSyncMeta());
          setStatus('synced');
        }
      })
      .catch(() => setStatus('error'));
  }, [enabled, authRevision]);

  // ──────────────────────────────────────────────────────────────────
  // Auto-push debouncer
  // ──────────────────────────────────────────────────────────────────
  const schedulePush = useCallback(() => {
    if (!enabled) return;
    if (!hasGithubAuth()) return;
    localDirty.current = true;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      setStatus('syncing');
      try {
        await pushSnapshot();
        localDirty.current = false;
        pushRetryCount.current = 0;
        setMeta(readSyncMeta());
        setStatus('synced');
      } catch (err) {
        const message = String(err.message || err);
        writeSyncMeta({ lastError: message });
        setMeta(readSyncMeta());
        if (isAuthError(message) || !hasGithubAuth()) {
          setStatus('no-token');
          localDirty.current = false;
          return;
        }
        setStatus('error');
        // Transient GitHub conflicts/network interruptions must heal without
        // making the user reconnect or press buttons. Keep the edit dirty and
        // retry with a bounded backoff until GitHub accepts it.
        const delay = Math.min(60_000, 5_000 * (2 ** Math.min(pushRetryCount.current, 4)));
        pushRetryCount.current += 1;
        pushTimer.current = setTimeout(() => {
          pushTimer.current = null;
          schedulePush();
        }, delay);
      }
    }, PUSH_DEBOUNCE_MS);
  }, [enabled]);

  useEffect(() => {
    function onStorage(e) {
      if (!e?.key || !e.key.startsWith('awscl-pro::v1::')) return;
      // Ignore sync infrastructure keys to avoid feedback loops
      if (e.key.includes('::sync::')) return;
      // A same-origin window already sees the new localStorage value. Never
      // reload here: two open copies can otherwise trigger each other forever.
      schedulePush();
    }
    function onSyncPush() { schedulePush(); }
    window.addEventListener('storage', onStorage);
    window.addEventListener('syncpush', onSyncPush);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('syncpush', onSyncPush);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [schedulePush]);

  // Some legacy contexts write localStorage directly and cannot emit the
  // synthetic syncpush event. Detect changes to the sanitized, syncable data
  // so the green badge always represents an actually uploaded snapshot.
  useEffect(() => {
    if (!enabled || !hasGithubAuth()) return undefined;
    localFingerprint.current = JSON.stringify(snapshotLocalStorage().data);
    const interval = setInterval(() => {
      const next = JSON.stringify(snapshotLocalStorage().data);
      if (next === localFingerprint.current) return;
      localFingerprint.current = next;
      schedulePush();
    }, LOCAL_CHANGE_SCAN_MS);
    return () => clearInterval(interval);
  }, [enabled, schedulePush]);

  // Pull changes made on another browser/device while this copy remains open.
  // A pending local write always wins the race by being pushed first; remote
  // polling resumes after that push completes instead of overwriting it.
  useEffect(() => {
    if (!enabled || !hasGithubAuth()) return undefined;

    let cancelled = false;
    async function checkRemote() {
      if (cancelled || remoteCheckBusy.current || localDirty.current) return;
      remoteCheckBusy.current = true;
      try {
        const result = await syncOnOpen();
        if (cancelled) return;
        setMeta(readSyncMeta());
        if (result.applied) {
          setStatus('synced');
          window.location.reload();
        } else if (result.reason === 'no-token' || isAuthError(result.error)) {
          setStatus('no-token');
        } else if (result.reason === 'error') {
          setStatus('error');
        } else {
          // A previous transient failure must not leave a permanently red
          // badge after a later read succeeds.
          setStatus('synced');
        }
      } catch {
        if (!cancelled) setStatus('error');
      } finally {
        remoteCheckBusy.current = false;
      }
    }

    function onFocus() { checkRemote(); }
    function onOnline() { checkRemote(); }
    function onVisibility() {
      if (document.visibilityState === 'visible') checkRemote();
    }

    const interval = setInterval(checkRemote, PULL_INTERVAL_MS);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);

  // ──────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────
  const pushNow = useCallback(async () => {
    if (!hasGithubAuth()) { setStatus('no-token'); return { ok: false, reason: 'no-token' }; }
    setStatus('syncing');
    try {
      const result = await pushSnapshot();
      localDirty.current = false;
      setMeta(readSyncMeta());
      setStatus('synced');
      return { ok: true, ...result };
    } catch (err) {
      const message = String(err.message || err);
      writeSyncMeta({ lastError: message });
      setMeta(readSyncMeta());
      setStatus(isAuthError(message) || !hasGithubAuth() ? 'no-token' : 'error');
      return { ok: false, error: message };
    }
  }, []);

  const pullNow = useCallback(async () => {
    if (!hasGithubAuth()) { setStatus('no-token'); return { ok: false, reason: 'no-token' }; }
    setStatus('syncing');
    try {
      const result = await pullSnapshot();
      if (!result) { setStatus('synced'); return { ok: true, applied: false, reason: 'no-remote' }; }
      restoreLocalStorage(result.snapshot, { mergeStrategy: 'replace' });
      setMeta(readSyncMeta());
      setStatus('synced');
      // Reload to flush React state
      setTimeout(() => window.location.reload(), 400);
      return { ok: true, applied: true, ...result };
    } catch (err) {
      const message = String(err.message || err);
      writeSyncMeta({ lastError: message });
      setMeta(readSyncMeta());
      setStatus(isAuthError(message) || !hasGithubAuth() ? 'no-token' : 'error');
      return { ok: false, error: message };
    }
  }, []);

  const enable = useCallback(async () => {
    setEnabledRaw(true);
    setEnabled(true);
    return pushNow();
  }, [pushNow]);

  const disable = useCallback(() => {
    setEnabledRaw(false);
    setEnabled(false);
    setStatus('disabled');
  }, []);

  const stopAndDelete = useCallback(async () => {
    setStatus('syncing');
    try {
      await deleteSyncGist();
      setEnabled(false);
      setMeta(readSyncMeta());
      setStatus('disabled');
      return { ok: true };
    } catch (err) {
      setStatus('error');
      return { ok: false, error: String(err.message || err) };
    }
  }, []);

  const value = useMemo(() => ({
    status, meta, enabled, appliedOnOpen,
    openModal, setOpenModal,
    pushNow, pullNow, enable, disable, stopAndDelete,
  }), [status, meta, enabled, appliedOnOpen, openModal, pushNow, pullNow, enable, disable, stopAndDelete]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}

/**
 * Other contexts can fire this after writing to localStorage so the sync
 * push debouncer picks it up even within the same tab (the native 'storage'
 * event only fires across tabs).
 */
export function notifySyncWrite() {
  try { window.dispatchEvent(new Event('syncpush')); } catch { /* SSR */ }
}
