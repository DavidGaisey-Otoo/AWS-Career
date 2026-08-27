// Node script to actually run the test suites and print results.
// Run with: node scripts/runAgentTests.mjs  (or `npm test`)
import { runAllTests, printReport } from '../src/lib/expertAgents/__tests__/testRunner.js';
import { runPipelineTests, printPipelineReport } from '../src/lib/__tests__/gigSolutionPipeline.test.js';
import { runGistSyncTests, printGistSyncReport } from '../src/lib/__tests__/gistSync.test.js';
import { runCustomProjectTests, printCustomProjectReport } from '../src/lib/__tests__/customProjects.test.js';
import { runQuestionBankTests, printQuestionBankReport } from '../src/lib/__tests__/questionBank.test.js';
import { runDrawioBridgeTests } from '../src/lib/__tests__/drawioBridge.test.js';
import { runDeploySafetyTests } from '../src/lib/__tests__/deploySafety.test.js';
import { runBusinessWorkflowTests } from '../src/lib/__tests__/businessWorkflow.test.js';
import { runGeneratedArtifactSafetyTests } from '../src/lib/__tests__/generatedArtifactSafety.test.js';
import { runEntryLevelGigMatcherTests } from '../src/lib/__tests__/entryLevelGigMatcher.test.js';
import { runCareerProgressionTests } from '../src/lib/__tests__/careerProgression.test.js';
import { runGithubImporterTests } from '../src/lib/__tests__/githubProjectImporter.test.js';
import { runLazyRecoveryTests } from '../src/lib/__tests__/lazyWithRecovery.test.js';
import { runFreelanceClaimSafetyTests } from '../src/lib/__tests__/freelanceClaimSafety.test.js';
import { runProfessionalBriefBuilderTests } from '../src/lib/__tests__/professionalBriefBuilder.test.js';
import { runDeliveryStatusTests } from '../src/lib/__tests__/deliveryStatus.test.js';

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

const deploySafety = runDeploySafetyTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  DEPLOYMENT SAFETY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of deploySafety.results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

const business = runBusinessWorkflowTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  BUSINESS WORKFLOW SAFETY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of business.results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

const artifacts = runGeneratedArtifactSafetyTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  GENERATED ARTIFACT SAFETY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of artifacts.results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

const entryLevel = runEntryLevelGigMatcherTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  ENTRY-LEVEL GIG MATCHER TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of entryLevel.results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}

const career = runCareerProgressionTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  CAREER PROGRESSION TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of career.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);

const githubImporter = runGithubImporterTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  GITHUB PROJECT IMPORTER SAFETY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of githubImporter.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);

const lazyRecovery = runLazyRecoveryTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  DEPLOYMENT VERSION RECOVERY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of lazyRecovery.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);

const freelanceClaims = runFreelanceClaimSafetyTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  FREELANCE CLAIM SAFETY TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of freelanceClaims.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);

const professionalBrief = runProfessionalBriefBuilderTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  PROFESSIONAL BRIEF BUILDER TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of professionalBrief.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);

const deliveryStatus = runDeliveryStatusTests();
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  DELIVERY STATUS TRUTH TESTS');
console.log('═══════════════════════════════════════════════════════════════');
for (const result of deliveryStatus.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);

const agentsOk = agents.summary.catchRate >= 85;
const pipelineOk = pipeline.allPassed;
const syncOk = sync.allPassed;
const customOk = custom.allPassed;
const bankOk = bank.allPassed;
const drawioOk = drawio.allPassed;
const deploySafetyOk = deploySafety.allPassed;
const businessOk = business.allPassed;
const artifactsOk = artifacts.allPassed;
const entryLevelOk = entryLevel.allPassed;
const careerOk = career.allPassed;
const githubImporterOk = githubImporter.allPassed;
const lazyRecoveryOk = lazyRecovery.allPassed;
const freelanceClaimsOk = freelanceClaims.allPassed;
const professionalBriefOk = professionalBrief.allPassed;
const deliveryStatusOk = deliveryStatus.allPassed;
const allOk = agentsOk && pipelineOk && syncOk && customOk && bankOk && drawioOk && deploySafetyOk && businessOk && artifactsOk && entryLevelOk && careerOk && githubImporterOk && lazyRecoveryOk && freelanceClaimsOk && professionalBriefOk && deliveryStatusOk;

console.log('');
console.log(allOk
  ? '✅ ALL SUITES PASSED'
  : `❌ FAILED — agents:${agentsOk ? 'ok' : 'FAIL'} pipeline:${pipelineOk ? 'ok' : 'FAIL'} `
    + `sync:${syncOk ? 'ok' : 'FAIL'} custom:${customOk ? 'ok' : 'FAIL'} bank:${bankOk ? 'ok' : 'FAIL'} `
    + `drawio:${drawioOk ? 'ok' : 'FAIL'} deploySafety:${deploySafetyOk ? 'ok' : 'FAIL'} `
    + `business:${businessOk ? 'ok' : 'FAIL'} artifacts:${artifactsOk ? 'ok' : 'FAIL'} entryLevel:${entryLevelOk ? 'ok' : 'FAIL'} career:${careerOk ? 'ok' : 'FAIL'} githubImporter:${githubImporterOk ? 'ok' : 'FAIL'} lazyRecovery:${lazyRecoveryOk ? 'ok' : 'FAIL'} freelanceClaims:${freelanceClaimsOk ? 'ok' : 'FAIL'} professionalBrief:${professionalBriefOk ? 'ok' : 'FAIL'} deliveryStatus:${deliveryStatusOk ? 'ok' : 'FAIL'}`);

process.exit(allOk ? 0 : 1);
