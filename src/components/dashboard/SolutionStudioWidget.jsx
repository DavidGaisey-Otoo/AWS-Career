/**
 * SolutionStudioWidget.jsx — GIG-01 dashboard entry point.
 *
 * Two jobs, in priority order:
 *
 *   1. SAFETY — if any stack is live on AWS, say so loudly and give a
 *      one-tap route to tear it down. Forgotten resources are how people
 *      get surprise bills, so this outranks everything else on the card.
 *   2. ENTRY  — otherwise, invite the user into the gig → solution flow,
 *      with their recent solutions one tap away.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Wand2, ArrowRight, Cloud, Trash2, Sparkles } from 'lucide-react';
// Import from the store, NOT the pipeline — this widget is on the eagerly
// loaded Dashboard, and the pipeline drags ~220 KB of engines with it.
import { listSolutions, listLiveStacks } from '../../lib/solutionStore.js';
import { cn } from '../../lib/utils.js';

export function SolutionStudioWidget() {
  const solutions = useMemo(() => listSolutions(), []);
  const live = useMemo(() => listLiveStacks(), []);

  // ── Live stacks take over the card entirely ──────────────────────
  if (live.length > 0) {
    return (
      <section className="surface rounded-2xl p-4 border-l-4 border-l-warning">
        <div className="flex items-center gap-2 mb-2">
          <Cloud size={16} className="text-warning" />
          <strong className="text-[13.5px] text-warning">
            {live.length} stack{live.length > 1 ? 's' : ''} live on AWS
          </strong>
        </div>
        <p className="text-[11.5px] opacity-80 leading-relaxed mb-2.5">
          These are billing right now. Tear them down when you&apos;re finished with them.
        </p>
        <div className="space-y-1 mb-3">
          {live.slice(0, 3).map((s) => (
            <div key={`${s.stackName}-${s.region}`} className="flex items-center justify-between gap-2 text-[11.5px]">
              <span className="font-mono font-bold truncate">{s.stackName}</span>
              <span className="opacity-55 shrink-0">{s.region}</span>
            </div>
          ))}
        </div>
        <Link to="/solution" className="btn !text-[12px] !py-2 tap-44 gap-1.5 w-full border border-danger/50 text-danger hover:bg-danger/10">
          <Trash2 size={13} /> Manage + tear down
        </Link>
      </section>
    );
  }

  // ── Normal entry state ───────────────────────────────────────────
  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            Gig → Solution
          </div>
          <h3 className="text-[14px] font-extrabold leading-tight flex items-center gap-1.5">
            <Wand2 size={15} className="text-aws-orange shrink-0" />
            Turn any gig into a build
          </h3>
          <p className="text-[11.5px] opacity-80 mt-1 leading-relaxed">
            Paste a job post — get the architecture, names, plan, code, an expert review, and a
            button that builds it on AWS.
          </p>
        </div>
      </div>

      <Link
        to="/solution"
        className="btn btn-primary !text-[12.5px] !py-2.5 tap-44 gap-1.5 w-full mt-3"
      >
        <Sparkles size={13} /> Open Solution Studio
      </Link>

      {solutions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-token">
          <div className="text-[9.5px] font-extrabold uppercase tracking-widest opacity-55 mb-1.5">
            Recent solutions
          </div>
          <div className="space-y-1">
            {solutions.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                to={`/solution?id=${encodeURIComponent(s.id)}`}
                className="flex items-center gap-2 text-[11.5px] hover:text-aws-orange transition group"
              >
                <span className="truncate flex-1 font-bold">{s.projectName}</span>
                {s.grade && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[9px] font-extrabold shrink-0',
                    /^A/.test(s.grade) ? 'bg-success/15 text-success'
                      : /^[BC]/.test(s.grade) ? 'bg-warning/15 text-warning'
                      : 'bg-danger/15 text-danger'
                  )}>
                    {s.grade}
                  </span>
                )}
                <ArrowRight size={11} className="opacity-30 group-hover:opacity-100 transition shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
