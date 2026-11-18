import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils.js';
import { roomPath } from '../../lib/rooms.js';

/**
 * The row of tabs across the top of a room.
 *
 * Tabs are addresses (`/find/gigs`), not local state, so the back button,
 * bookmarks and links from Today all land on the right tab. Scrolls
 * sideways on a phone rather than wrapping into a second row.
 */
export function RoomTabs({ room, activeId }) {
  return (
    <nav aria-label={`${room.label} sections`}
         className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
      {room.tabs.map((t) => (
        <NavLink
          key={t.id}
          to={roomPath(room.id, t.id)}
          aria-current={t.id === activeId ? 'page' : undefined}
          className={cn(
            'inline-flex items-center rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
            t.id === activeId
              ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
              : 'text-muted hover:text-current',
          )}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
