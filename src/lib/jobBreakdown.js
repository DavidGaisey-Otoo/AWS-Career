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

const NO_BENEFITS = /\bbenefits?\b[^.]{0,80}\b(do not|don't|does not|doesn't|will not|won't) apply\b|\bnot eligible for (any )?(company[- ]sponsored |employee )?benefits\b|\bno (company[- ]sponsored |employee )?benefits\b/i;

// Posts that want an expert, not a learner: a certificate plus the
// keyword is not enough to pass these.
// Up to five words may sit between, as in "deep cybersecurity, privacy,
// and risk management knowledge"; a full stop ends the phrase.
const DEEP_EXPERTISE = /\b(deep|demonstrable|extensive|expert[- ]level)\s+(?:[\w,/&-]+\s+){0,5}?(experience|expertise|knowledge)\b/i;

// The post itself limits who may apply, even when the board's location
// field says "Anywhere" (We Work Remotely does this). Read from the full
// post, since the feed keeps only 300 characters.
const LIMITED_TO_COUNTRY = [
  /\b(us|u\.s\.|united states|american)\s+(citizens?|residents?|persons?)\b/i,
  /\b(authori[sz]ed|eligible|right)\s+to\s+work\s+in\s+(the\s+)?(us|u\.s\.|united states|uk|united kingdom|eu|europe|canada|australia)\b/i,
  /\b(security|secret|top secret|public trust)\s+clearance\b/i,
  // Pay quoted only in US pay zones: the job is for people living in the US.
  /\bwithin the (us|u\.s\.|united states),? our (geographic )?pay zones\b|\ball other (us|u\.s\.) locations\b/i,
];

const YEARS = /\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi;

// How the money reaches him, with the usual cost of each route.
const PAY_METHODS = [
  [/\bdeel\b/i, 'Deel', 'usually free to receive; about 1–2% to move it to a bank'],
  [/\bwise\b/i, 'Wise', 'about 1–2% conversion fee'],
  [/\bpayoneer\b/i, 'Payoneer', 'about 2–3% to withdraw'],
  [/\bremote\.com\b/i, 'Remote.com', 'usually free to receive'],
  [/\boyster\b/i, 'Oyster', 'usually free to receive'],
  [/\bpaypal\b/i, 'PayPal', 'about 4–5% in fees and conversion'],
  [/\bbank transfer|wire transfer\b/i, 'Bank transfer', 'about $15–40 per transfer'],
];

// Working-hours zones a post may name, with their standard offset from GMT.
// Abbreviations must be upper case ("ET", not the word "et"); spelled-out
// names must say "time" so "Eastern Europe" is not read as US Eastern.
const ZONES = [
  { abbr: /\b(?:PST|PDT|PT)\b/, words: /\bpacific (?:standard )?time\b/i, name: 'Pacific (US West)', offset: -8 },
  { abbr: /\b(?:CST|CDT|CT)\b/, words: /\bcentral (?:standard )?time\b/i, name: 'Central (US)', offset: -6 },
  { abbr: /\b(?:EST|EDT|ET)\b/, words: /\beastern (?:standard )?time\b/i, name: 'Eastern (US East)', offset: -5 },
  { abbr: /\b(?:CET|CEST)\b/, words: /\bcentral european time\b/i, name: 'Central Europe', offset: 1 },
  { abbr: /\b(?:GMT|BST)\b/, words: /\b(?:uk hours|uk time|london time)\b/i, name: 'UK', offset: 0 },
];

const RECRUITER_FOR_CLIENT = /\b(on behalf of (our|a|an) (client|customer)|our client|for (a|one of our) clients?|hiring for (a|an) (unnamed|confidential)|confidential client)\b/i;
const INTERVIEW_STEPS = [
  [/\btake[- ]home (test|assignment|task)\b/i, 'Take-home test'],
  [/\b(technical|skills?) (test|assessment|interview)\b/i, 'Technical test or interview'],
  [/\b(coding|hands-on|practical) (test|challenge|exercise)\b/i, 'Practical exercise'],
  [/\b(\d|two|three|four) (interview )?(rounds|stages)\b/i, 'Several interview rounds'],
  [/\bbackground check\b/i, 'Background check'],
];
const GROWTH = [
  [/\b(training|onboarding program|mentor(ing|ship))\b/i, 'Training or mentoring'],
  [/\bcertifications? (support|reimburse\w*|paid|budget|sponsor\w*)\b/i, 'Pays for certificates'],
  [/\b(career (growth|path|progression)|promotion|advancement)\b/i, 'Promotion path'],
];
const CLOSING = /\b(?:apply (?:by|before)|closing date|applications close|deadline)[:\s]+([A-Z][a-z]{2,8}\.? \d{1,2}(?:, \d{4})?|\d{1,2} [A-Z][a-z]{2,8}(?: \d{4})?)/;

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
  // "Benefits such as health insurance and PTO do not apply" names the
  // perks only to rule them out: a contractor gets none of them.
  const noBenefits = NO_BENEFITS.test(text);
  const benefits = noBenefits ? [] : BENEFITS.filter(([re]) => re.test(text)).map(([, label]) => label);
  // Pay written in the post body (some boards leave the salary field empty).
  const payMatch = /([$£€]\s?\d[\d,.]*k?\s*(?:-|–|to)\s*[$£€]?\s?\d[\d,.]*k?\s*(?:\/\s*|per\s+)(?:hour|hr|month|year|annum)|[$£€]\s?\d[\d,.]*k?\s*(?:\/\s*|per\s+)(?:hour|hr|month|year|annum))/i.exec(text);
  const contract = /\b(independent contractor|1099|contract(or)? (role|position|basis)|freelance)\b/i.test(text) ? 'contractor'
    : /\b(full[- ]time employee|w-?2|permanent (role|position|contract)|employer of record|eor)\b/i.test(text) ? 'employee'
    : null;
  const zone = ZONES.find((z) => z.abbr.test(text) || z.words.test(text));
  return {
    contract,
    payMethods: PAY_METHODS.filter(([re]) => re.test(text)).map(([, name, cost]) => ({ name, cost })),
    workZone: zone ? { name: zone.name, offset: zone.offset } : null,
    recruiterForClient: RECRUITER_FOR_CLIENT.test(text),
    interviewSteps: INTERVIEW_STEPS.filter(([re]) => re.test(text)).map(([, label]) => label),
    growth: GROWTH.filter(([re]) => re.test(text)).map(([, label]) => label),
    closingDate: (CLOSING.exec(text) || [])[1] || null,
    skillsAsked,
    yearsAsked: years.length ? Math.max(...years) : null,
    deepExpertise: DEEP_EXPERTISE.test(required),
    limitedToCountry: LIMITED_TO_COUNTRY.some((re) => re.test(text)),
    noBenefits,
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
  const deep = Boolean(facts.deepExpertise);
  if (deep) notes.push('Asks for deep professional experience: a certificate alone will not pass, you need real project work in this area first.');
  const tooManyYears = facts.yearsAsked != null && facts.yearsAsked > profile.yearsInIT;
  // An expert-only post is never a clean "qualify" for an entry-level
  // profile, and with any gap at all it is "not yet".
  const verdict = senior || tooManyYears || missing.length >= 3 || (deep && missing.length >= 1) ? 'not-yet'
    : missing.length === 0 && !deep ? 'qualify'
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

const DAY_MS = 24 * 60 * 60 * 1000;
const fmtHour = (h) => {
  const x = ((h % 24) + 24) % 24;
  return `${x % 12 === 0 ? 12 : x % 12} ${x < 12 ? 'am' : 'pm'}`;
};

/**
 * The extra detail David asked for on every job: contract and payment
 * route, dates, hours in Ghana time, interview steps, growth, what he needs
 * at home, a learning plan, a 1–10 priority and an apply checklist.
 * Pure. Anything the post does not say stays "not stated", never guessed.
 */
export function jobExtras(gig, { qualification, match, genuine, now = Date.now() } = {}) {
  const f = gig?.facts || {};
  const title = String(gig?.title || '');
  const kind = match?.kind;
  const contract = f.contract || (kind === 'freelance' ? 'contractor' : kind === 'full-time' ? 'employee' : null);

  const posted = gig?.postedAt ? new Date(gig.postedAt).getTime() : NaN;
  const postedDaysAgo = Number.isFinite(posted) ? Math.max(0, Math.floor((now - posted) / DAY_MS)) : null;

  // A 9-to-5 day in the named zone, shown in Ghana time (GMT all year).
  const ghanaHours = f.workZone
    ? `${f.workZone.name} 9 am–5 pm ≈ ${fmtHour(9 - f.workZone.offset)}–${fmtHour(17 - f.workZone.offset)} in Ghana`
    : null;

  const supportRole = /\b(support|help ?desk|service desk|noc|operations|on-?call)\b/i.test(title);
  const homeNeeds = [
    'A reliable laptop',
    'Stable internet (about 10 Mbps or more) with a backup data bundle',
    supportRole ? 'Backup power for laptop and router (UPS or power bank): support work cannot drop during a power cut'
      : 'Backup power for calls and deadlines',
    'A quiet place for video calls',
  ];

  const learningPlan = (qualification?.missing || []).map((m) => ({ skill: m.label, how: m.learn }));

  let score = 5;
  const q = qualification?.verdict;
  score += q === 'qualify' ? 3 : q === 'partly' ? 1 : q === 'not-yet' ? -3 : 0;
  if (match?.pay) score += 1;
  if (match?.perfect) score += 1;
  const misses = match?.misses || [];
  if (misses.some((m) => /^Under \$/.test(m))) score -= 4;          // not worth his time
  if (misses.some((m) => /^Paid in |Currency not stated/.test(m))) score -= 2; // not USD/GBP
  if (misses.includes('Above your current level')) score -= 2;
  if (match?.stress?.level === 'high') score -= 2;
  else if (match?.stress?.level === 'medium') score -= 1;
  if (genuine?.verdict === 'check') score -= 1;
  if (f.recruiterForClient) score -= 1;
  if (postedDaysAgo != null && postedDaysAgo > 21) score -= 1;
  const priority = Math.max(1, Math.min(10, score));

  const checklist = [
    'Confirm on the company\'s own careers page that someone in Ghana can apply',
    'Tailor a copy of your base job CV for this role (true facts only)',
    'Short cover letter that answers the post\'s main asks',
    ...(f.recruiterForClient ? ['Ask who the real employer is before you send any ID documents'] : []),
    ...(learningPlan.length ? ['Say honestly which skills you are still learning'] : []),
    'Time to apply: about 30–45 minutes',
  ];

  return {
    contract,
    contractNote: contract === 'contractor' ? 'Contractor: no pension or benefits, and you pay your own tax (GRA).' : contract === 'employee' ? 'Employee (often through an employer-of-record): ask what benefits apply in Ghana.' : 'Contract type not stated: ask.',
    payMethods: f.payMethods || [],
    postedDaysAgo,
    closingDate: f.closingDate || null,
    ghanaHours,
    recruiterForClient: Boolean(f.recruiterForClient),
    interviewSteps: f.interviewSteps || [],
    growth: f.growth || [],
    homeNeeds,
    learningPlan,
    priority,
    checklist,
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
