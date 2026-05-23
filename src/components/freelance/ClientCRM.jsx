import { motion } from 'framer-motion';
import {
  Award, Briefcase, Building2, Calendar, CalendarClock, Cake, ChevronRight,
  Crown, Filter, Globe2, Mail, MessageSquarePlus, Pencil, Phone, Plus,
  Star, Trash2, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatDate, formatCurrency } from '../../lib/utils.js';

const STATUS_META = {
  prospect: { label: 'Prospect', color: 'bg-electric/10 text-electric border border-electric/30' },
  active:   { label: 'Active',   color: 'bg-success/15 text-success border border-success/30' },
  past:     { label: 'Past',     color: 'bg-[var(--card-2)] text-muted border border-token' },
  vip:      { label: 'VIP ⭐',   color: 'bg-aws-orange/15 text-aws-orange border border-aws-orange/30' },
};
const STATUSES = ['prospect', 'active', 'past', 'vip'];
const PLATFORMS = ['Upwork', 'LinkedIn', 'Direct', 'Referral', 'Other'];

export function ClientCRM() {
  const { state, addClient, updateClient, deleteClient, logCommunication, convertToUSD } = useFreelance();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [activeId, setActiveId] = useState(null);
  const [editingNew, setEditingNew] = useState(null);

  // Map client → total earned (USD) + last contact + project count.
  const enriched = useMemo(() => {
    return state.clients.map((c) => {
      const payments = state.payments.filter((p) =>
        p.clientId === c.id || (p.clientName && c.name && p.clientName.toLowerCase() === c.name.toLowerCase()));
      const totalUSD = payments.reduce((s, p) =>
        s + convertToUSD(p.amount, p.currency || 'USD'), 0);
      const lastPayment = payments.sort((a, b) => new Date(b.at) - new Date(a.at))[0];
      const projects = [...new Set(payments.map((p) => p.projectTitle).filter(Boolean))];
      const lastComm = c.comms?.[0]?.at || c.addedAt;
      return { ...c, totalUSD, payments, projects, lastComm, lastPayment };
    });
  }, [state.clients, state.payments, convertToUSD]);

  const filtered = useMemo(() => {
    let list = enriched.slice();
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    if (platformFilter !== 'all') list = list.filter((c) => c.platform === platformFilter);
    list.sort((a, b) => b.totalUSD - a.totalUSD || (new Date(b.addedAt) - new Date(a.addedAt)));
    return list;
  }, [enriched, statusFilter, platformFilter]);

  const active = enriched.find((c) => c.id === activeId);

  const saveNew = () => {
    if (!editingNew?.name?.trim()) {
      toast.warning('Client name is required');
      return;
    }
    addClient(editingNew);
    setEditingNew(null);
    toast.success('Client added');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Clients"  value={enriched.length} />
        <Stat label="Active"   value={enriched.filter((c) => c.status === 'active').length} tone="text-success" />
        <Stat label="VIPs"     value={enriched.filter((c) => c.status === 'vip').length} tone="text-aws-orange" />
        <Stat label="Lifetime" value={formatCurrency(enriched.reduce((s, c) => s + c.totalUSD, 0))} />
      </div>

      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-aws-orange" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
        </select>
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
                className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={() => setEditingNew({ status: 'prospect', platform: 'Upwork' })}
                className="ml-auto btn btn-primary !text-xs !py-1.5">
          <Plus size={12} /> New client
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center text-sm text-muted">
          No clients yet. Click <strong>New client</strong> to add the first one.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => setActiveId(c.id)}
                className="w-full text-left surface rounded-2xl p-4 hover:border-aws-orange/40 transition focus-ring"
              >
                <div className="flex items-start gap-2">
                  <div className="w-10 h-10 rounded-xl grid place-items-center font-black bg-gradient-aws text-ink-950 text-sm flex-shrink-0">
                    {(c.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-extrabold truncate">{c.name}</div>
                    <div className="text-[11px] text-muted truncate">{c.company || c.country || '—'}</div>
                  </div>
                  <span className={cn('chip text-[10px] font-bold', STATUS_META[c.status]?.color)}>
                    {c.status === 'vip' && <Crown size={10} />}
                    {STATUS_META[c.status]?.label}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
                  <Tile label="Earned" value={formatCurrency(c.totalUSD)} />
                  <Tile label="Projects" value={c.projects.length} />
                  <Tile label="Rating" value={c.rating ? `${c.rating}/5` : '—'} />
                </div>
                {c.lastComm && (
                  <div className="mt-2 text-[10px] text-muted inline-flex items-center gap-1">
                    <CalendarClock size={10} /> Last contact {formatDate(c.lastComm)}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && (
        <ClientDetailDrawer
          client={active}
          onClose={() => setActiveId(null)}
          updateClient={updateClient}
          deleteClient={deleteClient}
          logCommunication={logCommunication}
        />
      )}

      {editingNew && (
        <ClientNewDrawer
          editing={editingNew}
          setEditing={setEditingNew}
          onSave={saveNew}
          onClose={() => setEditingNew(null)}
        />
      )}
    </div>
  );
}

function ClientDetailDrawer({ client, onClose, updateClient, deleteClient, logCommunication }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(client);
  const [newComm, setNewComm] = useState('');
  const toast = useToast();

  const save = () => {
    const { id, ...rest } = draft;
    updateClient(id, rest);
    toast.success('Client updated');
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ x: 360 }} animate={{ x: 0 }} exit={{ x: 360 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="relative w-full max-w-md h-full overflow-y-auto surface gradient-border p-5"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-2xl grid place-items-center font-black bg-gradient-aws text-ink-950 text-xl">
            {(client.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-extrabold tracking-tight">{client.name}</h3>
            <p className="text-xs text-muted">{client.company || client.country}</p>
          </div>
        </div>

        {/* Stat row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Tile label="Earned" value={formatCurrency(client.totalUSD)} />
          <Tile label="Projects" value={client.projects.length} />
          <Tile label="Rating">
            <StarPicker value={client.rating || 0} onChange={(n) => updateClient(client.id, { rating: n })} />
          </Tile>
        </div>

        {/* Fields */}
        <div className="space-y-2 text-xs">
          {editing ? (
            <>
              <Inline label="Status" as="select" value={draft.status}
                      onChange={(v) => setDraft({ ...draft, status: v })}
                      options={STATUSES} optionLabels={STATUSES.map((s) => STATUS_META[s].label)} />
              <Inline label="Platform" as="select" value={draft.platform}
                      onChange={(v) => setDraft({ ...draft, platform: v })}
                      options={PLATFORMS} />
              <Inline label="Email" value={draft.email || ''} onChange={(v) => setDraft({ ...draft, email: v })} />
              <Inline label="Phone" value={draft.phone || ''} onChange={(v) => setDraft({ ...draft, phone: v })} />
              <Inline label="Country" value={draft.country || ''} onChange={(v) => setDraft({ ...draft, country: v })} />
              <Inline label="Timezone" value={draft.timezone || ''} onChange={(v) => setDraft({ ...draft, timezone: v })} />
              <Inline label="Industry" value={draft.industry || ''} onChange={(v) => setDraft({ ...draft, industry: v })} />
              <Inline label="Birthday (opt)" type="date" value={draft.birthday || ''} onChange={(v) => setDraft({ ...draft, birthday: v })} />
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Notes</label>
                <textarea
                  rows={3}
                  value={draft.notes || ''}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg p-2 text-xs focus-ring focus:border-aws-orange"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={save} className="btn btn-primary !text-xs flex-1">Save</button>
                <button onClick={() => { setDraft(client); setEditing(false); }}
                        className="btn btn-ghost !text-xs">Cancel</button>
              </div>
            </>
          ) : (
            <>
              <Row icon={Briefcase} label="Status" value={STATUS_META[client.status]?.label || '—'} />
              <Row icon={Building2} label="Platform" value={client.platform || '—'} />
              <Row icon={Mail}      label="Email" value={client.email || '—'} />
              <Row icon={Phone}     label="Phone" value={client.phone || '—'} />
              <Row icon={Globe2}    label="Location" value={[client.country, client.timezone].filter(Boolean).join(' · ') || '—'} />
              <Row icon={Award}     label="Industry" value={client.industry || '—'} />
              {client.birthday && <Row icon={Cake} label="Birthday" value={client.birthday} />}
              {client.notes && (
                <div className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Notes</div>
                  <p className="text-xs mt-1 leading-relaxed whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
              <button onClick={() => setEditing(true)} className="btn btn-ghost !text-xs w-full">
                <Pencil size={12} /> Edit details
              </button>
            </>
          )}
        </div>

        {/* Projects + payments */}
        {client.projects.length > 0 && (
          <div className="mt-5">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">Projects</h4>
            <ul className="space-y-1">
              {client.projects.map((p) => (
                <li key={p} className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2 text-xs font-semibold flex items-center justify-between">
                  <span>{p}</span>
                  <span className="text-muted text-[10px]">
                    {client.payments.filter((py) => py.projectTitle === p).length} payment(s)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Communication log */}
        <div className="mt-5">
          <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">Communication log</h4>
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
            {(client.comms || []).length === 0 && (
              <p className="text-xs text-muted italic">No communications logged yet.</p>
            )}
            {(client.comms || []).map((cm) => (
              <div key={cm.id} className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2 text-xs">
                <div className="text-[10px] text-muted">{formatDate(cm.at)}</div>
                <div className="mt-1 whitespace-pre-wrap">{cm.note}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={newComm} onChange={(e) => setNewComm(e.target.value)}
                   placeholder="Quick note — e.g. 'Replied to follow-up'"
                   className="flex-1 bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-xs focus-ring focus:border-aws-orange" />
            <button
              onClick={() => { if (newComm.trim()) { logCommunication(client.id, newComm.trim()); setNewComm(''); toast.success('Logged'); } }}
              className="btn btn-primary !text-xs !py-2"
            >
              <MessageSquarePlus size={12} /> Log
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 pt-4 border-t border-token">
          <button
            onClick={() => { if (confirm(`Delete ${client.name}?`)) { deleteClient(client.id); onClose(); toast.info('Client deleted'); } }}
            className="btn btn-ghost !text-xs text-danger"
          >
            <Trash2 size={12} /> Delete client
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ClientNewDrawer({ editing, setEditing, onSave, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="relative surface rounded-3xl w-full max-w-md p-5 gradient-border"
      >
        <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
          <X size={16} />
        </button>
        <h3 className="text-lg font-extrabold tracking-tight mb-3">New client</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Inline label="Name" value={editing.name || ''} onChange={(v) => setEditing({ ...editing, name: v })} wide />
          <Inline label="Company" value={editing.company || ''} onChange={(v) => setEditing({ ...editing, company: v })} />
          <Inline label="Email" value={editing.email || ''} onChange={(v) => setEditing({ ...editing, email: v })} />
          <Inline label="Country" value={editing.country || ''} onChange={(v) => setEditing({ ...editing, country: v })} />
          <Inline label="Timezone" value={editing.timezone || ''} onChange={(v) => setEditing({ ...editing, timezone: v })} />
          <Inline label="Industry" value={editing.industry || ''} onChange={(v) => setEditing({ ...editing, industry: v })} />
          <Inline label="Platform" as="select" value={editing.platform} onChange={(v) => setEditing({ ...editing, platform: v })} options={PLATFORMS} />
          <Inline label="Status" as="select" value={editing.status} onChange={(v) => setEditing({ ...editing, status: v })} options={STATUSES} optionLabels={STATUSES.map((s) => STATUS_META[s].label)} />
        </div>
        <button onClick={onSave} className="btn btn-primary w-full mt-4">Add client</button>
      </motion.div>
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

function Tile({ label, value, children }) {
  return (
    <div className="rounded-md border border-token bg-[var(--card-2)]/40 px-1.5 py-1.5 text-center">
      <div className="text-[9px] uppercase tracking-widest font-bold text-muted">{label}</div>
      <div className="text-xs font-extrabold tabular-nums mt-0.5">{children ?? value}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-token bg-[var(--card-2)]/30 p-2">
      <Icon size={12} className="text-aws-orange flex-shrink-0" />
      <span className="text-[10px] uppercase tracking-widest font-bold text-muted w-16">{label}</span>
      <span className="text-xs font-semibold flex-1 truncate">{value}</span>
    </div>
  );
}

function Inline({ label, value, onChange, as, type = 'text', options = [], optionLabels, wide }) {
  return (
    <label className={cn('block', wide && 'col-span-2')}>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      {as === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-2 py-1.5 text-xs font-semibold focus-ring focus:border-aws-orange">
          {options.map((o, i) => <option key={o} value={o}>{(optionLabels || options)[i]}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-2 py-1.5 text-xs font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}

function StarPicker({ value = 0, onChange }) {
  return (
    <span className="inline-flex items-center gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n === value ? 0 : n)}
                className="hover:scale-110 transition" aria-label={`Rate ${n}`}>
          <Star size={12} className={n <= value ? 'text-aws-orange fill-aws-orange' : 'text-muted'} />
        </button>
      ))}
    </span>
  );
}
