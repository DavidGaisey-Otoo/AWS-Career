/**
 * compliance.js — Compliance Officer.
 */
import { finding } from './framework.js';

export const complianceOfficer = {
  id: 'compliance', name: 'Compliance Officer', emoji: '📋',
  role: 'Cloud Compliance & Audit Lead', yearsExperience: 24,
  expertiseAreas: ['HIPAA, PCI-DSS, GDPR, SOC 2, ISO 27001, FedRAMP', 'AWS BAA + AWS Artifact', 'Audit logging + evidence collection', 'Data residency + cross-border transfer'],
  systemPrompt: 'Senior compliance officer with 24 years across regulated industries. Knows exactly what auditors will ask, which AWS services have BAA coverage, and which regions are required for data residency.',

  review(ctx) {
    const out = [];

    if (ctx.compliance.hipaa) {
      out.push(finding({
        severity: 'critical',
        title: 'HIPAA workload — Business Associate Agreement (BAA) must be signed',
        body: 'AWS will not be a Business Associate without a signed BAA. Without it, you are non-compliant the moment PHI enters AWS — regardless of how well you encrypted it.',
        fix: 'Go to AWS Artifact → Agreements → Business Associate Addendum → Accept. Free for AWS customers. After accepting you must ONLY use HIPAA-eligible services.',
        docs: 'https://aws.amazon.com/compliance/hipaa-compliance/',
        ruleId: 'COMP-HIPAA-BAA-001',
      }));
      out.push(finding({
        severity: 'high',
        title: 'HIPAA: verify every service is on the HIPAA-eligible services list',
        body: 'Not all AWS services are covered under BAA. List changes over time — verify the current eligible-services page before launch.',
        fix: 'Cross-check your services against the HIPAA-eligible services list. If anything is not on the list, find an alternative.',
        docs: 'https://aws.amazon.com/compliance/hipaa-eligible-services-reference/',
        ruleId: 'COMP-HIPAA-SVC-001',
      }));
    }

    if (ctx.compliance.gdpr && ctx.region && !/^(eu-|af-south)/i.test(ctx.region)) {
      out.push(finding({
        severity: 'high',
        title: `GDPR mentioned but region is ${ctx.region} (non-EU)`,
        body: 'GDPR Articles 44-49 govern transfers of EU personal data outside the EU. Storing in us-east-1 etc. without Standard Contractual Clauses + DPA is a compliance gap.',
        fix: 'Use an EU region (eu-west-1, eu-central-1, eu-west-2 for UK GDPR). If you must use non-EU, sign AWS SCCs via Artifact + document legal basis.',
        docs: 'https://aws.amazon.com/compliance/gdpr-center/',
        ruleId: 'COMP-GDPR-REGION-001',
      }));
    }

    if (ctx.compliance.pci && !ctx.has('waf')) {
      out.push(finding({
        severity: 'high',
        title: 'PCI-DSS workload without AWS WAF',
        body: 'PCI-DSS Requirement 6.6 requires a web application firewall for public-facing apps that handle cardholder data. AWS WAF satisfies this when configured with managed rules.',
        fix: 'Add AWS WAF with managed rules: AWSManagedRulesCommonRuleSet + AWSManagedRulesKnownBadInputsRuleSet + AWSManagedRulesSQLiRuleSet.',
        docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-rule-groups-list.html',
        ruleId: 'COMP-PCI-WAF-001',
      }));
    }

    if (ctx.compliance.soc2 && !ctx.has('cloudtrail')) {
      out.push(finding({
        severity: 'high',
        title: 'SOC 2 workload without CloudTrail',
        body: 'SOC 2 CC7.2/CC7.3 require monitoring system activity. CloudTrail is the foundational evidence auditors expect.',
        fix: 'Enable CloudTrail multi-region trail + S3 with object-lock + CloudWatch Logs integration.',
        docs: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html',
        ruleId: 'COMP-SOC2-CT-001',
      }));
    }

    return out;
  },
};
