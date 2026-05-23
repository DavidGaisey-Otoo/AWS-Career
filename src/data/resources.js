/**
 * Curated AWS resources library — every link is real, opens in a new tab,
 * and is grouped by what the user is trying to do.
 */

export const RESOURCE_GROUPS = [
  {
    id: 'docs',
    label: 'Official AWS documentation',
    icon: '📚',
    blurb: 'The source of truth — bookmark these.',
    items: [
      { name: 'AWS docs root',                    url: 'https://docs.aws.amazon.com/',                                  blurb: 'Every service, every API.' },
      { name: 'AWS Well-Architected Framework',   url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html', blurb: 'The 6 pillars + design principles.' },
      { name: 'AWS Well-Architected Tool',        url: 'https://aws.amazon.com/well-architected-tool/',                 blurb: 'Run a workload review in the console.' },
      { name: 'AWS Whitepapers + guides',         url: 'https://aws.amazon.com/whitepapers/',                           blurb: 'Searchable archive of every paper.' },
      { name: 'AWS Architecture Center',          url: 'https://aws.amazon.com/architecture/',                          blurb: 'Reference architectures by use case.' },
      { name: 'AWS Builders Library',             url: 'https://aws.amazon.com/builders-library/',                      blurb: 'How Amazon engineers actually build things.' },
      { name: 'AWS Prescriptive Guidance',        url: 'https://aws.amazon.com/prescriptive-guidance/',                 blurb: 'Step-by-step strategies for common scenarios.' },
      { name: 'AWS Service Health Dashboard',     url: 'https://health.aws.amazon.com/health/status',                   blurb: 'Live region + service status.' },
    ],
  },
  {
    id: 'pricing',
    label: 'Pricing + cost tools',
    icon: '💰',
    blurb: 'Estimate, optimise, and track AWS spend.',
    items: [
      { name: 'AWS Pricing Calculator',           url: 'https://calculator.aws/',                                       blurb: 'Build a per-service estimate before deploying.' },
      { name: 'Free Tier overview',               url: 'https://aws.amazon.com/free/',                                  blurb: 'The full list of what\'s free + for how long.' },
      { name: 'AWS Cost Explorer',                url: 'https://console.aws.amazon.com/cost-management/home',           blurb: 'Console URL — opens your billing dashboard.' },
      { name: 'AWS Pricing API',                  url: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-pricing-api.html', blurb: 'Programmatic pricing queries.' },
      { name: 'Vantage AWS Pricing (third-party)',url: 'https://instances.vantage.sh/',                                blurb: 'Fastest EC2 + RDS pricing comparison on the internet.' },
    ],
  },
  {
    id: 'certifications',
    label: 'Certification prep',
    icon: '🎓',
    blurb: 'The best courses, exam guides, and practice platforms.',
    items: [
      { name: 'AWS Skill Builder',                url: 'https://skillbuilder.aws/',                                     blurb: 'Free official courses + paid mock exams.' },
      { name: 'AWS Certification homepage',       url: 'https://aws.amazon.com/certification/',                         blurb: 'All 13 certs + exam guides.' },
      { name: 'Tutorials Dojo',                   url: 'https://tutorialsdojo.com/',                                    blurb: 'Gold-standard practice exams for SAA, SAP, DOP, etc.' },
      { name: 'Adrian Cantrill courses',          url: 'https://learn.cantrill.io/',                                    blurb: 'Deep technical video courses for SAA + SAP.' },
      { name: 'Stephane Maarek on Udemy',         url: 'https://www.udemy.com/user/stephane-maarek/',                   blurb: 'Best-selling associate-level courses.' },
      { name: 'AWS Sample Questions PDF',         url: 'https://d1.awsstatic.com/training-and-certification/docs-sa-assoc/AWS-Certified-Solutions-Architect-Associate_Sample-Questions.pdf', blurb: 'Official 10-question sample for SAA-C03.' },
      { name: 'ExamPro',                          url: 'https://www.exampro.co/',                                       blurb: 'Andrew Brown\'s free YouTube courses + paid resources.' },
    ],
  },
  {
    id: 'community',
    label: 'Community + people',
    icon: '👥',
    blurb: 'Follow the right people, ship faster.',
    items: [
      { name: 'AWS re:Post',                      url: 'https://repost.aws/',                                           blurb: 'Official AWS Q&A — replaces forums.' },
      { name: 'r/aws subreddit',                  url: 'https://www.reddit.com/r/aws/',                                 blurb: 'Real-world discussion, outage threads, hiring.' },
      { name: 'AWS Heroes',                       url: 'https://aws.amazon.com/developer/community/heroes/',            blurb: 'Top community experts to follow.' },
      { name: 'AWS Community Builders',           url: 'https://aws.amazon.com/developer/community/community-builders/',blurb: 'Growing tier of active community contributors.' },
      { name: 'last week in AWS',                 url: 'https://www.lastweekinaws.com/',                                blurb: 'Corey Quinn\'s newsletter — opinionated + funny.' },
      { name: 'AWS News Blog',                    url: 'https://aws.amazon.com/blogs/aws/',                             blurb: 'Official launches + deep dives by Jeff Barr et al.' },
    ],
  },
  {
    id: 'video',
    label: 'Video + talks',
    icon: '📺',
    blurb: 'Watch experienced engineers solve real problems.',
    items: [
      { name: 'AWS re:Invent (official channel)', url: 'https://www.youtube.com/@AWSEventsChannel',                     blurb: '5,000+ talks. Search "300/400" for deep technical.' },
      { name: 'Adrian Cantrill on YouTube',       url: 'https://www.youtube.com/@AdrianCantrill',                       blurb: 'Networking + advanced architecture.' },
      { name: 'Be A Better Dev',                  url: 'https://www.youtube.com/@BeABetterDev',                         blurb: 'Practical AWS development tutorials.' },
      { name: 'AWS Training Online',              url: 'https://www.youtube.com/@AWSTrainingOnline',                    blurb: 'Free certification-aligned videos.' },
      { name: 'Cloud Guru / A Cloud Guru',        url: 'https://www.youtube.com/@AcloudGuru',                           blurb: 'Bite-sized announcements + cert breakdowns.' },
    ],
  },
  {
    id: 'iac',
    label: 'Infrastructure as Code',
    icon: '🧱',
    blurb: 'Terraform, CDK, CloudFormation references.',
    items: [
      { name: 'Terraform AWS provider docs',      url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs',    blurb: 'Every AWS resource + example HCL.' },
      { name: 'AWS CDK docs (v2)',                url: 'https://docs.aws.amazon.com/cdk/v2/guide/home.html',            blurb: 'Define infra in TypeScript / Python / Java.' },
      { name: 'AWS SAM',                          url: 'https://aws.amazon.com/serverless/sam/',                        blurb: 'Lightweight CFN for serverless.' },
      { name: 'CloudFormation user guide',        url: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html', blurb: 'The original IaC tool — still GA.' },
      { name: 'AWS Solutions Constructs',         url: 'https://docs.aws.amazon.com/solutions/latest/constructs/welcome.html', blurb: 'Pre-built CDK patterns — copy, don\'t re-invent.' },
    ],
  },
  {
    id: 'security',
    label: 'Security + compliance',
    icon: '🛡',
    blurb: 'Harden every workload from day one.',
    items: [
      { name: 'AWS Security Best Practices',      url: 'https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html', blurb: 'The Security pillar reference.' },
      { name: 'IAM policy examples',              url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_examples.html', blurb: 'Copy-paste least-privilege examples.' },
      { name: 'AWS Compliance Center',            url: 'https://aws.amazon.com/compliance/',                            blurb: 'SOC, ISO, PCI, HIPAA artifacts.' },
      { name: 'Prowler open-source scanner',      url: 'https://github.com/prowler-cloud/prowler',                      blurb: 'Free CSPM scanner — runs against your accounts.' },
      { name: 'AWS Security Hub',                 url: 'https://aws.amazon.com/security-hub/',                          blurb: 'Centralised security findings + standards.' },
    ],
  },
  {
    id: 'cheatsheets',
    label: 'Cheat sheets',
    icon: '📝',
    blurb: 'Quick-reference summaries when you need a fact in 10 seconds.',
    items: [
      { name: 'Tutorials Dojo cheat sheets',      url: 'https://tutorialsdojo.com/aws-cheat-sheets/',                   blurb: 'Per-service one-page summaries.' },
      { name: 'AWS in plain English',             url: 'https://expeditedsecurity.com/aws-in-plain-english/',           blurb: 'What does S3 / SQS / Lambda actually do?' },
      { name: 'AWS CLI command reference',        url: 'https://docs.aws.amazon.com/cli/latest/reference/',             blurb: 'Searchable list of every CLI command.' },
      { name: 'IAM action reference',             url: 'https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html', blurb: 'Every action you can put in a policy.' },
      { name: 'AWS region table',                 url: 'https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/', blurb: 'Which services exist in which region.' },
      { name: 'S3 storage classes comparison',    url: 'https://aws.amazon.com/s3/storage-classes/',                    blurb: 'Standard vs IA vs Glacier vs Deep Archive.' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools + utilities',
    icon: '🛠',
    blurb: 'Daily-driver utilities that pay back instantly.',
    items: [
      { name: 'AWS Toolkit for VS Code',          url: 'https://aws.amazon.com/visualstudiocode/',                      blurb: 'Lambda + SAM debugging directly in your editor.' },
      { name: 'AWS Workshops',                    url: 'https://workshops.aws/',                                        blurb: 'Self-paced labs — most are free.' },
      { name: 'AWS Solutions Library',            url: 'https://aws.amazon.com/solutions/',                             blurb: 'Pre-built reference solutions, deploy in 1 click.' },
      { name: 'Cloudcraft (diagrams)',            url: 'https://www.cloudcraft.co/',                                    blurb: 'Beautiful AWS architecture diagrams + live cost.' },
      { name: 'Steampipe',                        url: 'https://steampipe.io/',                                         blurb: 'Query your AWS account with SQL.' },
      { name: 'aws-vault',                        url: 'https://github.com/99designs/aws-vault',                        blurb: 'Securely store IAM credentials in your OS keychain.' },
    ],
  },
  {
    id: 'freelance',
    label: 'Freelance + business',
    icon: '💼',
    blurb: 'Find AWS work, send proposals, get paid.',
    items: [
      { name: 'Upwork (Cloud Engineer jobs)',     url: 'https://www.upwork.com/freelance-jobs/aws/',                    blurb: 'Largest pool of remote AWS gigs.' },
      { name: 'Toptal',                           url: 'https://www.toptal.com/',                                       blurb: 'Higher-end vetted freelance network.' },
      { name: 'AWS Partner Network',              url: 'https://aws.amazon.com/partners/',                              blurb: 'Become a registered Consulting Partner.' },
      { name: 'Wise (multi-currency)',            url: 'https://wise.com/',                                             blurb: 'Best for international payouts from Upwork.' },
      { name: 'Payoneer',                         url: 'https://www.payoneer.com/',                                     blurb: 'Default Upwork payout — instant USD bank details.' },
    ],
  },
];

/** Flat list of every resource — useful for the search bar. */
export const ALL_RESOURCES = RESOURCE_GROUPS.flatMap((g) =>
  g.items.map((it) => ({ ...it, groupId: g.id, groupLabel: g.label }))
);
