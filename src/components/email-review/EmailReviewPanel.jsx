/**
 * EmailReviewPanel.jsx — renders the 2-agent email review.
 *
 * Props mirror runEmailReview() input:
 *   subject, body, recipient, intent, fromName, hasUnsubscribe
 */

import { useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp,
  Info, Mail, Users,
} from 'lucide-react';
import { runEmailReview } from '../../lib/emailAgents/master.js';
import { cn } from '../../lib/utils.js';

const SEV_TONE = {
  critical: { class: 'border-danger/40 bg-danger/5 text-danger',  icon: AlertCircle },
  high:     { class: 'border-danger/40 bg-danger/5 text-danger',  icon: AlertTriangle },
  medium:   { class: 'border-warning/40 bg-warning/5 text-warning', icon: AlertTriangle },
  low:      { class: 'border-sky-400/40 bg-sky-400/5 text-sky-300', icon: Info },
  info:     { class: 'border-success/40 bg-success/5 text-success', icon: CheckCircle2 },
};

const GRADE_TONE = {
  success: 'text-success border-success/40 bg-success/10',
  warning: 'text-warning border-warning/40 bg-warning/10',
  danger:  'text-danger  border-danger/40  bg-danger/10',
};

export function EmailReviewPanel({
  subject = '', body = '', recipient = {}, intent = 'outreach',
  fromName = '', hasUnsubscribe = false, className = '',
}) {
  const review = useMemo(
    () => runEmailReview({ subject, body, recipient, intent, fromName, hasUnsubscribe }),
    [subject, body, recipient, intent, fromName, hasUnsubscribe]
  );

  const [filter, setFilter] = useState('all');
  const [expandedAgents, setExpandedAgents] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return review.findings;
    return review.findings.filter((f) => f.severity === filter);
  }, [review.findings, filter]);

  return (
    <div className={cn('surface rounded-2xl p-5 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            EMAIL-01 · 2-agent review
          </div>
          <h3 className="text-[15px] font-extrabold flex items-center gap-2">
            <Mail size={15} className="text-aws-orange" />
            Deliverability + Outreach experts reviewed your email
          </h3>
          <p className="text-[11.5px] opacity-70 mt-0.5">
            Mason Reilly (Deliverability) · Devi Patel (Outreach Strategy)
            <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] opacity-60 italic">
              · Rule-engine mode (deterministic)
            </span>
          </p>
        </div>

        <div className={cn(
          'inline-flex flex-col items-center justify-center rounded-2xl border px-4 py-2 min-w-[90px]',
          GRADE_TONE[review.grade.tone]
        )}>
          <div className="text-2xl font-extrabold leading-none">{review.grade.letter}</div>
          <div className="text-[10px] font-bold opacity-80 mt-0.5">{review.score}/100</div>
        </div>
      </div>

      {/* Summary banner */}
      <div className={cn(
        'rounded-xl border p-3 text-[12.5px]',
        review.criticalCount > 0 ? 'border-danger/40 bg-danger/5'
        : review.highCount > 0   ? 'border-warning/40 bg-warning/5'
        : 'border-success/40 bg-success/5'
      )}>
        {review.criticalCount > 0 && (
          <><strong className="block mb-0.5">{review.criticalCount} critical deliverability issue(s)</strong>
          <span className="opacity-90">This email will likely land in spam or get flagged. Fix the critical items before sending.</span></>
        )}
        {review.criticalCount === 0 && review.highCount > 0 && (
          <><strong className="block mb-0.5">{review.highCount} high-impact issue(s)</strong>
          <span className="opacity-90">The email will probably deliver but reply rates will be low. Address the high items.</span></>
        )}
        {review.criticalCount === 0 && review.highCount === 0 && (
          <><strong className="block mb-0.5">Email looks good</strong>
          <span className="opacity-90">No critical or high issues. Review the medium polish items if you want to lift it further.</span></>
        )}
      </div>

      {/* Counts strip */}
      <div className="flex flex-wrap gap-1.5">
        <SeverityChip label="All" count={review.findings.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        {review.criticalCount > 0 && <SeverityChip label="Critical" count={review.criticalCount} severity="critical" active={filter === 'critical'} onClick={() => setFilter('critical')} />}
        {review.highCount     > 0 && <SeverityChip label="High"     count={review.highCount}     severity="high"     active={filter === 'high'}     onClick={() => setFilter('high')} />}
        {review.mediumCount   > 0 && <SeverityChip label="Medium"   count={review.mediumCount}   severity="medium"   active={filter === 'medium'}   onClick={() => setFilter('medium')} />}
        {review.lowCount      > 0 && <SeverityChip label="Low"      count={review.lowCount}      severity="low"      active={filter === 'low'}      onClick={() => setFilter('low')} />}
      </div>

      {/* Per-agent breakdown */}
      <div>
        <button
          onClick={() => setExpandedAgents((e) => !e)}
          className="w-full flex items-center justify-between gap-2 text-left text-[12px] font-bold opacity-80 hover:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} className="text-aws-orange" />
            Per-agent breakdown
          </span>
          {expandedAgents ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {expandedAgents && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {review.perAgent.map(({ id, name, role, yearsExperience, findings, score }) => (
              <div key={id} className="rounded-xl bg-[var(--card-2)] border border-token p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[12px] font-extrabold">{name}</div>
                  <div className={cn(
                    'text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full',
                    score >= 90 ? 'bg-success/20 text-success' :
                    score >= 70 ? 'bg-warning/20 text-warning' :
                    'bg-danger/20 text-danger'
                  )}>
                    {score}/100
                  </div>
                </div>
                <div className="text-[10.5px] opacity-70 mb-1">{role} · {yearsExperience}+ years</div>
                <div className="text-[11px]">
                  {findings.length === 0
                    ? <span className="text-success">✓ No issues raised</span>
                    : `${findings.length} finding${findings.length === 1 ? '' : 's'}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-6 opacity-65 text-[12.5px]">
            {filter === 'all'
              ? 'No findings — email looks clean across both agents.'
              : `No ${filter}-severity findings.`}
          </div>
        ) : filtered.map((f, i) => <FindingCard key={i} finding={f} />)}
      </div>

      <div className="text-[10.5px] opacity-55 italic leading-relaxed pt-2 border-t border-token">
        <strong>Honest scope:</strong> Rule engines, not LLMs. Catch ~80% of common email
        mistakes (spam triggers, weak hooks, missing CTAs). For voice-perfect rewrites,
        upgrade to LLM mode (Anthropic API).
      </div>
    </div>
  );
}

function SeverityChip({ label, count, severity, active, onClick }) {
  const tone = severity ? SEV_TONE[severity]?.class : 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange';
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition',
        active ? tone : 'border-token opacity-70 hover:opacity-100'
      )}
    >
      {label} <span className="opacity-70">·</span> <strong>{count}</strong>
    </button>
  );
}

function FindingCard({ finding }) {
  const [expanded, setExpanded] = useState(false);
  const tone = SEV_TONE[finding.severity] || SEV_TONE.info;
  const Icon = tone.icon;
  return (
    <div className={cn('rounded-xl border', tone.class.replace('text-', 'border-l-4 border-l-'))}>
      <button onClick={() => setExpanded((e) => !e)} className="w-full p-3 text-left">
        <div className="flex items-start gap-2">
          <Icon size={14} className={cn('mt-0.5 flex-shrink-0')} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className={cn('px-1.5 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase', tone.class)}>
                {finding.severity}
              </span>
              <span className="text-[10px] opacity-65">{finding.agentName}</span>
              {finding.ruleId && (
                <code className="text-[9.5px] opacity-50 font-mono">{finding.ruleId}</code>
              )}
            </div>
            <div className="text-[12.5px] font-bold leading-snug">{finding.title}</div>
          </div>
          {expanded ? <ChevronUp size={11} className="opacity-50 flex-shrink-0" /> : <ChevronDown size={11} className="opacity-50 flex-shrink-0" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 -mt-1 space-y-2 text-[11.5px]">
          <p className="opacity-90 leading-relaxed">{finding.body}</p>
          {finding.fix && (
            <div className="rounded-lg bg-[var(--card-2)] border border-token p-2.5">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
                Fix
              </div>
              <p className="opacity-90 leading-relaxed">{finding.fix}</p>
            </div>
          )}
          {finding.evidence && (
            <div className="text-[10.5px] opacity-60 italic">Evidence: {finding.evidence}</div>
          )}
        </div>
      )}
    </div>
  );
}
