import { assessCareerProgression } from '../careerProgression.js';

function assert(value, message) { if (!value) throw new Error(message); }
export function runCareerProgressionTests() {
  const results = [];
  const check = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  check('new users remain entry level', () => {
    const result = assessCareerProgression();
    assert(result.current.id === 'entry', `got ${result.current.id}`);
  });
  check('mid level requires completed projects, evidence, and domain breadth', () => {
    const result = assessCareerProgression({
      projectStats: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, status: 'complete', detailScore: .8 })),
      projects: Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, difficulty: 'intermediate' })),
      portfolioIntelligence: { coverageArr: Array.from({ length: 4 }, () => ({ done: 1 })) },
    });
    assert(result.current.id === 'mid', `got ${result.current.id} at ${result.score}`);
  });
  check('activity without evidence cannot inflate career level', () => {
    const result = assessCareerProgression({
      projectStats: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, status: 'in-progress', detailScore: 0 })),
      portfolioIntelligence: { coverageArr: Array.from({ length: 6 }, () => ({ done: 1 })) },
      proposals: Array.from({ length: 20 }, () => ({ status: 'sent' })),
    });
    assert(result.current.id === 'entry', `got ${result.current.id}`);
  });
  return { results, allPassed: results.every((r) => r.pass) };
}
