/**
 * questionBankV2_saaExtras.js — 30 more SAA-C03 scenario questions
 * generated from the real SAA-C03 dumps PDF. Same schema as v2.
 *
 * Spans VPC, EC2, RDS, S3, IAM, ECS, Lambda, CloudFront, Route 53, Direct
 * Connect, X-Ray, Hybrid, DR, Cost Optimisation, ML services — designed
 * to be HARDER than the live exam so the user is well-prepared.
 */

const T = {
  STORAGE: 'Storage', COMPUTE: 'Compute', SECURITY: 'Security',
  NETWORKING: 'Networking', DATABASE: 'Database', PRICING: 'Pricing',
  MONITORING: 'Monitoring', INTEGRATION: 'Integration', MIGRATION: 'Migration',
  ANALYTICS: 'Analytics', ML_AI: 'ML/AI', DEVOPS: 'DevOps',
};

function pq(id, q) {
  return {
    id, certIds: q.certIds, domainIds: q.domainIds || [],
    difficulty: 'medium', // legacy mapping
    service: q.service || [], type: 'single',
    q: q.scenario, options: q.options, answer: q.answer,
    why: q.why, wrongReasons: q.wrongReasons || {},
    docs: q.docs || null,
    level: 'Associate', topic: q.topic, concept: q.concept,
    learningTopic: q.learningTopic || null,
    lastVerified: '2026-05-24',
  };
}

export const SAA_V2_EXTRAS = [
  // ─── VPC + Networking heavy ───
  pq('saav2-101', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.NETWORKING, service: ['vpc', 'transit-gateway'],
    scenario: 'A company has 15 VPCs across multiple AWS Regions that need to communicate with each other AND with three on-premises data centres connected via Direct Connect. They want to minimise the number of VPC peering connections and Direct Connect gateways managed. Which solution best meets the requirement?',
    options: [
      'Create a full-mesh VPC peering between every pair of VPCs',
      'Use AWS Transit Gateway as a central hub with VPC + Direct Connect attachments',
      'Use a single AWS Site-to-Site VPN as the hub for all VPCs',
      'Use VPC sharing with AWS Resource Access Manager across the entire org',
    ],
    answer: 1,
    why: 'AWS Transit Gateway acts as a regional hub that VPCs, Direct Connect gateways, and VPN connections all attach to. Instead of N×(N-1)/2 = 105 peering connections for 15 VPCs, you have ONE central TGW per region with 15 attachments. Inter-region TGW peering links them across regions, and Direct Connect gateways attach for on-prem connectivity. This is the AWS-recommended hub-and-spoke pattern at scale.',
    wrongReasons: {
      0: 'Full mesh peering = 105 connections for 15 VPCs — operationally unmanageable, and peering does not support transitive routing through a hub.',
      2: 'A Site-to-Site VPN is for on-prem connectivity, not VPC-to-VPC routing. It also has a hard 1.25 Gbps limit per tunnel.',
      3: 'VPC sharing lets multiple accounts use the SAME VPC — it does not connect different VPCs together.',
    },
    concept: 'Transit Gateway as the hub-and-spoke connectivity model at scale.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html',
  }),

  pq('saav2-102', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.NETWORKING, service: ['vpc-endpoint', 's3'],
    scenario: 'An application running in a private subnet must read from S3 AND from DynamoDB without any internet egress. The team wants the lowest cost. Which combination is best?',
    options: [
      'Two Interface VPC Endpoints — one for S3, one for DynamoDB',
      'One Gateway VPC Endpoint for S3 + one Gateway VPC Endpoint for DynamoDB',
      'A NAT Gateway in a public subnet to reach S3 and DynamoDB',
      'One Interface VPC Endpoint for S3 + one Gateway VPC Endpoint for DynamoDB',
    ],
    answer: 1,
    why: 'S3 and DynamoDB are the TWO services that support FREE Gateway VPC Endpoints — there is no hourly charge or data-processing fee. Each adds a route in the VPC route table and traffic stays on the AWS backbone. Using both costs $0 and avoids NAT Gateway charges of ~$32/mo + $0.045/GB processed.',
    wrongReasons: {
      0: 'Interface Endpoints (powered by PrivateLink) charge $0.01/hour per AZ + $0.01/GB — far more expensive than the free Gateway Endpoints for S3/DynamoDB.',
      2: 'A NAT Gateway is for general internet egress and costs ~$32/mo minimum plus $0.045/GB processed — wasteful when the traffic is only to S3 + DynamoDB.',
      3: 'S3 supports BOTH Gateway and Interface endpoints, but Gateway is free; mixing isn\'t necessary here.',
    },
    concept: 'Gateway VPC Endpoints (free) for S3 + DynamoDB vs Interface Endpoints (paid).',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html',
  }),

  pq('saav2-103', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.NETWORKING, service: ['nacl', 'security-group'],
    scenario: 'A security audit finds that an EC2 instance in a private subnet is being targeted by a specific malicious IP (203.0.113.50). The team wants to BLOCK only that one IP at the subnet level for ALL instances in the subnet, with minimal management effort.',
    options: [
      'Add an inbound DENY rule for 203.0.113.50/32 in the Network ACL of the subnet',
      'Add an inbound DENY rule for 203.0.113.50/32 in every EC2 Security Group',
      'Create a new Security Group with the deny rule and re-attach it to every instance',
      'Add the IP to AWS WAF — Security Groups cannot deny',
    ],
    answer: 0,
    why: 'Network ACLs operate at the SUBNET level and support both ALLOW and DENY rules. A single DENY entry for 203.0.113.50/32 covers every instance in that subnet, present and future, with no per-instance config. Security Groups can only ALLOW (implicit deny) — they cannot express a targeted block of one IP while allowing others.',
    wrongReasons: {
      1: 'Security Groups have ALLOW-only rules. You cannot express "deny one IP but allow others".',
      2: 'Same problem as option 1 — SGs cannot deny. Plus re-attaching SGs across many instances is high effort.',
      3: 'WAF only protects HTTP/S endpoints (CloudFront / ALB / API Gateway) — it cannot block traffic to an EC2 instance in a private subnet directly.',
    },
    concept: 'NACL DENY rules for subnet-level IP block-listing.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html',
  }),

  pq('saav2-104', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.NETWORKING, service: ['route53', 'failover'],
    scenario: 'A company runs a critical web app in us-east-1. During regional outages, traffic must automatically fail over to us-west-2 within 60 seconds. Both regions have identical ALB-fronted stacks. Which Route 53 configuration is best?',
    options: [
      'Failover routing with health checks on both ALBs, primary us-east-1 / secondary us-west-2',
      'Latency-based routing pointing to both ALBs',
      'Weighted routing 100/0 — change weights manually on failure',
      'Multi-value answer records returning both ALBs',
    ],
    answer: 0,
    why: 'Route 53 Failover routing with health checks is the canonical active-passive DR pattern. Route 53 monitors the primary endpoint every 30 seconds; when 3 consecutive checks fail, it serves the secondary. With a TTL of 60 seconds, end-to-end failover is well under the 60-second budget.',
    wrongReasons: {
      1: 'Latency routing always picks the lowest-latency endpoint — it doesn\'t guarantee primary preference or do active-passive.',
      2: 'Manual weight changes are not automatic and require human action — does not meet the 60-second SLA.',
      3: 'Multi-value returns up to 8 healthy records but clients pick at random — not deterministic active-passive.',
    },
    concept: 'Route 53 Failover routing + ALB health check + low TTL for fast cross-region DR.',
    docs: 'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover.html',
  }),

  // ─── EC2 + AutoScaling ───
  pq('saav2-105', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.COMPUTE, service: ['ec2', 'spot', 'asg'],
    scenario: 'A batch-rendering workload runs daily for 4 hours on EC2. The work is interruptible (each frame is independent). Cost is the only constraint — duration flexibility is acceptable. Which mix is most cost-effective?',
    options: [
      'Auto Scaling Group with 100% On-Demand instances',
      'Auto Scaling Group mixed-instances policy: 0% On-Demand baseline + 100% Spot above the baseline',
      'Reserved Instances purchased upfront for 1 year',
      'Dedicated Hosts for predictable per-physical-server billing',
    ],
    answer: 1,
    why: 'A mixed-instances Auto Scaling Group with 0 On-Demand baseline and 100% Spot above gives the deepest discount (up to 90% off) for interruptible batch work. The ASG automatically diversifies across instance types to maximise capacity availability. Each frame being independent means a Spot interruption just retries the frame elsewhere — no data loss.',
    wrongReasons: {
      0: '100% On-Demand is the most expensive choice — no discount applied.',
      2: 'Reserved Instances commit to 24/7 usage; a 4-hour-per-day workload only uses ~16% of the reserved capacity.',
      3: 'Dedicated Hosts charge a flat per-server fee whether you use them or not — even worse than On-Demand for short workloads.',
    },
    concept: 'ASG mixed-instances policy with 100% Spot for interruptible workloads.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-purchase-options.html',
  }),

  pq('saav2-106', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.COMPUTE, service: ['ec2', 'ami'],
    scenario: 'A company wants to launch identical EC2 instances in 5 AWS Regions from a single golden image they maintain. Which AWS feature creates copies of their AMI in the other 4 regions automatically when they publish a new version?',
    options: [
      'EC2 Image Builder with cross-region distribution configuration',
      'Manually copy the AMI to each region after every build',
      'AWS Systems Manager Patch Manager with multi-region target',
      'AWS Backup with cross-region replication',
    ],
    answer: 0,
    why: 'EC2 Image Builder automates the entire pipeline: build → test → distribute the AMI to multiple regions in a single workflow. The distribution configuration lets you specify all target regions; each new build version automatically lands in each. This eliminates manual `aws ec2 copy-image` calls and keeps every region in lockstep.',
    wrongReasons: {
      1: 'Manual copy works but doesn\'t scale to frequent releases and is the OPPOSITE of "automatic".',
      2: 'Patch Manager applies patches to RUNNING instances — it doesn\'t produce or copy AMIs.',
      3: 'AWS Backup is for backing up EBS / RDS / EFS — it doesn\'t orchestrate AMI builds.',
    },
    concept: 'EC2 Image Builder + cross-region distribution for golden-AMI pipelines.',
    docs: 'https://docs.aws.amazon.com/imagebuilder/latest/userguide/cross-account-dist.html',
  }),

  pq('saav2-107', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.MONITORING, service: ['xray', 'lambda'],
    scenario: 'A serverless application spans API Gateway → Lambda → DynamoDB → another Lambda. End-to-end requests are slow but the team can\'t pinpoint which service adds the latency. Which AWS service gives a per-segment trace across all four hops?',
    options: [
      'CloudWatch Logs Insights — query log streams from each service',
      'AWS X-Ray with X-Ray SDK instrumentation in both Lambdas',
      'CloudWatch ServiceLens for the entire VPC',
      'Amazon Detective to investigate the latency',
    ],
    answer: 1,
    why: 'AWS X-Ray provides distributed tracing — a single trace ID follows a request as it hops between services, producing per-segment timing (API Gateway segment, Lambda segment, DynamoDB segment, second Lambda segment). With the X-Ray SDK in each Lambda, you see exactly which hop dominates latency. This is the only AWS-native distributed-tracing tool.',
    wrongReasons: {
      0: 'CloudWatch Logs Insights queries logs but doesn\'t correlate one logical request across services with timing.',
      2: 'ServiceLens uses X-Ray under the hood, but as the option it\'s incomplete — you must enable X-Ray first.',
      3: 'Amazon Detective is for security investigation (GuardDuty findings), not application latency.',
    },
    concept: 'X-Ray distributed tracing for multi-service latency root-cause.',
    docs: 'https://docs.aws.amazon.com/xray/latest/devguide/xray-services-lambda.html',
  }),

  // ─── Storage + S3 ───
  pq('saav2-108', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    topic: T.STORAGE, service: ['s3', 'glacier', 'lifecycle'],
    scenario: 'A SaaS company stores user invoices in S3. Invoices < 30 days old are read frequently; 30-90 days they are rare; > 90 days they are accessed maybe once a year, and after 7 years they can be deleted. Cost must be optimised automatically with no manual touch.',
    options: [
      'Lifecycle: 0-30d Standard → 30d Standard-IA → 90d Glacier Flexible Retrieval → expire at 2,555 days',
      'Use S3 Intelligent-Tiering for everything',
      'Keep everything in S3 Standard and manually delete after 7 years',
      'Move everything to Glacier Deep Archive on upload',
    ],
    answer: 0,
    why: 'A multi-step lifecycle rule perfectly matches the documented access pattern — Standard while hot, IA for the 30-90 day cold-ish window, Glacier Flexible Retrieval (minutes-hours) for the rare yearly access, expiration at 7 years (2,555 days). Total cost is minimised at every age while the data is automatically tiered with zero ongoing operations.',
    wrongReasons: {
      1: 'Intelligent-Tiering is great when access patterns are UNPREDICTABLE — here they are documented and predictable, so a deterministic lifecycle rule is cheaper (no monitoring fee).',
      2: 'Keeping everything in Standard for 7 years is ~23× more expensive than the tiered approach for cold data.',
      3: 'Deep Archive has a 12-hour retrieval SLA — too slow for the < 30-day hot reads.',
    },
    concept: 'Multi-stage S3 lifecycle rule for known cold-ageing patterns.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html',
  }),

  pq('saav2-109', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.STORAGE, service: ['ebs', 'snapshot'],
    scenario: 'A team accidentally deletes a production EC2 instance with attached EBS volumes. They need to recover the data. EBS snapshots were taken every 6 hours. Which is the fastest way to restore the EBS volume?',
    options: [
      'Restore the most recent snapshot to a new EBS volume in the same AZ and attach it to a new instance',
      'Contact AWS Support and ask them to recover the original volume',
      'Wait for AWS to auto-restore from the snapshot',
      'Use Amazon FSx to reconstruct the volume',
    ],
    answer: 0,
    why: 'EBS snapshots stored in S3 can be restored to a new EBS volume in any AZ within the region in seconds-to-minutes. You then attach the new volume to a fresh or existing EC2 instance. This is the standard EBS DR pattern and is fully self-service.',
    wrongReasons: {
      1: 'AWS Support cannot recover a deleted volume — once deleted, data is unrecoverable unless you have snapshots.',
      2: 'AWS does not auto-restore — you must explicitly create a volume from the snapshot.',
      3: 'FSx is a separate managed file-system service — it has no role in EBS volume recovery.',
    },
    concept: 'EBS snapshots stored in S3 — restore creates a new volume in any AZ.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-restoring-volume.html',
  }),

  pq('saav2-110', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.STORAGE, service: ['fsx', 'windows'],
    scenario: 'A Windows-based application running on EC2 needs a fully managed shared file system that supports SMB protocol, Active Directory integration, and Windows ACLs. Which service is the best fit?',
    options: [
      'Amazon EFS',
      'Amazon FSx for Windows File Server',
      'Amazon S3 with SMB gateway',
      'Self-managed Windows DFS on EC2',
    ],
    answer: 1,
    why: 'FSx for Windows File Server is a fully managed native Windows file system that supports SMB 2 and 3, integrates with Active Directory (self-managed or AWS Managed AD), enforces Windows ACLs, and supports DFS namespaces. It is purpose-built for Windows workloads — no patching or AD trust setup required from you.',
    wrongReasons: {
      0: 'EFS is NFS-based — suitable for Linux, not native Windows ACLs or SMB.',
      2: 'S3 is object storage; gateways can expose it as SMB but with eventual-consistency caveats and no native ACL support.',
      3: 'Self-managed DFS on EC2 means YOU patch / monitor / back up — exactly what "fully managed" rules out.',
    },
    concept: 'FSx for Windows File Server as the managed SMB/AD/Windows-ACL file system.',
    docs: 'https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html',
  }),

  // ─── Database ───
  pq('saav2-111', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.DATABASE, service: ['aurora', 'global-database'],
    scenario: 'A company runs an application using Aurora MySQL in eu-west-1. They need read scaling in 3 other regions (us-east-1, ap-south-1, sa-east-1) with < 1 second cross-region replication lag for disaster recovery. Which Aurora feature meets this?',
    options: [
      'Aurora Global Database with a primary region and 3 secondary regions',
      'Aurora Read Replicas in each region',
      'Cross-region RDS snapshot copy on a schedule',
      'Use AWS DMS to replicate continuously to 3 other RDS instances',
    ],
    answer: 0,
    why: 'Aurora Global Database is purpose-built for cross-region replication with typically < 1 second lag, supports up to 5 secondary regions, and provides fast region-level failover. Storage-level replication runs at the storage layer (not via SQL log shipping), so there\'s no application impact.',
    wrongReasons: {
      1: 'Aurora Read Replicas exist only within one region — not cross-region.',
      2: 'Snapshot copies are point-in-time and add tens-of-minutes of lag — far worse than < 1 second.',
      3: 'DMS adds operational complexity (replication instance, tasks, schemas) and typically has multi-second lag.',
    },
    concept: 'Aurora Global Database for sub-second cross-region replication.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html',
  }),

  pq('saav2-112', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.DATABASE, service: ['dynamodb', 'gsi'],
    scenario: 'A DynamoDB table has primary key (PK = userId, SK = orderId) and is queried by userId regularly. A new requirement: query orders by `status` (e.g. all "shipped" orders) across all users. Which DynamoDB feature solves this with the least cost and operational complexity?',
    options: [
      'Add a Global Secondary Index (GSI) with `status` as the partition key',
      'Add a Local Secondary Index (LSI) with `status` as the sort key',
      'Scan the full table and filter by status in the application',
      'Migrate the table to RDS for SQL filtering',
    ],
    answer: 0,
    why: 'A Global Secondary Index (GSI) with `status` as the partition key creates a separate index where every item is stored under its status value. Queries by status are then efficient single-partition lookups. GSIs can be added to an existing table, can have their own capacity, and project the attributes you choose.',
    wrongReasons: {
      1: 'LSIs require the SAME partition key (userId) — cannot query "all users by status".',
      2: 'Scans read EVERY item in the table — at hundreds of GB this is slow and expensive (full-table cost per scan).',
      3: 'Migrating away from DynamoDB is a massive over-engineering for one new query pattern.',
    },
    concept: 'DynamoDB GSI for alternate query patterns on an existing table.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html',
  }),

  // ─── Security + IAM ───
  pq('saav2-113', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    topic: T.SECURITY, service: ['iam', 'sts', 'cross-account'],
    scenario: 'Account A wants to give an EC2 instance in Account B temporary read-only access to an S3 bucket owned by Account A. Long-lived access keys must be avoided. Which is the most secure pattern?',
    options: [
      'Create an IAM role in Account A trusted by Account B, attach S3 read-only policy. Account B EC2 instance assumes the role via STS',
      'Create an IAM user in Account A with read-only access and share its access key with Account B',
      'Make the S3 bucket public so Account B can read it',
      'Create a VPC peering connection between Account A and Account B',
    ],
    answer: 0,
    why: 'Cross-account IAM role assumption via STS is the AWS-recommended pattern for "Account B accesses Account A". Account A defines a role with the desired permissions and a trust policy naming Account B. Account B\'s EC2 instance assumes the role with sts:AssumeRole, gets temporary credentials, and accesses the bucket — no long-lived keys exchanged.',
    wrongReasons: {
      1: 'Sharing access keys across accounts is forbidden by security best practice — they cannot be rotated easily and leak risk is high.',
      2: 'Making the bucket public exposes data to everyone on the internet, not just Account B.',
      3: 'VPC peering is for network-level connectivity, not IAM permissions — irrelevant to S3 access.',
    },
    concept: 'Cross-account IAM role + STS AssumeRole pattern.',
    docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html',
  }),

  pq('saav2-114', {
    certIds: ['saa-c03'], domainIds: ['saa-d1'],
    topic: T.SECURITY, service: ['kms', 'multi-region-key'],
    scenario: 'A company encrypts data with KMS in us-east-1. They want to replicate the encrypted objects to eu-west-1 so they can be decrypted there WITHOUT re-encrypting and without sharing keys cross-region. Which KMS feature solves this?',
    options: [
      'Multi-Region KMS keys with replica keys in eu-west-1',
      'Create a separate KMS key in eu-west-1 and re-encrypt the data on copy',
      'Export the KMS key material and import it into eu-west-1',
      'Use KMS grants to extend the us-east-1 key to eu-west-1',
    ],
    answer: 0,
    why: 'Multi-Region KMS keys share the same key ID and key material across regions but exist as separate, independently auditable KMS keys in each region. Encrypted data can be decrypted in ANY region where a replica exists, with no re-encryption — exactly the scenario described.',
    wrongReasons: {
      1: 'Re-encrypting on copy is expensive (compute + API calls), adds latency, and creates two different ciphertexts that can\'t cross-decrypt.',
      2: 'KMS key material cannot be EXPORTED for security reasons (only imported once at creation time for BYOK).',
      3: 'Grants delegate permissions on a single key but don\'t extend across regions.',
    },
    concept: 'KMS Multi-Region keys for cross-region decryption of the same ciphertext.',
    docs: 'https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html',
  }),

  // ─── Hybrid + Migration ───
  pq('saav2-115', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.MIGRATION, service: ['directconnect', 'vpn'],
    scenario: 'A company is deploying a new Direct Connect link with 10 Gbps capacity. They need a backup connection that automatically takes over if Direct Connect fails. Which architecture provides this?',
    options: [
      'AWS Site-to-Site VPN as a backup with BGP — both connections active, AWS prefers Direct Connect',
      'A second Direct Connect link in the same colo facility',
      'AWS Client VPN as a backup',
      'AWS Storage Gateway as a backup',
    ],
    answer: 0,
    why: 'Running an active Site-to-Site VPN alongside Direct Connect, both with BGP, is the AWS-recommended HA pattern. AWS prefers Direct Connect for routing (as it has a higher BGP local preference); if the DX BGP session drops, traffic automatically fails over to the VPN tunnel. Very cost-effective compared to a second DX link.',
    wrongReasons: {
      1: 'A second DX link in the SAME colo doesn\'t protect against the colo facility failing — different failure domain needed.',
      2: 'Client VPN is for individual users connecting to AWS, not site-to-site bulk traffic.',
      3: 'Storage Gateway is for hybrid storage, not network connectivity.',
    },
    concept: 'Active Site-to-Site VPN as automatic backup to Direct Connect via BGP.',
    docs: 'https://docs.aws.amazon.com/directconnect/latest/UserGuide/Resiliency_Toolkit.html',
  }),

  pq('saav2-116', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.MIGRATION, service: ['datasync', 's3'],
    scenario: 'A company needs to continuously synchronize 5 TB of data from an on-premises NFS file server to Amazon S3 over their existing 1 Gbps internet link, with automatic transfer scheduling and verification. Which service is purpose-built for this?',
    options: [
      'AWS DataSync',
      'AWS Storage Gateway in Volume mode',
      'AWS Snowball Edge',
      'rsync over SSH to an EC2 instance',
    ],
    answer: 0,
    why: 'AWS DataSync is purpose-built for repeated, automated, verified transfers between on-prem storage (NFS, SMB, HDFS) and AWS storage services (S3, EFS, FSx). It uses a lightweight agent on-prem, transfers in parallel for speed, performs integrity checks, and supports schedules — exactly the use case described.',
    wrongReasons: {
      1: 'Storage Gateway Volume mode is for iSCSI block storage backed by S3, not file synchronisation.',
      2: 'Snowball Edge is for one-time bulk migrations when bandwidth is the bottleneck (not relevant at 1 Gbps).',
      3: 'rsync works but lacks automatic scheduling, parallelism tuning, and integrity verification metadata that DataSync provides.',
    },
    concept: 'AWS DataSync for repeated automated on-prem ↔ AWS sync.',
    docs: 'https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html',
  }),

  // ─── Compute + Containers ───
  pq('saav2-117', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.COMPUTE, service: ['ecs', 'fargate'],
    scenario: 'A team wants to run a microservices application in containers without managing EC2 instances, OS patching, or cluster scaling. Each microservice has different CPU/memory requirements. Which service combination fits?',
    options: [
      'ECS with Fargate launch type — one task definition per microservice',
      'EC2 instances running Docker manually',
      'EKS with self-managed worker nodes',
      'AWS Batch for each microservice',
    ],
    answer: 0,
    why: 'ECS with Fargate is fully serverless containers — AWS manages the underlying compute, OS, patching, and scaling. Each microservice gets its own task definition with custom CPU/memory, scales independently, and pays per-second for actual usage. Ideal when you want containers without infrastructure management.',
    wrongReasons: {
      1: 'Self-managed EC2 + Docker means YOU patch the OS, scale the cluster, monitor health — explicitly what the user wants to avoid.',
      2: 'EKS with self-managed nodes still requires you to manage worker nodes (patching, scaling). EKS Fargate would be acceptable.',
      3: 'AWS Batch is for batch / scheduled compute jobs, not always-on microservices behind an API.',
    },
    concept: 'ECS Fargate for serverless containers — no EC2 management.',
    docs: 'https://docs.aws.amazon.com/AmazonECS/latest/userguide/AWS_Fargate.html',
  }),

  pq('saav2-118', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.COMPUTE, service: ['lambda', 'vpc'],
    scenario: 'A Lambda function needs to query an RDS PostgreSQL database running in a private subnet. The Lambda also needs internet access to call a third-party API. What\'s the correct VPC setup?',
    options: [
      'Place Lambda in the VPC private subnets that have a NAT Gateway route for internet egress',
      'Place Lambda in public subnets so it has direct internet access',
      'Lambda doesn\'t need to be in a VPC to reach RDS or the internet',
      'Use VPC Peering between Lambda\'s service VPC and your VPC',
    ],
    answer: 0,
    why: 'Lambda functions attached to a VPC inherit the subnets\' routing — to reach RDS in a private subnet, Lambda joins the VPC; to reach the internet (third-party API), Lambda needs routes via a NAT Gateway from those private subnets. Putting Lambda in PUBLIC subnets does NOT give it internet — Lambda ENIs don\'t get auto-assigned public IPs.',
    wrongReasons: {
      1: 'Lambda ENIs in public subnets do not receive a public IP — they cannot egress to the internet.',
      2: 'RDS in a PRIVATE subnet is not reachable from a non-VPC Lambda; the function must be VPC-attached.',
      3: 'VPC peering is account-to-account or VPC-to-VPC; it doesn\'t help Lambda reach a database in the same VPC.',
    },
    concept: 'Lambda VPC attachment + NAT Gateway for both private DB access AND internet egress.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html',
  }),

  // ─── ML / AI ───
  pq('saav2-119', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.ML_AI, service: ['rekognition', 'textract'],
    scenario: 'A document-processing pipeline must extract structured data (form fields, key-value pairs, table cells) from scanned PDFs. The team does not want to train any ML models. Which service fits?',
    options: [
      'Amazon Textract',
      'Amazon Rekognition',
      'Amazon Comprehend',
      'Amazon SageMaker',
    ],
    answer: 0,
    why: 'Amazon Textract is the pre-trained AWS service for extracting TEXT, FORM key-value pairs, and TABLE structures from PDFs and images. It\'s designed for exactly the document-processing use case described — no model training needed, just call the API.',
    wrongReasons: {
      1: 'Rekognition handles images and videos (face detection, content moderation, label detection) — not structured document extraction.',
      2: 'Comprehend does NLP (sentiment, entities, key phrases) on existing TEXT — it doesn\'t extract text from images.',
      3: 'SageMaker would require building/training a custom OCR model — directly contradicting "no model training".',
    },
    concept: 'Textract for pre-trained document text + form + table extraction.',
    docs: 'https://docs.aws.amazon.com/textract/latest/dg/what-is.html',
  }),

  pq('saav2-120', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.ML_AI, service: ['bedrock', 'rag'],
    scenario: 'A team wants to build a chatbot that answers questions using the company\'s internal knowledge base (5,000 PDF documents). They need to use a foundation model (LLM) without training one. Which AWS pattern fits?',
    options: [
      'Use Amazon Bedrock with Retrieval-Augmented Generation (RAG) backed by Amazon OpenSearch Serverless vector store',
      'Train a custom GPT-style model on SageMaker from scratch',
      'Upload the PDFs to S3 and use Amazon Translate for answers',
      'Use Amazon Lex with hard-coded intents per PDF',
    ],
    answer: 0,
    why: 'Bedrock + RAG + OpenSearch Serverless is the AWS-recommended pattern for "chat over my documents". Bedrock provides foundation models (Claude, Llama, Titan) you don\'t train. OpenSearch Serverless stores vector embeddings of your PDFs. At query time you embed the question, retrieve top-K relevant chunks, and pass them as context to the LLM — giving accurate, source-grounded answers.',
    wrongReasons: {
      1: 'Training a foundation model from scratch costs millions and the question explicitly says "without training".',
      2: 'Amazon Translate is for language translation, not document Q&A.',
      3: 'Lex requires you to hand-craft intents for every possible question — does not scale to 5,000 documents.',
    },
    concept: 'Bedrock + OpenSearch Serverless vectors for RAG-based document Q&A.',
    docs: 'https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html',
  }),

  // ─── Cost optimisation ───
  pq('saav2-121', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'],
    topic: T.PRICING, service: ['rds', 'snapshot'],
    scenario: 'A development RDS MySQL instance is used heavily during business hours but completely idle nights and weekends. The team wants to minimise cost without compromising development data. Which strategy?',
    options: [
      'Stop the RDS instance outside business hours via EventBridge + Lambda; start it weekday mornings',
      'Delete the instance every evening and restore from snapshot in the morning',
      'Resize to a smaller instance class every evening',
      'Use Aurora Serverless v1 with scale-to-zero',
    ],
    answer: 0,
    why: 'RDS supports stop/start for up to 7 days at a time. Stopping the instance pauses compute charges (you still pay storage). Automating stop at evening + start at morning via an EventBridge cron rule + a Lambda is the simplest, AWS-recommended pattern for dev environments. No data loss, no snapshot juggling.',
    wrongReasons: {
      1: 'Snapshot delete/restore wastes engineer time and adds 5-30 minute morning startup latency.',
      2: 'Resizing classes incurs downtime on every change and the smallest size still bills hourly.',
      3: 'Aurora Serverless v1 scale-to-zero was deprecated; v2 has a minimum capacity floor — not free at idle.',
    },
    concept: 'RDS stop/start via EventBridge scheduled Lambda for off-hours savings.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html',
  }),

  pq('saav2-122', {
    certIds: ['saa-c03'], domainIds: ['saa-d4'],
    topic: T.PRICING, service: ['s3', 'intelligent-tiering'],
    scenario: 'A company stores 200 TB of data on S3 where access patterns are UNPREDICTABLE — some objects suddenly become hot for a week then go cold. They want automatic cost optimisation without lifecycle policy maintenance. Which storage class fits?',
    options: [
      'S3 Intelligent-Tiering',
      'S3 Standard with a complex lifecycle policy',
      'S3 Standard-IA for everything',
      'S3 Glacier Deep Archive',
    ],
    answer: 0,
    why: 'S3 Intelligent-Tiering automatically moves objects between Frequent, Infrequent, and Archive access tiers based on actual access patterns at the OBJECT level. There\'s no retrieval fee and no manual rule tuning. For unpredictable access patterns, the small per-object monitoring fee (~$0.0025/1000 objects) is more than offset by tier savings.',
    wrongReasons: {
      1: 'Lifecycle rules require you to predict the pattern — exactly what unpredictable access means you can\'t.',
      2: 'Standard-IA charges retrieval fees per GB and per request — risky if objects sometimes become hot.',
      3: 'Deep Archive has a 12-hour retrieval SLA — incompatible with objects suddenly becoming hot.',
    },
    concept: 'S3 Intelligent-Tiering for unpredictable access patterns.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html#sc-dynamic-data-access',
  }),

  // ─── Integration ───
  pq('saav2-123', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.INTEGRATION, service: ['eventbridge', 'lambda'],
    scenario: 'A company wants to receive a Slack notification within 1 second of any IAM user being created in their AWS account. Which architecture is simplest?',
    options: [
      'EventBridge rule on IAM CreateUser event → Lambda → Slack webhook',
      'Poll CloudTrail every minute with a Lambda function',
      'Use AWS Config managed rule to detect IAM users',
      'Set up an SNS topic and have IAM publish to it',
    ],
    answer: 0,
    why: 'EventBridge captures management-plane events (including IAM CreateUser) within seconds and can route them directly to a Lambda target. Lambda then calls the Slack incoming webhook URL. Total time from IAM action to Slack message: < 2 seconds. No polling, no infrastructure.',
    wrongReasons: {
      1: 'Polling every minute means up to 60-second latency — fails the 1-second SLA.',
      2: 'AWS Config evaluates periodically (not in real-time) — typically minutes of delay.',
      3: 'IAM does not natively publish to SNS topics; you need EventBridge as the bridge.',
    },
    concept: 'EventBridge rule on IAM events → Lambda → Slack for real-time alerts.',
    docs: 'https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-iam-event.html',
  }),

  pq('saav2-124', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.INTEGRATION, service: ['sqs', 'dlq'],
    scenario: 'An SQS-triggered Lambda function occasionally fails when processing certain messages. The team wants to isolate the failing messages for manual investigation while letting the rest of the queue continue processing normally. What\'s the standard pattern?',
    options: [
      'Configure a Dead-Letter Queue on the source queue with maxReceiveCount = 3',
      'Manually delete the failing messages each morning',
      'Disable the Lambda whenever a failure occurs',
      'Switch from SQS to Kinesis Data Streams',
    ],
    answer: 0,
    why: 'A Dead-Letter Queue (DLQ) is an SQS queue that receives messages that failed processing maxReceiveCount times. The main queue continues processing other messages while the failing ones move to the DLQ for investigation. This is the AWS-canonical pattern for handling poison messages without halting the pipeline.',
    wrongReasons: {
      1: 'Manual deletion is reactive, slow, and loses the message contents needed for investigation.',
      2: 'Disabling the Lambda halts processing for ALL messages, not just the failing ones — defeats the goal.',
      3: 'Kinesis solves a different problem (ordered streaming); it doesn\'t inherently isolate poison messages.',
    },
    concept: 'SQS Dead-Letter Queue for poison-message isolation.',
    docs: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html',
  }),

  pq('saav2-125', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.INTEGRATION, service: ['step-functions'],
    scenario: 'A team needs to orchestrate a workflow: validate input → call 3 Lambdas in parallel → wait for all 3 → conditionally call a 4th Lambda. They need visual workflow tracking and built-in error handling. Which service fits?',
    options: [
      'AWS Step Functions Standard workflow',
      'AWS Lambda functions calling each other directly',
      'Amazon SQS chained queues',
      'Amazon SNS fan-out with manual coordination',
    ],
    answer: 0,
    why: 'Step Functions is purpose-built for multi-step Lambda orchestration. The Standard workflow type supports parallel (Parallel state), conditional branches (Choice state), retries and catches per step, and provides a visual execution graph. End-to-end orchestration with built-in error handling — exactly the use case.',
    wrongReasons: {
      1: 'Lambdas calling each other directly creates tight coupling, no built-in retries, and no visual tracking.',
      2: 'Chained SQS queues can fan out but don\'t natively support "wait for all 3 parallel branches".',
      3: 'SNS fan-out is one-to-many publish; coordinating "wait for all 3" requires custom code in each subscriber.',
    },
    concept: 'Step Functions Standard for visual Lambda orchestration with parallelism.',
    docs: 'https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html',
  }),

  // ─── Analytics ───
  pq('saav2-126', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.ANALYTICS, service: ['kinesis', 'firehose'],
    scenario: 'An IoT fleet streams 100k events per second to AWS. The team wants the events delivered to S3 in JSON Lines format, batched every 5 minutes, with no servers to manage. Which service combination fits best?',
    options: [
      'Devices → Amazon Kinesis Data Firehose with S3 destination + buffer 5 min',
      'Devices → Amazon Kinesis Data Streams → Lambda → S3 writes',
      'Devices → SQS standard queue → Lambda → S3 writes',
      'Devices → API Gateway → Lambda → S3 writes',
    ],
    answer: 0,
    why: 'Kinesis Data Firehose is fully managed delivery — it auto-scales to ingest streaming data and writes to S3 in batches based on a size or time buffer (5 min here). No servers, no Lambda code to write, automatic compression and format conversion if needed. Perfect for "stream to S3 at scale".',
    wrongReasons: {
      1: 'Data Streams + Lambda + S3 works but requires you to write the Lambda batching/write code yourself — more operational overhead than Firehose.',
      2: 'SQS has a 256KB message size limit and isn\'t designed for high-throughput continuous ingestion to S3.',
      3: 'API Gateway adds per-request latency and a 29-second timeout — unsuitable for 100k events/sec.',
    },
    concept: 'Kinesis Data Firehose for managed streaming-to-S3.',
    docs: 'https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html',
  }),

  pq('saav2-127', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.ANALYTICS, service: ['athena', 'glue'],
    scenario: 'A team has 5 TB of clickstream logs in S3 partitioned by date. They want to run ad-hoc SQL queries with the LOWEST cost per query. Which combination is optimal?',
    options: [
      'Use Athena with Parquet-formatted data and partition projection',
      'Load data into Redshift and query from there',
      'Use Athena on raw CSV without partitioning',
      'Use EMR with Spark on every query',
    ],
    answer: 0,
    why: 'Athena charges per TB SCANNED. Converting to Parquet (columnar + compressed) reduces data scanned by 80-95% vs CSV. Partition projection avoids the partition-discovery overhead. Together, ad-hoc queries that would cost $5+ each on raw CSV often cost cents on partitioned Parquet — and there\'s no cluster to manage.',
    wrongReasons: {
      1: 'Redshift requires a provisioned cluster (~$0.25/hr minimum); ad-hoc queries don\'t justify a 24/7 cluster.',
      2: 'Athena on raw CSV without partitions scans EVERY object every query — most expensive option.',
      3: 'EMR Spark clusters cost dollars per hour just to be alive — vastly more expensive than serverless Athena for ad-hoc.',
    },
    concept: 'Athena cost optimisation: Parquet + partitioning + projection.',
    docs: 'https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html',
  }),

  // ─── DevOps ───
  pq('saav2-128', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.DEVOPS, service: ['config', 'remediation'],
    scenario: 'A compliance requirement says all EBS volumes MUST be encrypted at rest. The security team wants AWS to automatically detect AND remediate any unencrypted volume created in their account. Which combination meets this?',
    options: [
      'AWS Config managed rule encrypted-volumes + Systems Manager Automation remediation document',
      'Amazon CloudWatch alarm on EBS metrics',
      'Manually audit weekly and create snapshots → re-create encrypted',
      'IAM policy that denies CreateVolume without encryption — handles detection only',
    ],
    answer: 0,
    why: 'AWS Config\'s managed rule `encrypted-volumes` detects any unencrypted EBS volume. Pair it with an automatic remediation action — a Systems Manager Automation document that creates an encrypted snapshot and replaces the volume. Continuous monitoring + auto-remediation, zero ongoing manual effort.',
    wrongReasons: {
      1: 'CloudWatch alarms watch metrics like CPU; they don\'t inspect resource configuration like encryption settings.',
      2: 'Weekly manual audits aren\'t real-time and miss the compliance SLA.',
      3: 'A deny policy prevents NEW unencrypted volumes but does nothing about ones that already exist.',
    },
    concept: 'AWS Config rule + SSM Automation for detection + auto-remediation.',
    docs: 'https://docs.aws.amazon.com/config/latest/developerguide/managed-rules-by-aws-config.html',
  }),

  pq('saav2-129', {
    certIds: ['saa-c03'], domainIds: ['saa-d2'],
    topic: T.DEVOPS, service: ['cloudformation', 'stackset'],
    scenario: 'A company manages 50 AWS accounts under AWS Organizations. They need to deploy the same IAM role + S3 bucket policy to every account. Which service deploys this stack across all accounts with one operation?',
    options: [
      'AWS CloudFormation StackSets with service-managed permissions and target = entire Organization',
      'Run `aws cloudformation create-stack` in each account manually',
      'Write a Lambda that loops through accounts and calls the API',
      'Use Terraform with 50 separate workspaces',
    ],
    answer: 0,
    why: 'StackSets is purpose-built for "the same template deployed to many accounts and/or regions". With service-managed permissions in AWS Organizations, you target the whole Org or specific OUs in one command. New accounts that join the Org automatically inherit the stack — zero ongoing operations.',
    wrongReasons: {
      1: '50 manual create-stack commands isn\'t scalable and is error-prone.',
      2: 'Writing a Lambda to loop is custom code that duplicates what StackSets already does natively.',
      3: '50 Terraform workspaces work but require per-account credentials management and don\'t auto-onboard new accounts.',
    },
    concept: 'CloudFormation StackSets for multi-account multi-region deploys.',
    docs: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html',
  }),

  pq('saav2-130', {
    certIds: ['saa-c03'], domainIds: ['saa-d3'],
    topic: T.MONITORING, service: ['cloudwatch', 'log-insights'],
    scenario: 'An application emits structured JSON logs to CloudWatch Logs. The on-call engineer needs to find every log line where the field `latencyMs > 1000` in the last 4 hours, grouped by `endpoint`. Which is the simplest tool?',
    options: [
      'CloudWatch Logs Insights with a parse + filter + stats query',
      'Export the logs to S3 and run Athena queries',
      'Stream the logs to OpenSearch and use Kibana',
      'Stream the logs to Elasticsearch on EC2',
    ],
    answer: 0,
    why: 'CloudWatch Logs Insights runs structured queries DIRECTLY against log groups with no setup or export. The query `fields @timestamp, endpoint, latencyMs | filter latencyMs > 1000 | stats count() by endpoint` answers exactly the question in seconds. No infrastructure, pay per GB scanned, perfect for ad-hoc on-call debugging.',
    wrongReasons: {
      1: 'Export to S3 + Athena requires waiting for the export to complete (often hours) — too slow for on-call.',
      2: 'OpenSearch + Kibana is a great long-term solution but requires standing up a cluster and configuring streaming first.',
      3: 'Self-managed Elasticsearch is even more operational overhead than managed OpenSearch.',
    },
    concept: 'CloudWatch Logs Insights for ad-hoc structured log analysis.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html',
  }),
];
