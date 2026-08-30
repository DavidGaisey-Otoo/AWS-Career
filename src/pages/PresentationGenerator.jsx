import { motion } from 'framer-motion';
import {
  AlertCircle, ChevronLeft, ChevronRight, ClipboardCopy, Download,
  Edit3, ExternalLink, FileText, Layers, Maximize2, Minimize2,
  Monitor, Play, Plus, Presentation as PresentationIcon, Printer,
  RefreshCw, Save, Sparkles, Trash2, X, Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { PresentationReviewPanel } from '../components/presentation-review/PresentationReviewPanel.jsx';
import { useAI } from '../context/AIContext.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { openPrintable } from '../lib/printableHtml.js';
import { CATEGORY_COLOR, getServiceDef } from '../data/archStudio.js';
import {
  DEFAULT_BRAND, SLIDE_KINDS, buildDeck, regenerateSlide,
} from '../data/presentation.js';
import { cn } from '../lib/utils.js';

const NODE_W = 110;
const NODE_H = 44;

export default function PresentationGenerator() {
  const [params] = useSearchParams();
  const toast = useToast();
  const dialog = useDialog();
  const { profile } = useApp();
  const { state: aiState } = useAI();
  const { state: earnState, saveDeck, deleteDeck } = useEarn();

  const [activeDeckId, setActiveDeckId] = useState(null);
  const activeDeck = earnState.decks.find((d) => d.id === activeDeckId) || null;
  const lastAnalysis = earnState.lastAnalysis;

  const [brief, setBrief] = useState(() => seedBrief(profile, lastAnalysis, params));
  const [slides, setSlides] = useState([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [presentMode, setPresentMode] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  // Pick the most-recent diagram from AIContext to embed in slide 4.
  const diagram = useMemo(() => {
    if (!aiState?.diagrams?.length) return null;
    const d = aiState.diagrams[aiState.diagrams.length - 1];
    return { name: d.name, nodes: d.nodes, edges: d.edges };
  }, [aiState]);

  // Load saved deck
  useEffect(() => {
    if (activeDeck) {
      setBrief(activeDeck.brief);
      setSlides(activeDeck.slides);
      setActiveSlideIdx(0);
    }
  }, [activeDeck?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When a fresh Job Analyzer result lands and we have no active deck +
  // no slides yet, fold the analysis into the brief.
  useEffect(() => {
    if (!lastAnalysis || activeDeck || slides.length > 0) return;
    setBrief((b) => ({
      ...b,
      projectTitle:  b.projectTitle  || lastAnalysis.suggestedName   || '',
      clientCompany: b.clientCompany || lastAnalysis.suggestedClient || '',
      services:      (lastAnalysis.analysis?.services || []).map((s) => s.toUpperCase()),
      budget:        b.budget        || (lastAnalysis.analysis?.budget?.kind === 'fixed'
                                          ? lastAnalysis.analysis.budget.amount : b.budget),
      hourlyRate:    b.hourlyRate    || (lastAnalysis.analysis?.budget?.kind === 'hourly'
                                          ? (lastAnalysis.analysis.budget.max || lastAnalysis.analysis.budget.min) : b.hourlyRate),
      budgetKind:    lastAnalysis.analysis?.budget?.kind === 'hourly' ? 'hourly' : 'fixed',
      timelineDays:  b.timelineDays  || estimateDays(lastAnalysis.analysis?.timeline) || 21,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAnalysis?.at]);

  // Keyboard nav in present mode
  useEffect(() => {
    if (!presentMode) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        setActiveSlideIdx((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setActiveSlideIdx((i) => Math.max(0, i - 1));
      } else if (e.key === 'Escape') {
        setPresentMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentMode, slides.length]);

  const generate = () => {
    const deck = buildDeck(brief, diagram);
    setSlides(deck.slides);
    setActiveSlideIdx(0);
    toast.success('Deck generated — 10 slides ready.');
  };

  const save = () => {
    if (!slides.length) {
      toast.error('Generate the deck before saving.');
      return;
    }
    const id = activeDeckId || (activeDeck?.id);
    const deck = {
      id: id || undefined,
      name: brief.projectTitle
        ? `${brief.clientCompany || 'Client'} — ${brief.projectTitle}`
        : 'Untitled deck',
      brief,
      slides,
      brand: { ...DEFAULT_BRAND },
      createdAt: activeDeck?.createdAt || new Date().toISOString(),
    };
    // saveDeck needs an id — generate one if new
    const finalDeck = { ...deck, id: deck.id || crypto.randomUUID?.() || 'd-' + Date.now() };
    saveDeck(finalDeck);
    setActiveDeckId(finalDeck.id);
    toast.success('Saved');
  };

  const updateSlide = (idx, patch) => {
    setSlides((arr) => arr.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const regenOne = (idx) => {
    setSlides((arr) => arr.map((s, i) => i === idx ? regenerateSlide(s, brief, diagram) : s));
    toast.success('Slide regenerated');
  };

  const exportPDF = () => {
    if (!slides.length) { toast.error('Generate the deck first.'); return; }
    // Render the deck as a properly formatted document, slide-by-slide.
    const md = slides.map((s, i) => {
      const parts = [];
      parts.push(`## ${i + 1}. ${s.title}`);
      if (s.body) parts.push(s.body);
      if (s.bullets?.length) parts.push(s.bullets.map((b) => `- ${b}`).join('\n'));
      // Extras per slide kind
      if (s.kind === 'plan' && s.extras?.phases) {
        parts.push(s.extras.phases.map((p) =>
          `- **${p.title}** _(${p.range})_ — ${p.deliverables.join(' · ')}`
        ).join('\n'));
      }
      if (s.kind === 'investment' && s.extras?.schedule) {
        parts.push('\n| Milestone | Amount |');
        parts.push('|---|---|');
        parts.push(s.extras.schedule.map((m) => `| ${m.label} | ${brief.currency || 'USD'} ${m.amount.toLocaleString()} |`).join('\n'));
        if (s.extras.included?.length) parts.push('\n**Included:** ' + s.extras.included.join(' · '));
        if (s.extras.excluded?.length) parts.push('\n**Not included:** ' + s.extras.excluded.join(' · '));
      }
      if (s.kind === 'next' && s.extras?.eta) {
        parts.push(`\n> **Expected delivery:** ${s.extras.eta}`);
      }
      if (s.notes) parts.push(`\n_Speaker note: ${s.notes}_`);
      return parts.join('\n\n');
    }).join('\n\n---\n\n');

    openPrintable({
      documentType: 'Proposal',
      title: brief.projectTitle || 'Project proposal',
      subtitle: brief.clientCompany || '',
      markdown: md,
      meta: [
        { label: 'Prepared for', value: [brief.clientContact, brief.clientCompany].filter(Boolean).join(' · ') },
        { label: 'Project',      value: brief.projectTitle || '—' },
        { label: 'Timeline',     value: `${brief.timelineDays || 21} days` },
        { label: 'Investment',   value: brief.budgetKind === 'hourly'
            ? `${brief.currency || 'USD'} ${brief.hourlyRate}/hour`
            : `${brief.currency || 'USD'} ${(brief.budget || 0).toLocaleString()} fixed` },
      ],
      authorName: brief.authorName || profile?.name || 'AWS Cloud Engineer',
      authorCompany: '',
    });
  };

  const exportPptx = () => {
    // .pptx requires a real builder; ship a portable markdown that PowerPoint
    // can import via outline view (File → Open → outline). Works offline.
    const md = slides.map((s, i) => {
      return `# ${i + 1}. ${s.title}\n\n${s.body || ''}\n\n${(s.bullets || []).map((b) => `- ${b}`).join('\n')}`;
    }).join('\n\n');
    download(`${(brief.projectTitle || 'deck').replace(/\s+/g, '_')}.md`, md, 'text/markdown');
    toast.success('Exported outline (.md) — PowerPoint will import via File → Open → Outline');
  };

  const shareLink = async () => {
    if (!slides.length) { toast.error('Generate the deck first.'); return; }
    try {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, brief, slides }))));
      const url = new URL(window.location.href);
      url.searchParams.set('deck', payload);
      await navigator.clipboard.writeText(url.toString());
      toast.success('Share link copied');
    } catch {
      toast.error('Share failed');
    }
  };

  const newDeck = () => {
    setActiveDeckId(null);
    setSlides([]);
    setActiveSlideIdx(0);
  };

  if (presentMode && slides.length > 0) {
    return (
      <PresentMode
        slides={slides}
        brief={brief}
        diagram={diagram}
        idx={activeSlideIdx}
        setIdx={setActiveSlideIdx}
        onExit={() => setPresentMode(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Presentation Generator"
        title="Client-ready proposal deck in 30 seconds."
        subtitle="Fill the brief, hit generate. We assemble a 10-slide deck — title, problem, solution, architecture, plan, testing, investment, about, next steps. Edit any slide inline, regenerate per slide, present full-screen, export PDF / PowerPoint outline."
        icon={PresentationIcon}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={newDeck} className="btn btn-ghost !text-xs"><Plus size={12} /> New</button>
            <button onClick={save} className="btn btn-primary !text-xs"><Save size={12} /> Save</button>
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        {/* LEFT — brief form + saved decks */}
        <div className="space-y-3">
          <BriefForm brief={brief} setBrief={setBrief} onGenerate={generate} diagram={diagram} lastAnalysis={lastAnalysis} />
          <SavedDecksList
            decks={earnState.decks}
            activeId={activeDeckId}
            onPick={setActiveDeckId}
            onDelete={async (id) => {
              const ok = await dialog.confirm({
                title: 'Delete this deck?',
                description: earnState.decks.find((d) => d.id === id)?.name,
                danger: true,
              });
              if (ok) { deleteDeck(id); if (id === activeDeckId) newDeck(); }
            }}
          />
        </div>

        {/* RIGHT — slide editor */}
        <div className="space-y-3">
          {slides.length === 0 ? (
            <EmptyDeck />
          ) : (
            <>
              <DeckToolbar
                slides={slides}
                idx={activeSlideIdx}
                onPick={setActiveSlideIdx}
                onPresent={() => setPresentMode(true)}
                onPDF={exportPDF}
                onPptx={exportPptx}
                onShare={shareLink}
              />
              <SlideEditor
                slide={slides[activeSlideIdx]}
                idx={activeSlideIdx}
                total={slides.length}
                diagram={diagram}
                brief={brief}
                onChange={(patch) => updateSlide(activeSlideIdx, patch)}
                onRegen={() => regenOne(activeSlideIdx)}
                editingNotes={editingNotes}
                setEditingNotes={setEditingNotes}
              />
              <PresentationReviewPanel slides={slides} brief={brief} audience="client" />

              <div className="flex items-center justify-between text-[11px] text-muted">
                <button
                  onClick={() => setActiveSlideIdx(Math.max(0, activeSlideIdx - 1))}
                  className="btn btn-ghost !text-[11px]"
                  disabled={activeSlideIdx === 0}
                >
                  <ChevronLeft size={11} /> Previous
                </button>
                <span>{activeSlideIdx + 1} of {slides.length}</span>
                <button
                  onClick={() => setActiveSlideIdx(Math.min(slides.length - 1, activeSlideIdx + 1))}
                  className="btn btn-ghost !text-[11px]"
                  disabled={activeSlideIdx === slides.length - 1}
                >
                  Next <ChevronRight size={11} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =================================================================
// Empty state
// =================================================================

function EmptyDeck() {
  return (
    <div className="surface rounded-2xl p-12 text-center space-y-3">
      <div className="w-16 h-16 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
        <Wand2 size={26} strokeWidth={2.5} />
      </div>
      <h3 className="text-lg font-extrabold">Fill the brief, hit Generate.</h3>
      <p className="text-[12px] text-muted max-w-md mx-auto leading-relaxed">
        Your 10-slide deck will appear here. Each slide is editable inline, you can regenerate one slide at a time, and presentation mode runs fullscreen with arrow-key navigation.
      </p>
    </div>
  );
}

// =================================================================
// Saved decks list
// =================================================================

function SavedDecksList({ decks, activeId, onPick, onDelete }) {
  return (
    <div className="surface rounded-2xl p-4">
      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
        Saved decks ({decks.length})
      </h3>
      {decks.length === 0 ? (
        <p className="text-[11px] text-muted">Saved decks will appear here.</p>
      ) : (
        <ul className="space-y-1">
          {decks.map((d) => (
            <li key={d.id} className="group flex items-center gap-1">
              <button
                onClick={() => onPick(d.id)}
                className={cn(
                  'flex-1 text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition truncate',
                  d.id === activeId && 'bg-aws-orange/10 text-aws-orange font-bold',
                )}
              >{d.name}</button>
              <button
                onClick={() => onDelete(d.id)}
                className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
              ><Trash2 size={11} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// =================================================================
// Brief form
// =================================================================

function BriefForm({ brief, setBrief, onGenerate, diagram, lastAnalysis }) {
  const setField = (k) => (e) => setBrief((b) => ({ ...b, [k]: e.target.value }));
  return (
    <div className="surface rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2 mb-1">
        <FileText size={14} className="text-aws-orange" /> Project brief
      </h3>

      {lastAnalysis && (
        <div className="rounded-lg border border-aws-orange/30 bg-aws-orange/5 px-2.5 py-1.5 flex items-center gap-1.5 text-[10px]">
          <Sparkles size={11} className="text-aws-orange shrink-0" />
          <span>
            Auto-filled from your last <Link to="/job-analyzer" className="font-bold text-aws-orange hover:underline">Job Analyzer</Link> run
            {' · '}
            <span className="text-muted">{new Date(lastAnalysis.at).toLocaleString()}</span>
          </span>
        </div>
      )}

      <Group label="Client">
        <Field label="Client contact"  value={brief.clientContact}  onChange={setField('clientContact')}  placeholder="e.g. Sarah Lin" />
        <Field label="Client company"  value={brief.clientCompany}  onChange={setField('clientCompany')}  placeholder="e.g. Northwind Fintech" />
      </Group>

      <Group label="The project">
        <Field label="Project title"   value={brief.projectTitle}   onChange={setField('projectTitle')}   placeholder="e.g. AWS Landing Zone migration" />
        <Textarea label="Their problem" value={brief.problem} onChange={setField('problem')}
          placeholder="One paragraph the client would actually say." rows={3} />
        <Textarea label="Your solution" value={brief.solution} onChange={setField('solution')}
          placeholder="Plain English. No jargon." rows={3} />
      </Group>

      <Group label="Commercials">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Currency" value={brief.currency} onChange={setField('currency')} placeholder="USD" />
          <Field label="Total budget" type="number" value={brief.budget} onChange={setField('budget')} placeholder="3000" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Hourly rate" type="number" value={brief.hourlyRate} onChange={setField('hourlyRate')} placeholder="85" />
          <Field label="Estimated hours" type="number" value={brief.estimatedHours} onChange={setField('estimatedHours')} placeholder="40" />
        </div>
        <Field label="Delivery timeline (days)" type="number" value={brief.timelineDays} onChange={setField('timelineDays')} placeholder="21" />
      </Group>

      <Group label="About you">
        <Field label="Your name"     value={brief.authorName} onChange={setField('authorName')} placeholder="Your full name" />
        <Field label="Your email"    value={brief.authorEmail} onChange={setField('authorEmail')} placeholder="you@example.com" />
        <Field label="Tagline"       value={brief.tagline}    onChange={setField('tagline')}    placeholder="AWS Cloud Engineer | Network Specialist" />
      </Group>

      {!diagram && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-[10px] leading-relaxed flex items-start gap-1.5">
          <AlertCircle size={11} className="text-warning shrink-0 mt-0.5" />
          <span>No saved diagram found in Architecture Studio. Slide 4 will show a placeholder — generate a diagram in <Link to="/architecture" className="font-bold text-aws-orange hover:underline">Architecture Studio</Link> first for the best result.</span>
        </div>
      )}

      <button onClick={onGenerate} className="btn btn-primary w-full !text-xs mt-2">
        <Sparkles size={12} /> Generate presentation
      </button>
    </div>
  );
}

function Group({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[9px] font-extrabold uppercase tracking-widest text-muted">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Field({ label, value = '', onChange, placeholder, type = 'text' }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
      />
    </label>
  );
}

function Textarea({ label, value = '', onChange, placeholder, rows = 3 }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-muted">{label}</span>
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
      />
    </label>
  );
}

// =================================================================
// Deck toolbar
// =================================================================

function DeckToolbar({ slides, idx, onPick, onPresent, onPDF, onPptx, onShare }) {
  return (
    <div className="surface rounded-2xl p-2 flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1 overflow-x-auto max-w-full">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onPick(i)}
            className={cn(
              'rounded-md px-2 py-1 text-[10px] font-bold whitespace-nowrap border transition',
              i === idx
                ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40'
                : 'border-token text-muted hover:text-current',
            )}
          >{i + 1}. {SLIDE_KINDS.find((k) => k.id === s.kind)?.label || s.kind}</button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <button onClick={onPDF}     className="btn btn-ghost !text-[11px]"><Printer size={11} /> PDF</button>
        <button onClick={onPptx}    className="btn btn-ghost !text-[11px]"><Download size={11} /> Outline</button>
        <button onClick={onShare}   className="btn btn-ghost !text-[11px]"><ExternalLink size={11} /> Share</button>
        <button onClick={onPresent} className="btn btn-primary !text-[11px]"><Play size={11} /> Present</button>
      </div>
    </div>
  );
}

// =================================================================
// Slide editor (renders different layouts per slide.kind)
// =================================================================

function SlideEditor({ slide, idx, total, diagram, brief, onChange, onRegen, editingNotes, setEditingNotes }) {
  return (
    <div className="surface rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-token bg-[var(--card-2)]/40">
        <div className="flex items-center gap-2">
          <span className="chip border border-aws-orange/40 text-aws-orange font-bold text-[10px]">
            {idx + 1} / {total}
          </span>
          <span className="text-xs font-extrabold">{SLIDE_KINDS.find((k) => k.id === slide.kind)?.label || slide.kind}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onRegen} className="btn btn-ghost !text-[11px]">
            <RefreshCw size={11} /> Regenerate slide
          </button>
        </div>
      </div>

      <div className="p-4">
        <SlideView slide={slide} diagram={diagram} brief={brief} editable onChange={onChange} />
      </div>

      <div className="border-t border-token px-3 py-2 bg-[var(--card-2)]/30 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Speaker notes</span>
          <button onClick={() => setEditingNotes((v) => !v)} className="text-[10px] font-bold text-aws-orange hover:underline">
            {editingNotes ? 'Done' : 'Edit'}
          </button>
        </div>
        {editingNotes ? (
          <textarea
            value={slide.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={3}
            className="w-full bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-[11px] focus-ring focus:border-aws-orange resize-y"
          />
        ) : (
          <p className="text-[11px] text-muted leading-relaxed whitespace-pre-wrap">
            {slide.notes || '— No notes yet —'}
          </p>
        )}
      </div>
    </div>
  );
}

// =================================================================
// Slide view (read-only or editable)
// =================================================================

function SlideView({ slide, diagram, brief, editable, onChange, fullScreen }) {
  const renderers = {
    title:         TitleSlide,
    understanding: BulletedSlide,
    solution:      BulletedSlide,
    architecture:  ArchitectureSlide,
    why:           BulletedSlide,
    plan:          PlanSlide,
    testing:       BulletedSlide,
    investment:    InvestmentSlide,
    about:         AboutSlide,
    next:          NextStepsSlide,
  };
  const Renderer = renderers[slide.kind] || BulletedSlide;
  return (
    <Renderer
      slide={slide}
      diagram={diagram}
      brief={brief}
      editable={editable}
      fullScreen={fullScreen}
      onChange={onChange || (() => {})}
    />
  );
}

function EditableTitle({ value, onChange, editable, className }) {
  if (!editable) return <h2 className={className}>{value}</h2>;
  return (
    <input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={cn('bg-transparent border-b border-transparent hover:border-aws-orange/40 focus-ring focus:border-aws-orange focus:outline-none w-full', className)}
    />
  );
}

function EditableBody({ value, onChange, editable, rows = 3, className }) {
  if (!editable) return <p className={className}>{value}</p>;
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className={cn('bg-transparent border border-transparent hover:border-aws-orange/40 focus-ring focus:border-aws-orange focus:outline-none w-full resize-y', className)}
    />
  );
}

function BulletsEditor({ items, onChange, editable, className }) {
  if (!editable) {
    return (
      <ul className={cn('space-y-1.5', className)}>
        {(items || []).map((b, i) => <li key={i}>• {b}</li>)}
      </ul>
    );
  }
  return (
    <div className={cn('space-y-1', className)}>
      {(items || []).map((b, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="text-aws-orange">•</span>
          <input
            value={b}
            onChange={(e) => onChange(items.map((x, j) => j === i ? e.target.value : x))}
            className="flex-1 bg-transparent border-b border-transparent hover:border-aws-orange/40 focus:border-aws-orange focus:outline-none text-sm"
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="grid place-items-center w-5 h-5 text-muted hover:text-danger"
          ><X size={10} /></button>
        </div>
      ))}
      <button
        onClick={() => onChange([...(items || []), 'New bullet'])}
        className="text-[10px] font-bold text-aws-orange hover:underline mt-1"
      >+ add bullet</button>
    </div>
  );
}

// ----------- per-kind slide layouts -----------

function TitleSlide({ slide, editable, onChange, fullScreen }) {
  return (
    <div className={cn('rounded-xl p-8 bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white space-y-4', fullScreen && 'h-full flex flex-col justify-center')}>
      <EditableTitle
        value={slide.title}
        onChange={(t) => onChange({ title: t })}
        editable={editable}
        className="text-4xl md:text-5xl font-black tracking-tight"
      />
      <p className="text-aws-orange font-extrabold uppercase tracking-widest text-xs">
        {slide.extras?.authorName || 'Your name'}
      </p>
      {slide.extras?.certs?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {slide.extras.certs.map((c) => (
            <span key={c} className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange font-bold text-[10px]">{c}</span>
          ))}
        </div>
      )}
      <EditableBody
        value={slide.body}
        onChange={(t) => onChange({ body: t })}
        editable={editable}
        rows={2}
        className="text-base text-white/80 italic mt-4"
      />
      <div className="text-xs text-white/50 pt-3">
        {(slide.bullets || []).slice(0, 3).join(' · ')}
      </div>
    </div>
  );
}

function BulletedSlide({ slide, editable, onChange, fullScreen }) {
  return (
    <div className={cn('rounded-xl bg-[var(--card-2)]/40 p-6 space-y-4', fullScreen && 'h-full')}>
      <EditableTitle
        value={slide.title}
        onChange={(t) => onChange({ title: t })}
        editable={editable}
        className="text-2xl md:text-3xl font-black tracking-tight"
      />
      <EditableBody
        value={slide.body}
        onChange={(t) => onChange({ body: t })}
        editable={editable}
        rows={2}
        className="text-base text-muted leading-relaxed"
      />
      <BulletsEditor
        items={slide.bullets}
        onChange={(b) => onChange({ bullets: b })}
        editable={editable}
        className="text-base"
      />
      {slide.extras?.impact && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <span className="font-bold text-warning">Business impact:</span> {slide.extras.impact}
        </div>
      )}
      {slide.extras?.whyAWS && (
        <div className="rounded-lg border border-aws-orange/30 bg-aws-orange/10 p-3 text-sm">
          <span className="font-bold text-aws-orange">Why AWS:</span> {slide.extras.whyAWS}
        </div>
      )}
      {slide.extras?.banner && (
        <div className="rounded-lg bg-gradient-aws text-ink-950 p-3 text-center font-extrabold">
          {slide.extras.banner}
        </div>
      )}
    </div>
  );
}

function ArchitectureSlide({ slide, diagram, editable, onChange, fullScreen }) {
  return (
    <div className={cn('rounded-xl bg-[var(--card-2)]/40 p-6 space-y-3', fullScreen && 'h-full')}>
      <div className="flex items-center justify-between gap-2">
        <EditableTitle
          value={slide.title}
          onChange={(t) => onChange({ title: t })}
          editable={editable}
          className="text-2xl font-black"
        />
        <span className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange font-bold text-[10px]">
          {slide.extras?.waBadge || 'Well-Architected'}
        </span>
      </div>
      <EditableBody
        value={slide.body}
        onChange={(t) => onChange({ body: t })}
        editable={editable}
        rows={1}
        className="text-sm text-muted"
      />
      <div className="rounded-lg border border-token bg-[var(--card)] p-3 min-h-[260px] flex items-center justify-center">
        {diagram?.nodes?.length ? (
          <DiagramRender nodes={diagram.nodes} edges={diagram.edges} />
        ) : (
          <div className="text-center text-muted text-sm">
            <Layers size={26} className="mx-auto mb-2 text-aws-orange/60" />
            <p className="font-bold">No diagram bound to this deck</p>
            <p className="text-[11px] mt-1">Open <Link to="/architecture" className="text-aws-orange font-bold underline">Architecture Studio</Link> and save a diagram — slide 4 will use the most recent one.</p>
          </div>
        )}
      </div>
      <BulletsEditor
        items={slide.bullets}
        onChange={(b) => onChange({ bullets: b })}
        editable={editable}
        className="text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4"
      />
    </div>
  );
}

function DiagramRender({ nodes, edges }) {
  // Compute extents
  const xs = nodes.map((n) => n.x); const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - NODE_W; const maxX = Math.max(...xs) + NODE_W;
  const minY = Math.min(...ys) - NODE_H; const maxY = Math.max(...ys) + NODE_H;
  const W = maxX - minX + 40;
  const H = maxY - minY + 40;
  return (
    <svg viewBox={`${minX - 20} ${minY - 20} ${W} ${H}`} className="w-full max-h-[260px]">
      <defs>
        <marker id="dk-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#FF9900" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = nodes.find((n) => n.id === e.from);
        const b = nodes.find((n) => n.id === e.to);
        if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y;
        const norm = Math.sqrt(dx * dx + dy * dy) || 1;
        const ox = (dx / norm) * (NODE_W / 2);
        const oy = (dy / norm) * (NODE_H / 2);
        return (
          <path
            key={i}
            d={`M ${a.x + ox} ${a.y + oy} L ${b.x - ox} ${b.y - oy}`}
            stroke={e.dashed ? '#94A3B8' : '#FF9900'}
            strokeDasharray={e.dashed ? '4 4' : undefined}
            strokeWidth={1.6}
            fill="none"
            markerEnd="url(#dk-arr)"
          />
        );
      })}
      {nodes.map((n) => {
        const def = getServiceDef(n.serviceId);
        if (!def) return null;
        const color = CATEGORY_COLOR[def.category];
        return (
          <g key={n.id} transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}>
            <rect width={NODE_W} height={NODE_H} rx={8} fill="var(--card)" stroke={color} strokeWidth={1.4} />
            <text x={10} y={NODE_H / 2 + 2} style={{ fontSize: 16 }}>{def.icon}</text>
            <text x={32} y={NODE_H / 2 + 4} style={{ fontSize: 10, fontWeight: 800, fill: 'var(--text)' }}>{def.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function PlanSlide({ slide, editable, onChange }) {
  const phases = slide.extras?.phases || [];
  return (
    <div className="rounded-xl bg-[var(--card-2)]/40 p-6 space-y-4">
      <EditableTitle
        value={slide.title}
        onChange={(t) => onChange({ title: t })}
        editable={editable}
        className="text-2xl font-black"
      />
      <p className="text-sm text-muted">{slide.body}</p>
      <div className="space-y-2">
        {phases.map((p, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{p.title} <span className="text-muted">({p.range})</span></span>
              <span className="text-aws-orange">{p.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--card)] overflow-hidden">
              <div
                className={cn('h-full', i === 0 ? 'bg-aws-orange/80' : i === 1 ? 'bg-cyan-400/70' : 'bg-emerald-400/70')}
                style={{ width: `${p.pct}%` }}
              />
            </div>
            <ul className="text-[12px] text-muted pl-3 list-disc">
              {p.deliverables.map((d, j) => <li key={j}>{d}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestmentSlide({ slide, editable, onChange }) {
  const fmt = (n) => slide.extras?.currency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: slide.extras.currency, maximumFractionDigits: 0 }).format(n)
    : `$${n.toLocaleString()}`;
  return (
    <div className="rounded-xl bg-[var(--card-2)]/40 p-6 space-y-4">
      <EditableTitle
        value={slide.title}
        onChange={(t) => onChange({ title: t })}
        editable={editable}
        className="text-2xl font-black"
      />
      <div className="rounded-lg p-6 text-center bg-gradient-to-br from-aws-orange/20 to-aws-orange/5 border border-aws-orange/30">
        <div className="text-4xl md:text-5xl font-black text-gradient">{slide.body}</div>
      </div>
      {slide.extras?.schedule && (
        <div className="grid sm:grid-cols-2 gap-2">
          {slide.extras.schedule.map((s, i) => (
            <div key={i} className="rounded-lg border border-token p-3">
              <div className="text-[10px] uppercase text-muted font-extrabold">{s.label}</div>
              <div className="text-xl font-black tabular-nums">{fmt(s.amount)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase text-success mb-1">Included</div>
          <ul className="text-[12px] space-y-0.5">
            {(slide.extras?.included || []).map((x, i) => <li key={i}>✓ {x}</li>)}
          </ul>
        </div>
        <div>
          <div className="text-[10px] font-extrabold uppercase text-muted mb-1">Not included</div>
          <ul className="text-[12px] space-y-0.5 text-muted">
            {(slide.extras?.excluded || []).map((x, i) => <li key={i}>✗ {x}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AboutSlide({ slide, editable, onChange }) {
  return (
    <div className="rounded-xl bg-[var(--card-2)]/40 p-6 space-y-4">
      <EditableTitle
        value={slide.title}
        onChange={(t) => onChange({ title: t })}
        editable={editable}
        className="text-2xl font-black"
      />
      <div className="grid md:grid-cols-[120px_1fr] gap-4">
        <div className="rounded-xl overflow-hidden border border-token aspect-square grid place-items-center bg-[var(--card)] text-aws-orange text-3xl font-black">
          {slide.extras?.photo
            ? <img src={slide.extras.photo} alt="" className="w-full h-full object-cover" />
            : (slide.extras?.authorName || 'A').slice(0, 1)}
        </div>
        <div className="space-y-2">
          <EditableBody
            value={slide.body}
            onChange={(t) => onChange({ body: t })}
            editable={editable}
            rows={3}
            className="text-sm leading-relaxed"
          />
          {(slide.extras?.certs?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {slide.extras.certs.map((c) => (
                <span key={c} className="chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange font-bold text-[10px]">{c}</span>
              ))}
            </div>
          )}
          <ul className="text-sm space-y-1 pt-1">
            {(slide.bullets || []).map((b, i) => <li key={i}>★ {b}</li>)}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-aws-orange font-bold">
            {slide.extras?.links?.github   && <a href={slide.extras.links.github}   className="hover:underline">GitHub</a>}
            {slide.extras?.links?.linkedin && <a href={slide.extras.links.linkedin} className="hover:underline">LinkedIn</a>}
            {slide.extras?.links?.website  && <a href={slide.extras.links.website}  className="hover:underline">Website</a>}
          </div>
          {slide.extras?.availability && (
            <div className="text-[11px] text-muted">Availability: <span className="font-bold text-current">{slide.extras.availability}</span></div>
          )}
        </div>
      </div>
    </div>
  );
}

function NextStepsSlide({ slide, editable, onChange }) {
  return (
    <div className="rounded-xl bg-[var(--card-2)]/40 p-6 space-y-4">
      <EditableTitle
        value={slide.title}
        onChange={(t) => onChange({ title: t })}
        editable={editable}
        className="text-2xl font-black"
      />
      <p className="text-sm text-muted">{slide.body}</p>
      <ol className="space-y-2">
        {(slide.bullets || []).map((b, i) => (
          <li key={i} className="rounded-lg border border-token bg-[var(--card)] p-3 text-sm font-bold">
            {b}
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between rounded-xl bg-gradient-aws text-ink-950 p-4 mt-2">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest">Expected delivery</div>
          <div className="text-lg font-black">{slide.extras?.eta || '—'}</div>
        </div>
        <a
          href={slide.extras?.ctaHref || '#'}
          className="bg-ink-950 text-white rounded-lg px-4 py-2 text-sm font-extrabold shadow-glow-orange hover:opacity-90 transition"
        >{slide.extras?.ctaLabel || 'Book discovery call'}</a>
      </div>
    </div>
  );
}

// =================================================================
// Presentation mode
// =================================================================

function PresentMode({ slides, brief, diagram, idx, setIdx, onExit }) {
  const slide = slides[idx];
  return (
    <div className="fixed inset-0 z-[100] bg-ink-950 text-white flex flex-col">
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
        <span className="chip border border-white/20 text-white/80 text-[10px]">{idx + 1} / {slides.length}</span>
        <button
          onClick={onExit}
          className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 text-[11px] font-bold"
        ><X size={11} className="inline" /> Exit</button>
      </div>

      <div className="flex-1 grid place-items-center p-8 overflow-y-auto">
        <div className="w-full max-w-4xl">
          <SlideView slide={slide} brief={brief} diagram={diagram} editable={false} fullScreen />
        </div>
      </div>

      <div className="border-t border-white/10 p-3 flex items-center justify-between bg-black/60">
        <button
          onClick={() => setIdx(Math.max(0, idx - 1))}
          className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold"
          disabled={idx === 0}
        ><ChevronLeft size={12} className="inline" /> Prev</button>
        <span className="text-[11px] text-white/60">← → arrow keys · ESC to exit</span>
        <button
          onClick={() => setIdx(Math.min(slides.length - 1, idx + 1))}
          className="rounded-md bg-aws-orange text-ink-950 px-3 py-1.5 text-xs font-extrabold shadow-glow-orange"
          disabled={idx === slides.length - 1}
        >Next <ChevronRight size={12} className="inline" /></button>
      </div>
    </div>
  );
}

// =================================================================
// Helpers
// =================================================================

function seedBrief(profile, lastAnalysis, params) {
  const a = lastAnalysis?.analysis || null;
  const budgetKind = a?.budget?.kind === 'hourly' ? 'hourly' : 'fixed';
  const handoffBrief = params?.get('prefill') || '';
  const handoffTitle = params?.get('title') || '';
  const handoffServices = (params?.get('services') || '').split(',').map((s) => s.trim()).filter(Boolean);
  const handoffBudget = Number(String(params?.get('budget') || '').replace(/[^0-9.]/g, ''));
  return {
    authorName:    profile?.name || '',
    authorEmail:   profile?.integrations?.upwork ? '' : '',
    tagline:       'AWS Cloud Engineer | Network Specialist',
    certs:         [],
    github:        profile?.integrations?.github || '',
    linkedin:      profile?.integrations?.linkedin || '',
    website:       '',
    availability:  'Available to start within 7 days',
    clientCompany: lastAnalysis?.suggestedClient || '',
    clientContact: '',
    projectTitle:  handoffTitle || lastAnalysis?.suggestedName || '',
    problem:       handoffBrief,
    painPoints:    [],
    businessImpact:'',
    solution:      handoffBrief ? 'Review the approved brief, architecture, implementation plan, validation evidence, rollback, and handover.' : '',
    benefits:      [],
    whyAWS:        '',
    services:      (handoffServices.length ? handoffServices : (a?.services || [])).map((s) => s.toUpperCase()),
    costSavings:   '',
    scaleTarget:   '',
    timelineDays:  estimateDays(a?.timeline) || 21,
    budgetKind,
    budget:        Number.isFinite(handoffBudget) && handoffBudget > 0 ? handoffBudget : (a?.budget?.kind === 'fixed' ? a.budget.amount : 3000),
    hourlyRate:    a?.budget?.kind === 'hourly' ? (a.budget.max || a.budget.min) : 85,
    estimatedHours:40,
    currency:      'USD',
    included:      [],
    excluded:      [],
    portfolio:     [],
    bookingLink:   '',
  };
}

function estimateDays(t) {
  if (!t) return null;
  if (t.kind === 'range' && t.unit?.startsWith('day'))   return Math.round((t.min + t.max) / 2);
  if (t.kind === 'range' && t.unit?.startsWith('week'))  return Math.round((t.min + t.max) / 2) * 7;
  if (t.kind === 'range' && t.unit?.startsWith('month')) return Math.round((t.min + t.max) / 2) * 30;
  if (t.kind === 'fixed' && t.unit?.startsWith('week'))  return t.value * 7;
  if (t.kind === 'fixed' && t.unit?.startsWith('month')) return t.value * 30;
  return null;
}

function download(filename, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
