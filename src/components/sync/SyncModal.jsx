/**
 * SyncModal.jsx — phone-first sync settings + setup guide.
 *
 * Three distinct states drive the UI:
 *
 *   1. Sync ON, working                   → compact "you're set" view
 *                                           with phone instructions
 *   2. Sync OFF or never enabled          → 3-step setup guide
 *   3. ERROR (esp. PAT_MISSING_GIST_SCOPE)→ specific fix card on top
 *
 * Advanced controls (push/pull now, gist link, danger zone) live
 * behind a single "Advanced" disclosure to keep the default view clean.
 */

import { useEffect, useState } from 'react';
import {
  Cloud, X, CheckCircle2, ExternalLink, AlertTriangle,
  Loader2, Trash2, KeyRound, Smartphone, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSync } from '../../context/SyncContext.jsx';
import {
  getStoredSyncRepo, readSecurityAdvisory, dismissSecurityAdvisory, recreateSyncGist,
} from '../../lib/gistSync.js';
import { readToken } from '../../lib/githubToken.js';
import { hasGithubAppSession } from '../../lib/githubAppAuth.js';
import { cn } from '../../lib/utils.js';

export function SyncModal() {
  const {
    openModal, setOpenModal, status, meta, enabled, enable, disable,
    stopAndDelete, appliedOnOpen,
  } = useSync();
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [repoName, setRepoName] = useState(() => getStoredSyncRepo());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advisory, setAdvisory] = useState(() => readSecurityAdvisory());

  useEffect(() => {
    if (openModal) {
      setRepoName(getStoredSyncRepo());
      setLastResult(null);
      setShowAdvanced(false);
      setAdvisory(readSecurityAdvisory());
    }
  }, [openModal]);

  if (!openModal) return null;

  const hasToken = hasGithubAppSession() || !!readToken()?.token;
  const hasScopeError =
    lastResult?.error === 'GITHUB_APP_MISSING_REPOSITORY_PERMISSION' ||
    /GITHUB_APP_MISSING_REPOSITORY_PERMISSION|Resource not accessible/i.test(meta.lastError || '');
  const repoUrl = repoName ? `https://github.com/${repoName}` : null;

  async function withBusy(label, fn) {
    setBusy(true);
    try {
      const result = await fn();
      setLastResult({ label, ...result });
    } finally {
      setBusy(false);
      setRepoName(getStoredSyncRepo());
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={() => setOpenModal(false)}
    >
      <div
        className="surface rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[88vh] overflow-y-auto p-5 space-y-4 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
              Cross-device sync
            </div>
            <h2 className="text-lg font-extrabold flex items-center gap-2">
              <Cloud size={18} className="text-aws-orange" />
              Continue on any device
            </h2>
          </div>
          <button
            onClick={() => setOpenModal(false)}
            className="grid place-items-center w-9 h-9 rounded-full hover:bg-[var(--card-2)] tap-44"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* APPLIED ON OPEN — "we just pulled your data" success banner */}
        {appliedOnOpen?.applied && (
          <div className="rounded-xl border border-success/40 bg-success/5 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="text-success shrink-0 mt-0.5" />
              <div>
                <div className="font-extrabold text-success">Welcome back.</div>
                <div className="text-[12px] opacity-90 mt-0.5">
                  Just restored your data from {new Date(appliedOnOpen.remoteTimestamp).toLocaleString()}. Reloading the app…
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SCOPE ERROR — always show first so it can't be missed ── */}
        {hasScopeError && <ScopeErrorCard />}

        {/* ── SECURITY ADVISORY — old gist may contain secrets ─────── */}
        {advisory && !hasScopeError && (
          <SecurityAdvisoryCard
            busy={busy}
            onSecure={() => withBusy('secure', async () => {
              const res = await recreateSyncGist();
              setAdvisory(null);
              return res;
            })}
            onDismiss={() => { dismissSecurityAdvisory(); setAdvisory(null); }}
          />
        )}

        {/* ── STATE 1: SYNC ON ──────────────────────────────────────── */}
        {enabled && !hasScopeError && (
          <div className="space-y-3">
            <div className="rounded-xl border border-success/40 bg-success/5 p-4 flex items-center gap-3">
              <CheckCircle2 size={20} className="text-success shrink-0" />
              <div className="flex-1">
                <div className="font-extrabold text-success text-[13.5px]">Sync is on.</div>
                <div className="text-[11.5px] opacity-80 mt-0.5">
                  Every change auto-pushes to your access-controlled private repository. {meta.lastPushAt && `Last push ${timeAgo(meta.lastPushAt)}.`}
                </div>
              </div>
            </div>

            <ContinueOnPhoneCard />
          </div>
        )}

        {/* ── STATE 2: SYNC OFF — show the 3-step setup ─────────────── */}
        {!enabled && !hasScopeError && (
          <div className="space-y-3">
            <p className="text-[12.5px] opacity-80 leading-relaxed">
              Sync your data to an <strong>access-controlled private GitHub repository</strong> so you can keep working from your phone, tablet, or another laptop.
            </p>

            <SetupSteps hasToken={hasToken} />

            <button
              onClick={() => withBusy('toggle', enable)}
              disabled={busy || !hasToken}
              className={cn(
                'w-full btn btn-primary !text-[13px] !py-3 tap-44 gap-2',
                (busy || !hasToken) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {busy ? (
                <><Loader2 size={14} className="animate-spin" /> Setting up…</>
              ) : !hasToken ? (
                <>Connect GitHub first</>
              ) : (
                <><Cloud size={14} /> Turn on sync</>
              )}
            </button>
          </div>
        )}

        {/* ── Last result feedback ─────────────────────────────────── */}
        {lastResult && !lastResult.ok && !hasScopeError && (
          <div className="rounded-lg border border-danger/40 bg-danger/5 p-3 text-[12px] flex items-start gap-2">
            <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
            <div className="break-words">
              <strong>Couldn&apos;t {lastResult.label}.</strong> {lastResult.error || lastResult.reason || 'Unknown error.'}
            </div>
          </div>
        )}

        {/* ── ADVANCED disclosure ──────────────────────────────────── */}
        {enabled && (
          <div className="pt-2 border-t border-token">
            <button
              onClick={() => setShowAdvanced((s) => !s)}
              className="w-full flex items-center justify-between text-[11.5px] font-bold opacity-70 hover:opacity-100 py-1"
            >
              <span>Advanced</span>
              <ChevronRight size={12} className={cn('transition', showAdvanced && 'rotate-90')} />
            </button>
            {showAdvanced && (
              <div className="space-y-2.5 pt-2">
                <div className="rounded-lg border border-success/30 bg-success/5 p-2.5 text-[10.5px] leading-relaxed">
                  Sync is automatic in both directions. Manual Push/Pull controls were removed because choosing the wrong direction could replace newer data or confuse connection status.
                </div>

                {repoUrl && (
                  <a
                    href={repoUrl} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] inline-flex items-center gap-1 text-aws-orange font-bold hover:underline"
                  >
                    View your private sync repository <ExternalLink size={10} />
                  </a>
                )}

                <div className="rounded-lg bg-[var(--card-2)]/50 border border-token p-2.5 text-[10.5px] space-y-0.5 opacity-90">
                  <div className="flex justify-between"><span className="opacity-70">Status</span><span className="capitalize font-bold">{status}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Last push</span><span className="font-mono">{meta.lastPushAt ? new Date(meta.lastPushAt).toLocaleString() : '—'}</span></div>
                  <div className="flex justify-between"><span className="opacity-70">Last pull</span><span className="font-mono">{meta.lastPullAt ? new Date(meta.lastPullAt).toLocaleString() : '—'}</span></div>
                </div>

                <button
                  onClick={() => withBusy('disable', async () => { disable(); return { ok: true }; })}
                  disabled={busy}
                  className="text-[11px] font-bold opacity-70 hover:opacity-100 underline"
                >
                  Pause sync on this device
                </button>

                <details className="text-[11px]">
                  <summary className="cursor-pointer text-danger/80 hover:text-danger">Stop sync + delete cloud copy</summary>
                  <button
                    onClick={() => withBusy('delete', stopAndDelete)}
                    disabled={busy}
                    className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-danger/40 text-danger text-[11px] font-bold hover:bg-danger/10 tap-44"
                  >
                    <Trash2 size={12} /> Delete my private sync repository permanently
                  </button>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Privacy footer */}
        <div className="text-[10.5px] opacity-60 italic leading-relaxed pt-2 border-t border-token">
          <strong>Privacy:</strong> GitHub enforces access to the private repository; it is not an unlisted Gist. We skip the
          encrypted AWS credential vault, raw AWS keys, and other per-device secrets. Not a primary backup.
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════════

function SetupSteps({ hasToken }) {
  const steps = [
    {
      done: hasToken,
      title: 'Connect the GitHub App',
      body: (
        <Link
          to="/settings?section=integrations"
          className="text-aws-orange font-bold inline-flex items-center gap-0.5 hover:underline"
        >
          Open Settings → Integrations <ExternalLink size={10} />
        </Link>
      ),
    },
    {
      done: hasToken,
      title: 'Approve GitHub once',
      body: (
        <Link to="/settings" className="text-aws-orange font-bold inline-flex items-center gap-0.5 hover:underline">
          No token copying or 90-day renewal <ChevronRight size={12} />
        </Link>
      ),
    },
    {
      done: false,
      title: 'Tap "Turn on sync" below',
      body: <span className="opacity-70 text-[11px]">First push creates a private sync repository. ~3 seconds.</span>,
    },
  ];
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className={cn(
            'grid place-items-center w-6 h-6 rounded-full text-[10.5px] font-extrabold shrink-0 mt-0.5',
            s.done ? 'bg-success/20 text-success' : 'bg-[var(--card-2)] text-current'
          )}>
            {s.done ? '✓' : i + 1}
          </div>
          <div className="flex-1">
            <div className="text-[12.5px] font-bold leading-tight">{s.title}</div>
            <div className="text-[11.5px] mt-0.5">{s.body}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ContinueOnPhoneCard() {
  return (
    <div className="rounded-xl border border-aws-orange/30 bg-aws-orange/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Smartphone size={16} className="text-aws-orange" />
        <strong className="text-aws-orange text-[12.5px]">Continue on another device</strong>
      </div>
      <ol className="text-[11.5px] leading-relaxed space-y-1 pl-1">
        <li><strong>1.</strong> Open the app URL on your other device.</li>
        <li><strong>2.</strong> Settings → Integrations → <strong>Connect GitHub</strong> and approve that browser once.</li>
        <li><strong>3.</strong> Your data restores automatically and the app reloads. No separate sync step.</li>
      </ol>
    </div>
  );
}

function SecurityAdvisoryCard({ busy, onSecure, onDismiss }) {
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/5 p-4 space-y-2.5">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
        <div>
          <strong className="text-danger text-[13px] block">Secure your sync gist</strong>
          <p className="text-[11.5px] opacity-90 mt-0.5 leading-relaxed">
            Your gist was created by an older app version that could include your GitHub
            token in the synced data. One tap fixes it: we delete the old gist (wiping its
            entire revision history) and recreate it from a clean, secret-free snapshot.
          </p>
        </div>
      </div>
      <button
        onClick={onSecure}
        disabled={busy}
        className={cn('w-full btn btn-primary !text-[12px] !py-2.5 tap-44 gap-2', busy && 'opacity-50')}
      >
        {busy ? <><Loader2 size={13} className="animate-spin" /> Securing…</> : <><KeyRound size={13} /> Secure my gist now</>}
      </button>
      <p className="text-[10.5px] opacity-70 leading-relaxed">
        Afterwards, also{' '}
        <a
          href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer"
          className="text-aws-orange font-bold underline"
        >
          rotate your GitHub PAT
        </a>{' '}
        (and your Google client secret if you use Calendar) — a copy may already exist outside your control.
      </p>
      <button onClick={onDismiss} className="text-[10.5px] opacity-60 hover:opacity-100 underline">
        Dismiss (I've handled it)
      </button>
    </div>
  );
}

function ScopeErrorCard() {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
        <div>
          <strong className="text-warning text-[13px] block">The GitHub App needs repository permission.</strong>
          <p className="text-[11.5px] opacity-90 mt-0.5">
            Cross-device sync requires Contents and Administration access to its private sync repository.
          </p>
        </div>
      </div>
      <ol className="text-[11.5px] pl-7 space-y-1 leading-relaxed">
        <li>
          1. <a
            href="https://github.com/settings/apps/aws-career-launchpad-pro/permissions"
            target="_blank" rel="noopener noreferrer"
            className="text-aws-orange font-bold underline"
          >
            Open GitHub App settings
          </a> and enable <code className="text-aws-orange">Contents + Administration: Read and write</code>.
        </li>
        <li>2. Approve the updated permission on the app installation page.</li>
        <li>3. Return here and tap <strong>Turn on sync</strong> again.</li>
      </ol>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
function timeAgo(iso) {
  const t = new Date(iso).getTime();
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}
