#!/usr/bin/env node
import { runAllProposalTests, printProposalReport } from '../src/lib/proposalAgents/__tests__/testRunner.js';
const report = runAllProposalTests();
console.log(printProposalReport(report));
process.exit(report.summary.catchRate >= 90 && report.summary.passCount === report.summary.totalScenarios ? 0 : 1);
