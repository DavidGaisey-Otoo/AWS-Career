import { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { runInvoiceReview } from '../../lib/invoiceAgents/master.js';
import { AgentReviewPanel } from '../review-shared/AgentReviewPanel.jsx';

export function InvoiceReviewPanel({ invoice = {}, supplierCountry = 'GB', clientCountry = '', className = '' }) {
  const review = useMemo(
    () => runInvoiceReview({ invoice, supplierCountry, clientCountry }),
    [invoice, supplierCountry, clientCountry]
  );
  return (
    <AgentReviewPanel
      review={review}
      eyebrow="INVOICE-01 · quality + tax audit"
      title="Invoice quality review"
      icon={Receipt}
      subtitle="Imani Okafor (Invoice Quality Auditor, 16 yrs)"
      bannerCopy={{
        critical: 'DO NOT SEND — critical fields missing or math errors will get this rejected.',
        high:     'High-risk gaps will delay payment.',
        clean:    'Invoice is solid. Review medium items for polish.',
      }}
      scopeDisclaimer={<><strong>Honest scope:</strong> Rule-engine checks UK + EU VAT, math, required fields, payment terms. For complex cross-border tax situations (US sales tax, IR35, reverse charge VAT) consult an accountant.</>}
      className={className}
    />
  );
}
