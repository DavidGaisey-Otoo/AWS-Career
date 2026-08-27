import { assessFreeTierCost } from '../projectCostEstimator.js';

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
  return { results, allPassed: results.every((result) => result.pass) };
}
