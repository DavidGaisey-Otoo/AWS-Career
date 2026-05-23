import { motion } from 'framer-motion';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useRoadmap } from '../../context/RoadmapContext.jsx';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeek(activity, offset = 0) {
  const out = [];
  const today = new Date();
  // align to Monday of "offset" weeks ago
  const day = (today.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(today);
  start.setDate(today.getDate() - day - offset * 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const a = activity[key] || { subtasks: 0, seconds: 0 };
    out.push({
      day: DAYS[i],
      hours: +(a.seconds / 3600).toFixed(2),
      subs: a.subtasks,
    });
  }
  return out;
}

export function WeeklyChart() {
  const { state } = useRoadmap();
  const thisWeek = buildWeek(state.activity, 0);
  const lastWeek = buildWeek(state.activity, 1);

  const thisHours = thisWeek.reduce((a, b) => a + b.hours, 0);
  const lastHours = lastWeek.reduce((a, b) => a + b.hours, 0);
  const delta = lastHours === 0 ? (thisHours > 0 ? 100 : 0) : Math.round(((thisHours - lastHours) / lastHours) * 100);
  const positive = delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl p-5"
    >
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold tracking-tight">This week</h3>
          <p className="text-xs text-muted">{thisHours.toFixed(1)}h logged · {thisWeek.reduce((a, b) => a + b.subs, 0)} subtasks ticked</p>
        </div>
        <div className={`text-xs font-bold ${positive ? 'text-success' : 'text-danger'}`}>
          {positive ? '▲' : '▼'} {Math.abs(delta)}% vs last week
        </div>
      </div>
      <div className="h-44 -mx-3">
        <ResponsiveContainer>
          <BarChart data={thisWeek} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="bw" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF9900" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#FF9900" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(255,153,0,0.12)' }}
              contentStyle={{
                background: 'rgba(20,28,48,0.95)',
                border: '1px solid rgba(255,153,0,0.4)',
                borderRadius: 12,
                fontSize: 12,
              }}
              formatter={(value, key) => key === 'hours' ? [`${value}h`, 'Time'] : [value, 'Subtasks']}
              labelStyle={{ color: '#FF9900', fontWeight: 700 }}
            />
            <Bar dataKey="hours" fill="url(#bw)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
