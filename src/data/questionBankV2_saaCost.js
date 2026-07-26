/**
 * questionBankV2_saaCost.js — EX-23: Domain 4 cost-optimisation questions.
 *
 * WHY THIS FILE EXISTS
 * ────────────────────
 * Domain 4 (Design Cost-Optimised Architectures) is 20% of the SAA-C03 exam.
 * After the EX-22 domain classifier corrected the tagging, the bank held only
 * 60 Domain 4 questions — 8% of the pool. That was a genuine CONTENT gap
 * rather than a tagging bug: the bank simply had few cost questions, so a
 * candidate drilling Domain 4 exhausted the pool in about four mock exams.
 *
 * This batch adds 50 questions across all four Domain 4 task statements:
 *
 *   4.1 Design cost-optimised storage        (14)
 *   4.2 Design cost-optimised compute        (16)
 *   4.3 Design cost-optimised database       (10)
 *   4.4 Design cost-optimised network        (10)
 *
 * 9 of the 50 (18%) are multiple-response. The selector reserves 25% per
 * domain, so it draws on the Domain 4 multi-response questions in the older
 * batches too rather than relying on this file's ratio alone.
 *
 * DESIGN NOTES
 * ────────────
 *  - Data transfer charges get heavy coverage because they are the single
 *    most-missed cost topic on the exam: transfer IN is free, OUT to the
 *    internet is charged, and cross-AZ traffic is charged in BOTH directions.
 *  - Several questions turn on minimum storage duration charges (Standard-IA
 *    30 days, Glacier Flexible 90, Deep Archive 180) — deleting early still
 *    bills the remainder, which trips up candidates who only compare per-GB
 *    rates.
 *  - Every question names a constraint the cheapest option must not violate,
 *    because "cheapest" is never the answer on its own. The classic trap is
 *    an option that saves money by breaking a stated requirement.
 *  - No specific dollar figures are asserted as fact. AWS pricing changes;
 *    questions test the RELATIVE ordering and the pricing MODEL, which is
 *    what the exam actually examines.
 */

const T = {
  STORAGE: 'Storage', COMPUTE: 'Compute', SECURITY: 'Security',
  NETWORKING: 'Networking', DATABASE: 'Database', PRICING: 'Pricing',
  MONITORING: 'Monitoring', INTEGRATION: 'Integration', MIGRATION: 'Migration',
  ANALYTICS: 'Analytics', ML_AI: 'ML/AI', DEVOPS: 'DevOps',
};

/** Single-answer question. */
function cq(id, q) {
  return {
    id, certIds: ['saa-c03'], domainIds: q.domainIds || ['saa-d4'],
    difficulty: q.difficulty || 'medium', service: q.service || [], type: 'single',
    q: q.scenario, options: q.options, answer: q.answer,
    why: q.why, wrongReasons: q.wrongReasons || {},
    docs: q.docs || null, level: 'Associate', topic: q.topic || T.PRICING,
    concept: q.concept, learningTopic: q.learningTopic || null,
    lastVerified: '2026-07-26',
  };
}

/** Multiple-response question — answers is an array of indices. */
function cmq(id, q) {
  if (!Array.isArray(q.answers) || q.answers.length < 2) {
    throw new Error(`${id}: multi-response needs at least 2 answers`);
  }
  return {
    id, certIds: ['saa-c03'], domainIds: q.domainIds || ['saa-d4'],
    difficulty: q.difficulty || 'medium', service: q.service || [], type: 'multi',
    q: q.scenario, options: q.options, answer: q.answers,
    why: q.why, wrongReasons: q.wrongReasons || {},
    docs: q.docs || null, level: 'Associate', topic: q.topic || T.PRICING,
    concept: q.concept, learningTopic: q.learningTopic || null,
    lastVerified: '2026-07-26',
  };
}

export const SAA_V2_COST = [
  // ══════════════════════════════════════════════════════════════════
  // TASK 4.1 — Design cost-optimised storage (14)
  // ══════════════════════════════════════════════════════════════════

  cq('cost-001', {
    topic: T.STORAGE, service: ['s3', 'storage-class', 'standard-ia'],
    scenario: 'Compliance documents are read frequently for the first month after upload, then perhaps twice a year. They must be retrievable within milliseconds whenever requested, and stored across at least three Availability Zones. Which lifecycle configuration is most cost-effective?',
    options: [
      'Transition to S3 Standard-Infrequent Access after 30 days',
      'Transition to S3 One Zone-Infrequent Access after 30 days',
      'Transition to S3 Glacier Flexible Retrieval after 30 days',
      'Keep everything in S3 Standard indefinitely',
    ],
    answer: 0,
    why: 'Standard-IA costs less per GB than Standard, retrieves in milliseconds, and keeps the multi-AZ redundancy the requirement demands. The 30-day transition also satisfies the minimum 30-day billing duration for Standard-IA, so no early-deletion charge applies.',
    wrongReasons: {
      1: 'One Zone-IA is cheaper still but stores in a single Availability Zone, violating the three-AZ requirement.',
      2: 'Glacier Flexible Retrieval takes minutes to hours, breaking the millisecond retrieval requirement.',
      3: 'Standard is the most expensive option for data accessed twice a year.',
    },
    concept: 'Standard-IA keeps multi-AZ durability and millisecond access at a lower per-GB rate; One Zone-IA trades away AZ redundancy.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html',
  }),

  cq('cost-002', {
    topic: T.STORAGE, service: ['s3', 'lifecycle', 'multipart'],
    scenario: 'A team notices their S3 bill lists more storage than the total size of the objects they can see in the console. Their application uploads large files with multipart upload, and network failures are common. What is the most likely cause and the cheapest fix?',
    options: [
      'Incomplete multipart uploads are still billed — add a lifecycle rule to abort them after 7 days',
      'S3 versioning is retaining old versions — disable versioning',
      'Cross-Region Replication is duplicating the data — remove the replication rule',
      'Requester Pays is misconfigured — enable it to shift the cost',
    ],
    answer: 0,
    why: 'Parts from a multipart upload that never completed remain in the bucket, consume storage and are billed, but do not appear as objects. A lifecycle rule with AbortIncompleteMultipartUpload cleans them automatically. This is one of the most common sources of unexplained S3 spend.',
    wrongReasons: {
      1: 'Old versions would be visible when listing versions, and disabling versioning removes deletion protection — a bad trade.',
      2: 'Replication bills the destination bucket, which would appear as its own line item, not as extra storage in this bucket.',
      3: 'Requester Pays changes who pays for requests and transfer, not phantom storage, and would break existing consumers.',
    },
    concept: 'Incomplete multipart upload parts bill as storage while remaining invisible in object listings.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html',
  }),

  cmq('cost-003', {
    topic: T.STORAGE, service: ['s3', 'intelligent-tiering'],
    scenario: 'An archive of 40 million small objects, mostly under 64 KB, has unpredictable access. A colleague suggests S3 Intelligent-Tiering. Which TWO statements should shape the decision?',
    options: [
      'Intelligent-Tiering charges a per-object monitoring and automation fee, which is significant at 40 million objects',
      'Objects smaller than 128 KB are never moved to a lower-cost tier, so they stay at frequent-access pricing',
      'Intelligent-Tiering adds a retrieval fee for every access to the frequent tier',
      'Intelligent-Tiering requires objects to be at least 1 MB',
      'Intelligent-Tiering only works in buckets with versioning disabled',
    ],
    answers: [0, 1],
    why: 'Both facts undermine the suggestion for this specific dataset. The monitoring fee is charged per object per month, so 40 million objects makes it material. And objects under 128 KB are never transitioned to the infrequent tiers — they stay billed at frequent-access rates while still paying monitoring. For huge counts of tiny objects, Intelligent-Tiering can cost more than Standard.',
    wrongReasons: {
      2: 'Intelligent-Tiering has no retrieval fees in its frequent, infrequent or archive-instant tiers — that is its main appeal.',
      3: 'There is no 1 MB minimum. The relevant threshold is the 128 KB auto-tiering cutoff.',
      4: 'Intelligent-Tiering works fine with versioning enabled.',
    },
    concept: 'Intelligent-Tiering economics: per-object monitoring fee plus a 128 KB minimum for auto-tiering make it a poor fit for many tiny objects.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html',
  }),

  cq('cost-004', {
    topic: T.STORAGE, service: ['s3', 'glacier', 'minimum-duration'],
    scenario: 'To reduce cost, an engineer writes a lifecycle rule moving logs to S3 Glacier Deep Archive on day 1 and deleting them on day 45. The bill goes up rather than down. Why?',
    options: [
      'Deep Archive has a 180-day minimum storage duration, so deleting at day 45 still incurs 135 days of charges',
      'Deep Archive is more expensive per GB than S3 Standard',
      'Lifecycle transitions are not permitted before day 30',
      'Deleting objects from Deep Archive triggers a full retrieval charge',
    ],
    answer: 0,
    why: 'Deep Archive bills a minimum of 180 days per object regardless of when it is deleted. An object removed at day 45 is still charged for the remaining 135 days, plus the per-object transition request cost. For a 45-day retention the object should never have left Standard or Standard-IA.',
    wrongReasons: {
      1: 'Deep Archive has the lowest per-GB rate of any S3 class. The problem is the minimum duration, not the rate.',
      2: 'Transitions can be configured from day 0. Some classes have their own minimums, but the rule itself is allowed.',
      3: 'Deletion does not trigger retrieval. The early-deletion charge is a pro-rated storage charge.',
    },
    concept: 'Minimum storage durations: Standard-IA and One Zone-IA 30 days, Glacier Flexible 90, Deep Archive 180 — early deletion bills the remainder.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html',
  }),

  cq('cost-005', {
    topic: T.STORAGE, service: ['ebs', 'gp3', 'gp2'],
    scenario: 'A fleet of 200 EC2 instances uses gp2 volumes sized at 1 TB purely to obtain the IOPS the application needs — actual data occupies about 200 GB per volume. What change reduces cost while maintaining performance?',
    options: [
      'Migrate to gp3 volumes sized near actual usage and provision IOPS independently of capacity',
      'Migrate to io2 volumes at the same 1 TB size',
      'Migrate to sc1 cold HDD volumes to cut the per-GB rate',
      'Take snapshots and delete the volumes overnight',
    ],
    answer: 0,
    why: 'gp2 ties IOPS to volume size at 3 IOPS per GB, which is why the volumes were oversized. gp3 decouples them: you size for the data and provision the IOPS you need separately, so the wasted 800 GB per volume disappears. gp3 also has a lower base per-GB price than gp2 and includes 3,000 IOPS free.',
    wrongReasons: {
      1: 'io2 is a premium volume type aimed at very high sustained IOPS with higher durability — more expensive, not less.',
      2: 'sc1 is cold HDD with throughput-oriented, very low IOPS characteristics. It would break the performance requirement.',
      3: 'Deleting volumes destroys the instances\' data and does not address the sizing problem.',
    },
    concept: 'gp3 decouples IOPS from capacity, removing the gp2 pattern of oversizing volumes purely for performance.',
    docs: 'https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html',
  }),

  cq('cost-006', {
    topic: T.STORAGE, service: ['ebs', 'snapshot'],
    scenario: 'A team keeps 90 daily EBS snapshots of a 500 GB volume and worries the storage cost is 90 × 500 GB. What is actually true about EBS snapshot billing?',
    options: [
      'Snapshots are incremental — only changed blocks since the previous snapshot are stored and billed',
      'Each snapshot is a full independent copy and is billed at full volume size',
      'Snapshots are free while the source volume exists',
      'Snapshots are billed per snapshot regardless of size',
    ],
    answer: 0,
    why: 'EBS snapshots are incremental: the first captures all used blocks, and each subsequent snapshot stores only blocks that changed. Deleting an intermediate snapshot does not break later ones, because AWS retains the blocks any remaining snapshot still needs. Total cost tracks the churn rate, not the snapshot count times the volume size.',
    wrongReasons: {
      1: 'This is the common misconception. Snapshots present as complete point-in-time copies but are stored incrementally.',
      2: 'Snapshots are billed independently of the source volume.',
      3: 'Billing is by stored GB-month of unique blocks, not a flat per-snapshot fee.',
    },
    concept: 'EBS snapshots are incremental; cost scales with data change rate, not with snapshot count.',
    docs: 'https://docs.aws.amazon.com/ebs/latest/userguide/ebs-snapshots.html',
  }),

  cq('cost-007', {
    topic: T.STORAGE, service: ['efs', 'lifecycle', 'ia'],
    scenario: 'An EFS file system holds 8 TB of project files. Analysis shows about 85 percent have not been touched in over 60 days, but they must remain instantly available if opened. What is the most cost-effective configuration?',
    options: [
      'Enable an EFS lifecycle policy moving files to the Infrequent Access storage class after 60 days',
      'Move the inactive files to S3 Glacier Deep Archive',
      'Switch the file system from General Purpose to Max I/O performance mode',
      'Enable EFS Provisioned Throughput mode',
    ],
    answer: 0,
    why: 'EFS lifecycle management moves files not accessed within the configured period to the Infrequent Access class at a substantially lower per-GB rate, while keeping them transparently accessible — an access simply incurs a retrieval charge and pulls the file back. Nothing changes in the application.',
    wrongReasons: {
      1: 'Deep Archive retrieval takes hours, breaking "instantly available", and would require an application change to a different storage API.',
      2: 'Performance mode affects latency and throughput characteristics, not storage price.',
      3: 'Provisioned Throughput adds cost — it is for workloads needing more throughput than the bursting credit model provides.',
    },
    concept: 'EFS lifecycle management to the IA class keeps transparent access while cutting the per-GB rate.',
    docs: 'https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html',
  }),

  cmq('cost-008', {
    topic: T.STORAGE, service: ['s3', 'data-transfer', 'cloudfront'],
    scenario: 'A company serves 200 TB per month of images directly from S3 to internet users worldwide. The data transfer out charges dominate the bill. Which TWO changes reduce that cost?',
    options: [
      'Serve the images through CloudFront, whose data transfer out rates are lower than S3 and which caches at the edge',
      'Enable CloudFront so repeat requests are served from cache and never reach S3 at all',
      'Enable S3 Transfer Acceleration on the bucket',
      'Move the bucket to a cheaper region and keep serving directly from S3',
      'Enable S3 versioning to deduplicate the images',
    ],
    answers: [0, 1],
    why: 'Two separate savings, which is why both are correct. CloudFront\'s per-GB egress rates are lower than S3\'s direct-to-internet rates, and origin fetches from S3 to CloudFront are not charged as internet egress. Separately, cache hits are served entirely from the edge, so those bytes never leave S3 — reducing both S3 egress and S3 GET request charges.',
    wrongReasons: {
      2: 'Transfer Acceleration is an upload optimisation and adds a per-GB surcharge. It would increase cost here.',
      3: 'Regional rate differences are small compared with the CloudFront saving, and it worsens latency for most users.',
      4: 'Versioning does not deduplicate anything; it retains more copies and increases storage cost.',
    },
    concept: 'CloudFront reduces egress cost twice: lower per-GB rates, and cache hits that never touch the origin.',
    docs: 'https://aws.amazon.com/cloudfront/pricing/',
  }),

  cq('cost-009', {
    topic: T.STORAGE, service: ['s3', 'one-zone-ia'],
    scenario: 'A data science team stores intermediate processing files in S3. The files are regenerated from source data by rerunning a job that takes twenty minutes, and are accessed a few times a week. Which storage class minimises cost appropriately?',
    options: [
      'S3 One Zone-Infrequent Access',
      'S3 Standard',
      'S3 Glacier Instant Retrieval',
      'S3 Standard-Infrequent Access',
    ],
    answer: 0,
    why: 'One Zone-IA is roughly 20 percent cheaper than Standard-IA because it stores in a single Availability Zone. That reduced durability profile is acceptable precisely because these files are reproducible — if the AZ is lost, rerunning a twenty-minute job restores them. This is the textbook use case for the class.',
    wrongReasons: {
      1: 'Standard is the most expensive option and unnecessary for weekly access to reproducible data.',
      2: 'Glacier Instant Retrieval targets archives accessed roughly quarterly and carries a 90-day minimum duration.',
      3: 'Standard-IA is a reasonable answer but pays for three-AZ redundancy that reproducible data does not need.',
    },
    concept: 'One Zone-IA suits infrequently accessed data that can be regenerated, where losing an AZ is recoverable.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html',
  }),

  cq('cost-010', {
    topic: T.STORAGE, service: ['s3', 'storage-lens', 'analytics'],
    scenario: 'Before committing to a lifecycle strategy across 600 buckets, a team wants evidence of which prefixes are actually cold and what a transition would save. Which approach gives that evidence with the least effort?',
    options: [
      'Enable S3 Storage Lens with advanced metrics, and use S3 Storage Class Analysis on candidate buckets',
      'Enable S3 server access logging on all buckets and parse the logs manually',
      'Enable CloudTrail data events for all 600 buckets and query with Athena',
      'Apply a lifecycle rule to all buckets and compare next month\'s bill',
    ],
    answer: 0,
    why: 'Storage Lens gives organisation-wide visibility into storage, activity and cost-optimisation opportunities, and Storage Class Analysis specifically reports access patterns per prefix with transition recommendations. Both are purpose-built for exactly this decision and need no custom pipeline.',
    wrongReasons: {
      1: 'Server access logs are extremely verbose, cost money to store, and require you to build the analysis yourself.',
      2: 'CloudTrail data events for 600 buckets is expensive at scale and, again, means building your own analysis.',
      3: 'Applying rules blindly risks early-deletion charges and retrieval fees on data that turns out to be warm.',
    },
    concept: 'S3 Storage Lens for fleet-wide visibility; Storage Class Analysis for per-prefix transition evidence.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens_basics_metrics_recommendations.html',
  }),

  cq('cost-011', {
    topic: T.STORAGE, service: ['s3', 'requester-pays'],
    scenario: 'A research institute publishes a 900 TB open dataset in S3. Thousands of external universities download subsets, and egress charges have become unsustainable. The institute wants to keep the data public but stop paying for other people\'s downloads.',
    options: [
      'Enable Requester Pays on the bucket so downloaders are billed for requests and data transfer',
      'Move the dataset to Glacier Deep Archive',
      'Put CloudFront in front of the bucket',
      'Reduce the S3 storage class to One Zone-IA',
    ],
    answer: 0,
    why: 'Requester Pays shifts request and data transfer charges to the requesting AWS account while the institute continues to pay only for storage. Requesters must authenticate and explicitly acknowledge the charge, which is acceptable for institutional users. This is the intended mechanism for large publicly shared datasets.',
    wrongReasons: {
      1: 'Deep Archive makes the data effectively unusable for downloaders and adds retrieval charges.',
      2: 'CloudFront lowers the per-GB rate but the institute still pays for all of it.',
      3: 'One Zone-IA reduces storage cost, which is not the problem — egress is.',
    },
    concept: 'Requester Pays shifts request and transfer cost to the consumer for large shared datasets.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html',
  }),

  cq('cost-012', {
    topic: T.STORAGE, service: ['s3', 'versioning', 'lifecycle'],
    scenario: 'Versioning was enabled on a bucket two years ago and never revisited. Storage cost has tripled although the current object count is flat. What is the most appropriate remedy?',
    options: [
      'Add lifecycle rules to expire noncurrent versions after a defined retention period and to remove expired delete markers',
      'Suspend versioning on the bucket',
      'Delete the bucket and recreate it without versioning',
      'Switch the bucket to Intelligent-Tiering',
    ],
    answer: 0,
    why: 'Every overwrite creates a noncurrent version that is billed indefinitely unless a lifecycle rule expires it. NoncurrentVersionExpiration trims that history to whatever retention the business needs, and expiring orphaned delete markers cleans the remainder — all while keeping versioning\'s protection against accidental deletion.',
    wrongReasons: {
      1: 'Suspending versioning stops new versions but does not delete the two years already accumulated, and it forfeits deletion protection.',
      2: 'Destroying the bucket loses all data and the protection versioning provides.',
      3: 'Intelligent-Tiering may reduce the rate but you would still store every version forever.',
    },
    concept: 'Versioned buckets need NoncurrentVersionExpiration lifecycle rules or old versions accumulate cost indefinitely.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html',
  }),

  cq('cost-013', {
    topic: T.STORAGE, service: ['fsx', 'ebs', 'instance-store'],
    scenario: 'A batch job needs a very fast scratch area for intermediate files during processing. The data is worthless once the job finishes, and the job runs on a single instance for two hours. Which storage choice is most cost-effective?',
    options: [
      'EC2 instance store volumes included with an instance type that provides them',
      'A provisioned io2 EBS volume attached for the duration',
      'An Amazon FSx for Lustre file system',
      'An EFS file system with Provisioned Throughput',
    ],
    answer: 0,
    why: 'Instance store is physically attached NVMe included in the instance price — no separate storage charge and the highest available throughput. Its ephemerality is normally the drawback, but here the data is explicitly worthless after the job, so the trade costs nothing.',
    wrongReasons: {
      1: 'io2 bills per GB and per provisioned IOPS for durability the workload does not need.',
      2: 'FSx for Lustre is excellent for HPC scratch across many clients, but it is a separate billed file system and overkill for one instance for two hours.',
      3: 'EFS with Provisioned Throughput is the most expensive option and is network-attached, so slower than local NVMe.',
    },
    concept: 'Instance store is free with the instance and fastest, correct whenever the data is genuinely disposable.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html',
  }),

  cmq('cost-014', {
    topic: T.STORAGE, service: ['s3', 'glacier', 'retrieval'],
    scenario: 'An archive in S3 Glacier Flexible Retrieval is normally untouched, but twice a year an audit requires restoring 20 TB. The team wants to control audit-time cost. Which TWO actions help?',
    options: [
      'Use Bulk retrieval, the lowest-cost retrieval tier, and plan for its longer completion time',
      'Restore only the specific prefixes the audit requires rather than the whole archive',
      'Switch the archive to Glacier Instant Retrieval to avoid retrieval charges',
      'Enable Transfer Acceleration to reduce retrieval cost',
      'Copy the archive to S3 Standard before each audit',
    ],
    answers: [0, 1],
    why: 'Glacier retrieval is billed per GB by tier, so the two levers are the tier and the volume. Bulk is the cheapest tier (completing in roughly 5 to 12 hours), which suits a scheduled audit with no urgency. Restoring only the required prefixes reduces the GB retrieved, which is the other half of the bill.',
    wrongReasons: {
      2: 'Instant Retrieval still charges for retrieval and costs considerably more per GB to store — worse overall for data touched twice a year.',
      3: 'Transfer Acceleration affects upload paths and adds a surcharge. It has no bearing on retrieval pricing.',
      4: 'Copying 20 TB to Standard incurs the retrieval charge anyway and then adds Standard storage cost on top.',
    },
    concept: 'Glacier retrieval cost is tier × volume: choose Bulk when time allows, and retrieve only what is needed.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html',
  }),

  // ══════════════════════════════════════════════════════════════════
  // TASK 4.2 — Design cost-optimised compute (16)
  // ══════════════════════════════════════════════════════════════════

  cq('cost-015', {
    topic: T.COMPUTE, service: ['savings-plans', 'reserved', 'ec2'],
    scenario: 'A company runs a steady production workload and expects to shift part of it from EC2 to AWS Fargate over the next year. They want the deepest discount that will still apply after the shift. Which commitment should they buy?',
    options: [
      'A Compute Savings Plan',
      'An EC2 Instance Savings Plan for the current instance family',
      'Standard Reserved Instances for the current instance type',
      'Convertible Reserved Instances',
    ],
    answer: 0,
    why: 'Compute Savings Plans apply across instance family, size, region, operating system and tenancy, and crucially extend to Fargate and Lambda. That is the only option whose discount survives the move to Fargate intact.',
    wrongReasons: {
      1: 'EC2 Instance Savings Plans give a deeper discount but are locked to an instance family in a region and do not cover Fargate.',
      2: 'Standard RIs are the least flexible — locked to instance type and family, and EC2 only.',
      3: 'Convertible RIs allow exchanges within EC2 but still do not cover Fargate, and exchanging is a manual process.',
    },
    concept: 'Compute Savings Plans trade a little discount depth for flexibility across families, Fargate and Lambda.',
    docs: 'https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html',
  }),

  cq('cost-016', {
    topic: T.COMPUTE, service: ['graviton', 'ec2', 'rds'],
    scenario: 'An engineering team runs a Java web service on m5 instances and a PostgreSQL database on RDS. Both are steady, and leadership asks for cost reduction without reducing capacity. Which change typically offers the best price-performance improvement with modest effort?',
    options: [
      'Migrate both to Graviton-based instance types (m7g for EC2, Graviton RDS instance classes)',
      'Move the web service to Spot Instances',
      'Reduce the RDS backup retention period to one day',
      'Switch the web service to a burstable t3 family',
    ],
    answer: 0,
    why: 'AWS Graviton processors deliver meaningfully better price-performance than comparable x86 instances for most workloads. Java runs on ARM without source changes, and RDS Graviton classes are a configuration change rather than a migration, so the effort is genuinely modest for a steady-state saving.',
    wrongReasons: {
      1: 'Spot instances can be reclaimed at short notice. A customer-facing web service is not interruption-tolerant.',
      2: 'Backup retention is a small line item, and cutting it to one day damages recovery ability — reducing capability, not waste.',
      3: 'Burstable instances throttle under sustained load and would reduce effective capacity, which the requirement forbids.',
    },
    concept: 'Graviton for better price-performance on steady workloads; ARM-compatible runtimes migrate with little effort.',
    docs: 'https://aws.amazon.com/ec2/graviton/',
  }),

  cmq('cost-017', {
    topic: T.COMPUTE, service: ['spot', 'asg', 'ec2'],
    scenario: 'A stateless web tier behind an ALB must stay available but the team wants to cut compute cost substantially. Traffic is steady with a predictable baseline. Which TWO approaches together give the best result?',
    options: [
      'Cover the steady baseline with a Savings Plan or Reserved Instances',
      'Serve traffic above the baseline with Spot Instances in a mixed-instances Auto Scaling group',
      'Run the entire fleet on Spot Instances',
      'Run the entire fleet On-Demand and rely on aggressive scaling',
      'Use Dedicated Hosts to reduce the per-instance rate',
    ],
    answers: [0, 1],
    why: 'This is the standard layered purchasing model. Commitment pricing gives the deepest discount on capacity you will definitely use, so it belongs on the baseline. Spot handles the variable portion at up to 90 percent off, and a mixed-instances policy lets the group fall back to On-Demand if Spot capacity is reclaimed — so availability is preserved. Each covers what the other cannot.',
    wrongReasons: {
      2: 'An entirely Spot fleet risks a simultaneous reclaim taking the service below required capacity.',
      3: 'All On-Demand is the most expensive option and wastes the discount available on predictable baseline usage.',
      4: 'Dedicated Hosts are for licensing and compliance isolation requirements and cost more, not less.',
    },
    concept: 'Layered purchasing: commitments for the baseline, Spot for the variable top, mixed-instances policy for safety.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html',
  }),

  cq('cost-018', {
    topic: T.COMPUTE, service: ['lambda', 'memory', 'tuning'],
    scenario: 'A Lambda function is configured at 128 MB and takes 9 seconds per invocation. Testing at 1024 MB shows it completes in 0.9 seconds. Which statement about cost is correct?',
    options: [
      'Cost is roughly unchanged because Lambda bills GB-seconds, and the 8× memory increase is offset by the 10× duration reduction',
      'Cost increases roughly 8× because memory is the primary billing dimension',
      'Cost decreases roughly 10× because duration is the primary billing dimension',
      'Cost is unaffected by memory configuration',
    ],
    answer: 0,
    why: 'Lambda bills GB-seconds — allocated memory multiplied by execution time. At 128 MB for 9 s that is about 1.125 GB-s; at 1024 MB for 0.9 s it is about 0.9 GB-s. Slightly cheaper, and ten times faster. This is why more memory often costs the same or less: Lambda scales CPU with memory, so the function finishes proportionally sooner.',
    wrongReasons: {
      1: 'Memory alone does not determine cost — it is multiplied by duration.',
      2: 'The duration saving is largely cancelled by the memory increase; the net change here is small.',
      3: 'Memory directly scales both the price per millisecond and the CPU available.',
    },
    concept: 'Lambda bills GB-seconds; raising memory raises CPU proportionally, so faster execution often offsets the higher rate.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html',
  }),

  cq('cost-019', {
    topic: T.COMPUTE, service: ['ec2', 'eip', 'ipv4'],
    scenario: 'A cost review finds charges for public IPv4 addresses across the estate, including addresses on stopped instances and several allocated but unassociated Elastic IPs. Which action addresses this most directly?',
    options: [
      'Release unassociated Elastic IPs and remove public IPv4 addresses from resources that do not need internet reachability',
      'Convert all Elastic IPs to static private addresses',
      'Move all instances to a public subnet so addresses are shared',
      'Enable IPv6 and delete the VPC',
    ],
    answer: 0,
    why: 'All public IPv4 addresses now carry an hourly charge whether or not they are attached, and an Elastic IP that is allocated but unassociated is pure waste. Auditing for unassociated EIPs and for public IPs on resources that only need private connectivity removes the charge at source — resources behind a load balancer or reachable through a NAT Gateway generally do not need their own public IP.',
    wrongReasons: {
      1: 'Elastic IPs are by definition public. There is no conversion to a private static address.',
      2: 'Public subnets do not share addresses; each instance with a public IP is billed for it.',
      3: 'Deleting the VPC destroys the environment. IPv6 addresses are not charged the same way, but this option is destructive.',
    },
    concept: 'Public IPv4 addresses bill hourly including unassociated Elastic IPs; audit and release what is not needed.',
    docs: 'https://aws.amazon.com/blogs/aws/new-aws-public-ipv4-address-charge-public-ip-insights/',
  }),

  cq('cost-020', {
    topic: T.COMPUTE, service: ['asg', 'scheduled-scaling'],
    scenario: 'A reporting application is used almost exclusively between 08:00 and 19:00 on weekdays. It currently runs a fixed six-instance fleet at all times. Which change reduces compute cost with least risk to the user experience?',
    options: [
      'Use Auto Scaling scheduled actions to raise capacity before 08:00 and lower it after 19:00, with dynamic scaling in between',
      'Replace the fleet with a single larger instance',
      'Move the application to Spot Instances',
      'Reduce the fleet to two instances permanently',
    ],
    answer: 0,
    why: 'The usage pattern is known in advance, so scheduled scaling adds capacity before demand arrives rather than reacting after users notice. Combining it with dynamic scaling during the day handles variation within business hours. Overnight and at weekends the group runs at a minimum, which is where the saving comes from — roughly two thirds of the week.',
    wrongReasons: {
      1: 'One larger instance is a single point of failure and still runs 168 hours a week.',
      2: 'Spot suits interruption-tolerant work. Interactive reporting during business hours is not that.',
      3: 'Two instances permanently risks poor performance during the busy period, degrading the experience the question protects.',
    },
    concept: 'Scheduled scaling for known patterns, so capacity leads demand rather than lagging it.',
    docs: 'https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html',
  }),

  cq('cost-021', {
    topic: T.COMPUTE, service: ['compute-optimizer', 'trusted-advisor'],
    scenario: 'Before purchasing a three-year commitment, a finance team wants confidence the current fleet is not oversized — otherwise the commitment would lock in waste. Which service gives instance-level right-sizing recommendations based on observed utilisation?',
    options: [
      'AWS Compute Optimizer',
      'AWS Budgets',
      'AWS Cost Explorer',
      'AWS Config',
    ],
    answer: 0,
    why: 'Compute Optimizer analyses CloudWatch utilisation history and recommends specific instance types, including Graviton alternatives, with projected savings and a performance risk rating. Right-sizing before committing is the correct order — otherwise a three-year Savings Plan cements the oversizing.',
    wrongReasons: {
      1: 'Budgets alerts on spend against thresholds. It does not analyse utilisation or recommend instance types.',
      2: 'Cost Explorer shows spend trends and has some rightsizing recommendations, but Compute Optimizer is the purpose-built service with per-resource recommendations.',
      3: 'Config tracks configuration compliance and history, not utilisation efficiency.',
    },
    concept: 'Right-size with Compute Optimizer before buying commitments, or the commitment locks in waste.',
    docs: 'https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html',
  }),

  cq('cost-022', {
    topic: T.COMPUTE, service: ['fargate', 'ecs', 'ec2'],
    scenario: 'A team runs eight small containerised microservices with sporadic, unpredictable traffic. They currently maintain a three-node ECS cluster on EC2 that averages 12 percent CPU utilisation. What is the most cost-effective change?',
    options: [
      'Run the services on AWS Fargate so they pay per task vCPU and memory rather than for idle cluster capacity',
      'Add more services to the existing cluster to raise utilisation',
      'Move the cluster to larger EC2 instances',
      'Purchase Reserved Instances for the three cluster nodes',
    ],
    answer: 0,
    why: 'At 12 percent utilisation the team is paying for roughly 88 percent idle capacity plus the operational work of managing nodes. Fargate bills only the vCPU and memory each task actually requests while it runs, which fits sporadic, unpredictable traffic across small services. Fargate\'s per-unit rate is higher than EC2, but that is irrelevant when most EC2 capacity is idle.',
    wrongReasons: {
      1: 'Raising utilisation by adding unrelated work is not a cost decision for these services and may not be possible.',
      2: 'Larger instances increase the idle capacity being paid for.',
      3: 'Reservations commit three years of payment for nodes that are 88 percent idle — locking in the waste.',
    },
    concept: 'Fargate suits sporadic small workloads: no idle capacity charge, despite a higher per-unit rate than EC2.',
    docs: 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html',
  }),

  cq('cost-023', {
    topic: T.COMPUTE, service: ['spot', 'batch'],
    scenario: 'A CI system runs thousands of short test jobs daily. Each job takes under four minutes, jobs are independent, and a failed job is simply retried. Cost per build must fall. What should the team use?',
    options: [
      'AWS Batch or an EC2 Auto Scaling group on Spot Instances with diversified instance types',
      'A permanently running On-Demand fleet sized for peak concurrency',
      'Dedicated Hosts to guarantee capacity',
      'Reserved Instances covering peak concurrency',
    ],
    answer: 0,
    why: 'Short, independent, retryable jobs are the ideal Spot workload: a two-minute interruption window costs almost nothing because the job simply reruns. Diversifying instance types spreads reclaim risk across capacity pools. Spot can cut compute cost by up to 90 percent for this pattern.',
    wrongReasons: {
      1: 'Sizing permanently for peak concurrency leaves the fleet idle between builds.',
      2: 'Dedicated Hosts are the most expensive model and solve a licensing problem, not a cost one.',
      3: 'Reservations commit to continuous capacity, wasted between builds.',
    },
    concept: 'Spot with instance diversification for short, independent, retryable jobs.',
    docs: 'https://docs.aws.amazon.com/batch/latest/userguide/what-is-batch.html',
  }),

  cmq('cost-024', {
    topic: T.COMPUTE, service: ['ec2', 'idle', 'cost-explorer'],
    scenario: 'A monthly review must identify and eliminate waste across 30 accounts under AWS Organizations. Which TWO actions surface genuinely wasted compute spend?',
    options: [
      'Review AWS Trusted Advisor cost optimisation checks for idle and underutilised instances',
      'Use AWS Compute Optimizer findings across the organisation to locate oversized resources',
      'Enable AWS Config in all accounts to record configuration changes',
      'Enable AWS CloudTrail Insights in all accounts',
      'Increase the CloudWatch metric resolution to one second',
    ],
    answers: [0, 1],
    why: 'Both are purpose-built waste detectors and both work organisation-wide. Trusted Advisor cost checks flag idle load balancers, low-utilisation instances, unassociated Elastic IPs and unattached volumes. Compute Optimizer separately identifies oversized resources with projected savings. Together they cover idle resources and wrong-sized resources, which are different kinds of waste.',
    wrongReasons: {
      2: 'Config records configuration state and compliance. It does not evaluate cost efficiency, and enabling it adds cost.',
      3: 'CloudTrail Insights detects unusual API activity — an operational and security signal, not a cost one.',
      4: 'One-second metrics increase CloudWatch charges without identifying any waste.',
    },
    concept: 'Trusted Advisor for idle resources, Compute Optimizer for oversized ones — two distinct forms of waste.',
    docs: 'https://docs.aws.amazon.com/awssupport/latest/user/cost-optimization-checks.html',
  }),

  cq('cost-025', {
    topic: T.COMPUTE, service: ['ec2', 'stop', 'hibernate'],
    scenario: 'Developers need their EC2 development instances to retain in-memory application state between working days, but the company will not pay for compute overnight. Which approach fits?',
    options: [
      'Hibernate the instances at the end of the day — RAM is saved to the root EBS volume and no instance hours are billed while hibernated',
      'Stop the instances, which preserves memory contents automatically',
      'Reboot the instances nightly to clear the compute charge',
      'Terminate the instances and relaunch from an AMI each morning',
    ],
    answer: 0,
    why: 'Hibernation writes the instance memory to the encrypted root EBS volume and stops the instance, so no instance hours accrue. On start, memory is restored and processes resume where they left off. You continue paying for EBS storage and any Elastic IP, which is far less than running compute.',
    wrongReasons: {
      1: 'A normal stop discards memory contents. Only hibernation preserves them.',
      2: 'A reboot never stops billing — the instance stays running throughout.',
      3: 'Terminating destroys in-memory state entirely, which is what the requirement rules out.',
    },
    concept: 'Hibernation preserves RAM to EBS and stops instance-hour billing; a plain stop loses memory.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html',
  }),

  cq('cost-026', {
    topic: T.COMPUTE, service: ['lambda', 'provisioned-concurrency'],
    scenario: 'Provisioned concurrency was enabled at 200 on a Lambda function to remove cold starts. Traffic analysis shows concurrency exceeds 40 only during a two-hour window each weekday. How should the team reduce cost without reintroducing cold starts at peak?',
    options: [
      'Use Application Auto Scaling to schedule provisioned concurrency up for the peak window and down outside it',
      'Disable provisioned concurrency entirely and accept cold starts',
      'Raise the function memory so initialisation completes faster',
      'Move the function to a container on Fargate',
    ],
    answer: 0,
    why: 'Provisioned concurrency bills for the concurrency you reserve for as long as you reserve it, so holding 200 all week when 40 suffices for most of it is the waste. Application Auto Scaling supports scheduled scaling of provisioned concurrency, matching the reservation to the known peak window and cutting the rest.',
    wrongReasons: {
      1: 'This removes the cost but reintroduces the cold starts the setting was added to eliminate.',
      2: 'More memory shortens initialisation somewhat but does not eliminate cold starts, and raises the per-invocation rate.',
      3: 'Rearchitecting to Fargate is a large change that introduces always-on task cost.',
    },
    concept: 'Provisioned concurrency bills for reserved capacity — schedule it to the demand window.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html',
  }),

  cq('cost-027', {
    topic: T.COMPUTE, service: ['reserved', 'savings-plans', 'organizations'],
    scenario: 'An organisation has 20 accounts under a single management account. Several accounts individually have usage too small to justify a commitment, but combined the usage is substantial and steady. How can they obtain commitment discounts?',
    options: [
      'Purchase Savings Plans in the management account with discount sharing enabled, so unused commitment applies across member accounts',
      'Purchase a separate Savings Plan in each member account',
      'Move all workloads into the management account',
      'Use Spot Instances in every account instead',
    ],
    answer: 0,
    why: 'Consolidated billing aggregates usage across the organisation, and with Savings Plans discount sharing turned on, commitment purchased centrally is applied to whichever accounts have matching usage. Small individual footprints combine into one commitment-worthy total without moving any workload.',
    wrongReasons: {
      1: 'Per-account plans fail precisely because individual usage is too small and unused commitment in one account would be wasted.',
      2: 'Consolidating workloads into the management account destroys account isolation, a poor security and blast-radius practice.',
      3: 'Spot does not suit steady production workloads and forgoes commitment discounts entirely.',
    },
    concept: 'Consolidated billing plus Savings Plans discount sharing aggregates small footprints into one commitment.',
    docs: 'https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html',
  }),

  cq('cost-028', {
    topic: T.COMPUTE, service: ['ec2', 'nat-instance', 'nat-gateway'],
    scenario: 'A development VPC needs occasional outbound internet access for package installs. Traffic is a few GB per month. The team currently runs a NAT Gateway in each of three Availability Zones. What reduces cost most while remaining acceptable for a development environment?',
    options: [
      'Consolidate to a single NAT Gateway in one Availability Zone',
      'Keep all three NAT Gateways for high availability',
      'Replace them with three NAT instances, one per AZ',
      'Route outbound traffic through an internet gateway directly from private subnets',
    ],
    answer: 0,
    why: 'NAT Gateways bill per hour per gateway plus per GB processed, so three gateways cost three times the hourly charge. For a development environment with a few GB monthly, a single gateway is sufficient — the loss is that an AZ failure would break outbound access for subnets routing through it, which is acceptable for development but not production.',
    wrongReasons: {
      1: 'Three gateways is the correct production pattern but pays a premium for availability development does not need.',
      2: 'Three NAT instances swaps managed hourly cost for three instances you must patch and size, with no clear saving.',
      3: 'Private subnets cannot route through an internet gateway — that is what makes them private. This does not work.',
    },
    concept: 'NAT Gateway bills per gateway-hour plus per GB; per-AZ redundancy is a production requirement, not a universal one.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html',
  }),

  cq('cost-029', {
    topic: T.COMPUTE, service: ['ec2', 'dedicated-host', 'licensing'],
    scenario: 'A company must run commercial software licensed per physical CPU socket, and the licence forbids running on shared hardware. Which EC2 purchasing option satisfies the licence at the lowest cost?',
    options: [
      'Dedicated Hosts, which expose socket and core visibility and can be combined with a Host Reservation for a discount',
      'Dedicated Instances on shared hosts',
      'Default shared tenancy with a Savings Plan',
      'Spot Instances with a capacity reservation',
    ],
    answer: 0,
    why: 'Dedicated Hosts give you the physical server with visibility of sockets and cores, which is what per-socket licensing requires, and support bring-your-own-licence. Host Reservations then reduce the rate for a one or three year commitment — so the licence is satisfied at the lowest available price for that constraint.',
    wrongReasons: {
      1: 'Dedicated Instances run on hardware dedicated to your account but do not expose socket and core detail or support per-socket BYOL in the same way.',
      2: 'Shared tenancy places you on multi-tenant hardware, which the licence forbids.',
      3: 'Spot gives no tenancy guarantee and can be reclaimed, and does not address licensing at all.',
    },
    concept: 'Dedicated Hosts for per-socket or per-core BYOL licensing; Host Reservations lower the committed rate.',
    docs: 'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-overview.html',
  }),

  cmq('cost-030', {
    topic: T.COMPUTE, service: ['lambda', 'sqs', 'serverless'],
    scenario: 'A workload processes about 400 events per day, each taking two seconds. It currently runs on two always-on t3.medium instances polling a queue. Which TWO changes reduce cost most?',
    options: [
      'Replace the polling instances with a Lambda function triggered by the SQS queue',
      'Remove the always-on EC2 instances once Lambda handles the processing',
      'Move the EC2 instances to Spot',
      'Increase the instance size so events process faster',
      'Add an Auto Scaling group with a minimum of two instances',
    ],
    answers: [0, 1],
    why: '400 events at two seconds each is roughly 13 minutes of actual compute per day, yet two instances run 48 hours daily. Lambda bills only for those minutes and scales to zero between events, which almost certainly falls within or near the free tier. The second answer matters because the saving is only realised once the instances are actually terminated — running both in parallel saves nothing.',
    wrongReasons: {
      2: 'Spot reduces the rate but still pays for 48 idle hours a day, and adds interruption risk.',
      3: 'A larger instance costs more and the workload is not compute-bound — it is idle.',
      4: 'A minimum of two instances guarantees the idle cost continues.',
    },
    concept: 'Serverless for very low duty-cycle workloads; the saving requires decommissioning the old capacity.',
    docs: 'https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html',
  }),

  // ══════════════════════════════════════════════════════════════════
  // TASK 4.3 — Design cost-optimised database (10)
  // ══════════════════════════════════════════════════════════════════

  cq('cost-031', {
    topic: T.DATABASE, service: ['dynamodb', 'on-demand', 'provisioned'],
    scenario: 'A DynamoDB table serves a stable, well-understood traffic pattern of roughly 800 reads and 200 writes per second all day, every day. It currently uses on-demand capacity mode. What reduces cost?',
    options: [
      'Switch to provisioned capacity mode with auto scaling, and consider a reserved capacity purchase',
      'Stay on on-demand, which is always cheaper at scale',
      'Enable DynamoDB Streams to smooth the traffic',
      'Add a Global Secondary Index to spread the load',
    ],
    answer: 0,
    why: 'On-demand charges a significantly higher per-request rate in exchange for requiring no capacity planning — the right trade for spiky or unknown traffic. For predictable, steady throughput, provisioned capacity is far cheaper, auto scaling handles drift, and reserved capacity reduces the rate further for a committed baseline.',
    wrongReasons: {
      1: 'The opposite is true for steady predictable load; on-demand wins for spiky or unpredictable traffic.',
      2: 'Streams capture change records for consumers and add cost. They do not smooth traffic or reduce capacity cost.',
      3: 'A GSI duplicates data and consumes its own write capacity — it increases cost.',
    },
    concept: 'On-demand for spiky or unknown traffic; provisioned plus auto scaling and reserved capacity for steady load.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html',
  }),

  cq('cost-032', {
    topic: T.DATABASE, service: ['aurora', 'serverless'],
    scenario: 'A development Aurora PostgreSQL cluster is used by five engineers during working hours and sits completely idle overnight, at weekends and during holidays. It is currently a provisioned db.r6g.xlarge. What is the most cost-effective change?',
    options: [
      'Convert to Aurora Serverless v2 with a low minimum ACU setting so capacity scales down when idle',
      'Purchase a three-year Reserved Instance for the cluster',
      'Add a read replica to spread the load',
      'Increase the backup retention period',
    ],
    answer: 0,
    why: 'Aurora Serverless v2 scales capacity in fine increments with demand and can sit at a low minimum while idle, so the cluster stops charging for peak-sized capacity during the majority of hours when nobody is using it. Development patterns with long idle stretches are its clearest use case.',
    wrongReasons: {
      1: 'A reservation commits three years of payment for capacity that is idle most of the time — the waste becomes contractual.',
      2: 'A replica adds a second always-on instance. Five engineers are not a load problem.',
      3: 'Longer retention increases backup storage cost and does nothing about idle compute.',
    },
    concept: 'Aurora Serverless v2 for intermittent workloads with long idle periods.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html',
  }),

  cq('cost-033', {
    topic: T.DATABASE, service: ['rds', 'reserved-instance'],
    scenario: 'A production RDS for MySQL instance has run continuously for two years with no planned changes, and the team wants the largest possible discount. Which purchase applies?',
    options: [
      'RDS Reserved Instances for the matching instance class and engine',
      'A Compute Savings Plan',
      'An EC2 Instance Savings Plan',
      'RDS Spot Instances',
    ],
    answer: 0,
    why: 'RDS discounts come through Reserved Instances. Savings Plans do not cover RDS — they apply to EC2, Fargate and Lambda — which is the distinction the question tests. For a stable long-running instance, an RDS RI on a one or three year term gives the deepest available discount.',
    wrongReasons: {
      1: 'Compute Savings Plans cover EC2, Fargate and Lambda. RDS is not included.',
      2: 'EC2 Instance Savings Plans are narrower still and EC2-only.',
      3: 'There is no Spot purchasing option for RDS.',
    },
    concept: 'Savings Plans do not cover RDS; RDS uses Reserved Instances.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html',
  }),

  cq('cost-034', {
    topic: T.DATABASE, service: ['redshift', 'ra3', 'pause'],
    scenario: 'An analytics team queries a Redshift cluster heavily for three days at each month end and barely touches it otherwise. Storage must persist throughout. What reduces cost?',
    options: [
      'Use RA3 nodes, which separate compute from managed storage, and pause the cluster when not in use',
      'Resize to smaller DC2 nodes and keep the cluster running',
      'Take a final snapshot and delete the cluster each month, restoring it at month end',
      'Enable concurrency scaling permanently',
    ],
    answer: 0,
    why: 'RA3 separates compute from managed storage, so storage is billed independently of the nodes and persists as required. Pausing the cluster suspends compute billing while retaining the cluster and its data, then resuming takes minutes. That matches a workload that is genuinely needed three days a month.',
    wrongReasons: {
      1: 'DC2 couples storage to the node, and a permanently running smaller cluster still pays compute for 27 idle days.',
      2: 'Delete and restore works but is operationally risky and slower than pause and resume, which exists for this purpose.',
      3: 'Concurrency scaling adds capacity during bursts and adds cost. It does not address idle time.',
    },
    concept: 'RA3 separates compute from storage; pausing suspends compute billing while retaining data.',
    docs: 'https://docs.aws.amazon.com/redshift/latest/mgmt/managing-cluster-operations.html',
  }),

  cmq('cost-035', {
    topic: T.DATABASE, service: ['rds', 'storage', 'backup'],
    scenario: 'An RDS bill is higher than expected. The instance has 4 TB of allocated gp2 storage of which 900 GB is used, automated backups retained for 35 days, and several manual snapshots from 2023. Which TWO actions reduce cost without harming recoverability for the last week?',
    options: [
      'Reduce the automated backup retention period to a value that still covers the required recovery window',
      'Delete the obsolete manual snapshots from 2023',
      'Reduce the allocated storage from 4 TB to 1 TB',
      'Disable automated backups entirely',
      'Convert the instance to Multi-AZ',
    ],
    answers: [0, 1],
    why: 'Backup storage beyond the size of the database is billed, so 35 days of retention on a 900 GB database is a real cost — trimming it to the actually required window (say 7 days) cuts that while preserving recent recovery. Manual snapshots persist until you delete them and are billed indefinitely, so 2023 snapshots are pure waste. Neither action affects last-week recoverability.',
    wrongReasons: {
      2: 'RDS does not support reducing allocated storage. Storage can only be increased, so this is not possible.',
      3: 'Disabling backups removes point-in-time recovery entirely, breaking the stated requirement.',
      4: 'Multi-AZ roughly doubles instance cost. It improves availability, not cost.',
    },
    concept: 'RDS backup retention and orphaned manual snapshots both bill; allocated storage cannot be reduced.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html',
  }),

  cq('cost-036', {
    topic: T.DATABASE, service: ['elasticache', 'reserved'],
    scenario: 'An ElastiCache for Redis cluster has run continuously for 18 months supporting a production application and will continue indefinitely. Which action reduces its cost?',
    options: [
      'Purchase ElastiCache reserved nodes for the matching node type and term',
      'Switch the cluster to on-demand billing',
      'Reduce the number of replicas to zero',
      'Enable cluster mode',
    ],
    answer: 0,
    why: 'ElastiCache offers reserved node pricing on one and three year terms, which is the standard discount mechanism for steady long-running cache clusters. The workload has 18 months of demonstrated stability and no planned end, so a commitment carries little risk.',
    wrongReasons: {
      1: 'On-demand is the default, undiscounted rate — this is what it is already paying.',
      2: 'Removing all replicas cuts cost but eliminates failover capability for a production cache, reducing availability.',
      3: 'Cluster mode enables sharding for scale. It does not reduce cost and may add nodes.',
    },
    concept: 'ElastiCache reserved nodes for steady long-running clusters.',
    docs: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/reserved-nodes.html',
  }),

  cq('cost-037', {
    topic: T.DATABASE, service: ['dynamodb', 'ttl'],
    scenario: 'A DynamoDB table stores session records that are meaningless after 24 hours, but the table has grown to 3 TB because nothing removes them. What is the most cost-effective way to control it?',
    options: [
      'Enable DynamoDB Time to Live on an expiry attribute so expired items are deleted automatically at no write cost',
      'Run a nightly scan-and-delete job in Lambda',
      'Reduce provisioned read capacity on the table',
      'Move the table to on-demand capacity mode',
    ],
    answer: 0,
    why: 'TTL deletes expired items automatically in the background and consumes no write capacity for those deletions, so storage stops growing at effectively no operational cost. A scan-and-delete alternative would consume substantial read and write capacity every night.',
    wrongReasons: {
      1: 'A nightly scan reads the whole table and each delete consumes write capacity — expensive, and it grows worse as the table grows.',
      2: 'Lower read capacity does not reduce storage and would throttle the application.',
      3: 'Capacity mode affects throughput billing, not the 3 TB of storage.',
    },
    concept: 'DynamoDB TTL expires items automatically without consuming write capacity.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html',
  }),

  cq('cost-038', {
    topic: T.DATABASE, service: ['rds', 'read-replica', 'cross-region'],
    scenario: 'A team created a cross-Region read replica of an RDS instance to serve a small analytics team in another continent. The bill shows unexpectedly high data transfer charges. What is the primary cause?',
    options: [
      'Replication traffic between Regions is billed as inter-Region data transfer on every change',
      'Read replicas are billed at double the primary instance rate',
      'Cross-Region replicas require a Direct Connect link',
      'The replica is charged per query executed',
    ],
    answer: 0,
    why: 'Every change on the primary is shipped to the cross-Region replica and that traffic is billed as inter-Region data transfer. For a write-heavy database the ongoing transfer can exceed the replica\'s own instance cost. If the consumer is a small analytics team, a scheduled export or an in-Region replica is usually cheaper.',
    wrongReasons: {
      1: 'Replicas are billed at standard instance rates for their class, not double.',
      2: 'Cross-Region replication travels over the AWS backbone. Direct Connect is not required.',
      3: 'RDS does not bill per query.',
    },
    concept: 'Cross-Region read replicas incur continuous inter-Region data transfer proportional to write volume.',
    docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html',
  }),

  cq('cost-039', {
    topic: T.DATABASE, service: ['athena', 's3', 'partition'],
    scenario: 'Analysts query 5 TB of uncompressed CSV logs in S3 using Athena. Each query scans the full dataset and the Athena bill is climbing. Queries almost always filter on a date column. What reduces query cost most?',
    options: [
      'Convert to compressed Parquet and partition by date so Athena scans only the relevant partitions and columns',
      'Increase the Athena query result cache size',
      'Move the data to S3 Standard-IA',
      'Run the queries during off-peak hours',
    ],
    answer: 0,
    why: 'Athena bills per TB scanned, so the only lever that matters is reducing bytes scanned. Parquet is columnar and compressed, so a query reads just the needed columns instead of whole CSV rows, and date partitioning lets Athena skip prefixes outside the filter entirely. Together these commonly reduce scanned bytes by well over 90 percent.',
    wrongReasons: {
      1: 'Result caching helps repeated identical queries but does not reduce the cost of new ones.',
      2: 'Standard-IA lowers storage cost and adds retrieval charges. Athena cost is driven by bytes scanned.',
      3: 'Athena pricing does not vary by time of day.',
    },
    concept: 'Athena bills per TB scanned: columnar compressed formats plus partition pruning are the cost levers.',
    docs: 'https://docs.aws.amazon.com/athena/latest/ug/performance-tuning.html',
  }),

  cq('cost-040', {
    topic: T.DATABASE, service: ['dynamodb', 'dax', 'read'],
    scenario: 'A DynamoDB table is dominated by repeated reads of the same small set of popular items, and read capacity cost is the largest line on the bill. Latency is acceptable. What reduces cost most directly?',
    options: [
      'Add a DynamoDB Accelerator (DAX) cluster so repeated reads are served from cache instead of consuming read capacity',
      'Switch the table to on-demand capacity mode',
      'Add a Global Secondary Index on the popular attribute',
      'Enable point-in-time recovery',
    ],
    answer: 0,
    why: 'Cached reads served by DAX do not consume table read capacity, so the repeated reads that dominate the bill largely stop reaching DynamoDB. The trade is the DAX cluster\'s own hourly cost, which is worthwhile when the same items are read constantly. Note the question says latency is already acceptable — the justification here is cost, not speed.',
    wrongReasons: {
      1: 'On-demand charges more per request. For heavy steady read volume it would increase cost.',
      2: 'A GSI adds storage and its own capacity consumption.',
      3: 'PITR adds backup cost and is unrelated to read capacity.',
    },
    concept: 'DAX offloads repeated reads so they stop consuming table read capacity.',
    docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html',
  }),

  // ══════════════════════════════════════════════════════════════════
  // TASK 4.4 — Design cost-optimised network architectures (10)
  // ══════════════════════════════════════════════════════════════════

  cq('cost-041', {
    topic: T.NETWORKING, service: ['vpc', 'endpoint', 's3'],
    scenario: 'Private-subnet EC2 instances read several terabytes per month from S3 in the same Region, routed through a NAT Gateway. Which change removes the largest cost component?',
    options: [
      'Create a Gateway VPC endpoint for S3 and route the traffic through it, bypassing the NAT Gateway',
      'Add a second NAT Gateway to share the load',
      'Create an Interface VPC endpoint for S3',
      'Move the instances to a public subnet',
    ],
    answer: 0,
    why: 'NAT Gateway charges a per-GB data processing fee, so terabytes monthly is a substantial bill. A Gateway endpoint for S3 carries no hourly and no data processing charge, and same-Region traffic to S3 through it is not billed as data transfer. The NAT Gateway is bypassed entirely for that traffic.',
    wrongReasons: {
      1: 'A second gateway doubles the hourly charge and processes the same total GB — cost increases.',
      2: 'Interface endpoints work but bill per hour and per GB. For S3 the Gateway endpoint is free and therefore cheaper.',
      3: 'Public subnets expose the instances and do not eliminate data transfer charges.',
    },
    concept: 'Gateway endpoints for S3 and DynamoDB are free and bypass NAT Gateway data processing charges.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html',
  }),

  cmq('cost-042', {
    topic: T.NETWORKING, service: ['vpc', 'availability-zone', 'data-transfer'],
    scenario: 'A chatty microservice architecture runs across three Availability Zones. Cross-AZ data transfer has become a significant cost line. Which TWO statements are correct and useful for reducing it?',
    options: [
      'Data transfer between Availability Zones is charged in both directions, so a request and its response are both billed',
      'Keeping tightly-coupled services within the same Availability Zone eliminates the cross-AZ charge for their traffic',
      'Cross-AZ data transfer is free within a single VPC',
      'Cross-AZ charges only apply to traffic leaving the Region',
      'Enabling VPC Flow Logs reduces cross-AZ transfer cost',
    ],
    answers: [0, 1],
    why: 'Cross-AZ traffic is billed per GB in each direction, so a chatty request-response pattern pays twice per exchange — which is why it adds up faster than teams expect. Co-locating tightly-coupled services in one AZ removes that charge for their traffic, and the availability trade-off is managed by running the whole stack redundantly in another AZ rather than by spreading each conversation across AZs.',
    wrongReasons: {
      2: 'Cross-AZ transfer is charged even within one VPC. Only same-AZ traffic using private addresses is free.',
      3: 'Inter-Region transfer is a separate, higher charge. Cross-AZ charges apply inside a Region.',
      4: 'Flow logs give visibility into the traffic and cost money to store. They reduce nothing by themselves.',
    },
    concept: 'Cross-AZ transfer bills both directions; co-locate chatty services and achieve HA by replicating the whole stack.',
    docs: 'https://aws.amazon.com/ec2/pricing/on-demand/',
  }),

  cq('cost-043', {
    topic: T.NETWORKING, service: ['cloudfront', 'origin-shield'],
    scenario: 'A CloudFront distribution serves content globally from an origin in eu-west-1. Origin fetch volume is high because many edge locations independently request the same objects. What reduces origin load and associated transfer cost?',
    options: [
      'Enable CloudFront Origin Shield to add a centralised caching layer in front of the origin',
      'Reduce the CloudFront cache TTL so objects refresh more often',
      'Disable compression on the distribution',
      'Add a second origin in another Region',
    ],
    answer: 0,
    why: 'Origin Shield adds an additional caching tier in a chosen Region that consolidates requests from all edge locations. Instead of many regional caches each fetching the same object from the origin, they fetch from Origin Shield, so the origin sees far fewer requests and correspondingly less data transfer out.',
    wrongReasons: {
      1: 'A shorter TTL causes more frequent origin fetches — the opposite of what is needed.',
      2: 'Disabling compression increases the bytes transferred for every response.',
      3: 'A second origin adds infrastructure and does not consolidate the duplicate fetches.',
    },
    concept: 'Origin Shield consolidates edge requests into one caching tier, cutting origin fetches and transfer.',
    docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html',
  }),

  cq('cost-044', {
    topic: T.NETWORKING, service: ['direct-connect', 'vpn', 'data-transfer'],
    scenario: 'A company transfers 80 TB per month from AWS to their on-premises datacentre over a Site-to-Site VPN across the public internet. They want lower cost and more consistent throughput for this sustained volume.',
    options: [
      'Move the traffic to AWS Direct Connect, whose data transfer out rate is lower than internet egress',
      'Add a second VPN tunnel to increase aggregate bandwidth',
      'Enable S3 Transfer Acceleration for the transfers',
      'Compress the data and continue over the VPN',
    ],
    answer: 0,
    why: 'Direct Connect data transfer out is billed at a lower per-GB rate than standard internet egress, and at 80 TB monthly that difference typically offsets the port and cross-connect charges. It also provides consistent, dedicated bandwidth rather than sharing the public internet, addressing the second requirement.',
    wrongReasons: {
      1: 'VPN traffic still pays internet egress rates regardless of tunnel count, and remains subject to internet variability.',
      2: 'Transfer Acceleration optimises uploads INTO S3 and adds a surcharge. This is egress out of AWS.',
      3: 'Compression helps where feasible but does not change the per-GB rate, and much data is already compressed.',
    },
    concept: 'Direct Connect data transfer out rates are lower than internet egress, favouring sustained high volume.',
    docs: 'https://aws.amazon.com/directconnect/pricing/',
  }),

  cq('cost-045', {
    topic: T.NETWORKING, service: ['transit-gateway', 'vpc-peering'],
    scenario: 'Two VPCs in the same Region exchange a high volume of traffic and need only to reach each other, with no transitive routing to other networks. The team currently routes this through a Transit Gateway. What is more cost-effective?',
    options: [
      'Replace the path with a VPC peering connection, which has no hourly attachment charge or per-GB processing fee',
      'Add a second Transit Gateway attachment for redundancy',
      'Route the traffic through a NAT Gateway instead',
      'Connect the VPCs with a Site-to-Site VPN',
    ],
    answer: 0,
    why: 'Transit Gateway bills per attachment-hour plus per GB processed, which is the right trade when you need a hub connecting many networks with transitive routing. For exactly two VPCs needing only each other, peering avoids both charges — you pay only standard cross-AZ data transfer where applicable.',
    wrongReasons: {
      1: 'More attachments add hourly charges without addressing the cost concern.',
      2: 'NAT Gateway is for outbound internet from private subnets and cannot connect two VPCs.',
      3: 'A VPN between VPCs in the same Region adds tunnel cost and encryption overhead for no benefit over peering.',
    },
    concept: 'Peering is cheapest for a small number of VPC-to-VPC paths; Transit Gateway earns its cost at hub scale.',
    docs: 'https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html',
  }),

  cq('cost-046', {
    topic: T.NETWORKING, service: ['alb', 'nlb', 'lcu'],
    scenario: 'A team runs 14 Application Load Balancers, one per microservice, each carrying light traffic. Fixed hourly charges across all of them now exceed the traffic-based charges. What reduces cost while keeping per-service routing?',
    options: [
      'Consolidate onto fewer ALBs using host-based and path-based routing rules to direct traffic to each service target group',
      'Replace every ALB with a Network Load Balancer',
      'Replace the ALBs with Classic Load Balancers',
      'Put CloudFront in front of each ALB',
    ],
    answer: 0,
    why: 'Every load balancer carries its own hourly charge, so 14 lightly-used ALBs pay 14 baseline fees. A single ALB supports many listener rules routing by host header or URL path to different target groups, giving the same per-service routing from far fewer load balancers. The LCU-based traffic charges are unchanged because the traffic volume has not changed.',
    wrongReasons: {
      1: 'NLBs also charge hourly and operate at layer 4, so they cannot do host or path based HTTP routing.',
      2: 'Classic Load Balancers are the previous generation with fewer features and no path-based routing.',
      3: 'CloudFront adds a service in front without removing any of the 14 hourly charges.',
    },
    concept: 'Consolidate lightly-used ALBs using host and path based listener rules to cut fixed hourly charges.',
    docs: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-update-rules.html',
  }),

  cq('cost-047', {
    topic: T.NETWORKING, service: ['s3', 'cross-region', 'replication'],
    scenario: 'Cross-Region Replication was enabled on a 200 TB bucket for durability. Finance questions the cost. Which statement correctly describes what is being paid for?',
    options: [
      'Storage in both buckets, the replication requests, and inter-Region data transfer for every replicated object',
      'Only the storage in the destination bucket',
      'Only the inter-Region data transfer, as replication requests are free',
      'A flat monthly fee per replication rule',
    ],
    answer: 0,
    why: 'Cross-Region Replication bills on three fronts: you store the data twice, you pay replication PUT requests, and you pay inter-Region data transfer for the bytes moved. On 200 TB that is substantial, which is why CRR should be justified by a genuine regional-durability or compliance requirement rather than enabled by default.',
    wrongReasons: {
      1: 'Source storage continues to be billed as well.',
      2: 'Replication requests are billed like any other PUT.',
      3: 'There is no flat per-rule fee; charges scale with data and requests.',
    },
    concept: 'CRR costs double storage plus replication requests plus inter-Region transfer.',
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html',
  }),

  cmq('cost-048', {
    topic: T.NETWORKING, service: ['data-transfer', 'ec2', 's3'],
    scenario: 'A new architect is estimating data transfer costs. Which TWO statements about AWS data transfer pricing are correct?',
    options: [
      'Data transfer INTO AWS from the internet is not charged',
      'Data transfer OUT from AWS to the internet is charged per GB above a monthly free allowance',
      'Data transfer between EC2 and S3 in the same Region always incurs an inter-Region charge',
      'Data transfer between two instances in the same Availability Zone using private IP addresses is charged per GB',
      'Data transfer out through a Direct Connect link costs more per GB than internet egress',
    ],
    answers: [0, 1],
    why: 'Inbound transfer from the internet is free, which is why upload-heavy workloads are cheap to ingest. Outbound to the internet is the charge that dominates most bills, billed per GB above a monthly free tier allowance. Together these explain the common asymmetry that surprises new architects.',
    wrongReasons: {
      2: 'Same-Region EC2 to S3 traffic is not an inter-Region transfer. Through a Gateway endpoint it is not charged at all.',
      3: 'Same-AZ traffic over private addresses is free. It is CROSS-AZ traffic that is charged.',
      4: 'Direct Connect data transfer out is cheaper per GB than internet egress — that is a large part of its economic case.',
    },
    concept: 'Transfer in is free, transfer out to the internet is the dominant charge, same-AZ private traffic is free.',
    docs: 'https://aws.amazon.com/ec2/pricing/on-demand/',
  }),

  cq('cost-049', {
    topic: T.NETWORKING, service: ['vpc', 'interface-endpoint', 'privatelink'],
    scenario: 'A security policy requires that calls to 12 different AWS services from private subnets stay on the AWS network. The team plans Interface VPC endpoints for all 12 in three Availability Zones. What should they understand about the cost before proceeding?',
    options: [
      'Interface endpoints bill per endpoint per Availability Zone per hour plus a per-GB processing charge, so 12 services across 3 AZs is 36 billed endpoint-hours per hour',
      'Interface endpoints are free, like Gateway endpoints',
      'Interface endpoints bill only for data processed, with no hourly component',
      'Interface endpoints bill once per VPC regardless of Availability Zone count',
    ],
    answer: 0,
    why: 'Interface endpoints create an elastic network interface in each subnet you enable, and each is billed hourly, plus a per-GB data processing charge. Twelve services across three AZs means 36 concurrent billed endpoints. That is often worth it for the security requirement, but the total should be modelled first — and S3 and DynamoDB should use free Gateway endpoints instead of Interface endpoints where possible.',
    wrongReasons: {
      1: 'Only Gateway endpoints (S3 and DynamoDB) are free. Interface endpoints are not.',
      2: 'There is an hourly charge per endpoint per AZ in addition to data processing.',
      3: 'Billing is per AZ, which is exactly why the AZ count multiplies the cost.',
    },
    concept: 'Interface endpoints bill per AZ per hour plus per GB; use free Gateway endpoints for S3 and DynamoDB.',
    docs: 'https://aws.amazon.com/privatelink/pricing/',
  }),

  cq('cost-050', {
    topic: T.MONITORING, service: ['budgets', 'cost-anomaly-detection'],
    scenario: 'After being surprised by a bill that doubled because of a misconfigured job left running over a weekend, a team wants to be warned about unusual spend automatically, without having to predict which service will misbehave.',
    options: [
      'Enable AWS Cost Anomaly Detection, which uses machine learning to establish normal spend patterns and alerts on deviations',
      'Create an AWS Budget with a fixed monthly threshold for total spend',
      'Review Cost Explorer at the end of each month',
      'Enable CloudTrail and alert on all API calls',
    ],
    answer: 0,
    why: 'Cost Anomaly Detection learns each service\'s normal spend pattern and alerts when actual spend deviates, which is exactly the "I cannot predict which service" requirement. A fixed budget threshold only fires once total spend crosses a number someone guessed, and can be silent while one service triples if the total stays under the line.',
    wrongReasons: {
      1: 'A fixed threshold is useful but requires predicting the number and can miss a service-level anomaly under the total.',
      2: 'Month-end review is the after-the-fact discovery that caused the original surprise.',
      3: 'Alerting on all API calls produces overwhelming noise and does not relate spend to normal patterns.',
    },
    concept: 'Cost Anomaly Detection learns normal patterns per service; Budgets enforce thresholds you choose.',
    docs: 'https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html',
  }),
];
