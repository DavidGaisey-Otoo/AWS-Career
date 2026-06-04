/**
 * cfnDeployer.js — DP-01 browser CloudFormation deployer.
 *
 * ════════════════════════════════════════════════════════════════════
 * SECURITY MODEL — read this before touching anything in this file
 * ════════════════════════════════════════════════════════════════════
 *
 * 1. Credentials are passed in by the caller as an in-memory object.
 *    They are NEVER:
 *      - logged to console (no console.log("creds", ...))
 *      - written to localStorage / sessionStorage / IndexedDB
 *      - transmitted anywhere except directly to AWS over HTTPS
 *      - retained after the deploy promise resolves/rejects
 *
 * 2. The caller (DeployFromScriptModal) is responsible for either:
 *      - prompting the user fresh each session (preferred) OR
 *      - opting in to the existing cryptoVault.js (password-encrypted)
 *
 * 3. Errors returned from this module DO NOT contain credentials.
 *    AWS SDK errors can sometimes echo request signatures — we strip
 *    those defensively in stripCreds().
 *
 * 4. If you find yourself wanting to add logging here for debugging:
 *    DO NOT. Wire the diagnostic into the UI instead, never into a log
 *    that could be captured by an extension or shared in a screenshot.
 * ════════════════════════════════════════════════════════════════════
 */

import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
  DescribeStackEventsCommand,
  DeleteStackCommand,
  ValidateTemplateCommand,
} from '@aws-sdk/client-cloudformation';

const POLL_INTERVAL_MS = 4_000;
const POLL_TIMEOUT_MS = 30 * 60 * 1000;  // CFN stacks can take a while

const TERMINAL_STATES = new Set([
  'CREATE_COMPLETE', 'CREATE_FAILED',
  'UPDATE_COMPLETE', 'UPDATE_FAILED', 'UPDATE_ROLLBACK_COMPLETE', 'UPDATE_ROLLBACK_FAILED',
  'ROLLBACK_COMPLETE', 'ROLLBACK_FAILED',
  'DELETE_COMPLETE', 'DELETE_FAILED',
]);

const SUCCESS_STATES = new Set([
  'CREATE_COMPLETE', 'UPDATE_COMPLETE', 'DELETE_COMPLETE',
]);

// ════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════

/**
 * Validate a template without deploying. Fastest way to catch errors.
 *
 * @param {Object} opts
 * @param {Object} opts.credentials — { accessKeyId, secretAccessKey, sessionToken? }
 * @param {string} opts.region
 * @param {string} opts.templateBody — raw YAML or JSON
 */
export async function validateTemplate({ credentials, region, templateBody }) {
  const client = mkClient(credentials, region);
  try {
    const res = await client.send(new ValidateTemplateCommand({ TemplateBody: templateBody }));
    return {
      ok: true,
      description: res.Description,
      parameters: res.Parameters || [],
      capabilities: res.Capabilities || [],
    };
  } catch (err) {
    return { ok: false, error: humanizeError(err) };
  } finally {
    client.destroy?.();
  }
}

/**
 * Deploy (create or update) a stack. Yields progress events to the
 * `onProgress(evt)` callback so the UI can render live status.
 *
 * @returns {{ ok, stackId, outputs[], events[], finalStatus, error? }}
 */
export async function deployStack({ credentials, region, stackName, templateBody, parameters = [], capabilities = [], onProgress }) {
  const client = mkClient(credentials, region);
  const emit = (type, payload) => { try { onProgress?.({ type, ts: Date.now(), ...payload }); } catch {} };

  try {
    emit('step', { message: `Validating template…` });
    const v = await validateTemplate({ credentials, region, templateBody });
    if (!v.ok) {
      emit('error', { message: `Template invalid: ${v.error}` });
      return { ok: false, error: v.error, finalStatus: 'VALIDATION_FAILED' };
    }

    // Check if stack already exists → update vs create
    const existing = await stackExists(client, stackName);
    const action = existing ? 'update' : 'create';
    emit('step', { message: existing ? `Stack exists — UPDATING ${stackName}…` : `Creating new stack ${stackName}…` });

    let stackId;
    try {
      if (action === 'create') {
        const res = await client.send(new CreateStackCommand({
          StackName: stackName,
          TemplateBody: templateBody,
          Parameters: parameters,
          Capabilities: capabilities,
          OnFailure: 'ROLLBACK',
        }));
        stackId = res.StackId;
      } else {
        const res = await client.send(new UpdateStackCommand({
          StackName: stackName,
          TemplateBody: templateBody,
          Parameters: parameters,
          Capabilities: capabilities,
        }));
        stackId = res.StackId;
      }
    } catch (err) {
      const msg = humanizeError(err);
      // "No updates are to be performed" is not actually an error — it's a no-op success
      if (/no updates are to be performed/i.test(msg)) {
        emit('step', { message: 'No changes to deploy — stack is already up to date.' });
        return await snapshotStack(client, stackName);
      }
      emit('error', { message: msg });
      return { ok: false, error: msg, finalStatus: action.toUpperCase() + '_FAILED' };
    }

    emit('step', { message: `${action === 'create' ? 'Stack creation' : 'Stack update'} initiated. Polling for resource events…` });

    // Poll for events + status
    const seenEvents = new Set();
    const startTs = Date.now();
    let lastStatus = null;

    while (true) {
      if (Date.now() - startTs > POLL_TIMEOUT_MS) {
        emit('error', { message: 'Polling timed out after 30 min — check the AWS Console for stack status.' });
        return { ok: false, error: 'Polling timeout', finalStatus: 'TIMEOUT' };
      }

      try {
        const eventsRes = await client.send(new DescribeStackEventsCommand({ StackName: stackName }));
        // Events come newest first — reverse to play in chronological order
        const events = (eventsRes.StackEvents || []).slice().reverse();
        for (const ev of events) {
          if (seenEvents.has(ev.EventId)) continue;
          seenEvents.add(ev.EventId);
          emit('event', {
            timestamp: ev.Timestamp,
            resourceType: ev.ResourceType,
            logicalId: ev.LogicalResourceId,
            status: ev.ResourceStatus,
            reason: ev.ResourceStatusReason,
          });
        }
      } catch (err) {
        // Polling events sometimes blips — keep going unless it's clearly fatal
        emit('warn', { message: `Event poll glitch: ${humanizeError(err)}` });
      }

      try {
        const statusRes = await client.send(new DescribeStacksCommand({ StackName: stackName }));
        const stack = statusRes.Stacks?.[0];
        if (stack && stack.StackStatus !== lastStatus) {
          lastStatus = stack.StackStatus;
          emit('status', { status: lastStatus });
          if (TERMINAL_STATES.has(lastStatus)) {
            const ok = SUCCESS_STATES.has(lastStatus);
            const outputs = (stack.Outputs || []).map((o) => ({
              key: o.OutputKey,
              value: o.OutputValue,
              description: o.Description,
            }));
            emit(ok ? 'success' : 'failure', { finalStatus: lastStatus, outputs });
            return {
              ok,
              stackId: stack.StackId,
              stackName: stack.StackName,
              outputs,
              finalStatus: lastStatus,
              error: ok ? null : `Stack ended in ${lastStatus}. See events for details.`,
            };
          }
        }
      } catch (err) {
        const msg = humanizeError(err);
        if (/does not exist/i.test(msg)) {
          emit('error', { message: 'Stack was deleted during the deploy.' });
          return { ok: false, error: msg, finalStatus: 'GONE' };
        }
      }

      await sleep(POLL_INTERVAL_MS);
    }
  } finally {
    client.destroy?.();
  }
}

/**
 * Tear down a stack (destructive). The UI must triple-confirm before
 * calling this.
 */
export async function deleteStack({ credentials, region, stackName, onProgress }) {
  const client = mkClient(credentials, region);
  const emit = (type, payload) => { try { onProgress?.({ type, ts: Date.now(), ...payload }); } catch {} };
  try {
    emit('step', { message: `Issuing DeleteStack for ${stackName}…` });
    await client.send(new DeleteStackCommand({ StackName: stackName }));
    emit('step', { message: 'Delete initiated. Polling…' });

    while (true) {
      try {
        const res = await client.send(new DescribeStacksCommand({ StackName: stackName }));
        const s = res.Stacks?.[0];
        if (s) emit('status', { status: s.StackStatus });
      } catch (err) {
        if (/does not exist/i.test(humanizeError(err))) {
          emit('success', { finalStatus: 'DELETE_COMPLETE' });
          return { ok: true, finalStatus: 'DELETE_COMPLETE' };
        }
      }
      await sleep(POLL_INTERVAL_MS);
    }
  } finally {
    client.destroy?.();
  }
}

// ════════════════════════════════════════════════════════════════════
// Internal helpers
// ════════════════════════════════════════════════════════════════════

function mkClient(credentials, region) {
  if (!credentials?.accessKeyId || !credentials?.secretAccessKey) {
    throw new Error('Missing AWS credentials (accessKeyId + secretAccessKey required).');
  }
  if (!region) throw new Error('Missing AWS region.');
  // Pass creds directly to the SDK — they live only in this client's
  // closure and are discarded when destroy() is called in `finally`.
  return new CloudFormationClient({
    region,
    credentials: {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
      ...(credentials.sessionToken ? { sessionToken: credentials.sessionToken } : {}),
    },
  });
}

async function stackExists(client, stackName) {
  try {
    const res = await client.send(new DescribeStacksCommand({ StackName: stackName }));
    return !!res.Stacks?.length;
  } catch (err) {
    if (/does not exist/i.test(err?.message || '')) return false;
    throw err;
  }
}

async function snapshotStack(client, stackName) {
  const res = await client.send(new DescribeStacksCommand({ StackName: stackName }));
  const s = res.Stacks?.[0];
  if (!s) return { ok: false, error: 'Stack not found after no-op update', finalStatus: 'GONE' };
  return {
    ok: true,
    stackId: s.StackId,
    stackName: s.StackName,
    outputs: (s.Outputs || []).map((o) => ({ key: o.OutputKey, value: o.OutputValue, description: o.Description })),
    finalStatus: s.StackStatus,
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Turn the SDK error into a plain, actionable string for the UI.
 * SECURITY: also strips anything that smells like a credential or
 * request signature from the message before returning.
 */
function humanizeError(err) {
  if (!err) return 'Unknown error';
  let msg = err.message || String(err);

  // Strip auth headers / signatures if they ever appear (defensive)
  msg = stripCreds(msg);

  // AWS error code → friendlier message
  const code = err.name || err.Code || err.code;
  if (code === 'InvalidClientTokenId' || code === 'UnrecognizedClientException') {
    return 'Access Key ID is invalid or unknown. Double-check the value (case-sensitive).';
  }
  if (code === 'SignatureDoesNotMatch') {
    return 'Secret Access Key does not match the Access Key ID. Re-copy from the AWS Console.';
  }
  if (code === 'ExpiredToken' || code === 'ExpiredTokenException') {
    return 'Your session token expired. If using temporary credentials, generate a new pair.';
  }
  if (code === 'AccessDenied' || code === 'AccessDeniedException') {
    return `Access denied. The IAM principal needs CloudFormation + the resource permissions referenced in the template. Original: ${msg}`;
  }
  if (code === 'ValidationError') {
    return `Template validation failed: ${msg}`;
  }
  if (code === 'AlreadyExistsException') {
    return `A stack with this name already exists. Pick a different name or update the existing one.`;
  }
  if (code === 'InsufficientCapabilitiesException') {
    return `Template requires elevated capabilities (likely CAPABILITY_NAMED_IAM). Re-deploy with that capability enabled.`;
  }
  return msg;
}

/** Defensive — strip anything that looks like a credential value */
function stripCreds(text) {
  return String(text || '')
    // AKIA / ASIA access keys
    .replace(/\b(AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED-ACCESS-KEY]')
    // 40-char secret keys
    .replace(/[A-Za-z0-9/+=]{40}/g, (m) => m.length === 40 ? '[REDACTED-SECRET]' : m)
    // Authorization headers
    .replace(/Authorization:\s*\S+/gi, 'Authorization: [REDACTED]');
}
