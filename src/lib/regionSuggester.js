/**
 * regionSuggester.js — AD-01 Smart AWS Region Suggestion.
 *
 * Given a free-text brief AND/OR an audience hint AND/OR compliance hints,
 * returns a ranked region suggestion with human-readable reasoning.
 *
 * Pure heuristic — no API calls — deterministic so the same input always
 * gives the same suggestion.
 */

import { REGION_LABELS } from '../data/awsPricing.js';

// ════════════════════════════════════════════════════════════════════
// Audience presets (used by the dropdown when no brief is supplied)
// ════════════════════════════════════════════════════════════════════
export const AUDIENCE_OPTIONS = [
  { id: 'global',     label: 'Global / mixed' },
  { id: 'us',         label: 'Mostly United States' },
  { id: 'eu',         label: 'Mostly Europe / EU' },
  { id: 'uk',         label: 'Mostly UK' },
  { id: 'africa',     label: 'West / North Africa (Ghana, Nigeria, Kenya…)' },
  { id: 'south-africa', label: 'Southern Africa (South Africa, Botswana…)' },
  { id: 'india',      label: 'India / South Asia' },
  { id: 'apac',       label: 'Asia Pacific (Singapore, Tokyo, Sydney)' },
  { id: 'middle-east', label: 'Middle East (UAE, Saudi, Bahrain)' },
  { id: 'south-america', label: 'South America / Latin America' },
  { id: 'canada',     label: 'Canada' },
  { id: 'me-only',    label: 'Just me — for learning / dev' },
];

// ════════════════════════════════════════════════════════════════════
// Keyword → audience detection
// ════════════════════════════════════════════════════════════════════
const KEYWORD_AUDIENCE = [
  { audience: 'eu',           patterns: [/\beu(rope|ropean|-?wide)?\b/i, /\bgdpr\b/i, /\beea\b/i, /\bgermany|france|spain|italy|netherlands|ireland|belgium|portugal|sweden|denmark|finland|austria|poland\b/i, /\beuro(zone)?\b/i] },
  // "United Kingdom" / "Great Britain" are what job boards actually send in
  // their structured location field — match the full names, not just "UK".
  { audience: 'uk',           patterns: [/\buk\b/i, /\bunited kingdom\b/i, /\bgreat britain\b/i, /\b(britain|british|england|english|scotland|wales)\b/i, /\blondon\b/i, /\b\.co\.uk\b/i] },
  { audience: 'us',           patterns: [/\b(usa|us|united states|america(n)?|stateside)\b/i, /\b(new york|california|texas|florida|chicago|virginia|oregon)\b/i, /\bnorth america\b/i] },
  { audience: 'africa',       patterns: [/\b(ghana|nigeria(n)?|lagos|accra|kenya|kenyan|nairobi|uganda|ethiopia|tanzania|ivory coast|cote d'ivoire|senegal|morocco|egypt)\b/i, /\bwest africa(n)?\b/i, /\bafrica(n)?\b/i] },
  { audience: 'south-africa', patterns: [/\bsouth africa(n)?\b/i, /\b(johannesburg|cape town|pretoria|durban)\b/i, /\bsouthern africa\b/i] },
  { audience: 'india',        patterns: [/\b(india(n)?|mumbai|delhi|bangalore|bengaluru|chennai|hyderabad|pune)\b/i, /\bsouth asia\b/i] },
  { audience: 'apac',         patterns: [/\b(asia|asian|asia[- ]?pacific|apac|japan|japanese|tokyo|china|chinese|beijing|shanghai|singapore|hong kong|taiwan|korea(n)?|seoul|thailand|vietnam|philippines|indonesia)\b/i, /\baustralia(n)?\b/i, /\bsydney|melbourne|brisbane\b/i] },
  { audience: 'middle-east',  patterns: [/\b(middle east|uae|emirates|dubai|abu dhabi|saudi(\s+arabia)?|riyadh|bahrain|kuwait|qatar|doha|oman)\b/i] },
  { audience: 'south-america', patterns: [/\b(latam|latin america|brazil(ian)?|sao paulo|são paulo|rio de janeiro|argentina|mexico|chile|colombia|peru)\b/i, /\bsouth america(n)?\b/i] },
  { audience: 'canada',       patterns: [/\bcanada|canadian|toronto|montreal|ottawa|vancouver\b/i] },
];

// ════════════════════════════════════════════════════════════════════
// Compliance hint detection
// ════════════════════════════════════════════════════════════════════
const COMPLIANCE_PATTERNS = {
  hipaa:    /\b(hipaa|phi|hitech|healthcare data|medical record|protected health|patient data)\b/i,
  gdpr:     /\b(gdpr|data residency|data sovereignty|right to be forgotten)\b/i,
  pci:      /\b(pci[- ]?dss|cardholder|credit card data)\b/i,
  fedramp:  /\b(fedramp|federal government|us govcloud)\b/i,
  uk_dpa:   /\b(uk dpa|ico|uk data protection)\b/i,
  fintech:  /\b(fintech|financial services|banking|payment processor|sox compliance)\b/i,
};

// ════════════════════════════════════════════════════════════════════
// Audience → primary region + alternates + reasoning
// ════════════════════════════════════════════════════════════════════
const AUDIENCE_REGION = {
  global:        { primary: 'us-east-1',      alternates: ['us-west-2'],                  base: 'Cheapest + most service availability — good default for global apps without specific locality needs.' },
  us:            { primary: 'us-east-1',      alternates: ['us-east-2', 'us-west-2'],     base: 'us-east-1 (N. Virginia) is the cheapest US region with the broadest service catalog — virtually every new AWS service launches here first.' },
  eu:            { primary: 'eu-west-1',      alternates: ['eu-central-1', 'eu-west-2'],  base: 'eu-west-1 (Ireland) is the largest, oldest EU region with mature service availability and low EU-wide latency.' },
  uk:            { primary: 'eu-west-2',      alternates: ['eu-west-1'],                  base: 'eu-west-2 (London) keeps UK user traffic + data inside the UK — best for UK-specific compliance + lowest latency.' },
  africa:        { primary: 'eu-west-1',      alternates: ['af-south-1'],                 base: 'For West Africa, eu-west-1 (Ireland) typically gives lower latency than af-south-1 (Cape Town) due to undersea cable routes. af-south-1 may be preferred if you specifically need African data residency.' },
  'south-africa': { primary: 'af-south-1',    alternates: ['eu-west-1'],                  base: 'af-south-1 (Cape Town) is the dedicated African region with lowest latency for Southern Africa users.' },
  india:         { primary: 'ap-south-1',    alternates: ['ap-southeast-1'],             base: 'ap-south-1 (Mumbai) is the only mainland India region — lowest latency + meets Indian data residency expectations.' },
  apac:          { primary: 'ap-southeast-1', alternates: ['ap-northeast-1', 'ap-southeast-2'], base: 'ap-southeast-1 (Singapore) is the central APAC hub with good latency to most Southeast Asian markets.' },
  'middle-east': { primary: 'me-south-1',     alternates: ['eu-west-1'],                  base: 'me-south-1 (Bahrain) is the dedicated Middle East region with lowest latency to UAE/Saudi/Bahrain.' },
  'south-america': { primary: 'sa-east-1',    alternates: ['us-east-1'],                  base: 'sa-east-1 (São Paulo) is the only South American region — required for low Latam latency.' },
  canada:        { primary: 'ca-central-1',   alternates: ['us-east-1'],                  base: 'ca-central-1 (Central) keeps Canadian user data in Canada — relevant for PIPEDA compliance.' },
  'me-only':     { primary: 'us-east-1',      alternates: ['eu-west-1', 'eu-west-2'],     base: 'Cheapest for learning + widest service availability — also where most AWS docs/tutorials default to.' },
};

// ════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════
/**
 * Suggest the best AWS region for a project.
 *
 * @param {object} opts
 *   - brief        free-text brief / job description (optional)
 *   - audience     explicit audience id from AUDIENCE_OPTIONS (optional)
 *   - compliance   array of compliance ids: 'hipaa' | 'gdpr' | 'pci' | etc. (optional)
 *   - needsNewest  if true, biases toward us-east-1
 *
 * @returns {{
 *   primary:      regionId,
 *   alternates:   [regionId],
 *   reasons:      [string],   // ordered, human-readable
 *   audience:     detectedAudienceId,
 *   compliance:   [detectedComplianceIds],
 *   confidence:   'high' | 'medium' | 'low',
 * }}
 */
export function suggestRegion({ brief = '', audience = null, compliance = [], needsNewest = false } = {}) {
  const text = String(brief || '');
  const reasons = [];

  // A region the user/client explicitly approved is a fact, not another
  // heuristic signal. Keep this ahead of compliance and audience inference so
  // rebuilding an approved plan cannot silently move it to another region.
  const approvedRegion = text.match(/\b(?:approved\s+)?(?:aws\s+)?region\s*(?:is|:)?\s*([a-z]{2}(?:-gov)?-[a-z]+-\d)\b/i)?.[1]?.toLowerCase();
  if (approvedRegion) {
    reasons.push(`AWS Region ${approvedRegion} was explicitly stated in the brief.`);
    return finalize({
      primary: approvedRegion,
      alternates: [],
      reasons,
      audience: audience || 'explicit',
      compliance: compliance || [],
      confidence: 'high',
    });
  }

  // 1. Auto-detect compliance from brief
  const detectedCompliance = new Set([...(compliance || [])]);
  for (const [id, pattern] of Object.entries(COMPLIANCE_PATTERNS)) {
    if (pattern.test(text)) detectedCompliance.add(id);
  }

  // 2. Compliance overrides take priority
  if (detectedCompliance.has('hipaa')) {
    reasons.push('HIPAA / healthcare data detected — us-east-1 or us-west-2 are most commonly used for HIPAA workloads (BAA-eligible + broadest HIPAA-eligible service list).');
    const primary = 'us-east-1';
    return finalize({ primary, alternates: ['us-west-2'], reasons, audience: audience || 'us', compliance: [...detectedCompliance], confidence: 'high' });
  }

  if (detectedCompliance.has('fedramp')) {
    reasons.push('US Federal / FedRAMP detected — consider AWS GovCloud regions, otherwise us-east-1 + us-west-2 are most FedRAMP-aligned commercial regions.');
    return finalize({ primary: 'us-east-1', alternates: ['us-west-2'], reasons, audience: audience || 'us', compliance: [...detectedCompliance], confidence: 'high' });
  }

  // 3. Auto-detect audience from brief if not explicitly set
  let detectedAudience = audience;
  if (!detectedAudience && text) {
    for (const { audience: a, patterns } of KEYWORD_AUDIENCE) {
      if (patterns.some((p) => p.test(text))) {
        detectedAudience = a;
        reasons.push(`Audience inferred from brief: ${AUDIENCE_OPTIONS.find((o) => o.id === a)?.label || a}.`);
        break;
      }
    }
  }
  // Default to global if still no signal
  if (!detectedAudience) {
    detectedAudience = 'global';
    if (!text) reasons.push('No brief or audience specified — using the safest global default.');
  }

  // 4. Look up the audience → region recommendation
  const rec = AUDIENCE_REGION[detectedAudience] || AUDIENCE_REGION.global;
  let primary = rec.primary;
  let alternates = [...rec.alternates];
  reasons.push(rec.base);

  // 5. GDPR + non-EU audience = warn about data residency
  if (detectedCompliance.has('gdpr') && !['eu', 'uk'].includes(detectedAudience)) {
    reasons.push('GDPR detected but audience isn\'t flagged as EU — consider an EU region (eu-west-1 or eu-central-1) if EU users\' data is processed.');
    if (!alternates.includes('eu-west-1')) alternates.unshift('eu-west-1');
  }

  // 6. Need newest features → override to us-east-1
  if (needsNewest && primary !== 'us-east-1') {
    reasons.push('"Need newest AWS services" flag set — us-east-1 always gets new services first.');
    alternates = [primary, ...alternates.filter((r) => r !== 'us-east-1')];
    primary = 'us-east-1';
  }

  // 7. Confidence
  const confidence = (audience || (text && reasons.length > 1)) ? 'high'
    : text ? 'medium'
    : 'low';

  return finalize({ primary, alternates, reasons, audience: detectedAudience, compliance: [...detectedCompliance], confidence });
}

function finalize({ primary, alternates, reasons, audience, compliance, confidence }) {
  return {
    primary,
    primaryLabel: REGION_LABELS[primary] || primary,
    alternates: alternates.map((r) => ({ id: r, label: REGION_LABELS[r] || r })),
    reasons,
    audience,
    compliance,
    confidence,
  };
}

// ════════════════════════════════════════════════════════════════════
// All-regions list (for the manual-override picker)
// ════════════════════════════════════════════════════════════════════
export function getAllRegions() {
  return Object.entries(REGION_LABELS).map(([id, label]) => ({ id, label }));
}
