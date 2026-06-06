import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { runProjectPlanReview } from '../../lib/projectPlanAgents/master.js';
import { AgentReviewPanel } from '../review-shared/AgentReviewPanel.jsx';

export function ProjectPlanReviewPanel({ plan = {}, services = [], level = 'intermediate', teamSize = 1, startDate = null, className = '' }) {
  const review = useMemo(
    () => runProjectPlanReview({ plan, services, level, teamSize, startDate }),
    [plan, services, level, teamSize, startDate]
  );
  return (
    <AgentReviewPanel
      review={review}
      eyebrow="PLAN-01 · realism audit"
      title="Project plan review"
      icon={Calendar}
      subtitle="Esra Demir (Project Plan Realism Auditor, 21 yrs)"
      bannerCopy={{
        critical: 'Plan has critical structural problems. Fix before pitching to client.',
        high: 'High-risk gaps that historically cause project slip.',
        clean: 'Plan is realistic. Review medium items for polish.',
      }}
      scopeDisclaimer={<><strong>Honest scope:</strong> Checks structure (phases, buffer, dependencies). Real estimation requires domain knowledge of the specific services + your past delivery speed.</>}
      className={className}
    />
  );
}
