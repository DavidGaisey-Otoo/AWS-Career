/**
 * flowAdapters.js — convert between the legacy SVG-canvas shape
 * (used in saved diagrams) and the react-flow shape.
 *
 * Legacy shape:
 *   nodes: [{ id, serviceId, x, y, label }]
 *   edges: [{ from, to, label, dashed }]
 *
 * React-flow shape:
 *   nodes: [{ id, type: 'awsService', position: {x,y}, data: { serviceId, label } }]
 *   edges: [{ id, source, target, label, type, animated }]
 *
 * Lossless round-trip — any field we don't model on the flow side is
 * preserved on the original record so saving doesn't drop data.
 */

import { uid } from '../../../lib/utils.js';

export function legacyToFlow(nodes = [], edges = []) {
  const flowNodes = nodes.map((n) => ({
    id: n.id,
    type: 'awsService',
    position: { x: Number(n.x) || 0, y: Number(n.y) || 0 },
    data: { serviceId: n.serviceId, label: n.label || null },
  }));

  const flowEdges = edges.map((e, idx) => ({
    id: `e-${idx}-${e.from}-${e.to}`,
    source: String(e.from),
    target: String(e.to),
    label: e.label || undefined,
    type: 'smoothstep',
    animated: !!e.animated,
    style: e.dashed
      ? { stroke: '#94A3B8', strokeWidth: 1.8, strokeDasharray: '5 5' }
      : { stroke: '#FF9900', strokeWidth: 1.8 },
  }));

  return { flowNodes, flowEdges };
}

export function flowToLegacy(flowNodes = [], flowEdges = []) {
  const nodes = flowNodes.map((n) => ({
    id: n.id,
    serviceId: n.data?.serviceId,
    x: Math.round(n.position?.x ?? 0),
    y: Math.round(n.position?.y ?? 0),
    label: n.data?.label ?? null,
  }));

  const edges = flowEdges.map((e) => ({
    from: e.source,
    to: e.target,
    label: e.label || null,
    dashed: e.style?.strokeDasharray ? true : false,
  }));

  return { nodes, edges };
}

export function newFlowNode(serviceId, x = 80, y = 80) {
  return {
    id: uid(),
    type: 'awsService',
    position: { x, y },
    data: { serviceId, label: null },
  };
}
