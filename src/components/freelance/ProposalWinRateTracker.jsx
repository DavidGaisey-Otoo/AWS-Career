/**
 * ProposalWinRateTracker.jsx — FR-05 "My Proposals" tab.
 *
 * Reads from the auto-log store (proposalLog.js) so users get an honest
 * win-rate signal without having to manually save proposals.
 *
 * Sections:
 *   1. Stats strip — Total / Replied / Won / Win rate
 *   2. Insight banner — vs industry average, with specific tip
 *   3. Weekly bar chart — last 8 weeks, sent vs won, inline SVG
 *   4. Filter chips + sortable list of proposals
 *   5. Click a row → modal with full text + status update + duplicate
 */

import { useMemo, useState } from 'react';
import {
  BarChart3, Trophy, MessageCircle, Send, TrendingUp, Filter,
  AlertCircle, CheckCircle2, X, Copy, Trash2, Calendar, Tag,
  Eye, ChevronRight, Lightbulb,
} from 'lucide-react';
import {
  useProposalLog, getStats, getWeeklySeries, getInsightTip,
  updateProposalStatus, duplicateProposal, deleteProposal, STATUS, STATUS_LIST,
} from '../../lib/proposalLog.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

export function ProposalWinRateTracker() {
  const list = useProposalLog();
  const toast = useToast();
  const stats = useMemo(() => getStats(list), [list]);
  const series = useMemo(() => getWeeklySeries(list, 8), [list]);
  const insight = useMemo(() => getInsightTip(stats), [stats]);

  const [filter, setFilter] = useState('all'); // all | sent | replied | won | lost
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return list;
    return list.filter((e) => e.status === filter);
  }, [list, filter]);

  const open = useMemo(() => list.find((e) => e.id === openId) || null, [list, openId]);

  return (
    <div className="space-y-4">
      {/* ─────── Header ─────── */}
      <div className="surface rounded-2xl p-5 gradient-border">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
          FR-05 · Proposal Win Rate Tracker
        </div>
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Trophy size={18} className="text-aws-orange" />
          My Proposals
        </h2>
        <p className="text-[12.5px] opacity-80 mt-1.5">
          Generated proposals land here as drafts. Review each one and mark it Sent only after you personally
          submit it on the marketplace; drafts never inflate your win rate.
        </p>
      </div>

      {/* ─────── Stats strip ─────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Send}          label="Sent"      value={stats.total}    tone="slate"   />
        <StatCard icon={MessageCircle} label="Replied"   value={stats.replied}  tone="amber"
                  subtitle={stats.total > 0 ? `${stats.replyRate}% reply rate` : null} />
        <StatCard icon={Trophy}        label="Won"       value={stats.won}      tone="success" />
        <StatCard icon={TrendingUp}    label="Win rate"  value={`${stats.winRate}%`} tone="orange"
                  subtitle={stats.closed > 0 ? `of ${stats.closed} closed outcomes` : 'no closed outcomes yet'} />
      </div>

      {/* ─────── Insight tip ─────── */}
      <InsightBanner insight={insight} />

      {/* ─────── Chart ─────── */}
      {stats.total > 0 && <WeeklyChart series={series} />}

      {/* ─────── Filter + list ─────── */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-[13px] font-extrabold flex items-center gap-1.5">
            <Filter size={13} className="text-aws-orange" /> All proposals ({filtered.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            <FilterChip label="All"       active={filter === 'all'}     onClick={() => setFilter('all')} count={list.length} />
            <FilterChip label="Drafts"    active={filter === 'draft'}   onClick={() => setFilter('draft')} count={stats.drafts} />
            <FilterChip label="Sent"      active={filter === 'sent'}    onClick={() => setFilter('sent')} count={list.filter((e) => e.status === 'sent').length} />
            <FilterChip label="Replied"   active={filter === 'replied'} onClick={() => setFilter('replied')} count={list.filter((e) => e.status === 'replied').length} />
            <FilterChip label="Won"       active={filter === 'won'}     onClick={() => setFilter('won')} count={stats.won} />
            <FilterChip label="Lost"      active={filter === 'lost'}    onClick={() => setFilter('lost')} count={stats.lost} />
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10 opacity-60 text-[13px]">
            {list.length === 0
              ? <>No proposals logged yet. Go to <strong>Smart Generator</strong> and generate one — it&apos;ll appear here.</>
              : <>No proposals match this filter.</>
            }
          </div>
        )}

        <div className="divide-y divide-token">
          {filtered.map((e) => (
            <ProposalRow key={e.id} entry={e} onOpen={() => setOpenId(e.id)} />
          ))}
        </div>
      </div>

      {/* ─────── Modal ─────── */}
      {open && (
        <ProposalModal
          entry={open}
          onClose={() => setOpenId(null)}
          onStatusChange={(s) => {
            updateProposalStatus(open.id, s);
            toast?.success?.(`Marked as ${STATUS[s].label}`);
          }}
          onDuplicate={() => {
            const copy = duplicateProposal(open.id);
            toast?.success?.('Duplicated — edit the copy from the list');
            setOpenId(copy.id);
          }}
          onDelete={() => {
            if (!confirm('Delete this proposal from the log? (Cannot be undone)')) return;
            deleteProposal(open.id);
            toast?.success?.('Deleted');
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Stat card
// ════════════════════════════════════════════════════════════════════
function StatCard({ icon: Icon, label, value, tone, subtitle }) {
  const toneClasses = {
    slate:   'text-slate-400',
    amber:   'text-amber-400',
    success: 'text-success',
    orange:  'text-aws-orange',
  };
  return (
    <div className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-70">{label}</span>
        <Icon size={14} className={cn(toneClasses[tone] || 'text-aws-orange')} />
      </div>
      <div className={cn('text-2xl font-extrabold', toneClasses[tone] || 'text-aws-orange')}>{value}</div>
      {subtitle && <div className="text-[10.5px] opacity-60 mt-0.5">{subtitle}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Insight banner
// ════════════════════════════════════════════════════════════════════
function InsightBanner({ insight }) {
  const toneClass = {
    success: 'border-success/40 bg-success/5',
    warning: 'border-warning/40 bg-warning/5',
    danger:  'border-danger/40 bg-danger/5',
    neutral: 'border-token bg-[var(--card-2)]',
  }[insight.tone];
  const iconClass = {
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
    neutral: 'text-aws-orange',
  }[insight.tone];

  return (
    <div className={cn('surface rounded-2xl border p-4 flex items-start gap-3', toneClass)}>
      <Lightbulb size={16} className={cn('mt-0.5 flex-shrink-0', iconClass)} />
      <div className="flex-1 text-[12.5px]">
        <div className={cn('font-extrabold mb-0.5', iconClass)}>{insight.title}</div>
        <div className="opacity-90 leading-relaxed">{insight.body}</div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Weekly chart — inline SVG bar chart, no external dep
// ════════════════════════════════════════════════════════════════════
function WeeklyChart({ series }) {
  const max = Math.max(1, ...series.map((b) => b.sent));
  const W = 600;
  const H = 140;
  const barW = (W - 40) / series.length - 8;
  const x0 = 30;

  return (
    <div className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-extrabold flex items-center gap-1.5">
          <BarChart3 size={13} className="text-aws-orange" /> Last 8 weeks
        </h3>
        <div className="flex items-center gap-3 text-[10.5px]">
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-aws-orange/60 inline-block" /> Sent
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-success inline-block" /> Won
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* y-axis baseline */}
        <line x1={x0} y1={H - 28} x2={W - 10} y2={H - 28} stroke="currentColor" opacity="0.15" />

        {series.map((b, i) => {
          const x = x0 + i * (barW + 8);
          const sentH = (b.sent / max) * (H - 50);
          const wonH  = (b.won  / max) * (H - 50);
          return (
            <g key={i}>
              {/* Sent bar (background, lower opacity) */}
              <rect
                x={x}
                y={H - 28 - sentH}
                width={barW}
                height={sentH}
                fill="currentColor"
                className="text-aws-orange opacity-60"
                rx="2"
              />
              {/* Won bar (overlay, full opacity, narrower) */}
              <rect
                x={x + barW * 0.25}
                y={H - 28 - wonH}
                width={barW * 0.5}
                height={wonH}
                fill="currentColor"
                className="text-success"
                rx="2"
              />
              {/* Count label above bar */}
              {b.sent > 0 && (
                <text
                  x={x + barW / 2}
                  y={H - 28 - sentH - 4}
                  fontSize="9"
                  textAnchor="middle"
                  fill="currentColor"
                  opacity="0.7"
                >
                  {b.sent}
                </text>
              )}
              {/* Week label */}
              <text
                x={x + barW / 2}
                y={H - 10}
                fontSize="9"
                textAnchor="middle"
                fill="currentColor"
                opacity="0.55"
              >
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Filter chip
// ════════════════════════════════════════════════════════════════════
function FilterChip({ label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold transition',
        active
          ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
          : 'border-token opacity-70 hover:opacity-100 hover:border-aws-orange/40'
      )}
    >
      {label} <span className="opacity-60">·</span> <span>{count}</span>
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// Proposal row
// ════════════════════════════════════════════════════════════════════
function ProposalRow({ entry, onOpen }) {
  const st = STATUS[entry.status] || STATUS.draft;
  const toneBadge = {
    slate:   'bg-slate-500/15 text-slate-300',
    amber:   'bg-amber-500/15 text-amber-300',
    success: 'bg-success/15 text-success',
    danger:  'bg-danger/15 text-danger',
  }[st.tone];

  return (
    <button
      onClick={onOpen}
      className="w-full py-2.5 px-1 text-left hover:bg-[var(--card-2)] transition rounded-lg flex items-center gap-3 group"
    >
      <span className={cn('px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase tracking-wide flex-shrink-0', toneBadge)}>
        {st.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold truncate">{entry.gigTitle || 'Untitled'}</div>
        <div className="flex items-center gap-2 text-[10.5px] opacity-65 mt-0.5">
          <span className="inline-flex items-center gap-0.5">
            <Calendar size={9} /> {new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
          {entry.platform && entry.platform !== 'manual' && (
            <span className="inline-flex items-center gap-0.5">
              <Tag size={9} /> {entry.platform}
            </span>
          )}
          {entry.services?.length > 0 && (
            <span className="opacity-75">· {entry.services.slice(0, 3).join(' · ')}{entry.services.length > 3 && ` +${entry.services.length - 3}`}</span>
          )}
        </div>
      </div>
      <ChevronRight size={14} className="opacity-30 group-hover:opacity-70 transition flex-shrink-0" />
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════
// Detail modal
// ════════════════════════════════════════════════════════════════════
function ProposalModal({ entry, onClose, onStatusChange, onDuplicate, onDelete }) {
  const toast = useToast();
  function copyText() {
    navigator.clipboard.writeText(entry.text.replace(/\*\*([^*]+)\*\*/g, '$1'))
      .then(() => toast?.success?.('Copied to clipboard'))
      .catch(() => toast?.error?.('Clipboard blocked'));
  }
  return (
    <div
      className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-token shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              Proposal detail
            </div>
            <h3 className="text-lg font-extrabold">{entry.gigTitle || 'Untitled'}</h3>
            <div className="text-[11px] opacity-65 mt-0.5">
              {entry.status === 'draft' ? 'Generated' : 'Submitted'} {new Date(entry.submittedAt || entry.createdAt).toLocaleString('en-GB')}
              {entry.updatedAt && entry.updatedAt !== entry.createdAt && (
                <> · last regenerated {new Date(entry.updatedAt).toLocaleString('en-GB')}</>
              )}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--card-2)] transition">
            <X size={16} />
          </button>
        </div>

        {/* Status picker */}
        <div className="rounded-xl bg-[var(--card-2)] border border-token p-3 mb-3">
          <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-70 mb-2">Status</div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_LIST.map((s) => {
              const active = entry.status === s.id;
              const toneClass = {
                slate:   active ? 'border-slate-400 bg-slate-500/15 text-slate-200'   : 'border-token',
                amber:   active ? 'border-amber-400 bg-amber-500/15 text-amber-300'   : 'border-token',
                success: active ? 'border-success bg-success/15 text-success'         : 'border-token',
                danger:  active ? 'border-danger bg-danger/15 text-danger'            : 'border-token',
              }[s.tone];
              return (
                <button
                  key={s.id}
                  onClick={() => onStatusChange(s.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border transition',
                    toneClass,
                    !active && 'opacity-70 hover:opacity-100'
                  )}
                  title={s.tip}
                >
                  {active && <CheckCircle2 size={11} />}
                  {s.label}
                </button>
              );
            })}
          </div>
          {entry.status === 'draft' && (
            <p className="text-[10.5px] text-warning mt-2">
              Human approval required: selecting Sent records that you reviewed and submitted this proposal yourself. The app does not submit to marketplaces.
            </p>
          )}
        </div>

        {/* Body */}
        <div className="rounded-xl bg-[var(--card-2)] border border-token p-4 max-h-[40vh] overflow-y-auto">
          <pre className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-sans">
            {entry.text || '(empty proposal text)'}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-token">
          <button onClick={copyText} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
            <Copy size={12} /> Copy text
          </button>
          <button onClick={onDuplicate} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
            <Eye size={12} /> Duplicate for new gig
          </button>
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-danger/30 text-danger hover:bg-danger/10 transition ml-auto">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
