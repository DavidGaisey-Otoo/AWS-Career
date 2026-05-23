/**
 * Complete 10-phase roadmap definition.
 *
 * Each subtask carries a stable, hierarchical id (`p{phase}-t{task}-s{sub}`)
 * so progress persists across data edits as long as the slot stays.
 *
 * Difficulty: 1–5. Priority: 'immediate' | 'soon' | 'later'. Times in minutes.
 */

const t = (id, title, minutes, priority, difficulty, opts = {}) => ({
  id,
  title,
  minutes,
  priority,
  difficulty,
  description: opts.description || '',
  resources: opts.resources || [],
  videoUrl: opts.videoUrl || null,
  subtasks: (opts.subtasks || []).map((s, i) => ({ id: `${id}-s${i + 1}`, title: s })),
});

export const ROADMAP = [
  {
    id: 'p1',
    title: 'Setup & Foundation',
    blurb: 'Stand up the accounts, profiles, and tools you’ll use every day.',
    color: 'orange',
    tasks: [
      t('p1-t1', 'Create AWS Free Tier account', 45, 'immediate', 1, {
        description: 'Sign up for AWS, complete identity verification, and explore the console.',
        resources: [{ label: 'aws.amazon.com/free', url: 'https://aws.amazon.com/free' }],
        subtasks: [
          'Go to aws.amazon.com',
          'Enter payment details (won’t be charged on free tier)',
          'Verify identity',
          'Select support plan — Basic (free)',
          'Explore AWS console for 30 minutes',
        ],
      }),
      t('p1-t2', 'Create GitHub account and set up profile', 60, 'immediate', 1, {
        description: 'Establish your public engineering presence.',
        resources: [{ label: 'github.com', url: 'https://github.com' }],
        subtasks: [
          'Go to github.com and register',
          'Upload professional photo',
          'Write bio mentioning AWS and Networking',
          'Create first repository called aws-projects',
          'Write a README for your profile',
        ],
      }),
      t('p1-t3', 'Create LinkedIn profile', 120, 'immediate', 1, {
        description: 'Your single most important profile for UK hiring.',
        resources: [{ label: 'linkedin.com', url: 'https://linkedin.com' }],
        subtasks: [
          'Register and upload photo',
          'Write headline: AWS Cloud Engineer | Network Administrator',
          'Write About section highlighting skills',
          'Add Cloud Practitioner certification',
          'Connect with 20 AWS professionals',
        ],
      }),
      t('p1-t4', 'Create Upwork profile', 120, 'immediate', 2, {
        description: 'Your gateway to global cloud freelance income.',
        resources: [{ label: 'upwork.com', url: 'https://upwork.com' }],
        subtasks: [
          'Register at upwork.com',
          'Write title and overview',
          'Add skills — AWS, Cloud Computing, Networking',
          'Set hourly rate at $12–15 to start',
          'Add Cloud Practitioner to certifications',
        ],
      }),
      t('p1-t5', 'Set up development environment', 180, 'immediate', 2, {
        description: 'Your local toolchain for cloud work.',
        resources: [
          { label: 'VS Code', url: 'https://code.visualstudio.com' },
          { label: 'AWS CLI', url: 'https://aws.amazon.com/cli' },
          { label: 'Terraform', url: 'https://www.terraform.io/downloads' },
        ],
        subtasks: [
          'Install VS Code',
          'Install AWS CLI',
          'Install Git',
          'Install Terraform',
          'Install Docker Desktop',
          'Configure AWS CLI with access keys',
          'Test AWS CLI with `aws s3 ls` command',
        ],
      }),
      t('p1-t6', 'Create Hashnode blog account', 60, 'soon', 1, {
        description: 'Start documenting your learning journey publicly.',
        resources: [{ label: 'hashnode.com', url: 'https://hashnode.com' }],
        subtasks: [
          'Register at hashnode.com',
          'Set up blog with professional name',
          'Write first intro post about your AWS journey',
        ],
      }),
    ],
  },
  {
    id: 'p2',
    title: 'Project 1 — S3 Static Website',
    blurb: 'Ship your first cloud project: a globally distributed static site.',
    color: 'blue',
    tasks: [
      t('p2-t1', 'Learn S3 fundamentals', 240, 'immediate', 2, {
        description: 'Master the most-used AWS storage service.',
        subtasks: [
          'Create your first S3 bucket',
          'Configure bucket settings',
          'Enable versioning',
          'Set up lifecycle rules',
          'Practice upload and download files',
          'Configure bucket policies',
        ],
      }),
      t('p2-t2', 'Build static website (HTML + CSS)', 180, 'immediate', 2, {
        subtasks: [
          'Create index.html with professional layout',
          'Add CSS styling',
          'Add contact form (non-functional)',
          'Test locally in browser',
        ],
      }),
      t('p2-t3', 'Deploy website to S3', 120, 'immediate', 2, {
        subtasks: [
          'Enable static website hosting on bucket',
          'Upload all files',
          'Configure public access settings',
          'Test website URL works',
        ],
      }),
      t('p2-t4', 'Add CloudFront distribution', 180, 'immediate', 3, {
        subtasks: [
          'Create CloudFront distribution',
          'Point to S3 origin',
          'Configure cache behavior',
          'Enable HTTPS',
          'Test CloudFront URL',
        ],
      }),
      t('p2-t5', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push all code to GitHub with README',
          'Add architecture diagram to README',
          'Write Hashnode article about the project',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p3',
    title: 'Project 2 — EC2 Web Application',
    blurb: 'Run a real web app on virtual machines with load balancing.',
    color: 'orange',
    tasks: [
      t('p3-t1', 'Learn EC2 fundamentals', 240, 'immediate', 2, {
        subtasks: [
          'Read EC2 instance families overview',
          'Compare general purpose vs compute optimized',
          'Understand AMIs, key pairs, and security groups',
          'Launch a t2.micro instance in default VPC',
          'SSH into the instance from your local machine',
          'Terminate the instance to avoid charges',
        ],
      }),
      t('p3-t2', 'Build a simple web app (Node.js or Python)', 180, 'immediate', 2, {
        subtasks: [
          'Pick stack (Express/Node or Flask/Python)',
          'Build a small homepage + 2 routes',
          'Add a /health endpoint',
          'Test locally on port 3000 / 5000',
          'Push code to GitHub',
        ],
      }),
      t('p3-t3', 'Deploy app to EC2', 240, 'immediate', 3, {
        subtasks: [
          'Launch a new t2.micro with Ubuntu',
          'Create a security group allowing 22 + 80',
          'SSH in and install Node/Python + nginx',
          'Clone repo and run the app behind nginx',
          'Configure app as a systemd service for auto-restart',
          'Visit public IP and confirm app responds',
        ],
      }),
      t('p3-t4', 'Add Application Load Balancer + Auto Scaling Group', 240, 'soon', 4, {
        subtasks: [
          'Create AMI from your working EC2 instance',
          'Define a launch template using the AMI',
          'Create an Auto Scaling Group across 2 AZs',
          'Front the ASG with an Application Load Balancer',
          'Set up target group + health checks',
          'Test scale-out by simulating CPU load',
        ],
      }),
      t('p3-t5', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push IaC / scripts to GitHub with README',
          'Draw architecture diagram (e.g., draw.io)',
          'Write Hashnode article — focus on scaling decisions',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p4',
    title: 'Project 3 — Serverless Lambda App',
    blurb: 'Build a fully serverless CRUD API — no servers to manage.',
    color: 'blue',
    tasks: [
      t('p4-t1', 'Learn Lambda + API Gateway fundamentals', 240, 'immediate', 3, {
        subtasks: [
          'Understand Lambda execution model and limits',
          'Read API Gateway REST vs HTTP API tradeoffs',
          'Write a Hello World Lambda from the console',
          'Invoke it via the AWS CLI',
          'Expose it through API Gateway and test in browser',
        ],
      }),
      t('p4-t2', 'Design a small CRUD API (e.g., todo list)', 120, 'immediate', 2, {
        subtasks: [
          'Define endpoints (GET, POST, PUT, DELETE /items)',
          'Sketch JSON request/response shape',
          'Decide DynamoDB schema (partition key, attributes)',
          'Document API contract in a README',
        ],
      }),
      t('p4-t3', 'Provision DynamoDB table', 60, 'immediate', 2, {
        subtasks: [
          'Create on-demand DynamoDB table',
          'Add a global secondary index',
          'Insert two test items via console',
          'Query with the AWS CLI',
        ],
      }),
      t('p4-t4', 'Implement Lambda handlers + IAM roles', 300, 'immediate', 4, {
        subtasks: [
          'Write 4 Lambda functions (one per endpoint)',
          'Create least-privilege IAM role for DynamoDB access',
          'Wire each function to API Gateway route',
          'Add input validation and structured logging',
          'Test end-to-end via Postman / curl',
        ],
      }),
      t('p4-t5', 'Add auth (Cognito or API key)', 180, 'soon', 4, {
        subtasks: [
          'Create Cognito User Pool',
          'Add app client + hosted UI',
          'Protect API Gateway routes with Cognito authorizer',
          'Test obtaining a token and calling the API',
        ],
      }),
      t('p4-t6', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push code to GitHub with deploy instructions',
          'Draw serverless architecture diagram',
          'Write a Hashnode article on the cost story',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p5',
    title: 'Project 4 — VPC Network Design',
    blurb: 'Design a production-grade VPC — your networking background shines here.',
    color: 'green',
    tasks: [
      t('p5-t1', 'Plan VPC CIDR + subnets', 120, 'immediate', 3, {
        subtasks: [
          'Pick a non-overlapping /16 CIDR for the VPC',
          'Carve 2 public + 2 private subnets across 2 AZs',
          'Reserve a small subnet for future RDS',
          'Document subnet plan in a table',
        ],
      }),
      t('p5-t2', 'Build the VPC from scratch', 240, 'immediate', 4, {
        subtasks: [
          'Create VPC with your CIDR',
          'Create subnets in 2 AZs (public/private)',
          'Attach an Internet Gateway',
          'Create a NAT Gateway in one public subnet',
          'Create + associate route tables',
        ],
      }),
      t('p5-t3', 'Security groups and NACLs', 180, 'immediate', 4, {
        subtasks: [
          'Create SGs for web, app, and database tiers',
          'Apply least-privilege ingress rules',
          'Layer in NACLs for an extra defense ring',
          'Document allowed flows in a diagram',
        ],
      }),
      t('p5-t4', 'Deploy a 3-tier test workload', 240, 'soon', 4, {
        subtasks: [
          'Place an EC2 web tier in the public subnet',
          'Place an app server in the private subnet',
          'Place a DB instance in the private subnet',
          'Confirm web ↔ app ↔ DB connectivity',
          'Verify private tier has no public IP',
        ],
      }),
      t('p5-t5', 'Add VPC Flow Logs + monitoring', 120, 'soon', 3, {
        subtasks: [
          'Enable VPC Flow Logs to CloudWatch',
          'Run sample queries in CloudWatch Logs Insights',
          'Set an alarm on REJECT spikes',
        ],
      }),
      t('p5-t6', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push diagrams + Terraform/CDK to GitHub',
          'Write a networking-focused Hashnode article',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p6',
    title: 'Project 5 — CI/CD Pipeline',
    blurb: 'Automate deploys with a real pipeline — never deploy by hand again.',
    color: 'orange',
    tasks: [
      t('p6-t1', 'Pick a pipeline stack (GitHub Actions or CodePipeline)', 60, 'immediate', 2, {
        subtasks: [
          'Compare GitHub Actions vs AWS CodePipeline',
          'Pick a stack and document the reason',
          'Sketch the pipeline stages on paper',
        ],
      }),
      t('p6-t2', 'Add automated build + tests', 180, 'immediate', 3, {
        subtasks: [
          'Add a build step (npm/pip install + compile)',
          'Add a unit test step that fails the build on red',
          'Cache dependencies between runs',
          'Show a status badge in your README',
        ],
      }),
      t('p6-t3', 'Deploy to S3 + CloudFront (frontend)', 180, 'immediate', 3, {
        subtasks: [
          'Add IAM role with deploy permissions',
          'Sync build artifacts to S3 on main branch',
          'Invalidate CloudFront cache after deploy',
          'Verify a live change ships end-to-end',
        ],
      }),
      t('p6-t4', 'Deploy to EC2 or Lambda (backend)', 240, 'soon', 4, {
        subtasks: [
          'Package backend artifact (zip or container)',
          'Configure CodeDeploy or scripted SSH deploy',
          'Add a smoke-test job after deploy',
          'Auto-rollback on failed smoke tests',
        ],
      }),
      t('p6-t5', 'Add manual approval before prod', 120, 'soon', 3, {
        subtasks: [
          'Split pipeline into dev and prod stages',
          'Add a required approver for prod',
          'Notify approvers via Slack or email',
        ],
      }),
      t('p6-t6', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push pipeline-as-code to GitHub',
          'Write a Hashnode article on lessons learned',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p7',
    title: 'Project 6 — RDS Database Migration',
    blurb: 'Migrate a sample database to RDS with zero data loss.',
    color: 'blue',
    tasks: [
      t('p7-t1', 'Learn RDS fundamentals', 180, 'immediate', 3, {
        subtasks: [
          'Compare engines (MySQL, Postgres, Aurora)',
          'Read pricing + Free Tier limits',
          'Understand parameter groups + option groups',
          'Plan Multi-AZ vs single-AZ',
        ],
      }),
      t('p7-t2', 'Provision an RDS MySQL instance', 120, 'immediate', 2, {
        subtasks: [
          'Launch RDS in your VPC private subnets',
          'Apply DB security group (allow only app tier)',
          'Set master user + strong password',
          'Test connection from a bastion host',
        ],
      }),
      t('p7-t3', 'Migrate a sample database (DMS or mysqldump)', 240, 'immediate', 4, {
        subtasks: [
          'Pick source dataset (e.g., Sakila or Northwind)',
          'Dump source schema + data',
          'Restore into RDS with `mysql` CLI',
          'Validate row counts match',
          'Run a representative read query',
        ],
      }),
      t('p7-t4', 'Configure backups + maintenance window', 60, 'immediate', 2, {
        subtasks: [
          'Set automated backup retention to 7 days',
          'Set preferred backup + maintenance windows',
          'Take a manual snapshot and tag it',
        ],
      }),
      t('p7-t5', 'Add a read replica + failover test', 180, 'soon', 4, {
        subtasks: [
          'Create a read replica in a different AZ',
          'Point a read-only client at the replica',
          'Trigger a Multi-AZ failover and time recovery',
          'Document RPO/RTO observed',
        ],
      }),
      t('p7-t6', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push migration scripts + runbook to GitHub',
          'Diagram source → target architecture',
          'Write Hashnode article on cutover plan',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p8',
    title: 'Project 7 — CloudWatch Monitoring Dashboard',
    blurb: 'Observability is what separates juniors from seniors.',
    color: 'yellow',
    tasks: [
      t('p8-t1', 'Define what to monitor', 90, 'immediate', 2, {
        subtasks: [
          'List 5 service-level indicators (SLIs)',
          'Pick targets for each (SLOs)',
          'Map each SLI to a CloudWatch metric',
          'Decide alarm severity levels',
        ],
      }),
      t('p8-t2', 'Publish custom metrics', 180, 'immediate', 3, {
        subtasks: [
          'Emit a custom metric from a Lambda',
          'Use embedded metric format (EMF) for cost efficiency',
          'Verify metric appears in CloudWatch',
        ],
      }),
      t('p8-t3', 'Build a CloudWatch dashboard', 180, 'immediate', 3, {
        subtasks: [
          'Create a dashboard JSON with 6+ widgets',
          'Mix line + number + log-insights widgets',
          'Share the dashboard with a teammate read-only',
        ],
      }),
      t('p8-t4', 'Add alarms + SNS notifications', 180, 'immediate', 3, {
        subtasks: [
          'Create an SNS topic + email subscription',
          'Add alarms on error rate + latency',
          'Force a fault and confirm you get paged',
        ],
      }),
      t('p8-t5', 'Add tracing with X-Ray', 180, 'soon', 4, {
        subtasks: [
          'Enable X-Ray on a Lambda or EC2 app',
          'Generate sample traffic',
          'Find a slow segment using the service map',
          'Add an annotation to filter by user id',
        ],
      }),
      t('p8-t6', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push dashboards + alarms JSON to GitHub',
          'Write a Hashnode post on observability pitfalls',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p9',
    title: 'Project 8 — Multi-Region Disaster Recovery',
    blurb: 'Survive a region failure with a real, tested DR plan.',
    color: 'green',
    tasks: [
      t('p9-t1', 'Pick a DR strategy', 90, 'immediate', 3, {
        subtasks: [
          'Compare Backup / Pilot Light / Warm Standby / Multi-Site',
          'Pick a strategy and write the rationale',
          'Define target RPO + RTO',
        ],
      }),
      t('p9-t2', 'Replicate S3 across regions', 120, 'immediate', 3, {
        subtasks: [
          'Enable versioning on source + destination buckets',
          'Configure Cross-Region Replication',
          'Upload a test file and verify replication',
        ],
      }),
      t('p9-t3', 'Stand up RDS cross-region read replica', 180, 'immediate', 4, {
        subtasks: [
          'Create a read replica in a second region',
          'Verify replication lag in CloudWatch',
          'Document the promotion procedure',
        ],
      }),
      t('p9-t4', 'Route 53 failover routing', 180, 'soon', 4, {
        subtasks: [
          'Create primary + secondary health checks',
          'Configure failover routing policy',
          'Simulate primary down + observe failover',
          'Document DNS TTL implications',
        ],
      }),
      t('p9-t5', 'Run a tabletop DR drill', 180, 'soon', 4, {
        subtasks: [
          'Schedule a 60-minute drill with yourself',
          'Walk the runbook step by step',
          'Time each step and capture friction',
          'Improve the runbook based on findings',
        ],
      }),
      t('p9-t6', 'Document and publish project', 120, 'immediate', 2, {
        subtasks: [
          'Push runbook + diagrams to GitHub',
          'Write a Hashnode article on what broke first',
          'Add to Upwork portfolio',
        ],
      }),
    ],
  },
  {
    id: 'p10',
    title: 'Phase 10 — Freelance Launch',
    blurb: 'Convert your portfolio into paid client work.',
    color: 'orange',
    tasks: [
      t('p10-t1', 'Perfect all profiles', 180, 'immediate', 2, {
        subtasks: [
          'Polish LinkedIn headline + About + featured links',
          'Update Upwork title, overview, and rate',
          'Pin top 3 projects on GitHub',
          'Add latest Hashnode article links',
        ],
      }),
      t('p10-t2', 'Apply to first 10 Upwork jobs', 240, 'immediate', 2, {
        subtasks: [
          'Build a reusable proposal template',
          'Filter for AWS + Cloud + Networking jobs',
          'Send 10 tailored proposals this week',
          'Track responses in a small tracker',
        ],
      }),
      t('p10-t3', 'Outreach: LinkedIn connections to potential clients', 180, 'immediate', 2, {
        subtasks: [
          'Identify 20 ideal-client personas',
          'Send personalized connection notes',
          'Follow up with a value-first message',
        ],
      }),
      t('p10-t4', 'Write your first case study', 180, 'immediate', 3, {
        subtasks: [
          'Pick the strongest portfolio project',
          'Structure: problem → solution → impact',
          'Add metrics (cost savings, latency, uptime)',
          'Publish on Hashnode + LinkedIn',
        ],
      }),
      t('p10-t5', 'Set up payment methods (Wise + Payoneer)', 120, 'immediate', 1, {
        resources: [
          { label: 'Wise', url: 'https://wise.com' },
          { label: 'Payoneer', url: 'https://payoneer.com' },
        ],
        subtasks: [
          'Open a Wise account and verify',
          'Open a Payoneer account and verify',
          'Connect to Upwork',
          'Run a small test withdrawal',
        ],
      }),
      t('p10-t6', 'Land + complete your first paid review', 600, 'immediate', 3, {
        subtasks: [
          'Win your first contract',
          'Over-communicate during delivery',
          'Deliver early and ask for feedback',
          'Request a 5-star review',
          'Celebrate. You\'re now a paid cloud freelancer.',
        ],
      }),
    ],
  },
];

// ---------- Derived helpers ----------

export function flattenSubtasks(roadmap = ROADMAP) {
  const out = [];
  for (const phase of roadmap) {
    for (const task of phase.tasks) {
      for (const sub of task.subtasks) {
        out.push({ phaseId: phase.id, taskId: task.id, subtaskId: sub.id });
      }
    }
  }
  return out;
}

export function totalSubtaskCount(roadmap = ROADMAP) {
  return flattenSubtasks(roadmap).length;
}

export function totalTaskCount(roadmap = ROADMAP) {
  return roadmap.reduce((acc, p) => acc + p.tasks.length, 0);
}

export function totalEstimatedMinutes(roadmap = ROADMAP) {
  return roadmap.reduce(
    (acc, p) => acc + p.tasks.reduce((a, t) => a + (t.minutes || 0), 0),
    0
  );
}

export const PRIORITY_META = {
  immediate: { label: 'Immediate', color: 'bg-danger/15 text-danger border-danger/30' },
  soon:      { label: 'Soon',      color: 'bg-warning/15 text-warning border-warning/30' },
  later:     { label: 'Later',     color: 'bg-electric/15 text-electric border-electric/30' },
};

export const DIFFICULTY_LABEL = ['', 'Easy', 'Light', 'Medium', 'Hard', 'Expert'];
