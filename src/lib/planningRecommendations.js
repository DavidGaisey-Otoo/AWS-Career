import { assessFreeTierCost } from './projectCostEstimator.js';

function roundUp(value, step = 5) {
  return Math.ceil(Math.max(0, value) / step) * step;
}

/** Build editable planning defaults. These remain suggestions until approved. */
export function recommendPlanningDecisions(solution) {
  const serviceIds = (solution?.services || []).map((service) => service.id);
  const region = solution?.region?.primary || 'us-east-1';
  const cost = assessFreeTierCost(serviceIds, region);
  const priced = cost.unknownServices.length === 0;
  const monthlyBudget = priced ? Math.max(5, roundUp(cost.afterFreeTier.max, 5)) : null;
  const estimatedDays = Number(solution?.plan?.estimatedDays || 0);
  const timelineWeeks = estimatedDays <= 5 ? 2 : estimatedDays <= 10 ? 3 : Math.max(4, Math.ceil(estimatedDays / 5));

  return {
    region,
    monthlyBudget,
    timelineWeeks,
    dataClassification: 'Synthetic, non-sensitive learning data only',
    backupRetentionDays: 7,
    rpoHours: 24,
    rtoHours: 4,
    regionReason: (solution?.region?.reasons || [])[0]
      || 'Suggested from the stated audience, compliance needs, and available AWS Regions.',
    budgetReason: priced
      ? `Rounded up from the current estimated range of $${cost.afterFreeTier.min}–$${cost.afterFreeTier.max}/month. Alerts notify; they do not stop spending.`
      : `Pricing is incomplete for: ${cost.unknownServices.join(', ')}. Enter a reviewed ceiling before approval.`,
    timelineReason: `Allows time for discovery, implementation, testing, evidence, documentation, and teardown—not only resource creation.`,
    priced,
  };
}

export function appendApprovedPlanningDecisions(brief, decisions) {
  const region = String(decisions?.region || '').trim();
  const budget = Number(decisions?.monthlyBudget);
  const weeks = Number(decisions?.timelineWeeks);
  const dataClassification = String(decisions?.dataClassification || '').trim();
  const retentionDays = Number(decisions?.backupRetentionDays);
  const rpoHours = Number(decisions?.rpoHours);
  const rtoHours = Number(decisions?.rtoHours);
  if (!/^([a-z]{2}(?:-gov)?-[a-z]+-\d)$/.test(region)) throw new Error('Enter a valid AWS Region, such as eu-west-2.');
  if (!Number.isFinite(budget) || budget <= 0) throw new Error('Enter a positive monthly AWS budget.');
  if (!Number.isInteger(weeks) || weeks <= 0) throw new Error('Enter a whole-number timeline in weeks.');
  if (!dataClassification) throw new Error('Enter the approved data classification.');
  if (!Number.isInteger(retentionDays) || retentionDays <= 0) throw new Error('Enter whole-number backup retention days.');
  if (!Number.isFinite(rpoHours) || rpoHours <= 0) throw new Error('Enter a positive RPO in hours.');
  if (!Number.isFinite(rtoHours) || rtoHours <= 0) throw new Error('Enter a positive RTO in hours.');

  const marker = 'Approved planning decisions:';
  const base = String(brief || '').split(`\n\n${marker}`)[0].trim();
  return `${base}\n\n${marker}
- AWS region: ${region}.
- Maximum monthly AWS budget: AWS spend under $${budget}/month. Budget alerts are notifications, not a hard spending cap.
- Target completion timeline: ${weeks} weeks.
- Data classification: ${dataClassification}.
- Backup retention: ${retentionDays} days.
- Recovery point objective (RPO): ${rpoHours} hours.
- Recovery time objective (RTO): ${rtoHours} hours.
- These decisions were explicitly approved by the user for planning. They do not authorize deployment.
- AWS write actions still require separate explicit human approval.`;
}
