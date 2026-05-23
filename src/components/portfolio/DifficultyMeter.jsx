import { Flame } from 'lucide-react';
import { DIFFICULTY } from '../../data/projects.js';
import { cn } from '../../lib/utils.js';

export function DifficultyMeter({ level, showLabel = true, size = 'sm' }) {
  const meta = DIFFICULTY[level] || DIFFICULTY.intermediate;
  const sizeMap = {
    sm: { dot: 'w-1.5 h-1.5', text: 'text-[11px]', icon: 12 },
    md: { dot: 'w-2 h-2',     text: 'text-xs',    icon: 14 },
    lg: { dot: 'w-2.5 h-2.5', text: 'text-sm',    icon: 16 },
  }[size];

  return (
    <span className={cn('inline-flex items-center gap-2', sizeMap.text)}>
      <span className="inline-flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={cn(
              'rounded-full transition-all',
              sizeMap.dot,
              n <= meta.level ? 'bg-gradient-aws shadow-glow-orange' : 'bg-[var(--card-2)]'
            )}
          />
        ))}
      </span>
      {showLabel && (
        <span className={cn('inline-flex items-center gap-1 font-bold border rounded-md px-1.5 py-0.5', meta.color)}>
          <Flame size={sizeMap.icon} /> {meta.label}
        </span>
      )}
    </span>
  );
}
