import { AnimatePresence, motion } from 'framer-motion';
import { useRoadmap } from '../../context/RoadmapContext.jsx';

/**
 * Floating +XP coins that pop out from tick locations.
 * Rendered once at the layout level — listens to the roadmap context.
 */
export function XPFloaterLayer() {
  const { xpFloaters } = useRoadmap();
  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      <AnimatePresence>
        {xpFloaters.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, scale: 0.6, x: f.x - 40, y: f.y - 10 }}
            animate={{ opacity: 1, scale: 1, y: f.y - 70 }}
            exit={{ opacity: 0, scale: 0.8, y: f.y - 110 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute"
            style={{ left: 0, top: 0 }}
          >
            <div className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-gradient-aws text-ink-950 shadow-glow-orange">
              +{f.amount} XP
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
