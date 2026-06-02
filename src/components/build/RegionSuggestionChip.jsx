/**
 * RegionSuggestionChip.jsx — AD-01 chip + explanation card + override.
 *
 * Renders:
 *   [eu-west-1 — Ireland ✓]   ← clickable chip
 *
 * On click → expandable card with:
 *   - Reasoning list
 *   - Audience picker (dropdown)
 *   - Compliance toggles
 *   - Manual override dropdown (any AWS region)
 *   - Save button
 *
 * Use anywhere a project needs a region: walkthrough header, generator
 * form, project builder, deploy console, etc.
 */

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Check, ChevronDown, Info, Wand2 } from 'lucide-react';
import {
  suggestRegion, AUDIENCE_OPTIONS, getAllRegions,
} from '../../lib/regionSuggester.js';
import {
  getProjectRegion, setProjectRegion,
} from '../../lib/projectRegion.js';
import { REGION_LABELS } from '../../data/awsPricing.js';
import { cn } from '../../lib/utils.js';

const COMPLIANCE_OPTIONS = [
  { id: 'hipaa',   label: 'HIPAA / healthcare' },
  { id: 'gdpr',    label: 'GDPR (EU data)' },
  { id: 'pci',     label: 'PCI-DSS (cards)' },
  { id: 'fedramp', label: 'US Federal / FedRAMP' },
];

/**
 * @param {object} props
 *   - projectId       string (required) — key for per-project storage
 *   - brief           free-text used for auto-detection (optional)
 *   - defaultAudience override the initial audience guess (optional)
 *   - compact         render in small inline mode
 *   - onChange        callback(regionId, source) when user picks/saves
 */
export function RegionSuggestionChip({
  projectId, brief = '', defaultAudience = null, compact = false, onChange,
}) {
  const saved = useMemo(() => getProjectRegion(projectId), [projectId]);
  const [audience, setAudience] = useState(saved?.audience || defaultAudience || '');
  const [compliance, setCompliance] = useState([]);
  const [needsNewest, setNeedsNewest] = useState(false);
  const [open, setOpen] = useState(false);
  const [manualRegion, setManualRegion] = useState(saved?.region || '');

  // Engine result based on current inputs
  const suggestion = useMemo(
    () => suggestRegion({ brief, audience: audience || null, compliance, needsNewest }),
    [brief, audience, compliance, needsNewest]
  );

  // Effective region to display: explicit saved override > engine suggestion
  const effectiveRegion = saved?.region || suggestion.primary;
  const effectiveLabel = REGION_LABELS[effectiveRegion] || effectiveRegion;
  const isUserOverride = saved?.source === 'user' && saved.region !== suggestion.primary;

  useEffect(() => {
    // Reset manual when projectId changes
    setManualRegion(saved?.region || '');
  }, [projectId, saved?.region]);

  function applySuggestion() {
    const next = setProjectRegion(projectId, {
      region: suggestion.primary,
      source: 'suggested',
      audience: suggestion.audience,
      confidence: suggestion.confidence,
    });
    onChange?.(next.region, 'suggested');
    setOpen(false);
  }

  function applyManual(region) {
    const next = setProjectRegion(projectId, {
      region,
      source: 'user',
      audience: audience || suggestion.audience,
      confidence: 'high',
    });
    onChange?.(next.region, 'user');
    setOpen(false);
  }

  // ────────── COMPACT CHIP ──────────
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-[11.5px] font-bold transition',
          isUserOverride
            ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
            : 'border-success/40 bg-success/10 text-success hover:border-success'
        )}
        title="Suggested AWS region — click to see why or override"
      >
        <MapPin size={11} />
        <span>{effectiveRegion}</span>
        <span className="opacity-80 hidden sm:inline">— {effectiveLabel.split('(')[1]?.replace(')', '') || effectiveLabel}</span>
        {!isUserOverride && <Check size={11} />}
        {isUserOverride && <span className="text-[9px] uppercase">manual</span>}
        <ChevronDown size={11} className={cn('transition', open && 'rotate-180')} />
      </button>

      {/* ────────── EXPLANATION CARD ────────── */}
      {open && (
        <>
          {/* Click-outside scrim */}
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />

          <div className="absolute z-[70] mt-2 w-[min(420px,calc(100vw-2rem))] right-0 surface rounded-2xl border-2 border-aws-orange/40 p-4 shadow-2xl space-y-3"
               onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5 flex items-center gap-1">
                <Wand2 size={11} /> Smart region suggestion
              </div>
              <h4 className="text-base font-extrabold">
                {suggestion.primary} — {suggestion.primaryLabel}
              </h4>
              <div className="text-[10px] opacity-70">
                Confidence: <strong className={
                  suggestion.confidence === 'high' ? 'text-success'
                  : suggestion.confidence === 'medium' ? 'text-warning'
                  : 'text-muted'
                }>{suggestion.confidence}</strong>
              </div>
            </div>

            {/* Reasoning */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1 flex items-center gap-1">
                <Info size={10} /> Why this region?
              </div>
              <ul className="space-y-1.5">
                {suggestion.reasons.map((r, i) => (
                  <li key={i} className="text-[12px] opacity-90 leading-snug flex items-start gap-1.5">
                    <span className="text-aws-orange flex-shrink-0">▸</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Alternates */}
            {suggestion.alternates.length > 0 && (
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
                  Solid alternatives
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.alternates.map((alt) => (
                    <button
                      key={alt.id}
                      onClick={() => applyManual(alt.id)}
                      className="px-2 py-0.5 rounded-full border border-token bg-[var(--card-2)]/40 hover:border-aws-orange/40 text-[10.5px] font-bold"
                    >
                      {alt.id} — {alt.label.split('(')[1]?.replace(')', '') || alt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Inputs to tune the suggestion */}
            <div className="border-t border-token pt-3 space-y-2">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
                  Where are your end users?
                </div>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer focus:border-aws-orange outline-none"
                >
                  <option value="">{brief ? '(auto-detected from brief)' : '— pick one —'}</option>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
                  Compliance requirements
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COMPLIANCE_OPTIONS.map((c) => {
                    const on = compliance.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCompliance((p) => on ? p.filter((x) => x !== c.id) : [...p, c.id])}
                        className={cn(
                          'px-2 py-0.5 rounded-full border text-[10.5px] font-bold transition',
                          on
                            ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                            : 'border-token text-muted hover:text-current'
                        )}
                      >
                        {on && '✓ '}{c.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-[12px]">
                <input
                  type="checkbox"
                  checked={needsNewest}
                  onChange={(e) => setNeedsNewest(e.target.checked)}
                  className="accent-aws-orange w-3.5 h-3.5"
                />
                Need the newest AWS services (forces us-east-1)
              </label>
            </div>

            {/* Manual override */}
            <div className="border-t border-token pt-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
                Or pick any region manually
              </div>
              <div className="flex gap-1.5">
                <select
                  value={manualRegion}
                  onChange={(e) => setManualRegion(e.target.value)}
                  className="flex-1 rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer focus:border-aws-orange outline-none"
                >
                  <option value="">— pick region —</option>
                  {getAllRegions().map((r) => (
                    <option key={r.id} value={r.id}>{r.id} — {r.label}</option>
                  ))}
                </select>
                <button
                  onClick={() => manualRegion && applyManual(manualRegion)}
                  disabled={!manualRegion}
                  className="px-3 py-1.5 rounded-lg bg-[var(--card-2)] hover:bg-aws-orange/15 hover:text-aws-orange border border-token text-[11px] font-bold disabled:opacity-50"
                >
                  Use this
                </button>
              </div>
            </div>

            {/* Action */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={applySuggestion}
                className="flex-1 btn btn-primary text-xs"
              >
                ✓ Use {suggestion.primary}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="btn btn-ghost text-xs"
              >Close</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
