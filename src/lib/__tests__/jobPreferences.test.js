import { workKind, parsePay, payView, stressLevel, matchPreferences, payLabel } from '../jobPreferences.js';

const base = {
  title: 'Cloud Support Engineer',
  description: 'Help customers with AWS.',
  workType: 'Contract',
  budget: '$20 - $30/hour',
};

export function runJobPreferencesTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.message }); }
  };
  const eq = (a, b, msg) => { if (a !== b) throw new Error(`${msg}: expected ${b}, got ${a}`); };

  test('board job types map to freelance or full-time', () => {
    eq(workKind({ workType: 'Contractor' }), 'freelance', 'contractor');
    eq(workKind({ workType: 'part_time' }), 'freelance', 'part_time');
    eq(workKind({ workType: 'Full-Time' }), 'full-time', 'Full-Time');
    eq(workKind({ workType: 'full_time' }), 'full-time', 'full_time');
    eq(workKind({ title: 'Support Specialist - Freelance, Remote' }), 'freelance', 'title');
    eq(workKind({ title: 'Support Engineer' }), 'unknown', 'unknown');
  });

  test('pay ranges parse with period and currency', () => {
    const p = parsePay('$60k-$120k/yr');
    eq(p.currency, 'USD', 'cur'); eq(p.min, 60000, 'min'); eq(p.max, 120000, 'max'); eq(p.period, 'year', 'period');
    eq(parsePay('$14 - $20/hour').period, 'hour', 'hourly');
    eq(parsePay('£45,000').currency, 'GBP', 'gbp');
    eq(parsePay('$35,3k- $52k').min, 35300, 'european decimal');
  });

  test('a bare small number is not trusted as pay', () => {
    eq(parsePay('$10'), null, '$10');
    eq(parsePay('$200'), null, '$200');
    eq(parsePay(null), null, 'null');
  });

  test('yearly pay converts to monthly and hourly', () => {
    const v = payView(parsePay('$60k-$120k/yr'));
    eq(Math.round(v.monthlyMin), 5000, 'monthly'); eq(Math.round(v.hourlyMin), 29, 'hourly');
  });

  test('on-call, night shifts and 50+ tickets are high stress', () => {
    eq(stressLevel({ description: 'Part of an on call rotation' }).level, 'high', 'on call');
    eq(stressLevel({ description: 'graveyard shift flexibility' }).level, 'high', 'graveyard');
    eq(stressLevel({ description: 'A track record closing 50+ tickets a day' }).level, 'high', 'tickets');
    eq(stressLevel({ description: 'Help users with email.' }).level, 'low', 'calm');
  });

  test('a fair, calm, USD contract is a perfect match', () => {
    const m = matchPreferences(base);
    eq(m.perfect, true, `perfect (misses: ${m.misses.join(', ')})`);
  });

  test('hidden pay is never a perfect match', () => {
    const m = matchPreferences({ ...base, budget: null });
    eq(m.perfect, false, 'perfect'); eq(m.misses.includes('Pay not shown'), true, 'reason');
  });

  test('$2.50–$5/hr is under the minimum', () => {
    eq(matchPreferences({ ...base, budget: '$2.50 - $5.00/hour' }).misses.includes('Under $15/hr'), true, 'low pay');
  });

  test('euro pay misses the USD/GBP rule', () => {
    eq(matchPreferences({ ...base, budget: '€60k-€80k/yr' }).misses.includes('Paid in EUR'), true, 'eur');
  });

  test('full-time jobs miss when looking for freelance, pass when looking for full-time', () => {
    const ft = { ...base, workType: 'Full Time', budget: '$60k-$80k/yr' };
    eq(matchPreferences(ft).perfect, false, 'freelance view');
    eq(matchPreferences(ft, { kind: 'full-time', minHourlyUsd: 15, currencies: ['USD', 'GBP'], allowHighStress: false }).perfect, true, 'full-time view');
  });

  test('a senior title is never a perfect match, however good the pay', () => {
    const m = matchPreferences({ ...base, title: 'Senior Platform Security Engineer', workType: 'Contract', budget: '$90 - $120/hour' });
    eq(m.perfect, false, 'perfect'); eq(m.misses.includes('Above your current level'), true, 'reason');
  });

  test('pay labels read hourly for freelance and monthly for full-time', () => {
    eq(payLabel(payView(parsePay('$20 - $30/hour')), 'freelance'), '$20–$30/hr', 'hourly');
    eq(payLabel(payView(parsePay('$60k-$120k/yr')), 'full-time'), '$5,000–$10,000/month', 'monthly');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
