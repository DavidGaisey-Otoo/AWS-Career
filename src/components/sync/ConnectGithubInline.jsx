/**
 * ConnectGithubInline — connect GitHub without leaving where you are.
 *
 * Every entry point to sync used to end at the same instruction: go to
 * Settings → Integrations and connect there. The header chip opened a
 * modal whose primary button was disabled and read "Connect GitHub
 * first". So the one action standing between a person and working sync
 * was never available at the moment they asked for it — it was always
 * somewhere else, five hops away.
 *
 * This runs the device flow in place and shows the code to approve.
 */
import { useState } from 'react';
import { Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Github } from '../common/BrandIcons.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { connectGithubAndRestore } from '../../lib/githubRestore.js';
import { cn } from '../../lib/utils.js';

export function ConnectGithubInline({ label = 'Connect GitHub', className = '', onDone }) {
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

  const run = async () => {
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
        toast.success('Connected. Your data is restored — reloading…');
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.success('Connected. Sync is on — this device is now your first synced copy.');
        setBusy(false);
        setCode(null);
        onDone?.(result);
      }
    } catch (err) {
      setBusy(false);
      setCode(null);
      setError(err.message || 'Could not connect to GitHub.');
    }
  };

  if (code) {
    return (
      <div className={cn('rounded-xl border border-token bg-[var(--card-2)] p-4 space-y-2.5 text-center', className)}>
        <div className="text-[10.5px] uppercase tracking-widest font-bold text-muted">
          Enter this code on GitHub
        </div>
        <div className="flex items-center justify-center gap-2">
          <code className="text-xl font-black tracking-[0.2em] font-mono">{code.userCode}</code>
          <button onClick={copyCode} className="text-muted hover:text-aws-orange" aria-label="Copy code">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <a
          href={code.verificationUri}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-aws-orange hover:underline"
        >
          Open GitHub to approve <ExternalLink size={11} />
        </a>
        <div className="flex items-center justify-center gap-1.5 text-[10.5px] text-muted">
          <Loader2 size={10} className="animate-spin" /> {status || 'Waiting…'}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        onClick={run}
        disabled={busy}
        className={cn(
          'w-full btn btn-primary !text-[13px] !py-3 tap-44 gap-2',
          busy && 'opacity-60 cursor-wait'
        )}
      >
        {busy ? (
          <><Loader2 size={14} className="animate-spin" /> {status || 'Connecting…'}</>
        ) : (
          <><Github size={14} /> {label}</>
        )}
      </button>
      {error && <p className="text-[11.5px] text-danger leading-relaxed">{error}</p>}
    </div>
  );
}
