/**
 * clientIntake.js — work out what you still need to ask the client.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * Half of a small AWS engagement stalls on facts nobody wrote down: which
 * account it deploys into, who controls the domain, what the monthly
 * ceiling is, who signs off. They surface one at a time, by email, over a
 * week.
 *
 * The project container already knows a lot — region, services, client,
 * what has been generated. This turns what it does NOT know into a form
 * the client can fill in once.
 *
 * ════════════════════════════════════════════════════════════════════
 * THE RULE
 * ════════════════════════════════════════════════════════════════════
 * A question is only asked when the answer is genuinely absent. Anything
 * already known is listed separately as a fact to confirm, never asked as
 * if it were unknown — asking a client something you were told last week
 * reads as not having listened.
 *
 * Nothing here invents an answer. A suggested resource name is offered as
 * a suggestion with the client's own decision attached to it.
 */

/** A slug safe for AWS resource names: lowercase, hyphenated, bounded. */
export function slugForAws(text, maxLength = 32) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || 'aws-project';
}

/**
 * Names to propose for the client's resources.
 *
 * A saved solution already carries projectName and stackName from the
 * pipeline; those are preferred over anything derived here, because they
 * are what the generated templates actually use.
 */
export function nameSuggestions(project = {}) {
  const solution = (project.artifacts?.solution || [])[0] || {};
  const base = slugForAws(solution.projectName || project.title || 'aws project');
  return {
    projectName: solution.projectName || base,
    stackName: solution.stackName || `${base}-stack`,
    resourcePrefix: base.split('-').slice(0, 3).join('-'),
    fromSolution: Boolean(solution.projectName || solution.stackName),
  };
}

const has = (value) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);

/** Services this project touches, lowercased for matching. */
function serviceSet(project) {
  const raw = [
    ...(project.services || []),
    ...((project.artifacts?.solution || []).flatMap((s) => s.serviceIds || [])),
  ];
  return new Set(raw.map((s) => String(s).toLowerCase()));
}

const touches = (set, ...names) => names.some((n) => [...set].some((s) => s.includes(n)));

/**
 * Build the intake form for a project.
 *
 * @param {object} project — a workspace project (see projectWorkspace.js)
 * @param {object} options — { author } for the sign-off line
 */
export function buildIntakeForm(project = {}, options = {}) {
  const services = serviceSet(project);
  const names = nameSuggestions(project);
  const known = [];
  const sections = [];

  // What we already have. Listed to confirm, never asked again.
  if (has(project.title)) known.push({ label: 'Project', value: project.title });
  if (has(project.client)) known.push({ label: 'Client', value: project.client });
  if (has(project.region)) known.push({ label: 'Proposed AWS region', value: project.region });
  if (project.services?.length) known.push({ label: 'AWS services in scope', value: project.services.join(', ') });

  const section = (id, heading, why, questions) => {
    const live = questions.filter(Boolean);
    if (live.length) sections.push({ id, heading, why, questions: live });
  };

  const q = (id, label, hint, extra = {}) => ({ id, label, hint, required: false, kind: 'text', ...extra });

  // ── 1. Who we are working with ───────────────────────────────────
  section('contact', 'Who we are working with',
    'Needed on the contract, the invoice and every deployment notification.', [
      has(project.client) ? null : q('companyName', 'Company or trading name', 'As it should appear on the contract and invoice', { required: true }),
      q('contactName', 'Main contact for this project', 'The person who can answer technical questions', { required: true }),
      q('contactEmail', 'Contact email', 'Where the proposal, invoice and handover go', { required: true }),
      q('signOff', 'Who signs off the finished work?', 'Leave blank if this is the same person'),
      q('billingAddress', 'Billing address and any PO or reference number', 'Some finance teams reject invoices without one'),
    ]);

  // ── 2. The AWS account ───────────────────────────────────────────
  section('account', 'The AWS account',
    'This decides who pays the bill and who is liable for what is deployed.', [
      q('accountStatus', 'Do you already have an AWS account for this?', 'If not, say so — setting one up correctly is part of the work', {
        kind: 'choice', options: ['Yes, existing account', 'No, needs creating', 'Not sure'], required: true,
      }),
      q('accountId', 'AWS account ID (12 digits)', 'Only if the account already exists'),
      q('rootHolder', 'Who holds the root credentials?', 'Root should stay with you, not with me'),
      q('accessMethod', 'How should I get access?', 'An IAM role I assume is preferred to long-lived keys', {
        kind: 'choice', options: ['IAM role I assume', 'IAM user you create for me', 'You deploy, I hand over the templates', 'Not decided'],
      }),
      q('existingResources', 'Anything already running in this account?', 'So nothing I create collides with it'),
    ]);

  // ── 3. Region and data residency ─────────────────────────────────
  section('region', 'Region and data residency',
    has(project.region)
      ? `I have planned for ${project.region}. Confirm or correct it — moving region later means rebuilding.`
      : 'Region affects latency, price and which laws apply to the data.', [
      q('regionConfirm', has(project.region) ? `Is ${project.region} correct?` : 'Which region should this run in?',
        'Where your users are, and where the data is allowed to live', {
          kind: 'choice',
          options: has(project.region) ? [`Yes — ${project.region}`, 'No, a different region'] : ['eu-west-2 (London)', 'eu-west-1 (Ireland)', 'us-east-1 (N. Virginia)', 'Other'],
          required: true,
        }),
      q('residency', 'Any data residency or compliance requirement?', 'UK GDPR, HIPAA, PCI, an industry rule, or a client contract clause'),
    ]);

  // ── 4. Domain and certificates — only when it applies ────────────
  if (touches(services, 'cloudfront', 'route53', 'acm', 's3', 'amplify', 'apigateway')) {
    section('domain', 'Domain and certificates',
      'Nothing can go live on your own name until these are settled.', [
        q('domainName', 'What domain should this use?', 'For example www.yourcompany.com', { required: true }),
        q('registrar', 'Where is the domain registered?', 'GoDaddy, Namecheap, Route 53, somewhere else'),
        q('dnsControl', 'Who can change the DNS records?', 'I will need either access or someone who can apply the records I send', {
          kind: 'choice', options: ['I can change them', 'Our IT provider does', 'You can have access', 'Not sure'],
        }),
        q('existingSite', 'Is there a site on that domain now?', 'Cutting over a live site needs a planned window'),
      ]);
  }

  // ── 5. Data — only when something stores it ──────────────────────
  if (touches(services, 's3', 'rds', 'dynamodb', 'efs', 'aurora', 'documentdb')) {
    section('data', 'The data itself',
      'Size and sensitivity drive the storage choice, the backup plan and the cost.', [
        q('dataDescription', 'What data will this hold?', 'Roughly what it is, and whether any of it is personal data', { required: true }),
        q('dataVolume', 'Roughly how much, and how fast does it grow?', 'A few hundred files, or millions of records'),
        q('retention', 'How long must it be kept, and how quickly must it be restorable?', 'This sets the backup schedule, which costs money'),
        touches(services, 'rds', 'aurora', 'documentdb')
          ? q('dbEngine', 'Which database engine and version?', 'PostgreSQL, MySQL, SQL Server — and the version you are on today')
          : null,
        q('migration', 'Is there existing data to migrate in?', 'And who can hand it over, in what format'),
      ]);
  }

  // ── 6. Environments and access ───────────────────────────────────
  section('environments', 'Environments and users',
    'Two environments cost roughly twice as much as one, so this is a budget decision as much as a technical one.', [
      q('environments', 'How many environments do you need?', '', {
        kind: 'choice', options: ['Production only', 'Production + staging', 'Production + staging + development', 'Not sure'],
      }),
      q('userCount', 'Roughly how many people or requests will this serve?', 'An order of magnitude is enough'),
      q('teamAccess', 'Who on your side needs access to the AWS console afterwards?', 'Names and what they should be able to do'),
    ]);

  // ── 7. Money ─────────────────────────────────────────────────────
  section('budget', 'Budget and running cost',
    'The running bill is yours, separate from my fee, and it needs a ceiling and an owner.', [
      q('monthlyCeiling', 'What monthly AWS bill would be too much?', 'I will set a budget alarm at that figure', { required: true }),
      q('billingAlerts', 'Who should receive billing alerts?', 'An email address that is actually read'),
      q('feeExpectation', 'What budget do you have for the work itself?', 'Fixed price or day rate, whichever suits you'),
    ]);

  // ── 8. Timing and acceptance ─────────────────────────────────────
  section('timeline', 'Timing and what "done" means',
    'Acceptance criteria agreed up front are the difference between finishing and drifting.', [
      q('startDate', 'When can we start?', 'And anything that has to happen first'),
      q('deadline', 'Is there a hard deadline?', 'A launch, an audit, a contract end'),
      q('successCriteria', 'How will you judge that this is finished and working?', 'Be as specific as you can — this becomes the acceptance test', { required: true }),
      q('handover', 'What do you need at handover?', 'Documentation, a walkthrough session, training, ongoing support'),
    ]);

  // ── 9. Naming — a suggestion, and their decision ─────────────────
  section('naming', 'Naming',
    'Resource names end up in the console, the bill and every log line, and renaming later means rebuilding.', [
      q('projectName', 'Project name for AWS resources', `I suggest "${names.projectName}" — change it if you have a convention`, {
        kind: 'text', prefill: names.projectName,
      }),
      q('resourcePrefix', 'Prefix for every resource', `I suggest "${names.resourcePrefix}", so everything is easy to find and easy to remove`, {
        kind: 'text', prefill: names.resourcePrefix,
      }),
      q('tagging', 'Do you have a tagging standard I should follow?', 'Cost centre, owner, environment — whatever your finance team reports on'),
    ]);

  return {
    projectId: project.id || null,
    projectTitle: project.title || 'AWS engagement',
    client: project.client || null,
    author: options.author || null,
    generatedAt: new Date().toISOString(),
    suggestions: names,
    knownFacts: known,
    sections,
    questionCount: sections.reduce((n, s) => n + s.questions.length, 0),
    requiredCount: sections.reduce((n, s) => n + s.questions.filter((x) => x.required).length, 0),
  };
}

/** The form as plain text, ready to paste into an email or a document. */
export function intakeAsText(form) {
  if (!form?.sections) return '';
  const lines = [];
  lines.push(`PROJECT SETUP — ${form.projectTitle}`);
  if (form.client) lines.push(`Client: ${form.client}`);
  lines.push('');
  lines.push('Answering these once saves a fortnight of back-and-forth. Anything');
  lines.push('you are unsure about, write "not sure" — that is a useful answer.');
  lines.push('');

  if (form.knownFacts.length) {
    lines.push('WHAT I HAVE SO FAR — please correct anything wrong');
    for (const fact of form.knownFacts) lines.push(`  ${fact.label}: ${fact.value}`);
    lines.push('');
  }

  for (const s of form.sections) {
    lines.push(s.heading.toUpperCase());
    if (s.why) lines.push(`(${s.why})`);
    lines.push('');
    for (const question of s.questions) {
      lines.push(`  ${question.label}${question.required ? ' *' : ''}`);
      if (question.hint) lines.push(`    — ${question.hint}`);
      if (question.options) lines.push(`    Options: ${question.options.join(' / ')}`);
      lines.push(`    Answer: ${question.prefill || ''}`);
      lines.push('');
    }
  }
  lines.push('* = needed before I can start.');
  return lines.join('\n');
}

/** The same form as an email, subject included. */
export function intakeAsEmail(form, options = {}) {
  const who = options.author || form.author || '';
  const subject = `${form.projectTitle} — a few things I need before I start`;
  const body = [
    form.client ? `Hi ${String(form.client).split(' ')[0]},` : 'Hi,',
    '',
    'Thanks again for the work. Before I start building, there are a few',
    'things only you can answer. Most take a sentence.',
    '',
    intakeAsText(form),
    '',
    'Send it back however is easiest — inline, a document, or a call if',
    'that is quicker.',
    '',
    who ? `Best,\n${who}` : 'Best,',
  ].join('\n');
  return { subject, body };
}

/** Which required questions are still unanswered, given a set of answers. */
export function outstanding(form, answers = {}) {
  const missing = [];
  for (const s of form?.sections || []) {
    for (const question of s.questions) {
      if (!question.required) continue;
      if (!has(answers[question.id])) missing.push({ section: s.heading, id: question.id, label: question.label });
    }
  }
  return missing;
}
