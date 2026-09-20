import {
  buildIntakeForm, intakeAsEmail, intakeAsText, nameSuggestions, outstanding, slugForAws,
} from '../clientIntake.js';

/**
 * The intake form exists to ask a client what the project genuinely does
 * not know. Two ways it could be worse than useless:
 *
 *   - asking for something already agreed, which reads as not listening;
 *   - inventing an answer and presenting it as settled.
 *
 * These tests pin both, and pin that questions only appear when the
 * services in scope make them relevant.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const PROJECT = {
  id: 'sol-1',
  title: 'Secure static website for UK retailer',
  client: 'Northwind Retail',
  region: 'eu-west-2',
  services: ['Amazon S3', 'Amazon CloudFront'],
  artifacts: {
    solution: [{
      id: 'sol-1',
      projectName: 'uk-retailer-site',
      stackName: 'uk-retailer-site-stack',
      serviceIds: ['s3', 'cloudfront'],
    }],
  },
};

const ids = (form) => form.sections.flatMap((s) => s.questions.map((q) => q.id));

export function runClientIntakeTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // ───────── it asks only what it does not know ─────────

  test('a known client is not asked for again', () => {
    assert(!ids(buildIntakeForm(PROJECT)).includes('companyName'),
      'it asked for the company name it already has');
    assert(ids(buildIntakeForm({ ...PROJECT, client: null })).includes('companyName'),
      'it failed to ask for a company name it does not have');
  });

  test('what is already known is listed for confirmation, not asked', () => {
    const form = buildIntakeForm(PROJECT);
    const labels = form.knownFacts.map((f) => f.label);
    for (const expected of ['Project', 'Client', 'Proposed AWS region']) {
      assert(labels.includes(expected), 'missing from the known facts: ' + expected);
    }
  });

  test('a known region is put up for confirmation with its own name', () => {
    const form = buildIntakeForm(PROJECT);
    const question = form.sections.flatMap((s) => s.questions).find((q) => q.id === 'regionConfirm');
    assert(/eu-west-2/.test(question.label), 'the region question does not name the region: ' + question.label);
    assert(question.options.some((o) => /eu-west-2/.test(o)), 'confirming the planned region was not offered');
  });

  test('an unknown region is asked as an open question', () => {
    const form = buildIntakeForm({ ...PROJECT, region: null });
    const question = form.sections.flatMap((s) => s.questions).find((q) => q.id === 'regionConfirm');
    assert(/which region/i.test(question.label), 'it assumed a region it does not have: ' + question.label);
  });

  // ───────── questions follow the services in scope ─────────

  test('a site with CloudFront is asked about its domain', () => {
    assert(ids(buildIntakeForm(PROJECT)).includes('domainName'), 'no domain question for a CloudFront project');
  });

  test('a project with no web front end is not asked about domains', () => {
    const batch = { ...PROJECT, services: ['AWS Lambda'], artifacts: { solution: [{ serviceIds: ['lambda'] }] } };
    assert(!ids(buildIntakeForm(batch)).includes('domainName'), 'it asked about a domain for a job with no web front end');
  });

  test('a database project is asked which engine', () => {
    const db = { ...PROJECT, services: ['Amazon RDS'], artifacts: { solution: [{ serviceIds: ['rds'] }] } };
    assert(ids(buildIntakeForm(db)).includes('dbEngine'), 'no engine question for an RDS project');
  });

  test('a project that stores nothing is not asked about data retention', () => {
    const none = { ...PROJECT, services: ['Amazon CloudWatch'], artifacts: { solution: [{ serviceIds: ['cloudwatch'] }] } };
    assert(!ids(buildIntakeForm(none)).includes('retention'), 'it asked about retention for a job that stores nothing');
  });

  // ───────── the things every engagement needs ─────────

  test('the account, the bill and the acceptance test are always asked', () => {
    const asked = ids(buildIntakeForm(PROJECT));
    for (const id of ['accountStatus', 'monthlyCeiling', 'successCriteria', 'rootHolder']) {
      assert(asked.includes(id), 'missing a question every engagement needs: ' + id);
    }
  });

  test('access is offered without requiring long-lived keys', () => {
    const question = buildIntakeForm(PROJECT).sections.flatMap((s) => s.questions).find((q) => q.id === 'accessMethod');
    assert(question.options.some((o) => /role/i.test(o)), 'assuming a role was not offered as an option');
    assert(/role/i.test(question.hint), 'the hint does not steer away from long-lived keys');
  });

  // ───────── naming is suggested, never decided ─────────

  test('names come from the solution when it has them', () => {
    const names = nameSuggestions(PROJECT);
    assert(names.projectName === 'uk-retailer-site', 'ignored the name the templates already use: ' + names.projectName);
    assert(names.stackName === 'uk-retailer-site-stack', 'ignored the stack name: ' + names.stackName);
    assert(names.fromSolution === true, 'did not record that the names came from the solution');
  });

  test('names are derived from the title when the solution has none', () => {
    const names = nameSuggestions({ title: 'Secure Static Website for UK Retailer!' });
    assert(/^[a-z0-9-]+$/.test(names.projectName), 'the derived name is not AWS-safe: ' + names.projectName);
    assert(names.fromSolution === false, 'claimed a derived name came from the solution');
  });

  test('the naming question offers a suggestion the client can overrule', () => {
    const question = buildIntakeForm(PROJECT).sections.flatMap((s) => s.questions).find((q) => q.id === 'projectName');
    assert(question.prefill === 'uk-retailer-site', 'the suggestion was not prefilled: ' + question.prefill);
    assert(/change it|convention/i.test(question.hint), 'the suggestion is stated as settled rather than offered');
  });

  test('a slug is always usable as an AWS name', () => {
    assert(slugForAws('  My Client!! Website  ') === 'my-client-website', 'punctuation survived');
    assert(slugForAws('') === 'aws-project', 'an empty title produced an unusable name');
    assert(slugForAws('x'.repeat(80)).length <= 32, 'the slug exceeded the length bound');
    assert(!slugForAws('ends with a symbol ---').endsWith('-'), 'the slug ends in a hyphen');
  });

  // ───────── the output you actually send ─────────

  test('the text form contains every question and marks the required ones', () => {
    const form = buildIntakeForm(PROJECT);
    const text = intakeAsText(form);
    for (const s of form.sections) {
      for (const question of s.questions) {
        assert(text.includes(question.label), 'a question is missing from the text: ' + question.label);
      }
    }
    assert(text.includes('*'), 'required questions are not marked');
    assert(text.includes('Northwind Retail'), 'the client is not named');
  });

  test('the email has a subject and addresses the client', () => {
    const { subject, body } = intakeAsEmail(buildIntakeForm(PROJECT), { author: 'David Gaisey-Otoo' });
    assert(subject.includes('Secure static website'), 'the subject does not name the project: ' + subject);
    assert(/^Hi Northwind/m.test(body), 'the email does not address the client');
    assert(body.includes('David Gaisey-Otoo'), 'the email is unsigned');
  });

  test('outstanding reports the required questions still unanswered', () => {
    const form = buildIntakeForm(PROJECT);
    assert(outstanding(form, {}).length === form.requiredCount, 'the outstanding count disagrees with the form');
    const answered = {};
    for (const s of form.sections) for (const q of s.questions) if (q.required) answered[q.id] = 'answered';
    assert(outstanding(form, answered).length === 0, 'it still reported gaps after everything was answered');
  });

  test('a blank answer does not count as answered', () => {
    const form = buildIntakeForm(PROJECT);
    const blanks = {};
    for (const s of form.sections) for (const q of s.questions) if (q.required) blanks[q.id] = '   ';
    assert(outstanding(form, blanks).length === form.requiredCount, 'whitespace was accepted as an answer');
  });

  // ───────── it must not fall over ─────────

  test('an empty project still produces a usable form', () => {
    const form = buildIntakeForm({});
    assert(form.sections.length > 0, 'no sections for a project with nothing known');
    assert(form.questionCount > 0, 'no questions for a project with nothing known');
    assert(typeof intakeAsText(form) === 'string', 'the text form broke on an empty project');
    assert(form.knownFacts.length === 0, 'it claimed to know something about an empty project');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
