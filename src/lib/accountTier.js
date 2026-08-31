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

import { AWS_REGIONS } from '../context/AWSContext.jsx';

const NEW_ACCOUNT_FLOOR = new Date('2025-07-15T00:00:00Z').getTime();

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
  // Tier-info from AWSContext detector
  if (t.freeTier12mActive === true) {
    return {
      type: 'A',
      meta: ACCOUNT_TYPES.A,
      daysLeft: t.daysLeftInFreeTier ?? null,
      reason: `Legacy account ${t.ageDays} days old · ${t.daysLeftInFreeTier} days of Free Tier remaining.`,
    };
  }
  if (t.freeTier12mActive === false) {
    return {
      type: 'B',
      meta: ACCOUNT_TYPES.B,
      reason: `Legacy account ${t.ageDays} days old · past 12-month Free Tier window.`,
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
export { AWS_REGIONS };
