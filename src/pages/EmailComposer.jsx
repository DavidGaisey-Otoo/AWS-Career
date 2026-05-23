import { motion } from 'framer-motion';
import {
  AlertCircle, BookOpen, Check, ChevronLeft, ChevronRight, ClipboardCopy,
  Edit3, Filter, Inbox, Library, Loader2, Mail, MailPlus, RefreshCw, Search,
  Send, Sparkles, Star, Trash2, X, Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useAWS } from '../context/AWSContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  EMAIL_TYPES, generateEmail, gmailComposeUrl, mailtoUrl, outlookComposeUrl,
} from '../data/emailTemplates.js';
import { cn } from '../lib/utils.js';

const TABS = [
  { id: 'composer', label: 'Composer', icon: MailPlus },
  { id: 'tracker',  label: 'Tracker',  icon: Inbox },
  { id: 'library',  label: 'Library',  icon: Library },
];

export default function EmailComposer() {
  const [tab, setTab] = useState('composer');

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Email System"
        title="Compose, track, reuse — never blank-page again."
        subtitle="10 email types covering the full freelance lifecycle. Templates auto-fill from CRM, you edit, copy or open straight in Gmail / Outlook. Tracker monitors follow-ups."
        icon={Mail}
      />

      <div className="surface rounded-2xl p-1.5 flex items-center gap-1 w-fit">
        {TABS.map((t) => {
          const I = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold transition',
                tab === t.id
                  ? 'bg-aws-orange/15 text-aws-orange'
                  : 'text-muted hover:text-current hover:bg-[var(--card-2)]',
              )}
            >
              <I size={12} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'composer' && <ComposerTab />}
      {tab === 'tracker'  && <TrackerTab />}
      {tab === 'library'  && <LibraryTab />}
    </div>
  );
}

// =================================================================
// COMPOSER tab
// =================================================================

function ComposerTab() {
  const toast = useToast();
  const { profile } = useApp();
  const { activeProfile: awsProfile } = useAWS();
  const { state: fre } = useFreelance();
  const { addEmail, state: earn } = useEarn();

  const [typeId, setTypeId] = useState('reply-inquiry');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [generated, setGenerated] = useState({ subject: '', body: '' });
  const [generating, setGenerating] = useState(false);

  const client = fre.clients.find((c) => c.id === clientId);

  // Build context for the engine
  const ctx = useMemo(() => {
    const split = (client?.name || '').split(' ');
    return {
      authorName:        profile.name || 'Your Name',
      authorTitle:       'AWS Certified Cloud Engineer',
      authorEmail:       profile.integrations?.upwork || '',
      clientName:        client?.name || '',
      clientFirstName:   split[0] || '',
      clientCompany:     client?.company || '',
      projectTitle:      projectId || 'AWS engagement',
      timeline:          '21 days from kickoff',
      budget:            fre.invoices?.[0]?.lineItems?.[0]?.amount || 3000,
      currency:          'USD',
      invoiceNumber:     fre.invoices?.[0]?.number || 'INV-0001',
      amount:            fre.invoices?.[0]?.lineItems?.reduce((s, li) => s + (li.amount || 0), 0) || 0,
      dueDate:           fre.invoices?.[0]?.dueAt ? new Date(fre.invoices[0].dueAt).toDateString() : '',
      wise:              'Wise — multi-currency account',
      payoneer:          'Payoneer — USD account',
      notes,
    };
  }, [client, profile, projectId, notes, fre.invoices]);

  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const out = generateEmail(typeId, ctx);
      setGenerated(out);
      setGenerating(false);
      toast.success('Email drafted');
    }, 280);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${generated.subject}\n\n${generated.body}`);
      toast.success('Copied to clipboard');
    } catch { toast.error('Copy failed'); }
  };

  const save = () => {
    if (!generated.body) { toast.error('Generate first.'); return; }
    addEmail({
      to: client?.email || '',
      subject: generated.subject,
      body: generated.body,
      type: typeId,
      clientId: clientId || null,
      projectName: projectId || '',
      status: 'draft',
    });
    toast.success('Saved to tracker as draft');
  };

  const send = () => {
    if (!generated.body) { toast.error('Generate first.'); return; }
    addEmail({
      to: client?.email || '',
      subject: generated.subject,
      body: generated.body,
      type: typeId,
      clientId: clientId || null,
      projectName: projectId || '',
      status: 'sent',
      sentAt: new Date().toISOString(),
      followUpAt: addDaysIso(new Date(), 5),
    });
    toast.success('Logged as sent · follow-up reminder set for +5 days');
  };

  const links = {
    mailto:  mailtoUrl(  { to: client?.email, subject: generated.subject, body: generated.body }),
    gmail:   gmailComposeUrl({
      to: client?.email,
      subject: generated.subject,
      body: generated.body,
      userIndex: awsProfile?.gmailUserIndex ?? 0,
      authAddress: awsProfile?.gmailAddress || '',
    }),
    outlook: outlookComposeUrl({ to: client?.email, subject: generated.subject, body: generated.body }),
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
      {/* LEFT — Step form */}
      <div className="space-y-3">
        <div className="surface rounded-2xl p-4 space-y-3">
          <Step number={1} title="Select email type">
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold focus-ring focus:border-aws-orange"
            >
              {EMAIL_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </Step>

          <Step number={2} title="Fill context">
            <label className="block text-[10px] font-bold text-muted">Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
            >
              <option value="">— pick from CRM —</option>
              {fre.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
              ))}
            </select>
            {fre.clients.length === 0 && (
              <div className="text-[10px] text-muted">No clients yet — <Link to="/freelance" className="text-aws-orange font-bold hover:underline">add one in the CRM</Link>.</div>
            )}

            <label className="block text-[10px] font-bold text-muted mt-2">Project name</label>
            <input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="e.g. Landing Zone migration"
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
            />

            <label className="block text-[10px] font-bold text-muted mt-2">Specific notes to include</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything custom (links, specific blockers, etc.)"
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
            />
          </Step>

          <Step number={3} title="Generate">
            <button
              onClick={generate}
              disabled={generating}
              className="btn btn-primary w-full !text-xs"
            >
              {generating ? <><Loader2 size={12} className="animate-spin" /> Drafting…</> : <><Sparkles size={12} /> Draft email</>}
            </button>
          </Step>
        </div>

        <div className="surface rounded-2xl p-4">
          <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            Email → proposal workflow
          </h3>
          <p className="text-[11px] text-muted leading-relaxed">
            Client emailed you a job? Paste it into the <Link to="/job-analyzer" className="text-aws-orange font-bold hover:underline">Job Analyzer</Link>, then come back here to draft the reply. Full pipeline in under 2 minutes.
          </p>
        </div>
      </div>

      {/* RIGHT — Generated email */}
      <div className="space-y-3">
        {!generated.body ? (
          <div className="surface rounded-2xl p-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
              <Wand2 size={22} strokeWidth={2.5} />
            </div>
            <h3 className="text-base font-extrabold">Pick a type, fill the form, hit Draft.</h3>
            <p className="text-[12px] text-muted max-w-md mx-auto">
              The generated email lands here — edit any line, copy it, or open in Gmail / Outlook.
            </p>
          </div>
        ) : (
          <>
            <div className="surface rounded-2xl p-4 space-y-3">
              <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted">From</div>
              <div className="text-sm font-bold">{profile.name || 'Your Name'} {profile.integrations?.upwork && <span className="text-muted">&lt;{profile.integrations.upwork}&gt;</span>}</div>

              <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted">To</div>
              <input
                value={client?.email || ''}
                onChange={() => {}}
                placeholder="client@example.com"
                className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
                disabled
              />

              <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Subject</div>
              <input
                value={generated.subject}
                onChange={(e) => setGenerated((g) => ({ ...g, subject: e.target.value }))}
                className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold focus-ring focus:border-aws-orange"
              />

              <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Body</div>
              <textarea
                value={generated.body}
                onChange={(e) => setGenerated((g) => ({ ...g, body: e.target.value }))}
                rows={18}
                className="w-full bg-[var(--card-2)] border border-token rounded-md px-3 py-2 text-xs font-mono leading-relaxed focus-ring focus:border-aws-orange resize-y"
              />
            </div>

            <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
              <button onClick={copy} className="btn btn-ghost !text-xs"><ClipboardCopy size={12} /> Copy email</button>
              <a href={links.gmail}   target="_blank" rel="noreferrer" className="btn btn-ghost !text-xs"><Mail size={12} /> Open in Gmail</a>
              <a href={links.outlook} target="_blank" rel="noreferrer" className="btn btn-ghost !text-xs"><Mail size={12} /> Open in Outlook</a>
              <a href={links.mailto} className="btn btn-ghost !text-xs"><Mail size={12} /> mailto:</a>
              <div className="ml-auto flex items-center gap-1.5">
                <button onClick={save} className="btn btn-ghost !text-xs"><Edit3 size={12} /> Save draft</button>
                <button onClick={send} className="btn btn-primary !text-xs"><Send size={12} /> Mark sent</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ number, title, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="grid place-items-center w-5 h-5 rounded-md bg-aws-orange text-ink-950 text-[10px] font-black">{number}</span>
        <span className="text-xs font-extrabold">{title}</span>
      </div>
      <div className="pl-1 space-y-1.5">{children}</div>
    </div>
  );
}

// =================================================================
// TRACKER tab
// =================================================================

function TrackerTab() {
  const dialog = useDialog();
  const { state, updateEmail, deleteEmail } = useEarn();
  const { state: fre } = useFreelance();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const clientById = (id) => fre.clients.find((c) => c.id === id);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.emails
      .filter((e) => {
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (typeFilter   !== 'all' && e.type   !== typeFilter)   return false;
        if (!q) return true;
        return (
          (e.subject || '').toLowerCase().includes(q) ||
          (e.to      || '').toLowerCase().includes(q) ||
          (e.body    || '').toLowerCase().includes(q) ||
          (clientById(e.clientId)?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.emails, search, statusFilter, typeFilter, fre.clients]);

  const overdueFollowups = state.emails.filter(
    (e) => e.followUpAt && new Date(e.followUpAt) < new Date() && !e.replied
  );

  const responseRate = useMemo(() => {
    const sent = state.emails.filter((e) => e.status === 'sent').length;
    if (!sent) return 0;
    const replied = state.emails.filter((e) => e.replied).length;
    return Math.round((replied / sent) * 100);
  }, [state.emails]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="All emails"           value={state.emails.length} />
        <Kpi label="Sent"                  value={state.emails.filter((e) => e.status === 'sent').length} />
        <Kpi label="Response rate"         value={`${responseRate}%`} />
        <Kpi label="Overdue follow-ups"    value={overdueFollowups.length} tone={overdueFollowups.length ? 'warning' : 'default'} />
      </div>

      <div className="surface rounded-2xl p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[var(--card-2)] rounded-md px-2 py-1.5 flex-1 min-w-[200px]">
          <Search size={12} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject, body, recipient, client…"
            className="bg-transparent text-xs flex-1 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold focus-ring"
        >
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold focus-ring"
        >
          <option value="all">All types</option>
          {EMAIL_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center text-muted text-sm">
          <Mail size={28} className="mx-auto mb-2 text-aws-orange/60" />
          No emails match. Draft something on the Composer tab.
        </div>
      ) : (
        <div className="surface rounded-2xl overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">To</th>
                <th className="text-left px-3 py-2">Subject</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Follow-up</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-token hover:bg-[var(--card-2)]/30 transition">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(e.at).toLocaleDateString()}</td>
                  <td className="px-3 py-2 truncate max-w-[180px]">{e.to || (clientById(e.clientId)?.email || '—')}</td>
                  <td className="px-3 py-2 truncate max-w-[260px] font-bold">{e.subject}</td>
                  <td className="px-3 py-2 text-muted">{EMAIL_TYPES.find((t) => t.id === e.type)?.label || e.type}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      'chip border font-bold text-[10px]',
                      e.status === 'sent'
                        ? 'border-success/40 bg-success/10 text-success'
                        : 'border-token text-muted',
                    )}>{e.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    {e.followUpAt ? (
                      <span className={cn(
                        'text-[10px] font-bold',
                        new Date(e.followUpAt) < new Date() && !e.replied ? 'text-warning' : 'text-muted',
                      )}>{new Date(e.followUpAt).toLocaleDateString()}</span>
                    ) : (
                      <button
                        onClick={() => updateEmail(e.id, { followUpAt: addDaysIso(new Date(), 3) })}
                        className="text-[10px] font-bold text-aws-orange hover:underline"
                      >+ add follow-up</button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {!e.replied && (
                      <button
                        onClick={() => updateEmail(e.id, { replied: true })}
                        className="text-[10px] font-bold text-success hover:underline mr-2"
                      ><Check size={10} className="inline" /> mark replied</button>
                    )}
                    <button
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Delete this email entry?',
                          description: e.subject,
                          danger: true,
                        });
                        if (ok) deleteEmail(e.id);
                      }}
                      className="text-[10px] font-bold text-muted hover:text-danger"
                      aria-label="Delete email entry"
                    ><Trash2 size={10} className="inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, tone = 'default' }) {
  return (
    <div className={cn(
      'surface rounded-2xl p-3',
      tone === 'warning' && 'border-warning/40',
    )}>
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className={cn('text-2xl font-black tabular-nums', tone === 'warning' && 'text-warning')}>{value}</div>
    </div>
  );
}

// =================================================================
// LIBRARY tab
// =================================================================

function LibraryTab() {
  const toast = useToast();
  const dialog = useDialog();
  const { state, saveTemplate, deleteTemplate, toggleStar } = useEarn();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState(null);

  const categories = ['All', 'Starred', ...Array.from(new Set(state.templates.map((t) => t.category))).filter(Boolean)];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.templates
      .filter((t) => {
        if (filter === 'Starred' && !t.starred) return false;
        if (filter !== 'All' && filter !== 'Starred' && t.category !== filter) return false;
        if (!q) return true;
        return (t.name + ' ' + t.subject + ' ' + t.body).toLowerCase().includes(q);
      })
      .sort((a, b) => Number(b.starred) - Number(a.starred));
  }, [state.templates, filter, search]);

  const active = filtered.find((t) => t.id === activeId) || filtered[0] || null;

  useEffect(() => {
    setDraft(active ? { ...active } : null);
  }, [active?.id]);

  const startNew = () => {
    const fresh = {
      id: 'tpl-' + Date.now(),
      name: 'New template',
      type: 'custom',
      category: 'Custom',
      subject: '',
      body: '',
      starred: false,
      createdAt: new Date().toISOString(),
      builtIn: false,
    };
    saveTemplate(fresh);
    setActiveId(fresh.id);
    toast.success('Template created');
  };

  const save = () => {
    if (!draft) return;
    saveTemplate(draft);
    toast.success('Saved');
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
      <div className="surface rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Search size={12} className="text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="bg-transparent text-xs flex-1 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[10px] font-bold border',
                filter === c
                  ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40'
                  : 'border-token text-muted hover:text-current',
              )}
            >{c}</button>
          ))}
        </div>
        <button onClick={startNew} className="btn btn-ghost w-full !text-xs">
          <MailPlus size={12} /> New template
        </button>
        <div className="max-h-[440px] overflow-y-auto space-y-1 pr-1">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={cn(
                'w-full text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition',
                t.id === active?.id && 'bg-aws-orange/10 text-aws-orange font-bold',
              )}
            >
              <div className="flex items-center gap-1">
                {t.starred && <Star size={10} fill="currentColor" className="text-aws-orange" />}
                <span className="truncate flex-1">{t.name}</span>
              </div>
              <div className="text-[10px] text-muted truncate">{t.category}</div>
            </button>
          ))}
        </div>
      </div>

      {!draft ? (
        <div className="surface rounded-2xl p-10 text-center text-muted">
          <Library size={28} className="mx-auto mb-2 text-aws-orange/60" />
          Pick a template on the left or create a new one.
        </div>
      ) : (
        <div className="surface rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="bg-transparent text-base font-extrabold w-full focus-ring focus:outline-none"
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleStar(draft.id)}
                className={cn(
                  'grid place-items-center w-7 h-7 rounded-md border',
                  draft.starred ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40' : 'border-token text-muted',
                )}
                title="Star template"
              ><Star size={12} fill={draft.starred ? 'currentColor' : 'none'} /></button>
              <button onClick={save} className="btn btn-primary !text-xs"><Check size={11} /> Save</button>
              {!draft.builtIn && (
                <button
                  onClick={async () => {
                    const ok = await dialog.confirm({
                      title: 'Delete template?',
                      description: draft.name,
                      danger: true,
                    });
                    if (ok) { deleteTemplate(draft.id); setActiveId(null); }
                  }}
                  className="btn btn-ghost !text-xs text-danger"
                  aria-label="Delete template"
                ><Trash2 size={11} /></button>
              )}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Category</label>
            <input
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Subject</label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-bold focus-ring focus:border-aws-orange"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Body</label>
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={16}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-3 py-2 text-xs font-mono leading-relaxed focus-ring focus:border-aws-orange resize-y"
            />
          </div>
          <div className="text-[10px] text-muted">
            Tip: use placeholders like <code className="font-mono text-aws-orange">{`{clientFirstName}`}</code>,
            <code className="font-mono text-aws-orange">{` {projectTitle}`}</code>,
            <code className="font-mono text-aws-orange">{` {authorName}`}</code> — the composer fills them automatically when this template is referenced.
          </div>
        </div>
      )}
    </div>
  );
}

// =================================================================
// helpers
// =================================================================

function addDaysIso(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out.toISOString();
}
