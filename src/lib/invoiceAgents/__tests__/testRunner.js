import { runInvoiceReview } from '../master.js';
import { INVOICE_SCENARIOS } from './fixtures.js';

export function runAllInvoiceTests() {
  const results = INVOICE_SCENARIOS.map((scenario) => {
    const review = runInvoiceReview(scenario.input);
    const firedIds = new Set(review.findings.map((f) => f.ruleId).filter(Boolean));
    const expected = scenario.expectedRules || [];
    const caught = expected.filter((id) => firedIds.has(id));
    const missing = expected.filter((id) => !firedIds.has(id));
    const catchRate = expected.length === 0 ? 100 : Math.round((caught.length / expected.length) * 100);
    const overFlagged = scenario.expectMaxFindings != null
      ? Math.max(0, review.findings.length - scenario.expectMaxFindings)
      : 0;
    return {
      id: scenario.id, name: scenario.name, catchRate,
      caughtCount: caught.length, expectedCount: expected.length, missing,
      totalFindings: review.findings.length,
      score: review.score, grade: review.grade.letter, overFlagged,
      pass: catchRate === 100 && overFlagged === 0,
    };
  });
  const totalExpected = results.reduce((s, r) => s + r.expectedCount, 0);
  const totalCaught   = results.reduce((s, r) => s + r.caughtCount, 0);
  const overallCatch  = totalExpected === 0 ? 100 : Math.round((totalCaught / totalExpected) * 100);
  const passCount     = results.filter((r) => r.pass).length;
  return { results, summary: { totalScenarios: results.length, passCount, catchRate: overallCatch, totalExpected, totalCaught } };
}

export function printInvoiceReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('  INVOICE AGENT TEST REPORT');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');
  for (const r of report.results) {
    const tick = r.pass ? '✓' : '✗';
    lines.push(`${tick} [${r.catchRate}%] ${r.name}`);
    lines.push(`    caught ${r.caughtCount}/${r.expectedCount} · grade ${r.grade} (${r.score}) · ${r.totalFindings} total findings`);
    if (r.missing.length > 0) lines.push(`    MISSING: ${r.missing.join(', ')}`);
    if (r.overFlagged > 0)    lines.push(`    OVER-FLAGGED: ${r.overFlagged} extra findings beyond ceiling`);
  }
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────────');
  lines.push(`OVERALL: ${report.summary.catchRate}% catch · ${report.summary.passCount}/${report.summary.totalScenarios} scenarios pass`);
  lines.push('───────────────────────────────────────────────────────────────────');
  return lines.join('\n');
}
