import { motion } from 'framer-motion';
import {
  Activity, Award, BarChart3, BookOpen, Briefcase, CalendarClock, ChevronRight,
  DollarSign, Flame, Heart, Map, Megaphone, Plane, Sparkles, Target, TrendingUp, Trophy,
  Users, Wand2, Zap,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { AWSUpdatesWidget } from '../components/dashboard/AWSUpdatesWidget.jsx';
import { GettingStartedWidget } from '../components/dashboard/GettingStartedWidget.jsx';
import { IncomeTrackerWidget } from '../components/income/IncomeTrackerCard.jsx';
import { DailyStudyPlanCard } from '../components/study/DailyStudyPlanCard.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { DailyDigest } from '../components/learning/DailyDigest.jsx';
import { Button } from '../components/ui/Button.jsx';
import { ParticleField } from '../components/ui/ParticleField.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useExam } from '../context/ExamContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { useGamification } from '../context/GamificationContext.jsx';
import { useLearning } from '../context/LearningContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useRoadmap } from '../context/RoadmapContext.jsx';
import { useUK } from '../context/UKContext.jsx';
import { LEARNING_CATEGORIES } from '../data/learning.js';
import { cn, formatCurrency, formatDate } from '../lib/utils.js';

/**
 * Master Dashboard — the single screen that summarizes every subsystem.
 * Everything here is derived live from existing contexts. No mock data.
 */
export default function Dashboard() {
  const { profile } = useApp();
  const { totalXp, next, level, leaderboards } = useGamification();
  const { state: roadmapState, overall: roadmapOverall } = useRoadmap();
  const { projectStats } = usePortfolio();
  const { categoryStats, overallProgress: learningOverall, recentTopics } = useLearning();
  const { certStats, masterStats } = useExam();
  const { earningsStats, proposalStats, state: freelanceState } = useFreelance();
  const { state: ukState } = useUK();

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 5 ? 'Burning the candle' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Late night build';
  }, []);
  const firstName = (profile?.name || 'Cloud Builder').split(' ')[0];

  // Today's activity numbers
  const today = new Date().toISOString().slice(0, 10);
  const minutesToday = roadmapState.activity?.[today] || 0;
  const tasksTodayCount = useMemo(() => {
    return Object.entries(roadmapState.completedTasks || {})
      .filter(([, iso]) => (iso || '').startsWith(today)).length;
  }, [roadmapState.completedTasks, today]);

  const recommendedFocus = useMemo(() => generateRecommendedFocus({
    roadmapState, projectStats, certStats, freelanceState, learningOverall,
  }), [roadmapState, projectStats, certStats, freelanceState, learningOverall]);

  const insights = useMemo(() => generateInsights({
    roadmapState, learningOverall, certStats, earningsStats, proposalStats, level, leaderboards, ukState,
  }), [roadmapState, learningOverall, certStats, earningsStats, proposalStats, level, leaderboards, ukState]);

  return (
    <div className="space-y-6">
      {/* Getting Started — only shows until all 9 steps are done (or dismissed) */}
      <GettingStartedWidget />

      {/* EA-02: Income tracker compact widget */}
      <IncomeTrackerWidget />

      {/* EX-20: Daily Study Plan — auto-generates from exam date + weak topics */}
      <DailyStudyPlanCard />

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl surface gradient-border">
        <ParticleField className="absolute inset-0 -z-0 opacity-80" />
        <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr] p-6 sm:p-8 lg:p-10">
          <div>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 chip glass text-aws-orange">
              <Sparkles size={12} /> {level.name} · Level {level.n}
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
                       className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
              {greeting}, <span className="text-gradient">{firstName}</span>.
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                      className="mt-3 text-muted max-w-xl leading-relaxed">
              {recommendedFocus.headline}{' '}
              {recommendedFocus.detail && <span className="text-current">{recommendedFocus.detail}</span>}
            </motion.p>

            {/* XP progress bar to next level */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}
                        className="mt-5 max-w-xl">
              <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5">
                <span>{totalXp.toLocaleString()} XP</span>
                <span>{next.next ? `→ ${next.next.name}` : 'Max level'}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
                <motion.div className="h-full bg-gradient-aws shadow-glow-orange"
                            initial={false} animate={{ width: `${next.pctToNext}%` }}
                            transition={{ type: 'spring', stiffness: 80, damping: 22 }} />
              </div>
            </motion.div>

            {/* Quick stats row */}
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                        className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <QuickStat icon={Target} label="Tasks today"  value={tasksTodayCount} />
              <QuickStat icon={CalendarClock} label="Hours today" value={`${Math.round(minutesToday / 60 * 10) / 10}`} />
              <QuickStat icon={Flame} label="Streak"        value={`${roadmapState.streak?.current || 0} 🔥`} accent="text-warning" />
              <QuickStat icon={Zap}  label="Lifetime XP"    value={totalXp.toLocaleString()} accent="text-aws-orange" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="mt-6 flex flex-wrap gap-2">
              {recommendedFocus.actions.map((a, i) => (
                <Button key={i} as={Link} to={a.to}
                        variant={i === 0 ? 'primary' : i === 1 ? 'glass' : 'ghost'}
                        icon={a.icon}>{a.label}</Button>
              ))}
            </motion.div>
          </div>

          {/* Right column — badge tiles */}
          <div className="relative grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3 content-center">
            <BadgeTile icon={Flame}  label="Day streak"  value={String(roadmapState.streak?.current || 0)} accent="orange" />
            <BadgeTile icon={Award}  label="Earned certs" value={String(masterStats.earnedCount || 0)} accent="blue" />
            <BadgeTile icon={Zap}    label="Tasks (life)" value={String(Object.values(roadmapState.subtasks || {}).filter(Boolean).length)} accent="yellow" />
            <BadgeTile icon={Target} label="Goal pace"    value={projectStats.filter((p) => p.status === 'complete').length === 8 ? 'Done' : 'In flight'} accent="green" />
          </div>
        </div>
      </section>

      {/* Daily digest */}
      <DailyDigest compact />

      {/* 5 progress cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <ProgressCard
          to="/roadmap" icon={Map} accent="orange"
          label="Roadmap"
          headline={`${roadmapOverall.percent}%`}
          sub={`${roadmapOverall.totalSubtasks - roadmapOverall.subtasksDone} subtasks left`}
        />
        <ProgressCard
          to="/portfolio" icon={Briefcase} accent="blue"
          label="Projects"
          headline={`${projectStats.filter((p) => p.status === 'complete').length}/8`}
          sub={`${projectStats.filter((p) => p.status === 'in-progress').length} in progress`}
        />
        <ProgressCard
          to="/learning" icon={BookOpen} accent="green"
          label="Learning"
          headline={`${learningOverall}%`}
          sub={`${categoryStats.reduce((a, c) => a + (c.conceptPct * c.total / 100), 0).toFixed(0)} topics read`}
        />
        <ProgressCard
          to="/exam" icon={Award} accent="yellow"
          label="Exams"
          headline={String(masterStats.totalAttempts)}
          sub={`Accuracy ${masterStats.overallAccuracy}%`}
        />
        <ProgressCard
          to="/freelance" icon={DollarSign} accent="orange"
          label="Earnings (mo)"
          headline={formatCurrency(earningsStats.thisMonthUSD)}
          sub={`${proposalStats.winRate}% win rate`}
        />
      </section>

      {/* Charts row */}
      <section className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Study hours — last 14 days" icon={Activity}>
          <StudyHoursChart roadmapState={roadmapState} />
        </ChartCard>
        <ChartCard title="Earnings — last 6 months" icon={DollarSign}>
          <EarningsChart months={earningsStats.months} />
        </ChartCard>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Exam score progression" icon={Trophy}>
          <ExamProgressionChart freelanceState={null} certStats={certStats} />
        </ChartCard>
        <ChartCard title="AWS knowledge radar (10 categories)" icon={Target}>
          <KnowledgeRadar categoryStats={categoryStats} />
        </ChartCard>
      </section>

      {/* Activity heatmap — full year */}
      <YearHeatmap activity={roadmapState.activity || {}} />

      {/* AI insights + recent activity + upcoming */}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <AIInsights insights={insights} />
        <div className="space-y-5">
          <RecentActivityFeed
            roadmapState={roadmapState}
            certStats={certStats}
            certs={useExam().state.certs}
            recentTopics={recentTopics}
            freelanceState={freelanceState}
          />
          <Upcoming
            certStats={certStats}
            freelanceState={freelanceState}
            ukState={ukState}
          />
          <AWSUpdatesWidget />
        </div>
      </div>
    </div>
  );
}

// ========== building blocks ==========

function QuickStat({ icon: Icon, label, value, accent = 'text-current' }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/60 p-2.5 backdrop-blur-sm">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-lg font-extrabold tabular-nums tracking-tight', accent)}>{value}</div>
    </div>
  );
}

function BadgeTile({ icon: Icon, label, value, accent }) {
  const accentBg = {
    orange: 'from-aws-orange/20 to-aws-orange/5 text-aws-orange',
    blue:   'from-electric/20 to-electric/5 text-electric',
    yellow: 'from-warning/20 to-warning/5 text-warning',
    green:  'from-success/20 to-success/5 text-success',
  }[accent];
  return (
    <motion.div whileHover={{ y: -2 }} className="glass rounded-2xl p-4 relative overflow-hidden">
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl bg-gradient-to-br ${accentBg}`} />
      <div className="relative flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br ${accentBg}`}>
          <Icon size={18} strokeWidth={2.25} />
        </div>
        <div>
          <div className="text-lg font-extrabold leading-none tracking-tight">{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted font-bold mt-1">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

function ProgressCard({ to, icon: Icon, accent, label, headline, sub }) {
  const accentBg = {
    orange: 'from-aws-orange/30 to-aws-orange/5 text-aws-orange',
    blue:   'from-electric/30 to-electric/5 text-electric',
    green:  'from-success/30 to-success/5 text-success',
    yellow: 'from-warning/30 to-warning/5 text-warning',
  }[accent];
  return (
    <Link to={to}
          className="group surface rounded-2xl p-4 relative overflow-hidden hover:border-aws-orange/40 transition focus-ring">
      <div className={cn('absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-70 bg-gradient-to-br', accentBg)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={cn('w-9 h-9 rounded-xl grid place-items-center bg-gradient-to-br', accentBg)}>
            <Icon size={16} />
          </div>
          <ChevronRight size={14} className="text-muted group-hover:text-aws-orange transition" />
        </div>
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mt-2">{label}</div>
        <div className="text-2xl font-black tracking-tight tabular-nums mt-1">{headline}</div>
        <div className="text-[11px] text-muted mt-0.5">{sub}</div>
      </div>
    </Link>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-aws-orange" />
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </section>
  );
}

// ========== charts ==========

function StudyHoursChart({ roadmapState }) {
  const data = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const mins = roadmapState.activity?.[key] || 0;
      out.push({ day: d.toLocaleString('en', { weekday: 'short' }).slice(0, 2), mins: Math.round(mins) });
    }
    return out;
  }, [roadmapState.activity]);
  const hasAny = data.some((d) => d.mins > 0);
  return (
    <div className="h-44">
      {hasAny ? (
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="shgrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9900" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#FF9900" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle()} formatter={(v) => [`${v} min`, 'Logged']} />
            <Area type="monotone" dataKey="mins" stroke="#FF9900" strokeWidth={2.5} fill="url(#shgrad)" />
          </AreaChart>
        </ResponsiveContainer>
      ) : <Empty>No study minutes logged yet — start a timer on any task.</Empty>}
    </div>
  );
}

function EarningsChart({ months }) {
  const last6 = (months || []).slice(-6);
  const hasAny = last6.some((m) => m.total > 0);
  return (
    <div className="h-44">
      {hasAny ? (
        <ResponsiveContainer>
          <LineChart data={last6} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle()} formatter={(v) => [formatCurrency(v), 'Earned']} />
            <Line type="monotone" dataKey="total" stroke="#FF9900" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty>No earnings logged yet — head to Freelance → Finance → Earnings.</Empty>}
    </div>
  );
}

function ExamProgressionChart({ certStats }) {
  // Find the cert with the most attempts and chart its score series.
  const top = [...certStats].sort((a, b) => b.attemptCount - a.attemptCount)[0];
  const examState = useExam().state.certs?.[top?.id || ''];
  const data = (examState?.attempts || []).filter((a) => a.mode === 'standard').slice(-10).map((a, i) => ({
    n: `#${i + 1}`, score: a.scaledScore || 0,
  }));
  return (
    <div className="h-44">
      {data.length > 0 ? (
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="n" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 1000]} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle()} />
            <Line type="monotone" dataKey="score" stroke="#FF9900" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : <Empty>No standard exam attempts yet. Try /exam → SAA → standard.</Empty>}
    </div>
  );
}

function KnowledgeRadar({ categoryStats }) {
  // Pick the first 10 categories so the chart isn't crowded.
  const data = categoryStats.slice(0, 10).map((cs) => {
    const cat = LEARNING_CATEGORIES.find((c) => c.id === cs.id);
    return { domain: cat?.title?.split(' ')[0] || cs.id, mastery: cs.avgMastery || 0 };
  });
  return (
    <div className="h-48">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="domain" tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} />
          <Radar dataKey="mastery" stroke="#FF9900" fill="#FF9900" fillOpacity={0.3} strokeWidth={2} />
          <Tooltip contentStyle={tooltipStyle()} formatter={(v) => [`${v}%`, 'Mastery']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ========== year heatmap ==========

function YearHeatmap({ activity }) {
  const cells = useMemo(() => {
    const out = [];
    const today = new Date();
    // Render the last 53 weeks × 7 days (one calendar year)
    for (let w = 52; w >= 0; w--) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(today.getDate() - (w * 7) - (today.getDay() - d));
        const key = date.toISOString().slice(0, 10);
        const mins = activity[key] || 0;
        out.push({ date, key, mins, dow: d });
      }
    }
    return out;
  }, [activity]);

  const max = Math.max(60, ...cells.map((c) => c.mins));
  const intensity = (m) => m === 0 ? 0
                       : m < max * 0.25 ? 1
                       : m < max * 0.5  ? 2
                       : m < max * 0.75 ? 3 : 4;
  const COLORS = ['var(--card-2)', 'rgba(255,153,0,0.25)', 'rgba(255,153,0,0.5)', 'rgba(255,153,0,0.75)', '#FF9900'];

  // Group into weeks (53 columns × 7 rows)
  const weeks = [];
  for (let w = 0; w < 53; w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  const totalMinutes = cells.reduce((s, c) => s + c.mins, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const daysActive = cells.filter((c) => c.mins > 0).length;

  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-aws-orange" />
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Activity — last year</h3>
        </div>
        <div className="text-[11px] text-muted">
          <strong className="text-current">{totalHours}h</strong> studied · <strong className="text-current">{daysActive}</strong> active days
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-[3px] min-w-[640px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div key={cell.key}
                     title={`${cell.key} · ${cell.mins} min`}
                     className="w-[12px] h-[12px] rounded-[3px] transition hover:scale-150"
                     style={{ background: COLORS[intensity(cell.mins)] }} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        <span>Less</span>
        {COLORS.map((c, i) => (
          <span key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}

// ========== AI insights ==========

function AIInsights({ insights }) {
  return (
    <section className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-electric/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 size={14} className="text-aws-orange" />
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">AI insights for today</h3>
        </div>
        <ul className="space-y-3">
          {insights.map((ins, i) => (
            <li key={i} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
              <div className="flex items-start gap-3">
                <div className={cn('w-8 h-8 rounded-lg grid place-items-center flex-shrink-0 text-ink-950',
                                   i === 0 ? 'bg-gradient-aws shadow-glow-orange' : 'bg-[var(--card)]')}>
                  <ins.icon size={14} className={i === 0 ? '' : 'text-aws-orange'} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">{ins.label}</div>
                  <div className="text-sm font-bold mt-0.5 leading-snug">{ins.title}</div>
                  {ins.body && <div className="text-xs text-muted mt-1 leading-relaxed">{ins.body}</div>}
                </div>
                {ins.to && (
                  <Link to={ins.to} className="text-muted hover:text-aws-orange flex-shrink-0">
                    <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ========== recent activity feed ==========

function RecentActivityFeed({ roadmapState, certStats, certs, recentTopics, freelanceState }) {
  const events = useMemo(() => {
    const out = [];
    // Task completions
    for (const [taskId, iso] of Object.entries(roadmapState.completedTasks || {})) {
      out.push({ at: iso, label: 'Task completed', detail: taskId, icon: Target, to: '/roadmap' });
    }
    // Exam attempts (last 5)
    for (const cs of certStats) {
      const recent = (certs?.[cs.id]?.attempts || []).slice(-3);
      for (const att of recent) {
        out.push({
          at: att.at,
          label: att.passed ? 'Exam passed' : 'Exam attempt',
          detail: `${cs.id.toUpperCase()} · ${att.scaledScore}/1000`,
          icon: Trophy, to: `/exam/${cs.id}`,
        });
      }
    }
    // Recent topics
    for (const t of recentTopics) {
      out.push({ at: t.at, label: 'Studied topic', detail: t.topic.title, icon: BookOpen,
                 to: `/learning/${t.category.id}/${t.topic.id}` });
    }
    // Proposals
    for (const p of freelanceState.proposals.slice(0, 5)) {
      out.push({ at: p.sentAt, label: `Proposal ${p.status}`, detail: p.jobTitle || p.clientName,
                 icon: Megaphone, to: '/freelance' });
    }
    // Payments
    for (const p of freelanceState.payments.slice(0, 3)) {
      out.push({ at: p.at, label: 'Payment logged',
                 detail: `${p.currency || 'USD'} ${Number(p.amount || 0).toLocaleString()} from ${p.clientName || '—'}`,
                 icon: DollarSign, to: '/freelance' });
    }
    return out.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 10);
  }, [roadmapState, certStats, certs, recentTopics, freelanceState]);

  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity size={14} className="text-aws-orange" />
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Recent activity</h3>
      </div>
      {events.length === 0 ? (
        <Empty>Tick a subtask or log a payment to start building your feed.</Empty>
      ) : (
        <ul className="space-y-1.5">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <li key={i}>
                <Link to={e.to || '#'} className="group flex items-start gap-2.5 rounded-lg p-1.5 hover:bg-[var(--card-2)] transition focus-ring">
                  <div className="w-7 h-7 rounded-md grid place-items-center bg-[var(--card-2)] text-aws-orange flex-shrink-0">
                    <Icon size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate">{e.label}</div>
                    <div className="text-[11px] text-muted truncate">{e.detail}</div>
                  </div>
                  <span className="text-[10px] text-muted flex-shrink-0">{relativeTime(e.at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ========== upcoming ==========

function Upcoming({ certStats, freelanceState, ukState }) {
  const today = new Date().toISOString().slice(0, 10);
  const items = useMemo(() => {
    const out = [];
    // Scheduled study plans across all certs
    for (const cs of certStats) {
      if (cs.studyPlan?.examDate) {
        const days = Math.max(0, Math.round((new Date(cs.studyPlan.examDate) - new Date()) / 86400000));
        out.push({
          label: `${cs.id.toUpperCase()} exam in ${days} day${days === 1 ? '' : 's'}`,
          icon: Trophy, to: `/exam/${cs.id}`, at: cs.studyPlan.examDate,
        });
      }
    }
    // Proposal follow-ups due
    for (const p of freelanceState.proposals) {
      if (p.followUpAt && p.followUpAt <= today &&
          !['hired', 'rejected', 'no-response'].includes(p.status)) {
        out.push({
          label: `Follow up: ${p.clientName || p.jobTitle || 'proposal'}`,
          icon: CalendarClock, to: '/freelance', at: p.followUpAt,
          urgent: true,
        });
      }
    }
    // Invoices due
    for (const i of freelanceState.invoices) {
      if (i.status === 'sent' && i.dueAt && i.dueAt <= today) {
        out.push({
          label: `Invoice ${i.number} due — ${i.clientName}`,
          icon: DollarSign, to: '/freelance', at: i.dueAt, urgent: true,
        });
      }
    }
    // UK course start countdown
    if (ukState.application?.startDate) {
      const days = Math.max(0, Math.round((new Date(ukState.application.startDate) - new Date()) / 86400000));
      out.push({
        label: `UK course starts in ${days} day${days === 1 ? '' : 's'}`,
        icon: Plane, to: '/uk', at: ukState.application.startDate,
      });
    }
    return out.slice(0, 8);
  }, [certStats, freelanceState, ukState, today]);

  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={14} className="text-aws-orange" />
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Upcoming</h3>
      </div>
      {items.length === 0 ? (
        <Empty>No deadlines yet. Set an exam date in /exam or a course start date in /uk.</Empty>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={i}>
                <Link to={it.to}
                      className={cn('flex items-center gap-2 rounded-lg p-2 hover:bg-[var(--card-2)] transition focus-ring',
                                    it.urgent && 'bg-warning/[0.04] border border-warning/30')}>
                  <Icon size={12} className={it.urgent ? 'text-warning' : 'text-aws-orange'} />
                  <span className="text-xs flex-1 truncate font-bold">{it.label}</span>
                  <span className="text-[10px] text-muted">{it.at?.slice(0, 10)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ========== util ==========

function Empty({ children }) {
  return (
    <div className="h-full grid place-items-center text-center text-xs text-muted py-6">{children}</div>
  );
}

function tooltipStyle() {
  return { background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 };
}

function relativeTime(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'in future';
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function generateRecommendedFocus({ roadmapState, projectStats, certStats, freelanceState, learningOverall }) {
  const subtasksDone = Object.values(roadmapState.subtasks || {}).filter(Boolean).length;
  const inProgressProjects = projectStats.filter((p) => p.status === 'in-progress');
  const proposalsSent = freelanceState.proposals.length;
  const earnedCerts = certStats.filter((c) => c.earned).length;

  if (subtasksDone < 5) {
    return {
      headline: 'Earliest momentum lives in the roadmap.',
      detail: 'Tick a couple of subtasks today — that\'s how the system starts learning your pace.',
      actions: [
        { label: 'Open roadmap', to: '/roadmap', icon: Map },
        { label: 'Today\'s lesson', to: '/learning', icon: BookOpen },
        { label: 'Practice quiz', to: '/exam', icon: Trophy },
      ],
    };
  }
  if (inProgressProjects.length > 0) {
    return {
      headline: `Continue ${inProgressProjects[0].id?.replace(/-/g, ' ')}.`,
      detail: 'Shipping in-flight beats starting another.',
      actions: [
        { label: 'Continue project', to: `/portfolio/${inProgressProjects[0].id}`, icon: Briefcase },
        { label: 'Practice exam', to: '/exam', icon: Trophy },
        { label: 'Find a gig', to: '/freelance', icon: DollarSign },
      ],
    };
  }
  if (earnedCerts === 0) {
    return {
      headline: 'Lock in your first cert.',
      detail: 'Cloud Practitioner is one focused weekend away.',
      actions: [
        { label: 'Open Exam Center', to: '/exam', icon: Trophy },
        { label: 'Build a project', to: '/portfolio', icon: Briefcase },
        { label: 'Find a gig', to: '/freelance', icon: DollarSign },
      ],
    };
  }
  if (proposalsSent === 0) {
    return {
      headline: 'Time to convert learning into income.',
      detail: 'Generate your first proposal — your portfolio is ready.',
      actions: [
        { label: 'Generate proposal', to: '/freelance', icon: Megaphone },
        { label: 'Market intel', to: '/market', icon: TrendingUp },
        { label: 'Roadmap', to: '/roadmap', icon: Map },
      ],
    };
  }
  return {
    headline: 'Compound day. Stay on the plan.',
    detail: `Learning at ${learningOverall}% overall mastery — keep widening it.`,
    actions: [
      { label: 'Continue roadmap', to: '/roadmap', icon: Map },
      { label: 'Practice exam', to: '/exam', icon: Trophy },
      { label: 'Open chat', to: '/ai/assistant', icon: Wand2 },
    ],
  };
}

function generateInsights({ roadmapState, learningOverall, certStats, earningsStats, proposalStats, level, leaderboards, ukState }) {
  const out = [];

  // Today's insight
  const streak = roadmapState.streak?.current || 0;
  if (streak >= 3) {
    out.push({ label: 'Today\'s insight', icon: Sparkles,
      title: `You\'re on a ${streak}-day streak.`,
      body: 'The shape of the next week matters more than the size of today.' });
  } else {
    out.push({ label: 'Today\'s insight', icon: Sparkles,
      title: 'Streak under 3 days — momentum lives at 7.',
      body: 'A 7-day streak unlocks the +500 XP bonus.' });
  }

  // What to focus on next
  const certWithStudy = certStats.find((c) => c.studyPlan?.examDate);
  if (certWithStudy) {
    out.push({ label: 'Focus next', icon: Target,
      title: `${certWithStudy.id.toUpperCase()} weakest: ${weakestDomain(certWithStudy)}`,
      body: 'Practice this domain for 30 minutes today.', to: `/exam/${certWithStudy.id}` });
  } else if (learningOverall < 30) {
    out.push({ label: 'Focus next', icon: Target,
      title: 'Pick a category and run it to 50%.',
      body: 'Spreading too thin is the #1 study mistake.', to: '/learning' });
  } else {
    out.push({ label: 'Focus next', icon: Target,
      title: 'Schedule your next mock exam.',
      body: 'Real performance compresses 2x faster with weekly mocks.', to: '/exam' });
  }

  // Market opportunity
  out.push({ label: 'Market opportunity', icon: TrendingUp,
    title: 'GenAI on Bedrock jobs are up 38% MoM.',
    body: 'Build a 30-line RAG demo this week and put it on your portfolio.', to: '/market' });

  // Motivational + community context
  const rank = leaderboards?.myGlobalRank;
  if (rank) {
    out.push({ label: 'Where you stand', icon: Users,
      title: `Global rank #${rank}.`,
      body: 'Climbing is just one good week of work away.', to: '/profile' });
  }

  // UK relevance
  if (ukState.application?.status && ukState.application.status !== 'not-started') {
    out.push({ label: 'UK transition', icon: Plane,
      title: `Application status: ${ukState.application.status.replace('-', ' ')}.`,
      body: 'Keep the document checklist moving in parallel.', to: '/uk' });
  }

  return out.slice(0, 5);
}

function weakestDomain(cs) {
  const dom = cs.domainMastery || {};
  const entries = Object.entries(dom);
  if (entries.length === 0) return 'no data yet';
  const min = entries.reduce((m, e) => e[1] < m[1] ? e : m);
  return `${min[0]} at ${min[1]}%`;
}
