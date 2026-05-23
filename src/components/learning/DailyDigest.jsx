import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, BookmarkPlus, Briefcase, Calendar, CheckCircle2,
  ChevronLeft, ChevronRight, Lightbulb, Megaphone, Sparkles, Target, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLearning } from '../../context/LearningContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { dailyDigest, digestHistory } from '../../data/dailyDigest.js';
import { cn } from '../../lib/utils.js';

/**
 * Dashboard-friendly Daily Digest with 5 items:
 *   1. Concept of the day (deep link to topic)
 *   2. Practice question (one-click reveal + explanation)
 *   3. Architecture tip
 *   4. Career insight
 *   5. AWS news item
 * Plus: digest history browser + per-item save to notes.
 */
export function DailyDigest({ compact = false }) {
  const { state, markDigestRead, saveDigestItem } = useLearning();
  const toast = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [offset, setOffset] = useState(0); // 0 = today, 1 = yesterday, ...

  const digest = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return dailyDigest(d);
  }, [offset]);
  const history = useMemo(() => digestHistory(14), []);

  const read = !!state.digestRead?.[digest.date];
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const onPick = (i) => { setPicked(i); setRevealed(true); };
  const isCorrect = picked === digest.practice.answer;

  const save = (key, snippet) => {
    saveDigestItem(digest.date, key, snippet);
    toast.success('Saved to digest history');
  };

  return (
    <section className={cn(
      'surface rounded-3xl p-5 sm:p-6 gradient-border relative overflow-hidden',
      compact ? '' : 'mb-4'
    )}>
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-electric/15 rounded-full blur-3xl pointer-events-none" />
      <header className="relative flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
            <Calendar size={11} /> Daily digest · {digest.date}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1">
            Five things for today
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          {offset > 0 && (
            <button
              onClick={() => setOffset(o => Math.max(0, o - 1))}
              className="text-[11px] font-bold text-muted hover:text-aws-orange"
            >Today</button>
          )}
          <button
            onClick={() => setOffset(o => o + 1)}
            className="grid place-items-center w-7 h-7 rounded-md hover:bg-[var(--card-2)] focus-ring"
            aria-label="Previous day"
          ><ChevronLeft size={14} /></button>
          <button
            onClick={() => setOffset(o => Math.max(0, o - 1))}
            disabled={offset === 0}
            className={cn(
              'grid place-items-center w-7 h-7 rounded-md focus-ring',
              offset === 0 ? 'text-muted opacity-40' : 'hover:bg-[var(--card-2)]'
            )}
            aria-label="Next day"
          ><ChevronRight size={14} /></button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="text-[11px] font-bold text-muted hover:text-aws-orange ml-1"
          >History</button>
          {!read && offset === 0 && (
            <button
              onClick={() => { markDigestRead(digest.date); toast.success('Digest marked read'); }}
              className="ml-1 inline-flex items-center gap-1 chip bg-success/10 text-success border border-success/30 text-[11px] font-bold hover:bg-success/20"
            >
              <CheckCircle2 size={11} /> Mark read
            </button>
          )}
        </div>
      </header>

      <div className="relative grid gap-3 lg:grid-cols-2">
        {/* concept */}
        <DigestCard
          icon={BookOpen}
          eyebrow="Concept"
          title={digest.concept.title}
          body={digest.concept.summary}
          actions={
            <>
              <Link
                to={`/learning/${digest.concept.categoryId}/${digest.concept.topicId}`}
                className="btn btn-primary !text-xs !py-2"
              >
                Read full topic <ArrowRight size={12} />
              </Link>
              <SaveBtn onClick={() => save('concept', digest.concept.title)} />
            </>
          }
        />

        {/* practice question */}
        <DigestCard icon={Target} eyebrow="Practice question" title={digest.practice.q}>
          <ul className="space-y-1.5 mt-2">
            {digest.practice.options.map((opt, i) => {
              const correct = i === digest.practice.answer;
              const chosen = picked === i;
              return (
                <li key={i}>
                  <button
                    onClick={() => !revealed && onPick(i)}
                    disabled={revealed}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-3 py-2 text-xs font-semibold transition',
                      revealed && correct && 'border-success bg-success/10',
                      revealed && !correct && chosen && 'border-danger bg-danger/10',
                      !revealed && 'border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)]',
                      revealed && !chosen && !correct && 'border-token bg-[var(--card-2)]/40 opacity-60'
                    )}
                  >
                    {opt}
                  </button>
                </li>
              );
            })}
          </ul>
          <AnimatePresence>
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-lg border border-electric/30 bg-electric/5 p-2.5 text-xs"
              >
                <span className="font-extrabold text-electric mr-1.5">
                  {isCorrect ? 'Correct!' : 'Why:'}
                </span>
                {digest.practice.why}
              </motion.div>
            )}
          </AnimatePresence>
        </DigestCard>

        {/* arch tip */}
        <DigestCard
          icon={Lightbulb} eyebrow="Architecture tip"
          body={digest.archTip}
          actions={<SaveBtn onClick={() => save('archTip', digest.archTip)} />}
        />

        {/* career insight */}
        <DigestCard
          icon={Briefcase} eyebrow="Career insight"
          body={digest.career}
          actions={<SaveBtn onClick={() => save('career', digest.career)} />}
        />

        {/* news */}
        <DigestCard
          icon={Megaphone} eyebrow="AWS news"
          body={digest.news}
          actions={<SaveBtn onClick={() => save('news', digest.news)} />}
          fullSpan
        />
      </div>

      {/* History modal */}
      <AnimatePresence>
        {historyOpen && (
          <motion.div
            className="fixed inset-0 z-[95] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setHistoryOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="relative surface rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5 gradient-border"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-extrabold tracking-tight">Digest history</h3>
                <button onClick={() => setHistoryOpen(false)} className="rounded-md p-1 hover:bg-[var(--card-2)]">
                  <X size={16} />
                </button>
              </div>
              <ul className="space-y-2">
                {history.map((d, i) => {
                  const r = state.digestRead?.[d.date];
                  return (
                    <li key={d.date}>
                      <button
                        onClick={() => { setOffset(i); setHistoryOpen(false); }}
                        className={cn(
                          'w-full text-left rounded-xl border border-token p-3 hover:bg-[var(--card-2)] transition focus-ring',
                          r && 'bg-success/[0.04] border-success/30'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold tabular-nums">{d.date}</span>
                          {r && <span className="chip bg-success/15 text-success border border-success/30 text-[10px] font-bold">Read</span>}
                        </div>
                        <div className="text-sm font-bold truncate mt-1">{d.concept.title}</div>
                        <div className="text-[11px] text-muted truncate">{d.archTip}</div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function DigestCard({ icon: Icon, eyebrow, title, body, actions, children, fullSpan }) {
  return (
    <div className={cn(
      'rounded-2xl border border-token bg-[var(--card-2)]/40 p-4 flex flex-col',
      fullSpan && 'lg:col-span-2'
    )}>
      <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
        {Icon ? <Icon size={11} /> : null} {eyebrow}
      </div>
      {title && <h3 className="text-sm sm:text-base font-extrabold tracking-tight mt-1.5 leading-snug">{title}</h3>}
      {body && <p className="text-xs sm:text-sm text-muted leading-relaxed mt-1.5">{body}</p>}
      {children}
      {actions && (
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

function SaveBtn({ onClick }) {
  return (
    <button onClick={onClick} className="btn btn-ghost !text-[11px] !py-1.5 !px-2">
      <BookmarkPlus size={11} /> Save
    </button>
  );
}
