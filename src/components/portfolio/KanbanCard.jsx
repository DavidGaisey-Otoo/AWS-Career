import { motion } from 'framer-motion';
import { ArrowRight, ExternalLink, Github } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { PRIORITY } from '../../data/projects.js';
import { cn } from '../../lib/utils.js';
import { AppealScore } from './AppealScore.jsx';
import { DifficultyMeter } from './DifficultyMeter.jsx';
import { ServiceBadge } from './ServiceBadge.jsx';

export function KanbanCard({ project, onDragStart, onDragEnd, dragging }) {
  const { getProjectState, projectStats } = usePortfolio();
  const ps = getProjectState(project.id);
  const stats = projectStats.find((s) => s.id === project.id);
  const priority = PRIORITY[ps.priority] || PRIORITY.soon;

  return (
    <motion.article
      layout
      draggable
      onDragStart={(e) => onDragStart?.(e, project.id)}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: dragging ? 0.4 : 1, y: 0, scale: dragging ? 0.97 : 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className={cn(
        'group rounded-2xl border border-token bg-[var(--card)] p-4 transition cursor-grab active:cursor-grabbing',
        'hover:border-aws-orange/40 hover:shadow-soft-xl relative',
      )}
    >
      <div className="flex items-start gap-2.5 mb-2">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-aws text-ink-950 text-xs font-black flex-shrink-0">
          {project.n}
        </span>
        <h3 className="flex-1 text-sm font-extrabold tracking-tight leading-snug">
          {project.title}
        </h3>
        <span className={cn('chip border text-[10px]', priority.color)}>{priority.label}</span>
      </div>

      <p className="text-[11px] text-muted leading-relaxed line-clamp-2 mb-3">{project.tagline}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {project.services.slice(0, 4).map((sid) => (
          <ServiceBadge key={sid} id={sid} size="xs" />
        ))}
        {project.services.length > 4 && (
          <span className="text-[10px] text-muted font-bold self-center">
            +{project.services.length - 4} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <DifficultyMeter level={project.difficulty} showLabel={false} />
        <AppealScore value={project.clientAppeal} />
      </div>

      <div className="h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-aws"
          initial={false}
          animate={{ width: `${stats.stepPercent}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 22 }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted font-semibold">
        <span>{stats.doneSteps}/{stats.totalSteps} steps</span>
        <span>{project.estLabel}</span>
      </div>

      {/* hover quick actions */}
      <div className="mt-3 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
        <Link
          to={`/portfolio/${project.id}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg px-2 py-1.5 bg-[var(--card-2)] hover:bg-aws-orange hover:text-ink-950 transition"
          onClick={(e) => e.stopPropagation()}
        >
          Open <ArrowRight size={11} />
        </Link>
        {ps.github && (
          <a
            href={ps.github} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="grid place-items-center w-7 h-7 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card)] text-muted hover:text-current"
            title="GitHub"
          ><Github size={12} /></a>
        )}
        {ps.demoUrl && (
          <a
            href={ps.demoUrl} target="_blank" rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="grid place-items-center w-7 h-7 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card)] text-muted hover:text-current"
            title="Live demo"
          ><ExternalLink size={12} /></a>
        )}
      </div>
    </motion.article>
  );
}
