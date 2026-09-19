/**
 * RestoreAccountPanel — "I already have an account."
 *
 * Shown first, before onboarding asks anyone to invent a profile. Opening
 * the app on a new device or origin previously offered only one route —
 * create a new account — which quietly produced a second identity with
 * its own progress instead of retrieving the real one.
 */
import { useState } from 'react';
import { ArrowRight, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Github } from '../common/BrandIcons.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { connectGithubAndRestore } from '../../lib/githubRestore.js';
import { Button } from '../ui/Button.jsx';

export function RestoreAccountPanel({ onStartFresh }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const copyCode = async () => {
    if (!code?.userCode) return;
    try {
      await navigator.clipboard.writeText(code.userCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is on screen */
    }
  };

  const restore = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await connectGithubAndRestore({
        onCode: (c) => {
          setCode(c);
          if (c.userCode && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(c.userCode).then(() => setCopied(true)).catch(() => {});
          }
        },
        onStatus: setStatus,
      });

      if (result.restored) {
        toast.success('Your account is back. Reloading…');
        setTimeout(() => window.location.reload(), 600);
      } else {
        // Connected, but this GitHub account has never pushed a snapshot.
        // Say so plainly instead of leaving them on a spinner.
        setBusy(false);
        setCode(null);
        setError(
          'GitHub connected, but there is no saved data on this account yet. '
          + 'Set up below — from now on it will sync everywhere.'
        );
      }
    } catch (err) {
      setBusy(false);
      setCode(null);
      setError(err.message || 'Could not restore. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
          <Github size={24} strokeWidth={2.5} />
        </div>
        <h2 className="text-lg font-extrabold">Already have an account?</h2>
        <p className="text-[12px] text-muted max-w-sm mx-auto leading-relaxed">
          Your progress, profile and AWS accounts are saved to a private GitHub
          repository. Sign in and this device picks up exactly where your others
          left off — no setting anything up twice.
        </p>
      </div>

      {code ? (
        <div className="rounded-2xl border border-token bg-[var(--card-2)] p-4 space-y-3 text-center">
          <div className="text-[11px] uppercase tracking-widest font-bold text-muted">
            Enter this code on GitHub
          </div>
          <div className="flex items-center justify-center gap-2">
            <code className="text-2xl font-black tracking-[0.2em] font-mono">{code.userCode}</code>
            <button onClick={copyCode} className="text-muted hover:text-aws-orange" aria-label="Copy code">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <a
            href={code.verificationUri}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-aws-orange hover:underline"
          >
            Open GitHub to approve <ExternalLink size={12} />
          </a>
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted">
            <Loader2 size={12} className="animate-spin" /> {status || 'Waiting…'}
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          icon={busy ? undefined : Github}
          onClick={restore}
          disabled={busy}
          className="w-full justify-center"
        >
          {busy ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> {status || 'Connecting…'}
            </span>
          ) : (
            'Restore my account from GitHub'
          )}
        </Button>
      )}

      {error && (
        <p className="text-[12px] text-amber-400 text-center leading-relaxed">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted">or</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        onClick={onStartFresh}
        disabled={busy}
        className="w-full text-center text-sm font-bold text-muted hover:text-aws-orange inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        I'm new here — set up a new account <ArrowRight size={14} />
      </button>
    </div>
  );
}
