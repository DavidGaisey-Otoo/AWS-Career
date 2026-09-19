import {
  CREDITS_PROGRAMME_START,
  classifyAccount,
  planDaysLeft,
  planEndsAt,
  programmeForCreatedAt,
} from '../accountTier.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();

export function runAccountTierTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // ───────────── programme detection ─────────────

  test('accounts created from 15 Jul 2025 are on the six-month credits plan', () => {
    assert(programmeForCreatedAt(iso(CREDITS_PROGRAMME_START)) === 'credits-6-month', 'cutoff day itself was misclassified');
    assert(programmeForCreatedAt(iso(CREDITS_PROGRAMME_START + DAY)) === 'credits-6-month', 'day after cutoff was misclassified');
  });

  test('accounts created before the cutoff stay on the legacy 12-month tier', () => {
    assert(programmeForCreatedAt(iso(CREDITS_PROGRAMME_START - DAY)) === 'legacy-12-month', 'day before cutoff was misclassified');
    assert(programmeForCreatedAt('2024-01-01T00:00:00Z') === 'legacy-12-month', 'clearly-legacy account was misclassified');
  });

  test('an unusable creation date yields null rather than a guess', () => {
    for (const bad of [null, undefined, '', 'not-a-date']) {
      assert(programmeForCreatedAt(bad) === null, `invented a programme for ${JSON.stringify(bad)}`);
    }
  });

  // ───────────── plan length ─────────────

  test('the credits plan runs six calendar months, not twelve', () => {
    const created = '2026-01-15T00:00:00Z';
    const end = planEndsAt(created, 'credits-6-month');
    assert(end.toISOString().startsWith('2026-07-15'), `six-month plan ended at ${end.toISOString()}`);
  });

  test('the legacy tier still runs twelve months', () => {
    const end = planEndsAt('2024-03-10T00:00:00Z', 'legacy-12-month');
    assert(end.toISOString().startsWith('2025-03-10'), `legacy tier ended at ${end.toISOString()}`);
  });

  test('days remaining never goes negative', () => {
    const longExpired = planDaysLeft('2020-01-01T00:00:00Z', 'credits-6-month');
    assert(longExpired === 0, `expected 0, got ${longExpired}`);
  });

  // ───────────── the regression this fixes ─────────────

  test('a NEW account is not told it has ~365 days of Free Tier', () => {
    // The exact reported bug: account created a month ago, after the
    // programme switch, was showing "Free Tier Active - 365d left".
    const createdMs = Math.max(CREDITS_PROGRAMME_START, Date.now() - 30 * DAY);
    const profile = {
      connected: true,
      tierInfo: { oldestUserCreatedAt: iso(createdMs), ageDays: 30 },
    };
    const c = classifyAccount(profile);
    assert(c.type === 'C', `expected credits account (C), got ${c.type}`);
    assert(c.daysLeft <= 183, `claimed ${c.daysLeft} days left on a six-month plan`);
    assert(!/12-month/.test(c.reason), `reason still mentions the 12-month tier: ${c.reason}`);
  });

  test('a genuinely legacy account still gets its 12-month tier', () => {
    const created = CREDITS_PROGRAMME_START - 200 * DAY; // well before the switch
    const profile = {
      connected: true,
      tierInfo: { oldestUserCreatedAt: iso(created), ageDays: 200 },
    };
    const c = classifyAccount(profile);
    assert(c.type === 'A' || c.type === 'B', `legacy account classified as ${c.type}`);
  });

  test('profiles saved before this fix are re-classified without re-testing', () => {
    // An old saved profile carries the stale freeTier12mActive:true flag
    // but also the creation date — the date must win.
    const createdMs = Math.max(CREDITS_PROGRAMME_START, Date.now() - 10 * DAY);
    const stale = {
      connected: true,
      tierInfo: {
        oldestUserCreatedAt: iso(createdMs),
        ageDays: 10,
        freeTier12mActive: true,
        daysLeftInFreeTier: 355,
      },
    };
    const c = classifyAccount(stale);
    assert(c.type === 'C', `stale 12-month flag overrode the creation date (got ${c.type})`);
    assert(c.daysLeft !== 355, 'stale 355-day figure survived');
  });

  // ───────────── explicit records and overrides still win ─────────────

  test('a console-verified six-month plan is authoritative', () => {
    const c = classifyAccount({
      connected: true,
      accountPlan: 'free-6-month',
      planExpiresAt: iso(Date.now() + 60 * DAY),
      creditsRemaining: 100,
    });
    assert(c.type === 'C' && c.creditsRemaining === 100, `recorded plan not honoured: ${JSON.stringify(c)}`);
  });

  test('an expired six-month plan is not reported as still free', () => {
    const c = classifyAccount({
      connected: true,
      accountPlan: 'free-6-month',
      planExpiresAt: iso(Date.now() - DAY),
    });
    assert(c.type === 'B', `expired plan classified as ${c.type}`);
  });

  test('manual override beats detection', () => {
    const createdMs = Math.max(CREDITS_PROGRAMME_START, Date.now() - 5 * DAY);
    const c = classifyAccount({
      connected: true,
      tierOverride: 'paid',
      tierInfo: { oldestUserCreatedAt: iso(createdMs), ageDays: 5 },
    });
    assert(c.type === 'B', `override ignored, got ${c.type}`);
  });

  test('an unlinked profile is unknown, never assumed free', () => {
    assert(classifyAccount(null).type === 'UNKNOWN', 'null profile was classified');
    assert(classifyAccount({ connected: false }).type === 'UNKNOWN', 'untested profile was classified');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
