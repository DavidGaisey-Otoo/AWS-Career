/**
 * officeToday.js — what needs doing, across every part of the office.
 *
 * The Today page renders this; the thinking is here so it can be tested
 * without a browser. Every input is optional: someone with no proposals,
 * no invoices and no AWS account still gets a sensible, empty Today.
 *
 * Honesty rules this module keeps (see CLAUDE.md §2):
 *  - An invoice with no due date is "no due date", never "not overdue".
 *  - A payment in a currency with no exchange rate is left out of the
 *    month's total and counted, so the total never silently treats
 *    cedis as dollars.
 *  - A "live" AWS stack is what this app recorded when it deployed. It is
 *    not checked against AWS, and the result says so.
 */

const DAY = 24 * 60 * 60 * 1000;

/** Proposal states that need nothing more from you. */
const CLOSED_PROPOSAL = new Set(['hired', 'rejected', 'no-response', 'declined', 'lost', 'won']);

/** Parse a date; null when missing or unreadable (never "now", never 1970). */
function when(v) {
  if (!v) return null;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Start of the local day, so "due today" does not flip at the current hour. */
function dayStart(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Convert an amount to the goal currency. Returns null when either rate is
 * unknown — the caller must count that, not guess.
 */
export function convert(amount, from, to, rates) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (!from || from === to) return n;
  const table = rates?.rates || {};
  const rFrom = table[from];
  const rTo = table[to];
  if (!rFrom || !rTo) return null;
  return (n / rFrom) * rTo;
}

/** Proposals whose follow-up date has come. */
export function dueFollowUps(proposals = [], now = Date.now()) {
  const today = dayStart(now);
  const out = [];
  for (const p of proposals) {
    if (!p || CLOSED_PROPOSAL.has(p.status) || p.status === 'draft') continue;
    const at = when(p.followUpAt);
    if (at === null) continue;
    const days = Math.round((dayStart(at) - today) / DAY);
    if (days > 0) continue;
    out.push({ ...p, daysLate: -days });
  }
  return out.sort((a, b) => b.daysLate - a.daysLate);
}

/** Invoices not yet paid, split by how urgent they are. */
export function openInvoices(invoices = [], now = Date.now()) {
  const today = dayStart(now);
  const overdue = []; const dueSoon = []; const later = []; const noDueDate = [];
  for (const inv of invoices) {
    if (!inv || inv.status === 'paid' || inv.paidAt) continue;
    if (inv.status === 'draft') continue; // not sent, so nobody owes it yet
    const due = when(inv.dueAt);
    if (due === null) { noDueDate.push(inv); continue; }
    const days = Math.round((dayStart(due) - today) / DAY);
    if (days < 0) overdue.push({ ...inv, daysLate: -days });
    else if (days <= 7) dueSoon.push({ ...inv, daysLeft: days });
    else later.push({ ...inv, daysLeft: days });
  }
  overdue.sort((a, b) => b.daysLate - a.daysLate);
  dueSoon.sort((a, b) => a.daysLeft - b.daysLeft);
  return { overdue, dueSoon, later, noDueDate };
}

/** Total of an invoice, from its line items. Null when it cannot be read. */
export function invoiceTotal(inv) {
  if (Number.isFinite(Number(inv?.total))) return Number(inv.total);
  const items = Array.isArray(inv?.lineItems) ? inv.lineItems : null;
  if (!items) return null;
  let sum = 0;
  for (const li of items) {
    const amt = Number.isFinite(Number(li?.amount)) ? Number(li.amount) : Number(li?.qty) * Number(li?.unit);
    if (!Number.isFinite(amt)) return null;
    sum += amt;
  }
  // Rounded to cents, as the invoice generator does. Unlike
  // documents.js invoiceTotals(), an unreadable line is null, not 0.
  const tax = Number(inv.taxPct) || 0;
  return Math.round(sum * (1 + tax / 100) * 100) / 100;
}

/** What was earned this calendar month, in the goal's currency. */
export function earnedThisMonth(payments = [], goals = {}, rates = {}, now = Date.now()) {
  const cur = goals?.currency || 'USD';
  const ref = new Date(now);
  let total = 0; let counted = 0; const unconverted = [];
  for (const p of payments) {
    const at = when(p?.at);
    if (at === null) continue;
    const d = new Date(at);
    if (d.getFullYear() !== ref.getFullYear() || d.getMonth() !== ref.getMonth()) continue;
    const v = convert(p.amount, p.currency || cur, cur, rates);
    if (v === null) { unconverted.push(p); continue; }
    total += v; counted += 1;
  }
  const target = Number(goals?.monthlyTarget) || null;
  return {
    currency: cur,
    total,
    counted,
    unconverted,
    target,
    pct: target ? Math.min(100, Math.round((total / target) * 100)) : null,
  };
}

/**
 * Where each job is, and the one thing that moves it forward.
 *
 * A job is finished when it has been paid or written up as a case study or
 * portfolio piece; finished jobs are not "in progress".
 */
export function jobProgress(projects = []) {
  const out = [];
  for (const p of projects) {
    const a = p?.artifacts || {};
    const has = (k) => Array.isArray(a[k]) && a[k].length > 0;
    const paid = (a.invoice || []).some((i) => i?.status === 'paid' || i?.paidAt);
    if (paid || has('caseStudy') || has('portfolio')) continue;

    const hired = (a.proposal || []).some((x) => x?.status === 'hired');
    let next;
    if (!has('solution') && !has('proposal')) next = { step: 'design', label: 'Design the solution', to: '/build/design' };
    else if (!has('proposal')) next = { step: 'proposal', label: 'Write the proposal', to: '/jobs/proposals' };
    else if (!hired && !has('contract')) next = { step: 'win', label: 'Follow up until the client decides', to: '/jobs/proposals' };
    else if (!has('contract')) next = { step: 'contract', label: 'Send the contract', to: '/clients/paperwork' };
    else if (!has('invoice')) next = { step: 'invoice', label: 'Deliver, then invoice', to: '/clients/paperwork' };
    else next = { step: 'paid', label: 'Chase payment', to: '/money/overview' };

    out.push({ id: p.id, title: p.title, client: p.client || null, updatedAt: p.updatedAt || null, next });
  }
  return out.sort((a, b) => (when(b.updatedAt) || 0) - (when(a.updatedAt) || 0));
}

/**
 * Everything Today shows.
 *
 * @returns {{ attention: object[], stats: object, jobs: object[], liveStacks: object[], notes: string[] }}
 */
export function buildToday({
  proposals = [], invoices = [], payments = [], goals = {}, rates = {},
  liveStacks = [], projects = [], now = Date.now(),
} = {}) {
  const attention = [];
  const notes = [];

  const inv = openInvoices(invoices, now);
  for (const i of inv.overdue) {
    attention.push({
      kind: 'invoice', tone: 'danger', to: '/clients/paperwork?tab=invoices',
      title: `Invoice ${i.number || ''} is ${plural(i.daysLate, 'day')} overdue`.replace('  ', ' '),
      detail: i.clientName || 'Client not recorded',
    });
  }

  // Resources left running are the one thing here that costs money by the hour.
  for (const s of liveStacks) {
    attention.push({
      kind: 'aws', tone: 'warning', to: '/build/running',
      title: `${s.stackName || 'A stack'} may still be running in ${s.region || 'an unrecorded region'}`,
      detail: `${s.title || 'Deployed from this app'} — recorded by this app, not checked against AWS. Check What's running.`,
    });
  }

  for (const p of dueFollowUps(proposals, now)) {
    attention.push({
      kind: 'followup', tone: p.daysLate > 0 ? 'warning' : 'info', to: '/jobs/proposals',
      title: p.daysLate > 0
        ? `Follow up ${p.clientName || 'the client'} — ${plural(p.daysLate, 'day')} late`
        : `Follow up ${p.clientName || 'the client'} today`,
      detail: p.jobTitle || p.gigTitle || 'Proposal',
    });
  }

  for (const i of inv.dueSoon) {
    attention.push({
      kind: 'invoice', tone: 'info', to: '/clients/paperwork?tab=invoices',
      title: i.daysLeft === 0 ? `Invoice ${i.number || ''} is due today` : `Invoice ${i.number || ''} is due in ${plural(i.daysLeft, 'day')}`,
      detail: i.clientName || 'Client not recorded',
    });
  }

  if (inv.noDueDate.length) {
    notes.push(`${plural(inv.noDueDate.length, 'unpaid invoice')} ${inv.noDueDate.length === 1 ? 'has' : 'have'} no due date, so whether ${inv.noDueDate.length === 1 ? 'it is' : 'they are'} overdue is unknown.`);
  }

  const earned = earnedThisMonth(payments, goals, rates, now);
  if (earned.unconverted.length) {
    notes.push(`${plural(earned.unconverted.length, 'payment')} this month ${earned.unconverted.length === 1 ? 'is' : 'are'} in a currency with no exchange rate and ${earned.unconverted.length === 1 ? 'is' : 'are'} not in the total. Add the rate under Money → Currency.`);
  }

  const unpaid = [...inv.overdue, ...inv.dueSoon, ...inv.later, ...inv.noDueDate];
  let owed = 0; let owedUnknown = 0;
  for (const i of unpaid) {
    const t = invoiceTotal(i);
    const v = t === null ? null : convert(t, i.currency || earned.currency, earned.currency, rates);
    if (v === null) owedUnknown += 1; else owed += v;
  }
  if (owedUnknown) notes.push(`${plural(owedUnknown, 'unpaid invoice')} could not be added up, so the amount owed is at least what is shown.`);

  const openProposals = proposals.filter((p) => p && !CLOSED_PROPOSAL.has(p.status) && p.status !== 'draft').length;
  const jobs = jobProgress(projects);

  return {
    attention,
    stats: {
      earned,
      owed: { amount: owed, count: unpaid.length, incomplete: owedUnknown > 0 },
      openProposals,
      activeJobs: jobs.length,
    },
    jobs,
    liveStacks,
    notes,
  };
}
