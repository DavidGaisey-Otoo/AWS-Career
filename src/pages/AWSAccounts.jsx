import { motion } from 'framer-motion';
import {
  AlertCircle, AlertOctagon, AlertTriangle, ArrowRight, Check, ChevronRight,
  Cloud, Copy, Eye, EyeOff, Key, ListChecks, Lock, Mail, Pencil, Play, Plus,
  RotateCcw, Shield, Sparkles, Trash2, Unlock, X, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SetupDocumentation } from '../components/aws-accounts/SetupDocumentation.jsx';
import { AccountHygieneReviewPanel } from '../components/account-hygiene-review/AccountHygieneReviewPanel.jsx';
import { AWS_REGIONS, PROFILE_COLORS, useAWS } from '../context/AWSContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { cn, formatCurrency } from '../lib/utils.js';

export default function AWSAccounts() {
  const aws = useAWS();
  const { state, activeProfile, setActiveProfile } = aws;
  // "Risky" profiles get the prominent red banner — any locked profile (incl. legacy 'client') qualifies.
  const isClient = !!activeProfile?.locked;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="AWS Account Manager"
        title="Real AWS, safely."
        subtitle="Two profiles: your Free-Tier learning account and a Client account. Smart Size Manager scales test deploys to free tier automatically. Auto-destroy timers guarantee nothing\\'s left running."
        icon={Cloud}
      />

      {/* Client-mode warning banner */}
      {isClient && activeProfile.connected && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 border-danger bg-danger/10 p-4 flex items-start gap-3">
          <AlertOctagon size={22} className="text-danger flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <div className="text-sm font-extrabold text-danger uppercase tracking-widest">
              ⚠ Working in client account
            </div>
            <p className="text-xs mt-1">
              All actions are <strong>real and billable</strong>. Client:{' '}
              <strong className="text-current">{activeProfile.name}</strong>
              {activeProfile.identity?.account && (
                <> · Account <code className="text-aws-orange font-mono">{activeProfile.identity.account}</code></>
              )}
            </p>
          </div>
          <button
            onClick={() => {
              // Jump to the first UNLOCKED profile in the order
              const safe = state.profileOrder.find((id) => state.profiles[id] && !state.profiles[id].locked);
              if (safe) setActiveProfile(safe);
            }}
            className="btn btn-ghost !text-xs !py-1.5">End session safely</button>
        </motion.div>
      )}

      <ProfileSwitcher />

      <FreeTierMonitor />

      <CredentialsCard profileId={state.activeProfile} />

      <TierStatusCard profileId={state.activeProfile} />

      {/* AC-01 — best-practice checklist + IAM teaching + report generator */}
      <SetupDocumentation />

      {/* ACCT-01 — Yusuf El-Sayed's hygiene audit */}
      <AccountHygieneReviewPanel
        profile={activeProfile || {}}
        billingAlerts={activeProfile?.billingAlerts ?? null}
        services={activeProfile?.services || {}}
        supportPlan={activeProfile?.supportPlan || 'basic'}
        freeTierActive={!!activeProfile?.freeTierActive}
      />

      <SimulateModeBanner />

      <DeploymentsTable />

      <ResourceLedger />

      <ApprovalModal />
    </div>
  );
}

// ============================ Profile switcher (multi-profile) ============================

function ProfileSwitcher() {
  const {
    state, setActiveProfile, addProfile, renameProfile, setProfileColor,
    toggleProfileLock, deleteProfile,
  } = useAWS();
  const toast = useToast();
  const dialog = useDialog();
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const startEdit = (p) => { setEditingId(p.id); setEditName(p.name); };
  const commitEdit = () => {
    if (editingId && editName.trim()) renameProfile(editingId, editName.trim());
    setEditingId(null);
  };

  const switchTo = async (p) => {
    if (state.activeProfile === p.id) return;
    if (p.locked) {
      const ok = await dialog.confirm({
        title: `Switch to ${p.name}?`,
        description: 'This profile is marked as production — any "live" actions you take will hit the real account. Continue?',
        danger: true,
        confirmLabel: 'Switch + acknowledge',
      });
      if (!ok) return;
    }
    setActiveProfile(p.id);
  };

  const onAdd = async () => {
    const name = await dialog.prompt({
      title: 'New AWS profile',
      description: 'Give it a memorable name (e.g. "Acme Corp", "Personal Lab", "Northwind Fintech").',
      placeholder: 'Acme Corp',
      confirmLabel: 'Create profile',
    });
    if (!name) return;
    addProfile({ name, color: pickNextColor(state.profiles) });
    toast.success(`Created "${name}"`);
  };

  const onDelete = async (p) => {
    if (state.profileOrder.length <= 1) {
      toast.error('Cannot delete the last profile.');
      return;
    }
    const ok = await dialog.confirm({
      title: `Delete "${p.name}"?`,
      description: 'Credentials, identity, and tier info for this profile are removed. Deployments + resources stay in the history.',
      danger: true,
    });
    if (ok) {
      deleteProfile(p.id);
      toast.info(`Deleted "${p.name}"`);
    }
  };

  const ordered = state.profileOrder.map((id) => ({ id, ...state.profiles[id] })).filter((p) => p.name != null);

  return (
    <section className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
            AWS profiles ({ordered.length})
          </h3>
          <p className="text-[11px] text-muted mt-0.5">
            Click to switch. Add as many as you need — personal lab + every client gets their own.
          </p>
        </div>
        <button onClick={onAdd} className="btn btn-primary !text-xs">
          <Plus size={12} /> Add profile
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {ordered.map((p) => {
          const color = PROFILE_COLORS.find((c) => c.id === p.color)?.hex || '#FF9900';
          const isActive = state.activeProfile === p.id;
          return (
            <div
              key={p.id}
              className={cn(
                'group rounded-2xl border bg-[var(--card-2)]/40 p-3 transition focus-within:border-aws-orange/60',
                isActive ? 'border-aws-orange/60 shadow-[0_0_0_2px_rgba(255,153,0,0.18)]' : 'border-token hover:border-aws-orange/30',
              )}
            >
              <button onClick={() => switchTo(p)} className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span
                    className="w-9 h-9 rounded-xl grid place-items-center text-white shrink-0"
                    style={{ background: color }}
                  >
                    <Cloud size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    {editingId === p.id ? (
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                        className="bg-[var(--card)] border border-aws-orange/40 rounded-md px-1.5 py-0.5 text-sm font-extrabold w-full focus:outline-none"
                      />
                    ) : (
                      <div className="text-sm font-extrabold tracking-tight truncate" onDoubleClick={() => startEdit(p)}>
                        {p.name}
                      </div>
                    )}
                    <div className="text-[10px] text-muted flex items-center gap-1 flex-wrap mt-0.5">
                      <code className="font-mono">{p.region}</code>
                      {p.connected
                        ? <span className="text-success">● Connected</span>
                        : p.accessKeyId
                          ? <span className="text-warning">⚠ Untested</span>
                          : <span className="text-muted">No credentials</span>}
                      {p.locked && (
                        <span className="chip border border-danger/40 bg-danger/10 text-danger text-[9px] font-bold ml-1">
                          🔒 Locked
                        </span>
                      )}
                      {isActive && (
                        <span className="chip bg-aws-orange/15 text-aws-orange border border-aws-orange/30 text-[9px] font-extrabold ml-1">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Profile actions */}
              <div className="mt-2 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                <button onClick={() => startEdit(p)} className="p-1 rounded text-muted hover:text-current" title="Rename">
                  <Pencil size={11} />
                </button>
                <ColorMenu
                  current={p.color}
                  onPick={(c) => setProfileColor(p.id, c)}
                />
                <button onClick={() => toggleProfileLock(p.id)}
                        className={cn('p-1 rounded hover:text-current', p.locked ? 'text-danger' : 'text-muted')}
                        title={p.locked ? 'Unlock (no confirm on switch)' : 'Lock (require confirm on switch — for client/prod profiles)'}>
                  {p.locked ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <div className="flex-1" />
                {ordered.length > 1 && (
                  <button onClick={() => onDelete(p)} className="p-1 rounded text-muted hover:text-danger" title="Delete profile">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ColorMenu({ current, onPick }) {
  const [open, setOpen] = useState(false);
  const swatch = PROFILE_COLORS.find((c) => c.id === current)?.hex || '#FF9900';
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded hover:bg-[var(--card-2)]"
        title="Change colour"
        aria-label="Change colour"
      >
        <span className="block w-3 h-3 rounded-full border border-white/20" style={{ background: swatch }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[40]" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 surface rounded-lg p-1 flex gap-1 shadow-lg">
            {PROFILE_COLORS.map((c) => (
              <button
                key={c.id}
                onClick={() => { onPick(c.id); setOpen(false); }}
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition',
                  c.id === current ? 'border-white scale-110' : 'border-transparent hover:scale-110',
                )}
                style={{ background: c.hex }}
                title={c.label}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function pickNextColor(profiles) {
  const used = new Set(Object.values(profiles).map((p) => p.color));
  return PROFILE_COLORS.find((c) => !used.has(c.id))?.id || 'cyan';
}

// ============================ Credentials card ============================

function CredentialsCard({ profileId }) {
  const { state, updateProfile, clearProfile, testConnection } = useAWS();
  const profile = state.profiles[profileId];
  const toast = useToast();
  const [showSecret, setShowSecret] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);
  const [accessKey, setAccessKey] = useState(profile.accessKeyId);
  const [secret, setSecret]   = useState(profile.secretAccessKey);
  const [region, setRegion]   = useState(profile.region);
  const [save, setSave]       = useState(profile.saved);

  useEffect(() => {
    setAccessKey(profile.accessKeyId);
    setSecret(profile.secretAccessKey);
    setRegion(profile.region);
    setSave(profile.saved);
    setResult(null);
  }, [profileId]); // eslint-disable-line

  const onTest = async () => {
    setTesting(true);
    // Stage values into context (so STS picks them up) then call test.
    updateProfile(profileId, {
      accessKeyId: accessKey.trim(),
      secretAccessKey: secret.trim(),
      region,
      saved: save,
    });
    // Wait a tick for context to settle
    setTimeout(async () => {
      const out = await testConnection(profileId);
      setResult(out);
      setTesting(false);
      if (out.ok) toast.success('Connection successful');
      else        toast.error('Connection failed — check credentials');
      // If user did NOT tick "save", clear creds back out (but keep `connected` + identity)
      if (!save) {
        updateProfile(profileId, { accessKeyId: '', secretAccessKey: '' });
      }
    }, 50);
  };

  return (
    <section className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-aws-orange" />
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">
            Credentials — {profile.name}
          </h3>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="AWS Access Key ID" value={accessKey} onChange={setAccessKey}
                 placeholder="AKIA…" mono />
          <Field label="AWS Secret Access Key" value={secret} onChange={setSecret}
                 placeholder="••••••••••••••••••••••••" mono type={showSecret ? 'text' : 'password'}
                 right={
                   <button onClick={() => setShowSecret((v) => !v)} className="text-muted hover:text-current p-1"
                           aria-label={showSecret ? 'Hide' : 'Show'}>
                     {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                   </button>
                 } />
          <Field label="Default region" as="select" value={region} onChange={setRegion}
                 options={AWS_REGIONS.map((r) => [r.id, `${r.id} — ${r.label}`])} />
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)}
                   className="w-4 h-4 accent-aws-orange" />
            <span>Save credentials to browser storage</span>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={onTest} disabled={testing || !accessKey || !secret}
                  className={cn('btn btn-primary', (testing || !accessKey || !secret) && 'opacity-50 cursor-not-allowed')}>
            <Play size={14} /> {testing ? 'Testing…' : 'Test connection'}
          </button>
          {(profile.accessKeyId || profile.connected) && (
            <button onClick={() => { clearProfile(profileId); toast.info('Cleared'); }}
                    className="btn btn-ghost !text-xs">
              <Trash2 size={12} /> Clear credentials
            </button>
          )}
        </div>

        {result && (
          <div className={cn('mt-3 rounded-xl border p-3 text-xs',
                             result.ok ? 'border-success/30 bg-success/[0.04] text-success'
                                       : 'border-danger/30 bg-danger/[0.04] text-danger')}>
            <div className="flex items-start gap-2">
              {result.ok ? <Check size={14} /> : <X size={14} />}
              <div>
                <strong>{result.ok ? 'Connected.' : 'Connection failed.'}</strong>{' '}
                <span className="text-current">{result.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* IAM setup guide */}
        <details className="mt-4 rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
          <summary className="text-xs font-extrabold cursor-pointer">
            ▸ How to create the right IAM user (step-by-step)
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted">
            <li>1. Sign in to AWS console <strong>as an IAM admin user</strong> (never root).</li>
            <li>2. IAM → Users → Create user. Give it a name like <code className="font-mono text-aws-orange">launchpad-cli</code>.</li>
            <li>3. Permissions: attach <strong>PowerUserAccess</strong> (or the narrower set below) — never <em>AdministratorAccess</em> for keys you save in a browser.</li>
            <li>4. Create user → click into it → Security credentials → Create access key → choose <strong>Application running outside AWS</strong>.</li>
            <li>5. Copy the Access Key ID + Secret. <strong>The secret is shown only once.</strong></li>
            <li>6. Paste them above and click <em>Test connection</em>.</li>
          </ol>
          <div className="mt-2 text-[11px] text-muted">
            <strong>Required permissions (least-privilege):</strong> <code className="font-mono text-aws-orange">sts:GetCallerIdentity</code>,{' '}
            plus the AWS-service-specific actions you intend to deploy
            (e.g. <code className="font-mono text-aws-orange">ec2:*</code> /{' '}
            <code className="font-mono text-aws-orange">s3:*</code> /{' '}
            <code className="font-mono text-aws-orange">cloudformation:*</code>).
          </div>
        </details>

        <div className="mt-3 rounded-xl border border-danger/30 bg-danger/[0.04] p-3 flex items-start gap-2">
          <AlertTriangle size={14} className="text-danger flex-shrink-0 mt-0.5" />
          <div className="text-xs text-danger">
            <strong>Never use root account credentials.</strong> Browser-side AWS calls can be intercepted by malicious extensions
            — create a dedicated, narrow IAM user, and rotate keys every 90 days.
          </div>
        </div>

        <GmailLinkPanel profileId={profileId} />
      </div>
    </section>
  );
}

// ============================ Gmail link panel ============================
//
// Per-profile Gmail account. When the user clicks "Open in Gmail" anywhere
// in the app (Email Composer, Discovery Call follow-up, Document Center
// "Email client"), the deep-link uses this profile's Gmail user index so
// the right Google account is selected automatically.

function GmailLinkPanel({ profileId }) {
  const { state, setGmailUser } = useAWS();
  const toast = useToast();
  const profile = state.profiles[profileId];
  const [address, setAddress] = useState(profile?.gmailAddress || '');
  const [userIndex, setUserIndex] = useState(profile?.gmailUserIndex ?? 0);

  useEffect(() => {
    setAddress(profile?.gmailAddress || '');
    setUserIndex(profile?.gmailUserIndex ?? 0);
  }, [profileId]); // eslint-disable-line

  const save = () => {
    setGmailUser(profileId, { index: userIndex, address: address.trim() });
    toast.success(`Gmail linked: ${address.trim() || 'account #' + userIndex}`);
  };

  return (
    <details className="mt-3 rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
      <summary className="text-xs font-extrabold cursor-pointer flex items-center gap-2">
        <Mail size={12} className="text-aws-orange" />
        Link Gmail for client communication
        {profile.gmailAddress && (
          <span className="chip border border-success/40 bg-success/10 text-success text-[9px] font-bold ml-2">
            ● {profile.gmailAddress}
          </span>
        )}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-[11px] text-muted leading-relaxed">
          When you click "Open in Gmail" in the Email System, Discovery Call follow-ups, or Document Center,
          the deep link will use this Gmail account.{' '}
          <strong className="text-current">Each AWS profile can have its own Gmail</strong> —
          so when you switch to a client profile, your reply email switches with it.
        </p>

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[10px] font-bold text-muted">Gmail address</span>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="you@gmail.com"
              className="mt-1 w-full bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold text-muted">
              Account slot in Gmail
              <span className="text-muted/60 ml-1">(0 = primary, 1 = secondary…)</span>
            </span>
            <input
              type="number" min="0" max="9" step="1"
              value={userIndex}
              onChange={(e) => setUserIndex(+e.target.value || 0)}
              className="mt-1 w-full bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
            />
          </label>
        </div>

        <div className="text-[10px] text-muted leading-relaxed">
          <strong className="text-current">How to find your slot:</strong> open Gmail in a tab — the URL shows
          <code className="text-aws-orange font-mono"> /u/0/</code>,
          <code className="text-aws-orange font-mono">/u/1/</code> etc.
          Use that number. If you only have one Gmail signed in, leave it at 0.
        </div>

        <div className="flex items-center gap-2">
          <button onClick={save} className="btn btn-primary !text-xs">
            <Check size={11} /> Save Gmail link
          </button>
          <a
            href={`https://mail.google.com/mail/u/${userIndex}/`}
            target="_blank" rel="noreferrer"
            className="btn btn-ghost !text-xs"
          >
            <Mail size={11} /> Open this Gmail
          </a>
          {profile.gmailAddress && (
            <button
              onClick={() => { setGmailUser(profileId, { index: 0, address: '' }); setAddress(''); setUserIndex(0); toast.info('Gmail unlinked'); }}
              className="btn btn-ghost !text-xs text-muted"
            >
              <X size={11} /> Unlink
            </button>
          )}
        </div>
      </div>
    </details>
  );
}

// ============================ Tier-status card ============================

function TierStatusCard({ profileId }) {
  const { state, effectiveTier, setTierOverride } = useAWS();
  const profile = state.profiles[profileId];
  if (!profile?.connected) return null;

  const t = effectiveTier;
  const tone =
    t.tier === 'free' ? { border: 'border-success/40', bg: 'bg-success/5', text: 'text-success', label: 'FREE TIER ACTIVE', icon: '🟢' }
    : t.tier === 'paid' ? { border: 'border-warning/40', bg: 'bg-warning/5', text: 'text-warning', label: 'PAID — PAST 12-MONTH FREE TIER', icon: '🟡' }
    : { border: 'border-muted/40', bg: 'bg-[var(--card-2)]/30', text: 'text-muted', label: 'TIER UNKNOWN', icon: '⚪' };

  const info = profile.tierInfo;

  return (
    <section className={cn('surface rounded-2xl p-5 border', tone.border, tone.bg)}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="text-2xl shrink-0">{tone.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={cn('text-[11px] font-extrabold uppercase tracking-widest', tone.text)}>
              {tone.label}
            </h3>
            {info?.accountAlias && (
              <span className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold">
                alias: {info.accountAlias}
              </span>
            )}
            {t.tier === 'free' && t.daysLeft != null && (
              <span className="chip border border-success/40 bg-success/10 text-success text-[10px] font-bold">
                {t.daysLeft} days left in Free Tier
              </span>
            )}
          </div>
          <p className="text-[12px] text-current leading-relaxed">{t.reason}</p>

          {info && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              {info.ageDays != null && (
                <MetaCell label="Account age" value={`${info.ageDays} days`} />
              )}
              {info.oldestUserCreatedAt && (
                <MetaCell label="Oldest IAM user" value={new Date(info.oldestUserCreatedAt).toLocaleDateString()} />
              )}
              {profile.identity?.account && (
                <MetaCell label="Account ID" value={profile.identity.account} mono />
              )}
              <MetaCell label="Detection" value={info.source?.split(' — ')[0] || 'heuristic'} />
            </div>
          )}

          {/* What this means for your work */}
          <div className="mt-3 rounded-lg border border-token bg-[var(--card)] p-3 text-[11px] leading-relaxed space-y-1">
            <div className="font-extrabold">What this means for your work:</div>
            {t.tier === 'free' && (
              <>
                <div>• Architecture Studio + StepGuide will recommend <strong>Free Tier specs</strong> (t2.micro, db.t2.micro, single-AZ, NAT instance).</div>
                <div>• Cost estimator will assume <strong>Free Tier credits cover the first 12 months</strong> on eligible services.</div>
                <div>• Set a $5 billing alarm so you never accidentally exceed limits — see Roadmap → Phase 1.</div>
              </>
            )}
            {t.tier === 'paid' && (
              <>
                <div>• Architecture Studio will recommend <strong>production specs</strong> (right-sized for the workload, not artificially shrunk).</div>
                <div>• Cost estimator runs with <strong>full on-demand pricing</strong>; consider RIs / Savings Plans for steady workloads.</div>
                <div>• Always-Free services (Lambda, DynamoDB, CloudWatch alarms) still don't bill at small scale.</div>
              </>
            )}
            {t.tier === 'unknown' && (
              <div>• Use the manual override below until detection completes, or re-test the connection.</div>
            )}
          </div>

          {/* Manual override */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Manual override:</span>
            <OverrideButton active={profile.tierOverride === null} onClick={() => setTierOverride(profileId, null)}>
              Trust detection
            </OverrideButton>
            <OverrideButton active={profile.tierOverride === 'free'} onClick={() => setTierOverride(profileId, 'free')}>
              Force Free Tier
            </OverrideButton>
            <OverrideButton active={profile.tierOverride === 'paid'} onClick={() => setTierOverride(profileId, 'paid')}>
              Force Paid
            </OverrideButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaCell({ label, value, mono }) {
  return (
    <div className="rounded-lg border border-token bg-[var(--card)] p-2">
      <div className="text-[9px] uppercase font-extrabold tracking-widest text-muted">{label}</div>
      <div className={cn('text-[11px] font-extrabold mt-0.5 truncate', mono && 'font-mono')}>{value}</div>
    </div>
  );
}

function OverrideButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-[10px] font-bold border',
        active ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40' : 'border-token text-muted hover:text-current',
      )}
    >{children}</button>
  );
}

// ============================ Simulate-mode banner ============================

function SimulateModeBanner() {
  const { state, setSimulateMode } = useAWS();
  if (state.simulateMode) {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/[0.04] p-3 flex items-center gap-3">
        <Shield size={16} className="text-success" />
        <div className="flex-1 text-xs">
          <strong className="text-success">Simulation mode is ON.</strong>{' '}
          Plans are walked through end-to-end without making real AWS write API calls. Perfect for learning and demos.
        </div>
        <button onClick={() => { if (confirm('Turn OFF simulation? Future approvals will hit real AWS APIs.')) setSimulateMode(false); }}
                className="btn btn-ghost !text-xs !py-1.5">Turn off</button>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/[0.04] p-3 flex items-center gap-3">
      <AlertCircle size={16} className="text-warning" />
      <div className="flex-1 text-xs">
        <strong className="text-warning">Live mode.</strong>{' '}
        Approving a deployment will issue real AWS API calls and may incur charges.
      </div>
      <button onClick={() => setSimulateMode(true)} className="btn btn-primary !text-xs !py-1.5">
        Switch back to simulation
      </button>
    </div>
  );
}

// ============================ Free-tier monitor ============================

function FreeTierMonitor() {
  const { state, usagePct } = useAWS();
  if (state.activeProfile !== 'free') return null;
  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-aws-orange" />
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Free-tier usage</h3>
        </div>
        <span className="text-[11px] text-muted">Current month, rough estimate</span>
      </div>
      <ul className="space-y-1.5">
        {Object.entries(usagePct).map(([k, v]) => {
          const tone = v.pct >= 95 ? 'bg-danger animate-pulse' : v.pct >= 80 ? 'bg-warning' : 'bg-success';
          return (
            <li key={k} className="flex items-center gap-2 text-xs">
              <span className="w-20 font-bold uppercase tracking-widest">{k}</span>
              <span className="text-muted tabular-nums w-32">
                {v.used.toLocaleString()} / {v.limit.toLocaleString()} {v.unit}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
                <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${v.pct}%` }} />
              </div>
              <span className="tabular-nums font-bold w-10 text-right">{v.pct}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================ Approval modal ============================

function ApprovalModal() {
  const { state, cancelApproval, approveDeployment, estimateMonthlyCost, smartScale } = useAWS();
  const plan = state.pendingApproval;
  const [reviewCode, setReviewCode] = useState(false);
  if (!plan) return null;

  const scaled = smartScale(plan);
  const cost = estimateMonthlyCost(plan);
  const profileLabel = state.activeProfile === 'free' ? 'MY FREE TIER ✅' : '⚠ CLIENT ACCOUNT';

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={cancelApproval} />
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="relative surface rounded-3xl gradient-border w-full max-w-lg p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks size={18} className="text-aws-orange" />
          <h2 className="text-lg font-extrabold tracking-tight flex-1">Ready to deploy</h2>
          <button onClick={cancelApproval} className="p-1.5 rounded-md hover:bg-[var(--card-2)]"><X size={16} /></button>
        </div>

        <div className="text-[11px] text-muted mb-2">Creating:</div>
        <ul className="space-y-1 text-sm">
          {scaled.resources.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
              <span>
                <strong>{r.type}:</strong> {r.label}
                {r.instanceType && <span className="text-muted"> · {r.instanceType}</span>}
                {r.cidr && <span className="text-muted"> · {r.cidr}</span>}
              </span>
            </li>
          ))}
        </ul>

        {scaled.downsizes.length > 0 && (
          <div className="mt-3 rounded-xl border border-success/30 bg-success/[0.04] p-3">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-1">
              ✅ Auto-scaled to free tier
            </div>
            <ul className="text-[11px] space-y-0.5">
              {scaled.downsizes.map((d, i) => (<li key={i} className="text-current">• {d}</li>))}
            </ul>
            <div className="text-[10px] text-muted mt-1">
              Architecture identical — only size differs. Testing configuration not capacity.
            </div>
          </div>
        )}

        {state.activeProfile === 'client' && (
          <div className="mt-3 rounded-xl border border-warning/30 bg-warning/[0.04] p-3 text-[11px]">
            <strong className="text-warning">⚡ Production config active.</strong>{' '}
            Estimated monthly cost: <strong className="text-current">{formatCurrency(cost)}</strong>. These resources bill to the client account.
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Stat label="Account"  value={profileLabel} />
          <Stat label="Cost"     value={state.activeProfile === 'free' ? '$0.00 free tier' : `${formatCurrency(cost)}/mo`} />
          <Stat label="Time"     value="~45 seconds" />
          <Stat label="Region"   value={plan.region || state.profiles[state.activeProfile].region} />
        </div>

        {reviewCode && plan.code && (
          <pre className="mt-3 rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
            {plan.code}
          </pre>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {plan.code && (
            <button onClick={() => setReviewCode((v) => !v)} className="btn btn-ghost !text-xs">
              👀 {reviewCode ? 'Hide code' : 'Review code first'}
            </button>
          )}
          <button onClick={approveDeployment} className="btn btn-primary">
            ✅ Approve and deploy
          </button>
          <button onClick={cancelApproval} className="btn btn-ghost">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}

// ============================ Deployments table ============================

function DeploymentsTable() {
  const { state, setAutoDestroy, destroyDeployment, destroyAll } = useAWS();
  const toast = useToast();
  const deployments = state.deployments;

  if (deployments.length === 0) {
    return (
      <section className="surface rounded-2xl p-8 text-center text-muted">
        <Cloud size={28} className="mx-auto mb-2 text-aws-orange" />
        <p className="text-sm">No deployments yet. Try a deployment from the demo button below.</p>
        <DemoDeployButton />
      </section>
    );
  }

  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Deployments</h3>
        <div className="flex items-center gap-2">
          <DemoDeployButton small />
          <button onClick={() => {
            if (confirm('Destroy ALL resources across every deployment? This cannot be undone.')) {
              destroyAll(); toast.warning('All deployments destroyed');
            }
          }} className="btn btn-ghost !text-xs text-danger">
            <Trash2 size={11} /> Destroy all resources
          </button>
        </div>
      </div>
      <ul className="space-y-3">
        {deployments.map((d) => (
          <DeploymentCard key={d.id} d={d} onSetTimer={setAutoDestroy}
                          onDestroy={() => destroyDeployment(d.id)} />
        ))}
      </ul>
    </section>
  );
}

function DeploymentCard({ d, onSetTimer, onDestroy }) {
  const logRef = useRef(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [d.log.length]);

  const timeLeft = d.autoDestroyAt
    ? Math.max(0, Math.round((d.autoDestroyAt - Date.now()) / 60000))
    : null;
  const statusMeta = {
    running:    { color: 'bg-electric/15 text-electric border-electric/30', label: 'Running' },
    complete:   { color: 'bg-success/15 text-success border-success/30',   label: 'Complete' },
    destroyed:  { color: 'bg-[var(--card-2)] text-muted border-token',     label: 'Destroyed' },
  }[d.status] || { color: 'bg-[var(--card-2)] text-muted border-token', label: d.status };

  return (
    <li className="rounded-2xl border border-token bg-[var(--card-2)]/30 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <span className={cn('chip border text-[10px] font-bold', statusMeta.color)}>{statusMeta.label}</span>
          <span className="text-xs font-bold">{d.plan?.title || 'Deployment'}</span>
          <span className="text-[10px] text-muted">{d.region}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {d.status === 'complete' && timeLeft !== null && (
            <span className="chip border border-warning/30 bg-warning/10 text-warning text-[10px] font-bold">
              Auto-destroy in {timeLeft}m
            </span>
          )}
          {d.status === 'complete' && !d.autoDestroyAt && (
            <AutoDestroyPicker onSet={(h) => onSetTimer(d.id, h)} />
          )}
          {d.status !== 'destroyed' && (
            <button onClick={onDestroy} className="btn btn-ghost !text-[11px] !py-1.5 text-danger">
              <Trash2 size={10} /> Destroy
            </button>
          )}
        </div>
      </div>

      {/* Log */}
      <div ref={logRef} className="rounded-lg border border-token bg-[var(--card)] p-2.5 max-h-44 overflow-y-auto font-mono text-[11px] space-y-0.5">
        {d.log.map((entry) => (
          <div key={entry.id} className={cn(
            entry.level === 'success' ? 'text-success' :
            entry.level === 'warning' ? 'text-warning' :
            entry.level === 'error'   ? 'text-danger' : 'text-muted'
          )}>
            <span className="text-muted/60 mr-2">{new Date(entry.at).toLocaleTimeString().slice(0, 8)}</span>
            {entry.msg}
          </div>
        ))}
      </div>

      {/* Test results */}
      {d.tests && (
        <div className={cn('mt-2 rounded-lg border p-2.5 text-xs',
                           d.tests.failed === 0
                             ? 'border-success/30 bg-success/[0.04] text-success'
                             : 'border-warning/30 bg-warning/[0.04] text-warning')}>
          <strong>Tests:</strong> {d.tests.passed} passed, {d.tests.failed} failed.
          {d.tests.failed > 0 && (
            <button className="ml-2 underline font-bold">[Auto Fix]</button>
          )}
        </div>
      )}
    </li>
  );
}

function AutoDestroyPicker({ onSet }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(4);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="btn btn-ghost !text-[11px] !py-1.5">
        ⏰ Set auto-destroy
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 surface rounded-xl p-3 w-56 shadow-soft-xl gradient-border">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2">
            Auto-destroy timer
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[2, 4, 8, 24].map((h) => (
              <button key={h} onClick={() => { onSet(h); setOpen(false); }}
                      className={cn('rounded-md py-1.5 text-xs font-bold transition border',
                                    h === 4 ? 'border-aws-orange bg-aws-orange/15 text-aws-orange' : 'border-token hover:bg-[var(--card-2)]')}>
                {h}h{h === 4 ? ' ⭐' : ''}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1">
            <input type="number" value={custom} min={1} max={168}
                   onChange={(e) => setCustom(Number(e.target.value) || 0)}
                   className="flex-1 bg-[var(--card-2)] border border-token rounded-md px-2 py-1 text-xs tabular-nums focus-ring focus:border-aws-orange" />
            <button onClick={() => { if (custom > 0) { onSet(custom); setOpen(false); } }}
                    className="btn btn-primary !text-[11px] !py-1.5">Set</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ Resource ledger ============================

function ResourceLedger() {
  const { state, destroyAll } = useAWS();
  if (state.resources.length === 0) return null;
  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Running resources</h3>
        <span className="text-[10px] text-muted">{state.resources.length} active</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase tracking-widest text-muted">
            <tr className="border-b border-token">
              <th className="p-2 text-left">Service</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Region</th>
              <th className="p-2 text-right">Running</th>
              <th className="p-2 text-right">Est cost/hr</th>
            </tr>
          </thead>
          <tbody>
            {state.resources.map((r) => {
              const elapsed = Math.max(0, Math.round((Date.now() - new Date(r.createdAt).getTime()) / 60000));
              return (
                <tr key={r.id} className="border-b border-token last:border-0">
                  <td className="p-2 font-bold">{r.type}</td>
                  <td className="p-2 text-muted">{r.instanceType || r.label}</td>
                  <td className="p-2 text-muted">{r.region}</td>
                  <td className="p-2 text-right tabular-nums">{elapsed} min</td>
                  <td className="p-2 text-right tabular-nums font-bold text-aws-orange">{formatCurrency(r.hourly)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================ Demo deploy ============================

function DemoDeployButton({ small }) {
  const { requestApproval } = useAWS();
  const trigger = () => {
    requestApproval({
      title: 'Multi-AZ VPC + ALB + EC2 web',
      region: 'us-east-1',
      requireVPC: true, requireSubnets: true, requireEC2: true,
      requireHTTP: 'simulated-ok', requireHTTPS: 'simulated-ok',
      code: `# Terraform — generated by Launchpad
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "launchpad-vpc" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_instance" "web" {
  ami           = "ami-0abc12345"
  instance_type = "t3.large"     # auto-scaled to t2.micro in free-tier mode
  subnet_id     = aws_subnet.public_a.id
}`,
      resources: [
        { type: 'VPC',     label: 'launchpad-vpc',   cidr: '10.0.0.0/16' },
        { type: 'Subnet',  label: 'public-a',        cidr: '10.0.1.0/24' },
        { type: 'Subnet',  label: 'public-b',        cidr: '10.0.2.0/24' },
        { type: 'Subnet',  label: 'private-a',       cidr: '10.0.11.0/24' },
        { type: 'Subnet',  label: 'private-b',       cidr: '10.0.12.0/24' },
        { type: 'IGW',     label: 'launchpad-igw' },
        { type: 'NAT Gateway', label: 'nat-az-a' },
        { type: 'ALB',     label: 'launchpad-alb' },
        { type: 'EC2',     label: 'web-1', instanceType: 't3.large' },
        { type: 'EC2',     label: 'web-2', instanceType: 't3.large' },
      ],
    });
  };
  return (
    <button onClick={trigger}
            className={cn('btn btn-primary', small && '!text-xs !py-1.5')}>
      <Plus size={12} /> Demo deploy
    </button>
  );
}

// ============================ shared ============================

function Field({ label, value, onChange, type = 'text', as, options = [], mono, placeholder, right }) {
  return (
    <label className="block">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <div className="mt-1 flex items-center gap-1">
        {as === 'select' ? (
          <select value={value || ''} onChange={(e) => onChange(e.target.value)}
                  className="flex-1 bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange">
            {options.map((o) => {
              const [v, l] = Array.isArray(o) ? o : [o, o];
              return <option key={v} value={v}>{l}</option>;
            })}
          </select>
        ) : (
          <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
                 placeholder={placeholder}
                 className={cn('flex-1 bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm focus-ring focus:border-aws-orange',
                               mono && 'font-mono')} />
        )}
        {right}
      </div>
    </label>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-token bg-[var(--card-2)]/40 p-2">
      <div className="text-[9px] uppercase tracking-widest font-extrabold text-muted">{label}</div>
      <div className="text-xs font-extrabold tabular-nums mt-0.5 truncate">{value}</div>
    </div>
  );
}
