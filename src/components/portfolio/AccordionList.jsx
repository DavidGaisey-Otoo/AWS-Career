import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils.js';

/**
 * Generic accordion. Each item: { id, title, body }.
 * `titlePrefix` lets the caller render an index, icon, or chip.
 */
export function AccordionList({ items, defaultOpenIds = [], renderTitlePrefix }) {
  const [open, setOpen] = useState(new Set(defaultOpenIds));
  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const isOpen = open.has(it.id);
        return (
          <div key={it.id} className={cn(
            'rounded-2xl border border-token bg-[var(--card-2)]/40 overflow-hidden',
            isOpen && 'bg-[var(--card-2)]'
          )}>
            <button
              onClick={() => toggle(it.id)}
              className="w-full flex items-start gap-3 p-3.5 text-left focus-ring"
            >
              {renderTitlePrefix ? (
                <div className="flex-shrink-0">{renderTitlePrefix(it, i)}</div>
              ) : null}
              <div className="flex-1 min-w-0 text-sm font-bold leading-snug">{it.title}</div>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                className="text-muted flex-shrink-0"
              >
                <ChevronDown size={16} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 text-sm text-muted leading-relaxed">
                    {it.body}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
