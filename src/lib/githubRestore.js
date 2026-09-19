/**
 * githubRestore.js — connect GitHub and restore this browser's data.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ════════════════════════════════════════════════════════════════════
 * Every origin the app runs on — the deployed site, the installed app,
 * a local dev server — keeps its own localStorage. Opening a new one
 * therefore starts empty, and onboarding used to answer that by walking
 * the user through creating a fresh profile. For someone who already has
 * an account, that is the wrong answer: it manufactures a second identity
 * instead of retrieving the first.
 *
 * This is the "I already have an account" path. It runs the GitHub device
 * flow, finds the private sync repository (deterministic from the GitHub
 * login, so any browser can find it), restores the snapshot and turns
 * sync on.
 *
 * It lives here rather than in a component because two places need it —
 * the onboarding modal and the Settings integration card — and two copies
 * of an auth-and-restore flow would drift.
 */
import {
  hasGithubAppSession, pollGithubDeviceFlow, startGithubDeviceFlow,
} from './githubAppAuth.js';
import { pullSnapshot, restoreLocalStorage, setSyncEnabled } from './gistSync.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run the whole flow.
 *
 * @param {object}   handlers
 * @param {function} handlers.onCode    Called with { userCode, verificationUri }
 *                                      as soon as GitHub issues them, so the UI
 *                                      can show the code to type.
 * @param {function} handlers.onStatus  Progress strings for the UI.
 * @param {function} handlers.signal    Optional AbortSignal-like { aborted }.
 *
 * @returns {Promise<{ restored: boolean, keyCount?: number }>}
 *   restored:true  — a snapshot was found and applied; caller should reload.
 *   restored:false — connected fine, but this account has nothing stored yet.
 */
export async function connectGithubAndRestore({ onCode, onStatus, signal } = {}) {
  const say = (message) => { try { onStatus?.(message); } catch { /* UI only */ } };

  // Already approved in this browser — skip straight to the restore.
  if (!hasGithubAppSession()) {
    say('Asking GitHub for a device code…');
    const flow = await startGithubDeviceFlow();

    onCode?.({
      userCode: flow.user_code || '',
      verificationUri: flow.verification_uri || 'https://github.com/login/device',
    });

    // GitHub sets the poll interval; polling faster earns a slow_down.
    const interval = Math.max(Number(flow.interval || 5), 5) * 1000;
    const deadline = Date.now() + Number(flow.expires_in || 900) * 1000;

    say('Waiting for you to approve it on GitHub…');
    let approved = false;
    while (Date.now() < deadline) {
      if (signal?.aborted) throw new Error('Cancelled.');
      await sleep(interval);
      const result = await pollGithubDeviceFlow(flow.device_code);
      if (result.ok) { approved = true; break; }
      if (!result.pending && result.error !== 'slow_down') {
        throw new Error(result.error_description || result.error || 'GitHub declined the request.');
      }
    }
    if (!approved) throw new Error('That code expired before it was approved. Please try again.');
  }

  say('Looking for your saved data…');
  const remote = await pullSnapshot();

  if (!remote?.snapshot) {
    // Connected, but nothing stored yet. Turn sync on anyway so THIS
    // browser becomes the first copy rather than another orphan.
    setSyncEnabled(true);
    return { restored: false };
  }

  say('Restoring…');
  restoreLocalStorage(remote.snapshot, { mergeStrategy: 'replace' });
  setSyncEnabled(true);
  return { restored: true, keyCount: remote.snapshot.keyCount ?? null };
}
