#!/usr/bin/env node
import { runAllDocTests, printDocReport } from '../src/lib/docAgents/__tests__/testRunner.js';
const report = runAllDocTests();
console.log(printDocReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
