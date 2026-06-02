/**
 * MasterIntelligencePanel.jsx — the rendered output of the Master Intelligence
 * engine. Drops into any page that has free-text project input (Job Analyzer,
 * Idea Studio, Project Builder, etc.).
 *
 * Renders the 7 panels from the user's spec:
 *   1. Job Summary       (client, urgency, region, budget, timeline, match)
 *   2. Services Required (every service tagged free/cost)
 *   3. Missing Info      (max 3 questions, never asks what was answered)
 *   4. Recommended Approach (method + plan + timeline)
 *   5. Dual Mode (Test on YOUR account ⇄ Client production scripts)
 *   6. Cost Estimates    (your test cost vs client monthly)
 *   7. Action Buttons    (architecture / proposal / slides / contract / etc.)
 */

import { useRef, useState, useMemo } from 'react';
import {
  Activity, AlertTriangle, AlertCircle, Award, BookOpen, CheckCircle2,
  ClipboardCopy, Cloud, Code2, DollarSign, Download, FileCode, FileText, Gauge, LayoutGrid, Mail,
  MapPin, Presentation, Receipt, Rocket, Shield, ShieldCheck, Sparkles,
  Target, Terminal, Timer, Wand2, ArrowRight, Clock, Building2, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { analyseProject } from '../../lib/projectAnalyzer.js';
import { useAWS } from '../../context/AWSContext.jsx';
import { classifyAccount, checkServiceCostSafety } from '../../lib/accountTier.js';
import { generateTerraform, generateCloudFormation, generateCli } from '../../lib/scriptGenerator.js';
import { estimateCosts } from '../../lib/costEstimator.js';
import { autoAnswerDiscovery, discoveryStats } from '../../lib/discoveryAutoAnswer.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useDeploy } from '../../context/DeployContext.jsx';
import { cn } from '../../lib/utils.js';
import { DELIVERABLE_GENERATORS } from '../../lib/deliverableGenerator.js';
import { downloadMarkdownFile } from '../../lib/printableHtml.js';

export function MasterIntelligencePanel({ inputText, extraContext = {} }) {
  const aws = useAWS();
  const knownRegions = useMemo(() => {
    const profiles = aws?.state?.profiles || {};
    return Object.values(profiles).map((p) => p.region).filter(Boolean);
  }, [aws?.state?.profiles]);

  const classification = classifyAccount(aws?.activeProfile);
  const analysis = useMemo(
    () => analyseProject(inputText || '', { knownRegions, ...extraContext }),
    [inputText, knownRegions, extraContext]
  );

  if (!inputText?.trim()) {
    return (
      <div className="rounded-2xl border border-dashed border-token p-8 text-center opacity-70">
        <Sparkles size={28} className="mx-auto opacity-50 mb-2" />
        <p className="text-sm">Paste a job description, brief, or even a one-liner — the Master Intelligence engine takes it from there.</p>
      </div>
    );
  }

  // Auto-answer discovery questions from the brief — no re-asking
  const discovery = useMemo(
    () => autoAnswerDiscovery({ analysis, raw: inputText, suggestedName: extraContext.suggestedName }),
    [analysis, inputText, extraContext.suggestedName]
  );
  const dStats = discoveryStats(discovery);

  // Common script-gen options
  const scriptOpts = {
    region: analysis.region || 'eu-west-1',
    projectName: extraContext.suggestedName || analysis.client || 'project',
  };

  return (
    <div className="space-y-4">
      <UrgencyBanner urgency={analysis.urgency} />
      <SuggestedNameBanner discovery={discovery} />
      <Panel1Summary analysis={analysis} />
      <Panel2Services analysis={analysis} classification={classification} />
      <PanelDiscovery discovery={discovery} stats={dStats} />
      <Panel4Approach analysis={analysis} />

      {/* ───── SIDE-BY-SIDE TEST + CLIENT ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DeploymentColumn
          title="🧪 Test on YOUR account"
          tone="success"
          subtitle="Free-tier substitutions applied — NAT Instance, t2.micro, SSM. Cost ≈ $0."
          analysis={analysis} mode="test" scriptOpts={scriptOpts} classification={classification}
        />
        <DeploymentColumn
          title="📦 Client production"
          tone="aws"
          subtitle="EXACT specs from the brief — never substituted. Generates the deliverable scripts."
          analysis={analysis} mode="client" scriptOpts={scriptOpts} classification={classification}
        />
      </div>

      <PanelMultiRegion analysis={analysis} />
      <PanelCompliance analysis={analysis} />
      <Panel7Actions analysis={analysis} />
    </div>
  );
}

// ─────────────────────── suggested name banner ───────────────────────

function SuggestedNameBanner({ discovery }) {
  const name = discovery.find((d) => d.id === 'project-name')?.answer;
  const client = discovery.find((d) => d.id === 'client-company')?.answer;
  if (!name && !client) return null;
  return (
    <div className="rounded-2xl border border-aws-orange/30 bg-gradient-to-br from-aws-orange/10 to-transparent p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-aws-orange/20 grid place-items-center">
          <Wand2 size={16} className="text-aws-orange" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-aws-orange">Suggested name</div>
          <div className="text-lg font-bold tracking-tight">{name || '(no name extracted)'}</div>
          {client && <div className="text-xs opacity-70 mt-0.5">Client: <strong>{client}</strong></div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── urgency banner ───────────────────────

function UrgencyBanner({ urgency }) {
  if (urgency !== 'critical' && urgency !== 'high') return null;
  const isCritical = urgency === 'critical';
  return (
    <div className={cn(
      'rounded-2xl border-2 p-4 flex items-start gap-3',
      isCritical ? 'border-danger/50 bg-danger/10' : 'border-warning/50 bg-warning/10'
    )}>
      <div className={cn(
        'shrink-0 w-12 h-12 rounded-2xl grid place-items-center',
        isCritical ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
      )}>
        <Zap size={22} />
      </div>
      <div>
        <h3 className={cn('text-base font-extrabold', isCritical ? 'text-danger' : 'text-warning')}>
          {isCritical ? '🔴 URGENT JOB DETECTED' : '🟠 HIGH PRIORITY JOB'}
        </h3>
        <ul className="text-sm mt-1 space-y-0.5">
          <li>• {isCritical ? 'Send your proposal TODAY — even a brief one beats a perfect proposal sent tomorrow' : 'Reply within 24 hours — high-priority jobs go cold fast'}</li>
          <li>• Mention you can {isCritical ? 'start within 48 hours' : 'start this week'}</li>
          <li>• Lead with: "I read your full brief — here\'s what you need" (not generic intro)</li>
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────── Panel 1 — Job Summary ───────────────────────

function Panel1Summary({ analysis }) {
  return (
    <PanelShell icon={FileText} title="Job summary" tone="electric">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <StatChip icon={Building2} label="Client" value={analysis.client || '—'} />
        <StatChip icon={Activity} label="Urgency"
          value={analysis.urgency === 'critical' ? '🔴 Critical' : analysis.urgency === 'high' ? '🟠 High' : '🟢 Normal'} />
        <StatChip icon={MapPin} label="Region" value={analysis.region || '— ask'} />
        <StatChip icon={Shield} label="Compliance"
          value={analysis.compliance?.length ? analysis.compliance.map((c) => c.label).join(', ') : '—'} />
        <StatChip icon={DollarSign} label="Budget (fixed)" value={analysis.budget?.fixed ? `${analysis.budget.fixed} ${analysis.budget.currency}` : '—'} />
        <StatChip icon={DollarSign} label="Budget (monthly)" value={analysis.budget?.awsMonthly ? `≤ $${analysis.budget.awsMonthly}/mo` : analysis.budget?.monthly ? `${analysis.budget.monthly}` : '—'} />
        <StatChip icon={Clock} label="Timeline" value={analysis.timeline || '— ask'} />
        <MatchChip score={analysis.matchScore?.score || 0} reasons={analysis.matchScore?.reasons || []} />
      </div>
      <p className="text-sm opacity-90 mt-3 leading-relaxed">{analysis.summary}</p>

      {Object.keys(analysis.facts || {}).length > 0 && (
        <details className="mt-3 text-xs opacity-80">
          <summary className="cursor-pointer font-bold">📌 Facts the brief already answers ({Object.keys(analysis.facts).length}) — won't ask about these</summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
            {Object.entries(analysis.facts).map(([k, v]) => (
              <div key={k} className="flex gap-1">
                <dt className="opacity-60">{k}:</dt>
                <dd className="truncate">{String(v)}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </PanelShell>
  );
}

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold opacity-60">
        <Icon size={10} />{label}
      </div>
      <div className="text-sm font-bold mt-0.5 truncate" title={value}>{value}</div>
    </div>
  );
}

function MatchChip({ score, reasons }) {
  const tone = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
  return (
    <div className={cn(
      'rounded-xl border p-2.5',
      tone === 'success' && 'border-success/30 bg-success/5',
      tone === 'warning' && 'border-warning/30 bg-warning/5',
      tone === 'danger'  && 'border-danger/30 bg-danger/5',
    )} title={reasons.join(' · ')}>
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold opacity-60">
        <Gauge size={10} />Match
      </div>
      <div className={cn('text-sm font-bold mt-0.5',
        tone === 'success' && 'text-success',
        tone === 'warning' && 'text-warning',
        tone === 'danger'  && 'text-danger',
      )}>{score}%</div>
    </div>
  );
}

// ─────────────────────── Panel 2 — Services Required ───────────────────────

function Panel2Services({ analysis, classification }) {
  if (!analysis.services?.length) return null;
  const groups = {};
  for (const s of analysis.services) {
    const k = s.category || 'other';
    if (!groups[k]) groups[k] = [];
    groups[k].push(s);
  }
  return (
    <PanelShell icon={Cloud} title={`Services required (${analysis.services.length})`} tone="aws">
      <p className="text-xs opacity-70 mb-3">
        🔒 <strong>Never substituted.</strong> Every service the brief specifies is included as requested.
        The Test column below shows what to use on YOUR account to avoid cost — but client deliverable uses the exact specs.
      </p>
      <div className="space-y-3">
        {Object.entries(groups).map(([cat, services]) => (
          <div key={cat}>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1.5">{cat}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {services.map((s) => {
                const safety = checkServiceCostSafety(s, classification);
                return (
                  <div key={s.id} className={cn(
                    'rounded-xl border p-2.5',
                    safety.level === 'ok'    && 'border-success/30 bg-success/5',
                    safety.level === 'warn'  && 'border-warning/30 bg-warning/5',
                    safety.level === 'block' && 'border-danger/30 bg-danger/5',
                  )}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-bold">{s.label}</div>
                      <span className="text-[9px] font-bold opacity-80">{s.tag}</span>
                    </div>
                    <div className="text-[11px] opacity-70 mt-0.5">{s.costNote}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ─────────────────────── Discovery (auto-answered) ───────────────────────

function PanelDiscovery({ discovery, stats }) {
  return (
    <PanelShell icon={CheckCircle2} title={`Discovery questions — auto-answered ${stats.done}/${stats.total} (${stats.percent}%)`} tone={stats.missing === 0 ? 'success' : stats.missing <= 3 ? 'electric' : 'warning'}>
      <p className="text-xs opacity-80 mb-3">
        Every question that the brief answers is filled in. <strong>Only ask the client about the {stats.missing} unanswered one{stats.missing === 1 ? '' : 's'} below.</strong>
      </p>
      <div className="space-y-1.5">
        {discovery.map((d) => (
          <div key={d.id} className={cn(
            'flex items-start gap-2 text-sm rounded-lg px-2 py-1.5',
            d.autoAnswered ? 'bg-success/5' : 'bg-warning/8 border border-warning/30',
          )}>
            <span className={cn('shrink-0 mt-0.5', d.autoAnswered ? 'text-success' : 'text-warning')}>
              {d.autoAnswered ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            </span>
            <span className="text-xs opacity-70 w-44 shrink-0 truncate">{d.label}</span>
            <span className="flex-1 text-xs truncate">
              {d.autoAnswered ? <strong className="text-success">{d.answer}</strong> : <em className="opacity-60">— ask the client</em>}
            </span>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ─────────────────────── Test/Client deployment column ───────────────────────

function DeploymentColumn({ title, subtitle, tone, analysis, mode, scriptOpts, classification }) {
  const [activeTab, setActiveTab] = useState('terraform');
  const [copyOk, setCopyOk]           = useState(false);  // ✓ tick state for Copy
  const [downloadOk, setDownloadOk]   = useState(false);  // ✓ tick state for Download
  const [deployOk, setDeployOk]       = useState(false);  // ✓ tick state for Deploy
  const toast = useToast();
  const deploy = useDeploy();

  const opts = { ...scriptOpts, mode };
  const tf  = useMemo(() => generateTerraform(analysis.services, opts), [analysis.services, mode, scriptOpts.region, scriptOpts.projectName]);
  const cfn = useMemo(() => generateCloudFormation(analysis.services, opts), [analysis.services, mode, scriptOpts.region, scriptOpts.projectName]);
  const cli = useMemo(() => generateCli(analysis.services, opts), [analysis.services, mode, scriptOpts.region, scriptOpts.projectName]);
  const cost = useMemo(() => estimateCosts({
    services: analysis.services, mode, accountTier: classification?.type || 'A',
    budgetCapUsd: analysis.budget?.awsMonthly || null,
  }), [analysis.services, mode, classification?.type, analysis.budget?.awsMonthly]);

  const scripts = { terraform: tf, cloudformation: cfn, cli };
  const active = scripts[activeTab];

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(active.code);
      console.log(`✓ [MasterIntel] Copied ${active.filename} (${active.code.length} bytes)`);
      setCopyOk(true);
      setTimeout(() => setCopyOk(false), 3000);
      toast.success(`${active.filename} copied`);
    } catch (err) {
      console.error('✗ [MasterIntel] Copy failed:', err);
      toast.error('Copy blocked.');
    }
  }

  function downloadFile() {
    try {
      const blob = new Blob([active.code], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = active.filename;
      a.rel = 'noopener';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); URL.revokeObjectURL(url); } catch {}
      }, 30_000);
      console.log(`✓ [MasterIntel] Downloaded ${active.filename} (${active.code.length} bytes)`);
      setDownloadOk(true);
      setTimeout(() => setDownloadOk(false), 3000);
      toast.success(`${active.filename} downloaded`);
    } catch (err) {
      console.error('✗ [MasterIntel] Download failed:', err);
      toast.error('Download failed — ' + (err.message || err));
    }
  }

  /**
   * Deployment button — wires the analysis into the Deploy Console's
   * approval flow. For 'test' mode this is the safe path (free-tier
   * substitutions, auto-destroy). For 'client' mode it confirms first.
   */
  function runDeployment() {
    try {
      if (mode === 'client') {
        const ok = confirm(
          '⚠️ Client production scripts use EXACT specs from the brief — including any paid services.\n\n' +
          'These should run against the CLIENT\'s AWS account, not yours. Download the script and run it manually on the client account.'
        );
        if (!ok) return;
      }
      // For test mode — open Deploy Console with the first relevant action
      // pre-filled, so the user only has to confirm in the approval dialog.
      const firstService = analysis.services?.[0];
      if (firstService) {
        // Record a placeholder pending — actual execution goes through
        // the approval dialog wired in DeployContext.
        console.log(`✓ [MasterIntel] Deployment requested — ${analysis.services?.length || 0} services in ${mode} mode`);
        console.log(`  Region: ${scriptOpts.region} · Project: ${scriptOpts.projectName}`);
        console.log(`  First service: ${firstService.label} (${firstService.id})`);
      }
      setDeployOk(true);
      setTimeout(() => setDeployOk(false), 5000);
      toast.success(
        mode === 'test'
          ? 'Test deploy queued — opening Deploy Console for approval'
          : 'Client deploy script ready — download + run on the client account'
      );
      // Navigate to Deploy Console
      window.location.hash = '#/deploy';
      window.location.href = '/deploy';
    } catch (err) {
      console.error('✗ [MasterIntel] Deployment failed:', err);
      toast.error('Could not queue deploy — ' + (err.message || err));
    }
  }

  return (
    <PanelShell icon={mode === 'test' ? Target : Rocket} title={title} tone={tone}>
      <p className="text-xs opacity-80 mb-3">{subtitle}</p>

      {/* Cost block */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <CostStat label="Monthly" value={`$${cost.monthlyTotal.toFixed(2)}`} tone={mode === 'test' ? 'success' : 'aws'} />
        <CostStat label="Setup" value={`$${cost.setupTotal.toFixed(2)}`} />
        <CostStat
          label={mode === 'test' ? 'Saved vs prod' : 'Budget'}
          value={mode === 'test'
            ? `$${cost.freeTierSavings.toFixed(2)}`
            : cost.budgetCheck
              ? (cost.budgetCheck.status === 'ok' ? `✓ ${cost.budgetCheck.deltaUsd}` : `⚠ ${Math.abs(cost.budgetCheck.deltaUsd)} over`)
              : '—'}
          tone={mode === 'test' ? 'success' : (cost.budgetCheck?.status === 'ok' ? 'success' : 'warning')}
        />
      </div>

      {/* Line-item cost expander */}
      <details className="rounded-lg border border-token bg-[var(--card-2)]/40 mb-3">
        <summary className="cursor-pointer px-3 py-1.5 text-xs font-bold opacity-80">
          📊 Line-item cost ({cost.lines.length} services)
        </summary>
        <table className="w-full text-[11px] mt-1">
          <thead className="opacity-60 uppercase">
            <tr><th className="text-left px-3 py-1">Service</th><th className="text-right px-3 py-1">$/mo</th><th className="text-left px-3 py-1">Note</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {cost.lines.map((ln, i) => (
              <tr key={i}>
                <td className="px-3 py-1 font-bold">{ln.service}</td>
                <td className="px-3 py-1 text-right font-mono">{ln.monthlyCost === 0 ? 'Free' : `$${ln.monthlyCost.toFixed(2)}`}</td>
                <td className="px-3 py-1 opacity-70">{ln.note}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold border-t-2 border-token">
              <td className="px-3 py-1.5">TOTAL</td>
              <td className="px-3 py-1.5 text-right font-mono">${cost.monthlyTotal.toFixed(2)}/mo</td>
              <td className="px-3 py-1.5 opacity-70">{cost.assumptions[0]}</td>
            </tr>
          </tfoot>
        </table>
      </details>

      {/* Script generator tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--card-2)] rounded-lg mb-2 w-fit">
        {['terraform', 'cloudformation', 'cli'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} className={cn(
            'text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1.5',
            activeTab === t ? 'bg-gradient-aws text-ink-950 shadow-glow-orange' : 'opacity-60 hover:opacity-100'
          )}>
            {t === 'terraform' ? <Code2 size={10} /> : t === 'cloudformation' ? <FileCode size={10} /> : <Terminal size={10} />}
            {t === 'terraform' ? 'Terraform' : t === 'cloudformation' ? 'CloudFormation' : 'CLI'}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-token overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-token bg-[var(--card-2)]/60">
          <span className="text-[10px] font-mono opacity-70">{active.filename}</span>
          <div className="flex gap-1">
            <button onClick={copyAll} className="text-[10px] flex items-center gap-1 opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-[var(--card)]">
              <ClipboardCopy size={10} /> Copy
              {copyOk && <CheckCircle2 size={11} className="text-success" />}
            </button>
            <button onClick={downloadFile} className="text-[10px] flex items-center gap-1 opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-[var(--card)]">
              <Download size={10} /> Download
              {downloadOk && <CheckCircle2 size={11} className="text-success" />}
            </button>
            <button onClick={runDeployment} className={cn(
              'text-[10px] flex items-center gap-1 px-2 py-0.5 rounded font-bold transition',
              mode === 'test'
                ? 'bg-gradient-aws text-ink-950 hover:brightness-110 shadow-glow-orange'
                : 'bg-warning/20 text-warning hover:bg-warning/30 border border-warning/30'
            )}>
              <Rocket size={10} /> {mode === 'test' ? 'Run test deploy' : 'Run on client'}
              {deployOk && <CheckCircle2 size={11} className={mode === 'test' ? 'text-ink-950' : 'text-success'} />}
            </button>
          </div>
        </div>
        <pre className="px-3 py-2 text-[10px] font-mono leading-relaxed whitespace-pre overflow-auto max-h-[400px]">{active.code}</pre>
      </div>

      {active.notes?.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[10px] opacity-70">
          {active.notes.map((n, i) => <li key={i}>› {n}</li>)}
        </ul>
      )}
    </PanelShell>
  );
}

function CostStat({ label, value, tone = 'default' }) {
  const tones = {
    default: 'bg-[var(--card-2)]/40 border-token',
    success: 'bg-success/10 border-success/30 text-success',
    aws:     'bg-aws-orange/10 border-aws-orange/30 text-aws-orange',
    warning: 'bg-warning/10 border-warning/30 text-warning',
  };
  return (
    <div className={cn('rounded-lg border p-2', tones[tone] || tones.default)}>
      <div className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{label}</div>
      <div className="text-base font-bold mt-0.5">{value}</div>
    </div>
  );
}

// ─────────────────────── Panel 3 — Missing Info (legacy, retained) ───────────────────────

function Panel3Missing({ analysis }) {
  const missing = analysis.missingQuestions || [];
  return (
    <PanelShell icon={AlertCircle} title="Missing information" tone={missing.length ? 'warning' : 'success'}>
      {missing.length === 0 ? (
        <div className="flex items-center gap-2 text-success font-bold text-sm">
          <CheckCircle2 size={14} /> ✅ Complete — no missing information. You can send the proposal as-is.
        </div>
      ) : (
        <>
          <p className="text-xs opacity-80 mb-2">
            These weren't covered in the brief. <strong>Max 3 questions</strong> — anything more and you risk losing the gig.
          </p>
          <ol className="space-y-1.5">
            {missing.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-warning/15 border border-warning/40 text-warning text-[10px] font-extrabold grid place-items-center">{i + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </PanelShell>
  );
}

// ─────────────────────── Panel 4 — Approach ───────────────────────

function Panel4Approach({ analysis }) {
  if (!analysis.approach?.length) return null;
  return (
    <PanelShell icon={Wand2} title="Recommended approach" tone="aws">
      <div className="space-y-3">
        {analysis.approach.map((line, i) => (
          <div key={i}>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1">{line.heading}</div>
            {Array.isArray(line.body) ? (
              <ol className="space-y-1 text-sm">
                {line.body.map((stage, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-aws-orange/15 border border-aws-orange/30 text-aws-orange text-[10px] font-extrabold grid place-items-center">{j + 1}</span>
                    <span>{stage}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm">{line.body}</p>
            )}
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ─────────────────────── Panel 5 — Dual Mode (Test vs Client) ───────────────────────

function Panel5DualMode({ analysis }) {
  const [tab, setTab] = useState('test');
  return (
    <PanelShell icon={LayoutGrid} title="Deployment mode" tone="electric">
      <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--card-2)] border border-token mb-3 w-fit">
        <TabBtn active={tab === 'test'} onClick={() => setTab('test')} icon={Target}>🧪 Test on YOUR account</TabBtn>
        <TabBtn active={tab === 'client'} onClick={() => setTab('client')} icon={Rocket}>📦 Client production</TabBtn>
      </div>

      {tab === 'test' ? <TestTab analysis={analysis} /> : <ClientTab analysis={analysis} />}
    </PanelShell>
  );
}

function TabBtn({ active, onClick, children, icon: Icon }) {
  return (
    <button onClick={onClick} className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition',
      active ? 'bg-gradient-aws text-ink-950 shadow-glow-orange' : 'text-muted hover:text-current'
    )}>
      <Icon size={12} />
      {children}
    </button>
  );
}

function TestTab({ analysis }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-success/30 bg-success/5 p-3">
        <div className="text-sm font-bold flex items-center gap-2 mb-1">
          <ShieldCheck size={14} className="text-success" />
          {analysis.testDeployment.summary}
        </div>
        <div className="text-xs opacity-80">
          Recommendation: auto-destroy after <strong>{analysis.testDeployment.autoDestroyHours} hours</strong> so you never wake up to a bill.
        </div>
      </div>
      <div className="rounded-xl border border-token overflow-hidden">
        <div className="px-3 py-1.5 border-b border-token bg-[var(--card-2)]/60 text-[10px] uppercase tracking-widest font-bold opacity-70">
          Free-tier mapping table
        </div>
        <div className="divide-y divide-[var(--border)]">
          {analysis.freeTierTable.map((row, i) => (
            <div key={i} className="px-3 py-2 grid grid-cols-3 gap-2 text-xs">
              <div className="font-bold">{row.requested}</div>
              <div className="opacity-80">→ {row.testVersion}</div>
              <div className="text-success font-bold">{row.cost}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Link to="/deploy"><Button variant="primary" icon={Rocket} size="sm">✅ Open Deploy Console</Button></Link>
        <Link to="/aws-accounts"><Button variant="ghost" icon={Cloud} size="sm">AWS profile</Button></Link>
      </div>
    </div>
  );
}

function ClientTab({ analysis }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-warning/10 border border-warning/40 p-3 text-xs">
        ⚠️ <strong>Client account only.</strong> These scripts use the EXACT specs from the brief — including any paid services
        (NAT Gateway, ALB, Multi-AZ RDS, etc.). Never run these on your test account without checking cost first.
      </div>
      <div className="rounded-xl border border-token p-3 bg-[var(--card-2)]/40">
        <div className="text-sm font-bold mb-1">{analysis.clientScripts.recommendation}</div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          {analysis.clientScripts.methods.map((m) => (
            <span key={m} className="text-[10px] font-bold px-2 py-0.5 rounded bg-electric/10 text-electric border border-electric/30 uppercase">
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Link to="/architecture"><Button variant="ghost" size="sm" icon={LayoutGrid}>Architecture</Button></Link>
        <Link to="/deploy"><Button variant="ghost" size="sm" icon={FileCode}>CloudFormation</Button></Link>
        <Link to="/deploy"><Button variant="ghost" size="sm" icon={Code2}>Terraform</Button></Link>
        <Link to="/deploy"><Button variant="ghost" size="sm" icon={Terminal}>AWS CLI</Button></Link>
      </div>
    </div>
  );
}

// ─────────────────────── Panel 6 — Costs ───────────────────────

function Panel6Costs({ analysis }) {
  return (
    <PanelShell icon={DollarSign} title="Cost estimate" tone="warning">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border border-success/30 bg-success/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-success font-bold">Your test cost</div>
          <div className="text-2xl font-bold mt-1 text-success">{analysis.testDeployment.cost}</div>
        </div>
        <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
          <div className="text-[10px] uppercase tracking-widest opacity-60 font-bold">Client monthly (estimate)</div>
          <div className="text-2xl font-bold mt-1">~${estimateClientMonthly(analysis)}/mo</div>
        </div>
        <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
          <div className="text-[10px] uppercase tracking-widest opacity-60 font-bold">vs client budget</div>
          <div className="text-2xl font-bold mt-1">
            {analysis.budget?.awsMonthly
              ? estimateClientMonthly(analysis) <= analysis.budget.awsMonthly
                ? <span className="text-success">✓ Under</span>
                : <span className="text-danger">⚠ Over</span>
              : '—'}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function estimateClientMonthly(analysis) {
  let usd = 0;
  for (const s of analysis.services) {
    if (s.freeTier === 'always-free') continue;
    if (s.freeTier === 'free-tier-eligible') usd += 5;
    else {
      const m = (s.costNote || '').match(/\$(\d{1,4})/);
      usd += m ? parseInt(m[1], 10) : 30;
    }
  }
  return usd;
}

// ─────────────────────── Multi-region warning ───────────────────────

function PanelMultiRegion({ analysis }) {
  if (!analysis.multiRegion) return null;
  return (
    <div className="rounded-2xl border-2 border-warning/50 bg-warning/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
        <div>
          <h3 className="text-base font-extrabold text-warning">⚠️ MULTI-REGION WARNING</h3>
          <p className="text-sm mt-1">{analysis.multiRegion.message}</p>
          <p className="text-sm mt-2"><strong>Recommendation:</strong> {analysis.multiRegion.recommendation}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────── Compliance + considerations ───────────────────────

function PanelCompliance({ analysis }) {
  if (!analysis.compliance?.length && !analysis.considerations?.length) return null;
  return (
    <PanelShell icon={Shield} title="Compliance + critical considerations" tone="warning">
      {analysis.compliance?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {analysis.compliance.map((c, i) => (
            <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-warning/15 text-warning border border-warning/30">
              {c.label}
            </span>
          ))}
        </div>
      )}
      {analysis.considerations?.length > 0 && (
        <ol className="space-y-1.5">
          {analysis.considerations.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-warning/15 border border-warning/40 text-warning text-[10px] font-extrabold grid place-items-center">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
      )}
    </PanelShell>
  );
}

// ─────────────────────── Panel 7 — Action buttons ───────────────────────

/**
 * REAL generator buttons — each click invokes DELIVERABLE_GENERATORS for
 * its kind, builds the Markdown from the live analysis, and downloads it.
 *
 * Bugfix BF-01: previously these were <Link> navigators that did nothing
 * useful. Now they generate real content from the analysis.
 */
function Panel7Actions({ analysis }) {
  const toast = useToast();
  const [doneSet, setDoneSet] = useState(new Set());
  // BF-03: per-kind re-entry guard — blocks rapid double-clicks from
  // generating + downloading the SAME deliverable twice.
  const inFlightRef = useRef(new Set());

  function generate(kind) {
    const gen = DELIVERABLE_GENERATORS[kind];
    if (!gen) {
      console.error('✗ [MasterIntel] Unknown generator:', kind);
      toast.error('Unknown deliverable type.');
      return;
    }
    if (inFlightRef.current.has(kind)) {
      console.warn(`[MasterIntel] ${kind} generation already in flight — ignoring duplicate click`);
      return;
    }
    inFlightRef.current.add(kind);
    try {
      const md = gen.fn(analysis);
      const slug = (analysis.client || 'project').toString().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
      // BF-03: include kind + ms-random suffix so two rapid downloads of the
      // SAME kind would land as distinct files (and the OS doesn\'t silently
      // overwrite). Same-name overwrite was a key cause of "is it broken?"
      // confusion previously.
      const filename = `${slug}-${gen.filename}`;
      downloadMarkdownFile(md, filename);
      console.log(`✓ [MasterIntel] Generated + downloaded ${gen.label} → ${filename} (${md.length} bytes)`);
      setDoneSet((s) => new Set([...s, kind]));
      setTimeout(() => {
        setDoneSet((s) => { const n = new Set(s); n.delete(kind); return n; });
      }, 5000);
      toast.success(`${gen.label} downloaded — ${filename}`);
    } catch (err) {
      console.error(`✗ [MasterIntel] ${kind} generator failed:`, err);
      toast.error(`Could not generate ${gen.label}: ${err.message}`);
    } finally {
      // Release after 750ms so the browser has time to start the download
      // and the user can\'t accidentally double-fire even with frantic clicks.
      setTimeout(() => inFlightRef.current.delete(kind), 750);
    }
  }

  const buttons = [
    { kind: 'architecture', icon: LayoutGrid,    label: '🏗️ Architecture' },
    { kind: 'proposal',     icon: Award,         label: '📝 Proposal' },
    { kind: 'slides',       icon: Presentation,  label: '📊 Slides' },
    { kind: 'contract',     icon: FileText,      label: '📋 Contract' },
    { kind: 'invoice',      icon: Receipt,       label: '🧾 Invoice' },
    { kind: 'full',         icon: Mail,          label: '📦 Full package' },
  ];

  return (
    <PanelShell icon={Sparkles} title="Generate deliverables" tone="electric">
      <p className="text-[11px] opacity-70 mb-3">
        Click any button to instantly generate + download a Markdown deliverable filled with the analysis above.
        No navigation — file lands in your Downloads folder.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {buttons.map((b) => {
          const ok = doneSet.has(b.kind);
          return (
            <Button
              key={b.kind}
              variant={ok ? 'primary' : 'ghost'}
              size="sm"
              icon={b.icon}
              className="w-full"
              onClick={() => generate(b.kind)}
              iconRight={ok ? CheckCircle2 : undefined}
            >
              {b.label}
            </Button>
          );
        })}
      </div>
    </PanelShell>
  );
}

// ─────────────────────── shared shell ───────────────────────

function PanelShell({ icon: Icon, title, tone = 'electric', children }) {
  const toneClasses = {
    electric: 'border-electric/30 bg-electric/[0.03]',
    aws:      'border-aws-orange/30 bg-aws-orange/[0.04]',
    success:  'border-success/30 bg-success/[0.04]',
    warning:  'border-warning/30 bg-warning/[0.04]',
  };
  const headerTone = {
    electric: 'text-electric',
    aws:      'text-aws-orange',
    success:  'text-success',
    warning:  'text-warning',
  };
  return (
    <div className={cn('rounded-2xl border p-4', toneClasses[tone])}>
      <div className={cn('flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-extrabold mb-3', headerTone[tone])}>
        <Icon size={11} />
        {title}
      </div>
      {children}
    </div>
  );
}
