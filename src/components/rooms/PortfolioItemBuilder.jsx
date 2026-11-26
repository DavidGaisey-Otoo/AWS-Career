import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, Download, Eraser, ImagePlus, Undo2 } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { useMyFacts } from '../../hooks/useMyFacts.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { DEFAULT_DISPLAY_NAMES, LIMITS, caseStudy, normalizeRect, redactText, toNaturalRects, upworkItem } from '../../lib/portfolioRedaction.js';
import { TruthCheckPanel } from '../common/TruthCheck.jsx';
import { cn } from '../../lib/utils.js';

const field = 'w-full rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-1.5 text-[12.5px]';
const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);

function CopyButton({ text, label, disabled }) {
  const [done, setDone] = useState(false);
  return (
    <button disabled={disabled} className="btn btn-ghost !text-[11.5px] !py-1 inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1600); } catch { /* clipboard blocked */ } }}>
      {done ? <Check size={12} /> : <ClipboardCopy size={12} />} {done ? 'Copied' : label}
    </button>
  );
}

/**
 * Black out a screenshot by drawing boxes. The export is a new PNG drawn
 * from scratch, so the covered pixels and the photo's metadata are gone.
 * Images stay in memory only; nothing is uploaded or stored.
 */
function ImageRedactor({ onExported }) {
  const [img, setImg] = useState(null); // { url, name, w, h }
  const [rects, setRects] = useState([]);
  const [drag, setDrag] = useState(null);
  const [checked, setChecked] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => () => { if (img?.url) URL.revokeObjectURL(img.url); }, [img]);

  const load = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => { setImg({ url, name: file.name.replace(/\.[^.]+$/, ''), w: probe.naturalWidth, h: probe.naturalHeight }); setRects([]); setChecked(false); };
    probe.src = url;
  };

  const point = (e) => {
    const r = boxRef.current.getBoundingClientRect();
    return { x: Math.min(Math.max(e.clientX - r.left, 0), r.width), y: Math.min(Math.max(e.clientY - r.top, 0), r.height) };
  };

  const exportPng = () => {
    const shown = boxRef.current.getBoundingClientRect().width;
    const canvas = document.createElement('canvas');
    canvas.width = img.w; canvas.height = img.h;
    const ctx = canvas.getContext('2d');
    const source = new Image();
    source.onload = () => {
      ctx.drawImage(source, 0, 0);
      ctx.fillStyle = '#000';
      for (const r of toNaturalRects(rects, shown, img.w)) ctx.fillRect(r.x, r.y, r.w, r.h);
      canvas.toBlob((blob) => {
        const a = document.createElement('a');
        const href = URL.createObjectURL(blob);
        a.href = href; a.download = `${img.name}-redacted.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(href), 2000);
        onExported?.(`${img.name}-redacted.png`);
      }, 'image/png');
    };
    source.src = img.url;
  };

  const live = drag ? normalizeRect(drag.a, drag.b) : null;

  return (
    <section className="surface rounded-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-[14px] font-bold">1. Black out the screenshot</h2>
        <label className="btn btn-ghost !text-[12px] inline-flex items-center gap-1 cursor-pointer">
          <ImagePlus size={13} /> Choose image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => load(e.target.files?.[0])} />
        </label>
      </div>
      <p className="text-[12px] text-muted">Drag a box over every account number, ARN, email and the account name. There is no automatic text finding in images, so look at every corner: the account menu, the URL bar and any table.</p>
      {img && (
        <>
          <div ref={boxRef} className="relative select-none touch-none cursor-crosshair rounded-lg overflow-hidden border border-token"
               onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const p = point(e); setDrag({ a: p, b: p }); }}
               onPointerMove={(e) => drag && setDrag({ ...drag, b: point(e) })}
               onPointerUp={() => { if (live && live.w >= 3 && live.h >= 3) setRects((r) => [...r, live]); setDrag(null); setChecked(false); }}>
            <img src={img.url} alt="Screenshot to redact" className="block w-full h-auto pointer-events-none" draggable={false} />
            {[...rects, ...(live ? [live] : [])].map((r, i) => (
              <div key={i} className="absolute bg-black" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost !text-[12px] inline-flex items-center gap-1" disabled={!rects.length} onClick={() => setRects((r) => r.slice(0, -1))}><Undo2 size={12} /> Undo box</button>
            <button className="btn btn-ghost !text-[12px] inline-flex items-center gap-1" disabled={!rects.length} onClick={() => setRects([])}><Eraser size={12} /> Clear</button>
            <span className="text-[12px] text-muted">{rects.length} box{rects.length === 1 ? '' : 'es'}</span>
          </div>
          <label className="flex items-start gap-2 text-[12.5px]">
            <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            I have checked the whole image. No account number, ARN, email or account name is still visible.
          </label>
          <button disabled={!checked} onClick={exportPng} className="btn btn-primary !text-[12px] inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={13} /> Save redacted PNG
          </button>
        </>
      )}
    </section>
  );
}

/**
 * Grow → Portfolio item: a redacted screenshot, a case study, and the
 * Upwork portfolio item (title, ≤600-character description, ≤5 skills).
 */
export function PortfolioItemBuilder() {
  const { facts } = useMyFacts();
  const [draft, setDraft] = useLocalStorage(`${STORAGE_KEY}::portfolio-item-draft`, {
    title: '', problem: '', did: '', evidence: '', clientGets: '', aiNote: '', description: '', skills: '', names: DEFAULT_DISPLAY_NAMES.join(', '),
  });
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const displayNames = String(draft.names || '').split(',').map((s) => s.trim()).filter(Boolean);

  const study = useMemo(() => caseStudy({
    title: draft.title, problem: draft.problem, did: lines(draft.did), evidence: lines(draft.evidence), clientGets: draft.clientGets, aiNote: draft.aiNote,
  }, { displayNames }), [draft, displayNames.join('|')]);

  const description = draft.description || [draft.problem, ...lines(draft.did)].filter(Boolean).join(' ');
  const item = useMemo(() => upworkItem({
    title: draft.title, description, skills: String(draft.skills || '').split(',').map((s) => s.trim()),
  }, { facts, displayNames }), [draft, description, facts, displayNames.join('|')]);
  const rawHits = redactText([draft.title, draft.problem, draft.did, draft.description].join('\n'), { displayNames }).hits;

  return (
    <div className="space-y-4 max-w-5xl">
      <ImageRedactor onExported={(name) => setDraft((d) => ({ ...d, evidence: [d.evidence, name].filter(Boolean).join('\n') }))} />

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-[14px] font-bold">2. The case study</h2>
        <div className="grid md:grid-cols-2 gap-2">
          <label className="text-[12px] space-y-1"><div>Title</div><input className={field} value={draft.title} onChange={set('title')} placeholder="Three-Tier AWS VPC Across Two Availability Zones" /></label>
          <label className="text-[12px] space-y-1"><div>Account name to hide (comma-separated)</div><input className={field} value={draft.names} onChange={set('names')} /></label>
          <label className="text-[12px] space-y-1 md:col-span-2"><div>The problem</div><input className={field} value={draft.problem} onChange={set('problem')} placeholder="Putting everything in one public subnet exposes app servers to the internet." /></label>
          <label className="text-[12px] space-y-1"><div>What I did (one per line)</div><textarea rows={5} className={field} value={draft.did} onChange={set('did')} /></label>
          <label className="text-[12px] space-y-1"><div>Evidence (one per line; saved images are added)</div><textarea rows={5} className={field} value={draft.evidence} onChange={set('evidence')} /></label>
          <label className="text-[12px] space-y-1"><div>What a client gets from this</div><input className={field} value={draft.clientGets} onChange={set('clientGets')} /></label>
          <label className="text-[12px] space-y-1"><div>How it was done (honest note)</div><input className={field} value={draft.aiNote} onChange={set('aiNote')} placeholder="Lab steps were guided; I used AI tools for help with Linux commands." /></label>
        </div>
        {rawHits.length > 0 && <p className="text-[12px] text-warning">Removed automatically: {rawHits.map((h) => `${h.count} ${h.type}`).join(', ')}.</p>}
        <div className="flex justify-end"><CopyButton text={study} label="Copy case study" /></div>
        <pre className="rounded-xl border border-token p-3 text-[11.5px] whitespace-pre-wrap max-h-72 overflow-auto">{study}</pre>
      </section>

      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="text-[14px] font-bold">3. Upwork portfolio item</h2>
        <label className="text-[12px] space-y-1 block">
          <div>Description <span className={cn('tabular-nums', item.chars > LIMITS.description - 20 ? 'text-warning' : 'text-muted')}>({item.chars}/{LIMITS.description})</span></div>
          <textarea rows={4} className={field} value={draft.description} onChange={set('description')} placeholder={description || 'Leave empty to build it from the problem and what you did.'} />
        </label>
        <label className="text-[12px] space-y-1 block"><div>Skills (up to {LIMITS.skills}, comma-separated)</div><input className={field} value={draft.skills} onChange={set('skills')} placeholder="Amazon Web Services, Cloud Security, Network Engineering" /></label>
        {item.problems.length > 0 && <ul className="text-[12px] text-warning">{item.problems.map((p) => <li key={p}>• {p}</li>)}</ul>}
        <TruthCheckPanel result={item.truth} />
        <div className="rounded-xl border border-token p-3 text-[12.5px] space-y-1">
          <div><span className="text-muted">Title:</span> {item.title || '—'}</div>
          <div><span className="text-muted">Description:</span> {item.description || '—'}</div>
          <div><span className="text-muted">Skills:</span> {item.skills.join(', ') || '—'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={item.title} label="Copy title" disabled={!item.ok} />
          <CopyButton text={item.description} label="Copy description" disabled={!item.ok} />
          <CopyButton text={item.skills.join(', ')} label="Copy skills" disabled={!item.ok} />
        </div>
        <p className="text-[11.5px] text-muted">Paste these into Upwork → Profile → Portfolio → Add, with the redacted images. Nothing is uploaded from here.</p>
      </section>
    </div>
  );
}
