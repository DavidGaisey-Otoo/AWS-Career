/**
 * upworkMoney.js — what Upwork costs and pays: Connects spent against
 * jobs won, Upwork's fee, and the steps to get money out.
 *
 * Upwork sets the Connect price and its service fee and changes both, so
 * neither is hardcoded as fact: they are settings with today's usual
 * values, and every figure built on them is labelled an estimate.
 * Pure.
 */

export const DEFAULT_MONEY_SETTINGS = Object.freeze({
  pricePerConnect: 0.15,   // USD, approximate
  feeRate: 0.10,           // Upwork freelancer service fee; check your contract
  withdrawalFee: 2,        // USD per withdrawal, approximate; depends on method
});

export const OUTCOMES = Object.freeze(['pending', 'won', 'lost', 'no-reply']);

/**
 * One ledger line.
 *   kind 'buy'   — Connects bought (dollars paid)
 *   kind 'spend' — Connects spent on a proposal (job, outcome)
 *   kind 'other' — Connects used on something that is not a proposal
 *                  (ID verification, a boost): not counted as applying
 *   kind 'free'  — Connects given free or refunded
 */
export function ledgerEntry({ kind, connects, dollars = null, job = '', outcome = 'pending', amount = null, date = new Date() } = {}) {
  const n = Math.max(0, Math.round(Number(connects) || 0));
  if (!['buy', 'spend', 'other', 'free'].includes(kind) || !n) return null;
  const d = date instanceof Date ? date : new Date(date);
  return {
    id: `cx-${d.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind,
    connects: n,
    dollars: kind === 'buy' && Number(dollars) > 0 ? Math.round(Number(dollars) * 100) / 100 : null,
    job: kind === 'spend' || kind === 'other' ? String(job || '').slice(0, 120) : '',
    outcome: kind === 'spend' && OUTCOMES.includes(outcome) ? outcome : null,
    amount: kind === 'spend' && Number(amount) > 0 ? Number(amount) : null, // contract value, when won
    date: d.toISOString().slice(0, 10),
  };
}

export function setOutcome(ledger = [], id, outcome, amount = null) {
  if (!OUTCOMES.includes(outcome)) return ledger;
  return ledger.map((e) => (e.id === id && e.kind === 'spend'
    ? { ...e, outcome, amount: outcome === 'won' && Number(amount) > 0 ? Number(amount) : e.amount }
    : e));
}

/** Upwork's cut and what reaches you, for one amount. Estimates. */
export function upworkNet(gross, settings = DEFAULT_MONEY_SETTINGS) {
  const g = Math.max(0, Number(gross) || 0);
  const fee = Math.round(g * (Number(settings.feeRate) || 0) * 100) / 100;
  return { gross: g, fee, net: Math.round((g - fee) * 100) / 100 };
}

/**
 * The ledger in numbers.
 * Connects with no recorded price are valued at the setting's price and
 * marked as estimated, never shown as money actually paid.
 */
export function ledgerSummary(ledger = [], settings = DEFAULT_MONEY_SETTINGS) {
  const list = Array.isArray(ledger) ? ledger.filter(Boolean) : [];
  const price = Number(settings.pricePerConnect) || 0;
  const bought = list.filter((e) => e.kind === 'buy');
  const spent = list.filter((e) => e.kind === 'spend');
  const free = list.filter((e) => e.kind === 'free');
  const other = list.filter((e) => e.kind === 'other');
  const sum = (arr, k) => arr.reduce((n, e) => n + (Number(e[k]) || 0), 0);

  const connectsBought = sum(bought, 'connects');
  const paidRecorded = sum(bought.filter((e) => e.dollars != null), 'dollars');
  const paidEstimated = sum(bought.filter((e) => e.dollars == null), 'connects') * price;
  const connectsSpent = sum(spent, 'connects');
  const connectsOther = sum(other, 'connects');
  const balance = connectsBought + sum(free, 'connects') - connectsSpent - connectsOther;
  const decided = spent.filter((e) => e.outcome === 'won' || e.outcome === 'lost' || e.outcome === 'no-reply');
  const won = spent.filter((e) => e.outcome === 'won');
  const spentValue = connectsSpent * price;
  const wonGross = sum(won, 'amount');
  const net = upworkNet(wonGross, settings);

  return {
    connectsBought,
    paid: Math.round((paidRecorded + paidEstimated) * 100) / 100,
    paidIsEstimate: paidEstimated > 0,
    connectsSpent,
    connectsOther,
    balance,
    proposals: spent.length,
    pending: spent.filter((e) => e.outcome === 'pending').length,
    won: won.length,
    // Win rate only over proposals with an answer; none decided → unknown.
    winRate: decided.length ? won.length / decided.length : null,
    costPerWin: won.length ? Math.round((spentValue / won.length) * 100) / 100 : null,
    wonGross,
    fee: net.fee,
    wonNet: net.net,
    // What the Connects cost against what the wins paid, net of fees.
    returnOnConnects: spentValue > 0 && won.length ? Math.round((net.net / spentValue) * 10) / 10 : null,
  };
}

/** Getting paid, in order. The payout method waits for the first payment. */
export const WITHDRAWAL_STEPS = Object.freeze([
  { id: 'contract', text: 'Work only inside an Upwork contract: a funded milestone (fixed price) or tracked hours (hourly). Never take payment outside Upwork.' },
  { id: 'approve', text: 'Submit the milestone or let the hours be reviewed. The client approves, or Upwork releases it automatically after its review period.' },
  { id: 'pending', text: 'The payment shows as Pending for Upwork\'s security period. Check the date on your Reports → Overview page rather than guessing.' },
  { id: 'add-method', text: 'Only once the first payment is available: add a withdrawal method (Payoneer or a bank transfer), and turn on two-factor there the same day.' },
  { id: 'verify', text: 'Upwork holds a new withdrawal method for a few days before it can be used. That is normal.' },
  { id: 'withdraw', text: 'Withdraw manually or on a schedule. Each withdrawal has a fee that depends on the method, so fewer, larger withdrawals cost less.' },
  { id: 'record', text: 'Log the payment in Money → Earnings, and set aside your tax share.' },
]);

export const LEDGER_KEY_SUFFIX = '::upwork-ledger';
export const MONEY_SETTINGS_KEY_SUFFIX = '::upwork-money-settings';
