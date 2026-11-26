/**
 * upworkFit.js — GO / MAYBE / SKIP for one pasted Upwork job, at David's
 * level (AWS Cloud Practitioner + network administration).
 *
 * Three questions, answered separately so a strong one cannot hide a weak
 * one:
 *   1. Is the WORK his size?   good topics vs. hard skips
 *   2. Is the CLIENT safe?     payment verified, spend, rating, hire rate
 *   3. Is it worth the CONNECTS? cost in dollars against the budget
 *
 * Honesty rules (CLAUDE.md §2): a client signal missing from the paste is
 * "unknown", never a pass. GO needs payment verified to be SEEN, not
 * assumed. Connects prices are estimates and are labelled so.
 * Pure: no storage, no network.
 */
import { analyzeJob, experienceYearsAsked, isRecruiterAd } from '../data/jobAnalyzer.js';

/** Work David does well. Each match adds to the score. */
export const GOOD_TOPICS = Object.freeze([
  { id: 'account-setup', label: 'AWS account setup / Safe Start', re: /\b(?:new|set\s*up|setup|secure|lock\s+down|harden)\b[^.\n]{0,30}\baws\s+account\b|\baccount\s+(?:setup|baseline|hardening)\b|\blanding\s+page\s+on\s+aws\b/i },
  { id: 'iam', label: 'IAM users, roles, least privilege', re: /\biam\b|\bleast[- ]privilege\b|\bpermissions?\s+(?:policy|policies)\b/i },
  { id: 'mfa', label: 'MFA / root lock-down', re: /\bmfa\b|\bmulti[- ]factor\b|\b2fa\b|\broot\s+(?:user|account)\b/i },
  { id: 'billing', label: 'Billing, budgets, cost check', re: /\bbilling\b|\bbudgets?\s+(?:alert|alarm)s?\b|\baws\s+budgets?\b|\bcost\s+(?:check|review|optimi[sz]ation|explorer|reduction)\b|\bsurprise\s+bill\b|\breduce\s+(?:our\s+)?(?:aws\s+)?(?:bill|costs?)\b/i },
  { id: 'static-site', label: 'S3 + CloudFront static site', re: /\bstatic\s+(?:web)?site\b|\bs3\b|\bcloudfront\b|\bhost\s+(?:a|our|my)\s+(?:simple\s+)?(?:website|site)\b/i },
  { id: 'dns', label: 'Route 53 / DNS / domain', re: /\broute\s?53\b|\bdns\b|\bdomain\s+(?:setup|records?|transfer)\b|\bnameservers?\b/i },
  { id: 'ssl', label: 'SSL / HTTPS certificate', re: /\bssl\b|\bhttps\b|\btls\b|\bacm\b|\bcertificate\s+manager\b/i },
  { id: 'cloudtrail', label: 'CloudTrail / security check', re: /\bcloudtrail\b|\bsecurity\s+(?:check|review|audit|baseline)\b|\bguardduty\b|\bsecurity\s+hub\b/i },
  { id: 'small-fix', label: 'Small fix (security group, EC2 not connecting)', re: /\bsecurity\s+groups?\b|\bcan'?t\s+(?:connect|ssh|reach)\b|\bnot\s+(?:connecting|loading|reachable)\b|\btroubleshoot\w*\b|\bquick\s+fix\b|\bsmall\s+(?:fix|task|job)\b/i },
  { id: 'networking', label: 'VPC / networking', re: /\bvpc\b|\bsubnets?\b|\bvpn\b|\bnat\s+gateway\b|\bfirewall\b/i },
]);

/** Work to skip at this level. Any one of these makes the verdict SKIP. */
export const SKIP_TOPICS = Object.freeze([
  { id: 'migration', label: 'A migration', re: /\bmigrat(?:e|ion|ing)\b(?![^.\n]{0,40}\b(?:static|small|simple|a\s+(?:single|few)\s+(?:files?|pages?))\b)/i },
  { id: 'kubernetes', label: 'EKS / Kubernetes', re: /\beks\b|\bkubernetes\b|\bk8s\b|\bhelm\b/i },
  { id: 'heavy-coding', label: 'Heavy coding (building an app)', re: /\bfull[- ]stack\b|\b(?:react|angular|vue|next\.?js|django|laravel|node\.?js|flutter|swift|kotlin)\s+(?:developer|app|application|engineer)\b|\bbuild\s+(?:an?|our|the)\s+(?:web\s+|mobile\s+)?(?:app|application|platform|saas|api)\b|\bbackend\s+(?:developer|engineer)\b/i },
  { id: 'production-down', label: '"Urgent, production down"', re: /\b(?:production|prod|site|server|website)\s+(?:is\s+)?(?:down|outage|broken)\b|\boutage\b|\burgent(?:ly)?\b[^.\n]{0,40}\b(?:fix|down|asap|now)\b|\bemergency\b/i },
  { id: 'full-time', label: '30+ hours a week', re: /\bmore\s+than\s+30\s+hrs?\/?\s*(?:week|wk)\b|\b(?:30|35|40)\+?\s*(?:hrs?|hours)\s*(?:\/|per|a)\s*(?:week|wk)\b|\bfull[- ]time\b/i },
  { id: 'long-contract', label: 'A 6+ month contract', re: /\bmore\s+than\s+6\s+months\b|\b(?:6|9|12)\+?\s*months?\b[^.\n]{0,20}\b(?:contract|engagement|project|duration)\b|\blong[- ]term\b/i },
  { id: 'saa-required', label: 'SAA (or higher) certification required', re: /\b(?:solutions?\s+architect|SAA(?:-C0\d)?|aws\s+(?:certified\s+)?(?:professional|specialty))\b[^.\n]{0,40}\b(?:required|must\s+(?:have|hold)|mandatory|certifi(?:ed|cation))\b|\b(?:required|must\s+(?:have|hold|be))\b[^.\n]{0,40}\b(?:solutions?\s+architect|SAA|aws\s+(?:certified\s+)?(?:professional|specialty))\b/i },
  { id: 'whole-architecture', label: '"Build our whole architecture"', re: /\b(?:entire|whole|complete|full)\s+(?:aws\s+)?(?:architecture|infrastructure|platform|landing\s+zone)\b|\bmulti[- ]account\b|\bcontrol\s+tower\b/i },
  { id: 'expert-level', label: 'Expert level', re: /\bexpert\s*(?:level|\$\$\$)\b|\bexperience\s+level:?\s*expert\b|^\s*expert\s*$/im },
]);

const unknown = (label) => ({ known: false, value: null, label });

/**
 * Read the client panel Upwork shows beside a job. Every field is
 * optional; what is not in the paste is returned as unknown.
 */
export function clientSignals(text = '') {
  const t = String(text);

  let payment = unknown('Not in the paste');
  if (/payment\s+(?:method\s+)?(?:not|un)\s*verified/i.test(t)) payment = { known: true, value: false, label: 'Not verified' };
  else if (/payment\s+(?:method\s+)?verified/i.test(t)) payment = { known: true, value: true, label: 'Verified' };

  let spent = unknown('Not in the paste');
  const spentM = t.match(/\$\s?([\d.,]+)\s*([KkMm])?\+?\s*(?:total\s+)?spent/);
  if (spentM) {
    const n = Number(spentM[1].replace(/,/g, '')) * ({ k: 1e3, m: 1e6 }[(spentM[2] || '').toLowerCase()] || 1);
    spent = { known: true, value: n, label: `$${n.toLocaleString()} spent` };
  } else if (/\bno\s+(?:spend|hires?)\s+(?:yet|history)\b|\$0\s+spent/i.test(t)) {
    spent = { known: true, value: 0, label: '$0 spent (new client)' };
  }

  let rating = unknown('Not in the paste');
  const rateM = t.match(/(?:rating\s+is\s+|^|\s)([1-5](?:\.\d{1,2})?)\s*(?:out\s+)?of\s*5(?:\s+(?:stars?|reviews?))?/im);
  if (rateM) rating = { known: true, value: Number(rateM[1]), label: `${rateM[1]} of 5` };
  else if (/\bno\s+(?:feedback|reviews)\s+(?:given\s+)?yet\b/i.test(t)) rating = { known: true, value: null, label: 'No reviews yet' };

  let proposals = unknown('Not in the paste');
  const propM = t.match(/proposals?\s*:?\s*(less\s+than\s+5|5\s+to\s+10|10\s+to\s+15|15\s+to\s+20|20\s+to\s+50|50\+)/i);
  if (propM) {
    const band = propM[1].toLowerCase();
    const max = { 'less than 5': 4, '5 to 10': 10, '10 to 15': 15, '15 to 20': 20, '20 to 50': 50, '50+': 999 }[band.replace(/\s+/g, ' ')];
    proposals = { known: true, value: max, label: `${propM[1]} proposals` };
  }

  let hireRate = unknown('Not in the paste');
  const hireM = t.match(/(\d{1,3})\s*%\s*hire\s+rate/i);
  if (hireM) hireRate = { known: true, value: Number(hireM[1]), label: `${hireM[1]}% hire rate` };

  let connects = unknown('Not in the paste');
  const conM = t.match(/(?:send\s+a\s+proposal\s+for|required\s+connects(?:\s+to\s+submit\s+a\s+proposal)?|costs?)\s*:?\s*(\d{1,3})\s*connects?/i)
    || t.match(/(\d{1,3})\s*connects?\b(?![^.\n]{0,15}\bavailable\b)/i);
  if (conM) connects = { known: true, value: Number(conM[1]), label: `${conM[1]} Connects` };

  return { payment, spent, rating, proposals, hireRate, connects };
}

/** Budget, read the way Upwork lays it out, before the generic parser. */
export function upworkBudget(text = '') {
  const t = String(text).replace(/\$\s?[\d.,]+\s*[KkMm]?\+?\s*(?:total\s+)?spent/g, ' ');
  const hourly = t.match(/\$\s?(\d{1,3}(?:\.\d{2})?)\s*[-–]\s*\$\s?(\d{1,3}(?:\.\d{2})?)\s*(?:\/\s*hr|hourly|per\s+hour)/i)
    || t.match(/hourly[^$\n]{0,20}\$\s?(\d{1,3}(?:\.\d{2})?)\s*[-–]\s*\$\s?(\d{1,3}(?:\.\d{2})?)/i);
  if (hourly) return { kind: 'hourly', min: Number(hourly[1]), max: Number(hourly[2]), label: `$${Number(hourly[1])}–$${Number(hourly[2])}/hr` };
  const fixed = t.match(/\$\s?([\d,]{2,7})(?:\.\d{2})?\s*(?:\n|\s)*(?:fixed[- ]price|fixed|budget)/i)
    || t.match(/(?:fixed[- ]price|budget)\s*:?\s*\$\s?([\d,]{2,7})/i);
  if (fixed) {
    const amount = Number(fixed[1].replace(/,/g, ''));
    return { kind: 'fixed', amount, label: `$${amount.toLocaleString()} fixed` };
  }
  const generic = analyzeJob(t)?.budget;
  return generic && generic.kind !== 'zero-cost' ? generic : { kind: 'unknown', label: 'Not stated' };
}

/**
 * Connects: what applying costs, and whether it is worth it.
 * Estimates only. Upwork sets the price per Connect and changes it.
 */
export function connectsCost({ connects, budget, facts, assumedWinRate = 0.1 }) {
  const price = Number(facts?.upwork?.pricePerConnect) || 0.15;
  const balance = Number(facts?.upwork?.connectsBalance) || 0;
  const idVerified = Boolean(facts?.upwork?.idVerified);
  const out = { known: Boolean(connects?.known), connects: connects?.value ?? null, pricePerConnect: price, dollars: null, perWin: null, worth: 'unknown', notes: [] };

  if (!idVerified) out.notes.push('You cannot apply yet: Upwork ID verification comes first (35 Connects).');
  if (!out.known) {
    out.notes.push('The Connects cost is not in the paste. Upwork shows it as "Send a proposal for: N Connects".');
    return out;
  }
  out.dollars = Math.round(out.connects * price * 100) / 100;
  // If roughly 1 in 10 proposals wins, each win costs ten times this.
  out.perWin = Math.round((out.dollars / assumedWinRate) * 100) / 100;
  if (balance < out.connects) out.notes.push(`You need ${out.connects} Connects and have ${balance}. Buying ${out.connects - balance} costs about $${((out.connects - balance) * price).toFixed(2)} (estimate).`);

  const value = budget?.kind === 'fixed' ? budget.amount
    : budget?.kind === 'hourly' ? (budget.max || budget.min || 0) * 10 // ~10 hours of work
    : null;
  if (!value) {
    out.worth = 'unknown';
    out.notes.push('No budget to compare it with.');
  } else {
    const share = out.perWin / value;
    out.worth = share <= 0.05 ? 'worth it' : share <= 0.15 ? 'borderline' : 'expensive';
    out.notes.push(`At about 1 win in ${Math.round(1 / assumedWinRate)} proposals, each win costs about $${out.perWin.toFixed(2)} in Connects, ${Math.round(share * 100)}% of a $${Math.round(value)} job (estimate).`);
  }
  return out;
}

/**
 * The verdict.
 * @param {string} text — the job post as pasted, client panel included
 * @param {object} facts — from buildFacts()
 * @returns {{ verdict:'GO'|'MAYBE'|'SKIP', score:number, good:[], skips:[],
 *   cautions:[], client:{}, budget:{}, connects:{}, checklist:string[] }}
 */
export function assessUpworkFit(text, facts) {
  const t = String(text || '').trim();
  if (!t) return null;

  const good = GOOD_TOPICS.filter((g) => g.re.test(t)).map(({ id, label }) => ({ id, label }));
  const skips = SKIP_TOPICS.filter((s) => s.re.test(t)).map(({ id, label }) => ({ id, label }));
  const cautions = [];

  const years = experienceYearsAsked(t);
  if (years >= 3 && years > (facts?.cloudYears || 0)) skips.push({ id: 'years', label: `Asks for ${years}+ years of experience` });
  if (isRecruiterAd(t)) skips.push({ id: 'recruiter', label: 'A talent-network ad, not a client project' });
  if (!/\b(?:aws|amazon\s+web\s+services|ec2|s3|cloudfront|route\s?53|iam|lambda)\b/i.test(t)) cautions.push('No AWS work named in the post.');

  const client = clientSignals(t);
  const budget = upworkBudget(t);
  const connects = connectsCost({ connects: client.connects, budget, facts });

  let score = 40 + Math.min(good.length, 4) * 10;
  const clientNotes = [];
  if (client.payment.known) {
    if (client.payment.value) score += 5;
    else { skips.push({ id: 'payment', label: 'Payment method not verified' }); }
  } else clientNotes.push('Payment verification is unknown: check it on the job page before spending Connects.');
  if (client.spent.known) {
    if (client.spent.value === 0) { score -= 5; clientNotes.push('New client with $0 spent: no history to judge them by.'); }
    else if (client.spent.value >= 1000) score += 5;
  }
  if (client.rating.known && client.rating.value != null) {
    if (client.rating.value >= 4.5) score += 5;
    else if (client.rating.value < 4) { score -= 10; clientNotes.push(`Client rating ${client.rating.value} of 5: read their reviews first.`); }
  }
  if (client.proposals.known) {
    if (client.proposals.value <= 15) score += 5;
    else if (client.proposals.value <= 20) score -= 5;
    else { score -= 15; clientNotes.push(`${client.proposals.label}: crowded, and a new profile is easy to overlook.`); }
  }
  if (client.hireRate.known && client.spent.value !== 0) {
    if (client.hireRate.value >= 50) score += 5;
    else if (client.hireRate.value < 20) { score -= 5; clientNotes.push(`${client.hireRate.label}: they often post without hiring.`); }
  }
  if (budget.kind === 'fixed' && budget.amount < 30) { score -= 10; cautions.push(`$${budget.amount} is below your smallest package ($35).`); }
  if (budget.kind === 'hourly' && facts?.hourlyRate && budget.max && budget.max < facts.hourlyRate) cautions.push(`Pays up to $${budget.max}/hr, under your $${facts.hourlyRate}/hr.`);
  if (connects.worth === 'expensive') { score -= 10; cautions.push('Expensive in Connects for this budget.'); }

  score = Math.max(0, Math.min(100, score));
  const verdict = skips.length ? 'SKIP'
    : (score >= 65 && good.length && client.payment.known && client.payment.value) ? 'GO'
    : 'MAYBE';

  const checklist = [
    'Payment method verified (seen on the job page)',
    'Fewer than 15 proposals',
    'The work is on your list: account setup, IAM/MFA, billing, S3 + CloudFront, Route 53, small fixes',
    'No migration, Kubernetes, heavy coding, "production down", 30+ hrs/week or 6+ months',
    'Asks for nothing you would have to claim falsely (SAA, years of AWS)',
    'You can say what "done" means in one line',
  ];

  return { verdict, score, good, skips, cautions: [...cautions, ...clientNotes], client, budget, connects, checklist };
}

/** The reason in one line, for a card or a log entry. */
export function verdictLine(fit) {
  if (!fit) return '';
  if (fit.verdict === 'SKIP') return `Skip: ${fit.skips.map((s) => s.label).join('; ')}.`;
  if (fit.verdict === 'GO') return `Go: ${fit.good.map((g) => g.label).slice(0, 3).join(', ')}.`;
  const why = !fit.good.length ? 'none of your usual work is named' : !fit.client.payment.known ? 'payment verification not seen' : 'some signals are weak';
  return `Maybe: ${why}. Check before spending Connects.`;
}
