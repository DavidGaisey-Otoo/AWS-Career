import { motion } from 'framer-motion';
import {
  Award, BookOpen, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Clipboard,
  Clock, ExternalLink, Filter, FileText, Flag, GraduationCap, Layers, Library,
  Monitor, MonitorSmartphone, Search, Star, Target, Ticket, Trash2, Trophy,
  Wand2, Youtube, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { useExam } from '../context/ExamContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { WHITEPAPERS } from '../data/whitepapers.js';
import { CERTS, LEVEL_META, getCert, passPercent } from '../data/certs.js';
import { questionsForCert } from '../data/questionBank.js';
import { BOOKING, MODE_CONFIGS, NEW_MODES, TOPIC_SERVICES, readinessSignal, servicePerformance } from '../data/examModes.js';
import { TASK_STATEMENTS } from '../data/examTaskStatements.js';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { cn, formatDate } from '../lib/utils.js';

const DOMAIN_COLORS = ['#FF9900', '#00D4FF', '#7C3AED', '#00C853', '#FFD600', '#FF4444'];

export default function ExamCertDetail() {
  const { certId } = useParams();
  const cert = getCert(certId);
  const { certStats, generateStudyPlan, clearStudyPlan, setVoucher, markCertEarned } = useExam();
  const toast = useToast();

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
  const stats = certStats.find((s) => s.id === certId);
  const levelMeta = LEVEL_META[cert.level];

  // History chart data
  const attempts = useMemo(() => {
    return (cert ? [] : []).concat([]); // placeholder for hot reload safety
  }, [cert]);

  return (
    <div className="space-y-6">
      <Link to="/exam" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange print:hidden">
        <ChevronLeft size={14} /> Exam Center
      </Link>

      {/* Hero */}
      <CertHero cert={cert} stats={stats} levelMeta={levelMeta} markEarned={markCertEarned} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DomainPieCard cert={cert} stats={stats} />
        <ScoreHistoryCard cert={cert} certId={certId} />
      </div>

      <DomainPerformanceCard cert={cert} stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ResourcesCard cert={cert} />
        <BookingCard cert={cert} stats={stats} setVoucher={setVoucher} />
      </div>

      <StudyPlanCard cert={cert} stats={stats}
                     generateStudyPlan={generateStudyPlan}
                     clearStudyPlan={clearStudyPlan}
                     toast={toast} />

      {/* Honest question-bank notice */}
      <BankNotice cert={cert} />

      {/* Quick-start actions — all 8 modes feel equal */}
      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
          Practice modes
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ModeCard certId={cert.id} mode="standard" icon={GraduationCap} title="Full mock exam"
            sub={`${cert.questions} Q · ${cert.minutes} min · timed`} />
          <ModeCard certId={cert.id} mode="practice" icon={Clipboard} title="Category practice"
            sub="Pick domain · 10–50 Q · instant feedback" />
          <ModeCard certId={cert.id} mode="learning" icon={BookOpen} title="Learning mode"
            sub="No timer · reveal · Got/Still/Hard" />
          <ModeCard certId={cert.id} mode="timed" icon={Clock} title="Timed mode"
            sub={`Real-pressure mock · ${cert.minutes} min`} accent />
          <ModeCard certId={cert.id} mode="review" icon={Wand2} title="Review mode"
            sub="20 Q · full explanations · adaptive" accent />
          <ModeCard certId={cert.id} mode="section" icon={Layers} title="Section mode"
            sub="One domain at a time · weak-area drill" accent />
          <ModeCard certId={cert.id} mode="topic" icon={Target} title="Topic mode"
            sub="One AWS service · spotlight weaknesses" accent />
          <ModeCard certId={cert.id} mode="final" icon={Flag} title="Randomised final"
            sub={`${cert.questions} Q · readiness assessment`} accent />
        </div>
      </section>

      {/* Adaptive readiness + service heatmap */}
      <ReadinessCard cert={cert} />

      <TopicHeatmapCard cert={cert} />

      {/* Domain → task-statement filters (the SAA-C03-style breakdown) */}
      <TaskStatementCard cert={cert} />

      {/* Enhanced booking assistant */}
      <BookingAssistantCard cert={cert} />
    </div>
  );
}

// ---------- Stage 13 add-ons ----------

function BankNotice({ cert }) {
  const available = questionsForCert(cert.id).length;
  if (available >= cert.questions) return null;
  return (
    <section className="surface rounded-2xl p-4 border-warning/40 bg-warning/5">
      <div className="flex items-start gap-3">
        <span className="text-warning text-lg">⚠</span>
        <div className="flex-1 space-y-1">
          <div className="text-sm font-extrabold text-warning">
            Question bank is being built — currently {available} questions for this cert
          </div>
          <p className="text-[12px] text-muted leading-relaxed">
            The real {cert.code} exam has {cert.questions} questions. We have {available} in the bank right now,
            and we're adding more steadily. Standard / Timed / Final modes will run with whatever is available,
            scaled to the same per-domain weighting and pass score. <strong className="text-current">Review mode</strong> works
            great on smaller banks — it cycles in your wrong answers from previous attempts.
          </p>
        </div>
      </div>
    </section>
  );
}

function ModeCard({ certId, mode, icon: Icon, title, sub, accent }) {
  return (
    <Link
      to={`/exam/${certId}/run/${mode}`}
      className={cn(
        'rounded-2xl border p-4 hover:border-aws-orange/40 transition focus-ring',
        accent ? 'border-aws-orange/30 bg-aws-orange/5' : 'border-token',
      )}
    >
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
        <Icon size={11} /> {MODE_CONFIGS[mode]?.label || mode}
      </div>
      <h4 className="text-sm font-extrabold mt-1">{title}</h4>
      <p className="text-[11px] text-muted mt-1">{sub}</p>
    </Link>
  );
}

function ReadinessCard({ cert }) {
  const { state } = useExam();
  const certState = state.certs?.[cert.id];
  const signal = useMemo(() => readinessSignal(certState, cert), [certState, cert]);
  const tone =
    signal.pct >= 80 ? 'success' :
    signal.pct >= 60 ? 'warning' : 'danger';
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1 inline-flex items-center gap-1.5">
            <Zap size={11} /> Adaptive readiness
          </h3>
          <p className="text-sm text-muted leading-relaxed max-w-xl">{signal.reason}</p>
        </div>
        <div className="text-right">
          <div className={cn(
            'text-4xl font-black tabular-nums',
            tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-danger',
          )}>{signal.pct}%</div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">likely to pass today</div>
        </div>
      </div>
      {signal.weakDomains?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold text-muted uppercase tracking-widest mr-1">Weakest:</span>
          {signal.weakDomains.map((d) => (
            <Link
              key={d.id}
              to={`/exam/${cert.id}/run/section?domain=${d.id}`}
              className="chip border border-warning/40 bg-warning/10 text-warning font-bold text-[10px] hover:border-warning/70"
            >{d.label}</Link>
          ))}
        </div>
      )}
    </section>
  );
}

function TopicHeatmapCard({ cert }) {
  const { state } = useExam();
  const certState = state.certs?.[cert.id];
  const perf = useMemo(() => servicePerformance(certState, cert), [certState, cert]);
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange inline-flex items-center gap-1.5">
          <Target size={11} /> Topic-level performance
        </h3>
        <span className="text-[10px] text-muted">Click a service to drill in Topic mode.</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {perf.map((s) => {
          const tone =
            s.pct == null ? 'border-token bg-[var(--card-2)]/30 text-muted'
            : s.pct >= 80 ? 'border-success/40 bg-success/10 text-success'
            : s.pct >= 60 ? 'border-warning/40 bg-warning/10 text-warning'
            : 'border-danger/40 bg-danger/10 text-danger';
          return (
            <Link
              key={s.id}
              to={`/exam/${cert.id}/run/topic?service=${s.id}`}
              className={cn(
                'rounded-lg border p-2 text-center transition hover:border-aws-orange/60',
                tone,
              )}
            >
              <div className="text-lg leading-none">{s.icon}</div>
              <div className="text-[10px] font-extrabold mt-1 truncate">{s.label}</div>
              <div className="text-[10px] tabular-nums font-bold">
                {s.pct == null ? '—' : `${s.pct}%`}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function TaskStatementCard({ cert }) {
  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3 inline-flex items-center gap-1.5">
        <Filter size={11} /> Domain · task statements
      </h3>
      <div className="space-y-3">
        {cert.domains.map((dom) => {
          const tasks = TASK_STATEMENTS[dom.id] || [];
          return (
            <div key={dom.id} className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-sm font-extrabold">{dom.label}</div>
                <Link
                  to={`/exam/${cert.id}/run/section?domain=${dom.id}`}
                  className="chip border border-aws-orange/40 text-aws-orange font-bold text-[10px] hover:bg-aws-orange/10"
                >
                  {dom.weight}% · Drill
                </Link>
              </div>
              {tasks.length === 0 ? (
                <div className="text-[10px] text-muted">Task statements coming soon for this domain.</div>
              ) : (
                <ul className="flex flex-wrap gap-1.5">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <span className="chip border border-token bg-[var(--card)] text-[10px] font-bold">
                        {t.label}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function BookingAssistantCard({ cert }) {
  const [openId, setOpenId] = useState('vendors');
  return (
    <section className="surface rounded-2xl p-5 space-y-3">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange inline-flex items-center gap-1.5">
        <CalendarClock size={11} /> Exam booking assistant — {cert.code}
      </h3>

      <Accordion title="Where to book" id="vendors" openId={openId} setOpenId={setOpenId}>
        <div className="grid sm:grid-cols-2 gap-2">
          {BOOKING.vendors.map((v) => (
            <a
              key={v.id}
              href={v.url} target="_blank" rel="noreferrer"
              className="rounded-lg border border-token p-3 hover:border-aws-orange/40 transition focus-ring"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-extrabold">{v.label}</div>
                <ExternalLink size={11} className="text-aws-orange" />
              </div>
              <div className="text-[11px] text-muted mt-1">{v.blurb}</div>
              <div className="text-[10px] mt-1 flex gap-2">
                {v.online && <span className="chip border border-success/40 text-success font-bold text-[10px]">Online</span>}
                {v.testCenter && <span className="chip border border-token text-[10px] font-bold">Test centre</span>}
              </div>
            </a>
          ))}
        </div>
      </Accordion>

      <Accordion title="Online vs test centre" id="compare" openId={openId} setOpenId={setOpenId}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted">
                <th className="text-left py-1">Feature</th>
                <th className="text-left py-1">Online</th>
                <th className="text-left py-1">Test centre</th>
              </tr>
            </thead>
            <tbody>
              {BOOKING.onlineVsCenter.map((r) => (
                <tr key={r.feature} className="border-t border-token">
                  <td className="py-1.5 font-bold">{r.feature}</td>
                  <td className="py-1.5 text-muted">{r.online}</td>
                  <td className="py-1.5 text-muted">{r.center}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion title="ID requirements by country" id="ids" openId={openId} setOpenId={setOpenId}>
        <ul className="space-y-1">
          {BOOKING.idRequirements.map((r) => (
            <li key={r.country} className="text-xs">
              <span className="font-extrabold">{r.country}:</span>{' '}
              <span className="text-muted">{r.acceptable}</span>
            </li>
          ))}
        </ul>
      </Accordion>

      <Accordion title="Exam-day complete checklist" id="checklist" openId={openId} setOpenId={setOpenId}>
        <ul className="space-y-1 text-xs">
          {BOOKING.examDayChecklist.map((c, i) => (
            <li key={i} className="flex gap-2"><CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" /> {c}</li>
          ))}
        </ul>
      </Accordion>

      <Accordion title="What happens on the day" id="day" openId={openId} setOpenId={setOpenId}>
        <ol className="space-y-1 text-xs list-decimal list-inside">
          {BOOKING.whatHappensOnTheDay.map((c, i) => (<li key={i}>{c}</li>))}
        </ol>
      </Accordion>

      <Accordion title="Reschedule & cancellation policy" id="reschedule" openId={openId} setOpenId={setOpenId}>
        <p className="text-xs text-muted leading-relaxed">{BOOKING.rescheduleCancellation}</p>
      </Accordion>
    </section>
  );
}

function Accordion({ title, id, openId, setOpenId, children }) {
  const open = openId === id;
  return (
    <div className="rounded-lg border border-token bg-[var(--card-2)]/30">
      <button
        onClick={() => setOpenId(open ? null : id)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="text-xs font-extrabold">{title}</span>
        <ChevronRight size={12} className={cn('transition', open && 'rotate-90 text-aws-orange')} />
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ---------- pieces ----------

function CertHero({ cert, stats, levelMeta, markEarned }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-3xl p-6 sm:p-8 gradient-border relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative grid gap-5 lg:grid-cols-[1fr_180px] items-start">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl">{cert.icon}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              {cert.code}
            </span>
            <span className={cn('chip border font-bold text-[11px]', levelMeta.color)}>
              {levelMeta.label}
            </span>
            {stats?.earned && (
              <span className="chip bg-success/15 text-success border border-success/30 font-bold text-[11px]">
                <Award size={11} /> Earned
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight mt-2">{cert.name}</h1>
          <p className="text-sm text-muted leading-relaxed mt-2 max-w-3xl">{cert.description}</p>
          {cert.prereq && (
            <div className="mt-3 text-xs text-muted">
              <strong className="text-warning">Prereq:</strong> {cert.prereq}
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <HeroStat label="Questions" value={cert.questions} />
            <HeroStat label="Time" value={`${cert.minutes} min`} />
            <HeroStat label="Pass" value={`${cert.passScore}/1000`} />
            <HeroStat label="Best" value={stats?.bestScore ? `${stats.bestScore}` : '—'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => markEarned(cert.id, !stats?.earned)}
              className={cn('btn', stats?.earned ? 'btn-ghost' : 'btn-ghost')}
            >
              <Award size={14} />
              {stats?.earned ? 'Unmark earned' : 'Mark as earned'}
            </button>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <ProgressRing percent={stats?.readiness || 0} size={150} stroke={12} accent="rainbow">
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums text-gradient">{stats?.readiness || 0}</div>
              <div className="text-[9px] uppercase tracking-widest text-muted font-bold mt-1">Readiness</div>
            </div>
          </ProgressRing>
          <div className="mt-3 text-[11px] font-bold text-muted text-center">
            Predicted pass: {stats?.predicted || 0}%
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className="text-base font-extrabold tracking-tight mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function DomainPieCard({ cert }) {
  const data = cert.domains.map((d) => ({ name: d.label, value: d.weight }));
  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
        Domain weighting
      </h3>
      <div className="h-56">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }}
              formatter={(v) => `${v}%`}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
        {cert.domains.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2 text-[11px]">
            <span className="w-2 h-2 rounded" style={{ background: DOMAIN_COLORS[i % DOMAIN_COLORS.length] }} />
            <span className="flex-1 truncate font-semibold">{d.label}</span>
            <span className="tabular-nums text-muted font-bold">{d.weight}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScoreHistoryCard({ cert, certId }) {
  const { state } = useExam();
  const attempts = state.certs?.[certId]?.attempts || [];
  const standardAttempts = attempts.filter((a) => a.mode === 'standard');
  if (standardAttempts.length === 0) {
    return (
      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
          Score history
        </h3>
        <div className="h-56 grid place-items-center text-sm text-muted">
          No full-exam attempts yet. Take a Standard mock to start tracking.
        </div>
      </section>
    );
  }

  const data = standardAttempts.map((a, i) => ({
    n: `#${i + 1}`,
    score: a.scaledScore,
  }));

  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
        Score history
      </h3>
      <div className="h-56">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="n" tick={{ fill: '#94A3B8', fontSize: 11 }} />
            <YAxis domain={[0, 1000]} tick={{ fill: '#94A3B8', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="score" stroke="#FF9900" strokeWidth={3} dot={{ r: 4 }} />
            {/* Pass score reference */}
            <Line type="monotone" dataKey={() => cert.passScore} stroke="#00C853" strokeDasharray="4 4" dot={false} name="Pass" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function DomainPerformanceCard({ cert, stats }) {
  return (
    <section className="surface rounded-2xl p-5 sm:p-6">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
        Domain mastery
      </h3>
      <ul className="space-y-2.5">
        {cert.domains.map((d) => {
          const pct = stats?.domainMastery?.[d.id] || 0;
          return (
            <li key={d.id} className="flex items-center gap-3 text-sm">
              <span className="flex-1 font-semibold truncate">{d.label}</span>
              <div className="w-48 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                <div className={cn('h-full rounded-full transition-all',
                  pct >= passPercent(cert) ? 'bg-success' : pct >= passPercent(cert) - 15 ? 'bg-warning' : 'bg-danger',
                )} style={{ width: `${pct}%` }} />
              </div>
              <span className="w-12 text-right font-bold tabular-nums text-xs">{pct}%</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 text-[11px] text-muted">
        Target ≥ {passPercent(cert)}% per domain to keep the cumulative score above pass.
      </div>
    </section>
  );
}

function ResourcesCard({ cert }) {
  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
        Study resources
      </h3>
      <div className="space-y-4">
        <ResourceBlock icon={GraduationCap} title="Courses">
          {cert.resources.courses.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <Star size={11} className="text-aws-orange fill-aws-orange flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold">{c.name}</span>
              <span className="text-[11px] font-bold text-muted tabular-nums">{c.rating}</span>
            </li>
          ))}
        </ResourceBlock>
        <ResourceBlock icon={Clipboard} title="Practice exam platforms">
          {cert.resources.practice.map((p, i) => (
            <li key={i} className="text-sm font-semibold flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ResourceBlock>
        <ResourceBlock icon={FileText} title="Essential whitepapers">
          {cert.resources.whitepapers.map((wpId) => {
            const wp = WHITEPAPERS.find((w) => w.id === wpId);
            if (!wp) return null;
            return (
              <li key={wpId}>
                <Link to="/learning" className="text-sm font-semibold inline-flex items-center gap-1.5 hover:text-aws-orange">
                  <Library size={11} /> {wp.title}
                </Link>
              </li>
            );
          })}
        </ResourceBlock>
        <ResourceBlock icon={Youtube} title="YouTube">
          {cert.resources.youtube.map((y, i) => (
            <li key={i} className="text-sm font-semibold flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
              {y}
            </li>
          ))}
        </ResourceBlock>
        {cert.resources.docs?.length > 0 && (
          <ResourceBlock icon={ExternalLink} title="Key AWS docs">
            {cert.resources.docs.map((d, i) => (
              <li key={i}>
                <a href={d} target="_blank" rel="noreferrer"
                   className="text-sm font-semibold inline-flex items-center gap-1.5 text-aws-orange hover:underline truncate">
                  <ExternalLink size={11} /> {d}
                </a>
              </li>
            ))}
          </ResourceBlock>
        )}
      </div>
    </section>
  );
}

function ResourceBlock({ icon: Icon, title, children }) {
  return (
    <div>
      <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5 inline-flex items-center gap-1.5">
        <Icon size={11} className="text-aws-orange" /> {title}
      </h4>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function BookingCard({ cert, stats, setVoucher }) {
  const toast = useToast();
  const [code, setCode] = useState(stats?.voucher?.code || '');
  const [expiry, setExpiry] = useState(stats?.voucher?.expiry || '');

  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
        Book your exam
      </h3>
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <a href="https://www.aws.training/certification" target="_blank" rel="noreferrer"
             className="font-bold text-aws-orange hover:underline inline-flex items-center gap-1">
            <ExternalLink size={11} /> aws.training (book via Pearson VUE / PSI)
          </a>
        </li>
        <li className="flex items-start gap-2 text-xs text-muted leading-relaxed">
          <MonitorSmartphone size={12} className="text-aws-orange mt-0.5 flex-shrink-0" />
          Online proctored exam: government-issued ID, webcam, quiet room with no second monitor.
        </li>
        <li className="flex items-start gap-2 text-xs text-muted leading-relaxed">
          <CheckCircle2 size={12} className="text-aws-orange mt-0.5 flex-shrink-0" />
          Test-center: arrive 30 min early, bring 2 IDs, no personal items in the room.
        </li>
      </ul>

      <div className="mt-5">
        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 inline-flex items-center gap-1.5">
          <Ticket size={11} className="text-aws-orange" /> Voucher / discount tracker
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <input
            value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="Voucher code"
            className="col-span-2 bg-[var(--card-2)] border border-token rounded-lg px-2.5 py-1.5 text-xs font-semibold focus-ring focus:border-aws-orange"
          />
          <input
            type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
            className="bg-[var(--card-2)] border border-token rounded-lg px-2 py-1.5 text-xs font-semibold focus-ring focus:border-aws-orange"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              setVoucher(cert.id, { code, expiry, source: 'manual', addedAt: new Date().toISOString() });
              toast.success('Voucher saved');
            }}
            className="btn btn-primary !text-xs !py-2 flex-1"
            disabled={!code}
          >Save</button>
          {stats?.voucher && (
            <button
              onClick={() => { setVoucher(cert.id, null); setCode(''); setExpiry(''); toast.info('Voucher cleared'); }}
              className="btn btn-ghost !text-xs !py-2"
            ><Trash2 size={12} /></button>
          )}
        </div>
      </div>
    </section>
  );
}

function StudyPlanCard({ cert, stats, generateStudyPlan, clearStudyPlan, toast }) {
  const [examDate, setExamDate] = useState(stats?.studyPlan?.examDate?.slice(0, 10) || defaultExamDate());

  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3 inline-flex items-center gap-1.5">
        <CalendarClock size={11} /> Study plan generator
      </h3>
      {!stats?.studyPlan ? (
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Target exam date</span>
            <input
              type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="mt-1.5 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange"
            />
          </label>
          <button
            onClick={() => {
              generateStudyPlan(cert.id, examDate);
              toast.success('Study plan generated');
            }}
            className="btn btn-primary"
          >Generate plan</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm">
              <span className="font-extrabold">{stats.studyPlan.tasks.length} days</span>
              <span className="text-muted"> · target {formatDate(stats.studyPlan.examDate)}</span>
            </div>
            <button onClick={() => { clearStudyPlan(cert.id); toast.info('Study plan cleared'); }}
                    className="btn btn-ghost !text-xs !py-1.5">
              <Trash2 size={11} /> Reset plan
            </button>
          </div>
          <ol className="space-y-1 max-h-72 overflow-y-auto rounded-xl border border-token bg-[var(--card-2)]/30 p-3">
            {stats.studyPlan.tasks.map((t, i) => (
              <li key={i} className="flex items-center gap-3 text-xs py-1">
                <span className="text-muted font-bold tabular-nums w-24">{t.date}</span>
                <span className="flex-1 font-semibold">{t.item}</span>
                {t.domainLabel && (
                  <span className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold">
                    {t.domainLabel}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function defaultExamDate() {
  const d = new Date();
  d.setDate(d.getDate() + 60);
  return d.toISOString().slice(0, 10);
}
