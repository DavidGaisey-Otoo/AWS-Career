import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Briefcase, Cloud, DollarSign, Hammer, Info, Rocket, Search,
  Send, Sprout, Users, Wallet,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { EmptyState } from '../components/common/EmptyState.jsx';
import { StatChip } from '../components/common/StatChip.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { useWorkspace } from '../hooks/useWorkspace.js';
import { buildToday } from '../lib/officeToday.js';
import { ROOMS, roomPath } from '../lib/rooms.js';
import { listLiveStacks } from '../lib/solutionStore.js';
import { cn, formatCurrency } from '../lib/utils.js';

const ROOM_ICONS = { find: Search, jobs: Briefcase, clients: Users, money: Wallet, build: Hammer, grow: Sprout };

const TONE_DOT = { danger: 'bg-danger', warning: 'bg-warning', info: 'bg-electric' };
const KIND_ICON = { invoice: DollarSign, aws: Cloud, followup: Send };

function greeting(now = new Date()) {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/**
 * Today — the front desk of the office.
 *
 * What needs you, in the order it matters: money that is late, AWS that
 * may be costing you, clients waiting on a reply. Then where each job
 * stands, then the doors to every room. The deciding is done in
 * lib/officeToday.js; this page only lays it out.
 */
export default function Today() {
  const { profile } = useApp();
  const { state } = useFreelance();
  const workspace = useWorkspace();

  const today = useMemo(() => buildToday({
    proposals: state?.proposals,
    invoices: state?.invoices,
    payments: state?.payments,
    goals: state?.goals,
    rates: state?.rates,
    liveStacks: listLiveStacks(),
    projects: workspace?.projects,
    now: Date.now(),
  }), [state, workspace]);

  const { earned, owed, openProposals, activeJobs } = today.stats;
  const firstName = (profile?.name || '').trim().split(/\s+/)[0];
  const dateLine = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={dateLine}
        title={firstName ? `${greeting()}, ${firstName}.` : `${greeting()}.`}
        subtitle={today.attention.length
          ? `${today.attention.length} thing${today.attention.length === 1 ? '' : 's'} need${today.attention.length === 1 ? 's' : ''} you today.`
          : 'Nothing is waiting on you. A good day to find the next job.'}
        actions={(
          <Link to="/jobs/new">
            <Button icon={Rocket}>New job from a brief</Button>
          </Link>
        )}
      />

      <section aria-label="This month" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip layout="stacked" icon={Wallet}
          value={formatCurrency(earned.total, earned.currency)}
          label={earned.target ? `Earned this month · ${earned.pct}% of ${formatCurrency(earned.target, earned.currency)}` : 'Earned this month'} />
        <StatChip layout="stacked" icon={DollarSign}
          tone={owed.count ? 'warning' : 'default'}
          value={`${owed.incomplete ? 'at least ' : ''}${formatCurrency(owed.amount, earned.currency)}`}
          label={`Owed to you · ${owed.count} unpaid invoice${owed.count === 1 ? '' : 's'}`} />
        <StatChip layout="stacked" icon={Send} value={openProposals} label="Proposals waiting on a client" />
        <StatChip layout="stacked" icon={Briefcase} value={activeJobs} label="Jobs in progress" />
      </section>

      <section aria-labelledby="needs-you" className="space-y-3">
        <h2 id="needs-you" className="text-lg font-extrabold tracking-tight">Needs you</h2>
        {today.attention.length === 0 ? (
          <EmptyState tone="quiet" icon={Info}
            title="Nothing needs you right now"
            description="Late invoices, follow-ups that are due and AWS resources left running will appear here." />
        ) : (
          <ul className="surface rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
            {today.attention.map((a, i) => {
              const Icon = KIND_ICON[a.kind] || AlertTriangle;
              return (
                <li key={`${a.kind}-${i}`}>
                  <Link to={a.to} className="flex items-start gap-3 p-4 hover:bg-[var(--card-2)] transition focus-ring">
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[a.tone] || TONE_DOT.info)} aria-hidden />
                    <Icon size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{a.title}</span>
                      <span className="block text-xs text-muted mt-0.5">{a.detail}</span>
                    </span>
                    <ArrowRight size={14} className="mt-1 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {today.notes.length > 0 && (
          <ul className="space-y-1">
            {today.notes.map((n) => (
              <li key={n} className="flex items-start gap-2 text-xs text-muted">
                <Info size={12} className="mt-0.5 shrink-0" aria-hidden /> {n}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="jobs-now" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="jobs-now" className="text-lg font-extrabold tracking-tight">Jobs in progress</h2>
          <Link to="/jobs/all" className="text-xs font-bold text-muted hover:text-current">All jobs →</Link>
        </div>
        {today.jobs.length === 0 ? (
          <EmptyState tone="brand" icon={Rocket}
            title="No job in progress"
            description="Paste a client's brief and the app designs the solution, writes the proposal and the email.">
            <Link to="/jobs/new"><Button icon={Rocket}>Start a job</Button></Link>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {today.jobs.slice(0, 6).map((j) => (
              <li key={j.id} className="surface rounded-2xl p-4">
                <div className="text-sm font-bold truncate">{j.title}</div>
                <div className="text-xs text-muted">{j.client || 'Client not recorded'}</div>
                <Link to={j.next.to} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-aws-orange hover:underline">
                  Next: {j.next.label} <ArrowRight size={12} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="rooms" className="space-y-3">
        <h2 id="rooms" className="text-lg font-extrabold tracking-tight">Your office</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROOMS.map((r) => {
            const Icon = ROOM_ICONS[r.id] || Briefcase;
            return (
              <li key={r.id}>
                <Link to={roomPath(r.id, r.tabs[0].id)}
                      className="surface rounded-2xl p-4 flex items-start gap-3 h-full hover:border-aws-orange/40 transition focus-ring">
                  <Icon size={18} className="text-aws-orange mt-0.5 shrink-0" aria-hidden />
                  <span>
                    <span className="block text-sm font-extrabold">{r.label}</span>
                    <span className="block text-xs text-muted mt-0.5">{r.blurb}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
