/**
 * SyncStatusChip.jsx — small header indicator showing sync state.
 * Click to open the SyncModal.
 */

import { CheckCircle2, CloudOff, Loader2, RefreshCw, AlertCircle, KeyRound } from 'lucide-react';
import { useSync } from '../../context/SyncContext.jsx';
import { cn } from '../../lib/utils.js';

export function SyncStatusChip() {
  const { status, enabled, setOpenModal } = useSync();

  if (!enabled) {
    return (
      <button
        onClick={() => setOpenModal(true)}
        title="Cross-device sync is off — click to enable"
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-bold border border-token opacity-70 hover:opacity-100 hover:border-aws-orange/40 transition"
      >
        <CloudOff size={11} />
        Sync off
      </button>
    );
  }

  const tones = {
    syncing:  { class: 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange', Icon: Loader2, label: 'Syncing…', spin: true },
    synced:   { class: 'border-success/40 bg-success/10 text-success',           Icon: CheckCircle2, label: 'Synced' },
    idle:     { class: 'border-success/40 bg-success/10 text-success',           Icon: CheckCircle2, label: 'Synced' },
    error:    { class: 'border-danger/40 bg-danger/10 text-danger',              Icon: AlertCircle,  label: 'Sync error' },
    'no-token': { class: 'border-warning/40 bg-warning/10 text-warning',         Icon: KeyRound,     label: 'PAT needed' },
    disabled: { class: 'border-token opacity-60',                                Icon: CloudOff,     label: 'Off' },
  };
  const t = tones[status] || tones.idle;
  const Icon = t.Icon;

  return (
    <button
      onClick={() => setOpenModal(true)}
      title={`Cross-device sync — ${t.label}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10.5px] font-bold border transition',
        t.class
      )}
    >
      <Icon size={11} className={cn(t.spin && 'animate-spin')} />
      <span className="hidden sm:inline">{t.label}</span>
    </button>
  );
}
