/**
 * proposalScope.js — the part of a proposal that stops scope creep: a
 * fixed-price scope, what is not included, and "Done means…", a list
 * the client can tick off.
 *
 * Every "done" line is something either side can check by looking, not
 * a promise about performance nobody has measured. Prices come from
 * David's own package list; AWS running costs stay the client's and are
 * called estimates.
 * Pure.
 */
import { GOOD_TOPICS } from './upworkFit.js';

/** David's Upwork Project Catalog (Upwork_Profile.md, 19 Nov 2026). */
export const PACKAGES = Object.freeze([
  { id: 'safe-start', name: 'AWS Account Safe Start', tiers: [40, 80, 150], topics: ['account-setup', 'iam', 'mfa', 'billing', 'cloudtrail'] },
  { id: 'static-site', name: 'Static Website on AWS (S3 + CloudFront + HTTPS)', tiers: [50, 100, 180], topics: ['static-site', 'dns', 'ssl'] },
  { id: 'cost-check', name: 'AWS Cost Check (report only)', tiers: [35, 70], topics: ['billing'] },
]);

const DONE = {
  'account-setup': 'You can sign in with your own IAM user, and nobody needs the root user for daily work.',
  'mfa': 'The root user has MFA turned on, and it has no access keys.',
  'iam': 'Each person or tool has its own IAM user or role, with only the access its job needs.',
  'billing': 'A budget alert emails you before the monthly bill passes the limit you set.',
  'cloudtrail': 'CloudTrail is recording, and you have a short plain-English list of what the security check found.',
  'static-site': 'Your site loads over HTTPS, and the storage bucket behind it is not public.',
  'ssl': 'The certificate is valid and set to renew automatically (AWS Certificate Manager).',
  'dns': 'Your domain points to the new site, and the old DNS records are written down so they can be put back.',
  'small-fix': 'The problem you described is gone, and you can see how it was fixed.',
  'networking': 'The network change is in place and tested, and it is drawn on a simple diagram.',
};

const SCOPE = {
  'account-setup': 'Secure the AWS account: root lock-down and everyday sign-in',
  'mfa': 'MFA on the root user; remove root access keys',
  'iam': 'IAM users or roles with least privilege (up to 5)',
  'billing': 'A monthly budget with an email alert',
  'cloudtrail': 'Turn on CloudTrail and run a basic security check',
  'static-site': 'Host the site on S3 behind CloudFront (bucket kept private)',
  'ssl': 'HTTPS with a free AWS certificate',
  'dns': 'Point your domain (Route 53 or your current DNS provider)',
  'small-fix': 'Find and fix the issue described in the post',
  'networking': 'The VPC or network change described in the post',
};

/** Topics a post or brief names, using the job check's topic list. */
export function topicsIn(text = '') {
  return GOOD_TOPICS.filter((g) => g.re.test(String(text))).map((g) => g.id);
}

/**
 * @param {{ jd:string, budget?:object }} input
 * @returns {{ package:object|null, tier:number|null, scope:string[],
 *   done:string[], notIncluded:string[], priceLine:string, text:string }}
 */
export function scopeAndDone({ jd = '', budget = null, hourly = false } = {}) {
  const topics = topicsIn(jd);
  const cost = /\bcost\s+(?:check|review|reduction|optimi[sz]ation)\b|\breduce\s+(?:our\s+)?(?:aws\s+)?(?:bill|costs?)\b/i.test(jd);
  const pkg = cost && !topics.some((t) => ['static-site', 'iam', 'mfa'].includes(t))
    ? PACKAGES.find((p) => p.id === 'cost-check')
    : [...PACKAGES]
      .map((p) => ({ p, hits: p.topics.filter((t) => topics.includes(t)).length }))
      .filter((x) => x.hits)
      .sort((a, b) => b.hits - a.hits)[0]?.p || null;

  const scope = topics.map((t) => SCOPE[t]).filter(Boolean);
  const done = topics.map((t) => DONE[t]).filter(Boolean);
  if (pkg?.id === 'cost-check') {
    scope.splice(0, scope.length, 'Review the bill and running resources, read-only', 'A written report: what costs money, what could be cheaper, the estimated saving');
    done.splice(0, done.length, 'You have the report, with each saving and its estimated monthly amount.', 'Nothing was deleted or changed. You decide what to act on.');
  }
  if (!scope.length) scope.push('The task described in the post, as agreed before I start');
  done.push('You get a short handover note: what I changed, why, and how to undo each change.');

  const notIncluded = [
    'Anything not listed above. I will quote it separately before doing it.',
    'AWS charges on your account. You pay AWS directly; I will estimate them first.',
    'Ongoing support after handover, unless we agree it.',
  ];

  // A tier matched to the posted budget when there is one; otherwise the
  // middle tier, labelled as a starting point.
  let tier = null;
  if (pkg) {
    const fits = budget?.kind === 'fixed' ? [...pkg.tiers].reverse().find((n) => n <= budget.amount) : null;
    tier = fits || pkg.tiers[Math.min(1, pkg.tiers.length - 1)];
  }
  const priceLine = hourly || budget?.kind === 'hourly'
    ? 'Hourly, through the Upwork contract, with a cap on hours agreed before I start.'
    : budget?.kind === 'fixed'
    ? `Fixed price: $${budget.amount.toLocaleString()} as posted, for the scope above.`
    : tier ? `Fixed price: $${tier} for the scope above (my ${pkg.name} package).`
    : 'Fixed price, agreed with you before I start.';

  const text = [
    hourly || budget?.kind === 'hourly' ? '**Scope**' : '**Scope (fixed price)**',
    ...scope.map((s) => `• ${s}`),
    priceLine,
    '',
    '**Done means**',
    ...done.map((d) => `• ${d}`),
    '',
    '**Not included**',
    ...notIncluded.map((n) => `• ${n}`),
  ].join('\n');

  return { package: pkg, tier, topics, scope, done, notIncluded, priceLine, text };
}
