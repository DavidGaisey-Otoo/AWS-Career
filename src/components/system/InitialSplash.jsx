/**
 * InitialSplash.jsx — lightweight loading overlay shown on first paint.
 *
 * Auto-dismisses after MAX 1 second, OR earlier if the route has rendered.
 * Sits on top of everything during the cold-start moment so the user sees
 * something happen immediately instead of a blank screen.
 *
 * Renders inline (no portal needed) — just a fixed-position element with
 * `pointer-events: none` once dismissed so it doesn\'t block interaction.
 */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const MAX_VISIBLE_MS = 1000;
const MIN_VISIBLE_MS = 200; // avoid awkward flicker

export function InitialSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Belt-and-braces: always dismiss by the hard cap
    const hardStop = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);

    // Dismiss as soon as the document is interactive — usually faster
    function maybeDismiss() {
      const elapsed = performance.now();
      if (elapsed >= MIN_VISIBLE_MS) setVisible(false);
      else setTimeout(() => setVisible(false), MIN_VISIBLE_MS - elapsed);
    }
    if (document.readyState === 'complete') {
      maybeDismiss();
    } else {
      window.addEventListener('load', maybeDismiss, { once: true });
    }

    return () => {
      clearTimeout(hardStop);
      window.removeEventListener('load', maybeDismiss);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] grid place-items-center bg-[var(--bg)]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          style={{ pointerEvents: visible ? 'auto' : 'none' }}
        >
          <div className="text-center">
            <div className="relative inline-block">
              <motion.div
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg grid place-items-center"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Sparkles size={26} className="text-white" />
              </motion.div>
              <motion.div
                className="absolute -inset-2 rounded-3xl border-2 border-orange-400/40"
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
            <div className="mt-4 text-xs font-bold tracking-widest opacity-60 uppercase">
              AWS Career Launchpad Pro
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
