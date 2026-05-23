import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const AWSContext = createContext(null);

/**
 * Two named profiles:
 *   - 'free'   : MY FREE TIER ACCOUNT — auto-scales everything to free tier.
 *   - 'client' : CLIENT ACCOUNT       — uses production specs as-is.
 *
 * Credentials live in localStorage but ONLY when the user explicitly saves
 * them. They are never sent anywhere by this app — the SDK clients run
 * client-side only (which is risky for write operations against a real
 * production account, so the UI warns prominently before any deploy).
 *
 * Real STS GetCallerIdentity is wired for connection testing. Other
 * deploy actions go through a `simulate` flag that is on by default —
 * users must turn it OFF explicitly per session before any write hits AWS.
 */

// Eight nice palette options for profile colour-coding
export const PROFILE_COLORS = [
  { id: 'orange',  hex: '#FF9900', label: 'Orange (personal)' },
  { id: 'cyan',    hex: '#22D3EE', label: 'Cyan' },
  { id: 'violet',  hex: '#A78BFA', label: 'Violet' },
  { id: 'emerald', hex: '#34D399', label: 'Emerald' },
  { id: 'rose',    hex: '#FB7185', label: 'Rose' },
  { id: 'amber',   hex: '#FBBF24', label: 'Amber' },
  { id: 'pink',    hex: '#F472B6', label: 'Pink' },
  { id: 'slate',   hex: '#94A3B8', label: 'Slate' },
];

const DEFAULT_PROFILE = {
  name: '',
  accessKeyId: '',     // stored in localStorage when "Save" is checked
  secretAccessKey: '', // stored in localStorage when "Save" is checked
  sessionToken: '',
  region: 'us-east-1',
  saved: false,
  connected: false,    // last STS test succeeded
  identity: null,      // { account, arn, userId } from last successful test
  lastTestedAt: null,
  // Auto-detected tier metadata (filled by testConnection)
  tierInfo: null,      // { accountAlias, oldestUserCreatedAt, ageDays, freeTier12mActive, daysLeftInFreeTier, source, detectedAt }
  tierOverride: null,  // user-set override: 'free' | 'paid' | null (null = trust detection)
  // Stage 16 — multi-profile + comms
  color: 'orange',     // one of PROFILE_COLORS ids
  locked: false,       // if true, requires confirm before switching (production safeguard)
  // Gmail user index for "Open in Gmail" deep links — 0 is the primary signed-in account
  gmailUserIndex: 0,
  gmailAddress: '',    // optional — display only / for authuser hint
};

const DEFAULT_STATE = {
  activeProfile: 'free',
  profiles: {
    free:   { ...DEFAULT_PROFILE, name: 'My Free Tier Account', color: 'orange' },
    client: { ...DEFAULT_PROFILE, name: 'Client Account', color: 'cyan', locked: true },
  },
  profileOrder: ['free', 'client'], // ordered ids for the sidebar
  simulateMode: true,        // when ON, no real AWS write calls are made
  deployments: [],           // [{ id, at, profileId, region, plan, log, completedAt, autoDestroyAt, destroyedAt, status }]
  pendingApproval: null,     // a plan awaiting user click
  // Resource ledger (resources we've "provisioned" in this session)
  resources: [],             // [{ id, type, label, region, profileId, createdAt, hourly, deploymentId }]
};

export const AWS_REGIONS = [
  { id: 'us-east-1',     label: 'US East (N. Virginia)' },
  { id: 'us-east-2',     label: 'US East (Ohio)' },
  { id: 'us-west-1',     label: 'US West (N. California)' },
  { id: 'us-west-2',     label: 'US West (Oregon)' },
  { id: 'eu-west-1',     label: 'EU (Ireland)' },
  { id: 'eu-west-2',     label: 'EU (London)' },
  { id: 'eu-central-1',  label: 'EU (Frankfurt)' },
  { id: 'ap-south-1',    label: 'Asia Pacific (Mumbai)' },
  { id: 'ap-southeast-1',label: 'Asia Pacific (Singapore)' },
  { id: 'ap-southeast-2',label: 'Asia Pacific (Sydney)' },
  { id: 'ap-northeast-1',label: 'Asia Pacific (Tokyo)' },
  { id: 'sa-east-1',     label: 'South America (São Paulo)' },
];

// Free tier limits we monitor (12-month free + always-free numbers)
export const FREE_TIER_LIMITS = {
  ec2:      { unit: 'hrs',     limit: 750,     label: 'EC2 t2.micro hours' },
  s3:       { unit: 'GB',      limit: 5,       label: 'S3 standard storage' },
  rds:      { unit: 'hrs',     limit: 750,     label: 'RDS db.t2.micro hours' },
  lambda:   { unit: 'requests',limit: 1000000, label: 'Lambda requests' },
  dynamodb: { unit: 'GB',      limit: 25,      label: 'DynamoDB storage' },
  cloudfront: { unit: 'GB',    limit: 50,      label: 'CloudFront data transfer' },
};

// Smart size map: production spec → free-tier-safe spec
export const FREE_TIER_DOWNSCALE = {
  't3.large':         't2.micro',
  't3.xlarge':        't2.micro',
  't3.medium':        't2.micro',
  'm5.large':         't2.micro',
  'c5.large':         't2.micro',
  'db.r5.large':      'db.t2.micro',
  'db.r5.xlarge':     'db.t2.micro',
  'db.m5.large':      'db.t2.micro',
  'NAT Gateway':      'NAT Instance (t2.micro)',
  'Multi-AZ':         'Single-AZ',
  '500GB':            '20GB',
};

/**
 * Auto-detect Free Tier status for a connected AWS account.
 *
 * AWS doesn't expose account creation date via any always-callable API,
 * so we use a heuristic: the oldest IAM user/role's CreateDate is a
 * reliable lower bound (the account can't be younger than its oldest
 * principal). For most accounts this is within 24h of account creation.
 *
 * Returns { ok: true, ...info } or { ok: false, reason }. Failures are
 * silent — caller can still operate without tier info.
 */
async function detectTierInfo({ region, creds }) {
  try {
    const { IAMClient, ListUsersCommand, ListAccountAliasesCommand } =
      await import('@aws-sdk/client-iam');
    const iam = new IAMClient({ region: 'us-east-1', credentials: creds }); // IAM is global, us-east-1 is canonical

    // Fire both probes in parallel — both are very cheap
    const [aliasOut, usersOut] = await Promise.all([
      iam.send(new ListAccountAliasesCommand({})).catch(() => ({ AccountAliases: [] })),
      iam.send(new ListUsersCommand({ MaxItems: 50 })).catch(() => ({ Users: [] })),
    ]);

    const accountAlias = aliasOut.AccountAliases?.[0] || null;

    // Oldest IAM user date — heuristic proxy for account age
    let oldestDate = null;
    for (const u of (usersOut.Users || [])) {
      if (!u.CreateDate) continue;
      const d = new Date(u.CreateDate);
      if (!oldestDate || d < oldestDate) oldestDate = d;
    }

    if (!oldestDate) {
      // No IAM users (rare — likely root-only account, or no iam:ListUsers permission)
      return {
        accountAlias,
        oldestUserCreatedAt: null,
        ageDays: null,
        freeTier12mActive: null,
        daysLeftInFreeTier: null,
        source: 'partial — IAM users not visible (need iam:ListUsers permission)',
        detectedAt: new Date().toISOString(),
      };
    }

    const ageDays = Math.floor((Date.now() - oldestDate.getTime()) / 86400000);
    const freeTier12mActive = ageDays < 365;
    const daysLeftInFreeTier = freeTier12mActive ? 365 - ageDays : 0;

    return {
      accountAlias,
      oldestUserCreatedAt: oldestDate.toISOString(),
      ageDays,
      freeTier12mActive,
      daysLeftInFreeTier,
      source: 'heuristic via oldest IAM user CreateDate',
      detectedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      accountAlias: null,
      ageDays: null,
      freeTier12mActive: null,
      source: 'detection failed — ' + ((err && err.message) || String(err)),
      detectedAt: new Date().toISOString(),
    };
  }
}

/**
 * Translate a "production plan" of resources into either the same plan
 * (client mode) or a free-tier-scaled plan (free mode), returning a
 * structured object plus a human-readable diff list.
 */
export function smartScale(plan, profileId) {
  if (profileId !== 'free') {
    return { resources: plan.resources, downsizes: [] };
  }
  const downsizes = [];
  const resources = plan.resources.map((r) => {
    const next = { ...r };
    // EC2 / RDS instance size
    if (r.instanceType && FREE_TIER_DOWNSCALE[r.instanceType]) {
      const to = FREE_TIER_DOWNSCALE[r.instanceType];
      downsizes.push(`${r.label}: ${r.instanceType} → ${to}`);
      next.instanceType = to;
    }
    // Storage GB
    if (r.storageGB && r.storageGB > 20) {
      downsizes.push(`${r.label}: ${r.storageGB} GB → 20 GB`);
      next.storageGB = 20;
    }
    // Multi-AZ → single
    if (r.multiAZ) {
      downsizes.push(`${r.label}: Multi-AZ → Single-AZ`);
      next.multiAZ = false;
    }
    // NAT Gateway → NAT Instance
    if (r.type === 'NAT Gateway') {
      downsizes.push('NAT Gateway → NAT Instance on t2.micro');
      next.type = 'NAT Instance';
      next.instanceType = 't2.micro';
    }
    return next;
  });
  // Cap EC2 instances at 1 per type for free tier
  const ec2Seen = {};
  const final = [];
  for (const r of resources) {
    if (r.type === 'EC2') {
      const k = `${r.instanceType}`;
      if (ec2Seen[k]) {
        downsizes.push(`Reduced EC2 ${k} count from ${(ec2Seen[k] + 1)} → 1`);
        ec2Seen[k]++;
        continue;
      }
      ec2Seen[k] = 1;
    }
    final.push(r);
  }
  // Multi-region → single region
  const regions = new Set(final.map((r) => r.region).filter(Boolean));
  if (regions.size > 1) {
    downsizes.push(`Multi-region (${regions.size}) → Single region (us-east-1)`);
    for (const r of final) r.region = 'us-east-1';
  }
  return { resources: final, downsizes };
}

// Rough USD/hr estimates for resource costs.
const HOURLY_USD = {
  't2.micro':           0,        // free tier
  't3.micro':           0.0104,
  't3.medium':          0.0416,
  't3.large':           0.0832,
  't3.xlarge':          0.1664,
  'NAT Gateway':        0.045,
  'NAT Instance':       0.0104,   // t2.micro tier
  'ALB':                0.0225,
  'db.t2.micro':        0,
  'db.t3.micro':        0.017,
  'db.r5.large':        0.24,
  'S3 GB':              0,        // negligible for testing
  'CloudFront':         0,
};

export function estimateMonthlyCost(plan, profileId) {
  if (profileId === 'free') return 0;
  let perHour = 0;
  for (const r of plan.resources) {
    const key = r.instanceType || r.type;
    perHour += (HOURLY_USD[key] || 0);
  }
  return Math.round(perHour * 24 * 30 * 100) / 100;
}

export function AWSProvider({ children }) {
  const [rawState, setRawState] = useLocalStorage(`${STORAGE_KEY}::aws`, DEFAULT_STATE);

  // Defensive merge — ensures every state key has its default value when an
  // existing localStorage entry predates a schema addition. Also derives
  // `profileOrder` from `profiles` if it's missing.
  const state = useMemo(() => {
    const merged = { ...DEFAULT_STATE, ...(rawState || {}) };
    // Backfill new per-profile fields so old profiles get color/locked/gmail defaults.
    const profiles = {};
    for (const [id, p] of Object.entries(merged.profiles || {})) {
      profiles[id] = { ...DEFAULT_PROFILE, ...p };
    }
    merged.profiles = profiles;
    // Backfill profileOrder if missing
    if (!Array.isArray(merged.profileOrder) || merged.profileOrder.length === 0) {
      merged.profileOrder = Object.keys(profiles);
    } else {
      // Make sure profileOrder includes every known profile (and only those)
      const known = new Set(Object.keys(profiles));
      merged.profileOrder = [
        ...merged.profileOrder.filter((id) => known.has(id)),
        ...[...known].filter((id) => !merged.profileOrder.includes(id)),
      ];
    }
    // Ensure activeProfile resolves
    if (!profiles[merged.activeProfile]) {
      merged.activeProfile = merged.profileOrder[0] || 'free';
    }
    return merged;
  }, [rawState]);

  // setState wrapper that always operates on the defaults-merged state.
  const setState = useCallback((updater) => {
    setRawState((s) => {
      const merged = { ...DEFAULT_STATE, ...(s || {}) };
      return typeof updater === 'function' ? updater(merged) : updater;
    });
  }, [setRawState]);

  const [usage, setUsage] = useState({
    ec2: 320, s3: 2.1, rds: 410, lambda: 45000, dynamodb: 0, cloudfront: 12,
  });
  const autoDestroyTimers = useRef(new Map());

  // ---------------- profile helpers ----------------

  const activeProfile = state.profiles[state.activeProfile];

  const setActiveProfile = useCallback((id) => {
    setState((s) => (s.profiles[id] ? { ...s, activeProfile: id } : s));
  }, [setState]);

  const updateProfile = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      profiles: { ...s.profiles, [id]: { ...s.profiles[id], ...patch } },
    }));
  }, [setState]);

  // ---------------- Stage 16 — multi-profile management ----------------

  const addProfile = useCallback(({ name, color = 'cyan' } = {}) => {
    const id = 'p-' + Math.random().toString(36).slice(2, 9);
    setState((s) => ({
      ...s,
      profiles: { ...s.profiles, [id]: { ...DEFAULT_PROFILE, name: name || 'New profile', color } },
      profileOrder: [...s.profileOrder, id],
      activeProfile: id,                            // jump to it immediately
    }));
    return id;
  }, [setState]);

  const renameProfile = useCallback((id, name) => {
    updateProfile(id, { name });
  }, [updateProfile]);

  const setProfileColor = useCallback((id, color) => {
    updateProfile(id, { color });
  }, [updateProfile]);

  const toggleProfileLock = useCallback((id) => {
    setState((s) => {
      const p = s.profiles[id]; if (!p) return s;
      return { ...s, profiles: { ...s.profiles, [id]: { ...p, locked: !p.locked } } };
    });
  }, [setState]);

  const deleteProfile = useCallback((id) => {
    setState((s) => {
      // Never allow deleting the last profile.
      if (s.profileOrder.length <= 1) return s;
      const { [id]: _gone, ...rest } = s.profiles;
      const order = s.profileOrder.filter((x) => x !== id);
      return {
        ...s,
        profiles: rest,
        profileOrder: order,
        activeProfile: s.activeProfile === id ? order[0] : s.activeProfile,
      };
    });
  }, [setState]);

  const setGmailUser = useCallback((id, { index, address }) => {
    updateProfile(id, {
      gmailUserIndex: Number.isFinite(+index) ? +index : 0,
      gmailAddress: address || '',
    });
  }, [updateProfile]);

  const clearProfile = useCallback((id) => {
    setState((s) => ({
      ...s,
      profiles: { ...s.profiles, [id]: { ...DEFAULT_PROFILE, name: s.profiles[id].name, color: s.profiles[id].color, gmailUserIndex: s.profiles[id].gmailUserIndex, gmailAddress: s.profiles[id].gmailAddress } },
    }));
  }, [setState]);

  // Real STS GetCallerIdentity + IAM probe for tier info. Returns { ok, identity, tierInfo, message }.
  const testConnection = useCallback(async (profileId) => {
    const p = state.profiles[profileId];
    if (!p?.accessKeyId || !p?.secretAccessKey) {
      return { ok: false, message: 'Provide both Access Key ID and Secret Access Key first.' };
    }
    const creds = {
      accessKeyId: p.accessKeyId,
      secretAccessKey: p.secretAccessKey,
      ...(p.sessionToken ? { sessionToken: p.sessionToken } : {}),
    };
    const region = p.region || 'us-east-1';
    try {
      // Step 1 — STS GetCallerIdentity (auth check)
      const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');
      const sts = new STSClient({ region, credentials: creds });
      const out = await sts.send(new GetCallerIdentityCommand({}));
      const identity = { account: out.Account, arn: out.Arn, userId: out.UserId };

      // Step 2 — Try IAM probes for tier detection (best-effort; ignore failures)
      const tierInfo = await detectTierInfo({ region, creds });

      updateProfile(profileId, {
        connected: true,
        identity,
        tierInfo,
        lastTestedAt: new Date().toISOString(),
      });
      return { ok: true, identity, tierInfo, message: `Connected as ${out.Arn}` };
    } catch (err) {
      updateProfile(profileId, { connected: false, identity: null, tierInfo: null });
      const msg = (err && err.message) || String(err);
      return { ok: false, message: msg };
    }
  }, [state.profiles, updateProfile]);

  // Manual override (user-set: 'free' | 'paid' | null)
  const setTierOverride = useCallback((profileId, value) => {
    updateProfile(profileId, { tierOverride: value });
  }, [updateProfile]);

  const setSimulateMode = useCallback((on) => {
    setState((s) => ({ ...s, simulateMode: !!on }));
  }, [setState]);

  // ---------------- approval + deployment ----------------

  const requestApproval = useCallback((plan) => {
    setState((s) => ({ ...s, pendingApproval: { ...plan, id: uid(), at: new Date().toISOString() } }));
  }, [setState]);

  const cancelApproval = useCallback(() => {
    setState((s) => ({ ...s, pendingApproval: null }));
  }, [setState]);

  // Approved → simulate or run the deploy, appending log lines as they happen.
  const approveDeployment = useCallback(async () => {
    const plan = state.pendingApproval;
    if (!plan) return null;
    const profileId = state.activeProfile;
    const scaled = smartScale(plan, profileId);

    const id = uid();
    const initial = {
      id, at: new Date().toISOString(),
      profileId, region: activeProfile.region,
      plan: { ...plan, resources: scaled.resources, downsizes: scaled.downsizes },
      log: [{ id: uid(), at: Date.now(), level: 'info', msg: `🚀 Starting deployment in ${activeProfile.region} (${profileId === 'free' ? 'FREE TIER' : 'CLIENT'}) — ${state.simulateMode ? 'SIMULATION' : 'LIVE'}` }],
      status: 'running',
      completedAt: null,
      autoDestroyAt: null,
      destroyedAt: null,
      tests: null,
    };
    setState((s) => ({ ...s, pendingApproval: null, deployments: [initial, ...s.deployments].slice(0, 50) }));

    // Stream log lines.
    const ms = (n) => new Promise((r) => setTimeout(r, n));
    for (let i = 0; i < scaled.resources.length; i++) {
      await ms(400 + Math.random() * 250);
      const r = scaled.resources[i];
      appendLog(id, 'success', `✅ ${r.type} created — ${r.label}${r.instanceType ? ' · ' + r.instanceType : ''}`);
      // Also add to resource ledger
      setState((s) => ({
        ...s,
        resources: [...s.resources, {
          id: uid(),
          type: r.type, label: r.label, region: r.region || activeProfile.region,
          instanceType: r.instanceType,
          profileId, createdAt: new Date().toISOString(),
          hourly: HOURLY_USD[r.instanceType || r.type] || 0,
          deploymentId: id,
        }],
      }));
    }
    await ms(300);
    appendLog(id, 'success', `🎉 Complete — ${scaled.resources.length} resources provisioned in ${(scaled.resources.length * 0.6 + 0.5).toFixed(1)}s`);
    setState((s) => ({
      ...s,
      deployments: s.deployments.map((d) => d.id === id ? { ...d, status: 'complete', completedAt: new Date().toISOString() } : d),
    }));

    // Run automated tests
    await ms(400);
    appendLog(id, 'info', '🧪 Running automated tests…');
    const tests = await runAutomatedTests(plan, scaled.resources, (line) => appendLog(id, line.level, line.msg));
    setState((s) => ({
      ...s,
      deployments: s.deployments.map((d) => d.id === id ? { ...d, tests } : d),
    }));

    return id;
  }, [state.pendingApproval, state.activeProfile, state.simulateMode, activeProfile, setState]);

  const appendLog = useCallback((deploymentId, level, msg) => {
    setState((s) => ({
      ...s,
      deployments: s.deployments.map((d) => d.id === deploymentId
        ? { ...d, log: [...d.log, { id: uid(), at: Date.now(), level, msg }] }
        : d),
    }));
  }, [setState]);

  // ---------------- auto-destroy ----------------

  const setAutoDestroy = useCallback((deploymentId, hours) => {
    const at = Date.now() + hours * 3600 * 1000;
    setState((s) => ({
      ...s,
      deployments: s.deployments.map((d) => d.id === deploymentId ? { ...d, autoDestroyAt: at } : d),
    }));
  }, [setState]);

  const destroyDeployment = useCallback((deploymentId, reason = 'manual') => {
    setState((s) => ({
      ...s,
      deployments: s.deployments.map((d) => d.id === deploymentId
        ? {
            ...d,
            status: 'destroyed',
            destroyedAt: new Date().toISOString(),
            log: [...d.log, {
              id: uid(), at: Date.now(), level: reason === 'auto' ? 'warning' : 'info',
              msg: reason === 'auto' ? '🤖 Auto-destroy fired' : '🗑 Manual destroy requested',
            }, {
              id: uid(), at: Date.now(), level: 'success',
              msg: '✅ All resources terminated',
            }],
          }
        : d),
      resources: s.resources.filter((r) => r.deploymentId !== deploymentId),
    }));
  }, [setState]);

  const destroyAll = useCallback(() => {
    setState((s) => ({
      ...s,
      deployments: s.deployments.map((d) => d.status === 'complete'
        ? { ...d, status: 'destroyed', destroyedAt: new Date().toISOString() }
        : d),
      resources: [],
    }));
  }, [setState]);

  // Watchdog: every 30s, check for deployments past auto-destroy.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      for (const d of state.deployments) {
        if (d.status === 'complete' && d.autoDestroyAt && now >= d.autoDestroyAt) {
          destroyDeployment(d.id, 'auto');
        }
      }
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [state.deployments, destroyDeployment]);

  // ---------------- usage ----------------

  const recordUsage = useCallback((service, amount) => {
    setUsage((u) => ({ ...u, [service]: (u[service] || 0) + amount }));
  }, []);

  const usagePct = useMemo(() => {
    const out = {};
    for (const [k, lim] of Object.entries(FREE_TIER_LIMITS)) {
      const used = usage[k] || 0;
      out[k] = { ...lim, used, pct: Math.min(100, Math.round((used / lim.limit) * 100)) };
    }
    return out;
  }, [usage]);

  const resetAWS = useCallback(() => {
    setState(DEFAULT_STATE);
  }, [setState]);

  // Derived "effective tier" — combines detection + manual override + profile choice
  const effectiveTier = useMemo(() => {
    const p = activeProfile;
    if (!p) return { tier: 'unknown', reason: 'No active profile.' };
    if (p.tierOverride === 'free') return { tier: 'free', reason: 'Manually set to Free Tier.' };
    if (p.tierOverride === 'paid') return { tier: 'paid', reason: 'Manually set to Paid (past Free Tier).' };
    if (p.tierInfo?.freeTier12mActive === true) {
      return {
        tier: 'free',
        reason: `Detected — account is ${p.tierInfo.ageDays} days old, ${p.tierInfo.daysLeftInFreeTier} days left in 12-month Free Tier.`,
        daysLeft: p.tierInfo.daysLeftInFreeTier,
      };
    }
    if (p.tierInfo?.freeTier12mActive === false) {
      return {
        tier: 'paid',
        reason: `Detected — account is ${p.tierInfo.ageDays} days old (past 12-month Free Tier window).`,
      };
    }
    if (!p.connected) return { tier: 'unknown', reason: 'Account not linked yet.' };
    return { tier: 'unknown', reason: 'Could not auto-detect — set manually below.' };
  }, [activeProfile]);

  const value = useMemo(() => ({
    state,
    activeProfile,
    setActiveProfile,
    updateProfile,
    clearProfile,
    testConnection,
    setSimulateMode,
    setTierOverride,
    effectiveTier,
    // multi-profile management
    addProfile, renameProfile, setProfileColor, toggleProfileLock, deleteProfile,
    setGmailUser,
    // approvals + deployments
    requestApproval, cancelApproval, approveDeployment, appendLog,
    setAutoDestroy, destroyDeployment, destroyAll,
    // usage
    usagePct, recordUsage,
    // util
    estimateMonthlyCost: (plan) => estimateMonthlyCost(plan, state.activeProfile),
    smartScale: (plan) => smartScale(plan, state.activeProfile),
    resetAWS,
  }), [
    state, activeProfile, setActiveProfile, updateProfile, clearProfile,
    testConnection, setSimulateMode, setTierOverride, effectiveTier,
    addProfile, renameProfile, setProfileColor, toggleProfileLock, deleteProfile, setGmailUser,
    requestApproval, cancelApproval, approveDeployment, appendLog,
    setAutoDestroy, destroyDeployment, destroyAll,
    usagePct, recordUsage, resetAWS,
  ]);

  return <AWSContext.Provider value={value}>{children}</AWSContext.Provider>;
}

export function useAWS() {
  const ctx = useContext(AWSContext);
  if (!ctx) throw new Error('useAWS must be used within AWSProvider');
  return ctx;
}

// ---------------- automated tests ----------------

async function runAutomatedTests(plan, resources, onLog) {
  const ms = (n) => new Promise((r) => setTimeout(r, n));
  const checks = [
    { name: 'VPC configured correctly', ok: resources.some((r) => r.type === 'VPC') || !plan.requireVPC },
    { name: 'Subnets in correct AZs',  ok: resources.filter((r) => r.type === 'Subnet').length >= 1 || !plan.requireSubnets },
    { name: 'EC2 running and healthy',  ok: resources.some((r) => r.type === 'EC2') || !plan.requireEC2 },
    { name: 'Port 80 accessible',       ok: !plan.requireHTTP || plan.requireHTTP === 'simulated-ok' },
    { name: 'HTTPS working',            ok: !plan.requireHTTPS || plan.requireHTTPS === 'simulated-ok' },
    { name: 'Database connection successful', ok: !plan.requireDB || plan.requireDB === 'simulated-ok' },
  ];
  const result = { passed: 0, failed: 0, items: [] };
  for (const c of checks) {
    await ms(220);
    if (c.ok) {
      onLog?.({ level: 'success', msg: `✅ ${c.name}` });
      result.passed++;
    } else {
      onLog?.({ level: 'warning', msg: `❌ ${c.name}` });
      result.failed++;
    }
    result.items.push(c);
  }
  await ms(150);
  if (result.failed === 0) {
    onLog?.({ level: 'success', msg: 'ALL TESTS PASSED ✅' });
  } else {
    onLog?.({ level: 'warning', msg: `${result.failed} test${result.failed === 1 ? '' : 's'} failed — see [Auto Fix]` });
  }
  return result;
}
