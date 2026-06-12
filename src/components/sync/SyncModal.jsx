/**
 * SyncModal.jsx — settings + actions for cross-device sync.
 */

import { useEffect, useState } from 'react';
import {
  Cloud, Upload, Download, X, CheckCircle2, ExternalLink, AlertTriangle,
  Loader2, Trash2, KeyRound, RefreshCw,
} from 'lucide-react';
import { useSync } from '../../context/SyncContext.jsx';
import { getStoredGistId } from '../../lib/gistSync.js';
import { readToken } from '../../lib/githubToken.js';
import { cn } from '../../lib/utils.js';

export function SyncModal() {
  const { openModal, setOpenModal, status, meta, enabled, enable, disable, pushNow, pullNow, stopAndDelete, appliedOnOpen } = useSync();
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [gistId, setGistId] = useState(() => getStoredGistId());

  // Refresh gist id reading when modal opens
  useEffect(() => {
    if (openModal) setGistId(getStoredGistId());
  }, [openModal]);

  if (!openModal) return null;

  const hasToken = !!readToken()?.token;

  async function withBusy(label, fn) {
    setBusy(true);
    try {
      const result = await fn();
      setLastResult({ label, ...result });
    } finally {
      setBusy(false);
      setGistId(getStoredGistId());
    }
  }

  const gistUrl = gistId ? `https://gist.github.com/${gistId}` : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpenModal(false)}>
      <div className="surface rounded-2xl max-w-lg w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">Cross-device sync</div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Cloud size={16} className="text-aws-orange" />
              Continue on any device
            </h2>
            <p className="text-[11.5px] opacity-70 mt-1">
              Use your GitHub PAT to keep your data in a <strong>private Gist</strong>. Open the app on your phone with the same PAT — it auto-pulls.
            </p>
          </div>
          <button onClick={() => setOpenModal(false)} className="p-1 rounded hover:bg-[var(--card-2)]">
            <X size={16} />
          </button>
        </div>

        {/* Status banner */}
        {appliedOnOpen?.applied && (
          <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-[12px]">
            <strong className="text-success">Synced from another device.</strong> Restored on {new Date(appliedOnOpen.remoteTimestamp).toLocaleString()}. Reloading…
          </div>
        )}
        {!hasToken && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-[12px] flex items-start gap-2">
            <KeyRound size={14} className="text-warning shrink-0 mt-0.5" />
            <div>
              <strong className="text-warning">No GitHub PAT configured.</strong> Sync needs one. Go to <a href="/settings" className="font-bold underline">Settings</a> and paste your PAT, then come back here.
            </div>
          </div>
        )}

        {/* Toggle row */}
        <div className="rounded-lg bg-[var(--card-2)] border border-token p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[12.5px] font-extrabold">Auto-sync</div>
            <div className="text-[11px] opacity-70 mt-0.5">{enabled ? 'On — every change is pushed to your private Gist.' : 'Off — your data stays on this device only.'}</div>
          </div>
          <button
            onClick={() => withBusy('toggle', enabled ? async () => { disable(); return { ok: true }; } : enable)}
            disabled={busy || !hasToken}
            className={cn('btn !text-xs', enabled ? 'btn-ghost' : 'btn-primary', (busy || !hasToken) && 'opacity-50 cursor-not-allowed')}
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : enabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>

        {/* Gist link */}
        {gistUrl && (
          <div className="text-[11.5px] opacity-80 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-success" />
            Stored in this Gist:
            <a href={gistUrl} target="_blank" rel="noopener noreferrer" className="text-aws-orange font-bold inline-flex items-center gap-0.5 hover:underline">
              view on GitHub <ExternalLink size={10} />
            </a>
          </div>
        )}

        {/* Manual actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => withBusy('push', pushNow)}
            disabled={busy || !hasToken}
            className="btn btn-ghost !text-xs"
          >
            <Upload size={12} /> Push now
          </button>
          <button
            onClick={() => withBusy('pull', pullNow)}
            disabled={busy || !hasToken}
            className="btn btn-ghost !text-xs"
          >
            <Download size={12} /> Pull now
          </button>
        </div>

        {/* Result feedback */}
        {lastResult && (
          <div className="rounded-lg bg-[var(--card-2)]/50 border border-token p-2.5 text-[11px]">
            <strong className="capitalize">{lastResult.label}:</strong>{' '}
            {lastResult.ok
              ? lastResult.applied === false
                ? (lastResult.reason || 'No changes')
                : 'Success'
              : `Failed — ${lastResult.error || lastResult.reason || 'unknown'}`}
          </div>
        )}

        {/* PAT scope mismatch — show the one-click fix */}
        {(lastResult?.error === 'PAT_MISSING_GIST_SCOPE' ||
          /PAT_MISSING_GIST_SCOPE|Resource not accessible by personal access token/i.test(meta.lastError || '')) && (
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-3 text-[12px] space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
              <div>
                <strong className="text-warning">Your GitHub PAT can&apos;t create Gists.</strong> By default,
                fine-grained PATs don&apos;t have permission to write Gists — you have to opt in.
              </div>
            </div>
            <div className="text-[11.5px] opacity-90 pl-5 leading-relaxed">
              <strong>To fix (60 seconds):</strong>
              <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                <li>Open <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-aws-orange font-bold underline">GitHub → Settings → Tokens</a></li>
                <li>If using a <strong>classic PAT</strong>: edit it and check the <code className="text-aws-orange">gist</code> scope. Save.</li>
                <li>If using a <strong>fine-grained PAT</strong>: classic PATs are simpler for this. Create a new classic PAT with the <code className="text-aws-orange">gist</code> scope.</li>
                <li>Paste the new PAT in <a href="/settings" className="text-aws-orange font-bold underline">Settings → Integrations → GitHub</a> and come back here.</li>
              </ol>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="rounded-lg bg-[var(--card-2)]/50 border border-token p-3 text-[11px] space-y-1 opacity-90">
          <div className="flex items-center justify-between">
            <span className="opacity-70">Status</span>
            <span className="font-bold capitalize">{status}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="opacity-70">Last push</span>
            <span className="font-mono">{meta.lastPushAt ? new Date(meta.lastPushAt).toLocaleString() : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="opacity-70">Last pull</span>
            <span className="font-mono">{meta.lastPullAt ? new Date(meta.lastPullAt).toLocaleString() : '—'}</span>
          </div>
          {meta.lastError && (
            <div className="flex items-start gap-1 pt-1 border-t border-token mt-1">
              <AlertTriangle size={11} className="text-danger shrink-0 mt-0.5" />
              <span className="text-danger break-all">{meta.lastError}</span>
            </div>
          )}
        </div>

        {/* Honest scope notice */}
        <div className="text-[10.5px] opacity-65 italic leading-relaxed pt-2 border-t border-token">
          <strong>Privacy:</strong> The Gist is secret/unlisted — only your PAT can read it. We deliberately
          skip the encrypted AWS credential vault, raw AWS access keys, and other per-device secrets. Don\'t use
          this Gist as your only backup.
        </div>

        {/* Danger zone */}
        {enabled && gistUrl && (
          <details className="text-[11px]">
            <summary className="cursor-pointer opacity-70 hover:opacity-100">Danger zone</summary>
            <button
              onClick={() => withBusy('delete', stopAndDelete)}
              disabled={busy}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-danger/40 text-danger text-[11px] font-bold hover:bg-danger/10"
            >
              <Trash2 size={11} /> Stop syncing + delete cloud Gist
            </button>
          </details>
        )}
      </div>
    </div>
  );
}
