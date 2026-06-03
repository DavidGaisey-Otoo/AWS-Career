/**
 * RateBenchmarkCard.jsx — FR-06 rate benchmarking UI.
 *
 * Drops into any surface with a project brief: Smart Proposal Generator,
 * Job Analyzer, New Walkthrough, Gig cards (compact).
 *
 * Auto-detects client location, defaults level from user profile, lets
 * the user override location / level / platform — and shows a clear
 * one-sentence "what to charge" recommendation on the big orange button.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign, MapPin, Award, Briefcase, Info, ChevronDown, ChevronUp,
  TrendingUp, AlertCircle, Sparkles, Zap,
} from 'lucide-react';
import {
  calculateBenchmark, LOCATION_LIST, LEVEL_LIST, PLATFORM_LIST, LEVELS,
} from '../../lib/rateBenchmark.js';
import { useApp } from '../../context/AppContext.jsx';
import { cn } from '../../lib/utils.js';

export function RateBenchmarkCard({ brief = '', variant = 'full', className = '' }) {
  const { profile } = useApp();

  // Default level from profile (if user picked AWS level there)
  const defaultLevel = useMemo(() => {
    const awsLevel = (profile?.awsLevel || '').toLowerCase();
    if (awsLevel.includes('professional') || awsLevel.includes('senior')) return 'senior';
    if (awsLevel.includes('associate') || awsLevel.includes('intermediate')) return 'intermediate';
    return 'beginner';
  }, [profile?.awsLevel]);

  const [locationId, setLocationId] = useState(null); // null = use detected
  const [level, setLevel] = useState(defaultLevel);
  const [platformId, setPlatformId] = useState('direct');
  const [showRec, setShowRec] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Keep level in sync if profile changes
  useEffect(() => { setLevel(defaultLevel); }, [defaultLevel]);

  const bench = useMemo(
    () => calculateBenchmark({ brief, locationId, level, platformId }),
    [brief, locationId, level, platformId]
  );

  // ────────── Compact variant (for Gig cards) ──────────
  if (variant === 'compact') {
    return (
      <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-success/30 bg-success/5 text-success text-[10px] font-bold', className)}
           title={`${bench.location.label} client · ${bench.level.label} · ${bench.location.notes}`}>
        💰 ${bench.range.low}-${bench.range.high}/hr
      </div>
    );
  }

  // ────────── Full variant ──────────
  return (
    <div className={cn('surface rounded-2xl p-5 space-y-3', className)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            FR-06 · Rate Benchmark
          </div>
          <h3 className="text-[14px] font-extrabold flex items-center gap-2">
            <DollarSign size={14} className="text-success" />
            What should I charge?
          </h3>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
        >
          {expanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> More</>}
        </button>
      </div>

      {/* Headline rate */}
      <div className="rounded-xl bg-success/5 border border-success/30 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10.5px] font-bold opacity-70 mb-0.5 flex items-center gap-1">
              <MapPin size={10} />
              {bench.location.flag} {bench.location.label} client
              {bench.detected.evidence && locationId === null && (
                <span className="opacity-60">· detected from "{bench.detected.evidence}"</span>
              )}
            </div>
            <div className="text-2xl font-extrabold text-success">
              ${bench.range.low}–${bench.range.high}
              <span className="text-[12px] opacity-70 ml-1">/hr</span>
            </div>
            <div className="text-[11px] opacity-75 mt-0.5">
              {bench.level.label} ({bench.level.cert})
            </div>
          </div>

          <button
            onClick={() => setShowRec(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-aws text-ink-950 text-[12px] font-extrabold hover:brightness-110 transition"
          >
            <Sparkles size={12} /> What rate should I charge?
          </button>
        </div>

        {/* Platform impact */}
        {bench.platform.feePct > 0 && (
          <div className="text-[11.5px] opacity-85 mt-3 pt-2 border-t border-success/20">
            On <strong>{bench.platform.label}</strong> ({bench.platform.feePct}% fee) →
            <strong className="text-aws-orange"> ${bench.effectiveRange.low}–${bench.effectiveRange.high}/hr</strong> in your pocket
          </div>
        )}
      </div>

      {/* Next-cert upside */}
      {bench.nextLevel && (
        <div className="rounded-xl bg-aws-orange/5 border border-aws-orange/30 p-3 flex items-start gap-2">
          <TrendingUp size={14} className="text-aws-orange mt-0.5 flex-shrink-0" />
          <div className="flex-1 text-[12px]">
            <div className="font-bold mb-0.5">After your next cert ({bench.nextLevel.cert}):</div>
            <div className="opacity-85">
              ${bench.nextLevel.range.low}–${bench.nextLevel.range.high}/hr
              <span className="text-aws-orange font-bold"> · about +${bench.nextLevel.uplift}/hr uplift</span>
            </div>
          </div>
        </div>
      )}

      {/* Override controls — collapsed by default */}
      {expanded && (
        <div className="rounded-xl bg-[var(--card-2)] border border-token p-3 space-y-3">
          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">
              Client location
            </div>
            <div className="flex flex-wrap gap-1">
              {LOCATION_LIST.map((l) => {
                const active = (locationId || bench.detected.id) === l.id;
                return (
                  <button
                    key={l.id}
                    onClick={() => setLocationId(l.id)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold transition',
                      active
                        ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                        : 'border-token opacity-70 hover:opacity-100'
                    )}
                  >
                    {l.flag} {l.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10.5px] opacity-65 mt-1.5">{bench.location.notes}</p>
          </div>

          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">
              Your level
            </div>
            <div className="flex flex-wrap gap-1">
              {LEVEL_LIST.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLevel(l.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold transition',
                    level === l.id
                      ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                      : 'border-token opacity-70 hover:opacity-100'
                  )}
                  title={l.blurb}
                >
                  <Award size={9} /> {l.label}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] opacity-65 mt-1.5">{bench.level.blurb}</p>
          </div>

          <div>
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">
              Platform (affects effective rate)
            </div>
            <div className="flex flex-wrap gap-1">
              {PLATFORM_LIST.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatformId(p.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-bold transition',
                    platformId === p.id
                      ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                      : 'border-token opacity-70 hover:opacity-100'
                  )}
                >
                  <Briefcase size={9} /> {p.label} {p.feePct > 0 && <span className="opacity-70">−{p.feePct}%</span>}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] opacity-65 mt-1.5">{bench.platform.note}</p>
          </div>
        </div>
      )}

      {/* Honesty footer */}
      <p className="text-[10.5px] opacity-55 italic leading-relaxed">
        These are honest market ranges based on common freelance benchmarks — they're a starting point, not a guarantee. Domain expertise (fintech, healthtech, HIPAA, etc.) can add 25–50%.
      </p>

      {/* Recommendation modal */}
      {showRec && <RecommendationModal bench={bench} onClose={() => setShowRec(false)} />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Recommendation modal — the big "tell me what to charge" answer
// ════════════════════════════════════════════════════════════════════
function RecommendationModal({ bench, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl p-6 max-w-lg w-full border border-aws-orange/40 shadow-2xl">
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success/15 mb-3">
            <DollarSign size={24} className="text-success" />
          </div>
          <h3 className="text-xl font-extrabold mb-1">My recommendation</h3>
          <p className="text-[12.5px] opacity-70">Based on the client signals + your level + platform</p>
        </div>

        <div className="rounded-xl bg-success/5 border border-success/30 p-4 text-center mb-3">
          <p className="text-[14px] leading-relaxed font-bold">
            {bench.recommendation}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg bg-[var(--card-2)] border border-token p-2.5 text-center">
            <div className="text-[10px] font-bold opacity-65 mb-0.5">RANGE</div>
            <div className="text-[15px] font-extrabold text-success">${bench.range.low}–${bench.range.high}/hr</div>
          </div>
          <div className="rounded-lg bg-[var(--card-2)] border border-token p-2.5 text-center">
            <div className="text-[10px] font-bold opacity-65 mb-0.5">AFTER {bench.platform.label.toUpperCase()} FEE</div>
            <div className="text-[15px] font-extrabold text-aws-orange">${bench.effectiveRange.low}–${bench.effectiveRange.high}/hr</div>
          </div>
        </div>

        <div className="rounded-lg bg-[var(--card-2)] border border-token p-3 text-[12px] opacity-85 leading-relaxed mb-4">
          <div className="flex items-start gap-2">
            <Zap size={13} className="text-aws-orange mt-0.5 flex-shrink-0" />
            <div>
              <strong>Pro move:</strong> if this is your first time working with this client, quote the LOW end + offer a smaller-scope first project. Once you've delivered, raise to mid-range on project #2.
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn btn-primary w-full">Got it</button>
      </div>
    </div>
  );
}
