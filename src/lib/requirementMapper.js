/**
 * requirementMapper.js — BUILD-01: plain English → AWS architecture.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY THIS EXISTS
 * ════════════════════════════════════════════════════════════════════
 * The existing detectors (serviceSuggester, projectAnalyzer) match AWS
 * vocabulary — "Lambda", "DynamoDB", "serverless", "high availability".
 * That works on a job spec written by an engineer and fails completely on
 * how a person actually describes what they want:
 *
 *   "A booking system for my barber shop. Customers pick a slot online,
 *    get an SMS reminder, and the barber sees the day's appointments."
 *
 *   → old detectors: ZERO services found.
 *
 * Which defeats the whole purpose of a "describe what you want to build"
 * box, because the people who most need it are exactly the people who
 * won't write "I need an API Gateway".
 *
 * ════════════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ════════════════════════════════════════════════════════════════════
 * Two steps, deliberately separated:
 *
 *   1. CAPABILITIES — what does this thing have to DO? "get an SMS
 *      reminder" is the capability `notify-sms`; "customers pick a slot"
 *      is `web-frontend` + `store-records`. This layer is pure product
 *      language and contains no AWS terms at all.
 *
 *   2. SERVICES — each capability maps to the AWS services that implement
 *      it, with the choice adjusted by scale and cost signals. Low traffic
 *      and "keep it cheap" pushes serverless; high throughput pulls in
 *      caching and a CDN.
 *
 * Splitting them means the reasoning is inspectable — the UI can show
 * "you said SMS reminders → that needs SNS" rather than an unexplained
 * list of services.
 */

// ════════════════════════════════════════════════════════════════════
// 1. Capability detection — product language only, no AWS terms
// ════════════════════════════════════════════════════════════════════
const CAPABILITIES = [
  {
    id: 'web-frontend',
    label: 'A website or web app people visit',
    patterns: [
      /\b(website|web ?app|web ?site|landing page|portal|online|browser|front[- ]?end|ui|dashboard people|customer[- ]facing)\b/i,
      /\b(customers?|users?|clients?|people|visitors?)\s+(?:can\s+)?(?:pick|choose|book|browse|view|see|visit|order|select|sign)\b/i,
    ],
  },
  {
    id: 'mobile-app',
    label: 'A mobile app',
    patterns: [/\b(mobile app|ios|android|phone app|app store)\b/i],
  },
  {
    id: 'api',
    label: 'An API or backend for something else to call',
    patterns: [
      /\b(api|backend|back[- ]?end|endpoint|rest|graphql|microservice|server[- ]side)\b/i,
      /\b(redirects?|short(?:en)?(?:er|ed)? ?url|webhook|callback)\b/i,
    ],
  },
  {
    id: 'store-records',
    label: 'Store structured records',
    patterns: [
      /\b(bookings?|appointments?|orders?|reservations?|customers?|inventory|products?|records?|entries|listings?|tickets?|invoices?|transactions?|accounts?|profiles?|posts?|messages?)\b/i,
      /\b(save|store|keep|track|record|log)\s+(?:the\s+|their\s+|all\s+)?\w+/i,
    ],
  },
  {
    id: 'store-files',
    label: 'Store files, images or documents',
    patterns: [
      /\b(upload|files?|images?|photos?|pictures?|videos?|documents?|attachments?|csv|pdf|media|assets?|recordings?|scans?)\b/i,
    ],
  },
  {
    id: 'auth',
    label: 'People sign in',
    patterns: [
      /\b(log ?in|login|sign ?in|sign ?up|register|account|authenticat|password|user accounts?|members?|profiles?)\b/i,
    ],
  },
  {
    id: 'notify-sms',
    label: 'Send SMS or text messages',
    patterns: [/\b(sms|text message|text reminder|texts? (?:them|the|customers?)|whatsapp)\b/i],
  },
  {
    id: 'notify-email',
    label: 'Send email',
    patterns: [/\b(e-?mails?|newsletter|email (?:them|reminder|confirmation|receipt))\b/i],
  },
  {
    id: 'notify-push',
    label: 'Push notifications',
    patterns: [/\b(push notification|notify the app|alerts? on their phone)\b/i],
  },
  {
    id: 'schedule',
    label: 'Something happens on a schedule',
    patterns: [
      /\b(remind|reminders?|scheduled?|daily|nightly|weekly|monthly|every (?:day|night|hour|morning)|cron|recurring|automatically at)\b/i,
    ],
  },
  {
    id: 'background-work',
    label: 'Work that happens in the background',
    patterns: [
      /\b(process(?:es|ing)?|validat|transform|convert|resize|generat|import|ingest|background|queue|worker|batch|pipeline)\b/i,
    ],
  },
  {
    id: 'realtime',
    label: 'Live or real-time updates',
    patterns: [/\b(real[- ]?time|live|instant|chat|messaging|websocket|as it happens|streaming)\b/i],
  },
  {
    id: 'analytics',
    label: 'Reporting, dashboards or querying data',
    patterns: [
      /\b(dashboard|report(?:s|ing)?|analytics?|insights?|metrics|statistics|stats|query the|business intelligence|charts?|trends?)\b/i,
    ],
  },
  {
    id: 'search',
    label: 'Search across content',
    patterns: [/\b(search|find (?:by|across)|full[- ]text|filter through)\b/i],
  },
  {
    id: 'global-fast',
    label: 'Fast for users around the world',
    patterns: [
      /\b(worldwide|globally|global users?|around the world|different countries|continents?|multiple regions?|fast everywhere|low latency)\b/i,
    ],
  },
  {
    id: 'high-traffic',
    label: 'Handles heavy traffic',
    patterns: [
      /\b(\d[\d,.]*\s*(?:k|m|thousand|million)?\s*(?:requests?|users?|visitors?|hits?|redirects?|events?|transactions?)\s*(?:per|a|\/)\s*(?:second|sec|minute|day))\b/i,
      /\b(high[- ]traffic|heavy load|scale to|millions? of|viral|spikes?)\b/i,
    ],
  },
  {
    id: 'payments',
    label: 'Takes payments',
    patterns: [/\b(payments?|checkout|billing|subscriptions?|card|stripe|paypal|pay online)\b/i],
  },
  {
    id: 'ml',
    label: 'Predictions, recommendations or AI',
    patterns: [/\b(recommend|predict|classif|machine learning|\bml\b|\bai\b|chatbot|sentiment|detect (?:objects|faces|fraud))\b/i],
  },
];

/**
 * Which AWS services implement each capability.
 * `core` is always added; `atScale` only when traffic signals are present.
 */
const CAPABILITY_SERVICES = {
  'web-frontend':    { core: ['s3', 'cloudfront'], atScale: [] },
  'mobile-app':      { core: ['apigw', 'lambda'], atScale: [] },
  api:               { core: ['apigw', 'lambda'], atScale: ['elasticache'] },
  'store-records':   { core: ['dynamodb'], atScale: ['dynamodb'] },
  'store-files':     { core: ['s3'], atScale: ['cloudfront'] },
  auth:              { core: ['cognito'], atScale: [] },
  'notify-sms':      { core: ['sns'], atScale: [] },
  'notify-email':    { core: ['ses'], atScale: [] },
  'notify-push':     { core: ['sns'], atScale: [] },
  schedule:          { core: ['eventbridge', 'lambda'], atScale: [] },
  'background-work': { core: ['sqs', 'lambda'], atScale: [] },
  realtime:          { core: ['apigw', 'dynamodb'], atScale: ['elasticache'] },
  analytics:         { core: ['athena', 's3'], atScale: ['glue'] },
  search:            { core: ['opensearch'], atScale: [] },
  'global-fast':     { core: ['cloudfront'], atScale: ['route53'] },
  'high-traffic':    { core: ['cloudfront', 'elasticache'], atScale: ['asg'] },
  payments:          { core: ['secrets-manager', 'kms'], atScale: [] },
  ml:                { core: ['bedrock'], atScale: [] },
};

// Every real build needs these, and beginners forget them.
const BASELINE = ['iam', 'cloudwatch'];

/**
 * Relational is the better fit when the description implies relationships
 * between records — orders belonging to customers, invoices to accounts.
 */
const RELATIONAL_HINTS =
  /\b(relational|sql|postgres|mysql|joins?|reporting across|orders? (?:and|for) customers?|invoices?|accounting|ledger|inventory management)\b/i;

/**
 * Detect capabilities in a plain-language description.
 * @returns {Array<{id, label, matched}>}
 */
export function detectCapabilities(brief) {
  const text = String(brief || '');
  if (!text.trim()) return [];
  const found = [];
  for (const cap of CAPABILITIES) {
    for (const p of cap.patterns) {
      const m = text.match(p);
      if (m) {
        found.push({ id: cap.id, label: cap.label, matched: m[0].trim() });
        break;
      }
    }
  }
  return found;
}

/**
 * Map a plain-language description to an AWS service list, with the
 * reasoning attached so it can be shown to the user.
 *
 * @returns {{ serviceIds, capabilities, reasons, isServerless }}
 */
export function mapRequirements(brief) {
  const text = String(brief || '');
  const capabilities = detectCapabilities(text);

  const scaleSignal = capabilities.some((c) => ['high-traffic', 'global-fast'].includes(c.id));
  const cheapSignal = /\b(cheap|cheapest|low cost|tight budget|minimal cost|small budget|keep costs? down|afford)\b/i.test(text);
  const smallScale = /\b(small|a few hundred|hundreds of|\b[1-9]\d{0,2}\s*(?:customers?|users?|people)\b)\b/i.test(text);

  const services = new Set();
  const reasons = [];

  for (const cap of capabilities) {
    const map = CAPABILITY_SERVICES[cap.id];
    if (!map) continue;
    for (const s of map.core) services.add(s);
    if (scaleSignal) for (const s of map.atScale) services.add(s);
    reasons.push({
      capability: cap.label,
      because: `"${cap.matched}"`,
      services: map.core,
    });
  }

  // Relational vs key-value: DynamoDB is the default, but swap when the
  // description implies related records and there is no scale pressure.
  if (services.has('dynamodb') && RELATIONAL_HINTS.test(text) && !scaleSignal) {
    services.delete('dynamodb');
    services.add('rds');
    reasons.push({
      capability: 'Records relate to each other',
      because: 'phrasing implies joins across entities',
      services: ['rds'],
    });
  }

  // ── Completeness rules ───────────────────────────────────────────
  // A terse brief often names only the interesting part. These fill in
  // what any working system must have, so the plan is buildable rather
  // than a literal reading of the sentence.

  // Anything that stores or serves data needs somewhere to run logic.
  const hasCompute = ['lambda', 'ec2', 'ecs'].some((s) => services.has(s));
  if (!hasCompute && services.size > 0) {
    services.add('lambda');
    reasons.push({
      capability: 'Somewhere to run the logic',
      because: 'every build needs compute',
      services: ['lambda'],
    });
  }

  // You cannot serve an API or report on data you never stored. "A URL
  // shortener with click analytics" never says "store" but obviously must.
  const hasStore = ['dynamodb', 'rds', 'aurora'].some((s) => services.has(s));
  const needsStore = capabilities.some((c) =>
    ['api', 'analytics', 'auth', 'realtime', 'high-traffic', 'payments', 'search'].includes(c.id));
  if (!hasStore && needsStore) {
    services.add('dynamodb');
    reasons.push({
      capability: 'Somewhere to keep the data',
      because: 'the described features have to read and write state',
      services: ['dynamodb'],
    });
  }

  // Cheap + small pushes away from always-on infrastructure.
  if ((cheapSignal || smallScale) && !scaleSignal) {
    services.delete('elasticache');
    services.delete('asg');
    if (services.has('rds') && cheapSignal && smallScale) {
      services.delete('rds');
      services.add('dynamodb');
      reasons.push({
        capability: 'Keeping it cheap at small scale',
        because: 'pay-per-request beats an always-on database',
        services: ['dynamodb'],
      });
    }
  }

  if (services.size > 0) for (const s of BASELINE) services.add(s);

  return {
    serviceIds: [...services],
    capabilities,
    reasons,
    isServerless: !services.has('ec2') && !services.has('rds'),
    signals: { scale: scaleSignal, cheap: cheapSignal, small: smallScale },
  };
}
