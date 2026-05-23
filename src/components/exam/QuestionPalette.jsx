import { cn } from '../../lib/utils.js';

/**
 * Sidebar grid showing answer status per question.
 *  - blank circle  → not answered
 *  - filled        → answered
 *  - flag corner   → flagged for review
 *  - outline orange → current
 *
 * Click a cell to jump to that question.
 */
export function QuestionPalette({
  total, currentIndex, isAnswered, isFlagged, onJump, columns = 5,
}) {
  const items = Array.from({ length: total });
  return (
    <div className="surface rounded-2xl p-3">
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2 px-1">
        Question navigator
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((_, i) => {
          const answered = isAnswered(i);
          const flagged = isFlagged(i);
          const active = i === currentIndex;
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={cn(
                'relative aspect-square rounded-md text-[11px] font-extrabold tabular-nums transition border-2 focus-ring',
                active ? 'border-aws-orange ring-2 ring-aws-orange/30'
                       : 'border-transparent',
                answered
                  ? 'bg-aws-orange/15 text-aws-orange'
                  : 'bg-[var(--card-2)] text-muted hover:text-current',
              )}
            >
              {i + 1}
              {flagged && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-aws-orange shadow-glow-orange" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <Legend swatch="bg-aws-orange/15" border="border-transparent">Answered</Legend>
        <Legend swatch="bg-[var(--card-2)]" border="border-transparent">Skipped</Legend>
        <Legend dot>Flagged</Legend>
      </div>
    </div>
  );
}

function Legend({ swatch, dot, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      {dot ? (
        <span className="w-2 h-2 rounded-full bg-aws-orange" />
      ) : (
        <span className={cn('inline-block w-3 h-3 rounded', swatch)} />
      )}
      {children}
    </span>
  );
}
