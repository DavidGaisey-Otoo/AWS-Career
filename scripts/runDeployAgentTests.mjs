#!/usr/bin/env node
import { runAllDeployTests, printDeployReport } from '../src/lib/deployAgents/__tests__/testRunner.js';
const report = runAllDeployTests();
console.log(printDeployReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
