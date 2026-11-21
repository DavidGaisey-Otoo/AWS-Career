/**
 * api/feed.js — fetch an allowlisted third-party feed server-side.
 *
 * Some job boards publish perfectly good public data but send no CORS
 * header, so a browser cannot read them. The app routed those through
 * public CORS proxies; both have since broken (corsproxy.io answers 403,
 * allorigins 520), which left two of the six gig sources silently dead —
 * the feed still looked like it was working, just with fewer jobs.
 *
 * This deployment already exists to run the GitHub OAuth functions and
 * can fetch them itself. Both sources answer 200 to a plain server-side
 * request, so no third party is needed.
 *
 * ════════════════════════════════════════════════════════════════════
 * NOT AN OPEN PROXY
 * ════════════════════════════════════════════════════════════════════
 * The caller passes a source NAME, never a URL. Only the entries in
 * SOURCES below can ever be fetched, so this cannot be pointed at an
 * internal address, a cloud metadata endpoint, or anything else.
 */

const SOURCES = {
  himalayas: {
    url: 'https://himalayas.app/jobs/api?limit=50',
    type: 'application/json; charset=utf-8',
  },
  // Jobs whose employer accepts applicants in Ghana (country=GH), for the
  // kinds of work the user does. Several searches, merged into one
  // { jobs: [...] } body so the app sees a single source.
  'himalayas-ghana': {
    urls: ['cloud', 'aws', 'support engineer', 'it support', 'devops', 'network']
      .map((q) => `https://himalayas.app/jobs/api/search?country=GH&q=${encodeURIComponent(q)}`),
    type: 'application/json; charset=utf-8',
  },
  weworkremotely: {
    url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    type: 'application/rss+xml; charset=utf-8',
  },
  'weworkremotely-devops': {
    url: 'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
    type: 'application/rss+xml; charset=utf-8',
  },
  'aws-whats-new': {
    url: 'https://aws.amazon.com/about-aws/whats-new/recent/feed/',
    type: 'application/rss+xml; charset=utf-8',
  },
};

const ALLOWED_ORIGINS = new Set(['https://davidgaisey-otoo.github.io']);
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;                  // direct GET, no browser origin
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  else if (!origin) res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAllowedOrigin(origin)) return res.status(403).json({ error: 'Origin not allowed' });

  const name = String(req.query?.source || '');
  const source = Object.prototype.hasOwnProperty.call(SOURCES, name) ? SOURCES[name] : null;
  if (!source) {
    return res.status(400).json({
      error: 'Unknown source',
      allowed: Object.keys(SOURCES),
    });
  }

  const fetchOne = (url) => fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'application/json, application/rss+xml, text/xml, */*',
      // Several of these serve a bot page to clients with no user agent.
      'User-Agent': 'AWS-Career-Launchpad/1.0 (+https://davidgaisey-otoo.github.io/AWS-Career/)',
    },
  });

  try {
    let body;
    if (source.urls) {
      // Merge several JSON searches. One failed search is reported in
      // `failed`, not hidden; all failing is an error, never "no jobs".
      const settled = await Promise.allSettled(source.urls.map(async (url) => {
        const r = await fetchOne(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }));
      const ok = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
      if (!ok.length) {
        return res.status(502).json({ error: `${name}: every search failed` });
      }
      const seen = new Set();
      const jobs = [];
      for (const page of ok) {
        for (const job of Array.isArray(page?.jobs) ? page.jobs : []) {
          const key = job.guid || job.applicationLink || job.title;
          if (seen.has(key)) continue;
          seen.add(key);
          jobs.push(job);
        }
      }
      body = JSON.stringify({ jobs, searches: source.urls.length, failed: source.urls.length - ok.length });
    } else {
      const upstream = await fetchOne(source.url);
      if (!upstream.ok) {
        return res.status(502).json({ error: `${name} returned HTTP ${upstream.status}` });
      }
      body = await upstream.text();
    }
    if (!body.trim()) {
      // An empty body would parse into an empty job list, which reads as
      // "there are no jobs" — a claim this endpoint cannot make.
      return res.status(502).json({ error: `${name} returned an empty response` });
    }

    // Job boards update often but not by the minute; fifteen minutes at
    // the edge keeps this comfortably inside the free tier.
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600');
    res.setHeader('Content-Type', source.type);
    return res.status(200).send(body);
  } catch (err) {
    return res.status(502).json({ error: String(err?.message || err) });
  }
}
