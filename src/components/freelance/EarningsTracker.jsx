import { motion } from 'framer-motion';
import {
  CalendarClock, DollarSign, Pencil, Plus, TrendingDown, TrendingUp, Trash2, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatCurrency, formatDate } from '../../lib/utils.js';

const METHODS = ['Wise', 'Payoneer', 'PayPal', 'Bank wire', 'Crypto', 'Other'];
const CURRENCIES = ['USD', 'GBP', 'EUR', 'GHS', 'AUD', 'CAD', 'AED'];

export function EarningsTracker() {
  const { state, addPayment, updatePayment, deletePayment, earningsStats, convertToUSD } = useFreelance();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [drawer, setDrawer] = useState(false);

  const recent = useMemo(() =>
    state.payments.slice().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 50),
  [state.payments]);

  const byClient = useMemo(() => topN(earningsStats.byClient, 6), [earningsStats]);
  const byProject = useMemo(() => topN(earningsStats.byProject, 6), [earningsStats]);

  const save = () => {
    if (!editing) return;
    const data = {
      ...editing,
      amount: Number(editing.amount) || 0,
    };
    if (editing.id) {
      const { id, ...rest } = data;
      updatePayment(id, rest);
      toast.success('Payment updated');
    } else {
      addPayment(data);
      toast.success('Payment logged');
    }
    setDrawer(false);
    setEditing(null);
  };

  const del = () => {
    if (!editing?.id) return;
    if (!confirm('Delete this payment?')) return;
    deletePayment(editing.id);
    setDrawer(false);
    toast.info('Payment deleted');
  };

  return (
    <div className="space-y-4">
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="This month"   value={formatCurrency(earningsStats.thisMonthUSD)}
              delta={earningsStats.growthPct} />
        <Stat label="Last month"   value={formatCurrency(earningsStats.lastMonthUSD)} />
        <Stat label="Year to date" value={formatCurrency(earningsStats.ytdUSD)} />
        <Stat label="Lifetime"     value={formatCurrency(earningsStats.totalUSD)} tone="text-aws-orange" />
      </div>

      {/* Monthly chart + breakdowns */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Last 12 months (USD)</h3>
            {earningsStats.bestMonth && (
              <span className="chip bg-success/10 text-success border border-success/30 text-[10px] font-bold">
                Best: {earningsStats.bestMonth.label} · {formatCurrency(earningsStats.bestMonth.total)}
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={earningsStats.months} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,153,0,0.08)' }}
                contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [formatCurrency(v), 'Earned']}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {earningsStats.months.map((m, i) => (
                  <Cell key={i} fill={i === earningsStats.months.length - 1 ? '#FF9900' : '#FFB84D'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          <Breakdown title="By client" data={byClient} />
          <Breakdown title="By project type" data={byProject} />
        </div>
      </div>

      {/* Payments table */}
      <div className="surface rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-token">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Payments</h3>
          <button
            onClick={() => { setEditing({ at: new Date().toISOString(), currency: 'USD', method: 'Wise' }); setDrawer(true); }}
            className="btn btn-primary !text-xs !py-1.5"
          >
            <Plus size={12} /> Log payment
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest font-extrabold text-muted">
              <tr className="border-b border-token">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Client</th>
                <th className="p-3 text-left">Project</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">USD</th>
                <th className="p-3 text-left">Method</th>
                <th className="p-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-muted">
                  No payments yet. Log your first one.
                </td></tr>
              ) : recent.map((p) => (
                <tr key={p.id} className="border-b border-token last:border-0 hover:bg-[var(--card-2)]/30">
                  <td className="p-3 text-xs text-muted whitespace-nowrap">{formatDate(p.at)}</td>
                  <td className="p-3 text-xs font-bold">{p.clientName || '—'}</td>
                  <td className="p-3 text-xs">{p.projectTitle || '—'}</td>
                  <td className="p-3 text-xs text-right tabular-nums">{p.currency} {Number(p.amount).toLocaleString()}</td>
                  <td className="p-3 text-xs text-right tabular-nums text-aws-orange font-extrabold">
                    {formatCurrency(convertToUSD(p.amount, p.currency || 'USD'))}
                  </td>
                  <td className="p-3 text-xs">{p.method || '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEditing({ ...p }); setDrawer(true); }}
                            className="text-muted hover:text-aws-orange p-1">
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setDrawer(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative surface rounded-3xl w-full max-w-md p-5 gradient-border"
          >
            <button onClick={() => setDrawer(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold tracking-tight mb-3">
              {editing?.id ? 'Edit payment' : 'Log payment'}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Field label="Date" type="date" value={(editing?.at || '').slice(0, 10)}
                     onChange={(v) => setEditing({ ...editing, at: new Date(v).toISOString() })} />
              <Field label="Method" as="select" value={editing?.method || 'Wise'}
                     onChange={(v) => setEditing({ ...editing, method: v })} options={METHODS} />
              <Field label="Client name" value={editing?.clientName || ''}
                     onChange={(v) => setEditing({ ...editing, clientName: v })} wide />
              <Field label="Project / description" value={editing?.projectTitle || ''}
                     onChange={(v) => setEditing({ ...editing, projectTitle: v })} wide />
              <Field label="Amount" type="number" value={editing?.amount || ''}
                     onChange={(v) => setEditing({ ...editing, amount: v })} />
              <Field label="Currency" as="select" value={editing?.currency || 'USD'}
                     onChange={(v) => setEditing({ ...editing, currency: v })} options={CURRENCIES} />
            </div>
            <div className="mt-4 flex items-center justify-between">
              {editing?.id ? (
                <button onClick={del} className="btn btn-ghost !text-xs text-danger"><Trash2 size={12} /> Delete</button>
              ) : <span />}
              <button onClick={save} className="btn btn-primary">Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, delta, tone = 'text-current' }) {
  return (
    <div className="surface rounded-2xl p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold tabular-nums tracking-tight', tone)}>{value}</div>
      {delta !== null && delta !== undefined && (
        <div className={cn('mt-1 inline-flex items-center gap-1 text-[10px] font-bold',
          delta >= 0 ? 'text-success' : 'text-danger')}>
          {delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {delta >= 0 ? '+' : ''}{delta}% vs last month
        </div>
      )}
    </div>
  );
}

function Breakdown({ title, data }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="surface rounded-2xl p-4">
      <h4 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">{title}</h4>
      {data.length === 0 ? (
        <div className="text-xs text-muted">No data yet.</div>
      ) : (
        <ul className="space-y-1.5">
          {data.map((d) => (
            <li key={d.key} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate font-semibold">{d.key}</span>
              <div className="w-24 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                <div className="h-full bg-aws-orange" style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
              <span className="tabular-nums font-bold text-[11px] w-16 text-right">{formatCurrency(d.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', as, options = [], wide }) {
  return (
    <label className={cn('block', wide && 'col-span-2')}>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}

function topN(obj, n) {
  return Object.entries(obj)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}
