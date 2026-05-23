/**
 * awsActions.js — The canonical registry of every AWS action the app
 * knows how to execute on the user's behalf, classified by risk tier.
 *
 * Tier model:
 *   🟢 READ      — no side effects, no charges, no password required
 *   🟡 BUILD     — creates a resource. Password required. Dry-run preview shown.
 *   🟠 DESTROY   — deletes / terminates a resource. Password + type-resource-name to confirm.
 *   🔴 ADMIN     — IAM / billing / account-wide settings. Password + "I UNDERSTAND" + 10s cooldown.
 *   ⛔ BLOCKED   — never executed by the app. Manual console only. Hardcoded fuse.
 *
 * The killer rule: ⛔ actions cannot be unlocked by ANY combination of
 * passwords or settings. They exist to guarantee that even a fully
 * compromised app cannot lock the user out of their own AWS account
 * or hide an attack from the user.
 *
 * Adding a new action:
 *   1. Add the entry below.
 *   2. Implement the executor in src/lib/awsDeploy.js (export same id).
 *   3. The DeployContext + ApprovalDialog wire up automatically.
 */

export const TIERS = {
  READ:    { id: 'read',    icon: '🟢', label: 'Read',    color: 'emerald', requiresPassword: false, requiresExtraConfirm: false, cooldownMs: 0 },
  BUILD:   { id: 'build',   icon: '🟡', label: 'Build',   color: 'amber',   requiresPassword: true,  requiresExtraConfirm: false, cooldownMs: 0 },
  DESTROY: { id: 'destroy', icon: '🟠', label: 'Destroy', color: 'orange',  requiresPassword: true,  requiresExtraConfirm: 'resource-name', cooldownMs: 3_000 },
  ADMIN:   { id: 'admin',   icon: '🔴', label: 'Admin',   color: 'rose',    requiresPassword: true,  requiresExtraConfirm: 'I UNDERSTAND', cooldownMs: 10_000 },
  BLOCKED: { id: 'blocked', icon: '⛔', label: 'Blocked', color: 'slate',   requiresPassword: false, requiresExtraConfirm: false, cooldownMs: 0, blocked: true },
};

/**
 * The action catalogue. `id` is what callers use to invoke an action.
 *
 * `service`    — the AWS service this targets (for grouping in UI)
 * `tier`       — one of TIERS keys
 * `summary`    — one-sentence plain-English description
 * `params`     — array of input fields the approval dialog renders
 * `cost`       — { typical, max, free } estimated USD/month
 * `reversible` — true if the action can be undone
 * `consoleUrl` — function(params) → direct AWS console URL for manual fallback
 * `docsUrl`    — official AWS docs link
 */
export const ACTIONS = {
  // ─────────── S3 ───────────
  's3.create-bucket': {
    service: 'S3', tier: 'BUILD',
    summary: 'Create a new S3 bucket in the chosen region.',
    params: [
      { id: 'bucketName', label: 'Bucket name', type: 'text', placeholder: 'my-portfolio-2026', required: true, validate: (v) => /^[a-z0-9.-]{3,63}$/.test(v) || 'Lowercase, digits, dots, hyphens. 3–63 chars.' },
      { id: 'region',     label: 'Region',      type: 'region', required: true, default: 'eu-west-1' },
      { id: 'blockPublic',label: 'Block all public access', type: 'boolean', default: true, hint: 'Recommended ON unless this is a public static site.' },
    ],
    cost: { typical: 0, max: 0.023, free: 5 /* GB free */ },
    reversible: true,
    consoleUrl: ({ region }) => `https://${region || 'eu-west-1'}.console.aws.amazon.com/s3/home?region=${region || 'eu-west-1'}`,
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html',
  },
  's3.upload-files': {
    service: 'S3', tier: 'BUILD',
    summary: 'Upload one or more files to an existing S3 bucket.',
    params: [
      { id: 'bucketName', label: 'Bucket name',         type: 'text',  required: true },
      { id: 'files',      label: 'Files',               type: 'files', required: true },
      { id: 'prefix',     label: 'Key prefix (folder)', type: 'text',  default: '' },
    ],
    cost: { typical: 0, max: 0.005, free: 'first 5 GB free' },
    reversible: true,
    consoleUrl: ({ bucketName }) => `https://s3.console.aws.amazon.com/s3/buckets/${bucketName || ''}`,
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/upload-objects.html',
  },
  's3.enable-static-website': {
    service: 'S3', tier: 'BUILD',
    summary: 'Enable static website hosting on a bucket (index + error docs).',
    params: [
      { id: 'bucketName', label: 'Bucket name',  type: 'text', required: true },
      { id: 'indexDoc',   label: 'Index document', type: 'text', default: 'index.html' },
      { id: 'errorDoc',   label: 'Error document', type: 'text', default: 'error.html' },
    ],
    cost: { typical: 0, max: 0, free: 'always free' },
    reversible: true,
    consoleUrl: ({ bucketName }) => `https://s3.console.aws.amazon.com/s3/buckets/${bucketName || ''}?tab=properties`,
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/EnableWebsiteHosting.html',
  },
  's3.set-public-read-policy': {
    service: 'S3', tier: 'ADMIN',
    summary: 'Set a bucket policy allowing PUBLIC read access (for static sites).',
    params: [
      { id: 'bucketName', label: 'Bucket name', type: 'text', required: true },
    ],
    cost: { typical: 0, max: 0, free: 'always free' },
    reversible: true,
    warning: 'Anyone on the internet will be able to read every file in this bucket. Only use for intentionally public content (websites, public assets).',
    consoleUrl: ({ bucketName }) => `https://s3.console.aws.amazon.com/s3/buckets/${bucketName || ''}?tab=permissions`,
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteAccessPermissionsReqd.html',
  },
  's3.delete-bucket': {
    service: 'S3', tier: 'DESTROY',
    summary: 'Permanently delete a bucket and ALL its contents.',
    params: [
      { id: 'bucketName',     label: 'Bucket name',                            type: 'text', required: true },
      { id: 'emptyFirst',     label: 'Empty the bucket first (required)',      type: 'boolean', default: true, locked: true },
    ],
    cost: { typical: 0, max: 0, free: true },
    reversible: false,
    consoleUrl: ({ bucketName }) => `https://s3.console.aws.amazon.com/s3/buckets/${bucketName || ''}`,
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-bucket.html',
  },

  // ─────────── CloudFront ───────────
  'cloudfront.create-distribution': {
    service: 'CloudFront', tier: 'BUILD',
    summary: 'Create a CloudFront distribution in front of an S3 bucket (faster + HTTPS).',
    params: [
      { id: 'bucketName',   label: 'Origin S3 bucket', type: 'text', required: true },
      { id: 'priceClass',   label: 'Price class', type: 'select', options: ['PriceClass_100', 'PriceClass_200', 'PriceClass_All'], default: 'PriceClass_100', hint: 'PriceClass_100 = US + EU only (cheapest).' },
    ],
    cost: { typical: 0, max: 1.0, free: 'first 50 GB/month + 2M requests free' },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/cloudfront/v4/home',
    docsUrl: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-creating.html',
  },
  'cloudfront.invalidate-cache': {
    service: 'CloudFront', tier: 'BUILD',
    summary: 'Force CloudFront to re-fetch one or more paths from origin.',
    params: [
      { id: 'distributionId', label: 'Distribution ID', type: 'text', required: true },
      { id: 'paths',          label: 'Paths (newline-separated)', type: 'textarea', default: '/*' },
    ],
    cost: { typical: 0, max: 0.005, free: 'first 1000 paths/month free' },
    reversible: false,
    consoleUrl: ({ distributionId }) => `https://console.aws.amazon.com/cloudfront/v4/home#/distributions/${distributionId || ''}/invalidations`,
    docsUrl: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html',
  },

  // ─────────── Lambda ───────────
  'lambda.create-function': {
    service: 'Lambda', tier: 'BUILD',
    summary: 'Create a new Lambda function from inline code or a zip.',
    params: [
      { id: 'functionName', label: 'Function name',  type: 'text',   required: true },
      { id: 'runtime',      label: 'Runtime',        type: 'select', options: ['nodejs20.x', 'nodejs18.x', 'python3.12', 'python3.11'], default: 'nodejs20.x' },
      { id: 'memoryMB',     label: 'Memory (MB)',    type: 'number', default: 128, min: 128, max: 10240 },
      { id: 'timeoutSec',   label: 'Timeout (sec)',  type: 'number', default: 3, min: 1, max: 900 },
      { id: 'roleArn',      label: 'Execution role ARN', type: 'text', required: true, hint: 'Must already exist. Use iam.create-lambda-role first.' },
      { id: 'handler',      label: 'Handler',        type: 'text', default: 'index.handler' },
      { id: 'code',         label: 'Code (zip or inline)', type: 'code-or-zip', required: true },
    ],
    cost: { typical: 0, max: 0.20, free: 'first 1M requests + 400k GB-sec free, forever' },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/lambda/home#/functions',
    docsUrl: 'https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html',
  },
  'lambda.delete-function': {
    service: 'Lambda', tier: 'DESTROY',
    summary: 'Delete a Lambda function. Cannot be undone.',
    params: [
      { id: 'functionName', label: 'Function name', type: 'text', required: true },
    ],
    cost: { typical: 0, max: 0, free: true },
    reversible: false,
    consoleUrl: ({ functionName }) => `https://console.aws.amazon.com/lambda/home#/functions/${functionName || ''}`,
    docsUrl: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html',
  },

  // ─────────── DynamoDB ───────────
  'dynamodb.create-table': {
    service: 'DynamoDB', tier: 'BUILD',
    summary: 'Create a DynamoDB table with on-demand billing.',
    params: [
      { id: 'tableName',  label: 'Table name',   type: 'text', required: true },
      { id: 'partitionKey', label: 'Partition key', type: 'text', required: true },
      { id: 'partitionType',label: 'Partition type', type: 'select', options: ['S', 'N', 'B'], default: 'S' },
      { id: 'sortKey',    label: 'Sort key (optional)', type: 'text' },
      { id: 'sortType',   label: 'Sort type', type: 'select', options: ['', 'S', 'N', 'B'], default: '' },
    ],
    cost: { typical: 0, max: 1.25, free: '25 GB + 25 RCU/WCU/month forever (provisioned mode)' },
    reversible: true,
    consoleUrl: ({ tableName }) => `https://console.aws.amazon.com/dynamodbv2/home#table?name=${tableName || ''}`,
    docsUrl: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/getting-started-step-1.html',
  },
  'dynamodb.delete-table': {
    service: 'DynamoDB', tier: 'DESTROY',
    summary: 'Delete a DynamoDB table and all its data.',
    params: [
      { id: 'tableName', label: 'Table name', type: 'text', required: true },
    ],
    cost: { typical: 0, max: 0, free: true },
    reversible: false,
    consoleUrl: ({ tableName }) => `https://console.aws.amazon.com/dynamodbv2/home#table?name=${tableName || ''}`,
    docsUrl: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html',
  },

  // ─────────── EC2 ───────────
  'ec2.launch-instance': {
    service: 'EC2', tier: 'BUILD',
    summary: 'Launch a single EC2 instance (Free Tier safe defaults).',
    params: [
      { id: 'name',         label: 'Name tag',        type: 'text', required: true },
      { id: 'instanceType', label: 'Instance type',   type: 'select', options: ['t2.micro', 't3.micro', 't3.small'], default: 't2.micro', hint: 't2.micro is Free Tier (750 h/month).' },
      { id: 'amiId',        label: 'AMI ID',          type: 'text', required: true, hint: 'Amazon Linux 2023 latest — leave blank to auto-pick.' },
      { id: 'keyPairName',  label: 'SSH key pair',    type: 'text', required: true },
      { id: 'sgId',         label: 'Security group',  type: 'text', required: true },
    ],
    cost: { typical: 0, max: 18, free: '750 hours/month of t2.micro for 12 months' },
    reversible: true,
    consoleUrl: ({ region }) => `https://${region || 'eu-west-1'}.console.aws.amazon.com/ec2/home?region=${region || 'eu-west-1'}#Instances:`,
    docsUrl: 'https://docs.aws.amazon.com/ec2/latest/userguide/ec2-launch-instance.html',
  },
  'ec2.terminate-instance': {
    service: 'EC2', tier: 'DESTROY',
    summary: 'Terminate an EC2 instance (stops billing, irreversible).',
    params: [
      { id: 'instanceId', label: 'Instance ID (i-...)', type: 'text', required: true },
    ],
    cost: { typical: 0, max: 0, free: true },
    reversible: false,
    consoleUrl: ({ region }) => `https://${region || 'eu-west-1'}.console.aws.amazon.com/ec2/home?region=${region || 'eu-west-1'}#Instances:`,
    docsUrl: 'https://docs.aws.amazon.com/ec2/latest/userguide/terminating-instances.html',
  },

  // ─────────── IAM (🔴 Admin) ───────────
  'iam.create-role': {
    service: 'IAM', tier: 'ADMIN',
    summary: 'Create an IAM role with a trust policy and one or more managed policies.',
    params: [
      { id: 'roleName',         label: 'Role name',       type: 'text', required: true },
      { id: 'trustedService',   label: 'Trusted service', type: 'select', options: ['lambda.amazonaws.com', 'ec2.amazonaws.com', 'apigateway.amazonaws.com', 's3.amazonaws.com'], default: 'lambda.amazonaws.com' },
      { id: 'managedPolicyArns',label: 'Managed policy ARNs (newline-separated)', type: 'textarea', default: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole' },
    ],
    cost: { typical: 0, max: 0, free: 'IAM is always free' },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/iamv2/home#/roles',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html',
  },
  'iam.attach-policy': {
    service: 'IAM', tier: 'ADMIN',
    summary: 'Attach a managed policy to a user or role.',
    params: [
      { id: 'targetType', label: 'Target type', type: 'select', options: ['user', 'role'], default: 'role' },
      { id: 'targetName', label: 'Target name', type: 'text', required: true },
      { id: 'policyArn',  label: 'Policy ARN',  type: 'text', required: true },
    ],
    cost: { typical: 0, max: 0, free: true },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/iamv2/home',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_manage-attach-detach.html',
  },

  // ─────────── Budgets (🔴 Admin — touches billing) ───────────
  'budgets.create-budget': {
    service: 'Budgets', tier: 'ADMIN',
    summary: 'Create a cost budget with an email alert.',
    params: [
      { id: 'budgetName',  label: 'Budget name',  type: 'text',   required: true },
      { id: 'limitUsd',    label: 'Limit (USD)',  type: 'number', default: 5, min: 1 },
      { id: 'alertPct',    label: 'Alert when % of limit', type: 'number', default: 80, min: 1, max: 100 },
      { id: 'alertEmail',  label: 'Alert email',  type: 'email',  required: true },
    ],
    cost: { typical: 0, max: 0, free: 'first 2 budgets free' },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/billing/home#/budgets',
    docsUrl: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create.html',
  },

  // ─────────── READ-ONLY (no password) ───────────
  'sts.who-am-i': {
    service: 'STS', tier: 'READ',
    summary: 'Verify credentials work and return the caller ARN.',
    params: [],
    cost: { typical: 0, max: 0, free: true },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/iamv2/home',
    docsUrl: 'https://docs.aws.amazon.com/STS/latest/APIReference/API_GetCallerIdentity.html',
  },
  's3.list-buckets': {
    service: 'S3', tier: 'READ',
    summary: 'List every S3 bucket in the account.',
    params: [],
    cost: { typical: 0, max: 0, free: true },
    reversible: true,
    consoleUrl: () => 'https://s3.console.aws.amazon.com/s3/home',
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListBuckets.html',
  },
  'ec2.list-instances': {
    service: 'EC2', tier: 'READ',
    summary: 'List all EC2 instances in the current region.',
    params: [],
    cost: { typical: 0, max: 0, free: true },
    reversible: true,
    consoleUrl: ({ region }) => `https://${region || 'eu-west-1'}.console.aws.amazon.com/ec2/home?region=${region || 'eu-west-1'}#Instances:`,
    docsUrl: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Filtering.html',
  },
  'lambda.list-functions': {
    service: 'Lambda', tier: 'READ',
    summary: 'List every Lambda function in the current region.',
    params: [],
    cost: { typical: 0, max: 0, free: true },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/lambda/home#/functions',
    docsUrl: 'https://docs.aws.amazon.com/lambda/latest/api/API_ListFunctions.html',
  },
  'budgets.list': {
    service: 'Budgets', tier: 'READ',
    summary: 'List all budgets currently active on the account.',
    params: [],
    cost: { typical: 0, max: 0, free: true },
    reversible: true,
    consoleUrl: () => 'https://console.aws.amazon.com/billing/home#/budgets',
    docsUrl: 'https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html',
  },

  // ─────────── ⛔ BLOCKED — hardcoded fuses ───────────
  // These appear in the registry so the UI can SHOW them as "console only",
  // but the executor refuses to run them no matter what.
  'account.close': {
    service: 'Account', tier: 'BLOCKED',
    summary: 'Close the AWS account permanently.',
    blockReason: 'Account closure is irreversible. Must be done from the AWS Console while signed in as root, in person.',
    consoleUrl: () => 'https://console.aws.amazon.com/billing/home#/account',
    docsUrl: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-closing.html',
  },
  'iam.disable-root-mfa': {
    service: 'IAM', tier: 'BLOCKED',
    summary: 'Disable MFA on the root user.',
    blockReason: 'Disabling root MFA destroys your safety net. Must be done manually from the IAM console.',
    consoleUrl: () => 'https://console.aws.amazon.com/iamv2/home#/security_credentials',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa.html',
  },
  'cloudtrail.delete-trail': {
    service: 'CloudTrail', tier: 'BLOCKED',
    summary: 'Delete the audit trail.',
    blockReason: 'Deleting CloudTrail destroys the audit log that proves what happened. Manual only.',
    consoleUrl: () => 'https://console.aws.amazon.com/cloudtrail/home',
    docsUrl: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-delete-trails-console.html',
  },
  'account.change-root-email': {
    service: 'Account', tier: 'BLOCKED',
    summary: 'Change the root user email or password.',
    blockReason: 'Root credentials must only ever be changed from a logged-in root console session.',
    consoleUrl: () => 'https://console.aws.amazon.com/billing/home#/account',
    docsUrl: 'https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-update-root-user.html',
  },
};

/**
 * Group actions by service for menu rendering.
 */
export function actionsByService() {
  const groups = {};
  for (const [id, def] of Object.entries(ACTIONS)) {
    const k = def.service;
    if (!groups[k]) groups[k] = [];
    groups[k].push({ id, ...def });
  }
  return groups;
}

/**
 * Resolve an action id → full definition including tier metadata.
 */
export function resolveAction(id) {
  const def = ACTIONS[id];
  if (!def) return null;
  return { id, ...def, tierMeta: TIERS[def.tier] };
}

/**
 * Direct AWS console URL helper for any action.
 */
export function consoleUrlFor(id, params = {}) {
  const a = resolveAction(id);
  if (!a) return null;
  try {
    return a.consoleUrl ? a.consoleUrl(params) : null;
  } catch {
    return null;
  }
}

/**
 * Friendly list of every blocked action — useful for the Settings UI to
 * explain to the user what the safety floor protects against.
 */
export const BLOCKED_ACTIONS = Object.entries(ACTIONS)
  .filter(([, a]) => a.tier === 'BLOCKED')
  .map(([id, a]) => ({ id, ...a }));
