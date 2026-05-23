import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, Lock } from 'lucide-react';
import { useState } from 'react';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { cn } from '../../lib/utils.js';
import { ProgressRing } from './ProgressRing.jsx';
import { TaskRow } from './TaskRow.jsx';

/**
 * One phase per card — collapsible. Shows progress ring, blurb, completion %.
 * `filterTasks(task)` is applied to allow upstream search/filter.
 */
export function PhaseCard({ phase, index, defaultExpanded, filterTasks = (t) => true, locked }) {
  const { phaseStats } = useRoadmap();
  const stat = phaseStats[index];
  const [expanded, setExpanded] = useState(defaultExpanded ?? index === 0);
  const visibleTasks = phase.tasks.filter(filterTasks);

  const accentBorder = stat.complete ? 'border-success/40' : 'border-token';

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn('surface rounded-3xl overflow-hidden gradient-border', accentBorder)}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4 hover:bg-[var(--card-2)] transition focus-ring"
      >
        <ProgressRing percent={stat.percent} size={64} stroke={6} accent={phase.color}>
          {stat.complete ? (
            <CheckCircle2 className="text-success" size={26} />
          ) : (
            <div className="text-xs font-extrabold tracking-tight">{stat.percent}%</div>
          )}
        </ProgressRing>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted">
              Phase {index + 1}
            </span>
            {locked && <Lock size={12} className="text-muted" />}
            {stat.complete && (
              <span className="chip bg-success/15 text-success border border-success/30">
                Complete
              </span>
            )}
          </div>
          <h3 className="mt-0.5 text-lg sm:text-xl font-extrabold tracking-tight leading-tight">
            {phase.title}
          </h3>
          <p className="hidden sm:block mt-0.5 text-xs text-muted truncate">{phase.blurb}</p>
          <div className="mt-1.5 text-[11px] text-muted">
            {stat.tasksDone}/{stat.tasksTotal} tasks · {stat.subsDone}/{stat.subsTotal} subtasks
          </div>
        </div>

        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.22 }}
          className="text-muted"
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-5 space-y-2.5">
              {visibleTasks.length === 0 ? (
                <div className="text-sm text-muted italic py-2">No tasks match the current filter.</div>
              ) : (
                visibleTasks.map((task, taskIdx) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    phaseId={phase.id}
                    positionLabel={`Task ${taskIdx + 1} of ${visibleTasks.length}`}
                    prevTaskId={taskIdx > 0 ? visibleTasks[taskIdx - 1].id : null}
                    nextTaskId={taskIdx < visibleTasks.length - 1 ? visibleTasks[taskIdx + 1].id : null}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
