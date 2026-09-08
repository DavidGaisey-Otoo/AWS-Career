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
  const internal = normalized.nodes.filter((node) => !['user', 'client', 'internet', 'onprem', 'branch', 'firewall', 'switch'].includes(node.serviceId));
  const frameNodes = internal.length ? internal : normalized.nodes;
  const minX = Math.min(...frameNodes.map((node) => Number.isFinite(node.x) ? node.x : 40), 40) - 35;
  const minY = Math.min(...frameNodes.map((node) => Number.isFinite(node.y) ? node.y : 40), 40) - 55;
  const maxX = Math.max(...frameNodes.map((node) => (Number.isFinite(node.x) ? node.x : 40) + 120), 720) + 35;
  const maxY = Math.max(...frameNodes.map((node) => (Number.isFinite(node.y) ? node.y : 40) + 60), 320) + 55;
  const boundary = internal.length
    ? `<mxCell id="aws-cloud-boundary" value="AWS Cloud  |  ${escapeDrawioXml(name)}" style="swimlane;html=1;rounded=1;startSize=32;horizontal=1;fillColor=#ffffff;swimlaneFillColor=#f7fbff;strokeColor=#232f3e;fontColor=#232f3e;fontStyle=1;fontSize=14;" vertex="1" parent="1"><mxGeometry x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" as="geometry"/></mxCell>`
    : '';
  const xmlNodes = normalized.nodes.map((node, index) => {
    const label = getLabel(node) || node.serviceId || node.id;
    const x = Number.isFinite(node.x) ? node.x : 40 + (index % 6) * 160;
    const y = Number.isFinite(node.y) ? node.y : 40 + Math.floor(index / 6) * 100;
    const external = ['user', 'client', 'internet', 'onprem', 'branch', 'firewall', 'switch'].includes(node.serviceId);
    const fill = external ? '#f5f5f5' : '#ffffff';
    const stroke = external ? '#6b7280' : '#ff9900';
    return `<mxCell id="${escapeDrawioXml(node.id)}" value="&lt;b&gt;${escapeDrawioXml(label)}&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size:9px&quot;&gt;${escapeDrawioXml(node.label || node.serviceId || '')}&lt;/font&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};fontColor=#232f3e;fontSize=12;shadow=1;spacing=6;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="130" height="66" as="geometry"/></mxCell>`;
  }).join('\n');
  const xmlEdges = normalized.edges.map((edge, index) => `<mxCell id="edge-${index}" value="${escapeDrawioXml(edge.label || '')}" style="endArrow=classic;html=1;rounded=1;strokeColor=#232f3e;strokeWidth=2;fontSize=10;labelBackgroundColor=#ffffff;${edge.dashed ? 'dashed=1;' : ''}" edge="1" parent="1" source="${escapeDrawioXml(edge.from)}" target="${escapeDrawioXml(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`).join('\n');
  const panelY = maxY + 25;
  const panels = `<mxCell id="flow-panel" value="&lt;b&gt;How it works&lt;/b&gt;&lt;br&gt;Follow the arrows from users and external systems through security, networking, compute and data services." style="rounded=1;whiteSpace=wrap;html=1;fillColor=#f3f4f6;strokeColor=#9ca3af;fontColor=#232f3e;align=left;verticalAlign=top;spacing=10;" vertex="1" parent="1"><mxGeometry x="40" y="${panelY}" width="360" height="78" as="geometry"/></mxCell><mxCell id="review-panel" value="&lt;b&gt;Review before delivery&lt;/b&gt;&lt;br&gt;Availability  |  Security  |  Recovery  |  Monitoring  |  Cost  |  Teardown" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff7ed;strokeColor=#ff9900;fontColor=#232f3e;align=left;verticalAlign=top;spacing=10;" vertex="1" parent="1"><mxGeometry x="420" y="${panelY}" width="360" height="78" as="geometry"/></mxCell>`;
  return `<mxfile host="aws-career-launchpad-pro"><diagram name="${escapeDrawioXml(name)}"><mxGraphModel grid="1" gridSize="10" math="0" shadow="0" page="1" pageScale="1" pageWidth="1169" pageHeight="1654" background="#ffffff"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${boundary}${xmlNodes}${xmlEdges}${panels}</root></mxGraphModel></diagram></mxfile>`;
}
