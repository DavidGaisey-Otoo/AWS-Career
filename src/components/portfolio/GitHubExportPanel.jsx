import { motion } from 'framer-motion';
import {
  AlertCircle, Check, ChevronRight, ClipboardCopy, ExternalLink, FileCode,
  Github, Loader2, Rocket, Sparkles, Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getServiceMeta } from '../../data/projects.js';
import { useEarn } from '../../context/EarnContext.jsx';
import { dataUrlToBase64, pushPortfolioRepo, suggestRepoName } from '../../lib/githubPush.js';
import { getGithubAccessToken, hasGithubAppSession } from '../../lib/githubAppAuth.js';
import { cn } from '../../lib/utils.js';

/**
 * GitHub export panel — surfaces on completed projects.
 *
 * Three sections in one card:
 *   1. Auto-generated README preview + copy
 *   2. Step-by-step git commands with per-step copy
 *   3. "Paste your GitHub URL" input → green badge once saved
 *
 * Reads from PortfolioContext (`github` field already exists on each
 * project state). Writes the URL via updateProjectState.
 */
export function GitHubExportPanel({ projectId, project, projectState, stats }) {
  const { profile } = useApp();
  const { updateProjectState } = usePortfolio();
  const toast = useToast();
  const [tab, setTab] = useState('push');
  const [draftUrl, setDraftUrl] = useState(projectState.github || '');

  const readme = useMemo(() =>
    generateReadme({ project, projectState, stats, profile }),
  [project, projectState, stats, profile]);

  const slug = useMemo(() =>
    project.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
  [project.title]);

  const commitMsg = useMemo(() => {
    // Conventional-commit style based on the project type
    return `feat: ${project.title.toLowerCase().split(' ')[0]} — ${project.tagline}`.slice(0, 100);
  }, [project]);

  const repoUrl = projectState.github;
  const saved = !!repoUrl && /^https?:\/\//.test(repoUrl);

  const copy = async (text, label = 'Copied') => {
    try { await navigator.clipboard.writeText(text); toast.success(label); }
    catch { toast.error('Could not copy — select and copy manually'); }
  };

  const saveUrl = () => {
    const trimmed = (draftUrl || '').trim();
    if (!trimmed) {
      updateProjectState(projectId, { github: '' });
      toast.info('GitHub URL cleared');
      return;
    }
    if (!/^https?:\/\/(www\.)?github\.com\//i.test(trimmed)) {
      toast.warning('Please paste a https://github.com/... URL');
      return;
    }
    updateProjectState(projectId, { github: trimmed });
    toast.success('GitHub repository saved — green badge unlocked');
  };

  const TABS = [
    { id: 'push',     label: 'Push to GitHub', icon: Rocket },
    { id: 'readme',   label: 'README',         icon: FileCode },
    { id: 'commands', label: 'Git commands',   icon: Github },
    { id: 'save',     label: 'Save repo URL',  icon: ChevronRight },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="surface rounded-2xl p-5 sm:p-6 gradient-border relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Github size={16} className="text-aws-orange" />
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">
              GitHub integration
            </h3>
            {saved && (
              <span className="chip bg-success/15 text-success border border-success/30 text-[10px] font-extrabold">
                <Check size={10} /> Pushed to GitHub
              </span>
            )}
          </div>
          {saved && (
            <a href={repoUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 text-xs font-bold text-aws-orange hover:underline">
              <ExternalLink size={11} /> Open repo
            </a>
          )}
        </div>

        <p className="text-xs text-muted leading-relaxed mb-3">
          Your project is complete. Push it to GitHub so it actually counts toward your portfolio —
          recruiters and clients want to <em>see the code</em>, not just the screenshot.
        </p>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token mb-3">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                        tab === t.id ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                                     : 'text-muted hover:text-current'
                      )}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'push'     && (
          <PushView
            project={project}
            projectState={projectState}
            readme={readme}
            slug={slug}
            profile={profile}
            onSaved={(url) => { setDraftUrl(url); updateProjectState(projectId, { github: url }); }}
          />
        )}
        {tab === 'readme'   && <ReadmeView readme={readme} onCopy={copy} />}
        {tab === 'commands' && <CommandsView slug={slug} commitMsg={commitMsg} repoUrl={repoUrl} onCopy={copy} />}
        {tab === 'save'     && (
          <SaveUrlView
            draftUrl={draftUrl} setDraftUrl={setDraftUrl}
            onSave={saveUrl} saved={saved}
          />
        )}
      </div>
    </motion.section>
  );
}

// ============================ Push tab (one-click GitHub push) ============================

function PushView({ project, projectState, readme, slug, profile, onSaved }) {
  const toast = useToast();
  const { stageInQueue } = useEarn();
  const legacyToken = profile?.integrations?.githubToken || '';
  const hasAuth = hasGithubAppSession() || Boolean(legacyToken);
  const [repoName, setRepoName] = useState(suggestRepoName(project.title));
  const [isPublic, setIsPublic] = useState(true);
  const [progress, setProgress] = useState(null);    // { stage, message }
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState(null);

  // What we'll push — README + architecture SVG + screenshots + Terraform skeleton (if avail)
  const fileBundle = useMemo(() => {
    const files = [{ path: 'README.md', content: readme }];

    // Architecture SVG (if the project has one)
    if (project.architecture?.svg) {
      files.push({ path: 'architecture.svg', content: project.architecture.svg });
    }
    // Screenshots from PortfolioContext are stored as data URLs
    (projectState.screenshots || []).forEach((s, i) => {
      const b64 = dataUrlToBase64(s.dataUrl);
      if (b64) files.push({ path: `screenshots/screenshot-${i + 1}.png`, content: b64, isBinary: true });
    });
    // .gitignore — standard noise we don't want in the repo
    files.push({
      path: '.gitignore',
      content: [
        '# OS', '.DS_Store', 'Thumbs.db', '',
        '# Editors', '.vscode/', '.idea/', '*.swp', '',
        '# Node / build', 'node_modules/', 'dist/', 'build/', '',
        '# Terraform', '.terraform/', '*.tfstate', '*.tfstate.*', '*.tfvars', '',
        '# Secrets', '*.pem', '*.key', '.env', '.env.*', '',
      ].join('\n'),
    });
    return files;
  }, [project, projectState, readme]);

  const topics = useMemo(() => {
    const out = new Set(['aws', 'cloud', 'portfolio']);
    (project.services || []).forEach((s) => out.add(String(s).toLowerCase()));
    return Array.from(out);
  }, [project]);

  const onPush = async () => {
    const token = await getGithubAccessToken().catch(() => null) || legacyToken;
    if (!token) {
      toast.error('Connect GitHub in Settings → Integrations first.');
      return;
    }
    setPushing(true);
    setResult(null);
    setProgress({ stage: 'start', message: 'Starting…' });
    try {
      const out = await pushPortfolioRepo({
        token,
        repoName: repoName.trim(),
        description: project.tagline || project.summary || '',
        topics,
        isPublic,
        files: fileBundle,
        onProgress: (stage, message) => setProgress({ stage, message }),
      });
      setResult(out);
      if (out.ok && out.html_url) {
        onSaved(out.html_url);
        toast.success(`Pushed → ${out.full_name}`);
      } else {
        toast.error('Push completed with errors — see details below.');
      }
    } catch (err) {
      toast.error('Push failed — ' + ((err && err.message) || String(err)));
    }
    setPushing(false);
  };

  // No token → setup prompt
  if (!hasAuth) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-4 space-y-2">
          <div className="text-sm font-extrabold text-warning inline-flex items-center gap-2">
            <AlertCircle size={14} /> GitHub token not configured
          </div>
          <p className="text-[12px] leading-relaxed">
            To push directly from this app, connect the GitHub App once.
            Open <a href="/settings?section=integrations" className="text-aws-orange font-bold hover:underline">Settings → Integrations → GitHub App connection</a>.
            Until then, use the <strong>README</strong> + <strong>Git commands</strong> tabs above for the manual flow.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-aws-orange/30 bg-aws-orange/5 p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <Rocket size={18} className="text-aws-orange shrink-0 mt-0.5" />
          <div className="text-[12px] leading-relaxed">
            One-click push: creates a new repo, uploads your README + architecture diagram + screenshots
            + .gitignore, and sets searchable topics. <strong className="text-current">Zero terminal commands.</strong>
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
          <label className="block">
            <span className="text-[10px] font-bold text-muted">Repo name</span>
            <input
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              className="mt-1 w-full bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-xs font-mono focus-ring focus:border-aws-orange"
            />
          </label>
          <label className="flex items-center gap-1.5 text-[11px] font-bold">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)}
                   className="w-4 h-4 accent-aws-orange" />
            <span>Public repo (recommended for portfolio)</span>
          </label>
        </div>

        <div className="text-[11px] text-muted">
          <strong className="text-current">Will push:</strong> {fileBundle.length} files{' · '}
          <strong className="text-current">Topics:</strong> {topics.join(', ')}
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-2">
          <button
            onClick={onPush}
            disabled={pushing || !repoName.trim()}
            className={cn('btn btn-primary', (pushing || !repoName.trim()) && 'opacity-50 cursor-not-allowed')}
          >
            {pushing ? <><Loader2 size={14} className="animate-spin" /> {progress?.message || 'Pushing…'}</>
                     : <><Rocket size={14} /> Push now</>}
          </button>
          <button
            onClick={() => {
              stageInQueue({
                kind: 'github-push',
                title: `Push: ${repoName}`,
                body: `Repo: ${repoName}\nVisibility: ${isPublic ? 'public' : 'private'}\nFiles: ${fileBundle.length}\nTopics: ${topics.join(', ')}\n\nWhen ready, open this project (${project.title}) → GitHub integration → "Push now".`,
                meta: { repoName, isPublic, projectId: projectState.id, projectTitle: project.title, topics },
                sourceId: projectState.id,
                status: 'ready',
              });
              toast.success('Staged in Content Queue — push it whenever you\'re ready');
            }}
            disabled={!repoName.trim()}
            className="btn btn-ghost"
            title="Don't push yet — save the plan to the Content Queue and push later"
          >
            <Sparkles size={14} /> Stage for later
          </button>
        </div>
      </div>

      {progress && !pushing && (
        <div className="text-[10px] text-muted">Last status: <span className="text-current">{progress.message}</span></div>
      )}

      {result && (
        <div className={cn(
          'rounded-xl border p-3',
          result.ok ? 'border-success/30 bg-success/10' : 'border-warning/30 bg-warning/10',
        )}>
          <div className="flex items-start gap-2.5">
            {result.ok ? <Check size={14} className="text-success shrink-0 mt-0.5" />
                       : <AlertCircle size={14} className="text-warning shrink-0 mt-0.5" />}
            <div className="text-[12px] leading-relaxed flex-1">
              {result.ok ? (
                <>
                  <div className="font-extrabold text-success">Pushed!</div>
                  <a href={result.html_url} target="_blank" rel="noreferrer"
                     className="text-aws-orange font-bold hover:underline inline-flex items-center gap-1">
                    <ExternalLink size={11} /> {result.full_name}
                  </a>
                  <div className="mt-1 text-[11px] text-muted">
                    {(result.files || []).length} files uploaded.
                  </div>
                </>
              ) : (
                <>
                  <div className="font-extrabold text-warning">Push completed with issues</div>
                  <ul className="mt-1 space-y-0.5 text-[11px]">
                    {(result.errors || []).map((e, i) => (
                      <li key={i}>• {e.stage}{e.path ? ` (${e.path})` : ''}: {e.message}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ README tab ============================

function ReadmeView({ readme, onCopy }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5">
          <Wand2 size={11} /> Auto-generated from your project data
        </span>
        <button onClick={() => onCopy(readme, 'README copied — paste into README.md')}
                className="btn btn-primary !text-xs !py-1.5">
          <ClipboardCopy size={12} /> Copy full README
        </button>
      </div>
      <pre className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 text-[11px] font-mono leading-relaxed whitespace-pre-wrap max-h-[480px] overflow-y-auto">
        {readme}
      </pre>
    </div>
  );
}

// ============================ Commands tab ============================

function CommandsView({ slug, commitMsg, repoUrl, onCopy }) {
  const placeholderRemote = repoUrl || `git@github.com:YOUR_USERNAME/${slug}.git`;
  const steps = [
    { n: 1, title: 'Initialize the repo',
      cmd: 'git init',
      hint: 'Run this in the project root folder.' },
    { n: 2, title: 'Stage everything',
      cmd: 'git add .',
      hint: 'Tip: keep a .gitignore with /node_modules, /.terraform, *.tfstate, .env BEFORE this step.' },
    { n: 3, title: 'First commit',
      cmd: `git commit -m "${commitMsg}"`,
      hint: 'Conventional-commits prefix (feat/fix/docs/chore) reads well on GitHub.' },
    { n: 4, title: 'Add your GitHub remote',
      cmd: `git remote add origin ${placeholderRemote}`,
      hint: 'Create the repo on github.com first — it can be empty.' },
    { n: 5, title: 'Push to main',
      cmd: 'git push -u origin main',
      hint: 'If your default branch is master: git push -u origin master.' },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-1">
        Copy each step in order. Total time: about 90 seconds for a new repo.
      </p>
      {steps.map((s) => (
        <div key={s.n} className="surface-2 rounded-xl p-3.5">
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-lg bg-gradient-aws text-ink-950 grid place-items-center font-black text-xs flex-shrink-0">
              {s.n}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold">{s.title}</h4>
                <button onClick={() => onCopy(s.cmd)}
                        className="btn btn-ghost !text-[11px] !py-1">
                  <ClipboardCopy size={11} /> Copy
                </button>
              </div>
              <pre className="mt-1.5 rounded-md bg-[var(--card)] border border-token px-2.5 py-1.5 text-[11px] font-mono leading-relaxed overflow-x-auto">
                {s.cmd}
              </pre>
              {s.hint && (
                <p className="mt-1.5 text-[11px] text-muted leading-relaxed">{s.hint}</p>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="rounded-xl border border-electric/30 bg-electric/[0.04] p-3 mt-2">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-electric mb-1 flex items-center gap-1.5">
          <Sparkles size={11} /> One-shot version
        </div>
        <p className="text-xs text-muted leading-relaxed mb-2">
          Paste this whole block into one terminal session after you create the GitHub repo:
        </p>
        <pre className="rounded-md bg-[var(--card)] border border-token px-3 py-2 text-[11px] font-mono leading-relaxed overflow-x-auto">
{`git init
git add .
git commit -m "${commitMsg}"
git remote add origin ${placeholderRemote}
git push -u origin main`}
        </pre>
        <button onClick={() => onCopy(
          `git init\ngit add .\ngit commit -m "${commitMsg}"\ngit remote add origin ${placeholderRemote}\ngit push -u origin main`,
          'One-shot script copied'
        )} className="btn btn-ghost !text-[11px] !py-1.5 mt-2">
          <ClipboardCopy size={11} /> Copy one-shot
        </button>
      </div>
    </div>
  );
}

// ============================ Save URL tab ============================

function SaveUrlView({ draftUrl, setDraftUrl, onSave, saved }) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1.5">
          <Github size={11} className="text-aws-orange" /> Paste your GitHub repository URL
        </span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <input
            value={draftUrl}
            onChange={(e) => setDraftUrl(e.target.value)}
            placeholder="https://github.com/your-handle/your-repo"
            onKeyDown={(e) => { if (e.key === 'Enter') onSave(); }}
            className="flex-1 min-w-[260px] bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm font-semibold focus-ring focus:border-aws-orange font-mono"
          />
          <button onClick={onSave} className="btn btn-primary">
            <Check size={14} /> Save
          </button>
        </div>
      </label>

      {!saved && (
        <div className="rounded-xl border border-warning/30 bg-warning/[0.04] p-3 flex items-start gap-2">
          <AlertCircle size={14} className="text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted leading-relaxed">
            Once saved, this URL appears on the portfolio card (with a green GitHub badge),
            on your shared portfolio page, and inside every proposal you generate for similar work.
          </p>
        </div>
      )}

      {saved && (
        <div className="rounded-xl border border-success/30 bg-success/[0.04] p-3">
          <div className="flex items-start gap-2">
            <Check size={14} className="text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <strong className="text-success">Saved.</strong> Your project card now has a
              GitHub badge. Open the repo any time:
              <div className="mt-1.5">
                <a href={draftUrl} target="_blank" rel="noreferrer"
                   className="text-aws-orange font-bold font-mono break-all hover:underline">
                  {draftUrl}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================ README generator ============================

function generateReadme({ project, projectState, stats, profile }) {
  const services = (project.services || [])
    .map((id) => `![${id}](https://img.shields.io/badge/${getServiceMeta(id).label.replace(/\s/g, '%20')}-FF9900?style=flat-square&logo=amazonaws&logoColor=white)`)
    .join(' ');

  const prereqs = (project.prerequisites || []).map((p) => `- ${p}`).join('\n');

  const consoleSteps = (project.buildSteps || []).slice(0, 5)
    .map((s, i) => `${i + 1}. **${s.title}**${s.subs?.length ? '\n   ' + s.subs.slice(0, 4).map((sub) => `- ${sub.title}`).join('\n   ') : ''}`)
    .join('\n');

  const archServices = (project.architecture?.nodes || [])
    .map((n) => `- **${n.label}** ${n.service ? `· \`${getServiceMeta(n.service).label}\`` : ''}`)
    .join('\n');

  const archEdges = (project.architecture?.edges || [])
    .map((e) => {
      const from = project.architecture.nodes.find((n) => n.id === e.from)?.label;
      const to   = project.architecture.nodes.find((n) => n.id === e.to)?.label;
      return `- ${from} → ${to}${e.label ? ` (\`${e.label}\`)` : ''}`;
    })
    .join('\n');

  // CLI sample — generic per service
  const cliExample = generateCliExample(project);

  // Terraform sample — generic per project type
  const tfExample = generateTerraformExample(project);

  const cost = project.costNotes || (project.freeTier ? '**Free Tier eligible.** Under $5/mo at low traffic.' : 'Variable — see AWS Pricing Calculator.');

  const lessons = (projectState.lessons || '').trim() || '_Add your own — what surprised you, what would you change?_';

  const certs = (project.certs || []).join(' · ');
  const completedOn = projectState.finishedAt ? new Date(projectState.finishedAt).toLocaleDateString() : new Date().toLocaleDateString();
  const integrations = profile?.integrations || {};
  const author = [
    `**${profile?.name || 'Cloud Engineer'}**`,
    integrations.linkedin ? `[LinkedIn](${integrations.linkedin})` : null,
    integrations.github ? `[GitHub](${integrations.github})` : null,
    integrations.hashnode ? `[Blog](${integrations.hashnode})` : null,
  ].filter(Boolean).join(' · ');

  return `# ${project.title} — AWS Portfolio Project

${services}

> ${project.tagline}

## 📋 Overview

${project.summary || project.tagline}

Built as part of an AWS Solutions Architect portfolio. Demonstrates ${project.skills?.slice(0, 3).join(', ')}${project.skills?.length > 3 ? ', and more' : ''}.

**Difficulty:** ${project.difficulty} · **Estimated time:** ${project.estLabel} · **Completed:** ${completedOn}

## 🏗️ Architecture

${archServices || '_See diagram in repo._'}

**Data flow:**
${archEdges || '_See diagram in repo._'}

## ☁️ AWS Services Used

${(project.services || []).map((sid) => `- **${getServiceMeta(sid).label}** — ${getServiceMeta(sid).domain}`).join('\n')}

## ✅ Prerequisites

${prereqs || '- AWS account with appropriate IAM permissions\n- Familiarity with the AWS console'}

## 🚀 How to Deploy

### Console method (point-and-click)

${consoleSteps || '_Walk through the AWS console step by step._'}

### CLI method (one terminal session)

\`\`\`bash
${cliExample}
\`\`\`

### Terraform method (infrastructure as code)

\`\`\`hcl
${tfExample}
\`\`\`

Then:

\`\`\`bash
terraform init
terraform plan
terraform apply -auto-approve
\`\`\`

## 🧪 Testing Results

${stats?.doneSteps !== undefined
    ? `- ✅ ${stats.doneSteps} of ${stats.totalSteps} build-guide steps completed
- ✅ Deployment verified end-to-end
- ✅ Cleanup procedure documented`
    : '- ✅ Deployment verified end-to-end\n- ✅ Cleanup procedure documented'}

## 💰 Estimated Monthly Cost

${cost}

## 📚 Lessons Learned

${lessons}

## 🎯 Skills Demonstrated

${(project.skills || []).map((s) => `- ${s}`).join('\n')}

## 🏆 Related Certifications

${certs ? `Skills practiced here directly support: **${certs}**.` : '_See AWS certification mapping._'}

## 🧹 Cleanup

To avoid ongoing charges:

\`\`\`bash
# If you used Terraform:
terraform destroy -auto-approve

# Or manually delete via the AWS console — start with the resources that incur hourly charges first.
\`\`\`

## 👤 Author

${author}

---

_Built with the AWS Career Launchpad Pro portfolio workflow._
`;
}

function generateCliExample(project) {
  const services = new Set(project.services || []);
  if (services.has('s3') && services.has('cloudfront')) {
    return `# Create bucket and enable website hosting
aws s3api create-bucket --bucket my-portfolio-site-\${RANDOM} --region us-east-1
aws s3 website s3://my-portfolio-site-\${RANDOM}/ --index-document index.html
aws s3 cp ./dist/ s3://my-portfolio-site-\${RANDOM}/ --recursive

# Create CloudFront distribution (use the AWS console for first setup)
aws cloudfront create-distribution --distribution-config file://cf-config.json`;
  }
  if (services.has('lambda') && services.has('apigateway')) {
    return `# Package and deploy the Lambda
zip -r function.zip .
aws lambda create-function \\
  --function-name myFn \\
  --runtime nodejs20.x \\
  --role arn:aws:iam::\${ACCOUNT_ID}:role/lambda-exec \\
  --handler index.handler \\
  --zip-file fileb://function.zip

# Wire it to API Gateway
aws apigatewayv2 create-api --name myApi --protocol-type HTTP \\
  --target arn:aws:lambda:us-east-1:\${ACCOUNT_ID}:function:myFn`;
  }
  if (services.has('vpc') || services.has('ec2')) {
    return `# Create VPC + subnet + IGW
aws ec2 create-vpc --cidr-block 10.0.0.0/16
aws ec2 create-subnet --vpc-id vpc-XXX --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-internet-gateway
aws ec2 attach-internet-gateway --vpc-id vpc-XXX --internet-gateway-id igw-XXX

# Launch t2.micro
aws ec2 run-instances --image-id ami-XXX --instance-type t2.micro \\
  --subnet-id subnet-XXX --key-name my-key`;
  }
  // Generic
  return `# Verify your identity
aws sts get-caller-identity

# Inspect resources (adjust service per project)
aws ec2 describe-vpcs
aws s3 ls
aws rds describe-db-instances`;
}

function generateTerraformExample(project) {
  const services = new Set(project.services || []);
  if (services.has('s3') && services.has('cloudfront')) {
    return `terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

provider "aws" { region = "us-east-1" }

resource "aws_s3_bucket" "site" {
  bucket = "my-portfolio-site-\${random_id.suffix.hex}"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id   = "s3-site"
  }
  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
  }
  enabled             = true
  default_root_object = "index.html"
  viewer_certificate { cloudfront_default_certificate = true }
  restrictions { geo_restriction { restriction_type = "none" } }
}

resource "random_id" "suffix" { byte_length = 4 }`;
  }
  if (services.has('lambda') && services.has('apigateway')) {
    return `resource "aws_lambda_function" "fn" {
  filename      = "function.zip"
  function_name = "myFn"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
}

resource "aws_apigatewayv2_api" "api" {
  name          = "myApi"
  protocol_type = "HTTP"
  target        = aws_lambda_function.fn.arn
}

resource "aws_iam_role" "lambda" {
  name = "lambda-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Effect = "Allow", Principal = { Service = "lambda.amazonaws.com" }, Action = "sts:AssumeRole" }]
  })
}`;
  }
  if (services.has('vpc') || services.has('ec2')) {
    return `module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  name   = "portfolio-vpc"
  cidr   = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

resource "aws_instance" "web" {
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t2.micro"
  subnet_id     = module.vpc.public_subnets[0]
}`;
  }
  return `# Replace the modules below with the services specific to your project
terraform {
  required_providers { aws = { source = "hashicorp/aws", version = "~> 5.0" } }
}

provider "aws" { region = "us-east-1" }

# … add resource blocks per service used`;
}
