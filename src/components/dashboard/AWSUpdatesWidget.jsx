import { ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UPDATE_TAGS, recentUpdates } from '../../data/awsUpdates.js';
import { cn } from '../../lib/utils.js';

/**
 * Latest AWS Updates — dashboard widget. Shows the 3 most-recent items
 * with their tag colour. Each row links straight to the AWS source.
 */
export function AWSUpdatesWidget({ limit = 3 }) {
  const items = recentUpdates(limit);
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange inline-flex items-center gap-1.5">
          <Newspaper size={11} /> Latest AWS updates
        </h3>
        <Link
          to="/aws-updates"
          className="text-[10px] font-extrabold text-aws-orange hover:underline inline-flex items-center gap-1"
          aria-label="View all AWS updates"
        >
          View all <ArrowRight size={10} />
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((u) => {
          const tag = UPDATE_TAGS[u.tag];
          return (
            <li key={u.id} className="group">
              <Link
                to="/aws-updates"
                className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5 block hover:border-aws-orange/40 transition focus-ring"
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={cn('chip border font-bold text-[9px]', tag.tone)}>
                    {tag.emoji} {tag.label}
                  </span>
                  <span className="text-[9px] text-muted ml-auto">
                    {new Date(u.dateISO).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-[12px] font-extrabold leading-snug group-hover:text-aws-orange transition">
                  {u.title}
                </div>
                <div className="text-[11px] text-muted leading-snug mt-0.5 line-clamp-2">
                  {u.summary}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
