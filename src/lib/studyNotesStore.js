/**
 * studyNotesStore.js — NT-01 storage for auto-generated study notes.
 *
 * Storage: localStorage::awscl-pro::v1::study-notes
 * Shape:   array of Note objects (newest first), never overwritten —
 *          each generation creates a fresh entry with a unique id.
 *
 * Note shape:
 *   {
 *     id, createdAt,
 *     title,                 // "Static site on S3 + CloudFront"
 *     source,                // 'walkthrough' | 'lesson' | 'project' | 'manual'
 *     sourceId,              // walkthrough id / topic slug / project id (optional)
 *     summary,               // 1-line for the library list
 *     body: {
 *       whatYouBuilt: string,
 *       services: [{ id, label, what, why }],
 *       keyConcepts: string[],
 *       remembers: string[],   // exactly 3
 *       mistakes: string[],    // exactly 2
 *     },
 *     tags: string[],          // service ids for filtering
 *     metadata: { region?, level?, ... }
 *   }
 */

import { useEffect, useState, useCallback } from 'react';
import { STORAGE_KEY } from './constants.js';

const KEY = `${STORAGE_KEY}::study-notes`;
const EVT = 'study-notes:change';

// ════════════════════════════════════════════════════════════════════
// Storage primitives
// ════════════════════════════════════════════════════════════════════
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

// ════════════════════════════════════════════════════════════════════
// Mutations
// ════════════════════════════════════════════════════════════════════

/**
 * Append a new note. NEVER overwrites — even if a note for the same
 * source already exists, this creates a fresh entry.
 */
export function saveNote(note) {
  const list = read();
  const entry = {
    id: 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    ...note,
  };
  list.unshift(entry);
  write(list);
  return entry;
}

export function deleteNote(id) {
  const list = read().filter((n) => n.id !== id);
  write(list);
}

export function getNote(id) {
  return read().find((n) => n.id === id) || null;
}

export function clearAll() { write([]); }

// ════════════════════════════════════════════════════════════════════
// React hook
// ════════════════════════════════════════════════════════════════════
export function useStudyNotes() {
  const [list, setList] = useState(() => read());
  const refresh = useCallback(() => setList(read()), []);
  useEffect(() => {
    const onChange = () => refresh();
    window.addEventListener('storage', onChange);
    window.addEventListener(EVT, onChange);
    return () => {
      window.removeEventListener('storage', onChange);
      window.removeEventListener(EVT, onChange);
    };
  }, [refresh]);
  return list;
}

// ════════════════════════════════════════════════════════════════════
// Search & filter
// ════════════════════════════════════════════════════════════════════
export function searchNotes(list, query) {
  if (!query?.trim()) return list;
  const q = query.toLowerCase();
  return list.filter((n) => {
    if (n.title?.toLowerCase().includes(q)) return true;
    if (n.summary?.toLowerCase().includes(q)) return true;
    if ((n.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
    if (n.body?.whatYouBuilt?.toLowerCase().includes(q)) return true;
    if ((n.body?.services || []).some((s) =>
      s.label?.toLowerCase().includes(q) || s.id?.toLowerCase().includes(q))) return true;
    if ((n.body?.keyConcepts || []).some((c) => c.toLowerCase().includes(q))) return true;
    return false;
  });
}

export function filterByTag(list, tag) {
  if (!tag) return list;
  return list.filter((n) => (n.tags || []).includes(tag));
}

export function getAllTags(list) {
  const set = new Set();
  for (const n of list) {
    for (const t of (n.tags || [])) set.add(t);
  }
  return Array.from(set).sort();
}

// ════════════════════════════════════════════════════════════════════
// Export helpers
// ════════════════════════════════════════════════════════════════════

export function noteToMarkdown(note) {
  const lines = [];
  lines.push(`# ${note.title}`);
  lines.push('');
  lines.push(`*${formatLongDate(note.createdAt)} · ${capitalise(note.source)}*`);
  lines.push('');
  lines.push(`## What you built / learned`);
  lines.push('');
  lines.push(note.body.whatYouBuilt || '_No description provided._');
  lines.push('');

  if (note.body.services?.length) {
    lines.push(`## AWS services used`);
    lines.push('');
    for (const s of note.body.services) {
      lines.push(`### ${s.label}${s.id ? ` (\`${s.id}\`)` : ''}`);
      if (s.what) { lines.push(`**What it is:** ${s.what}`); lines.push(''); }
      if (s.why)  { lines.push(`**Why we used it:** ${s.why}`); lines.push(''); }
    }
  }

  if (note.body.keyConcepts?.length) {
    lines.push(`## Key concepts covered`);
    lines.push('');
    for (const c of note.body.keyConcepts) lines.push(`- ${c}`);
    lines.push('');
  }

  if (note.body.remembers?.length) {
    lines.push(`## 3 things to remember`);
    lines.push('');
    note.body.remembers.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
    lines.push('');
  }

  if (note.body.mistakes?.length) {
    lines.push(`## 2 common mistakes to avoid`);
    lines.push('');
    note.body.mistakes.forEach((m) => lines.push(`- ⚠️ ${m}`));
    lines.push('');
  }

  if (note.tags?.length) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`**Tags:** ${note.tags.join(' · ')}`);
  }

  return lines.join('\n');
}

export function noteToPlainText(note) {
  // Strip markdown markers for cleaner clipboard paste
  return noteToMarkdown(note)
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function formatLongDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function capitalise(s) {
  return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
}
