import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';

/**
 * Premium placeholder for pages that aren't fully implemented yet.
 * Looks intentional — not a "coming soon" stub.
 */
export function PageScaffold({ eyebrow, title, subtitle, icon, features = [], previewCount = 2, actions }) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle} icon={icon} actions={actions} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* What's included */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="surface rounded-2xl p-6 gradient-border"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-aws-orange" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Inside this section</h3>
          </div>
          <ul className="space-y-3">
            {features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i }}
                className="flex items-start gap-3"
              >
                <div className="mt-0.5 w-5 h-5 rounded-md bg-gradient-aws grid place-items-center text-ink-950 flex-shrink-0">
                  <CheckCircle2 size={12} strokeWidth={3} />
                </div>
                <span className="text-sm leading-relaxed">{f}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Skeleton preview */}
        <div className="space-y-4">
          {Array.from({ length: previewCount }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <SkeletonCard />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
