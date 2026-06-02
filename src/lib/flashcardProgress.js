/**
 * flashcardProgress.js — EX-19 Flashcards persistence.
 *
 * Tracks which cards the user has marked "Know it" vs "Still learning"
 * across all categories. localStorage-backed.
 */

const STORAGE_KEY = 'awscl-pro::v1::flashcards';

function emptyState() {
  return { mastered: [], learning: [] };
}

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return parsed && Array.isArray(parsed.mastered) && Array.isArray(parsed.learning)
      ? parsed
      : emptyState();
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export function getProgress() {
  const state = readState();
  return {
    mastered: new Set(state.mastered),
    learning: new Set(state.learning),
  };
}

export function markMastered(cardId) {
  const state = readState();
  // Remove from learning if present
  state.learning = state.learning.filter((id) => id !== cardId);
  // Add to mastered if not already
  if (!state.mastered.includes(cardId)) {
    state.mastered.push(cardId);
  }
  writeState(state);
}

export function markLearning(cardId) {
  const state = readState();
  // Remove from mastered if present
  state.mastered = state.mastered.filter((id) => id !== cardId);
  // Add to learning if not already
  if (!state.learning.includes(cardId)) {
    state.learning.push(cardId);
  }
  writeState(state);
}

export function resetCategory(categoryId, allCards) {
  const state = readState();
  const idsInCategory = new Set(allCards.filter((c) => c.category === categoryId).map((c) => c.id));
  state.mastered = state.mastered.filter((id) => !idsInCategory.has(id));
  state.learning = state.learning.filter((id) => !idsInCategory.has(id));
  writeState(state);
}

export function resetAll() {
  writeState(emptyState());
}

/**
 * Summary per category: { mastered, learning, untouched, total }.
 */
export function categoryProgress(categoryId, allCards) {
  const { mastered, learning } = getProgress();
  const cards = allCards.filter((c) => c.category === categoryId);
  let m = 0, l = 0;
  for (const c of cards) {
    if (mastered.has(c.id)) m++;
    else if (learning.has(c.id)) l++;
  }
  return {
    mastered: m,
    learning: l,
    untouched: cards.length - m - l,
    total: cards.length,
  };
}
