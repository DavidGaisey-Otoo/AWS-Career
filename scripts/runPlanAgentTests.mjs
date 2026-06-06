#!/usr/bin/env node
import { runAllPlanTests, printPlanReport } from '../src/lib/projectPlanAgents/__tests__/testRunner.js';
const report = runAllPlanTests();
console.log(printPlanReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
