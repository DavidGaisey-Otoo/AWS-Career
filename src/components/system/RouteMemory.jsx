/**
 * RouteMemory.jsx — invisible component that:
 *   1. Records the user's current pathname + search + hash on every change
 *   2. Records the scroll position per route
 *   3. On mount (refresh / fresh tab), restores the scroll position for
 *      the route the user lands on (the URL itself is preserved by
 *      BrowserRouter natively)
 *
 * Mounted once in AppShell. Has no UI.
 *
 * Storage shape:
 *   localStorage[`awscl-pro::v1::route-memory`] = {
 *     lastPath:   '/job-analyzer',
 *     lastAt:     1716540000000,
 *     scroll: {
 *       '/job-analyzer': 420,
 *       '/exam/saa-c03':  1200,
 *       ...
 *     }
 *   }
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { STORAGE_KEY } from '../../lib/constants.js';

const KEY = `${STORAGE_KEY}::route-memory`;
const MAX_TRACKED_ROUTES = 50;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { lastPath: '/', lastAt: 0, scroll: {} };
  } catch {
    return { lastPath: '/', lastAt: 0, scroll: {} };
  }
}

function write(state) {
  try {
    // Cap the scroll map so localStorage doesn\'t bloat
    const entries = Object.entries(state.scroll || {});
    if (entries.length > MAX_TRACKED_ROUTES) {
      state.scroll = Object.fromEntries(entries.slice(-MAX_TRACKED_ROUTES));
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function RouteMemory() {
  const loc = useLocation();
  const fullPath = loc.pathname + loc.search + loc.hash;
  const restoredRef = useRef(false);

  // Save the active route every time it changes
  useEffect(() => {
    const cur = read();
    cur.lastPath = fullPath;
    cur.lastAt = Date.now();
    write(cur);
  }, [fullPath]);

  // Save the scroll position when the user scrolls (throttled)
  useEffect(() => {
    let timer = null;
    function onScroll() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const cur = read();
        cur.scroll = cur.scroll || {};
        cur.scroll[fullPath] = window.scrollY;
        write(cur);
      }, 200);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [fullPath]);

  // On first mount for this URL, restore scroll position
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const cur = read();
    const y = cur.scroll?.[fullPath];
    if (typeof y === 'number' && y > 50) {
      // Defer so lazy-loaded content has a chance to render
      const restore = () => window.scrollTo({ top: y, left: 0, behavior: 'auto' });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setTimeout(restore, 100));
      });
    }
  }, [fullPath]);

  return null;
}

/**
 * Helper for places (like the initial loading splash) that need to know
 * where the user was last.
 */
export function lastVisitedPath() {
  return read().lastPath || '/';
}
