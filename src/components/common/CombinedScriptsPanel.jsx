/**
 * CombinedScriptsPanel.jsx — shows the FULL CLI / Terraform / CloudFormation
 * script for a walkthrough, split into clickable sections that you can copy
 * individually OR all-in-one.
 *
 * Each tab returns an array of `{ id, title, body, lang }` segments.
 * The pill bar at top is clickable — click a pill, the matching section
 * scrolls into view and flashes briefly.
 *
 * Per-section + whole-script copy + download. Each individual section has
 * its own anchor id and copy button.
 */
import { useRef, useState } from 'react';
import {
  Code2, Download, ClipboardCopy, Terminal, FileCode, Sparkles, CheckCircle2,
  ArrowDown, ShieldAlert, Info, ChevronDown, ChevronRight,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAWS } from '../../context/AWSContext.jsx';
import { cn } from '../../lib/utils.js';

const TABS = [
  { id: 'cli',            label: 'Full Bash CLI',          icon: Terminal, ext: 'sh',   mime: 'text/x-shellscript', lang: 'bash' },
  { id: 'terraform',      label: 'Full Terraform',          icon: Code2,    ext: 'tf',   mime: 'text/plain',         lang: 'hcl'  },
  { id: 'cloudformation', label: 'Full CloudFormation',     icon: FileCode, ext: 'yaml', mime: 'text/yaml',          lang: 'yaml' },
];

export function CombinedScriptsPanel({ title, content = {} }) {
  const [tab, setTab] = useState('cli');
  const [flashId, setFlashId] = useState(null);
  const scrollRef = useRef(null);
  const sectionRefs = useRef({});
  const toast = useToast();

  // Each builder now returns SEGMENTS (one per section), plus notes.
  const scripts = {
    cli:            combineCli(content.cli),
    terraform:      combineTerraform(content.terraform),
    cloudformation: combineCfn(content.cloudformation),
  };

  const active = scripts[tab];
  const meta = TABS.find((t) => t.id === tab);

  function fullBody() {
    return active.segments.map((s) => s.body).join('\n');
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(fullBody());
      toast.success(`${meta.label} copied`);
    } catch {
      toast.error('Could not copy — your browser blocked clipboard access.');
    }
  }

  async function copySegment(segment) {
    try {
      await navigator.clipboard.writeText(segment.body);
      toast.success(`${segment.title} copied`);
    } catch {
      toast.error('Copy blocked.');
    }
  }

  function downloadAll() {
    const filename = `${slug(title)}.${meta.ext}`;
    const blob = new Blob([fullBody()], { type: meta.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function jumpTo(segmentId) {
    const el = sectionRefs.current[segmentId];
    if (el && scrollRef.current) {
      // Smooth scroll within the panel container
      const containerTop = scrollRef.current.getBoundingClientRect().top;
      const elTop = el.getBoundingClientRect().top;
      scrollRef.current.scrollBy({ top: elTop - containerTop - 12, behavior: 'smooth' });
      setFlashId(segmentId);
      setTimeout(() => setFlashId(null), 1500);
    }
  }

  // Don't render if there's nothing at all
  const anyHasSegments = Object.values(scripts).some((s) => s.segments.length > 0);
  if (!anyHasSegments) return null;

  return (
    <div className="mt-4 rounded-2xl border border-electric/30 bg-electric/[0.03] overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-electric/20">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-electric" />
          <h4 className="text-sm font-extrabold tracking-tight">Full end-to-end script</h4>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-electric ml-1">All-in-one</span>
        </div>
        <p className="text-[11px] opacity-70 leading-snug">
          The entire walkthrough as a single script — split into sections you can copy individually
          or download as one file. Skip the console clicks and run it from your terminal /
          Terraform / CloudFormation deploy.
        </p>
      </div>

      {/* SAFETY EXPLAINER — what these scripts actually do */}
      <SafetyExplainer />

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-[var(--card-2)]/40 border-b border-electric/20 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const has = scripts[t.id].segments.length > 0;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => has && setTab(t.id)}
              disabled={!has}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition',
                isActive ? 'bg-gradient-aws text-ink-950 shadow-glow-orange' : 'text-muted hover:text-current',
                !has && 'opacity-30 cursor-not-allowed'
              )}
            >
              <Icon size={12} />
              {t.label}
              {!has && <span className="text-[9px] opacity-60">(n/a)</span>}
            </button>
          );
        })}
      </div>

      {/* Section jump-nav (CLICKABLE pills) */}
      {active.segments.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-60 mb-1.5 flex items-center gap-1.5">
            <ArrowDown size={9} /> Jump to section
          </div>
          <div className="flex flex-wrap gap-1.5">
            {active.segments.map((seg, i) => (
              <button
                key={seg.id}
                onClick={() => jumpTo(seg.id)}
                className={cn(
                  'text-[10px] font-bold px-2.5 py-1 rounded-md border transition flex items-center gap-1',
                  flashId === seg.id
                    ? 'bg-gradient-aws text-ink-950 border-aws-orange shadow-glow-orange'
                    : 'bg-electric/10 text-electric border-electric/40 hover:bg-electric/20 hover:border-electric'
                )}
                title={`Jump to ${seg.title}`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-current/20 grid place-items-center text-[9px] font-extrabold">{i + 1}</span>
                {seg.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Per-section scrollable body */}
      <div
        ref={scrollRef}
        className="max-h-[520px] overflow-y-auto px-4 py-3 space-y-3"
      >
        {active.segments.map((seg, i) => (
          <div
            key={seg.id}
            ref={(el) => { if (el) sectionRefs.current[seg.id] = el; }}
            className={cn(
              'rounded-lg border bg-[var(--card-2)]/40 overflow-hidden transition-all',
              flashId === seg.id ? 'border-aws-orange shadow-glow-orange ring-2 ring-aws-orange/30' : 'border-token'
            )}
          >
            {/* Section header — also clickable to scroll into focus */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-token bg-[var(--card)]/60">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest">
                <span className="w-4 h-4 rounded-full bg-electric/20 text-electric grid place-items-center text-[9px]">
                  {i + 1}
                </span>
                <span className="text-electric">{seg.title}</span>
                {seg.lang && (
                  <span className="opacity-60 ml-1 font-mono normal-case">· {seg.lang}</span>
                )}
              </div>
              <button
                onClick={() => copySegment(seg)}
                className="text-[10px] flex items-center gap-1 opacity-70 hover:opacity-100 px-1.5 py-0.5 rounded hover:bg-[var(--card)]"
                title={`Copy this section (${seg.title})`}
              >
                <ClipboardCopy size={10} /> Copy this section
              </button>
            </div>

            {/* Code block */}
            <pre className="px-3 py-2 text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
{seg.body}
            </pre>
          </div>
        ))}

        {active.segments.length === 0 && (
          <div className="text-center py-6 text-xs text-muted">
            No {meta.label.toLowerCase()} script provided for this walkthrough yet.
          </div>
        )}
      </div>

      {/* Notes / what to expect */}
      {active.notes && active.notes.length > 0 && (
        <div className="px-4 pb-3">
          <div className="rounded-lg border border-success/30 bg-success/[0.04] p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-1.5 flex items-center gap-1">
              <CheckCircle2 size={10} /> After running
            </div>
            <ul className="space-y-1 text-[11px]">
              {active.notes.map((n, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-success mt-0.5">›</span>
                  <span>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Whole-script action bar */}
      {active.segments.length > 0 && (
        <div className="px-4 pb-4 flex items-center gap-2 flex-wrap border-t border-electric/10 pt-3">
          <span className="text-[10px] uppercase tracking-widest font-extrabold opacity-60 mr-1">
            All-in-one:
          </span>
          <button
            onClick={copyAll}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-gradient-aws text-ink-950 hover:brightness-110 flex items-center gap-1.5"
          >
            <ClipboardCopy size={11} /> Copy entire script
          </button>
          <button
            onClick={downloadAll}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card)] flex items-center gap-1.5"
          >
            <Download size={11} /> Download .{meta.ext}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Per-method segment builders.
// Each returns: { segments: [{ id, title, body, lang }], notes: string[] }
// ═══════════════════════════════════════════════════════════════════

function combineCli(cli) {
  if (!cli) return { segments: [], notes: [] };
  const segments = [];

  // Header preamble
  segments.push({
    id: 'cli-header',
    title: 'Preamble',
    lang: 'bash',
    body: [
      '#!/usr/bin/env bash',
      '# Generated by AWS Career Launchpad Pro — end-to-end deploy script.',
      '# Review each step before running. Replace placeholders with your real values.',
      'set -euo pipefail',
    ].join('\n'),
  });

  if (cli.command) {
    segments.push({
      id: 'cli-deploy',
      title: 'Deploy',
      lang: 'bash',
      body: '# ─── DEPLOY ─────────────────────────────────────────────\n' + cli.command,
    });
  }

  if (cli.verifyCommand) {
    segments.push({
      id: 'cli-verify',
      title: 'Verify',
      lang: 'bash',
      body: '# ─── VERIFY ─────────────────────────────────────────────\n' + cli.verifyCommand,
    });
  }

  const notes = [
    cli.expected && `Expected output: ${cli.expected.split('\n')[0]}`,
    ...(cli.gotchas?.map((g) => typeof g === 'string' ? g : `${g.problem} — ${g.fix}`) || []),
  ].filter(Boolean);

  return { segments, notes };
}

function combineTerraform(tf) {
  if (!tf) return { segments: [], notes: [] };
  const segments = [];

  segments.push({
    id: 'tf-preamble',
    title: 'About',
    lang: 'hcl',
    body: [
      '# Generated by AWS Career Launchpad Pro — full Terraform module.',
      '# Save as main.tf then run the commands below.',
    ].join('\n'),
  });

  if (tf.code) {
    segments.push({
      id: 'tf-main',
      title: 'main.tf',
      lang: 'hcl',
      body: '# ─── main.tf ────────────────────────────────────────────\n' + tf.code,
    });
  }

  if (tf.commands) {
    const cmds = tf.commands.split('\n').map((l) => `# ${l}`).join('\n');
    segments.push({
      id: 'tf-commands',
      title: 'init / plan / apply',
      lang: 'bash',
      body: '# ─── Commands (run from the same directory) ─────────────\n' + cmds,
    });
  }

  const notes = [
    tf.expected && `Expected: ${tf.expected.split('\n')[0]}`,
    ...(tf.errors?.map((e) => `${e.problem} — ${e.fix}`) || []),
  ].filter(Boolean);

  return { segments, notes };
}

function combineCfn(cfn) {
  if (!cfn) return { segments: [], notes: [] };
  const segments = [];

  segments.push({
    id: 'cfn-preamble',
    title: 'About',
    lang: 'yaml',
    body: [
      '# Generated by AWS Career Launchpad Pro — full CloudFormation template.',
      '# Save as template.yaml, then deploy with the command below.',
    ].join('\n'),
  });

  if (cfn.template) {
    segments.push({
      id: 'cfn-template',
      title: 'template.yaml',
      lang: 'yaml',
      body: '# ─── template.yaml ──────────────────────────────────────\n' + cfn.template,
    });
  }

  if (cfn.deployCommand) {
    const cmds = cfn.deployCommand.split('\n').map((l) => `# ${l}`).join('\n');
    segments.push({
      id: 'cfn-deploy',
      title: 'aws cloudformation deploy',
      lang: 'bash',
      body: '# ─── Deploy ──────────────────────────────────────────────\n' + cmds,
    });
  }

  if (cfn.verifyCommand) {
    const cmds = cfn.verifyCommand.split('\n').map((l) => `# ${l}`).join('\n');
    segments.push({
      id: 'cfn-verify',
      title: 'describe-stacks',
      lang: 'bash',
      body: '# ─── Verify ──────────────────────────────────────────────\n' + cmds,
    });
  }

  const notes = (cfn.errors || []).map((e) => `${e.problem} — ${e.fix}`);
  return { segments, notes };
}

function slug(s) {
  return (s || 'aws')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

// ═══════════════════════════════════════════════════════════════════
// SafetyExplainer — collapsible panel that explains EXACTLY what these
// scripts do, where they run, and what they affect. Designed to surface
// the answer the user really needs BEFORE they paste anything into a
// terminal.
// ═══════════════════════════════════════════════════════════════════

function SafetyExplainer() {
  const [open, setOpen] = useState(false);
  const aws = useAWS();
  const activeProfile = aws?.state?.profiles?.[aws?.state?.activeProfile];
  const region = activeProfile?.region || 'eu-west-1';
  const accountId = activeProfile?.identity?.account;

  return (
    <div className="border-b border-electric/20 bg-warning/[0.04]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left hover:bg-warning/[0.07] transition"
      >
        <ShieldAlert size={13} className="text-warning shrink-0" />
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-warning flex-1">
          Before you run this — what these scripts actually do
        </span>
        {open ? <ChevronDown size={12} className="text-warning" /> : <ChevronRight size={12} className="text-warning" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 text-[11px]">
          {/* TL;DR row */}
          <div className="rounded-lg bg-[var(--card)]/60 border border-warning/30 p-3">
            <div className="font-extrabold text-warning mb-1.5 flex items-center gap-1.5">
              <Info size={11} /> TL;DR
            </div>
            <ul className="space-y-1 leading-snug">
              <li>
                <strong>✅ Affects:</strong> Resources in <code className="px-1 rounded bg-[var(--card-2)]">{accountId || 'YOUR AWS account'}</code>
                {' '}in region <code className="px-1 rounded bg-[var(--card-2)]">{region}</code>.
                Real AWS API calls. Real billing impact.
              </li>
              <li>
                <strong>❌ Does NOT affect:</strong> Your laptop OS, other apps, other AWS accounts,
                this app's localhost, or anything outside the cwd (except Terraform's <code className="px-1 rounded bg-[var(--card-2)]">terraform.tfstate</code> file).
              </li>
              <li>
                <strong>📍 Runs:</strong> In YOUR terminal — copy the script, paste it into PowerShell / bash, hit enter.
                The script then talks to <code className="px-1 rounded bg-[var(--card-2)]">api.aws.amazon.com</code> over HTTPS.
              </li>
            </ul>
          </div>

          {/* The diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border border-token bg-[var(--card)]/60 p-2.5">
              <div className="text-[9px] uppercase tracking-widest font-extrabold text-electric mb-1">
                🐚 Bash CLI
              </div>
              <div className="leading-snug opacity-90">
                Runs in your terminal. Each <code className="px-1 rounded bg-[var(--card-2)]">aws ...</code> call
                hits AWS API directly. Atomic — no rollback if one fails mid-script.
              </div>
            </div>
            <div className="rounded-lg border border-token bg-[var(--card)]/60 p-2.5">
              <div className="text-[9px] uppercase tracking-widest font-extrabold text-electric mb-1">
                🔧 Terraform
              </div>
              <div className="leading-snug opacity-90">
                Runs in your terminal. <code className="px-1 rounded bg-[var(--card-2)]">terraform plan</code> shows
                exactly what will change BEFORE applying. State stored in <code className="px-1 rounded bg-[var(--card-2)]">terraform.tfstate</code>.
              </div>
            </div>
            <div className="rounded-lg border border-token bg-[var(--card)]/60 p-2.5">
              <div className="text-[9px] uppercase tracking-widest font-extrabold text-electric mb-1">
                📋 CloudFormation
              </div>
              <div className="leading-snug opacity-90">
                Runs in your terminal. AWS keeps track of every resource as a "stack" —
                <code className="px-1 rounded bg-[var(--card-2)]">aws cloudformation delete-stack</code> cleans up everything created.
              </div>
            </div>
          </div>

          {/* Pre-requisites */}
          <div className="rounded-lg border border-token bg-[var(--card)]/60 p-3">
            <div className="font-extrabold mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-success" />
              Before running — make sure you have ALL of these
            </div>
            <ol className="space-y-1 leading-snug list-decimal pl-5">
              <li>
                <strong>AWS CLI installed</strong> — verify with <code className="px-1 rounded bg-[var(--card-2)]">aws --version</code>.
                Install: <code className="px-1 rounded bg-[var(--card-2)]">winget install Amazon.AWSCLI</code> (Windows) or <code className="px-1 rounded bg-[var(--card-2)]">brew install awscli</code> (Mac).
              </li>
              <li>
                <strong>Credentials configured</strong> — run <code className="px-1 rounded bg-[var(--card-2)]">aws configure</code> once and paste your
                access key + secret + region <code className="px-1 rounded bg-[var(--card-2)]">{region}</code>.
              </li>
              <li>
                <strong>Identity check</strong> — run <code className="px-1 rounded bg-[var(--card-2)]">aws sts get-caller-identity</code>.
                Confirm the Account field equals <code className="px-1 rounded bg-[var(--card-2)]">{accountId || 'YOUR account ID'}</code>.
              </li>
              <li>
                <strong>For Terraform scripts</strong> — install Terraform: <code className="px-1 rounded bg-[var(--card-2)]">winget install HashiCorp.Terraform</code>.
              </li>
            </ol>
          </div>

          {/* Safety drill */}
          <div className="rounded-lg border border-warning/30 bg-warning/[0.05] p-3">
            <div className="font-extrabold text-warning mb-1.5 flex items-center gap-1.5">
              <ShieldAlert size={11} /> Always do a dry-run first
            </div>
            <ul className="space-y-1 leading-snug">
              <li>🐚 <strong>CLI:</strong> add <code className="px-1 rounded bg-[var(--card-2)]">--dry-run</code> where supported (EC2, S3) — validates IAM without making changes.</li>
              <li>🔧 <strong>Terraform:</strong> always run <code className="px-1 rounded bg-[var(--card-2)]">terraform plan</code> before <code className="px-1 rounded bg-[var(--card-2)]">terraform apply</code>. Plan is FREE + shows every resource that will be created/changed/deleted.</li>
              <li>📋 <strong>CloudFormation:</strong> add <code className="px-1 rounded bg-[var(--card-2)]">--no-execute-changeset</code> to create a preview change set without applying.</li>
              <li>✅ Then use the <strong>"Check my work"</strong> button in this app — it queries AWS to confirm the resource exists.</li>
            </ul>
          </div>

          {/* Cleanup */}
          <div className="rounded-lg border border-success/30 bg-success/[0.05] p-3">
            <div className="font-extrabold text-success mb-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={11} /> When you're done — delete what you created
            </div>
            <ul className="space-y-1 leading-snug">
              <li>🐚 <strong>CLI:</strong> manually run the matching delete commands (e.g. <code className="px-1 rounded bg-[var(--card-2)]">aws s3 rb s3://your-bucket --force</code>).</li>
              <li>🔧 <strong>Terraform:</strong> <code className="px-1 rounded bg-[var(--card-2)]">terraform destroy</code> — removes everything Terraform created. Clean.</li>
              <li>📋 <strong>CloudFormation:</strong> <code className="px-1 rounded bg-[var(--card-2)]">aws cloudformation delete-stack --stack-name …</code> — AWS tears down every resource in the stack.</li>
              <li>💰 Forgetting to delete = ongoing charges past Free Tier. Check the Deploy Console / Budgets / Cost Anomaly Detection regularly.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
