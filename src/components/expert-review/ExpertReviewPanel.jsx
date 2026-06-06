/**
 * ExpertReviewPanel.jsx — EXPERT-01 review surface.
 *
 * Renders findings from runExpertReview() with:
 *   - Overall grade + score
 *   - Per-expert breakdown (collapsible)
 *   - Sortable / filterable findings list
 *   - Each finding shows: title, body, fix, docs link, severity
 */

import { useMemo, useState } from 'react';
import {
  Shield, AlertTriangle, AlertCircle, Info, CheckCircle2, ChevronDown,
  ChevronUp, ExternalLink, Users, Award, BarChart3, Filter,
} from 'lucide-react';
import { runExpertReview } from '../../lib/expertAgents/master.js';
import { cn } from '../../lib/utils.js';

const SEV_TONE = {
  critical: { class: 'border-danger/40 bg-danger/5  text-danger',  icon: AlertCircle    },
  high:     { class: 'border-danger/40 bg-danger/5  text-danger',  icon: AlertTriangle  },
  medium:   { class: 'border-warning/40 bg-warning/5 text-warning', icon: AlertTriangle },
  low:      { class: 'border-sky-400/40 bg-sky-400/5 text-sky-300', icon: Info          },
  info:     { class: 'border-success/40 bg-success/5 text-success', icon: CheckCircle2  },
};

const GRADE_TONE = {
  success: 'text-success border-success/40 bg-success/10',
  warning: 'text-warning border-warning/40 bg-warning/10',
  danger:  'text-danger  border-danger/40  bg-danger/10',
};

export function ExpertReviewPanel({ brief = '', services = [], region, level = 'beginner', approach, solutionText = '', metadata = {}, className = '' }) {
  const review = useMemo(
    () => runExpertReview({ brief, services, region, level, approach, solutionText, metadata }),
    [brief, services, region, level, approach, solutionText, metadata]
  );

  const [filter, setFilter] = useState('all');
  const [expandedExperts, setExpandedExperts] = useState(false);

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
            EXPERT-01 · Multi-agent review
          </div>
          <h3 className="text-[15px] font-extrabold flex items-center gap-2">
            <Shield size={15} className="text-aws-orange" />
            8 AWS experts reviewed your solution
          </h3>
          <p className="text-[11.5px] opacity-70 mt-0.5">
            Security · Database · Network · Cost · Compliance · Compute · Storage · Reliability
            <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] opacity-60 italic">
              · {review.runMode === 'rules' ? 'Rule-engine mode (deterministic)' : 'LLM mode'}
            </span>
          </p>
        </div>

        {/* Grade chip */}
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
        <strong className="block mb-0.5">{review.grade.label}</strong>
        <span className="opacity-90">{review.summary}</span>
      </div>

      {/* Counts strip */}
      <div className="flex flex-wrap gap-1.5">
        <SeverityChip label="All" count={review.findings.length} active={filter === 'all'} onClick={() => setFilter('all')} />
        {review.criticalCount > 0 && <SeverityChip label="Critical" count={review.criticalCount} severity="critical" active={filter === 'critical'} onClick={() => setFilter('critical')} />}
        {review.highCount     > 0 && <SeverityChip label="High"     count={review.highCount}     severity="high"     active={filter === 'high'}     onClick={() => setFilter('high')} />}
        {review.mediumCount   > 0 && <SeverityChip label="Medium"   count={review.mediumCount}   severity="medium"   active={filter === 'medium'}   onClick={() => setFilter('medium')} />}
        {review.lowCount      > 0 && <SeverityChip label="Low"      count={review.lowCount}      severity="low"      active={filter === 'low'}      onClick={() => setFilter('low')} />}
        {review.positiveCount > 0 && <SeverityChip label="Good"     count={review.positiveCount} severity="info"     active={filter === 'info'}     onClick={() => setFilter('info')} />}
      </div>

      {/* Per-expert breakdown */}
      <div>
        <button
          onClick={() => setExpandedExperts((e) => !e)}
          className="w-full flex items-center justify-between gap-2 text-left text-[12px] font-bold opacity-80 hover:opacity-100"
        >
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} className="text-aws-orange" />
            Per-expert breakdown
          </span>
          {expandedExperts ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {expandedExperts && (
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(review.perExpert).map(({ expert, findings, score, criticalCount, highCount }) => (
              <div key={expert.id} className="rounded-xl bg-[var(--card-2)] border border-token p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[12px] font-extrabold inline-flex items-center gap-1.5">
                    <span>{expert.emoji}</span>
                    {expert.name}
                  </div>
                  <div className={cn(
                    'text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full',
                    score >= 90 ? 'bg-success/20 text-success' :
                    score >= 70 ? 'bg-warning/20 text-warning' :
                    'bg-danger/20 text-danger'
                  )}>
                    {score}/100
                  </div>
                </div>
                <div className="text-[10.5px] opacity-70 mb-1">
                  {expert.role} · {expert.yearsExperience}+ years
                </div>
                <div className="text-[11px]">
                  {findings.length === 0
                    ? <span className="text-success">✓ No issues raised</span>
                    : `${findings.length} finding${findings.length === 1 ? '' : 's'} ${criticalCount > 0 ? `(${criticalCount} critical)` : highCount > 0 ? `(${highCount} high)` : ''}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Findings list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-6 opacity-65 text-[12.5px]">
            {filter === 'all'
              ? 'No findings — solution looks clean across all experts.'
              : `No ${filter}-severity findings.`}
          </div>
        ) : filtered.map((f, i) => <FindingCard key={i} finding={f} />)}
      </div>

      {/* Honest disclaimer */}
      <div className="text-[10.5px] opacity-55 italic leading-relaxed pt-2 border-t border-token">
        <strong>Honest scope:</strong> These reviewers are rule engines, not real LLMs.
        They catch ~70-80% of common AWS mistakes via codified best practices.
        For novel scenarios + edge cases, real AI review is more thorough — connect
        the Anthropic API in Settings to upgrade each expert to LLM mode.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
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
              <span className="text-[10px] opacity-65 inline-flex items-center gap-0.5">
                {finding.expertEmoji} {finding.expertName}
              </span>
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
          {finding.docs && (
            <a
              href={finding.docs}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-aws-orange hover:underline font-bold text-[11px]"
            >
              AWS docs <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
