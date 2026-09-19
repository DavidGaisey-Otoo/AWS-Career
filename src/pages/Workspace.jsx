/**
 * Workspace.jsx — one place per job, and one pool per artifact type.
 *
 * Every other page lists a single kind: proposals here, emails there,
 * portfolio somewhere else. Nothing answered the question you actually
 * have mid-job — "what do I have for THIS client?" — so the answer was
 * to open five pages and hold it in your head.
 *
 * Two views, because both questions are real:
 *   Projects — open one job, see everything under it.
 *   Pool     — every proposal, or every email, across all jobs.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Boxes, FileText, FolderOpen, Layers, Mail, Receipt, ScrollText,
  Presentation as Deck, Network, FileCode, ClipboardList, Search,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { StatChip } from '../components/common/StatChip.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { listSolutions } from '../lib/solutionStore.js';
import { buildWorkspace, pool, WORKSPACE_KINDS } from '../lib/projectWorkspace.js';
import { cn } from '../lib/utils.js';

const KIND_META = {
  solution:     { label: 'Solutions',     icon: Layers,        to: '/solution' },
  architecture: { label: 'Architecture',  icon: Network,       to: '/architecture' },
  proposal:     { label: 'Proposals',     icon: ScrollText,    to: '/freelance?tab=myproposals' },
  email:        { label: 'Emails',        icon: Mail,          to: '/email' },
  portfolio:    { label: 'Portfolio',     icon: FolderOpen,    to: '/portfolio' },
  document:     { label: 'Documents',     icon: FileText,      to: '/documents' },
  deck:         { label: 'Decks',         icon: Deck,          to: '/presentation' },
  contract:     { label: 'Contracts',     icon: ClipboardList, to: '/freelance' },
  invoice:      { label: 'Invoices',      icon: Receipt,       to: '/freelance' },
  plan:         { label: 'Project plans', icon: ClipboardList, to: '/project-plan' },
  script:       { label: 'Scripts / IaC', icon: FileCode,      to: '/solution' },
};

const titleOf = (item, kind) =>
  item?.title || item?.gigTitle || item?.subject || item?.name ||
  item?.projectTitle || item?.brief || `${KIND_META[kind]?.label || kind} record`;

const whenOf = (item) => item?.updatedAt || item?.createdAt || item?.at || item?.date || null;

export default function Workspace() {
  const [view, setView] = useState('projects');
  const [openId, setOpenId] = useState(null);
  const [kind, setKind] = useState('proposal');
  const [query, setQuery] = useState('');

  const earn = useEarn();
  const freelance = useFreelance();
  const portfolio = usePortfolio();

  const workspace = useMemo(() => buildWorkspace({
    solutions: listSolutions() || [],
    proposals: freelance?.state?.proposals || [],
    emails: earn?.state?.emails || [],
    portfolio: portfolio?.state?.projects || {},
    documents: earn?.state?.deliveries || [],
    decks: earn?.state?.decks || [],
    contracts: earn?.state?.contracts || [],
    invoices: freelance?.state?.invoices || [],
  }), [earn?.state, freelance?.state, portfolio?.state]);

  const open = workspace.projects.find((p) => p.id === openId) || null;

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workspace.projects;
    return workspace.projects.filter((p) =>
      (p.title + ' ' + (p.client || '') + ' ' + p.services.join(' ')).toLowerCase().includes(q));
  }, [workspace.projects, query]);

  const poolItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = pool(workspace, kind);
    if (!q) return all;
    return all.filter((x) => (titleOf(x, kind) + ' ' + (x.__project || '')).toLowerCase().includes(q));
  }, [workspace, kind, query]);

  const nothingYet = workspace.totals.projects === 0 &&
    WORKSPACE_KINDS.every((k) => workspace.totals[k] === 0);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace"
        title="Everything, by the job it belongs to."
        subtitle="One container per piece of client work — its solution, architecture, proposal, emails, documents, contract and invoice together. Or browse every artifact of one kind across all jobs."
        icon={Boxes}
      />

      {nothingYet ? (
        <EmptyState
          icon={Boxes}
          title="No work here yet."
          description="Build a solution from a gig and it becomes a project here, gathering everything you produce for it as you go."
        >
          <Link to="/solution" className="btn btn-primary !text-xs">Open Solution Studio</Link>
        </EmptyState>
      ) : (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <StatChip layout="stacked" icon={Boxes} label="Projects" value={workspace.totals.projects} />
            {['proposal', 'email', 'document', 'portfolio', 'invoice'].map((k) => (
              <StatChip key={k} layout="stacked" icon={KIND_META[k].icon}
                        label={KIND_META[k].label} value={workspace.totals[k]} />
            ))}
          </section>

          <section className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-token overflow-hidden">
              {['projects', 'pool'].map((v) => (
                <button key={v} onClick={() => setView(v)}
                        className={cn('px-3 py-1.5 text-xs font-bold transition',
                          view === v ? 'bg-aws-orange/15 text-aws-orange' : 'text-muted hover:text-current')}>
                  {v === 'projects' ? 'By project' : 'All of one kind'}
                </button>
              ))}
            </div>
            {view === 'pool' && (
              <select value={kind} onChange={(e) => setKind(e.target.value)}
                      className="bg-[var(--card-2)] border border-token rounded-lg px-2.5 py-1.5 text-xs font-semibold">
                {WORKSPACE_KINDS.map((k) => (
                  <option key={k} value={k}>{KIND_META[k]?.label || k} ({workspace.totals[k] || 0})</option>
                ))}
              </select>
            )}
            <div className="flex-1 min-w-[10rem] flex items-center gap-2 bg-[var(--card-2)] border border-token rounded-lg px-2.5">
              <Search size={13} className="text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                     placeholder="Search…" className="flex-1 bg-transparent py-1.5 text-xs outline-none" />
            </div>
          </section>

          {view === 'projects' && !open && (
            <section className="grid gap-2 sm:grid-cols-2">
              {filteredProjects.map((p) => (
                <button key={p.id} onClick={() => setOpenId(p.id)}
                        className="surface rounded-2xl p-4 text-left hover:border-aws-orange/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-sm leading-snug">{p.title}</h3>
                    <span className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold shrink-0">
                      {p.artifactCount} items
                    </span>
                  </div>
                  <div className="text-[11px] text-muted mt-1 flex flex-wrap gap-x-3">
                    {p.client && <span>{p.client}</span>}
                    {p.region && <span>{p.region}</span>}
                    {p.services.length > 0 && <span>{p.services.slice(0, 4).join(' · ')}</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {WORKSPACE_KINDS.filter((k) => p.artifacts[k].length).map((k) => {
                      const Icon = KIND_META[k]?.icon || FileText;
                      return (
                        <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-token bg-[var(--card-2)] text-[10px] font-bold">
                          <Icon size={10} /> {p.artifacts[k].length}
                        </span>
                      );
                    })}
                  </div>
                </button>
              ))}
              {filteredProjects.length === 0 && (
                <p className="text-sm text-muted">No project matches that search.</p>
              )}
            </section>
          )}

          {view === 'projects' && open && (
            <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="surface rounded-2xl p-4">
                <button onClick={() => setOpenId(null)}
                        className="text-[11px] font-bold text-muted hover:text-aws-orange">← All projects</button>
                <h2 className="text-xl font-black tracking-tight mt-2">{open.title}</h2>
                <div className="text-[12px] text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {open.client && <span>Client: <strong className="text-current">{open.client}</strong></span>}
                  {open.region && <span>Region: <strong className="text-current">{open.region}</strong></span>}
                  {open.services.length > 0 && <span>{open.services.join(' · ')}</span>}
                  <span>{open.artifactCount} items</span>
                </div>
              </div>

              {WORKSPACE_KINDS.map((k) => {
                const items = open.artifacts[k];
                if (!items.length) return null;
                const meta = KIND_META[k] || { label: k, icon: FileText, to: '/' };
                const Icon = meta.icon;
                return (
                  <div key={k} className="surface rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} className="text-aws-orange" />
                      <h3 className="text-[11px] font-extrabold uppercase tracking-widest">{meta.label}</h3>
                      <span className="text-[10px] text-muted">{items.length}</span>
                      <Link to={meta.to} className="ml-auto text-[11px] font-bold text-muted hover:text-aws-orange">
                        Open {meta.label.toLowerCase()} →
                      </Link>
                    </div>
                    <ul className="space-y-1">
                      {items.map((item, i) => (
                        <li key={item?.id || i} className="text-[12px] flex items-start justify-between gap-3 py-1 border-b border-token/40 last:border-0">
                          <span className="min-w-0 truncate">{titleOf(item, k)}</span>
                          {whenOf(item) && (
                            <span className="text-[10.5px] text-muted shrink-0">
                              {new Date(whenOf(item)).toLocaleDateString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </motion.section>
          )}

          {view === 'pool' && (
            <section className="surface rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                {(() => { const Icon = KIND_META[kind]?.icon || FileText; return <Icon size={15} className="text-aws-orange" />; })()}
                <h3 className="font-extrabold text-sm">{KIND_META[kind]?.label || kind} — all projects</h3>
                <Link to={KIND_META[kind]?.to || '/'} className="ml-auto text-[11px] font-bold text-muted hover:text-aws-orange">
                  Open the full tool →
                </Link>
              </div>
              {poolItems.length === 0 ? (
                <p className="text-sm text-muted">Nothing of this kind yet.</p>
              ) : (
                <ul className="space-y-1">
                  {poolItems.map((item, i) => (
                    <li key={item?.id || i} className="text-[12px] flex items-start justify-between gap-3 py-1.5 border-b border-token/40 last:border-0">
                      <span className="min-w-0">
                        <span className="block truncate">{titleOf(item, kind)}</span>
                        <span className="text-[10.5px] text-muted">
                          {item.__project || 'Not linked to a project'}
                        </span>
                      </span>
                      {whenOf(item) && (
                        <span className="text-[10.5px] text-muted shrink-0">
                          {new Date(whenOf(item)).toLocaleDateString()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
