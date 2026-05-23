import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { useGamification } from '../../context/GamificationContext.jsx';
import { fireConfetti, sideCannons } from '../ui/Confetti.js';
import { LEVELS } from '../../data/gamification.js';

/**
 * Full-screen level-up celebration. Fires confetti + side cannons.
 * Subscribes to pendingLevelUp and shows it once.
 */
export function LevelUpModal() {
  const { pendingLevelUp, consumeLevelUp } = useGamification();

  useEffect(() => {
    if (!pendingLevelUp) return;
    sideCannons();
    setTimeout(() => fireConfetti({ origin: { y: 0.35 } }), 200);
  }, [pendingLevelUp]);

  if (!pendingLevelUp) return null;
  const lvl = LEVELS.find((l) => l.n === pendingLevelUp.to) || LEVELS[0];

  return (
    <AnimatePresence>
      <motion.div
        key="level-up"
        className="fixed inset-0 z-[120] grid place-items-center px-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1,   y: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="relative surface rounded-3xl gradient-border p-7 sm:p-10 max-w-md w-full text-center overflow-hidden"
        >
          {/* radial flare */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1.2], opacity: [0, 0.6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="absolute inset-0 rounded-3xl bg-gradient-aws blur-3xl opacity-30 pointer-events-none"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              <Sparkles size={11} /> Level up!
            </div>
            <motion.div
              initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
              animate={{ scale: 1,    rotate: 0,   opacity: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 280, damping: 16 }}
              className={`mt-3 mx-auto w-28 h-28 rounded-3xl grid place-items-center text-5xl shadow-glow-orange bg-gradient-to-br ${lvl.color}`}
            >
              <span aria-hidden>{lvl.icon}</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-4 text-3xl font-black tracking-tight text-gradient"
            >
              {lvl.name}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="text-sm text-muted mt-1"
            >
              You\'re now level {pendingLevelUp.to}. Keep stacking wins.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              onClick={consumeLevelUp}
              className="btn btn-primary mt-6"
            >
              <Sparkles size={14} /> Continue
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
