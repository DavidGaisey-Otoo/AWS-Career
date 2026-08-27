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
import { architectureToDrawioXml, DRAWIO_ORIGIN, validateDrawioXml } from '../../../lib/drawioBridge.js';

// Build the embed URL — we want the AWS shape library auto-loaded
// and the "save" button to post back to us instead of saving to disk.
const EMBED_URL = 'https://embed.diagrams.net/?embed=1&ui=dark&spin=1&modified=unsavedChanges&proto=json&saveAndExit=1&libraries=1';

// ════════════════════════════════════════════════════════════════════
// Convert our internal {nodes, edges} → minimal draw.io XML
// ════════════════════════════════════════════════════════════════════
function nodesToDrawioXml(nodes, edges, name = 'AWS architecture') {
  return architectureToDrawioXml(nodes, edges, name,
    (node) => getServiceDef(node.serviceId)?.label || node.serviceId || node.id);
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
