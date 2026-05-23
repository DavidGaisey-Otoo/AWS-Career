import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const UKContext = createContext(null);

const DEFAULT_STATE = {
  application: {
    universityName: '',
    programme: '',
    submittedOn: null,
    startDate: null,
    status: 'not-started',
    reference: '',
    applicationFeeGBP: 0,
    documents: {},       // { [docName]: true }
    comms: [],           // [{ id, at, channel, note }]
    stageDates: {},      // { [statusId]: ISO string }
    stageNotes: {},      // { [statusId]: string }
  },
  visaChecklist: {},     // { [stepId]: true }
  selectedCity: 'manchester',
  freelanceMonthlyGBP: 600,  // expected supplementary freelance income (GBP/mo)
};

export function UKProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::uk`, DEFAULT_STATE);

  const updateApplication = useCallback((patch) => {
    setState((s) => ({ ...s, application: { ...s.application, ...patch } }));
  }, [setState]);

  const toggleDoc = useCallback((doc) => {
    setState((s) => {
      const docs = { ...(s.application.documents || {}) };
      if (docs[doc]) delete docs[doc]; else docs[doc] = true;
      return { ...s, application: { ...s.application, documents: docs } };
    });
  }, [setState]);

  const toggleVisaStep = useCallback((stepId) => {
    setState((s) => {
      const next = { ...s.visaChecklist };
      if (next[stepId]) delete next[stepId]; else next[stepId] = true;
      return { ...s, visaChecklist: next };
    });
  }, [setState]);

  const setStageDate = useCallback((stageId, dateISO) => {
    setState((s) => ({
      ...s,
      application: {
        ...s.application,
        stageDates: { ...(s.application.stageDates || {}), [stageId]: dateISO || null },
      },
    }));
  }, [setState]);

  const setStageNote = useCallback((stageId, note) => {
    setState((s) => ({
      ...s,
      application: {
        ...s.application,
        stageNotes: { ...(s.application.stageNotes || {}), [stageId]: note },
      },
    }));
  }, [setState]);

  const addComm = useCallback((note, channel = 'email') => {
    setState((s) => ({
      ...s,
      application: {
        ...s.application,
        comms: [{ id: uid(), at: new Date().toISOString(), channel, note }, ...(s.application.comms || [])],
      },
    }));
  }, [setState]);

  const setSelectedCity = useCallback((id) => {
    setState((s) => ({ ...s, selectedCity: id }));
  }, [setState]);

  const setFreelanceMonthlyGBP = useCallback((n) => {
    setState((s) => ({ ...s, freelanceMonthlyGBP: Math.max(0, Number(n) || 0) }));
  }, [setState]);

  const resetUK = useCallback(() => setState(DEFAULT_STATE), [setState]);

  const value = useMemo(() => ({
    state,
    updateApplication, toggleDoc, toggleVisaStep, addComm,
    setStageDate, setStageNote,
    setSelectedCity, setFreelanceMonthlyGBP, resetUK,
  }), [state, updateApplication, toggleDoc, toggleVisaStep, addComm, setStageDate, setStageNote, setSelectedCity, setFreelanceMonthlyGBP, resetUK]);

  return <UKContext.Provider value={value}>{children}</UKContext.Provider>;
}

export function useUK() {
  const ctx = useContext(UKContext);
  if (!ctx) throw new Error('useUK must be used within UKProvider');
  return ctx;
}
