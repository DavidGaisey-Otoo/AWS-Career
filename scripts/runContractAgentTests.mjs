#!/usr/bin/env node
import { runAllContractTests, printContractReport } from '../src/lib/contractAgents/__tests__/testRunner.js';
const report = runAllContractTests();
console.log(printContractReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
