/**
 * paymentTerms.js — Payment Terms Auditor
 *
 * Checks net-X clarity, late fees, deposit, milestone payments, currency,
 * kill-fee, auto-renewal traps.
 */

import { finding } from './framework.js';

export const paymentTermsAuditor = {
  id: 'paymentTerms',
  name: 'Tomás Garcia',
  role: 'Payment Terms Auditor',
  expertiseAreas: ['Payment terms', 'Cash flow protection', 'Currency risk', 'Kill fees'],
  yearsExperience: 18,
  systemPrompt: 'You are a senior commercial dealmaker reviewing payment terms in a freelance contract. Flag any term that could delay or prevent payment.',

  review(ctx) {
    const findings = [];
    const { contractText, paymentTerms, wordCount: words, currency } = ctx;

    if (!contractText || words < 15) return findings;

    // PAY-NET-DAYS-001 — no net-X terms specified
    if (!paymentTerms.netDays) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PAY-NET-DAYS-001',
        title: 'No payment due date / net-X terms',
        body: 'Without "net-7", "net-14", "net-30" etc., the client decides when to pay. Average freelancer waits 60+ days.',
        fix: 'Add: "Invoices payable Net-14 (within 14 days of invoice date)."',
      }));
    }

    // PAY-LATE-FEE-001 — no late fee clause
    if (!paymentTerms.lateFee) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PAY-LATE-FEE-001',
        title: 'No late-payment fee clause',
        body: 'Without a late fee, the client has zero financial incentive to pay on time.',
        fix: 'Add: "Late payments accrue interest at 1.5% per month or the maximum permitted by law, whichever is lower." (UK: under the Late Payment of Commercial Debts (Interest) Act 1998, you are entitled to 8%+BoE base rate.)',
      }));
    }

    // PAY-DEPOSIT-001 — no deposit / upfront payment
    if (!paymentTerms.deposit) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PAY-DEPOSIT-001',
        title: 'No deposit / upfront payment clause',
        body: 'Without an upfront deposit, you carry 100% of the kickoff risk. Standard is 25-50% upfront for fixed-price work.',
        fix: 'Add: "Client shall pay a 50% deposit upon contract signing, prior to commencement of work."',
      }));
    }

    // PAY-MILESTONES-001 — for large projects, no milestone payments
    if (words > 300 && !paymentTerms.milestones && !paymentTerms.deposit) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PAY-MILESTONES-001',
        title: 'No milestone / phased payment schedule',
        body: 'Large projects without milestone payments leave you carrying weeks of unpaid work. If the client disappears, you\'re uncompensated.',
        fix: 'Add: "50% on signing, 25% at midpoint review, 25% on handover. Each milestone invoiced separately."',
      }));
    }

    // PAY-KILL-FEE-001 — no kill fee for fixed-price work
    if (!paymentTerms.killFee && /\bfixed[- ]?(price|fee)|flat[- ]?fee|project fee\b/i.test(contractText)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PAY-KILL-FEE-001',
        title: 'Fixed-price contract with no kill-fee clause',
        body: 'If the client cancels mid-project, you may not be paid for completed work. A kill fee protects against this.',
        fix: 'Add: "If Client terminates for convenience, Client shall pay Contractor for all work completed plus 25% of the remaining project fee as a kill fee."',
      }));
    }

    // PAY-AUTO-RENEWAL-001 — auto-renewal traps
    if (paymentTerms.autoRenewal) {
      // Auto-renewal can be GOOD for retainer freelancers, but flag for review
      findings.push(finding({
        severity: 'low',
        ruleId: 'PAY-AUTO-RENEWAL-001',
        title: 'Auto-renewal clause detected',
        body: 'Auto-renewal can lock either party into unwanted continuations. Verify the renewal terms work in YOUR favour, not just the client\'s.',
        fix: 'Ensure rate review at renewal, and either party can opt out with 30+ days notice.',
      }));
    }

    // PAY-CURRENCY-001 — no currency stated, or mismatched currency
    if (!/USD|EUR|GBP|JPY|CAD|AUD|\$|€|£|¥/.test(contractText)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'PAY-CURRENCY-001',
        title: 'No currency specified for fees',
        body: 'Without an explicit currency, international clients can later claim ambiguity (e.g. "we thought $X meant CAD").',
        fix: `Add explicit currency to every amount: "${currency} $X" or "${currency} X.XX".`,
      }));
    }

    // PAY-CURRENCY-MIXED-001 — multiple currencies in same contract
    const currencyMatches = Array.from(contractText.matchAll(/\b(USD|EUR|GBP|JPY|CAD|AUD)\b/g)).map((m) => m[1]);
    if (new Set(currencyMatches).size >= 2) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'PAY-CURRENCY-MIXED-001',
        title: 'Contract references multiple currencies',
        body: `Found: ${[...new Set(currencyMatches)].join(', ')}. Exchange rate ambiguity = disputes.`,
        fix: 'Pick one currency for the entire contract. Or state the FX conversion source + date.',
      }));
    }

    // PAY-EXPENSES-001 — no expense reimbursement clause
    if (!/\b(expenses?|travel|accommodation|reimburs|out[- ]of[- ]pocket)\b/i.test(contractText) && words > 300) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PAY-EXPENSES-001',
        title: 'No expense reimbursement clause',
        body: 'If you incur travel/SaaS/license expenses, who pays?',
        fix: 'Add: "Client will reimburse pre-approved expenses (travel, third-party SaaS, etc.) at cost, within 7 days of receipt submission."',
      }));
    }

    // PAY-METHOD-001 — no payment method specified
    if (!/\b(bank transfer|wire|ACH|BACS|SEPA|stripe|paypal|wise|crypto|cheque|check)\b/i.test(contractText)) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'PAY-METHOD-001',
        title: 'No payment method specified',
        body: 'Without a preferred payment method, the client picks the slowest/cheapest for them (often international cheque).',
        fix: 'Add: "Payment via bank transfer to Contractor\'s nominated account. Other methods may incur a 3% surcharge."',
      }));
    }

    return findings;
  },
};
