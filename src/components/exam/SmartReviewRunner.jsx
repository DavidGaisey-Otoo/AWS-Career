/**
 * SmartReviewRunner.jsx — EX-18 spaced-repetition runner.
 *
 * Flow per question:
 *   1) Show the question, options
 *   2) User picks an answer + clicks Check (reveals correctness + explanation)
 *   3) User rates confidence: 1 (no idea) / 2 (unsure) / 3 (got it)
 *   4) Rating persists; Next moves on
 *
 * Selection of questions uses spacedRepetition.pickSmartReviewQuestions().
 * Session count auto-increments at start. State stored in localStorage.
 *
 * Keeps all existing exam features intact — this is an additional runner,
 * not a replacement.
 */

import {
  CheckCircle2, ChevronLeft, ChevronRight, Brain, RotateCcw, XCircle,
  ExternalLink,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { questionsForCert } from '../../data/questionBank.js';
import {
  pickSmartReviewQuestions, recordRating, startSession, resetSmartReview,
  ratingDistribution, certMastery,
} from '../../lib/spacedRepetition.js';
import { cn } from '../../lib/utils.js';
import { QuestionRenderer } from './QuestionRenderer.jsx';
import { isCorrect } from './StandardExamRunner.jsx';

const DEFAULT_COUNT = 20;
const COUNT_OPTIONS = [10, 20, 30, 50];

export function SmartReviewRunner({ cert, onExit }) {
  const [phase, setPhase] = useState('setup'); // setup | playing | done
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});
  const [ratings, setRatings] = useState({}); // qId → 1|2|3 (local for this session)
  const [resetConfirm, setResetConfirm] = useState(false);
  const startedAt = useRef(null);

  // Full cert pool (memoised)
  const pool = useMemo(() => questionsForCert(cert.id), [cert.id]);

  // Distribution + mastery for the setup screen
  const dist = useMemo(() => ratingDistribution(cert.id, pool), [cert.id, pool, phase]);
  const mastery = useMemo(() => certMastery(cert.id, pool), [cert.id, pool, phase]);

  // Auto-scroll up on question change
  useEffect(() => {
    if (phase === 'playing') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [index, phase]);

  // Keyboard shortcuts during play
  useEffect(() => {
    if (phase !== 'playing') return;
    function onKey(e) {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const q = questions[index];
      if (!q) return;
      // After reveal: 1/2/3 for confidence then auto-advance
      if (revealed[q.id]) {
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          e.preventDefault();
          handleRating(q, parseInt(e.key, 10));
        }
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        setIndex(index - 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, questions, revealed]);

  function startSmartReview() {
    const picked = pickSmartReviewQuestions(cert.id, pool, count);
    if (!picked || picked.length === 0) {
      onExit?.('No questions available in the bank for this cert yet.');
      return;
    }
    startSession(cert.id);
    setQuestions(picked);
    setIndex(0);
    setAnswers({});
    setRevealed({});
    setRatings({});
    startedAt.current = Date.now();
    setPhase('playing');
  }

  function handleRating(q, rating) {
    recordRating(cert.id, q.id, rating);
    setRatings((r) => ({ ...r, [q.id]: rating }));
    // Auto-advance to next question, or finish session
    if (index < questions.length - 1) {
      setTimeout(() => setIndex(index + 1), 250);
    } else {
      setTimeout(() => setPhase('done'), 350);
    }
  }

  function checkAnswer(q) {
    if (answers[q.id] == null) return;
    setRevealed((r) => ({ ...r, [q.id]: true }));
  }

  function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    resetSmartReview(cert.id);
    setResetConfirm(false);
    // Force re-render of setup distribution
    setPhase('setup');
    setRatings({});
  }

  // ════════════════════════════════════════════════════════════════════
  // SETUP PHASE — show stats + Start / Reset
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'setup') {
    return (
      <div className="surface rounded-3xl p-6 sm:p-8 gradient-border max-w-2xl mx-auto space-y-5">
        <header>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
            {cert.code} · Smart Review
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1 flex items-center gap-2">
            <Brain size={22} className="text-aws-orange" /> Spaced Repetition
          </h2>
          <p className="text-sm text-muted mt-2">
            Questions you rate <strong>"no idea"</strong> come back every session.
            <strong> "Unsure"</strong> every 2 sessions. <strong>"Got it"</strong> every 5.
            Mastered topics fade as you build confidence.
          </p>
        </header>

        {/* Mastery summary */}
        <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
                Overall mastery
              </div>
              <div className="text-2xl font-extrabold tabular-nums">
                {mastery.masteryPct == null ? '—' : `${mastery.masteryPct}%`}
              </div>
              <div className="text-[11px] opacity-70">
                {mastery.rated} of {mastery.total} questions rated
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="w-full h-3 rounded-full bg-[var(--card)] overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${mastery.masteryPct || 0}%`,
                    backgroundColor:
                      mastery.masteryPct == null ? 'transparent'
                      : mastery.masteryPct >= 80 ? 'var(--success, #16a34a)'
                      : mastery.masteryPct >= 50 ? 'var(--warning, #FF9900)'
                      : 'var(--danger, #ef4444)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Rating distribution */}
          <div className="grid grid-cols-4 gap-2 pt-2 text-center">
            <Stat color="text-danger"  label="No idea (1)"  value={dist.r1} />
            <Stat color="text-warning" label="Unsure (2)"   value={dist.r2} />
            <Stat color="text-success" label="Got it (3)"   value={dist.r3} />
            <Stat color="opacity-70"   label="Not rated"    value={dist.unrated} />
          </div>
        </div>

        {/* Session count picker */}
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-70 mb-1.5">
            Questions in this session
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COUNT_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCount(c)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition border',
                  count === c
                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                    : 'border-token text-muted hover:text-current'
                )}
              >{c}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button onClick={startSmartReview} className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2">
            <Brain size={14} /> Start Smart Review
          </button>
          <button
            onClick={handleReset}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition',
              resetConfirm
                ? 'border-danger bg-danger/15 text-danger'
                : 'border-token text-muted hover:text-danger hover:border-danger/40'
            )}
            title="Wipe all confidence ratings + session count for this cert"
          >
            <RotateCcw size={12} />
            {resetConfirm ? 'Click again to confirm' : 'Reset Smart Review'}
          </button>
          <button onClick={onExit} className="btn btn-ghost">Cancel</button>
        </div>

        <div className="text-[11px] opacity-60 italic">
          💡 Keyboard shortcuts during play: <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> to rate.
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // DONE PHASE — summary of this session
  // ════════════════════════════════════════════════════════════════════
  if (phase === 'done') {
    const sessionStats = Object.values(ratings);
    const r1 = sessionStats.filter((r) => r === 1).length;
    const r2 = sessionStats.filter((r) => r === 2).length;
    const r3 = sessionStats.filter((r) => r === 3).length;
    return (
      <div className="surface rounded-3xl p-7 max-w-2xl mx-auto space-y-5 gradient-border">
        <header className="text-center">
          <div className="text-5xl mb-2">🎯</div>
          <h2 className="text-2xl font-extrabold">Session complete</h2>
          <p className="opacity-80 text-sm mt-1">
            You rated {sessionStats.length} questions. Next session will re-surface the weak ones.
          </p>
        </header>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat color="text-danger"  label="No idea (1)" value={r1} />
          <Stat color="text-warning" label="Unsure (2)"  value={r2} />
          <Stat color="text-success" label="Got it (3)"  value={r3} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPhase('setup')} className="btn btn-primary flex-1">
            Start another session
          </button>
          <button onClick={onExit} className="btn btn-ghost">Done</button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // PLAYING PHASE
  // ════════════════════════════════════════════════════════════════════
  const q = questions[index];
  if (!q) return null;
  const wasRevealed = !!revealed[q.id];
  const userAnswer = answers[q.id];
  const correct = wasRevealed && isCorrect(q, userAnswer);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header — progress + cert */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Brain size={14} className="text-aws-orange" />
          <span className="font-bold opacity-80">{cert.code} · Smart Review</span>
          <span className="opacity-50">|</span>
          <span className="font-bold">Question {index + 1} / {questions.length}</span>
        </div>
        <button onClick={onExit} className="text-xs opacity-60 hover:opacity-100">End session</button>
      </div>

      {/* Question */}
      <div className="surface rounded-3xl p-6 sm:p-7 gradient-border">
        <QuestionRenderer
          question={q}
          answer={userAnswer}
          revealed={wasRevealed}
          onAnswer={(v) => setAnswers({ ...answers, [q.id]: v })}
        />

        {/* Action row: Check / Prev / Next */}
        {!wasRevealed && (
          <div className="mt-4 pt-4 border-t border-token flex items-center justify-between gap-2">
            <button
              onClick={() => index > 0 && setIndex(index - 1)}
              disabled={index === 0}
              className="btn btn-ghost text-xs"
            >
              <ChevronLeft size={12} /> Previous
            </button>
            <button
              onClick={() => checkAnswer(q)}
              disabled={userAnswer == null}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              ✓ Check answer
            </button>
          </div>
        )}

        {/* Confidence rating panel (after reveal) */}
        {wasRevealed && (
          <div className="mt-5 pt-5 border-t-2 border-aws-orange/30">
            <div className={cn(
              'rounded-xl px-3 py-2 mb-3 inline-flex items-center gap-2 text-xs font-bold',
              correct ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
            )}>
              {correct ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {correct ? 'Correct' : 'Incorrect — review the explanation above'}
            </div>
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
              How confident did you feel?
            </div>
            <div className="grid grid-cols-3 gap-2">
              <RatingButton color="danger"  label="No idea"  num={1} q={q} onRate={handleRating} />
              <RatingButton color="warning" label="Unsure"   num={2} q={q} onRate={handleRating} />
              <RatingButton color="success" label="Got it"   num={3} q={q} onRate={handleRating} />
            </div>
            <div className="text-[10.5px] opacity-60 italic mt-2 text-center">
              Rating drives when this question returns. Keyboard: <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Components
// ════════════════════════════════════════════════════════════════════
function Stat({ color, label, value }) {
  return (
    <div className="rounded-lg border border-token bg-[var(--card-2)]/40 px-2 py-2">
      <div className={cn('text-xl font-extrabold tabular-nums', color)}>{value}</div>
      <div className="text-[9.5px] opacity-70 font-bold uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

function RatingButton({ color, label, num, q, onRate }) {
  const colorClasses = {
    danger:  'border-danger/40  bg-danger/10  hover:bg-danger/20  text-danger',
    warning: 'border-warning/40 bg-warning/10 hover:bg-warning/20 text-warning',
    success: 'border-success/40 bg-success/10 hover:bg-success/20 text-success',
  };
  return (
    <button
      onClick={() => onRate(q, num)}
      className={cn(
        'rounded-xl border-2 px-3 py-3 transition font-bold text-sm flex flex-col items-center gap-1',
        colorClasses[color]
      )}
    >
      <span className="text-2xl">{num === 1 ? '😵' : num === 2 ? '🤔' : '✅'}</span>
      <span>{label}</span>
      <span className="text-[10px] opacity-70">Rating {num}</span>
    </button>
  );
}
