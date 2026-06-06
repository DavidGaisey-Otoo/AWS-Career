/**
 * invoiceAgents/framework.js — invoice quality auditor base.
 *
 * 1 agent: Invoice Quality Auditor
 *   Reviews invoice OBJECTS (not raw text) so we get math + structure
 *   together. Validates required fields, VAT/tax math, currency
 *   consistency, payment terms presence.
 */

export const SEVERITY = {
  critical: { rank: 0, label: 'Critical', tone: 'danger' },
  high:     { rank: 1, label: 'High',     tone: 'danger' },
  medium:   { rank: 2, label: 'Medium',   tone: 'warning' },
  low:      { rank: 3, label: 'Low',      tone: 'sky' },
  info:     { rank: 4, label: 'Info',     tone: 'success' },
};

export function bySeverity(a, b) {
  return (SEVERITY[a.severity]?.rank ?? 99) - (SEVERITY[b.severity]?.rank ?? 99);
}

export function finding({ severity, title, body, fix, ruleId, evidence }) {
  return { severity, title, body, fix: fix || null, ruleId: ruleId || null, evidence: evidence || null };
}

// ════════════════════════════════════════════════════════════════════
// Invoice shape (matches buildInvoice in data/documents.js)
// {
//   number, date, dueDate,
//   client: { name, email, company, address, country, vatNumber },
//   supplier: { name, address, vatNumber, bank: { ... } },
//   project: { name },
//   lineItems: [{ description, quantity, rate, amount }],
//   currency, taxPct,
//   payment: { method, terms, notes }
// }
// ════════════════════════════════════════════════════════════════════

export function buildContext({ invoice = {}, supplierCountry = 'GB', clientCountry = '' } = {}) {
  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const subtotal = lineItems.reduce((s, li) => s + (Number(li.amount) || (Number(li.quantity || 0) * Number(li.rate || 0))), 0);
  const taxPct = Number(invoice.taxPct || 0);
  const tax = subtotal * (taxPct / 100);
  const total = subtotal + tax;

  return {
    invoice,
    lineItems,
    subtotal,
    tax,
    total,
    currency: String(invoice.currency || 'USD').toUpperCase(),
    supplierCountry: String(supplierCountry || 'GB').toUpperCase(),
    clientCountry: String(clientCountry || '').toUpperCase(),
  };
}

export function scoreFromFindings(findings) {
  if (!findings || findings.length === 0) return 100;
  const weights = { critical: -25, high: -10, medium: -4, low: -1, info: 0 };
  const total = findings.reduce((s, f) => s + (weights[f.severity] || 0), 0);
  return Math.max(0, Math.min(100, 100 + total));
}

export function gradeFromScore(score) {
  if (score >= 90) return { letter: 'A+', tone: 'success' };
  if (score >= 80) return { letter: 'A',  tone: 'success' };
  if (score >= 70) return { letter: 'B',  tone: 'success' };
  if (score >= 60) return { letter: 'C',  tone: 'warning' };
  if (score >= 50) return { letter: 'D',  tone: 'warning' };
  return { letter: 'F', tone: 'danger' };
}
