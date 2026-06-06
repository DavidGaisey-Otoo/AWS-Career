export const DOC_SCENARIOS = [
  // 1. Empty / placeholder handover
  {
    id: 'empty-handover',
    name: 'Sparse handover — barely written',
    input: {
      docText: `# AWS Project

This project uses AWS. To deploy, click through the console.
TODO: add credentials section.
TODO: add architecture diagram.

The bucket is at https://<account-id>.s3.amazonaws.com/your-bucket`,
      docType: 'handover',
    },
    expectedRules: [
      'DOC-ARCH-001',
      'DOC-CREDS-001',
      // DOC-DEPLOY-001 intentionally not expected — the doc *mentions*
      // "deploy" so the section technically passes detection. Would need
      // a separate "insufficient detail" rule to catch this kind of stub.
      'DOC-ROLLBACK-001',
      'DOC-MONITORING-001',
      'DOC-CONTACTS-001',
      'DOC-CONSOLE-VERSION-001',
      'DOC-URL-PLACEHOLDER-001',
      'DOC-TODO-001',
      'DOC-REGION-MISSING-001',
    ],
  },

  // 2. Has a live secret pasted in — critical
  {
    id: 'secret-leak',
    name: 'Doc contains a live AWS access key',
    input: {
      docText: `# Production deployment

## Architecture
Three Lambda functions writing to S3.

## Credentials
Use this access key:
AKIAIOSFODNN7EXAMPLE

aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

## Deployment
Run terraform apply in eu-west-2.

## Monitoring
CloudWatch dashboard at https://eu-west-2.console.aws.amazon.com/cloudwatch

## Contacts
Owner: dev@example.com
Last updated: 2026-06-06`,
      docType: 'handover',
    },
    expectedRules: [
      'DOC-SECRET-INLINE-001',
    ],
  },

  // 3. Multi-region ambiguity
  {
    id: 'multi-region',
    name: 'Multiple regions without naming primary',
    input: {
      docText: `# Disaster Recovery Runbook

## Architecture
Aurora Global DB between eu-west-1 and eu-west-2.
S3 cross-region replication to us-east-1.

## Deployment
Apply Terraform with the appropriate workspace.

## Rollback
Use Aurora's failover.

## Monitoring
CloudWatch in each region.

## Contacts
Owner: ops team.
Last updated: 2026-06-06.`,
      docType: 'handover',
    },
    expectedRules: [
      'DOC-REGION-AMBIG-001',
      'DOC-CREDS-001',
    ],
  },

  // 4. Comprehensive doc — minor only
  {
    id: 'comprehensive',
    name: 'Comprehensive production handover',
    input: {
      docText: `# E-commerce Platform — Handover Documentation
Last updated: 2026-06-01. Console UI as of June 2026.

## Overview
A multi-region e-commerce platform serving 50K concurrent users.
PCI-DSS Level 2 in scope.

## Architecture
Primary region: eu-west-2 (London). Standby: eu-west-1 (Ireland).
Aurora Global Database, Fargate behind ALB, CloudFront + WAF.
See diagram: architecture-2026-06.png

## Prerequisites
- AWS account access with IAM role MyOrg-Admins
- Terraform 1.6+, Node 20+
- AWS CLI v2

## Credentials
All secrets in Secrets Manager arn:aws:secretsmanager:eu-west-2:123456789012:secret:prod/*
Rotate quarterly per arn:aws:iam::123456789012:policy/secret-rotation.

## Deployment
1. cd terraform/prod
2. terraform init
3. terraform plan -out tfplan
4. terraform apply tfplan

## Rollback
terraform apply -target=aws_ecs_service.web -var image_tag=PREVIOUS_TAG
Aurora point-in-time-restore available for 35 days.

## Monitoring
CloudWatch dashboard: ProdEcom-Main
Alerts route to PagerDuty integration MyOrg-Prod.

## Troubleshooting
- Known issue: cold-start spike on Lambda at 04:00 UTC during backups.
- Workaround: provisioned concurrency keeps 2 warm.

## Contacts
Primary: alice@myorg.com
Backup: bob@myorg.com
Escalation: AWS Enterprise Support case via root account.

## Estimated Costs
Baseline: $14,200/month. Cost drivers: Aurora ($4k), Fargate ($3k), CloudFront ($1.5k).

## Security
TLS 1.2+, KMS customer-managed keys, IAM least-privilege.
Access reviewed monthly.`,
      docType: 'handover',
    },
    expectedRules: [],
    expectMaxFindings: 3,
  },
];
