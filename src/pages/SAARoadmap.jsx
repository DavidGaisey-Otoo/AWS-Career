/**
 * SAARoadmap.jsx — SAA-C03 prep roadmap page.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Calendar, Clock, BookOpen, CheckCircle2, Circle,
  Target, TrendingUp, AlertTriangle, Award, FileText, ChevronDown,
  ChevronUp, ExternalLink, RotateCcw, Trophy, Zap, ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import {
  EXAM_INFO, DOMAINS, PHASES, CHEATSHEET, computeReadiness, guideIdForService,
} from '../data/saaRoadmap.js';
import {
  useSAAProgress, toggleService, setExamDate, logHours, logPracticeScore,
  resetAll, getPhaseCompletion, getPhasesComplete, getDaysToExam,
  getLastPracticeScore,
} from '../lib/saaProgress.js';
import { cn } from '../lib/utils.js';

export default function SAARoadmap() {
  const state = useSAAProgress();
  const [openPhase, setOpenPhase] = useState(PHASES[0].id);

  const phasesComplete = useMemo(() => getPhasesComplete(state), [state]);
  const daysToExam = useMemo(() => getDaysToExam(state), [state]);
  const lastScore = useMemo(() => getLastPracticeScore(state), [state]);
  const readiness = useMemo(
    () => computeReadiness({ phasesComplete, lastPracticeScore: lastScore, hoursStudied: state.hoursStudied || 0 }),
    [phasesComplete, lastScore, state.hoursStudied]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={`SAA-01 · ${EXAM_INFO.code}`}
        title="Solutions Architect Associate roadmap"
        subtitle={`${EXAM_INFO.fullName}. ${EXAM_INFO.duration}-min, ${EXAM_INFO.questionCount} questions, passing score ${EXAM_INFO.passingScore}/1000. Designed by a 20-yr AWS coach as the most efficient path to passing.`}
        icon={GraduationCap}
      />

      {/* Readiness + countdown */}
      <ReadinessCard state={state} readiness={readiness} daysToExam={daysToExam} phasesComplete={phasesComplete} lastScore={lastScore} />

      {/* Domain weights */}
      <DomainsCard />

      {/* The phases */}
      <div className="space-y-2">
        {PHASES.map((phase) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            state={state}
            isOpen={openPhase === phase.id}
            onToggle={() => setOpenPhase((cur) => cur === phase.id ? null : phase.id)}
          />
        ))}
      </div>

      {/* Cheat sheet */}
      <CheatSheetCard />

      {/* Footer actions */}
      <div className="surface rounded-2xl p-4 flex flex-wrap gap-2 items-center">
        <button onClick={resetAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-danger/30 text-danger hover:bg-danger/10 transition">
          <RotateCcw size={12} /> Reset progress
        </button>
        <span className="text-[11px] opacity-60 ml-auto">
          Roadmap content is hand-curated by a senior AWS architect, not generated. Worth your trust to follow exactly.
        </span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
function ReadinessCard({ state, readiness, daysToExam, phasesComplete, lastScore }) {
  const [editingDate, setEditingDate] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [editingScore, setEditingScore] = useState(false);
  const [dateInput, setDateInput] = useState(() => state.examDate ? state.examDate.slice(0, 10) : '');
  const [hoursInput, setHoursInput] = useState('');
  const [scoreInput, setScoreInput] = useState('');

  const toneClass = {
    success: 'border-success/40 bg-success/5  text-success',
    warning: 'border-warning/40 bg-warning/5 text-warning',
    danger:  'border-danger/40  bg-danger/5  text-danger',
  }[readiness.verdict.tone];

  return (
    <div className={cn('surface rounded-2xl p-5 border-2 space-y-4', toneClass.split(' ')[0])}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            Readiness score
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-extrabold">{readiness.score}/100</div>
            <div className={cn('px-2 py-0.5 rounded-full text-[10.5px] font-extrabold', toneClass)}>
              {readiness.verdict.label}
            </div>
          </div>
          <p className="text-[12px] opacity-85 mt-1.5">{readiness.verdict.note}</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2 min-w-[260px]">
          <StatPill icon={Calendar} label="Days to exam" value={daysToExam == null ? '—' : daysToExam} sub={state.examDate ? new Date(state.examDate).toLocaleDateString('en-GB') : 'Set date below'} />
          <StatPill icon={CheckCircle2} label="Phases done" value={`${phasesComplete}/${PHASES.length}`} />
          <StatPill icon={Clock} label="Hours studied" value={Math.round(state.hoursStudied || 0)} />
          <StatPill icon={TrendingUp} label="Last practice" value={lastScore > 0 ? `${lastScore}%` : '—'} />
        </div>
      </div>

      {/* Action row — set exam date / log hours / log score */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-token">
        {editingDate ? (
          <span className="inline-flex items-center gap-1.5">
            <input type="date" value={dateInput} onChange={(e) => setDateInput(e.target.value)}
                   className="rounded-lg bg-[var(--card-2)] border border-token px-2 py-1 text-[12px]" />
            <button onClick={() => { setExamDate(dateInput); setEditingDate(false); }}
                    className="btn btn-primary text-[11px] !py-1">Save</button>
            <button onClick={() => setEditingDate(false)} className="text-[11px] opacity-60 hover:opacity-100">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setEditingDate(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange">
            <Calendar size={11} /> {state.examDate ? 'Change exam date' : 'Set exam date'}
          </button>
        )}
        {editingHours ? (
          <span className="inline-flex items-center gap-1.5">
            <input type="number" placeholder="hours" value={hoursInput} onChange={(e) => setHoursInput(e.target.value)}
                   className="w-20 rounded-lg bg-[var(--card-2)] border border-token px-2 py-1 text-[12px]" />
            <button onClick={() => { logHours(parseFloat(hoursInput) || 0); setHoursInput(''); setEditingHours(false); }}
                    className="btn btn-primary text-[11px] !py-1">+ Add</button>
            <button onClick={() => setEditingHours(false)} className="text-[11px] opacity-60 hover:opacity-100">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setEditingHours(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange">
            <Clock size={11} /> Log hours
          </button>
        )}
        {editingScore ? (
          <span className="inline-flex items-center gap-1.5">
            <input type="number" placeholder="correct/65" value={scoreInput} onChange={(e) => setScoreInput(e.target.value)}
                   className="w-20 rounded-lg bg-[var(--card-2)] border border-token px-2 py-1 text-[12px]" />
            <span className="text-[11px] opacity-60">/65</span>
            <button onClick={() => { logPracticeScore(parseInt(scoreInput, 10) || 0, 65); setScoreInput(''); setEditingScore(false); }}
                    className="btn btn-primary text-[11px] !py-1">Save</button>
            <button onClick={() => setEditingScore(false)} className="text-[11px] opacity-60 hover:opacity-100">Cancel</button>
          </span>
        ) : (
          <button onClick={() => setEditingScore(true)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange">
            <Trophy size={11} /> Log practice exam
          </button>
        )}
      </div>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-xl bg-[var(--card-2)] border border-token p-2.5">
      <div className="text-[9.5px] font-bold opacity-65 mb-0.5 inline-flex items-center gap-1">
        <Icon size={9} /> {label}
      </div>
      <div className="text-lg font-extrabold">{value}</div>
      {sub && <div className="text-[10px] opacity-60 mt-0.5">{sub}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
function DomainsCard() {
  return (
    <div className="surface rounded-2xl p-5">
      <h3 className="text-[14px] font-extrabold flex items-center gap-2 mb-3">
        <Target size={14} className="text-aws-orange" /> 4 exam domains (weighted)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {DOMAINS.map((d) => {
          const toneClass = {
            danger:  'border-danger/40  bg-danger/5',
            warning: 'border-warning/40 bg-warning/5',
            sky:     'border-sky-400/40 bg-sky-400/5',
            success: 'border-success/40 bg-success/5',
          }[d.color];
          return (
            <div key={d.id} className={cn('rounded-xl border p-3', toneClass)}>
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-[13px] font-extrabold">{d.id} · {d.label}</div>
                <div className="text-[14px] font-extrabold text-aws-orange">{d.weight}%</div>
              </div>
              <p className="text-[11.5px] opacity-90 leading-snug mb-1.5">{d.focus}</p>
              <div className="rounded-lg bg-[var(--card-2)] border border-token p-2 text-[10.5px] mt-1">
                <strong className="text-aws-orange">Exam trick:</strong> {d.examTrick}
              </div>
              <div className="text-[10px] opacity-65 mt-1.5">~{d.failureRate}% avg failure rate on this domain</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
function PhaseCard({ phase, state, isOpen, onToggle }) {
  const completion = getPhaseCompletion(state, phase.id);
  const done = state.phaseProgress?.[phase.id]?.completedAt;

  return (
    <div className={cn(
      'surface rounded-2xl border',
      done ? 'border-success/50 bg-success/5' : 'border-token'
    )}>
      <button onClick={onToggle} className="w-full p-4 text-left flex items-center gap-3">
        <div className="flex-shrink-0">
          {done ? <CheckCircle2 size={20} className="text-success" /> : <Circle size={20} className="opacity-40" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-extrabold">{phase.label}</span>
            <span className="text-[10.5px] opacity-70 px-1.5 py-0.5 rounded-full bg-[var(--card-2)] border border-token">{phase.weeks}</span>
            <span className="text-[10.5px] opacity-70">~{phase.hoursPerWeek}h/wk</span>
            <span className="text-[10.5px] opacity-70 ml-auto">{completion.done}/{completion.total} services</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden bg-[var(--card-2)] mt-2 border border-token">
            <div className={cn('h-full transition-all', done ? 'bg-success' : 'bg-aws-orange')} style={{ width: `${completion.pct}%` }} />
          </div>
        </div>
        {isOpen ? <ChevronUp size={14} className="opacity-60" /> : <ChevronDown size={14} className="opacity-60" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-token pt-3">
          <p className="text-[12px] opacity-90 italic">{phase.rationale}</p>

          {/* Services — each is a study card with full guide + quiz */}
          {phase.services?.length > 0 && (
            <div>
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">Services to master · click to study</div>
              <div className="space-y-1.5">
                {phase.services.map((svc) => (
                  <ServiceStudyCard
                    key={svc.id}
                    service={svc}
                    phaseId={phase.id}
                    checked={!!state.phaseProgress?.[phase.id]?.services?.[svc.id]}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Learning targets */}
          {phase.learningTargets?.length > 0 && (
            <div>
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">Learning targets</div>
              <ul className="text-[12px] space-y-1">
                {phase.learningTargets.map((t, i) => <li key={i} className="flex gap-1.5"><Zap size={11} className="text-aws-orange mt-0.5 flex-shrink-0" /> {t}</li>)}
              </ul>
            </div>
          )}

          {/* Hands-on */}
          {phase.handsOn?.length > 0 && (
            <div>
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">Hands-on labs</div>
              <ul className="text-[12px] space-y-1">
                {phase.handsOn.map((t, i) => <li key={i} className="flex gap-1.5"><span className="text-aws-orange">▸</span> {t}</li>)}
              </ul>
            </div>
          )}

          {/* Schedule (last phase) */}
          {phase.schedule?.length > 0 && (
            <div>
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">Day-by-day plan</div>
              <ul className="text-[12px] space-y-1.5">
                {phase.schedule.map((d, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="font-extrabold text-aws-orange w-10 flex-shrink-0">{d.day}</span>
                    <span>{d.task}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exam-day checklist (last phase) */}
          {phase.examDayChecklist?.length > 0 && (
            <div className="rounded-xl bg-aws-orange/5 border border-aws-orange/30 p-3">
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">Exam-day checklist</div>
              <ul className="text-[11.5px] space-y-1">
                {phase.examDayChecklist.map((t, i) => <li key={i} className="flex gap-1.5"><CheckCircle2 size={11} className="text-success mt-0.5 flex-shrink-0" /> {t}</li>)}
              </ul>
            </div>
          )}

          {/* Footer chip */}
          <div className="text-[11px] opacity-65 flex flex-wrap gap-3">
            <span>📝 {phase.practiceTarget || 0} practice questions target</span>
            {phase.examWeight && <span>📊 {phase.examWeight}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════════
// ServiceStudyCard — the heart of the "make it a real study system"
// upgrade. Each service shows: must-know badge, hour estimate, notes,
// AND two action buttons:
//   1. "Read full study guide" → opens the deep TopicStudyGuide page
//      (sections, exam traps, cheatsheet, flashcards, resources)
//   2. "Practice 10 questions" → opens Exam Center in topic mode
//      filtered to the relevant exam topic
// ════════════════════════════════════════════════════════════════════
function ServiceStudyCard({ service, phaseId, checked }) {
  const guideId = guideIdForService(service.id);
  const hasGuide = !!guideId;
  // Map service ID → exam topic (Storage / Compute / etc.) for quiz launching
  const examTopic = mapServiceToExamTopic(service.id);

  return (
    <div className={cn(
      'rounded-xl border transition',
      checked ? 'border-success/40 bg-success/5' : 'border-token bg-[var(--card-2)]'
    )}>
      <div className="p-3 flex items-start gap-2.5">
        <button
          onClick={() => toggleService(phaseId, service.id)}
          className="flex-shrink-0 mt-0.5"
          aria-label={checked ? 'Mark as not done' : 'Mark as done'}
        >
          {checked ? <CheckCircle2 size={16} className="text-success" /> : <Circle size={16} className="opacity-40 hover:opacity-80 transition" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('text-[13px] font-extrabold uppercase', checked && 'line-through opacity-65')}>
              {service.id}
            </span>
            {service.must
              ? <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-aws-orange/15 text-aws-orange">MUST KNOW</span>
              : <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--card)] opacity-65">nice to know</span>
            }
            <span className="text-[10px] opacity-65 inline-flex items-center gap-0.5">
              <Clock size={9} /> ~{service.hours}h
            </span>
            {!hasGuide && (
              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-warning/15 text-warning">
                Guide coming · use AWS docs
              </span>
            )}
          </div>
          <p className="text-[11.5px] opacity-90 leading-snug mb-2">{service.notes}</p>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5">
            {hasGuide ? (
              <Link
                to={`/exam/saa-c03/study/${guideId}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border border-aws-orange/40 text-aws-orange hover:bg-aws-orange/10 transition"
              >
                <BookOpen size={11} /> Read full study guide <ArrowRight size={9} />
              </Link>
            ) : (
              <a
                href={`https://docs.aws.amazon.com/search/doc-search.html?searchPath=documentation&searchQuery=${encodeURIComponent(service.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
              >
                <ExternalLink size={11} /> AWS docs for {service.id.toUpperCase()}
              </a>
            )}

            {examTopic && (
              <Link
                to={`/exam/saa-c03/run/topic?topic=${encodeURIComponent(examTopic)}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-gradient-aws text-ink-950 hover:brightness-110 transition"
              >
                <Trophy size={11} /> Practice quiz · 10 Qs
              </Link>
            )}

            {hasGuide && (
              <Link
                to={`/exam/saa-c03/study/${guideId}#flashcards`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
              >
                <Zap size={11} /> Flashcards
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Map roadmap service IDs to the exam topic the question bank uses for filtering.
// (Storage / Compute / Security / Networking / Database / Pricing / Monitoring / Integration)
function mapServiceToExamTopic(serviceId) {
  const M = {
    iam: 'Security', 'iam-adv': 'Security', kms: 'Security', secrets: 'Security',
    cognito: 'Security', orgs: 'Security', 'guard-macie': 'Security',
    'waf-shield': 'Security', cloudtrail: 'Security',
    ec2: 'Compute', asg: 'Compute', lambda: 'Compute', ecs: 'Compute',
    fargate: 'Compute', eks: 'Compute', beanstalk: 'Compute', 'step-fn': 'Compute',
    s3: 'Storage', ebs: 'Storage', efs: 'Storage', fsx: 'Storage', 's3-tiering': 'Storage',
    rds: 'Database', aurora: 'Database', ddb: 'Database', redshift: 'Database',
    elasticache: 'Database',
    vpc: 'Networking', 'vpc-adv': 'Networking', route53: 'Networking',
    cloudfront: 'Networking', 'global-accel': 'Networking', 'direct-conn': 'Networking',
    vpn: 'Networking', tgw: 'Networking', elb: 'Networking',
    sqs: 'Integration', sns: 'Integration', eventbridge: 'Integration',
    cloudwatch: 'Monitoring', xray: 'Monitoring',
    'savings-plans': 'Pricing', spot: 'Pricing', budgets: 'Pricing',
    'compute-opt': 'Pricing', 'trusted-adv': 'Pricing', 'wellarch-fw': null,
    cli: null,
  };
  return M[serviceId] || null;
}

function CheatSheetCard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="surface rounded-2xl p-5">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between text-left">
        <h3 className="text-[14px] font-extrabold flex items-center gap-2">
          <FileText size={14} className="text-aws-orange" /> Cheat sheet — last-minute reference
        </h3>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2">
          {CHEATSHEET.map((c, i) => (
            <div key={i} className="rounded-lg bg-[var(--card-2)] border border-token p-2.5 text-[12px]">
              <strong className="text-aws-orange">{c.topic}:</strong> {c.short}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
