import { motion } from 'framer-motion';
import {
  AlertOctagon, BookOpen, CheckCircle2, ChevronDown, ChevronRight, Clock,
  Cloud, GraduationCap, Info, Lightbulb, Link as LinkIcon, MonitorSmartphone,
  RefreshCw, Sparkles, Target, Terminal, Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SmartMethodDetector } from '../common/SmartMethodDetector.jsx';
import { CombinedScriptsPanel } from '../common/CombinedScriptsPanel.jsx';
import { useAWS } from '../../context/AWSContext.jsx';
import { guideFor } from '../../data/stepGuide.js';
import { cn } from '../../lib/utils.js';

/**
 * StepGuide — a full study note attached to a project step or roadmap task.
 *
 * Renders:
 *  1. A teaching overview (what you'll learn / why / time / level / exam relevance)
 *  2. SmartMethodDetector with 4 tabs (Console / CLI / Terraform / CloudFormation)
 *  3. Verification + gotchas + docs + exam tip footer
 */
export function StepGuide({ step, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const guide = guideFor(step);
  const aws = useAWS();
  const activeProfile = aws?.state?.profiles?.[aws?.state?.activeProfile];
  const isConnected = !!activeProfile?.connected;

  // guideFor always returns something (generic fallback), so this only
  // fires for truly empty input.
  if (!guide) {
    return (
      <div className="mt-2 rounded-lg border border-token bg-[var(--card-2)]/30 px-3 py-2 text-[11px] text-muted leading-snug">
        <Lightbulb size={11} className="text-aws-orange inline mr-1" />
        No task selected.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border border-aws-orange/30 bg-aws-orange/[0.04] overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-aws-orange/[0.06] transition focus-ring"
        aria-expanded={open}
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg grid place-items-center bg-gradient-aws text-ink-950 shrink-0">
            <BookOpen size={14} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1">
              <Sparkles size={9} /> Study note · {guide.service.toUpperCase()}
            </div>
            <div className="text-sm font-extrabold tracking-tight truncate">{guide.title}</div>
            <div className="text-[11px] text-muted truncate mt-0.5">{guide.tagline}</div>
          </div>
        </div>
        {open ? <ChevronDown size={14} className="shrink-0 text-aws-orange" /> :
                <ChevronRight size={14} className="shrink-0 text-aws-orange" />}
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="border-t border-aws-orange/20"
        >
          <div className="p-4 space-y-4">
            {/* "Console UI verified" stamp — tells the user this walkthrough
                matches the CURRENT AWS console (May 2025+ redesign). */}
            <ConsoleFreshnessBadge guide={guide} />

            {/* Teaching overview */}
            <OverviewCard overview={guide.overview} />

            {/* Linked-account callout — context-aware */}
            <AccountCallout aws={aws} isConnected={isConnected} activeProfile={activeProfile} />

            {/* How-to-read-the-tabs explainer */}
            <TabsExplainer />

            {/* The 4-tab implementation panel — progressKey so each task remembers its position */}
            <SmartMethodDetector
              title={guide.title}
              signal={guide.signal}
              content={guide.content}
              progressKey={step?.id || guide.id || guide.title}
            />

            {/* Combined end-to-end script (CLI / Terraform / CloudFormation in one panel) */}
            <CombinedScriptsPanel
              title={guide.title}
              content={guide.content}
            />

            {/* Verification */}
            {guide.verify && (
              <div className="rounded-xl border border-success/30 bg-success/10 p-3 flex items-start gap-2.5">
                <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />
                <div className="text-[12px] leading-snug">
                  <span className="font-extrabold text-success">Verify it worked:</span> {guide.verify}
                </div>
              </div>
            )}

            {/* Gotchas */}
            {guide.gotchas?.length > 0 && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 space-y-1.5">
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-warning inline-flex items-center gap-1">
                  <AlertOctagon size={10} /> Watch out for
                </div>
                <ul className="space-y-1 text-[12px] leading-snug">
                  {guide.gotchas.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-warning mt-0.5">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Exam tip */}
            {guide.examTip && (
              <div className="rounded-xl border border-electric/30 bg-electric/10 p-3 flex items-start gap-2.5">
                <GraduationCap size={14} className="text-electric shrink-0 mt-0.5" />
                <div className="text-[12px] leading-snug">
                  <span className="font-extrabold text-electric">Exam tip:</span> {guide.examTip}
                </div>
              </div>
            )}

            {/* Docs link */}
            {guide.docs && (
              <a
                href={guide.docs}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-aws-orange hover:underline"
                aria-label={`Read the official AWS docs for ${guide.title}`}
              >
                <BookOpen size={11} /> Read the official AWS docs →
              </a>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// =================================================================
// Console freshness badge — confirms walkthrough matches CURRENT AWS UI
// =================================================================

/**
 * Walkthroughs we've manually reviewed against the current AWS Console
 * UI (the May 2025+ redesign). When you re-review one, bump the date.
 * The badge shows green ("verified") if reviewed within the last 6 months,
 * amber ("ageing") between 6-12, red ("stale") past 12.
 */
const CONSOLE_REVIEW_DATES = {
  's3-bucket':    '2026-05-23',
  'mfa':          '2026-05-23',
  'aws-account':  '2026-05-23',
};

function ConsoleFreshnessBadge({ guide }) {
  const reviewedAt = CONSOLE_REVIEW_DATES[guide.id];
  if (!reviewedAt) {
    return (
      <div className="rounded-lg border border-warning/30 bg-warning/[0.05] px-3 py-2 text-[11px] flex items-center gap-2">
        <AlertOctagon size={11} className="text-warning shrink-0" />
        <span>
          <strong className="text-warning">Note:</strong> This walkthrough hasn't been re-verified against
          the latest AWS Console UI yet. Steps may use older terminology — check the official
          AWS docs link at the bottom if anything looks different.
        </span>
        <a href="https://aws.amazon.com/about-aws/whats-new/recent/" target="_blank" rel="noreferrer"
           className="ml-auto text-warning underline shrink-0 font-bold">
          AWS What's New →
        </a>
      </div>
    );
  }
  const days = Math.round((Date.now() - new Date(reviewedAt).getTime()) / 86400000);
  let tone, label;
  if (days <= 180)      { tone = 'success';  label = 'Verified against current AWS Console UI'; }
  else if (days <= 365) { tone = 'warning';  label = 'Last verified — may have minor drift'; }
  else                  { tone = 'danger';   label = 'Stale — re-verify before relying on screenshots'; }

  return (
    <div className={`rounded-lg border bg-[var(--card-2)]/40 px-3 py-2 text-[11px] flex items-center gap-2 ${
      tone === 'success' ? 'border-success/30' : tone === 'warning' ? 'border-warning/30' : 'border-danger/30'
    }`}>
      <CheckCircle2 size={11} className={`shrink-0 ${
        tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger'
      }`} />
      <span>
        <strong className={
          tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger'
        }>{label}</strong>
        <span className="opacity-70 ml-1">· Last reviewed {reviewedAt} ({days} day{days === 1 ? '' : 's'} ago)</span>
      </span>
      <a href="/updates" className="ml-auto text-electric underline shrink-0 font-bold flex items-center gap-1">
        <RefreshCw size={9} /> Check for updates
      </a>
    </div>
  );
}

// =================================================================
// Overview card — the "study note header" with key learning meta
// =================================================================

function OverviewCard({ overview }) {
  if (!overview) return null;
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-4 space-y-3">
      {/* Why it matters */}
      {overview.whyItMatters && (
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1 inline-flex items-center gap-1">
            <Target size={9} /> Why this matters
          </div>
          <p className="text-[12px] leading-relaxed">{overview.whyItMatters}</p>
        </div>
      )}

      {/* What you'll learn */}
      {overview.whatYouLearn?.length > 0 && (
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1 inline-flex items-center gap-1">
            <Lightbulb size={9} /> What you'll learn
          </div>
          <ul className="space-y-0.5 text-[12px] leading-snug">
            {overview.whatYouLearn.map((x, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-aws-orange mt-0.5">▸</span>
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Meta row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <MetaItem icon={Clock} label="Time" value={overview.time} />
        <MetaItem icon={GraduationCap} label="Level" value={overview.level} />
        <MetaItem icon={BookOpen} label="Exam" value={overview.examRelevance} />
        <MetaItem icon={CheckCircle2} label="Prereqs" value={`${overview.prerequisites?.length || 0} item${overview.prerequisites?.length === 1 ? '' : 's'}`} />
      </div>

      {/* Prerequisites */}
      {overview.prerequisites?.length > 0 && (
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">Prerequisites</div>
          <ul className="space-y-0.5 text-[11px] text-muted leading-snug">
            {overview.prerequisites.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-muted mt-0.5">○</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetaItem({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-token bg-[var(--card)] p-2">
      <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-muted">
        <Icon size={9} /> {label}
      </div>
      <div className={cn('text-[11px] font-extrabold mt-0.5 leading-snug', !value && 'text-muted')}>
        {value || '—'}
      </div>
    </div>
  );
}

// =================================================================
// Linked-account callout — shows which AWS account commands will run against
// =================================================================

function AccountCallout({ aws, isConnected, activeProfile }) {
  if (!aws) return null;
  // Connected: green pill — commands ready to run against this profile.
  if (isConnected) {
    const tier = aws.effectiveTier || { tier: 'unknown' };
    const tierBadge =
      tier.tier === 'free' ? { label: '🟢 Free Tier active', cls: 'border-success/40 bg-success/10 text-success' }
      : tier.tier === 'paid' ? { label: '🟡 Paid (past 12mo)', cls: 'border-warning/40 bg-warning/10 text-warning' }
      : null;
    return (
      <div className="rounded-lg border border-success/30 bg-success/10 p-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <Cloud size={14} className="text-success shrink-0 mt-0.5" />
          <div className="text-[12px] leading-snug flex-1">
            <span className="font-extrabold text-success">Ready to run against {activeProfile.name}.</span>
            {' '}Replace any placeholder values (e.g. <code className="text-aws-orange">acme-prod-eu-west-2</code>) with your own,
            then run the CLI commands in your terminal — they'll hit your linked account.{' '}
            <span className="text-warning font-bold">AWS Account Manager previews plans only. Use Deploy Console for evidence-backed AWS writes.</span>
          </div>
          <Link to="/aws-accounts" className="shrink-0 text-[10px] font-bold text-success hover:underline whitespace-nowrap">
            Switch profile →
          </Link>
        </div>
        {tierBadge && (
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className={cn('chip border font-bold', tierBadge.cls)}>{tierBadge.label}</span>
            <span className="text-muted">{tier.reason}</span>
          </div>
        )}
      </div>
    );
  }
  // Not connected: prompt them to link
  return (
    <div className="rounded-lg border border-electric/30 bg-electric/10 p-3 flex items-start gap-2.5">
      <LinkIcon size={14} className="text-electric shrink-0 mt-0.5" />
      <div className="text-[12px] leading-snug flex-1">
        <span className="font-extrabold text-electric">No AWS account linked yet.</span>
        {' '}You can still read + copy these commands. To run them against a real account,
        link one in the AWS Account Manager. You can link <strong className="text-current">two profiles</strong> —
        Free Tier (personal) and Client — and switch between them.
      </div>
      <Link to="/aws-accounts" className="shrink-0 text-[10px] font-bold text-electric hover:underline whitespace-nowrap">
        Link account →
      </Link>
    </div>
  );
}

// =================================================================
// Tabs explainer — clears up "is the CLI script the full thing or step 1?"
// =================================================================

function TabsExplainer() {
  return (
    <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3 space-y-2">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1">
        <Info size={9} /> How to read the tabs below
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
        <div className="flex items-start gap-2">
          <MonitorSmartphone size={12} className="text-aws-orange shrink-0 mt-0.5" />
          <span><strong className="text-current">Console</strong> = numbered click-by-click steps in the AWS web UI.</span>
        </div>
        <div className="flex items-start gap-2">
          <Terminal size={12} className="text-aws-orange shrink-0 mt-0.5" />
          <span><strong className="text-current">CLI</strong> = the <strong>complete script</strong> (all commands together), run in order from your terminal.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-aws-orange shrink-0 mt-0.5 text-xs">🔧</span>
          <span><strong className="text-current">Terraform</strong> = the <strong>full .tf file</strong> — one <code>terraform apply</code> provisions everything.</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-aws-orange shrink-0 mt-0.5 text-xs">📋</span>
          <span><strong className="text-current">CloudFormation</strong> = the <strong>full YAML template</strong> — deploy as one stack.</span>
        </div>
      </div>
    </div>
  );
}
