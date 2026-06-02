/**
 * searchIndex.js — universal index for the command palette.
 *
 * Pulls EVERY searchable thing into one ranked list:
 *   • Pages (legacy NAV_ITEMS + 5-section SECTIONS + children)
 *   • Portfolio projects (data/projects.js)
 *   • Walkthroughs (data/walkthroughs.js)
 *   • Roadmap tasks (data/roadmap.js)
 *   • AWS services (data/stepGuide.js)
 *   • Quick actions (toggle theme, run readiness, etc.)
 *
 * Lazy-built on first search so it doesn't hit initial load.
 * Fuzzy match with a tiny ranker (no Fuse.js dependency).
 */

import { NAV_ITEMS } from './constants.js';
import { SECTIONS } from './navSections.js';
import {
  Award, BookOpen, Briefcase, Compass, FileText, Folder, GraduationCap,
  Layers, Map as MapIcon, Rocket, Search, Settings, Sparkles, Wand2,
} from 'lucide-react';

let CACHE = null;

/**
 * Build the index. Returns an array of `{ id, title, hint, kind, icon,
 * path, keywords[] }` items.
 *
 * Lazy data imports keep the initial bundle small — only paid when the
 * user opens the search palette for the first time.
 */
export async function buildIndex() {
  if (CACHE) return CACHE;

  const items = [];

  // ── 1. Legacy nav items ──
  for (const n of NAV_ITEMS) {
    items.push({
      id: `nav-${n.id}`,
      title: n.label,
      hint: `Go to ${n.label}`,
      kind: 'Page',
      icon: n.icon,
      path: n.path,
      keywords: [n.label.toLowerCase(), n.id],
    });
  }

  // ── 2. SECTIONS (5-section nav) + their children ──
  for (const sec of SECTIONS) {
    items.push({
      id: `section-${sec.id}`,
      title: sec.label,
      hint: sec.blurb || `Section: ${sec.label}`,
      kind: 'Section',
      icon: sec.icon,
      path: sec.path,
      keywords: [sec.label.toLowerCase(), sec.id, ...(sec.blurb || '').toLowerCase().split(/\s+/)],
    });
    for (const child of sec.children || []) {
      items.push({
        id: `child-${sec.id}-${child.id}`,
        title: child.label,
        hint: `In ${sec.label} → ${child.label}`,
        kind: 'Page',
        icon: child.icon,
        path: child.path,
        keywords: [child.label.toLowerCase(), child.id, sec.id],
      });
    }
  }

  // ── 3. Projects ──
  try {
    const { PROJECTS } = await import('../data/projects.js');
    for (const p of PROJECTS || []) {
      items.push({
        id: `project-${p.id}`,
        title: `Project ${p.n} · ${p.title}`,
        hint: p.tagline || p.summary?.slice(0, 100) || '',
        kind: 'Project',
        icon: Briefcase,
        path: `/portfolio/${p.id}`,
        keywords: [
          (p.title || '').toLowerCase(),
          (p.tagline || '').toLowerCase(),
          ...(p.services || []),
          ...(p.skills || []).map((s) => s.toLowerCase()),
          ...(p.certs || []).map((s) => s.toLowerCase()),
        ],
      });
    }
  } catch (e) { /* projects file may move — non-fatal */ }

  // ── 4. Walkthroughs ──
  try {
    const { WALKTHROUGHS } = await import('../data/walkthroughs.js');
    for (const w of Object.values(WALKTHROUGHS || {})) {
      items.push({
        id: `walk-${w.id}`,
        title: `Walkthrough · ${w.title}`,
        hint: w.intro?.slice(0, 100) || w.category || '',
        kind: 'Walkthrough',
        icon: Compass,
        path: `/walkthroughs/${w.id}`,
        keywords: [
          (w.title || '').toLowerCase(),
          (w.category || '').toLowerCase(),
          ...(w.steps || []).map((s) => (s.title || '').toLowerCase()).slice(0, 5),
        ],
      });
    }
  } catch (e) { /* non-fatal */ }

  // ── 5. Roadmap tasks ──
  try {
    const { ROADMAP } = await import('../data/roadmap.js');
    for (const phase of ROADMAP || []) {
      items.push({
        id: `roadmap-phase-${phase.id}`,
        title: `Roadmap phase · ${phase.title}`,
        hint: phase.blurb || '',
        kind: 'Roadmap',
        icon: MapIcon,
        path: '/roadmap',
        keywords: [(phase.title || '').toLowerCase(), phase.id],
      });
      for (const task of phase.tasks || []) {
        items.push({
          id: `roadmap-task-${task.id}`,
          title: `Roadmap task · ${task.title}`,
          hint: `${phase.title} · ${task.minutes} min`,
          kind: 'Roadmap task',
          icon: MapIcon,
          path: '/roadmap',
          keywords: [
            (task.title || '').toLowerCase(),
            (task.description || '').toLowerCase().slice(0, 200),
            phase.id,
            task.id,
          ],
        });
      }
    }
  } catch (e) { /* non-fatal */ }

  // ── 6. AWS services from stepGuide ──
  try {
    const { GUIDES } = await import('../data/stepGuide.js');
    for (const [id, g] of Object.entries(GUIDES || {})) {
      items.push({
        id: `guide-${id}`,
        title: `AWS · ${g.title || id}`,
        hint: g.tagline || g.service || '',
        kind: 'AWS service',
        icon: Sparkles,
        // Link into the roadmap (guides are tied to roadmap tasks).
        path: '/roadmap',
        keywords: [
          (g.title || '').toLowerCase(),
          (g.tagline || '').toLowerCase(),
          (g.service || '').toLowerCase(),
          id,
        ],
      });
    }
  } catch (e) { /* non-fatal */ }

  // ── 7. Quick actions ──
  items.push(
    { id: 'action-readiness', title: 'Run readiness check', hint: 'See what\'s working and what\'s missing', kind: 'Action', icon: Compass, path: '/readiness', keywords: ['readiness', 'check', 'health', 'audit', 'status'] },
    { id: 'action-deploy', title: 'Open Deploy Console', hint: 'Approve AWS deploys with strict tiers', kind: 'Action', icon: Rocket, path: '/deploy', keywords: ['deploy', 'aws', 'console', 'vault'] },
    { id: 'action-updates', title: 'See app + AWS updates', hint: 'Changelog + live AWS news', kind: 'Action', icon: Sparkles, path: '/updates', keywords: ['updates', 'changelog', 'news', 'whats new'] },
    { id: 'action-session-log', title: 'Open Session Log', hint: 'Documentation of what you did', kind: 'Action', icon: FileText, path: '/session-log', keywords: ['session', 'log', 'history', 'docs', 'pdf'] },
    { id: 'action-renew-token', title: 'Renew GitHub token', hint: 'Step-by-step PAT renewal', kind: 'Action', icon: Wand2, path: '/renew-github', keywords: ['github', 'token', 'pat', 'renew', 'expire'] },
    { id: 'action-build-anything', title: 'Idea Studio — Build anything', hint: 'Describe your project, get instant architecture + plan', kind: 'Action', icon: Wand2, path: '/idea-studio', keywords: ['idea', 'build', 'architect', 'design', 'plan', 'gig', 'job', 'project', 'ai', 'chat'] },
    { id: 'action-settings', title: 'Open Settings', hint: 'Theme, integrations, prefs', kind: 'Action', icon: Settings, path: '/settings', keywords: ['settings', 'preferences', 'github', 'theme'] },
  );

  // De-dup by `id`
  const seen = new Set();
  CACHE = items.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
  return CACHE;
}

/**
 * Score-and-rank search. Returns top N matches.
 *
 * Ranking:
 *   +20  exact title match
 *   +10  title starts with query
 *   +5   title contains query
 *   +3   any keyword exact match
 *   +1   any keyword contains query
 */
export function search(index, query, limit = 30) {
  const term = (query || '').trim().toLowerCase();
  if (!term) {
    // No query → return a sensible mix of pages + actions
    return index.filter((i) => i.kind === 'Page' || i.kind === 'Action' || i.kind === 'Section').slice(0, 12);
  }
  const terms = term.split(/\s+/).filter(Boolean);
  const scored = [];
  for (const item of index) {
    const title = item.title.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (title === t) score += 20;
      else if (title.startsWith(t)) score += 10;
      else if (title.includes(t)) score += 5;
      for (const kw of item.keywords || []) {
        if (kw === t) score += 3;
        else if (kw && kw.includes(t)) score += 1;
      }
    }
    if (score > 0) scored.push({ score, item });
  }
  scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title));
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Group results by kind for the UI to render section headers.
 */
export function groupByKind(results) {
  const groups = {};
  for (const r of results) {
    const k = r.kind || 'Other';
    if (!groups[k]) groups[k] = [];
    groups[k].push(r);
  }
  return groups;
}

/**
 * Force a rebuild of the cache (e.g. after data changes during dev).
 */
export function invalidateIndex() {
  CACHE = null;
}
