import { motion } from 'framer-motion';
import {
  ExternalLink, Filter, Library, Search, Star,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useApp } from '../context/AppContext.jsx';
import { ALL_RESOURCES, RESOURCE_GROUPS } from '../data/resources.js';
import { cn } from '../lib/utils.js';

const STAR_STORAGE_KEY = 'awscl-pro::v1::resource-stars';

export default function Resources() {
  const { profile } = useApp();
  const [activeGroup, setActiveGroup] = useState('all');
  const [search, setSearch] = useState('');
  const [starred, setStarred] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(STAR_STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  });

  const toggleStar = (url) => {
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      localStorage.setItem(STAR_STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let items = ALL_RESOURCES;
    if (activeGroup === 'starred') items = items.filter((r) => starred.has(r.url));
    else if (activeGroup !== 'all') items = items.filter((r) => r.groupId === activeGroup);
    if (q) items = items.filter((r) =>
      (r.name + ' ' + r.blurb + ' ' + r.groupLabel).toLowerCase().includes(q));
    return items;
  }, [activeGroup, search, starred]);

  // Group filtered list back by group id for the grid render
  const groupedFiltered = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const arr = map.get(r.groupId) || [];
      arr.push(r);
      map.set(r.groupId, arr);
    }
    return RESOURCE_GROUPS
      .map((g) => ({ ...g, items: map.get(g.id) || [] }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Resources"
        title="Every AWS link worth saving."
        subtitle="Curated docs, courses, communities, pricing tools and cheat sheets. Star anything to keep it handy on your dashboard."
        icon={Library}
      />

      {/* Search + filter row */}
      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--card-2)] rounded-md px-2 py-1.5 flex-1 min-w-[220px]">
          <Search size={12} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search across all resources…"
            aria-label="Search resources"
            className="bg-transparent text-xs flex-1 focus:outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[10px] font-bold text-muted hover:text-current">
              clear
            </button>
          )}
        </div>
        <FilterPill active={activeGroup === 'all'} onClick={() => setActiveGroup('all')}>All</FilterPill>
        <FilterPill active={activeGroup === 'starred'} onClick={() => setActiveGroup('starred')}>
          <Star size={9} fill={activeGroup === 'starred' ? 'currentColor' : 'none'} className="inline mr-1" />
          Starred ({starred.size})
        </FilterPill>
        {RESOURCE_GROUPS.map((g) => (
          <FilterPill key={g.id} active={activeGroup === g.id} onClick={() => setActiveGroup(g.id)}>
            {g.icon} {g.label}
          </FilterPill>
        ))}
      </div>

      {/* Empty state */}
      {groupedFiltered.length === 0 && (
        <div className="surface rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
            <Library size={22} strokeWidth={2.5} />
          </div>
          <h3 className="text-base font-extrabold">
            {activeGroup === 'starred' && starred.size === 0
              ? 'No starred resources yet.'
              : 'Nothing matches your filter.'}
          </h3>
          <p className="text-[12px] text-muted max-w-md mx-auto">
            {activeGroup === 'starred' && starred.size === 0
              ? 'Click the star icon on any resource to pin it here for quick access.'
              : 'Try a different filter or clear the search.'}
          </p>
          {(search || activeGroup !== 'all') && (
            <button onClick={() => { setSearch(''); setActiveGroup('all'); }} className="btn btn-ghost !text-xs">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Sections */}
      {groupedFiltered.map((group, gi) => (
        <motion.section
          key={group.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.03 }}
          className="surface rounded-2xl p-5"
        >
          <header className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold tracking-tight flex items-center gap-2">
                <span className="text-base">{group.icon}</span> {group.label}
                <span className="chip border border-token text-[10px] font-bold ml-1">{group.items.length}</span>
              </h3>
              <p className="text-[11px] text-muted mt-0.5">{group.blurb}</p>
            </div>
          </header>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((r) => {
              const isStarred = starred.has(r.url);
              return (
                <li key={r.url} className="group">
                  <div className="rounded-xl border border-token bg-[var(--card-2)]/30 hover:border-aws-orange/40 transition relative">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 pr-8 focus-ring rounded-xl"
                      aria-label={`Open ${r.name} in a new tab`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-[13px] font-extrabold leading-snug group-hover:text-aws-orange transition">
                          {r.name}
                        </h4>
                        <ExternalLink size={11} className="text-muted group-hover:text-aws-orange transition shrink-0 mt-1" />
                      </div>
                      <p className="text-[11px] text-muted leading-snug mt-1">{r.blurb}</p>
                      <div className="text-[9px] text-muted/70 truncate mt-1.5 font-mono">
                        {hostFor(r.url)}
                      </div>
                    </a>
                    <button
                      onClick={(e) => { e.preventDefault(); toggleStar(r.url); }}
                      className={cn(
                        'absolute top-2 right-2 grid place-items-center w-6 h-6 rounded-md transition',
                        isStarred ? 'text-aws-orange' : 'text-muted hover:text-aws-orange opacity-0 group-hover:opacity-100',
                      )}
                      aria-label={isStarred ? `Unstar ${r.name}` : `Star ${r.name}`}
                      title={isStarred ? 'Unstar' : 'Star'}
                    >
                      <Star size={12} fill={isStarred ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </motion.section>
      ))}

      {/* Footer note */}
      <p className="text-[11px] text-muted text-center py-2">
        Hi {profile?.name?.split(' ')[0] || 'there'} — see something missing?
        Suggest a resource in the <a className="text-aws-orange font-bold hover:underline" href="https://aws.amazon.com/contact-us/" target="_blank" rel="noreferrer">AWS feedback channel</a>.
      </p>
    </div>
  );
}

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-[10px] font-bold border whitespace-nowrap',
        active
          ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40'
          : 'border-token text-muted hover:text-current',
      )}
    >{children}</button>
  );
}

function hostFor(url) {
  try { return new URL(url).host.replace(/^www\./, ''); }
  catch { return url; }
}
