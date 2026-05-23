/**
 * AWS Learning Laboratory — categories + topics.
 *
 * Authoring scheme:
 *   topic(id, title, opts) → returns a topic object
 *
 * Topics carry a stable id like 'c<category>-t<n>' so user progress
 * (bookmarks, mastery, notes) survives data edits.
 *
 * Every topic must have at minimum: simpleEnglish, deepDive, keyPoints.
 * Optional but encouraged: lab, quiz, flashcards, useCase, awsDocs, youtube.
 *
 * Rich content is concentrated in Networking (user's strength area) and
 * in one anchor topic per other category. Skeletal topics still surface
 * as fully navigable entries with a real one-paragraph summary, key
 * points, and an auto-generated 5-card flashcard set.
 */

// ---------- helpers ----------

function topic(id, title, opts = {}) {
  const flashcards = opts.flashcards ||
    (opts.keyPoints || []).slice(0, 6).map((kp, i) => ({
      id: `${id}-fc${i + 1}`,
      front: typeof kp === 'string' ? title : kp.front || title,
      back:  typeof kp === 'string' ? kp     : kp.back  || '',
    }));

  return {
    id,
    title,
    summary: opts.summary || '',
    simpleEnglish: opts.simpleEnglish || '',
    deepDive: opts.deepDive || '',
    keyPoints: opts.keyPoints || [],
    useCase: opts.useCase || '',
    studyMinutes: opts.studyMinutes || 25,
    difficulty: opts.difficulty || 'intermediate', // beginner | intermediate | advanced
    services: opts.services || [],
    certs: opts.certs || [],
    awsDocs: opts.awsDocs || null,
    youtube: opts.youtube || null,
    related: opts.related || [],
    flashcards,
    quiz: opts.quiz || null,
    lab: opts.lab || null,
    examQuestions: opts.examQuestions || [],
    interviewQuestions: opts.interviewQuestions || [],
  };
}

function quiz(questions) {
  // Normalize questions: { id, type, q, options, answer (index or [indices] or true/false),
  //                       why (string explaining), wrongReasons (map), docs }
  return questions.map((qq, i) => ({
    id: `q${i + 1}`,
    type: qq.type || 'single',
    q: qq.q,
    options: qq.options || [],
    answer: qq.answer,
    why: qq.why || '',
    wrongReasons: qq.wrongReasons || {},
    docs: qq.docs || null,
  }));
}

function lab(title, steps, opts = {}) {
  return {
    title,
    objective: opts.objective || '',
    prereqs: opts.prereqs || [],
    estMinutes: opts.estMinutes || 60,
    freeTier: opts.freeTier ?? true,
    estCost: opts.estCost || 'Free Tier eligible',
    cleanup: opts.cleanup || [],
    steps: steps.map((s, i) => ({
      n: i + 1,
      title: s.title,
      detail: s.detail || '',
      expected: s.expected || '',
      gotcha: s.gotcha || null,
    })),
    video: opts.video || null,
  };
}

const fc = (front, back) => ({ front, back });

// ---------- 1. CLOUD FUNDAMENTALS ----------
const cf = [
  topic('c1-t1', 'What is Cloud Computing?', {
    summary: 'On-demand access to compute, storage, and services over the internet — pay only for what you use.',
    difficulty: 'beginner', studyMinutes: 20,
    services: [], certs: ['Cloud Practitioner'],
    simpleEnglish:
      'Instead of buying servers and putting them in a room, you rent computer power from someone else. You can grab a server in 60 seconds, use it for an hour, then give it back. You only pay for the hour you used.',
    deepDive:
      'Cloud computing has five characteristics (NIST): on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service. The three service models — IaaS (rent the machine), PaaS (rent the platform), SaaS (rent the app) — describe how much you manage. The four deployment models — public, private, hybrid, multi-cloud — describe who owns it.',
    keyPoints: [
      fc('On-demand self-service', 'Provision resources without human interaction from the provider.'),
      fc('Resource pooling', 'Multi-tenant: many customers share underlying physical hardware.'),
      fc('Elasticity', 'Capacity scales up or down quickly to match demand.'),
      fc('Measured service (pay-as-you-go)', 'Billing is metered: storage by GB-month, compute by second.'),
      fc('IaaS vs PaaS vs SaaS', 'IaaS = EC2. PaaS = Elastic Beanstalk. SaaS = Salesforce.'),
    ],
    useCase: 'Startup launches a product. They use AWS to skip a $50k server purchase, scale on Black Friday, and shut down dev environments overnight to save 80%.',
    awsDocs: 'https://aws.amazon.com/what-is-cloud-computing/',
    quiz: quiz([
      { q: 'Which NIST characteristic best describes scaling up automatically during a traffic spike?',
        options: ['On-demand self-service', 'Rapid elasticity', 'Resource pooling', 'Measured service'],
        answer: 1,
        why: 'Elasticity = capacity expands and contracts to meet demand.',
        wrongReasons: { 0: 'Self-service means you can provision yourself, not auto-scale.', 2: 'Pooling is about multi-tenancy.', 3: 'Measured service is about billing.' } },
      { q: 'EC2 is an example of which service model?',
        options: ['IaaS', 'PaaS', 'SaaS', 'FaaS'],
        answer: 0,
        why: 'EC2 gives you the raw VM — you manage the OS and software.',
        wrongReasons: { 1: 'PaaS abstracts the OS (e.g. Elastic Beanstalk).', 2: 'SaaS is a finished app.', 3: 'FaaS is functions (Lambda).' } },
      { q: 'True or false: in a public cloud, you can never have dedicated hardware.',
        type: 'tf', options: ['True', 'False'], answer: 1,
        why: 'You can — Dedicated Hosts and Dedicated Instances give you isolated hardware in the public cloud.' },
      { q: 'A bank keeps customer PII on premises and runs marketing analytics in AWS. What deployment model is this?',
        options: ['Public', 'Private', 'Hybrid', 'Multi-cloud'],
        answer: 2,
        why: 'Hybrid = mix of on-prem + public cloud.',
        wrongReasons: { 3: 'Multi-cloud is multiple cloud providers, not on-prem + cloud.' } },
      { q: 'Pick all benefits of cloud over on-prem (multiple).',
        type: 'multi',
        options: ['Capex → Opex', 'No physical capacity planning ahead of time', 'Always cheaper at any scale', 'Global reach in minutes'],
        answer: [0, 1, 3],
        why: 'Cost is workload-dependent — predictable steady workloads can be cheaper on-prem.',
        wrongReasons: { 2: '"Always cheaper" is wrong — at extreme steady scale, on-prem can be cheaper.' } },
    ]),
    examQuestions: [
      'Differentiate elasticity from scalability with an example.',
      'When would IaaS be preferred over PaaS?',
    ],
    interviewQuestions: [
      'Walk me through the trade-offs of moving a stateful workload to public cloud.',
    ],
  }),

  topic('c1-t2', 'AWS Global Infrastructure', {
    summary: 'Regions, Availability Zones, Edge Locations — the physical backbone of AWS.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['Cloud Practitioner', 'Solutions Architect Associate'],
    simpleEnglish:
      'AWS has data centers all over the world. They group nearby ones into "Regions". Each Region has several separate buildings ("Availability Zones") so if one burns down, the others keep running. Smaller "Edge Locations" sit close to users to make websites fast.',
    deepDive:
      'A Region is a physical location (e.g. eu-west-2 = London) containing 3+ AZs. AZs are physically isolated data centers with independent power, cooling, and networking, connected by sub-millisecond fiber. Edge Locations (400+) cache content via CloudFront. Local Zones extend a Region into a metro for ultra-low latency. Wavelength Zones live inside 5G carrier networks.',
    keyPoints: [
      fc('Region', 'A geographic area with 3+ isolated AZs.'),
      fc('Availability Zone', 'A physically separate data center inside a Region.'),
      fc('Edge Location', 'A POP used by CloudFront/Route 53 — caching only, no compute.'),
      fc('Local Zone', 'Region extension into a metro (e.g. Los Angeles) for low latency.'),
      fc('Wavelength', 'AWS inside a telco network for 5G applications.'),
    ],
    useCase: 'A gaming company puts EC2 in us-east-1 + CloudFront in 400 edge locations so players in Tokyo get the same low latency as players in New York.',
    awsDocs: 'https://aws.amazon.com/about-aws/global-infrastructure/',
    quiz: quiz([
      { q: 'How many Availability Zones do most AWS Regions have?',
        options: ['1', '2', '3 or more', 'Exactly 5'], answer: 2,
        why: 'AWS Regions are designed with at least 3 AZs to allow quorum-based services.' },
      { q: 'Edge Locations are used primarily for…',
        options: ['Running EC2 instances', 'Caching content via CloudFront/Route 53', 'Storing long-term backups', 'Hosting databases'],
        answer: 1, why: 'Edge Locations are caching/POP infrastructure, not full data centers.' },
      { q: 'True or false: AZs in a Region share power and cooling.', type: 'tf',
        options: ['True', 'False'], answer: 1,
        why: 'AZs are intentionally isolated — independent power, cooling, and physical security.' },
    ]),
  }),

  topic('c1-t3', 'AWS Account, Root User, and IAM basics', {
    summary: 'How your AWS account is structured and why you should never use the root user.',
    difficulty: 'beginner', studyMinutes: 25,
    services: ['iam'], certs: ['Cloud Practitioner'],
    simpleEnglish:
      'When you sign up for AWS you get a single "root" account — like the master key. Don\'t use it for everyday work. Instead, create IAM users and roles with only the permissions they need.',
    deepDive:
      'The root user has unrestricted access and cannot be limited. Best practice: enable MFA on root, lock the credentials away, and create an admin IAM user for daily work. Apply least privilege at the user/role/group level. AWS Organizations groups multiple accounts under one bill with Service Control Policies (SCPs).',
    keyPoints: [
      fc('Root user', 'The original sign-up identity. Has all permissions. Lock with MFA, never use daily.'),
      fc('IAM user', 'A person or service with credentials.'),
      fc('IAM role', 'Temporary credentials assumed by an entity (EC2, Lambda, federated user).'),
      fc('IAM policy', 'JSON document granting permissions on resources.'),
      fc('Organizations', 'Multi-account billing + SCPs for guardrails.'),
    ],
    awsDocs: 'https://docs.aws.amazon.com/IAM/',
  }),

  topic('c1-t4', 'The AWS Shared Responsibility Model', {
    summary: 'AWS secures the cloud; you secure what you put in the cloud.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner', 'Security Specialty'],
    simpleEnglish:
      'AWS is responsible for the physical security of the data centers and the hardware. You are responsible for what you build on top — your code, your data, your access rules.',
    deepDive:
      'Security OF the cloud (AWS): hardware, networking, hypervisor, regional services. Security IN the cloud (you): operating system patches on EC2, IAM, encryption choices, network configuration, application code. The line shifts based on service: with S3, AWS handles the OS, you handle bucket policies and encryption. With Lambda, you only handle the code and IAM.',
    keyPoints: [
      fc('AWS responsibility (Security OF)', 'Physical security, hardware, hypervisor, regional networking.'),
      fc('Customer responsibility (Security IN)', 'OS patching, IAM, encryption, security groups, app code.'),
      fc('Managed services shift the line', 'Lambda → you only own code; RDS → AWS patches the OS, you tune the DB.'),
    ],
  }),

  topic('c1-t5', 'AWS Pricing & Free Tier', {
    summary: 'How AWS bills, the three pricing types, and what the Free Tier covers.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'You pay only for what you use. Storage by gigabyte-month, compute by second, network by gigabyte out. The Free Tier covers small experiments for 12 months — perfect for learning.',
    deepDive:
      'Three pricing dimensions: Compute (per second), Storage (per GB-month), Data Transfer (per GB, mostly OUT). Pay options: On-Demand, Reserved/Savings Plans (1-3 yr commit, up to 72% off), Spot (up to 90% off, can be reclaimed). Free Tier has three flavors: 12-month free (e.g. 750h EC2 t2.micro), Always Free (e.g. 1M Lambda invocations/mo), Trials (e.g. 30-day RDS).',
    keyPoints: [
      fc('Three cost dimensions', 'Compute time, Storage volume, Data transfer (egress).'),
      fc('Spot vs Reserved', 'Spot: cheapest, can be reclaimed in 2 min. Reserved: 1-3 yr commitment for discount.'),
      fc('Free Tier', '12-month: 750h EC2 t2.micro/mo. Always Free: 1M Lambda req/mo, 25GB DynamoDB.'),
      fc('Data transfer OUT is the gotcha', 'In is free, transfer between AZs costs $0.01/GB, internet out costs $0.09/GB.'),
    ],
    awsDocs: 'https://aws.amazon.com/free/',
  }),

  topic('c1-t6', 'AWS Support Plans', {
    summary: 'Basic, Developer, Business, and Enterprise — what each tier includes.',
    difficulty: 'beginner', studyMinutes: 10,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'AWS offers four support tiers. Basic is free but you only get docs + forums. Higher tiers add 24/7 chat, a Technical Account Manager, and AWS Trusted Advisor checks.',
    deepDive:
      'Basic: free, docs only. Developer: $29/mo, business-hours email. Business: 10% of monthly spend ($100 min), 24/7 phone + chat, full Trusted Advisor. Enterprise On-Ramp / Enterprise: dedicated TAM, white-glove. Choose based on production criticality and team experience.',
    keyPoints: [
      fc('Basic', 'Free. Docs, forums, AWS Personal Health Dashboard. No SLA on responses.'),
      fc('Developer', '$29/mo or 3% of spend. Email support during business hours.'),
      fc('Business', '$100/mo or 10% of spend. 24/7 chat + phone, full Trusted Advisor.'),
      fc('Enterprise', '$15k/mo. Technical Account Manager, well-architected reviews, IEM.'),
    ],
  }),

  topic('c1-t7', 'AWS Well-Architected Framework', {
    summary: 'Six pillars for designing cloud workloads: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Solutions Architect Associate', 'Solutions Architect Professional'],
    simpleEnglish: 'AWS\'s playbook for building good cloud systems. Six pillars cover every angle — security, cost, performance, reliability, day-2 ops, and sustainability.',
    deepDive:
      'Each pillar has design principles and a series of questions. The Well-Architected Tool runs you through them. Common antipatterns it catches: hard-coded credentials, single-AZ critical workloads, no monitoring, oversized instances, no auto-scaling.',
    keyPoints: [
      fc('Operational Excellence', 'Run + monitor systems, learn from failure.'),
      fc('Security', 'Protect data, systems, assets.'),
      fc('Reliability', 'Recover from failures + meet demand.'),
      fc('Performance Efficiency', 'Use IT resources efficiently as demand changes.'),
      fc('Cost Optimization', 'Avoid unneeded costs.'),
      fc('Sustainability', 'Minimize environmental impact (added 2021).'),
    ],
    related: ['c5-t1'],
  }),

  topic('c1-t8', 'Choosing the right AWS Region', {
    summary: 'Latency, compliance, service availability, and cost — the four levers.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner', 'Solutions Architect Associate'],
    simpleEnglish: 'Pick a Region close to your users (fast), in a country that satisfies your laws (compliance), that has the services you need (not all regions are equal), and at a price you can stomach (us-east-1 is the cheapest).',
    deepDive:
      'us-east-1 has the broadest service support and lowest price for many services. Newer regions launch missing certain services for months. Sovereignty matters: GDPR pushes EU workloads to eu-west-2 (London) or eu-central-1 (Frankfurt). Disaster recovery typically requires picking a second region.',
    keyPoints: [
      fc('Latency to users', 'Pick the closest Region — RTT under 50ms ideally.'),
      fc('Service availability', 'Not all services launch in all regions immediately.'),
      fc('Data sovereignty', 'GDPR, HIPAA, FedRAMP may force a specific Region.'),
      fc('Price varies', 'us-east-1 is often the cheapest; ap-east-1 can be 20%+ pricier.'),
    ],
  }),
];

// ---------- 2. COMPUTE ----------
const compute = [
  topic('c2-t1', 'EC2 — Elastic Compute Cloud', {
    summary: 'Virtual machines in the cloud. The foundation of AWS compute.',
    difficulty: 'beginner', studyMinutes: 45,
    services: ['ec2'], certs: ['Cloud Practitioner', 'Solutions Architect Associate'],
    simpleEnglish: 'EC2 = rent a server by the second. Pick a size, pick an OS, click launch — you have a server in 60 seconds.',
    deepDive:
      'Instances are launched from an AMI (image). You pick an instance type (family + size, e.g. t3.medium) that maps to vCPU, memory, network, storage. Key pair gives you SSH access. Security groups are stateful firewalls. Storage is either EBS (network-attached, persistent) or instance store (ephemeral, attached to host). Billing is per-second (60s minimum). User Data scripts bootstrap on first boot.',
    keyPoints: [
      fc('AMI', 'Amazon Machine Image — the template (OS + preinstalled software) you launch from.'),
      fc('Instance types', 'Family + size. T = burstable, M = general, C = compute, R = memory, G/P = GPU.'),
      fc('EBS vs Instance Store', 'EBS: network-attached, survives stop. Instance store: ephemeral, dies with the host.'),
      fc('Security Group', 'Stateful firewall — allow rules only, return traffic auto-allowed.'),
      fc('User Data', 'Bash script that runs on first boot — install packages, pull config.'),
    ],
    useCase: 'A SaaS startup runs a Node.js API on three t3.medium instances behind an ALB, swapping to m5.large for peak traffic via Auto Scaling.',
    awsDocs: 'https://docs.aws.amazon.com/ec2/',
    related: ['c2-t2', 'c2-t3', 'c4-t1'],
    lab: lab('Launch your first EC2 instance', [
      { title: 'Open EC2 console + launch wizard',
        detail: 'In the AWS console, search EC2 → "Launch instance".',
        expected: 'The launch wizard appears with name + AMI fields.' },
      { title: 'Pick AMI + instance type',
        detail: 'Choose Amazon Linux 2023, instance type t2.micro (free tier).',
        expected: 'A green "Free tier eligible" badge appears.',
        gotcha: 'Other AMIs (Windows, RHEL) are NOT free tier on t2.micro.' },
      { title: 'Create key pair',
        detail: 'Create a new key pair named "lab-key", download the .pem file.',
        expected: 'lab-key.pem downloads. Set permissions: chmod 400 lab-key.pem.' },
      { title: 'Create security group',
        detail: 'Allow SSH (22) from "My IP". Leave the rest blocked.',
        expected: 'New SG named launch-wizard-1 created.' },
      { title: 'Launch + connect',
        detail: 'Click Launch. Wait until state = running. Copy public IPv4 DNS. SSH in with: ssh -i lab-key.pem ec2-user@<dns>.',
        expected: 'Bash prompt: [ec2-user@ip-... ~]$. You\'re in.' },
      { title: 'Install nginx as a smoke test',
        detail: 'Run: sudo dnf install -y nginx && sudo systemctl start nginx.',
        expected: 'Visiting http://<public-ip>/ shows the Nginx welcome page.',
        gotcha: 'Update the SG to allow port 80 from your IP first.' },
    ], {
      objective: 'Launch a t2.micro EC2 instance, SSH in, and serve a webpage with nginx.',
      prereqs: ['AWS Free Tier account', 'A terminal (Mac/Linux/WSL)'],
      estMinutes: 45,
      freeTier: true,
      cleanup: [
        'Terminate the EC2 instance (Instance state → Terminate).',
        'Delete the key pair from the EC2 console.',
        'Delete the launch-wizard security group.',
      ],
    }),
    quiz: quiz([
      { q: 'Which storage option persists after an EC2 instance stops?',
        options: ['Instance store', 'EBS volume', 'AMI cache', 'Block store buffer'],
        answer: 1,
        why: 'EBS volumes are network-attached and survive instance stop/start.',
        wrongReasons: { 0: 'Instance store is ephemeral — wiped when the instance stops.' } },
      { q: 'You stop an EC2 instance. Which charge continues?',
        options: ['Compute (per-second)', 'EBS volume storage', 'Both', 'Neither'],
        answer: 1,
        why: 'Stopped instances no longer accrue compute time, but their attached EBS volumes still cost storage.' },
      { q: 'Which instance family is best for a memory-heavy in-memory cache?',
        options: ['T family (burstable)', 'C family (compute)', 'R family (memory)', 'G family (GPU)'],
        answer: 2, why: 'R = RAM. Memory-optimized for caches, in-memory DBs.' },
      { q: 'True or false: Security groups support deny rules.', type: 'tf',
        options: ['True', 'False'], answer: 1,
        why: 'SGs are allow-only. NACLs support deny rules.' },
      { q: 'You SSH into a new t2.micro and get "Permission denied (publickey)". Most likely fix:',
        options: ['Open port 22 wider', 'chmod 400 your-key.pem', 'Reboot the instance', 'Recreate the AMI'],
        answer: 1,
        why: 'OpenSSH refuses to use a key file with too-permissive permissions.' },
    ]),
  }),

  topic('c2-t2', 'EC2 Auto Scaling Groups (ASG)', {
    summary: 'Run a target number of identical EC2 instances across AZs, scaling based on demand.',
    difficulty: 'intermediate', studyMinutes: 30,
    services: ['ec2', 'asg'], certs: ['Solutions Architect Associate', 'SysOps'],
    simpleEnglish: 'ASG keeps a target number of instances running. If one dies, it launches a replacement. If traffic spikes, it adds more. If traffic drops, it shrinks.',
    deepDive:
      'An ASG references a Launch Template (the recipe — AMI, type, SG, key, user data) and a target VPC + subnets. Health checks (EC2 or ELB) decide who lives. Scaling policies: Target Tracking (keep CPU at 60%), Step (more aggressive), Scheduled (cron). Lifecycle hooks pause instance start/stop for custom logic. Cooldowns prevent thrashing.',
    keyPoints: [
      fc('Launch Template', 'Versioned recipe for new instances.'),
      fc('Target Tracking', 'Set "keep CPU at 60%" — ASG figures out the rest.'),
      fc('Health checks', 'EC2 = "is the VM alive?". ELB = "is the app responding to requests?" Prefer ELB for app health.'),
      fc('Multi-AZ', 'Always span 2+ AZs to survive zonal failure.'),
    ],
    awsDocs: 'https://docs.aws.amazon.com/autoscaling/',
    related: ['c2-t1', 'c4-t5'],
  }),

  topic('c2-t3', 'Lambda — serverless functions', {
    summary: 'Run code without managing servers. Pay only for execution time.',
    difficulty: 'intermediate', studyMinutes: 35,
    services: ['lambda'], certs: ['Solutions Architect Associate', 'Developer Associate'],
    simpleEnglish: 'You write a function. AWS runs it on demand. You pay for each millisecond of execution. No servers to patch, no instances to size.',
    deepDive:
      'Limits: 15-min max execution, 10GB max memory, 512MB-10GB /tmp. Triggers include API Gateway, S3, EventBridge, SQS, DynamoDB Streams. Cold start = first invocation provisions a container; tune by keeping the package small and moving heavy imports to module scope. Provisioned Concurrency keeps N containers warm.',
    keyPoints: [
      fc('Execution time limit', '15 minutes per invocation.'),
      fc('Cold start', 'First invocation spins up a new container (~100-1000ms). Mitigate with Provisioned Concurrency.'),
      fc('Memory = CPU', 'Allocating more memory also allocates proportionally more CPU.'),
      fc('Pricing', 'Per-request + per-GB-second of execution. Free Tier: 1M requests + 400k GB-s/month.'),
    ],
    related: ['c2-t1', 'c8-t3', 'c10-t2'],
  }),

  topic('c2-t4', 'ECS, EKS, and Fargate', {
    summary: 'Container orchestration on AWS — EC2-backed vs serverless.',
    difficulty: 'intermediate', studyMinutes: 35,
    certs: ['Solutions Architect Associate', 'DevOps Engineer'],
    simpleEnglish: 'Containers package your app + its deps. ECS and EKS run them. With Fargate, AWS even manages the underlying servers — you only manage the containers.',
    deepDive:
      'ECS = AWS-native, simpler. EKS = managed Kubernetes, portable but heavier. Both run on EC2 launch type (you manage instances) or Fargate (serverless). Pick ECS for AWS-only simplicity, EKS if your team knows k8s or you need portability.',
    keyPoints: [
      fc('ECS', 'AWS-native container orchestrator. Tasks, services, clusters.'),
      fc('EKS', 'Managed Kubernetes. Familiar tooling (kubectl, Helm).'),
      fc('Fargate', 'Serverless containers — no EC2 to manage. Pay per vCPU + GB-second.'),
      fc('EC2 vs Fargate', 'EC2 = cheaper at sustained scale + GPU support. Fargate = no ops + spiky workloads.'),
    ],
  }),

  topic('c2-t5', 'Spot Instances + Savings Plans + Reserved Instances', {
    summary: 'Three ways to slash EC2 cost, each with different trade-offs.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Solutions Architect Associate', 'Cloud Practitioner'],
    simpleEnglish: 'Spot = AWS\'s spare capacity, up to 90% off, but they can take it back in 2 min. Savings Plans + Reserved = commit to 1-3 years for up to 72% off.',
    deepDive:
      'Spot fits fault-tolerant workloads (batch, CI, stateless web). Savings Plans (Compute / EC2 Instance) are flexible — apply across regions/families. RIs are stricter but slightly cheaper. Mix: baseline on Savings Plans + bursts on Spot.',
    keyPoints: [
      fc('Spot', 'Up to 90% off. 2-minute interruption notice. Use for stateless or checkpointed workloads.'),
      fc('Savings Plan', '1- or 3-year commit to $X/hr of usage. Flexible across regions/families.'),
      fc('Reserved Instance', 'Older mechanism. Less flexible than Savings Plans but slight discount.'),
      fc('Combine them', 'Baseline = SP. Steady extra = SP/RI. Bursts = Spot. Top = On-Demand.'),
    ],
  }),

  topic('c2-t6', 'Elastic Beanstalk + Lightsail', {
    summary: 'Higher-level AWS compute services for simpler use cases.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['Cloud Practitioner', 'Developer Associate'],
    simpleEnglish: 'Beanstalk = upload code, AWS provisions EC2 + ALB + ASG for you. Lightsail = simple VPS like DigitalOcean — flat monthly price.',
    deepDive:
      'Beanstalk supports Java, .NET, Node, Python, Ruby, Go, Docker. Generates a CloudFormation stack under the hood. Lightsail offers small Linux/Windows VMs starting at $3.50/mo with DNS, load balancer, and database add-ons. Both trade flexibility for simplicity.',
    keyPoints: [
      fc('Beanstalk', 'Upload code → AWS provisions the stack. Good for developers who don\'t want to learn IaC.'),
      fc('Lightsail', 'Flat-fee VPS. Bundled compute + storage + transfer.'),
      fc('When to outgrow', 'Beanstalk hides too much for complex topologies. Lightsail caps at small workloads.'),
    ],
  }),

  topic('c2-t7', 'AMIs + Snapshots + Launch Templates', {
    summary: 'Bake an image, snapshot a volume, version a launch recipe.',
    difficulty: 'intermediate', studyMinutes: 20,
    services: ['ec2'], certs: ['Solutions Architect Associate'],
    simpleEnglish: 'AMI = a frozen copy of an EC2 instance you can re-launch from. Snapshot = a backup of an EBS volume. Launch Template = the recipe you point your ASG at.',
    deepDive:
      'AMIs are region-scoped; copy to other regions for DR. Snapshots are incremental — only changed blocks are stored. EBS-backed AMIs reference snapshots, so deleting a snapshot can break an AMI. Launch Templates supersede Launch Configurations — versionable, support newer features like Spot fleet.',
    keyPoints: [
      fc('AMI', 'Region-scoped boot image. Copy for cross-region DR.'),
      fc('Snapshot', 'Incremental EBS backup stored in S3 internally.'),
      fc('Launch Template', 'Versioned recipe — preferred over Launch Configurations.'),
    ],
  }),

  topic('c2-t8', 'Batch + AWS App Runner + Lambda@Edge', {
    summary: 'Niche compute services for specific workloads.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Batch = queue + run a million jobs. App Runner = deploy a container with one click + autoscaling. Lambda@Edge = run code at CloudFront edge locations.',
    deepDive:
      'Batch sits on top of ECS/Fargate, manages queues + compute environments + dependencies between jobs. App Runner is simpler than ECS for one-container apps. Lambda@Edge fires on CloudFront viewer/origin events — useful for A/B testing, header rewriting, edge auth.',
    keyPoints: [
      fc('AWS Batch', 'High-throughput batch processing — managed queues + compute environments.'),
      fc('App Runner', 'One-click container deploy with autoscaling. Best for web apps.'),
      fc('Lambda@Edge', 'Run Lambda at CloudFront edge — sub-100ms latency, but smaller limits.'),
    ],
  }),
];

// ---------- 3. STORAGE ----------
const storage = [
  topic('c3-t1', 'S3 — Simple Storage Service', {
    summary: 'Object storage at infinite scale, 11 nines of durability.',
    difficulty: 'beginner', studyMinutes: 45,
    services: ['s3'], certs: ['Cloud Practitioner', 'Solutions Architect Associate'],
    simpleEnglish: 'S3 stores files as "objects" in "buckets". No size limit on total storage. Individual files up to 5TB. Bills you per GB-month + requests + transfer out.',
    deepDive:
      'Storage classes trade cost vs access speed: Standard (default), Intelligent-Tiering (auto-tier), Standard-IA (infrequent access, lower storage cost + retrieval fee), Glacier Instant/Flexible/Deep Archive (cheapest, slow retrieval). Lifecycle rules move objects between classes. Versioning + Object Lock protect against deletion.',
    keyPoints: [
      fc('Durability', '11 nines (99.999999999%) — replicated across 3+ AZs by default.'),
      fc('Storage classes', 'Standard, IA, Intelligent-Tiering, Glacier Instant/Flexible/Deep Archive.'),
      fc('Versioning', 'Keeps all versions of each object. Required for cross-region replication.'),
      fc('Encryption', 'SSE-S3 (AWS managed), SSE-KMS (your KMS keys), SSE-C (your keys).'),
      fc('Static website hosting', 'A bucket can serve a public website directly.'),
    ],
    useCase: 'Photo-sharing startup stores 50M images in S3 Standard, lifecycle to Glacier after 1 year, serves via CloudFront. Cost: ~$2k/mo for 100TB.',
    awsDocs: 'https://docs.aws.amazon.com/s3/',
    related: ['c3-t2', 'c4-t4'],
    lab: lab('Create + secure your first S3 bucket', [
      { title: 'Create a globally-unique bucket',
        detail: 'S3 console → Create bucket. Name = lab-<your-initials>-<random>. Region = your nearest.',
        expected: 'Bucket appears in your bucket list.' },
      { title: 'Upload a test file',
        detail: 'Upload any image. Default settings leave it private.',
        expected: 'The file is in the bucket, no public URL works.' },
      { title: 'Enable versioning',
        detail: 'Properties → Bucket Versioning → Enable.',
        expected: 'Now uploading the same key shows version IDs.' },
      { title: 'Add a lifecycle rule',
        detail: 'Management → Lifecycle rule → "Move to IA after 30 days, Glacier after 90, expire after 365".',
        expected: 'Rule listed as Enabled.' },
      { title: 'Enable Block Public Access (verify it\'s on)',
        detail: 'Permissions → Block public access. Confirm all four blocks ON.',
        expected: 'Buckets are private by default since 2023, but always verify.' },
    ], {
      objective: 'Stand up an S3 bucket with versioning, lifecycle, and public-access block.',
      estMinutes: 30, freeTier: true,
      cleanup: ['Empty the bucket (delete all versions).', 'Delete the bucket.'],
    }),
    quiz: quiz([
      { q: 'You need 12-hour retrieval, lowest cost. Which storage class?',
        options: ['Standard', 'Standard-IA', 'Glacier Deep Archive', 'Glacier Flexible Retrieval'],
        answer: 2,
        why: 'Deep Archive is the cheapest with 12-48 hour retrieval.' },
      { q: 'Which feature prevents accidental deletion of object versions?',
        options: ['Lifecycle rule', 'MFA Delete', 'Bucket policy', 'Encryption'],
        answer: 1, why: 'MFA Delete requires an MFA code to delete a version or change versioning state.' },
      { q: 'True or false: S3 object listing is strongly consistent.',
        type: 'tf', options: ['True', 'False'], answer: 0,
        why: 'Since Dec 2020, S3 provides strong read-after-write consistency for all operations.' },
      { q: 'Cheapest way to serve 10TB to global users with low latency?',
        options: ['S3 in every region', 'S3 + CloudFront', 'Standard-IA in one region', 'Cross-region replication only'],
        answer: 1,
        why: 'CloudFront caches at 400+ edge locations — single S3 origin + CDN.' },
      { q: 'A user reports they cannot make a bucket public. Most likely cause:',
        options: ['IAM policy missing', 'Block Public Access setting', 'Wrong region', 'Account suspended'],
        answer: 1,
        why: 'BPA blocks public ACLs/policies even if other policies grant access.' },
    ]),
  }),

  topic('c3-t2', 'EBS — Elastic Block Store', {
    summary: 'Network-attached block storage for EC2 — like a hard drive over the wire.',
    difficulty: 'beginner', studyMinutes: 25,
    services: ['ec2'], certs: ['Solutions Architect Associate'],
    simpleEnglish: 'EBS volumes are virtual disks you attach to EC2 instances. When you stop or restart the instance, the data stays. You can detach and attach to another instance.',
    deepDive:
      'Volume types: gp3 (general purpose SSD, best default), io2/io2 Block Express (provisioned IOPS, mission-critical), st1 (throughput-optimized HDD), sc1 (cold HDD). Volumes are AZ-locked — to move across AZs, snapshot + restore. Snapshots are incremental and stored in S3 internally.',
    keyPoints: [
      fc('gp3 vs gp2', 'gp3: cheaper, baseline 3000 IOPS, scale IOPS + throughput independently. Default choice.'),
      fc('io2 Block Express', 'Highest performance — up to 256k IOPS, sub-ms latency.'),
      fc('Snapshots', 'Incremental backups stored in S3. Cross-region copy enabled for DR.'),
      fc('AZ-locked', 'You can\'t attach an EBS volume to an instance in another AZ. Snapshot + restore.'),
    ],
  }),

  topic('c3-t3', 'EFS + FSx — file storage', {
    summary: 'POSIX file systems on AWS — EFS for Linux, FSx for Windows/Lustre/NetApp.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'EBS attaches to ONE instance. EFS/FSx mount to MANY instances at once, just like an NFS share.',
    deepDive:
      'EFS = NFS for Linux, multi-AZ, scales automatically. FSx for Windows = SMB shares. FSx for Lustre = HPC. FSx for NetApp ONTAP = brings on-prem NetApp features to AWS. FSx for OpenZFS = high-performance NFS.',
    keyPoints: [
      fc('EFS', 'Multi-AZ NFS. Auto-scaling. Linux only.'),
      fc('FSx for Windows', 'SMB shares with AD integration.'),
      fc('FSx for Lustre', 'HPC-grade parallel filesystem. Up to TB/s throughput.'),
      fc('Use EBS not EFS when', 'Single-instance workloads with high IOPS — EBS is cheaper and faster.'),
    ],
  }),

  topic('c3-t4', 'S3 Glacier + archival tiers', {
    summary: 'Cold storage for compliance and long-term archives.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Glacier is where you put data you almost never read. Tiny storage cost, slow retrieval.',
    deepDive:
      'Three Glacier flavors: Instant Retrieval (milliseconds, $0.004/GB-mo), Flexible Retrieval (1-12hr, $0.0036/GB-mo), Deep Archive (12-48hr, $0.00099/GB-mo). Vault Lock provides WORM compliance.',
    keyPoints: [
      fc('Three tiers', 'Instant (ms), Flexible (1-12h), Deep Archive (12-48h).'),
      fc('Compliance', 'Vault Lock = write once, read many. SEC 17a-4 compliant.'),
      fc('Retrieval costs', 'Per-GB retrieval fee on top of storage. Bulk = cheapest, Expedited = most expensive.'),
    ],
  }),

  topic('c3-t5', 'Storage Gateway', {
    summary: 'Hybrid bridge — mount AWS storage on-prem as NFS/SMB/iSCSI/VTL.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Storage Gateway lets your on-prem servers see AWS storage as if it were local — but it\'s really backed by S3, EBS, or Glacier.',
    deepDive:
      'Modes: File Gateway (SMB/NFS → S3), Volume Gateway (iSCSI → EBS snapshots), Tape Gateway (VTL → S3/Glacier). Local cache speeds frequent access. Common for backup-to-cloud, low-latency file access from on-prem.',
    keyPoints: [
      fc('File Gateway', 'On-prem mounts NFS/SMB share. Backed by S3.'),
      fc('Volume Gateway', 'iSCSI block storage. Cached or stored modes.'),
      fc('Tape Gateway', 'Virtual tape library — replaces physical LTO drives.'),
    ],
  }),

  topic('c3-t6', 'Data transfer to AWS — Snow Family + DataSync', {
    summary: 'When the internet is too slow — physical appliances or accelerated transfer.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: '100 TB through a 1 Gbps pipe takes 10 days. AWS ships you a hard drive in a ruggedized case (Snow). Or DataSync syncs faster than rsync.',
    deepDive:
      'Snowcone (8TB), Snowball Edge (80TB), Snowmobile (100PB in a shipping container). DataSync runs over the internet/VPN — 10x faster than rsync, scheduled. AWS Transfer Family = managed SFTP/FTPS/FTP fronting S3.',
    keyPoints: [
      fc('Snowcone vs Snowball vs Snowmobile', '8TB → 80TB → 100PB (semi-truck).'),
      fc('DataSync', 'Network-based, 10x faster than rsync. Best for ongoing transfers under a few PB.'),
      fc('Transfer Family', 'Managed SFTP/FTPS/FTP — drop files, end up in S3.'),
    ],
  }),

  topic('c3-t7', 'S3 Object Lambda + Access Points', {
    summary: 'Transform objects on read; create multi-tenant access patterns.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'Object Lambda lets you run code on each GetObject — strip PII for some users, watermark images for others. Access Points give each app its own S3 entry door.',
    deepDive:
      'Multi-Region Access Points route requests to the lowest-latency replica. Object Lambda Access Points run a Lambda on GET to transform the response. Useful for masking, format conversion, redaction.',
    keyPoints: [
      fc('Access Point', 'Named endpoint with its own policy — simpler than one bucket policy with many statements.'),
      fc('Multi-Region Access Point', 'Single global endpoint, routes to nearest replica.'),
      fc('Object Lambda', 'Lambda in the GET path. Transform on read.'),
    ],
  }),

  topic('c3-t8', 'S3 security: BPA, bucket policies, encryption', {
    summary: 'The four layers that keep your buckets private.',
    difficulty: 'intermediate', studyMinutes: 25,
    services: ['s3'], certs: ['Solutions Architect Associate', 'Security Specialty'],
    simpleEnglish: 'Make sure the bucket is private (Block Public Access), the bucket policy is restrictive, encryption is on by default, and access logs are recorded.',
    deepDive:
      'Layers: 1) Block Public Access at account + bucket level. 2) Bucket policy + ACLs. 3) IAM identity policies. 4) Default encryption (SSE-S3 since 2023). 5) VPC Endpoints to prevent data from traversing the internet. 6) S3 access logs + CloudTrail data events.',
    keyPoints: [
      fc('Block Public Access', 'Master switch. Overrides everything else. Default-on since 2023.'),
      fc('Default encryption', 'SSE-S3 is default. Switch to SSE-KMS for compliance.'),
      fc('VPC Endpoint', 'Lets EC2 in private subnets reach S3 without an internet route.'),
      fc('Access logs', 'Log every request to another bucket. Off by default — turn it on for prod.'),
    ],
  }),
];

// ---------- 4. NETWORKING (EXTRA EXPANDED — 20 topics) ----------
const networking = [
  topic('c4-t1', 'VPC deep dive — subnets, routing, gateways', {
    summary: 'Your private network on AWS. The foundation everything else sits on.',
    difficulty: 'intermediate', studyMinutes: 60,
    services: ['vpc'], certs: ['Solutions Architect Associate', 'Advanced Networking Specialty'],
    simpleEnglish: 'A VPC is your own isolated network in AWS. You decide the IP range, you create subnets (public for things facing the internet, private for things hidden inside), you decide what routes where.',
    deepDive:
      'A VPC is region-scoped with a CIDR range (e.g. 10.0.0.0/16). Subnets are AZ-scoped slices of that CIDR. Route tables decide where each subnet sends traffic — a "public" subnet has a route to an Internet Gateway, a "private" subnet routes through a NAT Gateway. CIDR planning matters: choose ranges that don\'t overlap with on-prem or peered VPCs. Default VPC is a convenience — production VPCs should be custom and tagged carefully.',
    keyPoints: [
      fc('CIDR planning', 'Use RFC 1918 ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). Avoid overlap with on-prem.'),
      fc('Public vs Private subnet', 'Public = route table has a default route to IGW. Private = routes through NAT.'),
      fc('Route table', 'Decides where traffic from a subnet goes. Implicit local route to the VPC always exists.'),
      fc('Internet Gateway', 'Horizontally-scaled, highly available. One per VPC. Free.'),
      fc('NAT Gateway', 'Lets private subnets initiate egress. ~$32/mo + $0.045/GB. Per-AZ for HA.'),
    ],
    useCase: 'A bank designs a VPC with 6 subnets across 2 AZs (2 public, 2 app, 2 db). Web tier in public, app + db tiers in private. NAT for outbound updates.',
    awsDocs: 'https://docs.aws.amazon.com/vpc/',
    related: ['c4-t2', 'c4-t5', 'c4-t7'],
    lab: lab('Build a production-grade VPC from scratch', [
      { title: 'Plan your CIDR',
        detail: 'Pick 10.42.0.0/16. Plan subnets: 10.42.1.0/24 public-az-a, 10.42.2.0/24 public-az-b, 10.42.11.0/24 private-az-a, 10.42.12.0/24 private-az-b.',
        expected: 'A subnet plan written down in advance.',
        gotcha: 'NEVER pick a CIDR that overlaps on-prem or another VPC you might peer with.' },
      { title: 'Create the VPC',
        detail: 'VPC console → Create VPC (just VPC, not the wizard for fine control). Name = lab-vpc, CIDR = 10.42.0.0/16.',
        expected: 'New VPC appears with a main route table (do not use this one for subnets).' },
      { title: 'Create 4 subnets',
        detail: 'Two public (in different AZs), two private (in different AZs). Use the CIDRs from step 1.',
        expected: '4 subnets in the VPC. By default they\'re associated with the main route table.' },
      { title: 'Create + attach an Internet Gateway',
        detail: 'Internet gateways → Create → Attach to lab-vpc.',
        expected: 'IGW state = Attached.' },
      { title: 'Create the public route table',
        detail: 'Route tables → Create → name "rt-public". Add route 0.0.0.0/0 → IGW. Associate with the two public subnets.',
        expected: 'Public subnets now have a route to the internet.' },
      { title: 'Create the NAT Gateway + private route table',
        detail: 'NAT Gateways → Create in public subnet-az-a. Allocate an Elastic IP. Then create "rt-private" with 0.0.0.0/0 → NAT, associate with private subnets.',
        expected: 'Private subnets can initiate outbound (e.g. dnf update) but are unreachable from the internet.',
        gotcha: 'For HA, put a second NAT in az-b too. We\'re skipping for cost.' },
      { title: 'Verify',
        detail: 'Launch a t2.micro in the public subnet (SG: SSH from your IP). SSH in. Then ping 8.8.8.8. Now launch a second in private. Connect via SSM. Ping 8.8.8.8 from private — it should also work via NAT.',
        expected: 'Both instances can reach the internet. Only the public one is reachable from the internet.' },
    ], {
      objective: 'Build a 4-subnet VPC across 2 AZs with IGW + NAT, validate connectivity end-to-end.',
      prereqs: ['Stage 2 AWS account', 'Comfort with CIDR notation'],
      estMinutes: 90,
      freeTier: false,
      estCost: 'NAT Gateway ~$1/day. Delete promptly.',
      cleanup: [
        'Terminate any test EC2.',
        'Delete NAT Gateway (then release the Elastic IP — easy to forget).',
        'Detach + delete the IGW.',
        'Delete subnets, route tables, VPC.',
      ],
    }),
    quiz: quiz([
      { q: 'Which is the MOST cost-effective way to allow private subnets internet egress in a non-production environment?',
        options: ['NAT Gateway in every AZ', 'A single NAT Gateway', 'NAT Instance (t3.nano)', 'Internet Gateway directly'],
        answer: 2,
        why: 'NAT instances are cheaper than NAT gateways but you manage them. Fine for dev/test, not for production HA.',
        wrongReasons: { 3: 'Private subnets cannot use IGW directly — that would make them public.' } },
      { q: 'Default route table behavior in a new custom VPC?',
        options: ['Routes 0.0.0.0/0 to IGW', 'Only the implicit local route exists', 'Blocks all traffic', 'Allows all traffic'],
        answer: 1, why: 'A fresh VPC has only the implicit local route. You add routes explicitly.' },
      { q: 'You create two VPCs with overlapping CIDRs. Can you peer them?', type: 'tf',
        options: ['True', 'False'], answer: 1,
        why: 'VPC peering does NOT support overlapping CIDR ranges.' },
      { q: 'What is the maximum CIDR block size for a VPC?',
        options: ['/8', '/16', '/24', '/28'],
        answer: 1, why: 'VPC CIDRs can be /16 minimum prefix down to /28 maximum. Cannot be larger than /16.' },
      { q: 'Multi-AZ subnets are required for which of these? (multiple)',
        type: 'multi',
        options: ['RDS Multi-AZ', 'Lambda', 'Application Load Balancer', 'EC2 Auto Scaling for HA'],
        answer: [0, 2, 3],
        why: 'Lambda is regional and doesn\'t need subnets at all unless you VPC-attach it.' },
    ]),
    examQuestions: [
      'When would you use VPC Endpoints instead of a NAT Gateway?',
      'Walk through how a packet from a private EC2 reaches the internet.',
    ],
    interviewQuestions: [
      'Design a multi-tier VPC for a regulated workload — diagram on the whiteboard.',
      'Why is a /28 the smallest allowed subnet in AWS? (Answer: 5 IPs reserved per subnet)',
    ],
  }),

  topic('c4-t2', 'Security Groups vs NACLs — complete comparison', {
    summary: 'Two stateful/stateless firewalls. Use both for defense in depth.',
    difficulty: 'intermediate', studyMinutes: 25,
    services: ['vpc', 'sg'], certs: ['Solutions Architect Associate'],
    simpleEnglish: 'A Security Group is a stateful firewall on the instance — return traffic is automatic. A NACL is a stateless firewall on the subnet — you must allow both directions explicitly.',
    deepDive:
      'SG: stateful, instance-level, allow-only rules, evaluated as a whole. NACL: stateless, subnet-level, ordered rules (rule numbers!), supports DENY. SGs are usually enough; NACLs add defense in depth. Common bug: forgetting NACL ephemeral port range (32768-65535) for return traffic.',
    keyPoints: [
      fc('Security Group', 'Stateful, allow-only, instance-level. Can reference other SGs.'),
      fc('NACL', 'Stateless, supports DENY, subnet-level, rules evaluated by number (lowest first).'),
      fc('Ephemeral ports', 'NACL return rules need 32768-65535 for outbound responses.'),
      fc('Best practice', 'Lean on SGs. Use NACLs to block known-bad IP ranges at the subnet edge.'),
    ],
    related: ['c4-t1', 'c5-t3'],
    quiz: quiz([
      { q: 'Where can you express a DENY rule?',
        options: ['Only Security Group', 'Only NACL', 'Both', 'Neither'],
        answer: 1, why: 'SGs are allow-only. NACLs support both ALLOW and DENY.' },
      { q: 'You allow inbound 443 on an SG. Outbound 443 is also implicitly allowed. Why?',
        options: ['NACL rule', 'SG is stateful — return traffic is auto-allowed', 'IAM policy', 'Random'],
        answer: 1, why: 'SG stateful tracking means return traffic for an allowed inbound is automatic.' },
      { q: 'NACL rule numbering best practice (multi):', type: 'multi',
        options: ['Number rules in increments of 10 or 100', 'DENY rules should have lowest numbers', 'Lower numbers = higher priority', 'NACLs don\'t have rule numbers'],
        answer: [0, 2],
        why: 'Lowest-numbered matching rule wins. Use 100/110/120 spacing to allow inserts later.' },
    ]),
  }),

  topic('c4-t3', 'Route 53 — all routing policies', {
    summary: 'AWS DNS with seven routing policies — Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-Value.',
    difficulty: 'intermediate', studyMinutes: 40,
    services: ['route53'], certs: ['Solutions Architect Associate', 'Advanced Networking Specialty'],
    simpleEnglish: 'Route 53 is AWS\'s DNS service. Plain DNS just returns IPs. Route 53 adds smarts: send 90% to one server (weighted), send to the nearest region (latency), fail over when one dies (failover), and more.',
    deepDive:
      'Health checks tie everything together — set them up on every endpoint that\'s part of weighted/latency/failover policies. Alias records (AWS-specific) point at AWS resources by name and dynamically resolve to current IPs — preferred over CNAME for AWS endpoints (and required at the apex).',
    keyPoints: [
      fc('Simple', 'One record, one answer. No advanced features.'),
      fc('Weighted', 'Split traffic by weights — useful for canary deploys (95/5).'),
      fc('Latency', 'Direct user to the lowest-latency region.'),
      fc('Failover', 'Active/passive. Health check decides which.'),
      fc('Geolocation', 'Route by user\'s country/continent. Useful for compliance.'),
      fc('Geoproximity', 'Route by geographic distance with bias to favor specific regions.'),
      fc('Multi-Value Answer', 'Return up to 8 healthy IPs — like simple round-robin with health checks.'),
      fc('Alias vs CNAME', 'Alias is AWS-internal, free, works at apex. CNAME costs a query, fails at apex.'),
    ],
    useCase: 'A SaaS uses Latency routing across us-east-1 + eu-west-2, with Failover within each region. Result: users hit nearest healthy region.',
    related: ['c4-t4', 'c9-t8'],
    quiz: quiz([
      { q: 'You need to direct EU users to eu-west-2 and US users to us-east-1, with sub-50ms latency the goal. Which policy?',
        options: ['Geolocation', 'Latency', 'Geoproximity', 'Failover'],
        answer: 1,
        why: 'Latency-based routing uses AWS\'s real network measurements. Geolocation routes by country regardless of latency.' },
      { q: 'You want example.com (apex) to point at a CloudFront distribution. Which record type?',
        options: ['CNAME', 'A record', 'Alias A', 'TXT'],
        answer: 2,
        why: 'CNAMEs cannot exist at the apex of a domain. Alias A is required.' },
      { q: 'For canary deploys (95% old, 5% new), use:',
        options: ['Failover', 'Weighted', 'Multi-Value', 'Geolocation'],
        answer: 1, why: 'Weighted routing splits by configurable weights.' },
      { q: 'Health checks are required for which of these policies? (multiple)',
        type: 'multi',
        options: ['Failover', 'Simple', 'Multi-Value with health checks', 'Weighted'],
        answer: [0, 2],
        why: 'Failover absolutely requires it. Multi-Value needs them to remove unhealthy IPs. Weighted is optional.' },
    ]),
  }),

  topic('c4-t4', 'CloudFront — CDN deep dive', {
    summary: 'Cache at 400+ edge locations. Behaviors, origins, signed URLs, Lambda@Edge.',
    difficulty: 'intermediate', studyMinutes: 40,
    services: ['cloudfront'], certs: ['Solutions Architect Associate', 'Advanced Networking Specialty'],
    simpleEnglish: 'CloudFront copies your content to data centers near your users. When a user requests a page, the nearest CloudFront serves it from its cache — much faster than your origin.',
    deepDive:
      'A distribution has an Origin (S3, ALB, custom) and one or more Behaviors (path patterns → caching config). Cache key includes URL by default; add headers/cookies/query strings carefully (each combination is a separate cache entry). Origin Shield is a regional cache between edge and origin to improve hit rates. Origin Access Control (OAC) keeps S3 buckets private.',
    keyPoints: [
      fc('Edge locations', '400+ POPs worldwide. Latency to users ~10-30ms.'),
      fc('Behaviors', 'Path-pattern matched rules (e.g. /api/* → no cache, /static/* → cache 1 year).'),
      fc('Cache key', 'Default = URL only. Including headers/cookies multiplies cache entries.'),
      fc('Origin Access Control', 'Lock S3 origin to CloudFront only — replaces older OAI.'),
      fc('Invalidation', 'Manual purge by path. First 1000/month free, then $0.005 each.'),
    ],
    awsDocs: 'https://docs.aws.amazon.com/AmazonCloudFront/',
    related: ['c3-t1', 'c4-t3', 'c4-t10'],
  }),

  topic('c4-t5', 'Elastic Load Balancing — ALB, NLB, GLB', {
    summary: 'Layer 7 (ALB), Layer 4 (NLB), Layer 3 (GLB) — when to use each.',
    difficulty: 'intermediate', studyMinutes: 35,
    services: ['alb'], certs: ['Solutions Architect Associate', 'SysOps'],
    simpleEnglish: 'ALB reads HTTP, makes smart routing decisions (path, host, header). NLB just passes raw TCP at line speed. GLB lets you insert third-party firewall appliances.',
    deepDive:
      'ALB: HTTP/HTTPS/WebSocket/gRPC. Routes by path, host header, query string, source IP. TLS terminates here. Health checks at L7. NLB: TCP/UDP/TLS pass-through. Millions of requests/sec, ultra-low latency, static IPs. Gateway Load Balancer: L3 transparent, used to insert security appliances (Palo Alto VM-Series, etc.) into the data path.',
    keyPoints: [
      fc('ALB', 'L7. Path/host/header routing. WebSockets, gRPC, HTTP/2.'),
      fc('NLB', 'L4. Static IPs, pass-through TLS, extreme performance.'),
      fc('GLB', 'L3. Inserts security appliances (firewalls) into traffic flow.'),
      fc('Target types', 'Instance, IP, Lambda (ALB only), ALB (NLB → ALB chaining).'),
      fc('Cross-zone balancing', 'On = even spread across AZ targets. Off = even spread across AZs.'),
    ],
    related: ['c4-t1', 'c2-t2'],
  }),

  topic('c4-t6', 'Direct Connect — setup, BGP, virtual interfaces', {
    summary: 'A dedicated, private fiber from on-prem to AWS. Consistent low latency.',
    difficulty: 'advanced', studyMinutes: 45,
    services: ['dx'], certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'Direct Connect is a physical fiber connection from your data center to AWS\'s. No internet involved — predictable performance, often cheaper for large data.',
    deepDive:
      'You install at a DX location (or use a partner). Speeds: 50Mbps to 100Gbps. Three Virtual Interface types: Private VIF (into your VPC), Public VIF (AWS public services, e.g. S3 with private IPs), Transit VIF (to a Transit Gateway, hub for multiple VPCs). BGP is the routing protocol — use BFD for faster failover. LAGs aggregate multiple links.',
    keyPoints: [
      fc('Speeds', '50Mbps – 100Gbps. Hosted (via partner) vs Dedicated (your own port).'),
      fc('Private VIF', 'Into a specific VPC.'),
      fc('Public VIF', 'Reach AWS public services privately (e.g. S3 endpoints).'),
      fc('Transit VIF', 'Into a Transit Gateway → access many VPCs.'),
      fc('BGP', 'Required. Use AS-path prepending + local preference for traffic engineering.'),
      fc('BFD', 'Bidirectional Forwarding Detection. Sub-second failure detection.'),
    ],
    related: ['c4-t7', 'c4-t8'],
  }),

  topic('c4-t7', 'VPN — Site-to-Site and Client VPN', {
    summary: 'IPSec tunnels for on-prem connectivity; SSL-VPN for individual users.',
    difficulty: 'intermediate', studyMinutes: 30,
    services: ['vpn'], certs: ['Solutions Architect Associate', 'Advanced Networking Specialty'],
    simpleEnglish: 'Site-to-Site VPN connects your office network to AWS over the internet, encrypted. Client VPN lets individual laptops dial into AWS like a corporate VPN.',
    deepDive:
      'Site-to-Site VPN: two IPSec tunnels (active/standby) per connection for redundancy. BGP optional but recommended. Throughput ~1.25 Gbps per tunnel. AWS provides config templates for major firewall vendors (Cisco, Fortinet, Palo Alto, Juniper). Client VPN: managed OpenVPN-based service, integrates with AD or SAML.',
    keyPoints: [
      fc('Two tunnels per VPN', 'Always active/standby for HA.'),
      fc('BGP', 'Optional but enables dynamic failover.'),
      fc('Throughput cap', '~1.25 Gbps per tunnel.'),
      fc('Client VPN', 'For individual users. SAML or AD auth.'),
    ],
    related: ['c4-t6', 'c4-t8'],
  }),

  topic('c4-t8', 'Transit Gateway — hub-and-spoke at scale', {
    summary: 'Connect many VPCs and on-prem networks through a single managed hub.',
    difficulty: 'advanced', studyMinutes: 35,
    services: ['tgw'], certs: ['Advanced Networking Specialty', 'Solutions Architect Professional'],
    simpleEnglish: 'Instead of full-mesh peering between VPCs (N² connections), point everyone at a Transit Gateway. Simpler routing.',
    deepDive:
      'TGW supports up to 5000 VPC attachments. Route tables on the TGW control which attachments can talk to which (isolation between accounts). Inter-region peering for global mesh. Multicast support for legacy workloads. Cost: hourly per attachment + per GB processed.',
    keyPoints: [
      fc('Hub-and-spoke', 'Solves the N² mesh problem.'),
      fc('Route table per TGW', 'Granular control over which attachments share routes.'),
      fc('Inter-region peering', 'Connect TGWs in different regions.'),
      fc('Cost', '~$0.05/hour/attachment + $0.02/GB processed.'),
    ],
    related: ['c4-t6', 'c4-t7'],
  }),

  topic('c4-t9', 'PrivateLink — expose services privately', {
    summary: 'Let other AWS accounts reach your service without going over the internet.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'PrivateLink creates an ENI in your VPC that maps to a service in another VPC or AWS account. Traffic never leaves the AWS backbone.',
    deepDive:
      'You create an Endpoint Service in front of an NLB. Consumers create an Interface VPC Endpoint pointing at your service. SaaS providers use this for customer access. Also used internally to expose shared services to many spoke VPCs.',
    keyPoints: [
      fc('Endpoint Service', 'You expose your NLB-fronted app as a service.'),
      fc('Interface Endpoint', 'Consumer attaches an ENI in their VPC.'),
      fc('Why over peering?', 'No CIDR overlap concerns. One-way exposure. Per-account approval.'),
    ],
  }),

  topic('c4-t10', 'Global Accelerator — anycast at AWS edge', {
    summary: 'Two static anycast IPs that route users to the nearest healthy AWS region.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Advanced Networking Specialty', 'Solutions Architect Associate'],
    simpleEnglish: 'Global Accelerator gives you 2 fixed IPs that magically route users to the nearest AWS region. Traffic uses AWS\'s private backbone — faster than the public internet.',
    deepDive:
      'Compared to CloudFront: CloudFront is content-focused (caches static content). GA is for non-HTTP workloads (gaming, VOIP, MQTT) or stateful TCP/UDP needing static IPs. Endpoints can be ALB, NLB, EC2, Elastic IPs.',
    keyPoints: [
      fc('Two static anycast IPs', 'Stable IPs your users hit; AWS routes to nearest region.'),
      fc('Backbone routing', 'Traffic uses AWS\'s private fiber, not the public internet.'),
      fc('vs CloudFront', 'GA for non-HTTP / stateful TCP. CloudFront for caching HTTP.'),
    ],
    related: ['c4-t4'],
  }),

  topic('c4-t11', 'Network Firewall — managed stateful firewall', {
    summary: 'A managed firewall service for VPC traffic with Suricata-compatible rules.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Advanced Networking Specialty', 'Security Specialty'],
    simpleEnglish: 'AWS Network Firewall is a managed firewall that sits in your VPC and applies stateful rules (IPS-style) to traffic. Goes beyond what SG/NACL can do.',
    deepDive:
      'Insert into your route tables — typically with a dedicated inspection VPC + Transit Gateway. Suricata-compatible rules for IPS-style inspection. Useful for filtering egress (block known-bad domains), inspecting east-west traffic.',
    keyPoints: [
      fc('Stateful firewall', 'Inspect connections, not just packets.'),
      fc('Suricata rules', 'Industry-standard IPS rule format.'),
      fc('Insertion', 'Via route tables — typically inspection VPC pattern.'),
    ],
  }),

  topic('c4-t12', 'CCNA to AWS bridge — mapping your knowledge', {
    summary: 'How CCNA concepts translate to AWS networking — your shortcut.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'If you know CCNA, you already know 80% of AWS networking. The boxes are virtual but the concepts are the same.',
    deepDive:
      'Cisco router → AWS Transit Gateway. ACL → NACL. Stateful firewall on Cisco ASA → Security Group. OSPF/EIGRP → BGP only on AWS. VLAN → Subnet (kind of). VRRP/HSRP → multi-AZ with health checks. The biggest mindset shift: AWS networking is software-defined, abstracted from physical hardware.',
    keyPoints: [
      fc('Router', '→ Transit Gateway or route tables.'),
      fc('ACL', '→ NACL.'),
      fc('Stateful firewall', '→ Security Group.'),
      fc('OSPF/EIGRP', '→ BGP only on AWS (Direct Connect/VPN).'),
      fc('VLAN', '→ Subnet — but with AZ awareness baked in.'),
      fc('HSRP/VRRP', '→ Multi-AZ + Route 53 + ELB.'),
    ],
    related: ['c4-t1', 'c4-t6'],
  }),

  topic('c4-t13', 'Network automation with Python and boto3', {
    summary: 'Programmatically create VPCs, subnets, routes, and security rules.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['DevOps Engineer', 'Advanced Networking Specialty'],
    simpleEnglish: 'boto3 is the Python SDK for AWS. With ~30 lines you can spin up an entire VPC. Anything you can click, you can script.',
    deepDive:
      'Idempotency matters — wrap creates in try/except and check existence first. CloudFormation/CDK/Terraform handle this for you. boto3 is good for one-off scripts and operational tasks (e.g. bulk add SG rule, audit VPCs).',
    keyPoints: [
      fc('boto3.client vs resource', 'Client = low-level, resource = higher-level OO. Most AWS examples use client.'),
      fc('Idempotency', 'Check before create, or use Terraform/CDK.'),
      fc('When NOT to use', 'For repeatable infra, use IaC (Terraform/CDK) not raw scripts.'),
    ],
  }),

  topic('c4-t14', 'BGP on AWS Direct Connect', {
    summary: 'Border Gateway Protocol for routing between on-prem and AWS.',
    difficulty: 'advanced', studyMinutes: 30,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'BGP is how the internet routes packets. On Direct Connect, you BGP-peer with AWS so each side learns the other\'s routes dynamically.',
    deepDive:
      'AWS uses private ASNs (64512-65534) or your own. Local Preference + AS-path prepending influence path selection. BFD detects link failures in sub-second. MD5 password between peers for authentication. Active/active routing with two DX connections + BGP keeps both pipes hot.',
    keyPoints: [
      fc('AS number', 'Use private ASN (64512-65534) or your own assigned.'),
      fc('AS-path prepend', 'Make a path "look" longer to influence return traffic.'),
      fc('Local preference', 'Sets outbound path preference (higher wins).'),
      fc('BFD', 'Sub-second failure detection for faster failover than BGP timers.'),
    ],
  }),

  topic('c4-t15', 'IPv6 on AWS', {
    summary: 'Dual-stack networking — when and how to enable IPv6.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'AWS supports IPv6. You can run dual-stack VPCs. Most public-facing apps should — IPv6-only clients exist (especially mobile).',
    deepDive:
      'IPv6 in VPC: AWS-assigned /56 block; you can\'t pick. Public IPv6 = directly routable (no NAT — yay). For egress without inbound, use Egress-Only Internet Gateway. ALB/NLB support dual-stack. CloudFront and Route 53 support IPv6.',
    keyPoints: [
      fc('No NAT', 'IPv6 has enough addresses — every instance can have a public IPv6.'),
      fc('Egress-Only IGW', 'IPv6 equivalent of NAT — outbound only.'),
      fc('Cost', 'Per-hour for public IPv4 — IPv6 saves money since 2024.'),
    ],
  }),

  topic('c4-t16', 'Network performance optimization', {
    summary: 'Tune EC2 networking: ENA, placement groups, jumbo frames, EFA.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'Default EC2 networking is fast, but if you need extreme throughput or microsecond latency, you can enable ENA (modern driver), placement groups (physically close), jumbo frames, or EFA (HPC).',
    deepDive:
      'ENA: modern Elastic Network Adapter (10-100 Gbps) — default on modern instances. Placement Groups: Cluster (low latency), Spread (high availability), Partition (large distributed apps). Jumbo frames (9001 MTU): only between EC2s in the same VPC. EFA: Elastic Fabric Adapter for HPC, MPI, ML.',
    keyPoints: [
      fc('ENA', 'Modern driver, default on newer instance types.'),
      fc('Cluster placement group', 'Instances in same rack — lowest latency.'),
      fc('Jumbo frames', '9001 MTU. Only inside a VPC. Improves throughput for big transfers.'),
      fc('EFA', 'HPC/ML — OS-bypass for microsecond latency.'),
    ],
  }),

  topic('c4-t17', 'SD-WAN integration with AWS', {
    summary: 'Connect SD-WAN appliances (Cisco, VMware, Aviatrix) to AWS for branch connectivity.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'SD-WAN orchestrates branch connectivity using software. AWS partners with major vendors so branches can reach AWS workloads alongside SaaS, internet, and on-prem.',
    deepDive:
      'Pattern: SD-WAN edge devices at branches form tunnels into a Transit Gateway (often via Transit Gateway Connect with BGP). Marketplace AMIs deploy partner virtual appliances in AWS. Aviatrix is a popular AWS-native multi-cloud overlay.',
    keyPoints: [
      fc('Transit Gateway Connect', 'BGP-based attachment for SD-WAN VAs.'),
      fc('Marketplace VAs', 'Cisco vEdge, Fortinet, Aviatrix, Palo Alto deploy as EC2.'),
      fc('Use case', 'Hundreds of branches — far more scalable than per-branch VPN connections.'),
    ],
  }),

  topic('c4-t18', 'Zero trust network architecture on AWS', {
    summary: 'Verify every request; never trust the network alone.',
    difficulty: 'advanced', studyMinutes: 30,
    certs: ['Security Specialty', 'Solutions Architect Professional'],
    simpleEnglish: 'Zero Trust says "the network is hostile". Authenticate every request, even from inside your VPC.',
    deepDive:
      'Building blocks: IAM Identity Center / Cognito for SSO, fine-grained IAM, VPC Lattice / Service Connect for service-to-service auth, AWS Verified Access for application access without VPN, PrivateLink for service exposure, Resource-based policies enforcing principal identity. Combine with continuous logging via CloudTrail + GuardDuty.',
    keyPoints: [
      fc('Verify identity, not network', 'Trust = signed token, not source IP.'),
      fc('Verified Access', 'Per-request auth for internal apps — no VPN.'),
      fc('VPC Lattice', 'Service-to-service auth across VPCs/accounts.'),
      fc('Continuous monitoring', 'CloudTrail + GuardDuty + Security Hub.'),
    ],
  }),

  topic('c4-t19', 'Network as Code with Terraform', {
    summary: 'Provision VPCs, subnets, routes, and peerings declaratively.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'Write your network as text files. terraform apply turns those files into AWS resources. Make a change → see the plan → apply.',
    deepDive:
      'The terraform-aws-modules/vpc/aws community module handles the boilerplate. State management matters: use S3 backend with DynamoDB locking. Run terraform plan in CI. Drift detection: terraform plan periodically to find manual changes.',
    keyPoints: [
      fc('Modules', 'Use community VPC module for fast bootstrap.'),
      fc('Remote state + locking', 'S3 backend + DynamoDB lock table — required for teams.'),
      fc('Plan in CI', 'Run terraform plan on every PR, apply on merge.'),
      fc('Drift', 'Use plan to detect manual changes; reconcile by importing or reverting.'),
    ],
  }),

  topic('c4-t20', 'Packet analysis and troubleshooting on AWS', {
    summary: 'When networking misbehaves — VPC Flow Logs, Traffic Mirroring, Reachability Analyzer.',
    difficulty: 'advanced', studyMinutes: 30,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'No tcpdump on AWS? Use VPC Flow Logs (who-to-who summaries), Traffic Mirroring (full packet captures to your tools), Reachability Analyzer (path simulation).',
    deepDive:
      'VPC Flow Logs: 5-tuple summaries, ACCEPT/REJECT, action. Output to CloudWatch Logs or S3. Use Log Insights to query. Traffic Mirroring: copy ENI traffic to a sensor (Suricata, Zeek). Reachability Analyzer: "can A talk to B?" — explains why or why not based on SG/NACL/route tables.',
    keyPoints: [
      fc('VPC Flow Logs', 'Connection summaries. Not full packet content.'),
      fc('Traffic Mirroring', 'Full packet copies to a sensor. Costs more than Flow Logs.'),
      fc('Reachability Analyzer', 'Static path analysis — saves hours of guesswork.'),
    ],
  }),
];

// ---------- 5. SECURITY & COMPLIANCE ----------
const security = [
  topic('c5-t1', 'IAM — Identities, Policies, Roles', {
    summary: 'The access-control engine of AWS. Master this or be hacked.',
    difficulty: 'intermediate', studyMinutes: 50,
    services: ['iam'], certs: ['Cloud Practitioner', 'Security Specialty'],
    simpleEnglish: 'IAM is a list of who can do what. Users have credentials, Roles get assumed temporarily, Policies are JSON rules that grant or deny.',
    deepDive:
      'Identity-based policies: attached to users/groups/roles. Resource-based policies: attached to S3 buckets, KMS keys, SNS topics. Permission boundaries: max permission an entity can have. SCPs (Organizations): max permission for an account. Effective access = intersection of identity policy + resource policy + boundary + SCP. Use roles for code (EC2 instance profile, Lambda execution role) — never put access keys in code.',
    keyPoints: [
      fc('Users vs Roles', 'Users = humans with passwords. Roles = temporary credentials assumed by code or other identities.'),
      fc('Policy evaluation', 'Explicit DENY > explicit ALLOW > default DENY.'),
      fc('Permission boundary', 'Caps maximum permission. Useful for delegating user management.'),
      fc('Instance profile', 'Container that attaches an IAM role to an EC2 instance.'),
      fc('Cross-account role', 'A role in account B that account A can sts:AssumeRole into.'),
    ],
    quiz: quiz([
      { q: 'You attach two policies — one Allow s3:*, one Deny s3:DeleteObject. Effective permission?',
        options: ['Allow everything including delete', 'Allow everything EXCEPT delete', 'Deny everything', 'Conditional'],
        answer: 1, why: 'Explicit DENY always wins over ALLOW.' },
      { q: 'Best way to give an EC2 instance access to S3?',
        options: ['Access key in code', 'Access key in environment variable', 'IAM Role + instance profile', 'Root user creds'],
        answer: 2, why: 'Instance profiles use temporary credentials, rotated by AWS automatically.' },
      { q: 'What does an SCP do in Organizations?',
        options: ['Grants permissions', 'Caps maximum permissions for accounts', 'Replaces IAM policies', 'Encrypts policies'],
        answer: 1, why: 'SCPs do not grant — they restrict what IAM can grant in member accounts.' },
    ]),
  }),

  topic('c5-t2', 'KMS — Key Management Service', {
    summary: 'Centralized cryptographic keys, used by every encryption-enabled AWS service.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Security Specialty'],
    simpleEnglish: 'KMS holds your encryption keys safely. When S3 or RDS encrypts your data, they ask KMS for permission to do it. You audit every key use in CloudTrail.',
    deepDive:
      'Customer Managed Keys (CMKs) — you control rotation + policy. AWS Managed Keys — service-owned, less control but free. Envelope encryption: KMS encrypts a data key, the data key encrypts your data. Key policies + IAM together determine access. Multi-Region keys for cross-region encryption without re-encrypting.',
    keyPoints: [
      fc('CMK vs AWS managed key', 'CMK: $1/mo, you control rotation. AWS managed: free, less flexible.'),
      fc('Envelope encryption', 'KMS encrypts a small data key. Data key encrypts the big data.'),
      fc('Key policy', 'Resource-based policy on the key. Combined with IAM via AND.'),
      fc('Multi-Region keys', 'Same key material in multiple regions for DR.'),
    ],
  }),

  topic('c5-t3', 'GuardDuty + Security Hub + Inspector', {
    summary: 'Threat detection, compliance posture, vulnerability scanning.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Security Specialty'],
    simpleEnglish: 'GuardDuty watches for bad behavior (crypto mining, port scans). Inspector scans your EC2/containers/Lambdas for known CVEs. Security Hub aggregates findings.',
    deepDive:
      'GuardDuty consumes CloudTrail, VPC Flow Logs, DNS logs and finds anomalies via ML. Inspector v2 covers EC2, ECR images, and Lambda. Security Hub normalizes findings into ASFF format and runs CIS/PCI/NIST checks. Wire findings to EventBridge → SNS → Slack/PagerDuty.',
    keyPoints: [
      fc('GuardDuty', 'ML-driven threat detection. Always-on once enabled.'),
      fc('Inspector', 'CVE scanner. EC2, container images, Lambda.'),
      fc('Security Hub', 'Aggregates findings + runs compliance checks (CIS, PCI, NIST).'),
      fc('Detective', 'Investigation tool — visualize relationships between findings.'),
    ],
  }),

  topic('c5-t4', 'AWS WAF + Shield', {
    summary: 'Web Application Firewall + DDoS protection.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Security Specialty'],
    simpleEnglish: 'WAF blocks bad HTTP requests (SQL injection, XSS, bot traffic). Shield protects against DDoS attacks. Both sit in front of CloudFront/ALB.',
    deepDive:
      'WAF rules: managed rule groups (AWS, Marketplace) + custom rules (rate-based, IP set, geo, regex). Shield Standard is free + automatic. Shield Advanced ($3k/mo) gets 24/7 DRT team, cost protection, advanced metrics.',
    keyPoints: [
      fc('WAF rule types', 'Managed (CRS, AWS Top 10), rate-based, custom (regex, IP, geo).'),
      fc('Shield Standard', 'Free + automatic, L3/L4 protection.'),
      fc('Shield Advanced', '$3k/mo. DRT, cost protection, advanced telemetry.'),
    ],
  }),

  topic('c5-t5', 'Secrets Manager + Parameter Store', {
    summary: 'Two ways to store secrets and config — when to use each.',
    difficulty: 'intermediate', studyMinutes: 20,
    services: ['secretsmgr'], certs: ['Security Specialty', 'Developer Associate'],
    simpleEnglish: 'Parameter Store is free for plain config. Secrets Manager costs ~$0.40/mo per secret but auto-rotates DB passwords. Don\'t put secrets in env vars or code.',
    deepDive:
      'Parameter Store: free for Standard, $0.05/10k API calls for Advanced. Supports SecureString (KMS-encrypted). Secrets Manager: $0.40/secret/mo + $0.05/10k calls. Has rotation via Lambda. Both retrieve via IAM-authenticated API.',
    keyPoints: [
      fc('Parameter Store', 'Free. KMS-encrypted SecureString. No rotation.'),
      fc('Secrets Manager', '$0.40/secret/mo. Auto-rotation for RDS/DocumentDB etc.'),
      fc('Decision', 'Plain config + occasional secret → Parameter Store. DB passwords + API keys → Secrets Manager.'),
    ],
  }),

  topic('c5-t6', 'CloudTrail + Config + Audit Manager', {
    summary: 'The audit triad — who did what, what is the state, are we compliant?',
    difficulty: 'intermediate', studyMinutes: 25,
    services: ['cloudtrail'], certs: ['Security Specialty'],
    simpleEnglish: 'CloudTrail = every API call. Config = current state of resources + change history. Audit Manager = ready-made compliance reports.',
    deepDive:
      'CloudTrail: management events free, data events extra. Send to S3 + CloudWatch Logs for analysis. Multi-region trails recommended. Config: snapshot of resources every change. Custom rules in Lambda. Audit Manager: collects evidence for SOC2, PCI, HIPAA frameworks.',
    keyPoints: [
      fc('CloudTrail', 'API audit log. Management events free, data events extra.'),
      fc('Config', 'Resource state + change history. Custom rules in Lambda.'),
      fc('Audit Manager', 'Auto-collected evidence for compliance audits.'),
    ],
  }),

  topic('c5-t7', 'AWS Organizations + SCPs', {
    summary: 'Multi-account governance — consolidated billing + guardrails.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Security Specialty', 'Solutions Architect Professional'],
    simpleEnglish: 'Don\'t put everything in one AWS account. Use Organizations to manage many accounts: one for prod, one for dev, one for security tools. SCPs set guardrails.',
    deepDive:
      'Best-practice landing zone (via Control Tower): management account, log archive account, audit account, plus workload accounts. SCPs at the OU level deny risky actions (e.g. "no deletion of CloudTrail"). Use IAM Identity Center for SSO across all accounts.',
    keyPoints: [
      fc('Account separation', 'Blast radius isolation. Prod/dev/security separation.'),
      fc('SCPs', 'Account-level deny rules. Cannot grant — only restrict.'),
      fc('Control Tower', 'Opinionated landing zone with guardrails.'),
      fc('IAM Identity Center', 'SSO across accounts via SAML/OIDC.'),
    ],
  }),

  topic('c5-t8', 'Encryption everywhere — at rest, in transit, in use', {
    summary: 'AWS defaults are good — but verify on every service.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Security Specialty'],
    simpleEnglish: 'Encrypt your data three ways: on disk (at rest), over the wire (in transit), and during processing (in use, with Nitro Enclaves).',
    deepDive:
      'At rest: S3 default SSE-S3, EBS default encryption, RDS encryption (must enable at create). In transit: TLS everywhere — ACM for certs, ALB enforces TLS. In use: Nitro Enclaves for confidential computing, AWS Clean Rooms for multi-party computation.',
    keyPoints: [
      fc('At rest defaults', 'S3 SSE-S3 default. EBS default encryption toggle account-wide.'),
      fc('In transit', 'TLS. ACM for free certs. ALB redirect HTTP→HTTPS.'),
      fc('In use', 'Nitro Enclaves isolate sensitive workloads at hardware level.'),
    ],
  }),
];

// ---------- 6. DATABASES ----------
const databases = [
  topic('c6-t1', 'Choosing the right AWS database', {
    summary: 'Relational vs NoSQL vs analytics vs caching — there\'s a service for each.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Solutions Architect Associate', 'Database Specialty'],
    simpleEnglish: 'AWS has 15+ database services. The trick is matching workload to service: transactional (RDS, Aurora), key-value (DynamoDB), cache (ElastiCache), wide-column (Keyspaces), analytics (Redshift), document (DocumentDB), time-series (Timestream), graph (Neptune).',
    deepDive:
      'Decision tree: structured + ACID transactions? RDS or Aurora. Massive scale + flexible schema? DynamoDB. Sub-ms cache? ElastiCache (Redis/Memcached). Analytics? Redshift. Search? OpenSearch. Time-series IoT? Timestream. Graph relationships? Neptune. Ledger? QLDB.',
    keyPoints: [
      fc('RDS', 'Managed MySQL, Postgres, MariaDB, Oracle, SQL Server.'),
      fc('Aurora', 'AWS-built MySQL/Postgres-compatible, 5x performance, distributed storage.'),
      fc('DynamoDB', 'NoSQL key-value/document. Single-digit ms latency at any scale.'),
      fc('ElastiCache', 'Redis or Memcached. Sub-ms latency caching.'),
      fc('Redshift', 'Petabyte-scale columnar warehouse.'),
      fc('Neptune', 'Graph database (RDF + Property Graph).'),
    ],
  }),

  topic('c6-t2', 'RDS deep dive', {
    summary: 'Managed relational databases — backups, replicas, failover.',
    difficulty: 'intermediate', studyMinutes: 35,
    services: ['rds'], certs: ['Solutions Architect Associate', 'Database Specialty'],
    simpleEnglish: 'RDS manages a database engine for you. You pick the engine, size, and replicas. AWS patches, backs up, and fails over.',
    deepDive:
      'Multi-AZ = synchronous replica in another AZ for HA failover (60-120s). Read Replicas = asynchronous, up to 15, optional cross-region. Backups: automatic daily snapshots + transaction logs (PITR within retention). Parameter groups for engine config. Option groups for engine-specific features.',
    keyPoints: [
      fc('Multi-AZ vs Read Replica', 'Multi-AZ = HA only (failover). Read Replica = read scaling, can be cross-region.'),
      fc('Automated backups', 'Daily snapshot + transaction logs. Retention up to 35 days. PITR to any second.'),
      fc('Reserved Instances', 'Up to 60% off for 1-3 year commitments.'),
      fc('IAM authentication', 'Generate tokens via IAM instead of password.'),
    ],
  }),

  topic('c6-t3', 'Aurora — AWS-built cloud database', {
    summary: 'MySQL/PostgreSQL-compatible but with a distributed storage layer.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Database Specialty', 'Solutions Architect Associate'],
    simpleEnglish: 'Aurora speaks MySQL or Postgres but stores data across 6 copies in 3 AZs. Up to 15 read replicas with sub-10ms replica lag.',
    deepDive:
      'Storage auto-grows to 128TB. Backups continuous to S3. Aurora Serverless v2 scales capacity in fractional units of ACUs. Global Database: cross-region replica with sub-second lag. Failover under 30s.',
    keyPoints: [
      fc('6-way storage', '3 AZs × 2 copies. Survives loss of 2 copies without write loss.'),
      fc('Up to 15 read replicas', 'vs 5 for RDS. Sub-10ms lag typical.'),
      fc('Aurora Serverless v2', 'Scales in 0.5 ACU increments. Fits unpredictable workloads.'),
      fc('Global Database', 'Cross-region replica with <1s lag. Promote for DR.'),
    ],
  }),

  topic('c6-t4', 'DynamoDB design patterns', {
    summary: 'Single-table design, partition key strategy, GSIs, streams.',
    difficulty: 'advanced', studyMinutes: 45,
    services: ['dynamodb'], certs: ['Database Specialty', 'Developer Associate'],
    simpleEnglish: 'DynamoDB is the opposite of SQL. Schema is flexible, queries must be planned up front. Bad partition keys = hotspots.',
    deepDive:
      'Partition key + optional sort key. Items distributed by hashing PK. Global Secondary Index (GSI) lets you query by different keys. DynamoDB Streams = change log → Lambda. On-demand vs provisioned capacity. Single-table design: store multiple entity types in one table — efficient but complex.',
    keyPoints: [
      fc('Partition + sort key', 'PK = hash. SK = sort within a PK.'),
      fc('GSI vs LSI', 'GSI: different PK, no item-collection limit. LSI: same PK, different SK, 10GB limit.'),
      fc('On-demand vs provisioned', 'On-demand: pay per request, scales infinitely. Provisioned: cheaper at scale, RCU/WCU.'),
      fc('Streams', 'Change log to Lambda. Useful for CDC, replication, downstream propagation.'),
    ],
  }),

  topic('c6-t5', 'ElastiCache — Redis vs Memcached', {
    summary: 'In-memory cache to take pressure off the database.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Database Specialty'],
    simpleEnglish: 'Cache results in RAM. Redis = features (TTL, pub/sub, persistence, clusters). Memcached = simple, multi-threaded, no persistence.',
    deepDive:
      'Cache strategies: lazy loading (cache aside), write-through, TTL. Redis clusters shard data. Multi-AZ for HA. Use ElastiCache for Redis when you need data structures (sorted sets, streams, geo); use Memcached for simple key-value at high concurrency.',
    keyPoints: [
      fc('Lazy loading', 'Cache on miss. Saves memory but cold misses are slow.'),
      fc('Write-through', 'Write to cache + DB simultaneously. Fresh but wastes cache for unread data.'),
      fc('Redis features', 'Pub/sub, streams, sorted sets, geo, scripting, persistence.'),
      fc('Memcached', 'Multi-threaded, simple key-value. No persistence.'),
    ],
  }),

  topic('c6-t6', 'Redshift + RA3 + Spectrum', {
    summary: 'Petabyte-scale data warehouse with separation of compute and storage.',
    difficulty: 'advanced', studyMinutes: 30,
    certs: ['Database Specialty', 'Data Analytics'],
    simpleEnglish: 'Redshift stores data in columns + compresses heavily, so it scans billions of rows in seconds. Spectrum queries S3 directly without loading.',
    deepDive:
      'RA3 nodes separate compute from storage (Redshift Managed Storage). Spectrum runs SQL on S3 data — pay per TB scanned. Federated queries across RDS + Aurora. Use Redshift Serverless for unpredictable workloads.',
    keyPoints: [
      fc('Columnar storage', 'Stores by column, not row. 10-100x faster for analytics scans.'),
      fc('RA3 nodes', 'Separate compute from storage. Scale each independently.'),
      fc('Spectrum', 'Query S3 directly from Redshift. Pay per scan.'),
      fc('Redshift Serverless', 'Pay per workload. Auto-scales.'),
    ],
  }),

  topic('c6-t7', 'DocumentDB + Neptune + Timestream + QLDB', {
    summary: 'Purpose-built databases for documents, graphs, time-series, and ledgers.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Database Specialty'],
    simpleEnglish: 'AWS has specialty databases for non-relational data: DocumentDB = MongoDB-compatible. Neptune = graph. Timestream = time-series. QLDB = cryptographically verifiable ledger.',
    deepDive:
      'DocumentDB ≠ MongoDB but speaks the wire protocol. Neptune supports SPARQL + Gremlin. Timestream auto-partitions by time. QLDB tracks every change cryptographically — useful for audit trails.',
    keyPoints: [
      fc('DocumentDB', 'MongoDB-compatible. Aurora-style storage. Single region.'),
      fc('Neptune', 'Graph DB — Gremlin (property graph) + SPARQL (RDF).'),
      fc('Timestream', 'Time-series. Auto memory + magnetic tiers.'),
      fc('QLDB', 'Ledger DB — every change cryptographically signed.'),
    ],
  }),

  topic('c6-t8', 'Database migration — DMS + SCT', {
    summary: 'Move databases to AWS — homogeneous or heterogeneous.',
    difficulty: 'intermediate', studyMinutes: 25,
    services: ['dms'], certs: ['Database Specialty'],
    simpleEnglish: 'DMS copies data from source to target with minimal downtime. SCT converts schemas between engines (Oracle → Postgres).',
    deepDive:
      'DMS: full-load + CDC (change-data-capture) for ongoing replication. Source/target can be different engines. SCT analyzes schemas, code, stored procedures and produces conversion reports.',
    keyPoints: [
      fc('Full-load + CDC', 'Snapshot then stream changes. Cutover with minimal downtime.'),
      fc('Homogeneous vs heterogeneous', 'Same engine (easier) vs different engines (needs SCT).'),
      fc('SCT', 'Converts schemas + stored procedures. Flags manual fixes.'),
    ],
  }),
];

// ---------- 7. MONITORING & OBSERVABILITY ----------
const monitoring = [
  topic('c7-t1', 'CloudWatch — Metrics, Logs, Alarms', {
    summary: 'AWS\'s native observability platform — metrics, logs, traces, and dashboards.',
    difficulty: 'intermediate', studyMinutes: 40,
    services: ['cloudwatch'], certs: ['Solutions Architect Associate', 'SysOps'],
    simpleEnglish: 'CloudWatch collects metrics + logs from every AWS service. Build alarms that notify you when something\'s wrong, dashboards to visualize.',
    deepDive:
      'Metrics: every service emits some by default. Custom metrics via PutMetricData or EMF (logs → metrics for free). Logs: Streams ingest via agent / SDK. Insights queries with SQL-like syntax. Alarms: thresholds + composite alarms. Use ALARM/INSUFFICIENT_DATA/OK states.',
    keyPoints: [
      fc('Metrics', 'Push (custom) or pull (built-in). 1-min resolution default, 1-sec for high-res.'),
      fc('Logs', 'Push from agents or SDK. Insights queries. Retention configurable per group.'),
      fc('Alarms', 'Threshold or composite. ALARM → SNS → notification.'),
      fc('EMF', 'Embedded Metric Format. Log JSON → free metrics.'),
    ],
  }),

  topic('c7-t2', 'X-Ray + Distributed Tracing', {
    summary: 'Trace requests across microservices — find the slow link.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Developer Associate', 'DevOps Engineer'],
    simpleEnglish: 'X-Ray instruments your services so a request shows up as a tree of spans across Lambda, API Gateway, DynamoDB, etc. The slow segment glows red.',
    deepDive:
      'Service map auto-discovers dependencies. Annotations let you filter (e.g. user_id, plan_tier). Subsegments capture sub-operations. Sampling rules trade cost vs visibility.',
    keyPoints: [
      fc('Service map', 'Auto-rendered DAG of services and their latencies.'),
      fc('Annotations', 'Indexed key/values for filtering.'),
      fc('Subsegments', 'Custom spans inside a segment for code-level timing.'),
      fc('Sampling rules', 'Reduce cost by sampling non-error traffic.'),
    ],
  }),

  topic('c7-t3', 'CloudWatch Logs Insights', {
    summary: 'SQL-ish queries against log streams.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['SysOps', 'DevOps Engineer'],
    simpleEnglish: 'Insights = grep on steroids. fields, filter, stats, sort over millions of log lines in seconds.',
    deepDive:
      'Query syntax: pipe-style. fields @timestamp, @message | filter @message like /ERROR/ | stats count() by bin(5m). Saved queries + dashboard widgets. Up to 5 log groups per query (in older accounts; newer allow 50).',
    keyPoints: [
      fc('Query syntax', 'fields | filter | stats | sort | limit.'),
      fc('Saved queries', 'Reuse across the org.'),
      fc('Dashboard widgets', 'Embed Insights queries directly.'),
    ],
  }),

  topic('c7-t4', 'CloudWatch Synthetics + RUM', {
    summary: 'Active monitoring of endpoints + real-user metrics from the browser.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['SysOps', 'DevOps Engineer'],
    simpleEnglish: 'Synthetics runs scripted "canaries" that hit your endpoints every N minutes. RUM is a JS snippet that collects real-user performance data.',
    deepDive:
      'Synthetic canaries written in Node.js (Puppeteer/Playwright). RUM collects Core Web Vitals + JS errors. Both integrate with CloudWatch Alarms.',
    keyPoints: [
      fc('Synthetic canaries', 'Scripted browser checks. Catch problems before users.'),
      fc('RUM', 'Real user data — Core Web Vitals, JS errors, geographic breakdown.'),
    ],
  }),

  topic('c7-t5', 'Anomaly detection + composite alarms', {
    summary: 'When threshold alarms are too noisy — use ML-detected anomalies + compound conditions.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['SysOps', 'Solutions Architect Professional'],
    simpleEnglish: 'Anomaly detection learns your baseline + alerts on deviations. Composite alarms only fire when multiple signals align.',
    deepDive:
      'Anomaly detection trains on 2 weeks of data, then suggests a band. Composite alarms combine alarms with AND/OR/NOT logic + state suppression rules.',
    keyPoints: [
      fc('Anomaly detection', 'ML baseline. Better than static thresholds for seasonal traffic.'),
      fc('Composite', 'Boolean combination of alarms. Suppress flapping noise.'),
    ],
  }),

  topic('c7-t6', 'OpenTelemetry on AWS', {
    summary: 'Vendor-neutral instrumentation — collect once, send anywhere.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'OTel is the open standard for traces + metrics + logs. AWS Distro for OpenTelemetry (ADOT) bundles the agents pre-configured for AWS.',
    deepDive:
      'ADOT collector deploys as a sidecar or daemon. Sources: SDKs in your app. Exporters: CloudWatch, X-Ray, Prometheus, Datadog. Single instrumentation → multiple destinations.',
    keyPoints: [
      fc('OTel SDK', 'Instrument once, language-agnostic standard.'),
      fc('ADOT Collector', 'AWS-supported distro with X-Ray, CW exporters preconfigured.'),
    ],
  }),

  topic('c7-t7', 'Service Quotas + Trusted Advisor', {
    summary: 'Know your limits before they bite you in production.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['SysOps', 'Cloud Practitioner'],
    simpleEnglish: 'Every AWS service has quotas (formerly "limits"). Service Quotas console shows them. Trusted Advisor flags ones you\'re approaching.',
    deepDive:
      'Some quotas are soft (raise via support ticket), some hard. Plan ahead — increases can take days for big asks. Trusted Advisor (full version with Business support) checks cost, performance, security, fault tolerance, service limits.',
    keyPoints: [
      fc('Quotas', 'Per-region. Some soft, some hard.'),
      fc('Trusted Advisor', 'Business support unlocks 100+ checks.'),
    ],
  }),

  topic('c7-t8', 'Cost + budget alarms', {
    summary: 'Catch runaway spend with billing alarms.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'Set a $10 budget alarm. The moment your forecast says you\'ll exceed it, you get an email — before the bill arrives.',
    deepDive:
      'Budgets vs Billing Alarms: Budgets are richer (forecasted, per-service, RI utilization). Billing alarms = older, CloudWatch metric for total estimated charges. Cost Anomaly Detection is ML-based.',
    keyPoints: [
      fc('Budgets', 'Forecasted, granular, per-service.'),
      fc('Cost Anomaly Detection', 'ML-based deviation detection.'),
    ],
  }),
];

// ---------- 8. DEVOPS & AUTOMATION ----------
const devops = [
  topic('c8-t1', 'CodePipeline + CodeBuild + CodeDeploy', {
    summary: 'AWS-native CI/CD building blocks.',
    difficulty: 'intermediate', studyMinutes: 35,
    services: ['codepipeline', 'codebuild', 'codedeploy'],
    certs: ['Developer Associate', 'DevOps Engineer'],
    simpleEnglish: 'Pipeline orchestrates the stages. Build compiles + tests. Deploy ships to EC2/Lambda/ECS. Glue them together with manual approvals and gates.',
    deepDive:
      'Build via buildspec.yml. Deploy via appspec.yml. Pipeline via pipeline.yml. CodeStar Connections to GitHub. Cross-account deploys via roles.',
    keyPoints: [
      fc('Pipeline', 'Stages → actions. Sequential or parallel.'),
      fc('Build', 'buildspec.yml. Caching, parallelism, custom images.'),
      fc('Deploy', 'appspec.yml. Blue/green, rolling, in-place.'),
    ],
  }),

  topic('c8-t2', 'CloudFormation + CDK + SAM', {
    summary: 'Three AWS-native ways to do Infrastructure as Code.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'CloudFormation = YAML/JSON declarative. CDK = real code (Python/TS) that compiles to CloudFormation. SAM = simplified CloudFormation for serverless.',
    deepDive:
      'CFN: change sets preview, drift detection, stack policies, transforms. CDK: constructs library, L1 (raw) / L2 (curated) / L3 (patterns). SAM extends CFN with shortcuts for Lambda/API Gateway.',
    keyPoints: [
      fc('CloudFormation', 'Declarative YAML. Truth in the template.'),
      fc('CDK', 'TS/Python/Java. Real programming. Compiles to CFN.'),
      fc('SAM', 'Serverless shortcut over CFN.'),
    ],
  }),

  topic('c8-t3', 'GitHub Actions + AWS', {
    summary: 'Many teams use GitHub Actions instead of CodePipeline.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'GHA runs on GitHub-hosted runners and deploys to AWS via short-lived OIDC credentials — no static keys.',
    deepDive:
      'configure-aws-credentials action with OIDC + role to assume. Avoid storing access keys in secrets. Reuse workflows across repos with reusable workflows or composite actions.',
    keyPoints: [
      fc('OIDC', 'Short-lived federation. No static AWS keys in GitHub Secrets.'),
      fc('configure-aws-credentials', 'Official action for AWS auth.'),
    ],
  }),

  topic('c8-t4', 'Systems Manager (SSM)', {
    summary: 'The Swiss Army knife: patching, run-commands, parameters, sessions.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['SysOps', 'DevOps Engineer'],
    simpleEnglish: 'SSM does fleet management. Patch all your EC2, run a command on a thousand hosts, store config, SSH without keys via Session Manager.',
    deepDive:
      'Session Manager replaces SSH (no port 22 needed). Patch Manager schedules + reports. Run Command pushes commands. Parameter Store for config. Automation documents (SSM Documents) chain steps.',
    keyPoints: [
      fc('Session Manager', 'Browser-based shell. No SSH keys, no port 22.'),
      fc('Patch Manager', 'Scheduled patching with windows and compliance.'),
      fc('Run Command', 'Push commands to fleets.'),
    ],
  }),

  topic('c8-t5', 'Blue/green deploys', {
    summary: 'Two production environments — flip traffic on cutover.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'Stand up the new version next to the old. Test on the new. Flip a switch (DNS or LB) to send traffic to new. Roll back instantly if needed.',
    deepDive:
      'CodeDeploy blue/green for EC2/Lambda/ECS. ALB target groups + weighted routing. Lambda alias + versions for traffic shifting. Combine with feature flags for risk reduction.',
    keyPoints: [
      fc('Two environments', 'Green = live. Blue = new. Test then flip.'),
      fc('Traffic shifting', 'Lambda alias weights, ALB target group weights.'),
      fc('Rollback', 'Flip back instantly if metrics regress.'),
    ],
  }),

  topic('c8-t6', 'Container CI/CD with ECR + ECS', {
    summary: 'Build images, push to ECR, deploy to ECS — fully automated.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'ECR = AWS\'s Docker Hub. CodeBuild builds the image, pushes to ECR, then CodeDeploy updates the ECS task definition.',
    deepDive:
      'ECR lifecycle policies prune old images. Image scanning for vulnerabilities. Cross-region replication for global deploys. Task definitions are versioned — easy rollback.',
    keyPoints: [
      fc('ECR lifecycle', 'Auto-prune old images.'),
      fc('Image scanning', 'Basic (free) or enhanced (Inspector v2).'),
      fc('Task definition', 'Versioned recipe. Rollback = previous revision.'),
    ],
  }),

  topic('c8-t7', 'AWS Copilot + App Runner for fast deploys', {
    summary: 'When you want to ship a container without thinking about ECS.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Developer Associate'],
    simpleEnglish: 'Copilot is a CLI that takes a Dockerfile + manifest and provisions ECS for you. App Runner is even simpler.',
    deepDive:
      'Copilot generates a production-grade ECS stack with LB, VPC, ALB. App Runner abstracts further — give it a repo + URL, get a running service. Trade flexibility for ergonomics.',
    keyPoints: [
      fc('Copilot', 'CLI → opinionated ECS app + envs.'),
      fc('App Runner', 'Simplest container deploy. No EC2 to manage.'),
    ],
  }),

  topic('c8-t8', 'GitOps + ArgoCD on EKS', {
    summary: 'Declare desired state in Git; operators reconcile reality.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['DevOps Engineer'],
    simpleEnglish: 'GitOps = your Git repo is the source of truth. ArgoCD watches Git + applies changes to the cluster.',
    deepDive:
      'Flux + ArgoCD are the main tools. Combine with Kustomize/Helm for templating. Drift detection: cluster state ≠ git → reconciler fixes it. Multi-cluster via ApplicationSets.',
    keyPoints: [
      fc('Git as source of truth', 'No imperative kubectl applies.'),
      fc('Reconciliation loop', 'Watch git, diff cluster, apply.'),
      fc('Multi-cluster', 'ApplicationSets templating across clusters.'),
    ],
  }),
];

// ---------- 9. AI & MACHINE LEARNING ----------
const ai = [
  topic('c9-t1', 'SageMaker overview', {
    summary: 'End-to-end ML platform: notebooks, training, deployment, monitoring.',
    difficulty: 'intermediate', studyMinutes: 35,
    certs: ['Machine Learning Specialty'],
    simpleEnglish: 'SageMaker = AWS\'s do-it-all ML service. Notebooks to explore data, training jobs to fit models, endpoints to serve predictions, plus pipelines + monitoring.',
    deepDive:
      'Studio = web IDE. Training jobs use spot instances for cost. Endpoints autoscale. Pipelines orchestrate the whole lifecycle. Model Monitor detects drift in production.',
    keyPoints: [
      fc('Studio', 'Browser IDE for ML.'),
      fc('Training', 'Spot capable, distributed.'),
      fc('Endpoints', 'Real-time, async, serverless, batch transform.'),
      fc('Model Monitor', 'Detects data drift + model drift.'),
    ],
  }),
  topic('c9-t2', 'Bedrock + foundation models', {
    summary: 'Managed access to Anthropic Claude, Llama, Titan, Cohere — single API.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['AI Practitioner'],
    simpleEnglish: 'Bedrock is the gateway to multiple foundation model providers. Pay per token. No infra to manage.',
    deepDive:
      'Models: Claude (Anthropic), Llama (Meta), Titan (AWS), Cohere, Mistral. Knowledge Bases for RAG. Agents for tool use. Guardrails for content filtering.',
    keyPoints: [
      fc('Bedrock', 'Multi-provider FM API.'),
      fc('Knowledge Bases', 'Managed RAG over your docs.'),
      fc('Agents', 'Tool-using LLMs with function calls.'),
      fc('Guardrails', 'Content filters + topic blocking.'),
    ],
  }),
  topic('c9-t3', 'Rekognition + Textract + Comprehend', {
    summary: 'Pre-trained AI services for vision, OCR, and NLP.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['AI Practitioner'],
    simpleEnglish: 'Don\'t train a model — call an API. Rekognition for images/video. Textract for documents/PDFs. Comprehend for sentiment + entities.',
    deepDive:
      'Rekognition: faces, objects, moderation. Textract: forms, tables, signatures. Comprehend: sentiment, entities, custom classification. All pay-per-use.',
    keyPoints: [
      fc('Rekognition', 'Vision: faces, objects, content moderation.'),
      fc('Textract', 'OCR with structure: forms, tables.'),
      fc('Comprehend', 'NLP: sentiment, entities, language, custom classification.'),
    ],
  }),
  topic('c9-t4', 'AWS AI for Q + Translate + Transcribe + Polly', {
    summary: 'More AI building blocks: Q&A, translation, speech-to-text, text-to-speech.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['AI Practitioner'],
    simpleEnglish: 'Q for chatbots. Translate for language conversion. Transcribe = speech-to-text. Polly = text-to-speech.',
    deepDive: 'Pay-per-character or per-minute. Real-time and batch modes.',
    keyPoints: [
      fc('Amazon Q', 'Enterprise chatbot connected to your data.'),
      fc('Translate', '75+ languages.'),
      fc('Transcribe', 'Speech-to-text with custom vocab + speaker labels.'),
      fc('Polly', 'TTS with neural voices.'),
    ],
  }),
  topic('c9-t5', 'Vector databases on AWS', {
    summary: 'OpenSearch + pgvector + Aurora Postgres for embedding storage.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Machine Learning Specialty'],
    simpleEnglish: 'RAG apps need to store millions of embeddings + find the nearest neighbors fast. OpenSearch + pgvector + Aurora Postgres all support vector search.',
    deepDive: 'OpenSearch k-NN plugin. pgvector extension for Postgres. Bedrock Knowledge Bases manages this for you.',
    keyPoints: [
      fc('OpenSearch k-NN', 'HNSW algorithm. Filterable.'),
      fc('pgvector', 'Postgres extension. Easy if you already use RDS.'),
      fc('Managed via Knowledge Bases', 'Bedrock handles vectorization + retrieval.'),
    ],
  }),
  topic('c9-t6', 'Responsible AI on AWS', {
    summary: 'Guardrails, bias detection, model explainability.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['AI Practitioner', 'Machine Learning Specialty'],
    simpleEnglish: 'Guardrails block harmful outputs. SageMaker Clarify detects bias. Model Cards document context.',
    deepDive: 'Bedrock Guardrails: PII detection, topic blocking, content filters. SageMaker Clarify: bias metrics + SHAP values for explainability.',
    keyPoints: [
      fc('Guardrails', 'Block content categories + PII.'),
      fc('Clarify', 'Bias detection + SHAP explainability.'),
      fc('Model Cards', 'Documented context + intended use.'),
    ],
  }),
  topic('c9-t7', 'Cost-effective ML inference', {
    summary: 'Serverless inference, batch transform, multi-model endpoints.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Machine Learning Specialty'],
    simpleEnglish: 'Don\'t pay for an idle endpoint. Use serverless, batch, or multi-model endpoints for sparse workloads.',
    deepDive: 'Serverless inference: pay per invocation. Batch transform: offline scoring. Multi-Model Endpoint: many models behind one endpoint.',
    keyPoints: [
      fc('Serverless inference', 'Pay per invoke. Cold starts.'),
      fc('Batch transform', 'Offline scoring on S3 data.'),
      fc('Multi-Model Endpoint', 'Many models share one container.'),
    ],
  }),
  topic('c9-t8', 'Glue + Athena for ML data prep', {
    summary: 'Crawl, transform, query — feed clean data to your training jobs.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Data Analytics'],
    simpleEnglish: 'Glue crawls your S3 + builds a catalog. Athena lets you query with SQL. Both pay-per-use.',
    deepDive: 'Glue jobs (Spark or Python shell), Glue DataBrew for visual prep, Athena for serverless SQL on S3.',
    keyPoints: [
      fc('Glue Catalog', 'Schema metadata for S3 data.'),
      fc('Glue Jobs', 'Spark/Python for ETL.'),
      fc('Athena', 'Serverless SQL on S3. Pay per TB scanned.'),
    ],
  }),
];

// ---------- 10. APPLICATION INTEGRATION ----------
const integration = [
  topic('c10-t1', 'SQS — Simple Queue Service', {
    summary: 'Decoupled, durable message queue with at-least-once delivery.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Solutions Architect Associate', 'Developer Associate'],
    simpleEnglish: 'SQS is a queue. Producers send messages, consumers read them. Decouples your services so one slow consumer doesn\'t crash the producer.',
    deepDive:
      'Standard queues: at-least-once, unordered, near-unlimited TPS. FIFO queues: exactly-once, ordered, 300 TPS (3000 with batching). Visibility timeout, dead-letter queues, long polling.',
    keyPoints: [
      fc('Standard vs FIFO', 'Standard: high TPS, unordered. FIFO: ordered, exactly-once.'),
      fc('Visibility timeout', 'How long a message is hidden after a consumer picks it up.'),
      fc('DLQ', 'Failed messages go here after N retries.'),
      fc('Long polling', 'WaitTimeSeconds=20 to reduce empty receives.'),
    ],
  }),
  topic('c10-t2', 'SNS — pub/sub fanout', {
    summary: 'One message to many subscribers — email, SMS, SQS, Lambda, HTTP.',
    difficulty: 'beginner', studyMinutes: 20,
    services: ['sns'], certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Publish a message to a topic. Every subscriber gets a copy. Mix subscriber types — email + Slack + SQS.',
    deepDive: 'Standard + FIFO topics. Filter policies route by attributes. Message retention up to 14 days. Encrypted topics via KMS.',
    keyPoints: [
      fc('Fan-out', 'One publish, many subscribers.'),
      fc('Filter policies', 'Subscriber-side filtering by message attributes.'),
      fc('FIFO topics', 'Ordered, exactly-once when paired with FIFO SQS subscribers.'),
    ],
  }),
  topic('c10-t3', 'EventBridge', {
    summary: 'Event bus with rules. Trigger workflows from any AWS service.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Solutions Architect Associate', 'Developer Associate'],
    simpleEnglish: 'EventBridge is a smart message router. AWS services emit events. You write rules + targets. Decouple everything.',
    deepDive: 'Default bus + custom buses. Schema Registry for event contracts. Pipes for source-to-target without code.',
    keyPoints: [
      fc('Rules', 'Pattern match on event JSON.'),
      fc('Targets', 'Lambda, SQS, SNS, Step Functions, HTTP, more.'),
      fc('Pipes', 'No-code source-to-target pipelines.'),
    ],
  }),
  topic('c10-t4', 'Step Functions', {
    summary: 'Orchestrate Lambdas + services into reliable workflows with retries and human approval.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Developer Associate'],
    simpleEnglish: 'Step Functions = visual state machine. Boxes = tasks. Arrows = transitions. Built-in retries, timeouts, parallel branches, human approval.',
    deepDive: 'Standard vs Express (cheap, high-volume). Direct service integrations (200+ AWS services callable without Lambda).',
    keyPoints: [
      fc('Standard vs Express', 'Standard: 1yr max, expensive but durable. Express: 5min max, cheap, eventually-consistent history.'),
      fc('Service integrations', 'Call AWS APIs directly without Lambda wrappers.'),
    ],
  }),
  topic('c10-t5', 'MQ + Kinesis Data Streams', {
    summary: 'Managed Apache ActiveMQ/RabbitMQ + real-time data streaming.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'MQ = managed RabbitMQ/ActiveMQ for legacy apps speaking JMS/AMQP. Kinesis Data Streams = real-time stream of records (like Kafka).',
    deepDive: 'Kinesis shards scale by writing TPS. KCL consumes. Firehose delivers to S3/Redshift. MSK = managed Kafka.',
    keyPoints: [
      fc('MQ', 'Drop-in for legacy ActiveMQ/RabbitMQ.'),
      fc('Kinesis Data Streams', 'Real-time stream. Shards = parallelism.'),
      fc('Firehose', 'Stream → S3/Redshift batch loader.'),
      fc('MSK', 'Managed Kafka.'),
    ],
  }),
  topic('c10-t6', 'API Gateway — REST, HTTP, WebSocket', {
    summary: 'Managed front door for HTTP/WS APIs with auth, throttling, transformation.',
    difficulty: 'intermediate', studyMinutes: 25,
    services: ['apigateway'], certs: ['Developer Associate'],
    simpleEnglish: 'API Gateway is a managed reverse proxy. Authentication, rate limits, request/response transforms, integrations with Lambda or HTTP backends.',
    deepDive: 'REST API: feature-rich, expensive. HTTP API: cheaper, simpler, JWT auth. WebSocket API: stateful, push from server.',
    keyPoints: [
      fc('REST vs HTTP API', 'REST: more features (request validation, transforms). HTTP: 70% cheaper.'),
      fc('Throttling', 'Per-method, per-key.'),
      fc('Cognito authorizer', 'JWT validation built-in.'),
    ],
  }),
  topic('c10-t7', 'AppFlow + EventBridge SaaS sources', {
    summary: 'No-code data flows from SaaS apps to AWS.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Data Analytics'],
    simpleEnglish: 'AppFlow connects Salesforce, Slack, Zendesk, etc. to S3/Redshift without writing code.',
    deepDive: 'EventBridge Partner Source = real-time SaaS events on your bus. AppFlow = scheduled or event-driven batch transfer.',
    keyPoints: [
      fc('AppFlow', 'Scheduled SaaS → AWS pipelines.'),
      fc('EventBridge Partner', 'Real-time SaaS events as event bus sources.'),
    ],
  }),
  topic('c10-t8', 'WebSocket + GraphQL with AppSync', {
    summary: 'Managed GraphQL with subscriptions, auth, caching.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Developer Associate'],
    simpleEnglish: 'AppSync = managed GraphQL service. Real-time via subscriptions (WebSocket). Multiple data sources: DynamoDB, Lambda, HTTP.',
    deepDive: 'Resolvers in VTL or JS. Pipeline resolvers chain operations. Caching at the API.',
    keyPoints: [
      fc('GraphQL managed', 'No need to run Apollo.'),
      fc('Real-time subscriptions', 'WebSocket transport.'),
      fc('Multiple data sources', 'DynamoDB, Lambda, HTTP, Aurora.'),
    ],
  }),
];

// ---------- 11. DATA ENGINEERING ----------
const dataEng = [
  topic('c11-t1', 'Data lake on S3 + Glue + Athena', {
    summary: 'The reference architecture: land raw in S3, catalog with Glue, query with Athena.',
    difficulty: 'intermediate', studyMinutes: 35,
    certs: ['Data Analytics'],
    simpleEnglish: 'Throw everything into S3. Glue Crawler builds the schema. Athena lets you SQL on it.',
    deepDive: 'Partition by date for cheap queries. Convert to Parquet for 10x faster scans. Use Lake Formation for fine-grained permissions.',
    keyPoints: [
      fc('S3 + partitioning', 'Date-based partitions = cheap scans.'),
      fc('Parquet > CSV', 'Columnar + compressed. 10x cheaper queries.'),
      fc('Lake Formation', 'Column-level access control over S3.'),
    ],
  }),
  topic('c11-t2', 'Streaming ETL with Kinesis + Lambda', {
    summary: 'Process events in real-time as they arrive.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Data Analytics'],
    simpleEnglish: 'Kinesis Data Streams ingests events. Lambda processes batches. Firehose loads into S3 every minute.',
    deepDive: 'Enhanced fan-out for low-latency consumers. Kinesis Data Analytics (Apache Flink) for stateful processing.',
    keyPoints: [
      fc('Kinesis shards', 'Parallelism unit.'),
      fc('Lambda integration', 'Polls in batches. Auto-scales.'),
      fc('Flink', 'Stateful windowed processing.'),
    ],
  }),
  topic('c11-t3', 'EMR (Spark + Hadoop)', {
    summary: 'Managed Hadoop/Spark/Hive/Presto clusters.',
    difficulty: 'advanced', studyMinutes: 30,
    certs: ['Data Analytics'],
    simpleEnglish: 'EMR provisions Hadoop/Spark clusters on demand. Use for large batch ETL where Glue is too limited.',
    deepDive: 'EMR Serverless = pay-per-second. EMR on EKS = run Spark on existing Kubernetes. Spot instances cut cost 80%.',
    keyPoints: [
      fc('EMR Serverless', 'Pay per second.'),
      fc('Spot fleets', 'Cheapest mode for batch.'),
      fc('EMR on EKS', 'Reuse your k8s.'),
    ],
  }),
  topic('c11-t4', 'Redshift + dbt for BI', {
    summary: 'Warehouse + transformation framework = modern analytics.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Data Analytics'],
    simpleEnglish: 'Load raw data into Redshift. Run dbt to model it into clean tables. BI tools query the clean models.',
    deepDive: 'dbt Core (OSS) + dbt Cloud. Materialized views in Redshift. Workload management queues for fairness.',
    keyPoints: [
      fc('dbt models', 'SQL files versioned in git.'),
      fc('Materialized views', 'Pre-computed for fast reads.'),
      fc('WLM queues', 'Per-team isolation.'),
    ],
  }),
  topic('c11-t5', 'Open Table formats — Iceberg, Hudi, Delta', {
    summary: 'ACID + time travel on S3 data lakes.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Data Analytics'],
    simpleEnglish: 'Open table formats add database-like features to S3 data: row-level updates, transactions, time travel.',
    deepDive: 'Iceberg is AWS\'s default in Glue/Athena. Hudi by Uber. Delta by Databricks. All solve the "S3 isn\'t a database" problem.',
    keyPoints: [
      fc('Iceberg', 'AWS default. Glue + Athena + EMR support.'),
      fc('Hudi', 'Upsert-heavy. Uber-built.'),
      fc('Delta', 'Databricks ecosystem.'),
    ],
  }),
  topic('c11-t6', 'OpenSearch — search + log analytics', {
    summary: 'Managed Elasticsearch fork for search + Kibana-style log dashboards.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Data Analytics'],
    simpleEnglish: 'OpenSearch = managed search engine + dashboards. Pump logs in, search them with Kibana-style UI.',
    deepDive: 'Index rotation by date. UltraWarm tier for older data (cheaper, slower). Serverless option.',
    keyPoints: [
      fc('Index rotation', 'Hot/warm tiers by age.'),
      fc('UltraWarm', 'Cheaper storage for older indexes.'),
      fc('Serverless', 'Pay per data ingested + queried.'),
    ],
  }),
  topic('c11-t7', 'DataZone + Glue Data Catalog', {
    summary: 'Data governance + discoverability at scale.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Data Analytics'],
    simpleEnglish: 'DataZone is a portal where analysts find datasets, request access, and trace lineage.',
    deepDive: 'Built on Glue Data Catalog. Integrates with Lake Formation. Lineage from Glue jobs.',
    keyPoints: [
      fc('Data discovery', 'Searchable dataset portal.'),
      fc('Lineage', 'Where did this dataset come from?'),
    ],
  }),
  topic('c11-t8', 'QuickSight for self-serve BI', {
    summary: 'AWS-native BI tool with ML insights.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['Data Analytics'],
    simpleEnglish: 'QuickSight = dashboards + ML auto-insights (Q&A in natural language).',
    deepDive: 'SPICE engine for in-memory speed. Embedded analytics for SaaS apps. QuickSight Q for natural-language queries.',
    keyPoints: [
      fc('SPICE', 'In-memory data engine.'),
      fc('QuickSight Q', 'Natural-language to chart.'),
    ],
  }),
];

// ---------- 12. MIGRATION & TRANSFER ----------
const migration = [
  topic('c12-t1', 'AWS Migration Hub + MGN', {
    summary: 'Track migrations in one place. MGN does lift-and-shift.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'Migration Hub = dashboard for your migration. MGN = block-level replication of on-prem servers to AWS — minimal downtime.',
    deepDive: 'Application Discovery Service finds on-prem servers + dependencies. MGN streams disk changes to a staging area. Cutover boots in AWS.',
    keyPoints: [
      fc('Application Discovery', 'Inventory + dependency graph.'),
      fc('MGN', 'Block-level replication. Lift-and-shift.'),
      fc('Migration Hub', 'Single dashboard.'),
    ],
  }),
  topic('c12-t2', 'Lift-and-shift vs refactor vs replatform', {
    summary: 'The 6 R\'s of cloud migration strategy.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: '6 R\'s: Rehost (lift+shift), Replatform (tweak), Repurchase (SaaS), Refactor (rewrite cloud-native), Retire (delete), Retain (keep on-prem).',
    deepDive: 'Rehost is fastest, refactor is best long-term. Most migrations are 70% rehost + 20% replatform + 10% refactor.',
    keyPoints: [
      fc('Rehost', 'Lift + shift. Fastest.'),
      fc('Replatform', 'Lift + light tweaks (e.g. RDS instead of self-managed).'),
      fc('Refactor', 'Rewrite cloud-native. Best long-term.'),
    ],
  }),
  topic('c12-t3', 'Snow Family — physical transfer', {
    summary: 'When the internet is too slow — ship disks.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'AWS ships you a rugged drive. Copy data. Ship it back. They upload to S3.',
    deepDive: 'Snowcone (8TB), Snowball Edge (80TB + compute), Snowmobile (100PB semi-truck).',
    keyPoints: [
      fc('Snowcone', '8TB ruggedized drive.'),
      fc('Snowball Edge', '80TB + EC2 compute included.'),
      fc('Snowmobile', '100PB shipping container.'),
    ],
  }),
  topic('c12-t4', 'DMS + Schema Conversion Tool', {
    summary: 'Database migration with minimal downtime.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Database Specialty'],
    simpleEnglish: 'DMS replicates the data. SCT converts the schema if you\'re changing engines (Oracle → Postgres).',
    deepDive: 'Full-load + CDC for ongoing replication. Heterogeneous migrations need SCT.',
    keyPoints: [
      fc('DMS', 'Replicate any-to-any with CDC.'),
      fc('SCT', 'Convert schema + flag manual fixes.'),
    ],
  }),
  topic('c12-t5', 'App Refactor — Strangler Fig pattern', {
    summary: 'Slowly replace a monolith one route at a time.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'Put an API Gateway in front of the old app. Route one path at a time to a new Lambda. Eventually nothing\'s left of the old app.',
    deepDive: 'Strangler Fig + Branch by Abstraction + Anti-Corruption Layer. Migrate incrementally without big-bang risk.',
    keyPoints: [
      fc('Strangler Fig', 'Incremental migration via routing.'),
      fc('Branch by Abstraction', 'Wrap the legacy call. Swap implementations.'),
    ],
  }),
  topic('c12-t6', 'Storage Gateway for hybrid', {
    summary: 'Bridge on-prem servers to AWS storage.',
    difficulty: 'intermediate', studyMinutes: 15,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Storage Gateway lets your on-prem servers see AWS storage as NFS/SMB/iSCSI.',
    deepDive: 'File Gateway → S3. Volume Gateway → EBS snapshots. Tape Gateway → S3/Glacier.',
    keyPoints: [
      fc('File Gateway', 'NFS/SMB → S3.'),
      fc('Volume Gateway', 'iSCSI → EBS snapshots.'),
      fc('Tape Gateway', 'VTL → S3/Glacier.'),
    ],
  }),
  topic('c12-t7', 'DataSync vs Transfer Family', {
    summary: 'Network-based transfer choices.',
    difficulty: 'intermediate', studyMinutes: 15,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'DataSync = bulk migration. Transfer Family = ongoing SFTP/FTPS/FTP.',
    deepDive: 'DataSync compresses + parallelizes. Transfer Family is for ongoing partner exchanges over standard protocols.',
    keyPoints: [
      fc('DataSync', 'Bulk migration. 10x rsync.'),
      fc('Transfer Family', 'Managed SFTP/FTPS/FTP fronting S3.'),
    ],
  }),
  topic('c12-t8', 'Cloud Adoption Framework (CAF)', {
    summary: 'AWS\'s playbook for organizational cloud transformation.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'CAF is six perspectives — Business, People, Governance, Platform, Security, Operations — for moving an organization to the cloud.',
    deepDive: 'Use the CAF to assess gaps and plan the change-management side of a migration.',
    keyPoints: [
      fc('6 perspectives', 'Business, People, Governance, Platform, Security, Operations.'),
      fc('Used in', 'Migration assessments + cloud foundations.'),
    ],
  }),
];

// ---------- 13. COST MANAGEMENT ----------
const cost = [
  topic('c13-t1', 'AWS Cost Explorer + Budgets', {
    summary: 'See what you spent. Set guardrails for what you\'ll spend.',
    difficulty: 'beginner', studyMinutes: 20,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'Cost Explorer = visualize spend by service / tag / account. Budgets = set thresholds + alerts.',
    deepDive: 'Cost allocation tags. Reservation + Savings Plan utilization reports. Custom cost categories.',
    keyPoints: [
      fc('Cost Explorer', 'Spend visualization + forecast.'),
      fc('Budgets', 'Threshold + forecast alerts.'),
      fc('Cost allocation tags', 'Need to be activated, then attached to resources.'),
    ],
  }),
  topic('c13-t2', 'Savings Plans + Reserved Instances strategy', {
    summary: 'Commit for 1-3 years for up to 72% off.',
    difficulty: 'intermediate', studyMinutes: 25,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Compute Savings Plans = flexible across EC2/Lambda/Fargate. EC2 Instance SP = stricter, slightly cheaper. RIs = legacy.',
    deepDive: 'Use 1-year No Upfront for first commitment (lowest risk). All Upfront 3-year = max discount but biggest commit.',
    keyPoints: [
      fc('Compute SP', 'Flexible across EC2/Lambda/Fargate.'),
      fc('EC2 Instance SP', 'Stricter. More discount.'),
      fc('Commit term', '1 yr (less discount) vs 3 yr (max).'),
    ],
  }),
  topic('c13-t3', 'Spot fleet patterns', {
    summary: 'Use spare capacity. Survive interruptions.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'Spot = up to 90% off but AWS can take it back in 2 min. Diversify across instance types + AZs to reduce interruption rate.',
    deepDive: 'Spot Fleet, Mixed Instances Policy in ASGs, capacity rebalancing. Use for batch, CI, stateless web.',
    keyPoints: [
      fc('Diversify', 'Multiple instance types + AZs = lower interruption rate.'),
      fc('Capacity rebalancing', 'ASG proactively replaces at-risk Spot instances.'),
    ],
  }),
  topic('c13-t4', 'Compute Optimizer + Rightsizing', {
    summary: 'ML recommendations for over-provisioned resources.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'Compute Optimizer watches your CPU/memory and tells you when an instance can be downsized.',
    deepDive: 'Recommendations for EC2, EBS, Lambda, ECS, RDS. Free.',
    keyPoints: [
      fc('Free', 'Always-on recommendations.'),
      fc('Covers', 'EC2, EBS, Lambda, ECS, RDS.'),
    ],
  }),
  topic('c13-t5', 'S3 lifecycle + Intelligent-Tiering', {
    summary: 'Move data to cheaper tiers automatically.',
    difficulty: 'beginner', studyMinutes: 15,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'Lifecycle rules = manual aging. Intelligent-Tiering = auto-move based on access patterns.',
    deepDive: 'Intelligent-Tiering has no retrieval fee. Costs $0.0025/1000 objects/mo to monitor.',
    keyPoints: [
      fc('Lifecycle', 'Manual age-based transitions.'),
      fc('Intelligent-Tiering', 'Auto, based on access. No retrieval fee.'),
    ],
  }),
  topic('c13-t6', 'Cost Anomaly Detection', {
    summary: 'ML flags unexpected spend before the bill arrives.',
    difficulty: 'beginner', studyMinutes: 10,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'Wake up to a $5k spike from a forgotten test env. CAD catches that within hours.',
    deepDive: 'Define monitors (service, account, tag) + alert subscribers.',
    keyPoints: [
      fc('Monitors', 'Per service, account, or tag.'),
      fc('Alerts', 'Email or SNS.'),
    ],
  }),
  topic('c13-t7', 'Network cost optimization', {
    summary: 'Egress is the gotcha. Avoid AZ crossings, use VPC endpoints.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'Data INTO AWS is free. Data OUT is $0.09/GB. Between AZs is $0.01/GB each way. Add up at scale.',
    deepDive: 'VPC endpoints for S3/DynamoDB avoid NAT. CloudFront caches at edges. Compress responses.',
    keyPoints: [
      fc('Egress = $0.09/GB', 'The big number.'),
      fc('AZ crossing', '$0.01/GB each way.'),
      fc('VPC endpoints', 'Free S3 access without NAT.'),
    ],
  }),
  topic('c13-t8', 'FinOps culture + tagging', {
    summary: 'Bring engineering + finance together. Tag everything.',
    difficulty: 'intermediate', studyMinutes: 20,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'FinOps = engineers see + own their cost. Foundation: tag every resource with Team/Env/Project.',
    deepDive: 'Use AWS Organizations SCPs to enforce tagging. Cost allocation reports group by tags.',
    keyPoints: [
      fc('Tag everything', 'Team, Env, Project, CostCenter.'),
      fc('SCP enforcement', 'Deny creation of untagged resources.'),
    ],
  }),
];

// ---------- 14. EDGE & IoT ----------
const edge = [
  topic('c14-t1', 'CloudFront Functions vs Lambda@Edge', {
    summary: 'Edge compute trade-offs.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Advanced Networking Specialty'],
    simpleEnglish: 'CloudFront Functions = tiny, fast, cheap, limited (no network). Lambda@Edge = real Lambda at the edge, more powerful but slower + pricier.',
    deepDive: 'CF Functions: 2ms max, 2MB memory, viewer events only. L@E: 10s viewer, 30s origin, real network, 10x cost.',
    keyPoints: [
      fc('CF Functions', 'JS only, 2ms, no network. Header rewrites, A/B routing.'),
      fc('Lambda@Edge', 'Full Lambda. Auth, image manipulation.'),
    ],
  }),
  topic('c14-t2', 'IoT Core', {
    summary: 'Managed MQTT broker + device registry + rules engine.',
    difficulty: 'intermediate', studyMinutes: 30,
    certs: ['Cloud Practitioner'],
    simpleEnglish: 'IoT Core handles millions of devices over MQTT. Each device has a certificate. Rules route messages to AWS services.',
    deepDive: 'Device Shadow stores last-known state. Jobs deploys firmware. Greengrass extends to edge.',
    keyPoints: [
      fc('MQTT', 'Default pub/sub for IoT.'),
      fc('Device Shadow', 'Last-known state per device.'),
      fc('Rules engine', 'SQL-like routing to AWS services.'),
    ],
  }),
  topic('c14-t3', 'IoT Greengrass', {
    summary: 'Run AWS Lambda + ML on edge devices.',
    difficulty: 'advanced', studyMinutes: 25,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'Greengrass = AWS Lambda runtime on edge devices. Process locally; sync to cloud when connected.',
    deepDive: 'Greengrass V2 uses component-based deployment. Offline operation. Stream Manager batches data.',
    keyPoints: [
      fc('Lambda at edge', 'Run cloud functions offline on local hardware.'),
      fc('Stream Manager', 'Batch local data, upload when connected.'),
    ],
  }),
  topic('c14-t4', 'Wavelength + Local Zones', {
    summary: 'AWS infra in 5G networks + metros.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'Wavelength puts AWS compute inside Verizon/KDDI 5G networks for sub-10ms mobile latency. Local Zones = AWS in major metros.',
    deepDive: 'Wavelength Zones for AR/VR, real-time gaming, autonomous vehicles. Local Zones for low-latency media + ML inference.',
    keyPoints: [
      fc('Wavelength', '5G carrier network. Sub-10ms.'),
      fc('Local Zones', 'Metro extensions of a parent region.'),
    ],
  }),
  topic('c14-t5', 'Outposts', {
    summary: 'AWS hardware in your data center.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'Outposts ships an AWS rack to your facility. Same API as the cloud, runs locally for ultra-low latency or data residency.',
    deepDive: 'Outposts servers (1U/2U) for smaller footprint. Outposts racks (42U) for larger. Managed by AWS — they replace failed hardware.',
    keyPoints: [
      fc('AWS hardware on-prem', 'Same API, runs locally.'),
      fc('Use cases', 'Data residency, ultra-low latency, slow links.'),
    ],
  }),
  topic('c14-t6', 'Global Accelerator vs CloudFront — when to pick', {
    summary: 'CloudFront for HTTP caching; GA for anycast performance routing.',
    difficulty: 'intermediate', studyMinutes: 15,
    certs: ['Solutions Architect Associate'],
    simpleEnglish: 'CloudFront caches your HTTP responses. GA gives 2 static IPs that route to the nearest healthy region — best for non-HTTP TCP/UDP.',
    deepDive: 'CloudFront also helps non-HTTP via TCP acceleration but GA is purpose-built. GA endpoints can be ALB/NLB/EIP/EC2.',
    keyPoints: [
      fc('CloudFront', 'HTTP caching at edges.'),
      fc('GA', 'TCP/UDP anycast. Stateful workloads.'),
    ],
  }),
  topic('c14-t7', 'Edge ML — Panorama + SageMaker Neo', {
    summary: 'Run computer vision and other models at the edge.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Machine Learning Specialty'],
    simpleEnglish: 'Panorama = appliance + SDK for retail/industrial CV. SageMaker Neo compiles models to run on edge hardware (ARM, x86, GPU).',
    deepDive: 'Panorama appliance runs near the cameras. Neo compiles for specific targets — Raspberry Pi, NVIDIA Jetson, Inferentia.',
    keyPoints: [
      fc('Panorama', 'Edge CV appliance + SDK.'),
      fc('Neo', 'Cross-compile models for edge.'),
    ],
  }),
  topic('c14-t8', 'IoT analytics + FleetWise', {
    summary: 'Specialized stacks for telemetry and vehicles.',
    difficulty: 'advanced', studyMinutes: 20,
    certs: ['Solutions Architect Professional'],
    simpleEnglish: 'IoT Analytics handles telemetry pipelines. FleetWise specifically targets connected vehicles.',
    deepDive: 'IoT Analytics: channels, pipelines, datasets, notebooks. FleetWise: vehicle modeling + campaigns + edge filtering.',
    keyPoints: [
      fc('IoT Analytics', 'Channels → pipelines → datasets.'),
      fc('FleetWise', 'Vehicle telemetry-specific platform.'),
    ],
  }),
];

// ---------- Export the master tree ----------
export const LEARNING_CATEGORIES = [
  { id: 'cf',  title: 'Cloud Fundamentals',         icon: '☁',  topics: cf },
  { id: 'cmp', title: 'Compute',                    icon: '⚙',  topics: compute },
  { id: 'sto', title: 'Storage',                    icon: '💾', topics: storage },
  { id: 'net', title: 'Networking',                 icon: '🌐', topics: networking, expanded: true },
  { id: 'sec', title: 'Security & Compliance',      icon: '🔒', topics: security },
  { id: 'db',  title: 'Databases',                  icon: '🗄', topics: databases },
  { id: 'obs', title: 'Monitoring & Observability', icon: '📊', topics: monitoring },
  { id: 'dev', title: 'DevOps & Automation',        icon: '🔁', topics: devops },
  { id: 'ai',  title: 'AI & Machine Learning',      icon: '🧠', topics: ai },
  { id: 'app', title: 'Application Integration',    icon: '🔗', topics: integration },
  { id: 'data',title: 'Data Engineering',           icon: '📈', topics: dataEng },
  { id: 'mig', title: 'Migration & Transfer',       icon: '🚚', topics: migration },
  { id: 'cost',title: 'Cost Management',            icon: '💰', topics: cost },
  { id: 'edg', title: 'Edge & IoT',                 icon: '📡', topics: edge },
];

export function getCategory(id) {
  return LEARNING_CATEGORIES.find((c) => c.id === id);
}

export function getTopic(catId, topicId) {
  const cat = getCategory(catId);
  return cat?.topics.find((t) => t.id === topicId);
}

export function findTopicAnywhere(topicId) {
  for (const c of LEARNING_CATEGORIES) {
    const t = c.topics.find((tt) => tt.id === topicId);
    if (t) return { category: c, topic: t };
  }
  return null;
}

export function flattenTopics() {
  const out = [];
  for (const c of LEARNING_CATEGORIES) {
    for (const t of c.topics) out.push({ category: c, topic: t });
  }
  return out;
}

export const TOTAL_TOPICS = LEARNING_CATEGORIES.reduce((a, c) => a + c.topics.length, 0);
