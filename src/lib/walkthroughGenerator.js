/**
 * walkthroughGenerator.js — PJ-04 Phase B.
 *
 * Takes a free-form brief OR service list + project metadata, returns a
 * complete Deep Walkthrough object compatible with DEEP_WALKTHROUGHS.
 *
 * Pipeline:
 *   1) Detect AWS services mentioned in the brief (alias matching)
 *   2) Merge with explicit services list (dedupe)
 *   3) Order services by canonical build sequence (foundation → security
 *      → storage → data → compute → edge → integration → monitoring)
 *   4) Compose each service's templated step into a numbered walkthrough
 *   5) Inject prerequisites + difficulty + time estimate
 */

import { resolvePricingKey } from '../data/awsPricing.js';

// ════════════════════════════════════════════════════════════════════
// Service detection from free-text brief
// ════════════════════════════════════════════════════════════════════

// Patterns to find services mentioned in text. Lowercased + word-bounded.
const SERVICE_PATTERNS = {
  s3:           /\b(s3|s 3|simple storage|object storage|buckets?)\b/,
  cloudfront:   /\b(cloudfront|cdn|edge cache)\b/,
  route53:      /\b(route\s?53|dns|hosted zone|domain|nameservers?)\b/,
  acm:          /\b(acm|certificate manager|tls cert|ssl cert|https cert)\b/,
  vpc:          /\b(vpc|virtual private cloud|subnets?|cidr)\b/,
  ec2:          /\b(ec2|virtual machines?|vms?|instances?|servers?)\b/,
  ebs:          /\b(ebs|elastic block|block storage|volumes?)\b/,
  alb:          /\b(alb|application load balancer|load balancer|elb)\b/,
  nlb:          /\b(nlb|network load balancer)\b/,
  asg:          /\b(asg|auto[\s-]?scaling)\b/,
  lambda:       /\b(lambda|functions?|serverless function)\b/,
  apigateway:   /\b(api gateway|api\s?gw|rest api|http api)\b/,
  dynamodb:     /\b(dynamo\s?db|dynamo|nosql|key[\s-]?value)\b/,
  rds:          /\b(rds|relational|postgres|mysql|mariadb|oracle|sql server|aurora)\b/,
  aurora:       /\b(aurora|aurora postgres|aurora mysql)\b/,
  ecs:          /\b(ecs|fargate|containers?|docker)\b/,
  eks:          /\b(eks|kubernetes|k8s|helm)\b/,
  elasticache:  /\b(elasticache|redis|memcached|cache)\b/,
  sqs:          /\b(sqs|message queue|queue)\b/,
  sns:          /\b(sns|pub.?sub|notifications?|topic)\b/,
  eventbridge:  /\b(eventbridge|event bus|cloudwatch events)\b/,
  step:         /\b(step functions?|state machine|workflow|orchestrat)/,
  iam:          /\b(iam|role|policy|user|permissions|access management)\b/,
  cognito:      /\b(cognito|user pool|identity pool|signup|signin|oauth)\b/,
  kms:          /\b(kms|encryption keys?|cmk|envelope encryption)\b/,
  secretsmgr:   /\b(secrets manager|password rotation|api keys?)\b/,
  ssm:          /\b(parameter store|ssm|systems manager)\b/,
  waf:          /\b(waf|web app firewall|owasp)\b/,
  shield:       /\b(shield|ddos)\b/,
  cloudtrail:   /\b(cloudtrail|audit log|api audit)\b/,
  cloudwatch:   /\b(cloudwatch|monitoring|metrics|alarms?|logs?)\b/,
  config:       /\b(aws config|compliance)\b/,
  glue:         /\b(glue|etl|crawler|data catalog)\b/,
  athena:       /\b(athena|sql on s3|query s3)\b/,
  redshift:     /\b(redshift|data warehouse|warehouse)\b/,
  kinesis:      /\b(kinesis|streams?|firehose)\b/,
  bedrock:      /\b(bedrock|llm|gen.?ai|chatbot|claude|llama|titan|mistral|cohere)\b/,
  cloudformation: /\b(cloudformation|cfn|iac|infrastructure as code)\b/,
};

export function detectServicesInBrief(brief = '') {
  const text = String(brief).toLowerCase();
  const found = [];
  for (const [svc, pattern] of Object.entries(SERVICE_PATTERNS)) {
    if (pattern.test(text)) found.push(svc);
  }
  return found;
}

// ════════════════════════════════════════════════════════════════════
// Build-order tiers — lower number = build earlier
// ════════════════════════════════════════════════════════════════════
const BUILD_ORDER = {
  // Foundation
  iam: 0, cloudformation: 0,
  // Network
  vpc: 1,
  route53: 2, acm: 2,
  // Security
  kms: 3, secretsmgr: 3, ssm: 3, cognito: 3, waf: 4, shield: 4,
  // Storage
  s3: 5, ebs: 5, efs: 5,
  // Data
  dynamodb: 6, rds: 6, aurora: 6, elasticache: 6, redshift: 6,
  // Compute
  ec2: 7, lambda: 7, ecs: 7, eks: 7, asg: 7, fargate: 7,
  // Edge / API
  apigateway: 8, alb: 8, nlb: 8, cloudfront: 8,
  // Integration
  sqs: 9, sns: 9, eventbridge: 9, step: 9,
  // Analytics
  glue: 10, athena: 10, kinesis: 10,
  // GenAI
  bedrock: 11,
  // Monitoring + audit
  cloudwatch: 12, cloudtrail: 12, config: 12,
};

function orderServices(services) {
  return [...new Set(services)]
    .filter((s) => STEP_TEMPLATES[s])
    .sort((a, b) => (BUILD_ORDER[a] ?? 99) - (BUILD_ORDER[b] ?? 99));
}

// ════════════════════════════════════════════════════════════════════
// STEP_TEMPLATES — per-service templated step content
// Each template: { title, what, why, analogy, mistakes[], how:{console, cli, cfn, tf} }
// ════════════════════════════════════════════════════════════════════
const STEP_TEMPLATES = {
  iam: {
    title: 'Create an IAM role/user for least-privilege access',
    what: 'Provision an IAM identity with only the permissions this project needs.',
    why: 'Hard-coded root credentials are the #1 source of compromised AWS accounts. IAM separates "who" from "what they can do", and AWS\'s evaluation logic treats any explicit Deny as final — so a tightly-scoped policy is your safety net against accidental damage. Roles (preferred over users) issue short-lived credentials via STS, removing the need to rotate long-lived access keys.',
    analogy: 'Like giving a contractor only the key to the rooms they need to clean — not the master key to your whole house.',
    mistakes: [
      'Granting AdministratorAccess "just for now" — it never gets removed and becomes the new default.',
      'Sharing access keys between humans + apps. Use roles for apps; IAM users only for humans (and prefer Identity Center).',
    ],
    how: {
      console: [
        'Open IAM → Roles → Create role',
        'Trusted entity: AWS service (or another account, depending on use case)',
        'Permissions: pick the minimum AWS-managed policy that fits',
        'Tag with Owner, Project, Environment',
        'Review + Create',
      ],
      cli: `aws iam create-role --role-name MyProjectRole \\
  --assume-role-policy-document file://trust.json

aws iam attach-role-policy --role-name MyProjectRole \\
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess`,
      cfn: `MyRole:
  Type: AWS::IAM::Role
  Properties:
    RoleName: MyProjectRole
    AssumeRolePolicyDocument:
      Version: '2012-10-17'
      Statement:
        - Effect: Allow
          Principal: { Service: lambda.amazonaws.com }
          Action: sts:AssumeRole
    ManagedPolicyArns:
      - arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess`,
      tf: `resource "aws_iam_role" "my_role" {
  name = "MyProjectRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3_ro" {
  role       = aws_iam_role.my_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}`,
    },
  },

  vpc: {
    title: 'Build the VPC + subnets across multiple AZs',
    what: 'Carve out an isolated network with public + private subnets, internet gateway, and route tables.',
    why: 'A custom VPC keeps your resources off the shared default VPC + lets you control the network topology end-to-end. Multiple AZs are non-negotiable for any workload you care about — losing one AZ shouldn\'t take you offline. Subnet design (public for ALB, private for app + DB) is the foundation of every defensible AWS architecture.',
    analogy: 'Like designing the floor plan of an office building — public lobby (load balancer), private offices (app servers), secure vault (database), with two stairwells (two AZs) in case one is blocked.',
    mistakes: [
      'Using a tiny CIDR like /24 — leaves no room to grow. Default to /16 for production VPCs.',
      'Putting app servers in public subnets "for SSH access". Use private subnets + SSM Session Manager — no port 22 needed.',
    ],
    how: {
      console: [
        'VPC → Create VPC → "VPC and more" wizard',
        'Name: my-project-vpc, IPv4 CIDR: 10.0.0.0/16',
        '2 AZs, 2 public + 2 private subnets',
        'NAT Gateway: 1 per AZ (production) or "In 1 AZ" (dev)',
        'VPC Endpoint for S3 (free)',
        'Create VPC',
      ],
      cli: `# Use the VPC console wizard or CloudFormation/Terraform — CLI requires ~15 commands.
aws ec2 create-vpc --cidr-block 10.0.0.0/16`,
      cfn: `VPC:
  Type: AWS::EC2::VPC
  Properties:
    CidrBlock: 10.0.0.0/16
    EnableDnsHostnames: true
    EnableDnsSupport: true
# (Then add PublicSubnetA/B, PrivateSubnetA/B, IGW, NAT GW, route tables — ~60 lines total)`,
      tf: `module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  name = "my-project-vpc"
  cidr = "10.0.0.0/16"
  azs              = ["eu-west-1a", "eu-west-1b"]
  public_subnets   = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24"]
  enable_nat_gateway = true
  one_nat_gateway_per_az = true
}`,
    },
  },

  s3: {
    title: 'Create the S3 bucket(s) for storage',
    what: 'Create globally-unique S3 buckets with the right encryption, versioning, and public-access settings.',
    why: 'S3 is the foundation of most AWS storage. Buckets are globally unique and serve as durable (11-nines) storage for static sites, backups, data lakes, and CDN origins. Default-deny public access + enable versioning at creation — fixing these later is more painful than getting them right up front.',
    analogy: 'A bucket is like a digital warehouse — infinitely scalable, with every file having a unique address (key). The walls (Block Public Access) stay up by default.',
    mistakes: [
      'Picking a name like "my-app" — globally taken. Always include a unique suffix (account ID, date, random).',
      'Forgetting to enable versioning. Once a destructive write happens, you can\'t go back without it.',
    ],
    how: {
      console: [
        'S3 → Create bucket',
        'Name: <project>-<region>-<purpose>-<account-id>',
        'Region: pick closest to users',
        'Block all public access: ON (keep checked)',
        'Versioning: Enable',
        'Default encryption: SSE-KMS (or SSE-S3 for simplicity)',
        'Create bucket',
      ],
      cli: `aws s3api create-bucket --bucket my-project-eu-west-1-data-123456789012 \\
  --region eu-west-1 \\
  --create-bucket-configuration LocationConstraint=eu-west-1

aws s3api put-bucket-versioning --bucket my-project-eu-west-1-data-123456789012 \\
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption --bucket my-project-eu-west-1-data-123456789012 \\
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'`,
      cfn: `DataBucket:
  Type: AWS::S3::Bucket
  Properties:
    BucketName: my-project-eu-west-1-data-123456789012
    PublicAccessBlockConfiguration:
      BlockPublicAcls: true
      IgnorePublicAcls: true
      BlockPublicPolicy: true
      RestrictPublicBuckets: true
    VersioningConfiguration: { Status: Enabled }
    BucketEncryption:
      ServerSideEncryptionConfiguration:
        - ServerSideEncryptionByDefault: { SSEAlgorithm: AES256 }`,
      tf: `resource "aws_s3_bucket" "data" {
  bucket = "my-project-eu-west-1-data-123456789012"
}
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_public_access_block" "data" {
  bucket = aws_s3_bucket.data.id
  block_public_acls = true
  block_public_policy = true
  ignore_public_acls = true
  restrict_public_buckets = true
}`,
    },
  },

  cloudfront: {
    title: 'Set up CloudFront in front of the origin',
    what: 'Create a CloudFront distribution with HTTPS, edge caching, and Origin Access Control on the S3 origin.',
    why: 'CloudFront caches your content at 600+ edge locations, dramatically reducing latency for global users + offloading traffic from your origin. It also provides free HTTPS via ACM + automatic Shield Standard DDoS protection. Even for low-traffic personal sites, the first-byte improvement makes pages feel fast everywhere.',
    analogy: 'Like having a vending machine of your content in every major city — users grab the same product locally instead of flying to your warehouse.',
    mistakes: [
      'Using legacy OAI instead of modern OAC. OAC supports SSE-KMS + all regions; OAI is being deprecated.',
      'Setting cache TTL too high on HTML files — users see stale content after updates. Fingerprint asset URLs and use short TTL for HTML.',
    ],
    how: {
      console: [
        'CloudFront → Create distribution',
        'Origin: S3 bucket (from previous step)',
        'Origin access: Origin access control settings → Create new OAC',
        'Viewer protocol policy: Redirect HTTP to HTTPS',
        'Cache policy: Managed-CachingOptimized',
        'Default root object: index.html (for static sites)',
        'Create + update S3 bucket policy with the snippet CloudFront generates',
      ],
      cli: `# Create OAC + distribution config JSON (long — see AWS docs)
aws cloudfront create-distribution --distribution-config file://dist-config.json`,
      cfn: `Distribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Enabled: true
      DefaultRootObject: index.html
      Origins:
        - Id: s3-origin
          DomainName: !GetAtt DataBucket.RegionalDomainName
          S3OriginConfig: { OriginAccessIdentity: '' }
          OriginAccessControlId: !Ref OAC
      DefaultCacheBehavior:
        TargetOriginId: s3-origin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6
        Compress: true`,
      tf: `resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"
  origin {
    domain_name              = aws_s3_bucket.data.bucket_regional_domain_name
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }
  default_cache_behavior {
    target_origin_id       = "s3-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET","HEAD"]
    cached_methods         = ["GET","HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }
  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
}`,
    },
  },

  route53: {
    title: 'Point your domain at the resource via Route 53',
    what: 'Create DNS records (Alias for AWS resources, A/CNAME for external) in Route 53.',
    why: 'Custom domains are essential for branding + SEO. Route 53 Alias records point at AWS resources (ALB, CloudFront, S3 website) without hard-coding IPs — they auto-update if the underlying resource changes. Alias records work at the apex (yourdomain.com), where CNAMEs are forbidden by DNS standards.',
    analogy: 'Like the city adding your business to Google Maps — until then, only people who already know your address can find you.',
    mistakes: [
      'Using a CNAME at the apex. Use Route 53 Alias records — they handle apex + auto-update.',
      'Forgetting to update name servers at your registrar to point at Route 53. DNS won\'t resolve until you do.',
    ],
    how: {
      console: [
        'Route 53 → Hosted zones → pick your zone',
        'Create record',
        'Record type: A',
        'Alias: ON → route to the AWS resource',
        'Save',
      ],
      cli: `aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID \\
  --change-batch file://record.json`,
      cfn: `ApexRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneId: !Ref HostedZoneId
    Name: yourdomain.com
    Type: A
    AliasTarget:
      DNSName: !GetAtt Distribution.DomainName
      HostedZoneId: Z2FDTNDATAQYW2`,
      tf: `resource "aws_route53_record" "apex" {
  zone_id = var.zone_id
  name    = "yourdomain.com"
  type    = "A"
  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}`,
    },
  },

  acm: {
    title: 'Request an ACM certificate for HTTPS',
    what: 'Request a free TLS certificate from AWS Certificate Manager for your domain.',
    why: 'ACM provides free, auto-renewed TLS certs for any AWS-fronted service (CloudFront, ALB, API Gateway, AppSync). Browsers + search engines penalise non-HTTPS sites — using ACM means zero ongoing cert-renewal work. Cert MUST be in us-east-1 if used with CloudFront; in the same region as the resource otherwise.',
    analogy: 'A free lifetime gym membership — sign up once, never renew, never pay.',
    mistakes: [
      'Requesting the cert in the wrong region. CloudFront ONLY accepts certs from us-east-1.',
      'Picking email validation when DNS validation is faster + auto-revalidates on renewal.',
    ],
    how: {
      console: [
        'ACM → Request certificate (in us-east-1 for CloudFront!)',
        'Domain: yourdomain.com (+ www.yourdomain.com as SAN)',
        'Validation: DNS (recommended)',
        'Create the CNAMEs ACM gives you in Route 53 (or click "Create records in Route 53" if your zone is in R53)',
        'Wait ~5 min for status to become Issued',
      ],
      cli: `aws acm request-certificate --region us-east-1 \\
  --domain-name yourdomain.com \\
  --subject-alternative-names www.yourdomain.com \\
  --validation-method DNS`,
      cfn: `Cert:
  Type: AWS::CertificateManager::Certificate
  Properties:
    DomainName: yourdomain.com
    SubjectAlternativeNames: [ www.yourdomain.com ]
    ValidationMethod: DNS
    # For CloudFront use, this whole stack MUST be in us-east-1.`,
      tf: `provider "aws" { alias = "us_east_1"; region = "us-east-1" }

resource "aws_acm_certificate" "cert" {
  provider                  = aws.us_east_1
  domain_name               = "yourdomain.com"
  subject_alternative_names = ["www.yourdomain.com"]
  validation_method         = "DNS"
}`,
    },
  },

  ec2: {
    title: 'Launch the EC2 instance(s)',
    what: 'Provision an EC2 instance from an Amazon Linux AMI with the right size + IAM role + user-data bootstrap.',
    why: 'EC2 gives you full OS control — best when you need long-running processes, custom software, or lift-and-shift workloads. Put production instances in private subnets, attach an instance profile (NOT access keys) for AWS API access, and use SSM Session Manager for shell access (no SSH port). User-data scripts handle one-time bootstrap automatically.',
    analogy: 'Renting a full computer with admin access — you choose specs, OS, and what runs on it.',
    mistakes: [
      'Forgetting the IAM instance profile. Without one, the instance can\'t call AWS APIs + SSM Session Manager won\'t work.',
      'Putting prod instances in public subnets "for SSH". Use private subnet + SSM Session Manager — more secure.',
    ],
    how: {
      console: [
        'EC2 → Launch instances',
        'AMI: Amazon Linux 2023',
        'Type: t3.micro (free tier) for dev',
        'Network: VPC + private subnet',
        'IAM instance profile: SSMInstanceCore role',
        'User data: bootstrap shell script',
        'Disable public IP (use SSM for access)',
        'Launch',
      ],
      cli: `AMI=$(aws ssm get-parameters --names \\
  /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \\
  --query 'Parameters[0].Value' --output text)

aws ec2 run-instances \\
  --image-id $AMI \\
  --instance-type t3.micro \\
  --subnet-id subnet-private-1a \\
  --security-group-ids sg-app \\
  --iam-instance-profile Name=SSMInstanceProfile \\
  --no-associate-public-ip-address \\
  --user-data file://bootstrap.sh`,
      cfn: `AppInstance:
  Type: AWS::EC2::Instance
  Properties:
    InstanceType: t3.micro
    ImageId: '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}}'
    SubnetId: !Ref PrivateSubnetA
    SecurityGroupIds: [ !Ref AppSecurityGroup ]
    IamInstanceProfile: !Ref SSMInstanceProfile
    UserData:
      Fn::Base64: |
        #!/bin/bash
        dnf install -y nginx
        systemctl enable --now nginx`,
      tf: `resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = module.vpc.private_subnets[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm.name
  user_data              = file("\${path.module}/bootstrap.sh")
}`,
    },
  },

  alb: {
    title: 'Provision an Application Load Balancer',
    what: 'Create an ALB in public subnets with HTTPS listener (ACM cert), target group, and EC2/IP/Lambda targets.',
    why: 'ALB terminates HTTPS, routes by path/host, and load-balances across multiple targets in multiple AZs. It\'s the standard layer-7 entry point for any web app. Living in public subnets across 2+ AZs makes it highly available even if one AZ fails.',
    analogy: 'A smart receptionist — reads the room name on each visitor\'s badge (URL path) and routes them to the right desk.',
    mistakes: [
      'Putting the ALB in private subnets. ALBs serving internet traffic MUST be in public subnets.',
      'Defaulting to HTTP-only "for testing". Always use ACM + HTTPS from day one.',
    ],
    how: {
      console: [
        'EC2 → Load Balancers → Create → Application Load Balancer',
        'Scheme: Internet-facing',
        'Mappings: both public subnets',
        'Security group: ALB SG (HTTPS from 0.0.0.0/0)',
        'Listener: HTTPS:443 + create target group',
        'Target group → register EC2 instances or IPs',
        'Select ACM cert',
        'Create',
      ],
      cli: `aws elbv2 create-load-balancer \\
  --name app-alb --scheme internet-facing --type application \\
  --subnets subnet-pub-a subnet-pub-b \\
  --security-groups sg-alb

aws elbv2 create-target-group \\
  --name app-tg --protocol HTTP --port 80 \\
  --vpc-id vpc-xxx --target-type instance

aws elbv2 create-listener \\
  --load-balancer-arn ALB_ARN \\
  --protocol HTTPS --port 443 \\
  --certificates CertificateArn=ACM_ARN \\
  --default-actions Type=forward,TargetGroupArn=TG_ARN`,
      cfn: `Alb:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Scheme: internet-facing
    Subnets: [ !Ref PublicSubnetA, !Ref PublicSubnetB ]
    SecurityGroups: [ !Ref AlbSecurityGroup ]

HttpsListener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref Alb
    Port: 443
    Protocol: HTTPS
    Certificates: [ { CertificateArn: !Ref Cert } ]
    DefaultActions:
      - Type: forward
        TargetGroupArn: !Ref TargetGroup`,
      tf: `resource "aws_lb" "app" {
  name               = "app-alb"
  load_balancer_type = "application"
  internal           = false
  subnets            = module.vpc.public_subnets
  security_groups    = [aws_security_group.alb.id]
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.cert.arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}`,
    },
  },

  asg: {
    title: 'Wrap the EC2 in an Auto Scaling Group',
    what: 'Create an ASG with a Launch Template, multi-AZ subnets, and target tracking on CPU.',
    why: 'ASGs replace failed instances automatically + adjust capacity to load. Combined with multi-AZ subnets, this is the foundation of any always-on EC2 service. Modern best practice uses Launch Templates (versioned) and a Mixed Instances Policy for Spot + On-Demand savings.',
    analogy: 'A self-replenishing fleet — if a truck breaks down, a new one is dispatched automatically.',
    mistakes: [
      'Using deprecated Launch Configurations instead of Launch Templates.',
      'Single-AZ ASGs lose HA — always span 2+ AZs.',
    ],
    how: {
      console: [
        'EC2 → Auto Scaling Groups → Create',
        'Launch template: pick or create one',
        'Network: VPC + 2+ private subnets',
        'Attach to ALB target group',
        'Capacity: min 1, desired 2, max 4',
        'Scaling: Target tracking on CPU 60%',
        'Create',
      ],
      cli: `aws autoscaling create-auto-scaling-group \\
  --auto-scaling-group-name app-asg \\
  --launch-template LaunchTemplateName=app-lt,Version=\\$Latest \\
  --min-size 1 --max-size 4 --desired-capacity 2 \\
  --vpc-zone-identifier "subnet-priv-a,subnet-priv-b" \\
  --target-group-arns TG_ARN`,
      cfn: `Asg:
  Type: AWS::AutoScaling::AutoScalingGroup
  Properties:
    MinSize: 1
    MaxSize: 4
    DesiredCapacity: 2
    LaunchTemplate:
      LaunchTemplateId: !Ref LaunchTemplate
      Version: !GetAtt LaunchTemplate.LatestVersionNumber
    VPCZoneIdentifier: [ !Ref PrivateSubnetA, !Ref PrivateSubnetB ]
    TargetGroupARNs: [ !Ref TargetGroup ]`,
      tf: `resource "aws_autoscaling_group" "app" {
  name                = "app-asg"
  min_size            = 1
  desired_capacity    = 2
  max_size            = 4
  vpc_zone_identifier = module.vpc.private_subnets
  target_group_arns   = [aws_lb_target_group.app.arn]
  launch_template { id = aws_launch_template.app.id, version = "$Latest" }
}`,
    },
  },

  lambda: {
    title: 'Deploy the Lambda function',
    what: 'Package + deploy your function code, configure memory + timeout, attach the execution role.',
    why: 'Lambda runs code on events without managing servers — pay per ms used. Perfect for APIs, glue code, event processing, and scheduled jobs under 15 minutes. The execution role provides AWS API access; environment variables hold non-secret config (use Secrets Manager for real secrets).',
    analogy: 'A function that materialises when called and vanishes when done — no server sitting idle.',
    mistakes: [
      'Putting Lambda in a VPC unnecessarily. Only do it when you need to reach private resources (RDS, internal endpoints).',
      'Forgetting to set timeout + memory. Defaults (3s, 128MB) are too low for most real work.',
    ],
    how: {
      console: [
        'Lambda → Create function → Author from scratch',
        'Runtime: Node.js / Python (latest)',
        'Architecture: arm64 (cheaper) or x86_64',
        'Execution role: create new with basic Lambda perms',
        'Code: upload zip OR container image',
        'Configuration → adjust memory + timeout',
        'Set environment variables (no secrets!)',
        'Add trigger (S3, API GW, EventBridge, etc.)',
      ],
      cli: `# Package + upload
zip -r function.zip handler.js node_modules/

aws lambda create-function \\
  --function-name my-function \\
  --runtime nodejs20.x \\
  --role arn:aws:iam::ACCT:role/lambda-exec \\
  --handler handler.main \\
  --zip-file fileb://function.zip \\
  --timeout 30 --memory-size 256`,
      cfn: `MyFunction:
  Type: AWS::Lambda::Function
  Properties:
    FunctionName: my-function
    Runtime: nodejs20.x
    Handler: handler.main
    Role: !GetAtt LambdaRole.Arn
    Code: { ZipFile: |
      exports.main = async (event) => ({ statusCode: 200, body: 'hello' });
    }
    Timeout: 30
    MemorySize: 256`,
      tf: `data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "./src"
  output_path = "./function.zip"
}

resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  runtime       = "nodejs20.x"
  handler       = "handler.main"
  role          = aws_iam_role.lambda_exec.arn
  filename      = data.archive_file.lambda.output_path
  timeout       = 30
  memory_size   = 256
}`,
    },
  },

  apigateway: {
    title: 'Create the API Gateway endpoint',
    what: 'Provision an API Gateway (HTTP API for simplicity, REST API for advanced features) and wire it to Lambda.',
    why: 'API Gateway is the managed front door for your APIs — handles auth, throttling, request/response transforms, and routing without you running servers. HTTP API is cheaper + simpler (per million calls); REST API has caching + advanced features. Cognito User Pool authorizer adds end-user auth with zero code.',
    analogy: 'A bouncer + receptionist for your serverless app — checks IDs (auth), counts heads (throttling), shows people to the right room (routing).',
    mistakes: [
      'Defaulting to REST API when HTTP API would do — REST API is 3× more expensive at scale.',
      'Forgetting CORS configuration. The browser will silently block requests from your frontend.',
    ],
    how: {
      console: [
        'API Gateway → Create API → HTTP API (recommended) or REST',
        'Add integration: Lambda',
        'Routes: GET /items → Lambda',
        'Authorizer: Cognito User Pool or JWT',
        'Stages: $default with auto-deploy',
        'Add CORS if calling from a browser',
        'Deploy',
      ],
      cli: `aws apigatewayv2 create-api \\
  --name my-api --protocol-type HTTP \\
  --target arn:aws:lambda:REGION:ACCT:function:my-function`,
      cfn: `HttpApi:
  Type: AWS::ApiGatewayV2::Api
  Properties:
    Name: my-api
    ProtocolType: HTTP
    Target: !GetAtt MyFunction.Arn

LambdaPermission:
  Type: AWS::Lambda::Permission
  Properties:
    FunctionName: !Ref MyFunction
    Action: lambda:InvokeFunction
    Principal: apigateway.amazonaws.com
    SourceArn: !Sub "arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${HttpApi}/*"`,
      tf: `resource "aws_apigatewayv2_api" "http" {
  name          = "my-api"
  protocol_type = "HTTP"
  target        = aws_lambda_function.my_function.arn
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_function.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "\${aws_apigatewayv2_api.http.execution_arn}/*"
}`,
    },
  },

  dynamodb: {
    title: 'Create the DynamoDB table',
    what: 'Define the table with the right partition key (+ optional sort key), capacity mode, and TTL.',
    why: 'DynamoDB scales infinitely with single-digit-millisecond reads — the most cost-effective database for unpredictable workloads. Key design is everything: pick a partition key that distributes load evenly. On-Demand capacity mode bills per request (best for unknown traffic); Provisioned is cheaper for steady workloads.',
    analogy: 'A planet-scale Excel spreadsheet — flat key-value lookups, but at any scale.',
    mistakes: [
      'Picking a single hot partition key (e.g. one customer = 90% of traffic). Sharded writes are the fix.',
      'Using Scan instead of Query. Scan reads the WHOLE table — never the right answer at scale.',
    ],
    how: {
      console: [
        'DynamoDB → Create table',
        'Name + partition key (+ optional sort key)',
        'Capacity mode: On-Demand (recommended for new apps)',
        'Enable PITR if data matters',
        'Enable TTL if items expire (e.g. sessions)',
        'Create',
      ],
      cli: `aws dynamodb create-table \\
  --table-name my-table \\
  --attribute-definitions AttributeName=pk,AttributeType=S \\
  --key-schema AttributeName=pk,KeyType=HASH \\
  --billing-mode PAY_PER_REQUEST`,
      cfn: `MyTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: my-table
    AttributeDefinitions:
      - AttributeName: pk
        AttributeType: S
    KeySchema:
      - AttributeName: pk
        KeyType: HASH
    BillingMode: PAY_PER_REQUEST
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: true`,
      tf: `resource "aws_dynamodb_table" "my_table" {
  name           = "my-table"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  attribute { name = "pk", type = "S" }
  point_in_time_recovery { enabled = true }
}`,
    },
  },

  rds: {
    title: 'Provision the RDS database',
    what: 'Launch an RDS instance (Postgres / MySQL / etc.) in private subnets with Multi-AZ + backups.',
    why: 'RDS gives you a managed relational DB — AWS handles patching, backups, failover, and replication. Always put RDS in private subnets, enable Multi-AZ for production HA, and use Secrets Manager for credentials with auto-rotation. Pick Aurora over vanilla RDS if you need higher performance + more replicas.',
    analogy: 'Hiring a DBA who works 24/7, never sleeps, and never asks for a raise.',
    mistakes: [
      'Putting RDS in public subnets. Production DBs should NEVER be internet-reachable.',
      'Forgetting Multi-AZ for production. Single-AZ = single point of failure.',
    ],
    how: {
      console: [
        'RDS → Create database',
        'Engine: PostgreSQL / MySQL',
        'Template: Production (with Multi-AZ)',
        'Credentials: Manage in Secrets Manager',
        'VPC: your VPC, private subnets only',
        'Publicly accessible: NO',
        'Storage: gp3 with autoscaling',
        'Encryption: enabled',
        'Backup retention: 7 days',
        'Create',
      ],
      cli: `aws rds create-db-instance \\
  --db-instance-identifier my-db \\
  --db-instance-class db.t3.micro \\
  --engine postgres \\
  --master-username admin \\
  --manage-master-user-password \\
  --allocated-storage 20 \\
  --vpc-security-group-ids sg-db \\
  --db-subnet-group-name private-db-subnet-group \\
  --no-publicly-accessible \\
  --multi-az \\
  --storage-encrypted`,
      cfn: `MyDb:
  Type: AWS::RDS::DBInstance
  Properties:
    DBInstanceIdentifier: my-db
    Engine: postgres
    DBInstanceClass: db.t3.micro
    MasterUsername: admin
    ManageMasterUserPassword: true
    AllocatedStorage: 20
    VPCSecurityGroups: [ !Ref DbSecurityGroup ]
    DBSubnetGroupName: !Ref DbSubnetGroup
    PubliclyAccessible: false
    MultiAZ: true
    StorageEncrypted: true
    BackupRetentionPeriod: 7`,
      tf: `resource "aws_db_instance" "my_db" {
  identifier              = "my-db"
  engine                  = "postgres"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  manage_master_user_password = true
  username                = "admin"
  vpc_security_group_ids  = [aws_security_group.db.id]
  db_subnet_group_name    = aws_db_subnet_group.private.name
  publicly_accessible     = false
  multi_az                = true
  storage_encrypted       = true
  backup_retention_period = 7
  skip_final_snapshot     = false
  final_snapshot_identifier = "my-db-final"
}`,
    },
  },

  aurora: {
    title: 'Set up Aurora cluster',
    what: 'Create an Aurora Serverless v2 cluster with the cluster + reader endpoints.',
    why: 'Aurora is AWS\'s MySQL/Postgres-compatible engine with distributed storage (6 copies across 3 AZs, self-healing) and superior performance. Serverless v2 scales in 0.5 ACU increments — perfect for variable workloads. Up to 15 read replicas vs 5 for vanilla RDS.',
    analogy: 'RDS rebuilt for the cloud — faster, more durable, more resilient at the same price.',
    mistakes: [
      'Picking Serverless v1 over v2. v1 is older + lacks Multi-AZ + Global DB support.',
      'Not using the Reader Endpoint for reads — wastes the scaling capacity.',
    ],
    how: {
      console: [
        'RDS → Create database → Aurora',
        'Engine: PostgreSQL or MySQL',
        'Capacity: Serverless v2',
        'Min/Max ACUs: 0.5 / 1 (dev) or higher (prod)',
        'Multi-AZ: enabled for prod',
        'VPC: private subnets',
        'Encryption + backups: enabled',
        'Create',
      ],
      cli: `aws rds create-db-cluster --db-cluster-identifier my-aurora \\
  --engine aurora-postgresql \\
  --master-username admin --manage-master-user-password \\
  --serverless-v2-scaling-configuration MinCapacity=0.5,MaxCapacity=1`,
      cfn: `AuroraCluster:
  Type: AWS::RDS::DBCluster
  Properties:
    Engine: aurora-postgresql
    ServerlessV2ScalingConfiguration:
      MinCapacity: 0.5
      MaxCapacity: 1
    MasterUsername: admin
    ManageMasterUserPassword: true
    StorageEncrypted: true`,
      tf: `resource "aws_rds_cluster" "aurora" {
  cluster_identifier = "my-aurora"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned"
  serverlessv2_scaling_configuration {
    min_capacity = 0.5
    max_capacity = 1
  }
  master_username = "admin"
  manage_master_user_password = true
  storage_encrypted = true
}`,
    },
  },

  elasticache: {
    title: 'Provision an ElastiCache cluster',
    what: 'Create a Redis cluster in private subnets with Multi-AZ + encryption at rest + in transit.',
    why: 'ElastiCache Redis gives sub-millisecond cached reads — perfect for session stores, leaderboards, rate limiting, or hot DB caches. Enable encryption + Multi-AZ at creation (can\'t add later). Cluster mode shards data horizontally for write scaling.',
    analogy: 'Your app\'s short-term memory — millisecond access, but lives in RAM.',
    mistakes: [
      'Forgetting to enable encryption at cluster creation. It can\'t be added retroactively.',
      'Picking Memcached when you want persistence — Memcached has no persistence on node failure.',
    ],
    how: {
      console: [
        'ElastiCache → Redis OSS → Create',
        'Cluster mode: as needed',
        'Node type: cache.t3.micro (free tier)',
        'Multi-AZ + auto-failover: enabled',
        'Encryption at rest + in transit: ENABLE NOW',
        'Subnet group: private subnets',
        'Create',
      ],
      cli: `aws elasticache create-replication-group \\
  --replication-group-id my-redis \\
  --engine redis --cache-node-type cache.t3.micro \\
  --num-cache-clusters 2 \\
  --automatic-failover-enabled \\
  --at-rest-encryption-enabled \\
  --transit-encryption-enabled`,
      cfn: `RedisCluster:
  Type: AWS::ElastiCache::ReplicationGroup
  Properties:
    ReplicationGroupId: my-redis
    Engine: redis
    CacheNodeType: cache.t3.micro
    NumCacheClusters: 2
    AutomaticFailoverEnabled: true
    AtRestEncryptionEnabled: true
    TransitEncryptionEnabled: true`,
      tf: `resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = "my-redis"
  engine                     = "redis"
  node_type                  = "cache.t3.micro"
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}`,
    },
  },

  ecs: {
    title: 'Run containers on ECS',
    what: 'Create an ECS cluster + task definition + service (on Fargate for serverless containers).',
    why: 'ECS is AWS\'s container orchestrator — simpler than EKS for AWS-native workloads + no $0.10/hr control-plane fee. Fargate launch type means no EC2 to manage; pay per task vCPU + memory hour. Use Task Execution Role for the agent (pull image, log) and Task Role for app-level AWS API access.',
    analogy: 'docker-compose at AWS scale — describe what to run, ECS runs it.',
    mistakes: [
      'Conflating Task Execution Role with Task Role. Execution = ECS agent perms; Task = your app\'s perms.',
      'Picking EKS when ECS would do — EKS adds $73/mo control plane charge + complexity.',
    ],
    how: {
      console: [
        'ECS → Clusters → Create (Fargate)',
        'Task Definitions → Create',
        '  Launch type: Fargate',
        '  Container: image from ECR + port mapping',
        '  Task Execution Role: AmazonECSTaskExecutionRolePolicy',
        '  Task Role: your app\'s AWS permissions',
        'Services → Create',
        '  Cluster + Task def + desired count',
        '  Network: VPC + private subnets + assign public IP if needed',
        '  Load balancer: attach to ALB target group',
        'Create',
      ],
      cli: `aws ecs create-cluster --cluster-name my-cluster
aws ecs register-task-definition --cli-input-json file://task-def.json
aws ecs create-service \\
  --cluster my-cluster --service-name my-service \\
  --task-definition my-task --desired-count 2 \\
  --launch-type FARGATE \\
  --network-configuration "awsvpcConfiguration={subnets=[subnet-priv-a,subnet-priv-b],securityGroups=[sg-app]}"`,
      cfn: `EcsCluster:
  Type: AWS::ECS::Cluster
  Properties: { ClusterName: my-cluster }

TaskDef:
  Type: AWS::ECS::TaskDefinition
  Properties:
    Family: my-task
    NetworkMode: awsvpc
    RequiresCompatibilities: [ FARGATE ]
    Cpu: '256'
    Memory: '512'
    ExecutionRoleArn: !GetAtt TaskExecRole.Arn
    TaskRoleArn: !GetAtt TaskRole.Arn
    ContainerDefinitions:
      - Name: app
        Image: !Sub "\${AWS::AccountId}.dkr.ecr.\${AWS::Region}.amazonaws.com/my-app:latest"
        PortMappings: [ { ContainerPort: 80 } ]

Service:
  Type: AWS::ECS::Service
  Properties:
    Cluster: !Ref EcsCluster
    LaunchType: FARGATE
    DesiredCount: 2
    TaskDefinition: !Ref TaskDef
    NetworkConfiguration:
      AwsvpcConfiguration:
        Subnets: [ !Ref PrivateSubnetA, !Ref PrivateSubnetB ]
        SecurityGroups: [ !Ref AppSecurityGroup ]`,
      tf: `resource "aws_ecs_cluster" "main" { name = "my-cluster" }

resource "aws_ecs_task_definition" "app" {
  family                   = "my-task"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.task_exec.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([{
    name = "app"
    image = "\${aws_ecr_repository.app.repository_url}:latest"
    portMappings = [{ containerPort = 80 }]
  }])
}

resource "aws_ecs_service" "app" {
  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = module.vpc.private_subnets
    security_groups = [aws_security_group.app.id]
  }
}`,
    },
  },

  sqs: {
    title: 'Create SQS queue(s) for decoupling',
    what: 'Create an SQS queue + Dead-Letter Queue + tune visibility timeout to processing time.',
    why: 'SQS absorbs traffic spikes, decouples producers from consumers, and retries failed processing automatically. Always pair a main queue with a DLQ for poison messages. Long polling (ReceiveMessageWaitTimeSeconds=20) dramatically reduces empty-receive cost.',
    analogy: 'A waiting room between two services — producer drops off, consumer picks up later.',
    mistakes: [
      'Skipping the DLQ. Failed messages disappear silently after maxReceiveCount.',
      'Visibility timeout too short — duplicate processing. Too long — slow retry on real failures.',
    ],
    how: {
      console: [
        'SQS → Create queue → Standard (or FIFO if order matters)',
        'Visibility timeout: ≥ max processing time',
        'Long polling: 20 seconds',
        'Encryption: enable SSE-SQS',
        'Create the DLQ first, then reference it from the main queue (maxReceiveCount: 5)',
      ],
      cli: `aws sqs create-queue --queue-name my-dlq

aws sqs create-queue --queue-name my-queue --attributes '{
  "VisibilityTimeout": "60",
  "ReceiveMessageWaitTimeSeconds": "20",
  "RedrivePolicy": "{\\"deadLetterTargetArn\\":\\"arn:aws:sqs:REGION:ACCT:my-dlq\\",\\"maxReceiveCount\\":\\"5\\"}"
}'`,
      cfn: `MyDlq:
  Type: AWS::SQS::Queue
  Properties: { QueueName: my-dlq }

MyQueue:
  Type: AWS::SQS::Queue
  Properties:
    QueueName: my-queue
    VisibilityTimeout: 60
    ReceiveMessageWaitTimeSeconds: 20
    RedrivePolicy:
      deadLetterTargetArn: !GetAtt MyDlq.Arn
      maxReceiveCount: 5`,
      tf: `resource "aws_sqs_queue" "dlq" { name = "my-dlq" }

resource "aws_sqs_queue" "main" {
  name                       = "my-queue"
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 20
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}`,
    },
  },

  sns: {
    title: 'Set up SNS topic + subscriptions',
    what: 'Create an SNS topic + add subscribers (SQS, Lambda, email, etc.) for fan-out messaging.',
    why: 'SNS fans out one publish to many subscribers — perfect for "broadcast this event everywhere it needs to go". Pair with multiple SQS queues for resilient fan-out (each consumer\'s own queue). Filter Policies let subscribers receive only the messages they care about.',
    analogy: 'A loudspeaker — one announcement reaches every subscriber simultaneously.',
    mistakes: [
      'Using SNS Standard when order matters. Use SNS FIFO + SQS FIFO subscribers for ordered fan-out.',
      'Going live with SMS subscribers without setting an SMS spending limit. Bills can spiral fast.',
    ],
    how: {
      console: [
        'SNS → Topics → Create',
        'Type: Standard (or FIFO)',
        'Encryption: SSE-SNS with customer-managed KMS for audit',
        'Subscriptions → Create',
        '  Protocol: SQS / Lambda / Email / HTTPS',
        '  Endpoint: target ARN or URL',
        '  Filter policy (optional, JSON)',
      ],
      cli: `aws sns create-topic --name my-topic

aws sns subscribe \\
  --topic-arn arn:aws:sns:REGION:ACCT:my-topic \\
  --protocol sqs \\
  --notification-endpoint arn:aws:sqs:REGION:ACCT:my-queue`,
      cfn: `MyTopic:
  Type: AWS::SNS::Topic
  Properties: { TopicName: my-topic }

MySubscription:
  Type: AWS::SNS::Subscription
  Properties:
    TopicArn: !Ref MyTopic
    Protocol: sqs
    Endpoint: !GetAtt MyQueue.Arn`,
      tf: `resource "aws_sns_topic" "main" { name = "my-topic" }

resource "aws_sns_topic_subscription" "to_sqs" {
  topic_arn = aws_sns_topic.main.arn
  protocol  = "sqs"
  endpoint  = aws_sqs_queue.main.arn
}`,
    },
  },

  eventbridge: {
    title: 'Wire EventBridge rules + targets',
    what: 'Create a custom event bus (or use default) + rules with filter patterns + multiple targets.',
    why: 'EventBridge is the modern event router — replaces CloudWatch Events. Custom buses host your app events; rules with rich filter patterns route to targets (Lambda, SQS, Step Functions, API Destinations). EventBridge Pipes connects sources to targets with no glue code.',
    analogy: 'A smart postal sorting office — events come in, get filtered, get delivered to the right place.',
    mistakes: [
      'Using the default bus for app events. The default bus is for AWS service events — use a custom bus for yours.',
      'Forgetting to grant the target service permission to be invoked. Lambda needs an EventBridge permission statement.',
    ],
    how: {
      console: [
        'EventBridge → Event buses → Create custom bus',
        'Rules → Create rule on that bus',
        'Event pattern (JSON) — match by source/detail-type/etc.',
        'Targets: Lambda / Step Functions / SQS / SNS / etc.',
        'Optional input transformer to shape the payload',
        'Save',
      ],
      cli: `aws events create-event-bus --name my-app-bus

aws events put-rule --name order-placed-rule \\
  --event-bus-name my-app-bus \\
  --event-pattern '{"source":["my-app"],"detail-type":["order.placed"]}'

aws events put-targets --rule order-placed-rule \\
  --event-bus-name my-app-bus \\
  --targets "Id"="1","Arn"="arn:aws:lambda:REGION:ACCT:function:handle-order"`,
      cfn: `MyEventBus:
  Type: AWS::Events::EventBus
  Properties: { Name: my-app-bus }

OrderPlacedRule:
  Type: AWS::Events::Rule
  Properties:
    EventBusName: !Ref MyEventBus
    EventPattern:
      source: [ my-app ]
      detail-type: [ order.placed ]
    Targets:
      - Arn: !GetAtt HandleOrderFn.Arn
        Id: handle-order`,
      tf: `resource "aws_cloudwatch_event_bus" "main" { name = "my-app-bus" }

resource "aws_cloudwatch_event_rule" "order_placed" {
  name           = "order-placed-rule"
  event_bus_name = aws_cloudwatch_event_bus.main.name
  event_pattern  = jsonencode({
    source        = ["my-app"]
    "detail-type" = ["order.placed"]
  })
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule           = aws_cloudwatch_event_rule.order_placed.name
  event_bus_name = aws_cloudwatch_event_bus.main.name
  arn            = aws_lambda_function.handle_order.arn
}`,
    },
  },

  step: {
    title: 'Build the Step Functions workflow',
    what: 'Design a state machine in ASL JSON that orchestrates Lambdas + service integrations with retry + Catch.',
    why: 'Step Functions orchestrates multi-step workflows — branching (Choice), parallel (Map), retries (Retry), error handling (Catch), human approval (.waitForTaskToken). Standard workflows are exactly-once + 1 year max; Express are at-least-once + 5 minutes (cheaper for high-volume).',
    analogy: 'A flowchart that AWS actually executes — boxes are Lambdas, arrows are transitions.',
    mistakes: [
      'Building "chains of Lambdas calling Lambdas" instead of using Step Functions. You lose observability + retry semantics.',
      'Using Standard workflows for high-volume processing — state transitions are billed individually.',
    ],
    how: {
      console: [
        'Step Functions → Create state machine',
        'Type: Standard or Express',
        'Definition: write ASL JSON (or use Workflow Studio drag-drop)',
        'IAM role: auto-create one with Lambda invoke perms',
        'Create',
      ],
      cli: `aws stepfunctions create-state-machine \\
  --name my-workflow \\
  --definition file://workflow.asl.json \\
  --role-arn arn:aws:iam::ACCT:role/StepFunctionsRole \\
  --type STANDARD`,
      cfn: `MyStateMachine:
  Type: AWS::StepFunctions::StateMachine
  Properties:
    StateMachineName: my-workflow
    StateMachineType: STANDARD
    RoleArn: !GetAtt SfnRole.Arn
    DefinitionString: |
      {
        "StartAt": "Validate",
        "States": {
          "Validate": { "Type": "Task", "Resource": "...validate...", "Next": "Process" },
          "Process":  { "Type": "Task", "Resource": "...process...",  "End": true }
        }
      }`,
      tf: `resource "aws_sfn_state_machine" "my_workflow" {
  name     = "my-workflow"
  role_arn = aws_iam_role.sfn.arn
  type     = "STANDARD"
  definition = file("\${path.module}/workflow.asl.json")
}`,
    },
  },

  cognito: {
    title: 'Set up Cognito User Pool for sign-up/sign-in',
    what: 'Create a Cognito User Pool with sign-up/sign-in, MFA, password policy, and federated IdPs.',
    why: 'Cognito is the managed auth service for app users. User Pools handle sign-up, sign-in, password resets, MFA, and federation (Google/Facebook/Apple/SAML). API Gateway + ALB have native Cognito authorizers — no auth code in your app.',
    analogy: 'Auth0 / Firebase Auth, but built into AWS.',
    mistakes: [
      'Using Cognito User Pool for AWS workforce SSO. Use IAM Identity Center for that.',
      'Forgetting MFA configuration. Enable at least optional MFA on production user pools.',
    ],
    how: {
      console: [
        'Cognito → User pools → Create',
        'Sign-in: email or username',
        'Password policy: 12+ chars, mixed case, numbers',
        'MFA: optional (SMS or TOTP)',
        'App client: create one for your frontend',
        'Domain: pick a Cognito-hosted domain or use your own',
        'Optional: Federation with Google/Facebook',
        'Create',
      ],
      cli: `aws cognito-idp create-user-pool --pool-name my-users \\
  --policies '{"PasswordPolicy":{"MinimumLength":12,"RequireUppercase":true,"RequireLowercase":true,"RequireNumbers":true}}' \\
  --mfa-configuration OPTIONAL`,
      cfn: `UserPool:
  Type: AWS::Cognito::UserPool
  Properties:
    UserPoolName: my-users
    Policies:
      PasswordPolicy:
        MinimumLength: 12
        RequireUppercase: true
        RequireLowercase: true
        RequireNumbers: true
    MfaConfiguration: OPTIONAL`,
      tf: `resource "aws_cognito_user_pool" "main" {
  name = "my-users"
  password_policy {
    minimum_length    = 12
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
  }
  mfa_configuration = "OPTIONAL"
}`,
    },
  },

  kms: {
    title: 'Create a customer-managed KMS key',
    what: 'Provision a CMK with automatic annual rotation + key policy granting your services Encrypt/Decrypt.',
    why: 'KMS centralises encryption keys with audit trail. Use customer-managed keys (CMKs) for fine-grained control + annual rotation. Aliases let your code reference a stable name across environments. S3 Bucket Keys cut SSE-KMS API call costs by 99%.',
    analogy: 'A safe deposit box for encryption keys — AWS holds the safe, you control who can open it.',
    mistakes: [
      'Hard-coding key ARNs in code instead of using aliases. Aliases let environments differ without code changes.',
      'Skipping automatic rotation. Enable annual rotation on customer-managed keys — old material is kept to decrypt old data.',
    ],
    how: {
      console: [
        'KMS → Customer managed keys → Create key',
        'Type: Symmetric',
        'Usage: Encrypt and decrypt',
        'Key administrators + Key users (IAM principals)',
        'Tags + alias',
        'Enable automatic rotation',
        'Create',
      ],
      cli: `aws kms create-key --description "My project key" \\
  --tags TagKey=Project,TagValue=MyProject

aws kms create-alias --alias-name alias/my-project --target-key-id KEY_ID

aws kms enable-key-rotation --key-id KEY_ID`,
      cfn: `MyKey:
  Type: AWS::KMS::Key
  Properties:
    Description: My project key
    EnableKeyRotation: true
    KeyPolicy:
      Version: '2012-10-17'
      Statement:
        - Sid: AllowRoot
          Effect: Allow
          Principal: { AWS: !Sub "arn:aws:iam::\${AWS::AccountId}:root" }
          Action: kms:*
          Resource: '*'

MyKeyAlias:
  Type: AWS::KMS::Alias
  Properties:
    AliasName: alias/my-project
    TargetKeyId: !Ref MyKey`,
      tf: `resource "aws_kms_key" "my_key" {
  description             = "My project key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
}

resource "aws_kms_alias" "my_key" {
  name          = "alias/my-project"
  target_key_id = aws_kms_key.my_key.key_id
}`,
    },
  },

  secretsmgr: {
    title: 'Store secrets in Secrets Manager (with rotation)',
    what: 'Create a secret + (for RDS/DocDB/Redshift) enable built-in rotation via Lambda.',
    why: 'Secrets Manager stores credentials encrypted with KMS + rotates them automatically. Built-in rotation Lambdas for RDS/DocumentDB/Redshift atomically update both the secret + the database. For non-rotating config, use Parameter Store (free Standard tier).',
    analogy: 'A password manager for your AWS infrastructure — with auto-rotation built in.',
    mistakes: [
      'Storing every config value in Secrets Manager ($0.40/secret/month adds up). Use Parameter Store for non-secrets.',
      'Hard-coding secret values in CloudFormation templates. Use dynamic references: {{resolve:secretsmanager:my-secret:SecretString:password}}.',
    ],
    how: {
      console: [
        'Secrets Manager → Store a new secret',
        'Secret type: RDS / API key / custom',
        'Key/value pairs',
        'KMS key for encryption',
        'Auto-rotation: enable for RDS-class secrets (30-day schedule)',
        'Save',
      ],
      cli: `aws secretsmanager create-secret \\
  --name my-app/db-password \\
  --secret-string '{"username":"admin","password":"REPLACE"}'`,
      cfn: `MySecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: my-app/db-password
    GenerateSecretString:
      SecretStringTemplate: '{"username":"admin"}'
      GenerateStringKey: password
      PasswordLength: 32
      ExcludeCharacters: '"@/\\'`,
      tf: `resource "aws_secretsmanager_secret" "db_password" {
  name = "my-app/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id = aws_secretsmanager_secret.db_password.id
  secret_string = jsonencode({
    username = "admin"
    password = "REPLACE-ME"
  })
}`,
    },
  },

  waf: {
    title: 'Attach WAF Web ACL with managed rules',
    what: 'Create a WAF Web ACL with AWS-managed rule groups + rate-based rules, attach to CloudFront or ALB.',
    why: 'WAF blocks application-layer attacks (OWASP Top 10, bots, scraping) at the edge — before they reach your app. Managed rule groups cover most threats without writing custom rules. Rate-based rules auto-throttle abusive IPs. Test new rules in COUNT mode before BLOCK.',
    analogy: 'A security guard reading every HTTP request — blocks the bad ones before they reach your app.',
    mistakes: [
      'Trying to attach WAF to an NLB. NLB is L4 — put CloudFront in front for WAF + UDP.',
      'Going straight to BLOCK without COUNT-testing. Real users get false-positive-blocked from day one.',
    ],
    how: {
      console: [
        'WAF → Web ACLs → Create web ACL',
        'Region: Global (CloudFront) or your region (ALB/API GW)',
        'Add AWS managed rule groups: Core, KnownBadInputs, SQL DB',
        'Add rate-based rule: 1000 req/5 min per IP',
        'Default action: Allow',
        'Associate with CloudFront distribution / ALB / API Gateway',
        'Create',
      ],
      cli: `aws wafv2 create-web-acl \\
  --name my-web-acl \\
  --scope CLOUDFRONT \\
  --default-action Allow={} \\
  --visibility-config '{"SampledRequestsEnabled":true,"CloudWatchMetricsEnabled":true,"MetricName":"my-web-acl"}'`,
      cfn: `WebAcl:
  Type: AWS::WAFv2::WebACL
  Properties:
    Name: my-web-acl
    Scope: CLOUDFRONT
    DefaultAction: { Allow: {} }
    Rules:
      - Name: CommonRuleSet
        Priority: 0
        OverrideAction: { None: {} }
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesCommonRuleSet
        VisibilityConfig:
          SampledRequestsEnabled: true
          CloudWatchMetricsEnabled: true
          MetricName: CommonRuleSet
    VisibilityConfig:
      SampledRequestsEnabled: true
      CloudWatchMetricsEnabled: true
      MetricName: my-web-acl`,
      tf: `resource "aws_wafv2_web_acl" "main" {
  name  = "my-web-acl"
  scope = "CLOUDFRONT"
  default_action { allow {} }

  rule {
    name     = "CommonRuleSet"
    priority = 0
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSet"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "my-web-acl"
    sampled_requests_enabled   = true
  }
}`,
    },
  },

  cloudwatch: {
    title: 'Set up CloudWatch alarms + log retention',
    what: 'Create CloudWatch alarms on key metrics + set log group retention (default is FOREVER).',
    why: 'CloudWatch is your eyes + ears in production. Alarms on error rates, latency p99, and 5xx counts catch problems before users complain. Setting log retention prevents accumulated logs from quietly costing $50+/month after months of writes.',
    analogy: 'Smoke detectors for your AWS account — they catch problems before they spread.',
    mistakes: [
      'Forgetting to set log retention. Default is FOREVER — bills grow forever too.',
      'Creating too many fine-grained alarms — alarm fatigue. Start with 3-5 critical ones.',
    ],
    how: {
      console: [
        'CloudWatch → Log groups → set retention (1/7/30/90 days) on every log group',
        'CloudWatch → Alarms → Create alarm',
        'Metric: pick (e.g. ALB HTTPCode_Target_5XX_Count)',
        'Threshold: > 10 in 5 minutes',
        'Notification: SNS topic → email / PagerDuty',
        'Create',
      ],
      cli: `# Set retention
aws logs put-retention-policy --log-group-name /aws/lambda/my-fn --retention-in-days 14

# Create an alarm
aws cloudwatch put-metric-alarm \\
  --alarm-name HighErrorRate \\
  --metric-name HTTPCode_Target_5XX_Count \\
  --namespace AWS/ApplicationELB \\
  --statistic Sum \\
  --period 300 --threshold 10 \\
  --comparison-operator GreaterThanThreshold \\
  --evaluation-periods 1 \\
  --alarm-actions arn:aws:sns:REGION:ACCT:alerts`,
      cfn: `LogRetention:
  Type: AWS::Logs::LogGroup
  Properties:
    LogGroupName: /aws/lambda/my-fn
    RetentionInDays: 14

HighErrorAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: HighErrorRate
    Namespace: AWS/ApplicationELB
    MetricName: HTTPCode_Target_5XX_Count
    Statistic: Sum
    Period: 300
    Threshold: 10
    ComparisonOperator: GreaterThanThreshold
    EvaluationPeriods: 1
    AlarmActions: [ !Ref AlertsTopic ]`,
      tf: `resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/my-fn"
  retention_in_days = 14
}

resource "aws_cloudwatch_metric_alarm" "high_errors" {
  alarm_name          = "HighErrorRate"
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  statistic           = "Sum"
  period              = 300
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  alarm_actions       = [aws_sns_topic.alerts.arn]
}`,
    },
  },

  cloudtrail: {
    title: 'Enable CloudTrail for API audit logging',
    what: 'Create a multi-region trail delivering management events to a tightly-controlled S3 bucket.',
    why: 'CloudTrail records every API call — who, what, when, from where. Essential for security audits, incident investigation, and compliance. Send to a dedicated log-archive bucket with Object Lock for tamper-proof forensic evidence.',
    analogy: 'A flight recorder for your AWS account — captures every action for replay later.',
    mistakes: [
      'Leaving CloudTrail in the same account that admins use. Compromise of admin = ability to delete logs. Use a separate log-archive account.',
      'Enabling Data Events on every S3 bucket (per-object events get pricey fast). Enable only on critical buckets.',
    ],
    how: {
      console: [
        'CloudTrail → Trails → Create trail',
        'Apply to all regions',
        'S3 bucket: dedicated log bucket (with Object Lock)',
        'Log file validation: enabled',
        'KMS encryption: enabled',
        'Optional: send to CloudWatch Logs for real-time alerts',
        'Create',
      ],
      cli: `aws cloudtrail create-trail \\
  --name my-trail \\
  --s3-bucket-name my-audit-logs-bucket \\
  --is-multi-region-trail \\
  --enable-log-file-validation`,
      cfn: `MyTrail:
  Type: AWS::CloudTrail::Trail
  Properties:
    TrailName: my-trail
    S3BucketName: !Ref AuditLogsBucket
    IsMultiRegionTrail: true
    EnableLogFileValidation: true
    IncludeGlobalServiceEvents: true
    IsLogging: true`,
      tf: `resource "aws_cloudtrail" "main" {
  name                          = "my-trail"
  s3_bucket_name                = aws_s3_bucket.audit.id
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  include_global_service_events = true
}`,
    },
  },

  bedrock: {
    title: 'Configure Bedrock model access + Guardrails',
    what: 'Enable model access in Bedrock + create Guardrails for content filtering + PII redaction.',
    why: 'Bedrock gives serverless access to foundation models (Claude, Llama, Titan, Mistral) via one API. Guardrails apply content + PII filters BEFORE and AFTER model calls — essential for user-facing chatbots. For chat over your docs, use Bedrock Knowledge Bases (managed RAG).',
    analogy: 'OpenAI for AWS — pick a model, call the API, pay per token.',
    mistakes: [
      'Forgetting to request access to specific models. Each must be enabled in the Bedrock console.',
      'Skipping Guardrails on user-facing apps. Without them, your chatbot will eventually output PII or banned content.',
    ],
    how: {
      console: [
        'Bedrock → Model access → request access to models you need',
        'Bedrock → Guardrails → Create',
        '  Content filters: hate, violence, sexual, misconduct',
        '  Denied topics: list anything off-limits',
        '  PII redaction: emails, phones, SSNs as needed',
        'Bedrock → Playground → test prompts',
        'Use AWS SDK InvokeModel + apply guardrailIdentifier in calls',
      ],
      cli: `# Models must be enabled in the console first. Then:
aws bedrock-runtime invoke-model \\
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \\
  --body '{"messages":[{"role":"user","content":"Hello"}],"max_tokens":256,"anthropic_version":"bedrock-2023-05-31"}' \\
  out.json`,
      cfn: `# Bedrock model access + Guardrails currently not fully supported in CFN.
# Use the SDK or console for now.`,
      tf: `resource "aws_bedrock_guardrail" "my_guardrail" {
  name                      = "my-guardrail"
  blocked_input_messaging   = "Sorry, that's not something I can help with."
  blocked_outputs_messaging = "Sorry, that's not something I can answer."

  content_policy_config {
    filters_config {
      input_strength  = "HIGH"
      output_strength = "HIGH"
      type            = "HATE"
    }
  }

  sensitive_information_policy_config {
    pii_entities_config {
      action = "ANONYMIZE"
      type   = "EMAIL"
    }
  }
}`,
    },
  },

  cloudformation: {
    title: 'Define the infrastructure as a CloudFormation template',
    what: 'Author a YAML template covering every resource + parameters + outputs; deploy via Change Set.',
    why: 'CloudFormation is AWS\'s declarative IaC — describe the desired state, AWS handles dependency order. Change Sets preview WHAT will change before applying — essential for production updates. Drift Detection flags manual changes outside the template.',
    analogy: 'A blueprint AWS actually executes — describe the building, AWS constructs it.',
    mistakes: [
      'Skipping Change Sets and just running `update-stack`. Surprise replacement of an RDS = data loss.',
      'Forgetting DeletionPolicy: Retain on stateful resources. Deleting the stack will delete the data.',
    ],
    how: {
      console: [
        'CloudFormation → Create stack → upload template',
        'Parameters: fill in environment-specific values',
        'Permissions: IAM role for the stack (least privilege)',
        'Stack policy: protect critical resources',
        'Create change set → review → execute',
      ],
      cli: `aws cloudformation deploy \\
  --template-file infra.yaml \\
  --stack-name my-stack \\
  --capabilities CAPABILITY_IAM \\
  --parameter-overrides Env=prod`,
      cfn: `# This step IS CloudFormation — assemble all prior resources into one template.
AWSTemplateFormatVersion: '2010-09-09'
Description: My project infrastructure
Parameters:
  Env:
    Type: String
    Default: prod
Resources:
  # ... (your VPC, S3, Lambda, etc. from previous steps)
Outputs:
  ApiUrl:
    Value: !Sub "https://\${HttpApi}.execute-api.\${AWS::Region}.amazonaws.com"`,
      tf: `# If you prefer Terraform — same idea, different syntax.
# All resources from prior steps assembled here.
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}
provider "aws" {
  region = var.aws_region
}`,
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ════════════════════════════════════════════════════════════════════

/**
 * Generate a complete Deep Walkthrough from a brief and/or service list.
 *
 * @param {object} opts
 *   - title       string (required)
 *   - blurb       string (optional, defaults from brief)
 *   - brief       string (optional, used for service detection)
 *   - services    string[] (optional, augments detected services)
 *   - source      'project' | 'freelance' | 'manual' (defaults 'manual')
 *   - difficulty  'Beginner' | 'Intermediate' | 'Advanced' (defaults 'Intermediate')
 *
 * @returns walkthrough object (same shape as DEEP_WALKTHROUGHS entries)
 */
export function generateWalkthrough({ title, blurb, brief = '', services = [], source = 'manual', difficulty }) {
  // 1. Detect services from brief + merge with explicit list
  const detected = detectServicesInBrief(brief);
  const explicit = services
    .map((s) => resolvePricingKey(s) || String(s).toLowerCase())
    .filter(Boolean);
  const merged = [...new Set([...detected, ...explicit])];

  // 2. Order by build sequence
  const ordered = orderServices(merged);

  // 3. Build steps from templates
  const steps = ordered.map((svc, idx) => ({
    ...STEP_TEMPLATES[svc],
    number: idx + 1,
  }));

  // 4. If no recognised services, generate a placeholder step
  if (steps.length === 0) {
    steps.push({
      number: 1,
      title: 'No recognised AWS services in the brief',
      what: 'The generator couldn\'t detect specific AWS services from the brief.',
      why: 'For best results, mention AWS service names directly (e.g. "S3", "Lambda", "DynamoDB") in your description. The generator scans the text and recognises 35+ services. You can also pass a `services` array explicitly when calling the generator.',
      analogy: 'Like asking for a recipe without naming the ingredients — give us a service name to work with.',
      mistakes: [
        'Using vague terms only (e.g. "the cloud", "the database") without naming AWS-specific services.',
      ],
      how: {
        console: ['Edit your brief and add AWS service names', 'Click Re-generate'],
        cli: '# No services detected', cfn: '# No services detected', tf: '# No services detected',
      },
    });
  }

  // 5. Estimate time + auto difficulty
  const estMinutes = Math.max(15, ordered.length * 12);
  const autoDifficulty = ordered.length <= 3 ? 'Beginner'
    : ordered.length <= 6 ? 'Intermediate'
    : 'Advanced';

  const id = `gen-${slugify(title)}-${Date.now().toString(36)}`;

  return {
    id,
    title,
    blurb: blurb || brief.slice(0, 140) || `Auto-generated walkthrough using ${ordered.length} AWS service${ordered.length === 1 ? '' : 's'}.`,
    services: ordered,
    difficulty: difficulty || autoDifficulty,
    estMinutes,
    prereqs: [
      'AWS account with admin or appropriate IAM permissions',
      'AWS CLI installed (for CLI snippets) or Terraform/CFN tooling',
      'Region selected (defaults to your current AWS profile region)',
    ],
    steps,
    source,
    createdAt: new Date().toISOString(),
  };
}

function slugify(s) {
  return String(s || 'walkthrough')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export const SUPPORTED_SERVICES = Object.keys(STEP_TEMPLATES);
