// Node script to actually run the test suites and print results.
// Run with: node scripts/runAgentTests.mjs  (or `npm test`)
import { runAllTests, printReport } from '../src/lib/expertAgents/__tests__/testRunner.js';
import { runPipelineTests, printPipelineReport } from '../src/lib/__tests__/gigSolutionPipeline.test.js';
import { runGistSyncTests, printGistSyncReport } from '../src/lib/__tests__/gistSync.test.js';

const agents = runAllTests();
console.log(printReport(agents));

const pipeline = runPipelineTests();
console.log('');
console.log(printPipelineReport(pipeline));

const sync = runGistSyncTests();
console.log('');
console.log(printGistSyncReport(sync));

const agentsOk = agents.summary.catchRate >= 85;
const pipelineOk = pipeline.allPassed;
const syncOk = sync.allPassed;
const allOk = agentsOk && pipelineOk && syncOk;

console.log('');
console.log(allOk
  ? '✅ ALL SUITES PASSED'
  : `❌ FAILED — agents:${agentsOk ? 'ok' : 'FAIL'} pipeline:${pipelineOk ? 'ok' : 'FAIL'} sync:${syncOk ? 'ok' : 'FAIL'}`);

process.exit(allOk ? 0 : 1);
