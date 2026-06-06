import { motion } from 'framer-motion';
import {
  Award, Bot, Building, CheckCircle2, ChevronLeft, ChevronRight, Eye, Mic, Send,
  Sparkles, Target, Trophy, User, Wand2, XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Markdown } from '../components/ai/Markdown.jsx';
import { TypingDots } from '../components/ai/TypingDots.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { useAI } from '../context/AIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { COMPANIES, LEVELS, ROLES, getInterviewQuestions, scoreAnswer } from '../data/interviewBank.js';
import { cn } from '../lib/utils.js';
import { InterviewReviewPanel } from '../components/interview-review/InterviewReviewPanel.jsx';

const COMPANY_FLAVOR = {
  startup:    'I\'m Maya, hiring manager at a 30-person SaaS startup. Move fast — we want pragmatism over perfection.',
  midsize:    'I\'m Alex, principal engineer at a 500-engineer mid-size company. We balance velocity with structure.',
  enterprise: 'I\'m Priya, staff architect at a Fortune-500 enterprise. Compliance, blast radius, and standardization matter here.',
};

export default function InterviewSimulator() {
  const [phase, setPhase] = useState('setup');  // setup | interview | results
  const [role, setRole] = useState('sa');
  const [level, setLevel] = useState('mid');
  const [company, setCompany] = useState('midsize');
  const [questions, setQuestions] = useState([]);
  const [turn, setTurn] = useState(0);
  const [answers, setAnswers] = useState([]);   // index → text
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [interimResult, setInterimResult] = useState(null);  // per-turn feedback shown inline
  const transcriptRef = useRef(null);
  const { saveInterview, saveAINote, state } = useAI();
  const toast = useToast();

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [turn, thinking, interimResult]);

  const start = () => {
    const qs = getInterviewQuestions(role, level);
    setQuestions(qs);
    setTurn(0);
    setAnswers([]);
    setInput('');
    setInterimResult(null);
    setPhase('interview');
  };

  const submit = () => {
    if (!input.trim() || thinking) return;
    const q = questions[turn];
    const next = [...answers]; next[turn] = input.trim();
    setAnswers(next);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const result = scoreAnswer(q, next[turn]);
      setInterimResult({ ...result, turn });
      setThinking(false);
    }, 600);
  };

  const advance = () => {
    setInterimResult(null);
    if (turn < questions.length - 1) {
      setTurn(turn + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    const breakdowns = questions.map((q, i) => ({ q, answer: answers[i] || '', ...scoreAnswer(q, answers[i] || '') }));
    const tech = breakdowns.filter((b) => b.q.kind === 'tech');
    const techAvg = tech.length ? Math.round(tech.reduce((a, b) => a + b.score, 0) / tech.length) : 0;
    const finalScore = Math.round(breakdowns.reduce((a, b) => a + b.score, 0) / breakdowns.length);
    saveInterview({
      role, level, company,
      transcript: breakdowns,
      score: finalScore,
      techScore: techAvg,
    });
    toast.success(`Interview complete — ${finalScore}/100`);
    setPhase('results');
  };

  const onKey = (e) => { if (e.key === 'Enter' && e.metaKey) submit(); };

  // ----------------- setup -----------------

  if (phase === 'setup') {
    const recent = state.interviews.slice(0, 3);
    return (
      <div className="space-y-5">
        <Link to="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
          <ChevronLeft size={14} /> AI hub
        </Link>
        <PageHeader
          eyebrow="Mock Interview Simulator"
          title="Practice like the real thing."
          subtitle="Choose a role, level, and company size. I\'ll be the interviewer. You\'ll get scored feedback + model answers after."
          icon={Mic}
        />

        <div className="surface rounded-3xl p-6 sm:p-8 gradient-border space-y-5">
          <ChoiceRow label="Role" value={role} setValue={setRole} options={ROLES} icon={User} />
          <ChoiceRow label="Level" value={level} setValue={setLevel} options={LEVELS} icon={Award} />
          <ChoiceRow label="Company type" value={company} setValue={setCompany} options={COMPANIES} icon={Building} />

          <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-4 text-sm leading-relaxed">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
              Your interviewer will say
            </div>
            "{COMPANY_FLAVOR[company]}"
          </div>

          <button onClick={start} className="btn btn-primary w-full">
            <Mic size={14} /> Start interview ({getInterviewQuestions(role, level).length} questions)
          </button>
        </div>

        {recent.length > 0 && (
          <section className="surface rounded-2xl p-5">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
              Recent interviews
            </h3>
            <ul className="space-y-2">
              {recent.map((iv) => (
                <li key={iv.id} className="flex items-center gap-3 text-sm">
                  <span className={cn(
                    'chip border font-extrabold text-xs',
                    iv.score >= 80 ? 'bg-success/10 text-success border-success/30' :
                    iv.score >= 60 ? 'bg-warning/10 text-warning border-warning/30' :
                                      'bg-danger/10 text-danger border-danger/30',
                  )}>{iv.score}/100</span>
                  <span className="flex-1 truncate font-semibold">
                    {ROLES.find((r) => r.id === iv.role)?.label} — {LEVELS.find((l) => l.id === iv.level)?.label} ({COMPANIES.find((c) => c.id === iv.company)?.label})
                  </span>
                  <span className="text-[11px] text-muted">{new Date(iv.at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // ----------------- results -----------------

  if (phase === 'results') {
    const lastInterview = state.interviews[0];
    if (!lastInterview) return null;
    return (
      <Results interview={lastInterview} onRestart={() => setPhase('setup')} onSave={() => {
        const text = transcriptText(lastInterview);
        saveAINote('interview', text);
        toast.success('Saved to AI notes');
      }} />
    );
  }

  // ----------------- interview -----------------

  const q = questions[turn];
  const intro = COMPANY_FLAVOR[company];

  return (
    <div className="space-y-4">
      <Link to="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> AI hub
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
          {ROLES.find((r) => r.id === role)?.label} · {LEVELS.find((l) => l.id === level)?.label} · {COMPANIES.find((c) => c.id === company)?.label}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-muted">Question <span className="text-aws-orange">{turn + 1}</span> / {questions.length}</span>
          <button onClick={() => { if (confirm('End interview and see results?')) finish(); }} className="btn btn-ghost !text-xs">
            End early
          </button>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
        <motion.div className="h-full bg-gradient-aws"
                    initial={false}
                    animate={{ width: `${((turn + 1) / questions.length) * 100}%` }} />
      </div>

      <div ref={transcriptRef} className="surface rounded-3xl p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto gradient-border">
        {turn === 0 && (
          <Bubble side="bot" name="Interviewer">{intro}</Bubble>
        )}
        {questions.slice(0, turn + 1).map((qq, i) => (
          <div key={i} className="space-y-3">
            <Bubble side="bot" name="Interviewer">{qq.q}</Bubble>
            {answers[i] && <Bubble side="user" name="You">{answers[i]}</Bubble>}
            {i === turn && interimResult && (
              <InterimFeedback result={interimResult} q={qq} />
            )}
          </div>
        ))}
        {thinking && (
          <Bubble side="bot" name="Interviewer"><TypingDots /></Bubble>
        )}
      </div>

      {!interimResult ? (
        <div className="surface rounded-2xl p-3 flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Type your answer… (Cmd/Ctrl+Enter to submit)"
            rows={3}
            className="flex-1 resize-none bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm focus-ring focus:border-aws-orange"
          />
          <button
            onClick={submit}
            disabled={!input.trim() || thinking}
            className={cn('btn btn-primary !px-3 h-[44px]', (!input.trim() || thinking) && 'opacity-40 cursor-not-allowed')}
          >
            <Send size={14} />
          </button>
        </div>
      ) : (
        <div className="surface rounded-2xl p-3 flex items-center justify-between">
          <span className="text-[11px] font-bold text-muted">Reviewed.</span>
          <button onClick={advance} className="btn btn-primary">
            {turn < questions.length - 1 ? 'Next question' : 'See full results'} <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ===================== components =====================

function Bubble({ side, name, children }) {
  const isBot = side === 'bot';
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn('flex gap-2.5', !isBot && 'justify-end')}
    >
      {isBot && (
        <div className="w-8 h-8 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 flex-shrink-0 shadow-glow-orange">
          <Bot size={16} strokeWidth={2.5} />
        </div>
      )}
      <div className={cn('max-w-[80%]', !isBot && 'flex flex-col items-end')}>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">{name}</div>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isBot
            ? 'surface-2 border border-token'
            : 'bg-gradient-aws text-ink-950 font-semibold shadow-glow-orange'
        )}>
          {children}
        </div>
      </div>
      {!isBot && (
        <div className="w-8 h-8 rounded-xl bg-[var(--card-2)] border border-token grid place-items-center text-muted flex-shrink-0">
          <User size={16} />
        </div>
      )}
    </motion.div>
  );
}

function InterimFeedback({ result, q }) {
  const [showModel, setShowModel] = useState(false);
  const tone =
    result.score >= 80 ? 'border-success/30 bg-success/[0.04]' :
    result.score >= 60 ? 'border-warning/30 bg-warning/[0.04]' :
                          'border-danger/30 bg-danger/[0.04]';
  const Icon = result.score >= 80 ? CheckCircle2 : result.score >= 60 ? Target : XCircle;
  const iconTone = result.score >= 80 ? 'text-success' : result.score >= 60 ? 'text-warning' : 'text-danger';
  return (
    <div className={cn('rounded-xl border p-4 ml-10', tone)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={iconTone} />
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Instant feedback</span>
        <span className={cn('chip border font-extrabold text-xs ml-auto',
          result.score >= 80 ? 'bg-success/15 text-success border-success/30' :
          result.score >= 60 ? 'bg-warning/15 text-warning border-warning/30' :
                                'bg-danger/15 text-danger border-danger/30')}>
          {result.score}/100
        </span>
      </div>
      <p className="text-sm leading-relaxed">{result.feedback}</p>
      {result.hits.length > 0 && (
        <div className="mt-2 text-[11px]"><strong className="text-success">Hit:</strong> {result.hits.join(', ')}</div>
      )}
      {result.missing.length > 0 && (
        <div className="text-[11px] mt-1"><strong className="text-warning">Missing:</strong> {result.missing.join(', ')}</div>
      )}
      {q.modelAnswer && (
        <div className="mt-3 pt-3 border-t border-token">
          <button onClick={() => setShowModel(!showModel)} className="text-[11px] font-bold text-aws-orange hover:underline inline-flex items-center gap-1">
            <Eye size={11} /> {showModel ? 'Hide' : 'Show'} model answer
          </button>
          {showModel && (
            <p className="text-xs leading-relaxed mt-2 text-muted">{q.modelAnswer}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Results({ interview, onRestart, onSave }) {
  const { score, techScore, transcript, role, level, company } = interview;
  const tech = transcript.filter((b) => b.q.kind === 'tech');
  const competencies = useMemo(() => {
    const map = {};
    tech.forEach((b) => {
      if (!map[b.q.competency]) map[b.q.competency] = [];
      map[b.q.competency].push(b.score);
    });
    return Object.entries(map).map(([comp, scores]) => ({
      comp,
      avg: Math.round(scores.reduce((a, x) => a + x, 0) / scores.length),
      count: scores.length,
    })).sort((a, b) => b.avg - a.avg);
  }, [tech]);

  const passed = score >= 70;

  return (
    <div className="space-y-5">
      <Link to="/ai/interview" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Back
      </Link>

      <motion.section
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="surface rounded-3xl p-6 sm:p-8 gradient-border relative overflow-hidden"
      >
        <div className={cn(
          'absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none',
          passed ? 'bg-success/15' : 'bg-warning/15'
        )} />
        <div className="relative grid gap-5 lg:grid-cols-[200px_1fr] items-center">
          <div className="flex justify-center">
            <ProgressRing percent={score} size={180} stroke={14} accent={passed ? 'green' : 'orange'} mega>
              <div className="text-center">
                <div className={cn('text-5xl font-black tabular-nums',
                  passed ? 'text-success' : 'text-warning')}>{score}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">Overall</div>
              </div>
            </ProgressRing>
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              {ROLES.find((r) => r.id === role)?.label} · {LEVELS.find((l) => l.id === level)?.label} · {COMPANIES.find((c) => c.id === company)?.label}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
              {passed ? 'Strong showing.' : 'Useful data — let\'s fix the gaps.'}
            </h2>
            <p className="text-sm text-muted mt-2">
              Technical average: <strong>{techScore}/100</strong> across {tech.length} technical question{tech.length === 1 ? '' : 's'}.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={onRestart} className="btn btn-primary">
                <Mic size={14} /> Run another
              </button>
              <button onClick={onSave} className="btn btn-ghost">
                <Sparkles size={14} /> Save transcript
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Per-competency breakdown */}
      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
          By competency
        </h3>
        <ul className="space-y-2">
          {competencies.map((c) => (
            <li key={c.comp} className="flex items-center gap-3 text-sm">
              <span className="flex-1 capitalize font-semibold">{c.comp.replace(/-/g, ' ')}</span>
              <div className="w-48 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                <div className={cn('h-full transition-all',
                  c.avg >= 70 ? 'bg-success' : c.avg >= 50 ? 'bg-warning' : 'bg-danger')}
                     style={{ width: `${c.avg}%` }} />
              </div>
              <span className="w-12 text-right font-bold tabular-nums text-xs">{c.avg}%</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Per-question breakdown */}
      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
          Full transcript
        </h3>
        <div className="space-y-3">
          {transcript.map((b, i) => (
            <details key={i} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
              <summary className="flex items-center gap-3 cursor-pointer">
                <span className={cn(
                  'chip border font-extrabold text-[10px]',
                  b.score >= 80 ? 'bg-success/15 text-success border-success/30' :
                  b.score >= 60 ? 'bg-warning/15 text-warning border-warning/30' :
                                  'bg-danger/15 text-danger border-danger/30',
                )}>{b.score}</span>
                <span className="text-sm font-bold flex-1">Q{i + 1}. {b.q.q}</span>
              </summary>
              <div className="mt-3 pl-1 space-y-2 text-xs">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">Your answer</div>
                  <p className="leading-relaxed">{b.answer || <span className="text-muted italic">No answer given.</span>}</p>
                </div>
                <p className="text-muted"><strong className="text-aws-orange">Feedback:</strong> {b.feedback}</p>
                {b.q.modelAnswer && (
                  <div>
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1 mt-2">Model answer</div>
                    <p className="leading-relaxed text-muted">{b.q.modelAnswer}</p>
                  </div>
                )}
                {/* INT-01: STAR coach review */}
                {b.answer && (
                  <InterviewReviewPanel
                    question={b.q.q}
                    answer={b.answer}
                    questionType={b.q.kind === 'sysdesign' ? 'system-design' : b.q.kind === 'tech' ? 'technical' : 'behavioural'}
                    className="mt-3"
                  />
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChoiceRow({ label, value, setValue, options, icon: Icon }) {
  return (
    <div>
      <label className="text-[10px] font-extrabold uppercase tracking-widest text-muted flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-aws-orange" />} {label}
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => setValue(o.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-bold transition border',
              value === o.id
                ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                : 'border-token text-muted hover:text-current'
            )}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}

function transcriptText(iv) {
  const head = `# Mock interview · ${iv.score}/100\n\n${ROLES.find((r) => r.id === iv.role)?.label} — ${LEVELS.find((l) => l.id === iv.level)?.label}\n\n`;
  return head + iv.transcript.map((b, i) =>
    `### Q${i + 1}: ${b.q.q}\n\n**Your answer:** ${b.answer || '(none)'}\n\n**Feedback:** ${b.feedback}\n\n**Score:** ${b.score}/100`,
  ).join('\n\n---\n\n');
}
