/**
 * fixtures.js — realistic proposal scenarios.
 */

export const PROPOSAL_SCENARIOS = [
  // ════════════════════════════════════════════════════════════════
  // 1. Generic copy-paste proposal — every classic mistake
  // ════════════════════════════════════════════════════════════════
  {
    id: 'generic-copypaste',
    name: 'Generic copy-paste, no specifics',
    input: {
      proposalText: `Hi,

I am writing to express my interest in your project. I am an AWS expert with many years of experience and I would love to work with you on this exciting opportunity.

I have worked on many similar projects in the past and I am confident I can deliver great results. I am very passionate about cloud computing and I think I would be a great fit for your team.

I am available to start immediately and I look forward to hearing from you.

Thanks!!!`,
      jobBrief: 'Need an AWS architect to design a multi-region e-commerce platform handling 50K concurrent users with PCI-DSS compliance and Aurora Global Database.',
      clientName: 'Sarah',
      level: 'intermediate',
    },
    expectedRules: [
      'PROP-HOOK-001',           // "I am writing"
      'PROP-CLIENT-NAME-001',    // Sarah not mentioned
      'PROP-MIRROR-001',         // No vocab overlap
      'PROP-SOCIAL-PROOF-001',   // No credentials
      'PROP-NUMBERS-001',        // No specifics
      'PROP-CTA-001',            // No clear next step
      'PROP-PRICE-MISSING-001',  // No price
      'PROP-TIMELINE-001',       // No timeline
      'VOICE-WEAK-001',          // very, really, just, etc
      'VOICE-EXCLAIM-001',       // Multiple !!
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 2. Solid mid-length proposal
  // ════════════════════════════════════════════════════════════════
  {
    id: 'solid-midlength',
    name: 'Solid mid-length proposal',
    input: {
      proposalText: `Hi Sarah,

Your brief mentions 50K concurrent users with PCI-DSS scope and Aurora Global for multi-region — that's the part most proposals will skim past. I'll address it head-on.

UNDERSTANDING
You're building a UK-launched e-commerce platform that needs Ireland failover, 5-year audit retention, and live chat. Hard constraints: PCI-DSS scope segmentation, GDPR data residency in the EU, and a 6-week launch.

APPROACH
Phase 1 (Week 1): Discovery + audit. Map current data flow, confirm PCI scope boundary, lock cardholder data into a separate AWS account.
Phase 2 (Weeks 2-4): Multi-region build. Aurora Global Database (eu-west-2 primary, eu-west-1 standby), ALB + Fargate behind CloudFront + WAF, DynamoDB for session state, Cognito for auth.
Phase 3 (Weeks 5-6): Hardening + launch. KMS customer-managed keys, CloudTrail to dedicated audit account, Inspector + GuardDuty enabled, Multi-AZ everything.

WHY ME
AWS Certified Solutions Architect — Associate. Last project: cut a SaaS platform's monthly AWS bill from $14k to $8k while improving p95 latency from 800ms to 230ms.

TIMELINE & INVESTMENT
6 weeks, end-to-end. Investment: $14,500 fixed. Payment: 50% on signing, 25% at end of week 3, 25% on handover. Net-7.

Deliverables: Terraform repo, deployed eu-west-2 + eu-west-1, PCI scope diagram, runbook PDF, 2-hour handover call.

Out of scope: ongoing support after handover, 3rd-party payment gateway licenses, frontend redesign.

NEXT STEPS
I have Tuesday 2-3pm or Thursday 10-11am UK time open for a 30-minute discovery call. Which suits you better?

Thanks,
David`,
      jobBrief: 'Need an AWS architect to design a multi-region e-commerce platform handling 50K concurrent users with PCI-DSS compliance and Aurora Global Database.',
      clientName: 'Sarah',
      level: 'senior',
    },
    expectedRules: [
      // Should be close to clean
    ],
    expectMaxFindings: 4,
  },

  // ════════════════════════════════════════════════════════════════
  // 3. Jargon-heavy consultant-speak
  // ════════════════════════════════════════════════════════════════
  {
    id: 'jargon-heavy',
    name: 'Jargon-heavy consultant-speak',
    input: {
      proposalText: `Dear Sarah,

I would like to leverage my paradigm-shifting experience to deliver a holistic, best-of-breed, turnkey solution that drives synergy across your mission-critical infrastructure.

My approach is to utilize industry-leading methodologies to identify low-hanging fruit and add value-add through orthogonal thinking. We'll circle back regularly to ensure alignment.

I can definately deliver on this — I have recieved many awards and my work has been seperated from the competition.

Best`,
      jobBrief: 'AWS architect needed for e-commerce platform.',
      clientName: 'Sarah',
      level: 'senior',
    },
    expectedRules: [
      'VOICE-JARGON-001',
      'VOICE-TYPO-COMMON-001',  // definately, recieved, seperated
      'PROP-NUMBERS-001',
      'PROP-CTA-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 4. No pricing, no timeline, no payment terms
  // ════════════════════════════════════════════════════════════════
  {
    id: 'no-pricing',
    name: 'No pricing, no timeline, no payment terms',
    input: {
      proposalText: `Hi Sarah,

I noticed your e-commerce project and wanted to share my thoughts. You're tackling PCI-DSS scope plus multi-region failover — both tricky on their own, harder together.

My approach would be Aurora Global Database between eu-west-2 and eu-west-1, with PCI cardholder data in a segregated account. KMS customer-managed keys. CloudTrail to a dedicated audit account.

I have AWS Solutions Architect — Associate certification and have shipped similar PCI-scope work before.

Let's hop on a call. Reply if interested.

Thanks,
David`,
      jobBrief: 'Need an AWS architect to design a multi-region e-commerce platform handling 50K concurrent users with PCI-DSS compliance.',
      clientName: 'Sarah',
      level: 'intermediate',
    },
    expectedRules: [
      'PROP-PRICE-MISSING-001',
      'PROP-TIMELINE-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 5. Sentences too long, passive voice
  // ════════════════════════════════════════════════════════════════
  {
    id: 'long-sentences',
    name: 'Long sentences + passive voice',
    input: {
      proposalText: `Hi Sarah,

The proposal that I am submitting to you today represents the culmination of many years of experience in cloud architecture and the implementation of robust, scalable systems that have been deployed across many different regions and that have been tested and validated by various security audits including PCI-DSS and SOC 2 reviews, and the work that was performed by my team during these engagements has been recognized as best-in-class by multiple independent auditors and consultants who have reviewed our deliverables.

The solution that will be built for you will be deployed in multiple AWS regions and will be configured to meet all of your compliance requirements and the system was designed with scalability in mind from the very beginning and the data was structured to ensure that performance was maintained at all times.

I look forward to hearing back.`,
      jobBrief: 'Need an AWS architect to design a multi-region e-commerce platform.',
      clientName: 'Sarah',
      level: 'senior',
    },
    expectedRules: [
      'VOICE-SENTENCE-LONG-001',
      'VOICE-PASSIVE-001',
      'PROP-CTA-001',
    ],
  },
];
