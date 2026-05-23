import { Star } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function AppealScore({ value = 0, size = 'sm' }) {
  const sizeMap = {
    sm: { text: 'text-[11px]', icon: 12 },
    md: { text: 'text-xs',     icon: 14 },
    lg: { text: 'text-sm',     icon: 16 },
  }[size];
  const tone =
    value >= 9 ? 'text-success'
    : value >= 7 ? 'text-aws-orange'
    : value >= 5 ? 'text-warning'
    : 'text-muted';
  return (
    <span className={cn('inline-flex items-center gap-1 font-bold', sizeMap.text, tone)} title={`Client appeal: ${value}/10`}>
      <Star size={sizeMap.icon} className="fill-current" />
      {value}<span className="text-muted font-medium">/10</span>
    </span>
  );
}
