/**
 * Project Plan engine — turns (analysis + client + brief) into a fully
 * editable project plan with phases, tasks, dependencies, milestones,
 * risks, and a payment schedule.
 *
 * Output shape:
 *   {
 *     id, name, clientName, clientCompany,
 *     createdAt, updatedAt,
 *     brief,
 *     startDate, endDate, totalDays, totalHours, totalCost,
 *     currency, hourlyRate,
 *     phases: [
 *       {
 *         id, name, color, dayOffset, durationDays,
 *         tasks: [{ id, title, description, dayOffset, durationDays, hours, dependsOn[], deliverable, status, services[], risks[] }],
 *         milestone: { name, dayOffset, paymentPct, paymentAmount }
 *       }
 *     ],
 *     risks: [{ id, title, mitigation, likelihood, impact }],
 *   }
 */

import { uid } from '../lib/utils.js';

// =====================================================================
// Phase templates by project type
// =====================================================================

const PHASE_TEMPLATES = {
  'Quick Infra Setup': [
    { name: 'Discovery', color: 'orange', pct: 15, tasks: [
      ['Kickoff call + confirm access', 4, 'Confirmed AWS account ID + IAM admin user'],
      ['Lock the architecture diagram', 4, 'One-page diagram signed off by client'],
    ]},
    { name: 'Build', color: 'cyan', pct: 60, tasks: [
      ['Provision networking + IAM baseline', 8, 'VPC + subnets + roles deployed'],
      ['Stand up the workload', 12, 'Service(s) running in client account'],
      ['Wire monitoring + alerts', 4, 'CloudWatch alarms + SNS topic + email subs'],
    ]},
    { name: 'Test & Handover', color: 'emerald', pct: 25, tasks: [
      ['Smoke tests + cost review', 4, 'Test report shared with client'],
      ['Runbook + walkthrough call', 4, 'Runbook delivered + 30-min handover call recorded'],
    ]},
  ],

  'Cloud Migration': [
    { name: 'Discovery & assessment', color: 'orange', pct: 20, tasks: [
      ['Inventory current state (on-prem / source cloud)', 8, 'Itemised inventory + dependency map'],
      ['Workload-by-workload sizing + cost model', 8, 'Sizing spreadsheet + monthly cost forecast'],
      ['Cutover risk assessment + DR plan', 6, 'Risk register signed off'],
    ]},
    { name: 'Foundation', color: 'cyan', pct: 25, tasks: [
      ['AWS accounts + landing zone (Org / Control Tower)', 12, 'Multi-account structure live'],
      ['Networking: VPC + Direct Connect / VPN to source', 10, 'Connectivity tested end-to-end'],
      ['Security baseline (GuardDuty, Config, CloudTrail)', 6, 'Detective + preventive controls on'],
    ]},
    { name: 'Migrate', color: 'violet', pct: 30, tasks: [
      ['Replicate data (DMS / Storage Gateway / Snowball)', 16, 'Data in AWS, sync delta < 5 min'],
      ['Re-platform compute workloads', 24, 'Apps running on AWS in parallel'],
      ['Cutover dress rehearsal', 8, 'Rehearsal report + go/no-go decision'],
    ]},
    { name: 'Cutover & validate', color: 'rose', pct: 15, tasks: [
      ['Production cutover window', 8, 'Traffic on AWS, source decommissioned'],
      ['48-hour hypercare + monitoring', 12, 'Zero P1 incidents'],
    ]},
    { name: 'Optimise & handover', color: 'emerald', pct: 10, tasks: [
      ['Cost optimisation pass (RIs, right-sizing)', 6, '15%+ cost reduction vs initial estimate'],
      ['Runbooks + KT sessions', 8, 'Documentation + 2 recorded training sessions'],
    ]},
  ],

  'Landing Zone / Multi-account': [
    { name: 'Design', color: 'orange', pct: 25, tasks: [
      ['OU structure + account vending strategy', 8, 'OU tree + account-creation flow approved'],
      ['SCP guardrails design', 6, 'List of SCPs with each\'s purpose'],
      ['Identity model (IdP, Identity Center, perms sets)', 6, 'Identity model diagram'],
      ['Centralised logging design', 4, 'Log archive account + retention spec'],
    ]},
    { name: 'Implement core', color: 'cyan', pct: 35, tasks: [
      ['Provision Org + Control Tower / Landing Zone Accelerator', 12, 'Landing zone deployed'],
      ['Wire IAM Identity Center + IdP integration', 10, 'SSO working from corporate IdP'],
      ['Apply SCPs', 6, 'SCPs in force, no false positives'],
      ['Centralised logging + Security Hub', 8, 'Audit logs streaming to log account'],
    ]},
    { name: 'Workload migration', color: 'violet', pct: 25, tasks: [
      ['Migrate workloads to dev / staging accounts', 16, 'Existing workloads in new accounts'],
      ['Validate guardrails + cost allocation', 8, 'Cost tags + Config compliance ≥ 95%'],
    ]},
    { name: 'Handover', color: 'emerald', pct: 15, tasks: [
      ['Account-vending runbook + training', 8, 'Client can create accounts solo'],
      ['Operations playbooks', 8, '6 playbooks delivered'],
    ]},
  ],

  'Network Architecture': [
    { name: 'Design', color: 'orange', pct: 30, tasks: [
      ['IP plan + CIDR allocation', 6, 'No overlapping CIDRs across regions/VPCs'],
      ['Hub-and-spoke (TGW) design', 8, 'TGW + attachments diagram'],
      ['On-prem connectivity design (DX / VPN)', 6, 'Connectivity SLA agreed'],
      ['DNS resolution model', 4, 'Route 53 Resolver in/out endpoints'],
    ]},
    { name: 'Build', color: 'cyan', pct: 45, tasks: [
      ['Deploy Transit Gateway + attachments', 12, 'TGW reachable from all VPCs'],
      ['Configure route tables + propagation', 8, 'Routing matrix validated'],
      ['Deploy Network Firewall / inspection VPC', 10, 'Egress + east/west inspection live'],
      ['Configure Route 53 Resolver', 6, 'Hybrid DNS resolving both directions'],
    ]},
    { name: 'Validate', color: 'violet', pct: 15, tasks: [
      ['End-to-end connectivity testing', 8, 'Test matrix 100% pass'],
      ['Failover testing (DX backup over VPN)', 4, 'Failover tested without packet loss'],
    ]},
    { name: 'Handover', color: 'emerald', pct: 10, tasks: [
      ['Network runbooks + diagrams', 6, 'Set of diagrams + 4 runbooks'],
    ]},
  ],

  'Serverless API': [
    { name: 'Design', color: 'orange', pct: 20, tasks: [
      ['API contract + data model', 6, 'OpenAPI spec signed off'],
      ['Auth flow design (Cognito / JWT)', 4, 'Auth diagram'],
      ['Cost model at expected load', 2, 'Monthly cost forecast'],
    ]},
    { name: 'Build', color: 'cyan', pct: 55, tasks: [
      ['Bootstrap Lambda + API Gateway with IaC', 8, 'Hello-world endpoint live'],
      ['Implement domain endpoints', 24, 'All endpoints with tests'],
      ['Wire auth + authorization', 8, 'JWT validation + IAM auth working'],
      ['Add observability (X-Ray, structured logs)', 4, 'Traces visible in CloudWatch'],
    ]},
    { name: 'Test', color: 'violet', pct: 15, tasks: [
      ['Load testing at 2× target RPS', 6, 'p95 latency < SLA, no throttling'],
      ['Security review (OWASP Top 10)', 4, 'No high-severity findings'],
    ]},
    { name: 'Handover', color: 'emerald', pct: 10, tasks: [
      ['CI/CD pipeline + IaC repo', 6, 'GitHub Actions pipeline green'],
      ['Documentation', 4, 'API reference + ops runbook'],
    ]},
  ],

  'CI/CD Pipeline': [
    { name: 'Discovery', color: 'orange', pct: 15, tasks: [
      ['Inventory existing build/deploy', 4, 'Current pipeline diagram'],
      ['Target environments + branching strategy', 4, 'GitFlow / trunk-based decided'],
    ]},
    { name: 'Build pipeline', color: 'cyan', pct: 55, tasks: [
      ['CodePipeline + CodeBuild project', 8, 'Pipeline triggers on commit'],
      ['Test stages (unit + integration)', 8, 'Coverage gate ≥ 80%'],
      ['Artefact + ECR push', 4, 'Versioned artefacts'],
      ['Deploy stages with approval gate', 8, 'Production deploys require approval'],
      ['Slack/email notifications', 2, 'Build status posts to channel'],
    ]},
    { name: 'Validate', color: 'violet', pct: 20, tasks: [
      ['End-to-end blue/green deploy test', 6, 'Successful blue/green to staging'],
      ['Rollback runbook + dry run', 4, 'Rollback under 5 minutes'],
    ]},
    { name: 'Handover', color: 'emerald', pct: 10, tasks: [
      ['Pipeline-as-code in client repo', 4, 'IaC committed to client GitHub'],
    ]},
  ],

  'Container Workload': [
    { name: 'Design', color: 'orange', pct: 15, tasks: [
      ['ECS vs EKS decision + cluster sizing', 4, 'Decision doc'],
      ['Image strategy + ECR setup', 4, 'ECR repos created'],
    ]},
    { name: 'Build', color: 'cyan', pct: 50, tasks: [
      ['Provision cluster + networking', 12, 'Cluster reachable, nodes healthy'],
      ['Containerise app(s)', 16, 'Images in ECR, locally runnable'],
      ['Deploy with task definitions / manifests', 12, 'App running on cluster'],
      ['Autoscaling + service discovery', 6, 'HPA + service mesh / Cloud Map working'],
    ]},
    { name: 'Harden + observe', color: 'violet', pct: 25, tasks: [
      ['Security: IRSA + secrets', 8, 'No secrets in env vars'],
      ['Observability: CloudWatch + X-Ray', 6, 'Dashboards + traces'],
      ['Load test', 4, 'p95 + throughput targets met'],
    ]},
    { name: 'Handover', color: 'emerald', pct: 10, tasks: [
      ['Day-2 runbook + scaling guide', 6, 'Runbook delivered'],
    ]},
  ],

  // Default fallback for any type not explicitly handled
  default: [
    { name: 'Discovery', color: 'orange', pct: 20, tasks: [
      ['Kickoff call + scope confirmation', 4, 'Signed scope doc'],
      ['Architecture design', 8, 'Architecture diagram approved'],
    ]},
    { name: 'Build', color: 'cyan', pct: 50, tasks: [
      ['Foundation (network + IAM)', 10, 'Foundation deployed'],
      ['Core workload implementation', 20, 'Workload running end-to-end'],
      ['Monitoring + alerts', 6, 'Observability live'],
    ]},
    { name: 'Test', color: 'violet', pct: 20, tasks: [
      ['Functional + load testing', 8, 'Test report'],
      ['Security review', 4, 'Security checklist passed'],
    ]},
    { name: 'Handover', color: 'emerald', pct: 10, tasks: [
      ['Runbook + KT session', 6, 'Documentation + recorded session'],
    ]},
  ],
};

// =====================================================================
// Risk library — auto-attached to plans based on detected signals
// =====================================================================

const RISK_RULES = [
  {
    when: ({ type }) => type === 'Cloud Migration',
    risk: {
      title: 'Hidden dependencies in source environment',
      mitigation: 'Run an automated discovery scan (AWS Migration Hub Discovery / CloudEndure) for 2 weeks before cutover.',
      likelihood: 'High', impact: 'High',
    },
  },
  {
    when: ({ services }) => services.includes('dx'),
    risk: {
      title: 'Direct Connect circuit not yet provisioned',
      mitigation: 'DX provisioning takes 4-12 weeks. Confirm circuit status BEFORE quoting timeline.',
      likelihood: 'Medium', impact: 'High',
    },
  },
  {
    when: ({ services }) => services.some((s) => ['rds', 'aurora'].includes(s)),
    risk: {
      title: 'Database cutover downtime',
      mitigation: 'Use DMS with CDC for near-zero-downtime cutover, or schedule a maintenance window with client approval.',
      likelihood: 'Medium', impact: 'High',
    },
  },
  {
    when: ({ type }) => type === 'Landing Zone / Multi-account',
    risk: {
      title: 'Existing workloads break under new SCPs',
      mitigation: 'Run SCPs in audit-only mode for 2 weeks before enforcement; whitelist exceptions per account.',
      likelihood: 'Medium', impact: 'Medium',
    },
  },
  {
    when: ({ budget }) => budget?.kind === 'fixed' && budget.amount < 500,
    risk: {
      title: 'Scope creep on fixed-price engagement',
      mitigation: 'Lock scope in writing; any addition triggers a change-request + extra invoice. State this in the contract.',
      likelihood: 'High', impact: 'Medium',
    },
  },
  {
    when: ({ services }) => services.includes('eks'),
    risk: {
      title: 'EKS control-plane upgrade required mid-project',
      mitigation: 'Pin EKS version at start; flag any version EOL within engagement timeline.',
      likelihood: 'Low', impact: 'Medium',
    },
  },
  {
    when: () => true, // always
    risk: {
      title: 'Client unavailability blocks decisions',
      mitigation: 'Schedule weekly check-ins; flag any 3-day no-response as a delivery risk.',
      likelihood: 'Medium', impact: 'Medium',
    },
  },
];

// =====================================================================
// Public API
// =====================================================================

/**
 * Build a default project plan from analysis + brief + client.
 *
 * @param {object} args
 *   - analysis    output of analyzeJob() (optional)
 *   - brief       { projectTitle, timelineDays, budget, currency, hourlyRate, startDate }
 *   - client      { name, company }
 */
export function buildPlan({ analysis = null, brief = {}, client = {} } = {}) {
  const type = analysis?.type || 'General AWS Engineering';
  const services = analysis?.services || [];
  const template = PHASE_TEMPLATES[type] || PHASE_TEMPLATES.default;

  const totalDays = +brief.timelineDays || guessDays(analysis?.timeline) || 21;
  const startDate = brief.startDate ? new Date(brief.startDate) : new Date();
  const endDate = addDays(startDate, totalDays);
  const currency = brief.currency || 'USD';
  const hourlyRate = +brief.hourlyRate || (analysis?.budget?.kind === 'hourly' ? (analysis.budget.max || analysis.budget.min) : 85);
  const fixedBudget = brief.budget != null
    ? +brief.budget
    : analysis?.budget?.kind === 'fixed' ? analysis.budget.amount : 0;

  // Spread phases proportionally across totalDays
  let runningOffset = 0;
  const phases = template.map((p) => {
    const durationDays = Math.max(1, Math.round((p.pct / 100) * totalDays));
    const phaseStartOffset = runningOffset;

    // Layout tasks sequentially within the phase
    const taskCount = p.tasks.length;
    const perTaskDays = Math.max(1, Math.floor(durationDays / taskCount));
    let taskOffsetInPhase = 0;
    const tasks = p.tasks.map(([title, hours, deliverable], i) => {
      const taskDuration = i === taskCount - 1
        ? durationDays - taskOffsetInPhase   // last task takes the remainder
        : perTaskDays;
      const t = {
        id: 't-' + uid(),
        title,
        description: '',
        dayOffset: phaseStartOffset + taskOffsetInPhase,
        durationDays: Math.max(1, taskDuration),
        hours,
        dependsOn: [],
        deliverable,
        status: 'pending',
        services: pickServicesFor(title, services),
        risks: [],
      };
      taskOffsetInPhase += taskDuration;
      return t;
    });

    runningOffset += durationDays;

    return {
      id: 'p-' + uid(),
      name: p.name,
      color: p.color,
      dayOffset: phaseStartOffset,
      durationDays,
      tasks,
      milestone: {
        name: `${p.name} sign-off`,
        dayOffset: phaseStartOffset + durationDays,
        paymentPct: Math.round(p.pct),
        // paymentAmount filled in below once totalCost is known
        paymentAmount: 0,
      },
    };
  });

  // Sum hours + compute total cost
  const totalHours = phases.reduce(
    (s, p) => s + p.tasks.reduce((a, t) => a + (+t.hours || 0), 0), 0
  );
  const totalCost = fixedBudget > 0 ? fixedBudget : Math.round(totalHours * hourlyRate);

  // Apportion milestone payments by phase weighting
  for (const p of phases) {
    p.milestone.paymentAmount = Math.round(totalCost * (p.milestone.paymentPct / 100));
  }

  // Auto-attach risks
  const risks = RISK_RULES
    .filter((r) => r.when({ type, services, budget: analysis?.budget }))
    .map((r) => ({ id: 'r-' + uid(), ...r.risk }));

  return {
    id: 'plan-' + uid(),
    name: brief.projectTitle || analysis?.suggestedName || `${type} engagement`,
    clientName: client.name || analysis?.suggestedClient || '',
    clientCompany: client.company || analysis?.suggestedClient || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    brief: { type, services },
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalDays,
    totalHours,
    totalCost,
    currency,
    hourlyRate,
    phases,
    risks,
    notes: '',
  };
}

// ----- Helpers -----

function guessDays(timeline) {
  if (!timeline) return null;
  const t = timeline;
  if (t.kind === 'range' && t.unit?.startsWith('day'))   return Math.round((t.min + t.max) / 2);
  if (t.kind === 'range' && t.unit?.startsWith('week'))  return Math.round((t.min + t.max) / 2) * 7;
  if (t.kind === 'range' && t.unit?.startsWith('month')) return Math.round((t.min + t.max) / 2) * 30;
  if (t.kind === 'fixed' && t.unit?.startsWith('week'))  return t.value * 7;
  if (t.kind === 'fixed' && t.unit?.startsWith('month')) return t.value * 30;
  return null;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function pickServicesFor(title, allServices) {
  const t = title.toLowerCase();
  const match = (kw) => t.includes(kw);
  const out = [];
  if (match('vpc') || match('network')) out.push('vpc');
  if (match('iam') || match('security') || match('scp')) out.push('iam');
  if (match('database') || match('rds') || match('aurora')) out.push('rds');
  if (match('lambda') || match('serverless')) out.push('lambda');
  if (match('ecs') || match('eks') || match('container')) out.push('ecs');
  if (match('monitor') || match('alarm') || match('observ')) out.push('cloudwatch');
  if (match('s3') || match('storage')) out.push('s3');
  if (match('api gateway')) out.push('apigateway');
  if (match('codepipeline') || match('ci/cd') || match('pipeline')) out.push('codepipeline');
  // De-dupe + cap at 3
  return [...new Set(out)].slice(0, 3);
}

/**
 * Convert a plan to printable Markdown.
 */
export function planToMarkdown(plan) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const cur = (n) => `${plan.currency} ${(+n || 0).toLocaleString()}`;
  const addDaysFmt = (offset) => fmt(addDays(plan.startDate, offset));

  let md = `# ${plan.name}\n\n`;
  md += `**Client:** ${plan.clientName || '—'}${plan.clientCompany ? ` · ${plan.clientCompany}` : ''}\n`;
  md += `**Project:** ${plan.brief.type}\n`;
  md += `**Start:** ${fmt(plan.startDate)}\n`;
  md += `**End:** ${fmt(plan.endDate)}\n`;
  md += `**Duration:** ${plan.totalDays} days\n`;
  md += `**Total effort:** ${plan.totalHours} hours\n`;
  md += `**Total cost:** ${cur(plan.totalCost)} (${plan.currency === 'USD' ? '$' : ''}${plan.hourlyRate}/hour effective)\n\n`;
  md += `---\n\n`;

  // Phases
  for (const phase of plan.phases) {
    md += `## ${phase.name}\n`;
    md += `_${addDaysFmt(phase.dayOffset)} → ${addDaysFmt(phase.dayOffset + phase.durationDays)} · ${phase.durationDays} days_\n\n`;
    for (const t of phase.tasks) {
      md += `### ${t.title}\n`;
      md += `- **Effort:** ${t.hours}h\n`;
      md += `- **Window:** ${addDaysFmt(t.dayOffset)} → ${addDaysFmt(t.dayOffset + t.durationDays)}\n`;
      if (t.services.length) md += `- **AWS services:** ${t.services.join(', ')}\n`;
      md += `- **Deliverable:** ${t.deliverable}\n`;
      if (t.description) md += `- **Notes:** ${t.description}\n`;
      md += `\n`;
    }
    if (phase.milestone) {
      md += `> 🏁 **Milestone — ${phase.milestone.name}** · ${addDaysFmt(phase.milestone.dayOffset)} · Payment: ${cur(phase.milestone.paymentAmount)} (${phase.milestone.paymentPct}%)\n\n`;
    }
  }

  // Risks
  if (plan.risks?.length) {
    md += `## Risk register\n\n`;
    md += `| Risk | Likelihood | Impact | Mitigation |\n`;
    md += `|------|-----------|--------|------------|\n`;
    for (const r of plan.risks) {
      md += `| ${r.title} | ${r.likelihood} | ${r.impact} | ${r.mitigation} |\n`;
    }
    md += `\n`;
  }

  if (plan.notes) md += `## Notes\n\n${plan.notes}\n`;
  return md;
}

/**
 * Apply a partial update to a plan; recomputes totals where needed.
 */
export function updatePlan(plan, patch) {
  const next = { ...plan, ...patch, updatedAt: new Date().toISOString() };

  // Recompute totalHours + reapportion payments if phases or rate changed
  if (patch.phases || patch.hourlyRate != null || patch.totalCost != null) {
    next.totalHours = next.phases.reduce(
      (s, p) => s + p.tasks.reduce((a, t) => a + (+t.hours || 0), 0), 0
    );
    if (patch.hourlyRate != null && patch.totalCost == null) {
      next.totalCost = Math.round(next.totalHours * next.hourlyRate);
    }
    for (const p of next.phases) {
      if (p.milestone) {
        p.milestone.paymentAmount = Math.round(next.totalCost * (p.milestone.paymentPct / 100));
      }
    }
  }

  // Recompute endDate if totalDays changed
  if (patch.totalDays != null || patch.startDate != null) {
    const start = patch.startDate ? new Date(patch.startDate) : new Date(next.startDate);
    next.endDate = addDays(start, next.totalDays).toISOString();
  }

  return next;
}
