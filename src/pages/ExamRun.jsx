import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ExamResults } from '../components/exam/ExamResults.jsx';
import { LearningModeRunner } from '../components/exam/LearningModeRunner.jsx';
import { PracticeRunner } from '../components/exam/PracticeRunner.jsx';
import { SmartReviewRunner } from '../components/exam/SmartReviewRunner.jsx';
import { StandardExamRunner } from '../components/exam/StandardExamRunner.jsx';
import { getCert } from '../data/certs.js';
import { MODE_CONFIGS, adaptivePool } from '../data/examModes.js';
import { useExam } from '../context/ExamContext.jsx';

export default function ExamRun() {
  const { certId, mode } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const cert = getCert(certId);
  const { state } = useExam();
  const [results, setResults] = useState(null);

  if (!cert) {
    return (
      <div className="surface rounded-3xl p-12 text-center">
        <div className="text-2xl mb-2">🤷</div>
        <h2 className="text-xl font-bold">Certification not found</h2>
        <Link to="/exam" className="mt-4 inline-flex items-center gap-1 text-aws-orange font-semibold hover:underline">
          <ChevronLeft size={14} /> Back to Exam Center
        </Link>
      </div>
    );
  }

  const back = () => nav(`/exam/${cert.id}`);

  // After a standard / timed / final exam, show full results page
  if (results && (mode === 'standard' || mode === 'timed' || mode === 'final')) {
    return (
      <ExamResults
        cert={cert}
        attempt={results}
        questions={results.questions}
        answers={results.answers}
        flags={results.flags}
        onRetake={() => setResults(null)}
        onClose={back}
      />
    );
  }

  // ----- existing modes -----
  if (mode === 'standard') {
    return (
      <StandardExamRunner cert={cert} onComplete={(r) => setResults(r)} onExit={back} />
    );
  }
  if (mode === 'practice') {
    // EX-02: support `?domains=d1,d2` deep-link from the "Retry weak topics only" button.
    // Picks the first domain (PracticeRunner filters by one today; the URL captures the full set).
    const weakDomains = searchParams.get('domains');
    const initial = weakDomains
      ? { domainId: weakDomains.split(',')[0], autoStart: true, mode: 'weak-topic-retry' }
      : {};
    return <PracticeRunner cert={cert} onComplete={() => {}} onExit={back} initial={initial} />;
  }
  if (mode === 'learning') {
    return <LearningModeRunner cert={cert} onExit={back} />;
  }

  // ----- new Stage 13 modes — all backed by PracticeRunner with presets -----
  const configFor = (m) => MODE_CONFIGS[m]?.paramsFn?.(cert) || {};

  // Topic mode pulls service from query string (?service=ec2)
  // Section mode pulls domain from query string (?domain=saa-d1)
  const queryService = searchParams.get('service') || '';
  const queryDomain  = searchParams.get('domain')  || '';

  // Adaptive pool — only meaningful when there are prior attempts
  const certState = state?.certs?.[cert.id];
  const adaptive = useMemo(() => adaptivePool(certState, cert), [certState, cert]);

  if (mode === 'timed') {
    return (
      <PracticeRunner
        cert={cert}
        onComplete={(r) => setResults(r)}
        onExit={back}
        initial={{ ...configFor('timed'), mode: 'timed' }}
      />
    );
  }

  if (mode === 'review') {
    return (
      <PracticeRunner
        cert={cert}
        onComplete={() => {}}
        onExit={back}
        initial={{ ...configFor('review'), mode: 'review',
          // Adaptive: if user has attempts, surface wrongs first.
          poolOverride: adaptive.length ? adaptive.slice(0, 20) : null,
        }}
      />
    );
  }

  if (mode === 'section') {
    return (
      <PracticeRunner
        cert={cert}
        onComplete={() => {}}
        onExit={back}
        initial={{
          ...configFor('section'),
          mode: 'section',
          domainId: queryDomain || 'any',
          autoStart: !!queryDomain, // skip setup if domain came from URL
        }}
      />
    );
  }

  if (mode === 'topic') {
    return (
      <PracticeRunner
        cert={cert}
        onComplete={() => {}}
        onExit={back}
        initial={{
          ...configFor('topic'),
          mode: 'topic',
          service: queryService,
          autoStart: !!queryService,
        }}
      />
    );
  }

  if (mode === 'final') {
    return (
      <PracticeRunner
        cert={cert}
        onComplete={(r) => setResults(r)}
        onExit={back}
        initial={{ ...configFor('final'), mode: 'final' }}
      />
    );
  }

  // EX-18: Smart Review (spaced repetition)
  if (mode === 'smartReview' || mode === 'smart-review') {
    return <SmartReviewRunner cert={cert} onExit={back} />;
  }

  return null;
}
