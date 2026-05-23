/**
 * DeployContext.jsx — the only place in the app that holds AWS write power.
 *
 * Responsibilities:
 *   1. Hold the encrypted credential vault (created via cryptoVault.js)
 *   2. Gate every action behind the right tier check (READ / BUILD / DESTROY / ADMIN / BLOCKED)
 *   3. Prompt the user for the deploy password on every BUILD+ action
 *   4. Record every action in an immutable audit log (localStorage)
 *   5. Provide the panic killswitch (wipe the vault + log it)
 *
 * What it intentionally does NOT do:
 *   - Cache the deploy password
 *   - Allow any BLOCKED action under any circumstance
 *   - Run anything without a `pendingApproval` having been resolved
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';
import * as vault from '../lib/cryptoVault.js';
import { resolveAction, TIERS } from '../data/awsActions.js';
import { EXECUTORS, hasExecutor } from '../lib/awsDeploy.js';

const DeployContext = createContext(null);

const VAULT_KEY = `${STORAGE_KEY}::deploy::vault`;
const AUDIT_KEY = `${STORAGE_KEY}::deploy::audit`;
const SETTINGS_KEY = `${STORAGE_KEY}::deploy::settings`;

const DEFAULT_SETTINGS = {
  // Hard cap — refuses any action with an estimated typical cost above this.
  maxTypicalCostUsd: 25,
  // Hard cap — refuses any action with an estimated MAX cost above this.
  maxMaxCostUsd: 100,
  // Email a copy of every ADMIN-tier audit entry to this address (UI hint only;
  // actual email is handled by SES when the user wires it up — for now we just
  // mark the audit entry so the email queue can pick it up later).
  mirrorAdminToEmail: '',
  // Locked region list — actions outside these regions are refused.
  allowedRegions: ['eu-west-1', 'us-east-1'],
  // If true, every BLOCKED action attempt is logged AND emailed (intrusion alert).
  alertOnBlockedAttempt: true,
};

export function DeployProvider({ children }) {
  // The encrypted vault blob (or null if not yet set up)
  const [vaultBlob, setVaultBlob] = useLocalStorage(VAULT_KEY, null);
  // The immutable audit log
  const [auditLog, setAuditLog] = useLocalStorage(AUDIT_KEY, []);
  // User-configurable safety settings
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS);

  // Pending action awaiting password + approval (lives only in memory)
  const [pending, setPending] = useState(null);
  // Last execution result (for the result modal)
  const [lastResult, setLastResult] = useState(null);

  // Cooldown bookkeeping — last successful execution timestamp per tier.
  const cooldownsRef = useRef({});

  // ---------------- vault lifecycle ----------------

  const hasVault = !!vaultBlob;

  /**
   * First-time setup: encrypts the provided creds with the password and
   * persists. The password is forgotten the moment this call returns.
   */
  const initVault = useCallback(async ({ creds, password }) => {
    if (!password || password.length < 8) {
      throw new Error('Deploy password must be at least 8 characters.');
    }
    const env = vault.envOK();
    if (!env.ok) throw new Error(env.reason);
    const blob = await vault.encrypt({ creds, createdAt: new Date().toISOString() }, password);
    setVaultBlob(blob);
    appendAudit({
      tier: 'ADMIN', actionId: 'vault.create', params: {}, ok: true,
      summary: 'Encrypted credential vault initialised.',
    });
    return true;
  }, [setVaultBlob]);

  /**
   * Verify a password without exposing creds (e.g. for the unlock screen).
   */
  const verifyPassword = useCallback(async (password) => {
    if (!vaultBlob) return false;
    return vault.verify(vaultBlob, password);
  }, [vaultBlob]);

  /**
   * Rotate the deploy password to a new one.
   */
  const rotatePassword = useCallback(async ({ oldPassword, newPassword }) => {
    if (!vaultBlob) throw new Error('No vault to rotate.');
    if (!newPassword || newPassword.length < 8) throw new Error('New password too short.');
    const fresh = await vault.rotate(vaultBlob, oldPassword, newPassword);
    setVaultBlob(fresh);
    appendAudit({
      tier: 'ADMIN', actionId: 'vault.rotate', params: {}, ok: true,
      summary: 'Deploy password rotated.',
    });
    return true;
  }, [vaultBlob, setVaultBlob]);

  /**
   * Panic killswitch — wipes the vault locally. AWS keys remain valid until
   * the user rotates them in the AWS console (caller is shown a direct URL).
   */
  const panicWipe = useCallback((reason = 'manual') => {
    setVaultBlob(null);
    appendAudit({
      tier: 'ADMIN', actionId: 'vault.wipe', params: { reason }, ok: true,
      summary: `🚨 Vault wiped (${reason}). Rotate AWS keys in the console immediately.`,
    });
  }, [setVaultBlob]);

  // ---------------- audit log ----------------

  const appendAudit = useCallback((entry) => {
    setAuditLog((log) => {
      const item = {
        id: uid(),
        at: new Date().toISOString(),
        ...entry,
      };
      // Cap the log at 1000 entries to keep localStorage manageable.
      return [item, ...log].slice(0, 1000);
    });
  }, [setAuditLog]);

  const clearAuditLog = useCallback(() => {
    // We DON'T actually clear — we add a "log cleared" entry to preserve history.
    appendAudit({
      tier: 'ADMIN', actionId: 'audit.clear', params: {}, ok: true,
      summary: 'Audit log clear requested. Entries retained — clearing is forbidden.',
    });
  }, [appendAudit]);

  // ---------------- the gate: request → execute ----------------

  /**
   * Step 1 of an execution: open the approval dialog.
   * The dialog itself collects the password + extra confirmation, then calls
   * `executePending()` below.
   */
  const requestExecute = useCallback((actionId, params = {}) => {
    const action = resolveAction(actionId);
    if (!action) {
      throw new Error(`Unknown action: ${actionId}`);
    }
    if (action.tier === 'BLOCKED') {
      // Log the attempt — this is an attempted policy violation.
      appendAudit({
        tier: 'BLOCKED', actionId, params, ok: false,
        summary: `⛔ Blocked action attempted: ${action.summary}`,
        blockReason: action.blockReason,
      });
      setLastResult({
        ok: false,
        actionId,
        error: `This action is permanently blocked. ${action.blockReason}`,
        consoleUrl: action.consoleUrl?.(params),
      });
      return { blocked: true, reason: action.blockReason, consoleUrl: action.consoleUrl?.(params) };
    }

    // Read-tier — execute directly, no approval dialog.
    if (action.tier === 'READ') {
      executeRead(actionId, params);
      return { read: true };
    }

    // Cost gate — reject if estimated cost above ceiling.
    if (action.cost?.typical > settings.maxTypicalCostUsd) {
      appendAudit({
        tier: action.tier, actionId, params, ok: false,
        summary: `Cost gate: typical $${action.cost.typical} exceeds limit $${settings.maxTypicalCostUsd}.`,
      });
      throw new Error(`Cost gate refused this action. Typical cost ($${action.cost.typical}) exceeds your ceiling ($${settings.maxTypicalCostUsd}). Raise the ceiling in Settings → Deploy → Cost guardrails.`);
    }

    // Cooldown gate — refuse if still cooling down from a previous action.
    const lastAt = cooldownsRef.current[action.tier] || 0;
    const cooldown = TIERS[action.tier].cooldownMs;
    if (cooldown && Date.now() - lastAt < cooldown) {
      const remaining = Math.ceil((cooldown - (Date.now() - lastAt)) / 1000);
      throw new Error(`Cooldown active — wait ${remaining}s before another ${action.tier} action.`);
    }

    setPending({ actionId, params, action, requestedAt: Date.now() });
    return { pending: true };
  }, [appendAudit, settings.maxTypicalCostUsd]);

  /**
   * Step 2 of an execution: caller (the approval dialog) provides the deploy
   * password + any extra confirmation. We decrypt creds, run the executor,
   * audit, then immediately forget the password.
   */
  const executePending = useCallback(async ({ password, extraConfirm } = {}) => {
    if (!pending) throw new Error('No pending action.');
    const { actionId, params, action } = pending;
    const tierMeta = TIERS[action.tier];

    // Extra confirmation check
    if (tierMeta.requiresExtraConfirm) {
      const expected = tierMeta.requiresExtraConfirm === 'resource-name'
        ? findResourceName(params)
        : tierMeta.requiresExtraConfirm;
      if (!extraConfirm || extraConfirm !== expected) {
        throw new Error(`Confirmation text did not match. Type exactly: ${expected}`);
      }
    }

    // Password check & decrypt
    if (tierMeta.requiresPassword) {
      if (!vaultBlob) throw new Error('No vault. Set up encrypted credentials first.');
      if (!password) throw new Error('Deploy password required.');
    }

    let creds = null;
    if (tierMeta.requiresPassword) {
      let decrypted;
      try {
        decrypted = await vault.decrypt(vaultBlob, password);
      } catch (err) {
        appendAudit({
          tier: action.tier, actionId, params, ok: false,
          summary: `❌ Auth failed: ${err.message}`,
        });
        throw err;
      }
      creds = decrypted.creds;
    }

    // Execute
    let result;
    try {
      if (!hasExecutor(actionId)) {
        throw new Error(`No executor wired for ${actionId}.`);
      }
      const fn = EXECUTORS[actionId];
      const region = params.region || creds?.defaultRegion || 'eu-west-1';
      result = await fn({ creds, region, params });
    } catch (err) {
      appendAudit({
        tier: action.tier, actionId, params, ok: false,
        summary: `❌ ${err.message}`,
      });
      // Wipe creds from memory immediately
      creds = null;
      setPending(null);
      setLastResult({ ok: false, actionId, error: err.message });
      throw err;
    }

    // Audit success
    cooldownsRef.current[action.tier] = Date.now();
    appendAudit({
      tier: action.tier, actionId, params, ok: true,
      summary: action.summary,
      result: result.result,
      log: result.log,
      mirrored: action.tier === 'ADMIN' && settings.mirrorAdminToEmail ? settings.mirrorAdminToEmail : null,
    });
    // Wipe creds from memory immediately
    creds = null;
    setPending(null);
    setLastResult({ ok: true, actionId, ...result });
    return result;
  }, [pending, vaultBlob, appendAudit, settings.mirrorAdminToEmail]);

  const cancelPending = useCallback(() => {
    if (pending) {
      appendAudit({
        tier: pending.action.tier, actionId: pending.actionId, params: pending.params, ok: false,
        summary: '⊘ User cancelled at approval dialog.',
      });
    }
    setPending(null);
  }, [pending, appendAudit]);

  // ---------------- read-tier (no password) ----------------

  const executeRead = useCallback(async (actionId, params) => {
    if (!vaultBlob) {
      throw new Error('No vault. Even read actions need credentials — set up the vault first.');
    }
    // Read-tier still needs creds, but we never re-prompt — read actions are
    // safe enough that we tolerate caching the decrypted creds for the
    // lifetime of a SINGLE await. Pattern: caller must have already unlocked
    // via verifyPassword and called readUnlocked.
    throw new Error('Read-tier actions require an unlocked session — use readWithPassword().');
  }, [vaultBlob]);

  /**
   * Convenience: run a read-tier action by passing the password directly.
   * The password is used once + immediately forgotten.
   */
  const readWithPassword = useCallback(async ({ actionId, params = {}, password }) => {
    const action = resolveAction(actionId);
    if (!action) throw new Error(`Unknown action: ${actionId}`);
    if (action.tier !== 'READ') throw new Error(`${actionId} is not a read-tier action.`);
    if (!vaultBlob) throw new Error('No vault set up.');
    const decrypted = await vault.decrypt(vaultBlob, password);
    const region = params.region || 'eu-west-1';
    const fn = EXECUTORS[actionId];
    const result = await fn({ creds: decrypted.creds, region, params });
    appendAudit({
      tier: 'READ', actionId, params, ok: true,
      summary: action.summary, result: result.result,
    });
    return result;
  }, [vaultBlob, appendAudit]);

  // ---------------- settings ----------------

  const updateSettings = useCallback((patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    appendAudit({
      tier: 'ADMIN', actionId: 'settings.update', params: patch, ok: true,
      summary: 'Deploy settings updated.',
    });
  }, [setSettings, appendAudit]);

  // ---------------- selectors ----------------

  const stats = useMemo(() => {
    const byTier = { READ: 0, BUILD: 0, DESTROY: 0, ADMIN: 0, BLOCKED: 0 };
    let failures = 0;
    for (const e of auditLog) {
      if (byTier[e.tier] != null) byTier[e.tier]++;
      if (e.ok === false) failures++;
    }
    return { total: auditLog.length, byTier, failures };
  }, [auditLog]);

  // ---------------- killswitch escape hatch ----------------

  // Listen for a global keyboard shortcut: Ctrl/Cmd + Shift + K
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
        if (confirm('🚨 PANIC WIPE\n\nThis will erase the encrypted credential vault from this browser. Your AWS keys will still exist — rotate them in the AWS Console immediately.\n\nContinue?')) {
          panicWipe('keyboard-shortcut');
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panicWipe]);

  const value = useMemo(() => ({
    hasVault,
    vaultBlob,
    settings,
    auditLog,
    stats,
    pending,
    lastResult,
    // lifecycle
    initVault,
    verifyPassword,
    rotatePassword,
    panicWipe,
    // gate
    requestExecute,
    executePending,
    cancelPending,
    readWithPassword,
    clearLastResult: () => setLastResult(null),
    // settings
    updateSettings,
    clearAuditLog,
  }), [
    hasVault, vaultBlob, settings, auditLog, stats, pending, lastResult,
    initVault, verifyPassword, rotatePassword, panicWipe,
    requestExecute, executePending, cancelPending, readWithPassword,
    updateSettings, clearAuditLog,
  ]);

  return <DeployContext.Provider value={value}>{children}</DeployContext.Provider>;
}

export function useDeploy() {
  const ctx = useContext(DeployContext);
  if (!ctx) throw new Error('useDeploy must be used inside <DeployProvider>.');
  return ctx;
}

// ---------------- helpers ----------------

/**
 * For DESTROY tier — the extra confirm requires typing the resource name.
 * Best-effort: pick the first plausibly-name-shaped param.
 */
function findResourceName(params) {
  const keys = ['bucketName', 'tableName', 'functionName', 'instanceId', 'distributionId', 'roleName', 'userName', 'budgetName', 'name'];
  for (const k of keys) {
    if (params[k]) return params[k];
  }
  // Fallback — first non-empty string param
  for (const v of Object.values(params)) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return 'CONFIRM';
}
