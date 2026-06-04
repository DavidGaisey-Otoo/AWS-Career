/**
 * rateCalculator.js — EA-01 pure math for the freelance rate calculator.
 *
 * Two questions this answers:
 *   1. What hourly rate do I NEED to charge to cover my expenses?
 *      → break-even rate
 *   2. What hourly rate SHOULD I charge to also build a profit buffer?
 *      → recommended rate
 *
 * Plus: given a target income, how many billable hours do I need per
 * month at the recommended rate, after platform fees?
 *
 * All math is honest — no rounding tricks, just direct division. Values
 * < 0 or non-numeric are coerced to 0 so the UI doesn't show NaN.
 */

const WEEKS_PER_MONTH = 52 / 12; // 4.333…

// ════════════════════════════════════════════════════════════════════
// Platform fee presets (matches FR-06 catalogue)
// ════════════════════════════════════════════════════════════════════
export const PLATFORM_PRESETS = [
  { id: 'direct',     label: 'Direct (own contract)', feePct: 0 },
  { id: 'upwork',     label: 'Upwork',                feePct: 10 },
  { id: 'fiverr',     label: 'Fiverr',                feePct: 20 },
  { id: 'freelancer', label: 'Freelancer.com',        feePct: 10 },
  { id: 'toptal',     label: 'Toptal',                feePct: 0 },
];

// ════════════════════════════════════════════════════════════════════
// Main calculator
// ════════════════════════════════════════════════════════════════════

/**
 * @param {Object} input
 * @param {number} input.livingExpenses       — monthly cost of life (rent, food, transport, ...)
 * @param {number} input.businessExpenses     — monthly tools, internet, hosting, subscriptions
 * @param {number} input.hoursPerWeek         — billable hours you can realistically work
 * @param {number} input.platformFeePct       — 0–100, what the platform takes
 * @param {number} input.profitBufferPct      — 0–100, % above break-even for savings/tax/profit
 * @param {number} [input.incomeGoal]         — desired monthly take-home (overrides break-even-only math)
 *
 * @returns {{
 *   breakEvenRate:     number,   // rate before fee that exactly covers expenses
 *   recommendedRate:   number,   // break-even × (1 + buffer)
 *   goalRate:          number,   // rate needed to hit income goal (max with recommended)
 *   billableHoursMonth:number,   // hours/week × 4.333
 *   hoursNeededForGoal:number,   // at recommended rate, how many billable h/month to hit goal
 *   totalMonthlyTarget:number,   // expenses + buffer (or expenses + income goal)
 *   afterFeeRate:      number,   // what you actually keep per hour at recommended rate
 *   monthlyTakeHome:   number,   // working ALL available hours at recommended rate, after fee
 *   warnings:          string[], // unrealistic-input flags
 *   summary:           string,   // human-readable one-sentence
 * }}
 */
export function calculate({
  livingExpenses = 0,
  businessExpenses = 0,
  hoursPerWeek = 0,
  platformFeePct = 0,
  profitBufferPct = 20,
  incomeGoal = 0,
} = {}) {
  const le = num(livingExpenses);
  const be = num(businessExpenses);
  const hpw = num(hoursPerWeek);
  const fee = clamp(num(platformFeePct), 0, 99);
  const buffer = clamp(num(profitBufferPct), 0, 500);
  const goal = num(incomeGoal);

  const monthlyExpenses = le + be;
  const billableHoursMonth = hpw * WEEKS_PER_MONTH;
  const feeMultiplier = 1 - (fee / 100);

  // Break-even — the rate that, after platform fee, exactly covers expenses
  // monthlyExpenses = billableHours × rate × (1 − fee)
  //   → rate = monthlyExpenses / (billableHours × (1 − fee))
  const breakEvenRate = (billableHoursMonth > 0 && feeMultiplier > 0)
    ? monthlyExpenses / (billableHoursMonth * feeMultiplier)
    : 0;

  // Recommended — break-even plus profit buffer
  const recommendedRate = breakEvenRate * (1 + buffer / 100);

  // Goal-driven rate — if user set an income goal, work back what rate they need
  // (target take-home = billableHours × rate × (1 − fee))
  //   → rate = target / (billableHours × (1 − fee))
  const totalMonthlyTarget = monthlyExpenses + (goal || (monthlyExpenses * buffer / 100));
  const goalRate = (billableHoursMonth > 0 && feeMultiplier > 0 && goal > 0)
    ? goal / (billableHoursMonth * feeMultiplier)
    : recommendedRate;

  // How many billable hours/month at the RECOMMENDED rate to hit the income goal?
  // billableHoursNeeded = goal / (recommendedRate × (1 − fee))
  const hoursNeededForGoal = (goal > 0 && recommendedRate > 0 && feeMultiplier > 0)
    ? goal / (recommendedRate * feeMultiplier)
    : 0;

  // After-fee per-hour take-home at the recommended rate
  const afterFeeRate = recommendedRate * feeMultiplier;

  // Working all available hours at recommended rate, what's your monthly take-home?
  const monthlyTakeHome = billableHoursMonth * afterFeeRate;

  // ─────── Sanity warnings ───────
  const warnings = [];
  if (hpw === 0) warnings.push('You set 0 hours/week — calculator can\'t suggest a rate.');
  if (hpw > 60) warnings.push('Over 60 hours/week is unsustainable — most freelancers bill 25–35 productive hours.');
  if (monthlyExpenses === 0) warnings.push('You set $0 expenses — your break-even rate will show as $0.');
  if (fee >= 99) warnings.push('Platform fee at 99%+ — check the number; you\'d keep almost nothing.');
  if (goal > 0 && hoursNeededForGoal > billableHoursMonth * 1.5) {
    warnings.push(`Your income goal needs ~${Math.round(hoursNeededForGoal)} billable hours/month but you only have ${Math.round(billableHoursMonth)}. Raise your rate OR your hours OR drop the goal.`);
  }
  if (recommendedRate > 0 && recommendedRate < 10) {
    warnings.push('Recommended rate < $10/hr — you may be underestimating expenses, or your available hours are unrealistically high.');
  }

  // ─────── Human-readable summary ───────
  const summary = buildSummary({
    recommendedRate, hoursNeededForGoal, billableHoursMonth, goal,
    fee, platformLabel: platformLabelFor(fee),
  });

  return {
    breakEvenRate: round2(breakEvenRate),
    recommendedRate: round2(recommendedRate),
    goalRate: round2(goalRate),
    billableHoursMonth: round1(billableHoursMonth),
    hoursNeededForGoal: round1(hoursNeededForGoal),
    totalMonthlyTarget: round0(totalMonthlyTarget),
    afterFeeRate: round2(afterFeeRate),
    monthlyTakeHome: round0(monthlyTakeHome),
    warnings,
    summary,
  };
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function round0(n) { return Math.round(n); }
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

function platformLabelFor(feePct) {
  if (feePct === 0) return 'direct contracts';
  if (feePct === 10) return 'Upwork';
  if (feePct === 20) return 'Fiverr';
  return `a ${feePct}% fee platform`;
}

function buildSummary({ recommendedRate, hoursNeededForGoal, billableHoursMonth, goal, fee, platformLabel }) {
  if (recommendedRate <= 0) {
    return 'Fill in your expenses + hours per week to get a rate recommendation.';
  }
  if (goal > 0 && hoursNeededForGoal > 0) {
    return `To earn $${Math.round(goal)}/month on ${platformLabel} at $${Math.round(recommendedRate)}/hr, you need ~${Math.round(hoursNeededForGoal)} billable hours after fees${billableHoursMonth > 0 ? ` (you have ${Math.round(billableHoursMonth)} available)` : ''}.`;
  }
  return `Charge at least $${Math.round(recommendedRate)}/hr on ${platformLabel} to cover expenses plus your profit buffer.`;
}
