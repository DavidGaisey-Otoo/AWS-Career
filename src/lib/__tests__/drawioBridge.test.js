import { DRAWIO_ORIGIN, architectureToDrawioXml, normalizeArchitecture, validateDrawioXml } from '../drawioBridge.js';
function assert(condition, message) { if (!condition) throw new Error(message); }
const checks = [
  ['pins the trusted editor origin', () => assert(DRAWIO_ORIGIN === 'https://embed.diagrams.net', 'origin changed')],
  ['rejects entity and script payloads', () => {
    assert(!validateDrawioXml('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///x">]><mxfile></mxfile>').valid, 'DTD accepted');
    assert(!validateDrawioXml('<mxfile><script>alert(1)</script></mxfile>').valid, 'script accepted');
  }],
  ['accepts a normal mxfile', () => assert(validateDrawioXml('<mxfile><diagram>x</diagram></mxfile>').valid, 'valid mxfile rejected')],
  ['drops orphan, duplicate, and self-referencing edges', () => {
    const value = normalizeArchitecture([{ id: 'api' }, { id: 'db' }, { id: 'api' }], [{ from: 'api', to: 'db' }, { from: 'api', to: 'missing' }, { from: 'db', to: 'db' }, { from: 'api', to: 'db' }]);
    assert(value.nodes.length === 2, 'duplicate nodes retained');
    assert(value.edges.length === 1, 'invalid edges retained');
  }],
  ['escapes labels and exports only consistent connections', () => {
    const xml = architectureToDrawioXml([{ id: 'a', serviceId: 's3' }, { id: 'b', serviceId: 'lambda' }], [{ from: 'a', to: 'b' }, { from: 'a', to: 'ghost' }], 'Client <prod>', (node) => node.serviceId === 's3' ? 'S3 & storage' : 'Lambda');
    assert(xml.includes('Client &lt;prod&gt;'), 'name not escaped');
    assert(xml.includes('S3 &amp; storage'), 'label not escaped');
    assert(!xml.includes('ghost'), 'orphan edge exported');
    assert(validateDrawioXml(xml).valid, 'generated XML invalid');
  }],
];
export function runDrawioBridgeTests() {
  const results = checks.map(([name, run]) => { try { run(); return { name, pass: true }; } catch (error) { return { name, pass: false, error: error.message }; } });
  return { results, allPassed: results.every((result) => result.pass) };
}
if (process.argv[1]?.endsWith('drawioBridge.test.js')) {
  const report = runDrawioBridgeTests();
  for (const result of report.results) console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
  process.exit(report.allPassed ? 0 : 1);
}
