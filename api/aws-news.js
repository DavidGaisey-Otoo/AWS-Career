/**
 * api/aws-news.js — server-side fetch of AWS's "What's New" RSS.
 *
 * AWS sends no CORS header, so a browser cannot read the feed directly.
 * The app previously went through public CORS proxies; both of them now
 * fail for this URL (corsproxy.io returns 403, allorigins returns 520),
 * so the page silently fell back to its curated list.
 *
 * Depending on strangers' proxies for a core feature was the mistake.
 * This deployment already exists to run the GitHub OAuth functions, and
 * it can fetch the feed itself: no third party, no key, no cost beyond
 * the free tier already in use.
 *
 * Read-only and public data, so the origin rules only need to stop this
 * being used as an open proxy — it fetches one hardcoded URL and nothing
 * else, which it cannot be.
 */

const FEED = 'https://aws.amazon.com/about-aws/whats-new/recent/feed/';

const ALLOWED_ORIGINS = new Set([
  'https://davidgaisey-otoo.github.io',
]);
const LOCAL_ORIGIN = /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;              // direct GET, no browser origin
  return ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin);
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  if (isAllowedOrigin(origin) && origin) res.setHeader('Access-Control-Allow-Origin', origin);
  else if (!origin) res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!isAllowedOrigin(origin)) return res.status(403).json({ error: 'Origin not allowed' });

  try {
    const upstream = await fetch(FEED, {
      headers: {
        Accept: 'application/rss+xml, text/xml, */*',
        // AWS serves a generic page to clients with no user agent.
        'User-Agent': 'AWS-Career-Launchpad/1.0 (+https://davidgaisey-otoo.github.io/AWS-Career/)',
      },
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: `AWS returned HTTP ${upstream.status}` });
    }
    const xml = await upstream.text();
    if (!/<(rss|feed)\b/i.test(xml)) {
      // Say so rather than handing the browser something that is not a
      // feed and letting it fail further away from the cause.
      return res.status(502).json({ error: 'AWS did not return an RSS feed.' });
    }

    // Cache at the edge: AWS ships several times a day, so an hour is
    // fresh enough and keeps this well inside the free tier.
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    return res.status(200).send(xml);
  } catch (err) {
    return res.status(502).json({ error: String(err?.message || err) });
  }
}
