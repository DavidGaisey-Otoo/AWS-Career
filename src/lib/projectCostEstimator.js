/**
 * projectCostEstimator.js — PJ-03 cost estimation engine.
 *
 * Given a list of service IDs + region, returns a structured cost
 * estimate suitable for rendering in CostEstimatorCard.
 *
 * Separate from the existing `costEstimator.js` (which produces line-item
 * reports for the awsServiceMatrix flow) — this one wraps `awsPricing.js`
 * for plain "what would this project cost?" estimates on personal projects.
 */

import {
  SERVICE_PRICING, REGION_MULTIPLIERS, REGION_LABELS, resolvePricingKey,
} from '../data/awsPricing.js';

const DEFAULT_REGION = 'us-east-1';

/**
 * Estimate monthly cost for a list of services.
 *
 * @param {string[]} serviceIds  array of service IDs (lowercased, dashed)
 * @param {string} region        AWS region (defaults to us-east-1)
 */
export function estimateProjectCost(serviceIds = [], region = DEFAULT_REGION) {
  const normalized = [];
  const unknown = [];
  const seen = new Set();
  for (const id of serviceIds) {
    const key = resolvePricingKey(id);
    if (!key) {
      if (!seen.has(id)) {
        unknown.push(id);
        seen.add(id);
      }
      continue;
    }
    if (!seen.has(key)) {
      normalized.push(key);
      seen.add(key);
    }
  }

  const multiplier = REGION_MULTIPLIERS[region] ?? 1.0;
  const breakdown = normalized.map((key) => {
    const p = SERVICE_PRICING[key];
    const low = (p.afterFreeTier?.low ?? 0) * multiplier;
    const high = (p.afterFreeTier?.high ?? 0) * multiplier;
    return {
      id: key,
      label: p.label,
      freeTierHeadline: p.freeTier?.headline || 'No free tier',
      freeTierAlwaysFree: !!p.freeTier?.alwaysFree,
      monthlyLow: round2(low),
      monthlyHigh: round2(high),
      unit: p.afterFreeTier?.unit || '',
      explanation: p.afterFreeTier?.explanation || '',
      tips: p.freeTierTips || [],
    };
  });

  const min = round2(breakdown.reduce((s, b) => s + b.monthlyLow, 0));
  const max = round2(breakdown.reduce((s, b) => s + b.monthlyHigh, 0));

  // Collate tips, deduped
  const allTips = [];
  const tipSet = new Set();
  for (const b of breakdown) {
    for (const t of b.tips) {
      if (!tipSet.has(t)) {
        tipSet.add(t);
        allTips.push(t);
      }
    }
  }

  return {
    region,
    regionLabel: REGION_LABELS[region] || region,
    regionMultiplier: multiplier,
    freeTier: {
      totalMonthly: 0,
      headline: '$0 / month — within AWS Free Tier limits',
    },
    afterFreeTier: { min, max },
    breakdown,
    freeTierTips: allTips,
    unknownServices: unknown,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Format a price range as "$X-Y/month" with sensible rounding.
 */
export function formatPriceRange({ min, max }) {
  if (min === 0 && max === 0) return '$0 / month';
  if (min === max) return `~$${pretty(min)} / month`;
  return `~$${pretty(min)}–$${pretty(max)} / month`;
}

function pretty(n) {
  if (n >= 100) return Math.round(n).toString();
  if (n >= 10) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}
