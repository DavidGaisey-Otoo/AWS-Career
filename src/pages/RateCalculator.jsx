/**
 * RateCalculator.jsx — EA-01 freelance rate calculator page.
 *
 * Live math — every keystroke recomputes. No submit button needed.
 * "Save My Rate" persists the recommended rate to profile so other
 * surfaces (proposals, rate benchmark) can use it.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator, DollarSign, Clock, Briefcase, TrendingUp, Save,
  Target, AlertTriangle, ChevronLeft, Sparkles, CheckCircle2,
  Wallet, Percent, Lightbulb, RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { calculate, PLATFORM_PRESETS } from '../lib/rateCalculator.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { cn } from '../lib/utils.js';

const INPUT_KEY = `${STORAGE_KEY}::rate-calc-inputs`;

const DEFAULTS = {
  livingExpenses: 500,
  businessExpenses: 80,
  hoursPerWeek: 25,
  platformId: 'upwork',
  platformFeePct: 10,
  profitBufferPct: 20,
  incomeGoal: 800,
};

function readSavedInputs() {
  try {
    const raw = localStorage.getItem(INPUT_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}
function writeSavedInputs(inputs) {
  try { localStorage.setItem(INPUT_KEY, JSON.stringify(inputs)); } catch {}
}

export default function RateCalculator() {
  const { profile, updateProfile } = useApp();
  const toast = useToast();
  const [inputs, setInputs] = useState(() => readSavedInputs());
  const [justSaved, setJustSaved] = useState(false);

  // Persist inputs on change so the user doesn't lose them on refresh
  useEffect(() => { writeSavedInputs(inputs); }, [inputs]);

  // Live recompute
  const result = useMemo(() => calculate(inputs), [inputs]);

  function set(field, value) {
    setInputs((p) => ({ ...p, [field]: value }));
  }

  function pickPlatform(id) {
    const p = PLATFORM_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setInputs((prev) => ({ ...prev, platformId: id, platformFeePct: p.feePct }));
  }

  function reset() {
    setInputs(DEFAULTS);
    toast?.info?.('Reset to defaults');
  }

  function saveRate() {
    if (!result.recommendedRate || result.recommendedRate <= 0) {
      toast?.warning?.('Set your expenses + hours first');
      return;
    }
    updateProfile({
      savedHourlyRate: {
        amount: result.recommendedRate,
        currency: 'USD',
        savedAt: new Date().toISOString(),
        breakEven: result.breakEvenRate,
        afterFeeRate: result.afterFeeRate,
        platformId: inputs.platformId,
        platformFeePct: inputs.platformFeePct,
      },
    });
    setJustSaved(true);
    toast?.success?.(`Saved $${Math.round(result.recommendedRate)}/hr to your profile — proposals will reference it`);
    setTimeout(() => setJustSaved(false), 2000);
  }

  const savedRate = profile?.savedHourlyRate;

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="EA-01 · Rate Calculator"
        title="What hourly rate should I actually charge?"
        subtitle="Plug in your expenses, available hours, and platform — the calculator works backward from there. Every keystroke updates live."
        icon={Calculator}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ─────── INPUTS (2 cols) ─────── */}
        <div className="lg:col-span-2 space-y-3">
          <Section title="Your situation" icon={Wallet}>
            <Field
              label="Monthly living expenses"
              hint="Rent, food, transport, healthcare — your real cost of life"
              value={inputs.livingExpenses}
              onChange={(v) => set('livingExpenses', v)}
              prefix="$"
              icon={Wallet}
            />
            <Field
              label="Monthly business expenses"
              hint="AWS bill, software, internet, accountant, courses"
              value={inputs.businessExpenses}
              onChange={(v) => set('businessExpenses', v)}
              prefix="$"
              icon={Briefcase}
            />
            <Field
              label="Hours available per week"
              hint="Realistic billable hours — not 'I'm awake 16 hours/day'"
              value={inputs.hoursPerWeek}
              onChange={(v) => set('hoursPerWeek', v)}
              suffix="hrs"
              icon={Clock}
            />
          </Section>

          <Section title="Platform" icon={Briefcase}>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickPlatform(p.id)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border transition',
                    inputs.platformId === p.id
                      ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                      : 'border-token opacity-75 hover:opacity-100'
                  )}
                >
                  {p.label} {p.feePct > 0 && <span className="opacity-70">−{p.feePct}%</span>}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Field
                label="Platform fee %"
                hint="What the platform takes off your top — override if needed"
                value={inputs.platformFeePct}
                onChange={(v) => set('platformFeePct', v)}
                suffix="%"
                icon={Percent}
              />
            </div>
          </Section>

          <Section title="Profit buffer & income goal" icon={TrendingUp}>
            <Field
              label="Profit buffer %"
              hint="How much above break-even you want — recommend 20% for savings + tax"
              value={inputs.profitBufferPct}
              onChange={(v) => set('profitBufferPct', v)}
              suffix="%"
              icon={Percent}
            />
            <Field
              label="Target monthly income (optional)"
              hint="Your desired take-home — calculator works backward to hours/rate needed"
              value={inputs.incomeGoal}
              onChange={(v) => set('incomeGoal', v)}
              prefix="$"
              icon={Target}
            />
          </Section>

          <button onClick={reset} className="text-[11px] opacity-60 hover:opacity-100 inline-flex items-center gap-1 px-2 py-1">
            <RotateCcw size={11} /> Reset to defaults
          </button>
        </div>

        {/* ─────── RESULTS (3 cols) ─────── */}
        <div className="lg:col-span-3 space-y-3">
          {/* Headline summary */}
          <div className="surface rounded-2xl p-5 gradient-border">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-aws-orange/15 p-2.5 flex-shrink-0">
                <Sparkles size={18} className="text-aws-orange" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
                  YOUR RATE STRATEGY
                </div>
                <p className="text-[14.5px] font-bold leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Big numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BigStat
              icon={DollarSign}
              label="Break-even rate"
              value={result.breakEvenRate}
              suffix="/hr"
              tone="slate"
              footnote="Bare minimum to cover expenses after fees"
            />
            <BigStat
              icon={TrendingUp}
              label="Recommended rate"
              value={result.recommendedRate}
              suffix="/hr"
              tone="orange"
              footnote={`Break-even + ${inputs.profitBufferPct}% buffer`}
              highlight
            />
            <BigStat
              icon={Wallet}
              label="You keep"
              value={result.afterFeeRate}
              suffix="/hr"
              tone="success"
              footnote={`After ${inputs.platformFeePct}% platform fee`}
            />
          </div>

          {/* Goal breakdown */}
          {inputs.incomeGoal > 0 && (
            <div className="surface rounded-2xl p-5 space-y-3">
              <h3 className="text-[13px] font-extrabold flex items-center gap-1.5">
                <Target size={13} className="text-aws-orange" />
                To hit your ${Math.round(inputs.incomeGoal)}/month goal
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Metric
                  label="Billable hours needed/month"
                  value={`${Math.round(result.hoursNeededForGoal)} hrs`}
                  subtitle={`vs your ${Math.round(result.billableHoursMonth)} available`}
                  tone={result.hoursNeededForGoal <= result.billableHoursMonth ? 'success' : 'warning'}
                />
                <Metric
                  label="Hours per week needed"
                  value={`${Math.round(result.hoursNeededForGoal / (52 / 12))} hrs/wk`}
                  subtitle={`vs your ${inputs.hoursPerWeek} planned`}
                  tone={(result.hoursNeededForGoal / (52 / 12)) <= inputs.hoursPerWeek ? 'success' : 'warning'}
                />
              </div>
            </div>
          )}

          {/* Monthly potential */}
          <div className="surface rounded-2xl p-4 flex items-start gap-3">
            <Lightbulb size={14} className="text-aws-orange mt-0.5 flex-shrink-0" />
            <p className="text-[12.5px] opacity-90 leading-relaxed m-0">
              <strong>Maximum monthly take-home</strong> at the recommended rate, working all{' '}
              <strong>{Math.round(result.billableHoursMonth)} hours/month</strong>:{' '}
              <strong className="text-success">${result.monthlyTakeHome.toLocaleString()}</strong>{' '}
              after fees. Anything beyond your expenses ({(inputs.livingExpenses + inputs.businessExpenses).toLocaleString()}/mo) is savings, tax, and growth fund.
            </p>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="surface rounded-2xl border border-warning/40 bg-warning/5 p-4 space-y-1.5">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-warning flex items-center gap-1.5">
                <AlertTriangle size={11} /> Sanity check
              </div>
              <ul className="space-y-1 text-[12px] opacity-90">
                {result.warnings.map((w, i) => <li key={i} className="leading-snug">• {w}</li>)}
              </ul>
            </div>
          )}

          {/* Save action */}
          <div className="surface rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex-1">
              <div className="text-[12.5px] font-bold">Save this as your rate?</div>
              <div className="text-[11px] opacity-70 mt-0.5">
                {savedRate
                  ? <>Currently saved: <strong>${Math.round(savedRate.amount)}/hr</strong> (set {new Date(savedRate.savedAt).toLocaleDateString('en-GB')}). Future proposals will reference it.</>
                  : 'Stores in your profile — Smart Proposal Generator + Rate Benchmark will know your floor.'
                }
              </div>
            </div>
            <button
              onClick={saveRate}
              disabled={!result.recommendedRate}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] font-extrabold transition',
                justSaved
                  ? 'bg-success text-ink-950'
                  : 'bg-gradient-aws text-ink-950 hover:brightness-110',
                !result.recommendedRate && 'opacity-50 cursor-not-allowed'
              )}
            >
              {justSaved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save my rate</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Local building blocks
// ════════════════════════════════════════════════════════════════════
function Section({ title, icon: Icon, children }) {
  return (
    <div className="surface rounded-2xl p-4 space-y-3">
      <h3 className="text-[12px] font-extrabold flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-aws-orange" />}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, hint, value, onChange, prefix, suffix, icon: Icon }) {
  return (
    <div>
      <label className="text-[10.5px] font-bold opacity-75 flex items-center gap-1 mb-1">
        {Icon && <Icon size={10} />} {label.toUpperCase()}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12.5px] opacity-60 font-bold pointer-events-none">{prefix}</span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={cn(
            'w-full rounded-lg bg-[var(--card-2)] border border-token py-1.5 text-[13.5px] font-bold outline-none focus:border-aws-orange',
            prefix ? 'pl-6 pr-2.5' : 'px-2.5',
            suffix && 'pr-10'
          )}
        />
        {suffix && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11.5px] opacity-60 font-bold pointer-events-none">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[10.5px] opacity-60 mt-0.5 leading-snug">{hint}</p>}
    </div>
  );
}

function BigStat({ icon: Icon, label, value, suffix, tone, footnote, highlight }) {
  const toneClass = {
    slate:   'text-slate-300',
    orange:  'text-aws-orange',
    success: 'text-success',
  }[tone] || 'text-aws-orange';
  return (
    <div className={cn(
      'rounded-2xl p-4 border',
      highlight ? 'border-aws-orange/40 bg-aws-orange/5 shadow-glow-orange' : 'surface'
    )}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-75">{label}</span>
        {Icon && <Icon size={13} className={toneClass} />}
      </div>
      <div className={cn('text-2xl font-extrabold leading-tight', toneClass)}>
        ${typeof value === 'number' ? value.toFixed(2) : value}
        <span className="text-[12px] opacity-70 ml-0.5 font-bold">{suffix}</span>
      </div>
      {footnote && <div className="text-[10.5px] opacity-65 mt-1 leading-snug">{footnote}</div>}
    </div>
  );
}

function Metric({ label, value, subtitle, tone }) {
  const toneClass = {
    success: 'text-success',
    warning: 'text-warning',
    danger:  'text-danger',
  }[tone] || 'text-aws-orange';
  return (
    <div className="rounded-xl bg-[var(--card-2)] border border-token p-3">
      <div className="text-[10.5px] font-bold opacity-75 mb-0.5">{label.toUpperCase()}</div>
      <div className={cn('text-xl font-extrabold', toneClass)}>{value}</div>
      {subtitle && <div className="text-[10.5px] opacity-70 mt-0.5">{subtitle}</div>}
    </div>
  );
}
