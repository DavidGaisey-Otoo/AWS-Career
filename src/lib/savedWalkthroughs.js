/**
 * savedWalkthroughs.js — PJ-04 storage for user-generated walkthroughs.
 *
 * The Library Hub merges these with the curated DEEP_WALKTHROUGHS to give
 * the user one unified library.
 *
 * Shape per saved walkthrough (same structure as DEEP_WALKTHROUGHS entries
 * with extras for tracking origin):
 *   {
 *     id, title, blurb, services[], difficulty, estMinutes, prereqs[], steps[],
 *     source: 'project' | 'freelance' | 'manual',   // where it came from
 *     createdAt: ISO,
 *     archived: boolean,
 *   }
 *
 * Storage key:
 *   awscl-pro::v1::saved-walkthroughs
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'awscl-pro::v1::saved-walkthroughs';
const VIEW_KEY    = 'awscl-pro::v1::walkthroughs-view';

// ════════════════════════════════════════════════════════════════════
// Storage
// ════════════════════════════════════════════════════════════════════

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    // Notify same-tab listeners
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch { /* */ }
}

export function listSavedWalkthroughs() {
  return readAll();
}

export function getSavedWalkthrough(id) {
  return readAll().find((w) => w.id === id) || null;
}

export function saveWalkthrough(walkthrough) {
  const all = readAll();
  const idx = all.findIndex((w) => w.id === walkthrough.id);
  const enriched = {
    archived: false,
    source: 'manual',
    createdAt: new Date().toISOString(),
    ...walkthrough,
  };
  if (idx >= 0) all[idx] = { ...all[idx], ...enriched };
  else all.push(enriched);
  writeAll(all);
  return enriched;
}

export function deleteSavedWalkthrough(id) {
  const all = readAll().filter((w) => w.id !== id);
  writeAll(all);
}

export function archiveSavedWalkthrough(id, archived = true) {
  const all = readAll();
  const idx = all.findIndex((w) => w.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], archived };
  writeAll(all);
  return all[idx];
}

// ════════════════════════════════════════════════════════════════════
// Reactive hook — re-reads on storage events
// ════════════════════════════════════════════════════════════════════

export function useSavedWalkthroughs() {
  const [list, setList] = useState(readAll);
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setList(readAll());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return list;
}

// ════════════════════════════════════════════════════════════════════
// View mode persistence
// ════════════════════════════════════════════════════════════════════

export function getStoredView() {
  try { return localStorage.getItem(VIEW_KEY) || 'workspace'; }
  catch { return 'workspace'; }
}

export function setStoredView(view) {
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* */ }
}
