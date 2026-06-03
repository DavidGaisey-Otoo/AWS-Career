import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { SkeletonCard } from './components/ui/Skeleton.jsx';
import { AIProvider } from './context/AIContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import { AWSProvider } from './context/AWSContext.jsx';
import { DeployProvider } from './context/DeployContext.jsx';
import { DeployApprovalDialog } from './components/deploy/DeployApprovalDialog.jsx';
import { RecorderProvider } from './context/RecorderContext.jsx';
import { CommunityProvider } from './context/CommunityContext.jsx';
import { EarnProvider } from './context/EarnContext.jsx';
import { ExamProvider } from './context/ExamContext.jsx';
import { FreelanceProvider } from './context/FreelanceContext.jsx';
import { GamificationProvider } from './context/GamificationContext.jsx';
import { LearningProvider } from './context/LearningContext.jsx';
import { PortfolioProvider } from './context/PortfolioContext.jsx';
import { RoadmapProvider } from './context/RoadmapContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { UKProvider } from './context/UKContext.jsx';
import { WellnessProvider } from './context/WellnessContext.jsx';

// Eager — entry point + tiny pages that load instantly
import Dashboard from './pages/Dashboard.jsx';
import SectionLanding from './pages/SectionLanding.jsx';

// Lazy — everything else. Loads on demand for a smaller initial bundle.
const Roadmap              = lazy(() => import('./pages/Roadmap.jsx'));
const Portfolio            = lazy(() => import('./pages/Portfolio.jsx'));
const ProjectDetail        = lazy(() => import('./pages/ProjectDetail.jsx'));
const Learning             = lazy(() => import('./pages/Learning.jsx'));
const LearningTopic        = lazy(() => import('./pages/LearningTopic.jsx'));
const Exam                 = lazy(() => import('./pages/Exam.jsx'));
const ExamCertDetail       = lazy(() => import('./pages/ExamCertDetail.jsx'));
const ExamRun              = lazy(() => import('./pages/ExamRun.jsx'));
const TopicStudyGuide      = lazy(() => import('./pages/TopicStudyGuide.jsx'));
const Flashcards           = lazy(() => import('./pages/Flashcards.jsx'));
const DeepWalkthrough      = lazy(() => import('./pages/DeepWalkthrough.jsx'));
const NewWalkthrough       = lazy(() => import('./pages/NewWalkthrough.jsx'));
const Certifications       = lazy(() => import('./pages/Certifications.jsx'));
const AIHub                = lazy(() => import('./pages/AIHub.jsx'));
const AIAssistant          = lazy(() => import('./pages/AIAssistant.jsx'));
const AICoach              = lazy(() => import('./pages/AICoach.jsx'));
const StudyPlanGenerator   = lazy(() => import('./pages/StudyPlanGenerator.jsx'));
const InterviewSimulator   = lazy(() => import('./pages/InterviewSimulator.jsx'));
const Freelance            = lazy(() => import('./pages/Freelance.jsx'));
const Market               = lazy(() => import('./pages/Market.jsx'));
const Interview            = lazy(() => import('./pages/Interview.jsx'));
const Architecture         = lazy(() => import('./pages/Architecture.jsx'));
const Community            = lazy(() => import('./pages/Community.jsx'));
const Resources            = lazy(() => import('./pages/Resources.jsx'));
const Analytics            = lazy(() => import('./pages/Analytics.jsx'));
const Profile              = lazy(() => import('./pages/Profile.jsx'));
const UKPlanner            = lazy(() => import('./pages/UKPlanner.jsx'));
const Wellness             = lazy(() => import('./pages/Wellness.jsx'));
const Settings             = lazy(() => import('./pages/Settings.jsx'));
const AWSAccounts          = lazy(() => import('./pages/AWSAccounts.jsx'));
const JobAnalyzer          = lazy(() => import('./pages/JobAnalyzer.jsx'));
const PresentationGenerator = lazy(() => import('./pages/PresentationGenerator.jsx'));
const EmailComposer        = lazy(() => import('./pages/EmailComposer.jsx'));
const DocumentCenter       = lazy(() => import('./pages/DocumentCenter.jsx'));
const DiscoveryCallPrep    = lazy(() => import('./pages/DiscoveryCallPrep.jsx'));
const AWSUpdates           = lazy(() => import('./pages/AWSUpdates.jsx'));
const ProjectPlan          = lazy(() => import('./pages/ProjectPlan.jsx'));
const ContentQueue         = lazy(() => import('./pages/ContentQueue.jsx'));
const DeployConsole        = lazy(() => import('./pages/DeployConsole.jsx'));
const Walkthroughs         = lazy(() => import('./pages/Walkthroughs.jsx'));
const SessionLog           = lazy(() => import('./pages/SessionLog.jsx'));
const ProjectBuilder       = lazy(() => import('./pages/ProjectBuilder.jsx'));
const Updates              = lazy(() => import('./pages/Updates.jsx'));
const Readiness            = lazy(() => import('./pages/Readiness.jsx'));
const RenewGithubToken     = lazy(() => import('./pages/RenewGithubToken.jsx'));
const IdeaStudio           = lazy(() => import('./pages/IdeaStudio.jsx'));
const GoogleCallback       = lazy(() => import('./pages/GoogleCallback.jsx'));

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

/**
 * Provider order matters — Gamification reads from every other domain
 * context, plus the Community + Wellness snapshots written via
 * `window.__community_snapshot` / `__wellness_snapshot`. So it MUST sit
 * inside all of them.
 */
export default function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <ToastProvider>
       <DialogProvider>
        <AppProvider>
         <RoadmapProvider>
          <PortfolioProvider>
           <LearningProvider>
            <ExamProvider>
             <AIProvider>
              <FreelanceProvider>
               <CommunityProvider>
                <WellnessProvider>
                 <UKProvider>
                 <AWSProvider>
                 <DeployProvider>
                 <RecorderProvider>
                 <EarnProvider>
                 <GamificationProvider>
                   <DeployApprovalDialog />
                   <Routes>
                     <Route element={<AppShell />}>
                       <Route path="/" element={<Dashboard />} />
                       <Route path="/roadmap" element={<Suspended><Roadmap /></Suspended>} />
                       <Route path="/portfolio" element={<Suspended><Portfolio /></Suspended>} />
                       <Route path="/portfolio/:projectId" element={<Suspended><ProjectDetail /></Suspended>} />
                       <Route path="/learning" element={<Suspended><Learning /></Suspended>} />
                       <Route path="/learning/:categoryId/:topicId" element={<Suspended><LearningTopic /></Suspended>} />
                       <Route path="/exam" element={<Suspended><Exam /></Suspended>} />
                       <Route path="/exam/:certId" element={<Suspended><ExamCertDetail /></Suspended>} />
                       <Route path="/exam/:certId/run/:mode" element={<Suspended><ExamRun /></Suspended>} />
                       <Route path="/exam/:certId/study/:topicId" element={<Suspended><TopicStudyGuide /></Suspended>} />
                       <Route path="/flashcards" element={<Suspended><Flashcards /></Suspended>} />
                       <Route path="/flashcards/:categoryId" element={<Suspended><Flashcards /></Suspended>} />
                       <Route path="/walkthroughs/deep" element={<Suspended><DeepWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/deep/new" element={<Suspended><NewWalkthrough /></Suspended>} />
                       <Route path="/walkthroughs/deep/:id" element={<Suspended><DeepWalkthrough /></Suspended>} />
                       <Route path="/certifications" element={<Suspended><Certifications /></Suspended>} />
                       <Route path="/ai" element={<Suspended><AIHub /></Suspended>} />
                       <Route path="/ai/assistant" element={<Suspended><AIAssistant /></Suspended>} />
                       <Route path="/ai/coach" element={<Suspended><AICoach /></Suspended>} />
                       <Route path="/ai/study-plan" element={<Suspended><StudyPlanGenerator /></Suspended>} />
                       <Route path="/ai/interview" element={<Suspended><InterviewSimulator /></Suspended>} />
                       <Route path="/freelance" element={<Suspended><Freelance /></Suspended>} />
                       <Route path="/market" element={<Suspended><Market /></Suspended>} />
                       <Route path="/interview" element={<Suspended><Interview /></Suspended>} />
                       <Route path="/architecture" element={<Suspended><Architecture /></Suspended>} />
                       <Route path="/community" element={<Suspended><Community /></Suspended>} />
                       <Route path="/resources" element={<Suspended><Resources /></Suspended>} />
                       <Route path="/analytics" element={<Suspended><Analytics /></Suspended>} />
                       <Route path="/profile" element={<Suspended><Profile /></Suspended>} />
                       <Route path="/wellness" element={<Suspended><Wellness /></Suspended>} />
                       <Route path="/uk" element={<Suspended><UKPlanner /></Suspended>} />
                       {/* 5-section landing pages */}
                       <Route path="/learn" element={<SectionLanding sectionId="learn" />} />
                       <Route path="/exam-hub" element={<SectionLanding sectionId="exam" />} />
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
                       <Route path="/aws-updates"   element={<Suspended><AWSUpdates /></Suspended>} />
                       <Route path="/deploy"        element={<Suspended><DeployConsole /></Suspended>} />
                       <Route path="/walkthroughs"  element={<Suspended><Walkthroughs /></Suspended>} />
                       <Route path="/walkthroughs/:id" element={<Suspended><Walkthroughs /></Suspended>} />
                       <Route path="/session-log"   element={<Suspended><SessionLog /></Suspended>} />
                       <Route path="/project-builder" element={<Suspended><ProjectBuilder /></Suspended>} />
                       <Route path="/updates"         element={<Suspended><Updates /></Suspended>} />
                       <Route path="/readiness"       element={<Suspended><Readiness /></Suspended>} />
                       <Route path="/renew-github"    element={<Suspended><RenewGithubToken /></Suspended>} />
                       <Route path="/idea-studio"     element={<Suspended><IdeaStudio /></Suspended>} />
                       <Route path="/settings" element={<Suspended><Settings /></Suspended>} />
                       <Route path="/integrations/google/callback" element={<Suspended><GoogleCallback /></Suspended>} />
                       <Route path="*" element={<Dashboard />} />
                     </Route>
                   </Routes>
                 </GamificationProvider>
                 </EarnProvider>
                 </RecorderProvider>
                 </DeployProvider>
                 </AWSProvider>
                 </UKProvider>
                </WellnessProvider>
               </CommunityProvider>
              </FreelanceProvider>
             </AIProvider>
            </ExamProvider>
           </LearningProvider>
          </PortfolioProvider>
         </RoadmapProvider>
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
