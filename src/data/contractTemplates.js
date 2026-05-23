/**
 * Contract & legal templates for AWS freelancers.
 *
 * These are reasonable starting points — NOT legal advice. Each template
 * has a header note reminding the user to localise to their jurisdiction.
 *
 * Templates use {placeholders} the UI fills in for copy-to-clipboard.
 */

export const CONTRACT_TEMPLATES = [
  {
    id: 'freelance-agreement',
    title: 'Freelance services agreement',
    short: 'The main contract you send before any paid work begins.',
    icon: '📜',
    placeholders: ['your_name', 'client_name', 'project_title', 'currency', 'amount', 'start_date'],
    body: `FREELANCE SERVICES AGREEMENT

This Freelance Services Agreement ("Agreement") is entered into on {start_date} between {your_name} ("Contractor") and {client_name} ("Client").

1. SERVICES
   Contractor will provide AWS cloud engineering services for the project titled "{project_title}", as scoped in the attached Statement of Work (SOW).

2. COMPENSATION
   Client will pay Contractor {currency} {amount} for the services. Payment schedule:
   - 50% upfront before work begins (deposit, non-refundable)
   - 50% on delivery and Client acceptance

3. TIMELINE
   The project shall commence on {start_date} and complete per the milestones in the SOW. Reasonable extensions for client-driven delays are mutually agreed in writing.

4. CHANGE REQUESTS
   Any work outside the SOW is treated as a Change Request and quoted separately before being undertaken.

5. INTELLECTUAL PROPERTY
   Upon full payment, Client owns the deliverables specified in the SOW. Contractor retains the right to reuse generic patterns, IaC modules, and skills developed.

6. CONFIDENTIALITY
   Both parties agree to keep confidential information shared during the engagement private for a period of two (2) years after the engagement ends.

7. INDEPENDENT CONTRACTOR
   Contractor is an independent contractor, not an employee. Contractor is responsible for own taxes, insurance, and equipment.

8. LIMITATION OF LIABILITY
   Contractor's total liability under this Agreement is limited to the amounts paid by Client in the preceding 12 months.

9. TERMINATION
   Either party may terminate this Agreement with seven (7) days' written notice. Client pays for all work completed up to the termination date.

10. GOVERNING LAW
    This Agreement is governed by the laws of {client_country} (or specify another mutually agreed jurisdiction).

Signed:
Contractor: ________________________   Date: ____________
Client:     ________________________   Date: ____________

— NOT LEGAL ADVICE. Have a lawyer review before use in regulated work. —`,
  },

  {
    id: 'sow',
    title: 'Statement of Work (SOW)',
    short: 'Defines exactly what you\'re delivering, by when, for how much.',
    icon: '📋',
    placeholders: ['project_title', 'client_name', 'start_date', 'deliverables', 'amount'],
    body: `STATEMENT OF WORK — {project_title}

Client: {client_name}
Contractor: {your_name}
Start date: {start_date}

OBJECTIVES
- [Objective 1 — what the Client gets out of this engagement]
- [Objective 2]
- [Objective 3]

SCOPE OF WORK
Included:
- [Item — e.g. Design multi-AZ VPC across two AZs]
- [Item — e.g. Implement IaC in Terraform]
- [Item — e.g. Set up CloudWatch dashboard with 6 widgets]

Explicitly NOT included (to prevent scope creep):
- [Out-of-scope item — e.g. Application code changes]
- [Out-of-scope item — e.g. 24/7 on-call support post-handoff]

DELIVERABLES
1. Architecture diagram (PDF + draw.io source).
2. Infrastructure as Code in {iac_tool}.
3. Walk-through document for the operations team.
4. 30-day post-delivery support (defined below).

MILESTONES
| # | Deliverable | Target date | Payment % |
| 1 | Design doc + sign-off       | Day 7  | 25% |
| 2 | IaC complete + dev deploy   | Day 14 | 25% |
| 3 | Production deploy + handoff | Day 21 | 50% |

POST-DELIVERY SUPPORT (30 days)
Includes: bug fixes to delivered IaC, clarification calls, minor adjustments.
Excludes: new features, scope expansion, training a new team.

PRICING
Fixed: {amount}
Payment terms per the main Services Agreement (50% upfront, 50% on completion).

Signed:
Contractor: ________________________
Client:     ________________________`,
  },

  {
    id: 'change-request',
    title: 'Change Request',
    short: 'Use this any time the client asks for "just one more thing".',
    icon: '🔄',
    placeholders: ['project_title', 'request_summary', 'impact_summary', 'extra_cost'],
    body: `CHANGE REQUEST — {project_title}

Date: _______________
Requested by: _______________

DESCRIPTION OF CHANGE
{request_summary}

IMPACT
- Schedule impact: {impact_summary}
- Affected deliverables: [list]
- New deliverables introduced: [list]

PRICING
Additional cost: {extra_cost}
Revised total contract value: ________

APPROVAL
This change becomes part of the SOW only after both parties sign below.

Approved by Contractor: ________________________   Date: ___________
Approved by Client:     ________________________   Date: ___________`,
  },

  {
    id: 'nda',
    title: 'Mutual NDA',
    short: 'Sign this BEFORE the client shares architecture diagrams or production data.',
    icon: '🔒',
    placeholders: ['your_name', 'client_name'],
    body: `MUTUAL NON-DISCLOSURE AGREEMENT

Parties: {your_name} ("Party A") and {client_name} ("Party B").

1. CONFIDENTIAL INFORMATION
   Any non-public technical, business, financial, or customer information shared between the Parties in connection with potential or actual collaboration.

2. OBLIGATIONS
   Each Party will:
   - Hold the other's Confidential Information in strict confidence.
   - Use it only for the purpose of evaluating or performing the engagement.
   - Not disclose it to any third party without prior written consent.

3. EXCLUSIONS
   This Agreement does not cover information that:
   - Was already publicly known.
   - Is independently developed without use of the other Party's Confidential Information.
   - Is required to be disclosed by law (with prompt notice to the other Party).

4. TERM
   This Agreement is effective from the date last signed below and continues for two (2) years thereafter.

5. NO TRANSFER OF RIGHTS
   Nothing in this NDA grants either Party a license or ownership in the other's IP.

Signed:
{your_name}: ________________________   Date: ___________
{client_name}: ________________________   Date: ___________`,
  },

  {
    id: 'invoice-cover',
    title: 'Invoice cover note',
    short: 'Short, friendly email accompanying an invoice.',
    icon: '✉',
    placeholders: ['client_first_name', 'invoice_number', 'amount', 'due_date', 'your_first_name'],
    body: `Subject: Invoice {invoice_number} — {amount}

Hi {client_first_name},

Attaching invoice {invoice_number} for {amount}, due {due_date}.

Quick recap of what's covered:
- [Line item 1]
- [Line item 2]
- [Line item 3]

Payment methods accepted:
- Wise (preferred for international)
- Payoneer
- Direct bank transfer (details on the invoice)

Let me know if you need anything reformatted for your accounting team.

Thanks again for trusting me with this work.

— {your_first_name}`,
  },

  {
    id: 'late-payment',
    title: 'Late payment reminder',
    short: 'Firm but professional. Use after 3-5 days overdue.',
    icon: '⏰',
    placeholders: ['client_first_name', 'invoice_number', 'amount', 'days_overdue', 'your_first_name'],
    body: `Subject: Friendly nudge — Invoice {invoice_number}

Hi {client_first_name},

Hope all is well. Just a quick note that invoice {invoice_number} for {amount} is now {days_overdue} days past its due date.

If it's already on its way through your AP system, no action needed and thank you. If not, could you let me know expected payment date so I can plan my work allocation for next week?

Happy to resend the invoice if it got lost.

— {your_first_name}

— Per our services agreement, invoices over 14 days late carry a {late_fee_pct}% monthly late fee. I'm flagging this in case it helps you escalate internally. —`,
  },

  {
    id: 'project-completion',
    title: 'Project completion / handover',
    short: 'Marks the official end + asks for review/referral.',
    icon: '✅',
    placeholders: ['client_first_name', 'project_title', 'your_first_name'],
    body: `Subject: {project_title} — wrapped + handover

Hi {client_first_name},

We hit the finish line on {project_title}.

What's delivered (also listed in the README of the repo):
- [Deliverable 1]
- [Deliverable 2]
- [Deliverable 3]

What I'm leaving you with:
- All IaC + diagrams in the shared repo (you have admin)
- 30-day support window starts today — reach me at any time for bug fixes
- A 1-page runbook for the on-call team

Two quick asks if you have a moment:
1. A short review on Upwork/LinkedIn would help me a lot. Even a couple of sentences is gold.
2. If you know anyone else who could use cloud engineering help, I'd appreciate the intro.

Thanks again for trusting me. It was genuinely a good project to work on.

— {your_first_name}`,
  },

  {
    id: 'revision-policy',
    title: 'Revision policy',
    short: 'Include in your SOW. Caps unlimited tweaks.',
    icon: '↩',
    placeholders: [],
    body: `REVISION POLICY

Each deliverable includes up to two (2) rounds of revisions at no additional cost, provided:
- Revision feedback is consolidated and submitted within 7 days of delivery.
- Revisions stay within the scope defined in the SOW.

Additional revisions are billed at the Contractor's hourly rate as a Change Request.

Revisions outside the SOW are treated as new scope and quoted separately.`,
  },

  {
    id: 'dispute-resolution',
    title: 'Dispute resolution clause',
    short: 'Avoid escalating to lawyers if at all possible.',
    icon: '🤝',
    placeholders: [],
    body: `DISPUTE RESOLUTION

Step 1 — Direct discussion: Either Party may raise a concern in writing. Both Parties commit to a good-faith call within 5 business days.

Step 2 — Mediation: If unresolved after 14 days, the Parties will use a mutually agreed mediator. Costs split 50/50.

Step 3 — Arbitration: Binding arbitration under [jurisdiction-appropriate body], applied only if mediation fails. Costs initially split 50/50, ultimately allocated by the arbitrator.

Neither Party will initiate court proceedings before exhausting the steps above, except for emergency injunctive relief.`,
  },

  {
    id: 'ip-clause',
    title: 'IP ownership clause',
    short: 'Carefully worded — protects both sides.',
    icon: '⚖',
    placeholders: [],
    body: `INTELLECTUAL PROPERTY

DELIVERABLE IP. Upon receipt of full payment, all rights, title, and interest in the deliverables specified in the SOW transfer to Client.

CONTRACTOR BACKGROUND IP. Contractor retains all rights to pre-existing tooling, IaC modules, code snippets, methodologies, and know-how brought into the engagement. Contractor grants Client a perpetual, royalty-free, non-exclusive licence to use such background IP within the delivered work.

OPEN SOURCE. Any open-source components are governed by their respective licences. Contractor will document them in a NOTICE file.

DERIVATIVE WORK. Contractor may use anonymised, generalised lessons learned and patterns in future engagements and content.`,
  },
];

export const PRE_SIGN_CHECKLIST = [
  'Scope is unambiguous — can a stranger read it and know exactly what is in/out?',
  'Payment schedule is explicit — amounts, dates, methods, currency.',
  'Late-payment fee is stated (or accepted as N/A) by both parties.',
  '50% upfront deposit is non-negotiable for new clients.',
  'Change Request process is in place — no "favours" outside scope.',
  'IP ownership clause favours you on background tooling.',
  'Post-delivery support window is defined and capped.',
  'Termination clause works for both sides (mine: 7 days notice).',
  'Jurisdiction is specified for dispute resolution.',
  'NDA is signed BEFORE you see any production architecture or data.',
  'Both signatures are in place (digital or wet).',
  'Save a PDF copy of the signed contract in your records folder.',
];
