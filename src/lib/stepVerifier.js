/**
 * stepVerifier.js — uses your linked AWS account to confirm each walkthrough
 * step actually worked. The "did I do it right?" safety net.
 *
 * How it's wired up:
 *   • A walkthrough step has a `verify` block:
 *       { kind: 'bucket-exists', paramHints: { bucketName: '...', region: '...' } }
 *   • When the user clicks "Check my work", SmartMethodDetector calls
 *     `runVerify(verify, creds, context)` from this module.
 *   • The runner picks the right verifier, calls AWS, returns
 *     { ok, level: 'success' | 'warning' | 'error', message, suggestions[] }.
 *   • The UI shows that result, auto-marks the step done if ok, and
 *     surfaces fix suggestions if not.
 *
 * Privacy: every API call uses the IAM credentials the user explicitly
 * saved in AWSContext. Nothing is sent anywhere else.
 *
 * Add a new verifier:
 *   1. Add an entry to VERIFIERS keyed by kind id.
 *   2. The walkthrough step `verify.kind` then resolves automatically.
 */

// ---------------- small helpers ----------------

function ok(message, extra = {}) {
  return { ok: true, level: 'success', message, ...extra };
}

function warn(message, suggestions = []) {
  return { ok: false, level: 'warning', message, suggestions };
}

function err(message, suggestions = []) {
  return { ok: false, level: 'error', message, suggestions };
}

function awsErr(e, defaultMsg = 'AWS API error.') {
  const m = e?.message || e?.toString?.() || defaultMsg;
  const code = e?.name || e?.Code;
  return code ? `${code}: ${m}` : m;
}

// ---------------- verifier library ----------------

/**
 * Each verifier has:
 *   • label: human-readable name shown on the button
 *   • needs: param names the runner asks for if missing from context
 *   • run({ creds, region, params }) → result
 */
export const VERIFIERS = {
  // ─────────── auth / account ───────────

  'iam-can-call-aws': {
    label: 'Can I reach AWS at all?',
    needs: [],
    async run({ creds, region }) {
      try {
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
        const sts = new STSClient({ region, credentials: creds });
        const out = await sts.send(new GetCallerIdentityCommand({}));
        return ok(`Connected as ${out.Arn} (account ${out.Account}).`, { identity: out });
      } catch (e) {
        return err(`Could not reach AWS — ${awsErr(e)}`, [
          'Open AWS Account Manager and re-test the connection.',
          'Confirm the access key and secret are pasted with no leading/trailing spaces.',
        ]);
      }
    },
  },

  'iam-user-has-mfa': {
    label: 'Is MFA enabled on this user?',
    needs: [],
    async run({ creds, region }) {
      try {
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
        const { IAMClient, ListMFADevicesCommand } = await import('@aws-sdk/client-iam');
        const sts = new STSClient({ region, credentials: creds });
        const whoami = await sts.send(new GetCallerIdentityCommand({}));
        const userName = whoami.Arn?.split('/').pop();
        if (whoami.Arn?.includes(':root')) {
          return warn('You\'re connected as the root account — root MFA can\'t be queried via API. Verify manually in the IAM Console.', [
            'Sign in as root in a separate browser tab.',
            'Account menu (top-right) → Security credentials → Multi-factor authentication.',
          ]);
        }
        const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
        const out = await iam.send(new ListMFADevicesCommand({ UserName: userName }));
        if ((out.MFADevices || []).length > 0) {
          return ok(`MFA enabled on user "${userName}" — ${out.MFADevices.length} device(s) registered.`);
        }
        return err(`No MFA device found on user "${userName}".`, [
          'Sign in to AWS Console as this user.',
          'Top-right → Security credentials → Multi-factor authentication.',
          'Click "Assign MFA device" and follow the walkthrough.',
        ]);
      } catch (e) {
        return err(`Could not check MFA — ${awsErr(e)}`);
      }
    },
  },

  // ─────────── budgets ───────────

  'budget-exists': {
    label: 'Is the budget created?',
    needs: ['budgetName'],
    async run({ creds, params }) {
      try {
        const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
        const { BudgetsClient, DescribeBudgetsCommand } = await import('@aws-sdk/client-budgets');
        const sts = new STSClient({ region: 'us-east-1', credentials: creds });
        const whoami = await sts.send(new GetCallerIdentityCommand({}));
        const b = new BudgetsClient({ region: 'us-east-1', credentials: creds });
        const out = await b.send(new DescribeBudgetsCommand({ AccountId: whoami.Account }));
        const found = (out.Budgets || []).find((bd) => bd.BudgetName === params.budgetName);
        if (found) {
          return ok(`Budget "${params.budgetName}" exists — limit ${found.BudgetLimit?.Amount} ${found.BudgetLimit?.Unit}, type ${found.BudgetType}.`);
        }
        const names = (out.Budgets || []).map((bd) => bd.BudgetName).join(', ') || '(none)';
        return err(`Budget "${params.budgetName}" not found. Existing budgets: ${names}.`, [
          'Open AWS Console → Billing → Budgets.',
          'Click "Create budget" if missing.',
          'Confirm the name matches exactly (case-sensitive).',
        ]);
      } catch (e) {
        return err(`Could not check budgets — ${awsErr(e)}`, [
          'IAM user may not have "AWSBudgetsReadOnlyAccess" — attach it in IAM.',
          'Or sign in to AWS Console and verify manually.',
        ]);
      }
    },
  },

  // ─────────── S3 ───────────

  'bucket-exists': {
    label: 'Does this bucket exist?',
    needs: ['bucketName', 'region'],
    async run({ creds, params }) {
      try {
        const region = params.region || 'eu-west-1';
        const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region, credentials: creds });
        await s3.send(new HeadBucketCommand({ Bucket: params.bucketName }));
        return ok(`Bucket "${params.bucketName}" exists in ${region}.`);
      } catch (e) {
        const code = e?.$metadata?.httpStatusCode;
        if (code === 404 || e?.name === 'NotFound') {
          return err(`Bucket "${params.bucketName}" not found in this region.`, [
            'Did you click the orange "Create bucket" at the BOTTOM of the form?',
            `Double-check spelling: lowercase only, hyphens OK, no underscores. You typed: ${params.bucketName}.`,
            'Confirm you\'re in the correct region (top-right of console).',
          ]);
        }
        if (code === 403 || e?.name === 'Forbidden') {
          return warn(`Bucket "${params.bucketName}" exists, but you don't have permission to read it (probably owned by someone else — names are globally unique).`, [
            'Pick a different bucket name — yours is taken globally.',
            'Try suffixing with your account id or year (e.g. -2026).',
          ]);
        }
        return err(`Could not check bucket — ${awsErr(e)}`);
      }
    },
  },

  'bucket-versioning-enabled': {
    label: 'Is bucket versioning enabled?',
    needs: ['bucketName', 'region'],
    async run({ creds, params }) {
      try {
        const region = params.region || 'eu-west-1';
        const { S3Client, GetBucketVersioningCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region, credentials: creds });
        const out = await s3.send(new GetBucketVersioningCommand({ Bucket: params.bucketName }));
        if (out.Status === 'Enabled') {
          return ok(`Versioning is Enabled on "${params.bucketName}".`);
        }
        if (out.Status === 'Suspended') {
          return warn(`Versioning is Suspended on "${params.bucketName}" — was on, now off. Re-enable in the Properties tab.`);
        }
        return err(`Versioning is NOT enabled on "${params.bucketName}".`, [
          'Open the bucket → Properties tab → Bucket Versioning → Edit → Enable → Save.',
        ]);
      } catch (e) {
        return err(`Could not check versioning — ${awsErr(e)}`);
      }
    },
  },

  'bucket-public-access-blocked': {
    label: 'Is public access blocked?',
    needs: ['bucketName', 'region'],
    async run({ creds, params }) {
      try {
        const region = params.region || 'eu-west-1';
        const { S3Client, GetPublicAccessBlockCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region, credentials: creds });
        const out = await s3.send(new GetPublicAccessBlockCommand({ Bucket: params.bucketName }));
        const c = out.PublicAccessBlockConfiguration || {};
        const allOn = c.BlockPublicAcls && c.IgnorePublicAcls && c.BlockPublicPolicy && c.RestrictPublicBuckets;
        if (allOn) return ok(`All 4 public-access blocks are ON for "${params.bucketName}".`);
        const off = [
          !c.BlockPublicAcls && 'BlockPublicAcls',
          !c.IgnorePublicAcls && 'IgnorePublicAcls',
          !c.BlockPublicPolicy && 'BlockPublicPolicy',
          !c.RestrictPublicBuckets && 'RestrictPublicBuckets',
        ].filter(Boolean);
        return warn(`Some public-access blocks are OFF: ${off.join(', ')}. OK only if this is intentionally public.`, [
          'For private buckets: open bucket → Permissions → Block Public Access → Edit → tick all 4 → Save.',
          'For public static sites: leave them off and add a bucket policy scoped to s3:GetObject.',
        ]);
      } catch (e) {
        if (e?.name === 'NoSuchPublicAccessBlockConfiguration') {
          return err(`No public-access-block configured on "${params.bucketName}". This is the OLD default — explicitly set it now.`, [
            'Permissions → Block Public Access → Edit → tick all 4 → Save.',
          ]);
        }
        return err(`Could not check public access — ${awsErr(e)}`);
      }
    },
  },

  'bucket-website-enabled': {
    label: 'Is static-website hosting on?',
    needs: ['bucketName', 'region'],
    async run({ creds, params }) {
      try {
        const region = params.region || 'eu-west-1';
        const { S3Client, GetBucketWebsiteCommand } = await import('@aws-sdk/client-s3');
        const s3 = new S3Client({ region, credentials: creds });
        const out = await s3.send(new GetBucketWebsiteCommand({ Bucket: params.bucketName }));
        return ok(`Static hosting enabled. Index: ${out.IndexDocument?.Suffix} · Error: ${out.ErrorDocument?.Key}. URL: http://${params.bucketName}.s3-website.${region}.amazonaws.com`);
      } catch (e) {
        if (e?.name === 'NoSuchWebsiteConfiguration') {
          return err(`Static hosting is NOT enabled on "${params.bucketName}".`, [
            'Properties tab → scroll to "Static website hosting" → Edit → Enable → Save.',
          ]);
        }
        return err(`Could not check hosting — ${awsErr(e)}`);
      }
    },
  },

  // ─────────── IAM ───────────

  'iam-user-exists': {
    label: 'Does the IAM user exist?',
    needs: ['userName'],
    async run({ creds, params }) {
      try {
        const { IAMClient, GetUserCommand } = await import('@aws-sdk/client-iam');
        const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
        const out = await iam.send(new GetUserCommand({ UserName: params.userName }));
        return ok(`IAM user "${params.userName}" exists. Created ${new Date(out.User.CreateDate).toLocaleDateString()}.`);
      } catch (e) {
        if (e?.name === 'NoSuchEntity') {
          return err(`IAM user "${params.userName}" not found.`, [
            'IAM → Users → Create user.',
            `Confirm the username is exactly: ${params.userName}`,
          ]);
        }
        return err(`Could not check user — ${awsErr(e)}`);
      }
    },
  },

  'iam-user-has-admin': {
    label: 'Does the IAM user have AdministratorAccess?',
    needs: ['userName'],
    async run({ creds, params }) {
      try {
        const { IAMClient, ListAttachedUserPoliciesCommand } = await import('@aws-sdk/client-iam');
        const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
        const out = await iam.send(new ListAttachedUserPoliciesCommand({ UserName: params.userName }));
        const has = (out.AttachedPolicies || []).some((p) => p.PolicyName === 'AdministratorAccess');
        if (has) return ok(`User "${params.userName}" has AdministratorAccess attached.`);
        const names = (out.AttachedPolicies || []).map((p) => p.PolicyName).join(', ') || '(none)';
        return warn(`User "${params.userName}" does NOT have AdministratorAccess. Attached: ${names}.`, [
          'IAM → Users → ' + params.userName + ' → Add permissions → Attach policies directly.',
          'Search "AdministratorAccess", tick it, Add permissions.',
        ]);
      } catch (e) {
        return err(`Could not check policies — ${awsErr(e)}`);
      }
    },
  },

  // ─────────── CloudFront ───────────

  'cloudfront-distribution-exists': {
    label: 'Is the CloudFront distribution live?',
    needs: ['distributionId'],
    async run({ creds, params }) {
      try {
        const { CloudFrontClient, GetDistributionCommand } = await import('@aws-sdk/client-cloudfront');
        const cf = new CloudFrontClient({ region: 'us-east-1', credentials: creds });
        const out = await cf.send(new GetDistributionCommand({ Id: params.distributionId }));
        const status = out.Distribution?.Status;
        if (status === 'Deployed') return ok(`Distribution ${params.distributionId} is Deployed. Domain: ${out.Distribution.DomainName}`);
        return warn(`Distribution ${params.distributionId} status: ${status}. Still propagating — usually 5-15 min.`);
      } catch (e) {
        if (e?.name === 'NoSuchDistribution') {
          return err(`Distribution ${params.distributionId} not found. Did the create finish?`);
        }
        return err(`Could not check distribution — ${awsErr(e)}`);
      }
    },
  },

  // ─────────── Lambda ───────────

  'lambda-function-exists': {
    label: 'Does the Lambda function exist?',
    needs: ['functionName', 'region'],
    async run({ creds, params }) {
      try {
        const region = params.region || 'eu-west-1';
        const { LambdaClient, GetFunctionCommand } = await import('@aws-sdk/client-lambda');
        const lam = new LambdaClient({ region, credentials: creds });
        const out = await lam.send(new GetFunctionCommand({ FunctionName: params.functionName }));
        return ok(`Function ${params.functionName} exists. State: ${out.Configuration?.State}. Runtime: ${out.Configuration?.Runtime}.`);
      } catch (e) {
        if (e?.name === 'ResourceNotFoundException') {
          return err(`Lambda function "${params.functionName}" not found in ${params.region}.`, [
            'Confirm you\'re checking the correct region.',
            'Lambda console → Functions → Create function if missing.',
          ]);
        }
        return err(`Could not check function — ${awsErr(e)}`);
      }
    },
  },

  // ─────────── EC2 ───────────

  'ec2-instance-running': {
    label: 'Is the EC2 instance running?',
    needs: ['instanceId', 'region'],
    async run({ creds, params }) {
      try {
        const region = params.region || 'eu-west-1';
        const { EC2Client, DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
        const ec2 = new EC2Client({ region, credentials: creds });
        const out = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [params.instanceId] }));
        const inst = out.Reservations?.[0]?.Instances?.[0];
        if (!inst) return err(`Instance ${params.instanceId} not found in ${region}.`);
        const state = inst.State?.Name;
        if (state === 'running') return ok(`Instance ${params.instanceId} is running. Public IP: ${inst.PublicIpAddress || '(none)'}`);
        return warn(`Instance ${params.instanceId} state: ${state}. Wait a moment + re-check.`);
      } catch (e) {
        return err(`Could not check instance — ${awsErr(e)}`);
      }
    },
  },
};

// ---------------- public runner ----------------

/**
 * Run a step's verify spec against the user's linked AWS account.
 *
 * @param {object} verify  — { kind, paramHints? } from the step data
 * @param {object} creds   — { accessKeyId, secretAccessKey, sessionToken? }
 * @param {object} ctx     — { region, ...savedParams }   shared across the walkthrough
 * @param {object} extra   — params explicitly supplied via the dialog
 * @returns {{ ok, level, message, suggestions[] }}
 */
export async function runVerify({ verify, creds, ctx = {}, extra = {} }) {
  if (!verify || !verify.kind) return err('No verifier configured for this step.');
  const def = VERIFIERS[verify.kind];
  if (!def) return err(`Unknown verifier: ${verify.kind}.`);
  if (!creds?.accessKeyId || !creds?.secretAccessKey) {
    return err('No AWS credentials linked. Open AWS Account Manager and save your access keys first.', [
      'Settings → AWS Account Manager → paste keys → Test connection.',
    ]);
  }
  const params = { ...(verify.paramHints || {}), ...ctx, ...extra };
  // Confirm we have all required params
  const missing = (def.needs || []).filter((k) => !params[k]);
  if (missing.length) {
    return { ok: false, level: 'needs-input', message: `Need: ${missing.join(', ')}`, missing };
  }
  try {
    return await def.run({ creds, region: params.region, params });
  } catch (e) {
    return err(`Verifier crashed — ${awsErr(e)}`);
  }
}

/**
 * Helper: which verifiers are available for the UI dropdown.
 */
export function verifierKinds() {
  return Object.entries(VERIFIERS).map(([id, v]) => ({ id, label: v.label, needs: v.needs || [] }));
}
