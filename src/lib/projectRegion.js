/**
 * projectRegion.js — AD-01 per-project region selection storage.
 *
 * Each walkthrough / project can have its own pinned region. This is
 * what generated scripts (CLI / CFN / TF) and the cost estimator use.
 *
 * Storage key:
 *   awscl-pro::v1::project-region
 *   { byProject: { [walkthroughId]: { region, source, audience, confidence, ts } } }
 *
 * source values:
 *   'suggested'  — accepted the engine's suggestion
 *   'user'       — manual override
 *   'detected'   — inferred from brief at generation time
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'awscl-pro::v1::project-region';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byProject: {} };
    const p = JSON.parse(raw);
    return p && typeof p === 'object' && p.byProject ? p : { byProject: {} };
  } catch { return { byProject: {} }; }
}

function writeAll(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
  } catch { /* */ }
}

export function getProjectRegion(projectId) {
  const all = readAll();
  return all.byProject[projectId] || null;
}

export function setProjectRegion(projectId, { region, source = 'user', audience = null, confidence = null }) {
  const all = readAll();
  all.byProject[projectId] = {
    region,
    source,
    audience,
    confidence,
    ts: new Date().toISOString(),
  };
  writeAll(all);
  return all.byProject[projectId];
}

export function clearProjectRegion(projectId) {
  const all = readAll();
  delete all.byProject[projectId];
  writeAll(all);
}

/**
 * Reactive hook — re-reads when storage changes.
 */
export function useProjectRegion(projectId) {
  const [state, setState] = useState(() => getProjectRegion(projectId));
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setState(getProjectRegion(projectId));
    }
    window.addEventListener('storage', onStorage);
    // Reset when projectId changes
    setState(getProjectRegion(projectId));
    return () => window.removeEventListener('storage', onStorage);
  }, [projectId]);
  return state;
}
