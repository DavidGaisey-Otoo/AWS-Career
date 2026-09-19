import { parseAwsRss, serviceFromTitle } from '../awsNewsFeed.js';

/**
 * The What's New page used to render ten hand-written entries that never
 * changed, so the app stated months-old items as current AWS news with
 * nothing to indicate their age.
 *
 * These tests cover the parsing, and — more importantly — that a feed
 * which is missing, broken or empty is recognised as such instead of
 * producing a confident list of nothing.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>AWS What's New</title>
  <item>
    <title>Amazon S3 announces additional checksum algorithms</title>
    <link>https://aws.amazon.com/about-aws/whats-new/2026/09/s3-checksums/</link>
    <description><![CDATA[<p>Amazon S3 now supports <b>more</b> checksum algorithms for data integrity.</p>]]></description>
    <pubDate>Wed, 17 Sep 2026 17:00:00 +0000</pubDate>
  </item>
  <item>
    <title>AWS Lambda adds support for a new runtime</title>
    <link>https://aws.amazon.com/about-aws/whats-new/2026/09/lambda-runtime/</link>
    <description>Lambda now supports another managed runtime.</description>
    <pubDate>Tue, 16 Sep 2026 10:30:00 +0000</pubDate>
  </item>
</channel></rss>`;

export function runAwsNewsFeedTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // ───────────── parsing real AWS RSS ─────────────

  test('parses announcements out of the AWS feed', () => {
    const items = parseAwsRss(RSS);
    assert(items.length === 2, `expected 2 items, got ${items.length}`);
    assert(/checksum/i.test(items[0].title), `title wrong: ${items[0].title}`);
    assert(items[0].url.startsWith('https://aws.amazon.com/'), 'link lost');
  });

  test('CDATA and HTML are stripped out of summaries', () => {
    const [first] = parseAwsRss(RSS);
    assert(!/<b>|<p>|CDATA/i.test(first.summary), `markup leaked into the summary: ${first.summary}`);
    assert(/checksum/i.test(first.summary), 'summary text lost with the markup');
  });

  test('publication dates become real ISO timestamps', () => {
    const [first] = parseAwsRss(RSS);
    assert(first.dateISO && first.dateISO.startsWith('2026-09-17'), `date wrong: ${first.dateISO}`);
    assert(!Number.isNaN(new Date(first.dateISO).getTime()), 'date is not parseable');
  });

  test('the service is identified from the headline', () => {
    const items = parseAwsRss(RSS);
    assert(items[0].service === 'S3', `expected S3, got ${items[0].service}`);
    assert(items[1].service === 'Lambda', `expected Lambda, got ${items[1].service}`);
  });

  test('live items are marked live so the UI can say so', () => {
    assert(parseAwsRss(RSS).every((i) => i.live === true), 'items not marked as live');
  });

  // ───────────── the failure modes that matter ─────────────

  test('a non-RSS response is rejected, not rendered as news', () => {
    for (const junk of ['<html><body>404 Not Found</body></html>', '{"error":"blocked"}', '']) {
      let threw = false;
      try { parseAwsRss(junk); } catch { threw = true; }
      assert(threw, `accepted a non-feed response: ${junk.slice(0, 30)}`);
    }
  });

  test('an empty feed is an error, not an empty news list', () => {
    // Silently showing "no announcements" would read as "AWS shipped
    // nothing", which is a claim the app cannot make.
    let threw = false;
    try { parseAwsRss('<rss version="2.0"><channel><title>x</title></channel></rss>'); }
    catch { threw = true; }
    assert(threw, 'an empty feed passed as a valid, empty result');
  });

  test('one malformed item does not discard the rest of the feed', () => {
    const mixed = RSS.replace('<title>AWS Lambda adds support for a new runtime</title>', '');
    const items = parseAwsRss(mixed);
    assert(items.length === 1, `expected the good item to survive, got ${items.length}`);
    assert(/checksum/i.test(items[0].title), 'the surviving item is the wrong one');
  });

  test('an item with an unparseable date keeps its content', () => {
    const bad = RSS.replace('Wed, 17 Sep 2026 17:00:00 +0000', 'not a date');
    const [first] = parseAwsRss(bad);
    assert(first.dateISO === null, 'invented a date it could not read');
    assert(first.title.length > 0, 'discarded a usable announcement over its date');
  });

  test('non-string input does not throw something unhelpful', () => {
    for (const bad of [null, undefined, 42, {}]) {
      let msg = '';
      try { parseAwsRss(bad); } catch (e) { msg = e.message; }
      assert(/rss|feed/i.test(msg), `unhelpful error for ${JSON.stringify(bad)}: ${msg}`);
    }
  });

  // ───────────── service naming ─────────────

  test('service names drop the Amazon/AWS prefix', () => {
    assert(serviceFromTitle('Amazon EC2 now supports something') === 'EC2', 'EC2 not identified');
    assert(serviceFromTitle('AWS Lambda gains a feature') === 'Lambda', 'Lambda not identified');
  });

  test('an unrecognised headline falls back rather than guessing wildly', () => {
    const s = serviceFromTitle('Announcing general availability of something entirely new');
    assert(typeof s === 'string' && s.length > 0, 'returned nothing for an unknown service');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
