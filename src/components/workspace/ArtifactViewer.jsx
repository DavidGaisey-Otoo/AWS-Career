/**
 * ArtifactViewer.jsx — show one artifact properly.
 *
 * The workspace used to list titles. A title tells you a proposal exists;
 * it does not let you read it, and it certainly does not let you copy the
 * CLI commands you need in front of a client. Every kind is rendered from
 * the fields it genuinely has — nothing is invented to fill a layout, and
 * a record missing a field simply does not show that row.
 */
import { useState } from 'react';
import {
  Check, Copy, ExternalLink, FileText, Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Markdown } from '../ai/Markdown.jsx';
import { LocalFileViewer } from './LocalFileViewer.jsx';
import { cn } from '../../lib/utils.js';

/** A copyable block of code, commands or template. */
export function CopyBlock({ code, label, language }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the text is still selectable.
      setCopied(false);
    }
  };
  return (
    <div className="rounded-xl border border-token overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card-2)] border-b border-token">
        <Terminal size={12} className="text-aws-orange" />
        <span className="text-[11px] font-bold">{label}</span>
        {language && <span className="text-[10px] text-muted uppercase">{language}</span>}
        <button onClick={copy} className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-aws-orange transition">
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 text-[11.5px] leading-relaxed overflow-x-auto max-h-[28rem]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** A label/value row. Renders nothing when there is no value. */
function Fact({ label, value }) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="flex items-baseline gap-2 py-1 border-b border-token/40 last:border-0">
      <span className="text-[11px] text-muted w-36 shrink-0">{label}</span>
      <span className="text-[12px] min-w-0 break-words">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
    </div>
  );
}

function Facts({ children }) {
  return <div className="surface rounded-xl p-3">{children}</div>;
}

function Body({ text, title = 'Content' }) {
  if (!text || !String(text).trim()) return null;
  return (
    <div className="surface rounded-xl p-3">
      <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">{title}</h4>
      <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

const money = (n, currency = 'USD') =>
  typeof n === 'number' ? `${currency === 'USD' ? '$' : currency + ' '}${n.toLocaleString()}` : null;

const when = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/**
 * @param {object} item — the artifact record, exactly as stored
 * @param {string} kind — a WORKSPACE_KINDS value
 * @param {string} to   — where the full tool for this kind lives
 */
export function ArtifactViewer({ item, kind, to }) {
  if (!item) return null;

  const openFull = to ? (
    <Link to={to} className="inline-flex items-center gap-1 text-[11px] font-bold text-muted hover:text-aws-orange transition">
      Open in the full tool <ExternalLink size={11} />
    </Link>
  ) : null;

  const wrap = (children) => (
    <div className="space-y-3">
      {children}
      {openFull && <div className="pt-1">{openFull}</div>}
    </div>
  );

  switch (kind) {
    case 'script':
      return wrap(<CopyBlock code={item.code} label={item.name || 'Generated template'} language={item.format} />);

    case 'solution':
      return wrap(
        <>
          <Facts>
            <Fact label="Region" value={item.region} />
            <Fact label="Approach" value={item.approach} />
            <Fact label="AWS services" value={item.serviceLabels || item.serviceIds} />
            <Fact label="Project name" value={item.projectName} />
            <Fact label="Stack name" value={item.stackName} />
            <Fact label="Review verdict" value={item.verdict} />
            <Fact label="Grade" value={item.grade} />
            <Fact label="Readiness" value={item.readiness?.classification} />
            <Fact label="Saved" value={when(item.savedAt)} />
            <Fact label="Source" value={item.sourceLabel} />
          </Facts>
          {item.readiness?.assumptions?.length > 0 && (
            <div className="surface rounded-xl p-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-warning mb-2">
                Assumptions — confirm before quoting
              </h4>
              <ul className="space-y-1">
                {item.readiness.assumptions.map((a, i) => (
                  <li key={i} className="text-[12px] text-muted">• {a}</li>
                ))}
              </ul>
            </div>
          )}
          {item.readiness?.unsupported?.length > 0 && (
            <div className="surface rounded-xl p-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-danger mb-2">
                Not supported by the evidence
              </h4>
              <ul className="space-y-1">
                {item.readiness.unsupported.map((a, i) => (
                  <li key={i} className="text-[12px] text-muted">• {a}</li>
                ))}
              </ul>
            </div>
          )}
          <Body text={item.brief} title="The brief" />
        </>,
      );

    case 'plan':
      return wrap(
        <>
          <Facts>
            <Fact label="Plan" value={item.name} />
            <Fact label="Client" value={item.clientName || item.clientCompany} />
            <Fact label="Starts" value={when(item.startDate)} />
            <Fact label="Ends" value={when(item.endDate)} />
            <Fact label="Total hours" value={item.totalHours} />
            <Fact label="Total cost" value={money(item.totalCost, item.currency)} />
          </Facts>
          {Array.isArray(item.phases) && item.phases.length > 0 && (
            <div className="space-y-2">
              {item.phases.map((phase, i) => (
                <div key={phase.id || i} className="surface rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[12px] font-extrabold">{phase.name}</h4>
                    {phase.durationDays != null && (
                      <span className="text-[10.5px] text-muted">{phase.durationDays} days</span>
                    )}
                    {phase.milestone?.paymentAmount ? (
                      <span className="ml-auto text-[11px] font-bold text-success">
                        {money(phase.milestone.paymentAmount, item.currency)}
                      </span>
                    ) : null}
                  </div>
                  {Array.isArray(phase.tasks) && phase.tasks.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {phase.tasks.map((task, j) => (
                        <li key={j} className="text-[11.5px] text-muted">
                          • {task.name || task.title || String(task)}
                          {task.hours ? ` — ${task.hours}h` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>,
      );

    case 'proposal':
      return wrap(
        <>
          <Facts>
            <Fact label="Job" value={item.jobTitle || item.gigTitle || item.title} />
            <Fact label="Client" value={item.clientName} />
            <Fact label="Platform" value={item.platform} />
            <Fact label="Budget" value={typeof item.budget === 'number' ? money(item.budget) : item.budget} />
            <Fact label="Status" value={item.status} />
            <Fact label="Sent" value={when(item.sentAt)} />
            <Fact label="Follow up" value={when(item.followUpAt)} />
          </Facts>
          <Body text={item.body} title="The proposal" />
          <Body text={item.notes} title="Your notes" />
        </>,
      );

    case 'email':
      return wrap(
        <>
          <Facts>
            <Fact label="To" value={item.to} />
            <Fact label="Subject" value={item.subject} />
            <Fact label="Type" value={item.type} />
            <Fact label="Status" value={item.status} />
            <Fact label="Sent" value={when(item.at)} />
            <Fact label="Follow up" value={when(item.followUpAt)} />
          </Facts>
          <Body text={item.body} title="The email" />
        </>,
      );

    case 'invoice': {
      const lines = Array.isArray(item.lineItems) ? item.lineItems : [];
      const subtotal = lines.reduce((n, l) => n + (Number(l.amount) || 0), 0);
      const tax = item.taxPct ? Math.round(subtotal * (Number(item.taxPct) / 100)) : 0;
      return wrap(
        <>
          <Facts>
            <Fact label="Invoice" value={item.number} />
            <Fact label="Client" value={item.clientName} />
            <Fact label="Email" value={item.clientEmail} />
            <Fact label="Issued" value={when(item.issuedAt)} />
            <Fact label="Due" value={when(item.dueAt)} />
            <Fact label="Status" value={item.status} />
          </Facts>
          {lines.length > 0 && (
            <div className="surface rounded-xl p-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">Line items</h4>
              <ul className="space-y-1">
                {lines.map((line, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3 text-[12px] py-1 border-b border-token/40 last:border-0">
                    <span className="min-w-0">{line.desc}</span>
                    <span className="shrink-0 font-bold">{money(Number(line.amount))}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-token text-[12px]">
                <span className="font-bold">Total{item.taxPct ? ` (inc. ${item.taxPct}% tax)` : ''}</span>
                <span className="font-extrabold">{money(subtotal + tax)}</span>
              </div>
            </div>
          )}
          <Body text={item.notes} title="Notes" />
        </>,
      );
    }

    case 'contract':
      return wrap(
        <>
          <Facts>
            <Fact label="Contract" value={item.number} />
            <Fact label="Title" value={item.title} />
            <Fact label="Status" value={item.status} />
            <Fact label="Created" value={when(item.createdAt)} />
            <Fact label="Revisions" value={item.revisions} />
          </Facts>
          {Array.isArray(item.deliverables) && item.deliverables.length > 0 && (
            <div className="surface rounded-xl p-3">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">Deliverables</h4>
              <ul className="space-y-1">
                {item.deliverables.map((d, i) => (
                  <li key={i} className="text-[12px] text-muted">• {typeof d === 'string' ? d : d.name || JSON.stringify(d)}</li>
                ))}
              </ul>
            </div>
          )}
          <Body text={typeof item.scope === 'string' ? item.scope : null} title="Scope" />
          <Body text={item.ip} title="Intellectual property" />
        </>,
      );

    case 'document':
      return wrap(
        <>
          <Facts>
            <Fact label="Name" value={item.name || item.title} />
            <Fact label="Project" value={item.projectTitle} />
            <Fact label="Client" value={item.clientName || item.clientCompany} />
            <Fact label="Status" value={item.status} />
            <Fact label="Created" value={when(item.createdAt)} />
          </Facts>
          {/* A path is a description of a document, not a document. */}
          <LocalFileViewer path={item.localPath || item.file} />
          <Body text={item.description} title="What it contains" />
          {item.externalReview?.verdict && item.externalReview.verdict !== 'not-reviewed' && (
            <Facts>
              <Fact label="Reviewer" value={item.externalReview.reviewer} />
              <Fact label="Verdict" value={item.externalReview.verdict} />
              <Fact label="Findings" value={item.externalReview.findings} />
            </Facts>
          )}
        </>,
      );

    case 'caseStudy':
      return wrap(
        <>
          <Facts>
            <Fact label="Completed" value={when(item.completedAt)} />
            <Fact label="Category" value={item.category} />
          </Facts>
          {item.summary && <Body text={item.summary} title="Summary" />}
          {item.markdown && (
            <div className="surface rounded-xl p-3">
              <Markdown source={item.markdown} />
            </div>
          )}
        </>,
      );

    case 'portfolio':
      return wrap(
        <Facts>
          <Fact label="Status" value={item.status} />
          <Fact label="Started" value={when(item.startedAt)} />
          <Fact label="Completed steps" value={Array.isArray(item.completedSteps) ? item.completedSteps.length : null} />
          <Fact label="Services" value={item.services} />
        </Facts>,
      );

    case 'architecture':
      return wrap(
        <>
          <Facts>
            <Fact label="From" value={item.fromDocument ? 'the delivery package' : 'the solution'} />
            <Fact label="Nodes" value={Array.isArray(item.nodes) ? item.nodes.length : item.nodes} />
            <Fact label="Connections" value={Array.isArray(item.edges) ? item.edges.length : item.edges} />
          </Facts>
          <p className="text-[11.5px] text-muted">
            The diagram is rendered in Architecture Studio, which has the canvas and the export.
          </p>
        </>,
      );

    case 'deck':
      return wrap(
        <>
          <Facts>
            <Fact label="Deck" value={item.name} />
            <Fact label="Slides" value={Array.isArray(item.slides) ? item.slides.length : null} />
            <Fact label="Updated" value={when(item.updatedAt || item.createdAt)} />
          </Facts>
          <Body text={item.brief} title="The brief" />
        </>,
      );

    default:
      return wrap(
        <Facts>
          {Object.entries(item)
            .filter(([k, v]) => !k.startsWith('__') && (typeof v === 'string' || typeof v === 'number'))
            .slice(0, 12)
            .map(([k, v]) => <Fact key={k} label={k} value={v} />)}
        </Facts>,
      );
  }
}

/** The small icon shown beside an artifact in the contents list. */
export function ArtifactIcon({ kind, size = 12, className }) {
  const Icon = kind === 'script' ? Terminal : FileText;
  return <Icon size={size} className={cn('shrink-0', className)} />;
}
