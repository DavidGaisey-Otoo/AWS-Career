/**
 * RenewGithubToken.jsx — step-by-step walkthrough for regenerating
 * the GitHub PAT. Linked to from the expiry banner + Readiness page.
 *
 * Goal: zero ambiguity. Each step has the exact URL to open, the exact
 * thing to click, the exact field to fill, and a checkpoint to verify.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Github, ExternalLink, ClipboardCopy, Check, ArrowRight, ArrowLeft,
  ShieldCheck, AlertTriangle, KeyRound, RefreshCw, CheckCircle2,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  readToken, writeToken, verifyToken, expiryLabel, expirySeverity,
  GITHUB_TOKEN_PAGE,
} from '../lib/githubToken.js';

const STEPS = [
  {
    id: 'open-github',
    title: 'Open the GitHub token settings',
    actions: [
      { kind: 'link', label: 'Open GitHub Fine-grained tokens', href: GITHUB_TOKEN_PAGE },
      { kind: 'text', value: 'Sign in if it asks you to.' },
    ],
    checkpoint: 'You see a page titled "Fine-grained personal access tokens".',
  },
  {
    id: 'find-token',
    title: 'Find your existing token',
    actions: [
      { kind: 'text', value: 'Look for "aws-launchpad-pro" in the list.' },
      { kind: 'text', value: 'Click the token name to open it.' },
    ],
    checkpoint: 'You\'re on the token detail page.',
  },
  {
    id: 'regenerate',
    title: 'Click "Regenerate token"',
    actions: [
      { kind: 'text', value: 'Scroll to the top of the page.' },
      { kind: 'text', value: 'Click the orange "Regenerate token" button.' },
      { kind: 'text', value: 'GitHub asks you to confirm + may prompt for 2FA.' },
    ],
    checkpoint: 'You see a form asking for the new expiry date.',
  },
  {
    id: 'pick-expiry',
    title: 'Pick a longer expiry',
    actions: [
      { kind: 'text', value: 'Set Expiration to: Custom → pick a date ~90 days from today (or up to 1 year — fine-grained PAT max).' },
      { kind: 'text', value: 'Tip: longer = fewer renewals. We\'ll warn you 14 days before expiry.' },
      { kind: 'text', value: 'Permissions stay the same (Contents R+W, Administration R+W, Metadata R).' },
    ],
    checkpoint: 'Expiration date set + permissions look the same as before.',
  },
  {
    id: 'submit',
    title: 'Click "Regenerate token" at the bottom',
    actions: [
      { kind: 'text', value: 'Scroll to the bottom of the form.' },
      { kind: 'text', value: 'Click the orange "Regenerate token" button.' },
    ],
    checkpoint: 'A new green box appears at the top with your new token (starts with github_pat_).',
  },
  {
    id: 'copy-token',
    title: 'Copy the new token IMMEDIATELY',
    actions: [
      { kind: 'text', value: 'Click the clipboard icon next to the new github_pat_… string.' },
      { kind: 'warning', value: 'GitHub shows the token ONCE. If you close this page without copying, you have to regenerate again.' },
    ],
    checkpoint: 'Token copied to clipboard.',
  },
  {
    id: 'paste-and-save',
    title: 'Paste the new token into the app',
    actions: [
      { kind: 'inline', component: 'paste-form' },
    ],
    checkpoint: 'You see "Token saved" + a green verification badge.',
  },
];

export default function RenewGithubToken() {
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(new Set());
  const existing = readToken();

  function go(idx) {
    setCurrent(Math.max(0, Math.min(STEPS.length - 1, idx)));
  }

  function markAndNext(idx) {
    const ds = new Set(done); ds.add(idx);
    setDone(ds);
    go(idx + 1);
  }

  const allDone = done.size === STEPS.length;
  const step = STEPS[current];

  return (
    <div className="space-y-6">
      <Header existing={existing} />

      {/* Progress bar */}
      <div className="rounded-2xl border border-token bg-[var(--card)] p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold opacity-70">Step {current + 1} of {STEPS.length}</span>
          <span className="font-mono">{done.size}/{STEPS.length} done · {Math.round((done.size / STEPS.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-aws-orange transition-all"
            style={{ width: `${(done.size / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const isDone = done.has(i);
            const isCurr = i === current;
            return (
              <button
                key={s.id}
                onClick={() => go(i)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  isCurr ? 'bg-gradient-aws text-ink-950' :
                  isDone ? 'bg-success/15 text-success hover:bg-success/25' :
                  'bg-[var(--card-2)] opacity-60 hover:opacity-100'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                  isCurr ? 'bg-black/20' : isDone ? 'bg-success/40' : 'bg-[var(--card)]'
                }`}>
                  {isDone ? <Check size={9} /> : i + 1}
                </span>
                <span className="max-w-[160px] truncate">{s.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current step card */}
      {!allDone && <StepCard step={step} idx={current} onMarkDone={() => markAndNext(current)} onPrev={() => go(current - 1)} onNext={() => go(current + 1)} isFirst={current === 0} isLast={current === STEPS.length - 1} />}

      {allDone && <DoneCard />}
    </div>
  );
}

function Header({ existing }) {
  const sev = expirySeverity(existing?.expiresAt);
  const label = expiryLabel(existing?.expiresAt);
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="p-2 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
          <RefreshCw size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Renew your GitHub token</h1>
          <p className="text-sm opacity-80 mt-1 max-w-2xl">
            Step-by-step renewal. Each step is one click or one paste. Takes about 90 seconds end to end.
          </p>
        </div>
        {existing?.token && (
          <div className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ${
            sev === 'expired' ? 'bg-danger/15 text-danger' :
            sev === 'critical' || sev === 'urgent' ? 'bg-warning/15 text-warning' :
            sev === 'aging' ? 'bg-electric/15 text-electric' :
            sev === 'fresh' ? 'bg-success/15 text-success' :
            'bg-[var(--card-2)] text-muted'
          }`}>
            {sev === 'expired' ? <AlertTriangle size={11} /> : <KeyRound size={11} />}
            Current token: {label}
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ step, idx, onMarkDone, onPrev, onNext, isFirst, isLast }) {
  return (
    <div className="rounded-3xl border border-token bg-[var(--card)] p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-aws text-ink-950 flex items-center justify-center font-bold text-lg">
          {idx + 1}
        </div>
        <h2 className="text-xl font-bold tracking-tight flex-1 mt-2">{step.title}</h2>
      </div>

      {/* Actions */}
      <ol className="space-y-2 pl-2">
        {step.actions.map((a, i) => {
          if (a.kind === 'link') {
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-1 w-5 h-5 rounded-full bg-aws-orange/15 border border-aws-orange/40 text-aws-orange text-[10px] font-extrabold grid place-items-center">
                  {String.fromCharCode(97 + i)}
                </span>
                <a
                  href={a.href} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-aws-orange/15 text-aws-orange hover:bg-aws-orange/25 border border-aws-orange/30 font-bold text-sm"
                >
                  <ExternalLink size={12} /> {a.label}
                </a>
              </li>
            );
          }
          if (a.kind === 'warning') {
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-1 w-5 h-5 rounded-full bg-warning/15 border border-warning/40 text-warning text-[10px] font-extrabold grid place-items-center">
                  !
                </span>
                <span className="text-sm text-warning"><strong>Watch out:</strong> {a.value}</span>
              </li>
            );
          }
          if (a.kind === 'inline' && a.component === 'paste-form') {
            return <li key={i} className="pl-7"><PasteTokenForm /></li>;
          }
          return (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 mt-1 w-5 h-5 rounded-full bg-aws-orange/15 border border-aws-orange/40 text-aws-orange text-[10px] font-extrabold grid place-items-center">
                {String.fromCharCode(97 + i)}
              </span>
              <span className="text-sm">{a.value}</span>
            </li>
          );
        })}
      </ol>

      {/* Checkpoint */}
      <div className="mt-4 rounded-xl border border-success/30 bg-success/[0.06] p-3 flex items-start gap-2">
        <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-success">Checkpoint</div>
          <p className="text-sm mt-0.5">{step.checkpoint}</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="mt-5 flex justify-between gap-2">
        <Button variant="ghost" icon={ArrowLeft} onClick={onPrev} disabled={isFirst}>Previous</Button>
        <Button variant="primary" iconRight={ArrowRight} onClick={onMarkDone}>
          {isLast ? 'Finish' : 'Mark done & next'}
        </Button>
      </div>
    </div>
  );
}

/**
 * The final-step paste form — saves new token + records new expiry,
 * then verifies live.
 */
function PasteTokenForm() {
  const toast = useToast();
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function saveAndVerify() {
    if (!token.trim().startsWith('github_pat_')) {
      toast.error('That doesn\'t look like a fine-grained PAT — it should start with "github_pat_".');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      writeToken({
        token: token.trim(),
        expiresAt: expiresAt || null,
        savedAt: new Date().toISOString(),
      });
      const v = await verifyToken();
      setResult(v);
      if (v.ok) toast.success(`Token saved & verified — @${v.user.login}`);
      else      toast.error(`Saved but verification failed: ${v.message}`);
    } catch (err) {
      setResult({ ok: false, message: err.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-4 space-y-3 mt-2">
      <div className="text-sm font-bold flex items-center gap-2">
        <Github size={14} /> Paste your new token here
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1 block">New token</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="github_pat_..."
          className="w-full bg-[var(--card)] border border-token rounded-md px-3 py-2 text-sm font-mono focus:border-aws-orange focus:outline-none"
        />
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1 block">New expiry date</label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="bg-[var(--card)] border border-token rounded-md px-3 py-2 text-sm focus:border-aws-orange focus:outline-none"
        />
        <p className="text-[10px] opacity-60 mt-1">The exact date GitHub showed for this token's expiry.</p>
      </div>

      <Button variant="primary" onClick={saveAndVerify} disabled={busy || !token}>
        {busy ? 'Saving & verifying…' : 'Save + verify'}
      </Button>

      {result && (
        <div className={`rounded-lg border p-3 text-sm ${
          result.ok ? 'border-success/40 bg-success/[0.06] text-success' : 'border-danger/40 bg-danger/[0.06] text-danger'
        }`}>
          {result.ok
            ? <span><CheckCircle2 size={12} className="inline mr-1" /> Verified — authenticated as <strong>@{result.user?.login}</strong>.</span>
            : <span><AlertTriangle size={12} className="inline mr-1" /> {result.message}</span>}
        </div>
      )}
    </div>
  );
}

function DoneCard() {
  return (
    <div className="rounded-3xl border-2 border-success/40 bg-success/[0.05] p-8 text-center">
      <div className="inline-flex w-16 h-16 rounded-full bg-success/20 text-success items-center justify-center mb-4">
        <ShieldCheck size={32} />
      </div>
      <h2 className="text-2xl font-bold mb-1">Token renewed 🎉</h2>
      <p className="text-sm opacity-80 mb-4 max-w-md mx-auto">
        Your new token is saved + verified. The expiry banner will reset based on your new expiry date.
        You can close this page.
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <Link to="/readiness"><Button variant="primary" icon={ShieldCheck}>Open Readiness check</Button></Link>
        <Link to="/settings"><Button variant="ghost" icon={KeyRound}>Open Settings</Button></Link>
      </div>
    </div>
  );
}
