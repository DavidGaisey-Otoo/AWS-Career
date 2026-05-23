import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { SECTIONS } from '../../lib/navSections.js';
import { cn } from '../../lib/utils.js';
import { UserCard } from './UserCard.jsx';

/**
 * 5-section grouped sidebar.
 * - Desktop: collapsible (icon-only at 76px ↔ icon+label at 260px).
 * - Each section is a parent button; click opens to reveal children.
 * - The section containing the current route is auto-expanded.
 */
export function Sidebar({ onItemClick, forceExpanded = false }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const collapsed = forceExpanded ? false : sidebarCollapsed;
  const location = useLocation();

  // Determine which section is "active" based on the current pathname.
  const activeSectionId = useMemo(() => {
    for (const sec of SECTIONS) {
      if (location.pathname === sec.path) return sec.id;
      for (const c of sec.children) {
        if (location.pathname === c.path) return sec.id;
        if (c.path !== '/' && location.pathname.startsWith(c.path)) return sec.id;
      }
    }
    return SECTIONS[0].id;
  }, [location.pathname]);

  // Auto-expand the active section. User can manually toggle others.
  const [openIds, setOpenIds] = useState(() => new Set([activeSectionId]));
  useEffect(() => {
    setOpenIds((prev) => {
      if (prev.has(activeSectionId)) return prev;
      const next = new Set(prev);
      next.add(activeSectionId);
      return next;
    });
  }, [activeSectionId]);

  const toggleSection = (id) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <aside
      className={cn(
        'h-full flex flex-col surface !shadow-none border-r border-token transition-[width] duration-300',
        collapsed ? 'w-[76px]' : 'w-[260px]'
      )}
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-aws shadow-glow-orange grid place-items-center text-ink-950">
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-extrabold tracking-tight leading-tight">AWS Career</div>
            <div className="text-xs text-muted leading-tight">Launchpad Pro</div>
          </div>
        )}
      </div>

      {/* 5-section grouped nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
        <ul className="space-y-1">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isOpen = openIds.has(sec.id);
            const isActive = sec.id === activeSectionId;

            // Collapsed mode: render as a single icon button linking to the section landing.
            if (collapsed) {
              return (
                <li key={sec.id}>
                  <NavLink
                    to={sec.path}
                    end={sec.path === '/'}
                    onClick={onItemClick}
                    title={sec.label}
                    className={({ isActive: ia }) =>
                      cn(
                        'group relative flex items-center justify-center rounded-xl p-2.5 transition-all focus-ring',
                        ia || isActive
                          ? 'text-white bg-gradient-to-r from-aws-orange/25 to-electric/15 shadow-[inset_0_0_0_1px_rgba(255,153,0,0.35)]'
                          : 'text-muted hover:text-white hover:bg-[var(--card-2)]'
                      )
                    }
                  >
                    <Icon size={20} strokeWidth={2.25} />
                  </NavLink>
                </li>
              );
            }

            return (
              <li key={sec.id}>
                <div className={cn(
                  'rounded-xl transition-all',
                  isActive && 'bg-[var(--card-2)]/40'
                )}>
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className={cn(
                      'group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all focus-ring',
                      isActive
                        ? 'text-white'
                        : 'text-muted hover:text-white'
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-section-pill"
                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-aws shadow-glow-orange"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className={cn(
                      'grid place-items-center w-8 h-8 rounded-lg transition-all',
                      isActive ? 'text-aws-orange' : 'group-hover:text-aws-orange'
                    )}>
                      <Icon size={18} strokeWidth={2.25} />
                    </span>
                    <span className="flex-1 text-left tracking-tight">{sec.label}</span>
                    <motion.span animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.15 }}>
                      <ChevronDown size={14} className="text-muted" />
                    </motion.span>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.ul
                        key="children"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden ml-3 border-l border-token pl-2 mt-0.5 mb-1"
                      >
                        {/* Section landing link */}
                        <li>
                          <NavLink
                            to={sec.path}
                            end
                            onClick={onItemClick}
                            className={({ isActive: ia }) =>
                              cn(
                                'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-semibold transition focus-ring',
                                ia ? 'bg-aws-orange/10 text-aws-orange' : 'text-muted hover:text-current hover:bg-[var(--card-2)]'
                              )
                            }
                          >
                            <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                            <span className="truncate">Overview</span>
                          </NavLink>
                        </li>
                        {sec.children.map((c) => {
                          const CIcon = c.icon;
                          return (
                            <li key={c.id}>
                              <NavLink
                                to={c.path}
                                end={c.path === '/'}
                                onClick={onItemClick}
                                className={({ isActive: ia }) =>
                                  cn(
                                    'group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition focus-ring',
                                    ia
                                      ? 'bg-aws-orange/10 text-aws-orange'
                                      : 'text-muted hover:text-current hover:bg-[var(--card-2)]'
                                  )
                                }
                              >
                                <CIcon size={13} className="opacity-70 group-hover:opacity-100" />
                                <span className="truncate">{c.label}</span>
                              </NavLink>
                            </li>
                          );
                        })}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="px-2 pb-2">
        <UserCard collapsed={collapsed} />
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setSidebarCollapsed((c) => !c)}
        className="hidden lg:flex items-center justify-center gap-2 mx-2 mb-3 py-2 rounded-xl text-xs font-semibold text-muted hover:text-white hover:bg-[var(--card-2)] transition focus-ring"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
      </button>
    </aside>
  );
}
