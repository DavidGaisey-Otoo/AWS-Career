/**
 * Convert pipeline review data into truthful user-facing delivery language.
 * A rule score measures generated artifacts; it is never proof of a successful
 * deployment or production readiness.
 */
export function getDeliveryStatus(solution = {}) {
  const review = solution.review || {};
  const readiness = review.readiness || {};
  const gates = Array.isArray(readiness.evidenceGates) ? readiness.evidenceGates : [];
  const openPreDeployGates = gates.filter((gate) => !gate.passed && gate.stage !== 'post-deploy');
  const openPostDeployGates = gates.filter((gate) => !gate.passed && gate.stage === 'post-deploy');
  const score = review.expert?.score;
  const grade = review.grade;
  const canDeploy = solution.deploy?.canOneClick === true;
  const clientReady = readiness.clientReady === true;

  return {
    score,
    grade,
    canDeploy,
    clientReady,
    openPreDeployGates,
    openPostDeployGates,
    scoreLabel: [grade, Number.isFinite(score) ? `${score}/100` : null].filter(Boolean).join(' · '),
    reviewStatus: clientReady
      ? 'Pre-deployment review gates passed'
      : `Delivery not ready — ${openPreDeployGates.length} pre-deployment gate${openPreDeployGates.length === 1 ? '' : 's'} open`,
    reviewSummary: Number.isFinite(score)
      ? `Automated design rules scored the generated artifacts ${score}/100. This is not deployment evidence or a production-readiness certification.`
      : 'Automated design review is unavailable. This is not deployment evidence or a production-readiness certification.',
    deployTitle: canDeploy
      ? 'Sandbox validation is available'
      : `Deployment blocked — ${openPreDeployGates.length} pre-deployment gate${openPreDeployGates.length === 1 ? '' : 's'} remain`,
    deploySummary: canDeploy
      ? 'Use this only for controlled AWS validation. A successful deployment and health checks must still produce evidence before any production claim.'
      : 'Resolve the requirements, coverage, review, and confidence gates below. Do not deploy or hand off this incomplete design.',
  };
}
