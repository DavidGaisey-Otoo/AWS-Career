/**
 * jobPreferences.js — sort the live feed the way David works: side work
 * (freelance / part-time / contract) next to his full-time job, paid in
 * USD or GBP with the pay shown, at a fair rate, without a stressful
 * schedule.
 *
 * Pure. Unknown never passes: a job that hides its pay is not a "perfect
 * match", it is "pay not shown".
 */

import { assessEntryLevelGig } from './entryLevelGigMatcher.js';

/** Titles above David's level today (he can grow into them later). */
const SENIOR_TITLE = /\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|chief|architect)\b/i;

export const DEFAULT_PREFS = Object.freeze({
  kind: 'freelance',          // 'freelance' | 'full-time' | 'all'
  minHourlyUsd: 15,           // his Upwork rate is $20/hr; under $15 is not worth it
  currencies: ['USD', 'GBP'],
  allowHighStress: false,
});

const HOURS_PER_YEAR = 2080;
const HOURS_PER_MONTH = 173;

/** 'freelance' | 'full-time' | 'unknown' from the board's job type, then the title. */
export function workKind(gig) {
  const type = String(gig?.workType || '');
  const title = String(gig?.title || '');
  const freelance = /\b(contract(or)?|freelance|part[\s_-]?time|temporary|temp|hourly|gig|project[\s-]based)\b/i;
  if (freelance.test(type)) return 'freelance';
  if (/\bfull[\s_-]?time\b|\bpermanent\b/i.test(type)) return 'full-time';
  if (freelance.test(title)) return 'freelance';
  if (/\bfull[\s_-]?time\b/i.test(title)) return 'full-time';
  return 'unknown';
}

const CURRENCY = [
  [/£|\bgbp\b/i, 'GBP'],
  [/€|\beur\b/i, 'EUR'],
  [/\$|\busd\b/i, 'USD'],
];

function toNumber(raw) {
  let s = String(raw).trim().toLowerCase();
  const k = s.endsWith('k');
  if (k) s = s.slice(0, -1);
  // "35,3k" is a European decimal; "120,000" is a thousands separator.
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return k ? n * 1000 : n;
}

/**
 * Parse a pay string ("$60k-$120k/yr", "$14 - $20/hour", "£45,000") into
 * { currency, min, max, period } or null when no trustworthy figure exists.
 * A bare small number with no period ("$10" in a staff-engineer post) is a
 * misread, not a salary, so it returns null.
 */
export function parsePay(text) {
  if (!text) return null;
  const s = String(text);
  const nums = [...s.matchAll(/(\d[\d,]*(?:\.\d+)?k?)/gi)].map((m) => toNumber(m[1])).filter((n) => n && n > 0);
  if (!nums.length) return null;
  const currency = (CURRENCY.find(([re]) => re.test(s)) || [null, null])[1];
  let period = /\/\s*(hr|hour)|per hour|hourly/i.test(s) ? 'hour'
    : /\/\s*(mo|month)|per month|monthly/i.test(s) ? 'month'
    : /\/\s*(yr|year)|per year|annual|yearly/i.test(s) ? 'year'
    : null;
  const min = Math.min(nums[0], nums[1] ?? nums[0]);
  const max = Math.max(nums[0], nums[1] ?? nums[0]);
  if (!period) {
    if (min >= 10000) period = 'year';
    else return null;
  }
  return { currency, min, max, period };
}

/** Hourly and monthly view of a parsed pay, in its own currency. */
export function payView(pay) {
  if (!pay) return null;
  const hourly = (n) => (pay.period === 'hour' ? n : pay.period === 'month' ? (n * 12) / HOURS_PER_YEAR : n / HOURS_PER_YEAR);
  const monthly = (n) => (pay.period === 'month' ? n : pay.period === 'year' ? n / 12 : n * HOURS_PER_MONTH);
  return {
    currency: pay.currency,
    hourlyMin: hourly(pay.min), hourlyMax: hourly(pay.max),
    monthlyMin: monthly(pay.min), monthlyMax: monthly(pay.max),
  };
}

const HIGH_STRESS = [
  [/\bon[- ]?call\b/i, 'On-call duty'],
  [/\b24\/7\b/i, '24/7 coverage'],
  [/\b(night|graveyard|overnight)\s+shifts?\b|\bgraveyard\b/i, 'Night shifts'],
  [/\bweekend coverage\b|\bfull weekend availability\b/i, 'Weekend work'],
  [/\b\d{2,}\+?\s+tickets\b/i, 'Very high ticket volume'],
  [/\b(high[- ]pressure|production (outage|down)|incident commander)\b/i, 'High-pressure incidents'],
];
const MEDIUM_STRESS = [
  [/\bfast[- ]paced\b/i, 'Fast-paced'],
  [/\bunder pressure\b|\bhandle the pressure\b/i, 'Works under pressure'],
  [/\bweekend (working )?rotation\b/i, 'Some weekends'],
  [/\b(senior|lead|principal|staff|manager|director|head of)\b/i, 'Senior responsibility'],
];

/** { level: 'low'|'medium'|'high', reasons[] } from the title and text. */
export function stressLevel(gig) {
  const text = `${gig?.title || ''} ${gig?.description || ''} ${gig?.fullText || ''}`;
  const high = HIGH_STRESS.filter(([re]) => re.test(text)).map(([, why]) => why);
  if (high.length) return { level: 'high', reasons: high };
  const medium = MEDIUM_STRESS.filter(([re]) => re.test(text)).map(([, why]) => why);
  if (medium.length) return { level: 'medium', reasons: medium };
  return { level: 'low', reasons: [] };
}

/**
 * Does this job match David's preferences?
 * Returns { perfect, kind, pay, view, stress, misses[] }.
 */
export function matchPreferences(gig, prefs = DEFAULT_PREFS) {
  const misses = [];
  const kind = workKind(gig);
  if (prefs.kind !== 'all' && kind !== prefs.kind) {
    misses.push(kind === 'unknown' ? 'Job type not stated' : kind === 'full-time' ? 'Full-time job' : 'Freelance / part-time');
  }
  const pay = parsePay(gig?.budget);
  const view = payView(pay);
  if (!pay) misses.push('Pay not shown');
  else {
    if (!prefs.currencies.includes(pay.currency)) misses.push(pay.currency ? `Paid in ${pay.currency}` : 'Currency not stated');
    if (view && view.hourlyMax < prefs.minHourlyUsd) misses.push(`Under $${prefs.minHourlyUsd}/hr`);
  }
  // At his level? Senior titles and posts the fit matcher rejects don't count.
  if (SENIOR_TITLE.test(String(gig?.title || '')) || assessEntryLevelGig(gig).classification === 'not-recommended') {
    misses.push('Above your current level');
  }
  // The feed judges stress on the full post at parse time; fall back to
  // the short text for jobs added by hand.
  const stress = gig?.stress?.level ? gig.stress : stressLevel(gig);
  if (stress.level === 'high' && !prefs.allowHighStress) misses.push(`Stressful: ${stress.reasons[0]}`);
  return { perfect: misses.length === 0, kind, pay, view, stress, misses };
}

/** "$5,000–$10,000/month" style label; null when pay is unknown. */
export function payLabel(view, kind) {
  if (!view) return null;
  const sym = view.currency === 'GBP' ? '£' : view.currency === 'EUR' ? '€' : view.currency === 'USD' ? '$' : '';
  const money = (n) => `${sym}${Math.round(n).toLocaleString('en-US')}`;
  const range = (a, b) => (Math.round(a) === Math.round(b) ? money(a) : `${money(a)}–${money(b)}`);
  if (kind === 'freelance' && view.hourlyMax < 200) {
    return `${range(view.hourlyMin, view.hourlyMax)}/hr`;
  }
  return `${range(view.monthlyMin, view.monthlyMax)}/month`;
}
