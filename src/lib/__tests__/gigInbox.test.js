/**
 * Gig packs: the files Claude Code writes are read honestly, and client
 * text is checked before David copies it into Upwork.
 */
import {
  budgetLabel, checkClientText, guideMeta, newGuides, normalizeStatus, sortGuides, parseGigFolder, parseLesson, serializeStatus,
  speechPieces, splitSections, summarizeGigs, updateStatus,
} from '../gigInbox.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const JOB = JSON.stringify({
  title: 'Host a static site on S3', client: { country: 'UK', paymentVerified: true, spent: 1200, hires: 6 },
  budget: { type: 'fixed', min: 60, max: 100 }, proposals: 7, connectsCost: 8,
});
const FIT = JSON.stringify({ score: 82, verdict: 'apply', reasons: ['in lane'], redFlags: [] });

export function runGigInboxTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('a complete pack parses with no problems', () => {
    const g = parseGigFolder('20261120-s3-site', { 'job.json': JOB, 'fit.json': FIT, 'proposal.md': 'Hi', 'status.json': '{"stage":"applied","connectsSpent":8}' });
    assert(g.problems.length === 0, g.problems.join('; '));
    assert(g.fit.verdict === 'apply' && g.fit.score === 82, 'fit not read');
    assert(g.status.stage === 'applied' && g.status.connectsSpent === 8, 'status not read');
    assert(g.docs.proposal === 'Hi' && g.docs.plan === null, 'docs not mapped');
  });

  test('a missing job.json is reported, and its fields read as unknown, not as a pass', () => {
    const g = parseGigFolder('20261120-x', { 'fit.json': FIT });
    assert(g.problems.some((p) => /job\.json is missing/.test(p)), 'missing job not reported');
    assert(g.job.client.paymentVerified === null, 'unknown payment must be null, not false/true');
    assert(budgetLabel(g.job) === 'Budget unknown', 'unknown budget shown as known');
  });

  test('a broken JSON file is reported, not silently dropped', () => {
    const g = parseGigFolder('20261120-x', { 'job.json': '{bad', 'fit.json': FIT });
    assert(g.problems.some((p) => /job\.json could not be read/.test(p)), 'parse error hidden');
  });

  test('"apply" with red flags is downgraded to skip', () => {
    const g = parseGigFolder('20261120-x', { 'job.json': JOB, 'fit.json': JSON.stringify({ score: 90, verdict: 'apply', redFlags: ['asks to pay on Telegram'] }) });
    assert(g.fit.verdict === 'skip', `verdict was ${g.fit.verdict}`);
  });

  test('a folder that is not yyyymmdd-name is flagged', () => {
    const g = parseGigFolder('random', { 'job.json': JOB });
    assert(g.problems.some((p) => /not in the yyyymmdd-name form/.test(p)), 'bad id accepted');
  });

  test('client text with an email, phone or WhatsApp is blocked (Upwork off-platform rule)', () => {
    assert(!checkClientText('Email me at dave@example.com').ok, 'email passed');
    assert(!checkClientText('Call +233 24 123 4567 any time').ok, 'phone passed');
    assert(!checkClientText("Let's continue on WhatsApp").ok, 'WhatsApp passed');
    assert(!checkClientText('We can sort payment outside Upwork').ok, 'off-platform payment passed');
  });

  test('claiming Solutions Architect is blocked; "studying for SAA" is allowed', () => {
    assert(!checkClientText("I'm an AWS Certified Solutions Architect.").ok, 'false SAA claim passed');
    assert(checkClientText("I'm studying for AWS Solutions Architect Associate.").ok, 'honest study line blocked');
  });

  test("David's real certificate and experience are not flagged", () => {
    const c = checkClientText("I'm an AWS Certified Cloud Practitioner with 7+ years in IT and networking.");
    assert(c.ok && c.verify.length === 0, `flagged: ${[...c.blockers, ...c.verify].join('; ')}`);
  });

  test('a guarantee still needs a second look', () => {
    assert(checkClientText('Guaranteed zero risk setup').verify.length > 0, 'guarantee not flagged');
  });

  test('ordinary plan text with dates, IPs and prices is not mistaken for a phone number', () => {
    const c = checkClientText('Posted 2026-11-20. VPC 10.0.0.0/16, cost $1–2/month, $80 fixed, 3.5 hours.');
    assert(c.ok, c.blockers.join('; '));
  });

  test('lessons parse into slides with points, flows and speech', () => {
    const slides = parseLesson('### Big picture\n- S3 stores files\n~ Visitor → CloudFront -> S3\n> Think of a shop.\n### Silent\n- just a point');
    assert(slides.length === 2, `got ${slides.length}`);
    assert(slides[0].flows[0].join('|') === 'Visitor|CloudFront|S3', 'flow wrong');
    assert(slides[0].say === 'Think of a shop.', 'say wrong');
    assert(slides[1].say.includes('just a point'), 'a slide with no > line must still speak');
  });

  test('speech is split into short pieces', () => {
    const long = `${'word '.repeat(80)}end.`;
    assert(speechPieces(long).every((p) => p.length <= 220), 'piece too long');
    assert(speechPieces('One. Two!').length === 2, 'sentences not split');
  });

  test('messages split by ## headings', () => {
    const s = splitSections('# Title\n## 1. Reply\nHello\n## 2. Kickoff\nStart\n## Empty\n');
    assert(s.length === 2 && s[1].title === '2. Kickoff' && s[1].body === 'Start', JSON.stringify(s));
  });

  test('status updates validate and round-trip', () => {
    const now = new Date('2026-11-21T10:00:00Z');
    const s = updateStatus({ stage: 'new' }, { stage: 'won', connectsSpent: '16', amount: '80', note: 'hired' }, now);
    assert(s.stage === 'won' && s.connectsSpent === 16 && s.amount === 80, JSON.stringify(s));
    assert(s.notes[0] === '2026-11-21: hired', 'note not dated');
    assert(JSON.parse(serializeStatus(s)).stage === 'won', 'serialize broken');
    let threw = false;
    try { updateStatus(s, { stage: 'hacked' }); } catch { threw = true; }
    assert(threw, 'unknown stage accepted');
    assert(normalizeStatus({ stage: 'nope' }).stage === 'new', 'bad stage on disk not normalised');
  });

  test('samples do not count toward money or Connects', () => {
    const real = { sample: false, status: normalizeStatus({ stage: 'done', amount: 80, connectsSpent: 8 }) };
    const sample = { sample: true, status: normalizeStatus({ stage: 'done', amount: 500, connectsSpent: 99 }) };
    const sum = summarizeGigs([real, sample]);
    assert(sum.earned === 80 && sum.connects === 8 && sum.real === 1, JSON.stringify(sum));
  });

  test('guides take their title from the # heading and sort in numbered order', () => {
    const list = sortGuides([
      { name: '10-later.md', text: '# Later\nx' },
      { name: '02-getting-paid.md', text: '<!-- added: 2026-11-20 -->\n# Getting paid\n### Escrow\n- held by Upwork\n> Upwork holds the money.' },
    ]);
    assert(list[0].title === 'Getting paid' && list[1].title === 'Later', list.map((g) => g.title).join(','));
    assert(list[0].added === '2026-11-20' && list[0].slides.length === 1, 'added date or slides missing');
  });

  test('a guide with no heading is named from its file', () => {
    assert(guideMeta({ name: '03-safety-rules.md', text: 'plain' }).title === 'safety rules', 'fallback title wrong');
  });

  test('"new" means added in the last week; no date is never new', () => {
    const now = new Date('2026-11-25T00:00:00Z');
    const g = sortGuides([
      { name: '01-a.md', text: '<!-- added: 2026-11-20 -->\n# A' },
      { name: '02-b.md', text: '<!-- added: 2026-11-01 -->\n# B' },
      { name: '03-c.md', text: '# C' },
    ]);
    assert(newGuides(g, now).map((x) => x.title).join() === 'A', 'new guides wrong');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
