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
  const files = [
    { path: `${root}/README.md`,                            kind: 'md',   label: 'Overview + how to use this package' },
    { path: `${root}/architecture-diagram.png`,             kind: 'image',label: 'Architecture diagram (raster)' },
    { path: `${root}/architecture-diagram.pdf`,             kind: 'pdf',  label: 'Architecture diagram (print)' },
    { path: `${root}/technical-documentation.md`,           kind: 'md',   label: 'Deep-dive technical doc' },
    { path: `${root}/deployment-guide.md`,                  kind: 'md',   label: 'Step-by-step deploy' },
    { path: `${root}/terraform/main.tf`,                    kind: 'code', label: 'Terraform — main config' },
    { path: `${root}/terraform/variables.tf`,               kind: 'code', label: 'Terraform — variables' },
    { path: `${root}/terraform/outputs.tf`,                 kind: 'code', label: 'Terraform — outputs' },
    { path: `${root}/cloudformation-template.yaml`,         kind: 'code', label: 'CloudFormation template' },
    { path: `${root}/testing-results.md`,                   kind: 'md',   label: 'Test plan + results' },
    { path: `${root}/production-cost-estimate.md`,          kind: 'md',   label: 'Monthly cost estimate' },
    { path: `${root}/maintenance-guide.md`,                 kind: 'md',   label: 'Day-2 runbook' },
    { path: `${root}/future-recommendations.md`,            kind: 'md',   label: 'Phase 2 ideas' },
  ];
  const summary =
`# ${project.title || 'AWS Engagement'} — Delivery package

Prepared for **${client.company || client.name || 'the client'}**.
Generated on ${fmtDate(new Date())}.

## What's in this package
${files.map((f) => `- \`${f.path}\` — ${f.label}`).join('\n')}

## How to use it
1. Read \`README.md\` first.
2. Stand up the dev environment with \`terraform/\` or \`cloudformation-template.yaml\`.
3. Follow \`deployment-guide.md\` for the production cutover.
4. Keep \`maintenance-guide.md\` open during the first week.

## Cost
Estimated monthly cost: **${costPerMonth != null ? fmtCurrency(costPerMonth) : '—'}** in us-east-1 at the planned scale.

## Support
14 days of post-delivery support included. Reach me at ${brief.authorEmail || '<your email>'} for any fixes.
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
  };
}
