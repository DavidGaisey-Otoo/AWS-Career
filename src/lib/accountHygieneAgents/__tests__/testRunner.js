import { runAccountHygieneReview } from '../master.js';
import { ACCT_SCENARIOS } from './fixtures.js';

export function runAllAcctTests() {
  const results = ACCT_SCENARIOS.map((s) => {
    const review = runAccountHygieneReview(s.input);
    const fired = new Set(review.findings.map((f) => f.ruleId).filter(Boolean));
    const expected = s.expectedRules || [];
    const caught = expected.filter((id) => fired.has(id));
    const missing = expected.filter((id) => !fired.has(id));
    const catchRate = expected.length === 0 ? 100 : Math.round((caught.length / expected.length) * 100);
    const overFlagged = s.expectMaxFindings != null ? Math.max(0, review.findings.length - s.expectMaxFindings) : 0;
    return { id: s.id, name: s.name, catchRate, caughtCount: caught.length, expectedCount: expected.length, missing, totalFindings: review.findings.length, score: review.score, grade: review.grade.letter, overFlagged, pass: catchRate === 100 && overFlagged === 0 };
  });
  const totalExpected = results.reduce((s, r) => s + r.expectedCount, 0);
  const totalCaught = results.reduce((s, r) => s + r.caughtCount, 0);
  const overallCatch = totalExpected === 0 ? 100 : Math.round((totalCaught / totalExpected) * 100);
  return { results, summary: { totalScenarios: results.length, passCount: results.filter((r) => r.pass).length, catchRate: overallCatch, totalExpected, totalCaught } };
}
export function printAcctReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('  ACCOUNT HYGIENE AGENT TEST REPORT');
  lines.push('═══════════════════════════════════════════════════════════════════', '');
  for (const r of report.results) {
    const tick = r.pass ? '✓' : '✗';
    lines.push(`${tick} [${r.catchRate}%] ${r.name}`);
    lines.push(`    caught ${r.caughtCount}/${r.expectedCount} · grade ${r.grade} (${r.score}) · ${r.totalFindings} total findings`);
    if (r.missing.length) lines.push(`    MISSING: ${r.missing.join(', ')}`);
    if (r.overFlagged) lines.push(`    OVER-FLAGGED: ${r.overFlagged} extra`);
  }
  lines.push('', '───────────────────────────────────────────────────────────────────');
  lines.push(`OVERALL: ${report.summary.catchRate}% catch · ${report.summary.passCount}/${report.summary.totalScenarios} scenarios pass`);
  lines.push('───────────────────────────────────────────────────────────────────');
  return lines.join('\n');
}
