/**
 * TokenExpiryBanner.jsx — sticky top banner that warns the user when
 * their GitHub PAT is approaching expiry.
 *
 * Mount once at the top of AppShell. It self-hides when there's nothing
 * to warn about, when the user snoozes it, or when no token is saved.
 *
 * Severity → behaviour:
 *   fresh   → hidden
 *   aging   → muted info banner (8-30 days)
 *   urgent  → amber warning (1-7 days)
 *   critical→ orange (today)
 *   expired → red, persistent (cannot snooze)
 *   unknown → muted prompt to record an expiry date
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, ExternalLink, X, RefreshCw, Github } from 'lucide-react';
import {
  readToken, expirySeverity, expiryLabel, isSnoozed, snoozeWarning,
  GITHUB_TOKEN_PAGE,
} from '../../lib/githubToken.js';

const TONES = {
  unknown:  { bg: 'bg-electric/10 border-electric/40 text-electric',   canSnooze: true,  Icon: Clock },
  fresh:    null,                                                                                       // never shown
  aging:    { bg: 'bg-electric/10 border-electric/40 text-electric',   canSnooze: true,  Icon: Clock },
  urgent:   { bg: 'bg-warning/15 border-warning/50 text-warning',      canSnooze: true,  Icon: AlertTriangle },
  critical: { bg: 'bg-aws-orange/15 border-aws-orange/60 text-aws-orange', canSnooze: false, Icon: AlertTriangle },
  expired:  { bg: 'bg-danger/15 border-danger/60 text-danger',         canSnooze: false, Icon: AlertTriangle },
};

export function TokenExpiryBanner() {
  // Re-evaluate on mount + every minute (in case the user updates while the page is open).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const t = useMemo(readToken, [tick]);
  const severity = useMemo(() => (t?.token ? expirySeverity(t.expiresAt) : 'fresh'), [t, tick]);
  const tone = TONES[severity];

  // No token at all? Then there's nothing to warn about.
  if (!t?.token) return null;
  // Token is fresh OR severity has no tone defined → hidden.
  if (!tone) return null;
  // Snoozed and severity allows snoozing? Hide.
  if (tone.canSnooze && isSnoozed()) return null;

  const { Icon } = tone;
  const label = expiryLabel(t.expiresAt);
  const isUnknown = severity === 'unknown';
  const isExpired = severity === 'expired';

  function dismiss() {
    snoozeWarning(24);
    setTick((x) => x + 1); // force re-render
  }

  return (
    <AnimatePresence>
      <motion.div
        key="token-banner"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`sticky top-0 z-30 border-b backdrop-blur-md ${tone.bg}`}
      >
        <div className="max-w-screen-2xl mx-auto px-4 py-2 text-xs font-bold flex items-center gap-3">
          <Icon size={14} className="shrink-0" />
          <Github size={12} className="shrink-0" />
          <span className="flex-1 min-w-0">
            {isUnknown && (
              <>GitHub token saved, but no expiry date recorded. Set it in Settings so we can warn you before it dies.</>
            )}
            {!isUnknown && !isExpired && (
              <>GitHub token {label.toLowerCase()} — regenerate before then to avoid broken pushes.</>
            )}
            {isExpired && (
              <>GitHub token {label.toLowerCase()}. Pushes will fail until you renew.</>
            )}
          </span>
          <Link
            to="/renew-github"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-current/15 hover:bg-current/25 text-current font-extrabold"
          >
            <RefreshCw size={10} /> Renew step-by-step
          </Link>
          <a
            href={GITHUB_TOKEN_PAGE}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-current/15 hover:bg-current/25 text-current"
          >
            <ExternalLink size={10} /> GitHub
          </a>
          {tone.canSnooze && (
            <button
              onClick={dismiss}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-current/15"
              title="Hide for 24 hours"
              aria-label="Snooze warning"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
