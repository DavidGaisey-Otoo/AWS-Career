#!/usr/bin/env node
/**
 * scripts/runEmailAgentTests.mjs
 *
 * Run the email agent test suite from the command line.
 *   node scripts/runEmailAgentTests.mjs
 *
 * Exits 0 if 100% catch rate, 1 otherwise.
 */

import { runAllEmailTests, printEmailReport } from '../src/lib/emailAgents/__tests__/testRunner.js';

const report = runAllEmailTests();
console.log(printEmailReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
