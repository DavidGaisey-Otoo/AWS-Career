import { useMemo } from 'react';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { COMPLETED_CASE_STUDIES } from '../data/completedCaseStudies.js';
import { MY_DOCUMENTS, MY_PROJECTS } from '../data/myWork.js';
import { PROJECTS } from '../data/projects.js';
import { buildWorkspace } from '../lib/projectWorkspace.js';
import { listSolutions } from '../lib/solutionStore.js';

/**
 * Every job, built from every store that holds a piece of one.
 *
 * Shared by Jobs → All jobs and Today, so the two can never disagree about
 * what jobs exist.
 */
export function useWorkspace() {
  const earn = useEarn();
  const freelance = useFreelance();
  const portfolio = usePortfolio();

  // The portfolio store is keyed by catalogue project id and holds only
  // progress — no title, no services. Shown raw it reads as "p-s3-cf",
  // and its one row reads as "Portfolio record".
  const portfolioEntries = useMemo(() => {
    const saved = portfolio?.state?.projects || {};
    const out = {};
    for (const [id, entry] of Object.entries(saved)) {
      const cat = PROJECTS.find((x) => x.id === id);
      out[id] = {
        ...(entry || {}),
        title: entry?.title || cat?.title || id,
        services: entry?.services || cat?.services || [],
      };
    }
    return out;
  }, [portfolio?.state]);

  return useMemo(() => buildWorkspace({
    solutions: listSolutions() || [],
    // Work already recorded in the app but living only on the documents
    // page, so the workspace reported nothing while real work existed.
    caseStudies: [...COMPLETED_CASE_STUDIES, ...MY_PROJECTS],
    proposals: freelance?.state?.proposals || [],
    emails: earn?.state?.emails || [],
    portfolio: portfolioEntries,
    documents: [...(earn?.state?.deliveries || []), ...MY_DOCUMENTS],
    decks: earn?.state?.decks || [],
    contracts: earn?.state?.contracts || [],
    invoices: freelance?.state?.invoices || [],
    plans: earn?.state?.plans || [],
  }), [earn?.state, freelance?.state, portfolioEntries]);
}
