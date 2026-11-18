/**
 * Today must not tell a comforting story it cannot back up.
 *
 * It is the first screen of the day. If it says nothing is overdue when
 * an invoice simply has no due date, or reports earnings that counted
 * cedis as dollars, the user stops checking — and then it is worse than
 * having no Today at all.
 */
import {
  buildToday, convert, dueFollowUps, earnedThisMonth, invoiceTotal, jobProgress, openInvoices,
} from '../officeToday.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const NOW = new Date(2026, 10, 18, 15, 30).getTime(); // 18 Nov 2026, mid-afternoon
const day = (offset) => new Date(2026, 10, 18 + offset, 9, 0).toISOString();
const RATES = { rates: { USD: 1, GBP: 0.79, GHS: 12.5 } };

export function runOfficeTodayTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('an empty office gives an empty Today, not an error', () => {
    const t = buildToday({ now: NOW });
    assert(t.attention.length === 0 && t.jobs.length === 0 && t.notes.length === 0, 'expected nothing');
    assert(t.stats.earned.total === 0 && t.stats.owed.count === 0, 'expected zero stats');
  });

  test('an invoice with no due date is unknown, never "not overdue"', () => {
    const inv = openInvoices([{ id: 'a', status: 'sent', clientName: 'X' }], NOW);
    assert(inv.noDueDate.length === 1 && inv.overdue.length === 0, 'misfiled');
    const t = buildToday({ invoices: [{ id: 'a', status: 'sent', lineItems: [{ amount: 100 }] }], now: NOW });
    assert(t.notes.some((n) => /no due date/.test(n) && /unknown/.test(n)), 'did not say it is unknown');
  });

  test('paid and draft invoices are not chased', () => {
    const inv = openInvoices([
      { id: 'p', status: 'paid', dueAt: day(-30) },
      { id: 'q', status: 'sent', paidAt: day(-1), dueAt: day(-30) },
      { id: 'd', status: 'draft', dueAt: day(-30) },
    ], NOW);
    assert(inv.overdue.length === 0, 'chased a paid or draft invoice');
  });

  test('overdue is counted in whole days and due-today is not overdue', () => {
    const inv = openInvoices([
      { id: 'late', status: 'sent', dueAt: day(-3) },
      { id: 'today', status: 'sent', dueAt: day(0) },
    ], NOW);
    assert(inv.overdue.length === 1 && inv.overdue[0].daysLate === 3, 'overdue days wrong');
    assert(inv.dueSoon.length === 1 && inv.dueSoon[0].daysLeft === 0, 'due today misfiled');
  });

  test('a payment in an unknown currency is left out and said so', () => {
    const e = earnedThisMonth([
      { at: day(-1), amount: 100, currency: 'USD' },
      { at: day(-1), amount: 500, currency: 'XYZ' },
    ], { currency: 'USD', monthlyTarget: 1000 }, RATES, NOW);
    assert(e.total === 100, `total ${e.total} included the unknown currency`);
    assert(e.unconverted.length === 1, 'did not count the unconverted payment');
    const t = buildToday({ payments: [{ at: day(-1), amount: 500, currency: 'XYZ' }], goals: { currency: 'USD' }, rates: RATES, now: NOW });
    assert(t.notes.some((n) => /no exchange rate/.test(n)), 'did not say a payment was left out');
  });

  test('currency conversion goes through the goal currency, not straight across', () => {
    const v = convert(125, 'GHS', 'GBP', RATES);
    assert(Math.abs(v - 7.9) < 1e-9, `GHS→GBP gave ${v}`);
    assert(convert(10, 'USD', 'NOPE', RATES) === null, 'unknown target currency was guessed');
  });

  test('only this month counts towards this month', () => {
    const e = earnedThisMonth([
      { at: new Date(2026, 9, 31).toISOString(), amount: 999, currency: 'USD' },
      { at: day(-2), amount: 50, currency: 'USD' },
    ], { currency: 'USD' }, RATES, NOW);
    assert(e.total === 50, `total ${e.total}`);
  });

  test('a live stack is reported as recorded, not as checked', () => {
    const t = buildToday({ liveStacks: [{ stackName: 's1', region: 'eu-west-2', title: 'Site' }], now: NOW });
    const item = t.attention.find((a) => a.kind === 'aws');
    assert(item, 'live stack not surfaced');
    assert(/not checked against AWS/.test(item.detail), 'claimed more certainty than it has');
  });

  test('follow-ups: due and late are raised, future and closed are not', () => {
    const f = dueFollowUps([
      { id: 'late', status: 'sent', followUpAt: day(-2) },
      { id: 'today', status: 'sent', followUpAt: day(0) },
      { id: 'future', status: 'sent', followUpAt: day(3) },
      { id: 'won', status: 'hired', followUpAt: day(-5) },
      { id: 'draft', status: 'draft', followUpAt: day(-5) },
      { id: 'none', status: 'sent' },
    ], NOW);
    assert(f.map((x) => x.id).join() === 'late,today', `got ${f.map((x) => x.id).join()}`);
  });

  test('an invoice total that cannot be read makes "owed" a floor, and says so', () => {
    assert(invoiceTotal({ lineItems: [{ qty: 2, unit: 50 }], taxPct: 10 }) === 110, 'total wrong');
    assert(invoiceTotal({ lineItems: [{ qty: 'x' }] }) === null, 'unreadable total was guessed');
    const t = buildToday({ invoices: [{ status: 'sent', dueAt: day(5), lineItems: [{ qty: 'x' }] }], now: NOW });
    assert(t.stats.owed.incomplete && t.notes.some((n) => /at least/.test(n)), 'did not flag incomplete total');
  });

  test('each job gets the one next step that moves it forward', () => {
    const art = (o) => ({ solution: [], proposal: [], contract: [], invoice: [], caseStudy: [], portfolio: [], ...o });
    const jobs = jobProgress([
      { id: 'a', title: 'A', artifacts: art({}) },
      { id: 'b', title: 'B', artifacts: art({ solution: [{}] }) },
      { id: 'c', title: 'C', artifacts: art({ solution: [{}], proposal: [{ status: 'sent' }] }) },
      { id: 'd', title: 'D', artifacts: art({ proposal: [{ status: 'hired' }] }) },
      { id: 'e', title: 'E', artifacts: art({ proposal: [{ status: 'hired' }], contract: [{}] }) },
      { id: 'f', title: 'F', artifacts: art({ contract: [{}], invoice: [{ status: 'paid' }] }) },
      { id: 'g', title: 'G', artifacts: art({ caseStudy: [{}] }) },
    ]);
    const steps = Object.fromEntries(jobs.map((j) => [j.id, j.next.step]));
    assert(steps.a === 'design' && steps.b === 'proposal' && steps.c === 'win', JSON.stringify(steps));
    assert(steps.d === 'contract' && steps.e === 'invoice', JSON.stringify(steps));
    assert(!('f' in steps) && !('g' in steps), 'finished work shown as in progress');
  });

  test('the most urgent things come first: overdue money, then running AWS', () => {
    const t = buildToday({
      proposals: [{ status: 'sent', followUpAt: day(-1), clientName: 'P' }],
      invoices: [{ status: 'sent', dueAt: day(-4), number: 'INV-1' }],
      liveStacks: [{ stackName: 's' }],
      now: NOW,
    });
    assert(t.attention.map((a) => a.kind).join() === 'invoice,aws,followup', t.attention.map((a) => a.kind).join());
  });

  return { allPassed: results.every((r) => r.pass), results };
}
