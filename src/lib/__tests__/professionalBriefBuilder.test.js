import assert from 'node:assert/strict';
import { buildProfessionalBrief, detectProfessionalBriefProfile } from '../professionalBriefBuilder.js';

export function runProfessionalBriefBuilderTests() {
  const results = [];
  const check = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  check('expands Windows Server administration into a complete controlled brief', () => {
    const brief = buildProfessionalBrief('I want to start with Windows Server administration');
    assert.equal(detectProfessionalBriefProfile(brief), 'windows-server');
    for (const required of ['AWS Systems Manager', 'Draw.io', 'Acceptance tests:', 'Missing client questions', 'Free Tier', 'Rollback', 'Do not execute deployment']) {
      assert.ok(brief.includes(required), `Missing ${required}`);
    }
  });
  check('unknown ideas still fail closed with discovery and approval', () => {
    const brief = buildProfessionalBrief('build a useful thing for a small client');
    assert.match(brief, /first phase is discovery—not deployment/i);
    assert.match(brief, /never promise zero cost/i);
    assert.match(brief, /explicit human approval/i);
  });
  return { results, allPassed: results.every((result) => result.pass) };
}
