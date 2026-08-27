const PROFILES = [
  {
    id: 'windows-server',
    match: /\b(?:windows server|win server|active directory|server admin(?:istration)?|file server|group policy|gpo|powershell)\b/i,
    title: 'Windows Server Administration — Secure Managed Server',
    components: ['Windows Server 2022', 'PowerShell', 'Windows Defender Firewall', 'Event Viewer', 'AWS EC2', 'AWS Systems Manager', 'Amazon CloudWatch', 'AWS Backup', 'IAM'],
    requirements: [
      'Create separate administrator and standard-user access paths.',
      'Use secure remote administration; do not expose RDP to the entire internet.',
      'Apply operating-system updates, host firewall rules, logging, monitoring, backup, and restore procedures.',
      'Document account creation, password reset, access removal, incident response, and handover.',
    ],
    tests: [
      'Approved administrator access works through the selected secure method.',
      'Standard users cannot perform administrative actions.',
      'Firewall, updates, monitoring, backup, and a controlled restore are evidenced.',
    ],
  },
  {
    id: 'website',
    match: /\b(?:website|web app|frontend|portfolio site|landing page)\b/i,
    title: 'Secure AWS Web Application',
    components: ['Source repository', 'DNS and TLS', 'Web hosting or compute', 'CDN', 'Logging and monitoring', 'Backup or rollback'],
    requirements: [
      'Confirm whether the workload is static, server-rendered, containerised, or API-backed.',
      'Provide HTTPS, least-privilege access, observability, repeatable deployment, and rollback.',
      'Document environment configuration without committing secrets.',
    ],
    tests: ['HTTPS and primary user journey work.', 'Unauthorized access is denied.', 'Monitoring and rollback are demonstrated.'],
  },
  {
    id: 'data',
    match: /\b(?:data pipeline|etl|analytics|database|warehouse|data engineering)\b/i,
    title: 'AWS Data Platform',
    components: ['Ingestion', 'Encrypted storage', 'Processing', 'Data catalogue', 'Query or serving layer', 'Monitoring'],
    requirements: [
      'Confirm sources, formats, volume, velocity, data quality, retention, and consumers.',
      'Define encryption, least privilege, lineage, failure handling, replay, and cost controls.',
      'Separate development data from sensitive or production data.',
    ],
    tests: ['A controlled dataset completes the pipeline.', 'Bad input is quarantined or reported.', 'Access, cost, and observability evidence are captured.'],
  },
];

const FALLBACK = {
  id: 'general',
  title: 'Professional AWS Project',
  components: ['Application components to be confirmed', 'IAM', 'Logging and monitoring', 'Infrastructure as code', 'Backup and rollback'],
  requirements: [
    'Translate the requested outcome into measurable functional and non-functional requirements.',
    'Use least privilege, encryption where applicable, monitoring, repeatable delivery, and documented rollback.',
    'Keep assumptions visible and require approval before implementation.',
  ],
  tests: ['The agreed user journey works.', 'Security and failure cases are tested.', 'Deployment, rollback, and handover evidence are recorded.'],
};

function profileFor(request) {
  return PROFILES.find((profile) => profile.match.test(request)) || FALLBACK;
}

function bullets(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

/** Expand a short idea into an editable, evidence-first project/gig brief. */
export function buildProfessionalBrief(request, { learning = true, freeTier = true } = {}) {
  const input = String(request || '').trim();
  if (!input) throw new Error('Describe what you want to build or administer.');
  const profile = profileFor(input);

  return `Project title:
${profile.title}

Original request:
${input}

Project type:
${learning ? 'Portfolio learning project treated as a simulated client gig.' : 'Client project draft requiring discovery and approval.'}

Client situation:
The client needs the outcome described above, but the current environment, users, data, dependencies, budget, and acceptance criteria have not yet been verified. The first phase is discovery—not deployment.

Requested outcome:
Create a secure, supportable, documented solution for the original request. Explain each decision in beginner-friendly language and preserve evidence suitable for a portfolio and client handover.

Proposed components to validate:
${bullets(profile.components)}

Initial requirements:
${bullets(profile.requirements)}
- Produce an editable Draw.io diagram, architecture proposal, implementation plan, test plan, operating guide, and handover record.
- Record assumptions, decisions, commands or infrastructure code, screenshots or logs, and lessons learned.

Cost and AWS constraints:
- ${freeTier ? 'Prefer AWS Free Tier or the lowest-cost safe option, but never promise zero cost without a current account-specific estimate.' : 'Establish a client-approved budget before implementation.'}
- Identify every potentially billable service, pricing assumption, quota, and data-transfer risk.
- Require explicit human approval before any AWS write action.
- Provide rollback, teardown, and post-destruction verification steps.

Security constraints:
- Use least privilege and short-lived or role-based access; never place credentials in code, documents, or synced state.
- Do not use genuine client, employee, health, payment, or other sensitive data in a learning environment.
- Define encryption, logging, patching, backup, recovery, and incident-response expectations where applicable.
- Stop and ask questions when a requirement is unknown; do not fabricate experience, client facts, deployment results, or test evidence.

Acceptance tests:
${bullets(profile.tests)}
- Every claimed result links to actual evidence.
- All created cloud resources are inventoried and can be safely removed.
- Destruction is verified through AWS evidence, not only local application state.

Generate these sections before implementation:
1. Missing client questions grouped by business, users, technical environment, security, cost, operations, and acceptance.
2. Assumptions requiring explicit approval.
3. Architecture proposal with alternatives and trade-offs.
4. Required AWS services and non-AWS components, with a reason for each.
5. Free Tier and cost-risk assessment using current pricing assumptions.
6. Security, identity, data-protection, backup, and recovery plan.
7. Milestones, dependencies, responsibilities, and realistic estimates.
8. Validation and evidence checklist.
9. Rollback, teardown, and destruction-verification plan.
10. Portfolio case-study and client-handover evidence plan.

Approval gate:
Do not generate runnable deployment actions or claim readiness until the questions, assumptions, architecture coverage, cost position, and acceptance tests have been reviewed. Do not execute deployment until I approve the final plan.`;
}

export function detectProfessionalBriefProfile(request) {
  return profileFor(String(request || '')).id;
}

