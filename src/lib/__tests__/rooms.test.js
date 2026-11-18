/**
 * Every tab opens a tool, and every old address still finds its tool.
 *
 * The office regrouped thirty-one pages and an eighteen-tab hub into six
 * rooms. Links to the old addresses are all over the app and in people's
 * bookmarks; if one of them now lands on the wrong tab, or drops the
 * `?prefill=` it was carrying, the tool opens empty and looks broken.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGACY_PATHS, ROOMS, getRoom, resolveLegacy, resolveTab } from '../rooms.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const roomSrc = fs.readFileSync(path.resolve(here, '../../pages/Room.jsx'), 'utf8');
/** `'room/tab': … import('./X.jsx')` entries in Room.jsx's TAB_COMPONENTS. */
const ENTRIES = [...roomSrc.matchAll(/'([a-z]+\/[a-z]+)':\s*(?:named|lazy)\(\(\) => import\('([^']+)'\)(?:,\s*'(\w+)')?/g)]
  .map((m) => ({ key: m[1], file: path.resolve(here, '../../pages', m[2]), name: m[3] || null }));

/** Does this path name a room and a tab that exist? */
function isRealTab(p) {
  const [, roomId, tabId] = p.split('?')[0].split('/');
  const tab = resolveTab(roomId, tabId);
  return Boolean(getRoom(roomId) && tab && tab.id === tabId);
}

export function runRoomsTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('Room.jsx is being read (the parser finds its tabs)', () => {
    assert(ENTRIES.length > 20, `only ${ENTRIES.length} entries found`);
  });

  test('every tab has a tool, and every tool has a tab', () => {
    const keys = new Set(ENTRIES.map((e) => e.key));
    const tabs = new Set(ROOMS.flatMap((r) => r.tabs.map((t) => `${r.id}/${t.id}`)));
    for (const t of tabs) assert(keys.has(t), `tab ${t} has nothing to show`);
    for (const k of keys) assert(tabs.has(k), `${k} is mapped but no tab opens it`);
  });

  test('every tool file a tab loads exists', () => {
    for (const e of ENTRIES) assert(fs.existsSync(e.file), `${e.key} loads missing ${e.file}`);
  });

  test('every named tool is really exported by its file (else the tab is blank)', () => {
    for (const e of ENTRIES) {
      const src = fs.readFileSync(e.file, 'utf8');
      if (e.name) assert(new RegExp(`export (?:function|const) ${e.name}\\b`).test(src), `${e.key}: ${e.name} is not exported`);
      else assert(/export default /.test(src), `${e.key}: no default export`);
    }
  });

  test('room and tab ids are unique', () => {
    const rooms = ROOMS.map((r) => r.id);
    assert(new Set(rooms).size === rooms.length, 'duplicate room id');
    for (const r of ROOMS) {
      const ids = r.tabs.map((t) => t.id);
      assert(new Set(ids).size === ids.length, `duplicate tab in ${r.id}`);
    }
  });

  test('every old address lands on a tab that exists', () => {
    for (const [from, to] of Object.entries(LEGACY_PATHS)) {
      assert(isRealTab(to), `${from} → ${to}, which is not a real tab`);
      assert(resolveLegacy(from) === to, `${from} resolved to ${resolveLegacy(from)}`);
    }
  });

  test('a redirect keeps the query string the page needs', () => {
    assert(resolveLegacy('/solution', '?prefill=abc&x=1') === '/build/design?prefill=abc&x=1', resolveLegacy('/solution', '?prefill=abc&x=1'));
    assert(resolveLegacy('/documents', '?tab=contracts') === '/clients/paperwork?tab=contracts', 'documents tab lost');
  });

  test('every old Freelance Hub tab lands on its new home', () => {
    const cases = {
      '': '/money/overview',
      '?tab=overview': '/money/overview',
      '?tab=gigfeed': '/find/gigs',
      '?tab=myproposals': '/jobs/proposals?view=track',
      '?tab=proposals&sub=smart': '/jobs/proposals?view=write',
      '?tab=proposals&sub=builder': '/jobs/proposals?view=write',
      '?tab=proposals&sub=tracker': '/jobs/proposals?view=track',
      '?tab=proposals&sub=templates': '/jobs/proposals?view=templates',
      '?tab=outreach': '/clients/emails',
      '?tab=clients': '/clients/list',
      '?tab=contracts': '/clients/paperwork?tab=contracts',
      '?tab=branding': '/grow/branding',
      '?tab=finance&fin=goals': '/money/goals',
      '?tab=finance&fin=earnings': '/money/overview',
      '?tab=finance&fin=invoices': '/clients/paperwork?tab=invoices',
      '?tab=finance&fin=expenses': '/money/expenses',
      '?tab=finance&fin=currency': '/money/currency',
    };
    for (const [q, want] of Object.entries(cases)) {
      const got = resolveLegacy('/freelance', q);
      assert(got === want, `/freelance${q} → ${got}, wanted ${want}`);
      assert(isRealTab(got), `${got} is not a real tab`);
    }
  });

  test("the old hub's own params never leak into the page they land on", () => {
    const got = resolveLegacy('/freelance', '?tab=gigfeed&sub=smart&fin=goals&keep=1');
    assert(got === '/find/gigs?keep=1', got);
  });

  test('an address that was never a page is not redirected anywhere in particular', () => {
    assert(resolveLegacy('/nope') === null, 'unknown path was mapped');
    assert(resolveLegacy('/portfolio/p-s3') === null, 'a project page was swallowed by /portfolio');
  });

  test('an unknown tab falls back to the room\'s first tab, not to nothing', () => {
    assert(resolveTab('find', 'gone')?.id === 'gigs', 'no fallback tab');
    assert(resolveTab('nope', 'gigs') === null, 'an unknown room was resolved');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
