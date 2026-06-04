/**
 * incomeTracker.js — EA-02 monthly income goal + payment log.
 *
 * Storage: localStorage::awscl-pro::v1::income-tracker
 *   {
 *     goal:     { amount: number, currency: 'USD', setAt: ISO },
 *     payments: [{ id, gigName, amount, currency, date: ISO, platform, notes }]
 *   }
 *
 * Same cross-component reactivity pattern as proposalLog.js — storage
 * event for cross-tab + custom 'income-tracker:change' for same-tab.
 */

import { useEffect, useState, useCallback } from 'react';
import { STORAGE_KEY } from './constants.js';

const KEY = `${STORAGE_KEY}::income-tracker`;
const EVT = 'income-tracker:change';

const DEFAULT_STATE = {
  goal: { amount: 500, currency: 'USD', setAt: null },
  payments: [],
};

// ════════════════════════════════════════════════════════════════════
// Storage primitives
// ════════════════════════════════════════════════════════════════════
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      goal: parsed.goal || DEFAULT_STATE.goal,
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch { return DEFAULT_STATE; }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

// ════════════════════════════════════════════════════════════════════
// Public API — mutations
// ════════════════════════════════════════════════════════════════════
export function setGoal(amount, currency = 'USD') {
  const state = read();
  state.goal = { amount: Number(amount) || 0, currency, setAt: new Date().toISOString() };
  write(state);
  return state.goal;
}

export function addPayment({ gigName = '', amount = 0, date, platform = 'direct', currency = 'USD', notes = '' } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  const state = read();
  const entry = {
    id: 'pay-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    gigName: gigName.trim() || 'Untitled gig',
    amount: n,
    currency,
    date: date ? new Date(date).toISOString() : new Date().toISOString(),
    platform,
    notes: notes.trim(),
    createdAt: new Date().toISOString(),
  };
  state.payments.unshift(entry);
  write(state);
  return entry;
}

export function updatePayment(id, patch) {
  const state = read();
  const idx = state.payments.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  state.payments[idx] = { ...state.payments[idx], ...patch };
  if (patch.amount != null) state.payments[idx].amount = Number(patch.amount) || 0;
  write(state);
  return state.payments[idx];
}

export function deletePayment(id) {
  const state = read();
  state.payments = state.payments.filter((p) => p.id !== id);
  write(state);
}

export function clearAll() { write(DEFAULT_STATE); }

// ════════════════════════════════════════════════════════════════════
// Public API — derivations
// ════════════════════════════════════════════════════════════════════

/**
 * Stats for a specific month (defaults to current month).
 * Returns earnings total + count + average gig + progress vs goal +
 * "you need X more, that's Y more gigs at your avg rate".
 */
export function getMonthStats(state, monthKey) {
  state = state || read();
  const mk = monthKey || currentMonthKey();
  const payments = state.payments.filter((p) => monthKeyOf(p.date) === mk);
  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const count = payments.length;
  const avgGig = count > 0 ? total / count : 0;
  const goal = Number(state.goal?.amount) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  const remaining = Math.max(0, goal - total);
  // Use the user's avg gig if they've had any this month, else use the
  // overall avg across all-time, else default to $100 as a fallback so
  // the "X more gigs" hint isn't blank for new users
  const avgAcrossAll = state.payments.length > 0
    ? state.payments.reduce((s, p) => s + p.amount, 0) / state.payments.length
    : 0;
  const referenceAvg = avgGig > 0 ? avgGig : avgAcrossAll > 0 ? avgAcrossAll : 100;
  const moreGigsNeeded = remaining > 0 ? Math.ceil(remaining / referenceAvg) : 0;
  const status = pct >= 80 ? 'green' : pct >= 50 ? 'yellow' : 'red';
  return {
    total, count, avgGig, goal, pct, remaining, referenceAvg, moreGigsNeeded, status,
    payments,
    monthKey: mk,
    monthLabel: monthLabel(mk),
  };
}

/**
 * Last `n` months of totals for the chart.
 */
export function getMonthlySeries(state, n = 6) {
  state = state || read();
  const buckets = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mk = monthKeyOfDate(d);
    const total = state.payments
      .filter((p) => monthKeyOf(p.date) === mk)
      .reduce((s, p) => s + p.amount, 0);
    buckets.push({
      monthKey: mk,
      label: d.toLocaleString('en-GB', { month: 'short' }),
      total,
      count: state.payments.filter((p) => monthKeyOf(p.date) === mk).length,
    });
  }
  return buckets;
}

/**
 * End-of-month summary text — used by the FullCard and Dashboard widget.
 */
export function getMonthSummary(stats) {
  if (stats.count === 0) {
    return `No earnings logged for ${stats.monthLabel} yet.`;
  }
  if (stats.pct >= 100) {
    return `${stats.monthLabel}: $${stats.total.toLocaleString()} earned across ${stats.count} gig${stats.count === 1 ? '' : 's'} — goal smashed (${stats.pct}%).`;
  }
  return `${stats.monthLabel}: $${stats.total.toLocaleString()} earned across ${stats.count} gig${stats.count === 1 ? '' : 's'} — ${stats.pct}% of your $${stats.goal.toLocaleString()} goal.`;
}

// ════════════════════════════════════════════════════════════════════
// React hook
// ════════════════════════════════════════════════════════════════════
export function useIncomeTracker() {
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

// ════════════════════════════════════════════════════════════════════
// Platforms (lightweight enum — matches FR-06 catalogue)
// ════════════════════════════════════════════════════════════════════
export const PLATFORMS = [
  { id: 'direct',     label: 'Direct' },
  { id: 'upwork',     label: 'Upwork' },
  { id: 'fiverr',     label: 'Fiverr' },
  { id: 'freelancer', label: 'Freelancer' },
  { id: 'toptal',     label: 'Toptal' },
  { id: 'remoteok',   label: 'RemoteOK' },
  { id: 'weworkremotely', label: 'WeWorkRemotely' },
  { id: 'other',      label: 'Other' },
];

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
export function currentMonthKey() {
  const d = new Date();
  return monthKeyOfDate(d);
}
function monthKeyOfDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function monthKeyOf(isoOrDate) {
  return monthKeyOfDate(new Date(isoOrDate));
}
function monthLabel(mk) {
  if (!mk) return '';
  const [y, m] = mk.split('-').map((s) => parseInt(s, 10));
  return new Date(y, m - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}
