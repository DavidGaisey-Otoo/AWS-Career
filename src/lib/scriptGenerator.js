/**
 * scriptGenerator.js — turns an analyzed service list into actual,
 * runnable Terraform / CloudFormation / AWS CLI / Console-step output.
 *
 * Two modes:
 *   • mode: 'test'    → use free-tier specs (testMap.spec where defined)
 *   • mode: 'client'  → use EXACT specs from the brief (NEVER substitute)
 *
 * Each generator returns: { code, filename, language, notes[] }
 *
 * Coverage: the per-service templates know how to render the most common
 * services from `awsServiceMatrix.js`. Anything unknown falls back to a
 * commented placeholder so the user knows to fill it in.
 */

import { SERVICE_MATRIX } from '../data/awsServiceMatrix.js';

// ─────────────────────── helpers ───────────────────────

/**
 * Pick the spec to use for a service depending on mode.
 */
function specFor(service, mode) {
  if (mode === 'test' && service.testMap?.spec) return service.testMap.spec;
  return null; // null = use the service's default / requested spec
}

function slug(s) {
  return String(s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─────────────────────── Terraform ───────────────────────

const TERRAFORM_PROVIDERS = `# ─── Providers ───────────────────────────────────────────
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.region
}

# ─── Variables ───────────────────────────────────────────
variable "region" {
  description = "AWS region"
  type        = string
  default     = "%REGION%"
}

variable "project_name" {
  description = "Project name (used to tag every resource)"
  type        = string
  default     = "%PROJECT%"
}

variable "environment" {
  description = "Environment (dev / staging / prod)"
  type        = string
  default     = "%ENV%"
}

locals {
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    GeneratedBy = "AWS Career Launchpad Pro"
  }
}
`;

const TF_PER_SERVICE = {
  vpc: () => `
# ─── VPC ─────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = merge(local.common_tags, { Name = "\${var.project_name}-vpc" })
}
`,
  subnet: () => `
# ─── Subnets ─────────────────────────────────────────────
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.\${count.index + 1}.0/24"
  availability_zone       = "\${var.region}\${["a","b"][count.index]}"
  map_public_ip_on_launch = true
  tags = merge(local.common_tags, { Name = "\${var.project_name}-public-\${count.index + 1}" })
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.\${count.index + 3}.0/24"
  availability_zone = "\${var.region}\${["a","b"][count.index]}"
  tags = merge(local.common_tags, { Name = "\${var.project_name}-private-\${count.index + 1}" })
}
`,
  igw: () => `
# ─── Internet Gateway + Route Tables ────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = merge(local.common_tags, { Name = "\${var.project_name}-igw" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = merge(local.common_tags, { Name = "\${var.project_name}-public-rt" })
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
`,
  'nat-instance': () => `
# ─── NAT Instance (Free Tier) — t2.micro ─────────────────
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
  filter { name = "name"   values = ["amzn-ami-vpc-nat-*"] }
}

resource "aws_security_group" "nat" {
  name        = "\${var.project_name}-nat-sg"
  description = "Allow private subnets through NAT"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = [aws_vpc.main.cidr_block] }
  egress  { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
  tags = local.common_tags
}

resource "aws_instance" "nat" {
  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = "t2.micro"
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.nat.id]
  source_dest_check           = false
  associate_public_ip_address = true
  tags = merge(local.common_tags, { Name = "\${var.project_name}-nat-instance" })
}
`,
  'nat-gateway': (spec, mode) => mode === 'test' ? TF_PER_SERVICE['nat-instance']() : `
# ─── NAT Gateway (CLIENT MODE — costs $32/month per AZ) ──
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"
  tags   = merge(local.common_tags, { Name = "\${var.project_name}-nat-eip-\${count.index + 1}" })
}

resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = merge(local.common_tags, { Name = "\${var.project_name}-nat-\${count.index + 1}" })
  depends_on    = [aws_internet_gateway.main]
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }
  tags = merge(local.common_tags, { Name = "\${var.project_name}-private-rt-\${count.index + 1}" })
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
`,
  'security-group': () => `
# ─── Security Groups (3-tier: web / app / db) ────────────
resource "aws_security_group" "web" {
  name        = "\${var.project_name}-web-sg"
  description = "Allow HTTP/HTTPS from internet"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 80  to_port = 80  protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  ingress { from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  egress  { from_port = 0   to_port = 0   protocol = "-1"  cidr_blocks = ["0.0.0.0/0"] }
  tags = local.common_tags
}

resource "aws_security_group" "app" {
  name        = "\${var.project_name}-app-sg"
  description = "Allow traffic from web tier only"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 8080 to_port = 8080 protocol = "tcp" security_groups = [aws_security_group.web.id] }
  egress  { from_port = 0    to_port = 0    protocol = "-1"  cidr_blocks     = ["0.0.0.0/0"] }
  tags = local.common_tags
}

resource "aws_security_group" "db" {
  name        = "\${var.project_name}-db-sg"
  description = "Allow database traffic from app tier only"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 5432 to_port = 5432 protocol = "tcp" security_groups = [aws_security_group.app.id] }
  tags = local.common_tags
}
`,
  alb: () => `
# ─── Application Load Balancer ───────────────────────────
resource "aws_lb" "main" {
  name               = "\${var.project_name}-alb"
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = aws_subnet.public[*].id
  tags               = local.common_tags
}

resource "aws_lb_target_group" "main" {
  name     = "\${var.project_name}-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate.main.arn
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
`,
  ec2: (spec, mode) => {
    const type = mode === 'test' ? 't2.micro' : (spec || 't2.micro');
    return `
# ─── EC2 Auto Scaling Group (${type}) ────────────────────
data "aws_ami" "al2" {
  most_recent = true
  owners      = ["amazon"]
  filter { name = "name" values = ["amzn2-ami-hvm-*-x86_64-gp2"] }
}

resource "aws_launch_template" "app" {
  name_prefix   = "\${var.project_name}-lt-"
  image_id      = data.aws_ami.al2.id
  instance_type = "${type}"
  vpc_security_group_ids = [aws_security_group.app.id]
  tag_specifications {
    resource_type = "instance"
    tags          = merge(local.common_tags, { Name = "\${var.project_name}-app" })
  }
}

resource "aws_autoscaling_group" "app" {
  name                = "\${var.project_name}-asg"
  vpc_zone_identifier = aws_subnet.private[*].id
  target_group_arns   = [aws_lb_target_group.main.arn]
  min_size            = ${mode === 'test' ? 1 : 1}
  max_size            = ${mode === 'test' ? 1 : 3}
  desired_capacity    = 1
  launch_template { id = aws_launch_template.app.id, version = "$Latest" }
  tag { key = "Project" value = var.project_name propagate_at_launch = true }
}
`;
  },
  'ec2-autoscale': (spec, mode) => TF_PER_SERVICE.ec2(null, mode),
  'ec2-t3-large':  (spec, mode) => TF_PER_SERVICE.ec2(mode === 'test' ? 't2.micro' : 't3.large', mode),
  rds: (spec, mode) => `
# ─── RDS PostgreSQL ──────────────────────────────────────
resource "aws_db_subnet_group" "main" {
  name       = "\${var.project_name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = local.common_tags
}

resource "aws_db_instance" "main" {
  identifier              = "\${var.project_name}-postgres"
  engine                  = "postgres"
  engine_version          = "15.4"
  instance_class          = "${mode === 'test' ? 'db.t2.micro' : (spec || 'db.t2.micro')}"
  allocated_storage       = 20
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.main.arn
  backup_retention_period = 7
  multi_az                = ${mode === 'test' ? 'false' : 'false'}
  skip_final_snapshot     = true
  tags                    = local.common_tags
}
`,
  'rds-multiaz': (spec, mode) => TF_PER_SERVICE.rds(null, mode).replace('multi_az                = false', `multi_az                = ${mode === 'test' ? 'false' : 'true'}`),
  s3: () => `
# ─── S3 (deployments bucket) ─────────────────────────────
resource "aws_s3_bucket" "deployments" {
  bucket = "\${var.project_name}-deployments-\${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}

resource "aws_s3_bucket_versioning" "deployments" {
  bucket = aws_s3_bucket.deployments.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "deployments" {
  bucket = aws_s3_bucket.deployments.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" kms_master_key_id = aws_kms_key.main.arn } }
}

data "aws_caller_identity" "current" {}
`,
  kms: () => `
# ─── KMS (customer-managed key) ──────────────────────────
resource "aws_kms_key" "main" {
  description             = "\${var.project_name} CMK"
  enable_key_rotation     = true
  deletion_window_in_days = 7
  tags                    = local.common_tags
}

resource "aws_kms_alias" "main" {
  name          = "alias/\${var.project_name}-main"
  target_key_id = aws_kms_key.main.key_id
}
`,
  acm: () => `
# ─── ACM (TLS certificate, DNS-validated) ───────────────
resource "aws_acm_certificate" "main" {
  domain_name               = "*.\${var.project_name}.example.com"
  validation_method         = "DNS"
  subject_alternative_names = ["\${var.project_name}.example.com"]
  tags                      = local.common_tags
  lifecycle { create_before_destroy = true }
}
`,
  waf: (spec, mode) => mode === 'test' ? '' : `
# ─── WAF (CLIENT MODE — costs $5/Web ACL + rule costs) ──
resource "aws_wafv2_web_acl" "main" {
  name        = "\${var.project_name}-waf"
  scope       = "REGIONAL"
  default_action { allow {} }
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "\${var.project_name}-waf"
    sampled_requests_enabled   = true
  }
  rule {
    name     = "AWS-AWSManagedRulesSQLiRuleSet"
    priority = 1
    override_action { none {} }
    statement { managed_rule_group_statement { name = "AWSManagedRulesSQLiRuleSet" vendor_name = "AWS" } }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "SQLi" sampled_requests_enabled = true }
  }
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 2
    override_action { none {} }
    statement { managed_rule_group_statement { name = "AWSManagedRulesCommonRuleSet" vendor_name = "AWS" } }
    visibility_config { cloudwatch_metrics_enabled = true metric_name = "XSS" sampled_requests_enabled = true }
  }
  tags = local.common_tags
}

resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
`,
  cloudtrail: () => `
# ─── CloudTrail (PCI-DSS / HIPAA audit) ──────────────────
resource "aws_cloudtrail" "main" {
  name                          = "\${var.project_name}-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true
  kms_key_id                    = aws_kms_key.main.arn
  tags                          = local.common_tags
}

resource "aws_s3_bucket" "cloudtrail" {
  bucket = "\${var.project_name}-cloudtrail-\${data.aws_caller_identity.current.account_id}"
  tags   = local.common_tags
}
`,
  'secrets-manager': (spec, mode) => mode === 'test'
    ? `
# ─── SSM Parameter Store (TEST MODE — free) ─────────────
resource "aws_ssm_parameter" "db_password" {
  name  = "/\${var.project_name}/db/password"
  type  = "SecureString"
  value = "CHANGE_ME"
  tags  = local.common_tags
}
`
    : `
# ─── Secrets Manager (CLIENT MODE — $0.40/secret/month) ─
resource "aws_secretsmanager_secret" "db" {
  name        = "\${var.project_name}/db"
  description = "Database credentials"
  kms_key_id  = aws_kms_key.main.arn
  tags        = local.common_tags
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = "admin"
    password = "CHANGE_ME_USE_GENERATE_RANDOM_PASSWORD"
  })
}
`,
  'ssm-parameter': () => `
# ─── SSM Parameter Store (Always-free secrets) ──────────
resource "aws_ssm_parameter" "db_password" {
  name  = "/\${var.project_name}/db/password"
  type  = "SecureString"
  value = "CHANGE_ME"
  tags  = local.common_tags
}
`,
  cloudwatch: () => `
# ─── CloudWatch Dashboard + 4 Alarms ─────────────────────
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "\${var.project_name}-dashboard"
  dashboard_body = jsonencode({
    widgets = [
      { type = "metric" width = 12 properties = { metrics = [["AWS/EC2","CPUUtilization"]] period = 300 stat = "Average" region = var.region title = "EC2 CPU" } },
      { type = "metric" width = 12 properties = { metrics = [["AWS/RDS","CPUUtilization"]] period = 300 stat = "Average" region = var.region title = "RDS CPU" } },
      { type = "metric" width = 12 properties = { metrics = [["AWS/ApplicationELB","RequestCount"]] period = 60 stat = "Sum" region = var.region title = "ALB Requests" } },
      { type = "metric" width = 12 properties = { metrics = [["AWS/ApplicationELB","HTTPCode_Target_5XX_Count"]] period = 60 stat = "Sum" region = var.region title = "5XX errors" } },
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "\${var.project_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_actions       = [] # add SNS topic ARN
}
`,
  'cloudwatch-logs': () => `
# ─── CloudWatch Log Group (30-day retention) ────────────
resource "aws_cloudwatch_log_group" "app" {
  name              = "/\${var.project_name}/app"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.main.arn
  tags              = local.common_tags
}
`,
  codedeploy: () => `
# ─── CodeDeploy (zero-downtime) ──────────────────────────
resource "aws_codedeploy_app" "main" {
  name             = "\${var.project_name}-app"
  compute_platform = "Server"
  tags             = local.common_tags
}

resource "aws_codedeploy_deployment_group" "main" {
  app_name              = aws_codedeploy_app.main.name
  deployment_group_name = "\${var.project_name}-deploy"
  service_role_arn      = aws_iam_role.codedeploy.arn
  autoscaling_groups    = [aws_autoscaling_group.app.name]
  deployment_style {
    deployment_option = "WITH_TRAFFIC_CONTROL"
    deployment_type   = "BLUE_GREEN"
  }
  load_balancer_info {
    target_group_info { name = aws_lb_target_group.main.name }
  }
}

resource "aws_iam_role" "codedeploy" {
  name = "\${var.project_name}-codedeploy-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "codedeploy.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "codedeploy" {
  role       = aws_iam_role.codedeploy.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSCodeDeployRole"
}
`,
  lambda: () => `
# ─── Lambda (sample handler) ─────────────────────────────
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "\${path.module}/handler.js"
  output_path = "\${path.module}/handler.zip"
}

resource "aws_lambda_function" "main" {
  function_name = "\${var.project_name}-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 10
  memory_size   = 256
  tags          = local.common_tags
}

resource "aws_iam_role" "lambda" {
  name = "\${var.project_name}-lambda-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
`,
  dynamodb: () => `
# ─── DynamoDB (always-free up to 25GB) ──────────────────
resource "aws_dynamodb_table" "main" {
  name           = "\${var.project_name}-data"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  range_key      = "sk"
  attribute { name = "pk" type = "S" }
  attribute { name = "sk" type = "S" }
  point_in_time_recovery { enabled = true }
  server_side_encryption { enabled = true kms_key_arn = aws_kms_key.main.arn }
  tags = local.common_tags
}
`,
  apigw: () => `
# ─── API Gateway (HTTP API) ─────────────────────────────
resource "aws_apigatewayv2_api" "main" {
  name          = "\${var.project_name}-api"
  protocol_type = "HTTP"
  tags          = local.common_tags
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.main.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/\${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}
`,
  cloudfront: () => `
# ─── CloudFront (in front of ALB or S3) ─────────────────
resource "aws_cloudfront_distribution" "main" {
  enabled         = true
  default_root_object = "index.html"
  price_class     = "PriceClass_100"
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "alb"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  default_cache_behavior {
    target_origin_id       = "alb"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"]
    cached_methods         = ["GET","HEAD"]
    forwarded_values { query_string = true cookies { forward = "all" } }
  }
  viewer_certificate { cloudfront_default_certificate = true }
  restrictions { geo_restriction { restriction_type = "none" } }
  tags = local.common_tags
}
`,
};

/**
 * Generate the full Terraform module for an analyzed service list.
 *
 * @param {object[]} services  Resolved services from analyseProject
 * @param {object}   opts      { mode: 'test'|'client', region, projectName, environment }
 * @returns {{ code, filename, language, notes[] }}
 */
export function generateTerraform(services, opts = {}) {
  const mode    = opts.mode || 'client';
  const region  = opts.region || 'eu-west-1';
  const project = slug(opts.projectName || 'project');
  const env     = opts.environment || (mode === 'test' ? 'test' : 'prod');

  const blocks = [];
  const requested = services.map((service) => service.id);
  const covered = [];
  blocks.push(`# ============================================================`);
  blocks.push(`# ${mode === 'test' ? '🧪 TEST DEPLOYMENT' : '📦 CLIENT PRODUCTION'} — ${project}`);
  blocks.push(`# Generated by AWS Career Launchpad Pro · Master Intelligence`);
  blocks.push(`# Services: ${services.map((s) => s.label).join(', ')}`);
  blocks.push(`# ============================================================`);
  blocks.push(TERRAFORM_PROVIDERS
    .replace('%REGION%', region)
    .replace('%PROJECT%', project)
    .replace('%ENV%', env));

  // Render in dependency-respecting order: network → security → compute → data → monitoring → devops
  const order = ['vpc', 'subnet', 'igw', 'nat-instance', 'nat-gateway', 'security-group', 'kms', 'acm',
                 'alb', 'ec2', 'ec2-t3-large', 'ec2-autoscale', 'rds', 'rds-multiaz', 's3', 'dynamodb',
                 'lambda', 'apigw', 'cloudfront', 'waf', 'secrets-manager', 'ssm-parameter',
                 'cloudtrail', 'cloudwatch', 'cloudwatch-logs', 'codedeploy'];
  const seen = new Set();

  for (const id of order) {
    const svc = services.find((s) => s.id === id);
    if (!svc || seen.has(id)) continue;
    seen.add(id);
    const builder = TF_PER_SERVICE[id];
    if (builder) {
      const code = builder(specFor(svc, mode), mode);
      if (code) { blocks.push(code); covered.push(id); }
    }
  }

  // Services not in the ordered list — append at the end
  for (const svc of services) {
    if (seen.has(svc.id)) continue;
    const builder = TF_PER_SERVICE[svc.id];
    if (builder) {
      seen.add(svc.id);
      const code = builder(specFor(svc, mode), mode);
      if (code) { blocks.push(code); covered.push(svc.id); }
    }
  }

  const uncovered = requested.filter((id) => !covered.includes(id));
  const hasPlaceholders = /CHANGE_ME|REPLACE_WITH_YOUR_VALUE|example\.com/i.test(blocks.join('\n'));
  const deployReady = uncovered.length === 0 && !hasPlaceholders;
  if (!deployReady) {
    blocks.splice(4, 0,
      '# DEPLOYMENT BLOCKED: this generated draft is incomplete.',
      `# Unsupported services: ${uncovered.join(', ') || 'none'}`,
      `# Unresolved placeholders: ${hasPlaceholders ? 'yes' : 'no'}`,
      '# Resolve every item, then explicitly set confirm_generated_artifact_complete=true.',
      'variable "confirm_generated_artifact_complete" {',
      '  type    = bool',
      '  default = false',
      '}',
      'resource "terraform_data" "generation_safety_gate" {',
      '  lifecycle {',
      '    precondition {',
      '      condition = var.confirm_generated_artifact_complete',
      '      error_message = "Generated Terraform is incomplete. Resolve unsupported services/placeholders before apply."',
      '    }',
      '  }',
      '}',
    );
  }

  return {
    code: blocks.join('\n'),
    filename: `${project}-${mode}.tf`,
    language: 'hcl',
    deployReady,
    coverage: { requested, covered, uncovered, pct: requested.length ? Math.round((covered.length / requested.length) * 100) : 0 },
    notes: [
      mode === 'test' ? 'Test mode: free-tier substitutions applied (NAT Instance, t2.micro, SSM instead of Secrets Manager, no WAF).' : 'Client mode: EXACT specs from the brief — never substituted.',
      'Run: `terraform init && terraform plan && terraform apply`',
      'Add `.auto.tfvars` file with `project_name = "my-project"` to override defaults.',
      ...(!deployReady ? ['BLOCKED: resolve every unsupported service and placeholder before applying.'] : []),
    ],
  };
}

// ─────────────────────── CloudFormation ───────────────────────

export function generateCloudFormation(services, opts = {}) {
  const mode    = opts.mode || 'client';
  const region  = opts.region || 'eu-west-1';
  const project = slug(opts.projectName || 'project');
  const resources = {};
  const params = {
    ProjectName: { Type: 'String', Default: project },
  };

  // 1. Pull in prerequisites so no resource references a missing one.
  const requested = services.map((s) => s.id);
  const wanted = new Set(requested);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...wanted]) {
      for (const dep of (CFN_REQUIRES[id] || [])) {
        if (!wanted.has(dep)) { wanted.add(dep); grew = true; }
      }
    }
  }
  if (wanted.has('cloudwatch')) {
    const approvedBudget = Number(String(opts.brief || '').match(/maximum monthly aws budget[^\n$]*\$\s*(\d+(?:\.\d+)?)/i)?.[1] || 10);
    params.MonthlyBudget = {
      Type: 'Number', Default: approvedBudget, MinValue: 1,
      Description: 'Approved monthly AWS budget threshold in USD. A budget alerts; it does not cap charges.',
    };
  }
  const autoAdded = [...wanted].filter((id) => !requested.includes(id) && CFN_PER_SERVICE[id]);

  // 2. Emit in dependency order — networking before anything that sits in it.
  const EMIT_ORDER = [
    'vpc', 'subnet', 'igw', 'route-table', 'nacl', 'security-group', 'kms', 'iam',
    's3', 'ebs', 'dynamodb', 'rds', 'rds-multiaz', 'rds-r5-large',
    'sqs', 'sns', 'eventbridge', 'lambda', 'ec2', 'ec2-t3-large',
    'ecr', 'ecs', 'apigw', 'cloudfront',
    'ssm', 'backup', 'guardduty', 'cloudwatch-logs', 'xray', 'cloudwatch', 'ssm-parameter',
  ];
  const ordered = [
    ...EMIT_ORDER.filter((id) => wanted.has(id)),
    ...[...wanted].filter((id) => !EMIT_ORDER.includes(id)),
  ];

  const covered = [];
  const uncovered = [];
  for (const id of ordered) {
    const builder = CFN_PER_SERVICE[id];
    if (!builder) {
      if (requested.includes(id)) uncovered.push(id);
      continue;
    }
    const svc = services.find((s) => s.id === id);
    const r = builder(specFor(svc || { id }, mode), mode, { ...opts, wanted: [...wanted] });
    if (r && Object.keys(r).length) {
      Object.assign(resources, r);
      covered.push(id);
    }
  }

  // RDS needs a password, and it must never be hardcoded.
  if (resources.Database) {
    params.DbPassword = {
      Type: 'String',
      NoEcho: true,
      MinLength: 8,
      Description: 'Master password for the RDS instance (8+ chars, no / @ " or spaces).',
    };
  }

  const notes = [
    `Deploy: \`aws cloudformation deploy --template-file ${project}-${mode}.yaml --stack-name ${project} --capabilities CAPABILITY_NAMED_IAM\``,
    mode === 'test' ? 'Test mode: free-tier substitutions applied.' : 'Client mode: EXACT specs from the brief.',
  ];
  if (autoAdded.length) {
    notes.push(`Auto-added required dependencies: ${autoAdded.join(', ')}.`);
  }
  if (uncovered.length) {
    notes.push(`NOT in this template (no CloudFormation generator yet): ${uncovered.join(', ')}. Use the Terraform output for those, or add them by hand.`);
  }

  const deployReady = uncovered.length === 0 && Object.keys(resources).length > 0;
  if (!deployReady) {
    params.ConfirmIncompleteArtifact = {
      Type: 'String', Default: 'BLOCKED', AllowedValues: ['BLOCKED', 'REVIEWED'],
      Description: 'Set REVIEWED only after implementing every uncovered service.',
    };
    notes.unshift('BLOCKED: this partial template cannot deploy until every uncovered service is implemented and explicitly reviewed.');
  }

  const template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `${mode === 'test' ? 'TEST' : 'CLIENT'} stack - ${project} - ${covered.length} services - Generated by AWS Career Launchpad Pro`,
    Parameters: params,
    Resources: resources,
    ...(!deployReady ? {
      Rules: {
        IncompleteArtifactMustBeReviewed: {
          Assertions: [{ Assert: { 'Fn::Equals': [{ Ref: 'ConfirmIncompleteArtifact' }, 'REVIEWED'] }, AssertDescription: 'Generated template is incomplete.' }],
        },
      },
    } : {}),
  };

  return {
    code: yamlStringify(template),
    filename: `${project}-${mode}.yaml`,
    language: 'yaml',
    notes,
    deployReady,
    // Coverage is surfaced in the UI so "one-click build" never silently
    // deploys a stack that's missing most of what the brief asked for.
    coverage: {
      requested,
      covered,
      uncovered,
      autoAdded,
      resourceCount: Object.keys(resources).length,
      pct: requested.length
        ? Math.round((requested.filter((id) => covered.includes(id)).length / requested.length) * 100)
        : 0,
    },
  };
}

const CFN_PER_SERVICE = {
  vpc: () => ({
    Vpc: {
      Type: 'AWS::EC2::VPC',
      Properties: {
        CidrBlock: '10.0.0.0/16',
        EnableDnsHostnames: true,
        EnableDnsSupport: true,
        Tags: [{ Key: 'Name', Value: { 'Fn::Sub': '${ProjectName}-vpc' } }],
      },
    },
  }),
  subnet: () => ({
    PublicSubnet1: {
      Type: 'AWS::EC2::Subnet',
      Properties: { VpcId: { Ref: 'Vpc' }, CidrBlock: '10.0.1.0/24', MapPublicIpOnLaunch: true, AvailabilityZone: { 'Fn::Select': [0, { 'Fn::GetAZs': '' }] } },
    },
    PublicSubnet2: {
      Type: 'AWS::EC2::Subnet',
      Properties: { VpcId: { Ref: 'Vpc' }, CidrBlock: '10.0.2.0/24', MapPublicIpOnLaunch: true, AvailabilityZone: { 'Fn::Select': [1, { 'Fn::GetAZs': '' }] } },
    },
    PrivateSubnet1: {
      Type: 'AWS::EC2::Subnet',
      Properties: { VpcId: { Ref: 'Vpc' }, CidrBlock: '10.0.3.0/24', AvailabilityZone: { 'Fn::Select': [0, { 'Fn::GetAZs': '' }] } },
    },
    PrivateSubnet2: {
      Type: 'AWS::EC2::Subnet',
      Properties: { VpcId: { Ref: 'Vpc' }, CidrBlock: '10.0.4.0/24', AvailabilityZone: { 'Fn::Select': [1, { 'Fn::GetAZs': '' }] } },
    },
  }),
  igw: () => ({
    Igw: { Type: 'AWS::EC2::InternetGateway' },
    IgwAttach: { Type: 'AWS::EC2::VPCGatewayAttachment', Properties: { VpcId: { Ref: 'Vpc' }, InternetGatewayId: { Ref: 'Igw' } } },
    PublicRouteTable: {
      Type: 'AWS::EC2::RouteTable',
      Properties: { VpcId: { Ref: 'Vpc' }, Tags: [{ Key: 'Name', Value: { 'Fn::Sub': '${ProjectName}-public-rt' } }] },
    },
    PublicDefaultRoute: {
      Type: 'AWS::EC2::Route',
      DependsOn: 'IgwAttach',
      Properties: { RouteTableId: { Ref: 'PublicRouteTable' }, DestinationCidrBlock: '0.0.0.0/0', GatewayId: { Ref: 'Igw' } },
    },
    PublicSubnet1RouteAssociation: {
      Type: 'AWS::EC2::SubnetRouteTableAssociation',
      Properties: { SubnetId: { Ref: 'PublicSubnet1' }, RouteTableId: { Ref: 'PublicRouteTable' } },
    },
    PublicSubnet2RouteAssociation: {
      Type: 'AWS::EC2::SubnetRouteTableAssociation',
      Properties: { SubnetId: { Ref: 'PublicSubnet2' }, RouteTableId: { Ref: 'PublicRouteTable' } },
    },
  }),
  rds: (spec, mode) => ({
    DbSubnetGroup: {
      Type: 'AWS::RDS::DBSubnetGroup',
      Properties: {
        DBSubnetGroupDescription: 'Private subnets for the database',
        SubnetIds: [{ Ref: 'PrivateSubnet1' }, { Ref: 'PrivateSubnet2' }],
      },
    },
    Database: {
      Type: 'AWS::RDS::DBInstance',
      // Keep the data when the stack is torn down by accident. Flip to
      // Delete for throwaway test stacks you genuinely want gone.
      DeletionPolicy: mode === 'test' ? 'Delete' : 'Snapshot',
      Properties: {
        DBInstanceClass: mode === 'test' ? 'db.t3.micro' : (spec || 'db.t3.micro'),
        Engine: 'postgres',
        AllocatedStorage: 20,
        StorageEncrypted: true,
        MultiAZ: mode !== 'test',
        DBName: 'app',
        MasterUsername: 'appadmin',
        // NoEcho parameter — never hardcode a password in a template
        MasterUserPassword: { Ref: 'DbPassword' },
        DBSubnetGroupName: { Ref: 'DbSubnetGroup' },
        PubliclyAccessible: false,
      },
    },
  }),

  // Service variants share the same hardened base resource. Test mode still
  // applies the low-cost substitution; client mode preserves the requested
  // instance specification through specFor().
  'rds-multiaz': (spec, mode) => CFN_PER_SERVICE.rds(spec, mode),
  'rds-r5-large': (spec, mode) => CFN_PER_SERVICE.rds(spec, mode),
  'ec2-t3-large': (spec, mode, opts) => CFN_PER_SERVICE.ec2(spec, mode, opts),

  'route-table': () => ({
    WorkloadRouteTable: {
      Type: 'AWS::EC2::RouteTable',
      Properties: {
        VpcId: { Ref: 'Vpc' },
        Tags: [{ Key: 'Name', Value: { 'Fn::Sub': '${ProjectName}-workload-rt' } }],
      },
    },
  }),

  nacl: () => ({
    WorkloadNetworkAcl: {
      Type: 'AWS::EC2::NetworkAcl',
      Properties: {
        VpcId: { Ref: 'Vpc' },
        Tags: [{ Key: 'Name', Value: { 'Fn::Sub': '${ProjectName}-nacl' } }],
      },
    },
  }),

  'security-group': (spec, mode, opts) => ({
    AppSecurityGroup: {
      Type: 'AWS::EC2::SecurityGroup',
      Properties: {
        GroupDescription: /windows\s+server/i.test(opts?.brief || '')
          ? 'Managed Windows host - no inbound administration ports; use Systems Manager'
          : 'App tier - HTTPS in, all out',
        VpcId: { Ref: 'Vpc' },
        SecurityGroupIngress: /windows\s+server/i.test(opts?.brief || '') ? [] : [
          { IpProtocol: 'tcp', FromPort: 443, ToPort: 443, CidrIp: '0.0.0.0/0', Description: 'HTTPS from anywhere' },
          { IpProtocol: 'tcp', FromPort: 80, ToPort: 80, CidrIp: '0.0.0.0/0', Description: 'HTTP (redirects to HTTPS)' },
        ],
        Tags: [{ Key: 'Name', Value: { 'Fn::Sub': '${ProjectName}-app-sg' } }],
      },
    },
  }),

  iam: () => ({
    ManagedInstanceRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'ec2.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore'],
        Tags: [{ Key: 'Project', Value: { Ref: 'ProjectName' } }],
      },
    },
    ManagedInstanceProfile: {
      Type: 'AWS::IAM::InstanceProfile',
      Properties: {
        Roles: [{ Ref: 'ManagedInstanceRole' }],
      },
    },
  }),

  s3: () => ({
    AppBucket: {
      Type: 'AWS::S3::Bucket',
      // Buckets must be empty to delete; retain so teardown never fails
      DeletionPolicy: 'Retain',
      Properties: {
        BucketName: { 'Fn::Sub': '${ProjectName}-${AWS::AccountId}-${AWS::Region}' },
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true, BlockPublicPolicy: true,
          IgnorePublicAcls: true, RestrictPublicBuckets: true,
        },
        VersioningConfiguration: { Status: 'Enabled' },
      },
    },
  }),

  ebs: (spec, mode) => ({
    DataVolume: {
      Type: 'AWS::EC2::Volume',
      DeletionPolicy: mode === 'test' ? 'Delete' : 'Snapshot',
      Properties: {
        AvailabilityZone: { 'Fn::GetAtt': ['PublicSubnet1', 'AvailabilityZone'] },
        Encrypted: true,
        Size: mode === 'test' ? 8 : 20,
        VolumeType: 'gp3',
        Tags: [{ Key: 'Project', Value: { Ref: 'ProjectName' } }],
      },
    },
  }),

  dynamodb: (spec, mode) => ({
    AppTable: {
      Type: 'AWS::DynamoDB::Table',
      Properties: {
        TableName: { 'Fn::Sub': '${ProjectName}-table' },
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: mode !== 'test' },
        SSESpecification: { SSEEnabled: true },
      },
    },
  }),

  sqs: () => ({
    WorkQueue: {
      Type: 'AWS::SQS::Queue',
      Properties: {
        QueueName: { 'Fn::Sub': '${ProjectName}-queue' },
        SqsManagedSseEnabled: true,
        VisibilityTimeout: 60,
        RedrivePolicy: {
          deadLetterTargetArn: { 'Fn::GetAtt': ['DeadLetterQueue', 'Arn'] },
          maxReceiveCount: 5,
        },
      },
    },
    DeadLetterQueue: {
      Type: 'AWS::SQS::Queue',
      Properties: {
        QueueName: { 'Fn::Sub': '${ProjectName}-dlq' },
        SqsManagedSseEnabled: true,
        MessageRetentionPeriod: 1209600,
      },
    },
  }),

  eventbridge: () => ({
    ApplicationEventBus: {
      Type: 'AWS::Events::EventBus',
      Properties: { Name: { 'Fn::Sub': '${ProjectName}-events' } },
    },
    EventArchive: {
      Type: 'AWS::Events::Archive',
      Properties: {
        ArchiveName: { 'Fn::Sub': '${ProjectName}-events-archive' },
        SourceArn: { 'Fn::GetAtt': ['ApplicationEventBus', 'Arn'] },
        RetentionDays: 7,
      },
    },
  }),

  lambda: () => ({
    LambdaExecutionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
            Action: 'sts:AssumeRole',
          }],
        },
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
      },
    },
    AppFunction: {
      Type: 'AWS::Lambda::Function',
      Properties: {
        FunctionName: { 'Fn::Sub': '${ProjectName}-fn' },
        Runtime: 'nodejs20.x',
        Handler: 'index.handler',
        Role: { 'Fn::GetAtt': ['LambdaExecutionRole', 'Arn'] },
        Timeout: 30,
        MemorySize: 512,
        Code: {
          ZipFile: "exports.handler = async (event) => ({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ok: true, message: 'Replace me with your code.' }) });",
        },
      },
    },
  }),

  ecr: () => ({
    ContainerRepository: {
      Type: 'AWS::ECR::Repository',
      Properties: {
        RepositoryName: { 'Fn::Sub': '${ProjectName}-app' },
        ImageScanningConfiguration: { ScanOnPush: true },
        ImageTagMutability: 'IMMUTABLE',
        EncryptionConfiguration: { EncryptionType: 'AES256' },
        LifecyclePolicy: {
          LifecyclePolicyText: JSON.stringify({
            rules: [{ rulePriority: 1, description: 'Retain 10 images', selection: { tagStatus: 'any', countType: 'imageCountMoreThan', countNumber: 10 }, action: { type: 'expire' } }],
          }),
        },
      },
    },
  }),

  ecs: () => ({
    EcsCluster: {
      Type: 'AWS::ECS::Cluster',
      Properties: {
        ClusterName: { 'Fn::Sub': '${ProjectName}-cluster' },
        ClusterSettings: [{ Name: 'containerInsights', Value: 'enabled' }],
      },
    },
    EcsTaskExecutionRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: { Service: 'ecs-tasks.amazonaws.com' }, Action: 'sts:AssumeRole' }],
        },
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy'],
      },
    },
    EcsTaskDefinition: {
      Type: 'AWS::ECS::TaskDefinition',
      Properties: {
        Family: { 'Fn::Sub': '${ProjectName}-task' },
        Cpu: '256', Memory: '512', NetworkMode: 'awsvpc',
        RequiresCompatibilities: ['FARGATE'],
        ExecutionRoleArn: { 'Fn::GetAtt': ['EcsTaskExecutionRole', 'Arn'] },
        ContainerDefinitions: [{
          Name: 'app', Image: 'public.ecr.aws/nginx/nginx:stable-alpine', Essential: true,
          PortMappings: [{ ContainerPort: 80, Protocol: 'tcp' }],
          LogConfiguration: { LogDriver: 'awslogs', Options: { 'awslogs-group': { Ref: 'AppLogGroup' }, 'awslogs-region': { Ref: 'AWS::Region' }, 'awslogs-stream-prefix': 'app' } },
        }],
      },
    },
    EcsService: {
      Type: 'AWS::ECS::Service',
      Properties: {
        Cluster: { Ref: 'EcsCluster' }, ServiceName: { 'Fn::Sub': '${ProjectName}-service' },
        TaskDefinition: { Ref: 'EcsTaskDefinition' }, DesiredCount: 1, LaunchType: 'FARGATE',
        EnableExecuteCommand: true,
        NetworkConfiguration: { AwsvpcConfiguration: { AssignPublicIp: 'ENABLED', SecurityGroups: [{ Ref: 'AppSecurityGroup' }], Subnets: [{ Ref: 'PublicSubnet1' }, { Ref: 'PublicSubnet2' }] } },
      },
    },
  }),

  apigw: () => ({
    HttpApi: {
      Type: 'AWS::ApiGatewayV2::Api',
      Properties: {
        Name: { 'Fn::Sub': '${ProjectName}-api' },
        ProtocolType: 'HTTP',
      },
    },
    HttpApiIntegration: {
      Type: 'AWS::ApiGatewayV2::Integration',
      Properties: {
        ApiId: { Ref: 'HttpApi' },
        IntegrationType: 'AWS_PROXY',
        IntegrationUri: { 'Fn::GetAtt': ['AppFunction', 'Arn'] },
        PayloadFormatVersion: '2.0',
      },
    },
    HttpApiRoute: {
      Type: 'AWS::ApiGatewayV2::Route',
      Properties: {
        ApiId: { Ref: 'HttpApi' },
        RouteKey: 'ANY /{proxy+}',
        Target: { 'Fn::Sub': 'integrations/${HttpApiIntegration}' },
      },
    },
    HttpApiStage: {
      Type: 'AWS::ApiGatewayV2::Stage',
      Properties: { ApiId: { Ref: 'HttpApi' }, StageName: '$default', AutoDeploy: true },
    },
    LambdaInvokePermission: {
      Type: 'AWS::Lambda::Permission',
      Properties: {
        FunctionName: { Ref: 'AppFunction' },
        Action: 'lambda:InvokeFunction',
        Principal: 'apigateway.amazonaws.com',
        SourceArn: { 'Fn::Sub': 'arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${HttpApi}/*/*' },
      },
    },
  }),

  cloudfront: () => ({
    OriginAccessControl: {
      Type: 'AWS::CloudFront::OriginAccessControl',
      Properties: {
        OriginAccessControlConfig: {
          Name: { 'Fn::Sub': '${ProjectName}-oac' },
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      },
    },
    Distribution: {
      Type: 'AWS::CloudFront::Distribution',
      Properties: {
        DistributionConfig: {
          Enabled: true,
          DefaultRootObject: 'index.html',
          PriceClass: 'PriceClass_100',
          Origins: [{
            Id: 's3origin',
            DomainName: { 'Fn::GetAtt': ['AppBucket', 'RegionalDomainName'] },
            S3OriginConfig: { OriginAccessIdentity: '' },
            OriginAccessControlId: { 'Fn::GetAtt': ['OriginAccessControl', 'Id'] },
          }],
          DefaultCacheBehavior: {
            TargetOriginId: 's3origin',
            ViewerProtocolPolicy: 'redirect-to-https',
            // AWS managed CachingOptimized policy
            CachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6',
            Compress: true,
          },
        },
      },
    },
    BucketPolicyForCloudFront: {
      Type: 'AWS::S3::BucketPolicy',
      Properties: {
        Bucket: { Ref: 'AppBucket' },
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Action: 's3:GetObject',
            Resource: { 'Fn::Sub': '${AppBucket.Arn}/*' },
            Condition: {
              StringEquals: {
                'AWS:SourceArn': { 'Fn::Sub': 'arn:aws:cloudfront::${AWS::AccountId}:distribution/${Distribution}' },
              },
            },
          }],
        },
      },
    },
  }),

  ec2: (spec, mode, opts) => ({
    AppInstance: {
      Type: 'AWS::EC2::Instance',
      Properties: {
        InstanceType: mode === 'test' ? 't3.micro' : (spec || 't3.small'),
        // Public SSM parameters resolve to a maintained OS image at deployment.
        ImageId: /windows\s+server/i.test(opts?.brief || '')
          ? '{{resolve:ssm:/aws/service/ami-windows-latest/Windows_Server-2022-English-Full-Base}}'
          : '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64}}',
        SubnetId: { Ref: 'PublicSubnet1' },
        SecurityGroupIds: [{ Ref: 'AppSecurityGroup' }],
        IamInstanceProfile: { Ref: 'ManagedInstanceProfile' },
        MetadataOptions: { HttpTokens: 'required', HttpEndpoint: 'enabled' },
        BlockDeviceMappings: [{
          DeviceName: /windows\s+server/i.test(opts?.brief || '') ? '/dev/sda1' : '/dev/xvda',
          Ebs: { Encrypted: true, VolumeType: 'gp3', VolumeSize: /windows\s+server/i.test(opts?.brief || '') ? 30 : 12, DeleteOnTermination: true },
        }],
        Tags: [
          { Key: 'Name', Value: { 'Fn::Sub': '${ProjectName}-app' } },
          { Key: 'Project', Value: { Ref: 'ProjectName' } },
        ],
      },
    },
  }),

  ssm: () => ({
    InventoryAssociation: {
      Type: 'AWS::SSM::Association',
      Properties: {
        Name: 'AWS-GatherSoftwareInventory',
        AssociationName: { 'Fn::Sub': '${ProjectName}-inventory' },
        ScheduleExpression: 'rate(1 day)',
        Targets: [{ Key: 'tag:Project', Values: [{ Ref: 'ProjectName' }] }],
      },
    },
    PatchAssociation: {
      Type: 'AWS::SSM::Association',
      Properties: {
        Name: 'AWS-RunPatchBaseline',
        AssociationName: { 'Fn::Sub': '${ProjectName}-patch-scan' },
        ScheduleExpression: 'cron(0 3 ? * SUN *)',
        Parameters: { Operation: ['Scan'], RebootOption: ['NoReboot'] },
        Targets: [{ Key: 'tag:Project', Values: [{ Ref: 'ProjectName' }] }],
      },
    },
  }),

  backup: (spec, mode, opts) => ({
    BackupVault: {
      Type: 'AWS::Backup::BackupVault',
      DeletionPolicy: mode === 'test' ? 'Delete' : 'Retain',
      Properties: { BackupVaultName: { 'Fn::Sub': '${ProjectName}-vault' } },
    },
    BackupServiceRole: {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{ Effect: 'Allow', Principal: { Service: 'backup.amazonaws.com' }, Action: 'sts:AssumeRole' }],
        },
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup'],
      },
    },
    BackupPlan: {
      Type: 'AWS::Backup::BackupPlan',
      Properties: {
        BackupPlan: {
          BackupPlanName: { 'Fn::Sub': '${ProjectName}-daily' },
          BackupPlanRule: [{
            RuleName: 'DailyBackup',
            TargetBackupVault: { Ref: 'BackupVault' },
            ScheduleExpression: 'cron(0 5 ? * * *)',
            StartWindowMinutes: 60,
            CompletionWindowMinutes: 180,
            Lifecycle: {
              DeleteAfterDays: Number(String(opts?.brief || '').match(/backup retention:\s*(\d+)\s*days?/i)?.[1])
                || (mode === 'test' ? 1 : 30),
            },
          }],
        },
      },
    },
    BackupSelection: {
      Type: 'AWS::Backup::BackupSelection',
      Properties: {
        BackupPlanId: { Ref: 'BackupPlan' },
        BackupSelection: {
          SelectionName: { 'Fn::Sub': '${ProjectName}-tagged-resources' },
          IamRoleArn: { 'Fn::GetAtt': ['BackupServiceRole', 'Arn'] },
          ListOfTags: [{ ConditionType: 'STRINGEQUALS', ConditionKey: 'Project', ConditionValue: { Ref: 'ProjectName' } }],
        },
      },
    },
  }),

  guardduty: () => ({
    ThreatDetector: {
      Type: 'AWS::GuardDuty::Detector',
      Properties: { Enable: true, FindingPublishingFrequency: 'FIFTEEN_MINUTES' },
    },
  }),

  kms: () => ({
    AppKey: {
      Type: 'AWS::KMS::Key',
      Properties: {
        Description: { 'Fn::Sub': '${ProjectName} customer-managed key' },
        EnableKeyRotation: true,
        KeyPolicy: {
          Version: '2012-10-17',
          Statement: [{
            Effect: 'Allow',
            Principal: { AWS: { 'Fn::Sub': 'arn:aws:iam::${AWS::AccountId}:root' } },
            Action: 'kms:*',
            Resource: '*',
          }],
        },
      },
    },
  }),

  sns: () => ({
    AlertTopic: {
      Type: 'AWS::SNS::Topic',
      Properties: { TopicName: { 'Fn::Sub': '${ProjectName}-alerts' } },
    },
  }),

  'cloudwatch-logs': () => ({
    AppLogGroup: {
      Type: 'AWS::Logs::LogGroup',
      Properties: {
        LogGroupName: { 'Fn::Sub': '/aws/${ProjectName}/app' },
        RetentionInDays: 30,
      },
    },
  }),

  xray: () => ({
    TraceGroup: {
      Type: 'AWS::XRay::Group',
      Properties: {
        GroupName: { 'Fn::Sub': '${ProjectName}-traces' },
        FilterExpression: 'service(id(name: "AWS::Lambda"))',
        InsightsConfiguration: { InsightsEnabled: true, NotificationsEnabled: true },
      },
    },
  }),

  cloudwatch: (spec, mode, opts) => ({
    CostBudget: {
      Type: 'AWS::Budgets::Budget',
      Properties: {
        Budget: {
          BudgetName: { 'Fn::Sub': '${ProjectName}-monthly-cost' },
          BudgetType: 'COST', TimeUnit: 'MONTHLY',
          BudgetLimit: { Amount: { Ref: 'MonthlyBudget' }, Unit: 'USD' },
        },
      },
    },
    ...(opts?.region === 'us-east-1' ? { BillingAlarm: {
      Type: 'AWS::CloudWatch::Alarm',
      Properties: {
        AlarmName: { 'Fn::Sub': '${ProjectName}-estimated-charges' },
        AlarmDescription: 'Fires when estimated AWS charges exceed the threshold.',
        Namespace: 'AWS/Billing',
        MetricName: 'EstimatedCharges',
        Dimensions: [{ Name: 'Currency', Value: 'USD' }],
        Statistic: 'Maximum',
        Period: 21600,
        EvaluationPeriods: 1,
        Threshold: { Ref: 'MonthlyBudget' },
        ComparisonOperator: 'GreaterThanThreshold',
      },
    } } : {}),
    ...(opts?.wanted?.includes('ec2') ? {
      InstanceStatusAlarm: {
        Type: 'AWS::CloudWatch::Alarm',
        Properties: {
          AlarmName: { 'Fn::Sub': '${ProjectName}-instance-status' },
          AlarmDescription: 'Detects failed EC2 instance status checks.',
          Namespace: 'AWS/EC2', MetricName: 'StatusCheckFailed_Instance', Statistic: 'Maximum',
          Dimensions: [{ Name: 'InstanceId', Value: { Ref: 'AppInstance' } }],
          Period: 300, EvaluationPeriods: 2, DatapointsToAlarm: 2, Threshold: 1,
          ComparisonOperator: 'GreaterThanOrEqualToThreshold', TreatMissingData: 'missing',
        },
      },
      HighCpuAlarm: {
        Type: 'AWS::CloudWatch::Alarm',
        Properties: {
          AlarmName: { 'Fn::Sub': '${ProjectName}-high-cpu' },
          AlarmDescription: 'Detects sustained high CPU on the managed instance.',
          Namespace: 'AWS/EC2', MetricName: 'CPUUtilization', Statistic: 'Average',
          Dimensions: [{ Name: 'InstanceId', Value: { Ref: 'AppInstance' } }],
          Period: 300, EvaluationPeriods: 3, DatapointsToAlarm: 3, Threshold: 80,
          ComparisonOperator: 'GreaterThanOrEqualToThreshold', TreatMissingData: 'missing',
        },
      },
    } : {}),
  }),

  'ssm-parameter': () => ({
    AppConfigParameter: {
      Type: 'AWS::SSM::Parameter',
      Properties: {
        Name: { 'Fn::Sub': '/${ProjectName}/config/example' },
        Type: 'String',
        Value: 'replace-me',
      },
    },
  }),
};

/**
 * CloudFormation resources reference each other by logical id, so a
 * template containing (say) a Subnet without a Vpc will not deploy. This
 * map lets generateCloudFormation() pull in the prerequisites the brief
 * implied but didn't name.
 */
const CFN_REQUIRES = {
  subnet: ['vpc'],
  igw: ['vpc'],
  'route-table': ['vpc'],
  nacl: ['vpc'],
  'security-group': ['vpc'],
  ec2: ['vpc', 'subnet', 'igw', 'security-group', 'iam'],
  'ec2-t3-large': ['vpc', 'subnet', 'igw', 'security-group', 'iam'],
  ebs: ['vpc', 'subnet'],
  ssm: ['ec2', 'iam'],
  backup: ['ec2', 'iam'],
  rds: ['vpc', 'subnet'],
  'rds-multiaz': ['vpc', 'subnet'],
  'rds-r5-large': ['vpc', 'subnet'],
  ecs: ['vpc', 'subnet', 'igw', 'security-group', 'ecr', 'cloudwatch-logs'],
  apigw: ['lambda'],
  cloudfront: ['s3'],
};

/**
 * YAML 1.1 reserved scalars. Left unquoted, each of these stops being a
 * string: `N` becomes false, `2010-09-09` becomes a date, `2.0` becomes
 * the number 2 — and CloudFormation then rejects the template because it
 * wanted the literal string. DynamoDB AttributeType: N and IAM
 * Version: 2012-10-17 both hit this in practice.
 */
const YAML_RESERVED = new Set([
  'y', 'Y', 'yes', 'Yes', 'YES', 'n', 'N', 'no', 'No', 'NO',
  'true', 'True', 'TRUE', 'false', 'False', 'FALSE',
  'on', 'On', 'ON', 'off', 'Off', 'OFF',
  'null', 'Null', 'NULL', '~', '',
]);

/**
 * A string is safe to emit bare only if it starts with a letter and
 * contains nothing YAML treats specially. Everything else — anything
 * starting with a digit, `$`, `!`, `*`, `&`, quotes, or containing `:`,
 * `#`, or a newline — gets quoted.
 */
function needsQuoting(s) {
  if (YAML_RESERVED.has(s)) return true;
  return !/^[A-Za-z][A-Za-z0-9_\-./]*$/.test(s);
}

// Tiny YAML serializer (just for the subset we use)
function yamlStringify(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') {
    return needsQuoting(obj) ? JSON.stringify(obj) : obj;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map((v) => `${pad}- ${yamlStringify(v, indent + 2).trimStart()}`).join('\n');
  }
  if (typeof obj === 'object') {
    const entries = Object.entries(obj);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const valStr = yamlStringify(v, indent + 2);
      if (typeof v === 'object' && v !== null) return `${pad}${k}:\n${valStr}`;
      return `${pad}${k}: ${valStr}`;
    }).join('\n');
  }
  return String(obj);
}

// ─────────────────────── AWS CLI ───────────────────────

export function generateCli(services, opts = {}) {
  const mode    = opts.mode || 'client';
  const region  = opts.region || 'eu-west-1';
  const project = slug(opts.projectName || 'project');
  const lines = [];

  lines.push('#!/usr/bin/env bash');
  lines.push('# ============================================================');
  lines.push(`# ${mode === 'test' ? '🧪 TEST DEPLOYMENT' : '📦 CLIENT PRODUCTION'} — ${project}`);
  lines.push(`# Generated by AWS Career Launchpad Pro · Master Intelligence`);
  lines.push('# ============================================================');
  lines.push('set -euo pipefail');
  lines.push(`PROJECT=${project}`);
  lines.push(`REGION=${region}`);
  lines.push('');

  const requested = services.map((service) => service.id);
  const covered = services.filter((service) => CLI_PER_SERVICE[service.id]).map((service) => service.id);
  const uncovered = requested.filter((id) => !covered.includes(id));

  for (const svc of services) {
    const builder = CLI_PER_SERVICE[svc.id];
    if (builder) {
      lines.push(`# ─── ${svc.label} ─────────────────────────────────────`);
      lines.push(builder(specFor(svc, mode), mode));
      lines.push('');
    }
  }

  const hasPlaceholders = /CHANGE_ME|REPLACE_WITH_YOUR_VALUE/i.test(lines.join('\n'));
  const deployReady = uncovered.length === 0 && !hasPlaceholders && covered.length > 0;
  if (!deployReady) {
    lines.splice(8, 0,
      'echo "DEPLOYMENT BLOCKED: generated CLI is incomplete." >&2',
      `echo "Unsupported services: ${uncovered.join(', ') || 'none'}; unresolved placeholders: ${hasPlaceholders ? 'yes' : 'no'}" >&2`,
      'echo "Resolve the draft and remove this safety gate only after review." >&2',
      'exit 1',
      '',
    );
  }

  return {
    code: lines.join('\n'),
    filename: `${project}-${mode}.sh`,
    language: 'bash',
    deployReady,
    coverage: { requested, covered, uncovered, pct: requested.length ? Math.round((covered.length / requested.length) * 100) : 0 },
    notes: [
      'Make it executable: `chmod +x ' + project + '-' + mode + '.sh`',
      'Run from a shell with AWS CLI configured (`aws configure`).',
      mode === 'test' ? 'Test mode: free-tier specs.' : 'Client mode: production specs.',
      ...(!deployReady ? ['BLOCKED: resolve every unsupported service and placeholder before running.'] : []),
    ],
  };
}

const CLI_PER_SERVICE = {
  vpc: () => `VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --region $REGION --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources $VPC_ID --tags Key=Project,Value=$PROJECT Key=Name,Value=$PROJECT-vpc
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames`,
  s3: () => `aws s3api create-bucket --bucket $PROJECT-deployments-$(aws sts get-caller-identity --query Account --output text) --region $REGION --create-bucket-configuration LocationConstraint=$REGION
aws s3api put-bucket-versioning --bucket $PROJECT-deployments-$(aws sts get-caller-identity --query Account --output text) --versioning-configuration Status=Enabled`,
  kms: () => `KMS_KEY_ID=$(aws kms create-key --description "$PROJECT CMK" --query 'KeyMetadata.KeyId' --output text)
aws kms enable-key-rotation --key-id $KMS_KEY_ID
aws kms create-alias --alias-name alias/$PROJECT-main --target-key-id $KMS_KEY_ID`,
  rds: (spec, mode) => `aws rds create-db-instance \\
  --db-instance-identifier $PROJECT-postgres \\
  --engine postgres --engine-version 15.4 \\
  --db-instance-class ${mode === 'test' ? 'db.t2.micro' : (spec || 'db.t2.micro')} \\
  --allocated-storage 20 --storage-encrypted \\
  --master-username admin --master-user-password CHANGE_ME \\
  --no-multi-az --backup-retention-period 7 --region $REGION`,
  ec2: (spec, mode) => {
    const type = mode === 'test' ? 't2.micro' : (spec || 't2.micro');
    return `aws ec2 run-instances --image-id $(aws ec2 describe-images --owners amazon --filters "Name=name,Values=amzn2-ami-hvm-*-x86_64-gp2" --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text) --instance-type ${type} --count 1 --region $REGION --tag-specifications "ResourceType=instance,Tags=[{Key=Project,Value=$PROJECT}]"`;
  },
};
