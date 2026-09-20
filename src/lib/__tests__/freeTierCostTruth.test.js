import { assessFreeTierCost } from '../projectCostEstimator.js';
import { ACTIONS } from '../../data/awsActions.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

export function runFreeTierCostTruthTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test('never claims a guaranteed zero bill', () => {
    assert(assessFreeTierCost(['lambda']).canClaimGuaranteedZero === false, 'zero-cost guarantee leaked');
  });
  test('always-free services are described as estimated, not guaranteed', () => {
    const result = assessFreeTierCost(['lambda']);
    assert(result.classification === 'always-free-potential' && /estimated/i.test(result.label), 'always-free wording is not cautious');
  });
  test('services with no free tier fail the safety classification', () => {
    const result = assessFreeTierCost(['fargate']);
    assert(result.classification === 'not-free-safe' && result.noFreeTier.length === 1, 'paid service passed free-tier gate');
  });
  test('unknown pricing fails closed', () => {
    assert(assessFreeTierCost(['imaginary-service']).classification === 'unverified', 'unknown service was treated as free');
  });
  test('time-limited offers are disclosed', () => {
    assert(assessFreeTierCost(['ec2']).timeLimited.length === 1, 'time-limited eligibility was hidden');
  });

  // ───────── the action catalogue must not over-promise ─────────
  //
  // These are about what the DEPLOY buttons claim, not the estimator.
  // A cost note that quotes a free allowance the executor does not
  // qualify for is the most expensive kind of wrong answer.

  test('an action never quotes a free allowance its own call cannot get', () => {
    // The always-free 25 RCU/WCU is provisioned-capacity only. This action
    // created a PAY_PER_REQUEST table while quoting it, so a table the app
    // called free billed from the first write.
    const ddb = ACTIONS['dynamodb.create-table'];
    const mode = ddb.params.find((p) => p.id === 'billingMode');
    assert(mode, 'the billing mode is not stated, so the cost note cannot be checked against it');
    assert(mode.default === 'PROVISIONED', 'the default mode is not the one the free allowance covers: ' + mode.default);
    assert(/on-demand[^.]*billed/i.test(ddb.cost.free),
      'the cost note does not say on-demand requests are billed: ' + ddb.cost.free);
  });

  test('CloudFront quotes the allowance that actually exists', () => {
    // 50 GB / 2M requests was the superseded 12-month tier; the always-free
    // allowance has been 1 TB and 10M requests since 2021.
    const free = ACTIONS['cloudfront.create-distribution'].cost.free;
    assert(!/50 ?GB/i.test(free), 'still quoting the retired 50 GB allowance: ' + free);
    assert(/1 ?TB/i.test(free), 'does not quote the current 1 TB allowance: ' + free);
  });

  test('a 12-month allowance is never stated as if it were universal', () => {
    // An account on the credits-based plan has no 750-hour bucket. Stating
    // one is how a client gets an EC2 bill they were promised would not come.
    for (const id of ['ec2.launch-instance', 's3.create-bucket']) {
      const free = String(ACTIONS[id].cost.free);
      assert(/12[- ]month|legacy/i.test(free),
        id + ' states a limited-time allowance without saying so: ' + free);
    }
  });

  test('every BUILD action carries an honest cost shape', () => {
    for (const [id, action] of Object.entries(ACTIONS)) {
      if (action.tier !== 'BUILD') continue;
      assert(action.cost && typeof action.cost.typical === 'number',
        id + ' has no typical cost');
      assert(typeof action.cost.max === 'number',
        id + ' has no maximum cost, so nothing can bound it');
      assert(action.cost.free !== undefined, id + ' says nothing about free-tier coverage');
    }
  });

  test('no action claims to be free while its maximum cost is not zero', () => {
    for (const [id, action] of Object.entries(ACTIONS)) {
      if (action.cost?.free !== true) continue;
      assert(action.cost.max === 0,
        id + ' claims free: true while its maximum is ' + action.cost.max);
    }
  });

  return { results, allPassed: results.every((result) => result.pass) };
}
