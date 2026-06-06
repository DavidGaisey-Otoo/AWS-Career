/**
 * compliance.js — Compliance Officer (24 years across HIPAA, PCI, GDPR, SOC 2, FedRAMP).
 *
 * AUDIT-02 expansion: 5 rules -> 17 rules.
 * Every rule cites the specific control number / article / requirement.
 */
import { finding } from './framework.js';

// HIPAA-eligible services as of late 2024 (subset most likely used in app stacks).
// Full list at https://aws.amazon.com/compliance/hipaa-eligible-services-reference/
const HIPAA_ELIGIBLE = new Set([
  'ec2', 'rds', 's3', 'lambda', 'dynamodb', 'cloudfront', 'kms', 'vpc',
  'cloudtrail', 'cloudwatch', 'apigateway', 'sqs', 'sns', 'kinesis', 'ecs',
  'eks', 'fargate', 'efs', 'ebs', 'redshift', 'aurora', 'sagemaker', 'glue',
  'athena', 'cognito', 'route53', 'elasticache', 'ses', 'secretsmgr',
  'systems-manager', 'config', 'cloudformation', 'backup', 'macie',
  'inspector', 'guardduty', 'security-hub', 'opensearch', 'wafv2', 'shield',
]);
// Common non-HIPAA-eligible services that trip people up
const HIPAA_NON_ELIGIBLE = new Set([
  'workspaces-secure-browser', 'iot-greengrass-v1', 'chime', 'chime-sdk-cs',
  'simple-workflow', 'mobile-analytics', 'mechanical-turk',
]);

export const complianceOfficer = {
  id: 'compliance', name: 'Compliance Officer', emoji: '📋',
  role: 'Cloud Compliance & Audit Lead', yearsExperience: 24,
  expertiseAreas: ['HIPAA, PCI-DSS, GDPR, SOC 2, ISO 27001, FedRAMP', 'AWS BAA + AWS Artifact', 'Data residency', 'Audit logging + evidence collection'],
  systemPrompt: 'Senior compliance officer with 24 years across regulated industries. Cites specific control numbers and requirements.',

  review(ctx) {
    const out = [];

    // ─── HIPAA ────────────────────────────────────────────────
    if (ctx.compliance.hipaa) {
      out.push(finding({
        severity: 'critical',
        title: 'HIPAA — Business Associate Agreement (BAA) must be signed before PHI hits AWS',
        body: 'AWS will not be a Business Associate without a signed BAA. Without it, every PHI byte in AWS is a HIPAA violation regardless of encryption. Penalties: $100-$50,000 per violation, up to $1.5M per year per provision.',
        fix: 'AWS Artifact → Agreements → Business Associate Addendum → Accept. Free for AWS customers.',
        docs: 'https://aws.amazon.com/compliance/hipaa-compliance/',
        ruleId: 'COMP-HIPAA-BAA-001',
      }));

      out.push(finding({
        severity: 'high',
        title: 'HIPAA — verify every service is on the eligible-services list',
        body: 'Not all AWS services are BAA-covered. Common gotcha: Mechanical Turk, Chime, some IoT services are NOT eligible. List changes.',
        fix: 'Cross-check ALL services against https://aws.amazon.com/compliance/hipaa-eligible-services-reference/. Verify quarterly.',
        docs: 'https://aws.amazon.com/compliance/hipaa-eligible-services-reference/',
        ruleId: 'COMP-HIPAA-SVC-001',
      }));

      // Check actual services list against eligible
      const nonEligible = (ctx.services || []).filter((s) => HIPAA_NON_ELIGIBLE.has(s));
      if (nonEligible.length > 0) {
        out.push(finding({
          severity: 'critical',
          title: `HIPAA — these services in your stack are NOT BAA-eligible: ${nonEligible.join(', ')}`,
          body: 'Using non-eligible services with PHI is automatic non-compliance, no matter how well you secure them.',
          fix: 'Replace with eligible alternatives or remove PHI from that flow entirely.',
          docs: 'https://aws.amazon.com/compliance/hipaa-eligible-services-reference/',
          ruleId: 'COMP-HIPAA-NONELIGIBLE-001',
        }));
      }

      if (!/customer[- ]?managed (key|cmk)|cmk|customer key/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'high',
          title: 'HIPAA — AWS-managed KMS keys are insufficient',
          body: 'HIPAA Security Rule §164.312(a)(2)(iv) "encryption" plus addressable specifications point at customer-controlled key material. Auditors expect customer-managed CMKs (CMKs you can rotate and audit).',
          fix: 'Create customer-managed CMKs with automatic rotation. Use SSE-KMS (not SSE-S3) on all PHI buckets. KMS_DEFAULT_ENCRYPTION on all RDS/EBS volumes.',
          docs: 'https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk',
          ruleId: 'COMP-HIPAA-CMK-001',
        }));
      }
    }

    // ─── PCI-DSS ─────────────────────────────────────────────
    if (ctx.compliance.pci) {
      out.push(finding({
        severity: 'critical',
        title: 'PCI-DSS — review your Customer Responsibility Matrix (CRM) with AWS',
        body: 'AWS is PCI-DSS Level 1 certified but YOU are responsible for in-scope controls. CRM tells you which AWS handles vs which you handle (Req 1-12).',
        fix: 'AWS Artifact → Reports → PCI DSS AWS Customer Responsibility Matrix. Map every requirement to either AWS or your team.',
        docs: 'https://aws.amazon.com/compliance/pci-dss-level-1-faqs/',
        ruleId: 'COMP-PCI-CRM-001',
      }));

      if (!ctx.has('waf') && !ctx.has('wafv2')) {
        out.push(finding({
          severity: 'high',
          title: 'PCI-DSS Req 6.6 — public-facing app needs a WAF',
          body: 'PCI-DSS Requirement 6.6: "For public-facing web applications, address new threats and vulnerabilities... by installing an automated technical solution that detects and prevents web-based attacks (e.g., a WAF)."',
          fix: 'AWS WAFv2 with AWSManagedRulesCommonRuleSet + AWSManagedRulesKnownBadInputsRuleSet + AWSManagedRulesSQLiRuleSet + AWSManagedRulesAdminProtectionRuleSet.',
          docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html',
          ruleId: 'COMP-PCI-WAF-001',
        }));
      }

      out.push(finding({
        severity: 'high',
        title: 'PCI-DSS Req 3.5.2 — encryption keys must be stored separately from data',
        body: 'KMS satisfies this by design (keys in dedicated HSMs). But if you use envelope encryption with data keys cached locally, ensure those caches are secured.',
        fix: 'Use SSE-KMS for all PCI data stores. Use customer-managed CMKs (not AWS-managed) so you control key policy + rotation.',
        docs: 'https://aws.amazon.com/blogs/security/aws-key-management-service-now-offers-fips-140-2-validated-cryptographic-modules-allowing-easier-adoption-of-the-service-for-regulated-workloads/',
        ruleId: 'COMP-PCI-KMS-001',
      }));

      out.push(finding({
        severity: 'medium',
        title: 'PCI-DSS Req 1.3 — reduce CDE scope via network segmentation',
        body: 'Cardholder Data Environment (CDE) should be in dedicated VPC/subnet, not mixed with non-PCI workloads. Smaller CDE = smaller audit scope = cheaper assessments.',
        fix: 'Dedicated VPC for PCI components. Transit Gateway to bridge to non-PCI VPCs with strict security group + NACL rules.',
        docs: 'https://docs.aws.amazon.com/whitepapers/latest/payment-card-industry-data-security-standard-pci-dss-3-2-1-on-aws/network-segmentation.html',
        ruleId: 'COMP-PCI-SEGMENT-001',
      }));
    }

    // ─── GDPR ──────────────────────────────────────────────
    if (ctx.compliance.gdpr) {
      if (ctx.region && !/^(eu-|af-south)/i.test(ctx.region)) {
        out.push(finding({
          severity: 'high',
          title: `GDPR Art 44-49 — data residency: region ${ctx.region} is not EU`,
          body: 'Transferring EU personal data outside EU requires either Adequacy Decision, Standard Contractual Clauses (SCCs), or BCRs. Storing in us-east-1 etc. without these is a violation.',
          fix: 'Use eu-west-1 (Dublin), eu-central-1 (Frankfurt), eu-west-2 (London for UK GDPR), or eu-west-3 (Paris). If non-EU is required, sign AWS SCCs via Artifact.',
          docs: 'https://aws.amazon.com/compliance/gdpr-center/',
          ruleId: 'COMP-GDPR-REGION-001',
        }));
      }

      out.push(finding({
        severity: 'high',
        title: 'GDPR Art 28 — Data Processing Agreement (DPA) needed with AWS',
        body: 'GDPR Article 28 requires a written contract with any processor handling personal data. AWS provides this as the Data Processing Addendum (DPA).',
        fix: 'AWS Artifact → Agreements → AWS GDPR Data Processing Addendum → Accept. Sign with AWS as Processor, you as Controller.',
        docs: 'https://aws.amazon.com/compliance/gdpr-center/',
        ruleId: 'COMP-GDPR-DPA-001',
      }));

      out.push(finding({
        severity: 'medium',
        title: 'GDPR Art 17 — Right to Erasure ("right to be forgotten") needs implementation',
        body: 'Users can request all their personal data deleted. Your data architecture must support this — including in backups, logs, analytics datasets, ML training data.',
        fix: 'Design a "user delete" API that purges across S3 (with versioning lifecycle), DDB (delete + remove from GSI), RDS (UPDATE/DELETE + reset PITR), CloudWatch Logs (filter+anonymize), and any analytics/ML data lake.',
        docs: 'https://gdpr.eu/right-to-be-forgotten/',
        ruleId: 'COMP-GDPR-ERASURE-001',
      }));

      out.push(finding({
        severity: 'medium',
        title: 'GDPR Art 30 — Records of Processing Activities (RoPA) required',
        body: 'Article 30 requires you maintain documentation of: data flows, processing purposes, retention periods, security measures, third-party transfers.',
        fix: 'Document with AWS Config + AWS Audit Manager. Use Macie to discover PII across S3.',
        docs: 'https://aws.amazon.com/audit-manager/',
        ruleId: 'COMP-GDPR-ROPA-001',
      }));
    }

    // ─── SOC 2 ────────────────────────────────────────────
    if (ctx.compliance.soc2) {
      if (!ctx.has('cloudtrail')) {
        out.push(finding({
          severity: 'high',
          title: 'SOC 2 CC7.2 / CC7.3 — CloudTrail required for audit logging',
          body: 'SOC 2 Trust Services Criteria CC7.2 (monitoring) and CC7.3 (evaluating events) require evidence of system activity monitoring. CloudTrail is the foundational evidence auditors expect.',
          fix: 'Multi-region CloudTrail with log file integrity validation + S3 Object Lock for tamper-evidence + CloudWatch Logs integration for real-time alerting.',
          docs: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html',
          ruleId: 'COMP-SOC2-CT-001',
        }));
      }

      out.push(finding({
        severity: 'medium',
        title: 'SOC 2 — implement AWS Audit Manager for control mapping',
        body: 'Audit Manager pre-maps AWS services to SOC 2 controls. Saves 100+ hours of evidence collection per audit cycle.',
        fix: 'AWS Audit Manager → Frameworks → SOC 2 → Create assessment. Auto-collects evidence from CloudTrail, Config, Security Hub.',
        docs: 'https://docs.aws.amazon.com/audit-manager/latest/userguide/what-is.html',
        ruleId: 'COMP-SOC2-AM-001',
      }));
    }

    // ─── Cross-compliance: encryption in transit ─────────
    if (ctx.compliance.any) {
      if (!/tls\s*1\.[23]|TLSv1\.[23]|HTTPS|certificate manager/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'high',
          title: 'Compliance — encryption in transit (TLS 1.2+) not explicitly stated',
          body: 'HIPAA / PCI / SOC 2 / GDPR all require encryption in transit for sensitive data. TLS 1.0 and 1.1 are deprecated. TLS 1.2 minimum, TLS 1.3 preferred.',
          fix: 'ALB/CloudFront SSL policy: ELBSecurityPolicy-TLS13-1-2-2021-06 or newer. ACM-issued certificates. Enforce HTTPS via S3 bucket policy and CloudFront viewer protocol policy.',
          docs: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html',
          ruleId: 'COMP-TLS-001',
        }));
      }
    }

    return out;
  },
};
