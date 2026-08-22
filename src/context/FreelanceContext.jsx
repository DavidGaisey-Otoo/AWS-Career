import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const FreelanceContext = createContext(null);

// ------------------------------ defaults ------------------------------

const DEFAULT_RATES = {
  // Static USD-based rate table — user can edit in the Currency Center.
  // Last updated stamp is kept so the UI can show staleness.
  base: 'USD',
  updatedAt: '2026-05-15',
  rates: {
    USD: 1.0,
    GBP: 0.79,
    EUR: 0.92,
    GHS: 12.5,
    AUD: 1.51,
    CAD: 1.36,
    AED: 3.67,
  },
};

// Default payment-method fee model (used by the comparison card)
const DEFAULT_FEES = [
  { id: 'wise',     label: 'Wise',     baseFeePct: 0.5,  fxMarkupPct: 0,   withdrawFee: 0.0, blurb: 'Best for international receives; near-mid-market FX.' },
  { id: 'payoneer', label: 'Payoneer', baseFeePct: 1.0,  fxMarkupPct: 2.0, withdrawFee: 1.5, blurb: 'Default for Upwork payouts; FX markup hurts on small amounts.' },
  { id: 'paypal',   label: 'PayPal',   baseFeePct: 2.9,  fxMarkupPct: 4.0, withdrawFee: 0.0, blurb: 'Convenient but expensive — avoid for >$200 transfers.' },
  { id: 'bank',     label: 'Direct bank wire', baseFeePct: 0, fxMarkupPct: 0, withdrawFee: 25, blurb: 'Cheapest for large amounts; slow + needs IBAN/SWIFT.' },
];

const DEFAULT_STATE = {
  proposals: [],           // { id, sentAt, platform, clientName, jobTitle, budget, status, followUpAt, notes, body? }
  clients: [],             // { id, name, company, email, phone, country, timezone, platform, industry, status, rating, notes, birthday?, comms: [], referredCount }
  payments: [],            // { id, at, clientId?, clientName, projectTitle, amount, currency, method, invoiceId? }
  invoices: [],            // { id, number, issuedAt, dueAt, clientName, clientEmail, lineItems: [{desc, qty, unit, amount}], taxPct, notes, status, paidAt? }
  expenses: [],            // { id, at, category, amount, currency, note, receipt? }
  goals: {
    monthlyTarget: 5000,
    annualTarget: 60000,
    currency: 'USD',
  },
  rates: DEFAULT_RATES,
  fees: DEFAULT_FEES,
  // Personal branding
  branding: {
    linkedinScore: null,            // { score, breakdown, suggestions }
    linkedinDraft: '',
    headlineChoice: null,
    websiteDrafts: {},              // { hero, about, services }
    githubReadmeDraft: '',
  },
};

// ------------------------------ helpers ------------------------------

function toUSD(amount, currency, rates) {
  const r = rates.rates[currency] ?? 1;
  return amount / r;
}

function fromUSD(amount, currency, rates) {
  const r = rates.rates[currency] ?? 1;
  return amount * r;
}

function isSameMonth(iso, ref = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function isSameYear(iso, ref = new Date()) {
  return new Date(iso).getFullYear() === ref.getFullYear();
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// ============================ provider ============================

export function FreelanceProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::freelance`, DEFAULT_STATE);

  // ---------------- proposals ----------------
  const addProposal = useCallback((p) => {
    setState((s) => ({
      ...s,
      proposals: [
        { id: uid(), createdAt: new Date().toISOString(), status: 'draft', ...p },
        ...s.proposals,
      ].slice(0, 200),
    }));
  }, [setState]);

  const updateProposal = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      proposals: s.proposals.map((p) => p.id === id ? { ...p, ...patch } : p),
    }));
  }, [setState]);

  const deleteProposal = useCallback((id) => {
    setState((s) => ({ ...s, proposals: s.proposals.filter((p) => p.id !== id) }));
  }, [setState]);

  // ---------------- clients ----------------
  const addClient = useCallback((c) => {
    setState((s) => ({
      ...s,
      clients: [
        { id: uid(), addedAt: new Date().toISOString(), status: 'prospect', rating: 0, comms: [], referredCount: 0, ...c },
        ...s.clients,
      ],
    }));
  }, [setState]);

  const updateClient = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) => c.id === id ? { ...c, ...patch } : c),
    }));
  }, [setState]);

  const deleteClient = useCallback((id) => {
    setState((s) => ({ ...s, clients: s.clients.filter((c) => c.id !== id) }));
  }, [setState]);

  const logCommunication = useCallback((clientId, note, channel = 'note') => {
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) =>
        c.id === clientId
          ? { ...c, comms: [{ id: uid(), at: new Date().toISOString(), note, channel }, ...c.comms] }
          : c),
    }));
  }, [setState]);

  // ---------------- payments / earnings ----------------
  const addPayment = useCallback((p) => {
    setState((s) => ({
      ...s,
      payments: [{ id: uid(), at: new Date().toISOString(), ...p }, ...s.payments],
    }));
  }, [setState]);

  const updatePayment = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      payments: s.payments.map((p) => p.id === id ? { ...p, ...patch } : p),
    }));
  }, [setState]);

  const deletePayment = useCallback((id) => {
    setState((s) => ({ ...s, payments: s.payments.filter((p) => p.id !== id) }));
  }, [setState]);

  // ---------------- invoices ----------------
  const addInvoice = useCallback((inv) => {
    setState((s) => {
      const existingNumbers = s.invoices.map((i) => parseInt(i.number?.replace(/\D/g, ''), 10) || 0);
      const next = (Math.max(0, ...existingNumbers) || 0) + 1;
      const number = inv.number || `INV-${String(next).padStart(4, '0')}`;
      return {
        ...s,
        invoices: [
          { id: uid(), issuedAt: new Date().toISOString(), status: 'draft', ...inv, number },
          ...s.invoices,
        ],
      };
    });
  }, [setState]);

  const updateInvoice = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      invoices: s.invoices.map((i) => i.id === id ? { ...i, ...patch } : i),
    }));
  }, [setState]);

  const deleteInvoice = useCallback((id) => {
    setState((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) }));
  }, [setState]);

  // ---------------- expenses ----------------
  const addExpense = useCallback((e) => {
    setState((s) => ({
      ...s,
      expenses: [{ id: uid(), at: new Date().toISOString(), ...e }, ...s.expenses],
    }));
  }, [setState]);

  const updateExpense = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      expenses: s.expenses.map((e) => e.id === id ? { ...e, ...patch } : e),
    }));
  }, [setState]);

  const deleteExpense = useCallback((id) => {
    setState((s) => ({ ...s, expenses: s.expenses.filter((e) => e.id !== id) }));
  }, [setState]);

  // ---------------- goals + rates + branding ----------------
  const setGoals = useCallback((patch) => {
    setState((s) => ({ ...s, goals: { ...s.goals, ...patch } }));
  }, [setState]);

  const setRate = useCallback((currency, value) => {
    setState((s) => ({
      ...s,
      rates: {
        ...s.rates,
        rates: { ...s.rates.rates, [currency]: value },
        updatedAt: new Date().toISOString().slice(0, 10),
      },
    }));
  }, [setState]);

  const setBranding = useCallback((patch) => {
    setState((s) => ({ ...s, branding: { ...s.branding, ...patch } }));
  }, [setState]);

  // ---------------- reset ----------------
  const resetFreelance = useCallback(() => setState(DEFAULT_STATE), [setState]);

  // ---------------- derived ----------------

  // Convert an amount in any currency to USD using state.rates.
  const convertToUSD = useCallback((amount, currency = 'USD') =>
    toUSD(amount, currency, state.rates), [state.rates]);

  // Convert USD to another currency
  const convertFromUSD = useCallback((usd, target) =>
    fromUSD(usd, target, state.rates), [state.rates]);

  // Proposal stats
  const proposalStats = useMemo(() => {
    const submitted = state.proposals.filter((p) => p.status !== 'draft');
    const drafts = state.proposals.length - submitted.length;
    const total = submitted.length;
    const hired = submitted.filter((p) => p.status === 'hired').length;
    const responded = submitted.filter((p) =>
      ['responded', 'hired'].includes(p.status)).length;
    const winRate = total ? Math.round((hired / total) * 100) : 0;
    const responseRate = total ? Math.round((responded / total) * 100) : 0;

    // best-performing platform by win rate
    const byPlatform = {};
    for (const p of submitted) {
      const k = p.platform || 'Unknown';
      if (!byPlatform[k]) byPlatform[k] = { sent: 0, hired: 0 };
      byPlatform[k].sent += 1;
      if (p.status === 'hired') byPlatform[k].hired += 1;
    }
    const bestPlatform = Object.entries(byPlatform)
      .map(([k, v]) => ({ platform: k, ...v, winRate: v.sent ? v.hired / v.sent : 0 }))
      .sort((a, b) => b.winRate - a.winRate)[0];

    // overdue follow-ups
    const today = new Date().toISOString().slice(0, 10);
    const overdueFollowUps = state.proposals.filter((p) =>
      p.followUpAt && p.followUpAt < today && !['hired', 'rejected', 'no-response'].includes(p.status)).length;

    return { total, drafts, hired, responded, winRate, responseRate, byPlatform, bestPlatform, overdueFollowUps };
  }, [state.proposals]);

  // Earnings stats (everything normalised to USD)
  const earningsStats = useMemo(() => {
    const totalUSD = state.payments.reduce((sum, p) =>
      sum + toUSD(p.amount, p.currency || 'USD', state.rates), 0);
    const thisMonthUSD = state.payments
      .filter((p) => isSameMonth(p.at))
      .reduce((s, p) => s + toUSD(p.amount, p.currency || 'USD', state.rates), 0);
    const lastMonthRef = new Date();
    lastMonthRef.setMonth(lastMonthRef.getMonth() - 1);
    const lastMonthUSD = state.payments
      .filter((p) => isSameMonth(p.at, lastMonthRef))
      .reduce((s, p) => s + toUSD(p.amount, p.currency || 'USD', state.rates), 0);
    const ytdUSD = state.payments
      .filter((p) => isSameYear(p.at))
      .reduce((s, p) => s + toUSD(p.amount, p.currency || 'USD', state.rates), 0);
    const growthPct = lastMonthUSD > 0 ? Math.round(((thisMonthUSD - lastMonthUSD) / lastMonthUSD) * 100) : null;

    // by client + by project type
    const byClient = {};
    const byProject = {};
    for (const p of state.payments) {
      const usd = toUSD(p.amount, p.currency || 'USD', state.rates);
      const ck = p.clientName || 'Unknown';
      const pk = p.projectTitle || 'Unspecified';
      byClient[ck] = (byClient[ck] || 0) + usd;
      byProject[pk] = (byProject[pk] || 0) + usd;
    }

    // monthly series (last 12 months)
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
      const total = state.payments
        .filter((p) => isSameMonth(p.at, ref))
        .reduce((s, p) => s + toUSD(p.amount, p.currency || 'USD', state.rates), 0);
      months.push({ key, label: ref.toLocaleString('en', { month: 'short' }), total: Math.round(total) });
    }
    const bestMonth = months.reduce((best, m) => m.total > (best?.total ?? 0) ? m : best, null);

    return {
      totalUSD,
      thisMonthUSD,
      lastMonthUSD,
      growthPct,
      ytdUSD,
      byClient,
      byProject,
      months,
      bestMonth,
    };
  }, [state.payments, state.rates]);

  // Expense stats
  const expenseStats = useMemo(() => {
    const totalUSD = state.expenses.reduce((s, e) =>
      s + toUSD(e.amount, e.currency || 'USD', state.rates), 0);
    const thisMonthUSD = state.expenses
      .filter((e) => isSameMonth(e.at))
      .reduce((s, e) => s + toUSD(e.amount, e.currency || 'USD', state.rates), 0);

    const byCategory = {};
    for (const e of state.expenses) {
      const usd = toUSD(e.amount, e.currency || 'USD', state.rates);
      const k = e.category || 'Other';
      byCategory[k] = (byCategory[k] || 0) + usd;
    }

    // 12-month series
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const total = state.expenses
        .filter((e) => isSameMonth(e.at, ref))
        .reduce((s, e) => s + toUSD(e.amount, e.currency || 'USD', state.rates), 0);
      months.push({ label: ref.toLocaleString('en', { month: 'short' }), total: Math.round(total) });
    }

    return { totalUSD, thisMonthUSD, byCategory, months };
  }, [state.expenses, state.rates]);

  // Goal progress
  const goalProgress = useMemo(() => {
    const monthlyTargetUSD = toUSD(state.goals.monthlyTarget || 0, state.goals.currency, state.rates);
    const annualTargetUSD = toUSD(state.goals.annualTarget || 0, state.goals.currency, state.rates);

    const pctOfMonth = monthlyTargetUSD > 0
      ? Math.round((earningsStats.thisMonthUSD / monthlyTargetUSD) * 100)
      : 0;
    const today = new Date();
    const dim = daysInMonth(today);
    const daysLeft = dim - today.getDate();
    const daysSoFar = today.getDate();
    const dailyPace = daysSoFar > 0 ? earningsStats.thisMonthUSD / daysSoFar : 0;
    const projectedMonthUSD = dailyPace * dim;
    const remainingNeeded = Math.max(0, monthlyTargetUSD - earningsStats.thisMonthUSD);
    const dailyNeededUSD = daysLeft > 0 ? remainingNeeded / daysLeft : remainingNeeded;
    const onTrack = projectedMonthUSD >= monthlyTargetUSD;

    const pctOfYear = annualTargetUSD > 0
      ? Math.round((earningsStats.ytdUSD / annualTargetUSD) * 100)
      : 0;

    // profit + tax estimate
    const profitUSD = earningsStats.totalUSD - expenseStats.totalUSD;
    const estTaxUSD = Math.max(0, profitUSD * 0.25); // simple 25% reserve
    const breakEvenUSD = expenseStats.totalUSD;

    return {
      monthlyTargetUSD, annualTargetUSD,
      pctOfMonth, daysLeft, dailyPace, projectedMonthUSD,
      remainingNeeded, dailyNeededUSD, onTrack,
      pctOfYear, profitUSD, estTaxUSD, breakEvenUSD,
    };
  }, [state.goals, state.rates, earningsStats, expenseStats]);

  const value = useMemo(() => ({
    state,
    // proposals
    addProposal, updateProposal, deleteProposal, proposalStats,
    // clients
    addClient, updateClient, deleteClient, logCommunication,
    // payments
    addPayment, updatePayment, deletePayment,
    // invoices
    addInvoice, updateInvoice, deleteInvoice,
    // expenses
    addExpense, updateExpense, deleteExpense,
    // goals / rates / branding
    setGoals, setRate, setBranding,
    // derived
    earningsStats, expenseStats, goalProgress,
    // currency helpers
    convertToUSD, convertFromUSD,
    // reset
    resetFreelance,
  }), [
    state,
    addProposal, updateProposal, deleteProposal, proposalStats,
    addClient, updateClient, deleteClient, logCommunication,
    addPayment, updatePayment, deletePayment,
    addInvoice, updateInvoice, deleteInvoice,
    addExpense, updateExpense, deleteExpense,
    setGoals, setRate, setBranding,
    earningsStats, expenseStats, goalProgress,
    convertToUSD, convertFromUSD,
    resetFreelance,
  ]);

  return <FreelanceContext.Provider value={value}>{children}</FreelanceContext.Provider>;
}

export function useFreelance() {
  const ctx = useContext(FreelanceContext);
  if (!ctx) throw new Error('useFreelance must be used within FreelanceProvider');
  return ctx;
}
