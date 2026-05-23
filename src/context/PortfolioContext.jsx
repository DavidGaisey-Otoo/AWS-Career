import { createContext, useCallback, useContext, useMemo } from 'react';
import {
  PROJECTS, SERVICE_DOMAINS, DIFFICULTY, getServiceMeta, PORTFOLIO_DOMAIN_COVERAGE,
} from '../data/projects.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

const PortfolioContext = createContext(null);

const PROJECT_DEFAULTS = {
  status: 'not-started',  // not-started | in-progress | review | complete
  priority: 'soon',       // immediate | soon | later
  notes: '',
  lessons: '',
  wouldDoDifferently: '',
  github: '',
  demoUrl: '',
  videoUrl: '',
  screenshots: [],        // [{ id, dataUrl, caption }]
  startedAt: null,
  finishedAt: null,
  actualMinutes: 0,
  completedSteps: {},     // { [stepId]: true }
};

const DEFAULT_STATE = {
  projects: {},          // { [projectId]: PROJECT_DEFAULTS }
  publicShareEnabled: false,
  visitorCount: 0,
};

export function PortfolioProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::portfolio`, DEFAULT_STATE);

  const getProjectState = useCallback((projectId) => {
    return { ...PROJECT_DEFAULTS, ...(state.projects?.[projectId] || {}) };
  }, [state.projects]);

  const updateProjectState = useCallback((projectId, patch) => {
    setState((s) => ({
      ...s,
      projects: {
        ...s.projects,
        [projectId]: { ...PROJECT_DEFAULTS, ...(s.projects?.[projectId] || {}), ...patch },
      },
    }));
  }, [setState]);

  const moveToStatus = useCallback((projectId, newStatus) => {
    setState((s) => {
      const cur = { ...PROJECT_DEFAULTS, ...(s.projects?.[projectId] || {}) };
      const patch = { status: newStatus };
      const now = new Date().toISOString();
      if (newStatus === 'in-progress' && !cur.startedAt) patch.startedAt = now;
      if (newStatus === 'complete' && !cur.finishedAt) patch.finishedAt = now;
      if (newStatus !== 'complete' && cur.finishedAt) patch.finishedAt = null;
      return {
        ...s,
        projects: { ...s.projects, [projectId]: { ...cur, ...patch } },
      };
    });
  }, [setState]);

  const toggleStep = useCallback((projectId, stepId) => {
    setState((s) => {
      const cur = { ...PROJECT_DEFAULTS, ...(s.projects?.[projectId] || {}) };
      const completed = { ...cur.completedSteps };
      if (completed[stepId]) delete completed[stepId];
      else completed[stepId] = true;
      return {
        ...s,
        projects: { ...s.projects, [projectId]: { ...cur, completedSteps: completed } },
      };
    });
  }, [setState]);

  const addScreenshot = useCallback((projectId, file) => {
    if (!file) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setState((s) => {
          const cur = { ...PROJECT_DEFAULTS, ...(s.projects?.[projectId] || {}) };
          const shot = {
            id: Math.random().toString(36).slice(2),
            dataUrl,
            caption: file.name || '',
          };
          return {
            ...s,
            projects: {
              ...s.projects,
              [projectId]: { ...cur, screenshots: [...cur.screenshots, shot] },
            },
          };
        });
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, [setState]);

  const removeScreenshot = useCallback((projectId, shotId) => {
    setState((s) => {
      const cur = { ...PROJECT_DEFAULTS, ...(s.projects?.[projectId] || {}) };
      return {
        ...s,
        projects: {
          ...s.projects,
          [projectId]: { ...cur, screenshots: cur.screenshots.filter((sh) => sh.id !== shotId) },
        },
      };
    });
  }, [setState]);

  const togglePublicShare = useCallback(() => {
    setState((s) => ({ ...s, publicShareEnabled: !s.publicShareEnabled }));
  }, [setState]);

  const bumpVisitor = useCallback(() => {
    setState((s) => ({ ...s, visitorCount: (s.visitorCount || 0) + 1 }));
  }, [setState]);

  const resetPortfolio = useCallback(() => setState(DEFAULT_STATE), [setState]);

  // ---------- derived: project completion %, totals, intelligence ----------
  const projectStats = useMemo(() => {
    return PROJECTS.map((p) => {
      const ps = { ...PROJECT_DEFAULTS, ...(state.projects?.[p.id] || {}) };
      const totalSteps = p.buildSteps.length;
      const doneSteps = p.buildSteps.filter((s) => ps.completedSteps[s.id]).length;
      const stepPercent = totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0;
      const fieldsFilled = [
        ps.notes, ps.lessons, ps.wouldDoDifferently, ps.github, ps.demoUrl,
      ].filter((v) => (v || '').trim().length > 0).length;
      const hasScreenshots = ps.screenshots.length > 0;
      // Detail completeness: 0..1
      const detailScore = (fieldsFilled / 5) * 0.7 + (hasScreenshots ? 0.3 : 0);
      return {
        id: p.id,
        status: ps.status,
        priority: ps.priority,
        stepPercent,
        doneSteps,
        totalSteps,
        detailScore,
        startedAt: ps.startedAt,
        finishedAt: ps.finishedAt,
        actualMinutes: ps.actualMinutes,
      };
    });
  }, [state.projects]);

  const intelligence = useMemo(() => {
    // Portfolio score: weighted by status + detail + difficulty
    const STATUS_WEIGHT = { 'not-started': 0, 'in-progress': 30, 'review': 70, 'complete': 100 };
    let totalScore = 0;
    let totalWeight = 0;
    let completeCount = 0;
    let inProgressCount = 0;
    for (const p of PROJECTS) {
      const stat = projectStats.find((s) => s.id === p.id);
      const diffWeight = DIFFICULTY[p.difficulty]?.level || 1;
      const statusScore = STATUS_WEIGHT[stat.status] || 0;
      const itemScore = statusScore * 0.7 + stat.detailScore * 100 * 0.3;
      totalScore += itemScore * diffWeight;
      totalWeight += 100 * diffWeight;
      if (stat.status === 'complete') completeCount += 1;
      if (stat.status === 'in-progress') inProgressCount += 1;
    }
    const portfolioScore = totalWeight ? Math.round((totalScore / totalWeight) * 100) : 0;

    // Client readiness: average detailScore × % complete
    const completedDetail = projectStats
      .filter((s) => s.status === 'complete')
      .map((s) => s.detailScore);
    const avgDetail = completedDetail.length
      ? completedDetail.reduce((a, b) => a + b, 0) / completedDetail.length
      : 0;
    const clientReadiness = Math.round((completeCount / PROJECTS.length) * 100 * 0.6 + avgDetail * 100 * 0.4);

    // Skill coverage by domain (only count from completed or in-progress)
    const domainCounts = Object.fromEntries(SERVICE_DOMAINS.map((d) => [d, 0]));
    for (const p of PROJECTS) {
      const stat = projectStats.find((s) => s.id === p.id);
      if (stat.status === 'not-started') continue;
      const seen = new Set();
      for (const sid of p.services) {
        const d = getServiceMeta(sid).domain;
        if (!seen.has(d)) { domainCounts[d] += 1; seen.add(d); }
      }
    }
    const totalCoverage = PORTFOLIO_DOMAIN_COVERAGE();
    const coverageArr = SERVICE_DOMAINS.map((d) => ({
      domain: d,
      done: domainCounts[d],
      possible: totalCoverage[d],
      pct: totalCoverage[d] ? Math.round((domainCounts[d] / totalCoverage[d]) * 100) : 0,
    }));

    // Gap analysis: domains with 0 done
    const gaps = coverageArr.filter((c) => c.done === 0 && c.possible > 0).map((c) => c.domain);

    // Complexity progression: are user's completed projects trending harder?
    const completedByOrder = PROJECTS
      .filter((p) => projectStats.find((s) => s.id === p.id).status === 'complete')
      .map((p) => DIFFICULTY[p.difficulty]?.level || 1);
    let progression = 'unknown';
    if (completedByOrder.length >= 2) {
      const first = completedByOrder[0];
      const last = completedByOrder[completedByOrder.length - 1];
      progression = last > first ? 'climbing' : last === first ? 'steady' : 'plateauing';
    }

    // Recommendation: next project to attempt — highest priority not-started,
    // preferring those that fill a gap domain.
    const notStarted = PROJECTS.filter((p) => projectStats.find((s) => s.id === p.id).status === 'not-started');
    const recommendations = notStarted
      .map((p) => {
        const ps = projectStats.find((s) => s.id === p.id);
        const fillsGap = p.services.some((sid) => gaps.includes(getServiceMeta(sid).domain));
        const priorityRank = ps.priority === 'immediate' ? 3 : ps.priority === 'soon' ? 2 : 1;
        return { project: p, fillsGap, score: priorityRank * 10 + (fillsGap ? 5 : 0) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      portfolioScore,
      clientReadiness,
      coverageArr,
      gaps,
      progression,
      completeCount,
      inProgressCount,
      recommendations,
    };
  }, [projectStats]);

  const value = useMemo(() => ({
    state,
    projects: PROJECTS,
    projectStats,
    intelligence,
    getProjectState,
    updateProjectState,
    moveToStatus,
    toggleStep,
    addScreenshot,
    removeScreenshot,
    togglePublicShare,
    bumpVisitor,
    resetPortfolio,
  }), [
    state, projectStats, intelligence,
    getProjectState, updateProjectState, moveToStatus, toggleStep,
    addScreenshot, removeScreenshot, togglePublicShare, bumpVisitor, resetPortfolio,
  ]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
