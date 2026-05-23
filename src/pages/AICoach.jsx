import { motion } from 'framer-motion';
import {
  Award, BookmarkPlus, Briefcase, Building, ChevronLeft, ClipboardCopy,
  Compass, DollarSign, FileText, Linkedin, MessageSquare, Mic, Send, Sparkles,
  Target, TrendingUp, Trophy, User2, Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Markdown } from '../components/ai/Markdown.jsx';
import { TypingDots } from '../components/ai/TypingDots.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useAI } from '../context/AIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  CLIENT_TEMPLATES, brandingPlan, careerPathAdvisor, generateUpworkProposal,
  interviewPrompt, negotiationDrill, optimizeLinkedIn, priceAdvisor,
  reviewPortfolio, reviewUpworkProfile,
} from '../lib/coachEngine.js';
import { cn } from '../lib/utils.js';

const TOOLS = [
  { id: 'profile',  label: 'Upwork profile review',  icon: User2 },
  { id: 'proposal', label: 'Proposal generator',     icon: MessageSquare },
  { id: 'pricing',  label: 'Pricing advisor',        icon: DollarSign },
  { id: 'interview',label: 'Interview prep',         icon: Mic },
  { id: 'portfolio',label: 'Portfolio reviewer',     icon: Briefcase },
  { id: 'linkedin', label: 'LinkedIn optimizer',     icon: Linkedin },
  { id: 'branding', label: 'Personal branding',      icon: Sparkles },
  { id: 'negotiate',label: 'Negotiation drill',      icon: Trophy },
  { id: 'path',     label: 'Career path advisor',    icon: Compass },
  { id: 'templates',label: 'Client templates',       icon: FileText },
];

export default function AICoach() {
  const [tab, setTab] = useState('profile');

  return (
    <div className="space-y-5">
      <Link to="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> AI hub
      </Link>

      <PageHeader
        eyebrow="AI Career Coach"
        title="Land paid AWS work, faster."
        subtitle="Ten focused tools — profile review, proposal writer, pricing, mock interviews, negotiation drills, and more. Every output is yours to copy or save."
        icon={Wand2}
      />

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar rounded-2xl surface-2 p-1.5 border border-token">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring flex-shrink-0',
                tab === t.id
                  ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                  : 'text-muted hover:text-current'
              )}
            >
              <Icon size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        {tab === 'profile'   && <ProfileReviewer />}
        {tab === 'proposal'  && <ProposalGenerator />}
        {tab === 'pricing'   && <PricingAdvisor />}
        {tab === 'interview' && <InterviewPrep />}
        {tab === 'portfolio' && <PortfolioReviewer />}
        {tab === 'linkedin'  && <LinkedInOptimizer />}
        {tab === 'branding'  && <BrandingTool />}
        {tab === 'negotiate' && <NegotiationDrill />}
        {tab === 'path'      && <CareerPath />}
        {tab === 'templates' && <ClientTemplates />}
      </motion.div>
    </div>
  );
}

// ============================ shared helpers ============================

function GenerateButton({ disabled, label = 'Generate', onClick, busy }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={cn('btn btn-primary', (disabled || busy) && 'opacity-40 cursor-not-allowed')}
    >
      {busy ? <TypingDots /> : <><Wand2 size={14} /> {label}</>}
    </button>
  );
}

function Output({ children }) {
  return (
    <div className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-electric/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
}

function ActionRow({ text, sourceLabel }) {
  const toast = useToast();
  const { saveAINote } = useAI();
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(text); toast.success('Copied'); }
          catch { toast.error('Copy failed'); }
        }}
        className="btn btn-ghost !text-xs !py-2"
      >
        <ClipboardCopy size={12} /> Copy
      </button>
      <button
        onClick={() => { saveAINote(sourceLabel, text); toast.success('Saved to AI notes'); }}
        className="btn btn-ghost !text-xs !py-2"
      >
        <BookmarkPlus size={12} /> Save
      </button>
    </div>
  );
}

function ScoreBadge({ score }) {
  const tone =
    score >= 80 ? 'text-success border-success/40 bg-success/10' :
    score >= 60 ? 'text-warning border-warning/40 bg-warning/10' :
                  'text-danger border-danger/40 bg-danger/10';
  return (
    <span className={cn('chip border font-extrabold text-sm', tone)}>
      <Trophy size={14} /> {score}/100
    </span>
  );
}

// ============================ 1. profile reviewer ============================

function ProfileReviewer() {
  const { state, setCoach } = useAI();
  const [text, setText] = useState(state.coach.upworkProfile || '');
  const [result, setResult] = useState(null);

  const run = () => {
    const r = reviewUpworkProfile(text);
    setResult(r);
    setCoach({ upworkProfile: text, upworkScore: r.score });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
          Paste your Upwork profile
        </h3>
        <textarea
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your full profile — the about/overview section is most useful."
          className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted">{(text.trim().match(/\S+/g) || []).length} words</span>
          <GenerateButton disabled={!text.trim()} onClick={run} label="Score my profile" />
        </div>
      </div>

      {result ? (
        <Output>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">Result</h3>
            <ScoreBadge score={result.score} />
          </div>
          <Markdown source={result.text} />
          <ActionRow text={result.text} sourceLabel="profile-review" />
        </Output>
      ) : (
        <EmptyOutput hint="Paste your profile and click “Score my profile”." />
      )}
    </div>
  );
}

// ============================ 2. proposal generator ============================

function ProposalGenerator() {
  const { addProposal, state } = useAI();
  const [jobDescription, setJobDescription] = useState('');
  const [rate, setRate] = useState('22');
  const [timezone, setTimezone] = useState('GMT');
  const [name, setName] = useState('');
  const [result, setResult] = useState(null);

  const run = () => {
    const r = generateUpworkProposal({ jobDescription, rate, timezone, name: name || 'there' });
    setResult(r);
    addProposal({ jobDesc: jobDescription, proposal: r.text });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface rounded-2xl p-5 space-y-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">Job description</h3>
        <textarea
          rows={10}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the Upwork job posting…"
          className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
        />
        <div className="grid grid-cols-3 gap-2">
          <SmallInput label="Your name" value={name} onChange={setName} placeholder="David" />
          <SmallInput label="Your rate ($/hr)" value={rate} onChange={setRate} placeholder="22" />
          <SmallInput label="Timezone" value={timezone} onChange={setTimezone} placeholder="GMT" />
        </div>
        <GenerateButton disabled={!jobDescription.trim()} onClick={run} label="Write proposal" />

        {state.coach.proposals.length > 0 && (
          <div className="pt-3 border-t border-token">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-1.5">Recent</div>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {state.coach.proposals.slice(0, 5).map((p) => (
                <li key={p.id} className="text-[11px] text-muted truncate">
                  → {p.jobDesc.slice(0, 60)}…
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {result ? (
        <Output>
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
            Your proposal ({result.fields.wordCount} words)
          </h3>
          <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-4 whitespace-pre-wrap text-sm leading-relaxed">
            {result.text}
          </div>
          <ActionRow text={result.text} sourceLabel="proposal" />
        </Output>
      ) : (
        <EmptyOutput hint="Paste a job description and click “Write proposal”." />
      )}
    </div>
  );
}

// ============================ 3. pricing advisor ============================

function PricingAdvisor() {
  const { addPricing } = useAI();
  const [description, setDescription] = useState('');
  const [experience, setExperience] = useState('mid');
  const [region, setRegion] = useState('uk');
  const [urgency, setUrgency] = useState('normal');
  const [result, setResult] = useState(null);

  const run = () => {
    const r = priceAdvisor({ description, experience, region, urgency });
    setResult(r);
    addPricing({ description, recommendation: r.fields });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface rounded-2xl p-5 space-y-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
          Describe the project
        </h3>
        <textarea
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Migrate a Postgres DB from on-prem to RDS Multi-AZ. ~200GB. Cutover window 2 hours."
          className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
        />
        <div className="grid grid-cols-3 gap-2">
          <SmallSelect label="Experience" value={experience} onChange={setExperience}
            options={[['junior','Junior'],['mid','Mid'],['senior','Senior'],['principal','Principal']]} />
          <SmallSelect label="Region" value={region} onChange={setRegion}
            options={[['uk','UK'],['us','US'],['eu','EU'],['asia','Asia'],['global','Global']]} />
          <SmallSelect label="Urgency" value={urgency} onChange={setUrgency}
            options={[['low','Low'],['normal','Normal'],['urgent','Urgent']]} />
        </div>
        <GenerateButton disabled={!description.trim()} onClick={run} label="Recommend rate" />
      </div>

      {result ? (
        <Output>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">Recommendation</h3>
            <span className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 font-extrabold">
              ${result.fields.hourlyLow}–${result.fields.hourlyHigh}/hr
            </span>
          </div>
          <Markdown source={result.text} />
          <ActionRow text={result.text} sourceLabel="pricing" />
        </Output>
      ) : (
        <EmptyOutput hint="Describe the project and click “Recommend rate”." />
      )}
    </div>
  );
}

// ============================ 4. interview prep ============================

function InterviewPrep() {
  const [role, setRole] = useState('sa');
  const [level, setLevel] = useState('mid');
  const [active, setActive] = useState(null);
  const data = useMemo(() => interviewPrompt({ role, level }), [role, level]);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4 flex flex-wrap items-center gap-2">
        <SmallSelect label="Role" value={role} onChange={setRole} options={[
          ['sa','Solutions Architect'],['devops','DevOps Engineer'],['data','Data Engineer'],
          ['sec','Security Engineer'],['net','Network Engineer'],['support','Support Engineer'],
          ['ml','ML Engineer']]} />
        <SmallSelect label="Level" value={level} onChange={setLevel}
          options={[['junior','Junior'],['mid','Mid'],['senior','Senior'],['principal','Principal']]} />
        <Link to="/ai/interview" className="ml-auto btn btn-primary !text-xs">
          <Mic size={12} /> Run full mock interview
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {data.questions.map((q, i) => (
          <button
            key={i}
            onClick={() => setActive(active === i ? null : i)}
            className={cn(
              'group rounded-2xl border p-4 text-left transition focus-ring',
              active === i ? 'border-aws-orange bg-aws-orange/5' : 'border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)]'
            )}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              Question {i + 1}
            </div>
            <p className="text-sm font-bold mt-1 leading-snug">{q}</p>
            {active === i && (
              <div className="mt-3 pt-3 border-t border-token text-xs text-muted leading-relaxed">
                <strong className="text-success">Tip:</strong> use the STAR framework — Situation, Task,
                Action, Result. Quantify the result wherever possible.
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================ 5. portfolio reviewer ============================

function PortfolioReviewer() {
  const [rows, setRows] = useState([
    { name: '', summary: '', services: '', complete: false },
  ]);
  const [result, setResult] = useState(null);

  const update = (i, patch) => setRows((r) => r.map((row, idx) => idx === i ? { ...row, ...patch } : row));
  const addRow = () => setRows((r) => [...r, { name: '', summary: '', services: '', complete: false }]);
  const run = () => {
    const projects = rows.filter((r) => r.name.trim()).map((r) => ({
      ...r,
      services: r.services.split(',').map((s) => s.trim()).filter(Boolean),
    }));
    setResult(reviewPortfolio({ projects }));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface rounded-2xl p-5 space-y-3">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
          Describe your projects
        </h3>
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3 space-y-2">
            <input
              value={r.name} onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Project name"
              className="w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-2 text-sm font-bold focus-ring focus:border-aws-orange"
            />
            <textarea
              value={r.summary} onChange={(e) => update(i, { summary: e.target.value })}
              placeholder="2-3 sentence summary"
              rows={2}
              className="w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-2 text-xs focus-ring focus:border-aws-orange"
            />
            <input
              value={r.services} onChange={(e) => update(i, { services: e.target.value })}
              placeholder="Services (comma-separated): S3, CloudFront, Route 53"
              className="w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-2 text-xs focus-ring focus:border-aws-orange"
            />
            <label className="text-[11px] font-bold inline-flex items-center gap-2">
              <input type="checkbox" checked={r.complete} onChange={(e) => update(i, { complete: e.target.checked })}
                     className="accent-aws-orange w-4 h-4" />
              Complete & documented
            </label>
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={addRow} className="btn btn-ghost !text-xs flex-1">+ Add project</button>
          <GenerateButton disabled={!rows.some((r) => r.name.trim())} onClick={run} label="Score portfolio" />
        </div>
      </div>

      {result ? (
        <Output>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">Result</h3>
            <ScoreBadge score={result.score} />
          </div>
          <Markdown source={result.text} />
          <ActionRow text={result.text} sourceLabel="portfolio-review" />
        </Output>
      ) : (
        <EmptyOutput hint="Add your projects and click “Score portfolio”." />
      )}
    </div>
  );
}

// ============================ 6. LinkedIn optimizer ============================

function LinkedInOptimizer() {
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [result, setResult] = useState(null);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface rounded-2xl p-5 space-y-3">
        <SmallInput label="Headline (under 220 chars)" value={headline} onChange={setHeadline}
          placeholder="AWS Cloud Engineer | Networking + DevOps" />
        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-muted">About section</label>
          <textarea
            value={about} onChange={(e) => setAbout(e.target.value)} rows={10}
            placeholder="Paste your About section…"
            className="mt-1.5 w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
          />
        </div>
        <GenerateButton
          disabled={!headline.trim() || !about.trim()}
          onClick={() => setResult(optimizeLinkedIn({ headline, about }))}
          label="Optimize LinkedIn"
        />
      </div>
      {result ? (
        <Output>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">Plan</h3>
            <ScoreBadge score={result.score} />
          </div>
          <Markdown source={result.text} />
          <ActionRow text={result.text} sourceLabel="linkedin" />
        </Output>
      ) : (
        <EmptyOutput hint="Paste your headline + about and click “Optimize LinkedIn”." />
      )}
    </div>
  );
}

// ============================ 7. branding ============================

function BrandingTool() {
  const [niche, setNiche] = useState('AWS networking + DevOps for fintech');
  const [result, setResult] = useState(null);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="surface rounded-2xl p-5 space-y-3">
        <SmallInput label="Your niche" value={niche} onChange={setNiche} />
        <p className="text-xs text-muted leading-relaxed">
          A clear niche is the single biggest lever for rate. "AWS engineer" is commodity; "AWS networking
          for fintech" commands 3× the rate. Be specific.
        </p>
        <GenerateButton disabled={!niche.trim()} onClick={() => setResult(brandingPlan({ niche }))} label="Generate 30-day plan" />
      </div>
      {result ? (
        <Output>
          <Markdown source={result.text} />
          <ActionRow text={result.text} sourceLabel="branding-plan" />
        </Output>
      ) : (
        <EmptyOutput hint="Enter your niche and click generate." />
      )}
    </div>
  );
}

// ============================ 8. negotiation ============================

function NegotiationDrill() {
  const [scenario, setScenario] = useState('standard');
  const result = useMemo(() => negotiationDrill({ scenario }), [scenario]);
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="surface rounded-2xl p-4 space-y-2 h-fit">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
          Scenario
        </h3>
        {[
          ['standard',  'Rate pushback'],
          ['payterms',  'Payment terms'],
          ['scope',     'Scope creep'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setScenario(id)}
            className={cn(
              'w-full text-left rounded-xl px-3 py-2.5 text-sm font-bold border transition',
              scenario === id
                ? 'bg-aws-orange/10 border-aws-orange/40 text-aws-orange'
                : 'bg-[var(--card-2)]/40 border-token hover:bg-[var(--card-2)]'
            )}
          >{label}</button>
        ))}
      </div>
      <Output>
        <Markdown source={result.text} />
        <ActionRow text={result.text} sourceLabel="negotiation-drill" />
      </Output>
    </div>
  );
}

// ============================ 9. career path ============================

function CareerPath() {
  const [background, setBackground] = useState('networking');
  const [level, setLevel] = useState('beginner');
  const [goal, setGoal] = useState('freelance');
  const [result, setResult] = useState(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="surface rounded-2xl p-5 space-y-3 h-fit">
        <SmallSelect label="Background" value={background} onChange={setBackground} options={[
          ['networking','Networking / CCNA'],['dev','Software development'],
          ['sysadmin','SysAdmin / Ops'],['data','Data / analytics'],
        ]} />
        <SmallSelect label="Current level" value={level} onChange={setLevel} options={[
          ['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced'],
        ]} />
        <SmallSelect label="Goal" value={goal} onChange={setGoal} options={[
          ['freelance','Freelance income'],['uk-job','UK cloud job'],['certs','AWS certifications'],
        ]} />
        <GenerateButton onClick={() => setResult(careerPathAdvisor({ background, level, goal }))} label="Plot my path" />
      </div>
      {result ? (
        <Output>
          <Markdown source={result.text} />
          <ActionRow text={result.text} sourceLabel="career-path" />
        </Output>
      ) : (
        <EmptyOutput hint="Pick your inputs and click “Plot my path”." />
      )}
    </div>
  );
}

// ============================ 10. client templates ============================

function ClientTemplates() {
  const toast = useToast();
  const { saveAINote } = useAI();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(CLIENT_TEMPLATES).map(([id, t]) => (
        <div key={id} className="surface rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-extrabold tracking-tight">{t.label}</h4>
            <div className="flex items-center gap-1">
              <button
                onClick={async () => { await navigator.clipboard.writeText(t.body); toast.success('Copied'); }}
                className="btn btn-ghost !text-[11px] !py-1.5 !px-2"
              ><ClipboardCopy size={11} /></button>
              <button
                onClick={() => { saveAINote(`template-${id}`, t.body); toast.success('Saved'); }}
                className="btn btn-ghost !text-[11px] !py-1.5 !px-2"
              ><BookmarkPlus size={11} /></button>
            </div>
          </div>
          <pre className="text-xs whitespace-pre-wrap text-muted leading-relaxed font-sans">
{t.body}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ============================ small inputs ============================

function SmallInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block flex-1 min-w-[120px]">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-2.5 py-2 text-xs font-semibold focus-ring focus:border-aws-orange"
      />
    </label>
  );
}

function SmallSelect({ label, value, onChange, options }) {
  return (
    <label className="block flex-1 min-w-[110px]">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-2 py-2 text-xs font-bold focus-ring focus:border-aws-orange"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function EmptyOutput({ hint }) {
  return (
    <div className="surface rounded-2xl p-8 text-center text-sm text-muted border-2 border-dashed border-token">
      <Wand2 size={20} className="mx-auto text-aws-orange/60 mb-2" />
      {hint}
    </div>
  );
}
