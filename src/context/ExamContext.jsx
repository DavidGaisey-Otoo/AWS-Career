import { createContext, useCallback, useContext, useMemo } from 'react';
import { CERTS, getCert } from '../data/certs.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

const ExamContext = createContext(null);

const CERT_DEFAULTS = {
  attempts: [],         // { id, mode, at, score, total, correct, durationSec, byDomain: { [domainId]: {correct,total} }, questionResults: [{ qId, your, correct, isCorrect, timeSec }] }
  questionsSeen: {},    // { [qId]: { lastSeenAt, mark: 'got'|'still'|'hard' | null } }
  studyPlan: null,      // { examDate, generatedAt, tasks: [{ date, items: [...] }] }
  voucher: null,        // { code, expiry, source, addedAt }
  bestScore: 0,
  passStreak: 0,
};

const DEFAULT_STATE = {
  certs: {},
  // Lifetime totals (computed but cached for cheap reads)
  earned: { 'clf-c02': true }, // user already has Cloud Practitioner per profile
};

const newId = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36).slice(-4);
const isoNow = () => new Date().toISOString();

export function ExamProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::exam`, DEFAULT_STATE);

  // ---------- accessors ----------
  const getCertState = useCallback((certId) => ({
    ...CERT_DEFAULTS,
    ...(state.certs?.[certId] || {}),
  }), [state.certs]);

  const patchCert = useCallback((certId, patch) => {
    setState((s) => ({
      ...s,
      certs: {
        ...s.certs,
        [certId]: { ...CERT_DEFAULTS, ...(s.certs?.[certId] || {}), ...patch },
      },
    }));
  }, [setState]);

  // ---------- attempt recording ----------
  /**
   * Record a completed attempt. `attempt` shape:
   * { mode, total, correct, durationSec, byDomain, questionResults, scaledScore }
   */
  const recordAttempt = useCallback((certId, attempt) => {
    setState((s) => {
      const cs = { ...CERT_DEFAULTS, ...(s.certs?.[certId] || {}) };
      const id = newId();
      const next = {
        id,
        at: isoNow(),
        ...attempt,
      };
      const attempts = [...cs.attempts, next].slice(-50);
      const bestScore = Math.max(cs.bestScore, attempt.scaledScore || 0);
      // pass streak resets on fail, ++ on pass
      const passed = attempt.passed;
      const passStreak = passed ? (cs.passStreak + 1) : 0;
      // questionsSeen update
      const seen = { ...cs.questionsSeen };
      for (const r of attempt.questionResults || []) {
        seen[r.qId] = { lastSeenAt: isoNow(), mark: seen[r.qId]?.mark || null };
      }
      return {
        ...s,
        certs: {
          ...s.certs,
          [certId]: { ...cs, attempts, bestScore, passStreak, questionsSeen: seen },
        },
      };
    });
  }, [setState]);

  // ---------- learning-mode card marks ----------
  const markQuestion = useCallback((certId, qId, mark) => {
    setState((s) => {
      const cs = { ...CERT_DEFAULTS, ...(s.certs?.[certId] || {}) };
      return {
        ...s,
        certs: {
          ...s.certs,
          [certId]: {
            ...cs,
            questionsSeen: {
              ...cs.questionsSeen,
              [qId]: { lastSeenAt: isoNow(), mark },
            },
          },
        },
      };
    });
  }, [setState]);

  // ---------- study plan ----------
  /**
   * Generate a per-day study plan from "today" to examDate, weighted by
   * cert domains. Stored under the cert.
   */
  const generateStudyPlan = useCallback((certId, examDateISO) => {
    const cert = getCert(certId);
    if (!cert) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(examDateISO);
    end.setHours(0, 0, 0, 0);
    const days = Math.max(7, Math.round((end - start) / 86400000));

    // Distribute days across domains by weight
    const tasks = [];
    let dayIdx = 0;
    for (const dom of cert.domains) {
      const domDays = Math.max(1, Math.round((dom.weight / 100) * days));
      for (let i = 0; i < domDays && dayIdx < days; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + dayIdx);
        tasks.push({
          date: date.toISOString().slice(0, 10),
          domainId: dom.id,
          domainLabel: dom.label,
          item:
            i === domDays - 1
              ? `Practice 20Q: ${dom.label}`
              : `Study domain: ${dom.label}`,
        });
        dayIdx++;
      }
    }
    // Final week: full mock + review
    for (let i = 0; i < Math.min(7, days - dayIdx); i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + dayIdx);
      tasks.push({
        date: date.toISOString().slice(0, 10),
        domainId: null,
        item: i % 2 === 0 ? 'Full mock exam' : 'Review wrong answers from last mock',
      });
      dayIdx++;
    }

    patchCert(certId, {
      studyPlan: {
        examDate: examDateISO,
        generatedAt: isoNow(),
        tasks,
      },
    });
  }, [patchCert]);

  const clearStudyPlan = useCallback((certId) => {
    patchCert(certId, { studyPlan: null });
  }, [patchCert]);

  // ---------- vouchers ----------
  const setVoucher = useCallback((certId, voucher) => {
    patchCert(certId, { voucher });
  }, [patchCert]);

  // ---------- earned badge ----------
  const markCertEarned = useCallback((certId, on = true) => {
    setState((s) => ({ ...s, earned: { ...s.earned, [certId]: !!on } }));
  }, [setState]);

  // ---------- reset ----------
  const resetExam = useCallback(() => setState(DEFAULT_STATE), [setState]);

  // ---------- derived ----------
  const certStats = useMemo(() => {
    return CERTS.map((c) => {
      const cs = { ...CERT_DEFAULTS, ...(state.certs?.[c.id] || {}) };
      const lastAttempt = cs.attempts[cs.attempts.length - 1] || null;
      const totalQs = cs.attempts.reduce((a, x) => a + x.total, 0);
      const totalCorrect = cs.attempts.reduce((a, x) => a + x.correct, 0);
      const accuracy = totalQs ? Math.round((totalCorrect / totalQs) * 100) : 0;
      // Per-domain accuracy averaged over attempts
      const byDomainAgg = {};
      for (const at of cs.attempts) {
        for (const [dId, dStats] of Object.entries(at.byDomain || {})) {
          if (!byDomainAgg[dId]) byDomainAgg[dId] = { correct: 0, total: 0 };
          byDomainAgg[dId].correct += dStats.correct;
          byDomainAgg[dId].total += dStats.total;
        }
      }
      const domainMastery = {};
      let masterySum = 0;
      let masteryCount = 0;
      for (const dom of c.domains) {
        const ag = byDomainAgg[dom.id] || { correct: 0, total: 0 };
        const pct = ag.total ? Math.round((ag.correct / ag.total) * 100) : 0;
        domainMastery[dom.id] = pct;
        if (ag.total > 0) { masterySum += pct; masteryCount += 1; }
      }
      const avgMastery = masteryCount ? Math.round(masterySum / masteryCount) : 0;
      // Predicted pass probability: blend best-score % vs target + recent mastery
      const passPct = Math.round((c.passScore / 1000) * 100);
      const fromScore = cs.bestScore
        ? Math.min(100, Math.round((cs.bestScore / 10) / passPct * 100))
        : 0;
      const fromMastery = avgMastery;
      const predicted = Math.round(fromScore * 0.5 + fromMastery * 0.5);
      // Readiness: weighted blend of best score + accuracy + domain coverage
      const domainCoverage = Object.values(byDomainAgg).filter((x) => x.total > 0).length / c.domains.length;
      const readiness = Math.round(
        (cs.bestScore ? Math.min(100, cs.bestScore / 10) : 0) * 0.5 +
        (accuracy * 0.3) +
        (domainCoverage * 100 * 0.2)
      );

      return {
        id: c.id,
        attemptCount: cs.attempts.length,
        bestScore: cs.bestScore,
        accuracy,
        totalQuestionsAnswered: totalQs,
        passStreak: cs.passStreak,
        domainMastery,
        avgMastery,
        readiness,
        predicted,
        lastAttempt,
        earned: !!state.earned?.[c.id],
        seenCount: Object.keys(cs.questionsSeen || {}).length,
        studyPlan: cs.studyPlan,
        voucher: cs.voucher,
      };
    });
  }, [state.certs, state.earned]);

  // Lifetime aggregates for the master dashboard
  const masterStats = useMemo(() => {
    const allAttempts = certStats.flatMap((cs) => {
      const raw = state.certs?.[cs.id]?.attempts || [];
      return raw.map((a) => ({ ...a, certId: cs.id }));
    });
    const totalQ = allAttempts.reduce((a, x) => a + x.total, 0);
    const totalC = allAttempts.reduce((a, x) => a + x.correct, 0);
    const overallAccuracy = totalQ ? Math.round((totalC / totalQ) * 100) : 0;

    // Strongest = highest readiness (with at least one attempt). Weakest = lowest readiness with attempts.
    const withAttempts = certStats.filter((cs) => cs.attemptCount > 0);
    const strongest = withAttempts.reduce((best, cs) => cs.readiness > (best?.readiness ?? -1) ? cs : best, null);
    const weakest = withAttempts.reduce((worst, cs) => cs.readiness < (worst?.readiness ?? 101) ? cs : worst, null);

    // Weekly practice — count attempts in last 7 days
    const oneWeek = Date.now() - 7 * 86400000;
    const weeklyAttempts = allAttempts.filter((a) => new Date(a.at).getTime() >= oneWeek);

    // Recommended next cert — first not-earned, sorted by tier then questionsSeen
    const earnedIds = new Set(certStats.filter((cs) => cs.earned).map((cs) => cs.id));
    const candidates = CERTS.filter((c) => !earnedIds.has(c.id));
    const recommended = candidates.length > 0 ? candidates[0] : null;

    // 7-day practice histogram for the weekly chart
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      const attemptsOnDay = allAttempts.filter((a) => a.at.startsWith(key));
      return {
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()],
        date: key,
        questions: attemptsOnDay.reduce((s, a) => s + a.total, 0),
        attempts: attemptsOnDay.length,
      };
    });

    return {
      totalAttempts: allAttempts.length,
      totalQuestionsAnswered: totalQ,
      overallAccuracy,
      strongest,
      weakest,
      weeklyAttempts: weeklyAttempts.length,
      recommended,
      weeklyChart: days,
      earnedCount: earnedIds.size,
    };
  }, [certStats, state.certs]);

  const value = useMemo(() => ({
    state,
    certs: CERTS,
    certStats,
    masterStats,
    getCertState,
    recordAttempt,
    markQuestion,
    generateStudyPlan,
    clearStudyPlan,
    setVoucher,
    markCertEarned,
    resetExam,
  }), [
    state, certStats, masterStats,
    getCertState, recordAttempt, markQuestion,
    generateStudyPlan, clearStudyPlan, setVoucher, markCertEarned, resetExam,
  ]);

  return <ExamContext.Provider value={value}>{children}</ExamContext.Provider>;
}

export function useExam() {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within ExamProvider');
  return ctx;
}
