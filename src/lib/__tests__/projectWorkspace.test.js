import { artifactTitle, buildWorkspace, normaliseTitle, pool, titlesMatch, WORKSPACE_KINDS } from '../projectWorkspace.js';

/**
 * Everything produced for one job lived in a different store, so nothing
 * could answer "what do I have for this client?".
 *
 * The risk in joining them up is filing an artifact under the wrong
 * project — a proposal shown against the wrong client is worse than one
 * shown against none. These tests pin both halves: things that belong
 * together are gathered, and things that do not are left unassigned.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runProjectWorkspaceTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // ───────────── title matching ─────────────

  test('the same job written two ways is recognised', () => {
    assert(titlesMatch('Secure static website on AWS', 'AWS secure static website'), 'word order defeated it');
    assert(titlesMatch('Secure static site for a UK retailer', 'Secure static site'), 'a longer restatement was missed');
  });

  test('two different jobs are not merged', () => {
    assert(!titlesMatch('Secure static website', 'Kubernetes cluster migration'), 'unrelated jobs were merged');
    assert(!titlesMatch('S3 backup automation', 'RDS performance tuning'), 'unrelated jobs were merged');
  });

  test('filler words do not make everything match', () => {
    // Without stripping, "AWS project for the client" matches almost
    // anything; with it, near-empty titles must not match at all.
    assert(!titlesMatch('AWS project', 'AWS solution'), 'two content-free titles were merged');
    assert(normaliseTitle('AWS Project for the Client').length < 10, 'filler words survived normalisation');
  });

  // ───────────── gathering ─────────────

  const stores = {
    solutions: [{
      id: 'sol-1', title: 'Secure static website for UK retailer',
      region: 'eu-west-2', services: ['s3', 'cloudfront'],
      createdAt: '2026-09-10T09:00:00Z', architecture: { nodes: 3 },
    }],
    proposals: [
      { id: 'p-1', gigTitle: 'Secure static website for UK retailer', createdAt: '2026-09-11T09:00:00Z' },
      { id: 'p-2', gigTitle: 'Kubernetes cluster migration', createdAt: '2026-09-12T09:00:00Z' },
    ],
    emails: [
      { id: 'e-1', projectId: 'sol-1', subject: 'Following up', at: '2026-09-12T10:00:00Z' },
      { id: 'e-2', subject: 'Unrelated enquiry about something else entirely', at: '2026-09-13T10:00:00Z' },
    ],
    invoices: [{ id: 'i-1', projectTitle: 'Secure static website for UK retailer', amount: 800 }],
    documents: [{ id: 'd-1', name: 'Secure static website for UK retailer — runbook' }],
    portfolio: { 'port-1': { title: 'Secure static website for UK retailer', status: 'complete' } },
  };

  test('everything for one job lands in one container', () => {
    const ws = buildWorkspace(stores);
    const project = ws.projects.find((p) => /static website/i.test(p.title));
    assert(project, 'the project was not created');
    assert(project.artifacts.solution.length === 1, 'solution missing');
    assert(project.artifacts.proposal.length === 1, `expected 1 proposal, got ${project.artifacts.proposal.length}`);
    assert(project.artifacts.email.length === 1, 'email not linked by projectId');
    assert(project.artifacts.invoice.length === 1, 'invoice missing');
    assert(project.artifacts.document.length === 1, 'document missing');
    assert(project.artifacts.portfolio.length === 1, 'portfolio entry missing');
    assert(project.artifacts.architecture.length === 1, 'architecture missing');
  });

  test('the container carries the job\'s facts', () => {
    const p = buildWorkspace(stores).projects.find((x) => /static website/i.test(x.title));
    assert(p.region === 'eu-west-2', `region lost: ${p.region}`);
    assert(p.services.includes('s3') && p.services.includes('cloudfront'), `services lost: ${p.services}`);
    assert(p.artifactCount >= 7, `artifact count wrong: ${p.artifactCount}`);
  });

  test('an unrelated proposal is not filed under the wrong project', () => {
    const ws = buildWorkspace(stores);
    const wrong = ws.projects.find((p) => /static website/i.test(p.title))
      .artifacts.proposal.some((x) => /kubernetes/i.test(x.gigTitle));
    assert(!wrong, 'a Kubernetes proposal was filed under the static website job');
  });

  test('what cannot be placed is listed as unassigned, not hidden', () => {
    const ws = buildWorkspace(stores);
    const orphanEmails = ws.unassigned.email.length;
    assert(orphanEmails === 1, `expected 1 unassigned email, got ${orphanEmails}`);
    const allProposals = ws.projects.flatMap((p) => p.artifacts.proposal).length + ws.unassigned.proposal.length;
    assert(allProposals === 2, 'a proposal went missing entirely');
  });

  // ───────────── the pool view ─────────────

  test('the pool shows every item of a kind with its project', () => {
    const ws = buildWorkspace(stores);
    const all = pool(ws, 'proposal');
    assert(all.length === 2, `pool lost a proposal: ${all.length}`);
    const linked = all.find((x) => /static website/i.test(x.gigTitle));
    assert(linked.__project, 'a linked proposal lost its project label');
    const orphan = all.find((x) => /kubernetes/i.test(x.gigTitle));
    assert(orphan.__project === null, 'an unassigned proposal was given a project');
  });

  test('totals count everything, assigned or not', () => {
    const t = buildWorkspace(stores).totals;
    assert(t.proposal === 2, `proposal total wrong: ${t.proposal}`);
    assert(t.email === 2, `email total wrong: ${t.email}`);
    assert(t.projects >= 1, 'no projects counted');
  });

  // ───────────── it must not fall over ─────────────

  test('an empty app produces an empty workspace, not an error', () => {
    const ws = buildWorkspace({});
    assert(Array.isArray(ws.projects) && ws.projects.length === 0, 'empty stores did not give an empty list');
    assert(ws.totals.projects === 0, 'counted projects that do not exist');
    assert(Array.isArray(pool(ws, 'proposal')), 'pool broke on an empty workspace');
  });

  test('malformed records do not take the workspace down', () => {
    const ws = buildWorkspace({
      solutions: [{}, { id: 'x' }],
      proposals: [{}, null].filter(Boolean),
      emails: [{ id: 'e' }],
      portfolio: { bad: null },
    });
    assert(Array.isArray(ws.projects), 'workspace failed on malformed input');
  });

  test('projects are ordered with the most recent work first', () => {
    const ws = buildWorkspace({
      solutions: [
        { id: 'old', title: 'Older job about databases', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
        { id: 'new', title: 'Newer job about networking', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z' },
      ],
    });
    assert(/networking/i.test(ws.projects[0].title), `wrong order: ${ws.projects.map((p) => p.title)}`);
  });

  // ───────────── work the app already knew about ─────────────

  test('a completed case study is a project, not just a document', () => {
    // Real delivered work was catalogued and rendered on the documents
    // page, while the workspace reported having no projects at all.
    const ws = buildWorkspace({
      caseStudies: [{
        id: 'aws-static-hosting-lifecycle-2026',
        title: 'AWS Static Application Hosting — Deploy, Validate and Teardown',
        completedAt: '2026-09-12',
      }],
    });
    assert(ws.projects.length === 1, `expected 1 project, got ${ws.projects.length}`);
    assert(ws.projects[0].artifacts.caseStudy.length === 1, 'the case study was not filed');
    assert(ws.projects[0].createdAt === '2026-09-12', `date lost: ${ws.projects[0].createdAt}`);
    assert(ws.totals.projects === 1, 'the project was not counted');
  });

  test('a case study and a solution for the same job stay one project', () => {
    const ws = buildWorkspace({
      solutions: [{ id: 'sol-9', title: 'Secure static website for UK retailer', region: 'eu-west-2' }],
      caseStudies: [{ id: 'cs-9', title: 'Secure static website for UK retailer', completedAt: '2026-09-12' }],
    });
    assert(ws.projects.length === 1, `the same job split into ${ws.projects.length} projects`);
    assert(ws.projects[0].region === 'eu-west-2', 'the region was lost when merging');
  });

  test('a document matching no project is surfaced, not attached to unrelated work', () => {
    const ws = buildWorkspace({
      caseStudies: [{ id: 'cs-1', title: 'AWS Static Application Hosting — Deploy, Validate and Teardown' }],
      documents: [{ id: 'doc-1', title: 'AWS Identity and Account Security Assessment' }],
    });
    assert(ws.projects[0].artifacts.document.length === 0, 'an unrelated document was filed under the hosting project');
    assert(ws.unassigned.document.length === 1, 'the document vanished instead of being listed');
    assert(ws.totals.document === 1, 'an unassigned document was not counted');
  });

  test('a portfolio entry carries its title and services into the project', () => {
    // The store keys entries by catalogue id and saves only progress, so
    // a project rendered straight from it showed as the slug 'p-s3-cf'
    // with one row reading 'Portfolio record'.
    const ws = buildWorkspace({
      portfolio: {
        'p-s3-cf': {
          title: 'S3 Static Website with CloudFront',
          services: ['s3', 'cloudfront', 'route53', 'acm'],
          status: 'in-progress',
        },
      },
    });
    assert(ws.projects.length === 1, 'no project was created from the portfolio entry');
    assert(ws.projects[0].title === 'S3 Static Website with CloudFront', `title not used: ${ws.projects[0].title}`);
    assert(ws.projects[0].services.includes('cloudfront'), `services lost: ${ws.projects[0].services}`);
    assert(ws.projects[0].artifacts.portfolio[0].id === 'p-s3-cf', 'the id needed for the deep link was lost');
  });

  // ───────── the field names real records actually use ─────────

  const REAL = {
    solutions: [{
      id: 'sol-real', title: 'Secure static website for UK retailer',
      projectName: 'uk-retailer-site', stackName: 'uk-retailer-site-stack',
      region: 'eu-west-2', serviceIds: ['s3', 'cloudfront'],
      serviceLabels: ['Amazon S3', 'Amazon CloudFront'],
      savedAt: '2026-09-10T09:00:00Z',
      templates: {
        cfn: 'AWSTemplateFormatVersion: 2010-09-09',
        terraform: 'resource "aws_s3_bucket" "site" {}',
        cli: 'aws s3 mb s3://uk-retailer-site',
      },
      plan: { id: 'plan-1', name: 'Secure static website for UK retailer', phases: [] },
    }],
    // FreelanceContext writes jobTitle + clientName, never gigTitle.
    proposals: [{ id: 'pr-1', jobTitle: 'Secure static website for UK retailer', clientName: 'Northwind Retail', sentAt: '2026-09-11T09:00:00Z' }],
    // Invoices carry a client and no project title at all.
    invoices: [{ id: 'inv-1', number: 'INV-0001', clientName: 'Northwind Retail', issuedAt: '2026-09-20T09:00:00Z', lineItems: [] }],
    // buildPlan writes name + clientName.
    plans: [{ id: 'pl-1', name: 'Secure static website for UK retailer', clientName: 'Northwind Retail', createdAt: '2026-09-12T09:00:00Z' }],
    // buildDeliveryPackage writes projectTitle + diagram.
    documents: [{ id: 'dl-1', kind: 'delivery', projectTitle: 'Secure static website for UK retailer', clientName: 'Northwind Retail', diagram: { nodes: 4 }, createdAt: '2026-09-13T09:00:00Z' }],
    contracts: [{ id: 'ct-1', kind: 'contract', title: 'Secure static website for UK retailer', createdAt: '2026-09-11T10:00:00Z' }],
    emails: [{ id: 'em-1', projectId: 'sol-real', subject: 'Scope confirmed', at: '2026-09-12T10:00:00Z' }],
  };

  test('a real proposal joins its project by jobTitle', () => {
    const ws = buildWorkspace(REAL);
    const p = ws.projects.find((x) => /static website/i.test(x.title));
    assert(p.artifacts.proposal.length === 1, 'jobTitle was not read, so the proposal never joined');
    assert(p.client === 'Northwind Retail', 'the client name was not picked up: ' + p.client);
  });

  test('the generated templates are artifacts you can open', () => {
    const p = buildWorkspace(REAL).projects.find((x) => /static website/i.test(x.title));
    const formats = p.artifacts.script.map((s) => s.format).sort();
    assert(formats.join(',') === 'cfn,cli,terraform', 'templates missing: ' + formats.join(','));
    const cli = p.artifacts.script.find((s) => s.format === 'cli');
    assert(cli.code.includes('aws s3 mb'), 'the commands were not carried through');
    assert(cli.name === 'AWS CLI commands', 'the template has no readable name: ' + cli.name);
  });

  test('the solution plan appears as the project plan', () => {
    const p = buildWorkspace(REAL).projects.find((x) => /static website/i.test(x.title));
    assert(p.artifacts.plan.length >= 1, 'the plan inside the solution was dropped');
    assert(p.artifacts.plan.some((x) => x.solutionId === 'sol-real'), 'the plan lost its solution link');
  });

  test('a solution keeps its service labels, region and save date', () => {
    const p = buildWorkspace(REAL).projects.find((x) => /static website/i.test(x.title));
    assert(p.region === 'eu-west-2', 'region lost: ' + p.region);
    assert(p.services.includes('Amazon S3'), 'serviceLabels lost: ' + p.services.join(','));
    assert(p.createdAt === '2026-09-10T09:00:00Z', 'savedAt was not read: ' + p.createdAt);
  });

  test('a delivery package surfaces its diagram as architecture', () => {
    const p = buildWorkspace(REAL).projects.find((x) => /static website/i.test(x.title));
    assert(p.artifacts.architecture.length === 1, 'the only stored diagram was not surfaced');
    assert(p.artifacts.architecture[0].fromDocument === 'dl-1', 'the diagram lost its source');
  });

  test('an invoice with only a client joins when there is one candidate', () => {
    const p = buildWorkspace(REAL).projects.find((x) => /static website/i.test(x.title));
    assert(p.artifacts.invoice.length === 1, 'an invoice carrying only a client name was never placed');
  });

  test('an invoice is NOT guessed when a client has two jobs', () => {
    const ws = buildWorkspace({
      solutions: [
        { id: 's1', title: 'Secure static website', clientName: 'Northwind Retail', savedAt: '2026-09-01T00:00:00Z' },
        { id: 's2', title: 'Kubernetes cluster migration', clientName: 'Northwind Retail', savedAt: '2026-09-02T00:00:00Z' },
      ],
      invoices: [{ id: 'inv-x', clientName: 'Northwind Retail', issuedAt: '2026-09-20T00:00:00Z' }],
    });
    const placed = ws.projects.some((p) => p.artifacts.invoice.length > 0);
    assert(!placed, 'an invoice was filed against one of two equally likely jobs');
    assert(ws.unassigned.invoice.length === 1, 'the ambiguous invoice vanished instead of being listed');
  });

  test('everything for the job lands in one container', () => {
    const p = buildWorkspace(REAL).projects.find((x) => /static website/i.test(x.title));
    const present = WORKSPACE_KINDS.filter((k) => p.artifacts[k].length);
    for (const kind of ['solution', 'architecture', 'script', 'plan', 'proposal', 'email', 'contract', 'invoice', 'document']) {
      assert(present.includes(kind), 'missing from the container: ' + kind);
    }
  });

  test('records with no title field are still named usefully', () => {
    assert(artifactTitle({ number: 'INV-0001', clientName: 'Northwind Retail' }, 'invoice') === 'Invoice INV-0001 — Northwind Retail',
      'an invoice fell back to a generic label: ' + artifactTitle({ number: 'INV-0001', clientName: 'Northwind Retail' }, 'invoice'));
    assert(artifactTitle({ nodes: [1, 2] }, 'architecture') === 'Architecture diagram',
      'a diagram fell back to a generic label');
    assert(artifactTitle({ name: 'AWS CLI commands' }, 'script') === 'AWS CLI commands',
      'a template lost its name');
  });

  test('a real title always wins over the fallback', () => {
    assert(artifactTitle({ number: 'INV-9', projectTitle: 'Static site' }, 'invoice') === 'Static site',
      'the fallback overrode a real title');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
