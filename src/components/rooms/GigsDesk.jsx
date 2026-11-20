/**
 * GigsDesk.jsx — Jobs → Gig packs.
 *
 * Shows the gig packs David's Claude Code session writes into his private
 * "AWS Gigs" folder: the job, the fit score, proposal, answers, plan,
 * draw.io diagram, a read-aloud lesson, a meeting cheat sheet and the
 * Upwork chat messages — and lets him move the job along its stages.
 *
 * Hard limits, shown on screen as well as enforced here:
 *   - nothing is ever sent to Upwork or a client from this app; he copies
 *     and presses Submit/Send himself;
 *   - client text that breaks Upwork's off-platform rule or claims a
 *     certification he does not hold is flagged before copying;
 *   - only status.json is written back to the folder.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, BadgeCheck, Briefcase, CheckCircle2, ClipboardCopy, Coins, Download, ExternalLink,
  FileText, FolderOpen, GraduationCap, ListChecks, MessageSquare, Network, RefreshCw, ShieldAlert, Trophy,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { StatChip } from '../common/StatChip.jsx';
import { Markdown } from '../ai/Markdown.jsx';
import { DrawioEmbed } from '../architecture/flow/DrawioEmbed.jsx';
import { TeachPlayer } from './TeachPlayer.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  canUseFolderAccess, folderPermission, forgetFolder, pickFolder, readGigsFromFileList,
  readGigsFromHandle, rememberedFolder, saveStatus,
} from '../../lib/gigFolder.js';
import {
  GIG_STAGES, budgetLabel, checkClientText, newGuides, splitSections, sortGigs, summarizeGigs, updateStatus,
} from '../../lib/gigInbox.js';
import { validateDrawioXml } from '../../lib/drawioBridge.js';
import { cn } from '../../lib/utils.js';

const inputCls = 'w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm focus-ring focus:border-aws-orange';
const VERDICT = {
  apply: { label: 'Apply', cls: 'text-success' },
  maybe: { label: 'Maybe', cls: 'text-warning' },
  skip: { label: 'Skip', cls: 'text-danger' },
};
const SECTIONS = [
  { id: 'fit', label: 'Fit', icon: BadgeCheck },
  { id: 'proposal', label: 'Proposal', icon: FileText },
  { id: 'questions', label: 'Answers', icon: ListChecks },
  { id: 'plan', label: 'Plan', icon: Briefcase },
  { id: 'diagram', label: 'Diagram', icon: Network },
  { id: 'teach', label: 'Teach me', icon: GraduationCap },
  { id: 'cheatsheet', label: 'Cheat sheet', icon: FileText },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'status', label: 'Status', icon: Trophy },
];

// ─────────────────────────────────────────────────────────────────────
function CheckBanner({ check }) {
  if (!check) return null;
  if (check.ok && !check.verify.length) {
    return <p className="text-[11px] text-success inline-flex items-center gap-1"><CheckCircle2 size={12} /> Checked: no off-Upwork contact, no false certificate claims.</p>;
  }
  return (
    <div className="space-y-1">
      {check.blockers.map((b, i) => <p key={i} className="text-[11.5px] text-danger flex gap-1"><ShieldAlert size={13} className="shrink-0 mt-0.5" />{b}</p>)}
      {check.verify.map((v, i) => <p key={i} className="text-[11px] text-warning flex gap-1"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{v}</p>)}
      {!check.ok && <p className="text-[11px] text-muted">Ask Claude to fix it ("fix the proposal for &lt;job&gt;") rather than editing it on Upwork.</p>}
    </div>
  );
}

function CopyBlock({ text, label = 'Copy', where = 'paste it in Upwork' }) {
  const toast = useToast();
  const check = useMemo(() => checkClientText(text), [text]);
  const copy = async () => {
    if (!check.ok && !window.confirm('This text breaks a safety rule (shown in red). Copy it anyway?')) return;
    try { await navigator.clipboard.writeText(text); toast.success(`Copied. Now ${where}. You press Submit/Send.`); }
    catch { toast.error('Could not copy. Select the text and press Ctrl+C.'); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={ClipboardCopy} onClick={copy}>{label}</Button>
        <CheckBanner check={check} />
      </div>
    </div>
  );
}

function Doc({ text, empty, copy }) {
  if (!text) return <EmptyState tone="quiet" icon={FileText} title="Not in this pack" description={empty} />;
  return (
    <div className="space-y-3">
      {copy && <CopyBlock text={text} />}
      <div className="surface rounded-2xl p-4"><Markdown source={text} /></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
function FitPanel({ gig }) {
  const { job, fit } = gig;
  const v = VERDICT[fit.verdict];
  const c = job.client;
  const yesNo = (x) => (x === true ? 'yes' : x === false ? 'no' : 'unknown');
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatChip label="Fit score" value={fit.score ?? '?'} layout="stacked" />
        <StatChip label="Verdict" value={v ? v.label : 'Unknown'} tone={fit.verdict === 'apply' ? 'success' : fit.verdict === 'skip' ? 'danger' : 'warning'} layout="stacked" />
        <StatChip label="Connects to apply" value={job.connectsCost ?? '?'} layout="stacked" />
        <StatChip label="Suggested bid" value={fit.suggestedBid?.amount != null ? `$${fit.suggestedBid.amount}` : '?'} layout="stacked" />
      </div>
      <div className="surface rounded-2xl p-4 text-sm space-y-2">
        <p><strong>{budgetLabel(job)}</strong> · proposals {job.proposals ?? 'unknown'} · posted {job.posted ? job.posted.slice(0, 10) : 'unknown'}</p>
        <p className="text-muted text-[12.5px]">
          Client: {c.country || 'country unknown'} · payment verified {yesNo(c.paymentVerified)} · spent {c.spent != null ? `$${c.spent}` : 'unknown'} · hires {c.hires ?? 'unknown'} · rating {c.rating ?? 'unknown'}
        </p>
        {fit.reasons.length > 0 && <ul className="space-y-1">{fit.reasons.map((r, i) => <li key={i} className="flex gap-2 text-[12.5px]"><CheckCircle2 size={13} className="text-success shrink-0 mt-0.5" />{r}</li>)}</ul>}
        {fit.redFlags.length > 0 && <ul className="space-y-1">{fit.redFlags.map((r, i) => <li key={i} className="flex gap-2 text-[12.5px] text-danger"><ShieldAlert size={13} className="shrink-0 mt-0.5" />{r}</li>)}</ul>}
        {job.description && <details className="text-[12.5px]"><summary className="cursor-pointer font-bold">The job post</summary><p className="mt-2 whitespace-pre-wrap text-muted">{job.description}</p></details>}
        {gig.problems.length > 0 && <div className="pt-1">{gig.problems.map((p, i) => <p key={i} className="text-[11.5px] text-warning flex gap-1"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{p}</p>)}</div>}
      </div>
      <p className="text-[11.5px] text-muted">
        Applying costs Connects and needs your ID verified. Buy Connects only for an "Apply" job. The app never applies for you.
      </p>
    </div>
  );
}

function DiagramPanel({ gig }) {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const v = gig.diagramXml ? validateDrawioXml(gig.diagramXml) : null;
  const download = (xml, name = `${gig.id}.drawio`) => {
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if (!gig.diagramXml) return <EmptyState tone="quiet" icon={Network} title="No diagram in this pack" description={'Ask Claude to "do this gig" to add diagram.drawio.'} />;
  if (!v.valid) return <p className="text-sm text-danger">The diagram file was blocked: {v.reason}</p>;
  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <p className="text-sm">The architecture for this job, drawn with AWS icons. Open it to look, rearrange, or show the client in a meeting.</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" icon={Network} onClick={() => setOpen(true)}>Open in draw.io</Button>
        <Button size="sm" variant="ghost" icon={Download} onClick={() => download(v.xml)}>Download .drawio</Button>
      </div>
      <p className="text-[11px] text-muted">Opens diagrams.net inside the app. Changes you save there download as a new file; the original in your gigs folder is not changed.</p>
      <DrawioEmbed open={open} onClose={() => setOpen(false)} diagramName={gig.job.title} initialXml={v.xml}
        onSaveXml={(xml) => { download(xml, `${gig.id}-edited.drawio`); toast.success('Saved a copy to your Downloads.'); }} />
    </div>
  );
}

function MessagesPanel({ text }) {
  const sections = useMemo(() => splitSections(text), [text]);
  if (!text) return <EmptyState tone="quiet" icon={MessageSquare} title="No messages in this pack" description="Ask Claude to write them." />;
  return (
    <div className="space-y-3">
      <p className="text-[11.5px] text-warning flex gap-1"><ShieldAlert size={13} className="shrink-0 mt-0.5" />
        Paste these into Upwork chat only. No email, phone or WhatsApp before a contract: Upwork can close accounts for it.</p>
      {sections.map((s, i) => (
        <div key={i} className="surface rounded-2xl p-4 space-y-2">
          <h4 className="font-extrabold text-sm">{s.title}</h4>
          <CopyBlock text={s.body} where="paste it in Upwork chat" />
          <Markdown source={s.body} />
        </div>
      ))}
    </div>
  );
}

function StatusPanel({ gig, writable, onSave }) {
  const [stage, setStage] = useState(gig.status.stage);
  const [connects, setConnects] = useState(String(gig.status.connectsSpent ?? 0));
  const [amount, setAmount] = useState(gig.status.amount == null ? '' : String(gig.status.amount));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setStage(gig.status.stage); setConnects(String(gig.status.connectsSpent ?? 0));
    setAmount(gig.status.amount == null ? '' : String(gig.status.amount)); setNote('');
  }, [gig]);
  const save = async () => {
    setBusy(true);
    try { await onSave(updateStatus(gig.status, { stage, connectsSpent: connects, amount, note: note.trim() || undefined })); setNote(''); }
    finally { setBusy(false); }
  };
  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      {!writable && <p className="text-[11.5px] text-warning">Read-only: this folder was opened without write access. Use "Open my AWS Gigs folder" in Chrome or Edge, or tell Claude "I applied to …".</p>}
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="text-[11px] font-bold text-muted">Stage
          <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value)} disabled={!writable}>
            {GIG_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-[11px] font-bold text-muted">Connects spent
          <input className={inputCls} type="number" min="0" value={connects} onChange={(e) => setConnects(e.target.value)} disabled={!writable} />
        </label>
        <label className="text-[11px] font-bold text-muted">Amount paid (USD)
          <input className={inputCls} type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={!writable} />
        </label>
      </div>
      <label className="text-[11px] font-bold text-muted block">Add a note
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client asked for a call on Friday" disabled={!writable} />
      </label>
      <Button size="sm" onClick={save} disabled={!writable || busy}>{busy ? 'Saving…' : 'Save status'}</Button>
      {stage === 'won' && <p className="text-[11.5px] text-muted">Start work only when the contract is active on Upwork (fixed price: escrow funded). Then tell Claude "deliver".</p>}
      {gig.status.notes.length > 0 && <ul className="text-[12px] text-muted space-y-0.5 pt-1">{gig.status.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>}
    </div>
  );
}

/** Lesson markup → readable markdown (flows and spoken lines as text). */
function readable(text) {
  return String(text || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^~\s*(.+)$/gm, (_, flow) => `**Flow:** ${flow}`)
    .replace(/^>\s?(.*)$/gm, '$1');
}

function GuidesPanel({ guides }) {
  const [openName, setOpenName] = useState(null);
  const [mode, setMode] = useState('read');
  const fresh = useMemo(() => new Set(newGuides(guides).map((g) => g.name)), [guides]);
  if (!guides.length) return null;
  const guide = guides.find((g) => g.name === openName);
  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-aws-orange" />
        <h3 className="font-extrabold text-sm">Guides from Claude</h3>
        <span className="text-[11px] text-muted">{guides.length} to study{fresh.size ? ` · ${fresh.size} new this week` : ''}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {guides.map((g) => (
          <button key={g.name} onClick={() => { setOpenName(g.name === openName ? null : g.name); setMode('read'); }}
            className={cn('rounded-lg border border-token px-3 py-1.5 text-[12px] font-bold text-left', g.name === openName ? 'bg-aws-orange text-ink-950' : 'hover:bg-[var(--card-2)]')}>
            {g.title}{fresh.has(g.name) && g.name !== openName && <span className="ml-1.5 text-success">• new</span>}
          </button>
        ))}
      </div>
      {guide && (
        <div className="space-y-3 pt-1">
          {guide.slides.length > 0 && (
            <div className="flex gap-1">
              {['read', 'listen'].map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn('px-3 py-1 rounded-lg text-[12px] font-bold', mode === m ? 'bg-[var(--card-2)] text-current' : 'text-muted hover:text-current')}>
                  {m === 'read' ? 'Read' : 'Listen (slides)'}
                </button>
              ))}
            </div>
          )}
          {mode === 'listen' && guide.slides.length
            ? <TeachPlayer key={guide.name} lesson={guide.text} title={guide.title} />
            : <Markdown source={readable(guide.text)} />}
          {guide.added && <p className="text-[11px] text-muted">Written {guide.added}</p>}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
export function GigsDesk() {
  const toast = useToast();
  const [handle, setHandle] = useState(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const [writable, setWritable] = useState(false);
  const [data, setData] = useState(null); // { gigs, checks, skipped }
  const [selectedId, setSelectedId] = useState(null);
  const [section, setSection] = useState('fit');
  const [loading, setLoading] = useState(false);
  const fallbackRef = useRef(null);

  useEffect(() => {
    const el = fallbackRef.current;
    if (el) { el.setAttribute('webkitdirectory', ''); el.setAttribute('directory', ''); }
  }, []);

  const load = useCallback(async (h) => {
    setLoading(true);
    try {
      const result = await readGigsFromHandle(h);
      setData(result);
      setWritable(true);
      setSelectedId((cur) => cur && result.gigs.some((g) => g.id === cur) ? cur : sortGigs(result.gigs)[0]?.id || null);
    } catch (e) { toast.error(`Could not read the folder: ${e.message}`); }
    finally { setLoading(false); }
  }, [toast]);

  // Reopen the remembered folder without a dialog when permission still holds.
  useEffect(() => {
    if (!canUseFolderAccess()) return;
    (async () => {
      const h = await rememberedFolder();
      if (!h) return;
      setHandle(h);
      const state = await folderPermission(h, false);
      if (state === 'granted') load(h); else setNeedsPermission(true);
    })();
  }, [load]);

  const open = async () => {
    try {
      const h = await pickFolder();
      setHandle(h); setNeedsPermission(false); await load(h);
    } catch (e) { if (e?.name !== 'AbortError') toast.error(e.message); }
  };
  const reopen = async () => {
    const state = await folderPermission(handle, true);
    if (state === 'granted') { setNeedsPermission(false); load(handle); }
    else toast.error('Permission was not given, so the folder stays closed.');
  };
  const forget = async () => { await forgetFolder(); setHandle(null); setData(null); setSelectedId(null); setWritable(false); };
  const onFallback = async (e) => {
    const result = await readGigsFromFileList(e.target.files);
    e.target.value = '';
    setData(result); setWritable(false);
    setSelectedId(sortGigs(result.gigs)[0]?.id || null);
  };

  const gigs = useMemo(() => sortGigs(data?.gigs || []), [data]);
  const summary = useMemo(() => summarizeGigs(gigs), [gigs]);
  const gig = gigs.find((g) => g.id === selectedId) || null;

  const onSaveStatus = async (status) => {
    try {
      await saveStatus(handle, gig.id, status);
      setData((d) => ({ ...d, gigs: d.gigs.map((g) => (g.id === gig.id ? { ...g, status } : g)) }));
      toast.success('Status saved to the gig folder.');
    } catch (e) { toast.error(`Could not save: ${e.message}`); }
  };

  // ── No folder yet ────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="surface rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <FolderOpen size={18} className="text-aws-orange mt-0.5 shrink-0" />
            <div className="space-y-2 min-w-0">
              <h3 className="font-extrabold">Open your AWS Gigs folder</h3>
              <p className="text-[12.5px] text-muted">
                Claude Code writes a full pack for each job into <strong className="text-current">Documents\AWS Gigs</strong> on your laptop:
                proposal, answers, plan, diagram, a lesson read aloud, a cheat sheet and Upwork messages.
                This page reads that folder. Nothing is uploaded; client details stay on your laptop.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {needsPermission && handle
                  ? <Button size="sm" icon={FolderOpen} onClick={reopen}>Reopen AWS Gigs</Button>
                  : canUseFolderAccess() && <Button size="sm" icon={FolderOpen} onClick={open}>Open my AWS Gigs folder</Button>}
                <Button size="sm" variant="ghost" onClick={() => fallbackRef.current?.click()}>Read it once (read-only)</Button>
                <input ref={fallbackRef} type="file" multiple className="hidden" onChange={onFallback} />
              </div>
              {!canUseFolderAccess() && <p className="text-[11px] text-warning">This browser can only read the folder once and cannot save stage changes. Chrome or Edge can do both.</p>}
            </div>
          </div>
        </div>
        <div className="surface rounded-2xl p-4 text-[12.5px] space-y-1">
          <p className="font-extrabold text-sm">How it works</p>
          <p>1. In Claude Code say <strong>"check Upwork jobs"</strong>. It reads your Upwork job alerts and scores them.</p>
          <p>2. Say <strong>"do this gig"</strong>. The full pack appears here.</p>
          <p>3. Copy the proposal, paste it in Upwork, and <strong>you press Submit</strong>.</p>
          <p>4. Before the call, open <strong>Teach me</strong> and listen. After, tell Claude or set the stage here.</p>
        </div>
      </div>
    );
  }

  // ── Board ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => (handle && writable ? load(handle) : fallbackRef.current?.click())} disabled={loading}>
          {loading ? 'Reading…' : 'Refresh'}
        </Button>
        {handle && <button onClick={forget} className="text-[11px] font-bold text-muted hover:text-aws-orange">Forget this folder</button>}
        <input ref={fallbackRef} type="file" multiple className="hidden" onChange={onFallback} />
        <span className="text-[11px] text-muted ml-auto">{writable ? 'Folder open · stage changes save to status.json' : 'Read-only copy'}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatChip label="New" value={summary.byStage.new} layout="stacked" />
        <StatChip label="Applied" value={summary.byStage.applied + summary.byStage.interview} layout="stacked" />
        <StatChip label="Won / delivering" value={summary.byStage.won + summary.byStage.delivering} tone="success" layout="stacked" />
        <StatChip icon={Coins} label="Connects spent" value={summary.connects} layout="stacked" />
        <StatChip label="Earned (done)" value={`$${summary.earned}`} tone="success" layout="stacked" />
      </div>

      <GuidesPanel guides={data.guides || []} />

      {data.checks[0] && (
        <details className="surface rounded-2xl p-4">
          <summary className="cursor-pointer font-extrabold text-sm">Latest job check · {data.checks[0].name.replace('.md', '')}</summary>
          <div className="mt-3"><Markdown source={data.checks[0].text} /></div>
        </details>
      )}
      {data.skipped.length > 0 && <p className="text-[11px] text-warning">Skipped: {data.skipped.join('; ')}</p>}

      {!gigs.length ? (
        <EmptyState icon={Briefcase} title="No gig packs yet" description={'In Claude Code, say "check Upwork jobs", then "do this gig".'} />
      ) : (
        <div className="grid lg:grid-cols-[280px,1fr] gap-4">
          <div className="space-y-2">
            {gigs.map((g) => {
              const v = VERDICT[g.fit.verdict];
              return (
                <button key={g.id} onClick={() => { setSelectedId(g.id); setSection('fit'); }}
                  className={cn('surface rounded-xl p-3 text-left w-full', g.id === selectedId && 'ring-2 ring-aws-orange')}>
                  <div className="flex items-center gap-2 text-[10.5px] font-bold">
                    {g.sample && <span className="chip">SAMPLE</span>}
                    <span className={v?.cls || 'text-muted'}>{v ? v.label : 'Unscored'}{g.fit.score != null ? ` · ${g.fit.score}` : ''}</span>
                    <span className="text-muted ml-auto">{GIG_STAGES.find((s) => s.id === g.status.stage)?.label}</span>
                  </div>
                  <div className="font-bold text-[13px] mt-1 line-clamp-2">{g.job.title}</div>
                  <div className="text-[11px] text-muted mt-0.5">{budgetLabel(g.job)}</div>
                </button>
              );
            })}
          </div>

          {gig && (
            <div className="space-y-3 min-w-0">
              <div className="surface rounded-2xl p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="font-extrabold text-base flex-1 min-w-0">{gig.job.title}</h3>
                  {gig.job.url && /^https:\/\/(www\.)?upwork\.com\//.test(gig.job.url) && (
                    <a href={gig.job.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost px-3 py-1.5 text-xs rounded-lg inline-flex items-center gap-1">
                      <ExternalLink size={13} /> Open on Upwork
                    </a>
                  )}
                </div>
                <p className="text-[11.5px] text-muted mt-1">You copy, paste and press Submit on Upwork yourself. This app never applies or messages anyone.</p>
              </div>

              <div className="flex flex-wrap gap-1" role="tablist">
                {SECTIONS.map(({ id, label, icon: Icon }) => (
                  <button key={id} role="tab" aria-selected={section === id} onClick={() => setSection(id)}
                    className={cn('px-3 py-1.5 rounded-lg text-[12px] font-bold inline-flex items-center gap-1',
                      section === id ? 'bg-aws-orange text-ink-950' : 'hover:bg-[var(--card-2)] text-muted')}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>

              {section === 'fit' && <FitPanel gig={gig} />}
              {section === 'proposal' && <Doc text={gig.docs.proposal} copy empty={'Ask Claude to "do this gig".'} />}
              {section === 'questions' && <Doc text={gig.docs.questions} copy empty="This job has no screening questions, or they have not been answered yet." />}
              {section === 'plan' && <Doc text={gig.docs.plan} empty="Ask Claude for the delivery plan." />}
              {section === 'diagram' && <DiagramPanel gig={gig} />}
              {section === 'teach' && <TeachPlayer key={gig.id} lesson={gig.docs.lesson} title={gig.job.title} />}
              {section === 'cheatsheet' && <Doc text={gig.docs.cheatsheet} empty={'Ask Claude to "prepare the meeting".'} />}
              {section === 'messages' && <MessagesPanel text={gig.docs.messages} />}
              {section === 'status' && <StatusPanel gig={gig} writable={writable && Boolean(handle)} onSave={onSaveStatus} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
