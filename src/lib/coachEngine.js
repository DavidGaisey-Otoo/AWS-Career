/**
 * Career Coach response engine.
 *
 * Each tool exposes a pure function:
 *   (input) → { text, score?, fields?, suggestions? }
 *
 * No external LLM. Heuristics + templates produce useful, structured
 * outputs the UI can render and the user can refine. Designed so a real
 * LLM backend could replace any function without changing the call sites.
 */

import { uid } from './utils.js';

// ---------------- helpers ----------------

const wordCount = (s) => (s.trim().match(/\S+/g) || []).length;
const has = (s, terms) => terms.some((t) => new RegExp(`\\b${t}\\b`, 'i').test(s));
const bullet = (lines) => lines.map((l) => `- ${l}`).join('\n');

function scoreOf(checks) {
  // checks: [{ key, weight, hit }]
  const total = checks.reduce((a, c) => a + c.weight, 0);
  const got = checks.reduce((a, c) => a + (c.hit ? c.weight : 0), 0);
  return Math.round((got / total) * 100);
}

// ---------------- 1. Upwork profile review ----------------

export function reviewUpworkProfile(text) {
  const w = wordCount(text);
  const checks = [
    { key: 'AWS keyword presence', weight: 12, hit: has(text, ['AWS','Amazon Web Services']) },
    { key: 'Specific service depth', weight: 12, hit: has(text, ['VPC','Lambda','S3','EC2','CloudFront','RDS','EKS','ECS']) },
    { key: 'Quantified outcomes',     weight: 16, hit: /\b\d+%|\$\d+|\d+x|saved \$|reduced/i.test(text) },
    { key: 'Hourly rate clarity',     weight: 8,  hit: /\$\d+\/?\s*(hr|hour)/i.test(text) },
    { key: 'Networking background',   weight: 10, hit: has(text, ['network','CCNA','BGP','routing','VPN','Direct Connect']) },
    { key: 'Certifications listed',   weight: 10, hit: has(text, ['Certified','Cloud Practitioner','Solutions Architect','SAA','Associate']) },
    { key: 'Call to action',          weight: 8,  hit: /message me|contact|let'?s talk|book a call/i.test(text) },
    { key: 'Strong opening line',     weight: 8,  hit: w > 0 && text.split(/\n|\./)[0].trim().length > 40 },
    { key: 'Word count 150-350',      weight: 8,  hit: w >= 150 && w <= 350 },
    { key: 'No filler / weak words',  weight: 8,  hit: !/passionate|hard-working|team player|self-starter/i.test(text) },
  ];
  const score = scoreOf(checks);
  const wins = checks.filter((c) => c.hit).map((c) => c.key);
  const gaps = checks.filter((c) => !c.hit).map((c) => c.key);

  const advice = [];
  if (!has(text, ['AWS','Amazon Web Services'])) advice.push('Mention "AWS" at least 3 times in natural context. Recruiters and clients keyword-search.');
  if (!/\b\d+%|\$\d+|\d+x/.test(text)) advice.push('Add a quantified outcome: "Cut a client\'s S3 bill 38%", "Reduced p95 latency from 800ms to 180ms".');
  if (!/\$\d+\/?\s*(hr|hour)/i.test(text)) advice.push('State your hourly rate clearly (even if "$15–25/hr" range). Removes friction.');
  if (w < 150) advice.push(`Profile is too short (${w} words). Aim for 180-300 — enough to demonstrate depth without rambling.`);
  if (w > 350) advice.push(`Profile is wordy (${w} words). Trim to 250-300; clients skim.`);
  if (/passionate|hard-working|team player/i.test(text)) advice.push('Remove vague words like "passionate" / "hard-working". Show, don\'t tell.');
  if (!has(text, ['network','CCNA','BGP'])) advice.push('Lead with your networking background — it\'s rare among AWS freelancers and a huge edge.');

  return {
    score,
    grade: scoreToGrade(score),
    text:
`# Upwork profile review

**Score: ${score} / 100** (${scoreToGrade(score)})

## What\'s working
${wins.length ? bullet(wins) : '_Not much yet — keep reading._'}

## What to fix
${gaps.length ? bullet(gaps) : '_Looks great!_'}

## Specific edits to make
${advice.length ? advice.map((a, i) => `${i + 1}. ${a}`).join('\n') : '_No major edits — only minor polish._'}

## Suggested headline format
> Senior AWS Cloud Engineer | Networking + DevOps | 5★ rated | $XX/hr

Tailor the rate to your level, replace "Senior" with "Junior/Mid" if more honest.`,
    fields: { score, wins, gaps },
  };
}

// ---------------- 2. Upwork proposal generator ----------------

export function generateUpworkProposal({ jobDescription, name = 'David', rate = '20', timezone = 'GMT' }) {
  // Extract a few hints
  const services = detectServices(jobDescription);
  const isUrgent = /urgent|asap|today|tomorrow|this week/i.test(jobDescription);
  const hasBudget = /\$\d/.test(jobDescription);
  const role = /architect|design|architecture/i.test(jobDescription) ? 'architecture'
            : /migrat/i.test(jobDescription) ? 'migration'
            : /cost|optim/i.test(jobDescription) ? 'cost optimization'
            : /security/i.test(jobDescription) ? 'security review'
            : /set ?up|deploy|provision|terraform/i.test(jobDescription) ? 'setup'
            : 'AWS work';

  const opener = isUrgent
    ? `I can start within 24 hours and have done this exact ${role} workload before.`
    : `Your ${role} project lines up perfectly with what I\'ve shipped for similar clients.`;

  const serviceLine = services.length
    ? `I\'ve worked hands-on with ${services.join(', ')} and can show production code.`
    : `I\'ve shipped this exact stack to production and can show code on request.`;

  const text =
`Hi there,

${opener}

Quick wins I can deliver:
- ${roleDelivery(role, services)}
- A clear runbook so your team can maintain it after I hand off.
- ${costPlay(role)}

${serviceLine}

A few clarifying questions:
1. ${question1(role)}
2. ${question2(role)}
3. What does "done" look like for you — what\'s the one outcome that decides this is a success?

Logistics:
- Timezone: ${timezone}, but I overlap 4+ hours with most US/EU schedules.
- Rate: $${rate}/hr (negotiable on fixed-price scope if you prefer).
- Available to jump on a 15-min call this week.

Looking forward to it,
${name}`;

  return {
    text,
    fields: { wordCount: wordCount(text), services, role, isUrgent, hasBudget },
  };
}

function roleDelivery(role, services) {
  if (role === 'migration') return 'A migration plan with cutover steps, rollback procedure, and zero-downtime strategy.';
  if (role === 'architecture') return 'A Well-Architected design with diagrams, IaC scaffold, and trade-off rationale.';
  if (role === 'cost optimization') return 'A cost teardown with prioritized actions ranked by $$/effort.';
  if (role === 'security review') return 'A security audit mapped to CIS / Well-Architected security pillar, with remediation tickets.';
  if (role === 'setup') return `A production-grade ${services[0] || 'AWS'} setup with Terraform and CI/CD, not a click-ops one-off.`;
  return 'A scoped deliverable I commit to in writing before we start.';
}

function costPlay(role) {
  if (role === 'cost optimization') return 'A spreadsheet of every quick-win with $/month estimate.';
  if (role === 'migration') return 'Tagging strategy + budgets so cost is visible from day one.';
  return 'Sensible defaults that keep cost predictable (no NAT-Gateway surprises).';
}

function question1(role) {
  if (role === 'migration') return 'Source environment specs (versions, data size, peak TPS)?';
  if (role === 'architecture') return 'Hard constraints — region(s), compliance, latency budget?';
  if (role === 'security review') return 'Compliance framework (SOC2 / PCI / HIPAA / none)?';
  return 'Your AWS account access plan — read-only IAM user for me, or a separate sandbox account?';
}

function question2(role) {
  if (role === 'cost optimization') return 'Current monthly spend and biggest line items?';
  if (role === 'migration') return 'Acceptable downtime window?';
  return 'Are you set on a specific stack, or open to recommendations?';
}

function detectServices(txt) {
  const all = ['S3','EC2','Lambda','RDS','Aurora','DynamoDB','VPC','CloudFront','Route 53','ECS','EKS','Fargate',
               'API Gateway','CloudWatch','CloudFormation','Terraform','EventBridge','SQS','SNS','Kinesis','Glue',
               'Redshift','Athena','SageMaker','Bedrock','IAM','KMS','Secrets Manager','GuardDuty','WAF','Shield'];
  return all.filter((s) => new RegExp(`\\b${s.replace(/\s/g, '\\s')}\\b`, 'i').test(txt));
}

// ---------------- 3. Pricing advisor ----------------

export function priceAdvisor({ description, region = 'global', experience = 'mid', urgency = 'normal' }) {
  // Heuristic complexity score
  const complexityHits = [
    /multi[- ]?region|disaster recovery|DR/i,
    /migration|migrate|cutover/i,
    /architecture|design|well[- ]?architected/i,
    /security|compliance|HIPAA|PCI|SOC2/i,
    /terraform|CDK|IaC/i,
    /microservice|EKS|kubernetes/i,
    /data lake|warehouse|ETL|pipeline/i,
    /machine learning|ML|SageMaker|RAG/i,
  ].reduce((a, re) => a + (re.test(description) ? 1 : 0), 0);

  const baseHourly = ({ junior: 18, mid: 35, senior: 65, principal: 110 })[experience] || 35;
  const regionMul = ({ uk: 1.0, us: 1.15, eu: 1.05, asia: 0.85, global: 1.0 })[region] || 1.0;
  const urgencyMul = urgency === 'urgent' ? 1.25 : urgency === 'low' ? 0.9 : 1.0;
  const complexityAdj = 1 + complexityHits * 0.12;

  const hourly = Math.round(baseHourly * regionMul * urgencyMul * complexityAdj);
  const hourlyLow = Math.round(hourly * 0.85);
  const hourlyHigh = Math.round(hourly * 1.18);

  // Estimate hours from description length + complexity
  const wc = wordCount(description);
  const estHours = Math.max(10, Math.round(wc / 4 + complexityHits * 18));
  const fixedLow = Math.round(estHours * hourlyLow * 0.95);
  const fixedHigh = Math.round(estHours * hourlyHigh * 1.05);

  const text =
`# Pricing recommendation

**Hourly:** \`$${hourlyLow}\`–\`$${hourlyHigh}/hr\` (target $${hourly}/hr)
**Fixed price:** \`$${fixedLow}\`–\`$${fixedHigh}\` (≈ ${estHours} hours estimate)

## How I got there
- Base hourly for ${experience} engineer: $${baseHourly}/hr
- Region multiplier (${region.toUpperCase()}): ×${regionMul}
- Urgency (${urgency}): ×${urgencyMul}
- Complexity signals detected: ${complexityHits} → ×${complexityAdj.toFixed(2)}

## Negotiation guardrails
- **Don\'t go below $${Math.round(hourly * 0.75)}/hr** — you\'ll attract worse clients, not more clients.
- **Anchor high.** Quote the high end first; let the client negotiate down to your real target.
- **Offer two tiers**: a small "spike" engagement to prove value, then a larger follow-on contract.
- **Always include a 10-15% buffer** in fixed-price quotes for scope drift.

## What to ask before quoting
- What\'s the budget range they have in mind?
- Is there a hard deadline? (Affects urgency multiplier)
- Who owns the AWS account credentials?
- Acceptable downtime / change windows?`;

  return { text, fields: { hourly, hourlyLow, hourlyHigh, fixedLow, fixedHigh, estHours, complexityHits } };
}

// ---------------- 4. Mock interview prompt ----------------

export function interviewPrompt({ role, level }) {
  const banks = {
    sa: [
      'Walk me through how you\'d design a 3-tier web app on AWS that survives an AZ failure.',
      'A SaaS customer says page loads are slow from Europe. Their stack is us-east-1 only. What\'s your investigation plan?',
      'Compare SQS Standard vs FIFO and tell me when you\'d pick each.',
    ],
    devops: [
      'Design a CI/CD pipeline that auto-deploys to staging, gates on tests, and requires manual approval for prod.',
      'How do you handle secrets in a deployment pipeline?',
      'Walk me through a blue/green deploy for a Lambda function.',
    ],
    data: [
      'You ingest 5 GB/sec of clickstream data. Design the ingest + storage + query stack.',
      'When would you pick Redshift vs Athena?',
      'How do you partition S3 data for cheap Athena queries?',
    ],
    sec: [
      'How do you detect a compromised IAM access key in production?',
      'Walk me through the layers of defense for a public-facing API.',
      'What\'s the difference between Permission Boundaries, SCPs, and IAM policies?',
    ],
    net: [
      'Design a hub-and-spoke network with 6 VPCs and an on-prem connection.',
      'Compare Direct Connect vs Site-to-Site VPN — when do you pick each?',
      'How does Route 53 latency-based routing actually work?',
    ],
    support: [
      'A customer\'s S3 bucket suddenly stopped accepting uploads. Walk me through your triage.',
      'How do you read a CloudTrail event to understand what an IAM action failed on?',
      'A Lambda is timing out at 30s. What are the first 3 things you check?',
    ],
    ml: [
      'How would you stand up a RAG chatbot using Bedrock + your company\'s docs?',
      'Walk me through a SageMaker training job lifecycle.',
      'How do you detect data drift in production?',
    ],
  };
  const qs = banks[role] || banks.sa;
  return { questions: qs };
}

// ---------------- 5. Portfolio reviewer ----------------

export function reviewPortfolio({ projects }) {
  // projects: [{ name, summary, services, complete }]
  const completeCount = projects.filter((p) => p.complete).length;
  const totalServices = new Set(projects.flatMap((p) => p.services || [])).size;
  const hasNetworking = projects.some((p) => (p.services || []).some((s) => /vpc|tgw|dx|vpn/i.test(s)));
  const hasServerless = projects.some((p) => (p.services || []).some((s) => /lambda|api gateway|dynamodb/i.test(s)));
  const hasDataLake = projects.some((p) => (p.services || []).some((s) => /glue|athena|redshift|kinesis/i.test(s)));

  const checks = [
    { key: '≥ 4 complete projects', weight: 25, hit: completeCount >= 4 },
    { key: 'Breadth (≥ 6 distinct services)', weight: 20, hit: totalServices >= 6 },
    { key: 'Networking project', weight: 15, hit: hasNetworking },
    { key: 'Serverless project', weight: 15, hit: hasServerless },
    { key: 'Data project', weight: 15, hit: hasDataLake },
    { key: 'Project descriptions are >100 words', weight: 10, hit: projects.every((p) => wordCount(p.summary || '') > 60) },
  ];
  const score = scoreOf(checks);

  const text =
`# Portfolio review

**Score: ${score} / 100** (${scoreToGrade(score)})

You have ${completeCount} complete project${completeCount === 1 ? '' : 's'} covering ${totalServices} unique AWS services.

## Strengths
${checks.filter((c) => c.hit).map((c) => `- ${c.key}`).join('\n') || '_None yet._'}

## Gaps to close
${checks.filter((c) => !c.hit).map((c) => `- ${c.key}`).join('\n') || '_Looks complete!_'}

## Next project I\'d build
${!hasNetworking ? '- A hub-and-spoke VPC + Transit Gateway design (plays to your CCNA background)'
  : !hasServerless ? '- A serverless CRUD API (Lambda + API Gateway + DynamoDB) — shows modern AWS skills'
  : !hasDataLake ? '- A small data lake (S3 + Glue + Athena) — high enterprise demand'
  : '- A multi-region disaster recovery project — the highest-trust signal to enterprise clients'}`;

  return { text, score, fields: { completeCount, totalServices, hasNetworking, hasServerless, hasDataLake } };
}

// ---------------- 6. LinkedIn optimizer ----------------

export function optimizeLinkedIn({ headline, about }) {
  const checks = [
    { key: 'Headline mentions AWS', weight: 20, hit: /aws/i.test(headline || '') },
    { key: 'Headline has a specific role', weight: 15, hit: /engineer|architect|developer|specialist|consultant/i.test(headline || '') },
    { key: 'Headline includes value prop', weight: 15, hit: /(\d+|reduce|cut|grow|build|design|migrate|secure|automate)/i.test(headline || '') },
    { key: 'About is 100-250 words', weight: 15, hit: wordCount(about || '') >= 100 && wordCount(about || '') <= 250 },
    { key: 'About lists specific services', weight: 15, hit: detectServices(about || '').length >= 3 },
    { key: 'About has a CTA at the end', weight: 10, hit: /message me|dm me|reach out|let'?s connect|contact/i.test(about || '') },
    { key: 'No filler words (passionate / hard-working)', weight: 10, hit: !/passionate|hard-working|team player|self-starter/i.test((headline || '') + (about || '')) },
  ];
  const score = scoreOf(checks);

  const text =
`# LinkedIn optimization plan

**Score: ${score} / 100** (${scoreToGrade(score)})

## Headline rewrite
Try this template:
> **AWS Cloud Engineer** | Networking + Migrations | I help SaaS companies cut AWS bills 20-40%

(Replace the value-prop with your actual one.)

## About section structure
1. **Opening hook** — one-line "what I do + for who".
2. **Proof** — 2-3 quantified wins with specific services.
3. **Stack** — services you actually use (S3, Lambda, VPC, etc.).
4. **CTA** — "DM me if you\'re running into X."

## Specific edits
${checks.filter((c) => !c.hit).map((c) => `- ${c.key}`).join('\n') || '_Looks solid!_'}

## What I\'d add this week
- Post one technical "I broke this and here\'s what I learned" story.
- Comment thoughtfully on 5 AWS-leader posts.
- Endorse 3 specific connections for AWS skills.`;

  return { text, score, fields: { headlineLen: (headline || '').length, aboutWords: wordCount(about || '') } };
}

// ---------------- 7. Personal branding strategist ----------------

export function brandingPlan({ niche = 'AWS networking + DevOps' }) {
  const text =
`# 30-day personal branding plan

**Niche:** ${niche}

## Week 1 — Foundation
- **Tighten your bio.** Run it through the LinkedIn optimizer.
- **Pick 3 pillar topics.** For ${niche}, suggested: networking deep-dives, freelance lessons, AWS cost stories.
- **Set a posting cadence.** 3× LinkedIn + 1× Hashnode/Medium per week is enough.

## Week 2 — Authority
- **Publish one technical teardown** on Hashnode (~1500 words). Pick a recent bug or design you wrestled with.
- **Cross-post the lede** on LinkedIn with a hook + link.
- **Engage on 10 posts/day** from people in ${niche}.

## Week 3 — Reach
- **Run a 5-day public learning thread** on LinkedIn (one short post per day).
- **Comment on 3 high-reach posts** from AWS influencers (Stephane Maarek, Adrian Cantrill, etc.).
- **Start a personal newsletter** (Substack/Beehiiv) — even 50 subscribers is leverage.

## Week 4 — Conversion
- **Pin your best post** to LinkedIn featured.
- **Add a "work with me" link** to bio + every article.
- **Reach out to 5 ideal clients** with a value-first DM.

## North-star metric
Pick **one** to optimize:
- Profile views/week (top of funnel)
- DMs from prospects (mid funnel)
- Booked discovery calls/month (bottom funnel)

Track weekly. Adjust monthly. The compounding kicks in around month 3.`;
  return { text };
}

// ---------------- 8. Rate negotiation drill ----------------

export function negotiationDrill({ scenario = 'standard' }) {
  const scenarios = {
    standard: {
      title: 'Client says "$25/hr is too high"',
      client: '"Honestly $25/hr is more than I budgeted. I was thinking closer to $15. Can you do that?"',
      goodResponse: '"$15 is below my range — but I appreciate you being upfront. At $25/hr, here\'s the value you get: [list 3 specific outcomes]. If budget is the constraint, I could scope down to phase 1 only at a fixed $X — same hourly, smaller deliverable. Which path makes more sense?"',
      mistakes: [
        '❌ Immediately dropping to $20 (signals your rate was arbitrary)',
        '❌ Defending the rate emotionally ("I\'m worth it!")',
        '❌ Agreeing to $15 (you\'ll resent the project)',
      ],
    },
    payterms: {
      title: 'Client wants to pay after delivery (net 30)',
      client: '"We pay all our vendors net 30 after delivery. Is that OK?"',
      goodResponse: '"For first-time work I\'d like to structure it as 50% upfront, 50% on delivery — it protects us both. After we\'ve worked together once, happy to move to net-15 or net-30 for subsequent projects."',
      mistakes: [
        '❌ Just agreeing — you\'re lending them money',
        '❌ Demanding 100% upfront on first job (most won\'t accept)',
        '❌ No written agreement on terms',
      ],
    },
    scope: {
      title: 'Client is creeping the scope',
      client: '"Oh and could you also set up the monitoring stack while you\'re at it? Should be quick."',
      goodResponse: '"Happy to — monitoring is a great add. Quick scope: [list what it\'d include]. It\'s about 6-8 hours of work, so an additional $X to the contract. Want me to write up a change order?"',
      mistakes: [
        '❌ Saying yes without billing for it',
        '❌ Saying no without offering an alternative',
        '❌ Doing it "this time" — sets a precedent',
      ],
    },
  };
  const s = scenarios[scenario] || scenarios.standard;
  const text =
`# Negotiation drill — ${s.title}

**Client says:**
> ${s.client}

## A strong response
> ${s.goodResponse}

## Mistakes to avoid
${s.mistakes.map((m) => `- ${m}`).join('\n')}

## The principles
- **Anchor to value, not effort.** Talk about outcomes.
- **Trade, don\'t concede.** Every drop in price gets a drop in scope.
- **Silence is a tool.** State your number, then stop talking.
- **Walk-away ready.** If a client only buys on price, they\'re not your client.`;
  return { text };
}

// ---------------- 9. Career path advisor ----------------

export function careerPathAdvisor({ background = 'networking', level = 'beginner', goal = 'freelance' }) {
  const paths = {
    'networking|freelance':
      `# Recommended path — Networking → AWS Freelance

You have a moat most cloud engineers don\'t — networking depth. Lean in.

## Stage 1 (months 0-3) — Cloud Practitioner + SAA
- Earn **AWS Cloud Practitioner** within 4 weeks.
- Start **Solutions Architect Associate** in week 4 — networking domain will feel natural.
- Build 2 portfolio projects: S3+CloudFront site, EC2 web app behind ALB.

## Stage 2 (months 3-6) — Networking depth + freelance start
- Build the **VPC design project** — your signature.
- Earn **Solutions Architect Associate** by month 6.
- Set up Upwork + LinkedIn properly.
- Take 3 small jobs (even at $15/hr) for reviews.

## Stage 3 (months 6-12) — Specialty + scale
- Start the **Advanced Networking Specialty** prep — your differentiator.
- Raise rate to $35-45/hr.
- Land 2-3 longer-term retainer clients.
- Publish 1 article/week on cloud networking.

## Stage 4 (year 2) — Niche authority
- Earn **Advanced Networking Specialty**.
- Niche down: "AWS networking for fintech" / "VPC design for SaaS" / etc.
- Rate $80-120/hr is achievable in a clear niche.
- Consider: enterprise contracts via consultancies for steadier income.`,

    'networking|uk-job':
      `# Recommended path — Networking → UK Cloud Job

Plays to your existing CCNA background.

## Stage 1 (0-2 mo)
- Cloud Practitioner cert.
- 2 portfolio projects (S3+CF, EC2+VPC).
- LinkedIn updated; right-to-work mentioned in bio.

## Stage 2 (2-5 mo)
- SAA cert.
- VPC + Transit Gateway portfolio project.
- Start applying to UK Cloud Engineer / Cloud Network Engineer roles (£45-65k).

## Stage 3 (5-12 mo)
- Land the role.
- Inside, push for projects with networking depth.
- Start Advanced Networking Specialty.

## Stage 4 (year 2+)
- Specialty cert → senior or principal role (£75-110k typical for AWS Network Engineers in UK).`,

    default:
      `# Recommended path

Based on your inputs, the high-ROI first move is:

1. **Earn AWS Cloud Practitioner** (4-6 weeks). Low-stakes confidence builder.
2. **Earn Solutions Architect Associate** (8-12 weeks). The cert with highest pay-bump per hour studied.
3. **Build 3-4 portfolio projects**. Document with diagrams and write-ups.
4. **Decide between salaried (UK job) or self-employed (freelance)**. Different next steps.

Use the Smart Study Plan Generator to pace this.`,
  };

  const key = `${background}|${goal}`;
  return { text: paths[key] || paths.default };
}

// ---------------- 10. Client templates ----------------

export const CLIENT_TEMPLATES = {
  followUp: {
    label: 'Follow-up after proposal',
    body:
`Subject: Quick follow-up on the [project] proposal

Hi {name},

Just bumping this up in case it got buried. Happy to answer any questions or jump on a 10-minute call this week if that\'s easier than email.

If timing or scope isn\'t right, no worries — let me know and I\'ll close the loop.

Best,
{your name}`,
  },
  scopeChange: {
    label: 'Scope-change request',
    body:
`Subject: Change order for {project}

Hi {name},

Per our conversation, the additional work (X, Y, Z) is outside our original scope. Here\'s the change order:

- Additional scope: [details]
- Estimated effort: [N hours]
- Cost: $[N] additional, billed [at next milestone / weekly]
- Impact on timeline: [+ N days]

Reply with "approved" and I\'ll start. Happy to discuss alternatives if budget is tight.

Best,
{your name}`,
  },
  invoiceCover: {
    label: 'Invoice cover email',
    body:
`Subject: Invoice #[N] for {project} — due [date]

Hi {name},

Attaching invoice #[N] for {project}, dated [date].

Summary:
- [Deliverable 1]
- [Deliverable 2]
- Total: $[amount]
- Payment via: [Wise / Payoneer / Stripe link]
- Due: [date]

Thanks for the work — really enjoyed building this with your team.

Best,
{your name}`,
  },
  kickoff: {
    label: 'Project kickoff',
    body:
`Subject: Welcome aboard — {project} kickoff

Hi {name},

Excited to get started. Here\'s how I work so we\'re on the same page:

- **Updates**: short Slack/email every Friday with progress, blockers, next steps.
- **Calls**: 30 min check-in weekly. I\'ll propose a time.
- **Repo**: I\'ll commit to [github URL] and tag you on every PR.
- **Hours**: I\'ll log via Toggl and send a weekly timesheet.

To kick off:
1. Read-only IAM access to the AWS account (I\'ll send the policy JSON).
2. Slack invite or preferred chat tool.
3. Any docs or context I should read first.

Let\'s ship something great.

Best,
{your name}`,
  },
};

// ---------------- helpers exposed ----------------

export function scoreToGrade(s) {
  if (s >= 90) return 'A — strong, polish a few corners';
  if (s >= 75) return 'B — solid, a few clear wins to add';
  if (s >= 60) return 'C — workable, needs sharpening';
  if (s >= 40) return 'D — significant gaps';
  return 'F — start over with the template';
}

export function makeArtifactId() { return uid(); }
