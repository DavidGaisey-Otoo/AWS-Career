/**
 * ShareButton.jsx — universal share with native sheet + fallback.
 *
 * On mobile (and modern desktop Safari/Edge with PWA installed): uses
 * navigator.share() → opens the OS share sheet (WhatsApp, email, AirDrop,
 * etc.). On desktop without share support: copies to clipboard with a
 * "Copied" toast.
 *
 * Zero config required. Web Share API is built into every modern browser.
 */

import { useState } from 'react';
import { Share2, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

/**
 * @param {Object} props
 * @param {string} props.title    — share sheet title
 * @param {string} props.text     — body text (truncated by some apps)
 * @param {string} [props.url]    — link to share
 * @param {string} [props.label='Share']
 * @param {'primary'|'outline'|'ghost'} [props.variant='outline']
 */
export function ShareButton({
  title,
  text,
  url,
  label = 'Share',
  variant = 'outline',
  className = '',
}) {
  const toast = useToast();
  const [done, setDone] = useState(false);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function handleClick() {
    const payload = { title, text };
    if (url) payload.url = url;

    if (canNativeShare) {
      try {
        await navigator.share(payload);
        // User completed share — no toast needed, the OS already gave them feedback
      } catch (err) {
        // User cancelled — silently ignore. AbortError is normal.
        if (err?.name !== 'AbortError') {
          console.warn('[ShareButton]', err);
          fallbackCopy();
        }
      }
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    const clipText = url ? `${title}\n\n${text}\n\n${url}` : `${title}\n\n${text}`;
    navigator.clipboard.writeText(clipText)
      .then(() => {
        setDone(true);
        toast?.success?.('Copied — paste into any app');
        setTimeout(() => setDone(false), 2000);
      })
      .catch(() => toast?.error?.('Clipboard blocked — copy manually'));
  }

  const btnClass = variant === 'primary'
    ? 'bg-gradient-aws text-ink-950 hover:brightness-110'
    : variant === 'outline'
    ? 'border border-aws-orange/40 text-aws-orange hover:bg-aws-orange/10'
    : 'border border-token hover:border-aws-orange hover:text-aws-orange';

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition',
        btnClass,
        className
      )}
      title={canNativeShare ? 'Open share sheet' : 'Copy to clipboard'}
    >
      {done
        ? <><CheckCircle2 size={13} /> Copied</>
        : canNativeShare
          ? <><Share2 size={13} /> {label}</>
          : <><Copy size={13} /> {label}</>
      }
    </button>
  );
}
