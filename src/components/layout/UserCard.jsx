import { Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { cn } from '../../lib/utils.js';

export function UserCard({ collapsed }) {
  const { profile } = useApp();
  const initial = (profile.name || 'You').trim().charAt(0).toUpperCase() || 'A';
  const levelLabel = profile.level
    ? profile.level === 'beginner' ? 'Beginner'
      : profile.level === 'practitioner' ? 'Practitioner'
      : profile.level === 'associate' ? 'Associate'
      : 'Professional'
    : 'Get started';

  return (
    <Link
      to="/settings"
      className={cn(
        'group flex items-center gap-3 rounded-2xl p-2 transition-all',
        'hover:bg-[var(--card-2)] focus-ring border border-transparent hover:border-token'
      )}
    >
      <div className="relative">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-aws-orange/50"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 font-extrabold text-sm shadow-glow-orange">
            {initial}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success ring-2 ring-[var(--card)]" />
      </div>
      {!collapsed && (
        <>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{profile.name || 'Welcome'}</div>
            <div className="text-[11px] text-muted truncate">{levelLabel}</div>
          </div>
          <Settings2 size={16} className="text-muted group-hover:text-aws-orange transition" />
        </>
      )}
    </Link>
  );
}
