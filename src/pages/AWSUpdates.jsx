import { motion } from 'framer-motion';
import {
  AlertTriangle, Award, BookmarkPlus, ChevronLeft, ChevronRight, Clipboard,
  ExternalLink, Filter, GraduationCap, Megaphone, Newspaper, Save, Search,
  Sparkles, Star, Trash2, Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useAI } from '../context/AIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getCert } from '../data/certs.js';
import { AWS_UPDATES, UPDATE_TAGS, examGuideChange, retiredServices } from '../data/awsUpdates.js';
import { cn } from '../lib/utils.js';

export default function AWSUpdates() {
  const toast = useToast();
  const { saveAINote, state: aiState } = useAI();
  const [tag, setTag] = useState('all');
  const [search, setSearch] = useState('');
  const [savedIds, setSavedIds] = useState(() => {
    // Recover from prior saves — `source` carries `aws-update:<id>`.
    return new Set(
      (aiState?.savedNotes || [])
        .filter((n) => typeof n.source === 'string' && n.source.startsWith('aws-update:'))
        .map((n) => n.source.slice('aws-update:'.length))
    );
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return AWS_UPDATES
      .filter((u) => tag === 'all' || u.tag === tag)
      .filter((u) => !q || (u.title + ' ' + u.summary + ' ' + u.service).toLowerCase().includes(q))
      .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  }, [tag, search]);

  const retired = retiredServices();

  const saveToNotes = (u) => {
    saveAINote(`aws-update:${u.id}`, `# ${u.title}\n\n${u.summary}\n\nService: ${u.service}\nDate: ${new Date(u.dateISO).toDateString()}\nSource: ${u.url}`);
    setSavedIds((s) => new Set([...s, u.id]));
    toast.success('Saved to AI notes');
  };

  return (
    <div className="space-y-4">
      <Link to="/learn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Learn
      </Link>

      <PageHeader
        eyebrow="What's New in AWS"
        title="Stay ahead of the curve."
        subtitle="Curated AWS announcements with cert impact + freelance-opportunity tagging. Save anything to your AI notes."
        icon={Newspaper}
      />

      {/* Retired-service banner (alerts) */}
      {retired.length > 0 && (
        <section className="surface rounded-2xl p-4 border-danger/40 bg-danger/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="text-sm font-extrabold text-danger">
                Retired-service alert{retired.length > 1 ? 's' : ''} — {retired.length} item{retired.length > 1 ? 's' : ''}
              </div>
              <ul className="text-[12px] space-y-1">
                {retired.map((r) => (
                  <li key={r.id} className="flex items-start gap-1.5">
                    <span className="text-danger">•</span>
                    <span>
                      <span className="font-bold">{r.service}:</span> {r.title}
                      {r.affects?.topics?.length > 0 && (
                        <Link to={`/learning/${r.affects.topics[0].categoryId}/${r.affects.topics[0].topicId}`}
                              className="ml-2 text-aws-orange font-bold hover:underline">
                          Review affected topics →
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Exam guide change tracker (warns) */}
      <ExamGuideTracker />

      {/* Filters */}
      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--card-2)] rounded-md px-2 py-1.5 flex-1 min-w-[200px]">
          <Search size={12} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search updates, services…"
            aria-label="Search AWS updates"
            className="bg-transparent text-xs flex-1 focus:outline-none"
          />
        </div>
        <FilterPill active={tag === 'all'} onClick={() => setTag('all')} label="All" />
        {Object.entries(UPDATE_TAGS).map(([k, t]) => (
          <FilterPill key={k} active={tag === k} onClick={() => setTag(k)} label={`${t.emoji} ${t.label}`} />
        ))}
      </div>

      {/* News cards */}
      {filtered.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
            <Newspaper size={22} strokeWidth={2.5} />
          </div>
          <h3 className="text-base font-extrabold">No updates match this filter.</h3>
          <p className="text-[12px] text-muted max-w-md mx-auto">Try a different tag or clear the search to see everything.</p>
          <button onClick={() => { setTag('all'); setSearch(''); }} className="btn btn-ghost !text-xs">
            Clear filters
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((u) => (
            <UpdateCard
              key={u.id}
              update={u}
              saved={savedIds.has(u.id)}
              onSave={() => saveToNotes(u)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// =================================================================
// Update card
// =================================================================

function UpdateCard({ update, saved, onSave }) {
  const tag = UPDATE_TAGS[update.tag];
  const affectedCerts = (update.affects?.certs || []).map(getCert).filter(Boolean);
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        'surface rounded-2xl p-4 space-y-2',
        update.level === 'alert' && 'border-danger/40',
        update.level === 'warn'  && 'border-warning/40',
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('chip border font-bold text-[10px]', tag.tone)}>
              {tag.emoji} {tag.label}
            </span>
            <span className="chip border border-token text-[10px] font-bold">{update.service}</span>
            <span className="text-[10px] text-muted">{new Date(update.dateISO).toDateString()}</span>
          </div>
          <h3 className="text-sm font-extrabold tracking-tight">{update.title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <a href={update.url} target="_blank" rel="noreferrer"
             className="btn btn-ghost !text-[11px]"
             aria-label="Open AWS source page">
            <ExternalLink size={11} /> Read on AWS
          </a>
          <button
            onClick={onSave}
            disabled={saved}
            className={cn('btn !text-[11px]', saved ? 'btn-ghost opacity-60' : 'btn-primary')}
            aria-label={saved ? 'Already saved' : 'Save to AI notes'}
          >
            {saved ? <><Star size={11} fill="currentColor" /> Saved</> : <><BookmarkPlus size={11} /> Save</>}
          </button>
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-muted">{update.summary}</p>

      {/* Impact assessment */}
      <div className="grid sm:grid-cols-2 gap-2 mt-2">
        <ImpactRow
          label="Affects SAA-C03?"
          value={affectedCerts.some((c) => c.id === 'saa-c03') ? 'Yes' : 'No'}
          ok={affectedCerts.some((c) => c.id === 'saa-c03')}
        />
        <ImpactRow
          label="Other certs affected"
          value={affectedCerts.filter((c) => c.id !== 'saa-c03').map((c) => c.code).join(', ') || 'None'}
          chips={affectedCerts.filter((c) => c.id !== 'saa-c03')}
        />
        <ImpactRow
          label="Client opportunity?"
          value={update.opportunity || 'No'}
          ok={update.opportunity === 'High' || update.opportunity === 'Medium'}
        />
      </div>

      {/* Exam-guide change inline detail */}
      {update.affects?.examGuideChange && (
        <ExamGuideInline change={update.affects.examGuideChange} />
      )}
    </motion.li>
  );
}

function ImpactRow({ label, value, ok, chips }) {
  return (
    <div className="rounded-lg border border-token bg-[var(--card-2)]/30 px-2.5 py-1.5">
      <div className="text-[9px] uppercase font-extrabold tracking-widest text-muted">{label}</div>
      {chips && chips.length > 0 ? (
        <div className="flex flex-wrap gap-1 mt-1">
          {chips.map((c) => (
            <Link
              key={c.id}
              to={`/exam/${c.id}`}
              className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange font-bold text-[10px] hover:bg-aws-orange/20"
            >{c.code}</Link>
          ))}
        </div>
      ) : (
        <div className={cn('text-[12px] font-extrabold', ok ? 'text-success' : 'text-muted')}>{value}</div>
      )}
    </div>
  );
}

function ExamGuideInline({ change }) {
  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <GraduationCap size={14} className="text-warning" />
        <span className="text-[12px] font-extrabold text-warning">
          Exam guide change — {change.certId.toUpperCase()} v{change.oldVersion} → v{change.newVersion}
        </span>
      </div>
      <div className="text-[11px] text-muted">Effective {new Date(change.effectiveDate).toDateString()}</div>
      {change.added?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-extrabold text-success mb-0.5">Added</div>
          <ul className="space-y-0.5 text-[11px]">
            {change.added.map((a, i) => <li key={i}>＋ {a}</li>)}
          </ul>
        </div>
      )}
      {change.removed?.length > 0 && (
        <div>
          <div className="text-[10px] uppercase font-extrabold text-danger mb-0.5">Removed</div>
          <ul className="space-y-0.5 text-[11px]">
            {change.removed.map((r, i) => <li key={i}>− {r}</li>)}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <Link to={`/exam/${change.certId}`} className="btn btn-primary !text-[11px]">
          <Wand2 size={11} /> Update my study plan
        </Link>
        <a href={change.url || 'https://aws.amazon.com/certification/'} target="_blank" rel="noreferrer"
           className="btn btn-ghost !text-[11px]">
          <ExternalLink size={11} /> View changes
        </a>
      </div>
    </div>
  );
}

// =================================================================
// Exam guide tracker (top-of-page banner if any cert has a pending change)
// =================================================================

function ExamGuideTracker() {
  const allCertIds = ['clf-c02','saa-c03','dva-c02','soa-c02','dea-c01','mla-c01','sap-c02','dop-c02','scs-c02','ans-c01','dbs-c01','mls-c01','aif-c01'];
  const changes = allCertIds.map((id) => examGuideChange(id)).filter(Boolean);
  if (changes.length === 0) return null;
  return (
    <section className="surface rounded-2xl p-4 border-warning/40 bg-warning/5">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1.5">
          <div className="text-sm font-extrabold text-warning">
            Exam guide updates — {changes.length}
          </div>
          {changes.map((c) => (
            <div key={c.certId} className="text-[12px]">
              <span className="font-bold">{c.certId.toUpperCase()}:</span>{' '}
              v{c.oldVersion} → v{c.newVersion}, effective {new Date(c.effectiveDate).toDateString()}.
              {c.added?.length ? (
                <span className="text-muted"> Added: {c.added.slice(0, 2).join(', ')}{c.added.length > 2 ? '…' : ''}</span>
              ) : null}
              <Link to={`/exam/${c.certId}`} className="ml-2 text-aws-orange font-bold hover:underline">
                Update my study plan →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FilterPill({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-[10px] font-bold border whitespace-nowrap',
        active
          ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40'
          : 'border-token text-muted hover:text-current',
      )}
    >{label}</button>
  );
}
