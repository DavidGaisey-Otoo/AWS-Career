/**
 * rateBenchmark.js — FR-06 client rate benchmarking engine.
 *
 * Pure functions — given a project brief + your current cert level,
 * returns rate ranges, next-cert upside, platform-fee maths, and a
 * single-sentence recommendation.
 *
 * Hardcoded rates per the FR-06 spec. These are honest market ranges
 * for AWS freelance work as of late 2025, not gospel — they're a
 * starting point, not a guarantee.
 */

// ════════════════════════════════════════════════════════════════════
// Rate table
// USD per hour, by client location + freelancer level.
// ════════════════════════════════════════════════════════════════════
export const LOCATIONS = {
  usa: {
    id: 'usa',
    label: 'USA',
    flag: '🇺🇸',
    currency: 'USD',
    rates: {
      beginner:     { low: 25, high: 45 },
      intermediate: { low: 45, high: 80 },
      senior:       { low: 80, high: 150 },
    },
    notes: 'Highest-paying market. Most clients here expect Solutions Architect Associate at minimum.',
  },
  uk: {
    id: 'uk',
    label: 'UK',
    flag: '🇬🇧',
    currency: 'GBP',
    rates: {
      beginner:     { low: 20, high: 35 },
      intermediate: { low: 35, high: 65 },
      senior:       { low: 65, high: 120 },
    },
    notes: 'Rates often listed in GBP. Add 25% if the project requires GDPR / UK data residency expertise.',
  },
  europe: {
    id: 'europe',
    label: 'Europe',
    flag: '🇪🇺',
    currency: 'EUR',
    rates: {
      beginner:     { low: 20, high: 35 },
      intermediate: { low: 35, high: 65 },
      senior:       { low: 65, high: 110 },
    },
    notes: 'Rates often listed in EUR. Germany / Netherlands / Nordics typically at the top of the band.',
  },
  australia: {
    id: 'australia',
    label: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD',
    rates: {
      beginner:     { low: 25, high: 45 },
      intermediate: { low: 45, high: 75 },
      senior:       { low: 75, high: 130 },
    },
    notes: 'Rates often listed in AUD. Most opportunities in Sydney / Melbourne fintech + healthtech.',
  },
  africa: {
    id: 'africa',
    label: 'Africa (local)',
    flag: '🌍',
    currency: 'USD',
    rates: {
      beginner:     { low: 10, high: 20 },
      intermediate: { low: 20, high: 40 },
      senior:       { low: 40, high: 70 },
    },
    notes: 'Local rates are lower but client expectations are also lower. Charge in USD if invoicing internationally.',
  },
  general: {
    id: 'general',
    label: 'General / Unknown',
    flag: '🌐',
    currency: 'USD',
    rates: {
      beginner:     { low: 15, high: 30 },
      intermediate: { low: 30, high: 55 },
      senior:       { low: 55, high: 100 },
    },
    notes: 'Default conservative range when client location is not specified in the brief.',
  },
};

export const LOCATION_LIST = Object.values(LOCATIONS);

// ════════════════════════════════════════════════════════════════════
// Level catalogue — mapped to AWS certs
// ════════════════════════════════════════════════════════════════════
export const LEVELS = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    cert: 'AWS Cloud Practitioner',
    nextLevel: 'intermediate',
    nextCert: 'AWS Solutions Architect — Associate',
    blurb: 'No cert yet, or holding Cloud Practitioner. Suitable for setup/configuration gigs.',
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    cert: 'AWS Solutions Architect — Associate',
    nextLevel: 'senior',
    nextCert: 'AWS Solutions Architect — Professional',
    blurb: 'SAA-certified. Can design and deliver production-grade architectures end to end.',
  },
  senior: {
    id: 'senior',
    label: 'Senior',
    cert: 'AWS Solutions Architect — Professional',
    nextLevel: null,
    nextCert: null,
    blurb: 'SAP-certified or equivalent experience. Multi-account, multi-region, enterprise-grade work.',
  },
};

export const LEVEL_LIST = Object.values(LEVELS);

// ════════════════════════════════════════════════════════════════════
// Platform catalogue — fee % is what THEY take, so your effective rate
// is the listed rate * (1 - fee).
// ════════════════════════════════════════════════════════════════════
export const PLATFORMS = {
  direct: {
    id: 'direct',
    label: 'Direct (own contract)',
    feePct: 0,
    note: 'No platform fee. May incur payment processor fee (Stripe ~2.9%, Wise ~1-2%).',
  },
  upwork: {
    id: 'upwork',
    label: 'Upwork',
    feePct: 10,
    note: 'Sliding fee: 20% on first $500, 10% from $500-$10k, 5% over $10k. Most freelancers use the middle band.',
  },
  fiverr: {
    id: 'fiverr',
    label: 'Fiverr',
    feePct: 20,
    note: 'Flat 20% commission on all earnings.',
  },
  freelancer: {
    id: 'freelancer',
    label: 'Freelancer.com',
    feePct: 10,
    note: '10% or $5 minimum on fixed projects; 10% on hourly.',
  },
  toptal: {
    id: 'toptal',
    label: 'Toptal',
    feePct: 0,
    note: 'No fee for the freelancer; their margin comes from the client side. Hard to get into (top 3% screening).',
  },
};

export const PLATFORM_LIST = Object.values(PLATFORMS);

// ════════════════════════════════════════════════════════════════════
// Location detection — pattern matching on the brief text
// ════════════════════════════════════════════════════════════════════
const LOCATION_PATTERNS = [
  { id: 'usa', patterns: [
    /\b(usa|u\.s\.a|united states|us-based|us\s+(company|company\.|client|based)|america|american\s+(company|client))\b/i,
    /\b(california|new york|texas|florida|seattle|silicon valley|chicago|boston|atlanta|los angeles|san francisco|austin|denver|miami)\b/i,
    /\b(est|pst|cst|mst|eastern time|pacific time)\b/i,
  ]},
  { id: 'uk', patterns: [
    /\b(uk|u\.k|united kingdom|british|england|scotland|wales|northern ireland)\b/i,
    /\b(london|manchester|birmingham|edinburgh|glasgow|bristol|leeds|liverpool|cambridge|oxford)\b/i,
    /\b(gbp|£|pound\s+(sterling|s)?)\b/i,
    /\b(gmt|bst)\b/i,
  ]},
  { id: 'europe', patterns: [
    /\b(europe|european|eu-based|eu\s+company|eu\s+client|emea)\b/i,
    /\b(germany|german|france|french|netherlands|dutch|spain|spanish|italy|italian|ireland|irish|belgium|sweden|denmark|norway|finland|switzerland|austria|portugal|poland)\b/i,
    /\b(berlin|munich|hamburg|paris|amsterdam|rotterdam|madrid|barcelona|rome|milan|dublin|brussels|stockholm|copenhagen|oslo|helsinki|zurich|vienna|lisbon|warsaw)\b/i,
    /\b(eur|€)\b/i,
    /\b(cet|cest)\b/i,
  ]},
  { id: 'australia', patterns: [
    /\b(australia|australian|aussie|au-based)\b/i,
    /\b(sydney|melbourne|brisbane|perth|adelaide|canberra)\b/i,
    /\b(aud|aest|aedt)\b/i,
  ]},
  { id: 'africa', patterns: [
    /\b(africa|african|ghana|ghanaian|nigeria|nigerian|kenya|kenyan|south africa|south african|tanzania|uganda|rwanda|ethiopia|egypt)\b/i,
    /\b(accra|lagos|abuja|nairobi|cape town|johannesburg|pretoria|kampala|kigali|cairo|dar es salaam)\b/i,
  ]},
];

/**
 * Detect client country from the brief. Returns the location id + the
 * matched evidence (first phrase that triggered the match) so the UI
 * can show "Detected from: 'San Francisco'".
 *
 * @returns {{ id: string, evidence: string|null, confident: boolean }}
 */
export function detectLocation(brief = '') {
  const text = String(brief || '');
  if (!text.trim()) return { id: 'general', evidence: null, confident: false };

  for (const loc of LOCATION_PATTERNS) {
    for (const re of loc.patterns) {
      const m = text.match(re);
      if (m) {
        return { id: loc.id, evidence: m[0], confident: true };
      }
    }
  }
  return { id: 'general', evidence: null, confident: false };
}

// ════════════════════════════════════════════════════════════════════
// Main benchmark calculator
// ════════════════════════════════════════════════════════════════════

/**
 * @param {Object} opts
 * @param {string} opts.brief    — raw JD text
 * @param {string} [opts.locationId]  — manual override; else auto-detect
 * @param {string} [opts.level='beginner']
 * @param {string} [opts.platformId='direct']
 * @returns full benchmark snapshot:
 *   {
 *     location, level, platform,
 *     range:        { low, high },           // raw rate for your level
 *     effectiveRange: { low, high },         // after platform fee
 *     nextLevel: { id, label, cert, range }, // upside after next cert
 *     detected:  { id, evidence, confident },
 *     recommendation: string                 // 1-sentence "charge this"
 *   }
 */
export function calculateBenchmark({ brief = '', locationId, level = 'beginner', platformId = 'direct' } = {}) {
  const detected = detectLocation(brief);
  const chosenLocId = locationId || detected.id;
  const location = LOCATIONS[chosenLocId] || LOCATIONS.general;
  const lvl = LEVELS[level] || LEVELS.beginner;
  const platform = PLATFORMS[platformId] || PLATFORMS.direct;

  const range = location.rates[level] || location.rates.beginner;

  // Apply platform fee
  const feeMultiplier = 1 - (platform.feePct / 100);
  const effectiveRange = {
    low:  Math.round(range.low  * feeMultiplier),
    high: Math.round(range.high * feeMultiplier),
  };

  // Next-cert upside (if there is one)
  let nextLevel = null;
  if (lvl.nextLevel) {
    const nextLvl = LEVELS[lvl.nextLevel];
    const nextRange = location.rates[lvl.nextLevel];
    if (nextLvl && nextRange) {
      nextLevel = {
        id: nextLvl.id,
        label: nextLvl.label,
        cert: nextLvl.cert,
        range: nextRange,
        uplift: Math.round(((nextRange.low + nextRange.high) / 2) - ((range.low + range.high) / 2)),
      };
    }
  }

  const recommendation = buildRecommendation({
    location, level: lvl, platform, range, effectiveRange,
  });

  return {
    location,
    level: lvl,
    platform,
    range,
    effectiveRange,
    nextLevel,
    detected,
    recommendation,
  };
}

// ════════════════════════════════════════════════════════════════════
// 1-sentence recommendation builder
// ════════════════════════════════════════════════════════════════════
function buildRecommendation({ location, level, platform, range, effectiveRange }) {
  // Pick the midpoint of the recommended range — round to a clean $5 boundary
  const mid = Math.round((range.low + range.high) / 2 / 5) * 5;
  const effectiveMid = Math.round((effectiveRange.low + effectiveRange.high) / 2 / 5) * 5;

  const feeNote = platform.feePct > 0
    ? ` (after ${platform.label}'s ${platform.feePct}% fee, that's roughly $${effectiveMid}/hr in your pocket)`
    : '';

  return `Quote $${mid}/hr to this ${location.label} client at your ${level.label} level${feeNote}.`;
}
