/**
 * Walkthroughs.jsx — list + viewer for step-by-step AWS procedures.
 *
 * Layout: split view. Left = list grouped by category, with progress badges.
 *         Right = the active walkthrough rendered via WalkthroughViewer.
 *
 * URL pattern: /walkthroughs            → list view
 *              /walkthroughs/:id        → viewer for that walkthrough
 */
import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { walkthroughsByCategory, resolveWalkthrough } from '../data/walkthroughs.js';
import { WalkthroughViewer } from '../components/walkthrough/WalkthroughViewer.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

export default function Walkthroughs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const groups = useMemo(() => walkthroughsByCategory(), []);
  const active = id ? resolveWalkthrough(id) : null;

  if (id && !active) {
    return (
      <div className="text-center py-12">
        <p className="opacity-60">Walkthrough not found.</p>
        <button onClick={() => navigate('/walkthroughs')} className="mt-3 text-sm underline">Back to list</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
        <Sidebar groups={groups} activeId={id} />
        <main className="min-w-0">
          {active ? (
            <>
              <button onClick={() => navigate('/walkthroughs')} className="text-xs opacity-60 hover:opacity-100 mb-3 flex items-center gap-1">
                <ArrowLeft size={12} /> All walkthroughs
              </button>
              <WalkthroughViewer walkthrough={active} />
            </>
          ) : (
            <EmptyState groups={groups} />
          )}
        </main>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-[var(--brand)]" />
          <h1 className="text-2xl font-bold tracking-tight">Walkthroughs</h1>
        </div>
        {/* PJ-01: Deep Walkthrough Mode entry — Standard mode untouched */}
        <Link
          to="/walkthroughs/deep"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-aws text-ink-950 text-xs font-extrabold shadow-glow-orange hover:brightness-110"
        >
          🛠 Deep Walkthroughs →
        </Link>
      </div>
      <p className="text-sm opacity-70 max-w-2xl">
        Atomic, step-by-step procedures for everything AWS. Each step is one click or one form,
        with a direct console link, a checkpoint to verify, and progress that persists across sessions.
      </p>
      <p className="text-[12px] opacity-60 mt-1.5 italic">
        Want more depth? Try <strong>Deep Walkthroughs</strong> — every step explained with WHY, real-world analogy, common mistakes, and HOW in all 4 formats (Console / CLI / CloudFormation / Terraform).
      </p>
    </div>
  );
}

function Sidebar({ groups, activeId }) {
  return (
    <aside className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] lg:overflow-y-auto">
      {Object.entries(groups).map(([cat, items]) => (
        <div key={cat}>
          <div className="px-4 py-2 border-b border-token bg-[var(--card-2)]/40 text-[10px] uppercase tracking-widest font-bold opacity-60">
            {cat}
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((w) => <SidebarItem key={w.id} w={w} active={w.id === activeId} />)}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function SidebarItem({ w, active }) {
  const [progress] = useLocalStorage(`${STORAGE_KEY}::walkthrough::${w.id}`, { done: [] });
  const pct = Math.round(((progress.done?.length || 0) / w.steps.length) * 100);
  return (
    <li>
      <Link
        to={`/walkthroughs/${w.id}`}
        className={`block px-4 py-3 hover:bg-[var(--card-2)]/40 transition-all ${active ? 'bg-[var(--card-2)]/60' : ''}`}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{w.title}</div>
            <div className="text-[10px] opacity-60 flex items-center gap-2 mt-0.5">
              <Clock size={9} /> {w.estimateMin}m · {w.steps.length} steps
            </div>
          </div>
          {pct > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              pct === 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
            }`}>{pct}%</span>
          )}
          <ChevronRight size={12} className="opacity-40 shrink-0 mt-0.5" />
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ groups }) {
  const all = Object.values(groups).flat();
  return (
    <div className="rounded-2xl border border-token bg-[var(--card)] p-8 text-center">
      <BookOpen size={32} className="mx-auto opacity-30 mb-3" />
      <h2 className="text-lg font-bold">Pick a walkthrough on the left</h2>
      <p className="text-sm opacity-70 max-w-md mx-auto mt-1">
        {all.length} walkthroughs available. Start with "Create a brand new AWS account" if you're new, or jump straight to the project guides.
      </p>
    </div>
  );
}
