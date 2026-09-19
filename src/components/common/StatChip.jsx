/**
 * StatChip — a compact labelled number.
 *
 * Deliberately NOT the same thing as StatCard. StatCard is the large
 * dashboard tile with a gradient wash, a delta and an optional sparkline;
 * it is right for three or four hero figures. StatChip is right for a row
 * of six small counters, where a StatCard would dominate the page.
 *
 * Two pages had each grown a private `StatCard` that was really this
 * component, which is why the shared StatCard looked unused and the two
 * copies drifted apart. Naming them differently is the fix — one name for
 * one shape.
 */
import { cn } from '../../lib/utils.js';

const TONES = {
  default: '',
  orange: 'text-aws-orange',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function StatChip({ icon: Icon, label, value, tone = 'default', className = '' }) {
  return (
    <div className={cn('surface rounded-xl p-3', className)}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-muted">
        {Icon && <Icon size={10} />}
        {label}
      </div>
      <div className={cn('text-lg font-bold mt-1', TONES[tone] || '')}>{value}</div>
    </div>
  );
}
