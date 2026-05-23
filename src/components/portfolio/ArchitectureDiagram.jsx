import { motion } from 'framer-motion';
import { getServiceMeta } from '../../data/projects.js';

/**
 * Renders an architecture diagram as SVG using positioned nodes + curved
 * edges. Each project supplies its own node coordinates so the layout is
 * deliberately curated, not auto-laid-out.
 */
export function ArchitectureDiagram({ architecture, className = '' }) {
  const { nodes, edges } = architecture;
  const NODE_W = 132;
  const NODE_H = 52;
  // Compute viewBox padding around nodes
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - NODE_W / 2 - 16;
  const maxX = Math.max(...xs) + NODE_W / 2 + 16;
  const minY = Math.min(...ys) - NODE_H / 2 - 24;
  const maxY = Math.max(...ys) + NODE_H / 2 + 24;

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const arrowId = `arrow-${Math.random().toString(36).slice(2, 8)}`;
  const arrowDashedId = `${arrowId}-d`;

  return (
    <div className={`w-full overflow-x-auto -mx-2 px-2 ${className}`}>
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full min-w-[640px] max-h-[360px]"
      >
        <defs>
          <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#FF9900" />
          </marker>
          <marker id={arrowDashedId} viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#94A3B8" />
          </marker>
          <linearGradient id="grad-card" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"  stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
          </linearGradient>
        </defs>

        {/* edges first so nodes draw over them */}
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          if (!a || !b) return null;
          const sx = a.x;
          const sy = a.y;
          const tx = b.x;
          const ty = b.y;
          const mx = (sx + tx) / 2;
          const my = (sy + ty) / 2;
          const dx = tx - sx;
          const dy = ty - sy;
          const norm = Math.sqrt(dx * dx + dy * dy) || 1;
          // small offset so arrows end at the edge of the node card
          const ox = (dx / norm) * (NODE_W / 2);
          const oy = (dy / norm) * (NODE_H / 2);
          const path = `M ${sx + ox} ${sy + oy} Q ${mx} ${my} ${tx - ox} ${ty - oy}`;
          const marker = e.dashed ? arrowDashedId : arrowId;
          return (
            <g key={i}>
              <motion.path
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.04, ease: 'easeOut' }}
                d={path}
                fill="none"
                stroke={e.dashed ? '#94A3B8' : '#FF9900'}
                strokeWidth={1.8}
                strokeDasharray={e.dashed ? '5 5' : undefined}
                strokeLinecap="round"
                markerEnd={`url(#${marker})`}
              />
              {e.label && (
                <text x={mx} y={my - 6} textAnchor="middle"
                      className="fill-current"
                      style={{ fontSize: 10, fontWeight: 700, fill: e.dashed ? '#94A3B8' : '#FF9900' }}>
                  {e.label}
                </text>
              )}
            </g>
          );
        })}

        {/* nodes */}
        {nodes.map((n, i) => {
          const meta = n.service ? getServiceMeta(n.service) : null;
          const color = meta?.color || '#94A3B8';
          return (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              transform={`translate(${n.x - NODE_W / 2}, ${n.y - NODE_H / 2})`}
            >
              <rect width={NODE_W} height={NODE_H} rx={10}
                    fill="var(--card)" stroke={color} strokeWidth={1.5} />
              <rect width={NODE_W} height={NODE_H} rx={10}
                    fill="url(#grad-card)" />
              <circle cx={16} cy={NODE_H / 2} r={5} fill={color} />
              {n.icon ? (
                <text x={NODE_W / 2} y={NODE_H / 2 + 2}
                      textAnchor="middle"
                      style={{ fontSize: 18 }}>
                  {n.icon}
                </text>
              ) : (
                <text x={32} y={NODE_H / 2 + 4}
                      style={{ fontSize: 11.5, fontWeight: 800, fill: 'var(--text)' }}>
                  {meta?.label || n.label}
                </text>
              )}
              {n.icon && (
                <text x={NODE_W / 2} y={NODE_H - 6}
                      textAnchor="middle"
                      style={{ fontSize: 9, fontWeight: 700, fill: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {n.label}
                </text>
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
