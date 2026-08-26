import { buildOpportunityLearningProfile, scoreOpportunity } from '../opportunityLearningEngine.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

export function runOpportunityLearningTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test('practice preferences never inflate real outcome sample size', () => {
    const profile = buildOpportunityLearningProfile({ interactions: [{ outcome: 'interested', skills: ['s3'] }] });
    assert(profile.sampleSize === 0, `expected 0 real outcomes, got ${profile.sampleSize}`);
    assert(profile.stage === 'rules-only', 'must remain rules-only');
  });

  test('personalization is withheld until five real outcomes', () => {
    const proposals = Array.from({ length: 4 }, () => ({ status: 'applied', skills: ['lambda'] }));
    assert(buildOpportunityLearningProfile({ proposals }).stage === 'rules-only', 'personalized too early');
    assert(buildOpportunityLearningProfile({ proposals: [...proposals, { status: 'interview', skills: ['lambda'] }] }).stage === 'personalizing', 'did not personalize at threshold');
  });

  test('portfolio evidence improves an otherwise identical match', () => {
    const gig = { level: 'Junior', skills: ['s3', 'cloudfront'] };
    const base = scoreOpportunity(gig, buildOpportunityLearningProfile());
    const evidenced = scoreOpportunity(gig, buildOpportunityLearningProfile({ portfolioSkills: ['s3', 'cloudfront'] }));
    assert(evidenced.score > base.score, 'evidence did not improve score');
  });

  test('senior opportunities remain conservative for a new profile', () => {
    const result = scoreOpportunity({ level: 'Senior', skills: ['vpc', 'iam', 'cloudformation'] }, buildOpportunityLearningProfile());
    assert(result.score < 48 && result.stars <= 2 && result.confidence === 'low', 'senior work was over-recommended');
  });

  test('every recommendation has stars, action advice and a study next step', () => {
    const result = scoreOpportunity({ level: 'Mid', skills: ['lambda', 'dynamodb'] }, buildOpportunityLearningProfile());
    assert(result.stars >= 1 && result.stars <= 5, 'invalid stars');
    assert(Boolean(result.action), 'missing action advice');
    assert(result.study.length > 0, 'missing study advice');
  });

  return { results, allPassed: results.every((result) => result.pass) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runOpportunityLearningTests();
  report.results.forEach((result) => console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`));
  process.exit(report.allPassed ? 0 : 1);
}
