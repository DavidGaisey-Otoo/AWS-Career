/**
 * BuildStamp — says which build this window is running.
 *
 * The app deploys to more than one origin (GitHub Pages, Vercel, local
 * dev) and each origin has its own localStorage. So two open windows can
 * legitimately show different data AND different code, with nothing on
 * screen to distinguish them. When that happens, "did my update land?"
 * has no answer and both windows look equally plausible.
 *
 * This shows the commit, the deploy target and the build time, so two
 * windows can be compared at a glance.
 */
import { useState } from 'react';
import { Check, Copy, GitCommit } from 'lucide-react';
import { cn } from '../../lib/utils.js';

// Injected by vite.config.js `define`. The fallback keeps the component
// honest if it is ever rendered outside a Vite build.
const STAMP =
  typeof __BUILD_STAMP__ !== 'undefined'
    ? __BUILD_STAMP__
    : { sha: 'unknown', builtAt: null, target: 'unknown' };

export function BuildStamp({ className = '' }) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== 'undefined' ? window.location.origin : '—';
  const built = STAMP.builtAt ? new Date(STAMP.builtAt) : null;
  const line = `${STAMP.sha} · ${STAMP.target} · ${origin}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the text is on screen anyway */
    }
  }

  return (
    <div className={cn('surface rounded-2xl p-4 space-y-2', className)}>
      <div className="flex items-center gap-2">
        <GitCommit size={14} className="text-aws-orange" />
        <h3 className="text-sm font-extrabold">This build</h3>
        <button
          onClick={copy}
          className="ml-auto text-[11px] font-bold text-muted hover:text-aws-orange inline-flex items-center gap-1"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
        <dt className="text-muted">Commit</dt>
        <dd className="font-mono">{STAMP.sha}</dd>
        <dt className="text-muted">Deployed to</dt>
        <dd className="font-semibold">{STAMP.target}</dd>
        <dt className="text-muted">Origin</dt>
        <dd className="font-mono break-all">{origin}</dd>
        <dt className="text-muted">Built</dt>
        <dd>{built ? built.toLocaleString() : 'unknown'}</dd>
      </dl>

      <p className="text-[11px] text-muted leading-relaxed">
        Each origin stores its own data in this browser — profiles, progress and AWS
        account details do not cross between them. If another window shows different
        numbers, compare its commit here before assuming something is broken.
      </p>
    </div>
  );
}
