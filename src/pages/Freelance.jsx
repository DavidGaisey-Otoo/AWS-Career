import { motion } from 'framer-motion';
import {
  Award, Briefcase, Calculator, DollarSign, FileText, Mail, Megaphone, Radio, Trophy, Users, Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { BrandingEngine } from '../components/freelance/BrandingEngine.jsx';
import { ClientCRM } from '../components/freelance/ClientCRM.jsx';
import { ContractLibrary } from '../components/freelance/ContractLibrary.jsx';
import { CurrencyCenter } from '../components/freelance/CurrencyCenter.jsx';
import { EarningsTracker } from '../components/freelance/EarningsTracker.jsx';
import { EmailOutreach } from '../components/freelance/EmailOutreach.jsx';
import { ExpenseTracker } from '../components/freelance/ExpenseTracker.jsx';
import { FinancialGoals } from '../components/freelance/FinancialGoals.jsx';
import { GigFeed } from '../components/freelance/GigFeed.jsx';
import { InvoiceGenerator } from '../components/freelance/InvoiceGenerator.jsx';
import { ProposalBuilder } from '../components/freelance/ProposalBuilder.jsx';
import { ProposalTemplates } from '../components/freelance/ProposalTemplates.jsx';
import { ProposalTracker } from '../components/freelance/ProposalTracker.jsx';
import { ProposalWinRateTracker } from '../components/freelance/ProposalWinRateTracker.jsx';
import { SmartProposalGenerator } from '../components/freelance/SmartProposalGenerator.jsx';
import { IncomeTrackerCard } from '../components/income/IncomeTrackerCard.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { cn, formatCurrency } from '../lib/utils.js';

const TABS = [
  { id: 'overview',  label: 'Overview',       icon: Briefcase },
  { id: 'gigfeed',   label: 'Live Gigs',      icon: Radio },     // FR-01
  { id: 'proposals', label: 'Proposals',      icon: Wand2 },
  { id: 'myproposals', label: 'My Proposals', icon: Trophy },    // FR-05
  { id: 'outreach',  label: 'Email Outreach', icon: Mail },      // FR-03
  { id: 'clients',   label: 'Clients',        icon: Users },
  { id: 'finance',   label: 'Finance',        icon: DollarSign },
  { id: 'contracts', label: 'Contracts',      icon: FileText },
  { id: 'branding',  label: 'Branding',       icon: Megaphone },
];

const PROPOSAL_SUB = [
  { id: 'smart',     label: '✨ Smart Generator' },  // FR-02
  { id: 'builder',   label: 'Builder' },
  { id: 'tracker',   label: 'Tracker' },
  { id: 'templates', label: 'Templates' },
];

const FINANCE_SUB = [
  { id: 'goals',     label: 'Goals',     icon: Award },
  { id: 'earnings',  label: 'Earnings',  icon: DollarSign },
  { id: 'invoices',  label: 'Invoices',  icon: FileText },
  { id: 'expenses',  label: 'Expenses',  icon: Calculator },
  { id: 'currency',  label: 'Currency',  icon: DollarSign },
];

export default function Freelance() {
  // URL is the single source of truth for tab state. Clicking a tab
  // updates the URL with `replace: true` so the back button skips the
  // intra-page tab changes and goes to the previous PAGE.
  // (Without this, clicking 5 sub-tabs would queue 5 history entries.)
  const [params, setParams] = useSearchParams();

  const tab = TABS.some((x) => x.id === params.get('tab'))
    ? params.get('tab')
    : 'overview';
  const propTab = PROPOSAL_SUB.some((x) => x.id === params.get('sub'))
    ? params.get('sub')
    : 'smart';
  const finTab = ['goals', 'earnings', 'invoices', 'expenses', 'currency'].includes(params.get('fin'))
    ? params.get('fin')
    : 'goals';

  // Setters write to URL — keep other params intact, replace history
  const setTab = (newTab) => {
    const next = new URLSearchParams(params);
    next.set('tab', newTab);
    next.delete('sub');  // reset sub-tab when main tab changes
    next.delete('fin');
    setParams(next, { replace: true });
  };
  const setPropTab = (newSub) => {
    const next = new URLSearchParams(params);
    next.set('sub', newSub);
    setParams(next, { replace: true });
  };
  const setFinTab = (newFin) => {
    const next = new URLSearchParams(params);
    next.set('fin', newFin);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Freelance business center"
        title="Land paid AWS work, faster."
        subtitle="Proposals, CRM, finance, contracts, branding. Everything you need to run cloud freelancing like a real business."
        icon={Briefcase}
      />

      <OverviewStrip />

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                      tab === t.id
                        ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                        : 'text-muted hover:text-current'
                    )}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === 'overview'  && <OverviewTab onJump={(t, sub) => { setTab(t); if (sub) (t === 'proposals' ? setPropTab(sub) : setFinTab(sub)); }} />}
        {tab === 'gigfeed'   && <GigFeed />}
        {tab === 'myproposals' && <ProposalWinRateTracker />}
        {tab === 'outreach'  && <EmailOutreach />}
        {tab === 'proposals' && (
          <div className="space-y-3">
            <SubTabs items={PROPOSAL_SUB} active={propTab} setActive={setPropTab} />
            {propTab === 'smart'     && <SmartProposalGenerator />}
            {propTab === 'builder'   && <ProposalBuilder />}
            {propTab === 'tracker'   && <ProposalTracker />}
            {propTab === 'templates' && <ProposalTemplates />}
          </div>
        )}
        {tab === 'clients' && <ClientCRM />}
        {tab === 'finance' && (
          <div className="space-y-3">
            <SubTabs items={FINANCE_SUB} active={finTab} setActive={setFinTab} />
            {finTab === 'goals'    && <FinancialGoals />}
            {finTab === 'earnings' && <EarningsTracker />}
            {finTab === 'invoices' && <InvoiceGenerator />}
            {finTab === 'expenses' && <ExpenseTracker />}
            {finTab === 'currency' && <CurrencyCenter />}
          </div>
        )}
        {tab === 'contracts' && <ContractLibrary />}
        {tab === 'branding'  && <BrandingEngine />}
      </motion.div>
    </div>
  );
}

// ---------- Overview top strip ----------

function OverviewStrip() {
  const { earningsStats, proposalStats, state, goalProgress } = useFreelance();
  const tiles = useMemo(() => [
    { label: 'This month',   value: formatCurrency(earningsStats.thisMonthUSD),
      tone: goalProgress.onTrack ? 'text-success' : 'text-warning' },
    { label: 'Win rate',     value: `${proposalStats.winRate}%`,
      tone: proposalStats.winRate >= 10 ? 'text-success' : 'text-current' },
    { label: 'Active clients', value: state.clients.filter((c) => c.status === 'active' || c.status === 'vip').length },
    { label: 'Open invoices',  value: state.invoices.filter((i) => i.status !== 'paid').length },
  ], [earningsStats, proposalStats, state, goalProgress]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {tiles.map((t, i) => (
        <div key={i} className="surface rounded-2xl p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{t.label}</div>
          <div className={cn('mt-1 text-2xl font-extrabold tabular-nums tracking-tight', t.tone)}>{t.value}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Overview tab ----------

function OverviewTab({ onJump }) {
  const { earningsStats, proposalStats, state, goalProgress } = useFreelance();
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = state.invoices.filter((i) => i.status === 'sent' && i.dueAt && i.dueAt <= today);
  const overdueFollowUps = state.proposals.filter((p) =>
    p.followUpAt && p.followUpAt < today &&
    !['hired', 'rejected', 'no-response'].includes(p.status));

  return (
    <div className="space-y-4">
      {/* EA-02 — full Income Tracker at top of Overview */}
      <IncomeTrackerCard />

      {/* Headline strip */}
      <section className="grid gap-3 lg:grid-cols-2">
        <div className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-lg font-extrabold tracking-tight">
              {goalProgress.onTrack ? '✓ On track for this month\'s target.' : 'Slightly behind monthly target.'}
            </h2>
            <p className="text-sm text-muted mt-1">
              {formatCurrency(earningsStats.thisMonthUSD)} earned of {formatCurrency(goalProgress.monthlyTargetUSD)}.{' '}
              {goalProgress.daysLeft > 0 ? `${goalProgress.daysLeft} day${goalProgress.daysLeft === 1 ? '' : 's'} left.` : 'Last day of the month.'}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <Mini label="Daily pace"   value={formatCurrency(goalProgress.dailyPace)} />
              <Mini label="Needed/day"   value={formatCurrency(goalProgress.dailyNeededUSD)} />
              <Mini label="YTD"          value={formatCurrency(earningsStats.ytdUSD)} />
            </div>
          </div>
        </div>

        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Proposal funnel</h3>
          <div className="space-y-1.5">
            <FunnelRow label="Sent"      count={proposalStats.total} width={100} />
            <FunnelRow label="Responded" count={proposalStats.responded} width={proposalStats.total ? (proposalStats.responded / proposalStats.total) * 100 : 0} />
            <FunnelRow label="Hired"     count={proposalStats.hired} width={proposalStats.total ? (proposalStats.hired / proposalStats.total) * 100 : 0} tone="success" />
          </div>
        </div>
      </section>

      {/* Action queue */}
      {(dueSoon.length > 0 || overdueFollowUps.length > 0) && (
        <section className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2 text-aws-orange">Today's actions</h3>
          <ul className="space-y-1.5 text-xs">
            {overdueFollowUps.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                <span>Follow up with <strong>{p.clientName || 'client'}</strong> on "{p.jobTitle || 'proposal'}" — due {p.followUpAt}</span>
              </li>
            ))}
            {dueSoon.map((i) => (
              <li key={i.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                <span>Invoice <strong>{i.number}</strong> for <strong>{i.clientName}</strong> is due — {i.dueAt}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Quick jumps */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Jump title="Generate a proposal"    blurb="Paste a JD, get a tailored draft." onClick={() => onJump('proposals', 'builder')} icon={Wand2} />
        <Jump title="Track this week's proposals" blurb="Update statuses + follow-ups." onClick={() => onJump('proposals', 'tracker')} icon={Briefcase} />
        <Jump title="Log a payment"          blurb="Keep earnings + tax estimate live." onClick={() => onJump('finance', 'earnings')} icon={DollarSign} />
        <Jump title="Create an invoice"      blurb="Auto numbering + PDF export." onClick={() => onJump('finance', 'invoices')} icon={FileText} />
        <Jump title="Score your LinkedIn"    blurb="Section-by-section feedback + headlines." onClick={() => onJump('branding')} icon={Megaphone} />
        <Jump title="Find a contract template" blurb="Pick + fill + copy in 30 seconds." onClick={() => onJump('contracts')} icon={FileText} />
      </section>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-md border border-token bg-[var(--card-2)]/40 p-2">
      <div className="text-[9px] uppercase tracking-widest font-bold text-muted">{label}</div>
      <div className="text-sm font-extrabold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

function FunnelRow({ label, count, width, tone }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 font-semibold">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
        <div className={cn('h-full', tone === 'success' ? 'bg-success' : 'bg-gradient-aws')}
             style={{ width: `${Math.max(2, width)}%` }} />
      </div>
      <span className="tabular-nums font-bold w-8 text-right">{count}</span>
    </div>
  );
}

function Jump({ title, blurb, onClick, icon: Icon }) {
  return (
    <button onClick={onClick}
            className="surface rounded-2xl p-4 text-left hover:border-aws-orange/40 transition focus-ring">
      <div className="flex items-start gap-2">
        <span className="w-9 h-9 rounded-xl grid place-items-center bg-gradient-aws text-ink-950">
          <Icon size={16} />
        </span>
        <div>
          <div className="text-sm font-extrabold tracking-tight">{title}</div>
          <div className="text-[11px] text-muted mt-0.5">{blurb}</div>
        </div>
      </div>
    </button>
  );
}

function SubTabs({ items, active, setActive }) {
  return (
    <div className="inline-flex items-center bg-[var(--card-2)] border border-token rounded-xl p-1">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button key={it.id} onClick={() => setActive(it.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition',
                    active === it.id ? 'bg-aws-orange text-ink-950' : 'text-muted hover:text-current'
                  )}>
            {Icon ? <Icon size={11} /> : null} {it.label}
          </button>
        );
      })}
    </div>
  );
}
