/**
 * IntakePanel.jsx — the questions this project still needs answered.
 *
 * Built from what the project does NOT know (see lib/clientIntake.js).
 * Anything already settled is shown as a fact to confirm rather than
 * asked again, and the suggested resource names are offered with the
 * client's own decision attached — never presented as decided.
 */
import { useMemo, useState } from 'react';
import { Check, Copy, Mail, HelpCircle, Lightbulb } from 'lucide-react';
import { buildIntakeForm, intakeAsEmail, intakeAsText } from '../../lib/clientIntake.js';

function CopyButton({ text, label, icon: Icon = Copy }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch { setDone(false); }
      }}
      className="btn btn-ghost !text-[11px] !py-1.5 inline-flex items-center gap-1.5"
    >
      {done ? <Check size={12} /> : <Icon size={12} />}
      {done ? 'Copied' : label}
    </button>
  );
}

export function IntakePanel({ project, author }) {
  const form = useMemo(() => buildIntakeForm(project, { author }), [project, author]);
  const text = useMemo(() => intakeAsText(form), [form]);
  const email = useMemo(() => intakeAsEmail(form, { author }), [form, author]);
  const [open, setOpen] = useState(() => form.sections[0]?.id || null);

  return (
    <div className="space-y-3">
      <div className="surface rounded-2xl p-4">
        <div className="flex items-start gap-2">
          <HelpCircle size={16} className="text-aws-orange mt-0.5 shrink-0" />
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm">What I still need from the client</h3>
            <p className="text-[11.5px] text-muted mt-1">
              {form.questionCount} questions, {form.requiredCount} of them needed before work can start.
              Only what this project does not already know is asked.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <CopyButton text={text} label="Copy the form" />
          <CopyButton text={`${email.subject}\n\n${email.body}`} label="Copy as an email" icon={Mail} />
        </div>
      </div>

      {form.knownFacts.length > 0 && (
        <div className="surface rounded-2xl p-4">
          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-muted mb-2">
            What I have already — for them to correct
          </h4>
          <div className="grid gap-1 sm:grid-cols-2">
            {form.knownFacts.map((fact) => (
              <div key={fact.label} className="text-[12px] flex items-baseline gap-2">
                <span className="text-muted w-32 shrink-0">{fact.label}</span>
                <span className="min-w-0 break-words font-semibold">{fact.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="surface rounded-2xl p-4">
        <div className="flex items-start gap-2 mb-2">
          <Lightbulb size={14} className="text-warning mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[11px] font-extrabold uppercase tracking-widest">Suggested names</h4>
            <p className="text-[11px] text-muted mt-0.5">
              {form.suggestions.fromSolution
                ? 'These are the names the generated templates already use.'
                : 'Derived from the project title. Nothing is committed until the client agrees.'}
            </p>
          </div>
        </div>
        <div className="grid gap-1 sm:grid-cols-3">
          {[
            ['Project name', form.suggestions.projectName],
            ['Stack name', form.suggestions.stackName],
            ['Resource prefix', form.suggestions.resourcePrefix],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-1.5">
              <div className="text-[10px] text-muted">{label}</div>
              <div className="text-[12px] font-bold break-all">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {form.sections.map((section) => {
        const isOpen = open === section.id;
        return (
          <div key={section.id} className="surface rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : section.id)}
              className="w-full flex items-center gap-2 p-4 text-left hover:bg-[var(--card-2)] transition"
            >
              <h4 className="text-[12px] font-extrabold">{section.heading}</h4>
              <span className="text-[10px] text-muted">{section.questions.length}</span>
              <span className="ml-auto text-[11px] text-muted">{isOpen ? 'Hide' : 'Show'}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 space-y-3">
                {section.why && <p className="text-[11px] text-muted">{section.why}</p>}
                {section.questions.map((question) => (
                  <div key={question.id} className="border-l-2 border-token pl-3">
                    <div className="text-[12px] font-semibold">
                      {question.label}
                      {question.required && <span className="text-danger ml-1">*</span>}
                    </div>
                    {question.hint && <div className="text-[11px] text-muted mt-0.5">{question.hint}</div>}
                    {question.options && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {question.options.map((option) => (
                          <span key={option} className="chip border border-token bg-[var(--card-2)] text-[10.5px]">
                            {option}
                          </span>
                        ))}
                      </div>
                    )}
                    {question.prefill && (
                      <div className="text-[11px] mt-1">
                        <span className="text-muted">Suggested: </span>
                        <span className="font-bold">{question.prefill}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
