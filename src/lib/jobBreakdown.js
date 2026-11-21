/**
 * jobBreakdown.js — for one job, tell David in plain words:
 *   1. what he takes home (after fees and a tax reserve, in USD and cedis)
 *   2. the incentives the post offers
 *   3. whether he qualifies, checked against MY_PROFILE
 *   4. what to do about it
 *
 * Pure. Estimates are labelled as estimates; unknown pay stays unknown.
 */

import { MY_PROFILE, SKILLS, haveSkill, skillById } from './myProfile.js';

const BENEFITS = [
  [/\b(health|medical|hmo) (insurance|cover(age)?|benefits?)\b|\bhmo\b/i, 'Health insurance'],
  [/\b(paid time off|pto|paid (holiday|vacation|leave)|annual leave|\d+ days? (of )?(holiday|vacation))\b/i, 'Paid time off'],
  [/\b13th[- ]month\b/i, '13th-month pay'],
  [/\b(equity|stock options?|rsus?|esop)\b/i, 'Shares / stock options'],
  [/\b(bonus(es)?|incentive pay|profit[- ]sharing|commission)\b/i, 'Bonus'],
  [/\b(learning|training|education|conference|certification) (budget|stipend|allowance|reimbursement)\b/i, 'Learning budget'],
  [/\b(home office|equipment|laptop) (budget|stipend|allowance|provided)\b|\bwe (provide|send) (you )?a laptop\b/i, 'Equipment / home-office budget'],
  [/\b(internet|co-?working) (stipend|allowance)\b/i, 'Internet / co-working allowance'],
  [/\b(flexible (hours|schedule|working)|work when you want|async)\b/i, 'Flexible hours'],
  [/\b(parental|maternity|paternity) leave\b/i, 'Parental leave'],
  [/\b(retreats?|offsites?|company (events|meetups)|travel (twice|two to four times))\b/i, 'Paid team trips'],
  [/\b(wellness|gym|mental health) (stipend|allowance|budget)\b/i, 'Wellness allowance'],
  [/\b401\(?k\)?\b/i, '401(k) (US staff only: usually not for you)'],
];

const YEARS = /\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi;

/**
 * Facts read from the FULL post at parse time (the feed keeps only a
 * 300-character description, so these must be taken then).
 */
export function postFacts(title, fullText) {
  const text = `${title || ''} ${String(fullText || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&')}`;
  // Requirements only: drop "nice to have" sections and "any language
  // (bash, Ruby, JavaScript…)" lists, which are choices, not demands.
  const required = text
    .split(/\b(nice[- ]to[- ]haves?|bonus points|would be a plus|preferred qualifications|what we offer|benefits)\b/i)[0]
    .replace(/\bin any (programming )?language\s*\([^)]*\)/gi, ' ');
  const skillsAsked = SKILLS.filter((s) => s.re.test(required)).map((s) => s.id);
  const years = [...required.matchAll(YEARS)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 30);
  const benefits = BENEFITS.filter(([re]) => re.test(text)).map(([, label]) => label);
  // Pay written in the post body (some boards leave the salary field empty).
  const payMatch = /([$£€]\s?\d[\d,.]*k?\s*(?:-|–|to)\s*[$£€]?\s?\d[\d,.]*k?\s*(?:\/\s*|per\s+)(?:hour|hr|month|year|annum)|[$£€]\s?\d[\d,.]*k?\s*(?:\/\s*|per\s+)(?:hour|hr|month|year|annum))/i.exec(text);
  return {
    skillsAsked,
    yearsAsked: years.length ? Math.max(...years) : null,
    benefits,
    payText: payMatch ? payMatch[1].replace(/\s+to\s+/i, ' - ') : null,
  };
}

const SENIOR = /\b(senior|sr\.?|staff|principal|lead|manager|director|head of|vp|chief|architect)\b/i;

/**
 * Does David qualify? { verdict: 'qualify'|'partly'|'not-yet'|'unknown',
 *   have[], missing[{label, learn}], notes[] }
 */
export function assessQualification(gig, profile = MY_PROFILE) {
  const facts = gig?.facts || postFacts(gig?.title, gig?.description);
  const asked = facts.skillsAsked || [];
  const have = asked.filter(haveSkill).map((id) => skillById(id).label);
  const missing = asked.filter((id) => !haveSkill(id)).map((id) => ({ label: skillById(id).label, learn: skillById(id).learn }));
  const notes = [];
  let senior = SENIOR.test(String(gig?.title || ''));
  if (senior) notes.push('Senior title: above your level today.');
  if (facts.yearsAsked != null) {
    if (facts.yearsAsked > profile.yearsInIT) notes.push(`Asks for ${facts.yearsAsked}+ years; you have ${profile.yearsInIT}+.`);
    else notes.push(`Asks for ${facts.yearsAsked}+ years; your ${profile.yearsInIT}+ years in IT cover it.`);
  }
  if (/\bsolutions architect\b/i.test(`${gig?.title} ${gig?.description}`) && /\bcertif/i.test(`${gig?.description}`)) {
    notes.push('Mentions an architect certificate: your SAA study will count once you pass.');
  }
  if (!asked.length) {
    return { verdict: 'unknown', have, missing, notes: [...notes, 'The post lists no skills I could check: read it yourself.'] };
  }
  const tooManyYears = facts.yearsAsked != null && facts.yearsAsked > profile.yearsInIT;
  const verdict = senior || tooManyYears || missing.length >= 3 ? 'not-yet'
    : missing.length === 0 ? 'qualify'
    : 'partly';
  return { verdict, have, missing, notes };
}

/**
 * Take-home estimate per month.
 *   kind 'freelance' via Upwork: 10% Upwork fee + ~$2 per withdrawal.
 *   other (direct contractor via Deel/Wise etc.): ~2% transfer cost.
 * taxReservePct: what to set aside for GRA income tax (an estimate the
 * user can change; confirm the real figure with GRA or an accountant).
 * hoursPerMonth applies to hourly pay (default: 40 side hours a month).
 */
export function takeHome({ view, kind, upwork = false, taxReservePct = 20, hoursPerMonth = 40, usdToGhs = null }) {
  if (!view) return null;
  // Only pay quoted per hour is side work counted in hours; a yearly or
  // monthly figure is a full-time-equivalent month, whatever the contract.
  const isHourly = view.period === 'hour';
  const grossMin = isHourly ? view.hourlyMin * hoursPerMonth : view.monthlyMin;
  const grossMax = isHourly ? view.hourlyMax * hoursPerMonth : view.monthlyMax;
  const fees = (g) => (upwork ? g * 0.10 + 2 : g * 0.02);
  const after = (g) => {
    const afterFees = Math.max(0, g - fees(g));
    return afterFees * (1 - taxReservePct / 100);
  };
  const rate = view.currency === 'USD' && Number.isFinite(usdToGhs) && usdToGhs > 0 ? usdToGhs : null;
  return {
    currency: view.currency,
    basis: isHourly ? `${hoursPerMonth} hours a month` : 'full month',
    grossMin, grossMax,
    feeNote: upwork ? 'Upwork fee about 10% + about $2 to withdraw' : 'about 2% transfer cost (Deel, Wise or bank)',
    taxReservePct,
    netMin: after(grossMin), netMax: after(grossMax),
    ghsMin: rate ? after(grossMin) * rate : null,
    ghsMax: rate ? after(grossMax) * rate : null,
  };
}

/** One plain-words recommendation. */
export function adviceFor({ qualification, match, take }) {
  const q = qualification?.verdict;
  const gaps = (qualification?.missing || []).slice(0, 2);
  const learn = gaps.map((g) => g.learn).filter(Boolean);
  const lowPay = (match?.misses || []).find((m) => /^Under \$/.test(m));
  if (lowPay && q !== 'not-yet') return `Skip: the pay is too low for your time (${lowPay.toLowerCase()}).`;
  if (q === 'not-yet') {
    return `Skip for now. ${learn.length ? `To reach jobs like this, learn ${learn.join(' and ')}.` : 'It is above your level today.'}`;
  }
  if (match && !match.pay && q === 'partly') return `Pay is hidden and you lack ${gaps.map((g) => g.label).join(' and ')}. Apply only if the job itself excites you, and ask for the pay range first.`;
  if (match && !match.pay && q !== 'qualify') return 'Pay is hidden and the post is unclear. Read it before spending time on it.';
  if (q === 'qualify' && match?.perfect) return 'Strong fit and it meets your preferences. Apply, and ask me to tailor your CV and cover letter.';
  if (q === 'qualify' && match && !match.pay) return 'You fit, but the pay is hidden. Apply only if you would accept the job, and ask for the pay range in the first call.';
  if (q === 'qualify') return `You fit. It misses: ${(match?.misses || []).join(', ') || 'nothing'}. Your call.`;
  if (q === 'partly') return `Close. You lack ${gaps.map((g) => g.label).join(' and ')}. Apply only if the rest fits you well, and say honestly you are learning it.`;
  if (take && take.netMax > 0) return 'Read the post yourself to check the skills, then decide.';
  return 'Not enough detail in the post. Read it before deciding.';
}
