/**
 * network.js — Network Architect domain expert.
 *
 * Persona: 20+ years networking, ex-Cisco then AWS Pro Services. Has
 * debugged BGP, IPSec, and "why is my Lambda timing out" enough times
 * to know the patterns. NAT Gateway billing is the most-asked-about
 * surprise cost in AWS.
 */

import { finding } from './framework.js';

export const networkArchitect = {
  id: 'network',
  name: 'Network Architect',
  emoji: '🌐',
  role: 'Cloud Network Engineering Lead',
  yearsExperience: 21,
  expertiseAreas: [
    'VPC design: CIDR planning, subnets across AZs',
    'Security groups vs NACLs (stateful vs stateless)',
    'NAT Gateway vs NAT Instance cost trade-offs',
    'VPC endpoints (Gateway + Interface) to avoid NAT charges',
    'Transit Gateway for multi-account/multi-VPC',
    'CloudFront + WAF positioning',
  ],
  systemPrompt: `You are a Senior Cloud Network Architect. You think in CIDR blocks and bandwidth bills.
You catch missing VPC endpoints (which force traffic through NAT Gateway at $0.045/GB plus hourly),
single-AZ NAT deploys (free outage waiting to happen), overlapping CIDR ranges between VPCs that
need to peer, security groups using 0.0.0.0/0 on internal ports. You are skeptical of "Lambda
talking to RDS" without explaining VPC config.`,

  review(ctx) {
    const out = [];

    // ─── NAT Gateway cost trap ─────────────────────────
    if (ctx.has('vpc') && (ctx.has('lambda') || ctx.has('ec2') || ctx.has('ecs')) &&
        ctx.has('s3') && !ctx.matches(/vpc endpoint|gateway endpoint|s3 endpoint/i)) {
      out.push(finding({
        severity: 'high',
        title: 'Lambda/EC2/ECS in VPC + S3 without S3 VPC Gateway Endpoint',
        body: 'When VPC-attached Lambda/EC2/ECS calls S3, traffic goes via NAT Gateway by default — that\'s $0.045/GB plus $0.045/hr. For high-volume S3 traffic this is the #1 surprise bill. S3 Gateway Endpoints are FREE.',
        fix: 'Add a VPC Gateway Endpoint for com.amazonaws.<region>.s3 attached to the private subnets\' route tables. Free. Traffic stays on the AWS backbone.',
        docs: 'https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html',
        ruleId: 'NET-VPCEP-S3-001',
      }));
    }

    if (ctx.has('vpc') && (ctx.has('lambda') || ctx.has('ec2')) &&
        ctx.has('dynamodb') && !ctx.matches(/vpc endpoint|gateway endpoint|dynamodb endpoint/i)) {
      out.push(finding({
        severity: 'medium',
        title: 'DynamoDB Gateway Endpoint missing — incurring NAT charges',
        body: 'Same issue as S3: VPC-attached compute calling DynamoDB without an endpoint goes through NAT Gateway. DynamoDB Gateway Endpoints are also FREE.',
        fix: 'Add a VPC Gateway Endpoint for com.amazonaws.<region>.dynamodb.',
        docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/vpc-endpoints-dynamodb.html',
        ruleId: 'NET-VPCEP-DDB-001',
      }));
    }

    // ─── Single-AZ NAT Gateway ─────────────────────────
    if (ctx.has('vpc') && /nat[- ]?gateway/i.test(ctx.solutionText) &&
        !/nat.+(multi[- ]?az|per.+az|each az)/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'NAT Gateway not specified per-AZ — single AZ failure isolates other AZs',
        body: 'A NAT Gateway in only one AZ is a single point of failure. Workloads in OTHER AZs route through it; if that AZ goes down, those workloads lose internet.',
        fix: 'Deploy one NAT Gateway per AZ (typically 2-3). Each private subnet routes to its own AZ\'s NAT Gateway. Doubles cost but eliminates the SPOF.',
        docs: 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html',
        ruleId: 'NET-NAT-AZ-001',
      }));
    }

    // ─── Security group with 0.0.0.0/0 on non-web port ────────
    if (ctx.solutionText && /cidr.*0\.0\.0\.0\/0/i.test(ctx.solutionText)) {
      const text = ctx.solutionText;
      // Look for risky ports open to the world
      const riskyPortMatch = text.match(/(?:from_port|FromPort|port)\s*[:=]\s*(\d+)[\s\S]{0,200}0\.0\.0\.0\/0/i);
      if (riskyPortMatch) {
        const port = parseInt(riskyPortMatch[1], 10);
        const riskyPorts = [22, 3389, 3306, 5432, 6379, 27017, 1433, 5984, 9200, 11211];
        if (riskyPorts.includes(port)) {
          out.push(finding({
            severity: 'critical',
            title: `Security group opens port ${port} to 0.0.0.0/0`,
            body: `Port ${port} (${portName(port)}) open to the entire internet is a major exposure. Brute-force tools scan IPv4 in hours; this WILL be probed.`,
            fix: `Restrict ingress to your office IP, VPN CIDR, or use Session Manager (no port 22 needed). For databases, only allow from app tier security group.`,
            docs: 'https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-best-practices.html',
            ruleId: 'NET-SG-001',
          }));
        }
      }
    }

    // ─── CloudFront without WAF in front of web app ───────
    if (ctx.has('cloudfront') && ctx.isProduction && !ctx.has('waf') &&
        !ctx.matches(/static (site|html|content)/i)) {
      out.push(finding({
        severity: 'medium',
        title: 'Production CloudFront in front of dynamic app but no AWS WAF',
        body: 'CloudFront alone doesn\'t protect against OWASP Top 10 (SQLi, XSS, bot traffic). For dynamic apps, AWS WAF managed rule sets catch the common stuff for ~$5/mo + per-request.',
        fix: 'Attach a WAF WebACL with the AWS managed rule groups: AWSManagedRulesCommonRuleSet, AWSManagedRulesKnownBadInputsRuleSet, AWSManagedRulesAmazonIpReputationList.',
        docs: 'https://docs.aws.amazon.com/waf/latest/developerguide/waf-managed-rule-groups-list.html',
        ruleId: 'NET-WAF-001',
      }));
    }

    // ─── Lambda in VPC + cold start ─────────────────
    if (ctx.has('lambda') && ctx.has('vpc') && !ctx.matches(/provisioned concurrency|warmer/i)) {
      out.push(finding({
        severity: 'low',
        title: 'Lambda in VPC — cold starts may impact latency-sensitive workloads',
        body: 'VPC-attached Lambda has historically had longer cold starts (1-10s vs <1s). AWS improved this in 2019 but still measurable for sub-second SLAs.',
        fix: 'For latency-sensitive paths: provisioned concurrency. For DB access without VPC: use RDS Proxy or Aurora Serverless Data API (HTTP, no VPC needed).',
        docs: 'https://aws.amazon.com/blogs/compute/announcing-improved-vpc-networking-for-aws-lambda-functions/',
        ruleId: 'NET-LAMBDA-VPC-001',
      }));
    }

    return out;
  },
};

function portName(port) {
  return {
    22: 'SSH', 3389: 'RDP', 3306: 'MySQL', 5432: 'PostgreSQL',
    6379: 'Redis', 27017: 'MongoDB', 1433: 'SQL Server',
    5984: 'CouchDB', 9200: 'Elasticsearch', 11211: 'Memcached',
  }[port] || `port ${port}`;
}
