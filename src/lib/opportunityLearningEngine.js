const POSITIVE = new Set(['shortlisted', 'applied', 'interview', 'hired', 'won']);
const NEGATIVE = new Set(['rejected', 'declined', 'lost']);
const OUTCOME_WEIGHT = { interested: 1, skip: -1, shortlisted: 1, applied: 2, interview: 4, hired: 7, won: 7, rejected: -2, declined: -1, lost: -3 };

const STUDY_MAP = {
  iam: 'IAM least privilege and policy evaluation', vpc: 'VPC networking and routing',
  lambda: 'Lambda serverless design', apigateway: 'API Gateway design and security',
  dynamodb: 'DynamoDB data modelling', s3: 'S3 security and lifecycle management',
  cloudfront: 'CloudFront caching and secure origins', route53: 'Route 53 DNS and routing',
  cloudformation: 'CloudFormation infrastructure as code', cdk: 'AWS CDK infrastructure as code',
  ecs: 'ECS and container operations', fargate: 'Fargate deployment and cost controls',
  rds: 'RDS availability, backup and migration', aurora: 'Aurora architecture and operations',
  cloudwatch: 'CloudWatch observability and alarms', securityhub: 'Security Hub findings and remediation',
};

const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9+#.-]/g, '');

export function extractOpportunitySkills(opportunity = {}) {
  const declared = (opportunity.skills || []).map(normalize).filter(Boolean);
  if (declared.length) return [...new Set(declared)];
  const text = `${opportunity.title || ''} ${opportunity.description || opportunity.summary || ''}`.toLowerCase();
  return Object.keys(STUDY_MAP).filter((skill) => text.includes(skill));
}

export function buildOpportunityLearningProfile({ interactions = [], proposals = [], portfolioSkills = [] } = {}) {
  const skillWeights = {};
  const events = [];
  interactions.forEach((item) => events.push({ outcome: item.outcome, skills: item.skills || [] }));
  proposals.forEach((proposal) => events.push({ outcome: proposal.status, skills: proposal.skills || [] }));
  events.forEach((event) => {
    const weight = OUTCOME_WEIGHT[event.outcome] || 0;
    event.skills.map(normalize).filter(Boolean).forEach((skill) => { skillWeights[skill] = (skillWeights[skill] || 0) + weight; });
  });
  const evidenceSkills = new Set(portfolioSkills.map(normalize).filter(Boolean));
  const meaningful = events.filter((event) => POSITIVE.has(event.outcome) || NEGATIVE.has(event.outcome));
  const positive = meaningful.filter((event) => POSITIVE.has(event.outcome)).length;
  const stage = meaningful.length < 5 ? 'rules-only' : meaningful.length < 20 ? 'personalizing' : 'evidence-trained';
  return {
    stage,
    sampleSize: meaningful.length,
    positive,
    successRate: meaningful.length ? Math.round((positive / meaningful.length) * 100) : null,
    skillWeights,
    evidenceSkills,
    explanation: stage === 'rules-only'
      ? `Rules only — ${Math.max(0, 5 - meaningful.length)} more recorded decisions needed before personalization starts.`
      : stage === 'personalizing'
        ? `Early personalization from ${meaningful.length} real decisions; recommendations remain low confidence.`
        : `Evidence-based personalization from ${meaningful.length} recorded decisions and outcomes.`,
  };
}

export function scoreOpportunity(opportunity, profile) {
  const skills = extractOpportunitySkills(opportunity);
  const level = String(opportunity.level || '').toLowerCase();
  let score = level === 'junior' ? 72 : level === 'mid' ? 48 : level === 'senior' ? 22 : 55;
  const reasons = [];
  const gaps = [];
  skills.forEach((skill) => {
    if (profile.evidenceSkills.has(skill)) { score += 5; reasons.push(`Portfolio evidence: ${skill}`); }
    else if ((profile.skillWeights[skill] || 0) > 0) { score += Math.min(4, profile.skillWeights[skill]); reasons.push(`Positive outcome history: ${skill}`); }
    else gaps.push(skill);
  });
  score = Math.max(0, Math.min(100, Math.round(score)));
  const recommendation = score >= 70 ? 'Strong practice match' : score >= 48 ? 'Stretch — review gaps' : 'Study first';
  return {
    score,
    recommendation,
    reasons: reasons.slice(0, 3),
    gaps: gaps.slice(0, 5),
    study: gaps.slice(0, 3).map((skill) => STUDY_MAP[skill] || `Build a verified project using ${skill}`),
    confidence: profile.stage === 'evidence-trained' ? 'medium' : 'low',
  };
}

export function nextLearningActions(opportunities, profile) {
  const scored = opportunities.map((item) => ({ item, result: scoreOpportunity(item, profile) }));
  const gaps = {};
  scored.forEach(({ result }) => result.gaps.forEach((skill) => { gaps[skill] = (gaps[skill] || 0) + 1; }));
  return Object.entries(gaps).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([skill, demand]) => ({
    skill, demand, action: STUDY_MAP[skill] || `Build a small, evidence-backed ${skill} project`,
  }));
}
