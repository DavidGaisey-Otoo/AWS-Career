/**
 * Professional, brand-styled HTML renderer for printable documents.
 *
 * Takes a Markdown string and produces a fully-styled HTML document
 * that looks like a real consultancy deliverable — cover header,
 * sectioned typography, tables, callouts, page breaks, footers.
 *
 * Used by:
 *   - Project Plan export
 *   - Presentation Generator (handout style)
 *   - Contract / Invoice export
 *   - Delivery package README export
 *
 * No external markdown library — we do a focused subset that matches
 * what the app's own generators emit (h1-h3, bullets, ordered lists,
 * tables, blockquotes, bold/italic, links, code).
 */

const PALETTE = {
  primary: '#FF9900',           // AWS orange
  ink:     '#0A0E1A',
  text:    '#1F2937',
  muted:   '#6B7280',
  border:  '#E5E7EB',
  accent:  '#0F172A',
  success: '#059669',
  warning: '#D97706',
  danger:  '#DC2626',
  cardBg:  '#F9FAFB',
};

/**
 * Open a styled HTML preview in a new browser tab.
 *
 * BF-07 — uses a Blob URL approach so the new tab loads REAL HTML content
 * (not blank + document.write, which fails silently in some browsers).
 * No auto-print, no iframe side effects on the parent page — the user
 * sees the preview, then prints with Ctrl/Cmd+P from there.
 *
 * If popups are blocked, falls back to downloading the HTML file with
 * clear instructions.
 *
 * Always returns a result object so callers can show feedback.
 *
 * @param {object} opts  see buildPrintableHtml options
 * @returns {{ method: 'popup' | 'download' | 'error', ok: boolean, url?: string }}
 */
export function openPrintable(opts) {
  let html;
  try {
    // autoPrint=false — let the user choose when to print from the preview
    html = buildPrintableHtml({ autoPrint: false, ...opts });
  } catch (err) {
    console.error('[printable] buildPrintableHtml threw:', err);
    alert('Could not build the print view — see browser console for details.');
    return { method: 'error', ok: false };
  }

  // Create a Blob URL the new tab can navigate to.
  // This loads as a real document with content (not a blank tab + document.write).
  let blobUrl;
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    blobUrl = URL.createObjectURL(blob);
  } catch (err) {
    console.error('[printable] could not create blob URL:', err);
    alert('Could not prepare the print view — see browser console.');
    return { method: 'error', ok: false };
  }

  // Tier 1 — open in new tab via Blob URL
  try {
    const w = window.open(blobUrl, '_blank');
    if (w && !w.closed) {
      w.focus();
      // Revoke the URL after the tab has had time to load (Blob URLs are
      // browser-scoped — once revoked the new tab keeps its loaded copy).
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return { method: 'popup', ok: true, url: blobUrl };
    }
  } catch (err) {
    console.warn('[printable] popup failed:', err);
  }

  // Tier 2 — popup blocked: download as HTML file
  try {
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `${slugify(opts.title || 'document')}.html`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch {/* */}
      URL.revokeObjectURL(blobUrl);
    }, 30000);
    alert('Pop-up was blocked — we downloaded an HTML file instead.\n\nOpen it in your browser, then press Ctrl+P (Cmd+P on Mac) → "Save as PDF".\n\nOr use the "Download as PDF" button to skip the print dialog entirely.');
    return { method: 'download', ok: true };
  } catch (err) {
    console.error('[printable] download fallback failed:', err);
    try { URL.revokeObjectURL(blobUrl); } catch {/* */}
    alert('Could not open print view. Check your browser\'s popup + download settings.');
    return { method: 'error', ok: false };
  }
}

/**
 * The bulletproof download trigger.
 *
 * Browser quirks this handles:
 *   • Firefox / older Chrome won't fire .click() on a detached <a>.
 *     Fix: append to <body>, click, then remove.
 *   • Some browsers revoke the blob URL before the download starts if
 *     we call URL.revokeObjectURL() synchronously. Fix: defer 30s.
 *   • Safari sometimes ignores the `download` attribute on certain MIME
 *     types. Fix: fall back to opening the blob in a new tab so the
 *     user can save manually.
 */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  try {
    a.click();
  } catch (err) {
    // Last-resort: open in a new tab if click() throws
    window.open(url, '_blank');
  }
  // Clean up after the browser has had time to start the download
  setTimeout(() => {
    try { document.body.removeChild(a); } catch {}
    try { URL.revokeObjectURL(url); } catch {}
  }, 30_000);
  return url;
}

/**
 * Download a Markdown file directly (no print preview).
 */
export function downloadMarkdownFile(markdown, filename) {
  const blob = new Blob([markdown || ''], { type: 'text/markdown;charset=utf-8' });
  triggerDownload(blob, filename || 'document.md');
}

/**
 * Download a self-contained HTML file (the same one openPrintable shows
 * in a new tab, but as a file). Easier "give this to a teammate" path.
 */
export function downloadHtmlFile(opts) {
  const html = buildPrintableHtml({ autoPrint: false, ...opts });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  triggerDownload(blob, `${slugify(opts.title || 'document')}.html`);
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/**
 * TRUE one-click PDF download — generates a real .pdf file in the browser
 * and pushes it straight to the user's Downloads folder.
 *
 * No popup window. No print dialog. Just click → file lands in Downloads.
 *
 * Uses html2pdf.js (which wraps jsPDF + html2canvas) — the library is
 * imported dynamically so the ~600KB hit is only paid when the user
 * actually clicks "Download PDF".
 */
export async function downloadPdfFile(opts) {
  const html = buildPrintableHtml({ autoPrint: false, ...opts });
  const filename = `${slugify(opts.title || 'document')}.pdf`;

  // Render the printable HTML into a hidden iframe so html2pdf can read it
  // with the right document context (styles, fonts loaded, etc.)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';   // ~A4 width at 96dpi
  iframe.style.height = '1123px'; // ~A4 height at 96dpi
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for fonts to load
    if (doc.fonts && doc.fonts.ready) {
      try { await doc.fonts.ready; } catch {}
    }
    // Belt-and-braces: a small delay so layout settles
    await new Promise((r) => setTimeout(r, 400));

    const root = doc.body;
    // Hide the screen-only "how to save" banner before rendering
    const howto = doc.querySelector('.howto');
    if (howto) howto.style.display = 'none';
    // Hide the screen-only doc footer
    const docFooter = doc.querySelector('.doc-footer');
    if (docFooter) docFooter.style.display = 'none';

    const html2pdf = (await import('html2pdf.js')).default;
    await html2pdf()
      .set({
        margin:       [12, 12, 16, 12],
        filename,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(root)
      .save();
  } finally {
    // Clean up the iframe
    iframe.remove();
  }
}

export function buildPrintableHtml({
  markdown = '',
  title = 'Document',
  subtitle = '',
  meta = [],
  authorName = '',
  authorCompany = '',
  documentType = 'Document',
  autoPrint = true,
}) {
  // BF-06 hardening: callers sometimes pass `meta` as a STRING instead of
  // an array of {label, value}. Normalise so .map() never throws.
  if (typeof meta === 'string') {
    meta = meta.trim() ? [{ label: 'Details', value: meta }] : [];
  } else if (!Array.isArray(meta)) {
    meta = [];
  } else {
    // Filter out malformed entries (must have a label)
    meta = meta.filter((m) => m && typeof m === 'object' && m.label != null);
  }

  const body = renderMarkdown(markdown || '');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>
${baseCss()}
</style>
</head>
<body>

  <!-- HOW-TO-SAVE banner (screen only — hidden in print) -->
  <div class="howto no-print">
    <div class="howto-inner">
      <div class="howto-title">📄 Save this as a PDF in 3 clicks</div>
      <ol class="howto-steps">
        <li><strong>1.</strong> Click the orange <strong>"Save as PDF"</strong> button →</li>
        <li><strong>2.</strong> In the dialog that opens, set <strong>Destination</strong> to <strong>"Save as PDF"</strong></li>
        <li><strong>3.</strong> Click <strong>Save</strong> — pick where to put it</li>
      </ol>
      <button class="howto-cta" onclick="window.print()">🖨 Save as PDF</button>
    </div>
  </div>

  <!-- COVER -->
  <section class="cover">
    <div class="cover-mark"></div>
    <div class="cover-inner">
      <div class="cover-eyebrow">${escapeHtml(documentType)}</div>
      <h1 class="cover-title">${escapeHtml(title)}</h1>
      ${subtitle ? `<div class="cover-subtitle">${escapeHtml(subtitle)}</div>` : ''}

      ${meta.length > 0 ? `
      <div class="cover-meta">
        ${meta.map((m) => `
          <div class="meta-item">
            <div class="meta-label">${escapeHtml(m.label)}</div>
            <div class="meta-value">${escapeHtml(m.value || '—')}</div>
          </div>
        `).join('')}
      </div>` : ''}

      <div class="cover-footer">
        <div>
          <div class="cover-author">${escapeHtml(authorName || 'AWS Cloud Engineer')}</div>
          ${authorCompany ? `<div class="cover-company">${escapeHtml(authorCompany)}</div>` : ''}
        </div>
        <div class="cover-date">${today}</div>
      </div>
    </div>
  </section>

  <!-- BODY -->
  <main class="doc">
    ${body}
  </main>

  <footer class="doc-footer no-print">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    <span>${escapeHtml(title)} · prepared by ${escapeHtml(authorName || 'AWS Cloud Engineer')} · ${today}</span>
  </footer>

  ${autoPrint ? '<script>setTimeout(() => window.print(), 600);</script>' : ''}
</body>
</html>`;
}

// =================================================================
// CSS — branded, print-optimised
// =================================================================

function baseCss() {
  const { primary, ink, text, muted, border, accent, success, warning, danger, cardBg } = PALETTE;
  return `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: ${text};
    background: #FFFFFF;
    line-height: 1.6;
    font-size: 14px;
  }

  /* ============ HOW-TO-SAVE BANNER (screen only) ============ */
  .howto {
    position: sticky; top: 0; z-index: 100;
    background: linear-gradient(135deg, ${primary}, #F97316);
    color: #1A1207;
    padding: 14px 24px;
    box-shadow: 0 4px 16px rgba(255,153,0,0.25);
    border-bottom: 3px solid #1A1207;
  }
  .howto-inner {
    max-width: 1000px; margin: 0 auto;
    display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  }
  .howto-title { font-size: 16px; font-weight: 900; letter-spacing: -0.01em; }
  .howto-steps {
    list-style: none; margin: 0; padding: 0;
    display: flex; gap: 18px; font-size: 12px; flex: 1; flex-wrap: wrap;
  }
  .howto-steps li { margin: 0; }
  .howto-cta {
    background: ${ink}; color: ${primary};
    border: none; padding: 10px 20px; border-radius: 10px;
    font-size: 13px; font-weight: 900; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.20);
    transition: transform 0.1s;
  }
  .howto-cta:hover { transform: translateY(-1px); filter: brightness(1.1); }
  .howto-cta:active { transform: translateY(0); }

  /* ============ COVER ============ */
  .cover {
    min-height: 90vh;
    background: linear-gradient(135deg, ${ink} 0%, ${accent} 100%);
    color: #fff;
    padding: 60px 56px;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .cover-mark {
    position: absolute;
    top: -120px;
    right: -120px;
    width: 360px;
    height: 360px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255,153,0,0.30), transparent 70%);
  }
  .cover-inner { position: relative; max-width: 720px; }
  .cover-eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.22em;
    font-size: 11px;
    font-weight: 800;
    color: ${primary};
    margin-bottom: 16px;
  }
  .cover-title {
    font-size: 52px;
    font-weight: 900;
    letter-spacing: -0.025em;
    line-height: 1.05;
    margin: 0 0 12px;
  }
  .cover-subtitle {
    font-size: 18px;
    color: #CBD5E1;
    margin-bottom: 40px;
  }
  .cover-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 50px;
    max-width: 580px;
  }
  .meta-item {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 12px;
    padding: 12px 16px;
  }
  .meta-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: ${primary};
    font-weight: 800;
    margin-bottom: 4px;
  }
  .meta-value {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
  }
  .cover-footer {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding-top: 32px;
    border-top: 1px solid rgba(255,255,255,0.10);
    color: #94A3B8;
  }
  .cover-author {
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    margin-bottom: 2px;
  }
  .cover-company {
    font-size: 12px;
  }
  .cover-date {
    font-size: 12px;
    font-weight: 600;
  }

  /* ============ DOCUMENT BODY ============ */
  .doc {
    max-width: 780px;
    margin: 0 auto;
    padding: 56px 64px;
  }
  .doc h1, .doc h2, .doc h3, .doc h4 {
    font-weight: 800;
    letter-spacing: -0.015em;
    color: ${ink};
    line-height: 1.25;
  }
  .doc h1 {
    font-size: 30px;
    margin: 0 0 8px;
    padding-bottom: 12px;
    border-bottom: 3px solid ${primary};
  }
  .doc h2 {
    font-size: 22px;
    margin: 40px 0 12px;
    padding-left: 14px;
    border-left: 4px solid ${primary};
    page-break-after: avoid;
  }
  .doc h3 {
    font-size: 16px;
    margin: 24px 0 8px;
    color: ${accent};
    page-break-after: avoid;
  }
  .doc h4 {
    font-size: 14px;
    margin: 18px 0 6px;
    color: ${muted};
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .doc p {
    margin: 0 0 12px;
    color: ${text};
  }

  /* Lists */
  .doc ul, .doc ol {
    margin: 0 0 16px;
    padding-left: 24px;
  }
  .doc li {
    margin: 6px 0;
    color: ${text};
  }
  .doc ul li::marker { color: ${primary}; }

  /* Tables */
  .doc table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    background: ${cardBg};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .doc th {
    background: ${ink};
    color: ${primary};
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 12px 16px;
  }
  .doc td {
    padding: 12px 16px;
    border-top: 1px solid ${border};
    font-size: 13px;
    color: ${text};
  }
  .doc tr:hover td { background: rgba(255,153,0,0.04); }

  /* Blockquote = milestone / callout */
  .doc blockquote {
    margin: 18px 0;
    padding: 14px 18px 14px 22px;
    border-left: 4px solid ${primary};
    background: linear-gradient(90deg, rgba(255,153,0,0.08), rgba(255,153,0,0.02));
    border-radius: 0 10px 10px 0;
    color: ${ink};
    font-weight: 500;
  }
  .doc blockquote p { margin: 0; }

  /* Bold / italic / links / highlights */
  .doc strong { color: ${ink}; font-weight: 700; }
  .doc em { font-style: italic; color: ${muted}; }
  .doc a {
    color: ${primary};
    text-decoration: none;
    border-bottom: 1px dotted ${primary};
  }
  .doc mark {
    background: linear-gradient(180deg, transparent 55%, rgba(255,153,0,0.40) 55%);
    color: ${ink};
    padding: 0 2px;
    font-weight: 600;
  }
  .doc .chip {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; border-radius: 50%;
    font-size: 10px; font-weight: 900;
    margin-right: 4px;
    vertical-align: -3px;
  }
  .doc .chip-ok    { background: ${success}; color: #fff; }
  .doc .chip-warn  { background: ${warning}; color: #fff; }
  .doc .chip-fail  { background: ${danger};  color: #fff; }
  .doc .chip-block { background: #475569;    color: #fff; }

  /* Code */
  .doc code {
    font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
    font-size: 12px;
    background: ${cardBg};
    border: 1px solid ${border};
    border-radius: 4px;
    padding: 1px 6px;
    color: ${ink};
  }
  .doc pre {
    background: ${ink};
    color: #E2E8F0;
    border-radius: 10px;
    padding: 16px;
    overflow-x: auto;
    margin: 16px 0 24px;
    font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
    font-size: 12.5px;
    line-height: 1.55;
  }
  .doc pre code {
    background: transparent;
    border: none;
    padding: 0;
    color: inherit;
  }

  /* Horizontal rule */
  .doc hr {
    border: none;
    height: 1px;
    background: ${border};
    margin: 32px 0;
  }

  /* ============ DOC FOOTER (screen only) ============ */
  .doc-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 64px;
    background: ${ink};
    color: #94A3B8;
    font-size: 11px;
  }
  .btn-print {
    background: ${primary};
    color: ${ink};
    border: none;
    border-radius: 8px;
    padding: 8px 18px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(255,153,0,0.30);
  }
  .btn-print:hover { filter: brightness(1.05); }

  /* ============ PRINT ============ */
  @page { size: A4; margin: 16mm 14mm; }
  @media print {
    .no-print { display: none !important; }
    .cover { min-height: auto; padding: 30mm 16mm; }
    .doc { padding: 0; max-width: 100%; }
    .cover-title { font-size: 44px; }
    .doc h2 { page-break-after: avoid; }
    .doc h3 { page-break-after: avoid; }
    .doc table, .doc blockquote, .doc pre { page-break-inside: avoid; }
    body { font-size: 12.5px; }
  }
  `;
}

// =================================================================
// Minimal markdown → HTML renderer
// (focused on the subset our generators emit)
// =================================================================

function renderMarkdown(md) {
  if (!md) return '';
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Horizontal rule
    if (/^---+\s*$/.test(line)) { out.push('<hr/>'); i++; continue; }

    // Headings
    let m;
    if ((m = line.match(/^####\s+(.*)$/))) { out.push(`<h4>${inline(m[1])}</h4>`); i++; continue; }
    if ((m = line.match(/^###\s+(.*)$/)))  { out.push(`<h3>${inline(m[1])}</h3>`); i++; continue; }
    if ((m = line.match(/^##\s+(.*)$/)))   { out.push(`<h2>${inline(m[1])}</h2>`); i++; continue; }
    if ((m = line.match(/^#\s+(.*)$/)))    { out.push(`<h1>${inline(m[1])}</h1>`); i++; continue; }

    // Tables: |a|b|c|  /  |---|---|---|  / data rows
    if (line.startsWith('|') && lines[i + 1] && /^\|[-:\s|]+\|$/.test(lines[i + 1])) {
      const header = splitTableRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      out.push(buildTable(header, rows));
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        buf.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${buf.map((l) => `<p>${inline(l)}</p>`).join('')}</blockquote>`);
      continue;
    }

    // Code fence ```
    if (line.startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      out.push(`<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      out.push(`<ol>${buf.map((l) => `<li>${inline(l)}</li>`).join('')}</ol>`);
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      out.push(`<ul>${buf.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`);
      continue;
    }

    // Blank line — paragraph break
    if (/^\s*$/.test(line)) { i++; continue; }

    // Paragraph (group adjacent non-empty lines)
    const buf = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) &&
           !/^#{1,4}\s/.test(lines[i]) && !lines[i].startsWith('|') &&
           !lines[i].startsWith('>') && !lines[i].startsWith('```') &&
           !/^[-*]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) &&
           !/^---+\s*$/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function splitTableRow(line) {
  return line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
}

function buildTable(header, rows) {
  return `<table>
    <thead><tr>${header.map((h) => `<th>${inline(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

/** Inline transforms: bold, italic, code, links, highlights, status chips. */
function inline(s) {
  if (!s) return '';
  let out = escapeHtml(s);
  // Links [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  // Bare URLs — auto-link
  out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noreferrer">$2</a>');
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic _text_   (don't catch __ used in code)
  out = out.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
  // ==highlight==
  out = out.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  // Inline code `text`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Status chips at line start ✅ / ⚠️ / ❌ / ⛔ become coloured chips
  out = out.replace(/^(✅|✓)\s+/, '<span class="chip chip-ok">✓</span> ');
  out = out.replace(/^(⚠️|⚠)\s+/, '<span class="chip chip-warn">!</span> ');
  out = out.replace(/^(❌|✗)\s+/, '<span class="chip chip-fail">✗</span> ');
  out = out.replace(/^(⛔)\s+/, '<span class="chip chip-block">⛔</span> ');
  return out;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
