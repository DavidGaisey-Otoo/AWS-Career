import { ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ProposalTemplates } from '../freelance/ProposalTemplates.jsx';
import { ProposalTracker } from '../freelance/ProposalTracker.jsx';
import { ProposalWinRateTracker } from '../freelance/ProposalWinRateTracker.jsx';
import { SmartProposalGenerator } from '../freelance/SmartProposalGenerator.jsx';
import { cn } from '../../lib/utils.js';

/**
 * Proposals, in one place.
 *
 * The old hub had six proposal tools across two tab rows. Two wrote
 * proposals (the smart generator and an older builder that did the same
 * job less well), two tracked them, one held templates. Now: write one,
 * track them, borrow from a template.
 */
const VIEWS = [
  { id: 'write',     label: 'Write a proposal' },
  { id: 'track',     label: 'Track & follow up' },
  { id: 'templates', label: 'Templates' },
];

export function ProposalsDesk() {
  const [params, setParams] = useSearchParams();
  const view = VIEWS.some((v) => v.id === params.get('view')) ? params.get('view') : 'write';
  const pick = (id) => {
    const next = new URLSearchParams(params);
    next.set('view', id);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck size={18} className="text-success shrink-0 mt-0.5" />
        <p className="text-xs text-muted leading-relaxed">
          <strong className="text-current">What you offer:</strong> AWS solution planning, documentation and
          supervised implementation. Automation prepares and checks the work; you approve scope, credentials,
          cost, deployment and teardown. Never promise a client unattended production operation.
        </p>
      </div>

      <div role="tablist" className="inline-flex gap-1 rounded-xl border border-token p-1">
        {VIEWS.map((v) => (
          <button key={v.id} role="tab" aria-selected={view === v.id} onClick={() => pick(v.id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-bold transition focus-ring',
                    view === v.id ? 'bg-[var(--card-2)] text-current' : 'text-muted hover:text-current',
                  )}>
            {v.label}
          </button>
        ))}
      </div>

      {view === 'write' && <SmartProposalGenerator />}
      {view === 'track' && (
        <div className="space-y-6">
          <ProposalTracker />
          <ProposalWinRateTracker />
        </div>
      )}
      {view === 'templates' && <ProposalTemplates />}
    </div>
  );
}
