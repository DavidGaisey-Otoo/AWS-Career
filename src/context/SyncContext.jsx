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
  restoreLocalStorage, setSyncEnabled as setEnabledRaw, syncOnOpen,
} from '../lib/gistSync.js';
import { readToken } from '../lib/githubToken.js';
import { hasGithubAppSession } from '../lib/githubAppAuth.js';

const SyncContext = createContext(null);

const PUSH_DEBOUNCE_MS = 4000;
const PULL_INTERVAL_MS = 30_000;
// Leave enough time for the existing 4-second outbound debounce to finish
// before reloading the receiving window.
const CROSS_WINDOW_RELOAD_MS = PUSH_DEBOUNCE_MS + 750;
const hasGithubAuth = () => hasGithubAppSession() || Boolean(readToken()?.token);

export function SyncProvider({ children }) {
  const [status, setStatus] = useState('idle');      // idle | syncing | synced | error | disabled | no-token
  const [meta, setMeta] = useState(() => readSyncMeta());
  const [enabled, setEnabled] = useState(() => isSyncEnabled());
  const [openModal, setOpenModal] = useState(false);
  const [appliedOnOpen, setAppliedOnOpen] = useState(null);
  const pushTimer = useRef(null);
  const reloadTimer = useRef(null);
  const localDirty = useRef(false);
  const remoteCheckBusy = useRef(false);
  const hasRunInitial = useRef(false);

  // ──────────────────────────────────────────────────────────────────
  // Initial sync: pull on mount if enabled
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (hasRunInitial.current) return;
    hasRunInitial.current = true;
    if (!enabled) return;
    if (!hasGithubAuth()) {
      setStatus('no-token');
      return;
    }
    setStatus('syncing');
    syncOnOpen()
      .then((result) => {
        setMeta(readSyncMeta());
        if (result.applied) {
          setAppliedOnOpen(result);
          // Force reload so context providers re-read the restored state
          setTimeout(() => window.location.reload(), 400);
        } else if (result.reason === 'error') {
          setStatus('error');
        } else {
          setStatus('synced');
        }
      })
      .catch(() => setStatus('error'));
  }, [enabled]);

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
        setMeta(readSyncMeta());
        setStatus('synced');
      } catch (err) {
        setStatus('error');
      }
    }, PUSH_DEBOUNCE_MS);
  }, [enabled]);

  useEffect(() => {
    function onStorage(e) {
      if (!e?.key || !e.key.startsWith('awscl-pro::v1::')) return;
      // Ignore sync infrastructure keys to avoid feedback loops
      if (e.key.includes('::sync::')) return;
      // Installed PWA + normal browser windows in the same profile already
      // share localStorage. Reload once (debounced) so every React context
      // rehydrates the value written by the other window immediately.
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => window.location.reload(), CROSS_WINDOW_RELOAD_MS);
      schedulePush();
    }
    function onSyncPush() { schedulePush(); }
    window.addEventListener('storage', onStorage);
    window.addEventListener('syncpush', onSyncPush);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('syncpush', onSyncPush);
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [schedulePush]);

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
        } else if (result.reason === 'error') {
          setStatus('error');
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
      setStatus('error');
      return { ok: false, error: String(err.message || err) };
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
      setStatus('error');
      return { ok: false, error: String(err.message || err) };
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
