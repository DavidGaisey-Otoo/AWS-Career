/**
 * SessionLog.jsx — viewer for past AWS setup / build sessions, with
 * Markdown export and print-friendly output.
 *
 * Tonight's session (AWS account setup, 2026-05-23) is hardcoded in
 * sessionLog.js. Future sessions are recorded automatically via the
 * audit log in DeployContext and synthesised into the same shape.
 */
import { useMemo, useState } from 'react';
import {
  Calendar, Clock, Download, FileText, Link as LinkIcon, ExternalLink,
  Printer, CheckCircle2, AlertTriangle, ArrowRight, ChevronRight, Lightbulb,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { SESSIONS, sessionToMarkdown } from '../data/sessionLog.js';
import { useDeploy } from '../context/DeployContext.jsx';
import { openPrintable, downloadPdfFile } from '../lib/printableHtml.js';

export default function SessionLog() {
  const [activeId, setActiveId] = useState(SESSIONS[0]?.id);
  const { auditLog } = useDeploy();

  // Synthesise pseudo-sessions from the audit log (one per day with ≥1 entry).
  const synthesised = useMemo(() => synthesiseFromAudit(auditLog), [auditLog]);
  const all = useMemo(() => [...SESSIONS, ...synthesised], [synthesised]);
  const active = all.find((s) => s.id === activeId) || all[0];

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <Sidebar sessions={all} activeId={activeId} setActiveId={setActiveId} />
        {active ? <SessionView session={active} /> : <EmptyState />}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-center gap-2 mb-1">
        <FileText size={18} className="text-[var(--brand)]" />
        <h1 className="text-2xl font-bold tracking-tight">Session Log</h1>
      </div>
      <p className="text-sm opacity-70 max-w-2xl">
        A polished, step-by-step record of every AWS setup and build session you've completed in this app.
        Export to Markdown or print as a clean PDF — perfect for portfolio evidence, white-papers, or revision.
      </p>
    </div>
  );
}

function Sidebar({ sessions, activeId, setActiveId }) {
  return (
    <aside className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden lg:sticky lg:top-4">
      <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest font-bold opacity-60">
        Sessions
      </div>
      <ul className="divide-y divide-[var(--border)]">
        {sessions.map((s) => (
          <li key={s.id}>
            <button
              onClick={() => setActiveId(s.id)}
              className={`w-full text-left px-4 py-3 hover:bg-[var(--card-2)]/40 transition-all ${
                s.id === activeId ? 'bg-[var(--card-2)]/60' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{s.title}</div>
                  <div className="text-[10px] opacity-60 flex items-center gap-2 mt-0.5">
                    <Calendar size={9} /> {s.date}
                    {s.durationMin && <><span>·</span><Clock size={9} /> {s.durationMin}m</>}
                  </div>
                </div>
                <ChevronRight size={12} className="opacity-40 shrink-0 mt-0.5" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card)] p-8 text-center">
      <FileText size={32} className="mx-auto opacity-30 mb-3" />
      <h2 className="text-lg font-bold">No sessions yet</h2>
      <p className="text-sm opacity-70">Future deploy console activity will appear here automatically.</p>
    </div>
  );
}

function SessionView({ session }) {
  function downloadMarkdown() {
    const md = sessionToMarkdown(session);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printable() {
    const md = sessionToMarkdown(session);
    openPrintable({
      markdown: md,
      title: session.title,
      meta: `${session.date} · Account ${session.account?.id || '—'}`,
    });
  }

  async function downloadAsPdf() {
    const md = sessionToMarkdown(session);
    try {
      await downloadPdfFile({
        markdown: md,
        title: session.title,
        meta: `${session.date} · Account ${session.account?.id || '—'}`,
        documentType: 'AWS Session Report',
        authorName: 'David Gaisey-Otoo',
      });
    } catch (err) {
      alert('PDF generation failed — ' + (err.message || err));
    }
  }

  return (
    <main className="space-y-5 min-w-0">
      {/* Top metadata */}
      <div className="rounded-3xl border border-token p-6 bg-[var(--card)]">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{session.title}</h2>
            <div className="text-xs opacity-60 flex flex-wrap gap-3 mt-1">
              <span className="flex items-center gap-1"><Calendar size={11} /> {session.date}</span>
              {session.durationMin && <span className="flex items-center gap-1"><Clock size={11} /> {session.durationMin} min</span>}
              {session.account?.id && <span>Account {session.account.id}</span>}
              {session.account?.region && <span>{session.account.region}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="primary" size="sm" icon={Download} onClick={downloadAsPdf}>⭐ PDF</Button>
            <Button variant="ghost" size="sm" icon={Download} onClick={downloadMarkdown}>Markdown</Button>
            <Button variant="ghost" size="sm" icon={Printer} onClick={printable}>Print preview</Button>
          </div>
        </div>
        <p className="text-sm opacity-90 leading-relaxed">{session.summary}</p>
      </div>

      {/* Warnings */}
      {session.warnings?.length > 0 && (
        <div className="space-y-2">
          {session.warnings.map((w, i) => (
            <div key={i} className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm text-amber-200 flex gap-2 items-start">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Outcomes */}
      {session.outcomes?.length > 0 && (
        <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-300" /> What now exists
          </h3>
          <ul className="space-y-2">
            {session.outcomes.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 mt-0.5">
                  {o.status === 'done' ? '✅' : o.status === 'pending' ? '🟡' : '❌'}
                </span>
                <div className="flex-1">
                  <div className="font-semibold">{o.label}</div>
                  {o.note && <div className="text-xs opacity-70 mt-0.5">{o.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold">Step-by-step record</h3>
        {session.steps.map((step, idx) => (
          <SessionStep key={step.n} step={step} hasNext={!!session.steps[idx + 1]} />
        ))}
      </div>

      {/* Next steps */}
      {session.nextSteps?.length > 0 && (
        <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <ArrowRight size={16} /> Next steps
          </h3>
          <ul className="space-y-2">
            {session.nextSteps.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight size={12} className="shrink-0 mt-1 opacity-50" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}

function SessionStep({ step, hasNext }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden">
      <div className="flex">
        <div className="shrink-0 w-14 flex flex-col items-center pt-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-emerald-500 text-black">
            <CheckCircle2 size={18} />
          </div>
          {hasNext && <div className="w-0.5 flex-1 mt-2 mb-1 bg-emerald-500/40" />}
        </div>
        <div className="flex-1 min-w-0 p-4 pl-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">Phase: {step.phase}</span>
            {step.durationMin && (
              <span className="text-[10px] opacity-60 flex items-center gap-1"><Clock size={9} /> {step.durationMin}m</span>
            )}
          </div>
          <h4 className="text-base font-bold mb-2">Step {step.n} — {step.title}</h4>

          {step.action?.url && (
            <a
              href={step.action.url}
              target={step.action.url.startsWith('/') ? '_self' : '_blank'}
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--brand)] text-black font-bold text-xs hover:brightness-110 mb-3"
            >
              {step.action.url.startsWith('/') ? <LinkIcon size={12} /> : <ExternalLink size={12} />}
              {step.action.url.startsWith('/') ? 'Open in app' : 'Open in AWS Console'}
            </a>
          )}

          <p className="text-sm opacity-90 leading-relaxed">{step.body}</p>

          {step.tip && (
            <div className="rounded-xl bg-amber-500/8 border border-amber-500/30 px-3 py-2 text-xs text-amber-200 mt-3 flex gap-2 items-start">
              <Lightbulb size={11} className="shrink-0 mt-0.5" />
              <span>{step.tip}</span>
            </div>
          )}

          {step.warning && (
            <div className="rounded-xl bg-rose-500/8 border border-rose-500/30 px-3 py-2 text-xs text-rose-200 mt-3 flex gap-2 items-start">
              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
              <span>{step.warning}</span>
            </div>
          )}

          {step.code && (
            <pre className="rounded-xl border border-token bg-[var(--card-2)] px-3 py-2 text-xs font-mono whitespace-pre-wrap overflow-auto mt-3">{step.code}</pre>
          )}

          {step.checkpoint && (
            <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-200 mt-3 flex gap-2 items-start">
              <CheckCircle2 size={11} className="shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-widest text-[9px] mb-0.5">Checkpoint</div>
                <span>{step.checkpoint}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- audit-log → session synthesis ----------------

/**
 * Group audit entries by date and turn each day into a synthetic session.
 * Skips the hardcoded session date to avoid duplicates.
 */
function synthesiseFromAudit(auditLog) {
  if (!auditLog?.length) return [];
  const byDay = new Map();
  for (const e of auditLog) {
    const day = (e.at || '').slice(0, 10);
    if (!day) continue;
    if (day === '2026-05-23') continue; // already hardcoded
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  }
  const sessions = [];
  for (const [day, entries] of [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    const wins = entries.filter((e) => e.ok !== false);
    sessions.push({
      id: `deploy-${day}`,
      date: day,
      title: `Deploy session — ${day}`,
      summary: `${wins.length} successful action${wins.length === 1 ? '' : 's'} executed via Deploy Console.`,
      durationMin: null,
      outcomes: wins.map((e) => ({ label: e.summary || e.actionId, status: 'done' })),
      steps: entries.map((e, i) => ({
        n: i + 1,
        phase: e.tier || 'OTHER',
        title: e.summary || e.actionId,
        body: `Action: ${e.actionId}. Parameters: ${JSON.stringify(e.params || {})}.`,
        checkpoint: e.ok === false ? `Failed.` : 'Completed successfully.',
      })),
    });
  }
  return sessions;
}
