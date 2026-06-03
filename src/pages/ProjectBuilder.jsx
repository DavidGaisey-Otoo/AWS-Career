/**
 * ProjectBuilder.jsx — flagship wizard demonstrating the new step-by-step
 * pattern: one step at a time, expandable, smart name suggestions,
 * auto-recording, and end-of-flow report generation.
 *
 * Eight steps:
 *   1. About you (first name — feeds name suggestions everywhere)
 *   2. Project type (static site / blog / API / serverless / dashboard)
 *   3. Project name + summary (auto-suggested)
 *   4. AWS resources (bucket name, region — auto-suggested)
 *   5. Architecture notes (free-form)
 *   6. Lessons learned
 *   7. GitHub setup (repo name auto-suggested)
 *   8. Generate report (PDF + Markdown + push to GitHub)
 *
 * Every step uses the Wizard component. Names are auto-suggested via
 * suggestName(). The session is auto-recorded; the final step bundles
 * the recording + values into a polished report.
 */
import { useEffect, useState } from 'react';
import {
  Sparkles, User, Layers, Globe, Cloud, BookOpen, Github,
  FileText, Download, Printer, ExternalLink, ArrowRight, CheckCircle2,
  RefreshCw, Wand2,
} from 'lucide-react';
import { Wizard } from '../components/wizard/Wizard.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useRecorder } from '../context/RecorderContext.jsx';
import { useAWS } from '../context/AWSContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { CostEstimatorCard } from '../components/build/CostEstimatorCard.jsx';
import { RegionSuggestionChip } from '../components/build/RegionSuggestionChip.jsx';
import { ServiceSuggestionChips } from '../components/build/ServiceSuggestionChips.jsx';
import { useProjectRegion } from '../lib/projectRegion.js';
import { Link } from 'react-router-dom';
import { suggestName, suggestVariations, describeKind } from '../lib/nameSuggester.js';
import {
  buildSessionReportMarkdown,
  downloadMarkdown,
  downloadReportAsPdf,
  openReportPrintable,
  pushSessionReportToGitHub,
} from '../lib/reportGenerator.js';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

const PROJECT_TYPES = [
  { id: 'static-site',  label: 'Static portfolio site', icon: Globe,     desc: 'HTML + CSS hosted on S3, optionally with CloudFront.' },
  { id: 'blog',         label: 'Blog (static)',         icon: BookOpen,  desc: 'Markdown content baked to static site, S3 + CloudFront.' },
  { id: 'api',          label: 'REST API',              icon: Layers,    desc: 'API Gateway + Lambda + DynamoDB.' },
  { id: 'serverless',   label: 'Serverless app',        icon: Cloud,     desc: 'Lambdas + S3 + DynamoDB + EventBridge.' },
  { id: 'dashboard',    label: 'Analytics dashboard',   icon: Sparkles,  desc: 'Front-end on S3, data via Athena / QuickSight.' },
];

// PJ-03: map project type → list of AWS services for cost estimation
const PROJECT_TYPE_SERVICES = {
  'static-site': ['s3', 'cloudfront', 'route53', 'acm'],
  'blog':        ['s3', 'cloudfront', 'route53', 'acm'],
  'api':         ['apigateway', 'lambda', 'dynamodb', 'iam', 'cloudwatch'],
  'serverless':  ['lambda', 's3', 'dynamodb', 'eventbridge', 'sns', 'cloudwatch'],
  'dashboard':   ['s3', 'cloudfront', 'athena', 'glue', 'cloudwatch'],
};

const STEPS = [
  // ─── 1 ───
  {
    id: 'about-you',
    title: 'About you',
    description: 'Just one thing — your first name. We use it to auto-suggest sensible names for every resource you create in this wizard.',
    render: ({ values, set }) => (
      <div className="space-y-3 max-w-md">
        <Field
          label="First name"
          hint="Lowercase, no spaces. Becomes the prefix for bucket / repo / role names."
          value={values.firstName || ''}
          onChange={(v) => set({ firstName: v.toLowerCase().replace(/[^a-z0-9]/g, '') })}
          placeholder="e.g. david"
          autoFocus
        />
      </div>
    ),
    validate: (v) => (!v.firstName ? 'Type a first name to continue — used for name suggestions.' : null),
    summarise: (v) => v.firstName || '—',
  },

  // ─── 2 ───
  {
    id: 'project-type',
    title: 'What are you building?',
    description: 'Pick the project type. We use this to tailor the suggested names, the architecture notes template, and the deploy walkthrough at the end.',
    render: ({ values, set, advance }) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROJECT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => { set({ projectType: t.id }); advance(); }}
            className={`text-left rounded-2xl border p-4 transition-all ${
              values.projectType === t.id
                ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/30 bg-[var(--brand)]/5'
                : 'border-token hover:border-[var(--brand)]/40 bg-[var(--card)]'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <t.icon size={16} className="text-[var(--brand)]" />
              <span className="font-bold">{t.label}</span>
            </div>
            <p className="text-xs opacity-70">{t.desc}</p>
          </button>
        ))}
      </div>
    ),
    validate: (v) => (!v.projectType ? 'Pick a project type.' : null),
    summarise: (v) => PROJECT_TYPES.find((t) => t.id === v.projectType)?.label || '—',
  },

  // ─── 3 ───
  {
    id: 'project-name',
    title: 'Project name + 1-line summary',
    description: 'We can suggest a great name — click Suggest. Edit it freely.',
    render: ({ values, set, suggest }) => (
      <div className="space-y-4">
        <FieldWithSuggest
          label="Project name (display)"
          hint="Appears in your portfolio + README + report cover."
          value={values.projectName || ''}
          onChange={(v) => set({ projectName: v })}
          suggestKind="project-name"
          suggestHint={values.projectType}
          suggest={suggest}
          context={values}
        />
        <Field
          label="One-line summary"
          hint="Used as the GitHub repo description + report executive summary."
          value={values.summary || ''}
          onChange={(v) => set({ summary: v })}
          placeholder={`e.g. ${values.projectType === 'static-site' ? 'A fast S3 + CloudFront portfolio site with custom domain.' : 'AWS project built with the Launchpad wizard.'}`}
          textarea
        />
      </div>
    ),
    validate: (v) => (!v.projectName ? 'Pick a project name — click Suggest if you want help.' : null),
    summarise: (v) => v.projectName || '—',
  },

  // ─── 4 ───
  {
    id: 'aws-resources',
    title: 'AWS resources',
    description: 'Name the AWS resources you\'ll create. All suggestions follow AWS rules (S3 buckets are lowercase + hyphens, globally unique, etc.).',
    render: ({ values, set, suggest }) => (
      <div className="space-y-4">
        <FieldWithSuggest
          label="S3 bucket name"
          hint={describeKind('s3-bucket').rules}
          value={values.bucketName || ''}
          onChange={(v) => set({ bucketName: v.toLowerCase().replace(/[^a-z0-9.-]/g, '-') })}
          suggestKind="s3-bucket"
          suggestHint={values.projectName}
          suggest={suggest}
          context={values}
        />
        <Field
          label="AWS region"
          hint="Where the bucket + other resources will live."
          value={values.region || 'eu-west-1'}
          onChange={(v) => set({ region: v })}
          asSelect
          options={[
            'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
            'eu-west-1', 'eu-west-2', 'eu-central-1',
            'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
          ]}
        />
        {values.projectType === 'api' || values.projectType === 'serverless' ? (
          <>
            <FieldWithSuggest
              label="Lambda function name"
              hint={describeKind('lambda-fn').rules}
              value={values.lambdaName || ''}
              onChange={(v) => set({ lambdaName: v })}
              suggestKind="lambda-fn"
              suggestHint={values.projectName}
              suggest={suggest}
              context={values}
            />
            <FieldWithSuggest
              label="DynamoDB table name"
              hint={describeKind('dynamodb-table').rules}
              value={values.tableName || ''}
              onChange={(v) => set({ tableName: v })}
              suggestKind="dynamodb-table"
              suggestHint={values.projectName}
              suggest={suggest}
              context={values}
            />
          </>
        ) : null}
      </div>
    ),
    validate: (v) => (!v.bucketName ? 'Pick an S3 bucket name.' : null),
    summarise: (v) => [v.bucketName, v.lambdaName, v.tableName].filter(Boolean).join(' · ') || '—',
  },

  // ─── 5 ───
  {
    id: 'architecture',
    title: 'Architecture notes',
    description: 'Write a short description of the architecture for your README + report. (Optional — you can skip and Next.)',
    optional: true,
    render: ({ values, set }) => (
      <Field
        label="Architecture notes (Markdown supported)"
        hint="A short paragraph + an ASCII diagram is plenty. We add this to the README + the final report."
        value={values.architecture || ''}
        onChange={(v) => set({ architecture: v })}
        placeholder={defaultArchitectureFor(values.projectType)}
        textarea
        rows={8}
      />
    ),
    summarise: (v) => v.architecture ? `${v.architecture.slice(0, 100)}…` : '— (skipped)',
  },

  // ─── 6 ───
  {
    id: 'lessons',
    title: 'What did you learn?',
    description: 'A few honest bullet points — what surprised you, what worked, what you\'d do differently. This is what makes your portfolio look real.',
    optional: true,
    render: ({ values, set }) => (
      <Field
        label="Lessons learned"
        hint="Three sentences is fine. The report + README will feature this in a callout."
        value={values.lessons || ''}
        onChange={(v) => set({ lessons: v })}
        placeholder="e.g. CloudFront cache invalidation cost me 30 minutes — needed to set up a separate invalidation alarm…"
        textarea
        rows={6}
      />
    ),
    summarise: (v) => v.lessons ? `${v.lessons.slice(0, 80)}…` : '— (skipped)',
  },

  // ─── 7 ───
  {
    id: 'github',
    title: 'GitHub repository',
    description: 'Auto-suggested repo name. Push at the end of the wizard sends README + REPORT + .gitignore. (You can skip if you don\'t want to push.)',
    optional: true,
    render: ({ values, set, suggest }) => (
      <div className="space-y-4">
        <FieldWithSuggest
          label="Repository name"
          hint={describeKind('github-repo').rules}
          value={values.repoName || ''}
          onChange={(v) => set({ repoName: v })}
          suggestKind="github-repo"
          suggestHint={values.projectName}
          suggest={suggest}
          context={values}
        />
        <Field
          label="Visibility"
          value={values.repoPublic === false ? 'private' : 'public'}
          onChange={(v) => set({ repoPublic: v === 'public' })}
          asSelect
          options={['public', 'private']}
          hint="Most portfolio projects are public so recruiters can read the code."
        />
      </div>
    ),
    summarise: (v) => v.repoName ? `${v.repoName} (${v.repoPublic === false ? 'private' : 'public'})` : '— (skipped)',
  },

  // ─── 8 ───
  {
    id: 'generate',
    title: 'Generate your report',
    description: 'Everything you entered + the auto-recorded session is bundled here. Download as Markdown, print to PDF, or push to GitHub. You can do all three.',
    render: ({ values }) => <GenerateStage values={values} />,
    summarise: () => 'Ready to generate',
  },
];

// ============================================================================
// page shell
// ============================================================================

export default function ProjectBuilder() {
  const toast = useToast();
  return (
    <div className="space-y-6">
      <Header />
      <Wizard
        steps={STEPS}
        initialValues={{}}
        storageKey={`${STORAGE_KEY}::wizard::project-builder`}
        recordAs="project-builder"
        completeLabel="Generate report"
        onComplete={() => toast.success('Report ready — scroll up to the Generate Report stage.')}
      />
    </div>
  );
}

function Header() {
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-center gap-2 mb-1">
        <Wand2 size={18} className="text-[var(--brand)]" />
        <h1 className="text-2xl font-bold tracking-tight">Project Builder</h1>
      </div>
      <p className="text-sm opacity-70 max-w-2xl">
        A step-by-step wizard for spinning up an AWS portfolio project. One question per screen,
        smart name suggestions, auto-recorded session, and a polished PDF / Markdown / GitHub
        push at the end. Use this for every new project — you'll never have to think about names again.
      </p>
    </div>
  );
}

// ============================================================================
// step 8 — generate stage
// ============================================================================

function GenerateStage({ values }) {
  const recorder = useRecorder();
  const aws = useAWS();
  const toast = useToast();
  const [ghToken] = useLocalStorage(`${STORAGE_KEY}::github::token`, '');
  const [pushState, setPushState] = useState({ ok: false, url: null, error: null, busy: false });

  // Find the most recent project-builder session in the recorder log
  const session = recorder.sessions.find((s) => s.flowId === 'project-builder');
  const polished = session ? recorder.toPolishedSession({ ...session, finalValues: values, title: values.projectName || 'Project Builder session' }) : null;

  const input = {
    session: polished || synthSession(values),
    values,
    account: aws.activeProfile?.identity ? {
      id: aws.activeProfile.identity.account,
      alias: aws.activeProfile.name,
      region: aws.activeProfile.region,
    } : null,
  };
  const markdown = buildSessionReportMarkdown(input);

  function doMarkdown() {
    downloadMarkdown(markdown, `${slug(values.projectName || 'report')}.md`);
    toast.success('Markdown report downloaded.');
  }

  const [pdfBusy, setPdfBusy] = useState(false);

  async function doPrintable() {
    try {
      const result = await openReportPrintable({
        markdown,
        title: values.projectName || 'Project report',
        meta: `${input.session.date || new Date().toISOString().slice(0, 10)} · Generated by AWS Career Launchpad Pro`,
      });
      if (result?.method === 'popup') {
        toast.success('Preview opened in a new tab — press Ctrl/Cmd+P to print or save.');
      } else if (result?.method === 'download') {
        toast.success('Downloaded as HTML — open + press Ctrl/Cmd+P to save as PDF.');
      }
    } catch (err) {
      console.error('[doPrintable] failed:', err);
      toast.error('Print view failed — see browser console.');
    }
  }

  async function doPdfDownload() {
    if (pdfBusy) return;
    setPdfBusy(true);
    toast.info ? toast.info('Generating PDF…') : null;
    try {
      await downloadReportAsPdf({
        markdown,
        title: values.projectName || 'Project report',
        meta: `${input.session.date || new Date().toISOString().slice(0, 10)} · Generated by AWS Career Launchpad Pro`,
      });
      toast.success('PDF downloaded! Check your Downloads folder.');
    } catch (err) {
      console.error('[doPdfDownload] failed:', err);
      toast.error('PDF download failed — try the print view as a backup.');
    } finally {
      setPdfBusy(false);
    }
  }

  async function doGitHubPush() {
    if (!ghToken) {
      toast.error('No GitHub token in Settings — add one first.');
      return;
    }
    if (!values.repoName) {
      toast.error('Pick a repo name in Step 7 first.');
      return;
    }
    setPushState({ ok: false, url: null, error: null, busy: true });
    try {
      const res = await pushSessionReportToGitHub({
        token: ghToken,
        input,
        repoName: values.repoName,
        isPublic: values.repoPublic !== false,
      });
      setPushState({ ok: true, url: res.html_url || res.url, error: null, busy: false });
      toast.success('Pushed to GitHub.');
    } catch (err) {
      setPushState({ ok: false, url: null, error: err.message, busy: false });
      toast.error('GitHub push failed — ' + err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/15">
            <CheckCircle2 size={20} className="text-emerald-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Everything captured</h3>
            <p className="text-sm opacity-80 mt-1">
              Session recorded · {input.session.steps?.length || 0} steps · {Object.keys(values).length} fields.
              Pick one or more outputs below.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <OutputCard
          icon={Download}
          title="Markdown"
          description="Download a .md file. Paste into Notion, GitHub Wiki, or anywhere."
          action={<Button variant="primary" onClick={doMarkdown}>Download .md</Button>}
        />
        <OutputCard
          icon={Printer}
          title="PDF / Print"
          description="Branded cover page + clean A4 formatting. Download a real PDF, or open the print preview in a new tab."
          action={
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={doPdfDownload} disabled={pdfBusy}>
                {pdfBusy ? 'Generating…' : '⬇ Download PDF'}
              </Button>
              <Button variant="ghost" onClick={doPrintable}>
                Open preview
              </Button>
            </div>
          }
        />
        <OutputCard
          icon={Github}
          title="GitHub push"
          description={ghToken ? 'Push README.md + REPORT.md + .gitignore to a fresh repo.' : 'Add a GitHub PAT in Settings → Integrations first.'}
          action={
            <Button variant="primary" onClick={doGitHubPush} disabled={pushState.busy || !ghToken || !values.repoName}>
              {pushState.busy ? 'Pushing…' : 'Push to GitHub'}
            </Button>
          }
        />
      </div>

      {/* AD-02 + AD-01 + PJ-03: smart services + region + cost trio */}
      <ProjectBuilderSmartPanel
        values={values}
        defaultServices={PROJECT_TYPE_SERVICES[values.projectType] || ['s3', 'cloudfront']}
      />

      {/* PJ-04 Phase B: Generate a Deep Walkthrough from this project */}
      <section className="surface rounded-2xl p-5 border-l-4 border-l-aws-orange flex flex-wrap items-center gap-4">
        <div className="text-4xl">🛠</div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            Build with full context
          </div>
          <h3 className="text-lg font-extrabold">Generate a Deep Walkthrough for this project</h3>
          <p className="text-[12px] opacity-80 leading-snug mt-0.5">
            Auto-orders the right services (network → security → storage → compute → integration → monitoring) and adds WHY,
            analogy, mistakes, and HOW in 4 formats for each step.
          </p>
        </div>
        <Link
          to={`/walkthroughs/deep/new?title=${encodeURIComponent(values.projectName || 'My project')}&brief=${encodeURIComponent(values.summary || values.architecture || '')}&services=${(PROJECT_TYPE_SERVICES[values.projectType] || []).join(',')}&source=project`}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          ✨ Generate walkthrough
        </Link>
      </section>

      {pushState.url && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm flex items-center gap-2">
          <Github size={14} />
          <span className="opacity-80">Pushed:</span>
          <a href={pushState.url} target="_blank" rel="noreferrer" className="font-mono underline flex items-center gap-1">
            {pushState.url} <ExternalLink size={11} />
          </a>
        </div>
      )}
      {pushState.error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-sm">{pushState.error}</div>
      )}

      <details className="rounded-2xl border border-token bg-[var(--card)] p-4">
        <summary className="cursor-pointer text-sm font-semibold opacity-80">Preview the Markdown</summary>
        <pre className="mt-3 text-[10px] font-mono whitespace-pre-wrap overflow-auto max-h-96 opacity-90">{markdown}</pre>
      </details>
    </div>
  );
}

function OutputCard({ icon: Icon, title, description, action }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card)] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[var(--brand)]" />
        <span className="font-bold">{title}</span>
      </div>
      <p className="text-xs opacity-70 flex-1">{description}</p>
      <div>{action}</div>
    </div>
  );
}

// ============================================================================
// shared field components
// ============================================================================

function Field({ label, hint, value, onChange, placeholder, textarea, rows = 3, autoFocus, asSelect, options }) {
  const common = 'w-full px-3 py-2.5 rounded-xl bg-[var(--card)] border border-token focus:border-[var(--brand)] focus:outline-none text-sm';
  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1.5 block">{label}</label>
      {asSelect ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={common}>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={common} />
      ) : (
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} autoFocus={autoFocus}
          className={common}
        />
      )}
      {hint && <div className="text-[10px] opacity-60 mt-1">{hint}</div>}
    </div>
  );
}

function FieldWithSuggest({ label, hint, value, onChange, suggestKind, suggestHint, suggest, context }) {
  const [variations, setVariations] = useState([]);

  async function pickOne() {
    const s = suggestName(suggestKind, suggestHint, context);
    onChange(s);
    suggest?.(suggestKind, suggestHint);
  }

  function showMore() {
    setVariations(suggestVariations(suggestKind, suggestHint, context, 4));
  }

  return (
    <div>
      <label className="text-[10px] uppercase tracking-widest font-bold opacity-70 mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--card)] border border-token focus:border-[var(--brand)] focus:outline-none text-sm"
          placeholder={suggestName(suggestKind, suggestHint, context)}
        />
        <button onClick={pickOne} className="px-3 py-2 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)] hover:bg-[var(--brand)]/25 text-xs font-bold flex items-center gap-1 shrink-0">
          <Wand2 size={12} /> Suggest
        </button>
        <button onClick={showMore} className="px-3 py-2 rounded-xl bg-[var(--card-2)] hover:bg-[var(--card)] text-xs font-bold flex items-center gap-1 shrink-0" title="Show variations">
          <RefreshCw size={12} />
        </button>
      </div>
      {hint && <div className="text-[10px] opacity-60 mt-1">{hint}</div>}
      {variations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {variations.map((v) => (
            <button
              key={v}
              onClick={() => { onChange(v); setVariations([]); }}
              className="text-[11px] font-mono px-2 py-1 rounded-lg bg-[var(--card-2)] hover:bg-[var(--brand)]/15"
            >
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// helpers
// ============================================================================

function slug(s) {
  return (s || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function defaultArchitectureFor(type) {
  if (type === 'static-site') {
    return `User → CloudFront → S3 bucket (static files)

- HTML/CSS/JS files in the bucket
- CloudFront CDN in front for HTTPS + global cache
- (Optional) Route 53 for the custom domain`;
  }
  if (type === 'blog') {
    return `Markdown source → static-site build → S3 → CloudFront

- Posts written in Markdown
- Build step generates HTML
- Same hosting stack as static-site`;
  }
  if (type === 'api') {
    return `Client → API Gateway → Lambda → DynamoDB

- Stateless Lambda handlers
- DynamoDB for persistence
- API Gateway for routing + throttling`;
  }
  if (type === 'serverless') {
    return `S3 (front-end) + API Gateway → Lambda → DynamoDB / S3 / EventBridge

- Multi-function backend
- Event-driven workflows via EventBridge
- All managed services, no servers to maintain`;
  }
  if (type === 'dashboard') {
    return `Data → S3 / Glue / Athena → QuickSight (or React on S3)

- Data lands in S3
- Athena queries the lake
- Front-end dashboard on S3 + CloudFront`;
  }
  return '';
}

function synthSession(values) {
  return {
    title: values.projectName || 'Project session',
    date: new Date().toISOString().slice(0, 10),
    summary: values.summary || 'Project built via the Project Builder wizard.',
    durationMin: null,
    outcomes: [],
    steps: [],
    nextSteps: [],
  };
}

// AD-02 + AD-01 + PJ-03: combined smart panel — services + region + cost
function ProjectBuilderSmartPanel({ values, defaultServices }) {
  const projectId = `pb-${values.projectType || 'default'}`;
  const brief = `${values.projectName || ''} ${values.summary || ''} ${values.architecture || ''}`.trim();
  const saved = useProjectRegion(projectId);
  const [services, setServices] = useState(defaultServices);

  // Update services when project type changes (resets to type defaults)
  useEffect(() => {
    setServices(defaultServices);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.projectType]);

  return (
    <div className="space-y-3">
      {/* AD-02: Services */}
      <section className="surface rounded-2xl p-4">
        <ServiceSuggestionChips
          brief={brief}
          selected={services}
          onChange={setServices}
        />
      </section>

      {/* AD-01: Region */}
      <section className="surface rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-aws-orange">
        <div className="flex-1 min-w-[200px]">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
            AD-01 · AWS region for this project
          </div>
          <div className="text-[12.5px] opacity-85">
            Auto-suggested based on your project description. Click the chip to see why or override.
          </div>
        </div>
        <RegionSuggestionChip projectId={projectId} brief={brief} />
      </section>

      {/* PJ-03: Cost estimate using the selected services + region */}
      <CostEstimatorCard
        services={services}
        projectName={values.projectName || 'this project'}
        region={saved?.region}
      />
    </div>
  );
}
