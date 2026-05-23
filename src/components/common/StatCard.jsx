import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function StatCard({ label, value, delta, deltaLabel, icon: Icon, accent = 'orange', sparkline, index = 0 }) {
  const accentClass = {
    orange: 'from-aws-orange/30 to-aws-orange/5 text-aws-orange',
    blue:   'from-electric/30 to-electric/5 text-electric',
    green:  'from-success/30 to-success/5 text-success',
    yellow: 'from-warning/30 to-warning/5 text-warning',
  }[accent];

  const positive = (delta ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 26 }}
      className="surface rounded-2xl p-5 relative overflow-hidden group hover:shadow-soft-xl transition"
    >
      <div className={cn(
        'absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl opacity-60 bg-gradient-to-br',
        accentClass
      )} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
          <div className="mt-2 text-3xl font-black tracking-tight">{value}</div>
          {delta !== undefined && (
            <div className={cn(
              'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
              positive ? 'text-success' : 'text-danger'
            )}>
              {positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{positive ? '+' : ''}{delta}%</span>
              {deltaLabel && <span className="text-muted font-medium ml-1">{deltaLabel}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br', accentClass)}>
            <Icon size={18} strokeWidth={2.25} />
          </div>
        )}
      </div>
      {sparkline}
    </motion.div>
  );
}
