import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const AppContext = createContext(null);

const DEFAULT_PROFILE = {
  onboarded: false,
  name: '',
  avatar: null,
  bio: '',
  level: null,
  goal: null,
  goals: [],         // multi-select goal set (in addition to primary `goal`)
  hours: null,
  targetIncome: 5000,
  targetDate: '',
  country: 'Ghana',
  timezone: 'GMT',
  createdAt: null,
  integrations: {
    github: '',
    linkedin: '',
    upwork: '',
    hashnode: '',
  },
};

const DEFAULT_NOTIFS = [
  {
    id: uid(),
    title: 'Welcome to AWS Career Launchpad Pro',
    body: 'Complete onboarding to generate your personalized roadmap.',
    type: 'info',
    read: false,
    at: new Date().toISOString(),
  },
];

const DEFAULT_PREFS = {
  notifications: {
    dailyStudyReminderTime: '08:00',
    streakReminderTime: '20:00',
    examPracticeFrequency: 'weekly',  // off | daily | weekly
    marketAlerts: true,
    communityNotifications: true,
    proposalFollowupReminders: true,
    awsNewsAlerts: true,
  },
  display: {
    accentColor: '#FF9900',
    fontScale: 1,            // 0.875 | 1 | 1.125 | 1.25
    compactMode: false,
    reducedMotion: false,
    highContrast: false,
    colorblindMode: 'off',    // off | protanopia | deuteranopia | tritanopia
  },
  study: {
    pomodoroDefaultMin: 25,
    dailyStudyGoalHours: 2,
    preferredStudyTime: 'morning',  // morning | afternoon | evening | night
    learningStyle: 'mixed',         // visual | reading | hands-on | mixed
    difficultyPreference: 'balanced', // challenge | balanced | easy
  },
  meta: {
    schemaVersion: 1,
    lastWhatsNewSeen: null,
  },
};

export function AppProvider({ children }) {
  const [profile, setProfile] = useLocalStorage(`${STORAGE_KEY}::profile`, DEFAULT_PROFILE);
  const [notifications, setNotifications] = useLocalStorage(`${STORAGE_KEY}::notifs`, DEFAULT_NOTIFS);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(`${STORAGE_KEY}::sidebar`, false);
  const [prefs, setPrefs] = useLocalStorage(`${STORAGE_KEY}::prefs`, DEFAULT_PREFS);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Apply display preferences globally (CSS vars + html class)
  useEffect(() => {
    const root = document.documentElement;
    const d = prefs.display || {};
    root.style.setProperty('--font-scale', String(d.fontScale ?? 1));
    document.body.style.fontSize = `${d.fontScale ?? 1}rem`;
    // accent color override
    if (d.accentColor && d.accentColor !== '#FF9900') {
      root.style.setProperty('--accent-override', d.accentColor);
    } else {
      root.style.removeProperty('--accent-override');
    }
    // compact mode adds smaller padding on .surface
    root.classList.toggle('compact', !!d.compactMode);
    root.classList.toggle('hi-contrast', !!d.highContrast);
    root.classList.toggle('reduced-motion', !!d.reducedMotion);
    root.dataset.colorblind = d.colorblindMode || 'off';
  }, [prefs.display]);

  const updateProfile = useCallback((patch) => {
    setProfile((p) => ({ ...p, ...patch }));
  }, [setProfile]);

  const updateIntegrations = useCallback((patch) => {
    setProfile((p) => ({ ...p, integrations: { ...p.integrations, ...patch } }));
  }, [setProfile]);

  const completeOnboarding = useCallback((data) => {
    setProfile((p) => ({
      ...p,
      ...data,
      onboarded: true,
      createdAt: p.createdAt || new Date().toISOString(),
    }));
  }, [setProfile]);

  const setNotificationPrefs = useCallback((patch) => {
    setPrefs((p) => ({ ...p, notifications: { ...p.notifications, ...patch } }));
  }, [setPrefs]);

  const setDisplayPrefs = useCallback((patch) => {
    setPrefs((p) => ({ ...p, display: { ...p.display, ...patch } }));
  }, [setPrefs]);

  const setStudyPrefs = useCallback((patch) => {
    setPrefs((p) => ({ ...p, study: { ...p.study, ...patch } }));
  }, [setPrefs]);

  const markWhatsNewSeen = useCallback((version) => {
    setPrefs((p) => ({ ...p, meta: { ...p.meta, lastWhatsNewSeen: version } }));
  }, [setPrefs]);

  const addNotification = useCallback((n) => {
    setNotifications((prev) => [
      { id: uid(), at: new Date().toISOString(), read: false, type: 'info', ...n },
      ...prev,
    ].slice(0, 50));
  }, [setNotifications]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [setNotifications]);

  const clearNotifications = useCallback(() => setNotifications([]), [setNotifications]);

  const resetAll = useCallback(() => {
    setProfile(DEFAULT_PROFILE);
    setNotifications(DEFAULT_NOTIFS);
    setPrefs(DEFAULT_PREFS);
  }, [setProfile, setNotifications, setPrefs]);

  // ---------- export / import / storage usage ----------
  const exportAll = useCallback(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_KEY)) {
        try { out[k] = JSON.parse(localStorage.getItem(k)); }
        catch { out[k] = localStorage.getItem(k); }
      }
    }
    return JSON.stringify({ exportedAt: new Date().toISOString(), schemaVersion: 1, data: out }, null, 2);
  }, []);

  const importAll = useCallback((jsonString) => {
    let parsed;
    try { parsed = JSON.parse(jsonString); }
    catch { throw new Error('Invalid JSON'); }
    if (!parsed?.data) throw new Error('Missing "data" key in backup');
    for (const [k, v] of Object.entries(parsed.data)) {
      if (!k.startsWith(STORAGE_KEY)) continue;
      try { localStorage.setItem(k, JSON.stringify(v)); }
      catch { /* skip */ }
    }
    // Force a full reload so all providers re-hydrate.
    setTimeout(() => location.reload(), 100);
  }, []);

  const storageUsage = useMemo(() => {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORAGE_KEY)) continue;
      const v = localStorage.getItem(k) || '';
      bytes += (k.length + v.length) * 2;  // UTF-16 estimate
    }
    return bytes;
  // recompute when something obvious changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, notifications, prefs]);

  const resetSection = useCallback((sectionKey) => {
    // sectionKey: e.g. 'roadmap', 'portfolio', 'learning' — clears the matching localStorage entry
    try {
      localStorage.removeItem(`${STORAGE_KEY}::${sectionKey}`);
      setTimeout(() => location.reload(), 100);
    } catch { /* ignore */ }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value = useMemo(
    () => ({
      profile,
      prefs,
      updateProfile,
      updateIntegrations,
      completeOnboarding,
      setNotificationPrefs, setDisplayPrefs, setStudyPrefs, markWhatsNewSeen,
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearNotifications,
      sidebarCollapsed,
      setSidebarCollapsed,
      paletteOpen,
      setPaletteOpen,
      openPalette: () => setPaletteOpen(true),
      closePalette: () => setPaletteOpen(false),
      shortcutsOpen,
      openShortcuts: () => setShortcutsOpen(true),
      closeShortcuts: () => setShortcutsOpen(false),
      resetAll,
      // data management
      exportAll, importAll, storageUsage, resetSection,
    }),
    [
      profile, prefs, updateProfile, updateIntegrations, completeOnboarding,
      setNotificationPrefs, setDisplayPrefs, setStudyPrefs, markWhatsNewSeen,
      notifications, unreadCount, addNotification, markAllRead, clearNotifications,
      sidebarCollapsed, setSidebarCollapsed, paletteOpen, shortcutsOpen,
      resetAll, exportAll, importAll, storageUsage, resetSection,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
