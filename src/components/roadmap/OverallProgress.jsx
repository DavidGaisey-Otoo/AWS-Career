import { motion } from 'framer-motion';
import { CalendarClock, Flame, ListChecks, Sparkles, Timer, Zap } from 'lucide-react';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { formatDate } from '../../lib/utils.js';
import { ProgressRing } from './ProgressRing.jsx';

const PACE_META = {
  ahead:     { label: 'Ahead of pace', color: 'text-success' },
  'on-track':{ label: 'On track',       color: 'text-success' },
  behind:    { label: 'Behind pace',    color: 'text-warning' },
  stalled:   { label: 'Stalled',        color: 'text-danger' },
  gathering: { label: 'Gathering data', color: 'text-muted' },
};

export function OverallProgress() {
  const { overall, totalSecondsLogged, pace, state } = useRoadmap();
  const { profile } = useApp();
  const remainingSubs = overall.subsTotal - overall.subsDone;
  const hours = Math.floor(totalSecondsLogged / 3600);
  const mins = Math.floor((totalSecondsLogged % 3600) / 60);
  const paceMeta = PACE_META[pace.status] || PACE_META.gathering;
  const targetDate = profile.targetDate ? new Date(profile.targetDate) : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-3xl p-5 sm:p-6 lg:p-8 gradient-border relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative grid gap-6 lg:grid-cols-[260px_1fr] items-center">
        <div className="flex justify-center">
          <ProgressRing
            percent={overall.percent}
            size={220}
            stroke={16}
            accent="rainbow"
            mega
          >
            <div className="text-center">
              <div className="text-5xl font-black tracking-tight text-gradient">
                {Math.round(overall.percent)}<span className="text-2xl">%</span>
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mt-1">
                Roadmap progress
              </div>
            </div>
          </ProgressRing>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {overall.phasesComplete}/{overall.phasesTotal} phases complete
            </h2>
            <span className={`text-sm font-semibold ${paceMeta.color}`}>· {paceMeta.label}</span>
          </div>
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            {pace.projectedDate ? (
              <>
                At your current pace of <strong className="text-white">{pace.perDay.toFixed(1)} subtasks/day</strong>,
                you'll finish around <strong className="text-white">{formatDate(pace.projectedDate)}</strong>
                {targetDate ? (
                  pace.projectedDate <= targetDate
                    ? <> — <span className="text-success font-semibold">that's before your target of {formatDate(targetDate)}.</span></>
                    : <> — <span className="text-warning font-semibold">{Math.ceil((pace.projectedDate - targetDate) / 86400000)} days past your target of {formatDate(targetDate)}.</span></>
                ) : '.'}
              </>
            ) : pace.status === 'gathering' ? (
              <>Tick a subtask today, then come back tomorrow — projections kick in after 3 days of activity.</>
            ) : (
              <>You've stalled. Tick one subtask today to restart your pace projection.</>
            )}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat icon={ListChecks} label="Subtasks left" value={remainingSubs} />
            <Stat icon={Timer} label="Time logged" value={hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} />
            <Stat icon={Flame} label="Day streak" value={state.streak.current} accent="orange" highlight={state.streak.current > 0} />
            <Stat icon={Zap} label="XP earned" value={state.xp} accent="yellow" />
          </div>

          {targetDate ? (
            <div className="flex items-center gap-2 text-xs text-muted">
              <CalendarClock size={14} />
              Target job-ready date: <span className="font-semibold text-white">{formatDate(targetDate)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted">
              <Sparkles size={14} /> Set a target date in <a href="/settings" className="text-aws-orange font-semibold hover:underline">Settings</a> to unlock pace alerts.
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function Stat({ icon: Icon, label, value, accent = 'muted', highlight }) {
  const tint = {
    muted: 'text-muted',
    orange: 'text-aws-orange',
    yellow: 'text-warning',
  }[accent];
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-muted">
        <Icon size={12} className={tint} /> {label}
      </div>
      <div className={`mt-1.5 text-2xl font-black tracking-tight tabular-nums ${highlight ? 'text-aws-orange animate-pulse-glow rounded-md inline-block px-1' : ''}`}>
        {value}
      </div>
    </div>
  );
}
