/**
 * WinThisJob.jsx — one page, one path, gig to deployed.
 *
 * Everything here already existed somewhere: Solution Studio designs it,
 * the intake form asks the client, the proposal generator writes the
 * pitch, the email templates send it, the deploy console puts it live.
 * Five pages, and you had to know the order.
 *
 * This is the order. Paste the brief at the top, work down, and at the
 * bottom you have something running. Nothing new is invented — each step
 * calls the same library the dedicated page does, so anything fixed
 * there is fixed here.
 */
import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, Check, ClipboardList, Cloud, Copy,
  Mail, Rocket, Send, Sparkles, Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { CopyBlock } from '../components/workspace/ArtifactViewer.jsx';
import { useApp } from '../context/AppContext.jsx';
import { runPipeline, saveSolution } from '../lib/gigSolutionPipeline.js';
import { generateSmartProposal } from '../lib/smartProposalGenerator.js';
import { generateEmail, gmailComposeUrl, mailtoUrl } from '../data/emailTemplates.js';
import { buildIntakeForm, intakeAsText } from '../lib/clientIntake.js';
import { readableList, unsupportedText } from '../lib/readinessText.js';
import { cn } from '../lib/utils.js';

function Step({ n, title, hint, done, children }) {
  return (
    <section className="surface rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className={cn(
          'shrink-0 w-7 h-7 rounded-full grid place-items-center text-[12px] font-black',
          done ? 'bg-success/20 text-success' : 'bg-aws-orange/15 text-aws-orange',
        )}>
          {done ? <Check size={14} /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-sm">{title}</h2>
          {hint && <p className="text-[11.5px] text-muted mt-0.5">{hint}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

function CopyButton({ text, label = 'Copy', icon: Icon = Copy }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); }
        catch { setDone(false); }
      }}
      className="btn btn-ghost !text-[11px] !py-1.5 inline-flex items-center gap-1.5"
    >
      {done ? <Check size={12} /> : <Icon size={12} />}{done ? 'Copied' : label}
    </button>
  );
}

export default function WinThisJob() {
  const { profile } = useApp();
  const [brief, setBrief] = useState('');
  const [working, setWorking] = useState(false);
  const [solution, setSolution] = useState(null);
  const [saved, setSaved] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [price, setPrice] = useState('');

  const work = () => {
    if (!brief.trim()) return;
    setWorking(true);
    setSaved(false);
    // Let the spinner paint before the synchronous engines run.
    setTimeout(() => {
      try { setSolution(runPipeline(brief, { author: profile?.name })); }
      catch { setSolution(null); }
      finally { setWorking(false); }
    }, 40);
  };

  // A workspace-shaped project so the intake form sees the same thing it
  // sees everywhere else, rather than a second, subtly different shape.
  const project = useMemo(() => solution && ({
    id: solution.id,
    title: solution.names?.projectName || 'AWS engagement',
    client: clientName || null,
    region: solution.region?.primary || null,
    services: (solution.services || []).map((s) => s.label || s.id),
    artifacts: { solution: [{ ...solution, serviceIds: (solution.services || []).map((s) => s.id) }] },
  }), [solution, clientName]);

  const intake = useMemo(() => project && buildIntakeForm(project, { author: profile?.name }), [project, profile]);

  const proposal = useMemo(() => {
    if (!solution) return null;
    try { return generateSmartProposal({ jd: brief, profile }); } catch { return null; }
  }, [solution, brief, profile]);

  const email = useMemo(() => {
    if (!solution) return null;
    return generateEmail('send-proposal', {
      clientName: clientName || null,
      projectTitle: solution.names?.projectName,
      price: price || null,
      included: (solution.services || []).slice(0, 6).map((s) => s.label || s.id),
    });
  }, [solution, clientName, price]);

  const notCovered = readableList(solution?.review?.readiness?.unsupported, unsupportedText);
  const cfn = solution?.artifacts?.cfn?.code || '';
  const region = solution?.region?.primary || 'eu-west-2';
  const stack = (solution?.names?.stackName || 'my-stack').slice(0, 60);

  return (
    <div className="space-y-3 max-w-4xl">
      <PageHeader
        eyebrow="Start here"
        title="Win this job."
        subtitle="Paste what the client sent you. Work down the page. By the bottom you have a design, the questions to ask, a proposal, an email ready to send, and the commands to put it live."
        icon={Rocket}
      />

      <Step n={1} title="Paste what the client sent you" done={!!solution}
            hint="Their words are fine — you do not need to translate it into AWS terms.">
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={6}
          placeholder={'e.g. "Hi, I run a dental practice in Bristol. I want patients to book appointments online themselves, and it needs to be cheap to run."'}
          className="w-full rounded-xl border border-token bg-[var(--card-2)] p-3 text-[13px] leading-relaxed outline-none focus:border-aws-orange/60"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button onClick={work} disabled={!brief.trim() || working}
                  className={cn('btn btn-primary !text-[13px] gap-2', (!brief.trim() || working) && 'opacity-50 cursor-not-allowed')}>
            <Wand2 size={15} /> {working ? 'Working it out…' : 'Work it out'}
          </button>
          {solution && (
            <button
              onClick={() => { saveSolution(solution); setSaved(true); }}
              className="btn btn-ghost !text-[12px] gap-1.5">
              <Check size={13} /> {saved ? 'Saved to your workspace' : 'Save to my workspace'}
            </button>
          )}
        </div>
      </Step>

      {solution && (
        <>
          <Step n={2} title="What I would build" done
                hint="Every figure here is an estimate with its conditions stated. Nothing claims a guaranteed bill.">
            <div className="grid gap-1 sm:grid-cols-2 text-[12px]">
              <div><span className="text-muted">Project: </span><strong>{solution.names?.projectName}</strong></div>
              <div><span className="text-muted">Region: </span><strong>{region}</strong></div>
              <div className="sm:col-span-2">
                <span className="text-muted">Services: </span>
                <strong>{(solution.services || []).map((s) => s.label || s.id).join(', ') || 'none detected'}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted">Readiness: </span>
                <strong>{solution.review?.readiness?.classification || 'unknown'}</strong>
              </div>
            </div>

            {(solution.services || []).length === 0 && (
              <p className="text-[12px] text-warning mt-3 flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Nothing specific enough to design from yet. That is an honest answer, not a failure —
                work through step 3 with the client and paste their replies in above.
              </p>
            )}

            {notCovered.length > 0 && (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-2.5 mt-3">
                <div className="flex items-center gap-1.5 text-danger font-extrabold text-[11px] mb-1">
                  <AlertTriangle size={12} /> Not in the generated templates
                </div>
                <ul className="space-y-1 pl-4 list-disc text-[11.5px] leading-relaxed">
                  {notCovered.slice(0, 5).map((line, i) => <li key={i}>{line}</li>)}
                </ul>
              </div>
            )}
          </Step>

          <Step n={3} title="What to ask the client" done={!!intake?.questionCount}
                hint={intake ? `${intake.questionCount} questions, ${intake.requiredCount} of them needed before you can start. Only what this job does not already know.` : ''}>
            {intake && (
              <>
                <div className="flex flex-wrap gap-2">
                  <CopyButton text={intakeAsText(intake)} label="Copy the questions" icon={ClipboardList} />
                  <Link to="/workspace" className="btn btn-ghost !text-[11px]">Open in the workspace</Link>
                </div>
                <ul className="mt-3 space-y-1">
                  {intake.sections.flatMap((s) => s.questions).filter((q) => q.required).slice(0, 6)
                    .map((q) => <li key={q.id} className="text-[12px] text-muted">• {q.label}</li>)}
                </ul>
              </>
            )}
          </Step>

          <Step n={4} title="The proposal" done={!!proposal?.fullText}
                hint="Read it before you send it. It is a draft in your voice, not a finished quote.">
            {proposal?.fullText ? (
              <>
                <CopyButton text={proposal.fullText} label={`Copy the proposal (${proposal.wordCount} words)`} />
                <pre className="mt-2 rounded-xl border border-token p-3 text-[11.5px] leading-relaxed max-h-80 overflow-auto whitespace-pre-wrap">
                  {proposal.fullText}
                </pre>
              </>
            ) : <p className="text-[12px] text-muted">No proposal could be drafted from this brief yet.</p>}
          </Step>

          <Step n={5} title="Send it" done={!!clientEmail}
                hint="Fill these in and the email opens in your own mail, already written.">
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={clientName} onChange={(e) => setClientName(e.target.value)}
                     placeholder="Client name"
                     className="rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-2 text-[12px] outline-none" />
              <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                     placeholder="their@email.com" type="email"
                     className="rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-2 text-[12px] outline-none" />
              <input value={price} onChange={(e) => setPrice(e.target.value)}
                     placeholder="Your price, e.g. £1,200"
                     className="rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-2 text-[12px] outline-none" />
            </div>
            {email && (
              <>
                <div className="flex flex-wrap gap-2 mt-2">
                  <a href={gmailComposeUrl({ to: clientEmail, subject: email.subject, body: email.body })}
                     target="_blank" rel="noreferrer"
                     className={cn('btn btn-primary !text-[12px] gap-1.5', !clientEmail && 'opacity-50 pointer-events-none')}>
                    <Send size={13} /> Open in Gmail
                  </a>
                  <a href={mailtoUrl({ to: clientEmail, subject: email.subject, body: email.body })}
                     className={cn('btn btn-ghost !text-[12px] gap-1.5', !clientEmail && 'opacity-50 pointer-events-none')}>
                    <Mail size={13} /> Open in my mail app
                  </a>
                  <CopyButton text={`${email.subject}\n\n${email.body}`} label="Copy the email" />
                </div>
                <pre className="mt-2 rounded-xl border border-token p-3 text-[11.5px] leading-relaxed max-h-64 overflow-auto whitespace-pre-wrap">
                  {email.subject}{'\n\n'}{email.body}
                </pre>
              </>
            )}
          </Step>

          <Step n={6} title="Put it live" done={false}
                hint="CloudShell runs in your browser with your own sign-in, so no access keys are needed anywhere.">
            {cfn ? (
              <>
                <CopyBlock code={cfn} label="CloudFormation template" language="yaml" />
                <p className="text-[11.5px] text-muted mt-3 mb-1">
                  Open CloudShell in <strong className="text-current">{region}</strong>, paste the template into a
                  file, then run these. The last line removes everything again.
                </p>
                <CopyBlock
                  label="In CloudShell"
                  language="bash"
                  code={[
                    'cat > stack.yaml      # paste the template, then press Ctrl+D',
                    '',
                    `aws cloudformation deploy --stack-name ${stack} \\`,
                    `  --template-file stack.yaml --capabilities CAPABILITY_IAM --region ${region}`,
                    '',
                    `aws cloudformation describe-stacks --stack-name ${stack} --region ${region} \\`,
                    "  --query 'Stacks[0].StackStatus'",
                    '',
                    `aws cloudformation delete-stack --stack-name ${stack} --region ${region}`,
                  ].join('\n')}
                />
                <a href={`https://${region}.console.aws.amazon.com/cloudshell/home?region=${region}`}
                   target="_blank" rel="noreferrer"
                   className="btn btn-primary !text-[12px] gap-1.5 mt-3">
                  <Cloud size={13} /> Open CloudShell <ArrowRight size={12} />
                </a>
              </>
            ) : (
              <p className="text-[12px] text-muted">
                No template was generated for this design, so there is nothing to deploy yet.
                Step 2 says which services are missing and why.
              </p>
            )}
          </Step>
        </>
      )}

      {!solution && !working && (
        <p className="text-[11.5px] text-muted flex items-center gap-1.5">
          <Sparkles size={13} className="text-aws-orange" />
          Every step below appears once there is something to show. Nothing is hidden from you — there is
          simply nothing to say until the brief is in.
        </p>
      )}
    </div>
  );
}
