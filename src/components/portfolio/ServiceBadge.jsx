import { getServiceMeta } from '../../data/projects.js';
import { cn } from '../../lib/utils.js';

/**
 * Compact AWS service chip. Hover reveals the domain label.
 * Clickable variant links to the official AWS docs.
 */
export function ServiceBadge({ id, size = 'sm', linkTo, className = '' }) {
  const meta = getServiceMeta(id);
  const Tag = linkTo ? 'a' : 'span';
  const sizeMap = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-[11px] px-2 py-1 gap-1.5',
    md: 'text-xs px-2.5 py-1.5 gap-2',
  };
  return (
    <Tag
      href={linkTo}
      target={linkTo ? '_blank' : undefined}
      rel={linkTo ? 'noreferrer' : undefined}
      title={`${meta.label} · ${meta.domain}`}
      className={cn(
        'inline-flex items-center font-bold rounded-md border border-token bg-[var(--card-2)] transition',
        linkTo && 'hover:border-aws-orange/60 hover:bg-aws-orange/5',
        sizeMap[size],
        className,
      )}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
    </Tag>
  );
}
