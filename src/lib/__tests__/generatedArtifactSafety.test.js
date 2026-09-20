import { generateCli, generateCloudFormation, generateTerraform } from '../scriptGenerator.js';
import { generateCfnTemplate, generateCliScript, generateTerraform as generateWalkthroughTerraform } from '../walkthroughScriptGenerator.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
const service = (id, label = id.toUpperCase()) => ({ id, label, specs: {} });

const checks = [
  ['a client deliverable never names the tool that made it', () => {
    // These files are handed to clients. A template announcing it came
    // from someone's career-training app is not a deliverable.
    const services = [service('s3'), service('lambda')];
    for (const [name, out] of [
      ['terraform', generateTerraform(services, { mode: 'prod', author: 'David Gaisey-Otoo' }).code],
      ['cloudformation', generateCloudFormation(services, { mode: 'prod', author: 'David Gaisey-Otoo' }).code],
      ['cli', generateCli(services, { mode: 'prod', author: 'David Gaisey-Otoo' }).code],
    ]) {
      assert(!/Career Launchpad/i.test(out), name + ' still advertises the tool');
      assert(!/Master Intelligence/i.test(out), name + ' still carries an internal product name');
    }
  }],
  ['the author is credited when known', () => {
    const out = generateTerraform([service('s3')], { mode: 'prod', author: 'David Gaisey-Otoo' }).code;
    assert(/Prepared by David Gaisey-Otoo/.test(out), 'the author is not credited in the header');
    assert(/PreparedBy\s*=\s*"David Gaisey-Otoo"/.test(out), 'the resource tag does not carry the author');
  }],
  ['with no author, nothing is attributed at all', () => {
    // Silence is professional. The wrong attribution is not, and the tag
    // would sit in the client's console and bill indefinitely.
    const out = generateTerraform([service('s3')], { mode: 'prod' }).code;
    assert(!/GeneratedBy/.test(out), 'an attribution tag was emitted with nobody to attribute to');
    assert(!/PreparedBy/.test(out), 'an empty PreparedBy tag was emitted');
    assert(!/Prepared by\s*$/m.test(out), 'a dangling "Prepared by" line was emitted');
  }],
  ['a client deliverable carries no emoji', () => {
    const out = generateCli([service('s3')], { mode: 'prod', author: 'D' }).code;
    assert(!/[\u{1F300}-\u{1FAFF}]/u.test(out), 'emoji leaked into a client deliverable');
  }],
  ['test-sized output still says so', () => {
    // The marker is a safety signal, not decoration — losing it would let
    // free-tier sizing reach production unremarked.
    const out = generateTerraform([service('s3')], { mode: 'test' }).code;
    assert(/TEST DEPLOYMENT/.test(out), 'the test marker was lost');
    assert(/not for production/i.test(out), 'the test marker does not say why it matters');
  }],

  ['a generated DynamoDB table is provisioned inside the free allowance', () => {
    // Both generators emitted PAY_PER_REQUEST while the surrounding text
    // called the table always-free. On-demand bills every read and write
    // from the first one; the always-free 25 RCU/WCU is provisioned only.
    const tf = generateTerraform([service('dynamodb', 'DynamoDB')]);
    const cfn = generateCloudFormation([service('dynamodb', 'DynamoDB')]);
    for (const [name, out] of [['terraform', tf.code], ['cloudformation', cfn.code]]) {
      assert(!/PAY_PER_REQUEST/.test(out),
        name + ' creates an on-demand table while the app calls it free');
      assert(/PROVISIONED/i.test(out), name + ' sets no billing mode at all');
    }
  }],
  ['a refused CLI script names something that does work', () => {
    // Refusing without a way forward leaves you holding a design the app
    // has just told you it cannot deploy.
    const result = generateCli([service('lambda', 'Lambda'), service('dynamodb', 'DynamoDB')]);
    if (result.deployReady) return;
    assert(/CloudFormation|Terraform/i.test(result.code),
      'the CLI refused without naming a template that is complete');
  }],

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
  ['common cross-domain CloudFormation services have complete generated coverage', () => {
    const ids = [
      'route-table', 'nacl', 'ebs', 'rds-multiaz', 'ec2-t3-large',
      'sqs', 'eventbridge', 'ecr', 'ecs', 'guardduty', 'xray',
    ];
    const result = generateCloudFormation(ids.map((id) => service(id)), {
      mode: 'test', region: 'us-east-1', projectName: 'coverage-regression',
    });
    assert(result.deployReady === true, `common services blocked: ${result.coverage.uncovered.join(', ')}`);
    assert(result.coverage.pct === 100, `common coverage is ${result.coverage.pct}%`);
    assert(result.code.includes('AWS::ECS::Service'), 'ECS service missing');
    assert(result.code.includes('AWS::SQS::Queue'), 'SQS queue missing');
    assert(result.code.includes('AWS::GuardDuty::Detector'), 'GuardDuty detector missing');
    assert(result.code.includes('AWS::Budgets::Budget') === false, 'unrequested budget resource was added');
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
