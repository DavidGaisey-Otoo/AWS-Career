// Node script to actually run the agent test suite and print results.
// Run with: node scripts/runAgentTests.mjs
import { runAllTests, printReport } from '../src/lib/expertAgents/__tests__/testRunner.js';
const report = runAllTests();
console.log(printReport(report));
process.exit(report.summary.catchRate >= 85 ? 0 : 1);
