import {
  AlertCircle, Award, Brain, Calendar, ChevronLeft, ChevronRight,
  ClipboardCopy, FileText, Mail, MessageSquare, NotebookPen, PhoneCall,
  PhoneIncoming, Save, Send, Shield, Sparkles, Target, Trophy, User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useAWS } from '../context/AWSContext.jsx';
import { useEarn } from '../context/EarnContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  PROJECT_TYPES, buildBriefing,
} from '../data/discoveryCall.js';
import { PROJECTS } from '../data/projects.js';
import { analyzeJob } from '../data/jobAnalyzer.js';
import { gmailComposeUrl, outlookComposeUrl } from '../data/emailTemplates.js';
import { BookDiscoveryCallButton } from '../components/calendar/BookDiscoveryCallButton.jsx';
import { cn } from '../lib/utils.js';

export default function DiscoveryCallPrep() {
  const toast = useToast();
  const { profile } = useApp();
  const { state: fre, logCommunication } = useFreelance();
  const { state: port } = usePortfolio();
  const { addEmail, state: earnState } = useEarn();
  const { activeProfile: awsProfile } = useAWS();
  const lastAnalysis = earnState.lastAnalysis;
  const gmailUser = { userIndex: awsProfile?.gmailUserIndex ?? 0, authAddress: awsProfile?.gmailAddress || '' };

  // ----- Pre-call inputs -----
  const [jdText, setJdText] = useState('');
  const [typeOverride, setTypeOverride] = useState('');
  const [clientId, setClientId] = useState('');
  const [brief, setBrief] = useState({
    projectTitle: '',
    timeline: '',
    budget: '',
    currency: 'USD',
  });

  // Auto-fill from the last Job Analyzer run — only on first mount if user
  // hasn't typed anything yet. Never overwrites user edits.
  useEffect(() => {
    if (!lastAnalysis || jdText) return;
    setJdText(lastAnalysis.jdText || '');
    setBrief((b) => ({
      ...b,
      projectTitle: b.projectTitle || lastAnalysis.suggestedName || '',
      timeline:     b.timeline     || lastAnalysis.analysis?.timeline?.label || '',
      budget:       b.budget       || (lastAnalysis.analysis?.budget?.kind === 'fixed'
                                        ? String(lastAnalysis.analysis.budget.amount)
                                        : ''),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAnalysis?.at]);

  // Job analysis (auto-rebuilt when JD changes)
  const analysis = useMemo(() => (jdText.trim() ? analyzeJob(jdText) : null), [jdText]);

  // Allow manual override of the detected project type
  const effectiveAnalysis = useMemo(() => {
    if (!analysis && !typeOverride) return null;
    return {
      type: typeOverride || analysis?.type || 'General AWS Engineering',
      missing: analysis?.missing || [],
    };
  }, [analysis, typeOverride]);

  // Portfolio strings (top 3 completed)
  const completedProjects = useMemo(() => {
    const ps = port?.projects || {};
    return Object.entries(ps)
      .filter(([, s]) => s?.status === 'complete')
      .map(([id]) => {
        const proj = PROJECTS?.find?.((p) => p.id === id);
        return proj?.title || id;
      })
      .slice(0, 3);
  }, [port]);

  const client = fre.clients.find((c) => c.id === clientId);

  // Certs from profile (use bio as a free-text placeholder; user can also type the certs they hold)
  const [certsInput, setCertsInput] = useState('AWS Solutions Architect Associate');
  const certs = certsInput
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Build the briefing reactively
  const briefing = useMemo(() => buildBriefing({
    analysis: effectiveAnalysis,
    profile,
    certs,
    portfolio: completedProjects,
    brief,
    client: client ? { name: client.name, company: client.company, email: client.email } : {},
  }), [effectiveAnalysis, profile, certs, completedProjects, brief, client]);

  // ----- Post-call state -----
  const [post, setPost] = useState(() => ({ ...briefing.postCallTemplate }));
  useEffect(() => { setPost({ ...briefing.postCallTemplate }); }, [briefing.postCallTemplate.followUpBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPostField = (k) => (e) => setPost((p) => ({ ...p, [k]: e.target.value }));

  const savePostToCRM = () => {
    if (!clientId) {
      toast.error('Pick a client from the CRM before saving.');
      return;
    }
    const summary = [
      `Discovery call — ${new Date().toLocaleDateString()}`,
      post.projectNeeds && `Needs: ${post.projectNeeds}`,
      post.timeline && `Timeline: ${post.timeline}`,
      post.budget && `Budget: ${post.budget}`,
      post.concerns && `Concerns: ${post.concerns}`,
      post.decisionMaker && `Decision maker: ${post.decisionMaker}`,
      post.nextStep && `Next step: ${post.nextStep}`,
      post.followUpBy && `Follow-up by: ${post.followUpBy}`,
    ].filter(Boolean).join('\n');
    logCommunication(clientId, summary, 'discovery-call');
    toast.success('Saved to CRM communications log');
  };

  // ----- Follow-up email -----
  const followUp = briefing.followUpFor(post);
  const saveFollowUpAsSent = () => {
    addEmail({
      to: client?.email || '',
      subject: followUp.subject,
      body: followUp.body,
      type: 'discovery-call',
      clientId: clientId || null,
      status: 'sent',
      sentAt: new Date().toISOString(),
      followUpAt: post.followUpBy ? new Date(post.followUpBy).toISOString() : null,
    });
    toast.success('Logged as sent + tracker reminder set');
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const allQuestions = briefing.questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  const emailQuestionsBeforeCall = () => {
    const subject = `Quick questions before our call`;
    const body =
`Hi ${client?.name?.split(' ')[0] || 'there'},

Looking forward to our discovery call. To make the call as useful as possible, here are the questions I'll ask — feel free to think about them in advance or reply with anything you can answer asynchronously:

${allQuestions}

Speak soon,
${profile.name || 'Your Name'}`;
    if (client?.email) {
      window.open(gmailComposeUrl({ to: client.email, subject, body, ...gmailUser }), '_blank');
    } else {
      copy(`Subject: ${subject}\n\n${body}`);
      toast.info('No client email on file — copied to clipboard instead.');
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/earn" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> Earn
      </Link>

      <PageHeader
        eyebrow="Discovery Call Prep"
        title="Walk into the call knowing exactly what to say."
        subtitle="Auto-generated from the job analysis: project-type-aware questions, your talking points, common objections + responses, and a one-click follow-up email after the call."
        icon={PhoneCall}
      />

      {/* IN-01: Book the call in one click */}
      <div className="flex justify-end">
        <BookDiscoveryCallButton
          variant="primary"
          defaultTitle={lastAnalysis?.suggestedName ? `Discovery call — ${lastAnalysis.suggestedName}` : 'Discovery call'}
          defaultDescription={jdText ? `Project brief:\n\n${jdText.slice(0, 600)}` : ''}
        />
      </div>

      {lastAnalysis && (
        <div className="surface rounded-2xl px-3 py-2 flex items-center gap-2 border-aws-orange/30 bg-aws-orange/5">
          <Sparkles size={12} className="text-aws-orange shrink-0" />
          <span className="text-[11px]">
            <span className="font-bold text-aws-orange">Auto-filled from Job Analyzer</span> ·
            project <span className="font-bold">"{lastAnalysis.suggestedName}"</span>
            {lastAnalysis.suggestedClient && <> · client <span className="font-bold">{lastAnalysis.suggestedClient}</span></>}
            <span className="text-muted"> · {new Date(lastAnalysis.at).toLocaleString()}</span>
          </span>
          <Link to="/job-analyzer" className="ml-auto text-[10px] font-bold text-aws-orange hover:underline">
            Re-run →
          </Link>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        {/* LEFT — inputs */}
        <div className="space-y-3">
          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <FileText size={14} className="text-aws-orange" /> Source job description
            </h3>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={6}
              placeholder="Paste the job description here. The briefing auto-detects project type, scope and missing info."
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
            />
            <div className="text-[10px] text-muted">
              Already analyzed in <Link to="/job-analyzer" className="text-aws-orange font-bold hover:underline">Job Analyzer</Link>? Just paste the same text here.
            </div>
          </div>

          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Target size={14} className="text-aws-orange" /> Project context
            </h3>
            <label className="block text-[10px] font-bold text-muted">Project type</label>
            <select
              value={typeOverride}
              onChange={(e) => setTypeOverride(e.target.value)}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
            >
              <option value="">{analysis?.type ? `Auto-detected: ${analysis.type}` : 'Auto-detect from JD'}</option>
              {PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>

            <label className="block text-[10px] font-bold text-muted mt-2">Project title</label>
            <input
              value={brief.projectTitle}
              onChange={(e) => setBrief({ ...brief, projectTitle: e.target.value })}
              placeholder="e.g. Landing Zone migration"
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
            />

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <label className="block text-[10px] font-bold text-muted">Budget</label>
                <input
                  type="number"
                  value={brief.budget}
                  onChange={(e) => setBrief({ ...brief, budget: e.target.value })}
                  placeholder="3000"
                  className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted">Currency</label>
                <input
                  value={brief.currency}
                  onChange={(e) => setBrief({ ...brief, currency: e.target.value })}
                  className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
                />
              </div>
            </div>

            <label className="block text-[10px] font-bold text-muted mt-2">Timeline</label>
            <input
              value={brief.timeline}
              onChange={(e) => setBrief({ ...brief, timeline: e.target.value })}
              placeholder="3 weeks from kickoff"
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
            />
          </div>

          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <User size={14} className="text-aws-orange" /> Client
            </h3>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
            >
              <option value="">— pick from CRM —</option>
              {fre.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>
              ))}
            </select>
            {fre.clients.length === 0 && (
              <div className="text-[10px] text-muted">No clients yet — <Link to="/freelance" className="text-aws-orange font-bold hover:underline">add one in the CRM</Link>.</div>
            )}
          </div>

          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Award size={14} className="text-aws-orange" /> Your credentials
            </h3>
            <label className="block text-[10px] font-bold text-muted">Certs (comma separated)</label>
            <input
              value={certsInput}
              onChange={(e) => setCertsInput(e.target.value)}
              placeholder="AWS Solutions Architect Associate, AWS Cloud Practitioner"
              className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring"
            />
            <div className="text-[10px] text-muted">
              Completed projects detected from your portfolio:
              <span className="ml-1 font-bold text-current">{completedProjects.length || 0}</span>
            </div>
          </div>
        </div>

        {/* RIGHT — briefing */}
        <div className="space-y-3">
          <div className="surface rounded-2xl p-4 gradient-border">
            <div className="flex items-center gap-2 flex-wrap">
              <PhoneIncoming size={16} className="text-aws-orange" />
              <h2 className="text-lg font-black tracking-tight">Pre-call briefing</h2>
              <span className="chip border border-aws-orange/40 text-aws-orange font-bold text-[10px] ml-auto">
                {briefing.type}
              </span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              Read this before you join the call. Print or keep it open in a second window.
            </p>
          </div>

          {/* Questions */}
          <div className="surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <MessageSquare size={14} className="text-aws-orange" /> Questions to ask
                <span className="chip border border-token text-[10px]">{briefing.questions.length}</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button onClick={() => copy(allQuestions)} className="btn btn-ghost !text-[11px]">
                  <ClipboardCopy size={11} /> Copy all
                </button>
                <button onClick={emailQuestionsBeforeCall} className="btn btn-ghost !text-[11px]">
                  <Send size={11} /> Send before call
                </button>
              </div>
            </div>
            <ol className="space-y-1.5 list-decimal list-inside text-[12px] leading-snug">
              {briefing.questions.map((q, i) => (
                <li key={i} className="rounded-md hover:bg-[var(--card-2)]/40 px-1 py-0.5">{q}</li>
              ))}
            </ol>
          </div>

          {/* Talking points */}
          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Sparkles size={14} className="text-aws-orange" /> Your talking points
            </h3>
            <ul className="space-y-2">
              {briefing.talkingPoints.map((t) => (
                <li key={t.id} className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">{t.label}</div>
                  <p className="text-[12px] leading-snug">{t.text}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Objections */}
          <div className="surface rounded-2xl p-4 space-y-2">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <Shield size={14} className="text-aws-orange" /> Objections + responses
            </h3>
            <ul className="space-y-2">
              {briefing.objections.map((o, i) => (
                <li key={i} className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-warning">"{o.objection}"</div>
                  <div className="text-[12px] leading-snug">→ {o.response}</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Post-call form */}
          <div className="surface rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-extrabold flex items-center gap-2">
              <NotebookPen size={14} className="text-aws-orange" /> Post-call notes
            </h3>
            <p className="text-[11px] text-muted">Fill this right after the call. One click syncs to CRM and drafts the follow-up email.</p>
            <Textarea label="Project needs"        value={post.projectNeeds}   onChange={setPostField('projectNeeds')} />
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Their timeline"  value={post.timeline}       onChange={setPostField('timeline')} />
              <Field label="Their budget"    value={post.budget}         onChange={setPostField('budget')} />
            </div>
            <Textarea label="Key concerns raised" value={post.concerns}  onChange={setPostField('concerns')} />
            <div className="grid sm:grid-cols-2 gap-2">
              <Field label="Decision maker"     value={post.decisionMaker} onChange={setPostField('decisionMaker')} />
              <Field label="Next step agreed"   value={post.nextStep}      onChange={setPostField('nextStep')} />
            </div>
            <Field label="Follow up by"        type="date" value={post.followUpBy} onChange={setPostField('followUpBy')} />
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={savePostToCRM} className="btn btn-primary !text-xs">
                <Save size={11} /> Save to CRM
              </button>
              <Link to={`/freelance`} className="btn btn-ghost !text-xs">
                <User size={11} /> Open CRM
              </Link>
            </div>
          </div>

          {/* Follow-up email */}
          <div className="surface rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Mail size={14} className="text-aws-orange" /> Follow-up email
              </h3>
              <span className="chip border border-warning/40 bg-warning/10 text-warning font-bold text-[10px]">
                Send within 1 hour
              </span>
            </div>
            <div className="text-[11px] text-muted">Auto-drafted from your post-call notes.</div>
            <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3 space-y-1.5">
              <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Subject</div>
              <div className="text-[12px] font-bold">{followUp.subject}</div>
              <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted mt-1">Body</div>
              <pre className="text-[11px] whitespace-pre-wrap leading-relaxed">{followUp.body}</pre>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button onClick={() => copy(`Subject: ${followUp.subject}\n\n${followUp.body}`)} className="btn btn-ghost !text-xs">
                <ClipboardCopy size={11} /> Copy
              </button>
              <a
                href={gmailComposeUrl({ to: client?.email || '', subject: followUp.subject, body: followUp.body, ...gmailUser })}
                target="_blank" rel="noreferrer"
                className="btn btn-ghost !text-xs"
              ><Mail size={11} /> Gmail</a>
              <a
                href={outlookComposeUrl({ to: client?.email || '', subject: followUp.subject, body: followUp.body })}
                target="_blank" rel="noreferrer"
                className="btn btn-ghost !text-xs"
              ><Mail size={11} /> Outlook</a>
              <button onClick={saveFollowUpAsSent} className="btn btn-primary !text-xs ml-auto">
                <Send size={11} /> Mark sent
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-2">
            <Link to="/job-analyzer" className="surface rounded-2xl p-3 hover:border-aws-orange/40 transition focus-ring">
              <div className="text-[10px] uppercase tracking-widest text-muted font-extrabold">Step 1</div>
              <div className="text-sm font-extrabold">Analyze the job</div>
            </Link>
            <div className="surface rounded-2xl p-3 border-aws-orange/40 bg-aws-orange/5">
              <div className="text-[10px] uppercase tracking-widest text-aws-orange font-extrabold">Step 2 (you are here)</div>
              <div className="text-sm font-extrabold">Discovery call prep</div>
            </div>
            <Link to="/presentation" className="surface rounded-2xl p-3 hover:border-aws-orange/40 transition focus-ring">
              <div className="text-[10px] uppercase tracking-widest text-muted font-extrabold">Step 3</div>
              <div className="text-sm font-extrabold">Build the proposal</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value = '', onChange, type = 'text' }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-muted">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange"
      />
    </label>
  );
}

function Textarea({ label, value = '', onChange, rows = 2 }) {
  return (
    <label className="block space-y-0.5">
      <span className="text-[10px] font-bold text-muted">{label}</span>
      <textarea
        rows={rows}
        value={value || ''}
        onChange={onChange}
        className="w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
      />
    </label>
  );
}
