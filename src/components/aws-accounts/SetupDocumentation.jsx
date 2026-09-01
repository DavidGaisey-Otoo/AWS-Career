/**
 * SetupDocumentation.jsx — AC-01 best-practice checklist + IAM notes.
 *
 * Drops into the AWS Account Manager page as a single big collapsible
 * section. Three parts:
 *   1. Progress strip + actions (Generate Report, Mark all, Clear)
 *   2. 9-item checklist — each item is a card with Why / How-to / CLI
 *   3. IAM Best Practices notes — 4 collapsible principles
 */

import { useMemo, useState } from 'react';
import {
  ShieldCheck, CheckCircle2, Circle, ChevronDown, ChevronUp, FileText,
  Copy, ExternalLink, AlertTriangle, Terminal, BookOpen, Download,
  X, RotateCcw, Eye,
} from 'lucide-react';
import {
  ACCOUNT_SETUP_CHECKLIST, CATEGORY_TONES, SEVERITY_TONES,
} from '../../data/accountSetupChecklist.js';
import { IAM_BEST_PRACTICES } from '../../data/iamBestPractices.js';
import {
  useSetupChecklist, toggleItem, clearAll,
  getProgress, getCompletedItems,
} from '../../lib/setupChecklistStore.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';
import { DocReviewPanel } from '../doc-review/DocReviewPanel.jsx';

export function SetupDocumentation({ profileId = 'default' }) {
  const state = useSetupChecklist(profileId);
  const toast = useToast();
  const [openItem, setOpenItem] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showIam, setShowIam] = useState(true);

  const progress = useMemo(() => getProgress(state), [state]);
  const status = progress.pct === 100 ? 'green' : progress.pct >= 70 ? 'yellow' : progress.pct >= 30 ? 'orange' : 'red';

  return (
    <section className="surface rounded-2xl p-5 gradient-border space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            AC-01 · My Setup Documentation
          </div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <ShieldCheck size={18} className="text-aws-orange" />
            AWS account best practices
          </h2>
          <p className="text-[12.5px] opacity-80 mt-1.5 leading-relaxed max-w-2xl">
            9 current controls for this specific AWS profile. Mark an item only after checking its evidence — each has the WHY,
            click-by-click instructions, and a CLI command to verify it's actually on. Generates a portable report you can
            share with auditors or save to your portfolio.
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold bg-gradient-aws text-ink-950 hover:brightness-110 transition"
          >
            <FileText size={12} /> Generate report
          </button>
          <button
            onClick={() => { if (confirm('Clear all verified states for this AWS profile?')) clearAll(profileId); }}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border border-token hover:border-danger hover:text-danger transition"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </div>
      </div>

      {/* Progress strip */}
      <ProgressStrip progress={progress} status={status} />

      {/* Checklist */}
      <div className="space-y-2">
        {ACCOUNT_SETUP_CHECKLIST.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            done={!!state[item.id]?.done}
            completedAt={state[item.id]?.completedAt}
            open={openItem === item.id}
            onToggleDone={() => toggleItem(item.id, profileId)}
            onToggleOpen={() => setOpenItem((cur) => cur === item.id ? null : item.id)}
          />
        ))}
      </div>

      {/* IAM Best Practices */}
      <div className="border-t border-token pt-4">
        <button
          onClick={() => setShowIam((s) => !s)}
          className="w-full flex items-center justify-between gap-2 text-left"
        >
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-aws-orange" />
            <span className="text-[15px] font-extrabold">IAM Best Practices — read these</span>
            <span className="px-2 py-0.5 rounded-full bg-aws-orange/15 text-aws-orange text-[9.5px] font-extrabold">
              {IAM_BEST_PRACTICES.length} principles
            </span>
          </div>
          {showIam ? <ChevronUp size={14} className="opacity-60" /> : <ChevronDown size={14} className="opacity-60" />}
        </button>
        {showIam && (
          <div className="mt-3 space-y-2">
            {IAM_BEST_PRACTICES.map((p) => <IamPrinciple key={p.id} principle={p} />)}
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReport && <ReportModal state={state} progress={progress} onClose={() => setShowReport(false)} />}
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// Building blocks
// ════════════════════════════════════════════════════════════════════
function ProgressStrip({ progress, status }) {
  const toneClass = {
    red:    'bg-danger',
    orange: 'bg-aws-orange',
    yellow: 'bg-warning',
    green:  'bg-success',
  }[status];
  return (
    <div className="rounded-xl bg-[var(--card-2)] border border-token p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-75">Setup progress</span>
        <span className="text-[13px] font-extrabold">
          {progress.done} / {progress.total}
          <span className="opacity-70 ml-1">({progress.pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden bg-[var(--card)] border border-token">
        <div className={cn('h-full transition-all duration-500', toneClass)} style={{ width: `${progress.pct}%` }} />
      </div>
      {progress.pct < 100 && (
        <p className="text-[11px] opacity-70 mt-2">
          {progress.done === 0
            ? 'Start with Root MFA + IAM Admin user — those are the two highest-impact items.'
            : progress.pct < 50
              ? 'Good start. Focus on the Security category items next.'
              : 'Almost there — knock out the remaining items to lock the account down.'}
        </p>
      )}
      {progress.pct === 100 && (
        <p className="text-[11px] text-success mt-2 font-bold inline-flex items-center gap-1">
          🎉 Account is fully hardened. Generate the report and save it to your portfolio.
        </p>
      )}
    </div>
  );
}

function ChecklistItem({ item, done, completedAt, open, onToggleDone, onToggleOpen }) {
  const catTone = CATEGORY_TONES[item.category] || 'orange';
  const sevTone = SEVERITY_TONES[item.severity] || 'sky';
  const toneBadge = {
    orange:  'bg-aws-orange/15 text-aws-orange',
    danger:  'bg-danger/15 text-danger',
    sky:     'bg-sky-400/15 text-sky-300',
    success: 'bg-success/15 text-success',
    violet:  'bg-violet-400/15 text-violet-300',
    warning: 'bg-warning/15 text-warning',
  };
  return (
    <div className={cn(
      'rounded-xl border transition',
      done ? 'border-success/40 bg-success/5' : 'border-token bg-[var(--card-2)]'
    )}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggleDone}
          className="flex-shrink-0"
          aria-label={done ? 'Mark as not done' : 'Mark as done'}
        >
          {done
            ? <CheckCircle2 size={20} className="text-success" />
            : <Circle size={20} className="opacity-40 hover:opacity-80 transition" />
          }
        </button>

        <button
          onClick={onToggleOpen}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span className="text-[18px] flex-shrink-0">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className={cn('text-[13.5px] font-bold truncate', done && 'line-through opacity-65')}>
              {item.label}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className={cn('text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full', toneBadge[catTone])}>
                {item.category}
              </span>
              <span className={cn('text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full', toneBadge[sevTone])}>
                {item.severity}
              </span>
              {completedAt && (
                <span className="text-[10px] opacity-65">
                  ✓ {new Date(completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
          {open ? <ChevronUp size={14} className="opacity-60 flex-shrink-0" /> : <ChevronDown size={14} className="opacity-60 flex-shrink-0" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-token px-4 pt-3 pb-4 space-y-3">
          <Subsection title="Why this matters" icon={AlertTriangle} tone="warning">
            <p className="text-[12.5px] opacity-90 leading-relaxed">{item.why}</p>
          </Subsection>

          <Subsection title="How to verify (Console)" icon={Eye} tone="sky">
            <ol className="text-[12px] opacity-90 leading-relaxed space-y-1 list-decimal list-inside">
              {item.howTo.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </Subsection>

          <Subsection title="CLI verification" icon={Terminal} tone="orange">
            <CliBlock command={item.cliVerify} />
          </Subsection>

          <a
            href={item.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11.5px] font-bold text-aws-orange hover:underline"
          >
            AWS official docs <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}

function Subsection({ title, icon: Icon, tone, children }) {
  const toneClass = {
    warning: 'text-warning',
    sky:     'text-sky-400',
    orange:  'text-aws-orange',
  }[tone] || 'text-aws-orange';
  return (
    <div>
      <div className={cn('text-[10.5px] font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1', toneClass)}>
        {Icon && <Icon size={11} />} {title}
      </div>
      {children}
    </div>
  );
}

function CliBlock({ command }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  }
  return (
    <div className="relative">
      <pre className="bg-ink-900/40 border border-token rounded-lg px-3 py-2 text-[11.5px] font-mono whitespace-pre-wrap break-all">
        {command}
      </pre>
      <button
        onClick={copy}
        className="absolute top-1 right-1 p-1 rounded text-[9px] opacity-60 hover:opacity-100 bg-[var(--card-2)] border border-token"
        title="Copy command"
      >
        {copied ? <CheckCircle2 size={11} className="text-success" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

function IamPrinciple({ principle }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full p-3 text-left flex items-center gap-3"
      >
        <span className="text-[18px] flex-shrink-0">{principle.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-extrabold">{principle.title}</div>
          <div className="text-[11px] opacity-75 mt-0.5">{principle.oneLiner}</div>
        </div>
        {open ? <ChevronUp size={14} className="opacity-60" /> : <ChevronDown size={14} className="opacity-60" />}
      </button>
      {open && (
        <div className="border-t border-token px-4 pt-3 pb-4 space-y-2.5">
          {principle.body.map((para, i) => (
            <p key={i} className="text-[12.5px] opacity-90 leading-relaxed">{para}</p>
          ))}
          {principle.examples?.length > 0 && (
            <div className="space-y-1.5 mt-1">
              {principle.examples.map((ex, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  <div className="rounded-lg bg-success/5 border border-success/30 p-2 text-[11.5px]">
                    <span className="font-extrabold text-success mr-1">✓ DO</span>
                    <code className="text-[11px] break-all whitespace-pre-wrap font-mono">{ex.do}</code>
                  </div>
                  <div className="rounded-lg bg-danger/5 border border-danger/30 p-2 text-[11.5px]">
                    <span className="font-extrabold text-danger mr-1">✗ DON'T</span>
                    <code className="text-[11px] break-all whitespace-pre-wrap font-mono">{ex.dont}</code>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Report modal — printable + copyable markdown
// ════════════════════════════════════════════════════════════════════
function ReportModal({ state, progress, onClose }) {
  const toast = useToast();
  const completed = useMemo(() => getCompletedItems(state), [state]);
  const pending = useMemo(
    () => ACCOUNT_SETUP_CHECKLIST.filter((it) => !state[it.id]?.done),
    [state]
  );

  const markdown = useMemo(() => buildMarkdownReport({ progress, completed, pending }), [progress, completed, pending]);

  function copyMarkdown() {
    navigator.clipboard.writeText(markdown).then(() => toast?.success?.('Report copied as Markdown'));
  }

  function downloadMarkdown() {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `aws-setup-report-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success?.('Downloaded');
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl p-5 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-token shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              AC-01 · Setup Report
            </div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <FileText size={16} className="text-aws-orange" />
              AWS Account Setup Report
            </h3>
            <div className="text-[11px] opacity-70 mt-0.5">
              {progress.done} of {progress.total} items complete ({progress.pct}%)
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--card-2)] transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={copyMarkdown} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
            <Copy size={12} /> Copy as Markdown
          </button>
          <button onClick={downloadMarkdown} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-gradient-aws text-ink-950 hover:brightness-110 transition">
            <Download size={12} /> Download .md
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
            🖨️ Print
          </button>
        </div>

        <div className="rounded-xl bg-[var(--card-2)] border border-token p-4 max-h-[40vh] overflow-y-auto">
          <pre className="text-[12px] whitespace-pre-wrap font-mono leading-relaxed">{markdown}</pre>
        </div>

        {/* DOC-01: handover completeness review on the generated report */}
        <div className="mt-3">
          <DocReviewPanel docText={markdown} docType="handover" />
        </div>
      </div>
    </div>
  );
}

function buildMarkdownReport({ progress, completed, pending }) {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines = [];
  lines.push(`# AWS Account Setup Report`);
  lines.push(``);
  lines.push(`**Generated:** ${date}`);
  lines.push(`**Progress:** ${progress.done} / ${progress.total} (${progress.pct}%)`);
  lines.push(``);
  lines.push(`---`);
  lines.push(``);

  lines.push(`## ✅ Completed (${completed.length})`);
  lines.push(``);
  if (completed.length === 0) {
    lines.push(`_Nothing complete yet._`);
  } else {
    for (const it of completed) {
      lines.push(`### ${it.icon} ${it.label}`);
      lines.push(``);
      lines.push(`- **Category:** ${it.category} · **Severity:** ${it.severity}`);
      if (it.completedAt) {
        lines.push(`- **Completed:** ${new Date(it.completedAt).toLocaleDateString('en-GB')}`);
      }
      lines.push(`- **Why:** ${it.why}`);
      lines.push(`- **CLI verify:** \`${it.cliVerify}\``);
      lines.push(`- **AWS docs:** ${it.docsUrl}`);
      lines.push(``);
    }
  }

  lines.push(`---`);
  lines.push(``);
  lines.push(`## ⏳ Pending (${pending.length})`);
  lines.push(``);
  if (pending.length === 0) {
    lines.push(`_All best practices implemented — account is fully hardened._`);
  } else {
    for (const it of pending) {
      lines.push(`- [ ] **${it.icon} ${it.label}** _(${it.category}, ${it.severity})_`);
    }
  }
  lines.push(``);
  lines.push(`---`);
  lines.push(``);
  lines.push(`_Generated by AWS Career Launchpad Pro — AC-01 Setup Documentation_`);

  return lines.join('\n');
}
