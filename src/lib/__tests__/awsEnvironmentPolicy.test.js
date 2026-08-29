import { assessEnvironmentDeployment, requiredTeardownChecks } from '../awsEnvironmentPolicy.js';

export function runAwsEnvironmentPolicyTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const safeEc2 = `Resources:\n  App:\n    Type: AWS::EC2::Instance\n  Stop:\n    Type: AWS::Scheduler::Schedule`;
  test('leased EC2 training template passes policy', () => assert(assessEnvironmentDeployment({ template: safeEc2, profile: 'learning', monthlyEstimateMax: 10 }).ok, 'safe lab was blocked'));
  test('unleased EC2 training template fails closed', () => assert(!assessEnvironmentDeployment({ template: 'Type: AWS::EC2::Instance', profile: 'learning' }).ok, 'unleased EC2 passed'));
  test('higher-cost training resource is blocked', () => assert(!assessEnvironmentDeployment({ template: 'Type: AWS::EC2::NatGateway', profile: 'learning' }).ok, 'NAT gateway passed'));
  test('estimate above training ceiling is blocked', () => assert(!assessEnvironmentDeployment({ template: safeEc2, profile: 'learning', monthlyEstimateMax: 21 }).ok, 'over-budget lab passed'));
  test('teardown checklist includes detached billing risks', () => assert(requiredTeardownChecks(['AWS::EC2::Instance', 'AWS::Backup::BackupPlan']).some((x) => x.includes('recovery points')), 'backup evidence omitted'));
  return { results, allPassed: results.every((result) => result.pass) };
}
