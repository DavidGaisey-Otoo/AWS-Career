/**
 * IdeaStudio.jsx — "describe anything, get an architecture + plan".
 *
 * Accepts text OR voice input (Web Speech API), routes through ideaEngine,
 * renders a structured proposal: architecture, services, build steps,
 * cost, alternatives, follow-up questions.
 *
 * Use cases:
 *   • "I have a client gig — they want X. What do I build?"
 *   • "I have a vague idea. Help me think it through."
 *   • Job descriptions pasted in raw.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2, Sparkles, Mic, MicOff, Send, Loader2, Layers, Cloud, ListChecks,
  AlertCircle, ArrowRight, ClipboardCopy, RefreshCw, MessageSquare, Lightbulb,
  CheckCircle2, DollarSign, Compass,
} from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';
import { describeIdea, KNOWN_SERVICES, RECIPE_NAMES } from '../lib/ideaEngine.js';

// Pre-built prompts to lower the blank-page friction
const EXAMPLES = [
  'A static portfolio site with my work and a contact form',
  'A REST API that stores user-submitted feedback',
  'A login + dashboard app where users can save their preferences',
  'Resize images uploaded by users and email them when ready',
  'A chatbot trained on my company PDFs (RAG)',
  'A scheduled job that scrapes a website every morning and emails a summary',
  'IoT sensor fleet sending temperature readings, dashboard for it',
  'Multi-vendor e-commerce shop with Stripe',
  'Real-time chat app with rooms',
  'Convert .doc files to PDF on upload',
];

export default function IdeaStudio() {
  const toast = useToast();
  const [input, setInput] = useState('');
  const [history, setHistory] = useLocalStorage(`${STORAGE_KEY}::idea-studio::history`, []);
  const [thinking, setThinking] = useState(false);
  // BF-03: guard against double-submission (rapid clicks, StrictMode re-fire)
  const submittingRef = useRef(false);

  // ─ Voice input (Web Speech API) ─
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const hasSpeech = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!hasSpeech) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (event) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t + ' ';
        else interim += t;
      }
      if (final) setInput((s) => (s ? s + ' ' : '') + final.trim());
      else if (interim) {
        // Show interim in a separate ref-less state? Simplest: append + replace.
      }
    };
    r.onerror = (e) => {
      console.warn('Speech recognition error:', e);
      setListening(false);
      if (e.error === 'not-allowed') toast.error('Microphone access denied. Allow it in your browser settings.');
    };
    r.onend = () => setListening(false);
    recognitionRef.current = r;
    return () => { try { r.stop(); } catch {} };
  }, [hasSpeech, toast]);

  function toggleVoice() {
    if (!hasSpeech) {
      toast.error('Voice input not supported in this browser. Try Chrome / Edge.');
      return;
    }
    const r = recognitionRef.current;
    if (!r) return;
    if (listening) {
      try { r.stop(); } catch {}
      setListening(false);
    } else {
      try {
        r.start();
        setListening(true);
        toast.info('Listening — speak your idea');
      } catch (err) {
        toast.error('Could not start voice input: ' + err.message);
      }
    }
  }

  function submit() {
    const q = input.trim();
    if (!q) return;
    // BF-03: re-entry guard — block double-fire from rapid clicks / StrictMode
    if (submittingRef.current || thinking) {
      console.warn('[IdeaStudio] Submit already in flight — ignoring duplicate');
      return;
    }
    submittingRef.current = true;
    setThinking(true);
    setTimeout(() => {
      try {
        const proposal = describeIdea(q);
        // BF-03: unique-enough ID — timestamp + random suffix prevents collisions
        // when two submits land in the same millisecond.
        const id = 'idea-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
        const entry = { id, input: q, proposal, at: new Date().toISOString() };
        // BF-03: dedupe — if an identical input was added in the last 5 seconds,
        // skip rather than create a duplicate row.
        setHistory((h) => {
          const recent = h[0];
          if (recent
              && recent.input?.trim().toLowerCase() === q.toLowerCase()
              && Date.now() - new Date(recent.at).getTime() < 5000) {
            console.warn('[IdeaStudio] Identical input within 5s — skipping duplicate entry');
            return h;
          }
          return [entry, ...h].slice(0, 30);
        });
        setInput('');
      } catch (err) {
        console.error('[IdeaStudio] submit failed:', err);
        toast.error('Could not generate — ' + (err.message || err));
      } finally {
        setThinking(false);
        submittingRef.current = false;
      }
    }, 350);
  }

  function onKey(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function clear() {
    if (confirm('Clear all idea history?')) setHistory([]);
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Input area */}
      <div className="rounded-3xl border border-token bg-[var(--card)] p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)] shrink-0">
            <MessageSquare size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <label className="text-sm font-bold">What do you want to build?</label>
            <p className="text-xs opacity-70 mt-0.5 mb-3">
              Type a description, paste a job/gig spec, or click the mic to speak. AWS-aware — but
              also handles general project ideation.
            </p>

            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="e.g. 'A platform where photographers can upload their portfolio and clients can book sessions'…"
                rows={4}
                className="w-full px-4 py-3 rounded-2xl bg-[var(--card-2)] border border-token focus:border-[var(--brand)] focus:outline-none text-sm leading-relaxed resize-y"
              />

              {listening && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-extrabold">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  REC
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Button variant="primary" icon={Send} onClick={submit} disabled={!input.trim() || thinking}>
                {thinking ? 'Thinking…' : 'Get a plan'}
              </Button>
              <Button
                variant={listening ? 'danger' : 'ghost'}
                icon={listening ? MicOff : Mic}
                onClick={toggleVoice}
                disabled={!hasSpeech}
                title={hasSpeech ? 'Speak your idea' : 'Voice input requires Chrome / Edge'}
              >
                {listening ? 'Stop' : 'Voice'}
              </Button>
              <span className="text-[10px] opacity-50 hidden sm:inline">Ctrl/⌘ + Enter to send</span>
              {history.length > 0 && (
                <button onClick={clear} className="ml-auto text-[11px] opacity-60 hover:opacity-100">
                  Clear history
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div className="mt-4 pt-4 border-t border-token">
          <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-60 mb-2 flex items-center gap-1.5">
            <Lightbulb size={11} /> Try one of these
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setInput(ex)}
                className="text-[11px] px-2.5 py-1 rounded-md border border-token bg-[var(--card-2)] hover:border-[var(--brand)]/40 hover:bg-[var(--brand)]/10 text-left transition"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* History — most recent first */}
      <AnimatePresence>
        {history.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <ProposalCard entry={entry} onReask={(t) => setInput(t)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {history.length === 0 && (
        <div className="rounded-2xl border border-token bg-[var(--card)] p-8 text-center">
          <Wand2 size={28} className="mx-auto opacity-30 mb-3" />
          <p className="text-sm opacity-70 max-w-md mx-auto">
            Your generated plans appear here. Pick an example above or type your own to get started.
            Currently {RECIPE_NAMES.length} recipe patterns recognised.
          </p>
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 size={18} className="text-[var(--brand)]" />
        <h1 className="text-2xl font-bold tracking-tight">Idea Studio</h1>
      </div>
      <p className="text-sm opacity-80 max-w-2xl">
        Type, paste, or <strong>speak</strong> what you want to build. I'll turn it into a structured
        proposal: architecture, AWS services, build steps, cost estimate, follow-up questions, and
        alternative designs. Works for client gigs, side projects, exam scenarios, anything.
      </p>
    </div>
  );
}

// ───────────── proposal card ─────────────

function ProposalCard({ entry, onReask }) {
  const toast = useToast();
  const p = entry.proposal;

  async function copyMarkdown() {
    const md = proposalToMarkdown(entry);
    try {
      await navigator.clipboard.writeText(md);
      toast.success('Plan copied to clipboard');
    } catch {
      toast.error('Copy blocked by browser');
    }
  }

  return (
    <div className="rounded-2xl border border-token bg-[var(--card)] overflow-hidden">
      {/* Original question */}
      <div className="px-5 py-3 bg-[var(--card-2)]/40 border-b border-token flex items-start gap-3">
        <MessageSquare size={14} className="text-[var(--brand)] shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-60 mb-0.5">
            You asked · {new Date(entry.at).toLocaleString()}
          </div>
          <p className="text-sm font-semibold">{entry.input}</p>
        </div>
        <button onClick={copyMarkdown} className="shrink-0 text-[10px] flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--card-2)]" title="Copy plan as Markdown">
          <ClipboardCopy size={10} /> Copy
        </button>
      </div>

      {/* Summary */}
      <div className="p-5 border-b border-token bg-gradient-to-br from-[var(--brand)]/5 via-transparent to-transparent">
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-[var(--brand)] shrink-0 mt-1" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-[var(--brand)] mb-1">
              Recommended approach
              {p.confidence != null && (
                <span className="ml-2 opacity-60 normal-case">· {Math.round(p.confidence * 100)}% match</span>
              )}
            </div>
            <h3 className="text-lg font-bold">{p.summary}</h3>
          </div>
        </div>
      </div>

      {/* Architecture */}
      {p.architecture && (
        <Section icon={Layers} title="Architecture">
          <p className="text-sm leading-relaxed font-mono bg-[var(--card-2)]/40 rounded-xl p-3 border border-token">
            {p.architecture}
          </p>
        </Section>
      )}

      {/* Services grid */}
      {p.services?.length > 0 && (
        <Section icon={Cloud} title={`AWS services (${p.services.length})`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {p.services.map((s) => (
              <div key={s.id || s.label} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
                <div className="text-sm font-bold flex items-center gap-1">
                  <Cloud size={11} className="text-[var(--brand)]" />
                  {s.label}
                </div>
                <p className="text-xs opacity-70 mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Build steps */}
      {p.buildSteps?.length > 0 && (
        <Section icon={ListChecks} title="Build steps">
          <ol className="space-y-2">
            {p.buildSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-gradient-aws text-ink-950 grid place-items-center font-extrabold text-[10px]">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Cost */}
      {p.cost && (
        <Section icon={DollarSign} title="Cost estimate">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
              <div className="text-[10px] uppercase tracking-widest opacity-60">Typical</div>
              <div className="text-lg font-bold">{p.cost.typical != null ? `$${p.cost.typical}/mo` : '—'}</div>
            </div>
            <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
              <div className="text-[10px] uppercase tracking-widest opacity-60">Max</div>
              <div className="text-lg font-bold">{p.cost.max != null ? `$${p.cost.max}/mo` : '—'}</div>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-success">Free tier</div>
              <div className="text-xs mt-1">{p.cost.free || '—'}</div>
            </div>
          </div>
        </Section>
      )}

      {/* Compliance frameworks (HIPAA / GDPR / PCI / etc.) */}
      {p.compliance?.length > 0 && (
        <Section icon={AlertCircle} title="Compliance frameworks that apply" tone="warning">
          <div className="flex flex-wrap gap-1.5">
            {p.compliance.map((c, i) => (
              <span key={i} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-warning/15 text-warning border border-warning/30">
                {c}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Considerations — domain-specific safety / compliance hints */}
      {p.considerations?.length > 0 && (
        <Section icon={AlertCircle} title="Critical considerations — read these before you build" tone="warning">
          <ul className="space-y-2">
            {p.considerations.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 mt-1 w-5 h-5 rounded-full bg-warning/15 border border-warning/40 text-warning text-[10px] font-extrabold grid place-items-center">
                  {i + 1}
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Alternatives */}
      {p.alternatives?.length > 0 && (
        <Section icon={Compass} title="Alternative designs">
          <div className="space-y-2">
            {p.alternatives.map((alt) => (
              <button
                key={alt.name}
                onClick={() => onReask?.(`${alt.name} — ${alt.blurb}`)}
                className="w-full text-left rounded-xl border border-token bg-[var(--card-2)]/40 p-3 hover:border-[var(--brand)]/40 transition"
              >
                <div className="text-sm font-bold flex items-center justify-between">
                  <span>{alt.name}</span>
                  <ArrowRight size={12} className="opacity-50" />
                </div>
                <p className="text-xs opacity-70 mt-1">{alt.blurb}</p>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Follow-ups */}
      {p.followUps?.length > 0 && (
        <Section icon={AlertCircle} title="Questions to refine the design" tone="electric">
          <ol className="space-y-1.5">
            {p.followUps.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-electric mt-0.5">›</span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Footer — actions */}
      <div className="px-5 py-3 border-t border-token flex items-center gap-2 flex-wrap bg-[var(--card-2)]/30">
        <Link to="/project-builder">
          <Button variant="primary" size="sm" icon={Wand2}>Promote to Project Builder</Button>
        </Link>
        <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => onReask?.(entry.input)}>
          Re-ask
        </Button>
        <Button variant="ghost" size="sm" icon={ClipboardCopy} onClick={copyMarkdown}>
          Copy plan
        </Button>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, tone = 'default', children }) {
  const toneCls = tone === 'electric' ? 'border-electric/30 bg-electric/[0.04]' : 'border-token';
  return (
    <div className={`px-5 py-4 border-b last:border-b-0 ${toneCls}`}>
      <div className="text-[10px] uppercase tracking-widest font-extrabold opacity-60 mb-2 flex items-center gap-1.5">
        <Icon size={11} className="text-[var(--brand)]" />
        {title}
      </div>
      {children}
    </div>
  );
}

// ───────────── helpers ─────────────

function proposalToMarkdown(entry) {
  const p = entry.proposal;
  const lines = [];
  lines.push(`# Idea Studio plan — ${new Date(entry.at).toLocaleString()}`);
  lines.push('');
  lines.push('## Original idea');
  lines.push('');
  lines.push(`> ${entry.input}`);
  lines.push('');
  lines.push('## Recommended approach');
  lines.push('');
  lines.push(p.summary);
  lines.push('');
  if (p.architecture) {
    lines.push('## Architecture');
    lines.push('');
    lines.push('```');
    lines.push(p.architecture);
    lines.push('```');
    lines.push('');
  }
  if (p.services?.length) {
    lines.push('## AWS services');
    lines.push('');
    for (const s of p.services) lines.push(`- **${s.label}** — ${s.desc}`);
    lines.push('');
  }
  if (p.buildSteps?.length) {
    lines.push('## Build steps');
    lines.push('');
    p.buildSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
    lines.push('');
  }
  if (p.cost) {
    lines.push('## Cost');
    lines.push('');
    lines.push(`- Typical: ${p.cost.typical != null ? '$' + p.cost.typical + '/mo' : '—'}`);
    lines.push(`- Max: ${p.cost.max != null ? '$' + p.cost.max + '/mo' : '—'}`);
    lines.push(`- Free tier: ${p.cost.free || '—'}`);
    lines.push('');
  }
  if (p.compliance?.length) {
    lines.push('## Compliance frameworks');
    lines.push('');
    for (const c of p.compliance) lines.push(`- ${c}`);
    lines.push('');
  }
  if (p.considerations?.length) {
    lines.push('## Critical considerations');
    lines.push('');
    p.considerations.forEach((c, i) => lines.push(`${i + 1}. ${c}`));
    lines.push('');
  }
  if (p.followUps?.length) {
    lines.push('## Follow-up questions');
    lines.push('');
    for (const q of p.followUps) lines.push(`- ${q}`);
    lines.push('');
  }
  return lines.join('\n');
}
