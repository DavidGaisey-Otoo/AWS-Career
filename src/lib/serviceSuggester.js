/**
 * serviceSuggester.js — AD-02 service detection engine.
 *
 * Takes a brief / job description and returns:
 *   - matched services (with the specific reason each was detected)
 *   - companion suggestions (services commonly used alongside the matches)
 *   - confidence score
 *
 * Uses AWS_SERVICE_CATALOG as the source of truth for trigger patterns.
 */

import { AWS_SERVICE_CATALOG, listAllServices, getService } from '../data/awsServiceCatalog.js';

/**
 * @returns {{
 *   primary:    Array<{ service, reason }>     — directly matched
 *   companions: Array<{ service, reason }>     — suggested because they pair with matches
 *   reasonsByService: { [id]: string[] }       — all reasons per service
 *   detectedIds: string[]                      — flat list of all service ids
 * }}
 */
export function suggestServices(brief = '') {
  const text = String(brief || '');
  if (!text.trim()) {
    return { primary: [], companions: [], reasonsByService: {}, detectedIds: [] };
  }

  const reasonsByService = {};

  // 1. Run every catalog entry's triggers against the text
  for (const svc of listAllServices()) {
    for (const trig of svc.triggers || []) {
      // The catch-all /./i in IAM + CloudWatch should only fire if the brief
      // is substantial — skip those for short briefs.
      if (trig.pattern.source === '.' && text.length < 40) continue;
      if (trig.pattern.test(text)) {
        if (!reasonsByService[svc.id]) reasonsByService[svc.id] = [];
        if (!reasonsByService[svc.id].includes(trig.reason)) {
          reasonsByService[svc.id].push(trig.reason);
        }
        // Don't break — we want all matching reasons collected
      }
    }
  }

  // 2. Build primary list (direct matches)
  const primaryIds = Object.keys(reasonsByService);
  const primary = primaryIds.map((id) => ({
    service: getService(id),
    reasons: reasonsByService[id],
  }));

  // 3. Build companions list (commonly-paired services not already primary)
  const companionVotes = {}; // companionId → count of primaries suggesting it
  for (const id of primaryIds) {
    const svc = getService(id);
    for (const compId of (svc?.companions || [])) {
      if (primaryIds.includes(compId)) continue;
      companionVotes[compId] = (companionVotes[compId] || 0) + 1;
    }
  }
  // Companions sorted by vote count desc, take top 6
  const companionIds = Object.entries(companionVotes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  const companions = companionIds.map((id) => ({
    service: getService(id),
    reasons: [
      `Suggested because it pairs naturally with ${
        Object.entries(companionVotes).find(([k]) => k === id)?.[1]
      } detected service(s) in this brief.`,
    ],
  }));

  return {
    primary,
    companions,
    reasonsByService,
    detectedIds: [...primaryIds, ...companionIds],
  };
}

/**
 * Plain detection — just service IDs, no reasons. Used by older callers.
 */
export function detectServiceIds(brief) {
  return suggestServices(brief).detectedIds;
}
