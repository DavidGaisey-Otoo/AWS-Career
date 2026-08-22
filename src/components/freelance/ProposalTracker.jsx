import { motion } from 'framer-motion';
import {
  AlertCircle, CalendarClock, Check, ChevronDown, Download, Filter,
  Pencil, Plus, Trash2, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatDate } from '../../lib/utils.js';

const STATUS_META = {
  draft:       { label: 'Draft',        color: 'bg-[var(--card-2)] text-muted border border-token' },
  sent:        { label: 'Sent',         color: 'bg-[var(--card-2)] text-muted border border-token' },
  viewed:      { label: 'Viewed',       color: 'bg-electric/15 text-electric border border-electric/30' },
  responded:   { label: 'Responded',    color: 'bg-warning/15 text-warning border border-warning/30' },
  hired:       { label: 'Hired ✓',      color: 'bg-success/15 text-success border border-success/30' },
  rejected:    { label: 'Rejected',     color: 'bg-danger/15 text-danger border border-danger/30' },
  'no-response': { label: 'No response', color: 'bg-[var(--card-2)] text-muted border border-token' },
};
const STATUS_KEYS = ['draft', 'sent', 'viewed', 'responded', 'hired', 'rejected', 'no-response'];

const PLATFORMS = ['Upwork', 'LinkedIn', 'Direct', 'Referral', 'Other'];

export function ProposalTracker() {
  const { state, addProposal, updateProposal, deleteProposal, proposalStats } = useFreelance();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [editing, setEditing] = useState(null);
  const [drawer, setDrawer] = useState(false);

  const filtered = useMemo(() => {
    let list = state.proposals.slice();
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (platformFilter !== 'all') list = list.filter((p) => p.platform === platformFilter);
    if (sortBy === 'budget') {
      list.sort((a, b) => extractMaxAmount(b.budget) - extractMaxAmount(a.budget));
    } else {
      list.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    }
    return list;
  }, [state.proposals, statusFilter, platformFilter, sortBy]);

  const onSave = () => {
    if (!editing) return;
    if (editing.status === 'sent' && !editing.submittedAt) {
      if (!confirm('Confirm you personally reviewed and submitted this proposal on the marketplace. The app did not submit it for you.')) return;
      editing.submittedAt = new Date().toISOString();
      editing.approvedByHumanAt = editing.submittedAt;
    }
    if (editing.id) {
      const { id, ...rest } = editing;
      updateProposal(id, rest);
      toast.success('Proposal updated');
    } else {
      addProposal(editing);
      toast.success('Proposal added');
    }
    setDrawer(false);
    setEditing(null);
  };

  const changeStatus = (proposal, status) => {
    if (status === 'sent' && proposal.status === 'draft') {
      if (!confirm('Confirm you personally reviewed and submitted this proposal.')) return;
      const now = new Date().toISOString();
      updateProposal(proposal.id, { status, submittedAt: now, approvedByHumanAt: now });
      return;
    }
    updateProposal(proposal.id, { status });
  };

  const onDelete = () => {
    if (!editing?.id) { setDrawer(false); return; }
    if (!confirm('Delete this proposal?')) return;
    deleteProposal(editing.id);
    toast.info('Proposal deleted');
    setDrawer(false);
    setEditing(null);
  };

  const exportCSV = () => {
    const rows = [
      ['Date sent', 'Platform', 'Client', 'Job title', 'Budget', 'Status', 'Follow-up', 'Notes'],
      ...filtered.map((p) => [
        formatDate(p.sentAt),
        p.platform || '',
        p.clientName || '',
        p.jobTitle || '',
        p.budget || '',
        p.status || '',
        p.followUpAt || '',
        (p.notes || '').replace(/\n/g, ' '),
      ]),
    ];
    const csv = rows.map((r) => r.map(csvField).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `proposals-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Exported CSV');
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total sent" value={proposalStats.total} />
        <Stat label="Hired" value={proposalStats.hired} tone="text-success" />
        <Stat label="Win rate" value={`${proposalStats.winRate}%`} tone={proposalStats.winRate >= 10 ? 'text-success' : 'text-current'} />
        <Stat label="Response rate" value={`${proposalStats.responseRate}%`} />
      </div>

      {proposalStats.overdueFollowUps > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.04] p-3 flex items-center gap-3 text-sm">
          <AlertCircle size={16} className="text-warning" />
          <div>
            <span className="font-extrabold text-warning">{proposalStats.overdueFollowUps} follow-up{proposalStats.overdueFollowUps === 1 ? '' : 's'} overdue.</span>
            <span className="text-muted ml-2">Sort by follow-up to triage.</span>
          </div>
        </div>
      )}
      {proposalStats.bestPlatform && proposalStats.bestPlatform.sent >= 3 && (
        <div className="rounded-xl border border-success/30 bg-success/[0.04] p-3 text-xs flex items-center gap-3">
          <Check size={14} className="text-success" />
          <span>
            Your best-performing platform: <strong>{proposalStats.bestPlatform.platform}</strong> —{' '}
            {Math.round(proposalStats.bestPlatform.winRate * 100)}% win rate over {proposalStats.bestPlatform.sent} proposals.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-aws-orange" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
          <option value="all">Any status</option>
          {STATUS_KEYS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
          <option value="all">Any platform</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
          <option value="date">Sort: most recent</option>
          <option value="budget">Sort: highest budget</option>
        </select>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={exportCSV} className="btn btn-ghost !text-xs !py-1.5"><Download size={12} /> CSV</button>
          <button onClick={() => { setEditing({ status: 'draft', platform: 'Upwork', createdAt: new Date().toISOString(), sentAt: new Date().toISOString() }); setDrawer(true); }}
                  className="btn btn-primary !text-xs !py-1.5"><Plus size={12} /> New</button>
        </div>
      </div>

      {/* Table */}
      <div className="surface rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest font-extrabold text-muted">
              <tr className="border-b border-token">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Platform</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Job</th>
                <th className="p-3 text-left">Budget</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Follow-up</th>
                <th className="p-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted">
                    No proposals yet — generate one from the Builder or click <strong>New</strong>.
                  </td>
                </tr>
              ) : filtered.map((p) => {
                const overdue = p.followUpAt && p.followUpAt < today &&
                  !['hired', 'rejected', 'no-response'].includes(p.status);
                return (
                  <tr key={p.id} className="border-b border-token last:border-0 hover:bg-[var(--card-2)]/30">
                    <td className="p-3 whitespace-nowrap text-xs text-muted">{formatDate(p.sentAt)}</td>
                    <td className="p-3 whitespace-nowrap text-xs font-bold">{p.platform || '—'}</td>
                    <td className="p-3 text-xs font-bold">{p.clientName || '—'}</td>
                    <td className="p-3 text-xs">{p.jobTitle || '—'}</td>
                    <td className="p-3 text-xs">{p.budget || '—'}</td>
                    <td className="p-3">
                      <select
                        value={p.status || 'draft'}
                        onChange={(e) => changeStatus(p, e.target.value)}
                        className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-bold focus:outline-none', STATUS_META[p.status || 'draft']?.color)}
                      >
                        {STATUS_KEYS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                      </select>
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {p.followUpAt ? (
                        <span className={cn('chip border text-[10px] font-bold', overdue
                          ? 'bg-danger/10 text-danger border-danger/30'
                          : 'bg-[var(--card-2)] text-muted border-token')}>
                          <CalendarClock size={10} /> {p.followUpAt}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => { setEditing({ ...p }); setDrawer(true); }}
                              className="text-muted hover:text-aws-orange p-1">
                        <Pencil size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setDrawer(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative surface rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-5 gradient-border"
          >
            <button onClick={() => setDrawer(false)}
                    className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold tracking-tight mb-4">
              {editing?.id ? 'Edit proposal' : 'New proposal'}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <FieldInput label="Date" type="date" value={(editing?.sentAt || '').slice(0, 10)}
                          onChange={(v) => setEditing((e) => ({ ...e, sentAt: new Date(v).toISOString() }))} />
              <FieldInput label="Platform" as="select" value={editing?.platform || 'Upwork'}
                          onChange={(v) => setEditing((e) => ({ ...e, platform: v }))}
                          options={PLATFORMS} />
              <FieldInput label="Client name" value={editing?.clientName || ''}
                          onChange={(v) => setEditing((e) => ({ ...e, clientName: v }))} />
              <FieldInput label="Job title" value={editing?.jobTitle || ''}
                          onChange={(v) => setEditing((e) => ({ ...e, jobTitle: v }))} />
              <FieldInput label="Budget" value={editing?.budget || ''}
                          onChange={(v) => setEditing((e) => ({ ...e, budget: v }))} />
              <FieldInput label="Status" as="select" value={editing?.status || 'sent'}
                          onChange={(v) => setEditing((e) => ({ ...e, status: v }))}
                          options={STATUS_KEYS} optionLabels={STATUS_KEYS.map((k) => STATUS_META[k].label)} />
              <FieldInput label="Follow-up date" type="date" value={editing?.followUpAt || ''}
                          onChange={(v) => setEditing((e) => ({ ...e, followUpAt: v }))} wide />
              <div className="col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Notes</label>
                <textarea
                  rows={4}
                  value={editing?.notes || ''}
                  onChange={(e) => setEditing((ed) => ({ ...ed, notes: e.target.value }))}
                  className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-xl p-2 text-sm focus-ring focus:border-aws-orange"
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              {editing?.id ? (
                <button onClick={onDelete} className="btn btn-ghost !text-xs text-danger">
                  <Trash2 size={12} /> Delete
                </button>
              ) : <span />}
              <button onClick={onSave} className="btn btn-primary"><Check size={14} /> Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'text-current' }) {
  return (
    <div className="surface rounded-2xl p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold tabular-nums tracking-tight', tone)}>{value}</div>
    </div>
  );
}

function FieldInput({ label, value, onChange, type = 'text', as, options = [], optionLabels, wide }) {
  return (
    <label className={cn('block', wide && 'col-span-2')}>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
          {options.map((o, i) => <option key={o} value={o}>{(optionLabels || options)[i]}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}

function csvField(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
  return s;
}

function extractMaxAmount(s) {
  const m = String(s || '').match(/(\d[\d,]*)/g);
  if (!m) return 0;
  return Math.max(...m.map((n) => parseInt(n.replace(/,/g, ''), 10) || 0));
}
