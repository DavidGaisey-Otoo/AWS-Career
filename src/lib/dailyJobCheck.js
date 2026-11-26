/**
 * dailyJobCheck.js — the daily Upwork routine: the saved searches, the
 * checklist, and a small log of what was checked.
 *
 * The app only OPENS Upwork search pages in David's own browser. It never
 * signs in, scrapes, applies or messages anyone; Upwork's terms forbid
 * bots, and the Submit button is always his.
 *
 * The search links use Upwork's own filter parameters. Upwork can rename
 * them without notice, so the screen says to check the filters on the
 * page; a link that loads without them is not an error we can detect.
 * Pure.
 */

/** Search terms from the Upwork profile plan (19 Nov 2026). */
export const SEARCH_TERMS = Object.freeze([
  'AWS S3 static website',
  'CloudFront',
  'AWS IAM setup',
  'AWS billing',
  'AWS cost',
  'Route 53 DNS',
  'SSL certificate AWS',
  'EC2 not connecting',
]);

/** The filters every saved search applies, in words. */
export const FILTERS = Object.freeze([
  'Experience level: Entry and Intermediate',
  'Client: payment verified',
  'Proposals: fewer than 15',
  'Fixed price under $500, or hourly part-time (less than 30 hrs/week)',
  'Newest first',
]);

const BASE = 'https://www.upwork.com/nx/search/jobs/';

/** One Upwork search URL. kind: 'fixed' (under $500) or 'hourly' (part-time). */
export function searchUrl(term, kind = 'fixed') {
  const params = new URLSearchParams({
    q: String(term || '').trim(),
    contractor_tier: '1,2',
    payment_verified: '1',
    proposals: '0-4,5-9,10-14',
    sort: 'recency',
  });
  if (kind === 'hourly') {
    params.set('t', '0');
    params.set('workload', 'as_needed,part_time');
  } else {
    params.set('t', '1');
    params.set('amount', '0-99,100-499');
  }
  return `${BASE}?${params.toString()}`;
}

export function savedSearches(terms = SEARCH_TERMS) {
  return terms.map((term) => ({ term, fixed: searchUrl(term, 'fixed'), hourly: searchUrl(term, 'hourly') }));
}

/** The routine, in order. Replies to clients come before new searching. */
export const ROUTINE = Object.freeze([
  { id: 'messages', text: 'Answer any client messages on Upwork first.' },
  { id: 'searches', text: 'Open the saved searches below, newest first.' },
  { id: 'fresh', text: 'Skip posts older than a day, or with 15 or more proposals.' },
  { id: 'check', text: 'Paste each promising post into "Check a job post". Only GO is worth Connects.' },
  { id: 'proposal', text: 'For a GO: write the proposal. The truth check must pass before you copy it.' },
  { id: 'submit', text: 'Paste it into Upwork and press Submit yourself. The app never submits.' },
  { id: 'log', text: 'Log what you checked and applied for below.' },
  { id: 'limit', text: 'Stop at 3 proposals a day, so Connects last.' },
]);

/** Local date as YYYY-MM-DD, so "today" matches the user's clock. */
export function dayKey(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const blankDay = (date) => ({ date, done: [], checked: 0, go: 0, applied: 0 });

/** Today's entry, created if missing. Never mutates the log passed in. */
export function today(log = [], now = new Date()) {
  const key = dayKey(now);
  return (Array.isArray(log) ? log : []).find((d) => d?.date === key) || blankDay(key);
}

/**
 * Apply a change to today's entry. Counters cannot go below zero; the log
 * keeps the last 90 days, so it stays small in localStorage.
 */
export function updateToday(log = [], patch = {}, now = new Date()) {
  const list = Array.isArray(log) ? log.filter((d) => d && d.date) : [];
  const entry = { ...today(list, now) };
  for (const k of ['checked', 'go', 'applied']) {
    if (patch[k] != null) entry[k] = Math.max(0, Math.round(Number(entry[k] || 0) + Number(patch[k]) || 0));
  }
  if (patch.toggle) {
    const done = new Set(entry.done || []);
    if (done.has(patch.toggle)) done.delete(patch.toggle); else done.add(patch.toggle);
    entry.done = [...done];
  }
  const rest = list.filter((d) => d.date !== entry.date);
  return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-90);
}

/** Days in a row, ending today or yesterday, with at least one post checked. */
export function streak(log = [], now = new Date()) {
  const active = new Set((log || []).filter((d) => d && d.checked > 0).map((d) => d.date));
  let n = 0;
  const cursor = new Date(now);
  if (!active.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (active.has(dayKey(cursor))) {
    n += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return n;
}

/** Totals for the last 7 days including today. */
export function lastWeek(log = [], now = new Date()) {
  const keys = new Set();
  const cursor = new Date(now);
  for (let i = 0; i < 7; i += 1) { keys.add(dayKey(cursor)); cursor.setDate(cursor.getDate() - 1); }
  return (log || []).filter((d) => d && keys.has(d.date)).reduce(
    (t, d) => ({ checked: t.checked + (d.checked || 0), go: t.go + (d.go || 0), applied: t.applied + (d.applied || 0) }),
    { checked: 0, go: 0, applied: 0 },
  );
}

export const DAILY_KEY_SUFFIX = '::daily-job-check';
