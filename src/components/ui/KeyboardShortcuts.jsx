import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';

/**
 * Global "?" → keyboard shortcuts cheat sheet.
 * Triggered by Shift+? (i.e. the literal "?" key in most layouts).
 */
const SHORTCUTS = [
  { group: 'Navigation', rows: [
    ['⌘ K / Ctrl K', 'Open command palette'],
    ['?',            'Show this shortcuts panel'],
    ['Esc',          'Close any open modal / panel'],
  ]},
  { group: 'Roadmap', rows: [
    ['Space',        'Tick current subtask'],
    ['Arrow keys',   'Navigate task list'],
  ]},
  { group: 'Flashcards', rows: [
    ['Space',        'Flip card'],
    ['Arrow ← / →',  'Previous / next card'],
    ['1 / 2 / 3',    'Mark Known / Learning / Hard'],
    ['S',            'Shuffle deck'],
  ]},
  { group: 'Pomodoro', rows: [
    ['Click Start',  'Begin a session'],
    ['Click Stop',   'Reset to 0'],
  ]},
  { group: 'AI Assistant', rows: [
    ['Enter',        'Send message'],
    ['Shift + Enter','Newline'],
  ]},
];

export function KeyboardShortcuts() {
  const { shortcutsOpen, openShortcuts, closeShortcuts } = useApp();

  // Global key handler: "?" opens, "Esc" closes
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA'].includes(tag) || e.target?.isContentEditable) return;
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        openShortcuts();
      } else if (e.key === 'Escape' && shortcutsOpen) {
        closeShortcuts();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsOpen, openShortcuts, closeShortcuts]);

  return (
    <AnimatePresence>
      {shortcutsOpen && (
        <motion.div className="fixed inset-0 z-[105] flex items-center justify-center p-4"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={closeShortcuts} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative surface rounded-3xl gradient-border w-full max-w-lg max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b border-token">
              <Keyboard size={18} className="text-aws-orange" />
              <h2 className="text-lg font-extrabold tracking-tight flex-1">Keyboard shortcuts</h2>
              <button onClick={closeShortcuts} aria-label="Close"
                      className="rounded-md p-1.5 hover:bg-[var(--card-2)]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {SHORTCUTS.map((g) => (
                <section key={g.group}>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">{g.group}</h3>
                  <ul className="space-y-1">
                    {g.rows.map(([kb, what], i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span>{what}</span>
                        <kbd className="text-[11px] font-bold border border-token rounded-md px-2 py-0.5 bg-[var(--card-2)] tabular-nums">{kb}</kbd>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <p className="text-[11px] text-muted text-center pt-2 border-t border-token">
                Press <kbd className="text-[10px] font-bold border border-token rounded px-1.5 py-0.5">?</kbd> anywhere to reopen.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
