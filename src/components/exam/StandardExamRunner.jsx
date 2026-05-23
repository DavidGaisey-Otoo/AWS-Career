import { motion } from 'framer-motion';
import {
  AlertOctagon, ChevronLeft, ChevronRight, Flag, ListChecks, LogOut, Send,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useExam } from '../../context/ExamContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { passPercent } from '../../data/certs.js';
import { pickExamQuestions, questionsForCert } from '../../data/questionBank.js';
import { cn } from '../../lib/utils.js';
import { ExamTimer } from './ExamTimer.jsx';
import { QuestionPalette } from './QuestionPalette.jsx';
import { QuestionRenderer } from './QuestionRenderer.jsx';

/**
 * The real-exam runner — full question count, full timer, flag/skip/review.
 *
 * Workflow:
 *   intro → playing → reviewing (optional) → results (handled by parent via onComplete)
 */
export function StandardExamRunner({ cert, onComplete, onExit }) {
  const { recordAttempt } = useExam();
  const toast = useToast();
  const [phase, setPhase] = useState('intro'); // intro | playing | reviewing | confirm-submit
  const [seed] = useState(() => Date.now());
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});       // qId → selection
  const [flags, setFlags] = useState({});           // qId → bool
  const [perQTime, setPerQTime] = useState({});     // qId → seconds spent
  const [index, setIndex] = useState(0);
  const startedAtRef = useRef(null);
  const lastTickRef = useRef(null);

  // ---------- start ----------
  const start = () => {
    const qs = pickExamQuestions({ cert, count: cert.questions, seed });
    setQuestions(qs);
    setAnswers({});
    setFlags({});
    setPerQTime({});
    setIndex(0);
    startedAtRef.current = Date.now();
    lastTickRef.current = Date.now();
    setPhase('playing');
  };

  // ---------- per-question time tracking ----------
  useEffect(() => {
    if (phase !== 'playing') return;
    lastTickRef.current = Date.now();
  }, [phase]);

  const accumulateTime = (qId) => {
    if (!qId || !lastTickRef.current) return;
    const now = Date.now();
    const delta = Math.max(0, Math.floor((now - lastTickRef.current) / 1000));
    setPerQTime((p) => ({ ...p, [qId]: (p[qId] || 0) + delta }));
    lastTickRef.current = now;
  };

  // ---------- nav ----------
  const goTo = (newIdx) => {
    const cur = questions[index];
    accumulateTime(cur?.id);
    setIndex(newIdx);
  };

  const next = () => index < questions.length - 1 && goTo(index + 1);
  const prev = () => index > 0 && goTo(index - 1);

  const toggleFlag = () => {
    const q = questions[index];
    if (!q) return;
    setFlags((f) => ({ ...f, [q.id]: !f[q.id] }));
  };

  // ---------- answer change ----------
  const onAnswer = (selection) => {
    const q = questions[index];
    if (!q) return;
    setAnswers((a) => ({ ...a, [q.id]: selection }));
  };

  // ---------- scoring ----------
  const grade = () => {
    // Finalise time for current question
    accumulateTime(questions[index]?.id);
    const startedAt = startedAtRef.current || Date.now();
    const durationSec = Math.floor((Date.now() - startedAt) / 1000);

    let correct = 0;
    const byDomain = {};
    const questionResults = questions.map((q) => {
      const user = answers[q.id];
      const ok = isCorrect(q, user);
      if (ok) correct += 1;
      for (const dId of q.domainIds) {
        if (!byDomain[dId]) byDomain[dId] = { correct: 0, total: 0 };
        byDomain[dId].total += 1;
        if (ok) byDomain[dId].correct += 1;
      }
      return {
        qId: q.id, your: user ?? null, correct: q.answer,
        isCorrect: ok, timeSec: perQTime[q.id] || 0,
      };
    });
    const scaledScore = Math.round((correct / questions.length) * 1000);
    const passed = scaledScore >= cert.passScore;
    const attempt = {
      mode: 'standard',
      total: questions.length,
      correct,
      scaledScore,
      passed,
      durationSec,
      byDomain,
      questionResults,
    };
    recordAttempt(cert.id, attempt);
    if (passed) toast.success('You passed!');
    else toast.warning(`Scored ${scaledScore}/1000 — need ${cert.passScore}`);

    onComplete?.({ ...attempt, questions, answers, flags });
  };

  const onTimerExpire = () => {
    toast.error('Time up — submitting.');
    grade();
  };

  // ---------- derived ----------
  const totalSeconds = useMemo(() => cert.minutes * 60, [cert.minutes]);
  const answeredCount = useMemo(() =>
    questions.filter((q) => isAnswered(answers[q.id])).length,
    [questions, answers]);
  const flaggedCount = useMemo(() =>
    questions.filter((q) => flags[q.id]).length,
    [questions, flags]);

  const isAnsweredAt = (i) => isAnswered(answers[questions[i]?.id]);
  const isFlaggedAt = (i) => !!flags[questions[i]?.id];

  // ---------- render ----------
  if (phase === 'intro') {
    const available = questionsForCert(cert.id).length;
    const willGet = Math.min(cert.questions, available);
    const short = available < cert.questions;
    return (
      <div className="surface rounded-3xl p-6 sm:p-8 gradient-border max-w-3xl mx-auto">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
          {cert.code} · Standard exam mode
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{cert.name}</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          You're about to start a realistic mock exam. Questions are randomly drawn from
          the pool, weighted by domain. The timer will track to the second, and the exam
          auto-submits when time runs out.
        </p>

        {short && (
          <div className="mt-4 rounded-2xl border border-warning/40 bg-warning/10 p-3 flex items-start gap-2.5">
            <AlertOctagon size={16} className="text-warning shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-extrabold text-warning">
                Honest heads-up: only {available} questions in the bank right now (real exam is {cert.questions}).
              </div>
              <div className="text-muted mt-1">
                This mock will run with <strong className="text-current">{available} questions</strong>, scaled to the same per-domain weighting + pass score.
                The bank is being expanded — check back as more get added, or use <strong className="text-current">Review mode</strong> to drill the same questions deeper.
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Questions" value={willGet} sub={short ? `of ${cert.questions} target` : null} />
          <Stat label="Time limit" value={`${cert.minutes} min`} />
          <Stat label="Pass score" value={`${cert.passScore} / 1000`} />
        </div>

        <ul className="mt-5 space-y-1.5 text-xs text-muted">
          <li>• Timer turns yellow at 20 min remaining, red at 10 min.</li>
          <li>• Flag any question to revisit before submitting.</li>
          <li>• You can jump between questions via the navigator.</li>
          <li>• You'll see a review screen before final submission.</li>
        </ul>

        <div className="mt-6 flex gap-2">
          <button onClick={start} className="btn btn-primary flex-1">
            Start exam <ChevronRight size={14} />
          </button>
          <button onClick={onExit} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    );
  }

  if (phase === 'reviewing') {
    return (
      <ReviewScreen
        questions={questions}
        answers={answers}
        flags={flags}
        onJump={(i) => { setIndex(i); setPhase('playing'); }}
        onSubmit={() => setPhase('confirm-submit')}
        onCancel={() => setPhase('playing')}
      />
    );
  }

  if (phase === 'confirm-submit') {
    const unanswered = questions.length - answeredCount;
    return (
      <div className="surface rounded-3xl p-6 sm:p-8 gradient-border max-w-md mx-auto text-center">
        <AlertOctagon size={36} className="text-warning mx-auto mb-2" />
        <h3 className="text-xl font-extrabold tracking-tight">Submit final answers?</h3>
        <p className="text-sm text-muted mt-2">
          {unanswered > 0
            ? `${unanswered} question${unanswered === 1 ? '' : 's'} unanswered.`
            : 'All questions answered.'}
          {' '}You cannot change answers after submitting.
        </p>
        <div className="mt-5 flex gap-2 justify-center">
          <button onClick={() => setPhase('playing')} className="btn btn-ghost">Back to exam</button>
          <button onClick={grade} className="btn btn-primary">
            <Send size={14} /> Submit
          </button>
        </div>
      </div>
    );
  }

  // ----- playing -----
  const q = questions[index];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        {/* sticky exam header */}
        <div className="surface rounded-2xl p-3 sm:p-4 sticky top-20 z-20 flex flex-wrap items-center gap-3">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
            {cert.code} · <span className="text-aws-orange">Mock exam</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-bold text-muted">
              <ListChecks size={12} className="inline -mt-0.5 mr-1 text-success" />
              {answeredCount}/{questions.length}
            </span>
            <span className="text-[11px] font-bold text-muted">
              <Flag size={12} className="inline -mt-0.5 mr-1 text-aws-orange" />
              {flaggedCount}
            </span>
            <ExamTimer
              startedAt={startedAtRef.current}
              totalSeconds={totalSeconds}
              onExpire={onTimerExpire}
            />
            <button
              onClick={onExit}
              className="btn btn-ghost !px-2 !py-1.5 !text-xs"
              title="End exam"
            ><LogOut size={12} /></button>
          </div>
        </div>

        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="surface rounded-2xl p-5 sm:p-7"
        >
          <QuestionRenderer
            q={q}
            answer={answers[q.id]}
            onAnswer={onAnswer}
            flagged={!!flags[q.id]}
            onToggleFlag={toggleFlag}
            index={index}
            total={questions.length}
          />
        </motion.div>

        <div className="flex items-center justify-between gap-2">
          <button onClick={prev} disabled={index === 0}
                  className={cn('btn btn-ghost', index === 0 && 'opacity-40 cursor-not-allowed')}>
            <ChevronLeft size={14} /> Previous
          </button>
          <button onClick={() => setPhase('reviewing')} className="btn btn-ghost">
            Review all
          </button>
          {index < questions.length - 1 ? (
            <button onClick={next} className="btn btn-primary">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={() => setPhase('reviewing')} className="btn btn-primary">
              Finish <Send size={14} />
            </button>
          )}
        </div>
      </div>

      <aside className="space-y-3">
        <QuestionPalette
          total={questions.length}
          currentIndex={index}
          isAnswered={isAnsweredAt}
          isFlagged={isFlaggedAt}
          onJump={goTo}
        />
      </aside>
    </div>
  );
}

// ---------------- review screen ----------------

function ReviewScreen({ questions, answers, flags, onJump, onSubmit, onCancel }) {
  const answered = questions.filter((q) => isAnswered(answers[q.id])).length;
  const flagged = questions.filter((q) => flags[q.id]).length;

  return (
    <div className="surface rounded-3xl p-6 sm:p-8 gradient-border max-w-3xl mx-auto">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Review</div>
      <h3 className="text-2xl font-extrabold tracking-tight">Before you submit…</h3>
      <p className="text-sm text-muted mt-1">
        {answered} / {questions.length} answered · {flagged} flagged.
      </p>

      <div className="mt-5 grid grid-cols-5 sm:grid-cols-8 gap-1.5">
        {questions.map((q, i) => {
          const ok = isAnswered(answers[q.id]);
          const flag = !!flags[q.id];
          return (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={cn(
                'relative aspect-square rounded-md text-[11px] font-extrabold tabular-nums transition border-2',
                ok ? 'bg-aws-orange/15 text-aws-orange border-transparent'
                   : 'bg-[var(--card-2)] text-muted border-token',
              )}
            >
              {i + 1}
              {flag && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-aws-orange" />}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex gap-2">
        <button onClick={onCancel} className="btn btn-ghost flex-1">Back to exam</button>
        <button onClick={onSubmit} className="btn btn-primary flex-1">
          <Send size={14} /> Submit final
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-3 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className="text-lg font-extrabold tracking-tight mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[9px] text-warning font-bold mt-0.5">{sub}</div>}
    </div>
  );
}

// ---------------- shared answer helpers ----------------

function isAnswered(a) {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  return true;
}

export function isCorrect(q, user) {
  if (user === undefined || user === null) return false;
  if (q.type === 'multi') {
    if (!Array.isArray(user) || !Array.isArray(q.answer)) return false;
    const a = [...user].sort().join(',');
    const b = [...q.answer].sort().join(',');
    return a === b;
  }
  return user === q.answer;
}
