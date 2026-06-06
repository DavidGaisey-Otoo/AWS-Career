import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { runInterviewReview } from '../../lib/interviewAgents/master.js';
import { AgentReviewPanel } from '../review-shared/AgentReviewPanel.jsx';

export function InterviewReviewPanel({ question = '', answer = '', questionType = 'behavioural', className = '' }) {
  const review = useMemo(
    () => runInterviewReview({ question, answer, questionType }),
    [question, answer, questionType]
  );
  return (
    <AgentReviewPanel
      review={review}
      eyebrow="INT-01 · STAR coach"
      title="Interview answer review"
      icon={MessageSquare}
      subtitle="Naoko Tanaka (Interview Answer Coach, 17 yrs)"
      bannerCopy={{
        critical: 'Answer needs major restructuring before interview day.',
        high: 'Important STAR elements missing. Fix and re-record.',
        clean: 'Answer is solid. Minor polish opportunities below.',
      }}
      scopeDisclaimer={<><strong>Honest scope:</strong> Rule-engine review of structure + specificity. For voice/tone polish (pace, energy), record yourself and review back.</>}
      className={className}
    />
  );
}
