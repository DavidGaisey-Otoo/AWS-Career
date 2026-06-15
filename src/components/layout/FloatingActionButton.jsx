import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Command, Sparkles, BookOpen, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { fireConfetti } from '../ui/Confetti.js';

export function FloatingActionButton() {
  const [open, setOpen] = useState(false);
  const { openPalette } = useApp();
  const nav = useNavigate();

  const actions = [
    { id: 'palette', label: 'Command palette', icon: Command, onClick: () => openPalette() },
    { id: 'lesson',  label: 'Start a lesson',  icon: BookOpen, onClick: () => nav('/learning') },
    { id: 'project', label: 'New portfolio project', icon: Briefcase, onClick: () => nav('/portfolio') },
    { id: 'win',     label: 'Log a win',       icon: Sparkles, onClick: () => fireConfetti() },
  ];

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-24 lg:right-6 z-40">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className="absolute bottom-16 right-0 surface rounded-2xl p-2 shadow-soft-xl gradient-border min-w-[220px]"
          >
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.id}
                  onClick={() => { a.onClick(); setOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--card-2)] text-sm font-semibold text-left"
                >
                  <span className="w-8 h-8 rounded-lg grid place-items-center bg-gradient-aws text-ink-950">
                    <Icon size={14} strokeWidth={2.5} />
                  </span>
                  {a.label}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.94 }}
        whileHover={{ scale: 1.06 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Quick actions"
        className="w-14 h-14 rounded-2xl bg-gradient-aws text-ink-950 grid place-items-center shadow-glow-orange animate-pulse-glow"
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
          <Plus size={26} strokeWidth={2.5} />
        </motion.span>
      </motion.button>
    </div>
  );
}
