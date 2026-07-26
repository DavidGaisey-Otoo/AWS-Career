/**
 * questionBankV2_saaMulti.js — EX-21: multiple-response SAA-C03 questions.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * The real SAA-C03 mixes multiple-choice (1 of 4) with multiple-response
 * (2+ of 5). Before this batch the bank held 704 SAA questions of which
 * exactly TWO were multi-answer, so practice was ~99.7% single-answer
 * against an exam that is not. Candidates lose more marks on the
 * "choose TWO" format than on any other, because partial credit does not
 * exist — 1 of 2 right scores zero.
 *
 * The exam engine already supported this: QuestionRenderer.jsx reads
 * type: 'multi', renders checkboxes, shows a "multi-answer" chip and
 * prints "Select all that apply (n answers)". Only the content was missing.
 *
 * DESIGN RULES FOLLOWED BY EVERY QUESTION HERE
 * ────────────────────────────────────────────
 *  1. Five options, two correct — the dominant real-exam shape.
 *  2. The two correct answers are COMPLEMENTARY, never redundant. If two
 *     options solve the same problem the same way, at most one is right.
 *     This is the single most useful elimination habit to build.
 *  3. At least one distractor is a "right service, wrong feature" trap and
 *     at least one is "right answer to a different question".
 *  4. Every wrong option has its own reason in wrongReasons.
 *  5. Scenarios name a real constraint (latency, cost ceiling, RPO,
 *     compliance regime) so the candidate learns to read for constraints.
 *
 * Distribution matches the published domain weights:
 *   D1 Secure 30% (12) · D2 Resilient 26% (10) · D3 Performance 24% (10)
 *   D4 Cost 20% (8)
 */

const T = {
  STORAGE: 'Storage', COMPUTE: 'Compute', SECURITY: 'Security',
  NETWORKING: 'Networking', DATABASE: 'Database', PRICING: 'Pricing',
  MONITORING: 'Monitoring', INTEGRATION: 'Integration', MIGRATION: 'Migration',
  ANALYTICS: 'Analytics', ML_AI: 'ML/AI', DEVOPS: 'DevOps',
};

/**
 * Multi-answer question factory. Mirrors pq() in the sibling banks but
 * forces type: 'multi' and takes `answers` as an array of indices.
 */
function mq(id, q) {
  if (!Array.isArray(q.answers) || q.answers.length < 2) {
    throw new Error(`${id}: multi-response questions need at least 2 answers`);
  }
  return {
    id,
    certIds: q.certIds || ['saa-c03'],
    domainIds: q.domainIds || ['saa-d2'],
    difficulty: q.difficulty || 'medium',
    service: q.service || [],
    type: 'multi',
    q: q.scenario,
    options: q.options,
    answer: q.answers,          // array — QuestionRenderer handles this
    why: q.why,
    wrongReasons: q.wrongReasons || {},
    docs: q.docs || null,
    level: 'Associate',
    topic: q.topic,
    concept: q.concept,
    learningTopic: q.learningTopic || null,
    lastVerified: '2026-07-26',
  };
}

export const SAA_V2_MULTI = [
  // ════════════════════════════════════════════════════════════════
  // DOMAIN 1 — Design Secure Architectures (30%)
  // ════════════════════════════════════════════════════════════════

  mq('saa-multi-001', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['iam', 'ec2', 's3'],
    scenario: 'An application on EC2 needs to read objects from one specific S3 bucket. The security team requires that no long-lived credentials exist anywhere on the instance, and that access is scoped to that bucket only. The application is written in Python using the AWS SDK. (Choose TWO.)',
    options: [
      'Attach an IAM role to the EC2 instance with a policy allowing s3:GetObject on that bucket ARN only',
      'Add a bucket policy that grants s3:GetObject to the instance role principal',
      'Store an access key and secret key in a file at /home/ec2-user/.aws/credentials',
      'Store the access keys in AWS Secrets Manager and fetch them at application start',
      'Make the bucket public and restrict access by the instance\'s public IP address',
    ],
    answers: [0, 1],
    why: 'An instance profile role delivers temporary, automatically rotated credentials that the SDK picks up with no code or files — satisfying "no long-lived credentials". Pairing it with a bucket policy naming that role gives you defence in depth and satisfies "that bucket only" from both the identity side and the resource side. The two answers are complementary: one controls what the identity may do, the other controls who the resource accepts.',
    wrongReasons: {
      2: 'A credentials file IS a long-lived credential sitting on disk — the exact thing the requirement forbids.',
      3: 'Secrets Manager protects the keys but they are still long-lived IAM user keys. It solves storage, not the requirement.',
      4: 'A public bucket plus IP filtering is not scoped access, breaks the moment the IP changes, and exposes data to anyone who learns the address.',
    },
    concept: 'Instance profile roles for credential-free access; identity policy + resource policy as complementary controls.',
    docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html',
  }),

  mq('saa-multi-002', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['rds', 'kms', 'acm'],
    scenario: 'A healthcare company is deploying an RDS for PostgreSQL database holding patient records. Their auditor requires that data is encrypted both at rest and while moving between the application and the database, and that the company controls the encryption key lifecycle. (Choose TWO.)',
    options: [
      'Enable encryption at rest on the DB instance using a customer-managed KMS key',
      'Require SSL/TLS connections by setting the rds.force_ssl parameter to 1 in the parameter group',
      'Enable Multi-AZ so the standby holds an encrypted copy',
      'Place the database in a private subnet with no route to an internet gateway',
      'Enable automated backups with a 35-day retention period',
    ],
    answers: [0, 1],
    why: 'A customer-managed KMS key encrypts storage, snapshots and read replicas at rest while leaving key policy, rotation and revocation under the company\'s control — that is the "controls the key lifecycle" clause. Setting rds.force_ssl=1 rejects any unencrypted connection, covering data in transit. Together they close both halves of the auditor\'s requirement.',
    wrongReasons: {
      2: 'Multi-AZ is an availability feature. It does not encrypt anything that was not already encrypted.',
      3: 'Network isolation is good practice and limits exposure, but an unencrypted connection inside a private subnet is still unencrypted.',
      4: 'Backup retention is a durability and recovery control, unrelated to encryption.',
    },
    concept: 'Encryption at rest (customer-managed KMS) vs in transit (force_ssl) are separate controls requiring separate actions.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html',
  }),

  mq('saa-multi-003', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['s3', 'iam', 'sts'],
    scenario: 'Account A owns an S3 bucket of analytics exports. An application running in Account B must read those objects. The security team forbids creating IAM users in Account A and forbids making the bucket public. (Choose TWO.)',
    options: [
      'In Account A, create an IAM role with a trust policy allowing the Account B application role to assume it',
      'In Account A, add a bucket policy granting s3:GetObject to the Account B role ARN',
      'In Account B, create an IAM user in Account A and share its access keys securely',
      'Enable S3 Transfer Acceleration on the bucket',
      'Add a bucket ACL granting READ to the AuthenticatedUsers group',
    ],
    answers: [0, 1],
    why: 'Cross-account access has two supported shapes and both appear here: role assumption (Account B assumes a role in Account A via STS, receiving temporary credentials) or a resource policy naming the external principal directly. Either alone works; the exam is testing that you recognise both as legitimate cross-account mechanisms that avoid IAM users entirely.',
    wrongReasons: {
      2: 'Explicitly forbidden by the requirement, and shared long-lived keys are the anti-pattern cross-account roles exist to replace.',
      3: 'Transfer Acceleration is a network throughput feature for long-distance uploads. It grants no permissions.',
      4: 'AuthenticatedUsers means any AWS account in the world, not your Account B — a serious over-grant. ACLs are also discouraged in favour of policies.',
    },
    concept: 'Cross-account access via role assumption or resource-based policy; AuthenticatedUsers is not "my other account".',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-walkthroughs-managing-access-example2.html',
  }),

  mq('saa-multi-004', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['secrets-manager', 'rds', 'lambda'],
    scenario: 'A Lambda function connects to an Aurora MySQL cluster using a database password. Compliance requires the password be rotated every 30 days with no downtime and no code deployment to change it. (Choose TWO.)',
    options: [
      'Store the credential in AWS Secrets Manager and enable automatic rotation on a 30-day schedule',
      'Grant the Lambda execution role secretsmanager:GetSecretValue and retrieve the secret at invocation',
      'Store the password in a Lambda environment variable and update it monthly',
      'Store the password in SSM Parameter Store as a String parameter',
      'Hard-code the password but encrypt the deployment package',
    ],
    answers: [0, 1],
    why: 'Secrets Manager provides native scheduled rotation with built-in Lambda rotation functions for RDS/Aurora, and it coordinates the change with the database so connections are not broken — that is the "no downtime" clause. The function must then be allowed to read the secret at runtime, which is why the IAM grant is the necessary companion answer. Rotation without read permission is useless, and read permission without rotation does not meet the 30-day rule.',
    wrongReasons: {
      2: 'Changing an environment variable requires updating the function configuration — that is a deployment, which the requirement forbids.',
      3: 'A plain String parameter is unencrypted, and Parameter Store has no built-in rotation. SecureString plus custom rotation could work but is not what this option says.',
      4: 'Hard-coding fails rotation entirely; encrypting the package does not stop anyone with function access from reading the value.',
    },
    concept: 'Secrets Manager rotation + runtime retrieval permission are two halves of one solution.',
    docs: 'https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html',
  }),

  mq('saa-multi-005', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['waf', 'shield', 'cloudfront'],
    scenario: 'A public web application behind an Application Load Balancer suffered an outage from a volumetric network flood, and a penetration test also found it vulnerable to SQL injection. The team wants managed AWS protection against both. (Choose TWO.)',
    options: [
      'Associate an AWS WAF web ACL with the ALB using the managed SQL database rule group',
      'Enable AWS Shield Advanced for volumetric DDoS protection with 24/7 response team access',
      'Add a network ACL denying traffic from the attacking IP ranges',
      'Enable GuardDuty to block the malicious traffic automatically',
      'Move the ALB into a private subnet and expose it through a NAT Gateway',
    ],
    answers: [0, 1],
    why: 'These are two different attack classes needing two different tools. WAF operates at layer 7 and its managed SQL database rule group blocks injection patterns. Shield Advanced handles layer 3/4 volumetric floods with higher mitigation capacity, cost protection and DDoS Response Team access. Neither substitutes for the other, which is exactly why both are correct.',
    wrongReasons: {
      2: 'NACLs are static and manual. Volumetric attacks rotate source IPs faster than anyone can maintain a deny list.',
      3: 'GuardDuty is a detection service — it finds and reports threats. It does not block traffic.',
      4: 'A NAT Gateway is for outbound traffic from private subnets. It cannot serve inbound public web traffic, so this breaks the application.',
    },
    concept: 'Layer 7 (WAF) vs layer 3/4 (Shield) protections; GuardDuty detects rather than prevents.',
    docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-chapter.html',
  }),

  mq('saa-multi-006', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['organizations', 's3', 'scp'],
    scenario: 'A company with 40 AWS accounts under AWS Organizations discovered a developer had made an S3 bucket publicly readable. They want to make it impossible for any account to expose a bucket publicly, including future accounts. (Choose TWO.)',
    options: [
      'Enable S3 Block Public Access at the account level in every account',
      'Attach a Service Control Policy to the organization root denying s3:PutBucketPublicAccessBlock changes that disable protection',
      'Enable S3 versioning on all buckets',
      'Configure an S3 Lifecycle rule to remove public ACLs after 24 hours',
      'Enable CloudTrail in all accounts and alert on public bucket creation',
    ],
    answers: [0, 1],
    why: 'Account-level Block Public Access is the control that actually prevents exposure, overriding any bucket policy or ACL beneath it. An SCP is what makes it stick: without one, a developer with sufficient permissions can simply turn the block off. SCPs apply to accounts joining the organization later, satisfying "including future accounts". The pair is prevention plus enforcement.',
    wrongReasons: {
      2: 'Versioning protects against overwrite and deletion. It has no effect on who can read an object.',
      3: 'Lifecycle rules transition and expire objects. They cannot modify ACLs, and 24 hours of exposure is a breach anyway.',
      4: 'CloudTrail plus alerting is detection after the fact. The requirement is to make exposure impossible, not to find out about it.',
    },
    concept: 'Block Public Access as the preventive control, SCPs as the guardrail that stops it being disabled.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html',
  }),

  mq('saa-multi-007', {
    domainIds: ['saa-d1'], topic: T.NETWORKING, service: ['vpc', 's3', 'dynamodb', 'endpoint'],
    scenario: 'EC2 instances in a private subnet must call Amazon S3 and DynamoDB. Company policy states that traffic to AWS services must not traverse the public internet, and the team wants to avoid NAT Gateway data processing charges. (Choose TWO.)',
    options: [
      'Create a Gateway VPC endpoint for S3 and add it to the private subnet route tables',
      'Create a Gateway VPC endpoint for DynamoDB and add it to the private subnet route tables',
      'Create an Interface VPC endpoint (PrivateLink) for S3 and DynamoDB',
      'Add a NAT Gateway in a public subnet and route 0.0.0.0/0 to it',
      'Attach an internet gateway to the private subnet',
    ],
    answers: [0, 1],
    why: 'S3 and DynamoDB are the two services offered as Gateway endpoints, which work by adding a prefix-list route to the subnet route table. Traffic stays on the AWS network and Gateway endpoints carry no hourly or data processing charge, satisfying both the policy and the cost clause. You need one endpoint per service, which is why this is a two-answer question rather than one.',
    wrongReasons: {
      2: 'S3 does offer an Interface endpoint, but Interface endpoints bill per hour and per GB — the option the team is explicitly trying to avoid. DynamoDB has no Interface endpoint in most regions.',
      3: 'A NAT Gateway sends the traffic over the public internet path and incurs exactly the data processing charge being avoided.',
      4: 'Attaching an internet gateway route makes the subnet public, contradicting the design and the policy.',
    },
    concept: 'Gateway endpoints (S3, DynamoDB only, free) vs Interface endpoints (most services, hourly + per-GB).',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html',
  }),

  mq('saa-multi-008', {
    domainIds: ['saa-d1'], topic: T.MONITORING, service: ['cloudtrail', 'config', 's3'],
    scenario: 'An auditor requires two things: a tamper-evident record of every API call made in the account for the last seven years, and the ability to see what a security group\'s rules looked like on any given day last quarter. (Choose TWO.)',
    options: [
      'Create an organization CloudTrail trail delivering to an S3 bucket with Object Lock in compliance mode',
      'Enable AWS Config with a recorder for security groups and retain configuration history',
      'Enable VPC Flow Logs on all subnets',
      'Enable CloudWatch detailed monitoring on all EC2 instances',
      'Enable GuardDuty with S3 protection',
    ],
    answers: [0, 1],
    why: 'The two requirements map to two different services. CloudTrail records API calls — who did what, when — and S3 Object Lock in compliance mode makes the delivered logs immutable even to the root user, which is what "tamper-evident" demands. AWS Config is the service that answers "what did this resource look like on this date" by recording configuration item history over time. CloudTrail alone cannot reconstruct past state; Config alone does not log every API call.',
    wrongReasons: {
      2: 'Flow logs capture network traffic metadata, not API calls or resource configuration.',
      3: 'Detailed monitoring increases EC2 metric frequency to one minute. Unrelated to audit history.',
      4: 'GuardDuty analyses for threats. It does not provide a complete API record or configuration timeline.',
    },
    concept: 'CloudTrail = API activity; Config = resource configuration over time; Object Lock = immutability.',
    docs: 'https://docs.aws.amazon.com/config/latest/developerguide/WhatIsConfig.html',
  }),

  mq('saa-multi-009', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['kms', 's3', 'iam'],
    scenario: 'Two teams share an account. Team A owns a KMS customer-managed key used to encrypt an S3 bucket. Team B must be able to decrypt objects in that bucket, but Team A must retain the ability to revoke that access unilaterally at any moment. (Choose TWO.)',
    options: [
      'Add a statement to the KMS key policy allowing Team B\'s role kms:Decrypt',
      'Attach an IAM policy to Team B\'s role allowing kms:Decrypt on that key ARN',
      'Share Team A\'s access keys with Team B',
      'Enable automatic key rotation on the customer-managed key',
      'Copy the objects into a second unencrypted bucket for Team B',
    ],
    answers: [0, 1],
    why: 'KMS access requires permission from both sides when the identity is in the same account: the key policy must allow the principal, and the principal needs an IAM policy granting the action. Because the key policy is controlled by Team A, removing that one statement instantly revokes access no matter what Team B\'s IAM policy says — that is the unilateral revocation the scenario demands.',
    wrongReasons: {
      2: 'Sharing credentials gives Team B Team A\'s entire identity and cannot be scoped or cleanly revoked.',
      3: 'Rotation creates new key material for future encryption. It neither grants nor revokes access.',
      4: 'An unencrypted copy defeats the purpose of encrypting the data and creates an uncontrolled second copy.',
    },
    concept: 'KMS key policy + IAM policy both required; key policy is the revocation lever.',
    docs: 'https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html',
  }),

  mq('saa-multi-010', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['iam', 'sso', 'sts'],
    scenario: 'A company of 3,000 employees uses Microsoft Active Directory on premises. Staff need access to the AWS Management Console using their existing corporate logins. Creating and maintaining 3,000 IAM users is unacceptable. (Choose TWO.)',
    options: [
      'Use AWS IAM Identity Center with Active Directory as the identity source',
      'Configure a SAML 2.0 identity provider in IAM and map AD groups to IAM roles',
      'Create 3,000 IAM users and script their lifecycle with a nightly job',
      'Create one shared IAM user per department and distribute the password',
      'Enable an Amazon Cognito user pool and import the AD users',
    ],
    answers: [0, 1],
    why: 'Both are supported federation designs. IAM Identity Center connects to AD (directly or through AD Connector) and centrally assigns permission sets across accounts — the modern recommendation. The classic approach, SAML 2.0 federation into IAM roles, has employees authenticate against AD and receive temporary STS credentials for a mapped role. Neither creates per-employee IAM users.',
    wrongReasons: {
      2: 'This is exactly the unacceptable outcome the scenario rules out, and it duplicates identity management.',
      3: 'Shared credentials destroy individual accountability and cannot be audited to a person.',
      4: 'Cognito is built for application end users, not workforce console access. Importing AD users also duplicates the directory.',
    },
    concept: 'Workforce federation via IAM Identity Center or SAML 2.0; Cognito is for app users, not staff.',
    docs: 'https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html',
  }),

  mq('saa-multi-011', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['ec2', 'ssm', 'bastion'],
    scenario: 'Administrators need shell access to EC2 instances in private subnets for troubleshooting. Security has mandated no inbound SSH ports open anywhere, no SSH key pairs to manage, and a full audit record of every session. (Choose TWO.)',
    options: [
      'Use AWS Systems Manager Session Manager to open sessions through the SSM agent',
      'Enable Session Manager session logging to Amazon S3 or CloudWatch Logs',
      'Deploy a bastion host in a public subnet with security group rules limiting SSH to the office IP',
      'Open port 22 inbound from the VPC CIDR only',
      'Distribute a shared SSH private key to the administrators through a password manager',
    ],
    answers: [0, 1],
    why: 'Session Manager connects outbound from the SSM agent to the Systems Manager service, so no inbound port and no key pair is needed at all — it satisfies two of the three mandates directly. Session logging to S3 or CloudWatch Logs supplies the third, recording the commands run in each session. Access without the audit trail would fail the requirement, so both are needed.',
    wrongReasons: {
      2: 'A bastion still requires inbound SSH and key management, both explicitly forbidden.',
      3: 'This still opens port 22 inbound, violating the "no inbound SSH anywhere" mandate.',
      4: 'A shared key removes individual accountability and is a key to manage — forbidden twice over.',
    },
    concept: 'Session Manager removes inbound ports and keys; session logging provides the audit trail.',
    docs: 'https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html',
  }),

  mq('saa-multi-012', {
    domainIds: ['saa-d1'], topic: T.SECURITY, service: ['s3', 'kms', 'compliance'],
    scenario: 'A European financial services firm must store transaction records so that data never leaves the EU, encryption keys are held under their control with a documented rotation policy, and no record can be deleted or altered for five years even by an administrator. (Choose TWO.)',
    options: [
      'Create the S3 bucket in an EU region and encrypt with a customer-managed KMS key in that same region',
      'Enable S3 Object Lock in compliance mode with a five-year retention period',
      'Enable S3 Object Lock in governance mode with a five-year retention period',
      'Enable Cross-Region Replication to a us-east-1 bucket for durability',
      'Use SSE-S3 with the default AWS managed key',
    ],
    answers: [0, 1],
    why: 'A bucket in an EU region with a same-region customer-managed KMS key satisfies both residency and key control, and KMS gives the documented rotation policy. Object Lock in compliance mode is the only setting that blocks deletion for the retention period by every principal including the root user — governance mode allows a privileged user to override it, which fails "even by an administrator".',
    wrongReasons: {
      2: 'Governance mode permits users with s3:BypassGovernanceRetention to delete the object, so an administrator could alter records.',
      3: 'Replicating to a US region moves the data out of the EU, directly violating the residency requirement.',
      4: 'SSE-S3 uses an AWS managed key. The firm cannot control its lifecycle or rotation policy.',
    },
    concept: 'Object Lock compliance mode vs governance mode; region + CMK for data residency and key control.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-overview.html',
  }),

  // ════════════════════════════════════════════════════════════════
  // DOMAIN 2 — Design Resilient Architectures (26%)
  // ════════════════════════════════════════════════════════════════

  mq('saa-multi-013', {
    domainIds: ['saa-d2'], topic: T.INTEGRATION, service: ['sqs', 'asg', 'ec2'],
    scenario: 'An image-processing tier receives a predictable morning flood: 20,000 uploads arrive in ten minutes, then almost nothing until the next day. Currently a fixed fleet of EC2 workers drops requests during the flood and sits idle the rest of the day. (Choose TWO.)',
    options: [
      'Place an SQS queue between the upload endpoint and the workers so requests buffer instead of dropping',
      'Configure an Auto Scaling group that scales on the SQS ApproximateNumberOfMessagesVisible metric via a target tracking policy',
      'Increase the fixed instance count to handle the ten-minute peak',
      'Enable ALB sticky sessions so each user reaches the same worker',
      'Switch the workers to a larger instance type',
    ],
    answers: [0, 1],
    why: 'The queue absorbs the burst so no upload is lost and the workers process at their own pace — that solves the dropping. Scaling the group on queue depth (specifically backlog per instance, using ApproximateNumberOfMessagesVisible) solves the idle cost by adding capacity only while the backlog exists. Queue without scaling means a slow drain; scaling without a queue still drops requests during the scale-out delay.',
    wrongReasons: {
      2: 'Sizing for peak leaves that capacity idle 23 hours a day — the second problem stated.',
      3: 'Sticky sessions are a session-affinity feature for stateful web tiers. Irrelevant to asynchronous processing.',
      4: 'A bigger instance raises per-worker throughput somewhat but still has a fixed ceiling and remains idle all day.',
    },
    concept: 'Queue-based load levelling plus queue-depth-driven Auto Scaling.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html',
  }),

  mq('saa-multi-014', {
    domainIds: ['saa-d2'], topic: T.COMPUTE, service: ['alb', 'asg', 'ec2'],
    scenario: 'A web tier runs on a single EC2 instance in one Availability Zone. The business requires that the loss of any one Availability Zone causes no outage and no manual intervention. (Choose TWO.)',
    options: [
      'Deploy instances across at least two Availability Zones behind an Application Load Balancer',
      'Place the instances in an Auto Scaling group spanning those Availability Zones with a minimum of two',
      'Create an AMI and document a runbook for relaunching in a second AZ',
      'Enable termination protection on the instance',
      'Attach an Elastic IP address to the instance',
    ],
    answers: [0, 1],
    why: 'The ALB spreads traffic across AZs and stops routing to unhealthy targets, so an AZ loss removes capacity but not availability. The Auto Scaling group with a minimum of two across those AZs replaces the lost instances automatically, which is what "no manual intervention" requires. The load balancer handles traffic; the scaling group handles recovery — different jobs, both needed.',
    wrongReasons: {
      2: 'A runbook is manual intervention, explicitly ruled out.',
      3: 'Termination protection prevents accidental API termination. It does nothing when the underlying AZ fails.',
      4: 'An Elastic IP is a static address. It cannot move the workload to a surviving AZ by itself.',
    },
    concept: 'Multi-AZ ALB for traffic distribution + ASG minimum capacity for self-healing.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-benefits.html',
  }),

  mq('saa-multi-015', {
    domainIds: ['saa-d2'], topic: T.DATABASE, service: ['rds', 'aurora'],
    scenario: 'A payments database on Amazon RDS must survive the failure of its Availability Zone with a recovery point objective of zero — no committed transaction may be lost — and failover must not require a human. The team also wants to offload heavy reporting queries. (Choose TWO.)',
    options: [
      'Enable Multi-AZ deployment so RDS replicates synchronously to a standby and fails over automatically',
      'Create one or more read replicas and point the reporting workload at them',
      'Rely on automated daily snapshots with a five-minute transaction log backup',
      'Promote a read replica manually when the primary fails',
      'Enable Multi-AZ and send reporting queries to the standby instance',
    ],
    answers: [0, 1],
    why: 'Multi-AZ replicates synchronously, so a commit is not acknowledged until it reaches the standby — that is what makes RPO zero possible — and RDS performs the DNS failover itself. Read replicas are the correct place for reporting because they are separate readable endpoints. The pairing matters because these two features solve availability and read scaling respectively.',
    wrongReasons: {
      2: 'Snapshots plus log backups give a non-zero RPO (up to five minutes of loss) and restore is slow and manual.',
      3: 'Manual promotion is human intervention, and asynchronous replica lag means possible data loss.',
      4: 'The Multi-AZ standby is not readable. This is the most common misconception the exam tests — reporting must go to a read replica.',
    },
    concept: 'Multi-AZ (synchronous, HA, standby NOT readable) vs read replica (asynchronous, read scaling).',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html',
  }),

  mq('saa-multi-016', {
    domainIds: ['saa-d2'], topic: T.INTEGRATION, service: ['lambda', 'sqs', 'dlq'],
    scenario: 'A Lambda function triggered by SQS occasionally fails on malformed messages. Currently those messages are retried indefinitely, blocking the queue and hiding the failures. The team wants poison messages set aside for inspection without stalling processing. (Choose TWO.)',
    options: [
      'Configure a redrive policy on the source queue with a maxReceiveCount so failed messages move to a dead-letter queue',
      'Create a dead-letter queue and set a CloudWatch alarm on its ApproximateNumberOfMessagesVisible',
      'Increase the function timeout to 15 minutes',
      'Increase the queue visibility timeout to 12 hours',
      'Set the function reserved concurrency to 1 so messages process in order',
    ],
    answers: [0, 1],
    why: 'The redrive policy is the mechanism: after maxReceiveCount failed receives, SQS moves the message to the DLQ so the main queue keeps flowing. Alarming on DLQ depth is what turns a silent sideline into a visible signal, addressing "hiding the failures". Without the alarm the messages are set aside but still unnoticed.',
    wrongReasons: {
      2: 'A longer timeout gives a malformed message more time to fail. It does not stop the retry loop.',
      3: 'A longer visibility timeout makes the blockage worse by holding the message invisible for longer.',
      4: 'Reserved concurrency of 1 serialises processing and would make a poison message block the queue completely.',
    },
    concept: 'SQS redrive policy + DLQ monitoring; visibility timeout and function timeout do not solve poison messages.',
    docs: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html',
  }),

  mq('saa-multi-017', {
    domainIds: ['saa-d2'], topic: T.NETWORKING, service: ['route53', 'cloudfront'],
    scenario: 'A company runs its application in eu-west-1 with a warm standby stack in us-east-1. If the primary region becomes unhealthy, user traffic must move to the standby within minutes without anyone editing DNS. (Choose TWO.)',
    options: [
      'Create a Route 53 health check against an endpoint in the primary region',
      'Configure Route 53 failover routing with the primary record as PRIMARY and the standby as SECONDARY, associated with that health check',
      'Use Route 53 weighted routing with 100 percent to the primary and 0 percent to the standby',
      'Reduce the record TTL to zero so clients never cache',
      'Use Route 53 geolocation routing to send users to their nearest region',
    ],
    answers: [0, 1],
    why: 'Failover routing needs both pieces: the health check is what detects the primary is unhealthy, and the failover record set is what redirects resolution to the secondary when it does. One without the other does nothing — a health check with no failover policy just reports status, and a failover policy with no health check never triggers.',
    wrongReasons: {
      2: 'Weighted routing does not react to health on its own. Someone would have to change the weights, which is the manual step being avoided.',
      3: 'TTL zero is not supported meaningfully and resolvers often ignore very low TTLs. It also does not detect failure or redirect anything.',
      4: 'Geolocation routes on where the user is, not on whether a region is healthy.',
    },
    concept: 'Route 53 failover routing requires a health check plus PRIMARY/SECONDARY record sets.',
    docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html',
  }),

  mq('saa-multi-018', {
    domainIds: ['saa-d2'], topic: T.COMPUTE, service: ['elasticache', 'dynamodb', 'asg'],
    scenario: 'A web application stores user session state in memory on each EC2 instance. Users are logged out whenever Auto Scaling terminates an instance during scale-in. The team wants instances to become disposable without changing the load balancer configuration. (Choose TWO.)',
    options: [
      'Store session state in Amazon ElastiCache for Redis',
      'Store session state in an Amazon DynamoDB table',
      'Enable ALB sticky sessions so users always return to one instance',
      'Disable scale-in on the Auto Scaling group',
      'Increase the instance termination grace period to 3,600 seconds',
    ],
    answers: [0, 1],
    why: 'Both are standard external session stores that make the instances stateless, which is the actual goal. ElastiCache for Redis is the classic in-memory choice with sub-millisecond reads; DynamoDB is the serverless choice with a TTL attribute that expires old sessions automatically. Either externalises state so any instance can serve any user.',
    wrongReasons: {
      2: 'Sticky sessions are a load balancer change, which the scenario excludes, and they do not survive the instance being terminated anyway.',
      3: 'Disabling scale-in avoids the symptom by giving up elasticity, and the sessions are still lost when an instance fails.',
      4: 'A grace period only delays termination. The session is still destroyed at the end of it.',
    },
    concept: 'Externalising session state (ElastiCache or DynamoDB) to make instances stateless.',
    docs: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/elasticache-use-cases.html',
  }),

  mq('saa-multi-019', {
    domainIds: ['saa-d2'], topic: T.INTEGRATION, service: ['sqs', 'fifo'],
    scenario: 'An order system must process each order exactly once and strictly in the sequence the customer submitted them. The current standard SQS queue occasionally delivers duplicates and out of order. (Choose TWO.)',
    options: [
      'Migrate to an SQS FIFO queue',
      'Set a MessageGroupId per customer so ordering is preserved within each customer\'s orders',
      'Enable long polling on the standard queue',
      'Increase the visibility timeout on the standard queue',
      'Add a Lambda function that sorts messages by timestamp after receipt',
    ],
    answers: [0, 1],
    why: 'A FIFO queue provides both guarantees the scenario asks for: exactly-once processing through content-based or explicit deduplication, and strict ordering. MessageGroupId is the required companion because FIFO ordering is guaranteed *within a group* — using the customer id as the group preserves each customer\'s sequence while still allowing different customers to be processed in parallel.',
    wrongReasons: {
      2: 'Long polling reduces empty receives and API cost. It changes nothing about ordering or duplication.',
      3: 'Visibility timeout controls how long a message is hidden after receipt, not ordering or duplication.',
      4: 'Sorting after the fact cannot recover ordering across separate receives, and does nothing about duplicates.',
    },
    concept: 'SQS FIFO for exactly-once and ordering; MessageGroupId scopes ordering and enables parallelism.',
    docs: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html',
  }),

  mq('saa-multi-020', {
    domainIds: ['saa-d2'], topic: T.STORAGE, service: ['s3', 'crr', 'versioning'],
    scenario: 'A media company stores masters in S3 in eu-west-2. They need protection against accidental deletion by staff and against the loss of the entire region, with an RPO measured in minutes. (Choose TWO.)',
    options: [
      'Enable S3 Versioning on the bucket',
      'Enable Cross-Region Replication to a bucket in another region',
      'Enable S3 Lifecycle transitions to Glacier Deep Archive after 30 days',
      'Enable S3 Transfer Acceleration',
      'Take a weekly manual copy to a second bucket in the same region',
    ],
    answers: [0, 1],
    why: 'Versioning is what protects against accidental deletion — a delete places a marker and the prior version remains recoverable. It is also a prerequisite for replication. Cross-Region Replication addresses regional loss and replicates within minutes, meeting the stated RPO. The two answers cover the two distinct threats named.',
    wrongReasons: {
      2: 'Lifecycle to Deep Archive reduces cost but retrieval takes hours and it does not protect against deletion or region loss.',
      3: 'Transfer Acceleration speeds long-distance uploads. It is not a durability or recovery feature.',
      4: 'A weekly copy gives an RPO of up to seven days, and staying in the same region does not survive regional loss.',
    },
    concept: 'Versioning (deletion protection, CRR prerequisite) + Cross-Region Replication (regional durability).',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html',
  }),

  mq('saa-multi-021', {
    domainIds: ['saa-d2'], topic: T.COMPUTE, service: ['asg', 'elb', 'cloudwatch'],
    scenario: 'Instances in an Auto Scaling group behind an ALB sometimes hang: the operating system runs but the application stops responding on port 8080. Auto Scaling currently leaves these instances in service. (Choose TWO.)',
    options: [
      'Change the Auto Scaling group health check type to ELB so it honours target group health',
      'Configure the ALB target group health check to request a path served by the application on port 8080',
      'Reduce the Auto Scaling group cooldown period',
      'Enable EC2 detailed monitoring',
      'Increase the desired capacity to compensate for hung instances',
    ],
    answers: [0, 1],
    why: 'By default an Auto Scaling group uses EC2 status checks, which pass because the OS is healthy — that is precisely why hung instances stay in service. Switching the health check type to ELB makes Auto Scaling replace instances the target group marks unhealthy. That only works if the target group health check actually tests the application, so configuring it against an application path on port 8080 is the necessary partner answer.',
    wrongReasons: {
      2: 'Cooldown affects the pace of scaling activities. It has no bearing on health detection.',
      3: 'Detailed monitoring changes metric granularity. It does not detect an unresponsive application or replace instances.',
      4: 'Adding capacity masks the problem, costs more, and leaves hung instances receiving traffic.',
    },
    concept: 'ASG health check type ELB + a meaningful application-level target group health check.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-add-elb-healthcheck.html',
  }),

  mq('saa-multi-022', {
    domainIds: ['saa-d2'], topic: T.DATABASE, service: ['dynamodb', 'backup'],
    scenario: 'A DynamoDB table underpins a booking system. The team must be able to restore the table to any second within the last 30 days after a bad deployment, and must retain a monthly archive for two years to satisfy an auditor. (Choose TWO.)',
    options: [
      'Enable point-in-time recovery on the table',
      'Use AWS Backup with a monthly backup plan and a two-year retention rule',
      'Enable DynamoDB Streams and replay events to rebuild state',
      'Create a global table replica in a second region',
      'Enable on-demand capacity mode',
    ],
    answers: [0, 1],
    why: 'Point-in-time recovery gives continuous backups with per-second restore granularity across a rolling 35-day window, covering the 30-day requirement. PITR does not retain anything beyond that window, so the long-term audit archive needs scheduled backups with a retention policy, which AWS Backup provides. Short-term granularity and long-term retention are two different capabilities.',
    wrongReasons: {
      2: 'Streams retain records for 24 hours only, and replaying them is a custom rebuild rather than a restore.',
      3: 'Global tables give multi-region availability. A bad write replicates to every replica, so this is no protection against a bad deployment.',
      4: 'Capacity mode affects throughput billing. It is unrelated to backup and restore.',
    },
    concept: 'DynamoDB PITR (35-day, per-second) vs AWS Backup (scheduled, long retention).',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html',
  }),

  // ════════════════════════════════════════════════════════════════
  // DOMAIN 3 — Design High-Performing Architectures (24%)
  // ════════════════════════════════════════════════════════════════

  mq('saa-multi-023', {
    domainIds: ['saa-d3'], topic: T.DATABASE, service: ['rds', 'elasticache', 'read-replica'],
    scenario: 'A product catalogue on RDS for MySQL is 95 percent reads. The same popular queries run thousands of times per minute and CPU on the primary is saturated. Response times must drop below 10 ms for repeated queries. (Choose TWO.)',
    options: [
      'Add an ElastiCache for Redis cache and serve repeated query results from it',
      'Create read replicas and direct read traffic to them',
      'Enable Multi-AZ on the RDS instance',
      'Increase the allocated storage on the RDS instance',
      'Switch the instance to a burstable t3 class',
    ],
    answers: [0, 1],
    why: 'Only the cache can realistically deliver sub-10 ms on repeated queries — in-memory reads avoid the database entirely and are the answer to the stated latency target. Read replicas address the saturated CPU by moving read load off the primary. The two work together: the cache absorbs the hot repeated queries, replicas handle the remaining read volume.',
    wrongReasons: {
      2: 'Multi-AZ is for availability and its standby cannot serve reads, so it removes no load.',
      3: 'More storage does not reduce CPU or query latency, though it can raise IOPS on gp2 — not the bottleneck described.',
      4: 'A burstable class has less sustained CPU than the current saturated instance. This makes it worse.',
    },
    concept: 'Caching for repeated-query latency + read replicas for read throughput.',
    docs: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/elasticache-use-cases.html',
  }),

  mq('saa-multi-024', {
    domainIds: ['saa-d3'], topic: T.NETWORKING, service: ['cloudfront', 's3', 'alb'],
    scenario: 'A retailer\'s site serves large product images from S3 and dynamic pricing from an ALB. Customers in Asia and South America report slow page loads; the infrastructure is entirely in eu-west-1. (Choose TWO.)',
    options: [
      'Create a CloudFront distribution with the S3 bucket as an origin for the images',
      'Add the ALB as a second CloudFront origin with a cache behaviour tuned for dynamic content',
      'Enable S3 Transfer Acceleration on the images bucket',
      'Deploy read replicas of the pricing database in Asia and South America',
      'Move the entire stack to us-east-1 as a more central location',
    ],
    answers: [0, 1],
    why: 'A single CloudFront distribution can front both origins. Images cache at the edge close to the user, which is the classic static-content win. Dynamic content still benefits because CloudFront terminates the connection at the edge and carries the request to the origin over AWS\'s optimised backbone with a warm connection, reducing round-trip latency even with little or no caching.',
    wrongReasons: {
      2: 'Transfer Acceleration optimises uploads TO S3 over long distances. These users are downloading.',
      3: 'Replicas may help query time but do nothing about the network latency dominating page load from another continent.',
      4: 'Relocating trades one set of distant users for another. It does not solve global distribution.',
    },
    concept: 'CloudFront with multiple origins; edge caching for static and connection optimisation for dynamic.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistS3AndCustomOrigins.html',
  }),

  mq('saa-multi-025', {
    domainIds: ['saa-d3'], topic: T.STORAGE, service: ['s3', 'multipart'],
    scenario: 'Video producers upload 40 GB master files to S3 from studios worldwide. Uploads are slow and sometimes fail near completion, forcing a full restart. (Choose TWO.)',
    options: [
      'Use S3 multipart upload so parts transfer in parallel and only failed parts are retried',
      'Enable S3 Transfer Acceleration so uploads enter the AWS network at a nearby edge location',
      'Increase the S3 bucket request rate limit through a support case',
      'Compress each file to a single archive before uploading',
      'Switch the destination to S3 Glacier Instant Retrieval to speed ingestion',
    ],
    answers: [0, 1],
    why: 'Multipart upload solves the failure problem directly: the object is split into parts uploaded in parallel, and a failure only requires retrying that part rather than the whole 40 GB. Transfer Acceleration solves the distance problem by routing the upload into the nearest CloudFront edge and across the AWS backbone. Multipart is in fact required for objects over 5 GB.',
    wrongReasons: {
      2: 'S3 scales request rates automatically and there is no such per-bucket limit to raise for this.',
      3: 'Video masters are already compressed; a single archive is still one large object with the same restart problem.',
      4: 'Storage class affects storage cost and retrieval, not upload speed.',
    },
    concept: 'Multipart upload for large-object resilience and parallelism; Transfer Acceleration for distance.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html',
  }),

  mq('saa-multi-026', {
    domainIds: ['saa-d3'], topic: T.DATABASE, service: ['dynamodb', 'dax'],
    scenario: 'A DynamoDB table keyed on device_id is throttling. Telemetry shows 90 percent of traffic hits a handful of device ids, while provisioned capacity across the table is only 30 percent consumed. Reads of the same items repeat constantly. (Choose TWO.)',
    options: [
      'Add a random or calculated suffix to the partition key to spread writes across more partitions',
      'Put DynamoDB Accelerator (DAX) in front of the table to absorb the repeated reads',
      'Increase provisioned write capacity units on the table',
      'Add a Global Secondary Index on device_id',
      'Enable DynamoDB Streams to smooth the write load',
    ],
    answers: [0, 1],
    why: 'This is a hot-partition problem: throttling with low overall utilisation is the signature. Write sharding — adding a suffix to spread one logical key across many partition keys — fixes the distribution at its root. DAX is a microsecond-latency, DynamoDB-specific cache that serves the constantly repeated reads without touching the table. One fixes writes, the other removes read pressure.',
    wrongReasons: {
      2: 'Raising capacity does not help when the limit is per-partition. The table is already only 30 percent consumed.',
      3: 'A GSI on the same attribute recreates the identical skew on the index.',
      4: 'Streams capture changes for downstream consumers. They do not buffer or smooth incoming writes.',
    },
    concept: 'Hot partition diagnosis; write sharding for distribution, DAX for repeated reads.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html',
  }),

  mq('saa-multi-027', {
    domainIds: ['saa-d3'], topic: T.STORAGE, service: ['ebs', 'ec2'],
    scenario: 'A self-managed PostgreSQL database on EC2 needs a sustained 40,000 IOPS with consistent single-digit millisecond latency. The current gp2 volume cannot keep up and the team has confirmed the instance CPU is not the constraint. (Choose TWO.)',
    options: [
      'Move the data volume to io2 Block Express provisioned at the required IOPS',
      'Launch the database on an EBS-optimised instance type sized to support that volume throughput',
      'Add more gp2 volumes and stripe them with RAID 0',
      'Switch the volume to sc1 for higher throughput',
      'Enable EBS fast snapshot restore on the volume',
    ],
    answers: [0, 1],
    why: 'io2 Block Express is the volume family built for high sustained provisioned IOPS with consistent low latency, so it addresses the storage side. The instance must also be able to carry that traffic — EBS bandwidth is capped per instance type, so an undersized instance throttles even a perfectly provisioned volume. Provisioning IOPS the instance cannot deliver is a classic exam trap.',
    wrongReasons: {
      2: 'RAID 0 across gp2 can raise aggregate IOPS but multiplies failure risk and still inherits gp2\'s burst-based variability, failing the consistency requirement.',
      3: 'sc1 is cold HDD storage designed for infrequent sequential access — dramatically worse for a transactional database.',
      4: 'Fast snapshot restore removes first-access latency on volumes created from snapshots. It does not raise steady-state IOPS.',
    },
    concept: 'io2 Block Express for provisioned IOPS; instance EBS bandwidth as the second ceiling.',
    docs: 'https://docs.aws.amazon.com/ebs/latest/userguide/provisioned-iops.html',
  }),

  mq('saa-multi-028', {
    domainIds: ['saa-d3'], topic: T.ANALYTICS, service: ['kinesis', 'firehose', 's3'],
    scenario: 'Sensors emit 500,000 records per second. A fraud team needs to run a sliding-window aggregation on the stream within seconds of arrival, and a separate analytics team needs every raw record landed in S3 as Parquet for later querying. (Choose TWO.)',
    options: [
      'Ingest into Amazon Kinesis Data Streams and process with a Managed Service for Apache Flink application for the windowed aggregation',
      'Attach Amazon Data Firehose to the same stream to buffer, convert to Parquet and deliver to S3',
      'Write each record directly to S3 with a PutObject call per record',
      'Batch the records into an SQS FIFO queue and process hourly',
      'Load every record into Amazon Redshift as it arrives',
    ],
    answers: [0, 1],
    why: 'Kinesis Data Streams handles the ingest rate and, importantly, allows multiple independent consumers of the same data. Flink performs true windowed stream aggregation for the seconds-latency fraud requirement. Firehose is a second consumer that handles buffering, Parquet conversion and S3 delivery without any code. Two consumers, two requirements, one stream.',
    wrongReasons: {
      2: 'One PutObject per record at 500,000 per second creates enormous request cost and millions of tiny files that are terrible to query.',
      3: 'FIFO queues cap well below this rate and hourly processing violates the seconds requirement.',
      4: 'Redshift is a warehouse for analytical queries, not a real-time streaming aggregation engine, and per-record loads are inefficient.',
    },
    concept: 'Kinesis Data Streams fan-out to multiple consumers; Flink for windowing, Firehose for S3 delivery.',
    docs: 'https://docs.aws.amazon.com/streams/latest/dev/introduction.html',
  }),

  mq('saa-multi-029', {
    domainIds: ['saa-d3'], topic: T.STORAGE, service: ['efs', 'ec2'],
    scenario: 'A rendering farm of 60 Linux EC2 instances across three Availability Zones must all read and write the same project directory concurrently with standard POSIX file semantics. Capacity needs vary unpredictably. (Choose TWO.)',
    options: [
      'Create an Amazon EFS file system and mount it on every instance',
      'Create mount targets for the EFS file system in each of the three Availability Zones',
      'Attach a single EBS volume to all 60 instances',
      'Use an S3 bucket mounted with a filesystem driver as the shared directory',
      'Provision an FSx for Windows File Server file system',
    ],
    answers: [0, 1],
    why: 'EFS is the managed POSIX-compliant shared file system that many instances can mount simultaneously, and it grows and shrinks automatically, matching the unpredictable capacity. Access is via mount targets, and a mount target is per-Availability-Zone — without one in each AZ, instances in the AZs you skipped cannot reach the file system. The second answer is what makes the first actually work across three AZs.',
    wrongReasons: {
      2: 'A standard EBS volume attaches to one instance. Multi-Attach is io1/io2 only, single-AZ, and needs a cluster-aware filesystem — not 60 instances across three AZs.',
      3: 'S3 is object storage. Filesystem drivers over it do not give real POSIX semantics for concurrent read-write workloads.',
      4: 'FSx for Windows serves SMB to Windows clients. These are Linux instances needing POSIX.',
    },
    concept: 'EFS for multi-AZ POSIX shared storage; one mount target per Availability Zone.',
    docs: 'https://docs.aws.amazon.com/efs/latest/ug/how-it-works.html',
  }),

  mq('saa-multi-030', {
    domainIds: ['saa-d3'], topic: T.COMPUTE, service: ['lambda', 'api-gateway'],
    scenario: 'A latency-sensitive API on Lambda behind API Gateway shows a p99 of 2.4 seconds. Investigation attributes most of it to initialisation on infrequently invoked functions, and to a VPC-attached function creating database connections on every invocation. (Choose TWO.)',
    options: [
      'Configure provisioned concurrency on the function so initialised environments are kept warm',
      'Move connection setup outside the handler so it is reused across invocations on a warm environment',
      'Increase the function timeout from 3 seconds to 30 seconds',
      'Increase the API Gateway throttling limit',
      'Enable API Gateway request validation',
    ],
    answers: [0, 1],
    why: 'Provisioned concurrency keeps initialised execution environments ready, which is the direct remedy for cold-start initialisation latency. Moving connection setup into the module scope outside the handler means it runs once per environment rather than once per invocation, so warm invocations reuse the connection. One addresses the cold path, the other the warm path.',
    wrongReasons: {
      2: 'A longer timeout allows slow invocations to finish rather than making them fast. It can worsen observed latency.',
      3: 'Throttling limits control request admission. They do not affect the latency of an accepted request.',
      4: 'Request validation rejects malformed requests earlier. It does not touch initialisation or connection cost.',
    },
    concept: 'Provisioned concurrency for cold starts; module-scope initialisation for connection reuse.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html',
  }),

  mq('saa-multi-031', {
    domainIds: ['saa-d3'], topic: T.ANALYTICS, service: ['athena', 's3', 'glue'],
    scenario: 'Analysts query five years of JSON logs in S3 with Amazon Athena. Queries take minutes and cost is rising because each one scans hundreds of gigabytes. The query pattern almost always filters on event_date. (Choose TWO.)',
    options: [
      'Convert the data to Apache Parquet, a columnar compressed format',
      'Partition the data in S3 by event_date so Athena prunes irrelevant partitions',
      'Move the data to S3 Glacier Flexible Retrieval to reduce storage cost',
      'Increase the Athena query timeout',
      'Load all five years into Amazon Redshift and query it there',
    ],
    answers: [0, 1],
    why: 'Athena bills and performs by bytes scanned, so both answers attack the same metric from different angles. Parquet is columnar and compressed, so a query reads only the columns it needs rather than whole JSON rows. Partitioning by event_date lets Athena skip entire prefixes for dates outside the filter. Together they typically cut scanned bytes by an order of magnitude or more.',
    wrongReasons: {
      2: 'Athena cannot query Glacier Flexible Retrieval directly, and this addresses storage cost rather than query cost or speed.',
      3: 'A longer timeout lets slow queries complete. It makes nothing faster or cheaper.',
      4: 'Redshift is a valid warehouse but is a far larger change with ongoing cluster cost, when the actual problem is unoptimised file format and layout.',
    },
    concept: 'Athena optimisation: columnar format (Parquet) plus partition pruning to cut bytes scanned.',
    docs: 'https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html',
  }),

  mq('saa-multi-032', {
    domainIds: ['saa-d3'], topic: T.MIGRATION, service: ['direct-connect', 'datasync', 's3'],
    scenario: 'A company must move 600 TB from an on-premises NAS to S3 within four weeks, then keep a nightly 2 TB delta synchronised with consistent, private bandwidth. Their internet link is 500 Mbps and already busy. (Choose TWO.)',
    options: [
      'Use AWS Snowball Edge devices for the initial 600 TB bulk transfer',
      'Establish AWS Direct Connect and use AWS DataSync for the ongoing nightly delta',
      'Upload the initial 600 TB over the existing internet connection using the AWS CLI',
      'Use S3 Transfer Acceleration for both the bulk load and the nightly delta',
      'Ship external hard drives to an AWS office for manual upload',
    ],
    answers: [0, 1],
    why: 'This is the standard two-phase migration. 600 TB over a busy 500 Mbps link would take well over three months even at full utilisation, so the bulk load must go physical — Snowball Edge. The ongoing requirement specifies consistent private bandwidth, which is Direct Connect, and DataSync is the managed service that handles incremental transfer, verification and scheduling.',
    wrongReasons: {
      2: 'Arithmetic rules this out: 600 TB at 500 Mbps is roughly 111 days at full saturation, and the link is already busy.',
      3: 'Transfer Acceleration still uses the same saturated internet link and provides neither the throughput nor the private path required.',
      4: 'AWS does not accept customer hard drives for manual import; Snowball is the supported mechanism.',
    },
    concept: 'Snowball for offline bulk seeding; Direct Connect + DataSync for private, ongoing incremental sync.',
    docs: 'https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html',
  }),

  // ════════════════════════════════════════════════════════════════
  // DOMAIN 4 — Design Cost-Optimised Architectures (20%)
  // ════════════════════════════════════════════════════════════════

  mq('saa-multi-033', {
    domainIds: ['saa-d4'], topic: T.PRICING, service: ['spot', 'ec2', 'batch'],
    scenario: 'A nightly genomics pipeline runs for about four hours on 200 EC2 instances. The work is checkpointed, individual task failures are retried automatically, and completion any time before 07:00 is acceptable. The team wants the lowest possible compute cost. (Choose TWO.)',
    options: [
      'Run the fleet on EC2 Spot Instances',
      'Use a diversified instance type and Availability Zone mix so capacity interruptions affect only part of the fleet',
      'Purchase Standard Reserved Instances for 200 instances on a three-year term',
      'Purchase a three-year Compute Savings Plan sized to 200 instances',
      'Run on On-Demand instances to guarantee the 07:00 deadline',
    ],
    answers: [0, 1],
    why: 'Spot is the right model because the workload has every characteristic Spot rewards: interruption-tolerant, checkpointed, retryable and flexible on timing, at up to 90 percent off On-Demand. Diversification is the practice that makes Spot dependable at scale — spreading across instance types and AZs means a capacity reclaim in one pool degrades rather than halts the run.',
    wrongReasons: {
      2: 'Reserved Instances commit to continuous capacity for three years. Paying around the clock for four hours of nightly use is far more expensive than Spot.',
      3: 'A Savings Plan is also a continuous-usage commitment; the same waste applies for a four-hour nightly job.',
      4: 'On-Demand is the most expensive per-hour option and the scenario explicitly tolerates interruption.',
    },
    concept: 'Spot for interruption-tolerant batch; diversification as the reliability practice for Spot at scale.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html',
  }),

  mq('saa-multi-034', {
    domainIds: ['saa-d4'], topic: T.PRICING, service: ['s3', 'lifecycle', 'intelligent-tiering'],
    scenario: 'A company stores 900 TB of documents in S3 Standard. Access is unpredictable — some documents are read daily for years, others never again after a week. Retrieval must remain immediate whenever a document is requested, and the team does not want to build access-tracking logic. (Choose TWO.)',
    options: [
      'Move the objects to S3 Intelligent-Tiering',
      'Configure a lifecycle rule transitioning objects to Intelligent-Tiering shortly after creation',
      'Configure a lifecycle rule transitioning objects to Glacier Deep Archive after 30 days',
      'Configure a lifecycle rule transitioning objects to S3 One Zone-IA after 30 days',
      'Enable S3 Requester Pays on the bucket',
    ],
    answers: [0, 1],
    why: 'Intelligent-Tiering is designed for exactly this: unpredictable access with no operational overhead. It moves objects between frequent and infrequent tiers automatically based on observed access, and the frequent, infrequent and archive-instant tiers all retrieve immediately with no retrieval fee. A lifecycle rule is how you get newly created objects into it going forward, so the pair covers the existing 900 TB and everything new.',
    wrongReasons: {
      2: 'Deep Archive retrieval takes hours, breaking the immediate-retrieval requirement.',
      3: 'One Zone-IA sacrifices Availability Zone redundancy, and a fixed 30-day rule ignores the unpredictable pattern — daily-read documents would be penalised with retrieval fees.',
      4: 'Requester Pays shifts cost to the caller. It does not reduce the company\'s storage cost and changes the access model.',
    },
    concept: 'Intelligent-Tiering for unpredictable access with immediate retrieval; lifecycle rules to onboard new objects.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html',
  }),

  mq('saa-multi-035', {
    domainIds: ['saa-d4'], topic: T.NETWORKING, service: ['nat', 'endpoint', 'vpc'],
    scenario: 'A monthly bill review shows two large line items: NAT Gateway data processing, and data transfer from private instances pulling objects from S3 and writing to DynamoDB. The instances have no other reason to reach the internet. (Choose TWO.)',
    options: [
      'Create Gateway VPC endpoints for S3 and DynamoDB',
      'Remove the NAT Gateway once no workload requires outbound internet access',
      'Replace the NAT Gateway with a NAT instance on a t3.micro',
      'Enable VPC Flow Logs to analyse the traffic further',
      'Move the instances to a public subnet with public IP addresses',
    ],
    answers: [0, 1],
    why: 'Gateway endpoints for S3 and DynamoDB keep that traffic on the AWS network and carry no hourly or per-GB charge, which eliminates both the NAT data processing for those calls and the associated transfer cost. Once the endpoints carry the only outbound need, the NAT Gateway itself becomes pure waste — removing it deletes the hourly charge too. The second answer is what captures the rest of the saving.',
    wrongReasons: {
      2: 'A NAT instance removes the managed hourly fee but you still pay for the instance, still pay data transfer, and you take on patching, sizing and single-point-of-failure risk.',
      3: 'Flow logs add cost and give visibility. The problem is already diagnosed.',
      4: 'Public subnets and public IPs expose the instances directly and do not reduce data transfer charges.',
    },
    concept: 'Gateway endpoints eliminate NAT data processing for S3/DynamoDB; remove the NAT once nothing needs it.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html',
  }),

  mq('saa-multi-036', {
    domainIds: ['saa-d4'], topic: T.PRICING, service: ['ec2', 'rds', 'lambda'],
    scenario: 'Development and test environments run 40 EC2 instances and 6 RDS instances around the clock, but developers only work 09:00 to 18:00 on weekdays. Finance wants the cost cut without deleting the environments. (Choose TWO.)',
    options: [
      'Schedule the EC2 instances to stop outside working hours using EventBridge Scheduler or Instance Scheduler',
      'Stop the RDS instances outside working hours, accepting the seven-day automatic restart behaviour',
      'Purchase three-year Reserved Instances for all 46 instances',
      'Resize every instance to the smallest available type',
      'Delete the environments each evening and recreate them each morning from CloudFormation',
    ],
    answers: [0, 1],
    why: 'Working hours are 45 of 168 hours a week, so stopping compute outside them removes roughly 73 percent of the runtime. Stopped EC2 instances incur no instance charge, and stopped RDS instances incur no instance charge either — though RDS automatically restarts after seven days, which is why the option names that caveat. Both must be scheduled to capture the full saving, since EC2 and RDS are separate line items.',
    wrongReasons: {
      2: 'Reservations commit to continuous usage. Buying them for environments you should be switching off locks in the waste.',
      3: 'Undersizing breaks the environments\' purpose as a realistic test target and saves far less than switching them off.',
      4: 'Delete-and-recreate risks losing state, adds fragility and engineering effort, when stopping achieves the same saving.',
    },
    concept: 'Scheduled stop/start for non-production; stopped EC2 and RDS incur no instance charge.',
    docs: 'https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/solution-overview.html',
  }),

  mq('saa-multi-037', {
    domainIds: ['saa-d4'], topic: T.PRICING, service: ['savings-plans', 'compute-optimizer'],
    scenario: 'A stable production workload has run 100 m5.2xlarge instances continuously for two years with little variation, all On-Demand. The team expects to keep the workload but may move some of it to Fargate and to Graviton instance types during the next year. (Choose TWO.)',
    options: [
      'Purchase a Compute Savings Plan, which applies across instance family, size, region, Fargate and Lambda',
      'Use AWS Compute Optimizer to identify right-sizing and Graviton migration opportunities before committing',
      'Purchase Standard Reserved Instances for m5.2xlarge specifically',
      'Move the workload to Spot Instances',
      'Purchase a three-year All Upfront EC2 Instance Savings Plan locked to the m5 family',
    ],
    answers: [0, 1],
    why: 'A Compute Savings Plan is the right commitment shape because it keeps discounting when the workload shifts to a different family, to Graviton or to Fargate — that flexibility is precisely what the scenario forecasts. Running Compute Optimizer first avoids the classic mistake of committing to current, possibly oversized capacity: right-size before you commit, or you lock in waste for years.',
    wrongReasons: {
      2: 'Standard RIs are tied to instance family. Moving to Graviton or Fargate would strand the commitment.',
      3: 'Spot suits interruption-tolerant work. Continuous production is the wrong fit.',
      4: 'An EC2 Instance Savings Plan locked to m5 gives a slightly deeper discount but forfeits the Fargate and cross-family flexibility the scenario needs.',
    },
    concept: 'Compute Savings Plans (flexible across family/Fargate/Lambda) vs EC2 Instance SP and RIs; right-size before committing.',
    docs: 'https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html',
  }),

  mq('saa-multi-038', {
    domainIds: ['saa-d4'], topic: T.MONITORING, service: ['cloudwatch', 's3', 'logs'],
    scenario: 'CloudWatch Logs charges have grown to a significant share of the bill. Logs are queried heavily for the first two weeks after they are written, then only rarely for compliance investigations, but must be kept for three years. (Choose TWO.)',
    options: [
      'Set the CloudWatch Logs retention period to 14 days instead of never expire',
      'Export the logs to S3 and apply a lifecycle policy transitioning to Glacier Flexible Retrieval, retaining three years',
      'Disable logging for the noisiest applications',
      'Increase the CloudWatch Logs retention period to three years',
      'Stream the logs to a self-managed Elasticsearch cluster on EC2',
    ],
    answers: [0, 1],
    why: 'CloudWatch Logs storage is considerably more expensive per GB than S3, and never-expire retention is what makes the bill grow without bound. Trimming retention to the 14-day hot window matches the actual query pattern. The three-year compliance obligation is then met far more cheaply in S3 with a lifecycle transition to Glacier, where rare investigative retrieval is entirely acceptable.',
    wrongReasons: {
      2: 'Disabling logging destroys the compliance record and observability. It solves cost by removing a requirement.',
      3: 'Three-year retention in CloudWatch Logs is the most expensive possible answer — the opposite of the goal.',
      4: 'A self-managed cluster adds EC2, storage and operational cost, almost certainly exceeding the current spend.',
    },
    concept: 'Short CloudWatch Logs retention for the hot window; S3 + Glacier lifecycle for long-term compliance.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html',
  }),

  mq('saa-multi-039', {
    domainIds: ['saa-d4'], topic: T.DATABASE, service: ['aurora', 'rds', 'serverless'],
    scenario: 'An internal reporting database is idle overnight and at weekends, then handles unpredictable heavy bursts during month-end close. It currently runs on a provisioned Aurora cluster sized for the month-end peak, which is idle most of the time. (Choose TWO.)',
    options: [
      'Move the cluster to Aurora Serverless v2 so capacity scales with demand and drops to a low minimum when idle',
      'Set an appropriate minimum and maximum Aurora Capacity Unit range so it can scale down when idle and up for month-end',
      'Purchase Reserved Instances for the current provisioned cluster',
      'Keep the provisioned cluster and add read replicas for month-end',
      'Migrate the reporting workload to DynamoDB on-demand capacity',
    ],
    answers: [0, 1],
    why: 'Aurora Serverless v2 matches this pattern exactly: it scales capacity in fine-grained increments with demand and can sit at a low minimum while idle, so you stop paying peak-sized capacity overnight and at weekends. Configuring the ACU range is what makes that behaviour correct in practice — too high a minimum keeps the waste, too low a maximum throttles month-end.',
    wrongReasons: {
      2: 'Reservations lock in payment for peak-sized capacity that is idle most of the time, cementing the problem.',
      3: 'Replicas add more always-on cost and do nothing about the idle overnight and weekend periods.',
      4: 'A reporting workload runs analytical SQL. DynamoDB is a key-value store and a poor fit for ad hoc reporting queries.',
    },
    concept: 'Aurora Serverless v2 for intermittent, bursty workloads; ACU min/max as the control that realises the saving.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html',
  }),

  mq('saa-multi-040', {
    domainIds: ['saa-d4'], topic: T.PRICING, service: ['organizations', 'budgets', 'cost-explorer'],
    scenario: 'A company with 25 accounts under AWS Organizations cannot tell which team is responsible for which spend, and was surprised by a 40 percent month-on-month increase. They want per-team attribution and early warning of overruns. (Choose TWO.)',
    options: [
      'Define a tagging standard, apply cost allocation tags, and activate them in the Billing console',
      'Create AWS Budgets per team with alert thresholds that notify before the limit is reached',
      'Enable Cost Explorer and review the monthly report at month end',
      'Enable consolidated billing to reduce the total cost',
      'Ask each team to submit a monthly spend estimate spreadsheet',
    ],
    answers: [0, 1],
    why: 'Attribution requires cost allocation tags — and crucially they must be activated in the Billing console before they appear in cost reports, which is the step teams most often miss. Budgets with threshold alerts supply the early warning, notifying at a configured percentage of forecast or actual spend rather than after the fact. Tags answer "who spent it", budgets answer "tell me before it is too late".',
    wrongReasons: {
      2: 'Cost Explorer is a useful analysis tool but reviewing at month end is exactly the after-the-fact discovery that caused the surprise.',
      3: 'Consolidated billing aggregates invoices and can improve volume tiering, but it does not attribute spend to teams or warn of overruns.',
      4: 'Manual estimates are neither accurate nor timely, and do not reflect real usage.',
    },
    concept: 'Cost allocation tags (activated in Billing) for attribution; AWS Budgets alerts for early warning.',
    docs: 'https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html',
  }),
];
