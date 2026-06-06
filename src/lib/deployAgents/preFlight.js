/**
 * preFlight.js — Deploy Pre-Flight Auditor
 *
 * Inspects the IaC payload for the dangerous patterns that cause real
 * AWS incidents. Runs BEFORE any execute call.
 *
 * Each finding maps to a real-world incident class:
 *   - DEPLOY-IAM-WILDCARD-001 → 2017 Code Spaces wipe pattern
 *   - DEPLOY-S3-PUBLIC-001    → 2017 Verizon, 2018 Tea, every year since
 *   - DEPLOY-SG-WILDCARD-001  → exposed databases
 *   - DEPLOY-NO-ROLLBACK-001  → failed updates with no escape
 *   - DEPLOY-SECRET-001       → keys in templates → GitHub leaks
 */

import { finding } from './framework.js';

export const deployPreFlightAuditor = {
  id: 'preFlight',
  name: 'Anya Volkov',
  role: 'Deploy Pre-Flight Auditor',
  expertiseAreas: ['IaC review', 'IAM least-privilege', 'Network security', 'Production safety'],
  yearsExperience: 20,
  systemPrompt: 'You are a senior cloud security engineer with 20 years experience reviewing IaC before production deploys. Flag anything that could cause an incident.',

  review(ctx) {
    const findings = [];
    const { template, lowerTemplate, format, lineCount } = ctx;

    if (!template || template.trim().length === 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DEPLOY-EMPTY-001',
        title: 'Empty template',
        body: 'No template content to deploy.',
        fix: 'Generate or paste the IaC before reviewing.',
      }));
      return findings;
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-IAM-WILDCARD-001 — wildcard Action or Resource in IAM
    // ════════════════════════════════════════════════════════════════
    const wildcardActionRx = /"Action"\s*:\s*"\*"|Action:\s*['"]?\*['"]?\s*$|"Action"\s*:\s*\[\s*"\*"\s*\]/m;
    const wildcardResourceRx = /"Resource"\s*:\s*"\*"|Resource:\s*['"]?\*['"]?\s*$|"Resource"\s*:\s*\[\s*"\*"\s*\]/m;
    if (wildcardActionRx.test(template) && wildcardResourceRx.test(template)) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DEPLOY-IAM-WILDCARD-001',
        title: 'IAM policy with wildcard Action AND wildcard Resource',
        body: 'Action="*" + Resource="*" = full account compromise on principal exposure. This is the single most common cause of catastrophic AWS breaches.',
        fix: 'Replace with the minimum-required action ARNs and resource ARNs. Use AWS IAM Access Analyzer to generate least-privilege policies from CloudTrail logs.',
      }));
    } else if (wildcardActionRx.test(template) || wildcardResourceRx.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-IAM-WILDCARD-PARTIAL-001',
        title: 'IAM policy uses wildcard Action or Resource',
        body: 'Partial wildcards expand blast radius. Acceptable for some service-linked roles, but flag for review.',
        fix: 'Narrow to specific actions / resources where possible.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-S3-PUBLIC-001 — S3 bucket with public ACL or no block-public-access
    // ════════════════════════════════════════════════════════════════
    if (/("AccessControl"|AccessControl)\s*[:=]\s*['"]?(PublicRead|PublicReadWrite|public-read)/i.test(template)) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DEPLOY-S3-PUBLIC-001',
        title: 'S3 bucket configured with PublicRead/PublicReadWrite ACL',
        body: 'Public S3 buckets are responsible for many of the largest data breaches in cloud history (Verizon, Accenture, Booz Allen, Tea Mobile, etc.).',
        fix: 'Remove the AccessControl. If public access is genuinely required, use CloudFront in front with OAC/OAI and keep the bucket private.',
      }));
    }
    // Look for missing Block Public Access on S3 buckets in CFN
    if (/AWS::S3::Bucket/i.test(template) && !/PublicAccessBlockConfiguration|BlockPublic(Acls|Policy)/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-S3-NO-PAB-001',
        title: 'S3 bucket missing PublicAccessBlockConfiguration',
        body: 'Production buckets should explicitly block all 4 public-access settings. Default-deny is the only safe posture.',
        fix: 'Add `PublicAccessBlockConfiguration: { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true }`.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-SG-WILDCARD-001 — security group with 0.0.0.0/0 on critical ports
    // ════════════════════════════════════════════════════════════════
    const openIngressRx = /CidrIp\s*[:=]\s*['"]?0\.0\.0\.0\/0|cidr_blocks\s*=\s*\[\s*['"]0\.0\.0\.0\/0['"]/i;
    if (openIngressRx.test(template)) {
      // Check whether the port is a sensitive one — DB/SSH/RDP/etc.
      const sensitivePortRx = /FromPort\s*[:=]\s*['"]?(22|3306|5432|6379|1521|27017|9200|11211|3389|5984|9300)['"]?/;
      if (sensitivePortRx.test(template)) {
        findings.push(finding({
          severity: 'critical',
          ruleId: 'DEPLOY-SG-CRIT-PORT-001',
          title: 'Security group opens a sensitive port to 0.0.0.0/0',
          body: 'Open SSH/DB/Redis/MongoDB/Elasticsearch/RDP to the entire internet. This is a daily mass-scanner target.',
          fix: 'Restrict to a known CIDR (your VPN), use SSM Session Manager for SSH, put databases in private subnets.',
        }));
      } else {
        findings.push(finding({
          severity: 'medium',
          ruleId: 'DEPLOY-SG-WILDCARD-001',
          title: 'Security group has 0.0.0.0/0 ingress',
          body: 'Generally fine for HTTP/HTTPS behind a load balancer, but confirm this is intentional.',
          fix: 'If this is the ALB/CloudFront-facing SG, leave it. Otherwise restrict the CIDR.',
        }));
      }
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-NO-ROLLBACK-001 — CFN with DisableRollback or no UpdatePolicy
    // ════════════════════════════════════════════════════════════════
    if (/DisableRollback\s*[:=]\s*true|"DisableRollback"\s*:\s*true/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-NO-ROLLBACK-001',
        title: 'CloudFormation rollback explicitly disabled',
        body: 'When DisableRollback=true, a partial deploy will leave the stack stuck in UPDATE_FAILED with no automatic cleanup.',
        fix: 'Remove DisableRollback. Use ChangeSets to preview risky changes instead.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-SECRET-001 — hardcoded credentials in the template
    // ════════════════════════════════════════════════════════════════
    const secretPatterns = [
      /AKIA[0-9A-Z]{16}/,                              // AWS access key ID
      /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9/+=]{30,}/i,
      /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,      // private keys
      /\bgh[ps]_[A-Za-z0-9]{30,}/,                     // GitHub PAT
      /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/,           // Stripe key
      /password\s*[:=]\s*['"][^'"$\n]{6,}['"]/i,       // hardcoded passwords
    ];
    const leaked = secretPatterns.filter((rx) => rx.test(template));
    if (leaked.length > 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DEPLOY-SECRET-001',
        title: 'Hardcoded secret detected in template',
        body: 'Template contains what looks like a real AWS key, SSH key, PAT, Stripe key, or password. These get committed to git, then leak.',
        fix: 'Move the secret to AWS Secrets Manager or SSM Parameter Store and reference by ARN. ROTATE the leaked secret immediately.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-DELETION-POLICY-001 — stateful resources without DeletionPolicy: Retain
    // ════════════════════════════════════════════════════════════════
    const statefulRx = /AWS::RDS::DBInstance|AWS::RDS::DBCluster|AWS::S3::Bucket|AWS::DynamoDB::Table|AWS::EFS::FileSystem/;
    if (statefulRx.test(template) && !/DeletionPolicy\s*:\s*Retain/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-DELETION-POLICY-001',
        title: 'Stateful resources without `DeletionPolicy: Retain`',
        body: 'RDS/S3/DynamoDB/EFS without DeletionPolicy: Retain will be DELETED if the stack is deleted. Data loss is irrecoverable.',
        fix: 'Add `DeletionPolicy: Retain` (and `UpdateReplacePolicy: Retain`) to every stateful resource.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-NO-TAGS-001 — production templates without tagging
    // ════════════════════════════════════════════════════════════════
    if (lineCount > 30 && !/Tags\s*[:=]|tags\s*=/i.test(template)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DEPLOY-NO-TAGS-001',
        title: 'No tags on any resource',
        body: 'Untagged resources can\'t be filtered for cost allocation, ownership, or environment. Cost reports become noise.',
        fix: 'Add Tags: Project, Environment, Owner, CostCenter to every resource.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-UNENCRYPTED-001 — common resources lacking encryption
    // ════════════════════════════════════════════════════════════════
    if (/AWS::RDS::DB(Instance|Cluster)/.test(template) && !/StorageEncrypted\s*:\s*true/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-RDS-UNENCRYPTED-001',
        title: 'RDS instance/cluster with StorageEncrypted missing or false',
        body: 'Unencrypted RDS is a compliance failure (HIPAA / PCI / SOC 2). Once a DB is created without encryption, you cannot retroactively enable it.',
        fix: 'Set `StorageEncrypted: true` and (recommended) `KmsKeyId` pointing to a customer-managed CMK.',
      }));
    }
    if (/AWS::EBS::Volume|AWS::EC2::Volume/.test(template) && !/Encrypted\s*:\s*true/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-EBS-UNENCRYPTED-001',
        title: 'EBS volume without Encrypted: true',
        body: 'Snapshot, attach to another instance — data leaks. Modern AWS regions support EBS encryption by default; not enabling it is a regression.',
        fix: 'Add `Encrypted: true` on every EBS volume. Set the regional default in account settings too.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-CLI-DESTRUCTIVE-001 — destructive CLI commands without --dry-run
    // ════════════════════════════════════════════════════════════════
    if (format === 'cli' && /\baws\s+s3\s+rm\b.*--recursive/i.test(template) && !/--dryrun|--dry-run/i.test(template)) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DEPLOY-CLI-DESTRUCTIVE-001',
        title: 'Destructive S3 recursive delete without --dryrun',
        body: '`aws s3 rm --recursive` without --dryrun first will permanently delete every object matching the prefix.',
        fix: 'Run with --dryrun first, review output, then run without --dryrun.',
      }));
    }
    if (format === 'cli' && /\b(terminate-instances|delete-db|delete-cluster|delete-bucket|delete-stack)\b/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-CLI-DELETE-001',
        title: 'Destructive deletion command in CLI bundle',
        body: 'Detected terminate/delete operation. Confirm this is intentional and the resource has a recent backup.',
        fix: 'Snapshot first. Add --no-skip-final-snapshot for RDS. Confirm with the client before running.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-TF-REPLACE-001 — terraform plan output showing destroy/replace
    // ════════════════════════════════════════════════════════════════
    if (format === 'terraform' && /-\s*destroy|#\s*forces replacement|must be replaced/i.test(template)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DEPLOY-TF-REPLACE-001',
        title: 'Terraform plan shows resource destroy / forced replacement',
        body: 'The plan will destroy and recreate resources. For stateful resources (DB, bucket) this means data loss.',
        fix: 'Review every "must be replaced" line. Use `terraform state mv` or `create_before_destroy` where appropriate.',
      }));
    }

    // ════════════════════════════════════════════════════════════════
    // DEPLOY-ROOT-001 — using root account (AWS CLI bundle hint)
    // ════════════════════════════════════════════════════════════════
    if (/\baws sts get-caller-identity\b/i.test(template) === false && /\b(root|account-owner)\b/i.test(lowerTemplate) && format === 'cli') {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DEPLOY-ROOT-HINT-001',
        title: 'CLI bundle references "root" — confirm not using root account',
        body: 'AWS docs explicitly warn against using the root account for daily operations.',
        fix: 'Create an IAM user / role with the minimum permissions and use that instead.',
      }));
    }

    return findings;
  },
};
