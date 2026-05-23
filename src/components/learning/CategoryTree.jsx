import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, BookOpen, CheckCircle2, ChevronDown, FlaskConical, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLearning } from '../../context/LearningContext.jsx';
import { LEARNING_CATEGORIES } from '../../data/learning.js';
import { cn } from '../../lib/utils.js';

/**
 * Collapsible left-rail category + topic tree.
 * Filters: difficulty, status (concept read / not), bookmarked only.
 * Search filters topics by title or summary, opening matching categories.
 */
export function CategoryTree({ activeCategoryId, activeTopicId }) {
  const { getTopicState, state, setFilters, categoryStats } = useLearning();
  const [query, setQuery] = useState('');
  const [openIds, setOpenIds] = useState(new Set([activeCategoryId || 'cf']));
  const { filters } = state;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LEARNING_CATEGORIES.map((cat) => {
      const filtered = cat.topics.filter((t) => {
        if (q && !(t.title.toLowerCase().includes(q) ||
          (t.summary || '').toLowerCase().includes(q) ||
          (t.simpleEnglish || '').toLowerCase().includes(q))) return false;

        const ts = getTopicState(t.id);
        if (filters.difficulty !== 'all' && t.difficulty !== filters.difficulty) return false;
        if (filters.bookmarked && !ts.bookmarked) return false;
        if (filters.status === 'read' && !ts.conceptRead) return false;
        if (filters.status === 'unread' && ts.conceptRead) return false;
        return true;
      });
      return { cat, topics: filtered };
    });
  }, [query, filters, getTopicState]);

  // Auto-open categories with matches when searching
  const effectiveOpen = useMemo(() => {
    if (!query.trim() && !filters.bookmarked && filters.status === 'all' && filters.difficulty === 'all') {
      return openIds;
    }
    return new Set(matches.filter((m) => m.topics.length > 0).map((m) => m.cat.id));
  }, [query, filters, openIds, matches]);

  const toggle = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <aside className="surface rounded-2xl p-3 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
      {/* search */}
      <div className="flex items-center gap-2 surface-2 rounded-xl px-2.5 mb-2">
        <Search size={14} className="text-aws-orange" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics…"
          className="flex-1 bg-transparent py-2 text-xs font-medium focus:outline-none placeholder:text-muted"
        />
      </div>

      {/* filter chips */}
      <div className="flex flex-wrap gap-1.5 px-1 mb-3">
        <FilterChip
          active={filters.bookmarked}
          onClick={() => setFilters({ bookmarked: !filters.bookmarked })}
          icon={Bookmark}>
          Saved
        </FilterChip>
        <FilterChip
          active={filters.status === 'read'}
          onClick={() => setFilters({ status: filters.status === 'read' ? 'all' : 'read' })}
          icon={CheckCircle2}>
          Studied
        </FilterChip>
        <FilterChip
          active={filters.status === 'unread'}
          onClick={() => setFilters({ status: filters.status === 'unread' ? 'all' : 'unread' })}
          icon={BookOpen}>
          New
        </FilterChip>
        <select
          value={filters.difficulty}
          onChange={(e) => setFilters({ difficulty: e.target.value })}
          className="bg-[var(--card-2)] border border-token rounded-md text-[10px] font-bold px-1.5 py-1 focus:outline-none"
        >
          <option value="all">All levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <ul className="space-y-0.5">
        {matches.map(({ cat, topics }) => {
          if (topics.length === 0 && (query.trim() || filters.bookmarked || filters.status !== 'all' || filters.difficulty !== 'all')) {
            return null;
          }
          const open = effectiveOpen.has(cat.id);
          const stat = categoryStats.find((s) => s.id === cat.id);
          return (
            <li key={cat.id}>
              <button
                onClick={() => toggle(cat.id)}
                className={cn(
                  'w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-bold transition hover:bg-[var(--card-2)] focus-ring',
                  activeCategoryId === cat.id && !activeTopicId && 'bg-aws-orange/10 text-aws-orange'
                )}
              >
                <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.15 }}>
                  <ChevronDown size={14} className="text-muted" />
                </motion.span>
                <span className="text-base leading-none">{cat.icon}</span>
                <span className="flex-1 truncate">{cat.title}</span>
                <span className="text-[10px] font-extrabold text-muted tabular-nums">
                  {stat.avgMastery}%
                </span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden ml-3 border-l border-token pl-2 mt-0.5 mb-1"
                  >
                    {topics.map((t) => {
                      const ts = getTopicState(t.id);
                      const isActive = activeTopicId === t.id;
                      return (
                        <li key={t.id}>
                          <NavLink
                            to={`/learning/${cat.id}/${t.id}`}
                            className={({ isActive: ia }) =>
                              cn(
                                'group flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition focus-ring',
                                (ia || isActive)
                                  ? 'bg-aws-orange/10 text-aws-orange'
                                  : 'text-muted hover:text-current hover:bg-[var(--card-2)]'
                              )
                            }
                          >
                            <span className={cn(
                              'w-1.5 h-1.5 rounded-full flex-shrink-0',
                              ts.conceptRead ? 'bg-success' :
                                ts.bookmarked ? 'bg-aws-orange' : 'bg-[var(--border)]'
                            )} />
                            <span className="flex-1 truncate">{t.title}</span>
                            {ts.bookmarked && <Bookmark size={10} className="text-aws-orange fill-aws-orange flex-shrink-0" />}
                            {ts.labCompleted && <FlaskConical size={10} className="text-electric flex-shrink-0" />}
                          </NavLink>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

function FilterChip({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-bold transition border',
        active
          ? 'bg-aws-orange text-ink-950 border-aws-orange'
          : 'border-token text-muted hover:text-current hover:bg-[var(--card-2)]'
      )}
    >
      {Icon ? <Icon size={10} /> : null}
      {children}
    </button>
  );
}
