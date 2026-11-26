import { useMemo, useState } from 'react';
import { Coins, Plus, Target, Trophy, Wallet } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import {
  DEFAULT_MONEY_SETTINGS, LEDGER_KEY_SUFFIX, MONEY_SETTINGS_KEY_SUFFIX, OUTCOMES, WITHDRAWAL_STEPS,
  ledgerEntry, ledgerSummary, setOutcome, upworkNet,
} from '../../lib/upworkMoney.js';
import { StatChip } from '../common/StatChip.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { cn } from '../../lib/utils.js';

const field = 'rounded-lg border border-token bg-[var(--card-2)] px-2 py-1 text-[12.5px]';
const KIND_LABEL = { buy: 'Bought', spend: 'Proposal', other: 'Other use', free: 'Free / refund' };
const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

/**
 * Connects in, Connects out, and what the wins paid after Upwork's fee.
 * Prices and fees are settings, because Upwork changes them.
 */
export function UpworkMoney() {
  const [ledger, setLedger] = useLocalStorage(`${STORAGE_KEY}${LEDGER_KEY_SUFFIX}`, []);
  const [settings, setSettings] = useLocalStorage(`${STORAGE_KEY}${MONEY_SETTINGS_KEY_SUFFIX}`, DEFAULT_MONEY_SETTINGS);
  const [form, setForm] = useState({ kind: 'spend', connects: '', dollars: '', job: '' });
  const s = { ...DEFAULT_MONEY_SETTINGS, ...(settings || {}) };
  const list = Array.isArray(ledger) ? ledger : [];
  const sum = useMemo(() => ledgerSummary(list, s), [list, s]);

  const add = () => {
    const e = ledgerEntry({ ...form });
    if (!e) return;
    setLedger((l) => [...(Array.isArray(l) ? l : []), e].slice(-500));
    setForm({ ...form, connects: '', dollars: '', job: '' });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatChip layout="stacked" icon={Coins} label="Connects left (by this log)" value={sum.balance} tone={sum.balance < 10 ? 'warning' : 'default'} />
        <StatChip layout="stacked" icon={Target} label="Proposals · won" value={`${sum.proposals} · ${sum.won}`} />
        <StatChip layout="stacked" icon={Trophy} label="Win rate" value={sum.winRate == null ? 'No answers yet' : `${Math.round(sum.winRate * 100)}%`} />
        <StatChip layout="stacked" icon={Wallet} label="Won, after Upwork's fee" value={money(sum.wonNet)} tone={sum.wonNet > 0 ? 'success' : 'default'} />
      </div>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-[14px] font-bold">Log Connects</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <select className={field} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="What happened">
            <option value="spend">Spent on a proposal</option>
            <option value="other">Used on something else (ID verification, boost)</option>
            <option value="buy">Bought</option>
            <option value="free">Free or refunded</option>
          </select>
          <input className={cn(field, 'w-24')} type="number" min="1" placeholder="Connects" value={form.connects} onChange={(e) => setForm({ ...form, connects: e.target.value })} />
          {form.kind === 'buy' && <input className={cn(field, 'w-24')} type="number" min="0" step="0.01" placeholder="$ paid" value={form.dollars} onChange={(e) => setForm({ ...form, dollars: e.target.value })} />}
          {(form.kind === 'spend' || form.kind === 'other') && <input className={cn(field, 'flex-1 min-w-[10rem]')} placeholder={form.kind === 'spend' ? 'Which job' : 'What for'} value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} />}
          <button onClick={add} className="btn btn-primary !text-[12px] inline-flex items-center gap-1"><Plus size={13} /> Add</button>
        </div>
        <p className="text-[12px] text-muted">
          Spent {sum.connectsSpent} on proposals{sum.connectsOther ? ` and ${sum.connectsOther} on other things` : ''}. Bought {sum.connectsBought} for {money(sum.paid)}{sum.paidIsEstimate ? ' (partly estimated at your Connect price)' : ''}.
          {sum.costPerWin != null && ` Each win cost about ${money(sum.costPerWin)} in Connects (estimate).`}
          {' '}Your real balance is on Upwork; this log only knows what you enter.
        </p>
      </section>

      {list.length === 0 ? (
        <EmptyState tone="quiet" title="Nothing logged yet" description="Log Connects as you buy and spend them, and mark each proposal won or lost. Then you can see what a win really costs." />
      ) : (
        <section className="surface rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-muted"><tr><th className="py-1 pr-2">Date</th><th className="pr-2">What</th><th className="pr-2">Connects</th><th className="pr-2">Job</th><th className="pr-2">Outcome</th><th>Contract $</th></tr></thead>
            <tbody>
              {[...list].reverse().map((e) => (
                <tr key={e.id} className="border-t border-token">
                  <td className="py-1.5 pr-2 tabular-nums">{e.date}</td>
                  <td className="pr-2">{KIND_LABEL[e.kind]}{e.dollars != null ? ` (${money(e.dollars)})` : ''}</td>
                  <td className="pr-2 tabular-nums">{e.kind === 'buy' || e.kind === 'free' ? '+' : '−'}{e.connects}</td>
                  <td className="pr-2">{e.job}</td>
                  <td className="pr-2">
                    {e.kind === 'spend' && (
                      <select className={field} value={e.outcome} onChange={(ev) => setLedger((l) => setOutcome(l, e.id, ev.target.value))} aria-label="Outcome">
                        {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {e.kind === 'spend' && e.outcome === 'won' && (
                      <input className={cn(field, 'w-24')} type="number" min="0" defaultValue={e.amount ?? ''} placeholder="$"
                             onBlur={(ev) => setLedger((l) => setOutcome(l, e.id, 'won', ev.target.value))} aria-label="Contract value" />
                    )}
                    {e.amount ? <span className="ml-1 text-muted">→ {money(upworkNet(e.amount, s).net)} after fee</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="surface rounded-2xl p-4 space-y-1.5">
          <h2 className="text-[14px] font-bold">Getting paid</h2>
          <ol className="text-[12.5px] space-y-1 list-decimal pl-4">{WITHDRAWAL_STEPS.map((w) => <li key={w.id}>{w.text}</li>)}</ol>
        </section>
        <section className="surface rounded-2xl p-4 space-y-1.5">
          <h2 className="text-[14px] font-bold">Prices and fees</h2>
          <p className="text-[11.5px] text-muted">Upwork sets these and changes them. Check your contract and the Connects page, and update them here.</p>
          {[
            ['pricePerConnect', 'Price per Connect (USD)', 0.01],
            ['feeRate', "Upwork's fee on your earnings (0.10 = 10%)", 0.01],
            ['withdrawalFee', 'Fee per withdrawal (USD, depends on method)', 0.5],
          ].map(([k, label, step]) => (
            <label key={k} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span>{label}</span>
              <input className={cn(field, 'w-24')} type="number" min="0" step={step} value={s[k]} onChange={(e) => setSettings({ ...s, [k]: Number(e.target.value) || 0 })} />
            </label>
          ))}
          {sum.wonGross > 0 && <p className="text-[12px]">On {money(sum.wonGross)} won: Upwork's fee about {money(sum.fee)}, you keep about {money(sum.wonNet)} before the withdrawal fee and tax (estimates).</p>}
        </section>
      </div>
    </div>
  );
}
