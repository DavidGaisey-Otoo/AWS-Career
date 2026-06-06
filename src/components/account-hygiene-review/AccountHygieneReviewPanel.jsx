import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { runAccountHygieneReview } from '../../lib/accountHygieneAgents/master.js';
import { AgentReviewPanel } from '../review-shared/AgentReviewPanel.jsx';

export function AccountHygieneReviewPanel({ profile = {}, billingAlerts = null, services = {}, supportPlan = 'basic', freeTierActive = false, className = '' }) {
  const review = useMemo(
    () => runAccountHygieneReview({ profile, billingAlerts, services, supportPlan, freeTierActive }),
    [profile, billingAlerts, services, supportPlan, freeTierActive]
  );
  return (
    <AgentReviewPanel
      review={review}
      eyebrow="ACCT-01 · account hygiene audit"
      title="AWS account hygiene"
      icon={ShieldCheck}
      subtitle="Yusuf El-Sayed (AWS Account Hygiene Auditor, 19 yrs)"
      bannerCopy={{
        critical: 'Critical hygiene gaps — fix BEFORE you use this account for paid client work.',
        high: 'High-risk gaps. Address soon to avoid bill spikes or breaches.',
        clean: 'Account passes foundational hygiene. Review medium items for polish.',
      }}
      scopeDisclaimer={<><strong>Honest scope:</strong> Checks against AWS Foundational Security Best Practices. Doesn’t replace Security Hub or AWS Config rules — those run continuously.</>}
      className={className}
    />
  );
}
