/**
 * portfolioRedaction.js — turn lab work into a portfolio piece without
 * leaking the account it was built in.
 *
 * Text: account IDs (also with dashes, and truncated ones like
 * "525426…"), ARNs, emails, access keys and the account's display name
 * are replaced before anything is copied out.
 *
 * Images: the user draws boxes; the page paints them solid black on a
 * new canvas and exports a flattened PNG, so the original pixels (and
 * the photo's metadata) are not in the exported file. There is no OCR
 * here (David's decision, 20 Nov 2026), so the screen requires a manual
 * check of every image before export. This file holds the pure parts.
 *
 * Also builds the case study and the Upwork portfolio item, with the
 * limits checked (description ≤ 600 characters, ≤ 5 skills).
 */
import { checkTruth } from './truthCheck.js';

export const DEFAULT_DISPLAY_NAMES = Object.freeze(['Training Lab']);

const RULES = [
  { type: 'ARN', re: /\barn:aws[a-z-]*:[^\s"'<>,)]+/gi, mask: 'arn:aws:…[redacted]' },
  { type: 'access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, mask: '[redacted key]' },
  { type: 'email', re: /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g, mask: '[redacted email]' },
  { type: 'account ID', re: /(?<!\d)\d{4}-\d{4}-\d{4}(?!\d)/g, mask: '[account ID]' },
  { type: 'account ID', re: /(?<![\d.])\d{12}(?!\d)/g, mask: '[account ID]' },
  // A shortened account number in a console header: "525426…" or "5254-26..."
  { type: 'account ID (shortened)', re: /(?<![\d.$])\d{4}-?\d{2,7}\s*(?:…|\.{3})/g, mask: '[account ID]' },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @param {string} text
 * @param {{ displayNames?: string[] }} options
 * @returns {{ text: string, hits: {type:string, count:number}[] }}
 */
export function redactText(text = '', { displayNames = DEFAULT_DISPLAY_NAMES } = {}) {
  let out = String(text || '');
  const counts = new Map();
  const bump = (type, n) => n && counts.set(type, (counts.get(type) || 0) + n);
  for (const rule of RULES) {
    const n = (out.match(rule.re) || []).length;
    bump(rule.type, n);
    out = out.replace(rule.re, rule.mask);
  }
  for (const name of displayNames.map((s) => String(s || '').trim()).filter((s) => s.length >= 3)) {
    const re = new RegExp(escapeRe(name), 'gi');
    bump('account name', (out.match(re) || []).length);
    out = out.replace(re, '[account name]');
  }
  return { text: out, hits: [...counts].map(([type, count]) => ({ type, count })) };
}

/** Anything left that looks sensitive? Used to block the copy button. */
export function stillSensitive(text = '', options) {
  return redactText(text, options).hits;
}

// ── Image boxes (pure geometry; the canvas work happens in the page) ──

/** A rectangle from two drag points, whatever direction it was drawn. */
export function normalizeRect(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Boxes drawn on the shown (scaled) image, mapped to the real pixels. */
export function toNaturalRects(rects, shownWidth, naturalWidth, pad = 2) {
  const k = shownWidth > 0 ? naturalWidth / shownWidth : 1;
  return rects
    .filter((r) => r.w >= 3 && r.h >= 3)
    .map((r) => ({ x: Math.max(0, Math.floor(r.x * k) - pad), y: Math.max(0, Math.floor(r.y * k) - pad), w: Math.ceil(r.w * k) + pad * 2, h: Math.ceil(r.h * k) + pad * 2 }));
}

// ── Case study and Upwork item ─────────────────────────────────────

export const LIMITS = Object.freeze({ title: 70, description: 600, skills: 5 });

/**
 * The case study, in the README's shape: problem, what I did, evidence,
 * what a client gets. Everything passes through redactText.
 */
export function caseStudy({ title = '', problem = '', did = [], evidence = [], clientGets = '', where = 'my own training account', aiNote = '' } = {}, options) {
  const r = (s) => redactText(s, options).text;
  const lines = [
    `## ${r(title) || 'Untitled project'}`,
    '',
    `Built in ${r(where)}.${aiNote ? ` ${r(aiNote)}` : ''}`,
    '',
    `**Problem:** ${r(problem) || '—'}`,
    '',
    '**What I did**',
    ...did.map((d) => String(d || '').trim()).filter(Boolean).map((d) => `- ${r(d)}`),
  ];
  const ev = evidence.map((e) => String(e || '').trim()).filter(Boolean);
  if (ev.length) lines.push('', '**Evidence (redacted screenshots)**', ...ev.map((e, i) => `${i + 1}. ${r(e)}`));
  if (clientGets) lines.push('', `**What a client gets from this:** ${r(clientGets)}`);
  return lines.join('\n');
}

/** Shorten at a word boundary, ending cleanly. */
function cut(text, max) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max - 1);
  const at = head.lastIndexOf(' ');
  return `${(at > max * 0.6 ? head.slice(0, at) : head).replace(/[,;:\s]+$/, '')}…`;
}

/**
 * The Upwork portfolio item. Over-length parts are shortened and said
 * so; the description is redacted and truth-checked against the facts.
 */
export function upworkItem({ title = '', description = '', skills = [] } = {}, { facts = null, displayNames } = {}) {
  const problems = [];
  const red = redactText(description, { displayNames });
  if (red.hits.length) problems.push(`Removed from the description: ${red.hits.map((h) => `${h.count} ${h.type}`).join(', ')}.`);
  const cleanTitle = redactText(title, { displayNames }).text.trim();
  const t = cut(cleanTitle, LIMITS.title);
  if (cleanTitle.length > LIMITS.title) problems.push(`Title shortened to ${LIMITS.title} characters.`);
  const d = cut(red.text, LIMITS.description);
  if (red.text.trim().length > LIMITS.description) problems.push(`Description shortened to ${LIMITS.description} characters.`);
  const uniq = [...new Set(skills.map((s) => String(s || '').trim()).filter(Boolean))];
  if (uniq.length > LIMITS.skills) problems.push(`Upwork takes ${LIMITS.skills} skills; kept the first ${LIMITS.skills}.`);
  const truth = facts ? checkTruth(d, facts) : null;
  return {
    title: t,
    description: d,
    skills: uniq.slice(0, LIMITS.skills),
    chars: d.length,
    problems,
    truth,
    ok: Boolean(t) && Boolean(d) && (!truth || truth.ok),
  };
}
