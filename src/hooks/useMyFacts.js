import { useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { buildFacts, FACTS_KEY_SUFFIX } from '../lib/myFacts.js';

/**
 * The facts every proposal and job check reads. Only the editable detail
 * is stored (small); the facts are rebuilt from it and MY_PROFILE.
 */
export function useMyFacts() {
  const [detail, setDetail] = useLocalStorage(`${STORAGE_KEY}${FACTS_KEY_SUFFIX}`, {});
  const facts = useMemo(() => buildFacts(detail || {}), [detail]);
  const update = (patch) => setDetail((d) => ({ ...(d || {}), ...patch }));
  const updateUpwork = (patch) => setDetail((d) => ({ ...(d || {}), upwork: { ...(d?.upwork || {}), ...patch } }));
  return { facts, detail: detail || {}, update, updateUpwork };
}
