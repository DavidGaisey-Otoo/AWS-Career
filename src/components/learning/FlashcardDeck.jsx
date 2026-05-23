import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, RotateCcw, Shuffle, Sparkles, Target, Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLearning } from '../../context/LearningContext.jsx';
import { cn } from '../../lib/utils.js';

/**
 * 3D-flip flashcard deck with spaced repetition.
 *
 * Keyboard:
 *   space  → flip
 *   ←/→    → prev / next
 *   1 2 3  → mark Known / Learning / Hard
 *   s      → shuffle
 *
 * Spaced repetition (lightweight): "Hard" cards are surfaced 4× as often
 * as "Known". The deck order is computed from current statuses.
 */
export function FlashcardDeck({ topicId, cards }) {
  const { getTopicState, setFlashcardStatus } = useLearning();
  const ts = getTopicState(topicId);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [shuffled, setShuffled] = useState(false);

  // Build the working order based on spaced repetition.
  const ordered = useMemo(() => {
    const withWeight = cards.map((c) => {
      const status = ts.flashcardStatus[c.id];
      // Higher weight => more frequent; Known = 1, Learning = 2, Hard = 4, unrated = 3.
      const weight = status === 'known' ? 1 : status === 'learning' ? 2 : status === 'hard' ? 4 : 3;
      return { ...c, weight };
    });
    // Stable sort by weight desc, tie-break original order
    const seen = withWeight.map((c, i) => ({ ...c, origIndex: i }));
    seen.sort((a, b) => b.weight - a.weight || a.origIndex - b.origIndex);
    if (shuffled) {
      // Deterministic shuffle within the same seed
      const rand = mulberry32(shuffleSeed);
      for (let i = seen.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [seen[i], seen[j]] = [seen[j], seen[i]];
      }
    }
    return seen;
  }, [cards, ts.flashcardStatus, shuffled, shuffleSeed]);

  // Clamp index when ordered changes
  useEffect(() => {
    if (index >= ordered.length) setIndex(0);
  }, [ordered.length, index]);

  const card = ordered[index];

  const next = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i + 1) % ordered.length);
  }, [ordered.length]);

  const prev = useCallback(() => {
    setFlipped(false);
    setIndex((i) => (i - 1 + ordered.length) % ordered.length);
  }, [ordered.length]);

  const mark = useCallback((status) => {
    if (!card) return;
    setFlashcardStatus(topicId, card.id, status);
    // Brief reveal of back if not flipped yet so user sees what they marked
    setTimeout(() => next(), 220);
  }, [card, setFlashcardStatus, topicId, next]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      // ignore when typing in inputs
      const tag = (e.target?.tagName || '').toUpperCase();
      if (['INPUT', 'TEXTAREA'].includes(tag)) return;
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); }
      else if (e.key === '1') mark('known');
      else if (e.key === '2') mark('learning');
      else if (e.key === '3') mark('hard');
      else if (e.key.toLowerCase() === 's') { setShuffleSeed(Date.now()); setShuffled(true); setIndex(0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, mark]);

  // Stats
  const knownCount = Object.values(ts.flashcardStatus).filter((v) => v === 'known').length;
  const learningCount = Object.values(ts.flashcardStatus).filter((v) => v === 'learning').length;
  const hardCount = Object.values(ts.flashcardStatus).filter((v) => v === 'hard').length;

  if (!card) {
    return <div className="surface rounded-2xl p-8 text-center text-sm text-muted">No flashcards yet for this topic.</div>;
  }

  return (
    <div className="space-y-4">
      {/* top stats */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted">
          Card <span className="text-aws-orange">{index + 1}</span>/{ordered.length}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="chip bg-success/10 text-success border border-success/30">
            <Sparkles size={10} /> {knownCount} known
          </span>
          <span className="chip bg-warning/10 text-warning border border-warning/30">
            <Target size={10} /> {learningCount} learning
          </span>
          <span className="chip bg-danger/10 text-danger border border-danger/30">
            <Zap size={10} /> {hardCount} hard
          </span>
        </div>
      </div>

      {/* deck */}
      <div className="relative" style={{ perspective: 1200 }}>
        <div
          className="relative w-full select-none cursor-pointer"
          style={{ aspectRatio: '16/9', maxHeight: 360 }}
          onClick={() => setFlipped((f) => !f)}
          role="button"
          aria-label="Flip card"
        >
          <motion.div
            className="absolute inset-0"
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <CardFace label="Question" colorClass="bg-gradient-to-br from-aws-orange/15 to-electric/5">
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-center">
                {card.front}
              </div>
              <div className="text-[11px] text-muted mt-3">Click or press space to flip</div>
            </CardFace>
            <CardFace
              label="Answer"
              colorClass="bg-gradient-to-br from-electric/20 to-aws-orange/5"
              back
            >
              <div className="text-base sm:text-lg leading-relaxed">{card.back}</div>
            </CardFace>
          </motion.div>
        </div>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => mark('known')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold bg-success/15 text-success border border-success/30 hover:bg-success/25 transition focus-ring"
        >
          <Sparkles size={14} /> Known <kbd className="text-[10px] opacity-70">1</kbd>
        </button>
        <button
          onClick={() => mark('learning')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold bg-warning/15 text-warning border border-warning/30 hover:bg-warning/25 transition focus-ring"
        >
          <Target size={14} /> Learning <kbd className="text-[10px] opacity-70">2</kbd>
        </button>
        <button
          onClick={() => mark('hard')}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25 transition focus-ring"
        >
          <Zap size={14} /> Hard <kbd className="text-[10px] opacity-70">3</kbd>
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button onClick={prev} className="btn btn-ghost !px-3"><ChevronLeft size={14} /> Prev</button>
        <button
          onClick={() => { setShuffleSeed(Date.now()); setShuffled(true); setIndex(0); }}
          className="btn btn-ghost !px-3"
        >
          <Shuffle size={14} /> Shuffle
        </button>
        <button
          onClick={() => { setShuffled(false); setShuffleSeed(0); setIndex(0); }}
          className="btn btn-ghost !px-3"
        >
          <RotateCcw size={14} /> Reset
        </button>
        <button onClick={next} className="btn btn-ghost !px-3">Next <ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function CardFace({ label, children, colorClass, back }) {
  return (
    <div
      className={cn(
        'absolute inset-0 surface rounded-3xl flex flex-col items-center justify-center p-8 gradient-border overflow-hidden',
        colorClass
      )}
      style={{ backfaceVisibility: 'hidden', transform: back ? 'rotateY(180deg)' : undefined }}
    >
      <div className="absolute top-3 left-4 text-[10px] font-extrabold uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="text-center w-full max-w-xl">
        {children}
      </div>
    </div>
  );
}

// Deterministic shuffle PRNG.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
