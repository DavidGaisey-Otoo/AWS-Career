/**
 * iamBestPractices.js — AC-01 IAM teaching notes for the bottom of the
 * Setup Documentation tab.
 *
 * Each principle has:
 *   - id, title, oneLiner
 *   - body[]    — 3-5 short paragraphs in plain English
 *   - examples[] — concrete do/don't pairs where useful
 */

export const IAM_BEST_PRACTICES = [
  // ────────── 1. Never use root daily ──────────
  {
    id: 'no-root-daily',
    title: 'Never use the root account for daily tasks',
    icon: '🚫',
    oneLiner: 'Root is for account setup + emergency only. Day-to-day work happens as an IAM user.',
    body: [
      'Root can do irreversible things no IAM user can — close the account, change the root email, delete the Organization. If root credentials leak, the attacker can do all of those before you notice.',
      'An IAM admin user with AdministratorAccess can do everything else (create services, write IAM policies, manage billing if you grant it) — and you can rotate its keys or disable it instantly if compromised.',
      'After your initial setup is complete (verify your IAM admin can sign in), sign out of root and store the root credentials in a password manager. Pull them out only for: closing the account, changing root email, recovering a fully-locked IAM admin, or addressing AWS account-level support issues.',
    ],
    examples: [
      { do: 'Sign in to https://<account-id>.signin.aws.amazon.com/console as your IAM admin user', dont: 'Sign in to console.aws.amazon.com with the root email' },
      { do: 'Use IAM users (or IAM Identity Center / SSO) for every developer on your team', dont: 'Share the root password' },
    ],
  },

  // ────────── 2. Principle of least privilege ──────────
  {
    id: 'least-privilege',
    title: 'Principle of least privilege',
    icon: '🎯',
    oneLiner: 'Grant the minimum permissions needed to do the job — nothing more.',
    body: [
      'AdministratorAccess on every user is convenient but dangerous. If that user\'s credentials leak, the attacker owns everything. Instead, grant the narrowest policy that lets the user (or service, via IAM role) do their actual job.',
      'Start strict and add permissions as needed. AWS even tells you what was needed: IAM Access Analyzer scans CloudTrail and generates a tightened policy showing only the actions actually used.',
      'For services calling other AWS services, use IAM roles (not access keys). A Lambda function gets a role; an EC2 instance gets an instance profile. Roles auto-rotate credentials in the background — there is no long-lived key to leak.',
      'Wildcards (`*`) in IAM policies are dangerous. `"Resource": "*"` means every resource in the account. `"Action": "s3:*"` means every S3 operation. Always ask: is this wildcard really necessary, or am I being lazy?',
    ],
    examples: [
      { do: 'Policy that grants s3:GetObject + s3:PutObject on arn:aws:s3:::my-bucket/*', dont: '"Action": "s3:*", "Resource": "*" for a Lambda that only reads one bucket' },
      { do: 'EC2 instance profile with a tight role', dont: 'Hard-coded access key in user-data scripts' },
    ],
  },

  // ────────── 3. Reading IAM policies ──────────
  {
    id: 'read-iam-policies',
    title: 'How to read IAM policies',
    icon: '📖',
    oneLiner: 'Every IAM policy is JSON with five key fields: Version, Statement, Effect, Action, Resource.',
    body: [
      'IAM policies are JSON documents. The outer shape is always the same: `{"Version": "2012-10-17", "Statement": [...]}`. Each Statement is one rule.',
      'A Statement has at minimum: Effect (Allow or Deny), Action (what API calls), Resource (which AWS resources). Optionally: Principal (who — used in resource-based policies like S3 bucket policies), Condition (when — IP address, time of day, MFA presence).',
      'Explicit Deny always wins. If any policy attached to a user denies an action, no other policy can re-grant it. This is the safest way to lock things down — "Deny s3:DeleteBucket on the production bucket" overrides AdministratorAccess.',
      'Use IAM Policy Simulator in the console (or `aws iam simulate-principal-policy`) to test what a user can/cannot do BEFORE you attach the policy. Cheaper than debugging in production.',
    ],
    examples: [
      {
        do: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}`,
        dont: '"Action": "*" with "Resource": "*" (= full admin in disguise)',
      },
    ],
  },

  // ────────── 4. What MFA protects against ──────────
  {
    id: 'mfa-protects',
    title: 'What MFA protects against',
    icon: '🔐',
    oneLiner: 'MFA stops attackers who have your password but not your phone — which is most attackers.',
    body: [
      'Passwords leak constantly — phishing emails, breach dumps, weak password reuse across sites. Once an attacker has your AWS password, they have your account. Unless MFA is on.',
      'With MFA (Google Authenticator, Authy, hardware key) the attacker also needs the rotating 6-digit code from your physical device. They can\'t get that remotely. Even credential-stuffing tools that test millions of leaked passwords fail at this gate.',
      'Use a virtual MFA app (Google Authenticator, 1Password, Authy) for personal accounts. Use a hardware security key (YubiKey, Titan) for production root and admin accounts — phishing-resistant and works offline.',
      'Enable MFA on ALL of: root account, every IAM user with console access, and consider MFA-required conditions on dangerous actions (delete an S3 bucket, change an IAM policy) via Condition: aws:MultiFactorAuthPresent.',
    ],
    examples: [
      { do: 'Virtual MFA (Google Authenticator) on root + every IAM user', dont: 'SMS-only MFA on root (SIM-swap attacks are real)' },
      { do: 'Hardware YubiKey on production root account', dont: 'Email-based "code link" 2FA (vulnerable to email account takeover)' },
    ],
  },
];
