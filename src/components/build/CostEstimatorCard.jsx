/**
 * CostEstimatorCard.jsx — PJ-03 cost-estimator card.
 *
 * Renders below project pages. Shows:
 *   - Region badge (auto-detected from AWS context, or user-selectable)
 *   - Free Tier headline (always $0 if all services fit)
 *   - After-Free-Tier estimate (range $X-Y/month)
 *   - Per-service breakdown table
 *   - Expandable "Why does this cost this?" section
 *   - "How to stay in Free Tier" tips
 *   - Disclaimer note
 */

import { useEffect, useMemo, useState } from 'react';
import {
  DollarSign, ChevronDown, ChevronRight, MapPin, Sparkles, AlertTriangle,
  TrendingDown, Info,
} from 'lucide-react';
import { useAWS } from '../../context/AWSContext.jsx';
import { estimateProjectCost, formatPriceRange } from '../../lib/projectCostEstimator.js';
import { REGION_LABELS } from '../../data/awsPricing.js';
import { cn } from '../../lib/utils.js';

export function CostEstimatorCard({ services = [], projectName = 'this project', region: regionProp }) {
  const aws = useAWS();
  const detectedRegion = regionProp || aws.activeProfile?.region || 'us-east-1';
  const [region, setRegion] = useState(detectedRegion);
  // If the parent passes a different region prop (AD-01 user picked a new one), sync
  useEffect(() => { if (regionProp && regionProp !== region) setRegion(regionProp); }, [regionProp]);
  const [showWhy, setShowWhy] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const estimate = useMemo(() => estimateProjectCost(services, region), [services, region]);
  const isRegionDetected = region === detectedRegion;

  if (!services || services.length === 0) {
    return null;
  }

  const { afterFreeTier, breakdown, freeTierTips, unknownServices } = estimate;
  const hasFreeFitting = breakdown.every((b) => b.freeTierAlwaysFree || b.monthlyLow === 0);
  const totalIfPaid = formatPriceRange(afterFreeTier);

  return (
    <section className="surface rounded-3xl p-5 sm:p-6 border-l-4 border-l-aws-orange space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <DollarSign size={22} className="text-aws-orange mt-0.5" />
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              PJ-03 · Estimated AWS Cost
            </div>
            <h3 className="text-lg font-extrabold">What will {projectName} cost to run?</h3>
            <p className="text-[12px] opacity-75 mt-0.5">
              Order-of-magnitude estimate based on typical personal-project usage.
            </p>
          </div>
        </div>

        {/* Region selector */}
        <div className="flex items-center gap-2">
          <MapPin size={12} className="opacity-70" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-1.5 text-[11.5px] font-bold cursor-pointer hover:border-aws-orange/50"
            title="Adjust estimate to your AWS region"
          >
            {Object.entries(REGION_LABELS).map(([id, label]) => (
              <option key={id} value={id}>{label} ({id})</option>
            ))}
          </select>
          {isRegionDetected && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 text-success" title="Region auto-detected from your linked AWS profile">
              Auto
            </span>
          )}
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HeadlineCard
          icon="🆓"
          label="Within AWS Free Tier"
          value="$0 / month"
          subtitle="If you stay within free-tier limits — most personal projects do"
          tone="success"
        />
        <HeadlineCard
          icon="💸"
          label="After Free Tier"
          value={totalIfPaid}
          subtitle={`Typical steady-state for ${services.length} service${services.length === 1 ? '' : 's'} in ${region}`}
          tone={afterFreeTier.max > 50 ? 'warning' : 'aws-orange'}
        />
      </div>

      {/* Hint banner */}
      {hasFreeFitting && (
        <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-[12px] flex items-start gap-2">
          <Sparkles size={13} className="text-success mt-0.5 flex-shrink-0" />
          <span>
            <strong className="text-success">Good news:</strong> every service in this project has either a free tier OR is always-free at this usage scale.
            You\'ll likely pay <strong>$0/month</strong> while learning.
          </span>
        </div>
      )}

      {/* Per-service breakdown */}
      <div>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 flex items-center gap-1.5">
          <Info size={11} /> Breakdown per service
        </div>
        <div className="overflow-hidden rounded-xl border border-token">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--card-2)]/60">
              <tr>
                <th className="text-left px-3 py-2 font-extrabold text-aws-orange">Service</th>
                <th className="text-left px-3 py-2 font-extrabold text-aws-orange">Free Tier</th>
                <th className="text-right px-3 py-2 font-extrabold text-aws-orange whitespace-nowrap">After Free</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((b, i) => (
                <tr key={b.id} className={i % 2 ? 'bg-[var(--card-2)]/20' : ''}>
                  <td className="px-3 py-2 align-top font-bold whitespace-nowrap">{b.label}</td>
                  <td className="px-3 py-2 align-top opacity-85">
                    {b.freeTierAlwaysFree && (
                      <span className="px-1.5 py-0.5 mr-1.5 rounded-full bg-success/15 text-success font-bold text-[10px]">Always</span>
                    )}
                    {b.freeTierHeadline}
                  </td>
                  <td className="px-3 py-2 align-top text-right tabular-nums whitespace-nowrap font-bold">
                    {b.monthlyLow === 0 && b.monthlyHigh === 0
                      ? <span className="text-success">$0</span>
                      : formatPriceRange({ min: b.monthlyLow, max: b.monthlyHigh })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unknown services warning */}
      {unknownServices.length > 0 && (
        <div className="text-[11.5px] opacity-70 italic">
          ⚠ Services not in our pricing database: {unknownServices.join(', ')}. Use the AWS Pricing Calculator for accurate quotes.
        </div>
      )}

      {/* Why expandable */}
      <button
        onClick={() => setShowWhy((v) => !v)}
        className="w-full flex items-center gap-2 text-[12px] font-bold opacity-80 hover:opacity-100 py-1"
      >
        {showWhy ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        Why does this cost what it does?
      </button>
      {showWhy && (
        <div className="space-y-2 ml-5">
          {breakdown.map((b) => (
            <div key={b.id} className="rounded-lg bg-[var(--card-2)]/40 p-3">
              <div className="text-[11.5px] font-extrabold mb-0.5">
                {b.label} <span className="opacity-60 text-[10px]">— {b.unit}</span>
              </div>
              <div className="text-[12px] opacity-80 leading-snug">{b.explanation}</div>
            </div>
          ))}
        </div>
      )}

      {/* Free Tier tips expandable */}
      {freeTierTips.length > 0 && (
        <>
          <button
            onClick={() => setShowTips((v) => !v)}
            className="w-full flex items-center gap-2 text-[12px] font-bold opacity-80 hover:opacity-100 py-1"
          >
            {showTips ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <TrendingDown size={13} className="text-success" />
            How to stay in Free Tier ({freeTierTips.length} tips)
          </button>
          {showTips && (
            <ul className="space-y-1.5 ml-5">
              {freeTierTips.map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px]">
                  <span className="text-success mt-0.5 flex-shrink-0">▸</span>
                  <span className="opacity-90 leading-snug">{t}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* Disclaimer */}
      <div className="text-[10.5px] opacity-60 italic pt-2 border-t border-token flex items-start gap-1.5">
        <AlertTriangle size={11} className="text-warning mt-0.5 flex-shrink-0" />
        <span>
          Costs vary by region, usage volume, and AWS pricing changes. This is an estimate based on typical usage patterns —
          always verify with the <a href="https://calculator.aws/" target="_blank" rel="noreferrer" className="text-aws-orange font-bold hover:underline">AWS Pricing Calculator</a> before production. Always set a billing alert.
        </span>
      </div>
    </section>
  );
}

function HeadlineCard({ icon, label, value, subtitle, tone }) {
  const valueColor = {
    success: 'text-success',
    warning: 'text-warning',
    'aws-orange': 'text-aws-orange',
  }[tone] || 'text-aws-orange';
  return (
    <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">{icon}</span>
        <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">{label}</div>
      </div>
      <div className={cn('text-2xl font-extrabold tabular-nums', valueColor)}>{value}</div>
      <div className="text-[11px] opacity-70 mt-0.5">{subtitle}</div>
    </div>
  );
}
