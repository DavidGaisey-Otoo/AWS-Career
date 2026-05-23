/**
 * Tiny dependency-free markdown subset renderer.
 *
 * Supports:
 *   # / ## / ###            → headings
 *   **bold**                → <strong>
 *   *italic* / _italic_     → <em>
 *   `inline code`           → <code>
 *   ```lang\n…\n```         → fenced code block (with optional copy button)
 *   - / • / 1.              → unordered + ordered lists
 *   | tables |              → simple GitHub-style tables
 *   blank line              → paragraph break
 *
 * Not a replacement for a full markdown lib, but covers the structured
 * output our AI engine emits.
 */

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils.js';

export function Markdown({ source = '', className = '' }) {
  const blocks = tokenize(source);
  return (
    <div className={cn('prose-aws space-y-3', className)}>
      {blocks.map((b, i) => renderBlock(b, i))}
      <style>{`
        .prose-aws strong { font-weight: 800; color: var(--text); }
        .prose-aws em { font-style: italic; }
        .prose-aws code.inline {
          font-family: var(--font-mono, ui-monospace);
          font-size: 0.85em;
          background: rgba(255,153,0,0.12);
          color: #FF9900;
          padding: 1px 6px; border-radius: 6px;
        }
        .prose-aws p { line-height: 1.65; }
      `}</style>
    </div>
  );
}

// ---------------- tokenizer ----------------

function tokenize(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = line.match(/^```(\w+)?/);
    if (fence) {
      const lang = fence[1] || '';
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        body.push(lines[i]); i++;
      }
      i++; // consume closing fence
      out.push({ kind: 'code', lang, text: body.join('\n') });
      continue;
    }

    // table (must be at least one separator row like | --- | --- |)
    if (/^\s*\|/.test(line) && /^\s*\|/.test(lines[i + 1] || '') && /---/.test(lines[i + 1] || '')) {
      const header = parseTableRow(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        rows.push(parseTableRow(lines[i])); i++;
      }
      out.push({ kind: 'table', header, rows });
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { out.push({ kind: 'heading', level: h[1].length, text: h[2] }); i++; continue; }

    // ordered list (collect contiguous)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++;
      }
      out.push({ kind: 'ol', items });
      continue;
    }

    // unordered list
    if (/^\s*[-•*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-•*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-•*]\s+/, '')); i++;
      }
      out.push({ kind: 'ul', items });
      continue;
    }

    // blank line
    if (/^\s*$/.test(line)) { i++; continue; }

    // paragraph (collect contiguous non-special)
    const para = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|```|\s*[-•*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push({ kind: 'p', text: para.join(' ') });
  }
  return out;
}

function parseTableRow(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

// ---------------- inline ----------------

function inlineToParts(text) {
  // Order: code → bold → italic
  const parts = [];
  // crude tokenizer that handles `code`, **bold**, *italic*, _italic_
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: text.slice(last, m.index) });
    if (m[1]) parts.push({ t: m[1].slice(1, -1), code: true });
    else if (m[2]) parts.push({ t: m[2].slice(2, -2), bold: true });
    else if (m[3]) parts.push({ t: m[3].slice(1, -1), italic: true });
    else if (m[4]) parts.push({ t: m[4].slice(1, -1), italic: true });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ t: text.slice(last) });
  return parts;
}

function Inline({ children }) {
  const parts = inlineToParts(children || '');
  return (
    <>
      {parts.map((p, i) => {
        if (p.code) return <code key={i} className="inline">{p.t}</code>;
        if (p.bold) return <strong key={i}>{p.t}</strong>;
        if (p.italic) return <em key={i}>{p.t}</em>;
        return <span key={i}>{p.t}</span>;
      })}
    </>
  );
}

// ---------------- render ----------------

function renderBlock(b, k) {
  if (b.kind === 'heading') {
    const Tag = `h${Math.min(3, b.level + 2)}`;
    const cls = b.level === 1 ? 'text-xl font-extrabold tracking-tight'
              : b.level === 2 ? 'text-lg font-extrabold tracking-tight'
              : 'text-sm font-extrabold uppercase tracking-widest text-aws-orange';
    return <Tag key={k} className={cls}><Inline>{b.text}</Inline></Tag>;
  }
  if (b.kind === 'p') return <p key={k} className="text-sm leading-relaxed"><Inline>{b.text}</Inline></p>;
  if (b.kind === 'ul') return (
    <ul key={k} className="list-disc pl-5 space-y-1 text-sm leading-relaxed">
      {b.items.map((it, i) => <li key={i}><Inline>{it}</Inline></li>)}
    </ul>
  );
  if (b.kind === 'ol') return (
    <ol key={k} className="list-decimal pl-5 space-y-1 text-sm leading-relaxed">
      {b.items.map((it, i) => <li key={i}><Inline>{it}</Inline></li>)}
    </ol>
  );
  if (b.kind === 'table') return (
    <div key={k} className="overflow-x-auto rounded-lg border border-token">
      <table className="w-full text-xs">
        <thead className="bg-[var(--card-2)]">
          <tr>{b.header.map((h, i) => <th key={i} className="text-left font-bold p-2 border-b border-token"><Inline>{h}</Inline></th>)}</tr>
        </thead>
        <tbody>
          {b.rows.map((r, i) => (
            <tr key={i} className="border-b border-token last:border-0">
              {r.map((c, j) => <td key={j} className="p-2"><Inline>{c}</Inline></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (b.kind === 'code') return <CodeBlock key={k} lang={b.lang} text={b.text} />;
  return null;
}

function CodeBlock({ lang, text }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1400); } catch {}
  };
  return (
    <div className="relative rounded-xl border border-token bg-ink-950/40 overflow-hidden group">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-token bg-ink-950/40">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{lang || 'code'}</span>
        <button
          onClick={onCopy}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-muted hover:text-aws-orange transition"
        >
          {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed font-mono text-current whitespace-pre">
{text}
      </pre>
    </div>
  );
}
