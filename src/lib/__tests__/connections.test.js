/**
 * The Connections list must never show green for something it cannot see.
 *
 * "Desktop ↔ laptop: connected" while sync is signed out would mean two
 * computers quietly drifting apart; "AWS: connected" would claim a check
 * that never happened.
 */
import { describeConnections, summarise } from '../connections.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const NOW = new Date(2026, 10, 18, 12, 0).getTime();
const byId = (list, id) => list.find((c) => c.id === id);

export function runConnectionsTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test('with nothing set up, nothing is shown as connected except built-in draw.io', () => {
    const list = describeConnections({}, NOW);
    const green = list.filter((c) => c.status === 'connected').map((c) => c.id);
    assert(green.join() === 'drawio', `connected: ${green.join()}`);
  });

  test('sync switched on but signed out is attention, not connected', () => {
    const d = byId(describeConnections({ sync: { enabled: true, status: 'no-token' } }, NOW), 'devices');
    assert(d.status === 'attention' && /signed out/.test(d.detail), JSON.stringify(d));
  });

  test('a sync error shows the real error text', () => {
    const d = byId(describeConnections({ sync: { enabled: true, status: 'error', meta: { lastError: 'Bad credentials' } } }, NOW), 'devices');
    assert(d.status === 'attention' && d.detail.includes('Bad credentials'), d.detail);
  });

  test('a sync conflict asks you to choose', () => {
    const d = byId(describeConnections({ sync: { enabled: true, status: 'conflict' } }, NOW), 'devices');
    assert(d.status === 'attention' && /Choose/.test(d.detail), d.detail);
  });

  test('a working sync says when it last ran', () => {
    const d = byId(describeConnections({ sync: { enabled: true, status: 'synced', meta: { lastPushAt: new Date(NOW - 5 * 60000).toISOString() } } }, NOW), 'devices');
    assert(d.status === 'connected' && /5 min ago/.test(d.detail), d.detail);
  });

  test('the devices row always warns that AWS keys do not sync', () => {
    const d = byId(describeConnections({ sync: { enabled: true, status: 'synced' } }, NOW), 'devices');
    assert(/never sync/.test(d.note), 'missing the vault warning');
  });

  test('a saved AWS vault does not claim to have checked AWS', () => {
    const a = byId(describeConnections({ vault: { exists: true } }, NOW), 'aws');
    assert(/not checked against AWS/.test(a.detail), a.detail);
  });

  test('draw.io offline is attention, not connected', () => {
    assert(byId(describeConnections({ online: false }, NOW), 'drawio').status === 'attention', 'offline draw.io shown as working');
  });

  test('the account controller is listed as separate, with the reason', () => {
    const c = byId(describeConnections({}, NOW), 'controller');
    assert(c.status === 'separate' && /on purpose/.test(c.detail), JSON.stringify(c));
  });

  test('the summary leaves the separate row out of the counts', () => {
    const s = summarise(describeConnections({ github: { signedIn: true } }, NOW));
    assert(s.total === 6 && s.connected === 2, JSON.stringify(s));
  });

  return { allPassed: results.every((r) => r.pass), results };
}
