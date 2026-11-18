import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { SkeletonCard } from './components/ui/Skeleton.jsx';
import { AIProvider } from './context/AIContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { AWSProvider } from './context/AWSContext.jsx';
import { DeployProvider } from './context/DeployContext.jsx';
import { DeployApprovalDialog } from './components/deploy/DeployApprovalDialog.jsx';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt.jsx';
import { RecorderProvider } from './context/RecorderContext.jsx';
import { EarnProvider } from './context/EarnContext.jsx';
import { FreelanceProvider } from './context/FreelanceContext.jsx';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { SyncProvider } from './context/SyncContext.jsx';
import { SyncModal } from './components/sync/SyncModal.jsx';
import { lazyWithRecovery } from './lib/lazyWithRecovery.js';
import { LEGACY_PATHS, ROOMS, resolveLegacy } from './lib/rooms.js';

// Lazy — loads on demand for a smaller initial bundle. Every route goes
// through lazyWithRecovery for stale-deployment recovery.
const lazy = lazyWithRecovery;
const Today                = lazy(() => import('./pages/Today.jsx'));
const Room                 = lazy(() => import('./pages/Room.jsx'));
const ProjectDetail        = lazy(() => import('./pages/ProjectDetail.jsx'));
const Walkthroughs         = lazy(() => import('./pages/Walkthroughs.jsx'));
const DeepWalkthrough      = lazy(() => import('./pages/DeepWalkthrough.jsx'));
const NewWalkthrough       = lazy(() => import('./pages/NewWalkthrough.jsx'));
const Settings             = lazy(() => import('./pages/Settings.jsx'));
const RenewGithubToken     = lazy(() => import('./pages/RenewGithubToken.jsx'));
const GoogleCallback       = lazy(() => import('./pages/GoogleCallback.jsx'));

/** The rooms of the office. See src/lib/rooms.js. */
const ROOM_IDS = ROOMS.map((r) => r.id);

/**
 * An address from before the rooms existed. Sends it to the tab that holds
 * that tool now, keeping its query string; anything unknown goes to Today.
 */
function LegacyRedirect() {
  const { pathname, search } = useLocation();
  return <Navigate to={resolveLegacy(pathname, search) || '/'} replace />;
}

/**
 * Lightweight fallback while a lazy chunk loads. Two SkeletonCards keep
 * the layout from collapsing during the transition.
 */
function RouteFallback() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
       <DialogProvider>
        <AppProvider>
          <PortfolioProvider>
             <AIProvider>
              <FreelanceProvider>
                 <AWSProvider>
                 <DeployProvider>
                 <RecorderProvider>
                 <EarnProvider>
                  <SyncProvider>
                   <DeployApprovalDialog />
                   <PWAInstallPrompt />
                   <SyncModal />
                   <Routes>
                     <Route element={<AppShell />}>
                       <Route path="/" element={<Suspended><Today /></Suspended>} />
                       {ROOM_IDS.map((id) => [
                         <Route key={id} path={`/${id}`} element={<Suspended><Room roomId={id} /></Suspended>} />,
                         <Route key={`${id}-tab`} path={`/${id}/:tabId`} element={<Suspended><Room roomId={id} /></Suspended>} />,
                       ])}
                       {/* Pages that open from inside a room */}
                       <Route path="/portfolio/:projectId" element={<Suspended><ProjectDetail /></Suspended>} />
                       <Route path="/walkthroughs/deep" element={<Suspended><DeepWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/deep/new" element={<Suspended><NewWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/deep/:id" element={<Suspended><DeepWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/:id" element={<Suspended><Walkthroughs /></Suspended>} />
                       <Route path="/settings" element={<Suspended><Settings /></Suspended>} />
                       <Route path="/renew-github" element={<Suspended><RenewGithubToken /></Suspended>} />
                       <Route path="/integrations/google/callback" element={<Suspended><GoogleCallback /></Suspended>} />
                       {/* Old addresses: each lands on the tab that holds that tool now. */}
                       <Route path="/freelance" element={<LegacyRedirect />} />
                       {Object.keys(LEGACY_PATHS).map((p) => <Route key={p} path={p} element={<LegacyRedirect />} />)}
                       <Route path="*" element={<LegacyRedirect />} />
                     </Route>
                   </Routes>
                  </SyncProvider>
                 </EarnProvider>
                 </RecorderProvider>
                 </DeployProvider>
                 </AWSProvider>
              </FreelanceProvider>
             </AIProvider>
          </PortfolioProvider>
        </AppProvider>
       </DialogProvider>
      </ToastProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

function Suspended({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}
