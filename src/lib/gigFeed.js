/**
 * gigFeed.js — FR-01 Live Gig Feed sourcing.
 *
 * Source reality (verified live 2026-07-25):
 *   - RemoteOK, Remotive, Jobicy, Arbeitnow: public JSON APIs with
 *     `Access-Control-Allow-Origin: *` — fetched directly from the browser.
 *   - Himalayas: public JSON API but NO CORS header → proxy chain.
 *   - We Work Remotely: RSS, no CORS → proxy chain.
 *   - Upwork: killed public RSS in 2024 (HTTP 410 Gone) — removed.
 *
 * Proxy chain: each proxied source tries every proxy in order until one
 * works. A custom proxy (e.g. the user's own Cloudflare Worker) can be
 * set in localStorage under `awscl-pro::v1::gigfeed::proxy` and is tried
 * first.
 *
 * Returns a normalised list of GigItem:
 *   {
 *     id, title, url, source, postedAt, budget, rate, skills[],
 *     description, location, raw
 *   }
 *
 * Cached in localStorage for 30 minutes so refreshes don't hammer APIs.
 */

const CACHE_KEY = 'awscl-pro::v1::gig-feed';
const CUSTOM_PROXY_KEY = 'awscl-pro::v1::gigfeed::proxy';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Public CORS proxies — best-effort fallback chain for non-CORS sources.
// Each entry turns a target URL into a proxied URL.
const PUBLIC_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

export function getCustomProxy() {
  try { return localStorage.getItem(CUSTOM_PROXY_KEY) || null; } catch { return null; }
}

export function setCustomProxy(prefix) {
  try {
    if (prefix) localStorage.setItem(CUSTOM_PROXY_KEY, prefix);
    else localStorage.removeItem(CUSTOM_PROXY_KEY);
  } catch { /* quota */ }
}

function proxyChain() {
  const chain = [...PUBLIC_PROXIES];
  const custom = getCustomProxy();
  if (custom) {
    // Custom proxy is "prefix + encoded url", tried first
    chain.unshift((url) => `${custom}${encodeURIComponent(url)}`);
  }
  return chain;
}

// ════════════════════════════════════════════════════════════════════
// Source definitions
// ════════════════════════════════════════════════════════════════════
const SOURCES = [
  {
    id: 'remoteok',
    label: 'RemoteOK',
    url: 'https://remoteok.com/api?tags=aws',
    type: 'json',
    needsProxy: false,
    parse: parseRemoteOK,
  },
  {
    id: 'remotive',
    label: 'Remotive',
    url: 'https://remotive.com/api/remote-jobs?search=aws&limit=50',
    type: 'json',
    needsProxy: false,
    parse: parseRemotive,
  },
  {
    id: 'jobicy',
    label: 'Jobicy',
    url: 'https://jobicy.com/api/v2/remote-jobs?count=50&tag=aws',
    type: 'json',
    needsProxy: false,
    parse: parseJobicy,
  },
  {
    id: 'arbeitnow',
    label: 'Arbeitnow',
    url: 'https://arbeitnow.com/api/job-board-api',
    type: 'json',
    needsProxy: false,
    parse: parseArbeitnow,
  },
  {
    id: 'himalayas',
    label: 'Himalayas',
    url: 'https://himalayas.app/jobs/api?limit=50',
    type: 'json',
    needsProxy: true,
    parse: parseHimalayas,
  },
  {
    id: 'weworkremotely',
    label: 'We Work Remotely',
    url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    type: 'rss',
    needsProxy: true,
    parse: parseWeWorkRemotely,
  },
];

// ════════════════════════════════════════════════════════════════════
// Cache helpers
// ════════════════════════════════════════════════════════════════════
function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p || typeof p !== 'object' || !p.ts) return null;
    if (Date.now() - p.ts > CACHE_TTL_MS) return null;
    return p;
  } catch { return null; }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(),
      ...payload,
    }));
  } catch { /* quota */ }
}

export function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* */ }
}

export function getCacheAge() {
  const c = readCache();
  if (!c) return null;
  return Date.now() - c.ts;
}

// ════════════════════════════════════════════════════════════════════
// Main fetch
// ════════════════════════════════════════════════════════════════════

/**
 * Fetch all sources in parallel. Returns:
 *   {
 *     gigs: GigItem[],
 *     sources: { [id]: { ok: bool, count: number, error?: string } },
 *     fetchedAt: ISO,
 *     fromCache: bool
 *   }
 */
export async function fetchAllGigs({ force = false } = {}) {
  if (!force) {
    const cached = readCache();
    if (cached) {
      return { ...cached, fromCache: true };
    }
  }

  const sourceResults = {};
  const allGigs = [];

  await Promise.all(SOURCES.map(async (src) => {
    try {
      const urls = src.needsProxy
        ? proxyChain().map((wrap) => wrap(src.url))
        : [src.url];

      let lastErr = null;
      let parsed = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { method: 'GET' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          if (src.type === 'json') {
            parsed = src.parse(await res.json());
          } else {
            parsed = src.parse(await res.text());
          }
          break;   // this proxy (or direct URL) worked — stop trying
        } catch (err) {
          lastErr = err;
        }
      }
      if (parsed === null) throw lastErr || new Error('all proxies failed');

      sourceResults[src.id] = { ok: true, count: parsed.length };
      allGigs.push(...parsed);
    } catch (err) {
      console.warn(`[gigFeed] ${src.id} failed:`, err.message);
      sourceResults[src.id] = { ok: false, count: 0, error: err.message };
    }
  }));

  // De-duplicate cross-source reposts (same title + company from 2 boards)
  const seen = new Set();
  const deduped = allGigs.filter((g) => {
    const sig = `${(g.title || '').toLowerCase().trim()}::${(g.company || '').toLowerCase().trim()}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
  allGigs.length = 0;
  allGigs.push(...deduped);

  // Sort newest first
  allGigs.sort((a, b) => {
    const ta = a.postedAt ? new Date(a.postedAt).getTime() : 0;
    const tb = b.postedAt ? new Date(b.postedAt).getTime() : 0;
    return tb - ta;
  });

  const payload = {
    gigs: allGigs,
    sources: sourceResults,
    fetchedAt: new Date().toISOString(),
    fromCache: false,
  };
  writeCache(payload);
  return payload;
}

// ════════════════════════════════════════════════════════════════════
// Source parsers
// ════════════════════════════════════════════════════════════════════

/**
 * RemoteOK API returns an array. Index 0 is "legal" metadata; skip it.
 * Each job: { id, slug, position, company, tags[], description, url, date, ... }
 */
function parseRemoteOK(json) {
  if (!Array.isArray(json)) return [];
  return json.slice(1)
    .filter((j) => j && j.position)
    .map((j) => ({
      id: `remoteok-${j.id}`,
      title: j.position,
      company: j.company,
      url: j.url || j.apply_url || `https://remoteok.com/remote-jobs/${j.slug || j.id}`,
      source: 'remoteok',
      sourceLabel: 'RemoteOK',
      postedAt: j.date || j.epoch ? new Date((j.epoch || 0) * 1000).toISOString() : null,
      budget: formatRemoteOKSalary(j),
      rate: null,
      skills: Array.isArray(j.tags) ? j.tags.slice(0, 10) : [],
      description: (j.description || '').replace(/<[^>]+>/g, '').slice(0, 300),
      location: j.location || (j.region === 'remote' ? 'Remote' : null),
      raw: j,
    }))
    .filter((g) => looksAwsRelated(g));
}

function formatRemoteOKSalary(j) {
  if (j.salary_min && j.salary_max) {
    return `$${(j.salary_min / 1000).toFixed(0)}k-$${(j.salary_max / 1000).toFixed(0)}k/yr`;
  }
  if (j.salary_min) return `$${(j.salary_min / 1000).toFixed(0)}k+/yr`;
  return null;
}

/**
 * RSS XML parser — simple regex-based (avoids adding xml2js dependency).
 * Looks for <item>…</item> blocks and extracts title/link/description/pubDate.
 */
function parseRss(xml, source, sourceLabel) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of itemMatches) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    if (!title) continue;

    items.push({
      id: `${source}-${hashCode(link || title)}`,
      title: stripHtml(title),
      company: null,
      url: link || '',
      source,
      sourceLabel,
      postedAt: pubDate ? new Date(pubDate).toISOString() : null,
      budget: extractBudgetFromText(desc + ' ' + title),
      rate: null,
      skills: extractSkillsFromText(desc + ' ' + title),
      description: stripHtml(desc || '').slice(0, 300),
      location: null,
      raw: { title, link, desc, pubDate },
    });
  }
  return items.filter(looksAwsRelated);
}

function parseWeWorkRemotely(xml) {
  return parseRss(xml, 'weworkremotely', 'We Work Remotely');
}

/**
 * Remotive: { jobs: [{ id, url, title, company_name, category, tags[],
 *   job_type, publication_date, candidate_required_location, salary,
 *   description }] } — CORS: *, verified 2026-07-25.
 */
function parseRemotive(json) {
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j) => ({
    id: `remotive-${j.id}`,
    title: j.title,
    company: j.company_name || null,
    url: j.url,
    source: 'remotive',
    sourceLabel: 'Remotive',
    postedAt: j.publication_date ? new Date(j.publication_date).toISOString() : null,
    budget: j.salary || extractBudgetFromText(j.description),
    rate: null,
    skills: Array.isArray(j.tags) ? j.tags.slice(0, 10) : [],
    description: stripHtml(j.description || '').slice(0, 300),
    location: j.candidate_required_location || null,
    raw: { id: j.id, category: j.category, job_type: j.job_type },
  })).filter(looksAwsRelated);
}

/**
 * Jobicy: { jobs: [{ id, url, jobTitle, companyName, jobIndustry,
 *   jobType, jobGeo, jobLevel, jobExcerpt, pubDate (ISO),
 *   salaryMin, salaryMax, salaryCurrency, salaryPeriod }] }
 * CORS: *, verified 2026-07-25.
 */
function parseJobicy(json) {
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j) => ({
    id: `jobicy-${j.id}`,
    title: j.jobTitle,
    company: j.companyName || null,
    url: j.url,
    source: 'jobicy',
    sourceLabel: 'Jobicy',
    postedAt: j.pubDate ? new Date(j.pubDate).toISOString() : null,
    budget: formatSalaryRange(j.salaryMin, j.salaryMax, j.salaryCurrency, j.salaryPeriod),
    rate: null,
    skills: extractSkillsFromText(`${j.jobTitle} ${j.jobExcerpt || ''}`),
    description: stripHtml(j.jobExcerpt || '').slice(0, 300),
    location: j.jobGeo || null,
    raw: { id: j.id, level: j.jobLevel, industry: j.jobIndustry },
  })).filter(looksAwsRelated);
}

/**
 * Arbeitnow: { data: [{ slug, company_name, title, description, url,
 *   tags[], job_types[], location, created_at (epoch seconds) }] }
 * CORS: *, verified 2026-07-25. General board → AWS-filtered client-side.
 */
function parseArbeitnow(json) {
  const jobs = Array.isArray(json?.data) ? json.data : [];
  return jobs.map((j) => ({
    id: `arbeitnow-${j.slug}`,
    title: j.title,
    company: j.company_name || null,
    url: j.url,
    source: 'arbeitnow',
    sourceLabel: 'Arbeitnow',
    postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : null,
    budget: extractBudgetFromText(j.description),
    rate: null,
    skills: extractSkillsFromText(`${j.title} ${(j.tags || []).join(' ')} ${j.description || ''}`),
    description: stripHtml(j.description || '').slice(0, 300),
    location: j.location || (j.remote ? 'Remote' : null),
    raw: { slug: j.slug, tags: j.tags, types: j.job_types },
  })).filter(looksAwsRelated);
}

/**
 * Himalayas: { jobs: [{ guid, title, companyName, applicationLink,
 *   excerpt, description, pubDate (epoch seconds), minSalary, maxSalary,
 *   currency, salaryPeriod, categories[], locationRestrictions[] }] }
 * No CORS header → reached via proxy chain. Verified 2026-07-25.
 */
function parseHimalayas(json) {
  const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
  return jobs.map((j) => ({
    id: `himalayas-${hashCode(j.guid || j.applicationLink || j.title)}`,
    title: j.title,
    company: j.companyName || null,
    url: j.applicationLink || j.guid,
    source: 'himalayas',
    sourceLabel: 'Himalayas',
    postedAt: j.pubDate ? new Date(j.pubDate * 1000).toISOString() : null,
    budget: formatSalaryRange(j.minSalary, j.maxSalary, j.currency, j.salaryPeriod),
    rate: null,
    skills: [
      ...(Array.isArray(j.categories) ? j.categories : []),
      ...extractSkillsFromText(`${j.title} ${j.excerpt || ''}`),
    ].slice(0, 8),
    description: stripHtml(j.excerpt || j.description || '').slice(0, 300),
    location: Array.isArray(j.locationRestrictions) && j.locationRestrictions.length
      ? j.locationRestrictions.join(', ')
      : 'Remote',
    raw: { guid: j.guid, seniority: j.seniority },
  })).filter(looksAwsRelated);
}

function formatSalaryRange(min, max, currency, period) {
  if (!min && !max) return null;
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : (currency ? `${currency} ` : '$');
  const fmt = (n) => (n >= 1000 ? `${sym}${Math.round(n / 1000)}k` : `${sym}${n}`);
  const per = period === 'hourly' || period === 'hour' ? '/hr'
            : period === 'monthly' || period === 'month' ? '/mo'
            : '/yr';
  if (min && max) return `${fmt(min)}-${fmt(max)}${per}`;
  return `${fmt(min || max)}+${per}`;
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function extractTag(block, tag) {
  // CDATA-aware
  const cdataPattern = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const plainPattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(cdataPattern) || block.match(plainPattern);
  return m ? m[1].trim() : '';
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&[#a-z0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const AWS_KEYWORDS = /\b(aws|amazon web services|lambda|s3|dynamodb|ec2|cloudfront|cloudformation|terraform|ecs|eks|rds|aurora|cognito|api gateway|sagemaker|bedrock|cloudwatch|iam|vpc|route ?53|elasticbeanstalk)\b/i;

function looksAwsRelated(gig) {
  const blob = `${gig.title} ${gig.description} ${(gig.skills || []).join(' ')}`;
  return AWS_KEYWORDS.test(blob);
}

const BUDGET_PATTERNS = [
  /\$([\d,]+)(?:\s*-\s*\$?([\d,]+))?\s*(?:\/|per\s+)?\s*(hour|hr|year|yr|month|mo|project|fixed)?/i,
  /budget[:\s]*\$?([\d,]+)/i,
  /hourly[:\s]*\$?([\d,]+)/i,
];
function extractBudgetFromText(text) {
  if (!text) return null;
  for (const p of BUDGET_PATTERNS) {
    const m = text.match(p);
    if (m) {
      const lo = m[1]?.replace(/,/g, '');
      const hi = m[2]?.replace(/,/g, '');
      const unit = (m[3] || '').toLowerCase();
      const u = unit.startsWith('hr') || unit === 'hour' ? '/hr'
              : unit.startsWith('yr') || unit === 'year' ? '/yr'
              : unit.startsWith('mo') || unit === 'month' ? '/mo'
              : unit ? ` ${unit}` : '';
      return hi ? `$${lo}-$${hi}${u}` : `$${lo}${u}`;
    }
  }
  return null;
}

const COMMON_SKILLS = [
  'aws', 'lambda', 's3', 'dynamodb', 'ec2', 'cloudfront', 'cloudformation', 'terraform',
  'ecs', 'eks', 'fargate', 'rds', 'aurora', 'cognito', 'sagemaker', 'bedrock',
  'cloudwatch', 'iam', 'vpc', 'route53', 'api gateway', 'python', 'node.js',
  'typescript', 'javascript', 'react', 'docker', 'kubernetes', 'devops', 'sre',
  'serverless', 'microservices', 'graphql', 'rest api', 'postgresql', 'mysql',
  'redis', 'mongodb', 'elasticsearch', 'github actions', 'ci/cd',
];
function extractSkillsFromText(text) {
  if (!text) return [];
  const t = text.toLowerCase();
  const found = new Set();
  for (const skill of COMMON_SKILLS) {
    if (t.includes(skill)) found.add(skill);
  }
  return Array.from(found).slice(0, 8);
}

// ════════════════════════════════════════════════════════════════════
// Exported list of sources for UI
// ════════════════════════════════════════════════════════════════════
export const GIG_SOURCES = SOURCES.map((s) => ({ id: s.id, label: s.label, needsProxy: s.needsProxy }));
