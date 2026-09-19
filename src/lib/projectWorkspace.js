/**
 * projectWorkspace.js — one container per piece of client work.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * Everything this app produces for a single job is scattered across
 * separate stores: the solution and architecture in one, the proposal in
 * another, the emails in a third, the portfolio entry, the deck, the
 * contract, the invoice, the generated scripts. Each page lists its own
 * kind and nothing answers the question that actually matters mid-job —
 * "what do I have for THIS client?"
 *
 * That is also why the app looked like it had no CRM. The records exist;
 * nothing ever joined them up.
 *
 * ════════════════════════════════════════════════════════════════════
 * HOW THINGS ARE JOINED
 * ════════════════════════════════════════════════════════════════════
 * In order of trust:
 *
 *   1. An explicit projectId. Emails already carry one; anything else
 *      that gains one is picked up for free.
 *   2. A matching normalised title. Artifacts made from the same gig
 *      inherit its wording, so this catches most real cases.
 *
 * Nothing is joined on a guess weaker than that. An artifact that cannot
 * be placed is listed as unassigned rather than filed under a project it
 * may not belong to — a proposal shown against the wrong client is worse
 * than one shown against none.
 */

/** Strip wording that varies between artifacts made from the same gig. */
export function normaliseTitle(title = '') {
  return String(title)
    .toLowerCase()
    .replace(/\b(aws|amazon|project|solution|proposal|for|the|a|an|on|with|to|need|needed|required)\b/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Do two titles describe the same piece of work? */
export function titlesMatch(a, b) {
  const x = normaliseTitle(a);
  const y = normaliseTitle(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // One being contained in the other covers "Secure static site" against
  // "Secure static site for UK retailer", which are the same job.
  if (x.length >= 12 && y.length >= 12 && (x.includes(y) || y.includes(x))) return true;
  const ax = new Set(x.split(' ').filter((w) => w.length > 3));
  const ay = new Set(y.split(' ').filter((w) => w.length > 3));
  if (ax.size < 2 || ay.size < 2) return false;
  let shared = 0;
  for (const w of ax) if (ay.has(w)) shared++;
  return shared / Math.min(ax.size, ay.size) >= 0.7;
}

const ARTIFACT_KINDS = [
  'solution', 'architecture', 'proposal', 'email', 'portfolio',
  'document', 'deck', 'contract', 'invoice', 'plan', 'script',
];

function emptyProject(id, title) {
  const artifacts = {};
  for (const k of ARTIFACT_KINDS) artifacts[k] = [];
  return { id, title, client: null, createdAt: null, updatedAt: null, region: null, services: [], artifacts };
}

const time = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Build the workspace.
 *
 * @param {object} stores — whatever is available; every field optional,
 *   because a user who has never written a proposal must still get a
 *   working view rather than an exception.
 * @returns {{ projects: [], unassigned: {}, totals: {} }}
 */
export function buildWorkspace(stores = {}) {
  const {
    solutions = [], proposals = [], emails = [], portfolio = {},
    documents = [], decks = [], contracts = [], invoices = [], plans = [],
  } = stores;

  const projects = [];
  const unassigned = {};
  for (const k of ARTIFACT_KINDS) unassigned[k] = [];

  /** Find an existing project, or start one. */
  const locate = (projectId, title, { create = false } = {}) => {
    if (projectId) {
      const byId = projects.find((p) => p.id === projectId);
      if (byId) return byId;
    }
    if (title) {
      const byTitle = projects.find((p) => titlesMatch(p.title, title));
      if (byTitle) return byTitle;
    }
    if (!create) return null;
    const created = emptyProject(projectId || `proj-${projects.length + 1}`, title || 'Untitled project');
    projects.push(created);
    return created;
  };

  // Solutions anchor a project: they carry the gig, services and region.
  for (const s of solutions) {
    const title = s.title || s.gigTitle || s.name || 'Untitled solution';
    const p = locate(s.id, title, { create: true });
    p.artifacts.solution.push(s);
    p.region = p.region || s.region || null;
    if (Array.isArray(s.services) && s.services.length) {
      p.services = [...new Set([...p.services, ...s.services.map((x) => x?.id || x?.name || x)])].filter(Boolean);
    }
    if (s.architecture || s.diagram) p.artifacts.architecture.push(s.architecture || s.diagram);
    p.client = p.client || s.client || s.clientName || null;
    p.createdAt = p.createdAt || s.createdAt || s.at || null;
    p.updatedAt = Math.max(time(p.updatedAt), time(s.updatedAt || s.createdAt || s.at)) || p.updatedAt;
  }

  // Portfolio entries are projects in their own right.
  for (const [pid, entry] of Object.entries(portfolio || {})) {
    const title = entry?.title || entry?.name || pid;
    const p = locate(pid, title, { create: true });
    p.artifacts.portfolio.push({ id: pid, ...entry });
    p.client = p.client || entry?.clientName || null;
  }

  const place = (kind, item, { projectId, title }) => {
    const p = locate(projectId, title);
    if (p) p.artifacts[kind].push(item);
    else unassigned[kind].push(item);
  };

  for (const x of proposals) place('proposal', x, { projectId: x.projectId, title: x.gigTitle || x.title });
  for (const x of emails) place('email', x, { projectId: x.projectId, title: x.subject || x.title });
  for (const x of documents) place('document', x, { projectId: x.projectId, title: x.name || x.title });
  for (const x of decks) place('deck', x, { projectId: x.projectId, title: x.name || x.brief });
  for (const x of contracts) place('contract', x, { projectId: x.projectId, title: x.name || x.title });
  for (const x of invoices) place('invoice', x, { projectId: x.projectId, title: x.projectTitle || x.title });
  for (const x of plans) place('plan', x, { projectId: x.projectId, title: x.projectTitle || x.title });

  // Newest work first — that is what someone mid-job is looking for.
  for (const p of projects) {
    p.artifactCount = ARTIFACT_KINDS.reduce((n, k) => n + p.artifacts[k].length, 0);
    p.updatedAt = p.updatedAt || p.createdAt;
  }
  projects.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));

  const totals = {};
  for (const k of ARTIFACT_KINDS) {
    totals[k] = projects.reduce((n, p) => n + p.artifacts[k].length, 0) + unassigned[k].length;
  }
  totals.projects = projects.length;

  return { projects, unassigned, totals };
}

/** Everything of one kind, across every project — the "pool" view. */
export function pool(workspace, kind) {
  const out = [];
  for (const p of workspace.projects || []) {
    for (const item of p.artifacts?.[kind] || []) out.push({ ...item, __project: p.title, __projectId: p.id });
  }
  for (const item of workspace.unassigned?.[kind] || []) out.push({ ...item, __project: null, __projectId: null });
  return out;
}

export const WORKSPACE_KINDS = ARTIFACT_KINDS;
