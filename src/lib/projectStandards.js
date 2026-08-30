export const PROJECT_MODES = {
  training: { label: 'Training', description: 'Simulated work using synthetic data and editable safe defaults.' },
  freelance: { label: 'Freelance', description: 'Client work requiring confirmed discovery, commercial approval, and handover.' },
  employee: { label: 'Employee', description: 'Internal work requiring ticket, change, owner, and organisational approval.' },
};

export const PROJECT_LIFECYCLE = [
  'draft', 'discovery', 'requirements-reviewed', 'assumptions-approved',
  'architecture-reviewed', 'cost-reviewed', 'security-reviewed',
  'deployment-approval', 'deployed', 'validation', 'acceptance-reviewed',
  'handover-prepared', 'teardown-approved', 'destroyed',
  'destruction-verified', 'portfolio-packaged', 'closed',
];

export const EVIDENCE_STATUSES = ['captured', 'reviewed', 'rejected'];
export const TEST_STATUSES = ['not-run', 'blocked', 'failed', 'passed'];

export function createEvidenceRecord(input = {}) {
  const now = new Date().toISOString();
  return {
    id: input.id || crypto.randomUUID?.() || `evidence-${Date.now()}`,
    projectId: input.projectId || '',
    projectOwner: input.projectOwner || 'David Gaisey-Otoo',
    title: String(input.title || 'Untitled evidence').trim(),
    requirementId: String(input.requirementId || '').trim(),
    acceptanceTestId: String(input.acceptanceTestId || '').trim(),
    environment: input.environment === 'real-aws' ? 'real-aws' : 'simulated',
    region: String(input.region || '').trim(),
    description: String(input.description || '').trim(),
    status: EVIDENCE_STATUSES.includes(input.status) ? input.status : 'captured',
    redactionReviewed: input.redactionReviewed === true,
    sensitiveDataConfirmedAbsent: input.sensitiveDataConfirmedAbsent === true,
    source: input.source === 'screen-capture' ? 'screen-capture' : 'upload',
    dataUrl: input.dataUrl || '',
    filename: input.filename || '',
    capturedAt: input.capturedAt || now,
    reviewedAt: input.status === 'reviewed' ? (input.reviewedAt || now) : null,
    notes: String(input.notes || '').trim(),
  };
}

export function evidenceCanSupportClaim(evidence) {
  return Boolean(
    evidence?.status === 'reviewed'
    && evidence?.redactionReviewed
    && evidence?.sensitiveDataConfirmedAbsent
    && evidence?.dataUrl
  );
}

export function getProjectCompletionGate(project, projectState) {
  const steps = project?.buildSteps || [];
  const missingSteps = steps.filter((step) => !projectState?.completedSteps?.[step.id]);
  const reviewedEvidence = (projectState?.evidence || projectState?.screenshots || [])
    .filter(evidenceCanSupportClaim);
  const blockers = [];
  if (missingSteps.length) blockers.push(`${missingSteps.length} build step${missingSteps.length === 1 ? '' : 's'} incomplete`);
  if (!reviewedEvidence.length) blockers.push('no reviewed, redaction-checked evidence');
  if (projectState?.liveStack) blockers.push('AWS resources are still recorded as live');
  return { ready: blockers.length === 0, blockers, missingSteps, reviewedEvidence };
}

export function canAdvanceLifecycle(current, next, projectState = {}) {
  const from = PROJECT_LIFECYCLE.indexOf(current);
  const to = PROJECT_LIFECYCLE.indexOf(next);
  if (to < 0) return { allowed: false, reason: 'Unknown lifecycle stage' };
  if (from >= 0 && to > from + 1) return { allowed: false, reason: 'Complete the intervening lifecycle stages first' };
  if (next === 'deployed' && projectState.deploymentApproved !== true) return { allowed: false, reason: 'Deployment approval has not been recorded' };
  if (next === 'acceptance-reviewed' && !(projectState.evidence || []).some(evidenceCanSupportClaim)) return { allowed: false, reason: 'Reviewed evidence is required before acceptance' };
  if (next === 'destroyed' && projectState.teardownApproved !== true) return { allowed: false, reason: 'Teardown approval has not been recorded' };
  if (next === 'destruction-verified' && projectState.destructionEvidenceReviewed !== true) return { allowed: false, reason: 'AWS destruction evidence has not been reviewed' };
  return { allowed: true, reason: '' };
}

export function buildEvidenceManifest(project, projectState = {}) {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    project: {
      id: project?.id || '', title: project?.title || '',
      owner: projectState.projectOwner || 'David Gaisey-Otoo',
      mode: projectState.projectMode || 'training',
      lifecycleStage: projectState.lifecycleStage || 'draft',
    },
    warning: 'Generated plans and simulated captures are not proof of a real deployment.',
    evidence: (projectState.evidence || []).map(({ dataUrl, ...item }) => ({
      ...item, embeddedImage: Boolean(dataUrl),
    })),
  };
}

export function safeEvidenceFilename({ owner = 'David Gaisey-Otoo', project = 'project', step = 'evidence', date = new Date() } = {}) {
  const slug = (value) => String(value).toLowerCase().normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${slug(owner)}-${slug(project)}-${slug(step)}-${date.toISOString().slice(0, 10)}.png`;
}
