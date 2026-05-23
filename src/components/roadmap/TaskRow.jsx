import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertOctagon, Brain, Check, ChevronDown, ChevronLeft, ChevronRight,
  Clock, ExternalLink, FileText, Timer as TimerIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { PRIORITY_META } from '../../data/roadmap.js';
import { cn } from '../../lib/utils.js';
import { AnimatedCheckbox } from './AnimatedCheckbox.jsx';
import { StepGuide } from '../portfolio/StepGuide.jsx';

export function TaskRow({
  task, phaseId, defaultExpanded = false,
  positionLabel, prevTaskId, nextTaskId,
}) {
  const { getTaskState, state, toggleSubtask, setActiveTaskId, elapsedSeconds } = useRoadmap();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rootRef = useRef(null);

  /** Collapse this task + scroll to + open another task in the same phase. */
  const jumpTo = (targetTaskId) => {
    if (!targetTaskId) return;
    setExpanded(false);
    // Slight delay so the collapse animation completes before we scroll.
    setTimeout(() => {
      const el = document.getElementById(`task-row-${targetTaskId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Tell the target row to open by dispatching a custom event it listens for.
      el.dispatchEvent(new CustomEvent('task-row:open', { bubbles: true }));
    }, 200);
  };

  // Listen for the open-request event dispatched by a sibling row's "Next" / "Previous" button.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const handler = () => setExpanded(true);
    el.addEventListener('task-row:open', handler);
    return () => el.removeEventListener('task-row:open', handler);
  }, []);
  const ts = getTaskState(task);
  const blocked = state.taskBlocked[task.id]?.blocked;
  const noteCount = (state.taskNotes[task.id] || '').trim().length;
  const seconds = elapsedSeconds(task.id);
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.later;

  return (
    <div
      ref={rootRef}
      id={`task-row-${task.id}`}
      className={cn(
        'group rounded-2xl border transition-colors scroll-mt-20',
        ts.status === 'complete' ? 'border-success/40 bg-success/[0.04]'
          : blocked ? 'border-danger/40 bg-danger/[0.04]'
          : 'border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)]'
      )}
    >
      <div className="flex items-start gap-3 p-3 sm:p-4">
        <div className="pt-0.5">
          <AnimatedCheckbox
            checked={ts.status === 'complete'}
            onChange={(e) => {
              // Convenience: ticking a partially done task ticks every remaining subtask
              const remaining = task.subtasks.filter((s) => !state.subtasks[s.id]);
              if (remaining.length === 0) {
                // un-tick all (un-complete)
                task.subtasks.forEach((s) => toggleSubtask(s.id, task.id, phaseId, e));
              } else {
                remaining.forEach((s) => toggleSubtask(s.id, task.id, phaseId, e));
              }
            }}
            ariaLabel={`Mark task ${task.title} complete`}
          />
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 text-left focus-ring rounded-lg -m-1 p-1"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className={cn(
                'text-sm sm:text-base font-bold tracking-tight leading-snug',
                ts.status === 'complete' && 'line-through text-muted'
              )}>
                {task.title}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span className={cn('chip border', priority.color)}>{priority.label}</span>
                <span className="inline-flex items-center gap-1"><Clock size={12} />{formatMinutes(task.minutes)}</span>
                <span>{ts.done}/{ts.total} subtasks</span>
                {seconds > 0 && (
                  <span className="inline-flex items-center gap-1 text-aws-orange">
                    <TimerIcon size={12} />{formatSeconds(seconds)}
                  </span>
                )}
                {noteCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <FileText size={12} />notes
                  </span>
                )}
                {blocked && (
                  <span className="inline-flex items-center gap-1 text-danger font-semibold">
                    <AlertOctagon size={12} />Blocked
                  </span>
                )}
              </div>
            </div>
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 text-muted"
            >
              <ChevronDown size={18} />
            </motion.span>
          </div>

          {/* mini progress bar */}
          <div className="mt-2 h-1 rounded-full bg-[var(--border)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-aws"
              initial={false}
              animate={{ width: `${ts.percent}%` }}
              transition={{ type: 'spring', stiffness: 80, damping: 22 }}
            />
          </div>
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); setActiveTaskId(task.id); }}
          className="self-stretch px-2 sm:px-3 grid place-items-center rounded-lg text-muted hover:text-aws-orange hover:bg-[var(--card)] focus-ring transition"
          aria-label="Open task details"
          title="Open details"
        >
          <ExternalLink size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-4 space-y-3">
              {/* 1. LEARN FIRST — study note opens by default with full content */}
              <StepGuide step={task} defaultOpen={true} />

              {/* 2. Quick actions — AI help + side panel */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const subList = (task.subtasks || []).map((s) => `- ${s.title}`).join('\n');
                    const q = `Walk me through how to complete this roadmap task step by step:\n\n` +
                              `**${task.title}**\n${task.description || ''}\n\n` +
                              `Subtasks:\n${subList}\n\n` +
                              `Give Console clicks AND AWS CLI commands for each subtask.`;
                    try { sessionStorage.setItem('ai-assistant:prefill', q); } catch {}
                    navigate('/ai/assistant');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-aws-orange/30 bg-aws-orange/10 text-aws-orange px-2.5 py-1.5 text-[11px] font-extrabold hover:bg-aws-orange/15 focus-ring"
                >
                  <Brain size={12} /> Ask AI for help
                </button>
                <button
                  onClick={() => setActiveTaskId(task.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-token bg-[var(--card)] px-2.5 py-1.5 text-[11px] font-bold text-muted hover:text-current hover:border-aws-orange/40 focus-ring"
                >
                  <ExternalLink size={12} /> Notes, timer, resources
                </button>
              </div>

              {/* 3. NOW DO IT — subtask checklist (separated visually) */}
              <div className="rounded-xl border border-token bg-[var(--card)] p-3 space-y-2">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-aws-orange" />
                  Tick subtasks as you complete them
                </div>
                <ul className="space-y-1.5">
                  {task.subtasks.map((s) => {
                    const done = !!state.subtasks[s.id];
                    return (
                      <li key={s.id} className="flex items-center gap-3">
                        <AnimatedCheckbox
                          checked={done}
                          size={18}
                          onChange={(e) => toggleSubtask(s.id, task.id, phaseId, e)}
                        />
                        <span className={cn(
                          'text-sm leading-snug select-none',
                          done && 'line-through text-muted'
                        )}>
                          {s.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* 4. PREV / NEXT NAVIGATION — never lose your place */}
              {(prevTaskId || nextTaskId || positionLabel) && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-token mt-1 pt-3">
                  <button
                    onClick={() => jumpTo(prevTaskId)}
                    disabled={!prevTaskId}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition',
                      prevTaskId
                        ? 'border border-token text-muted hover:text-current hover:border-aws-orange/40'
                        : 'opacity-30 cursor-not-allowed border border-token text-muted',
                    )}
                    aria-label="Previous task"
                  >
                    <ChevronLeft size={12} /> Previous
                  </button>
                  <div className="text-[10px] font-bold text-muted whitespace-nowrap">
                    {positionLabel || ''}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {nextTaskId && ts.status !== 'complete' && (
                      <button
                        onClick={() => {
                          // Mark every subtask complete then jump
                          const remaining = task.subtasks.filter((s) => !state.subtasks[s.id]);
                          remaining.forEach((s) => toggleSubtask(s.id, task.id, phaseId));
                          jumpTo(nextTaskId);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold bg-success/15 text-success border border-success/30 hover:bg-success/20 focus-ring"
                        title="Mark all subtasks complete and move to the next task"
                      >
                        <Check size={12} /> Complete + next
                      </button>
                    )}
                    <button
                      onClick={() => jumpTo(nextTaskId)}
                      disabled={!nextTaskId}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition',
                        nextTaskId
                          ? 'border border-aws-orange/40 bg-aws-orange/10 text-aws-orange hover:bg-aws-orange/15'
                          : 'opacity-30 cursor-not-allowed border border-token text-muted',
                      )}
                      aria-label="Next task"
                    >
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function formatMinutes(m) {
  if (m >= 60) {
    const h = m / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  }
  return `${m}m`;
}

function formatSeconds(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}
