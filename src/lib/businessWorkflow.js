/** Truth-preserving helpers for local freelance recordkeeping. */
export function createManualPaymentRecord(reference, at = new Date().toISOString()) {
  const evidence = String(reference || '').trim();
  if (!evidence) throw new Error('A transaction reference or receipt note is required.');
  return {
    status: 'paid',
    paidAt: at,
    paymentEvidence: evidence,
    paymentVerification: 'manual-record',
    processorVerified: false,
  };
}

export function assessMilestoneAcceptance(invoice = {}) {
  const status = invoice.acceptanceStatus || 'pending';
  const accepted = status === 'accepted';
  const hasEvidence = !!String(invoice.acceptanceEvidence || '').trim();
  const hasApprover = !!String(invoice.acceptedBy || '').trim();
  return {
    status,
    clientAccepted: accepted && hasEvidence && hasApprover,
    missing: [
      ...(!accepted ? ['client acceptance'] : []),
      ...(!hasApprover ? ['accepting person'] : []),
      ...(!hasEvidence ? ['acceptance evidence'] : []),
    ],
  };
}

export function findDraftMarkers(text) {
  const value = String(text || '');
  const markers = [
    ...(value.match(/\{\{?[^{}]+\}\}?/g) || []),
    ...(value.match(/\[[^\]\n]+\]/g) || []),
  ];
  return [...new Set(markers)];
}
