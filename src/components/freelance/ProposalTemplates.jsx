import { ClipboardCopy, Eye, Star } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { PROPOSAL_TEMPLATES } from '../../data/proposalTemplates.js';
import { cn } from '../../lib/utils.js';

/**
 * Template library — 12 proven proposal templates.
 * Each card opens a preview drawer with the editable sections and copy buttons.
 */
export function ProposalTemplates() {
  const [active, setActive] = useState(null);
  const toast = useToast();

  const onCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied — paste into Upwork/LinkedIn');
    } catch { toast.error('Could not copy'); }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {PROPOSAL_TEMPLATES.length} proven templates, by project type. Click any card to preview, edit, and copy.
        The <strong>Proposal Builder</strong> tab automatically picks the best one for a pasted JD.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PROPOSAL_TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t)}
            className="surface rounded-2xl p-4 text-left hover:border-aws-orange/40 transition focus-ring relative"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-2xl">{t.icon}</span>
              <span className="inline-flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={10}
                        className={i < t.rating ? 'text-aws-orange fill-aws-orange' : 'text-muted'} />
                ))}
              </span>
            </div>
            <h4 className="text-sm font-extrabold tracking-tight mt-2">{t.type}</h4>
            <p className="text-[11px] text-muted mt-1 line-clamp-2">{t.description}</p>
            <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              <Eye size={10} /> Preview
            </div>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setActive(null)} />
          <div className="relative surface rounded-3xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 gradient-border">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">{active.icon}</span>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold tracking-tight">{active.type}</h3>
                <p className="text-xs text-muted">{active.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {active.services?.map((s) => (
                    <span key={s} className="chip border border-token bg-[var(--card-2)] text-[10px] font-bold">{s}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => setActive(null)} className="text-muted hover:text-current p-1">✕</button>
            </div>

            <Section title="Opening hook"            text={active.hook} onCopy={onCopy} />
            <Section title="Relevant experience"    text={active.experience} onCopy={onCopy} />
            <Section title="My approach"            text={(active.approach || []).map((s, i) => `${i + 1}. ${s}`).join('\n')} onCopy={onCopy} />
            <Section title="Why I'm the right fit"  text={active.fit} onCopy={onCopy} />
            <Section title="Call to action"         text={active.cta} onCopy={onCopy} />

            <button
              onClick={() => onCopy(buildFullText(active))}
              className="btn btn-primary w-full mt-2"
            >
              <ClipboardCopy size={14} /> Copy entire template
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, text, onCopy }) {
  return (
    <div className="mb-3 rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">{title}</h4>
        <button onClick={() => onCopy(text)} className="text-muted hover:text-aws-orange" title="Copy section">
          <ClipboardCopy size={12} />
        </button>
      </div>
      <p className="text-xs leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function buildFullText(t) {
  return [
    t.hook,
    '',
    '**Relevant experience**',
    t.experience,
    '',
    '**My approach**',
    (t.approach || []).map((s, i) => `${i + 1}. ${s}`).join('\n'),
    '',
    '**Why I\'m the right fit**',
    t.fit,
    '',
    t.cta,
  ].join('\n');
}
