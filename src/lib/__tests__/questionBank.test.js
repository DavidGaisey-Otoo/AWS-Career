/**
 * questionBank.test.js — EX-21 exam content integrity.
 *
 * Guards two things that silently degrade exam prep quality:
 *
 *   1. Malformed questions. A question with an answer index out of range,
 *      or a wrongReasons entry pointing at the CORRECT option, teaches the
 *      candidate the wrong thing — and nothing in the build catches it.
 *
 *   2. Format drift. The bank held 704 SAA questions of which 2 were
 *      multiple-response, against an exam that mixes them in heavily. The
 *      selector now reserves a share; these tests make sure it keeps doing
 *      so as the bank grows.
 */

import { QUESTION_BANK, questionsForCert, pickExamQuestions } from '../../data/questionBank.js';
import { SAA_V2_MULTI } from '../../data/questionBankV2_saaMulti.js';
import { getCert } from '../../data/certs.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const isMulti = (q) => q.type === 'multi' && Array.isArray(q.answer) && q.answer.length > 1;

const CHECKS = [
  // ── Bank-wide structural integrity ────────────────────────────────
  {
    name: 'no duplicate question ids anywhere in the bank',
    run: () => {
      const seen = new Map();
      const dupes = [];
      for (const q of QUESTION_BANK) {
        if (seen.has(q.id)) dupes.push(q.id);
        seen.set(q.id, true);
      }
      assert(dupes.length === 0, `duplicate ids: ${dupes.slice(0, 5).join(', ')}`);
    },
  },
  {
    name: 'every answer index points at a real option',
    run: () => {
      const bad = [];
      for (const q of QUESTION_BANK) {
        const idx = Array.isArray(q.answer) ? q.answer : [q.answer];
        for (const i of idx) {
          if (typeof i !== 'number' || i < 0 || i >= (q.options || []).length) {
            bad.push(`${q.id}(answer=${i}, options=${(q.options || []).length})`);
          }
        }
      }
      assert(bad.length === 0, `out-of-range answers: ${bad.slice(0, 5).join(', ')}`);
    },
  },
  {
    name: 'no wrongReasons entry sits on a correct option',
    run: () => {
      const bad = [];
      for (const q of QUESTION_BANK) {
        if (!q.wrongReasons) continue;
        const correct = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
        for (const k of Object.keys(q.wrongReasons)) {
          if (correct.has(Number(k))) bad.push(`${q.id}[${k}]`);
        }
      }
      assert(bad.length === 0,
        `wrongReasons explaining a CORRECT option (teaches the wrong lesson): ${bad.slice(0, 5).join(', ')}`);
    },
  },
  {
    name: 'multi-type questions actually have multiple answers',
    run: () => {
      const bad = QUESTION_BANK
        .filter((q) => q.type === 'multi' && !(Array.isArray(q.answer) && q.answer.length > 1))
        .map((q) => q.id);
      assert(bad.length === 0, `type 'multi' with a single answer: ${bad.slice(0, 5).join(', ')}`);
    },
  },
  {
    name: 'array answers are declared type multi (else the UI renders radios)',
    run: () => {
      const bad = QUESTION_BANK
        .filter((q) => Array.isArray(q.answer) && q.answer.length > 1 && q.type !== 'multi')
        .map((q) => q.id);
      assert(bad.length === 0,
        `multiple answers but type is not 'multi' — checkboxes will not render: ${bad.slice(0, 5).join(', ')}`);
    },
  },

  // ── The EX-21 multi-response batch ────────────────────────────────
  {
    name: 'the multi-response batch is complete and well-formed',
    run: () => {
      assert(SAA_V2_MULTI.length >= 40, `only ${SAA_V2_MULTI.length} multi-response questions`);
      for (const q of SAA_V2_MULTI) {
        assert(q.options.length === 5, `${q.id}: expected 5 options, got ${q.options.length}`);
        assert(q.answer.length === 2, `${q.id}: expected 2 correct answers`);
        assert(q.why && q.why.length > 60, `${q.id}: explanation too thin to teach from`);
        assert(!!q.docs, `${q.id}: no AWS docs link`);
        assert(!!q.concept, `${q.id}: no concept tag`);
        // Every wrong option must be explained — this is the elimination skill
        const wrong = q.options.map((_, i) => i).filter((i) => !q.answer.includes(i));
        for (const w of wrong) {
          assert(q.wrongReasons[w], `${q.id}: option ${w} has no wrongReason`);
        }
      }
    },
  },
  {
    name: 'multi-response batch spread matches the published domain weights',
    run: () => {
      const dom = {};
      for (const q of SAA_V2_MULTI) dom[q.domainIds[0]] = (dom[q.domainIds[0]] || 0) + 1;
      // D1 30% > D2 26% > D3 24% > D4 20% — D1 must lead, D4 must trail
      assert(dom['saa-d1'] >= dom['saa-d2'], `D1 (${dom['saa-d1']}) should not trail D2 (${dom['saa-d2']})`);
      assert(dom['saa-d4'] <= dom['saa-d3'], `D4 (${dom['saa-d4']}) should not exceed D3 (${dom['saa-d3']})`);
      for (const d of ['saa-d1', 'saa-d2', 'saa-d3', 'saa-d4']) {
        assert(dom[d] >= 5, `${d} has only ${dom[d] || 0} multi-response questions`);
      }
    },
  },

  // ── Selector behaviour ────────────────────────────────────────────
  {
    name: 'a 65-question mock includes a realistic share of multi-response',
    run: () => {
      const cert = getCert('saa-c03');
      const ratios = [];
      for (let i = 0; i < 5; i++) {
        const qs = pickExamQuestions({ cert, count: 65, seed: 4000 + i * 131 });
        assert(qs.length === 65, `mock returned ${qs.length} questions, expected 65`);
        ratios.push(qs.filter(isMulti).length / qs.length);
      }
      const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
      assert(avg >= 0.15 && avg <= 0.35,
        `multi-response share is ${(avg * 100).toFixed(0)}% — outside the realistic 15-35% band`);
    },
  },
  {
    name: 'mocks stay proportional to domain weights',
    run: () => {
      const cert = getCert('saa-c03');
      const qs = pickExamQuestions({ cert, count: 65, seed: 777 });
      const dom = {};
      for (const q of qs) dom[q.domainIds[0]] = (dom[q.domainIds[0]] || 0) + 1;
      // D1 is 30% of a 65Q exam ≈ 20 questions; allow generous slack
      assert(dom['saa-d1'] >= 14, `D1 got only ${dom['saa-d1']} of 65 (should be ~20)`);
      assert(dom['saa-d4'] >= 8, `D4 got only ${dom['saa-d4']} of 65 (should be ~13)`);
    },
  },
  {
    name: 'the same seed always produces the same mock',
    run: () => {
      const cert = getCert('saa-c03');
      const a = pickExamQuestions({ cert, count: 20, seed: 555 }).map((q) => q.id);
      const b = pickExamQuestions({ cert, count: 20, seed: 555 }).map((q) => q.id);
      assert(a.join() === b.join(), 'same seed produced different questions — mock replay is broken');
    },
  },
  {
    name: 'multiRatio 0 still returns a full single-answer paper',
    run: () => {
      const cert = getCert('saa-c03');
      const qs = pickExamQuestions({ cert, count: 30, seed: 9, multiRatio: 0 });
      assert(qs.length === 30, `returned ${qs.length}, expected 30`);
      assert(qs.filter(isMulti).length === 0, 'multiRatio 0 still included multi-response questions');
    },
  },
  {
    name: 'domain-filtered practice still returns questions',
    run: () => {
      const cert = getCert('saa-c03');
      for (const d of ['saa-d1', 'saa-d2', 'saa-d3', 'saa-d4']) {
        const qs = pickExamQuestions({ cert, count: 10, seed: 42, filters: { domainId: d } });
        assert(qs.length > 0, `${d} returned no questions`);
        for (const q of qs) assert(q.domainIds.includes(d), `${d} filter leaked ${q.id}`);
      }
    },
  },
  {
    name: 'SAA-C03 pool is large enough for a full mock several times over',
    run: () => {
      const pool = questionsForCert('saa-c03');
      assert(pool.length >= 400, `pool is only ${pool.length} questions`);
      const multi = pool.filter(isMulti).length;
      assert(multi >= 40, `only ${multi} multi-response questions available`);
    },
  },
];

export function runQuestionBankTests() {
  const results = CHECKS.map((c) => {
    try {
      c.run();
      return { name: c.name, pass: true, error: null };
    } catch (err) {
      return { name: c.name, pass: false, error: String(err.message || err) };
    }
  });
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, total: results.length, allPassed: passed === results.length };
}

export function printQuestionBankReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  EXAM CONTENT INTEGRITY TESTS');
  lines.push('═══════════════════════════════════════════════════════════════');
  for (const r of report.results) {
    lines.push(`${r.pass ? '✓' : '✗'} ${r.name}`);
    if (!r.pass) lines.push(`     ${r.error}`);
  }
  lines.push('---------------------------------------------------------------');
  lines.push(`OVERALL: ${report.passed}/${report.total} passed`);
  lines.push('═══════════════════════════════════════════════════════════════');
  return lines.join('\n');
}
