/**
 * Every route has a page to open, and every room is actually routed.
 *
 * Vite does not fail the build on a JSX element whose component was
 * never imported; it ships, and the page crashes when someone opens it.
 * That nearly happened when the study pages were removed: three routes
 * outlived their components. These checks read App.jsx as text, so they
 * need no browser.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOMS } from '../rooms.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = fs.readFileSync(path.resolve(here, '../../App.jsx'), 'utf8');

/** Paths the removed study pages used. No room or tab may reuse one. */
const REMOVED_PATHS = [
  '/career-dashboard', '/roadmap', '/learning', '/exam', '/exam-hub', '/learn', '/flashcards',
  '/certifications', '/ai', '/ai/assistant', '/ai/study-plan', '/ai/interview', '/interview',
  '/community', '/resources', '/analytics', '/profile', '/wellness', '/uk', '/aws-updates',
  '/updates', '/readiness', '/saa-roadmap', '/saa-review', '/my-notes', '/exam-strategy',
  '/service-comparisons',
];

export function runAppRoutesTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  const routes = [...appSrc.matchAll(/<Route\s+(?:key=\{[^}]+\}\s+)?path="([^"]+)"\s+element=\{(?:<Suspended>)?<(\w+)/g)]
    .map((m) => ({ path: m[1], component: m[2] }));

  test('App.jsx declares routes at all (the parser is reading the file)', () => {
    assert(routes.length >= 8, `only ${routes.length} routes found`);
  });

  test('every route renders a component that App.jsx defines', () => {
    for (const r of routes) {
      const c = r.component;
      const defined = new RegExp(
        `^(?:const\\s+${c}\\s*=|function\\s+${c}\\s*\\(|import\\s+${c}\\s+from|import\\s*\\{[^}]*\\b${c}\\b[^}]*\\}\\s*from)`, 'm',
      ).test(appSrc);
      assert(defined, `${r.path} renders <${r.component}> but it is never defined or imported`);
    }
  });

  test('every room is routed, with and without a tab', () => {
    assert(/ROOMS\.map\(\(r\) => r\.id\)/.test(appSrc), 'App.jsx does not take its rooms from rooms.js');
    assert(/path=\{`\/\$\{id\}`\}/.test(appSrc), 'no /<room> route');
    assert(/path=\{`\/\$\{id\}\/:tabId`\}/.test(appSrc), 'no /<room>/<tab> route');
  });

  test('Today is the front page, and Settings is reachable', () => {
    assert(routes.some((r) => r.path === '/' && r.component === 'Today'), '/ is not Today');
    assert(routes.some((r) => r.path === '/settings'), 'no /settings route');
  });

  test('old addresses are all caught and redirected', () => {
    assert(/Object\.keys\(LEGACY_PATHS\)\.map/.test(appSrc), 'legacy paths are not routed');
    assert(routes.some((r) => r.path === '/freelance' && r.component === 'LegacyRedirect'), '/freelance not redirected');
  });

  test('an unknown address lands somewhere, not on a blank screen', () => {
    assert(routes.some((r) => r.path === '*'), 'no catch-all route');
  });

  test('no room or tab reuses the address of a removed page', () => {
    for (const room of ROOMS) {
      for (const p of [`/${room.id}`, ...room.tabs.map((t) => `/${room.id}/${t.id}`)]) {
        assert(!REMOVED_PATHS.includes(p), `${p} reuses a removed page's address`);
      }
    }
  });

  return { allPassed: results.every((r) => r.pass), results };
}
