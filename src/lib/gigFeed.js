/**
 * gigFeed.js — FR-01 Live Gig Feed sourcing.
 *
 * Honest reality check:
 *   - RemoteOK has a public JSON API with CORS — works directly from the browser.
 *   - WeWorkRemotely + Upwork + Indeed RSS feeds are not CORS-enabled. We
 *     try via a public proxy (corsproxy.io); if that fails we skip the source.
 *   - Indeed killed their public RSS in 2023 — included only as a graceful
 *     no-op so the UI doesn't show it as "broken".
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
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Public CORS proxy — best-effort fallback for RSS sources without CORS
const CORS_PROXY = 'https://corsproxy.io/?';

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
    id: 'weworkremotely',
    label: 'We Work Remotely',
    url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    type: 'rss',
    needsProxy: true,
    parse: parseWeWorkRemotely,
  },
  {
    id: 'upwork',
    label: 'Upwork',
    // Upwork RSS for AWS keyword search (when available)
    url: 'https://www.upwork.com/ab/feed/jobs/rss?q=aws',
    type: 'rss',
    needsProxy: true,
    parse: parseUpworkRss,
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
      const url = src.needsProxy ? CORS_PROXY + encodeURIComponent(src.url) : src.url;
      const res = await fetch(url, {
        method: 'GET',
        // RemoteOK requires a real User-Agent in some browsers — can't set in fetch but they accept browser UA
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let parsed;
      if (src.type === 'json') {
        const json = await res.json();
        parsed = src.parse(json);
      } else {
        const text = await res.text();
        parsed = src.parse(text);
      }

      sourceResults[src.id] = { ok: true, count: parsed.length };
      allGigs.push(...parsed);
    } catch (err) {
      console.warn(`[gigFeed] ${src.id} failed:`, err.message);
      sourceResults[src.id] = { ok: false, count: 0, error: err.message };
    }
  }));

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

function parseUpworkRss(xml) {
  return parseRss(xml, 'upwork', 'Upwork');
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
