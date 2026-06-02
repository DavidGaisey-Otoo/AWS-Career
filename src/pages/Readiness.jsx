/**
 * Readiness.jsx — single-screen health check that runs from the browser.
 *
 * Why this exists: shell-side scans (the ones the user sees in chat) can't
 * read browser localStorage. This page CAN — it checks every prereq in one
 * place, including AWS connectivity, GitHub token validity + expiry, app
 * vault state, walkthrough progress, and more.
 *
 * Each check returns { ok, level, message, action? }. The grid renders
 * pass/fail/warn icons + a "Fix it" link / button where applicable.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw, ShieldCheck,
  Cloud, Github, KeyRound, FolderOpen, Settings, Wrench, Download, Printer,
  ExternalLink, ChevronRight, Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useAWS } from '../context/AWSContext.jsx';
import { useDeploy } from '../context/DeployContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  readToken, daysUntilExpiry, expirySeverity, expiryLabel, verifyToken,
  GITHUB_TOKEN_PAGE,
} from '../lib/githubToken.js';

export default function Readiness() {
  return (
    <div className="space-y-6">
      <Header />
      <ChecklistGrid />
      <DocumentationExporter />
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={18} className="text-[var(--brand)]" />
        <h1 className="text-2xl font-bold tracking-tight">Readiness Dashboard</h1>
      </div>
      <p className="text-sm opacity-70 max-w-2xl">
        Live health check that runs from inside the browser — so it can see things terminal scans
        can't (your GitHub token, your AWS profile, your encrypted vault, etc.). One screen, every check.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════════

function ChecklistGrid() {
  const aws = useAWS();
  const deploy = useDeploy();
  const [verifyingGithub, setVerifyingGithub] = useState(false);
  const [githubVerifyResult, setGithubVerifyResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Read current state
  const token = useMemo(readToken, [refreshKey]);
  const activeProfile = aws?.state?.profiles?.[aws?.state?.activeProfile];

  async function reVerifyGithub() {
    setVerifyingGithub(true);
    setGithubVerifyResult(null);
    try {
      const result = await verifyToken();
      setGithubVerifyResult(result);
    } finally {
      setVerifyingGithub(false);
    }
  }

  // Run a fresh GitHub verify on mount + refresh
  useEffect(() => {
    if (token?.token) reVerifyGithub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Compose the check items
  const checks = [
    // ─── AWS ───
    {
      group: 'AWS',
      title: 'AWS profile credentials saved',
      icon: Cloud,
      ...(activeProfile?.accessKeyId && activeProfile?.secretAccessKey
        ? { level: 'success', message: `Saved for profile "${activeProfile.name}"` }
        : { level: 'error', message: 'No access keys on the active profile.', fix: { to: '/aws-accounts', label: 'Open AWS Account Manager' } }),
    },
    {
      group: 'AWS',
      title: 'AWS connection verified (STS GetCallerIdentity)',
      icon: Cloud,
      ...(activeProfile?.connected
        ? { level: 'success', message: `Connected as ${activeProfile.identity?.arn || activeProfile.name}` }
        : activeProfile?.accessKeyId
          ? { level: 'warning', message: 'Keys saved but never tested. Click Test connection.', fix: { to: '/aws-accounts', label: 'Test connection' } }
          : { level: 'error', message: 'No credentials to test.' }),
    },
    {
      group: 'AWS',
      title: 'AWS Free Tier / Paid status detected',
      icon: Cloud,
      ...(aws?.effectiveTier?.tier && aws.effectiveTier.tier !== 'unknown'
        ? { level: aws.effectiveTier.tier === 'free' ? 'success' : 'warning', message: aws.effectiveTier.reason }
        : { level: 'warning', message: 'Tier could not be detected. Open AWS Account Manager.', fix: { to: '/aws-accounts', label: 'Detect tier' } }),
    },
    {
      group: 'AWS',
      title: 'Encrypted deploy vault initialised',
      icon: KeyRound,
      ...(deploy?.hasVault
        ? { level: 'success', message: 'Vault is set up — Deploy Console actions ready.' }
        : { level: 'warning', message: 'Optional, but needed for strict-approval deploys from inside the app.', fix: { to: '/deploy', label: 'Set up vault' } }),
    },

    // ─── GitHub ───
    {
      group: 'GitHub',
      title: 'GitHub PAT saved in app',
      icon: Github,
      ...(token?.token
        ? { level: 'success', message: token.userLogin ? `Authenticated as ${token.userLogin}` : 'Token saved (not yet verified).' }
        : { level: 'error', message: 'No token saved.', fix: { to: '/settings', label: 'Add GitHub token' } }),
    },
    {
      group: 'GitHub',
      title: 'GitHub PAT still works against the API',
      icon: Github,
      ...(verifyingGithub
        ? { level: 'pending', message: 'Verifying…' }
        : githubVerifyResult?.ok
          ? { level: 'success', message: githubVerifyResult.message }
          : githubVerifyResult
            ? { level: 'error', message: githubVerifyResult.message, fix: { href: GITHUB_TOKEN_PAGE, label: 'Regenerate token' } }
            : { level: 'unknown', message: token?.token ? 'Click refresh to test.' : 'Save a token first.' }),
    },
    (() => {
      const sev = expirySeverity(token?.expiresAt);
      const label = expiryLabel(token?.expiresAt);
      const days = daysUntilExpiry(token?.expiresAt);
      const ok = sev === 'fresh' || sev === 'aging';
      const warn = sev === 'urgent' || sev === 'unknown';
      const fail = sev === 'critical' || sev === 'expired';
      return {
        group: 'GitHub',
        title: 'GitHub PAT expiry tracked',
        icon: Github,
        level: !token?.token ? 'unknown' : ok ? 'success' : warn ? 'warning' : fail ? 'error' : 'unknown',
        message: !token?.token
          ? 'No token saved.'
          : sev === 'unknown'
            ? 'Token saved but no expiry date recorded — record it in Settings so we can warn you.'
            : `${label}${days != null ? ` (${token.expiresAt})` : ''}.`,
        fix: token?.token && !ok ? { to: '/settings', label: 'Update expiry / regenerate' } : null,
      };
    })(),

    // ─── App / Build ───
    {
      group: 'App',
      title: 'App dev server reachable',
      icon: Sparkles,
      level: 'success',
      message: `Running at ${typeof window !== 'undefined' ? window.location.origin : '(unknown)'}`,
    },
    {
      group: 'App',
      title: 'localStorage available',
      icon: FolderOpen,
      ...(typeof window !== 'undefined' && window.localStorage
        ? { level: 'success', message: 'Persistence working — your progress survives reloads.' }
        : { level: 'error', message: 'localStorage unavailable. Are you in private mode?' }),
    },
    {
      group: 'App',
      title: 'Secure context for crypto vault',
      icon: KeyRound,
      ...(typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost')
        ? { level: 'success', message: 'Web Crypto API ready (HTTPS or localhost).' }
        : { level: 'warning', message: 'Web Crypto requires HTTPS or localhost. Vault disabled.' }),
    },

    // ─── Walkthrough / progress ───
    {
      group: 'Progress',
      title: 'Deploy audit log entries',
      icon: ShieldCheck,
      ...(deploy?.stats?.total > 0
        ? { level: 'success', message: `${deploy.stats.total} entr${deploy.stats.total === 1 ? 'y' : 'ies'} logged · ${deploy.stats.failures} failed.` }
        : { level: 'unknown', message: 'No deploy actions yet. Use Deploy Console to log activity.', fix: { to: '/deploy', label: 'Open Deploy Console' } }),
    },
    {
      group: 'Progress',
      title: 'Active walkthrough progress',
      icon: ChevronRight,
      ...(countWalkthroughProgress() > 0
        ? { level: 'success', message: `${countWalkthroughProgress()} step(s) completed across walkthroughs.` }
        : { level: 'unknown', message: 'No walkthrough progress yet.', fix: { to: '/walkthroughs', label: 'Browse walkthroughs' } }),
    },
  ];

  const groups = ['AWS', 'GitHub', 'App', 'Progress'];

  // Score summary
  const counts = checks.reduce((acc, c) => {
    acc[c.level] = (acc[c.level] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="rounded-2xl border border-token bg-[var(--card)] p-4 flex items-center gap-4 flex-wrap">
        <div className="flex-1 flex items-center gap-4 flex-wrap">
          <Pill icon={CheckCircle2} label="Passing" value={counts.success || 0} tone="success" />
          <Pill icon={AlertTriangle} label="Warnings" value={counts.warning || 0} tone="warning" />
          <Pill icon={XCircle} label="Failing" value={counts.error || 0} tone="danger" />
          <Pill icon={Loader2} label="Unknown / pending" value={(counts.unknown || 0) + (counts.pending || 0)} tone="muted" />
        </div>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => setRefreshKey((k) => k + 1)}>
          Re-run all checks
        </Button>
      </div>

      {/* Grouped checks */}
      {groups.map((g) => {
        const items = checks.filter((c) => c.group === g);
        if (!items.length) return null;
        return (
          <div key={g} className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden">
            <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest font-extrabold opacity-70">
              {g}
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {items.map((c, i) => <CheckRow key={`${g}-${i}`} check={c} />)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function CheckRow({ check }) {
  const Icon = check.icon || CheckCircle2;
  const tone = {
    success: { iconCls: 'text-success', wrap: 'border-success/40 bg-success/[0.04]',  status: <CheckCircle2 size={14} className="text-success" /> },
    warning: { iconCls: 'text-warning', wrap: 'border-warning/40 bg-warning/[0.04]',  status: <AlertTriangle size={14} className="text-warning" /> },
    error:   { iconCls: 'text-danger',  wrap: 'border-danger/40 bg-danger/[0.04]',    status: <XCircle size={14} className="text-danger" /> },
    pending: { iconCls: 'text-electric',wrap: 'border-electric/40 bg-electric/[0.04]',status: <Loader2 size={14} className="text-electric animate-spin" /> },
    unknown: { iconCls: 'opacity-60',    wrap: 'border-token bg-[var(--card-2)]/30',  status: <span className="w-3 h-3 rounded-full border-2 border-current opacity-30" /> },
  }[check.level] || { iconCls: '', wrap: 'border-token', status: null };

  return (
    <li className={`px-4 py-3 flex items-center gap-3 ${tone.wrap}`}>
      <Icon size={14} className={`shrink-0 ${tone.iconCls}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{check.title}</div>
        <div className="text-xs opacity-80 mt-0.5">{check.message}</div>
      </div>
      {check.fix && (
        check.fix.href
          ? <a href={check.fix.href} target="_blank" rel="noreferrer" className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] flex items-center gap-1">
              {check.fix.label} <ExternalLink size={10} />
            </a>
          : <Link to={check.fix.to} className="text-[11px] font-bold px-2 py-1 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] flex items-center gap-1">
              {check.fix.label} <ChevronRight size={10} />
            </Link>
      )}
      <span className="shrink-0 ml-2">{tone.status}</span>
    </li>
  );
}

function Pill({ icon: Icon, label, value, tone }) {
  const cls = {
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
    muted:   'opacity-70',
  }[tone] || '';
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={12} className={cls} />
      <span className="text-xs font-bold">{value}</span>
      <span className="text-[10px] uppercase tracking-widest opacity-60">{label}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MASTER DOCUMENTATION EXPORTER
// ═══════════════════════════════════════════════════════════════════

function DocumentationExporter() {
  const aws = useAWS();
  const deploy = useDeploy();
  const toast = useToast();
  const [busy, setBusy] = useState(null); // 'pdf' | 'md' | 'html' | 'print' | null

  const REPORT_TITLE = 'AWS Career Launchpad — Master Setup Report';
  const TODAY = new Date().toISOString().slice(0, 10);

  async function buildMarkdown() {
    return composeMasterReport({ aws, deploy });
  }

  // ── ① PDF — one click, file lands in Downloads ──
  async function exportPdf() {
    setBusy('pdf');
    toast.info?.('Generating PDF — this can take 5-10 seconds for large reports…') ||
      toast.success('Generating PDF…');
    try {
      const md = await buildMarkdown();
      const { downloadPdfFile } = await import('../lib/printableHtml.js');
      await downloadPdfFile({
        markdown: md,
        title: REPORT_TITLE,
        meta: `Generated ${new Date().toLocaleString()}`,
        documentType: 'Master Setup Report',
        authorName: 'David Gaisey-Otoo',
      });
      toast.success('✅ PDF saved to your Downloads folder');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('PDF generation failed: ' + (err.message || err));
    } finally {
      setBusy(null);
    }
  }

  // ── ② Markdown — universal text format ──
  async function exportMarkdown() {
    setBusy('md');
    try {
      const md = await buildMarkdown();
      const { downloadMarkdownFile } = await import('../lib/printableHtml.js');
      downloadMarkdownFile(md, `aws-launchpad-master-report-${TODAY}.md`);
      toast.success('✅ Markdown saved to your Downloads folder');
    } catch (err) {
      console.error('Markdown download failed:', err);
      toast.error('Markdown download failed: ' + (err.message || err));
    } finally {
      setBusy(null);
    }
  }

  // ── ③ HTML — for browsers / sharing / archival ──
  async function exportHtml() {
    setBusy('html');
    try {
      const md = await buildMarkdown();
      const { downloadHtmlFile } = await import('../lib/printableHtml.js');
      downloadHtmlFile({
        markdown: md,
        title: REPORT_TITLE,
        meta: `Generated ${new Date().toLocaleString()}`,
        documentType: 'Master Setup Report',
        authorName: 'David Gaisey-Otoo',
      });
      toast.success('✅ HTML file saved — open it from Downloads + Ctrl+P to convert to PDF');
    } catch (err) {
      console.error('HTML download failed:', err);
      toast.error('HTML download failed: ' + (err.message || err));
    } finally {
      setBusy(null);
    }
  }

  // ── ④ Open Print Preview — for those who want to tweak before saving ──
  async function openPrintPreview() {
    setBusy('print');
    try {
      const md = await buildMarkdown();
      const { openPrintable } = await import('../lib/printableHtml.js');
      openPrintable({
        markdown: md,
        title: REPORT_TITLE,
        meta: `Generated ${new Date().toLocaleString()}`,
        documentType: 'Master Setup Report',
        authorName: 'David Gaisey-Otoo',
      });
      toast.success('✅ Print preview opened in a new tab');
    } catch (err) {
      console.error('Print preview failed:', err);
      toast.error('Print preview failed — popup blocked? ' + (err.message || err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-electric/30 bg-electric/[0.04] p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-xl bg-electric/15 text-electric">
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold">Master setup report</h3>
          <p className="text-sm opacity-80 mt-1">
            One document with everything: AWS hardening, deploy audit, walkthrough progress, GitHub status,
            and all 96+ shipped features. Pick your format — all four are real downloads.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Button variant="primary" icon={Download} onClick={exportPdf} disabled={!!busy}>
          {busy === 'pdf' ? 'Generating…' : '⭐ PDF (1-click)'}
        </Button>
        <Button variant="ghost" icon={Download} onClick={exportMarkdown} disabled={!!busy}>
          {busy === 'md' ? 'Saving…' : 'Markdown'}
        </Button>
        <Button variant="ghost" icon={Download} onClick={exportHtml} disabled={!!busy}>
          {busy === 'html' ? 'Saving…' : 'HTML'}
        </Button>
        <Button variant="ghost" icon={Printer} onClick={openPrintPreview} disabled={!!busy}>
          {busy === 'print' ? 'Opening…' : 'Print preview'}
        </Button>
      </div>
      <div className="text-[10px] opacity-60 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <span>⭐ <strong>PDF</strong>: real .pdf, lands in Downloads</span>
        <span><strong>Markdown</strong>: .md — open in Notion / GitHub</span>
        <span><strong>HTML</strong>: .html — open in browser to view</span>
        <span><strong>Print preview</strong>: tab opens, click Save as PDF</span>
      </div>
    </div>
  );
}

// ────────────────────── helpers ──────────────────────

function countWalkthroughProgress() {
  if (typeof window === 'undefined') return 0;
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.includes('::walkthrough::') || k.includes('::console-walk::')) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        total += (v?.done?.length || 0);
      } catch {}
    }
  }
  return total;
}

async function composeMasterReport({ aws, deploy }) {
  // Pull in the existing modules lazily so this page stays light.
  const [{ SESSIONS, sessionToMarkdown }, { APP_CHANGELOG }] = await Promise.all([
    import('../data/sessionLog.js'),
    import('../data/appChangelog.js'),
  ]);
  const t = readToken();
  const activeProfile = aws?.state?.profiles?.[aws?.state?.activeProfile];

  const lines = [];
  lines.push('# AWS Career Launchpad — Master Setup Report');
  lines.push('');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Owner:** ${activeProfile?.gmailAddress || 'gaiseyotood@gmail.com'}`);
  lines.push('');

  // 1. Snapshot
  lines.push('## 1 · Account snapshot');
  lines.push('');
  lines.push(`- **AWS account:** ${activeProfile?.identity?.account || '—'} (${activeProfile?.name || '—'})`);
  lines.push(`- **Region:** ${activeProfile?.region || '—'}`);
  lines.push(`- **Connected:** ${activeProfile?.connected ? '✅' : '❌'}`);
  lines.push(`- **Effective tier:** ${aws?.effectiveTier?.tier || 'unknown'} — ${aws?.effectiveTier?.reason || ''}`);
  lines.push(`- **Vault initialised:** ${deploy?.hasVault ? '✅' : '❌'}`);
  lines.push('');

  // 2. GitHub
  lines.push('## 2 · GitHub integration');
  lines.push('');
  if (t?.token) {
    lines.push(`- **Token saved:** ✅ ${t.savedAt ? `on ${t.savedAt}` : ''}`);
    lines.push(`- **User:** ${t.userLogin || '(not verified)'}`);
    lines.push(`- **Expiry:** ${t.expiresAt || 'not recorded'}  · ${expiryLabel(t.expiresAt)}`);
  } else {
    lines.push('- ❌ No token saved.');
  }
  lines.push('');

  // 3. Deploy audit log (recent)
  lines.push('## 3 · Deploy audit log (most recent 25)');
  lines.push('');
  const audit = (deploy?.auditLog || []).slice(0, 25);
  if (audit.length === 0) {
    lines.push('_No deploy actions logged yet._');
  } else {
    lines.push('| Time | Tier | Action | Result |');
    lines.push('|---|---|---|---|');
    for (const e of audit) {
      lines.push(`| ${e.at} | ${e.tier} | ${e.actionId} | ${e.ok === false ? '❌' : '✅'} ${e.summary || ''} |`);
    }
  }
  lines.push('');

  // 4. SessionLog
  lines.push('## 4 · Recorded sessions');
  lines.push('');
  for (const s of SESSIONS) {
    lines.push(`### ${s.title}`);
    lines.push('');
    lines.push(sessionToMarkdown(s));
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // 5. App changelog
  lines.push('## 5 · App changelog');
  lines.push('');
  for (const c of APP_CHANGELOG) {
    lines.push(`### v${c.version} · ${c.date}`);
    lines.push(`${c.highlight}`);
    lines.push('');
    for (const sec of ['added', 'changed', 'fixed', 'notes']) {
      const items = c.sections?.[sec];
      if (!items?.length) continue;
      lines.push(`**${sec[0].toUpperCase() + sec.slice(1)}**`);
      for (const it of items) lines.push(`- ${it}`);
      lines.push('');
    }
  }

  // 6. Walkthrough progress
  lines.push('## 6 · Walkthrough progress');
  lines.push('');
  const progress = collectWalkthroughProgress();
  if (progress.length === 0) {
    lines.push('_No walkthrough progress recorded yet._');
  } else {
    for (const p of progress) {
      lines.push(`- **${p.key}** — ${p.done}/${p.total ?? '?'} steps complete`);
    }
  }
  lines.push('');

  lines.push('---');
  lines.push('_End of report._');
  return lines.join('\n');
}

function collectWalkthroughProgress() {
  if (typeof window === 'undefined') return [];
  const out = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.includes('::walkthrough::') || k.includes('::console-walk::')) {
      try {
        const v = JSON.parse(localStorage.getItem(k));
        out.push({ key: k.split('::').pop(), done: v?.done?.length || 0, total: null });
      } catch {}
    }
  }
  return out;
}
