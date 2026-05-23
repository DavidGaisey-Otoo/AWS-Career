import { Filter, Search, X } from 'lucide-react';
import { DIFFICULTY, PRIORITY, SERVICE_DOMAINS, getServiceMeta } from '../../data/projects.js';

export function PortfolioFilters({
  query, setQuery,
  difficulty, setDifficulty,
  priority, setPriority,
  service, setService,
  services,
}) {
  const activeCount =
    (query ? 1 : 0) +
    (difficulty !== 'all' ? 1 : 0) +
    (priority !== 'all' ? 1 : 0) +
    (service !== 'all' ? 1 : 0);

  return (
    <div className="surface rounded-2xl p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 surface-2 rounded-xl px-3">
          <Search size={16} className="text-aws-orange" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, services, skills…"
            className="flex-1 bg-transparent py-2.5 text-sm focus:outline-none placeholder:text-muted"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-1 hover:bg-[var(--card)] focus-ring"
              aria-label="Clear"
            ><X size={14} /></button>
          )}
        </div>

        <Pill icon={Filter}>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="pf-select">
            <option value="all">Any difficulty</option>
            {Object.entries(DIFFICULTY).map(([id, d]) => (
              <option key={id} value={id}>{d.label}</option>
            ))}
          </select>
        </Pill>
        <Pill>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="pf-select">
            <option value="all">Any priority</option>
            {Object.entries(PRIORITY).map(([id, p]) => (
              <option key={id} value={id}>{p.label}</option>
            ))}
          </select>
        </Pill>
        <Pill>
          <select value={service} onChange={(e) => setService(e.target.value)} className="pf-select">
            <option value="all">Any service</option>
            {services.map((id) => (
              <option key={id} value={id}>{getServiceMeta(id).label}</option>
            ))}
          </select>
        </Pill>

        {activeCount > 0 && (
          <button
            onClick={() => { setQuery(''); setDifficulty('all'); setPriority('all'); setService('all'); }}
            className="text-xs font-bold text-muted hover:text-aws-orange px-2 self-center"
          >
            Reset ({activeCount})
          </button>
        )}
      </div>
      <style>{`.pf-select { background: transparent; color: var(--text); font-size: 13px; font-weight: 600; padding: 6px 4px; border: 0; outline: none; appearance: none; padding-right: 14px; cursor: pointer; }
        .pf-select option { background: var(--card); color: var(--text); }`}</style>
    </div>
  );
}

function Pill({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-1.5 surface-2 rounded-xl px-2.5 py-0.5 hover:bg-[var(--card)] transition">
      {Icon ? <Icon size={14} className="text-muted" /> : null}
      {children}
    </div>
  );
}
