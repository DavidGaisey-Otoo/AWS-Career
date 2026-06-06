/**
 * storage.js — Storage Architect (focused, brief).
 */
import { finding } from './framework.js';

export const storageArchitect = {
  id: 'storage', name: 'Storage Architect', emoji: '💾',
  role: 'Storage & Data Lifecycle Lead', yearsExperience: 18,
  expertiseAreas: ['S3 storage classes + lifecycle', 'EBS vs EFS vs FSx', 'Versioning + cross-region replication', 'CloudFront origin strategy'],
  systemPrompt: 'Senior storage architect. Optimizes for the right tier, replication, and durability per workload SLA.',

  review(ctx) {
    const out = [];

    // S3 versioning for important data
    if (ctx.has('s3') && ctx.isProduction && !/versioning|Versioning/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'medium',
        title: 'Production S3 without versioning enabled',
        body: 'S3 versioning protects against accidental DELETE / PUT-overwrites — irreplaceable for audit trails or "I deleted the file by accident" scenarios. Costs same as the data you actually store (old versions count).',
        fix: 'Enable versioning + lifecycle rules to expire old versions after X days. Pair with MFA Delete for prod buckets containing critical data.',
        docs: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html',
        ruleId: 'STORAGE-S3-VER-001',
      }));
    }

    // EFS chosen for high-throughput workloads
    if (ctx.has('efs') && /high[- ]?throughput|throughput[- ]?intensive|hpc|video/i.test(ctx.brief)) {
      out.push(finding({
        severity: 'low',
        title: 'EFS for high-throughput workload — FSx for Lustre may outperform',
        body: 'EFS scales but caps per-file throughput. For HPC, video processing, or ML training datasets, FSx for Lustre is purpose-built and faster at this scale.',
        fix: 'Consider FSx for Lustre. EFS is right when you need NFS access from many compute instances with moderate per-file IO.',
        docs: 'https://docs.aws.amazon.com/fsx/latest/LustreGuide/what-is.html',
        ruleId: 'STORAGE-EFS-001',
      }));
    }

    // CloudFront with no caching strategy
    if (ctx.has('cloudfront') && !/cache[ _-]?policy|cacheKeyPolicy|TTL/i.test(ctx.solutionText)) {
      out.push(finding({
        severity: 'low',
        title: 'CloudFront without explicit cache policy',
        body: 'Default cache policy is "respect origin headers" — fine for most cases but caching becomes wasted spend if origin doesn\'t send Cache-Control. Custom policies let you cache per-query-string, per-cookie, etc.',
        fix: 'Define a CachePolicy with: MinTTL=0, DefaultTTL=86400, MaxTTL=31536000, with QueryStringsConfig=none unless paths need them.',
        docs: 'https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html',
        ruleId: 'STORAGE-CF-CACHE-001',
      }));
    }

    return out;
  },
};
