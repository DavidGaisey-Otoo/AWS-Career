import { motion } from 'framer-motion';
import { Briefcase, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { KanbanBoard } from '../components/portfolio/KanbanBoard.jsx';
import { PortfolioExportShare } from '../components/portfolio/PortfolioExportShare.jsx';
import { PortfolioFilters } from '../components/portfolio/PortfolioFilters.jsx';
import { PortfolioIntelligence } from '../components/portfolio/PortfolioIntelligence.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PROJECTS, getServiceMeta } from '../data/projects.js';
import { cn } from '../lib/utils.js';

export default function Portfolio() {
  const { resetPortfolio, bumpVisitor, state } = usePortfolio();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const initialMode = params.get('view') === 'public' ? 'public' : 'editor';
  const [previewMode, setPreviewMode] = useState(initialMode);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [priority, setPriority] = useState('all');
  const [service, setService] = useState('all');

  // Collect every unique service across the catalog for the filter dropdown.
  const allServices = useMemo(() => {
    const set = new Set();
    PROJECTS.forEach((p) => p.services.forEach((s) => set.add(s)));
    return [...set];
  }, []);

  // Bump the visitor count once on a public-view landing.
  useEffect(() => {
    if (initialMode === 'public' && state.publicShareEnabled) {
      bumpVisitor();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync ?view=public out of the URL once consumed
  useEffect(() => {
    if (previewMode === 'editor' && params.get('view')) {
      const next = new URLSearchParams(params);
      next.delete('view');
      setParams(next, { replace: true });
    }
  }, [previewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const filterFn = (project) => {
    if (query) {
      const q = query.toLowerCase();
      const hit =
        project.title.toLowerCase().includes(q) ||
        project.tagline.toLowerCase().includes(q) ||
        project.skills.some((s) => s.toLowerCase().includes(q)) ||
        project.services.some((sid) => getServiceMeta(sid).label.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (difficulty !== 'all' && project.difficulty !== difficulty) return false;
    if (priority !== 'all') {
      // priority lives in user state — compute via a quick check below
    }
    if (service !== 'all' && !project.services.includes(service)) return false;
    return true;
  };

  return (
    <div
      className={cn(
        'space-y-6 transition-all',
        previewMode === 'public' && previewDevice === 'mobile' && 'max-w-[420px] mx-auto'
      )}
    >
      <PageHeader
        eyebrow="Portfolio command center"
        title={previewMode === 'public' ? 'AWS Project Portfolio' : 'Your AWS portfolio'}
        subtitle={
          previewMode === 'public'
            ? 'Hand-built, production-grade cloud projects with architecture diagrams and code.'
            : 'Drag projects across the board. Open any card for the full build guide, errors, and presentation notes.'
        }
        icon={Briefcase}
        actions={
          <div className="flex items-center gap-2">
            {previewMode === 'editor' && (
              <button
                onClick={() => {
                  if (confirm('Reset all portfolio progress, notes, screenshots? This cannot be undone.')) {
                    resetPortfolio();
                    toast.warning('Portfolio reset');
                  }
                }}
                className="btn btn-ghost !px-3"
                title="Reset portfolio"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <PortfolioExportShare
              previewDevice={previewDevice} setPreviewDevice={setPreviewDevice}
              previewMode={previewMode} setPreviewMode={setPreviewMode}
            />
          </div>
        }
      />

      <PortfolioIntelligence />

      {previewMode === 'editor' && (
        <PortfolioFilters
          query={query} setQuery={setQuery}
          difficulty={difficulty} setDifficulty={setDifficulty}
          priority={priority} setPriority={setPriority}
          service={service} setService={setService}
          services={allServices}
        />
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      >
        <KanbanBoard filterFn={filterFn} />
      </motion.div>
    </div>
  );
}
