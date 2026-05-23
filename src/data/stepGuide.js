/**
 * Rich step-guide engine — turns any roadmap task or project step into a
 * full study note with 4 implementation paths (Console / CLI / Terraform
 * / CloudFormation) plus a teaching overview, prerequisites, gotchas,
 * verification, and exam-relevance.
 *
 * Schema (each guide):
 *   {
 *     id, service, title, tagline,
 *     overview: { whatYouLearn, whyItMatters, prerequisites[], time, level, examRelevance },
 *     signal: { ... },              // hints to SmartMethodDetector for the "recommended" pill
 *     content: {                    // SmartMethodDetector's expected shape
 *       console: { consoleUrl, steps: [{ title, detail, expected, gotcha }] },
 *       cli:     { command, expected, verifyCommand, gotchas: [] },
 *       terraform:      { code, commands, expected, errors: [] },
 *       cloudformation: { template, deployCommand, verifyCommand, errors: [] },
 *     },
 *     verify: string,
 *     gotchas: [string],
 *     docs:   string,
 *     examTip: string,
 *   }
 */

// ====================================================================
// Pattern matching (first match wins)
// ====================================================================

const PATTERNS = [
  // ---------------- AWS account creation ----------------
  {
    re: /\b(aws (free.?tier )?account|sign[- ]?up.+aws|create.+aws (free.?tier )?account|register.+aws)\b/i,
    id: 'aws-account',
  },
  {
    re: /\b(mfa|multi[- ]?factor|virtual mfa|enable.+mfa)\b/i,
    id: 'mfa',
  },
  {
    re: /\b(billing alert|free.?tier alert|budget alarm|cost alarm)\b/i,
    id: 'billing-alarm',
  },

  // ---------------- Dev tooling ----------------
  {
    re: /\b(aws cli|install.+aws cli|configure.+aws cli|aws configure)\b/i,
    id: 'aws-cli-setup',
  },
  {
    re: /\b(install.+(terraform|vs code|docker|git)|set up.+dev environment|local tool)\b/i,
    id: 'dev-environment',
  },

  // ---------------- Online presence ----------------
  {
    re: /\b(github (account|profile|repo)|set up github|public engineering presence)\b/i,
    id: 'github-profile',
  },
  {
    re: /\b(linkedin (profile|account|setup)|linkedin headline|connect.+linkedin)\b/i,
    id: 'linkedin-profile',
  },
  {
    re: /\b(upwork (profile|account|setup|register)|create upwork)\b/i,
    id: 'upwork-profile',
  },
  {
    re: /\b(hashnode|medium|blog (account|setup)|first.+blog post)\b/i,
    id: 'blog-setup',
  },

  // ---------------- S3 ----------------
  {
    re: /\b(s3 bucket|create.+bucket|configure.+bucket|bucket settings|s3 fundamentals)\b/i,
    id: 's3-bucket',
  },
  {
    re: /\b(bucket policy|public[-\s]?read|GetObject|bucket polic)\b/i,
    id: 's3-policy',
  },
  {
    re: /\b(enable versioning|lifecycle (rule|polic)|s3 lifecycle)\b/i,
    id: 's3-lifecycle',
  },
  {
    re: /\b(upload.+(html|file|asset)|sync.+s3|static (file|content)|deploy website to s3)\b/i,
    id: 's3-upload',
  },

  // ---------------- ACM / CloudFront / Route 53 ----------------
  { re: /\b(acm|certificate|tls certificate|ssl cert)\b/i, id: 'acm-cert' },
  { re: /\b(cloudfront|cdn distribution|add cloudfront)\b/i, id: 'cloudfront' },
  { re: /\b(route ?53|dns record|alias record|hosted zone)\b/i, id: 'route53' },
  { re: /\b(invalidat|cache.+clear|purge.+cloudfront)\b/i, id: 'cloudfront-invalidate' },

  // ---------------- EC2 / IAM / VPC ----------------
  { re: /\b(ec2 instance|launch instance|launch.+instance|virtual machine)\b/i, id: 'ec2-launch' },
  { re: /\b(iam role|instance profile|iam polic|role for)\b/i, id: 'iam-role' },
  { re: /\b(vpc|subnet|cidr|private subnet|public subnet)\b/i, id: 'vpc-setup' },

  // ---------------- Data / app tier ----------------
  { re: /\b(rds|postgres|mysql|database instance|provision.+database)\b/i, id: 'rds' },
  { re: /\b(lambda|serverless function|create.+function)\b/i, id: 'lambda' },
  { re: /\b(api gateway|rest api|http api)\b/i, id: 'apigateway' },
  { re: /\b(cloudwatch|alarm|monitor.+ec2|monitor.+rds|log group)\b/i, id: 'cloudwatch' },
];

// ====================================================================
// Guide library — keyed by id
// ====================================================================

const GUIDES = {

  // ====================================================================
  // S3 — Create + configure a bucket (FULLY FLESHED OUT EXEMPLAR)
  // ====================================================================
  's3-bucket': {
    service: 's3',
    title: 'Create + configure an S3 bucket',
    tagline: 'The most-used AWS service. Object storage, infinitely scalable, 99.999999999% durable.',
    overview: {
      whatYouLearn: [
        'How to create an S3 bucket with the right naming and region.',
        'When to enable versioning, encryption, and Block Public Access.',
        'How to verify your bucket from CLI + Console.',
      ],
      whyItMatters:
        'Every AWS architecture eventually puts data on S3 — static sites, backups, data lakes, application objects. Get the bucket-creation defaults wrong and you ship a security incident on day one.',
      prerequisites: ['An AWS account with IAM user (not root) access', 'AWS CLI installed + configured'],
      time: '10 minutes',
      level: 'Beginner',
      examRelevance: 'SAA-C03 Domain 1 (Secure architectures) and Domain 3 (High-performing storage). Heavy presence in CLF-C02.',
    },
    signal: { oneTime: true, repeatable: true, services: ['s3'] },
    content: {
      console: {
        // Current S3 console (May 2025+ redesign). Each step = ONE click or ONE field.
        // `actions[]` = vertical micro-bullets within a step (one click each).
        // `diagram` = optional ASCII to show layout / navigation.
        consoleUrl: 'https://us-east-1.console.aws.amazon.com/s3/get-started?region=us-east-1',
        steps: [
          {
            title: 'Sign in to the AWS Console',
            actions: [
              'Open https://console.aws.amazon.com in a new tab',
              'Type your IAM username (never root for daily work)',
              'Type your password',
              'Approve the MFA prompt on your phone',
            ],
            expected: 'You see the AWS Console home with the global search bar at the top.',
            verify: { kind: 'iam-can-call-aws' },
          },
          {
            title: 'Check the region (top-right corner)',
            actions: [
              'Look at the top-right of the console',
              'Click the region dropdown (next to your username)',
              'Find your nearest region — e.g. EU (Ireland) eu-west-1',
              'Click that region',
            ],
            diagram:
`┌────────────────────────────────────────┐
│  AWS  Q Search...   [Region ▾] [👤 You]│
│                       ↑                │
│                   click here           │
└────────────────────────────────────────┘`,
            expected: 'Region name updates next to your username.',
            gotcha: 'Cross-region traffic costs money + adds latency. Put the bucket in the same region as your other resources.',
          },
          {
            title: 'Open S3 from the search bar',
            actions: [
              'Click the search bar at the very top',
              'Type the letter "S"',
              'Type the digit "3"',
              'Click the "S3" result (orange bucket icon)',
            ],
            expected: 'You land on the Buckets page with a "Create bucket" button top-right.',
            screenshot: 'Title: "General purpose buckets". Empty table if you have no buckets yet.',
          },
          {
            title: 'Start the create-bucket wizard',
            actions: [
              'Find the orange "Create bucket" button (top-right of the table)',
              'Click it',
            ],
            expected: 'You\'re on the Create bucket form, broken into collapsible sections.',
          },
          {
            title: 'Section "General configuration"',
            actions: [
              'Confirm the AWS Region is the one you picked in step 2',
              'Leave Bucket type as "General purpose" (default)',
              'Click in the "Bucket name" field',
              'Type a globally-unique name (e.g. david-portfolio-2026)',
            ],
            diagram:
`┌─ General configuration ──────────────┐
│ AWS Region:  EU (Ireland) eu-west-1  │
│ Bucket type: ● General purpose       │
│              ○ Directory             │
│ Bucket name: [david-portfolio-2026 ] │
└──────────────────────────────────────┘`,
            expected: 'No red error appears below the bucket name field.',
            gotcha: 'Lowercase only, 3-63 chars, hyphens OK, no underscores, no dots (dots break HTTPS).',
          },
          {
            title: 'Section "Object Ownership" → leave default',
            actions: [
              'Scroll down to the Object Ownership section',
              'Confirm "ACLs disabled (recommended)" is selected',
              'Do not change anything',
            ],
            expected: '"ACLs disabled (recommended)" radio is selected.',
          },
          {
            title: 'Section "Block Public Access" → keep all 4 boxes ticked',
            actions: [
              'Scroll to the Block Public Access section',
              'Confirm the master checkbox is TICKED',
              'Confirm all 4 sub-checkboxes are TICKED',
              '(For a public static site only: untick the master, then tick the warning box AWS shows)',
            ],
            gotcha: 'Most accidental S3 data leaks come from someone unticking these "temporarily" then forgetting.',
            expected: 'All 4 sub-checkboxes are ticked (or all unticked if going public — your choice).',
          },
          {
            title: 'Section "Bucket Versioning" → enable',
            actions: [
              'Scroll to Bucket Versioning',
              'Default is "Disable" — click the "Enable" radio instead',
            ],
            expected: 'Enable radio is selected (filled dot).',
          },
          {
            title: 'Section "Tags" → optional but recommended',
            actions: [
              'Scroll to Tags',
              'Click "Add new tag"',
              'Key: Environment',
              'Value: prod (or dev / lab)',
            ],
            expected: 'A tag row appears below.',
          },
          {
            title: 'Section "Default encryption" → leave defaults',
            actions: [
              'Scroll to Default encryption',
              'Leave "Server-side encryption with Amazon S3 managed keys (SSE-S3)" selected',
              'Leave "Bucket Key" set to Enable',
            ],
            expected: 'SSE-S3 radio + Bucket Key "Enable" both selected.',
          },
          {
            title: 'Section "Advanced settings" → skip',
            actions: [
              'Scroll to Advanced settings',
              'Leave Object Lock set to "Disable"',
            ],
            expected: 'Advanced settings unchanged.',
          },
          {
            title: 'Create the bucket',
            actions: [
              'Scroll all the way to the bottom of the form',
              'Find the orange "Create bucket" button',
              'Click it',
            ],
            expected: 'You\'re redirected to the Buckets list with a green "Successfully created bucket" banner.',
            verify: { kind: 'bucket-exists', paramHints: { bucketName: 'your-bucket-name' } },
          },
          {
            title: 'Open your new bucket',
            actions: [
              'Find your bucket name in the Buckets list',
              'Click it',
            ],
            expected: 'Bucket detail page loads with tabs: Objects, Properties, Permissions, Metrics, Management, Access points.',
            verify: { kind: 'bucket-versioning-enabled', paramHints: { bucketName: 'your-bucket-name' } },
            diagram:
`┌─ Your bucket ────────────────────────────────┐
│ [Objects] Properties  Permissions  Metrics… │
│                                              │
│   (empty)                                    │
│                                              │
│   [Upload]  [Create folder]  [Delete]        │
└──────────────────────────────────────────────┘`,
          },
        ],
      },
      cli: {
        command:
`# 1. Create the bucket (LocationConstraint is REQUIRED outside us-east-1)
aws s3api create-bucket \\
  --bucket acme-prod-eu-west-2 \\
  --region eu-west-2 \\
  --create-bucket-configuration LocationConstraint=eu-west-2

# 2. Enable versioning
aws s3api put-bucket-versioning \\
  --bucket acme-prod-eu-west-2 \\
  --versioning-configuration Status=Enabled

# 3. Enable default encryption (SSE-S3 / AES256)
aws s3api put-bucket-encryption \\
  --bucket acme-prod-eu-west-2 \\
  --server-side-encryption-configuration '{
    "Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]
  }'

# 4. Block all public access (defense in depth even with the global default ON)
aws s3api put-public-access-block \\
  --bucket acme-prod-eu-west-2 \\
  --public-access-block-configuration \\
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true`,
        expected: 'Each command returns either empty output or a small JSON object. No errors = success.',
        verifyCommand:
`aws s3api head-bucket --bucket acme-prod-eu-west-2 && echo "OK: bucket exists and is reachable"`,
        gotchas: [
          'The "us-east-1 special case" — DO NOT pass --create-bucket-configuration for us-east-1, it fails with InvalidLocationConstraint.',
          'BucketAlreadyExists means someone else (in any account) owns that name. Pick another.',
          'If you forget --region, the CLI uses your default profile region which may not match where you wanted it.',
        ],
      },
      terraform: {
        code:
`resource "aws_s3_bucket" "main" {
  bucket = "acme-prod-eu-west-2"
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket                  = aws_s3_bucket.main.id
  block_public_acls       = true
  ignore_public_acls      = true
  block_public_policy     = true
  restrict_public_buckets = true
}

output "bucket_name" {
  value = aws_s3_bucket.main.id
}`,
        commands:
`terraform init
terraform plan -out tfplan
terraform apply tfplan`,
        expected: 'terraform apply prints "Apply complete! Resources: 4 added, 0 changed, 0 destroyed."',
        errors: [
          {
            problem: 'Error: error creating S3 Bucket: BucketAlreadyExists',
            fix: 'The name is taken globally. Change the `bucket` value to something unique.',
          },
          {
            problem: 'Error: ValidationException: Block Public Access settings cannot be set on bucket without write permission',
            fix: 'Your IAM role lacks s3:PutBucketPublicAccessBlock. Add it or use a wider policy temporarily.',
          },
        ],
      },
      cloudformation: {
        template:
`AWSTemplateFormatVersion: '2010-09-09'
Description: Production-ready S3 bucket
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: acme-prod-eu-west-2
      VersioningConfiguration:
        Status: Enabled
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true
      Tags:
        - Key: Environment
          Value: prod
Outputs:
  BucketName:
    Value: !Ref Bucket`,
        deployCommand:
`aws cloudformation deploy \\
  --template-file s3-bucket.yaml \\
  --stack-name acme-prod-s3 \\
  --region eu-west-2`,
        verifyCommand:
`aws cloudformation describe-stacks --stack-name acme-prod-s3 \\
  --query 'Stacks[0].StackStatus'`,
        errors: [
          {
            problem: 'Stack stuck at CREATE_FAILED with "BucketAlreadyExists"',
            fix: 'Delete the failed stack first (aws cloudformation delete-stack --stack-name acme-prod-s3), then change the BucketName and redeploy.',
          },
        ],
      },
    },
    verify: 'aws s3 ls s3://acme-prod-eu-west-2 — should return empty (no objects yet) without error.',
    gotchas: [
      'Naming is GLOBAL — pick something with your account ID or domain to avoid collisions.',
      'Versioning is one-way friendly — once enabled you can suspend but not "remove" version history without deleting + recreating.',
      'Block Public Access works at two levels (account + bucket). Both must be configured.',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/creating-bucket.html',
    examTip:
      'Exam loves: durability (11 nines), availability (4 nines for Standard), the difference between SSE-S3 / SSE-KMS / SSE-C, and which storage class to pick for which access pattern.',
  },

  // ====================================================================
  // S3 — bucket policy
  // ====================================================================
  's3-policy': {
    service: 's3',
    title: 'Apply a least-privilege S3 bucket policy',
    tagline: 'Bucket policies attach to the resource. IAM policies attach to the identity. Use both for defense in depth.',
    overview: {
      whatYouLearn: ['Bucket policy JSON structure', 'When to use Principal "*" safely', 'How to verify the policy worked'],
      whyItMatters: 'Wrong bucket policies are the #1 source of accidental S3 data leaks. Get this one right and you avoid the headline.',
      prerequisites: ['An existing S3 bucket', 's3:PutBucketPolicy permission'],
      time: '5 minutes',
      level: 'Beginner',
      examRelevance: 'SAA-C03 Domain 1 task 1.3 (data security).',
    },
    signal: { oneTime: true, services: ['s3'] },
    content: {
      console: {
        consoleUrl: 'https://s3.console.aws.amazon.com/',
        steps: [
          { title: 'S3 → your bucket → Permissions → Bucket Policy → Edit.', detail: 'Bucket policies are JSON only.' },
          { title: 'Paste the policy below', detail: 'For a public static site, allow s3:GetObject from Principal "*". For private apps, leave the bucket private and reach it via VPC endpoint or signed URLs.' },
          { title: 'Save changes', expected: 'Banner: "Successfully edited bucket policy".' },
        ],
      },
      cli: {
        command:
`cat > policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::acme-prod-eu-west-2/*"
  }]
}
EOF

aws s3api put-bucket-policy \\
  --bucket acme-prod-eu-west-2 \\
  --policy file://policy.json`,
        expected: 'No output = success.',
        verifyCommand: 'curl -I https://acme-prod-eu-west-2.s3.eu-west-2.amazonaws.com/index.html',
        gotchas: ['"Principal": "*" + "Block Public Policy" ON = the policy will be rejected. Turn off Block Public Policy first.'],
      },
      terraform: {
        code:
`resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.main.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadGetObject"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "\${aws_s3_bucket.main.arn}/*"
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.allow_public]
}`,
        commands: 'terraform apply',
        expected: '"Apply complete! Resources: 1 added"',
        errors: [],
      },
      cloudformation: {
        template:
`Resources:
  BucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref Bucket
      PolicyDocument:
        Statement:
          - Sid: PublicReadGetObject
            Effect: Allow
            Principal: '*'
            Action: s3:GetObject
            Resource: !Sub '\${Bucket.Arn}/*'`,
        deployCommand: 'aws cloudformation deploy --template-file s3-policy.yaml --stack-name acme-prod-s3-policy',
        verifyCommand: 'aws cloudformation describe-stacks --stack-name acme-prod-s3-policy',
        errors: [],
      },
    },
    verify: 'Open https://yourbucket.s3.amazonaws.com/index.html in incognito — should return HTML.',
    gotchas: ['Always scope Resource by /* not just the bucket ARN — otherwise you grant access to the bucket itself, not its objects.'],
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-policies.html',
    examTip: 'Know the difference between Principal "*" (everyone) vs explicit account ARNs vs aws:PrincipalOrgID (your AWS Org only).',
  },

  // ====================================================================
  // S3 — lifecycle
  // ====================================================================
  's3-lifecycle': {
    service: 's3',
    title: 'Configure S3 versioning + lifecycle rules',
    tagline: 'Versioning is a safety net; lifecycle rules keep the safety net from costing a fortune.',
    overview: {
      whatYouLearn: ['When to use Standard-IA, Glacier, and Deep Archive', 'How to expire non-current versions automatically'],
      whyItMatters: 'Without lifecycle rules, versioned buckets balloon in cost. Pay for what you need, archive everything else.',
      prerequisites: ['A bucket with versioning enabled'],
      time: '8 minutes',
      level: 'Beginner',
      examRelevance: 'SAA-C03 Domain 4 task 4.1 (cost-optimised storage).',
    },
    signal: { oneTime: true, services: ['s3'] },
    content: {
      console: {
        steps: [
          { title: 'S3 → bucket → Management → Create lifecycle rule.', detail: 'Lifecycle rules live on the bucket, not the object.' },
          { title: 'Scope: whole bucket or a prefix.', detail: 'Use prefixes for partitioned data lakes (e.g. logs/ vs uploads/).' },
          { title: 'Transition current versions: Standard → Standard-IA after 30 days, then Glacier Flexible Retrieval after 90 days.', detail: 'IA costs 60% less per GB but you pay a retrieval fee. Use only for infrequently accessed data.' },
          { title: 'Expire noncurrent versions after 90 days.', detail: 'Keeps your safety net for 3 months without paying forever.' },
          { title: 'Delete expired delete markers after expiration.', detail: 'Cleans up the tombstones.' },
        ],
      },
      cli: {
        command:
`cat > lifecycle.json <<'EOF'
{
  "Rules": [{
    "ID": "archive-and-expire",
    "Filter": {},
    "Status": "Enabled",
    "Transitions": [
      { "Days": 30,  "StorageClass": "STANDARD_IA" },
      { "Days": 90,  "StorageClass": "GLACIER" }
    ],
    "NoncurrentVersionExpiration": { "NoncurrentDays": 90 },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \\
  --bucket acme-prod-eu-west-2 \\
  --lifecycle-configuration file://lifecycle.json`,
        expected: 'No output = success.',
        verifyCommand: 'aws s3api get-bucket-lifecycle-configuration --bucket acme-prod-eu-west-2',
        gotchas: ['Lifecycle transitions are evaluated daily, not in real-time. Don\'t panic if files don\'t move at exactly 30 days.'],
      },
      terraform: {
        code:
`resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "archive-and-expire"
    status = "Enabled"
    filter {}

    transition { days = 30 storage_class = "STANDARD_IA" }
    transition { days = 90 storage_class = "GLACIER" }

    noncurrent_version_expiration { noncurrent_days = 90 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}`,
        commands: 'terraform apply',
        expected: '"Apply complete! Resources: 1 added"',
        errors: [],
      },
      cloudformation: {
        template:
`Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      LifecycleConfiguration:
        Rules:
          - Id: archive-and-expire
            Status: Enabled
            Transitions:
              - StorageClass: STANDARD_IA
                TransitionInDays: 30
              - StorageClass: GLACIER
                TransitionInDays: 90
            NoncurrentVersionExpirationInDays: 90
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 7`,
        deployCommand: 'aws cloudformation deploy --template-file s3-lifecycle.yaml --stack-name acme-prod-s3-lifecycle',
        verifyCommand: 'aws s3api get-bucket-lifecycle-configuration --bucket acme-prod-eu-west-2',
        errors: [],
      },
    },
    verify: 'In Console → Management tab, your rule shows under "Lifecycle rules" with status Enabled.',
    gotchas: [
      'Glacier "Flexible Retrieval" = minutes to hours to restore. Glacier "Deep Archive" = up to 12 hours. Plan accordingly.',
      'There\'s a minimum 30-day billing for IA + Glacier. Move data too early and you pay the minimum anyway.',
    ],
    docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html',
    examTip: 'Know the full storage-class hierarchy: Standard → IA → One-Zone IA → Glacier Instant → Glacier Flexible → Glacier Deep Archive. Each gets cheaper but slower to retrieve.',
  },

  // ====================================================================
  // S3 — upload + sync
  // ====================================================================
  's3-upload': {
    service: 's3',
    title: 'Upload static assets to S3 (the right cache headers)',
    tagline: 'Wrong Cache-Control = users see stale assets for days. Get this once and forget it.',
    overview: {
      whatYouLearn: ['aws s3 sync', 'Cache-Control conventions for hashed vs unhashed assets', 'How to invalidate stale cache'],
      whyItMatters: 'Static site deploys are the #1 use case for S3. Bad cache strategy = users complain about old features.',
      prerequisites: ['Bucket exists', 'You\'ve built the site to ./build or ./dist'],
      time: '5 minutes',
      level: 'Beginner',
      examRelevance: 'CLF-C02 (Cloud Practitioner) coverage.',
    },
    signal: { quickFix: true, services: ['s3'] },
    content: {
      console: {
        steps: [
          { title: 'S3 → bucket → Upload → drag files.', detail: 'OK for one-off uploads. Bad for repeat deploys.' },
          { title: 'Properties → Metadata → Cache-Control: public, max-age=31536000 for hashed assets.', detail: 'Hashed = filenames contain the content hash, e.g. app.a8b2.css. They never need to change.' },
          { title: 'For index.html: Cache-Control: public, max-age=0, must-revalidate', detail: 'Force browsers to re-check on every load so deploys take effect.' },
        ],
      },
      cli: {
        command:
`# Sync everything EXCEPT index.html with a 1-year cache header
aws s3 sync ./build/ s3://acme-prod-eu-west-2/ \\
  --delete \\
  --exclude "index.html" \\
  --cache-control "public,max-age=31536000,immutable"

# Then upload index.html with no-cache headers
aws s3 cp ./build/index.html s3://acme-prod-eu-west-2/index.html \\
  --cache-control "public,max-age=0,must-revalidate"

# Invalidate the CloudFront cache (if you have a distribution)
aws cloudfront create-invalidation \\
  --distribution-id E1ABCDEFGHIJK \\
  --paths "/index.html"`,
        expected: 'Sync lists every file uploaded; cp uploads index.html; invalidation returns a JSON with Status: InProgress.',
        verifyCommand: 'aws s3 ls s3://acme-prod-eu-west-2/ --recursive --human-readable',
        gotchas: [
          'sync --delete will REMOVE files from S3 that aren\'t in ./build/. Use without --delete if you have files that should persist.',
          'Forgetting to invalidate CloudFront = users see old index.html for 24 hours.',
        ],
      },
      terraform: {
        code:
`# Terraform isn't ideal for static file uploads — use a "null_resource" with local-exec or, better, a deploy script.
resource "null_resource" "deploy" {
  triggers = { always_run = timestamp() }
  provisioner "local-exec" {
    command = "aws s3 sync ./build/ s3://\${aws_s3_bucket.main.id}/ --delete"
  }
}`,
        commands: 'terraform apply',
        expected: 'null_resource: Creation complete.',
        errors: [],
      },
      cloudformation: {
        template: '# CloudFormation cannot upload bucket objects. Use a CodePipeline + CodeBuild stage instead.',
        deployCommand: '# n/a — see CodePipeline templates in AWS Solutions Library.',
        verifyCommand: '',
        errors: [],
      },
    },
    verify: 'curl -I https://yourbucket.s3.amazonaws.com/index.html → should return Cache-Control: public,max-age=0,must-revalidate.',
    gotchas: ['Use --exact-timestamps on sync if you have files that change content but not size — otherwise sync may skip them.'],
    docs: 'https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html',
    examTip: 'aws s3 sync vs cp: sync compares timestamps + sizes, cp always copies. sync is for "make S3 look like my local folder".',
  },

  // ====================================================================
  // AWS account creation
  // ====================================================================
  'aws-account': {
    service: 'account',
    title: 'Create an AWS Free Tier account',
    tagline: 'Your AWS journey starts here. Get the security right on day one.',
    overview: {
      whatYouLearn: [
        'How to sign up for AWS without getting charged on Free Tier.',
        'Why you NEVER use root credentials after setup.',
        'How to enable MFA + set a billing alarm in the same sitting.',
      ],
      whyItMatters: 'Most "I got a $500 AWS bill" horror stories trace back to: no MFA, root credentials on a laptop, no billing alarm. Set the foundation right and none of that happens.',
      prerequisites: ['A valid payment card (you will NOT be charged on Free Tier)', 'A phone for SMS / voice verification', 'An email you control'],
      time: '15-20 minutes',
      level: 'Beginner',
      examRelevance: 'Foundational — CLF-C02 lightly tests AWS account structure, Organisations.',
    },
    signal: { oneTime: true, services: [] },
    content: {
      console: {
        // Current AWS sign-up flow (May 2025+). Each step = ONE action.
        consoleUrl: 'https://portal.aws.amazon.com/billing/signup',
        steps: [
          {
            title: 'Open the AWS sign-up page in a new tab',
            detail: 'Click the orange "Open in AWS Console" button at the top of this card.',
            expected: 'You land on a page titled "Sign up for AWS" with a form on the right.',
            gotcha: 'Confirm the URL bar shows portal.aws.amazon.com — never trust sign-up links from emails.',
          },
          {
            title: 'Type your root email in the email field',
            detail: 'Use a personal email you control for years (e.g. yourname@gmail.com). Avoid work emails — if you leave the job you lose the account.',
            expected: 'Field accepts the email.',
          },
          {
            title: 'Type an AWS account name',
            detail: 'A descriptive label like "yourname-personal" or "lab-2026". You can change this later.',
            expected: 'No red error.',
          },
          {
            title: 'Click "Verify email address"',
            detail: 'Button below the form. AWS sends a 6-digit code to your inbox.',
            expected: 'Page shows "Confirm you own this email" with a 6-digit code input.',
          },
          {
            title: 'Open your inbox, copy the 6-digit code',
            detail: 'Look for an email from no-reply@signup.aws (check Spam if missing). Subject: "AWS Email verification".',
            expected: 'Code copied to clipboard.',
            gotcha: 'Code expires in 10 minutes. Click "Resend code" if needed.',
          },
          {
            title: 'Paste the code → click "Verify"',
            detail: 'Single input field, no formatting needed.',
            expected: 'Green "Email verified" message. Form expands to show password creation.',
          },
          {
            title: 'Type a STRONG root password',
            detail: 'Use a password manager (1Password / Bitwarden) to generate 32 random chars. Mix upper, lower, digits, symbols.',
            expected: 'Strength indicator shows "Strong".',
            gotcha: 'SAVE IT in your password manager BEFORE clicking Continue — losing this means losing the account.',
          },
          {
            title: 'Re-type the password in the confirmation field',
            detail: 'AWS asks twice to catch typos.',
            expected: 'Both fields match — no red error.',
          },
          {
            title: 'Click "Continue (step 1 of 5)"',
            detail: 'Orange button bottom-right.',
            expected: 'Page moves to "Contact information".',
          },
          {
            title: 'Pick "Personal" account type',
            detail: 'Click the Personal radio. Business asks for tax ID + slower verification.',
            expected: 'Personal radio selected.',
          },
          {
            title: 'Fill in your full name',
            detail: 'As on your government ID — must match your payment card name.',
            expected: 'Field accepts it.',
          },
          {
            title: 'Pick your country',
            detail: 'Use the country where your payment card is registered.',
            expected: 'Country dropdown shows your choice.',
            gotcha: 'You CAN\'T change billing country later without contacting AWS Support.',
          },
          {
            title: 'Type your address',
            detail: 'Address line 1, City, State/Region, Postal code. Use the address on your card statement.',
            expected: 'All fields green.',
          },
          {
            title: 'Type your phone number',
            detail: 'Country code + number, no spaces (e.g. +233244112233).',
            expected: 'Phone field accepts the format.',
          },
          {
            title: 'Tick the AWS Customer Agreement checkbox',
            detail: 'Bottom of the form.',
            expected: 'Checkbox ticked, "Continue (step 2 of 5)" button enables.',
          },
          {
            title: 'Click "Continue (step 2 of 5)"',
            detail: 'Orange button.',
            expected: 'Page moves to "Billing information".',
          },
          {
            title: 'Pick "Credit or debit card"',
            detail: 'Most common. Skip "Bank account" unless you\'re in a country where that\'s preferred.',
            expected: 'Card form appears.',
          },
          {
            title: 'Type card number, expiry, CVV, cardholder name',
            detail: 'Use a real card. AWS does a $1 USD hold (refunded in 3-5 days).',
            expected: 'No red errors.',
            gotcha: 'Most virtual cards (Wise, Revolut, CBG) get rejected. Use a physical card if possible.',
          },
          {
            title: 'Click "Verify and continue"',
            detail: 'Orange button. AWS may show a 3D-Secure popup from your bank — approve in your banking app.',
            expected: 'Page moves to "Confirm your identity".',
            gotcha: 'If your card is rejected, you have a 24-hour cooldown before retrying. Try a different card or wait.',
          },
          {
            title: 'Pick "Text message (SMS)" for identity verification',
            detail: 'Faster than voice call.',
            expected: 'Phone-number field appears, pre-filled from earlier.',
          },
          {
            title: 'Confirm phone number is correct → click "Send SMS"',
            detail: 'AWS texts a 4-digit code.',
            expected: 'Form replaces with a 4-digit input.',
          },
          {
            title: 'Type the 4-digit code → click "Continue"',
            detail: 'Code arrives within ~10 seconds.',
            expected: 'Green "Your identity has been verified" message. Page moves to "Select a support plan".',
          },
          {
            title: 'Pick "Basic support — Free"',
            detail: 'Click the Free card on the left. You can upgrade later (Developer $29/mo, Business $100/mo).',
            expected: 'Basic card highlighted.',
          },
          {
            title: 'Click "Complete sign up"',
            detail: 'Orange button at the bottom.',
            expected: 'Page shows "Congratulations" + your 12-digit AWS Account ID. WRITE IT DOWN.',
          },
          {
            title: 'Wait 5–10 minutes for activation, watch for the welcome email',
            detail: 'Subject: "Welcome to Amazon Web Services". Until it arrives, signing in returns "Account activation in progress".',
            expected: 'Welcome email arrives.',
            gotcha: 'If it takes > 1 hour, check Spam for an "Additional information needed" email from AWS verification.',
          },
          {
            title: 'Open https://console.aws.amazon.com → sign in as root',
            detail: 'Use your root email + the password from earlier. AWS asks for the email first, then password.',
            expected: 'You land on the AWS Console home page.',
          },
          {
            title: 'IMMEDIATELY enable MFA on root (see the next walkthrough)',
            detail: 'Don\'t do anything else first. Go to the MFA walkthrough on this page → follow the 16 atomic steps.',
            expected: 'MFA prompt appears at next sign-in.',
            gotcha: 'A root account without MFA is the #1 cause of "AWS account stolen" stories.',
          },
        ],
      },
      cli: {
        command: '# Account creation is a manual web flow — no CLI equivalent.',
        expected: '',
        verifyCommand: 'aws sts get-caller-identity  # after CLI is configured',
        gotchas: ['You cannot script account creation. AWS Organisations can create CHILD accounts via API, but the management account itself is always manual.'],
      },
      terraform: {
        code:
`# Terraform can only create CHILD accounts inside an existing AWS Organisation.
resource "aws_organizations_account" "dev" {
  name  = "yourname-dev"
  email = "dev+aws@yourdomain.com"
  role_name = "OrganizationAccountAccessRole"
}`,
        commands: 'terraform apply',
        expected: 'Creates a child account in your AWS Org and emails the address.',
        errors: [],
      },
      cloudformation: {
        template:
`# CloudFormation can create child accounts under an AWS Org with AWS::Organizations::Account.
Resources:
  DevAccount:
    Type: AWS::Organizations::Account
    Properties:
      AccountName: yourname-dev
      Email: dev+aws@yourdomain.com`,
        deployCommand: 'aws cloudformation deploy --template-file account.yaml --stack-name dev-account',
        verifyCommand: 'aws organizations list-accounts',
        errors: [],
      },
    },
    verify: 'Sign into https://console.aws.amazon.com — you should see the AWS Console home page with your region in the top-right.',
    gotchas: [
      'NEVER create access keys for the root user. Use only via the Console UI + MFA.',
      'Never share your account ID publicly with screenshots — it\'s used in some social-engineering attacks.',
      'Turn off the "Free Tier ended" notifications if they fire — the alarm is what protects you, not the email.',
    ],
    docs: 'https://docs.aws.amazon.com/accounts/latest/reference/welcome-first-time-user.html',
    examTip: 'CLF-C02 expects you to know: root user vs IAM user, the Shared Responsibility Model, and the difference between an AWS Account and an AWS Organization.',
  },

  // ====================================================================
  // MFA
  // ====================================================================
  'mfa': {
    service: 'account',
    title: 'Enable MFA on the root user',
    tagline: 'The single most important security setting in AWS.',
    overview: {
      whatYouLearn: ['How to add a virtual MFA device', 'What recovery looks like if you lose your phone'],
      whyItMatters: 'Without MFA, anyone who guesses or steals your root password owns your AWS account. With MFA, they\'d need your phone too.',
      prerequisites: ['Root account access', 'An authenticator app (Authy, Google Authenticator, 1Password, Bitwarden)'],
      time: '5 minutes',
      level: 'Beginner',
      examRelevance: 'CLF-C02 + SCS-C02 Domain 4 (identity).',
    },
    signal: { oneTime: true, urgent: true, services: ['iam'] },
    content: {
      console: {
        // Current AWS Console (May 2025+). Each step = ONE click.
        consoleUrl: 'https://us-east-1.console.aws.amazon.com/iam/home#/security_credentials',
        steps: [
          {
            title: 'Sign in to the AWS Console as ROOT',
            actions: [
              'Open https://console.aws.amazon.com',
              'Click "Root user" radio',
              'Type your root email',
              'Type your root password',
            ],
            expected: 'Top-right shows your root email + "AWS Account: 1234..." with no IAM user prefix.',
            gotcha: 'If the top-right shows a username followed by "@<account>", you\'re an IAM user — sign out and sign back in as root.',
          },
          {
            title: 'Open the account menu',
            actions: [
              'Look at the top-right of the console',
              'Click the box showing your account email',
            ],
            diagram:
`┌────────────────────────────────────────┐
│  AWS  Q Search...    [👤 root@you.com ▾]│
│                              ↑          │
│                          click here     │
└────────────────────────────────────────┘`,
            expected: 'A dropdown appears with: Account, Organization, Service Quotas, Security credentials, Sign out.',
          },
          {
            title: 'Click "Security credentials"',
            actions: [
              'In the dropdown, find "Security credentials"',
              'Click it',
            ],
            expected: 'You land on "My security credentials" page.',
          },
          {
            title: 'Find the MFA section',
            actions: [
              'Scroll down past "Password"',
              'Find "Multi-factor authentication (MFA)"',
            ],
            expected: 'You see an empty table headed "Device / Identifier / Created" with an "Assign MFA device" button.',
          },
          {
            title: 'Start the MFA wizard',
            actions: [
              'Click the orange "Assign MFA device" button',
            ],
            expected: 'A wizard opens — Step 1 of 2: "Device details".',
          },
          {
            title: 'Type a device name',
            actions: [
              'Click in the "Device name" field',
              'Type a descriptive name, e.g. "phone-root" or "yourname-root-phone"',
            ],
            expected: 'No red error.',
            gotcha: 'Use a unique name — you can\'t have two devices with the same name.',
          },
          {
            title: 'Pick MFA type',
            actions: [
              'Click the "Authenticator app" radio',
              '(Skip "Security key" and "Hardware TOTP token")',
              'Click "Next" bottom-right',
            ],
            expected: 'Step 2 of 2 "Set up device" page loads with a QR code on the right.',
          },
          {
            title: 'Open your authenticator app',
            actions: [
              'Pick up your phone',
              'Open Google Authenticator / Authy / 1Password / Bitwarden',
              'Tap the "+" or camera icon (usually top-right)',
              'Pick "Scan a QR code" / "Scan a barcode"',
            ],
            expected: 'Camera opens.',
          },
          {
            title: 'Scan the QR code',
            actions: [
              'Hold your phone ~20cm from the screen',
              'Point camera at the QR code in the middle of the AWS page',
              'Wait for the camera to focus',
            ],
            expected: 'A new entry appears in your authenticator labelled "Amazon Web Services" with a 6-digit code refreshing every 30s.',
            gotcha: 'If you can\'t scan, click "Show secret key" below the QR and type it into the app manually.',
          },
          {
            title: 'Enter the first MFA code',
            actions: [
              'Read the current 6-digit code from your phone',
              'Click in the AWS "MFA code 1" field',
              'Type the code',
            ],
            expected: 'Field shows 6 digits.',
          },
          {
            title: 'Wait for the code to refresh',
            actions: [
              'Watch the timer in your authenticator app',
              'Wait until it hits 0 and a new code appears',
            ],
            expected: 'New 6-digit code is visible in the app.',
            gotcha: 'If you type the same code twice, AWS rejects it. The 2 codes MUST be different/consecutive.',
          },
          {
            title: 'Enter the second MFA code',
            actions: [
              'Click in the AWS "MFA code 2" field',
              'Type the new code',
            ],
            expected: 'Both fields show 6 digits.',
          },
          {
            title: 'Submit',
            actions: [
              'Click the orange "Add MFA" button bottom-right',
            ],
            expected: 'Green banner: "MFA device assigned". Your new device is listed on Security credentials.',
          },
          {
            title: 'Test — sign out and back in',
            actions: [
              'Top-right account menu → click "Sign out"',
              'Open https://console.aws.amazon.com',
              'Sign in with root email + password',
              'When prompted, type the current 6-digit code from your authenticator',
            ],
            expected: 'You complete sign-in with MFA. Root is now protected.',
            verify: { kind: 'iam-user-has-mfa' },
          },
        ],
      },
      cli: {
        command:
`# Create a virtual MFA device
aws iam create-virtual-mfa-device \\
  --virtual-mfa-device-name root-mfa-phone \\
  --outfile QRCode.png --bootstrap-method QRCodePNG

# Scan QRCode.png with your authenticator, get two codes, then enable:
aws iam enable-mfa-device \\
  --user-name <iam-user-name> \\
  --serial-number arn:aws:iam::123456789012:mfa/root-mfa-phone \\
  --authentication-code-1 123456 \\
  --authentication-code-2 654321`,
        expected: 'No output = success. enable-mfa-device returns nothing on success.',
        verifyCommand: 'aws iam list-virtual-mfa-devices',
        gotchas: ['You CANNOT enable MFA on the root user via CLI — only IAM users. Root MFA is Console-only.'],
      },
      terraform: {
        code:
`# Terraform doesn't have a clean way to enable MFA on root.
# For IAM users:
resource "aws_iam_virtual_mfa_device" "user_mfa" {
  virtual_mfa_device_name = "alice-mfa"
}

# Then enable via aws iam enable-mfa-device CLI (Terraform can't do this).`,
        commands: 'terraform apply',
        expected: 'Creates the device; you complete the activation via CLI or Console.',
        errors: [],
      },
      cloudformation: {
        template: '# CloudFormation does NOT support enabling MFA. Console / CLI only.',
        deployCommand: '',
        verifyCommand: '',
        errors: [],
      },
    },
    verify: 'Sign out + back in — you should be prompted for an MFA code after the password.',
    gotchas: [
      'KEEP the recovery codes / setup key somewhere safe. If your phone is lost AND you have no backup, AWS Support recovery takes 2-3 weeks.',
      'Add MFA to every IAM user who can change permissions, not just root.',
    ],
    docs: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_enable_virtual.html',
    examTip: 'Security exams love MFA + Condition keys (aws:MultiFactorAuthPresent) — you can deny actions unless MFA is used.',
  },

  // ====================================================================
  // Billing alarm
  // ====================================================================
  'billing-alarm': _stub('billing-alarm', 'account', 'Set up a billing alarm', 'Catch surprise spend before it hits your card.',
    { whatYouLearn: ['How to enable billing metrics', 'How to publish to SNS + email yourself'], whyItMatters: 'You only ever miss a bill once if you have this set up. Costs $0 to maintain.', prerequisites: ['Root or admin access'], time: '5 minutes', level: 'Beginner', examRelevance: 'CLF-C02' },
    {
      console: ['Billing → Billing preferences → enable "Receive Free Tier usage alerts" + "Receive Billing Alerts".', 'CloudWatch (us-east-1!) → Alarms → Create alarm → Select metric → Billing → Total Estimated Charge.', 'Threshold: $5. Period: 6 hours.', 'SNS topic: create new, name "billing-alerts", subscribe your email.', 'Confirm the SNS subscription from the email AWS sends.', 'Repeat with $20 + $50 alarms for layered warnings.'],
      cli:
`aws cloudwatch put-metric-alarm \\
  --alarm-name billing-alarm-5usd \\
  --metric-name EstimatedCharges --namespace AWS/Billing \\
  --statistic Maximum --period 21600 --threshold 5 \\
  --comparison-operator GreaterThanThreshold --evaluation-periods 1 \\
  --dimensions Name=Currency,Value=USD \\
  --alarm-actions arn:aws:sns:us-east-1:123456789012:billing-alerts \\
  --region us-east-1`,
      terraform:
`resource "aws_cloudwatch_metric_alarm" "billing" {
  alarm_name          = "billing-alarm-5usd"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "EstimatedCharges"
  namespace           = "AWS/Billing"
  period              = 21600
  statistic           = "Maximum"
  threshold           = 5
  dimensions          = { Currency = "USD" }
  alarm_actions       = [aws_sns_topic.billing.arn]
  provider            = aws.us_east_1
}`,
      cloudformation:
`Resources:
  BillingAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: billing-alarm-5usd
      MetricName: EstimatedCharges
      Namespace: AWS/Billing
      Statistic: Maximum
      Period: 21600
      Threshold: 5
      ComparisonOperator: GreaterThanThreshold
      EvaluationPeriods: 1
      Dimensions:
        - Name: Currency
          Value: USD
      AlarmActions: [!Ref BillingSnsTopic]`,
    },
    'aws cloudwatch describe-alarms --alarm-names billing-alarm-5usd --region us-east-1',
    'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html',
    'us-east-1 is the ONLY region with billing metrics — the alarm must live there even if your workloads are elsewhere.',
  ),

  // ====================================================================
  // AWS CLI setup
  // ====================================================================
  'aws-cli-setup': _stub('aws-cli-setup', 'tools', 'Install + configure the AWS CLI',
    'The CLI is faster than the Console for 90% of daily work.',
    { whatYouLearn: ['How to install on macOS / Windows / Linux', 'How named profiles work', 'How to test the config'], whyItMatters: 'Every senior AWS engineer lives in the CLI. The Console is for first-time setup, the CLI is for everything else.', prerequisites: ['An IAM user (not root)', 'Access keys from that IAM user'], time: '10 minutes', level: 'Beginner', examRelevance: 'CLF-C02 + DVA-C02' },
    {
      console: ['Not applicable — the CLI is a local tool.'],
      cli:
`# macOS
brew install awscli

# Windows
# Download + install from https://aws.amazon.com/cli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
unzip awscliv2.zip && sudo ./aws/install

# Configure a profile:
aws configure --profile personal
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: eu-west-2
# Default output: json

# Test:
aws sts get-caller-identity --profile personal`,
      terraform: '# Terraform expects the CLI to be installed first — no Terraform pattern.',
      cloudformation: '# Not applicable.',
    },
    'aws sts get-caller-identity returns your IAM user ARN + account ID.',
    'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html',
    'Use --profile <name> always — protects you from running production commands against your personal account.',
  ),

  // ====================================================================
  // Dev environment
  // ====================================================================
  'dev-environment': _stub('dev-environment', 'tools', 'Set up your local dev environment',
    'VS Code + Git + Terraform + Docker + Node — the engineer\'s toolkit.',
    { whatYouLearn: ['What every AWS engineer installs locally', 'How to verify each tool works'], whyItMatters: 'A broken local toolchain costs you days. Spend 30 minutes here and save the next 30 hours.', prerequisites: ['Admin access to your laptop'], time: '30 minutes', level: 'Beginner', examRelevance: 'Foundational' },
    {
      console: ['Not applicable — local tooling.'],
      cli:
`# Pick your OS — install everything once.

# --- macOS (with Homebrew) ---
brew install git node terraform awscli docker
brew install --cask visual-studio-code

# --- Windows (with Chocolatey) ---
choco install git nodejs terraform awscli docker-desktop vscode

# --- Linux (Ubuntu / Debian) ---
sudo apt update
sudo apt install -y git nodejs npm docker.io
# Then Terraform + AWS CLI from official binaries

# Verify everything:
code --version
git --version
terraform --version
docker --version
node --version
aws --version`,
      terraform: '# n/a',
      cloudformation: '# n/a',
    },
    'All 6 commands print a version. You\'re ready.',
    'https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html',
    'Pin Node to the latest LTS — 20.x or 22.x. Avoid odd-numbered "current" releases for production work.',
  ),

  // ====================================================================
  // GitHub profile
  // ====================================================================
  'github-profile': _stub('github-profile', 'profile', 'Build a professional GitHub profile',
    'Your code portfolio. Recruiters look here before the resume.',
    { whatYouLearn: ['Profile basics that pass the 30-second test', 'How to use the profile README', 'How to pin your best work'], whyItMatters: 'A weak GitHub kills opportunities. A strong one creates them — even a few good repos and a clean README beats a 5-page CV.', prerequisites: ['A professional email'], time: '60 minutes', level: 'Beginner', examRelevance: 'Career — not exam.' },
    {
      console: [
        'Sign up at https://github.com — short, real-name-based username.',
        'Add real face photo. Avoid avatars / logos.',
        'Bio: one sentence — e.g. "AWS Cloud Engineer · Networking specialist · Building production AWS architectures".',
        'Create a repo named EXACTLY your username — its README becomes your profile front page.',
        'In that README: 2–4 sentence intro + 3 pinned project badges + AWS certs + LinkedIn link.',
        'Pin 4–6 repos showing variety: IaC, application code, documentation.',
        'Commit something every few days — green grid signals momentum.',
      ],
      cli:
`# Connect local git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Create + push your first repo
mkdir aws-projects && cd aws-projects
git init
echo "# AWS Projects" > README.md
git add . && git commit -m "Initial commit"

# Using GitHub CLI:
gh auth login
gh repo create aws-projects --public --source=. --push`,
      terraform: '# Terraform can manage GitHub repos via the github provider — overkill for a portfolio.',
      cloudformation: '# n/a',
    },
    'Open github.com/<your-username> in incognito — your bio + pinned repos show.',
    'https://docs.github.com/en/get-started',
    'Career — not exam.',
  ),

  // ====================================================================
  // LinkedIn profile
  // ====================================================================
  'linkedin-profile': _stub('linkedin-profile', 'profile', 'Build a hire-ready LinkedIn profile',
    'The single most important profile for UK + EU hiring.',
    { whatYouLearn: ['Headline + About copy that ranks in recruiter searches', 'How to position certifications + projects'], whyItMatters: '90% of UK cloud roles are filled via LinkedIn first. A weak profile is the difference between 0 and 5 recruiter messages a week.', prerequisites: [], time: '2 hours', level: 'Beginner', examRelevance: 'Career — not exam.' },
    {
      console: [
        'Sign up at https://linkedin.com.',
        'Photo: clear face, neutral background, friendly expression.',
        'Headline: "AWS Cloud Engineer | Network Administrator | Helping companies migrate to AWS" — 220 char limit, use every char.',
        'About: 3 short paragraphs — what you do, the value you deliver, a call to action. Add keywords: AWS, EC2, VPC, Terraform, Lambda, S3.',
        'Experience: each role gets 3–5 bullets that quantify impact ("Cut hosting cost by 42%...").',
        'Skills: AWS, Amazon EC2, Amazon S3, IAM, VPC, Terraform, Linux, CI/CD — order by relevance.',
        'Certifications: add each AWS cert with the credential ID + verify link.',
        'Location: set the UK city you target — it surfaces you in local searches.',
        'Connect with 30 AWS people in week 1 — Heroes, Community Builders, target-company employees.',
        'Turn on Open To Work (visible to recruiters only) when actively hunting.',
      ],
      cli: '# n/a — LinkedIn is web-only.',
      terraform: '# n/a',
      cloudformation: '# n/a',
    },
    'Your profile shows in the first 10 results when you search your name + "AWS" on LinkedIn.',
    'https://www.linkedin.com/help/linkedin/',
    'Career — not exam.',
  ),

  // ====================================================================
  // Upwork profile
  // ====================================================================
  'upwork-profile': _stub('upwork-profile', 'profile', 'Launch an Upwork profile that gets invites',
    'Your gateway to global remote AWS freelance income.',
    { whatYouLearn: ['Profile copy that earns invites', 'Rate strategy for new freelancers', 'How to use Connects efficiently'], whyItMatters: 'A weak Upwork profile fails the first 50 applications. A strong one gets invited within 2 weeks.', prerequisites: ['Government ID for verification'], time: '90 minutes', level: 'Beginner', examRelevance: 'Career — not exam.' },
    {
      console: [
        'Sign up at https://upwork.com → "Find work".',
        'Title (10 words max): "AWS Cloud Engineer — Infrastructure, Migrations, Cost Optimization".',
        'Overview (4,000 char limit): Hook → 3 specific problems you solve → 3 anonymised wins → certifications → CTA.',
        'Hourly rate: $12–15 to start. Raise by $5 every 5 successful jobs.',
        'Skills: pick the top 10 AWS-related ones — Amazon Web Services, Amazon EC2, AWS Lambda, Terraform, etc.',
        'Portfolio: add 3 anonymised case studies with architecture diagrams + GitHub links.',
        'Education + certifications: Cloud Practitioner, Solutions Architect Associate.',
        'Languages: English — Native or Fluent.',
        'Submit — Upwork manually approves within 24h.',
        'Buy 10–20 Connects. Apply to 5–10 jobs/day for the first 2 weeks.',
      ],
      cli: '# n/a',
      terraform: '# n/a',
      cloudformation: '# n/a',
    },
    'Upwork sends a "Profile approved" email; your public profile is live at upwork.com/freelancers/~yourid.',
    'https://support.upwork.com/hc/en-us/articles/211062898',
    'Career — not exam.',
  ),

  // ====================================================================
  // Blog setup
  // ====================================================================
  'blog-setup': _stub('blog-setup', 'profile', 'Start a public engineering blog',
    'Public learning is the cheapest career multiplier.',
    { whatYouLearn: ['How to pick a platform', 'First-post topics that work', 'Posting cadence that compounds'], whyItMatters: 'A blog post helps strangers, then helps your future self, then earns you interviews. The compounding return is silly.', prerequisites: [], time: '60 minutes', level: 'Beginner', examRelevance: 'Career — not exam.' },
    {
      console: [
        'Sign up at https://hashnode.com — free, devs-only, fast.',
        'Blog name: yourname.hashnode.dev (custom domain later).',
        'About: same as LinkedIn About for brand consistency.',
        'First post: "Why I\'m learning AWS in 2026" — 500–800 words, honest, link your GitHub.',
        'Cadence: 1/week beats 1/day. Document what you broke and how you fixed it.',
        'Early topics: "How I passed CLF-C02", "My first S3 + CloudFront site", "What VPC actually means".',
        'Cross-post to dev.to + Medium for reach.',
      ],
      cli: '# n/a',
      terraform: '# n/a',
      cloudformation: '# n/a',
    },
    'Your first post is live at yourname.hashnode.dev; share on LinkedIn for the algorithm boost.',
    'https://hashnode.com',
    'Career — not exam.',
  ),

  // ====================================================================
  // ACM cert
  // ====================================================================
  'acm-cert': _stub('acm-cert', 'acm', 'Request a TLS certificate in ACM',
    'Free, auto-renewing, browser-trusted certificates.',
    { whatYouLearn: ['How to validate a domain via DNS', 'Why CloudFront needs us-east-1 ACM certs', 'How to attach a cert to a load balancer / CloudFront'], whyItMatters: 'TLS is non-negotiable. ACM makes it free + automatic. Nobody should be paying for or manually rotating certs in 2026.', prerequisites: ['A domain you control (Route 53 or external DNS)'], time: '10 minutes', level: 'Beginner', examRelevance: 'SAA-C03 Domain 1' },
    {
      console: [
        'Switch the region to us-east-1 if the cert will be used with CloudFront — otherwise pick the region of your ALB.',
        'ACM → "Request certificate" → Public.',
        'Domain: example.com. Add Subject Alternative Names: *.example.com, www.example.com.',
        'Validation method: DNS (preferred — auto-renews forever).',
        'Issue. ACM shows CNAME records — add them to your DNS provider.',
        'In Route 53: one click to add the CNAMEs automatically.',
        'Wait 5–30 minutes for status to flip to "Issued".',
      ],
      cli:
`aws acm request-certificate \\
  --domain-name example.com \\
  --subject-alternative-names "*.example.com" \\
  --validation-method DNS \\
  --region us-east-1`,
      terraform:
`resource "aws_acm_certificate" "cert" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com"]
  validation_method         = "DNS"
  provider                  = aws.us_east_1   # CloudFront requires us-east-1

  lifecycle { create_before_destroy = true }
}

resource "aws_route53_record" "validation" {
  for_each = {
    for d in aws_acm_certificate.cert.domain_validation_options : d.domain_name => {
      name  = d.resource_record_name
      type  = d.resource_record_type
      value = d.resource_record_value
    }
  }
  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.value]
  ttl     = 60
}`,
      cloudformation:
`Resources:
  Cert:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: example.com
      SubjectAlternativeNames: ['*.example.com']
      ValidationMethod: DNS
      DomainValidationOptions:
        - DomainName: example.com
          HostedZoneId: !Ref HostedZone`,
    },
    'aws acm list-certificates --region us-east-1 shows the cert with status ISSUED.',
    'https://docs.aws.amazon.com/acm/latest/userguide/gs.html',
    'Know: ACM is free for public certs but you pay for private CA. Imported (third-party) certs can\'t be auto-renewed by ACM.',
  ),

  // ====================================================================
  // CloudFront
  // ====================================================================
  'cloudfront': _stub('cloudfront', 'cloudfront', 'Create a CloudFront distribution',
    'AWS\'s global edge CDN. ~600 PoPs worldwide.',
    { whatYouLearn: ['Origin types (S3 vs ALB vs custom)', 'Cache policies', 'OAC for private S3 origins'], whyItMatters: 'Without a CDN, every byte travels from your origin region to every user. CloudFront caches at the edge and cuts latency 5–10×.', prerequisites: ['An origin (S3 bucket or ALB)', 'An ACM cert in us-east-1 if using a custom domain'], time: '15 minutes (+ 5–10 min for first deploy)', level: 'Intermediate', examRelevance: 'SAA-C03 Domain 3' },
    {
      console: [
        'CloudFront → "Create distribution".',
        'Origin domain: pick your S3 bucket OR ALB.',
        'For private S3: enable "Origin access control" (OAC) — better than legacy OAI.',
        'Viewer protocol policy: Redirect HTTP to HTTPS.',
        'Allowed HTTP methods: GET, HEAD for a static site; GET, HEAD, OPTIONS for a SPA.',
        'Cache policy: "CachingOptimized" is the safe default.',
        'Alternate domain names: example.com, www.example.com.',
        'Custom SSL: pick the ACM cert in us-east-1.',
        'Default root object: index.html.',
        'Create. First deploy takes 5–10 minutes — be patient.',
      ],
      cli:
`# CloudFront CLI is verbose — use a JSON config file:
aws cloudfront create-distribution --distribution-config file://cf-config.json`,
      terraform:
`resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = ["example.com", "www.example.com"]
  price_class         = "PriceClass_100"   # cheapest — NA + EU only

  origin {
    domain_name              = aws_s3_bucket.main.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.s3.id
    origin_id                = "s3-origin"
  }

  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cert.arn
    ssl_support_method  = "sni-only"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
}`,
      cloudformation:
`Resources:
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Enabled: true
        DefaultRootObject: index.html
        Aliases: [example.com, www.example.com]
        Origins:
          - Id: s3-origin
            DomainName: !GetAtt Bucket.RegionalDomainName
            S3OriginConfig:
              OriginAccessIdentity: ''
        DefaultCacheBehavior:
          TargetOriginId: s3-origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [GET, HEAD]
          CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
        ViewerCertificate:
          AcmCertificateArn: !Ref Cert
          SslSupportMethod: sni-only`,
    },
    'curl -I https://your-domain.cloudfront.net returns HTTP/2 200 with an x-cache header.',
    'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-creating-console.html',
    'Know: CloudFront edge locations vs regional edge caches. Use OAC instead of OAI (OAI is legacy).',
  ),

  // ====================================================================
  // Route 53 alias
  // ====================================================================
  'route53': _stub('route53', 'route53', 'Point your domain at AWS resources',
    'Route 53 is AWS\'s DNS + domain registrar. Alias records are the AWS magic.',
    { whatYouLearn: ['When to use Alias vs CNAME', 'Routing policies (Simple, Weighted, Latency, Failover)', 'Health checks'], whyItMatters: 'Alias records let you point apex domains at AWS resources for free, with no CNAME fee, and they\'re cheaper than CNAMEs.', prerequisites: ['A hosted zone for your domain'], time: '5 minutes', level: 'Beginner', examRelevance: 'SAA-C03 Domain 2 + 3' },
    {
      console: [
        'Route 53 → Hosted zones → your domain → Create record.',
        'Record name: blank for apex, "www" for subdomain.',
        'Record type: A.',
        'Toggle Alias ON.',
        'Alias target: pick "CloudFront distribution" → your distribution.',
        'Routing policy: Simple. Create.',
        'Repeat for AAAA (IPv6).',
      ],
      cli:
`aws route53 change-resource-record-sets \\
  --hosted-zone-id Z123ABCDEFGHIJ \\
  --change-batch file://change-batch.json`,
      terraform:
`resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "example.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}`,
      cloudformation:
`Resources:
  ApexRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZone
      Name: example.com
      Type: A
      AliasTarget:
        DNSName: !GetAtt CloudFrontDistribution.DomainName
        HostedZoneId: Z2FDTNDATAQYW2  # CloudFront's fixed zone ID`,
    },
    'dig example.com → resolves to a CloudFront IP (cloudfront.net hostname in answer).',
    'https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html',
    'CloudFront\'s hosted zone ID is ALWAYS Z2FDTNDATAQYW2 — memorise it for the exam.',
  ),

  // ====================================================================
  // CloudFront invalidation
  // ====================================================================
  'cloudfront-invalidate': _stub('cloudfront-invalidate', 'cloudfront', 'Invalidate the CloudFront cache',
    'After a deploy, force CloudFront to fetch fresh content.',
    { whatYouLearn: ['When to invalidate vs cache-bust with hashed filenames', 'Cost of invalidations'], whyItMatters: 'No invalidation = users see old content for up to 24 hours.', prerequisites: ['An existing CloudFront distribution'], time: '2 minutes', level: 'Beginner', examRelevance: 'SAA-C03' },
    {
      console: [
        'CloudFront → distribution → Invalidations → Create invalidation.',
        'Object paths: /index.html (most common). Avoid /* unless absolutely needed.',
        'Create. Propagation: 1–5 minutes.',
      ],
      cli:
`aws cloudfront create-invalidation \\
  --distribution-id E1ABCDEFGHIJK \\
  --paths "/index.html"`,
      terraform:
`# Invalidations aren't a Terraform resource — they're a runtime action.
# Use a null_resource provisioner that runs after a deploy:
resource "null_resource" "invalidate" {
  triggers = { always_run = timestamp() }
  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id \${aws_cloudfront_distribution.main.id} --paths '/index.html'"
  }
}`,
      cloudformation: '# CloudFormation doesn\'t support invalidations — use a CodePipeline post-deploy step.',
    },
    'aws cloudfront list-invalidations --distribution-id E1ABCDEFGHIJK → status Completed.',
    'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html',
    'First 1,000 invalidation paths/month are free. /* counts as ONE path. Don\'t go wild.',
  ),

  // ====================================================================
  // Other patterns — kept compact for now (Console + CLI only)
  // ====================================================================
  'ec2-launch': _stub('ec2-launch', 'ec2', 'Launch an EC2 instance',
    'Linux + Windows servers, on-demand.',
    { whatYouLearn: ['AMI selection', 'Security groups', 'IAM instance profiles', 'Key pairs'], whyItMatters: 'EC2 is the foundation of "lift and shift" migrations.', prerequisites: ['A VPC + subnet', 'An SSH key pair'], time: '10 minutes', level: 'Beginner', examRelevance: 'SAA-C03 Domain 3' },
    {
      console: ['EC2 → Launch instance.', 'AMI: Amazon Linux 2023 (Free Tier).', 'Type: t2.micro / t3.micro (Free Tier).', 'Key pair: create + download .pem.', 'Network: pick VPC + public subnet for SSH access.', 'Security group: SSH (22) from MY IP only.', 'Storage: 8 GiB gp3.', 'IAM instance profile: attach EC2-S3-Reader if app needs S3.', 'Launch.'],
      cli:
`aws ec2 run-instances \\
  --image-id ami-0abcd1234efgh5678 \\
  --instance-type t3.micro \\
  --key-name your-key \\
  --security-group-ids sg-0123abcd \\
  --subnet-id subnet-0a1b2c3d \\
  --iam-instance-profile Name=ec2-s3-reader \\
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=app-1}]'`,
      terraform:
`resource "aws_instance" "app" {
  ami                  = "ami-0abcd1234efgh5678"
  instance_type        = "t3.micro"
  key_name             = "your-key"
  subnet_id            = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile = aws_iam_instance_profile.app.name
  tags                 = { Name = "app-1" }
}`,
      cloudformation:
`Resources:
  AppInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0abcd1234efgh5678
      InstanceType: t3.micro
      KeyName: your-key
      SubnetId: !Ref PublicSubnet
      SecurityGroupIds: [!Ref AppSecurityGroup]
      IamInstanceProfile: !Ref AppInstanceProfile
      Tags: [{Key: Name, Value: app-1}]`,
    },
    'ssh -i your-key.pem ec2-user@<public-ip> lands in a shell within 30 seconds.',
    'https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html',
    'Know spot vs reserved vs on-demand pricing. Know what AMI, security group, and instance profile do.',
  ),

  'iam-role': _stub('iam-role', 'iam', 'Create an IAM role with least privilege',
    'IAM roles let AWS services act on your behalf without long-lived keys.',
    { whatYouLearn: ['Trust policies vs permission policies', 'Instance profiles', 'Managed vs inline policies'], whyItMatters: 'Roles eliminate the need to ship access keys to EC2/Lambda/ECS — the single biggest IAM security win.', prerequisites: ['IAM admin permissions'], time: '10 minutes', level: 'Beginner', examRelevance: 'SCS-C02 + SAA-C03 Domain 1' },
    {
      console: ['IAM → Roles → Create role.', 'Trusted entity: AWS service.', 'Use case: EC2 (or Lambda / ECS).', 'Permissions: AmazonS3ReadOnlyAccess OR custom inline.', 'Role name: descriptive (ec2-s3-reader-prod).', 'Create. To attach to EC2: launch wizard → IAM instance profile.'],
      cli:
`aws iam create-role --role-name ec2-s3-reader \\
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy --role-name ec2-s3-reader \\
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

aws iam create-instance-profile --instance-profile-name ec2-s3-reader
aws iam add-role-to-instance-profile \\
  --instance-profile-name ec2-s3-reader --role-name ec2-s3-reader`,
      terraform:
`resource "aws_iam_role" "ec2_s3_reader" {
  name = "ec2-s3-reader"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3_ro" {
  role       = aws_iam_role.ec2_s3_reader.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_instance_profile" "ec2_s3_reader" {
  name = aws_iam_role.ec2_s3_reader.name
  role = aws_iam_role.ec2_s3_reader.name
}`,
      cloudformation:
`Resources:
  Ec2S3ReaderRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal: { Service: ec2.amazonaws.com }
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
  Ec2S3ReaderProfile:
    Type: AWS::IAM::InstanceProfile
    Properties:
      Roles: [!Ref Ec2S3ReaderRole]`,
    },
    'On the EC2: curl http://169.254.169.254/latest/meta-data/iam/security-credentials/ec2-s3-reader returns temp credentials.',
    'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create.html',
    'Trust policy = WHO can assume the role. Permissions policy = WHAT they can do. Exam confuses these constantly.',
  ),

  'vpc-setup': _stub('vpc-setup', 'vpc', 'Create a VPC with public + private subnets',
    'Your private network on AWS. Two AZs minimum for HA.',
    { whatYouLearn: ['CIDR planning', 'Public vs private subnet routing', 'NAT Gateway cost', 'VPC endpoints'], whyItMatters: 'Every non-trivial workload runs in a VPC. Get the layout wrong and you re-architect later.', prerequisites: ['Admin permissions in the region'], time: '15 minutes', level: 'Intermediate', examRelevance: 'SAA-C03 Domain 1 + 3, ANS-C01' },
    {
      console: ['VPC → Create VPC → "VPC and more" wizard.', 'Name: app-prod-vpc. CIDR: 10.0.0.0/16.', 'AZs: 2 minimum, 3 for prod.', '1 public + 1 private subnet per AZ.', 'NAT: 1 per AZ for prod ($33/mo each). "None" for dev.', 'VPC endpoints: enable S3 gateway endpoint (free).', 'Create. Wait 1–2 minutes.'],
      cli: '# Hand-rolled VPC is 10+ CLI commands — use the Console wizard or Terraform.',
      terraform:
`module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "app-prod-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["eu-west-2a", "eu-west-2b", "eu-west-2c"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = false  # 1 NAT per AZ for prod HA
  enable_vpn_gateway   = false

  tags = { Environment = "prod" }
}`,
      cloudformation: '# Use the AWS VPC reference architecture template from https://aws.amazon.com/quickstart/architecture/vpc/',
    },
    'aws ec2 describe-vpcs --filters Name=tag:Name,Values=app-prod-vpc → returns one VPC.',
    'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-getting-started.html',
    'Know: route tables, NACLs vs security groups (NACL=stateless, SG=stateful), VPC peering vs Transit Gateway.',
  ),

  'rds': _stub('rds', 'rds', 'Provision an RDS database',
    'Managed Postgres / MySQL / Aurora.',
    { whatYouLearn: ['Multi-AZ vs read replicas', 'Backup retention', 'Parameter groups', 'Secrets Manager integration'], whyItMatters: 'RDS removes the operational burden of running databases. Letting AWS handle patches, backups, and failover frees you for app work.', prerequisites: ['A VPC with private subnets', 'A security group'], time: '15 minutes + 5–10 min provisioning', level: 'Intermediate', examRelevance: 'DBS-C01 + SAA-C03 Domain 3' },
    {
      console: ['RDS → Create database → Standard create.', 'Engine: PostgreSQL latest.', 'Template: "Free tier" while testing.', 'Instance class: db.t3.micro (free).', 'Storage: 20 GiB gp3, autoscale to 100 GiB.', 'VPC: same as your app. Private subnets only.', 'Security group: port 5432 from app SG only.', 'Public access: NO.', 'Backups: 7 days minimum.', 'Multi-AZ: ON for prod.', 'Master password: use Secrets Manager.', 'Create. Wait 5–10 minutes.'],
      cli:
`aws rds create-db-instance \\
  --db-instance-identifier app-prod \\
  --db-instance-class db.t3.micro \\
  --engine postgres \\
  --master-username dbadmin \\
  --master-user-password "$(openssl rand -base64 32)" \\
  --allocated-storage 20 \\
  --vpc-security-group-ids sg-0123abcd \\
  --db-subnet-group-name app-db-subnet-group \\
  --backup-retention-period 7`,
      terraform:
`resource "aws_db_instance" "main" {
  identifier         = "app-prod"
  engine             = "postgres"
  engine_version     = "16.3"
  instance_class     = "db.t3.micro"
  allocated_storage  = 20
  storage_type       = "gp3"
  username           = "dbadmin"
  manage_master_user_password = true   # Secrets Manager integration
  vpc_security_group_ids      = [aws_security_group.db.id]
  db_subnet_group_name        = aws_db_subnet_group.main.name
  backup_retention_period     = 7
  multi_az                    = true
  skip_final_snapshot         = false
}`,
      cloudformation:
`Resources:
  Db:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: app-prod
      Engine: postgres
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      MasterUsername: dbadmin
      ManageMasterUserPassword: true
      VPCSecurityGroups: [!Ref DbSecurityGroup]
      DBSubnetGroupName: !Ref DbSubnetGroup
      BackupRetentionPeriod: 7
      MultiAZ: true`,
    },
    'aws rds describe-db-instances --db-instance-identifier app-prod → DBInstanceStatus "available".',
    'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_GettingStarted.html',
    'Multi-AZ ≠ read replica. Multi-AZ = standby for failover only. Read replica = read scaling, can become standalone.',
  ),

  'lambda': _stub('lambda', 'lambda', 'Create a Lambda function',
    'Serverless compute. Pay per invocation, no servers to manage.',
    { whatYouLearn: ['Runtime + handler signature', 'Memory + timeout tuning', 'Event sources'], whyItMatters: 'Lambda is the default compute for new AWS workloads. Cheaper + simpler than EC2 for event-driven code.', prerequisites: ['IAM execution role'], time: '10 minutes', level: 'Beginner', examRelevance: 'DVA-C02 heavy + SAA-C03' },
    {
      console: ['Lambda → Create function → Author from scratch.', 'Runtime: Python 3.12 or Node.js 20.x.', 'Architecture: arm64 (Graviton — cheaper).', 'Execution role: new role with basic Lambda perms.', 'Code: paste handler.', 'Memory: 512 MB. Timeout: 30s.', 'Add a trigger (API Gateway / S3 / EventBridge).'],
      cli:
`zip function.zip lambda_function.py

aws lambda create-function \\
  --function-name MyFn \\
  --runtime python3.12 \\
  --architectures arm64 \\
  --role arn:aws:iam::123456789012:role/lambda-basic \\
  --handler lambda_function.handler \\
  --zip-file fileb://function.zip \\
  --memory-size 512 \\
  --timeout 30`,
      terraform:
`resource "aws_lambda_function" "my_fn" {
  function_name    = "MyFn"
  filename         = "function.zip"
  source_code_hash = filebase64sha256("function.zip")
  runtime          = "python3.12"
  architectures    = ["arm64"]
  role             = aws_iam_role.lambda_basic.arn
  handler          = "lambda_function.handler"
  memory_size      = 512
  timeout          = 30
}`,
      cloudformation:
`Resources:
  MyFn:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: MyFn
      Runtime: python3.12
      Architectures: [arm64]
      Role: !GetAtt LambdaRole.Arn
      Handler: lambda_function.handler
      Code:
        S3Bucket: my-deploy-bucket
        S3Key: function.zip
      MemorySize: 512
      Timeout: 30`,
    },
    'aws lambda invoke --function-name MyFn --payload \'{"test":1}\' out.json && cat out.json',
    'https://docs.aws.amazon.com/lambda/latest/dg/getting-started.html',
    'Cold starts: bigger memory = faster cold start. arm64 (Graviton) is ~20% cheaper than x86.',
  ),

  'apigateway': _stub('apigateway', 'apigateway', 'Set up API Gateway → Lambda',
    'HTTP API is cheaper + faster than REST API for most use cases.',
    { whatYouLearn: ['HTTP API vs REST API', 'Lambda proxy integration', 'CORS', 'Custom domain'], whyItMatters: 'API Gateway is how the world reaches your Lambda. Get it right once and forget it.', prerequisites: ['A Lambda function'], time: '15 minutes', level: 'Intermediate', examRelevance: 'DVA-C02' },
    {
      console: ['API Gateway → Create API → HTTP API.', 'Add integration: Lambda → your function.', 'Routes: ANY /items, GET /items/{id}.', 'Stages: $default auto-deploys.', 'CORS: enable + allow your frontend origin.', 'Custom domain: ACM cert + Route 53 alias.'],
      cli:
`aws apigatewayv2 create-api \\
  --name my-api \\
  --protocol-type HTTP \\
  --target arn:aws:lambda:eu-west-2:123:function:MyFn`,
      terraform:
`resource "aws_apigatewayv2_api" "api" {
  name          = "my-api"
  protocol_type = "HTTP"
  target        = aws_lambda_function.my_fn.arn
}

resource "aws_lambda_permission" "api_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_fn.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_apigatewayv2_api.api.execution_arn}/*/*"
}`,
      cloudformation: '# Use AWS SAM for serverless — much less verbose than raw CloudFormation here.',
    },
    'curl https://abc123.execute-api.eu-west-2.amazonaws.com/items returns JSON.',
    'https://docs.aws.amazon.com/apigateway/latest/developerguide/getting-started.html',
    'REST API = more features (API keys, usage plans, request/response transforms). HTTP API = cheaper + lower latency.',
  ),

  'cloudwatch': _stub('cloudwatch', 'cloudwatch', 'Set up CloudWatch alarms',
    'AWS\'s metrics + alarms service. Free for default metrics.',
    { whatYouLearn: ['Metric vs alarm vs dashboard', 'SNS notifications', 'Composite alarms'], whyItMatters: 'Without alarms, you find out about problems from your users. Set them up before launch.', prerequisites: ['An SNS topic with email subscription'], time: '10 minutes', level: 'Beginner', examRelevance: 'SOA-C02 Domain 1' },
    {
      console: ['CloudWatch → Alarms → Create alarm → Select metric.', 'EC2 → Per-instance → CPUUtilization.', 'Threshold: > 80% for 5 min.', 'Notification: SNS topic that fans to email + Slack.', 'Repeat for: disk (needs agent), memory (needs agent), 4xx/5xx on ALB.'],
      cli:
`aws cloudwatch put-metric-alarm \\
  --alarm-name ec2-cpu-high \\
  --metric-name CPUUtilization --namespace AWS/EC2 \\
  --statistic Average --period 300 --threshold 80 \\
  --comparison-operator GreaterThanThreshold --evaluation-periods 1 \\
  --dimensions Name=InstanceId,Value=i-0123abcd \\
  --alarm-actions arn:aws:sns:eu-west-2:123:ops-alerts`,
      terraform:
`resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "ec2-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  dimensions          = { InstanceId = aws_instance.app.id }
  alarm_actions       = [aws_sns_topic.ops_alerts.arn]
}`,
      cloudformation:
`Resources:
  CpuAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: ec2-cpu-high
      MetricName: CPUUtilization
      Namespace: AWS/EC2
      Statistic: Average
      Period: 300
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      EvaluationPeriods: 1
      Dimensions:
        - Name: InstanceId
          Value: !Ref AppInstance
      AlarmActions: [!Ref OpsAlertsTopic]`,
    },
    'aws cloudwatch describe-alarms --alarm-names ec2-cpu-high → StateValue OK.',
    'https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html',
    'CloudWatch Logs Insights is the query language for searching log groups — much faster than `grep`.',
  ),
};

// ====================================================================
// Helper: builds a guide object from compact arrays — keeps the library
// concise without losing the rich schema.
// ====================================================================
function _stub(id, service, title, tagline, overview, content, verify, docs, examTip) {
  return {
    service,
    title,
    tagline,
    overview,
    signal: { oneTime: true, services: [service] },
    content: {
      console: { steps: (content.console || []).map((c) =>
        typeof c === 'string' ? { title: c.split('.')[0] + '.', detail: c } : c
      )},
      cli: content.cli ? {
        command: content.cli,
        expected: 'See output above — non-error response confirms success.',
        verifyCommand: content.verifyCommand || verify,
        gotchas: [],
      } : null,
      terraform: content.terraform ? {
        code: content.terraform,
        commands: 'terraform init && terraform apply',
        expected: '"Apply complete!" message.',
        errors: [],
      } : null,
      cloudformation: content.cloudformation ? {
        template: content.cloudformation,
        deployCommand: `aws cloudformation deploy --template-file ${id}.yaml --stack-name ${id}-stack`,
        verifyCommand: verify,
        errors: [],
      } : null,
    },
    verify,
    gotchas: [],
    docs,
    examTip,
  };
}

// ====================================================================
// Public API
// ====================================================================

/**
 * Pick the best guide for a step. Accepts both the ProjectDetail shape
 * ({ title, subs: [{title}] }) and the Roadmap task shape
 * ({ title, description, subtasks: [{title}] }).
 *
 * Always returns SOMETHING — falls back to a generic study-notes guide
 * derived from the task itself so every roadmap task has a learning
 * card, even ones the pattern library doesn't recognise.
 */
export function guideFor(step) {
  const haystack = [
    step?.title || '',
    step?.description || '',
    ...((step?.subs || step?.subtasks || []).map((s) => s.title || '')),
  ].join(' \n ').toLowerCase();

  for (const p of PATTERNS) {
    if (p.re.test(haystack)) return GUIDES[p.id] || null;
  }
  return _genericGuide(step);
}

/**
 * Generic fallback — turns the task itself into a study card. Surfaces
 * the description, lets the user open the AI assistant pre-loaded for
 * this task, links them to Resources + Learning Lab.
 */
function _genericGuide(step) {
  if (!step) return null;
  const subs = (step.subs || step.subtasks || []);
  return {
    service: 'task',
    title: step.title || 'Task walkthrough',
    tagline: step.description || 'Use this card as a study plan — the AI Study Assistant has a full walkthrough.',
    overview: {
      whatYouLearn: subs.length
        ? subs.slice(0, 6).map((s) => s.title || s)
        : ['Read the task description above', 'Open the resources panel below', 'Tick subtasks as you finish them'],
      whyItMatters: 'Every roadmap task moves you closer to your AWS goal. Treat each one as a mini-lesson — read, do, tick, move on.',
      prerequisites: ['Internet access', 'The previous task in this phase should be complete'],
      time: '15–60 minutes (varies)',
      level: 'See task difficulty',
      examRelevance: 'General career progression',
    },
    signal: { oneTime: true, services: [] },
    content: {
      console: {
        steps: [
          {
            title: 'Read the task title and description carefully',
            detail: 'Make sure you understand what you\'re being asked to do before starting.',
          },
          {
            title: 'Click "Ask AI for help" at the bottom of this panel',
            detail: 'The AI Study Assistant opens with this exact task pre-loaded as a question — just hit Enter for a full walkthrough.',
          },
          {
            title: 'Work through the subtasks one at a time',
            detail: 'Tick each subtask as you finish it. The progress bar updates automatically.',
          },
          {
            title: 'Use the Notes section to capture anything you want to remember',
            detail: 'Future you will thank present you.',
          },
        ],
      },
      cli: null,
      terraform: null,
      cloudformation: null,
    },
    verify: 'All subtasks ticked off + the task progress shows 100%.',
    gotchas: [
      'Don\'t skip the task description — it explains the "why".',
      'If something is unclear, hit "Ask AI for help" instead of guessing.',
    ],
    docs: null,
    examTip: null,
  };
}

/** Convenience: lookup a guide directly by id (used by future "linked from learning topic" callers). */
export function guideById(id) {
  return GUIDES[id] || null;
}

/** All guides for a service id. */
export function guidesForService(serviceId) {
  return Object.values(GUIDES).filter((g) => g.service === serviceId);
}
