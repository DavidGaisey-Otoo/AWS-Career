/**
 * performance.js — Performance Architect (20+ years at scale).
 * NEW in AUDIT-02. Catches what other agents miss: scaling math, hot partitions,
 * cold starts, throughput limits, cache strategies.
 */
import { finding } from './framework.js';

export const performanceArchitect = {
  id: 'performance', name: 'Performance Architect', emoji: '⚡',
  role: 'Principal Performance Engineer', yearsExperience: 22,
  expertiseAreas: [
    'DynamoDB partition design + hot partition avoidance',
    'Lambda cold start mitigation (provisioned concurrency)',
    'Caching strategy: CloudFront, ElastiCache, DAX, API Gateway',
    'Service throughput limits + quota planning',
    'Connection pooling (RDS Proxy)',
    'Distributed tracing (X-Ray)',
  ],
  systemPrompt: 'Senior performance engineer. Knows specific throughput limits per service and how to mitigate hot spots. Cites actual numbers (3500 PUT/sec/prefix, 1000 default Lambda concurrency, etc.).',

  review(ctx) {
    const out = [];

    // ─── DDB hot partition risk ─────────────────────────
    if (ctx.has('dynamodb') && (ctx.userScale > 100000 ||
        /high[- ]?cardinality|millions of (skus|items|records|devices)|hot key/i.test(ctx.brief))) {
      out.push(finding({
        severity: 'high',
        title: 'DynamoDB hot partition risk — high cardinality with concentrated access',
        body: 'DDB caps per-partition at 3000 RCU / 1000 WCU. If access concentrates on a small subset of partition keys (e.g. popular products, hot devices), you hit ProvisionedThroughputExceeded even with capacity headroom.',
        fix: 'Design partition keys for even access distribution. Use write sharding (append random suffix). Add DAX for read-heavy hot keys (microsecond cache). Monitor with CloudWatch Contributor Insights.',
        docs: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html',
        ruleId: 'PERF-DDB-HOT-001',
      }));
    }

    // ─── DDB on-demand vs provisioned at scale ──────────
    if (ctx.has('dynamodb') && ctx.isHighTraffic && /on[- ]?demand|PAY_PER_REQUEST/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'DDB on-demand at high traffic — provisioned + autoscaling may be cheaper',
        body: 'On-demand is ~7x cost per request of provisioned at high steady traffic. At >40% utilization with predictable pattern, provisioned + autoscaling wins.',
        fix: 'Run 30-day Cost Explorer analysis. Switch to provisioned with autoscaling 70% target if pattern is steady. Stay on-demand if spiky.',
        docs: 'https://aws.amazon.com/blogs/database/amazon-dynamodb-auto-scaling-performance-and-cost-optimization-at-any-scale/',
        ruleId: 'PERF-DDB-CAPACITY-001',
      }));
    }

    // ─── Lambda concurrency limit ───────────────────────
    if (ctx.has('lambda') &&
        (ctx.userScale > 10000 || /high[- ]?traffic|events?\/sec|requests?\/sec|burst/i.test(ctx.brief))) {
      out.push(finding({
        severity: 'high',
        title: 'Lambda concurrency: 1000 default per region — high traffic will throttle',
        body: 'Default account-level concurrency limit is 1000 concurrent executions per region. At 10K events/sec with avg 100ms execution, you need 1000+ concurrency. Throttled invocations return 429.',
        fix: 'Request concurrency increase via Service Quotas (free, takes ~24hrs). For burst protection use Reserved Concurrency per function. For cold-start-sensitive paths use Provisioned Concurrency.',
        docs: 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html',
        ruleId: 'PERF-LAMBDA-CONCURRENCY-001',
      }));
    }

    // ─── Lambda cold starts ─────────────────────────────
    if (ctx.has('lambda') && (/latency[- ]?sensitive|real[- ]?time|sub[- ]?second|p99|sla/i.test(ctx.brief))) {
      out.push(finding({
        severity: 'medium',
        title: 'Lambda cold starts impact p99 latency on latency-sensitive paths',
        body: 'Cold starts: ~100-300ms for Node.js, 200-500ms for Python, 1-3s for Java/.NET, 2-10s in VPC (older accounts). Shows on p99 latency curves.',
        fix: 'Provisioned Concurrency for hot paths ($0.0000041667/ms × memory while warm). SnapStart for Java reduces 90% of cold start. Or rewrite hot paths in Rust/Go.',
        docs: 'https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html',
        ruleId: 'PERF-COLD-START-001',
      }));
    }

    // ─── Caching missing for read-heavy DB ──────────────
    if ((ctx.has('rds') || ctx.has('aurora')) &&
        /read[- ]?heavy|read[- ]?intensive|catalog|product (list|catalog)|user profile|session/i.test(ctx.brief) &&
        !ctx.has('elasticache') && !ctx.has('dax')) {
      out.push(finding({
        severity: 'high',
        title: 'Read-heavy DB workload without caching layer',
        body: 'For repeated reads (catalogs, sessions, user profiles), ElastiCache (Redis/Memcached) sub-millisecond replies vs RDS 1-10ms. Offloads 80%+ of DB load. ROI is immediate at scale.',
        fix: 'ElastiCache Redis cluster mode for shared data with persistence. ElastiCache Memcached for simple TTL-based cache. DAX specifically for DynamoDB.',
        docs: 'https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/Strategies.html',
        ruleId: 'PERF-CACHE-DB-001',
      }));
    }

    // ─── S3 prefix throughput ───────────────────────────
    if (ctx.has('s3') && /high[- ]?throughput|millions of (objects|files|writes)|burst write/i.test(ctx.brief)) {
      out.push(finding({
        severity: 'medium',
        title: 'S3 prefix throughput cap: 3,500 PUT/sec, 5,500 GET/sec per prefix',
        body: 'S3 limits are PER PREFIX. Writing all objects to /uploads/ caps you at 3500 PUT/sec. With smart prefix design you can scale linearly.',
        fix: 'Spread writes across 10+ prefixes (random hash prefix or date-based). For 100K writes/sec design 30+ prefixes.',
        docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html',
        ruleId: 'PERF-S3-PREFIX-001',
      }));
    }

    // ─── RDS Proxy for Lambda + RDS ─────────────────────
    if (ctx.has('rds') && ctx.has('lambda') && !/rds[- ]?proxy/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Lambda → RDS without RDS Proxy — connection exhaustion at scale',
        body: 'Each Lambda execution opens a new RDS connection. db.t3.micro caps at ~85 max_connections. At 1000 concurrent Lambdas, you exhaust connections in seconds.',
        fix: 'RDS Proxy pools and reuses connections. ~$0.015/hr per vCPU of underlying DB. Massive impact on connection-bound workloads.',
        docs: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html',
        ruleId: 'PERF-RDS-PROXY-001',
      }));
    }

    // ─── ALB target type for Lambda ─────────────────────
    if (ctx.has('alb') && ctx.has('lambda') && !/target_group|TargetGroup/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'ALB + Lambda — ALB supports Lambda as target type natively',
        body: 'Often people use API Gateway → Lambda when ALB → Lambda would suffice (and is cheaper at scale: $0.0225/LCU-hr vs $3.50/M REST API requests).',
        fix: 'ALB target group type=lambda for HTTP-only APIs without auth/throttling requirements. Use API Gateway only when you need its features (auth, throttling, transformations, SDKs).',
        docs: 'https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html',
        ruleId: 'PERF-ALB-LAMBDA-001',
      }));
    }

    // ─── CloudFront cache hit rate ──────────────────────
    if (ctx.has('cloudfront') && ctx.isProduction && !/cache[ _-]?(policy|hit)/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'CloudFront without explicit cache policy — likely missing cache hits',
        body: 'Default behavior respects origin Cache-Control headers. Most origins don\'t set them well, dropping cache hit rate to <50%. Custom CachePolicy with explicit TTLs can push hit rate >90%.',
        fix: 'Define CachePolicy with MinTTL=0, DefaultTTL=86400, MaxTTL=31536000. Whitelist only query strings that affect content. Monitor cache hit rate in CloudWatch.',
        docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html',
        ruleId: 'PERF-CF-CACHE-001',
      }));
    }

    // ─── No distributed tracing ─────────────────────────
    if (ctx.isProduction && (ctx.services.length > 5) && !ctx.has('xray') &&
        !/distributed trace|x[- ]?ray|opentelemetry|datadog|new relic/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Multi-service production without distributed tracing',
        body: 'With 5+ services, debugging "why is request slow?" without traces is guesswork. X-Ray adds <5ms per call. Free for first 100K traces/mo.',
        fix: 'Enable X-Ray on Lambda + API Gateway + ALB. Use ADOT (AWS Distro for OpenTelemetry) for cross-vendor traces.',
        docs: 'https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html',
        ruleId: 'PERF-XRAY-001',
      }));
    }

    return out;
  },
};
