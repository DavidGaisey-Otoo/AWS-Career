import { generateCli, generateCloudFormation, generateTerraform } from '../scriptGenerator.js';
import { generateCfnTemplate, generateCliScript, generateTerraform as generateWalkthroughTerraform } from '../walkthroughScriptGenerator.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
const service = (id, label = id.toUpperCase()) => ({ id, label, specs: {} });

const checks = [
  ['every generated resource states what it costs', () => {
    // The cost note is the point. A resource that appears in a template
    // with no figure beside it is how a £32/month NAT gateway arrives
    // unannounced on someone who asked for a cheap site.
    const CHARGED = ['alb','nlb','nat-gateway','elastic-ip','efs','secrets-manager','waf',
      'aurora','elasticache','redshift','eks','ec2-autoscale','kinesis','glacier','route53'];
    for (const id of CHARGED) {
      const code = generateCloudFormation([service(id)], { mode: "prod" }).code;
      assert(/Cost:/.test(code), id + " generates a resource with no cost note");
    }
  }],
  ['the expensive ones name a cheaper way', () => {
    // Someone reaching for Redshift on a small project should meet the
    // alternative before the invoice does.
    for (const id of ['nat-gateway','eks','redshift','aurora','kinesis','secrets-manager','alb']) {
      const code = generateCloudFormation([service(id)], { mode: "prod" }).code;
      assert(/Alternative:/.test(code), id + " offers no cheaper option");
    }
  }],
  ['no generated template references a resource it never creates', () => {
    const ids = ['alb','nlb','nat-gateway','efs','cloudtrail','waf','aurora','elasticache',
      'redshift','ec2-autoscale','eks','step','kinesis','athena','glue','glacier','secrets-manager','elastic-ip'];
    for (const id of ids) {
      const code = generateCloudFormation([service(id)], { mode: "prod" }).code;
      const declared = new Set((code.match(/^ {2}(\w+):\n {4}Type: "?AWS::/gm) || [])
        .map((x) => x.trim().split(":")[0]));
      const params = new Set((((code.match(/Parameters:[\s\S]*?\nResources:/) || [""])[0])
        .match(/^ {2}(\w+):/gm) || []).map((x) => x.trim().replace(":", "")));
      for (const ref of new Set([...code.matchAll(/Ref: (\w+)/g)].map((m) => m[1]))) {
        if (ref.startsWith("AWS")) continue;
        assert(declared.has(ref) || params.has(ref),
          id + " references " + ref + " but never creates or declares it");
      }
      for (const ref of new Set([...code.matchAll(/Fn::GetAtt.{0,4}\[.(\w+)./g)].map((m) => m[1]))) {
        assert(declared.has(ref), id + " uses GetAtt on " + ref + " which it never creates");
      }
    }
  }],
  ['Terraform covers the same services CloudFormation does', () => {
    // The two drifted: a solution was deployable in one format and
    // "unsupported" in the other, for the same brief.
    const ids = ['s3', 'cloudfront', 'route53', 'acm', 'ses', 'lambda', 'dynamodb'];
    const cfn = generateCloudFormation(ids.map((id) => service(id)), { mode: "prod" });
    const tf = generateTerraform(ids.map((id) => service(id)), { mode: "prod" });
    for (const id of cfn.coverage.covered) {
      assert(!tf.coverage.uncovered.includes(id),
        id + ' generates CloudFormation but not Terraform');
    }
  }],
  ['a certificate is requested for the real domain, not a placeholder', () => {
    // It asked for a wildcard on a domain nobody owns, so DNS validation
    // could never complete and terraform apply hung until it timed out.
    const code = generateTerraform([service("acm")], { mode: "prod" }).code;
    assert(!/example\.com"/.test(code), "the certificate still names a placeholder domain");
    assert(/var\.domain_name/.test(code), "the certificate does not use the domain variable");
  }],
  ['Terraform declares every variable its resources use', () => {
    const code = generateTerraform([service("route53"), service("ses"), service("acm")], { mode: "prod" }).code;
    const declared = new Set([...code.matchAll(/variable "(\w+)"/g)].map((m) => m[1]));
    for (const used of new Set([...code.matchAll(/var\.(\w+)/g)].map((m) => m[1]))) {
      assert(declared.has(used), "var." + used + " is used but never declared");
    }
  }],
  ['a generated template declares every parameter it references', () => {
    // A template referencing an undeclared parameter fails in
    // CloudFormation with "Unresolved resource dependencies" — worse than
    // declaring the service unsupported, because the generator calls it
    // deployable right until AWS rejects it.
    const ids = ['s3', 'cloudfront', 'route53', 'acm', 'ses', 'lambda', 'apigw', 'dynamodb', 'vpc', 'rds'];
    const out = generateCloudFormation(ids.map((id) => service(id)), { mode: 'prod' });
    const block = (out.code.match(/Parameters:[\s\S]*?\nResources:/) || [''])[0];
    const declared = new Set((block.match(/^ {2}(\w+):/gm) || []).map((s) => s.trim().replace(':', '')));
    const resourceNames = new Set((out.code.match(/^ {2}(\w+):\n {4}Type: "?AWS::/gm) || [])
      .map((s) => s.trim().split(':')[0]));
    for (const ref of new Set([...out.code.matchAll(/Ref: (\w+)/g)].map((m) => m[1]))) {
      if (ref.startsWith('AWS::')) continue;
      assert(declared.has(ref) || resourceNames.has(ref),
        ref + ' is referenced but never declared as a parameter or resource');
    }
  }],
  ['a custom domain, certificate and email all generate', () => {
    for (const id of ['route53', 'acm', 'ses']) {
      const out = generateCloudFormation([service(id)], { mode: 'prod' });
      assert(out.coverage.uncovered.length === 0, id + ' is still uncovered');
      assert(/AWS::/.test(out.code), id + ' produced no resource');
    }
  }],
  ['the one resource that costs money says so in the template', () => {
    // A hosted zone is $0.50/month and no free tier covers it. Someone
    // who asked for zero cost must not find that out on a bill.
    const out = generateCloudFormation([service('route53')], { mode: 'prod' }).code;
    assert(/0\.50/.test(out), 'the hosted zone charge is not stated in the template');
    assert(/registrar/i.test(out), 'the free alternative to a hosted zone is not offered');
  }],
  ['a free resource is not described as if it cost something', () => {
    const out = generateCloudFormation([service('acm')], { mode: 'prod' }).code;
    assert(/free/i.test(out), 'ACM certificates are free and the template does not say so');
    assert(/us-east-1/.test(out), 'the CloudFront certificate region constraint is not stated');
  }],
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
    // A service id that will never have a generator, so this stays a test
    // of what happens when coverage is partial rather than a test of
    // whether one particular service has been implemented yet. It broke
    // the moment EKS gained a generator, which was the wrong signal.
    const result = generateCloudFormation([service('s3'), service('not-a-real-service')]);
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
