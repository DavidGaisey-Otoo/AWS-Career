/**
 * DeployFromScriptModal.jsx — DP-01 UI.
 *
 * ════════════════════════════════════════════════════════════════════
 * SECURITY MODEL (read before changing anything)
 * ════════════════════════════════════════════════════════════════════
 * Credentials entered here live ONLY in component state for the
 * lifetime of the modal. They are passed once to cfnDeployer.deployStack
 * via a function call and then garbage-collected when the modal
 * unmounts. We do NOT:
 *   - persist them to localStorage / sessionStorage / IndexedDB
 *   - log them to console
 *   - render them in the DOM after the deploy starts
 *   - serialise them into the Session Log entry (only the deployment
 *     metadata is logged — never the credentials themselves)
 * ════════════════════════════════════════════════════════════════════
 *
 * Four formats handled:
 *   - cfn      → real browser deploy via CloudFormationClient
 *   - tf       → "run locally" with download bundle + step list
 *   - cli      → "run locally" with download bundle + step list
 *   - console  → "follow the click-by-click walkthrough" pointer
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Rocket, X, KeyRound, Eye, EyeOff, AlertTriangle, ShieldCheck,
  CheckCircle2, Loader2, Copy, Download, FileText, AlertCircle, Terminal,
  ExternalLink, Info, Lock,
} from 'lucide-react';
import { deployStack, validateTemplate } from '../../lib/cfnDeployer.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';
import { assessEnvironmentDeployment } from '../../lib/awsEnvironmentPolicy.js';

// AWS regions — abbreviated list, most-used first
const REGIONS = [
  'eu-west-1', 'eu-west-2', 'eu-central-1', 'eu-north-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1',
  'ca-central-1', 'sa-east-1', 'af-south-1',
];

export function DeployFromScriptModal({
  open,
  onClose,
  format,           // 'cfn' | 'tf' | 'cli' | 'console'
  script,           // raw script text
  defaultStackName, // suggested CFN stack name
  defaultRegion,    // pre-fill from AD-01 if available
  environmentProfile = 'learning',
  monthlyEstimateMax,
  monthlyCeilingUsd,
  onDeployComplete, // optional callback({ ok, ...result })
}) {
  const toast = useToast();
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [region, setRegion] = useState(defaultRegion || 'eu-west-1');
  const [stackName, setStackName] = useState(defaultStackName || `awscl-${Date.now().toString(36)}`);
  const [showSecret, setShowSecret] = useState(false);
  const [namedIamAck, setNamedIamAck] = useState(false);
  const [eligibilityAck, setEligibilityAck] = useState(false);
  const [costAck, setCostAck] = useState(false);
  const [teardownAck, setTeardownAck] = useState(false);
  const policy = useMemo(() => assessEnvironmentDeployment({
    template: script, profile: environmentProfile, monthlyEstimateMax, monthlyCeilingUsd,
  }), [script, environmentProfile, monthlyEstimateMax, monthlyCeilingUsd]);

  const [phase, setPhase] = useState('form');  // form | deploying | done
  const [events, setEvents] = useState([]);     // progress events
  const [result, setResult] = useState(null);   // final result
  const eventsEndRef = useRef(null);

  // Auto-scroll progress log as new events stream in
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  useEffect(() => {
    if (!open) {
      // Wipe creds defensively when modal closes
      setAccessKeyId('');
      setSecretAccessKey('');
      setSessionToken('');
      setShowSecret(false);
      setEligibilityAck(false);
      setCostAck(false);
      setTeardownAck(false);
      setPhase('form');
      setEvents([]);
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  // ────────── Non-CFN paths (Terraform / CLI / Console) ──────────
  if (format !== 'cfn') {
    return <RunLocallyModal format={format} script={script} onClose={onClose} />;
  }

  // ────────── CFN deploy flow ──────────
  async function handleDeploy() {
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      toast?.warning?.('Both Access Key ID and Secret Access Key are required.');
      return;
    }
    if (!stackName.trim()) {
      toast?.warning?.('Stack name is required.');
      return;
    }
    if (!policy.ok) {
      toast?.error?.('Deployment policy is blocked. Resolve the listed guardrails first.');
      return;
    }
    if (!eligibilityAck || !costAck || !teardownAck) {
      toast?.warning?.('Complete the account, cost, and teardown acknowledgements first.');
      return;
    }

    setPhase('deploying');
    setEvents([{ type: 'step', message: `Connecting to AWS in ${region}…`, ts: Date.now() }]);

    // Detect if template uses named IAM resources (auto-add capability)
    const capabilities = [];
    if (/AWS::IAM::/i.test(script)) {
      if (!namedIamAck) {
        toast?.warning?.('Template creates IAM resources — please tick the acknowledgement.');
        setPhase('form');
        return;
      }
      capabilities.push('CAPABILITY_NAMED_IAM');
    }

    // Build creds object — local-scope only, never persisted
    const credentials = {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
      ...(sessionToken.trim() ? { sessionToken: sessionToken.trim() } : {}),
    };

    try {
      const res = await deployStack({
        credentials,
        region,
        stackName: stackName.trim(),
        templateBody: script,
        capabilities,
        onProgress: (evt) => setEvents((cur) => [...cur, evt]),
      });
      setResult(res);
      setPhase('done');
      // Log to Session Log (metadata only — never creds)
      try {
        const sessionEntry = {
          ts: new Date().toISOString(),
          kind: 'deploy',
          ok: res.ok,
          stackName: res.stackName || stackName.trim(),
          stackId: res.stackId,
          region,
          finalStatus: res.finalStatus,
          outputs: res.outputs || [],
          error: res.error || null,
        };
        const existing = JSON.parse(localStorage.getItem('awscl-pro::v1::session-log') || '[]');
        existing.unshift(sessionEntry);
        localStorage.setItem('awscl-pro::v1::session-log', JSON.stringify(existing.slice(0, 200)));
      } catch (logErr) {
        console.warn('[DeployFromScriptModal] session log failed:', logErr);
      }

      onDeployComplete?.(res);
      if (res.ok) toast?.success?.(`Stack ${res.stackName} deployed`);
      else        toast?.error?.(`Stack ended in ${res.finalStatus}`);
    } catch (err) {
      setEvents((cur) => [...cur, { type: 'error', message: err.message || String(err), ts: Date.now() }]);
      setResult({ ok: false, error: err.message || String(err), finalStatus: 'UNCAUGHT' });
      setPhase('done');
    } finally {
      // Best-effort cred wipe after the call resolves. The closures inside
      // cfnDeployer also drop the SDK client via destroy() in their finally.
      credentials.accessKeyId = '';
      credentials.secretAccessKey = '';
      credentials.sessionToken = '';
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'deploying') onClose(); }}
    >
      <div className="surface rounded-2xl border border-token shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-token">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              DP-01 · Deploy to AWS
            </div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Rocket size={18} className="text-aws-orange" />
              {phase === 'form' && 'Deploy CloudFormation stack'}
              {phase === 'deploying' && 'Deploying…'}
              {phase === 'done' && (result?.ok ? '✓ Deployed' : '✗ Deploy failed')}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'deploying'}
            className="text-muted hover:text-current p-1 rounded hover:bg-[var(--card-2)] disabled:opacity-30"
            title={phase === 'deploying' ? 'Wait for deploy to finish' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        {phase === 'form' && (
          <div className="p-5 space-y-4">
            {/* Big security notice */}
            <div className="rounded-xl border border-success/40 bg-success/5 p-3 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-success mt-0.5 flex-shrink-0" />
              <div className="text-[12px] leading-relaxed">
                <strong className="text-success">Your credentials are used only for this deployment and are never stored or logged.</strong>{' '}
                They live in browser memory for the lifetime of this modal, are passed once to the AWS SDK over HTTPS,
                then garbage-collected when the modal closes. The Session Log records the deploy metadata (stack name,
                region, outcome) — never the keys.
              </div>
            </div>

            <div className={cn('rounded-xl border p-3 space-y-2', policy.ok ? 'border-warning/40 bg-warning/5' : 'border-danger/50 bg-danger/5')}>
              <div className="font-extrabold text-[12px]">{policy.ok ? `${policy.profile.id} policy preflight passed` : 'Deployment policy blocked'}</div>
              {policy.blockers.map((item) => <div key={item} className="text-[11px] text-danger">• {item}</div>)}
              {policy.warnings.map((item) => <div key={item} className="text-[11px] text-warning">• {item}</div>)}
              {policy.profile.leaseHours && <div className="text-[11px] opacity-80">Training lease: EC2 stop target {policy.profile.leaseHours}h. Cleanup target: {policy.profile.autoTerminateHours}h. Stopping is not deletion.</div>}
            </div>

            {/* Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="AWS Access Key ID" required>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={accessKeyId}
                  onChange={(e) => setAccessKeyId(e.target.value)}
                  placeholder="AKIA..."
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12.5px] font-mono outline-none focus:border-aws-orange"
                />
              </Field>
              <Field label="AWS Secret Access Key" required>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck="false"
                    value={secretAccessKey}
                    onChange={(e) => setSecretAccessKey(e.target.value)}
                    placeholder="40-char secret"
                    className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 pr-9 text-[12.5px] font-mono outline-none focus:border-aws-orange"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret((s) => !s)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[var(--card-2)] opacity-60 hover:opacity-100 transition"
                  >
                    {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </Field>
            </div>
            <Field label="AWS Session Token (required for temporary credentials)">
              <input type="password" autoComplete="off" spellCheck="false" value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)} placeholder="Optional for long-lived keys; required for STS credentials"
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12px] font-mono outline-none focus:border-aws-orange" />
            </Field>

            <div className="space-y-2 rounded-xl border border-token p-3 text-[11.5px]">
              <Ack checked={eligibilityAck} onChange={setEligibilityAck}>I checked this account's plan, credits, Free Tier usage, and current region eligibility.</Ack>
              <Ack checked={costAck} onChange={setCostAck}>I accept that the estimate and $2 target are not hard caps; delayed AWS billing can exceed an alert/action threshold.</Ack>
              <Ack checked={teardownAck} onChange={setTeardownAck}>I will verify CloudFormation, EC2, EBS/snapshots, public IPs, Backup recovery points, logs, IAM, and Billing after teardown.</Ack>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Region (pre-filled from AD-01 if set)">
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12.5px] font-bold outline-none focus:border-aws-orange cursor-pointer"
                >
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Stack name" required>
                <input
                  type="text"
                  value={stackName}
                  onChange={(e) => setStackName(e.target.value.replace(/[^a-zA-Z0-9-]/g, '-'))}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12.5px] font-mono outline-none focus:border-aws-orange"
                />
              </Field>
            </div>

            {/* IAM warning */}
            {/AWS::IAM::/i.test(script) && (
              <label className="flex items-start gap-2 cursor-pointer rounded-xl border border-warning/40 bg-warning/5 p-3">
                <input
                  type="checkbox"
                  checked={namedIamAck}
                  onChange={(e) => setNamedIamAck(e.target.checked)}
                  className="mt-0.5 accent-aws-orange"
                />
                <div className="text-[12px] leading-relaxed">
                  <strong className="text-warning flex items-center gap-1">
                    <AlertTriangle size={12} /> Template creates IAM resources
                  </strong>
                  <span className="opacity-90 mt-0.5 block">
                    This stack will create or modify IAM roles/policies/users. I understand the security
                    implications and authorise CAPABILITY_NAMED_IAM.
                  </span>
                </div>
              </label>
            )}

            {/* Template preview (collapsed) */}
            <details className="rounded-xl border border-token bg-[var(--card-2)] p-3">
              <summary className="cursor-pointer text-[11.5px] font-bold opacity-75">
                Preview template ({Math.ceil(script.length / 1024)} KB)
              </summary>
              <pre className="mt-2 text-[10.5px] font-mono max-h-48 overflow-auto whitespace-pre-wrap">{script}</pre>
            </details>

            {/* Deploy button */}
            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={handleDeploy}
                disabled={!accessKeyId || !secretAccessKey || !stackName || !policy.ok || !eligibilityAck || !costAck || !teardownAck || (/AWS::IAM::/i.test(script) && !namedIamAck)}
                className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Rocket size={14} /> Deploy to AWS
              </button>
              <button onClick={onClose} className="btn btn-ghost">Cancel</button>
              <a
                href="https://console.aws.amazon.com/iam/home#/security_credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[11.5px] font-bold opacity-65 hover:opacity-100 ml-auto"
                title="Open the AWS IAM console to create an access key"
              >
                <KeyRound size={11} /> Where do I get keys? <ExternalLink size={10} />
              </a>
            </div>
          </div>
        )}

        {(phase === 'deploying' || phase === 'done') && (
          <div className="p-5 space-y-3">
            {/* Status header */}
            <div className={cn(
              'rounded-xl border p-3 flex items-start gap-2.5',
              phase === 'deploying' && 'border-aws-orange/40 bg-aws-orange/5',
              phase === 'done' && result?.ok && 'border-success/40 bg-success/5',
              phase === 'done' && !result?.ok && 'border-danger/40 bg-danger/5',
            )}>
              {phase === 'deploying' && <Loader2 size={16} className="text-aws-orange animate-spin mt-0.5 flex-shrink-0" />}
              {phase === 'done' && result?.ok && <CheckCircle2 size={16} className="text-success mt-0.5 flex-shrink-0" />}
              {phase === 'done' && !result?.ok && <AlertCircle size={16} className="text-danger mt-0.5 flex-shrink-0" />}
              <div className="text-[12.5px]">
                <div className="font-bold">
                  {phase === 'deploying' && `Stack ${stackName} · ${region}`}
                  {phase === 'done' && result?.ok && `Stack ${result.stackName} deployed successfully`}
                  {phase === 'done' && !result?.ok && `Deploy failed: ${result.finalStatus}`}
                </div>
                {phase === 'done' && !result?.ok && result.error && (
                  <div className="opacity-85 mt-0.5">{result.error}</div>
                )}
              </div>
            </div>

            {/* Outputs */}
            {phase === 'done' && result?.ok && result.outputs?.length > 0 && (
              <div className="rounded-xl bg-[var(--card-2)] border border-token p-3 space-y-1.5">
                <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-success mb-1">
                  Stack outputs
                </div>
                {result.outputs.map((o) => (
                  <div key={o.key} className="text-[12px] flex items-start gap-2">
                    <strong className="text-aws-orange min-w-[120px]">{o.key}:</strong>
                    <code className="bg-ink-900/40 px-2 py-0.5 rounded text-[11px] font-mono break-all flex-1">{o.value}</code>
                  </div>
                ))}
              </div>
            )}

            {/* Stack ARN */}
            {phase === 'done' && result?.stackId && (
              <div className="text-[10.5px] opacity-65 flex items-center gap-1 flex-wrap">
                <span>Stack ARN:</span>
                <code className="bg-[var(--card-2)] px-1.5 py-0.5 rounded font-mono break-all">{result.stackId}</code>
              </div>
            )}

            {/* Progress log */}
            <div className="rounded-xl bg-ink-900/40 border border-token p-3 max-h-[40vh] overflow-y-auto">
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-70 mb-2">
                Progress log ({events.length})
              </div>
              <div className="space-y-1 font-mono text-[11px]">
                {events.map((e, i) => <EventLine key={i} event={e} />)}
                <div ref={eventsEndRef} />
              </div>
            </div>

            {/* Done buttons */}
            {phase === 'done' && (
              <div className="flex flex-wrap gap-2">
                <button onClick={onClose} className="btn btn-primary">Close</button>
                <a
                  href={`https://console.aws.amazon.com/cloudformation/home?region=${region}#/stacks?filteringStatus=active&filteringText=${encodeURIComponent(stackName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost inline-flex items-center gap-1.5"
                >
                  Open in CloudFormation Console <ExternalLink size={11} />
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════
function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1 mb-1">
        {label}{required && <span className="opacity-60">*</span>}
      </span>
      {children}
    </label>
  );
}

function Ack({ checked, onChange, children }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer leading-relaxed">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 accent-[var(--aws-orange)]" />
      <span>{children}</span>
    </label>
  );
}

function EventLine({ event }) {
  const toneClass = {
    step:    'text-aws-orange',
    event:   'opacity-90',
    status:  'text-sky-400 font-bold',
    success: 'text-success font-bold',
    failure: 'text-danger font-bold',
    error:   'text-danger',
    warn:    'text-warning',
  }[event.type] || 'opacity-90';

  if (event.type === 'event') {
    return (
      <div className={cn('flex items-start gap-2', toneClass)}>
        <span className="opacity-50 w-12 flex-shrink-0">{fmtTime(event.timestamp || event.ts)}</span>
        <span className={cn('px-1.5 py-0 rounded text-[9px] font-bold flex-shrink-0',
          /COMPLETE$/.test(event.status) ? 'bg-success/20 text-success' :
          /FAILED|ROLLBACK/.test(event.status) ? 'bg-danger/20 text-danger' :
          'bg-aws-orange/20 text-aws-orange'
        )}>{event.status}</span>
        <span className="opacity-75 truncate">{event.logicalId} ({event.resourceType})</span>
        {event.reason && <span className="opacity-60 text-[10px] truncate">— {event.reason}</span>}
      </div>
    );
  }
  return (
    <div className={cn('flex items-start gap-2', toneClass)}>
      <span className="opacity-50 w-12 flex-shrink-0">{fmtTime(event.ts)}</span>
      <span>{event.message}</span>
    </div>
  );
}

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

// ════════════════════════════════════════════════════════════════════
// Run-locally modal — for Terraform / CLI / Console (cannot run in browser)
// ════════════════════════════════════════════════════════════════════
function RunLocallyModal({ format, script, onClose }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const formatInfo = {
    tf:      { label: 'Terraform', ext: 'tf',  runCmd: 'terraform init && terraform plan && terraform apply' },
    cli:     { label: 'AWS CLI',   ext: 'sh',  runCmd: 'bash deploy.sh' },
    console: { label: 'AWS Console', ext: 'md', runCmd: null },
  }[format] || { label: format, ext: 'txt', runCmd: null };

  function handleCopy() {
    navigator.clipboard?.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast?.success?.('Copied to clipboard');
  }

  function handleDownload() {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deploy.${formatInfo.ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success?.('Downloaded');
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl border border-token shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-token">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              DP-01 · {formatInfo.label}
            </div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Terminal size={18} className="text-aws-orange" />
              Run {formatInfo.label} locally
            </h2>
          </div>
          <button onClick={onClose} className="text-muted hover:text-current p-1 rounded hover:bg-[var(--card-2)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-xl border border-aws-orange/40 bg-aws-orange/5 p-3 flex items-start gap-2">
            <Info size={14} className="text-aws-orange mt-0.5 flex-shrink-0" />
            <div className="text-[12.5px] leading-relaxed">
              <strong>Browser can't execute {formatInfo.label} directly</strong> — Terraform and
              shell scripts need a local runtime. Download the file or copy the contents, then
              run it from your terminal where the AWS CLI is configured (<code className="bg-ink-900/40 px-1 rounded">aws configure</code>).
            </div>
          </div>

          {formatInfo.runCmd && (
            <div className="rounded-xl bg-[var(--card-2)] border border-token p-3">
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                Run with
              </div>
              <code className="block bg-ink-900/40 px-3 py-2 rounded text-[12px] font-mono">
                {formatInfo.runCmd}
              </code>
            </div>
          )}

          {format === 'console' && (
            <div className="rounded-xl bg-[var(--card-2)] border border-token p-3 text-[12.5px] leading-relaxed">
              <strong>This is a Console walkthrough</strong> — open the AWS Management Console and follow each step manually.
              The script is a markdown checklist you can keep open in a side window.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
              {copied ? <><CheckCircle2 size={12} className="text-success" /> Copied</> : <><Copy size={12} /> Copy script</>}
            </button>
            <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-gradient-aws text-ink-950 hover:brightness-110 transition">
              <Download size={12} /> Download deploy.{formatInfo.ext}
            </button>
          </div>

          <details className="rounded-xl border border-token bg-[var(--card-2)] p-3">
            <summary className="cursor-pointer text-[11.5px] font-bold opacity-75">
              Preview script ({Math.ceil(script.length / 1024)} KB)
            </summary>
            <pre className="mt-2 text-[10.5px] font-mono max-h-72 overflow-auto whitespace-pre-wrap">{script}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
