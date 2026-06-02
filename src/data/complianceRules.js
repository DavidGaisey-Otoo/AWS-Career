/**
 * complianceRules.js — compliance keyword → required services + guidance.
 *
 * The Master Intelligence engine uses this to:
 *   • Auto-detect compliance frameworks in any input
 *   • Add the services that compliance requires (NEVER substitute existing)
 *   • Show critical considerations the user must address
 *   • Tag the resulting analysis with `compliance: [...]` for UI display
 */

export const COMPLIANCE_RULES = [
  {
    id: 'pci-dss',
    label: 'PCI-DSS',
    test: /\b(pci[\s-]?dss|pci|payment\s+card|credit\s+card|stripe|braintree|adyen)\b/i,
    addServices: ['cloudtrail', 'waf', 'secrets-manager', 'kms', 'guardduty', 'config'],
    considerations: [
      'Never store full PAN/CVV. Tokenise via Stripe / Adyen / Square — keeps you out of PCI scope.',
      'Encrypt data at rest (KMS) AND in transit (TLS 1.2+). No HTTP fallback anywhere.',
      'Enable CloudTrail in ALL regions with multi-region trail + S3 Object Lock for audit retention.',
      'WAF in front of every payment endpoint. Rate-limit /checkout.',
      'GuardDuty + Security Hub for continuous threat detection.',
      'Quarterly external pen-test required for PCI-DSS Level 1.',
      'Network segmentation: payment processing in a dedicated VPC subnet, not the app subnet.',
    ],
  },
  {
    id: 'hipaa',
    label: 'HIPAA',
    test: /\b(hipaa|phi|protected\s+health|business\s+associate|baa|health\s+records?)\b/i,
    addServices: ['cloudtrail', 'kms', 'config', 'guardduty', 'vpc'],
    considerations: [
      'Sign a Business Associate Agreement (BAA) with AWS via AWS Artifact BEFORE storing any PHI.',
      'Use HIPAA-eligible services only — check the AWS HIPAA Eligible Services list.',
      'Encrypt ALL data at rest with customer-managed KMS keys. Auto-rotate annually.',
      'CloudTrail + Config required for HIPAA evidence — retain 6 years.',
      'Segregate PHI into a dedicated AWS account (or at minimum a dedicated VPC).',
      'Patient access flow (HIPAA 164.524) + breach notification runbook required.',
    ],
  },
  {
    id: 'gdpr',
    label: 'GDPR',
    test: /\b(gdpr|eu\s+data|european\s+data|right\s+to\s+erasure|data\s+residency|dpa|data\s+protection)\b/i,
    addServices: ['kms', 'cloudtrail'],
    considerations: [
      'Choose an EU region (eu-west-1 Ireland, eu-central-1 Frankfurt, eu-west-2 London).',
      'Build a "right to erasure" endpoint that genuinely deletes a user\'s data (not soft-delete).',
      'Maintain a Record of Processing Activities (Article 30). Document data flows.',
      'Cookie consent banner with granular opt-in (necessary / analytics / marketing).',
      'DPA (Data Processing Agreement) with every sub-processor (AWS auto-provides theirs).',
      'Breach notification to supervisory authority within 72 hours.',
    ],
  },
  {
    id: 'soc2',
    label: 'SOC 2',
    test: /\b(soc[-\s]?2|soc\s+ii|service\s+organi[sz]ation\s+control|aicpa)\b/i,
    addServices: ['cloudtrail', 'config', 'security-hub', 'guardduty'],
    considerations: [
      'Trust Service Criteria: Security (always) + 1+ of Availability/Confidentiality/Privacy/Processing Integrity.',
      'CloudTrail + Config required — enables auditors to verify control evidence.',
      'Annual Type II report; auditors sample 6-12 months of logs.',
      'Document policies: access control, change management, incident response, vendor management.',
      'Continuous monitoring via Security Hub + GuardDuty.',
    ],
  },
  {
    id: 'iso27001',
    label: 'ISO 27001',
    test: /\b(iso[\s-]?27001|isms|information\s+security\s+management)\b/i,
    addServices: ['cloudtrail', 'config', 'security-hub'],
    considerations: [
      'Establish an Information Security Management System (ISMS).',
      'Annex A controls 4.x → 8.x must each have evidence.',
      'AWS Config rules to detect drift from policy.',
      'Annual surveillance audit; recertification every 3 years.',
      'Risk register + treatment plan maintained continuously.',
    ],
  },
  {
    id: 'fedramp',
    label: 'FedRAMP',
    test: /\b(fedramp|us\s+federal|fed[\s-]?ramp|govcloud|stateramp)\b/i,
    addServices: ['cloudtrail', 'config', 'guardduty'],
    considerations: [
      'US federal data → AWS GovCloud regions (us-gov-east-1 / us-gov-west-1).',
      'Use FedRAMP-authorised services only — check the AWS FedRAMP service boundary.',
      'Continuous monitoring per FedRAMP ConMon requirements.',
    ],
  },
  {
    id: 'ferpa',
    label: 'FERPA',
    test: /\b(ferpa|student\s+record|educational\s+record)\b/i,
    addServices: ['cloudtrail', 'kms'],
    considerations: [
      'FERPA restricts disclosure of student educational records.',
      'Limit access via IAM groups (faculty / registrar / student).',
      'CloudTrail for audit; encrypt records with KMS.',
    ],
  },
];

/**
 * Detect every compliance framework that matches the input.
 * Returns array of { id, label, addServices, considerations }.
 */
export function detectCompliance(text) {
  if (!text || typeof text !== 'string') return [];
  const matched = [];
  for (const rule of COMPLIANCE_RULES) {
    if (rule.test.test(text)) matched.push(rule);
  }
  return matched;
}
