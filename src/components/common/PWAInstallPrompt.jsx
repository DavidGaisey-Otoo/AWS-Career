/**
 * PWAInstallPrompt.jsx — captures the browser's beforeinstallprompt
 * event and surfaces a friendly "Install app" chip in the corner.
 *
 * Browser support: Chrome, Edge, Brave, Samsung Internet (desktop +
 * Android). iOS Safari uses a different model — it doesn't fire
 * beforeinstallprompt, so we detect iOS and show a hint instead.
 *
 * Dismissed state remembered in localStorage so we don't nag the user.
 */

import { useEffect, useState } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const DISMISSED_KEY = 'awscl-pro::v1::pwa-install-dismissed';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === 'true'; } catch { return false; }
  });
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches
  );
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // iOS detection — UA-based, the only reliable signal for iPhone/iPad
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    setIsIOS(ios);

    function onBeforeInstall(e) {
      // Browser is ready to install — capture the event so we can
      // trigger it later from our own button
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }

  function handleDismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  }

  if (isInstalled || dismissed) return null;

  // iOS — no native prompt, so offer a hint
  if (isIOS && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs surface rounded-2xl shadow-2xl border border-aws-orange/40 p-4">
        <div className="flex items-start gap-2.5">
          <Smartphone size={18} className="text-aws-orange flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[12.5px] font-extrabold mb-1">Install on iPhone</div>
            <p className="text-[11.5px] opacity-90 leading-snug">
              Tap <Share size={11} className="inline -mt-0.5 mx-0.5" /> Share → <strong>Add to Home Screen</strong>.
              Opens fullscreen, works offline.
            </p>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => setShowIOSHint(false)} className="text-[11px] font-bold text-aws-orange">Got it</button>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 rounded hover:bg-[var(--card-2)] opacity-60">
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Chrome/Edge/etc — native install available
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-xs surface rounded-2xl shadow-2xl border border-aws-orange/40 p-3.5">
        <div className="flex items-start gap-2.5">
          <Download size={16} className="text-aws-orange flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[12.5px] font-extrabold mb-0.5">Install AWS Launchpad</div>
            <p className="text-[11px] opacity-85 leading-snug mb-2">
              Opens fullscreen. Works offline. One tap from your home screen.
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={handleInstall}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-gradient-aws text-ink-950 hover:brightness-110 transition"
              >
                <Download size={11} /> Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold opacity-65 hover:opacity-100"
              >
                Not now
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 rounded hover:bg-[var(--card-2)] opacity-50">
            <X size={11} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
