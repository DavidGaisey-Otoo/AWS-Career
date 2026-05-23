import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertOctagon, BookOpen, Brain, Check, ExternalLink, Pause, Play, RotateCcw,
  Sparkles, Square, Timer as TimerIcon, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROADMAP, PRIORITY_META, DIFFICULTY_LABEL } from '../../data/roadmap.js';
import { cn } from '../../lib/utils.js';
import { AnimatedCheckbox } from './AnimatedCheckbox.jsx';
import { DifficultyStars } from './DifficultyStars.jsx';
import { StepGuide } from '../portfolio/StepGuide.jsx';

export function TaskDetailPanel() {
  const {
    activeTaskId, setActiveTaskId, state,
    toggleSubtask, startTimer, stopTimer, resetTimer, isTimerRunning, elapsedSeconds,
    setTaskNotes, setTaskDifficulty, setTaskBlocked,
  } = useRoadmap();
  const toast = useToast();
  const navigate = useNavigate();

  const lookup = useMemo(() => {
    if (!activeTaskId) return null;
    for (const phase of ROADMAP) {
      const task = phase.tasks.find((t) => t.id === activeTaskId);
      if (task) return { phase, task };
    }
    return null;
  }, [activeTaskId]);

  // Close on ESC
  useEffect(() => {
    if (!activeTaskId) return;
    const onKey = (e) => { if (e.key === 'Escape') setActiveTaskId(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTaskId, setActiveTaskId]);

  const [blockedReason, setBlockedReason] = useState('');
  useEffect(() => {
    setBlockedReason(state.taskBlocked[activeTaskId]?.reason || '');
  }, [activeTaskId, state.taskBlocked]);

  const task = lookup?.task;
  const phase = lookup?.phase;
  const running = task ? isTimerRunning(task.id) : false;
  const seconds = task ? elapsedSeconds(task.id) : 0;
  const notes = task ? (state.taskNotes[task.id] || '') : '';
  const difficulty = task ? (state.taskDifficulty[task.id] || task.difficulty || 0) : 0;
  const blocked = task ? !!state.taskBlocked[task.id]?.blocked : false;
  const priority = task ? (PRIORITY_META[task.priority] || PRIORITY_META.later) : null;

  const aiHint = () => {
    if (!task) return;
    // Pre-fill the AI Study Assistant with a useful question for this task.
    const subList = (task.subtasks || []).map((s) => `- ${s.title}`).join('\n');
    const q = `Walk me through how to complete this roadmap task step by step:\n\n` +
              `**${task.title}**\n${task.description || ''}\n\n` +
              `Subtasks:\n${subList}\n\n` +
              `Give Console clicks AND AWS CLI commands for each subtask.`;
    try { sessionStorage.setItem('ai-assistant:prefill', q); } catch {}
    setActiveTaskId(null);
    navigate('/ai/assistant');
  };

  return (
    <AnimatePresence>
      {task ? (
        <motion.div
          className="fixed inset-0 z-[85]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-panel-title"
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
            onClick={() => setActiveTaskId(null)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute right-0 top-0 bottom-0 w-full sm:max-w-[520px] surface !shadow-none border-l border-token flex flex-col"
          >
            {/* header */}
            <div className="px-5 py-4 border-b border-token flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-extrabold text-aws-orange">
                  {phase.title}
                </div>
                <h2 id="task-panel-title" className="text-lg sm:text-xl font-extrabold tracking-tight leading-tight mt-0.5">
                  {task.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className={cn('chip border', priority.color)}>{priority.label}</span>
                  <span className="chip bg-[var(--card-2)] border border-token text-muted">
                    <BookOpen size={11} /> {DIFFICULTY_LABEL[task.difficulty] || 'Medium'}
                  </span>
                  <span className="chip bg-[var(--card-2)] border border-token text-muted">
                    ⏱ {task.minutes >= 60 ? `${(task.minutes / 60).toFixed(task.minutes % 60 ? 1 : 0)}h` : `${task.minutes}m`} est
                  </span>
                </div>
              </div>
              <button
                onClick={() => setActiveTaskId(null)}
                className="rounded-xl p-2 hover:bg-[var(--card-2)] focus-ring"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {task.description ? (
                <p className="text-sm text-muted leading-relaxed">{task.description}</p>
              ) : null}

              {/* Step-by-step walkthrough (Console + CLI + Verify + docs) */}
              <SectionCard title="How to do this" icon={Sparkles}>
                <StepGuide step={task} />
              </SectionCard>

              {/* timer */}
              <SectionCard title="Timer" icon={TimerIcon}>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-black tracking-tight tabular-nums">
                    {formatHMS(seconds)}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {!running ? (
                      <button
                        onClick={() => startTimer(task.id)}
                        className="btn btn-primary !px-3 !py-2"
                      >
                        <Play size={14} /> Start
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => stopTimer(task.id)}
                          className="btn btn-ghost !px-3 !py-2"
                        >
                          <Pause size={14} /> Pause
                        </button>
                        <button
                          onClick={() => stopTimer(task.id)}
                          className="btn btn-ghost !px-3 !py-2"
                          title="Stop and save"
                        >
                          <Square size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => resetTimer(task.id)}
                      className="btn btn-ghost !px-3 !py-2"
                      title="Reset"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              </SectionCard>

              {/* subtasks */}
              <SectionCard title={`Subtasks (${task.subtasks.filter(s => state.subtasks[s.id]).length}/${task.subtasks.length})`} icon={Check}>
                <ul className="space-y-2">
                  {task.subtasks.map((s) => {
                    const done = !!state.subtasks[s.id];
                    return (
                      <li key={s.id} className="flex items-start gap-3">
                        <div className="pt-0.5">
                          <AnimatedCheckbox
                            checked={done}
                            size={18}
                            onChange={(e) => toggleSubtask(s.id, task.id, phase.id, e)}
                          />
                        </div>
                        <span className={cn('text-sm leading-snug', done && 'line-through text-muted')}>
                          {s.title}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>

              {/* notes */}
              <SectionCard title="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setTaskNotes(task.id, e.target.value)}
                  rows={5}
                  placeholder="Capture what worked, gotchas, links… anything you want to revisit."
                  className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
                />
              </SectionCard>

              {/* difficulty + blocked */}
              <div className="grid sm:grid-cols-2 gap-4">
                <SectionCard title="Your difficulty rating">
                  <div className="flex items-center gap-3">
                    <DifficultyStars value={difficulty} onChange={(n) => setTaskDifficulty(task.id, n)} size={22} />
                    <span className="text-xs text-muted">{DIFFICULTY_LABEL[difficulty] || '—'}</span>
                  </div>
                </SectionCard>
                <SectionCard title="Blocker">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setTaskBlocked(task.id, !blocked, blockedReason)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition border',
                        blocked
                          ? 'border-danger/40 bg-danger/15 text-danger'
                          : 'border-token bg-[var(--card-2)] hover:bg-[var(--card)]'
                      )}
                    >
                      <AlertOctagon size={14} />
                      {blocked ? 'Blocked' : 'Mark as blocked'}
                    </button>
                  </div>
                  <input
                    value={blockedReason}
                    onChange={(e) => {
                      setBlockedReason(e.target.value);
                      if (blocked) setTaskBlocked(task.id, true, e.target.value);
                    }}
                    placeholder="What's blocking you?"
                    className="mt-2 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm focus-ring focus:border-aws-orange"
                  />
                </SectionCard>
              </div>

              {/* resources */}
              {(task.resources || []).length > 0 && (
                <SectionCard title="Resources">
                  <ul className="space-y-1.5">
                    {task.resources.map((r) => (
                      <li key={r.url}>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-aws-orange hover:underline"
                        >
                          <ExternalLink size={14} /> {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              )}

              {/* AI hint */}
              <button
                onClick={aiHint}
                className="w-full glass rounded-2xl p-4 flex items-center gap-3 hover:bg-white/15 transition focus-ring text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-aws grid place-items-center text-ink-950">
                  <Brain size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">Stuck? Ask AI for a hint</div>
                  <div className="text-xs text-muted">Doc-grounded help tailored to this exact task.</div>
                </div>
                <Sparkles size={16} className="text-aws-orange" />
              </button>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon ? <Icon size={14} className="text-aws-orange" /> : null}
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function formatHMS(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
