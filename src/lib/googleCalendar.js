/**
 * googleCalendar.js — IN-01 Google Calendar OAuth + API client.
 *
 * Architecture:
 *   - OAuth flow uses PKCE (Proof Key for Code Exchange) so no client
 *     secret is needed — safe to run entirely in the browser.
 *   - Tokens stored in plain localStorage (same pattern as github PAT)
 *     under awscl-pro::v1::google. OAuth tokens have built-in expiry
 *     so vault-encryption-with-password would block silent refresh.
 *   - Access token refreshed automatically when within 60s of expiry.
 *
 * Security model:
 *   - Client ID is public (it's literally called "client id" — it
 *     identifies your app to Google, not authenticates you).
 *   - Refresh token IS sensitive. We store it in localStorage which
 *     same-origin scripts can read. Acceptable tradeoff for a personal
 *     productivity app; same risk profile as a stored github PAT.
 *   - User can disconnect any time → wipes both tokens locally + we
 *     attempt revoke at Google's revoke endpoint.
 *
 * Scope:
 *   https://www.googleapis.com/auth/calendar.events
 *   Lets us create/edit/delete events. Cannot read your other events,
 *   cannot read your email, cannot read your contacts.
 */

import { STORAGE_KEY } from './constants.js';

const TOKEN_KEY  = `${STORAGE_KEY}::google`;
const CLIENT_ID_KEY = `${STORAGE_KEY}::google::clientId`;
const PKCE_KEY   = `${STORAGE_KEY}::google::pkce`;

export const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
export const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const API_BASE  = 'https://www.googleapis.com/calendar/v3';

// ════════════════════════════════════════════════════════════════════
// Client ID storage (the OAuth Client ID the user creates in Google
// Cloud Console). Public by design — paste in Settings, lives here.
// ════════════════════════════════════════════════════════════════════
export function getClientId() {
  try { return localStorage.getItem(CLIENT_ID_KEY) || ''; } catch { return ''; }
}
export function setClientId(id) {
  try { localStorage.setItem(CLIENT_ID_KEY, (id || '').trim()); } catch {}
}
export function clearClientId() {
  try { localStorage.removeItem(CLIENT_ID_KEY); } catch {}
}

// ════════════════════════════════════════════════════════════════════
// Token storage
// ════════════════════════════════════════════════════════════════════
/**
 * Token blob shape:
 *   {
 *     accessToken: string,
 *     refreshToken: string | null,    // null when user grants without prompt=consent
 *     expiresAt: ISO string,           // when accessToken dies
 *     scope: string,
 *     email: string | null,            // detected from id_token if present
 *   }
 */
export function readTokens() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || !t.accessToken) return null;
    return t;
  } catch { return null; }
}
function writeTokens(t) {
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch {}
}
export function clearTokens() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function isConnected() {
  const t = readTokens();
  return !!(t && t.accessToken);
}

// ════════════════════════════════════════════════════════════════════
// PKCE helpers
// ════════════════════════════════════════════════════════════════════
function randomString(len = 64) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  return crypto.subtle.digest('SHA-256', buf);
}

async function makePkcePair() {
  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  return { verifier, challenge };
}

function savePkceState({ verifier, state }) {
  try { sessionStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state })); } catch {}
}
function loadPkceState() {
  try {
    const raw = sessionStorage.getItem(PKCE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function clearPkceState() {
  try { sessionStorage.removeItem(PKCE_KEY); } catch {}
}

// ════════════════════════════════════════════════════════════════════
// OAuth flow — step 1: redirect to Google with PKCE challenge
// ════════════════════════════════════════════════════════════════════
export async function startOAuth({ clientId, redirectUri }) {
  if (!clientId) throw new Error('Missing Google OAuth Client ID. Add it in Settings → Integrations.');
  if (!redirectUri) redirectUri = `${window.location.origin}/integrations/google/callback`;

  const { verifier, challenge } = await makePkcePair();
  const state = randomString(16);
  savePkceState({ verifier, state });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',          // gets us a refresh token
    prompt: 'consent',               // forces refresh token even for repeat connects
    state,
    include_granted_scopes: 'true',
  });

  window.location.assign(`${AUTH_URL}?${params.toString()}`);
}

// ════════════════════════════════════════════════════════════════════
// OAuth flow — step 2: exchange code for tokens (called from callback page)
// ════════════════════════════════════════════════════════════════════
export async function exchangeCodeForTokens({ code, state, clientId, redirectUri }) {
  const pkce = loadPkceState();
  if (!pkce) throw new Error('PKCE state lost — please retry the connection.');
  if (state !== pkce.state) throw new Error('OAuth state mismatch — possible CSRF.');
  if (!clientId) clientId = getClientId();
  if (!redirectUri) redirectUri = `${window.location.origin}/integrations/google/callback`;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    code_verifier: pkce.verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    clearPkceState();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  clearPkceState();

  const tokens = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || null,
    expiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
    scope: json.scope || SCOPES,
    email: parseEmailFromIdToken(json.id_token),
    savedAt: new Date().toISOString(),
  };
  writeTokens(tokens);
  return tokens;
}

// Best-effort decode of the optional id_token to grab the email
function parseEmailFromIdToken(idToken) {
  if (!idToken) return null;
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return json.email || null;
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════════════
// Token refresh — auto-called by getValidAccessToken()
// ════════════════════════════════════════════════════════════════════
async function refreshAccessToken() {
  const t = readTokens();
  if (!t?.refreshToken) throw new Error('No refresh token — please reconnect Google Calendar.');
  const clientId = getClientId();
  if (!clientId) throw new Error('Client ID missing — please reconnect.');

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: t.refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const next = {
    ...t,
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + (json.expires_in || 3600) * 1000).toISOString(),
    scope: json.scope || t.scope,
  };
  writeTokens(next);
  return next.accessToken;
}

export async function getValidAccessToken() {
  const t = readTokens();
  if (!t) throw new Error('Not connected to Google Calendar.');
  const now = Date.now();
  const exp = new Date(t.expiresAt).getTime();
  if (exp - now > 60_000) return t.accessToken;
  return refreshAccessToken();
}

// ════════════════════════════════════════════════════════════════════
// Disconnect — revoke at Google + clear local
// ════════════════════════════════════════════════════════════════════
export async function disconnect() {
  const t = readTokens();
  if (t?.accessToken) {
    try {
      await fetch(`${REVOKE_URL}?token=${encodeURIComponent(t.accessToken)}`, { method: 'POST' });
    } catch { /* best effort */ }
  }
  clearTokens();
}

// ════════════════════════════════════════════════════════════════════
// Calendar API — create event
// ════════════════════════════════════════════════════════════════════

/**
 * Create a calendar event on the user's primary calendar.
 *
 * @param {Object}   opts
 * @param {string}   opts.summary           — event title
 * @param {string}  [opts.description]      — body
 * @param {Date|string} opts.start          — ISO or Date for start
 * @param {Date|string} opts.end            — ISO or Date for end
 * @param {string}  [opts.attendeeEmail]    — single guest to invite
 * @param {boolean} [opts.addMeetLink=true] — auto-add a Google Meet conference link
 * @param {string}  [opts.timeZone]         — default: browser TZ
 * @returns {Promise<{ id, htmlLink, hangoutLink, meetLink }>}
 */
export async function createEvent({
  summary,
  description = '',
  start,
  end,
  attendeeEmail,
  addMeetLink = true,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}) {
  const accessToken = await getValidAccessToken();

  const event = {
    summary,
    description,
    start: { dateTime: new Date(start).toISOString(), timeZone },
    end:   { dateTime: new Date(end).toISOString(),   timeZone },
    reminders: { useDefault: true },
  };
  if (attendeeEmail?.trim()) {
    event.attendees = [{ email: attendeeEmail.trim() }];
  }
  if (addMeetLink) {
    event.conferenceData = {
      createRequest: {
        requestId: 'meet-' + Math.random().toString(36).slice(2),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    };
  }

  const url = `${API_BASE}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create event (${res.status}): ${text}`);
  }
  const json = await res.json();
  const meetLink = json.hangoutLink
                 || json.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri
                 || null;
  return {
    id: json.id,
    htmlLink: json.htmlLink,
    hangoutLink: json.hangoutLink,
    meetLink,
    raw: json,
  };
}

// Quick sanity ping — fetches the primary calendar metadata. Used by the
// Settings card "Test connection" button.
export async function verifyConnection() {
  const accessToken = await getValidAccessToken();
  const res = await fetch(`${API_BASE}/calendars/primary`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Verify failed (${res.status})`);
  return res.json();
}
