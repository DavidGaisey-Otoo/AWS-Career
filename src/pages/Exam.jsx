import { motion } from 'framer-motion';
import {
  Award, BarChart3, Brain, Clock, Filter, Flame, GraduationCap, ListChecks,
  Sparkles, Target, TrendingUp, Trophy,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { useExam } from '../context/ExamContext.jsx';
import { CERTS, LEVEL_META, LEVEL_ORDER } from '../data/certs.js';
import { cn, formatDate } from '../lib/utils.js';

export default function Exam() {
  const { certStats, masterStats } = useExam();
  const [levelFilter, setLevelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');

  const filtered = useMemo(() => {
    let list = CERTS.map((c) => ({ cert: c, stats: certStats.find((s) => s.id === c.id) }));
    if (levelFilter !== 'all') list = list.filter((x) => x.cert.level === levelFilter);
    if (sortBy === 'difficulty') {
      list.sort((a, b) => LEVEL_META[a.cert.level].tier - LEVEL_META[b.cert.level].tier);
    } else if (sortBy === 'progress') {
      list.sort((a, b) => b.stats.readiness - a.stats.readiness);
    } else {
      // recommended: earned at end, then by tier asc, then by readiness desc
      list.sort((a, b) => {
        if (a.stats.earned !== b.stats.earned) return a.stats.earned ? 1 : -1;
        const t = LEVEL_META[a.cert.level].tier - LEVEL_META[b.cert.level].tier;
        if (t !== 0) return t;
        return b.stats.readiness - a.stats.readiness;
      });
    }
    return list;
  }, [certStats, levelFilter, sortBy]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Center"
        title="Pass on the first try"
        subtitle="13 AWS certifications · Standard mocks · Category practice · Learning mode. Built to feel exactly like the real exam."
        icon={GraduationCap}
      />

      {/* Master dashboard */}
      <MasterDashboard ms={masterStats} />

      {/* Recommended next */}
      {masterStats.recommended && (
        <motion.section
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="surface rounded-2xl p-5 flex flex-wrap items-center gap-4 border-l-4 border-l-aws-orange"
        >
          <div className="text-3xl">{masterStats.recommended.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              <Sparkles size={11} className="inline -mt-0.5 mr-1" /> Recommended next
            </div>
            <h3 className="text-lg font-extrabold tracking-tight">{masterStats.recommended.name}</h3>
            <p className="text-xs text-muted mt-0.5">{masterStats.recommended.tagline}</p>
          </div>
          <Link to={`/exam/${masterStats.recommended.id}`} className="btn btn-primary !text-xs">
            Open
          </Link>
        </motion.section>
      )}

      {/* Filters */}
      <div className="surface rounded-2xl p-3 sm:p-4 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-aws-orange" />
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted mr-2">Level</div>
        {['all', ...LEVEL_ORDER].map((l) => (
          <button
            key={l} onClick={() => setLevelFilter(l)}
            className={cn(
              'rounded-md px-2.5 py-1.5 text-[11px] font-bold transition border',
              levelFilter === l
                ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                : 'border-token text-muted hover:text-current'
            )}
          >
            {l === 'all' ? 'All' : LEVEL_META[l].label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">Sort</div>
          <select
            value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1 focus:outline-none"
          >
            <option value="recommended">Recommended</option>
            <option value="difficulty">Difficulty</option>
            <option value="progress">Your progress</option>
          </select>
        </div>
      </div>

      {/* Cert grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(({ cert, stats }, i) => {
          const lvl = LEVEL_META[cert.level];
          return (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Link
                to={`/exam/${cert.id}`}
                className={cn(
                  'group surface rounded-2xl p-4 h-full flex flex-col gap-3 hover:border-aws-orange/40 transition focus-ring relative overflow-hidden',
                  stats.earned && 'border-success/40'
                )}
              >
                {stats.earned && (
                  <div className="absolute top-2 right-2 chip bg-success/15 text-success border border-success/30 text-[10px] font-extrabold">
                    <Award size={10} /> Earned
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{cert.icon}</span>
                  <ProgressRing percent={stats.readiness} size={40} stroke={4} accent="orange" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    <span className={cn('chip border font-bold text-[10px]', lvl.color)}>
                      {lvl.label}
                    </span>
                    <span className="text-[10px] font-extrabold text-muted tracking-widest uppercase">
                      {cert.code}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold tracking-tight leading-snug">{cert.short}</h3>
                  <p className="text-[11px] text-muted mt-1 line-clamp-2">{cert.tagline}</p>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  <Tile label="Best" value={stats.bestScore || '—'} />
                  <Tile label="Practiced" value={stats.totalQuestionsAnswered || 0} />
                  <Tile label="Pass %" value={stats.predicted ? `${stats.predicted}%` : '—'} />
                </div>
                <div className="text-[10px] text-muted">
                  {stats.lastAttempt
                    ? `Last: ${formatDate(stats.lastAttempt.at)} · ${stats.lastAttempt.scaledScore}`
                    : 'Not started'}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}

function MasterDashboard({ ms }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-3xl p-5 sm:p-6 gradient-border relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-electric/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative grid gap-5 lg:grid-cols-[180px_1fr_220px] items-center">
        <div className="flex justify-center">
          <ProgressRing percent={ms.overallAccuracy} size={150} stroke={12} accent="rainbow" mega>
            <div className="text-center">
              <div className="text-3xl font-black tabular-nums text-gradient">{ms.overallAccuracy}%</div>
              <div className="text-[9px] uppercase tracking-widest text-muted font-bold mt-1">Accuracy</div>
            </div>
          </ProgressRing>
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">Your exam command center</h2>
          <p className="text-sm text-muted mt-1">Track lifetime practice across every AWS certification.</p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <MStat icon={ListChecks} label="Lifetime Qs" value={ms.totalQuestionsAnswered} />
            <MStat icon={Trophy} label="Attempts" value={ms.totalAttempts} />
            <MStat icon={Award} label="Earned" value={`${ms.earnedCount}/13`} />
            <MStat icon={Flame} label="This week" value={ms.weeklyAttempts} accent="text-aws-orange" />
          </div>
          {(ms.strongest || ms.weakest) && (
            <div className="mt-3 grid sm:grid-cols-2 gap-2 text-xs">
              {ms.strongest && (
                <div className="rounded-lg border border-success/30 bg-success/[0.04] p-2 flex items-center gap-2">
                  <TrendingUp size={12} className="text-success" />
                  <span><span className="font-extrabold text-success">Strongest:</span> {certNameForId(ms.strongest.id)}</span>
                </div>
              )}
              {ms.weakest && ms.weakest.id !== ms.strongest?.id && (
                <div className="rounded-lg border border-warning/30 bg-warning/[0.04] p-2 flex items-center gap-2">
                  <Target size={12} className="text-warning" />
                  <span><span className="font-extrabold text-warning">Weakest:</span> {certNameForId(ms.weakest.id)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly chart */}
        <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1">This week</div>
          <div className="h-24">
            <ResponsiveContainer>
              <BarChart data={ms.weeklyChart} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(255,153,0,0.08)' }}
                  contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 11 }}
                  formatter={(v) => [v, 'Questions']}
                />
                <Bar dataKey="questions" fill="#FF9900" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function certNameForId(id) {
  return CERTS.find((c) => c.id === id)?.short || id;
}

function MStat({ icon: Icon, label, value, accent = 'text-current' }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-lg font-extrabold tabular-nums', accent)}>{value}</div>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className="rounded-md border border-token bg-[var(--card-2)]/40 px-1.5 py-1 text-center">
      <div className="text-[9px] uppercase tracking-widest font-bold text-muted">{label}</div>
      <div className="text-xs font-extrabold tabular-nums">{value}</div>
    </div>
  );
}
