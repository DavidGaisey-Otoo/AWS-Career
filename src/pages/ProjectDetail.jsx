import { motion } from 'framer-motion';
import {
  AlertOctagon, ArrowLeft, Award, Building2, Calendar, CheckCircle2, Cloud, ExternalLink,
  Eye, FileText, Github, ImagePlus, Layers, Lightbulb, Link2, ListChecks, Megaphone,
  Pencil, Sparkles, Star, Target, Trash2, Trophy, Video, X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccordionList } from '../components/portfolio/AccordionList.jsx';
import { AppealScore } from '../components/portfolio/AppealScore.jsx';
import { GitHubExportPanel } from '../components/portfolio/GitHubExportPanel.jsx';
import { StepGuide } from '../components/portfolio/StepGuide.jsx';
import { SAMPLE_S3_BUCKET, SmartMethodDetector } from '../components/common/SmartMethodDetector.jsx';
import { ArchitectureDiagram } from '../components/portfolio/ArchitectureDiagram.jsx';
import { DifficultyMeter } from '../components/portfolio/DifficultyMeter.jsx';
import { ServiceBadge } from '../components/portfolio/ServiceBadge.jsx';
import { AnimatedCheckbox } from '../components/roadmap/AnimatedCheckbox.jsx';
import { Button } from '../components/ui/Button.jsx';
import { fireConfetti } from '../components/ui/Confetti.js';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { PRIORITY, STATUS, STATUS_ORDER } from '../data/projects.js';
import { cn, formatDate } from '../lib/utils.js';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const {
    getProjectState, updateProjectState, moveToStatus, toggleStep,
    addScreenshot, removeScreenshot, projectStats, projects,
  } = usePortfolio();
  // Custom projects live in PortfolioContext rather than the fixed catalogue.
  // Resolving from the merged list keeps generated projects usable after the
  // creation screen redirects here.
  const project = projects.find((item) => item.id === projectId);
  const ps = getProjectState(projectId);
  const stats = projectStats.find((s) => s.id === projectId);
  const fileRef = useRef(null);

  // Local autosave-ish state for text fields to avoid re-renders per keystroke
  const [draft, setDraft] = useState({
    notes: ps.notes, lessons: ps.lessons, wouldDoDifferently: ps.wouldDoDifferently,
    github: ps.github, demoUrl: ps.demoUrl, videoUrl: ps.videoUrl,
  });
  useEffect(() => {
    setDraft({
      notes: ps.notes, lessons: ps.lessons, wouldDoDifferently: ps.wouldDoDifferently,
      github: ps.github, demoUrl: ps.demoUrl, videoUrl: ps.videoUrl,
    });
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) {
    return (
      <div className="surface rounded-3xl p-12 text-center">
        <div className="text-2xl mb-2">🤷</div>
        <h2 className="text-xl font-bold">Project not found</h2>
        <Link to="/portfolio" className="mt-4 inline-flex items-center gap-1 text-aws-orange font-semibold hover:underline">
          <ArrowLeft size={14} /> Back to portfolio
        </Link>
      </div>
    );
  }

  const statusMeta = STATUS[ps.status];
  const priorityMeta = PRIORITY[ps.priority];

  const saveField = (key, value) => updateProjectState(projectId, { [key]: value });

  const onUploadFiles = async (files) => {
    if (!files || files.length === 0) return;
    for (const f of files) await addScreenshot(projectId, f);
    toast.success(`${files.length} screenshot${files.length > 1 ? 's' : ''} added`);
  };

  return (
    <div className="space-y-6">
      <Link
        to="/portfolio"
        className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange transition print:hidden"
      >
        <ArrowLeft size={14} /> Portfolio board
      </Link>

      {/* HERO */}
      <motion.section
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative surface rounded-3xl p-6 sm:p-8 lg:p-10 gradient-border overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_240px] items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-10 h-10 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 font-black text-sm shadow-glow-orange">
                {project.n}
              </span>
              <span className={cn('chip border text-[11px]', priorityMeta.color)}>
                {priorityMeta.label} priority
              </span>
              <span className={cn('chip text-[11px]', statusMeta.color)}>
                {statusMeta.emoji} {statusMeta.label}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.05]">
              {project.title}
            </h1>
            <p className="mt-2 text-base text-muted leading-relaxed max-w-3xl">{project.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <DifficultyMeter level={project.difficulty} size="md" />
              <AppealScore value={project.clientAppeal} size="md" />
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Calendar size={14} /> {project.estLabel}
              </span>
              {project.freeTier && (
                <span className="chip bg-success/10 text-success border border-success/30">
                  Free-tier eligible
                </span>
              )}
            </div>

            {project.standout && (
              <div className="mt-5 rounded-2xl border border-aws-orange/40 bg-aws-orange/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles size={18} className="text-aws-orange mt-0.5" />
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-widest text-aws-orange">Your strongest project</div>
                    <p className="text-sm mt-1 leading-relaxed">{project.standout}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 print:hidden">
              <select
                value={ps.status}
                onChange={(e) => {
                  moveToStatus(projectId, e.target.value);
                  if (e.target.value === 'complete') fireConfetti({ origin: { y: 0.35 } });
                }}
                className="bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm font-bold focus-ring focus:border-aws-orange"
              >
                {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
              <select
                value={ps.priority}
                onChange={(e) => updateProjectState(projectId, { priority: e.target.value })}
                className="bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm font-bold focus-ring focus:border-aws-orange"
              >
                {Object.entries(PRIORITY).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
              </select>
              {ps.github && (
                <Button as="a" href={ps.github} target="_blank" variant="ghost" icon={Github}>
                  GitHub
                </Button>
              )}
              {ps.demoUrl && (
                <Button as="a" href={ps.demoUrl} target="_blank" variant="ghost" icon={ExternalLink}>
                  Live demo
                </Button>
              )}
              <Button
                as={Link}
                to={`/walkthroughs/deep/new?title=${encodeURIComponent(project.title)}&brief=${encodeURIComponent(`${project.tagline || ''} ${project.businessCase || ''}`.trim())}&services=${encodeURIComponent((project.services || []).join(','))}&source=project`}
                variant="primary"
                icon={Sparkles}
              >
                Start guided walkthrough
              </Button>
            </div>
          </div>

          {/* Quick stats column */}
          <div className="space-y-3">
            <QuickStat icon={ListChecks} label="Build steps" value={`${stats.doneSteps}/${stats.totalSteps}`} />
            <QuickStat icon={Calendar} label="Started"
              value={ps.startedAt ? formatDate(ps.startedAt) : '—'} />
            <QuickStat icon={Trophy} label="Finished"
              value={ps.finishedAt ? formatDate(ps.finishedAt) : '—'} />
            <QuickStat icon={Target} label="Client appeal" value={`${project.clientAppeal}/10`} />
          </div>
        </div>
      </motion.section>

      {/* BUSINESS CASE + ARCHITECTURE */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Business case" icon={Building2}>
          <p className="text-sm leading-relaxed">{project.businessCase}</p>
          <div className="mt-4">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">
              Real companies using this pattern
            </div>
            <div className="flex flex-wrap gap-2">
              {project.companies.map((name) => (
                <span key={name} className="inline-flex items-center gap-1.5 chip bg-[var(--card-2)] border border-token text-xs font-bold">
                  <span className="w-5 h-5 rounded-md bg-gradient-aws text-ink-950 grid place-items-center text-[10px] font-black">
                    {name.charAt(0)}
                  </span>
                  {name}
                </span>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Architecture" icon={Layers}>
          <ArchitectureDiagram architecture={project.architecture} />
          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.services.map((sid) => (
              <ServiceBadge key={sid} id={sid} size="sm"
                linkTo={`https://docs.aws.amazon.com/index.html?search=${encodeURIComponent(sid)}`} />
            ))}
          </div>
        </Section>
      </div>

      {/* PREREQUISITES + SKILLS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Prerequisites" icon={CheckCircle2}>
          <ul className="space-y-2 text-sm">
            {project.prerequisites.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Skills you'll gain" icon={Award}>
          <div className="flex flex-wrap gap-1.5">
            {project.skills.map((s) => (
              <span key={s} className="chip bg-[var(--card-2)] border border-token text-xs font-bold">{s}</span>
            ))}
          </div>
          <div className="mt-4">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">Related certifications</div>
            <div className="flex flex-wrap gap-1.5">
              {project.certs.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-xs font-bold">
                  <Award size={11} /> {c}
                </span>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* SMART METHOD DETECTOR — shown for S3 project as a worked example */}
      {project.id === 'p-s3-cf' && (
        <Section title="Smart method detector" icon={Sparkles}>
          <p className="text-xs text-muted mb-3 leading-relaxed">
            For each step, pick the method that fits the situation. The recommendation is highlighted with an orange dot — Terraform is the default for portable, client-rebuildable infrastructure.
          </p>
          <SmartMethodDetector
            title={SAMPLE_S3_BUCKET.title}
            signal={SAMPLE_S3_BUCKET.signal}
            content={SAMPLE_S3_BUCKET.content}
          />
        </Section>
      )}

      {/* BUILD STEPS */}
      <Section title={`Build guide (${stats.doneSteps}/${stats.totalSteps} done)`} icon={ListChecks}>
        <ol className="space-y-2.5">
          {project.buildSteps.map((s, i) => {
            const done = !!ps.completedSteps[s.id];
            return (
              <li key={s.id} className={cn(
                'rounded-2xl border p-3.5 transition',
                done ? 'border-success/40 bg-success/[0.04]' : 'border-token bg-[var(--card-2)]/40'
              )}>
                <div className="flex items-start gap-3">
                  <AnimatedCheckbox
                    checked={done}
                    onChange={() => toggleStep(projectId, s.id)}
                    size={20}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                        Step {i + 1}
                      </span>
                    </div>
                    <h4 className={cn('text-sm font-bold leading-snug', done && 'line-through text-muted')}>
                      {s.title}
                    </h4>
                    {/* 1. LEARN — full study note (Console/CLI/Terraform/CFN) opens by default */}
                    <StepGuide step={s} defaultOpen={true} />

                    {/* 2. DO — substeps to tick as you work through it */}
                    <div className="mt-3 rounded-xl border border-token bg-[var(--card)] p-3">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-aws-orange" />
                        Substeps for this step
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {s.subs.map((sub) => (
                          <li key={sub.id} className="flex items-start gap-2 text-muted">
                            <span className="w-1 h-1 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                            <span>{sub.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* COMMON ERRORS */}
      <Section title="Common errors & fixes" icon={AlertOctagon}>
        <AccordionList
          items={project.commonErrors.map((e, i) => ({
            id: `err-${i}`,
            title: e.problem,
            body: <p>{e.fix}</p>,
          }))}
          renderTitlePrefix={(_, i) => (
            <span className="w-7 h-7 rounded-lg bg-danger/15 text-danger grid place-items-center font-extrabold text-xs">
              {i + 1}
            </span>
          )}
        />
      </Section>

      {/* PRESENTATION TALKING POINTS */}
      <Section title="How to present this to clients" icon={Megaphone}>
        <ul className="grid gap-2 sm:grid-cols-2">
          {project.presentation.map((tp, i) => (
            <li key={i} className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-3 flex items-start gap-2.5">
              <Star size={14} className="text-aws-orange fill-aws-orange mt-0.5 flex-shrink-0" />
              <span className="text-sm leading-relaxed">{tp}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* LINKS + MEDIA */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Links" icon={Link2}>
          <div className="space-y-3">
            <TextField label="GitHub repo" icon={Github} placeholder="https://github.com/you/aws-project"
              value={draft.github}
              onChange={(v) => setDraft((d) => ({ ...d, github: v }))}
              onBlur={() => saveField('github', draft.github)} />
            <TextField label="Live demo URL" icon={ExternalLink} placeholder="https://demo.example.com"
              value={draft.demoUrl}
              onChange={(v) => setDraft((d) => ({ ...d, demoUrl: v }))}
              onBlur={() => saveField('demoUrl', draft.demoUrl)} />
            <TextField label="Video walkthrough" icon={Video} placeholder="https://youtu.be/…"
              value={draft.videoUrl}
              onChange={(v) => setDraft((d) => ({ ...d, videoUrl: v }))}
              onBlur={() => saveField('videoUrl', draft.videoUrl)} />
          </div>
        </Section>

        <Section title={`Screenshot gallery (${ps.screenshots.length})`} icon={ImagePlus}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ps.screenshots.map((sh) => (
              <div key={sh.id} className="relative group rounded-xl overflow-hidden border border-token aspect-video">
                <img src={sh.dataUrl} alt={sh.caption} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeScreenshot(projectId, sh.id)}
                  className="absolute top-1 right-1 grid place-items-center w-6 h-6 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition focus-ring"
                  aria-label="Remove"
                ><Trash2 size={12} /></button>
              </div>
            ))}
            <button
              onClick={() => fileRef.current?.click()}
              className="aspect-video rounded-xl border-2 border-dashed border-token grid place-items-center text-muted hover:border-aws-orange hover:text-aws-orange transition focus-ring"
            >
              <div className="text-center">
                <ImagePlus size={20} className="mx-auto" />
                <div className="text-[10px] font-bold mt-1">Add image</div>
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => onUploadFiles(e.target.files)}
            />
          </div>
        </Section>
      </div>

      {/* WRITE-UP FIELDS */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Section title="Notes" icon={FileText}>
          <Textarea value={draft.notes}
            onChange={(v) => setDraft((d) => ({ ...d, notes: v }))}
            onBlur={() => saveField('notes', draft.notes)}
            placeholder="Anything worth remembering about this build…" rows={8} />
        </Section>
        <Section title="Lessons learned" icon={Lightbulb}>
          <Textarea value={draft.lessons}
            onChange={(v) => setDraft((d) => ({ ...d, lessons: v }))}
            onBlur={() => saveField('lessons', draft.lessons)}
            placeholder="What surprised you? What clicked?" rows={8} />
        </Section>
        <Section title="What I'd do differently" icon={Pencil}>
          <Textarea value={draft.wouldDoDifferently}
            onChange={(v) => setDraft((d) => ({ ...d, wouldDoDifferently: v }))}
            onBlur={() => saveField('wouldDoDifferently', draft.wouldDoDifferently)}
            placeholder="Rewind to day 1 — what would you change?" rows={8} />
        </Section>
      </div>

      {/* COST + PREVIEW */}
      <Section title="Cost estimate" icon={Cloud}>
        <p className="text-sm leading-relaxed">{project.costNotes}</p>
      </Section>

      {/* GITHUB INTEGRATION — surfaces on completed projects OR if URL already saved */}
      {(ps.status === 'complete' || !!ps.github) && (
        <GitHubExportPanel
          projectId={projectId}
          project={project}
          projectState={ps}
          stats={stats}
        />
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl p-5 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon ? <Icon size={16} className="text-aws-orange" /> : null}
        <h3 className="text-sm font-extrabold uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </motion.section>
  );
}

function QuickStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card-2)]/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted">
        <Icon size={12} className="text-aws-orange" /> {label}
      </div>
      <div className="mt-1 text-lg font-extrabold tracking-tight tabular-nums">{value}</div>
    </div>
  );
}

function TextField({ label, icon: Icon, value, onChange, onBlur, placeholder }) {
  return (
    <label className="block">
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5">
        {Icon ? <Icon size={12} /> : null} {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className="mt-1.5 w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm focus-ring focus:border-aws-orange"
      />
    </label>
  );
}

function Textarea({ value, onChange, onBlur, placeholder, rows }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
    />
  );
}
