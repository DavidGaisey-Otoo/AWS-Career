/**
 * setupChecklistStore.js — AC-01 storage for checked items.
 *
 * Storage shape: { [itemId]: { done: bool, completedAt: ISO|null } }
 * Storage key:   localStorage::awscl-pro::v1::setup-checklist
 */

import { useEffect, useState, useCallback } from 'react';
import { STORAGE_KEY } from './constants.js';
import { ACCOUNT_SETUP_CHECKLIST } from '../data/accountSetupChecklist.js';

const KEY = `${STORAGE_KEY}::setup-checklist`;
const EVT = 'setup-checklist:change';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

export function toggleItem(id) {
  const state = read();
  const current = state[id];
  if (current?.done) {
    state[id] = { done: false, completedAt: null };
  } else {
    state[id] = { done: true, completedAt: new Date().toISOString() };
  }
  write(state);
  return state[id];
}

export function markAllDone() {
  const state = {};
  const now = new Date().toISOString();
  for (const it of ACCOUNT_SETUP_CHECKLIST) {
    state[it.id] = { done: true, completedAt: now };
  }
  write(state);
}

export function clearAll() { write({}); }

export function getProgress(state) {
  state = state || read();
  const total = ACCOUNT_SETUP_CHECKLIST.length;
  const done = ACCOUNT_SETUP_CHECKLIST.filter((it) => state[it.id]?.done).length;
  const pct = Math.round((done / total) * 100);
  return { done, total, pct };
}

export function getCompletedItems(state) {
  state = state || read();
  return ACCOUNT_SETUP_CHECKLIST
    .filter((it) => state[it.id]?.done)
    .map((it) => ({ ...it, completedAt: state[it.id].completedAt }));
}

export function useSetupChecklist() {
  const [state, setState] = useState(() => read());
  const refresh = useCallback(() => setState(read()), []);
  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener('storage', onChange);
    window.addEventListener(EVT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVT, onChange);
    };
  }, [refresh]);
  return state;
}
