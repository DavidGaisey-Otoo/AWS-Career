/**
 * ExplainDifferently.jsx — EX-26: the one thing a rule engine cannot do.
 *
 * The question bank already contains a correct explanation for every
 * question. What it cannot do is respond when that explanation doesn't land
 * — "I still don't see why B is wrong" has no rule to match against.
 *
 * This asks a locally-running model (Ollama) to re-express the SAME
 * explanation differently. It never asks the model to recall AWS facts; the
 * facts are supplied from the question and the system prompt forbids adding
 * any. See localLLM.js for why that constraint is the whole design.
 *
 * Renders nothing at all unless the user has switched local AI on in
 * Settings, so it stays invisible to anyone who hasn't opted in.
 */

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, AlertTriangle, Cpu } from 'lucide-react';
import { explainQuestion, isEnabled } from '../../lib/localLLM.js';
import { cn } from '../../lib/utils.js';

const STYLES = [
  { id: 'simpler',   label: 'Simpler',      hint: 'Plainer language' },
  { id: 'analogy',   label: 'Analogy',      hint: 'Everyday comparison' },
  { id: 'why-wrong', label: 'Why not the others', hint: 'What rules each out' },
];

export function ExplainDifferently({ question }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [streamed, setStreamed] = useState('');
  const [confusion, setConfusion] = useState('');
  const [style, setStyle] = useState('simpler');

  // Opt-in only — invisible unless local AI is switched on
  if (!isEnabled() || !question?.why) return null;

  async function run(nextStyle = style) {
    setBusy(true);
    setStyle(nextStyle);
    setResult(null);
    setStreamed('');
    // Tokens render as they arrive — a small local model can take 30-80s,
    // and watching text appear is a completely different experience from
    // watching a spinner for the same duration.
    const r = await explainQuestion({
      question,
      confusion,
      style: nextStyle,
      onToken: (_piece, full) => setStreamed(full),
    });
    setResult(r);
    setBusy(false);
  }

  return (
    <div className="p-3.5 border-t border-electric/20 bg-[var(--card-2)]/20">
      {!open ? (
        <button
          onClick={() => { setOpen(true); run(); }}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-electric hover:underline tap-44"
        >
          <Sparkles size={13} /> Still not clear? Explain it differently
        </button>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-electric flex items-center gap-1.5">
              <Cpu size={11} /> Local AI
            </div>
            <div className="flex flex-wrap gap-1">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => run(s.id)}
                  disabled={busy}
                  title={s.hint}
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition tap-44',
                    style === s.id
                      ? 'border-electric bg-electric/15 text-electric'
                      : 'border-token opacity-70 hover:opacity-100',
                    busy && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live stream while generating */}
          {busy && (
            streamed
              ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamed}
                  <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-electric animate-pulse" />
                </p>
              )
              : (
                <div className="flex items-center gap-2 text-[12px] opacity-80 py-2">
                  <Loader2 size={14} className="animate-spin text-electric" />
                  Loading the model… the first answer after a restart is the slowest.
                </div>
              )
          )}

          {result?.ok && (
            <>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.text}</p>
              <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] opacity-55">
                <span>
                  Generated on your machine by {result.model} in {(result.ms / 1000).toFixed(1)}s ·
                  grounded in the explanation above, not the model&apos;s own knowledge
                </span>
                <button onClick={() => run(style)} className="inline-flex items-center gap-1 font-bold hover:opacity-100 tap-44">
                  <RefreshCw size={10} /> Again
                </button>
              </div>
            </>
          )}

          {result && !result.ok && (
            <div className="flex items-start gap-2 text-[12px] text-warning">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>{result.error}</span>
            </div>
          )}

          {/* Ask about a specific confusion */}
          <div className="flex gap-1.5">
            <input
              type="text"
              value={confusion}
              onChange={(e) => setConfusion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy) run(style); }}
              placeholder="What specifically doesn't make sense?"
              className="flex-1 rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-1.5 text-[12px] outline-none focus:border-electric"
            />
            <button
              onClick={() => run(style)}
              disabled={busy}
              className={cn('btn btn-ghost !text-[11.5px] !py-1.5 tap-44', busy && 'opacity-40')}
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
