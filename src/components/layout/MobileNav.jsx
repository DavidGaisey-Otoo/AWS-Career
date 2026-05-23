import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_NAV_5, SECTIONS } from '../../lib/navSections.js';
import { cn } from '../../lib/utils.js';

/**
 * Bottom navigation — exactly 5 tabs matching the 5 top-level sections.
 * A tab is "active" if the current path matches the section landing OR
 * any of its children.
 */
export function MobileNav() {
  const loc = useLocation();

  const isSectionActive = (secId) => {
    const sec = SECTIONS.find((s) => s.id === secId);
    if (!sec) return false;
    if (loc.pathname === sec.path) return true;
    return sec.children.some((c) =>
      c.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(c.path)
    );
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-token safe-bottom"
      aria-label="Mobile primary navigation"
    >
      <ul className="grid grid-cols-5">
        {MOBILE_NAV_5.map((item) => {
          const Icon = item.icon;
          const active = isSectionActive(item.id);
          return (
            <li key={item.id}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={cn(
                  'group relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition',
                  active ? 'text-aws-orange' : 'text-muted'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="mobile-active"
                    className="absolute top-0 inset-x-6 h-[2px] rounded-b-full bg-gradient-aws"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={20} strokeWidth={2.25} />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
