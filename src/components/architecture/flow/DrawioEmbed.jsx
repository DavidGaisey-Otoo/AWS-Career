/**
 * DrawioEmbed.jsx — full-screen modal that embeds the official
 * draw.io / diagrams.net editor.
 *
 * Uses the public embed mode at embed.diagrams.net with bidirectional
 * postMessage so the user gets the full draw.io power without leaving
 * the app. We send the current diagram as draw.io XML when the iframe
 * loads, and capture the user's saved XML when they hit Save.
 *
 * Saved XML is stored alongside the diagram and can be re-opened to
 * resume editing in draw.io.
 *
 * Reference: https://www.drawio.com/doc/faq/embed-mode
 */

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { getServiceDef } from '../../../data/archStudio.js';
import { DRAWIO_ORIGIN, normalizeArchitecture, validateDrawioXml } from '../../../lib/drawioBridge.js';

// Build the embed URL — we want the AWS shape library auto-loaded
// and the "save" button to post back to us instead of saving to disk.
const EMBED_URL = 'https://embed.diagrams.net/?embed=1&ui=dark&spin=1&modified=unsavedChanges&proto=json&saveAndExit=1&libraries=1';

// ════════════════════════════════════════════════════════════════════
// Convert our internal {nodes, edges} → minimal draw.io XML
// ════════════════════════════════════════════════════════════════════
function nodesToDrawioXml(nodes, edges, name = 'AWS architecture') {
  // The app's graph is canonical: do not export dangling or duplicated
  // relationships that cannot correspond to deployable infrastructure.
  ({ nodes, edges } = normalizeArchitecture(nodes, edges));
  // Tile each node into a default grid if positions aren't sensible
  const xmlNodes = nodes.map((n, i) => {
    const def = getServiceDef(n.serviceId);
    const label = def?.label || n.serviceId;
    const x = Number.isFinite(n.x) ? n.x : 40 + (i % 6) * 160;
    const y = Number.isFinite(n.y) ? n.y : 40 + Math.floor(i / 6) * 100;
    return `<mxCell id="${escapeXml(n.id)}" value="${escapeXml(label)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1f2937;strokeColor=#FF9900;fontColor=#ffffff;fontSize=12;" vertex="1" parent="1">
      <mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry"/>
    </mxCell>`;
  }).join('\n');

  const xmlEdges = edges.map((e, i) => `<mxCell id="edge-${i}" style="endArrow=classic;html=1;rounded=1;strokeColor=#FF9900;" edge="1" parent="1" source="${escapeXml(e.from)}" target="${escapeXml(e.to)}">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>`).join('\n');

  return `<mxfile host="aws-career-launchpad-pro">
  <diagram name="${escapeXml(name)}">
    <mxGraphModel grid="1" gridSize="10" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${xmlNodes}
        ${xmlEdges}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

function escapeXml(s) {
  return String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

// ════════════════════════════════════════════════════════════════════
export function DrawioEmbed({
  open,
  onClose,
  diagramName = 'AWS architecture',
  nodes = [],
  edges = [],
  initialXml = null,
  onSaveXml,
}) {
  const iframeRef = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  // Listen for messages from the embedded draw.io
  useEffect(() => {
    if (!open) return;
    const handler = (event) => {
      // Messages are commands. Accept them only from this exact editor frame,
      // never from another tab, extension, or unrelated iframe.
      if (event.origin !== DRAWIO_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (typeof event.data !== 'string') return;
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      switch (msg.event) {
        case 'init':
          // Send the current XML to draw.io to load
          setStatus('ready');
          {
            const saved = initialXml ? validateDrawioXml(initialXml) : null;
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              action: 'load',
              // Invalid legacy content is never sent across the trust boundary;
              // reconstruct the diagram from the app's canonical node graph.
              xml: saved?.valid ? saved.xml : nodesToDrawioXml(nodes, edges, diagramName),
              autosave: 0,
            }),
            DRAWIO_ORIGIN
          );
          }
          break;

        case 'save':
          // User hit Save in draw.io — capture XML, keep editor open
          {
            const saved = validateDrawioXml(msg.xml);
            if (saved.valid) onSaveXml?.(saved.xml);
            else setStatus('error');
          }
          break;

        case 'exit':
          // User hit Save & Exit — capture + close
          if (msg.xml) {
            const saved = validateDrawioXml(msg.xml);
            if (!saved.valid) { setStatus('error'); break; }
            onSaveXml?.(saved.xml);
          }
          onClose?.();
          break;

        default:
          break;
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [open, initialXml, nodes, edges, diagramName, onSaveXml, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col" role="dialog" aria-modal="true">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--card-1)] border-b border-token">
        <div className="flex items-center gap-2">
          <ExternalLink size={14} className="text-aws-orange" />
          <span className="text-sm font-extrabold">Editing in draw.io</span>
          <span className="text-[11px] opacity-60">·</span>
          <span className="text-[11.5px] opacity-80">{diagramName}</span>
          <span className="text-[11px] opacity-60 ml-2">
            {status === 'loading' && '(loading editor…)'}
            {status === 'ready'   && '(use draw.io\'s Save → returns here)'}
            {status === 'error'   && '(invalid diagram blocked — your previous version is unchanged)'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="grid place-items-center w-8 h-8 rounded-full hover:bg-[var(--card-2)] focus-ring"
          aria-label="Close draw.io editor"
        >
          <X size={16} />
        </button>
      </div>

      {/* The iframe — fills the rest of the viewport */}
      <iframe
        ref={iframeRef}
        title="draw.io editor"
        src={EMBED_URL}
        className="flex-1 w-full border-0 bg-[#1e1e1e]"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  );
}
