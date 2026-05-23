import { Map, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { CalendarHeatmap } from '../components/roadmap/CalendarHeatmap.jsx';
import { ExportShare } from '../components/roadmap/ExportShare.jsx';
import { OverallProgress } from '../components/roadmap/OverallProgress.jsx';
import { PhaseCard } from '../components/roadmap/PhaseCard.jsx';
import { RoadmapFilters, filterTask, sortTasks } from '../components/roadmap/RoadmapFilters.jsx';
import { WeeklyChart } from '../components/roadmap/WeeklyChart.jsx';
import { useRoadmap } from '../context/RoadmapContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Roadmap() {
  const { roadmap, state, resetRoadmap, setMuted } = useRoadmap();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [phaseId, setPhaseId] = useState('all');
  const [sort, setSort] = useState('default');

  // Apply a shared-progress snapshot the first time we land with ?snapshot=…
  useEffect(() => {
    const url = new URL(window.location.href);
    const snap = url.searchParams.get('snapshot');
    if (!snap) return;
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(snap))));
      if (data?.v === 1 && Array.isArray(data.c)) {
        toast.info('Viewing shared snapshot', {
          description: `${data.c.length} subtasks complete in shared link.`,
        });
      }
    } catch {
      /* ignore malformed link */
    }
    // Clear so refresh doesn't re-notify
    url.searchParams.delete('snapshot');
    window.history.replaceState({}, '', url.toString());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ctx = useMemo(() => ({ state }), [state]);

  const visiblePhases = useMemo(() => {
    return roadmap
      .filter((p) => phaseId === 'all' || p.id === phaseId)
      .map((p) => ({
        ...p,
        tasks: sortTasks(p.tasks.filter((t) => filterTask(t, ctx, { query, status, priority })), sort),
      }));
  }, [roadmap, ctx, query, status, priority, phaseId, sort]);

  const totalVisibleTasks = visiblePhases.reduce((a, p) => a + p.tasks.length, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Smart Roadmap"
        title="Your personalized AWS path"
        subtitle="Tick subtasks to log progress. Time yourself. Stack streaks. Celebrate milestones."
        icon={Map}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMuted(!state.muted)}
              className="btn btn-ghost !px-3"
              title={state.muted ? 'Unmute tick sound' : 'Mute tick sound'}
              aria-label="Toggle sound"
            >
              {state.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => {
                if (confirm('Reset all roadmap progress? This cannot be undone.')) {
                  resetRoadmap();
                  toast.warning('Roadmap progress reset');
                }
              }}
              className="btn btn-ghost !px-3"
              title="Reset progress"
            >
              <RotateCcw size={16} />
            </button>
            <ExportShare />
          </div>
        }
      />

      <OverallProgress />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <WeeklyChart />
        <CalendarHeatmap />
      </div>

      <RoadmapFilters
        query={query} setQuery={setQuery}
        status={status} setStatus={setStatus}
        priority={priority} setPriority={setPriority}
        phaseId={phaseId} setPhaseId={setPhaseId}
        sort={sort} setSort={setSort}
      />

      {totalVisibleTasks === 0 ? (
        <div className="surface rounded-3xl py-16 text-center text-muted">
          <div className="text-2xl mb-1">🔍</div>
          <div className="font-semibold">No tasks match your filters.</div>
          <div className="text-xs mt-1">Try clearing the filters above.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePhases.map((p, i) => (
            <PhaseCard
              key={p.id}
              phase={p}
              index={roadmap.findIndex((rp) => rp.id === p.id)}
              defaultExpanded={i === 0}
              filterTasks={() => true /* already filtered above */}
            />
          ))}
        </div>
      )}
    </div>
  );
}
