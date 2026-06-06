import {
  Archive, ChevronLeft, ClipboardCopy, Copy, Download, Edit3, FileSignature,
  FileText, Filter, Mail, MailPlus, Package, Plus, Receipt, Save, Search,
  Send, Trash2, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useAI } from '../context/AIContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  buildContract, buildDeliveryPackage, buildInvoice, contractToMarkdown,
  invoiceToMarkdown, invoiceTotals,
} from '../data/documents.js';
import { openPrintable } from '../lib/printableHtml.js';
import { cn } from '../lib/utils.js';
import { ContractReviewPanel } from '../components/contract-review/ContractReviewPanel.jsx';
import { InvoiceReviewPanel } from '../components/invoice-review/InvoiceReviewPanel.jsx';
import { DocReviewPanel } from '../components/doc-review/DocReviewPanel.jsx';

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: FileText },
  { id: 'contracts',  label: 'Contracts',  icon: FileSignature },
  { id: 'invoices',   label: 'Invoices',   icon: Receipt },
  { id: 'deliveries', label: 'Deliveries', icon: Package },
  { id: 'library',    label: 'Library',    icon: Archive },
];

export default function DocumentCenter() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Document Center"
        title="Every client document, generated and stored."
        subtitle="Contracts, invoices, delivery packages — all auto-fill from the CRM and job analyzer. Keep a tidy library so nothing slips."
        icon={FileText}
      />

      <div className="surface rounded-2xl p-1.5 flex items-center gap-1 w-fit overflow-x-auto">
        {TABS.map((t) => {
          const I = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition whitespace-nowrap',
                tab === t.id ? 'bg-aws-orange/15 text-aws-orange' : 'text-muted hover:text-current hover:bg-[var(--card-2)]',
              )}
            >
              <I size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview'   && <OverviewTab setTab={setTab} />}
      {tab === 'contracts'  && <ContractsTab />}
      {tab === 'invoices'   && <InvoicesTab />}
      {tab === 'deliveries' && <DeliveriesTab />}
      {tab === 'library'    && <LibraryTab />}
    </div>
  );
}

// =================================================================
// OVERVIEW — 4 big cards
// =================================================================

function OverviewTab({ setTab }) {
  const { state: earn } = useEarn();
  const { state: fre } = useFreelance();
  const cards = [
    {
      id: 'contracts',  label: 'Contracts',  icon: FileSignature,
      blurb: 'Generate from a job brief, edit line-by-line, export PDF.',
      count: earn.contracts.length,
    },
    {
      id: 'invoices',   label: 'Invoices',   icon: Receipt,
      blurb: 'Auto-incrementing INV-####. Wise + Payoneer details. Mark paid → earnings tracker.',
      count: fre.invoices.length,
    },
    {
      id: 'deliveries', label: 'Delivery packages', icon: Package,
      blurb: 'One-click handover ZIP — diagram, code, runbook.',
      count: earn.deliveries.length,
    },
    {
      id: 'library',    label: 'Library',    icon: Archive,
      blurb: 'Every document searchable. Never lose a draft.',
      count: earn.contracts.length + fre.invoices.length + earn.deliveries.length,
    },
  ];
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const I = c.icon;
        return (
          <button
            key={c.id}
            onClick={() => setTab(c.id)}
            className="surface rounded-2xl p-5 text-left group hover:border-aws-orange/40 transition focus-ring relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full blur-2xl bg-aws-orange/10 group-hover:bg-aws-orange/20 transition" />
            <div className="relative space-y-2">
              <div className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-aws text-ink-950 shadow-glow-orange">
                <I size={16} strokeWidth={2.5} />
              </div>
              <h3 className="text-base font-extrabold">{c.label}</h3>
              <p className="text-[11px] text-muted leading-relaxed">{c.blurb}</p>
              <div className="text-[10px] font-bold text-aws-orange uppercase tracking-widest">
                {c.count} saved
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}

// =================================================================
// CONTRACTS
// =================================================================

function ContractsTab() {
  const toast = useToast();
  const dialog = useDialog();
  const { profile } = useApp();
  const { state: fre } = useFreelance();
  const { state: earn, saveContract, deleteContract } = useEarn();

  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const c = earn.contracts.find((x) => x.id === activeId) || earn.contracts[0] || null;
    setDraft(c ? { ...c } : null);
    if (c && activeId !== c.id) setActiveId(c.id);
  }, [activeId, earn.contracts]);

  const startNew = () => {
    const c = buildContract({
      author: { name: profile.name || '', email: profile.integrations?.upwork || '' },
      client: {},
    });
    saveContract(c);
    setActiveId(c.id);
    toast.success('New contract drafted');
  };

  const save = () => {
    if (!draft) return;
    saveContract(draft);
    toast.success('Contract saved');
  };

  const exportPdf = () => {
    if (!draft) return;
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    openPrintable({
      documentType: 'Engagement Contract',
      title: draft.title,
      subtitle: draft.parties.client.company || draft.parties.client.name || '',
      markdown: contractToMarkdown(draft),
      meta: [
        { label: 'Contract #', value: draft.number },
        { label: 'Status',     value: draft.status },
        { label: 'Client',     value: [draft.parties.client.name, draft.parties.client.company].filter(Boolean).join(' · ') },
        { label: 'Duration',   value: `${draft.timeline.days} days` },
        { label: 'Start',      value: fmt(draft.timeline.start) },
        { label: 'Total',      value: `${draft.payment.currency} ${draft.payment.total.toLocaleString()}` },
      ],
      authorName: draft.parties.author.name || profile?.name || 'AWS Cloud Engineer',
      authorCompany: draft.parties.author.company || '',
    });
  };

  const copyMd = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(contractToMarkdown(draft));
      toast.success('Markdown copied');
    } catch { toast.error('Copy failed'); }
  };

  const sendEmailLink = (mailto) => window.open(mailto, '_blank');

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <div className="surface rounded-2xl p-3 space-y-2">
        <button onClick={startNew} className="btn btn-primary w-full !text-xs">
          <Plus size={11} /> New contract
        </button>
        {earn.contracts.length === 0 ? (
          <p className="text-[11px] text-muted">No contracts yet.</p>
        ) : (
          <ul className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
            {earn.contracts.map((c) => (
              <li key={c.id} className="group flex items-center gap-1">
                <button
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    'flex-1 text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition',
                    c.id === activeId && 'bg-aws-orange/10 text-aws-orange font-bold',
                  )}
                >
                  <div className="font-bold truncate">{c.title}</div>
                  <div className="text-[10px] text-muted">{c.number} · {c.status}</div>
                </button>
                <button
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: 'Delete contract?',
                      description: `${c.number} · ${c.title}`,
                      danger: true,
                    });
                    if (ok) { deleteContract(c.id); setActiveId(null); }
                  }}
                  className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                  aria-label={`Delete contract ${c.number}`}
                ><Trash2 size={11} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!draft ? (
        <div className="surface rounded-2xl p-10 text-center text-muted">
          <FileSignature size={28} className="mx-auto mb-2 text-aws-orange/60" />
          Pick a contract or click "New contract".
        </div>
      ) : (
        <div className="surface rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="bg-transparent text-base font-extrabold focus-ring focus:outline-none w-full max-w-md"
              />
              <div className="text-[10px] text-muted font-bold">{draft.number}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="signed">Signed</option>
                <option value="archived">Archived</option>
              </select>
              <button onClick={save}      className="btn btn-primary !text-xs"><Save size={11} /> Save</button>
              <button onClick={copyMd}    className="btn btn-ghost !text-xs"><ClipboardCopy size={11} /> Copy</button>
              <button onClick={exportPdf} className="btn btn-ghost !text-xs"><Download size={11} /> PDF</button>
              <button onClick={() => sendEmailLink(`mailto:${draft.parties.client.email}?subject=${encodeURIComponent('Engagement contract — ' + draft.title)}&body=${encodeURIComponent(contractToMarkdown(draft))}`)} className="btn btn-ghost !text-xs">
                <Send size={11} /> Email client
              </button>
            </div>
          </div>

          <Group label="Parties">
            <PartyEditor
              who="Client" obj={draft.parties.client}
              onChange={(o) => setDraft({ ...draft, parties: { ...draft.parties, client: { ...draft.parties.client, ...o } } })}
              presetClients={fre.clients}
              onPick={(c) => setDraft({
                ...draft,
                parties: { ...draft.parties, client: { name: c.name, company: c.company, email: c.email, address: c.address || '' } },
              })}
            />
            <PartyEditor
              who="You" obj={draft.parties.author}
              onChange={(o) => setDraft({ ...draft, parties: { ...draft.parties, author: { ...draft.parties.author, ...o } } })}
            />
          </Group>

          <Group label="Scope">
            <textarea
              value={draft.scope}
              onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
              rows={3}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
            />
          </Group>

          <Group label="Deliverables">
            <ListEditor
              items={draft.deliverables}
              onChange={(items) => setDraft({ ...draft, deliverables: items })}
              placeholder="New deliverable…"
            />
          </Group>

          <div className="grid sm:grid-cols-3 gap-2">
            <Field label="Start date" type="date"
              value={(draft.timeline.start || '').slice(0, 10)}
              onChange={(e) => setDraft({ ...draft, timeline: { ...draft.timeline, start: new Date(e.target.value).toISOString() } })} />
            <Field label="End date" type="date"
              value={(draft.timeline.end || '').slice(0, 10)}
              onChange={(e) => setDraft({ ...draft, timeline: { ...draft.timeline, end: new Date(e.target.value).toISOString() } })} />
            <Field label="Days" type="number"
              value={draft.timeline.days}
              onChange={(e) => setDraft({ ...draft, timeline: { ...draft.timeline, days: +e.target.value } })} />
          </div>

          <Group label="Investment">
            <div className="grid sm:grid-cols-3 gap-2">
              <Field label="Currency" value={draft.payment.currency} onChange={(e) => setDraft({ ...draft, payment: { ...draft.payment, currency: e.target.value } })} />
              <Field label="Total" type="number" value={draft.payment.total} onChange={(e) => setDraft({ ...draft, payment: { ...draft.payment, total: +e.target.value } })} />
              <Field label="Method" value={draft.payment.method} onChange={(e) => setDraft({ ...draft, payment: { ...draft.payment, method: e.target.value } })} />
            </div>
            <ScheduleEditor
              schedule={draft.payment.schedule}
              currency={draft.payment.currency}
              onChange={(sch) => setDraft({ ...draft, payment: { ...draft.payment, schedule: sch } })}
            />
          </Group>

          <div className="grid sm:grid-cols-2 gap-2">
            <Field label="Revisions included" type="number"
              value={draft.revisions} onChange={(e) => setDraft({ ...draft, revisions: +e.target.value })} />
            <div />
          </div>

          <Group label="Intellectual property">
            <textarea
              value={draft.ip}
              onChange={(e) => setDraft({ ...draft, ip: e.target.value })}
              rows={3}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
            />
          </Group>
          <Group label="Confidentiality">
            <textarea
              value={draft.confidentiality}
              onChange={(e) => setDraft({ ...draft, confidentiality: e.target.value })}
              rows={2}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
            />
          </Group>
          <Group label="Cancellation & refunds">
            <textarea
              value={draft.cancellation + '\n\n' + draft.refunds}
              onChange={(e) => {
                const [a, ...rest] = e.target.value.split('\n\n');
                setDraft({ ...draft, cancellation: a, refunds: rest.join('\n\n') });
              }}
              rows={3}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
            />
          </Group>

          <div className="rounded-lg border border-aws-orange/30 bg-aws-orange/10 p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-[11px] font-bold text-aws-orange">
              Signature fields appear in the exported PDF.
            </div>
            <button
              onClick={() => setDraft({ ...draft, signatures: { ...draft.signatures, author: { ...draft.signatures.author, signedAt: new Date().toISOString(), date: new Date().toLocaleDateString() } } })}
              className="btn btn-ghost !text-xs"
            ><Edit3 size={11} /> Sign as author</button>
          </div>
        </div>
      )}

      {/* CONTRACT-01: agent review of the live contract markdown */}
      {draft && (
        <ContractReviewPanel
          contractText={contractToMarkdown(draft)}
          clientName={draft?.parties?.client?.name || ''}
          currency={draft?.investment?.currency || 'USD'}
        />
      )}
    </div>
  );
}

function PartyEditor({ who, obj, onChange, presetClients, onPick }) {
  return (
    <div className="rounded-lg border border-token p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">{who}</div>
        {presetClients && (
          <select
            onChange={(e) => {
              const c = presetClients.find((x) => x.id === e.target.value);
              if (c) onPick?.(c);
            }}
            className="bg-[var(--card-2)] border border-token rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            defaultValue=""
          >
            <option value="">— from CRM —</option>
            {presetClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="Name"    value={obj.name}    onChange={(e) => onChange({ name: e.target.value })} />
        <Field label="Company" value={obj.company} onChange={(e) => onChange({ company: e.target.value })} />
        <Field label="Email"   value={obj.email}   onChange={(e) => onChange({ email: e.target.value })} />
        <Field label="Address" value={obj.address} onChange={(e) => onChange({ address: e.target.value })} />
      </div>
    </div>
  );
}

function ScheduleEditor({ schedule, onChange, currency }) {
  const update = (idx, patch) => onChange(schedule.map((s, i) => i === idx ? { ...s, ...patch } : s));
  return (
    <div className="space-y-1">
      {schedule.map((s, i) => (
        <div key={i} className="grid grid-cols-[1fr_120px_140px_28px] gap-1.5 items-center">
          <input
            value={s.label}
            onChange={(e) => update(i, { label: e.target.value })}
            className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs"
          />
          <input
            type="number"
            value={s.amount}
            onChange={(e) => update(i, { amount: +e.target.value })}
            className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs tabular-nums"
          />
          <input
            type="date"
            value={(s.dueAt || '').slice(0, 10)}
            onChange={(e) => update(i, { dueAt: new Date(e.target.value).toISOString() })}
            className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs"
          />
          <button
            onClick={() => onChange(schedule.filter((_, j) => j !== i))}
            className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger"
          ><X size={10} /></button>
        </div>
      ))}
      <button
        onClick={() => onChange([...schedule, { label: 'New milestone', amount: 0, dueAt: new Date().toISOString() }])}
        className="text-[10px] font-bold text-aws-orange hover:underline mt-1"
      >+ add milestone</button>
    </div>
  );
}

// =================================================================
// INVOICES (uses FreelanceContext)
// =================================================================

function InvoicesTab() {
  const toast = useToast();
  const dialog = useDialog();
  const { state: fre, addInvoice, updateInvoice, deleteInvoice, addPayment } = useFreelance();
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const i = fre.invoices.find((x) => x.id === activeId) || fre.invoices[0] || null;
    setDraft(i ? { ...i } : null);
    if (i && activeId !== i.id) setActiveId(i.id);
  }, [activeId, fre.invoices]);

  const startNew = () => {
    const inv = buildInvoice({
      client: { name: '' },
      project: { title: '' },
      currency: 'USD',
    });
    addInvoice(inv);
    toast.success('New invoice drafted');
  };

  const save = () => {
    if (!draft) return;
    updateInvoice(draft.id, draft);
    toast.success('Invoice saved');
  };

  const markPaid = () => {
    if (!draft) return;
    const { total } = invoiceTotals(draft);
    updateInvoice(draft.id, { status: 'paid', paidAt: new Date().toISOString() });
    addPayment({
      clientName: draft.clientName,
      projectTitle: '',
      amount: total,
      currency: draft.currency || 'USD',
      method: 'invoice',
      invoiceId: draft.id,
    });
    toast.success('Marked paid + earnings updated');
  };

  const sendReminder = () => {
    if (!draft?.clientEmail) { toast.error('Missing client email.'); return; }
    const subject = `Reminder: ${draft.number} due ${new Date(draft.dueAt).toLocaleDateString()}`;
    const body = `Hi,\n\nFriendly reminder that invoice ${draft.number} for ${draft.currency} ${invoiceTotals(draft).total.toFixed(2)} is due on ${new Date(draft.dueAt).toLocaleDateString()}.\n\nThanks!`;
    window.open(`mailto:${draft.clientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const exportPdf = () => {
    if (!draft) return;
    const { total } = invoiceTotals(draft);
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    openPrintable({
      documentType: 'Invoice',
      title: draft.number,
      subtitle: draft.clientName || '',
      markdown: invoiceToMarkdown(draft),
      meta: [
        { label: 'Bill to',  value: [draft.clientName, draft.clientEmail].filter(Boolean).join(' · ') },
        { label: 'Issued',   value: fmt(draft.issuedAt) },
        { label: 'Due',      value: fmt(draft.dueAt) },
        { label: 'Status',   value: draft.status },
        { label: 'Total',    value: `${draft.currency} ${total.toFixed(2)}` },
      ],
      authorName: '',
      authorCompany: '',
    });
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
      <div className="surface rounded-2xl p-3 space-y-2">
        <button onClick={startNew} className="btn btn-primary w-full !text-xs">
          <Plus size={11} /> New invoice
        </button>
        {fre.invoices.length === 0 ? (
          <p className="text-[11px] text-muted">No invoices yet.</p>
        ) : (
          <ul className="space-y-1 max-h-[440px] overflow-y-auto pr-1">
            {fre.invoices.map((i) => (
              <li key={i.id} className="group flex items-center gap-1">
                <button
                  onClick={() => setActiveId(i.id)}
                  className={cn(
                    'flex-1 text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition',
                    i.id === activeId && 'bg-aws-orange/10 text-aws-orange font-bold',
                  )}
                >
                  <div className="font-bold truncate">{i.number}</div>
                  <div className="text-[10px] text-muted truncate">{i.clientName || '—'} · {i.status}</div>
                </button>
                <button
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: `Delete ${i.number}?`,
                      description: i.clientName || 'Draft invoice',
                      danger: true,
                    });
                    if (ok) { deleteInvoice(i.id); setActiveId(null); }
                  }}
                  className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                  aria-label={`Delete invoice ${i.number}`}
                ><Trash2 size={11} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!draft ? (
        <div className="surface rounded-2xl p-10 text-center text-muted">
          <Receipt size={28} className="mx-auto mb-2 text-aws-orange/60" />
          Pick an invoice or click "New invoice".
        </div>
      ) : (
        <InvoiceEditor
          draft={draft} setDraft={setDraft}
          onSave={save} onPaid={markPaid} onReminder={sendReminder} onExport={exportPdf}
        />
      )}
    </div>
  );
}

function InvoiceEditor({ draft, setDraft, onSave, onPaid, onReminder, onExport }) {
  const totals = invoiceTotals(draft);
  const setLine = (idx, patch) => {
    const items = draft.lineItems.map((l, i) => i === idx ? { ...l, ...patch } : l);
    // auto-compute amount = qty × unit if not custom
    if ('qty' in patch || 'unit' in patch) {
      items[idx].amount = (+items[idx].qty || 0) * (+items[idx].unit || 0);
    }
    setDraft({ ...draft, lineItems: items });
  };
  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-base font-extrabold">{draft.number}</div>
          <div className="text-[10px] text-muted">Issued {new Date(draft.issuedAt).toLocaleDateString()}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold"
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <button onClick={onSave}     className="btn btn-primary !text-xs"><Save size={11} /> Save</button>
          <button onClick={onExport}   className="btn btn-ghost !text-xs"><Download size={11} /> PDF</button>
          <button onClick={onPaid}     className="btn btn-ghost !text-xs"><Receipt size={11} /> Mark paid</button>
          <button onClick={onReminder} className="btn btn-ghost !text-xs"><Send size={11} /> Reminder</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <Field label="Bill to (name)"  value={draft.clientName}  onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} />
        <Field label="Bill to (email)" value={draft.clientEmail} onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })} />
        <Field label="Currency" value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} />
        <Field label="Due date" type="date"
          value={(draft.dueAt || '').slice(0, 10)}
          onChange={(e) => setDraft({ ...draft, dueAt: new Date(e.target.value).toISOString() })} />
      </div>

      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">Line items</div>
        <div className="space-y-1">
          {draft.lineItems.map((li, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_100px_100px_28px] gap-1.5 items-center">
              <input value={li.desc} onChange={(e) => setLine(i, { desc: e.target.value })}
                className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs" placeholder="Description" />
              <input type="number" value={li.qty || 1} onChange={(e) => setLine(i, { qty: +e.target.value })}
                className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs tabular-nums" placeholder="Qty" />
              <input type="number" value={li.unit || 0} onChange={(e) => setLine(i, { unit: +e.target.value })}
                className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs tabular-nums" placeholder="Unit" />
              <input type="number" value={li.amount || 0} onChange={(e) => setLine(i, { amount: +e.target.value })}
                className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs tabular-nums" placeholder="Amount" />
              <button
                onClick={() => setDraft({ ...draft, lineItems: draft.lineItems.filter((_, j) => j !== i) })}
                className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger"
              ><X size={10} /></button>
            </div>
          ))}
          <button
            onClick={() => setDraft({ ...draft, lineItems: [...draft.lineItems, { desc: '', qty: 1, unit: 0, amount: 0 }] })}
            className="text-[10px] font-bold text-aws-orange hover:underline mt-1"
          >+ add line</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        <Field label="Tax %" type="number"
          value={draft.taxPct || 0} onChange={(e) => setDraft({ ...draft, taxPct: +e.target.value })} />
        <div className="rounded-lg border border-token p-2 text-xs space-y-0.5">
          <Row label="Subtotal" v={totals.subtotal} c={draft.currency} />
          <Row label={`Tax (${draft.taxPct || 0}%)`} v={totals.tax} c={draft.currency} />
          <Row label="Total" v={totals.total} c={draft.currency} bold />
        </div>
      </div>

      <Group label="Payment methods">
        <div className="grid sm:grid-cols-3 gap-2">
          <Field label="Wise"     value={draft.payment?.wise     || ''} onChange={(e) => setDraft({ ...draft, payment: { ...(draft.payment || {}), wise: e.target.value } })} />
          <Field label="Payoneer" value={draft.payment?.payoneer || ''} onChange={(e) => setDraft({ ...draft, payment: { ...(draft.payment || {}), payoneer: e.target.value } })} />
          <Field label="Bank"     value={draft.payment?.bank     || ''} onChange={(e) => setDraft({ ...draft, payment: { ...(draft.payment || {}), bank: e.target.value } })} />
        </div>
      </Group>

      <Group label="Notes">
        <textarea
          value={draft.notes || ''}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          rows={3}
          className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
        />
      </Group>

      {/* INVOICE-01: agent review of the live invoice draft */}
      {draft && (
        <InvoiceReviewPanel
          invoice={draft}
          supplierCountry="GB"
        />
      )}
    </div>
  );
}

function Row({ label, v, c, bold }) {
  return (
    <div className={cn('flex items-center justify-between', bold && 'font-extrabold border-t border-token pt-1 mt-1')}>
      <span>{label}</span>
      <span className="tabular-nums">{c} {(+v || 0).toFixed(2)}</span>
    </div>
  );
}

// =================================================================
// DELIVERY PACKAGES
// =================================================================

function DeliveriesTab() {
  const toast = useToast();
  const dialog = useDialog();
  const { profile } = useApp();
  const { state: ai } = useAI();
  const { state: fre } = useFreelance();
  const { state: port } = usePortfolio();
  const { state: earn, saveDelivery, deleteDelivery } = useEarn();

  const [activeId, setActiveId] = useState(null);
  const [draftProject, setDraftProject] = useState({ title: '' });
  const [draftClient, setDraftClient] = useState({ name: '', company: '' });

  const active = earn.deliveries.find((d) => d.id === activeId) || earn.deliveries[0] || null;

  const lastDiagram = useMemo(() => {
    if (!ai?.diagrams?.length) return null;
    const d = ai.diagrams[ai.diagrams.length - 1];
    return { name: d.name, nodes: d.nodes, edges: d.edges };
  }, [ai]);

  const completedProjects = useMemo(() =>
    (Object.entries(port?.projects || {}) || [])
      .filter(([, s]) => s?.status === 'complete')
      .map(([id]) => id), [port]);

  const generate = () => {
    const pkg = buildDeliveryPackage({
      project: draftProject,
      client: draftClient,
      diagram: lastDiagram,
      brief: { authorEmail: profile.integrations?.upwork || '' },
    });
    saveDelivery(pkg);
    setActiveId(pkg.id);
    toast.success('Delivery package generated');
  };

  const exportZip = () => {
    if (!active) return;
    const blob = buildZipBlob(active);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${active.root}.zip`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast.success('ZIP downloaded');
  };

  const emailToClient = () => {
    if (!active) return;
    const subject = `Handover — ${active.projectTitle}`;
    const body = `Hi ${active.clientName || ''},\n\nDelivery package attached. Highlights:\n\n${active.files.slice(0, 6).map((f) => `• ${f.label}`).join('\n')}\n\nFull manifest in README.md inside the zip.\n\nBest,`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        <div className="surface rounded-2xl p-3 space-y-2">
          <h3 className="text-sm font-extrabold flex items-center gap-2">
            <Plus size={14} className="text-aws-orange" /> Generate new package
          </h3>
          <Field label="Project title" value={draftProject.title}
            onChange={(e) => setDraftProject({ ...draftProject, title: e.target.value })} />
          <Field label="Client name"   value={draftClient.name}
            onChange={(e) => setDraftClient({ ...draftClient, name: e.target.value })} />
          <Field label="Client company" value={draftClient.company}
            onChange={(e) => setDraftClient({ ...draftClient, company: e.target.value })} />
          {fre.clients.length > 0 && (
            <select
              onChange={(e) => {
                const c = fre.clients.find((x) => x.id === e.target.value);
                if (c) setDraftClient({ name: c.name, company: c.company });
              }}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs"
              defaultValue=""
            >
              <option value="">— or pick from CRM —</option>
              {fre.clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
            </select>
          )}
          <button
            onClick={generate}
            disabled={!draftProject.title || !draftClient.name}
            className={cn('btn btn-primary w-full !text-xs', (!draftProject.title || !draftClient.name) && 'opacity-50 cursor-not-allowed')}
          ><Package size={11} /> Generate package</button>
          {completedProjects.length > 0 && (
            <div className="text-[10px] text-muted">
              You have {completedProjects.length} completed project{completedProjects.length === 1 ? '' : 's'} — generate one per delivered engagement.
            </div>
          )}
        </div>

        <div className="surface rounded-2xl p-3">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
            Saved packages ({earn.deliveries.length})
          </h3>
          {earn.deliveries.length === 0 ? (
            <p className="text-[11px] text-muted">Your delivery packages appear here.</p>
          ) : (
            <ul className="space-y-1">
              {earn.deliveries.map((d) => (
                <li key={d.id} className="group flex items-center gap-1">
                  <button
                    onClick={() => setActiveId(d.id)}
                    className={cn(
                      'flex-1 text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition',
                      d.id === active?.id && 'bg-aws-orange/10 text-aws-orange font-bold',
                    )}
                  >
                    <div className="font-bold truncate">{d.name}</div>
                    <div className="text-[10px] text-muted">{new Date(d.createdAt).toLocaleDateString()}</div>
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await dialog.confirm({
                        title: 'Delete delivery package?',
                        description: d.name,
                        danger: true,
                      });
                      if (ok) deleteDelivery(d.id);
                    }}
                    className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                    aria-label={`Delete package ${d.name}`}
                  ><Trash2 size={11} /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {!active ? (
        <div className="surface rounded-2xl p-10 text-center text-muted">
          <Package size={28} className="mx-auto mb-2 text-aws-orange/60" />
          Fill the form on the left and click "Generate package".
        </div>
      ) : (
        <div className="surface rounded-2xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-base font-extrabold">{active.name}</div>
              <div className="text-[10px] text-muted">{active.files.length} files · root <code className="font-mono text-aws-orange">{active.root}</code></div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={exportZip}     className="btn btn-primary !text-xs"><Download size={11} /> Download ZIP</button>
              <button onClick={emailToClient} className="btn btn-ghost !text-xs"><Mail size={11} /> Email client</button>
            </div>
          </div>

          <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3 font-mono text-[11px] leading-relaxed">
            <div className="text-aws-orange">📁 {active.root}</div>
            {active.files.map((f) => (
              <div key={f.path} className="pl-4">
                {iconForKind(f.kind)} <span className="text-muted">{f.path.replace(active.root + '/', '')}</span>
                <span className="text-[10px] text-muted/70 ml-2">— {f.label}</span>
              </div>
            ))}
          </div>

          <Group label="Package summary (README.md preview)">
            <pre className="rounded-lg bg-[var(--card-2)]/40 border border-token p-3 text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap">{active.summary}</pre>
          </Group>

          {/* DOC-01: Handover completeness review on the package summary */}
          <DocReviewPanel docText={active.summary || ''} docType="handover" />
        </div>
      )}
    </div>
  );
}

function iconForKind(k) {
  return k === 'image' ? '🖼' : k === 'pdf' ? '📄' : k === 'code' ? '⚙️' : '📝';
}

// =================================================================
// LIBRARY — combined search across everything
// =================================================================

function LibraryTab() {
  const { state: earn } = useEarn();
  const { state: fre } = useFreelance();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const all = useMemo(() => {
    const cs = earn.contracts.map((c) => ({
      id: 'c-' + c.id, kind: 'Contract',  title: c.title,
      meta: `${c.number} · ${c.parties?.client?.name || '—'}`, at: c.createdAt, raw: c,
    }));
    const is = fre.invoices.map((i) => ({
      id: 'i-' + i.id, kind: 'Invoice',   title: i.number,
      meta: `${i.clientName || '—'} · ${i.status}`, at: i.issuedAt, raw: i,
    }));
    const ds = earn.deliveries.map((d) => ({
      id: 'd-' + d.id, kind: 'Delivery',  title: d.name,
      meta: `${d.files.length} files`, at: d.createdAt, raw: d,
    }));
    const ps = (earn.decks || []).map((p) => ({
      id: 'p-' + p.id, kind: 'Proposal',  title: p.name,
      meta: `${p.slides?.length || 0} slides`, at: p.createdAt, raw: p,
    }));
    return [...cs, ...is, ...ds, ...ps].sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [earn, fre]);

  const filtered = all.filter((x) => {
    if (filter !== 'All' && x.kind !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (x.title + ' ' + x.meta).toLowerCase().includes(q);
  });

  return (
    <div className="space-y-3">
      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--card-2)] rounded-md px-2 py-1.5 flex-1 min-w-[200px]">
          <Search size={12} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="bg-transparent text-xs flex-1 focus:outline-none"
          />
        </div>
        {['All', 'Proposal', 'Contract', 'Invoice', 'Delivery'].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={cn(
              'rounded-md px-2 py-1 text-[10px] font-bold border',
              filter === c
                ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40'
                : 'border-token text-muted hover:text-current',
            )}
          >{c}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center text-muted">
          <Archive size={28} className="mx-auto mb-2 text-aws-orange/60" />
          Nothing here yet. Create a contract, invoice, delivery package, or generate a presentation.
        </div>
      ) : (
        <div className="surface rounded-2xl overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Kind</th>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id} className="border-t border-token hover:bg-[var(--card-2)]/30 transition">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(x.at).toLocaleDateString()}</td>
                  <td className="px-3 py-2"><span className="chip border border-aws-orange/40 text-aws-orange font-bold text-[10px]">{x.kind}</span></td>
                  <td className="px-3 py-2 font-bold">{x.title}</td>
                  <td className="px-3 py-2 text-muted">{x.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =================================================================
// SHARED FORM BITS
// =================================================================

function Group({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value = '', onChange, placeholder, type = 'text' }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-muted">{label}</span>
      <input
        type={type}
        value={value ?? ''}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
      />
    </label>
  );
}

function ListEditor({ items, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-1">
          <input
            value={it}
            onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))}
            className="flex-1 bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs"
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger"
          ><X size={10} /></button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, placeholder?.replace('…', '') || 'New item'])}
        className="text-[10px] font-bold text-aws-orange hover:underline mt-1"
      >+ add</button>
    </div>
  );
}

// =================================================================
// Helpers
// =================================================================

/**
 * Minimal in-browser ZIP STORE builder (no compression) — enough to deliver
 * a real .zip with all the manifest files. Each file is included as either
 * the README/summary content or a small placeholder explaining what to drop
 * in. This keeps everything offline and dependency-free.
 */
function buildZipBlob(pkg) {
  const files = pkg.files.map((f) => {
    if (f.path.endsWith('README.md')) return { name: f.path, content: pkg.summary };
    if (f.kind === 'code')   return { name: f.path, content: `# Placeholder — replace with your real ${f.label}.\n# Generated for ${pkg.name}\n` };
    if (f.kind === 'md')     return { name: f.path, content: `# ${f.label}\n\nReplace this file with the real deliverable when ready.\n` };
    if (f.kind === 'pdf')    return { name: f.path, content: 'Placeholder — drop the real PDF here when exporting.' };
    if (f.kind === 'image')  return { name: f.path, content: 'Placeholder — drop the real PNG here when exporting.' };
    return { name: f.path, content: '' };
  });
  return zipStore(files);
}

// --- tiny ZIP-STORE writer (no deps) -------------------------------
function zipStore(entries) {
  const encoder = new TextEncoder();
  const fileRecords = [];
  const centralRecords = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = encoder.encode(e.name);
    const dataBytes = encoder.encode(e.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);           // version
    lv.setUint16(6, 0, true);            // flags
    lv.setUint16(8, 0, true);            // method = stored
    lv.setUint16(10, 0, true);           // mod time
    lv.setUint16(12, 0, true);           // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);        // compressed size
    lv.setUint32(22, size, true);        // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);           // extra length
    lh.set(nameBytes, 30);

    const localStart = offset;
    fileRecords.push(lh, dataBytes);
    offset += lh.length + size;

    // Central directory header
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, localStart, true);
    ch.set(nameBytes, 46);
    centralRecords.push(ch);
  }

  const centralStart = offset;
  let centralLength = 0;
  for (const c of centralRecords) centralLength += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralLength, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);

  return new Blob([...fileRecords, ...centralRecords, eocd], { type: 'application/zip' });
}

function crc32(buf) {
  let c;
  if (!crc32.table) {
    crc32.table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crc32.table[n] = c >>> 0;
    }
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crc32.table[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
