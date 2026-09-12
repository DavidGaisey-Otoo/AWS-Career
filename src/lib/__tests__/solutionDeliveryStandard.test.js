import { buildDeliveryStandard, serviceCapability } from '../solutionDeliveryStandard.js';

function check(name, fn) {
  try { fn(); return { name, pass: true }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}
function assert(value, message) { if (!value) throw new Error(message); }

export function runSolutionDeliveryStandardTests() {
  const services = [
    { id: 'ec2', label: 'Amazon EC2' },
    { id: 'ssm', label: 'AWS Systems Manager' },
    { id: 'backup', label: 'AWS Backup' },
    { id: 'vpn', label: 'AWS Site-to-Site VPN' },
  ];
  const standard = buildDeliveryStandard({
    id: 'project-1', services,
    names: { projectName: 'Windows hybrid administration' },
    region: { primary: 'us-east-1' }, deploy: { coverage: null },
  });
  const results = [
    check('every project receives the complete nine-stage lifecycle', () => assert(standard.lifecycle.length === 9, 'lifecycle is incomplete')),
    check('every service receives an ordered console runbook', () => assert(standard.consoleRunbook.length === services.length && standard.consoleRunbook.every((g) => g.steps.length >= 6), 'runbook is incomplete')),
    check('hybrid services require coordination instead of false one-click deployment', () => assert(serviceCapability('vpn').level === 'coordination' && !serviceCapability('vpn').deployable, 'VPN capability is unsafe')),
    check('architecture brief records hybrid boundaries and review panels', () => assert(standard.architecture.hybrid && standard.architecture.boundaries.some((x) => /premises/i.test(x)) && standard.architecture.panels.length >= 6, 'hybrid architecture metadata is incomplete')),
    check('runbooks include screenshot and teardown guidance', () => assert(standard.consoleRunbook.every((g) => g.screenshot && g.teardown), 'evidence or teardown missing')),
    check('local-zero projects receive local Windows steps without AWS console actions', () => {
      const local = buildDeliveryStandard({
        id: 'local-1', services,
        names: { projectName: 'Local Windows Server lab' },
        region: { primary: 'us-east-1' }, deploy: { localOnly: true, environmentMode: 'local-zero' },
      });
      assert(local.architecture.localOnly && local.architecture.region === 'Local only', 'local architecture boundary missing');
      assert(local.consoleRunbook.length >= 7, 'local A-to-Z runbook is incomplete');
      assert(local.consoleRunbook.every((step) => step.region === 'Local'), 'AWS console step leaked into local runbook');
      assert(local.capabilities.every((capability) => !capability.deployable), 'local reference capability became deployable');
      assert(!local.evidenceRequired.some((item) => /CloudTrail/i.test(item)), 'AWS-only evidence leaked into local project');
    }),
  ];
  return { results, allPassed: results.every((r) => r.pass) };
}
