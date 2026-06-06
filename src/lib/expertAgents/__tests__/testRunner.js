/**
 * testRunner.js — synthetic-brief test harness for the expert agents.
 *
 * Each scenario defines:
 *   - brief: realistic project description
 *   - services: list of detected service IDs
 *   - expectedRules: array of ruleIds that MUST fire (the "should catch" list)
 *   - shouldNotFire: array of ruleIds that should NOT fire (false-positive check)
 *   - metadata: optional context (region, level, etc.)
 *
 * Run via runAllTests() which:
 *   1. Sends each scenario through runExpertReview()
 *   2. For each scenario, computes:
 *        catch rate  = (expected rules that fired) / (expected rules total)
 *        false positive rate = (shouldNotFire rules that fired) / total
 *   3. Returns a summary with per-scenario + overall scores
 *
 * NOT a Jest suite — runs as plain JS so it can be invoked from anywhere
 * (CLI script, browser console, or piped into the audit report).
 */

import { runExpertReview } from '../master.js';
import { SCENARIOS } from './fixtures.js';

export function runAllTests() {
  const results = [];
  let totalExpected = 0;
  let totalCaught = 0;
  let totalShouldNotFire = 0;
  let totalFalsePositives = 0;

  for (const scenario of SCENARIOS) {
    const review = runExpertReview({
      brief: scenario.brief,
      services: scenario.services,
      region: scenario.region,
      level: scenario.level || 'intermediate',
      approach: scenario.approach || 'terraform',
      solutionText: scenario.solutionText || '',
      metadata: scenario.metadata || {},
    });

    const firedRules = new Set(review.findings.map((f) => f.ruleId).filter(Boolean));

    const caught = scenario.expectedRules.filter((r) => firedRules.has(r));
    const missed = scenario.expectedRules.filter((r) => !firedRules.has(r));
    const falsePositives = (scenario.shouldNotFire || []).filter((r) => firedRules.has(r));

    totalExpected += scenario.expectedRules.length;
    totalCaught += caught.length;
    totalShouldNotFire += (scenario.shouldNotFire || []).length;
    totalFalsePositives += falsePositives.length;

    results.push({
      id: scenario.id,
      name: scenario.name,
      expected: scenario.expectedRules.length,
      caught: caught.length,
      missed,
      falsePositives,
      catchRate: scenario.expectedRules.length === 0 ? 100 :
        Math.round((caught.length / scenario.expectedRules.length) * 100),
      grade: review.grade.letter,
      score: review.score,
      totalFindings: review.findings.length,
    });
  }

  const overallCatchRate = totalExpected === 0 ? 100 :
    Math.round((totalCaught / totalExpected) * 100);
  const overallFalsePositiveRate = totalShouldNotFire === 0 ? 0 :
    Math.round((totalFalsePositives / totalShouldNotFire) * 100);

  return {
    scenarios: results,
    summary: {
      totalScenarios: results.length,
      totalExpectedRules: totalExpected,
      totalCaught,
      catchRate: overallCatchRate,
      falsePositiveRate: overallFalsePositiveRate,
      passingScenarios: results.filter((r) => r.catchRate >= 85).length,
    },
  };
}

/** Print a console-friendly report */
export function printReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  AGENT TEST REPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  for (const s of report.scenarios) {
    const mark = s.catchRate >= 85 ? '✓' : s.catchRate >= 70 ? '~' : '✗';
    lines.push(`${mark} [${s.catchRate}%] ${s.name}`);
    lines.push(`     caught ${s.caught}/${s.expected}  ·  grade ${s.grade} (${s.score})  ·  ${s.totalFindings} total findings`);
    if (s.missed.length > 0) {
      lines.push(`     MISSED: ${s.missed.join(', ')}`);
    }
    if (s.falsePositives.length > 0) {
      lines.push(`     FALSE POSITIVES: ${s.falsePositives.join(', ')}`);
    }
  }
  lines.push('---------------------------------------------------------------');
  lines.push(`OVERALL: ${report.summary.catchRate}% catch · ${report.summary.passingScenarios}/${report.summary.totalScenarios} scenarios pass`);
  lines.push('═══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}
