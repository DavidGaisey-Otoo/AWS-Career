import {
  Calendar, Check, ClipboardCopy, Gauge, Globe, Linkedin, Sparkles, Star,
  Wand2, Youtube,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { POST_TEMPLATES, CONTENT_CALENDAR } from '../../data/linkedinPosts.js';
import { generateWebsiteCopy, headlineOptions, scoreLinkedIn } from '../../lib/freelanceEngine.js';
import { ProgressRing } from '../roadmap/ProgressRing.jsx';
import { cn } from '../../lib/utils.js';

const TABS = [
  { id: 'linkedin', label: 'LinkedIn optimizer', icon: Linkedin },
  { id: 'calendar', label: 'Content calendar',   icon: Calendar },
  { id: 'posts',    label: 'Post templates',     icon: Sparkles },
  { id: 'github',   label: 'GitHub profile',     icon: Star },
  { id: 'website',  label: 'Personal website',   icon: Globe },
];

export function BrandingEngine() {
  const [tab, setTab] = useState('linkedin');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                      tab === t.id
                        ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                        : 'text-muted hover:text-current'
                    )}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'linkedin' && <LinkedInOptimizer />}
      {tab === 'calendar' && <ContentCalendar />}
      {tab === 'posts' && <PostTemplates />}
      {tab === 'github' && <GitHubOptimizer />}
      {tab === 'website' && <WebsiteCopy />}
    </div>
  );
}

// ---------------- LinkedIn Optimizer ----------------

function LinkedInOptimizer() {
  const { state, setBranding } = useFreelance();
  const { profile } = useApp();
  const toast = useToast();
  const [text, setText] = useState(state.branding.linkedinDraft || '');
  const [analysis, setAnalysis] = useState(state.branding.linkedinScore || null);

  const analyse = () => {
    if (!text.trim()) { toast.warning('Paste your LinkedIn profile first'); return; }
    const result = scoreLinkedIn(text);
    setAnalysis(result);
    setBranding({ linkedinScore: result, linkedinDraft: text });
  };

  const headlines = useMemo(() =>
    headlineOptions((profile?.name || 'David').split(' ')[0]),
  [profile?.name]);

  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s); toast.success('Copied'); }
    catch { toast.error('Could not copy'); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Paste your LinkedIn profile</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={'Paste your full profile text — headline + about + experience.'}
            className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-xs leading-relaxed focus-ring focus:border-aws-orange resize-y"
          />
          <button onClick={analyse} className="btn btn-primary mt-3">
            <Wand2 size={14} /> Score + suggest
          </button>
        </div>

        <div className="surface rounded-2xl p-4">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Headline options</h3>
          <ul className="space-y-1.5">
            {headlines.map((h, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <span className="flex-1">{h}</span>
                <button onClick={() => copy(h)} className="text-muted hover:text-aws-orange p-1" title="Copy">
                  <ClipboardCopy size={11} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {!analysis ? (
          <div className="surface rounded-2xl p-8 text-center text-muted text-sm">
            <Gauge size={26} className="mx-auto mb-2 text-aws-orange" />
            Paste your profile + click Score to see a section-by-section breakdown.
          </div>
        ) : (
          <>
            <div className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
              <div className="relative flex items-center gap-4">
                <ProgressRing percent={analysis.score} size={120} stroke={10} accent="rainbow">
                  <div className="text-center">
                    <div className="text-2xl font-black tabular-nums text-gradient">{analysis.score}</div>
                    <div className="text-[9px] uppercase tracking-widest text-muted font-bold">/ 100</div>
                  </div>
                </ProgressRing>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold tracking-tight">
                    {analysis.score >= 80 ? 'Strong profile.'
                     : analysis.score >= 60 ? 'Decent. A few wins away from great.'
                     : 'Lots of upside.'}
                  </h3>
                  <p className="text-xs text-muted">
                    The next few fixes will move you the most — focused below.
                  </p>
                </div>
              </div>
            </div>

            <div className="surface rounded-2xl p-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Top suggestions</h4>
              <ul className="space-y-1.5">
                {analysis.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
                {analysis.suggestions.length === 0 && (
                  <li className="text-xs text-success">Nothing critical left. Keep the cadence going.</li>
                )}
              </ul>
            </div>

            <div className="surface rounded-2xl p-4">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Section breakdown</h4>
              <ul className="space-y-1">
                {analysis.breakdown.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'w-4 h-4 rounded grid place-items-center flex-shrink-0',
                      b.awarded === b.max
                        ? 'bg-success text-white'
                        : 'bg-[var(--card-2)] text-muted border border-token'
                    )}>
                      {b.awarded === b.max ? <Check size={9} /> : '·'}
                    </span>
                    <span className="flex-1">{b.label}</span>
                    <span className="tabular-nums text-muted text-[11px]">{b.awarded}/{b.max}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- Content Calendar ----------------

function ContentCalendar() {
  return (
    <div className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">
        4-week content calendar (Mon · Wed · Fri)
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {CONTENT_CALENDAR.map((c, i) => {
          const tmpl = POST_TEMPLATES.find((t) => t.id === c.category);
          return (
            <li key={i} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                {c.day}
              </div>
              <div className="text-sm font-bold mt-1 leading-snug">{c.label}</div>
              <div className="text-[11px] text-muted mt-1 inline-flex items-center gap-1">
                {tmpl?.icon} {tmpl?.label}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted mt-3 leading-relaxed">
        <strong>Cadence:</strong> 3 posts per week is the sweet spot — enough to stay visible without burning out.
        Mix categories so your feed doesn\'t feel one-note.
      </p>
    </div>
  );
}

// ---------------- Post Templates ----------------

function PostTemplates() {
  const toast = useToast();
  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s); toast.success('Copied — paste into LinkedIn'); }
    catch { toast.error('Could not copy'); }
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {POST_TEMPLATES.map((p) => (
        <div key={p.id} className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-extrabold tracking-tight inline-flex items-center gap-1.5">
              <span className="text-base">{p.icon}</span> {p.label}
            </h4>
            <button onClick={() => copy(p.body)} className="btn btn-ghost !text-[11px] !py-1.5">
              <ClipboardCopy size={11} /> Copy
            </button>
          </div>
          <pre className="text-[11px] leading-relaxed whitespace-pre-wrap rounded-lg border border-token bg-[var(--card-2)]/40 p-2.5 max-h-56 overflow-y-auto">{p.body}</pre>
        </div>
      ))}
    </div>
  );
}

// ---------------- GitHub Optimizer ----------------

function GitHubOptimizer() {
  const { profile } = useApp();
  const { state, setBranding } = useFreelance();
  const toast = useToast();

  const firstName = (profile?.name || 'Your name').split(' ')[0];
  const defaultReadme = `# Hi, I'm ${firstName} 👋

I'm an AWS Cloud Engineer focused on **networking, serverless, and cost optimization**.

## 🛠 What I'm working on
- ☁ Building production-grade AWS environments (Terraform + CDK)
- 🌐 Designing hybrid networks with Transit Gateway + Direct Connect
- 💰 Cutting AWS bills with measurable outcomes

## 🏆 Certifications
- AWS Certified Cloud Practitioner
- AWS Certified Solutions Architect Associate (in progress)

## 🧱 Stack
\`AWS · Terraform · CDK · Python · Node.js · Linux · Docker\`

## 📫 Reach me
- LinkedIn: linkedin.com/in/your-handle
- Email: you@example.com

> 💡 Tip: the project I'm proudest of is pinned below — start there.`;

  const [draft, setDraft] = useState(state.branding.githubReadmeDraft || defaultReadme);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setBranding({ githubReadmeDraft: draft });
      toast.success('README copied — paste into github.com/{you}/{you}/README.md');
    } catch { toast.error('Could not copy'); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="surface rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Profile README</h3>
          <button onClick={copy} className="btn btn-primary !text-xs !py-1.5">
            <ClipboardCopy size={12} /> Copy README
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={20}
          className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-xs font-mono leading-relaxed focus-ring focus:border-aws-orange resize-y"
        />
      </div>
      <div className="space-y-3">
        <Tip title="Pinned repositories" body="Pin your 3 strongest AWS projects. Each one needs a real README — diagram + what + why + how to deploy." />
        <Tip title="Contribution graph" body="A green graph signals activity. 4-5 small commits per week beats one big monthly push." />
        <Tip title="Repository README essentials" body="Every repo: ▸ One-paragraph what + why ▸ Architecture diagram ▸ Setup steps ▸ Cost note ▸ Cleanup section." />
        <Tip title="How to showcase" body="Add screenshots + a 60-second video walkthrough. Engineers scan visually before they read." />
      </div>
    </div>
  );
}

function Tip({ title, body }) {
  return (
    <div className="surface rounded-2xl p-4">
      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">{title}</h4>
      <p className="text-xs leading-relaxed">{body}</p>
    </div>
  );
}

// ---------------- Website Copy ----------------

function WebsiteCopy() {
  const { profile } = useApp();
  const { state, setBranding } = useFreelance();
  const toast = useToast();
  const [audience, setAudience] = useState('B2B SaaS startups');
  const [generated, setGenerated] = useState(state.branding.websiteDrafts || null);

  const generate = () => {
    const out = generateWebsiteCopy({
      audience,
      yourName: profile?.name || 'You',
      yearsNetworking: 5,
      location: 'Accra, Ghana',
    });
    setGenerated(out);
    setBranding({ websiteDrafts: out });
    toast.success('Generated');
  };

  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s); toast.success('Copied'); }
    catch { toast.error('Could not copy'); }
  };

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Target audience</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="flex-1 min-w-[200px] bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange"
            placeholder='e.g. "B2B SaaS startups", "UK enterprises"'
          />
          <button onClick={generate} className="btn btn-primary"><Wand2 size={14} /> Generate copy</button>
        </div>
      </div>

      {generated && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Block label="Hero (primary)" text={generated.hero} onCopy={copy} />
          <Block label="Hero (alternate)" text={generated.heroAlt} onCopy={copy} />
          <Block label="About" text={generated.about} onCopy={copy} wide />
          <Block label="Services list" text={generated.services.map((s) => `• ${s}`).join('\n')} onCopy={copy} />
          <Block label="SEO meta description" text={generated.seo} onCopy={copy} />
        </div>
      )}
    </div>
  );
}

function Block({ label, text, onCopy, wide }) {
  return (
    <div className={cn('surface rounded-2xl p-4', wide && 'sm:col-span-2')}>
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">{label}</h4>
        <button onClick={() => onCopy(text)} className="text-muted hover:text-aws-orange" title="Copy">
          <ClipboardCopy size={12} />
        </button>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}
