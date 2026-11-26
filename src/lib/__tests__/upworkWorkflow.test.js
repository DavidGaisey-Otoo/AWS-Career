/**
 * The Upwork workflow, Pass A: job fit, truth check, scope, daily check.
 *
 * What these pin, beyond the happy path:
 *   - a certificate he does not hold never passes, in any wording, unless
 *     it is said as "studying for";
 *   - a client signal missing from the paste is unknown, and unknown
 *     payment can never produce GO;
 *   - a certificate cannot be added to the facts without a date.
 */
import { buildFacts, certificateProblem } from '../myFacts.js';
import { checkTruth } from '../truthCheck.js';
import { assessUpworkFit, clientSignals, connectsCost, upworkBudget, verdictLine } from '../upworkFit.js';
import { scopeAndDone } from '../proposalScope.js';
import { searchUrl, updateToday, streak, today, lastWeek, dayKey } from '../dailyJobCheck.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const GOOD_POST = `Secure our new AWS account
Fixed-price
$150
Entry level
We just opened an AWS account. Please lock down the root user with MFA, create IAM users for 3 staff with least privilege, and set a billing alarm.
Proposals: Less than 5
Payment method verified
4.8 of 5 reviews
$2.4K total spent
62% hire rate, 1 open job
Send a proposal for: 8 Connects`;

const SKIP_POST = `Kubernetes expert needed
More than 30 hrs/week
More than 6 months
Migrate our production workloads to EKS. AWS Solutions Architect certification required.
Payment method verified
Proposals: 20 to 50`;

export function runUpworkWorkflowTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const facts = buildFacts();
  const ready = buildFacts({ upwork: { idVerified: true, connectsBalance: 40, pricePerConnect: 0.15 } });

  // ───────── facts ─────────

  test('the facts hold Cloud Practitioner and CCSA with dates, and not SAA', () => {
    const ids = facts.certificates.map((c) => c.id);
    assert(ids.includes('aws-ccp') && ids.includes('ccsa') && !ids.includes('aws-saa'), ids.join(','));
    assert(facts.certificates.find((c) => c.id === 'aws-ccp').expires === '2028-01', 'CCP expiry missing');
    assert(facts.studying.some((s) => s.id === 'aws-saa'), 'SAA should be listed as studying');
    assert(facts.cloudYears === 0 && facts.clientJobsCompleted === 0, 'invented cloud years or client jobs');
  });

  test('a certificate is not added without the month it was earned', () => {
    assert(certificateProblem({ id: 'aws-saa' }, facts), 'accepted a certificate with no date');
    const added = buildFacts({ extraCertificates: [{ id: 'aws-saa' }] });
    assert(!added.certificates.some((c) => c.id === 'aws-saa'), 'undated certificate was added');
    const dated = buildFacts({ extraCertificates: [{ id: 'aws-saa', earned: '2027-03' }] });
    assert(dated.certificates.some((c) => c.id === 'aws-saa') && !dated.studying.some((s) => s.id === 'aws-saa'), 'dated certificate not added');
  });

  // ───────── truth check ─────────

  test('claiming Solutions Architect is blocked, in any wording', () => {
    for (const t of [
      'I am an AWS Certified Solutions Architect.',
      'As a certified SAA-C03 holder, I can help.',
      'I hold the Solutions Architect – Associate certification.',
    ]) {
      const r = checkTruth(t, facts);
      assert(!r.ok && r.blockers.some((b) => b.id === 'cert:aws-saa'), `${t} → ${JSON.stringify(r.blockers)}`);
    }
  });

  test('saying you are studying for SAA is honest and passes', () => {
    const r = checkTruth("I'm currently studying for AWS Solutions Architect Associate.", facts);
    assert(r.ok, JSON.stringify(r.blockers));
  });

  test('the true claims pass: Cloud Practitioner, CCSA, 7+ years in IT', () => {
    const r = checkTruth("I'm an AWS Certified Cloud Practitioner and Check Point CCSA with 7+ years in IT and network administration.", facts);
    assert(r.ok, JSON.stringify(r.blockers));
  });

  test('years of AWS he does not have are blocked; years in IT beyond the facts too', () => {
    assert(checkTruth('I have 5 years of AWS experience.', facts).blockers.some((b) => b.id === 'years:cloud'), 'AWS years passed');
    assert(checkTruth('I have 12 years of experience in IT.', facts).blockers.some((b) => b.id === 'years:it'), 'IT years beyond facts passed');
  });

  test('client work and measured results he has not done are blocked', () => {
    assert(checkTruth("I've delivered 40+ projects for clients.", facts).blockers.some((b) => b.id === 'count'), 'client count passed');
    assert(checkTruth('I cut AWS costs by 40% for my last client.', facts).blockers.some((b) => b.id === 'outcome-number'), 'measured result passed');
    assert(checkTruth('I built 3 projects in my own training account.', facts).ok, 'true portfolio count blocked');
  });

  test('a skill the facts list as a gap is blocked; a held one passes', () => {
    assert(checkTruth('I have strong experience with Kubernetes and Terraform.', facts).blockers.some((b) => b.id === 'skill:kubernetes'), 'Kubernetes passed');
    assert(checkTruth('I have hands-on experience with networking and firewalls.', facts).ok, 'held skill blocked');
  });

  test('"senior" or "expert" is blocked at entry level, and so is a guarantee', () => {
    assert(checkTruth("I'm a senior AWS engineer.", facts).blockers.some((b) => b.id === 'seniority'), 'senior passed');
    assert(checkTruth('Your bill is guaranteed to be zero.', facts).blockers.some((b) => b.id === 'guarantee'), 'guarantee passed');
  });

  test('without facts nothing passes', () => {
    assert(!checkTruth('Anything at all.', null).ok, 'no facts read as a pass');
  });

  // ───────── job fit ─────────

  test('a small, safe AWS job from a good client is GO', () => {
    const fit = assessUpworkFit(GOOD_POST, ready);
    assert(fit.verdict === 'GO', `${fit.verdict} ${fit.score} ${JSON.stringify(fit.skips)} ${JSON.stringify(fit.cautions)}`);
    assert(fit.good.some((g) => g.id === 'mfa') && fit.good.some((g) => g.id === 'billing'), JSON.stringify(fit.good));
    assert(/^Go:/.test(verdictLine(fit)), verdictLine(fit));
  });

  test('migration, EKS, 30+ hrs, 6+ months and SAA-required are each SKIP', () => {
    const fit = assessUpworkFit(SKIP_POST, ready);
    const ids = fit.skips.map((s) => s.id);
    assert(fit.verdict === 'SKIP', fit.verdict);
    for (const id of ['migration', 'kubernetes', 'full-time', 'long-contract', 'saa-required']) assert(ids.includes(id), `missing ${id}: ${ids}`);
  });

  test('"production down, urgent" is SKIP', () => {
    assert(assessUpworkFit('Our website is down! Urgent fix needed on AWS EC2 now. Payment method verified', ready).verdict === 'SKIP', 'production down not skipped');
  });

  test('payment not in the paste is unknown, and unknown payment is never GO', () => {
    const noClient = GOOD_POST.replace('Payment method verified\n', '');
    const fit = assessUpworkFit(noClient, ready);
    assert(fit.client.payment.known === false, 'missing payment read as known');
    assert(fit.verdict !== 'GO', 'GO without seeing payment verified');
  });

  test('payment not verified is SKIP', () => {
    assert(assessUpworkFit(GOOD_POST.replace('Payment method verified', 'Payment method not verified'), ready).verdict === 'SKIP', 'unverified payment not skipped');
  });

  test('client signals are read from the Upwork panel', () => {
    const c = clientSignals(GOOD_POST);
    assert(c.spent.value === 2400 && c.rating.value === 4.8 && c.proposals.value === 4 && c.hireRate.value === 62 && c.connects.value === 8, JSON.stringify(c));
    assert(upworkBudget(GOOD_POST).amount === 150, JSON.stringify(upworkBudget(GOOD_POST)));
  });

  test('a professional-attitude line is not read as a certification demand', () => {
    const fit = assessUpworkFit('Set up S3 static website. Professional attitude required. Payment method verified', ready);
    assert(!fit.skips.some((s) => s.id === 'saa-required'), JSON.stringify(fit.skips));
  });

  test('Connects: cost in dollars, an unverified ID is said, unknown cost stays unknown', () => {
    const c = connectsCost({ connects: { known: true, value: 8 }, budget: { kind: 'fixed', amount: 150 }, facts });
    assert(c.dollars === 1.2, `dollars ${c.dollars}`);
    assert(c.notes.some((n) => /ID verification/.test(n)), 'ID verification not mentioned');
    assert(c.notes.some((n) => /need 8 Connects and have 0/.test(n)), 'balance shortfall not mentioned');
    const u = connectsCost({ connects: { known: false }, budget: null, facts: ready });
    assert(u.dollars === null && u.worth === 'unknown', 'unknown cost given a value');
  });

  // ───────── scope ─────────

  test('scope and "done means" come from the job, priced from the packages', () => {
    const s = scopeAndDone({ jd: 'Lock down root with MFA and add a billing alarm' });
    assert(s.package?.id === 'safe-start' && s.tier === 80, `${s.package?.id} ${s.tier}`);
    assert(s.done.some((d) => /MFA/.test(d)) && s.done.some((d) => /undo/.test(d)), JSON.stringify(s.done));
    const posted = scopeAndDone({ jd: 'Static site on S3 with CloudFront', budget: { kind: 'fixed', amount: 120 } });
    assert(/\$120 as posted/.test(posted.priceLine), posted.priceLine);
  });

  test('a cost check deletes nothing', () => {
    const s = scopeAndDone({ jd: 'Please do a cost check and reduce our AWS bill' });
    assert(s.package?.id === 'cost-check' && s.done.some((d) => /Nothing was deleted/.test(d)), JSON.stringify(s));
  });

  // ───────── daily check ─────────

  test('saved searches carry the agreed filters', () => {
    const u = new URL(searchUrl('CloudFront', 'fixed'));
    assert(u.hostname === 'www.upwork.com' && u.searchParams.get('payment_verified') === '1' && u.searchParams.get('contractor_tier') === '1,2', u.href);
    assert(u.searchParams.get('proposals') === '0-4,5-9,10-14' && u.searchParams.get('amount') === '0-99,100-499', u.href);
    assert(new URL(searchUrl('IAM', 'hourly')).searchParams.get('workload') === 'as_needed,part_time', 'hourly filter missing');
  });

  test('the daily log counts, never goes negative, and keeps a streak', () => {
    const d1 = new Date(2026, 10, 24, 9);
    const d2 = new Date(2026, 10, 25, 9);
    let log = updateToday([], { checked: 5, go: 1 }, d1);
    log = updateToday(log, { checked: 3, toggle: 'messages' }, d2);
    log = updateToday(log, { applied: -4 }, d2);
    assert(today(log, d2).checked === 3 && today(log, d2).applied === 0 && today(log, d2).done.includes('messages'), JSON.stringify(log));
    assert(streak(log, d2) === 2, `streak ${streak(log, d2)}`);
    assert(lastWeek(log, d2).checked === 8, JSON.stringify(lastWeek(log, d2)));
    assert(dayKey(d2) === '2026-11-25', dayKey(d2));
  });

  return { allPassed: results.every((r) => r.pass), results };
}
