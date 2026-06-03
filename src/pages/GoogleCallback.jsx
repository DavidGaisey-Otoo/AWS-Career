/**
 * GoogleCallback.jsx — landing page for the Google OAuth redirect.
 *
 * Google bounces back to /integrations/google/callback?code=…&state=…
 * after the user grants permission. This page reads the params,
 * exchanges the code for tokens, then sends them to the integrations
 * settings page.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { exchangeCodeForTokens, getClientId } from '../lib/googleCalendar.js';

export default function GoogleCallback() {
  const nav = useNavigate();
  const [status, setStatus] = useState('working'); // 'working' | 'ok' | 'error'
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errParam = url.searchParams.get('error');

    if (errParam) {
      setStatus('error');
      setError(`Google returned an error: ${errParam}. ${url.searchParams.get('error_description') || ''}`);
      return;
    }
    if (!code || !state) {
      setStatus('error');
      setError('Missing code or state in the callback URL.');
      return;
    }

    const clientId = getClientId();
    if (!clientId) {
      setStatus('error');
      setError('No Client ID stored. Add it in Settings → Integrations first.');
      return;
    }

    (async () => {
      try {
        const tokens = await exchangeCodeForTokens({ code, state, clientId });
        setEmail(tokens.email || '');
        setStatus('ok');
        // Auto-bounce back to settings after 1.5s
        setTimeout(() => nav('/settings?section=integrations&connected=google'), 1500);
      } catch (err) {
        console.error('[GoogleCallback]', err);
        setStatus('error');
        setError(err.message || String(err));
      }
    })();
  }, [nav]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="surface rounded-2xl p-8 max-w-md w-full text-center">
        {status === 'working' && (
          <>
            <Loader2 size={32} className="mx-auto mb-3 animate-spin text-aws-orange" />
            <h2 className="text-lg font-extrabold">Connecting Google Calendar…</h2>
            <p className="text-sm opacity-70 mt-1">Exchanging your authorization code for tokens.</p>
          </>
        )}
        {status === 'ok' && (
          <>
            <CheckCircle2 size={32} className="mx-auto mb-3 text-success" />
            <h2 className="text-lg font-extrabold">Connected!</h2>
            <p className="text-sm opacity-80 mt-1">
              {email ? <>Linked to <strong>{email}</strong>.</> : 'Your Google Calendar is linked.'}
            </p>
            <p className="text-[12px] opacity-60 mt-3">Redirecting back to Settings…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={32} className="mx-auto mb-3 text-danger" />
            <h2 className="text-lg font-extrabold">Couldn't complete the connection</h2>
            <p className="text-[13px] opacity-80 mt-2 leading-relaxed text-left bg-[var(--card-2)] rounded-lg p-3 border border-token break-words">
              {error}
            </p>
            <Link
              to="/settings?section=integrations"
              className="btn btn-primary inline-flex items-center gap-1.5 mt-4"
            >
              Back to Settings <ArrowRight size={12} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
