/**
 * BuildYourOwnCard.jsx — BUILD-01: build something that isn't a preset.
 *
 * The eight catalogue projects cover common shapes, but they are a fixed
 * list. When what you want to build isn't among them there was previously
 * nowhere to say so — the guided experience (tickable steps, progress,
 * screenshots, notes, common errors, the detail page) simply wasn't
 * available for anything else.
 *
 * This is the text box. Describe the thing, and it generates a project in
 * the same shape as a preset — so it lands on the same board and behaves
 * identically from there on.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Wand2, Loader2, X, Sparkles, ArrowRight, AlertTriangle,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { generateCustomProject } from '../../lib/customProjects.js';
import { cn } from '../../lib/utils.js';

const EXAMPLES = [
  'A WhatsApp-style chat backend with real-time messaging, image uploads and push notifications for about 5,000 users',
  'An internal tool that ingests daily CSV sales files, validates them and shows a dashboard the sales team can query',
  'A URL shortener that handles 10,000 redirects a second with analytics on every click',
];

export function BuildYourOwnCard() {
  const nav = useNavigate();
  const toast = useToast();
  const { addCustomProject } = usePortfolio();

  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setBrief(''); setTitle(''); setError(''); setBusy(false);
  }

  function handleGenerate() {
    setError('');
    if (brief.trim().length < 15) {
      setError('Give it a bit more detail — what does it do, roughly how many users, any constraints?');
      return;
    }
    setBusy(true);
    // Let the button paint its busy state before the synchronous engines run
    setTimeout(() => {
      try {
        const project = generateCustomProject({ brief: brief.trim(), title: title.trim() || undefined });
        const saved = addCustomProject(project);
        if (!saved) throw new Error('Could not save — browser storage may be full.');
        toast?.success?.(`"${project.title}" added — ${project.buildSteps.length} steps ready.`);
        setOpen(false);
        reset();
        nav(`/portfolio/${project.id}`);
      } catch (err) {
        console.error('[BuildYourOwn] generation failed:', err);
        setError(err.message || 'Could not build that. Try describing it differently.');
        setBusy(false);
      }
    }, 50);
  }

  return (
    <>
      {/* Entry card — sits alongside the preset projects */}
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border-2 border-dashed border-token hover:border-aws-orange/60 hover:bg-aws-orange/5 transition p-4 group tap-44"
      >
        <div className="flex items-start gap-3">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-aws-orange/15 text-aws-orange shrink-0 group-hover:scale-105 transition">
            <Plus size={20} />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-[14px]">Build something else</div>
            <p className="text-[12px] opacity-75 mt-0.5 leading-relaxed">
              None of these what you need? Describe your own project and get the same
              step-by-step build, cost estimate and progress tracking.
            </p>
          </div>
          <ArrowRight size={16} className="opacity-30 group-hover:opacity-100 group-hover:text-aws-orange transition shrink-0 mt-1" />
        </div>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
            onClick={() => !busy && setOpen(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              className="surface rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 space-y-4 safe-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
                    Your own project
                  </div>
                  <h2 className="text-lg font-extrabold flex items-center gap-2">
                    <Wand2 size={18} className="text-aws-orange" />
                    What do you want to build?
                  </h2>
                </div>
                {!busy && (
                  <button onClick={() => setOpen(false)} className="grid place-items-center w-9 h-9 rounded-full hover:bg-[var(--card-2)] tap-44" aria-label="Close">
                    <X size={18} />
                  </button>
                )}
              </div>

              <p className="text-[12.5px] opacity-80 leading-relaxed">
                Describe it in your own words — what it does, roughly how many users, and
                anything that matters like a budget or a deadline. The more you say, the
                better the build plan.
              </p>

              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={6}
                disabled={busy}
                placeholder="e.g. A booking system for my barber shop. Customers pick a slot online, get an SMS reminder, and the barber sees the day's appointments on a phone. Maybe 500 customers. Keep it cheap."
                className="w-full rounded-xl bg-[var(--card-2)] border border-token p-3.5 text-[13.5px] leading-relaxed outline-none focus:border-aws-orange resize-y disabled:opacity-50"
              />

              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={busy}
                placeholder="Project name (optional — one will be suggested)"
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[13px] outline-none focus:border-aws-orange disabled:opacity-50"
              />

              {error && (
                <div className="flex items-start gap-2 text-[12px] text-warning">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={busy || !brief.trim()}
                className={cn(
                  'w-full btn btn-primary !text-[13.5px] !py-3 tap-44 gap-2',
                  (busy || !brief.trim()) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {busy
                  ? <><Loader2 size={15} className="animate-spin" /> Designing your build…</>
                  : <><Sparkles size={15} /> Create my build plan</>}
              </button>

              <div className="pt-3 border-t border-token">
                <div className="text-[10.5px] font-extrabold uppercase tracking-widest opacity-60 mb-2">
                  Not sure how to describe it? Try one of these
                </div>
                <div className="space-y-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setBrief(ex)}
                      disabled={busy}
                      className="w-full text-left text-[11.5px] rounded-lg border border-token p-2 hover:border-aws-orange/50 hover:text-aws-orange transition disabled:opacity-50"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10.5px] opacity-60 leading-relaxed">
                You&apos;ll get the AWS services it needs, a phase-by-phase build plan you can
                tick off, an architecture diagram, a cost estimate, and the mistakes people
                usually make on this kind of build — the same as any project in the catalogue.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
