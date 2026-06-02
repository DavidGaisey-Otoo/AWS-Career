/**
 * Flashcards.jsx — EX-19 AWS Flashcards mode.
 *
 * Flow:
 *   1) Pick a category (Compute / Storage / Database / Networking /
 *      Security / Serverless / ML).
 *   2) Cards shuffle into a queue. First card shown.
 *   3) Tap card to flip front → back.
 *   4) Rate "Know it ✓" or "Still learning 🔄".
 *      - "Know it" → marks mastered, removes from queue
 *      - "Still learning" → marks learning, pushes back to end of queue
 *   5) Done when queue empty.
 *
 * Pure-CSS 3D flip animation. Mobile-friendly large tap targets.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, RotateCcw, RefreshCw, BookOpen, Shuffle,
} from 'lucide-react';
import { FLASHCARDS, FLASHCARD_CATEGORIES, cardsByCategory } from '../data/flashcardDeck.js';
import {
  getProgress, markMastered, markLearning, resetCategory, categoryProgress, resetAll,
} from '../lib/flashcardProgress.js';
import { cn } from '../lib/utils.js';

export default function Flashcards() {
  const { categoryId } = useParams();
  const nav = useNavigate();

  // Category landing screen
  if (!categoryId) {
    return <CategoryPicker />;
  }

  const category = FLASHCARD_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) {
    return (
      <div className="surface rounded-3xl p-12 text-center">
        <h2 className="text-xl font-bold">Category not found</h2>
        <Link to="/flashcards" className="mt-4 inline-flex items-center gap-1 text-aws-orange font-semibold hover:underline">
          <ArrowLeft size={14} /> Back to Flashcards
        </Link>
      </div>
    );
  }

  return <CategorySession category={category} onExit={() => nav('/flashcards')} />;
}

// ════════════════════════════════════════════════════════════════════
// Category picker — landing screen
// ════════════════════════════════════════════════════════════════════
function CategoryPicker() {
  const [tick, setTick] = useState(0);
  // Recompute progress when localStorage may have changed
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const [resetConfirm, setResetConfirm] = useState(false);
  function handleResetAll() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    resetAll();
    setResetConfirm(false);
    setTick((t) => t + 1);
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <FlipStyles />
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            AWS Quick Recall
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            🃏 Flashcards
          </h1>
          <p className="text-sm opacity-80 mt-1.5">
            70+ AWS services across 7 categories. Tap to flip. Rate each card —
            "still learning" ones come back, "know it" ones graduate.
          </p>
        </div>
        <button
          onClick={handleResetAll}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition',
            resetConfirm
              ? 'border-danger bg-danger/15 text-danger'
              : 'border-token text-muted hover:text-danger hover:border-danger/40'
          )}
        >
          <RotateCcw size={12} />
          {resetConfirm ? 'Confirm full reset' : 'Reset all progress'}
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FLASHCARD_CATEGORIES.map((cat) => {
          const p = categoryProgress(cat.id, FLASHCARDS);
          const pct = p.total === 0 ? 0 : Math.round((p.mastered / p.total) * 100);
          return (
            <Link
              key={cat.id}
              to={`/flashcards/${cat.id}`}
              className="surface rounded-2xl p-5 hover:border-aws-orange/40 border border-transparent transition group block"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-4xl">{cat.icon}</div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold tabular-nums text-aws-orange">
                    {p.mastered}/{p.total}
                  </div>
                  <div className="text-[10px] opacity-70 font-bold uppercase tracking-wide">
                    mastered
                  </div>
                </div>
              </div>
              <h3 className="text-lg font-extrabold mb-2 group-hover:text-aws-orange transition">{cat.label}</h3>
              <div className="w-full h-2 rounded-full bg-[var(--card-2)] overflow-hidden mb-2">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct >= 80 ? 'var(--success, #16a34a)'
                      : pct >= 50 ? 'var(--warning, #FF9900)'
                      : pct > 0 ? 'var(--aws-orange, #FF9900)'
                      : 'transparent',
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                {p.mastered > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">✓ {p.mastered}</span>
                )}
                {p.learning > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning font-bold">🔄 {p.learning}</span>
                )}
                {p.untouched > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--card-2)] opacity-70 font-bold">— {p.untouched}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Session — go through cards in a category
// ════════════════════════════════════════════════════════════════════
function CategorySession({ category, onExit }) {
  const allCards = useMemo(() => cardsByCategory(category.id), [category.id]);

  // Build initial queue: untouched + learning first; mastered later (review)
  const buildInitialQueue = () => {
    const { mastered, learning } = getProgress();
    const unseen = allCards.filter((c) => !mastered.has(c.id) && !learning.has(c.id));
    const learningCards = allCards.filter((c) => learning.has(c.id));
    const masteredCards = allCards.filter((c) => mastered.has(c.id));
    // Shuffle each subset
    return [...shuffle(unseen), ...shuffle(learningCards), ...shuffle(masteredCards)];
  };

  const [queue, setQueue] = useState(buildInitialQueue);
  const [flipped, setFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ know: 0, still: 0 });
  const [resetConfirm, setResetConfirm] = useState(false);

  const current = queue[0];
  const remaining = queue.length;

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped) {
        if (e.key === '1' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          handleKnowIt();
        }
        if (e.key === '2' || e.key.toLowerCase() === 'l') {
          e.preventDefault();
          handleStillLearning();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, queue]);

  function nextCard(updatedQueue) {
    setFlipped(false);
    setQueue(updatedQueue);
  }

  function handleKnowIt() {
    if (!current) return;
    markMastered(current.id);
    setSessionStats((s) => ({ ...s, know: s.know + 1 }));
    nextCard(queue.slice(1));
  }

  function handleStillLearning() {
    if (!current) return;
    markLearning(current.id);
    setSessionStats((s) => ({ ...s, still: s.still + 1 }));
    // Push to back of queue
    nextCard([...queue.slice(1), current]);
  }

  function handleShuffle() {
    setQueue(shuffle(queue));
    setFlipped(false);
  }

  function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
      return;
    }
    resetCategory(category.id, FLASHCARDS);
    setResetConfirm(false);
    setSessionStats({ know: 0, still: 0 });
    setQueue(buildInitialQueue());
    setFlipped(false);
  }

  const progress = useMemo(() => categoryProgress(category.id, FLASHCARDS), [category.id, sessionStats]);

  // Empty state
  if (!current) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        <FlipStyles />
        <button onClick={onExit} className="text-sm opacity-70 hover:opacity-100 inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> All categories
        </button>
        <div className="surface rounded-3xl p-8 text-center gradient-border">
          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-2xl font-extrabold mb-2">Session complete!</h2>
          <p className="opacity-80 text-sm mb-4">
            You rated {sessionStats.know + sessionStats.still} cards this session.
            ({sessionStats.know} known · {sessionStats.still} still learning)
          </p>
          <div className="text-sm opacity-80 mb-5">
            Overall mastery in {category.label}: <strong className="text-aws-orange">{progress.mastered}/{progress.total}</strong>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button onClick={() => { setQueue(buildInitialQueue()); setSessionStats({ know: 0, still: 0 }); }} className="btn btn-primary">
              <RefreshCw size={14} /> Go through all again
            </button>
            <button onClick={onExit} className="btn btn-ghost">All categories</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <FlipStyles />

      {/* Header — category + progress */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button onClick={onExit} className="text-sm opacity-70 hover:opacity-100 inline-flex items-center gap-1.5">
          <ArrowLeft size={14} /> All categories
        </button>
        <div className="text-[11px] font-bold text-right">
          <div className="opacity-80">
            <span className="text-aws-orange font-extrabold tabular-nums">{progress.mastered}</span>
            <span className="opacity-60"> / {progress.total} mastered in {category.label}</span>
          </div>
          <div className="opacity-60">
            {remaining} card{remaining === 1 ? '' : 's'} left in this session
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
        <div
          className="h-full bg-aws-orange transition-all"
          style={{ width: `${(progress.mastered / progress.total) * 100}%` }}
        />
      </div>

      {/* The flashcard */}
      <div className="perspective-1200 select-none">
        <div
          className={cn(
            'relative w-full h-[420px] sm:h-[460px] cursor-pointer transition-transform duration-700 preserve-3d',
            flipped && 'rotate-y-180',
          )}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          tabIndex={0}
        >
          {/* FRONT */}
          <div className="absolute inset-0 backface-hidden surface rounded-3xl p-6 sm:p-8 gradient-border flex flex-col items-center justify-center text-center">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
              {category.icon} {category.label} · Tap to flip
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3">
              {current.front}
            </h2>
            <div className="text-[11px] opacity-50 mt-auto">
              <kbd>Space</kbd> to flip
            </div>
          </div>

          {/* BACK */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 surface rounded-3xl p-5 sm:p-6 gradient-border flex flex-col">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">
              {current.front}
            </div>
            <h3 className="text-base font-extrabold mb-2.5 leading-snug">{current.what}</h3>

            <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange opacity-80 mt-1">When to use</div>
            <p className="text-[13px] opacity-90 leading-snug mb-2">{current.when}</p>

            {current.keyFacts?.length > 0 && (
              <>
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange opacity-80 mt-1">Key facts</div>
                <ul className="text-[12.5px] opacity-90 leading-snug space-y-0.5 mb-2">
                  {current.keyFacts.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-success">▸</span><span>{f}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {current.analogy && (
              <div className="mt-auto pt-2 border-t border-token">
                <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange opacity-80">Analogy</div>
                <p className="text-[12.5px] italic opacity-90 leading-snug">{current.analogy}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rating buttons — only enabled after flip */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleStillLearning}
          disabled={!flipped}
          className={cn(
            'rounded-2xl border-2 px-4 py-5 font-extrabold text-base transition flex flex-col items-center gap-1',
            flipped
              ? 'border-warning bg-warning/10 hover:bg-warning/20 text-warning'
              : 'border-token bg-[var(--card-2)]/30 text-muted opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-3xl">🔄</span>
          <span>Still learning</span>
          <span className="text-[10.5px] opacity-70 font-bold">comes back</span>
        </button>
        <button
          onClick={handleKnowIt}
          disabled={!flipped}
          className={cn(
            'rounded-2xl border-2 px-4 py-5 font-extrabold text-base transition flex flex-col items-center gap-1',
            flipped
              ? 'border-success bg-success/10 hover:bg-success/20 text-success'
              : 'border-token bg-[var(--card-2)]/30 text-muted opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-3xl">✓</span>
          <span>Know it</span>
          <span className="text-[10.5px] opacity-70 font-bold">mastered</span>
        </button>
      </div>

      {/* Tools row */}
      <div className="flex items-center justify-between text-xs opacity-70">
        <button onClick={handleShuffle} className="inline-flex items-center gap-1 hover:text-aws-orange">
          <Shuffle size={12} /> Shuffle remaining
        </button>
        <button
          onClick={handleReset}
          className={cn(
            'inline-flex items-center gap-1',
            resetConfirm ? 'text-danger font-bold' : 'hover:text-danger'
          )}
        >
          <RotateCcw size={12} />
          {resetConfirm ? 'Click again to confirm' : `Reset ${category.label} progress`}
        </button>
      </div>

      <div className="text-[10.5px] opacity-50 italic text-center">
        Tap card to flip · <kbd>Space</kbd> flip · <kbd>K</kbd> know · <kbd>L</kbd> learning
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// CSS for 3D flip animation (injected once per page render)
// ════════════════════════════════════════════════════════════════════
function FlipStyles() {
  return (
    <style>{`
      .perspective-1200 { perspective: 1200px; }
      .preserve-3d { transform-style: preserve-3d; }
      .backface-hidden {
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .rotate-y-180 { transform: rotateY(180deg); }
      kbd {
        display: inline-block;
        padding: 0px 4px;
        background: var(--card-2);
        border: 1px solid var(--border);
        border-radius: 4px;
        font-size: 9px;
        font-family: monospace;
        font-weight: bold;
      }
    `}</style>
  );
}

// ════════════════════════════════════════════════════════════════════
// Utilities
// ════════════════════════════════════════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
