import { auditForClient, buildClientReport, classifyDocument, scanForSecrets } from '../clientReport.js';

/**
 * Two of the "evidence" screenshots in this project turned out to be
 * screenshots of this application — the Learn/Exam sidebar, a Connect
 * GitHub button, the account credits balance and a profile name that was
 * not even the right one. Sent to a client as evidence of AWS work, that
 * is worse than sending nothing.
 *
 * So the report has to do two jobs: build something presentable from the
 * records that exist, and refuse to let internal material go out unnoticed.
 * It never silently drops anything — what a client sees is the author's
 * decision — but it will not let that decision be made by accident.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const PROJECT = {
  id: 'p1',
  title: 'AWS account setup and hardening',
  client: 'Northwind Retail',
  region: 'eu-west-2',
  services: ['IAM', 'AWS Budgets'],
  createdAt: '2026-05-23',
  artifacts: {
    solution: [{
      id: 's1',
      brief: 'Harden a new AWS account: MFA, least privilege, a budget and cost alerts.',
      approach: 'Console-led hardening with IaC for the budget',
      readiness: { classification: 'client-ready', assumptions: ['The client owns the root email'], unsupported: [] },
    }],
    script: [{ id: 'sc1', name: 'CloudFormation template', code: 'AWSTemplateFormatVersion: "2010-09-09"' }],
    plan: [{ id: 'pl1', name: 'Plan', phases: [{ name: 'Discovery', durationDays: 2, tasks: [{ name: 'Confirm region' }] }] }],
    document: [
      { id: 'd1', name: 'AWS Account Setup Evidence', localPath: 'evidence\\Account_Setup_Evidence.docx', createdAt: '2026-09-08' },
      { id: 'd2', name: 'Account checklist — screenshot', localPath: 'evidence\\launchpad-account-checklist.png' },
      { id: 'd3', name: 'Challenges and Improvements', category: 'Personal', status: 'Private local register' },
    ],
    architecture: [], caseStudy: [], proposal: [], email: [],
    contract: [], invoice: [], deck: [], portfolio: [],
  },
};

export function runClientReportTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // ───────── what must never reach a client ─────────

  test('a screenshot of this app is not client evidence', () => {
    const verdict = classifyDocument({ name: 'Account checklist', localPath: 'evidence\\launchpad-account-checklist.png' });
    assert(!verdict.clientSafe, 'a screenshot of the app passed as client evidence');
    assert(/application|sidebar|credits/i.test(verdict.reason), 'the reason does not explain the problem: ' + verdict.reason);
  });

  test('a private register is not client evidence', () => {
    assert(!classifyDocument({ name: 'Challenges', status: 'Private local register' }).clientSafe, 'a private register passed');
    assert(!classifyDocument({ name: 'Notes', category: 'Personal' }).clientSafe, 'a personal document passed');
  });

  test('study material is not a deliverable', () => {
    assert(!classifyDocument({ name: 'AWS Hands-On Practice Workbook' }).clientSafe, 'a practice workbook passed as a deliverable');
  });

  test('genuine evidence is allowed through', () => {
    const verdict = classifyDocument({ name: 'AWS Account Setup Evidence', localPath: 'evidence\\Account_Setup_Evidence.docx' });
    assert(verdict.clientSafe, 'real evidence was wrongly withheld');
  });

  test('the scanner finds identifiers that must not travel', () => {
    const text = 'Account: 851725590283 owned by someone@example.com, key AKIAIOSFODNN7EXAMPLE, host 10.0.4.19.';
    const types = scanForSecrets(text).map((f) => f.type);
    for (const expected of ['AWS account number', 'AWS access key id', 'email address', 'IP address']) {
      assert(types.includes(expected), 'missed: ' + expected);
    }
  });

  test('the scanner never prints the thing it is warning about', () => {
    const findings = scanForSecrets('Account 851725590283 and mail dave@example.com');
    for (const f of findings) {
      assert(!/851725590283/.test(f.sample), 'the account number was printed in full');
      assert(!/dave@example\.com/.test(f.sample), 'the address was printed in full');
      assert(/\*/.test(f.sample), 'nothing was masked: ' + f.sample);
    }
  });

  test('a version number is not mistaken for an address', () => {
    assert(scanForSecrets('Released in v1.7.0 on 2026-05-23').length === 0,
      'a version string was reported as sensitive');
  });

  test('a clean document reports nothing', () => {
    assert(scanForSecrets('An S3 origin behind CloudFront with HTTPS.').length === 0, 'a false positive on clean text');
    assert(scanForSecrets('').length === 0, 'empty text produced findings');
  });

  test('a document marked internal is blocked with its own reason', () => {
    const verdict = classifyDocument({
      name: 'AWS Account Setup Master Report',
      internal: true,
      internalReason: 'a record of your own AWS account — it contains the account number',
    });
    assert(!verdict.clientSafe, 'a document marked internal was passed as client-safe');
    assert(/your own AWS account/.test(verdict.reason), 'the record\u2019s own reason was discarded: ' + verdict.reason);
  });

  // ───────── the audit ─────────

  test('the audit names the documents that must not go out', () => {
    const blocks = auditForClient(PROJECT).filter((f) => f.level === 'block');
    assert(blocks.length >= 2, `expected at least 2 blocking findings, got ${blocks.length}`);
    assert(blocks.some((f) => /checklist/i.test(f.message)), 'the app screenshot was not flagged');
    assert(blocks.some((f) => /Challenges/i.test(f.message)), 'the private register was not flagged');
  });

  test('an unconfirmed assumption is raised, not buried', () => {
    const warnings = auditForClient(PROJECT).filter((f) => f.level === 'warn');
    assert(warnings.some((f) => /assumption/i.test(f.message)), 'assumptions were not surfaced');
  });

  test('a claim the evidence does not support blocks the report', () => {
    const risky = { ...PROJECT, artifacts: { ...PROJECT.artifacts,
      solution: [{ readiness: { classification: 'review-required', assumptions: [], unsupported: ['Costs were never measured'] } }] } };
    const blocks = auditForClient(risky).filter((f) => f.level === 'block');
    assert(blocks.some((f) => /not supported/i.test(f.message)), 'an unsupported claim was not blocked');
  });

  test('free-tier sizing is flagged before it is sold as production', () => {
    const testSized = { ...PROJECT, artifacts: { ...PROJECT.artifacts,
      script: [{ name: 'Terraform', code: '# TEST DEPLOYMENT — free-tier sizing, not for production use' }] } };
    assert(auditForClient(testSized).some((f) => /free tier/i.test(f.message)), 'test sizing was not flagged');
  });

  test('a project with no usable evidence says so', () => {
    const bare = { ...PROJECT, artifacts: { ...PROJECT.artifacts, document: [] } };
    assert(auditForClient(bare).some((f) => /no client-safe evidence/i.test(f.message)),
      'a report with nothing behind it was not questioned');
  });

  test('a structured assumption renders as its sentence, never as an object', () => {
    // assessDeliveryReadiness emits { id, statement, status, source }. The
    // report rendered the record, so a client document listed seven
    // assumptions reading "[object Object]".
    const project = { ...PROJECT, artifacts: { ...PROJECT.artifacts,
      solution: [{ readiness: { classification: 'review-required', assumptions: [
        { id: 'assumption-1', statement: 'No confirmed answer was provided for: which domain?', status: 'needs-client-confirmation' },
      ], unsupported: [] } }] } };
    const body = buildClientReport(project, { author: 'D' }).markdown;
    assert(!/\[object Object\]/.test(body), 'an object leaked into the client document');
    assert(/which domain/.test(body), 'the assumption text was lost: ' + body.slice(0, 200));
    const warn = auditForClient(project).find((f) => /assumption/i.test(f.message));
    assert(!/\[object Object\]/.test(String(warn.detail)), 'an object leaked into the audit');
    assert(/which domain/.test(warn.detail), 'the audit lost the assumption text');
  });

  test('an unsupported claim names the service and the reason', () => {
    const project = { ...PROJECT, artifacts: { ...PROJECT.artifacts,
      solution: [{ readiness: { classification: 'review-required', assumptions: [], unsupported: [
        { serviceId: 'route53', reason: 'no verified implementation for this service' },
      ] } }] } };
    const block = auditForClient(project).find((f) => /not supported/i.test(f.message));
    assert(!/\[object Object\]/.test(String(block.detail)), 'an object leaked into the audit');
    assert(/route53/.test(block.detail) && /verified implementation/.test(block.detail),
      'the claim lost its service or its reason: ' + block.detail);
  });

  test('older records holding plain strings still work', () => {
    const project = { ...PROJECT, artifacts: { ...PROJECT.artifacts,
      solution: [{ readiness: { classification: 'review-required', assumptions: ['The client owns the domain'], unsupported: [] } }] } };
    const body = buildClientReport(project, { author: 'D' }).markdown;
    assert(/client owns the domain/.test(body), 'a plain-string assumption was dropped');
  });

  test('an unreadable entry is dropped rather than printed', () => {
    const project = { ...PROJECT, artifacts: { ...PROJECT.artifacts,
      solution: [{ readiness: { classification: 'review-required', assumptions: [{}, null, '   '], unsupported: [] } }] } };
    const body = buildClientReport(project, { author: 'D' }).markdown;
    assert(!/\[object Object\]/.test(body), 'an unreadable entry was printed');
    assert(!/^- *$/m.test(body), 'an empty bullet was emitted');
    assert(!auditForClient(project).some((f) => /assumption/i.test(f.message)),
      'an unreadable assumption was raised as a finding with nothing to say');
  });

  // ───────── the document itself ─────────

  test('the report is built from records that exist', () => {
    const report = buildClientReport(PROJECT, { author: 'David Gaisey-Otoo' });
    for (const section of ['Engagement', 'Scope', 'What was delivered', 'Delivery plan', 'Evidence', 'Assumptions', 'Running cost']) {
      assert(report.markdown.includes(section), 'missing section: ' + section);
    }
    assert(report.markdown.includes('eu-west-2'), 'the region is missing');
    assert(report.markdown.includes('Confirm region'), 'the plan tasks are missing');
  });

  test('internal material is kept out of the document body', () => {
    const body = buildClientReport(PROJECT, { author: 'D' }).markdown;
    assert(!/launchpad/i.test(body), 'an app screenshot was listed as evidence');
    assert(!/Challenges and Improvements/.test(body), 'the private register was listed as evidence');
    assert(/AWS Account Setup Evidence/.test(body), 'genuine evidence was dropped along with the rest');
  });

  test('cost is stated as an estimate and never as a guarantee', () => {
    const body = buildClientReport(PROJECT, { author: 'D' }).markdown;
    assert(/estimate/i.test(body), 'cost is not described as an estimate');
    // The word 'guaranteed' is fine when it is being denied. What must
    // never appear is an affirmative promise about the bill.
    assert(/not a guaranteed bill/i.test(body), 'the estimate is not explicitly disclaimed');
    assert(!/(is|will be|are) guaranteed|guaranteed to be (free|zero)|will cost (you )?nothing/i.test(body),
      'an affirmative cost guarantee leaked into a client document');
    assert(/budget alarm/i.test(body), 'the client is not told to set a ceiling');
  });

  test('the document carries who it is for and who wrote it', () => {
    const report = buildClientReport(PROJECT, { author: 'David Gaisey-Otoo', company: 'Gaisey Cloud' });
    const labels = report.meta.map((m) => m.label);
    assert(labels.includes('Prepared for') && labels.includes('Prepared by'), 'attribution missing: ' + labels.join(', '));
    assert(report.authorName === 'David Gaisey-Otoo', 'the author was lost');
    assert(report.authorCompany === 'Gaisey Cloud', 'the company was lost');
  });

  test('a section with no data is left out, not invented', () => {
    const thin = { id: 'x', title: 'Bare project', artifacts: { solution: [], script: [], plan: [], document: [], architecture: [], caseStudy: [] } };
    const report = buildClientReport(thin, { author: 'D' });
    assert(!report.markdown.includes('Delivery plan'), 'a plan section appeared with no plan');
    assert(!report.markdown.includes('Evidence'), 'an evidence section appeared with no evidence');
    assert(typeof report.markdown === 'string', 'a bare project broke the builder');
  });

  test('an empty project does not throw', () => {
    const report = buildClientReport({}, {});
    assert(typeof report.markdown === 'string', 'an empty project broke the builder');
    assert(Array.isArray(report.audit), 'the audit broke on an empty project');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
