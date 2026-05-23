import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { breadcrumbsFor } from '../../lib/navSections.js';
import { cn } from '../../lib/utils.js';

/**
 * Breadcrumb strip rendered above every page.
 * Hidden on the dashboard ("/") to keep the hero clean.
 */
export function Breadcrumbs() {
  const loc = useLocation();
  const nav = useNavigate();

  if (loc.pathname === '/') return null;
  const chain = breadcrumbsFor(loc.pathname);
  if (chain.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-4 print:hidden">
      <button
        onClick={() => nav(-1)}
        className="grid place-items-center w-7 h-7 rounded-md border border-token bg-[var(--card-2)] hover:bg-[var(--card)] transition focus-ring"
        aria-label="Go back"
        title="Back"
      >
        <ChevronLeft size={14} />
      </button>
      <nav className="flex items-center gap-1 text-xs text-muted flex-wrap" aria-label="Breadcrumb">
        {chain.map((b, i) => {
          const last = i === chain.length - 1;
          return (
            <span key={i} className="inline-flex items-center gap-1">
              {b.to ? (
                <Link
                  to={b.to}
                  className={cn(
                    'font-bold transition',
                    last ? 'text-current' : 'hover:text-aws-orange'
                  )}
                >
                  {b.label}
                </Link>
              ) : (
                <span className="font-bold text-current">{b.label}</span>
              )}
              {!last && <ChevronRight size={11} className="text-muted/60" />}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
