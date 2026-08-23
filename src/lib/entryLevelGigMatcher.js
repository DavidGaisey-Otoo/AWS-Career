const BEGINNER_SIGNALS = /\b(entry[- ]?level|junior|associate|graduate|trainee|intern|beginner|mentorship|documentation|support|migration assessment|cloud support|network support)\b/i;
const SENIOR_SIGNALS = /\b(senior|sr\.?|lead|principal|staff|architect lead|manager|director|expert|guru)\b/i;
const HIGH_RISK_SIGNALS = /\b(production outage|incident commander|24\/7 on[- ]call|zero downtime|multi[- ]account landing zone|eks|kubernetes|service mesh|pci[- ]dss|hipaa|soc ?2|fedramp)\b/i;
const YEARS = /\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi;

export const ENTRY_LEVEL_PROFILE = Object.freeze({
  level: 'entry',
  strengths: [
    'AWS architecture and service-selection planning',
    'VPC, subnet, routing, and network design',
    'network administration and troubleshooting',
    'architecture diagrams and technical documentation',
    'implementation plans, test checklists, and handover documentation',
  ],
  boundaries: [
    'Do not claim certifications, production deployments, or years of experience that are not supplied by the user.',
    'Do not submit a proposal automatically. Generate a draft for human review.',
    'Escalate high-risk or unsupported production work to an experienced reviewer.',
  ],
});

function textFor(gig) {
  return `${gig?.title || ''} ${gig?.description || ''} ${(gig?.skills || []).join(' ')} ${gig?.raw?.level || ''} ${gig?.raw?.seniority || ''}`;
}

/** Conservative suitability assessment for an entry-level AWS/network freelancer. */
export function assessEntryLevelGig(gig, { careerLevel = 'entry' } = {}) {
  const text = textFor(gig);
  const reasons = [];
  const cautions = [];
  let score = 55;

  if (BEGINNER_SIGNALS.test(text)) { score += 25; reasons.push('The post uses beginner, associate, support, or documentation language.'); }
  if (/\b(vpc|subnet|routing|network|cloud support|cloudwatch|iam|s3|ec2|documentation|diagram|troubleshoot)\b/i.test(text)) {
    score += 15;
    reasons.push('The work overlaps with your current AWS, networking, and documentation strengths.');
  }

  const years = [...text.matchAll(YEARS)].map((m) => Number(m[1])).filter(Number.isFinite);
  const maxYears = years.length ? Math.max(...years) : 0;
  if (maxYears >= 3) { score -= careerLevel === 'mid' ? 20 : 35; cautions.push(`The post requests ${maxYears}+ years of experience.`); }
  if (SENIOR_SIGNALS.test(text)) { score -= careerLevel === 'senior' ? 10 : careerLevel === 'mid' ? 30 : 40; cautions.push('The title or description asks for senior/lead responsibility.'); }
  if (HIGH_RISK_SIGNALS.test(text)) { score -= 25; cautions.push('The work includes high-risk production or specialist responsibility.'); }

  score = Math.max(0, Math.min(100, score));
  const classification = score >= 70 ? 'good-fit' : score >= 45 ? 'stretch' : 'not-recommended';
  if (!reasons.length) reasons.push('AWS relevance was detected, but the post does not clearly identify a junior scope.');

  return {
    score,
    classification,
    label: classification === 'good-fit' ? 'Entry-level match' : classification === 'stretch' ? 'Stretch — review first' : 'Not recommended yet',
    reasons,
    cautions,
    requiresMentorReview: classification !== 'good-fit' || HIGH_RISK_SIGNALS.test(text),
  };
}

export function buildEntryLevelApplicationBrief(gig, { careerLevel = 'entry', headline = ENTRY_LEVEL_PROFILE.level } = {}) {
  const fit = assessEntryLevelGig(gig, { careerLevel });
  return [
    `JOB TITLE: ${gig?.title || 'Untitled gig'}`,
    `CLIENT/COMPANY: ${gig?.company || 'Not provided'}`,
    `JOB DESCRIPTION: ${gig?.description || 'Not provided'}`,
    `REQUESTED SKILLS: ${(gig?.skills || []).join(', ') || 'Not provided'}`,
    '',
    `CANDIDATE LEVEL: ${headline}.`,
    `FIT ASSESSMENT: ${fit.label} (${fit.score}/100).`,
    `VERIFIED STRENGTHS: ${ENTRY_LEVEL_PROFILE.strengths.join('; ')}.`,
    'PROPOSAL RULES: Write a concise draft only. Be transparent about entry-level status. Do not invent certifications, clients, metrics, production experience, or completed projects. Ask clarifying questions where evidence is missing.',
    'DELIVERY RULES: Produce a scoped plan, assumptions, service list, architecture, validation steps, rollback/teardown guidance, and explicit human approval gates. Never claim deployment succeeded without AWS evidence.',
  ].join('\n');
}
