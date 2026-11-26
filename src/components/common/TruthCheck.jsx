import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils.js';

/**
 * The truth check result, shown above anything you are about to copy to a
 * client. Blockers are claims your facts say are false; the copy buttons
 * stay locked until they are gone.
 */
export function TruthCheckPanel({ result, className = '' }) {
  if (!result) return null;
  const { blockers = [], verify = [] } = result;
  const Icon = blockers.length ? ShieldAlert : verify.length ? ShieldQuestion : ShieldCheck;
  const tone = blockers.length ? 'text-danger' : verify.length ? 'text-warning' : 'text-success';
  const heading = blockers.length
    ? `Truth check: ${blockers.length} claim${blockers.length === 1 ? '' : 's'} your facts do not support`
    : verify.length ? 'Truth check: nothing false, a few things to double-check' : 'Truth check: every claim matches your facts';

  return (
    <div className={cn('surface rounded-2xl p-4 space-y-2', className)} role={blockers.length ? 'alert' : 'status'}>
      <div className={cn('flex items-center gap-2 text-[13px] font-bold', tone)}>
        <Icon size={16} /> {heading}
      </div>
      {blockers.length > 0 && (
        <ul className="space-y-2">
          {blockers.map((b, i) => (
            <li key={`${b.id}-${i}`} className="text-[12.5px] leading-relaxed">
              {b.quote && <div className="text-muted italic">“{b.quote}”</div>}
              <div><span className="text-danger font-semibold">{b.why}</span> {b.fix}</div>
            </li>
          ))}
        </ul>
      )}
      {verify.length > 0 && (
        <ul className="space-y-1 text-[12px] text-muted">
          {verify.map((v, i) => <li key={`${v.id}-${i}`}>• {v.why} {v.fix}</li>)}
        </ul>
      )}
      <p className="text-[11.5px] text-muted">
        Checked against <Link to="/grow/facts" className="underline hover:text-aws-orange">My facts</Link>. Copying is locked while a claim is false.
      </p>
    </div>
  );
}
