import { ArrowDownAZ, Filter, Search, X } from 'lucide-react';
import { ROADMAP } from '../../data/roadmap.js';
import { cn } from '../../lib/utils.js';

const STATUS_OPTIONS = [
  { id: 'all',         label: 'All' },
  { id: 'not-started', label: 'Not started' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'complete',    label: 'Complete' },
  { id: 'blocked',     label: 'Blocked' },
];
const PRIORITY_OPTIONS = [
  { id: 'all',       label: 'Any priority' },
  { id: 'immediate', label: 'Immediate' },
  { id: 'soon',      label: 'Soon' },
  { id: 'later',     label: 'Later' },
];
const SORT_OPTIONS = [
  { id: 'default',     label: 'Default order' },
  { id: 'priority',    label: 'Priority' },
  { id: 'time',        label: 'Estimated time' },
  { id: 'difficulty',  label: 'Difficulty' },
];

export function RoadmapFilters({
  query, setQuery,
  status, setStatus,
  priority, setPriority,
  phaseId, setPhaseId,
  sort, setSort,
}) {
  const activeFilters =
    (query ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (priority !== 'all' ? 1 : 0) +
    (phaseId !== 'all' ? 1 : 0);

  const reset = () => {
    setQuery(''); setStatus('all'); setPriority('all'); setPhaseId('all'); setSort('default');
  };

  return (
    <div className="surface rounded-2xl p-3 sm:p-4 sticky top-20 z-20">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 surface-2 rounded-xl px-3">
          <Search size={16} className="text-aws-orange" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks…"
            className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none placeholder:text-muted"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="rounded p-1 hover:bg-[var(--card)] focus-ring"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <Pill icon={Filter}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="pill-select">
            {STATUS_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Pill>
        <Pill>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="pill-select">
            {PRIORITY_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Pill>
        <Pill>
          <select value={phaseId} onChange={(e) => setPhaseId(e.target.value)} className="pill-select">
            <option value="all">All phases</option>
            {ROADMAP.map((p, i) => <option key={p.id} value={p.id}>P{i + 1} · {p.title}</option>)}
          </select>
        </Pill>
        <Pill icon={ArrowDownAZ}>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="pill-select">
            {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </Pill>

        {activeFilters > 0 && (
          <button
            onClick={reset}
            className="text-xs font-bold text-muted hover:text-aws-orange px-2 self-center"
          >
            Reset ({activeFilters})
          </button>
        )}
      </div>
      <style>{`.pill-select { background: transparent; color: var(--text); font-size: 13px; font-weight: 600; padding: 6px 4px; border: 0; outline: none; appearance: none; padding-right: 14px; cursor: pointer; }
        .pill-select option { background: var(--card); color: var(--text); }`}</style>
    </div>
  );
}

function Pill({ icon: Icon, children }) {
  return (
    <div className={cn('flex items-center gap-1.5 surface-2 rounded-xl px-2.5 py-0.5 hover:bg-[var(--card)] transition')}>
      {Icon ? <Icon size={14} className="text-muted" /> : null}
      {children}
    </div>
  );
}

// ---------- pure helpers (consumed by Roadmap page) ----------

export function filterTask(task, ctx, opts) {
  const { state } = ctx;
  const { query, status, priority } = opts;
  if (query) {
    const q = query.toLowerCase();
    const hit =
      task.title.toLowerCase().includes(q) ||
      task.subtasks.some((s) => s.title.toLowerCase().includes(q));
    if (!hit) return false;
  }
  if (priority !== 'all' && task.priority !== priority) return false;
  if (status !== 'all') {
    const subs = task.subtasks;
    const done = subs.filter((s) => state.subtasks[s.id]).length;
    const blocked = !!state.taskBlocked[task.id]?.blocked;
    let st = 'not-started';
    if (blocked) st = 'blocked';
    else if (done === subs.length && subs.length > 0) st = 'complete';
    else if (done > 0) st = 'in-progress';
    if (st !== status) return false;
  }
  return true;
}

export function sortTasks(tasks, sort) {
  if (sort === 'default') return tasks;
  const arr = [...tasks];
  const priorityRank = { immediate: 0, soon: 1, later: 2 };
  if (sort === 'priority')   arr.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  if (sort === 'time')       arr.sort((a, b) => a.minutes - b.minutes);
  if (sort === 'difficulty') arr.sort((a, b) => a.difficulty - b.difficulty);
  return arr;
}
