import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

/**
 * Satisfying checkbox with a sweep + bounce + tick stroke animation.
 * Click ripple emitted from parent via Button if needed.
 */
export function AnimatedCheckbox({ checked, onChange, size = 22, className = '', ariaLabel }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!checked}
      aria-label={ariaLabel || (checked ? 'Mark incomplete' : 'Mark complete')}
      onClick={(e) => { e.stopPropagation(); onChange?.(e); }}
      className={cn(
        'group relative grid place-items-center focus-ring rounded-md transition-transform active:scale-90',
        className
      )}
      style={{ width: size, height: size }}
    >
      <motion.span
        animate={{
          scale: checked ? 1 : 1,
          background: checked
            ? 'linear-gradient(135deg, #FF9900 0%, #FFB84D 100%)'
            : 'transparent',
          borderColor: checked ? 'transparent' : 'var(--border)',
          boxShadow: checked ? '0 0 14px rgba(255,153,0,0.55)' : '0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 rounded-md border-2"
      />
      <svg
        viewBox="0 0 24 24"
        width={size * 0.62}
        height={size * 0.62}
        className="relative z-10"
        fill="none"
        stroke="#0A0E1A"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 12.5 L10 17.5 L19.5 7.5"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
        />
      </svg>
      {/* satisfying pulse ring on tick */}
      {checked && (
        <motion.span
          initial={{ scale: 0.7, opacity: 0.6 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0 rounded-md border-2 border-aws-orange"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </button>
  );
}
