/**
 * NewWalkthrough.jsx — PJ-04 Phase B paste-a-brief page.
 *
 * Lives at /walkthroughs/deep/new. User pastes a project description OR
 * picks services from chips, then clicks Generate → saved walkthrough
 * appears in the Library Hub + navigates straight to it.
 */

import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Sparkles, Wand2, CheckCircle2, AlertCircle, ChevronRight,
} from 'lucide-react';
import {
  detectServicesInBrief, generateWalkthrough, SUPPORTED_SERVICES,
} from '../lib/walkthroughGenerator.js';
import { saveWalkthrough } from '../lib/savedWalkthroughs.js';
import { suggestRegion } from '../lib/regionSuggester.js';
import { setProjectRegion } from '../lib/projectRegion.js';
import { REGION_LABELS } from '../data/awsPricing.js';
import { ServiceSuggestionChips } from '../components/build/ServiceSuggestionChips.jsx';
import { cn } from '../lib/utils.js';

export default function NewWalkthrough() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  // Prefill from URL params (used by Project Builder / Job Analyzer integrations)
  const [title, setTitle] = useState(params.get('title') || '');
  const [brief, setBrief] = useState(params.get('brief') || '');
  const [picked, setPicked] = useState(
    (params.get('services') || '').split(',').filter(Boolean)
  );
  const [source, setSource] = useState(params.get('source') || 'manual');
  const [error, setError] = useState('');

  // Live-detect services from brief as user types
  const detected = useMemo(() => detectServicesInBrief(brief), [brief]);

  // AD-01: live region suggestion as the user types
  const regionSuggestion = useMemo(() => suggestRegion({ brief }), [brief]);

  // Combined service list (detected + picked, deduped, only supported)
  const finalServices = useMemo(() => {
    return [...new Set([...detected, ...picked])].filter((s) => SUPPORTED_SERVICES.includes(s));
  }, [detected, picked]);

  // Toggle a service chip
  function togglePick(svc) {
    setPicked((p) => p.includes(svc) ? p.filter((s) => s !== svc) : [...p, svc]);
  }

  function handleGenerate() {
    setError('');
    if (!title.trim()) return setError('Give your walkthrough a title.');
    if (finalServices.length === 0) {
      return setError('Describe your project OR pick at least one AWS service below.');
    }

    const w = generateWalkthrough({
      title: title.trim(),
      brief: brief.trim(),
      services: finalServices,
      source,
    });
    saveWalkthrough(w);

    // AD-01: seed the per-project region from the live suggestion
    setProjectRegion(w.id, {
      region: regionSuggestion.primary,
      source: 'detected',
      audience: regionSuggestion.audience,
      confidence: regionSuggestion.confidence,
    });

    nav(`/walkthroughs/deep/${w.id}`);
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Link to="/walkthroughs/deep" className="text-sm opacity-70 hover:opacity-100 inline-flex items-center gap-1.5">
        <ArrowLeft size={14} /> All Deep Walkthroughs
      </Link>

      {/* Header */}
      <header className="surface rounded-3xl p-6 gradient-border">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
          PJ-04 Phase B · Auto-generate
        </div>
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Wand2 size={20} className="text-aws-orange" /> Generate a Deep Walkthrough
        </h1>
        <p className="text-sm opacity-80 mt-1.5">
          Paste a project description OR pick services from the chips. The generator orders the steps correctly
          (network → security → storage → data → compute → integration → monitoring) and adds WHAT, WHY, analogy,
          common mistakes, and HOW in all 4 formats.
        </p>
      </header>

      {/* Form */}
      <section className="surface rounded-3xl p-6 space-y-4">
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5 block">
            Walkthrough title <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. SaaS billing API on Lambda + DynamoDB + Stripe webhooks"
            className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[14px] outline-none focus:border-aws-orange"
          />
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5 block">
            Project description (or paste a freelance job brief)
          </label>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder={`e.g.\n"Build a customer-facing chat app using API Gateway, Lambda, DynamoDB for chat history, Bedrock with Claude Haiku for responses, Cognito for user auth, and CloudFront for global edge delivery."\n\nThe more services you mention, the better the walkthrough.`}
            rows={7}
            className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[13.5px] outline-none focus:border-aws-orange font-mono"
          />
          {brief.length > 30 && detected.length > 0 && (
            <div className="mt-2 text-[11.5px] flex items-center gap-2 text-success">
              <CheckCircle2 size={12} />
              <span>
                <strong>{detected.length} service{detected.length === 1 ? '' : 's'}</strong> detected: {detected.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* AD-02: Service Suggestion Chips with popovers */}
        <div className="rounded-xl bg-[var(--card-2)]/30 border border-token p-3.5">
          <ServiceSuggestionChips
            brief={brief}
            selected={picked}
            onChange={setPicked}
          />
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5 block">
            Save into which category?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'manual', label: '✍ Manual / Custom' },
              { id: 'project', label: '🛠 My Projects' },
              { id: 'freelance', label: '💼 Freelance Jobs' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSource(s.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[12px] font-bold border transition',
                  source === s.id
                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                    : 'border-token text-muted hover:text-current'
                )}
              >{s.label}</button>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={handleGenerate} className="btn btn-primary inline-flex items-center gap-2">
            <Sparkles size={14} /> Generate walkthrough <ChevronRight size={12} />
          </button>
          <Link to="/walkthroughs/deep" className="btn btn-ghost">Cancel</Link>
        </div>

        {finalServices.length > 0 && (
          <div className="text-[11px] opacity-70 italic">
            Will generate {finalServices.length} step{finalServices.length === 1 ? '' : 's'} · estimated {Math.max(15, finalServices.length * 12)} min read · auto difficulty {finalServices.length <= 3 ? 'Beginner' : finalServices.length <= 6 ? 'Intermediate' : 'Advanced'}.
          </div>
        )}

        {/* AD-01: Live region suggestion preview */}
        <div className="text-[11.5px] flex items-center gap-2 flex-wrap pt-2 border-t border-token">
          <span className="opacity-70">🌍 Suggested AWS region:</span>
          <span className="px-2 py-0.5 rounded-full bg-success/15 text-success font-extrabold">
            {regionSuggestion.primary} — {(REGION_LABELS[regionSuggestion.primary] || '').split('(')[1]?.replace(')', '') || regionSuggestion.primary}
          </span>
          <span className="opacity-60">({regionSuggestion.confidence} confidence — you can change it on the walkthrough page)</span>
        </div>
      </section>
    </div>
  );
}
