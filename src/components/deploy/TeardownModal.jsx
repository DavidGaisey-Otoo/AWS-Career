/**
 * TeardownModal.jsx — GIG-01 one-click "delete everything".
 *
 * ════════════════════════════════════════════════════════════════════
 * SECURITY MODEL (mirrors DeployFromScriptModal — read before editing)
 * ════════════════════════════════════════════════════════════════════
 * Credentials entered here live ONLY in component state for the lifetime
 * of the modal. They are passed once to cfnDeployer.deleteStack and are
 * wiped when the modal closes. Never persisted, never logged, never
 * rendered after the delete starts.
 * ════════════════════════════════════════════════════════════════════
 *
 * This is a DESTRUCTIVE action, so the UI gates it behind an explicit
 * type-to-confirm: the user must type the stack name exactly. That is
 * deliberate friction — deleting the wrong stack is unrecoverable.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Trash2, X, KeyRound, Eye, EyeOff, AlertTriangle, CheckCircle2,
  Loader2, Lock,
} from 'lucide-react';
import { deleteStack } from '../../lib/cfnDeployer.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

export function TeardownModal({ open, onClose, stackName, region, title, onComplete }) {
  const toast = useToast();
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [phase, setPhase] = useState('form');   // form | deleting | done
  const [events, setEvents] = useState([]);
  const [result, setResult] = useState(null);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

  // Wipe every sensitive field whenever the modal closes
  useEffect(() => {
    if (!open) {
      setAccessKeyId('');
      setSecretAccessKey('');
      setShowSecret(false);
      setConfirmText('');
      setPhase('form');
      setEvents([]);
      setResult(null);
    }
  }, [open]);

  if (!open) return null;

  const confirmed = confirmText.trim() === stackName;
  const canDelete = confirmed && accessKeyId.trim() && secretAccessKey.trim();

  async function handleDelete() {
    if (!canDelete) return;
    setPhase('deleting');
    setEvents([{ type: 'step', message: 'Starting teardown…', ts: Date.now() }]);
    try {
      const res = await deleteStack({
        credentials: { accessKeyId: accessKeyId.trim(), secretAccessKey: secretAccessKey.trim() },
        region,
        stackName,
        onProgress: (e) => setEvents((prev) => [...prev, e]),
      });
      setResult(res);
      setPhase('done');
      onComplete?.(res);
      if (!res.ok) toast?.error?.('Teardown did not complete — see the log.');
    } catch (err) {
      const res = { ok: false, error: String(err?.message || err) };
      setResult(res);
      setPhase('done');
      onComplete?.(res);
    } finally {
      // Creds are no longer needed the moment the call returns
      setAccessKeyId('');
      setSecretAccessKey('');
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={phase === 'deleting' ? undefined : onClose}
    >
      <div
        className="surface rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-danger mb-1">
              Destructive action
            </div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Trash2 size={18} className="text-danger" />
              Delete everything
            </h2>
          </div>
          {phase !== 'deleting' && (
            <button onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full hover:bg-[var(--card-2)] tap-44" aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        {/* ── FORM ─────────────────────────────────────────────────── */}
        {phase === 'form' && (
          <>
            <div className="rounded-xl border border-danger/40 bg-danger/5 p-3.5 space-y-1.5">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-danger shrink-0 mt-0.5" />
                <div className="text-[12px] leading-relaxed">
                  <strong>This cannot be undone.</strong> Every resource in the stack{' '}
                  <span className="font-mono font-bold">{stackName}</span> will be permanently deleted
                  from <span className="font-mono font-bold">{region}</span> — databases, buckets,
                  instances, everything.
                </div>
              </div>
              {title && <div className="text-[11px] opacity-70 pl-[23px]">Solution: {title}</div>}
            </div>

            {/* Credentials */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest opacity-70">
                <KeyRound size={12} /> AWS credentials
              </div>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Access key ID"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2.5 text-[13px] font-mono outline-none focus:border-danger"
              />
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Secret access key"
                  value={secretAccessKey}
                  onChange={(e) => setSecretAccessKey(e.target.value)}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2.5 pr-10 text-[13px] font-mono outline-none focus:border-danger"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-60 hover:opacity-100"
                  aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[10.5px] opacity-60 flex items-start gap-1.5 leading-relaxed">
                <Lock size={11} className="shrink-0 mt-0.5" />
                Held in memory for this one call, sent only to AWS, then discarded. Never saved.
              </p>
            </div>

            {/* Type-to-confirm */}
            <div className="space-y-1.5">
              <label className="text-[11.5px] font-bold block">
                Type <span className="font-mono text-danger">{stackName}</span> to confirm
              </label>
              <input
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={stackName}
                className={cn(
                  'w-full rounded-lg bg-[var(--card-2)] border px-3 py-2.5 text-[13px] font-mono outline-none',
                  confirmed ? 'border-success' : 'border-token focus:border-danger'
                )}
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={!canDelete}
              className={cn(
                'w-full btn !text-[13.5px] !py-3 tap-44 gap-2 border',
                canDelete
                  ? 'border-danger bg-danger/15 text-danger hover:bg-danger/25'
                  : 'border-token opacity-40 cursor-not-allowed'
              )}
            >
              <Trash2 size={15} /> Permanently delete this stack
            </button>
          </>
        )}

        {/* ── DELETING / DONE ──────────────────────────────────────── */}
        {(phase === 'deleting' || phase === 'done') && (
          <>
            {phase === 'deleting' && (
              <div className="flex items-center gap-2 text-[13px] font-bold">
                <Loader2 size={16} className="animate-spin text-danger" />
                Deleting {stackName}… this can take a few minutes.
              </div>
            )}

            {phase === 'done' && result && (
              <div className={cn(
                'rounded-xl border p-3.5 flex items-start gap-2',
                result.ok ? 'border-success/40 bg-success/5' : 'border-danger/40 bg-danger/5'
              )}>
                {result.ok
                  ? <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
                  : <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />}
                <div className="text-[12.5px] leading-relaxed">
                  <strong className={result.ok ? 'text-success' : 'text-danger'}>
                    {result.ok ? 'Everything deleted.' : 'Teardown did not finish.'}
                  </strong>
                  <div className="opacity-85 mt-0.5">
                    {result.ok
                      ? 'The stack and all of its resources are gone. Nothing is billing.'
                      : (result.error || 'Check the CloudFormation console.')}
                  </div>
                </div>
              </div>
            )}

            {/* Progress log */}
            <div className="rounded-lg bg-[var(--card-2)]/60 border border-token p-2.5 max-h-52 overflow-y-auto space-y-0.5 font-mono text-[10.5px]">
              {events.map((e, i) => (
                <div key={i} className={cn(
                  e.type === 'error' && 'text-danger',
                  e.type === 'success' && 'text-success',
                  e.type === 'status' && 'opacity-70'
                )}>
                  {e.message || e.status}
                </div>
              ))}
              <div ref={endRef} />
            </div>

            {phase === 'done' && (
              <button onClick={onClose} className="w-full btn btn-ghost !text-[13px] !py-2.5 tap-44">
                Close
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
