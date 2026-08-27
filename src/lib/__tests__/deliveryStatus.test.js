import { getDeliveryStatus } from '../deliveryStatus.js';

export function runDeliveryStatusTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  test('high design score cannot imply production readiness', () => {
    const status = getDeliveryStatus({
      review: {
        grade: 'A+', expert: { score: 100 },
        readiness: {
          clientReady: false,
          evidenceGates: [
            { id: 'requirements', label: 'Requirements confirmed', passed: false, stage: 'pre-deploy' },
            { id: 'aws', label: 'AWS accepted stack', passed: false, stage: 'post-deploy' },
          ],
        },
      },
      deploy: { canOneClick: false },
    });
    assert(status.reviewStatus.includes('Delivery not ready'), 'must display delivery not ready');
    assert(status.deployTitle.includes('Deployment blocked'), 'must block deployment');
    assert(!status.reviewSummary.toLowerCase().includes('production-ready'), 'must not claim production-ready');
    assert(status.openPreDeployGates.length === 1, 'must count pre-deploy gates separately');
  });

  test('deployable artifacts are described as sandbox validation only', () => {
    const status = getDeliveryStatus({
      review: { readiness: { clientReady: true, evidenceGates: [
        { id: 'aws', passed: false, stage: 'post-deploy' },
      ] } },
      deploy: { canOneClick: true },
    });
    assert(status.deployTitle === 'Sandbox validation is available', 'must avoid production wording');
    assert(status.openPostDeployGates.length === 1, 'must retain post-deploy evidence gate');
  });

  return { results, allPassed: results.every((result) => result.pass) };
}
