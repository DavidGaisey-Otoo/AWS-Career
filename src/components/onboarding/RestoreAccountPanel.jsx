/**
 * RestoreAccountPanel — "I already have an account."
 *
 * Shown first, before onboarding asks anyone to invent a profile. Opening
 * the app on a new device or origin previously offered only one route —
 * create a new account — which quietly produced a second identity with
 * its own progress instead of retrieving the real one.
 *
 * The connect flow itself lives in ConnectGithubInline, shared with the
 * sync modal, so there is one implementation of "show a device code and
 * wait for approval" rather than one per entry point.
 */
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Github } from '../common/BrandIcons.jsx';
import { ConnectGithubInline } from '../sync/ConnectGithubInline.jsx';

export function RestoreAccountPanel({ onStartFresh }) {
  const [nothingToRestore, setNothingToRestore] = useState(false);

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

      <ConnectGithubInline
        label="Restore my account from GitHub"
        onDone={(result) => {
          // Connected, but this GitHub account has never pushed a snapshot.
          // Say so plainly instead of leaving them wondering what happened.
          if (!result?.restored) setNothingToRestore(true);
        }}
      />

      {nothingToRestore && (
        <p className="text-[12px] text-amber-400 text-center leading-relaxed">
          GitHub connected, but there is no saved data on this account yet.
          Set up below — from now on it will sync everywhere.
        </p>
      )}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted">or</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <button
        onClick={onStartFresh}
        className="w-full text-center text-sm font-bold text-muted hover:text-aws-orange inline-flex items-center justify-center gap-1.5"
      >
        I'm new here — set up a new account <ArrowRight size={14} />
      </button>
    </div>
  );
}
