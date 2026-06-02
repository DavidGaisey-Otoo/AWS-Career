import {
  CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Send, XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useExam } from '../../context/ExamContext.jsx';
import { pickExamQuestions } from '../../data/questionBank.js';
import { cn } from '../../lib/utils.js';
import { ExamTimer } from './ExamTimer.jsx';
import { QuestionRenderer } from './QuestionRenderer.jsx';
import { isCorrect } from './StandardExamRunner.jsx';

const COUNTS = [10, 20, 30, 50, 'all'];

/**
 * Category Practice — pick a domain (or "any"), choose count + timer toggle.
 * After each question: instant feedback, full explanation, docs + learning link.
 * After session: per-domain summary + strongest/weakest topics.
 *
 * Stage 13: accepts an optional `initial` prop to pre-fill the setup
 * for the new modes (timed, review, section, topic, final). If
 * `initial.autoStart === true`, the setup phase is skipped.
 *
 *   initial = {
 *     domainId?:   string,    // preset domain (Section mode)
 *     service?:    string,    // preset service tag (Topic mode)
 *     count?:      number|'all',
 *     timed?:      boolean,
 *     difficulty?: 'easy'|'medium'|'hard'|'expert'|'any',
 *     autoStart?:  boolean,   // skip setup
 *     mode?:       string,    // label only — recorded with the attempt
 *     poolOverride?: array,   // pre-selected question list (adaptive)
 *   }
 */
export function PracticeRunner({ cert, onComplete, onExit, initial = {} }) {
  const { recordAttempt } = useExam();
  const [phase, setPhase] = useState(initial.autoStart ? 'starting' : 'setup'); // setup | starting | playing | done
  const [domainId, setDomainId] = useState(initial.domainId || 'any');
  const [service, setService] = useState(initial.service || '');
  const [count, setCount] = useState(initial.count != null ? initial.count : 10);
  const [timed, setTimed] = useState(!!initial.timed);
  const [difficulty, setDifficulty] = useState(initial.difficulty || 'any');
  const [seed] = useState(() => Date.now());
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState({});  // qId → bool
  const [answers, setAnswers] = useState({});
  const startedAtRef = useRef(null);

  const start = () => {
    let qs;
    if (initial.poolOverride && initial.poolOverride.length) {
      // Adaptive pool — take in order, capped by count
      const targetCount = count === 'all' ? initial.poolOverride.length : Math.min(count, initial.poolOverride.length);
      qs = initial.poolOverride.slice(0, targetCount);
    } else {
      const filters = {};
      if (domainId !== 'any') filters.domainId = domainId;
      if (difficulty !== 'any') filters.difficulty = difficulty;
      if (service) filters.service = service;
      const targetCount = count === 'all' ? 999 : count;
      qs = pickExamQuestions({ cert, count: targetCount, seed, filters });
    }
    if (!qs || qs.length === 0) {
      onExit?.('No questions match those filters yet.');
      return;
    }
    setQuestions(qs);
    setIndex(0);
    setAnswers({});
    setRevealed({});
    startedAtRef.current = Date.now();
    setPhase('playing');
  };

  // ════════════════════════════════════════════════════════════════════
  // BF-04: ALL hooks MUST be called before any early return.
  // React's rule of hooks requires identical hook order every render.
  // Previously the `if (phase === 'starting') return null;` sat BETWEEN
  // hooks, which caused "Rendered more hooks than previous render".
  // ════════════════════════════════════════════════════════════════════

  // Auto-start when initial.autoStart is set
  useEffect(() => {
    if (phase === 'starting') {
      // Inline start logic — defined further down — but we re-derive minimal
      // setup here to avoid a forward-reference; start() also runs unchanged.
      // The function reference itself is stable across renders so we can call it.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // EX-04: auto-scroll back to top whenever the question index changes so
  // the user never has to scroll back up to see the new question.
  useEffect(() => {
    if (phase === 'playing') {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [index, phase]);

  // EX-04: keyboard shortcuts — ← Prev, → / Enter Next/Check
  useEffect(() => {
    if (phase !== 'playing') return;
    function onKey(e) {
      // Ignore when user is typing in an input/textarea
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        setIndex(index - 1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const q = questions[index];
        if (q && revealed[q.id]) {
          if (index < questions.length - 1) setIndex(index + 1);
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = questions[index];
        if (!q) return;
        if (!revealed[q.id]) {
          if (isAnswered(answers[q.id])) setRevealed((r) => ({ ...r, [q.id]: true }));
        } else if (index < questions.length - 1) {
          setIndex(index + 1);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, index, revealed, answers, questions]);

  // Now that all hooks have been declared, the early return is safe.
  if (phase === 'starting') {
    // Defer start() to the next tick so we don't call setState during render.
    setTimeout(() => start(), 0);
    return null;
  }

  const submitOne = () => {
    const q = questions[index];
    if (!q) return;
    setRevealed((r) => ({ ...r, [q.id]: true }));
  };

  const next = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    } else {
      finalize();
    }
  };

  // EX-04: Prev button — go back to review/edit prior answer
  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };

  const finalize = () => {
    const startedAt = startedAtRef.current || Date.now();
    const durationSec = Math.floor((Date.now() - startedAt) / 1000);
    let correct = 0;
    const byDomain = {};
    const questionResults = questions.map((q) => {
      const ok = isCorrect(q, answers[q.id]);
      if (ok) correct += 1;
      for (const dId of q.domainIds) {
        if (!byDomain[dId]) byDomain[dId] = { correct: 0, total: 0 };
        byDomain[dId].total += 1;
        if (ok) byDomain[dId].correct += 1;
      }
      return { qId: q.id, your: answers[q.id] ?? null, correct: q.answer, isCorrect: ok, timeSec: 0 };
    });
    const scaledScore = Math.round((correct / questions.length) * 1000);
    const attempt = {
      mode: initial.mode || 'practice',
      total: questions.length,
      correct,
      scaledScore,
      passed: scaledScore >= cert.passScore,
      durationSec,
      byDomain,
      questionResults,
      filters: { domainId, difficulty, service },
    };
    recordAttempt(cert.id, attempt);
    setPhase('done');
    onComplete?.({ ...attempt, questions, answers });
  };

  // ---------- setup ----------
  if (phase === 'setup') {
    return (
      <div className="surface rounded-3xl p-6 sm:p-8 gradient-border max-w-2xl mx-auto space-y-5">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
            {cert.code} · Category practice
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mt-1">Build the skill, one domain at a time.</h2>
          <p className="text-sm text-muted mt-2">
            Instant feedback after each question. Great for shoring up weak areas.
          </p>
        </div>

        <Field label="Domain">
          <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className="input">
            <option value="any">Any domain</option>
            {cert.domains.map((d) => (
              <option key={d.id} value={d.id}>{d.label} ({d.weight}%)</option>
            ))}
          </select>
        </Field>

        <Field label="Question count">
          <div className="flex flex-wrap gap-1.5">
            {COUNTS.map((c) => (
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
        </Field>

        <Field label="Difficulty">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input">
            <option value="any">Any</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>
        </Field>

        <label className="flex items-center gap-3 rounded-xl border border-token bg-[var(--card-2)]/40 px-4 py-3 cursor-pointer">
          <input
            type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)}
            className="accent-aws-orange w-4 h-4"
          />
          <div className="text-sm font-semibold">Use a timer (90 s per question)</div>
        </label>

        <div className="flex gap-2 pt-2">
          <button onClick={start} className="btn btn-primary flex-1">
            Start practice <ChevronRight size={14} />
          </button>
          <button onClick={onExit} className="btn btn-ghost">Cancel</button>
        </div>
        <style>{`.input { width: 100%; background: var(--card-2); border: 1px solid var(--border); border-radius: 12px; padding: 10px 14px; font-size: 14px; font-weight: 600; color: var(--text); outline: none; }
        .input:focus { border-color: #FF9900; }`}</style>
      </div>
    );
  }

  // ---------- playing ----------
  if (phase === 'playing') {
    const q = questions[index];
    const isRevealed = !!revealed[q.id];
    const totalSec = timed ? questions.length * 90 : 0;

    return (
      <div className="grid gap-5 lg:grid-cols-[1fr_240px] max-w-5xl mx-auto">
        <div className="space-y-4">
          <div className="surface rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-3">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
              {cert.code} · Practice
            </div>
            <div className="ml-auto flex items-center gap-2">
              {timed && (
                <ExamTimer
                  startedAt={startedAtRef.current}
                  totalSeconds={totalSec}
                  onExpire={finalize}
                />
              )}
              <button onClick={onExit} className="btn btn-ghost !text-xs !px-2 !py-1.5">Exit</button>
            </div>
          </div>

          <div className="surface rounded-2xl p-5 sm:p-7">
            <QuestionRenderer
              q={q}
              answer={answers[q.id]}
              onAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              revealed={isRevealed}
              index={index}
              total={questions.length}
              hideFlag
            />

            {/* BF-05: INLINE action buttons — visible right under the options.
                No scrolling needed. Check + Next live side-by-side so the
                moment you click Check, Next is RIGHT THERE in the same spot. */}
            <div className="mt-5 pt-4 border-t border-token flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={prev}
                disabled={index === 0}
                className={cn(
                  'btn btn-ghost !text-sm flex items-center gap-1.5',
                  index === 0 && 'opacity-40 cursor-not-allowed'
                )}
                title="Previous question (← key)"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {!isRevealed ? (
                  <>
                    {/* Check answer — primary, only enabled when an option is selected */}
                    <button
                      onClick={submitOne}
                      disabled={!isAnswered(answers[q.id])}
                      className={cn(
                        'btn btn-primary !text-sm flex items-center gap-1.5',
                        !isAnswered(answers[q.id]) && 'opacity-40 cursor-not-allowed'
                      )}
                      title="Check answer (Enter key)"
                    >
                      ✓ Check answer
                    </button>
                    {/* Skip without checking — for the user who just wants to move on */}
                    <button
                      onClick={next}
                      className="btn btn-ghost !text-sm flex items-center gap-1.5"
                      title="Skip to next without checking (→ key)"
                    >
                      Skip <ChevronRight size={14} />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={next}
                    className="btn btn-primary !text-sm flex items-center gap-1.5 shadow-lg"
                    title={`${index < questions.length - 1 ? 'Next question' : 'Finish'} (→ or Enter)`}
                    autoFocus
                  >
                    {index < questions.length - 1 ? 'Next question' : 'Finish exam'}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {isRevealed && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                {q.docs && (
                  <a href={q.docs} target="_blank" rel="noreferrer"
                     className="chip border border-token bg-[var(--card-2)] font-bold hover:bg-[var(--card)]">
                    <ExternalLink size={11} /> AWS docs
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

          {/* EX-04 + BF-05: Sticky bottom nav bar — Prev / status / Check / Next.
              Stays visible at all times so you never have to scroll back
              up to navigate. Includes keyboard shortcuts (← → Enter).
              Higher z-index (z-40) sits above the MobileNav (z-30) so it never
              gets hidden on small screens. Margin-bottom accounts for the
              mobile bottom-nav strip. */}
          <div className="sticky bottom-0 z-40 -mx-3 sm:-mx-4 mb-16 lg:mb-0 px-3 sm:px-4 py-3 backdrop-blur-md bg-[var(--bg)]/95 border-t-2 border-aws-orange/30 shadow-2xl flex items-center justify-between gap-2">
            <button
              onClick={prev}
              disabled={index === 0}
              className={cn('btn btn-ghost !text-xs flex items-center gap-1', index === 0 && 'opacity-40 cursor-not-allowed')}
              title="Previous question (← key)"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <div className="text-[11px] text-muted font-bold tabular-nums">
              <span className="text-aws-orange">Q {index + 1}</span> / {questions.length}
              {isRevealed && <span className="ml-1.5 text-success">✓ revealed</span>}
            </div>
            {!isRevealed ? (
              <button
                onClick={submitOne}
                disabled={!isAnswered(answers[q.id])}
                className={cn('btn btn-primary !text-xs flex items-center gap-1', !isAnswered(answers[q.id]) && 'opacity-40 cursor-not-allowed')}
                title="Check answer (Enter key)"
              >
                Check answer <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={next}
                className="btn btn-primary !text-xs flex items-center gap-1"
                title={`${index < questions.length - 1 ? 'Next question' : 'Finish'} (→ or Enter)`}
              >
                {index < questions.length - 1 ? 'Next' : 'Finish'} <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        <aside className="hidden lg:block surface rounded-2xl p-3 h-fit">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 px-1">
            Progress
          </div>
          <ul className="space-y-1">
            {questions.map((qq, i) => {
              const r = !!revealed[qq.id];
              const ans = answers[qq.id];
              const ok = isCorrect(qq, ans);
              return (
                <li key={qq.id}>
                  <button
                    onClick={() => setIndex(i)}
                    className={cn(
                      'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold transition',
                      i === index ? 'bg-aws-orange/10 text-aws-orange' : 'hover:bg-[var(--card-2)] text-muted',
                    )}
                  >
                    <span className="w-5 h-5 rounded grid place-items-center text-[10px] font-extrabold flex-shrink-0">
                      {r
                        ? (ok ? <CheckCircle2 size={12} className="text-success" /> : <XCircle size={12} className="text-danger" />)
                        : (i + 1)}
                    </span>
                    <span className="truncate">{qq.q.slice(0, 30)}…</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    );
  }

  // ---------- done ----------
  return <PracticeSummary
    cert={cert}
    questions={questions}
    answers={answers}
    onClose={() => onExit?.()}
  />;
}

function PracticeSummary({ cert, questions, answers, onClose }) {
  const correct = questions.filter((q) => isCorrect(q, answers[q.id])).length;
  const pct = Math.round((correct / questions.length) * 100);

  // Strongest / weakest domain
  const byDomain = useMemo(() => {
    const agg = {};
    for (const q of questions) {
      const ok = isCorrect(q, answers[q.id]);
      for (const dId of q.domainIds) {
        if (!agg[dId]) agg[dId] = { correct: 0, total: 0 };
        agg[dId].total += 1;
        if (ok) agg[dId].correct += 1;
      }
    }
    return Object.entries(agg).map(([dId, v]) => {
      const dom = cert.domains.find((d) => d.id === dId);
      return { domainId: dId, label: dom?.label || dId, pct: Math.round((v.correct / v.total) * 100), ...v };
    }).sort((a, b) => b.pct - a.pct);
  }, [questions, answers, cert]);

  const strongest = byDomain[0];
  const weakest = byDomain[byDomain.length - 1];

  return (
    <div className="surface rounded-3xl p-6 sm:p-8 gradient-border max-w-2xl mx-auto space-y-5">
      <div className="text-center">
        <div className={cn(
          'text-5xl font-black tracking-tight',
          pct >= 80 ? 'text-success' : pct >= 60 ? 'text-warning' : 'text-danger',
        )}>
          {pct}%
        </div>
        <div className="text-sm text-muted mt-1">{correct} / {questions.length} correct</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-success/30 bg-success/[0.04] p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-success">Strongest</div>
          <div className="text-sm font-bold mt-1">{strongest?.label}</div>
          <div className="text-xs text-muted">{strongest?.pct}% — {strongest?.correct}/{strongest?.total}</div>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/[0.04] p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-warning">Weakest</div>
          <div className="text-sm font-bold mt-1">{weakest?.label}</div>
          <div className="text-xs text-muted">{weakest?.pct}% — {weakest?.correct}/{weakest?.total}</div>
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">All domains</h4>
        <ul className="space-y-1.5">
          {byDomain.map((d) => (
            <li key={d.domainId} className="flex items-center gap-3 text-xs">
              <span className="flex-1 font-semibold truncate">{d.label}</span>
              <div className="w-32 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                <div className="h-full bg-aws-orange" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="w-10 text-right font-bold tabular-nums">{d.pct}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="btn btn-primary flex-1">Done</button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function isAnswered(a) {
  if (a === undefined || a === null) return false;
  if (Array.isArray(a)) return a.length > 0;
  return true;
}
