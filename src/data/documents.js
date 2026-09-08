/**
 * Document generators — contracts, invoices, delivery packages.
 *
 * All pure functions over plain objects. Pages call these to populate
 * editable forms, then save the result through EarnContext.
 *
 * Invoices live in FreelanceContext (existing storage). Contracts and
 * delivery packages live in EarnContext (new in Stage 12).
 */

import { uid } from '../lib/utils.js';
import { architectureToDrawioXml, validateDrawioXml } from '../lib/drawioBridge.js';

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtCurrency = (n, currency = 'USD') => {
  if (n == null || Number.isNaN(+n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(+n);
  } catch {
    return `$${(+n).toLocaleString()}`;
  }
};

const addDays = (d, n) => {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
};

// =============================================================
// CONTRACTS
// =============================================================

/**
 * Build a default contract from a job analysis result + author profile.
 * Returns an editable contract object.
 */
export function buildContract({ analysis, brief = {}, author = {}, client = {} }) {
  const start = brief.startDate || new Date().toISOString();
  const days = brief.timelineDays || guessDaysFromAnalysis(analysis) || 21;
  const end = addDays(start, days).toISOString();

  const total =
    brief.budget != null ? +brief.budget
    : analysis?.budget?.kind === 'fixed' ? analysis.budget.amount
    : analysis?.budget?.kind === 'hourly' ? (analysis.budget.max || analysis.budget.min || 0) * (brief.estimatedHours || 40)
    : 0;

  const deposit = Math.round(total * 0.5);
  const finalPay = total - deposit;

  return {
    id: uid(),
    kind: 'contract',
    number: `CTR-${Date.now().toString().slice(-6)}`,
    title: brief.projectTitle || analysis?.type || 'AWS engagement',
    createdAt: new Date().toISOString(),
    status: 'draft', // draft | sent | signed | archived
    parties: {
      client: {
        name:    client.name    || brief.clientContact || '',
        company: client.company || brief.clientCompany || '',
        email:   client.email   || '',
        address: client.address || '',
      },
      author: {
        name:    author.name    || brief.authorName || '',
        company: author.company || '',
        email:   author.email   || brief.authorEmail || '',
        address: author.address || '',
      },
    },
    scope: brief.scope || defaultScopeFor(analysis),
    deliverables: brief.deliverables || defaultDeliverables(analysis),
    timeline: {
      start, end, days,
    },
    payment: {
      currency: brief.currency || 'USD',
      total,
      schedule: [
        { label: '50% deposit to begin', amount: deposit, dueAt: start },
        { label: '50% on successful delivery', amount: finalPay, dueAt: end },
      ],
      method: brief.paymentMethod || 'Wise or Payoneer',
    },
    revisions: brief.revisions != null ? brief.revisions : 2,
    ip: 'On full payment, all deliverables (code, diagrams, documentation) become the client\'s property. Author retains the right to reference the project in portfolio / case studies, with confidential details redacted.',
    confidentiality: 'Both parties agree to keep all non-public information confidential for 24 months from the project end date.',
    cancellation:
      'Either party may terminate with 7 days written notice. Author retains the deposit; any unbilled work-in-progress is invoiced pro-rata at the agreed rate.',
    refunds: 'Deposit is non-refundable once kickoff has occurred. Final payment is contingent on delivery of the scope as defined above.',
    signatures: {
      client: { name: '', date: '', signedAt: null },
      author: { name: '', date: '', signedAt: null },
    },
  };
}

function guessDaysFromAnalysis(analysis) {
  if (!analysis?.timeline) return null;
  const t = analysis.timeline;
  if (t.kind === 'range' && t.unit?.startsWith('day'))   return Math.round((t.min + t.max) / 2);
  if (t.kind === 'range' && t.unit?.startsWith('week'))  return Math.round((t.min + t.max) / 2) * 7;
  if (t.kind === 'range' && t.unit?.startsWith('month')) return Math.round((t.min + t.max) / 2) * 30;
  if (t.kind === 'fixed' && t.unit?.startsWith('week'))  return t.value * 7;
  if (t.kind === 'fixed' && t.unit?.startsWith('month')) return t.value * 30;
  return null;
}

function defaultScopeFor(analysis) {
  const type = analysis?.type || 'General AWS Engineering';
  return `Author will design, implement and deliver the ${type} engagement as described in the attached proposal. Work will be carried out remotely. The author will use their own AWS account for testing before any change reaches the client environment.`;
}

function defaultDeliverables(analysis) {
  const base = [
    'Reference architecture diagram (PNG + PDF)',
    'Technical documentation',
    'Deployment guide',
    'Production cost estimate',
    'Maintenance + day-2 runbook',
    'Two revision rounds within scope',
    'Fourteen (14) days of post-delivery support',
  ];
  const svc = analysis?.services || [];
  if (svc.includes('codepipeline') || svc.includes('codebuild')) base.unshift('CI/CD pipeline configured and tested');
  if (svc.includes('ec2') || svc.includes('fargate') || svc.includes('eks')) base.unshift('Application workloads deployed and validated');
  return base;
}

/** Build a printable Markdown contract for export. */
export function contractToMarkdown(c) {
  return `# ${c.title}

**Contract number:** ${c.number}
**Status:** ${c.status}
**Drafted:** ${fmtDate(c.createdAt)}

## Parties
- **Client:** ${c.parties.client.name || '—'} · ${c.parties.client.company || '—'} · ${c.parties.client.email || '—'}
- **Author:** ${c.parties.author.name || '—'} · ${c.parties.author.email || '—'}

## Scope of work
${c.scope}

## Deliverables
${c.deliverables.map((d) => `- ${d}`).join('\n')}

## Timeline
- **Start:** ${fmtDate(c.timeline.start)}
- **End:**   ${fmtDate(c.timeline.end)}
- **Duration:** ${c.timeline.days} days

## Investment
- **Total:** ${fmtCurrency(c.payment.total, c.payment.currency)}
- **Method:** ${c.payment.method}

### Payment schedule
${c.payment.schedule.map((s) => `- ${s.label} — ${fmtCurrency(s.amount, c.payment.currency)} · due ${fmtDate(s.dueAt)}`).join('\n')}

## Revisions
${c.revisions} revision round${c.revisions === 1 ? '' : 's'} included within the agreed scope. Additional revisions are billable at the standard rate.

## Intellectual property
${c.ip}

## Confidentiality
${c.confidentiality}

## Cancellation & refunds
${c.cancellation}

${c.refunds}

## Signatures
- **Client:** _______________________  Date: __________
- **Author:** _______________________  Date: __________
`;
}

// =============================================================
// INVOICES (work with existing FreelanceContext shape)
// =============================================================

/**
 * Build a draft invoice from a client + line items.
 * Caller passes it to FreelanceContext.addInvoice() which assigns the
 * INV-#### number automatically.
 */
export function buildInvoice({ client = {}, project = {}, lineItems = [], currency = 'USD', taxPct = 0, payment = {} }) {
  const due = addDays(new Date(), 14).toISOString();
  const items = lineItems.length ? lineItems : [
    { desc: project.title || 'AWS engagement — phase 1', qty: 1, unit: 0, amount: 0 },
  ];
  return {
    clientName:  client.name || '',
    clientEmail: client.email || '',
    issuedAt:    new Date().toISOString(),
    dueAt:       due,
    currency,
    lineItems:   items,
    taxPct,
    notes:       project.notes || '',
    status:      'draft',
    payment: {
      wise:     payment.wise     || '',
      payoneer: payment.payoneer || '',
      bank:     payment.bank     || '',
    },
  };
}

export function invoiceTotals(inv) {
  const subtotal = (inv.lineItems || []).reduce((s, li) => s + (+li.amount || (+li.qty || 0) * (+li.unit || 0)), 0);
  const tax = subtotal * ((+inv.taxPct || 0) / 100);
  const total = subtotal + tax;
  return { subtotal, tax, total };
}

export function invoiceToMarkdown(inv) {
  const { subtotal, tax, total } = invoiceTotals(inv);
  return `# Invoice ${inv.number || '#DRAFT'}

**Issued:** ${fmtDate(inv.issuedAt)}
**Due:**    ${fmtDate(inv.dueAt)}
**Status:** ${inv.status}

## Bill to
${inv.clientName || '—'}
${inv.clientEmail || ''}

## Line items
| # | Description | Qty | Unit | Amount |
|---|-------------|-----|------|--------|
${(inv.lineItems || []).map((li, i) =>
  `| ${i + 1} | ${li.desc} | ${li.qty || 1} | ${fmtCurrency(li.unit, inv.currency)} | ${fmtCurrency(li.amount || (li.qty || 0) * (li.unit || 0), inv.currency)} |`
).join('\n')}

**Subtotal:** ${fmtCurrency(subtotal, inv.currency)}
**Tax (${inv.taxPct || 0}%):** ${fmtCurrency(tax, inv.currency)}
**Total:** ${fmtCurrency(total, inv.currency)}

## Payment
- **Wise:**     ${inv.payment?.wise || '—'}
- **Payoneer:** ${inv.payment?.payoneer || '—'}
- **Bank:**     ${inv.payment?.bank || '—'}

${inv.notes ? `## Notes\n${inv.notes}` : ''}
`;
}

// =============================================================
// DELIVERY PACKAGES
// =============================================================

/**
 * Build the package manifest after a project completes. The page
 * uses this manifest to render the file list + a downloadable
 * Markdown summary. Real ZIP creation happens in the page using
 * the Blob API + a tiny in-browser STORE archive (see helpers).
 */
export function buildDeliveryPackage({ project = {}, client = {}, diagram = null, costPerMonth = null, brief = {} }) {
  const slug = (project.title || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const clientSlug = (client.company || client.name || 'client').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const root = `${clientSlug}_${slug}_delivery`;
  const diagramXml = diagram
    ? (validateDrawioXml(diagram.drawioXml).valid ? diagram.drawioXml : architectureToDrawioXml(diagram.nodes || [], diagram.edges || [], diagram.name || project.title || 'Architecture'))
    : null;
  const serviceLines = (project.services || []).map((service) => `- ${service.label || service.id}: ${service.what || 'Review its approved role in the architecture.'}`).join('\n');
  const runbookLines = (project.consoleRunbook || []).flatMap((guide) => [
    `## ${guide.service}`,
    `Console path: ${guide.consolePath}`,
    '',
    ...guide.steps.map((step, index) => `${index + 1}. ${step}`),
    '',
  ]).join('\n');
  const externalVerificationPrompt = `# Independent verification request — ${project.title || 'AWS project'}

You are an independent senior cloud architect, security reviewer, SRE, cost reviewer, and technical-documentation auditor. Review the supplied delivery package. Treat generated claims as unverified until supported by configuration, test output, or redacted evidence.

## Safety boundary
- Never request or reproduce passwords, access keys, session tokens, MFA seeds, card details, private customer data, or unredacted account identifiers.
- Do not execute deployment or deletion commands. Review only the supplied artifacts.
- Distinguish design intent, generated code, actual deployment evidence, and client acceptance.

## Review scope
1. Requirements: identify ambiguity, missing acceptance criteria, assumptions, exclusions, owners, and approvals.
2. Architecture: trace every request/data flow and check boundaries, protocols, availability, failure modes, hybrid dependencies, and single points of failure.
3. Security: review IAM least privilege, MFA, network exposure, encryption, logging, secret handling, patching, backup, recovery, and evidence redaction.
4. Reliability and operations: validate monitoring, alarms, runbooks, restore test, rollback, incident handling, maintenance, and teardown verification.
5. Cost: flag unsupported estimates, costly defaults, free-plan assumptions, billing risks, and resources that can survive teardown.
6. Implementation: compare Terraform, CloudFormation, console runbook, diagram, and documented services for contradictions or missing dependencies.
7. Testing: assess whether each acceptance criterion has an expected result, actual result, evidence reference, reviewer, and date.
8. Documentation: confirm a new operator can deploy, validate, operate, recover, escalate, and safely remove the system.

## Required response format
### Verdict
Return one of: PASS, PASS WITH CONDITIONS, or FAIL. Explain why.

### Blocking findings
For each: ID, severity, affected artifact/service, evidence, risk, exact correction, and retest required.

### Non-blocking improvements
Prioritized improvements with expected benefit, effort, and recommended timing.

### Contradictions and unsupported claims
List any statement not proven by the supplied artifacts or evidence.

### Test coverage assessment
Map each requirement to its test and evidence; mark missing coverage explicitly.

### Questions for the owner/client
Ask only questions whose answers could change scope, architecture, security, cost, or acceptance.

### Final checklist
Provide a concise checklist for the next review cycle. Do not declare production readiness without reviewed deployment and operational evidence.
`;
  const externalReviewTemplate = `# External review response — ${project.title || 'AWS project'}

Reviewer/tool:
Review date:
Verdict: NOT REVIEWED

## Blocking findings
- Paste the independent review findings here. Remove secrets and personal data first.

## Non-blocking improvements
- Record prioritized improvements, expected benefit, effort, and timing.

## Owner response and changes made
- Finding ID:
- Decision:
- Change made:
- Evidence:
- Retest result:

## Remaining risks and acceptance
- Residual risk:
- Risk owner:
- Approver:
- Approval date:
`;
  const files = [
    { path: `${root}/README.md`,                            kind: 'md',   label: 'Overview + how to use this package', generated: true },
    ...(diagramXml ? [{ path: `${root}/architecture-diagram.drawio`, kind: 'drawio', label: 'Editable project architecture', generated: true, content: diagramXml }] : []),
    { path: `${root}/technical-documentation.md`,           kind: 'md',   label: 'Deep-dive technical doc', generated: true, content: `# ${project.title || 'Project'} technical documentation\n\n## Architecture services\n${serviceLines || '- Add the approved project services.'}\n\n## Evidence standard\n- Approved brief and assumptions\n- Project-bound architecture diagram\n- Cost approval\n- Implementation and validation screenshots\n- Audit events and teardown evidence\n- Client acceptance\n` },
    { path: `${root}/deployment-guide.md`,                  kind: 'md',   label: 'Step-by-step deploy', generated: !!runbookLines, content: runbookLines ? `# ${project.title || 'Project'} deployment guide\n\n${runbookLines}` : '# Deployment guide\n\nGenerate and review the project console runbook before deployment.\n' },
    { path: `${root}/terraform/main.tf`,                    kind: 'code', label: 'Terraform — main config', generated: !!project.templates?.terraform, content: project.templates?.terraform || undefined },
    { path: `${root}/terraform/variables.tf`,               kind: 'code', label: 'Terraform — variables' },
    { path: `${root}/terraform/outputs.tf`,                 kind: 'code', label: 'Terraform — outputs' },
    { path: `${root}/cloudformation-template.yaml`,         kind: 'code', label: 'CloudFormation template', generated: !!project.templates?.cfn, content: project.templates?.cfn || undefined },
    { path: `${root}/testing-results.md`,                   kind: 'md',   label: 'Test plan + results', generated: true, content: '# Testing results\n\nRecord each test, expected result, actual result, evidence filename, reviewer and date. Do not mark a test passed without evidence.\n' },
    { path: `${root}/external-verification-prompt.md`,       kind: 'md',   label: 'Safe independent-review instructions for ChatGPT or Claude', generated: true, content: externalVerificationPrompt },
    { path: `${root}/external-review-response.md`,          kind: 'md',   label: 'Reviewer findings, improvements and retest record', generated: true, content: externalReviewTemplate },
    { path: `${root}/production-cost-estimate.md`,          kind: 'md',   label: 'Monthly cost estimate' },
    { path: `${root}/maintenance-guide.md`,                 kind: 'md',   label: 'Day-2 runbook' },
    { path: `${root}/future-recommendations.md`,            kind: 'md',   label: 'Phase 2 ideas' },
  ];
  const summary =
`# ${project.title || 'AWS Engagement'} — Delivery package

Prepared for **${client.company || client.name || 'the client'}**.
Generated on ${fmtDate(new Date())}.

## Overview
This package is the controlled handover record for ${project.title || 'the AWS engagement'}. It links the approved architecture, reproducible infrastructure, console runbook, validation record, operating guidance, and teardown evidence. Generated content must still be reviewed against the real AWS account before acceptance.

## What's in this package
${files.map((f) => `- \`${f.path}\` — ${f.label}${f.generated ? ' (generated)' : ' (requires reviewed project content)'}`).join('\n')}

## How to use it
1. Read \`README.md\` first.
2. Stand up the dev environment with \`terraform/\` or \`cloudformation-template.yaml\`.
3. Follow \`deployment-guide.md\` for the production cutover.
4. Keep \`maintenance-guide.md\` open during the first week.

## Prerequisites
- An approved AWS account, target Region, cost ceiling, maintenance window, and named approver.
- A federated or temporary least-privilege IAM role; never use root or copy permanent access keys into this package.
- Reviewed Terraform/CloudFormation tooling and a non-production validation environment.

## Architecture
Open \`architecture-diagram.drawio\` in Draw.io and compare every boundary, service, connection, and protocol with the deployed resource inventory. The service roles and implementation sequence are documented in \`technical-documentation.md\` and \`deployment-guide.md\`.

## Deployment
Review the infrastructure plan or CloudFormation change set, obtain explicit approval, deploy first to the validation environment, and record resource identifiers and screenshots. Do not treat generated templates as proof of a successful deployment.

## Credentials & Access
Use the client-approved temporary role or IAM Identity Center permission set. MFA is required for privileged access. Store secrets only in the approved vault, document role names rather than secret values, and test credential rotation and access removal before handover.

## Security
Confirm least privilege, encrypted EBS and backups, blocked public RDP, Session Manager access, audit logging, and redaction of account identifiers or personal data in evidence.

## Monitoring
Verify CloudWatch metrics, logs, dashboard, alarm thresholds, notification routing, and an alarm test. Record the dashboard and alarm identifiers in \`testing-results.md\`.

## Rollback / Recovery
If validation fails, stop the change, preserve diagnostic evidence, restore the last approved infrastructure version, and test restoration from the approved backup or snapshot. Record actual RPO/RTO results and complete teardown verification before closing the change.

## Known Issues & Troubleshooting
Start with Systems Manager managed-node status, IAM role attachment, VPC endpoint or outbound connectivity, CloudWatch agent status, and backup-job history. Escalate unresolved account or service failures through the account's approved AWS Support channel.

## Cost
Estimated monthly cost: **${costPerMonth != null ? fmtCurrency(costPerMonth) : '—'}** in us-east-1 at the planned scale.
Confirm the authoritative estimate in AWS Pricing Calculator and configure AWS Budgets alerts. Alerts notify but do not cap spending; verify all billable resources after teardown.

## Contacts & Escalation
Primary owner: ${brief.authorEmail || 'record in the signed acceptance record'}.
Backup owner and client approver: record in the signed acceptance record before handover. Use the account's current AWS Support plan and official Support Center for service incidents; never send credentials in a support case.

## Support
Post-delivery support is limited to the agreed engagement period and scope. Changes outside the accepted scope require a reviewed change request.
`;
  return {
    id: uid(),
    kind: 'delivery',
    createdAt: new Date().toISOString(),
    name: `${client.company || client.name || 'client'} — ${project.title || 'engagement'}`,
    clientName: client.name || client.company || '',
    clientCompany: client.company || '',
    projectTitle: project.title || '',
    root,
    files,
    summary,
    diagram: diagram || null,
    status: 'ready', // ready | sent
    externalReview: { reviewer: '', verdict: 'not-reviewed', findings: '', updatedAt: null },
  };
}
