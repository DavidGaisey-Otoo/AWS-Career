/**
 * DeployApprovalDialog.jsx — the human-in-the-loop checkpoint.
 *
 * Rendered globally (mounted once in App.jsx). Becomes visible whenever
 * `useDeploy().pending` is set. Walks the user through a four-stage flow:
 *
 *   1. PREVIEW   — "Here is exactly what I'm about to do."
 *   2. PASSWORD  — Deploy password + (for DESTROY/ADMIN) extra confirm string
 *   3. EXECUTE   — Calls the executor, streams log lines as they arrive
 *   4. RESULT    — Pass/fail summary + direct console URL + audit entry id
 *
 * NEVER:
 *   - Caches the password
 *   - Skips a step
 *   - Lets the user bypass an extra confirm
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, Eye, EyeOff, ExternalLink, ClipboardCopy,
  CheckCircle2, XCircle, Lock, ArrowRight, BookOpen, Clock, DollarSign,
} from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useDeploy } from '../../context/DeployContext.jsx';
import { TIERS } from '../../data/awsActions.js';

const TIER_STYLES = {
  BUILD:   { ring: 'ring-amber-400/40',    badge: 'bg-amber-500/15 text-amber-300',   icon: ShieldCheck },
  DESTROY: { ring: 'ring-orange-500/40',   badge: 'bg-orange-500/15 text-orange-300', icon: ShieldAlert },
  ADMIN:   { ring: 'ring-rose-500/40',     badge: 'bg-rose-500/15 text-rose-300',     icon: ShieldAlert },
};

export function DeployApprovalDialog() {
  const { pending, executePending, cancelPending, lastResult, clearLastResult } = useDeploy();

  // If pending → show the gate. Else if lastResult → show the result.
  // Both modals coexist (different `open` flags) so they don't fight for z-index.
  return (
    <>
      <PendingGate pending={pending} onExecute={executePending} onCancel={cancelPending} />
      <ResultModal result={lastResult} onClose={clearLastResult} />
    </>
  );
}

// ---------------- PENDING GATE ----------------

function PendingGate({ pending, onExecute, onCancel }) {
  const [stage, setStage] = useState('preview'); // preview | confirm | running
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [extraConfirm, setExtraConfirm] = useState('');
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  // Reset stage every time a new action arrives
  useEffect(() => {
    if (pending) {
      setStage('preview');
      setPassword('');
      setExtraConfirm('');
      setError(null);
      setRunning(false);
    }
  }, [pending?.actionId, pending?.requestedAt]);

  if (!pending) return null;

  const { action, params } = pending;
  const tierMeta = TIERS[action.tier];
  const tierStyle = TIER_STYLES[action.tier] || TIER_STYLES.BUILD;
  const TierIcon = tierStyle.icon;
  const expectedConfirm = tierMeta.requiresExtraConfirm === 'resource-name'
    ? findResourceName(params)
    : tierMeta.requiresExtraConfirm;

  async function handleExecute() {
    setError(null);
    setRunning(true);
    try {
      await onExecute({ password, extraConfirm });
      // ResultModal will open via lastResult — close this one
    } catch (err) {
      setError(err.message || String(err));
      setRunning(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={() => !running && onCancel()}
      dismissable={!running}
      title={null}
      size="lg"
    >
      {/* Header */}
      <div className={`-mx-6 -mt-1 px-6 pb-4 pt-5 border-b border-token ring-1 ${tierStyle.ring} bg-gradient-to-br from-[var(--card-2)]/30 to-transparent`}>
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-2xl ${tierStyle.badge}`}>
            <TierIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${tierStyle.badge}`}>
                {tierMeta.icon} {tierMeta.label} TIER
              </span>
              <span className="text-[10px] opacity-60 font-mono">{action.service}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">{action.summary}</h2>
            <p className="text-xs opacity-70 mt-1">
              Action ID: <span className="font-mono">{action.id || pending.actionId}</span>
            </p>
          </div>
        </div>

        {/* Stepper */}
        <div className="mt-4 flex items-center gap-2 text-[11px] uppercase tracking-widest">
          {['preview', 'confirm', 'running'].map((s, i) => {
            const active = stage === s;
            const done = ['preview', 'confirm', 'running'].indexOf(stage) > i;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold ${
                  active ? 'bg-[var(--brand)] text-black' : done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[var(--card-2)] opacity-50'
                }`}>{i + 1}</div>
                <span className={active ? 'font-bold' : 'opacity-50'}>{s === 'preview' ? 'Preview' : s === 'confirm' ? 'Confirm' : 'Execute'}</span>
                {i < 2 && <ArrowRight size={12} className="opacity-30" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Body — stage-aware */}
      <div className="pt-5">
        {stage === 'preview' && (
          <PreviewStage action={action} params={params} onNext={() => setStage('confirm')} onCancel={onCancel} />
        )}
        {stage === 'confirm' && (
          <ConfirmStage
            action={action} params={params} tierMeta={tierMeta} expectedConfirm={expectedConfirm}
            password={password} setPassword={setPassword}
            showPassword={showPassword} setShowPassword={setShowPassword}
            extraConfirm={extraConfirm} setExtraConfirm={setExtraConfirm}
            error={error}
            onBack={() => setStage('preview')}
            onSubmit={() => { setStage('running'); handleExecute(); }}
            running={running}
          />
        )}
        {stage === 'running' && (
          <RunningStage actionSummary={action.summary} error={error} onCancel={onCancel} />
        )}
      </div>
    </Modal>
  );
}

// ---------------- STAGE 1: PREVIEW ----------------

function PreviewStage({ action, params, onNext, onCancel }) {
  const consoleUrl = action.consoleUrl?.(params);

  return (
    <div className="space-y-5">
      {/* Plain-English summary */}
      <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4">
        <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">What this does</div>
        <p className="text-sm">{action.summary}</p>
      </div>

      {/* Parameters table */}
      <div className="rounded-2xl border border-token overflow-hidden">
        <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest font-bold opacity-60">
          Parameters
        </div>
        <div className="divide-y divide-[var(--border)]">
          {Object.entries(params || {}).length === 0 && (
            <div className="px-4 py-3 text-xs opacity-50">No parameters.</div>
          )}
          {Object.entries(params || {}).map(([k, v]) => (
            <div key={k} className="px-4 py-2 flex items-start gap-3">
              <span className="text-xs font-mono opacity-60 w-32 shrink-0">{k}</span>
              <span className="text-xs font-mono break-all">
                {typeof v === 'boolean' ? (v ? 'true' : 'false') : Array.isArray(v) ? `[${v.length} item${v.length === 1 ? '' : 's'}]` : typeof v === 'object' && v ? JSON.stringify(v).slice(0, 80) + '...' : String(v ?? '')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost + reversibility */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard icon={DollarSign} label="Typical cost" value={action.cost?.typical === 0 ? 'Free' : `$${action.cost?.typical}/month`} />
        <InfoCard icon={DollarSign} label="Max cost" value={action.cost?.max === 0 ? 'Free' : `$${action.cost?.max}/month`} tone={action.cost?.max > 1 ? 'warn' : 'ok'} />
        <InfoCard icon={ShieldCheck} label="Reversible?" value={action.reversible ? 'Yes' : 'NO — permanent'} tone={action.reversible ? 'ok' : 'warn'} />
      </div>

      {/* Free-tier hint */}
      {action.cost?.free && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-200">
          🎁 Free tier: {typeof action.cost.free === 'string' ? action.cost.free : `${action.cost.free} included free`}
        </div>
      )}

      {/* Warning */}
      {action.warning && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200 flex gap-2 items-start">
          <ShieldAlert size={14} className="shrink-0 mt-0.5" />
          <span>{action.warning}</span>
        </div>
      )}

      {/* Console URL + docs */}
      <div className="flex flex-wrap gap-2">
        {consoleUrl && (
          <a href={consoleUrl} target="_blank" rel="noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] flex items-center gap-2">
            <ExternalLink size={12} /> Open in AWS Console
          </a>
        )}
        {action.docsUrl && (
          <a href={action.docsUrl} target="_blank" rel="noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] flex items-center gap-2">
            <BookOpen size={12} /> AWS Docs
          </a>
        )}
      </div>

      {/* CTA */}
      <div className="flex justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={onNext} iconRight={ArrowRight}>I've reviewed — proceed</Button>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, tone = 'ok' }) {
  const tones = { ok: 'text-emerald-300', warn: 'text-amber-300' };
  return (
    <div className="rounded-xl border border-token bg-[var(--card)] p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-60">
        <Icon size={12} />
        {label}
      </div>
      <div className={`text-sm font-bold mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
}

// ---------------- STAGE 2: CONFIRM (password + extra) ----------------

function ConfirmStage({
  action, params, tierMeta, expectedConfirm,
  password, setPassword, showPassword, setShowPassword,
  extraConfirm, setExtraConfirm, error,
  onBack, onSubmit, running,
}) {
  const passwordValid = (password || '').length >= 8;
  const extraValid = !tierMeta.requiresExtraConfirm || extraConfirm === expectedConfirm;
  const ready = passwordValid && extraValid;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4 text-sm">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Lock size={14} /> Final approval required
        </div>
        <p className="text-xs opacity-70">
          Type your deploy password{tierMeta.requiresExtraConfirm ? ' AND the confirmation phrase below' : ''} to execute this action. Your password is used once and forgotten immediately.
        </p>
      </div>

      {/* Deploy password */}
      <div>
        <label className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1.5 block">
          Deploy password
        </label>
        <div className="relative">
          <input
            autoFocus
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your deploy password"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--card)] border border-token focus:border-[var(--brand)] focus:outline-none text-sm pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-[var(--card-2)] opacity-60"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Extra confirmation */}
      {tierMeta.requiresExtraConfirm && (
        <div>
          <label className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1.5 block">
            Type to confirm
          </label>
          <p className="text-xs opacity-70 mb-1.5">
            To prove you mean it, type exactly: <span className="font-mono px-1.5 py-0.5 rounded bg-[var(--card-2)] font-bold">{expectedConfirm}</span>
          </p>
          <input
            type="text"
            value={extraConfirm}
            onChange={(e) => setExtraConfirm(e.target.value)}
            placeholder={expectedConfirm}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--card)] border border-token focus:border-[var(--brand)] focus:outline-none text-sm font-mono"
          />
        </div>
      )}

      {/* Cooldown notice */}
      {tierMeta.cooldownMs > 0 && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
          <Clock size={12} />
          Cooldown: {Math.round(tierMeta.cooldownMs / 1000)}s before another {tierMeta.label} action.
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-200 flex items-start gap-2">
          <XCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-between gap-3 pt-2">
        <Button variant="ghost" onClick={onBack} disabled={running}>← Back</Button>
        <Button variant="danger" onClick={onSubmit} disabled={!ready || running}>
          {running ? 'Executing…' : 'Execute now'}
        </Button>
      </div>
    </div>
  );
}

// ---------------- STAGE 3: RUNNING ----------------

function RunningStage({ actionSummary, error, onCancel }) {
  return (
    <div className="py-6 text-center">
      {error ? (
        <>
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-500/15 flex items-center justify-center mb-3">
            <XCircle size={28} className="text-rose-300" />
          </div>
          <h3 className="text-lg font-bold">Execution failed</h3>
          <p className="text-xs opacity-70 mt-1 max-w-md mx-auto">{error}</p>
          <Button variant="ghost" onClick={onCancel} className="mt-4">Close</Button>
        </>
      ) : (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, ease: 'linear', repeat: Infinity }}
            className="mx-auto w-14 h-14 rounded-full border-4 border-[var(--card-2)] border-t-[var(--brand)] mb-3"
          />
          <h3 className="text-lg font-bold">Executing…</h3>
          <p className="text-xs opacity-70 mt-1">{actionSummary}</p>
        </>
      )}
    </div>
  );
}

// ---------------- RESULT MODAL ----------------

function ResultModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!result) return null;

  const ok = result.ok !== false;

  return (
    <Modal open={true} onClose={onClose} size="lg" title={null}>
      <div className="-mx-6 -mt-1 px-6 pb-4 pt-5 border-b border-token">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-2xl ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
            {ok ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
          </div>
          <div>
            <h2 className="text-xl font-bold">{ok ? 'Action completed' : 'Action failed'}</h2>
            <p className="text-xs opacity-70 mt-1 font-mono">{result.actionId}</p>
          </div>
        </div>
      </div>

      <div className="pt-5 space-y-4">
        {result.error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-200">
            {result.error}
          </div>
        )}

        {result.result && (
          <div className="rounded-2xl border border-token overflow-hidden">
            <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest font-bold opacity-60 flex items-center justify-between">
              <span>Result</span>
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(JSON.stringify(result.result, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch {}
                }}
                className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--card-2)]"
              >
                <ClipboardCopy size={10} /> {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="px-4 py-3 text-xs font-mono whitespace-pre-wrap overflow-auto max-h-64">
{JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        )}

        {result.log && result.log.length > 0 && (
          <div className="rounded-2xl border border-token overflow-hidden">
            <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest font-bold opacity-60">
              Execution log
            </div>
            <div className="divide-y divide-[var(--border)]">
              {result.log.map((l, i) => (
                <div key={i} className="px-4 py-2 text-xs flex gap-2">
                  <span className={`shrink-0 w-3 ${
                    l.level === 'success' ? 'text-emerald-300' : l.level === 'warning' ? 'text-amber-300' : 'opacity-50'
                  }`}>{l.level === 'success' ? '✓' : l.level === 'warning' ? '!' : '·'}</span>
                  <span>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.consoleUrl && (
          <a href={result.consoleUrl} target="_blank" rel="noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] inline-flex items-center gap-2">
            <ExternalLink size={12} /> Verify in AWS Console
          </a>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="primary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- helpers ----------------

function findResourceName(params) {
  const keys = ['bucketName', 'tableName', 'functionName', 'instanceId', 'distributionId', 'roleName', 'userName', 'budgetName', 'name'];
  for (const k of keys) {
    if (params[k]) return params[k];
  }
  for (const v of Object.values(params)) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return 'CONFIRM';
}
