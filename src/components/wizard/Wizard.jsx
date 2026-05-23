/**
 * Wizard.jsx — generic step-by-step form runner.
 *
 * Any flow that has more than 2 fields should be wrapped in this. The
 * user sees ONE step at a time, with a big Next button, a back arrow,
 * and a progress bar — exactly like the AWS walkthrough format the
 * user said feels right.
 *
 * Public API:
 *   <Wizard
 *     steps={[
 *       { id, title, description, render: ({ values, set, suggest, advance }) => <JSX/>, validate?: (values) => string|null, optional?: bool }
 *     ]}
 *     initialValues={{...}}
 *     onComplete={(values) => ...}
 *     storageKey="awscl-pro::v1::wizard::project-builder"  // for resume support
 *     allowExpandAll  // if true, shows an "Expand all" toggle
 *     recordAs="project-builder"  // ties into the in-app recorder
 *   />
 *
 * Behaviour:
 *   • One step visible at a time by default.
 *   • Sticky progress bar + "Step N of M" + step titles in a strip above.
 *   • Next button advances; Prev button goes back. Both keyboard-accessible.
 *   • Validation runs on Next click — invalid step blocks advance + shows error.
 *   • "Expand all" toggle reveals every step at once (for power users).
 *   • Field-level updates auto-save to localStorage so the wizard resumes
 *     where the user left off.
 *   • Every advance / completion is recorded to RecorderContext.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, CheckCircle2, Circle, AlertCircle,
  Maximize2, Minimize2, Sparkles, ArrowRight, ArrowLeft, FileCheck,
} from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { useRecorder } from '../../context/RecorderContext.jsx';

export function Wizard({
  steps,
  initialValues = {},
  onComplete,
  onCancel,
  storageKey,
  allowExpandAll = true,
  recordAs = null,
  completeLabel = 'Finish',
  showSummary = true,
}) {
  // ---- state ----
  const [persisted, setPersisted] = useLocalStorage(
    storageKey || `__wizard::${recordAs || 'unnamed'}::scratch`,
    { values: initialValues, currentStep: 0, completedSteps: [], startedAt: null }
  );

  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(null);
  const recorder = useRecorder();
  const recordedStart = useRef(false);

  const currentStep = Math.min(persisted.currentStep || 0, steps.length - 1);
  const completed = new Set(persisted.completedSteps || []);
  const values = persisted.values || initialValues;

  // Record start
  useEffect(() => {
    if (recordAs && !recordedStart.current && !persisted.startedAt) {
      recorder.startSession(recordAs);
      recordedStart.current = true;
      setPersisted((p) => ({ ...p, startedAt: new Date().toISOString() }));
    } else if (recordAs && !recordedStart.current && persisted.startedAt) {
      recorder.resumeSession(recordAs);
      recordedStart.current = true;
    }
  }, [recordAs]);

  // ---- helpers passed to step render() ----
  function set(patch) {
    setPersisted((p) => ({ ...p, values: { ...p.values, ...patch } }));
    if (recordAs) {
      for (const [k, v] of Object.entries(patch)) {
        recorder.recordEvent({ type: 'field', key: k, valueSnippet: String(v).slice(0, 80) });
      }
    }
  }

  function advance() {
    next();
  }

  function next() {
    setError(null);
    const step = steps[currentStep];
    if (step.validate) {
      const err = step.validate(values);
      if (err) {
        setError(err);
        return;
      }
    }
    const isLast = currentStep === steps.length - 1;
    const newCompleted = new Set([...completed, currentStep]);
    setPersisted((p) => ({
      ...p,
      completedSteps: [...newCompleted].sort((a, b) => a - b),
      currentStep: isLast ? currentStep : currentStep + 1,
    }));
    if (recordAs) {
      recorder.recordEvent({ type: 'step-complete', step: step.id, title: step.title });
    }
    if (isLast) {
      finish();
    }
  }

  function prev() {
    setError(null);
    if (currentStep > 0) {
      setPersisted((p) => ({ ...p, currentStep: currentStep - 1 }));
    }
  }

  function jumpTo(idx) {
    setError(null);
    setPersisted((p) => ({ ...p, currentStep: idx }));
  }

  function finish() {
    if (recordAs) {
      recorder.recordEvent({ type: 'wizard-complete', flow: recordAs, valuesSummary: summariseValues(values) });
      recorder.endSession(recordAs, values);
    }
    onComplete?.(values);
  }

  function resetWizard() {
    setPersisted({ values: initialValues, currentStep: 0, completedSteps: [], startedAt: null });
    setError(null);
  }

  const step = steps[currentStep];
  const pct = Math.round(((completed.size) / steps.length) * 100);

  // ---- render ----
  return (
    <div className="space-y-5">
      {/* Top strip — step titles + progress */}
      <StepStrip
        steps={steps}
        currentStep={currentStep}
        completed={completed}
        onJump={jumpTo}
        pct={pct}
      />

      {/* Action bar — Expand / Reset / Cancel */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="opacity-70">
          Step <strong>{currentStep + 1}</strong> of <strong>{steps.length}</strong>
          {persisted.startedAt && (
            <span className="ml-2 opacity-50">· Resumed from {new Date(persisted.startedAt).toLocaleString()}</span>
          )}
        </div>
        <div className="flex gap-1">
          {allowExpandAll && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="px-2 py-1 rounded-lg hover:bg-[var(--card-2)] flex items-center gap-1"
            >
              {expanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
              {expanded ? 'One step' : 'Expand all'}
            </button>
          )}
          <button
            onClick={resetWizard}
            className="px-2 py-1 rounded-lg hover:bg-[var(--card-2)] opacity-60"
            title="Reset the wizard from scratch"
          >
            Reset
          </button>
          {onCancel && (
            <button onClick={onCancel} className="px-2 py-1 rounded-lg hover:bg-[var(--card-2)] opacity-60">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      {expanded ? (
        <div className="space-y-3">
          {steps.map((s, idx) => (
            <ExpandedStep
              key={s.id}
              step={s} idx={idx}
              isCurrent={idx === currentStep}
              isDone={completed.has(idx)}
              values={values}
              set={set}
              advance={advance}
              recorder={recorder}
              recordAs={recordAs}
            />
          ))}
          <div className="flex justify-end">
            <Button variant="primary" onClick={finish} icon={CheckCircle2}>{completeLabel}</Button>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <StepCard
              step={step}
              idx={currentStep}
              total={steps.length}
              values={values}
              set={set}
              advance={advance}
              recorder={recorder}
              recordAs={recordAs}
              error={error}
            />

            {/* Navigation */}
            <div className="mt-5 flex justify-between gap-3">
              <Button variant="ghost" onClick={prev} disabled={currentStep === 0} icon={ArrowLeft}>
                Previous
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button variant="primary" onClick={next} iconRight={ArrowRight}>
                  Next: {steps[currentStep + 1].title}
                </Button>
              ) : (
                <Button variant="primary" onClick={next} icon={CheckCircle2}>
                  {completeLabel}
                </Button>
              )}
            </div>

            {showSummary && currentStep === steps.length - 1 && (
              <SummaryPanel steps={steps} values={values} completed={completed} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

// ---------------- step strip ----------------

function StepStrip({ steps, currentStep, completed, onJump, pct }) {
  return (
    <div>
      <div className="h-2 rounded-full bg-[var(--card-2)] overflow-hidden mb-3">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-400 to-[var(--brand)]"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex items-center gap-1 overflow-x-auto">
        {steps.map((s, i) => {
          const done = completed.has(i);
          const active = i === currentStep;
          return (
            <button
              key={s.id}
              onClick={() => onJump(i)}
              disabled={!done && !active && i > Math.max(...completed, -1) + 1}
              className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                active
                  ? 'bg-[var(--brand)] text-black'
                  : done
                    ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-[var(--card-2)] opacity-50 hover:opacity-100 disabled:cursor-not-allowed'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                active ? 'bg-black/20' : done ? 'bg-emerald-500/30' : 'bg-[var(--card)]'
              }`}>
                {done ? <Check size={9} /> : i + 1}
              </span>
              <span className="truncate max-w-[140px]">{s.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------- single step card ----------------

function StepCard({ step, idx, total, values, set, advance, recorder, recordAs, error }) {
  const suggest = useMemo(() => makeSuggest({ values, recorder, recordAs }), [values, recorder, recordAs]);
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/5 via-transparent to-transparent p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="shrink-0 w-12 h-12 rounded-full bg-[var(--brand)] text-black flex items-center justify-center font-bold text-lg">
          {idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold opacity-60">
            Step {idx + 1} of {total}{step.optional ? ' · Optional' : ''}
          </div>
          <h2 className="text-2xl font-bold tracking-tight mt-0.5">{step.title}</h2>
          {step.description && <p className="text-sm opacity-80 mt-1.5 leading-relaxed">{step.description}</p>}
        </div>
      </div>

      <div className="pt-2">
        {step.render({ values, set, suggest, advance })}
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-200 flex items-start gap-2"
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}
    </div>
  );
}

// ---------------- expanded mode ----------------

function ExpandedStep({ step, idx, isCurrent, isDone, values, set, advance, recorder, recordAs }) {
  const suggest = useMemo(() => makeSuggest({ values, recorder, recordAs }), [values, recorder, recordAs]);
  return (
    <div className={`rounded-2xl border p-5 ${isCurrent ? 'border-[var(--brand)]/40' : 'border-token'} ${isDone ? 'bg-emerald-500/5' : 'bg-[var(--card)]'}`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
          isDone ? 'bg-emerald-500 text-black' : 'bg-[var(--card-2)]'
        }`}>
          {isDone ? <Check size={14} /> : idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold">{step.title}</h3>
          {step.description && <p className="text-xs opacity-70 mt-0.5">{step.description}</p>}
        </div>
      </div>
      <div className="pl-12">
        {step.render({ values, set, suggest, advance })}
      </div>
    </div>
  );
}

// ---------------- summary panel ----------------

function SummaryPanel({ steps, values, completed }) {
  return (
    <div className="mt-5 rounded-2xl border border-token bg-[var(--card)] p-5">
      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
        <FileCheck size={14} /> Final summary — what you're about to save
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {steps.map((s, i) => {
          const done = completed.has(i);
          // Each step may have its own summariser, fallback to JSON
          const summary = s.summarise
            ? s.summarise(values)
            : '—';
          return (
            <div key={s.id} className="flex items-start gap-2">
              <span className="shrink-0 mt-1">
                {done ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Circle size={12} className="opacity-30" />}
              </span>
              <div className="flex-1 min-w-0">
                <dt className="text-[10px] uppercase tracking-widest font-bold opacity-60">{s.title}</dt>
                <dd className="text-xs">{summary}</dd>
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

// ---------------- helpers ----------------

function makeSuggest({ values, recorder, recordAs }) {
  // Lazy import so the bundle stays small if the wizard isn't used.
  return async function suggest(kind, hint) {
    const { suggestName } = await import('../../lib/nameSuggester.js');
    const result = suggestName(kind, hint, values);
    if (recordAs) {
      recorder.recordEvent({ type: 'suggest', kind, suggestion: result });
    }
    return result;
  };
}

function summariseValues(values) {
  const keys = Object.keys(values || {}).slice(0, 8);
  const out = {};
  for (const k of keys) {
    const v = values[k];
    out[k] = typeof v === 'string' ? v.slice(0, 60) : v;
  }
  return out;
}
