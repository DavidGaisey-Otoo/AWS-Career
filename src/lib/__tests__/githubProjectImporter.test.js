import { analyzeRepository } from '../githubProjectImporter.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
const assert = (value, message) => { if (!value) throw new Error(message); };

test('detects a Vite static site but never marks it immediately deployable', () => {
  const result = analyzeRepository({
    fullName: 'me/site', paths: ['package.json', 'src/App.jsx', '.env'],
    manifests: { 'package.json': JSON.stringify({ scripts: { build: 'vite build' }, devDependencies: { vite: '^7' } }) },
  });
  assert(result.kind === 'static-web', 'Vite app was not detected');
  assert(result.canDeployNow === false, 'repository analysis bypassed approval gates');
  assert(result.secretLikeFiles.includes('.env'), 'secret-like filename was not flagged');
});

test('unknown repositories fail closed as planning only', () => {
  const result = analyzeRepository({ fullName: 'me/unknown', paths: ['README.md'], manifests: {} });
  assert(result.deployClass === 'planning-only', 'unknown repository was treated as deployable');
  assert(result.blockers.length > 0, 'unknown repository has no blockers');
});

export function runGithubImporterTests() {
  const results = tests.map(([name, fn]) => {
    try { fn(); return { name, pass: true }; }
    catch (error) { return { name, pass: false, error: error.message }; }
  });
  return { results, allPassed: results.every((item) => item.pass) };
}
