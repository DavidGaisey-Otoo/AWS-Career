/**
 * LinkedIn content engine — calendar + post templates for AWS freelancers.
 */

export const POST_TEMPLATES = [
  {
    id: 'project-completion',
    label: 'Project completion announcement',
    icon: '🎉',
    body: `Wrapped a 3-week AWS engagement with {client_name}. The challenge: {pain_point}. The result: {result}.

Three lessons from this build:
1. {lesson_1}
2. {lesson_2}
3. {lesson_3}

Big thanks to {client_first_name} and the team for trusting me with this.

#AWS #CloudEngineering #Freelance`,
  },
  {
    id: 'cert-earned',
    label: 'Certification earned',
    icon: '🏆',
    body: `Just passed the {cert_name} exam ({cert_code}).

It took {weeks} weeks of: {study_summary}.

If you're prepping for the same exam, my honest takeaways:
• {takeaway_1}
• {takeaway_2}
• {takeaway_3}

Happy to share my study plan with anyone studying — drop a comment.

#AWS #CloudCert #Learning`,
  },
  {
    id: 'lesson-learned',
    label: 'Lesson-learned story',
    icon: '💡',
    body: `Spent {hours} hours yesterday debugging a "production was working, now it's not" AWS issue.

Turns out: {root_cause}.

What I learned:
- {lesson_1}
- {lesson_2}
- The 5-minute fix that would've prevented all of it: {prevention}

Sharing here so you don't lose the same {hours} hours.

#AWS #Engineering`,
  },
  {
    id: 'aws-tip',
    label: 'AWS tip of the week',
    icon: '⚡',
    body: `AWS tip of the week: {tip_title}

Most people {common_mistake}. The cheaper, safer path:

✅ {tip_step_1}
✅ {tip_step_2}
✅ {tip_step_3}

Try this and let me know the results.

#AWS #CloudTips`,
  },
  {
    id: 'behind-scenes',
    label: 'Behind-the-scenes',
    icon: '🎬',
    body: `Behind the scenes of building {project_type}:

My screen for the last 4 hours:
- {activity_1}
- {activity_2}
- {activity_3}

The unglamorous reality of cloud engineering isn't writing code — it's reading docs at 2am wondering why your VPC peering "should work".

Loving every minute of it.

#AWS #Freelance`,
  },
  {
    id: 'client-win',
    label: 'Client win',
    icon: '⭐',
    body: `Closed my {ordinal} project this month — a {project_type} for a {industry} company.

Reflection: 18 months ago I had {past_state}. Today I'm {current_state}.

The single biggest thing that changed: {change_factor}.

If you're early on this path and wondering if it works — it does. Keep building.

#AWS #Freelance #Cloud`,
  },
  {
    id: 'milestone',
    label: 'Milestone celebration',
    icon: '🎯',
    body: `Hit a milestone today: {milestone}.

A year ago this felt impossible. Looking back, the things that moved the needle:
1. {factor_1}
2. {factor_2}
3. {factor_3}

To everyone in the early days: this stuff compounds. Show up.

#AWS #Cloud #Growth`,
  },
  {
    id: 'service-deep-dive',
    label: 'AWS service deep-dive',
    icon: '🔬',
    body: `Quick deep-dive on {aws_service}:

What it does: {what}
When to use it: {when}
Common gotcha: {gotcha}
Cost gotcha: {cost_gotcha}

Underrated tip: {tip}

If you're using {aws_service}, what's your hardest-won lesson? Drop it in the comments.

#AWS #{aws_service_tag}`,
  },
  {
    id: 'comparison',
    label: 'A vs B comparison',
    icon: '⚖',
    body: `{service_a} vs {service_b} — when to pick each:

Pick {service_a} when:
• {a_reason_1}
• {a_reason_2}

Pick {service_b} when:
• {b_reason_1}
• {b_reason_2}

Wrong tool for the job is the #1 cost-of-cloud problem I see.

#AWS #CloudArchitecture`,
  },
  {
    id: 'cost-saved',
    label: 'Cost optimization win',
    icon: '💰',
    body: `Cut a client's AWS bill from {before} to {after} — a {savings_pct}% drop — in {duration}.

The wins:
1. {win_1}
2. {win_2}
3. {win_3}

Cost engineering is not glamorous. But it pays for itself in week 1.

If your bill feels heavier than it should — happy to chat.

#FinOps #AWS #CostOptimization`,
  },
];

// 4-week content calendar — 12 posts across 4 weeks, balanced across categories.
export const CONTENT_CALENDAR = [
  // Week 1
  { day: 'Mon W1', category: 'milestone',          label: 'Anchor post — why your niche matters' },
  { day: 'Wed W1', category: 'aws-tip',            label: 'Easy AWS tip — under 200 words' },
  { day: 'Fri W1', category: 'lesson-learned',     label: 'Story: a bug + the lesson' },
  // Week 2
  { day: 'Mon W2', category: 'service-deep-dive',  label: 'Service deep-dive — high-value topic' },
  { day: 'Wed W2', category: 'behind-scenes',      label: 'Behind the scenes of current project' },
  { day: 'Fri W2', category: 'cost-saved',         label: 'Cost win (real numbers if allowed)' },
  // Week 3
  { day: 'Mon W3', category: 'comparison',         label: 'A vs B comparison post' },
  { day: 'Wed W3', category: 'aws-tip',            label: 'AWS tip + screenshot' },
  { day: 'Fri W3', category: 'project-completion', label: 'Project completion (with client OK)' },
  // Week 4
  { day: 'Mon W4', category: 'cert-earned',        label: 'If you certified — celebrate it' },
  { day: 'Wed W4', category: 'lesson-learned',     label: 'Lesson-learned post #2' },
  { day: 'Fri W4', category: 'milestone',          label: 'Monthly reflection + ask for referrals' },
];

// LinkedIn headline templates
export const HEADLINE_OPTIONS = (firstName) => [
  `AWS Cloud Engineer | Helping startups ship faster on AWS`,
  `AWS Solutions Architect | Networking specialist | UK + remote`,
  `Freelance AWS Engineer | Cost optimization · DevOps · Networking`,
  `${firstName} | AWS-certified cloud engineer for growing teams`,
  `AWS Cloud Engineer | I help non-cloud teams ship to AWS without burning their bill`,
  `Building scalable, secure AWS infrastructure for B2B SaaS`,
  `Freelance AWS Cloud Engineer | Available — DM for project quotes`,
  `AWS Solutions Architect | I migrate, optimise, and operate cloud at scale`,
  `Ex-network engineer turned AWS cloud freelancer | I do the boring stuff right`,
  `Cloud engineer focused on outcomes, not jargon | AWS · Terraform · CDK`,
];

// Website copy hero/about templates (placeholders for the page generator)
export const WEBSITE_BLOCKS = {
  hero: [
    `I help {audience} ship faster on AWS — securely, sustainably, without burning the bill.`,
    `Production-grade AWS infrastructure, built by a senior engineer, priced for {audience}.`,
    `Your cloud, done right. AWS architecture, migrations, and operations for {audience}.`,
  ],
  about: [
    `I'm {your_name}. I build, migrate, and operate AWS workloads for {audience}. Before AWS I spent {years_networking} years in enterprise networking, which is why my designs lean heavily on getting the boring stuff right: VPC topology, security boundaries, observability, runbooks. I'm based in {location} and work across timezones.`,
  ],
  services: [
    `Cloud architecture & landing zones`,
    `Migration & modernisation`,
    `Cost optimization sprints`,
    `Observability & on-call setup`,
    `Disaster recovery design & drills`,
    `Network design (VPC, TGW, hybrid)`,
  ],
};

// ============================================================
// Stage 17 — 3-variant post generator for the Content Queue
// ============================================================

/**
 * Generate 3 LinkedIn post variants for a completed project.
 *
 * Returns: [{ variant, label, body }] — user picks one + stages it
 * in the Content Queue (or copies it straight to LinkedIn).
 */
export function postsFromProject(project, projectState = {}, profile = {}) {
  const services = (project.services || []).slice(0, 5).map((s) => '#' + String(s).toUpperCase()).join(' ');
  const ghHandle = (profile?.integrations?.github || '').split('/').pop() || '';
  return [
    {
      variant: 'technical',
      label: 'Technical (engineers + recruiters)',
      body: [
        `Just shipped ${project.title} on AWS.`,
        '',
        'Architecture in one paragraph:',
        project.summary || project.tagline || '',
        '',
        `Stack: ${(project.services || []).slice(0, 6).map((s) => String(s).toUpperCase()).join(' · ')}`,
        '',
        'What I would do differently:',
        '• ' + (project.commonErrors?.[0]?.fix || 'Lock the IaC repo earlier in the build.'),
        '• Add Multi-AZ from day one — costs ~$0 extra and saves a 3am incident.',
        '• Tag every resource for cost allocation.',
        '',
        ghHandle ? `Repo: github.com/${ghHandle} (link in comments)` : 'Repo link in comments.',
        '',
        `${services} #AWS #CloudEngineer #DevOps`,
      ].filter((x) => x !== undefined).join('\n'),
    },
    {
      variant: 'business',
      label: 'Business (non-engineers + clients)',
      body: [
        `Just shipped ${project.title} on AWS.`,
        '',
        `Built for: ${(project.businessCase || 'a small business that wants modern infrastructure without the modern price tag').split('.')[0]}.`,
        '',
        'The result:',
        '• ' + (project.presentation?.[0] || 'Production-ready in days, not months.'),
        '• ' + (project.presentation?.[1] || 'Runs at near-free-tier cost while small, scales globally without re-architecture.'),
        '• ' + (project.presentation?.[2] || 'Documented end-to-end — handover is one call, not one week.'),
        '',
        'Looking for cloud engineering help? DM me — I help small teams get production-grade AWS without the agency markup.',
        '',
        '#AWS #CloudConsulting #SmallBusiness',
      ].join('\n'),
    },
    {
      variant: 'lessons',
      label: 'Lessons learned (story + insight)',
      body: [
        `A short note on ${project.title} that took me longer than it should have.`,
        '',
        (projectState?.lessons || '').trim() || `Spent the last week building ${project.title}. The thing that surprised me most: [INSERT what surprised you most — 1 sentence]`,
        '',
        'Three things I would tell past-me:',
        '1. The docs lie about defaults — always verify with the AWS CLI.',
        '2. Free Tier is not "free forever" — set a $5 billing alarm BEFORE you build anything.',
        '3. Multi-AZ defaults to Single-AZ if you do not tick it. Learn that lesson on day one.',
        '',
        'If you are learning AWS too — what is the gotcha that bit you hardest?',
        '',
        '#AWS #BuildInPublic #CloudLearning',
      ].join('\n'),
    },
  ];
}

/** Generate 3 LinkedIn post variants for an AWS certification pass. */
export function postsFromCertPass({ certName, certCode, score = '', journey = '' }) {
  const tag = '#' + String(certCode || '').replace(/[^A-Z0-9]/gi, '');
  return [
    {
      variant: 'achievement',
      label: 'Achievement (clean + confident)',
      body: [
        `${certName} ✅`,
        '',
        `${certCode}${score ? ` — scored ${score}.` : '.'}`,
        '',
        'What it covered:',
        '• Architecting secure, resilient, performant workloads on AWS',
        '• Cost optimisation strategies that compound month after month',
        '• Network design for hybrid + multi-account environments',
        '',
        journey ? `My prep: ${journey}` : 'Next up: applying it to client work.',
        '',
        `#AWS ${tag} #Certified`,
      ].join('\n'),
    },
    {
      variant: 'journey',
      label: 'Journey (relatable + honest)',
      body: [
        `${certCode} is in the bag.`,
        '',
        'For anyone debating whether to take it — here is the honest version:',
        '',
        '• 90% of the value is not in the cert — it is in the structured study.',
        '• The hardest part is pricing/services questions, not architecture ones.',
        '• Tutorials Dojo practice exams beat anything else. Period.',
        '',
        'Now putting it to work on real client architectures.',
        '',
        `#AWS ${tag} #BuildInPublic`,
      ].join('\n'),
    },
    {
      variant: 'open',
      label: 'Open to work (recruiter-targeted)',
      body: [
        `${certName} — done.`,
        '',
        `That is ${certCode} added to my AWS portfolio.`,
        '',
        'I help small + mid-size teams ship production-grade AWS infrastructure without an agency budget.',
        '',
        'Open to remote contracts (UK / EU timezones). DM if you have an AWS engagement coming up.',
        '',
        `#OpenToWork #AWS ${tag} #Freelance`,
      ].join('\n'),
    },
  ];
}

/** 12 topic ideas for the weekly post calendar. */
export const TOPIC_IDEAS = [
  'How I would architect Netflix on AWS for $10/month',
  'The 3 IAM patterns every junior should know',
  'Why your S3 bill is 10× what it should be (and how to fix it)',
  'Multi-AZ vs Read Replica — when to use which',
  'I migrated a Heroku app to AWS in a weekend. Here is the runbook.',
  'CloudFormation vs Terraform — pick one for the next 5 years',
  'The Free Tier services that stay free forever',
  'How to read a CloudWatch alarm before it pages you',
  '5 AWS services I wish I had learned earlier',
  'The "shared responsibility model" in 3 sentences',
  'NAT Gateway is $33/mo. Here is when to use a NAT Instance instead.',
  'Cognito vs JWT vs IAM Identity Center — auth for AWS apps',
];
