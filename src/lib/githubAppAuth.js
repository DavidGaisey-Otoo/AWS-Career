import { STORAGE_KEY } from './constants.js';

const KEY = `${STORAGE_KEY}::github-app`;
/**
 * Where the two GitHub OAuth functions live.
 *
 * They are hosted on Vercel because GitHub Pages cannot run serverless
 * functions. Any origin that does not serve `/api` itself must therefore
 * call Vercel directly.
 *
 * localhost is exactly such an origin: the Vite dev server serves the app
 * but has no `/api` routes, so the previous same-origin default turned
 * every local sign-in into a 404 against the dev server. That made GitHub
 * connection — and therefore sync — impossible during local development,
 * while looking like a sync bug rather than a routing one.
 */
const GITHUB_AUTH_API = 'https://aws-career.vercel.app';

function defaultApiBase() {
  if (typeof window === 'undefined') return '';
  const { hostname } = window.location;
  const needsRemoteApi =
    hostname.endsWith('github.io') ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1';
  return needsRemoteApi ? GITHUB_AUTH_API : '';
}

const DEFAULT_API_BASE = defaultApiBase();
// `import.meta.env` is injected by Vite in the browser, but is absent when
// the pure modules are imported by the Node test runner.
const API_BASE = (import.meta.env?.VITE_GITHUB_AUTH_API || DEFAULT_API_BASE).replace(/\/$/, '');
const REFRESH_EARLY_MS = 5 * 60 * 1000;

export function readGithubAppSession() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export function clearGithubAppSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event('github-auth-change'));
}

function saveTokenResponse(data) {
  const now = Date.now();
  const current = readGithubAppSession() || {};
  const next = {
    ...current,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || current.refreshToken,
    expiresAt: now + Number(data.expires_in || 28800) * 1000,
    refreshExpiresAt: data.refresh_token_expires_in
      ? now + Number(data.refresh_token_expires_in) * 1000
      : current.refreshExpiresAt,
    tokenType: data.token_type || 'bearer',
    savedAt: new Date(now).toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('github-auth-change'));
  return next;
}

async function post(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || `HTTP ${res.status}`);
  return data;
}

export async function startGithubDeviceFlow() {
  return post('/api/github/device-code', {});
}

export async function pollGithubDeviceFlow(deviceCode) {
  const data = await post('/api/github/token', { device_code: deviceCode });
  if (data.access_token) return { ok: true, session: saveTokenResponse(data) };
  return { ok: false, pending: data.error === 'authorization_pending', ...data };
}

export async function getGithubAccessToken() {
  const session = readGithubAppSession();
  if (!session?.accessToken) return null;
  if (!session.expiresAt || Date.now() < session.expiresAt - REFRESH_EARLY_MS) return session.accessToken;
  if (!session.refreshToken || (session.refreshExpiresAt && Date.now() >= session.refreshExpiresAt)) {
    clearGithubAppSession();
    return null;
  }
  const data = await post('/api/github/token', {
    refresh_token: session.refreshToken,
    grant_type: 'refresh_token',
  });
  if (!data.access_token) throw new Error(data.error_description || 'GitHub session could not be refreshed.');
  return saveTokenResponse(data).accessToken;
}

export function hasGithubAppSession() {
  return Boolean(readGithubAppSession()?.accessToken);
}

/**
 * The connected GitHub account's public identity — login, display name,
 * avatar. Deliberately returns no token material, so the result is safe
 * to store in the synced profile.
 *
 * Used to fill in a real full name instead of leaving each device to be
 * named by hand, which is how one browser ended up calling the same
 * person something different from another.
 */
export async function fetchGithubIdentity() {
  const token = await getGithubAccessToken();
  if (!token) return null;
  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  if (!user) return null;
  return {
    login: user.login || null,
    // `name` is the user's chosen display name and is often their full
    // name; `login` is the handle. Prefer the former, fall back to it.
    name: user.name || user.login || null,
    avatarUrl: user.avatar_url || null,
  };
}
