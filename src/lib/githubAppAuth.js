import { STORAGE_KEY } from './constants.js';

const KEY = `${STORAGE_KEY}::github-app`;
const API_BASE = (import.meta.env.VITE_GITHUB_AUTH_API || '').replace(/\/$/, '');
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
