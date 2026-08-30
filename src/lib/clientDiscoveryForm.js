const CATEGORY_RE = /^\[([^\]]+)\]\s*/;

function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function fieldType(question) {
  if (/budget|fee|spend|cost/i.test(question)) return { type: 'text', placeholder: 'Example: $500 fixed fee; maximum $30/month AWS spend' };
  if (/delivery date|deadline|timeline|live\?/i.test(question)) return { type: 'text', placeholder: 'Example: pilot by 30 September; production after acceptance' };
  if (/region|residency|location|from where/i.test(question)) return { type: 'text', placeholder: 'Country, user locations, approved AWS Region, and residency boundary' };
  if (/database/i.test(question)) return { type: 'select', options: ['', 'Relational — PostgreSQL/MySQL', 'NoSQL — DynamoDB', 'Client needs recommendation', 'No database required'] };
  if (/compute model/i.test(question)) return { type: 'select', options: ['', 'EC2 — full server control', 'Lambda — serverless', 'Containers — ECS/EKS', 'Client needs recommendation'] };
  if (/custom domain/i.test(question)) return { type: 'text', placeholder: 'Domain name, registrar, DNS owner, or “none yet”' };
  return { type: 'textarea', placeholder: 'Client-approved answer; write “Unknown” if it must remain an open decision' };
}

export function buildClientDiscoveryForm(solution) {
  const questions = solution?.analysis?.missingQuestions || [];
  return questions.map((raw, index) => {
    const category = raw.match(CATEGORY_RE)?.[1] || 'Technical decision';
    const question = raw.replace(CATEGORY_RE, '').trim();
    return {
      id: `${slug(category)}-${slug(question) || index + 1}`,
      category,
      question,
      required: true,
      ...fieldType(question),
    };
  });
}

export function isSimulatedLearningProject(solution) {
  const brief = String(solution?.input?.brief || '');
  return /(?:portfolio\s+learning\s+project|simulated\s+(?:client\s+gig|portfolio\s+(?:learning\s+)?lab)|synthetic,?\s+non-sensitive\s+learning\s+data)/i.test(brief);
}

export function buildSimulatedLearningAnswers(solution, fields) {
  if (!isSimulatedLearningProject(solution)) return null;

  const title = solution?.input?.title || 'the learning project';
  return Object.fromEntries(fields.map((field) => {
    const prompt = `${field.category} ${field.question}`.toLowerCase();
    let answer;

    if (/region|residency|location/.test(prompt)) {
      answer = 'Project owner approves us-east-1 for this synthetic learning lab. No client, regulated, or residency-controlled data will be used.';
    } else if (/budget|fee|spend|cost/.test(prompt)) {
      answer = 'Simulated portfolio project with no client fee. Maximum AWS planning ceiling: USD 20/month; target each short lab session below USD 2. Billing alerts do not stop spend.';
    } else if (/delivery|deadline|timeline|business outcome|success/.test(prompt)) {
      answer = `Complete ${title} within 3 weeks. Success means the approved design is deployed in a short-lived lab, tested with evidence, documented, and fully torn down with AWS-side verification.`;
    } else if (/security|recovery|classification|compliance|retention|rpo|rto/.test(prompt)) {
      answer = 'Synthetic, non-sensitive learning data only; no regulated data or external compliance scope. Backup retention 7 days, RPO 24 hours, RTO 4 hours, with restore and teardown evidence.';
    } else if (/user|access|identity/.test(prompt)) {
      answer = 'Project owner is the only approved lab operator. Use least privilege, MFA, short-lived credentials, and separate administrator and standard-user test paths.';
    } else if (/accept|evidence|test/.test(prompt)) {
      answer = 'Project-owner acceptance requires passing the stated tests, linking every claim to captured evidence, and verifying all AWS resources are removed.';
    } else {
      answer = 'Not applicable to this simulated learning lab. Keep this as an open decision if the project is later converted to real client work.';
    }

    return [field.id, answer];
  }));
}

export function discoveryFormAsText(title, fields, answers = {}) {
  const lines = [
    `CLIENT DISCOVERY FORM — ${title || 'Project'}`,
    '',
    'Instructions: Complete each answer with confirmed facts. Write “Unknown” where a decision is still pending. Do not include passwords, access keys, health records, payment-card data, or other secrets.',
    '',
  ];
  let category = '';
  fields.forEach((field) => {
    if (field.category !== category) {
      category = field.category;
      lines.push(category.toUpperCase(), '');
    }
    lines.push(`${field.question}${field.required ? ' *' : ''}`);
    lines.push(`Answer: ${String(answers[field.id] || '').trim()}`, '');
  });
  lines.push('Client/project owner name:', 'Approval date:', 'Approval reference (email/ticket/document):');
  return lines.join('\n');
}

export function appendClientDiscoveryAnswers(brief, fields, answers) {
  const completed = fields.map((field) => ({
    ...field,
    answer: String(answers?.[field.id] || '').trim(),
  }));
  const unanswered = completed.filter((field) => !field.answer);
  if (unanswered.length) throw new Error(`Complete all required client fields (${unanswered.length} remaining). Use “Unknown” for decisions that are genuinely unresolved.`);

  const marker = 'Client-approved discovery answers:';
  const base = String(brief || '').split(`\n\n${marker}`)[0].trim();
  const answerLines = completed.map((field) => `- [${field.category}] ${field.question}\n  Confirmed answer: ${field.answer}`);
  const simulatedMode = isSimulatedLearningProject({ input: { brief: base } })
    ? '\n- Project mode: Simulated portfolio learning lab; these are editable project-owner decisions, not client claims.'
    : '';
  return `${base}\n\n${marker}${simulatedMode}\n${answerLines.join('\n')}\n- These answers are recorded as client/project-owner input, not independently verified deployment evidence.\n- No answer authorizes AWS deployment; AWS write actions still require separate explicit approval.`;
}
