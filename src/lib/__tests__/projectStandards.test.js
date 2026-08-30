import {
  buildEvidenceManifest, canAdvanceLifecycle, createEvidenceRecord,
  evidenceCanSupportClaim, getProjectCompletionGate, safeEvidenceFilename,
} from '../projectStandards.js';

export function runProjectStandardsTests() {
  const tests = [];
  const test = (name, fn) => { try { fn(); tests.push({ name, pass: true }); } catch (error) { tests.push({ name, pass: false, error: error.message }); } };
  const expect = (value, message) => { if (!value) throw new Error(message); };
  const evidence = createEvidenceRecord({ dataUrl: 'data:image/png;base64,abc', status: 'reviewed', redactionReviewed: true, sensitiveDataConfirmedAbsent: true });
  test('captured evidence cannot support a claim until reviewed and redaction checked', () => {
    expect(evidenceCanSupportClaim(evidence), 'reviewed evidence should be valid');
    expect(!evidenceCanSupportClaim({ ...evidence, status: 'captured' }), 'captured evidence was trusted');
  });
  test('project completion requires all steps and reviewed evidence', () => {
    const project = { buildSteps: [{ id: 'a' }] };
    expect(!getProjectCompletionGate(project, { completedSteps: {}, evidence: [] }).ready, 'incomplete project passed');
    expect(getProjectCompletionGate(project, { completedSteps: { a: true }, evidence: [evidence] }).ready, 'complete evidence-backed project failed');
  });
  test('lifecycle cannot skip stages or claim deployment without approval', () => {
    expect(!canAdvanceLifecycle('draft', 'architecture-reviewed', {}).allowed, 'stage skip allowed');
    expect(!canAdvanceLifecycle('deployment-approval', 'deployed', {}).allowed, 'unapproved deployment allowed');
  });
  test('evidence manifest excludes embedded screenshot data', () => {
    const manifest = buildEvidenceManifest({ id: 'p', title: 'Project' }, { evidence: [evidence] });
    expect(!('dataUrl' in manifest.evidence[0]), 'data URL leaked into manifest');
  });
  test('evidence filenames are portable and owner-prefixed', () => {
    expect(/^david-gaisey-otoo-/.test(safeEvidenceFilename({ owner: 'David Gaisey-Otoo' })), 'unsafe filename');
  });
  return { results: tests, allPassed: tests.every((item) => item.pass) };
}
