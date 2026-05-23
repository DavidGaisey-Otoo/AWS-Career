import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, Moon, Search, Sun, X, Check } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { formatDate, cn } from '../../lib/utils.js';

export function Header({ onMobileMenu }) {
  const { openPalette, notifications, unreadCount, markAllRead } = useApp();
  const { isDark, toggle } = useTheme();
  const [notifsOpen, setNotifsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 glass border-b border-token">
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 h-16">
        {/* Mobile menu */}
        <button
          onClick={onMobileMenu}
          className="lg:hidden grid place-items-center w-10 h-10 rounded-xl hover:bg-[var(--card-2)] focus-ring"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        {/* Search trigger */}
        <button
          onClick={openPalette}
          className="flex-1 max-w-xl flex items-center gap-3 px-3.5 py-2.5 rounded-xl surface-2 text-sm text-muted hover:text-current transition focus-ring group"
        >
          <Search size={16} className="text-aws-orange" />
          <span className="flex-1 text-left truncate">Search anything — pages, lessons, services, jobs…</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold border border-token rounded-md px-1.5 py-0.5">
            <span className="opacity-80">⌘</span>K
          </kbd>
        </button>

        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="relative grid place-items-center w-10 h-10 rounded-xl hover:bg-[var(--card-2)] focus-ring transition"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isDark ? 'moon' : 'sun'}
                initial={{ y: -8, opacity: 0, rotate: -45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: 8, opacity: 0, rotate: 45 }}
                transition={{ duration: 0.22 }}
              >
                {isDark ? <Moon size={18} /> : <Sun size={18} />}
              </motion.div>
            </AnimatePresence>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifsOpen((v) => !v)}
              aria-label="Notifications"
              className="relative grid place-items-center w-10 h-10 rounded-xl hover:bg-[var(--card-2)] focus-ring transition"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full px-1 bg-danger text-white text-[10px] font-bold grid place-items-center shadow-[0_0_0_2px_var(--card)]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <AnimatePresence>
              {notifsOpen ? (
                <>
                  <button
                    className="fixed inset-0 z-40 cursor-default"
                    aria-hidden
                    onClick={() => setNotifsOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.15 } }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-1rem)] z-50 surface rounded-2xl overflow-hidden gradient-border"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-token">
                      <div className="font-bold">Notifications</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { markAllRead(); }}
                          className="text-[11px] font-semibold text-muted hover:text-aws-orange flex items-center gap-1 px-2 py-1 rounded-md hover:bg-[var(--card-2)]"
                        >
                          <Check size={12} /> Mark all read
                        </button>
                        <button
                          onClick={() => setNotifsOpen(false)}
                          className="p-1 rounded-md hover:bg-[var(--card-2)]"
                          aria-label="Close"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[360px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-sm text-muted">You're all caught up ✨</div>
                      ) : notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            'flex items-start gap-3 px-4 py-3 border-b border-token last:border-0 transition',
                            !n.read && 'bg-aws-orange/[0.04]'
                          )}
                        >
                          <div className={cn(
                            'mt-1.5 w-2 h-2 rounded-full flex-shrink-0',
                            n.read ? 'bg-[var(--card-2)]' : 'bg-aws-orange shadow-glow-orange'
                          )} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold leading-snug">{n.title}</div>
                            {n.body && <div className="text-xs text-muted mt-0.5 leading-relaxed">{n.body}</div>}
                            <div className="text-[10px] text-muted mt-1">{formatDate(n.at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
