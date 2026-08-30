/**
 * solutionStore.js — persistence for GIG-01 solutions.
 *
 * Deliberately separate from gigSolutionPipeline.js and deliberately
 * dependency-free: the Dashboard widget needs to know "is anything live
 * on AWS right now?" on every page load, and importing the pipeline for
 * that would pull the analyzer, the script generator, all 10 expert
 * agents and the project catalogue into the entry bundle (~220 KB).
 *
 * Keep this file free of imports. If you need heavy logic, it belongs in
 * the pipeline, not here.
 */

const SOLUTIONS_KEY = 'awscl-pro::v1::solutions';
const MAX_SOLUTIONS = 40;

export function listSolutions() {
  try {
    const raw = localStorage.getItem(SOLUTIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function getSolution(id) {
  return listSolutions().find((s) => s.id === id) || null;
}

export function writeSolutions(list) {
  try {
    localStorage.setItem(SOLUTIONS_KEY, JSON.stringify(list.slice(0, MAX_SOLUTIONS)));
    return true;
  } catch (err) {
    console.warn('[solutionStore] write failed:', err);
    return false;
  }
}

export function upsertSolution(record) {
  const next = [record, ...listSolutions().filter((s) => s.id !== record.id)];
  return writeSolutions(next) ? record : null;
}

export function deleteSolution(id) {
  return writeSolutions(listSolutions().filter((s) => s.id !== id));
}

export function archiveSolution(id, archived = true) {
  const all = listSolutions();
  const index = all.findIndex((item) => item.id === id);
  if (index < 0) return false;
  if (all[index].liveStack && archived) return false;
  all[index] = { ...all[index], archivedAt: archived ? new Date().toISOString() : null };
  return writeSolutions(all);
}

export function exportSolutionRecord(id) {
  const record = getSolution(id);
  if (!record) return null;
  const { deployments = [], ...safe } = record;
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    warning: 'This local export does not prove deployment, acceptance, or AWS resource destruction.',
    solution: { ...safe, deployments: deployments.map(({ detail, ...entry }) => ({ ...entry, detail: detail || null })) },
  };
}

/**
 * Record a deploy/teardown so the user always knows what is live in their
 * account and can tear it down later.
 */
export function recordDeployment(solutionId, { action, stackName, region, ok, detail }) {
  const all = listSolutions();
  const idx = all.findIndex((s) => s.id === solutionId);
  if (idx === -1) return false;

  const entry = {
    action,            // 'deploy' | 'teardown'
    stackName, region, ok,
    detail: detail || null,
    at: new Date().toISOString(),
  };
  all[idx].deployments = [entry, ...(all[idx].deployments || [])].slice(0, 20);
  all[idx].liveStack = action === 'deploy' && ok ? { stackName, region, at: entry.at }
                     : action === 'teardown' && ok ? null
                     : all[idx].liveStack;
  return writeSolutions(all);
}

/** Every stack this app believes is currently live — powers "delete everything". */
export function listLiveStacks() {
  return listSolutions()
    .filter((s) => s.liveStack)
    .map((s) => ({
      solutionId: s.id,
      title: s.title,
      stackName: s.liveStack.stackName,
      region: s.liveStack.region,
      deployedAt: s.liveStack.at,
    }));
}
