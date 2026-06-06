#!/usr/bin/env node
import { runAllAcctTests, printAcctReport } from '../src/lib/accountHygieneAgents/__tests__/testRunner.js';
const report = runAllAcctTests();
console.log(printAcctReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
