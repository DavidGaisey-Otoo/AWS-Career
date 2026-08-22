/**
 * SolutionStudio.jsx — GIG-01 "gig in, solution out".
 *
 * The one page that answers "I found a gig — now what?".
 *
 * Flow:
 *   paste/pick a gig → ANALYSE → a complete solution appears as a
 *   numbered stepper the user can read top-to-bottom:
 *
 *     1  What I understood   services, region, compliance, budget, timeline
 *     2  Your solution       matched blueprint (or custom) + architecture
 *     3  Names               auto-named project + stack (editable)
 *     4  How to build it     4 approaches, best one pre-selected
 *     5  Delivery plan       phases + tasks, client-ready
 *     6  Expert review       10 architects score the design before you ship
 *     7  Build it            one-click CloudFormation deploy
 *     8  Tear it down        one-click delete, so nothing is left billing
 *
 * Deep links:
 *   /solution?gig=<base64 json>   from the Gig Feed "Build this" button
 *   /solution?brief=<text>        from anywhere else
 *   /solution?id=<solutionId>     re-open a saved solution
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Sparkles, ChevronDown, Rocket, Trash2, Save, FileText, MapPin,
  ShieldCheck, AlertTriangle, CheckCircle2, Loader2, Copy, Download,
  Layers, ClipboardList, Target, Briefcase, Clock, DollarSign, Info,
  RefreshCw, ExternalLink, Cloud, ArrowRight, Lightbulb,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  runPipeline, saveSolution, getSolution, listSolutions,
  recordDeployment, listLiveStacks, deleteSolution,
} from '../lib/gigSolutionPipeline.js';
import { getApproachById } from '../lib/approachRecommender.js';
import { DeployFromScriptModal } from '../components/deploy/DeployFromScriptModal.jsx';
import { TeardownModal } from '../components/deploy/TeardownModal.jsx';
import { cn } from '../lib/utils.js';

/**
 * The four verdict tiers the pipeline can return, and how each one looks.
 * 'caution' exists so a single "high" finding doesn't brand an otherwise
 * excellent design as broken — only criticals actually stop you.
 */
const VERDICT = {
  ready: {
    label: 'Ready to build',
    border: 'border-l-success', text: 'text-success', bg: 'bg-success/10',
    chip: 'bg-success/20 text-success', ok: true,
  },
  caution: {
    label: 'Good — read the warnings first',
    border: 'border-l-warning', text: 'text-warning', bg: 'bg-warning/10',
    chip: 'bg-warning/20 text-warning', ok: true,
  },
  'fix-first': {
    label: 'Fix the critical issues first',
    border: 'border-l-danger', text: 'text-danger', bg: 'bg-danger/10',
    chip: 'bg-danger/20 text-danger', ok: false,
  },
  blocked: {
    label: 'Needs more detail',
    border: 'border-l-danger', text: 'text-danger', bg: 'bg-danger/10',
    chip: 'bg-danger/20 text-danger', ok: false,
  },
};

const EXAMPLES = [
  {
    label: 'E-commerce migration',
    text: 'We need to migrate our PCI-DSS compliant e-commerce store to AWS. Expecting 50,000 concurrent users during sales. Need high availability, a managed database, and a CDN. UK-based customers. Budget £8,000, timeline 2 weeks.',
  },
  {
    label: 'Serverless API',
    text: 'Build a REST API using Lambda and API Gateway with a DynamoDB backend. Small startup, low budget, needs to be cheap to run and scale to zero when idle.',
  },
  {
    label: 'Static website',
    text: 'I need a simple static website hosted on S3 with a custom domain and HTTPS for my bakery. Should be fast worldwide and cost almost nothing.',
  },
];

export default function SolutionStudio() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [brief, setBrief] = useState('');
  const [gigMeta, setGigMeta] = useState(null);
  const [solution, setSolution] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [teardownTarget, setTeardownTarget] = useState(null);
  const [savedList, setSavedList] = useState(() => listSolutions());
  const resultRef = useRef(null);

  // ── Deep-link handling ───────────────────────────────────────────
  useEffect(() => {
    const gigParam = params.get('gig');
    const briefParam = params.get('brief');
    const idParam = params.get('id');

    if (idParam) {
      const rec = getSolution(idParam);
      if (rec) {
        setBrief(rec.brief || '');
        // Re-run the pipeline so the full (untrimmed) solution is available
        analyse(rec.brief || '', null, { silent: true });
      }
      return;
    }
    if (gigParam) {
      try {
        const gig = JSON.parse(decodeURIComponent(escape(atob(gigParam))));
        setGigMeta(gig);
        analyse(gig, gig, { silent: true });
      } catch {
        toast?.error?.('That gig link looks corrupted — paste the description instead.');
      }
      return;
    }
    if (briefParam) {
      setBrief(briefParam);
      analyse(briefParam, null, { silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Run the pipeline ─────────────────────────────────────────────
  function analyse(input, meta = null, { silent = false } = {}) {
    const text = typeof input === 'string' ? input : (input?.description || '');
    if (typeof input === 'string' && !text.trim()) {
      toast?.error?.('Paste a gig description first.');
      return;
    }
    setAnalysing(true);
    setSaved(false);
    // Let the spinner paint before the (synchronous) engines run
    setTimeout(() => {
      try {
        const result = runPipeline(input);
        setSolution(result);
        if (typeof input !== 'string') setBrief(result.input.brief);
        if (!silent) toast?.success?.(`Solution ready — ${result.services.length} services, ${result.plan.phases.length} phases.`);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      } catch (err) {
        console.error('[SolutionStudio] pipeline failed:', err);
        toast?.error?.('Could not analyse that brief. Try adding more detail about what needs building.');
      } finally {
        setAnalysing(false);
      }
    }, 60);
  }

  function handleSave() {
    if (!solution) return;
    const rec = saveSolution(solution);
    if (rec) {
      setSaved(true);
      setSavedList(listSolutions());
      toast?.success?.('Saved. Find it under "Your solutions" any time.');
    } else {
      toast?.error?.('Could not save — browser storage may be full.');
    }
  }

  function handleDeployComplete(result) {
    const rec = saved ? solution : saveSolution(solution);
    if (rec) { setSaved(true); setSavedList(listSolutions()); }
    recordDeployment(solution.id, {
      action: 'deploy',
      stackName: solution.deploy.stackName,
      region: solution.deploy.region,
      ok: !!result?.ok,
      detail: result?.ok ? 'Stack created' : (result?.error || 'Deploy failed'),
    });
    setSavedList(listSolutions());
    if (result?.ok) {
      toast?.success?.('Live on AWS. Remember to tear it down when you\'re done.');
    }
  }

  const liveStacks = useMemo(() => listLiveStacks(), [savedList]);

  return (
    <div className="pb-24">
      <PageHeader
        eyebrow="Gig → Solution"
        icon={Wand2}
        title="Solution Studio"
        subtitle="Paste any gig or job post. Get the services, the architecture, the names, the plan, the code, an expert review — and a button that builds it on AWS."
        actions={
          solution && (
            <button
              onClick={() => { setSolution(null); setBrief(''); setGigMeta(null); setParams({}); }}
              className="btn btn-ghost !text-[12px] tap-44 gap-1.5"
            >
              <RefreshCw size={13} /> New
            </button>
          )
        }
      />

      {/* ── LIVE STACKS BANNER — always visible, never lose track ──── */}
      {liveStacks.length > 0 && (
        <LiveStacksBanner
          stacks={liveStacks}
          onTeardown={(s) => setTeardownTarget(s)}
        />
      )}

      {/* ── INPUT ──────────────────────────────────────────────────── */}
      {!solution && (
        <section className="surface rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-2.5">
            <Sparkles size={18} className="text-aws-orange shrink-0 mt-0.5" />
            <div>
              <h2 className="text-[15px] font-extrabold">Describe the work — or paste the gig</h2>
              <p className="text-[12.5px] opacity-75 mt-0.5 leading-relaxed">
                A job post, a client email, a WhatsApp message, or a few sentences of your own.
                The more detail, the sharper the solution.
              </p>
            </div>
          </div>

          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={7}
            placeholder="e.g. We need a web app on AWS that handles 10,000 users, stores customer records securely, and stays under $200/month…"
            className="w-full rounded-xl bg-[var(--card-2)] border border-token p-3.5 text-[13.5px] leading-relaxed outline-none focus:border-aws-orange resize-y"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => analyse(brief)}
              disabled={analysing || !brief.trim()}
              className={cn(
                'btn btn-primary !text-[13.5px] !py-3 !px-5 tap-44 gap-2 flex-1 sm:flex-none',
                (analysing || !brief.trim()) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {analysing
                ? <><Loader2 size={15} className="animate-spin" /> Designing your solution…</>
                : <><Wand2 size={15} /> Build my solution</>}
            </button>
            <Link to="/freelance?tab=gigs" className="btn btn-ghost !text-[12px] tap-44 gap-1.5">
              <Briefcase size={13} /> Pick from live gigs
            </Link>
          </div>

          {/* Examples */}
          <div className="pt-3 border-t border-token">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-2">
              Or try an example
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setBrief(ex.text); analyse(ex.text); }}
                  className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition tap-44"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Saved solutions */}
          {savedList.length > 0 && (
            <div className="pt-3 border-t border-token">
              <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-2">
                Your solutions ({savedList.length})
              </div>
              <div className="space-y-1.5">
                {savedList.slice(0, 5).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setBrief(s.brief); analyse(s.brief); }}
                    className="w-full text-left rounded-lg border border-token hover:border-aws-orange/50 p-2.5 transition group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] font-bold truncate">{s.projectName}</div>
                        <div className="text-[10.5px] opacity-60 truncate">
                          {s.serviceLabels?.slice(0, 4).join(' · ')} · {s.region}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {s.liveStack && (
                          <span className="px-1.5 py-0.5 rounded-full bg-success/15 text-success text-[9px] font-extrabold uppercase">
                            Live
                          </span>
                        )}
                        {s.grade && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[var(--card-2)] text-[9.5px] font-extrabold">
                            {s.grade}
                          </span>
                        )}
                        <ArrowRight size={12} className="opacity-40 group-hover:opacity-100 group-hover:text-aws-orange transition" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── ANALYSING ──────────────────────────────────────────────── */}
      {analysing && !solution && <AnalysingCard />}

      {/* ── RESULT ─────────────────────────────────────────────────── */}
      {solution && (
        <div ref={resultRef} className="space-y-3">
          <SolutionHeader
            solution={solution}
            gigMeta={gigMeta}
            saved={saved}
            onSave={handleSave}
          />

          <Step n={1} title="What I understood" icon={Lightbulb} defaultOpen>
            <UnderstandingPanel solution={solution} />
          </Step>

          <Step n={2} title="Your solution" icon={Layers} defaultOpen>
            <BlueprintPanel solution={solution} />
          </Step>

          <Step n={3} title="Names — already picked for you" icon={Target}>
            <NamesPanel solution={solution} />
          </Step>

          <Step n={4} title="How to build it" icon={ClipboardList} defaultOpen>
            <ApproachPanel solution={solution} />
          </Step>

          <Step n={5} title="Your delivery plan" icon={ClipboardList}>
            <PlanPanel solution={solution} />
          </Step>

          <Step
            n={6}
            title="Expert review"
            icon={ShieldCheck}
            badge={solution.review.expert && (
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-extrabold',
                (VERDICT[solution.review.verdict] || VERDICT.blocked).chip
              )}>
                {solution.review.grade} · {solution.review.expert.score}
              </span>
            )}
            defaultOpen
          >
            <ReviewPanel solution={solution} />
          </Step>

          <Step n={7} title="Build it on AWS" icon={Rocket} defaultOpen>
            <BuildPanel
              solution={solution}
              onDeploy={() => setDeployOpen(true)}
            />
          </Step>

          <Step n={8} title="Tear it down" icon={Trash2}>
            <TeardownPanel
              solution={solution}
              liveStacks={liveStacks}
              onTeardown={(s) => setTeardownTarget(s)}
            />
          </Step>

          {/* Next actions */}
          <NextActions solution={solution} />
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────── */}
      {solution && (
        <DeployFromScriptModal
          open={deployOpen}
          onClose={() => setDeployOpen(false)}
          format="cfn"
          script={solution.deploy.template || ''}
          defaultStackName={solution.deploy.stackName}
          defaultRegion={solution.deploy.region}
          onDeployComplete={handleDeployComplete}
        />
      )}

      <TeardownModal
        open={!!teardownTarget}
        onClose={() => setTeardownTarget(null)}
        stackName={teardownTarget?.stackName}
        region={teardownTarget?.region}
        title={teardownTarget?.title}
        onComplete={(result) => {
          if (teardownTarget?.solutionId) {
            recordDeployment(teardownTarget.solutionId, {
              action: 'teardown',
              stackName: teardownTarget.stackName,
              region: teardownTarget.region,
              ok: !!result?.ok,
              detail: result?.ok ? 'Stack deleted' : (result?.error || 'Delete failed'),
            });
            setSavedList(listSolutions());
          }
          if (result?.ok) toast?.success?.('Torn down. Nothing left billing.');
        }}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Stepper shell
// ════════════════════════════════════════════════════════════════════
function Step({ n, title, icon: Icon, children, defaultOpen = false, badge = null }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="surface rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--card-2)]/40 transition tap-44"
      >
        <div className="grid place-items-center w-7 h-7 rounded-full bg-aws-orange/15 text-aws-orange text-[12px] font-black shrink-0">
          {n}
        </div>
        {Icon && <Icon size={15} className="text-aws-orange shrink-0" />}
        <h3 className="flex-1 text-[14px] font-extrabold leading-tight">{title}</h3>
        {badge}
        <ChevronDown size={15} className={cn('opacity-50 transition shrink-0', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function AnalysingCard() {
  const steps = [
    'Reading the brief…',
    'Detecting AWS services…',
    'Matching a proven architecture…',
    'Choosing the best build approach…',
    'Generating infrastructure code…',
    'Running the 10-architect review…',
  ];
  return (
    <section className="surface rounded-2xl p-8 text-center space-y-3">
      <Loader2 size={30} className="mx-auto animate-spin text-aws-orange" />
      <div className="text-[14px] font-extrabold">Designing your solution</div>
      <div className="space-y-1">
        {steps.map((s, i) => (
          <motion.div
            key={s}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.22 }}
            className="text-[11.5px] opacity-70"
          >
            {s}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// Header summary
// ════════════════════════════════════════════════════════════════════
function SolutionHeader({ solution, gigMeta, saved, onSave }) {
  const v = VERDICT[solution.review.verdict] || VERDICT.blocked;

  return (
    <section className={cn('surface rounded-2xl p-5 border-l-4', v.border)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            {solution.blueprints.best ? 'Matched a proven blueprint' : 'Custom architecture'}
          </div>
          <h2 className="text-lg sm:text-xl font-black leading-tight">{solution.names.projectName}</h2>
          <p className="text-[12px] opacity-80 mt-1">{solution.analysis.summary}</p>
          {gigMeta?.url && (
            <a
              href={gigMeta.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-aws-orange font-bold mt-1.5 hover:underline"
            >
              Original gig on {gigMeta.sourceLabel} <ExternalLink size={9} />
            </a>
          )}
        </div>
        <button
          onClick={onSave}
          disabled={saved}
          className={cn('btn !text-[12px] tap-44 gap-1.5 shrink-0', saved ? 'btn-ghost opacity-60' : 'btn-primary')}
        >
          {saved ? <><CheckCircle2 size={13} /> Saved</> : <><Save size={13} /> Save</>}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
        <Stat label="Services" value={solution.services.length} />
        <Stat label="Region" value={solution.region.primary} mono />
        <Stat label="Est. effort" value={`${solution.plan.estimatedDays}d`} />
        <Stat
          label="Review"
          value={solution.review.grade || '—'}
          className={v.text}
        />
      </div>

      <div className={cn('mt-3 rounded-lg p-2.5 text-[11.5px] font-bold flex items-center gap-2', v.bg, v.text)}>
        {v.ok ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {v.label}
        {solution.review.blockers.length > 0 && ` — ${solution.review.blockers.length} critical issue${solution.review.blockers.length > 1 ? 's' : ''}`}
        {!solution.review.blockers.length && solution.review.highs.length > 0
          && ` — ${solution.review.highs.length} thing${solution.review.highs.length > 1 ? 's' : ''} worth checking`}
      </div>
    </section>
  );
}

function Stat({ label, value, mono, className }) {
  return (
    <div className="rounded-lg bg-[var(--card-2)]/60 border border-token p-2.5">
      <div className="text-[9.5px] font-extrabold uppercase tracking-wider opacity-55">{label}</div>
      <div className={cn('text-[15px] font-black mt-0.5', mono && 'font-mono text-[13px]', className)}>
        {value}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 1 — Understanding
// ════════════════════════════════════════════════════════════════════
function UnderstandingPanel({ solution }) {
  const { analysis, region, understanding } = solution;
  const budgetText = formatBudget(analysis.budget);
  const facts = [
    analysis.client && { icon: Briefcase, label: 'Client', value: analysis.client },
    budgetText && { icon: DollarSign, label: 'Budget', value: budgetText },
    understanding.extracted.timeline && { icon: Clock, label: 'Timeline', value: understanding.extracted.timeline.label },
    { icon: MapPin, label: 'Region', value: `${region.primary} — ${region.confidence} confidence` },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {facts.map((f) => (
          <div key={f.label} className="flex items-start gap-2 rounded-lg bg-[var(--card-2)]/50 border border-token p-2.5">
            <f.icon size={13} className="text-aws-orange shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[9.5px] font-extrabold uppercase tracking-wider opacity-55">{f.label}</div>
              <div className="text-[12.5px] font-bold truncate">{f.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Services */}
      <div>
        <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-1.5">
          AWS services detected ({solution.services.length})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {solution.services.map((s) => (
            <span
              key={s.id}
              title={s.costNote || s.label}
              className="px-2 py-1 rounded-lg bg-aws-orange/10 text-aws-orange border border-aws-orange/25 text-[11px] font-bold"
            >
              {s.label}
            </span>
          ))}
          {solution.services.length === 0 && (
            <span className="text-[12px] opacity-60 italic">
              No specific services detected — add more technical detail to the brief.
            </span>
          )}
        </div>
      </div>

      {/* Compliance */}
      {solution.understanding.compliance.length > 0 && (
        <div className="rounded-lg border border-warning/35 bg-warning/5 p-2.5">
          <div className="flex items-center gap-1.5 text-warning font-extrabold text-[11.5px] mb-1">
            <ShieldCheck size={13} /> Compliance detected
          </div>
          <div className="text-[11.5px] opacity-90">
            {solution.understanding.compliance.map((c) => c.label).join(', ')} — the architecture below
            already accounts for this, and the expert review checks it.
          </div>
        </div>
      )}

      {/* Region reasoning */}
      {region.reasons?.length > 0 && (
        <details className="text-[11.5px]">
          <summary className="cursor-pointer font-bold opacity-70 hover:opacity-100">
            Why {region.primary}?
          </summary>
          <ul className="mt-1.5 space-y-1 pl-4 list-disc opacity-85 leading-relaxed">
            {region.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </details>
      )}

      {/* Missing info */}
      {analysis.missingQuestions?.length > 0 && (
        <div className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2.5">
          <div className="flex items-center gap-1.5 font-extrabold text-[11.5px] mb-1 opacity-80">
            <Info size={13} /> Ask the client these before you quote
          </div>
          <ul className="space-y-0.5 pl-4 list-disc text-[11.5px] opacity-85 leading-relaxed">
            {analysis.missingQuestions.slice(0, 5).map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </div>
      )}

      {solution.review.readiness?.assumptions?.length > 0 && (
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-2.5">
          <div className="flex items-center gap-1.5 text-warning font-extrabold text-[11.5px] mb-1">
            <AlertTriangle size={13} /> Assumptions requiring client confirmation
          </div>
          <p className="text-[11px] opacity-75 mb-1.5">
            These are unknowns, not facts. The solution is not client-ready until they are answered.
          </p>
          <ul className="space-y-1 pl-4 list-disc text-[11.5px] opacity-90 leading-relaxed">
            {solution.review.readiness.assumptions.slice(0, 5).map((a) => <li key={a.id}>{a.statement}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * analyseProject returns budget as { currency, fixed?, monthly?, awsMonthly? }
 * with no display string, so build one here rather than stringifying the
 * object (which renders as "[object Object]").
 */
function formatBudget(b) {
  if (!b || typeof b !== 'object') return null;
  const sym = b.currency === 'GBP' ? '£' : b.currency === 'EUR' ? '€' : '$';
  const parts = [];
  if (b.fixed) parts.push(`${sym}${b.fixed.toLocaleString()} fixed`);
  if (b.monthly) parts.push(`${sym}${b.monthly.toLocaleString()}/mo`);
  if (b.awsMonthly) parts.push(`AWS spend under ${sym}${b.awsMonthly.toLocaleString()}/mo`);
  return parts.length ? parts.join(' · ') : null;
}

// ════════════════════════════════════════════════════════════════════
// Step 2 — Blueprint
// ════════════════════════════════════════════════════════════════════
function BlueprintPanel({ solution }) {
  const { blueprints } = solution;

  return (
    <div className="space-y-3">
      {blueprints.best ? (
        <div className="rounded-xl border border-aws-orange/35 bg-aws-orange/5 p-3.5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                Best match · {blueprints.best.score}% fit
              </div>
              <h4 className="text-[14.5px] font-extrabold mt-0.5">{blueprints.best.project.title}</h4>
              <p className="text-[12px] opacity-80 mt-0.5">{blueprints.best.project.tagline}</p>
            </div>
            <Link
              to={`/portfolio/${blueprints.best.project.id}`}
              className="btn btn-ghost !text-[11px] tap-44 gap-1 shrink-0"
            >
              Full guide <ArrowRight size={11} />
            </Link>
          </div>
          <ul className="mt-2 space-y-0.5 text-[11.5px] opacity-85">
            {blueprints.best.why.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" /> {w}
              </li>
            ))}
          </ul>
          <div className="mt-2 pt-2 border-t border-aws-orange/20 flex flex-wrap gap-3 text-[11px] opacity-80">
            <span><strong>{blueprints.best.project.estLabel}</strong> typical build</span>
            <span className="capitalize"><strong>{blueprints.best.project.difficulty}</strong> level</span>
            {blueprints.best.project.freeTier && <span className="text-success font-bold">Free Tier friendly</span>}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3.5">
          <div className="flex items-center gap-1.5 font-extrabold text-[13px]">
            <Sparkles size={14} className="text-aws-orange" /> Custom architecture
          </div>
          <p className="text-[12px] opacity-80 mt-1 leading-relaxed">
            This gig doesn&apos;t map cleanly onto one of the 8 standard blueprints, so the plan and
            code below were built specifically from the services detected in the brief.
          </p>
        </div>
      )}

      {/* Alternatives */}
      {blueprints.ranked.length > 1 && (
        <details className="text-[11.5px]">
          <summary className="cursor-pointer font-bold opacity-70 hover:opacity-100">
            Other blueprints considered
          </summary>
          <div className="mt-2 space-y-1.5">
            {blueprints.ranked.slice(blueprints.best ? 1 : 0, 4).map((r) => (
              <Link
                key={r.project.id}
                to={`/portfolio/${r.project.id}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-token p-2 hover:border-aws-orange/40 transition"
              >
                <span className="truncate">{r.project.title}</span>
                <span className="opacity-55 shrink-0 font-mono text-[10.5px]">{r.score}%</span>
              </Link>
            ))}
          </div>
        </details>
      )}

      <Link to="/architecture" className="btn btn-ghost !text-[11.5px] tap-44 gap-1.5 w-full sm:w-auto">
        <Layers size={13} /> Open in Architecture Studio
      </Link>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 3 — Names
// ════════════════════════════════════════════════════════════════════
function NamesPanel({ solution }) {
  const toast = useToast();
  const rows = [
    { label: 'Project name', value: solution.names.projectName, hint: 'Use this on the proposal + invoice' },
    { label: 'CloudFormation stack', value: solution.names.stackName, hint: 'Valid stack name — used by the build button', mono: true },
    { label: 'S3 bucket prefix', value: solution.names.bucketPrefix, hint: 'Add a unique suffix at deploy time', mono: true },
    { label: 'Repo / folder', value: solution.names.repoName, hint: 'For your GitHub portfolio', mono: true },
  ];

  function copy(v) {
    navigator.clipboard?.writeText(v);
    toast?.success?.('Copied.');
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] opacity-75 leading-relaxed">
        Naming things is the annoying part. These are already valid for AWS (length, characters,
        prefixes) — just copy them.
      </p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 rounded-lg bg-[var(--card-2)]/50 border border-token p-2.5">
          <div className="min-w-0 flex-1">
            <div className="text-[9.5px] font-extrabold uppercase tracking-wider opacity-55">{r.label}</div>
            <div className={cn('text-[12.5px] font-bold truncate', r.mono && 'font-mono text-[12px]')}>{r.value}</div>
            <div className="text-[10px] opacity-55">{r.hint}</div>
          </div>
          <button onClick={() => copy(r.value)} className="btn btn-ghost !p-2 tap-44 shrink-0" aria-label={`Copy ${r.label}`}>
            <Copy size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 4 — Approach
// ════════════════════════════════════════════════════════════════════
function ApproachPanel({ solution }) {
  const rec = solution.approach.recommended;
  return (
    <div className="space-y-2.5">
      <p className="text-[12px] opacity-80 leading-relaxed">{solution.approach.rationale}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {solution.approach.allOptions.map((opt) => {
          const isRec = opt.id === rec;
          const scored = solution.approach.options?.find((o) => o.id === opt.id);
          return (
            <div
              key={opt.id}
              className={cn(
                'rounded-xl border p-3 transition',
                isRec ? 'border-aws-orange bg-aws-orange/10' : 'border-token bg-[var(--card-2)]/30'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-extrabold text-[13px] flex items-center gap-1.5">
                  {opt.label}
                  {isRec && (
                    <span className="px-1.5 py-0.5 rounded-full bg-aws-orange text-ink-950 text-[9px] font-black uppercase">
                      Best for this
                    </span>
                  )}
                </div>
                {scored?.score != null && (
                  <span className="text-[10px] font-mono opacity-50">{scored.score}</span>
                )}
              </div>
              <p className="text-[11.5px] opacity-80 mt-1 leading-relaxed">{opt.fullBlurb || opt.blurb}</p>
            </div>
          );
        })}
      </div>
      <div className="text-[11px] opacity-65 italic">
        The build button in step 7 uses CloudFormation because it&apos;s the only one that can run
        straight from this browser. Terraform + CLI are downloadable below.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 5 — Plan
// ════════════════════════════════════════════════════════════════════
function PlanPanel({ solution }) {
  const { plan } = solution;
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-3 text-[11.5px] opacity-80">
        <span><strong>{plan.phases.length}</strong> phases</span>
        <span><strong>{plan.totalTasks}</strong> tasks</span>
        <span><strong>~{plan.estimatedDays}</strong> days</span>
        {plan.timelineLabel && <span>Client wants: <strong>{plan.timelineLabel}</strong></span>}
      </div>
      <ol className="space-y-2">
        {plan.phases.map((ph, i) => (
          <li key={ph.id} className="rounded-xl border border-token bg-[var(--card-2)]/30 p-3">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-5 h-5 rounded-full bg-aws-orange/20 text-aws-orange text-[10px] font-black shrink-0">
                {i + 1}
              </span>
              <h4 className="font-extrabold text-[12.5px] flex-1">{ph.title}</h4>
              {ph.durationLabel && <span className="text-[10px] opacity-55 font-mono">{ph.durationLabel}</span>}
            </div>
            <ul className="mt-1.5 space-y-0.5 pl-7 text-[11.5px] opacity-85 leading-relaxed list-disc">
              {ph.tasks.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
          </li>
        ))}
      </ol>
      <Link to="/project-plan" className="btn btn-ghost !text-[11.5px] tap-44 gap-1.5">
        <ClipboardList size={13} /> Open full Project Plan tool
      </Link>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 6 — Review
// ════════════════════════════════════════════════════════════════════
function ReviewPanel({ solution }) {
  const { expert, deploy: deployReview } = solution.review;
  const [showAll, setShowAll] = useState(false);

  if (!expert) {
    return <p className="text-[12px] opacity-70">Review unavailable for this solution.</p>;
  }

  const findings = [...(expert.findings || []), ...(deployReview?.findings || [])];
  const shown = showAll ? findings : findings.filter((f) => ['critical', 'high', 'medium'].includes(f.severity)).slice(0, 8);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-[26px] font-black leading-none">
          {solution.review.grade}
          <span className="text-[13px] opacity-55 font-bold ml-1.5">{expert.score}/100</span>
        </div>
        <div className="flex-1 min-w-[180px]">
          {solution.review.gradeLabel && (
            <div className="text-[12px] font-extrabold">{solution.review.gradeLabel}</div>
          )}
          <div className="text-[11.5px] opacity-80">{expert.summary}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <SevPill n={expert.criticalCount} label="Critical" tone="danger" />
        <SevPill n={expert.highCount} label="High" tone="danger" />
        <SevPill n={expert.mediumCount} label="Medium" tone="warning" />
        <SevPill n={expert.lowCount} label="Low" tone="sky" />
        <SevPill n={expert.positiveCount} label="Good" tone="success" />
      </div>

      <p className="text-[11px] opacity-65 italic leading-relaxed">
        {expert.expertCount} specialist reviewers (security, cost, reliability, network, compute,
        storage, database, compliance, performance, patterns) — rule-based checks that catch the
        mistakes that lose you a client.
      </p>

      <div className="space-y-1.5">
        {shown.map((f, i) => <FindingRow key={f.ruleId || i} f={f} />)}
      </div>

      {findings.length > shown.length && (
        <button onClick={() => setShowAll(true)} className="text-[11.5px] font-bold text-aws-orange hover:underline">
          Show all {findings.length} findings
        </button>
      )}
    </div>
  );
}

function SevPill({ n, label, tone }) {
  if (!n) return null;
  const cls = {
    danger: 'bg-danger/15 text-danger border-danger/30',
    warning: 'bg-warning/15 text-warning border-warning/30',
    sky: 'bg-sky-400/15 text-sky-400 border-sky-400/30',
    success: 'bg-success/15 text-success border-success/30',
  }[tone];
  return (
    <span className={cn('px-2 py-0.5 rounded-full border text-[10.5px] font-extrabold', cls)}>
      {n} {label}
    </span>
  );
}

function FindingRow({ f }) {
  const [open, setOpen] = useState(false);
  const tone = {
    critical: 'border-l-danger', high: 'border-l-danger',
    medium: 'border-l-warning', low: 'border-l-sky-400', info: 'border-l-success',
  }[f.severity] || 'border-l-token';

  return (
    <div className={cn('rounded-lg border border-token border-l-4 bg-[var(--card-2)]/30', tone)}>
      <button onClick={() => setOpen((o) => !o)} className="w-full text-left p-2.5 flex items-start gap-2 tap-44">
        <span className="text-[9.5px] font-black uppercase opacity-60 shrink-0 mt-0.5 w-12">{f.severity}</span>
        <span className="flex-1 text-[12px] font-bold leading-snug">{f.title}</span>
        <ChevronDown size={12} className={cn('opacity-40 shrink-0 mt-0.5 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pl-[62px] space-y-1.5 text-[11.5px] opacity-85 leading-relaxed">
          {f.body && <p>{f.body}</p>}
          {f.fix && (
            <p className="text-success">
              <strong>Fix:</strong> {f.fix}
            </p>
          )}
          {f.expertName && <p className="opacity-55 text-[10.5px]">— {f.expertEmoji} {f.expertName}</p>}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 7 — Build
// ════════════════════════════════════════════════════════════════════
function BuildPanel({ solution, onDeploy }) {
  const toast = useToast();
  const blocked = solution.review.verdict === 'blocked';
  const needsFix = solution.review.verdict === 'fix-first';
  const cov = solution.deploy.coverage;
  const readiness = solution.review.readiness;
  const canDeploy = !!solution.deploy.canOneClick;

  function download(artifact) {
    if (!artifact?.code) return;
    const blob = new Blob([artifact.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success?.(`Downloaded ${artifact.filename}`);
  }

  return (
    <div className="space-y-3">
      {blocked ? (
        <div className="rounded-xl border border-danger/40 bg-danger/5 p-3.5 text-[12px] leading-relaxed">
          <div className="flex items-center gap-1.5 font-extrabold text-danger mb-1">
            <AlertTriangle size={14} /> Can&apos;t generate a deployable stack yet
          </div>
          No AWS services were confidently detected in this brief. Add detail about what needs to be
          built (a database? an API? file storage?) and run it again.
        </div>
      ) : (
        <>
          {needsFix && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-[11.5px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-extrabold text-warning mb-1">
                <AlertTriangle size={13} /> Review flagged {solution.review.blockers.length + solution.review.highs.length} serious issue(s)
              </div>
              You can still deploy this to <strong>your own</strong> account to learn from it — but read
              step 6 before you hand anything to a client.
            </div>
          )}

          <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 space-y-1 text-[11.5px]">
            <Row k="Stack name" v={solution.deploy.stackName} mono />
            <Row k="Region" v={solution.deploy.region} mono />
            <Row k="Resources" v={`${cov?.resourceCount ?? 0} AWS resources`} />
            <Row k="Mode" v={solution.mode === 'test' ? 'Test — Free Tier substitutions applied' : 'Client — exact specs'} />
            <Row k="Support status" v={(readiness?.classification || 'planning-only').replace(/-/g, ' ')} />
            <Row k="Client-ready" v={readiness?.clientReady ? 'Yes — pre-deploy gates passed' : 'No — review the open gates below'} />
          </div>

          {readiness && (
            <div className="rounded-xl border border-token bg-[var(--card-2)]/30 p-3 text-[11.5px]">
              <div className="font-extrabold mb-2">Evidence gates</div>
              <div className="space-y-1">
                {readiness.evidenceGates.map((gate) => (
                  <div key={gate.id} className="flex items-start gap-2">
                    <span className={gate.passed ? 'text-success' : 'text-warning'}>{gate.passed ? '✓' : '○'}</span>
                    <span>{gate.label}{gate.stage === 'post-deploy' ? ' (verified only after a real AWS deployment)' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Honest coverage — never let the button imply more than it builds */}
          {cov && cov.uncovered.length > 0 && (
            <div className="rounded-xl border border-warning/35 bg-warning/5 p-3 text-[11.5px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-extrabold text-warning mb-1">
                <Info size={13} /> This button builds {cov.pct}% of the design
              </div>
              <p className="opacity-90">
                <strong>{cov.covered.join(', ')}</strong> deploy from here.
                {' '}<strong>{cov.uncovered.join(', ')}</strong>{' '}
                {cov.uncovered.length === 1 ? 'has' : 'have'} no CloudFormation generator yet —
                use the Terraform download below for {cov.uncovered.length === 1 ? 'it' : 'those'}, or add
                {cov.uncovered.length === 1 ? ' it' : ' them'} in the console afterwards.
              </p>
            </div>
          )}
          {cov && cov.autoAdded.length > 0 && (
            <p className="text-[11px] opacity-70 leading-relaxed">
              Added automatically because the design needs them:{' '}
              <strong>{cov.autoAdded.join(', ')}</strong>.
            </p>
          )}

          <button
            onClick={onDeploy}
            disabled={!canDeploy}
            className="btn btn-primary w-full !text-[14px] !py-3.5 tap-44 gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Rocket size={16} /> {canDeploy ? 'Build verified coverage on AWS' : 'Deployment unavailable — resolve coverage/review gates'}
          </button>
          <p className="text-[10.5px] opacity-60 text-center leading-relaxed">
            Opens the deploy panel. You&apos;ll enter AWS keys there — they stay in memory, are never
            saved, and go only to AWS.
          </p>

          <div className="pt-2 border-t border-token">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-2">
              Or take the code and run it yourself
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { a: solution.artifacts.terraform, label: 'Terraform' },
                { a: solution.artifacts.cfn, label: 'CloudFormation' },
                { a: solution.artifacts.cli, label: 'AWS CLI' },
              ].map(({ a, label }) => a?.code && (
                <button
                  key={label}
                  onClick={() => download(a)}
                  className="btn btn-ghost !text-[11.5px] tap-44 gap-1.5 justify-center"
                >
                  <Download size={12} /> {label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ k, v, mono }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="opacity-60">{k}</span>
      <span className={cn('font-bold text-right', mono && 'font-mono text-[11px]')}>{v}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 8 — Teardown
// ════════════════════════════════════════════════════════════════════
function TeardownPanel({ solution, liveStacks, onTeardown }) {
  const mine = liveStacks.filter((s) => s.solutionId === solution.id);

  return (
    <div className="space-y-2.5">
      <p className="text-[12px] opacity-80 leading-relaxed">
        Everything this app deploys goes into a single CloudFormation stack. Deleting the stack
        removes <strong>every resource in it</strong> — that&apos;s the whole point: no surprise bills,
        no orphaned resources you forgot about.
      </p>

      {mine.length === 0 ? (
        <div className="rounded-lg border border-token bg-[var(--card-2)]/40 p-3 text-[11.5px] opacity-70">
          Nothing deployed from this solution yet. Once you build it in step 7, the teardown button
          appears here.
        </div>
      ) : (
        mine.map((s) => (
          <div key={s.stackName} className="rounded-xl border border-danger/30 bg-danger/5 p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="font-mono text-[12px] font-bold">{s.stackName}</div>
                <div className="text-[10.5px] opacity-65">
                  {s.region} · deployed {new Date(s.deployedAt).toLocaleString()}
                </div>
              </div>
              <button onClick={() => onTeardown(s)} className="btn !text-[12px] tap-44 gap-1.5 border border-danger/50 text-danger hover:bg-danger/10">
                <Trash2 size={13} /> Delete everything
              </button>
            </div>
          </div>
        ))
      )}

      <div className="text-[10.5px] opacity-60 leading-relaxed">
        Tip: always tear down test builds the same day. Set a billing alarm at $1 in{' '}
        <Link to="/aws-accounts" className="text-aws-orange font-bold hover:underline">AWS Account Manager</Link>{' '}
        so nothing can creep up on you.
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Live stacks banner
// ════════════════════════════════════════════════════════════════════
function LiveStacksBanner({ stacks, onTeardown }) {
  return (
    <section className="surface rounded-2xl border border-warning/40 bg-warning/5 p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Cloud size={15} className="text-warning" />
        <strong className="text-[13px] text-warning">
          {stacks.length} stack{stacks.length > 1 ? 's' : ''} live on AWS right now
        </strong>
      </div>
      <div className="space-y-1.5">
        {stacks.map((s) => (
          <div key={`${s.stackName}-${s.region}`} className="flex items-center justify-between gap-2 text-[11.5px]">
            <div className="min-w-0">
              <span className="font-mono font-bold">{s.stackName}</span>
              <span className="opacity-60"> · {s.region}</span>
            </div>
            <button
              onClick={() => onTeardown(s)}
              className="text-danger font-bold hover:underline shrink-0 tap-44"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ════════════════════════════════════════════════════════════════════
// Next actions
// ════════════════════════════════════════════════════════════════════
function NextActions({ solution }) {
  const brief = encodeURIComponent(solution.input.brief.slice(0, 900));
  const actions = [
    { to: `/freelance?tab=proposals&sub=smart&prefill=${brief}`, icon: FileText, label: 'Write the proposal', hint: 'Pre-filled from this solution' },
    { to: `/job-analyzer?prefill=${brief}`, icon: Target, label: 'Deep job analysis', hint: 'Rate, fit, red flags' },
    { to: '/rate-calculator', icon: DollarSign, label: 'Price it', hint: 'What to charge' },
    { to: '/portfolio', icon: Briefcase, label: 'Add to portfolio', hint: 'Turn it into a case study' },
  ];
  return (
    <section className="surface rounded-2xl p-4">
      <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-2.5">
        What next
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-2.5 rounded-xl border border-token p-3 hover:border-aws-orange/50 transition group tap-44"
          >
            <a.icon size={15} className="text-aws-orange shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-extrabold">{a.label}</div>
              <div className="text-[10.5px] opacity-60">{a.hint}</div>
            </div>
            <ArrowRight size={13} className="opacity-30 group-hover:opacity-100 group-hover:text-aws-orange transition shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
