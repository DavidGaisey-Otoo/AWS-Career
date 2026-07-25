/**
 * briefExtractor.js — AD-03 auto-fill engine.
 *
 * Given a free-text job description / project brief, extracts:
 *   - projectName    string  (best guess at a title)
 *   - timeline       { label, deltaDays }  ('Urgent (same day)' / '1-2 weeks' / etc.)
 *   - techStack      string[]  (Python, Node.js, React, Docker, …)
 *   - clientLocation string  (audience id from regionSuggester, e.g. 'eu', 'us')
 *
 * Service detection + region suggestion are delegated to the existing
 * libraries (AD-02 + AD-01) so we don't duplicate logic.
 */

// ════════════════════════════════════════════════════════════════════
// 1. Project name extraction
// ════════════════════════════════════════════════════════════════════
export function extractProjectName(brief = '') {
  const text = String(brief || '').trim();
  if (!text) return '';

  // Try common "Build/Create/Design a X for Y" patterns first
  const patterns = [
    /^(?:we\s+(?:need|want|require)|i\s+(?:need|want|require)|looking\s+for|seeking)\s+(?:an?\s+|the\s+)?([^\.;\n]{8,80}?)(?:\.|;|\n|$)/i,
    /^(?:build|create|develop|design|implement)\s+(?:an?\s+|the\s+)?([^\.;\n]{8,80}?)(?:\.|;|\n|$)/i,
    /^(?:job(?:\s+title)?|project|gig|role)\s*[:\-—–]\s*([^\.;\n]{4,80})/i,
    /^([A-Z][^\.;\n]{4,80})$/m,   // any single-line title-like line
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1]) {
      return titleCase(m[1].trim().replace(/[\.,;:]$/, ''));
    }
  }

  // Fallback: take first sentence, truncate to 60 chars
  const firstSentence = (text.split(/\n|\.(?:\s+|$)/)[0] || '').trim();
  if (firstSentence.length > 0) {
    return titleCase(firstSentence.slice(0, 60));
  }

  return '';
}

function titleCase(s) {
  return String(s)
    .replace(/\s+/g, ' ')
    .trim();
}

// ════════════════════════════════════════════════════════════════════
// 2. Timeline extraction
// ════════════════════════════════════════════════════════════════════
const TIMELINE_RULES = [
  { pattern: /\b(asap|same\s+day|today|right\s+now|immediate(ly)?|by\s+(end\s+of\s+)?today)\b/i,
    label: 'Same-day (urgent)', deltaDays: 1, severity: 'urgent' },
  { pattern: /\b(urgent|rush|tomorrow|by\s+tomorrow|24\s*hours?|overnight)\b/i,
    label: '1-3 days (urgent)', deltaDays: 2, severity: 'urgent' },
  { pattern: /\b(this\s+(weekend|week)|by\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|few\s+days|couple\s+of\s+days|\b[2-5]\s*days?)\b/i,
    label: '2-7 days', deltaDays: 5, severity: 'tight' },
  { pattern: /\b(next\s+week|in\s+a\s+week|one\s+week|1\s+week|7\s+days)\b/i,
    label: '~1 week', deltaDays: 7, severity: 'tight' },
  { pattern: /\b(two\s+weeks?|2\s+weeks?|fortnight|10\s+days?|14\s+days?)\b/i,
    label: '~2 weeks', deltaDays: 14, severity: 'standard' },
  { pattern: /\b(this\s+month|in\s+a\s+month|one\s+month|1\s+month|30\s+days)\b/i,
    label: '~1 month', deltaDays: 30, severity: 'standard' },
  { pattern: /\b(two\s+months?|2\s+months?|60\s+days?)\b/i,
    label: '~2 months', deltaDays: 60, severity: 'long' },
  { pattern: /\b(quarter|3\s+months?|three\s+months?|90\s+days?)\b/i,
    label: '~3 months (a quarter)', deltaDays: 90, severity: 'long' },
];

const TIMELINE_DEFAULT = { label: '1-2 weeks (no deadline specified)', deltaDays: 10, severity: 'default' };

export function extractTimeline(brief = '') {
  const text = String(brief || '');
  for (const rule of TIMELINE_RULES) {
    if (rule.pattern.test(text)) {
      const { pattern, ...rest } = rule;
      return rest;
    }
  }
  return TIMELINE_DEFAULT;
}

// ════════════════════════════════════════════════════════════════════
// 3. Tech stack extraction
// ════════════════════════════════════════════════════════════════════
const TECH_PATTERNS = {
  // Languages
  Python:       /\b(python|py3|django|flask|fastapi|pandas|numpy|pytorch|sklearn)\b/i,
  JavaScript:   /\b(javascript|js|es6|node\.?js|nodejs)\b/i,
  TypeScript:   /\b(typescript|ts|tsx)\b/i,
  Java:         /\b(java|jvm|spring|spring\s*boot|tomcat|maven|gradle)\b/i,
  Go:           /\b(golang|go\s+lang|gin\s+framework)\b/i,
  Rust:         /\brust\s+(lang|programming)\b|\bcargo\b/i,
  Ruby:         /\b(ruby|rails|ruby\s+on\s+rails)\b/i,
  PHP:          /\b(php|laravel|symfony|wordpress)\b/i,
  '.NET / C#':  /\b(\.net|dotnet|c#|asp\.net|csharp)\b/i,
  Swift:        /\b(swift\s+lang|swiftui|ios\s+app)\b/i,
  Kotlin:       /\b(kotlin|android\s+app)\b/i,
  // Frameworks
  React:        /\b(react|react\.?js|next\.?js|nextjs|gatsby|remix)\b/i,
  Vue:          /\b(vue|vue\.?js|nuxt|nuxt\.?js)\b/i,
  Angular:      /\b(angular|ng\s+cli)\b/i,
  Svelte:       /\b(svelte|sveltekit)\b/i,
  'Express.js': /\b(express\.?js|express\s+framework)\b/i,
  // Databases
  PostgreSQL:   /\b(postgres|postgresql|pgsql)\b/i,
  MySQL:        /\bmysql|mariadb\b/i,
  MongoDB:      /\b(mongo|mongodb|mongoose)\b/i,
  Redis:        /\bredis\b/i,
  // Tools / Infra
  Docker:       /\b(docker|dockerfile|docker[- ]?compose|container(s|ized)?)\b/i,
  Kubernetes:   /\b(kubernetes|k8s|kubectl|helm)\b/i,
  Terraform:    /\b(terraform|hcl|tf\s+module)\b/i,
  Jenkins:      /\b(jenkins|ci\s*\/\s*cd|cicd|github\s+actions|gitlab\s+ci)\b/i,
  Git:          /\b(git|github|gitlab|bitbucket|version\s+control)\b/i,
};

export function extractTechStack(brief = '') {
  const text = String(brief || '');
  const found = [];
  for (const [tech, pattern] of Object.entries(TECH_PATTERNS)) {
    if (pattern.test(text)) found.push(tech);
  }
  return found;
}

// ════════════════════════════════════════════════════════════════════
// 4. Client location (delegated to regionSuggester audience detection)
// ════════════════════════════════════════════════════════════════════
const LOCATION_KEYWORDS = [
  { audience: 'uk',             label: 'United Kingdom', patterns: [/\b(uk|united kingdom|great britain|britain|british|england|scotland|wales|london|\.co\.uk)\b/i] },
  { audience: 'us',             label: 'United States',  patterns: [/\b(usa|us\b|united states|america|nyc|san francisco|los angeles|chicago)\b/i] },
  { audience: 'eu',             label: 'Europe / EU',    patterns: [/\b(europe|european|eu(?!c)|germany|france|spain|italy|netherlands|ireland)\b/i] },
  { audience: 'africa',         label: 'West Africa',    patterns: [/\b(ghana|nigeria|lagos|accra|kenya|west africa)\b/i] },
  { audience: 'south-africa',   label: 'South Africa',   patterns: [/\b(south africa|johannesburg|cape town|pretoria)\b/i] },
  { audience: 'india',          label: 'India',          patterns: [/\b(india|mumbai|bangalore|bengaluru|delhi|chennai|hyderabad)\b/i] },
  { audience: 'apac',           label: 'Asia Pacific',   patterns: [/\b(singapore|tokyo|japan|china|korea|seoul|hong kong)\b/i] },
  { audience: 'middle-east',    label: 'Middle East',    patterns: [/\b(uae|dubai|abu dhabi|saudi|riyadh|bahrain)\b/i] },
  { audience: 'south-america',  label: 'South America',  patterns: [/\b(brazil|sao paulo|argentina|mexico|chile)\b/i] },
  { audience: 'canada',         label: 'Canada',         patterns: [/\b(canada|canadian|toronto|montreal|vancouver|ottawa)\b/i] },
  { audience: 'australia',      label: 'Australia',      patterns: [/\b(australia|sydney|melbourne|brisbane)\b/i] },
];

export function extractClientLocation(brief = '') {
  const text = String(brief || '');
  for (const loc of LOCATION_KEYWORDS) {
    if (loc.patterns.some((p) => p.test(text))) {
      return { audience: loc.audience, label: loc.label };
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════
// MAIN — extract everything from a brief in one call
// ════════════════════════════════════════════════════════════════════
export function extractFromBrief(brief = '') {
  return {
    projectName:    extractProjectName(brief),
    timeline:       extractTimeline(brief),
    techStack:      extractTechStack(brief),
    clientLocation: extractClientLocation(brief),
  };
}
