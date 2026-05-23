import { useEffect } from 'react';

// Bind a global hotkey. Combo examples: 'mod+k', 'esc', 'shift+/'
export function useHotkey(combo, handler, deps = []) {
  useEffect(() => {
    const parts = combo.toLowerCase().split('+');
    const wants = {
      mod: parts.includes('mod'),
      shift: parts.includes('shift'),
      alt: parts.includes('alt'),
      key: parts[parts.length - 1],
    };
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (wants.mod && !mod) return;
      if (!wants.mod && mod && wants.key !== 'esc') return;
      if (wants.shift !== e.shiftKey) return;
      if (wants.alt !== e.altKey) return;
      const k = e.key.toLowerCase() === ' ' ? 'space' : e.key.toLowerCase();
      const target = k === 'escape' ? 'esc' : k;
      if (target === wants.key) {
        handler(e);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
