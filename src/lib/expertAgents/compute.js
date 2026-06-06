/**
 * compute.js — Compute Architect.
 *
 * Persona: 19 years compute platforms. Wrote one of the first ECS
 * production migrations. Knows when Lambda is wrong and when EKS is
 * over-engineered for the workload.
 */

import { finding } from './framework.js';

export const computeArchitect = {
  id: 'compute',
  name: 'Compute Architect',
  emoji: '⚙️',
  role: 'Compute Platform Lead',
  yearsExperience: 19,
  expertiseAreas: [
    'Lambda vs Fargate vs ECS/EC2 selection',
    'Container orchestration: ECS vs EKS trade-offs',
    'Auto Scaling patterns (target tracking, step, scheduled)',
    'Spot instance interruption handling',
    'Cold starts + provisioned concurrency',
    'Step Functions for orchestration',
  ],
  systemPrompt: `You are a Senior Compute Architect. You pick the cheapest service that meets requirements,
not the trendiest. EKS is for teams with Kubernetes expertise OR multi-cloud requirements; ECS is for
AWS-only teams. Lambda hits its 15-minute timeout in real workloads more often than people admit.
You catch wrong compute for the workload pattern.`,

  review(ctx) {
    const out = [];

    // ─── Lambda 15-min timeout ──────────────────────
    if (ctx.has('lambda') && ctx.isLongRunning) {
      out.push(finding({
        severity: 'high',
        title: 'Lambda for long-running workload — 15-minute hard timeout',
        body: 'Lambda max execution is 15 minutes. Video transcoding, batch ETL, ML training, large file processing — all routinely exceed this. The function times out without completing, the queue piles up, errors cascade.',
        fix: 'For long jobs: ECS Fargate (no time limit) or Batch (managed scheduling). For workflows that span steps: Step Functions to chain Lambdas. For video specifically: MediaConvert.',
        docs: 'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html',
        ruleId: 'COMPUTE-LAMBDA-TIMEOUT-001',
      }));
    }

    // ─── EKS for small teams ──────────────────────
    if (ctx.has('eks') && !ctx.matches(/multi[- ]?cloud|kubernetes (experience|team)|helm|kubectl/i) &&
        (ctx.userScale === null || ctx.userScale < 10000)) {
      out.push(finding({
        severity: 'medium',
        title: 'EKS selected without Kubernetes/multi-cloud justification',
        body: 'EKS adds ~$0.10/hr ($72/mo) per cluster JUST for the control plane, plus the management cost of running Kubernetes. For pure-AWS workloads, ECS Fargate gives you most container benefits with no cluster fees and simpler operations.',
        fix: 'If you don\'t specifically need: multi-cloud portability, Kubernetes ecosystem (Helm/Istio/etc.), or have an existing K8s team — use ECS Fargate. Switch later if needs change.',
        docs: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html',
        ruleId: 'COMPUTE-EKS-001',
      }));
    }

    // ─── EC2 without auto-scaling ─────────────────
    if (ctx.has('ec2') && ctx.isProduction && !ctx.matches(/auto[- ]?scaling|asg|autoscalinggroup/i)) {
      out.push(finding({
        severity: 'medium',
        title: 'Production EC2 without Auto Scaling Group',
        body: 'Single EC2 instances in production = one bad health check from total outage. Auto Scaling Groups give you self-healing (replace unhealthy instances), scaling (handle traffic spikes), and rolling deployments.',
        fix: 'Wrap your EC2 in an ASG with min=2 max=N spread across 2+ AZs. Set health check based on ELB target group health. Use launch template for instance config.',
        docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html',
        ruleId: 'COMPUTE-ASG-001',
      }));
    }

    // ─── Fargate for irregular workloads ────────────
    if (ctx.has('ecs') && ctx.isLowTraffic && /ec2|EC2/.test(ctx.solutionText) &&
        !/fargate/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'ECS with EC2 launch type for low-traffic workload',
        body: 'EC2 launch type = you pay for the underlying EC2 hours whether containers run or not. Fargate = pay-per-second for what containers actually use. For irregular/low-traffic, Fargate is usually cheaper.',
        fix: 'Use launch type FARGATE. ECS still orchestrates; AWS manages the underlying compute. No SSH but you rarely need it.',
        docs: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html',
        ruleId: 'COMPUTE-FARGATE-001',
      }));
    }

    return out;
  },
};
