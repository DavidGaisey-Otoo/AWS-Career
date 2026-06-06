/**
 * database.js — Database Architect domain expert.
 *
 * Persona: 20 years RDBMS + NoSQL + warehouse experience. Built data
 * platforms at fintech + healthtech scale. Has seen every variant of
 * "we put it on a single db.t3.micro RDS instance and it fell over".
 */

import { finding } from './framework.js';

export const databaseArchitect = {
  id: 'database',
  name: 'Database Architect',
  emoji: '🗄️',
  role: 'Senior Data Platform Lead',
  yearsExperience: 20,
  expertiseAreas: [
    'RDS vs Aurora vs DynamoDB selection',
    'Multi-AZ deployment + read replicas',
    'Connection pooling (RDS Proxy)',
    'Data modeling: relational vs single-table DynamoDB',
    'Backups, PITR, cross-region replication',
    'Indexing strategy + query optimization',
  ],
  systemPrompt: `You are a Senior Database Architect with 20+ years across RDBMS, NoSQL, and warehousing.
You optimize for the right engine for the workload: Aurora for OLTP, DynamoDB for predictable single-digit
millisecond access, Redshift for analytics. You catch single-AZ production deploys, missing read replicas
on read-heavy workloads, no PITR backups, and connection-storm patterns. You are strict about evidence —
cite the actual AWS limit (e.g. "DB connection limit is max_connections, default 87 on db.t3.micro").`,

  review(ctx) {
    const out = [];

    // ─── Production single-AZ RDS ────────────────────────────
    if ((ctx.has('rds') || ctx.has('aurora')) && ctx.isProduction) {
      if (!/multi[- ]?az|multiaz|multi_az/i.test(ctx.solutionText) &&
          !/aurora.+(global|cluster)/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'high',
          title: 'Production RDS/Aurora without Multi-AZ — single point of failure',
          body: 'Single-AZ RDS goes offline during routine maintenance windows AND when the AZ has issues. AWS publishes a ~6-hour annual downtime expectation for single-AZ; Multi-AZ is <1 minute failover.',
          fix: 'For RDS: set MultiAZ=true. For Aurora: use an Aurora cluster (standard) which is multi-AZ by default. Aurora Serverless v2 also supports multi-AZ.',
          docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html',
          ruleId: 'DB-AZ-001',
        }));
      }

      // PITR backups
      if (!/backup_retention|backupretention|point[- ]?in[- ]?time/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'medium',
          title: 'No explicit backup retention or PITR configured',
          body: 'Default RDS retention is 7 days (instance-level snapshots). Aurora has continuous PITR built-in but retention should be explicit. For compliance / accidental-delete recovery, 30+ days is common.',
          fix: 'Set backup_retention_period (RDS) or BackupRetentionPeriod (CFN) to 30. Enable copy_tags_to_snapshot. For prod, consider cross-region snapshot copy via AWS Backup.',
          docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html',
          ruleId: 'DB-BACKUP-001',
        }));
      }
    }

    // ─── Right-sizing for serverless ─────────────────────────
    if (ctx.has('dynamodb')) {
      if (ctx.isLowTraffic && /provisioned|read_capacity|write_capacity/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'medium',
          title: 'DynamoDB provisioned capacity for low-traffic workload',
          body: 'For irregular or low-volume workloads, on-demand billing is cheaper because you pay $0 when idle. Provisioned makes sense at consistent >40% utilization.',
          fix: 'Switch to BillingMode=PAY_PER_REQUEST (on-demand). You can flip back to provisioned later when traffic stabilises.',
          docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html',
          ruleId: 'DB-DDB-CAPACITY-001',
        }));
      }
      // PITR for DDB
      if (ctx.isProduction && !/point[- ]?in[- ]?time|pitr|PointInTimeRecovery/i.test(ctx.solutionText)) {
        out.push(finding({
          severity: 'medium',
          title: 'DynamoDB without Point-In-Time Recovery enabled',
          body: 'DynamoDB PITR restores the table to any second within the last 35 days. Without it, recovering from an accidental DeleteItem or bad batch update is hard or impossible.',
          fix: 'Set PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled=true. Cost is ~20% of table storage cost, well worth it.',
          docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html',
          ruleId: 'DB-DDB-PITR-001',
        }));
      }
    }

    // ─── Wrong engine for workload ────────────────────────
    if (ctx.matches(/key[- ]?value|session store|cache|cart|user profile/i) &&
        ctx.has('rds') && !ctx.has('dynamodb')) {
      out.push(finding({
        severity: 'low',
        title: 'Workload pattern matches DynamoDB but RDS selected',
        body: 'Key-value lookups (sessions, carts, user profiles by ID) cost more on RDS at scale and don\'t use relational features. DynamoDB returns single-digit millisecond latency at any scale.',
        fix: 'Consider DynamoDB as the primary store. Use RDS only if the access pattern includes JOINs or complex WHERE clauses.',
        docs: 'https://aws.amazon.com/blogs/database/choosing-the-right-database-aws/',
        ruleId: 'DB-ENGINE-001',
      }));
    }

    // ─── Analytics workload ──────────────────────────────
    if (ctx.matches(/analytics|reporting|dashboard|business intelligence|olap/i) && !ctx.has('redshift') && !ctx.has('athena')) {
      out.push(finding({
        severity: 'medium',
        title: 'Analytics workload mentioned but no Redshift / Athena / Glue',
        body: 'Running analytics queries on OLTP databases (RDS/Aurora) degrades transactional performance and costs more at scale. Athena (serverless, query S3) or Redshift Serverless are designed for this.',
        fix: 'For ad-hoc analytics on S3 data: Athena. For dashboards / scheduled reports: Redshift Serverless. For ETL: Glue or Step Functions + Lambda.',
        docs: 'https://docs.aws.amazon.com/athena/latest/ug/what-is.html',
        ruleId: 'DB-ANALYTICS-001',
      }));
    }

    // ─── Positive findings ───────────────────────────────
    if (ctx.has('rds') && /multi[- ]?az/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'info',
        title: 'RDS Multi-AZ configured — good',
        body: 'Failover happens automatically within ~1 minute on AZ failure or maintenance.',
        ruleId: 'POSITIVE-DB-001',
      }));
    }

    return out;
  },
};
