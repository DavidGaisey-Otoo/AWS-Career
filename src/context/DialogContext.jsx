/**
 * Themed replacement for window.confirm + window.prompt.
 *
 * Usage:
 *   const { confirm, prompt: dialogPrompt } = useDialog();
 *   const ok = await confirm({ title: 'Delete contract?', danger: true });
 *   const label = await dialogPrompt({ title: 'Label this node', defaultValue: '' });
 *
 * Falls back to the legacy global hooks so any existing `confirm()`
 * call in the codebase keeps working — but new code should call the
 * themed versions through this context.
 */
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils.js';

const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const close = useCallback((value) => {
    if (resolveRef.current) {
      resolveRef.current(value);
      resolveRef.current = null;
    }
    setDialog(null);
  }, []);

  // Close on ESC
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close(dialog.kind === 'prompt' ? null : false);
      if (e.key === 'Enter' && dialog.kind === 'confirm' && !dialog.danger) {
        // Enter confirms non-destructive actions
        close(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  const api = useMemo(() => ({
    confirm: (opts = {}) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog({
          kind: 'confirm',
          title:        opts.title       || 'Are you sure?',
          description:  opts.description || '',
          confirmLabel: opts.confirmLabel || (opts.danger ? 'Delete' : 'Confirm'),
          cancelLabel:  opts.cancelLabel  || 'Cancel',
          danger:       !!opts.danger,
        });
      }),
    prompt: (opts = {}) =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialog({
          kind: 'prompt',
          title:        opts.title        || 'Enter a value',
          description:  opts.description  || '',
          placeholder:  opts.placeholder  || '',
          defaultValue: opts.defaultValue || '',
          confirmLabel: opts.confirmLabel || 'OK',
          cancelLabel:  opts.cancelLabel  || 'Cancel',
        });
      }),
  }), []);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <AnimatePresence>
        {dialog && (
          <DialogShell
            key="dlg"
            dialog={dialog}
            onCancel={() => close(dialog.kind === 'prompt' ? null : false)}
            onConfirm={(value) => close(dialog.kind === 'prompt' ? value : true)}
          />
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

function DialogShell({ dialog, onCancel, onConfirm }) {
  const [value, setValue] = useState(dialog.defaultValue || '');
  const inputRef = useRef(null);
  const confirmRef = useRef(null);

  useEffect(() => {
    // Focus the input on prompt, the primary button on confirm
    if (dialog.kind === 'prompt') inputRef.current?.focus();
    else confirmRef.current?.focus();
  }, [dialog.kind]);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative surface rounded-2xl w-full max-w-sm overflow-hidden gradient-border"
      >
        <button
          onClick={onCancel}
          className="absolute top-2.5 right-2.5 rounded-md p-1 hover:bg-[var(--card-2)] focus-ring"
          aria-label="Close dialog"
        >
          <X size={14} />
        </button>

        <div className="p-5">
          <div className="flex items-start gap-3 mb-2">
            <div className={cn(
              'w-9 h-9 rounded-xl grid place-items-center shrink-0',
              dialog.danger
                ? 'bg-danger/15 text-danger'
                : 'bg-aws-orange/15 text-aws-orange',
            )}>
              {dialog.danger ? <AlertTriangle size={18} /> : <Check size={18} />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-sm font-extrabold tracking-tight">{dialog.title}</h3>
              {dialog.description && (
                <p className="text-[12px] text-muted leading-relaxed mt-1">{dialog.description}</p>
              )}
            </div>
          </div>

          {dialog.kind === 'prompt' && (
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(value); }}
              placeholder={dialog.placeholder}
              className="mt-3 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm focus-ring focus:border-aws-orange"
            />
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="btn btn-ghost !text-xs"
            >
              {dialog.cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={() => onConfirm(dialog.kind === 'prompt' ? value : true)}
              className={cn(
                '!text-xs inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-extrabold transition focus-ring',
                dialog.danger
                  ? 'bg-danger text-white hover:brightness-110'
                  : 'btn btn-primary',
              )}
            >
              {dialog.confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within DialogProvider');
  return ctx;
}
