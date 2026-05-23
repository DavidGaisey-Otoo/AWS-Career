import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { STATUS, STATUS_ORDER } from '../../data/projects.js';
import { useToast } from '../../context/ToastContext.jsx';
import { fireConfetti } from '../ui/Confetti.js';
import { cn } from '../../lib/utils.js';
import { KanbanCard } from './KanbanCard.jsx';

/**
 * 4-column Kanban board with native HTML5 drag + drop.
 * Cards are draggable; columns are drop targets.
 */
export function KanbanBoard({ filterFn = () => true }) {
  const { projects, projectStats, moveToStatus } = usePortfolio();
  const toast = useToast();
  const [draggingId, setDraggingId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const columns = useMemo(() => {
    const cols = Object.fromEntries(STATUS_ORDER.map((s) => [s, []]));
    for (const p of projects) {
      if (!filterFn(p)) continue;
      const stat = projectStats.find((s) => s.id === p.id);
      cols[stat.status]?.push(p);
    }
    return cols;
  }, [projects, projectStats, filterFn]);

  const onDragStart = (e, id) => {
    setDraggingId(id);
    try {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
    } catch { /* some browsers may forbid setData; the local state still works */ }
  };
  const onDragEnd = () => { setDraggingId(null); setOverColumn(null); };

  const onDragOver = (e, status) => {
    e.preventDefault();
    if (overColumn !== status) setOverColumn(status);
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    const id = draggingId || e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setOverColumn(null);
    if (!id) return;
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const prevStatus = projectStats.find((s) => s.id === id)?.status;
    if (prevStatus === status) return;
    moveToStatus(id, status);
    toast.success(`Moved to ${STATUS[status].label}`, { description: project.title });
    if (status === 'complete') {
      fireConfetti({ origin: { y: 0.35 } });
    }
  };

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((statusId) => {
        const meta = STATUS[statusId];
        const items = columns[statusId];
        const isOver = overColumn === statusId && draggingId;
        return (
          <section
            key={statusId}
            onDragOver={(e) => onDragOver(e, statusId)}
            onDragLeave={() => overColumn === statusId && setOverColumn(null)}
            onDrop={(e) => onDrop(e, statusId)}
            className={cn(
              'rounded-3xl border border-token bg-[var(--card-2)]/40 p-3 transition',
              isOver && 'ring-2 ring-aws-orange bg-aws-orange/5 scale-[1.01]'
            )}
          >
            <div className="flex items-center justify-between px-1.5 py-1 mb-3">
              <div className="flex items-center gap-2">
                <span className={cn('chip text-[11px] font-extrabold', meta.color)}>
                  {meta.emoji} {meta.label}
                </span>
                <span className="text-[11px] text-muted font-semibold">{items.length}</span>
              </div>
            </div>
            <div className="space-y-2.5 min-h-[120px]">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border border-dashed border-token p-6 text-center text-[11px] text-muted"
                >
                  Drop a project here
                </motion.div>
              ) : (
                items.map((p) => (
                  <KanbanCard
                    key={p.id}
                    project={p}
                    dragging={draggingId === p.id}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
