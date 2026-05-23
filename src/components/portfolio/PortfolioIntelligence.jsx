import { motion } from 'framer-motion';
import {
  ArrowUpRight, Compass, Sparkles, Target, TrendingUp, Trophy, Wand2, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { DOMAIN_LABEL } from '../../data/projects.js';
import { ProgressRing } from '../roadmap/ProgressRing.jsx';
import { cn } from '../../lib/utils.js';

const PROGRESSION_META = {
  climbing:   { label: 'Climbing in difficulty', tone: 'text-success', icon: TrendingUp },
  steady:     { label: 'Steady difficulty',      tone: 'text-warning', icon: Compass },
  plateauing: { label: 'Plateauing',              tone: 'text-warning', icon: Compass },
  unknown:    { label: 'Need more completes',    tone: 'text-muted',   icon: Compass },
};

export function PortfolioIntelligence() {
  const { intelligence } = usePortfolio();
  const {
    portfolioScore, clientReadiness, coverageArr, gaps,
    progression, completeCount, recommendations,
  } = intelligence;
  const prog = PROGRESSION_META[progression];
  const radarData = coverageArr.map((c) => ({
    domain: DOMAIN_LABEL[c.domain],
    coverage: c.pct,
  }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-3xl p-5 sm:p-6 lg:p-8 gradient-border relative overflow-hidden"
    >
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-electric/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative grid gap-6 lg:grid-cols-[260px_1fr] items-start">
        {/* Portfolio score ring */}
        <div className="flex flex-col items-center">
          <ProgressRing
            percent={portfolioScore}
            size={200}
            stroke={14}
            accent="rainbow"
            mega
          >
            <div className="text-center">
              <div className="text-5xl font-black tracking-tight text-gradient">
                {portfolioScore}<span className="text-xl">/100</span>
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mt-1">
                Portfolio score
              </div>
            </div>
          </ProgressRing>
          <ClientReadiness pct={clientReadiness} />
        </div>

        {/* Intelligence sections */}
        <div className="space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Wand2 size={20} className="text-aws-orange" />
              Portfolio intelligence
            </h2>
            <p className="text-xs text-muted mt-1">
              How an enterprise hiring manager would read your portfolio today.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <Stat
              icon={Trophy}
              label="Completed"
              value={`${completeCount}/8`}
              tone="text-success"
            />
            <Stat
              icon={prog.icon}
              label="Progression"
              value={prog.label}
              tone={prog.tone}
            />
            <Stat
              icon={Target}
              label="Skill gaps"
              value={gaps.length === 0 ? 'None — solid coverage' : `${gaps.length} domain${gaps.length > 1 ? 's' : ''}`}
              tone={gaps.length === 0 ? 'text-success' : 'text-warning'}
            />
          </div>

          {/* Radar chart */}
          <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Compass size={14} className="text-aws-orange" />
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Skill coverage</h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="domain"
                    tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
                  />
                  <Radar
                    name="Coverage"
                    dataKey="coverage"
                    stroke="#FF9900"
                    fill="#FF9900"
                    fillOpacity={0.32}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(20,28,48,0.95)',
                      border: '1px solid rgba(255,153,0,0.4)',
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}%`, 'Coverage']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {gaps.length > 0 && (
              <div className="mt-2 text-[11px] text-muted flex flex-wrap items-center gap-1.5">
                Missing:
                {gaps.map((g) => (
                  <span key={g} className="chip bg-warning/10 text-warning border border-warning/30 text-[10px] font-bold">
                    {DOMAIN_LABEL[g]}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-aws-orange" />
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Build next</h3>
            </div>
            {recommendations.length === 0 ? (
              <div className="text-sm text-muted">
                Every project has been started. Focus on shipping what's in flight.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {recommendations.map(({ project, fillsGap }) => (
                  <li key={project.id}>
                    <Link
                      to={`/portfolio/${project.id}`}
                      className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-[var(--card)] transition focus-ring"
                    >
                      <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-aws text-ink-950 font-black text-xs">
                        {project.n}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{project.title}</div>
                        <div className="text-[11px] text-muted">{project.tagline}</div>
                      </div>
                      {fillsGap && (
                        <span className="chip bg-success/15 text-success border border-success/30 text-[10px] font-bold flex-shrink-0">
                          <Zap size={10} /> Fills gap
                        </span>
                      )}
                      <ArrowUpRight size={14} className="text-muted group-hover:text-aws-orange transition" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function ClientReadiness({ pct }) {
  const tone =
    pct >= 75 ? 'text-success'
    : pct >= 40 ? 'text-warning'
    : 'text-danger';
  const label =
    pct >= 75 ? 'Client-ready'
    : pct >= 40 ? 'Almost there'
    : 'Keep building';
  return (
    <div className="mt-4 w-full rounded-2xl border border-token bg-[var(--card-2)]/40 p-3 text-center">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
        Client readiness
      </div>
      <div className={cn('mt-1 text-2xl font-black tracking-tight tabular-nums', tone)}>
        {pct}%
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-[var(--card)] overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 75 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger'
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <div className={cn('mt-1 text-[10px] font-extrabold uppercase tracking-widest', tone)}>{label}</div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone = 'text-current' }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5">
        <Icon size={12} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-base font-extrabold tracking-tight', tone)}>{value}</div>
    </div>
  );
}
