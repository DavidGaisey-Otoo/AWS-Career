/** Current, evidence-first AWS account setup controls. */
export const ACCOUNT_SETUP_CHECKLIST = [
  {
    id: 'free-plan-verified', label: 'Free Plan identity, credits, and expiry verified', category: 'Account', severity: 'high', icon: '🏛️',
    why: 'New AWS accounts use a credits-based Free Plan that ends after six months or when credits are exhausted, whichever happens first. The console is the authority for plan state.',
    howTo: ['Console Home → Cost and Usage widget', 'Confirm account name and 12-digit Account ID', 'Record credits remaining, days remaining, and expiry in Account Manager', 'Capture a redacted screenshot as evidence'],
    cliVerify: 'aws account get-account-plan-state',
    docsUrl: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html',
  },
  {
    id: 'root-mfa', label: 'Root MFA enabled with a recovery path', category: 'Security', severity: 'critical', icon: '🔐',
    why: 'Root can control the entire account. A phishing-resistant passkey plus a second independent MFA method reduces takeover and lockout risk.',
    howTo: ['Root account menu → Security credentials', 'Confirm at least one passkey or security key is assigned', 'Add an authenticator app or second passkey as backup', 'Test the backup in a private window before ending the current session'],
    cliVerify: 'aws iam get-account-summary --query "SummaryMap.AccountMFAEnabled"',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/enable-mfa-for-root.html',
  },
  {
    id: 'root-no-access-keys', label: 'No root access keys', category: 'Security', severity: 'critical', icon: '🗝️',
    why: 'Root access keys are long-lived credentials with unrestricted power. This learning account does not need them.',
    howTo: ['Root account menu → Security credentials', 'Open Access keys', 'Confirm the list is empty', 'Do not create a root access key for Career Launchpad'],
    cliVerify: '# Console-only root credential check; do not create a key to test it',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html',
  },
  {
    id: 'recovery-verified', label: 'Root recovery email and phone verified', category: 'Account', severity: 'high', icon: '📨',
    why: 'AWS uses the root email and phone when recovering access. Losing either can turn an MFA-device failure into an account lockout.',
    howTo: ['Account menu → Account', 'Confirm the root email is accessible', 'Confirm the phone number and contact address are current', 'Keep Google recovery and two-step verification enabled for the root mailbox'],
    cliVerify: '# Verify contact details in Account settings; never export them to CLI logs',
    docsUrl: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-update-contact.html',
  },
  {
    id: 'budgets-set', label: 'Zero-spend and $2 budget alerts created', category: 'Cost', severity: 'high', icon: '📊',
    why: 'Budgets provide early warnings, but they do not stop services or cap spending. Use both a near-zero alert and a project ceiling.',
    howTo: ['Billing and Cost Management → Budgets → Create budget', 'Create template: Zero spend budget', 'Create monthly cost budget: $2 USD', 'Send actual and forecast alerts to the lab email', 'Confirm the notification email'],
    cliVerify: 'aws budgets describe-budgets --account-id 525426877687 --query "Budgets[].BudgetName"',
    docsUrl: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html',
  },
  {
    id: 'credit-monitoring', label: 'Free Plan credit monitoring recorded', category: 'Cost', severity: 'high', icon: '🆓',
    why: 'The Free Plan ends when either its time or credits run out. Old 12-month Free Tier usage guidance does not describe this account.',
    howTo: ['Billing and Cost Management → Credits', 'Confirm current balance and credit expiry', 'Check Console Home → Cost and Usage before every lab', 'Update Career Launchpad after each project session'],
    cliVerify: 'aws account get-account-plan-state',
    docsUrl: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-FAQ.html',
  },
  {
    id: 'daily-access', label: 'Daily access uses MFA and no access keys', category: 'IAM', severity: 'high', icon: '👤',
    why: 'Human users should use temporary or federated credentials. If a standalone training account temporarily uses an IAM console user, require MFA and do not create programmatic access keys.',
    howTo: ['Prefer federation or an IAM role that issues temporary credentials', 'For a temporary standalone-lab fallback, create one console-only IAM user', 'Require MFA before daily use', 'Do not create access keys', 'Move toward least privilege after initial setup'],
    cliVerify: 'aws iam list-users --query "Users[].UserName"',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
  },
  {
    id: 'cloudtrail-history', label: 'CloudTrail 90-day Event history verified', category: 'Security', severity: 'medium', icon: '🪵',
    why: 'AWS provides 90 days of management-event history without creating a trail. A new trail can add S3, KMS, data-event, or Insights costs, so it requires a separate cost decision.',
    howTo: ['CloudTrail → Event history', 'Confirm recent ConsoleLogin and IAM events appear', 'Do not create CloudTrail Lake, Insights, or data-event trails for this short lab', 'Create an S3-backed trail only when retention beyond 90 days is approved'],
    cliVerify: 'aws cloudtrail lookup-events --max-results 5',
    docsUrl: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/how-cloudtrail-works.html',
  },
  {
    id: 'default-vpc-reviewed', label: 'Default VPC and security groups reviewed', category: 'Network', severity: 'medium', icon: '🌐',
    why: 'Default VPC subnets are public by design, but the default security group does not allow inbound internet traffic. Review it accurately and create project-specific security groups.',
    howTo: ['VPC → Your VPCs → identify Default = Yes', 'Security groups → default → confirm inbound is self-reference only', 'Do not add 0.0.0.0/0 RDP or SSH rules', 'Use a project VPC and Systems Manager for the Windows Server lab', 'Do not delete defaults until teardown dependencies are understood'],
    cliVerify: 'aws ec2 describe-vpcs --filters Name=is-default,Values=true --query "Vpcs[].VpcId"',
    docsUrl: 'https://docs.aws.amazon.com/vpc/latest/userguide/default-security-group.html',
  },
];

export const CATEGORY_TONES = { Account: 'orange', Security: 'danger', IAM: 'sky', Cost: 'success', Network: 'violet' };
export const SEVERITY_TONES = { critical: 'danger', high: 'warning', medium: 'sky' };
