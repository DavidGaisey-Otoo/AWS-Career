const m={primary:"#FF9900",ink:"#0A0E1A",text:"#1F2937",muted:"#6B7280",border:"#E5E7EB",accent:"#0F172A",cardBg:"#F9FAFB"};function $(n){const e=u(n),o=window.open("","_blank");if(!o){alert("Pop-up blocked — please allow pop-ups to export the document.");return}o.document.write(e),o.document.close()}function u({markdown:n="",title:e="Document",subtitle:o="",meta:t=[],authorName:r="",authorCompany:a="",documentType:d="Document",autoPrint:i=!0}){const p=x(n),l=new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});return`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${s(e)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>
${f()}
</style>
</head>
<body>

  <!-- COVER -->
  <section class="cover">
    <div class="cover-mark"></div>
    <div class="cover-inner">
      <div class="cover-eyebrow">${s(d)}</div>
      <h1 class="cover-title">${s(e)}</h1>
      ${o?`<div class="cover-subtitle">${s(o)}</div>`:""}

      ${t.length>0?`
      <div class="cover-meta">
        ${t.map(g=>`
          <div class="meta-item">
            <div class="meta-label">${s(g.label)}</div>
            <div class="meta-value">${s(g.value||"—")}</div>
          </div>
        `).join("")}
      </div>`:""}

      <div class="cover-footer">
        <div>
          <div class="cover-author">${s(r||"AWS Cloud Engineer")}</div>
          ${a?`<div class="cover-company">${s(a)}</div>`:""}
        </div>
        <div class="cover-date">${l}</div>
      </div>
    </div>
  </section>

  <!-- BODY -->
  <main class="doc">
    ${p}
  </main>

  <footer class="doc-footer no-print">
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
    <span>${s(e)} · prepared by ${s(r||"AWS Cloud Engineer")} · ${l}</span>
  </footer>

  ${i?"<script>setTimeout(() => window.print(), 600);<\/script>":""}
</body>
</html>`}function f(){const{primary:n,ink:e,text:o,muted:t,border:r,accent:a,cardBg:d}=m;return`
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: ${o};
    background: #FFFFFF;
    line-height: 1.6;
    font-size: 14px;
  }

  /* ============ COVER ============ */
  .cover {
    min-height: 90vh;
    background: linear-gradient(135deg, ${e} 0%, ${a} 100%);
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
    color: ${n};
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
    color: ${n};
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
    color: ${e};
    line-height: 1.25;
  }
  .doc h1 {
    font-size: 30px;
    margin: 0 0 8px;
    padding-bottom: 12px;
    border-bottom: 3px solid ${n};
  }
  .doc h2 {
    font-size: 22px;
    margin: 40px 0 12px;
    padding-left: 14px;
    border-left: 4px solid ${n};
    page-break-after: avoid;
  }
  .doc h3 {
    font-size: 16px;
    margin: 24px 0 8px;
    color: ${a};
    page-break-after: avoid;
  }
  .doc h4 {
    font-size: 14px;
    margin: 18px 0 6px;
    color: ${t};
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .doc p {
    margin: 0 0 12px;
    color: ${o};
  }

  /* Lists */
  .doc ul, .doc ol {
    margin: 0 0 16px;
    padding-left: 24px;
  }
  .doc li {
    margin: 6px 0;
    color: ${o};
  }
  .doc ul li::marker { color: ${n}; }

  /* Tables */
  .doc table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
    background: ${d};
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }
  .doc th {
    background: ${e};
    color: ${n};
    text-align: left;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 12px 16px;
  }
  .doc td {
    padding: 12px 16px;
    border-top: 1px solid ${r};
    font-size: 13px;
    color: ${o};
  }
  .doc tr:hover td { background: rgba(255,153,0,0.04); }

  /* Blockquote = milestone / callout */
  .doc blockquote {
    margin: 18px 0;
    padding: 14px 18px 14px 22px;
    border-left: 4px solid ${n};
    background: linear-gradient(90deg, rgba(255,153,0,0.08), rgba(255,153,0,0.02));
    border-radius: 0 10px 10px 0;
    color: ${e};
    font-weight: 500;
  }
  .doc blockquote p { margin: 0; }

  /* Bold / italic / links */
  .doc strong { color: ${e}; font-weight: 700; }
  .doc em { font-style: italic; color: ${t}; }
  .doc a {
    color: ${n};
    text-decoration: none;
    border-bottom: 1px dotted ${n};
  }

  /* Code */
  .doc code {
    font-family: 'JetBrains Mono', 'SF Mono', Menlo, monospace;
    font-size: 12px;
    background: ${d};
    border: 1px solid ${r};
    border-radius: 4px;
    padding: 1px 6px;
    color: ${e};
  }
  .doc pre {
    background: ${e};
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
    background: ${r};
    margin: 32px 0;
  }

  /* ============ DOC FOOTER (screen only) ============ */
  .doc-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 16px 64px;
    background: ${e};
    color: #94A3B8;
    font-size: 11px;
  }
  .btn-print {
    background: ${n};
    color: ${e};
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
  `}function x(n){if(!n)return"";const e=n.replace(/\r\n/g,`
`).split(`
`),o=[];let t=0;for(;t<e.length;){const r=e[t];if(/^---+\s*$/.test(r)){o.push("<hr/>"),t++;continue}let a;if(a=r.match(/^####\s+(.*)$/)){o.push(`<h4>${c(a[1])}</h4>`),t++;continue}if(a=r.match(/^###\s+(.*)$/)){o.push(`<h3>${c(a[1])}</h3>`),t++;continue}if(a=r.match(/^##\s+(.*)$/)){o.push(`<h2>${c(a[1])}</h2>`),t++;continue}if(a=r.match(/^#\s+(.*)$/)){o.push(`<h1>${c(a[1])}</h1>`),t++;continue}if(r.startsWith("|")&&e[t+1]&&/^\|[-:\s|]+\|$/.test(e[t+1])){const i=h(r),p=[];for(t+=2;t<e.length&&e[t].startsWith("|");)p.push(h(e[t])),t++;o.push(b(i,p));continue}if(r.startsWith(">")){const i=[];for(;t<e.length&&e[t].startsWith(">");)i.push(e[t].replace(/^>\s?/,"")),t++;o.push(`<blockquote>${i.map(p=>`<p>${c(p)}</p>`).join("")}</blockquote>`);continue}if(r.startsWith("```")){const i=[];for(t++;t<e.length&&!e[t].startsWith("```");)i.push(e[t]),t++;t++,o.push(`<pre><code>${s(i.join(`
`))}</code></pre>`);continue}if(/^\d+\.\s+/.test(r)){const i=[];for(;t<e.length&&/^\d+\.\s+/.test(e[t]);)i.push(e[t].replace(/^\d+\.\s+/,"")),t++;o.push(`<ol>${i.map(p=>`<li>${c(p)}</li>`).join("")}</ol>`);continue}if(/^[-*]\s+/.test(r)){const i=[];for(;t<e.length&&/^[-*]\s+/.test(e[t]);)i.push(e[t].replace(/^[-*]\s+/,"")),t++;o.push(`<ul>${i.map(p=>`<li>${c(p)}</li>`).join("")}</ul>`);continue}if(/^\s*$/.test(r)){t++;continue}const d=[];for(;t<e.length&&!/^\s*$/.test(e[t])&&!/^#{1,4}\s/.test(e[t])&&!e[t].startsWith("|")&&!e[t].startsWith(">")&&!e[t].startsWith("```")&&!/^[-*]\s+/.test(e[t])&&!/^\d+\.\s+/.test(e[t])&&!/^---+\s*$/.test(e[t]);)d.push(e[t]),t++;o.push(`<p>${c(d.join(" "))}</p>`)}return o.join(`
`)}function h(n){return n.replace(/^\||\|$/g,"").split("|").map(e=>e.trim())}function b(n,e){return`<table>
    <thead><tr>${n.map(o=>`<th>${c(o)}</th>`).join("")}</tr></thead>
    <tbody>${e.map(o=>`<tr>${o.map(t=>`<td>${c(t)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`}function c(n){if(!n)return"";let e=s(n);return e=e.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer">$1</a>'),e=e.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>"),e=e.replace(/(^|[^_])_([^_\n]+)_(?!_)/g,"$1<em>$2</em>"),e=e.replace(/`([^`]+)`/g,"<code>$1</code>"),e}function s(n){return String(n??"").replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}export{$ as o};
