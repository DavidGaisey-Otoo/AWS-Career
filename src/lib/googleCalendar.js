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
const CLIENT_SECRET_KEY = `${STORAGE_KEY}::google::clientSecret`;
const PKCE_KEY   = `${STORAGE_KEY}::google::pkce`;
// Safe, non-token metadata intentionally lives outside the ::google prefix so
// cross-device sync can show that Calendar was configured elsewhere. OAuth
// tokens, PKCE verifier and client secret remain blocklisted and per-device.
const SYNC_STATUS_KEY = `${STORAGE_KEY}::integrations::googleCalendar`;

export const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
export const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

export function getGoogleRedirectUri() {
  const base = import.meta.env?.BASE_URL || '/';
  return new URL(`${base}integrations/google/callback`, window.location.origin).href;
}
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

export function readCalendarSyncStatus() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SYNC_STATUS_KEY) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch { return null; }
}

function writeCalendarSyncStatus(patch) {
  try {
    const current = readCalendarSyncStatus() || {};
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event('syncpush'));
    return next;
  } catch { return null; }
}

export function publishCalendarConnectionStatus() {
  if (!isConnected()) return null;
  return writeCalendarSyncStatus({
    configured: true,
    clientId: getClientId(),
    connectedAt: readTokens()?.savedAt || new Date().toISOString(),
  });
}

// Google quirk: their "Web application" OAuth clients require a
// client_secret in the token exchange request even with PKCE. Per
// Google's own docs, when used from a browser, this value "is not
// treated as a secret" — it's a client identifier. PKCE still provides
// the real protection against authorization code interception.
export function getClientSecret() {
  try { return localStorage.getItem(CLIENT_SECRET_KEY) || ''; } catch { return ''; }
}
export function setClientSecret(s) {
  try { localStorage.setItem(CLIENT_SECRET_KEY, (s || '').trim()); } catch {}
}
export function clearClientSecret() {
  try { localStorage.removeItem(CLIENT_SECRET_KEY); } catch {}
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

// PKCE state stored in localStorage (not sessionStorage) so it survives:
//   - Google opening the consent screen in a new tab/window
//   - Browser restarts mid-flow
//   - Multi-window OAuth (common when user has multiple Google profiles)
// The verifier is single-use (cleared immediately after token exchange) and
// stale entries are pruned by the 10-minute TTL check.
const PKCE_TTL_MS = 10 * 60 * 1000; // Google auth codes expire in ~10 min

function savePkceState({ verifier, state }) {
  try {
    localStorage.setItem(PKCE_KEY, JSON.stringify({
      verifier, state, ts: Date.now(),
    }));
  } catch {}
}
function loadPkceState() {
  try {
    const raw = localStorage.getItem(PKCE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.verifier || !parsed.state) return null;
    if (parsed.ts && Date.now() - parsed.ts > PKCE_TTL_MS) {
      clearPkceState();
      return null;
    }
    return parsed;
  } catch { return null; }
}
function clearPkceState() {
  try { localStorage.removeItem(PKCE_KEY); } catch {}
}

// ════════════════════════════════════════════════════════════════════
// OAuth flow — step 1: redirect to Google with PKCE challenge
// ════════════════════════════════════════════════════════════════════
export async function startOAuth({ clientId, redirectUri }) {
  if (!clientId) throw new Error('Missing Google OAuth Client ID. Add it in Settings → Integrations.');
  if (!redirectUri) redirectUri = getGoogleRedirectUri();

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
  if (!pkce) {
    throw new Error(
      'PKCE state missing or expired (10-min TTL). ' +
      'This usually means the OAuth flow opened in a different tab/window, ' +
      'or the browser was closed mid-flow. Go back to Settings → Integrations and click Connect again.'
    );
  }
  if (state !== pkce.state) throw new Error('OAuth state mismatch — please retry the connection.');
  if (!clientId) clientId = getClientId();
  if (!redirectUri) redirectUri = getGoogleRedirectUri();
  const clientSecret = getClientSecret();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    code_verifier: pkce.verifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  // Google "Web application" clients require this field even with PKCE
  if (clientSecret) body.set('client_secret', clientSecret);

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
  writeCalendarSyncStatus({
    configured: true,
    clientId,
    connectedAt: new Date().toISOString(),
  });
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

  const clientSecret = getClientSecret();
  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: t.refreshToken,
    grant_type: 'refresh_token',
  });
  if (clientSecret) body.set('client_secret', clientSecret);
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
  writeCalendarSyncStatus({ configured: false, disconnectedAt: new Date().toISOString() });
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

// Quick sanity ping using the same least-privilege calendar.events scope that
// createEvent() requests. The calendars.get endpoint requires an additional
// calendar metadata scope and otherwise returns 403 for a valid connection.
export async function verifyConnection() {
  const accessToken = await getValidAccessToken();
  const params = new URLSearchParams({
    maxResults: '1',
    singleEvents: 'true',
    timeMin: new Date().toISOString(),
  });
  const res = await fetch(`${API_BASE}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ? `: ${body.error.message}` : '';
    } catch { /* response body is optional diagnostic context */ }
    throw new Error(`Verify failed (${res.status})${detail}`);
  }
  const json = await res.json();
  return {
    ok: true,
    calendarId: json.summary || 'primary',
    checkedAt: new Date().toISOString(),
  };
}
