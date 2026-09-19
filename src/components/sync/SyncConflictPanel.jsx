/**
 * SyncConflictPanel — shown when the cloud copy does not look like this
 * device's account.
 *
 * Sync used to resolve this by timestamp: newer wins, replace everything,
 * say nothing. That is how a throwaway profile created minutes earlier
 * replaced a real account — different name, a third of the progress, no
 * warning and nothing to undo it with.
 *
 * A difference between two copies is not an error and not something a
 * library should decide. It is a question, and it belongs here.
 */
import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { useSync } from '../../context/SyncContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { readRollback, undoLastRestore } from '../../lib/gistSync.js';
import { cn } from '../../lib/utils.js';

export function SyncConflictPanel() {
  const { conflict, clearConflict, pushNow, pullNow } = useSync();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const rollback = readRollback();

  if (!conflict) return null;
  const { local, remote, reasons } = conflict;

  const keepThisDevice = async () => {
    setBusy(true);
    try {
      await pushNow();
      clearConflict();
      toast.success('This device kept. The cloud copy has been replaced with it.');
    } catch (err) {
      toast.error(err.message || 'Could not upload this device.');
    } finally { setBusy(false); }
  };

  const useCloudCopy = async () => {
    setBusy(true);
    try {
      await pullNow();
      clearConflict();
    } catch (err) {
      toast.error(err.message || 'Could not apply the cloud copy.');
    } finally { setBusy(false); }
  };

  const undo = () => {
    try {
      const r = undoLastRestore();
      toast.success(`Restored this device's previous data (${r.keys} items). Sync paused.`);
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const Side = ({ title, d, tone }) => (
    <div className={cn('rounded-xl border p-3', tone)}>
      <div className="text-[10px] uppercase tracking-widest font-bold opacity-70">{title}</div>
      <div className="text-sm font-extrabold mt-1">{d.name || '(no name)'}</div>
      <div className="text-[11px] text-muted mt-1 space-y-0.5">
        <div>{d.questions} questions answered</div>
        <div>{d.keys} items · {(d.bytes / 1024).toFixed(0)} KB</div>
      </div>
    </div>
  );

  return (
    <section className="surface rounded-2xl p-4 border-danger/40 bg-danger/5 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
        <div>
          <h3 className="font-extrabold text-danger text-sm">The cloud copy does not match this device</h3>
          <p className="text-[12px] text-muted mt-1 leading-relaxed">
            Nothing has been changed. Sync stopped rather than overwrite what is here.
          </p>
        </div>
      </div>

      <ul className="text-[12px] space-y-1 pl-1">
        {reasons.map((r, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-danger">•</span><span>{r}</span>
          </li>
        ))}
      </ul>

      <div className="grid sm:grid-cols-2 gap-2">
        <Side title="On this device" d={local} tone="border-success/40 bg-success/5" />
        <Side title="In the cloud" d={remote} tone="border-token bg-[var(--card-2)]" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={keepThisDevice}
          disabled={busy}
          className="btn btn-primary !text-[12px] gap-1.5 disabled:opacity-60"
        >
          <ArrowUp size={13} /> Keep this device, replace the cloud
        </button>
        <button
          onClick={useCloudCopy}
          disabled={busy}
          className="btn btn-ghost !text-[12px] gap-1.5 disabled:opacity-60"
        >
          <ArrowDown size={13} /> Use the cloud copy instead
        </button>
      </div>

      {rollback && (
        <div className="pt-2 border-t border-token">
          <button
            onClick={undo}
            className="text-[11.5px] font-bold text-muted hover:text-aws-orange inline-flex items-center gap-1.5"
          >
            <RotateCcw size={12} />
            Undo the last restore — put back what was here before {new Date(rollback.at).toLocaleString()}
          </button>
        </div>
      )}
    </section>
  );
}
