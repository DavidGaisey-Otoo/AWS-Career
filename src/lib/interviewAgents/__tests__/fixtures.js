export const INT_SCENARIOS = [
  // 1. Generic "we did stuff" answer
  {
    id: 'generic-we',
    name: 'Vague we-did-stuff answer',
    input: {
      question: 'Tell me about a time you had to make a difficult technical decision.',
      answer: 'We had a problem and we discussed it as a team. We came up with some ideas and we picked one. Stuff worked out OK basically. Like, you know, it was fine.',
      questionType: 'behavioural',
    },
    expectedRules: [
      'INT-LENGTH-SHORT-001',
      'INT-NO-RESULT-001',
      'INT-NO-NUMBERS-001',
      'INT-WEAK-WORDS-001',
      'INT-WE-VS-I-001',
    ],
  },

  // 2. Strong STAR answer
  {
    id: 'strong-star',
    name: 'Strong STAR answer with numbers',
    input: {
      question: 'Describe a time you migrated a production system.',
      answer: 'In my last role at a fintech startup, we were running our payments engine on a legacy monolith with 50K daily transactions. The CEO wanted to scale to 500K. My task was to architect and lead the migration. I introduced a strangler-fig pattern: I started by extracting the auth service to Lambda, then the ledger to DynamoDB, then payments orchestration to Step Functions. I led 3 engineers through the rollout. The result was we delivered the migration in 14 weeks, cut p95 latency from 800ms to 230ms, and the system has now scaled to 600K daily transactions with zero incidents.',
      questionType: 'behavioural',
    },
    expectedRules: ['INT-CONCRETE-OK-001'],
    expectMaxFindings: 2,
  },

  // 3. Empty answer
  {
    id: 'empty',
    name: 'Empty answer',
    input: { question: 'Why AWS?', answer: '', questionType: 'behavioural' },
    expectedRules: ['INT-EMPTY-001'],
  },
];
