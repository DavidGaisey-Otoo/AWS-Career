/**
 * sessionLog.js — the "today" session entry. This is a hand-curated polished
 * markdown document recording exactly what the user did, in the format the
 * user asked for: step by step, well-spaced, with verifications, arrows, and
 * direct URLs.
 *
 * Future sessions are recorded by the SessionRecorder (auto), but THIS one
 * (the AWS account setup) is hardcoded because it happened before the
 * recorder existed.
 *
 * Format: each session has:
 *   id, date, title, summary, durationMin, outcomes[], steps[]
 *   - steps[] uses the same atomic shape as walkthroughs.js
 *   - outcomes[] is the "what now exists" check-list
 *
 * Used by:
 *   - pages/SessionLog.jsx — viewer + Markdown + PDF export
 *   - DocumentCenter — appears as a recent document
 */

export const SESSION_TONIGHT = {
  id: 'aws-account-setup-2026-05-23',
  date: '2026-05-23',
  title: 'AWS account setup — complete hardening',
  summary: 'Set up a working, MFA-protected AWS account with cost alerts and ML anomaly detection. Used existing account (123456789012) after new-account payment retries hit the AWS rate limit. Created IAM user "admin" with admin power, MFA on both root and IAM user, $5 monthly budget, and confirmed AWS auto-enabled Cost Anomaly Detection.',
  durationMin: 180,
  account: { id: '123456789012', alias: 'demo', email: 'you@example.com', region: 'eu-west-1' },
  outcomes: [
    { label: 'Root account exists and verified',         status: 'done', note: 'Pre-existing account, signed in successfully' },
    { label: 'MFA on root account',                       status: 'done', note: 'Authenticator app, scanned QR, 2 consecutive codes' },
    { label: 'IAM admin user with AdministratorAccess',   status: 'done', note: 'Console access enabled, password set' },
    { label: 'MFA on IAM admin user',                     status: 'done' },
    { label: 'Account alias / friendly sign-in URL',      status: 'done' },
    { label: 'Default region set to eu-west-1',           status: 'done' },
    { label: 'Account linked to AWS Career Launchpad Pro',status: 'done', note: 'Active profile in AWS Account Manager' },
    { label: '$5 monthly budget with email alert',        status: 'done', note: 'Budget name: monthly-5-dollar-limit, alert at 80%, to you@example.com' },
    { label: 'AWS Cost Anomaly Detection',                status: 'done', note: 'Auto-enabled by AWS (free ML watchdog)' },
    { label: 'Payment method attached',                   status: 'done', note: 'On existing account; new-account attempts failed (CBG virtual cards rejected)' },
    { label: 'Support plan selected',                     status: 'done', note: 'Basic (Free)' },
  ],
  warnings: [
    'New account creation attempted but blocked by AWS payment retry limit (24-hour cooldown). Existing account is more than 1 year old — past the 12-month Free Tier window. Treat every action as PAID and monitor the $5 budget closely.',
    'Some virtual cards (especially regional / prepaid) may be rejected at the AWS payment screen. If yours is, try a Wise virtual card, a major-bank debit card, or a physical Visa/Mastercard.',
  ],
  steps: [
    {
      n: 1, phase: 'Foundation', title: 'Confirmed existing AWS account access',
      action: { type: 'goto', url: 'https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com&account_type=root' },
      body: 'Signed in as ROOT successfully after a one-time email-mistype reminder (AWS will tell you "account does not exist" if you mistype).',
      checkpoint: 'Root console loaded successfully.',
      durationMin: 8,
    },
    {
      n: 2, phase: 'Foundation', title: 'Enabled MFA on the root user',
      action: { type: 'goto', url: 'https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials' },
      body: 'IAM → Security credentials → Multi-factor authentication → Assign MFA device → Authenticator app → scanned QR code → entered two consecutive 6-digit codes.',
      checkpoint: 'Root account now requires MFA at every sign-in.',
      durationMin: 5,
    },
    {
      n: 3, phase: 'IAM', title: 'Created IAM user "admin" with AdministratorAccess',
      action: { type: 'goto', url: 'https://us-east-1.console.aws.amazon.com/iam/home#/users' },
      body: 'IAM → Users → Create user. Username: admin (or your preferred name). Console access enabled. Custom password set. Attached managed policy: AdministratorAccess.',
      checkpoint: 'User created, .csv credentials downloaded and saved.',
      durationMin: 6,
    },
    {
      n: 4, phase: 'IAM', title: 'Enabled MFA on your IAM admin user',
      action: { type: 'goto', url: 'https://us-east-1.console.aws.amazon.com/iamv2/home#/users/details/David?section=security_credentials' },
      body: 'Signed in as David → top-right username → Security credentials → MFA → Assign. Same authenticator app, new entry. Two consecutive codes.',
      checkpoint: 'David now requires MFA at every sign-in.',
      durationMin: 4,
    },
    {
      n: 5, phase: 'Region', title: 'Set default region to EU (Ireland) — eu-west-1',
      body: 'Top-right region picker → EU (Ireland) eu-west-1. AWS persists this choice per browser session.',
      tip: 'Pick a region close to your users / your country. eu-west-1 (Ireland) is a strong default for Europe + Africa.',
      checkpoint: 'Region indicator in the console reads "Ireland".',
      durationMin: 2,
    },
    {
      n: 6, phase: 'Integration', title: 'Linked account to AWS Career Launchpad Pro',
      action: { type: 'goto', url: '/aws-accounts' },
      body: 'In-app: AWS Account Manager → active profile → entered David\'s access key ID + secret access key → Save → Test connection.',
      checkpoint: 'STS GetCallerIdentity succeeded; profile shows Connected ✓ + account ID 123456789012.',
      durationMin: 4,
    },
    {
      n: 7, phase: 'Cost protection', title: 'Created $5 monthly budget',
      action: { type: 'goto', url: 'https://console.aws.amazon.com/billing/home#/budgets' },
      body: 'Billing → Budgets → Create budget → Use template → Monthly cost budget. Name: monthly-5-dollar-limit. Amount: $5 USD. Email: you@example.com. Alert at 80%.',
      checkpoint: 'Green confirmation: "monthly-5-dollar-limit has been created successfully".',
      durationMin: 6,
    },
    {
      n: 8, phase: 'Cost protection', title: 'Confirmed AWS auto-enabled Cost Anomaly Detection',
      action: { type: 'goto', url: 'https://console.aws.amazon.com/cost-management/home#/anomaly-detection' },
      body: 'Email from anomalydetection@costalerts.amazonaws.com confirmed AWS pre-configured Cost Anomaly Detection (free service, ML-based, alerts on > $100 AND > 40% expected spend).',
      tip: 'Complements the $5 budget — budget catches sustained overspend, anomaly detection catches sudden spikes.',
      checkpoint: 'Service active, daily summary subscribed.',
      durationMin: 2,
    },
  ],
  nextSteps: [
    'Start Project 1 — S3 static website + CloudFront (see walkthrough: project-s3-static-site).',
    'Consider creating a dedicated "app-deployer" IAM user with PowerUserAccess + a custom DENY policy for the most dangerous actions (separate from David). The Deploy Console walks you through that.',
    'Optional: enable CloudTrail for full API audit logging (free for the first trail).',
    'Optional: enable IAM Access Analyzer for least-privilege policy hints.',
  ],
};

/**
 * Render this session as a clean Markdown document.
 * Used by the export button + Document Center.
 */
export function sessionToMarkdown(s) {
  const lines = [];
  lines.push(`# ${s.title}`);
  lines.push('');
  lines.push(`**Date:** ${s.date}`);
  lines.push(`**Duration:** ${s.durationMin} minutes`);
  lines.push(`**Account:** ${s.account.id} (${s.account.alias}) — ${s.account.email}`);
  lines.push(`**Region:** ${s.account.region}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(s.summary);
  lines.push('');

  if (s.warnings?.length) {
    lines.push('## ⚠ Notes & warnings');
    lines.push('');
    for (const w of s.warnings) {
      lines.push(`> ${w}`);
      lines.push('');
    }
  }

  lines.push('## What now exists');
  lines.push('');
  for (const o of s.outcomes) {
    const icon = o.status === 'done' ? '✅' : o.status === 'pending' ? '🟡' : '❌';
    lines.push(`- ${icon} **${o.label}**${o.note ? ` — ${o.note}` : ''}`);
  }
  lines.push('');

  lines.push('## Step-by-step record');
  lines.push('');
  for (const step of s.steps) {
    lines.push(`### Step ${step.n} — ${step.title}`);
    lines.push('');
    lines.push(`> _Phase: ${step.phase} · ${step.durationMin || '?'} min_`);
    lines.push('');
    if (step.action?.url) {
      lines.push(`🔗 **Direct URL:** [${step.action.url}](${step.action.url})`);
      lines.push('');
    }
    lines.push(step.body);
    lines.push('');
    if (step.tip) {
      lines.push(`💡 **Tip:** ${step.tip}`);
      lines.push('');
    }
    if (step.warning) {
      lines.push(`⚠ **Warning:** ${step.warning}`);
      lines.push('');
    }
    if (step.checkpoint) {
      lines.push(`✓ **Checkpoint:** ${step.checkpoint}`);
      lines.push('');
    }
    if (step.code) {
      lines.push('```');
      lines.push(step.code);
      lines.push('```');
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  if (s.nextSteps?.length) {
    lines.push('## Next steps');
    lines.push('');
    for (const n of s.nextSteps) {
      lines.push(`- ${n}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`_Generated by AWS Career Launchpad Pro on ${new Date().toISOString()}._`);

  return lines.join('\n');
}

// The session log array; future sessions append here. The current schema lets
// us also record sessions live via SessionRecorder.
export const SESSIONS = [SESSION_TONIGHT];
