/**
 * awsNewsFeed.js — live AWS "What's New" announcements.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * The What's New page rendered a hand-written array of ten entries. It
 * never updated, so the app stated AWS news as current that was months
 * old — and did so with no indication of its age. Being confidently
 * stale about a provider that ships daily is worse than saying nothing,
 * particularly in front of a client.
 *
 * ════════════════════════════════════════════════════════════════════
 * HOW
 * ════════════════════════════════════════════════════════════════════
 * AWS publishes an RSS feed. It sends no CORS header, so a browser
 * cannot read it directly; the same public proxy chain the gig feed
 * already uses gets around that, including the user's own proxy if they
 * have configured one.
 *
 * Three rules, all of them about not lying:
 *
 *   1. Every result says where it came from and when it was fetched.
 *      A cached list is labelled as cached, never presented as live.
 *   2. When the feed cannot be reached, the curated entries are
 *      returned and clearly marked as curated — not passed off as
 *      today's announcements.
 *   3. The cache goes through safeStorage, so it can be evicted under
 *      pressure and can never fill the quota and break real data.
 */
import { AWS_UPDATES } from '../data/awsUpdates.js';
import { STORAGE_KEY } from './constants.js';
import { getCustomProxy } from './gigFeed.js';
import { safeSet } from './safeStorage.js';

export const AWS_WHATS_NEW_RSS = 'https://aws.amazon.com/about-aws/whats-new/recent/feed/';
const CACHE_KEY = `${STORAGE_KEY}::aws-news-cache`;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;   // AWS ships daily; six hours is plenty
const MAX_ITEMS = 40;

const PUBLIC_PROXIES = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

function proxyChain() {
  const chain = [...PUBLIC_PROXIES];
  const custom = getCustomProxy();
  if (custom) chain.unshift((url) => `${custom}${encodeURIComponent(url)}`);
  return chain;
}

// ════════════════════════════════════════════════════════════════════
// parsing
// ════════════════════════════════════════════════════════════════════

/** Guess the AWS service from a headline, for grouping and filtering. */
export function serviceFromTitle(title = '') {
  const known = [
    'Amazon Bedrock', 'Amazon EC2', 'Amazon S3', 'Amazon RDS', 'Amazon Aurora',
    'AWS Lambda', 'Amazon DynamoDB', 'Amazon CloudFront', 'Amazon VPC', 'AWS IAM',
    'Amazon SageMaker', 'Amazon ECS', 'Amazon EKS', 'AWS Fargate', 'Amazon CloudWatch',
    'AWS CloudFormation', 'Amazon Route 53', 'AWS Config', 'AWS Organizations',
    'Amazon SNS', 'Amazon SQS', 'AWS Glue', 'Amazon Redshift', 'Amazon Athena',
    'AWS Step Functions', 'Amazon API Gateway', 'AWS CodeBuild', 'Amazon EBS',
  ];
  for (const name of known) {
    if (title.toLowerCase().includes(name.toLowerCase())) {
      return name.replace(/^(Amazon|AWS)\s+/, '');
    }
  }
  const m = title.match(/\b(?:Amazon|AWS)\s+([A-Z][A-Za-z0-9 ]{2,24}?)\b/);
  return m ? m[1].trim() : 'AWS';
}

/**
 * Parse the RSS into the shape the page already renders.
 *
 * Deliberately tolerant: one malformed item must not discard the whole
 * feed, and a feed that is not RSS at all must be recognised as such
 * rather than producing a list of empty rows.
 */
export function parseAwsRss(xml) {
  if (typeof xml !== 'string' || !/<(rss|feed)\b/i.test(xml)) {
    throw new Error('Response was not an RSS feed.');
  }
  const items = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      if (!m) return '';
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    const title = pick('title');
    if (!title) continue;                     // an item without a title is noise
    const link = pick('link');
    const dateRaw = pick('pubDate') || pick('updated') || pick('published');
    const when = dateRaw ? new Date(dateRaw) : null;
    items.push({
      id: `aws-rss-${(link || title).slice(-60)}`,
      title,
      summary: pick('description').slice(0, 400) || title,
      service: serviceFromTitle(title),
      dateISO: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null,
      url: link || 'https://aws.amazon.com/about-aws/whats-new/recent/',
      tag: 'general',
      level: 'info',
      live: true,
    });
    if (items.length >= MAX_ITEMS) break;
  }
  if (!items.length) throw new Error('Feed contained no readable announcements.');
  return items;
}

// ════════════════════════════════════════════════════════════════════
// cache
// ════════════════════════════════════════════════════════════════════

export function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.items) || !parsed.fetchedAt) return null;
    return parsed;
  } catch { return null; }
}

function writeCache(items) {
  // Through safeStorage: this cache is expendable and must never be the
  // reason a proposal or a profile fails to save.
  safeSet(CACHE_KEY, JSON.stringify({ fetchedAt: new Date().toISOString(), items }));
}

const isFresh = (cache, now = Date.now()) =>
  !!cache && now - new Date(cache.fetchedAt).getTime() < CACHE_TTL_MS;

// ════════════════════════════════════════════════════════════════════
// the public call
// ════════════════════════════════════════════════════════════════════

/** The curated list, always labelled as curated rather than as news. */
function curatedFallback(reason) {
  return {
    items: AWS_UPDATES.map((u) => ({ ...u, live: false })),
    source: 'curated',
    fetchedAt: null,
    stale: true,
    note: `Showing curated entries — ${reason}`,
  };
}

/**
 * @returns {{ items, source: 'live'|'cache'|'curated', fetchedAt, stale, note? }}
 *   `source` and `fetchedAt` exist so the UI can say how current this is.
 *   Nothing here ever presents cached or curated content as live.
 */
export async function fetchAwsNews({ force = false, fetchImpl = fetch } = {}) {
  const cache = readCache();
  if (!force && isFresh(cache)) {
    return { items: cache.items, source: 'cache', fetchedAt: cache.fetchedAt, stale: false };
  }

  let lastError = null;
  for (const wrap of proxyChain()) {
    try {
      const res = await fetchImpl(wrap(AWS_WHATS_NEW_RSS), { headers: { Accept: 'application/rss+xml, text/xml, */*' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const items = parseAwsRss(await res.text());
      writeCache(items);
      return { items, source: 'live', fetchedAt: new Date().toISOString(), stale: false };
    } catch (err) {
      lastError = err;
    }
  }

  // Every proxy failed. A stale cache still beats curated content,
  // because it was at least real AWS news at some point — but it is
  // labelled stale so nobody mistakes it for today's.
  if (cache) {
    return {
      items: cache.items,
      source: 'cache',
      fetchedAt: cache.fetchedAt,
      stale: true,
      note: `Could not reach AWS — showing the copy fetched ${new Date(cache.fetchedAt).toLocaleString()}.`,
    };
  }
  return curatedFallback(lastError ? `AWS feed unreachable (${lastError.message})` : 'AWS feed unreachable');
}
