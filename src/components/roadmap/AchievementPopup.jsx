import { AnimatePresence, motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useEffect } from 'react';
import { useRoadmap } from '../../context/RoadmapContext.jsx';

export function AchievementPopup() {
  const { achievement, dismissAchievement } = useRoadmap();
  useEffect(() => {
    if (!achievement) return;
    const t = setTimeout(dismissAchievement, 4500);
    return () => clearTimeout(t);
  }, [achievement, dismissAchievement]);

  return (
    <AnimatePresence>
      {achievement ? (
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="fixed left-1/2 -translate-x-1/2 top-6 z-[110] pointer-events-auto"
          onClick={dismissAchievement}
          role="status"
        >
          <div className="surface gradient-border rounded-3xl px-5 py-3 flex items-center gap-4 shadow-soft-xl">
            <div className="w-12 h-12 rounded-2xl bg-gradient-aws grid place-items-center text-ink-950 shadow-glow-orange animate-pulse-glow">
              <span className="text-2xl">{achievement.badge || '🏆'}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-extrabold text-aws-orange">
                <Trophy size={12} /> Achievement unlocked
              </div>
              <div className="font-extrabold tracking-tight text-base leading-tight">{achievement.title}</div>
              <div className="text-xs text-muted">{achievement.body}</div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
