import {
  CheckCircle2, ChevronLeft, ChevronRight, Eye, ExternalLink, Sparkles, Target, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useExam } from '../../context/ExamContext.jsx';
import { pickExamQuestions } from '../../data/questionBank.js';
import { cn } from '../../lib/utils.js';
import { QuestionRenderer } from './QuestionRenderer.jsx';

const MARK_META = {
  got:   { label: 'Got it',          chip: 'bg-success/15 text-success border-success/30', icon: Sparkles },
  still: { label: 'Still learning',  chip: 'bg-warning/15 text-warning border-warning/30', icon: Target },
  hard:  { label: 'Hard',            chip: 'bg-danger/15 text-danger border-danger/30',   icon: Zap },
};

/**
 * Learning Mode — no timer, no pressure.
 *  - See question, think, click "Reveal" to see correct answer + explanation.
 *  - Mark each card: Got it / Still learning / Hard → personalized review queue.
 *  - Queue is sorted so Hard items resurface earlier (weight 4 vs 2 vs 1).
 */
export function LearningModeRunner({ cert, onExit }) {
  const { markQuestion, getCertState } = useExam();
  const cs = getCertState(cert.id);

  // Initial deck: prioritize hard/still cards from previous sessions; pad with fresh.
  const initialDeck = useMemo(() => {
    const allForCert = pickExamQuestions({ cert, count: 50, seed: 1 });
    const weight = (q) => {
      const mark = cs.questionsSeen?.[q.id]?.mark;
      if (mark === 'hard') return 4;
      if (mark === 'still') return 2;
      if (mark === 'got') return 0; // sink mastered to end
      return 1;
    };
    return allForCert.sort((a, b) => weight(b) - weight(a));
  }, [cert.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState({});
  const [marks, setMarks] = useState({}); // session-local view, persisted via context

  if (initialDeck.length === 0) {
    return (
      <div className="surface rounded-3xl p-8 text-center text-sm text-muted">
        No questions available for this cert yet.
      </div>
    );
  }

  const q = initialDeck[index];
  const isRevealed = !!revealed[q.id];

  const reveal = () => setRevealed((r) => ({ ...r, [q.id]: true }));

  const mark = (status) => {
    markQuestion(cert.id, q.id, status);
    setMarks((m) => ({ ...m, [q.id]: status }));
    // auto-advance
    setTimeout(() => setIndex((i) => (i + 1) % initialDeck.length), 220);
  };

  const gotCount = Object.values(marks).filter((v) => v === 'got').length;
  const stillCount = Object.values(marks).filter((v) => v === 'still').length;
  const hardCount = Object.values(marks).filter((v) => v === 'hard').length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* header */}
      <div className="surface rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
          {cert.code} · Learning mode
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px]">
          <span className="chip bg-success/10 text-success border border-success/30 font-bold">
            <Sparkles size={10} /> {gotCount} got
          </span>
          <span className="chip bg-warning/10 text-warning border border-warning/30 font-bold">
            <Target size={10} /> {stillCount} learning
          </span>
          <span className="chip bg-danger/10 text-danger border border-danger/30 font-bold">
            <Zap size={10} /> {hardCount} hard
          </span>
          <button onClick={onExit} className="btn btn-ghost !text-xs !px-2 !py-1.5 ml-1">Exit</button>
        </div>
      </div>

      <div className="surface rounded-2xl p-5 sm:p-7">
        <QuestionRenderer
          q={q}
          answer={null}
          onAnswer={() => {}}
          revealed={isRevealed}
          readOnly
          index={index}
          total={initialDeck.length}
          hideFlag
        />
        {!isRevealed ? (
          <div className="mt-5 flex justify-center">
            <button onClick={reveal} className="btn btn-primary">
              <Eye size={14} /> Reveal answer
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="flex flex-wrap gap-2 justify-center">
              <button onClick={() => mark('got')} className={cn('btn !text-xs', MARK_META.got.chip, 'border')}>
                <Sparkles size={12} /> Got it
              </button>
              <button onClick={() => mark('still')} className={cn('btn !text-xs', MARK_META.still.chip, 'border')}>
                <Target size={12} /> Still learning
              </button>
              <button onClick={() => mark('hard')} className={cn('btn !text-xs', MARK_META.hard.chip, 'border')}>
                <Zap size={12} /> Hard
              </button>
            </div>
            {(q.docs || q.learningTopic) && (
              <div className="flex flex-wrap gap-2 justify-center text-xs">
                {q.docs && (
                  <a href={q.docs} target="_blank" rel="noreferrer"
                     className="chip border border-token bg-[var(--card-2)] font-bold hover:bg-[var(--card)]">
                    <ExternalLink size={11} /> Docs
                  </a>
                )}
                {q.learningTopic && (
                  <Link
                    to={`/learning/${q.learningTopic.categoryId}/${q.learningTopic.topicId}`}
                    className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange font-bold"
                  >
                    Open in Learning Lab
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setIndex((i) => (i - 1 + initialDeck.length) % initialDeck.length)}
          className="btn btn-ghost"
        ><ChevronLeft size={14} /> Prev</button>
        <div className="text-[11px] text-muted">Card {index + 1} / {initialDeck.length}</div>
        <button
          onClick={() => setIndex((i) => (i + 1) % initialDeck.length)}
          className="btn btn-ghost"
        >Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}
