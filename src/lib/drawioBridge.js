/** Security and consistency helpers for the diagrams.net embed boundary. */
export const DRAWIO_ORIGIN = 'https://embed.diagrams.net';
export const MAX_DRAWIO_XML_BYTES = 5 * 1024 * 1024;

export function escapeDrawioXml(value) {
  return String(value ?? '').replace(/[<>&'"]/g, (char) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[char]));
}

export function validateDrawioXml(value) {
  if (typeof value !== 'string') return { valid: false, reason: 'Diagram data is not text.' };
  const xml = value.trim();
  if (!xml) return { valid: false, reason: 'Diagram data is empty.' };
  if (new TextEncoder().encode(xml).byteLength > MAX_DRAWIO_XML_BYTES) return { valid: false, reason: 'Diagram exceeds the 5 MB safety limit.' };
  if (/<!DOCTYPE|<!ENTITY|<script\b|javascript\s*:/i.test(xml)) return { valid: false, reason: 'Diagram contains unsafe XML content.' };
  if (!/^(?:<\?xml[^>]*>\s*)?<mxfile(?:\s|>)/i.test(xml)) return { valid: false, reason: 'Diagram is not a diagrams.net mxfile document.' };
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror') || doc.documentElement?.nodeName !== 'mxfile') return { valid: false, reason: 'Diagram XML is malformed.' };
  } else if (!/<\/mxfile>\s*$/i.test(xml)) return { valid: false, reason: 'Diagram XML is incomplete.' };
  return { valid: true, xml };
}

export function normalizeArchitecture(nodes = [], edges = []) {
  const safeNodes = [];
  const ids = new Set();
  for (const node of Array.isArray(nodes) ? nodes : []) {
    const id = String(node?.id ?? '').trim();
    if (!id || ids.has(id)) continue;
    ids.add(id);
    safeNodes.push({ ...node, id });
  }
  const safeEdges = [];
  const edgeKeys = new Set();
  for (const edge of Array.isArray(edges) ? edges : []) {
    const from = String(edge?.from ?? '').trim();
    const to = String(edge?.to ?? '').trim();
    const key = `${from}\u0000${to}`;
    if (!ids.has(from) || !ids.has(to) || from === to || edgeKeys.has(key)) continue;
    edgeKeys.add(key);
    safeEdges.push({ ...edge, from, to });
  }
  return { nodes: safeNodes, edges: safeEdges };
}

export function architectureToDrawioXml(nodes, edges, name = 'AWS architecture', getLabel = (node) => node.serviceId) {
  const normalized = normalizeArchitecture(nodes, edges);
  const xmlNodes = normalized.nodes.map((node, index) => {
    const label = getLabel(node) || node.serviceId || node.id;
    const x = Number.isFinite(node.x) ? node.x : 40 + (index % 6) * 160;
    const y = Number.isFinite(node.y) ? node.y : 40 + Math.floor(index / 6) * 100;
    return `<mxCell id="${escapeDrawioXml(node.id)}" value="${escapeDrawioXml(label)}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1f2937;strokeColor=#FF9900;fontColor=#ffffff;fontSize=12;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="120" height="60" as="geometry"/></mxCell>`;
  }).join('\n');
  const xmlEdges = normalized.edges.map((edge, index) => `<mxCell id="edge-${index}" style="endArrow=classic;html=1;rounded=1;strokeColor=#FF9900;" edge="1" parent="1" source="${escapeDrawioXml(edge.from)}" target="${escapeDrawioXml(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`).join('\n');
  return `<mxfile host="aws-career-launchpad-pro"><diagram name="${escapeDrawioXml(name)}"><mxGraphModel grid="1" gridSize="10" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${xmlNodes}${xmlEdges}</root></mxGraphModel></diagram></mxfile>`;
}
