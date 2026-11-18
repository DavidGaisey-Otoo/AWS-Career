import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
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

// Eager — entry point + tiny pages that load instantly
import SectionLanding from './pages/SectionLanding.jsx';

// Lazy — everything else. Loads on demand for a smaller initial bundle.
// Keep the short alias so every existing and future route below receives the
// same stale-deployment recovery behavior.
const lazy = lazyWithRecovery;
const Portfolio            = lazy(() => import('./pages/Portfolio.jsx'));
const ProjectDetail        = lazy(() => import('./pages/ProjectDetail.jsx'));
const DeepWalkthrough      = lazy(() => import('./pages/DeepWalkthrough.jsx'));
const NewWalkthrough       = lazy(() => import('./pages/NewWalkthrough.jsx'));
const AICoach              = lazy(() => import('./pages/AICoach.jsx'));
const Freelance            = lazy(() => import('./pages/Freelance.jsx'));
const Market               = lazy(() => import('./pages/Market.jsx'));
const Architecture         = lazy(() => import('./pages/Architecture.jsx'));
const Settings             = lazy(() => import('./pages/Settings.jsx'));
const AWSAccounts          = lazy(() => import('./pages/AWSAccounts.jsx'));
const JobAnalyzer          = lazy(() => import('./pages/JobAnalyzer.jsx'));
const PresentationGenerator = lazy(() => import('./pages/PresentationGenerator.jsx'));
const EmailComposer        = lazy(() => import('./pages/EmailComposer.jsx'));
const DocumentCenter       = lazy(() => import('./pages/DocumentCenter.jsx'));
const DiscoveryCallPrep    = lazy(() => import('./pages/DiscoveryCallPrep.jsx'));
const ProjectPlan          = lazy(() => import('./pages/ProjectPlan.jsx'));
const ContentQueue         = lazy(() => import('./pages/ContentQueue.jsx'));
const DeployConsole        = lazy(() => import('./pages/DeployConsole.jsx'));
const ResourceSearch       = lazy(() => import('./pages/ResourceSearch.jsx'));
const Workspace            = lazy(() => import('./pages/Workspace.jsx'));
const WinThisJob           = lazy(() => import('./pages/WinThisJob.jsx'));
const Walkthroughs         = lazy(() => import('./pages/Walkthroughs.jsx'));
const SessionLog           = lazy(() => import('./pages/SessionLog.jsx'));
const ProjectBuilder       = lazy(() => import('./pages/ProjectBuilder.jsx'));
const GitHubProjects       = lazy(() => import('./pages/GitHubProjects.jsx'));
const RenewGithubToken     = lazy(() => import('./pages/RenewGithubToken.jsx'));
const IdeaStudio           = lazy(() => import('./pages/IdeaStudio.jsx'));
const SolutionStudio       = lazy(() => import('./pages/SolutionStudio.jsx'));   // GIG-01
const GoogleCallback       = lazy(() => import('./pages/GoogleCallback.jsx'));
const RateCalculator       = lazy(() => import('./pages/RateCalculator.jsx'));

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
                       <Route path="/" element={<Suspended><Workspace /></Suspended>} />
                       <Route path="/portfolio" element={<Suspended><Portfolio /></Suspended>} />
                       <Route path="/portfolio/:projectId" element={<Suspended><ProjectDetail /></Suspended>} />
                       <Route path="/walkthroughs/deep" element={<Suspended><DeepWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/deep/new" element={<Suspended><NewWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/deep/:id" element={<Suspended><DeepWalkthrough /></Suspended>} />
                       <Route path="/ai/coach" element={<Suspended><AICoach /></Suspended>} />
                       <Route path="/freelance" element={<Suspended><Freelance /></Suspended>} />
                       <Route path="/market" element={<Suspended><Market /></Suspended>} />
                       <Route path="/architecture" element={<Suspended><Architecture /></Suspended>} />
                       {/* 5-section landing pages */}
                       <Route path="/build" element={<SectionLanding sectionId="build" />} />
                       <Route path="/earn" element={<SectionLanding sectionId="earn" />} />
                       <Route path="/aws-accounts" element={<Suspended><AWSAccounts /></Suspended>} />
                       <Route path="/job-analyzer" element={<Suspended><JobAnalyzer /></Suspended>} />
                       <Route path="/presentation"  element={<Suspended><PresentationGenerator /></Suspended>} />
                       <Route path="/email"         element={<Suspended><EmailComposer /></Suspended>} />
                       <Route path="/documents"     element={<Suspended><DocumentCenter /></Suspended>} />
                       <Route path="/discovery-call" element={<Suspended><DiscoveryCallPrep /></Suspended>} />
                       <Route path="/project-plan"  element={<Suspended><ProjectPlan /></Suspended>} />
                       <Route path="/content-queue" element={<Suspended><ContentQueue /></Suspended>} />
                       <Route path="/deploy"        element={<Suspended><DeployConsole /></Suspended>} />
                       <Route path="/resource-search" element={<Suspended><ResourceSearch /></Suspended>} />
                       <Route path="/workspace"     element={<Suspended><Workspace /></Suspended>} />
                       <Route path="/start"         element={<Suspended><WinThisJob /></Suspended>} />
                       <Route path="/walkthroughs"  element={<Suspended><Walkthroughs /></Suspended>} />
                       <Route path="/walkthroughs/:id" element={<Suspended><Walkthroughs /></Suspended>} />
                       <Route path="/session-log"   element={<Suspended><SessionLog /></Suspended>} />
                       <Route path="/project-builder" element={<Suspended><ProjectBuilder /></Suspended>} />
                       <Route path="/github-projects" element={<Suspended><GitHubProjects /></Suspended>} />
                       <Route path="/applications" element={<Suspended><GitHubProjects /></Suspended>} />
                       <Route path="/renew-github"    element={<Suspended><RenewGithubToken /></Suspended>} />
                       <Route path="/idea-studio"     element={<Suspended><IdeaStudio /></Suspended>} />
                       <Route path="/solution"        element={<Suspended><SolutionStudio /></Suspended>} />
                       <Route path="/settings" element={<Suspended><Settings /></Suspended>} />
                       <Route path="/integrations/google/callback" element={<Suspended><GoogleCallback /></Suspended>} />
                       <Route path="/rate-calculator" element={<Suspended><RateCalculator /></Suspended>} />
                       {/* Old bookmarks to the removed study pages land on the workspace. */}
                       <Route path="*" element={<Suspended><Workspace /></Suspended>} />
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
