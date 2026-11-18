import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { SECTIONS } from '../../lib/navSections.js';
import { cn } from '../../lib/utils.js';
import { UserCard } from './UserCard.jsx';

/**
 * The office sidebar: Today, the six rooms, Settings.
 * - Desktop: collapsible (icon-only at 76px ↔ icon+label at 260px).
 */
export function Sidebar({ onItemClick, forceExpanded = false }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useApp();
  const sections = SECTIONS;
  const collapsed = forceExpanded ? false : sidebarCollapsed;

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

      {/* The office: Today, the six rooms, Settings. Flat on purpose — each
          room has its own row of tabs, so the sidebar never needs to open. */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
        <ul className="space-y-1">
          {sections.map((sec) => {
            const Icon = sec.icon;
            return (
              <li key={sec.id}>
                <NavLink
                  to={sec.path}
                  end={sec.path === '/'}
                  onClick={onItemClick}
                  title={collapsed ? sec.label : sec.blurb}
                  className={({ isActive }) => cn(
                    'group relative flex items-center rounded-xl transition-all focus-ring',
                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 text-sm font-bold',
                    isActive
                      ? 'text-current bg-gradient-to-r from-aws-orange/20 to-electric/10 shadow-[inset_0_0_0_1px_rgba(255,153,0,0.35)]'
                      : 'text-muted hover:text-current hover:bg-[var(--card-2)]',
                  )}
                >
                  <Icon size={collapsed ? 20 : 18} strokeWidth={2.25} className="shrink-0 group-hover:text-aws-orange" />
                  {!collapsed && <span className="flex-1 tracking-tight">{sec.label}</span>}
                </NavLink>
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
