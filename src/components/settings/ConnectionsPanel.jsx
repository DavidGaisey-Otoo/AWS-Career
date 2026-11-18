import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, CircleDashed, AlertTriangle, MinusCircle } from 'lucide-react';
import { useDeploy } from '../../context/DeployContext.jsx';
import { useSync } from '../../context/SyncContext.jsx';
import { describeConnections, summarise } from '../../lib/connections.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { hasGithubAppSession } from '../../lib/githubAppAuth.js';
import { getClientId, isConnected as googleConnected } from '../../lib/googleCalendar.js';
import { isEnabled as localAIEnabled } from '../../lib/localLLM.js';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/Button.jsx';

const STATUS = {
  connected: { icon: CheckCircle2, cls: 'text-success', word: 'Connected' },
  attention: { icon: AlertTriangle, cls: 'text-warning', word: 'Needs you' },
  off:       { icon: CircleDashed, cls: 'text-muted', word: 'Not set up' },
  separate:  { icon: MinusCircle, cls: 'text-muted', word: 'Separate app' },
};

function readLegacyGithubToken() {
  try { return Boolean(localStorage.getItem(`${STORAGE_KEY}::github::token`)); } catch { return false; }
}

/** Gather what this browser can see right now. Never throws. */
export function useConnections() {
  const sync = useSync();
  const deploy = useDeploy();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  return useMemo(() => {
    const safe = (fn) => { try { return fn(); } catch { return false; } };
    return describeConnections({
      sync: { enabled: sync?.enabled, status: sync?.status, meta: sync?.meta },
      github: { signedIn: safe(hasGithubAppSession) || readLegacyGithubToken() },
      google: { connected: safe(googleConnected), clientIdSet: Boolean(safe(getClientId)) },
      vault: { exists: Boolean(deploy?.hasVault) },
      localAI: { enabled: safe(localAIEnabled) },
      online,
    });
  }, [sync?.enabled, sync?.status, sync?.meta, deploy?.hasVault, online]);
}

/**
 * Settings → Connections. Every link between the office and the world
 * around it, its honest status, and the one button that fixes it.
 */
export function ConnectionsPanel() {
  const list = useConnections();
  const counts = summarise(list);
  const sync = useSync();
  const nav = useNavigate();

  const act = (action) => {
    switch (action) {
      case 'sync': sync?.setOpenModal?.(true); break;
      case 'github':
      case 'google':
      case 'local-ai': nav('/settings?section=integrations'); break;
      case 'aws': nav('/build/accounts'); break;
      case 'drawio': nav('/build/diagram'); break;
      default: break;
    }
  };
  const label = (c) => (c.status === 'connected' ? 'Open' : c.status === 'attention' ? 'Fix' : 'Set up');

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {counts.connected} of {counts.total} connected
        {counts.attention ? ` · ${counts.attention} need${counts.attention === 1 ? 's' : ''} you` : ''}.
        {' '}Statuses are what this browser can see; nothing here contacts AWS to check.
      </p>
      <ul className="surface rounded-2xl divide-y divide-[var(--border)]">
        {list.map((c) => {
          const st = STATUS[c.status] || STATUS.off;
          const Icon = st.icon;
          return (
            <li key={c.id} className="flex flex-wrap items-start gap-3 p-4">
              <Icon size={18} className={cn('mt-0.5 shrink-0', st.cls)} aria-hidden />
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-bold">
                  {c.label} <span className={cn('ml-1 text-[11px] font-semibold', st.cls)}>{st.word}</span>
                </div>
                <p className="text-xs text-muted mt-0.5 leading-relaxed">{c.detail}</p>
                {c.note && <p className="text-[11px] text-warning mt-1">{c.note}</p>}
              </div>
              {c.action && (
                <Button size="sm" variant={c.status === 'connected' ? 'ghost' : 'primary'} onClick={() => act(c.action)}>
                  {label(c)}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
