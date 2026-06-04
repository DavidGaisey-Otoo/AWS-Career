/**
 * MyNotes.jsx — NT-01 library page.
 *
 * Routes:
 *   /my-notes          → list view (this file's default export)
 *   /my-notes/:noteId  → detail view (NoteDetail below)
 *
 * Both render from this single file so we can share search/filter
 * state via context if needed later.
 */

import { useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  NotebookPen, Search, Filter, Calendar, Trash2, ArrowLeft, Copy, Download,
  FileText, CheckCircle2, Sparkles, X, Tag, ChevronRight, AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import {
  useStudyNotes, searchNotes, filterByTag, getAllTags,
  deleteNote, getNote, noteToMarkdown, noteToPlainText,
} from '../lib/studyNotesStore.js';
import { useToast } from '../context/ToastContext.jsx';
import { cn } from '../lib/utils.js';

export default function MyNotes() {
  const list = useStudyNotes();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  const tags = useMemo(() => getAllTags(list), [list]);
  const filtered = useMemo(() => filterByTag(searchNotes(list, query), tagFilter), [list, query, tagFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="NT-01 · Study Notes"
        title="My Notes library"
        subtitle="Auto-generated notes from every walkthrough, lesson, and project you complete. Searchable by topic, AWS service, or date. Never overwritten — each generation creates a fresh entry."
        icon={NotebookPen}
      />

      {/* Search + filter */}
      <div className="surface rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="Search by title, service, concept, date…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg bg-[var(--card-2)] border border-token pl-7 pr-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </div>
          {tagFilter && (
            <button
              onClick={() => setTagFilter('')}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border border-aws-orange bg-aws-orange/15 text-aws-orange"
            >
              {tagFilter} <X size={9} />
            </button>
          )}
          <span className="text-[10.5px] opacity-60 ml-auto">
            {filtered.length} of {list.length} note{list.length === 1 ? '' : 's'}
          </span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <span className="text-[10.5px] opacity-60 self-center mr-1">Tags:</span>
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter((cur) => cur === t ? '' : t)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition',
                  tagFilter === t
                    ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                    : 'border-token opacity-70 hover:opacity-100'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="surface rounded-2xl p-10 text-center opacity-70">
          <NotebookPen size={28} className="mx-auto mb-3 opacity-50" />
          {list.length === 0 ? (
            <>
              <div className="text-[14px] font-bold mb-1">No notes yet</div>
              <p className="text-[12px] max-w-md mx-auto">
                Visit a <Link to="/walkthroughs/deep" className="text-aws-orange hover:underline">Deep Walkthrough</Link> or
                {' '}<Link to="/learn" className="text-aws-orange hover:underline">study guide</Link>, then click
                <strong> Generate Study Notes</strong>. It lands here automatically.
              </p>
            </>
          ) : (
            <>
              <div className="text-[14px] font-bold mb-1">No notes match this filter</div>
              <p className="text-[12px]">Clear the search/tag above to see everything.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={() => {
              if (!confirm(`Delete "${note.title}"?`)) return;
              deleteNote(note.id);
              toast?.success?.('Deleted');
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Note card (list view)
// ════════════════════════════════════════════════════════════════════
function NoteCard({ note, onDelete }) {
  return (
    <Link
      to={`/my-notes/${note.id}`}
      className="surface rounded-2xl p-4 hover:border-aws-orange/40 border border-transparent transition flex flex-col gap-2 group relative"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            {note.source}
          </div>
          <h3 className="text-[14px] font-extrabold leading-snug">{note.title}</h3>
          <div className="text-[11px] opacity-70 mt-0.5 inline-flex items-center gap-1">
            <Calendar size={9} /> {new Date(note.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 rounded text-danger transition"
          title="Delete note"
        >
          <Trash2 size={12} />
        </button>
      </div>
      {note.summary && (
        <p className="text-[12px] opacity-85 line-clamp-2 leading-snug">{note.summary}</p>
      )}
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {note.tags.slice(0, 6).map((t) => (
            <span key={t} className="px-1.5 py-0.5 rounded-full bg-aws-orange/10 text-aws-orange text-[9.5px] font-bold">
              {t}
            </span>
          ))}
          {note.tags.length > 6 && (
            <span className="text-[9.5px] opacity-50 self-center">+{note.tags.length - 6}</span>
          )}
        </div>
      )}
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════════
// Note detail page — separate route /my-notes/:noteId
// ════════════════════════════════════════════════════════════════════
export function NoteDetail() {
  const { noteId } = useParams();
  const list = useStudyNotes();
  const note = useMemo(() => list.find((n) => n.id === noteId) || getNote(noteId), [list, noteId]);
  const toast = useToast();
  const nav = useNavigate();

  if (!note) {
    return (
      <div className="space-y-4">
        <Link to="/my-notes" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
          <ArrowLeft size={14} /> My Notes
        </Link>
        <div className="surface rounded-2xl p-10 text-center opacity-70">
          <AlertTriangle size={28} className="mx-auto mb-3 text-warning" />
          <div className="text-[14px] font-bold">Note not found</div>
          <p className="text-[12px] mt-1">It may have been deleted. Head back to the library.</p>
        </div>
      </div>
    );
  }

  function copyText() {
    navigator.clipboard.writeText(noteToPlainText(note))
      .then(() => toast?.success?.('Copied as plain text'))
      .catch(() => toast?.error?.('Clipboard blocked'));
  }
  function copyMd() {
    navigator.clipboard.writeText(noteToMarkdown(note))
      .then(() => toast?.success?.('Copied as Markdown'))
      .catch(() => toast?.error?.('Clipboard blocked'));
  }
  function downloadMd() {
    const blob = new Blob([noteToMarkdown(note)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(note.title)}-${note.id.slice(-6)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast?.success?.('Downloaded .md');
  }
  async function downloadPdf() {
    // Lazy-load html2pdf so we don't bloat initial bundle
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      const html = renderHtmlForPrint(note);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
      await html2pdf().set({
        margin: 12,
        filename: `${slug(note.title)}-${note.id.slice(-6)}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(wrapper).save();
      document.body.removeChild(wrapper);
      toast?.success?.('Downloaded PDF');
    } catch (err) {
      console.error('[NoteDetail] PDF export failed:', err);
      toast?.error?.('PDF export failed — falling back to print');
      window.print();
    }
  }

  function handleDelete() {
    if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;
    deleteNote(note.id);
    toast?.success?.('Deleted');
    nav('/my-notes');
  }

  return (
    <div className="space-y-4">
      <Link to="/my-notes" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ArrowLeft size={14} /> My Notes
      </Link>

      {/* Header */}
      <div className="surface rounded-2xl p-5 gradient-border">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
          {note.source} note · {new Date(note.createdAt).toLocaleString('en-GB')}
        </div>
        <h1 className="text-2xl font-extrabold">{note.title}</h1>
        {note.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-aws-orange/10 text-aws-orange text-[10px] font-bold">
                <Tag size={9} /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Export bar */}
      <div className="surface rounded-2xl p-3 flex flex-wrap gap-2 items-center">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mr-1">Export</span>
        <button onClick={copyText} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
          <Copy size={12} /> Copy text
        </button>
        <button onClick={copyMd} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
          <Copy size={12} /> Copy as Markdown
        </button>
        <button onClick={downloadMd} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
          <Download size={12} /> Download .md
        </button>
        <button onClick={downloadPdf} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-gradient-aws text-ink-950 hover:brightness-110 transition">
          <FileText size={12} /> Download PDF
        </button>
        <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-danger/30 text-danger hover:bg-danger/10 transition ml-auto">
          <Trash2 size={12} /> Delete
        </button>
      </div>

      {/* Body */}
      <article className="surface rounded-2xl p-6 space-y-5">
        <Section title="What you built / learned" icon={Sparkles}>
          <p className="text-[13.5px] leading-relaxed">{note.body.whatYouBuilt}</p>
        </Section>

        {note.body.services?.length > 0 && (
          <Section title="AWS services used" icon={ChevronRight}>
            <div className="space-y-3">
              {note.body.services.map((s) => (
                <div key={s.id} className="rounded-xl bg-[var(--card-2)] border border-token p-3">
                  <div className="text-[13px] font-extrabold mb-1">
                    {s.label}
                    {s.id && <span className="opacity-50 ml-2 text-[10px] font-mono">{s.id}</span>}
                  </div>
                  {s.what && (
                    <p className="text-[12.5px] opacity-90 mb-1.5 leading-snug">
                      <strong className="text-aws-orange">What:</strong> {s.what}
                    </p>
                  )}
                  {s.why && (
                    <p className="text-[12.5px] opacity-90 leading-snug">
                      <strong className="text-aws-orange">Why we used it:</strong> {s.why}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {note.body.keyConcepts?.length > 0 && (
          <Section title="Key concepts covered" icon={CheckCircle2}>
            <ul className="space-y-1.5 text-[13px] leading-relaxed list-disc list-inside">
              {note.body.keyConcepts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </Section>
        )}

        {note.body.remembers?.length > 0 && (
          <Section title="3 things to remember" icon={CheckCircle2}>
            <ol className="space-y-2 text-[13px] leading-relaxed">
              {note.body.remembers.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-aws-orange/15 text-aws-orange text-[11px] font-extrabold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="flex-1">{r}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {note.body.mistakes?.length > 0 && (
          <Section title="2 common mistakes to avoid" icon={AlertTriangle}>
            <ul className="space-y-2 text-[13px] leading-relaxed">
              {note.body.mistakes.map((m, i) => (
                <li key={i} className="rounded-lg bg-warning/5 border border-warning/30 p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </article>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div>
      <h2 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 flex items-center gap-1.5">
        {Icon && <Icon size={12} />} {title}
      </h2>
      {children}
    </div>
  );
}

// Helper for PDF export — minimal inline-styled HTML
function renderHtmlForPrint(note) {
  const css = `
    body { font-family: -apple-system, system-ui, sans-serif; padding: 0; color: #111; max-width: 720px; margin: 0 auto; line-height: 1.55; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #f7811f; margin: 18px 0 6px; }
    h3 { font-size: 13px; margin: 8px 0 4px; }
    .meta { color: #666; font-size: 11px; margin-bottom: 18px; }
    .svc { border: 1px solid #ddd; border-radius: 6px; padding: 8px 10px; margin-bottom: 6px; }
    .svc-label { font-weight: 700; margin-bottom: 2px; }
    .tag { display: inline-block; background: #f7811f22; color: #f7811f; font-size: 10px; padding: 1px 6px; border-radius: 999px; margin-right: 4px; }
    .warn { border-left: 3px solid #c89110; padding: 6px 10px; background: #fff8e1; margin: 4px 0; }
    ol, ul { margin: 0; padding-left: 22px; }
    li { margin: 4px 0; }
    p { margin: 4px 0; font-size: 12px; }
  `;
  let html = `<style>${css}</style>`;
  html += `<h1>${escape(note.title)}</h1>`;
  html += `<div class="meta">${new Date(note.createdAt).toLocaleString('en-GB')} · ${note.source}</div>`;
  if (note.tags?.length) {
    html += `<div>${note.tags.map((t) => `<span class="tag">${escape(t)}</span>`).join('')}</div>`;
  }
  html += `<h2>What you built / learned</h2><p>${escape(note.body.whatYouBuilt)}</p>`;
  if (note.body.services?.length) {
    html += `<h2>AWS services used</h2>`;
    for (const s of note.body.services) {
      html += `<div class="svc"><div class="svc-label">${escape(s.label)}</div>`;
      if (s.what) html += `<p><strong>What:</strong> ${escape(s.what)}</p>`;
      if (s.why)  html += `<p><strong>Why:</strong> ${escape(s.why)}</p>`;
      html += `</div>`;
    }
  }
  if (note.body.keyConcepts?.length) {
    html += `<h2>Key concepts covered</h2><ul>${note.body.keyConcepts.map((c) => `<li>${escape(c)}</li>`).join('')}</ul>`;
  }
  if (note.body.remembers?.length) {
    html += `<h2>3 things to remember</h2><ol>${note.body.remembers.map((r) => `<li>${escape(r)}</li>`).join('')}</ol>`;
  }
  if (note.body.mistakes?.length) {
    html += `<h2>2 common mistakes to avoid</h2>${note.body.mistakes.map((m) => `<div class="warn">⚠️ ${escape(m)}</div>`).join('')}`;
  }
  return html;
}

function escape(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function slug(s) {
  return String(s || 'note').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}
