/**
 * topicStudyGuidesFill.js — EX-24: study guides for roadmap services that
 * had none.
 *
 * THE GAP
 * ───────
 * saaRoadmap.js schedules 47 services across 8 phases, but guideIdForService()
 * resolved only 33 of them. The remaining 14 rendered as a checklist item with
 * no "Study guide" link — the UI degraded gracefully (hasGuide = !!guideId, so
 * no crash) but a candidate following their own roadmap hit a dead end on
 * EFS, Cognito, Organizations, VPN and the Well-Architected Framework, all of
 * which are genuinely examinable.
 *
 * WHAT THIS ADDS
 * ──────────────
 * Five full guides for the substantial topics:
 *   efs · cognito · orgs · vpn · wellarch-fw
 *
 * One combined guide for the nine services the roadmap itself marks as
 * "lightly tested — know what each does":
 *   fsx · beanstalk · global-accel · guard-macie · xray · compute-opt ·
 *   trusted-adv · budgets · cli
 *
 * Combining those is deliberate rather than lazy: the exam tests them at
 * recognition level ("which service does X?"), so a single comparison-oriented
 * guide matches how they should actually be studied. Nine thin guides would
 * imply nine study sessions the roadmap explicitly budgets one hour each for.
 *
 * Schema matches TOPIC_STUDY_GUIDES exactly:
 *   { title, subtitle, estReadMin, overview, sections[], examTraps[],
 *     cheatsheet[], flashcards[], resources[] }
 * where a section is { title, bullets[] } or { title, table:{headers,rows} }.
 */

export const TOPIC_STUDY_GUIDES_FILL = {
  // ══════════════════════════════════════════════════════════════════
  efs: {
    title: 'Amazon EFS — Elastic File System',
    subtitle: 'Managed POSIX shared file storage that many instances mount at once',
    estReadMin: 6,
    overview: 'EFS is a fully managed NFS file system for Linux. Its defining property is that thousands of instances across multiple Availability Zones can mount and write to it simultaneously with standard POSIX semantics — which is exactly what EBS cannot do. Capacity grows and shrinks automatically with no provisioning. On the exam, EFS is the answer whenever you see "shared", "concurrent access from multiple instances", and "POSIX" or "NFS" together.',
    sections: [
      {
        title: 'EFS vs EBS vs FSx vs S3 — the decision the exam actually tests',
        table: {
          headers: ['', 'EFS', 'EBS', 'FSx for Windows', 'S3'],
          rows: [
            ['Protocol', 'NFS (POSIX)', 'Block device', 'SMB', 'HTTP API'],
            ['Concurrent mounts', 'Thousands, multi-AZ', 'One instance (Multi-Attach: io1/io2, single AZ)', 'Many Windows clients', 'N/A — object store'],
            ['Scope', 'Regional (multi-AZ)', 'Single AZ', 'Single or multi-AZ', 'Regional'],
            ['Capacity', 'Automatic, elastic', 'Provisioned, fixed', 'Provisioned', 'Unlimited'],
            ['Client OS', 'Linux', 'Any', 'Windows', 'Any'],
            ['Pick when', 'Linux fleet shares files', 'One instance needs a disk', 'Windows shared drive / AD', 'Objects, not a filesystem'],
          ],
        },
      },
      {
        title: 'Storage classes and lifecycle',
        bullets: [
          'EFS Standard — multi-AZ, the default for production shared data',
          'EFS One Zone — single AZ, roughly 47% cheaper; acceptable for reproducible or dev data',
          'Infrequent Access (IA) variants of both — much lower per-GB rate plus a per-access retrieval charge',
          'Lifecycle management moves files not accessed for a configured period (7 to 365 days) into IA automatically',
          'Files in IA remain transparently readable — no restore step, unlike Glacier. The application does not change',
          'Archive class exists for data accessed a few times a year, cheaper still than IA',
        ],
      },
      {
        title: 'Mount targets — the part people get wrong',
        bullets: [
          'You do not connect to EFS directly; you connect through a mount target, which is an ENI in a subnet',
          'A mount target is PER AVAILABILITY ZONE. Instances in an AZ with no mount target cannot reach the file system',
          'So a fleet spanning three AZs needs three mount targets — a very common exam detail',
          'The mount target\'s security group must allow inbound NFS (TCP 2049) from the instances\' security group',
          'On-premises servers can mount EFS over Direct Connect or VPN',
        ],
      },
      {
        title: 'Performance and throughput modes',
        bullets: [
          'Elastic throughput (default, recommended) — scales automatically, pay for what you use',
          'Provisioned throughput — fixed MB/s independent of stored size; use when you need high throughput on a small file system',
          'Bursting throughput — scales with size using a credit model; small file systems can exhaust credits',
          'General Purpose performance mode — lowest latency, the right default',
          'Max I/O performance mode — higher aggregate throughput at the cost of slightly higher latency, for very large parallel workloads',
        ],
      },
      {
        title: 'Security',
        bullets: [
          'Encryption at rest with KMS, enabled at creation time',
          'Encryption in transit using TLS via the amazon-efs-utils mount helper',
          'Access controlled by POSIX file permissions plus IAM file system policies and security groups',
          'EFS Access Points enforce a specific POSIX user/group and root directory per application — the clean way to share one file system between apps',
        ],
      },
    ],
    examTraps: [
      'EBS cannot be shared across AZs. Multi-Attach is io1/io2 only, single-AZ, and needs a cluster-aware filesystem — it is NOT the answer to "many instances share files"',
      'Forgetting a mount target in each AZ — instances in the missing AZ simply cannot mount',
      'EFS is Linux/NFS. For Windows SMB shares the answer is FSx for Windows File Server, never EFS',
      'One Zone loses AZ redundancy. Do not choose it when the question stresses durability or availability',
      'IA is transparent — do not describe it as needing a "restore" like Glacier does',
      'NFS is TCP port 2049. A blocked security group is the usual cause of a hanging mount',
    ],
    cheatsheet: [
      { k: 'Signal phrase', v: 'Shared POSIX / NFS / concurrent access', desc: 'Multiple Linux instances reading and writing the same files means EFS.' },
      { k: 'Mount target', v: 'One per Availability Zone', desc: 'An ENI in each AZ\'s subnet. Miss one and that AZ cannot mount.' },
      { k: 'Port', v: 'TCP 2049', desc: 'NFS. Must be open from the client security group to the mount target security group.' },
      { k: 'Cheaper tier', v: 'Lifecycle to IA after N days', desc: 'Transparent access; retrieval charge per access. No application change.' },
      { k: 'Single-AZ option', v: 'EFS One Zone', desc: '~47% cheaper. Only for reproducible or non-critical data.' },
      { k: 'Windows equivalent', v: 'FSx for Windows File Server', desc: 'SMB protocol, integrates with Active Directory.' },
      { k: 'HPC equivalent', v: 'FSx for Lustre', desc: 'Very high throughput scratch, links to S3.' },
      { k: 'Throughput default', v: 'Elastic', desc: 'Scales automatically; provisioned only for high throughput on small file systems.' },
    ],
    flashcards: [
      { q: '60 Linux instances across 3 AZs must write the same directory. Service?', a: 'EFS, with a mount target in each of the three AZs' },
      { q: 'Windows servers need a shared drive joined to Active Directory. Service?', a: 'FSx for Windows File Server (SMB) — not EFS' },
      { q: 'How many mount targets for a file system used from 3 AZs?', a: 'Three — one per AZ' },
      { q: 'Which port must the mount target security group allow?', a: 'TCP 2049 (NFS)' },
      { q: 'Cheapest EFS option for reproducible scratch data?', a: 'EFS One Zone (with IA lifecycle if access is infrequent)' },
    ],
    resources: [
      { label: 'Amazon EFS User Guide', url: 'https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html' },
      { label: 'EFS storage classes and lifecycle', url: 'https://docs.aws.amazon.com/efs/latest/ug/storage-classes.html' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  cognito: {
    title: 'Amazon Cognito — Application User Identity',
    subtitle: 'User Pools authenticate your app\'s users; Identity Pools hand them AWS credentials',
    estReadMin: 6,
    overview: 'Cognito manages identity for the users of your application — customers signing into a mobile or web app — as distinct from IAM, which manages identity for people and workloads operating AWS itself. The single most examined point is the split between its two halves: a User Pool is a directory that authenticates users and issues tokens, while an Identity Pool exchanges a token for temporary AWS credentials so the user can call AWS services directly. Many questions hinge on knowing which one is being asked for.',
    sections: [
      {
        title: 'User Pool vs Identity Pool — learn this table',
        table: {
          headers: ['', 'User Pool', 'Identity Pool (Federated Identities)'],
          rows: [
            ['Purpose', 'Authentication — who is this user?', 'Authorisation — what AWS access do they get?'],
            ['Gives you', 'JWT tokens (ID, access, refresh)', 'Temporary AWS credentials via STS'],
            ['Holds users?', 'Yes — it is a user directory', 'No — it maps identities to IAM roles'],
            ['Sign-in UI', 'Hosted UI, sign-up, MFA, password reset', 'None'],
            ['Typical use', 'Protect an API Gateway or ALB', 'Let an app upload directly to S3 or query DynamoDB'],
            ['Guest users', 'No', 'Yes — unauthenticated identities supported'],
          ],
        },
      },
      {
        title: 'How they combine in the common pattern',
        bullets: [
          'User signs in against the User Pool and receives an ID token',
          'App presents that token to the Identity Pool',
          'Identity Pool assumes an IAM role and returns temporary AWS credentials',
          'App calls S3 or DynamoDB directly with those credentials, scoped by the role',
          'Either half can be used alone: a User Pool alone to protect an API, an Identity Pool alone to give guests limited AWS access',
        ],
      },
      {
        title: 'User Pool features that appear in questions',
        bullets: [
          'Social and enterprise federation — sign in with Google, Apple, Facebook, or any SAML 2.0 / OIDC provider',
          'MFA including SMS and TOTP, plus adaptive authentication that raises challenge level on risky sign-ins',
          'Lambda triggers at lifecycle points: pre sign-up, post confirmation, pre token generation, custom auth challenge, migrate user',
          'The migrate-user trigger imports users from a legacy directory transparently on their first sign-in',
          'Groups within a User Pool can map to IAM roles for coarse authorisation',
          'Direct integration as an API Gateway authorizer and as an ALB authentication action — no custom code required',
        ],
      },
      {
        title: 'Cognito vs IAM vs IAM Identity Center — do not confuse these',
        table: {
          headers: ['Service', 'Identities it serves', 'Use when'],
          rows: [
            ['Cognito', 'Your application\'s end users (customers)', 'A consumer app needs sign-up, sign-in, social login'],
            ['IAM', 'AWS principals — roles, workloads, service access', 'An EC2 instance or Lambda needs AWS permissions'],
            ['IAM Identity Center', 'Your workforce (employees)', 'Staff need console or CLI access across many accounts'],
          ],
        },
      },
    ],
    examTraps: [
      'Using Cognito for employee console access — that is IAM Identity Center. Cognito is for application end users',
      'Assuming a User Pool grants AWS access. It issues tokens; the Identity Pool is what exchanges them for AWS credentials',
      'Choosing an Identity Pool when the requirement is sign-up, password reset and MFA — those are User Pool features',
      'Forgetting Identity Pools support unauthenticated guest identities, which is often the cheapest answer for read-only public access',
      'Building a custom Lambda authorizer when a Cognito User Pool authorizer on API Gateway does the job natively',
    ],
    cheatsheet: [
      { k: 'Authenticate app users', v: 'User Pool', desc: 'Directory plus hosted sign-in UI. Returns JWTs.' },
      { k: 'Get AWS credentials', v: 'Identity Pool', desc: 'Exchanges a token for temporary STS credentials mapped to an IAM role.' },
      { k: 'Protect API Gateway', v: 'Cognito User Pool authorizer', desc: 'Native integration, no custom authorizer code.' },
      { k: 'Guest access', v: 'Identity Pool unauthenticated role', desc: 'Limited AWS access without sign-in.' },
      { k: 'Import legacy users', v: 'Migrate-user Lambda trigger', desc: 'Users move across silently on first successful sign-in.' },
      { k: 'Employee SSO', v: 'NOT Cognito — IAM Identity Center', desc: 'Workforce access to the console and CLI.' },
      { k: 'Enterprise federation', v: 'SAML 2.0 / OIDC into a User Pool', desc: 'Corporate IdP for application users.' },
      { k: 'Risky sign-in handling', v: 'Adaptive authentication', desc: 'Escalates the challenge based on a risk score.' },
    ],
    flashcards: [
      { q: 'Mobile app users must upload straight to S3 under their own identity. What do you need?', a: 'A User Pool to authenticate, then an Identity Pool to exchange the token for AWS credentials' },
      { q: 'Which Cognito component holds the user directory?', a: 'The User Pool' },
      { q: 'Employees need console access across 12 accounts. Cognito?', a: 'No — IAM Identity Center. Cognito serves application end users' },
      { q: 'Adding sign-in to an API Gateway REST API with least custom code?', a: 'A Cognito User Pool authorizer' },
      { q: 'Moving users off a legacy database without forcing password resets?', a: 'The migrate-user Lambda trigger on the User Pool' },
    ],
    resources: [
      { label: 'Amazon Cognito Developer Guide', url: 'https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html' },
      { label: 'User Pools vs Identity Pools', url: 'https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-scenarios.html' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  orgs: {
    title: 'AWS Organizations — Multi-Account Governance',
    subtitle: 'OUs, Service Control Policies, and consolidated billing across many accounts',
    estReadMin: 6,
    overview: 'Organizations groups many AWS accounts under one management account so you can apply guardrails centrally and receive one bill. Two ideas dominate exam questions: Service Control Policies, which set the maximum permissions any principal in a member account can ever have, and consolidated billing, which aggregates usage so volume discounts and commitment purchases apply across the whole organisation. The crucial subtlety is that an SCP grants nothing — it only limits what IAM is allowed to grant.',
    sections: [
      {
        title: 'Structure',
        bullets: [
          'Management account (formerly master) — owns the organisation, pays the bill, cannot be restricted by SCPs',
          'Organizational Units (OUs) — containers that can nest, so policies apply to a whole branch of the tree',
          'Member accounts — everything else; SCPs attached to their OU or the root apply to them',
          'Enable "all features" rather than consolidated-billing-only to get SCPs and the full governance set',
          'Accounts can be created directly in the organisation or invited in',
        ],
      },
      {
        title: 'Service Control Policies — the most examined concept',
        bullets: [
          'An SCP defines the CEILING of available permissions, never a grant. A principal needs BOTH an SCP that allows the action AND an IAM policy that permits it',
          'Effective permission is the intersection: SCP ∩ IAM identity policy ∩ any resource policy or permissions boundary',
          'An explicit Deny in an SCP always wins and cannot be overridden by any IAM policy',
          'SCPs apply to the root, an OU, or a single account, and are inherited down the tree',
          'They do NOT apply to the management account — a common trap',
          'They do not affect service-linked roles',
          'Classic uses: deny leaving the organisation, deny disabling CloudTrail or GuardDuty, restrict which Regions may be used, deny disabling S3 Block Public Access',
        ],
      },
      {
        title: 'Consolidated billing',
        bullets: [
          'One payer, one invoice, per-account cost visibility retained',
          'Usage aggregates across accounts, so volume pricing tiers are reached sooner (S3 storage tiers, data transfer tiers)',
          'Reserved Instances and Savings Plans purchased centrally can apply to matching usage in any member account when sharing is enabled',
          'That aggregation is what lets several small accounts collectively justify a commitment none could justify alone',
          'Cost allocation tags must be activated in the Billing console before they appear in cost reports',
        ],
      },
      {
        title: 'Related governance services',
        table: {
          headers: ['Service', 'What it does'],
          rows: [
            ['AWS Control Tower', 'Sets up a multi-account landing zone with guardrails and an account factory on top of Organizations'],
            ['AWS Config aggregator', 'Collects configuration and compliance data from all accounts into one view'],
            ['Organization CloudTrail trail', 'One trail capturing API activity for every account, delivered centrally'],
            ['Delegated administrator', 'Lets a member account administer a service (GuardDuty, Config) organisation-wide'],
            ['Tag policies', 'Standardise tag keys and values across accounts'],
          ],
        },
      },
    ],
    examTraps: [
      'Believing an SCP grants permissions. It only limits. Without a matching IAM policy the principal still has no access',
      'Expecting an SCP to restrict the management account — it does not. Put workloads in member accounts',
      'Confusing an SCP with a permissions boundary: SCPs apply to accounts and OUs, boundaries apply to individual IAM principals',
      'Forgetting that an explicit Deny anywhere in the chain is final',
      'Assuming consolidated billing alone gives SCPs — you must enable all features',
      'Overlooking that RI and Savings Plans sharing must be enabled for discounts to flow between accounts',
    ],
    cheatsheet: [
      { k: 'SCP semantics', v: 'Permission ceiling, never a grant', desc: 'Effective access is the intersection of SCP and IAM policy.' },
      { k: 'Management account', v: 'Not restricted by SCPs', desc: 'Keep workloads out of it; use member accounts.' },
      { k: 'Explicit Deny', v: 'Always wins', desc: 'Cannot be overridden by any identity or resource policy.' },
      { k: 'Region restriction', v: 'SCP with a Deny on non-approved Regions', desc: 'The standard way to enforce data residency org-wide.' },
      { k: 'Prevent public buckets', v: 'Block Public Access + SCP denying its removal', desc: 'The control plus the guardrail that stops it being disabled.' },
      { k: 'Volume discounts', v: 'Consolidated billing aggregates usage', desc: 'Tiers reached sooner; commitments shared across accounts.' },
      { k: 'Landing zone', v: 'AWS Control Tower', desc: 'Opinionated multi-account setup with guardrails and account factory.' },
      { k: 'Feature set', v: 'Enable "all features"', desc: 'Consolidated-billing-only mode has no SCPs.' },
    ],
    flashcards: [
      { q: 'Does an SCP grant permissions?', a: 'No. It sets the maximum available; an IAM policy must still grant the action' },
      { q: 'Can an SCP restrict the management account?', a: 'No — SCPs do not apply to it' },
      { q: 'Make it impossible for any account to use a non-approved Region?', a: 'An SCP at the root denying actions outside the approved Regions' },
      { q: 'Several small accounts each too small for a commitment. How do they get the discount?', a: 'Consolidated billing aggregates usage; buy centrally with discount sharing enabled' },
      { q: 'SCP vs permissions boundary?', a: 'SCP limits accounts and OUs; a permissions boundary limits an individual IAM principal' },
    ],
    resources: [
      { label: 'AWS Organizations User Guide', url: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html' },
      { label: 'Service Control Policies', url: 'https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  vpn: {
    title: 'AWS VPN — Site-to-Site and Client VPN',
    subtitle: 'Encrypted connectivity over the internet, and when to prefer it over Direct Connect',
    estReadMin: 5,
    overview: 'Site-to-Site VPN builds an IPsec tunnel between your on-premises network and a VPC over the public internet. Client VPN gives individual users an OpenVPN-based connection into a VPC. The exam repeatedly asks you to choose between VPN and Direct Connect: VPN is quick to stand up, cheap, and encrypted by default but rides the public internet so throughput and latency vary; Direct Connect is a dedicated private circuit with consistent performance and cheaper egress, but takes weeks to provision and is not encrypted on its own.',
    sections: [
      {
        title: 'VPN vs Direct Connect — the recurring decision',
        table: {
          headers: ['', 'Site-to-Site VPN', 'Direct Connect'],
          rows: [
            ['Path', 'Public internet', 'Dedicated private circuit'],
            ['Encryption', 'IPsec, built in', 'None by itself — add a VPN or MACsec'],
            ['Provisioning time', 'Minutes', 'Weeks to months'],
            ['Bandwidth', 'Up to ~1.25 Gbps per tunnel', '1, 10, 100 Gbps (or sub-1G hosted)'],
            ['Consistency', 'Varies with internet conditions', 'Consistent, low jitter'],
            ['Data transfer out cost', 'Standard internet egress rates', 'Lower per-GB rates'],
            ['Pick when', 'Quick, cheap, low volume, or a DX backup', 'Sustained high volume, predictable latency'],
          ],
        },
      },
      {
        title: 'Site-to-Site VPN components',
        bullets: [
          'Customer Gateway (CGW) — represents your on-premises device, needs a public IP or is certificate-based',
          'Virtual Private Gateway (VGW) — the AWS-side endpoint attached to one VPC',
          'Transit Gateway — attach the VPN here instead of a VGW when many VPCs must share the connection',
          'Every connection provides TWO tunnels to two different AWS endpoints for redundancy — configure both or you have a single point of failure',
          'Routing is static or dynamic via BGP; BGP is preferred because failover is automatic',
          'Enable route propagation on the VPC route table or traffic will not flow even with the tunnel up',
        ],
      },
      {
        title: 'The high-availability patterns worth memorising',
        bullets: [
          'Both tunnels configured on a single customer device — protects against an AWS endpoint failure',
          'Two customer gateway devices, each with two tunnels — protects against on-premises hardware failure',
          'Direct Connect as primary with Site-to-Site VPN as backup — the standard resilient hybrid design',
          'Direct Connect plus a VPN running over it — this is how you get encryption on a DX circuit',
          'Two Direct Connect circuits at different locations — the highest-resilience option, no VPN involved',
        ],
      },
      {
        title: 'Client VPN',
        bullets: [
          'Managed OpenVPN endpoint for individual users connecting into a VPC, and onward to on-premises',
          'Authentication by Active Directory, SAML federation, or mutual certificate authentication',
          'Authorisation rules control which network ranges each AD group may reach',
          'Billed per subnet association hour plus per client connection hour',
          'Use it for remote workforce access, not for site-to-site network connectivity',
        ],
      },
    ],
    examTraps: [
      'Thinking Direct Connect is encrypted. It is not — if the question demands encryption in transit over DX, run a VPN over it or use MACsec',
      'Configuring only one of the two tunnels and calling it highly available',
      'Forgetting route propagation on the VPC route table, so a healthy tunnel still passes no traffic',
      'Choosing Direct Connect when the requirement includes "as quickly as possible" — provisioning takes weeks',
      'Attaching a VPN to a VGW when many VPCs need it. Use a Transit Gateway',
      'Offering Client VPN for a datacentre-to-VPC link, or Site-to-Site for individual remote users',
    ],
    cheatsheet: [
      { k: 'Need it today', v: 'Site-to-Site VPN', desc: 'Minutes to stand up. Encrypted by default over the internet.' },
      { k: 'Sustained high volume', v: 'Direct Connect', desc: 'Consistent bandwidth and lower egress rates; weeks to provision.' },
      { k: 'Encrypted DX', v: 'VPN over Direct Connect (or MACsec)', desc: 'DX alone is private but unencrypted.' },
      { k: 'Tunnels per connection', v: 'Two', desc: 'Configure both for redundancy against an AWS endpoint failure.' },
      { k: 'Many VPCs share it', v: 'Attach the VPN to a Transit Gateway', desc: 'A VGW serves one VPC only.' },
      { k: 'Dynamic routing', v: 'BGP', desc: 'Preferred over static — failover happens automatically.' },
      { k: 'Remote individual users', v: 'Client VPN', desc: 'OpenVPN-based, AD or SAML or certificate auth.' },
      { k: 'Resilient hybrid', v: 'DX primary + VPN backup', desc: 'The standard exam answer for cost-aware resilience.' },
    ],
    flashcards: [
      { q: 'Encrypted hybrid connectivity needed within days. What?', a: 'Site-to-Site VPN — minutes to provision, IPsec by default' },
      { q: 'Direct Connect is up but the security team demands encryption in transit. Fix?', a: 'Run a Site-to-Site VPN over the Direct Connect connection (or use MACsec)' },
      { q: 'How many tunnels does a Site-to-Site VPN connection provide?', a: 'Two, to separate AWS endpoints — configure both' },
      { q: 'Fifteen VPCs must all reach on-premises over one VPN. Design?', a: 'Attach the VPN to a Transit Gateway rather than per-VPC VGWs' },
      { q: 'Tunnel shows UP but no traffic flows. First thing to check?', a: 'Route propagation and the routes in the VPC route table' },
    ],
    resources: [
      { label: 'AWS Site-to-Site VPN User Guide', url: 'https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html' },
      { label: 'AWS Client VPN Administrator Guide', url: 'https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/what-is.html' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  'wellarch-fw': {
    title: 'AWS Well-Architected Framework',
    subtitle: 'The six pillars — and the vocabulary the exam borrows from them',
    estReadMin: 5,
    overview: 'The Well-Architected Framework is AWS\'s statement of what good looks like, organised into six pillars. It matters for the exam in two ways. First, a handful of questions ask directly which pillar an activity belongs to. Second, and more importantly, the exam\'s wording comes from this framework — when a question says "most resilient", "operationally excellent" or "cost-optimised", it is signalling which pillar\'s trade-off should win. Recognising that tells you which of several technically-correct answers is the one being asked for.',
    sections: [
      {
        title: 'The six pillars',
        table: {
          headers: ['Pillar', 'Central question', 'Typical exam signal'],
          rows: [
            ['Operational Excellence', 'Can we run and improve this reliably?', 'Automation, IaC, small reversible changes, runbooks, observability'],
            ['Security', 'Are identities, data and workloads protected?', 'Least privilege, encryption, audit trail, defence in depth'],
            ['Reliability', 'Does it recover from failure and meet demand?', 'Multi-AZ, failover, RTO/RPO, self-healing, quotas'],
            ['Performance Efficiency', 'Are we using the right resources efficiently?', 'Latency, throughput, right service selection, caching'],
            ['Cost Optimisation', 'Are we avoiding unnecessary spend?', 'Right-sizing, purchasing model, storage tiers, eliminating idle'],
            ['Sustainability', 'Are we minimising environmental impact?', 'Utilisation, Graviton, Region choice, right-sizing'],
          ],
        },
      },
      {
        title: 'Design principles you should be able to recite',
        bullets: [
          'Stop guessing capacity — scale on demand rather than provisioning for a forecast',
          'Test systems at production scale — the cloud makes a full-scale test environment temporary and affordable',
          'Automate to make architectural experimentation easier — infrastructure as code',
          'Allow for evolutionary architectures — design so components can be replaced',
          'Drive architectures using data — measure, then decide',
          'Improve through game days — rehearse failure deliberately',
        ],
      },
      {
        title: 'Reliability vocabulary the exam tests precisely',
        bullets: [
          'High availability — minimal downtime, usually via redundancy across AZs',
          'Fault tolerance — continues operating correctly despite component failure, typically with no capacity loss',
          'RTO (Recovery Time Objective) — how long until service is restored',
          'RPO (Recovery Point Objective) — how much data loss is acceptable; RPO of zero requires synchronous replication',
          'DR strategies from cheapest and slowest to most expensive and fastest: Backup and Restore, Pilot Light, Warm Standby, Multi-Site Active-Active',
          'A question stressing "no data loss" is specifying RPO zero, which rules out asynchronous options',
        ],
      },
      {
        title: 'Using the framework to break ties',
        bullets: [
          'When two options are both technically valid, the pillar the question emphasises decides',
          '"Most cost-effective" — the cheapest option that still satisfies every stated constraint, not the cheapest option overall',
          '"Least operational overhead" — prefer managed and serverless services over anything you must patch or size',
          '"Most secure" — prefer least privilege, encryption, and no long-lived credentials',
          '"Highly available" — prefer multi-AZ; "fault tolerant" — prefer designs that lose no capacity on failure',
          'The Well-Architected Tool performs reviews against these pillars and is free to use',
        ],
      },
    ],
    examTraps: [
      'Picking the absolute cheapest option when it breaks a stated requirement — cost optimisation never overrides a constraint',
      'Treating high availability and fault tolerance as synonyms; the exam distinguishes them',
      'Reading "least operational overhead" as "cheapest" — it means fewer things to manage, which sometimes costs more',
      'Forgetting Sustainability is a pillar (it was added in 2021, and older material lists only five)',
      'Confusing RTO with RPO. Time to recover versus data lost',
      'Choosing asynchronous replication when the question says no committed data may be lost',
    ],
    cheatsheet: [
      { k: 'Six pillars', v: 'OpEx, Security, Reliability, Performance, Cost, Sustainability', desc: 'Sustainability is the sixth and newest.' },
      { k: '"Least operational overhead"', v: 'Prefer managed / serverless', desc: 'Fewer things to patch and size — not necessarily cheaper.' },
      { k: '"Most cost-effective"', v: 'Cheapest that meets every constraint', desc: 'An option that breaks a requirement is wrong regardless of price.' },
      { k: 'RTO', v: 'Time to restore service', desc: 'Backup and Restore is slow; Active-Active is near instant.' },
      { k: 'RPO', v: 'Acceptable data loss', desc: 'Zero requires synchronous replication such as Multi-AZ.' },
      { k: 'DR ladder', v: 'Backup/Restore → Pilot Light → Warm Standby → Active-Active', desc: 'Cost and complexity rise as RTO and RPO fall.' },
      { k: 'HA vs FT', v: 'Minimal downtime vs no interruption', desc: 'Fault tolerance is the stronger claim.' },
      { k: 'Free review tool', v: 'AWS Well-Architected Tool', desc: 'Guided review against the pillars, no charge.' },
    ],
    flashcards: [
      { q: 'Name the six pillars', a: 'Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimisation, Sustainability' },
      { q: 'A question says "no committed transaction may be lost". What is it specifying?', a: 'RPO of zero — requires synchronous replication (e.g. RDS Multi-AZ)' },
      { q: 'Cheapest DR strategy, and the trade-off?', a: 'Backup and Restore — lowest cost, longest RTO and highest RPO' },
      { q: '"Least operational overhead" is pointing at what?', a: 'Managed or serverless services — fewest things you have to run yourself' },
      { q: 'Difference between high availability and fault tolerance?', a: 'HA minimises downtime through redundancy; fault tolerance continues correctly with no interruption or capacity loss' },
    ],
    resources: [
      { label: 'AWS Well-Architected Framework', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' },
      { label: 'Disaster Recovery strategies whitepaper', url: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════
  // Combined guide for the services the roadmap budgets one hour each and
  // marks "lightly tested — know what each does". The exam asks about these
  // at recognition level, so a single comparison guide is the right shape.
  // ══════════════════════════════════════════════════════════════════
  'lightly-tested': {
    title: 'Recognition-Level Services — Know What Each One Does',
    subtitle: 'FSx, Beanstalk, Global Accelerator, GuardDuty/Macie/Inspector, X-Ray, Compute Optimizer, Trusted Advisor, Budgets, CLI',
    estReadMin: 7,
    overview: 'These services appear on the exam as the correct answer to a "which service does X?" question rather than as the subject of a deep scenario. Studying each in depth is a poor use of time; being unable to recognise them costs marks. Learn the one-line identity of each and the neighbour it is most often confused with — that is all the exam asks of them.',
    sections: [
      {
        title: 'Amazon FSx — the four flavours',
        table: {
          headers: ['Type', 'Protocol / use', 'Pick when'],
          rows: [
            ['FSx for Windows File Server', 'SMB, Active Directory integrated', 'Windows clients need a shared drive'],
            ['FSx for Lustre', 'High-performance parallel filesystem, links to S3', 'HPC, ML training, heavy analytics scratch'],
            ['FSx for NetApp ONTAP', 'Multi-protocol NFS/SMB/iSCSI, snapshots, dedup', 'Migrating an existing NetApp estate'],
            ['FSx for OpenZFS', 'NFS, ZFS snapshots and clones', 'Linux workloads wanting ZFS features'],
          ],
        },
      },
      {
        title: 'The three security findings services — the classic confusion',
        table: {
          headers: ['Service', 'Finds', 'One-liner'],
          rows: [
            ['GuardDuty', 'Threats and malicious activity', 'Analyses CloudTrail, VPC Flow Logs and DNS logs for attacker behaviour'],
            ['Macie', 'Sensitive data', 'Discovers and classifies PII in S3'],
            ['Inspector', 'Vulnerabilities', 'Scans EC2, ECR images and Lambda for CVEs and unintended network exposure'],
            ['Security Hub', 'Everything, aggregated', 'Central dashboard consolidating findings from the above'],
          ],
        },
      },
      {
        title: 'The cost and efficiency tools — also frequently confused',
        table: {
          headers: ['Service', 'Answers'],
          rows: [
            ['Cost Explorer', 'What have we spent, and what is the trend?'],
            ['AWS Budgets', 'Alert me when spend crosses a threshold I set'],
            ['Cost Anomaly Detection', 'Alert me when spend deviates from its learned normal pattern'],
            ['Compute Optimizer', 'Which specific resources are oversized, based on utilisation history?'],
            ['Trusted Advisor', 'Checks across cost, performance, security, fault tolerance and service limits'],
          ],
        },
      },
      {
        title: 'The remainder, one line each',
        bullets: [
          'AWS Elastic Beanstalk — PaaS. You supply code, it provisions and manages the ASG, load balancer and optionally RDS. Choose when the requirement is "deploy a web app with least operational effort" and containers are not specified',
          'AWS Global Accelerator — two static anycast IPs at the edge, routing over the AWS backbone to the nearest healthy endpoint. Choose over CloudFront for TCP/UDP or non-HTTP traffic, when you need static IPs, or for fast regional failover. CloudFront remains the answer for cacheable HTTP content',
          'AWS X-Ray — distributed tracing. Shows a request\'s path across microservices and where latency accumulates. The answer to "find the bottleneck across services"',
          'AWS CLI — not an exam topic in itself, but you need it for hands-on practice. Learn `aws configure`, named profiles, and that it reads instance profile credentials automatically on EC2',
        ],
      },
    ],
    examTraps: [
      'GuardDuty detects, it does not block. If a question wants traffic stopped, that is WAF, Shield or a security group',
      'Macie is S3-specific for sensitive data discovery. It does not scan EC2 or find vulnerabilities',
      'Global Accelerator does not cache. For cacheable HTTP content the answer is CloudFront',
      'Beanstalk is not the answer when the question specifies containers with fine-grained control — that is ECS or EKS',
      'Budgets needs a threshold you choose; Cost Anomaly Detection learns the pattern itself. A question saying "without predicting which service" points at anomaly detection',
      'FSx for Windows is SMB. EFS is NFS. Neither substitutes for the other',
    ],
    cheatsheet: [
      { k: 'Windows shared drive', v: 'FSx for Windows File Server', desc: 'SMB with Active Directory integration.' },
      { k: 'HPC scratch storage', v: 'FSx for Lustre', desc: 'Very high throughput; can present an S3 bucket as a filesystem.' },
      { k: 'Threat detection', v: 'GuardDuty', desc: 'Detects only — does not block.' },
      { k: 'PII discovery in S3', v: 'Macie', desc: 'Classifies sensitive data.' },
      { k: 'Vulnerability scanning', v: 'Inspector', desc: 'EC2, container images, Lambda.' },
      { k: 'Static anycast IPs / TCP-UDP', v: 'Global Accelerator', desc: 'Not a cache. CloudFront is for cacheable HTTP.' },
      { k: 'Cross-service latency hunt', v: 'X-Ray', desc: 'Distributed tracing across microservices.' },
      { k: 'Right-sizing evidence', v: 'Compute Optimizer', desc: 'Recommendations from CloudWatch utilisation history.' },
    ],
    flashcards: [
      { q: 'Which service finds PII sitting in S3?', a: 'Amazon Macie' },
      { q: 'Which finds CVEs on EC2 and in container images?', a: 'Amazon Inspector' },
      { q: 'Need static IP addresses and UDP support at the edge. Service?', a: 'AWS Global Accelerator — CloudFront cannot do either' },
      { q: 'Alert on unusual spend without knowing which service will misbehave?', a: 'AWS Cost Anomaly Detection (Budgets needs a threshold you pick)' },
      { q: 'Deploy a web app with least operational effort, containers not required?', a: 'AWS Elastic Beanstalk' },
    ],
    resources: [
      { label: 'AWS Well-Architected — service selection', url: 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html' },
      { label: 'Amazon FSx product family', url: 'https://docs.aws.amazon.com/fsx/' },
    ],
  },
};
