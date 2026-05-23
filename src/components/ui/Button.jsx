import { useRef } from 'react';
import { cn, uid } from '../../lib/utils.js';

// Ripple-enabled button. Variants: primary, ghost, glass, danger.
export function Button({
  as = 'button',
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  icon: Icon,
  iconRight: IconRight,
  ...rest
}) {
  const Tag = as;
  const ref = useRef(null);

  const onClick = (e) => {
    const btn = ref.current;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const span = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      span.className = 'ripple-span';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      span.dataset.id = uid();
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
    }
    rest.onClick?.(e);
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-5 py-3 text-base rounded-2xl',
  };

  const variants = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    glass: 'glass text-current hover:bg-white/15',
    danger: 'bg-danger text-white shadow-[0_8px_24px_-10px_rgba(255,68,68,0.7)] hover:brightness-110',
    outline: 'border border-token text-current hover:bg-[var(--card-2)]',
  };

  return (
    <Tag
      ref={ref}
      {...rest}
      onClick={onClick}
      className={cn(
        'btn relative isolate font-semibold transition-all active:scale-[0.98]',
        sizes[size],
        variants[variant],
        className
      )}
    >
      {Icon ? <Icon size={size === 'lg' ? 20 : 16} strokeWidth={2.25} /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight size={size === 'lg' ? 20 : 16} strokeWidth={2.25} /> : null}
    </Tag>
  );
}
