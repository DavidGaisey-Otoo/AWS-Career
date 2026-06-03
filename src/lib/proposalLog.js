/**
 * proposalLog.js — FR-05 auto-logging store for every proposal generated.
 *
 * Separate from FreelanceContext's `addProposal()` which is opt-in via
 * "Save to Tracker". This log is *automatic* — fires on every Smart
 * Proposal generation so users get an honest win-rate signal without
 * having to remember to save.
 *
 * Storage:  localStorage::awscl-pro::v1::proposal-log
 *
 * Dedupe rule: a regenerate of the same JD on the same day updates the
 * existing entry's text + approach instead of creating a duplicate.
 * This prevents the inevitable "5 regenerates = 5 sent counts" noise.
 *
 * Entry shape:
 *   {
 *     id:        string,
 *     createdAt: ISO string,        // when first generated
 *     updatedAt: ISO string,        // last regenerate
 *     jdHash:    string,            // dedupe key
 *     jdSnippet: string,            // first 200 chars for the list view
 *     gigTitle:  string,
 *     platform:  string,            // 'upwork' | 'remoteok' | 'weworkremotely' | 'manual' | ...
 *     text:      string,            // the final proposal text shown to user
 *     approach:  string,            // FR-04 picked approach
 *     services:  string[],
 *     status:    'sent' | 'replied' | 'won' | 'lost',
 *     statusUpdatedAt: ISO | null,
 *   }
 */

import { useEffect, useState, useCallback } from 'react';
import { STORAGE_KEY } from './constants.js';

const KEY = `${STORAGE_KEY}::proposal-log`;
const EVT = 'proposal-log:change';

// ════════════════════════════════════════════════════════════════════
// Status catalogue
// ════════════════════════════════════════════════════════════════════
export const STATUS = {
  sent:    { id: 'sent',    label: 'Sent',    tone: 'slate',   tip: 'Awaiting reply' },
  replied: { id: 'replied', label: 'Replied', tone: 'amber',   tip: 'They got back to you' },
  won:     { id: 'won',     label: 'Won',     tone: 'success', tip: 'You landed the gig' },
  lost:    { id: 'lost',    label: 'Lost',    tone: 'danger',  tip: 'Closed without a win' },
};
export const STATUS_LIST = Object.values(STATUS);

// ════════════════════════════════════════════════════════════════════
// Storage helpers
// ════════════════════════════════════════════════════════════════════
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch { return []; }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list || []));
    // Cross-component reactivity — fire a custom event the hook listens to
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

// ════════════════════════════════════════════════════════════════════
// JD hash — small, deterministic, collision-resistant enough for dedupe
// ════════════════════════════════════════════════════════════════════
function hashJd(jd) {
  const s = String(jd || '').trim().toLowerCase().replace(/\s+/g, ' ');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.toDateString() === db.toDateString();
}

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/**
 * Log a proposal. Dedupe rule: if the most recent entry has the same
 * jdHash AND was created today, update it instead of adding a new row.
 * This prevents the regenerate-counts-as-sent noise.
 */
export function logProposal({ jd, gigTitle = '', platform = 'manual', text = '', approach = 'auto', services = [] } = {}) {
  if (!jd?.trim() && !text?.trim()) return null;
  const list = read();
  const jdHash = hashJd(jd);
  const now = new Date().toISOString();

  // Find a today-same-jd entry to update
  const idx = list.findIndex((e) => e.jdHash === jdHash && isSameDay(e.createdAt, now));
  if (idx >= 0) {
    const updated = {
      ...list[idx],
      text,
      approach,
      services,
      platform: platform || list[idx].platform,
      gigTitle: gigTitle || list[idx].gigTitle,
      updatedAt: now,
    };
    list[idx] = updated;
    write(list);
    return updated;
  }

  // New entry
  const entry = {
    id: 'prp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: now,
    updatedAt: now,
    jdHash,
    jdSnippet: (jd || '').slice(0, 200),
    gigTitle: gigTitle || extractFirstLine(jd),
    platform,
    text,
    approach,
    services,
    status: 'sent',
    statusUpdatedAt: null,
  };
  list.unshift(entry);  // newest first
  write(list);
  return entry;
}

export function updateProposalStatus(id, status) {
  if (!STATUS[status]) return null;
  const list = read();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], status, statusUpdatedAt: new Date().toISOString() };
  write(list);
  return list[idx];
}

export function duplicateProposal(id) {
  const list = read();
  const src = list.find((e) => e.id === id);
  if (!src) return null;
  const now = new Date().toISOString();
  const copy = {
    ...src,
    id: 'prp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: now,
    updatedAt: now,
    status: 'sent',
    statusUpdatedAt: null,
    gigTitle: src.gigTitle ? `${src.gigTitle} (copy)` : 'Untitled (copy)',
  };
  list.unshift(copy);
  write(list);
  return copy;
}

export function deleteProposal(id) {
  const list = read().filter((e) => e.id !== id);
  write(list);
}

export function listProposals() { return read(); }

export function clearAll() { write([]); }

// ════════════════════════════════════════════════════════════════════
// Derived stats
// ════════════════════════════════════════════════════════════════════
export function getStats(list) {
  list = list || read();
  const total = list.length;
  const replied = list.filter((e) => e.status === 'replied' || e.status === 'won' || e.status === 'lost').length;
  const won = list.filter((e) => e.status === 'won').length;
  const lost = list.filter((e) => e.status === 'lost').length;
  const closed = won + lost;
  // Win rate is computed against CLOSED outcomes (won + lost), not raw sends —
  // unanswered proposals shouldn't drag the rate down because no decision was
  // ever made.
  const winRate = closed > 0 ? Math.round((won / closed) * 100) : 0;
  // Reply rate is against total sends — that one IS a "did anyone bother".
  const replyRate = total > 0 ? Math.round((replied / total) * 100) : 0;
  return { total, replied, won, lost, closed, winRate, replyRate };
}

/**
 * Weekly time-series for the chart — last `weeks` weeks (default 8),
 * counting sends + wins per ISO week starting Monday.
 */
export function getWeeklySeries(list, weeks = 8) {
  list = list || read();
  const buckets = [];
  const now = new Date();
  const startOfThisWeek = mondayOf(now);
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(startOfThisWeek);
    start.setDate(start.getDate() - i * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    buckets.push({ start, end, sent: 0, won: 0, replied: 0 });
  }
  for (const e of list) {
    const t = new Date(e.createdAt).getTime();
    const b = buckets.find((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (!b) continue;
    b.sent += 1;
    if (e.status === 'won') b.won += 1;
    if (e.status === 'replied' || e.status === 'won' || e.status === 'lost') b.replied += 1;
  }
  return buckets.map((b) => ({
    label: shortWeekLabel(b.start),
    sent: b.sent,
    won: b.won,
    replied: b.replied,
    start: b.start.toISOString(),
  }));
}

/**
 * Tip generator — compares your win rate against the freelance industry
 * baseline (10-20% is normal, 20%+ is strong, 5-10% means hook is weak,
 * <5% means proposals aren't being read).
 */
export function getInsightTip(stats) {
  const { total, winRate, closed, replyRate } = stats;
  if (total === 0) {
    return {
      tone: 'neutral',
      title: 'No proposals yet',
      body: 'Generate a proposal in the Smart Generator tab — every one you make lands here automatically.',
    };
  }
  if (closed === 0) {
    return {
      tone: 'neutral',
      title: 'No outcomes yet',
      body: `You've sent ${total} proposal${total === 1 ? '' : 's'}. Mark them as Replied / Won / Lost as you hear back so the win rate becomes meaningful.`,
    };
  }
  if (winRate >= 30) {
    return {
      tone: 'success',
      title: `Strong — ${winRate}% win rate`,
      body: `You're well above the 15-20% industry average. Whatever you're doing, keep doing it. Consider raising your rates.`,
    };
  }
  if (winRate >= 15) {
    return {
      tone: 'success',
      title: `Healthy — ${winRate}% win rate`,
      body: `That's right in the 15-20% professional freelance band. Focus on raising your minimum project size next.`,
    };
  }
  if (winRate >= 8) {
    return {
      tone: 'warning',
      title: `${winRate}% win rate — slightly below average`,
      body: `Industry average is 15-20%. Try personalising your Hook more — reference the client's exact pain point in the first sentence, not a generic opener.`,
    };
  }
  if (replyRate < 20) {
    return {
      tone: 'danger',
      title: `Only ${replyRate}% of proposals get a reply`,
      body: `That suggests the proposal isn't being read past the first sentence. Tighten your Hook section, lead with the client's specific problem, and keep the proposal under 300 words.`,
    };
  }
  return {
    tone: 'danger',
    title: `${winRate}% win rate — well below average`,
    body: `Industry average is 15-20%. Check: are you applying to the right tier of gig (your skill level vs theirs), is your portfolio link working, are you applying within 24 hours of posting?`,
  };
}

// ════════════════════════════════════════════════════════════════════
// React hook — subscribes to storage + same-tab change events
// ════════════════════════════════════════════════════════════════════
export function useProposalLog() {
  const [list, setList] = useState(() => read());
  const refresh = useCallback(() => setList(read()), []);
  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener('storage', onChange);
    window.addEventListener(EVT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVT, onChange);
    };
  }, [refresh]);
  return list;
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function extractFirstLine(s) {
  if (!s) return 'Untitled proposal';
  const line = String(s).split(/\n|\.|—|\|/)[0].trim();
  return line.length > 80 ? line.slice(0, 80) + '…' : line || 'Untitled proposal';
}

function mondayOf(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();          // Sun = 0, Mon = 1, ...
  const offset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + offset);
  return x;
}

function shortWeekLabel(d) {
  const x = new Date(d);
  return `${x.getDate()} ${x.toLocaleString('en-GB', { month: 'short' })}`;
}
