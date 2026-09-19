/**
 * EmptyState — the canonical "nothing here yet" panel.
 *
 * This exists because five pages had grown five different EmptyStates in
 * two visual dialects: three used a gradient icon tile with `text-muted`
 * body copy, two used a faded flat icon with `opacity-70`. The opacity
 * dialect also printed as washed-out grey, because the print stylesheet
 * pins `.text-muted` to a readable colour but has no rule for opacity-*.
 *
 * `tone` keeps the one distinction that was actually meaningful:
 *   brand — this is the main thing on screen, invite the user to act
 *   quiet — a secondary panel that should not shout
 *
 * Anything richer (suggestion grids, chip rows, buttons) goes in
 * `children`, so a page can stay distinctive without forking the shell.
 */
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.js';

export function EmptyState({
  icon: Icon,
  title,
  description,
  tone = 'brand',
  className = '',
  children,
}) {
  const brand = tone === 'brand';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('surface rounded-2xl p-8 text-center', className)}
    >
      {Icon && (
        brand ? (
          <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
            <Icon size={22} strokeWidth={2.5} />
          </div>
        ) : (
          // Decorative only — opacity is correct here, it is not text.
          <Icon size={32} className="mx-auto text-muted opacity-40" />
        )
      )}

      {title && (
        <h3 className={cn('font-extrabold', brand ? 'text-base mt-3' : 'text-lg mt-3')}>
          {title}
        </h3>
      )}

      {description && (
        <p className="text-[12px] text-muted max-w-md mx-auto leading-relaxed mt-2">
          {description}
        </p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </motion.div>
  );
}
