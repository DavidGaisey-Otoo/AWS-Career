import { motion } from 'framer-motion';
import {
  Award, Crown, Filter, Flame, Globe2, Lock, Search, Shield, Sparkles,
  Trophy, User, Zap,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useGamification } from '../context/GamificationContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { assessCareerProgression } from '../lib/careerProgression.js';
import { CATEGORY_META, LEVELS, RARITY_META } from '../data/gamification.js';
import { cn, formatDate } from '../lib/utils.js';

export default function Profile() {
  const { profile } = useApp();
  const portfolio = usePortfolio();
  const freelance = useFreelance();
  const {
    totalXp, level, next, xpBreakdown, badgeView, unlockedCount,
    leaderboards, streak, shieldUsedThisWeek, useStreakShield, resetGamification,
  } = useGamification();

  const firstName = (profile?.name || 'Cloud Builder').split(' ')[0];
  const career = useMemo(() => assessCareerProgression({
    portfolioIntelligence: portfolio.intelligence,
    projectStats: portfolio.projectStats,
    projects: portfolio.projects,
    proposals: freelance.state.proposals,
  }), [portfolio.intelligence, portfolio.projectStats, portfolio.projects, freelance.state.proposals]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile + Gamification"
        title={career.current.headline}
        subtitle={`${firstName} — career level is based on portfolio and client evidence, while XP tracks learning activity.`}
        icon={Trophy}
      />

      <CareerProgressCard career={career} />

      {/* Hero */}
      <HeroCard
        profile={profile}
        level={level}
        next={next}
        totalXp={totalXp}
        badgeCount={unlockedCount}
        streak={streak}
        shieldUsedThisWeek={shieldUsedThisWeek}
        useStreakShield={useStreakShield}
      />

      {/* Level ladder */}
      <LevelLadder current={level.n} />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <XPBreakdown rows={xpBreakdown.rows} total={xpBreakdown.total} />
        <Leaderboards lb={leaderboards} />
      </div>

      <BadgeCabinet badges={badgeView} />

      <div className="surface rounded-2xl p-4">
        <button
          onClick={() => {
            if (confirm('Reset gamification progress (unlocked badges, login XP, etc.)?')) {
              resetGamification();
            }
          }}
          className="btn btn-ghost !text-xs text-danger"
        >
          Reset gamification only
        </button>
      </div>
    </div>
  );
}

function CareerProgressCard({ career }) {
  return (
    <section className="surface rounded-2xl p-5 border border-aws-orange/30">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Evidence-based career level</div>
          <h2 className="text-xl font-black mt-1">{career.current.label}</h2>
          <p className="text-sm text-muted mt-1 max-w-3xl">{career.current.scope}</p>
        </div>
        <div className="rounded-xl bg-aws-orange/10 border border-aws-orange/30 px-4 py-2 text-center">
          <div className="text-2xl font-black text-aws-orange">{career.score}/100</div>
          <div className="text-[9px] uppercase font-bold text-muted">Evidence score</div>
        </div>
      </div>
      {career.next ? (
        <div className="mt-4">
          <div className="text-xs font-extrabold mb-2">Progress to {career.next.label}</div>
          <div className="grid sm:grid-cols-2 gap-2">
            {career.requirements.map((r) => {
              const done = r.current >= r.target;
              return (
                <div key={r.label} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
                  <div className="flex justify-between gap-2 text-xs font-bold"><span>{done ? '✓' : '○'} {r.label}</span><span>{Math.min(r.current, r.target)}/{r.target}</span></div>
                  <div className="h-1.5 rounded-full bg-[var(--card)] mt-2 overflow-hidden"><div className="h-full bg-aws-orange" style={{ width: `${Math.min(100, (r.current / r.target) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      ) : <p className="text-sm text-success mt-4">Senior evidence gates completed.</p>}
      <p className="text-[10px] text-muted mt-3 italic">{career.disclaimer}</p>
    </section>
  );
}

// ---------- HERO ----------

function HeroCard({ profile, level, next, totalXp, badgeCount, streak, shieldUsedThisWeek, useStreakShield }) {
  return (
    <section className="surface rounded-3xl p-5 sm:p-7 gradient-border relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative grid gap-6 lg:grid-cols-[200px_1fr] items-center">
        <div className="flex justify-center">
          <ProgressRing percent={next.pctToNext} size={180} stroke={14} accent="rainbow" mega>
            <div className="text-center">
              <div className="text-4xl font-black tracking-tight text-gradient">{totalXp.toLocaleString()}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mt-1">XP</div>
            </div>
          </ProgressRing>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`w-12 h-12 rounded-2xl grid place-items-center text-2xl shadow-glow-orange bg-gradient-to-br ${level.color}`}>
              {level.icon}
            </div>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Level {level.n}</div>
              <h2 className="text-2xl font-black tracking-tight leading-tight">{level.name}</h2>
            </div>
          </div>
          {next.next ? (
            <p className="text-sm text-muted mt-3">
              <strong className="text-current">{next.xpToNext.toLocaleString()} XP</strong> to
              {' '}<strong className="text-current">{next.next.name}</strong>.
            </p>
          ) : (
            <p className="text-sm text-success mt-3">Max level reached. Living legend.</p>
          )}

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Stat icon={Zap}    label="Total XP"     value={totalXp.toLocaleString()} />
            <Stat icon={Award}  label="Badges"       value={badgeCount} accent="text-aws-orange" />
            <Stat icon={Flame}  label="Streak"       value={`${streak.current || 0} 🔥`} accent="text-warning" />
            <Stat icon={Trophy} label="Longest"      value={streak.longest || 0} />
          </div>

          {/* Streak shield row */}
          <div className="mt-3 rounded-xl border border-token bg-[var(--card-2)]/40 p-3 flex items-center gap-3">
            <Shield size={18} className="text-electric flex-shrink-0" />
            <div className="flex-1 text-xs">
              <div className="font-extrabold">Streak shield</div>
              <div className="text-muted">
                One use per week — protects today\'s streak if you miss a day.
              </div>
            </div>
            <button
              onClick={useStreakShield}
              disabled={shieldUsedThisWeek}
              className={cn('btn !text-xs !py-1.5',
                shieldUsedThisWeek ? 'btn-ghost opacity-60 cursor-not-allowed' : 'btn-primary')}
            >
              {shieldUsedThisWeek ? 'Used' : 'Activate'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value, accent = 'text-current' }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-2.5">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
        <Icon size={11} className="text-aws-orange" /> {label}
      </div>
      <div className={cn('mt-1 text-lg font-extrabold tabular-nums', accent)}>{value}</div>
    </div>
  );
}

// ---------- LEVEL LADDER ----------

function LevelLadder({ current }) {
  return (
    <section className="surface rounded-2xl p-4">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Level ladder</h3>
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {LEVELS.map((l) => {
          const isCurrent = l.n === current;
          const reached = l.n <= current;
          return (
            <div key={l.n}
                 className={cn(
                   'rounded-xl p-2 text-center transition relative',
                   reached
                     ? `bg-gradient-to-br ${l.color} text-ink-950 shadow-soft-xl`
                     : 'bg-[var(--card-2)] text-muted',
                   isCurrent && 'ring-2 ring-aws-orange shadow-glow-orange'
                 )}>
              <div className="text-xl">{l.icon}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest mt-0.5">{l.n}</div>
              <div className="text-[9px] truncate font-bold">{l.name}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ---------- XP BREAKDOWN ----------

function XPBreakdown({ rows, total }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">XP breakdown</h3>
        <span className="text-[11px] font-extrabold text-aws-orange tabular-nums">{total.toLocaleString()} total</span>
      </div>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            <span className="flex-1 truncate font-semibold">{r.label}</span>
            <div className="w-24 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
              <div className="h-full bg-aws-orange" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
            <span className="tabular-nums font-bold w-16 text-right">{r.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------- LEADERBOARDS ----------

function Leaderboards({ lb }) {
  const [tab, setTab] = useState('global');
  const list = tab === 'global' ? lb.global
             : tab === 'country' ? lb.country
             : lb.weekly;
  const valKey = tab === 'weekly' ? 'weeklyXp' : 'xp';
  const valLabel = tab === 'weekly' ? 'this week' : 'XP';
  const myRank = tab === 'global' ? lb.myGlobalRank
               : tab === 'country' ? lb.myCountryRank
               : lb.myWeeklyRank;

  const top = list.slice(0, 10);
  const inTop = top.some((u) => u.isMe);

  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Leaderboard</h3>
        <div className="ml-auto inline-flex items-center bg-[var(--card-2)] border border-token rounded-xl p-1">
          {[
            { id: 'global', label: 'Global',   icon: Globe2 },
            { id: 'country', label: 'Ghana',   icon: Crown },
            { id: 'weekly', label: 'This week', icon: Flame },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition',
                        tab === t.id ? 'bg-aws-orange text-ink-950' : 'text-muted hover:text-current'
                      )}>
                <Icon size={11} /> {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <ul className="space-y-1">
        {top.map((u) => (
          <Row key={u.id || u.name} u={u} valKey={valKey} valLabel={valLabel} />
        ))}
      </ul>
      {!inTop && myRank && (
        <>
          <div className="text-[10px] text-muted text-center my-2">⋯</div>
          <ul className="space-y-1">
            {list.filter((u) => u.isMe).map((u) => (
              <Row key="me" u={u} valKey={valKey} valLabel={valLabel} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Row({ u, valKey, valLabel }) {
  const rankBadge =
    u.rank === 1 ? 'bg-warning/20 text-warning border-warning/40' :
    u.rank === 2 ? 'bg-electric/20 text-electric border-electric/40' :
    u.rank === 3 ? 'bg-aws-orange/20 text-aws-orange border-aws-orange/40' :
                   'bg-[var(--card-2)] text-muted border-token';
  return (
    <li className={cn(
      'flex items-center gap-3 rounded-xl border p-2.5',
      u.isMe ? 'border-aws-orange bg-aws-orange/[0.06]' : 'border-token bg-[var(--card-2)]/30'
    )}>
      <span className={cn('chip border text-[11px] font-extrabold w-9 justify-center', rankBadge)}>
        {u.rank}
      </span>
      <span className="text-xl flex-shrink-0">{u.country_flag || '🌐'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-extrabold truncate">{u.isMe ? 'You' : u.name}</div>
        <div className="text-[10px] text-muted">{u.country || ''}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-extrabold tabular-nums text-aws-orange">{(u[valKey] || 0).toLocaleString()}</div>
        <div className="text-[9px] uppercase tracking-widest text-muted font-bold">{valLabel}</div>
      </div>
    </li>
  );
}

// ---------- BADGE CABINET ----------

function BadgeCabinet({ badges }) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  const filtered = useMemo(() => {
    return badges.filter((b) => {
      if (b.secret && !b.unlocked && !showSecret) return false;
      if (filter !== 'all' && b.category !== filter) return false;
      if (query && !((b.name + ' ' + b.description).toLowerCase().includes(query.toLowerCase()))) return false;
      return true;
    });
  }, [badges, filter, query, showSecret]);

  const unlockedTotal = badges.filter((b) => b.unlocked).length;

  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">
          Badge cabinet — {unlockedTotal} / {badges.length}
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--card-2)] border border-token rounded-md px-2">
            <Search size={11} className="text-aws-orange" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
                   placeholder="Search…"
                   className="bg-transparent py-1 text-xs focus:outline-none w-32" />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
                  className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <label className="text-[11px] font-bold inline-flex items-center gap-1.5">
            <input type="checkbox" checked={showSecret} onChange={(e) => setShowSecret(e.target.checked)}
                   className="accent-aws-orange w-3.5 h-3.5" />
            Show secrets
          </label>
        </div>
      </div>
      <ul className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((b) => (
          <li key={b.id}>
            <BadgeCard b={b} />
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="col-span-full text-center text-sm text-muted py-6">No badges match.</li>
        )}
      </ul>
    </section>
  );
}

function BadgeCard({ b }) {
  const hidden = b.secret && !b.unlocked;
  const rarity = RARITY_META[b.rarity || 'common'];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'rounded-2xl p-3 border transition text-center relative',
        b.unlocked
          ? 'border-aws-orange/40 bg-[var(--card)]'
          : 'border-token bg-[var(--card-2)]/40 opacity-70'
      )}>
      <div className={cn(
        'mx-auto w-14 h-14 rounded-xl grid place-items-center text-2xl mb-2',
        b.unlocked
          ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
          : 'bg-[var(--card-2)] text-muted'
      )}>
        {hidden ? <Lock size={18} /> : b.icon}
      </div>
      <div className="text-[12px] font-extrabold tracking-tight leading-tight truncate">
        {hidden ? '???' : b.name}
      </div>
      <div className="text-[10px] text-muted leading-snug mt-1 line-clamp-2">
        {hidden ? 'Discovered by accident.' : b.description}
      </div>
      <div className="mt-2 inline-flex items-center gap-1 flex-wrap justify-center">
        <span className={cn('chip border text-[9px] font-bold', rarity.color)}>{rarity.label}</span>
        {b.xp > 0 && (
          <span className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-[9px] font-bold">
            +{b.xp}
          </span>
        )}
      </div>
      {b.unlocked && b.unlockedAt && (
        <div className="text-[9px] text-muted mt-1">Unlocked {formatDate(b.unlockedAt)}</div>
      )}
    </motion.div>
  );
}
