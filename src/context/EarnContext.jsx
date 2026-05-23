/**
 * EarnContext — Stage 12 storage for:
 *  - Presentations (10-slide decks)
 *  - Emails (sent / drafts) + template library
 *  - Contracts
 *  - Delivery packages
 *
 * Invoices stay in FreelanceContext.invoices (existing).
 * Clients stay in FreelanceContext.clients (existing).
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';
import { defaultEmailLibrary } from '../data/emailTemplates.js';

const EarnContext = createContext(null);

const DEFAULT_STATE = {
  decks:      [],          // [{ id, name, brief, slides, brand, createdAt, updatedAt }]
  emails:     [],          // [{ id, at, to, subject, body, type, clientId?, projectId?, status: 'draft'|'sent', followUpAt?, replied? }]
  templates:  null,        // [{ id, name, type, category, subject, body, starred, builtIn }]
  contracts:  [],          // [{ id, ...buildContract output }]
  deliveries: [],          // [{ id, ...buildDeliveryPackage output }]
  plans:      [],          // [{ id, ...buildPlan output }]
  queue:      [],          // [{ id, kind, title, body, meta, status, scheduledAt, publishedAt, createdAt, updatedAt, tags[] }]
  lastAnalysis: null,      // { at, jdText, analysis, suggestedName, suggestedClient }
};

export function EarnProvider({ children }) {
  const [rawState, setRawState] = useLocalStorage(`${STORAGE_KEY}::earn`, DEFAULT_STATE);

  // Defensive merge — protects against schema additions for existing users.
  // (When we add a new key to DEFAULT_STATE, old localStorage state won't have it
  // and components reading `state.plans.length` would crash.)
  const state = useMemo(() => ({ ...DEFAULT_STATE, ...rawState }), [rawState]);

  // ALWAYS pass a defaults-merged state into setter callbacks so they never
  // crash on `.find`/`.filter` against an undefined array.
  const setState = useCallback((updater) => {
    setRawState((s) => {
      const merged = { ...DEFAULT_STATE, ...(s || {}) };
      return typeof updater === 'function' ? updater(merged) : updater;
    });
  }, [setRawState]);

  // First-load: seed default template library
  const templates = useMemo(() => state.templates || defaultEmailLibrary(), [state.templates]);

  // ---------------- decks ----------------
  const saveDeck = useCallback((deck) => {
    setState((s) => {
      const exists = s.decks.find((d) => d.id === deck.id);
      const next = { ...deck, updatedAt: new Date().toISOString() };
      return {
        ...s,
        decks: exists
          ? s.decks.map((d) => d.id === deck.id ? next : d)
          : [next, ...s.decks],
      };
    });
  }, [setState]);

  const deleteDeck = useCallback((id) => {
    setState((s) => ({ ...s, decks: s.decks.filter((d) => d.id !== id) }));
  }, [setState]);

  // ---------------- emails ----------------
  const addEmail = useCallback((email) => {
    const id = uid();
    setState((s) => ({
      ...s,
      emails: [{ id, at: new Date().toISOString(), status: 'draft', ...email }, ...s.emails],
    }));
    return id;
  }, [setState]);

  const updateEmail = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      emails: s.emails.map((e) => e.id === id ? { ...e, ...patch } : e),
    }));
  }, [setState]);

  const deleteEmail = useCallback((id) => {
    setState((s) => ({ ...s, emails: s.emails.filter((e) => e.id !== id) }));
  }, [setState]);

  // ---------------- templates ----------------
  const saveTemplate = useCallback((tpl) => {
    setState((s) => {
      const lib = s.templates || defaultEmailLibrary();
      const exists = lib.find((t) => t.id === tpl.id);
      const next = { ...tpl };
      return {
        ...s,
        templates: exists
          ? lib.map((t) => t.id === tpl.id ? next : t)
          : [next, ...lib],
      };
    });
  }, [setState]);

  const deleteTemplate = useCallback((id) => {
    setState((s) => {
      const lib = s.templates || defaultEmailLibrary();
      return { ...s, templates: lib.filter((t) => t.id !== id) };
    });
  }, [setState]);

  const toggleStar = useCallback((id) => {
    setState((s) => {
      const lib = s.templates || defaultEmailLibrary();
      return {
        ...s,
        templates: lib.map((t) => t.id === id ? { ...t, starred: !t.starred } : t),
      };
    });
  }, [setState]);

  // ---------------- contracts ----------------
  const saveContract = useCallback((c) => {
    setState((s) => {
      const exists = s.contracts.find((x) => x.id === c.id);
      return {
        ...s,
        contracts: exists
          ? s.contracts.map((x) => x.id === c.id ? c : x)
          : [c, ...s.contracts],
      };
    });
  }, [setState]);

  const deleteContract = useCallback((id) => {
    setState((s) => ({ ...s, contracts: s.contracts.filter((c) => c.id !== id) }));
  }, [setState]);

  // ---------------- deliveries ----------------
  const saveDelivery = useCallback((d) => {
    setState((s) => {
      const exists = s.deliveries.find((x) => x.id === d.id);
      return {
        ...s,
        deliveries: exists
          ? s.deliveries.map((x) => x.id === d.id ? d : x)
          : [d, ...s.deliveries],
      };
    });
  }, [setState]);

  const deleteDelivery = useCallback((id) => {
    setState((s) => ({ ...s, deliveries: s.deliveries.filter((d) => d.id !== id) }));
  }, [setState]);

  // ---------------- plans ----------------
  const savePlan = useCallback((p) => {
    setState((s) => {
      const exists = s.plans.find((x) => x.id === p.id);
      return {
        ...s,
        plans: exists
          ? s.plans.map((x) => x.id === p.id ? p : x)
          : [p, ...s.plans],
      };
    });
  }, [setState]);

  const deletePlan = useCallback((id) => {
    setState((s) => ({ ...s, plans: s.plans.filter((p) => p.id !== id) }));
  }, [setState]);

  // ---------------- content queue (stage drafts, publish later) ----------------
  const stageInQueue = useCallback((item) => {
    const id = item.id || ('q-' + uid());
    const now = new Date().toISOString();
    const payload = {
      kind:        item.kind || 'note',
      title:       item.title || 'Untitled',
      body:        item.body || '',
      meta:        item.meta || {},
      tags:        item.tags || [],
      status:      item.status || 'draft',         // draft | ready | scheduled | published | archived
      scheduledAt: item.scheduledAt || null,
      publishedAt: item.publishedAt || null,
      sourceId:    item.sourceId || null,
      createdAt:   now,
      updatedAt:   now,
      ...item,
      id,
    };
    setState((s) => {
      const exists = s.queue.find((q) => q.id === id);
      return {
        ...s,
        queue: exists
          ? s.queue.map((q) => q.id === id ? { ...q, ...payload, updatedAt: now } : q)
          : [payload, ...s.queue],
      };
    });
    return id;
  }, [setState]);

  const updateQueueItem = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      queue: s.queue.map((q) => q.id === id ? { ...q, ...patch, updatedAt: new Date().toISOString() } : q),
    }));
  }, [setState]);

  const removeQueueItem = useCallback((id) => {
    setState((s) => ({ ...s, queue: s.queue.filter((q) => q.id !== id) }));
  }, [setState]);

  // ---------------- last analysis (Job Analyzer → cross-page autofill) ----------------
  const setLastAnalysis = useCallback((payload) => {
    setState((s) => ({
      ...s,
      lastAnalysis: payload
        ? { at: new Date().toISOString(), ...payload }
        : null,
    }));
  }, [setState]);

  const clearLastAnalysis = useCallback(() => {
    setState((s) => ({ ...s, lastAnalysis: null }));
  }, [setState]);

  const value = useMemo(() => ({
    state: { ...state, templates },
    saveDeck, deleteDeck,
    addEmail, updateEmail, deleteEmail,
    saveTemplate, deleteTemplate, toggleStar,
    saveContract, deleteContract,
    saveDelivery, deleteDelivery,
    savePlan, deletePlan,
    stageInQueue, updateQueueItem, removeQueueItem,
    setLastAnalysis, clearLastAnalysis,
  }), [state, templates,
    saveDeck, deleteDeck,
    addEmail, updateEmail, deleteEmail,
    saveTemplate, deleteTemplate, toggleStar,
    saveContract, deleteContract,
    saveDelivery, deleteDelivery,
    savePlan, deletePlan,
    stageInQueue, updateQueueItem, removeQueueItem,
    setLastAnalysis, clearLastAnalysis,
  ]);

  return <EarnContext.Provider value={value}>{children}</EarnContext.Provider>;
}

export function useEarn() {
  const ctx = useContext(EarnContext);
  if (!ctx) throw new Error('useEarn must be used within EarnProvider');
  return ctx;
}
