/**
 * AutoFillFromBrief.jsx — AD-03 paste-to-auto-fill panel.
 *
 * One paste textarea at top. On change, derives:
 *   - Project Name (auto-detected, editable)
 *   - Required Services (chips — AD-02)
 *   - Suggested Region (chip — AD-01)
 *   - Estimated Timeline (chip)
 *   - Tech Stack chips
 *   - Client Location
 *
 * Every auto-filled field shows a soft-yellow highlight + ✨ badge.
 * Every field is editable. "Clear auto-fill" wipes the brief + fields.
 *
 * Controlled component — parent owns `value` { brief, name, services, ... }
 * and onChange. The component emits the same shape on every keystroke.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, X, MapPin, Clock, Cpu, Globe, FileText, Eraser } from 'lucide-react';
import { extractFromBrief } from '../../lib/briefExtractor.js';
import { suggestServices } from '../../lib/serviceSuggester.js';
import { suggestRegion } from '../../lib/regionSuggester.js';
import { ServiceSuggestionChips } from './ServiceSuggestionChips.jsx';
import { cn } from '../../lib/utils.js';
import { REGION_LABELS } from '../../data/awsPricing.js';

/**
 * @param {object} props
 *   - value      { brief, name, services, region, timeline, techStack, clientLocation }
 *   - onChange   callback(nextValue)
 *   - title      header title (default "Auto-fill from a job description")
 *   - compact    bool — render more tightly
 */
export function AutoFillFromBrief({ value = {}, onChange, title = 'Paste a job description', compact = false }) {
  const brief = value.brief || '';
  const [autoFlags, setAutoFlags] = useState({}); // which fields were auto-filled

  // Extract everything from the brief
  const extracted = useMemo(() => extractFromBrief(brief), [brief]);
  const services  = useMemo(() => suggestServices(brief), [brief]);
  const region    = useMemo(() => suggestRegion({ brief }), [brief]);

  // When brief content meaningfully changes, suggest values
  const lastSeenBrief = useRef('');
  useEffect(() => {
    const trimmed = brief.trim();
    if (trimmed === lastSeenBrief.current) return;
    lastSeenBrief.current = trimmed;
    if (trimmed.length < 10) {
      // Brief too short — clear auto-flags
      setAutoFlags({});
      return;
    }

    const flags = {};
    const next = { ...value };

    // Project Name — only auto-fill if user hasn't entered one
    if (!value.name && extracted.projectName) {
      next.name = extracted.projectName;
      flags.name = true;
    }

    // Services — auto-fill from detection on first content
    if ((!value.services || value.services.length === 0) && services.primary.length > 0) {
      next.services = services.primary.map((p) => p.service.id);
      flags.services = true;
    }

    // Region — auto-fill from suggestion
    if (!value.region) {
      next.region = region.primary;
      flags.region = true;
    }

    // Timeline + Tech stack + Client location — always derive + flag
    if (extracted.timeline) {
      next.timeline = extracted.timeline;
      flags.timeline = true;
    }
    if (extracted.techStack?.length > 0) {
      next.techStack = extracted.techStack;
      flags.techStack = true;
    }
    if (extracted.clientLocation) {
      next.clientLocation = extracted.clientLocation;
      flags.clientLocation = true;
    }

    setAutoFlags(flags);
    if (onChange && (next.name !== value.name || next.region !== value.region ||
        next.services !== value.services || next.timeline !== value.timeline ||
        next.techStack !== value.techStack || next.clientLocation !== value.clientLocation)) {
      onChange(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brief, extracted, services.primary, region.primary]);

  function update(field, fieldValue, manual = true) {
    if (manual) {
      // User edited — clear the auto-fill flag
      setAutoFlags((f) => ({ ...f, [field]: false }));
    }
    onChange?.({ ...value, [field]: fieldValue });
  }

  function clearAll() {
    setAutoFlags({});
    onChange?.({
      brief: '', name: '', services: [], region: null,
      timeline: null, techStack: [], clientLocation: null,
    });
  }

  return (
    <div className="space-y-3">
      {/* PASTE area + clear button */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
            <FileText size={11} /> {title} <span className="opacity-70">(auto-fills the form below)</span>
          </label>
          {brief.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-[10.5px] font-bold text-muted hover:text-danger"
            >
              <Eraser size={11} /> Clear auto-fill
            </button>
          )}
        </div>
        <textarea
          value={brief}
          onChange={(e) => onChange?.({ ...value, brief: e.target.value })}
          placeholder={`Paste the job description, gig brief, or project requirements here.\n\nExample: "We need an urgent serverless API for a London-based fintech, processing 10M transactions/month with Python + Lambda + DynamoDB. GDPR compliance required. 2-week deadline."`}
          rows={compact ? 4 : 6}
          className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[13px] font-mono outline-none focus:border-aws-orange"
        />
      </div>

      {/* AUTO-EXTRACTED FIELDS — only show once brief has content */}
      {brief.length >= 10 && (
        <div className="space-y-3">
          {/* Project Name */}
          <AutoField
            icon={<FileText size={11} />}
            label="Project name"
            isAuto={autoFlags.name}
          >
            <input
              type="text"
              value={value.name || ''}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Give it a name..."
              className={cn(
                'w-full rounded-lg border px-2.5 py-1.5 text-[13px] outline-none focus:border-aws-orange',
                autoFlags.name
                  ? 'bg-yellow-500/10 border-yellow-500/40'
                  : 'bg-[var(--card-2)] border-token'
              )}
            />
          </AutoField>

          {/* Services (uses AD-02 chips internally) */}
          <AutoField
            icon={<Cpu size={11} />}
            label="Required AWS services"
            isAuto={autoFlags.services}
          >
            <div className={cn(
              'rounded-xl p-3 border',
              autoFlags.services
                ? 'bg-yellow-500/5 border-yellow-500/30'
                : 'bg-[var(--card-2)]/40 border-token'
            )}>
              <ServiceSuggestionChips
                brief={brief}
                selected={value.services || []}
                onChange={(next) => update('services', next, true)}
                compact
              />
            </div>
          </AutoField>

          {/* 2-column row: Region + Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Region */}
            <AutoField
              icon={<MapPin size={11} />}
              label="Suggested AWS region"
              isAuto={autoFlags.region}
            >
              <select
                value={value.region || region.primary}
                onChange={(e) => update('region', e.target.value)}
                className={cn(
                  'w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] font-bold cursor-pointer outline-none focus:border-aws-orange',
                  autoFlags.region
                    ? 'bg-yellow-500/10 border-yellow-500/40'
                    : 'bg-[var(--card-2)] border-token'
                )}
              >
                {Object.entries(REGION_LABELS).map(([id, label]) => (
                  <option key={id} value={id}>{id} — {label}</option>
                ))}
              </select>
            </AutoField>

            {/* Timeline */}
            <AutoField
              icon={<Clock size={11} />}
              label="Estimated timeline"
              isAuto={autoFlags.timeline}
            >
              <div className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                autoFlags.timeline
                  ? 'bg-yellow-500/10 border-yellow-500/40'
                  : 'bg-[var(--card-2)] border-token'
              )}>
                <span className={cn(
                  'text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded',
                  value.timeline?.severity === 'urgent' ? 'bg-danger/15 text-danger'
                  : value.timeline?.severity === 'tight' ? 'bg-warning/15 text-warning'
                  : 'bg-[var(--card)] opacity-70'
                )}>
                  {value.timeline?.severity || 'default'}
                </span>
                <input
                  type="text"
                  value={value.timeline?.label || ''}
                  onChange={(e) => update('timeline', { ...(value.timeline || {}), label: e.target.value })}
                  placeholder="e.g. 1-2 weeks"
                  className="flex-1 bg-transparent text-[12.5px] outline-none font-semibold"
                />
              </div>
            </AutoField>
          </div>

          {/* Tech Stack */}
          <AutoField
            icon={<Cpu size={11} />}
            label="Tech stack detected"
            isAuto={autoFlags.techStack}
          >
            <div className={cn(
              'rounded-lg border p-2 min-h-[36px]',
              autoFlags.techStack
                ? 'bg-yellow-500/10 border-yellow-500/40'
                : 'bg-[var(--card-2)] border-token'
            )}>
              {(value.techStack || []).length === 0 ? (
                <span className="text-[12px] opacity-60 italic">— no specific tech mentioned —</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {(value.techStack || []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--card)] border border-token px-2 py-0.5 text-[11px] font-bold">
                      {t}
                      <button
                        type="button"
                        onClick={() => update('techStack', value.techStack.filter((x) => x !== t))}
                        className="opacity-60 hover:opacity-100 hover:text-danger"
                        title="Remove"
                      ><X size={10} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </AutoField>

          {/* Client Location */}
          <AutoField
            icon={<Globe size={11} />}
            label="Client location"
            isAuto={autoFlags.clientLocation}
          >
            <input
              type="text"
              value={value.clientLocation?.label || ''}
              onChange={(e) => update('clientLocation', { audience: 'manual', label: e.target.value })}
              placeholder="— not specified —"
              className={cn(
                'w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold outline-none focus:border-aws-orange',
                autoFlags.clientLocation
                  ? 'bg-yellow-500/10 border-yellow-500/40'
                  : 'bg-[var(--card-2)] border-token'
              )}
            />
          </AutoField>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Field row with auto-filled badge
// ════════════════════════════════════════════════════════════════════
function AutoField({ icon, label, isAuto, children }) {
  return (
    <div>
      <label className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
          {icon} {label}
        </span>
        {isAuto && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/15 border border-yellow-500/40 px-1.5 py-0.5 text-[9px] font-extrabold text-yellow-600 dark:text-yellow-400">
            <Sparkles size={9} /> Auto-filled
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
