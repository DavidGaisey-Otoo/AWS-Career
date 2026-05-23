import { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, DollarSign,
  Globe, Lock, Shield, ShieldAlert, ShieldCheck, Sparkles, Wand2, XCircle,
  Zap,
} from 'lucide-react';
import {
  AI_EXAMPLES,
  antiPatterns,
  estimateMonthly,
  generateDiagramFromDescription,
  securityCoverage,
  wellArchitectedReport,
} from '../../data/archStudio.js';
import { cn } from '../../lib/utils.js';

const REGIONS = [
  { id: 'us-east-1',      label: 'us-east-1 (N. Virginia)' },
  { id: 'us-east-2',      label: 'us-east-2 (Ohio)' },
  { id: 'us-west-2',      label: 'us-west-2 (Oregon)' },
  { id: 'eu-west-1',      label: 'eu-west-1 (Ireland)' },
  { id: 'eu-west-2',      label: 'eu-west-2 (London)' },
  { id: 'eu-central-1',   label: 'eu-central-1 (Frankfurt)' },
  { id: 'ap-south-1',     label: 'ap-south-1 (Mumbai)' },
  { id: 'ap-southeast-1', label: 'ap-southeast-1 (Singapore)' },
  { id: 'ap-southeast-2', label: 'ap-southeast-2 (Sydney)' },
  { id: 'ap-northeast-1', label: 'ap-northeast-1 (Tokyo)' },
  { id: 'sa-east-1',      label: 'sa-east-1 (São Paulo)' },
];

/**
 * StudioIntelligence — the Stage 11 brain panel embedded in Architecture Studio.
 *
 * Props
 *  - nodes, edges               current diagram (read-only here)
 *  - onApplyDiagram({nodes,edges,description})  replace the canvas with AI output
 *  - region, onRegionChange     active AWS region for cost estimate
 */
export function StudioIntelligence({
  nodes = [],
  edges = [],
  onApplyDiagram,
  region = 'us-east-1',
  onRegionChange,
}) {
  const [tab, setTab] = useState('ai'); // ai | wa | cost | sec | anti
  const isEmpty = nodes.length === 0;

  return (
    <div className="surface rounded-2xl overflow-hidden">
      <div className="flex items-center gap-1 p-1.5 border-b border-token bg-[var(--card-2)]/40 overflow-x-auto">
        <TabBtn icon={Sparkles}     label="AI generator"  active={tab === 'ai'}   onClick={() => setTab('ai')} />
        <TabBtn icon={ShieldCheck}  label="Well-Arch"     active={tab === 'wa'}   onClick={() => setTab('wa')} disabled={isEmpty} />
        <TabBtn icon={DollarSign}   label="Cost"          active={tab === 'cost'} onClick={() => setTab('cost')} disabled={isEmpty} />
        <TabBtn icon={Shield}       label="Security"      active={tab === 'sec'}  onClick={() => setTab('sec')} disabled={isEmpty} />
        <TabBtn icon={AlertTriangle} label="Anti-patterns" active={tab === 'anti'} onClick={() => setTab('anti')} disabled={isEmpty} />
      </div>

      <div className="p-4">
        {tab === 'ai'   && <AIGeneratorPanel onApplyDiagram={onApplyDiagram} />}
        {tab === 'wa'   && <WellArchitectedPanel nodes={nodes} edges={edges} />}
        {tab === 'cost' && <CostPanel nodes={nodes} region={region} onRegionChange={onRegionChange} />}
        {tab === 'sec'  && <SecurityPanel nodes={nodes} />}
        {tab === 'anti' && <AntiPatternPanel nodes={nodes} edges={edges} />}
      </div>
    </div>
  );
}

// =================================================================
// AI generator
// =================================================================

function AIGeneratorPanel({ onApplyDiagram }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastSummary, setLastSummary] = useState(null);

  const run = () => {
    if (!text.trim()) return;
    setBusy(true);
    setTimeout(() => {
      const out = generateDiagramFromDescription(text);
      onApplyDiagram?.({ nodes: out.nodes, edges: out.edges, description: text });
      setLastSummary({
        count: out.nodes.length,
        services: out.services,
      });
      setBusy(false);
    }, 350);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wand2 size={14} className="text-aws-orange" />
        <h3 className="text-sm font-extrabold">Generate from description</h3>
      </div>
      <p className="text-[11px] text-muted">
        Describe what you want — services, scale, AZs, security. Our heuristic engine maps your words to the right AWS
        services and draws connections. Always review before deploying.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="e.g. Highly available three-tier web app with auto scaling EC2 across two AZs, RDS Multi-AZ, ALB, CloudFront, WAF, Route 53, S3 for static assets, CloudWatch monitoring."
        className="w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-xs leading-relaxed focus-ring focus:border-aws-orange resize-none"
      />

      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5">
          Pre-loaded examples
        </div>
        <div className="flex flex-wrap gap-1.5">
          {AI_EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => setText(ex.text)}
              className="rounded-full border border-token px-2.5 py-1 text-[11px] font-bold hover:border-aws-orange/40 hover:text-aws-orange transition"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={run}
        disabled={busy || !text.trim()}
        className={cn(
          'btn btn-primary w-full !text-xs',
          (busy || !text.trim()) && 'opacity-50 cursor-not-allowed',
        )}
      >
        <Sparkles size={12} /> {busy ? 'Generating…' : 'Generate diagram'}
      </button>

      {lastSummary && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-[11px]">
          <div className="flex items-center gap-1.5 font-extrabold text-success mb-1">
            <CheckCircle2 size={12} /> Generated {lastSummary.count} services
          </div>
          <div className="text-muted">
            {lastSummary.services.join(' · ')}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5 text-[10px] text-muted leading-relaxed">
        <span className="font-bold text-aws-orange">Heads-up:</span> the generator places nodes in a flow grid — drag
        any node to refine the layout. Connections are sensible defaults; rename / delete edges as you tighten the
        design.
      </div>
    </div>
  );
}

// =================================================================
// Well-Architected
// =================================================================

function WellArchitectedPanel({ nodes, edges }) {
  const report = useMemo(() => wellArchitectedReport(nodes, edges), [nodes, edges]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-aws-orange" />
          <h3 className="text-sm font-extrabold">Well-Architected check</h3>
        </div>
        <ScoreBadge score={report.score} />
      </div>
      <p className="text-[11px] text-muted">
        Heuristic scan of your diagram against the 6 pillars. Lose 12 points per finding (extra 8 for highs).
      </p>

      {report.issues.length === 0 ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-[12px] flex items-center gap-2">
          <CheckCircle2 size={14} className="text-success" />
          <span className="font-bold">Clean run — no findings.</span>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {report.issues.map((iss, i) => (
            <li
              key={i}
              className={cn(
                'rounded-lg border p-2.5',
                iss.severity === 'high'
                  ? 'border-danger/40 bg-danger/10'
                  : iss.severity === 'medium'
                  ? 'border-warning/40 bg-warning/10'
                  : 'border-token bg-[var(--card-2)]/30'
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={cn(
                    'text-[10px] font-extrabold uppercase tracking-widest',
                    iss.severity === 'high' ? 'text-danger'
                      : iss.severity === 'medium' ? 'text-warning'
                      : 'text-muted'
                  )}
                >{iss.severity}</span>
                <span className="text-[10px] font-bold text-aws-orange">{iss.pillar}</span>
              </div>
              <div className="text-[12px] font-bold leading-snug">{iss.msg}</div>
              <div className="text-[11px] text-muted mt-1 leading-snug">
                <span className="font-bold text-current">Fix:</span> {iss.fix}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =================================================================
// Cost
// =================================================================

function CostPanel({ nodes, region, onRegionChange }) {
  const est = useMemo(() => estimateMonthly(nodes, region), [nodes, region]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <DollarSign size={14} className="text-aws-orange" />
        <h3 className="text-sm font-extrabold">Monthly cost estimate</h3>
      </div>

      <div className="flex items-center gap-2">
        <Globe size={12} className="text-muted" />
        <select
          value={region}
          onChange={(e) => onRegionChange?.(e.target.value)}
          className="flex-1 bg-[var(--card-2)] border border-token rounded-lg px-2 py-1.5 text-xs font-bold focus-ring"
        >
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-token bg-[var(--card-2)]/30 p-3">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
          Estimated monthly
        </div>
        <div className="text-3xl font-black tabular-nums">
          ${est.total.toLocaleString()}
          <span className="text-sm text-muted">/mo</span>
        </div>
        <div className="text-[10px] text-muted mt-1">
          Includes a ~100 GB egress assumption. Excludes Reserved/Spot discounts.
        </div>
      </div>

      {est.rows.length > 0 && (
        <ul className="space-y-1 max-h-[280px] overflow-y-auto pr-1">
          {est.rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-token/40">
              <span className="truncate flex-1">{r.label}</span>
              <span className="text-[9px] uppercase font-bold text-muted mx-2">{r.category}</span>
              <span className="font-extrabold tabular-nums">${r.monthly.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5 text-[10px] text-muted leading-relaxed">
        <span className="font-bold text-aws-orange">Tip:</span> swap NAT Gateway for NAT Instance in dev, use Graviton
        + Spot for compute, and put cold data on S3 Glacier IA to cut 30–60% of cost.
      </div>
    </div>
  );
}

// =================================================================
// Security
// =================================================================

function SecurityPanel({ nodes }) {
  const cov = useMemo(() => securityCoverage(nodes), [nodes]);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-aws-orange" />
          <h3 className="text-sm font-extrabold">Security coverage</h3>
        </div>
        <ScoreBadge score={cov.score} suffix="%" />
      </div>
      <p className="text-[11px] text-muted">
        7-point baseline review. Add missing services to your diagram to lift the score.
      </p>

      <ul className="space-y-1.5">
        {cov.checks.map((c) => (
          <li
            key={c.id}
            className={cn(
              'flex items-center gap-2 rounded-lg px-2.5 py-2 border',
              c.ok ? 'border-success/30 bg-success/10' : 'border-token bg-[var(--card-2)]/30',
            )}
          >
            {c.ok ? (
              <CheckCircle2 size={14} className="text-success shrink-0" />
            ) : (
              <XCircle size={14} className="text-muted shrink-0" />
            )}
            <span className={cn('text-[12px] font-bold', !c.ok && 'text-muted')}>{c.label}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5 text-[10px] text-muted leading-relaxed">
        <span className="font-bold text-aws-orange">Defense in depth:</span> aim for IAM + KMS + CloudTrail + GuardDuty
        + Secrets Manager + WAF on every production architecture.
      </div>
    </div>
  );
}

// =================================================================
// Anti-patterns
// =================================================================

function AntiPatternPanel({ nodes, edges }) {
  const findings = useMemo(() => antiPatterns(nodes, edges), [nodes, edges]);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-aws-orange" />
        <h3 className="text-sm font-extrabold">Anti-pattern detector</h3>
      </div>
      <p className="text-[11px] text-muted">
        Things AWS Solutions Architects flag in design reviews. Aim for zero findings on production diagrams.
      </p>

      {findings.length === 0 ? (
        <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-[12px] flex items-center gap-2">
          <ShieldCheck size={14} className="text-success" />
          <span className="font-bold">No anti-patterns detected.</span>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {findings.map((f, i) => (
            <li key={i} className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={14} className="text-warning shrink-0" />
                <span className="text-[12px] font-extrabold">{f.title}</span>
              </div>
              <div className="text-[11px] text-muted leading-snug">{f.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =================================================================
// shared bits
// =================================================================

function TabBtn({ icon: Icon, label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-extrabold whitespace-nowrap transition',
        active
          ? 'bg-aws-orange/15 text-aws-orange'
          : disabled
            ? 'text-muted/50 cursor-not-allowed'
            : 'text-muted hover:text-current hover:bg-[var(--card-2)]'
      )}
    >
      <Icon size={11} /> {label}
    </button>
  );
}

function ScoreBadge({ score, suffix = '/100' }) {
  const tone =
    score >= 80 ? 'bg-success/10 text-success border-success/30'
    : score >= 60 ? 'bg-warning/10 text-warning border-warning/30'
    : 'bg-danger/10 text-danger border-danger/30';
  return (
    <span className={cn('chip border font-extrabold text-xs', tone)}>
      {score}{suffix}
    </span>
  );
}
