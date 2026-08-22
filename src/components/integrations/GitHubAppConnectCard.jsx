import { AlertTriangle, Check, CheckCircle2, Copy, ExternalLink, Github, Loader2, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import {
  clearGithubAppSession, hasGithubAppSession, pollGithubDeviceFlow,
  readGithubAppSession, startGithubDeviceFlow,
} from '../../lib/githubAppAuth.js';
import { pullSnapshot, restoreLocalStorage, setSyncEnabled } from '../../lib/gistSync.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function GitHubAppConnectCard() {
  const toast = useToast();
  const [connected, setConnected] = useState(() => hasGithubAppSession());
  const [connecting, setConnecting] = useState(false);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [verifyUrl, setVerifyUrl] = useState('https://github.com/login/device');

  useEffect(() => {
    const update = () => setConnected(hasGithubAppSession());
    window.addEventListener('github-auth-change', update);
    return () => window.removeEventListener('github-auth-change', update);
  }, []);

  const connect = async () => {
    setConnecting(true);
    setConnectionError('');
    try {
      const flow = await startGithubDeviceFlow();
      setCode(flow.user_code || '');
      setCopied(false);
      setVerifyUrl(flow.verification_uri || 'https://github.com/login/device');
      if (flow.user_code && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(flow.user_code).then(() => setCopied(true)).catch(() => {});
      }
      const interval = Math.max(Number(flow.interval || 5), 5) * 1000;
      const deadline = Date.now() + Number(flow.expires_in || 900) * 1000;
      while (Date.now() < deadline) {
        await sleep(interval);
        const result = await pollGithubDeviceFlow(flow.device_code);
        if (result.ok) {
          setConnected(true);
          setCode('');
          // A newly approved browser should become useful immediately: locate the
          // deterministic private sync repository, restore it, and enable future sync.
          try {
            const remote = await pullSnapshot();
            if (remote?.snapshot) {
              restoreLocalStorage(remote.snapshot, { mergeStrategy: 'replace' });
              setSyncEnabled(true);
              toast.success('GitHub connected. Your synced data is restored.');
              setTimeout(() => window.location.reload(), 500);
            } else {
              toast.success('GitHub connected. Future access tokens renew automatically.');
            }
          } catch (syncError) {
            // Authentication succeeded and must stay connected even when repository
            // discovery/restore needs separate attention.
            setConnectionError(`GitHub connected, but sync restore needs attention: ${syncError.message || syncError}`);
            toast.success('GitHub connected. Open the sync panel to finish restoring data.');
          }
          return;
        }
        if (!result.pending && result.error !== 'slow_down') throw new Error(result.error_description || result.error);
      }
      throw new Error('GitHub authorization expired. Please try again.');
    } catch (err) {
      const message = err.message || 'Could not connect GitHub.';
      setConnectionError(message);
      toast.error(message);
    } finally {
      setConnecting(false);
    }
  };

  const copyCode = async () => {
    if (!code || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('GitHub code copied.');
  };

  const disconnect = () => {
    clearGithubAppSession();
    setConnected(false);
    toast.success('GitHub disconnected from this browser.');
  };

  const session = readGithubAppSession();
  return (
    <div className="mt-4 rounded-xl border border-token bg-[var(--card-2)]/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <Github size={16} className="text-aws-orange" /> GitHub App connection
            {connected && <span className="chip border border-success/40 bg-success/10 text-success text-[9px]"><CheckCircle2 size={10} /> Connected</span>}
          </div>
          <p className="mt-1 text-[11px] text-muted max-w-xl">
            Secure sign-in for portfolio publishing and sync. Short-lived access automatically renews; no 90-day token copying.
          </p>
          {connected && session?.expiresAt && <p className="mt-1 text-[10px] text-muted">Access renews automatically before {new Date(session.expiresAt).toLocaleString()}.</p>}
        </div>
        {connected ? (
          <button type="button" onClick={disconnect} className="btn-secondary text-xs inline-flex items-center gap-1.5"><LogOut size={13} /> Disconnect</button>
        ) : (
          <button type="button" onClick={connect} disabled={connecting} className="btn-primary text-xs inline-flex items-center gap-1.5">
            {connecting ? <Loader2 size={13} className="animate-spin" /> : <Github size={13} />}
            {connecting ? 'Waiting for GitHub…' : 'Connect GitHub'}
          </button>
        )}
      </div>
      {code && (
        <div className="mt-3 rounded-lg border border-aws-orange/30 bg-aws-orange/5 p-3 text-xs">
          <div className="font-bold">Your GitHub code is ready. Keep this app tab open.</div>
          <ol className="mt-2 space-y-2">
            <li className="flex flex-wrap items-center gap-2">
              <strong>1. Copy:</strong>
              <code className="font-mono font-extrabold text-aws-orange text-base tracking-wider select-all">{code}</code>
              <button type="button" onClick={copyCode} className="btn-secondary !px-3 !py-2 text-[11px] inline-flex items-center gap-1 tap-44">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Code copied' : 'Copy code'}
              </button>
            </li>
            <li className="flex flex-wrap items-center gap-2">
              <strong>2. Then:</strong>
              <a href={verifyUrl} target="_blank" rel="noreferrer" className="btn-primary !px-3 !py-2 text-[11px] inline-flex items-center gap-1 tap-44">
                Open GitHub and paste <ExternalLink size={12} />
              </a>
            </li>
          </ol>
          <p className="mt-2 text-[10.5px] text-muted leading-relaxed">
            After GitHub says the device is connected, return to this app tab. It is already waiting and will restore your synced data automatically.
          </p>
        </div>
      )}
      {connectionError && (
        <div className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-3 text-[11px] flex items-start gap-2" role="alert">
          <AlertTriangle size={14} className="text-danger shrink-0 mt-0.5" />
          <div><strong>Connection needs attention.</strong> {connectionError}</div>
        </div>
      )}
    </div>
  );
}
