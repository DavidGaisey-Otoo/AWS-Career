/**
 * Data left behind by the pages removed in November 2026.
 *
 * The app was cut down to freelance work: the study, exam, roadmap,
 * gamification, community, wellness and UK-planning pages were deleted.
 * Their saved data is still in the browser, taking a share of the ~5MB
 * that every feature has to fit into. Nothing reads it any more.
 *
 * Nothing here deletes on its own. Settings → Data management lists
 * what it found and removes it only when the user asks.
 */
import { STORAGE_KEY } from './constants.js';

/** Exact keys (after the `awscl-pro::v1::` prefix) that only removed pages used. */
export const RETIRED_KEYS = Object.freeze([
  'roadmap',
  'learning',
  'exam',
  'exam::weakness',
  'exam::smartrev',
  'flashcards',
  'saa-progress',
  'studyplan-progress',
  'study-notes',
  'study-scheduler',
  'gamification',
  'community',
  'wellness',
  'uk',
  'aws-news-cache',
  'resource-stars',
  'getting-started-dismissed',
]);

/**
 * Key prefixes that only removed code wrote. `session::` was the
 * mid-exam autosave (`session::exam/saa-c03/standard::answers` and so
 * on). Note the double colon: `session-log` is a live key and must not
 * match.
 */
export const RETIRED_PREFIXES = Object.freeze(['session::']);

/** Is this full localStorage key one that only removed pages used? */
export function isRetiredKey(fullKey) {
  const head = `${STORAGE_KEY}::`;
  if (typeof fullKey !== 'string' || !fullKey.startsWith(head)) return false;
  const rest = fullKey.slice(head.length);
  return RETIRED_KEYS.includes(rest) || RETIRED_PREFIXES.some((p) => rest.startsWith(p));
}

/**
 * Which of the stored keys are leftovers, and how much room they take.
 * `storage` is anything shaped like localStorage.
 */
export function findRetiredData(storage) {
  const keys = [];
  let bytes = 0;
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!isRetiredKey(k)) continue;
    keys.push(k);
    bytes += k.length + (storage.getItem(k) || '').length;
  }
  return { keys, bytes };
}

/** Remove the leftovers. Returns how many keys went and how many bytes they held. */
export function removeRetiredData(storage) {
  const found = findRetiredData(storage);
  for (const k of found.keys) storage.removeItem(k);
  return { removed: found.keys.length, bytes: found.bytes };
}
