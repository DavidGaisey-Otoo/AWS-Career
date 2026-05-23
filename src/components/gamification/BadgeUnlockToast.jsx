import { AnimatePresence, motion } from 'framer-motion';
import { Award, X } from 'lucide-react';
import { useEffect } from 'react';
import { useGamification } from '../../context/GamificationContext.jsx';
import { BADGES, RARITY_META } from '../../data/gamification.js';
import { cn } from '../../lib/utils.js';

/**
 * Small toast that pops in the bottom-right when a badge unlocks.
 * Auto-dismisses after 4 s; multiple unlocks queue and display one at a time.
 */
export function BadgeUnlockToast() {
  const { pendingBadgeQueue, dismissNextBadge } = useGamification();
  const head = pendingBadgeQueue?.[0];
  const badge = head ? BADGES.find((b) => b.id === head.badgeId) : null;

  useEffect(() => {
    if (!badge) return;
    const id = setTimeout(() => dismissNextBadge(), 4500);
    return () => clearTimeout(id);
  }, [badge, dismissNextBadge]);

  return (
    <AnimatePresence>
      {badge ? (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, x: 200, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 200, scale: 0.95, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="fixed bottom-24 right-4 z-[110] surface rounded-2xl p-3 shadow-soft-xl gradient-border w-[320px] max-w-[calc(100vw-1.5rem)]"
        >
          <div className="flex items-start gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8 }}
              className="w-12 h-12 rounded-xl grid place-items-center bg-gradient-aws text-ink-950 text-2xl flex-shrink-0 shadow-glow-orange"
            >
              {badge.icon}
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                <Award size={10} /> Badge unlocked
              </div>
              <div className="text-sm font-extrabold mt-0.5 leading-snug">{badge.name}</div>
              <div className="text-[11px] text-muted leading-snug mt-0.5">{badge.description}</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                <span className={cn('chip border font-bold', RARITY_META[badge.rarity || 'common'].color)}>
                  {RARITY_META[badge.rarity || 'common'].label}
                </span>
                {badge.xp > 0 && (
                  <span className="chip bg-aws-orange/15 text-aws-orange border border-aws-orange/30 font-bold">
                    +{badge.xp} XP
                  </span>
                )}
              </div>
            </div>
            <button onClick={dismissNextBadge}
                    className="text-muted hover:text-current p-1"
                    aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
