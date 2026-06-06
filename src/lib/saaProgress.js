/**
 * saaProgress.js — Tracks per-phase + per-service completion for the
 * SAA-C03 roadmap. localStorage-backed, same pattern as other stores.
 */

import { useEffect, useState, useCallback } from 'react';
import { STORAGE_KEY } from './constants.js';
import { PHASES } from '../data/saaRoadmap.js';

const KEY = `${STORAGE_KEY}::saa-progress`;
const EVT = 'saa-progress:change';

const DEFAULTS = {
  examDate: null,                 // ISO date — when's the exam
  phaseProgress: {},              // { phaseId: { services: { svcId: bool }, completedAt: ISO } }
  hoursStudied: 0,                // user-logged
  practiceScores: [],             // [{ date, score, total }]
  startedAt: null,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch { return DEFAULTS; }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(EVT));
  } catch {}
}

export function toggleService(phaseId, serviceId) {
  const state = read();
  if (!state.startedAt) state.startedAt = new Date().toISOString();
  if (!state.phaseProgress[phaseId]) state.phaseProgress[phaseId] = { services: {} };
  const cur = state.phaseProgress[phaseId].services[serviceId];
  state.phaseProgress[phaseId].services[serviceId] = !cur;
  // Mark phase complete if all "must" services are checked
  const phase = PHASES.find((p) => p.id === phaseId);
  if (phase) {
    const mustServices = phase.services.filter((s) => s.must).map((s) => s.id);
    const allDone = mustServices.every((id) => state.phaseProgress[phaseId].services[id]);
    state.phaseProgress[phaseId].completedAt = allDone ? new Date().toISOString() : null;
  }
  write(state);
}

export function setExamDate(date) {
  const state = read();
  state.examDate = date ? new Date(date).toISOString() : null;
  write(state);
}

export function logHours(delta) {
  const state = read();
  state.hoursStudied = Math.max(0, (state.hoursStudied || 0) + delta);
  write(state);
}

export function logPracticeScore(score, total = 65) {
  const state = read();
  if (!Array.isArray(state.practiceScores)) state.practiceScores = [];
  state.practiceScores.unshift({ date: new Date().toISOString(), score, total });
  state.practiceScores = state.practiceScores.slice(0, 20);
  write(state);
}

export function resetAll() {
  if (confirm('Reset all SAA roadmap progress? Cannot undo.')) write(DEFAULTS);
}

export function useSAAProgress() {
  const [state, setState] = useState(() => read());
  const refresh = useCallback(() => setState(read()), []);
  useEffect(() => {
    const h = () => refresh();
    window.addEventListener('storage', h);
    window.addEventListener(EVT, h);
    return () => {
      window.removeEventListener('storage', h);
      window.removeEventListener(EVT, h);
    };
  }, [refresh]);
  return state;
}

// ════════════════════════════════════════════════════════════════════
// Derived helpers
// ════════════════════════════════════════════════════════════════════
export function getPhaseCompletion(state, phaseId) {
  const phase = PHASES.find((p) => p.id === phaseId);
  if (!phase) return { pct: 0, done: 0, total: 0 };
  const services = phase.services || [];
  if (services.length === 0) return { pct: 0, done: 0, total: 0 };
  const checked = state.phaseProgress?.[phaseId]?.services || {};
  const done = services.filter((s) => checked[s.id]).length;
  return { pct: Math.round((done / services.length) * 100), done, total: services.length };
}

export function getPhasesComplete(state) {
  return PHASES.filter((p) => state.phaseProgress?.[p.id]?.completedAt).length;
}

export function getDaysToExam(state) {
  if (!state.examDate) return null;
  const ms = new Date(state.examDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function getLastPracticeScore(state) {
  if (!state.practiceScores?.length) return 0;
  const last = state.practiceScores[0];
  return Math.round((last.score / last.total) * 100);
}
