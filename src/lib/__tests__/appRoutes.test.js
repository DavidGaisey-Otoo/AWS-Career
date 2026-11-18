/**
 * Every menu entry opens a page, and every route has a page to open.
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const appSrc = fs.readFileSync(path.resolve(here, '../../App.jsx'), 'utf8');
// navSections.js imports a .jsx icon, which plain Node cannot load, so read it as text.
const navSrc = fs.readFileSync(path.resolve(here, '../navSections.js'), 'utf8');
const MENU = [...navSrc.matchAll(/label:\s*'([^']+)'[^}]*?path:\s*'([^']+)'/g)]
  .map((m) => ({ label: m[1], path: m[2] }));

/** Paths the removed pages used. Nothing in the menu may point at one. */
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

  const routes = [...appSrc.matchAll(/<Route\s+path="([^"]+)"\s+element=\{(?:<Suspended>)?<(\w+)/g)]
    .map((m) => ({ path: m[1], component: m[2] }));

  test('App.jsx declares routes at all (the parser is reading the file)', () => {
    assert(routes.length > 20, `only ${routes.length} routes found`);
  });

  test('every route renders a component that App.jsx defines', () => {
    for (const r of routes) {
      const defined = new RegExp(`^(?:const\\s+${r.component}\\s*=|import\\s+${r.component}\\s+from|import\\s*\\{[^}]*\\b${r.component}\\b[^}]*\\}\\s*from)`, 'm').test(appSrc);
      assert(defined, `${r.path} renders <${r.component}> but it is never imported`);
    }
  });

  test('the menu is being read (the parser finds its entries)', () => {
    assert(MENU.length > 15, `only ${MENU.length} menu entries found`);
  });

  test('every menu entry has a route', () => {
    const paths = new Set(routes.map((r) => r.path));
    for (const m of MENU) {
      const bare = m.path.split('?')[0];
      assert(paths.has(bare), `${m.label} links to ${m.path} but there is no route for it`);
    }
  });

  test('no menu entry points at a removed page', () => {
    for (const m of MENU) {
      const bare = m.path.split('?')[0];
      assert(!REMOVED_PATHS.includes(bare), `${m.label} still links to removed ${bare}`);
    }
  });

  test('an old bookmark to a removed page lands somewhere, not on a blank screen', () => {
    assert(routes.some((r) => r.path === '*'), 'no catch-all route');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
