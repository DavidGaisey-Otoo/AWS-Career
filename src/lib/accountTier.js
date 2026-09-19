/**
 * accountTier.js — classifies the user's linked AWS account into one of:
 *
 *   • TYPE A — FREE_TIER_ACTIVE  (legacy account, < 12 months old)
 *               EC2 + RDS 750 hr/month included
 *   • TYPE B — FREE_TIER_EXPIRED (legacy account, > 12 months old)
 *               Only always-free services are zero-cost
 *   • TYPE C — CREDITS_ACTIVE    (new account post Jul-2025)
 *               $100 credit balance, no 750 hr buckets
 *
 * Detection signals (best-effort, no AWS API needed for classification):
 *   • If tierInfo.freeTier12mActive === true  → TYPE A
 *   • If tierInfo.freeTier12mActive === false → TYPE B
 *   • If profile.savedAt > 2025-07-15 + no IAM users seen        → TYPE C (assumed)
 *   • Manual override via profile.tierOverride                     → respected
 *
 * The header status badge + every cost-aware suggestion reads from here.
 */

/**
 * ════════════════════════════════════════════════════════════════════
 * WHICH AWS FREE PROGRAMME IS THIS ACCOUNT ON?
 * ════════════════════════════════════════════════════════════════════
 * AWS replaced the legacy 12-month Free Tier with a six-month,
 * credits-based Free Plan for accounts created from 15 Jul 2025.
 *
 * This distinction is the whole ballgame: an account opened last week is
 * NOT on a 12-month Free Tier with ~365 days left, it is on a six-month
 * plan that also ends when the credits run out. Treating a new account as
 * legacy tells the user they have a year of free EC2 hours they do not
 * have — which is the most expensive kind of wrong this app can be.
 *
 * Account age alone cannot answer this. The CREATION DATE can.
 */
export const CREDITS_PROGRAMME_START = new Date('2025-07-15T00:00:00Z').getTime();
export const FREE_PLAN_MONTHS = 6;
export const LEGACY_FREE_TIER_MONTHS = 12;

/** 'credits-6-month' | 'legacy-12-month' | null when the date is unusable. */
export function programmeForCreatedAt(createdAt) {
  const ms = createdAt ? new Date(createdAt).getTime() : NaN;
  if (!Number.isFinite(ms)) return null;
  return ms >= CREDITS_PROGRAMME_START ? 'credits-6-month' : 'legacy-12-month';
}

/** Calendar-accurate plan end date — months, not a 365/183-day approximation. */
export function planEndsAt(createdAt, programme) {
  const start = createdAt ? new Date(createdAt) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const end = new Date(start);
  const months = programme === 'credits-6-month' ? FREE_PLAN_MONTHS : LEGACY_FREE_TIER_MONTHS;
  end.setMonth(end.getMonth() + months);
  return end;
}

/** Whole days remaining in the plan, floored at 0. Null when undeterminable. */
export function planDaysLeft(createdAt, programme, now = Date.now()) {
  const end = planEndsAt(createdAt, programme);
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now) / 86400000));
}

const NEW_ACCOUNT_FLOOR = CREDITS_PROGRAMME_START;

export const ACCOUNT_TYPES = {
  A: { id: 'A', label: 'Free Tier Active',  color: 'success',  badge: 'green',
       description: 'EC2 + RDS 750 hrs/month covered. All 8 portfolio projects buildable free.' },
  B: { id: 'B', label: 'Free Tier Expired', color: 'warning',  badge: 'orange',
       description: 'Only ALWAYS-FREE services are zero-cost. EC2/RDS = real money now.' },
  C: { id: 'C', label: 'Credits',           color: 'electric', badge: 'blue',
       description: 'New-style account — $100 credit balance, no 750-hour buckets.' },
  UNKNOWN: { id: 'UNKNOWN', label: 'Not linked', color: 'muted', badge: 'grey',
       description: 'Link an AWS account in the AWS Account Manager to see your tier.' },
};

/**
 * Classify the active AWS profile.
 *
 * @param {object} profile  The AWSContext active profile (or null).
 * @returns {{
 *   type: 'A'|'B'|'C'|'UNKNOWN',
 *   meta: object,
 *   daysLeft?: number,
 *   creditsRemaining?: number,
 *   reason: string,
 * }}
 */
export function classifyAccount(profile) {
  if (!profile) {
    return { type: 'UNKNOWN', meta: ACCOUNT_TYPES.UNKNOWN, reason: 'No active AWS profile.' };
  }

  // AWS's current six-month Free Plan is authoritative when the user records
  // it from the console. It is credits-based and must not be described as the
  // legacy 12-month Free Tier.
  if (profile.accountPlan === 'free-6-month') {
    const expiry = profile.planExpiresAt ? new Date(profile.planExpiresAt).getTime() : null;
    const daysLeft = expiry == null || Number.isNaN(expiry)
      ? null
      : Math.max(0, Math.ceil((expiry - Date.now()) / 86400000));
    if (daysLeft === 0) {
      return {
        type: 'B', meta: ACCOUNT_TYPES.B, daysLeft: 0,
        reason: 'Recorded six-month AWS Free Plan has ended; verify account closure or upgrade status in AWS.',
      };
    }
    return {
      type: 'C', meta: ACCOUNT_TYPES.C, daysLeft,
      creditsRemaining: profile.creditsRemaining ?? null,
      reason: `Six-month AWS Free Plan recorded from console${daysLeft == null ? '' : ` · ${daysLeft} days remaining`}.`,
    };
  }
  if (profile.accountPlan === 'paid') {
    return { type: 'B', meta: ACCOUNT_TYPES.B, reason: 'AWS Paid Plan recorded for this profile.' };
  }

  // 0) Manual override always wins
  if (profile.tierOverride === 'free')     return { type: 'A', meta: ACCOUNT_TYPES.A, reason: 'Manually set to Free Tier Active.' };
  if (profile.tierOverride === 'paid')     return { type: 'B', meta: ACCOUNT_TYPES.B, reason: 'Manually set to Free Tier Expired.' };
  if (profile.tierOverride === 'credits')  return { type: 'C', meta: ACCOUNT_TYPES.C, reason: 'Manually set to Credits account.' };

  if (!profile.connected) {
    return { type: 'UNKNOWN', meta: ACCOUNT_TYPES.UNKNOWN, reason: 'Profile not yet tested. Run Test Connection.' };
  }

  const t = profile.tierInfo || {};

  // WHICH PROGRAMME beats HOW OLD. A two-month-old account created after
  // 15 Jul 2025 is on the six-month credits plan — it does NOT have ten
  // months of Free Tier left. Deriving the programme from the stored
  // creation date means profiles saved before this fix are re-classified
  // correctly without the user having to re-run Test Connection.
  //
  // Caveat, stated because it matters: oldestUserCreatedAt is the first
  // IAM user, a proxy that can only be LATER than the real account
  // creation. So an account opened just before the cutoff whose first IAM
  // user came after it can read as new. That window is days wide, and the
  // manual override in Account Manager settles it.
  const programme = t.programme || programmeForCreatedAt(t.oldestUserCreatedAt);

  if (programme === 'credits-6-month') {
    const daysLeft = t.planDaysLeft ?? planDaysLeft(t.oldestUserCreatedAt, 'credits-6-month');
    if (daysLeft === 0) {
      return {
        type: 'B',
        meta: ACCOUNT_TYPES.B,
        daysLeft: 0,
        reason: 'Six-month AWS Free Plan has ended. Only always-free services are zero-cost now.',
      };
    }
    return {
      type: 'C',
      meta: ACCOUNT_TYPES.C,
      daysLeft,
      creditsRemaining: profile.creditsRemaining ?? null,
      reason: `Account created after AWS's switch to the credits-based Free Plan · six-month plan${daysLeft == null ? '' : ` · ${daysLeft} days remaining`}. No 750-hour Free Tier buckets.`,
    };
  }

  if (programme === 'legacy-12-month') {
    const daysLeft = t.daysLeftInFreeTier ?? planDaysLeft(t.oldestUserCreatedAt, 'legacy-12-month');
    if (daysLeft && daysLeft > 0) {
      return {
        type: 'A',
        meta: ACCOUNT_TYPES.A,
        daysLeft,
        reason: `Legacy account ${t.ageDays} days old · ${daysLeft} days of 12-month Free Tier remaining.`,
      };
    }
    return {
      type: 'B',
      meta: ACCOUNT_TYPES.B,
      reason: `Legacy account ${t.ageDays} days old · past the 12-month Free Tier window.`,
    };
  }

  // Heuristic for new accounts: profile was saved AFTER Jul 2025 + we can't
  // tell from IAM (no users yet). Assume Type C unless proven otherwise.
  const savedAtMs = profile.savedAt ? new Date(profile.savedAt).getTime() : 0;
  if (savedAtMs >= NEW_ACCOUNT_FLOOR) {
    return {
      type: 'C',
      meta: ACCOUNT_TYPES.C,
      creditsRemaining: profile.creditsRemaining ?? null,
      reason: 'Saved after AWS\'s new credits-based programme started (15 Jul 2025).',
    };
  }

  // Could not classify with confidence
  return { type: 'UNKNOWN', meta: ACCOUNT_TYPES.UNKNOWN, reason: 'Could not auto-detect — set manually in AWS Account Manager.' };
}

/**
 * Given a service + classified account, decide if it's cost-safe.
 * Returns { ok, level: 'ok'|'warn'|'block', message }.
 */
export function checkServiceCostSafety(service, classification) {
  if (!service || !classification) return { ok: true, level: 'ok' };
  const type = classification.type;
  if (service.freeTier === 'always-free') return { ok: true, level: 'ok', message: `${service.label} is always free.` };
  if (service.freeTier === 'free-tier-eligible') {
    if (type === 'A') return { ok: true, level: 'ok', message: `${service.label} is covered by your Free Tier (${classification.daysLeft ?? '?'} days left).` };
    if (type === 'C') return { ok: true, level: 'warn', message: `${service.label}: no 750-hour bucket on credits account — will eat credits.` };
    return { ok: false, level: 'warn', message: `${service.label}: your Free Tier has expired. ${service.testMap?.spec ? `Use ${service.testMap.spec} instead.` : 'This will cost money.'}` };
  }
  // costs-money
  return { ok: false, level: 'block', message: `${service.label} costs money — ${service.costNote}. ${service.testMap ? `Use ${service.testMap.spec} for testing.` : ''}` };
}

/**
 * Catalogue of all valid AWS regions (re-exported for convenience).
 */
