import { useMemo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { runDeployReview } from '../../lib/deployAgents/master.js';
import { AgentReviewPanel } from '../review-shared/AgentReviewPanel.jsx';

export function DeployReviewPanel({ template = '', format, services = [], region, className = '' }) {
  const review = useMemo(
    () => runDeployReview({ template, format, services, region }),
    [template, format, services, region]
  );
  return (
    <AgentReviewPanel
      review={review}
      eyebrow="DEPLOY-01 · 2-agent pre-flight"
      title="Deploy safety review"
      icon={ShieldAlert}
      subtitle="Anya Volkov (Pre-Flight) · Marcus Chen (Cost Blast-Radius)"
      bannerCopy={{
        critical: 'DO NOT DEPLOY — critical safety issues will damage your AWS account.',
        high:     'High-risk patterns detected. Review before deploying to production.',
        clean:    'Template passes pre-flight checks. Review medium items for polish.',
      }}
      scopeDisclaimer={<><strong>Honest scope:</strong> Pre-flight regex scan, not a full HCL/YAML parser. Catches ~80% of common dangerous patterns. Always pair with `terraform plan` / CFN ChangeSet for the final word.</>}
      className={className}
    />
  );
}
