/**
 * TopicStudyGuide.jsx — full read-before-you-practice page for a single
 * topic. Surfaced from the Topic Heatmap drawer "Open Study Guide" button
 * and accessible directly via /exam/:certId/study/:topicId.
 *
 * Falls back to the brief notes (topicNotes.js) for any topic that doesn't
 * yet have a full guide in topicStudyGuides.js, with a "more coming" banner.
 */

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, BookOpen, CheckCircle2, ExternalLink, Lightbulb, Play,
  ScrollText, Sparkles, AlertTriangle, Clock, Target, GitBranch,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import { CERTS } from '../data/certs.js';
import { TOPIC_SERVICES } from '../data/examModes.js';
import { TOPIC_STUDY_GUIDES } from '../data/topicStudyGuides.js';
import { TOPIC_NOTES, topicNote } from '../data/topicNotes.js';
import { questionsForCert } from '../data/questionBank.js';

export default function TopicStudyGuide() {
  const { certId, topicId } = useParams();
  const cert = CERTS.find((c) => c.id === certId);
  const topic = TOPIC_SERVICES.find((t) => t.id === topicId);
  const guide = TOPIC_STUDY_GUIDES[topicId];
  const briefNotes = topicNote(topicId);

  // Count questions available for this topic in the current cert
  const available = useMemo(() => {
    if (!cert || !topic) return 0;
    const all = questionsForCert(cert.id);
    const aliases = (topic.aliases || [topic.id]).map((a) => a.toLowerCase());
    return all.filter((q) => (q.service || []).some((s) => aliases.includes(String(s).toLowerCase()))).length;
  }, [cert, topic]);

  if (!cert) {
    return <div className="surface rounded-2xl p-8 text-center">Certification not found.</div>;
  }
  if (!topic) {
    return <div className="surface rounded-2xl p-8 text-center">Topic not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to={`/exam/${cert.id}`} className="text-sm opacity-70 hover:opacity-100 flex items-center gap-1.5 mt-1">
            <ArrowLeft size={14} /> Back to {cert.code}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {available > 0 && (
            <Link
              to={`/exam/${cert.id}/run/topic?service=${topic.id}`}
              className="btn btn-primary"
            >
              <Play size={14} /> Practice {available} question{available === 1 ? '' : 's'}
            </Link>
          )}
        </div>
      </div>

      {/* Title block */}
      <header className="surface rounded-3xl p-7 gradient-border">
        <div className="flex items-start gap-4">
          <div className="text-5xl">{topic.icon}</div>
          <div className="flex-1">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
              {cert.code} · Study Guide
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {guide?.title || topic.label}
            </h1>
            {guide?.subtitle && (
              <p className="text-base opacity-80 mt-1.5">{guide.subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              {guide?.estReadMin && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-aws-orange/15 text-aws-orange font-bold">
                  <Clock size={11} /> ~{guide.estReadMin} min read
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--card-2)] font-bold">
                <BookOpen size={11} /> {available} practice question{available === 1 ? '' : 's'} available
              </span>
            </div>
          </div>
        </div>
      </header>

      {guide ? (
        <FullGuide guide={guide} cert={cert} topic={topic} available={available} />
      ) : (
        <BriefStub briefNotes={briefNotes} topic={topic} cert={cert} available={available} />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Full guide renderer
// ════════════════════════════════════════════════════════════════════
function FullGuide({ guide, cert, topic, available }) {
  return (
    <>
      {/* Overview */}
      {guide.overview && (
        <Section icon={<ScrollText size={16} />} title="Overview" tone="aws-orange">
          <div className="text-[15px] leading-relaxed opacity-90 whitespace-pre-line">
            {guide.overview.trim()}
          </div>
        </Section>
      )}

      {/* Sections */}
      {guide.sections?.map((s, i) => (
        <Section key={i} icon={<Sparkles size={16} />} title={s.title}>
          {s.body && (
            <p className="text-[14px] leading-relaxed opacity-90 mb-3">{s.body}</p>
          )}
          {s.bullets && (
            <ul className="space-y-2 mb-3">
              {s.bullets.map((b, j) => (
                <li key={j} className="flex items-start gap-2.5 text-[14px]">
                  <CheckCircle2 size={14} className="text-success mt-1 flex-shrink-0" />
                  <span className="opacity-90">{b}</span>
                </li>
              ))}
            </ul>
          )}
          {s.table && <DataTable headers={s.table.headers} rows={s.table.rows} />}
        </Section>
      ))}

      {/* Decision Tree */}
      {guide.decisionTree && <DecisionTree tree={guide.decisionTree} />}

      {/* Worked Examples */}
      {guide.workedExamples?.length > 0 && (
        <Section icon={<Target size={16} />} title="Worked examples — think it through with me">
          <div className="space-y-4">
            {guide.workedExamples.map((wx, i) => (
              <WorkedExample key={i} index={i + 1} example={wx} />
            ))}
          </div>
        </Section>
      )}

      {/* Exam traps */}
      {guide.examTraps?.length > 0 && (
        <Section icon={<AlertTriangle size={16} />} title="Common exam traps" tone="warning">
          <ul className="space-y-2">
            {guide.examTraps.map((t, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px]">
                <AlertTriangle size={14} className="text-warning mt-1 flex-shrink-0" />
                <span className="opacity-90">{t}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Cheatsheet */}
      {guide.cheatsheet?.length > 0 && (
        <Section icon={<Lightbulb size={16} />} title="Quick-reference cheatsheet">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {guide.cheatsheet.map((c, i) => (
              <div key={i} className="rounded-lg border border-token bg-[var(--card-2)]/40 p-3.5">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">{c.k}</div>
                <div className="text-[13.5px] font-bold leading-snug">{c.v}</div>
                {c.desc && (
                  <div className="text-[11.5px] opacity-75 mt-1.5 leading-relaxed">{c.desc}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Flashcards */}
      {guide.flashcards?.length > 0 && <Flashcards cards={guide.flashcards} />}

      {/* Resources */}
      {guide.resources?.length > 0 && (
        <Section icon={<ExternalLink size={16} />} title="Official resources">
          <ul className="space-y-1.5">
            {guide.resources.map((r, i) => (
              <li key={i}>
                <a href={r.url} target="_blank" rel="noreferrer"
                   className="text-[14px] text-aws-orange font-semibold hover:underline inline-flex items-center gap-1.5">
                  <ExternalLink size={12} /> {r.label}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Footer CTA */}
      {available > 0 && (
        <div className="surface rounded-3xl p-6 text-center gradient-border">
          <h3 className="text-xl font-extrabold mb-2">Feeling ready?</h3>
          <p className="opacity-80 text-sm mb-4">
            Test what you just learned — {available} {topic.label} question{available === 1 ? '' : 's'} waiting.
          </p>
          <Link
            to={`/exam/${cert.id}/run/topic?service=${topic.id}`}
            className="btn btn-primary inline-flex"
          >
            <Play size={14} /> Start practice ({available} questions)
          </Link>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Brief notes fallback when no full guide exists yet
// ════════════════════════════════════════════════════════════════════
function BriefStub({ briefNotes, topic, cert, available }) {
  return (
    <>
      <div className="surface rounded-2xl p-4 border-2 border-aws-orange/40">
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className="text-aws-orange mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <strong>A fuller guide for {topic.label} is on the way.</strong> For now,
            here are the quick-reference notes — plus a direct link to AWS docs.
            You can also start practicing — every wrong answer comes with a full
            explanation that doubles as a mini-lesson.
          </div>
        </div>
      </div>

      {briefNotes ? (
        <>
          {briefNotes.oneLine && (
            <Section icon={<ScrollText size={16} />} title="What it is">
              <p className="text-[15px] opacity-90">{briefNotes.oneLine}</p>
            </Section>
          )}

          {briefNotes.keyFacts?.length > 0 && (
            <Section icon={<CheckCircle2 size={16} />} title="Key facts to know">
              <ul className="space-y-2">
                {briefNotes.keyFacts.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px]">
                    <CheckCircle2 size={14} className="text-success mt-1 flex-shrink-0" />
                    <span className="opacity-90">{f}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {briefNotes.examTraps?.length > 0 && (
            <Section icon={<AlertTriangle size={16} />} title="Exam traps" tone="warning">
              <ul className="space-y-2">
                {briefNotes.examTraps.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px]">
                    <AlertTriangle size={14} className="text-warning mt-1 flex-shrink-0" />
                    <span className="opacity-90">{t}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {briefNotes.docs && (
            <Section icon={<ExternalLink size={16} />} title="Official AWS docs">
              <a href={briefNotes.docs} target="_blank" rel="noreferrer"
                 className="text-[14px] text-aws-orange font-semibold hover:underline inline-flex items-center gap-1.5">
                <ExternalLink size={12} /> {briefNotes.docs}
              </a>
            </Section>
          )}
        </>
      ) : (
        <Section icon={<ScrollText size={16} />} title="No notes yet">
          <p className="text-sm opacity-80">
            Notes for {topic.label} are being written. In the meantime, the practice
            questions for this topic include full explanations.
          </p>
        </Section>
      )}

      {available > 0 && (
        <div className="text-center pt-2">
          <Link
            to={`/exam/${cert.id}/run/topic?service=${topic.id}`}
            className="btn btn-primary inline-flex"
          >
            <Play size={14} /> Start practice ({available} {topic.label} questions)
          </Link>
        </div>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Building blocks
// ════════════════════════════════════════════════════════════════════
function Section({ icon, title, tone = 'aws-orange', children }) {
  return (
    <section className="surface rounded-2xl p-6">
      <h2 className={`text-lg font-extrabold mb-3 flex items-center gap-2 text-${tone}`}>
        {icon} {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto mt-2 rounded-xl border border-token">
      <table className="w-full text-[13px]">
        <thead className="bg-[var(--card-2)]/60">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left px-3 py-2 font-extrabold text-aws-orange whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-[var(--card-2)]/20' : ''}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 align-top opacity-90">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Flashcards({ cards }) {
  const [revealed, setRevealed] = useState({});
  return (
    <Section icon={<Lightbulb size={16} />} title="Quick flashcards (click to reveal)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {cards.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRevealed((r) => ({ ...r, [i]: !r[i] }))}
            className="text-left rounded-xl border border-token bg-[var(--card-2)]/40 hover:border-aws-orange/40 p-3.5 transition"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">
              Q{i + 1}
            </div>
            <div className="text-[13.5px] font-semibold mb-2 leading-snug">{c.q}</div>
            <div className={`text-[12.5px] leading-snug rounded-lg px-2.5 py-1.5 transition ${
              revealed[i]
                ? 'bg-success/15 text-current opacity-100'
                : 'bg-[var(--card)]/60 text-transparent select-none italic'
            }`}>
              {revealed[i] ? c.a : 'Click to reveal answer'}
            </div>
          </button>
        ))}
      </div>
    </Section>
  );
}

// ════════════════════════════════════════════════════════════════════
// Worked Example — expandable step-by-step reasoning
// ════════════════════════════════════════════════════════════════════
function WorkedExample({ index, example }) {
  const [open, setOpen] = useState(index === 1); // First example open by default
  const [revealAnswer, setRevealAnswer] = useState(false);
  return (
    <div className="rounded-xl border border-aws-orange/30 bg-[var(--card-2)]/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--card-2)]/60 transition"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-aws-orange/20 text-aws-orange text-[11px] font-extrabold flex items-center justify-center mt-0.5">
          {index}
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-extrabold mb-1">{example.title}</div>
          <p className="text-[12.5px] opacity-80 leading-snug">{example.scenario}</p>
        </div>
        {open ? <ChevronDown size={16} className="opacity-60 mt-1" /> : <ChevronRight size={16} className="opacity-60 mt-1" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-token">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2 mt-2">
            How I'd think through it
          </div>
          <ol className="space-y-2 mb-4">
            {example.reasoning.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px]">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--card)] text-[10px] font-bold flex items-center justify-center mt-0.5 opacity-70">
                  {i + 1}
                </span>
                <span className="opacity-90 leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setRevealAnswer((r) => !r)}
            className="w-full text-left rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 hover:border-success/60 transition"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-1 flex items-center gap-2">
              <CheckCircle2 size={11} /> {revealAnswer ? 'Final answer' : 'Click for final answer'}
            </div>
            {revealAnswer && (
              <div className="text-[13px] font-semibold leading-snug">{example.answer}</div>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Decision Tree — IF/THEN routing table
// ════════════════════════════════════════════════════════════════════
function DecisionTree({ tree }) {
  return (
    <Section icon={<GitBranch size={16} />} title={tree.title || 'Decision tree'}>
      {tree.intro && (
        <p className="text-[14px] opacity-90 leading-relaxed mb-3">{tree.intro}</p>
      )}
      <div className="space-y-2">
        {tree.rows.map((row, i) => (
          <div key={i} className="rounded-lg border border-token bg-[var(--card-2)]/40 p-3 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
                If
              </div>
              <div className="text-[13px] font-semibold leading-snug">{row.if}</div>
            </div>
            <ChevronRight size={18} className="opacity-50 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-success mb-0.5">
                Then pick
              </div>
              <div className="text-[13px] font-bold leading-snug">{row.then}</div>
            </div>
          </div>
        ))}
      </div>
      {tree.tip && (
        <div className="mt-3 text-[12px] opacity-75 italic border-l-2 border-aws-orange/50 pl-3">
          💡 {tree.tip}
        </div>
      )}
    </Section>
  );
}
