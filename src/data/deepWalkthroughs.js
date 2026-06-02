/**
 * deepWalkthroughs.js — PJ-01 Deep Walkthrough Mode data.
 *
 * Each walkthrough has numbered steps, every step with:
 *   what, why (≥4 sentences), analogy, mistakes[], how { console, cli, cfn, tf }
 *
 * Standard Mode (existing walkthroughs) is untouched — Deep Mode is
 * a separate, richer presentation layer.
 */

export const DEEP_WALKTHROUGHS = [
  // ════════════════════════════════════════════════════════════════════
  {
    id: 'static-website-s3',
    title: 'Deploy a Static Website to S3 + CloudFront',
    blurb: 'Take an HTML/CSS/JS site from local files to a globally cached HTTPS URL.',
    estMinutes: 35,
    services: ['s3', 'cloudfront', 'route53', 'acm'],
    difficulty: 'Beginner',
    prereqs: ['AWS account with admin IAM user', 'A domain name (optional, for custom URL)', 'Static site files ready locally'],
    steps: [
      {
        number: 1,
        title: 'Create an S3 bucket to hold the site files',
        what: 'Create a globally-unique S3 bucket that will store your website\'s HTML, CSS, JS, and image files.',
        why: `S3 is object storage built for the web — it scales infinitely, has 11-nines durability, and serves files over HTTP. For static websites it costs literally pennies per month, even for thousands of visitors. The bucket is the container; every file inside has a unique key (the path), and every file gets a URL once we configure the bucket properly. Choosing the right name + region matters: bucket names are globally unique across all AWS accounts, and the region affects latency before CloudFront caches kick in.`,
        analogy: 'An S3 bucket is like a folder in Google Drive, but built for the public web — every file in it can have its own shareable URL, and it never runs out of space.',
        mistakes: [
          'Picking a bucket name like "mysite" — almost certainly already taken globally. Use a unique suffix like your domain or a random ID.',
          'Creating it in a far-away region (e.g. ap-south-1 when your users are in Europe). Pick a region closest to your users for lower first-byte latency before CloudFront warms up.',
        ],
        how: {
          console: [
            'Open the AWS Console → S3 service',
            'Click "Create bucket"',
            'Bucket name: example-com-site-2026 (must be globally unique)',
            'Region: pick the one closest to most users (e.g. eu-west-1 for Europe)',
            'Leave "Block all public access" CHECKED for now — we use CloudFront OAC',
            'Acknowledge + click "Create bucket"',
          ],
          cli: `aws s3api create-bucket \\
  --bucket example-com-site-2026 \\           # globally-unique name
  --region eu-west-1 \\                        # closest region to users
  --create-bucket-configuration LocationConstraint=eu-west-1   # required for non-us-east-1`,
          cfn: `# CloudFormation YAML
Resources:
  SiteBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: example-com-site-2026          # must be globally unique
      # Default: block all public access — CloudFront OAC will be granted access
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        IgnorePublicAcls: true
        BlockPublicPolicy: true
        RestrictPublicBuckets: true`,
          tf: `# Terraform HCL
resource "aws_s3_bucket" "site" {
  bucket = "example-com-site-2026"   # globally unique
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true       # CloudFront OAC handles access
}`,
        },
      },
      {
        number: 2,
        title: 'Upload your site files into the bucket',
        what: 'Copy your local HTML, CSS, JS, and image files into the bucket, preserving folder structure.',
        why: `Once the bucket exists, it\'s an empty container — you must put files in it before there\'s anything to serve. Folder structure in your local project should match what your site expects: index.html at the root, /css/ for stylesheets, /js/ for scripts, /images/ for assets. S3 preserves "/" in keys as virtual folders for the web. Content-Type headers matter too: S3 sets these automatically based on file extension, but if your build outputs files without recognised extensions they may serve as application/octet-stream and break browsers.`,
        analogy: 'Like dragging your website folder into a USB stick — except this stick is sitting in AWS and can be reached by anyone on the internet (once we configure access).',
        mistakes: [
          'Forgetting to upload index.html at the root — CloudFront will return 404 for / requests.',
          'Uploading files with the wrong Content-Type (e.g. .css served as text/plain instead of text/css). Verify after upload via console "Properties" tab.',
        ],
        how: {
          console: [
            'Open the bucket in the S3 console',
            'Click "Upload"',
            'Drag your /dist (or /build, or /public) folder contents in',
            'Click "Upload" — wait for green checkmarks on every file',
            'Verify Content-Type is correct on a few key files via Properties tab',
          ],
          cli: `aws s3 sync ./dist s3://example-com-site-2026/ \\
  --delete \\                                  # remove S3 files no longer in local dist
  --cache-control "public, max-age=86400" \\   # 1-day cache for asset files
  --exclude "*.html" \\                        # exclude HTML from long cache
  && aws s3 cp ./dist/ s3://example-com-site-2026/ \\
       --recursive --include "*.html" \\
       --cache-control "public, max-age=0, must-revalidate"   # HTML: never cache long`,
          cfn: `# CloudFormation can't upload files directly — use the CDK or a CI/CD step.
# Common pattern: BuildSpec in CodeBuild copies files via "aws s3 sync".
# Alternatively, use the AWS::S3::Object resource (limited; max 1 KB per object).
# Bottom line: CFN is for infrastructure, not for shipping content.`,
          tf: `# Terraform can upload files using aws_s3_object — but for many files,
# typically you do the upload in a separate step (CI/CD or local aws s3 sync).
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.site.id
  key          = "index.html"
  source       = "./dist/index.html"
  content_type = "text/html"               # explicit Content-Type
  cache_control = "public, max-age=0, must-revalidate"
  etag         = filemd5("./dist/index.html")   # triggers update on file change
}`,
        },
      },
      {
        number: 3,
        title: 'Create a CloudFront distribution in front of the bucket',
        what: 'Set up CloudFront — AWS\'s global CDN — to cache your site at 600+ edge locations close to your users.',
        why: `Serving files directly from S3 works but is slow for users far from the bucket\'s region. Every request would cross continents. CloudFront sits in front, caching responses at the edge: a Sydney user hits a Sydney edge, an LA user hits an LA edge. First request to a new edge is slow (origin fetch), but subsequent requests are sub-100ms. CloudFront also gives you free HTTPS via ACM, automatic Shield Standard DDoS protection, and a single URL that handles requests globally instead of region-specific S3 URLs.`,
        analogy: 'CloudFront is like a network of vending machines worldwide — instead of every customer flying to your factory (the S3 bucket), they grab the same product from the nearest vending machine (the edge cache).',
        mistakes: [
          'Setting cache TTL too long on HTML files. If you update index.html but CloudFront caches it for a year, users see stale content. Use short TTL for HTML, long TTL for fingerprinted assets.',
          'Forgetting to set the default root object to index.html. Without it, https://your-domain.com/ returns 404 — only /index.html works.',
        ],
        how: {
          console: [
            'Open CloudFront → Create distribution',
            'Origin domain: pick your S3 bucket from the dropdown',
            'Origin access: select "Origin access control settings" → Create new OAC',
            'Viewer protocol policy: Redirect HTTP to HTTPS',
            'Cache key + origin requests: use the Managed-CachingOptimized policy',
            'Default root object: index.html',
            'WAF: skip for now (add Shield Advanced + WAF later if needed)',
            'Click Create — wait ~10 min for global deployment',
            'CloudFront prompts you to update the bucket policy — copy the generated policy + paste it on the bucket',
          ],
          cli: `# 1. Create the OAC
aws cloudfront create-origin-access-control \\
  --origin-access-control-config '{
    "Name":"oac-example-com",
    "SigningProtocol":"sigv4",
    "SigningBehavior":"always",
    "OriginAccessControlOriginType":"s3"
  }'

# 2. Create the distribution (use a JSON config file in practice — abbreviated here)
aws cloudfront create-distribution --distribution-config file://dist-config.json

# 3. Update the bucket policy to allow CloudFront OAC
aws s3api put-bucket-policy --bucket example-com-site-2026 \\
  --policy file://bucket-policy.json`,
          cfn: `OAC:
  Type: AWS::CloudFront::OriginAccessControl
  Properties:
    OriginAccessControlConfig:
      Name: oac-example-com
      OriginAccessControlOriginType: s3
      SigningBehavior: always
      SigningProtocol: sigv4

Distribution:
  Type: AWS::CloudFront::Distribution
  Properties:
    DistributionConfig:
      Enabled: true
      DefaultRootObject: index.html      # so / serves index.html
      Origins:
        - Id: s3-site-origin
          DomainName: !GetAtt SiteBucket.RegionalDomainName
          S3OriginConfig: { OriginAccessIdentity: '' }   # empty for OAC
          OriginAccessControlId: !Ref OAC
      DefaultCacheBehavior:
        TargetOriginId: s3-site-origin
        ViewerProtocolPolicy: redirect-to-https
        CachePolicyId: 658327ea-f89d-4fab-a63d-7e88639e58f6   # Managed-CachingOptimized
        Compress: true
      PriceClass: PriceClass_100`,
          tf: `resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "oac-example-com"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-site-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET","HEAD"]
    cached_methods         = ["GET","HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6"  # Managed-CachingOptimized
    compress               = true
  }

  restrictions { geo_restriction { restriction_type = "none" } }
  viewer_certificate { cloudfront_default_certificate = true }
}`,
        },
      },
      {
        number: 4,
        title: 'Test the deployment',
        what: 'Visit the CloudFront URL to confirm the site loads correctly and HTTPS is working.',
        why: `Before pointing your domain at CloudFront, verify the basics: HTML loads, CSS + JS are referenced correctly, images appear, links work. Browser DevTools "Network" tab shows the cache HIT/MISS status — first load is MISS (origin fetch), refresh should be HIT (edge cache). If you see 403s, the bucket policy didn\'t grant CloudFront access. If you see 404s on subpages, you might need a custom error response that returns index.html with 200 (for SPA routing).`,
        analogy: 'Like flicking the light switch in a new room before bringing furniture in — confirm the basics work in isolation.',
        mistakes: [
          'Testing only in an incognito window once, then assuming it always works. Test on mobile + multiple browsers + your worst-case connection.',
          'Not waiting long enough — CloudFront takes ~10 min for new distributions to fully deploy globally.',
        ],
        how: {
          console: [
            'Copy the distribution\'s "Distribution domain name" (e.g. d1234.cloudfront.net)',
            'Open in browser — should load your site over HTTPS',
            'DevTools → Network tab → look for x-cache header: "Miss from cloudfront" first time, "Hit" on refresh',
            'Test internal links + assets — all should be HTTPS, none should 404',
          ],
          cli: `# Verify HTTPS + headers
curl -I https://d1234.cloudfront.net/
# Look for: HTTP/2 200, content-type: text/html, x-cache: Miss from cloudfront

# Hit it again to confirm cache works
curl -I https://d1234.cloudfront.net/
# Now should show: x-cache: Hit from cloudfront`,
          cfn: `# Verification is runtime — not part of the template.
# You can add a CloudFormation Output to expose the URL:
Outputs:
  SiteURL:
    Value: !Sub "https://\${Distribution.DomainName}"
    Description: Test this URL after deployment`,
          tf: `output "site_url" {
  value       = "https://\${aws_cloudfront_distribution.site.domain_name}"
  description = "Open this in your browser to verify the deployment"
}`,
        },
      },
      {
        number: 5,
        title: 'Point your custom domain at CloudFront (optional)',
        what: 'Configure Route 53 (or your existing DNS) so https://yourdomain.com → CloudFront → S3.',
        why: `CloudFront\'s default URL (d1234.cloudfront.net) works but isn\'t memorable. Pointing a real domain (yourdomain.com) gives you brand control + better SEO. You need: 1) an ACM cert for the domain (must be in us-east-1 for CloudFront), 2) DNS records pointing the apex + www to CloudFront, 3) the alternate-domain-name (CNAME) added to the distribution. Route 53 Alias records work at the apex (where CNAMEs aren\'t allowed) and auto-update when CloudFront\'s IPs change.`,
        analogy: 'Renaming "192.168.1.42" to "my-printer" on your home network — humans remember names, not addresses.',
        mistakes: [
          'Requesting the ACM cert in your home region instead of us-east-1. CloudFront ONLY accepts certs from us-east-1.',
          'Forgetting to add the alternate domain name (AltDomainName / Aliases) to the CloudFront distribution itself. ACM cert alone isn\'t enough.',
        ],
        how: {
          console: [
            'ACM → us-east-1 region → Request certificate',
            'Domain names: yourdomain.com + www.yourdomain.com',
            'Validation: DNS validation (recommended) → ACM creates Route 53 records automatically',
            'Wait for cert status: Issued (≈5 min)',
            'CloudFront → distribution → Edit → Alternate domain name (CNAME): yourdomain.com, www.yourdomain.com',
            'Custom SSL certificate: select your ACM cert',
            'Route 53 → hosted zone → Create record',
            '  - Apex: A record + Alias → CloudFront distribution',
            '  - www: A record + Alias → same CloudFront distribution',
          ],
          cli: `# 1. Request cert (must be us-east-1!)
aws acm request-certificate --region us-east-1 \\
  --domain-name yourdomain.com \\
  --subject-alternative-names www.yourdomain.com \\
  --validation-method DNS

# 2. After cert issued, attach to distribution (update via CloudFront config)
# 3. Route 53 alias records
aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID \\
  --change-batch file://route53-alias.json`,
          cfn: `Cert:
  Type: AWS::CertificateManager::Certificate
  Properties:
    DomainName: yourdomain.com
    SubjectAlternativeNames: [ www.yourdomain.com ]
    ValidationMethod: DNS
    # NOTE: Cert MUST be in us-east-1 for CloudFront use.
    # Use a nested stack in us-east-1 if your main stack is elsewhere.

# In the Distribution definition:
Distribution:
  Properties:
    DistributionConfig:
      Aliases: [ yourdomain.com, www.yourdomain.com ]
      ViewerCertificate:
        AcmCertificateArn: !Ref Cert
        SslSupportMethod: sni-only
        MinimumProtocolVersion: TLSv1.2_2021

# Route 53 Alias records
ApexRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneId: !Ref HostedZoneId
    Name: yourdomain.com
    Type: A
    AliasTarget:
      DNSName: !GetAtt Distribution.DomainName
      HostedZoneId: Z2FDTNDATAQYW2     # fixed for CloudFront`,
          tf: `provider "aws" { alias = "us_east_1"; region = "us-east-1" }

resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1     # ACM for CloudFront MUST be us-east-1
  domain_name               = "yourdomain.com"
  subject_alternative_names = ["www.yourdomain.com"]
  validation_method         = "DNS"
}

# Add to your aws_cloudfront_distribution.site:
#   aliases             = ["yourdomain.com", "www.yourdomain.com"]
#   viewer_certificate {
#     acm_certificate_arn      = aws_acm_certificate.site.arn
#     ssl_support_method       = "sni-only"
#     minimum_protocol_version = "TLSv1.2_2021"
#   }

resource "aws_route53_record" "apex" {
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
    ],
  },

  // ════════════════════════════════════════════════════════════════════
  {
    id: 'vpc-ec2-web-app',
    title: 'Launch a Web App on EC2 in a Custom VPC',
    blurb: 'Build a production-shape VPC, launch an EC2 instance in a private subnet, expose it via an ALB.',
    estMinutes: 50,
    services: ['vpc', 'ec2', 'alb', 'asg'],
    difficulty: 'Intermediate',
    prereqs: ['AWS account with admin IAM user', 'Basic familiarity with EC2 + Linux SSH', 'A key pair created in the target region'],
    steps: [
      {
        number: 1,
        title: 'Create a custom VPC with public + private subnets across 2 AZs',
        what: 'Build an isolated network in AWS with 4 subnets — 2 public (for ALB), 2 private (for EC2), one per AZ for HA.',
        why: `The default VPC works but mixes everything in public subnets — unsuitable for production. A custom VPC lets you separate "internet-facing" resources (load balancer) from "internal" resources (app servers + DB). Subnets per AZ provide fault tolerance: if one AZ dies, the other keeps serving. CIDR planning matters too: pick a range big enough for growth but that won\'t conflict with on-prem networks if you ever connect them via VPN/DX.`,
        analogy: 'Like designing a building — public lobby (public subnet for ALB), private office floors (private subnet for app servers), with two entrances on different streets (two AZs).',
        mistakes: [
          'Using a tiny CIDR like 10.0.0.0/24 — leaves no room to grow. Use /16 minimum for production VPCs.',
          'Putting EC2 directly in public subnets. Production app servers belong in private subnets behind an ALB — never directly internet-exposed.',
        ],
        how: {
          console: [
            'VPC → Create VPC → "VPC and more" wizard (creates everything in one flow)',
            'Name: my-app-vpc',
            'IPv4 CIDR: 10.0.0.0/16',
            'Availability Zones: 2',
            'Public subnets: 2 (one per AZ — 10.0.0.0/24, 10.0.1.0/24)',
            'Private subnets: 2 (one per AZ — 10.0.10.0/24, 10.0.11.0/24)',
            'NAT Gateways: 1 per AZ (high availability) — or "In 1 AZ" for cost-optimised dev',
            'VPC endpoints: S3 Gateway Endpoint (free, no NAT for S3 access)',
            'Click Create VPC',
          ],
          cli: `# Easier via CloudFormation/Terraform — CLI requires many calls
aws ec2 create-vpc --cidr-block 10.0.0.0/16 \\
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=my-app-vpc}]'

# Then create subnets, IGW, route tables, NAT GWs... ~15 commands.
# The Console wizard or CFN/TF below is much easier.`,
          cfn: `# Use the AWS VPC quick-start template OR write your own.
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true       # so instances get DNS names
      EnableDnsSupport: true         # required for VPC DNS resolution

  PublicSubnetA:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.0.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true      # auto-assign public IP to instances

  # ... repeat for PublicSubnetB, PrivateSubnetA, PrivateSubnetB
  # Plus IGW, NAT GW per AZ, route tables, route table associations
  # (~80 lines of YAML for a proper 2-AZ VPC)`,
          tf: `# Terraform AWS VPC module — production-ready in 20 lines
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "my-app-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["eu-west-1a", "eu-west-1b"]
  public_subnets   = ["10.0.0.0/24", "10.0.1.0/24"]
  private_subnets  = ["10.0.10.0/24", "10.0.11.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false     # one NAT per AZ for HA
  one_nat_gateway_per_az = true

  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Environment = "prod" }
}`,
        },
      },
      {
        number: 2,
        title: 'Create security groups for ALB and EC2',
        what: 'Define two security groups: one for the ALB (allows HTTPS from internet) and one for EC2 (allows HTTP only from the ALB).',
        why: `Security Groups are stateful firewalls at the instance level. The "layered" approach is essential: ALB is the only thing internet-reachable on port 443; EC2 only accepts traffic FROM the ALB security group (referenced by ID, not IP). This means even if someone discovers an EC2\'s private IP, they can\'t connect because the SG won\'t allow it. SGs reference each other by ID, so the rule survives instance replacements without IP-list updates.`,
        analogy: 'The ALB SG is the building\'s main door (key card from anyone with a visitor pass). The EC2 SG is the office floor door (key card only from people inside the lobby — you can\'t get there directly from the street).',
        mistakes: [
          'Opening port 22 (SSH) to 0.0.0.0/0 on the EC2 SG. NEVER do this in production. Use SSM Session Manager instead — no SSH needed.',
          'Allowing the ALB to talk to EC2 by IP CIDR instead of SG-to-SG reference. When EC2 instances scale or get replaced, IPs change — SG references don\'t.',
        ],
        how: {
          console: [
            'EC2 → Security Groups → Create security group (×2)',
            'ALB SG (alb-sg):',
            '  Inbound: HTTPS (443) from 0.0.0.0/0',
            '  Inbound: HTTP (80) from 0.0.0.0/0 (we redirect to HTTPS in ALB)',
            '  Outbound: all',
            'EC2 SG (app-sg):',
            '  Inbound: HTTP (80) from source = alb-sg (NOT a CIDR — pick the SG)',
            '  Outbound: all',
          ],
          cli: `# ALB SG
aws ec2 create-security-group --group-name alb-sg --description "ALB SG" --vpc-id vpc-xxx
aws ec2 authorize-security-group-ingress --group-id sg-alb \\
  --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id sg-alb \\
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# EC2 SG — note the source is the ALB SG, not a CIDR
aws ec2 create-security-group --group-name app-sg --description "EC2 SG" --vpc-id vpc-xxx
aws ec2 authorize-security-group-ingress --group-id sg-app \\
  --protocol tcp --port 80 --source-group sg-alb`,
          cfn: `AlbSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: ALB SG — accepts HTTPS from internet
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 443
        ToPort: 443
        CidrIp: 0.0.0.0/0

AppSecurityGroup:
  Type: AWS::EC2::SecurityGroup
  Properties:
    GroupDescription: App EC2 SG — only ALB can reach us
    VpcId: !Ref VPC
    SecurityGroupIngress:
      - IpProtocol: tcp
        FromPort: 80
        ToPort: 80
        SourceSecurityGroupId: !Ref AlbSecurityGroup    # SG-to-SG, not CIDR`,
          tf: `resource "aws_security_group" "alb" {
  name   = "alb-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = module.vpc.vpc_id

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]   # SG-to-SG reference
  }

  egress {
    from_port = 0; to_port = 0; protocol = "-1"; cidr_blocks = ["0.0.0.0/0"]
  }
}`,
        },
      },
      {
        number: 3,
        title: 'Launch an EC2 instance in a private subnet',
        what: 'Spin up an Amazon Linux 2 EC2 in a private subnet with the app SG, install a web server via user-data.',
        why: `EC2 is your virtual server. Placing it in a private subnet means no internet ingress is possible — only the ALB can reach it. Outbound internet (for package installs, updates) goes via the NAT Gateway. User data is a shell script that runs once on first boot; it\'s the cleanest way to bootstrap the instance without manual SSH. We use an IAM instance profile (not access keys) so the instance can call AWS APIs securely. SSM Session Manager replaces SSH — no port 22 needed.`,
        analogy: 'Like hiring a new employee — you handle their training (user data) on day one, give them an ID badge (IAM role), then they go to work in the back office (private subnet).',
        mistakes: [
          'Forgetting to attach an IAM Instance Profile. Without it, the instance has no AWS API access + SSM Session Manager doesn\'t work.',
          'Putting the instance in a public subnet "for SSH access". The right answer is private subnet + SSM Session Manager + no public IP — even more secure.',
        ],
        how: {
          console: [
            'EC2 → Launch instances',
            'Name: app-server-1',
            'AMI: Amazon Linux 2023',
            'Instance type: t3.micro (free tier)',
            'Key pair: pick existing or "no key pair" (SSM Session Manager has no SSH)',
            'Network: my-app-vpc',
            'Subnet: private-subnet-1a',
            'Auto-assign public IP: DISABLE',
            'Security group: app-sg',
            'IAM instance profile: AmazonSSMManagedInstanceCore role',
            'User data: paste the bootstrap script below',
            'Click Launch instance',
          ],
          cli: `# Get latest Amazon Linux 2023 AMI
AMI=$(aws ssm get-parameters --names \\
  /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \\
  --query 'Parameters[0].Value' --output text)

aws ec2 run-instances \\
  --image-id $AMI \\
  --instance-type t3.micro \\
  --subnet-id subnet-private-1a \\
  --security-group-ids sg-app \\
  --iam-instance-profile Name=SSMInstanceProfile \\
  --no-associate-public-ip-address \\
  --user-data file://bootstrap.sh \\
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=app-server-1}]'`,
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
        echo "<h1>Hello from EC2!</h1>" > /usr/share/nginx/html/index.html
        systemctl enable --now nginx
    Tags:
      - { Key: Name, Value: app-server-1 }`,
          tf: `data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = module.vpc.private_subnets[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.ssm.name

  user_data = <<-EOF
    #!/bin/bash
    dnf install -y nginx
    echo "<h1>Hello from EC2!</h1>" > /usr/share/nginx/html/index.html
    systemctl enable --now nginx
  EOF

  tags = { Name = "app-server-1" }
}`,
        },
      },
      {
        number: 4,
        title: 'Create an Application Load Balancer with HTTPS',
        what: 'Provision an ALB in the public subnets, set up an HTTPS listener with an ACM cert, target group for the EC2.',
        why: `An ALB is the layer-7 load balancer — it terminates HTTPS, routes by path/host, and load-balances across multiple EC2 targets. Living in public subnets across 2 AZs makes it highly available. ACM provides free auto-renewing TLS certs. Target Groups abstract "which instances back this service" — your EC2 registers as a target, and you can add more later without changing the listener config. Health checks ensure traffic only hits healthy instances.`,
        analogy: 'The ALB is the receptionist with a directory — guests (users) come in the lobby, the receptionist routes them to the right department (target group) and skips any desks where nobody\'s answering (failed health check).',
        mistakes: [
          'Putting the ALB in private subnets — then nothing on the internet can reach it. ALBs serving internet traffic MUST be in public subnets.',
          'Letting the ALB use the default cert (no HTTPS) for "just testing". Modern browsers warn users + search engines penalise non-HTTPS. Use ACM from day one.',
        ],
        how: {
          console: [
            'ACM → Request certificate → DNS validation for yourdomain.com',
            'EC2 → Load Balancers → Create → Application Load Balancer',
            'Name: app-alb',
            'Scheme: Internet-facing',
            'IP type: IPv4',
            'VPC: my-app-vpc',
            'Mappings: select both public subnets',
            'Security group: alb-sg',
            'Listeners: HTTPS:443 → Create new target group',
            '  Target group: app-tg, protocol HTTP:80, target type Instance',
            '  Health check path: / (or /health)',
            '  Register targets: app-server-1',
            'SSL/TLS certificate: pick your ACM cert',
            'Click Create load balancer',
          ],
          cli: `aws elbv2 create-load-balancer \\
  --name app-alb --scheme internet-facing --type application \\
  --subnets subnet-pub-a subnet-pub-b \\
  --security-groups sg-alb

aws elbv2 create-target-group \\
  --name app-tg --protocol HTTP --port 80 \\
  --vpc-id vpc-xxx --target-type instance \\
  --health-check-path /

aws elbv2 register-targets \\
  --target-group-arn TG_ARN --targets Id=i-xxx

aws elbv2 create-listener \\
  --load-balancer-arn ALB_ARN \\
  --protocol HTTPS --port 443 \\
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \\
  --certificates CertificateArn=ACM_ARN \\
  --default-actions Type=forward,TargetGroupArn=TG_ARN`,
          cfn: `Alb:
  Type: AWS::ElasticLoadBalancingV2::LoadBalancer
  Properties:
    Name: app-alb
    Scheme: internet-facing
    Subnets: [ !Ref PublicSubnetA, !Ref PublicSubnetB ]
    SecurityGroups: [ !Ref AlbSecurityGroup ]

TargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Name: app-tg
    Port: 80
    Protocol: HTTP
    VpcId: !Ref VPC
    HealthCheckPath: /
    Targets: [ { Id: !Ref AppInstance } ]

HttpsListener:
  Type: AWS::ElasticLoadBalancingV2::Listener
  Properties:
    LoadBalancerArn: !Ref Alb
    Port: 443
    Protocol: HTTPS
    SslPolicy: ELBSecurityPolicy-TLS13-1-2-2021-06
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

resource "aws_lb_target_group" "app" {
  name        = "app-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "instance"
  health_check { path = "/"; matcher = "200" }
}

resource "aws_lb_target_group_attachment" "app" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app.id
  port             = 80
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.app.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}`,
        },
      },
      {
        number: 5,
        title: 'Point your domain at the ALB + test',
        what: 'Route 53 alias record → ALB. Visit https://yourdomain.com to confirm everything works end-to-end.',
        why: `The final wiring step: DNS routes user traffic to your ALB, which load-balances to your EC2(s). An Alias record (not CNAME) at the apex auto-updates if the ALB\'s IPs change. Once it works, you have a production-grade stack: HTTPS, multi-AZ HA at the ALB layer, private EC2, NAT for outbound, scaling room. From here you can add Auto Scaling, RDS, CloudFront, etc.`,
        analogy: 'Like getting the city to add your business to Google Maps — until then, only people who know your private address can find you.',
        mistakes: [
          'Using a CNAME at the apex (yourdomain.com). DNS standards forbid CNAME at apex — use Route 53 Alias records.',
          'Forgetting to wait ~5 minutes after creating the ALB. ALB DNS resolution takes a moment to propagate globally.',
        ],
        how: {
          console: [
            'Route 53 → hosted zone → Create record',
            'Record name: yourdomain.com (leave blank for apex)',
            'Record type: A',
            'Alias: ON',
            'Route traffic to: Application + Classic LB → region → pick your ALB',
            'Click Create records',
            'Wait ~1 min, then visit https://yourdomain.com',
          ],
          cli: `aws route53 change-resource-record-sets --hosted-zone-id ZONE_ID \\
  --change-batch '{
    "Changes":[{
      "Action":"UPSERT",
      "ResourceRecordSet":{
        "Name":"yourdomain.com",
        "Type":"A",
        "AliasTarget":{
          "HostedZoneId":"ZONE_ID_OF_ALB_REGION",
          "DNSName":"app-alb-xxxx.eu-west-1.elb.amazonaws.com",
          "EvaluateTargetHealth":false
        }
      }
    }]
  }'

# Test
curl -I https://yourdomain.com/
# Expect: HTTP/2 200, Server: nginx`,
          cfn: `ApexRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneId: !Ref HostedZoneId
    Name: yourdomain.com
    Type: A
    AliasTarget:
      DNSName: !GetAtt Alb.DNSName
      HostedZoneId: !GetAtt Alb.CanonicalHostedZoneID
      EvaluateTargetHealth: false`,
          tf: `resource "aws_route53_record" "apex" {
  zone_id = var.zone_id
  name    = "yourdomain.com"
  type    = "A"

  alias {
    name                   = aws_lb.app.dns_name
    zone_id                = aws_lb.app.zone_id
    evaluate_target_health = false
  }
}

output "site_url" {
  value = "https://yourdomain.com"
}`,
        },
      },
    ],
  },
];

export function getDeepWalkthrough(id) {
  return DEEP_WALKTHROUGHS.find((w) => w.id === id) || null;
}
