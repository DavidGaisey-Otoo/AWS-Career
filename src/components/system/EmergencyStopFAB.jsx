/**
 * EmergencyStopFAB.jsx — emergency guidance and local-record cleanup.
 *
 * Lives in the bottom-right corner globally (mounted in AppShell).
 * AWSContext contains planning/legacy records only; this component never
 * claims that clearing them deleted resources in AWS.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, XCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useAWS } from '../../context/AWSContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export function EmergencyStopFAB() {
  const aws = useAWS();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);

  // These are legacy/unverified local records, not a live AWS inventory.
  const liveDeployments = (aws?.state?.deployments || []).filter((d) => d.status === 'complete' || d.status === 'running');
  const liveResources = (aws?.state?.resources || []).length;

  function clearLocalRecords() {
    setBusy(true);
    try {
      const before = {
        deployments: liveDeployments.length,
        resources: liveResources,
      };
      aws.destroyAll?.();
      setReport({
        ok: true,
        deploymentsCleared: before.deployments,
        resourcesCleared: before.resources,
      });
      toast.info(`Cleared ${before.deployments} planning record(s) and ${before.resources} unverified resource record(s). No AWS API call was made.`);
    } catch (err) {
      setReport({ ok: false, error: err.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  const ready = confirmText === 'CLEAR';

  return (
    <>
      <motion.button
        onClick={() => { setOpen(true); setConfirmText(''); setReport(null); }}
        className="fixed bottom-6 right-6 z-[80] grid place-items-center w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:scale-105 transition-all focus-ring"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        title="Emergency AWS guidance"
        aria-label="Open emergency AWS guidance"
      >
        <ShieldAlert size={22} strokeWidth={2.5} />
        {liveResources > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 rounded-full bg-amber-400 text-black text-[10px] font-bold grid place-items-center px-1 border-2 border-[var(--bg)]">
            {liveResources}
          </span>
        )}
      </motion.button>

      <Modal open={open} onClose={() => !busy && setOpen(false)} size="md" title={null} dismissable={!busy}>
        {!report ? (
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-300 grid place-items-center">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">🚨 Emergency Stop</h2>
                <p className="text-sm opacity-80 mt-1">
                  Review urgent cleanup steps and clear <strong>{liveResources} unverified local resource record{liveResources === 1 ? '' : 's'}</strong>.
                </p>
                <p className="text-xs opacity-70 mt-2">
                  If you see unexpected charges, open AWS Billing and CloudFormation immediately. This button cannot terminate AWS resources because these local records are not verified deployment evidence.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 mb-4 text-xs">
              <strong className="text-rose-300">No AWS deletion occurs here.</strong> Delete verified stacks through Deploy Console and confirm <code>DELETE_COMPLETE</code> in CloudFormation. Use AWS Resource Explorer, Tag Editor, and Billing to find anything else.
            </div>

            <label className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1.5 block">
              Type <span className="font-mono text-rose-300">CLEAR</span> to clear local records
            </label>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="CLEAR"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm font-mono focus:border-rose-400 focus:outline-none"
            />

            <div className="mt-5 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={clearLocalRecords} disabled={!ready || busy} icon={Trash2}>
                {busy ? 'Clearing…' : `Clear ${liveResources} local record${liveResources === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-4">
              <div className={`shrink-0 w-12 h-12 rounded-2xl grid place-items-center ${
                report.ok ? 'bg-success/15 text-success' : 'bg-rose-500/15 text-rose-300'
              }`}>
                {report.ok ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{report.ok ? 'Local records cleared' : 'Couldn\'t complete'}</h2>
                <p className="text-sm opacity-80 mt-1">
                  {report.ok
                    ? `Cleared ${report.deploymentsCleared} planning record(s) and ${report.resourcesCleared} unverified resource record(s). No AWS deletion was attempted.`
                    : report.error}
                </p>
              </div>
            </div>

            {report.ok && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Deployments</div>
                  <div className="text-2xl font-bold mt-1">{report.deploymentsCleared}</div>
                </div>
                <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Resources</div>
                  <div className="text-2xl font-bold mt-1">{report.resourcesCleared}</div>
                </div>
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-warning">AWS deletions</div>
                  <div className="text-2xl font-bold mt-1 text-warning">0 verified</div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
              <strong>Required next step:</strong> open AWS Billing and CloudFormation. Only AWS service responses can confirm deletion and stopped billing.
            </div>

            <div className="mt-5 flex justify-end">
              <Button variant="primary" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
