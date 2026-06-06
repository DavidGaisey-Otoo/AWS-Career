/**
 * completeness.js — Handover Completeness expert.
 *
 * Checks that the doc contains the sections a client needs to operate
 * the system after handover.
 */

import { finding } from './framework.js';

export const handoverCompleteness = {
  id: 'completeness',
  name: 'Priya Iyer',
  role: 'Handover Completeness Expert',
  expertiseAreas: ['Handover docs', 'Runbooks', 'On-call readiness', 'Operations'],
  yearsExperience: 17,
  systemPrompt: 'You are a senior SRE who has handed over and received hundreds of AWS systems. Review the doc for completeness against what an on-call engineer needs at 3 AM.',

  review(ctx) {
    const findings = [];
    const { sections, wordCount: words, docType } = ctx;

    const isHandover = docType === 'handover' || docType === 'runbook';

    // DOC-OVERVIEW-001 — no overview / intro
    if (!sections.overview && words >= 100) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-OVERVIEW-001',
        title: 'No overview / introduction section',
        body: 'Doc opens cold without explaining what this is, who it\'s for, what the system does.',
        fix: 'Add a 2-3 sentence "Overview" at the top: what this system does, who uses it, what this doc covers.',
      }));
    }

    // DOC-ARCH-001 — no architecture / diagram reference
    if (!sections.architecture && words >= 15 && isHandover) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DOC-ARCH-001',
        title: 'No architecture / topology section',
        body: 'Anyone reading this can\'t mentally model the system without an architecture section or diagram reference.',
        fix: 'Add an "Architecture" section. Embed your diagram (PNG/SVG export) or list the AWS services + how they connect.',
      }));
    }

    // DOC-PREREQ-001 — no prerequisites
    if (isHandover && !sections.prerequisites && words >= 150) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-PREREQ-001',
        title: 'No prerequisites section',
        body: 'Reader doesn\'t know what tools, accounts, or permissions they need before starting.',
        fix: 'Add "Prerequisites": AWS account + region access, IAM role/user, CLI version, Terraform version, Node version, etc.',
      }));
    }

    // DOC-CREDS-001 — no credentials section in handover
    if (isHandover && !sections.credentials) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DOC-CREDS-001',
        title: 'No credentials / access section',
        body: 'Handover without telling the new owner how to authenticate is unusable.',
        fix: 'Add "Credentials & Access": which IAM role/user to assume, where API keys live (Secrets Manager ARN), how to rotate them, who has access.',
      }));
    }

    // DOC-DEPLOY-001 — no deployment / setup instructions
    if (isHandover && !sections.deployment && words >= 15) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DOC-DEPLOY-001',
        title: 'No deployment / setup section',
        body: 'Reader can\'t reproduce the deployment without step-by-step instructions.',
        fix: 'Add a "Deployment" section with the exact commands: `terraform apply`, `aws cloudformation deploy`, environment variables required, etc.',
      }));
    }

    // DOC-ROLLBACK-001 — no rollback / recovery plan
    if (isHandover && !sections.rollback) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DOC-ROLLBACK-001',
        title: 'No rollback / recovery plan',
        body: 'No instructions for what to do when something breaks — this is the most-needed section at 2 AM.',
        fix: 'Add "Rollback / Recovery": how to roll back the latest deployment, how to restore from backups, RTO/RPO targets.',
      }));
    }

    // DOC-MONITORING-001 — no monitoring section
    if (isHandover && !sections.monitoring) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DOC-MONITORING-001',
        title: 'No monitoring / observability section',
        body: 'Without a "where to look" section, the new owner won\'t know about issues until customers complain.',
        fix: 'Add "Monitoring": CloudWatch dashboard links, key alarms + thresholds, log group names, how to set up alert routing.',
      }));
    }

    // DOC-TROUBLESHOOTING-001 — no known issues / FAQ
    if (isHandover && !sections.troubleshooting && words >= 200) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-TROUBLESHOOTING-001',
        title: 'No troubleshooting / known issues section',
        body: 'Every system has quirks. Documenting them saves the next person hours.',
        fix: 'Add "Known Issues & Troubleshooting": list the 3-5 quirks you discovered and how to handle them.',
      }));
    }

    // DOC-CONTACTS-001 — no contacts / escalation
    if (isHandover && !sections.contacts) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DOC-CONTACTS-001',
        title: 'No contacts / escalation section',
        body: 'When something breaks, the on-call needs to know who to call. Without contacts, the doc is incomplete.',
        fix: 'Add "Contacts": primary owner, backup owner, escalation path, AWS Support plan tier + how to open a case.',
      }));
    }

    // DOC-COSTS-001 — no cost / billing section
    if (isHandover && !sections.costs && words >= 200) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-COSTS-001',
        title: 'No cost / billing section',
        body: 'Client takes ownership without knowing what this costs monthly. They\'ll be surprised by the bill.',
        fix: 'Add "Estimated Costs": monthly baseline, cost drivers, how to set up billing alerts.',
      }));
    }

    // DOC-SECURITY-001 — no security / access control section
    if (isHandover && !sections.security && words >= 200) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-SECURITY-001',
        title: 'No security section',
        body: 'No explicit security posture or access-control documentation.',
        fix: 'Add "Security": encryption (at-rest + in-transit), IAM least-privilege summary, who has admin access, secret rotation policy.',
      }));
    }

    // DOC-COMPLETENESS-INFO-001 — positive: very thorough doc
    const presentCount = Object.values(sections).filter(Boolean).length;
    if (presentCount >= 10) {
      findings.push(finding({
        severity: 'info',
        ruleId: 'DOC-COMPLETENESS-INFO-001',
        title: 'Doc covers all major sections',
        body: `${presentCount} of 12 standard sections present. Strong handover-ready completeness.`,
      }));
    }

    return findings;
  },
};
