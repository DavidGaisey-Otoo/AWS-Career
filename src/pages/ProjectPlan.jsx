import { motion } from 'framer-motion';
import {
  Activity, AlertTriangle, Briefcase, Calendar, CheckCircle2, ChevronLeft,
  ChevronRight, ClipboardCopy, Clock, DollarSign, Download, Flag, Layers,
  Loader2, Plus, Printer, Save, Sparkles, Target, Trash2, Wand2, X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useDialog } from '../context/DialogContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CATEGORY_COLOR, getServiceDef } from '../data/archStudio.js';
import { buildPlan, planToMarkdown, updatePlan } from '../data/projectPlan.js';
import { openPrintable } from '../lib/printableHtml.js';
import { cn } from '../lib/utils.js';
import { useApp } from '../context/AppContext.jsx';
import { ProjectPlanReviewPanel } from '../components/project-plan-review/ProjectPlanReviewPanel.jsx';
import { analyzeJob } from '../data/jobAnalyzer.js';

const PHASE_COLOR_TOKEN = {
  orange:  { bg: 'bg-aws-orange/15', text: 'text-aws-orange', border: 'border-aws-orange/40', bar: '#FF9900' },
  cyan:    { bg: 'bg-cyan-500/15',   text: 'text-cyan-300',   border: 'border-cyan-500/40',   bar: '#22D3EE' },
  violet:  { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/40', bar: '#A78BFA' },
  emerald: { bg: 'bg-emerald-500/15',text: 'text-emerald-300',border: 'border-emerald-500/40',bar: '#34D399' },
  rose:    { bg: 'bg-rose-500/15',   text: 'text-rose-300',   border: 'border-rose-500/40',   bar: '#FB7185' },
};

export default function ProjectPlan() {
  const [params] = useSearchParams();
  const toast = useToast();
  const dialog = useDialog();
  const { profile } = useApp();
  const { state: fre } = useFreelance();
  const { state: earn, savePlan, deletePlan } = useEarn();
  const linkedBrief = params.get('prefill') || '';
  const linkedTitle = params.get('title') || 'Client AWS engagement';
  const linkedBudgetText = params.get('budget') || '';
  const linkedAnalysis = useMemo(() => linkedBrief ? {
    at: `linked:${linkedBrief.length}`,
    jdText: linkedBrief,
    suggestedName: linkedTitle,
    suggestedClient: '',
    analysis: analyzeJob(linkedBrief),
  } : null, [linkedBrief, linkedTitle]);
  const lastAnalysis = linkedAnalysis || earn.lastAnalysis;

  // ----- state -----
  const [activeId, setActiveId] = useState(null);
  const [plan, setPlan] = useState(null);

  // Generation form state
  const [form, setForm] = useState(() => seedForm(lastAnalysis));
  const [generating, setGenerating] = useState(false);

  // Pull saved plan into editor
  useEffect(() => {
    const found = earn.plans.find((p) => p.id === activeId);
    if (found) setPlan(found);
  }, [activeId, earn.plans]);

  // Auto-seed form when a fresh Job Analyzer result arrives
  useEffect(() => {
    if (!lastAnalysis) return;
    setForm(seedForm(lastAnalysis));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAnalysis?.at]);

  useEffect(() => {
    if (!linkedBrief) return;
    const linkedBudget = Number(String(linkedBudgetText).replace(/[^0-9.]/g, '')) || '';
    setForm((current) => ({
      ...seedForm(linkedAnalysis),
      clientId: current.clientId,
      budget: linkedBudget || seedForm(linkedAnalysis).budget,
    }));
  }, [linkedBrief, linkedAnalysis, linkedBudgetText]);

  const client = fre.clients.find((c) => c.id === form.clientId);

  // ----- actions -----
  const generate = () => {
    setGenerating(true);
    setTimeout(() => {
      const next = buildPlan({
        analysis: lastAnalysis?.analysis || null,
        brief: {
          projectTitle: form.projectTitle,
          timelineDays: +form.timelineDays || 21,
          budget: form.budget ? +form.budget : null,
          currency: form.currency || 'USD',
          hourlyRate: +form.hourlyRate || 85,
          startDate: form.startDate ? new Date(form.startDate).toISOString() : new Date().toISOString(),
        },
        client: { name: client?.name || form.clientName, company: client?.company || form.clientCompany },
      });
      setPlan(next);
      setActiveId(null); // unsaved until user clicks Save
      setGenerating(false);
      toast.success('Project plan generated');
    }, 400);
  };

  const save = () => {
    if (!plan) return;
    savePlan(plan);
    setActiveId(plan.id);
    toast.success('Plan saved');
  };

  const printPlan = () => {
    if (!plan) return;
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const cur = (n) => `${plan.currency} ${(+n || 0).toLocaleString()}`;
    openPrintable({
      documentType: 'Project Plan',
      title: plan.name,
      subtitle: plan.brief.type,
      markdown: planToMarkdown(plan),
      meta: [
        { label: 'Client',     value: [plan.clientName, plan.clientCompany].filter(Boolean).join(' · ') },
        { label: 'Duration',   value: `${plan.totalDays} days` },
        { label: 'Effort',     value: `${plan.totalHours} hours` },
        { label: 'Total cost', value: cur(plan.totalCost) },
        { label: 'Start',      value: fmt(plan.startDate) },
        { label: 'End',        value: fmt(plan.endDate) },
      ],
      authorName: profile?.name || 'AWS Cloud Engineer',
      authorCompany: '',
    });
  };

  const copyMd = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(planToMarkdown(plan));
      toast.success('Markdown copied');
    } catch { toast.error('Copy failed'); }
  };

  const onDeletePlan = async (id) => {
    const ok = await dialog.confirm({
      title: 'Delete plan?',
      description: earn.plans.find((p) => p.id === id)?.name,
      danger: true,
    });
    if (ok) {
      deletePlan(id);
      if (activeId === id) { setActiveId(null); setPlan(null); }
    }
  };

  // ----- edit handlers (live mutation, not yet saved) -----
  const editPlan = (patch) => setPlan((p) => updatePlan(p, patch));
  const editPhase = (phaseId, patch) =>
    editPlan({ phases: plan.phases.map((p) => p.id === phaseId ? { ...p, ...patch } : p) });
  const editTask = (phaseId, taskId, patch) =>
    editPlan({ phases: plan.phases.map((p) =>
      p.id === phaseId
        ? { ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, ...patch } : t) }
        : p
    )});
  const addTask = (phaseId) => {
    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    editPhase(phaseId, {
      tasks: [...phase.tasks, {
        id: 't-' + Date.now(),
        title: 'New task',
        description: '',
        dayOffset: phase.dayOffset + phase.durationDays - 1,
        durationDays: 1,
        hours: 4,
        dependsOn: [], deliverable: '', status: 'pending', services: [], risks: [],
      }],
    });
  };
  const removeTask = (phaseId, taskId) => {
    const phase = plan.phases.find((p) => p.id === phaseId);
    if (!phase) return;
    editPhase(phaseId, { tasks: phase.tasks.filter((t) => t.id !== taskId) });
  };

  // ----- render -----
  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Project Plan Generator"
        title="A presentable, editable plan in one click."
        subtitle="Smart-generated from your job analysis. Editable phases, tasks, dependencies, milestones, risks. Gantt timeline. Export to PDF / Markdown for clients."
        icon={Briefcase}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setPlan(null); setActiveId(null); }} className="btn btn-ghost !text-xs">
              <Plus size={12} /> New
            </button>
            {plan && (
              <>
                <button onClick={copyMd}   className="btn btn-ghost !text-xs"><ClipboardCopy size={12} /> Copy MD</button>
                <button onClick={printPlan} className="btn btn-ghost !text-xs"><Printer size={12} /> Print / PDF</button>
                <button onClick={save}     className="btn btn-primary !text-xs"><Save size={12} /> Save</button>
              </>
            )}
          </div>
        }
      />

      {lastAnalysis && !plan && (
        <div className="surface rounded-2xl px-3 py-2 flex items-center gap-2 border-aws-orange/30 bg-aws-orange/5">
          <Sparkles size={12} className="text-aws-orange shrink-0" />
          <span className="text-[11px]">
            <span className="font-bold text-aws-orange">Auto-filled from Job Analyzer</span> —
            project <strong>"{lastAnalysis.suggestedName}"</strong>
            {lastAnalysis.suggestedClient && <> · client <strong>{lastAnalysis.suggestedClient}</strong></>}
          </span>
          <Link to="/job-analyzer" className="ml-auto text-[10px] font-bold text-aws-orange hover:underline">
            Re-run →
          </Link>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
        {/* LEFT — form + saved plans */}
        <div className="space-y-3">
          <GenerateForm
            form={form} setForm={setForm}
            generating={generating} onGenerate={generate}
            clients={fre.clients}
            hasAnalysis={!!lastAnalysis}
          />
          <SavedPlansList
            plans={earn.plans || []}
            activeId={activeId}
            onPick={setActiveId}
            onDelete={onDeletePlan}
          />
        </div>

        {/* RIGHT — plan view */}
        <div className="space-y-3">
          {!plan ? <EmptyState /> : (
            <>
              <PlanHeader plan={plan} onEdit={editPlan} />
              <GanttView plan={plan} />
              <PhasesList plan={plan} onEditPhase={editPhase} onEditTask={editTask} onAddTask={addTask} onRemoveTask={removeTask} />
              <PaymentSchedule plan={plan} />
              <RiskRegister plan={plan} onEdit={editPlan} />
              {/* PLAN-01: realism review */}
              <ProjectPlanReviewPanel
                plan={plan}
                services={plan?.services || []}
                level={plan?.level || 'intermediate'}
                teamSize={Number(plan?.teamSize) || 1}
                startDate={plan?.startDate}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ====================================================================
// LEFT column — form + saved list
// ====================================================================

function GenerateForm({ form, setForm, generating, onGenerate, clients, hasAnalysis }) {
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  return (
    <div className="surface rounded-2xl p-4 space-y-2">
      <h3 className="text-sm font-extrabold flex items-center gap-2 mb-1">
        <Wand2 size={14} className="text-aws-orange" /> Plan inputs
      </h3>

      <Field label="Project title" value={form.projectTitle} onChange={set('projectTitle')} placeholder="Landing Zone migration" />

      {clients.length > 0 ? (
        <div>
          <label className="block text-[10px] font-bold text-muted mb-0.5">Client (from CRM)</label>
          <select
            value={form.clientId}
            onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
          >
            <option value="">— pick from CRM —</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
          </select>
        </div>
      ) : (
        <>
          <Field label="Client name"    value={form.clientName}    onChange={set('clientName')} />
          <Field label="Client company" value={form.clientCompany} onChange={set('clientCompany')} />
        </>
      )}

      <Field label="Start date" type="date" value={form.startDate} onChange={set('startDate')} />
      <Field label="Timeline (days)" type="number" value={form.timelineDays} onChange={set('timelineDays')} placeholder="21" />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Hourly rate" type="number" value={form.hourlyRate} onChange={set('hourlyRate')} placeholder="85" />
        <Field label="Currency" value={form.currency} onChange={set('currency')} placeholder="USD" />
      </div>
      <Field label="Or fixed budget" type="number" value={form.budget} onChange={set('budget')} placeholder="Leave blank for hourly" />

      <button
        onClick={onGenerate}
        disabled={generating}
        className={cn('btn btn-primary w-full !text-xs mt-1', generating && 'opacity-50 cursor-not-allowed')}
      >
        {generating ? <><Loader2 size={12} className="animate-spin" /> Building…</> : <><Sparkles size={12} /> Generate plan</>}
      </button>

      {!hasAnalysis && (
        <div className="text-[10px] text-muted leading-relaxed pt-1">
          Tip: <Link to="/job-analyzer" className="text-aws-orange font-bold hover:underline">analyze a job description</Link> first
          to pre-fill the plan with project type + AWS services + timeline.
        </div>
      )}
    </div>
  );
}

function SavedPlansList({ plans = [], activeId, onPick, onDelete }) {
  return (
    <div className="surface rounded-2xl p-3">
      <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
        Saved plans ({plans.length})
      </h3>
      {plans.length === 0 ? (
        <p className="text-[11px] text-muted">Your saved plans will appear here.</p>
      ) : (
        <ul className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
          {plans.map((p) => (
            <li key={p.id} className="group flex items-center gap-1">
              <button
                onClick={() => onPick(p.id)}
                className={cn(
                  'flex-1 text-left rounded-md px-2 py-1.5 text-xs hover:bg-[var(--card-2)] transition',
                  p.id === activeId && 'bg-aws-orange/10 text-aws-orange font-bold',
                )}
              >
                <div className="font-bold truncate">{p.name}</div>
                <div className="text-[10px] text-muted">
                  {p.totalDays}d · {p.totalHours}h · {p.currency} {(+p.totalCost || 0).toLocaleString()}
                </div>
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                aria-label="Delete plan"
              ><Trash2 size={11} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface rounded-2xl p-10 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-gradient-aws mx-auto grid place-items-center text-ink-950 shadow-glow-orange">
        <Briefcase size={22} strokeWidth={2.5} />
      </div>
      <h3 className="text-base font-extrabold">Fill the form, hit Generate.</h3>
      <p className="text-[12px] text-muted max-w-md mx-auto leading-relaxed">
        Your plan appears here. Smart phases, tasks, milestones, dependencies, and a Gantt chart — all editable inline.
      </p>
    </div>
  );
}

// ====================================================================
// PLAN HEADER (KPIs)
// ====================================================================

function PlanHeader({ plan, onEdit }) {
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const cur = (n) => `${plan.currency} ${(+n || 0).toLocaleString()}`;
  return (
    <div className="surface rounded-2xl p-4 gradient-border relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-44 h-44 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-start gap-2 flex-wrap">
          <input
            value={plan.name}
            onChange={(e) => onEdit({ name: e.target.value })}
            className="bg-transparent text-lg font-black tracking-tight flex-1 min-w-0 focus-ring focus:outline-none"
          />
          <div className="text-[10px] text-muted font-bold">{plan.brief.type}</div>
        </div>
        <div className="text-[11px] text-muted">{plan.clientName}{plan.clientCompany ? ` · ${plan.clientCompany}` : ''}</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Kpi icon={Calendar} label="Window" value={`${fmt(plan.startDate)} → ${fmt(plan.endDate)}`} />
          <Kpi icon={Clock} label="Duration" value={`${plan.totalDays} days`} />
          <Kpi icon={Activity} label="Effort" value={`${plan.totalHours} hours`} />
          <Kpi icon={DollarSign} label="Total" value={cur(plan.totalCost)} />
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2">
      <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-widest text-muted">
        <Icon size={9} /> {label}
      </div>
      <div className="text-[12px] font-extrabold tracking-tight mt-0.5 truncate">{value}</div>
    </div>
  );
}

// ====================================================================
// GANTT — SVG-based timeline view
// ====================================================================

function GanttView({ plan }) {
  // Layout constants
  const headerH = 30;
  const rowH = 22;
  const labelW = 220;
  const dayW = 18;
  const totalDays = plan.totalDays;
  const totalRows = plan.phases.reduce((s, p) => s + 1 + p.tasks.length, 0);
  const W = labelW + totalDays * dayW + 30;
  const H = headerH + totalRows * rowH + 20;

  // Build rows: phase bar + each task bar
  const rows = [];
  let rowIdx = 0;
  for (const phase of plan.phases) {
    const c = PHASE_COLOR_TOKEN[phase.color] || PHASE_COLOR_TOKEN.orange;
    rows.push({
      kind: 'phase', label: phase.name, color: c.bar,
      x: phase.dayOffset * dayW,
      w: phase.durationDays * dayW,
      y: headerH + rowIdx * rowH + 4,
      milestone: phase.milestone,
    });
    rowIdx++;
    for (const t of phase.tasks) {
      rows.push({
        kind: 'task', label: t.title, color: c.bar, dim: true,
        x: t.dayOffset * dayW,
        w: t.durationDays * dayW,
        y: headerH + rowIdx * rowH + 5,
      });
      rowIdx++;
    }
  }

  // Tick marks every 7 days for the date header
  const ticks = [];
  for (let d = 0; d <= totalDays; d += 7) {
    ticks.push(d);
  }
  if (ticks[ticks.length - 1] !== totalDays) ticks.push(totalDays);

  const startDate = new Date(plan.startDate);
  const dateAt = (offset) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="surface rounded-2xl p-3 overflow-x-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold flex items-center gap-2">
          <Activity size={14} className="text-aws-orange" /> Gantt timeline
        </h3>
        <div className="text-[10px] text-muted">Drag-and-drop coming soon — for now, edit task days inline below.</div>
      </div>
      <svg width={W} height={H} className="block">
        {/* Date header */}
        {ticks.map((d, i) => (
          <g key={i}>
            <line x1={labelW + d * dayW} y1={0} x2={labelW + d * dayW} y2={H} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="2 4" />
            <text x={labelW + d * dayW + 3} y={18} fontSize={9} fill="#94A3B8" fontWeight={700}>
              {dateAt(d)}
            </text>
          </g>
        ))}
        {/* Today marker */}
        {(() => {
          const today = Math.max(0, Math.min(totalDays, Math.round((Date.now() - startDate.getTime()) / 86400000)));
          return (
            <g>
              <line x1={labelW + today * dayW} y1={0} x2={labelW + today * dayW} y2={H} stroke="#FF9900" strokeWidth={1.5} strokeDasharray="4 4" />
              <text x={labelW + today * dayW + 4} y={H - 5} fontSize={9} fill="#FF9900" fontWeight={800}>today</text>
            </g>
          );
        })()}
        {/* Rows */}
        {rows.map((r, i) => (
          <g key={i}>
            <text
              x={r.kind === 'task' ? 24 : 6}
              y={r.y + 12}
              fontSize={r.kind === 'phase' ? 11 : 10}
              fontWeight={r.kind === 'phase' ? 800 : 600}
              fill={r.kind === 'phase' ? r.color : '#CBD5E1'}
            >
              {r.label.length > 32 ? r.label.slice(0, 30) + '…' : r.label}
            </text>
            <rect
              x={labelW + r.x}
              y={r.y}
              width={Math.max(2, r.w)}
              height={r.kind === 'phase' ? 14 : 12}
              rx={4}
              fill={r.color}
              opacity={r.dim ? 0.55 : 0.85}
            />
            {r.kind === 'phase' && r.milestone && (
              <g transform={`translate(${labelW + (r.milestone.dayOffset * dayW)}, ${r.y + 7}) rotate(45)`}>
                <rect x={-5} y={-5} width={10} height={10} fill="#FF9900" stroke="var(--card)" strokeWidth={1.5} />
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ====================================================================
// PHASE LIST — editable phases + tasks
// ====================================================================

function PhasesList({ plan, onEditPhase, onEditTask, onAddTask, onRemoveTask }) {
  return (
    <div className="space-y-3">
      {plan.phases.map((phase, i) => {
        const c = PHASE_COLOR_TOKEN[phase.color] || PHASE_COLOR_TOKEN.orange;
        const phaseHours = phase.tasks.reduce((s, t) => s + (+t.hours || 0), 0);
        return (
          <section key={phase.id} className={cn('surface rounded-2xl p-4 border-l-4', c.border)}>
            <header className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={cn('chip border font-extrabold text-[10px]', c.bg, c.text, c.border)}>Phase {i + 1}</span>
                <input
                  value={phase.name}
                  onChange={(e) => onEditPhase(phase.id, { name: e.target.value })}
                  className="bg-transparent text-base font-extrabold tracking-tight flex-1 min-w-0 focus-ring focus:outline-none"
                />
              </div>
              <div className="text-[11px] text-muted">
                Day {phase.dayOffset + 1} → {phase.dayOffset + phase.durationDays} · {phaseHours}h
              </div>
            </header>

            <ul className="space-y-1.5">
              {phase.tasks.map((t) => (
                <li key={t.id} className="rounded-lg border border-token bg-[var(--card-2)]/30 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', c.text)} style={{ backgroundColor: c.bar }} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        value={t.title}
                        onChange={(e) => onEditTask(phase.id, t.id, { title: e.target.value })}
                        className="bg-transparent text-sm font-bold w-full focus-ring focus:outline-none"
                      />
                      <div className="text-[11px] text-muted leading-snug">
                        <span className="font-bold text-current">Deliverable:</span>{' '}
                        <input
                          value={t.deliverable}
                          onChange={(e) => onEditTask(phase.id, t.id, { deliverable: e.target.value })}
                          placeholder="What you hand over"
                          className="bg-transparent w-full inline-block focus:outline-none focus:border-aws-orange/40"
                        />
                      </div>
                      <div className="flex items-center flex-wrap gap-2 text-[10px] text-muted">
                        <label className="inline-flex items-center gap-1">
                          <Clock size={10} />
                          <input type="number" value={t.hours} onChange={(e) => onEditTask(phase.id, t.id, { hours: +e.target.value })}
                            className="w-12 bg-[var(--card)] border border-token rounded px-1 py-0.5 text-[10px] tabular-nums text-current" />h
                        </label>
                        <label className="inline-flex items-center gap-1">
                          Day
                          <input type="number" value={t.dayOffset + 1} onChange={(e) => onEditTask(phase.id, t.id, { dayOffset: Math.max(0, +e.target.value - 1) })}
                            className="w-12 bg-[var(--card)] border border-token rounded px-1 py-0.5 text-[10px] tabular-nums text-current" />
                        </label>
                        <label className="inline-flex items-center gap-1">
                          for
                          <input type="number" value={t.durationDays} onChange={(e) => onEditTask(phase.id, t.id, { durationDays: Math.max(1, +e.target.value) })}
                            className="w-12 bg-[var(--card)] border border-token rounded px-1 py-0.5 text-[10px] tabular-nums text-current" />d
                        </label>
                        {t.services.length > 0 && (
                          <span className="ml-2 flex flex-wrap gap-1">
                            {t.services.map((s) => {
                              const def = getServiceDef(s);
                              if (!def) return null;
                              return (
                                <span key={s} className="chip border border-token text-[9px] font-bold" style={{ borderTopColor: CATEGORY_COLOR[def.category], borderTopWidth: 2 }}>
                                  {def.icon} {def.label}
                                </span>
                              );
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveTask(phase.id, t.id)}
                      className="grid place-items-center w-6 h-6 rounded text-muted hover:text-danger"
                      aria-label="Remove task"
                    ><X size={11} /></button>
                  </div>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onAddTask(phase.id)}
              className="mt-2 text-[10px] font-bold text-aws-orange hover:underline inline-flex items-center gap-1"
            >
              <Plus size={10} /> Add task to this phase
            </button>

            {phase.milestone && (
              <div className={cn('mt-3 rounded-lg p-2.5 flex items-center gap-2', c.bg)}>
                <Flag size={12} className={c.text} />
                <span className="text-[11px] font-bold">{phase.milestone.name}</span>
                <span className="text-[10px] text-muted">Day {phase.milestone.dayOffset}</span>
                <span className="ml-auto text-[11px] font-extrabold tabular-nums">
                  {plan.currency} {phase.milestone.paymentAmount.toLocaleString()} <span className="text-muted font-normal">({phase.milestone.paymentPct}%)</span>
                </span>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ====================================================================
// PAYMENT SCHEDULE + RISK REGISTER
// ====================================================================

function PaymentSchedule({ plan }) {
  return (
    <section className="surface rounded-2xl p-4">
      <h3 className="text-sm font-extrabold flex items-center gap-2 mb-3">
        <DollarSign size={14} className="text-aws-orange" /> Payment schedule
      </h3>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-widest text-muted">
          <tr><th className="text-left py-1">Milestone</th><th className="text-left py-1">Due day</th><th className="text-right py-1">%</th><th className="text-right py-1">Amount</th></tr>
        </thead>
        <tbody>
          {plan.phases.map((p) => p.milestone && (
            <tr key={p.id} className="border-t border-token">
              <td className="py-1.5 font-bold">{p.milestone.name}</td>
              <td className="py-1.5 text-muted">Day {p.milestone.dayOffset}</td>
              <td className="py-1.5 text-right text-muted">{p.milestone.paymentPct}%</td>
              <td className="py-1.5 text-right font-extrabold tabular-nums">{plan.currency} {p.milestone.paymentAmount.toLocaleString()}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-aws-orange/40 font-extrabold">
            <td className="py-2">Total</td><td></td>
            <td className="py-2 text-right">100%</td>
            <td className="py-2 text-right tabular-nums">{plan.currency} {(+plan.totalCost || 0).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function RiskRegister({ plan, onEdit }) {
  if (!plan.risks?.length) return null;
  return (
    <section className="surface rounded-2xl p-4">
      <h3 className="text-sm font-extrabold flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-warning" /> Risk register ({plan.risks.length})
      </h3>
      <ul className="space-y-2">
        {plan.risks.map((r) => (
          <li key={r.id} className="rounded-lg border border-warning/30 bg-warning/5 p-2.5">
            <div className="flex items-start gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-extrabold">{r.title}</div>
                <div className="text-[11px] text-muted leading-snug mt-0.5"><strong className="text-current">Mitigation:</strong> {r.mitigation}</div>
              </div>
              <div className="flex gap-1 shrink-0">
                <span className="chip border border-token text-[9px] font-bold">L: {r.likelihood}</span>
                <span className="chip border border-token text-[9px] font-bold">I: {r.impact}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ====================================================================
// helpers
// ====================================================================

function Field({ label, value = '', onChange, placeholder, type = 'text' }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
      />
    </label>
  );
}

function seedForm(lastAnalysis) {
  const a = lastAnalysis?.analysis;
  const days =
    a?.timeline?.kind === 'range' && a.timeline.unit?.startsWith('day')   ? Math.round((a.timeline.min + a.timeline.max) / 2) :
    a?.timeline?.kind === 'range' && a.timeline.unit?.startsWith('week')  ? Math.round((a.timeline.min + a.timeline.max) / 2) * 7 :
    a?.timeline?.kind === 'range' && a.timeline.unit?.startsWith('month') ? Math.round((a.timeline.min + a.timeline.max) / 2) * 30 :
    21;
  return {
    projectTitle:  lastAnalysis?.suggestedName   || '',
    clientName:    lastAnalysis?.suggestedClient || '',
    clientCompany: lastAnalysis?.suggestedClient || '',
    clientId:      '',
    startDate:     new Date().toISOString().slice(0, 10),
    timelineDays:  days,
    hourlyRate:    a?.budget?.kind === 'hourly' ? (a.budget.max || a.budget.min) : 85,
    currency:      'USD',
    budget:        a?.budget?.kind === 'fixed' ? a.budget.amount : '',
  };
}
