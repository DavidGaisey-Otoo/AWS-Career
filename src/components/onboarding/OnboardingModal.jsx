import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera, ChevronLeft, ChevronRight, Sparkles, Target, Clock, DollarSign, Calendar, Rocket, Trophy,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AWS_LEVELS, GOALS, HOURS_OPTIONS } from '../../lib/constants.js';
import { cn, formatCurrency } from '../../lib/utils.js';
import { Button } from '../ui/Button.jsx';
import { fireConfetti, sideCannons } from '../ui/Confetti.js';

const STEPS = [
  { id: 'name',     title: 'Welcome aboard', subtitle: "Let's get you set up. Tell us who's on this journey.", icon: Sparkles },
  { id: 'level',    title: "Your AWS level", subtitle: 'Be honest — your roadmap calibrates from here.', icon: Trophy },
  { id: 'goal',     title: 'Your main goal', subtitle: 'Pick the outcome that matters most right now.', icon: Target },
  { id: 'hours',    title: 'Time you can invest', subtitle: 'A realistic answer beats an optimistic one.', icon: Clock },
  { id: 'income',   title: 'Target monthly income', subtitle: 'Drag the slider. This shapes your freelance plan.', icon: DollarSign },
  { id: 'date',     title: 'Target job-ready date', subtitle: 'A deadline turns dreams into milestones.', icon: Calendar },
];

export function OnboardingModal() {
  const { completeOnboarding, addNotification } = useApp();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: '',
    avatar: null,
    level: null,
    goal: null,
    hours: null,
    targetIncome: 5000,
    targetDate: defaultTargetDate(),
  });
  const fileRef = useRef(null);

  const canAdvance = useMemo(() => {
    switch (STEPS[step].id) {
      case 'name':   return data.name.trim().length >= 2;
      case 'level':  return !!data.level;
      case 'goal':   return !!data.goal;
      case 'hours':  return !!data.hours;
      case 'income': return data.targetIncome > 0;
      case 'date':   return !!data.targetDate;
      default:       return true;
    }
  }, [step, data]);

  const next = () => {
    if (!canAdvance) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else finish();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const onAvatar = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setData((d) => ({ ...d, avatar: reader.result }));
    reader.readAsDataURL(file);
  };

  const finish = () => {
    completeOnboarding(data);
    sideCannons();
    setTimeout(fireConfetti, 250);
    toast.success(`Welcome aboard, ${data.name.split(' ')[0] || 'friend'}!`, {
      description: 'Your personalized dashboard is ready.',
    });
    addNotification({
      title: 'Roadmap generated',
      body: `Tailored for a ${labelFor(AWS_LEVELS, data.level)} aiming at ${labelFor(GOALS, data.goal)}.`,
      type: 'success',
    });
  };

  const ActiveIcon = STEPS[step].icon;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-md" />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="surface relative w-full max-w-2xl rounded-3xl overflow-hidden gradient-border"
        >
          {/* Decorative header */}
          <div className="relative h-32 bg-gradient-aws overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.5),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(0,212,255,0.5),transparent_45%)]" />
            <div className="relative h-full flex items-end px-6 pb-4">
              <div className="flex items-center gap-3 text-ink-950">
                <div className="w-12 h-12 rounded-2xl bg-white/90 grid place-items-center shadow-lg">
                  <ActiveIcon size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-widest uppercase opacity-75">
                    Step {step + 1} of {STEPS.length}
                  </div>
                  <div id="onboarding-title" className="text-xl font-extrabold tracking-tight">{STEPS[step].title}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="px-6 pt-4 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 rounded-full transition-all duration-500',
                  i === step ? 'flex-[2] bg-aws-orange'
                    : i < step ? 'flex-1 bg-aws-orange/60'
                    : 'flex-1 bg-[var(--card-2)]'
                )}
              />
            ))}
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6 min-h-[280px]">
            <p className="text-sm text-muted mb-5">{STEPS[step].subtitle}</p>

            <AnimatePresence mode="wait">
              <motion.div
                key={STEPS[step].id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
              >
                {STEPS[step].id === 'name' && (
                  <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="group relative w-24 h-24 rounded-2xl overflow-hidden bg-[var(--card-2)] border border-token grid place-items-center hover:border-aws-orange transition focus-ring"
                    >
                      {data.avatar ? (
                        <img src={data.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-muted group-hover:text-aws-orange transition" size={28} />
                      )}
                      <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[10px] font-semibold py-1 opacity-0 group-hover:opacity-100 transition">
                        {data.avatar ? 'Change' : 'Add photo'}
                      </span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onAvatar(e.target.files?.[0])}
                    />
                    <div className="flex-1 w-full space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted">Your name</label>
                      <input
                        autoFocus
                        value={data.name}
                        onChange={(e) => setData((d) => ({ ...d, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter' && canAdvance) next(); }}
                        placeholder="e.g. David Chen"
                        className="w-full bg-[var(--card-2)] border border-token rounded-xl px-4 py-3 text-base font-semibold placeholder:text-muted focus-ring focus:border-aws-orange transition"
                      />
                      <p className="text-xs text-muted">We use this to personalize your dashboard, certificates, and emails.</p>
                    </div>
                  </div>
                )}

                {STEPS[step].id === 'level' && (
                  <ChoiceGrid
                    options={AWS_LEVELS}
                    value={data.level}
                    onChange={(v) => setData((d) => ({ ...d, level: v }))}
                  />
                )}

                {STEPS[step].id === 'goal' && (
                  <ChoiceGrid
                    options={GOALS}
                    value={data.goal}
                    onChange={(v) => setData((d) => ({ ...d, goal: v }))}
                  />
                )}

                {STEPS[step].id === 'hours' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {HOURS_OPTIONS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => setData((d) => ({ ...d, hours: o.id }))}
                        className={cn(
                          'relative rounded-2xl p-4 text-left transition-all focus-ring border',
                          data.hours === o.id
                            ? 'border-aws-orange bg-aws-orange/10 shadow-glow-orange'
                            : 'border-token hover:border-aws-orange/40 hover:bg-[var(--card-2)]'
                        )}
                      >
                        <Clock size={18} className="mb-2 text-aws-orange" />
                        <div className="text-base font-extrabold tracking-tight">{o.label}</div>
                        <div className="text-[11px] text-muted mt-0.5">per day</div>
                      </button>
                    ))}
                  </div>
                )}

                {STEPS[step].id === 'income' && (
                  <div className="space-y-5">
                    <div className="text-center">
                      <div className="text-5xl font-black tracking-tight text-gradient">
                        {formatCurrency(data.targetIncome)}
                      </div>
                      <div className="text-xs text-muted mt-1">per month from cloud work</div>
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={20000}
                      step={250}
                      value={data.targetIncome}
                      onChange={(e) => setData((d) => ({ ...d, targetIncome: Number(e.target.value) }))}
                      className="w-full accent-aws-orange"
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted font-semibold">
                      <span>$500</span><span>$10k</span><span>$20k+</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[1500, 3000, 5000, 10000].map((v) => (
                        <button
                          key={v}
                          onClick={() => setData((d) => ({ ...d, targetIncome: v }))}
                          className={cn(
                            'rounded-xl py-2 text-xs font-bold transition',
                            data.targetIncome === v ? 'bg-aws-orange text-ink-950'
                              : 'surface-2 hover:bg-[var(--card-2)]'
                          )}
                        >
                          {formatCurrency(v)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {STEPS[step].id === 'date' && (
                  <div className="space-y-4">
                    <input
                      type="date"
                      value={data.targetDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setData((d) => ({ ...d, targetDate: e.target.value }))}
                      className="w-full bg-[var(--card-2)] border border-token rounded-xl px-4 py-3 text-base font-semibold focus-ring focus:border-aws-orange"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      {[60, 90, 180].map((days) => {
                        const d = new Date(); d.setDate(d.getDate() + days);
                        const iso = d.toISOString().slice(0, 10);
                        const active = data.targetDate === iso;
                        return (
                          <button
                            key={days}
                            onClick={() => setData((p) => ({ ...p, targetDate: iso }))}
                            className={cn(
                              'rounded-xl py-3 text-xs font-bold transition',
                              active ? 'bg-aws-orange text-ink-950' : 'surface-2 hover:bg-[var(--card-2)]'
                            )}
                          >
                            In {days} days
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted">
                      Your roadmap will pace milestones to land before this date.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-token flex items-center justify-between bg-[var(--card-2)]/40">
            <Button variant="ghost" size="md" onClick={back} icon={ChevronLeft} className={cn(step === 0 && 'invisible')}>
              Back
            </Button>
            <Button
              size="md"
              onClick={next}
              disabled={!canAdvance}
              iconRight={step === STEPS.length - 1 ? Rocket : ChevronRight}
              className={cn(!canAdvance && 'opacity-50 cursor-not-allowed')}
            >
              {step === STEPS.length - 1 ? 'Launch dashboard' : 'Continue'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ChoiceGrid({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              'relative rounded-2xl p-4 text-left transition-all focus-ring border',
              active
                ? 'border-aws-orange bg-aws-orange/10 shadow-glow-orange'
                : 'border-token hover:border-aws-orange/40 hover:bg-[var(--card-2)]'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold tracking-tight">{o.label}</div>
                <div className="text-xs text-muted mt-0.5 leading-relaxed">{o.blurb}</div>
              </div>
              <div className={cn(
                'mt-0.5 w-5 h-5 rounded-full border-2 grid place-items-center transition',
                active ? 'border-aws-orange bg-aws-orange' : 'border-token'
              )}>
                {active && <div className="w-2 h-2 rounded-full bg-ink-950" />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function labelFor(list, id) {
  return list.find((x) => x.id === id)?.label || '';
}

function defaultTargetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}
