#!/usr/bin/env node
import { runAllIntTests, printIntReport } from '../src/lib/interviewAgents/__tests__/testRunner.js';
const report = runAllIntTests();
console.log(printIntReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
