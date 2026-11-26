import { useMemo, useState } from 'react';
import { Check, ClipboardCopy, Lock, Plus, ShieldCheck, ShieldX, Trash2, Undo2 } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { useMyFacts } from '../../hooks/useMyFacts.js';
import { useApp } from '../../context/AppContext.jsx';
import { STORAGE_KEY } from '../../lib/constants.js';
import {
  CLIENT_SAFETY_RULES, DELIVERIES_KEY_SUFFIX, RUNBOOKS, accessRequestMessage, checkAccountTarget,
  getRunbook, handoverReport, newDelivery, notesProblem, progress, stepLocked, toggleStep,
} from '../../lib/deliveryRunbooks.js';
import { EmptyState } from '../common/EmptyState.jsx';
import { cn } from '../../lib/utils.js';

const field = 'rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-1.5 text-[12.5px]';

function CopyText({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button className="btn btn-ghost !text-[11.5px] !py-1 inline-flex items-center gap-1"
            onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ } }}>
      {done ? <Check size={12} /> : <ClipboardCopy size={12} />} {done ? 'Copied' : label}
    </button>
  );
}

/**
 * Deliver a won job with a runbook: ask for safe access, prove you are in
 * the client's account, work the steps (each with its undo), and hand
 * over a report of every change.
 */
export function DeliveryDesk() {
  const { profile } = useApp();
  const { facts } = useMyFacts();
  const [deliveries, setDeliveries] = useLocalStorage(`${STORAGE_KEY}${DELIVERIES_KEY_SUFFIX}`, []);
  const [activeId, setActiveId] = useState(null);
  const [form, setForm] = useState({ runbookId: 'safe-start', client: '', clientAccountId: '' });
  const [pasted, setPasted] = useState('');
  const [check, setCheck] = useState(null);
  const [notesDraft, setNotesDraft] = useState(null);

  const list = Array.isArray(deliveries) ? deliveries : [];
  const active = list.find((d) => d.id === activeId) || list[list.length - 1] || null;
  const rb = active ? getRunbook(active.runbookId) : null;
  const save = (next) => setDeliveries((all) => (Array.isArray(all) ? all : []).map((d) => (d.id === next.id ? next : d)));
  const report = useMemo(() => (active ? handoverReport(active, { author: profile?.name }) : ''), [active, profile]);
  const notes = notesDraft ?? active?.notes ?? '';
  const notesError = notesProblem(notes);

  const start = () => {
    const d = newDelivery(form);
    setDeliveries((all) => [...(Array.isArray(all) ? all : []), d].slice(-30));
    setActiveId(d.id);
    setCheck(null); setPasted(''); setNotesDraft(null);
  };

  const runCheck = () => {
    const r = checkAccountTarget({ pasted, clientAccountId: active.clientAccountId, ownAccountIds: facts.ownAccountIds });
    setCheck(r);
    save({ ...active, accountChecked: r.ok ? new Date().toISOString() : null });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <section className="surface rounded-2xl p-4">
        <h2 className="text-[14px] font-bold mb-2">Start a delivery</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-[12px] space-y-1">
            <div>Package</div>
            <select className={field} value={form.runbookId} onChange={(e) => setForm({ ...form, runbookId: e.target.value })}>
              {RUNBOOKS.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </label>
          <label className="text-[12px] space-y-1">
            <div>Client</div>
            <input className={field} value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Name or company" />
          </label>
          <label className="text-[12px] space-y-1">
            <div>Client's AWS account ID</div>
            <input className={field} inputMode="numeric" value={form.clientAccountId} onChange={(e) => setForm({ ...form, clientAccountId: e.target.value })} placeholder="12 digits, from the client" />
          </label>
          <button onClick={start} className="btn btn-primary !text-[12px] inline-flex items-center gap-1"><Plus size={13} /> Start</button>
        </div>
        {list.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {list.map((d) => (
              <button key={d.id} onClick={() => { setActiveId(d.id); setCheck(null); setNotesDraft(null); }}
                      className={cn('rounded-full border border-token px-2.5 py-0.5 text-[11.5px]', d.id === active?.id && 'border-aws-orange text-aws-orange')}>
                {d.client || 'Client'} · {getRunbook(d.runbookId)?.title.split(' (')[0]}
              </button>
            ))}
          </div>
        )}
      </section>

      <details className="surface rounded-2xl p-4" open={!active}>
        <summary className="cursor-pointer text-[13px] font-bold">Client-safety rules</summary>
        <ul className="mt-2 space-y-1 text-[12.5px]">{CLIENT_SAFETY_RULES.map((r) => <li key={r.id}>• {r.text}</li>)}</ul>
      </details>

      {!active ? (
        <EmptyState tone="quiet" title="No delivery yet" description="When you win a job, start its delivery here. You get the access request, the checklist with an undo for every step, and the handover report." />
      ) : (
        <>
          <section className="surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-[14px] font-bold">1. Ask for access</h2>
              <CopyText text={accessRequestMessage({ runbookId: active.runbookId, clientName: active.client, myName: profile?.name })} label="Copy message" />
            </div>
            <p className="text-[12px] text-muted">Paste it in Upwork chat. It asks for an IAM user with only: {rb.policies.join(', ')}.</p>
            <pre className="rounded-xl border border-token p-3 text-[11.5px] whitespace-pre-wrap max-h-56 overflow-auto">{accessRequestMessage({ runbookId: active.runbookId, clientName: active.client, myName: profile?.name })}</pre>
          </section>

          <section className="surface rounded-2xl p-4 space-y-2">
            <h2 className="text-[14px] font-bold">2. Prove you are in the client's account</h2>
            <p className="text-[12px] text-muted">
              Signed in as the user they made? Run <code>aws sts get-caller-identity</code> in CloudShell, or copy the account ID from the console menu, and paste it here.
              {!facts.ownAccountIds.length && ' Add your own practice account ID in Grow → My facts, so the app can refuse it.'}
            </p>
            <textarea className={cn(field, 'w-full font-mono')} rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder='{ "Account": "…" }' />
            <button onClick={runCheck} disabled={!pasted.trim()} className="btn btn-ghost !text-[12px] disabled:opacity-50">Check the account</button>
            {(check || active.accountChecked) && (
              <div className={cn('text-[12.5px] flex items-start gap-1.5', (check ? check.ok : active.accountChecked) ? 'text-success' : 'text-danger')}>
                {(check ? check.ok : active.accountChecked) ? <ShieldCheck size={15} /> : <ShieldX size={15} />}
                <span>{check && !check.ok ? check.problems.join(' ') : `In the client's account (ending ${active.clientAccountId.slice(-4)}). The steps below are unlocked.`}</span>
              </div>
            )}
          </section>

          <section className="surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[14px] font-bold">3. Do the work</h2>
              <span className="text-[12px] text-muted tabular-nums">{progress(active).done}/{progress(active).total} done · about {progress(active).minutesLeft} min left</span>
            </div>
            <ol className="space-y-2">
              {rb.steps.map((s, i) => {
                const locked = stepLocked(active, s.id);
                const done = Boolean(active.done?.[s.id]);
                return (
                  <li key={s.id} className="rounded-xl border border-token p-3">
                    <label className={cn('flex items-start gap-2 text-[13px]', locked ? 'cursor-not-allowed' : 'cursor-pointer')}>
                      <input type="checkbox" className="mt-1" disabled={locked} checked={done} onChange={() => save(toggleStep(active, s.id))} />
                      <span className="flex-1">
                        <span className={cn('font-semibold', done && 'line-through text-muted')}>{i + 1}. {s.do}</span>
                        <span className="block text-[12px] text-muted">Why: {s.why} · about {s.minutes} min</span>
                        <span className="block text-[12px]">Check: {s.verify}</span>
                        <span className="block text-[12px] flex items-start gap-1"><Undo2 size={12} className="mt-0.5 shrink-0" /> Undo: {s.undo}</span>
                      </span>
                      {locked && <Lock size={13} className="text-muted mt-1" aria-label="Locked until the account check passes" />}
                    </label>
                  </li>
                );
              })}
            </ol>
            <p className="text-[12px] text-muted">Running cost: {rb.cost}</p>
          </section>

          <section className="surface rounded-2xl p-4 space-y-2">
            <h2 className="text-[14px] font-bold">4. Notes (no passwords or keys)</h2>
            <textarea className={cn(field, 'w-full')} rows={3} value={notes} onChange={(e) => setNotesDraft(e.target.value)} placeholder="Anything the handover should mention" />
            {notesError
              ? <p className="text-[12px] text-danger">{notesError}</p>
              : notesDraft != null && notesDraft !== active.notes && <button onClick={() => { save({ ...active, notes: notesDraft }); setNotesDraft(null); }} className="btn btn-ghost !text-[12px]">Save notes</button>}
          </section>

          <section className="surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-[14px] font-bold">5. Handover report</h2>
              <span className="flex gap-2">
                <CopyText text={report} label="Copy report" />
                <button onClick={() => { if (window.confirm('Remove this delivery from the app? The report is not kept anywhere else.')) { setDeliveries((all) => all.filter((d) => d.id !== active.id)); setActiveId(null); } }}
                        className="btn btn-ghost !text-[11.5px] !py-1 inline-flex items-center gap-1"><Trash2 size={12} /> Remove</button>
              </span>
            </div>
            <pre className="rounded-xl border border-token p-3 text-[11.5px] whitespace-pre-wrap max-h-96 overflow-auto">{report}</pre>
          </section>
        </>
      )}
    </div>
  );
}
