/** Cross-domain delivery standard shared by every generated solution. */

export const PROJECT_LIFECYCLE = [
  { id: 'brief', label: 'Brief', evidence: 'Approved problem statement and scope' },
  { id: 'discovery', label: 'Discovery', evidence: 'Answered requirements and named approver' },
  { id: 'proposal', label: 'Proposal', evidence: 'Reviewed scope, price, assumptions and exclusions' },
  { id: 'architecture', label: 'Architecture', evidence: 'Project-bound diagram and expert review' },
  { id: 'plan', label: 'Plan', evidence: 'Ordered tasks, owners, cost ceiling and rollback' },
  { id: 'build', label: 'Build', evidence: 'Approved execution record and resource identifiers' },
  { id: 'validate', label: 'Validate', evidence: 'Tests, screenshots, logs and cost verification' },
  { id: 'handover', label: 'Handover', evidence: 'Runbook, diagram, code, acceptance and teardown' },
  { id: 'portfolio', label: 'Portfolio', evidence: 'Redacted case study with defensible claims' },
];

const FULL = new Set(['s3', 'lambda', 'dynamodb', 'apigateway', 'iam', 'cloudwatch', 'sns', 'sqs', 'eventbridge', 'ec2', 'vpc', 'subnet', 'igw', 'security-group']);
const IAC = new Set(['rds', 'alb', 'nlb', 'asg', 'cloudfront', 'route53', 'kms', 'secretsmgr', 'efs', 'ebs', 'waf', 'codebuild', 'codepipeline', 'ssm']);
const COORDINATION = new Set(['vpn', 'dx', 'tgw', 'onprem', 'datasync', 'storagegateway', 'mgn', 'dms', 'ad', 'route53resolver']);
const DESIGN_ONLY = new Set(['eks', 'redshift', 'neptune', 'securityhub', 'guardduty', 'inspector', 'ga']);

export function serviceCapability(serviceId, coverage = {}) {
  const id = String(serviceId || '').toLowerCase();
  const covered = coverage?.services?.find?.((item) => item.serviceId === id || item.id === id);
  if (COORDINATION.has(id)) return { level: 'coordination', capabilityLabel: 'Client or provider coordination', deployable: false };
  if (covered?.covered === false) return { level: 'guided', capabilityLabel: 'Console guided only', deployable: false };
  if (FULL.has(id) && covered?.covered !== false) return { level: 'full', capabilityLabel: 'Application deployable', deployable: true };
  if (IAC.has(id)) return { level: 'iac', capabilityLabel: 'Infrastructure code and review', deployable: !!covered?.covered };
  if (DESIGN_ONLY.has(id)) return { level: 'design', capabilityLabel: 'Architecture and planning only', deployable: false };
  return { level: 'guided', capabilityLabel: 'Console guided only', deployable: false };
}

const GUIDE = {
  ec2: { path: 'EC2 > Instances > Launch instances', fields: ['Name', 'AMI', 'Instance type', 'Key pair or Proceed without key pair', 'Network settings', 'Storage', 'IAM instance profile'], verify: 'Instance state and status checks match the approved plan.', teardown: 'Terminate the instance and verify attached EBS and public IPv4 release.', shot: 'Instance summary with identifiers visible and secrets hidden.' },
  vpc: { path: 'VPC > Your VPCs > Create VPC', fields: ['Resources to create', 'Name tag', 'IPv4 CIDR', 'Availability Zones', 'Public subnets', 'Private subnets', 'NAT gateways', 'VPC endpoints'], verify: 'CIDRs do not overlap and route tables match the diagram.', teardown: 'Delete dependent endpoints, gateways, subnets and the project VPC.', shot: 'Resource map showing VPC, subnets and routes.' },
  iam: { path: 'IAM > Roles > Create role', fields: ['Trusted entity', 'Use case', 'Permissions', 'Role name', 'Tags'], verify: 'Trust policy and effective permissions are least privilege.', teardown: 'Detach the role from workloads before deleting it.', shot: 'Role summary and permission names; never show credentials.' },
  ssm: { path: 'Systems Manager > Fleet Manager > Managed nodes', fields: ['Instance profile', 'SSM Agent', 'Network reachability', 'Managed node status'], verify: 'The node is Online and Session Manager opens without inbound RDP.', teardown: 'End sessions, remove associations and delete project resources.', shot: 'Managed node Online status and Session Manager connection.' },
  cloudwatch: { path: 'CloudWatch > Alarms > Create alarm', fields: ['Metric', 'Statistic', 'Period', 'Threshold', 'Notification topic', 'Alarm name'], verify: 'Alarm state and test evidence match the acceptance criteria.', teardown: 'Delete project alarms, dashboards and unused log groups after retention review.', shot: 'Alarm configuration and current state.' },
  backup: { path: 'AWS Backup > Backup plans > Create backup plan', fields: ['Plan option', 'Plan name', 'Schedule', 'Lifecycle', 'Backup vault', 'Resource assignment'], verify: 'A recovery point exists and the restore procedure is documented or tested.', teardown: 'Remove assignments and delete recovery points only after retention approval.', shot: 'Backup job or recovery point status without sensitive resource data.' },
  s3: { path: 'S3 > Buckets > Create bucket', fields: ['Region', 'Bucket name', 'Object Ownership', 'Block Public Access', 'Versioning', 'Encryption', 'Tags'], verify: 'Block Public Access, encryption and versioning match the plan.', teardown: 'Empty all versions and delete the project bucket.', shot: 'Properties and Permissions tabs showing approved controls.' },
  rds: { path: 'RDS > Databases > Create database', fields: ['Creation method', 'Engine', 'Template', 'Availability', 'Instance class', 'Storage', 'Connectivity', 'Authentication', 'Backup'], verify: 'Database is Available, private and reachable only from the approved application security group.', teardown: 'Take an approved final snapshot or explicitly decline it, then delete the database.', shot: 'Connectivity, backup and encryption summaries; hide endpoints when required.' },
  vpn: { path: 'VPC > Site-to-Site VPN connections', fields: ['Customer gateway IP', 'Routing type', 'BGP ASN or static routes', 'Tunnel options', 'Target gateway'], verify: 'Both tunnels, routes and bidirectional test traffic are evidenced.', teardown: 'Coordinate route withdrawal before deleting the VPN objects.', shot: 'Tunnel status and route evidence with public customer data redacted.' },
  dx: { path: 'Direct Connect > Connections', fields: ['Location', 'Bandwidth', 'Provider', 'Virtual interface', 'VLAN', 'BGP ASN', 'Prefixes'], verify: 'Provider cross-connect, BGP and resilient path tests are accepted.', teardown: 'Requires an approved provider cancellation and routing plan.', shot: 'Connection and virtual-interface state with circuit details redacted.' },
  onprem: { path: 'Client network inventory', fields: ['Sites', 'CIDRs', 'VLANs', 'Gateways', 'Firewalls', 'DNS', 'Directory', 'WAN provider', 'Change window'], verify: 'Inventory, non-overlap check and responsibility matrix are client-approved.', teardown: 'Restore on-premises routes and firewall rules from the approved rollback record.', shot: 'Redacted logical topology and validation results.' },
};

function genericGuide(service) {
  return {
    path: `AWS Console search > ${service.label || service.id}`,
    fields: ['Region', 'Resource name', 'Network placement', 'Encryption', 'Logging', 'Tags'],
    verify: 'Resource status and functional test match the approved acceptance criteria.',
    teardown: 'Delete the tracked project resource and verify no dependent billable resource remains.',
    shot: 'Resource summary, configuration and successful validation result.',
  };
}

export function buildConsoleRunbook(services = [], region = 'us-east-1') {
  return services.map((service, index) => {
    const guide = GUIDE[service.id] || genericGuide(service);
    return {
      id: `console-${index + 1}-${service.id}`,
      serviceId: service.id,
      service: service.label || service.id,
      region,
      consolePath: guide.path,
      steps: [
        `Sign in with the approved MFA-protected operator and select ${region}.`,
        `Open ${guide.path}.`,
        ...guide.fields.map((field) => `Complete ${field} using the approved project value; do not guess missing requirements.`),
        'Review the configuration and estimated cost before choosing Create or Save.',
        `Verify: ${guide.verify}`,
        `Capture evidence: ${guide.shot}`,
        `Teardown: ${guide.teardown}`,
      ],
      expected: guide.verify,
      screenshot: guide.shot,
      teardown: guide.teardown,
    };
  });
}

export function buildArchitectureBrief(solution = {}) {
  const services = solution.services || [];
  const ids = new Set(services.map((s) => s.id));
  const hybrid = ['onprem', 'vpn', 'dx', 'tgw', 'datasync', 'storagegateway', 'mgn', 'dms'].some((id) => ids.has(id));
  return {
    projectId: solution.id,
    title: solution.names?.projectName || solution.input?.title || 'AWS solution',
    region: solution.region?.primary || 'us-east-1',
    boundaries: ['Users and external systems', 'AWS account', 'AWS Region', ...(ids.has('vpc') ? ['VPC', 'Availability Zones', 'Public and private subnets'] : []), ...(hybrid ? ['On premises or branch network'] : [])],
    panels: ['Request or data flow', 'Service responsibilities', 'Security controls', 'Availability and recovery', 'Monitoring and evidence', 'Cost and teardown'],
    hybrid,
  };
}

export function buildDeliveryStandard(solution = {}) {
  const services = solution.services || [];
  return {
    version: 1,
    projectId: solution.id,
    lifecycle: PROJECT_LIFECYCLE,
    architecture: buildArchitectureBrief(solution),
    capabilities: services.map((service) => ({ ...service, ...serviceCapability(service.id, solution.deploy?.coverage) })),
    consoleRunbook: buildConsoleRunbook(services, solution.region?.primary),
    evidenceRequired: ['Approved brief', 'Project-bound diagram', 'Cost approval', 'Implementation screenshots', 'Validation results', 'CloudTrail events', 'Teardown evidence', 'Client acceptance'],
  };
}
