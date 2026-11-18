/**
 * Navigation: Today, six rooms, Settings.
 *
 * The rooms and their tabs are defined once, in src/lib/rooms.js. This file
 * adds the icons and builds the list the sidebar, the phone bar, the
 * breadcrumbs and the search palette all read. A room's tabs are its
 * children here, so search finds "Invoices" and breadcrumbs show
 * "Clients › Contracts & invoices"; the sidebar itself stays flat.
 */
import { Briefcase, Hammer, Home, Search, Settings, Sprout, Users, Wallet } from 'lucide-react';
import { ROOMS, roomPath } from './rooms.js';

const ROOM_ICONS = { find: Search, jobs: Briefcase, clients: Users, money: Wallet, build: Hammer, grow: Sprout };

export const SECTIONS = [
  {
    id: 'today', label: 'Today', icon: Home, path: '/',
    blurb: 'What needs you now, and where every job stands.',
    children: [],
  },
  ...ROOMS.map((room) => ({
    id: room.id,
    label: room.label,
    icon: ROOM_ICONS[room.id] || Briefcase,
    path: roomPath(room.id),
    blurb: room.blurb,
    children: room.tabs.map((t) => ({
      id: `${room.id}-${t.id}`,
      label: t.label,
      icon: ROOM_ICONS[room.id] || Briefcase,
      path: roomPath(room.id, t.id),
    })),
  })),
  {
    id: 'settings', label: 'Settings', icon: Settings, path: '/settings',
    blurb: 'Profile, display, integrations and your data.',
    children: [],
  },
];

// Quick lookup: path → { section, child } so breadcrumbs/back work everywhere.
const PATH_INDEX = (() => {
  const map = new Map();
  for (const sec of SECTIONS) {
    map.set(sec.path, { section: sec, child: null });
    for (const c of sec.children) {
      if (!map.has(c.path)) map.set(c.path, { section: sec, child: c });
    }
  }
  return map;
})();

/**
 * Resolve a pathname (including nested paths) to its breadcrumb chain.
 * `/portfolio/foo` → Build › Portfolio › foo
 */
export function breadcrumbsFor(pathname) {
  const chain = [];
  // First, try exact match
  const exact = PATH_INDEX.get(pathname);
  if (exact) {
    chain.push({ label: exact.section.label, to: exact.section.path });
    if (exact.child && exact.child.path !== exact.section.path) {
      chain.push({ label: exact.child.label, to: exact.child.path });
    }
    return chain;
  }

  // Walk up the path looking for the longest prefix match.
  const parts = pathname.split('/').filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    const candidate = '/' + parts.slice(0, i).join('/');
    const m = PATH_INDEX.get(candidate);
    if (m) {
      chain.push({ label: m.section.label, to: m.section.path });
      if (m.child && m.child.path !== m.section.path) {
        chain.push({ label: m.child.label, to: m.child.path });
      }
      // Add any deeper segments as plain labels
      for (let j = i; j < parts.length; j++) {
        chain.push({ label: prettifySegment(parts[j]), to: null });
      }
      return chain;
    }
  }

  // Fallback — at least show the path
  chain.push({ label: 'Home', to: '/' });
  for (const p of parts) chain.push({ label: prettifySegment(p), to: null });
  return chain;
}

function prettifySegment(seg) {
  return seg
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** The phone's bottom bar has room for five; the rest are in the menu. */
const MOBILE_IDS = ['today', 'find', 'jobs', 'money', 'build'];
export const MOBILE_NAV = MOBILE_IDS
  .map((id) => SECTIONS.find((s) => s.id === id))
  .filter(Boolean)
  .map((s) => ({ id: s.id, label: s.label, icon: s.icon, path: s.path }));
