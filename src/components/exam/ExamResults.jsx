import { motion } from 'framer-motion';
import {
  AlertTriangle, Award, CheckCircle2, ChevronRight, Clock, ExternalLink, Lightbulb,
  ListChecks, RotateCw, Target, Trophy, X, XCircle, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fireConfetti, sideCannons } from '../ui/Confetti.js';
import { passPercent } from '../../data/certs.js';
import { cn } from '../../lib/utils.js';
import { ProgressRing } from '../roadmap/ProgressRing.jsx';
import { QuestionRenderer } from './QuestionRenderer.jsx';
import { recordAttempt, findSustainedWeakness, isCriticalSession, recoveryPlanFor } from '../../lib/examWeakness.js';

/**
 * Results page rendered after a standard exam finishes.
 * Props:
 *   - cert
 *   - attempt: { scaledScore, passed, correct, total, durationSec, byDomain }
 *   - questions, answers, flags (full record for review)
 *   - onRetake(), onClose()
 */
export function ExamResults({ cert, attempt, questions, answers, flags, onRetake, onClose }) {
  const { scaledScore, passed, correct, total, durationSec, byDomain } = attempt;
  const [reviewIndex, setReviewIndex] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all'); // all | wrong | flagged

  // Fire celebration once
  useEffect(() => {
    if (passed) {
      sideCannons();
      setTimeout(fireConfetti, 200);
    }
  }, [passed]);

  // EX-02: record this attempt + compute weakness state
  useEffect(() => {
    recordAttempt(cert.id, { scoreOverall: Math.round((scaledScore / 1000) * 100), byDomain });
  }, [cert.id, scaledScore, byDomain]);

  const sustainedWeakness = useMemo(() => findSustainedWeakness(cert.id), [cert.id, scaledScore]);
  const critical          = useMemo(() => isCriticalSession(cert.id),    [cert.id, scaledScore]);
  const navigate = useNavigate();

  // Build a "retry weak topics only" deep link
  const weakDomainIds = sustainedWeakness.map((w) => w.domainId);
  function retryWeakTopics() {
    const param = weakDomainIds.length ? `?domains=${weakDomainIds.join(',')}` : '';
    navigate(`/exam/${cert.id}/run/practice${param}`);
  }

  const domainChart = useMemo(() => {
    return cert.domains.map((d) => {
      const v = byDomain[d.id] || { correct: 0, total: 0 };
      const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
      return { domainId: d.id, name: d.label, pct, correct: v.correct, total: v.total };
    });
  }, [cert, byDomain]);

  const avgSec = Math.round(durationSec / total);
  const passPctVal = passPercent(cert);
  const scorePct = Math.round((scaledScore / 1000) * 100);

  const filteredIndexes = useMemo(() => {
    if (reviewFilter === 'all') return questions.map((_, i) => i);
    if (reviewFilter === 'wrong') return questions
      .map((q, i) => ({ i, ok: isCorrectLocal(q, answers[q.id]) }))
      .filter((x) => !x.ok).map((x) => x.i);
    if (reviewFilter === 'flagged') return questions.map((_, i) => i).filter((i) => flags[questions[i].id]);
    return [];
  }, [questions, answers, flags, reviewFilter]);

  const weakest = useMemo(() => {
    return [...domainChart].sort((a, b) => a.pct - b.pct)[0];
  }, [domainChart]);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={cn(
          'surface rounded-3xl p-6 sm:p-8 gradient-border relative overflow-hidden',
          passed && 'border-success/30'
        )}
      >
        <div className={cn(
          'absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none',
          passed ? 'bg-success/15' : 'bg-warning/15',
        )} />
        <div className="relative grid gap-6 lg:grid-cols-[240px_1fr] items-center">
          <div className="flex justify-center">
            <ProgressRing
              percent={scorePct}
              size={200} stroke={16}
              accent={passed ? 'green' : 'orange'} mega
            >
              <div className="text-center">
                <div className={cn('text-5xl font-black tracking-tight tabular-nums',
                  passed ? 'text-success' : 'text-warning',
                )}>{scaledScore}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">
                  / 1000
                </div>
              </div>
            </ProgressRing>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              {cert.code} · Result
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              {passed ? '🎉 You passed!' : 'Not quite — but the data is gold.'}
            </h2>
            <p className="text-sm text-muted mt-2 max-w-2xl">
              {passed
                ? `Above the ${cert.passScore} pass score. Capture your wins and book the real exam when you\'re ready.`
                : `${cert.passScore - scaledScore} points below the pass score. Focus on the weakest domain and retake.`}
            </p>
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              <Stat icon={CheckCircle2} label="Correct" value={`${correct}/${total}`} tone="text-success" />
              <Stat icon={Target} label="Pass score" value={`${cert.passScore}/1000`} />
              <Stat icon={Clock} label="Time" value={fmtDuration(durationSec)} />
              <Stat icon={Clock} label="Avg / Q" value={fmtSec(avgSec)} />
            </div>
            {!passed && weakest && (
              <div className="mt-4 rounded-xl border border-warning/30 bg-warning/[0.04] p-3 text-sm">
                <span className="font-extrabold text-warning">Focus next:</span> {weakest.name} —
                {' '}<strong>{weakest.pct}%</strong> ({weakest.correct}/{weakest.total}).
              </div>
            )}

            {/* EX-02: Critical-session red alert + mini recovery plan */}
            {critical && weakest && (
              <CriticalAlert cert={cert} domainId={weakest.domainId || cert.domains[0]?.id} scorePct={scorePct} />
            )}

            {/* EX-02: Sustained-weakness yellow banner — only if 2 in a row sub-60% on same topic */}
            {sustainedWeakness.length > 0 && (
              <SustainedWeaknessBanner
                cert={cert}
                items={sustainedWeakness}
                onRetryWeak={retryWeakTopics}
              />
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={onRetake} className="btn btn-primary">
                <RotateCw size={14} /> Schedule retake
              </button>
              <button onClick={onClose} className="btn btn-ghost">Back to cert</button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Domain breakdown chart */}
      <section className="surface rounded-2xl p-5 sm:p-6">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
          Domain breakdown
        </h3>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={domainChart} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={170}
                     axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,153,0,0.08)' }}
                contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }}
                formatter={(v, _n, p) => [`${p.payload.correct}/${p.payload.total}  (${v}%)`, 'Score']}
              />
              <Bar dataKey="pct" radius={[0, 8, 8, 0]}>
                {domainChart.map((d, i) => (
                  <Cell key={i} fill={
                    d.pct >= passPctVal ? '#00C853'
                    : d.pct >= passPctVal - 15 ? '#FFD600'
                    : '#FF4444'
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Question review */}
      <section className="surface rounded-2xl p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3 mb-3">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
            Review questions
          </h3>
          <div className="flex items-center gap-1 text-[10px] font-extrabold">
            {[['all', 'All'], ['wrong', 'Wrong only'], ['flagged', 'Flagged only']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setReviewFilter(k)}
                className={cn(
                  'rounded-md px-2 py-1 border transition',
                  reviewFilter === k
                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                    : 'border-token text-muted hover:text-current'
                )}
              >{label}</button>
            ))}
          </div>
        </div>
        <ol className="space-y-1.5">
          {filteredIndexes.length === 0 && (
            <li className="text-sm text-muted italic">No matching questions.</li>
          )}
          {filteredIndexes.map((i) => {
            const q = questions[i];
            const ok = isCorrectLocal(q, answers[q.id]);
            return (
              <li key={q.id}>
                <button
                  onClick={() => setReviewIndex(i)}
                  className="w-full flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-[var(--card-2)] text-left transition focus-ring"
                >
                  <span className={cn(
                    'w-6 h-6 grid place-items-center rounded-md flex-shrink-0 mt-0.5',
                    ok ? 'bg-success text-white' : 'bg-danger text-white'
                  )}>
                    {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  </span>
                  <span className="flex-1 text-[13px] leading-snug">
                    <span className="text-muted font-bold mr-1">Q{i + 1}.</span>
                    {q.q}
                  </span>
                  <ChevronRight size={14} className="text-muted mt-0.5" />
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Review modal */}
      {reviewIndex !== null && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setReviewIndex(null)} />
          <div className="relative surface rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-7 gradient-border">
            <button
              onClick={() => setReviewIndex(null)}
              className="absolute top-3 right-3 rounded-md p-1.5 hover:bg-[var(--card-2)]"
              aria-label="Close"
            ><X size={16} /></button>
            <QuestionRenderer
              q={questions[reviewIndex]}
              answer={answers[questions[reviewIndex].id]}
              onAnswer={() => {}}
              revealed
              readOnly
              hideFlag
              index={reviewIndex}
              total={questions.length}
            />
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {questions[reviewIndex].docs && (
                <a href={questions[reviewIndex].docs} target="_blank" rel="noreferrer"
                   className="chip border border-token bg-[var(--card-2)] font-bold hover:bg-[var(--card)]">
                  <ExternalLink size={11} /> AWS docs
                </a>
              )}
              {questions[reviewIndex].learningTopic && (
                <Link
                  to={`/learning/${questions[reviewIndex].learningTopic.categoryId}/${questions[reviewIndex].learningTopic.topicId}`}
                  className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange font-bold"
                >
                  Open in Learning Lab
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// EX-02: Critical-session red alert + mini recovery plan
function CriticalAlert({ cert, domainId, scorePct }) {
  const plan = recoveryPlanFor(cert, domainId);
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border-2 border-danger/50 bg-danger/10 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-danger/20 text-danger grid place-items-center">
          <Zap size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-danger">🔴 This session needs attention</h3>
          <p className="text-sm opacity-90 mt-1">
            You scored {scorePct}% — below the 40% critical threshold. Don\'t panic — every cert
            student hits this at least once. Here\'s a focused recovery plan for {plan?.label || 'your weakest area'}.
          </p>
          {plan && (
            <ol className="mt-3 space-y-1.5 text-sm">
              {plan.subtopics.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-5 h-5 rounded bg-danger/15 text-danger text-[10px] font-extrabold grid place-items-center">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}
          {plan && (
            <div className="mt-3 text-[11px] opacity-70">
              Estimated time: <strong>{plan.estimatedHours} hours</strong> · Weight in real exam: <strong>{plan.weight}%</strong>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// EX-02: Sustained weakness yellow banner + retry button
function SustainedWeaknessBanner({ cert, items, onRetryWeak }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-2xl border-2 border-warning/50 bg-warning/10 p-4"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-warning/20 text-warning grid place-items-center">
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-extrabold text-warning">
            🟡 You\'re struggling with {items.length === 1 ? `${getDomainLabel(cert, items[0].domainId)}` : `${items.length} topics`} — let\'s fix that
          </h3>
          <p className="text-sm opacity-90 mt-1">
            You\'ve scored under 60% on these topics in 2 sessions in a row. Run a focused practice with only these topics — small, regular wins are how you reverse a slump.
          </p>
          <div className="mt-3 space-y-2">
            {items.slice(0, 3).map((w) => {
              const plan = recoveryPlanFor(cert, w.domainId);
              return (
                <details key={w.domainId} className="rounded-lg border border-warning/30 bg-[var(--card-2)]/40 p-2.5 text-sm">
                  <summary className="cursor-pointer font-bold flex items-center justify-between">
                    <span>{getDomainLabel(cert, w.domainId)}</span>
                    <span className="text-[11px] opacity-70 font-mono">latest {w.latestPct}% · prev {w.previousPct}%</span>
                  </summary>
                  {plan && (
                    <ol className="mt-2 space-y-1 text-[12px]">
                      {plan.subtopics.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Lightbulb size={10} className="shrink-0 mt-1 text-warning" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </details>
              );
            })}
          </div>
          <button
            onClick={onRetryWeak}
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning text-ink-950 font-extrabold text-xs hover:brightness-110 shadow-sm"
          >
            <RotateCw size={12} /> Retry weak topics only
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function getDomainLabel(cert, domainId) {
  return cert.domains.find((d) => d.id === domainId)?.label || domainId;
}

function Stat({ icon: Icon, label, value, tone = 'text-current' }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-base font-extrabold tabular-nums', tone)}>{value}</div>
    </div>
  );
}

function fmtDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function fmtSec(s) {
  return `${s}s`;
}

function isCorrectLocal(q, user) {
  if (user === undefined || user === null) return false;
  if (q.type === 'multi') {
    if (!Array.isArray(user) || !Array.isArray(q.answer)) return false;
    return [...user].sort().join(',') === [...q.answer].sort().join(',');
  }
  return user === q.answer;
}
