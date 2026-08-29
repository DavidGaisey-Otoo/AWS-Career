const PROFILE_DEFAULTS = Object.freeze({
  learning: { monthlyCeilingUsd: 20, sessionTargetUsd: 2, leaseHours: 2, autoTerminateHours: 24 },
  freelance: { monthlyCeilingUsd: 50, sessionTargetUsd: null, leaseHours: 8, autoTerminateHours: 72 },
  employer: { monthlyCeilingUsd: null, sessionTargetUsd: null, leaseHours: null, autoTerminateHours: null },
});

const LEARNING_BLOCKED_TYPES = Object.freeze([
  'AWS::EC2::NatGateway', 'AWS::ElasticLoadBalancing::LoadBalancer',
  'AWS::ElasticLoadBalancingV2::LoadBalancer', 'AWS::EKS::Cluster',
  'AWS::OpenSearchService::Domain', 'AWS::Redshift::Cluster',
]);

export function getEnvironmentProfile(profile = 'learning', overrides = {}) {
  const id = PROFILE_DEFAULTS[profile] ? profile : 'learning';
  return { id, ...PROFILE_DEFAULTS[id], ...overrides };
}

export function extractCloudFormationTypes(template = '') {
  return [...new Set([...String(template).matchAll(/Type:\s*['"]?(AWS::[A-Za-z0-9:]+)['"]?/g)].map((match) => match[1]))];
}

/** Fail-closed policy check used before every browser CloudFormation deployment. */
export function assessEnvironmentDeployment({ template = '', profile = 'learning', monthlyEstimateMax, monthlyCeilingUsd } = {}) {
  const ceiling = Number(monthlyCeilingUsd);
  const policy = getEnvironmentProfile(profile, Number.isFinite(ceiling) ? { monthlyCeilingUsd: ceiling } : {});
  const types = extractCloudFormationTypes(template);
  const blockers = [];
  const warnings = [];
  if (!String(template).trim()) blockers.push('No CloudFormation template was generated.');
  if (profile === 'learning') {
    const expensive = types.filter((type) => LEARNING_BLOCKED_TYPES.includes(type));
    if (expensive.length) blockers.push(`Training Lab blocks higher-cost resource types: ${expensive.join(', ')}.`);
    if (types.includes('AWS::EC2::Instance') && !types.includes('AWS::Scheduler::Schedule')) blockers.push('The EC2 training template has no AWS-native automatic stop schedule.');
    if (types.includes('AWS::Backup::BackupPlan')) warnings.push('AWS Backup can create billable recovery points. Use it only for the short restore exercise and verify recovery-point deletion.');
  }
  const estimate = Number(monthlyEstimateMax);
  if (Number.isFinite(estimate) && Number.isFinite(policy.monthlyCeilingUsd) && estimate > policy.monthlyCeilingUsd) blockers.push(`Estimated monthly maximum $${estimate} exceeds the approved $${policy.monthlyCeilingUsd} ceiling.`);
  if (!Number.isFinite(estimate)) warnings.push('Current account-specific cost is unverified. Confirm plan, credits, Free Tier usage, and Pricing Calculator estimate.');
  warnings.push('AWS Budgets and billing alarms are delayed notifications/actions, not real-time hard spending caps.');
  return { ok: blockers.length === 0, profile: policy, resourceTypes: types, blockers, warnings };
}

export function requiredTeardownChecks(resourceTypes = []) {
  const checks = ['CloudFormation reports the stack deleted', 'AWS Billing/Cost Explorer reviewed after billing data catches up'];
  if (resourceTypes.includes('AWS::EC2::Instance')) checks.push('EC2 instance terminated', 'EBS volumes and snapshots checked', 'Elastic/public IP allocations checked');
  if (resourceTypes.includes('AWS::Backup::BackupPlan')) checks.push('AWS Backup recovery points and vault checked');
  if (resourceTypes.includes('AWS::Logs::LogGroup')) checks.push('CloudWatch log groups and retention checked');
  if (resourceTypes.some((type) => type.startsWith('AWS::IAM::'))) checks.push('Project IAM roles, policies, and instance profiles checked');
  return checks;
}
