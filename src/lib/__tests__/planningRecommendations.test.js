import { appendApprovedPlanningDecisions, recommendPlanningDecisions } from '../planningRecommendations.js';
import { runPipeline } from '../gigSolutionPipeline.js';

export function runPlanningRecommendationTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  test('recommendations include editable region budget and timeline', () => {
    const solution = runPipeline('Build a Windows Server lab using EC2, Systems Manager, CloudWatch, AWS Backup, and IAM.');
    const recommendation = recommendPlanningDecisions(solution);
    assert(recommendation.environmentMode === 'local-zero', 'safe local environment is not the default');
    assert(recommendation.region, 'region missing');
    assert(recommendation.monthlyBudget > 0, 'budget missing');
    assert(recommendation.timelineWeeks >= 1, 'timeline missing');
    assert(recommendation.dataClassification, 'data classification missing');
    assert(recommendation.backupRetentionDays >= 1, 'backup retention missing');
    assert(recommendation.rpoHours > 0 && recommendation.rtoHours > 0, 'recovery objectives missing');
  });

  test('approved decisions become detectable facts without authorizing deployment', () => {
    const brief = appendApprovedPlanningDecisions('Build a Windows Server lab.', {
      environmentMode: 'aws-short-lived', labDurationHours: 2,
      region: 'eu-west-2', monthlyBudget: 30, timelineWeeks: 2,
      dataClassification: 'Synthetic non-sensitive data', backupRetentionDays: 7, rpoHours: 24, rtoHours: 4,
    });
    const solution = runPipeline(brief);
    assert(solution.region.primary === 'eu-west-2', 'approved region was not used');
    assert(solution.analysis.budget, 'approved budget was not detected');
    assert(solution.understanding.extracted.timeline, 'approved timeline was not detected');
    assert(brief.includes('do not authorize deployment'), 'approval boundary was lost');
    assert(solution.deploy.environmentMode === 'aws-short-lived', 'AWS environment was not retained');
  });

  test('strict zero-cost local lab mechanically disables AWS deployment', () => {
    const brief = appendApprovedPlanningDecisions('Build a Windows Server lab using EC2, IAM, Systems Manager, CloudWatch, and AWS Backup.', {
      environmentMode: 'local-zero', labDurationHours: 2,
      region: 'us-east-1', monthlyBudget: 0, timelineWeeks: 2,
      dataClassification: 'Synthetic non-sensitive data', backupRetentionDays: 7, rpoHours: 24, rtoHours: 4,
    });
    const solution = runPipeline(brief);
    assert(brief.includes('AWS deployment is prohibited'), 'local prohibition was not recorded');
    assert(solution.deploy.localOnly, 'solution was not identified as local-only');
    assert(!solution.deploy.canOneClick, 'local lab exposed an AWS deployment action');
    assert(solution.review.readiness.evidenceGates.some((gate) => gate.stage === 'local-validation'), 'local evidence gates were not produced');
  });

  test('invalid decisions cannot be approved', () => {
    let failed = false;
    try { appendApprovedPlanningDecisions('brief', { environmentMode: 'aws-short-lived', region: 'London', monthlyBudget: 0, timelineWeeks: 0 }); }
    catch { failed = true; }
    assert(failed, 'invalid recommendations were accepted');
  });

  return { results, allPassed: results.every((result) => result.pass) };
}
