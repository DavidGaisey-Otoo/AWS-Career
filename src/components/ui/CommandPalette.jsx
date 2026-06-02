import { AnimatePresence, motion } from 'framer-motion';
import { Search, ArrowRight, Sun, Moon, Sparkles, RotateCcw, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { buildIndex, search, groupByKind } from '../../lib/searchIndex.js';
import { cn } from '../../lib/utils.js';
import { fireConfetti } from './Confetti.js';

// Always-available actions (don't need the lazy-loaded index)
const SYSTEM_ACTIONS = [
  { id: 'toggle-theme', title: 'Toggle theme', hint: 'Switch dark / light',  kind: 'Action', keywords: ['theme', 'dark', 'light'] },
  { id: 'celebrate',    title: 'Celebrate a win', hint: 'Launch confetti',   kind: 'Action', keywords: ['confetti', 'win', 'celebrate'] },
  { id: 'reset',        title: 'Reset onboarding', hint: 'Re-run the welcome flow', kind: 'Action', keywords: ['reset', 'onboarding'] },
];

export function CommandPalette() {
  const { paletteOpen, closePalette, resetAll } = useApp();
  const { toggle } = useTheme();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const [index, setIndex] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (paletteOpen) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
      // Lazy-build the index on first open
      if (!index) {
        buildIndex().then(setIndex).catch((err) => {
          console.error('Search index build failed:', err);
          setIndex([]);
        });
      }
    }
  }, [paletteOpen, index]);

  const results = useMemo(() => {
    const base = index || [];
    const indexed = search([...base, ...SYSTEM_ACTIONS], q, 40);
    return indexed;
  }, [q, index]);

  const grouped = useMemo(() => groupByKind(results), [results]);
  const groupOrder = ['Section', 'Page', 'Project', 'Walkthrough', 'AWS service', 'Roadmap', 'Roadmap task', 'Action', 'Other'];
  const orderedGroups = groupOrder.filter((g) => grouped[g]);

  // Flat list for keyboard navigation (matches the visual rendering order)
  const flatList = useMemo(() => {
    const list = [];
    for (const g of orderedGroups) list.push(...grouped[g]);
    return list;
  }, [grouped, orderedGroups]);

  useEffect(() => { setActive(0); }, [q]);

  const run = (r) => {
    if (!r) return;
    closePalette();
    if (r.kind === 'Action') {
      if (r.id === 'toggle-theme') { toggle(); toast.info('Theme toggled'); return; }
      if (r.id === 'celebrate')    { fireConfetti(); toast.success('Nice!'); return; }
      if (r.id === 'reset')        { resetAll(); toast.info('Onboarding reset'); return; }
    }
    if (r.path) nav(r.path);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, flatList.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); run(flatList[active]); }
  };

  // Track index position across groups for highlight
  let absoluteIdx = -1;

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
                placeholder="Search anything — pages, projects, services, walkthroughs, settings…"
                className="flex-1 bg-transparent text-base font-medium placeholder:text-muted focus:outline-none"
              />
              {!index && <Loader2 size={14} className="animate-spin opacity-50" />}
              <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold rounded-md border border-token px-1.5 py-0.5 text-muted">
                ESC
              </kbd>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {flatList.length === 0 ? (
                <div className="p-10 text-center text-muted text-sm">
                  {!index ? 'Loading search index…' : <>No results for <span className="font-semibold">"{q}"</span></>}
                </div>
              ) : (
                orderedGroups.map((groupName) => (
                  <div key={groupName} className="mb-2">
                    <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest font-extrabold opacity-50">
                      {groupName}
                    </div>
                    {grouped[groupName].map((r) => {
                      absoluteIdx += 1;
                      const i = absoluteIdx;
                      const Icon = r.icon || Search;
                      const isActive = i === active;
                      return (
                        <button
                          key={r.id}
                          onMouseEnter={() => setActive(i)}
                          onClick={() => run(r)}
                          className={cn(
                            'group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                            isActive ? 'bg-[var(--card-2)]' : 'hover:bg-[var(--card-2)]/60'
                          )}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-aws text-ink-950 shadow-glow-orange shrink-0">
                            <Icon size={14} strokeWidth={2.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold truncate">{r.title}</div>
                            {r.hint && <div className="text-xs text-muted truncate">{r.hint}</div>}
                          </div>
                          {r.path && (
                            <span className="text-[10px] font-mono opacity-40 truncate max-w-[140px] hidden sm:inline">{r.path}</span>
                          )}
                          <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-token text-[11px] text-muted">
              <div className="flex items-center gap-3">
                <span>↑ ↓ navigate</span>
                <span>↵ select</span>
                <span className="hidden sm:inline">{flatList.length} results</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Moon size={12} /><Sun size={12} />
                <span className="ml-1">⌘K from anywhere</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
