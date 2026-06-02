import { motion } from 'framer-motion';
import { BookOpen, Check, ExternalLink, Flag, Lightbulb, Target, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/utils.js';

/**
 * Pure presentational renderer for a single exam question.
 * Used by all three exam modes (Standard, Practice, Learning).
 *
 * Props:
 *  - q: question object (see questionBank.js)
 *  - answer: current selection (number | number[] for multi)
 *  - onAnswer(next): user selects an option
 *  - revealed: bool — show correct/wrong colours + explanation
 *  - readOnly: bool — disable interaction (review mode)
 *  - flagged: bool
 *  - onToggleFlag(): toggle flag
 *  - index, total: position labels
 *  - hideFlag: bool
 */
export function QuestionRenderer({
  q,
  answer,
  onAnswer,
  revealed = false,
  readOnly = false,
  flagged = false,
  onToggleFlag,
  index,
  total,
  hideFlag = false,
}) {
  const isMulti = q.type === 'multi';
  const isTF = q.type === 'tf';

  const select = (i) => {
    if (readOnly || revealed) return;
    if (isMulti) {
      const cur = Array.isArray(answer) ? answer : [];
      const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
      onAnswer(next);
    } else {
      onAnswer(i);
    }
  };

  const isSelected = (i) =>
    isMulti ? Array.isArray(answer) && answer.includes(i) : answer === i;

  const isCorrect = (i) =>
    isMulti ? Array.isArray(q.answer) && q.answer.includes(i) : q.answer === i;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-muted">
          <span>Question <span className="text-aws-orange">{index + 1}</span> / {total}</span>
          {/* EX-01: prefer the new `level` tag (Foundational/Associate/Professional) when present */}
          {q.level ? (
            <span className={cn(
              'chip border text-[10px]',
              q.level === 'Foundational' ? 'border-success/40 text-success bg-success/10' :
              q.level === 'Associate'    ? 'border-aws-orange/40 text-aws-orange bg-aws-orange/10' :
              q.level === 'Professional' ? 'border-danger/40 text-danger bg-danger/10' :
                                           'border-token text-muted bg-[var(--card-2)]',
            )}>
              {q.level}
            </span>
          ) : (
            <span className={cn(
              'chip border text-[10px]',
              q.difficulty === 'easy'   ? 'border-success/40 text-success bg-success/10' :
              q.difficulty === 'hard'   ? 'border-warning/40 text-warning bg-warning/10' :
              q.difficulty === 'expert' ? 'border-danger/40 text-danger bg-danger/10' :
                                          'border-token text-muted bg-[var(--card-2)]',
            )}>
              {q.difficulty}
            </span>
          )}
          {/* EX-01: topic tag (Storage / Compute / Security / ...) */}
          {q.topic && (
            <span className="chip border border-electric/40 text-electric bg-electric/10 text-[10px]">
              {q.topic}
            </span>
          )}
          {q.service?.length > 0 && (
            <span className="chip border border-token text-muted bg-[var(--card-2)] text-[10px]">
              {q.service.slice(0, 2).join(', ')}
            </span>
          )}
          {isMulti && <span className="chip border border-electric/40 text-electric bg-electric/10 text-[10px]">multi-answer</span>}
          {isTF && <span className="chip border border-electric/40 text-electric bg-electric/10 text-[10px]">true / false</span>}
        </div>
        {!hideFlag && (
          <button
            onClick={onToggleFlag}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition focus-ring border',
              flagged ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                      : 'border-token text-muted hover:text-current hover:bg-[var(--card-2)]',
            )}
          >
            <Flag size={12} className={flagged ? 'fill-current' : ''} />
            {flagged ? 'Flagged' : 'Flag'}
          </button>
        )}
      </div>

      {/* Question text */}
      <h2 className="text-lg sm:text-xl font-bold leading-relaxed tracking-tight">{q.q}</h2>
      {isMulti && (
        <p className="text-[11px] text-muted -mt-2">
          Select all that apply{Array.isArray(q.answer) ? ` (${q.answer.length} answers)` : ''}.
        </p>
      )}

      {/* Options */}
      <ul className="space-y-2">
        {q.options.map((opt, i) => {
          const selected = isSelected(i);
          const correct = isCorrect(i);
          const showFb = revealed;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => select(i)}
                disabled={readOnly || revealed}
                className={cn(
                  'w-full text-left rounded-xl border-2 p-3 transition focus-ring',
                  showFb && correct && 'border-success bg-success/10',
                  showFb && !correct && selected && 'border-danger bg-danger/10',
                  !showFb && selected && 'border-aws-orange bg-aws-orange/10',
                  !showFb && !selected && 'border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)]',
                  showFb && !correct && !selected && 'border-token bg-[var(--card-2)]/40 opacity-60',
                )}
              >
                <div className="flex items-start gap-3">
                  <span className={cn(
                    'mt-0.5 w-6 h-6 rounded-md grid place-items-center text-[11px] font-extrabold flex-shrink-0',
                    showFb && correct ? 'bg-success text-white' :
                    showFb && !correct && selected ? 'bg-danger text-white' :
                    selected ? 'bg-aws-orange text-ink-950' : 'bg-[var(--card)] text-muted border border-token',
                  )}>
                    {showFb && correct ? <Check size={12} />
                      : showFb && !correct && selected ? <X size={12} />
                      : String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm font-semibold leading-snug">{opt}</span>
                </div>
                {showFb && !correct && selected && q.wrongReasons?.[i] && (
                  <div className="mt-2 ml-9 text-[12px] text-muted leading-relaxed">
                    {q.wrongReasons[i]}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Reveal explanation — V2 questions get a rich multi-section panel,
          legacy questions keep the original simple "Why" block. */}
      {revealed && q.why && (
        <motion.div
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-electric/30 bg-electric/5 overflow-hidden"
        >
          {/* Correct-answer block — always shown */}
          <div className="p-3.5 border-b border-electric/20">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-success mb-1 flex items-center gap-1.5">
              <Check size={11} />
              Why {String.fromCharCode(65 + (Array.isArray(q.answer) ? q.answer[0] : q.answer))} is correct
            </div>
            <p className="text-sm leading-relaxed">{q.why}</p>
          </div>

          {/* EX-01: per-wrong-answer reasoning block — only when wrongReasons map is populated */}
          {q.wrongReasons && Object.keys(q.wrongReasons).length > 0 && (
            <div className="p-3.5 border-b border-electric/20 space-y-2 bg-[var(--card-2)]/30">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-danger mb-1 flex items-center gap-1.5">
                <XCircle size={11} />
                Why the other options are wrong
              </div>
              {q.options.map((opt, i) => {
                const reason = q.wrongReasons?.[i];
                if (!reason) return null;
                if (isCorrect(i)) return null;
                return (
                  <div key={i} className="text-sm leading-relaxed flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded bg-danger/15 text-danger text-[10px] font-extrabold grid place-items-center">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span><strong className="text-danger">Not {String.fromCharCode(65 + i)}:</strong> {reason}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* EX-01: concept + docs link */}
          {(q.concept || q.docs) && (
            <div className="p-3.5 bg-[var(--card-2)]/20 flex flex-wrap items-start gap-3">
              {q.concept && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1 flex items-center gap-1.5">
                    <Lightbulb size={11} />
                    Concept tested
                  </div>
                  <p className="text-sm leading-relaxed">{q.concept}</p>
                </div>
              )}
              {q.docs && (
                <a
                  href={q.docs} target="_blank" rel="noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-aws-orange/15 text-aws-orange hover:bg-aws-orange/25 border border-aws-orange/30 text-[11px] font-bold"
                >
                  <BookOpen size={12} /> AWS Docs <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
