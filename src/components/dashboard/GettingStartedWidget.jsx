import { motion } from 'framer-motion';
import {
  ArrowRight, Check, Cloud, Code, FolderKanban, GraduationCap, Linkedin,
  Rocket, ShieldCheck, Sparkles, Terminal, User, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { useAWS } from '../../context/AWSContext.jsx';
import { useExam } from '../../context/ExamContext.jsx';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { cn } from '../../lib/utils.js';

const DISMISS_KEY = 'awscl-pro::v1::getting-started-dismissed';

/**
 * Getting Started — the ordered onboarding checklist.
 *
 * Auto-detects what the user has done across 5 contexts and highlights
 * the single next action. Disappears once complete (or when dismissed).
 */
export function GettingStartedWidget() {
  const { profile } = useApp();
  const aws = useAWS();
  const portfolio = usePortfolio();
  const exam = useExam();
  const roadmap = useRoadmap();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  const subtasksDone = roadmap.state.subtasks || {};
  const taskHasAnyProgress = (taskId) => {
    // Each task has subtasks like p1-t1-s1, p1-t1-s2…
    return Object.keys(subtasksDone).some((k) => k.startsWith(taskId + '-s') && subtasksDone[k]);
  };
  const taskFullyDone = (taskId, totalSubs) => {
    let done = 0;
    for (let i = 1; i <= totalSubs; i++) if (subtasksDone[`${taskId}-s${i}`]) done += 1;
    return done >= totalSubs;
  };

  const anyConnectedProfile =
    aws?.state?.profiles?.free?.connected || aws?.state?.profiles?.client?.connected;

  const anyCertHasPlan =
    Object.values(exam?.state?.certs || {}).some((c) => c?.studyPlan?.tasks?.length > 0);

  const anyProjectInProgress =
    Object.values(portfolio?.state?.projects || {}).some(
      (p) => p?.status === 'in-progress' || p?.status === 'complete' || p?.status === 'review',
    );

  // ---------- step list ----------
  const steps = useMemo(() => ([
    {
      id: 'profile',
      label: 'Fill out your profile',
      blurb: 'Name, email, GitHub, LinkedIn — auto-fills across the app.',
      icon: User,
      done: !!profile?.name && profile.name.length > 1,
      to: '/settings',
    },
    {
      id: 'cert-target',
      label: 'Pick your target certification',
      blurb: 'Set an exam date so the study plan can pace you.',
      icon: GraduationCap,
      done: !!profile?.goal && anyCertHasPlan,
      to: '/exam',
    },
    {
      id: 'aws-account',
      label: 'Create AWS Free Tier account',
      blurb: 'Sign up at aws.amazon.com/free — 10-15 minutes.',
      icon: Cloud,
      done: taskFullyDone('p1-t1', 5),
      inProgress: taskHasAnyProgress('p1-t1'),
      to: '/roadmap',
    },
    {
      id: 'mfa-billing',
      label: 'Enable MFA + set $5 billing alarm',
      blurb: 'Do this BEFORE anything else. Critical security step.',
      icon: ShieldCheck,
      // We approximate completion: if the user has linked an account, they likely set up MFA
      // For a stricter check, we'd add explicit subtasks. For now: linked + AWS account task complete.
      done: anyConnectedProfile && taskFullyDone('p1-t1', 5),
      to: '/roadmap',
    },
    {
      id: 'dev-env',
      label: 'Install dev tools (VS Code, Git, AWS CLI, Terraform)',
      blurb: 'Your local toolchain. Spend 30 min here, save 30 hours later.',
      icon: Terminal,
      done: taskFullyDone('p1-t5', 7),
      inProgress: taskHasAnyProgress('p1-t5'),
      to: '/roadmap',
    },
    {
      id: 'link-aws',
      label: 'Link your AWS account in this app',
      blurb: 'Paste IAM access keys → test connection. Adds an active profile.',
      icon: Cloud,
      done: !!anyConnectedProfile,
      to: '/aws-accounts',
    },
    {
      id: 'github',
      label: 'Set up GitHub profile',
      blurb: 'Your public engineering presence.',
      icon: Code,
      done: !!profile?.integrations?.github && taskHasAnyProgress('p1-t2'),
      inProgress: !!profile?.integrations?.github || taskHasAnyProgress('p1-t2'),
      to: '/roadmap',
    },
    {
      id: 'linkedin',
      label: 'Set up LinkedIn profile',
      blurb: 'The single most important profile for UK/EU hiring.',
      icon: Linkedin,
      done: !!profile?.integrations?.linkedin && taskHasAnyProgress('p1-t3'),
      inProgress: !!profile?.integrations?.linkedin || taskHasAnyProgress('p1-t3'),
      to: '/roadmap',
    },
    {
      id: 'first-project',
      label: 'Start your first project',
      blurb: 'Project 1 (S3 Static Website) is the easiest first build.',
      icon: FolderKanban,
      done: !!anyProjectInProgress,
      to: '/portfolio',
    },
  ]), [profile, anyConnectedProfile, anyCertHasPlan, anyProjectInProgress, subtasksDone]); // eslint-disable-line

  const totalSteps = steps.length;
  const doneCount  = steps.filter((s) => s.done).length;
  const nextStep   = steps.find((s) => !s.done);
  const allDone    = doneCount === totalSteps;

  // ---------- render ----------

  if (dismissed) return null;
  if (allDone) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="surface rounded-2xl p-5 border-success/40 bg-success/5 flex items-start gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-success grid place-items-center text-white shrink-0">
          <Rocket size={18} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-extrabold tracking-tight text-success">Setup complete!</h3>
          <p className="text-[12px] text-muted mt-1 leading-relaxed">
            All 9 onboarding steps done. You're ready to build. Use the Roadmap, Portfolio, and Exam Center as your daily home.
          </p>
        </div>
        <button
          onClick={() => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch {} setDismissed(true); }}
          className="rounded-lg p-1.5 text-muted hover:text-current focus-ring"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl overflow-hidden gradient-border relative"
    >
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 shadow-glow-orange shrink-0">
            <Rocket size={18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold tracking-tight">Getting started</h3>
              <span className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange text-[10px] font-extrabold">
                {doneCount} / {totalSteps} done
              </span>
            </div>
            <p className="text-[12px] text-muted mt-0.5 leading-relaxed">
              Complete these <strong className="text-current">9 setup steps</strong> in order before starting projects.
              Each one auto-ticks when you finish it elsewhere in the app.
            </p>
          </div>
          <button
            onClick={() => { try { localStorage.setItem(DISMISS_KEY, '1'); } catch {} setDismissed(true); }}
            className="rounded-lg p-1.5 text-muted hover:text-current focus-ring"
            aria-label="Dismiss setup checklist"
            title="Hide this checklist"
          >
            <X size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-aws"
            initial={false}
            animate={{ width: `${(doneCount / totalSteps) * 100}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 22 }}
          />
        </div>

        {/* NEXT STEP highlight */}
        {nextStep && (
          <Link
            to={nextStep.to}
            className="block rounded-xl border border-aws-orange/40 bg-aws-orange/10 p-3 hover:bg-aws-orange/15 transition focus-ring group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-aws-orange text-ink-950 grid place-items-center shrink-0">
                <nextStep.icon size={16} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                  <Sparkles size={9} className="inline mr-1" /> Your next step
                </div>
                <div className="text-sm font-extrabold tracking-tight">{nextStep.label}</div>
                <div className="text-[11px] text-muted leading-snug mt-0.5">{nextStep.blurb}</div>
              </div>
              <ArrowRight size={14} className="text-aws-orange shrink-0 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        )}

        {/* Full ordered list */}
        <details className="group">
          <summary className="cursor-pointer text-[11px] font-extrabold text-muted hover:text-current inline-flex items-center gap-1 select-none">
            <ArrowRight size={10} className="group-open:rotate-90 transition" />
            Show all {totalSteps} steps
          </summary>
          <ol className="mt-2 space-y-1.5">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const state = s.done ? 'done' : s.inProgress ? 'in-progress' : 'pending';
              return (
                <li key={s.id}>
                  <Link
                    to={s.to}
                    className="flex items-start gap-2.5 rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5 hover:border-aws-orange/40 transition focus-ring group"
                  >
                    <span className={cn(
                      'w-5 h-5 rounded-md grid place-items-center text-[10px] font-black shrink-0 mt-0.5',
                      state === 'done'        ? 'bg-success text-white'
                        : state === 'in-progress' ? 'bg-aws-orange/15 text-aws-orange border border-aws-orange/40'
                        : 'bg-[var(--card)] text-muted border border-token',
                    )}>
                      {state === 'done' ? <Check size={11} /> : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        'text-[12px] font-extrabold leading-snug',
                        state === 'done' && 'line-through text-muted',
                      )}>
                        <Icon size={10} className="inline mr-1 text-aws-orange align-baseline" />
                        {s.label}
                      </div>
                      <div className="text-[10px] text-muted leading-snug mt-0.5">{s.blurb}</div>
                    </div>
                    {state === 'in-progress' && (
                      <span className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange text-[9px] font-bold shrink-0">
                        In progress
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </details>
      </div>
    </motion.section>
  );
}
