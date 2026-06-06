/**
 * quality.js — Invoice Quality Auditor.
 *
 * Validates required fields, math, VAT (UK + EU rules), currency,
 * payment terms, dates.
 */

import { finding } from './framework.js';

const UK_VAT_THRESHOLD_GBP = 85000; // 2026 still 90k? Use 85k as conservative.
const UK_STANDARD_VAT = 20;

export const invoiceQualityAuditor = {
  id: 'invoiceQuality',
  name: 'Imani Okafor',
  role: 'Invoice Quality Auditor',
  expertiseAreas: ['Invoice compliance', 'UK + EU VAT', 'Cash collection', 'HMRC rules'],
  yearsExperience: 16,
  systemPrompt: 'You are a senior chartered accountant who has reviewed thousands of freelance invoices. Flag anything that could delay payment or cause HMRC/tax problems.',

  review(ctx) {
    const findings = [];
    const { invoice, lineItems, subtotal, tax, total, currency, supplierCountry, clientCountry } = ctx;

    if (!invoice || Object.keys(invoice).length === 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-EMPTY-001',
        title: 'Empty invoice object',
        body: 'No invoice data to review.',
        fix: 'Generate the invoice first.',
      }));
      return findings;
    }

    // ════════════════════════════════════════════════════════════════
    // Required-field checks
    // ════════════════════════════════════════════════════════════════
    if (!invoice.number) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-NUMBER-001',
        title: 'Missing invoice number',
        body: 'Sequential invoice numbers are legally required in most jurisdictions (UK, EU, US). Without one, the invoice may be challenged or rejected.',
        fix: 'Add a unique invoice number (e.g. INV-2026-001).',
      }));
    }

    if (!invoice.date) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-DATE-001',
        title: 'Missing invoice date',
        body: 'The invoice date determines payment due date and tax point. Missing date = unenforceable.',
        fix: 'Add the issue date.',
      }));
    }

    if (!invoice.dueDate) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INV-DUE-DATE-001',
        title: 'Missing due date',
        body: 'Without an explicit due date, the client decides when to pay. Average wait jumps from ~14 days to ~60.',
        fix: 'Add a due date 14 days from issue date.',
      }));
    } else if (invoice.date && invoice.dueDate) {
      const dueAfter = new Date(invoice.dueDate) > new Date(invoice.date);
      if (!dueAfter) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'INV-DUE-BEFORE-DATE-001',
          title: 'Due date is before or same as issue date',
          body: 'Due date should be after the invoice date. Client will reject.',
          fix: 'Fix the due date to be at least 7 days after the issue date.',
        }));
      }
    }

    if (!invoice.client?.name && !invoice.client?.company) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INV-CLIENT-001',
        title: 'Missing client name / company',
        body: 'Invoice must clearly identify who is being billed.',
        fix: 'Add the client\'s legal company name (not just a person\'s name).',
      }));
    }

    if (!invoice.client?.address) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INV-CLIENT-ADDR-001',
        title: 'Missing client billing address',
        body: 'HMRC requires the buyer\'s address on VAT invoices. Without it, the client may refuse to pay.',
        fix: 'Add the client\'s registered/billing address.',
      }));
    }

    if (!invoice.supplier?.name) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-SUPPLIER-001',
        title: 'Missing supplier (your) name',
        body: 'Your name or trading name must appear on the invoice.',
        fix: 'Add your legal name / trading name.',
      }));
    }

    if (!invoice.supplier?.address && supplierCountry === 'GB') {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INV-SUPPLIER-ADDR-001',
        title: 'Missing supplier address',
        body: 'UK HMRC requires your business address on invoices.',
        fix: 'Add your registered business address.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // Line item checks
    // ════════════════════════════════════════════════════════════════
    if (!lineItems || lineItems.length === 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-NO-LINES-001',
        title: 'Invoice has no line items',
        body: 'Empty invoices won\'t be paid.',
        fix: 'Add at least one line item with description, quantity, rate, and amount.',
      }));
    } else {
      const vagueDesc = lineItems.filter((li) =>
        !li.description ||
        /^(work|services?|consulting|hours?|labor|labour)$/i.test(li.description.trim())
      );
      if (vagueDesc.length > 0) {
        findings.push(finding({
          severity: 'medium',
          ruleId: 'INV-VAGUE-DESC-001',
          title: `${vagueDesc.length} line item(s) with vague description`,
          body: 'Vague descriptions like "Services" / "Work" delay payment because client AP team can\'t match the line to a PO/scope.',
          fix: 'Make each line specific: "AWS architecture audit — Phase 1 (Discovery)" not "Services".',
        }));
      }

      const zeroOrNegative = lineItems.filter((li) => Number(li.amount ?? (li.quantity * li.rate)) <= 0);
      if (zeroOrNegative.length > 0) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'INV-ZERO-AMOUNT-001',
          title: `${zeroOrNegative.length} line item(s) with zero or negative amount`,
          body: 'Likely a math/data entry error.',
          fix: 'Recalculate or remove the zero-amount lines.',
        }));
      }

      // Math sanity check — sum of line items should equal stated subtotal
      const computedSubtotal = lineItems.reduce((s, li) => s + (Number(li.amount) || (Number(li.quantity || 0) * Number(li.rate || 0))), 0);
      if (invoice.subtotal != null && Math.abs(Number(invoice.subtotal) - computedSubtotal) > 0.02) {
        findings.push(finding({
          severity: 'critical',
          ruleId: 'INV-MATH-001',
          title: 'Stated subtotal doesn\'t match line items',
          body: `Sum of line items = ${computedSubtotal.toFixed(2)}, stated subtotal = ${invoice.subtotal}. Math errors invalidate the invoice.`,
          fix: 'Recompute. Either fix the subtotal or fix the line items.',
        }));
      }
    }

    // ════════════════════════════════════════════════════════════════
    // VAT / tax checks (UK-focused)
    // ════════════════════════════════════════════════════════════════
    const isUkSupplier = supplierCountry === 'GB' || supplierCountry === 'UK';
    const supplierVatNumber = invoice.supplier?.vatNumber || invoice.vatNumber;

    if (isUkSupplier && subtotal > UK_VAT_THRESHOLD_GBP / 12 && Number(invoice.taxPct || 0) === 0 && !supplierVatNumber) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INV-VAT-THRESHOLD-001',
        title: 'High-value UK invoice with 0% VAT and no VAT number',
        body: `UK VAT registration threshold is £${UK_VAT_THRESHOLD_GBP.toLocaleString()} rolling 12 months. If you've crossed it, you must register and charge VAT.`,
        fix: 'Confirm your VAT registration status. If registered, add your VAT number and charge 20% on UK + EU sales (depending on B2B vs B2C).',
      }));
    }

    if (Number(invoice.taxPct || 0) > 0 && !supplierVatNumber) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-VAT-NO-NUMBER-001',
        title: 'Charging VAT without showing a VAT number',
        body: 'You\'re charging VAT (tax > 0%) but no VAT registration number is shown. Client cannot reclaim and HMRC may treat this as fraud.',
        fix: 'Add your VAT registration number to the supplier section. Format: GB123456789.',
      }));
    }

    if (isUkSupplier && Number(invoice.taxPct || 0) > 0 && Number(invoice.taxPct) !== UK_STANDARD_VAT && Number(invoice.taxPct) !== 5 && Number(invoice.taxPct) !== 0) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INV-VAT-RATE-001',
        title: `Unusual UK VAT rate: ${invoice.taxPct}%`,
        body: 'UK VAT rates are 20% (standard), 5% (reduced), or 0% (zero-rated). Other rates are unusual.',
        fix: 'Confirm the rate is correct for the supply type.',
      }));
    }

    // Math sanity on stated tax (if provided) vs computed
    const expectedTax = subtotal * (Number(invoice.taxPct || 0) / 100);
    if (invoice.tax != null && Math.abs(Number(invoice.tax) - expectedTax) > 0.02) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INV-TAX-MATH-001',
        title: 'Stated tax doesn\'t match (subtotal × tax%)',
        body: `Expected ${expectedTax.toFixed(2)}, invoice says ${Number(invoice.tax).toFixed(2)}.`,
        fix: 'Recompute tax. Check rounding rules (round each line or round total).',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // Payment + bank checks
    // ════════════════════════════════════════════════════════════════
    if (!invoice.payment?.method && !invoice.supplier?.bank) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INV-PAY-METHOD-001',
        title: 'No payment method / bank details',
        body: 'Client can\'t pay you if they don\'t know where to send the money.',
        fix: 'Add bank details (sort code + account, or IBAN + BIC, or Stripe/PayPal link).',
      }));
    }

    if (!invoice.payment?.terms && !invoice.dueDate) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'INV-PAY-TERMS-001',
        title: 'No payment terms text',
        body: 'A "Net-14" or similar phrase makes the due date visible at a glance.',
        fix: 'Add "Payable Net-14 (14 days from invoice date)" to the payment section.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // Currency consistency
    // ════════════════════════════════════════════════════════════════
    const hasCurrencyOnLines = lineItems.every((li) => li.currency == null || li.currency === currency);
    if (!hasCurrencyOnLines) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'INV-CURRENCY-MIX-001',
        title: 'Line items use different currencies than the invoice header',
        body: 'Mixed currencies cause dispute and FX confusion.',
        fix: 'Pick one currency for the invoice. Convert line items to match.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // Total sanity — stated total should equal subtotal + (stated or computed) tax
    // ════════════════════════════════════════════════════════════════
    const expectedTotal = subtotal + (invoice.tax != null ? Number(invoice.tax) : expectedTax);
    if (invoice.total != null && Math.abs(Number(invoice.total) - expectedTotal) > 0.02) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'INV-TOTAL-MATH-001',
        title: 'Stated total doesn\'t equal subtotal + tax',
        body: `Expected ${expectedTotal.toFixed(2)}, invoice says ${Number(invoice.total).toFixed(2)}.`,
        fix: 'Recompute the total. This is the #1 reason invoices get rejected.',
      }));
    }

    return findings;
  },
};
