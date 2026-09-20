/**
 * ClientReportPanel.jsx — the document you can actually send.
 *
 * Shows what would go out, and above it, what should not. The checks are
 * not enforced: deciding what a client sees is the author's call. They
 * exist so that call is never made by accident — which is how a
 * screenshot of this application, complete with the credits balance and
 * the wrong profile name, ends up in a client's inbox as "evidence".
 */
import { useMemo } from 'react';
import { AlertTriangle, FileText, Printer, ShieldAlert } from 'lucide-react';
import { Markdown } from '../ai/Markdown.jsx';
import { buildClientReport } from '../../lib/clientReport.js';
import { openPrintable } from '../../lib/printableHtml.js';

export function ClientReportPanel({ project, author, company }) {
  const report = useMemo(
    () => buildClientReport(project, { author, company }),
    [project, author, company],
  );

  const blocks = report.audit.filter((f) => f.level === 'block');
  const warnings = report.audit.filter((f) => f.level === 'warn');

  return (
    <div className="space-y-3">
      <div className="surface rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <FileText size={16} className="text-aws-orange mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-sm">Client report</h3>
            <p className="text-[11.5px] text-muted mt-1">
              {report.sectionCount} section{report.sectionCount === 1 ? '' : 's'}, built only from records that
              exist. Anything with no data behind it is left out rather than filled in.
            </p>
          </div>
          <button
            onClick={() => openPrintable({
              markdown: report.markdown,
              title: report.title,
              subtitle: report.subtitle,
              meta: report.meta,
              authorName: report.authorName,
              authorCompany: report.authorCompany,
              documentType: report.documentType,
            })}
            className="btn btn-primary !text-[11px] !py-1.5 inline-flex items-center gap-1.5 shrink-0"
          >
            <Printer size={12} /> Open print view
          </button>
        </div>
      </div>

      {blocks.length > 0 && (
        <div className="surface rounded-2xl p-4 border-danger/40">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={14} className="text-danger" />
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-danger">
              Do not send — {blocks.length}
            </h4>
          </div>
          <ul className="space-y-2">
            {blocks.map((finding, i) => (
              <li key={i} className="text-[12px]">
                <div className="font-bold">{finding.message}</div>
                {finding.detail && <div className="text-[11px] text-muted mt-0.5">{finding.detail}</div>}
              </li>
            ))}
          </ul>
          <p className="text-[10.5px] text-muted mt-3">
            These are kept out of the document below. They are listed so you know what was withheld
            and why, rather than quietly disappearing.
          </p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="surface rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-warning" />
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-warning">
              Check before sending — {warnings.length}
            </h4>
          </div>
          <ul className="space-y-2">
            {warnings.map((finding, i) => (
              <li key={i} className="text-[12px]">
                <div className="font-bold">{finding.message}</div>
                {finding.detail && <div className="text-[11px] text-muted mt-0.5">{finding.detail}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="surface rounded-2xl p-5">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted">
          {report.documentType}
        </div>
        <h2 className="text-lg font-black tracking-tight mt-1">{report.title}</h2>
        <p className="text-[11.5px] text-muted">{report.subtitle}</p>
        {report.meta.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 pt-2 border-t border-token">
            {report.meta.map((m) => (
              <span key={m.label} className="text-[11px]">
                <span className="text-muted">{m.label}: </span>
                <strong>{m.value}</strong>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-token">
          {report.markdown
            ? <Markdown source={report.markdown} />
            : <p className="text-sm text-muted">
                Nothing to report yet. Build a solution for this job and the report fills itself in.
              </p>}
        </div>
      </div>
    </div>
  );
}
