import assert from 'node:assert/strict';
import { findUnsupportedClaims } from '../claimSafety.js';
import { generateSmartProposal } from '../smartProposalGenerator.js';

export function runFreelanceClaimSafetyTests() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  check('detects claims that require evidence', () => {
    const unsafeExamples = [
      'I am AWS-certified and ready to help.',
      'I have built production stacks for enterprise clients.',
      'This is guaranteed and zero risk.',
      'I noticed you are running on AWS.',
    ];
    for (const example of unsafeExamples) {
      assert.ok(findUnsupportedClaims(example).length > 0, `Expected unsafe claim to be detected: ${example}`);
    }
  });

  check('all generated proposal variants stay evidence-first', () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const proposal = generateSmartProposal({
        jd: 'Need an entry-level freelancer to plan an S3 and CloudFront static website with a small budget.',
        profile: { name: 'Test User' },
        seed,
      });
      assert.deepEqual(findUnsupportedClaims(proposal.fullText), [], `Unsafe generated proposal seed ${seed}`);
      assert.equal(proposal.meta.claimPolicy, 'evidence-required');
    }
  });

  return { results, allPassed: results.every((result) => result.pass) };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const report = runFreelanceClaimSafetyTests();
  for (const result of report.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}`);
  process.exit(report.allPassed ? 0 : 1);
}
