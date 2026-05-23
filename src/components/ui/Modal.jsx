import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';

export function Modal({ open, onClose, title, children, footer, size = 'md', dismissable = true }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape' && dismissable) onClose?.(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissable]);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissable ? onClose : undefined}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className={`surface relative w-full ${widths[size]} rounded-3xl overflow-hidden gradient-border`}
          >
            {title || dismissable ? (
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-bold tracking-tight">{title}</h2>
                {dismissable ? (
                  <button onClick={onClose} className="rounded-xl p-2 hover:bg-[var(--card-2)] focus-ring" aria-label="Close">
                    <X size={18} />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="px-6 pb-6">{children}</div>
            {footer ? (
              <div className="px-6 py-4 border-t border-token bg-[var(--card-2)]/40">{footer}</div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
