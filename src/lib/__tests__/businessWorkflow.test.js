import { createManualPaymentRecord, assessMilestoneAcceptance } from '../businessWorkflow.js';
import { getStats } from '../proposalLog.js';

function assert(value, message) { if (!value) throw new Error(message); }

export function runBusinessWorkflowTests() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  check('manual payment records never claim processor verification', () => {
    const record = createManualPaymentRecord('WISE-123', '2026-01-01T00:00:00.000Z');
    assert(record.processorVerified === false, 'claimed processor verification');
    assert(record.paymentVerification === 'manual-record', 'missing manual marker');
  });
  check('payment evidence is required', () => {
    let threw = false;
    try { createManualPaymentRecord(''); } catch { threw = true; }
    assert(threw, 'accepted an evidence-free payment record');
  });
  check('client acceptance needs status, approver, and evidence', () => {
    assert(!assessMilestoneAcceptance({ acceptanceStatus: 'accepted' }).clientAccepted, 'accepted without evidence');
    assert(assessMilestoneAcceptance({ acceptanceStatus: 'accepted', acceptedBy: 'Client', acceptanceEvidence: 'email-42' }).clientAccepted, 'rejected evidenced acceptance');
  });
  check('draft proposals do not inflate sent or win-rate totals', () => {
    const stats = getStats([{ status: 'draft' }, { status: 'sent' }, { status: 'won' }]);
    assert(stats.drafts === 1 && stats.total === 2 && stats.won === 1, 'draft counted as submitted');
  });
  return { results, allPassed: results.every((r) => r.pass) };
}

const report = runBusinessWorkflowTests();
for (const result of report.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
if (!report.allPassed) process.exitCode = 1;
