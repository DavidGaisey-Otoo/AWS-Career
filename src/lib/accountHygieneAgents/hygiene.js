/**
 * hygiene.js — AWS Account Hygiene Auditor.
 *
 * Reviews the configured posture of a linked AWS account against
 * the AWS Foundational Security Best Practices.
 */

import { finding } from './framework.js';

export const accountHygieneAuditor = {
  id: 'hygiene',
  name: 'Yusuf El-Sayed',
  role: 'AWS Account Hygiene Auditor',
  expertiseAreas: ['IAM', 'Account security', 'Cost protection', 'Foundational Security Best Practices'],
  yearsExperience: 19,
  systemPrompt: 'You are a senior AWS security engineer auditing an account against the AWS Foundational Security Best Practices.',

  review(ctx) {
    const findings = [];
    const { profile, keyAgeDays, lastUsedDays, mfaEnabled, isRoot, hasAccessKey, services, billingAlerts, supportPlan } = ctx;

    if (!profile || Object.keys(profile).length === 0) {
      findings.push(finding({
        severity: 'info',
        ruleId: 'ACCT-NO-PROFILE-001',
        title: 'No AWS account linked yet',
        body: 'Connect an AWS profile under AWS Accounts to run hygiene checks.',
        fix: 'Go to /aws-accounts and add credentials.',
      }));
      return findings;
    }

    // ACCT-ROOT-KEYS-001 — root account with API access keys (highest severity)
    if (isRoot && hasAccessKey) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'ACCT-ROOT-KEYS-001',
        title: 'Root account has API access keys',
        body: 'AWS officially recommends NEVER having access keys on the root account. Leaked keys = total account compromise, no recovery.',
        fix: 'Delete the root access keys: IAM → Security credentials → Delete access key. Use an IAM user/role for daily work.',
      }));
    }

    // ACCT-NO-MFA-ROOT-001 — root without MFA (catastrophic)
    if (isRoot && !mfaEnabled) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'ACCT-NO-MFA-ROOT-001',
        title: 'Root account without MFA',
        body: 'Root without MFA is the single most common cause of account takeover. Phishing or password reuse = total loss.',
        fix: 'Enable virtual MFA (or hardware key) on the root account immediately: IAM → Security credentials → Multi-factor authentication.',
      }));
    }

    // ACCT-NO-MFA-USER-001 — non-root IAM user without MFA
    if (!isRoot && !mfaEnabled) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'ACCT-NO-MFA-USER-001',
        title: 'IAM user without MFA',
        body: 'Console + API access without MFA fails AWS Foundational Security Best Practices and most compliance frameworks (PCI, SOC 2, ISO 27001).',
        fix: 'Attach an MFA device to this user. Add an IAM policy that denies all actions when MFA is not present in the session.',
      }));
    }

    // ACCT-KEY-AGE-001 — access keys older than 90 days
    if (hasAccessKey && keyAgeDays != null) {
      if (keyAgeDays > 365) {
        findings.push(finding({
          severity: 'high',
          ruleId: 'ACCT-KEY-AGE-OLD-001',
          title: `Access key is ${keyAgeDays} days old (>1 year)`,
          body: 'Keys this old usually mean the user never thought about rotation. High probability they have leaked somewhere (git, screenshots, logs).',
          fix: 'Rotate immediately: create a second key, deploy it, deactivate the old one for 24 hrs, then delete.',
        }));
      } else if (keyAgeDays > 90) {
        findings.push(finding({
          severity: 'medium',
          ruleId: 'ACCT-KEY-AGE-001',
          title: `Access key is ${keyAgeDays} days old (>90 days)`,
          body: 'AWS recommends rotating access keys every 90 days. Beyond that, the blast radius if leaked grows linearly with age.',
          fix: 'Rotate now. Set a calendar reminder for 80-day rotations.',
        }));
      }
    }

    // ACCT-KEY-UNUSED-001 — key not used in 30+ days (probably abandoned)
    if (hasAccessKey && lastUsedDays != null && lastUsedDays > 30) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'ACCT-KEY-UNUSED-001',
        title: `Access key not used in ${lastUsedDays} days`,
        body: 'Unused keys are the highest-risk: nobody notices when they\'re abused.',
        fix: 'If you don\'t actively need this key, deactivate or delete it.',
      }));
    }

    // ACCT-BILLING-001 — no billing alerts
    if (billingAlerts === false || (billingAlerts && billingAlerts.count === 0)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'ACCT-BILLING-001',
        title: 'No billing alerts configured',
        body: 'Without budget alarms, a runaway resource (forgotten GPU, hot Lambda loop) can rack up $1,000+ before you notice.',
        fix: 'AWS Budgets → Create budget → email yourself at 50%, 80%, 100% of expected monthly spend. Free to set up.',
      }));
    }

    // ACCT-CLOUDTRAIL-001 — no CloudTrail
    if (services.cloudTrailEnabled === false) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'ACCT-CLOUDTRAIL-001',
        title: 'CloudTrail not enabled',
        body: 'Without CloudTrail, you have no audit trail of API calls. If something bad happens, you can\'t investigate. Fails virtually every compliance framework.',
        fix: 'CloudTrail → Create trail → Apply to all regions → Send to a dedicated S3 bucket. Cost: pennies/month.',
      }));
    }

    // ACCT-GUARDDUTY-001 — GuardDuty not enabled
    if (services.guardDutyEnabled === false) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'ACCT-GUARDDUTY-001',
        title: 'GuardDuty not enabled',
        body: 'GuardDuty automatically detects compromised credentials, port scans, anomalous API calls, crypto mining, and other threats.',
        fix: 'GuardDuty → Get started → Enable. ~$2-5/month for small accounts.',
      }));
    }

    // ACCT-S3-PAB-001 — S3 block public access not enabled at account level
    if (services.s3BlockPublicAccessEnabled === false) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'ACCT-S3-PAB-001',
        title: 'S3 Block Public Access not enforced at account level',
        body: 'Without account-level S3 PAB, one bucket misconfiguration = public data leak. This is the #1 cause of cloud breaches.',
        fix: 'S3 → Block Public Access settings for this account → Enable all 4 settings.',
      }));
    }

    // ACCT-DEFAULT-VPC-001 — default VPC still in use
    if (services.defaultVpcInUse === true) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'ACCT-DEFAULT-VPC-001',
        title: 'Default VPC still in use',
        body: 'Default VPCs have IPv4 ranges that overlap with other AWS accounts, no IPv6, and weak default ACLs. Best practice is a clean custom VPC per workload.',
        fix: 'For production: delete the default VPC and use a custom VPC with documented CIDR ranges.',
      }));
    }

    // ACCT-PASSWORD-POLICY-001 — weak password policy
    if (services.passwordPolicyCompliant === false) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'ACCT-PASSWORD-POLICY-001',
        title: 'IAM password policy non-compliant',
        body: 'Weak password policies fail PCI/SOC 2/ISO 27001 audits.',
        fix: 'IAM → Account settings → Password policy: min 14 chars, require uppercase/lowercase/number/symbol, max age 90 days, password reuse prevention 5, no password reset by user.',
      }));
    }

    // ACCT-CONFIG-001 — AWS Config not enabled
    if (services.configEnabled === false) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'ACCT-CONFIG-001',
        title: 'AWS Config not enabled',
        body: 'Without AWS Config, you can\'t track resource changes over time or run compliance rule packs.',
        fix: 'AWS Config → Get started → Enable. ~$2/month for small accounts.',
      }));
    }

    // ACCT-SUPPORT-PLAN-001 — production workloads should be Business+ tier
    if (supportPlan === 'basic' && !ctx.freeTierActive) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'ACCT-SUPPORT-PLAN-001',
        title: 'AWS Support is on Basic tier',
        body: 'Basic support has no API for case creation and no Trusted Advisor full checks. For paid client work, consider Business ($100/mo) for response times + full Trusted Advisor.',
        fix: 'AWS Support → Change support plan → Business or Enterprise as appropriate.',
      }));
    }

    // Positive — fully configured account
    const negativeCount = findings.filter((f) => ['critical', 'high', 'medium'].includes(f.severity)).length;
    if (negativeCount === 0 && profile && hasAccessKey) {
      findings.push(finding({
        severity: 'info',
        ruleId: 'ACCT-CLEAN-001',
        title: 'Account passes foundational hygiene checks',
        body: 'MFA on, fresh keys, billing alarms set, security services enabled.',
      }));
    }

    return findings;
  },
};
