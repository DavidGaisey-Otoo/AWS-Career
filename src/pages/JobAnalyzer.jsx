import { motion } from 'framer-motion';
import {
  AlertTriangle, BriefcaseBusiness, Building2, CheckCircle2, ChevronLeft,
  ChevronRight, Clock, ClipboardPaste, DollarSign, FileText, Flag,
  Gauge, HelpCircle, Layers, ListChecks, Loader2, Send, Sparkles, Target, Wand2,
  XCircle, Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORY_COLOR, getServiceDef } from '../data/archStudio.js';
import { SAMPLE_JOBS, analyzeJob } from '../data/jobAnalyzer.js';
import { cn } from '../lib/utils.js';
import { MasterIntelligencePanel } from '../components/intelligence/MasterIntelligencePanel.jsx';
import { ApproachRecommendationPanel } from '../components/build/ApproachRecommendationPanel.jsx';
import { ServiceSuggestionChips } from '../components/build/ServiceSuggestionChips.jsx';
import { AutoFillFromBrief } from '../components/build/AutoFillFromBrief.jsx';

export default function JobAnalyzer() {
  const toast = useToast();
  const { setLastAnalysis } = useEarn();
  const [params] = useSearchParams();
  const [text, setText] = useState(() => params.get('prefill') || '');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [activeSample, setActiveSample] = useState(null);

  // FR-01: react to deep-links from Gig Feed (?prefill=…)
  useEffect(() => {
    const p = params.get('prefill');
    if (p && p !== text) {
      setText(p);
      setResult(null);
      setActiveSample(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const run = () => {
    if (!text.trim()) {
      toast.error('Paste a job description first.');
      return;
    }
    setRunning(true);
    setTimeout(() => {
      try {
        const r = analyzeJob(text);
        setResult(r);
        // Persist for cross-page autofill (Discovery, Presentation, Email, Documents).
        setLastAnalysis({
          jdText: text,
          analysis: r,
          suggestedName: r.suggestedName,
          suggestedClient: r.suggestedClient,
        });
        toast.success('Job analyzed — fields auto-filled across Earn pages');
      } catch (err) {
        toast.error('Analyzer failed — try again.');
      }
      setRunning(false);
    }, 400);
  };

  const loadSample = (s) => {
    setText(s.text);
    setActiveSample(s.id);
    setResult(null);
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (!t) {
        toast.info('Clipboard is empty.');
        return;
      }
      setText(t);
      setActiveSample(null);
      toast.success('Pasted from clipboard');
    } catch {
      toast.error('Clipboard read blocked — paste manually with Ctrl+V.');
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Job Analyzer"
        title="Paste a job description. Decide in 30 seconds."
        subtitle="Heuristic engine extracts AWS services, budget, timeline, difficulty and match score — then recommends the deployment method and suggests the next workflow."
        icon={BriefcaseBusiness}
      />

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        {/* INPUT */}
        <div className="space-y-3">
          <div className="surface rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <FileText size={14} className="text-aws-orange" /> Job description
              </h3>
              <button onClick={pasteFromClipboard} className="btn btn-ghost !text-[11px]">
                <ClipboardPaste size={11} /> Paste
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setActiveSample(null); }}
              rows={12}
              placeholder={`Paste the job description here.

The analyzer looks for:
• AWS services mentioned
• Budget (hourly or fixed)
• Timeline (ASAP, hours, days, weeks, months)
• Skills required (junior → expert)
• Missing info you should ask before quoting`}
              className="w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-xs leading-relaxed focus-ring focus:border-aws-orange resize-y min-h-[260px]"
            />
            <div className="flex items-center justify-between text-[10px] text-muted">
              <span>{text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
              <span>Paste up to ~2,000 words.</span>
            </div>
            <button
              onClick={run}
              disabled={running || !text.trim()}
              className={cn(
                'btn btn-primary w-full',
                (running || !text.trim()) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {running ? (
                <><Loader2 size={14} className="animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles size={14} /> Analyze this job</>
              )}
            </button>
          </div>

          {/* SAMPLES */}
          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <ListChecks size={14} className="text-aws-orange" /> Pre-loaded real jobs
            </h3>
            <p className="text-[11px] text-muted">Tap a sample to load it into the analyzer.</p>
            <div className="space-y-1.5">
              {SAMPLE_JOBS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => loadSample(s)}
                  className={cn(
                    'w-full text-left rounded-lg border px-3 py-2.5 transition focus-ring',
                    activeSample === s.id
                      ? 'border-aws-orange/60 bg-aws-orange/10'
                      : 'border-token bg-[var(--card-2)]/30 hover:border-aws-orange/40'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-extrabold truncate">{s.label}</span>
                    <ChevronRight size={12} className="text-muted shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OUTPUT */}
        <div className="space-y-3">
          {!result ? (
            <EmptyState />
          ) : (
            <Analysis result={result} />
          )}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Empty state
// =================================================================

function EmptyState() {
  return (
    <div className="surface rounded-2xl p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
        <Wand2 size={22} strokeWidth={2.5} />
      </div>
      <h3 className="text-base font-extrabold">Drop a job description on the left.</h3>
      <p className="text-[12px] text-muted max-w-md mx-auto leading-relaxed">
        Your analysis will appear here. The engine looks at 40+ AWS service keywords, budget signals, timeline
        hints, and skill markers — then recommends a deployment method and the workflow buttons that get you to
        a signed contract fastest.
      </p>
      <div className="flex flex-wrap gap-2 justify-center pt-2">
        <Chip icon={Target} label="Match score" />
        <Chip icon={DollarSign} label="Budget" />
        <Chip icon={Clock} label="Timeline" />
        <Chip icon={Gauge} label="Difficulty" />
        <Chip icon={Layers} label="Services" />
        <Chip icon={HelpCircle} label="Missing info Qs" />
      </div>
    </div>
  );
}

function Chip({ icon: Icon, label }) {
  return (
    <span className="chip border border-token text-[10px] font-bold inline-flex items-center gap-1">
      <Icon size={10} /> {label}
    </span>
  );
}

// =================================================================
// Analysis panels
// =================================================================

function Analysis({ result }) {
  // PJ-04 Phase B + AD-03: derive params for the walkthrough generator
  const briefText = result.rawText || result.jdText || '';

  // AD-03: Auto-Fill state — name, services, region, timeline, tech stack, location
  const [autoFill, setAutoFill] = useState({
    brief: briefText,
    name: '',
    services: (result.services || []).map((s) =>
      typeof s === 'string' ? s : (s.id || s.label || '')
    ).filter(Boolean),
    region: null,
    timeline: null,
    techStack: [],
    clientLocation: null,
  });

  const pickedServices = autoFill.services || [];
  const inferredTitle = autoFill.name || (briefText.split(/\n/)[0] || 'Freelance job walkthrough').slice(0, 80);
  const generateHref = `/walkthroughs/deep/new?title=${encodeURIComponent(inferredTitle)}&brief=${encodeURIComponent((autoFill.brief || briefText).slice(0, 600))}&services=${pickedServices.join(',')}&source=freelance`;

  return (
    <div className="space-y-3">
      {/* AD-03: Auto-Fill from pasted job description (top — drives the rest) */}
      <section className="surface rounded-2xl p-4">
        <AutoFillFromBrief
          value={autoFill}
          onChange={setAutoFill}
          title="Auto-fill from this job description"
          compact
        />
      </section>

      {/* PJ-04 Phase B: jump straight to walkthrough generation pre-filled with this job */}
      <section className="surface rounded-2xl p-4 border-l-4 border-l-aws-orange flex flex-wrap items-center gap-3">
        <div className="text-3xl">🛠</div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
            Ready to build?
          </div>
          <h3 className="text-base font-extrabold">Generate a Deep Walkthrough for this job</h3>
          <p className="text-[11.5px] opacity-80 leading-snug mt-0.5">
            Auto-orders the services from this brief into a numbered Deep Walkthrough — saved under 💼 Freelance Jobs.
            <strong className="text-aws-orange"> {pickedServices.length} service{pickedServices.length === 1 ? '' : 's'}</strong> will carry through.
          </p>
        </div>
        <a
          href={generateHref}
          className="btn btn-primary inline-flex items-center gap-2 text-xs"
        >
          ✨ Generate walkthrough
        </a>
      </section>

      {/* NEW: Master Intelligence — runs the universal analyser on the raw input */}
      <MasterIntelligencePanel inputText={result.rawText || result.jdText} />

      {/* FR-04: Recommended approach */}
      <ApproachRecommendationPanel
        brief={result.rawText || result.jdText || text}
        services={(result.services || []).map((s) => (typeof s === 'string' ? s : s?.id))}
      />

      {/* Existing v1 analysis panels — kept for backwards compatibility */}
      <details className="rounded-2xl border border-token bg-[var(--card-2)]/30 overflow-hidden">
        <summary className="cursor-pointer px-4 py-2.5 text-xs font-bold opacity-70 hover:opacity-100">
          Show legacy v1 analysis (Summary / Services / Flags / Deployment / Workflows)
        </summary>
        <div className="p-3 space-y-3">
          <Summary result={result} />
          <ServicesPanel services={result.services} />
          <FlagsPanel flags={result.flags} />
          <DeploymentPanel deployment={result.deployment} />
          <MissingInfoPanel missing={result.missing} />
          <WorkflowsPanel workflows={result.workflows} />
        </div>
      </details>
    </div>
  );
}

function Summary({ result }) {
  const matchTone =
    result.match >= 80 ? 'success' :
    result.match >= 60 ? 'warning' : 'danger';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl p-4 space-y-3 gradient-border"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
            Project classification
          </div>
          <h3 className="text-xl font-black tracking-tight mt-0.5">{result.type}</h3>
        </div>
        <ScoreCircle score={result.match} tone={matchTone} label="match" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric icon={DollarSign} label="Budget"     value={result.budget.label} />
        <Metric icon={Clock}       label="Timeline"   value={result.timeline.label} />
        <Metric icon={Gauge}       label="Difficulty" value={result.difficulty.label} />
      </div>
    </motion.div>
  );
}

function ServicesPanel({ services }) {
  if (services.length === 0) {
    return (
      <div className="surface rounded-2xl p-4">
        <h3 className="text-sm font-extrabold flex items-center gap-2 mb-2">
          <Layers size={14} className="text-aws-orange" /> AWS services
        </h3>
        <p className="text-[12px] text-muted">No specific services detected. Ask the client which AWS services they expect to use.</p>
      </div>
    );
  }

  return (
    <div className="surface rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <Layers size={14} className="text-aws-orange" /> AWS services detected
        <span className="chip border border-token text-[10px]">{services.length}</span>
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {services.map((id) => {
          const def = getServiceDef(id);
          if (!def) return null;
          const color = CATEGORY_COLOR[def.category];
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1.5 rounded-md border border-token bg-[var(--card-2)]/40 pl-1.5 pr-2 py-1 text-[11px] font-bold"
              style={{ borderTopColor: color, borderTopWidth: 2 }}
            >
              <span className="text-sm leading-none">{def.icon}</span> {def.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function FlagsPanel({ flags }) {
  if (!flags || flags.length === 0) return null;
  return (
    <div className="surface rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <Flag size={14} className="text-aws-orange" /> Flags
      </h3>
      <ul className="space-y-1.5">
        {flags.map((f, i) => (
          <li
            key={i}
            className={cn(
              'flex items-start gap-2 rounded-lg border px-2.5 py-2',
              f.kind === 'red'   ? 'border-danger/40 bg-danger/10'
                : f.kind === 'amber' ? 'border-warning/40 bg-warning/10'
                : 'border-success/30 bg-success/10'
            )}
          >
            {f.kind === 'red' ? <XCircle size={14} className="text-danger shrink-0 mt-0.5" /> :
             f.kind === 'amber' ? <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" /> :
             <CheckCircle2 size={14} className="text-success shrink-0 mt-0.5" />}
            <span className="text-[12px] font-bold leading-snug">{f.msg}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeploymentPanel({ deployment }) {
  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold flex items-center gap-2">
          <Zap size={14} className="text-aws-orange" /> Recommended deployment
        </h3>
        <span className="chip border border-aws-orange/40 text-aws-orange font-extrabold text-[11px]">
          {deployment.tag}
        </span>
      </div>
      <p className="text-[12px] text-muted leading-snug">{deployment.reason}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-success/30 bg-success/10 p-2.5">
          <div className="text-[10px] font-extrabold uppercase text-success mb-1">Pros</div>
          <ul className="space-y-0.5 text-[11px]">
            {deployment.pros.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5">
          <div className="text-[10px] font-extrabold uppercase text-warning mb-1">Trade-offs</div>
          <ul className="space-y-0.5 text-[11px]">
            {deployment.cons.map((p, i) => <li key={i}>• {p}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MissingInfoPanel({ missing }) {
  if (!missing || missing.length === 0) {
    return (
      <div className="surface rounded-2xl p-4">
        <h3 className="text-sm font-extrabold flex items-center gap-2">
          <CheckCircle2 size={14} className="text-success" /> Spec is solid
        </h3>
        <p className="text-[11px] text-muted mt-1">No critical info missing — you can quote with confidence.</p>
      </div>
    );
  }
  return (
    <div className="surface rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <HelpCircle size={14} className="text-aws-orange" /> Ask the client before quoting
      </h3>
      <ol className="space-y-1.5 list-decimal list-inside text-[12px] leading-snug">
        {missing.map((m, i) => (
          <li key={m.id || i}>{m.question}</li>
        ))}
      </ol>
    </div>
  );
}

function WorkflowsPanel({ workflows }) {
  if (!workflows || workflows.length === 0) return null;
  return (
    <div className="surface rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <Send size={14} className="text-aws-orange" /> Next workflow
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        {workflows.map((w) => (
          <Link
            key={w.id}
            to={w.to}
            className={cn(
              'group rounded-xl border p-3 transition focus-ring',
              w.primary
                ? 'border-aws-orange/40 bg-aws-orange/10 hover:border-aws-orange/70'
                : 'border-token bg-[var(--card-2)]/30 hover:border-aws-orange/40'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-extrabold">{w.label}</span>
              <ChevronRight size={12} className="text-muted group-hover:text-aws-orange transition" />
            </div>
            <p className="text-[11px] text-muted leading-snug mt-1">{w.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// Tiny shared bits
// =================================================================

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2">
      <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-muted">
        <Icon size={9} /> {label}
      </div>
      <div className="text-[12px] font-extrabold mt-0.5 truncate">{value}</div>
    </div>
  );
}

function ScoreCircle({ score, tone, label }) {
  const color =
    tone === 'success' ? 'text-success'
    : tone === 'warning' ? 'text-warning' : 'text-danger';
  return (
    <div className="text-right">
      <div className={cn('text-4xl font-black tabular-nums', color)}>{score}%</div>
      <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}
