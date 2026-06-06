import { useMemo } from 'react';
import { Scale } from 'lucide-react';
import { runContractReview } from '../../lib/contractAgents/master.js';
import { AgentReviewPanel } from '../review-shared/AgentReviewPanel.jsx';

export function ContractReviewPanel({ contractText = '', clientName = '', currency = 'USD', jurisdiction = '', className = '' }) {
  const review = useMemo(
    () => runContractReview({ contractText, clientName, currency, jurisdiction }),
    [contractText, clientName, currency, jurisdiction]
  );
  return (
    <AgentReviewPanel
      review={review}
      eyebrow="CONTRACT-01 · 2-agent legal review"
      title="Contract protection review"
      icon={Scale}
      subtitle="Aurelia Stone (Legal Protection) · Tomás Garcia (Payment Terms)"
      bannerCopy={{
        critical: 'DO NOT SIGN — missing protections expose you to unlimited liability.',
        high:     'Important protections missing. Negotiate before signing.',
        clean:    'Contract has the core protections. Review medium items for polish.',
      }}
      scopeDisclaimer={<><strong>Honest scope:</strong> NOT a substitute for a real solicitor. This is a "did you forget the basics" check. For high-value contracts (£50k+) always get a real lawyer to read it.</>}
      className={className}
    />
  );
}
