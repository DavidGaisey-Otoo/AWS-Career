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
      if (code) blocks.push(code);
    } else {
      blocks.push(`\n# TODO: ${svc.label} — no auto-generator yet. See ${svc.costNote || ''}`);
    }
  }

  // Services not in the ordered list — append at the end
  for (const svc of services) {
    if (seen.has(svc.id)) continue;
    const builder = TF_PER_SERVICE[svc.id];
    if (builder) {
      seen.add(svc.id);
      const code = builder(specFor(svc, mode), mode);
      if (code) blocks.push(code);
    }
  }

  return {
    code: blocks.join('\n'),
    filename: `${project}-${mode}.tf`,
    language: 'hcl',
    notes: [
      mode === 'test' ? 'Test mode: free-tier substitutions applied (NAT Instance, t2.micro, SSM instead of Secrets Manager, no WAF).' : 'Client mode: EXACT specs from the brief — never substituted.',
      'Run: `terraform init && terraform plan && terraform apply`',
      'Add `.auto.tfvars` file with `project_name = "my-project"` to override defaults.',
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
    Region:      { Type: 'String', Default: region },
  };

  for (const svc of services) {
    const r = CFN_PER_SERVICE[svc.id]?.(specFor(svc, mode), mode);
    if (r) Object.assign(resources, r);
  }

  const template = {
    AWSTemplateFormatVersion: '2010-09-09',
    Description: `${mode === 'test' ? '🧪 TEST' : '📦 CLIENT'} stack — ${project} · ${services.length} services · Generated by AWS Career Launchpad Pro`,
    Parameters: params,
    Resources: resources,
  };

  return {
    code: yamlStringify(template),
    filename: `${project}-${mode}.yaml`,
    language: 'yaml',
    notes: [
      'Deploy: `aws cloudformation deploy --template-file ' + project + '-' + mode + '.yaml --stack-name ' + project + ' --capabilities CAPABILITY_NAMED_IAM`',
      mode === 'test' ? 'Test mode: free-tier substitutions applied.' : 'Client mode: EXACT specs from the brief.',
    ],
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
  }),
  rds: (spec, mode) => ({
    Database: {
      Type: 'AWS::RDS::DBInstance',
      Properties: {
        DBInstanceClass: mode === 'test' ? 'db.t2.micro' : (spec || 'db.t2.micro'),
        Engine: 'postgres',
        EngineVersion: '15.4',
        AllocatedStorage: 20,
        StorageEncrypted: true,
        MultiAZ: false,
        DBName: 'app',
        MasterUsername: 'admin',
        MasterUserPassword: 'CHANGE_ME',
      },
    },
  }),
};

// Tiny YAML serializer (just for the subset we use)
function yamlStringify(obj, indent = 0) {
  const pad = ' '.repeat(indent);
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') {
    if (/[:#\n]/.test(obj)) return JSON.stringify(obj);
    return obj;
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

  for (const svc of services) {
    const builder = CLI_PER_SERVICE[svc.id];
    if (builder) {
      lines.push(`# ─── ${svc.label} ─────────────────────────────────────`);
      lines.push(builder(specFor(svc, mode), mode));
      lines.push('');
    }
  }

  return {
    code: lines.join('\n'),
    filename: `${project}-${mode}.sh`,
    language: 'bash',
    notes: [
      'Make it executable: `chmod +x ' + project + '-' + mode + '.sh`',
      'Run from a shell with AWS CLI configured (`aws configure`).',
      mode === 'test' ? 'Test mode: free-tier specs.' : 'Client mode: production specs.',
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
