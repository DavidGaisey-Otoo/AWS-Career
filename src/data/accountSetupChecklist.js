/**
 * accountSetupChecklist.js — AC-01 data only.
 *
 * 9 AWS account best-practice items, each with:
 *   - id, label, category, severity
 *   - why (2-3 sentences on security/cost impact)
 *   - howTo[] (numbered Console steps)
 *   - cliVerify (a copy-pasteable AWS CLI command that proves it's done)
 *   - docsUrl (link to the canonical AWS doc)
 */

export const ACCOUNT_SETUP_CHECKLIST = [
  // ────────── Root account ──────────
  {
    id: 'root-created',
    label: 'Root account created',
    category: 'Account',
    severity: 'high',
    icon: '🏛️',
    why: 'The root account is your AWS identity — without it, nothing exists. You only need it once, and AWS sends the verification email here. Never use it for daily work after the IAM admin user is set up.',
    howTo: [
      'Go to aws.amazon.com → Create an AWS Account',
      'Provide a root email address (use one with strong security)',
      'Provide payment method + phone verification',
      'Pick the Basic Support plan (free)',
    ],
    cliVerify: 'aws sts get-caller-identity   # shows the account number this confirms exists',
    docsUrl: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-creating.html',
  },

  // ────────── Root MFA ──────────
  {
    id: 'root-mfa',
    label: 'MFA enabled on root account',
    category: 'Security',
    severity: 'critical',
    icon: '🔐',
    why: 'Without MFA, a stolen root password = full account takeover with no recovery. AWS support cannot help you reclaim a hijacked account quickly. This is the single highest-leverage protection you can enable.',
    howTo: [
      'Sign in as root → top-right menu → Security credentials',
      'Multi-factor authentication (MFA) → Assign MFA device',
      'Pick Virtual MFA device → scan the QR code with Google Authenticator (or 1Password)',
      'Enter two consecutive codes to activate',
    ],
    cliVerify: 'aws iam get-account-summary --query "SummaryMap.AccountMFAEnabled"   # returns 1 when on',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
  },

  // ────────── IAM admin user ──────────
  {
    id: 'iam-admin-user',
    label: 'IAM Admin user created (use this daily, not root)',
    category: 'IAM',
    severity: 'high',
    icon: '👤',
    why: 'Root has unrevocable powers (delete the account, change root email). An IAM admin user can do everything else, with full audit trail, and you can rotate its access keys without locking yourself out. Treat root the way a bank treats the master vault key.',
    howTo: [
      'IAM Console → Users → Create user → username e.g. "admin_user"',
      'Provide console access → Custom password',
      'Attach policy directly: AdministratorAccess',
      'Save the sign-in URL (https://<account-id>.signin.aws.amazon.com/console)',
      'Sign out as root → sign back in as the IAM admin user from now on',
    ],
    cliVerify: 'aws iam list-users --query "Users[?contains(UserName,\\\`admin\\\`)].UserName"',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/getting-set-up.html',
  },

  // ────────── IAM user MFA ──────────
  {
    id: 'iam-user-mfa',
    label: 'MFA enabled on IAM Admin user',
    category: 'Security',
    severity: 'critical',
    icon: '🔐',
    why: 'Same logic as root MFA — if your IAM admin password leaks (phishing, breach), MFA stops the attacker cold. Without MFA on the admin, your "never use root daily" hygiene loses 90% of its value.',
    howTo: [
      'IAM Console → Users → click your admin user → Security credentials tab',
      'Multi-factor authentication → Assign MFA device',
      'Virtual MFA device → scan QR with Google Authenticator',
      'Enter two consecutive codes',
    ],
    cliVerify: 'aws iam list-mfa-devices --user-name admin_user   # should return at least one device',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable.html',
  },

  // ────────── Billing alerts ──────────
  {
    id: 'billing-alerts',
    label: 'Billing alerts configured',
    category: 'Cost',
    severity: 'high',
    icon: '💸',
    why: 'AWS surprise bills are real. A misconfigured Lambda or runaway EC2 can cost hundreds overnight. Billing alerts via CloudWatch + SNS email you the moment spend crosses thresholds — your only early warning.',
    howTo: [
      'Billing & Cost Management Console → Billing preferences',
      'Enable "Receive Free Tier Usage Alerts" + "Receive Billing Alerts" — both ON',
      'Switch to N. Virginia (us-east-1) region (billing metrics only live there)',
      'CloudWatch → Alarms → Create alarm → metric: Billing > EstimatedCharges > USD',
      'Threshold: $1 (yes really), action: SNS topic → your email → Confirm subscription',
      'Repeat for $5, $10, $25 thresholds',
    ],
    cliVerify: 'aws cloudwatch describe-alarms --region us-east-1 --query "MetricAlarms[?Namespace==\\\`AWS/Billing\\\`].AlarmName"',
    docsUrl: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html',
  },

  // ────────── Free Tier alerts ──────────
  {
    id: 'free-tier-alerts',
    label: 'Free Tier usage alerts set',
    category: 'Cost',
    severity: 'medium',
    icon: '🆓',
    why: 'The Free Tier ends in 12 months OR when you exceed limits (S3 5GB, EC2 750h, etc.). Without alerts, you find out by surprise on month 13. Free Tier usage alerts email you at 85% consumption so you can react.',
    howTo: [
      'Billing Console → Billing preferences',
      'Tick "Receive Free Tier Usage Alerts" + add an alert email address',
      'AWS auto-sends emails when any tracked Free Tier service hits 85%',
    ],
    cliVerify: '# No CLI for this — confirm in Billing → Billing preferences',
    docsUrl: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/tracking-free-tier-usage.html',
  },

  // ────────── Budgets ──────────
  {
    id: 'budgets-set',
    label: 'Budget created in AWS Budgets',
    category: 'Cost',
    severity: 'medium',
    icon: '📊',
    why: 'Billing alerts trigger after spend; AWS Budgets is forecast-based — it warns you the day a trend predicts you\'ll exceed budget by month-end. Faster react time = fewer surprise charges. Free tier includes 2 budgets.',
    howTo: [
      'Billing Console → Budgets → Create budget',
      'Type: Cost budget → Monthly period',
      'Amount: $5/mo (or your training cap)',
      'Alert: 80% actual + 100% forecasted → email yourself',
    ],
    cliVerify: 'aws budgets describe-budgets --account-id $(aws sts get-caller-identity --query Account --output text)',
    docsUrl: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html',
  },

  // ────────── CloudTrail ──────────
  {
    id: 'cloudtrail',
    label: 'CloudTrail enabled (audit log)',
    category: 'Security',
    severity: 'high',
    icon: '🪵',
    why: 'CloudTrail records every API call against your account — who did what, when, from where. Essential after a security incident (you cannot debug what you cannot see) and required for most compliance frameworks. First trail is FREE.',
    howTo: [
      'CloudTrail Console → Trails → Create trail',
      'Name: "default-trail"',
      'Storage: new S3 bucket (CloudTrail will create it)',
      'Apply trail to all regions: ON',
      'Log file SSE-KMS encryption: ON (optional but recommended)',
      'Click Create — events start landing in S3 within ~5 minutes',
    ],
    cliVerify: 'aws cloudtrail describe-trails --query "trailList[].Name"',
    docsUrl: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html',
  },

  // ────────── Default VPC reviewed ──────────
  {
    id: 'default-vpc-reviewed',
    label: 'Default VPC reviewed (or deleted)',
    category: 'Network',
    severity: 'medium',
    icon: '🌐',
    why: 'Every new AWS account ships with a default VPC in every region — wide-open security groups and a public subnet in every AZ. Fine for learning, dangerous for client work. Review it OR delete it OR replace its security group with a tightened one.',
    howTo: [
      'VPC Console → Your VPCs → look for one tagged "Default = Yes"',
      'Subnets tab → confirm only the AZs you actually use have subnets',
      'Security groups → check the "default" SG has been tightened (no 0.0.0.0/0 inbound except port 443 if intentional)',
      'Optional: delete the default VPC entirely if you only use a custom-built one',
    ],
    cliVerify: 'aws ec2 describe-vpcs --filters Name=is-default,Values=true --query "Vpcs[].VpcId"',
    docsUrl: 'https://docs.aws.amazon.com/vpc/latest/userguide/default-vpc.html',
  },
];

export const CATEGORY_TONES = {
  Account:  'orange',
  Security: 'danger',
  IAM:      'sky',
  Cost:     'success',
  Network:  'violet',
};

export const SEVERITY_TONES = {
  critical: 'danger',
  high:     'warning',
  medium:   'sky',
};
