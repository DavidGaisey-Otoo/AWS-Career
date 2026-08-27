/**
 * gigSolutionPipeline.test.js — GIG-01 pipeline regression suite.
 *
 * These are the invariants the "gig in → solution out" flow must keep.
 * Every one of them corresponds to a bug that actually shipped and was
 * caught by this suite:
 *
 *   - grade rendered as "[object Object]" (would crash React)
 *   - CloudFormation covered 4 services while Terraform covered 18, so
 *     "one-click build" deployed a near-empty stack
 *   - a UK gig routed to us-east-1 because an object was passed where an
 *     audience id string was expected
 *   - stack names truncated mid-word ("aws-architect-for-e")
 *
 * Pure functions only — no network, no AWS, no browser APIs.
 */

import { runPipeline, matchBlueprints, deriveNames, gigToBrief, assessDeliveryReadiness, extractBudgetFromBrief } from '../gigSolutionPipeline.js';

// ════════════════════════════════════════════════════════════════════
// Fixtures
// ════════════════════════════════════════════════════════════════════
const GIGS = {
  ecommerceUK: {
    title: 'AWS Architect for e-commerce platform migration',
    company: 'RetailCo',
    budget: '$8,000 fixed',
    location: 'United Kingdom',
    description: 'We need to migrate our PCI-DSS compliant e-commerce store to AWS. Expecting 50,000 concurrent users on Black Friday. Need high availability across regions, a managed database, and a CDN. Timeline is 2 weeks.',
    skills: ['aws', 'terraform', 'rds', 'cloudfront'],
  },
  serverless: {
    title: 'Serverless API developer needed',
    description: 'Build a REST API using Lambda and API Gateway with a DynamoDB backend. Small startup, low budget, needs to scale to zero when idle.',
    skills: ['lambda', 'dynamodb', 'api gateway'],
  },
  staticSite: 'I need a simple static website hosted on S3 with a custom domain and HTTPS for my bakery.',
  vague: 'Need some help with cloud stuff.',
};

// ════════════════════════════════════════════════════════════════════
// Assertions
// ════════════════════════════════════════════════════════════════════
const CHECKS = [
  // ── Structural integrity ──────────────────────────────────────────
  {
    name: 'every gig produces a complete solution object',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const s = runPipeline(gig);
        assert(s.id, `${key}: missing id`);
        assert(s.names?.projectName, `${key}: missing projectName`);
        assert(s.plan?.phases?.length > 0, `${key}: no plan phases`);
        assert(s.review, `${key}: no review`);
        assert(['ready', 'caution', 'fix-first', 'blocked'].includes(s.review.verdict),
          `${key}: bad verdict "${s.review.verdict}"`);
      }
    },
  },
  {
    name: 'pipeline is deterministic for the same input',
    run: () => {
      const a = runPipeline(GIGS.serverless);
      const b = runPipeline(GIGS.serverless);
      assert(a.names.stackName === b.names.stackName, 'stack name drifted between runs');
      assert(a.artifacts.cfn.code === b.artifacts.cfn.code, 'template drifted between runs');
      assert(a.review.expert.score === b.review.expert.score, 'review score drifted between runs');
    },
  },
  {
    name: 'structured professional briefs use the title value, not the label',
    run: () => {
      const s = runPipeline('Project title:\nWindows Server Administration — Secure Managed Server\n\nOriginal request:\nBuild a Windows Server administration lab with EC2, IAM, and CloudWatch.');
      assert(s.names.projectName === 'Windows Server Administration — Secure Managed Server',
        `structured title became "${s.names.projectName}"`);
      assert(!s.blueprints.best || s.blueprints.best.score >= 60,
        `weak ${s.blueprints.best?.score}% match was promoted as a blueprint`);
    },
  },

  // ── grade must be a renderable string, never an object ────────────
  {
    name: 'review.grade is a string (React would crash on an object)',
    run: () => {
      const s = runPipeline(GIGS.serverless);
      assert(typeof s.review.grade === 'string',
        `grade was ${typeof s.review.grade}, expected string`);
      assert(/^[A-F][+]?$/.test(s.review.grade), `grade "${s.review.grade}" is not a letter grade`);
      assert(typeof s.review.gradeLabel === 'string', 'gradeLabel must be a string');
    },
  },

  // ── CloudFormation coverage — the "click to build" promise ────────
  {
    name: 'CloudFormation covers the core serverless stack completely',
    run: () => {
      const s = runPipeline(GIGS.serverless);
      const cov = s.deploy.coverage;
      assert(cov, 'no coverage reported');
      assert(cov.pct === 100, `expected 100% coverage, got ${cov.pct}%`);
      for (const id of ['lambda', 'dynamodb', 'apigw']) {
        assert(cov.covered.includes(id), `${id} missing from CFN coverage`);
      }
      assert(cov.resourceCount >= 6, `only ${cov.resourceCount} resources emitted`);
    },
  },
  {
    name: 'one-click deploy is refused when the template has no resources',
    run: () => {
      const s = runPipeline(GIGS.vague);
      if (s.deploy.coverage?.resourceCount === 0) {
        assert(!s.deploy.canOneClick, 'offered one-click deploy for an empty template');
        assert(s.review.verdict === 'blocked', 'empty template should be blocked');
      }
    },
  },
  {
    name: 'partial service coverage is never branded deploy-ready',
    run: () => {
      const readiness = assessDeliveryReadiness({
        understanding: { confidence: 0.9, analysis: { missingQuestions: [] } },
        services: [{ id: 'lambda' }, { id: 'eks' }],
        coverage: { pct: 50, uncovered: ['eks'], resourceCount: 2 },
        hasTemplate: true,
        blockers: [],
        highs: [],
      });
      assert(readiness.classification === 'partially-supported', `classified as ${readiness.classification}`);
      assert(!readiness.sandboxDeployable, 'partial design was allowed through one-click deploy');
      assert(!readiness.clientReady, 'partial design was branded client-ready');
      assert(readiness.unsupported[0]?.serviceId === 'eks', 'unsupported service was not disclosed');
    },
  },
  {
    name: 'missing requirements become explicit assumptions and fail the client-ready gate',
    run: () => {
      const readiness = assessDeliveryReadiness({
        understanding: { confidence: 0.9, analysis: { missingQuestions: ['What is the recovery objective?'] } },
        services: [{ id: 's3' }],
        coverage: { pct: 100, uncovered: [], resourceCount: 1 },
        hasTemplate: true,
        blockers: [],
        highs: [],
      });
      assert(readiness.assumptions.length === 1, 'missing requirement was silently discarded');
      assert(readiness.assumptions[0].status === 'needs-client-confirmation', 'assumption lacks confirmation status');
      assert(!readiness.clientReady, 'unconfirmed assumption passed client-ready gate');
    },
  },
  {
    name: 'post-deploy evidence is never fabricated during generation',
    run: () => {
      const s = runPipeline(GIGS.serverless);
      for (const id of ['aws-validation', 'health-checks']) {
        const gate = s.review.readiness.evidenceGates.find((g) => g.id === id);
        assert(gate && gate.stage === 'post-deploy', `${id} is not marked post-deploy`);
        assert(gate.passed === false, `${id} was falsely marked as proven`);
      }
    },
  },
  {
    name: 'CFN dependencies are auto-added so no ref dangles',
    run: () => {
      const s = runPipeline(GIGS.ecommerceUK);
      const code = s.artifacts.cfn.code;
      // Anything referencing Vpc must have a Vpc resource
      if (/VpcId:\s*\n?\s*Ref: Vpc/.test(code) || /Ref: Vpc\b/.test(code)) {
        assert(/^\s*Vpc:\s*$/m.test(code), 'template references Vpc but never defines it');
      }
      // Subnets referenced by RDS must exist
      if (/PrivateSubnet1/.test(code)) {
        assert(/^\s*PrivateSubnet1:\s*$/m.test(code), 'references PrivateSubnet1 but never defines it');
      }
      // API Gateway integration must have its Lambda
      if (/HttpApiIntegration/.test(code)) {
        assert(/AppFunction/.test(code), 'API Gateway integration without a Lambda function');
      }
    },
  },
  {
    name: 'no hardcoded database password ends up in a template',
    run: () => {
      const s = runPipeline(GIGS.ecommerceUK);
      const code = s.artifacts.cfn.code || '';
      assert(!/CHANGE_ME/.test(code), 'template still contains a hardcoded placeholder password');
      if (/MasterUserPassword/.test(code)) {
        assert(/DbPassword/.test(code), 'RDS password is not parameterised');
        assert(/NoEcho: true/.test(code), 'DbPassword parameter is missing NoEcho');
      }
    },
  },
  {
    name: 'CAPABILITY_NAMED_IAM is requested exactly when IAM resources exist',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const s = runPipeline(gig);
        const hasIam = /AWS::IAM::/.test(s.artifacts.cfn?.code || '');
        const asksCap = s.deploy.capabilities.includes('CAPABILITY_NAMED_IAM');
        assert(hasIam === asksCap,
          `${key}: IAM resources=${hasIam} but capability requested=${asksCap}`);
      }
    },
  },

  // ── YAML scalar safety — silent CloudFormation rejections ─────────
  {
    name: 'version/date strings are quoted so YAML keeps them as strings',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const code = runPipeline(gig).artifacts.cfn?.code || '';
        if (!code) continue;
        // Bare 2010-09-09 parses as a DATE; CFN wants the string.
        assert(!/AWSTemplateFormatVersion:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(code),
          `${key}: AWSTemplateFormatVersion is unquoted (parses as a date)`);
        // Bare 2012-10-17 in an IAM policy — same problem.
        assert(!/^\s*Version:\s*\d{4}-\d{2}-\d{2}\s*$/m.test(code),
          `${key}: IAM policy Version is unquoted (parses as a date)`);
        // Bare 2.0 parses as the number 2; API Gateway wants "2.0".
        assert(!/PayloadFormatVersion:\s*[\d.]+\s*$/m.test(code),
          `${key}: PayloadFormatVersion is unquoted (parses as a number)`);
      }
    },
  },
  {
    name: 'no bare YAML-reserved scalar survives as a value',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const code = runPipeline(gig).artifacts.cfn?.code || '';
        // `AttributeType: N` would become the boolean false
        assert(!/:\s*(?:N|Y|n|y|on|off|On|Off)\s*$/m.test(code),
          `${key}: a bare YAML-reserved scalar (N/Y/on/off) is used as a value`);
      }
    },
  },
  {
    name: 'generated YAML has no tabs and balanced indentation',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const code = runPipeline(gig).artifacts.cfn?.code || '';
        if (!code) continue;
        assert(!/\t/.test(code), `${key}: template contains a tab (invalid in YAML)`);
        for (const line of code.split('\n')) {
          if (!line.trim()) continue;
          const lead = line.match(/^ */)[0].length;
          assert(lead % 2 === 0, `${key}: odd indentation on line "${line}"`);
        }
      }
    },
  },

  // ── Region routing ────────────────────────────────────────────────
  {
    name: 'a UK gig routes to a UK/EU region, not us-east-1',
    run: () => {
      const s = runPipeline(GIGS.ecommerceUK);
      assert(s.region.primary.startsWith('eu-'),
        `UK gig routed to ${s.region.primary}, expected an eu-* region`);
    },
  },

  // ── Naming ────────────────────────────────────────────────────────
  {
    name: 'names are AWS-legal and not truncated mid-word',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const s = runPipeline(gig);
        const { stackName, bucketPrefix } = s.names;
        // CFN: letters/digits/hyphens, starts with a letter, <=128
        assert(/^[a-zA-Z][a-zA-Z0-9-]*$/.test(stackName), `${key}: illegal stack name "${stackName}"`);
        assert(stackName.length <= 128, `${key}: stack name too long`);
        // S3: lowercase, digits, hyphens only
        assert(/^[a-z0-9-]*$/.test(bucketPrefix), `${key}: illegal bucket prefix "${bucketPrefix}"`);
        // No trailing single-letter fragment from a mid-word cut
        assert(!/-[a-z]$/.test(stackName), `${key}: stack name truncated mid-word: "${stackName}"`);
      }
    },
  },
  {
    name: 'hiring language is stripped out of the project name',
    run: () => {
      const s = runPipeline(GIGS.ecommerceUK);
      const n = s.names.projectName.toLowerCase();
      assert(!/\barchitect\b|\bneeded\b|\bwanted\b/.test(n),
        `project name still reads like a job ad: "${s.names.projectName}"`);
    },
  },

  // ── Blueprint matching ────────────────────────────────────────────
  {
    name: 'a serverless brief matches the serverless blueprint',
    run: () => {
      const s = runPipeline(GIGS.serverless);
      assert(s.blueprints.best, 'no blueprint matched a clearly serverless brief');
      assert(/serverless/i.test(s.blueprints.best.project.title),
        `matched "${s.blueprints.best.project.title}" instead of the serverless blueprint`);
    },
  },
  {
    name: 'a weak match is reported as a custom build, not a false match',
    run: () => {
      const { isCustom, best } = matchBlueprints('Need some help with cloud stuff.', []);
      assert(isCustom && !best, 'claimed a blueprint match for an empty service list');
    },
  },

  // ── Plan ──────────────────────────────────────────────────────────
  {
    name: 'every plan opens with discovery and closes with handover',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const { phases } = runPipeline(gig).plan;
        assert(/discovery/i.test(phases[0].title), `${key}: first phase is not discovery`);
        assert(/verify|hand over/i.test(phases[phases.length - 1].title),
          `${key}: last phase is not handover`);
      }
    },
  },

  // ── Renderability ─────────────────────────────────────────────────
  // React throws "Objects are not valid as a React child" at runtime, and
  // the build won't catch it. Every value the Solution Studio interpolates
  // into JSX is asserted primitive here instead. `grade` and `budget` both
  // shipped as objects and were caught by exactly this check.
  {
    name: 'every field the UI renders is a primitive, not an object',
    run: () => {
      for (const [key, gig] of Object.entries(GIGS)) {
        const s = runPipeline(gig);
        const scalar = (v, path) => {
          if (v === null || v === undefined) return;
          assert(typeof v !== 'object',
            `${key}: ${path} is an object (${JSON.stringify(v).slice(0, 60)}…) — React cannot render it`);
        };

        // Header + names
        scalar(s.names.projectName, 'names.projectName');
        scalar(s.names.stackName, 'names.stackName');
        scalar(s.names.bucketPrefix, 'names.bucketPrefix');
        scalar(s.names.repoName, 'names.repoName');
        scalar(s.analysis.summary, 'analysis.summary');
        scalar(s.analysis.client, 'analysis.client');

        // Region + review
        scalar(s.region.primary, 'region.primary');
        scalar(s.region.confidence, 'region.confidence');
        scalar(s.review.grade, 'review.grade');
        scalar(s.review.gradeLabel, 'review.gradeLabel');
        scalar(s.review.readiness.classification, 'readiness.classification');
        scalar(s.review.readiness.confidenceLabel, 'readiness.confidenceLabel');
        for (const a of s.review.readiness.assumptions) scalar(a.statement, 'readiness.assumption.statement');
        for (const u of s.review.readiness.unsupported) scalar(u.reason, 'readiness.unsupported.reason');
        if (s.review.expert) {
          for (const f of ['score', 'summary', 'criticalCount', 'highCount',
                           'mediumCount', 'lowCount', 'positiveCount', 'expertCount']) {
            scalar(s.review.expert[f], `review.expert.${f}`);
          }
        }

        // Plan
        scalar(s.plan.estimatedDays, 'plan.estimatedDays');
        scalar(s.plan.totalTasks, 'plan.totalTasks');
        scalar(s.plan.timelineLabel, 'plan.timelineLabel');
        for (const ph of s.plan.phases) {
          scalar(ph.title, 'plan.phase.title');
          scalar(ph.durationLabel, 'plan.phase.durationLabel');
          for (const t of ph.tasks) scalar(t, 'plan.phase.task');
        }

        // Services + compliance + questions
        for (const svc of s.services) scalar(svc.label, 'service.label');
        for (const c of s.understanding.compliance) scalar(c.label, 'compliance.label');
        for (const q of (s.analysis.missingQuestions || [])) scalar(q, 'missingQuestion');
        for (const r of (s.region.reasons || [])) scalar(r, 'region.reason');
        scalar(s.understanding.extracted.timeline?.label, 'extracted.timeline.label');

        // Approach
        scalar(s.approach.rationale, 'approach.rationale');
        for (const o of s.approach.allOptions) {
          scalar(o.label, 'approach.option.label');
          scalar(o.blurb, 'approach.option.blurb');
          scalar(o.fullBlurb, 'approach.option.fullBlurb');
        }

        // Findings
        const findings = [...(s.review.expert?.findings || []), ...(s.review.deploy?.findings || [])];
        for (const f of findings) {
          scalar(f.title, 'finding.title');
          scalar(f.body, 'finding.body');
          scalar(f.fix, 'finding.fix');
          scalar(f.severity, 'finding.severity');
          scalar(f.expertName, 'finding.expertName');
        }

        // Blueprint card
        if (s.blueprints.best) {
          scalar(s.blueprints.best.score, 'blueprint.score');
          scalar(s.blueprints.best.project.title, 'blueprint.title');
          scalar(s.blueprints.best.project.tagline, 'blueprint.tagline');
          scalar(s.blueprints.best.project.estLabel, 'blueprint.estLabel');
          scalar(s.blueprints.best.project.difficulty, 'blueprint.difficulty');
          for (const w of s.blueprints.best.why) scalar(w, 'blueprint.why');
        }

        // Deploy panel
        scalar(s.deploy.stackName, 'deploy.stackName');
        scalar(s.deploy.region, 'deploy.region');
        if (s.deploy.coverage) {
          scalar(s.deploy.coverage.pct, 'coverage.pct');
          scalar(s.deploy.coverage.resourceCount, 'coverage.resourceCount');
          for (const id of s.deploy.coverage.covered) scalar(id, 'coverage.covered[]');
          for (const id of s.deploy.coverage.uncovered) scalar(id, 'coverage.uncovered[]');
          for (const id of s.deploy.coverage.autoAdded) scalar(id, 'coverage.autoAdded[]');
        }
      }
    },
  },
  {
    name: 'saved records stay primitive + small enough for localStorage',
    run: () => {
      const s = runPipeline(GIGS.ecommerceUK);
      // Mirror saveSolution's record shape without touching localStorage
      const record = {
        projectName: s.names.projectName,
        grade: s.review.grade,
        serviceLabels: s.services.map((x) => x.label),
        verdict: s.review.verdict,
      };
      assert(typeof record.grade !== 'object', 'saved grade is an object');
      for (const l of record.serviceLabels) assert(typeof l === 'string', 'service label is not a string');
      const size = JSON.stringify({ ...record, templates: s.artifacts }).length;
      assert(size < 500_000, `saved record is ${size} bytes — will blow the storage quota`);
    },
  },

  // ── Helpers ───────────────────────────────────────────────────────
  {
    name: 'gigToBrief keeps budget, location and skills',
    run: () => {
      const brief = gigToBrief(GIGS.ecommerceUK);
      assert(brief.includes('8,000'), 'budget lost');
      assert(brief.includes('United Kingdom'), 'location lost');
      assert(brief.includes('terraform'), 'skills lost');
    },
  },
  {
    name: 'a pasted fixed budget stays attached to the generated solution',
    run: () => {
      const brief = 'Deploy an S3 and CloudFront website. Fixed budget $200. Client approval is required.';
      assert(extractBudgetFromBrief(brief) === '$200', 'budget parser lost the stated fixed price');
      assert(runPipeline(brief).input.budget === '$200', 'pipeline did not carry the budget into downstream actions');
    },
  },
  {
    name: 'deriveNames never returns an empty name',
    run: () => {
      const n = deriveNames('', { extracted: {}, blueprint: null, services: [] });
      assert(n.projectName && n.projectName.length > 0, 'empty project name');
      assert(n.stackName && n.stackName.length > 0, 'empty stack name');
    },
  },
];

// ════════════════════════════════════════════════════════════════════
// Runner
// ════════════════════════════════════════════════════════════════════
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

export function runPipelineTests() {
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

export function printPipelineReport(report) {
  const lines = [];
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('  GIG → SOLUTION PIPELINE TESTS');
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
