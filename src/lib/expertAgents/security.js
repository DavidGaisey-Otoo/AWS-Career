/**
 * security.js — Security Architect domain expert.
 *
 * Persona: 22 years AWS + cloud security. Former AWS Solutions
 * Architect for financial services. Specializes in IAM design, KMS
 * encryption strategies, VPC isolation, secrets management, and
 * compliance frameworks (HIPAA, PCI, GDPR, SOC 2).
 *
 * Rule library focuses on common security mistakes that real architects
 * see weekly: IAM wildcards, hard-coded credentials, public S3, missing
 * encryption at rest/in-transit, weak network isolation, secret rotation.
 */

import { finding, REGEX } from './framework.js';

export const securityArchitect = {
  id: 'security',
  name: 'Security Architect',
  emoji: '🛡️',
  role: 'Security & Compliance Lead',
  yearsExperience: 22,
  expertiseAreas: [
    'IAM design (least privilege, role chaining, identity federation)',
    'KMS encryption (at rest, in transit, key rotation policies)',
    'Network isolation (VPC, security groups, NACLs)',
    'Secrets management (Secrets Manager, Parameter Store)',
    'Compliance: HIPAA, PCI-DSS, GDPR, SOC 2, FedRAMP',
    'Incident response + CloudTrail forensics',
  ],
  systemPrompt: `You are a Senior Security Architect with 22+ years of cloud and AWS security experience.
You've led security for financial services and healthcare clients. You catch IAM wildcards,
unencrypted data at rest, public S3 buckets, hard-coded credentials, missing CloudTrail, and
weak network isolation faster than anyone on the team. You are STRICT — every recommendation
cites an AWS Well-Architected Security Pillar control or a specific CVE/breach pattern. You
NEVER speculate. If you don't have evidence, you say "needs verification" not "probably".
Output only actionable findings with severity, fix, and AWS doc URL.`,

  // ════════════════════════════════════════════════════════════════
  // The actual review engine
  // ════════════════════════════════════════════════════════════════
  review(ctx) {
    const out = [];

    // ─── IAM checks ─────────────────────────────────────────────
    if (ctx.solutionText) {
      // Critical: IAM wildcard on both Action AND Resource
      if (/"Action"\s*:\s*"?\*"?[\s\S]{0,200}"Resource"\s*:\s*"?\*"?/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'critical',
          title: 'IAM policy uses Action:"*" AND Resource:"*" — full admin access',
          body: 'An IAM principal with this policy can do anything to anything in the account. This is the #1 cause of catastrophic breaches when credentials leak. Every CloudTrail-recorded major incident I have seen had this pattern.',
          fix: 'Scope Action to the specific services needed (e.g. "s3:GetObject", "lambda:InvokeFunction") and Resource to specific ARNs. Use IAM Access Analyzer to generate a tightened policy from CloudTrail history.',
          docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html',
          ruleId: 'IAM-WILDCARD-001',
        }));
      } else if (/"Action"\s*:\s*"\*"/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'high',
          title: 'IAM policy uses Action:"*" — overly broad permissions',
          body: 'Granting all actions is rarely needed in production. Even if Resource is scoped, this gives unnecessary power if the resource ARN is ever misconfigured.',
          fix: 'Replace "*" with the specific service actions: ["s3:GetObject", "s3:PutObject"] etc.',
          docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html',
          ruleId: 'IAM-WILDCARD-002',
        }));
      }

      // Hard-coded credentials
      if (/\b(AKIA|ASIA)[A-Z0-9]{16}\b/.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'critical',
          title: 'Hard-coded AWS access key detected in solution',
          body: 'An AWS access key appears literally in the generated code/text. If this lands in git, the key is compromised — bots scan public repos within seconds. Past breach patterns: Uber 2016, Imperva 2019, both started here.',
          fix: 'Use IAM roles (for EC2/ECS/Lambda) or AWS Secrets Manager (for secrets). Never put AKIA*/ASIA* strings in code. Rotate the leaked key immediately and check CloudTrail.',
          docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/security-creds.html',
          ruleId: 'IAM-LEAK-001',
        }));
      }
    }

    // ─── S3 public access ───────────────────────────────────────
    if (ctx.has('s3')) {
      const text = ctx.solutionText.toLowerCase();
      const publicHints = /public-?read|public-?write|publicacl|aclpublic/i.test(text)
                        || /block_public_access\s*=\s*false/i.test(text);
      const hasBlockPublic = /blockpublicaccess|block_public_access\s*=\s*true|s3-blockpublic/i.test(text);

      if (publicHints && !ctx.matches(/static (site|website)|public (cdn|asset)/i)) {
        out.push(finding({
          severity: 'critical',
          title: 'S3 bucket configured for public access without static-site context',
          body: 'Public S3 buckets are the leading cause of data leaks (Capital One 2019, Verizon 2017). Unless this is genuinely a public static site or CDN origin, public access is wrong.',
          fix: 'Enable S3 Block Public Access at the account level + per bucket. If you need public reads via CloudFront, use an Origin Access Identity / Origin Access Control, keep the bucket private.',
          docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
          ruleId: 'S3-PUBLIC-001',
        }));
      } else if (!hasBlockPublic && ctx.isProduction) {
        out.push(finding({
          severity: 'medium',
          title: 'S3 bucket production: explicit Block Public Access not stated',
          body: 'For production buckets, Block Public Access should be explicit and enabled at both account and bucket level — defence in depth against accidental public exposure.',
          fix: 'Add aws_s3_bucket_public_access_block resource (Terraform) or PublicAccessBlockConfiguration in CFN with all four blocks=true.',
          docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/configuring-block-public-access-bucket.html',
          ruleId: 'S3-PUBLIC-002',
        }));
      }

      // S3 encryption at rest — fires also when solutionText is empty (planning phase)
      if (ctx.isProduction && !/SSE-?KMS|SSE-?S3|aws:kms|AES256|ServerSideEncryption/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'high',
          title: 'S3 production bucket has no explicit encryption configuration',
          body: 'AWS enables SSE-S3 by default since Jan 2023 but compliance auditors want EXPLICIT KMS/S3 encryption declared in IaC. SOC 2, HIPAA, PCI all require documented encryption-at-rest controls.',
          fix: 'Add explicit server-side encryption with SSE-KMS (uses your CMK, allows audit) or SSE-S3 (AWS-managed). Use a customer-managed KMS key for HIPAA/PCI.',
          docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html',
          ruleId: 'S3-ENCRYPT-001',
        }));
      }
    }

    // ─── Compliance-driven encryption ───────────────────────────
    if (ctx.compliance.hipaa || ctx.compliance.pci) {
      if (!ctx.has('kms')) {
        out.push(finding({
          severity: 'critical',
          title: `${ctx.compliance.hipaa ? 'HIPAA' : 'PCI-DSS'} workload but KMS not in service list`,
          body: `${ctx.compliance.hipaa ? 'HIPAA' : 'PCI-DSS'} requires documented encryption-at-rest using customer-managed keys. AWS-managed keys are insufficient for ${ctx.compliance.hipaa ? 'HIPAA Business Associate Agreement compliance' : 'PCI DSS Requirement 3.5.2 / 3.6'}.`,
          fix: 'Add KMS (key.aws.amazon.com) and create customer-managed CMKs (CMK) with rotation enabled. Use these CMKs for S3, RDS, EBS, Lambda env vars, Secrets Manager.',
          docs: ctx.compliance.hipaa
            ? 'https://docs.aws.amazon.com/whitepapers/latest/architecting-hipaa-security-and-compliance-on-aws/encryption.html'
            : 'https://docs.aws.amazon.com/whitepapers/latest/pci-dss-3-2-1-on-aws/encryption.html',
          ruleId: 'COMPLIANCE-KMS-001',
        }));
      }
      if (!ctx.has('cloudtrail')) {
        out.push(finding({
          severity: 'critical',
          title: `${ctx.compliance.hipaa ? 'HIPAA' : 'PCI-DSS'} workload but CloudTrail not in service list`,
          body: 'Both HIPAA and PCI-DSS require comprehensive audit logging of all API calls. CloudTrail is non-negotiable for these workloads.',
          fix: 'Enable CloudTrail with: multi-region trail, log file validation enabled, S3 bucket with object lock for tamper-resistance, CloudWatch Logs integration for real-time alerting.',
          docs: 'https://docs.aws.amazon.com/awscloudtrail/latest/userguide/best-practices-security.html',
          ruleId: 'COMPLIANCE-CT-001',
        }));
      }
    }

    // ─── Network isolation ────────────────────────────────────
    if (ctx.has('rds') || ctx.has('aurora') || ctx.has('elasticsearch') || ctx.has('opensearch')) {
      if (!ctx.has('vpc')) {
        out.push(finding({
          severity: 'high',
          title: 'Database service in solution but VPC isolation not specified',
          body: 'RDS / Aurora / OpenSearch in a default VPC with public subnets is a frequent breach vector. Databases should ALWAYS be in private subnets with no IGW route, accessed via Lambda or EC2 in the same VPC.',
          fix: 'Place databases in private subnets across 2+ AZs. Security group ingress from app tier only on the DB port. Never set PubliclyAccessible=true except for debug toolchains.',
          docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html',
          ruleId: 'NET-DB-001',
        }));
      }
    }

    // ─── MFA on root ───────────────────────────────────────────
    if (ctx.isProduction && !ctx.metadata?.setupChecklist?.['root-mfa']?.done) {
      out.push(finding({
        severity: 'critical',
        title: 'Production workload but Root MFA not confirmed in AC-01 checklist',
        body: 'A stolen root password with no MFA = full account takeover. AWS support cannot quickly recover. This is the single highest-leverage protection.',
        fix: 'Complete the Root MFA item in AWS Account Manager → Setup Documentation BEFORE deploying production. Use a hardware key (YubiKey) for root if budget allows.',
        docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
        ruleId: 'AUTH-ROOT-MFA-001',
      }));
    }

    // ─── API Gateway exposed without auth ────────────────────
    if (ctx.has('apigateway') && !ctx.has('cognito') && !ctx.has('iam') &&
        !/api[ _-]?key|auth0|usage[ _-]?plan|cognito|iam_auth/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'high',
        title: 'API Gateway with no authentication/authorization layer mentioned',
        body: 'An unauthenticated public API gets brute-forced or DoS-attacked within hours. Even read-only APIs need rate limiting via usage plans.',
        fix: 'Add either: (1) Cognito user pool authorizer, (2) IAM authorization, (3) Lambda authorizer, or (4) API keys + usage plan with throttling. Even API keys are better than open.',
        docs: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-to-api.html',
        ruleId: 'API-AUTH-001',
      }));
    }

    // ─── Cognito present but auth flow unclear ────────────
    if (ctx.has('cognito') && (ctx.has('apigateway') || ctx.has('alb')) &&
        !/authorizer|user pool|jwt|oauth|oidc/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Cognito present but authorization flow not specified for API/ALB',
        body: 'Adding Cognito to a service list doesn\'t auto-protect endpoints. You need an explicit authorizer (Cognito User Pool authorizer on API Gateway, OIDC integration on ALB) to actually enforce auth.',
        fix: 'API Gateway: add Cognito User Pool Authorizer to method auth. ALB: configure OIDC authentication action with Cognito as IdP.',
        docs: 'https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html',
        ruleId: 'SEC-API-AUTH-001',
      }));
    }

    // ─── Positive findings (best practices followed) ──────────
    if (ctx.has('kms') && ctx.compliance.any) {
      out.push(finding({
        severity: 'info',
        title: 'KMS included for compliance workload — good',
        body: 'Customer-managed KMS keys are the right call for HIPAA/PCI/GDPR.',
        ruleId: 'POSITIVE-KMS-001',
      }));
    }
    if (ctx.has('cloudtrail') && ctx.isProduction) {
      out.push(finding({
        severity: 'info',
        title: 'CloudTrail in production solution — good',
        body: 'Audit logging is non-negotiable for prod. CloudTrail covered.',
        ruleId: 'POSITIVE-CT-001',
      }));
    }

    return out;
  },
};
