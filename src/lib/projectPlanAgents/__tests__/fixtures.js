export const PLAN_SCENARIOS = [
  // 1. Empty plan
  { id: 'empty', name: 'Empty plan', input: { plan: { phases: [] } }, expectedRules: ['PLAN-EMPTY-001'] },

  // 2. No discovery, no handover, no buffer, overlaps
  {
    id: 'naive',
    name: 'Naive build-only plan',
    input: {
      plan: {
        totalDays: 30,
        phases: [
          { name: 'Build', startDay: 0,  endDay: 20, durationDays: 20 },
          { name: 'Build extras', startDay: 15, endDay: 30, durationDays: 15 },
        ],
      },
      services: ['waf', 'kms', 'cloudtrail', 'rds'],
      level: 'senior',
      teamSize: 1,
    },
    expectedRules: [
      'PLAN-NO-DISCOVERY-001',
      'PLAN-NO-HANDOVER-001',
      'PLAN-NO-HARDENING-001',
      'PLAN-NO-BUFFER-001',
      'PLAN-OVERLAP-SOLO-001',
      'PLAN-COMPLIANCE-NO-HARDEN-001',
    ],
  },

  // 3. Solid 6-week plan
  {
    id: 'solid',
    name: 'Solid 6-week phased plan',
    input: {
      plan: {
        totalDays: 30,
        phases: [
          { name: 'Discovery & Planning', startDay: 0,  endDay: 5,  durationDays: 5 },
          { name: 'Build',                startDay: 5,  endDay: 20, durationDays: 15 },
          { name: 'Hardening & QA',       startDay: 20, endDay: 25, durationDays: 5 },
          { name: 'Handover',             startDay: 25, endDay: 28, durationDays: 3 },
        ],
      },
      services: ['waf', 'kms', 'rds'],
      level: 'senior',
      teamSize: 1,
    },
    expectedRules: [],
    expectMaxFindings: 1,
  },
];
