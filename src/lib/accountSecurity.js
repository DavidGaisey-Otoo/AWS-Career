/**
 * accountSecurity.js — the security of David's own freelance accounts.
 *
 * A checklist he ticks himself, with the date he checked. The app cannot
 * see inside Upwork, Gmail or AWS, so a tick means "David says so on this
 * date", never "verified", and the screen says that. A tick older than
 * six months asks to be checked again.
 * Pure.
 */

export const SECURITY_ITEMS = Object.freeze([
  {
    id: 'upwork-2sv', group: 'Upwork', label: 'Upwork two-step verification on',
    why: 'Your Upwork account holds your earnings and your reputation. A stolen password alone should not be enough.',
    how: 'Upwork → Settings → Password & Security → Two-step verification (authenticator app).',
    hint: 'The desktop session reported it turned on 20 Nov 2026 (authenticator + email). Tick it if you agree.',
  },
  {
    id: 'upwork-security-question', group: 'Upwork', label: 'Upwork security question set, answer saved in your password manager',
    why: 'Upwork asks it when you sign in from a new device.',
    how: 'Upwork → Settings → Password & Security → Security question.',
  },
  {
    id: 'gmail-2sv', group: 'Email', label: 'Gmail two-step verification on, with backup codes saved',
    why: 'Every other account resets its password through this email.',
    how: 'myaccount.google.com → Security → 2-Step Verification. Download backup codes.',
  },
  {
    id: 'aws-root-mfa', group: 'AWS (your practice account)', label: 'Root user MFA on, no root access keys',
    why: 'Your practice account is on your card. Root can run up any bill.',
    how: 'AWS console → account menu → Security credentials → Assign MFA device.',
  },
  {
    id: 'aws-budget', group: 'AWS (your practice account)', label: 'Budget alert set (for example $5 a month)',
    why: 'Labs left running are how practice accounts get surprise bills.',
    how: 'Billing and Cost Management → Budgets → Create budget → monthly cost, email alert at 80%.',
  },
  {
    id: 'aws-daily-user', group: 'AWS (your practice account)', label: 'Daily work done as an IAM user with MFA, not root',
    why: 'Root is for the few tasks only root can do.',
    how: 'IAM → Users → your user → Security credentials → MFA.',
  },
  {
    id: 'github-2fa', group: 'Other', label: 'GitHub two-factor authentication on',
    why: 'Your portfolio and this app\'s sync live there.',
    how: 'GitHub → Settings → Password and authentication → Two-factor authentication.',
  },
  {
    id: 'password-manager', group: 'Other', label: 'A different password for every account, kept in a password manager',
    why: 'One leaked password should not open the others.',
    how: 'Use the manager you already trust (for example Bitwarden or the Aegis vault).',
  },
  {
    id: 'payout-2fa', group: 'Getting paid', label: 'Payoneer or bank: two-factor on (once you add it)',
    why: 'Add a withdrawal method only after the first payment arrives, and protect it the day you do.',
    how: 'In the payout account\'s security settings.',
    later: true,
  },
]);

export const RECHECK_DAYS = 180;

/**
 * @param {Object<string, {done:boolean, checkedOn:string}>} state
 * @returns {{ items: [], done:number, total:number, stale:number }}
 */
export function securityStatus(state = {}, now = new Date()) {
  const items = SECURITY_ITEMS.map((item) => {
    const s = state?.[item.id];
    let status = 'todo';
    if (s?.done && s.checkedOn) {
      const age = (now.getTime() - new Date(s.checkedOn).getTime()) / 86400000;
      status = Number.isFinite(age) && age <= RECHECK_DAYS ? 'done' : 'recheck';
    }
    if (status === 'todo' && item.later) status = 'later';
    return { ...item, status, checkedOn: s?.checkedOn || null };
  });
  const counted = items.filter((i) => i.status !== 'later');
  return {
    items,
    done: counted.filter((i) => i.status === 'done').length,
    total: counted.length,
    stale: counted.filter((i) => i.status === 'recheck').length,
  };
}

/** Tick or untick, dated today (local date). */
export function toggleSecurity(state = {}, id, now = new Date()) {
  const next = { ...(state || {}) };
  if (next[id]?.done) delete next[id];
  else {
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    next[id] = { done: true, checkedOn: d };
  }
  return next;
}

export const SECURITY_KEY_SUFFIX = '::account-security';
