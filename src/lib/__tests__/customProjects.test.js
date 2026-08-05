/**
 * customProjects.test.js — BUILD-01 regression suite.
 *
 * The fragile part of "describe what you want to build" is that people do
 * not write AWS vocabulary. Every check here corresponds to a real failure
 * observed while building it:
 *
 *   - "A booking system for my barber shop…" detected ZERO services,
 *     because the existing detectors only match AWS terms.
 *   - "A URL shortener with click analytics" got Glue and Athena but no
 *     database — you cannot report on data you never stored.
 *   - A simple booking site was graded "advanced" because baseline
 *     services (IAM, CloudWatch) were counted toward difficulty.
 *   - The build plan had two phases (discovery, handover) and no build
 *     steps, because it was generated from the empty service list.
 */

// localStorage shim — the module reads storage at import time.
// Re-installed when the suite runs, because other suites install their own
// shim on the same global and last-import-wins would otherwise silently
// point this suite at another suite's store.
const store = new Map();

function installShim() {
  globalThis.localStorage = {
    get length() { return store.size; },
    key: (i) => [...store.keys()][i] ?? null,
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
  };
}
installShim();

const { mapRequirements, detectCapabilities } = await import('../requirementMapper.js');
const { generateCustomProject } = await import('../customProjects.js');

const BRIEFS = {
  barber: 'A booking system for my barber shop. Customers pick a slot online, get an SMS reminder, and the barber sees the day appointments on a phone. Maybe 500 customers. Keep it cheap.',
  shortener: 'A URL shortener handling 10,000 redirects per second with click analytics.',
  shop: 'An online shop selling handmade candles. Customers browse products, pay by card, and I need to track orders and inventory.',
  csv: 'Internal tool that ingests daily CSV sales files, validates them, and shows a dashboard the sales team can query.',
  chat: 'A WhatsApp-style chat backend with real-time messaging, image uploads and push notifications for about 5,000 users.',
};

function assert(cond, msg) { if (!cond) throw new Error(msg); }

const CHECKS = [
  {
    name: 'plain product language yields services (the original failure)',
    run: () => {
      for (const [key, brief] of Object.entries(BRIEFS)) {
        const { serviceIds } = mapRequirements(brief);
        assert(serviceIds.length >= 4,
          `"${key}" produced only ${serviceIds.length} services from plain language`);
      }
    },
  },
  {
    name: 'a booking system gets storage, notifications and a front end',
    run: () => {
      const { serviceIds } = mapRequirements(BRIEFS.barber);
      for (const need of ['dynamodb', 'sns', 's3', 'lambda']) {
        assert(serviceIds.includes(need), `barber shop missing ${need}: got ${serviceIds.join(', ')}`);
      }
    },
  },
  {
    name: 'anything with an API or analytics also gets somewhere to store data',
    run: () => {
      for (const key of ['shortener', 'chat', 'shop']) {
        const { serviceIds } = mapRequirements(BRIEFS[key]);
        const hasStore = ['dynamodb', 'rds', 'aurora'].some((s) => serviceIds.includes(s));
        assert(hasStore, `"${key}" has no data store: ${serviceIds.join(', ')}`);
      }
    },
  },
  {
    name: 'every design gets compute',
    run: () => {
      for (const [key, brief] of Object.entries(BRIEFS)) {
        const { serviceIds } = mapRequirements(brief);
        const hasCompute = ['lambda', 'ec2', 'ecs', 'eks'].some((s) => serviceIds.includes(s));
        assert(hasCompute, `"${key}" has nowhere to run logic: ${serviceIds.join(', ')}`);
      }
    },
  },
  {
    name: 'payment wording pulls in secret handling',
    run: () => {
      const { serviceIds } = mapRequirements(BRIEFS.shop);
      assert(serviceIds.includes('secrets-manager') || serviceIds.includes('kms'),
        `payments did not add secret handling: ${serviceIds.join(', ')}`);
    },
  },
  {
    name: '"keep it cheap" at small scale avoids always-on infrastructure',
    run: () => {
      const { serviceIds, signals } = mapRequirements(BRIEFS.barber);
      assert(signals.cheap && signals.small, 'cost and scale signals not detected');
      assert(!serviceIds.includes('elasticache'), 'added an always-on cache to a cheap small build');
      assert(!serviceIds.includes('rds'), 'added an always-on database to a cheap small build');
    },
  },
  {
    name: 'high-traffic wording pulls in caching and a CDN',
    run: () => {
      const { serviceIds } = mapRequirements(BRIEFS.shortener);
      assert(serviceIds.includes('cloudfront'), 'no CDN on a high-traffic build');
      assert(serviceIds.includes('elasticache'), 'no cache on a high-traffic build');
    },
  },
  {
    name: 'every capability carries the phrase that triggered it',
    run: () => {
      const caps = detectCapabilities(BRIEFS.barber);
      assert(caps.length > 0, 'no capabilities detected');
      for (const c of caps) {
        assert(c.matched && c.matched.length > 0, `capability ${c.id} has no evidence phrase`);
        assert(BRIEFS.barber.toLowerCase().includes(c.matched.toLowerCase()),
          `capability ${c.id} cites "${c.matched}" which is not in the brief`);
      }
    },
  },

  // ── Generated project shape ───────────────────────────────────────
  {
    name: 'generated project matches the preset project shape',
    run: () => {
      const required = ['id', 'title', 'tagline', 'summary', 'difficulty', 'services',
                        'skills', 'estMinutes', 'estLabel', 'architecture', 'buildSteps',
                        'commonErrors', 'presentation', 'prerequisites'];
      for (const [key, brief] of Object.entries(BRIEFS)) {
        const p = generateCustomProject({ brief });
        for (const f of required) {
          assert(p[f] !== undefined, `"${key}" project missing ${f}`);
        }
        assert(p.id.startsWith('custom-'), 'custom project id must be namespaced');
        assert(Array.isArray(p.architecture.nodes) && Array.isArray(p.architecture.edges),
          'architecture must have nodes and edges');
      }
    },
  },
  {
    name: 'build plan has real phases, not just discovery and handover',
    run: () => {
      for (const [key, brief] of Object.entries(BRIEFS)) {
        const p = generateCustomProject({ brief });
        assert(p.buildSteps.length >= 4,
          `"${key}" produced only ${p.buildSteps.length} phases — the plan has no build content`);
        const tasks = p.buildSteps.reduce((n, s) => n + s.subs.length, 0);
        assert(tasks >= 8, `"${key}" produced only ${tasks} tasks`);
      }
    },
  },
  {
    name: 'build steps have unique ids so progress ticks independently',
    run: () => {
      const p = generateCustomProject({ brief: BRIEFS.shop });
      const ids = new Set();
      for (const step of p.buildSteps) {
        assert(!ids.has(step.id), `duplicate step id ${step.id}`);
        ids.add(step.id);
        for (const sub of step.subs) {
          assert(!ids.has(sub.id), `duplicate sub id ${sub.id}`);
          ids.add(sub.id);
        }
      }
    },
  },
  {
    name: 'a simple build is not graded advanced',
    run: () => {
      const p = generateCustomProject({ brief: BRIEFS.barber });
      assert(p.difficulty !== 'advanced',
        `a small booking site was graded "${p.difficulty}" — baseline services are inflating difficulty`);
    },
  },
  {
    name: 'architecture nodes reference only services the project has',
    run: () => {
      for (const brief of Object.values(BRIEFS)) {
        const p = generateCustomProject({ brief });
        for (const n of p.architecture.nodes) {
          if (!n.service) continue;   // the 'user' node has none
          assert(p.services.includes(n.service),
            `diagram shows ${n.service} which is not in the service list`);
        }
      }
    },
  },
  {
    name: 'generation is deterministic apart from the id',
    run: () => {
      const a = generateCustomProject({ brief: BRIEFS.chat });
      const b = generateCustomProject({ brief: BRIEFS.chat });
      assert(a.services.join() === b.services.join(), 'service list drifted between runs');
      assert(a.buildSteps.length === b.buildSteps.length, 'plan length drifted between runs');
      assert(a.difficulty === b.difficulty, 'difficulty drifted between runs');
    },
  },
  {
    name: 'an empty brief is rejected rather than producing an empty project',
    run: () => {
      let threw = false;
      try { generateCustomProject({ brief: '   ' }); } catch { threw = true; }
      assert(threw, 'an empty brief should throw, not generate a hollow project');
    },
  },
];

export function runCustomProjectTests() {
  installShim();   // reclaim the global from any other suite's shim
  const results = CHECKS.map((c) => {
    try { c.run(); return { name: c.name, pass: true, error: null }; }
    catch (err) { return { name: c.name, pass: false, error: String(err.message || err) }; }
  });
  const passed = results.filter((r) => r.pass).length;
  return { results, passed, total: results.length, allPassed: passed === results.length };
}

export function printCustomProjectReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  BUILD-YOUR-OWN PROJECT TESTS');
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
