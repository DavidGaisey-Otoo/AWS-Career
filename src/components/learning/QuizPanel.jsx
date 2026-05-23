import { AnimatePresence, motion } from 'framer-motion';
import {
  Check, ChevronRight, Clock, ExternalLink, RotateCcw, Trophy, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLearning } from '../../context/LearningContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { fireConfetti } from '../ui/Confetti.js';
import { cn } from '../../lib/utils.js';

/**
 * Per-topic quiz player.
 *
 * Question types supported:
 *  - 'single': MCQ, single correct (answer = index)
 *  - 'multi':  MCQ, multi-correct (answer = [indices])
 *  - 'tf':     True/false (answer = 0 or 1, options = ['True','False'])
 *
 * Features:
 *  - Optional timer (toggleable). Auto-submits when expired.
 *  - Instant per-question feedback with explanation + per-option reason.
 *  - Pass threshold 80%. Confetti on pass. Score history persisted.
 */
export function QuizPanel({ topicId, questions }) {
  const { getTopicState, recordQuizScore } = useLearning();
  const toast = useToast();
  const ts = getTopicState(topicId);
  const [phase, setPhase] = useState('setup'); // setup | playing | done
  const [timerOn, setTimerOn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { qId: idx | [idx,idx] }
  const [revealed, setRevealed] = useState({}); // { qId: true }

  const SECS_PER_Q = 60;

  // Reset when topic changes
  useEffect(() => {
    setPhase('setup'); setIndex(0); setAnswers({}); setRevealed({}); setTimeLeft(0);
  }, [topicId]);

  // Timer tick
  useEffect(() => {
    if (phase !== 'playing' || !timerOn) return;
    if (timeLeft <= 0) { setPhase('done'); return; }
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [phase, timerOn, timeLeft]);

  const start = () => {
    setIndex(0); setAnswers({}); setRevealed({});
    if (timerOn) setTimeLeft(questions.length * SECS_PER_Q);
    setPhase('playing');
  };

  const restart = () => setPhase('setup');

  if (!questions || questions.length === 0) {
    return (
      <div className="surface rounded-2xl p-8 text-center text-sm text-muted">
        No quiz available for this topic yet.
      </div>
    );
  }

  // ---------- setup ----------
  if (phase === 'setup') {
    return (
      <div className="surface rounded-2xl p-6 sm:p-8 space-y-5">
        <div>
          <h3 className="text-xl font-extrabold tracking-tight">Topic quiz</h3>
          <p className="text-sm text-muted mt-1">
            {questions.length} questions · pass at 80% · instant feedback.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-token bg-[var(--card-2)]/40 px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={timerOn}
            onChange={(e) => setTimerOn(e.target.checked)}
            className="accent-aws-orange w-4 h-4"
          />
          <Clock size={16} className="text-aws-orange" />
          <div className="flex-1">
            <div className="text-sm font-bold">Use a timer</div>
            <div className="text-[11px] text-muted">~60 seconds per question. Auto-submits when time runs out.</div>
          </div>
        </label>

        {/* History */}
        {ts.quizScores.length > 0 && (
          <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">
              Score history
            </div>
            <ul className="space-y-1">
              {ts.quizScores.slice().reverse().slice(0, 5).map((s, i) => {
                const pct = Math.round((s.score / s.total) * 100);
                return (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'chip border text-[10px] font-bold',
                      pct >= 80 ? 'bg-success/10 text-success border-success/30'
                      : pct >= 60 ? 'bg-warning/10 text-warning border-warning/30'
                      : 'bg-danger/10 text-danger border-danger/30'
                    )}>
                      {pct}%
                    </span>
                    <span className="text-muted tabular-nums">{s.score}/{s.total}</span>
                    <span className="text-muted ml-auto">{new Date(s.at).toLocaleDateString()}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button onClick={start} className="btn btn-primary w-full">
          Start quiz <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  // ---------- done ----------
  if (phase === 'done') {
    return <QuizResults
      questions={questions}
      answers={answers}
      onRestart={restart}
      topicId={topicId}
      recordQuizScore={recordQuizScore}
      toast={toast}
    />;
  }

  // ---------- playing ----------
  const q = questions[index];
  const isLast = index === questions.length - 1;
  const isRevealed = !!revealed[q.id];

  const select = (optIndex) => {
    if (isRevealed) return;
    setAnswers((a) => {
      if (q.type === 'multi') {
        const cur = Array.isArray(a[q.id]) ? a[q.id] : [];
        const next = cur.includes(optIndex) ? cur.filter((i) => i !== optIndex) : [...cur, optIndex];
        return { ...a, [q.id]: next };
      }
      return { ...a, [q.id]: optIndex };
    });
  };

  const submit = () => {
    setRevealed((r) => ({ ...r, [q.id]: true }));
  };

  const advance = () => {
    if (isLast) setPhase('done');
    else setIndex((i) => i + 1);
  };

  const hasAnswer = q.id in answers && (q.type !== 'multi' || (Array.isArray(answers[q.id]) && answers[q.id].length > 0));

  return (
    <div className="surface rounded-2xl p-5 sm:p-7 space-y-5">
      {/* progress + timer */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
          Question <span className="text-aws-orange">{index + 1}</span> / {questions.length}
        </div>
        {timerOn && (
          <span className={cn(
            'chip border text-[11px] font-bold tabular-nums',
            timeLeft < 30 ? 'bg-danger/10 text-danger border-danger/30'
                          : 'bg-[var(--card-2)] text-muted border-token'
          )}>
            <Clock size={12} /> {fmt(timeLeft)}
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-aws"
          initial={false}
          animate={{ width: `${((index + 1) / questions.length) * 100}%` }}
          transition={{ type: 'spring', stiffness: 80, damping: 22 }}
        />
      </div>

      <h3 className="text-lg sm:text-xl font-extrabold tracking-tight leading-snug">{q.q}</h3>

      {q.type === 'multi' && !isRevealed && (
        <p className="text-[11px] text-muted">Select all that apply.</p>
      )}

      <ul className="space-y-2">
        {q.options.map((opt, i) => {
          const selected = q.type === 'multi'
            ? (answers[q.id] || []).includes(i)
            : answers[q.id] === i;
          const isCorrect = q.type === 'multi' ? q.answer.includes(i) : q.answer === i;
          const showFb = isRevealed;
          return (
            <li key={i}>
              <button
                onClick={() => select(i)}
                disabled={isRevealed}
                className={cn(
                  'w-full text-left rounded-xl border-2 p-3 transition focus-ring',
                  showFb && isCorrect && 'border-success bg-success/10',
                  showFb && !isCorrect && selected && 'border-danger bg-danger/10',
                  !showFb && selected && 'border-aws-orange bg-aws-orange/10',
                  !showFb && !selected && 'border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)]',
                  showFb && !isCorrect && !selected && 'border-token bg-[var(--card-2)]/40 opacity-60'
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    'mt-0.5 w-5 h-5 rounded-md grid place-items-center text-[11px] font-extrabold flex-shrink-0',
                    showFb && isCorrect ? 'bg-success text-white' :
                    showFb && !isCorrect && selected ? 'bg-danger text-white' :
                    selected ? 'bg-aws-orange text-ink-950' : 'bg-[var(--card)] text-muted border border-token'
                  )}>
                    {showFb && isCorrect ? <Check size={12} />
                      : showFb && !isCorrect && selected ? <X size={12} />
                      : String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-semibold leading-snug">{opt}</span>
                </div>
                {/* Per-option reason for wrong selections */}
                {showFb && !isCorrect && selected && q.wrongReasons?.[i] && (
                  <div className="mt-2 ml-8 text-[12px] text-muted">{q.wrongReasons[i]}</div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {isRevealed && q.why && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-electric/30 bg-electric/5 p-4"
          >
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-electric mb-1">
              Why this is the answer
            </div>
            <p className="text-sm leading-relaxed">{q.why}</p>
            {q.docs && (
              <a href={q.docs} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-aws-orange hover:underline">
                <ExternalLink size={11} /> AWS docs
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end">
        {!isRevealed ? (
          <button
            onClick={submit}
            disabled={!hasAnswer}
            className={cn('btn btn-primary', !hasAnswer && 'opacity-40 cursor-not-allowed')}
          >
            Check answer
          </button>
        ) : (
          <button onClick={advance} className="btn btn-primary">
            {isLast ? 'See results' : 'Next question'} <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function QuizResults({ questions, answers, onRestart, topicId, recordQuizScore, toast }) {
  // Score each answer
  const { score, total, breakdown } = useMemo(() => {
    let s = 0;
    const b = questions.map((q) => {
      const userAns = answers[q.id];
      let correct = false;
      if (q.type === 'multi') {
        const want = (q.answer || []).slice().sort().join(',');
        const got = ((userAns || []).slice().sort()).join(',');
        correct = want === got && want.length > 0;
      } else {
        correct = userAns === q.answer;
      }
      if (correct) s += 1;
      return { q, correct, userAns };
    });
    return { score: s, total: questions.length, breakdown: b };
  }, [questions, answers]);

  const pct = Math.round((score / total) * 100);
  const passed = pct >= 80;

  // Persist + celebrate once
  useEffect(() => {
    recordQuizScore(topicId, score, total);
    if (passed) {
      fireConfetti({ origin: { y: 0.35 } });
      toast.success(`Passed! ${pct}%`, { description: 'Quiz mastery recorded.' });
    } else {
      toast.warning(`Scored ${pct}% — need 80% to pass`, { description: 'Review the explanations and retry.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="surface rounded-2xl p-6 sm:p-8 space-y-5">
      <div className="text-center">
        <div className="inline-grid place-items-center w-20 h-20 rounded-3xl bg-gradient-aws shadow-glow-orange text-ink-950 mb-3">
          <Trophy size={32} strokeWidth={2.5} />
        </div>
        <div className={cn(
          'text-5xl font-black tracking-tight',
          passed ? 'text-success' : 'text-danger'
        )}>
          {pct}%
        </div>
        <div className="text-sm text-muted mt-1">{score} / {total} correct · pass = 80%</div>
        <div className={cn(
          'inline-block mt-3 chip border text-xs font-bold',
          passed ? 'bg-success/10 text-success border-success/30'
                 : 'bg-warning/10 text-warning border-warning/30'
        )}>
          {passed ? 'Passed' : 'Try again'}
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-3">Breakdown</h4>
        <ul className="space-y-1.5">
          {breakdown.map(({ q, correct }, i) => (
            <li key={q.id} className="flex items-start gap-3 text-sm">
              <span className={cn(
                'w-5 h-5 grid place-items-center rounded-md flex-shrink-0 mt-0.5 text-[11px] font-extrabold',
                correct ? 'bg-success text-white' : 'bg-danger text-white'
              )}>
                {correct ? <Check size={11} /> : <X size={11} />}
              </span>
              <span className="text-[13px] leading-snug flex-1">
                <span className="text-muted font-bold mr-1">Q{i + 1}.</span>
                {q.q}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={onRestart} className="btn btn-primary w-full">
        <RotateCcw size={14} /> Retake quiz
      </button>
    </div>
  );
}

function fmt(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
