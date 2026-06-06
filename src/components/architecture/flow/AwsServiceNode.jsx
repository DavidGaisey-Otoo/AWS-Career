/**
 * AwsServiceNode.jsx — custom react-flow node for an AWS service.
 *
 * Renders the service icon + label + optional sub-label, with the
 * category accent colour on the top border. Connection handles on
 * all 4 sides so the user can wire from any direction.
 */

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CATEGORY_COLOR, getServiceDef } from '../../../data/archStudio.js';
import { cn } from '../../../lib/utils.js';

function AwsServiceNodeImpl({ data, selected }) {
  const def = getServiceDef(data.serviceId);
  if (!def) {
    return (
      <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-[11px] font-bold text-danger">
        Unknown: {data.serviceId}
      </div>
    );
  }
  const accent = CATEGORY_COLOR[def.category] || '#FF9900';

  return (
    <div
      className={cn(
        'group relative rounded-xl bg-[var(--card-1)] border-2 px-3 py-2.5 min-w-[120px] text-center shadow-md transition',
        selected ? 'border-aws-orange ring-2 ring-aws-orange/40' : 'border-token hover:border-aws-orange/60',
      )}
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <Handle type="target" position={Position.Top}    id="t" className="!bg-aws-orange !border-aws-orange !w-2 !h-2" />
      <Handle type="target" position={Position.Left}   id="l" className="!bg-aws-orange !border-aws-orange !w-2 !h-2" />
      <Handle type="source" position={Position.Right}  id="r" className="!bg-aws-orange !border-aws-orange !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="!bg-aws-orange !border-aws-orange !w-2 !h-2" />

      <div className="text-2xl leading-none mb-0.5">{def.icon}</div>
      <div className="text-[11px] font-extrabold leading-tight">{def.label}</div>
      {data.label && (
        <div className="text-[9.5px] font-bold opacity-70 mt-0.5 leading-tight">{data.label}</div>
      )}
    </div>
  );
}

export const AwsServiceNode = memo(AwsServiceNodeImpl);
