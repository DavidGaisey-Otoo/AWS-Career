/**
 * DeepWalkthrough.jsx — PJ-01 Deep Walkthrough page.
 *
 * Standard Mode shows just the WHAT + HOW (Console click-steps) — that's
 * the existing walkthrough behaviour. Deep Mode adds:
 *   WHY (≥4 sentences) · Real-world analogy · Common mistakes ·
 *   HOW in 4 formats (Console / CLI / CloudFormation / Terraform) ·
 *   Per-step completion checkbox.
 *
 * Toggle is global (localStorage) — set it once, it persists.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, Lightbulb, AlertTriangle, Layers,
  Terminal, Cloud, Server, FileCode, BookOpen, RotateCcw, Sparkles, Target,
  FileText,
} from 'lucide-react';
import { DEEP_WALKTHROUGHS, getDeepWalkthrough } from '../data/deepWalkthroughs.js';
import { useDeepMode, useStepCompletion, getWalkthroughProgress } from '../lib/deepMode.js';
import { cn } from '../lib/utils.js';
import { GenerateFullScriptModal } from '../components/walkthrough/GenerateFullScriptModal.jsx';
import { CostEstimatorCard } from '../components/build/CostEstimatorCard.jsx';
import { RegionSuggestionChip } from '../components/build/RegionSuggestionChip.jsx';
import { useProjectRegion } from '../lib/projectRegion.js';
import {
  useSavedWalkthroughs, getStoredView, setStoredView,
  archiveSavedWalkthrough, deleteSavedWalkthrough, getSavedWalkthrough,
} from '../lib/savedWalkthroughs.js';
import { useEffect } from 'react';

export default function DeepWalkthrough() {
  const { id } = useParams();

  // Index screen
  if (!id) return <DeepWalkthroughsIndex />;

  // Lookup in curated DEEP_WALKTHROUGHS, then in user-saved
  const walkthrough = getDeepWalkthrough(id) || getSavedWalkthrough(id);
  if (!walkthrough) {
    return (
      <div className="surface rounded-3xl p-12 text-center">
        <div className="text-2xl mb-2">🤷</div>
        <h2 className="text-xl font-bold">Walkthrough not found</h2>
        <Link to="/walkthroughs/deep" className="mt-4 inline-flex items-center gap-1 text-aws-orange font-semibold hover:underline">
          <ArrowLeft size={14} /> Back to Deep Walkthroughs
        </Link>
      </div>
    );
  }

  return <WalkthroughView walkthrough={walkthrough} />;
}

// ════════════════════════════════════════════════════════════════════
// Library Hub — 3 switchable views with search + filters
// (PJ-04 Phase A)
// ════════════════════════════════════════════════════════════════════
const SERVICE_CATEGORIES = {
  Compute:    ['ec2', 'ecs', 'eks', 'lambda', 'fargate', 'asg', 'batch'],
  Storage:    ['s3', 'ebs', 'efs', 'fsx', 'glacier', 'storage-gateway'],
  Database:   ['rds', 'aurora', 'dynamodb', 'elasticache', 'redshift', 'documentdb'],
  Networking: ['vpc', 'cloudfront', 'route53', 'alb', 'nlb', 'tgw', 'dx', 'vpn', 'apigateway'],
  Security:   ['iam', 'kms', 'secretsmgr', 'cognito', 'waf', 'shield', 'acm', 'guardduty'],
  Integration:['sqs', 'sns', 'eventbridge', 'step'],
  Analytics:  ['kinesis', 'firehose', 'athena', 'glue', 'redshift'],
  'AI / ML':  ['bedrock', 'sagemaker', 'comprehend', 'rekognition'],
  DevOps:     ['cloudformation', 'cloudwatch', 'cloudtrail', 'config'],
};

function categorizeWalkthrough(w) {
  const services = (w.services || []).map((s) => s.toLowerCase());
  for (const [cat, ids] of Object.entries(SERVICE_CATEGORIES)) {
    if (services.some((s) => ids.includes(s))) return cat;
  }
  return 'Other';
}

function DeepWalkthroughsIndex() {
  const [deep, setDeep] = useDeepMode();
  const saved = useSavedWalkthroughs();
  const [view, setView] = useState(() => getStoredView());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | not-started | in-progress | done
  const [sortBy, setSortBy] = useState('recent'); // recent | progress | alpha

  useEffect(() => { setStoredView(view); }, [view]);

  // Build the merged library: curated + saved (non-archived) + archived
  const merged = useMemo(() => {
    const curated = DEEP_WALKTHROUGHS.map((w) => ({ ...w, source: 'library' }));
    return [...curated, ...saved];
  }, [saved]);

  // Decorate every walkthrough with progress + status
  const decorated = useMemo(() => {
    return merged.map((w) => {
      const total = (w.steps || []).length;
      const { done, pct } = getWalkthroughProgress(w.id, total);
      const status = done === 0 ? 'not-started' : done === total ? 'done' : 'in-progress';
      return { ...w, _done: done, _total: total, _pct: pct, _status: status };
    });
  }, [merged]);

  // Apply search + status filter
  const filtered = useMemo(() => {
    let list = decorated;
    if (statusFilter !== 'all') list = list.filter((w) => w._status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) =>
        (w.title || '').toLowerCase().includes(q) ||
        (w.blurb || '').toLowerCase().includes(q) ||
        (w.services || []).some((s) => s.toLowerCase().includes(q))
      );
    }
    // Sort
    if (sortBy === 'alpha') list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'progress') list = [...list].sort((a, b) => b._pct - a._pct);
    else if (sortBy === 'recent') {
      list = [...list].sort((a, b) => {
        const at = a.createdAt || '0';
        const bt = b.createdAt || '0';
        return bt.localeCompare(at);
      });
    }
    return list;
  }, [decorated, search, statusFilter, sortBy]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            PJ-01 + PJ-04 · Your build library
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
            🛠 Deep Walkthroughs
            <span className="text-xs font-bold opacity-70 px-2 py-1 rounded-full bg-[var(--card-2)]">
              {merged.length} total
            </span>
          </h1>
          <p className="text-sm opacity-80 mt-1.5">
            Every step explained: WHAT, WHY, analogy, common mistakes, and HOW in all 4 formats.
            Hand-authored library + your own generated walkthroughs in one place.
          </p>
        </div>
        <Link
          to="/walkthroughs/deep/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-aws text-ink-950 text-xs font-extrabold shadow-glow-orange hover:brightness-110"
        >
          ✨ Generate from brief
        </Link>
      </header>

      <DeepModeToggle enabled={deep} onChange={setDeep} />

      {/* Controls bar — view switcher + search + filters + sort */}
      <div className="surface rounded-2xl p-4 space-y-3">
        {/* View mode tabs */}
        <div className="flex flex-wrap gap-1.5">
          <ViewTab id="workspace" active={view} onClick={setView} icon="🗂" label="Workspace" />
          <ViewTab id="category"  active={view} onClick={setView} icon="🏷"  label="By Category" />
          <ViewTab id="project"   active={view} onClick={setView} icon="📁" label="By Project" />
        </div>
        {/* Search + status + sort */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Search by name, service, or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[13px] outline-none focus:border-aws-orange"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer"
          >
            <option value="all">All status</option>
            <option value="not-started">Not started</option>
            <option value="in-progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer"
          >
            <option value="recent">Most recent</option>
            <option value="progress">Most progress</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>
        {/* Result count */}
        <div className="text-[11px] opacity-70">
          Showing <strong className="text-aws-orange">{filtered.length}</strong> of {merged.length} walkthroughs
        </div>
      </div>

      {/* Render the chosen view */}
      {view === 'workspace' && <WorkspaceView list={filtered} />}
      {view === 'category'  && <CategoryView  list={filtered} />}
      {view === 'project'   && <ProjectView   list={filtered} />}

      {filtered.length === 0 && (
        <div className="surface rounded-2xl p-8 text-center opacity-70">
          <div className="text-3xl mb-2">🔍</div>
          <div className="text-sm">No walkthroughs match those filters.</div>
        </div>
      )}
    </div>
  );
}

function ViewTab({ id, active, onClick, icon, label }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition border',
        isActive
          ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
          : 'border-token text-muted hover:text-current'
      )}
    >
      <span>{icon}</span> {label}
    </button>
  );
}

// ────────── View 1: Workspace — grouped by source ──────────
function WorkspaceView({ list }) {
  const groups = useMemo(() => {
    const g = { library: [], project: [], freelance: [], manual: [], archived: [] };
    for (const w of list) {
      if (w.archived) g.archived.push(w);
      else if (w.source === 'library') g.library.push(w);
      else if (w.source === 'project') g.project.push(w);
      else if (w.source === 'freelance') g.freelance.push(w);
      else g.manual.push(w);
    }
    return g;
  }, [list]);

  return (
    <div className="space-y-5">
      <Section title="📚 AWS Library" subtitle="Hand-authored curated walkthroughs" items={groups.library} />
      <Section title="🛠 My Projects" subtitle="Generated from Project Builder" items={groups.project} />
      <Section title="💼 Freelance Jobs" subtitle="Generated from Job Analyzer briefs" items={groups.freelance} />
      <Section title="✍ Manual / Custom" subtitle="Anything you created from a free-form brief" items={groups.manual} />
      <Section title="🗃 Archived" subtitle="Completed + put away" items={groups.archived} />
    </div>
  );
}

// ────────── View 2: Category — grouped by service category ──────────
function CategoryView({ list }) {
  const groups = useMemo(() => {
    const g = {};
    for (const w of list) {
      const cat = categorizeWalkthrough(w);
      if (!g[cat]) g[cat] = [];
      g[cat].push(w);
    }
    return g;
  }, [list]);
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([cat, items]) => (
        <Section key={cat} title={`🏷 ${cat}`} items={items} />
      ))}
    </div>
  );
}

// ────────── View 3: Project — alphabetical, flat ──────────
function ProjectView({ list }) {
  const sorted = useMemo(() => [...list].sort((a, b) => a.title.localeCompare(b.title)), [list]);
  return (
    <div className="surface rounded-2xl divide-y divide-token">
      {sorted.map((w) => <ProjectRow key={w.id} w={w} />)}
    </div>
  );
}

function ProjectRow({ w }) {
  return (
    <Link to={`/walkthroughs/deep/${w.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--card-2)]/40 transition">
      <div className="text-xl">{w.services?.includes('ec2') ? '🖥' : '🪣'}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-extrabold truncate">{w.title}</div>
        <div className="text-[10.5px] opacity-70">{w.services?.join(' · ') || ''}</div>
      </div>
      <StatusPill status={w._status} pct={w._pct} done={w._done} total={w._total} />
    </Link>
  );
}

// ────────── Shared bits ──────────
function Section({ title, subtitle, items }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-base font-extrabold">{title}
          <span className="ml-2 text-[11px] opacity-60 font-bold">{items.length}</span>
        </h3>
        {subtitle && <span className="text-[11px] opacity-60">{subtitle}</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((w) => <WalkthroughCard key={w.id} w={w} />)}
      </div>
    </section>
  );
}

function WalkthroughCard({ w }) {
  return (
    <Link
      to={`/walkthroughs/deep/${w.id}`}
      className="surface rounded-2xl p-4 hover:border-aws-orange/40 border border-transparent transition group block relative"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-3xl">{w.services?.includes('ec2') ? '🖥' : '🪣'}</div>
        <div className="flex items-center gap-1.5">
          {w.source && w.source !== 'library' && (
            <span className="px-1.5 py-0.5 rounded-full bg-aws-orange/15 text-aws-orange text-[9px] font-extrabold uppercase">
              {w.source}
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-[var(--card-2)] font-bold text-[10px]">
            {w.difficulty}
          </span>
        </div>
      </div>
      <h3 className="text-base font-extrabold mb-1 group-hover:text-aws-orange transition leading-tight">{w.title}</h3>
      <p className="text-[12px] opacity-75 leading-snug mb-2 line-clamp-2">{w.blurb}</p>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-[var(--card-2)] overflow-hidden mb-2">
        <div className="h-full transition-all" style={{
          width: `${w._pct}%`,
          backgroundColor: w._pct === 100 ? 'var(--success, #16a34a)'
            : w._pct > 0 ? 'var(--aws-orange, #FF9900)'
            : 'transparent',
        }} />
      </div>

      <div className="flex items-center justify-between text-[10.5px] opacity-70">
        <span><Clock size={10} className="inline -mt-0.5 mr-0.5" />{w.estMinutes} min</span>
        <span><Layers size={10} className="inline -mt-0.5 mr-0.5" />{w._done}/{w._total} done</span>
        <StatusPill status={w._status} pct={w._pct} done={w._done} total={w._total} compact />
      </div>
    </Link>
  );
}

function StatusPill({ status, pct, done, total, compact = false }) {
  const map = {
    'not-started': { label: 'New', cls: 'bg-[var(--card-2)] opacity-70' },
    'in-progress': { label: `${pct}%`, cls: 'bg-warning/15 text-warning' },
    'done':        { label: '✓ Done', cls: 'bg-success/15 text-success' },
  };
  const m = map[status] || map['not-started'];
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full font-extrabold whitespace-nowrap',
      compact ? 'text-[9px]' : 'text-[10.5px]',
      m.cls
    )}>
      {m.label}
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════
// Walkthrough view
// ════════════════════════════════════════════════════════════════════
function WalkthroughView({ walkthrough }) {
  const [deep, setDeep] = useDeepMode();
  const { completed, toggleStep, resetAll } = useStepCompletion(walkthrough.id);
  const doneCount = Object.keys(completed).length;
  const pct = Math.round((doneCount / walkthrough.steps.length) * 100);

  const [resetConfirm, setResetConfirm] = useState(false);
  const [scriptModalOpen, setScriptModalOpen] = useState(false);

  // AD-01: per-project region (used by Cost Estimator + Script Generator)
  const savedRegion = useProjectRegion(walkthrough.id);
  const briefForSuggestion = walkthrough.blurb || walkthrough.title || '';
  function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    resetAll();
    setResetConfirm(false);
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Link to="/walkthroughs/deep" className="text-sm opacity-70 hover:opacity-100 inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> All Deep Walkthroughs
      </Link>

      {/* Header */}
      <header className="surface rounded-3xl p-6 gradient-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold mb-2">{walkthrough.title}</h1>
          {/* AD-01: Region suggestion chip */}
          <RegionSuggestionChip projectId={walkthrough.id} brief={briefForSuggestion} />
        </div>
        <p className="text-sm opacity-80 mb-3">{walkthrough.blurb}</p>
        <div className="flex flex-wrap gap-3 text-[11.5px] opacity-80">
          <span><Clock size={11} className="inline -mt-0.5 mr-1" />~{walkthrough.estMinutes} min</span>
          <span><Layers size={11} className="inline -mt-0.5 mr-1" />{walkthrough.steps.length} steps</span>
          <span><Target size={11} className="inline -mt-0.5 mr-1" />{walkthrough.difficulty}</span>
          <span>Services: {walkthrough.services.join(' · ')}</span>
        </div>
        {walkthrough.prereqs?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-token">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">Prerequisites</div>
            <ul className="text-[12.5px] opacity-90 space-y-0.5">
              {walkthrough.prereqs.map((p, i) => <li key={i}>• {p}</li>)}
            </ul>
          </div>
        )}
      </header>

      {/* Toggle + progress */}
      <div className="flex flex-wrap items-center justify-between gap-3 surface rounded-2xl p-4">
        <DeepModeToggle enabled={deep} onChange={setDeep} inline />
        <div className="flex items-center gap-3 text-xs">
          <span className="opacity-70">
            <strong className="text-aws-orange tabular-nums">{doneCount}</strong> / {walkthrough.steps.length} steps done ({pct}%)
          </span>
          <button
            onClick={handleReset}
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-bold',
              resetConfirm ? 'text-danger' : 'text-muted hover:text-danger'
            )}
          >
            <RotateCcw size={11} />
            {resetConfirm ? 'Click to confirm' : 'Reset progress'}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {walkthrough.steps.map((step) => (
          <StepCard
            key={step.number}
            step={step}
            deep={deep}
            done={!!completed[step.number]}
            onToggle={() => toggleStep(step.number)}
          />
        ))}
      </div>

      {/* Completion summary */}
      {doneCount === walkthrough.steps.length && (
        <div className="surface rounded-3xl p-7 text-center gradient-border">
          <div className="text-5xl mb-2">🎉</div>
          <h2 className="text-xl font-extrabold mb-1">All steps complete!</h2>
          <p className="opacity-80 text-sm">
            You\'ve walked through every step of {walkthrough.title}. Try another Deep Walkthrough or apply this to a real project.
          </p>
        </div>
      )}

      {/* PJ-03: AWS Cost Estimator — region-aware estimate for the services this walkthrough uses */}
      <CostEstimatorCard
        services={walkthrough.services || []}
        projectName={walkthrough.title}
        region={savedRegion?.region}
      />

      {/* PJ-02: Generate Full Project Script — always available at the bottom */}
      <section className="surface rounded-3xl p-6 border-l-4 border-l-aws-orange">
        <div className="flex flex-wrap items-start gap-4">
          <div className="text-4xl">📜</div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              Ready to take this with you?
            </div>
            <h3 className="text-lg font-extrabold mb-1">Generate Full Project Script</h3>
            <p className="text-[12.5px] opacity-80 leading-snug">
              Combine every step into a single production-quality script — pick from 4 formats: Console PDF-ready guide, full Bash CLI script, complete CloudFormation template, or Terraform configuration. Preview, copy, or download.
            </p>
          </div>
          <button
            onClick={() => setScriptModalOpen(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <FileText size={14} /> Generate Full Project Script
          </button>
        </div>
      </section>

      <GenerateFullScriptModal
        walkthrough={walkthrough}
        open={scriptModalOpen}
        onClose={() => setScriptModalOpen(false)}
        region={savedRegion?.region}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step card — renders Standard or Deep view based on toggle
// ════════════════════════════════════════════════════════════════════
function StepCard({ step, deep, done, onToggle }) {
  return (
    <section className={cn(
      'surface rounded-2xl p-5 transition',
      done && 'border-l-4 border-l-success'
    )}>
      {/* Header — number + title + checkbox */}
      <div className="flex items-start gap-3 mb-3">
        <button
          onClick={onToggle}
          className="flex-shrink-0 mt-0.5 text-success hover:scale-110 transition"
          title={done ? 'Mark incomplete' : 'Mark complete'}
        >
          {done
            ? <CheckCircle2 size={22} className="text-success" />
            : <Circle size={22} className="text-muted opacity-50 hover:opacity-100" />}
        </button>
        <div className="flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            Step {step.number} {done && '· ✓ Done'}
          </div>
          <h3 className={cn('text-lg font-extrabold leading-snug', done && 'line-through opacity-60')}>
            {step.title}
          </h3>
        </div>
      </div>

      {/* WHAT — always shown */}
      <DeepSection icon={<BookOpen size={14} />} title="What" colorClass="text-aws-orange">
        <p className="text-[14px] opacity-90 leading-relaxed">{step.what}</p>
      </DeepSection>

      {/* DEEP-ONLY sections */}
      {deep && step.why && (
        <DeepSection icon={<Lightbulb size={14} />} title="Why this step matters" colorClass="text-aws-orange">
          <p className="text-[13.5px] opacity-90 leading-relaxed whitespace-pre-line">{step.why}</p>
        </DeepSection>
      )}

      {deep && step.analogy && (
        <DeepSection icon={<Sparkles size={14} />} title="Real-world analogy" colorClass="text-aws-orange">
          <p className="text-[13.5px] italic opacity-90 leading-relaxed">{step.analogy}</p>
        </DeepSection>
      )}

      {deep && step.mistakes?.length > 0 && (
        <DeepSection icon={<AlertTriangle size={14} />} title="Common mistakes" colorClass="text-warning">
          <ul className="space-y-1.5">
            {step.mistakes.map((m, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <AlertTriangle size={12} className="text-warning mt-1 flex-shrink-0" />
                <span className="opacity-90">{m}</span>
              </li>
            ))}
          </ul>
        </DeepSection>
      )}

      {/* HOW — Standard shows Console only; Deep shows all 4 tabs */}
      <DeepSection icon={<Server size={14} />} title="How" colorClass="text-aws-orange">
        {deep
          ? <HowTabs how={step.how} />
          : <ConsoleSteps steps={step.how?.console} />}
      </DeepSection>
    </section>
  );
}

function DeepSection({ icon, title, colorClass, children }) {
  return (
    <div className="mt-3 first:mt-0">
      <div className={cn('text-[10px] font-extrabold uppercase tracking-widest mb-1.5 flex items-center gap-1.5', colorClass)}>
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// HOW tabs — Console / CLI / CFN / Terraform
// ════════════════════════════════════════════════════════════════════
function HowTabs({ how }) {
  const [tab, setTab] = useState('console');
  const tabs = [
    { id: 'console', label: 'Console', icon: <Server size={12} /> },
    { id: 'cli',     label: 'CLI',     icon: <Terminal size={12} /> },
    { id: 'cfn',     label: 'CloudFormation', icon: <Cloud size={12} /> },
    { id: 'tf',      label: 'Terraform', icon: <FileCode size={12} /> },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition border',
              tab === t.id
                ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                : 'border-token text-muted hover:text-current'
            )}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {tab === 'console' && <ConsoleSteps steps={how?.console} />}
      {tab === 'cli' && <CodeBlock language="bash" code={how?.cli} />}
      {tab === 'cfn' && <CodeBlock language="yaml" code={how?.cfn} />}
      {tab === 'tf'  && <CodeBlock language="hcl" code={how?.tf} />}
    </div>
  );
}

function ConsoleSteps({ steps }) {
  if (!steps || steps.length === 0) {
    return <div className="text-[12px] opacity-60 italic">No console steps available.</div>;
  }
  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-[13.5px]">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--card-2)] text-[10px] font-bold flex items-center justify-center mt-0.5 opacity-70 tabular-nums">
            {i + 1}
          </span>
          <span className="opacity-90 leading-relaxed">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  if (!code) return <div className="text-[12px] opacity-60 italic">No {language} snippet for this step.</div>;
  return (
    <div className="relative">
      <button
        onClick={() => {
          navigator.clipboard?.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded bg-[var(--card)] hover:bg-[var(--card-2)] border border-token opacity-80 hover:opacity-100 z-10"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <pre className="rounded-lg border border-token bg-[var(--card-2)]/60 p-3 text-[12px] leading-snug overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Toggle component (exported for use on other pages)
// ════════════════════════════════════════════════════════════════════
export function DeepModeToggle({ enabled, onChange, inline = false }) {
  return (
    <div className={cn(
      'flex items-center gap-3',
      !inline && 'surface rounded-2xl p-4 border-l-4 border-l-aws-orange'
    )}>
      <div className="flex-1">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
          <Sparkles size={11} /> Walkthrough mode
        </div>
        {!inline && (
          <div className="text-[11.5px] opacity-70 mt-0.5">
            <strong>Standard:</strong> WHAT + Console steps. <strong>Deep:</strong> adds WHY, analogy, common mistakes, and HOW in 4 formats (Console / CLI / CFN / Terraform).
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('text-[12px] font-bold', !enabled ? 'text-aws-orange' : 'opacity-60')}>Standard</span>
        <button
          onClick={() => onChange(!enabled)}
          role="switch"
          aria-checked={enabled}
          className={cn(
            'relative w-12 h-6 rounded-full transition border-2',
            enabled ? 'bg-aws-orange/30 border-aws-orange' : 'bg-[var(--card-2)] border-token'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-aws-orange transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          )} />
        </button>
        <span className={cn('text-[12px] font-bold', enabled ? 'text-aws-orange' : 'opacity-60')}>Deep</span>
      </div>
    </div>
  );
}
