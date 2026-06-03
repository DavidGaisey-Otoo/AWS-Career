/**
 * ApproachRecommendationPanel.jsx — FR-04
 *
 * Drops anywhere that knows a project brief: Smart Proposal Generator,
 * New Walkthrough, Job Analyzer, Gig cards (compact variant).
 *
 * Calls recommendApproach({ brief, services }) on every render, then
 * shows 4 option cards. The recommended one glows orange + has a "✓
 * Recommended" pill. The 2-sentence rationale appears beneath.
 *
 * The user can pick any other approach — onChange fires with the new id
 * so the parent can update downstream content (MY APPROACH wording in
 * proposals, script generator default in walkthroughs, etc.).
 *
 * Two variants:
 *   - full  (default) — 4 large cards in a 2-col grid + rationale block
 *   - compact         — single line ("Recommended: Terraform — why?")
 *                       with a small dropdown to switch. Used on
 *                       cramped surfaces like Gig cards.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Monitor, Terminal, Layers, Cloud, CheckCircle2, Info, ChevronDown,
} from 'lucide-react';
import { recommendApproach, getApproachById } from '../../lib/approachRecommender.js';
import { cn } from '../../lib/utils.js';

const ICONS = {
  monitor: Monitor,
  terminal: Terminal,
  layers: Layers,
  cloud: Cloud,
};

const TONE_CLASSES = {
  sky:    { ring: 'ring-sky-400/30',    text: 'text-sky-400',    bg: 'bg-sky-400/10' },
  amber:  { ring: 'ring-amber-400/30',  text: 'text-amber-400',  bg: 'bg-amber-400/10' },
  orange: { ring: 'ring-aws-orange/40', text: 'text-aws-orange', bg: 'bg-aws-orange/10' },
  violet: { ring: 'ring-violet-400/30', text: 'text-violet-400', bg: 'bg-violet-400/10' },
};

export function ApproachRecommendationPanel({
  brief = '',
  services = [],
  value = null,             // controlled — picked id; null = use recommended
  onChange,                 // (id) => void
  variant = 'full',         // 'full' | 'compact'
  freelance = true,
  className = '',
}) {
  const rec = useMemo(
    () => recommendApproach({ brief, services, freelance }),
    [brief, JSON.stringify(services), freelance]
  );

  const [internalPick, setInternalPick] = useState(value || rec.recommended);
  const pickedId = value || internalPick;

  // If the recommendation changes and the user hasn't manually overridden,
  // follow the new recommendation.
  useEffect(() => {
    if (!value) setInternalPick(rec.recommended);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.recommended]);

  function pick(id) {
    setInternalPick(id);
    onChange?.(id);
  }

  // ────────── Compact variant ──────────
  if (variant === 'compact') {
    const opt = getApproachById(pickedId);
    return (
      <div className={cn('inline-flex items-center gap-1.5 text-[10.5px]', className)}>
        <Info size={10} className="text-aws-orange" />
        <span className="opacity-75">Recommended:</span>
        <select
          value={pickedId}
          onChange={(e) => pick(e.target.value)}
          className="bg-[var(--card-2)] border border-token rounded px-1.5 py-0.5 font-bold cursor-pointer focus:border-aws-orange outline-none text-[10.5px]"
        >
          {rec.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} {o.recommended ? '✓' : ''}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ────────── Full variant ──────────
  return (
    <div className={cn('surface rounded-2xl p-4 space-y-3', className)}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            FR-04 · Recommended Approach
          </div>
          <h3 className="text-[14px] font-extrabold flex items-center gap-1.5">
            How to deliver this work
          </h3>
        </div>
        <div className="text-[10.5px] opacity-60">
          {rec.options.reduce((a, o) => a + o.score, 0) > 0
            ? `Scored from ${Object.values(rec.keywords).flat().length} keyword hit${Object.values(rec.keywords).flat().length === 1 ? '' : 's'}`
            : 'No keywords matched — using freelance default'}
        </div>
      </div>

      {/* 4 option cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rec.options.map((opt) => {
          const Icon = ICONS[opt.icon] || Monitor;
          const isPicked = opt.id === pickedId;
          const isRec = opt.recommended;
          const tone = TONE_CLASSES[opt.tone] || TONE_CLASSES.orange;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt.id)}
              className={cn(
                'group relative rounded-xl border p-3 text-left transition',
                isPicked
                  ? cn('border-aws-orange ring-2 shadow-glow-orange', tone.ring)
                  : 'border-token hover:border-aws-orange/40 hover:bg-[var(--card-2)]'
              )}
            >
              {/* Recommended badge */}
              {isRec && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-success text-ink-950 text-[9px] font-extrabold shadow-md">
                  <CheckCircle2 size={9} /> RECOMMENDED
                </span>
              )}

              <div className="flex items-start gap-2 mb-1">
                <div className={cn('rounded-lg p-1.5 flex-shrink-0', tone.bg)}>
                  <Icon size={14} className={tone.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-extrabold flex items-center gap-1">
                    {opt.label}
                    {opt.score > 0 && (
                      <span className="text-[9px] opacity-60 font-bold">+{opt.score}</span>
                    )}
                  </div>
                  <div className="text-[10.5px] opacity-75 leading-snug">{opt.short}</div>
                </div>
              </div>

              <p className="text-[11px] opacity-85 leading-snug">{opt.blurb}</p>

              {/* Matched keywords (only if any) */}
              {opt.hits.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {opt.hits.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className={cn('px-1.5 py-0.5 rounded-full text-[9px] font-bold', tone.bg, tone.text)}
                    >
                      "{k}"
                    </span>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rationale (2 sentences) */}
      <div className="rounded-xl bg-[var(--card-2)] border border-token p-3 flex items-start gap-2">
        <Info size={13} className="text-aws-orange mt-0.5 flex-shrink-0" />
        <p className="text-[12px] opacity-90 leading-relaxed m-0">
          <strong className="text-aws-orange">Why {getApproachById(pickedId).label}?</strong>{' '}
          {pickedId === rec.recommended
            ? rec.rationale
            : `You overrode the recommendation — switched from ${getApproachById(rec.recommended).label} to ${getApproachById(pickedId).label}. ${getApproachById(pickedId).fullBlurb}`}
        </p>
      </div>
    </div>
  );
}
