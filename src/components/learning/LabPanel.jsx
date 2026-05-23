import { motion } from 'framer-motion';
import {
  AlertOctagon, Calendar, CheckCircle2, Cloud, FlaskConical, Trash2, Video,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLearning } from '../../context/LearningContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { AnimatedCheckbox } from '../roadmap/AnimatedCheckbox.jsx';
import { DifficultyStars } from '../roadmap/DifficultyStars.jsx';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/utils.js';

/**
 * Hands-on lab guide with numbered steps, expected outputs, gotchas,
 * a completion checkbox, time-taken field, post-lab rating + notes,
 * and a cleanup checklist that must NOT be skipped.
 */
export function LabPanel({ topicId, lab }) {
  const { getTopicState, markLabCompleted, setLabFields } = useLearning();
  const toast = useToast();
  const ts = getTopicState(topicId);
  const [draftNotes, setDraftNotes] = useState(ts.labNotes);
  const [draftMinutes, setDraftMinutes] = useState(ts.labMinutes);
  useEffect(() => {
    setDraftNotes(ts.labNotes); setDraftMinutes(ts.labMinutes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);

  if (!lab) {
    return (
      <div className="surface rounded-2xl p-8 text-center text-sm text-muted">
        No structured lab for this topic yet — try the related topic\'s lab.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* hero */}
      <motion.div
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="surface rounded-2xl p-5 sm:p-6 gradient-border relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-electric/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
              <FlaskConical size={12} /> Hands-on lab
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1.5">{lab.title}</h2>
            {lab.objective && (
              <p className="text-sm text-muted leading-relaxed mt-2">{lab.objective}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="chip bg-[var(--card-2)] border border-token font-bold">
                <Calendar size={11} /> ~{lab.estMinutes} min
              </span>
              {lab.freeTier
                ? <span className="chip bg-success/10 text-success border border-success/30 font-bold">Free Tier</span>
                : <span className="chip bg-warning/10 text-warning border border-warning/30 font-bold">{lab.estCost}</span>}
              {lab.video && (
                <a href={lab.video} target="_blank" rel="noreferrer"
                   className="chip bg-[var(--card-2)] border border-token font-bold hover:bg-[var(--card)]">
                  <Video size={11} /> Walkthrough
                </a>
              )}
            </div>
          </div>
          {lab.prereqs?.length > 0 && (
            <div className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted mb-2">Prereqs</div>
              <ul className="space-y-1.5 text-xs">
                {lab.prereqs.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>

      {/* steps */}
      <ol className="space-y-3">
        {lab.steps.map((s) => (
          <li key={s.n} className="surface rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-aws text-ink-950 font-black text-sm flex-shrink-0">
                {s.n}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base font-bold tracking-tight">{s.title}</h4>
                {s.detail && <p className="text-sm text-muted leading-relaxed mt-1.5">{s.detail}</p>}
                {s.expected && (
                  <div className="mt-2 rounded-xl border border-success/30 bg-success/[0.04] p-2.5 flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">
                      <span className="font-extrabold uppercase tracking-widest text-success text-[10px] mr-1.5">Expected</span>
                      {s.expected}
                    </span>
                  </div>
                )}
                {s.gotcha && (
                  <div className="mt-2 rounded-xl border border-warning/30 bg-warning/[0.04] p-2.5 flex items-start gap-2">
                    <AlertOctagon size={14} className="text-warning mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">
                      <span className="font-extrabold uppercase tracking-widest text-warning text-[10px] mr-1.5">Gotcha</span>
                      {s.gotcha}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {/* cleanup */}
      {lab.cleanup?.length > 0 && (
        <div className="surface rounded-2xl p-5 border-l-4 border-l-danger">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={16} className="text-danger" />
            <h4 className="text-sm font-extrabold uppercase tracking-widest text-danger">
              Cleanup checklist — don't skip
            </h4>
          </div>
          <ul className="space-y-2 text-sm">
            {lab.cleanup.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted mt-3">
            <strong className="text-danger">Why this matters:</strong> forgotten NAT Gateways and EIPs are the #1 source of surprise bills.
          </p>
        </div>
      )}

      {/* completion */}
      <div className="surface rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AnimatedCheckbox
            checked={ts.labCompleted}
            onChange={() => {
              const next = !ts.labCompleted;
              markLabCompleted(topicId, next);
              if (next) toast.success('Lab marked complete', { description: 'Mastery + activity recorded.' });
            }}
            size={24}
          />
          <div className="flex-1">
            <div className="font-bold">Lab completed</div>
            <p className="text-xs text-muted">Tick when you\'ve finished AND cleaned up.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Time taken (minutes)">
            <input
              type="number" min={0}
              value={draftMinutes}
              onChange={(e) => setDraftMinutes(Number(e.target.value))}
              onBlur={() => setLabFields(topicId, { labMinutes: draftMinutes })}
              className="w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm focus-ring focus:border-aws-orange"
            />
          </Field>
          <Field label="Difficulty after completion">
            <DifficultyStars
              value={ts.labDifficulty}
              onChange={(n) => setLabFields(topicId, { labDifficulty: n })}
              size={20}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            rows={4}
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            onBlur={() => setLabFields(topicId, { labNotes: draftNotes })}
            placeholder="What surprised you? Any gotchas to remember?"
            className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
