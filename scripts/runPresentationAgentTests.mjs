#!/usr/bin/env node
import { runAllPresentationTests, printPresentationReport } from '../src/lib/presentationAgents/__tests__/testRunner.js';
const report = runAllPresentationTests();
console.log(printPresentationReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
