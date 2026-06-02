/**
 * deepMode.js — PJ-01 Deep Walkthrough Mode.
 *
 * Single global toggle (per browser): Standard ↔ Deep.
 * Per-step completion checkboxes scoped per walkthrough.
 *
 * Storage keys:
 *   awscl-pro::v1::deep-mode           = boolean toggle
 *   awscl-pro::v1::deep-completion     = { [walkthroughId]: { [stepNumber]: true } }
 */

import { useEffect, useState } from 'react';

const TOGGLE_KEY = 'awscl-pro::v1::deep-mode';
const COMPLETION_KEY = 'awscl-pro::v1::deep-completion';

// ════════════════════════════════════════════════════════════════════
// Toggle hook
// ════════════════════════════════════════════════════════════════════

function readToggle() {
  try {
    const v = localStorage.getItem(TOGGLE_KEY);
    return v === 'true';
  } catch { return false; }
}

function writeToggle(v) {
  try { localStorage.setItem(TOGGLE_KEY, v ? 'true' : 'false'); } catch { /* */ }
}

export function useDeepMode() {
  const [enabled, setEnabledState] = useState(readToggle);

  // Sync with other tabs
  useEffect(() => {
    function onStorage(e) {
      if (e.key === TOGGLE_KEY) setEnabledState(readToggle());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setEnabled = (v) => {
    writeToggle(v);
    setEnabledState(v);
    // Notify any same-tab listeners
    window.dispatchEvent(new StorageEvent('storage', { key: TOGGLE_KEY }));
  };

  return [enabled, setEnabled];
}

// ════════════════════════════════════════════════════════════════════
// Completion tracking
// ════════════════════════════════════════════════════════════════════

function readCompletion() {
  try {
    const raw = localStorage.getItem(COMPLETION_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : {};
  } catch { return {}; }
}

function writeCompletion(state) {
  try { localStorage.setItem(COMPLETION_KEY, JSON.stringify(state)); } catch { /* */ }
}

export function useStepCompletion(walkthroughId) {
  const [completed, setCompleted] = useState(() => readCompletion()[walkthroughId] || {});

  const toggleStep = (stepNumber) => {
    const all = readCompletion();
    const my = all[walkthroughId] || {};
    if (my[stepNumber]) delete my[stepNumber];
    else my[stepNumber] = true;
    all[walkthroughId] = my;
    writeCompletion(all);
    setCompleted({ ...my });
  };

  const resetAll = () => {
    const all = readCompletion();
    delete all[walkthroughId];
    writeCompletion(all);
    setCompleted({});
  };

  return { completed, toggleStep, resetAll };
}

export function getWalkthroughProgress(walkthroughId, totalSteps) {
  const my = readCompletion()[walkthroughId] || {};
  const done = Object.keys(my).length;
  return { done, total: totalSteps, pct: totalSteps ? Math.round((done / totalSteps) * 100) : 0 };
}
