/**
 * GigFeed.jsx — FR-01 Live Gig Feed tab content.
 *
 * Fetches AWS-related freelance gigs from RemoteOK + RSS sources,
 * displays as cards with filter + sort, action buttons feed into the
 * existing Job Analyzer + Proposal Builder flows.
 *
 * Auto-refreshes every 30 minutes; manual refresh button respects the
 * cache so we don't hammer APIs.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  RefreshCw, ExternalLink, Wand2, FileText, AlertTriangle, Briefcase,
  Calendar, DollarSign, Filter, Search, MapPin, CheckCircle2, PlusCircle, Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchAllGigs, clearCache, getCacheAge, GIG_SOURCES } from '../../lib/gigFeed.js';
import { recommendApproach, getApproachById } from '../../lib/approachRecommender.js';
import { RateBenchmarkCard } from './RateBenchmarkCard.jsx';
import { cn } from '../../lib/utils.js';
import { assessEntryLevelGig, buildEntryLevelApplicationBrief } from '../../lib/entryLevelGigMatcher.js';
import { assessCareerProgression } from '../../lib/careerProgression.js';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { buildOpportunityLearningProfile, extractOpportunitySkills, scoreOpportunity } from '../../lib/opportunityLearningEngine.js';

const AUTO_REFRESH_MS = 30 * 60 * 1000; // 30 minutes

export function GigFeed() {
  const portfolio = usePortfolio();
  const freelance = useFreelance();
  const career = useMemo(() => assessCareerProgression({
    portfolioIntelligence: portfolio.intelligence,
    projectStats: portfolio.projectStats,
    projects: portfolio.projects,
    proposals: freelance.state.proposals,
  }), [portfolio.intelligence, portfolio.projectStats, portfolio.projects, freelance.state.proposals]);
  const [data, setData] = useState({ gigs: [], sources: {}, fetchedAt: null, fromCache: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marketplaceGigs, setMarketplaceGigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('awscl-pro::v1::marketplace-gigs') || '[]'); }
    catch { return []; }
  });
  const [learningEvents, setLearningEvents] = useLocalStorage('awscl-pro::v1::opportunity-learning', []);
  const portfolioSkills = useMemo(() => portfolio.projects.flatMap((project) => project.services || project.skills || []), [portfolio.projects]);
  const learningProfile = useMemo(() => buildOpportunityLearningProfile({ interactions: learningEvents, proposals: freelance.state.proposals, portfolioSkills }), [learningEvents, freelance.state.proposals, portfolioSkills]);

  // Filters
  const [search, setSearch] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [minBudget, setMinBudget] = useState(0);
  const [datePosted, setDatePosted] = useState('all'); // all | 1d | 7d | 30d
  const [experienceFit, setExperienceFit] = useState('entry'); // entry | stretch | all

  const load = useCallback(async ({ force = false } = {}) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchAllGigs({ force });
      setData(result);
    } catch (err) {
      console.error('[GigFeed] load failed:', err);
      setError('Unable to fetch live gigs — try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 30 min
  useEffect(() => {
    load();
    const interval = setInterval(() => load({ force: true }), AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  function handleRefresh() {
    clearCache();
    load({ force: true });
  }

  function togglePlatform(id) {
    setPlatforms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  useEffect(() => {
    localStorage.setItem('awscl-pro::v1::marketplace-gigs', JSON.stringify(marketplaceGigs.slice(0, 20)));
  }, [marketplaceGigs]);

  // Apply filters
  const filtered = useMemo(() => {
    const now = Date.now();
    const dateThreshold = datePosted === '1d' ? 1 * 24 * 60 * 60 * 1000
                       : datePosted === '7d' ? 7 * 24 * 60 * 60 * 1000
                       : datePosted === '30d' ? 30 * 24 * 60 * 60 * 1000
                       : null;
    return data.gigs.filter((g) => {
      const fit = assessEntryLevelGig(g, { careerLevel: career.current.id });
      if (experienceFit === 'entry' && fit.classification !== 'good-fit') return false;
      if (experienceFit === 'stretch' && fit.classification === 'not-recommended') return false;
      if (platforms.length > 0 && !platforms.includes(g.source)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const blob = `${g.title} ${g.description} ${(g.skills || []).join(' ')} ${g.company || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (dateThreshold && g.postedAt) {
        const age = now - new Date(g.postedAt).getTime();
        if (age > dateThreshold) return false;
      }
      if (minBudget > 0 && g.budget) {
        // Crude — try to extract a numeric component
        const m = g.budget.match(/\$(\d+)/);
        const n = m ? parseInt(m[1], 10) : 0;
        if (n > 0 && n < minBudget) return false;
      }
      return true;
    }).sort((a, b) => scoreOpportunity(b, learningProfile).score - scoreOpportunity(a, learningProfile).score);
  }, [data.gigs, platforms, search, datePosted, minBudget, experienceFit, career.current.id, learningProfile]);

  function recordPreference(gig, outcome) {
    setLearningEvents((events) => [{ id: `${gig.id}-${Date.now()}`, opportunityId: gig.id, title: gig.title, skills: extractOpportunitySkills(gig), outcome, sourceType: gig.importedByUser ? 'imported' : 'live-feed', at: new Date().toISOString() }, ...events].slice(0, 300));
  }

  const cacheAgeMin = useMemo(() => {
    const age = getCacheAge();
    return age ? Math.floor(age / 60000) : null;
  }, [data.fetchedAt]);

  const fitSummary = useMemo(() => data.gigs.reduce((counts, gig) => {
    const classification = assessEntryLevelGig(gig, { careerLevel: career.current.id }).classification;
    if (classification === 'good-fit') counts.entry += 1;
    else if (classification === 'stretch') counts.stretch += 1;
    else counts.notRecommended += 1;
    return counts;
  }, { entry: 0, stretch: 0, notRecommended: 0 }), [data.gigs, career.current.id]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="surface rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
              FR-01 · Live Gig Feed
            </div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Briefcase size={18} className="text-aws-orange" />
              Entry-Level AWS Gig Finder
              {!loading && (
                <span className="text-xs font-bold opacity-70 px-2 py-0.5 rounded-full bg-[var(--card-2)]">
                  {filtered.length} of {data.gigs.length}
                </span>
              )}
            </h2>
            <p className="text-[12px] opacity-80 mt-1">
              Prioritizes junior AWS, networking, support, documentation, and low-risk planning work. Every match is scored conservatively before you apply.
              <span className="block mt-1 text-aws-orange font-bold">Current evidence-based level: {career.current.label} · {career.score}/100</span>
              <span className="block mt-1 opacity-70">Live remote job boards only. Upwork does not provide this app a public job-feed API, so Upwork posts must be opened there or pasted into Job Analyzer.</span>
              {data.fetchedAt && (
                <span className="opacity-60"> · Last refresh {cacheAgeMin != null ? `${cacheAgeMin} min ago` : 'just now'}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh now'}
          </button>
        </div>

        {/* Source status pills */}
        <div className="flex flex-wrap gap-1.5">
          {GIG_SOURCES.map((src) => {
            const status = data.sources?.[src.id];
            const ok = status?.ok;
            return (
              <span
                key={src.id}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                  ok ? 'bg-success/15 border-success/40 text-success'
                  : status ? 'bg-danger/15 border-danger/40 text-danger'
                  : 'bg-[var(--card-2)] border-token opacity-60'
                )}
                title={status?.error || (ok ? `${status.count} gigs from ${src.label}` : '')}
              >
                {ok ? <CheckCircle2 size={9} /> : <AlertTriangle size={9} />}
                {src.label} {ok ? `· ${status.count}` : status ? '· down' : '· loading'}
              </span>
            );
          })}
        </div>

        {/* Filter row */}
        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <select
            value={experienceFit}
            onChange={(e) => setExperienceFit(e.target.value)}
            className="rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer"
            title="Filter by experience fit"
          >
            <option value="entry">Entry-level matches</option>
            <option value="stretch">Entry + stretch gigs</option>
            <option value="all">All AWS gigs</option>
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Search title, skills, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg bg-[var(--card-2)] border border-token pl-7 pr-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </div>
          <select
            value={datePosted}
            onChange={(e) => setDatePosted(e.target.value)}
            className="rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer"
            title="Filter by date posted"
          >
            <option value="all">Any time</option>
            <option value="1d">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <select
            value={minBudget}
            onChange={(e) => setMinBudget(parseInt(e.target.value, 10))}
            className="rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] font-bold cursor-pointer"
            title="Filter by minimum budget"
          >
            <option value={0}>Any budget</option>
            <option value={25}>$25+</option>
            <option value={50}>$50+</option>
            <option value={100}>$100+</option>
            <option value={1000}>$1k+</option>
          </select>
          <div className="flex flex-wrap gap-1">
            {GIG_SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => togglePlatform(s.id)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition',
                  platforms.includes(s.id)
                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                    : 'border-token text-muted hover:text-current'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <MarketplaceGigImport
        gigs={marketplaceGigs}
        career={career}
        learningProfile={learningProfile}
        learningEvents={learningEvents}
        onPreference={recordPreference}
        onAdd={(gig) => setMarketplaceGigs((current) => [gig, ...current].slice(0, 20))}
        onRemove={(id) => setMarketplaceGigs((current) => current.filter((gig) => gig.id !== id))}
      />

      {/* Error banner */}
      {error && (
        <div className="surface rounded-2xl border border-danger/40 bg-danger/5 p-4 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-danger mt-0.5 flex-shrink-0" />
          <div className="text-[13px] opacity-90">{error}</div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && data.gigs.length === 0 && (
        <div className="surface rounded-2xl p-12 text-center opacity-70">
          <RefreshCw size={28} className="mx-auto mb-3 animate-spin text-aws-orange" />
          <div className="text-sm">Fetching live gigs from {GIG_SOURCES.length} sources…</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && !error && (
        <div className="surface rounded-2xl p-8 text-center">
          <Briefcase size={28} className="mx-auto mb-3 opacity-50" />
          {experienceFit === 'entry' && data.gigs.length > 0 ? (
            <>
              <div className="text-sm font-bold mb-1">{data.gigs.length} live opportunities scanned — no safe entry-level match today</div>
              <div className="text-[12px] opacity-75 max-w-xl mx-auto">
                The scanner did not lose the results: it screened out {fitSummary.notRecommended} unsuitable roles and found {fitSummary.stretch} that may be possible with careful review.
              </div>
              {fitSummary.stretch > 0 && (
                <button
                  type="button"
                  onClick={() => setExperienceFit('stretch')}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-aws-orange px-4 py-2 text-xs font-extrabold text-black hover:brightness-110"
                >
                  Review {fitSummary.stretch} stretch {fitSummary.stretch === 1 ? 'gig' : 'gigs'} safely
                </button>
              )}
            </>
          ) : (
            <>
              <div className="text-sm font-bold mb-1">No gigs match the selected filters</div>
              <div className="text-[12px] opacity-75">Clear the search, platform, date, or budget filters—or refresh the live sources.</div>
            </>
          )}
        </div>
      )}

      {/* Cards grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.slice(0, 60).map((g) => <GigCard key={g.id} gig={g} career={career} learningProfile={learningProfile} learningEvents={learningEvents} onPreference={recordPreference} />)}
        </div>
      )}

      {filtered.length > 60 && (
        <div className="text-center text-[11px] opacity-60 italic">
          Showing first 60 results — narrow with filters to see more relevant gigs.
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Single gig card
// ════════════════════════════════════════════════════════════════════
function MarketplaceGigImport({ gigs, career, learningProfile, learningEvents, onPreference, onAdd, onRemove }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ platform: 'Upwork', title: '', budget: '', url: '', description: '' });
  const [formError, setFormError] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addGig(event) {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title || description.length < 30) {
      setFormError('Add the gig title and at least 30 characters from the job description.');
      return;
    }
    const url = form.url.trim();
    if (url && !/^https?:\/\//i.test(url)) {
      setFormError('The listing link must begin with https:// (or leave it blank).');
      return;
    }
    setFormError('');
    onAdd({
      id: `marketplace-${Date.now()}`,
      title,
      description,
      budget: form.budget.trim() || null,
      url: url || null,
      source: `marketplace-${form.platform.toLowerCase().replace(/\s+/g, '-')}`,
      sourceLabel: form.platform,
      postedAt: new Date().toISOString(),
      location: 'Remote',
      company: null,
      skills: [],
      importedByUser: true,
    });
    setForm((current) => ({ ...current, title: '', budget: '', url: '', description: '' }));
  }

  return (
    <section className="surface rounded-2xl p-5 border border-aws-orange/30">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">Marketplace Gig Import & Match</div>
          <h3 className="text-lg font-extrabold mt-1">Found a priced gig on Upwork or another marketplace?</h3>
          <p className="text-[12px] opacity-75 mt-1 max-w-3xl">Paste the listing once. The app scores it against your current level and carries the exact requirements and amount into your proposal and delivery workflow. It never signs in, scrapes, submits, or accepts work for you.</p>
        </div>
        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-aws-orange text-ink-950 text-xs font-extrabold">
          <PlusCircle size={14} /> {open ? 'Close importer' : 'Import marketplace gig'}
        </button>
      </div>

      {open && (
        <form onSubmit={addGig} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl bg-[var(--card-2)] border border-token p-4">
          <select value={form.platform} onChange={(e) => update('platform', e.target.value)} className="rounded-lg bg-[var(--surface)] border border-token px-3 py-2 text-sm">
            {['Upwork', 'Fiverr', 'Freelancer', 'PeoplePerHour', 'Direct client', 'Other'].map((name) => <option key={name}>{name}</option>)}
          </select>
          <input value={form.budget} onChange={(e) => update('budget', e.target.value)} placeholder="Amount, e.g. $200 fixed or $20/hour" className="rounded-lg bg-[var(--surface)] border border-token px-3 py-2 text-sm" />
          <input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Gig title" className="md:col-span-2 rounded-lg bg-[var(--surface)] border border-token px-3 py-2 text-sm" />
          <input value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="Listing URL (optional)" className="md:col-span-2 rounded-lg bg-[var(--surface)] border border-token px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={6} placeholder="Paste the full job description, deliverables, required services and client constraints" className="md:col-span-2 rounded-lg bg-[var(--surface)] border border-token px-3 py-2 text-sm resize-y" />
          {formError && <div className="md:col-span-2 text-xs font-bold text-danger">{formError}</div>}
          <button type="submit" className="md:col-span-2 inline-flex justify-center items-center gap-2 rounded-lg bg-gradient-aws text-ink-950 px-4 py-2.5 text-sm font-extrabold"><Wand2 size={15} /> Match and prepare this gig</button>
        </form>
      )}

      {gigs.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-extrabold mb-2">Your imported marketplace gigs ({gigs.length})</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {gigs.map((gig) => (
              <div key={gig.id} className="relative">
                <button type="button" onClick={() => onRemove(gig.id)} className="absolute right-3 bottom-3 z-10 p-1.5 rounded-md border border-danger/40 text-danger bg-[var(--surface)]" title="Remove imported gig"><Trash2 size={12} /></button>
                <GigCard gig={gig} career={career} learningProfile={learningProfile} learningEvents={learningEvents} onPreference={onPreference} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GigCard({ gig, career, learningProfile, learningEvents = [], onPreference }) {
  // Generate links for the action buttons
  const fit = assessEntryLevelGig(gig, { careerLevel: career.current.id });
  const applicationBrief = buildEntryLevelApplicationBrief(gig, { careerLevel: career.current.id, headline: career.current.headline });
  const briefForActions = encodeURIComponent(applicationBrief);
  const proposalHref = `/freelance?tab=proposals&sub=smart&prefill=${briefForActions}`;
  const analyzeHref = `/job-analyzer?prefill=${briefForActions}`;
  const generateHref = `/walkthroughs/deep/new?title=${encodeURIComponent(gig.title)}&brief=${briefForActions}&source=freelance`;
  // GIG-01: carry the whole gig (not just text) into Solution Studio so it
  // keeps the budget, company, skills + source link for the solution header.
  const solutionHref = `/solution?gig=${encodeGig(gig)}`;

  const postedAgo = gig.postedAt ? humanAge(gig.postedAt) : null;
  const learnedMatch = learningProfile ? scoreOpportunity(gig, learningProfile) : null;
  const lastPreference = learningEvents.find((event) => event.opportunityId === gig.id)?.outcome;

  return (
    <div className="surface rounded-2xl p-4 flex flex-col gap-2 hover:border-aws-orange/30 border border-transparent transition">
      {/* Header — title + source + posted */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-extrabold leading-snug">{gig.title}</h3>
          {gig.company && (
            <div className="text-[11.5px] opacity-75 mt-0.5">{gig.company}</div>
          )}
        </div>
        <span className="px-2 py-0.5 rounded-full bg-[var(--card-2)] border border-token text-[9.5px] font-extrabold uppercase tracking-wide flex-shrink-0">
          {gig.sourceLabel}
        </span>
      </div>

      {/* Description preview */}
      {gig.description && (
        <p className="text-[12px] opacity-80 leading-snug line-clamp-2">{gig.description}</p>
      )}

      <div className={cn(
        'rounded-lg border px-2.5 py-2 text-[11px]',
        fit.classification === 'good-fit' ? 'border-success/40 bg-success/10'
          : fit.classification === 'stretch' ? 'border-amber-400/40 bg-amber-400/10'
          : 'border-danger/40 bg-danger/10'
      )}>
        <div className="font-extrabold">{fit.label} · {fit.score}/100</div>
        <div className="opacity-80 mt-0.5">{fit.reasons[0]}</div>
        {fit.cautions[0] && <div className="text-amber-300 mt-0.5">Review: {fit.cautions[0]}</div>}
      </div>

      {learnedMatch && (
        <div className="text-[10.5px] opacity-75">Personal learning rank: <strong>{learnedMatch.score}/100</strong> · {learnedMatch.confidence} confidence</div>
      )}

      {/* Meta line */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] opacity-75">
        {gig.budget && (
          <span className="inline-flex items-center gap-1 text-success font-bold">
            <DollarSign size={10} /> {gig.budget}
          </span>
        )}
        {postedAgo && (
          <span className="inline-flex items-center gap-1">
            <Calendar size={10} /> {postedAgo}
          </span>
        )}
        {gig.location && (
          <span className="inline-flex items-center gap-1">
            <MapPin size={10} /> {gig.location}
          </span>
        )}
      </div>

      {/* Skills */}
      {gig.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {gig.skills.slice(0, 6).map((s) => (
            <span key={s} className="px-1.5 py-0.5 rounded-full bg-aws-orange/10 text-aws-orange text-[9.5px] font-bold">
              {s}
            </span>
          ))}
          {gig.skills.length > 6 && (
            <span className="text-[9.5px] opacity-50">+{gig.skills.length - 6}</span>
          )}
        </div>
      )}

      {/* FR-04 + FR-06: recommended approach + rate range */}
      <div className="flex flex-wrap items-center gap-1.5">
        <GigApproachBadge gig={gig} />
        <RateBenchmarkCard brief={`${gig.title}\n${gig.description}\n${(gig.skills || []).join(' ')} ${gig.location || ''}`} variant="compact" />
      </div>

      {/* PRIMARY action — the whole point of the app: gig → buildable solution */}
      <Link
        to={solutionHref}
        className="mt-1 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg text-[12px] font-extrabold bg-gradient-aws text-ink-950 hover:brightness-110 transition tap-44"
        title="Create a scoped plan and evidence-gated draft solution"
      >
        <Wand2 size={13} /> Create application + delivery plan
      </Link>

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-token">
        {onPreference && <button type="button" onClick={() => onPreference(gig, 'interested')} className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold border', lastPreference === 'interested' ? 'border-success text-success bg-success/10' : 'border-token')}>Interested</button>}
        {onPreference && <button type="button" onClick={() => onPreference(gig, 'skip')} className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold border', lastPreference === 'skip' ? 'border-danger text-danger bg-danger/10' : 'border-token')}>Not for me</button>}
        {gig.url && (
          <a
            href={gig.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
          >
            <ExternalLink size={10} /> View
          </a>
        )}
        <Link
          to={analyzeHref}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
          title="Run AD-02 + AD-03 + Master Intelligence on this gig"
        >
          <Wand2 size={10} /> Analyse
        </Link>
        <Link
          to={proposalHref}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold bg-aws-orange/15 text-aws-orange border border-aws-orange/30 hover:bg-aws-orange/25 transition"
          title="Open Proposal Builder pre-filled"
        >
          <FileText size={10} /> Proposal
        </Link>
        <Link
          to={generateHref}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
          title="Generate a Deep Walkthrough for this gig"
        >
          ✨ Walkthrough
        </Link>
      </div>
    </div>
  );
}

// FR-04: tiny inline approach recommendation chip on every gig card
function GigApproachBadge({ gig }) {
  const brief = `${gig.title}\n${gig.description}\n${(gig.skills || []).join(' ')}`;
  const rec = recommendApproach({ brief, services: gig.skills || [] });
  const opt = getApproachById(rec.recommended);
  const toneClass = {
    sky: 'text-sky-400 bg-sky-400/10 border-sky-400/30',
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    orange: 'text-aws-orange bg-aws-orange/10 border-aws-orange/30',
    violet: 'text-violet-400 bg-violet-400/10 border-violet-400/30',
  }[opt.tone] || 'text-aws-orange bg-aws-orange/10 border-aws-orange/30';
  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold', toneClass)}
         title={rec.rationale}>
      ✦ Recommended: {opt.label}
    </div>
  );
}

/**
 * Pack a gig into a URL-safe base64 blob for /solution?gig=…
 * Trimmed to the fields Solution Studio actually reads, so the URL stays
 * short enough for every browser. btoa() is latin1-only, hence the
 * unescape(encodeURIComponent(...)) round-trip for non-ASCII job posts.
 */
function encodeGig(gig) {
  const slim = {
    title: gig.title,
    company: gig.company,
    description: (gig.description || '').slice(0, 1200),
    skills: (gig.skills || []).slice(0, 12),
    budget: gig.budget,
    location: gig.location,
    url: gig.url,
    source: gig.source,
    sourceLabel: gig.sourceLabel,
  };
  try {
    return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(slim)))));
  } catch {
    return '';
  }
}

function humanAge(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
