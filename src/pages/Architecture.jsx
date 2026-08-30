import { motion } from 'framer-motion';
import {
  AlertOctagon, BookmarkPlus, ChevronLeft, ClipboardCopy, DollarSign, Download,
  ExternalLink, Eye, FileImage, FileText, Layers, Link2, Pencil, Plus, RotateCcw, Save,
  Shield, Sparkles, Trash2, Wand2, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Markdown } from '../components/ai/Markdown.jsx';
import { StudioIntelligence } from '../components/architecture/StudioIntelligence.jsx';
import { FlowCanvas } from '../components/architecture/flow/FlowCanvas.jsx';
import { DrawioEmbed } from '../components/architecture/flow/DrawioEmbed.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ExpertReviewPanel } from '../components/expert-review/ExpertReviewPanel.jsx';
import { toPng, toSvg } from 'html-to-image';
import { useAI } from '../context/AIContext.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  CATEGORY_COLOR, PALETTE_CATEGORIES, SERVICE_PALETTE, TEMPLATES, getServiceDef,
} from '../data/archStudio.js';
import { architectureToDrawioXml, validateDrawioXml } from '../lib/drawioBridge.js';
import { cn, uid } from '../lib/utils.js';

const NODE_W = 124;
const NODE_H = 52;
const CANVAS_W = 1200;
const CANVAS_H = 700;

export default function Architecture() {
  const [params] = useSearchParams();
  const { state, saveDiagram, deleteDiagram, setCurrentDiagram, saveAINote } = useAI();
  const toast = useToast();
  const dialog = useDialog();

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [name, setName] = useState('Untitled diagram');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  // Legacy SVG fallback still renders node cursor/drag handlers even though
  // React Flow is the visible canvas. Keep its transient drag state scoped to
  // this page so merely opening Architecture Studio cannot throw a ReferenceError.
  const [dragState, setDragState] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [drawioOpen, setDrawioOpen] = useState(false);
  const [drawioXml, setDrawioXml] = useState(null);
  const [didMutate, setDidMutate] = useState(false);
  const [region, setRegion] = useState('us-east-1');

  const svgRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const currentId = state.currentDiagramId;
  const current = state.diagrams.find((d) => d.id === currentId) || null;

  // Load the most recently saved diagram on first mount
  useEffect(() => {
    const handoffServices = (params.get('services') || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (handoffServices.length > 0) {
      const seededNodes = handoffServices.map((serviceId, index) => ({
        id: uid(), serviceId,
        x: 90 + (index % 4) * 230,
        y: 100 + Math.floor(index / 4) * 150,
        label: null,
      }));
      setNodes(seededNodes);
      setEdges(seededNodes.slice(1).map((node, index) => ({ from: seededNodes[index].id, to: node.id, label: null, dashed: false })));
      setName(params.get('title') || 'Solution architecture');
      setRegion(params.get('region') || 'us-east-1');
      setCurrentDiagram(null);
      setDidMutate(true);
    } else if (current) loadFromDiagram(current);
    else if (state.diagrams.length > 0) {
      setCurrentDiagram(state.diagrams[state.diagrams.length - 1].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when active diagram changes
  useEffect(() => {
    if (current) loadFromDiagram(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  function loadFromDiagram(d) {
    setNodes(d.nodes || []);
    setEdges(d.edges || []);
    setName(d.name || 'Untitled diagram');
    setDrawioXml(validateDrawioXml(d.drawioXml).valid ? d.drawioXml : null);
    setRegion(d.region || 'us-east-1');
    setSelectedNodeId(null);
    setConnectingFrom(null);
    setDidMutate(false);
  }

  // -------- canvas helpers --------

  const svgPoint = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: clientX, y: clientY };
    const inv = m.inverse();
    const t = pt.matrixTransform(inv);
    return { x: t.x, y: t.y };
  };

  const addNode = (serviceId, x = 80, y = 80) => {
    const id = uid();
    setNodes((arr) => [...arr, { id, serviceId, x, y, label: null }]);
    setSelectedNodeId(id);
    setDidMutate(true);
  };

  const removeNode = (id) => {
    setNodes((arr) => arr.filter((n) => n.id !== id));
    setEdges((arr) => arr.filter((e) => e.from !== id && e.to !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
    setDidMutate(true);
  };

  const updateNode = (id, patch) => {
    setNodes((arr) => arr.map((n) => n.id === id ? { ...n, ...patch } : n));
    setDidMutate(true);
  };

  // Drag a node — record offset, listen to window
  const onNodeMouseDown = (e, n) => {
    e.stopPropagation();
    const p = svgPoint(e.clientX, e.clientY);
    setDragState({ nodeId: n.id, ox: p.x - n.x, oy: p.y - n.y });
    setSelectedNodeId(n.id);
  };

  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const p = svgPoint(e.clientX, e.clientY);
      setNodes((arr) => arr.map((n) =>
        n.id === dragState.nodeId
          ? { ...n, x: Math.round(p.x - dragState.ox), y: Math.round(p.y - dragState.oy) }
          : n));
    };
    const onUp = () => { setDragState(null); setDidMutate(true); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragState]);

  // Drag from palette into canvas (HTML5 drag)
  const onPaletteDragStart = (e, serviceId) => {
    e.dataTransfer.setData('text/plain', `svc:${serviceId}`);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const onCanvasDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; };
  const onCanvasDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    if (!data?.startsWith('svc:')) return;
    const p = svgPoint(e.clientX, e.clientY);
    addNode(data.slice(4), Math.round(p.x - NODE_W / 2), Math.round(p.y - NODE_H / 2));
  };

  // Connection mode: click a node to start, click another to finish
  const onNodeClick = (e, n) => {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== n.id) {
        setEdges((arr) => [...arr, { from: connectingFrom, to: n.id, label: null, dashed: false }]);
        setDidMutate(true);
        toast.info('Connected');
      }
      setConnectingFrom(null);
      return;
    }
    setSelectedNodeId(n.id);
  };

  const removeEdge = (i) => {
    setEdges((arr) => arr.filter((_, idx) => idx !== i));
    setDidMutate(true);
  };

  // -------- template + save + export --------

  const loadTemplate = (tpl) => {
    setNodes(tpl.nodes.map((n) => ({ ...n, id: n.id || uid() })));
    setEdges(tpl.edges.map((e) => ({ ...e })));
    setName(tpl.name);
    setSelectedNodeId(null);
    setConnectingFrom(null);
    setDidMutate(true);
    toast.success(`Loaded template: ${tpl.name}`);
  };

  const applyAIDiagram = ({ nodes: nn, edges: ee, description }) => {
    if (!nn || nn.length === 0) {
      toast.error('AI could not extract services — try a more specific description.');
      return;
    }
    setNodes(nn.map((n) => ({ ...n, id: n.id || uid() })));
    setEdges(ee.map((e) => ({ ...e })));
    if (description) {
      const short = description.slice(0, 40).replace(/\s+/g, ' ').trim();
      setName(`AI: ${short}${description.length > 40 ? '…' : ''}`);
    }
    setSelectedNodeId(null);
    setConnectingFrom(null);
    setDidMutate(true);
    toast.success(`Generated ${nn.length} services from description`);
  };

  const newDiagram = () => {
    setNodes([]); setEdges([]); setName('Untitled diagram');
    setSelectedNodeId(null); setConnectingFrom(null);
    setCurrentDiagram(null);
    setDrawioXml(null);
    setDidMutate(false);
  };

  const save = () => {
    const id = current?.id || uid();
    saveDiagram({ id, name, nodes, edges, drawioXml, region });
    setDidMutate(false);
    toast.success(`Saved "${name}"`);
  };

  const currentDrawioXml = () => {
    const saved = validateDrawioXml(drawioXml);
    return saved.valid ? saved.xml : architectureToDrawioXml(
      nodes, edges, name,
      (node) => getServiceDef(node.serviceId)?.label || node.serviceId || node.id,
    );
  };

  const exportDrawio = () => {
    download(`${safeFilename(name)}.drawio`, currentDrawioXml(), 'application/vnd.jgraph.mxfile');
    toast.success('Downloaded editable Draw.io file');
  };

  // Find the react-flow viewport element for screenshot export
  const findFlowViewport = () => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return null;
    return wrap.querySelector('.react-flow__viewport')?.parentElement
        || wrap.querySelector('.react-flow')
        || wrap;
  };

  const exportSVG = async () => {
    const el = findFlowViewport();
    if (!el) { toast.error('Canvas not ready.'); return; }
    try {
      const dataUrl = await toSvg(el, {
        backgroundColor: '#0A0E1A',
        filter: (node) => !node.classList?.contains('react-flow__minimap') && !node.classList?.contains('react-flow__controls'),
      });
      const blob = await (await fetch(dataUrl)).blob();
      download(`${name || 'diagram'}.svg`, blob, 'image/svg+xml');
      toast.success('Exported SVG');
    } catch (err) {
      toast.error('SVG export failed.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const exportPNG = async () => {
    const el = findFlowViewport();
    if (!el) { toast.error('Canvas not ready.'); return; }
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#0A0E1A',
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains('react-flow__minimap') && !node.classList?.contains('react-flow__controls'),
      });
      const blob = await (await fetch(dataUrl)).blob();
      download(`${name || 'diagram'}.png`, blob, 'image/png');
      toast.success('Exported PNG');
    } catch (err) {
      toast.error('PNG export failed.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const exportPDF = async () => {
    const el = findFlowViewport();
    if (!el) { toast.error('Canvas not ready.'); return; }
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains('react-flow__minimap') && !node.classList?.contains('react-flow__controls'),
      });
      const html =
`<!doctype html><html><head><title>${name}</title>
<style>body{margin:0;display:grid;place-items:center;min-height:100vh}
img{max-width:100%;height:auto}
@media print{@page{size:landscape}}</style></head>
<body><img src="${dataUrl}" alt="${name}" /><script>window.print()<\/script></body></html>`;
      const w = window.open('', '_blank');
      if (!w) { toast.error('Pop-up blocked — allow pop-ups to export PDF.'); return; }
      w.document.write(html); w.document.close();
    } catch (err) {
      toast.error('PDF export failed.');
      // eslint-disable-next-line no-console
      console.error(err);
    }
  };

  const shareURL = async () => {
    try {
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({
        v: 1, name, nodes, edges,
      }))));
      const url = new URL(window.location.href);
      url.searchParams.set('diagram', payload);
      await navigator.clipboard.writeText(url.toString());
      toast.success('Share link copied');
    } catch { toast.error('Share failed'); }
  };

  // -------- AI review + cost --------

  const cost = useMemo(() => estimateCost(nodes), [nodes]);
  const review = useMemo(() => reviewArchitecture(nodes, edges), [nodes, edges]);
  const proposal = useMemo(
    () => buildArchitectureProposal({ name, nodes, edges, region, cost, review }),
    [name, nodes, edges, region, cost, review],
  );

  const exportProposal = () => {
    download(`${safeFilename(name)}-architecture-proposal.md`, proposal, 'text/markdown;charset=utf-8');
    toast.success('Downloaded architecture proposal');
  };

  // -------- EXPERT-01 multi-agent review (derived from canvas) --------

  // Derive the inputs the 10 AWS experts expect from the current diagram.
  // services[]  — every unique serviceId actually placed on the canvas
  // brief       — a synthesized description so compliance/scale rules can fire
  // level       — inferred from node count (more services → senior tier)
  const expertInputs = useMemo(() => {
    const services = Array.from(new Set(nodes.map((n) => n.serviceId).filter(Boolean)));
    const hasUser     = services.includes('user') || services.includes('client') || services.includes('internet');
    const hasOnPrem   = services.includes('onprem') || services.includes('dx') || services.includes('vpn');
    const hasML       = services.some((s) => ['sagemaker', 'bedrock'].includes(s));
    const hasStream   = services.some((s) => ['kinesis', 'msk'].includes(s));
    const hasDB       = services.some((s) => ['rds', 'aurora', 'dynamodb', 'redshift', 'neptune'].includes(s));

    const briefParts = [
      `${name || 'Architecture diagram'} — unverified AWS design draft containing ${services.length} services and targeting ${region}.`,
      hasUser   && 'Customer-facing application accessed by end users over the internet.',
      hasOnPrem && 'Hybrid topology integrating on-premises infrastructure with AWS.',
      hasML     && 'ML/AI workload requires inference endpoints with predictable latency.',
      hasStream && 'Real-time event streaming pipeline with high throughput requirements.',
      hasDB     && 'Persistent data store backs the production workload.',
    ].filter(Boolean).join(' ');

    // Level heuristic: 1-5 = beginner, 6-12 = intermediate, 13+ = senior
    const level = services.length >= 13 ? 'senior'
                : services.length >= 6  ? 'intermediate'
                : 'beginner';

    return { brief: briefParts, services, region, level };
  }, [nodes, name, region]);

  // -------- filtered palette --------

  const visiblePalette = useMemo(() =>
    categoryFilter === 'all'
      ? SERVICE_PALETTE
      : SERVICE_PALETTE.filter((s) => s.category === categoryFilter),
    [categoryFilter]);

  // -------- render --------

  return (
    <div className="space-y-4">
      <Link to="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> AI hub
      </Link>

      <PageHeader
        eyebrow="Architecture Studio"
        title="Design clouds visually."
        subtitle="Build a reviewable AWS design, edit it in Draw.io, and download the diagram plus an evidence-first architecture proposal."
        icon={Layers}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setDidMutate(true); }}
              className="bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-bold focus-ring focus:border-aws-orange w-[200px]"
            />
            <button onClick={save} className="btn btn-primary !text-xs">
              <Save size={12} /> Save {didMutate && '*'}
            </button>
          </div>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[230px_1fr_320px]">
        {/* PALETTE */}
        <aside className="surface rounded-2xl p-3 flex flex-col gap-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden">
          <div>
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
              Templates
            </h3>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t)}
                  className="w-full text-left rounded-lg px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition focus-ring"
                  title={t.description}
                >
                  <div className="font-bold truncate">{t.name}</div>
                  <div className="text-[10px] text-muted truncate">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-1.5">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              AWS services
            </h3>
            <div className="flex flex-wrap gap-1">
              <FilterBtn active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All</FilterBtn>
              {PALETTE_CATEGORIES.map((c) => (
                <FilterBtn
                  key={c.id}
                  active={categoryFilter === c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  color={CATEGORY_COLOR[c.id]}
                >{c.label}</FilterBtn>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1 overflow-y-auto pr-1">
              {visiblePalette.map((s) => (
                <button
                  key={s.id}
                  draggable
                  onDragStart={(e) => onPaletteDragStart(e, s.id)}
                  onDoubleClick={() => addNode(s.id, 100, 100)}
                  title={`${s.label} (drag to canvas or double-click)`}
                  className="group rounded-lg border border-token bg-[var(--card-2)]/40 hover:border-aws-orange/40 hover:bg-[var(--card-2)] p-2 text-center focus-ring transition cursor-grab active:cursor-grabbing"
                  style={{ borderTopColor: CATEGORY_COLOR[s.category], borderTopWidth: 2 }}
                >
                  <div className="text-lg leading-none">{s.icon}</div>
                  <div className="text-[9px] font-bold mt-1 truncate">{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* CANVAS */}
        <div className="space-y-2">
          <div className="surface rounded-2xl p-2 flex flex-wrap items-center gap-1.5">
            <Toolbar
              connectingFrom={connectingFrom}
              setConnectingFrom={setConnectingFrom}
              selectedNodeId={selectedNodeId}
              removeNode={removeNode}
              onNew={newDiagram}
              onSave={save}
              onSVG={exportSVG} onPNG={exportPNG} onPDF={exportPDF}
              onDrawioDownload={exportDrawio} onProposal={exportProposal}
              onShare={shareURL}
              onReview={() => setReviewOpen(true)}
              onExpertReview={() => {
                if (expertInputs.services.length === 0) {
                  toast.info('Drop some AWS services on the canvas first — the experts need something to review.');
                  return;
                }
                setExpertOpen(true);
              }}
              hasNodes={nodes.length > 0}
              onDrawio={() => setDrawioOpen(true)}
            />
          </div>

          <div ref={canvasWrapRef} className="surface rounded-2xl overflow-hidden">
            <div className="relative h-[640px] bg-[radial-gradient(circle_at_1px_1px,rgba(148,163,184,0.12)_1px,transparent_0)] [background-size:24px_24px]">
              <FlowCanvas
                nodes={nodes}
                edges={edges}
                onChange={(n, e) => {
                  setNodes(n);
                  setEdges(e);
                  setDidMutate(true);
                }}
                onSelectionChange={(ids) => setSelectedNodeId(ids[0] || null)}
              />
              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-lg font-extrabold text-muted">Drag AWS services from the palette, or load a template.</div>
                    <div className="text-xs text-muted mt-1">Drag from any node handle to connect. Scroll to zoom. Drag background to pan.</div>
                  </div>
                </div>
              )}
            </div>
            {/* legacy SVG fallback (kept hidden — used only as a sentinel for older code paths) */}
            <div className="hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                className="w-1 h-1"
              >
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="#FF9900" />
                  </marker>
                  <marker id="arr-d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                    <path d="M0,0 L10,5 L0,10 z" fill="#94A3B8" />
                  </marker>
                </defs>

                {/* edges */}
                {edges.map((e, i) => {
                  const a = nodes.find((n) => n.id === e.from);
                  const b = nodes.find((n) => n.id === e.to);
                  if (!a || !b) return null;
                  const dx = b.x - a.x, dy = b.y - a.y;
                  const norm = Math.sqrt(dx * dx + dy * dy) || 1;
                  const ox = (dx / norm) * (NODE_W / 2);
                  const oy = (dy / norm) * (NODE_H / 2);
                  const sx = a.x + ox, sy = a.y + oy;
                  const tx = b.x - ox, ty = b.y - oy;
                  const mx = (sx + tx) / 2, my = (sy + ty) / 2;
                  return (
                    <g key={i} onDoubleClick={() => removeEdge(i)} className="cursor-pointer">
                      <path
                        d={`M ${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}`}
                        fill="none"
                        stroke={e.dashed ? '#94A3B8' : '#FF9900'}
                        strokeWidth={1.8}
                        strokeDasharray={e.dashed ? '5 5' : undefined}
                        markerEnd={`url(#${e.dashed ? 'arr-d' : 'arr'})`}
                      />
                      {e.label && (
                        <text x={mx} y={my - 6} textAnchor="middle"
                              style={{ fontSize: 10, fontWeight: 700, fill: e.dashed ? '#94A3B8' : '#FF9900' }}>
                          {e.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* nodes */}
                {nodes.map((n) => {
                  const def = getServiceDef(n.serviceId);
                  if (!def) return null;
                  const color = CATEGORY_COLOR[def.category];
                  const isSel = selectedNodeId === n.id;
                  const isConn = connectingFrom === n.id;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}
                      onMouseDown={(e) => onNodeMouseDown(e, n)}
                      onClick={(e) => onNodeClick(e, n)}
                      style={{ cursor: dragState?.nodeId === n.id ? 'grabbing' : 'grab' }}
                    >
                      <rect
                        width={NODE_W} height={NODE_H} rx={10}
                        fill="var(--card)" stroke={isSel || isConn ? '#FF9900' : color}
                        strokeWidth={isSel || isConn ? 2.5 : 1.4}
                      />
                      <text x={14} y={NODE_H / 2 + 2} style={{ fontSize: 18 }}>{def.icon}</text>
                      <text x={38} y={NODE_H / 2 - 2}
                            style={{ fontSize: 11, fontWeight: 800, fill: 'var(--text)' }}>
                        {def.label}
                      </text>
                      {n.label && (
                        <text x={38} y={NODE_H / 2 + 12}
                              style={{ fontSize: 9, fontWeight: 700, fill: 'var(--text-2)' }}>
                          {n.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* hint when empty */}
                {nodes.length === 0 && (
                  <g>
                    <text x={CANVAS_W / 2} y={CANVAS_H / 2 - 10} textAnchor="middle"
                          style={{ fontSize: 18, fontWeight: 800, fill: 'var(--text-2)' }}>
                      Drag AWS services from the palette, or load a template.
                    </text>
                    <text x={CANVAS_W / 2} y={CANVAS_H / 2 + 18} textAnchor="middle"
                          style={{ fontSize: 12, fontWeight: 600, fill: 'var(--text-2)' }}>
                      Click a node to select. Use the link button to connect two nodes.
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </div>

          <div className="text-[11px] text-muted px-1">
            Tip: double-click an arrow to delete it. Double-click a palette item to drop it onto the canvas.
            {selectedNodeId && (
              <span className="ml-3">
                Selected — <button
                  onClick={async () => {
                    const n = nodes.find((x) => x.id === selectedNodeId);
                    if (!n) return;
                    const label = await dialog.prompt({
                      title: 'Label this node',
                      description: 'Leave blank to remove the label.',
                      placeholder: 'e.g. Web AZ-A',
                      defaultValue: n.label || '',
                      confirmLabel: 'Set label',
                    });
                    if (label !== null) updateNode(selectedNodeId, { label: label.trim() || null });
                  }}
                  className="text-aws-orange font-bold hover:underline"
                >rename</button>
                {' · '}
                <button
                  onClick={() => removeNode(selectedNodeId)}
                  className="text-danger font-bold hover:underline"
                >delete</button>
              </span>
            )}
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-3">
          {/* Stage 11 — AI generator + intelligence (Well-Architected, Cost, Security, Anti-patterns) */}
          <StudioIntelligence
            nodes={nodes}
            edges={edges}
            onApplyDiagram={applyAIDiagram}
            region={region}
            onRegionChange={setRegion}
          />

          {/* Cost */}
          <div className="surface rounded-2xl p-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 flex items-center gap-1.5">
              <DollarSign size={11} /> Cost estimate
            </h3>
            <div className="text-2xl font-black tabular-nums">${cost.total}<span className="text-sm text-muted">/mo</span></div>
            <p className="text-[11px] text-muted mt-1">Rough baseline. Actuals depend on traffic + storage.</p>
            {cost.lines.length > 0 && (
              <ul className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
                {cost.lines.map((l, i) => (
                  <li key={i} className="flex items-center justify-between text-[11px]">
                    <span className="truncate">{l.label}</span>
                    <span className="font-bold tabular-nums">${l.cost}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI Review summary */}
          <div className="surface rounded-2xl p-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 flex items-center gap-1.5">
              <Wand2 size={11} /> AI review
            </h3>
            <div className="text-3xl font-black text-gradient">{review.score}<span className="text-sm">/100</span></div>
            <div className="text-[11px] font-bold text-muted">{review.tagline}</div>
            <button onClick={() => setReviewOpen(true)} className="btn btn-ghost !text-xs w-full mt-3">
              <Eye size={12} /> See full review
            </button>
          </div>

          {/* Saved diagrams */}
          <div className="surface rounded-2xl p-4">
            <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
              Saved diagrams ({state.diagrams.length})
            </h3>
            {state.diagrams.length === 0 ? (
              <p className="text-[11px] text-muted">Your saved diagrams appear here.</p>
            ) : (
              <ul className="space-y-1">
                {state.diagrams.map((d) => (
                  <li key={d.id} className="group flex items-center gap-1">
                    <button
                      onClick={() => setCurrentDiagram(d.id)}
                      className={cn(
                        'flex-1 text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition truncate',
                        d.id === currentId && 'bg-aws-orange/10 text-aws-orange font-bold'
                      )}
                    >{d.name}</button>
                    <button
                      onClick={async () => {
                        const ok = await dialog.confirm({
                          title: 'Delete diagram?',
                          description: d.name,
                          danger: true,
                        });
                        if (ok) deleteDiagram(d.id);
                      }}
                      className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                      aria-label={`Delete diagram ${d.name}`}
                    ><Trash2 size={11} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* AI review modal */}
      {reviewOpen && (
        <ReviewModal review={review} onClose={() => setReviewOpen(false)}
                     onSave={() => { saveAINote('architecture-review', review.text); toast.success('Saved to AI notes'); }} />
      )}

      {/* EXPERT-01 multi-agent review modal */}
      {expertOpen && (
        <ExpertReviewModal
          inputs={expertInputs}
          onClose={() => setExpertOpen(false)}
        />
      )}

      {/* draw.io full-screen editor */}
      <DrawioEmbed
        open={drawioOpen}
        onClose={() => setDrawioOpen(false)}
        diagramName={name}
        nodes={nodes}
        edges={edges}
        initialXml={drawioXml}
        onSaveXml={(xml) => {
          setDrawioXml(xml);
          const id = current?.id || uid();
          saveDiagram({ id, name, nodes, edges, drawioXml: xml, region });
          setDidMutate(false);
          toast.success('Saved draw.io edits with this diagram.');
        }}
      />
    </div>
  );
}

// ---------- Expert review modal (10 AWS agents) ----------

function ExpertReviewModal({ inputs, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-[var(--card-1)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 grid place-items-center w-8 h-8 rounded-full hover:bg-[var(--card-2)] focus-ring"
          aria-label="Close expert review"
        >
          <X size={16} />
        </button>
        <div className="p-2">
          <ExpertReviewPanel
            brief={inputs.brief}
            services={inputs.services}
            region={inputs.region}
            level={inputs.level}
          />
        </div>
      </div>
    </div>
  );
}

// ---------- toolbar ----------

function Toolbar({
  connectingFrom, setConnectingFrom, selectedNodeId, removeNode,
  onNew, onSave, onSVG, onPNG, onPDF, onDrawioDownload, onProposal,
  onShare, onReview, onExpertReview, hasNodes, onDrawio,
}) {
  return (
    <>
      <TBtn onClick={onNew} icon={Plus} label="New" />
      <TBtn onClick={() => selectedNodeId && removeNode(selectedNodeId)} icon={Trash2} label="Delete" disabled={!selectedNodeId} />
      <TBtn onClick={onDrawio} icon={ExternalLink} label="Open in draw.io" disabled={!hasNodes} />
      <div className="ml-auto flex items-center gap-1">
        <TBtn onClick={onDrawioDownload} icon={Download} label=".drawio" disabled={!hasNodes} />
        <TBtn onClick={onProposal} icon={FileText} label="Proposal" disabled={!hasNodes} />
        <TBtn onClick={onPNG} icon={FileImage} label="PNG" />
        <TBtn onClick={onSVG} icon={Download} label="SVG" />
        <TBtn onClick={onPDF} icon={FileText} label="PDF" />
        <TBtn onClick={onShare} icon={Link2} label="Share" />
        <TBtn onClick={onReview} icon={Sparkles} label="AI review" />
        <TBtn onClick={onExpertReview} icon={Shield} label="10 Architects" disabled={!hasNodes} primary />
      </div>
    </>
  );
}

function TBtn({ onClick, icon: Icon, label, active, disabled, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition focus-ring',
        primary && 'bg-gradient-aws text-ink-950 shadow-glow-orange',
        !primary && active && 'bg-aws-orange/15 text-aws-orange',
        !primary && !active && !disabled && 'hover:bg-[var(--card-2)]',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

function FilterBtn({ active, onClick, color, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md px-1.5 py-1 text-[10px] font-bold transition border',
        active
          ? 'bg-aws-orange/15 text-aws-orange border-aws-orange/40'
          : 'border-token text-muted hover:text-current'
      )}
      style={color && active ? { borderColor: color, color } : undefined}
    >{children}</button>
  );
}

// ---------- heuristic AI review + cost ----------

function reviewArchitecture(nodes, edges) {
  if (nodes.length === 0) return { score: 0, tagline: 'Empty canvas', text: 'Drop some services first.' };

  const hasService = (id) => nodes.some((n) => n.serviceId === id);
  const hasAny = (ids) => ids.some(hasService);

  const positives = [];
  const findings = [];

  // Reliability
  const computeCount = nodes.filter((n) => ['ec2', 'ecs', 'eks', 'fargate', 'lambda'].includes(n.serviceId)).length;
  const hasLB = hasAny(['alb', 'nlb']);
  const hasASG = hasService('asg');
  const hasMultiAZHint = nodes.filter((n) => n.serviceId === 'ec2').length >= 2;
  if (hasLB) positives.push('Load balancer present — good for high availability.');
  if (hasASG || hasMultiAZHint) positives.push('Multi-instance compute — survives single-node failure.');
  if (computeCount > 0 && !hasLB && !hasService('cloudfront') && !hasService('apigateway'))
    findings.push({ kind: 'reliability', text: 'Compute without an entry-point service (ALB/CloudFront/API Gateway). Consider adding one.' });

  // Security
  if (hasService('s3') && !hasService('cloudfront'))
    findings.push({ kind: 'security', text: 'S3 likely needs CloudFront in front (or Block Public Access verified).' });
  if (hasService('ec2') && !hasService('iam'))
    findings.push({ kind: 'security', text: 'No IAM role icon — confirm EC2 instances use instance profiles, not access keys.' });
  if (hasAny(['rds', 'aurora']) && !hasService('secretsmgr'))
    findings.push({ kind: 'security', text: 'Database in scope — store credentials in Secrets Manager, not env vars.' });
  if (!hasService('kms') && hasAny(['s3', 'rds', 'aurora', 'dynamodb', 'ebs']))
    findings.push({ kind: 'security', text: 'No KMS shown — for compliance, use Customer Managed Keys for encryption.' });
  if (hasService('cloudtrail')) positives.push('CloudTrail present — audit-ready.');

  // Cost
  if (nodes.filter((n) => n.serviceId === 'nat').length === 1 && computeCount >= 2)
    findings.push({ kind: 'cost', text: 'Single NAT Gateway across multiple AZs — single point of failure. Add one per AZ for prod.' });
  if (hasService('eks') && computeCount < 3)
    findings.push({ kind: 'cost', text: 'EKS for a single workload is expensive ($73/mo control plane). Consider ECS Fargate for small workloads.' });
  if (hasService('redshift') && computeCount === 0 && !hasAny(['s3']))
    findings.push({ kind: 'cost', text: 'Redshift alone is $200+/mo. For ad-hoc analytics, S3 + Athena is far cheaper.' });

  // Operational
  if (!hasService('cloudwatch'))
    findings.push({ kind: 'ops', text: 'No CloudWatch icon — every workload should have metrics + alarms.' });
  if (computeCount > 0 && !hasAny(['codepipeline', 'codedeploy']))
    findings.push({ kind: 'ops', text: 'No CI/CD pipeline shown — deploys should be automated, not click-ops.' });

  // Connectivity
  const isolated = nodes.filter((n) => !edges.some((e) => e.from === n.id || e.to === n.id));
  if (isolated.length > 0)
    findings.push({ kind: 'design', text: `${isolated.length} node(s) not connected to anything. Connect them or remove.` });

  // Antipatterns
  if (hasService('ec2') && nodes.some((n) => n.serviceId === 'ec2' && !edges.some((e) => e.to === n.id)))
    findings.push({ kind: 'design', text: 'EC2 instance with no inbound traffic. Intentional?' });

  // Score: start at 100, lose 8 per finding (capped at 0), add 2 per positive
  let score = 100 - findings.length * 8 + positives.length * 2;
  score = Math.max(20, Math.min(100, score));

  const text =
`# Architecture review

**Score: ${score}/100**

## What\'s working
${positives.length ? positives.map((p) => `- ${p}`).join('\n') : '_No standout positives yet._'}

## Findings
${findings.length
  ? findings.map((f, i) => `${i + 1}. **[${f.kind}]** ${f.text}`).join('\n')
  : '_No major issues found._'}

## Well-Architected pillars
- **Reliability:** ${hasLB || hasASG || hasMultiAZHint ? '✓ Multi-instance or LB present' : '✗ No clear HA pattern'}
- **Security:** ${hasService('iam') && hasService('kms') ? '✓ IAM + KMS in design' : '⚠ Add IAM + KMS for completeness'}
- **Cost optimization:** ${nodes.filter((n) => n.serviceId === 'nat').length} NAT, ${computeCount} compute
- **Performance:** ${hasService('cloudfront') ? '✓ CDN present' : '⚠ Consider CloudFront for public traffic'}
- **Operational:** ${hasService('cloudwatch') ? '✓ Observability shown' : '✗ Add CloudWatch'}

## Recommended next moves
${recommendations(nodes, hasService).map((r) => `- ${r}`).join('\n')}`;

  const tagline =
    score >= 85 ? 'Strong design — minor polish.' :
    score >= 65 ? 'Solid foundation, a few gaps.' :
    score >= 45 ? 'Workable but missing essentials.' :
                  'Significant gaps — see findings.';

  return { score, tagline, text };
}

function recommendations(nodes, hasService) {
  const out = [];
  if (!hasService('cloudwatch')) out.push('Add CloudWatch for metrics + alarms.');
  if (!hasService('iam')) out.push('Add IAM role / instance profile.');
  if (!hasService('kms')) out.push('Add KMS for encryption.');
  if (!hasService('cloudtrail')) out.push('Add CloudTrail to capture every API call.');
  if (nodes.length > 4 && !hasService('cloudfront')) out.push('Consider CloudFront for global edge caching.');
  if (out.length === 0) out.push('Looks complete — add cost tags + a runbook.');
  return out;
}

function estimateCost(nodes) {
  const total = nodes.reduce((a, n) => a + (getServiceDef(n.serviceId)?.monthlyEst || 0), 0);
  // Top-5 cost lines
  const lines = nodes
    .map((n) => ({ label: getServiceDef(n.serviceId)?.label || n.serviceId, cost: getServiceDef(n.serviceId)?.monthlyEst || 0 }))
    .filter((l) => l.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8);
  return { total: Math.round(total), lines };
}

export function buildArchitectureProposal({ name, nodes = [], edges = [], region, cost, review }) {
  const services = Array.from(new Set(nodes
    .map((node) => getServiceDef(node.serviceId)?.label || node.serviceId)
    .filter(Boolean)));
  const disconnected = nodes.filter((node) => !edges.some((edge) => edge.from === node.id || edge.to === node.id));
  return `# ${name || 'AWS Architecture'} — Architecture Proposal

> **Status: design draft — not deployment evidence.** Client requirements, AWS quotas, pricing, security controls, data classification, recovery objectives, and acceptance criteria must be confirmed before implementation.

## Executive summary
This document describes the current visual design targeting **${region || 'region not selected'}**. It contains **${nodes.length} components** and **${edges.length} documented relationships**. It is suitable for discovery and review; it is not proof that resources were deployed or tested.

## Proposed services
${services.length ? services.map((service) => `- ${service}`).join('\n') : '- No services selected.'}

## Architecture quality review
- Heuristic review score: **${review?.score ?? 0}/100**
- Review summary: ${review?.tagline || 'Not reviewed'}
- Disconnected components requiring explanation: **${disconnected.length}**

## Cost position
- Static planning baseline: **$${cost?.total ?? 0}/month**
- This is not an AWS quote and does not prove Free Tier eligibility.
- Validate usage, region, data transfer, support, taxes, and current AWS pricing before client approval.

## Questions requiring client confirmation
1. What business outcome and measurable acceptance criteria define success?
2. What traffic, storage, concurrency, latency, availability, RTO, and RPO are required?
3. What data classifications, retention rules, residency, privacy, and compliance obligations apply?
4. Which AWS accounts, environments, domains, repositories, and third-party systems are in scope?
5. What budget ceiling, Free Tier expectations, timeline, maintenance, and support terms are approved?
6. Who approves architecture, security, cost, deployment, rollback, and final acceptance?

## Required validation evidence
- Client-approved requirements and assumptions
- AWS Well-Architected and threat-model review
- Current AWS Pricing Calculator estimate or equivalent documented calculation
- Infrastructure-as-code validation and peer review
- Staging deployment evidence, automated tests, security checks, and rollback test
- Client acceptance record and operations handover

## Next decision
Resolve the questions above, update the diagram, run the expert review, and only then create a separately reviewed deployment artifact.
`;
}

// ---------- review modal ----------

function ReviewModal({ review, onClose, onSave }) {
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative surface rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 gradient-border"
      >
        <button onClick={onClose} className="absolute top-3 right-3 rounded-md p-1.5 hover:bg-[var(--card-2)]">
          <X size={16} />
        </button>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-extrabold tracking-tight">AI Architecture review</h3>
          <span className={cn(
            'chip border font-extrabold text-sm',
            review.score >= 80 ? 'bg-success/10 text-success border-success/30' :
            review.score >= 60 ? 'bg-warning/10 text-warning border-warning/30' :
                                  'bg-danger/10 text-danger border-danger/30',
          )}>{review.score}/100</span>
        </div>
        <Markdown source={review.text} />
        <div className="mt-4 flex flex-wrap gap-2 print:hidden">
          <button
            onClick={async () => { try { await navigator.clipboard.writeText(review.text); } catch {} }}
            className="btn btn-ghost !text-xs"
          ><ClipboardCopy size={12} /> Copy</button>
          <button onClick={onSave} className="btn btn-ghost !text-xs">
            <BookmarkPlus size={12} /> Save to notes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- download helper ----------

function download(filename, content, mimeType) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeFilename(value) {
  return String(value || 'aws-architecture').trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'aws-architecture';
}
