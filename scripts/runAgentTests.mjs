// Node script to actually run the test suites and print results.
// Run with: node scripts/runAgentTests.mjs  (or `npm test`)
import { runAllTests, printReport } from '../src/lib/expertAgents/__tests__/testRunner.js';
import { runPipelineTests, printPipelineReport } from '../src/lib/__tests__/gigSolutionPipeline.test.js';
import { runGistSyncTests, printGistSyncReport } from '../src/lib/__tests__/gistSync.test.js';
import { runCustomProjectTests, printCustomProjectReport } from '../src/lib/__tests__/customProjects.test.js';
import { runQuestionBankTests, printQuestionBankReport } from '../src/lib/__tests__/questionBank.test.js';
import { runDrawioBridgeTests } from '../src/lib/__tests__/drawioBridge.test.js';

const agents = runAllTests();
console.log(printReport(agents));

const pipeline = runPipelineTests();
console.log('');
console.log(printPipelineReport(pipeline));

const sync = runGistSyncTests();
console.log('');
console.log(printGistSyncReport(sync));

const custom = runCustomProjectTests();
console.log('');
console.log(printCustomProjectReport(custom));

const bank = runQuestionBankTests();
console.log('');
console.log(printQuestionBankReport(bank));

const drawio = runDrawioBridgeTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  DRAW.IO BRIDGE SECURITY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of drawio.results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

const agentsOk = agents.summary.catchRate >= 85;
const pipelineOk = pipeline.allPassed;
const syncOk = sync.allPassed;
const customOk = custom.allPassed;
const bankOk = bank.allPassed;
const drawioOk = drawio.allPassed;
const allOk = agentsOk && pipelineOk && syncOk && customOk && bankOk && drawioOk;

console.log('');
console.log(allOk
  ? '✅ ALL SUITES PASSED'
  : `❌ FAILED — agents:${agentsOk ? 'ok' : 'FAIL'} pipeline:${pipelineOk ? 'ok' : 'FAIL'} `
    + `sync:${syncOk ? 'ok' : 'FAIL'} custom:${customOk ? 'ok' : 'FAIL'} bank:${bankOk ? 'ok' : 'FAIL'} `
    + `drawio:${drawioOk ? 'ok' : 'FAIL'}`);

process.exit(allOk ? 0 : 1);
