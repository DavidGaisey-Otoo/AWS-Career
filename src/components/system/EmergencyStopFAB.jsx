/**
 * EmergencyStopFAB.jsx — the always-visible "nuclear button" for AWS costs.
 *
 * Lives in the bottom-right corner globally (mounted in AppShell).
 * When the user clicks, opens a confirm dialog requiring "STOP" typed.
 * On confirm:
 *   • Iterates every running deployment in AWSContext + destroys it
 *   • Renders a completion report (resources destroyed, cost saved)
 *
 * Designed for the "I see unexpected charges" panic moment.
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

  // Count live deployments + resources for the badge
  const liveDeployments = (aws?.state?.deployments || []).filter((d) => d.status === 'complete' || d.status === 'running');
  const liveResources = (aws?.state?.resources || []).length;

  function destroyAll() {
    setBusy(true);
    try {
      const before = {
        deployments: liveDeployments.length,
        resources: liveResources,
      };
      const totalHourly = (aws?.state?.resources || []).reduce((s, r) => s + (r.hourly || 0), 0);
      aws.destroyAll?.();
      const savedPerMonth = Math.round(totalHourly * 24 * 30 * 100) / 100;
      setReport({
        ok: true,
        deploymentsDestroyed: before.deployments,
        resourcesDestroyed: before.resources,
        estMonthlySaved: savedPerMonth,
      });
      toast.success(`🚨 Destroyed ${before.deployments} deployment(s) · ${before.resources} resource(s).`);
    } catch (err) {
      setReport({ ok: false, error: err.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  const ready = confirmText === 'STOP';

  return (
    <>
      <motion.button
        onClick={() => { setOpen(true); setConfirmText(''); setReport(null); }}
        className="fixed bottom-6 right-6 z-[80] grid place-items-center w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white hover:scale-105 transition-all focus-ring"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        title={`Emergency Stop — destroy ${liveResources} live AWS resource${liveResources === 1 ? '' : 's'}`}
        aria-label="Emergency Stop — destroy all AWS resources"
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
                  Immediately destroys <strong>ALL {liveResources} tracked resource{liveResources === 1 ? '' : 's'}</strong> across <strong>{liveDeployments.length} deployment{liveDeployments.length === 1 ? '' : 's'}</strong>.
                </p>
                <p className="text-xs opacity-70 mt-2">
                  Use this if you see unexpected charges, made a mistake, or want to clean up after testing.
                  This action cannot be undone — terminated resources are gone.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 mb-4 text-xs">
              <strong className="text-rose-300">⚠️ Local tracking only:</strong> this destroys the resources this app
              knows about (from the deploy console / approvals). If you created resources via the AWS console directly,
              you\'ll need to delete those manually. The Orphan Scanner can help find them.
            </div>

            <label className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1.5 block">
              Type <span className="font-mono text-rose-300">STOP</span> to confirm
            </label>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="STOP"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm font-mono focus:border-rose-400 focus:outline-none"
            />

            <div className="mt-5 flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={destroyAll} disabled={!ready || busy} icon={Trash2}>
                {busy ? 'Destroying…' : `🚨 Destroy ${liveResources} resource${liveResources === 1 ? '' : 's'}`}
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
                <h2 className="text-xl font-bold">{report.ok ? 'All clear ✓' : 'Couldn\'t complete'}</h2>
                <p className="text-sm opacity-80 mt-1">
                  {report.ok
                    ? `Destroyed ${report.deploymentsDestroyed} deployment(s) + ${report.resourcesDestroyed} resource(s).`
                    : report.error}
                </p>
              </div>
            </div>

            {report.ok && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Deployments</div>
                  <div className="text-2xl font-bold mt-1">{report.deploymentsDestroyed}</div>
                </div>
                <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Resources</div>
                  <div className="text-2xl font-bold mt-1">{report.resourcesDestroyed}</div>
                </div>
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-widest text-success">Saved / mo</div>
                  <div className="text-2xl font-bold mt-1 text-success">${report.estMonthlySaved.toFixed(2)}</div>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs">
              <strong>Next step:</strong> open the AWS Cost Console to confirm — the app\'s view of "destroyed"
              may not match AWS\'s view if resources were created outside this app.
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
