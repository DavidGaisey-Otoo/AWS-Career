/**
 * SyncStatusChip.jsx — header indicator for cross-device sync.
 *
 * Smart-routing:
 *   - No GitHub PAT          → opens the modal (which guides setup)
 *   - PAT present, sync off  → ONE-TAP enable, no modal needed
 *   - Sync on, working/error → opens the modal for status / fix
 */

import { CheckCircle2, CloudOff, Loader2, AlertCircle, KeyRound, Cloud } from 'lucide-react';
import { useState } from 'react';
import { useSync } from '../../context/SyncContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { readToken } from '../../lib/githubToken.js';
import { hasGithubAppSession } from '../../lib/githubAppAuth.js';
import { cn } from '../../lib/utils.js';

export function SyncStatusChip() {
  const { status, enabled, setOpenModal, enable } = useSync();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const hasToken = hasGithubAppSession() || !!readToken()?.token;

  async function handleClick() {
    // If sync is OFF: try to flip it on directly. The modal is the
    // fallback when there's no token (it explains how to get one) or
    // when GitHub repository permissions are missing (it shows the fix card).
    if (!enabled) {
      if (!hasToken) { setOpenModal(true); return; }
      setBusy(true);
      try {
        const r = await enable();
        if (r?.ok) {
          toast.success('Sync on — your data is now in an access-controlled private repository.');
        } else {
          // Surface the failure via the modal so the user sees the fix card
          setOpenModal(true);
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    // Sync is ON: open status / advanced
    setOpenModal(true);
  }

  // ── States ────────────────────────────────────────────────────────
  if (!enabled) {
    return (
      <button
        onClick={handleClick}
        disabled={busy}
        title="Turn on cross-device sync"
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-aws-orange/40 bg-aws-orange/10 text-aws-orange hover:bg-aws-orange/20 transition',
          busy && 'opacity-60 cursor-wait'
        )}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Cloud size={12} />}
        <span className="hidden sm:inline">{busy ? 'Setting up…' : 'Turn on sync'}</span>
        <span className="sm:hidden">{busy ? '…' : 'Sync'}</span>
      </button>
    );
  }

  const tones = {
    syncing:    { class: 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange', Icon: Loader2, label: 'Syncing…', spin: true },
    synced:     { class: 'border-success/40 bg-success/10 text-success',          Icon: CheckCircle2, label: 'Synced' },
    idle:       { class: 'border-success/40 bg-success/10 text-success',          Icon: CheckCircle2, label: 'Synced' },
    error:      { class: 'border-danger/40 bg-danger/10 text-danger',             Icon: AlertCircle,  label: 'Sync issue' },
    'no-token': { class: 'border-warning/40 bg-warning/10 text-warning',          Icon: KeyRound,     label: 'Connect GitHub' },
    disabled:   { class: 'border-token opacity-60',                                Icon: CloudOff,     label: 'Off' },
  };
  const t = tones[status] || tones.idle;
  const Icon = t.Icon;

  return (
    <button
      onClick={handleClick}
      title={`Cross-device sync — ${t.label}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10.5px] font-bold border transition',
        t.class
      )}
    >
      <Icon size={12} className={cn(t.spin && 'animate-spin')} />
      <span className="hidden sm:inline">{t.label}</span>
    </button>
  );
}
