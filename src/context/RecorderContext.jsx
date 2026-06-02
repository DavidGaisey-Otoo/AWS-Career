/**
 * RecorderContext.jsx — auto-records what the user does in the app and
 * turns each "session" into a structured document.
 *
 * What it captures (low-friction — UI components call recordEvent()):
 *   • Wizard advances ({ type: 'step-complete', step, title })
 *   • Field edits      ({ type: 'field', key, valueSnippet })
 *   • Name suggestions ({ type: 'suggest', kind, suggestion })
 *   • Custom events    ({ type, ...anything })
 *
 * What it produces:
 *   • A SESSION per wizard run (or manually started) — start / pause / end
 *   • A polished markdown export via sessionToMarkdown()
 *   • A "live" feed on the Session Log page so users see history accumulating
 *
 * Storage: localStorage keyed by `${STORAGE_KEY}::recorder::sessions`.
 *
 * Privacy: ONLY values the user typed in this app are stored. AWS API
 * responses are NOT stored here — those live in DeployContext audit log.
 */
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { uid } from '../lib/utils.js';

const RecorderContext = createContext(null);
const KEY = `${STORAGE_KEY}::recorder::sessions`;

export function RecorderProvider({ children }) {
  const [sessions, setSessions] = useLocalStorage(KEY, []);
  const activeRef = useRef(new Map()); // flowId → sessionId

  function newSession(flowId, title) {
    const session = {
      id: 'rec-' + uid().slice(0, 8),
      flowId,
      title: title || flowId,
      startedAt: new Date().toISOString(),
      endedAt: null,
      events: [],
      finalValues: null,
      status: 'in-progress',
    };
    setSessions((s) => [session, ...s].slice(0, 200));
    activeRef.current.set(flowId, session.id);
    return session.id;
  }

  const startSession = useCallback((flowId, title) => {
    // If there's already an in-progress session for this flow, reuse it.
    const existing = sessions.find((s) => s.flowId === flowId && s.status === 'in-progress');
    if (existing) {
      activeRef.current.set(flowId, existing.id);
      return existing.id;
    }
    return newSession(flowId, title);
  }, [sessions]);

  const resumeSession = useCallback((flowId) => {
    const existing = sessions.find((s) => s.flowId === flowId && s.status === 'in-progress');
    if (existing) {
      activeRef.current.set(flowId, existing.id);
      return existing.id;
    }
    return newSession(flowId);
  }, [sessions]);

  const recordEvent = useCallback((event) => {
    // Find the most recently started session and append to it.
    const id = [...activeRef.current.values()].pop();
    if (!id) return;
    setSessions((s) => s.map((sess) => {
      if (sess.id !== id) return sess;
      // BF-03: dedupe — skip if the LAST event is identical (same type+key+value)
      // within the last 500ms. StrictMode + rapid handlers can fire twice.
      const last = sess.events[sess.events.length - 1];
      if (last
          && last.type === event.type
          && last.key === event.key
          && last.valueSnippet === event.valueSnippet
          && last.step === event.step
          && Date.now() - new Date(last.at).getTime() < 500) {
        console.warn('[Recorder] Skipping duplicate event:', event.type, event.key || event.step || '');
        return sess;
      }
      return { ...sess, events: [...sess.events, { at: new Date().toISOString(), ...event }] };
    }));
  }, [setSessions]);

  const endSession = useCallback((flowId, finalValues = null, status = 'complete') => {
    const id = activeRef.current.get(flowId);
    if (!id) return;
    setSessions((s) => s.map((sess) => (
      sess.id === id
        ? { ...sess, endedAt: new Date().toISOString(), finalValues, status }
        : sess
    )));
    activeRef.current.delete(flowId);
  }, [setSessions]);

  const cancelSession = useCallback((flowId) => {
    endSession(flowId, null, 'cancelled');
  }, [endSession]);

  /**
   * Delete a recorded session entirely (not undoable from the UI).
   */
  const deleteSession = useCallback((sessionId) => {
    setSessions((s) => s.filter((sess) => sess.id !== sessionId));
  }, [setSessions]);

  /**
   * Convert any recorded session into the "polished session document"
   * shape that SessionLog renders + sessionToMarkdown() turns into MD.
   *
   * Returns the same shape as src/data/sessionLog.js → SESSION_TONIGHT.
   */
  const toPolishedSession = useCallback((sess) => {
    const startedAt = sess.startedAt ? new Date(sess.startedAt) : new Date();
    const endedAt = sess.endedAt ? new Date(sess.endedAt) : new Date();
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    const completes = sess.events.filter((e) => e.type === 'step-complete');
    const suggests  = sess.events.filter((e) => e.type === 'suggest');
    const fields    = sess.events.filter((e) => e.type === 'field');

    const steps = completes.map((e, i) => ({
      n: i + 1,
      phase: sess.flowId || 'wizard',
      title: e.title || e.step || `Step ${i + 1}`,
      body: `Completed step "${e.title || e.step}" via the in-app wizard.`,
      checkpoint: 'Step recorded.',
      durationMin: 1,
    }));

    // Auto-derive outcomes from finalValues + suggestions
    const outcomes = [];
    if (sess.finalValues) {
      for (const [k, v] of Object.entries(sess.finalValues)) {
        if (v && typeof v !== 'object') {
          outcomes.push({ label: friendlyKey(k), status: 'done', note: String(v).slice(0, 120) });
        }
      }
    }
    if (suggests.length) {
      outcomes.push({
        label: `${suggests.length} smart suggestion${suggests.length === 1 ? '' : 's'} auto-generated`,
        status: 'done',
        note: suggests.slice(-3).map((s) => `${s.kind}: ${s.suggestion}`).join(' · '),
      });
    }

    return {
      id: sess.id,
      date: (sess.startedAt || '').slice(0, 10),
      title: sess.title || sess.flowId,
      summary: `In-app session — ${completes.length} step${completes.length === 1 ? '' : 's'} completed, ${fields.length} field edit${fields.length === 1 ? '' : 's'}, ${suggests.length} name suggestion${suggests.length === 1 ? '' : 's'} accepted.`,
      durationMin,
      outcomes,
      steps,
      nextSteps: sess.status === 'complete'
        ? ['Export this session as PDF / Markdown from the Session Log page.', 'Push the project to GitHub from the Project Builder.']
        : ['Resume this session from the Project Builder to continue.'],
    };
  }, []);

  const value = useMemo(() => ({
    sessions,
    startSession,
    resumeSession,
    recordEvent,
    endSession,
    cancelSession,
    deleteSession,
    toPolishedSession,
  }), [sessions, startSession, resumeSession, recordEvent, endSession, cancelSession, deleteSession, toPolishedSession]);

  return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>;
}

export function useRecorder() {
  const ctx = useContext(RecorderContext);
  if (!ctx) {
    // Soft fallback — components shouldn't crash if the provider is missing.
    return {
      sessions: [],
      startSession: () => null,
      resumeSession: () => null,
      recordEvent: () => {},
      endSession: () => {},
      cancelSession: () => {},
      deleteSession: () => {},
      toPolishedSession: () => null,
    };
  }
  return ctx;
}

function friendlyKey(k) {
  return k
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/_/g, ' ');
}
