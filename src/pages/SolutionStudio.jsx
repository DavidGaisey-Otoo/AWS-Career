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
import { assessFreeTierCost, formatPriceRange } from '../lib/projectCostEstimator.js';
import { buildProfessionalBrief } from '../lib/professionalBriefBuilder.js';
import { getDeliveryStatus } from '../lib/deliveryStatus.js';
import { appendApprovedPlanningDecisions, recommendPlanningDecisions } from '../lib/planningRecommendations.js';
import { appendClientDiscoveryAnswers, buildClientDiscoveryForm, buildSimulatedLearningAnswers, discoveryFormAsText, isSimulatedLearningProject } from '../lib/clientDiscoveryForm.js';

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
    label: 'Resolve the open readiness gates first',
    border: 'border-l-danger', text: 'text-danger', bg: 'bg-danger/10',
    chip: 'bg-danger/20 text-danger', ok: false,
  },
  blocked: {
    label: 'Planning only — more verified detail is required',
    border: 'border-l-danger', text: 'text-danger', bg: 'bg-danger/10',
    chip: 'bg-danger/20 text-danger', ok: false,
  },
};

const EXAMPLES = [
  {
    label: 'Windows Server admin',
    text: 'I want to start with a Windows Server administration project.',
  },
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

  function expandBrief() {
    try {
      const expanded = buildProfessionalBrief(brief);
      setBrief(expanded);
      toast?.success?.('Professional brief created. Review or edit it, then build the solution.');
    } catch (error) {
      toast?.error?.(error.message || 'Describe the project first.');
    }
  }

  async function copyBrief() {
    if (!brief.trim()) return;
    try {
      await navigator.clipboard.writeText(brief);
      toast?.success?.('Professional brief copied to clipboard.');
    } catch {
      toast?.error?.('Clipboard access was blocked. Click inside the brief, then press Ctrl+A and Ctrl+C.');
    }
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

  function handleDeleteSaved(record) {
    if (record.liveStack) {
      toast?.error?.('This solution is tracking a live AWS stack. Tear it down and verify deletion in AWS before removing the saved record.');
      return;
    }
    const confirmed = window.confirm(`Delete the saved solution "${record.projectName || record.title || 'Untitled solution'}"?\n\nThis removes only the saved app record. It does not delete anything in AWS.`);
    if (!confirmed) return;
    if (!deleteSolution(record.id)) {
      toast?.error?.('Could not delete the saved solution. Browser storage may be unavailable.');
      return;
    }
    setSavedList(listSolutions());
    if (solution?.id === record.id) setSaved(false);
    toast?.success?.('Saved solution deleted. No AWS resources were changed.');
  }

  function approvePlanningDecisions(decisions) {
    try {
      const updatedBrief = appendApprovedPlanningDecisions(solution.input.brief, decisions);
      setBrief(updatedBrief);
      analyse(updatedBrief, gigMeta);
      toast?.success?.('Planning decisions approved. The solution was rebuilt with your region, budget, and timeline.');
    } catch (error) {
      toast?.error?.(error.message || 'Check the planning decisions and try again.');
    }
  }

  function applyClientDiscoveryAnswers(fields, answers) {
    try {
      const updatedBrief = appendClientDiscoveryAnswers(solution.input.brief, fields, answers);
      setBrief(updatedBrief);
      analyse(updatedBrief, gigMeta);
      toast?.success?.('Client answers added. The architecture, plan, cost, and readiness checks were rebuilt.');
    } catch (error) {
      toast?.error?.(error.message || 'Complete the required discovery fields first.');
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
                Type one short idea or paste a complete job post. Use Professional Brief to expand a short idea
                into questions, requirements, architecture, cost, security, evidence, rollback, and portfolio sections.
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
              onClick={copyBrief}
              disabled={!brief.trim()}
              className={cn(
                'btn btn-ghost !text-[13px] !py-3 tap-44 gap-2',
                !brief.trim() && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Copy size={15} /> Copy brief
            </button>
            <button
              onClick={expandBrief}
              disabled={!brief.trim() || analysing}
              className={cn(
                'btn btn-ghost !text-[13px] !py-3 tap-44 gap-2',
                (!brief.trim() || analysing) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Sparkles size={15} /> Expand professional brief
            </button>
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
                  onClick={() => setBrief(ex.text)}
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
                  <div key={s.id} className="flex items-stretch rounded-lg border border-token hover:border-aws-orange/50 transition group overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setBrief(s.brief); analyse(s.brief); }}
                      className="min-w-0 flex-1 text-left p-2.5"
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
                    <button
                      type="button"
                      onClick={() => handleDeleteSaved(s)}
                      aria-label={`Delete ${s.projectName || s.title || 'saved solution'}`}
                      title={s.liveStack ? 'Tear down the tracked live stack before deleting this record' : 'Delete saved solution'}
                      className={cn(
                        'w-11 shrink-0 border-l border-token grid place-items-center transition tap-44',
                        s.liveStack ? 'text-warning/60 cursor-not-allowed' : 'text-danger/70 hover:text-danger hover:bg-danger/10'
                      )}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
            <UnderstandingPanel solution={solution} onApprovePlanning={approvePlanningDecisions} onApplyDiscovery={applyClientDiscoveryAnswers} />
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
                {getDeliveryStatus(solution).clientReady ? 'Pre-deploy review passed' : 'Not ready'}
              </span>
            )}
            defaultOpen
          >
            <ReviewPanel solution={solution} />
          </Step>

          <Step n={7} title={solution.deploy.localOnly ? 'Build locally — AWS disabled' : 'Build it on AWS'} icon={Rocket} defaultOpen>
            <BuildPanel
              solution={solution}
              onDeploy={() => { if (!solution.deploy.localOnly) setDeployOpen(true); }}
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
      {solution && !solution.deploy.localOnly && (
        <DeployFromScriptModal
          open={deployOpen}
          onClose={() => setDeployOpen(false)}
          format="cfn"
          script={solution.deploy.template || ''}
          defaultStackName={solution.deploy.stackName}
          defaultRegion={solution.deploy.region}
          environmentProfile={solution.deploy.environmentMode === 'aws-employer' ? 'employer' : solution.deploy.environmentMode === 'aws-freelance' ? 'freelance' : 'learning'}
          monthlyEstimateMax={assessFreeTierCost(solution.services.map((service) => service.id), solution.deploy.region).afterFreeTier.max}
          monthlyCeilingUsd={Number(solution.input.brief.match(/Maximum monthly AWS budget[^$\n]*\$\s*(\d+(?:\.\d+)?)/i)?.[1] || (solution.deploy.environmentMode === 'aws-training' ? 20 : 50))}
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
          if (result?.ok) toast?.success?.('Stack deletion reported. Verify CloudFormation, Billing, backups, snapshots, and public IPs in AWS.');
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
  const cost = assessFreeTierCost(solution.services.map((service) => service.id), solution.region.primary);
  const costTone = cost.classification === 'not-free-safe' || cost.classification === 'unverified'
    ? 'border-warning/40 bg-warning/5 text-warning' : 'border-success/40 bg-success/5 text-success';

  return (
    <section className={cn('surface rounded-2xl p-5 border-l-4', v.border)}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
            {solution.blueprints.best ? 'Strong reusable blueprint match' : 'Custom architecture required'}
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
        <Stat label="Requested services" value={solution.services.length} />
        <Stat label="Region" value={solution.region.primary} mono />
        <Stat label="Est. effort" value={`${solution.plan.estimatedDays}d`} />
        <Stat
          label="Delivery readiness"
          value={solution.review.readiness?.clientReady ? (solution.review.grade || 'Ready') : 'Not ready'}
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
      <div className={cn('mt-3 rounded-lg border p-3 text-[11.5px]', costTone)}>
        <div className="font-extrabold flex items-center gap-1.5"><DollarSign size={13} /> {cost.label}</div>
        <div className="mt-1 opacity-90">After allowances or credits: {formatPriceRange(cost.afterFreeTier)}. This is an estimate, not a guaranteed bill.</div>
        {cost.noFreeTier.length > 0 && <div className="mt-1">No free offer detected: <strong>{cost.noFreeTier.map((item) => item.label).join(', ')}</strong>.</div>}
        {cost.timeLimited.length > 0 && <div className="mt-1">Time-limited eligibility: <strong>{cost.timeLimited.map((item) => item.label).join(', ')}</strong>.</div>}
        {cost.unknownServices.length > 0 && <div className="mt-1">Pricing coverage missing: <strong>{cost.unknownServices.join(', ')}</strong>. Treat cost as unverified.</div>}
        <div className="mt-1">Before deployment: confirm Billing eligibility, choose an approved budget threshold at or above the estimate, remember alerts do not cap spend, and verify teardown.</div>
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
function UnderstandingPanel({ solution, onApprovePlanning, onApplyDiscovery }) {
  const { analysis, region, understanding } = solution;
  const simulatedLearning = isSimulatedLearningProject(solution);
  const hasMissingQuestions = (analysis.missingQuestions?.length || 0) > 0;
  const hasApprovedPlanning = /Approved planning decisions:/i.test(solution.input.brief || '');
  const showPlanningDecisions = simulatedLearning
    ? !hasMissingQuestions && !hasApprovedPlanning
    : hasMissingQuestions;
  const recommendation = useMemo(() => recommendPlanningDecisions(solution), [solution]);
  const [planning, setPlanning] = useState(() => ({
    environmentMode: recommendation.environmentMode,
    labDurationHours: recommendation.labDurationHours,
    region: recommendation.region,
    monthlyBudget: recommendation.environmentMode === 'local-zero' ? 0 : (recommendation.monthlyBudget || ''),
    timelineWeeks: recommendation.timelineWeeks,
    dataClassification: recommendation.dataClassification,
    backupRetentionDays: recommendation.backupRetentionDays,
    rpoHours: recommendation.rpoHours,
    rtoHours: recommendation.rtoHours,
  }));
  useEffect(() => {
    setPlanning({
      environmentMode: recommendation.environmentMode,
      labDurationHours: recommendation.labDurationHours,
      region: recommendation.region,
      monthlyBudget: recommendation.environmentMode === 'local-zero' ? 0 : (recommendation.monthlyBudget || ''),
      timelineWeeks: recommendation.timelineWeeks,
      dataClassification: recommendation.dataClassification,
      backupRetentionDays: recommendation.backupRetentionDays,
      rpoHours: recommendation.rpoHours,
      rtoHours: recommendation.rtoHours,
    });
  }, [recommendation.environmentMode, recommendation.labDurationHours, recommendation.region, recommendation.monthlyBudget, recommendation.timelineWeeks,
    recommendation.dataClassification, recommendation.backupRetentionDays, recommendation.rpoHours, recommendation.rtoHours]);
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

      {analysis.missingQuestions?.length > 0 && (
        <ClientDiscoveryForm solution={solution} onApply={onApplyDiscovery} />
      )}

      {showPlanningDecisions && (
        <div className="rounded-xl border border-aws-orange/40 bg-aws-orange/5 p-3.5 space-y-3">
          <div>
            <div className="flex items-center gap-1.5 text-aws-orange font-extrabold text-[12px]">
              <Sparkles size={14} /> Recommended planning decisions
            </div>
            <p className="text-[11px] opacity-75 mt-1">
              The app prepared these values. Review or change them, then approve once. Suggestions are not client facts until you approve them.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="text-[10.5px] font-bold space-y-1 sm:col-span-3">
              <span className="opacity-70">Execution environment</span>
              <select
                value={planning.environmentMode}
                onChange={(e) => setPlanning((p) => ({
                  ...p,
                  environmentMode: e.target.value,
                  monthlyBudget: e.target.value === 'local-zero' ? 0 : (recommendation.monthlyBudget || 5),
                }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange"
              >
                <option value="aws-training">AWS Training Lab — short lease, cost guardrails, verified teardown</option>
                <option value="aws-freelance">AWS Freelance Delivery — client approval and evidence gates</option>
                <option value="aws-employer">AWS Employer Change — company policy and change control</option>
                <option value="local-zero">Strict $0 Local Lab — no AWS resources or AWS deployment</option>
              </select>
            </label>
            <label className="text-[10.5px] font-bold space-y-1">
              <span className="opacity-70">AWS Region</span>
              <input value={planning.region} onChange={(e) => setPlanning((p) => ({ ...p, region: e.target.value }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] font-mono outline-none focus:border-aws-orange" />
            </label>
            <label className="text-[10.5px] font-bold space-y-1">
              <span className="opacity-70">Monthly ceiling (USD)</span>
              <input type="number" min={planning.environmentMode === 'local-zero' ? 0 : 1} value={planning.monthlyBudget} disabled={planning.environmentMode === 'local-zero'} onChange={(e) => setPlanning((p) => ({ ...p, monthlyBudget: e.target.value }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
            </label>
            <label className="text-[10.5px] font-bold space-y-1">
              <span className="opacity-70">Timeline (weeks)</span>
              <input type="number" min="1" step="1" value={planning.timelineWeeks} onChange={(e) => setPlanning((p) => ({ ...p, timelineWeeks: e.target.value }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
            </label>
          </div>
          {['aws-short-lived', 'aws-training', 'aws-freelance'].includes(planning.environmentMode) ? (
            <label className="block text-[10.5px] font-bold space-y-1 max-w-xs">
              <span className="opacity-70">Target teardown within (hours)</span>
              <input type="number" min="1" max="24" step="1" value={planning.labDurationHours} onChange={(e) => setPlanning((p) => ({ ...p, labDurationHours: e.target.value }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
            </label>
          ) : (
            <div className="rounded-lg border border-success/40 bg-success/5 p-2.5 text-[11px] text-success leading-relaxed">
              AWS spend is mechanically held at $0 because the app will disable AWS deployment. Use a local VM; your computer, internet, electricity, and Microsoft evaluation-license terms remain outside AWS billing.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <label className="text-[10.5px] font-bold space-y-1 sm:col-span-2">
              <span className="opacity-70">Data classification</span>
              <input value={planning.dataClassification} onChange={(e) => setPlanning((p) => ({ ...p, dataClassification: e.target.value }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
            </label>
            <label className="text-[10.5px] font-bold space-y-1">
              <span className="opacity-70">Backup retention (days)</span>
              <input type="number" min="1" step="1" value={planning.backupRetentionDays} onChange={(e) => setPlanning((p) => ({ ...p, backupRetentionDays: e.target.value }))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10.5px] font-bold space-y-1">
                <span className="opacity-70">RPO hours</span>
                <input type="number" min="1" value={planning.rpoHours} onChange={(e) => setPlanning((p) => ({ ...p, rpoHours: e.target.value }))}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
              </label>
              <label className="text-[10.5px] font-bold space-y-1">
                <span className="opacity-70">RTO hours</span>
                <input type="number" min="1" value={planning.rtoHours} onChange={(e) => setPlanning((p) => ({ ...p, rtoHours: e.target.value }))}
                  className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-aws-orange" />
              </label>
            </div>
          </div>
          <div className="space-y-1 text-[10.5px] opacity-75 leading-relaxed">
            <p><strong>Environment:</strong> {recommendation.environmentReason}</p>
            <p><strong>Region:</strong> {recommendation.regionReason}</p>
            <p><strong>Budget:</strong> {recommendation.budgetReason}</p>
            <p><strong>Timeline:</strong> {recommendation.timelineReason}</p>
          </div>
          <button onClick={() => onApprovePlanning(planning)} className="btn btn-primary !text-[12px] tap-44 gap-1.5">
            <CheckCircle2 size={14} /> Approve environment and planning decisions
          </button>
          <p className="text-[10px] opacity-60">This approves planning facts only. AWS deployment still requires a separate explicit approval.</p>
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

function ClientDiscoveryForm({ solution, onApply }) {
  const toast = useToast();
  const fields = useMemo(() => buildClientDiscoveryForm(solution), [solution]);
  const simulatedLearning = isSimulatedLearningProject(solution);
  const [answers, setAnswers] = useState(() => (
    simulatedLearning ? (buildSimulatedLearningAnswers(solution, fields) || {}) : {}
  ));
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setAnswers(simulatedLearning ? (buildSimulatedLearningAnswers(solution, fields) || {}) : {});
  }, [solution.id, simulatedLearning, fields]);

  const completed = fields.filter((field) => String(answers[field.id] || '').trim()).length;

  async function copyForm(includeAnswers = false) {
    const text = discoveryFormAsText(solution.input.title, fields, includeAnswers ? answers : {});
    try {
      await navigator.clipboard.writeText(text);
      toast?.success?.(includeAnswers ? 'Completed client form copied.' : 'Blank client form copied. Send it to the client or project owner.');
    } catch {
      toast?.error?.('Clipboard access was blocked.');
    }
  }

  return (
    <div className="rounded-xl border border-electric/40 bg-electric/5 overflow-hidden">
      <button type="button" onClick={() => setOpen((value) => !value)} className="w-full flex items-center gap-2 p-3.5 text-left tap-44">
        <ClipboardList size={15} className="text-electric" />
        <span className="font-extrabold text-[12px] flex-1">Client discovery form — {completed}/{fields.length} answered</span>
        <ChevronDown size={14} className={cn('transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 space-y-3">
          <p className="text-[11px] opacity-75 leading-relaxed">
            The app generated this form from facts missing in this exact project. Copy the blank form for the client, or complete it during a discovery call. Never enter passwords, access keys, health records, card data, or other secrets.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copyForm(false)} className="btn btn-ghost !text-[11px] tap-44 gap-1.5"><Copy size={12} /> Copy blank client form</button>
            {completed > 0 && <button type="button" onClick={() => copyForm(true)} className="btn btn-ghost !text-[11px] tap-44 gap-1.5"><Copy size={12} /> Copy answers</button>}
            {simulatedLearning && (
              <button type="button" onClick={() => {
                const defaults = buildSimulatedLearningAnswers(solution, fields);
                setAnswers(defaults || {});
                toast?.success?.('Safe simulated-lab defaults restored. Review them, then apply and rebuild.');
              }} className="btn btn-secondary !text-[11px] tap-44 gap-1.5">
                <Sparkles size={12} /> Restore safe simulated-lab defaults
              </button>
            )}
          </div>
          {simulatedLearning && (
            <p className="rounded-lg border border-aws-orange/30 bg-aws-orange/5 p-2.5 text-[10.5px] leading-relaxed">
              These editable answers were prefilled because the brief explicitly identifies a simulated portfolio lab. Review or change them before applying. They record project-owner planning decisions only. If this becomes real client work, start a new solution and obtain the client’s actual answers.
            </p>
          )}
          <div className="space-y-3">
            {fields.map((field, index) => (
              <label key={field.id} className="block rounded-lg border border-token bg-[var(--card-2)]/40 p-3 space-y-1.5">
                <span className="block text-[9.5px] uppercase tracking-wider font-extrabold text-electric">{field.category}</span>
                <span className="block text-[11.5px] font-bold">{index + 1}. {field.question} <span className="text-danger">*</span></span>
                {field.type === 'select' ? (
                  <select value={answers[field.id] || ''} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))}
                    className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-electric">
                    {field.options.map((option) => <option key={option || 'blank'} value={option}>{option || 'Select a client-approved answer'}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea rows={2} value={answers[field.id] || ''} placeholder={field.placeholder} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))}
                    className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-electric resize-y" />
                ) : (
                  <input value={answers[field.id] || ''} placeholder={field.placeholder} onChange={(event) => setAnswers((current) => ({ ...current, [field.id]: event.target.value }))}
                    className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12px] outline-none focus:border-electric" />
                )}
              </label>
            ))}
          </div>
          <button type="button" onClick={() => onApply(fields, answers)} disabled={completed !== fields.length}
            className="btn btn-primary !text-[12px] tap-44 gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed">
            <CheckCircle2 size={14} /> {simulatedLearning ? 'Approve safe lab answers and continue' : 'Apply confirmed client answers and rebuild'}
          </button>
          <p className="text-[10px] opacity-60">Answers update the brief and regenerate the design. They do not authorize deployment or prove that anything was built.</p>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <PlanChecklist title="Validation and evidence" items={plan.evidenceChecklist} />
        <PlanChecklist title="Operations and handover" items={plan.handoverChecklist} />
      </div>
      <Link to="/project-plan" className="btn btn-ghost !text-[11.5px] tap-44 gap-1.5">
        <ClipboardList size={13} /> Open full Project Plan tool
      </Link>
    </div>
  );
}

function PlanChecklist({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/30 p-3">
      <h4 className="font-extrabold text-[12px] mb-1.5">{title}</h4>
      <ul className="space-y-1 text-[11px] opacity-85 leading-relaxed">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5"><span className="text-aws-orange">□</span><span>{item}</span></li>
        ))}
      </ul>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Step 6 — Review
// ════════════════════════════════════════════════════════════════════
function ReviewPanel({ solution }) {
  const { expert, deploy: deployReview } = solution.review;
  const deliveryStatus = getDeliveryStatus(solution);
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
          {deliveryStatus.grade || '—'}
          <span className="text-[13px] opacity-55 font-bold ml-1.5">{Number.isFinite(deliveryStatus.score) ? `${deliveryStatus.score}/100` : 'not scored'}</span>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className={cn('text-[12px] font-extrabold', deliveryStatus.clientReady ? 'text-success' : 'text-warning')}>
            {deliveryStatus.reviewStatus}
          </div>
          <div className="text-[11.5px] opacity-80">{deliveryStatus.reviewSummary}</div>
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
  const localOnly = solution.deploy.localOnly || solution.deploy.environmentMode === 'local-zero';
  const deliveryStatus = getDeliveryStatus(solution);

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
          {localOnly && (
            <div className="rounded-xl border border-success/40 bg-success/5 p-3.5 text-[11.5px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-extrabold text-success mb-1">
                <CheckCircle2 size={14} /> Strict $0 Local Lab selected — AWS writes are disabled
              </div>
              Build the Windows Server lab in Hyper-V, VirtualBox, or another local hypervisor. Create an isolated/NAT VM, apply the generated configuration manually, capture access and restore-test evidence, then delete the VM and its virtual disks when finished. No AWS credentials are requested and no AWS resource can be created from this screen.
            </div>
          )}
          {!localOnly && (needsFix || !canDeploy) && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-[11.5px] leading-relaxed">
              <div className="flex items-center gap-1.5 font-extrabold text-warning mb-1">
                <AlertTriangle size={13} /> {deliveryStatus.deployTitle}
              </div>
              {deliveryStatus.deploySummary}
            </div>
          )}

          <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 space-y-1 text-[11.5px]">
            <Row k="Stack name" v={solution.deploy.stackName} mono />
            <Row k="Region" v={solution.deploy.region} mono />
            <Row k="Environment" v={localOnly ? 'Strict $0 Local Lab — no AWS resources' : 'Short-lived AWS Lab — charges may occur'} />
            <Row k="Resources" v={`${cov?.resourceCount ?? 0} AWS resources`} />
            <Row k="Mode" v={solution.mode === 'test' ? 'Test — Free Tier substitutions applied' : 'Client — exact specs'} />
            <Row k="Support status" v={(readiness?.classification || 'planning-only').replace(/-/g, ' ')} />
            <Row k="Pre-deploy review" v={readiness?.clientReady ? 'Passed — AWS validation evidence still required' : 'Blocked — review the open gates below'} />
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
            <Rocket size={16} /> {localOnly ? 'AWS deployment disabled — Strict $0 Local Lab' : canDeploy ? 'Build verified coverage on AWS' : 'Deployment unavailable — resolve coverage/review gates'}
          </button>
          <p className="text-[10.5px] opacity-60 text-center leading-relaxed">
            {localOnly
              ? 'Local mode creates no AWS resources. Downloaded AWS templates remain reference artifacts and are not executed by the app.'
              : <>Opens the deploy panel. You&apos;ll enter AWS keys there — they stay in memory, are never saved, and go only to AWS. Teardown reduces cost but cannot guarantee a $0 bill.</>}
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
  const sourceBrief = solution.input.brief.slice(0, 2000);
  const brief = encodeURIComponent(sourceBrief);
  const title = encodeURIComponent(solution.names.projectName);
  const budget = encodeURIComponent(solution.input.budget || '');
  const actions = [
    { n: 1, to: `/job-analyzer?prefill=${brief}`, icon: Target, label: 'Confirm scope and fit', hint: 'Review requirements, risks, missing facts, and rate before promising anything' },
    { n: 2, to: `/freelance?tab=proposals&sub=smart&prefill=${brief}`, icon: FileText, label: 'Draft the proposal', hint: 'Uses this exact client brief; review it before submitting manually' },
    { n: 3, to: `/discovery-call?prefill=${brief}&title=${title}&budget=${budget}`, icon: Briefcase, label: 'Prepare discovery questions', hint: 'Confirm assumptions directly with the client before final scope' },
    { n: 4, to: `/project-plan?prefill=${brief}&title=${title}&budget=${budget}`, icon: ClipboardList, label: 'Create the project plan', hint: 'Milestones, dependencies, estimates, validation, and handover' },
    { n: 5, to: `/documents?tab=contracts&prefill=${brief}&title=${title}&budget=${budget}`, icon: FileText, label: 'Draft the contract', hint: 'Same scope and price; legal review and client signature still required' },
    { n: 6, to: '/architecture', icon: Layers, label: 'Refine the architecture', hint: 'Build or export the client diagram after requirements are confirmed' },
    { n: 7, to: '/deploy', icon: Rocket, label: 'Validate in AWS', hint: 'Deploy only evidence-ready artifacts, then test and tear down' },
    { n: 8, to: '/portfolio', icon: Briefcase, label: 'Package evidence', hint: 'Add screenshots, repository, results, and client-approved case study' },
  ];
  return (
    <section className="surface rounded-2xl p-4">
      <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-2.5">
        Guided gig delivery — keep this order
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="flex items-center gap-2.5 rounded-xl border border-token p-3 hover:border-aws-orange/50 transition group tap-44"
          >
            <a.icon size={15} className="text-aws-orange shrink-0" />
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aws-orange/15 text-[10px] font-black text-aws-orange">{a.n}</span>
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
