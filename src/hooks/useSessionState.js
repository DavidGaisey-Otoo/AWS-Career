/**
 * useSessionState.js — drop-in replacement for `useState` that auto-
 * persists the value to localStorage. Used by exam runners, builders,
 * and any page where losing in-progress state on refresh hurts.
 *
 * Compared to `useLocalStorage`:
 *   • Identical API — same { value, setValue } tuple
 *   • Adds an optional `scope` so different exam attempts don\'t collide
 *   • Adds `clear()` as a third tuple element for explicit reset
 *   • Wraps writes in try/catch so quota-exceeded never kills the app
 *   • Synchronises across tabs via the `storage` event
 *
 * Usage:
 *   const [answers, setAnswers, clearAnswers] = useSessionState(
 *     'exam-answers',
 *     {},
 *     { scope: certId + '/' + mode }
 *   );
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEY } from '../lib/constants.js';

export function useSessionState(key, initial, { scope = '', syncTabs = true } = {}) {
  const fullKey = `${STORAGE_KEY}::session::${scope ? scope + '::' : ''}${key}`;
  const initialValueRef = useRef(initial);

  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(fullKey);
      if (raw === null) return typeof initial === 'function' ? initial() : initial;
      return JSON.parse(raw);
    } catch {
      return typeof initial === 'function' ? initial() : initial;
    }
  });

  // Persist on every change (debounced microtask)
  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(value));
    } catch (err) {
      // Quota or privacy mode — gracefully degrade
      console.warn('[useSessionState] write failed for', fullKey, err?.message);
    }
  }, [fullKey, value]);

  // Cross-tab sync (refresh, second tab, etc.)
  useEffect(() => {
    if (!syncTabs) return;
    function onStorage(e) {
      if (e.key !== fullKey) return;
      try {
        const next = e.newValue ? JSON.parse(e.newValue) : initialValueRef.current;
        setValue(next);
      } catch {}
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [fullKey, syncTabs]);

  const clear = useCallback(() => {
    try { localStorage.removeItem(fullKey); } catch {}
    setValue(typeof initial === 'function' ? initial() : initial);
  }, [fullKey, initial]);

  return [value, setValue, clear];
}
