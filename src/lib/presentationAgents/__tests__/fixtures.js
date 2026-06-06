export const PRESENTATION_SCENARIOS = [
  // 1. Bare minimum / broken deck
  {
    id: 'broken-deck',
    name: 'Broken deck — 3 slides, no structure',
    input: {
      slides: [
        { title: 'Slide 1', body: '', bullets: [] },
        { title: 'Our awesome approach to your project that we are very excited to deliver to you over the next many months ahead with great enthusiasm and care', body: 'Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet.', bullets: [] },
        { title: 'Thanks', body: '', bullets: [] },
      ],
      audience: 'client',
    },
    expectedRules: [
      'PRES-SLIDE-COUNT-LOW-001',
      'PRES-NO-TITLE-001',
      'PRES-NO-PROBLEM-001',
      'PRES-NO-PRICING-001',
      'PRES-DENSE-001',
      'PRES-TITLE-LONG-001',
      'PRES-EMPTY-SLIDE-001',
    ],
  },

  // 2. Solid 10-slide client pitch
  {
    id: 'solid-pitch',
    name: 'Solid 10-slide client pitch',
    input: {
      slides: [
        { title: 'Acme Cloud Migration', body: 'Proposal for Sarah Smith, CTO. Prepared June 2026.', bullets: [], notes: 'Open with handshake, thank them for the time.' },
        { title: 'The Challenge', body: 'Acme is scaling fast but hitting hard ceilings on the legacy AWS account.', bullets: ['50K concurrent users at peak', 'PCI scope creep into every service', 'Cost spiraling 30% YoY'], notes: 'Pause here — let them feel the pain.' },
        { title: 'Our Approach', body: 'Three-phase plan to land Acme on a clean, multi-region, PCI-segmented platform.', bullets: ['Phase 1: Discovery + scope segmentation', 'Phase 2: Aurora Global + Fargate rebuild', 'Phase 3: Harden + handover'], notes: 'Walk through phases.' },
        { title: 'Why us', body: 'AWS Certified Solutions Architect — Associate. 5 years on production AWS. Last quarter delivered a $14k→$8k cost cut for a similar SaaS.', bullets: [], notes: 'Drop the case study reference.' },
        { title: 'Investment', body: '$14,500 fixed price for the 6-week engagement.', bullets: ['50% on signing', '25% at midpoint review', '25% on handover'], notes: 'Sit with the number — don\'t fill the silence.' },
        { title: 'Timeline', body: '6 weeks end to end.', bullets: ['Weeks 1: Discovery', 'Weeks 2-4: Build', 'Weeks 5-6: Hardening + Handover'], notes: 'Show milestone graphic.' },
        { title: 'Risks & Mitigations', body: 'Three known risk areas with concrete mitigations.', bullets: ['Cardholder data migration → tested in staging first', 'DNS cutover → CloudFront with 5-second TTL', 'Team onboarding → 2-hour handover call'], notes: 'Demonstrate seniority.' },
        { title: 'Deliverables', body: 'What you receive at handover.', bullets: ['Terraform repo (open-sourced internally)', 'Runbook PDF', 'Architecture diagram', '2-hour handover call', '30 days post-handover support'], notes: 'List deliverables.' },
        { title: 'Q&A', body: 'Quick clarifications before we move to next steps.', bullets: [], notes: '5 minutes of Q&A.' },
        { title: 'Next Steps', body: 'Let\'s book the discovery call.', bullets: ['Sign + 50% deposit by Friday', 'Discovery call Monday', 'Kickoff Wednesday'], notes: 'End with the ask.' },
      ],
      audience: 'client',
    },
    expectedRules: [],
    expectMaxFindings: 3,
  },
];
