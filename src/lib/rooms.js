/**
 * rooms.js — the office layout.
 *
 * Seven rooms, each one page with a row of tabs, laid out along the life
 * of a job: find it, win it, look after the client, get paid, build it,
 * grow from it. Today sits in front of them all.
 *
 * Plain data, so the tests can read it without a browser. The components
 * each tab shows are mapped in src/pages/Room.jsx; the icons in
 * src/lib/navSections.js.
 *
 * Every address the app used before the rooms existed still works:
 * resolveLegacy() sends it to the tab that now holds that tool.
 */

export const ROOMS = Object.freeze([
  {
    id: 'find', label: 'Find work',
    blurb: 'Gigs worth your time, and what to charge for them.',
    tabs: [
      { id: 'gigs',   label: 'Live gigs', blurb: 'Freelance gigs and remote jobs from seven job boards: checked, split by type, and matched to your preferences.' },
      { id: 'daily',  label: 'Daily check', blurb: 'Your Upwork routine: saved searches with the right filters, the checklist, and what you checked today.' },
      { id: 'check',  label: 'Check a job post', blurb: 'Paste the whole Upwork job page: GO, MAYBE or SKIP for your level, the client signals, and what the Connects cost.' },
      { id: 'market', label: 'Market rates' },
      { id: 'rates',  label: 'Rate calculator' },
    ],
  },
  {
    id: 'jobs', label: 'Jobs',
    blurb: 'Every job from first brief to signed proposal.',
    tabs: [
      { id: 'packs',     label: 'Gig packs', blurb: 'Every Upwork job Claude prepared: fit, proposal, plan, diagram, a lesson read aloud, and the messages to send.' },
      { id: 'all',       label: 'All jobs' },
      { id: 'new',       label: 'New job' },
      { id: 'proposals', label: 'Proposals', blurb: 'Write a proposal, track who has replied, and borrow from a template.' },
      { id: 'deliver',   label: 'Delivery', blurb: 'Deliver a won job: ask for safe access, prove you are in the client’s account, work the steps with an undo for each, and hand over a report.' },
      { id: 'time',      label: 'Time', blurb: 'Time each job, see your week, and turn the hours into an invoice.' },
      { id: 'call',      label: 'Call prep' },
      { id: 'plan',      label: 'Project plan' },
      { id: 'deck',      label: 'Client deck' },
    ],
  },
  {
    id: 'clients', label: 'Clients',
    blurb: 'The people you work for, what you send them, and what they sign.',
    tabs: [
      { id: 'list',      label: 'Clients', blurb: 'Everyone you work for, and every conversation with them.' },
      { id: 'emails',    label: 'Emails' },
      { id: 'paperwork', label: 'Contracts & invoices' },
    ],
  },
  {
    id: 'money', label: 'Money',
    blurb: 'What came in, what went out, and where you stand against your goal.',
    tabs: [
      { id: 'overview', label: 'Earnings', blurb: 'What came in this month against your goal, and every payment.' },
      { id: 'expenses', label: 'Expenses', blurb: 'What the work costs you, and what to set aside for tax.' },
      { id: 'goals',    label: 'Goals', blurb: 'Monthly and yearly targets, and how far along you are.' },
      { id: 'currency', label: 'Currency', blurb: 'Exchange rates, and what each way of getting paid costs you.' },
    ],
  },
  {
    id: 'build', label: 'Build',
    blurb: 'Design it, put it in AWS, and know what is running.',
    tabs: [
      { id: 'design',   label: 'Design' },
      { id: 'ideas',    label: 'Ideas' },
      { id: 'diagram',  label: 'Diagram (draw.io)' },
      { id: 'deploy',   label: 'Deploy' },
      { id: 'github',   label: 'From GitHub' },
      { id: 'accounts', label: 'AWS accounts' },
      { id: 'running',  label: "What's running" },
      { id: 'log',      label: 'Session log' },
    ],
  },
  {
    id: 'grow', label: 'Grow',
    blurb: 'Proof of your work, and the reputation that brings the next client.',
    tabs: [
      { id: 'portfolio',    label: 'Portfolio' },
      { id: 'facts',        label: 'My facts', blurb: 'What your proposals are allowed to claim. The truth check reads only from here.' },
      { id: 'walkthroughs', label: 'Walkthroughs' },
      { id: 'builder',      label: 'Project builder' },
      { id: 'content',      label: 'Content queue' },
      { id: 'branding',     label: 'Branding', blurb: 'Your LinkedIn, website and GitHub profile, written to bring clients.' },
      { id: 'coach',        label: 'AI coach' },
    ],
  },
]);

export function getRoom(roomId) {
  return ROOMS.find((r) => r.id === roomId) || null;
}

/** The tab to show: the one asked for if it exists, else the room's first. */
export function resolveTab(roomId, tabId) {
  const room = getRoom(roomId);
  if (!room) return null;
  return room.tabs.find((t) => t.id === tabId) || room.tabs[0];
}

export function roomPath(roomId, tabId) {
  return tabId ? `/${roomId}/${tabId}` : `/${roomId}`;
}

/** Old top-level addresses → the tab that holds that tool now. */
export const LEGACY_PATHS = Object.freeze({
  '/workspace':       '/jobs/all',
  '/start':           '/jobs/new',
  '/job-analyzer':    '/find/check',
  '/market':          '/find/market',
  '/rate-calculator': '/find/rates',
  '/discovery-call':  '/jobs/call',
  '/project-plan':    '/jobs/plan',
  '/presentation':    '/jobs/deck',
  '/email':           '/clients/emails',
  '/documents':       '/clients/paperwork',
  '/solution':        '/build/design',
  '/idea-studio':     '/build/ideas',
  '/architecture':    '/build/diagram',
  '/deploy':          '/build/deploy',
  '/applications':    '/build/github',
  '/github-projects': '/build/github',
  '/aws-accounts':    '/build/accounts',
  '/resource-search': '/build/running',
  '/session-log':     '/build/log',
  '/portfolio':       '/grow/portfolio',
  '/walkthroughs':    '/grow/walkthroughs',
  '/project-builder': '/grow/builder',
  '/content-queue':   '/grow/content',
  '/ai/coach':        '/grow/coach',
  '/earn':            '/find/gigs',
});

/**
 * The old Freelance Hub kept eighteen tools behind `?tab=`, `?sub=` and
 * `?fin=`. Each now has one home; the hub's own params are dropped so they
 * cannot leak into the page they land on.
 */
const FREELANCE_TABS = {
  overview: '/money/overview',
  gigfeed: '/find/gigs',
  proposals: '/jobs/proposals',
  myproposals: '/jobs/proposals',
  outreach: '/clients/emails',
  clients: '/clients/list',
  contracts: '/clients/paperwork?tab=contracts',
  branding: '/grow/branding',
};
const FREELANCE_FIN = {
  goals: '/money/goals',
  earnings: '/money/overview',
  invoices: '/clients/paperwork?tab=invoices',
  expenses: '/money/expenses',
  currency: '/money/currency',
};
const HUB_PARAMS = ['tab', 'sub', 'fin'];

/** The Proposals tab's views, by the old hub sub-tab that held each tool. */
export const PROPOSAL_VIEWS = Object.freeze({
  smart: 'write', builder: 'write', tracker: 'track', templates: 'templates',
});

/** Join a target that may carry its own query with the caller's query. */
function withQuery(target, params) {
  const [path, own = ''] = target.split('?');
  const merged = new URLSearchParams(own);
  for (const [k, v] of params) if (!merged.has(k)) merged.set(k, v);
  const q = merged.toString();
  return q ? `${path}?${q}` : path;
}

/**
 * Where an old address should go now, or null when it is not an old one.
 * The query string is carried across, because pages are opened with things
 * like `/solution?prefill=…` and must still receive them.
 */
export function resolveLegacy(pathname, search = '') {
  const params = new URLSearchParams(search);
  if (pathname === '/freelance') {
    const tab = params.get('tab');
    const target = tab === 'finance'
      ? FREELANCE_FIN[params.get('fin')] || '/money/overview'
      : FREELANCE_TABS[tab] || '/money/overview';
    // The proposal tools were sub-tabs; they are views of one tab now.
    let view = null;
    if (tab === 'myproposals') view = 'track';
    else if (tab === 'proposals') view = PROPOSAL_VIEWS[params.get('sub')] || null;
    for (const k of HUB_PARAMS) params.delete(k);
    if (view) params.set('view', view);
    return withQuery(target, params);
  }
  const target = LEGACY_PATHS[pathname];
  return target ? withQuery(target, params) : null;
}
