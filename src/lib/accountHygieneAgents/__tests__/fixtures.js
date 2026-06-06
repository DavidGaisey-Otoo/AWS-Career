export const ACCT_SCENARIOS = [
  // 1. Worst case — root account with keys, no MFA, nothing enabled
  {
    id: 'disaster',
    name: 'Root account with keys, no MFA, no defenses',
    input: {
      profile: {
        accessKey: 'AKIAEXAMPLEEXAMPLEXX',
        accessKeyCreatedAt: '2023-01-01T00:00:00Z',
        lastUsed: '2024-12-01T00:00:00Z',
        mfaEnabled: false,
        userArn: 'arn:aws:iam::123456789012:root',
      },
      billingAlerts: false,
      services: {
        cloudTrailEnabled: false,
        guardDutyEnabled: false,
        s3BlockPublicAccessEnabled: false,
        defaultVpcInUse: true,
      },
      supportPlan: 'basic',
      freeTierActive: false,
    },
    expectedRules: [
      'ACCT-ROOT-KEYS-001',
      'ACCT-NO-MFA-ROOT-001',
      'ACCT-KEY-AGE-OLD-001',
      'ACCT-KEY-UNUSED-001',
      'ACCT-BILLING-001',
      'ACCT-CLOUDTRAIL-001',
      'ACCT-GUARDDUTY-001',
      'ACCT-S3-PAB-001',
      'ACCT-DEFAULT-VPC-001',
    ],
  },

  // 2. IAM user, MFA, recent keys, basic defenses on
  {
    id: 'good-iam',
    name: 'Solid IAM user setup',
    input: {
      profile: {
        accessKey: 'AKIAEXAMPLEEXAMPLEXX',
        accessKeyCreatedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        lastUsed: new Date(Date.now() - 1 * 86400000).toISOString(),
        mfaEnabled: true,
        userArn: 'arn:aws:iam::123456789012:user/david',
      },
      billingAlerts: { count: 3, lowestThreshold: 50 },
      services: {
        cloudTrailEnabled: true,
        guardDutyEnabled: true,
        s3BlockPublicAccessEnabled: true,
        defaultVpcInUse: false,
        passwordPolicyCompliant: true,
        configEnabled: true,
      },
      supportPlan: 'business',
      freeTierActive: false,
    },
    expectedRules: [],
    expectMaxFindings: 1,
  },

  // 3. No profile linked
  {
    id: 'no-profile',
    name: 'No AWS profile linked',
    input: { profile: {} },
    expectedRules: ['ACCT-NO-PROFILE-001'],
  },
];
