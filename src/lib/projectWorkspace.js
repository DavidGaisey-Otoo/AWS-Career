/**
 * projectWorkspace.js — one container per piece of client work.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * Everything this app produces for a single job is scattered across
 * separate stores: the solution and its generated templates in one, the
 * proposal in another, the emails in a third, the plan, the contract, the
 * invoice, the delivery package, the portfolio entry. Each page lists its
 * own kind and nothing answered the question that actually matters
 * mid-job — "what do I have for THIS client?"
 *
 * ════════════════════════════════════════════════════════════════════
 * FIELD NAMES ARE NOT GUESSES
 * ════════════════════════════════════════════════════════════════════
 * Every store names its fields differently, and the first version of this
 * module invented names that looked plausible — gigTitle for proposals,
 * projectTitle for invoices. Real proposals use jobTitle and real invoices
 * carry no project title at all, so nothing ever joined: the workspace
 * looked empty while the stores were full.
 *
 * FIELDS below is taken from the actual writers:
 *   proposals  FreelanceContext DEFAULT_STATE
 *   invoices   FreelanceContext DEFAULT_STATE
 *   emails     EarnContext DEFAULT_STATE
 *   plans      buildPlan            (data/projectPlan.js)
 *   contracts  buildContract        (data/documents.js)
 *   documents  buildDeliveryPackage (data/documents.js)
 *   solutions  saveSolution         (lib/gigSolutionPipeline.js)
 *
 * Change a writer, change this list, and add a test.
 *
 * ════════════════════════════════════════════════════════════════════
 * HOW THINGS ARE JOINED
 * ════════════════════════════════════════════════════════════════════
 * In order of trust:
 *
 *   1. An explicit projectId. Emails already carry one.
 *   2. A matching normalised title.
 *   3. The client name — but only when exactly one project belongs to
 *      that client. Invoices record a client and no project, so without
 *      this they could never be placed; with more than one candidate it
 *      is a coin toss, and a coin toss is not a join.
 *
 * Anything that cannot be placed is listed as unassigned rather than
 * filed under a project it may not belong to. A proposal shown against
 * the wrong client is worse than one shown against none.
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
  'solution', 'architecture', 'script', 'plan', 'proposal', 'email',
  'contract', 'invoice', 'document', 'deck', 'portfolio', 'caseStudy',
];

/** Where each kind keeps its title, client and date. See the header. */
const FIELDS = {
  proposal: { title: ['jobTitle', 'gigTitle', 'title'], client: ['clientName'], date: ['sentAt', 'createdAt', 'at'] },
  email:    { title: ['subject', 'title'], client: ['clientName'], date: ['at', 'createdAt'] },
  document: { title: ['projectTitle', 'name', 'title'], client: ['clientName', 'clientCompany'], date: ['createdAt', 'at'] },
  deck:     { title: ['name', 'title', 'brief'], client: ['clientName'], date: ['updatedAt', 'createdAt'] },
  contract: { title: ['title', 'name'], client: ['clientName'], date: ['createdAt'] },
  invoice:  { title: ['projectTitle', 'title'], client: ['clientName'], date: ['issuedAt', 'createdAt'] },
  plan:     { title: ['name', 'projectTitle', 'title'], client: ['clientName', 'clientCompany'], date: ['updatedAt', 'createdAt'] },
  solution:  { title: ['title', 'projectName', 'name'], client: ['clientName'], date: ['savedAt', 'updatedAt', 'createdAt'] },
  caseStudy: { title: ['title', 'name'], client: ['clientName'], date: ['completedAt', 'createdAt'] },
  portfolio: { title: ['title', 'name'], client: ['clientName'], date: ['updatedAt', 'startedAt'] },
  script:    { title: ['name'], client: [], date: [] },
};

/** The label each generated template carries in the container. */
const TEMPLATE_LABELS = {
  cfn: 'CloudFormation template',
  terraform: 'Terraform configuration',
  cli: 'AWS CLI commands',
};

const pick = (item, keys = []) => {
  for (const key of keys) {
    const value = item?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

const normaliseClient = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function emptyProject(id, title) {
  const artifacts = {};
  for (const k of ARTIFACT_KINDS) artifacts[k] = [];
  return { id, title, client: null, createdAt: null, updatedAt: null, region: null, services: [], artifacts };
}

const time = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isNaN(t) ? 0 : t;
};

const addServices = (project, list) => {
  if (!Array.isArray(list) || !list.length) return;
  project.services = [...new Set([
    ...project.services,
    ...list.map((x) => x?.label || x?.id || x?.name || x),
  ])].filter((x) => typeof x === 'string' && x);
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
    solutions = [], caseStudies = [], proposals = [], emails = [], portfolio = {},
    documents = [], decks = [], contracts = [], invoices = [], plans = [],
  } = stores;

  const projects = [];
  const unassigned = {};
  for (const k of ARTIFACT_KINDS) unassigned[k] = [];

  /** Find an existing project, or start one. */
  const locate = (projectId, title, { create = false, client = null } = {}) => {
    if (projectId) {
      const byId = projects.find((p) => p.id === projectId);
      if (byId) return byId;
    }
    if (title) {
      const byTitle = projects.find((p) => titlesMatch(p.title, title));
      if (byTitle) return byTitle;
    }
    if (client) {
      // Only when it is unambiguous. Two jobs for one client make this a
      // guess, and the record is better shown unassigned than misfiled.
      const wanted = normaliseClient(client);
      const candidates = projects.filter((p) => p.client && normaliseClient(p.client) === wanted);
      if (candidates.length === 1) return candidates[0];
    }
    if (!create) return null;
    const created = emptyProject(projectId || `proj-${projects.length + 1}`, title || 'Untitled project');
    created.client = client || null;
    projects.push(created);
    return created;
  };

  // Solutions anchor a project: they carry the gig, services and region,
  // and the generated templates that are the actual deliverable.
  for (const s of solutions) {
    const title = s.title || s.projectName || s.gigTitle || s.name || 'Untitled solution';
    const p = locate(s.id, title, { create: true });
    p.artifacts.solution.push(s);
    p.region = p.region || s.region || null;
    addServices(p, s.serviceLabels || s.serviceIds || s.services);
    p.client = p.client || s.clientName || s.client || null;
    p.createdAt = p.createdAt || s.savedAt || s.createdAt || s.at || null;
    p.updatedAt = Math.max(time(p.updatedAt), time(s.updatedAt || s.savedAt || s.createdAt)) || p.updatedAt;

    if (s.architecture || s.diagram) p.artifacts.architecture.push(s.architecture || s.diagram);

    // The configurations and commands — what the client is actually paying
    // for. These live inside the solution record and were never surfaced.
    for (const [key, code] of Object.entries(s.templates || {})) {
      if (!code) continue;
      p.artifacts.script.push({
        id: `${s.id}-${key}`,
        format: key,
        name: TEMPLATE_LABELS[key] || key,
        code,
        solutionId: s.id,
      });
    }

    if (s.plan) {
      p.artifacts.plan.push({
        ...s.plan,
        id: s.plan.id || `${s.id}-plan`,
        name: s.plan.name || `${title} — project plan`,
        solutionId: s.id,
      });
    }
  }

  // A completed case study is a finished piece of work, so it anchors a
  // project in the same way a solution does.
  for (const c of caseStudies) {
    const title = c.title || c.name || 'Untitled case study';
    const p = locate(c.id, title, { create: true });
    p.artifacts.caseStudy.push(c);
    p.region = p.region || c.region || null;
    p.client = p.client || c.client || null;
    p.createdAt = p.createdAt || c.completedAt || c.createdAt || null;
    p.updatedAt = Math.max(time(p.updatedAt), time(c.completedAt || c.createdAt)) || p.updatedAt;
  }

  // Portfolio entries are projects in their own right.
  for (const [pid, entry] of Object.entries(portfolio || {})) {
    const title = entry?.title || entry?.name || pid;
    const p = locate(pid, title, { create: true });
    p.artifacts.portfolio.push({ id: pid, ...entry });
    p.client = p.client || entry?.clientName || null;
    // A portfolio entry is keyed by the catalogue project id and stores
    // only progress, so its name and services come from the catalogue.
    // Without them the project shows as a raw slug like 'p-s3-cf'.
    addServices(p, entry?.services);
    p.updatedAt = Math.max(time(p.updatedAt), time(entry?.updatedAt || entry?.startedAt)) || p.updatedAt;
  }

  const place = (kind, item) => {
    if (!item) return;
    const map = FIELDS[kind] || {};
    const title = pick(item, map.title);
    const client = pick(item, map.client);
    const p = locate(item.projectId, title, { client });
    if (p) {
      p.artifacts[kind].push(item);
      p.client = p.client || client;
      p.updatedAt = Math.max(time(p.updatedAt), time(pick(item, map.date))) || p.updatedAt;
    } else {
      unassigned[kind].push(item);
    }
    // A delivery package carries the architecture diagram; it is the only
    // place one is stored, so surface it as architecture too.
    if (kind === 'document' && item.diagram) {
      const diagram = { id: `${item.id}-diagram`, ...item.diagram, fromDocument: item.id };
      if (p) p.artifacts.architecture.push(diagram);
      else unassigned.architecture.push(diagram);
    }
  };

  for (const x of proposals) place('proposal', x);
  for (const x of emails) place('email', x);
  for (const x of documents) place('document', x);
  for (const x of decks) place('deck', x);
  for (const x of contracts) place('contract', x);
  for (const x of invoices) place('invoice', x);
  for (const x of plans) place('plan', x);

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

/**
 * Some records have no title field at all — an invoice is identified by
 * its number, a diagram by nothing. Falling through to a generic label
 * like "Invoices record" is no use in a contents list, so name them from
 * what they do carry.
 */
const FALLBACK_TITLES = {
  invoice: (i) => (i.number ? `Invoice ${i.number}${i.clientName ? ' — ' + i.clientName : ''}` : null),
  architecture: () => 'Architecture diagram',
  script: (i) => i.name || null,
  solution: (i) => i.projectName || null,
};

/** The title an artifact of this kind should be listed under. */
export function artifactTitle(item, kind) {
  const direct = pick(item, FIELDS[kind]?.title);
  if (direct) return direct;
  const fallback = FALLBACK_TITLES[kind];
  return (fallback && item ? fallback(item) : null) || null;
}

/** The date an artifact of this kind should be listed under. */
export function artifactDate(item, kind) {
  return pick(item, FIELDS[kind]?.date) || null;
}

export const WORKSPACE_KINDS = ARTIFACT_KINDS;
export const WORKSPACE_FIELDS = FIELDS;
