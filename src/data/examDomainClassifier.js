/**
 * examDomainClassifier.js — EX-22: derive an SAA-C03 question's exam domain
 * from its content.
 *
 * ════════════════════════════════════════════════════════════════════
 * THE BUG THIS FIXES
 * ════════════════════════════════════════════════════════════════════
 * Every V2 bank file builds questions through a local factory that reads:
 *
 *     domainIds: q.domainIds || ['saa-d3']
 *
 * Five of the nine bank files never pass domainIds, so 549 of 744 SAA-C03
 * questions silently inherited Domain 3. Measured result: 83% of the bank
 * sat in a domain that is 24% of the real exam, while Domain 1 — the
 * largest at 30% — held 6%.
 *
 * The tags were provably wrong, not merely skewed: 104 questions tagged
 * Domain 3 carry topic 'Security' (Domain 1) and 51 carry 'Integration'
 * (Domain 2).
 *
 * Downstream damage: domain-filtered practice drew from tiny pools and
 * repeated the same questions, per-domain readiness scoring compared a
 * 46-question sample against a 616-question one, and examWeakness.js —
 * which the daily study plan depends on — keys off domainIds.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY A CLASSIFIER RATHER THAN EDITING 549 LITERALS
 * ════════════════════════════════════════════════════════════════════
 * One reviewable rule set beats 549 hand-edits nobody can audit, it keeps
 * improving in one place, and it protects future banks whose authors forget
 * the field again. Cost is a few hundred regex passes once at module load.
 *
 * Explicitly-tagged questions are never overridden — see shouldReclassify().
 *
 * ════════════════════════════════════════════════════════════════════
 * HOW IT DECIDES
 * ════════════════════════════════════════════════════════════════════
 * The exam sorts questions by WHAT IS BEING OPTIMISED FOR, not by which
 * service appears. "S3 lifecycle to cut spend" is Domain 4; "S3 storage
 * class for throughput" is Domain 3 — same service, different domain. So
 * intent language outweighs service names:
 *
 *     intent in the STEM      weight 6   ("most cost-effective", "highly available")
 *     service tag             weight 3   (iam → secure, spot → cost)
 *     intent in explanation   weight 2
 *     topic label             weight 2   (Security, Pricing)
 *     body keyword            weight 1   (weakest — services appear everywhere)
 *
 * Stem beats explanation deliberately. The `why` field describes why the
 * WINNING service wins, so it name-drops that service's characteristics —
 * an ElastiCache answer says "sub-millisecond" even when the question was
 * about surviving scale-in. Scoring both equally let the answer text
 * overrule the question's actual intent; splitting the weights fixed five
 * misclassifications in validation.
 *
 * Accuracy is measured against the 40 questions in
 * questionBankV2_saaMulti.js, which carry deliberate hand-assigned domains.
 * See the test in src/lib/__tests__/questionBank.test.js.
 */

export const SAA_DOMAINS = {
  D1: 'saa-d1',   // Design Secure Architectures — 30%
  D2: 'saa-d2',   // Design Resilient Architectures — 26%
  D3: 'saa-d3',   // Design High-Performing Architectures — 24%
  D4: 'saa-d4',   // Design Cost-Optimised Architectures — 20%
};

// ════════════════════════════════════════════════════════════════════
// Intent phrases — what the question is asking you to optimise for.
// These are the strongest signal because they mirror how AWS words the
// actual exam objectives.
// ════════════════════════════════════════════════════════════════════
const INTENT = {
  [SAA_DOMAINS.D4]: [
    /\bmost cost[- ]effective\b/i, /\bcost[- ]effective\b/i, /\bleast expensive\b/i,
    // "lowest possible compute cost" — allow words between the adjective and "cost"
    /\b(?:lowest|least|minimal)\b[^.]{0,25}\b(?:cost|price|spend|charge)/i,
    /\bminimi[sz]e\b[^.]{0,25}\b(?:cost|spend|charges|bill)/i,
    /\breduce\b[^.]{0,25}\b(?:cost|spend|charges|bill|footprint)/i,
    /\bcut\b[^.]{0,20}\b(?:cost|spend|bill)/i,
    /\bcheapest\b/i, /\bsave money\b/i, /\bcost saving/i, /\bbudget\b/i,
    /\bwithout (?:extra|additional) cost\b/i,
    // Bill-growth framing: "charges have grown", "a significant share of the bill"
    /\b(?:bill|charges|spend|cost)s?\b[^.]{0,30}\b(?:grown|grew|rising|risen|increase|climb|surpris)/i,
    /\bshare of the bill\b/i, /\bmonth[- ]on[- ]month\b/i,
    /\bmonthly (?:bill|spend|charges|cost)\b/i, /\bbill review\b/i,
    /\bline items?\b/i, /\bfinance (?:wants|asked|requires)\b/i,
    /\bfree tier\b/i, /\bcost optimi[sz]/i, /\bright[- ]siz/i,
    // Idle / oversized capacity is the classic cost signal
    /\bidle\b/i, /\bunused\b/i, /\bover[- ]provision/i, /\bsized for the (?:peak|month)/i,
    /\bsits? idle\b/i, /\bpay(?:ing)? (?:only|for) \b/i, /\bper[- ]hour charge/i,
    /\bdata (?:processing|transfer) charge/i, /\bscale down when idle\b/i,
  ],
  [SAA_DOMAINS.D1]: [
    /\bleast privilege\b/i, /\bmost secure\b/i, /\bsecurely\b/i,
    /\bencrypt(?:ed|ion)?\b/i, /\bdecrypt/i, /\bat rest\b/i, /\bin transit\b/i,
    /\bunauthori[sz]ed\b/i, /\bcompliance\b/i, /\bauditor?\b/i, /\baudit trail\b/i,
    /\bhipaa\b/i, /\bpci[- ]?dss\b/i, /\bgdpr\b/i, /\bfedramp\b/i, /\bsoc ?2\b/i,
    /\bmfa\b/i, /\bmulti[- ]factor\b/i, /\bcredential/i, /\bsecret/i,
    /\bpubl(?:ic|icly) (?:read|access|exposed|available)\b/i, /\bdata residency\b/i,
    /\bmust not (?:leave|traverse|be publicly)/i, /\bwho can (?:access|read|assume)\b/i,
    /\bpermission(?:s)? boundar/i, /\bexplicit deny\b/i, /\btamper/i,
    /\bfederat/i, /\bsingle sign[- ]on\b/i, /\bcross[- ]account\b/i,
    /\brotat(?:e|ion) (?:the )?(?:password|secret|credential|key)/i,
  ],
  [SAA_DOMAINS.D2]: [
    /\bhighly available\b/i, /\bhigh availability\b/i, /\bfault[- ]toleran/i,
    /\bresilien/i, /\bsurvive (?:the |an |a )?(?:loss|failure|outage)/i,
    /\bwithout (?:an |any )?outage\b/i, /\bfailover\b/i, /\bfail over\b/i,
    /\bdisaster recovery\b/i, /\brto\b/i, /\brpo\b/i, /\bpilot light\b/i,
    /\bwarm standby\b/i, /\bactive[- ]active\b/i, /\bdecoupl/i,
    /\bloosely coupled\b/i, /\bsingle point of failure\b/i, /\bredundan/i,
    /\bself[- ]heal/i, /\bno manual intervention\b/i, /\bautomatically replace/i,
    /\bretr(?:y|ies|ied)\b/i, /\bdead[- ]letter\b/i, /\bpoison message\b/i,
    /\bexactly once\b/i, /\bin order\b/i, /\bordering\b/i, /\bidempoten/i,
    /\baccidental (?:deletion|delete)/i, /\brestore\b/i, /\bpoint[- ]in[- ]time\b/i,
    /\bavailability zone (?:fail|loss|goes down|becomes unavail)/i,
    /\bbuffer\b/i, /\bspik(?:e|es|y)\b/i, /\babsorb\b/i,
    // Statelessness is a resilience goal: it is what makes instances disposable
    /\bstateless\b/i, /\bsession state\b/i, /\bdisposable\b/i,
    /\blogged out\b/i, /\bscale[- ]in\b/i, /\bterminat(?:es|ed|ion)\b/i,
    // Losing work is a resilience failure, not a cost one
    /\bdrop(?:s|ped|ping)? (?:requests|messages|uploads|events)\b/i,
    /\brequests are dropped\b/i, /\bwithout (?:losing|loss of)\b/i,
    // NOTE: "multi-AZ" is deliberately NOT an intent phrase. It appears
    // incidentally in performance questions ("60 instances across three AZs
    // need shared storage") where the ask is storage selection, not HA. It
    // still contributes as a service affinity signal.
  ],
  [SAA_DOMAINS.D3]: [
    /\bperformance\b/i, /\bhigh[- ]performing\b/i, /\blatency\b/i,
    /\bthroughput\b/i, /\biops\b/i, /\bsub[- ]?millisecond\b/i,
    /\bsingle[- ]digit millisecond\b/i, /\bmicrosecond\b/i,
    /\bslow(?:er|ly)?\b/i, /\bfaster\b/i, /\bbottleneck\b/i, /\bsaturat/i,
    /\bthrottl/i, /\bhot (?:partition|key|shard)\b/i,
    /\b\d+\s*(?:mb|gb|tb)\/s\b/i, /\bper second\b/i, /\brecords? per second\b/i,
    /\bconcurrent (?:users|requests|connections)\b/i,
    /\bscale to (?:handle|support|millions)\b/i, /\bcach(?:e|ing)\b/i,
    /\bquery (?:time|performance|speed)\b/i, /\bscan(?:ned|ning)? (?:bytes|hundreds)/i,
    /\bread[- ]heavy\b/i, /\bwrite[- ]heavy\b/i, /\bp99\b/i, /\bcold start\b/i,
    /\bingest/i, /\btransform/i, /\bshard/i, /\bpartition key\b/i,
  ],
};

// ════════════════════════════════════════════════════════════════════
// Service → domain affinity. Only services with a genuine lean are listed;
// ambiguous ones (s3, ec2, dynamodb, cloudfront, lambda) are deliberately
// absent so intent language decides.
// ════════════════════════════════════════════════════════════════════
const SERVICE_AFFINITY = {
  // ── Domain 1: secure ──
  iam: SAA_DOMAINS.D1, sts: SAA_DOMAINS.D1, kms: SAA_DOMAINS.D1,
  'secrets-manager': SAA_DOMAINS.D1, secretsmanager: SAA_DOMAINS.D1,
  secrets: SAA_DOMAINS.D1, acm: SAA_DOMAINS.D1, waf: SAA_DOMAINS.D1,
  shield: SAA_DOMAINS.D1, guardduty: SAA_DOMAINS.D1, macie: SAA_DOMAINS.D1,
  inspector: SAA_DOMAINS.D1, cloudtrail: SAA_DOMAINS.D1, config: SAA_DOMAINS.D1,
  organizations: SAA_DOMAINS.D1, scp: SAA_DOMAINS.D1, cognito: SAA_DOMAINS.D1,
  sso: SAA_DOMAINS.D1, 'identity-center': SAA_DOMAINS.D1, mfa: SAA_DOMAINS.D1,
  policy: SAA_DOMAINS.D1, 'bucket-policy': SAA_DOMAINS.D1,
  'permission-boundary': SAA_DOMAINS.D1, 'resource-policy': SAA_DOMAINS.D1,
  'security-group': SAA_DOMAINS.D1, sg: SAA_DOMAINS.D1, nacl: SAA_DOMAINS.D1,
  encryption: SAA_DOMAINS.D1, 'object-lock': SAA_DOMAINS.D1,
  cloudhsm: SAA_DOMAINS.D1, 'ssm-parameter': SAA_DOMAINS.D1,
  'session-manager': SAA_DOMAINS.D1, directoryservice: SAA_DOMAINS.D1,
  'access-analyzer': SAA_DOMAINS.D1, firewall: SAA_DOMAINS.D1,

  // ── Domain 2: resilient ──
  sqs: SAA_DOMAINS.D2, sns: SAA_DOMAINS.D2, eventbridge: SAA_DOMAINS.D2,
  'step-functions': SAA_DOMAINS.D2, stepfunctions: SAA_DOMAINS.D2,
  step: SAA_DOMAINS.D2, sfn: SAA_DOMAINS.D2, mq: SAA_DOMAINS.D2,
  asg: SAA_DOMAINS.D2, autoscaling: SAA_DOMAINS.D2, 'auto-scaling': SAA_DOMAINS.D2,
  'ec2-autoscale': SAA_DOMAINS.D2, dlq: SAA_DOMAINS.D2,
  backup: SAA_DOMAINS.D2, 'aws-backup': SAA_DOMAINS.D2, dr: SAA_DOMAINS.D2,
  versioning: SAA_DOMAINS.D2, crr: SAA_DOMAINS.D2, replication: SAA_DOMAINS.D2,
  'multi-az': SAA_DOMAINS.D2, 'health-check': SAA_DOMAINS.D2,
  'filter-policy': SAA_DOMAINS.D2, 'visibility-timeout': SAA_DOMAINS.D2,
  fifo: SAA_DOMAINS.D2, 'point-in-time': SAA_DOMAINS.D2,

  // ── Domain 3: performance ──
  ebs: SAA_DOMAINS.D3, efs: SAA_DOMAINS.D3, fsx: SAA_DOMAINS.D3,
  'instance-store': SAA_DOMAINS.D3, 'placement-group': SAA_DOMAINS.D3,
  elasticache: SAA_DOMAINS.D3, redis: SAA_DOMAINS.D3, memcached: SAA_DOMAINS.D3,
  dax: SAA_DOMAINS.D3, 'global-accelerator': SAA_DOMAINS.D3,
  'read-replica': SAA_DOMAINS.D3, aurora: SAA_DOMAINS.D3,
  redshift: SAA_DOMAINS.D3, athena: SAA_DOMAINS.D3, glue: SAA_DOMAINS.D3,
  emr: SAA_DOMAINS.D3, kinesis: SAA_DOMAINS.D3, firehose: SAA_DOMAINS.D3,
  msk: SAA_DOMAINS.D3, kafka: SAA_DOMAINS.D3, opensearch: SAA_DOMAINS.D3,
  elasticsearch: SAA_DOMAINS.D3, quicksight: SAA_DOMAINS.D3,
  directconnect: SAA_DOMAINS.D3, 'direct-connect': SAA_DOMAINS.D3, dx: SAA_DOMAINS.D3,
  tgw: SAA_DOMAINS.D3, 'transit-gateway': SAA_DOMAINS.D3,
  'vpc-peering': SAA_DOMAINS.D3, nlb: SAA_DOMAINS.D3, alb: SAA_DOMAINS.D3,
  'data-streams': SAA_DOMAINS.D3, shard: SAA_DOMAINS.D3,
  'enhanced-fan-out': SAA_DOMAINS.D3, multipart: SAA_DOMAINS.D3,
  'transfer-acceleration': SAA_DOMAINS.D3, datasync: SAA_DOMAINS.D3,
  'storage-gateway': SAA_DOMAINS.D3, snowball: SAA_DOMAINS.D3,
  ecs: SAA_DOMAINS.D3, eks: SAA_DOMAINS.D3, fargate: SAA_DOMAINS.D3,
  'partition-key': SAA_DOMAINS.D3, gsi: SAA_DOMAINS.D3, lsi: SAA_DOMAINS.D3,

  // ── Domain 4: cost ──
  spot: SAA_DOMAINS.D4, reserved: SAA_DOMAINS.D4, ri: SAA_DOMAINS.D4,
  'savings-plan': SAA_DOMAINS.D4, 'savings-plans': SAA_DOMAINS.D4,
  lifecycle: SAA_DOMAINS.D4, 'intelligent-tiering': SAA_DOMAINS.D4,
  glacier: SAA_DOMAINS.D4, 'deep-archive': SAA_DOMAINS.D4,
  'storage-class': SAA_DOMAINS.D4, 'one-zone': SAA_DOMAINS.D4, ia: SAA_DOMAINS.D4,
  budgets: SAA_DOMAINS.D4, 'cost-explorer': SAA_DOMAINS.D4,
  'trusted-advisor': SAA_DOMAINS.D4, 'cost-allocation': SAA_DOMAINS.D4,
  'compute-optimizer': SAA_DOMAINS.D4, graviton: SAA_DOMAINS.D4,
  'nat-instance': SAA_DOMAINS.D4, pricing: SAA_DOMAINS.D4,
  'data-transfer': SAA_DOMAINS.D4, 'requester-pays': SAA_DOMAINS.D4,
};

// Topic labels used across the banks → their natural domain.
const TOPIC_AFFINITY = {
  Security: SAA_DOMAINS.D1,
  Integration: SAA_DOMAINS.D2,
  Storage: SAA_DOMAINS.D3,
  Compute: SAA_DOMAINS.D3,
  Database: SAA_DOMAINS.D3,
  Networking: SAA_DOMAINS.D3,
  Analytics: SAA_DOMAINS.D3,
  'ML/AI': SAA_DOMAINS.D3,
  Migration: SAA_DOMAINS.D3,
  Pricing: SAA_DOMAINS.D4,
};

const WEIGHT = { stemIntent: 6, service: 3, explainIntent: 2, topic: 2, body: 1 };

// Weakest signal — bare service names in the prose.
const BODY_HINTS = {
  [SAA_DOMAINS.D1]: /\b(iam|kms|encrypt|policy|role|credential|compliance|audit)\b/i,
  [SAA_DOMAINS.D2]: /\b(sqs|sns|eventbridge|queue|auto scaling|standby|replica set|backup)\b/i,
  [SAA_DOMAINS.D3]: /\b(latency|throughput|iops|cache|shard|replica|index)\b/i,
  [SAA_DOMAINS.D4]: /\b(cost|price|spot|reserved|lifecycle|glacier|savings)\b/i,
};

/**
 * Score a question against all four domains and return the winner plus the
 * evidence, so a human can audit any individual decision.
 *
 * @returns {{ domainId: string, scores: object, confidence: number, evidence: string[] }}
 */
export function classifyDomain(q) {
  // The stem is what the candidate is being ASKED. Everything else explains
  // the answer, so it leans toward the winning service's vocabulary.
  const stem = String(q.q || '');
  const explanation = [q.why, q.concept, ...(q.options || [])].filter(Boolean).join(' ');
  const text = `${stem} ${explanation}`;
  const services = (q.service || []).map((s) => String(s).toLowerCase());
  const scores = Object.fromEntries(Object.values(SAA_DOMAINS).map((d) => [d, 0]));
  const evidence = [];

  // 1. Intent phrases — weighted by where they appear.
  //
  // Matches are de-duplicated per domain by the text they matched, because
  // the pattern lists deliberately overlap (a broad /\bidle\b/ alongside a
  // specific /\bsits? idle\b/). Without this, redundancy in the rule list
  // inflates a score rather than reflecting stronger evidence.
  for (const [domain, patterns] of Object.entries(INTENT)) {
    const seen = new Set();
    for (const p of patterns) {
      const inStem = stem.match(p);
      const hit = inStem || explanation.match(p);
      if (!hit) continue;

      const key = hit[0].toLowerCase().trim();
      if (seen.has(key)) continue;
      // Also skip a match wholly contained in one already counted
      if ([...seen].some((s) => s.includes(key) || key.includes(s))) continue;
      seen.add(key);

      if (inStem) {
        scores[domain] += WEIGHT.stemIntent;
        if (evidence.length < 6) evidence.push(`stem "${hit[0]}" → ${domain}`);
      } else {
        scores[domain] += WEIGHT.explainIntent;
        if (evidence.length < 6) evidence.push(`why "${hit[0]}" → ${domain}`);
      }
    }
  }

  // 2. Service tags
  for (const s of services) {
    const domain = SERVICE_AFFINITY[s];
    if (domain) {
      scores[domain] += WEIGHT.service;
      if (evidence.length < 6) evidence.push(`service "${s}" → ${domain}`);
    }
  }

  // 3. Topic label
  const topicDomain = TOPIC_AFFINITY[q.topic];
  if (topicDomain) {
    scores[topicDomain] += WEIGHT.topic;
    if (evidence.length < 6) evidence.push(`topic "${q.topic}" → ${topicDomain}`);
  }

  // 4. Body hints — tie-breaking texture only
  for (const [domain, pattern] of Object.entries(BODY_HINTS)) {
    if (pattern.test(text)) scores[domain] += WEIGHT.body;
  }

  // Winner. Ties resolve toward the domain with the larger exam weight,
  // because that is where extra practice is worth more to the candidate.
  const order = [SAA_DOMAINS.D1, SAA_DOMAINS.D2, SAA_DOMAINS.D3, SAA_DOMAINS.D4];
  let best = order[0];
  for (const d of order) if (scores[d] > scores[best]) best = d;

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = total === 0 ? 0 : scores[best] / total;

  // Some questions genuinely belong to two domains — "reach S3 privately from
  // a VPC with no internet route" is both secure access (1.1) and network
  // design (3.4), and AWS's own exam guide lists VPC endpoints under both.
  // Forcing one answer loses the question from the other domain's practice
  // pool, so a strong runner-up is kept. domainIds was always an array.
  const RUNNER_UP_THRESHOLD = 0.7;
  const domainIds = [best];
  for (const d of order) {
    if (d !== best && scores[best] > 0 && scores[d] / scores[best] >= RUNNER_UP_THRESHOLD) {
      domainIds.push(d);
    }
  }

  return { domainId: best, domainIds, scores, confidence, evidence };
}

/**
 * Which questions may be reclassified.
 *
 * Only the five banks that never passed domainIds — their tag is the
 * factory default, i.e. no information. Banks whose authors declared a
 * domain are left exactly as written, so deliberate tagging always wins
 * over inference.
 */
const DEFAULTED_ID_PATTERN = /^(saa-mega-|saa-combo-|saa-xl-|fill-)/;

export function shouldReclassify(q) {
  return DEFAULTED_ID_PATTERN.test(String(q.id || ''))
    && (q.certIds || []).includes('saa-c03');
}

/**
 * Apply the classifier across a bank, returning a new array. Questions that
 * declared their own domain pass through untouched.
 *
 * Each reclassified question keeps an audit trail:
 *   _domainSource: 'classified'   _domainWas: ['saa-d3']
 */
export function applyDomainClassification(bank) {
  return bank.map((q) => {
    if (!shouldReclassify(q)) return q;
    const { domainIds, confidence } = classifyDomain(q);
    const same = domainIds.length === (q.domainIds || []).length
      && domainIds.every((d, i) => d === q.domainIds[i]);
    if (same) return q;
    return {
      ...q,
      domainIds,
      _domainSource: 'classified',
      _domainConfidence: Math.round(confidence * 100) / 100,
      _domainWas: q.domainIds,
    };
  });
}

/**
 * Questions the classifier was least sure about — for human review. Low
 * confidence usually means the question is genuinely cross-domain or is
 * worded without any optimisation signal at all.
 */
export function lowConfidenceQuestions(bank, threshold = 0.45) {
  return bank
    .filter(shouldReclassify)
    .map((q) => ({ q, ...classifyDomain(q) }))
    .filter((x) => x.confidence < threshold)
    .sort((a, b) => a.confidence - b.confidence);
}
