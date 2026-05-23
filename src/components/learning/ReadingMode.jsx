import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { useLearning } from '../../context/LearningContext.jsx';

/**
 * Distraction-free reading mode — full-screen overlay with only the topic\'s
 * narrative content. Adjustable font scale.
 */
export function ReadingMode({ open, onClose, topic, category, fontScale = 1 }) {
  const { setFontScale } = useLearning();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-[var(--bg)] overflow-y-auto"
        >
          {/* sticky controls */}
          <div className="sticky top-0 z-10 glass border-b border-token">
            <div className="max-w-3xl mx-auto px-5 sm:px-8 py-3 flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{category.icon}</span>
                <span className="font-bold">{category.title}</span>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => setFontScale(Math.max(0.9, fontScale - 0.1))}
                  className="grid place-items-center w-7 h-7 rounded-md hover:bg-[var(--card-2)]"
                  aria-label="Smaller"
                ><Minus size={14} /></button>
                <span className="text-[10px] font-extrabold text-muted tabular-nums w-8 text-center">
                  {Math.round(fontScale * 100)}%
                </span>
                <button
                  onClick={() => setFontScale(Math.min(1.4, fontScale + 0.1))}
                  className="grid place-items-center w-7 h-7 rounded-md hover:bg-[var(--card-2)]"
                  aria-label="Larger"
                ><Plus size={14} /></button>
                <button
                  onClick={onClose}
                  className="ml-2 grid place-items-center w-8 h-8 rounded-lg hover:bg-[var(--card-2)]"
                  aria-label="Exit reading mode"
                ><X size={16} /></button>
              </div>
            </div>
          </div>

          <article
            className="max-w-3xl mx-auto px-5 sm:px-8 py-10 space-y-6"
            style={{ fontSize: `${fontScale}rem`, lineHeight: 1.75 }}
          >
            <header>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{topic.title}</h1>
              {topic.summary && (
                <p className="text-muted mt-2 leading-relaxed">{topic.summary}</p>
              )}
            </header>

            {topic.simpleEnglish && (
              <section>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                  In simple English
                </h2>
                <p className="leading-relaxed">{topic.simpleEnglish}</p>
              </section>
            )}
            {topic.deepDive && (
              <section>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                  Deep dive
                </h2>
                <p className="leading-relaxed whitespace-pre-wrap">{topic.deepDive}</p>
              </section>
            )}
            {topic.keyPoints?.length > 0 && (
              <section>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                  Key points
                </h2>
                <ul className="space-y-3 list-disc pl-5">
                  {topic.keyPoints.map((kp, i) => (
                    <li key={i}>
                      {typeof kp === 'string' ? kp : (
                        <>
                          <strong className="font-bold">{kp.front}</strong>
                          {kp.back && <span className="text-muted"> — {kp.back}</span>}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {topic.useCase && (
              <section>
                <h2 className="text-xs font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                  Use case
                </h2>
                <p className="leading-relaxed">{topic.useCase}</p>
              </section>
            )}
          </article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
