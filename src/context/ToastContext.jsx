import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { uid } from '../lib/utils.js';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const ACCENT = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  info: 'text-electric',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast) => {
      const id = uid();
      const item = {
        id,
        type: 'info',
        duration: 4200,
        ...toast,
      };
      setToasts((prev) => [item, ...prev].slice(0, 6));
      if (item.duration > 0) {
        const handle = setTimeout(() => dismiss(id), item.duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      toast: push,
      success: (title, opts = {}) => push({ ...opts, title, type: 'success' }),
      error: (title, opts = {}) => push({ ...opts, title, type: 'error' }),
      warning: (title, opts = {}) => push({ ...opts, title, type: 'warning' }),
      info: (title, opts = {}) => push({ ...opts, title, type: 'info' }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 24, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.96, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className="pointer-events-auto glass rounded-2xl shadow-soft-xl overflow-hidden"
              >
                <div className="flex items-start gap-3 p-3.5 pr-2.5">
                  <div className={`mt-0.5 ${ACCENT[t.type]}`}>
                    <Icon size={20} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-snug">{t.title}</div>
                    {t.description ? (
                      <div className="text-xs text-muted mt-0.5 leading-relaxed">{t.description}</div>
                    ) : null}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="rounded-lg p-1 hover:bg-white/10 focus-ring"
                    aria-label="Dismiss"
                  >
                    <X size={16} />
                  </button>
                </div>
                {t.duration > 0 ? (
                  <motion.div
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: t.duration / 1000, ease: 'linear' }}
                    style={{ transformOrigin: 'left' }}
                    className={`h-[2px] ${
                      t.type === 'success' ? 'bg-success'
                        : t.type === 'warning' ? 'bg-warning'
                        : t.type === 'error' ? 'bg-danger'
                        : 'bg-electric'
                    }`}
                  />
                ) : null}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
