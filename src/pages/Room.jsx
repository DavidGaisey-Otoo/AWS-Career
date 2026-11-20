import { Suspense } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { RoomTabs } from '../components/rooms/RoomTabs.jsx';
import { SkeletonCard } from '../components/ui/Skeleton.jsx';
import { lazyWithRecovery as lazy } from '../lib/lazyWithRecovery.js';
import { getRoom, resolveTab, roomPath } from '../lib/rooms.js';

/**
 * A named export loaded lazily, so a room only downloads the tab you open.
 * These are panels that used to sit inside the old hub, under its title;
 * they have no heading of their own, so the room gives them one.
 */
const named = (load, name) => {
  const Panel = lazy(() => load().then((m) => ({ default: m[name] })));
  Panel.needsHeading = true;
  return Panel;
};

/**
 * What each tab shows. Keys are `room/tab` from src/lib/rooms.js;
 * rooms.test.js fails if a tab has no entry here or an entry has no tab.
 */
export const TAB_COMPONENTS = {
  'find/gigs':          named(() => import('../components/freelance/GigFeed.jsx'), 'GigFeed'),
  'find/check':         lazy(() => import('./JobAnalyzer.jsx')),
  'find/market':        lazy(() => import('./Market.jsx')),
  'find/rates':         lazy(() => import('./RateCalculator.jsx')),

  'jobs/packs':         named(() => import('../components/rooms/GigsDesk.jsx'), 'GigsDesk'),
  'jobs/all':           lazy(() => import('./Workspace.jsx')),
  'jobs/new':           lazy(() => import('./WinThisJob.jsx')),
  'jobs/proposals':     named(() => import('../components/rooms/ProposalsDesk.jsx'), 'ProposalsDesk'),
  'jobs/time':          named(() => import('../components/rooms/TimeTracker.jsx'), 'TimeTracker'),
  'jobs/call':          lazy(() => import('./DiscoveryCallPrep.jsx')),
  'jobs/plan':          lazy(() => import('./ProjectPlan.jsx')),
  'jobs/deck':          lazy(() => import('./PresentationGenerator.jsx')),

  'clients/list':       named(() => import('../components/freelance/ClientCRM.jsx'), 'ClientCRM'),
  'clients/emails':     lazy(() => import('./EmailComposer.jsx')),
  'clients/paperwork':  lazy(() => import('./DocumentCenter.jsx')),

  'money/overview':     named(() => import('../components/rooms/MoneyOverview.jsx'), 'MoneyOverview'),
  'money/expenses':     named(() => import('../components/freelance/ExpenseTracker.jsx'), 'ExpenseTracker'),
  'money/goals':        named(() => import('../components/freelance/FinancialGoals.jsx'), 'FinancialGoals'),
  'money/currency':     named(() => import('../components/freelance/CurrencyCenter.jsx'), 'CurrencyCenter'),

  'build/design':       lazy(() => import('./SolutionStudio.jsx')),
  'build/ideas':        lazy(() => import('./IdeaStudio.jsx')),
  'build/diagram':      lazy(() => import('./Architecture.jsx')),
  'build/deploy':       lazy(() => import('./DeployConsole.jsx')),
  'build/github':       lazy(() => import('./GitHubProjects.jsx')),
  'build/accounts':     lazy(() => import('./AWSAccounts.jsx')),
  'build/running':      lazy(() => import('./ResourceSearch.jsx')),
  'build/log':          lazy(() => import('./SessionLog.jsx')),

  'grow/portfolio':     lazy(() => import('./Portfolio.jsx')),
  'grow/walkthroughs':  lazy(() => import('./Walkthroughs.jsx')),
  'grow/builder':       lazy(() => import('./ProjectBuilder.jsx')),
  'grow/content':       lazy(() => import('./ContentQueue.jsx')),
  'grow/branding':      named(() => import('../components/freelance/BrandingEngine.jsx'), 'BrandingEngine'),
  'grow/coach':         lazy(() => import('./AICoach.jsx')),
};

/**
 * One room: its tab row, then the tool in the open tab.
 *
 * The room has no big title of its own. Each tool already opens with its
 * PageHeader, and a second heading above it would be the clutter this
 * layout exists to remove; the sidebar and the tab row say where you are.
 */
export default function Room({ roomId }) {
  const { tabId } = useParams();
  const room = getRoom(roomId);
  const tab = resolveTab(roomId, tabId);
  if (!room || !tab) return <Navigate to="/" replace />;
  // `/find` or a tab that no longer exists: go to a real tab, so the
  // address always says what is on screen.
  if (tabId !== tab.id) return <Navigate to={roomPath(room.id, tab.id)} replace />;

  const Tool = TAB_COMPONENTS[`${room.id}/${tab.id}`];
  return (
    <div className="space-y-5">
      <RoomTabs room={room} activeId={tab.id} />
      {Tool?.needsHeading && (
        <PageHeader eyebrow={room.label} title={tab.label} subtitle={tab.blurb || room.blurb} />
      )}
      <Suspense fallback={<div className="space-y-4"><SkeletonCard /><SkeletonCard /></div>}>
        {Tool ? <Tool key={tab.id} /> : null}
      </Suspense>
    </div>
  );
}
