/**
 * WalkthroughViewer.jsx — the step-by-step UI.
 *
 * Layout rules (from user direction):
 *   • One step per visible block, never a wall of text.
 *   • Big numbered chip, title, action arrow.
 *   • Direct URL button if the step opens a console page.
 *   • Screenshot hint, tip, warning rendered as distinct callouts.
 *   • Checkpoint check-box at the bottom — user toggles when done.
 *   • Tracking persists per-walkthrough in localStorage so progress survives reload.
 *   • "Next ↓" + "Done" + global progress bar.
 *
 * Inputs:
 *   • walkthrough — the WALKTHROUGHS[<id>] object
 *   • onComplete  — optional callback when all checkpoints ticked
 *   • compact     — boolean, hides intro/outcome for embedding
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Circle, ExternalLink, Lightbulb, AlertTriangle,
  Camera, ClipboardCopy, ChevronDown, ChevronUp, Target, Clock,
  ArrowRight, BookOpen, Trophy,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { useToast } from '../../context/ToastContext.jsx';

export function WalkthroughViewer({ walkthrough, onComplete, compact = false }) {
  const [progress, setProgress] = useLocalStorage(
    `${STORAGE_KEY}::walkthrough::${walkthrough.id}`,
    { done: [], startedAt: null, completedAt: null }
  );
  const toast = useToast();

  const doneSet = useMemo(() => new Set(progress.done || []), [progress.done]);
  const pct = Math.round((doneSet.size / walkthrough.steps.length) * 100);
  const allDone = doneSet.size === walkthrough.steps.length;

  function toggle(stepN) {
    setProgress((p) => {
      const set = new Set(p.done || []);
      if (set.has(stepN)) set.delete(stepN);
      else set.add(stepN);
      const next = {
        ...p,
        done: [...set].sort((a, b) => a - b),
        startedAt: p.startedAt || new Date().toISOString(),
        completedAt: set.size === walkthrough.steps.length ? new Date().toISOString() : null,
      };
      if (set.size === walkthrough.steps.length && !p.completedAt) {
        toast.success(`🏆 Walkthrough complete: ${walkthrough.title}`);
        onComplete?.();
      }
      return next;
    });
  }

  return (
    <div className="space-y-5">
      {!compact && <Header w={walkthrough} pct={pct} doneCount={doneSet.size} />}

      {/* Sticky progress bar */}
      <div className="sticky top-0 z-20 -mx-2 px-2 py-2 backdrop-blur-md bg-[var(--bg)]/80 border-b border-token">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="font-bold opacity-70">Progress</span>
          <span className="font-mono">{doneSet.size} / {walkthrough.steps.length} ({pct}%)</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-[var(--brand)]"
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {walkthrough.steps.map((step, idx) => {
          const done = doneSet.has(step.n);
          const next = walkthrough.steps[idx + 1];
          return (
            <StepCard
              key={step.n}
              step={step}
              done={done}
              onToggle={() => toggle(step.n)}
              hasNext={!!next}
            />
          );
        })}
      </div>

      {allDone && !compact && (
        <CompletionCard w={walkthrough} />
      )}
    </div>
  );
}

// ---------------- header ----------------

function Header({ w, pct, doneCount }) {
  const diffStyle = {
    beginner: 'bg-emerald-500/15 text-emerald-300',
    intermediate: 'bg-amber-500/15 text-amber-300',
    advanced: 'bg-rose-500/15 text-rose-300',
  };
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/8 via-transparent to-transparent p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">
            <span>{w.category}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Clock size={10} /> {w.estimateMin} min</span>
            <span>•</span>
            <span className={`px-1.5 py-0.5 rounded ${diffStyle[w.difficulty] || ''}`}>{w.difficulty}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{w.title}</h1>
          <p className="text-sm opacity-80 mt-2 max-w-2xl">{w.intro}</p>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-60">Done</div>
          <div className="text-3xl font-bold tabular-nums">{pct}%</div>
        </div>
      </div>

      {w.prerequisites?.length > 0 && (
        <div className="mt-4 rounded-2xl bg-[var(--card)] border border-token p-4">
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-2">Before you start</div>
          <ul className="space-y-1 text-sm">
            {w.prerequisites.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <Target size={12} className="shrink-0 mt-1 opacity-50" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------- step card ----------------

function StepCard({ step, done, onToggle, hasNext }) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!step.code) return;
    try {
      await navigator.clipboard.writeText(step.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <motion.div
      layout
      className={`rounded-2xl border transition-all ${
        done ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-token bg-[var(--card)]'
      }`}
    >
      <div className="flex items-stretch">
        {/* Number chip column */}
        <div className="shrink-0 w-14 flex flex-col items-center pt-4">
          <button
            onClick={onToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
              done
                ? 'bg-emerald-500 text-black'
                : 'bg-[var(--card-2)] hover:bg-[var(--card-3)] text-[var(--text)]'
            }`}
            aria-label={done ? 'Mark incomplete' : 'Mark done'}
          >
            {done ? <CheckCircle2 size={18} /> : step.n}
          </button>
          {/* Connector line to next step */}
          {hasNext && (
            <div className={`w-0.5 flex-1 mt-2 mb-1 ${done ? 'bg-emerald-500/40' : 'bg-[var(--border)]'}`} />
          )}
        </div>

        {/* Content column */}
        <div className="flex-1 min-w-0 p-4 pl-2">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <h3 className={`text-base font-bold ${done ? 'line-through opacity-60' : ''}`}>
              {step.title}
            </h3>
            <button onClick={() => setExpanded((e) => !e)} className="p-1 rounded hover:bg-[var(--card-2)] opacity-50 shrink-0">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {expanded && (
            <div className="space-y-3">
              {/* Body */}
              {step.body && (
                <p className="text-sm opacity-90 leading-relaxed">{step.body}</p>
              )}

              {/* Action button (direct URL) */}
              {step.action?.type === 'goto' && step.action.url && (
                <a
                  href={step.action.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand)] text-black font-bold text-sm hover:brightness-110 transition-all"
                >
                  <ExternalLink size={14} />
                  Open in AWS Console
                  <ArrowRight size={14} />
                </a>
              )}

              {/* Screenshot hint */}
              {step.screenshot && (
                <Callout icon={Camera} tone="info" title="What you should see">
                  {step.screenshot}
                </Callout>
              )}

              {/* Tip */}
              {step.tip && (
                <Callout icon={Lightbulb} tone="tip" title="Tip">
                  {step.tip}
                </Callout>
              )}

              {/* Warning */}
              {step.warning && (
                <Callout icon={AlertTriangle} tone="warn" title="Watch out">
                  {step.warning}
                </Callout>
              )}

              {/* Code block */}
              {step.code && (
                <div className="rounded-xl border border-token overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--card-2)] border-b border-token">
                    <span className="text-[10px] font-mono opacity-60 uppercase">Code</span>
                    <button onClick={copyCode} className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--card)]">
                      <ClipboardCopy size={10} /> {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="px-3 py-2 text-xs font-mono whitespace-pre-wrap overflow-auto">{step.code}</pre>
                </div>
              )}

              {/* Checkpoint */}
              {step.checkpoint && (
                <div className="rounded-xl bg-[var(--card-2)]/40 border border-token p-3 flex items-start gap-3">
                  <button
                    onClick={onToggle}
                    className="shrink-0 mt-0.5"
                    aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {done
                      ? <CheckCircle2 size={18} className="text-emerald-400" />
                      : <Circle size={18} className="opacity-50" />}
                  </button>
                  <div className="flex-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">Checkpoint</div>
                    <div className="text-sm">{step.checkpoint}</div>
                  </div>
                  <Button
                    variant={done ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={onToggle}
                  >
                    {done ? 'Mark incomplete' : 'Mark done'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Callout({ icon: Icon, tone, title, children }) {
  const tones = {
    info: 'bg-sky-500/8 border-sky-500/30 text-sky-200',
    tip:  'bg-amber-500/8 border-amber-500/30 text-amber-200',
    warn: 'bg-rose-500/8 border-rose-500/30 text-rose-200',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold opacity-90 mb-1">
        <Icon size={11} />
        {title}
      </div>
      <div className="text-xs opacity-90">{children}</div>
    </div>
  );
}

function CompletionCard({ w }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6"
    >
      <div className="flex items-start gap-3">
        <div className="p-3 rounded-2xl bg-emerald-500/15">
          <Trophy size={22} className="text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold">All steps complete! 🎉</h3>
          <p className="text-sm opacity-80 mt-1">{w.outcome}</p>
          {w.nextId && (
            <p className="text-xs opacity-70 mt-3">
              Next walkthrough: <a className="underline font-bold" href={`/walkthroughs/${w.nextId}`}>{w.nextId}</a>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
