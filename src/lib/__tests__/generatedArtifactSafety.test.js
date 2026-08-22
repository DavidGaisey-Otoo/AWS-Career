import { generateCli, generateCloudFormation, generateTerraform } from '../scriptGenerator.js';
import { generateCfnTemplate, generateCliScript, generateTerraform as generateWalkthroughTerraform } from '../walkthroughScriptGenerator.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
const service = (id, label = id.toUpperCase()) => ({ id, label, specs: {} });

const checks = [
  ['supported placeholder-free Terraform is marked ready', () => {
    const result = generateTerraform([service('s3')]);
    assert(result.deployReady === true, 'safe Terraform incorrectly blocked');
    assert(result.coverage.pct === 100, 'coverage not reported');
  }],
  ['unsupported Terraform is visibly and mechanically blocked', () => {
    const result = generateTerraform([service('eks')]);
    assert(result.deployReady === false, 'unsupported Terraform marked ready');
    assert(result.coverage.uncovered.includes('eks'), 'uncovered service hidden');
    assert(result.code.includes('generation_safety_gate'), 'Terraform has no plan-time gate');
  }],
  ['partial CloudFormation requires explicit review and reports coverage', () => {
    const result = generateCloudFormation([service('s3'), service('eks')]);
    assert(result.deployReady === false, 'partial template marked ready');
    assert(result.coverage.pct === 50, 'partial coverage is inaccurate');
    assert(result.code.includes('IncompleteArtifactMustBeReviewed'), 'CloudFormation has no deployment rule');
  }],
  ['CLI with a password placeholder exits before AWS commands', () => {
    const result = generateCli([service('rds')]);
    assert(result.deployReady === false, 'placeholder CLI marked ready');
    assert(result.code.indexOf('exit 1') < result.code.indexOf('aws rds create-db-instance'), 'CLI gate runs after AWS command');
  }],
  ['unsupported CLI services are not silently omitted', () => {
    const result = generateCli([service('s3'), service('lambda')]);
    assert(result.coverage.uncovered.includes('lambda'), 'unsupported CLI service hidden');
    assert(result.code.includes('Unsupported services: lambda'), 'missing blocking explanation');
  }],
  ['walkthrough exports block every format when a step has no runnable snippet', () => {
    const walkthrough = { title: 'Draft', blurb: 'test', steps: [{ number: 1, title: 'Manual only', how: { console: ['Do it'] } }] };
    assert(generateCliScript(walkthrough).includes('exit 1'), 'walkthrough CLI can execute partial output');
    assert(generateCfnTemplate(walkthrough).includes('GeneratedArtifactSafetyGate'), 'walkthrough CFN can deploy partial output');
    assert(generateWalkthroughTerraform(walkthrough).includes('generation_safety_gate'), 'walkthrough Terraform can apply partial output');
  }],
];

export function runGeneratedArtifactSafetyTests() {
  const results = checks.map(([name, run]) => { try { run(); return { name, pass: true }; } catch (error) { return { name, pass: false, error: error.message }; } });
  return { results, passed: results.filter((result) => result.pass).length, total: results.length, allPassed: results.every((result) => result.pass) };
}

if (process.argv[1]?.endsWith('generatedArtifactSafety.test.js')) {
  const report = runGeneratedArtifactSafetyTests();
  for (const result of report.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
  process.exit(report.allPassed ? 0 : 1);
}
