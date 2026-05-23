/**
 * walkthroughs.js — atomic step-by-step guides for every common AWS procedure.
 *
 * Structure:
 *   - Each WALKTHROUGH has an id, title, intro, steps[], and outcome.
 *   - Each STEP is ONE clear action — one click, one form, one decision.
 *   - Every step has: number, title, action[], screenshot hints, url (direct
 *     deep link into the new AWS console), checkpoint to verify success.
 *
 * Design rules:
 *   • One verb per step ("Click", "Type", "Toggle", "Wait").
 *   • Plain language — no jargon without a glossary entry.
 *   • Direct URLs into the new console UI (the May 2025+ redesign).
 *   • Visual cues: arrows, spacing, callouts — rendered by WalkthroughViewer.
 *   • Branch points handled explicitly — never "if you see X, also do Y" mid-sentence.
 *
 * Add a walkthrough:
 *   1. Add to WALKTHROUGHS keyed by a kebab-case id.
 *   2. The viewer auto-renders it; nothing else to wire up.
 */

const NEW_ACCOUNT_URL = 'https://portal.aws.amazon.com/billing/signup';
const ROOT_LOGIN_URL = 'https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com&account_type=root';
const IAM_USER_LOGIN_URL = 'https://signin.aws.amazon.com/signin?redirect_uri=https%3A%2F%2Fconsole.aws.amazon.com';
const IAM_DASHBOARD_URL = 'https://us-east-1.console.aws.amazon.com/iam/home#/home';
const IAM_USERS_URL = 'https://us-east-1.console.aws.amazon.com/iam/home#/users';
const BUDGETS_URL = 'https://console.aws.amazon.com/billing/home#/budgets';
const S3_URL = (r = 'eu-west-1') => `https://${r}.console.aws.amazon.com/s3/home?region=${r}`;
const CLOUDFRONT_URL = 'https://console.aws.amazon.com/cloudfront/v4/home';
const ROUTE53_URL = 'https://console.aws.amazon.com/route53/v2/hostedzones';
const COST_EXPLORER_URL = 'https://console.aws.amazon.com/cost-management/home#/cost-explorer';
const ACCOUNT_SETTINGS_URL = 'https://console.aws.amazon.com/billing/home#/account';

export const WALKTHROUGHS = {
  // ═══════════════════════════════════════════════════════════════════
  // ACCOUNT SETUP
  // ═══════════════════════════════════════════════════════════════════

  'aws-account-create': {
    id: 'aws-account-create',
    category: 'Account setup',
    title: 'Create a brand new AWS account',
    estimateMin: 15,
    difficulty: 'beginner',
    intro: 'You\'ll create the root account, attach a payment method, and verify your email + phone. Have a card and your phone ready.',
    prerequisites: [
      'A valid email address you control',
      'A phone you can answer or text',
      'A credit/debit card (AWS does a $1 USD authorisation hold)',
    ],
    steps: [
      {
        n: 1, title: 'Open the AWS sign-up page',
        action: { type: 'goto', url: NEW_ACCOUNT_URL },
        body: 'Click the button below to open the AWS sign-up page in a new tab.',
        screenshot: 'Look for: "Sign up for AWS" header with an email input.',
        checkpoint: 'You see the email + account-name form.',
      },
      {
        n: 2, title: 'Enter your root email',
        body: 'Type the email address that will OWN this account. This becomes your "root user". You cannot change it later without contacting AWS.',
        tip: 'Use a personal email you check often (Gmail works). Never use a shared inbox.',
        checkpoint: 'Email field is filled.',
      },
      {
        n: 3, title: 'Enter an AWS account name',
        body: 'A friendly label for the account itself (separate from the email). Examples: "my-personal-aws", "lab", "<your-name>-cloud".',
        tip: 'You can change this later under Account Settings.',
        checkpoint: 'Account name field is filled.',
      },
      {
        n: 4, title: 'Verify your email',
        body: 'AWS sends a 6-digit code to your email. Open your inbox, copy the code, paste it into the form.',
        tip: 'Code expires in 10 minutes — check spam if it doesn\'t arrive within 60 seconds.',
        checkpoint: 'You\'re on the password-creation page.',
      },
      {
        n: 5, title: 'Set the root password',
        body: 'Use 12+ characters, a mix of upper/lower/digits/symbols. Save it in a password manager IMMEDIATELY — losing root means losing the account.',
        warning: 'AWS will not help you recover a lost root password without phone + email + payment verification.',
        checkpoint: 'Password set, you\'re on Contact Info.',
      },
      {
        n: 6, title: 'Choose "Personal" account type',
        body: 'Pick "Personal" unless you\'re registering on behalf of a company. You can always upgrade to Business later.',
        checkpoint: 'Personal selected.',
      },
      {
        n: 7, title: 'Fill in your full name, country, address, phone',
        body: 'Use your real legal name and address. AWS uses this for billing + KYC.',
        tip: 'Phone format: +233244112233 (country code first, no spaces).',
        warning: 'Wrong address can cause a "payment method failed" loop later.',
        checkpoint: 'All contact fields valid.',
      },
      {
        n: 8, title: 'Accept the Customer Agreement',
        body: 'Tick the box at the bottom. Read it first if you want to (it\'s long — gist: standard cloud-provider terms).',
        checkpoint: 'Box ticked, "Continue" is enabled.',
      },
      {
        n: 9, title: 'Add a payment method',
        body: 'Enter a real credit or debit card. AWS will do a $1 authorisation hold (refunded within 3-5 days).',
        warning: 'Most virtual cards (Wise, Revolut, Ghanaian CBG) get rejected. Use a physical card if possible.',
        tip: 'If your card is rejected: wait 24h before retrying (AWS has a rate limit).',
        checkpoint: 'Payment method accepted — no red error.',
      },
      {
        n: 10, title: 'Verify your phone',
        body: 'Pick SMS or voice. Type the country code + number. AWS calls/texts a 4-digit PIN immediately.',
        checkpoint: 'PIN accepted.',
      },
      {
        n: 11, title: 'Pick a support plan',
        body: 'Choose "Basic support — Free" unless you have a paying client today. You can upgrade anytime.',
        checkpoint: 'Free plan selected, you see "Welcome to AWS".',
      },
      {
        n: 12, title: 'Sign in to your new account',
        action: { type: 'goto', url: ROOT_LOGIN_URL },
        body: 'After the welcome screen, sign in with your root email and the password from Step 5.',
        checkpoint: 'You land on the AWS Console home page.',
      },
    ],
    outcome: 'You have a working AWS account. Next: enable MFA on root (next walkthrough).',
    nextId: 'mfa-root',
  },

  // ═══════════════════════════════════════════════════════════════════
  // MFA ON ROOT
  // ═══════════════════════════════════════════════════════════════════

  'mfa-root': {
    id: 'mfa-root',
    category: 'Account setup',
    title: 'Turn on MFA for the root user',
    estimateMin: 5,
    difficulty: 'beginner',
    intro: 'Multi-factor authentication on your root account is the single most important AWS security step. We\'ll use a free authenticator app (Google Authenticator, Authy, 1Password).',
    prerequisites: [
      'Signed in to AWS Console as root',
      'An authenticator app installed on your phone',
    ],
    steps: [
      {
        n: 1, title: 'Open the IAM dashboard',
        action: { type: 'goto', url: IAM_DASHBOARD_URL },
        body: 'The Identity & Access Management (IAM) dashboard is where MFA lives.',
        checkpoint: 'You see the IAM home page with a "Security recommendations" box.',
      },
      {
        n: 2, title: 'Click "Add MFA" under Security recommendations',
        body: 'AWS shows a yellow warning at the top: "Add MFA for root user". Click the button next to it.',
        screenshot: 'Top of IAM dashboard, yellow callout box with "Add MFA" button on the right.',
        checkpoint: 'You\'re on the Security credentials page.',
      },
      {
        n: 3, title: 'Click "Assign MFA device"',
        body: 'Scroll to "Multi-factor authentication (MFA)" section. Click the orange "Assign MFA device" button.',
        checkpoint: 'A wizard opens asking for a device name.',
      },
      {
        n: 4, title: 'Name your device + choose Authenticator app',
        body: 'Device name: "phone-<your-name>" (anything memorable). Type: select "Authenticator app". Click Next.',
        checkpoint: 'You see a QR code on screen.',
      },
      {
        n: 5, title: 'Scan the QR code with your authenticator app',
        body: 'Open Google Authenticator / Authy / 1Password on your phone. Tap "+" → "Scan QR". Point camera at the screen.',
        tip: 'If you can\'t scan, click "Show secret key" and type it manually.',
        checkpoint: 'A 6-digit code appears in your authenticator app, refreshing every 30 sec.',
      },
      {
        n: 6, title: 'Enter TWO consecutive codes',
        body: 'Type the current code, wait until it refreshes, type the next code. Both go in the same form. Click "Add MFA".',
        warning: 'Don\'t enter the same code twice — wait for the 30-second refresh.',
        checkpoint: 'Green "MFA device added" banner appears.',
      },
      {
        n: 7, title: 'Sign out and back in to test',
        body: 'In the top-right corner: click your account name → Sign out. Then sign back in. AWS now asks for the MFA code after your password.',
        checkpoint: 'You successfully signed back in with MFA — root is protected.',
      },
    ],
    outcome: 'Root account is MFA-protected. An attacker with your password still cannot get in without your phone.',
    nextId: 'iam-user-create',
  },

  // ═══════════════════════════════════════════════════════════════════
  // CREATE IAM USER (FOR DAILY USE)
  // ═══════════════════════════════════════════════════════════════════

  'iam-user-create': {
    id: 'iam-user-create',
    category: 'Account setup',
    title: 'Create an IAM user for daily work',
    estimateMin: 8,
    difficulty: 'beginner',
    intro: 'You should NEVER use the root user for day-to-day work. Create an IAM user with admin permissions, MFA, and a sign-in URL — and use it for everything from now on.',
    prerequisites: ['Signed in as root', 'MFA enabled on root'],
    steps: [
      {
        n: 1, title: 'Open IAM → Users',
        action: { type: 'goto', url: IAM_USERS_URL },
        body: 'Direct link to the IAM Users page.',
        checkpoint: 'Users table visible (likely empty).',
      },
      {
        n: 2, title: 'Click "Create user"',
        body: 'Orange button, top-right.',
        checkpoint: 'Step 1 of the wizard opens.',
      },
      {
        n: 3, title: 'Enter a username',
        body: 'Use your real first name in lowercase: "david", "kofi", "ama". Avoid generic names like "admin" — they\'re predictable.',
        checkpoint: 'Username typed.',
      },
      {
        n: 4, title: 'Tick "Provide user access to the AWS Management Console"',
        body: 'This gives the user a web sign-in. We\'ll create access keys later in a separate step.',
        checkpoint: 'Console-access checkbox is on.',
      },
      {
        n: 5, title: 'Pick "I want to create an IAM user"',
        body: 'Two options appear. Pick the second one ("I want to create an IAM user"). The first (Identity Center) is for orgs with multiple AWS accounts.',
        checkpoint: 'IAM-user option selected.',
      },
      {
        n: 6, title: 'Set a console password',
        body: 'Pick "Custom password" + type a strong one. Untick "User must create a new password at next sign-in" (you ARE the user). Click Next.',
        checkpoint: 'Password chosen, Next clicked.',
      },
      {
        n: 7, title: 'On the Permissions page: "Attach policies directly"',
        body: 'Choose "Attach policies directly". Search for "AdministratorAccess". Tick the checkbox next to it. Click Next.',
        warning: 'AdministratorAccess gives full power. Fine for a personal lab — for production, build a custom least-privilege policy instead.',
        checkpoint: 'AdministratorAccess attached, on Review page.',
      },
      {
        n: 8, title: 'Review and click "Create user"',
        body: 'Verify the username and policies are correct. Click Create.',
        checkpoint: 'Success page with download buttons for the .csv.',
      },
      {
        n: 9, title: 'Download the credentials .csv',
        body: 'Click "Download .csv file" — contains the sign-in URL, username, and password. Save it in your password manager.',
        warning: 'This is your ONLY chance to download these credentials. AWS doesn\'t show them again.',
        checkpoint: 'CSV downloaded and saved.',
      },
      {
        n: 10, title: 'Bookmark your sign-in URL',
        body: 'The CSV shows a URL like https://<account-id>.signin.aws.amazon.com/console. Bookmark it — this is how you\'ll sign in as your IAM user from now on.',
        tip: 'Better: create an alias under IAM → Dashboard → Account ID → Create alias. Then your URL becomes https://<alias>.signin.aws.amazon.com/console.',
        checkpoint: 'URL bookmarked.',
      },
      {
        n: 11, title: 'Sign out as root, sign in as the new user',
        action: { type: 'goto', url: IAM_USER_LOGIN_URL },
        body: 'Sign out (top-right). Open your new sign-in URL. Enter account ID/alias, username, password. You\'re now using the IAM user.',
        checkpoint: 'You see the AWS Console as your IAM user, not root.',
      },
    ],
    outcome: 'You have a daily-use IAM user with full admin rights. Use this for everything. Reserve root for the 6 once-a-lifetime tasks (close account, change email, etc.).',
    nextId: 'mfa-iam-user',
  },

  // ═══════════════════════════════════════════════════════════════════
  // MFA ON IAM USER
  // ═══════════════════════════════════════════════════════════════════

  'mfa-iam-user': {
    id: 'mfa-iam-user',
    category: 'Account setup',
    title: 'Turn on MFA for your IAM user',
    estimateMin: 4,
    difficulty: 'beginner',
    intro: 'Now that you\'re signed in as the IAM user, add MFA to it too. Use a different name in your authenticator app so you don\'t confuse it with root\'s.',
    prerequisites: ['Signed in as your IAM user', 'Authenticator app from before'],
    steps: [
      {
        n: 1, title: 'Click your username → Security credentials',
        body: 'Top-right corner of the console: click your username, then "Security credentials".',
        checkpoint: 'You\'re on the user\'s security page.',
      },
      {
        n: 2, title: 'Scroll to MFA → Assign MFA device',
        body: 'Same flow as root MFA. Pick a name like "phone-<name>-iam" and Authenticator app.',
        checkpoint: 'QR code visible.',
      },
      {
        n: 3, title: 'Add the new entry in your authenticator app',
        body: 'Same app, new entry — tap "+" → "Scan QR". Now you have two entries: one for root, one for this IAM user.',
        checkpoint: 'New 6-digit code is generating.',
      },
      {
        n: 4, title: 'Enter two consecutive codes',
        body: 'Same as before — wait for the refresh between the two codes.',
        checkpoint: 'MFA enabled banner.',
      },
      {
        n: 5, title: 'Sign out + back in to test',
        body: 'Confirm MFA now prompts after password.',
        checkpoint: 'Signed in with MFA.',
      },
    ],
    outcome: 'Both root AND your IAM user are MFA-protected. This is the recommended baseline.',
    nextId: 'budget-create',
  },

  // ═══════════════════════════════════════════════════════════════════
  // BUDGET ALERT
  // ═══════════════════════════════════════════════════════════════════

  'budget-create': {
    id: 'budget-create',
    category: 'Cost protection',
    title: 'Create a $5 monthly budget with email alert',
    estimateMin: 5,
    difficulty: 'beginner',
    intro: 'Cost protection: you get an email if your AWS bill exceeds $5 in any month. Free service, takes 5 minutes.',
    prerequisites: ['Signed in as root OR IAM user with billing access'],
    steps: [
      {
        n: 1, title: 'Open Billing → Budgets',
        action: { type: 'goto', url: BUDGETS_URL },
        body: 'Direct link to the Budgets dashboard.',
        screenshot: 'If you see "Access Denied", you\'re signed in as an IAM user without billing access. Sign in as root, then enable IAM billing access under Account Settings.',
        checkpoint: 'Budgets dashboard visible.',
      },
      {
        n: 2, title: 'Click "Create a budget"',
        body: 'Orange button, top-right.',
        checkpoint: 'Budget wizard opens.',
      },
      {
        n: 3, title: 'Choose "Use a template (simplified)"',
        body: 'Easiest option. Skip the custom builder.',
        checkpoint: 'Template options visible.',
      },
      {
        n: 4, title: 'Pick "Monthly cost budget"',
        body: 'Click the first card.',
        checkpoint: 'Card selected.',
      },
      {
        n: 5, title: 'Enter budget details',
        body: 'Name: "monthly-5-dollar-limit". Amount: 5 USD. Email: your email.',
        checkpoint: 'All three fields filled.',
      },
      {
        n: 6, title: 'Click "Create budget"',
        body: 'Orange button at the bottom.',
        checkpoint: 'Green success banner: "Budget created".',
      },
    ],
    outcome: 'You\'ll receive an email if your AWS bill reaches $5 in any month. You can create more budgets (e.g. $1 forecast, $10 hard limit) the same way.',
    nextId: 'iam-billing-access',
  },

  // ═══════════════════════════════════════════════════════════════════
  // ENABLE IAM BILLING ACCESS
  // ═══════════════════════════════════════════════════════════════════

  'iam-billing-access': {
    id: 'iam-billing-access',
    category: 'Account setup',
    title: 'Let IAM users access billing',
    estimateMin: 2,
    difficulty: 'beginner',
    intro: 'By default, ONLY root can see the billing dashboard. This walkthrough lets your IAM users see it too (you still need to attach the Billing policy to them separately).',
    prerequisites: ['Signed in as ROOT (this setting can only be changed by root)'],
    steps: [
      {
        n: 1, title: 'Open Account Settings',
        action: { type: 'goto', url: ACCOUNT_SETTINGS_URL },
        body: 'Direct link.',
        checkpoint: 'You see Account-level settings.',
      },
      {
        n: 2, title: 'Find "IAM user and role access to Billing information"',
        body: 'Scroll down. Click "Edit".',
        checkpoint: 'Edit panel open.',
      },
      {
        n: 3, title: 'Tick "Activate IAM Access"',
        body: 'Check the box. Click "Update".',
        warning: 'This ENABLES access — it doesn\'t grant it. IAM users still need a Billing policy attached.',
        checkpoint: 'Green confirmation.',
      },
      {
        n: 4, title: 'Attach Billing policy to your IAM user',
        body: 'Go to IAM → Users → your user → Add permissions → Attach policies. Search for "Billing" → tick it → Add.',
        checkpoint: 'Billing policy attached.',
      },
    ],
    outcome: 'Your IAM user can now see invoices, set budgets, and manage payment methods.',
  },

  // ═══════════════════════════════════════════════════════════════════
  // PROJECT 1 — S3 STATIC WEBSITE
  // ═══════════════════════════════════════════════════════════════════

  'project-s3-static-site': {
    id: 'project-s3-static-site',
    category: 'Projects',
    title: 'Project: S3 static website + CloudFront',
    estimateMin: 45,
    difficulty: 'beginner',
    intro: 'Build a real portfolio piece: a public HTML site hosted on S3, fronted by CloudFront for HTTPS and global caching. Fully Free Tier.',
    prerequisites: ['Account set up', 'eu-west-1 (or any region) chosen'],
    steps: [
      {
        n: 1, title: 'Pick a unique bucket name',
        body: 'S3 bucket names are GLOBAL — must be unique across all of AWS. Try "<your-name>-portfolio-2026" or similar. Lowercase, no underscores.',
        tip: 'Use the same name as your future custom domain if you have one.',
        checkpoint: 'Bucket name chosen.',
      },
      {
        n: 2, title: 'Open S3 in your region',
        action: { type: 'goto', url: S3_URL('eu-west-1') },
        body: 'Direct link to S3 in EU (Ireland). Replace eu-west-1 in the URL if you use a different region.',
        checkpoint: 'S3 dashboard visible.',
      },
      {
        n: 3, title: 'Click "Create bucket"',
        body: 'Orange button.',
        checkpoint: 'Create wizard open.',
      },
      {
        n: 4, title: 'Fill in name + region',
        body: 'Bucket name from Step 1. Region: eu-west-1 (or whichever you picked).',
        checkpoint: 'Name + region set.',
      },
      {
        n: 5, title: 'Uncheck "Block all public access"',
        body: 'For a public website, we need public read. Untick the master checkbox. AWS then asks you to confirm — tick the warning box.',
        warning: 'Only do this for buckets meant to be public. Never for buckets with private data.',
        checkpoint: 'Block-public-access is OFF.',
      },
      {
        n: 6, title: 'Click "Create bucket" at the bottom',
        body: 'Leave everything else default.',
        checkpoint: 'Bucket created — back at the bucket list.',
      },
      {
        n: 7, title: 'Open the bucket → Properties → Static website hosting → Edit',
        body: 'Click your new bucket. Go to Properties tab. Scroll to "Static website hosting". Click Edit.',
        checkpoint: 'Edit page open.',
      },
      {
        n: 8, title: 'Enable hosting, set index/error docs',
        body: 'Toggle Enable. Hosting type: "Host a static website". Index: index.html. Error: error.html. Save.',
        checkpoint: 'Status: Enabled. URL visible — copy it.',
      },
      {
        n: 9, title: 'Add a bucket policy for public read',
        body: 'Go to Permissions → Bucket policy → Edit. Paste this (replace BUCKET-NAME):',
        code: `{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::BUCKET-NAME/*"
  }]
}`,
        checkpoint: 'Policy saved without errors.',
      },
      {
        n: 10, title: 'Upload index.html and error.html',
        body: 'Go to Objects tab → Upload. Drag in your two HTML files. Click Upload at the bottom.',
        tip: 'No HTML yet? Use this minimal index.html: <h1>Hello from S3</h1>',
        checkpoint: 'Files uploaded, listed in the bucket.',
      },
      {
        n: 11, title: 'Visit the website URL',
        body: 'Open the URL from Step 8 in a new tab. You should see your page.',
        checkpoint: 'Page renders. If 403, recheck the bucket policy.',
      },
      {
        n: 12, title: 'Optional — add CloudFront in front',
        action: { type: 'goto', url: CLOUDFRONT_URL },
        body: 'Click "Create distribution". Origin: select your bucket. Default cache: "Redirect HTTP to HTTPS". Price class: PriceClass_100 (cheapest). Default root: index.html. Create.',
        checkpoint: 'Distribution status changes to "Deployed" after 5-15 min.',
      },
    ],
    outcome: 'You have a working public website on AWS. Add it to your portfolio page in this app, push the code to GitHub from the GitHub Push panel, and write a LinkedIn post about it via the Content Queue.',
    nextId: null,
  },
};

/**
 * List all walkthroughs grouped by category.
 */
export function walkthroughsByCategory() {
  const groups = {};
  for (const w of Object.values(WALKTHROUGHS)) {
    const k = w.category || 'Other';
    if (!groups[k]) groups[k] = [];
    groups[k].push(w);
  }
  return groups;
}

export function resolveWalkthrough(id) {
  return WALKTHROUGHS[id] || null;
}
