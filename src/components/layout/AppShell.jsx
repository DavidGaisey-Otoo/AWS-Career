import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { useHotkey } from '../../hooks/useHotkey.js';
import { BadgeUnlockToast } from '../gamification/BadgeUnlockToast.jsx';
import { LevelUpModal } from '../gamification/LevelUpModal.jsx';
import { CommandPalette } from '../ui/CommandPalette.jsx';
import { KeyboardShortcuts } from '../ui/KeyboardShortcuts.jsx';
import { WhatsNewModal } from '../ui/WhatsNewModal.jsx';
import { Breadcrumbs } from './Breadcrumbs.jsx';
import { GradientMesh } from '../ui/GradientMesh.jsx';
import { OnboardingModal } from '../onboarding/OnboardingModal.jsx';
import { AchievementPopup } from '../roadmap/AchievementPopup.jsx';
import { RoadmapEffects } from '../roadmap/RoadmapEffects.jsx';
import { TaskDetailPanel } from '../roadmap/TaskDetailPanel.jsx';
import { XPFloaterLayer } from '../roadmap/XPFloaterLayer.jsx';
import { FloatingActionButton } from './FloatingActionButton.jsx';
import { Header } from './Header.jsx';
import { MobileNav } from './MobileNav.jsx';
import { Sidebar } from './Sidebar.jsx';
import { TokenExpiryBanner } from '../system/TokenExpiryBanner.jsx';
import { EmergencyStopFAB } from '../system/EmergencyStopFAB.jsx';
import { RouteMemory } from '../system/RouteMemory.jsx';
import { InitialSplash } from '../system/InitialSplash.jsx';

export function AppShell() {
  const { paletteOpen, openPalette, closePalette, profile } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const loc = useLocation();

  useHotkey('mod+k', (e) => { e.preventDefault(); paletteOpen ? closePalette() : openPalette(); }, [paletteOpen]);
  useHotkey('esc',   () => { if (paletteOpen) closePalette(); if (mobileOpen) setMobileOpen(false); }, [paletteOpen, mobileOpen]);

  return (
    <div className="min-h-screen flex bg-[var(--bg)] text-[color:var(--text)] relative">
      <GradientMesh />

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="relative h-full"
            >
              <Sidebar onItemClick={() => setMobileOpen(false)} forceExpanded />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TokenExpiryBanner />
        <Header onMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 min-w-0 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-28 lg:pb-12 max-w-[1600px] mx-auto"
            >
              <Breadcrumbs />
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* BF-02: state-persistence + initial loading splash */}
      <RouteMemory />
      <InitialSplash />

      <MobileNav />
      <FloatingActionButton />
      <EmergencyStopFAB />
      <CommandPalette />
      <TaskDetailPanel />
      <XPFloaterLayer />
      <AchievementPopup />
      <RoadmapEffects />
      <LevelUpModal />
      <BadgeUnlockToast />
      <KeyboardShortcuts />
      <WhatsNewModal />
      {!profile.onboarded ? <OnboardingModal /> : null}
    </div>
  );
}
