import { AnimatePresence, motion } from 'framer-motion';
import { Search, ArrowRight, Sun, Moon, Sparkles, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { NAV_ITEMS } from '../../lib/constants.js';
import { cn } from '../../lib/utils.js';
import { fireConfetti } from './Confetti.js';

const ACTIONS = [
  { id: 'toggle-theme', title: 'Toggle theme', hint: 'Switch dark / light', kind: 'action' },
  { id: 'celebrate',    title: 'Celebrate a win', hint: 'Launch confetti', kind: 'action' },
  { id: 'reset',        title: 'Reset onboarding', hint: 'Re-run the welcome flow', kind: 'action' },
];

export function CommandPalette() {
  const { paletteOpen, closePalette, resetAll } = useApp();
  const { toggle } = useTheme();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [paletteOpen]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const navResults = NAV_ITEMS.map((n) => ({
      id: `nav-${n.id}`, title: n.label, hint: `Go to ${n.label}`,
      kind: 'nav', icon: n.icon, path: n.path,
    }));
    const all = [...navResults, ...ACTIONS];
    if (!term) return all.slice(0, 10);
    return all.filter((r) => r.title.toLowerCase().includes(term) || r.hint?.toLowerCase().includes(term));
  }, [q]);

  useEffect(() => { setActive(0); }, [q]);

  const run = (r) => {
    if (!r) return;
    closePalette();
    if (r.kind === 'nav') nav(r.path);
    if (r.id === 'toggle-theme') { toggle(); toast.info('Theme toggled'); }
    if (r.id === 'celebrate') { fireConfetti(); toast.success('Nice!'); }
    if (r.id === 'reset') { resetAll(); toast.info('Onboarding reset'); }
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); run(results[active]); }
  };

  return (
    <AnimatePresence>
      {paletteOpen ? (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={closePalette} />
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="surface relative w-full max-w-2xl rounded-3xl overflow-hidden gradient-border"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-token">
              <Search className="text-aws-orange" size={20} />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search pages, actions, or anything…"
                className="flex-1 bg-transparent text-base font-medium placeholder:text-muted focus:outline-none"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold rounded-md border border-token px-1.5 py-0.5 text-muted">
                ESC
              </kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="p-10 text-center text-muted text-sm">
                  No results for <span className="font-semibold">"{q}"</span>
                </div>
              ) : (
                results.map((r, i) => {
                  const Icon =
                    r.icon ||
                    (r.id === 'toggle-theme' ? Sun
                      : r.id === 'celebrate' ? Sparkles
                      : r.id === 'reset' ? RotateCcw : Search);
                  return (
                    <button
                      key={r.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => run(r)}
                      className={cn(
                        'group w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition',
                        i === active ? 'bg-[var(--card-2)]' : 'hover:bg-[var(--card-2)]/60'
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-aws text-ink-950 shadow-glow-orange">
                        <Icon size={16} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{r.title}</div>
                        <div className="text-xs text-muted truncate">{r.hint}</div>
                      </div>
                      <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition" />
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-token text-[11px] text-muted">
              <div className="flex items-center gap-3">
                <span>↑ ↓ navigate</span>
                <span>↵ select</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Moon size={12} /><Sun size={12} />
                <span className="ml-1">Premium build</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
