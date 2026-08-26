import { isStaleChunkError } from '../lazyWithRecovery.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

const checks = [
  ['recognizes Vite dynamic-import fetch failures', () => {
    assert(isStaleChunkError(new TypeError('Failed to fetch dynamically imported module: https://example.test/assets/Page-old.js')), 'Vite failure was not recognized');
  }],
  ['recognizes common chunk loader failures', () => {
    assert(isStaleChunkError(new Error('ChunkLoadError: Loading chunk 42 failed')), 'chunk loader failure was not recognized');
  }],
  ['does not reload for ordinary application errors', () => {
    assert(!isStaleChunkError(new ReferenceError('dragState is not defined')), 'ordinary code error was misclassified as stale deployment');
  }],
];

export function runLazyRecoveryTests() {
  const results = checks.map(([name, run]) => { try { run(); return { name, pass: true }; } catch (error) { return { name, pass: false, error: error.message }; } });
  return { results, allPassed: results.every((result) => result.pass) };
}

