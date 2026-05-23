import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertOctagon, BookOpen, ClipboardCopy, Cloud, Code2, ExternalLink, FileCode,
  Hammer, MonitorSmartphone, Terminal, Wand2, ArrowLeft, ArrowRight, Check,
  Maximize2, Minimize2, CheckCircle2, Circle, ShieldCheck, RefreshCw, Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useAWS } from '../../context/AWSContext.jsx';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { cn } from '../../lib/utils.js';
import { runVerify, VERIFIERS } from '../../lib/stepVerifier.js';
import { LinkText } from '../../lib/linkify.jsx';

/**
 * Smart Method Detector.
 *
 * Drops into any project step or lab. Detects the right method given a
 * `signal` object and renders four tabs (Console / CLI / Terraform / CFN)
 * each prefilled by the caller.
 *
 * Signal shape (all booleans optional):
 *   {
 *     oneTime:     bool,   // configure once, never again
 *     quickFix:    bool,   // urgent operational fix
 *     repeatable:  bool,   // infrastructure that may be rebuilt
 *     awsNative:   bool,   // enterprise client prefers CloudFormation
 *     hasTerraform:bool,   // client already uses Terraform
 *     urgent:      bool,   // needs ship today
 *     services:    [string]
 *   }
 *
 * Content shape:
 *   {
 *     console: {
 *       steps: [{ title, detail, expected, screenshot, gotcha }],
 *       consoleUrl,
 *     },
 *     cli: { command, expected, verifyCommand, gotchas },
 *     terraform: { code, commands, expected, errors },
 *     cloudformation: { template, deployCommand, verifyCommand, errors },
 *   }
 */
export function SmartMethodDetector({ title, signal = {}, content = {}, defaultTab, progressKey }) {
  const recommended = useMemo(() => detect(signal), [signal]);
  const initial = defaultTab || recommended.id;
  const [tab, setTab] = useState(initial);

  const TABS = [
    { id: 'console',        label: 'Console',      icon: MonitorSmartphone },
    { id: 'cli',            label: 'CLI',          icon: Terminal },
    { id: 'terraform',      label: 'Terraform',    icon: Code2 },
    { id: 'cloudformation', label: 'CloudFormation', icon: FileCode },
  ];

  return (
    <div className="space-y-3">
      <RecommendationCard rec={recommended} title={title} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isRec = t.id === recommended.id;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring relative',
                      active ? 'bg-gradient-aws text-ink-950 shadow-glow-orange' : 'text-muted hover:text-current'
                    )}>
              <Icon size={14} /> {t.label}
              {isRec && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-aws-orange shadow-glow-orange" title="Recommended" />
              )}
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {tab === 'console'        && <ConsoleTab        c={content.console} progressKey={progressKey} />}
        {tab === 'cli'            && <CliTab            c={content.cli} />}
        {tab === 'terraform'      && <TerraformTab      c={content.terraform} />}
        {tab === 'cloudformation' && <CloudFormationTab c={content.cloudformation} />}
      </motion.div>
    </div>
  );
}

// ============================ recommendation ============================

const METHOD_META = {
  console:        { icon: '📱', label: 'Console',        why: 'One-time configurations.' },
  cli:            { icon: '💻', label: 'CLI',            why: 'Quick operational tasks.' },
  terraform:      { icon: '🔧', label: 'Terraform',      why: 'Repeatable infrastructure that the client may need rebuilt.' },
  cloudformation: { icon: '📋', label: 'CloudFormation', why: 'AWS-native enterprise client preference.' },
};

function detect(signal) {
  if (signal.hasTerraform || signal.repeatable) return { id: 'terraform', ...METHOD_META.terraform };
  if (signal.awsNative)                          return { id: 'cloudformation', ...METHOD_META.cloudformation };
  if (signal.urgent || signal.quickFix)          return { id: signal.urgent ? 'console' : 'cli', ...METHOD_META[signal.urgent ? 'console' : 'cli'] };
  if (signal.oneTime)                            return { id: 'console', ...METHOD_META.console };
  // Default: Terraform — it's the most career-relevant choice.
  return { id: 'terraform', ...METHOD_META.terraform };
}

function RecommendationCard({ rec, title }) {
  return (
    <div className="surface rounded-2xl p-4 gradient-border relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-aws text-ink-950 text-xl flex-shrink-0">
          {rec.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
            <Wand2 size={11} /> Recommended method
          </div>
          <h4 className="text-sm font-extrabold tracking-tight mt-0.5">
            {rec.label}{title ? ` — ${title}` : ''}
          </h4>
          <p className="text-[11px] text-muted mt-1 leading-relaxed">
            <strong className="text-current">Why:</strong> {rec.why}
          </p>
          <div className="mt-2 text-[10px] text-muted">
            Also available:{' '}
            {Object.entries(METHOD_META).filter(([k]) => k !== rec.id).map(([k, m]) => (
              <span key={k} className="mr-2">{m.icon} {m.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ tabs ============================

function ConsoleTab({ c, progressKey }) {
  if (!c) return <Empty label="No console steps yet for this method." />;
  const steps = c.steps || [];

  // Persist progress (current index + done set + verify context) per task.
  const storageKey = progressKey
    ? `${STORAGE_KEY}::console-walk::${progressKey}`
    : `${STORAGE_KEY}::console-walk::__transient`;
  const [progress, setProgress] = useLocalStorage(storageKey, {
    current: 0,
    done: [],
    context: {}, // shared param store across steps (bucketName, region, etc.)
    verifications: {}, // stepIdx -> { ok, level, message, at, suggestions }
  });
  const [expandAll, setExpandAll] = useState(false);

  // Bounds-check current after content changes (e.g. steps shrink).
  useEffect(() => {
    if (progress.current > steps.length - 1) {
      setProgress((p) => ({ ...p, current: Math.max(0, steps.length - 1) }));
    }
  }, [steps.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = Math.min(progress.current || 0, Math.max(0, steps.length - 1));
  const doneSet = new Set(progress.done || []);
  const pct = steps.length ? Math.round((doneSet.size / steps.length) * 100) : 0;

  function go(idx) {
    setProgress((p) => ({ ...p, current: Math.max(0, Math.min(steps.length - 1, idx)) }));
  }

  function toggleDone(idx) {
    setProgress((p) => {
      const ds = new Set(p.done || []);
      if (ds.has(idx)) ds.delete(idx); else ds.add(idx);
      return { ...p, done: [...ds].sort((a, b) => a - b) };
    });
  }

  function markAndNext(idx) {
    setProgress((p) => {
      const ds = new Set(p.done || []);
      ds.add(idx);
      return { ...p, current: Math.min(steps.length - 1, idx + 1), done: [...ds].sort((a, b) => a - b) };
    });
  }

  function saveContext(patch) {
    setProgress((p) => ({ ...p, context: { ...(p.context || {}), ...patch } }));
  }

  function saveVerification(idx, result) {
    setProgress((p) => ({
      ...p,
      verifications: { ...(p.verifications || {}), [idx]: { ...result, at: Date.now() } },
      // Auto-mark done if verification succeeded
      done: result.ok ? [...new Set([...(p.done || []), idx])].sort((a, b) => a - b) : (p.done || []),
    }));
  }

  return (
    <div className="space-y-3">
      {/* Open-in-Console call-to-action (Step 0) */}
      {c.consoleUrl && (
        <a
          href={c.consoleUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl border border-aws-orange/40 bg-aws-orange/10 hover:bg-aws-orange/15 transition focus-ring p-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-aws grid place-items-center text-ink-950 shrink-0 shadow-glow-orange">
              <ExternalLink size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                Step 1 → open this page
              </div>
              <div className="text-sm font-extrabold tracking-tight">Open in AWS Console</div>
              <div className="text-[10px] text-muted font-mono truncate">{c.consoleUrl}</div>
            </div>
            <span className="text-aws-orange font-extrabold text-sm shrink-0">→</span>
          </div>
        </a>
      )}

      {steps.length === 0 ? null : (
        <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-3 space-y-3">
          {/* Top control row — step strip + actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-widest font-extrabold opacity-60">
                Step <strong className="opacity-100 text-aws-orange">{current + 1}</strong> of {steps.length}
              </span>
              {doneSet.size > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-success/20 text-success">
                  {doneSet.size} done · {pct}%
                </span>
              )}
            </div>
            <button
              onClick={() => setExpandAll((e) => !e)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg hover:bg-[var(--card-2)] flex items-center gap-1 opacity-80"
            >
              {expandAll ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
              {expandAll ? 'One at a time' : 'Expand all'}
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-[var(--card-2)] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-aws-orange"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Step pill strip — click to jump */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {steps.map((s, i) => {
              const done = doneSet.has(i);
              const active = i === current;
              return (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={cn(
                    'shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all',
                    active ? 'bg-gradient-aws text-ink-950'
                    : done ? 'bg-success/20 text-success hover:bg-success/30'
                    : 'bg-[var(--card)] opacity-50 hover:opacity-100'
                  )}
                  title={s.title}
                >
                  <span className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[8px]',
                    active ? 'bg-black/20' : done ? 'bg-success/40' : 'bg-[var(--card-2)]'
                  )}>
                    {done ? <Check size={8} /> : i + 1}
                  </span>
                  <span className="max-w-[100px] truncate">{s.title}</span>
                </button>
              );
            })}
          </div>

          {/* Step content — either one at a time or all expanded */}
          {expandAll ? (
            <ol className="space-y-2">
              {steps.map((s, i) => (
                <ConsoleStepCard
                  key={i} step={s} idx={i}
                  done={doneSet.has(i)}
                  onToggleDone={() => toggleDone(i)}
                  verification={progress.verifications?.[i]}
                  context={progress.context}
                  onSaveContext={saveContext}
                  onSaveVerification={(r) => saveVerification(i, r)}
                  compact
                />
              ))}
            </ol>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2 }}
              >
                <ConsoleStepCard
                  step={steps[current]}
                  idx={current}
                  done={doneSet.has(current)}
                  onToggleDone={() => toggleDone(current)}
                  verification={progress.verifications?.[current]}
                  context={progress.context}
                  onSaveContext={saveContext}
                  onSaveVerification={(r) => saveVerification(current, r)}
                />

                {/* Navigation row */}
                <div className="mt-3 flex justify-between items-center gap-2">
                  <button
                    onClick={() => go(current - 1)}
                    disabled={current === 0}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--card-2)]"
                  >
                    <ArrowLeft size={12} /> Previous
                  </button>
                  {current < steps.length - 1 ? (
                    <button
                      onClick={() => markAndNext(current)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-aws text-ink-950 text-xs font-extrabold flex items-center gap-1 shadow-glow-orange hover:brightness-110"
                    >
                      Mark done & next <ArrowRight size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleDone(current)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1',
                        doneSet.has(current)
                          ? 'bg-success/20 text-success'
                          : 'bg-gradient-aws text-ink-950 shadow-glow-orange hover:brightness-110'
                      )}
                    >
                      {doneSet.has(current) ? <><CheckCircle2 size={12} /> All done</> : <>Mark all done <Check size={12} /></>}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Single Console step card — shared by one-at-a-time + expanded views.
 *
 * Step data shape:
 *   {
 *     title:    string  — the headline action
 *     actions:  string[] — optional. Vertical micro-actions (one per line, connected).
 *                          When present, replaces the `detail` paragraph.
 *     detail:   string  — fallback prose if no actions[] provided
 *     diagram:  string  — optional ASCII / simple text diagram, rendered in a mono box
 *     expected: string  — green "you should now see this"
 *     screenshot: string — gray "what you should see on screen"
 *     gotcha:   string  — amber warning
 *   }
 */
function ConsoleStepCard({ step, idx, done, onToggleDone, compact = false, verification, context = {}, onSaveContext, onSaveVerification }) {
  // Split a sentence-form detail into bullets if there's no actions array.
  // Heuristic: split on ". " when the detail has 2+ sentences. Keeps shorter
  // hints as a single line.
  const fallbackBullets = !step.actions && step.detail
    ? splitDetailIntoBullets(step.detail)
    : null;
  const bullets = step.actions && step.actions.length
    ? step.actions
    : fallbackBullets;

  return (
    <div className={cn('surface rounded-xl p-4', done && 'border-success/40 bg-success/[0.04]', compact && 'p-3')}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggleDone}
          className={cn(
            'w-9 h-9 rounded-lg grid place-items-center font-black text-sm flex-shrink-0 transition-all',
            done
              ? 'bg-success text-ink-950'
              : 'bg-gradient-aws text-ink-950 hover:scale-105'
          )}
          title={done ? 'Mark as not done' : 'Mark done'}
        >
          {done ? <Check size={14} /> : idx + 1}
        </button>
        <div className="flex-1 min-w-0">
          <h5 className={cn('text-sm font-extrabold', done && 'line-through opacity-70')}>{step.title}</h5>

          {/* Vertical micro-actions — what the user actually clicks/types, one per line */}
          {bullets && bullets.length > 1 ? (
            <ol className="mt-2.5 space-y-0 relative">
              {bullets.map((b, i) => (
                <li key={i} className="relative pl-7 pb-2.5 last:pb-0">
                  {/* Vertical connector line */}
                  {i < bullets.length - 1 && (
                    <span className="absolute left-[10px] top-5 bottom-0 w-px bg-aws-orange/30" aria-hidden />
                  )}
                  {/* Bullet number */}
                  <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-aws-orange/15 border border-aws-orange/40 text-aws-orange text-[10px] font-extrabold grid place-items-center">
                    {String.fromCharCode(97 + i)}
                  </span>
                  <span className="text-xs leading-relaxed"><LinkText>{b}</LinkText></span>
                </li>
              ))}
            </ol>
          ) : bullets && bullets.length === 1 ? (
            <p className="text-xs text-muted leading-relaxed mt-1.5"><LinkText>{bullets[0]}</LinkText></p>
          ) : null}

          {/* ASCII / text diagram block — for showing layout, click paths, etc. */}
          {step.diagram && (
            <pre className="mt-2.5 rounded-lg border border-token bg-[var(--card-2)]/40 px-3 py-2 text-[10px] font-mono leading-snug whitespace-pre overflow-x-auto text-aws-orange/90">
{step.diagram}
            </pre>
          )}

          {/* Expected outcome */}
          {step.expected && (
            <div className="mt-2 rounded-lg border border-success/30 bg-success/[0.04] p-2 text-xs flex items-start gap-2">
              <CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" />
              <span><strong className="text-success">Expected:</strong> <LinkText>{step.expected}</LinkText></span>
            </div>
          )}
          {step.screenshot && (
            <div className="mt-2 rounded-lg border border-token bg-[var(--card-2)]/30 p-2 text-[11px] flex items-start gap-2">
              <span className="shrink-0">📸</span>
              <span><strong>What you should see:</strong> <LinkText>{step.screenshot}</LinkText></span>
            </div>
          )}
          {step.gotcha && (
            <div className="mt-2 rounded-lg border border-warning/30 bg-warning/[0.04] p-2 text-xs flex items-start gap-2">
              <AlertOctagon size={11} className="text-warning shrink-0 mt-0.5" />
              <span><strong className="text-warning">Gotcha:</strong> <LinkText>{step.gotcha}</LinkText></span>
            </div>
          )}

          {/* Live "Check my work" via linked AWS account */}
          {step.verify && (
            <CheckMyWork
              verify={step.verify}
              verification={verification}
              context={context}
              onSaveContext={onSaveContext}
              onSaveVerification={onSaveVerification}
            />
          )}
        </div>
        {!compact && (
          <button
            onClick={onToggleDone}
            className="shrink-0 text-[10px] font-bold opacity-60 hover:opacity-100 px-2 py-1 rounded hover:bg-[var(--card-2)] flex items-center gap-1"
          >
            {done ? <><CheckCircle2 size={10} className="text-success" /> Done</> : <><Circle size={10} /> Not done</>}
          </button>
        )}
      </div>
    </div>
  );
}

// =================================================================
// CheckMyWork — live verification panel
// Uses the linked AWS account to confirm this step actually happened.
// =================================================================

function CheckMyWork({ verify, verification, context = {}, onSaveContext, onSaveVerification }) {
  const aws = useAWS();
  const toast = useToast();
  const activeProfile = aws?.state?.profiles?.[aws?.state?.activeProfile];
  const isConnected = !!activeProfile?.connected;

  const def = VERIFIERS[verify.kind];
  const needs = def?.needs || [];

  // Derive which params are missing — look at context + paramHints
  const knownParams = { ...(verify.paramHints || {}), ...context };
  const missingParams = needs.filter((n) => !knownParams[n]);

  const [open, setOpen] = useState(missingParams.length > 0);
  const [inputs, setInputs] = useState(() => {
    const out = {};
    for (const n of needs) out[n] = knownParams[n] || '';
    return out;
  });
  const [busy, setBusy] = useState(false);

  async function runCheck() {
    if (!isConnected) {
      toast.error('Link an AWS account first (AWS Account Manager → Save → Test connection).');
      return;
    }
    setBusy(true);
    try {
      // Save any inputs the user typed back to shared context
      if (onSaveContext) onSaveContext(inputs);
      const creds = {
        accessKeyId: activeProfile.accessKeyId,
        secretAccessKey: activeProfile.secretAccessKey,
        ...(activeProfile.sessionToken ? { sessionToken: activeProfile.sessionToken } : {}),
      };
      const ctx = { region: activeProfile.region, ...context, ...inputs };
      const result = await runVerify({ verify, creds, ctx, extra: inputs });
      if (onSaveVerification) onSaveVerification(result);
      if (result.ok) toast.success('Verified ✓');
      else toast.warning('Check failed — see the details below');
    } catch (err) {
      if (onSaveVerification) onSaveVerification({ ok: false, level: 'error', message: err.message || String(err) });
    } finally {
      setBusy(false);
    }
  }

  // Visual style based on verification status
  const tone = !verification
    ? { wrap: 'border-electric/30 bg-electric/[0.04]', text: 'text-electric', icon: ShieldCheck }
    : verification.ok
      ? { wrap: 'border-success/40 bg-success/[0.06]', text: 'text-success', icon: CheckCircle2 }
      : verification.level === 'warning'
        ? { wrap: 'border-warning/40 bg-warning/[0.06]', text: 'text-warning', icon: AlertOctagon }
        : { wrap: 'border-danger/40 bg-danger/[0.06]', text: 'text-danger', icon: AlertOctagon };
  const ToneIcon = tone.icon;

  return (
    <div className={cn('mt-3 rounded-xl border p-3', tone.wrap)}>
      <div className="flex items-start gap-2.5">
        <ToneIcon size={13} className={cn('shrink-0 mt-0.5', tone.text)} />
        <div className="flex-1 min-w-0">
          <div className={cn('text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5', tone.text)}>
            {!verification && 'Live check'}
            {verification?.ok && 'Verified in AWS'}
            {verification && !verification.ok && verification.level === 'warning' && 'Almost — check the warning'}
            {verification && !verification.ok && verification.level !== 'warning' && 'Not detected in AWS'}
            <span className="text-[9px] opacity-50 font-mono">· {def?.label || verify.kind}</span>
          </div>

          {/* Result message */}
          {verification?.message && (
            <p className="text-xs leading-snug mt-1">{verification.message}</p>
          )}

          {/* If we need more inputs, show them */}
          {needs.length > 0 && (open || missingParams.length > 0) && (
            <div className="mt-2 space-y-1.5">
              {needs.map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-70 w-20 shrink-0">{n}</label>
                  <input
                    type="text"
                    value={inputs[n] || ''}
                    onChange={(e) => setInputs((s) => ({ ...s, [n]: e.target.value }))}
                    placeholder={(verify.paramHints || {})[n] || n}
                    className="flex-1 px-2 py-1 text-xs rounded-md bg-[var(--card-2)] border border-token focus:border-aws-orange focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Suggestions for fixing a failed check */}
          {verification && !verification.ok && verification.suggestions?.length > 0 && (
            <ol className="mt-2 space-y-1 text-[11px]">
              {verification.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className={cn('shrink-0 mt-0.5', tone.text)}>›</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          )}

          {/* Action bar */}
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={runCheck}
              disabled={busy || !isConnected}
              className={cn(
                'text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 transition',
                isConnected ? 'bg-gradient-aws text-ink-950 hover:brightness-110' : 'bg-[var(--card-2)] opacity-50 cursor-not-allowed',
                busy && 'opacity-70 cursor-wait'
              )}
              title={!isConnected ? 'Link an AWS account first' : 'Run the check against your AWS account'}
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : verification ? <RefreshCw size={10} /> : <ShieldCheck size={10} />}
              {busy ? 'Checking…' : verification ? 'Re-check' : 'Check my work'}
            </button>
            {needs.length > 0 && (
              <button
                onClick={() => setOpen((o) => !o)}
                className="text-[10px] opacity-60 hover:opacity-100"
              >
                {open ? 'Hide inputs' : 'Edit inputs'}
              </button>
            )}
            {!isConnected && (
              <span className="text-[10px] opacity-70 italic">
                Link account in AWS Account Manager to enable
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Heuristic to break a sentence-form `detail` into vertical bullets so even
 * legacy data displays as "one action per line". Splits on:
 *   • Sentence boundaries followed by an imperative verb start
 *   • "→" arrows (already an action separator)
 *   • Long sentences with 2+ conjunctions
 */
function splitDetailIntoBullets(detail) {
  if (!detail) return null;
  // Already a single-action sentence? Don't split.
  if (detail.length < 80 && !detail.includes('→') && !/\.\s+[A-Z]/.test(detail)) {
    return [detail];
  }
  // Split on arrows first (intentional action separator)
  if (detail.includes('→')) {
    return detail.split(/\s*→\s*/).map((s) => s.trim()).filter(Boolean);
  }
  // Split on sentence boundaries — keep each sentence
  const sentences = detail
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return sentences.length > 1 ? sentences : [detail];
}

function CliTab({ c }) {
  const toast = useToast();
  if (!c) return <Empty label="No CLI command set yet for this method." />;
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied'); }
    catch { toast.error('Could not copy'); }
  };
  return (
    <div className="space-y-3">
      <CodeBlock title="Run the command" language="bash" code={c.command} onCopy={copy} />
      {c.expected && (
        <div className="rounded-xl border border-success/30 bg-success/[0.04] p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-1">Expected output</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap">{c.expected}</pre>
        </div>
      )}
      {c.verifyCommand && (
        <CodeBlock title="Verify" language="bash" code={c.verifyCommand} onCopy={copy} />
      )}
      <ErrorList errors={c.gotchas} />
    </div>
  );
}

function TerraformTab({ c }) {
  const toast = useToast();
  if (!c) return <Empty label="No Terraform code yet for this method." />;
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied'); }
    catch { toast.error('Could not copy'); }
  };
  return (
    <div className="space-y-3">
      <CodeBlock title="main.tf" language="hcl" code={c.code} onCopy={copy} />
      <CodeBlock title="Commands" language="bash"
                 code={c.commands || 'terraform init\nterraform plan\nterraform apply'} onCopy={copy} />
      {c.expected && (
        <div className="rounded-xl border border-success/30 bg-success/[0.04] p-3">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-1">Expected output</div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap">{c.expected}</pre>
        </div>
      )}
      <ErrorList errors={c.errors} />
    </div>
  );
}

function CloudFormationTab({ c }) {
  const toast = useToast();
  if (!c) return <Empty label="No CloudFormation template yet for this method." />;
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied'); }
    catch { toast.error('Could not copy'); }
  };
  return (
    <div className="space-y-3">
      <CodeBlock title="template.yaml" language="yaml" code={c.template} onCopy={copy} />
      <CodeBlock title="Deploy" language="bash"
                 code={c.deployCommand || 'aws cloudformation deploy \\\n  --stack-name launchpad \\\n  --template-file template.yaml \\\n  --capabilities CAPABILITY_NAMED_IAM'}
                 onCopy={copy} />
      {c.verifyCommand && (
        <CodeBlock title="Verify stack" language="bash" code={c.verifyCommand} onCopy={copy} />
      )}
      <ErrorList errors={c.errors} />
    </div>
  );
}

// ============================ shared ============================

function CodeBlock({ title, language, code, onCopy }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 overflow-hidden">
      <div className="flex items-center justify-between border-b border-token px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted">
          {title} <span className="text-aws-orange">·</span> <code>{language}</code>
        </div>
        <button onClick={() => onCopy(code)} className="text-muted hover:text-aws-orange p-1" title="Copy">
          <ClipboardCopy size={12} />
        </button>
      </div>
      <pre className="text-[11px] font-mono leading-relaxed p-3 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function ErrorList({ errors }) {
  if (!errors || errors.length === 0) return null;
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
      <h5 className="text-[10px] font-extrabold uppercase tracking-widest text-warning mb-2 inline-flex items-center gap-1.5">
        <AlertOctagon size={11} /> Common errors for this method
      </h5>
      <ul className="space-y-1.5">
        {errors.map((e, i) => (
          <li key={i} className="text-xs">
            <strong className="block">{e.problem}</strong>
            <span className="text-muted leading-relaxed">{e.fix}</span>
            {e.docs && (
              <a href={e.docs} target="_blank" rel="noreferrer"
                 className="ml-2 text-aws-orange font-bold inline-flex items-center gap-0.5">
                <ExternalLink size={10} /> docs
              </a>
            )}
            {e.autoFix && (
              <button className="ml-2 text-electric font-bold underline">Auto Fix</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-6 text-center text-xs text-muted">
      {label}
    </div>
  );
}

/**
 * Convenience export — content packs the project step authors can use to
 * fill in the SmartMethodDetector quickly. Keep them small + accurate.
 */
export const SAMPLE_S3_BUCKET = {
  title: 'Create a private S3 bucket with default encryption',
  signal: { repeatable: true, services: ['s3'] },
  content: {
    console: {
      consoleUrl: 'https://s3.console.aws.amazon.com/',
      steps: [
        { title: 'S3 → Create bucket', detail: 'Pick a globally unique name + your nearest region.', expected: 'You land on the "General configuration" form.' },
        { title: 'Leave Block Public Access ON', detail: 'All four checkboxes stay ticked.', expected: 'Green "Bucket and objects not public" banner.' },
        { title: 'Enable default encryption', detail: 'Server-side encryption with Amazon S3 managed keys (SSE-S3).', expected: 'Encryption status: Enabled.' },
        { title: 'Create bucket', expected: 'New bucket appears in the list.', screenshot: 'screenshot of the bucket detail page.' },
      ],
    },
    cli: {
      command: 'aws s3api create-bucket \\\n  --bucket launchpad-demo-$(date +%s) \\\n  --region us-east-1 \\\n  --create-bucket-configuration LocationConstraint=us-east-1',
      expected: '{\n    "Location": "/launchpad-demo-1716161616"\n}',
      verifyCommand: 'aws s3api list-buckets --query "Buckets[].Name" --output table',
      gotchas: [
        { problem: 'IllegalLocationConstraint when creating in us-east-1', fix: 'Omit --create-bucket-configuration entirely when the region is us-east-1. AWS treats us-east-1 specially.' },
        { problem: 'AccessDenied: Anonymous users cannot access this bucket', fix: 'Expected — that\'s Block Public Access doing its job.' },
      ],
    },
    terraform: {
      code: `resource "aws_s3_bucket" "demo" {
  bucket = "launchpad-demo-\${random_id.suffix.hex}"
  tags   = { Project = "launchpad" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "demo" {
  bucket = aws_s3_bucket.demo.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_public_access_block" "demo" {
  bucket                  = aws_s3_bucket.demo.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_id" "suffix" { byte_length = 4 }`,
      commands: 'terraform init\nterraform plan\nterraform apply -auto-approve',
      expected: 'Apply complete! Resources: 4 added, 0 changed, 0 destroyed.',
      errors: [
        { problem: 'BucketAlreadyExists', fix: 'S3 bucket names are GLOBALLY unique. Add a suffix (random_id, your initials, timestamp).' },
        { problem: 'AccessDenied on apply', fix: 'IAM user needs s3:CreateBucket + s3:PutEncryptionConfiguration + s3:PutBucketPublicAccessBlock.' },
      ],
    },
    cloudformation: {
      template: `AWSTemplateFormatVersion: '2010-09-09'
Description: Private S3 bucket with default encryption

Resources:
  DemoBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "launchpad-demo-\${AWS::AccountId}-\${AWS::Region}"
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault: { SSEAlgorithm: AES256 }`,
      deployCommand: 'aws cloudformation deploy \\\n  --stack-name launchpad-s3 \\\n  --template-file s3.yaml',
      verifyCommand: 'aws cloudformation describe-stacks --stack-name launchpad-s3 \\\n  --query "Stacks[0].StackStatus" --output text',
      errors: [
        { problem: 'Stack rollback on CREATE', fix: 'Run "aws cloudformation describe-stack-events --stack-name launchpad-s3" — the first FAILED row tells you the reason.' },
      ],
    },
  },
};
