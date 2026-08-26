import { motion } from 'framer-motion';
import {
  AlertCircle, Briefcase, Building2, ExternalLink, Filter, Flame, Globe2,
  Sparkles, TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { CERTS } from '../data/certs.js';
import {
  CERT_DEMAND, COMPETITION, EMERGING_ALERTS, LAST_REFRESHED, RATE_BANDS,
  REGION_DEMAND, SAMPLE_JOBS, SEASONAL, TRENDING, skillDemand,
} from '../data/marketIntel.js';
import { cn, formatDate } from '../lib/utils.js';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { buildOpportunityLearningProfile, nextLearningActions, scoreOpportunity } from '../lib/opportunityLearningEngine.js';

const PLATFORMS = ['Upwork', 'LinkedIn', 'Direct'];
const LEVELS = ['Junior', 'Mid', 'Senior', 'Principal'];

export default function Market() {
  const { state: freelanceState } = useFreelance();
  const portfolio = usePortfolio();
  const [learningEvents, setLearningEvents] = useLocalStorage('awscl-pro::v1::opportunity-learning', []);
  const [rateFilter, setRateFilter] = useState('all');     // all | hourly | fixed
  const [levelFilter, setLevelFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [skillQuery, setSkillQuery] = useState('');

  const filtered = useMemo(() => {
    return SAMPLE_JOBS.filter((j) =>
      (rateFilter === 'all' || j.rate.type === rateFilter) &&
      (levelFilter === 'all' || j.level === levelFilter) &&
      (platformFilter === 'all' || j.platform === platformFilter) &&
      (!skillQuery || j.skills.some((s) => s.toLowerCase().includes(skillQuery.toLowerCase())) ||
        j.title.toLowerCase().includes(skillQuery.toLowerCase())));
  }, [rateFilter, levelFilter, platformFilter, skillQuery]);

  const skills = useMemo(() => skillDemand().slice(0, 12), []);
  const portfolioSkills = useMemo(() => portfolio.projects.flatMap((project) => project.services || project.skills || []), [portfolio.projects]);
  const learningProfile = useMemo(() => buildOpportunityLearningProfile({ interactions: learningEvents, proposals: freelanceState.proposals, portfolioSkills }), [learningEvents, freelanceState.proposals, portfolioSkills]);
  const learningActions = useMemo(() => nextLearningActions(SAMPLE_JOBS, learningProfile), [learningProfile]);

  function recordPreference(job, outcome) {
    setLearningEvents((events) => [{ id: `${job.id}-${Date.now()}`, opportunityId: job.id, title: job.title, skills: job.skills, outcome, sourceType: 'practice', at: new Date().toISOString() }, ...events].slice(0, 300));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Market intelligence"
        title="Know what the market pays."
        subtitle="Live-feel job radar, skill demand, rate bands, geographic patterns, and emerging-tech alerts. Refreshed quarterly."
        icon={TrendingUp}
        actions={
          <span className="chip border border-token bg-[var(--card-2)] text-[11px] font-bold">
            Refreshed {formatDate(LAST_REFRESHED)}
          </span>
        }
      />

      <section className="surface rounded-2xl p-4 sm:p-5 border border-aws-orange/30">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Opportunity Learning Engine</div>
            <h2 className="text-lg font-extrabold mt-1">Learn the market rules, then improve from real outcomes</h2>
            <p className="text-xs text-muted mt-1 max-w-3xl">{learningProfile.explanation} Practice-card preferences help ranking, but only submitted proposal outcomes count as real performance evidence.</p>
          </div>
          <span className="chip border border-token bg-[var(--card-2)] text-[11px] font-bold">{learningProfile.stage} · {learningProfile.sampleSize} real outcomes</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl border border-token bg-[var(--card-2)] p-3"><div className="text-[10px] uppercase tracking-widest text-muted font-bold">Confidence</div><div className="font-extrabold mt-1">{learningProfile.stage === 'evidence-trained' ? 'Medium' : 'Low — building evidence'}</div></div>
          <div className="rounded-xl border border-token bg-[var(--card-2)] p-3"><div className="text-[10px] uppercase tracking-widest text-muted font-bold">Recorded success</div><div className="font-extrabold mt-1">{learningProfile.successRate == null ? 'Not enough data' : `${learningProfile.successRate}%`}</div></div>
          <div className="rounded-xl border border-token bg-[var(--card-2)] p-3"><div className="text-[10px] uppercase tracking-widest text-muted font-bold">Privacy</div><div className="font-extrabold mt-1">Your synced app data only</div></div>
        </div>
        <div className="mt-4">
          <div className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Highest-value study gaps</div>
          <div className="flex flex-wrap gap-2">
            {learningActions.map((item) => <span key={item.skill} className="chip border border-token bg-[var(--card-2)] text-[11px]" title={item.action}><strong>{item.skill}</strong> · {item.demand} practice gigs</span>)}
          </div>
        </div>
      </section>

      {/* Trending strip */}
      <section className="surface rounded-2xl p-4 sm:p-5 gradient-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3 inline-flex items-center gap-1.5">
            <Flame size={11} /> Trending this month
          </h2>
          <div className="flex flex-wrap gap-2">
            {TRENDING.map((t) => (
              <span key={t.id} className={cn(
                'chip border text-xs font-bold',
                t.hotness >= 5 ? 'bg-danger/10 text-danger border-danger/30'
                : t.hotness >= 4 ? 'bg-warning/10 text-warning border-warning/30'
                : 'bg-electric/10 text-electric border-electric/30'
              )}>
                {t.label}{' '}
                <span className="text-muted font-medium">+{t.momPct}%</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Skill demand</h3>
          <p className="text-[11px] text-muted mb-2">From the {SAMPLE_JOBS.length}-job rolling sample.</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={skills} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
              <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} />
              <YAxis type="category" dataKey="skill" tick={{ fill: '#94A3B8', fontSize: 11 }}
                     width={90} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(255,153,0,0.08)' }}
                contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [`${v} job(s)`, 'Mentions']}
              />
              <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                {skills.map((_, i) => (
                  <Cell key={i} fill={i < 3 ? '#FF9900' : i < 6 ? '#FFB84D' : '#94A3B8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
            {Object.entries(COMPETITION).slice(0, 9).map(([s, c]) => (
              <span key={s} className={cn(
                'rounded border px-1.5 py-0.5 text-center font-bold uppercase tracking-widest',
                c === 'high' ? 'bg-danger/10 text-danger border-danger/30'
                : c === 'medium' ? 'bg-warning/10 text-warning border-warning/30'
                : 'bg-success/10 text-success border-success/30'
              )}>
                {s}: {c}
              </span>
            ))}
          </div>
        </section>

        <section className="surface rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Rates by experience (USD/hr)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={RATE_BANDS} margin={{ top: 4, right: 16, bottom: 4, left: -8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="level" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="low"  stackId="a" fill="rgba(255,153,0,0.35)" radius={[0, 0, 0, 0]} name="Low" />
              <Bar dataKey="mid"  stackId="a" fill="#FF9900" radius={[0, 0, 0, 0]} name="Mid" />
              <Bar dataKey="high" stackId="a" fill="rgba(255,184,77,0.6)" radius={[6, 6, 0, 0]} name="High" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2 inline-flex items-center gap-1.5">
            <Globe2 size={11} className="text-aws-orange" /> Geographic demand
          </h3>
          <ul className="space-y-1.5">
            {REGION_DEMAND.map((r) => {
              const max = Math.max(...REGION_DEMAND.map((x) => x.postingsPerMonth));
              return (
                <li key={r.region} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 font-bold truncate">{r.region}</span>
                  <div className="w-32 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                    <div className="h-full bg-aws-orange" style={{ width: `${(r.postingsPerMonth / max) * 100}%` }} />
                  </div>
                  <span className="tabular-nums text-muted w-16 text-right">{r.postingsPerMonth.toLocaleString()}/mo</span>
                  <span className="tabular-nums text-success w-10 text-right">×{r.payIndex}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted mt-3">Pay index relative to US. Hire probability ranges 18-30% per posting.</p>
        </section>

        <section className="surface rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Seasonal demand</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={SEASONAL} margin={{ top: 4, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'rgba(20,28,48,0.95)', border: '1px solid rgba(255,153,0,0.3)', borderRadius: 10, fontSize: 12 }} formatter={(v) => [`Index ${v}`, '']} />
              <Bar dataKey="index" fill="#00D4FF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-muted mt-2">
            Q4 budget releases drive Oct → Dec spikes. Use August lulls for cert study.
          </p>
        </section>
      </div>

      {/* Cert demand + emerging alerts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Certification demand</h3>
          <p className="text-[11px] text-muted mb-2">% of recent job posts mentioning each cert by name.</p>
          <ul className="space-y-1.5">
            {CERT_DEMAND.map((c) => {
              const cert = CERTS.find((cc) => cc.id === c.certId);
              return (
                <li key={c.certId} className="flex items-center gap-2 text-xs">
                  <span className="text-base">{cert?.icon}</span>
                  <span className="flex-1 font-bold truncate">{cert?.short || c.certId}</span>
                  <div className="w-32 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                    <div className="h-full bg-aws-orange" style={{ width: `${c.mentions * 2.5}%` }} />
                  </div>
                  <span className="tabular-nums font-bold text-aws-orange w-10 text-right">{c.mentions}%</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="surface rounded-2xl p-4 sm:p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2 inline-flex items-center gap-1.5">
            <AlertCircle size={11} className="text-aws-orange" /> Emerging tech alerts
          </h3>
          <ul className="space-y-2">
            {EMERGING_ALERTS.map((a) => (
              <li key={a.id} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 flex items-center gap-2">
                <span className={cn(
                  'chip border text-[10px] font-bold uppercase tracking-widest flex-shrink-0',
                  a.impact === 'high' ? 'bg-danger/10 text-danger border-danger/30'
                  : a.impact === 'medium' ? 'bg-warning/10 text-warning border-warning/30'
                  : 'bg-electric/10 text-electric border-electric/30'
                )}>
                  {a.impact}
                </span>
                <span className="text-xs font-semibold">{a.title}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Job radar */}
      <section className="surface rounded-2xl p-4 sm:p-5">
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 mb-4 text-xs"><strong>Training examples — not live listings.</strong> Use these to learn pricing, scope and skill patterns. Apply only through a verified listing in Live Gigs or Marketplace Gig Import.</div>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Filter size={14} className="text-aws-orange" />
          <input
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder="Search jobs by skill or title…"
            className="flex-1 min-w-[160px] bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
          />
          <select value={rateFilter} onChange={(e) => setRateFilter(e.target.value)}
                  className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
            <option value="all">Any rate</option>
            <option value="hourly">Hourly</option>
            <option value="fixed">Fixed</option>
          </select>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
                  className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
            <option value="all">Any level</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
                  className="bg-[var(--card-2)] border border-token rounded-md text-[11px] font-bold px-2 py-1">
            <option value="all">Any platform</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((j) => {
            const match = scoreOpportunity(j, learningProfile);
            const lastPreference = learningEvents.find((event) => event.opportunityId === j.id)?.outcome;
            return (
            <li key={j.id} className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-4 hover:border-aws-orange/40 transition">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-extrabold tracking-tight leading-snug">{j.title}</h4>
                <span className="chip border border-token bg-[var(--card)] text-[10px] font-bold">{j.platform}</span>
              </div>
              <div className="text-[11px] text-muted mt-1 flex items-center gap-1.5">
                <Building2 size={10} /> {j.company} · <Globe2 size={10} /> {j.region}
              </div>
              <p className="text-xs mt-2 leading-relaxed line-clamp-2">{j.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {j.skills.slice(0, 5).map((s) => (
                  <span key={s} className="chip border border-token bg-[var(--card)] text-[10px] font-bold">{s}</span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold">
                <span className="text-aws-orange tabular-nums">
                  {j.rate.type === 'hourly'
                    ? `${j.rate.currency} ${j.rate.min}-${j.rate.max}/hr`
                    : `${j.rate.currency} ${j.rate.min.toLocaleString()}-${j.rate.max.toLocaleString()}`}
                </span>
                <span className="text-muted">{j.proposals} proposals · {j.level}</span>
              </div>
              <div className="mt-3 rounded-lg border border-token bg-[var(--card)] p-2 text-[11px]">
                <div className="font-extrabold">{match.recommendation} · {match.score}/100 · {match.confidence} confidence</div>
                <div className="text-muted mt-1">{match.reasons[0] || (match.gaps.length ? `Study gaps: ${match.gaps.join(', ')}` : 'Review the full scope before deciding.')}</div>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => recordPreference(j, 'interested')} className={cn('flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold', lastPreference === 'interested' ? 'border-success text-success bg-success/10' : 'border-token')}>Interested</button>
                <button onClick={() => recordPreference(j, 'skip')} className={cn('flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-bold', lastPreference === 'skip' ? 'border-danger text-danger bg-danger/10' : 'border-token')}>Not for me</button>
              </div>
            </li>
          )})}
        </ul>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">No jobs match those filters.</div>
        )}
      </section>
    </div>
  );
}
