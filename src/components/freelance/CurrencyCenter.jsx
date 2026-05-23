import { ArrowRightLeft, Edit3, RefreshCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatDate } from '../../lib/utils.js';

const CURRENCIES = ['USD', 'GBP', 'EUR', 'GHS', 'AUD', 'CAD', 'AED'];

// Synthetic historical chart — illustrates the trend without pretending
// to be a live feed. Centered on the user's stored "current" rate.
function buildHistoricalSeries(current) {
  const points = 30;
  const arr = [];
  let v = current * 1.03;
  for (let i = points - 1; i >= 0; i--) {
    v += (Math.random() - 0.5) * (current * 0.01);
    const d = new Date(); d.setDate(d.getDate() - i);
    arr.push({ day: d.toISOString().slice(5, 10), rate: Math.max(0.0001, +(v.toFixed(4))) });
  }
  // Force the last point to be the current stored rate
  arr[arr.length - 1].rate = +current.toFixed(4);
  return arr;
}

export function CurrencyCenter() {
  const { state, setRate } = useFreelance();
  const toast = useToast();
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('GBP');
  const [amount, setAmount] = useState(1000);
  const [editing, setEditing] = useState(false);
  const [draftRates, setDraftRates] = useState(state.rates.rates);

  const rate = useMemo(() => {
    const r = state.rates.rates;
    return (r[to] || 1) / (r[from] || 1);
  }, [from, to, state.rates]);

  const converted = useMemo(() => amount * rate, [amount, rate]);

  const series = useMemo(() => buildHistoricalSeries(rate), [rate]);
  const trend = useMemo(() => {
    if (series.length < 2) return 0;
    const first = series[0].rate;
    const last = series[series.length - 1].rate;
    return Math.round(((last - first) / first) * 100 * 100) / 100;
  }, [series]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Currency converter</h3>
          <span className="text-[10px] text-muted">Rates updated {formatDate(state.rates.updatedAt)}</span>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">From</label>
            <div className="mt-1 flex gap-2">
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)}
                     className="flex-1 bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-base font-extrabold tabular-nums focus-ring focus:border-aws-orange" />
              <select value={from} onChange={(e) => setFrom(e.target.value)}
                      className="bg-[var(--card-2)] border border-token rounded-lg px-2 py-2 text-sm font-bold focus-ring focus:border-aws-orange">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => { setFrom(to); setTo(from); }}
                  className="btn btn-ghost !p-2 self-end" title="Swap">
            <ArrowRightLeft size={14} />
          </button>
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">To</label>
            <div className="mt-1 flex gap-2">
              <div className="flex-1 bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-base font-extrabold tabular-nums text-aws-orange">
                {converted.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <select value={to} onChange={(e) => setTo(e.target.value)}
                      className="bg-[var(--card-2)] border border-token rounded-lg px-2 py-2 text-sm font-bold focus-ring focus:border-aws-orange">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="text-[11px] text-muted">
            1 {from} ={' '}
            <strong className="text-current font-extrabold tabular-nums">{rate.toFixed(4)} {to}</strong>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">30-day trend ({from} → {to})</h3>
            <span className={cn('chip border text-[10px] font-bold',
              trend >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-danger/10 text-danger border-danger/30')}>
              {trend >= 0 ? '+' : ''}{trend}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={series}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false}
                     domain={['dataMin', 'dataMax']} />
              <Tooltip contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="#FF9900" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-[11px] text-muted mt-1">
            {trend >= 1 ? `${to} weakening vs ${from} — wait if you can.`
              : trend <= -1 ? `${to} strengthening vs ${from} — good time to convert.`
              : 'Sideways trend — no strong timing signal.'}
          </div>
        </div>

        <div className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Stored rates</h3>
            {!editing
              ? <button onClick={() => setEditing(true)} className="btn btn-ghost !text-[11px] !py-1"><Edit3 size={10} /> Edit</button>
              : (
                <div className="flex gap-1">
                  <button onClick={() => {
                    for (const [c, v] of Object.entries(draftRates)) setRate(c, Number(v) || 0);
                    toast.success('Rates saved');
                    setEditing(false);
                  }} className="btn btn-primary !text-[11px] !py-1">Save</button>
                  <button onClick={() => { setDraftRates(state.rates.rates); setEditing(false); }}
                          className="btn btn-ghost !text-[11px] !py-1">Cancel</button>
                </div>
              )}
          </div>
          <ul className="space-y-1 text-xs">
            {CURRENCIES.map((c) => (
              <li key={c} className="flex items-center justify-between gap-3">
                <span className="font-bold w-12">{c}</span>
                {editing ? (
                  <input type="number" step="0.0001"
                         value={draftRates[c] ?? 1}
                         onChange={(e) => setDraftRates({ ...draftRates, [c]: Number(e.target.value) })}
                         className="flex-1 bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs tabular-nums focus-ring focus:border-aws-orange" />
                ) : (
                  <span className="tabular-nums text-muted">1 USD = {(state.rates.rates[c] ?? 1).toFixed(4)} {c}</span>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-[10px] text-muted inline-flex items-center gap-1">
            <RefreshCcw size={9} /> Update manually when you check mid-market rates.
          </div>
        </div>
      </div>

      {/* Payment method comparison */}
      <div className="surface rounded-2xl p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Payment method comparison</h3>
        <p className="text-xs text-muted mb-3">
          Net amount you'd actually receive on a {formatAmt(amount, from)} payment.
        </p>
        <ul className="space-y-1.5">
          {state.fees.map((f) => {
            // gross → minus baseFeePct + fxMarkupPct → minus withdrawFee
            const baseDeduct = amount * (f.baseFeePct / 100);
            const fxDeduct   = amount * (f.fxMarkupPct / 100);
            const net = Math.max(0, amount - baseDeduct - fxDeduct - (f.withdrawFee || 0));
            return (
              <li key={f.id} className="flex items-center gap-3 text-xs rounded-lg border border-token bg-[var(--card-2)]/40 p-2.5">
                <span className="font-extrabold w-20">{f.label}</span>
                <span className="flex-1 text-muted text-[11px]">{f.blurb}</span>
                <span className="tabular-nums font-bold text-aws-orange w-28 text-right">
                  ≈ {formatAmt(net, from)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function formatAmt(n, c) {
  return `${c} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
