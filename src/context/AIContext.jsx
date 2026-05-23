import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const AIContext = createContext(null);

const DEFAULT_STATE = {
  // Study Assistant chat — single conversation, persisted
  chat: [],                  // [{ id, role, text, at, suggestions?, links? }]
  savedNotes: [],            // [{ id, source, text, at }] — "save AI response to notes"

  // Career Coach
  coach: {
    upworkProfile: '',
    upworkScore: null,
    proposals: [],           // [{ id, jobDesc, proposal, at }]
    pricingHistory: [],      // [{ id, description, recommendation, at }]
    portfolioScore: null,
    linkedinPlan: null,
  },

  // Architecture Studio
  diagrams: [],              // [{ id, name, nodes, edges, createdAt, updatedAt }]
  currentDiagramId: null,

  // Interview simulator
  interviews: [],            // [{ id, role, level, company, transcript, score, at }]

  // Saved AI artifacts (general bucket for things the user pins)
  pinned: [],
};

export function AIProvider({ children }) {
  const [state, setState] = useLocalStorage(`${STORAGE_KEY}::ai`, DEFAULT_STATE);

  // ----------- Chat -----------
  const appendMessage = useCallback((m) => {
    setState((s) => ({
      ...s,
      chat: [...s.chat, { id: m.id || uid(), at: new Date().toISOString(), ...m }].slice(-200),
    }));
  }, [setState]);

  const replaceLastMessage = useCallback((patch) => {
    setState((s) => {
      const next = s.chat.slice();
      if (next.length === 0) return s;
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return { ...s, chat: next };
    });
  }, [setState]);

  const clearChat = useCallback(() => setState((s) => ({ ...s, chat: [] })), [setState]);

  // ----------- Notes -----------
  const saveAINote = useCallback((source, text) => {
    setState((s) => ({
      ...s,
      savedNotes: [{ id: uid(), at: new Date().toISOString(), source, text }, ...s.savedNotes].slice(0, 100),
    }));
  }, [setState]);

  const deleteAINote = useCallback((id) => {
    setState((s) => ({ ...s, savedNotes: s.savedNotes.filter((n) => n.id !== id) }));
  }, [setState]);

  // ----------- Coach -----------
  const setCoach = useCallback((patch) => {
    setState((s) => ({ ...s, coach: { ...s.coach, ...patch } }));
  }, [setState]);

  const addProposal = useCallback((entry) => {
    setState((s) => ({
      ...s,
      coach: {
        ...s.coach,
        proposals: [{ id: uid(), at: new Date().toISOString(), ...entry }, ...s.coach.proposals].slice(0, 50),
      },
    }));
  }, [setState]);

  const addPricing = useCallback((entry) => {
    setState((s) => ({
      ...s,
      coach: {
        ...s.coach,
        pricingHistory: [{ id: uid(), at: new Date().toISOString(), ...entry }, ...s.coach.pricingHistory].slice(0, 50),
      },
    }));
  }, [setState]);

  // ----------- Diagrams -----------
  const saveDiagram = useCallback((diagram) => {
    setState((s) => {
      const idx = s.diagrams.findIndex((d) => d.id === diagram.id);
      const stamp = new Date().toISOString();
      const next = idx >= 0
        ? s.diagrams.map((d, i) => (i === idx ? { ...d, ...diagram, updatedAt: stamp } : d))
        : [...s.diagrams, { ...diagram, id: diagram.id || uid(), createdAt: stamp, updatedAt: stamp }];
      return { ...s, diagrams: next, currentDiagramId: diagram.id || next[next.length - 1].id };
    });
  }, [setState]);

  const deleteDiagram = useCallback((id) => {
    setState((s) => ({
      ...s,
      diagrams: s.diagrams.filter((d) => d.id !== id),
      currentDiagramId: s.currentDiagramId === id ? null : s.currentDiagramId,
    }));
  }, [setState]);

  const setCurrentDiagram = useCallback((id) => {
    setState((s) => ({ ...s, currentDiagramId: id }));
  }, [setState]);

  // ----------- Interviews -----------
  const saveInterview = useCallback((entry) => {
    setState((s) => ({
      ...s,
      interviews: [{ id: uid(), at: new Date().toISOString(), ...entry }, ...s.interviews].slice(0, 50),
    }));
  }, [setState]);

  // ----------- Reset -----------
  const resetAI = useCallback(() => setState(DEFAULT_STATE), [setState]);

  const value = useMemo(() => ({
    state,
    appendMessage,
    replaceLastMessage,
    clearChat,
    saveAINote,
    deleteAINote,
    setCoach,
    addProposal,
    addPricing,
    saveDiagram,
    deleteDiagram,
    setCurrentDiagram,
    saveInterview,
    resetAI,
  }), [state, appendMessage, replaceLastMessage, clearChat,
       saveAINote, deleteAINote, setCoach, addProposal, addPricing,
       saveDiagram, deleteDiagram, setCurrentDiagram, saveInterview, resetAI]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error('useAI must be used within AIProvider');
  return ctx;
}
