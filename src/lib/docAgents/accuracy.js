/**
 * accuracy.js — Technical Accuracy expert.
 *
 * Looks for things that will be wrong or stale in 6 months: region
 * ambiguity, broken links, IAM red flags, missing version stamps,
 * outdated console paths.
 */

import { finding } from './framework.js';

export const technicalAccuracy = {
  id: 'accuracy',
  name: 'Olu Adebayo',
  role: 'Technical Accuracy Auditor',
  expertiseAreas: ['Documentation hygiene', 'IAM auditing', 'AWS version drift'],
  yearsExperience: 15,
  systemPrompt: 'You are a senior AWS auditor reviewing handover documentation. Flag anything that\'s ambiguous, outdated, or security-risky.',

  review(ctx) {
    const findings = [];
    const { docText, regions, urls, wordCount: words } = ctx;

    // DOC-REGION-AMBIG-001 — multiple regions mentioned, no clear primary
    if (regions.length > 1 && !/\b(primary|main|default|active)\s+region\b/i.test(docText)) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DOC-REGION-AMBIG-001',
        title: `${regions.length} different AWS regions mentioned without a clear primary`,
        body: `Found: ${regions.join(', ')}. Without an explicit primary, the new owner doesn\'t know where to look first.`,
        fix: `State explicitly: "Primary region: ${regions[0]}. Standby: ${regions[1] || 'tbd'}."`,
      }));
    }

    // DOC-REGION-MISSING-001 — no region at all in handover
    if (regions.length === 0 && words >= 15) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-REGION-MISSING-001',
        title: 'No AWS region named in the doc',
        body: 'Documentation that doesn\'t name a region creates ambiguity. New owner will look in the wrong region first.',
        fix: 'State the region explicitly at the top: "All resources deployed in eu-west-2 (London)."',
      }));
    }

    // DOC-CONSOLE-VERSION-001 — references AWS Console paths without a "as of" date
    if (/\b(?:click|select|navigate|go to)\b/i.test(docText) && !/\b(as of|console (?:ui )?(?:version|as of)|last (?:updated|verified)|November|December|January|February|March|April|May|June|July|August|September|October)\s+20\d\d\b/i.test(docText)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-CONSOLE-VERSION-001',
        title: 'Console-step instructions without a date stamp',
        body: 'AWS Console UI changes regularly. Step-by-step instructions without a "Console UI as of Month Year" header age badly.',
        fix: 'Add a line at the top of any Console-walkthrough section: "Console UI as of November 2025."',
      }));
    }

    // DOC-IAM-WILDCARD-001 — wildcard in IAM policies
    if (/"Action":\s*"\*"|"Resource":\s*"\*"|Effect:\s*Allow[\s\S]{0,80}Action:\s*['"]?\*/i.test(docText)) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DOC-IAM-WILDCARD-001',
        title: 'IAM policy uses wildcard (*) Action or Resource',
        body: 'Wildcard IAM policies violate least-privilege. Documenting them as the standard makes the security posture worse over time.',
        fix: 'Replace wildcards with the minimum-required actions and named resource ARNs.',
      }));
    }

    // DOC-SECRET-INLINE-001 — looks like a secret pasted inline
    const secretPatterns = [
      /AKIA[0-9A-Z]{16}/,                              // AWS access key ID
      /aws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9/+=]{30,}/i, // AWS secret in env-var form
      /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,      // private keys
      /\bgh[ps]_[A-Za-z0-9]{30,}/,                     // GitHub PAT
      /\bsk_(?:live|test)_[A-Za-z0-9]{20,}/,           // Stripe key
    ];
    const exposed = secretPatterns.filter((rx) => rx.test(docText));
    if (exposed.length > 0) {
      findings.push(finding({
        severity: 'critical',
        ruleId: 'DOC-SECRET-INLINE-001',
        title: 'Live credential pattern detected in the doc',
        body: 'The doc text looks like it contains an actual AWS key, SSH key, PAT, or API secret. Documentation should NEVER contain live credentials.',
        fix: 'Remove the credential. Rotate it immediately. Reference it by Secrets Manager ARN or env var name only.',
      }));
    }

    // DOC-URL-PLACEHOLDER-001 — URL still contains placeholders
    const placeholderUrls = urls.filter((u) =>
      /\b(?:your[- ]?(?:account|domain|bucket)|example\.com|TODO|REPLACE|<account-id>|<region>|xxxx|XXXX)\b/i.test(u)
    );
    if (placeholderUrls.length > 0) {
      findings.push(finding({
        severity: 'high',
        ruleId: 'DOC-URL-PLACEHOLDER-001',
        title: `${placeholderUrls.length} URL(s) contain placeholders`,
        body: `Found URLs like ${placeholderUrls.slice(0, 2).join(', ')} that still have TODO/<account-id>/example.com style placeholders.`,
        fix: 'Replace placeholders with the real values before handover.',
        evidence: placeholderUrls.slice(0, 3).join(' · '),
      }));
    }

    // DOC-TODO-001 — TODO/FIXME left in the body
    const todos = (docText.match(/\b(?:TODO|FIXME|XXX|TBD|HACK)\b/g) || []).length;
    if (todos >= 1) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-TODO-001',
        title: `${todos} TODO/FIXME marker(s) left in the doc`,
        body: 'Unresolved TODOs in handover docs signal "not actually ready to hand over".',
        fix: 'Resolve each TODO or move to a separate backlog file.',
      }));
    }

    // DOC-DATE-STAMP-001 — no "Last updated" / version info anywhere
    if (words >= 200 && !/\b(last (?:updated|verified|reviewed|edited)|version\s+\d|revision|changelog|history)\b/i.test(docText)) {
      findings.push(finding({
        severity: 'low',
        ruleId: 'DOC-DATE-STAMP-001',
        title: 'No "Last updated" / version stamp',
        body: 'Without a date, reader has no way to know if the doc is current.',
        fix: 'Add a "Last updated: YYYY-MM-DD" line at the top, and a changelog at the bottom.',
      }));
    }

    // DOC-BROKEN-LOCAL-001 — references local file paths that won't work for the client
    if (/\b(?:C:\\|\/Users\/|\/home\/|~\/)\w+/i.test(docText)) {
      findings.push(finding({
        severity: 'medium',
        ruleId: 'DOC-BROKEN-LOCAL-001',
        title: 'References a local filesystem path',
        body: 'Local paths like "C:\\Users\\..." or "/home/..." won\'t work on the client\'s machine.',
        fix: 'Replace with relative paths from the project root, or use environment variables.',
      }));
    }

    return findings;
  },
};
