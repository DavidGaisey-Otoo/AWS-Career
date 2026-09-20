/**
 * Workspace.jsx — one place per job, and one pool per artifact type.
 *
 * Every other page lists a single kind: proposals here, emails there,
 * portfolio somewhere else. Nothing answered the question you actually
 * have mid-job — "what do I have for THIS client?" — so the answer was
 * to open five pages and hold it in your head.
 *
 * Opening a project gives you a contents list on the left and the artifact
 * itself on the right: the proposal to read, the CLI commands to copy, the
 * plan with its phases. A list of titles was not enough to work from.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Boxes, FileText, FolderOpen, Layers, Mail, Receipt, ScrollText,
  Presentation as Deck, Network, FileCode, ClipboardList, Search,
  BookOpen, Inbox, ChevronRight, HelpCircle, Check, Copy, FileText as ReportIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { StatChip } from '../components/common/StatChip.jsx';
import { ArtifactViewer } from '../components/workspace/ArtifactViewer.jsx';
import { IntakePanel } from '../components/workspace/IntakePanel.jsx';
import { FolderPicker } from '../components/workspace/FolderPicker.jsx';
import { ClientReportPanel } from '../components/workspace/ClientReportPanel.jsx';
import { LocalLibraryProvider } from '../context/LocalLibraryContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { listSolutions } from '../lib/solutionStore.js';
import {
  artifactDate, artifactTitle, buildWorkspace, pool, WORKSPACE_KINDS,
} from '../lib/projectWorkspace.js';
import { COMPLETED_CASE_STUDIES } from '../data/completedCaseStudies.js';
import { MY_DOCUMENTS, MY_PROJECTS } from '../data/myWork.js';
import { PROJECTS } from '../data/projects.js';
import { cn } from '../lib/utils.js';

const KIND_META = {
  solution:     { label: 'Solutions',     icon: Layers,        to: '/solution' },
  architecture: { label: 'Architecture',  icon: Network,       to: '/architecture' },
  script:       { label: 'Scripts / IaC', icon: FileCode,      to: '/solution' },
  plan:         { label: 'Project plans', icon: ClipboardList, to: '/project-plan' },
  proposal:     { label: 'Proposals',     icon: ScrollText,    to: '/freelance?tab=myproposals' },
  email:        { label: 'Emails',        icon: Mail,          to: '/email' },
  contract:     { label: 'Contracts',     icon: ClipboardList, to: '/documents?tab=contracts' },
  invoice:      { label: 'Invoices',      icon: Receipt,       to: '/documents?tab=invoices' },
  document:     { label: 'Documents',     icon: FileText,      to: '/documents' },
  deck:         { label: 'Decks',         icon: Deck,          to: '/presentation' },
  portfolio:    { label: 'Portfolio',     icon: FolderOpen,    to: '/portfolio' },
  caseStudy:    { label: 'Case studies',  icon: BookOpen,      to: '/documents' },
};

const titleOf = (item, kind) =>
  artifactTitle(item, kind) || item?.title || item?.name || item?.subject ||
  `${KIND_META[kind]?.label || kind} record`;

const whenOf = (item, kind) =>
  artifactDate(item, kind) || item?.updatedAt || item?.completedAt || item?.createdAt ||
  item?.savedAt || item?.at || null;

const linkFor = (item, kind) => {
  if (kind === 'portfolio' && item?.id) return `/portfolio/${item.id}`;
  return KIND_META[kind]?.to || '/';
};

/**
 * The name to reuse.
 *
 * Artifacts are gathered by an explicit projectId first and by a matching
 * title second. Most tools in this app write a title and no id, so in
 * practice the title is what decides whether a new proposal or invoice
 * lands in this container or sits on its own in "not linked to a
 * project". That makes the exact wording worth handing over, rather than
 * leaving someone to retype it and wonder why it did not appear.
 */
function NameToReuse({ title }) {
  const [copied, setCopied] = useState(false);
  if (!title) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-token bg-[var(--card-2)] px-2.5 py-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Name to reuse</span>
      <code className="text-[11.5px] font-bold min-w-0 break-all">{title}</code>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(title);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch { setCopied(false); }
        }}
        className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-aws-orange transition"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? 'Copied' : 'Copy'}
      </button>
      <p className="basis-full text-[10.5px] text-muted">
        Give a new proposal, email, invoice or solution this exact name and it lands in this
        container by itself. A different name starts a separate project.
      </p>
    </div>
  );
}

const dateLabel = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
};

function WorkspaceInner() {
  const [view, setView] = useState('projects');
  const [openId, setOpenId] = useState(null);
  const [tab, setTab] = useState('contents');
  const [selected, setSelected] = useState(null); // { kind, index }
  const [kind, setKind] = useState('proposal');
  const [query, setQuery] = useState('');

  const { profile } = useApp();
  const earn = useEarn();
  const freelance = useFreelance();
  const portfolio = usePortfolio();

  // The portfolio store is keyed by catalogue project id and holds only
  // progress — no title, no services. Shown raw it reads as "p-s3-cf",
  // and its one row reads as "Portfolio record".
  const portfolioEntries = useMemo(() => {
    const saved = portfolio?.state?.projects || {};
    const out = {};
    for (const [id, entry] of Object.entries(saved)) {
      const cat = PROJECTS.find((x) => x.id === id);
      out[id] = {
        ...(entry || {}),
        title: entry?.title || cat?.title || id,
        services: entry?.services || cat?.services || [],
      };
    }
    return out;
  }, [portfolio?.state]);

  const workspace = useMemo(() => buildWorkspace({
    solutions: listSolutions() || [],
    // Work already recorded in the app but living only on the documents
    // page, so the workspace reported nothing while real work existed.
    caseStudies: [...COMPLETED_CASE_STUDIES, ...MY_PROJECTS],
    proposals: freelance?.state?.proposals || [],
    emails: earn?.state?.emails || [],
    portfolio: portfolioEntries,
    documents: [...(earn?.state?.deliveries || []), ...MY_DOCUMENTS],
    decks: earn?.state?.decks || [],
    contracts: earn?.state?.contracts || [],
    invoices: freelance?.state?.invoices || [],
    plans: earn?.state?.plans || [],
  }), [earn?.state, freelance?.state, portfolioEntries]);

  const open = workspace.projects.find((p) => p.id === openId) || null;

  // Opening a project should show something, not an empty right-hand pane.
  useEffect(() => {
    if (!openId) { setSelected(null); return; }
    const project = workspace.projects.find((p) => p.id === openId);
    if (!project) { setSelected(null); return; }
    const first = WORKSPACE_KINDS.find((k) => project.artifacts[k].length);
    setSelected(first ? { kind: first, index: 0 } : null);
    setTab('contents');
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // buildWorkspace deliberately refuses to file an artifact under a project
  // it only half-matches. That is the right call, but the page then dropped
  // those items entirely — neither filed nor shown.
  const unplaced = useMemo(
    () => WORKSPACE_KINDS.filter((k) => workspace.unassigned?.[k]?.length),
    [workspace],
  );

  const nothingYet = workspace.totals.projects === 0 &&
    WORKSPACE_KINDS.every((k) => workspace.totals[k] === 0);

  const selectedItem = open && selected ? open.artifacts[selected.kind]?.[selected.index] : null;

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Workspace"
        title="Everything, by the job it belongs to."
        subtitle="One container per piece of client work — its solution, architecture, templates, plan, proposal, emails, contract and invoice together. Open any one of them and read it here."
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
            {['script', 'proposal', 'email', 'document', 'invoice'].map((k) => (
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

          {/* ───────────── the projects list ───────────── */}
          {view === 'projects' && !open && (
            <section className="grid gap-2 sm:grid-cols-2">
              {filteredProjects.map((p) => (
                <button key={p.id} onClick={() => setOpenId(p.id)}
                        className="surface rounded-2xl p-4 text-left hover:border-aws-orange/50 transition">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-sm leading-snug">{p.title}</h3>
                    <span className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold shrink-0">
                      {p.artifactCount} item{p.artifactCount === 1 ? '' : 's'}
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

          {/* ───────────── what could not be placed ───────────── */}
          {view === 'projects' && !open && unplaced.length > 0 && (
            <section className="surface rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Inbox size={14} className="text-muted" />
                <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Not linked to a project</h3>
              </div>
              <p className="text-[11px] text-muted mt-1 mb-3">
                These exist, but nothing records which job they belong to — so they are listed
                here rather than filed under a guess.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {unplaced.map((k) => {
                  const meta = KIND_META[k] || { label: k, icon: FileText, to: '/' };
                  const Icon = meta.icon;
                  return (
                    <div key={k}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon size={12} className="text-aws-orange" />
                        <span className="text-[11px] font-bold">{meta.label}</span>
                        <span className="text-[10px] text-muted">{workspace.unassigned[k].length}</span>
                      </div>
                      <ul className="space-y-0.5">
                        {workspace.unassigned[k].map((item, i) => (
                          <li key={item?.id || i}>
                            <Link to={linkFor(item, k)}
                                  className="group flex items-center gap-1 text-[12px] text-muted hover:text-aws-orange transition">
                              <span className="min-w-0 truncate">{titleOf(item, k)}</span>
                              <ChevronRight size={11} className="shrink-0 opacity-0 group-hover:opacity-100" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ───────────── one project, opened ───────────── */}
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
                  <span>{open.artifactCount} item{open.artifactCount === 1 ? '' : 's'}</span>
                </div>
                <NameToReuse title={open.title} />
                <div className="inline-flex rounded-xl border border-token overflow-hidden mt-3">
                  {[
                    ['contents', 'Everything in this job'],
                    ['report', 'Client report'],
                    ['intake', 'Ask the client'],
                  ].map(([id, label]) => (
                    <button key={id} onClick={() => setTab(id)}
                            className={cn('px-3 py-1.5 text-xs font-bold transition inline-flex items-center gap-1.5',
                              tab === id ? 'bg-aws-orange/15 text-aws-orange' : 'text-muted hover:text-current')}>
                      {id === 'intake' && <HelpCircle size={12} />}
                      {id === 'report' && <ReportIcon size={12} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'report' && (
                <ClientReportPanel project={open} author={profile?.name} company={profile?.company} />
              )}

              {tab === 'intake' && <IntakePanel project={open} author={profile?.name} />}

              {tab === 'contents' && open.artifacts.document.some((d) => d?.localPath || d?.file) && (
                <FolderPicker />
              )}

              {tab === 'contents' && (
                <div className="grid gap-3 lg:grid-cols-[15rem_1fr]">
                  <nav className="surface rounded-2xl p-2 lg:max-h-[44rem] lg:overflow-y-auto">
                    {WORKSPACE_KINDS.filter((k) => open.artifacts[k].length).map((k) => {
                      const meta = KIND_META[k] || { label: k, icon: FileText };
                      const Icon = meta.icon;
                      return (
                        <div key={k} className="mb-2 last:mb-0">
                          <div className="flex items-center gap-1.5 px-2 py-1">
                            <Icon size={11} className="text-aws-orange" />
                            <span className="text-[10px] font-extrabold uppercase tracking-widest">{meta.label}</span>
                            <span className="text-[10px] text-muted">{open.artifacts[k].length}</span>
                          </div>
                          {open.artifacts[k].map((item, i) => {
                            const active = selected?.kind === k && selected?.index === i;
                            return (
                              <button
                                key={item?.id || i}
                                onClick={() => setSelected({ kind: k, index: i })}
                                className={cn(
                                  'w-full text-left px-2 py-1.5 rounded-lg text-[12px] transition truncate',
                                  active
                                    ? 'bg-aws-orange/15 text-aws-orange font-bold'
                                    : 'text-muted hover:bg-[var(--card-2)] hover:text-current',
                                )}
                              >
                                {titleOf(item, k)}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </nav>

                  <div className="min-w-0">
                    {selectedItem ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <h3 className="font-extrabold text-sm">{titleOf(selectedItem, selected.kind)}</h3>
                          {dateLabel(whenOf(selectedItem, selected.kind)) && (
                            <span className="text-[11px] text-muted">
                              {dateLabel(whenOf(selectedItem, selected.kind))}
                            </span>
                          )}
                        </div>
                        <ArtifactViewer
                          item={selectedItem}
                          kind={selected.kind}
                          to={linkFor(selectedItem, selected.kind)}
                        />
                      </div>
                    ) : (
                      <div className="surface rounded-2xl p-6 text-center">
                        <p className="text-sm text-muted">Nothing in this project yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {/* ───────────── everything of one kind ───────────── */}
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
                    <li key={item?.id || i} className="border-b border-token/40 last:border-0">
                      <Link
                        to={linkFor(item, kind)}
                        className="group flex items-start justify-between gap-3 py-1.5 px-1 -mx-1 rounded text-[12px] hover:bg-[var(--card-2)] transition"
                      >
                        <span className="min-w-0">
                          <span className="block truncate group-hover:text-aws-orange">{titleOf(item, kind)}</span>
                          <span className="text-[10.5px] text-muted">
                            {item.__project || 'Not linked to a project'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {dateLabel(whenOf(item, kind)) && (
                            <span className="text-[10.5px] text-muted">{dateLabel(whenOf(item, kind))}</span>
                          )}
                          <ChevronRight size={12} className="text-muted group-hover:text-aws-orange" />
                        </span>
                      </Link>
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

/**
 * The chosen folder belongs to the page, not to one document, so the
 * provider sits above every project. Pick it once and switching between
 * documents costs nothing.
 */
export default function Workspace() {
  return (
    <LocalLibraryProvider>
      <WorkspaceInner />
    </LocalLibraryProvider>
  );
}
