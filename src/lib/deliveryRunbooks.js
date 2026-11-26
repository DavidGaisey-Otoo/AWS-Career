/**
 * deliveryRunbooks.js — how David delivers his three packages, safely.
 *
 * Each runbook is a checklist where every step that changes something
 * says how to undo it. Ticking a step records the change, and the
 * handover report is built from those records, so the client gets a list
 * of exactly what changed and how to reverse each change.
 *
 * Client-safety rules are built in, not advisory:
 *   - work happens in the CLIENT's AWS account, through an IAM user they
 *     create with only the access the job needs;
 *   - never on David's own account or card;
 *   - no client password or key is stored in the app or sent in chat;
 *   - a cost check changes nothing.
 * Costs are estimates with their conditions stated (CLAUDE.md §2).
 * Pure.
 */
import { scanForSecrets } from './clientReport.js';

export const CLIENT_SAFETY_RULES = Object.freeze([
  { id: 'their-account', text: "Work only in the client's own AWS account. Never build client resources in your account or on your card." },
  { id: 'least-privilege', text: 'Ask the client to create an IAM user for you with only the access this job needs. Never accept the root password.' },
  { id: 'no-secrets', text: 'Never store a client password or access key in this app, in notes, or in chat. Temporary passwords are read out on a call and changed at first sign-in.' },
  { id: 'root-stays', text: 'The root user stays with the client. Root-only steps (MFA on root, billing access) are done by the client while you guide them.' },
  { id: 'undo', text: 'Every change is written down with how to undo it, and goes in the handover report.' },
  { id: 'remove-access', text: 'At the end, the client deletes the IAM user they made for you. Until then you can still sign in.' },
  { id: 'cost-ok', text: 'Nothing that costs money, and nothing deleted, without the client saying yes in writing on Upwork.' },
]);

const step = (id, doText, why, minutes, undo, verify, changes = true) => ({ id, do: doText, why, minutes, undo, verify, changes });

export const RUNBOOKS = Object.freeze([
  {
    id: 'safe-start',
    title: 'AWS Account Safe Start',
    summary: 'Root MFA, least-privilege IAM, a budget alert and CloudTrail.',
    policies: ['IAMFullAccess', 'AWSCloudTrail_FullAccess', 'job-function/Billing', 'AmazonS3FullAccess (for the CloudTrail log bucket)'],
    cost: 'Estimated $0–$1 a month: IAM, MFA, budgets (the first two) and CloudTrail event history are free; a trail\'s first copy of management events is free, and its S3 log bucket costs a few cents a month at small-account volumes.',
    steps: [
      step('root-mfa', 'The client turns on MFA for the root user while you guide them on a call.', 'Root can do anything in the account. A password alone is not enough to protect it.', 10, 'Root user → Security credentials → remove the MFA device (only when replacing it).', 'IAM → Dashboard shows MFA on the root user.'),
      step('root-keys', 'Check the root user has no access keys. The client deletes any it has.', 'Root access keys are full-power keys that never expire.', 5, 'A deleted key cannot be restored. A new one could be created, but should not be.', 'Root user → Security credentials → Access keys is empty.'),
      step('billing-access', 'The client turns on "IAM user and role access to billing information" (Account settings, root only).', 'Without it, nobody but root can see the bill or set a budget.', 5, 'Account settings → turn the same setting off.', 'Your IAM user can open Billing and Cost Management.'),
      step('admin-user', 'Create an Admins group (AdministratorAccess) and a named IAM user for the client, with MFA.', 'The client signs in with this every day instead of root.', 15, 'Remove the user from the group, delete its MFA device and login profile, then delete the user and the group.', 'The client signs in with the new user and MFA.'),
      step('staff-users', 'Create IAM users or groups for staff, each with only the access they need (up to 5).', 'Shared logins and full admin for everyone are how accounts get damaged.', 20, 'Delete each user listed in the handover report.', 'Each person signs in and can do their job, and no more.'),
      step('budget', 'Create a monthly cost budget with email alerts at 80% and 100% of actual spend, and 100% of forecast.', 'A surprise bill is the most common small-account problem.', 10, 'Billing → Budgets → delete the budget.', 'The budget shows in Billing → Budgets with the alert email address.'),
      step('cloudtrail', 'Create a trail for all regions that logs to a new private S3 bucket.', 'A record of who changed what, kept longer than the free 90-day history.', 15, 'Delete the trail, then empty and delete its log bucket.', 'CloudTrail → Trails shows it logging, multi-region.'),
      step('security-check', 'Turn on IAM Access Analyzer and review the free security checks. Write down what they found, in plain English.', 'The client should know what is exposed before anyone else finds it.', 20, 'Delete the analyzer.', 'Findings are listed in the handover report.'),
    ],
    watch: ['The budget alert emails go to the address you chose. Make sure someone reads it.', 'Turn on MFA for every new user you add later.'],
  },
  {
    id: 'static-site',
    title: 'Static website on S3 + CloudFront (HTTPS)',
    summary: 'A private bucket behind CloudFront, a free certificate, and the domain pointed at it.',
    policies: ['AmazonS3FullAccess', 'CloudFrontFullAccess', 'AWSCertificateManagerFullAccess', 'AmazonRoute53FullAccess (only if the domain is in Route 53)'],
    cost: 'Estimated $0.50–$2 a month for a small site: a Route 53 hosted zone is $0.50 a month; S3 and CloudFront stay within the free tier at low traffic (CloudFront 1 TB out and 10 million requests a month, always free); the ACM certificate is free.',
    steps: [
      step('bucket', 'Create a private S3 bucket (Block Public Access stays on).', 'The files are served by CloudFront only, never straight from the bucket.', 5, 'Empty the bucket, then delete it.', 'S3 → the bucket shows "Bucket and objects not public".'),
      step('upload', "Upload the site's files.", 'These are the pages visitors will see.', 10, 'Delete the uploaded objects.', 'index.html and the assets are listed in the bucket.'),
      step('certificate', 'Request a free certificate in AWS Certificate Manager in us-east-1 and validate it by DNS.', 'CloudFront only uses certificates from us-east-1, and HTTPS needs one.', 15, 'Remove it from CloudFront first, then delete the certificate.', 'ACM shows the certificate as Issued.'),
      step('distribution', 'Create a CloudFront distribution with origin access control, index.html as the default page, and HTTP redirected to HTTPS.', 'Fast, secure delivery without making the bucket public.', 20, 'Disable the distribution, wait for it to deploy, then delete it.', 'The distribution URL loads the site over HTTPS.'),
      step('bucket-policy', 'Add the bucket policy that lets only this distribution read the files.', 'Without it CloudFront gets "Access denied"; with a public policy, anyone can bypass CloudFront.', 5, 'Remove that policy statement from the bucket.', 'The S3 object URL is denied; the CloudFront URL works.'),
      step('dns', 'Write down the current DNS records, then point the domain at CloudFront (Route 53 alias, or a CNAME at the current DNS provider).', 'Visitors reach the new site on the client\'s own name.', 15, 'Put back the old DNS records you wrote down.', 'https://<domain> loads the new site with a valid padlock.'),
      step('test', 'Test: the domain loads over HTTPS, http:// redirects, and the bucket URL is denied.', 'Proof the job is done, by looking.', 10, 'Nothing to undo; this changes nothing.', 'All three checks pass.', false),
    ],
    watch: ['The certificate renews automatically while the DNS validation record stays in place. Do not delete that record.', 'To update the site, upload new files and create a CloudFront invalidation for /*.'],
  },
  {
    id: 'cost-check',
    title: 'AWS Cost Check (report only)',
    summary: 'Read-only review of what costs money, with estimated savings. Nothing is changed or deleted.',
    policies: ['ReadOnlyAccess', 'job-function/Billing (read the bill)'],
    cost: 'Estimated $0: this job reads, it does not create anything. (Cost Explorer API calls are $0.01 each; using the console is free.)',
    steps: [
      step('by-service', 'Review the last three months of cost by service and by region in Cost Explorer.', 'Shows where the money goes before guessing why.', 15, 'Nothing to undo; read only.', 'The top five costs are listed in the report.', false),
      step('idle', 'Look for idle resources: stopped instances still paying for disks, unattached volumes, unused Elastic IPs, old snapshots, NAT gateways and load balancers with no traffic.', 'Idle resources are the usual source of waste.', 30, 'Nothing to undo; read only.', 'Each one is listed with its estimated monthly cost.', false),
      step('regions', 'Check every region for running resources, not just the usual one.', 'Forgotten resources hide in regions nobody looks at.', 15, 'Nothing to undo; read only.', 'Every region checked is named in the report.', false),
      step('sizing', 'Note instances and databases that look oversized for their use.', 'Smaller sizes are often the biggest saving.', 15, 'Nothing to undo; read only.', 'Each suggestion states the size now, the size suggested and the estimated saving.', false),
      step('report', 'Write the report: each saving with its estimated monthly amount and how to make the change.', 'The client decides what to act on.', 30, 'Nothing to undo; read only.', 'The client has the report.', false),
    ],
    watch: ['Nothing was changed or deleted. Each saving is the client\'s decision.', 'Savings are estimates from current usage; next month\'s bill is the real test.'],
  },
]);

export const getRunbook = (id) => RUNBOOKS.find((r) => r.id === id) || null;

/**
 * The message asking the client for access. For Upwork chat (Upwork's
 * terms keep contact on the platform before a contract). It asks for an
 * IAM user with only the listed permissions, and keeps the password out
 * of the chat.
 */
export function accessRequestMessage({ runbookId, clientName = '', myName = '' } = {}) {
  const rb = getRunbook(runbookId);
  if (!rb) return '';
  const first = String(clientName || '').trim().split(/\s+/)[0];
  const user = `${(String(myName || 'contractor').trim().split(/\s+/)[0] || 'contractor').toLowerCase().replace(/[^a-z0-9]/g, '')}-contractor`;
  return [
    first ? `Hi ${first},` : 'Hi,',
    '',
    `To start the ${rb.title}, I need access to your AWS account. I work only in your account, with only the access this job needs. Please don't send me your root password.`,
    '',
    'Could you create an IAM user for me:',
    `1. IAM → Users → Create user. Name: ${user}`,
    '2. Tick "Provide user access to the AWS Management Console" and "Users must create a new password at next sign-in".',
    `3. Attach only these permissions: ${rb.policies.join(', ')}.`,
    '4. Send me the sign-in URL and the user name here.',
    '',
    "Please don't type the temporary password in this chat. Read it to me on our call; I'll change it and add MFA when I first sign in.",
    '',
    `When the job is done, delete the ${user} user and my access ends.`,
    '',
    rb.id === 'safe-start' ? 'A few steps need the root user (MFA on root, billing access). You do those yourself while I guide you on a call.' : null,
  ].filter((l) => l !== null).join('\n').trim();
}

/**
 * Is this the client's account, and not David's own? Reads the 12-digit
 * account number from pasted `aws sts get-caller-identity` output or the
 * console's account menu. Fails closed: if it cannot read one, or does
 * not know the client's, it is not "ok".
 */
export function checkAccountTarget({ pasted = '', clientAccountId = '', ownAccountIds = [] } = {}) {
  const digits = (s) => String(s || '').replace(/[\s-]/g, '');
  const found = (String(pasted).match(/"Account"\s*:\s*"(\d{12})"/) || String(pasted).replace(/(\d{4})-(\d{4})-(\d{4})/g, '$1$2$3').match(/\b(\d{12})\b/) || [])[1] || null;
  const client = digits(clientAccountId);
  const own = ownAccountIds.map(digits).filter((x) => /^\d{12}$/.test(x));
  const problems = [];
  if (!found) problems.push('No 12-digit account number found. Paste the output of "aws sts get-caller-identity", or the account ID from the console menu.');
  if (!/^\d{12}$/.test(client)) problems.push("The client's account ID is not recorded, so there is nothing to compare with. Ask them for it.");
  if (found && own.includes(found)) problems.push('This is YOUR account, not the client\'s. Stop: client work never goes in your account.');
  if (found && /^\d{12}$/.test(client) && found !== client) problems.push(`Signed in to account ending ${found.slice(-4)}, but the client's ends ${client.slice(-4)}. Switch accounts before changing anything.`);
  return { ok: problems.length === 0, accountId: found, problems };
}

const NOTE_SECRETS = [
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,                                     // access key id
  /(?<![A-Za-z0-9/+])[A-Za-z0-9/+]{40}(?![A-Za-z0-9/+])/,                 // secret access key shape
  /\b(?:password|passwd|pwd|passcode|pin|secret|token|api[_ -]?key)\b\s*[:=]\s*\S{4,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

/** Notes must not hold a client secret. Account numbers and emails are fine here. */
export function notesProblem(text = '') {
  const t = String(text || '');
  const keyId = scanForSecrets(t).some((h) => h.type === 'AWS access key id');
  return keyId || NOTE_SECRETS.some((re) => re.test(t))
    ? 'These notes look like they contain a password or key. Remove it: client secrets are never stored in the app.'
    : null;
}

/** A fresh delivery record. Small, so it is safe in localStorage. */
export function newDelivery({ runbookId, client = '', clientAccountId = '', now = new Date() } = {}) {
  return { id: `del-${now.getTime().toString(36)}`, runbookId, client: String(client).trim(), clientAccountId: String(clientAccountId).replace(/\D/g, '').slice(0, 12), done: {}, changes: [], notes: '', accountChecked: null, createdAt: now.toISOString() };
}

/**
 * Tick or untick a step. Ticking a step that changes something records
 * the change with its undo; unticking removes that record.
 */
export function toggleStep(delivery, stepId, now = new Date()) {
  const rb = getRunbook(delivery?.runbookId);
  const st = rb?.steps.find((s) => s.id === stepId);
  if (!st) return delivery;
  const done = { ...(delivery.done || {}) };
  let changes = [...(delivery.changes || [])];
  if (done[stepId]) {
    delete done[stepId];
    changes = changes.filter((c) => c.stepId !== stepId);
  } else {
    done[stepId] = now.toISOString();
    if (st.changes) changes.push({ stepId, what: st.do, undo: st.undo, at: now.toISOString() });
  }
  return { ...delivery, done, changes };
}

/** Steps that change the client's account must wait for the account check. */
export function stepLocked(delivery, stepId) {
  const st = getRunbook(delivery?.runbookId)?.steps.find((s) => s.id === stepId);
  return Boolean(st?.changes && !delivery?.accountChecked);
}

export function progress(delivery) {
  const rb = getRunbook(delivery?.runbookId);
  if (!rb) return { done: 0, total: 0, minutesLeft: 0 };
  const done = rb.steps.filter((s) => delivery.done?.[s.id]);
  return { done: done.length, total: rb.steps.length, minutesLeft: rb.steps.filter((s) => !delivery.done?.[s.id]).reduce((n, s) => n + s.minutes, 0) };
}

const fmtDate = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

/** The handover report, as text for Upwork chat or a document. */
export function handoverReport(delivery, { author = '', now = new Date() } = {}) {
  const rb = getRunbook(delivery?.runbookId);
  if (!rb) return '';
  const done = rb.steps.filter((s) => delivery.done?.[s.id]);
  const notDone = rb.steps.filter((s) => !delivery.done?.[s.id]);
  const lines = [
    `HANDOVER: ${rb.title}`,
    delivery.client ? `Client: ${delivery.client}` : null,
    `Date: ${fmtDate(now.toISOString())}${author ? ` · Prepared by ${author}` : ''}`,
    delivery.clientAccountId ? `AWS account: ending ${delivery.clientAccountId.slice(-4)}` : null,
    '',
    'WHAT WAS DONE',
    ...(done.length ? done.map((s) => `✓ ${s.do} (${fmtDate(delivery.done[s.id])})\n   Check: ${s.verify}`) : ['Nothing yet.']),
  ];
  if (notDone.length) lines.push('', 'NOT DONE (agreed out of scope, or still to do)', ...notDone.map((s) => `• ${s.do}`));
  lines.push('', 'CHANGES, AND HOW TO UNDO EACH ONE');
  lines.push(...(delivery.changes?.length
    ? delivery.changes.map((c, i) => `${i + 1}. ${c.what}\n   To undo: ${c.undo}`)
    : [rb.id === 'cost-check' ? 'None. This was a read-only review; nothing in your account was changed or deleted.' : 'No changes recorded.']));
  lines.push('', 'KEEP AN EYE ON', ...rb.watch.map((w) => `• ${w}`));
  lines.push('', 'RUNNING COST', rb.cost);
  lines.push('', 'REMOVE MY ACCESS', 'Delete the IAM user you created for me (IAM → Users). Until you do, I can still sign in.');
  if (delivery.notes?.trim()) lines.push('', 'NOTES', delivery.notes.trim());
  return lines.filter((l) => l !== null).join('\n');
}

export const DELIVERIES_KEY_SUFFIX = '::deliveries';
