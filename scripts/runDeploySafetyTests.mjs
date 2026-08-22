import { runDeploySafetyTests } from '../src/lib/__tests__/deploySafety.test.js';

const report = runDeploySafetyTests();
for (const result of report.results) {
  console.log(`${result.pass ? '✓' : '✗'} ${result.name}${result.error ? ` — ${result.error}` : ''}`);
}
process.exit(report.allPassed ? 0 : 1);
