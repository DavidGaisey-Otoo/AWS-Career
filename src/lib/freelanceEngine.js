/**
 * Freelance "AI" engine — rule-based intelligence for proposal
 * generation, JD analysis, LinkedIn scoring, pricing advice, and
 * personal-website copy generation.
 *
 * Everything is deterministic + template-driven. No external API.
 */

import { PROPOSAL_TEMPLATES, GENERIC_HOOKS, templateById } from '../data/proposalTemplates.js';
import { RATE_BANDS } from '../data/marketIntel.js';
import { HEADLINE_OPTIONS, WEBSITE_BLOCKS } from '../data/linkedinPosts.js';

// ---------- common ----------

const titleCase = (s) => (s || '').replace(/\b\w/g, (c) => c.toUpperCase());

// Pick the template that best matches a JD by skill overlap.
function pickTemplateForJD(jd) {
  const text = (jd || '').toLowerCase();
  let best = null;
  let bestScore = -1;
  for (const t of PROPOSAL_TEMPLATES) {
    let score = 0;
    for (const s of t.services || []) if (text.includes(s.toLowerCase())) score += 2;
    if (text.includes(t.type.toLowerCase().split(' ')[0])) score += 1;
    if (text.includes('migrat'))   score += t.id === 'migration' ? 3 : 0;
    if (text.includes('vpc'))      score += t.id === 'network' ? 3 : 0;
    if (text.includes('serverless') || text.includes('lambda'))
      score += t.id === 'serverless' ? 3 : 0;
    if (text.includes('cost') || text.includes('optimi'))
      score += t.id === 'cost-opt' ? 3 : 0;
    if (text.includes('cicd') || text.includes('pipeline') || text.includes('codepipeline'))
      score += t.id === 'cicd' ? 3 : 0;
    if (text.includes('security') || text.includes('audit') || text.includes('iam'))
      score += t.id === 'security-audit' ? 3 : 0;
    if (text.includes('dr ') || text.includes('disaster recovery'))
      score += t.id === 'dr' ? 3 : 0;
    if (text.includes('eks') || text.includes('kubernetes') || text.includes('container'))
      score += t.id === 'container-platform' ? 3 : 0;
    if (text.includes('rds') || text.includes('database') || text.includes('mysql') || text.includes('postgres'))
      score += t.id === 'db-migration' ? 2 : 0;
    if (text.includes('cloudwatch') || text.includes('observability') || text.includes('monitor'))
      score += t.id === 'monitoring' ? 3 : 0;
    if (text.includes('static') || text.includes('cloudfront'))
      score += t.id === 'cdn-static' ? 2 : 0;
    if (score > bestScore) { bestScore = score; best = t; }
  }
  return best || PROPOSAL_TEMPLATES[0];
}

// Heuristically extract keys from a JD
export function analyzeJobDescription(jd) {
  const text = (jd || '').trim();
  if (!text) return null;
  const lower = text.toLowerCase();

  // Project title — first sentence under 80 chars
  let projectTitle = text.split(/\.|\n/)[0].trim();
  if (projectTitle.length > 80) projectTitle = projectTitle.slice(0, 80) + '…';

  // Budget hints
  const budgetMatch = text.match(/(\$|usd|£|gbp|€|eur)\s?([\d,]+)(?:\s?-\s?(\$|usd|£|gbp|€|eur)?\s?([\d,]+))?/i);
  let budget = null;
  if (budgetMatch) {
    const lo = parseInt(budgetMatch[2].replace(/,/g, ''), 10);
    const hi = budgetMatch[4] ? parseInt(budgetMatch[4].replace(/,/g, ''), 10) : null;
    const cur = /£|gbp/i.test(budgetMatch[1] || '') ? 'GBP'
              : /€|eur/i.test(budgetMatch[1] || '') ? 'EUR' : 'USD';
    budget = { low: lo, high: hi, currency: cur };
  }

  // Hourly vs fixed
  const isHourly = /hour|per\s+hour|hr/i.test(text);

  // Pain points — first sentence with "need", "want", "having issues", "problem"
  const sentences = text.split(/[.!?]\s+/).filter(Boolean);
  const painSentence = sentences.find((s) =>
    /\b(need|want|looking for|require|having (issues|trouble)|problem|struggle)\b/i.test(s));
  const painPoint = painSentence ? painSentence.trim().slice(0, 180) : projectTitle;

  // Services mentioned
  const SERVICES = ['ec2','s3','vpc','lambda','dynamodb','rds','aurora','iam','cloudfront',
    'tgw','transit gateway','direct connect','vpn','ecs','eks','fargate','codepipeline',
    'codebuild','codedeploy','cloudwatch','xray','glue','athena','redshift','bedrock',
    'route 53','route53','sagemaker','kinesis','cloudformation','cdk','terraform'];
  const found = SERVICES.filter((s) => lower.includes(s));

  // Senior/junior hint
  const level = /senior|principal|lead/i.test(text) ? 'Senior'
              : /junior|entry|beginner/i.test(text) ? 'Junior'
              : 'Mid';

  // Estimated client name from first capitalised phrase
  const clientNameMatch = text.match(/(?:from|at|for)\s+([A-Z][A-Za-z &]{2,40})/);
  const clientName = clientNameMatch ? clientNameMatch[1].trim() : null;

  // Recommended template
  const template = pickTemplateForJD(jd);

  return {
    projectTitle: titleCase(projectTitle),
    painPoint,
    budget,
    isHourly,
    services: [...new Set(found)].slice(0, 6),
    level,
    clientName,
    recommendedTemplateId: template.id,
  };
}

// Fill placeholders.
function fill(str, vars) {
  if (!str) return '';
  return str.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : `{${k}}`);
}

// Generate a complete proposal body
export function generateProposal({ jd, profile, templateId, jobAnalysis }) {
  const analysis = jobAnalysis || analyzeJobDescription(jd) || {};
  const template = templateById(templateId) || pickTemplateForJD(jd);

  const firstName = (profile?.name || 'David').split(' ')[0];
  const turnaround = 'this week';
  const vars = {
    client_name: analysis.clientName || 'there',
    project_title: analysis.projectTitle || 'this project',
    pain_point: analysis.painPoint || 'the challenges you mentioned',
    primary_service: analysis.services?.[0] || 'AWS',
    your_first_name: firstName,
    years_experience: '3+',
    top_cert: 'AWS Solutions Architect Associate',
    turnaround,
    budget: analysis.budget ? `${analysis.budget.currency} ${analysis.budget.low.toLocaleString()}` : 'your budget',
    currency: analysis.budget?.currency || 'USD',
    nearest_portfolio: 'a recent multi-AZ VPC build for a fintech',
    timezone_overlap: 'GMT',
  };

  const hook = fill(template.hook || GENERIC_HOOKS[0], vars);
  const experience = fill(template.experience, vars);
  const approach = (template.approach || []).map((step) => fill(step, vars));
  const fit = fill(template.fit, vars);
  const cta = fill(template.cta, vars);

  const sections = [
    { id: 'hook',       label: 'Opening hook',     body: hook },
    { id: 'experience', label: 'Relevant experience', body: experience },
    { id: 'approach',   label: 'Approach',         body: approach.map((s, i) => `${i + 1}. ${s}`).join('\n') },
    { id: 'fit',        label: 'Why I\'m the right fit', body: fit },
    { id: 'cta',        label: 'Call to action',   body: cta },
  ];

  const fullText = [
    sections[0].body,
    '',
    '**Relevant experience**',
    sections[1].body,
    '',
    '**My approach**',
    sections[2].body,
    '',
    '**Why I\'m the right fit**',
    sections[3].body,
    '',
    sections[4].body,
    '',
    `— ${firstName}`,
  ].join('\n');

  return { template, analysis, sections, fullText };
}

// ============================ LinkedIn ============================

// Score a pasted LinkedIn profile out of 100 with section feedback.
export function scoreLinkedIn(text) {
  const t = (text || '').toLowerCase();
  if (!text || text.length < 60) {
    return { score: 0, breakdown: [], suggestions: ['Paste your LinkedIn profile — at minimum your headline + About section.'] };
  }

  const checks = [
    { id: 'aws',           label: 'AWS mentioned in profile',     points: 8,  hit: /aws/.test(t) },
    { id: 'cert',          label: 'AWS cert mentioned',           points: 8,  hit: /(certified|cloud practitioner|solutions architect|developer associate|sysops|specialty)/.test(t) },
    { id: 'specialty',     label: 'Clear specialty (1-2 areas)',  points: 7,  hit: /(network|serverless|migration|security|devops|cost|data|machine learning|ml|architecture)/.test(t) },
    { id: 'outcomes',      label: 'Concrete outcomes (numbers)',  points: 10, hit: /(\d+\s*(%|months|years|x|tb|gb)|\$\s?\d+|reduced|cut|saved|improved|launched|migrated)/i.test(text) },
    { id: 'cta',           label: 'Clear call to action',         points: 6,  hit: /(open to|available|dm|message|email|book|contact|let's|hire)/i.test(text) },
    { id: 'industries',    label: 'Industries served',            points: 5,  hit: /(saas|fintech|healthtech|ecommerce|media|edtech|startup|enterprise|gov|ngo)/.test(t) },
    { id: 'work-history',  label: 'Relevant work history',        points: 8,  hit: /(experience|past role|years|engineer|developer|architect|consultant|freelance)/i.test(text) },
    { id: 'tech-stack',    label: 'Tech stack listed',            points: 6,  hit: /(terraform|cdk|python|node|cloudformation|kubernetes|docker)/.test(t) },
    { id: 'differentiator',label: 'A real differentiator',        points: 8,  hit: /(unique|specialise|specialize|expert|deep|niche|years of|brought up|background in)/.test(t) },
    { id: 'length',        label: 'Substantive length (>800 chars)', points: 6, hit: text.length >= 800 },
    { id: 'tone',          label: 'Confident but not arrogant',   points: 5,  hit: !/(rockstar|ninja|guru|wizard)/i.test(text) },
    { id: 'social-proof',  label: 'Social proof / testimonials',  points: 6,  hit: /(client|testimonial|review|"|quoted)/.test(t) },
    { id: 'first-person',  label: 'Written in first person',      points: 5,  hit: /\bi\s+(am|build|help|design|lead|love|work|deliver|specialise|specialize)/i.test(text) },
    { id: 'links',         label: 'GitHub or portfolio link',     points: 6,  hit: /(github\.com|portfolio|behance|website|case study)/.test(t) },
    { id: 'recent',        label: 'Recent/current activity',      points: 6,  hit: /(202[3-9]|currently|recently|now)/.test(t) },
  ];

  const breakdown = checks.map((c) => ({
    id: c.id, label: c.label, max: c.points, awarded: c.hit ? c.points : 0,
  }));
  const score = breakdown.reduce((s, b) => s + b.awarded, 0);

  // Section-by-section suggestions
  const suggestions = [];
  for (const c of checks) {
    if (c.hit) continue;
    if (c.id === 'outcomes') suggestions.push('Add at least 2 measurable outcomes — "$14k/mo to $8k", "300ms → 80ms p95", "9-week migration with zero downtime". Numbers move readers.');
    if (c.id === 'cta')      suggestions.push('Add a single line CTA at the end of your About — "Open to freelance projects — DM me" works.');
    if (c.id === 'cert')     suggestions.push('Mention your AWS certification(s) by name in either your headline or first 200 chars of About.');
    if (c.id === 'specialty')suggestions.push('Pick one specialty (e.g. networking, serverless, cost) and lead with it. Generalists don\'t stand out.');
    if (c.id === 'industries') suggestions.push('Name 2-3 industries you\'ve worked in. Hiring managers filter by relevance.');
    if (c.id === 'tech-stack') suggestions.push('List your tech stack — Terraform/CDK/Python/etc. Recruiters search by tool.');
    if (c.id === 'differentiator') suggestions.push('Add one sentence about what makes you DIFFERENT (e.g. "former enterprise network engineer turned cloud freelancer").');
    if (c.id === 'length')   suggestions.push('Your About is under 800 chars. Aim for 1000-1500. You have more to say than this.');
    if (c.id === 'tone')     suggestions.push('Avoid filler words ("rockstar"/"ninja"). Replace with concrete capabilities.');
    if (c.id === 'social-proof') suggestions.push('Add a one-line client quote (with permission) — testimonials lift conversion.');
    if (c.id === 'first-person') suggestions.push('Write in first person ("I help…") not third ("Detail-oriented engineer…"). It humanises you.');
    if (c.id === 'links')    suggestions.push('Add a GitHub or portfolio link in your About. People click them.');
    if (c.id === 'recent')   suggestions.push('Reference recent work ("In 2026 I…"). It signals you\'re active.');
  }

  return { score, breakdown, suggestions: suggestions.slice(0, 6) };
}

export function headlineOptions(firstName = 'David') {
  return HEADLINE_OPTIONS(firstName);
}

// ============================ Website copy ============================

export function generateWebsiteCopy({ audience = 'B2B SaaS teams', yourName = 'David', yearsNetworking = 5, location = 'Accra, Ghana' }) {
  return {
    hero: WEBSITE_BLOCKS.hero[0].replaceAll('{audience}', audience),
    heroAlt: WEBSITE_BLOCKS.hero[1].replaceAll('{audience}', audience),
    about: WEBSITE_BLOCKS.about[0]
      .replaceAll('{your_name}', yourName)
      .replaceAll('{audience}', audience)
      .replaceAll('{years_networking}', String(yearsNetworking))
      .replaceAll('{location}', location),
    services: WEBSITE_BLOCKS.services,
    seo: `${yourName} — AWS Cloud Engineer for ${audience}. Architecture, migrations, networking, cost optimization.`,
  };
}

// ============================ Pricing advice ============================

export function pricingAdvice({ scopeText, level = 'Mid', hourly = true, country = 'United States' }) {
  const band = RATE_BANDS.find((b) => b.level === level) || RATE_BANDS[1];
  const t = (scopeText || '').toLowerCase();
  const complex = /(multi[-\s]?region|hipaa|pci|compliance|hybrid|migration|enterprise)/.test(t);
  const cheapBias = /(NGO|charity|non[-\s]?profit|student|side project)/i.test(scopeText || '');

  let mid = band.mid;
  if (complex) mid = Math.round(mid * 1.15);
  if (cheapBias) mid = Math.round(mid * 0.85);

  // Country adjustment using the simple payIndex from marketIntel
  const COUNTRY_INDEX = {
    'United States': 1.0, 'United Kingdom': 0.85, 'Germany': 0.78,
    'Canada': 0.82, 'Australia': 0.80, 'Netherlands': 0.78,
    'Singapore': 0.80, 'United Arab Emirates': 0.72, 'Africa (Pan)': 0.45,
    'Other': 0.60,
  };
  const idx = COUNTRY_INDEX[country] ?? 0.8;
  mid = Math.round(mid * idx);

  const low = Math.round(mid * 0.85);
  const high = Math.round(mid * 1.2);

  // Fixed-price estimate: scale to ~5 days of work at mid rate.
  const fixedLow = mid * 8 * 4;
  const fixedHigh = mid * 8 * 8;

  return {
    level, country,
    hourlyUSD: { low, mid, high },
    fixedUSD: { low: fixedLow, high: fixedHigh },
    notes: [
      complex ? 'Premium applied: scope mentions compliance/multi-region — charge for the risk.' : null,
      cheapBias ? 'Slight discount applied: nonprofit-sounding scope.' : null,
      idx < 1 ? `Country adjustment applied: ${country} pays ~${Math.round(idx * 100)}% of US benchmark.` : null,
      hourly ? 'Default to weekly invoicing on hourly engagements; cap at 40h/week.' : 'Insist on 50% upfront for fixed-price work.',
      'Quote one rate. Negotiating yourself DOWN before they ask is a tell of inexperience.',
    ].filter(Boolean),
  };
}
