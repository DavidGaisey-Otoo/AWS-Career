export const INVOICE_SCENARIOS = [
  // 1. Empty invoice
  {
    id: 'empty',
    name: 'Empty invoice',
    input: { invoice: {} },
    expectedRules: ['INV-EMPTY-001'],
  },

  // 2. Broken — missing everything
  {
    id: 'broken',
    name: 'Broken invoice — missing fields',
    input: {
      invoice: {
        client: { name: '' },
        lineItems: [{ description: 'Work', quantity: 1, rate: 1000, amount: 1000 }],
        currency: 'USD',
      },
      supplierCountry: 'GB',
    },
    expectedRules: [
      'INV-NUMBER-001',
      'INV-DATE-001',
      'INV-DUE-DATE-001',
      'INV-CLIENT-001',
      'INV-CLIENT-ADDR-001',
      'INV-SUPPLIER-001',
      'INV-SUPPLIER-ADDR-001',
      'INV-VAGUE-DESC-001',
      'INV-PAY-METHOD-001',
      'INV-PAY-TERMS-001',
    ],
  },

  // 3. Math error
  {
    id: 'math-error',
    name: 'Invoice with broken math',
    input: {
      invoice: {
        number: 'INV-2026-001',
        date: '2026-06-01',
        dueDate: '2026-06-15',
        client: { name: 'Acme', company: 'Acme Corp', address: '123 St' },
        supplier: { name: 'David', address: '1 High St', vatNumber: 'GB123456789', bank: { iban: 'GB12...' } },
        lineItems: [
          { description: 'AWS Audit Phase 1', quantity: 1, rate: 5000, amount: 5000 },
          { description: 'AWS Audit Phase 2', quantity: 1, rate: 5000, amount: 5000 },
        ],
        subtotal: 9000, // wrong — should be 10000
        currency: 'USD',
        taxPct: 20,
        tax: 500, // wrong — should be 2000
        total: 9500, // also wrong
        payment: { method: 'Bank Transfer', terms: 'Net 14' },
      },
      supplierCountry: 'GB',
    },
    expectedRules: [
      'INV-MATH-001',
      'INV-TAX-MATH-001',
      'INV-TOTAL-MATH-001',
    ],
  },

  // 4. Charging VAT without VAT number
  {
    id: 'vat-no-number',
    name: 'Charging VAT without VAT number',
    input: {
      invoice: {
        number: 'INV-2026-002',
        date: '2026-06-01',
        dueDate: '2026-06-15',
        client: { name: 'Acme', company: 'Acme Corp', address: '123 St' },
        supplier: { name: 'David', address: '1 High St' }, // no vatNumber!
        lineItems: [
          { description: 'AWS architecture services — June', quantity: 1, rate: 8000, amount: 8000 },
        ],
        currency: 'GBP',
        taxPct: 20, // charging VAT without showing number = fraud
        payment: { method: 'Bank Transfer', terms: 'Net 14' },
      },
      supplierCountry: 'GB',
    },
    expectedRules: [
      'INV-VAT-NO-NUMBER-001',
    ],
  },

  // 5. Solid invoice
  {
    id: 'solid',
    name: 'Solid invoice',
    input: {
      invoice: {
        number: 'INV-2026-001',
        date: '2026-06-01',
        dueDate: '2026-06-15',
        client: { name: 'Sarah Smith', company: 'Acme Corp', address: '123 Main St, London EC1A 1AA' },
        supplier: { name: 'David Otoo', address: '1 High St, London W1A 1AA', vatNumber: 'GB123456789', bank: { iban: 'GB29NWBK60161331926819', bic: 'NWBKGB2L' } },
        lineItems: [
          { description: 'AWS Architecture Audit — Phase 1 (Discovery)', quantity: 1, rate: 4000, amount: 4000 },
          { description: 'AWS Architecture Audit — Phase 2 (Recommendations)', quantity: 1, rate: 4000, amount: 4000 },
        ],
        subtotal: 8000,
        currency: 'GBP',
        taxPct: 20,
        tax: 1600,
        total: 9600,
        payment: { method: 'Bank Transfer', terms: 'Payable Net-14 (14 days from invoice date). Late payments accrue interest at 1.5% per month.' },
      },
      supplierCountry: 'GB',
    },
    expectedRules: [],
    expectMaxFindings: 1,
  },
];
