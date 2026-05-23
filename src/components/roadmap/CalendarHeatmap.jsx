import { motion } from 'framer-motion';
import { useRoadmap } from '../../context/RoadmapContext.jsx';

const WEEKS = 17; // ~4 months

function intensity(subs) {
  if (subs === 0) return 0;
  if (subs < 2) return 1;
  if (subs < 4) return 2;
  if (subs < 7) return 3;
  return 4;
}

const LEVEL_BG = [
  'bg-[var(--card-2)]',
  'bg-aws-orange/25',
  'bg-aws-orange/45',
  'bg-aws-orange/70',
  'bg-aws-orange shadow-glow-orange',
];

export function CalendarHeatmap() {
  const { state } = useRoadmap();
  const today = new Date();
  const days = [];
  // Build a weeks×days grid ending today (today is in the last column)
  const end = new Date(today);
  // Align end-of-grid to current weekday so today is in the last column
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const a = state.activity[key];
    days.push({ key, date: d, subs: a?.subtasks || 0, seconds: a?.seconds || 0 });
  }
  const cols = Array.from({ length: WEEKS }, (_, w) => days.slice(w * 7, w * 7 + 7));
  const totalSubs = days.reduce((a, b) => a + b.subs, 0);
  const activeDays = days.filter((d) => d.subs > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl p-5"
    >
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Activity</h3>
          <p className="text-xs text-muted">{totalSubs} subtasks across {activeDays} active days · last {WEEKS} weeks</p>
        </div>
        <Legend />
      </div>
      <div className="overflow-x-auto -mx-2 px-2">
        <div className="flex gap-[3px] min-w-max">
          {cols.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((d) => (
                <div
                  key={d.key}
                  title={`${d.key} — ${d.subs} subtasks · ${(d.seconds / 3600).toFixed(1)}h`}
                  className={`w-3 h-3 rounded-[3px] ${LEVEL_BG[intensity(d.subs)]} transition-transform hover:scale-125 hover:z-10 relative`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted">
      <span>Less</span>
      {LEVEL_BG.map((c, i) => <span key={i} className={`w-3 h-3 rounded-[3px] ${c}`} />)}
      <span>More</span>
    </div>
  );
}
