import { motion } from 'framer-motion';

export function PageHeader({ eyebrow, title, subtitle, actions, icon: Icon }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-aws-orange"
          >
            {Icon ? <Icon size={14} /> : null}
            {eyebrow}
          </motion.div>
        )}
        <motion.h1
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="mt-1 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]"
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mt-2 text-sm sm:text-base text-muted max-w-2xl leading-relaxed"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
