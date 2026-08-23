import { assessEntryLevelGig, buildEntryLevelApplicationBrief } from '../entryLevelGigMatcher.js';

function assert(value, message) { if (!value) throw new Error(message); }

export function runEntryLevelGigMatcherTests() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  check('junior AWS support work is recommended', () => {
    const fit = assessEntryLevelGig({ title: 'Junior AWS Cloud Support', description: 'Document VPC routing and troubleshoot EC2', skills: ['AWS'] });
    assert(fit.classification === 'good-fit', `classified ${fit.classification}`);
  });
  check('senior production work is rejected', () => {
    const fit = assessEntryLevelGig({ title: 'Senior EKS Lead', description: '8+ years, 24/7 on-call and production outage ownership' });
    assert(fit.classification === 'not-recommended', `classified ${fit.classification}`);
    assert(fit.requiresMentorReview, 'missing mentor-review gate');
  });
  check('proposal brief prevents fabricated experience and auto-submit', () => {
    const brief = buildEntryLevelApplicationBrief({ title: 'AWS task', description: 'Configure S3' });
    assert(brief.includes('Do not invent certifications'), 'missing fabrication guardrail');
    assert(brief.includes('draft only'), 'missing draft-only guardrail');
    assert(brief.includes('Never claim deployment succeeded without AWS evidence'), 'missing evidence gate');
  });
  return { results, allPassed: results.every((r) => r.pass) };
}
