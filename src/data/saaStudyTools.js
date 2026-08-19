export const KEYWORD_GROUPS = [
  { title: 'Cost and operations', items: [
    ['MOST cost-effective', 'Prefer the option that meets every requirement at the lowest total cost—not simply the cheapest service.'],
    ['LEAST operational overhead', 'Prefer managed or serverless services over self-managed fleets and custom automation.'],
    ['MINIMUM changes', 'Look for adapters, gateways, compatible protocols, and migration services that preserve the workload.'],
    ['Bursty / unpredictable', 'Prefer elastic on-demand capacity, queues, Auto Scaling, and serverless compute.'],
  ]},
  { title: 'Resilience and recovery', items: [
    ['Highly available', 'Use redundant resources across Availability Zones and remove single points of failure.'],
    ['Fault tolerant', 'The workload should continue through a component failure, often with active redundancy.'],
    ['RPO', 'Maximum acceptable data loss; drives replication and backup frequency.'],
    ['RTO', 'Maximum acceptable recovery time; drives standby strategy and failover automation.'],
    ['Decouple / event-driven', 'Think SQS for buffering, SNS for fan-out, and EventBridge for routed events.'],
  ]},
  { title: 'Security and networking', items: [
    ['MOST secure', 'Apply least privilege, encryption, private paths, short-lived credentials, and centralized controls.'],
    ['Private connectivity', 'Prefer VPC endpoints, PrivateLink, Direct Connect, or VPN over public internet paths.'],
    ['Global users / low latency', 'Evaluate CloudFront for HTTP caching and Global Accelerator for network acceleration.'],
    ['Multi-AZ vs Multi-Region', 'Multi-AZ handles facility failure; Multi-Region handles regional failure and global locality.'],
  ]},
  { title: 'Workload shape', items: [
    ['Read-heavy', 'Consider read replicas, caching, DAX, CloudFront, or database-specific read scaling.'],
    ['Write-heavy', 'Partition well, buffer writes, batch where possible, and choose horizontally scalable storage.'],
    ['Durable', 'Durability protects data; do not confuse it with availability of the serving path.'],
    ['Automatically scale', 'Choose native scaling policies or serverless capacity; a load balancer alone does not add capacity.'],
  ]},
];

export const SERVICE_BATTLES = [
  ['Security Groups vs NACLs','SG: stateful, instance/ENI level, allow rules only. NACL: stateless, subnet level, ordered allow and deny rules.','Choose SGs for workload access control; add NACLs for subnet guardrails or explicit IP denies.','Forgetting ephemeral return ports on a stateless NACL.'],
  ['IAM users vs roles vs resource policies','Users are long-lived identities; roles provide temporary credentials; resource policies grant access at the resource.','Use roles for workloads and federation. Use resource policies for direct cross-account or service access where supported.','Embedding access keys or assuming every service supports resource policies.'],
  ['ALB vs NLB vs GWLB','ALB is Layer 7 HTTP routing; NLB is high-performance L4 TCP/UDP/TLS; GWLB inserts virtual network appliances.','Choose by protocol and routing need, not simply throughput.','Choosing NLB for path routing or GWLB as an application frontend.'],
  ['S3 vs EBS vs EFS vs FSx','S3 is object; EBS is AZ-scoped block; EFS is regional Linux NFS; FSx provides managed specialized file systems.','Match access protocol, sharing, operating system, latency, and availability scope.','Treating S3 as POSIX storage or EBS as a cross-AZ shared file system.'],
  ['RDS Multi-AZ vs Read Replicas','Multi-AZ is synchronous standby for availability; read replicas scale reads and may be cross-Region.','Use Multi-AZ for failover and replicas for read scaling; combine when both are required.','Sending reads to a traditional Multi-AZ standby.'],
  ['Aurora vs standard RDS','Aurora uses distributed cluster storage and supports fast replicas/global database; standard RDS offers broader engine/version choices.','Choose Aurora for compatible engines needing rapid failover, read scale, or global features.','Assuming Aurora always costs less or supports every database engine.'],
  ['DynamoDB vs RDS','DynamoDB is serverless key-value/document at massive scale; RDS provides relational constraints, joins, and SQL engines.','Let access patterns and transaction model decide.','Choosing DynamoDB merely because traffic is high without a workable key design.'],
  ['ElastiCache vs DAX','ElastiCache is a general Redis/Memcached cache; DAX is a DynamoDB-compatible read-through cache.','Use DAX for microsecond DynamoDB reads; ElastiCache for broader caching/data structures.','Using DAX to accelerate arbitrary databases or write-heavy workloads.'],
  ['SQS vs SNS vs EventBridge','SQS buffers work; SNS pushes fan-out messages; EventBridge routes events by rules and supports many sources.','Combine SNS/EventBridge with per-consumer SQS queues for durable independent processing.','Using one shared SQS queue when every consumer needs every event.'],
  ['CloudFront vs Global Accelerator','CloudFront caches and proxies HTTP content; Global Accelerator provides static anycast IPs and accelerates TCP/UDP to regional endpoints.','Choose CloudFront for web delivery and caching; GA for non-HTTP, static IP, or rapid endpoint failover.','Selecting GA because the scenario explicitly needs edge caching.'],
  ['NAT Gateway vs IGW vs VPC endpoints','IGW enables public routing; NAT gives private subnets outbound internet; endpoints privately reach supported services.','Use endpoints to avoid NAT for service traffic; NAT for general outbound internet.','Adding NAT for inbound traffic or paying NAT charges for heavy S3 traffic.'],
  ['VPN vs Direct Connect','VPN is encrypted over internet and fast to establish; DX is dedicated, consistent private connectivity and is not encrypted by default.','Use VPN for quick/backup links; DX for steady high-throughput hybrid connectivity, often with VPN encryption.','Claiming Direct Connect alone encrypts traffic.'],
  ['Lambda vs EC2 vs ECS/Fargate','Lambda suits event-driven short execution; Fargate runs containers without host management; EC2 offers maximum control.','Choose the least operationally heavy option that satisfies runtime and control requirements.','Forcing long-running or specialized-host workloads into Lambda.'],
  ['Auto Scaling vs ELB','Auto Scaling changes capacity; ELB distributes traffic and health-checks targets.','Use together for elastic web tiers; neither substitutes for the other.','Saying a load balancer automatically creates instances.'],
  ['AWS Backup vs snapshots','Snapshots are service-level recovery points; AWS Backup centralizes policy, retention, vaults, and cross-account controls.','Choose AWS Backup for governed multi-service protection.','Treating a snapshot alone as an application-consistent DR plan.'],
  ['S3 storage classes','Classes trade storage price, retrieval cost, minimum duration, resilience, and retrieval time.','Use lifecycle rules and Intelligent-Tiering when access is uncertain.','Ignoring minimum storage duration or retrieval requirements.'],
  ['KMS vs Secrets Manager vs Parameter Store','KMS manages encryption keys; Secrets Manager stores/rotates secrets; Parameter Store stores configuration and can hold SecureString values.','Use Secrets Manager when managed rotation is central; KMS underpins encryption.','Storing plaintext secrets in KMS or expecting Parameter Store to rotate every database secret natively.'],
];
