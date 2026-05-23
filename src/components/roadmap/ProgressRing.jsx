import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

/**
 * SVG progress ring with smooth animated fill and configurable gradient.
 * Usage:
 *   <ProgressRing percent={42} size={56} stroke={6} />
 *   <ProgressRing percent={overall} size={220} stroke={16} mega />
 */
export function ProgressRing({
  percent = 0,
  size = 56,
  stroke = 6,
  accent = 'orange',
  showLabel = true,
  className = '',
  mega = false,
  children,
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  const accentMap = {
    orange: ['#FF9900', '#FFB84D'],
    blue:   ['#00D4FF', '#7C3AED'],
    green:  ['#00C853', '#00D4FF'],
    yellow: ['#FFD600', '#FF9900'],
    rainbow:['#FF9900', '#00D4FF'],
  };
  const [a, b] = accentMap[accent] || accentMap.orange;
  const gradientId = `pr-${accent}-${size}`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={a} />
            <stop offset="100%" stopColor={b} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="var(--border)" strokeWidth={stroke} fill="none"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#${gradientId})`} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: 'spring', stiffness: 80, damping: 22 }}
          style={{ filter: mega ? `drop-shadow(0 0 12px ${a}88)` : undefined }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">
        {children ?? (
          showLabel && (
            <div className={cn('font-extrabold tracking-tight', mega ? 'text-4xl' : 'text-xs')}>
              {Math.round(percent)}%
            </div>
          )
        )}
      </div>
    </div>
  );
}
