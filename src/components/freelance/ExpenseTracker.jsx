import { motion } from 'framer-motion';
import { Pencil, Plus, Receipt, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatCurrency, formatDate } from '../../lib/utils.js';

const CATEGORIES = ['AWS costs', 'Courses', 'Tools', 'Equipment', 'Marketing', 'Subscriptions', 'Other'];
const CURRENCIES = ['USD', 'GBP', 'EUR', 'GHS', 'AUD'];

export function ExpenseTracker() {
  const { state, addExpense, updateExpense, deleteExpense, expenseStats, earningsStats, goalProgress } = useFreelance();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [drawer, setDrawer] = useState(false);

  const recent = useMemo(() =>
    state.expenses.slice().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 50),
  [state.expenses]);

  const byCategoryRows = useMemo(() => {
    return Object.entries(expenseStats.byCategory)
      .map(([k, v]) => ({ category: k, total: v }))
      .sort((a, b) => b.total - a.total);
  }, [expenseStats]);

  const save = () => {
    if (!editing.amount || !editing.category) {
      toast.warning('Amount + category required');
      return;
    }
    const data = { ...editing, amount: Number(editing.amount) };
    if (editing.id) {
      const { id, ...rest } = data;
      updateExpense(id, rest);
      toast.success('Expense updated');
    } else {
      addExpense(data);
      toast.success('Expense logged');
    }
    setDrawer(false);
    setEditing(null);
  };

  const del = () => {
    if (!editing?.id) return;
    if (!confirm('Delete this expense?')) return;
    deleteExpense(editing.id);
    setDrawer(false);
    toast.info('Expense deleted');
  };

  return (
    <div className="space-y-4">
      {/* Profit summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Earned (lifetime)" value={formatCurrency(earningsStats.totalUSD)} />
        <Stat label="Expenses (lifetime)" value={formatCurrency(expenseStats.totalUSD)} tone="text-danger" />
        <Stat label="Net profit" value={formatCurrency(goalProgress.profitUSD)} tone={goalProgress.profitUSD >= 0 ? 'text-success' : 'text-danger'} />
        <Stat label="Tax reserve (25%)" value={formatCurrency(goalProgress.estTaxUSD)} tone="text-warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">
            Last 12 months (USD)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={expenseStats.months} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,68,68,0.08)' }}
                contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [formatCurrency(v), 'Expenses']}
              />
              <Bar dataKey="total" fill="#FF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">By category</h3>
          {byCategoryRows.length === 0 ? (
            <div className="text-xs text-muted">Log your first expense to see breakdowns.</div>
          ) : (
            <ul className="space-y-1.5">
              {byCategoryRows.map((row) => {
                const max = Math.max(...byCategoryRows.map((r) => r.total));
                return (
                  <li key={row.category} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 font-semibold truncate">{row.category}</span>
                    <div className="w-24 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                      <div className="h-full bg-danger" style={{ width: `${(row.total / max) * 100}%` }} />
                    </div>
                    <span className="tabular-nums font-bold w-16 text-right">{formatCurrency(row.total)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="surface rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-token">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Expenses</h3>
          <button
            onClick={() => { setEditing({ at: new Date().toISOString(), currency: 'USD', category: 'AWS costs' }); setDrawer(true); }}
            className="btn btn-primary !text-xs !py-1.5"
          ><Plus size={12} /> Add expense</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-widest font-extrabold text-muted">
              <tr className="border-b border-token">
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Note</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-sm text-muted">
                  No expenses logged yet.
                </td></tr>
              ) : recent.map((e) => (
                <tr key={e.id} className="border-b border-token last:border-0 hover:bg-[var(--card-2)]/30">
                  <td className="p-3 text-xs text-muted whitespace-nowrap">{formatDate(e.at)}</td>
                  <td className="p-3 text-xs font-bold">{e.category}</td>
                  <td className="p-3 text-xs text-muted">{e.note || '—'}</td>
                  <td className="p-3 text-xs text-right tabular-nums font-extrabold text-danger">
                    {e.currency} {Number(e.amount).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => { setEditing({ ...e }); setDrawer(true); }}
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
              {editing?.id ? 'Edit expense' : 'Log expense'}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <In label="Date" type="date" value={(editing?.at || '').slice(0, 10)}
                  onChange={(v) => setEditing({ ...editing, at: new Date(v).toISOString() })} />
              <In label="Category" as="select" value={editing?.category}
                  onChange={(v) => setEditing({ ...editing, category: v })} options={CATEGORIES} />
              <In label="Amount" type="number" value={editing?.amount || ''}
                  onChange={(v) => setEditing({ ...editing, amount: v })} />
              <In label="Currency" as="select" value={editing?.currency || 'USD'}
                  onChange={(v) => setEditing({ ...editing, currency: v })} options={CURRENCIES} />
              <In label="Note" value={editing?.note || ''}
                  onChange={(v) => setEditing({ ...editing, note: v })} wide />
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

function Stat({ label, value, tone = 'text-current' }) {
  return (
    <div className="surface rounded-2xl p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className={cn('mt-1 text-2xl font-extrabold tabular-nums tracking-tight', tone)}>{value}</div>
    </div>
  );
}

function In({ label, value, onChange, type = 'text', as, options = [], wide }) {
  return (
    <label className={cn('block', wide && 'col-span-2')}>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      {as === 'select' ? (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-xs font-semibold focus-ring focus:border-aws-orange">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
               className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-xs font-semibold focus-ring focus:border-aws-orange" />
      )}
    </label>
  );
}
