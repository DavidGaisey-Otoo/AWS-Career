import { AnimatePresence, motion } from 'framer-motion';
import {
  BookMarked, CheckCircle2, ChevronDown, Clock, ExternalLink, FileText, Star,
} from 'lucide-react';
import { useState } from 'react';
import { useLearning } from '../../context/LearningContext.jsx';
import { WHITEPAPERS } from '../../data/whitepapers.js';
import { cn, formatDate } from '../../lib/utils.js';

export function WhitepaperLibrary() {
  const { getWPState, setWPRead, setWPNotes, wpProgress } = useLearning();
  const [openId, setOpenId] = useState(null);
  const [draftNotes, setDraftNotes] = useState({});

  const toggle = (id) => {
    if (openId === id) { setOpenId(null); return; }
    setOpenId(id);
    setDraftNotes((d) => ({ ...d, [id]: getWPState(id).notes }));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Whitepaper library</h2>
          <p className="text-xs text-muted mt-1">
            10 essential AWS whitepapers, each with extracted key points and a flashcard set.
          </p>
        </div>
        <span className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 font-bold">
          {wpProgress.read}/{wpProgress.total} read
        </span>
      </div>

      <ul className="space-y-3">
        {WHITEPAPERS.map((wp, i) => {
          const ws = getWPState(wp.id);
          const open = openId === wp.id;
          return (
            <motion.li
              key={wp.id}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'surface rounded-2xl overflow-hidden border transition',
                ws.read ? 'border-success/40' : 'border-token'
              )}
            >
              <button onClick={() => toggle(wp.id)} className="w-full flex items-center gap-3 p-4 sm:p-5 text-left">
                <div className={cn(
                  'grid place-items-center w-10 h-10 rounded-xl flex-shrink-0',
                  ws.read ? 'bg-success/15 text-success' : 'bg-gradient-aws text-ink-950'
                )}>
                  {ws.read ? <CheckCircle2 size={18} /> : <BookMarked size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight leading-tight">{wp.title}</h3>
                  <p className="text-[12px] text-muted leading-snug mt-1 line-clamp-2">{wp.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-muted font-bold">
                      <Clock size={11} /> ~{wp.minutes} min
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} size={10}
                              className={idx < wp.examRelevance ? 'text-aws-orange fill-aws-orange' : 'text-muted'} />
                      ))}
                      <span className="ml-1 text-muted font-bold text-[10px]">exam-relevant</span>
                    </span>
                    {ws.read && ws.lastReadAt && (
                      <span className="chip bg-success/10 text-success border border-success/30 text-[10px] font-bold">
                        Last read {formatDate(ws.lastReadAt)}
                      </span>
                    )}
                  </div>
                </div>
                <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-muted">
                  <ChevronDown size={18} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 pb-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
                      <div>
                        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
                          Key points
                        </h4>
                        <ul className="space-y-2 text-sm">
                          {wp.keyPoints.map((p, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                              <span className="leading-relaxed">{p}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setWPRead(wp.id, !ws.read)}
                            className={cn(
                              'btn !text-xs !py-2',
                              ws.read ? 'bg-success/15 text-success border border-success/30' : 'btn-ghost'
                            )}
                          >
                            <CheckCircle2 size={14} />
                            {ws.read ? 'Marked read' : 'Mark as read'}
                          </button>
                          {wp.awsUrl && (
                            <a href={wp.awsUrl} target="_blank" rel="noreferrer"
                               className="btn btn-ghost !text-xs !py-2">
                              <ExternalLink size={12} /> AWS docs
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">
                            Notes
                          </h4>
                          <textarea
                            rows={5}
                            value={draftNotes[wp.id] ?? ''}
                            onChange={(e) => setDraftNotes((d) => ({ ...d, [wp.id]: e.target.value }))}
                            onBlur={() => setWPNotes(wp.id, draftNotes[wp.id] ?? '')}
                            placeholder="Capture the bits you want to revisit…"
                            className="w-full bg-[var(--card-2)] border border-token rounded-xl p-2.5 text-xs leading-relaxed focus-ring focus:border-aws-orange resize-y"
                          />
                        </div>
                        {wp.flashcards?.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">
                              Flashcards ({wp.flashcards.length})
                            </h4>
                            <ul className="space-y-1.5">
                              {wp.flashcards.map((fc, idx) => (
                                <details key={idx} className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2 text-xs">
                                  <summary className="font-bold cursor-pointer">{fc.front}</summary>
                                  <p className="mt-1 text-muted leading-relaxed">{fc.back}</p>
                                </details>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
