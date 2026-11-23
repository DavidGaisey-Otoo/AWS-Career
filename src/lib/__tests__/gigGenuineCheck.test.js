import { checkGigGenuine, isInLane, locationAccess, postedTime, summarizeGenuine } from '../gigGenuineCheck.js';
import { himalayasLocation } from '../gigFeed.js';

const NOW = Date.UTC(2026, 10, 21, 12);
const DAY = 24 * 60 * 60 * 1000;
const base = {
  title: 'Junior Cloud Support Engineer (AWS)',
  company: 'Acme Cloud',
  url: 'https://example.com/jobs/1',
  location: 'Worldwide',
  postedAt: new Date(NOW - 2 * DAY).toISOString(),
  description: 'Help customers with EC2, S3 and IAM questions.',
};

export function runGigGenuineCheckTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  };
  const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`); };

  test('clean worldwide job is genuine and kept', () => {
    const r = checkGigGenuine(base, { now: NOW });
    eq(r.verdict, 'genuine', 'verdict'); eq(r.keep, true, 'keep');
  });

  test('Telegram contact is flagged as fake and hidden', () => {
    const r = checkGigGenuine({ ...base, description: 'Message us on Telegram to start today' }, { now: NOW });
    eq(r.verdict, 'fake', 'verdict'); eq(r.keep, false, 'keep');
  });

  test('a training fee is flagged as fake', () => {
    eq(checkGigGenuine({ ...base, description: 'A small training fee of $50 applies.' }, { now: NOW }).verdict, 'fake', 'verdict');
  });

  test('a free-mail contact address is flagged', () => {
    eq(checkGigGenuine({ ...base, description: `Send CV to hr.jobs@${'gmail'}.com` }, { now: NOW }).verdict, 'fake', 'verdict');
  });

  test('a post older than 45 days is expired and hidden', () => {
    const r = checkGigGenuine({ ...base, postedAt: new Date(NOW - 60 * DAY).toISOString() }, { now: NOW });
    eq(r.verdict, 'expired', 'verdict'); eq(r.keep, false, 'keep');
  });

  test('a 1970 date is unknown, not 56 years old', () => {
    eq(postedTime({ postedAt: new Date(0).toISOString() }, NOW), null, 'time');
    const r = checkGigGenuine({ ...base, postedAt: new Date(0).toISOString() }, { now: NOW });
    eq(r.verdict, 'check', 'verdict');
  });

  test('US-only location is not open to Ghana', () => {
    eq(checkGigGenuine({ ...base, location: 'USA' }, { now: NOW }).verdict, 'not-open', 'verdict');
  });

  test('"authorized to work in the US" in the text closes it even if location says Remote', () => {
    eq(locationAccess({ ...base, location: 'Remote', description: 'Must be authorized to work in the US.' }), 'closed', 'access');
  });

  test('plain "Remote" with no rule is unknown, kept with a check note', () => {
    eq(locationAccess({ ...base, location: 'Remote' }), 'unknown', 'access');
    const r = checkGigGenuine({ ...base, location: 'Remote' }, { now: NOW });
    eq(r.verdict, 'check', 'verdict'); eq(r.keep, true, 'keep');
  });

  test('missing location is unknown, never a pass', () => {
    eq(locationAccess({ ...base, location: null }), 'unknown', 'access');
  });

  test('EMEA and Africa count as open', () => {
    eq(locationAccess({ ...base, location: 'EMEA' }), 'open', 'emea');
    // The board says "Anywhere" but the full post pays only in US zones.
    eq(locationAccess({ ...base, location: 'Anywhere in the World', facts: { limitedToCountry: true } }), 'closed', 'board says anywhere');
    eq(locationAccess({ ...base, location: 'Africa, Europe' }), 'open', 'africa');
  });

  test('a missing company name asks for a check', () => {
    const r = checkGigGenuine({ ...base, company: null }, { now: NOW });
    eq(r.verdict, 'check', 'verdict');
  });

  test('a city with "Global Team" is not open worldwide', () => {
    eq(locationAccess({ ...base, location: 'Berlin | Global Team' }), 'closed', 'access');
  });

  test('only cloud / IT / network titles are in lane', () => {
    eq(isInLane(base), true, 'cloud support');
    eq(isInLane({ title: 'IT Support Specialist' }), true, 'it support');
    eq(isInLane({ title: 'Animator Intern' }), false, 'animator');
    eq(isInLane({ title: 'Enterprise Account Executive', description: 'Sell AWS solutions' }), false, 'sales');
  });

  test('summary hides off-lane jobs', () => {
    const s = summarizeGenuine([base, { ...base, title: 'Specialist Fund Valuation' }], { now: NOW });
    eq(s.offLane, 1, 'offLane'); eq(s.hidden, 1, 'hidden');
  });

  test('Himalayas: empty restriction list means worldwide', () => {
    eq(himalayasLocation([]), 'Worldwide', 'empty');
    eq(locationAccess({ ...base, location: himalayasLocation([]) }), 'open', 'access');
  });

  test('Himalayas: a long list with Ghana reads as open', () => {
    const list = ['Albania', 'Algeria', 'Angola', 'Benin', 'Egypt', 'Ghana', 'Kenya', 'Nigeria'];
    eq(himalayasLocation(list), '8 countries incl. Ghana', 'label');
    eq(locationAccess({ ...base, location: himalayasLocation(list) }), 'open', 'access');
  });

  test('Himalayas: a long list without Ghana is closed', () => {
    const list = ['Albania', 'Algeria', 'Angola', 'Benin', 'Egypt', 'Kenya', 'Nigeria'];
    eq(locationAccess({ ...base, location: himalayasLocation(list) }), 'closed', 'access');
  });

  test('a job that needs German speakers is hidden', () => {
    const r = checkGigGenuine({ ...base, title: 'Service Desk Agent (German Speaking)' }, { now: NOW });
    eq(r.verdict, 'not-open', 'verdict'); eq(r.keep, false, 'keep');
    eq(checkGigGenuine({ ...base, title: 'IT Service Desk Analyst (Remote, German, French)' }, { now: NOW }).keep, false, 'list');
  });

  test('an English job with brackets is not mistaken for a language rule', () => {
    eq(checkGigGenuine({ ...base, title: 'Cloud Support Engineer (AWS, Remote)' }, { now: NOW }).verdict, 'genuine', 'verdict');
  });

  test('summary counts hidden jobs', () => {
    const s = summarizeGenuine([base, { ...base, location: 'USA' }, { ...base, description: 'WhatsApp me' }], { now: NOW });
    eq(s.total, 3, 'total'); eq(s.genuine, 1, 'genuine'); eq(s.hidden, 2, 'hidden');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
