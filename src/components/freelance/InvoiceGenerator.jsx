import { motion } from 'framer-motion';
import {
  Calendar, Check, Pencil, Plus, Printer, Trash2, X,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { cn, formatDate, uid } from '../../lib/utils.js';
import { createManualPaymentRecord, assessMilestoneAcceptance } from '../../lib/businessWorkflow.js';

const STATUS_META = {
  draft:    { label: 'Draft',    color: 'bg-[var(--card-2)] text-muted border border-token' },
  sent:     { label: 'Sent',     color: 'bg-electric/10 text-electric border border-electric/30' },
  paid:     { label: 'Paid · manually verified', color: 'bg-success/15 text-success border border-success/30' },
  overdue:  { label: 'Overdue',  color: 'bg-danger/15 text-danger border border-danger/30' },
};
const STATUSES = ['draft', 'sent', 'paid', 'overdue'];

export function InvoiceGenerator() {
  const { state, addInvoice, updateInvoice, deleteInvoice } = useFreelance();
  const { profile } = useApp();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  const openNew = () => {
    const due = new Date();
    due.setDate(due.getDate() + 14);
    setEditing({
      id: null,
      issuedAt: new Date().toISOString(),
      dueAt: due.toISOString().slice(0, 10),
      clientName: '',
      clientEmail: '',
      currency: 'USD',
      taxPct: 0,
      lineItems: [{ id: uid(), desc: '', qty: 1, unit: 0 }],
      notes: 'Bank: Wise · Account name: ' + (profile?.name || 'Your Name'),
      milestone: '',
      acceptanceStatus: 'pending',
      acceptanceEvidence: '',
      acceptedBy: '',
      status: 'draft',
    });
    setDrawer(true);
  };

  const save = () => {
    if (!editing.clientName?.trim()) { toast.warning('Client name required'); return; }
    if (!editing.lineItems?.length) { toast.warning('Add at least one line item'); return; }
    const data = { ...editing };
    delete data.id;
    if (editing.id) {
      updateInvoice(editing.id, data);
      toast.success('Invoice updated');
    } else {
      addInvoice(data);
      toast.success('Invoice created');
    }
    setDrawer(false);
    setEditing(null);
  };

  const markPaid = (inv) => {
    const reference = window.prompt('Enter the bank/platform transaction reference or receipt note. This app cannot verify payments automatically.');
    if (!reference?.trim()) { toast.warning('Payment reference required'); return; }
    if (!confirm('Confirm that you personally checked the money was received. This records payment only; it does not process or verify funds.')) return;
    updateInvoice(inv.id, createManualPaymentRecord(reference));
    toast.success('Payment recorded as manually verified');
  };

  const del = (inv) => {
    if (!confirm(`Delete ${inv.number}?`)) return;
    deleteInvoice(inv.id);
    toast.info('Invoice deleted');
  };

  const print = (inv) => {
    setPrintingId(inv.id);
    setTimeout(() => {
      document.body.classList.add('printing-invoice');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-invoice');
        setPrintingId(null);
      }, 600);
    }, 80);
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Invoices</h3>
        <button onClick={openNew} className="btn btn-primary !text-xs !py-1.5">
          <Plus size={12} /> New invoice
        </button>
      </div>

      <div className="rounded-xl border border-warning/35 bg-warning/5 p-3 text-[11.5px] leading-relaxed">
        <strong>Recordkeeping only.</strong> This screen creates printable invoices and manual payment records.
        It is not connected to Stripe, Wise, PayPal, a bank, or payment webhooks and cannot move or verify money.
      </div>

      {state.invoices.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center text-sm text-muted">
          No invoices yet. Create your first one.
        </div>
      ) : (
        <ul className="space-y-2">
          {state.invoices.map((inv) => {
            const total = invoiceTotal(inv);
            const overdue = inv.status === 'sent' && inv.dueAt && inv.dueAt < today;
            const status = overdue ? 'overdue' : (inv.status || 'draft');
            return (
              <li key={inv.id} className="surface rounded-2xl p-4 print:hidden">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm">{inv.number}</span>
                      <span className={cn('chip text-[10px] font-bold', STATUS_META[status].color)}>
                        {STATUS_META[status].label}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      {inv.clientName} · Due {inv.dueAt} · {inv.currency} {total.toLocaleString()}
                    </div>
                    {inv.milestone && <div className="text-[11px] mt-1">Milestone: {inv.milestone} · Acceptance: {assessMilestoneAcceptance(inv).clientAccepted ? 'evidenced' : (inv.acceptanceStatus || 'pending')}</div>}
                    {inv.status === 'paid' && <div className="text-[10.5px] text-success mt-1">Evidence: {inv.paymentEvidence || 'legacy manual record (no reference)'}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditing(inv); setDrawer(true); }}
                            className="btn btn-ghost !text-xs !py-1.5"><Pencil size={12} /></button>
                    <button onClick={() => print(inv)}
                            className="btn btn-ghost !text-xs !py-1.5"><Printer size={12} /></button>
                    {inv.status !== 'paid' && (
                      <button onClick={() => markPaid(inv)}
                              className="btn btn-ghost !text-xs !py-1.5 text-success"><Check size={12} /> Paid</button>
                    )}
                    <button onClick={() => del(inv)}
                            className="btn btn-ghost !text-xs !py-1.5 text-danger"><Trash2 size={12} /></button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Printable invoice (visible only when printing) */}
      {printingId && state.invoices.find((i) => i.id === printingId) && (
        <PrintableInvoice inv={state.invoices.find((i) => i.id === printingId)} profile={profile} />
      )}

      {/* Drawer */}
      {drawer && editing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setDrawer(false)} />
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="relative surface rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-5 gradient-border"
          >
            <button onClick={() => setDrawer(false)} className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-[var(--card-2)]">
              <X size={16} />
            </button>
            <h3 className="text-lg font-extrabold tracking-tight mb-3">
              {editing.id ? 'Edit invoice' : 'New invoice'}
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <In label="Issued" type="date" value={(editing.issuedAt || '').slice(0, 10)}
                  onChange={(v) => setEditing({ ...editing, issuedAt: new Date(v).toISOString() })} />
              <In label="Due" type="date" value={editing.dueAt}
                  onChange={(v) => setEditing({ ...editing, dueAt: v })} />
              <In label="Client name" value={editing.clientName}
                  onChange={(v) => setEditing({ ...editing, clientName: v })} />
              <In label="Client email" value={editing.clientEmail}
                  onChange={(v) => setEditing({ ...editing, clientEmail: v })} />
              <In label="Currency" as="select" value={editing.currency}
                  onChange={(v) => setEditing({ ...editing, currency: v })}
                  options={['USD', 'GBP', 'EUR', 'GHS', 'AUD']} />
              <In label="Tax %" type="number" value={editing.taxPct}
                  onChange={(v) => setEditing({ ...editing, taxPct: Number(v) || 0 })} />
              <In label="Milestone / deliverable" value={editing.milestone || ''}
                  onChange={(v) => setEditing({ ...editing, milestone: v })} />
              <In label="Client acceptance" as="select" value={editing.acceptanceStatus || 'pending'}
                  onChange={(v) => setEditing({ ...editing, acceptanceStatus: v })}
                  options={['pending', 'accepted', 'changes-requested', 'disputed']} />
              <In label="Accepted by" value={editing.acceptedBy || ''}
                  onChange={(v) => setEditing({ ...editing, acceptedBy: v })} />
              <In label="Acceptance evidence URL / reference" value={editing.acceptanceEvidence || ''}
                  onChange={(v) => setEditing({ ...editing, acceptanceEvidence: v })} />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Line items</h4>
                <button onClick={() => setEditing({
                  ...editing, lineItems: [...editing.lineItems, { id: uid(), desc: '', qty: 1, unit: 0 }],
                })} className="btn btn-ghost !text-[11px] !py-1"><Plus size={10} /> Add line</button>
              </div>
              <ul className="space-y-1.5">
                {editing.lineItems.map((li, i) => (
                  <li key={li.id} className="grid grid-cols-[1fr_60px_90px_30px] gap-2 items-center">
                    <input value={li.desc} onChange={(e) => setLine(setEditing, editing, i, 'desc', e.target.value)}
                           placeholder="Description"
                           className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange" />
                    <input type="number" value={li.qty} onChange={(e) => setLine(setEditing, editing, i, 'qty', Number(e.target.value))}
                           className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs tabular-nums focus-ring focus:border-aws-orange" />
                    <input type="number" value={li.unit} onChange={(e) => setLine(setEditing, editing, i, 'unit', Number(e.target.value))}
                           placeholder="Unit price"
                           className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs tabular-nums focus-ring focus:border-aws-orange" />
                    <button onClick={() => setEditing({
                      ...editing, lineItems: editing.lineItems.filter((_, idx) => idx !== i) })}
                            className="text-muted hover:text-danger">
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Notes / payment instructions</label>
              <textarea
                rows={3}
                value={editing.notes || ''}
                onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg p-2 text-xs focus-ring focus:border-aws-orange"
              />
            </div>

            <div className="mt-4 surface-2 rounded-lg p-3 text-sm">
              <Total inv={editing} />
            </div>

            <div className="mt-4 flex justify-between">
              <span />
              <button onClick={save} className="btn btn-primary">Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function setLine(setter, current, idx, key, value) {
  setter({
    ...current,
    lineItems: current.lineItems.map((li, i) => i === idx ? { ...li, [key]: value } : li),
  });
}

function invoiceSubtotal(inv) {
  return (inv.lineItems || []).reduce((s, li) => s + (Number(li.qty) || 0) * (Number(li.unit) || 0), 0);
}

function invoiceTotal(inv) {
  const sub = invoiceSubtotal(inv);
  return Math.round((sub + sub * (Number(inv.taxPct) || 0) / 100) * 100) / 100;
}

function Total({ inv }) {
  const subtotal = invoiceSubtotal(inv);
  const tax = subtotal * (Number(inv.taxPct) || 0) / 100;
  const total = subtotal + tax;
  return (
    <div className="space-y-1 text-xs">
      <Row label="Subtotal" value={`${inv.currency} ${subtotal.toLocaleString()}`} />
      <Row label={`Tax (${inv.taxPct || 0}%)`} value={`${inv.currency} ${Math.round(tax * 100) / 100}`} />
      <Row label="Total" value={`${inv.currency} ${Math.round(total * 100) / 100}`} bold />
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className={cn('flex justify-between', bold && 'pt-1 border-t border-token text-base font-extrabold')}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function In({ label, value, onChange, type = 'text', as, options = [] }) {
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      {as === 'select' ? (
        <select value={value} onChange={(e) => onChange(e.target.value)}
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

function PrintableInvoice({ inv, profile }) {
  const subtotal = invoiceSubtotal(inv);
  const tax = subtotal * (Number(inv.taxPct) || 0) / 100;
  const total = subtotal + tax;
  return (
    <div className="hidden print:block invoice-print" style={{ color: '#0f172a', background: '#fff' }}>
      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#FF9900', margin: 0 }}>INVOICE</h1>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{inv.number}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{profile?.name || 'Your Name'}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>AWS Cloud Engineer</div>
          </div>
        </div>
        <hr style={{ borderColor: '#e2e8f0', margin: '16px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 12 }}>
          <div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>BILL TO</div>
            <div style={{ marginTop: 4, fontWeight: 700 }}>{inv.clientName}</div>
            <div style={{ color: '#475569' }}>{inv.clientEmail}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700 }}>ISSUED</div>
            <div>{formatDate(inv.issuedAt)}</div>
            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, marginTop: 8 }}>DUE</div>
            <div>{inv.dueAt}</div>
          </div>
        </div>
        <table style={{ width: '100%', marginTop: 24, fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Description</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Qty</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Unit</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(inv.lineItems || []).map((li) => (
              <tr key={li.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: 8 }}>{li.desc}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{li.qty}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{inv.currency} {Number(li.unit).toLocaleString()}</td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 700 }}>
                  {inv.currency} {Math.round((li.qty * li.unit) * 100) / 100}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, marginLeft: 'auto', maxWidth: 280, fontSize: 12 }}>
          <Line label="Subtotal" value={`${inv.currency} ${subtotal.toLocaleString()}`} />
          <Line label={`Tax (${inv.taxPct || 0}%)`} value={`${inv.currency} ${Math.round(tax * 100) / 100}`} />
          <Line label="Total" value={`${inv.currency} ${Math.round(total * 100) / 100}`} bold />
        </div>
        {inv.notes && (
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#475569' }}>
            <strong>Notes:</strong> {inv.notes}
          </div>
        )}
        {inv.milestone && (
          <div style={{ marginTop: 12, fontSize: 11, color: '#475569' }}>
            <strong>Milestone:</strong> {inv.milestone} · <strong>Acceptance:</strong> {inv.acceptanceStatus || 'pending'}
            {inv.acceptedBy ? ` · By: ${inv.acceptedBy}` : ''}
            {inv.acceptanceEvidence ? ` · Evidence: ${inv.acceptanceEvidence}` : ''}
          </div>
        )}
      </div>
    </div>
  );
}

function Line({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                  borderTop: bold ? '2px solid #0f172a' : 'none',
                  marginTop: bold ? 8 : 0,
                  fontWeight: bold ? 800 : 400,
                  fontSize: bold ? 14 : 12 }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
