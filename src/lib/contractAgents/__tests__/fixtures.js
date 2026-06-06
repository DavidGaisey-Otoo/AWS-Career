export const CONTRACT_SCENARIOS = [
  // 1. One-page contract missing everything
  {
    id: 'bare-bones',
    name: 'Bare-bones one-page contract',
    input: {
      contractText: `Contract between David and Acme Corp.

Acme will pay David $10,000 to build their AWS infrastructure.
Work to be completed in 6 weeks.
Signed: ____________`,
      currency: 'USD',
    },
    expectedRules: [
      'CONTRACT-LIAB-001',
      'CONTRACT-IP-001',
      'CONTRACT-TERMINATION-001',
      'CONTRACT-CONFIDENTIAL-001',
      'CONTRACT-LAW-001',
      'CONTRACT-SCOPE-001',
      'CONTRACT-WARRANTY-001',
      'PAY-NET-DAYS-001',
      'PAY-LATE-FEE-001',
      'PAY-DEPOSIT-001',
    ],
  },

  // 2. One-sided contract favouring client
  {
    id: 'one-sided',
    name: 'One-sided contract favouring client',
    input: {
      contractText: `MASTER SERVICES AGREEMENT

Client may terminate at any time without notice.
Contractor shall indemnify Client against all claims, losses, and damages.
Contractor grants Client a perpetual license to all deliverables and work product.
Contractor shall not engage in any similar work for any competitor for 5 years (non-compete).
Payment shall be made when Client deems work satisfactory.
This agreement automatically renews monthly.

Governing law: Delaware.`,
      currency: 'USD',
    },
    expectedRules: [
      'CONTRACT-LIAB-001',
      'CONTRACT-IP-001',
      'CONTRACT-CONFIDENTIAL-001',
      'CONTRACT-SCOPE-001',
      'CONTRACT-WARRANTY-001',
      'CONTRACT-ONE-SIDED-001',
      'CONTRACT-PERPETUAL-LICENSE-001',
      'PAY-NET-DAYS-001',
      'PAY-LATE-FEE-001',
      'PAY-DEPOSIT-001',
      'PAY-AUTO-RENEWAL-001',
    ],
  },

  // 3. Comprehensive solid contract
  {
    id: 'solid',
    name: 'Comprehensive solid contract',
    input: {
      contractText: `MASTER SERVICES AGREEMENT

1. SCOPE OF WORK
Contractor shall provide AWS architecture consulting services as described in Schedule A.

2. CHANGE ORDERS
Any change to the scope of work must be agreed in writing. Out-of-scope work quoted at $250/hr.

3. FEES & PAYMENT TERMS
Total fee: USD $14,500 fixed price.
Payment schedule:
- 50% deposit upon signing
- 25% at midpoint review (week 3)
- 25% on handover

Invoices payable Net-14. Late payments accrue interest at 1.5% per month.
Payment via bank transfer (BACS or wire). Expenses reimbursed at cost within 7 days.

4. TERMINATION
Either party may terminate with 14 days written notice for convenience, or immediately for material breach.
Kill fee: if Client terminates for convenience, Client pays for work completed plus 25% of remaining project fee.

5. INTELLECTUAL PROPERTY
Upon receipt of full payment, Contractor assigns all rights in the deliverables to Client.
Contractor retains the right to use general skills, knowledge, and pre-existing IP.

6. CONFIDENTIALITY
Both parties agree to maintain in confidence all non-public information for 3 years after termination.

7. LIMITATION OF LIABILITY
In no event shall Contractor's aggregate liability exceed the total fees paid in the preceding 12 months.
Contractor shall not be liable for consequential, indirect, or punitive damages.

8. WARRANTY DISCLAIMER
The deliverables are provided AS-IS. Contractor disclaims all warranties, express or implied, except as expressly stated.

9. INDEMNITY
Each party shall indemnify the other against third-party claims arising from its own breach or wrongful acts.

10. FORCE MAJEURE
Neither party shall be liable for delays caused by force majeure events beyond reasonable control.

11. GOVERNING LAW
This Agreement shall be governed by the laws of England and Wales.
The parties submit to the exclusive jurisdiction of the English courts.

12. SIGNATURES
Client: ____________   Contractor: ____________`,
      currency: 'USD',
    },
    expectedRules: [],
    expectMaxFindings: 2,
  },
];
