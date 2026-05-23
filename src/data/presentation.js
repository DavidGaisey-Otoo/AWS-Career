/**
 * Presentation generator — turns a project brief into a 10-slide
 * client-ready deck. Pure functions over plain objects, no LLM.
 *
 * A "deck" is:
 *   { id, name, createdAt, updatedAt, brand, brief, slides: [...] }
 *
 * A "slide" is:
 *   { id, kind, title, body, bullets, notes, extras? }
 */

import { uid } from '../lib/utils.js';

// -------------------------------------------------------------
// Default brand palette
// -------------------------------------------------------------

export const DEFAULT_BRAND = {
  primary:    '#FF9900',
  ink:        '#0A0E1A',
  accent:     '#22D3EE',
  text:       '#F8FAFC',
  textMuted:  '#94A3B8',
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

const addDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtCurrency = (n, currency = 'USD') => {
  if (n == null || Number.isNaN(+n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(+n);
  } catch {
    return `$${(+n).toLocaleString()}`;
  }
};

// -------------------------------------------------------------
// Phase split — picks a 3-phase plan from a total day count
// -------------------------------------------------------------

function planPhases(days) {
  const d = Math.max(7, Math.min(180, +days || 21));
  const p1End = Math.round(d * 0.33);
  const p2End = Math.round(d * 0.66);
  const p3End = d;
  return [
    {
      title: 'Phase 1 — Discovery & foundation',
      range: `Days 1–${p1End}`,
      pct: Math.round((p1End / d) * 100),
      deliverables: [
        'Kickoff call + requirements lock',
        'Reference architecture sign-off',
        'AWS account / landing zone prepared',
        'Network + IAM baseline shipped',
      ],
    },
    {
      title: 'Phase 2 — Build & integrate',
      range: `Days ${p1End + 1}–${p2End}`,
      pct: Math.round(((p2End - p1End) / d) * 100),
      deliverables: [
        'Core workloads deployed in dev account',
        'CI/CD pipeline wired to your GitHub',
        'Observability + alarms configured',
        'Mid-project demo + checkpoint',
      ],
    },
    {
      title: 'Phase 3 — Test, harden & handover',
      range: `Days ${p2End + 1}–${p3End}`,
      pct: 100 - Math.round((p2End / d) * 100),
      deliverables: [
        'Production cutover + smoke tests',
        'Cost + security validation reports',
        'Runbooks + training session',
        'Project handover + retrospective',
      ],
    },
  ];
}

// -------------------------------------------------------------
// Slide builders
// -------------------------------------------------------------

function slideTitle(brief) {
  return {
    id: uid(),
    kind: 'title',
    title: brief.projectTitle || `${brief.clientCompany || 'Client'} — AWS Engagement`,
    body: brief.tagline || 'AWS Cloud Engineer | Network Specialist',
    bullets: [
      brief.authorName,
      brief.clientCompany,
      fmtDate(new Date()),
    ].filter(Boolean),
    extras: {
      authorName: brief.authorName,
      certs: brief.certs || [],
      clientCompany: brief.clientCompany,
    },
    notes: `Open with confidence. Greet ${brief.clientContact || 'them'}, thank them for the brief, and set the agenda: problem → solution → architecture → plan → investment → next steps.`,
  };
}

function slideUnderstanding(brief) {
  const pains = brief.painPoints?.length ? brief.painPoints : [
    'Current setup is hard to scale beyond peak loads.',
    'Manual deployments slow down each release.',
    'Limited visibility into costs and performance.',
    'No clear DR posture if a region goes down.',
  ];
  return {
    id: uid(),
    kind: 'understanding',
    title: 'Understanding your challenge',
    body: brief.problem ||
      `${brief.clientCompany || 'Your team'} needs a cloud foundation that scales with the business and stops eating engineering hours every week.`,
    bullets: pains,
    extras: {
      impact: brief.businessImpact ||
        'Without a fix: rising AWS bills, slower releases, and avoidable downtime — directly impacting customer trust and revenue.',
    },
    notes: 'Mirror the problem in their words. Show you listened. Don\'t pitch the solution yet — earn the right to.',
  };
}

function slideSolution(brief) {
  const benefits = brief.benefits?.length ? brief.benefits : [
    'Lower monthly AWS spend',
    'Ship 3× faster with automated pipelines',
    'Sleep through outages — automated failover',
    'Security-by-default — encryption + audit logs',
  ];
  return {
    id: uid(),
    kind: 'solution',
    title: 'Proposed solution',
    body: brief.solution ||
      'A managed AWS foundation, built around the Well-Architected Framework, that puts you back in control of your cloud — without adding ops overhead.',
    bullets: benefits,
    extras: {
      whyAWS: brief.whyAWS ||
        'AWS gives you the broadest service catalogue, the strongest security posture, and the global footprint you need to grow into new markets without rebuilding.',
    },
    notes: 'Speak in benefits, not features. Avoid jargon. Tie every benefit back to a business outcome they care about.',
  };
}

function slideArchitecture(brief, diagram) {
  return {
    id: uid(),
    kind: 'architecture',
    title: 'Reference architecture',
    body: 'Built on AWS-native services. Every component justified, every flow labelled.',
    bullets: (brief.services?.length ? brief.services : ['ALB', 'EC2', 'RDS Multi-AZ', 'CloudFront', 'WAF', 'CloudWatch'])
      .map((s) => `${s} — production hardened`),
    extras: {
      diagram,                              // { nodes, edges } if pulled from Architecture Studio
      waBadge: 'AWS Well-Architected Framework',
    },
    notes: 'Walk left to right: where traffic enters, how it scales, where data lives, how it\'s observed and secured.',
  };
}

function slideWhy(brief) {
  return {
    id: uid(),
    kind: 'why',
    title: 'Why this approach',
    body: 'Five reasons this design pays for itself within the first quarter.',
    bullets: [
      `💰 ${brief.costSavings || 'Up to 30–40% lower monthly AWS spend vs your current footprint.'}`,
      `📈 Scalability — handles ${brief.scaleTarget || '10× current traffic'} without re-architecture.`,
      `🛡 Reliability — 99.9% target uptime with multi-AZ + automated failover.`,
      `🔐 Security — least-privilege IAM, KMS encryption, CloudTrail audit on day one.`,
      `⚡ Performance — sub-100ms p95 at the edge via CloudFront.`,
    ],
    notes: 'Each bullet should map to a metric the client tracks. If you can quote their numbers back to them, do it.',
  };
}

function slidePlan(brief) {
  const phases = planPhases(brief.timelineDays);
  return {
    id: uid(),
    kind: 'plan',
    title: 'Implementation plan',
    body: `Three phases, ${brief.timelineDays || 21} days end-to-end.`,
    bullets: phases.map((p) => `${p.title} (${p.range})`),
    extras: { phases, totalDays: brief.timelineDays || 21 },
    notes: 'Emphasise checkpoints. Clients buy when they see early wins; phase 1 should ship something visible inside week one.',
  };
}

function slideTesting() {
  return {
    id: uid(),
    kind: 'testing',
    title: 'Testing first — zero risk to you',
    body: 'I build and validate every change in my own AWS account before it touches yours.',
    bullets: [
      '✅ Architecture validated against Well-Architected Framework',
      '✅ Security checks: IAM, KMS, WAF, GuardDuty baseline',
      '✅ Load + latency tested against your traffic profile',
      '✅ Cost confirmed before deploying to your account',
      '✅ Reversible — every step has an undo runbook',
    ],
    extras: {
      banner: 'Zero risk to your infrastructure.',
    },
    notes: 'This slide neutralises the biggest objection: "what if you break something?" — answer it before they ask.',
  };
}

function slideInvestment(brief) {
  const phases = planPhases(brief.timelineDays);
  const total = +brief.budget || 0;
  const deposit = Math.round(total * 0.5);
  const final = total - deposit;
  return {
    id: uid(),
    kind: 'investment',
    title: 'Investment',
    body: brief.budgetKind === 'hourly'
      ? `${fmtCurrency(brief.hourlyRate, brief.currency || 'USD')} / hour · estimated ${brief.estimatedHours || 40} hours`
      : `${fmtCurrency(total, brief.currency || 'USD')} fixed`,
    bullets: phases.map((p, i) => `${p.title.split(' — ')[1] || `Phase ${i + 1}`} — ${p.range}`),
    extras: {
      total,
      currency: brief.currency || 'USD',
      schedule: brief.budgetKind === 'hourly' ? null : [
        { label: '50% deposit to begin', amount: deposit },
        { label: '50% on successful delivery', amount: final },
      ],
      included: brief.included?.length ? brief.included : [
        'Architecture + IaC code',
        'CI/CD pipeline',
        'Cloud + security baseline',
        'Documentation + runbooks',
        '2 revision rounds',
        '14 days of post-delivery support',
      ],
      excluded: brief.excluded?.length ? brief.excluded : [
        'Client AWS account costs',
        'Third-party licences (Datadog, etc.)',
        'Net-new feature development beyond scope',
      ],
    },
    notes: 'Price with confidence. Don\'t apologise. If they push back, anchor on outcome, not hours.',
  };
}

function slideAbout(brief) {
  return {
    id: uid(),
    kind: 'about',
    title: 'About me',
    body: brief.authorBio ||
      `${brief.authorName || 'Cloud engineer'} — AWS-certified specialist focused on production-grade architectures for growing companies.`,
    bullets: brief.portfolio?.length ? brief.portfolio.slice(0, 3) : [
      '3-tier web app migration — cut hosting cost by 42%',
      'Serverless REST API — handled 5× traffic spike on launch day',
      'Multi-account landing zone — 6 teams onboarded in 3 weeks',
    ],
    extras: {
      certs: brief.certs || [],
      photo: brief.authorPhoto || null,
      links: {
        github:   brief.github   || '',
        linkedin: brief.linkedin || '',
        website:  brief.website  || '',
      },
      availability: brief.availability || 'Available to start within 7 days',
    },
    notes: 'Brief. Confident. Lead with the certs and the closest case study to their problem.',
  };
}

function slideNextSteps(brief) {
  const days = +brief.timelineDays || 21;
  const eta = fmtDate(addDays(new Date(), days + 5)); // build in a small buffer
  return {
    id: uid(),
    kind: 'next',
    title: 'Next steps',
    body: 'Three signatures and we begin.',
    bullets: [
      '① Review and sign the engagement agreement',
      '② Pay 50% deposit to kick things off',
      '③ Book the kickoff call — calendar link in the email',
      '④ Build begins within 48 hours',
    ],
    extras: {
      eta,
      ctaLabel: 'Book discovery call',
      ctaHref:  brief.bookingLink || 'mailto:' + (brief.authorEmail || 'you@example.com'),
    },
    notes: 'End with a single ask. Don\'t list options — list the one next action you want them to take today.',
  };
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------

/**
 * Build a 10-slide deck from a brief + optional architecture diagram.
 * brief = {
 *   authorName, authorBio, authorPhoto, authorEmail, certs,
 *   github, linkedin, website, tagline, availability,
 *   clientCompany, clientContact, projectTitle,
 *   problem, painPoints, businessImpact,
 *   solution, benefits, whyAWS, services,
 *   costSavings, scaleTarget,
 *   timelineDays,
 *   budgetKind: 'fixed' | 'hourly',
 *   budget, hourlyRate, estimatedHours, currency,
 *   included, excluded, portfolio, bookingLink,
 * }
 */
export function buildDeck(brief, diagram) {
  const slides = [
    slideTitle(brief),
    slideUnderstanding(brief),
    slideSolution(brief),
    slideArchitecture(brief, diagram),
    slideWhy(brief),
    slidePlan(brief),
    slideTesting(),
    slideInvestment(brief),
    slideAbout(brief),
    slideNextSteps(brief),
  ];
  return {
    id: uid(),
    name: brief.projectTitle
      ? `${brief.clientCompany || 'Client'} — ${brief.projectTitle}`
      : 'Untitled proposal deck',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brand: { ...DEFAULT_BRAND },
    brief,
    slides,
  };
}

/** Re-render a single slide using the latest brief. */
export function regenerateSlide(slide, brief, diagram) {
  const re = {
    title:         slideTitle,
    understanding: slideUnderstanding,
    solution:      slideSolution,
    architecture:  (b) => slideArchitecture(b, diagram),
    why:           slideWhy,
    plan:          slidePlan,
    testing:       slideTesting,
    investment:    slideInvestment,
    about:         slideAbout,
    next:          slideNextSteps,
  };
  const fn = re[slide.kind];
  if (!fn) return slide;
  const fresh = fn(brief);
  // Preserve user edits to notes
  return { ...fresh, id: slide.id, notes: slide.notes || fresh.notes };
}

/**
 * Try to seed a brief from a Job Analyzer result (see jobAnalyzer.js).
 */
export function briefFromAnalysis(analysis, defaults = {}) {
  if (!analysis) return { ...defaults };
  const days =
    analysis.timeline?.kind === 'range' && analysis.timeline.unit?.startsWith('day')
      ? Math.round((analysis.timeline.min + analysis.timeline.max) / 2)
      : analysis.timeline?.kind === 'range' && analysis.timeline.unit?.startsWith('week')
      ? Math.round((analysis.timeline.min + analysis.timeline.max) / 2) * 7
      : analysis.timeline?.kind === 'range' && analysis.timeline.unit?.startsWith('month')
      ? Math.round((analysis.timeline.min + analysis.timeline.max) / 2) * 30
      : 21;

  const budgetKind = analysis.budget?.kind === 'hourly' ? 'hourly' : 'fixed';
  const budget =
    analysis.budget?.kind === 'fixed' ? analysis.budget.amount
    : analysis.budget?.kind === 'hourly' ? (analysis.budget.max || analysis.budget.min || 0) * 40
    : 0;

  return {
    ...defaults,
    projectTitle: analysis.type,
    problem: undefined,
    painPoints: [],
    benefits: [],
    services: (analysis.services || []).map((s) => s.toUpperCase()),
    timelineDays: days,
    budgetKind,
    budget,
    hourlyRate: analysis.budget?.kind === 'hourly' ? (analysis.budget.max || analysis.budget.min) : undefined,
    estimatedHours: analysis.budget?.kind === 'hourly' ? 40 : undefined,
  };
}

export const SLIDE_KINDS = [
  { id: 'title',         label: 'Title' },
  { id: 'understanding', label: 'Understanding' },
  { id: 'solution',      label: 'Solution' },
  { id: 'architecture',  label: 'Architecture' },
  { id: 'why',           label: 'Why this approach' },
  { id: 'plan',          label: 'Plan' },
  { id: 'testing',       label: 'Testing & zero risk' },
  { id: 'investment',    label: 'Investment' },
  { id: 'about',         label: 'About me' },
  { id: 'next',          label: 'Next steps' },
];
