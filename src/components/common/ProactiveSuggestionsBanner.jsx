/**
 * ProactiveSuggestionsBanner.jsx — Phase 5 UI (audit follow-up).
 *
 * Drops into any page that has a project brief + services. Shows
 * collapsible warnings + suggestions sorted by severity. If no rules
 * fire, renders nothing.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Info, XCircle, ChevronDown, ChevronUp, X, Lightbulb,
} from 'lucide-react';
import { getProactiveSuggestions, buildContextFromBrief } from '../../lib/proactiveSuggestions.js';
import { cn } from '../../lib/utils.js';

export function ProactiveSuggestionsBanner({ brief, services = [], region, level = 'beginner', className = '' }) {
  const [dismissed, setDismissed] = useState({});
  const [expanded, setExpanded] = useState(true);

  const suggestions = useMemo(() => {
    const ctx = buildContextFromBrief({ brief, services, region, level });
    return getProactiveSuggestions(ctx).filter((s) => !dismissed[s.id]);
  }, [brief, services, region, level, dismissed]);

  if (suggestions.length === 0) return null;

  const counts = {
    danger: suggestions.filter((s) => s.severity === 'danger').length,
    warning: suggestions.filter((s) => s.severity === 'warning').length,
    info: suggestions.filter((s) => s.severity === 'info').length,
  };

  // Headline severity = highest one in the list
  const headlineSeverity = counts.danger > 0 ? 'danger' : counts.warning > 0 ? 'warning' : 'info';
  const headlineToneClass = {
    danger:  'border-danger/40 bg-danger/5',
    warning: 'border-warning/40 bg-warning/5',
    info:    'border-sky-400/40 bg-sky-400/5',
  }[headlineSeverity];

  return (
    <div className={cn('surface rounded-2xl border p-4 space-y-2', headlineToneClass, className)}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Lightbulb size={14} className="text-aws-orange flex-shrink-0" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
            Heads-up — {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'}
          </span>
          {counts.danger > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-danger/15 text-danger text-[9.5px] font-extrabold">
              {counts.danger} risk
            </span>
          )}
          {counts.warning > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-warning/15 text-warning text-[9.5px] font-extrabold">
              {counts.warning} warning
            </span>
          )}
          {counts.info > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-sky-400/15 text-sky-300 text-[9.5px] font-extrabold">
              {counts.info} tip
            </span>
          )}
        </div>
        {expanded ? <ChevronUp size={13} className="opacity-60" /> : <ChevronDown size={13} className="opacity-60" />}
      </button>

      {expanded && (
        <div className="space-y-2 pt-1">
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              onDismiss={() => setDismissed((cur) => ({ ...cur, [s.id]: true }))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ suggestion, onDismiss }) {
  const sev = suggestion.severity;
  const Icon = sev === 'danger' ? XCircle : sev === 'warning' ? AlertTriangle : Info;
  const iconClass = {
    danger:  'text-danger',
    warning: 'text-warning',
    info:    'text-sky-400',
  }[sev];
  return (
    <div className="rounded-xl bg-[var(--card-2)]/40 border border-token p-3 flex items-start gap-2 relative">
      <Icon size={14} className={cn('mt-0.5 flex-shrink-0', iconClass)} />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-extrabold mb-0.5">{suggestion.title}</div>
        <p className="text-[12px] opacity-90 leading-snug m-0">{suggestion.body}</p>
        {suggestion.action && (
          <div className="mt-1.5">
            {suggestion.action.to ? (
              <Link to={suggestion.action.to} className="text-[11px] font-bold text-aws-orange hover:underline">
                → {suggestion.action.label}
              </Link>
            ) : (
              <span className="text-[11px] font-bold text-aws-orange">→ {suggestion.action.label}</span>
            )}
            {suggestion.action.hint && (
              <span className="text-[11px] opacity-65 ml-1.5">({suggestion.action.hint})</span>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="p-1 rounded opacity-40 hover:opacity-100 hover:bg-[var(--card-2)] transition flex-shrink-0"
        title="Dismiss this suggestion for this session"
      >
        <X size={11} />
      </button>
    </div>
  );
}
