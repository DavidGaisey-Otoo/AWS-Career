/**
 * awsDeploy.js — the only place in the app that calls AWS write APIs.
 *
 * Every export here corresponds to an entry in `data/awsActions.js`. The
 * function names are derived from the action id by replacing dots with
 * underscores (e.g. 's3.create-bucket' → s3_create_bucket).
 *
 * Wiring:
 *   DeployContext.execute(actionId, params, creds) → routes here
 *   → SDK client is dynamically imported (smaller bundle for unused services)
 *   → returns { ok, result, raw, log[] } so the audit log captures everything
 *
 * All executors:
 *   - Receive ALREADY-DECRYPTED creds; never persist them
 *   - Return both a friendly `result` summary and a `raw` AWS API response
 *   - Push human-readable lines to `log` for the audit / UI
 *   - Throw on hard failure (caller catches + records)
 *
 * BLOCKED actions (account.close, iam.disable-root-mfa, …) have no executor
 * here — invoking them returns a hardcoded refusal in DeployContext.
 */

import { assertReadOnlyQuery, taggingRowsFrom } from './resourceSearch.js';

// ---------------- shared helpers ----------------

function mkLog(level, msg) {
  return { at: Date.now(), level, msg };
}

function trimResponse(raw) {
  // AWS SDK responses include $metadata + tons of fields; keep a compact
  // version for the audit log so localStorage doesn't bloat.
  if (!raw || typeof raw !== 'object') return raw;
  const out = {};
  for (const k of Object.keys(raw)) {
    if (k === '$metadata') continue;
    out[k] = raw[k];
  }
  return out;
}

// ---------------- STS / read-only ----------------

export async function sts_who_am_i({ creds, region }) {
  const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
  const sts = new STSClient({ region, credentials: creds });
  const raw = await sts.send(new GetCallerIdentityCommand({}));
  return {
    ok: true,
    result: { account: raw.Account, arn: raw.Arn, userId: raw.UserId },
    raw: trimResponse(raw),
    log: [mkLog('success', `Authenticated as ${raw.Arn} (account ${raw.Account})`)],
  };
}

export async function s3_list_buckets({ creds, region }) {
  const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region, credentials: creds });
  const raw = await s3.send(new ListBucketsCommand({}));
  const buckets = (raw.Buckets || []).map((b) => ({ name: b.Name, createdAt: b.CreationDate }));
  return {
    ok: true,
    result: { count: buckets.length, buckets },
    raw: trimResponse(raw),
    log: [mkLog('info', `Found ${buckets.length} bucket${buckets.length === 1 ? '' : 's'}.`)],
  };
}

export async function ec2_list_instances({ creds, region }) {
  const { EC2Client, DescribeInstancesCommand } = await import('@aws-sdk/client-ec2');
  const ec2 = new EC2Client({ region, credentials: creds });
  const raw = await ec2.send(new DescribeInstancesCommand({}));
  const instances = [];
  for (const r of (raw.Reservations || [])) {
    for (const i of (r.Instances || [])) {
      instances.push({
        id: i.InstanceId,
        type: i.InstanceType,
        state: i.State?.Name,
        publicIp: i.PublicIpAddress,
        privateIp: i.PrivateIpAddress,
        launchTime: i.LaunchTime,
      });
    }
  }
  return {
    ok: true,
    result: { count: instances.length, instances },
    raw: trimResponse(raw),
    log: [mkLog('info', `Found ${instances.length} EC2 instance${instances.length === 1 ? '' : 's'} in ${region}.`)],
  };
}

export async function lambda_list_functions({ creds, region }) {
  const { LambdaClient, ListFunctionsCommand } = await import('@aws-sdk/client-lambda');
  const lam = new LambdaClient({ region, credentials: creds });
  const raw = await lam.send(new ListFunctionsCommand({ MaxItems: 100 }));
  const fns = (raw.Functions || []).map((f) => ({
    name: f.FunctionName, runtime: f.Runtime, memory: f.MemorySize, lastModified: f.LastModified,
  }));
  return {
    ok: true,
    result: { count: fns.length, functions: fns },
    raw: trimResponse(raw),
    log: [mkLog('info', `Found ${fns.length} Lambda function${fns.length === 1 ? '' : 's'} in ${region}.`)],
  };
}

export async function budgets_list({ creds, region }) {
  const { BudgetsClient, DescribeBudgetsCommand } = await import('@aws-sdk/client-budgets');
  const b = new BudgetsClient({ region: 'us-east-1', credentials: creds }); // budgets is global, us-east-1
  // We need the caller's accountId — STS first.
  const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
  const sts = new STSClient({ region: 'us-east-1', credentials: creds });
  const who = await sts.send(new GetCallerIdentityCommand({}));
  const raw = await b.send(new DescribeBudgetsCommand({ AccountId: who.Account }));
  const list = (raw.Budgets || []).map((bd) => ({
    name: bd.BudgetName,
    limit: bd.BudgetLimit ? `${bd.BudgetLimit.Amount} ${bd.BudgetLimit.Unit}` : null,
    type: bd.BudgetType,
  }));
  return {
    ok: true,
    result: { count: list.length, budgets: list },
    raw: trimResponse(raw),
    log: [mkLog('info', `Found ${list.length} budget${list.length === 1 ? '' : 's'}.`)],
  };
}

// ---------------- resource search (read-only) ----------------

/**
 * Is the AWS Config recorder actually on?
 *
 * This exists because of one specific trap: an advanced query against an
 * account with no recorder SUCCEEDS and returns zero rows. That is
 * indistinguishable from "you own nothing" unless you ask this question
 * first. The UI calls this before its first query so it can tell the user
 * which of the two they are looking at.
 */
export async function config_recorder_status({ creds, region }) {
  const { ConfigServiceClient, DescribeConfigurationRecordersCommand, DescribeConfigurationRecorderStatusCommand } =
    await import('@aws-sdk/client-config-service');
  const client = new ConfigServiceClient({ region, credentials: creds });

  const recorders = await client.send(new DescribeConfigurationRecordersCommand({}));
  const configured = (recorders.ConfigurationRecorders || []).length > 0;
  if (!configured) {
    return {
      ok: true,
      result: { region, configured: false, recording: false, recorders: [] },
      raw: trimResponse(recorders),
      log: [mkLog('warn', `No AWS Config recorder exists in ${region}. Advanced queries will return zero rows.`)],
    };
  }

  // IAM roles, users and policies are GLOBAL resources. Config records
  // them only if the recorder opts in, so without this the IAM query
  // returns zero rows and reads as "you have no roles" — the same trap
  // this whole function exists to close, one level down.
  const group = (recorders.ConfigurationRecorders || [])[0]?.recordingGroup || {};
  const includesGlobal =
    group.includeGlobalResourceTypes === true ||
    (group.resourceTypes || []).some((t) => String(t).startsWith('AWS::IAM::'));

  const status = await client.send(new DescribeConfigurationRecorderStatusCommand({}));
  const list = (status.ConfigurationRecordersStatus || []).map((s) => ({
    name: s.name,
    recording: !!s.recording,
    lastStatus: s.lastStatus || null,
    lastErrorMessage: s.lastErrorMessage || null,
  }));
  const recording = list.some((s) => s.recording);
  return {
    ok: true,
    result: { region, configured: true, recording, includesGlobal, recorders: list },
    raw: trimResponse(status),
    log: [
      mkLog(
        recording ? 'success' : 'warn',
        recording
          ? `Config recorder is running in ${region}.`
          : `A Config recorder exists in ${region} but is NOT recording. Queries will return stale or zero rows.`
      ),
    ],
  };
}

/**
 * Run one AWS Config advanced query.
 *
 * `assertReadOnlyQuery` runs again here even though the caller already
 * validated: this is the function that actually reaches AWS, so the
 * guarantee is enforced at the boundary that matters rather than trusted
 * from upstream.
 */
export async function config_advanced_query({ creds, region, params }) {
  const expression = assertReadOnlyQuery(params?.query);
  const { ConfigServiceClient, SelectResourceConfigCommand } = await import('@aws-sdk/client-config-service');
  const client = new ConfigServiceClient({ region, credentials: creds });

  // SelectResourceConfig caps Limit at 100; asking for more is an error.
  const limit = Math.min(Math.max(Number(params?.limit) || 100, 1), 100);
  const raw = await client.send(
    new SelectResourceConfigCommand({
      Expression: expression,
      Limit: limit,
      ...(params?.nextToken ? { NextToken: params.nextToken } : {}),
    })
  );

  const results = raw.Results || [];
  return {
    ok: true,
    // `result` is the ONLY field DeployContext writes to the audit log, so
    // it carries the shape of the answer and never the rows themselves.
    // A 100-row result set is ~57KB of JSON; at that size a few dozen
    // searches exhaust the browser's localStorage quota, and
    // useLocalStorage swallows that failure silently — so the audit log
    // would quietly stop persisting and take the rest of the app's saved
    // state with it. The rows travel in `raw`, which is never audited.
    result: {
      region,
      query: expression,
      count: results.length,
      nextToken: raw.NextToken || null,
      // Config reports the columns it actually selected — useful when a
      // query silently returns fewer fields than the caller expected.
      selectedFields: (raw.QueryInfo?.SelectFields || []).map((f) => f.Name).filter(Boolean),
    },
    raw: { Results: results, NextToken: raw.NextToken || null },
    log: [
      mkLog(
        results.length ? 'success' : 'info',
        results.length
          ? `Query returned ${results.length} row${results.length === 1 ? '' : 's'} from ${region}.`
          : `Query returned no rows in ${region}. Check the Config recorder before concluding the account is empty.`
      ),
    ],
  };
}

/**
 * Tag-based lookup via the Resource Groups Tagging API.
 *
 * Complements Config rather than duplicating it: this needs no recorder
 * and costs nothing, but it only sees tagged resources and only knows
 * their ARN and tags.
 */
export async function tagging_get_resources({ creds, region, params }) {
  const { ResourceGroupsTaggingAPIClient, GetResourcesCommand } = await import(
    '@aws-sdk/client-resource-groups-tagging-api'
  );
  const client = new ResourceGroupsTaggingAPIClient({ region, credentials: creds });

  const tagKey = (params?.tagKey || '').trim();
  const tagValue = (params?.tagValue || '').trim();
  const raw = await client.send(
    new GetResourcesCommand({
      ...(tagKey ? { TagFilters: [{ Key: tagKey, ...(tagValue ? { Values: [tagValue] } : {}) }] } : {}),
      ...(params?.resourceTypes?.length ? { ResourceTypeFilters: params.resourceTypes } : {}),
      ResourcesPerPage: Math.min(Math.max(Number(params?.limit) || 100, 1), 100),
      ...(params?.paginationToken ? { PaginationToken: params.paginationToken } : {}),
    })
  );

  const rows = taggingRowsFrom(raw.ResourceTagMappingList || []);
  // The API returns an empty-string token, not null, when exhausted.
  const nextToken = raw.PaginationToken || null;
  return {
    ok: true,
    // Summary only — see the note in config_advanced_query for why the
    // rows must not end up in the audited `result`.
    result: {
      region,
      tagKey: tagKey || null,
      tagValue: tagValue || null,
      count: rows.length,
      nextToken,
    },
    raw: { rows, PaginationToken: nextToken },
    log: [
      mkLog(
        'info',
        `Tagging API returned ${rows.length} resource${rows.length === 1 ? '' : 's'} in ${region}` +
          (tagKey ? ` with tag "${tagKey}".` : ' (all tagged resources).')
      ),
    ],
  };
}

// ---------------- S3 write ----------------

export async function s3_create_bucket({ creds, region, params }) {
  const { S3Client, CreateBucketCommand, PutPublicAccessBlockCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region: params.region || region, credentials: creds });
  const Bucket = params.bucketName;
  const log = [mkLog('info', `Creating bucket "${Bucket}" in ${params.region || region}…`)];
  const cmd = (params.region === 'us-east-1' || (!params.region && region === 'us-east-1'))
    ? { Bucket }
    : { Bucket, CreateBucketConfiguration: { LocationConstraint: params.region || region } };
  const raw = await s3.send(new CreateBucketCommand(cmd));
  log.push(mkLog('success', `Bucket created. Location: ${raw.Location || '(default)'}`));

  if (params.blockPublic !== false) {
    log.push(mkLog('info', 'Applying Block Public Access (all 4 settings)…'));
    await s3.send(new PutPublicAccessBlockCommand({
      Bucket,
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true,
      },
    }));
    log.push(mkLog('success', 'Block Public Access applied.'));
  }

  return {
    ok: true,
    result: { bucketName: Bucket, region: params.region || region, location: raw.Location },
    raw: trimResponse(raw),
    log,
  };
}

export async function s3_upload_files({ creds, region, params }) {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region, credentials: creds });
  const Bucket = params.bucketName;
  const files = params.files || [];
  const prefix = params.prefix || '';
  const log = [mkLog('info', `Uploading ${files.length} file(s) to ${Bucket}…`)];
  const uploaded = [];
  for (const f of files) {
    const Key = (prefix ? prefix.replace(/\/?$/, '/') : '') + (f.name || f.Key);
    const body = f.body || f.Body || f;
    await s3.send(new PutObjectCommand({
      Bucket, Key, Body: body,
      ContentType: f.contentType || f.type || guessContentType(Key),
    }));
    uploaded.push(Key);
    log.push(mkLog('success', `↑ ${Key}`));
  }
  return { ok: true, result: { bucketName: Bucket, uploaded }, raw: null, log };
}

function guessContentType(key) {
  const ext = key.split('.').pop()?.toLowerCase();
  const map = {
    html: 'text/html', htm: 'text/html', css: 'text/css', js: 'application/javascript',
    json: 'application/json', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    svg: 'image/svg+xml', gif: 'image/gif', webp: 'image/webp', ico: 'image/x-icon',
    pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown', xml: 'application/xml',
  };
  return map[ext] || 'application/octet-stream';
}

export async function s3_enable_static_website({ creds, region, params }) {
  const { S3Client, PutBucketWebsiteCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region, credentials: creds });
  const raw = await s3.send(new PutBucketWebsiteCommand({
    Bucket: params.bucketName,
    WebsiteConfiguration: {
      IndexDocument: { Suffix: params.indexDoc || 'index.html' },
      ErrorDocument: { Key: params.errorDoc || 'error.html' },
    },
  }));
  const websiteUrl = `http://${params.bucketName}.s3-website.${region}.amazonaws.com`;
  return {
    ok: true,
    result: { bucketName: params.bucketName, websiteUrl, indexDoc: params.indexDoc, errorDoc: params.errorDoc },
    raw: trimResponse(raw),
    log: [mkLog('success', `Static hosting enabled. URL: ${websiteUrl}`)],
  };
}

export async function s3_set_public_read_policy({ creds, region, params }) {
  const { S3Client, PutBucketPolicyCommand, DeletePublicAccessBlockCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region, credentials: creds });
  // Public read requires removing Block Public Policy first.
  await s3.send(new DeletePublicAccessBlockCommand({ Bucket: params.bucketName })).catch(() => {});
  const policy = {
    Version: '2012-10-17',
    Statement: [{
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${params.bucketName}/*`,
    }],
  };
  await s3.send(new PutBucketPolicyCommand({
    Bucket: params.bucketName,
    Policy: JSON.stringify(policy),
  }));
  return {
    ok: true,
    result: { bucketName: params.bucketName, policy },
    raw: null,
    log: [mkLog('warning', `Bucket ${params.bucketName} is now publicly readable.`)],
  };
}

export async function s3_delete_bucket({ creds, region, params }) {
  const { S3Client, ListObjectsV2Command, DeleteObjectsCommand, DeleteBucketCommand } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({ region, credentials: creds });
  const Bucket = params.bucketName;
  const log = [];

  // Empty first
  if (params.emptyFirst !== false) {
    log.push(mkLog('info', `Emptying bucket ${Bucket} first…`));
    let token;
    let totalDeleted = 0;
    do {
      const list = await s3.send(new ListObjectsV2Command({ Bucket, ContinuationToken: token }));
      const keys = (list.Contents || []).map((o) => ({ Key: o.Key }));
      if (keys.length) {
        await s3.send(new DeleteObjectsCommand({ Bucket, Delete: { Objects: keys, Quiet: true } }));
        totalDeleted += keys.length;
      }
      token = list.IsTruncated ? list.NextContinuationToken : undefined;
    } while (token);
    log.push(mkLog('info', `Deleted ${totalDeleted} object(s).`));
  }

  await s3.send(new DeleteBucketCommand({ Bucket }));
  log.push(mkLog('success', `Bucket ${Bucket} deleted.`));
  return { ok: true, result: { bucketName: Bucket }, raw: null, log };
}

// ---------------- CloudFront ----------------

export async function cloudfront_create_distribution({ creds, region: _region, params }) {
  const { CloudFrontClient, CreateDistributionCommand } = await import('@aws-sdk/client-cloudfront');
  const cf = new CloudFrontClient({ region: 'us-east-1', credentials: creds });
  const Origin = `${params.bucketName}.s3.amazonaws.com`;
  const callerRef = `awscl-${Date.now()}`;
  const raw = await cf.send(new CreateDistributionCommand({
    DistributionConfig: {
      CallerReference: callerRef,
      Comment: `Created by AWS Career Launchpad Pro on ${new Date().toISOString()}`,
      Enabled: true,
      PriceClass: params.priceClass || 'PriceClass_100',
      Origins: {
        Quantity: 1,
        Items: [{
          Id: Origin, DomainName: Origin,
          S3OriginConfig: { OriginAccessIdentity: '' },
          CustomHeaders: { Quantity: 0 },
          OriginPath: '',
        }],
      },
      DefaultCacheBehavior: {
        TargetOriginId: Origin,
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: { Quantity: 2, Items: ['GET', 'HEAD'], CachedMethods: { Quantity: 2, Items: ['GET', 'HEAD'] } },
        ForwardedValues: { QueryString: false, Cookies: { Forward: 'none' }, Headers: { Quantity: 0 }, QueryStringCacheKeys: { Quantity: 0 } },
        MinTTL: 0, DefaultTTL: 86400, MaxTTL: 31536000,
        Compress: true, TrustedSigners: { Enabled: false, Quantity: 0 },
      },
      DefaultRootObject: 'index.html',
    },
  }));
  return {
    ok: true,
    result: { distributionId: raw.Distribution?.Id, domain: raw.Distribution?.DomainName, status: raw.Distribution?.Status },
    raw: trimResponse(raw),
    log: [mkLog('success', `Distribution ${raw.Distribution?.Id} creating. Domain: ${raw.Distribution?.DomainName}`)],
  };
}

export async function cloudfront_invalidate_cache({ creds, params }) {
  const { CloudFrontClient, CreateInvalidationCommand } = await import('@aws-sdk/client-cloudfront');
  const cf = new CloudFrontClient({ region: 'us-east-1', credentials: creds });
  const paths = (params.paths || '/*').split('\n').map((p) => p.trim()).filter(Boolean);
  const raw = await cf.send(new CreateInvalidationCommand({
    DistributionId: params.distributionId,
    InvalidationBatch: {
      CallerReference: `inv-${Date.now()}`,
      Paths: { Quantity: paths.length, Items: paths },
    },
  }));
  return {
    ok: true,
    result: { invalidationId: raw.Invalidation?.Id, status: raw.Invalidation?.Status, paths },
    raw: trimResponse(raw),
    log: [mkLog('success', `Invalidation ${raw.Invalidation?.Id} created for ${paths.length} path(s).`)],
  };
}

// ---------------- Lambda ----------------

export async function lambda_create_function({ creds, region, params }) {
  const { LambdaClient, CreateFunctionCommand } = await import('@aws-sdk/client-lambda');
  const lam = new LambdaClient({ region, credentials: creds });
  const raw = await lam.send(new CreateFunctionCommand({
    FunctionName: params.functionName,
    Runtime: params.runtime || 'nodejs20.x',
    MemorySize: params.memoryMB || 128,
    Timeout: params.timeoutSec || 3,
    Role: params.roleArn,
    Handler: params.handler || 'index.handler',
    Code: params.code, // expects { ZipFile: Uint8Array } or { S3Bucket, S3Key }
  }));
  return {
    ok: true,
    result: { name: raw.FunctionName, arn: raw.FunctionArn, state: raw.State },
    raw: trimResponse(raw),
    log: [mkLog('success', `Function ${raw.FunctionName} created. ARN: ${raw.FunctionArn}`)],
  };
}

export async function lambda_delete_function({ creds, region, params }) {
  const { LambdaClient, DeleteFunctionCommand } = await import('@aws-sdk/client-lambda');
  const lam = new LambdaClient({ region, credentials: creds });
  await lam.send(new DeleteFunctionCommand({ FunctionName: params.functionName }));
  return { ok: true, result: { functionName: params.functionName }, raw: null, log: [mkLog('warning', `Function ${params.functionName} deleted.`)] };
}

// ---------------- DynamoDB ----------------

export async function dynamodb_create_table({ creds, region, params }) {
  const { DynamoDBClient, CreateTableCommand } = await import('@aws-sdk/client-dynamodb');
  const ddb = new DynamoDBClient({ region, credentials: creds });
  const keySchema = [{ AttributeName: params.partitionKey, KeyType: 'HASH' }];
  const attrs = [{ AttributeName: params.partitionKey, AttributeType: params.partitionType || 'S' }];
  if (params.sortKey) {
    keySchema.push({ AttributeName: params.sortKey, KeyType: 'RANGE' });
    attrs.push({ AttributeName: params.sortKey, AttributeType: params.sortType || 'S' });
  }
  const raw = await ddb.send(new CreateTableCommand({
    TableName: params.tableName,
    AttributeDefinitions: attrs,
    KeySchema: keySchema,
    BillingMode: 'PAY_PER_REQUEST',
  }));
  return {
    ok: true,
    result: { tableName: raw.TableDescription?.TableName, status: raw.TableDescription?.TableStatus },
    raw: trimResponse(raw),
    log: [mkLog('success', `Table ${params.tableName} created (status: ${raw.TableDescription?.TableStatus}).`)],
  };
}

export async function dynamodb_delete_table({ creds, region, params }) {
  const { DynamoDBClient, DeleteTableCommand } = await import('@aws-sdk/client-dynamodb');
  const ddb = new DynamoDBClient({ region, credentials: creds });
  await ddb.send(new DeleteTableCommand({ TableName: params.tableName }));
  return { ok: true, result: { tableName: params.tableName }, raw: null, log: [mkLog('warning', `Table ${params.tableName} deleted.`)] };
}

// ---------------- EC2 ----------------

export async function ec2_launch_instance({ creds, region, params }) {
  const { EC2Client, RunInstancesCommand } = await import('@aws-sdk/client-ec2');
  const ec2 = new EC2Client({ region, credentials: creds });
  const raw = await ec2.send(new RunInstancesCommand({
    ImageId: params.amiId,
    InstanceType: params.instanceType || 't2.micro',
    KeyName: params.keyPairName,
    SecurityGroupIds: [params.sgId],
    MinCount: 1, MaxCount: 1,
    TagSpecifications: [{
      ResourceType: 'instance',
      Tags: [{ Key: 'Name', Value: params.name }],
    }],
  }));
  const inst = raw.Instances?.[0];
  return {
    ok: true,
    result: { instanceId: inst?.InstanceId, state: inst?.State?.Name, type: inst?.InstanceType },
    raw: trimResponse(raw),
    log: [mkLog('success', `Instance ${inst?.InstanceId} launched.`)],
  };
}

export async function ec2_terminate_instance({ creds, region, params }) {
  const { EC2Client, TerminateInstancesCommand } = await import('@aws-sdk/client-ec2');
  const ec2 = new EC2Client({ region, credentials: creds });
  const raw = await ec2.send(new TerminateInstancesCommand({ InstanceIds: [params.instanceId] }));
  return {
    ok: true,
    result: { instanceId: params.instanceId, terminating: true },
    raw: trimResponse(raw),
    log: [mkLog('warning', `Instance ${params.instanceId} termination requested.`)],
  };
}

// ---------------- IAM ----------------

export async function iam_create_role({ creds, params }) {
  const { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } = await import('@aws-sdk/client-iam');
  const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
  const trust = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: { Service: params.trustedService || 'lambda.amazonaws.com' },
      Action: 'sts:AssumeRole',
    }],
  };
  const created = await iam.send(new CreateRoleCommand({
    RoleName: params.roleName,
    AssumeRolePolicyDocument: JSON.stringify(trust),
    Description: `Created by AWS Career Launchpad Pro on ${new Date().toISOString()}`,
  }));
  const log = [mkLog('success', `Role ${params.roleName} created. ARN: ${created.Role?.Arn}`)];
  const policies = (params.managedPolicyArns || '').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const arn of policies) {
    await iam.send(new AttachRolePolicyCommand({ RoleName: params.roleName, PolicyArn: arn }));
    log.push(mkLog('success', `Attached ${arn}`));
  }
  return {
    ok: true,
    result: { roleName: params.roleName, arn: created.Role?.Arn, attached: policies },
    raw: trimResponse(created),
    log,
  };
}

export async function iam_attach_policy({ creds, params }) {
  const { IAMClient, AttachUserPolicyCommand, AttachRolePolicyCommand } = await import('@aws-sdk/client-iam');
  const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
  if (params.targetType === 'user') {
    await iam.send(new AttachUserPolicyCommand({ UserName: params.targetName, PolicyArn: params.policyArn }));
  } else {
    await iam.send(new AttachRolePolicyCommand({ RoleName: params.targetName, PolicyArn: params.policyArn }));
  }
  return {
    ok: true,
    result: { targetType: params.targetType, targetName: params.targetName, policyArn: params.policyArn },
    raw: null,
    log: [mkLog('success', `Attached ${params.policyArn} to ${params.targetType} ${params.targetName}.`)],
  };
}

// ---------------- Budgets ----------------

export async function budgets_create_budget({ creds, params }) {
  const { BudgetsClient, CreateBudgetCommand } = await import('@aws-sdk/client-budgets');
  const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
  const sts = new STSClient({ region: 'us-east-1', credentials: creds });
  const who = await sts.send(new GetCallerIdentityCommand({}));
  const b = new BudgetsClient({ region: 'us-east-1', credentials: creds });
  await b.send(new CreateBudgetCommand({
    AccountId: who.Account,
    Budget: {
      BudgetName: params.budgetName,
      BudgetLimit: { Amount: String(params.limitUsd || 5), Unit: 'USD' },
      TimeUnit: 'MONTHLY',
      BudgetType: 'COST',
    },
    NotificationsWithSubscribers: [{
      Notification: {
        NotificationType: 'ACTUAL',
        ComparisonOperator: 'GREATER_THAN',
        Threshold: params.alertPct || 80,
        ThresholdType: 'PERCENTAGE',
      },
      Subscribers: [{ SubscriptionType: 'EMAIL', Address: params.alertEmail }],
    }],
  }));
  return {
    ok: true,
    result: { budgetName: params.budgetName, limitUsd: params.limitUsd, alertPct: params.alertPct, alertEmail: params.alertEmail },
    raw: null,
    log: [mkLog('success', `Budget "${params.budgetName}" created with $${params.limitUsd} limit.`)],
  };
}

// ---------------- registry mapping (action id → executor) ----------------

export const EXECUTORS = {
  'sts.who-am-i':                   sts_who_am_i,
  's3.list-buckets':                s3_list_buckets,
  'ec2.list-instances':             ec2_list_instances,
  'lambda.list-functions':          lambda_list_functions,
  'budgets.list':                   budgets_list,

  'config.recorder-status':         config_recorder_status,
  'config.advanced-query':          config_advanced_query,
  'tagging.get-resources':          tagging_get_resources,

  's3.create-bucket':               s3_create_bucket,
  's3.upload-files':                s3_upload_files,
  's3.enable-static-website':       s3_enable_static_website,
  's3.set-public-read-policy':      s3_set_public_read_policy,
  's3.delete-bucket':               s3_delete_bucket,

  'cloudfront.create-distribution': cloudfront_create_distribution,
  'cloudfront.invalidate-cache':    cloudfront_invalidate_cache,

  'lambda.create-function':         lambda_create_function,
  'lambda.delete-function':         lambda_delete_function,

  'dynamodb.create-table':          dynamodb_create_table,
  'dynamodb.delete-table':          dynamodb_delete_table,

  'ec2.launch-instance':            ec2_launch_instance,
  'ec2.terminate-instance':         ec2_terminate_instance,

  'iam.create-role':                iam_create_role,
  'iam.attach-policy':              iam_attach_policy,

  'budgets.create-budget':          budgets_create_budget,
};

export function hasExecutor(actionId) {
  return Object.prototype.hasOwnProperty.call(EXECUTORS, actionId);
}
