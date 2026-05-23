import { motion } from 'framer-motion';
import {
  Archive, CalendarClock, Check, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardCopy, Edit3, ExternalLink, Filter, Github, Inbox, Linkedin,
  Mail, Plus, Rocket, Sparkles, Trash2, Wand2, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { TOPIC_IDEAS, postsFromCertPass, postsFromProject } from '../data/linkedinPosts.js';
import { PROJECTS } from '../data/projects.js';
import { cn } from '../lib/utils.js';

// =================================================================
// Item kinds + their visual treatment
// =================================================================

const KIND_META = {
  'linkedin-post':   { label: 'LinkedIn post',  icon: Linkedin, tone: 'border-electric/40 bg-electric/10 text-electric' },
  'github-push':     { label: 'GitHub push',    icon: Github,   tone: 'border-token bg-[var(--card-2)] text-current' },
  'email':           { label: 'Email',          icon: Mail,     tone: 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange' },
  'blog-post':       { label: 'Blog post',      icon: Edit3,    tone: 'border-violet-400/40 bg-violet-400/10 text-violet-300' },
  'upwork-proposal': { label: 'Upwork proposal',icon: Sparkles, tone: 'border-success/40 bg-success/10 text-success' },
  'note':            { label: 'Note',           icon: Inbox,    tone: 'border-token bg-[var(--card-2)] text-muted' },
};

const STATUS_META = {
  draft:     { label: 'Draft',     tone: 'border-token bg-[var(--card-2)] text-muted' },
  ready:     { label: 'Ready',     tone: 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange' },
  scheduled: { label: 'Scheduled', tone: 'border-electric/40 bg-electric/10 text-electric' },
  published: { label: 'Published', tone: 'border-success/40 bg-success/10 text-success' },
  archived:  { label: 'Archived',  tone: 'border-token bg-[var(--card)] text-muted' },
};

// =================================================================
// Page
// =================================================================

export default function ContentQueue() {
  const toast = useToast();
  const dialog = useDialog();
  const { profile } = useApp();
  const { state: portfolio } = usePortfolio();
  const { state: earn, stageInQueue, updateQueueItem, removeQueueItem } = useEarn();

  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeId, setActiveId] = useState(null);

  // Quick stats
  const stats = useMemo(() => {
    const q = earn.queue || [];
    return {
      total: q.length,
      draft: q.filter((x) => x.status === 'draft').length,
      ready: q.filter((x) => x.status === 'ready').length,
      scheduled: q.filter((x) => x.status === 'scheduled').length,
      published: q.filter((x) => x.status === 'published').length,
      thisWeek: q.filter((x) => {
        if (!x.scheduledAt) return false;
        const d = new Date(x.scheduledAt);
        const now = new Date();
        return d >= now && d <= new Date(now.getTime() + 7 * 86400000);
      }).length,
    };
  }, [earn.queue]);

  const filtered = useMemo(() => {
    return (earn.queue || [])
      .filter((x) => kindFilter === 'all' || x.kind === kindFilter)
      .filter((x) => statusFilter === 'all' || x.status === statusFilter)
      .sort((a, b) => {
        // Scheduled first by date, then drafts/ready by createdAt
        if (a.scheduledAt && b.scheduledAt) return new Date(a.scheduledAt) - new Date(b.scheduledAt);
        if (a.scheduledAt) return -1;
        if (b.scheduledAt) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
  }, [earn.queue, kindFilter, statusFilter]);

  const active = filtered.find((q) => q.id === activeId) || filtered[0] || null;

  const onDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Remove from queue?',
      description: 'This permanently deletes the draft.',
      danger: true,
    });
    if (ok) {
      removeQueueItem(id);
      if (id === activeId) setActiveId(null);
    }
  };

  const onPublishNow = async (item) => {
    // For LinkedIn / blog — open the target with content pre-loaded if possible
    if (item.kind === 'linkedin-post') {
      try { await navigator.clipboard.writeText(item.body); } catch {}
      window.open('https://www.linkedin.com/feed/?shareActive&mini=true', '_blank');
      updateQueueItem(item.id, { status: 'published', publishedAt: new Date().toISOString() });
      toast.success('Body copied to clipboard + LinkedIn opened — paste it in the share box');
      return;
    }
    if (item.kind === 'github-push') {
      toast.info('Open the project, then hit "Push to GitHub" — that handles the live push.');
      return;
    }
    // Default: just mark published
    updateQueueItem(item.id, { status: 'published', publishedAt: new Date().toISOString() });
    toast.success('Marked as published');
  };

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Content Queue"
        title="Prepare everything now. Ship when ready."
        subtitle="Every LinkedIn post, GitHub push, email, and proposal lives here until you're ready to publish. Stage during the build phase, launch in one coordinated push."
        icon={Rocket}
      />

      {/* KPI strip */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Kpi label="Total"     value={stats.total} />
        <Kpi label="Draft"     value={stats.draft} />
        <Kpi label="Ready"     value={stats.ready}      tone="orange" />
        <Kpi label="Scheduled" value={stats.scheduled}  tone="cyan" />
        <Kpi label="This week" value={stats.thisWeek}   tone="warning" />
      </section>

      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        {/* LEFT — generators + filters + list */}
        <div className="space-y-3">
          <QuickGenerator
            profile={profile} portfolio={portfolio}
            onStaged={(id) => { setActiveId(id); toast.success('Staged in queue'); }}
            stageInQueue={stageInQueue}
          />

          <div className="surface rounded-2xl p-3 space-y-2">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1">
              <Filter size={10} /> Filters
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterPill active={kindFilter === 'all'} onClick={() => setKindFilter('all')}>All kinds</FilterPill>
              {Object.entries(KIND_META).map(([k, m]) => (
                <FilterPill key={k} active={kindFilter === k} onClick={() => setKindFilter(k)}>
                  {m.label}
                </FilterPill>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterPill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All status</FilterPill>
              {Object.entries(STATUS_META).map(([k, m]) => (
                <FilterPill key={k} active={statusFilter === k} onClick={() => setStatusFilter(k)}>
                  {m.label}
                </FilterPill>
              ))}
            </div>
          </div>

          <div className="surface rounded-2xl p-3">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
              Queue ({filtered.length})
            </h3>
            {filtered.length === 0 ? (
              <p className="text-[11px] text-muted">No items match. Stage something from the quick generator above.</p>
            ) : (
              <ul className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
                {filtered.map((q) => {
                  const Kind = KIND_META[q.kind] || KIND_META.note;
                  const Status = STATUS_META[q.status] || STATUS_META.draft;
                  return (
                    <li key={q.id} className="group">
                      <button
                        onClick={() => setActiveId(q.id)}
                        className={cn(
                          'w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition',
                          q.id === active?.id && 'bg-aws-orange/10 text-aws-orange font-bold',
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Kind.icon size={10} className={Kind.tone.split(' ').pop()} />
                          <span className="font-bold truncate flex-1">{q.title}</span>
                          <span className={cn('chip border text-[9px] font-bold', Status.tone)}>
                            {Status.label}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted">
                          {q.scheduledAt
                            ? <>📅 {new Date(q.scheduledAt).toLocaleDateString()}</>
                            : <>created {new Date(q.createdAt).toLocaleDateString()}</>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT — editor for the selected item */}
        <div>
          {!active ? <EmptyEditor /> : (
            <QueueItemEditor
              key={active.id}
              item={active}
              onSave={(patch) => updateQueueItem(active.id, patch)}
              onDelete={() => onDelete(active.id)}
              onPublishNow={() => onPublishNow(active)}
              toast={toast}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// QUICK GENERATOR — drop a LinkedIn post into the queue in 3 clicks
// =================================================================

function QuickGenerator({ profile, portfolio, onStaged, stageInQueue }) {
  const completed = useMemo(() => {
    const ps = portfolio?.projects || {};
    return PROJECTS
      .filter((p) => ps[p.id]?.status === 'complete')
      .map((p) => ({ ...p, _state: ps[p.id] }));
  }, [portfolio]);

  const [pickedProject, setPickedProject] = useState('');

  const stageProjectPosts = () => {
    const proj = completed.find((p) => p.id === pickedProject) || completed[0];
    if (!proj) return;
    const variants = postsFromProject(proj, proj._state, profile);
    let firstId;
    for (const v of variants) {
      const id = stageInQueue({
        kind: 'linkedin-post',
        title: `${proj.title} — ${v.label.split(' (')[0]}`,
        body: v.body,
        meta: { variant: v.variant, projectId: proj.id },
        sourceId: proj.id,
        status: 'draft',
      });
      if (!firstId) firstId = id;
    }
    onStaged(firstId);
  };

  const stageTopicIdea = (idea) => {
    const id = stageInQueue({
      kind: 'linkedin-post',
      title: idea,
      body: `${idea}\n\n[Draft your take here — 3–5 paragraphs. Hook, story, lesson, call-to-action.]\n\n#AWS #BuildInPublic`,
      status: 'draft',
    });
    onStaged(id);
  };

  return (
    <div className="surface rounded-2xl p-3 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <Wand2 size={12} className="text-aws-orange" /> Quick generators
      </h3>
      <p className="text-[10px] text-muted">Generate now, edit later, publish when ready.</p>

      {/* From a completed project */}
      <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2 space-y-1">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-electric">
          LinkedIn post · from a completed project
        </div>
        {completed.length === 0 ? (
          <div className="text-[11px] text-muted">No completed projects yet. <Link to="/portfolio" className="text-aws-orange font-bold hover:underline">Start one →</Link></div>
        ) : (
          <>
            <select
              value={pickedProject}
              onChange={(e) => setPickedProject(e.target.value)}
              className="w-full bg-[var(--card)] border border-token rounded-md px-2 py-1 text-[11px] focus-ring"
            >
              <option value="">— pick a project ({completed.length}) —</option>
              {completed.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
            <button
              onClick={stageProjectPosts}
              disabled={!pickedProject && completed.length === 0}
              className="btn btn-primary w-full !text-[11px]"
            >
              <Plus size={11} /> Generate 3 variants + stage all
            </button>
          </>
        )}
      </div>

      {/* From a topic idea */}
      <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2 space-y-1">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-electric">
          LinkedIn post · from a topic idea
        </div>
        <div className="max-h-[160px] overflow-y-auto space-y-0.5">
          {TOPIC_IDEAS.map((idea) => (
            <button
              key={idea}
              onClick={() => stageTopicIdea(idea)}
              className="w-full text-left rounded px-1.5 py-1 text-[11px] hover:bg-[var(--card)] transition focus-ring"
            >
              + {idea}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// EDITOR — edit body, schedule, publish
// =================================================================

function QueueItemEditor({ item, onSave, onDelete, onPublishNow, toast }) {
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [status, setStatus] = useState(item.status);
  const [scheduledAt, setScheduledAt] = useState(
    item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : ''
  );

  useEffect(() => {
    setTitle(item.title); setBody(item.body); setStatus(item.status);
    setScheduledAt(item.scheduledAt ? new Date(item.scheduledAt).toISOString().slice(0, 16) : '');
  }, [item.id]);

  const save = () => {
    onSave({
      title, body, status,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    });
    toast.success('Saved');
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(body); toast.success('Body copied to clipboard'); }
    catch { toast.error('Copy failed'); }
  };

  const Kind = KIND_META[item.kind] || KIND_META.note;

  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn('w-9 h-9 rounded-lg grid place-items-center', Kind.tone)}>
            <Kind.icon size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent text-base font-extrabold w-full focus-ring focus:outline-none"
            />
            <div className="text-[10px] text-muted">
              {Kind.label} · created {new Date(item.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={copy}         className="btn btn-ghost !text-xs"><ClipboardCopy size={11} /> Copy</button>
          <button onClick={save}         className="btn btn-primary !text-xs"><Check size={11} /> Save</button>
          <button onClick={onPublishNow} className="btn btn-ghost !text-xs text-success"><Rocket size={11} /> Publish</button>
          <button onClick={onDelete}     className="btn btn-ghost !text-xs text-danger"><Trash2 size={11} /></button>
        </div>
      </header>

      {/* Status + schedule row */}
      <div className="grid sm:grid-cols-2 gap-2 items-end">
        <label className="block">
          <span className="text-[10px] font-bold text-muted">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
          >
            {Object.entries(STATUS_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold text-muted">Schedule for (optional)</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
          />
        </label>
      </div>

      {/* Body */}
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">Body</div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="w-full bg-[var(--card-2)] border border-token rounded-md px-3 py-2 text-xs font-mono leading-relaxed focus-ring focus:border-aws-orange resize-y"
        />
        <div className="text-[10px] text-muted mt-1">{body.length} characters · {body.split('\n').length} lines</div>
      </div>

      {/* Publish-now help */}
      <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5 text-[11px] leading-relaxed text-muted">
        <strong className="text-current">Publishing:</strong> when you click <strong>Publish</strong>,
        the body is copied to clipboard + the target opens (LinkedIn / GitHub / Gmail).
        You paste + post — the app marks it Published with today's date.
        For real one-click GitHub push, open the project page and use the "Push to GitHub" button.
      </div>
    </div>
  );
}

function EmptyEditor() {
  return (
    <div className="surface rounded-2xl p-10 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
        <Inbox size={22} strokeWidth={2.5} />
      </div>
      <h3 className="text-base font-extrabold">Pick an item on the left, or stage a new one.</h3>
      <p className="text-[12px] text-muted max-w-md mx-auto">
        Generate LinkedIn posts from your completed projects, pick from 12 topic ideas, or stage GitHub pushes / emails / proposals from elsewhere in the app. Everything sits here until you say go.
      </p>
    </div>
  );
}

// =================================================================
// bits
// =================================================================

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-1.5 py-0.5 text-[9px] font-bold border whitespace-nowrap',
        active ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40' : 'border-token text-muted hover:text-current',
      )}
    >{children}</button>
  );
}

function Kpi({ label, value, tone }) {
  const c =
    tone === 'orange' ? 'border-aws-orange/30 text-aws-orange'
    : tone === 'cyan' ? 'border-electric/30 text-electric'
    : tone === 'warning' ? 'border-warning/30 text-warning'
    : 'border-token';
  return (
    <div className={cn('surface rounded-xl p-2.5 border', c)}>
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className="text-xl font-black tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
