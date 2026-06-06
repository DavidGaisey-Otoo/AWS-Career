/**
 * reliability.js — Site Reliability Engineer.
 */
import { finding } from './framework.js';

export const reliabilityEngineer = {
  id: 'reliability', name: 'Reliability Engineer', emoji: '🔧',
  role: 'Principal SRE', yearsExperience: 20,
  expertiseAreas: ['Multi-AZ + Multi-Region patterns', 'Disaster recovery (RTO/RPO targets)', 'Auto-scaling + circuit breakers', 'Observability: metrics + traces + logs'],
  systemPrompt: 'Senior SRE. Tested every failure mode in production at scale. Focuses on observability + graceful degradation, not just "did we deploy multi-AZ".',

  review(ctx) {
    const out = [];

    // CloudWatch alarms
    if (ctx.isProduction && !ctx.has('cloudwatch') && !/CloudWatch|alarm|metric/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'high',
        title: 'Production workload without CloudWatch alarms',
        body: 'A production system with no alarms = users find your bugs before you do. Even basic alarms (high error rate, CPU > 80%, RDS connections near max) catch problems early.',
        fix: 'Set CloudWatch alarms on: Lambda Errors > 1%, RDS CPUUtilization > 80%, ALB Target5xxCount > 10, DynamoDB ThrottledRequests > 0. SNS topic → your phone/email/Slack.',
        docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html',
        ruleId: 'REL-CW-001',
      }));
    }

    // No DR plan for production
    if (ctx.isProduction && !/disaster recovery|dr|cross[- ]?region|backup region/i.test(ctx.solutionText) &&
        !ctx.matches(/internal tool|dev tool|prototype/i)) {
      out.push(finding({
        severity: 'medium',
        title: 'No disaster recovery strategy explicitly mentioned',
        body: 'AWS has had region-wide outages (us-east-1 Dec 2021 ~7 hours). Decide your RTO/RPO upfront: Backup-and-restore (cheap, RTO hours), Pilot light (medium, RTO ~30 min), Warm standby (more expensive, RTO ~5 min), Multi-region active-active (most expensive, RTO seconds).',
        fix: 'Document your DR tier. For most projects: AWS Backup with cross-region copy is a cost-effective minimum.',
        docs: 'https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html',
        ruleId: 'REL-DR-001',
      }));
    }

    // SQS dead-letter queue missing
    if (ctx.has('sqs') && !/dead[- ]?letter|dlq|deadletter/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'SQS queue without Dead-Letter Queue (DLQ)',
        body: 'Without a DLQ, messages that fail processing get retried forever then disappear silently. Real production data loss happens here.',
        fix: 'Create a DLQ + RedriveAllowPolicy. After 3-5 failed processings, message routes to DLQ for inspection.',
        docs: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html',
        ruleId: 'REL-SQS-DLQ-001',
      }));
    }

    // Lambda no DLQ for async
    if (ctx.has('lambda') && /async|asynchronous|event/i.test(ctx.brief) && !/dlq|dead[- ]?letter|onfailure/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'Lambda async invocations without OnFailure destination',
        body: 'Async-invoked Lambdas (S3 events, EventBridge) that fail twice retry then disappear. Set an OnFailure destination so you can see what failed.',
        fix: 'Add EventInvokeConfig OnFailure: send to SQS DLQ or SNS topic. Use SNS for alerting + SQS for inspection.',
        docs: 'https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html',
        ruleId: 'REL-LAMBDA-OF-001',
      }));
    }

    return out;
  },
};
