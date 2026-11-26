import { useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { RECHECK_DAYS, SECURITY_KEY_SUFFIX, securityStatus, toggleSecurity } from '../../lib/accountSecurity.js';
import { cn } from '../../lib/utils.js';

const BADGE = {
  done: 'text-success',
  todo: 'text-danger',
  recheck: 'text-warning',
  later: 'text-muted',
};
const WORD = { done: 'Done', todo: 'To do', recheck: 'Check again', later: 'Later' };

/**
 * Your own freelance accounts. You tick these yourself; the app cannot
 * see inside Upwork, Gmail or AWS, so a tick is your word, with a date.
 */
export function AccountSecurityPanel() {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}${SECURITY_KEY_SUFFIX}`, {});
  const status = useMemo(() => securityStatus(state), [state]);
  const groups = [...new Set(status.items.map((i) => i.group))];

  return (
    <section className="surface rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-bold"><ShieldCheck size={16} className="text-aws-orange" /> Account security</h2>
        <p className="text-[12.5px] text-muted">
          {status.done} of {status.total} done{status.stale ? `, ${status.stale} to check again` : ''}. You tick these yourself; the app cannot see inside these accounts, so a tick records your word and the date. Ticks older than {RECHECK_DAYS} days ask to be checked again.
        </p>
      </div>
      {groups.map((g) => (
        <div key={g}>
          <div className="text-[11px] uppercase tracking-widest text-muted font-bold mb-1">{g}</div>
          <ul className="space-y-2">
            {status.items.filter((i) => i.group === g).map((i) => (
              <li key={i.id} className="rounded-xl border border-token p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={i.status === 'done' || i.status === 'recheck'} onChange={() => setState((s) => toggleSecurity(s, i.id))} />
                  <span className="flex-1 text-[13px]">
                    <span className="font-semibold">{i.label}</span>
                    <span className={cn('ml-2 text-[11.5px] font-bold', BADGE[i.status])}>{WORD[i.status]}{i.checkedOn ? ` · ${i.checkedOn}` : ''}</span>
                    <span className="block text-[12px] text-muted">{i.why}</span>
                    <span className="block text-[12px]">How: {i.how}</span>
                    {i.hint && i.status === 'todo' && <span className="block text-[12px] text-warning">{i.hint}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
