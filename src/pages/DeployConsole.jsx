/**
 * DeployConsole.jsx — the home of the strict-approval deploy system.
 *
 * Three views, controlled by the top tab bar:
 *   • Vault   — set up / unlock the encrypted credential vault
 *   • Actions — browse every AWS action grouped by service, see tiers, fire one
 *   • Audit   — read-only history of every action attempted
 *
 * All sensitive operations route through DeployContext → ApprovalDialog,
 * so this page never touches AWS APIs directly. It's purely UI + state.
 */
import { useMemo, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, Search, ExternalLink, BookOpen, Lock,
  KeyRound, RotateCcw, AlertTriangle, Activity, CheckCircle2, XCircle, Clock,
  FileText, Filter, Copy, Sparkles, ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { useDeploy } from '../context/DeployContext.jsx';
import { useAWS } from '../context/AWSContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ACTIONS, TIERS, actionsByService, resolveAction, BLOCKED_ACTIONS } from '../data/awsActions.js';
import { passwordStrength } from '../lib/cryptoVault.js';

const TABS = [
  { id: 'vault',   label: 'Vault',   icon: KeyRound },
  { id: 'actions', label: 'Actions', icon: Sparkles },
  { id: 'audit',   label: 'Audit',   icon: FileText },
];

export default function DeployConsole() {
  const [tab, setTab] = useState('vault');
  const { hasVault } = useDeploy();

  return (
    <div className="space-y-6">
      <Header hasVault={hasVault} />
      <TabBar tab={tab} setTab={setTab} hasVault={hasVault} />
      {tab === 'vault'   && <VaultTab />}
      {tab === 'actions' && <ActionsTab />}
      {tab === 'audit'   && <AuditTab />}
    </div>
  );
}

// ---------------- header ----------------

function Header({ hasVault }) {
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-[var(--brand)]" />
            <h1 className="text-2xl font-bold tracking-tight">Deploy Console</h1>
          </div>
          <p className="text-sm opacity-70 max-w-2xl">
            The strict-approval gateway between this app and your AWS account. Every action is
            classified by risk tier, gated by a deploy password, and recorded in an immutable audit log.
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
          hasVault ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
        }`}>
          {hasVault ? <><Lock size={12} /> Vault ready</> : <><AlertTriangle size={12} /> Vault not set up</>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-5">
        {Object.values(TIERS).map((t) => (
          <div key={t.id} className="rounded-xl border border-token bg-[var(--card)] px-3 py-2.5">
            <div className="text-base">{t.icon}</div>
            <div className="text-xs font-bold mt-0.5">{t.label}</div>
            <div className="text-[10px] opacity-60 mt-0.5">
              {t.id === 'read'    && 'No password'}
              {t.id === 'build'   && 'Password required'}
              {t.id === 'destroy' && 'Type resource name'}
              {t.id === 'admin'   && '"I UNDERSTAND" + 10s'}
              {t.id === 'blocked' && 'Console only — never automated'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabBar({ tab, setTab, hasVault }) {
  return (
    <div className="flex gap-2 border-b border-token">
      {TABS.map((t) => {
        const disabled = t.id !== 'vault' && !hasVault;
        const active = tab === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => !disabled && setTab(t.id)}
            disabled={disabled}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              active ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent opacity-60 hover:opacity-100'
            } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            <Icon size={14} />
            {t.label}
            {disabled && <Lock size={10} />}
          </button>
        );
      })}
    </div>
  );
}

// ---------------- VAULT TAB ----------------

function VaultTab() {
  const { hasVault, initVault, verifyPassword, rotatePassword, panicWipe, settings, updateSettings } = useDeploy();
  const { activeProfile } = useAWS();
  const toast = useToast();

  const [creating, setCreating] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [rotateOld, setRotateOld] = useState('');
  const [rotateNew, setRotateNew] = useState('');
  const [unlockTry, setUnlockTry] = useState('');
  const [unlockStatus, setUnlockStatus] = useState(null);
  const [panicOpen, setPanicOpen] = useState(false);

  const strength = passwordStrength(pw);

  async function handleCreate() {
    if (!activeProfile?.accessKeyId || !activeProfile?.secretAccessKey) {
      toast.error('No AWS credentials in active profile. Add them in AWS Account Manager first.');
      return;
    }
    if (pw !== pw2) { toast.error('Passwords do not match.'); return; }
    if (strength.score < 2) { toast.error(strength.warning); return; }
    setCreating(true);
    try {
      await initVault({
        creds: {
          accessKeyId:     activeProfile.accessKeyId,
          secretAccessKey: activeProfile.secretAccessKey,
          sessionToken:    activeProfile.sessionToken || undefined,
        },
        password: pw,
      });
      toast.success('🔒 Vault created. Your deploy password is the only way to unlock it — store it safely.');
      setPw(''); setPw2('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleUnlock() {
    setUnlockStatus(null);
    const ok = await verifyPassword(unlockTry);
    setUnlockStatus(ok ? 'ok' : 'bad');
    if (ok) toast.success('Password verified.');
    else    toast.error('Wrong password.');
  }

  async function handleRotate() {
    try {
      await rotatePassword({ oldPassword: rotateOld, newPassword: rotateNew });
      toast.success('Password rotated.');
      setRotateOld(''); setRotateNew('');
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {!hasVault ? (
        <SetupCard
          activeProfile={activeProfile} pw={pw} setPw={setPw} pw2={pw2} setPw2={setPw2}
          strength={strength} creating={creating} onCreate={handleCreate}
        />
      ) : (
        <>
          <UnlockTester unlockTry={unlockTry} setUnlockTry={setUnlockTry} unlockStatus={unlockStatus} onUnlock={handleUnlock} />
          <RotateCard rotateOld={rotateOld} rotateNew={rotateNew} setRotateOld={setRotateOld} setRotateNew={setRotateNew} onRotate={handleRotate} />
          <SettingsCard settings={settings} onUpdate={updateSettings} />
          <PanicCard onClick={() => setPanicOpen(true)} />
        </>
      )}

      <BlockedActionsCard />

      <PanicConfirm
        open={panicOpen}
        onClose={() => setPanicOpen(false)}
        onConfirm={() => { panicWipe('user-button'); setPanicOpen(false); toast.success('Vault wiped. Rotate AWS keys in the console immediately.'); }}
      />
    </div>
  );
}

function SetupCard({ activeProfile, pw, setPw, pw2, setPw2, strength, creating, onCreate }) {
  const hasCreds = !!(activeProfile?.accessKeyId && activeProfile?.secretAccessKey);
  const strengthColors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-400'];
  return (
    <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
      <h3 className="text-lg font-bold mb-1">Step 1 · Create your encrypted vault</h3>
      <p className="text-xs opacity-70 mb-4">
        Your AWS keys (from <span className="font-mono">{activeProfile?.name}</span>) will be wrapped in AES-GCM 256
        and the key derived from your password with PBKDF2 (220,000 iterations). Without the password,
        the encrypted blob is useless — even to you.
      </p>

      {!hasCreds && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200 mb-4">
          ⚠️ The active AWS profile has no access keys. Go to <strong>AWS Account Manager</strong> first, add your access key + secret key, then return here.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1.5 block">Deploy password</label>
          <input
            type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="At least 12 chars recommended"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm"
          />
          {pw && (
            <div className="mt-1.5">
              <div className="h-1.5 bg-[var(--card-2)] rounded-full overflow-hidden">
                <div className={`h-full ${strengthColors[strength.score]}`} style={{ width: `${(strength.score + 1) * 20}%` }} />
              </div>
              <p className="text-[10px] mt-1 opacity-70">{strength.label} — {strength.warning}</p>
            </div>
          )}
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-1.5 block">Confirm password</label>
          <input
            type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
            placeholder="Type it again"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm"
          />
        </div>
      </div>

      <div className="rounded-xl bg-[var(--card-2)]/40 border border-token p-3 mt-4 text-xs opacity-80">
        <p className="font-bold mb-1">⚠ If you forget this password, the vault is unrecoverable.</p>
        <p>That's the point — but it means YOU must remember it. Save it in a password manager
        (1Password, Bitwarden) before clicking Create.</p>
      </div>

      <div className="mt-4 flex justify-end">
        <Button variant="primary" onClick={onCreate} disabled={creating || !hasCreds || !pw || pw !== pw2 || strength.score < 2}>
          {creating ? 'Creating…' : 'Create vault'}
        </Button>
      </div>
    </div>
  );
}

function UnlockTester({ unlockTry, setUnlockTry, unlockStatus, onUnlock }) {
  return (
    <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
      <h3 className="text-lg font-bold mb-1">Test your password</h3>
      <p className="text-xs opacity-70 mb-3">Verify the deploy password works without revealing the credentials.</p>
      <div className="flex gap-2">
        <input
          type="password" value={unlockTry} onChange={(e) => setUnlockTry(e.target.value)}
          placeholder="Deploy password"
          className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm"
        />
        <Button variant="ghost" onClick={onUnlock}>Verify</Button>
      </div>
      {unlockStatus === 'ok' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 size={12} /> Password valid.</div>
      )}
      {unlockStatus === 'bad' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-rose-300"><XCircle size={12} /> Wrong password.</div>
      )}
    </div>
  );
}

function RotateCard({ rotateOld, rotateNew, setRotateOld, setRotateNew, onRotate }) {
  return (
    <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2"><RotateCcw size={16} /> Rotate password</h3>
      <p className="text-xs opacity-70 mb-3">Replace the deploy password without re-entering AWS credentials.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="password" value={rotateOld} onChange={(e) => setRotateOld(e.target.value)}
          placeholder="Current password"
          className="px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm"
        />
        <input
          type="password" value={rotateNew} onChange={(e) => setRotateNew(e.target.value)}
          placeholder="New password"
          className="px-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm"
        />
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="ghost" onClick={onRotate} disabled={!rotateOld || !rotateNew}>Rotate</Button>
      </div>
    </div>
  );
}

function SettingsCard({ settings, onUpdate }) {
  return (
    <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
      <h3 className="text-lg font-bold mb-3">Safety settings</h3>
      <div className="space-y-3">
        <SettingRow
          label="Typical-cost ceiling (USD/month)"
          help="Refuse any action whose typical cost estimate exceeds this."
          value={settings.maxTypicalCostUsd}
          onChange={(v) => onUpdate({ maxTypicalCostUsd: +v })}
          type="number"
        />
        <SettingRow
          label="Maximum-cost ceiling (USD/month)"
          help="Hard limit on the worst-case cost estimate."
          value={settings.maxMaxCostUsd}
          onChange={(v) => onUpdate({ maxMaxCostUsd: +v })}
          type="number"
        />
        <SettingRow
          label="Mirror admin-tier actions to email"
          help="If set, every 🔴 admin action is flagged for email notification."
          value={settings.mirrorAdminToEmail}
          onChange={(v) => onUpdate({ mirrorAdminToEmail: v })}
          type="email"
        />
        <SettingRow
          label="Allowed regions (comma-separated)"
          help="Actions refuse to fire outside these regions."
          value={(settings.allowedRegions || []).join(',')}
          onChange={(v) => onUpdate({ allowedRegions: v.split(',').map((r) => r.trim()).filter(Boolean) })}
          type="text"
        />
      </div>
    </div>
  );
}

function SettingRow({ label, help, value, onChange, type = 'text' }) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex-1 min-w-[200px]">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-[11px] opacity-60">{help}</div>
      </div>
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-44 px-3 py-1.5 rounded-lg bg-[var(--card-2)] border border-token text-sm"
      />
    </div>
  );
}

function PanicCard({ onClick }) {
  return (
    <div className="rounded-2xl border-2 border-rose-500/30 p-5 bg-rose-500/5">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2 text-rose-300">
        <AlertTriangle size={16} /> Panic killswitch
      </h3>
      <p className="text-xs opacity-80 mb-3">
        Wipes the encrypted vault from this browser. Your AWS keys remain valid until you rotate
        them in the AWS Console — do that immediately after using this button.
      </p>
      <p className="text-[11px] opacity-70 mb-3">
        Keyboard shortcut: <span className="font-mono px-1.5 py-0.5 rounded bg-[var(--card-2)]">Ctrl/⌘ + Shift + K</span>
      </p>
      <Button variant="danger" onClick={onClick}>🚨 Wipe vault now</Button>
    </div>
  );
}

function PanicConfirm({ open, onClose, onConfirm }) {
  const [typed, setTyped] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Confirm vault wipe" size="md">
      <p className="text-sm">This will permanently erase the encrypted credential vault from this browser.</p>
      <p className="text-sm mt-2 mb-3">Type <span className="font-mono px-1.5 py-0.5 rounded bg-[var(--card-2)] font-bold">WIPE VAULT</span> to confirm.</p>
      <input
        type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
        autoFocus
        className="w-full px-3 py-2 rounded-xl bg-[var(--card-2)] border border-token text-sm font-mono"
      />
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm} disabled={typed !== 'WIPE VAULT'}>Wipe</Button>
      </div>
    </Modal>
  );
}

function BlockedActionsCard() {
  return (
    <div className="rounded-2xl border border-token p-5 bg-[var(--card)]">
      <h3 className="text-lg font-bold mb-1 flex items-center gap-2">⛔ Hardcoded fuses</h3>
      <p className="text-xs opacity-70 mb-3">
        These actions are <strong>never</strong> executable by the app, no matter the password.
        Doing them manually in the AWS Console is the only path. This is what protects you against
        a fully compromised app.
      </p>
      <div className="space-y-2">
        {BLOCKED_ACTIONS.map((a) => (
          <div key={a.id} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 flex gap-3 items-start">
            <div className="text-lg">⛔</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">{a.summary}</div>
              <div className="text-[11px] opacity-70 mt-0.5">{a.blockReason}</div>
            </div>
            {a.consoleUrl && (
              <a href={a.consoleUrl()} target="_blank" rel="noreferrer"
                 className="text-[11px] flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] shrink-0">
                <ExternalLink size={10} /> Console
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- ACTIONS TAB ----------------

function ActionsTab() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const grouped = useMemo(() => actionsByService(), []);

  const services = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = {};
    for (const [svc, items] of Object.entries(grouped)) {
      const filtered = items.filter((a) => {
        if (tierFilter !== 'all' && a.tier !== tierFilter) return false;
        if (!q) return true;
        return a.id.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
      });
      if (filtered.length) out[svc] = filtered;
    }
    return out;
  }, [search, tierFilter, grouped]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actions, services…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--card)] border border-token text-sm"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter size={12} className="opacity-60" />
          {['all', 'READ', 'BUILD', 'DESTROY', 'ADMIN', 'BLOCKED'].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                tierFilter === t ? 'bg-[var(--brand)] text-black' : 'bg-[var(--card)] hover:bg-[var(--card-2)]'
              }`}
            >
              {t === 'all' ? 'All' : TIERS[t]?.icon + ' ' + TIERS[t]?.label}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(services).map(([svc, items]) => (
        <div key={svc} className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden">
          <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-xs font-bold flex items-center justify-between">
            <span>{svc}</span>
            <span className="opacity-60 font-normal">{items.length} action{items.length === 1 ? '' : 's'}</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {items.map((a) => <ActionRow key={a.id} action={a} />)}
          </div>
        </div>
      ))}

      {Object.keys(services).length === 0 && (
        <div className="text-center py-12 text-sm opacity-60">No actions match.</div>
      )}
    </div>
  );
}

function ActionRow({ action }) {
  const [open, setOpen] = useState(false);
  const tier = TIERS[action.tier];
  return (
    <>
      <div className="px-4 py-3 flex items-center gap-3 hover:bg-[var(--card-2)]/30">
        <span className="text-lg">{tier.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            <span className="font-mono text-xs opacity-70">{action.id}</span>
            <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded ${
              action.tier === 'READ' ? 'bg-emerald-500/20 text-emerald-300' :
              action.tier === 'BUILD' ? 'bg-amber-500/20 text-amber-300' :
              action.tier === 'DESTROY' ? 'bg-orange-500/20 text-orange-300' :
              action.tier === 'ADMIN' ? 'bg-rose-500/20 text-rose-300' :
              'bg-slate-500/20 text-slate-300'
            }`}>{tier.label}</span>
          </div>
          <div className="text-xs opacity-70 mt-0.5">{action.summary}</div>
        </div>
        {action.consoleUrl && (
          <a href={action.consoleUrl({})} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 rounded-lg bg-[var(--card-2)] hover:bg-[var(--card-3)] flex items-center gap-1">
            <ExternalLink size={10} /> Console
          </a>
        )}
        {action.tier !== 'BLOCKED' && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} iconRight={ChevronRight}>Run</Button>
        )}
      </div>
      {open && <RunActionDialog action={action} onClose={() => setOpen(false)} />}
    </>
  );
}

function RunActionDialog({ action, onClose }) {
  const { requestExecute } = useDeploy();
  const toast = useToast();
  const [params, setParams] = useState(() => initialParams(action.params || []));
  const [error, setError] = useState(null);

  function update(id, v) {
    setParams((p) => ({ ...p, [id]: v }));
  }

  function submit() {
    try {
      const r = requestExecute(action.id, params);
      if (r.blocked) {
        setError('This action is permanently blocked.');
        return;
      }
      onClose(); // ApprovalDialog will take over
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal open={true} onClose={onClose} size="lg" title={`Run · ${action.id}`}>
      <p className="text-sm mb-4 opacity-80">{action.summary}</p>
      <div className="space-y-3">
        {(action.params || []).map((p) => (
          <ParamField key={p.id} field={p} value={params[p.id]} onChange={(v) => update(p.id, v)} />
        ))}
      </div>
      {error && (
        <div className="mt-3 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}
      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Request approval →</Button>
      </div>
    </Modal>
  );
}

function ParamField({ field, value, onChange }) {
  const common = 'w-full px-3 py-2 rounded-xl bg-[var(--card-2)] border border-token text-sm';

  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-1 block">
        {field.label} {field.required && <span className="text-rose-300">*</span>}
      </label>
      {(field.type === 'text' || field.type === 'email' || !field.type) && (
        <input type={field.type || 'text'} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} className={common} />
      )}
      {field.type === 'number' && (
        <input type="number" value={value || ''} onChange={(e) => onChange(+e.target.value)} min={field.min} max={field.max} className={common} />
      )}
      {field.type === 'boolean' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} disabled={field.locked} className="rounded" />
          <span>{value ? 'Yes' : 'No'}</span>
        </label>
      )}
      {field.type === 'select' && (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={common}>
          {(field.options || []).map((o) => <option key={o} value={o}>{o || '(none)'}</option>)}
        </select>
      )}
      {field.type === 'textarea' && (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={4} className={`${common} font-mono`} />
      )}
      {field.type === 'region' && (
        <select value={value || field.default || 'eu-west-1'} onChange={(e) => onChange(e.target.value)} className={common}>
          {['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-central-1', 'ap-south-1', 'ap-southeast-1', 'ap-southeast-2'].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      )}
      {field.hint && <div className="text-[10px] opacity-60 mt-1">{field.hint}</div>}
    </div>
  );
}

function initialParams(fields) {
  const out = {};
  for (const f of fields) {
    if (f.default !== undefined) out[f.id] = f.default;
  }
  return out;
}

// ---------------- AUDIT TAB ----------------

function AuditTab() {
  const { auditLog, stats } = useDeploy();
  const [filterTier, setFilterTier] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return auditLog.filter((e) => {
      if (filterTier !== 'all' && e.tier !== filterTier) return false;
      if (search && !JSON.stringify(e).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [auditLog, filterTier, search]);

  function exportLog() {
    const blob = new Blob([JSON.stringify(auditLog, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aws-deploy-audit-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        <StatCard icon={Activity} label="Total" value={stats.total} />
        <StatCard icon={Activity} label="🟢 Read" value={stats.byTier.READ} />
        <StatCard icon={Activity} label="🟡 Build" value={stats.byTier.BUILD} />
        <StatCard icon={Activity} label="🟠 Destroy" value={stats.byTier.DESTROY} />
        <StatCard icon={Activity} label="🔴 Admin" value={stats.byTier.ADMIN} />
        <StatCard icon={XCircle} label="Failed" value={stats.failures} tone="rose" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search audit entries…"
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-[var(--card)] border border-token text-sm"
        />
        <select value={filterTier} onChange={(e) => setFilterTier(e.target.value)} className="px-3 py-2 rounded-xl bg-[var(--card)] border border-token text-sm">
          <option value="all">All tiers</option>
          {Object.values(TIERS).map((t) => <option key={t.id} value={t.id.toUpperCase()}>{t.icon} {t.label}</option>)}
        </select>
        <Button variant="ghost" size="sm" onClick={exportLog}>Export JSON</Button>
      </div>

      <div className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm opacity-60">No audit entries match.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((e) => <AuditRow key={e.id} entry={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const tones = { default: '', rose: 'text-rose-300' };
  return (
    <div className="rounded-xl border border-token bg-[var(--card)] p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold opacity-60">
        <Icon size={10} /> {label}
      </div>
      <div className={`text-lg font-bold mt-1 ${tones[tone]}`}>{value}</div>
    </div>
  );
}

function AuditRow({ entry }) {
  const [open, setOpen] = useState(false);
  const tier = TIERS[entry.tier?.toLowerCase()] || TIERS.read;
  const dt = new Date(entry.at);
  return (
    <>
      <button onClick={() => setOpen((o) => !o)} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--card-2)]/30 text-left">
        <span className="text-base">{tier.icon}</span>
        <span className="text-xs opacity-60 font-mono w-20 shrink-0">{dt.toLocaleTimeString()}</span>
        <span className="text-xs opacity-60 w-24 shrink-0">{dt.toLocaleDateString()}</span>
        <span className="text-xs font-mono opacity-80 w-48 shrink-0 truncate">{entry.actionId}</span>
        <span className="text-xs flex-1 truncate">{entry.summary}</span>
        <span className={`text-[10px] uppercase font-bold ${entry.ok === false ? 'text-rose-300' : 'text-emerald-300'}`}>
          {entry.ok === false ? 'FAIL' : 'OK'}
        </span>
      </button>
      {open && (
        <div className="px-4 py-3 bg-[var(--card-2)]/20 border-t border-token">
          <pre className="text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-64 opacity-80">
{JSON.stringify(entry, null, 2)}
          </pre>
        </div>
      )}
    </>
  );
}
