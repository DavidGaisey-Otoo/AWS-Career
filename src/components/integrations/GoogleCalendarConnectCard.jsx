/**
 * GoogleCalendarConnectCard.jsx — Settings UI for IN-01.
 *
 * Two states:
 *   1. Not connected — paste Client ID, click Connect → redirects to Google
 *   2. Connected     — show linked email + Test + Disconnect buttons
 *
 * Includes an expandable "How to get a Client ID" reference so future-you
 * (or a teammate) doesn't have to leave the app to set it up.
 */

import { useEffect, useState } from 'react';
import {
  Calendar, CheckCircle2, AlertCircle, ExternalLink, Loader2, Link2,
  Plug, PlugZap, Copy, ChevronDown, ChevronUp, Info, RefreshCw, Eye, EyeOff,
} from 'lucide-react';
import {
  getClientId, setClientId, clearClientId,
  getClientSecret, setClientSecret, clearClientSecret,
  readTokens, isConnected, disconnect, startOAuth, verifyConnection,
  getGoogleRedirectUri,
} from '../../lib/googleCalendar.js';
import { cn } from '../../lib/utils.js';

export function GoogleCalendarConnectCard() {
  const [clientIdInput, setClientIdInput] = useState(() => getClientId());
  const [clientSecretInput, setClientSecretInput] = useState(() => getClientSecret());
  const [showSecret, setShowSecret] = useState(false);
  const [connected, setConnected] = useState(() => isConnected());
  const [tokens, setTokens] = useState(() => readTokens());
  const [showSetup, setShowSetup] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [verifyOk, setVerifyOk] = useState(null); // null | true | false
  const [copied, setCopied] = useState(false);

  // Re-read state when the page navigates back from the callback page
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('connected') === 'google') {
      setConnected(isConnected());
      setTokens(readTokens());
    }
  }, []);

  const redirectUri = getGoogleRedirectUri();

  async function handleConnect() {
    setError('');
    if (!clientIdInput.trim()) {
      setError('Paste your Google OAuth Client ID first.');
      return;
    }
    if (!clientSecretInput.trim()) {
      setError('Paste your Google OAuth Client Secret too — Google\'s "Web application" client type requires it even with PKCE.');
      return;
    }
    setClientId(clientIdInput.trim());
    setClientSecret(clientSecretInput.trim());
    setWorking(true);
    try {
      await startOAuth({ clientId: clientIdInput.trim(), redirectUri });
      // startOAuth navigates — we won't reach here unless something blocked the redirect
    } catch (err) {
      setError(err.message || String(err));
      setWorking(false);
    }
  }

  async function handleDisconnect() {
    setWorking(true);
    setError('');
    try {
      await disconnect();
      setConnected(false);
      setTokens(null);
      setVerifyOk(null);
      // Clear stored secret too so a fresh connection re-prompts
      clearClientSecret();
      setClientSecretInput('');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setWorking(false);
    }
  }

  async function handleTest() {
    setWorking(true);
    setError('');
    setVerifyOk(null);
    try {
      await verifyConnection();
      setVerifyOk(true);
    } catch (err) {
      setVerifyOk(false);
      setError(err.message || String(err));
    } finally {
      setWorking(false);
    }
  }

  function copyRedirect() {
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="surface rounded-2xl p-5 gradient-border">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-aws-orange/10 p-2.5">
            <Calendar size={20} className="text-aws-orange" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              IN-01 · Google Calendar
            </div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              Google Calendar
              {connected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-extrabold">
                  <CheckCircle2 size={10} /> CONNECTED
                </span>
              )}
            </h3>
            <p className="text-[12px] opacity-80 mt-0.5">
              Book discovery calls in one click from any proposal or outreach email.
            </p>
          </div>
        </div>
      </div>

      {/* ──────── CONNECTED STATE ──────── */}
      {connected && tokens && (
        <div className="space-y-3">
          <div className="rounded-xl bg-success/5 border border-success/30 p-3 flex items-start gap-2">
            <Link2 size={14} className="text-success mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-[12.5px]">
              <div className="font-bold">Linked to {tokens.email || 'your Google account'}</div>
              <div className="opacity-70 mt-0.5">
                Access token expires {new Date(tokens.expiresAt).toLocaleString()}
                {tokens.refreshToken ? ' — will auto-refresh.' : ' — no refresh token saved, you may need to reconnect when it expires.'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleTest}
              disabled={working}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition disabled:opacity-50"
            >
              {working
                ? <><Loader2 size={12} className="animate-spin" /> Testing…</>
                : verifyOk === true
                  ? <><CheckCircle2 size={12} className="text-success" /> Test passed</>
                  : verifyOk === false
                    ? <><AlertCircle size={12} className="text-danger" /> Test failed</>
                    : <><RefreshCw size={12} /> Test connection</>
              }
            </button>
            <button
              onClick={handleDisconnect}
              disabled={working}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-danger/30 text-danger hover:bg-danger/10 transition disabled:opacity-50"
            >
              <Plug size={12} /> Disconnect
            </button>
          </div>
          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
        </div>
      )}

      {/* ──────── NOT CONNECTED STATE ──────── */}
      {!connected && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5 block">
              OAuth Client ID
            </span>
            <input
              type="text"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              placeholder="123456789-abc...xyz.apps.googleusercontent.com"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12.5px] font-mono outline-none focus:border-aws-orange"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5 block">
              OAuth Client Secret
            </span>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecretInput}
                onChange={(e) => setClientSecretInput(e.target.value)}
                placeholder="GOCSPX-..."
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 pr-9 text-[12.5px] font-mono outline-none focus:border-aws-orange"
              />
              <button
                type="button"
                onClick={() => setShowSecret((s) => !s)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-[var(--card-2)] opacity-60 hover:opacity-100 transition"
                title={showSecret ? 'Hide secret' : 'Show secret'}
              >
                {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <span className="text-[10.5px] opacity-65 mt-1 block leading-relaxed">
              Google's "Web application" OAuth clients require this even with PKCE.
              Per <a href="https://developers.google.com/identity/protocols/oauth2/native-app" target="_blank" rel="noopener noreferrer" className="text-aws-orange hover:underline">Google's docs</a>,
              when used from a browser, "the client secret is not treated as a secret" —
              it's effectively a second client identifier. PKCE provides the real protection.
            </span>
          </label>

          {/* Authorised redirect URI helper — they need this in Google Console */}
          <div className="rounded-xl bg-aws-orange/5 border border-aws-orange/20 p-3">
            <div className="flex items-start gap-2">
              <Info size={13} className="text-aws-orange mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-[12px]">
                <div className="font-bold mb-1">Your <em>Authorized redirect URI</em> for the Google Console:</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="bg-[var(--card-2)] px-2 py-1 rounded text-[11px] font-mono border border-token break-all flex-1 min-w-0">
                    {redirectUri}
                  </code>
                  <button
                    onClick={copyRedirect}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
                  >
                    {copied ? <><CheckCircle2 size={10} className="text-success" /> Copied</> : <><Copy size={10} /> Copy</>}
                  </button>
                </div>
                <p className="opacity-70 mt-1.5">
                  Paste this into the <strong>Authorized redirect URIs</strong> field on your OAuth Client in Google Cloud Console.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger flex items-start gap-2">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={working || !clientIdInput.trim() || !clientSecretInput.trim()}
            className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {working
              ? <><Loader2 size={14} className="animate-spin" /> Redirecting to Google…</>
              : <><PlugZap size={14} /> Connect Google Calendar</>
            }
          </button>

          {/* Where do I get this? — collapsible reference */}
          <button
            onClick={() => setShowSetup((s) => !s)}
            className="text-[11.5px] font-bold opacity-70 hover:opacity-100 inline-flex items-center gap-1"
          >
            {showSetup ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Where do I get a Client ID?
          </button>
          {showSetup && <SetupReference redirectUri={redirectUri} />}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Inline how-to reference (not a full wizard — user has already done it
// per the conversation, but it's here for future re-setup).
// ════════════════════════════════════════════════════════════════════
function SetupReference({ redirectUri }) {
  return (
    <div className="rounded-xl bg-[var(--card-2)] border border-token p-3 space-y-2 text-[12px]">
      <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
        <li>
          Open{' '}
          <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
             className="text-aws-orange hover:underline inline-flex items-center gap-0.5">
            Google Cloud Console <ExternalLink size={9} />
          </a>{' '}
          and create (or pick) a project.
        </li>
        <li>
          Enable the{' '}
          <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
             target="_blank" rel="noopener noreferrer"
             className="text-aws-orange hover:underline inline-flex items-center gap-0.5">
            Google Calendar API <ExternalLink size={9} />
          </a>.
        </li>
        <li>
          Configure the OAuth consent screen → user type <strong>External</strong> → add your email as a test user.
        </li>
        <li>
          Go to <strong>Credentials → Create credentials → OAuth client ID</strong>. Application type:
          <strong> Web application</strong>.
        </li>
        <li>
          Add this Authorized redirect URI exactly:
          <code className="block bg-ink-900/30 px-2 py-1 rounded mt-1 text-[11px] font-mono break-all">{redirectUri}</code>
        </li>
        <li>
          Copy <strong>both</strong> the Client ID <strong>and</strong> Client Secret (Google shows both
          when you create the OAuth client). Paste them into the two inputs above.
        </li>
      </ol>
    </div>
  );
}
