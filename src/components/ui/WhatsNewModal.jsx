import { AnimatePresence, motion } from 'framer-motion';
import { Megaphone, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';

// Bump this string when you want to show the modal again to everyone.
export const CURRENT_VERSION = '2026.05.19';

const WHATS_NEW = {
  '2026.05.19': {
    title: 'The Master Dashboard is here.',
    bullets: [
      'New: Master Dashboard with live progress across every subsystem.',
      'New: UK Transition Planner — application, visa, cost of living, work rights.',
      'New: Expanded Settings — display prefs, study prefs, full data export/import.',
      'New: Career analytics + AI insights on the dashboard.',
      'New: "?" anywhere opens keyboard shortcuts.',
    ],
  },
};

export function WhatsNewModal() {
  const { prefs, markWhatsNewSeen } = useApp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show only if user hasn't seen the current version.
    if ((prefs?.meta?.lastWhatsNewSeen || null) !== CURRENT_VERSION) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [prefs?.meta?.lastWhatsNewSeen]);

  const dismiss = () => {
    markWhatsNewSeen(CURRENT_VERSION);
    setOpen(false);
  };

  const data = WHATS_NEW[CURRENT_VERSION];
  if (!data) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={dismiss} />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="relative surface rounded-3xl gradient-border w-full max-w-md overflow-hidden"
          >
            <div className="bg-gradient-aws px-6 py-4 text-ink-950 relative">
              <button onClick={dismiss} className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/10"
                      aria-label="Close"><X size={16} /></button>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest">
                <Megaphone size={11} /> What's new · {CURRENT_VERSION}
              </div>
              <h2 className="text-xl font-black tracking-tight mt-1">{data.title}</h2>
            </div>
            <div className="p-5">
              <ul className="space-y-2">
                {data.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Sparkles size={14} className="text-aws-orange flex-shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
              <button onClick={dismiss} className="btn btn-primary w-full mt-5">Got it</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
