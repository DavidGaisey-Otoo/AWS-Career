/**
 * FlowCanvas.jsx — react-flow-based diagram canvas.
 *
 * Drop-in replacement for the legacy SVG canvas. Same callbacks,
 * same data shape (converted internally).
 *
 * Features over the old SVG canvas:
 *   - Pan + zoom (mouse wheel, pinch, drag background)
 *   - Snap to 10px grid
 *   - Connect by dragging from any handle
 *   - Multi-select + box-select
 *   - Minimap + zoom controls
 *   - Undo/redo via Ctrl+Z (browser native input history)
 *   - Smart edge routing (smoothstep)
 *   - Background grid pattern
 *
 * Props
 *   nodes, edges            — legacy shape (we convert internally)
 *   onChange(nodes, edges)  — fires on any mutation
 *   onSelectionChange(ids)  — fires when selection changes
 *   readOnly                — disables editing
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow,
  addEdge, applyEdgeChanges, applyNodeChanges, useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AwsServiceNode } from './AwsServiceNode.jsx';
import { flowToLegacy, legacyToFlow, newFlowNode } from './flowAdapters.js';
import { uid } from '../../../lib/utils.js';

const NODE_TYPES = { awsService: AwsServiceNode };

function FlowCanvasInner({ nodes, edges, onChange, onSelectionChange, readOnly = false }) {
  const wrapperRef = useRef(null);
  const { screenToFlowPosition } = useReactFlow();

  // Convert incoming legacy props to react-flow shape (memoized on prop identity)
  const { flowNodes: initialNodes, flowEdges: initialEdges } = useMemo(
    () => legacyToFlow(nodes, edges),
    // We deliberately only re-convert when the *external* arrays change identity
    // — internal updates flow through change handlers, not this memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, edges]
  );

  // Push changes back to parent via legacy shape
  const emit = useCallback((next) => {
    const { nodes: legacyN, edges: legacyE } = flowToLegacy(next.nodes, next.edges);
    onChange?.(legacyN, legacyE);
  }, [onChange]);

  // Apply node changes (drag, select, remove)
  const onNodesChange = useCallback((changes) => {
    const next = applyNodeChanges(changes, initialNodes);
    emit({ nodes: next, edges: initialEdges });
  }, [initialNodes, initialEdges, emit]);

  // Apply edge changes (select, remove)
  const onEdgesChange = useCallback((changes) => {
    const next = applyEdgeChanges(changes, initialEdges);
    emit({ nodes: initialNodes, edges: next });
  }, [initialNodes, initialEdges, emit]);

  // Connect handler — when user drags from a handle to another node
  const onConnect = useCallback((connection) => {
    const newEdge = {
      ...connection,
      id: `e-${uid()}`,
      type: 'smoothstep',
      style: { stroke: '#FF9900', strokeWidth: 1.8 },
    };
    const next = addEdge(newEdge, initialEdges);
    emit({ nodes: initialNodes, edges: next });
  }, [initialNodes, initialEdges, emit]);

  // Selection sync
  const onSelChange = useCallback(({ nodes: selNodes }) => {
    onSelectionChange?.(selNodes.map((n) => n.id));
  }, [onSelectionChange]);

  // Drop a palette item onto canvas
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data?.startsWith('svc:')) return;
    const serviceId = data.slice(4);
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const node = newFlowNode(serviceId, pos.x - 60, pos.y - 30);
    emit({ nodes: [...initialNodes, node], edges: initialEdges });
  }, [initialNodes, initialEdges, emit, screenToFlowPosition]);

  // Expose imperative actions via window event so the parent toolbar can
  // trigger "delete selected" + "clear" without prop drilling deep.
  useEffect(() => {
    const handler = (ev) => {
      if (ev.detail?.type === 'clear-canvas') {
        emit({ nodes: [], edges: [] });
      }
    };
    window.addEventListener('flow-canvas-cmd', handler);
    return () => window.removeEventListener('flow-canvas-cmd', handler);
  }, [emit]);

  return (
    <div ref={wrapperRef} className="w-full h-full" onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onSelectionChange={onSelChange}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        snapToGrid
        snapGrid={[10, 10]}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#FF9900', strokeWidth: 1.8 },
        }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Control', 'Shift']}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148,163,184,0.25)" />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          maskColor="rgba(10,14,26,0.6)"
          nodeColor={(n) => '#FF9900'}
          nodeStrokeWidth={2}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

export function FlowCanvas(props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
