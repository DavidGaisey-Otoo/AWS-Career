import { Clock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils.js';

/**
 * Countdown timer with color-coded warning thresholds.
 *  - Default text colour
 *  - Yellow at <= 20 minutes
 *  - Red + pulse at <= 10 minutes
 * Calls onExpire() exactly once when the clock hits zero.
 */
export function ExamTimer({ startedAt, totalSeconds, onExpire, paused }) {
  const [now, setNow] = useState(() => Date.now());
  const calledExpire = useRef(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const elapsed = paused ? 0 : Math.floor((now - startedAt) / 1000);
  const left = Math.max(0, totalSeconds - elapsed);

  useEffect(() => {
    if (left === 0 && !calledExpire.current) {
      calledExpire.current = true;
      onExpire?.();
    }
  }, [left, onExpire]);

  const hh = Math.floor(left / 3600);
  const mm = Math.floor((left % 3600) / 60);
  const ss = left % 60;
  const pad = (n) => String(n).padStart(2, '0');
  const txt = hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

  const warn = left <= 20 * 60;
  const danger = left <= 10 * 60;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-bold tabular-nums text-sm transition-colors',
        danger ? 'border-danger/50 bg-danger/15 text-danger animate-pulse-glow' :
        warn   ? 'border-warning/50 bg-warning/15 text-warning' :
                 'border-token bg-[var(--card-2)] text-current',
      )}
      role="timer"
      aria-live="polite"
    >
      <Clock size={14} />
      <span>{txt}</span>
    </div>
  );
}

export function timeStringToSeconds(min) {
  return Math.max(0, Math.floor(min)) * 60;
}
