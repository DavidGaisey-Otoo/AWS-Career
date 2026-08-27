/**
 * Email composer engine — pure functions that generate professional
 * client emails from a template id + context. No real LLM.
 */

import { uid } from '../lib/utils.js';

// -------------------------------------------------------------
// Email types (used as the dropdown in Step 1 of the composer)
// -------------------------------------------------------------

export const EMAIL_TYPES = [
  { id: 'reply-inquiry',     label: 'Reply to new job inquiry',           category: 'Inquiry' },
  { id: 'send-proposal',     label: 'Send proposal to client',            category: 'Proposal' },
  { id: 'weekly-update',     label: 'Weekly project update',              category: 'Update' },
  { id: 'project-delivered', label: 'Project delivery completed',         category: 'Delivery' },
  { id: 'invoice-reminder',  label: 'Invoice payment reminder',           category: 'Invoice' },
  { id: 'review-request',    label: 'Request a review (3 days post)',     category: 'Retention' },
  { id: 'past-client-checkin',label:'Check in with past client (30 days)',category: 'Retention' },
  { id: 'polite-decline',    label: 'Professionally decline a job',       category: 'Inquiry' },
  { id: 'need-more-info',    label: 'Request more project information',   category: 'Inquiry' },
  { id: 'discovery-call',    label: 'Invite to discovery call',           category: 'Inquiry' },
];

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtCurrency = (n, currency = 'USD') => {
  if (n == null || Number.isNaN(+n)) return '—';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(+n);
  } catch {
    return `$${(+n).toLocaleString()}`;
  }
};

const greet = (ctx) => `Hi ${ctx.clientFirstName || ctx.clientName || 'there'},`;
const sign = (ctx) => {
  const lines = [
    'Best regards,',
    ctx.authorName || 'Your Name',
  ];
  if (ctx.authorTitle) lines.push(ctx.authorTitle);
  return lines.join('\n');
};

const bullets = (items, prefix = '•') =>
  items.filter(Boolean).map((b) => `${prefix} ${b}`).join('\n');

// -------------------------------------------------------------
// Per-type subject + body builders
// -------------------------------------------------------------

const builders = {
  'reply-inquiry': (ctx) => ({
    subject: `Re: ${ctx.projectTitle || 'AWS engagement'} — available to help`,
    body:
`${greet(ctx)}

Thank you for reaching out about ${ctx.projectTitle || 'your AWS project'}. I have reviewed your requirements and I am confident I can deliver exactly what you need.

I specialise in ${ctx.skills || 'AWS architecture, network design, and infrastructure-as-code'}. I recently completed ${ctx.recentProject || 'a similar engagement'} which resulted in ${ctx.recentOutcome || 'a 40% reduction in monthly AWS spend and a faster release cadence'}.

A few quick questions to scope this properly:
${bullets(ctx.questions?.length ? ctx.questions : [
  'Do you already have an AWS account set up?',
  'What region(s) do you need this to run in?',
  'When would you ideally like to go live?',
])}

Would a 15-minute discovery call work this week? I can share a quick architecture sketch on the call.

${sign(ctx)}`,
  }),

  'send-proposal': (ctx) => ({
    subject: `Proposal: ${ctx.projectTitle || 'AWS engagement'}`,
    body:
`${greet(ctx)}

Following our conversation, here is my proposal for ${ctx.projectTitle || 'the project'}.

What's included:
${bullets(ctx.included?.length ? ctx.included : [
  'Reference architecture + IaC code',
  'CI/CD pipeline configured for your GitHub repo',
  'Security baseline (IAM, KMS, GuardDuty, CloudTrail)',
  'Documentation + runbooks',
  '2 revision rounds',
  '14 days post-delivery support',
])}

Timeline: ${ctx.timeline || '21 days from kickoff'}.
Investment: ${ctx.budget ? fmtCurrency(ctx.budget, ctx.currency) + ' fixed' : 'as discussed'}.
Payment: 50% deposit to begin, 50% on successful delivery.

The full deck (10 slides) is attached. Happy to walk through it live — I can hold a 30-minute slot on ${fmtDate(addDays(new Date(), 2))} or ${fmtDate(addDays(new Date(), 3))}.

${sign(ctx)}`,
  }),

  'weekly-update': (ctx) => ({
    subject: `Weekly update — ${ctx.projectTitle || 'project'} — Week ${ctx.weekNumber || '2'}`,
    body:
`${greet(ctx)}

Here is your weekly progress update.

✅ Completed this week:
${bullets(ctx.completed?.length ? ctx.completed : [
  'VPC + subnet baseline deployed in dev account',
  'IAM roles and least-privilege policies',
  'CodePipeline configured for the app repo',
])}

🔄 In progress:
${bullets(ctx.inProgress?.length ? ctx.inProgress : [
  'ECS Fargate task definitions',
  'CloudWatch alarms + dashboards',
])}

📅 Next week plan:
${bullets(ctx.nextWeek?.length ? ctx.nextWeek : [
  'RDS Multi-AZ provisioning',
  'Load testing against staging environment',
  'Documentation pass + walkthrough',
])}

We remain on track for delivery on ${ctx.deliveryDate || fmtDate(addDays(new Date(), 14))}. Reply to this email if anything is unclear or if priorities have shifted.

${sign(ctx)}`,
  }),

  'project-delivered': (ctx) => ({
    subject: `Delivered: ${ctx.projectTitle || 'AWS engagement'} — handover package inside`,
    body:
`${greet(ctx)}

Pleased to confirm that ${ctx.projectTitle || 'the engagement'} is complete and handed over.

Attached / linked you will find:
${bullets([
  'Architecture diagrams (PNG + PDF)',
  'Terraform / CloudFormation code',
  'Deployment guide',
  'Cost + security validation reports',
  'Runbook for day-2 operations',
])}

A few next steps on my side:
${bullets([
  'I have left the dev environment running so your team can explore.',
  '14 days of post-delivery support starts today — reply to this email for any fixes.',
  'If a feature outside of scope comes up, happy to scope a phase 2.',
])}

It was a pleasure working with ${ctx.clientCompany || 'the team'}. If you have a minute, a short review would mean a lot — I'll send the link separately.

${sign(ctx)}`,
  }),

  'invoice-reminder': (ctx) => ({
    subject: `Friendly reminder: invoice ${ctx.invoiceNumber || '#INV-001'} due ${ctx.dueDate || 'soon'}`,
    body:
`${greet(ctx)}

A friendly reminder that invoice ${ctx.invoiceNumber || '#INV-001'} for ${fmtCurrency(ctx.amount, ctx.currency)} is due on ${ctx.dueDate || fmtDate(addDays(new Date(), 3))}.

You can pay via:
${bullets([
  'Wise:     ' + (ctx.wise     || 'your account on file'),
  'Payoneer: ' + (ctx.payoneer || 'your account on file'),
])}

If the invoice is already on the way, please ignore — and thank you. If there is any issue or you need a different format, just reply and I will sort it.

${sign(ctx)}`,
  }),

  'review-request': (ctx) => ({
    subject: `Quick favour — would you review our work?`,
    body:
`${greet(ctx)}

Hope ${ctx.projectTitle || 'the new environment'} is treating you well so far.

If it is not too much to ask, would you have 90 seconds to share a short review? Honest words from clients like ${ctx.clientCompany || 'you'} are how I build trust with future engagements.

${ctx.reviewLink ? `Link: ${ctx.reviewLink}` : 'I will send the link in a separate email.'}

Either way, thank you for trusting me with this work. Looking forward to phase 2 when you are ready.

${sign(ctx)}`,
  }),

  'past-client-checkin': (ctx) => ({
    subject: `Quick check-in — how is the AWS setup running?`,
    body:
`${greet(ctx)}

It has been about a month since we wrapped ${ctx.projectTitle || 'the engagement'}. Just checking in — how is everything running?

Common things to keep an eye on by week 4:
${bullets([
  'CloudWatch alarms — any noise that needs tuning?',
  'Cost — is monthly spend tracking the estimate?',
  'Any new requirements that have surfaced?',
])}

Happy to jump on a 15-minute call if anything needs a fresh pair of eyes. No charge — call it a tune-up.

${sign(ctx)}`,
  }),

  'polite-decline': (ctx) => ({
    subject: `Thanks for reaching out about ${ctx.projectTitle || 'the project'}`,
    body:
`${greet(ctx)}

Thank you for considering me for ${ctx.projectTitle || 'this project'}. After reviewing the brief I do not think I am the best fit ${ctx.reason ? `because ${ctx.reason}` : 'right now'}.

A couple of paths I would suggest:
${bullets([
  'For pure DevOps work I would recommend looking at engineers with deep K8s focus.',
  'For specialised security audits, an AWS Security Specialist Partner is the safer bet.',
])}

I would love to stay in touch — please keep me in mind for AWS architecture / network engagements in the future.

${sign(ctx)}`,
  }),

  'need-more-info': (ctx) => ({
    subject: `Re: ${ctx.projectTitle || 'AWS project'} — a few questions before I quote`,
    body:
`${greet(ctx)}

Thanks for the brief on ${ctx.projectTitle || 'the project'}. Before I send you a tight proposal, I need a few details so I do not waste your time with a vague number.

${bullets(ctx.questions?.length ? ctx.questions : [
  'Do you already have an AWS account, or should I deploy in mine and hand over?',
  'Which region(s) are you targeting?',
  'Expected traffic / number of users at launch?',
  'Are there any compliance requirements (HIPAA, PCI, SOC 2, GDPR)?',
  'Preferred IaC tool (Terraform, CDK, CloudFormation)?',
  'Any hard deadline I should design around?',
])}

A 15-minute call would close most of this faster than email. Available any of these slots:
${bullets(ctx.slots?.length ? ctx.slots : [
  fmtDate(addDays(new Date(), 1)) + ' — 14:00 GMT',
  fmtDate(addDays(new Date(), 2)) + ' — 10:00 GMT',
  fmtDate(addDays(new Date(), 3)) + ' — 16:00 GMT',
])}

${sign(ctx)}`,
  }),

  'discovery-call': (ctx) => ({
    subject: `Discovery call — ${ctx.projectTitle || 'AWS engagement'}`,
    body:
`${greet(ctx)}

Following up to schedule the discovery call for ${ctx.projectTitle || 'the project'}.

The agenda I usually run (~25 minutes):
${bullets([
  'Your current setup + biggest pain points',
  'Where you want to be in 90 days',
  'Constraints — budget, timeline, compliance',
  'Rough architecture sketch on screen',
  'Next steps if there is a good fit',
])}

A few slots that work my side:
${bullets(ctx.slots?.length ? ctx.slots : [
  fmtDate(addDays(new Date(), 1)) + ' — 14:00 GMT',
  fmtDate(addDays(new Date(), 2)) + ' — 10:00 GMT',
  fmtDate(addDays(new Date(), 3)) + ' — 16:00 GMT',
])}

${ctx.bookingLink ? `Or book directly: ${ctx.bookingLink}` : ''}

${sign(ctx)}`,
  }),
};

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

// -------------------------------------------------------------
// Public API
// -------------------------------------------------------------

/** Generate a draft email for a given type. Returns { subject, body }. */
export function generateEmail(typeId, context = {}) {
  const fn = builders[typeId];
  if (!fn) return { subject: '', body: 'Unknown template.' };
  return fn(context);
}

/** Default starter library of 20 templates the user can edit/star. */
export function defaultEmailLibrary() {
  // Pre-populate the library with the 10 type-builders + 10 short snippets
  const fromTypes = EMAIL_TYPES.map((t) => {
    const sample = builders[t.id]({});
    return {
      id: uid(),
      name: t.label,
      type: t.id,
      category: t.category,
      subject: sample.subject,
      body: sample.body,
      starred: false,
      createdAt: new Date().toISOString(),
      builtIn: true,
    };
  });

  const snippets = [
    {
      name: 'Polite nudge — 5 days post-proposal',
      category: 'Proposal',
      subject: 'Following up on the proposal',
      body:
`Hi {clientFirstName},

Wanted to check if the proposal landed safely and whether you had any questions on scope or pricing.

Happy to jump on a quick call if it would be easier — even 10 minutes works.

Best,
{authorName}`,
    },
    {
      name: 'Thanks after kickoff call',
      category: 'Inquiry',
      subject: 'Great chatting — next steps',
      body:
`Hi {clientFirstName},

Great chatting earlier. As discussed, I will send through the signed engagement letter today and we will kick off on Monday.

Please reply with: AWS account ID, preferred region, and any read-only credentials you would like me to use during discovery.

Best,
{authorName}`,
    },
    {
      name: 'Scope-change confirmation',
      category: 'Update',
      subject: 'Scope change — confirmation needed',
      body:
`Hi {clientFirstName},

Just to confirm the new ask in writing:
• Adding: [new deliverable]
• Impact on timeline: +[N] days
• Impact on cost: +[$amount]

Reply "approve" and I will roll it into the plan.

Best,
{authorName}`,
    },
    {
      name: 'Project paused (waiting on client)',
      category: 'Update',
      subject: 'Project on hold pending input',
      body:
`Hi {clientFirstName},

I have paused active work until I have:
• [item 1]
• [item 2]

The clock on the engagement is paused as of today. Send those over and we restart immediately.

Best,
{authorName}`,
    },
    {
      name: 'Late-payment escalation (gentle)',
      category: 'Invoice',
      subject: 'Invoice {invoiceNumber} — 7 days overdue',
      body:
`Hi {clientFirstName},

Invoice {invoiceNumber} for {amount} is now 7 days overdue. Could you let me know when payment is likely to land?

If there is anything blocking, just tell me — I am happy to work with you.

Best,
{authorName}`,
    },
    {
      name: 'Referral request',
      category: 'Retention',
      subject: 'Quick favour — referral',
      body:
`Hi {clientFirstName},

If anyone in your network is wrestling with AWS, would you be open to sending them my way?

I am selectively taking on suitable AWS projects. If you were satisfied with the completed work, would you be comfortable introducing me to someone who may need similar help?

Best,
{authorName}`,
    },
    {
      name: 'Holiday / out of office',
      category: 'Update',
      subject: 'Heads-up — out next week',
      body:
`Hi {clientFirstName},

Heads-up — I will be away [dates]. Anything urgent before then, just reply and I will batch it.

I will check email once a day for emergencies only.

Best,
{authorName}`,
    },
    {
      name: 'Welcome onboard',
      category: 'Inquiry',
      subject: 'Welcome onboard — let\'s build',
      body:
`Hi {clientFirstName},

Welcome onboard. Excited to get started on {projectTitle}.

Here is what happens this week:
• Today: agreement signed + deposit invoice
• Tomorrow: kickoff call
• Day 3: account access + architecture lock
• Day 5: first commit ships

Best,
{authorName}`,
    },
    {
      name: 'Phase 1 complete — phase 2 ask',
      category: 'Delivery',
      subject: 'Phase 1 wrapped — onto phase 2?',
      body:
`Hi {clientFirstName},

Phase 1 is wrapped and signed off. Phase 2 (the scaling work) is ready to start when you give the green light.

Same team, same rate, same timeline structure. Want me to send the phase 2 SOW?

Best,
{authorName}`,
    },
    {
      name: 'End-of-year thank you',
      category: 'Retention',
      subject: 'A quick thank you for this year',
      body:
`Hi {clientFirstName},

Wanted to close the year by saying thank you — working with {clientCompany} has been a highlight.

If there is anything brewing for the new year, I would love to help shape it. Otherwise, enjoy the break.

Best,
{authorName}`,
    },
  ].map((s) => ({
    id: uid(),
    type: 'custom',
    starred: false,
    createdAt: new Date().toISOString(),
    builtIn: true,
    ...s,
  }));

  return [...fromTypes, ...snippets];
}

/**
 * Build mailto:/Gmail/Outlook compose URLs.
 */
export function mailtoUrl({ to, subject, body }) {
  const q = new URLSearchParams({ subject: subject || '', body: body || '' }).toString();
  return `mailto:${encodeURIComponent(to || '')}?${q}`;
}

/**
 * Build a Gmail compose URL targeted at a specific signed-in Google account.
 *
 * @param {object} args
 *  - to / subject / body : email payload
 *  - userIndex (number)  : which signed-in Gmail account to use (0 = primary, 1 = secondary, ...)
 *                          maps to /u/N/ in the Gmail URL
 *  - authAddress (string) : optional — also passes ?authuser=email so Gmail picks the right account
 *                           even if the user index has shifted
 */
export function gmailComposeUrl({ to, subject, body, userIndex = 0, authAddress = '' } = {}) {
  const params = new URLSearchParams({
    view: 'cm', fs: '1',
    to: to || '',
    su: subject || '',
    body: body || '',
  });
  if (authAddress) params.set('authuser', authAddress);
  const u = Number.isFinite(+userIndex) ? +userIndex : 0;
  return `https://mail.google.com/mail/u/${u}/?${params.toString()}`;
}

export function outlookComposeUrl({ to, subject, body }) {
  const q = new URLSearchParams({
    path: '/mail/action/compose',
    to: to || '',
    subject: subject || '',
    body: body || '',
  }).toString();
  return `https://outlook.live.com/owa/?${q}`;
}
