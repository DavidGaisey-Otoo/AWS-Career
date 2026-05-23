import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils.js';

export function DifficultyStars({ value = 0, onChange, readOnly = false, size = 16 }) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className={cn('inline-flex items-center gap-0.5', !readOnly && 'cursor-pointer')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(value === n ? 0 : n)}
          className="p-0.5 focus-ring rounded"
          aria-label={`Set difficulty to ${n}`}
        >
          <Star
            size={size}
            className={cn(
              'transition-all',
              n <= display ? 'text-aws-orange fill-aws-orange' : 'text-muted'
            )}
          />
        </button>
      ))}
    </div>
  );
}
