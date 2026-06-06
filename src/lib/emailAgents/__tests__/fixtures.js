/**
 * fixtures.js — realistic email scenarios that should trip the agents.
 *
 * Each scenario lists the ruleIds we EXPECT to fire. If any don't,
 * the corresponding agent has a gap.
 */

export const EMAIL_SCENARIOS = [
  // ════════════════════════════════════════════════════════════════
  // 1. Classic terrible cold email — ALL the spam triggers
  // ════════════════════════════════════════════════════════════════
  {
    id: 'spam-bomb',
    name: 'Spam-bomb cold email (all triggers)',
    input: {
      subject: 'URGENT!!! FREE MONEY OPPORTUNITY!!!',
      body: `Dear Friend,

CONGRATULATIONS!!! You have been selected for an INCREDIBLE DEAL!!! Act now and earn $$$ from home with no investment and no obligation!

Click here: http://bit.ly/abc123 — limited time offer!!!

Don't miss this once in a lifetime chance to make money fast. Risk-free, guaranteed results!

Order today!`,
      recipient: {},
      intent: 'outreach',
      fromName: '',
      hasUnsubscribe: false,
    },
    expectedRules: [
      'EMAIL-ALL-CAPS-001',
      'EMAIL-MULTI-EXCLAIM-001',
      'EMAIL-SPAM-WORDS-001',
      'EMAIL-DOLLAR-001',
      'EMAIL-SHORTENER-001',
      'EMAIL-FROM-NAME-001',
      'EMAIL-PERSONAL-001',
      'EMAIL-HOOK-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 2. Generic "Hi" email — vague subject + no personalization
  // ════════════════════════════════════════════════════════════════
  {
    id: 'generic-hi',
    name: 'Generic cold email, no personalization',
    input: {
      subject: 'Hi',
      body: `I am an AWS consultant. I have 5 years of experience. I have done many projects. I would love to work with you. Please let me know.

Thanks`,
      recipient: { name: 'Sarah' },
      intent: 'outreach',
      fromName: 'David',
      hasUnsubscribe: false,
    },
    expectedRules: [
      'EMAIL-SUBJECT-LENGTH-SHORT-001',
      'EMAIL-SUBJECT-VAGUE-001',
      'EMAIL-PERSONAL-001',
      'EMAIL-FIRST-NAME-001',
      'EMAIL-Q-001',
      'EMAIL-CTA-001',
      'EMAIL-YOU-RATIO-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 3. Wall of text outreach — too long, multiple CTAs
  // ════════════════════════════════════════════════════════════════
  {
    id: 'wall-of-text',
    name: 'Outreach too long, multiple CTAs',
    input: {
      subject: 'Quick question about your AWS infrastructure — I have some thoughts',
      body: `Hi Sarah,

I noticed your company is growing fast and I wanted to reach out. I am an AWS Certified Solutions Architect with 5 years of experience helping companies like yours scale their cloud infrastructure.

I have worked with many clients in your industry and delivered significant cost savings, often in the 30-40% range. I have also helped companies improve their security posture and reduce downtime to less than 0.01%.

My approach typically involves a 4-week discovery phase where I audit your current setup, then a 6-week implementation phase where I refactor anything that is not optimal, then a 4-week handover phase where I document everything and train your team.

I have a portfolio of case studies I can share. I have testimonials from previous clients. I have a free 30-minute discovery call slot available next Tuesday or Wednesday. I can also send you my pricing if you let me know your budget. Are you free for a quick chat? Can we hop on a call? Do you have 15 minutes this week? Would you be open to a brief discussion?

Best regards,
David`,
      recipient: { name: 'Sarah', company: 'Acme' },
      intent: 'outreach',
      fromName: 'David',
      hasUnsubscribe: false,
    },
    expectedRules: [
      'EMAIL-LENGTH-LONG-001',
      'EMAIL-MULTI-CTA-001',
      'EMAIL-YOU-RATIO-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 4. A genuinely well-crafted outreach
  // ════════════════════════════════════════════════════════════════
  {
    id: 'good-outreach',
    name: 'Well-crafted cold outreach',
    input: {
      subject: 'Acme + AWS cost — saw your hiring spike',
      body: `Hi Sarah,

I noticed Acme posted three senior backend roles last week — usually a sign you're scaling fast.

I'm David, AWS Certified Solutions Architect. Last quarter I cut a SaaS client's monthly AWS bill from $14k to $8k without touching their headcount.

Worth a 15-minute call to see if there's room for the same on your stack?

Thanks,
David`,
      recipient: { name: 'Sarah', company: 'Acme' },
      intent: 'outreach',
      fromName: 'David',
      hasUnsubscribe: false,
    },
    expectedRules: [
      // Should be near-clean. The unsubscribe nudge is the only expected hit.
      'EMAIL-UNSUB-001',
    ],
    // Up to 4 minor nudges is OK for a clean email; we just don't want a flood.
    expectMaxFindings: 4,
  },

  // ════════════════════════════════════════════════════════════════
  // 5. Newsletter without unsubscribe — legal failure
  // ════════════════════════════════════════════════════════════════
  {
    id: 'illegal-newsletter',
    name: 'Newsletter missing unsubscribe (illegal)',
    input: {
      subject: 'This month at Acme Cloud',
      body: `Hi all,

This month we shipped 3 new features and onboarded 12 customers.

Highlights:
- Multi-region failover
- New billing dashboard
- Faster sign-up flow

Talk soon`,
      recipient: {},
      intent: 'newsletter',
      fromName: 'Acme Team',
      hasUnsubscribe: false,
    },
    expectedRules: [
      'EMAIL-UNSUB-001',
      'EMAIL-NO-LINKS-IN-NEWSLETTER-001',
    ],
  },

  // ════════════════════════════════════════════════════════════════
  // 6. Empty subject — auto-spam
  // ════════════════════════════════════════════════════════════════
  {
    id: 'empty-subject',
    name: 'Empty subject line',
    input: {
      subject: '',
      body: `Hi Sarah, just wanted to check in. Are you free Tuesday for a quick chat? Best, David`,
      recipient: { name: 'Sarah' },
      intent: 'followup',
      fromName: 'David',
      hasUnsubscribe: false,
    },
    expectedRules: [
      'EMAIL-EMPTY-SUBJ-001',
    ],
  },
];
