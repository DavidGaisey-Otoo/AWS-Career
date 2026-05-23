import { AnimatePresence, motion } from 'framer-motion';
import {
  Award, Bookmark, BookOpen, CheckCircle2, ChevronLeft, ChevronRight,
  ExternalLink, FileText, FlaskConical, Layers, Maximize, Minus, Plus,
  Printer, Sparkles, Target, Youtube,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLearning } from '../../context/LearningContext.jsx';
import { findTopicAnywhere, getCategory } from '../../data/learning.js';
import { ServiceBadge } from '../portfolio/ServiceBadge.jsx';
import { ProgressRing } from '../roadmap/ProgressRing.jsx';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/utils.js';
import { FlashcardDeck } from './FlashcardDeck.jsx';
import { LabPanel } from './LabPanel.jsx';
import { QuizPanel } from './QuizPanel.jsx';
import { ReadingMode } from './ReadingMode.jsx';

const TABS = [
  { id: 'read',       label: 'Read',       icon: BookOpen },
  { id: 'lab',        label: 'Lab',        icon: FlaskConical },
  { id: 'quiz',       label: 'Quiz',       icon: Target },
  { id: 'flashcards', label: 'Flashcards', icon: Sparkles },
  { id: 'notes',      label: 'Notes',      icon: FileText },
];

const DIFFICULTY_META = {
  beginner:     { label: 'Beginner',     color: 'text-success border-success/40 bg-success/10' },
  intermediate: { label: 'Intermediate', color: 'text-warning border-warning/40 bg-warning/10' },
  advanced:     { label: 'Advanced',     color: 'text-danger border-danger/40 bg-danger/10' },
};

export function TopicView({ category, topic }) {
  const {
    getTopicState, markConceptRead, toggleBookmark, masteryFor,
    setTopicNotes, state, setFontScale,
  } = useLearning();
  const ts = getTopicState(topic.id);
  const mastery = masteryFor(topic.id);
  const [tab, setTab] = useState('read');
  const [readingMode, setReadingMode] = useState(false);
  const [draftNotes, setDraftNotes] = useState(ts.notes);

  // reset draft when topic changes
  useEffect(() => { setDraftNotes(getTopicState(topic.id).notes); }, [topic.id]); // eslint-disable-line

  // adjacency for next/prev nav within category
  const { prev, next } = useMemo(() => {
    const idx = category.topics.findIndex((t) => t.id === topic.id);
    return {
      prev: idx > 0 ? category.topics[idx - 1] : null,
      next: idx < category.topics.length - 1 ? category.topics[idx + 1] : null,
    };
  }, [category, topic]);

  const diff = DIFFICULTY_META[topic.difficulty] || DIFFICULTY_META.intermediate;

  // Font scale (read tab only)
  const fontScale = state.fontScale ?? 1;

  return (
    <article className="space-y-5">
      {/* breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <Link to="/learning" className="font-bold hover:text-aws-orange">Learning</Link>
        <ChevronRight size={12} />
        <Link to={`/learning?cat=${category.id}`} className="font-bold hover:text-aws-orange">{category.title}</Link>
        <ChevronRight size={12} />
        <span className="font-bold text-current truncate">{topic.title}</span>
      </div>

      {/* hero */}
      <motion.section
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="surface rounded-3xl p-5 sm:p-7 gradient-border relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_140px] items-start">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{category.icon}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange">
                {category.title}
              </span>
              <span className={cn('chip border font-bold text-[11px]', diff.color)}>
                {diff.label}
              </span>
              <span className="text-[11px] text-muted">~{topic.studyMinutes} min</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight mt-2">
              {topic.title}
            </h1>
            {topic.summary && (
              <p className="text-sm sm:text-base text-muted leading-relaxed mt-2 max-w-3xl">
                {topic.summary}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {topic.services.map((sid) => <ServiceBadge key={sid} id={sid} />)}
              {topic.certs?.map((c) => (
                <span key={c} className="chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-[11px] font-bold">
                  <Award size={11} /> {c}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              <button
                onClick={() => markConceptRead(topic.id, !ts.conceptRead)}
                className={cn(
                  'btn',
                  ts.conceptRead ? 'bg-success/15 text-success border border-success/30'
                                  : 'btn-ghost'
                )}
              >
                <CheckCircle2 size={14} />
                {ts.conceptRead ? 'Concept read' : 'Mark concept read'}
              </button>
              <button
                onClick={() => toggleBookmark(topic.id)}
                className={cn('btn', ts.bookmarked ? 'btn-primary' : 'btn-ghost')}
              >
                <Bookmark size={14} className={ts.bookmarked ? 'fill-current' : ''} />
                {ts.bookmarked ? 'Saved' : 'Save'}
              </button>
              <button onClick={() => setReadingMode(true)} className="btn btn-ghost">
                <Maximize size={14} /> Read mode
              </button>
              <button onClick={() => window.print()} className="btn btn-ghost">
                <Printer size={14} /> PDF
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <ProgressRing percent={mastery} size={130} stroke={10} accent="rainbow">
              <div className="text-center">
                <div className="text-2xl font-black tabular-nums">{mastery}</div>
                <div className="text-[9px] uppercase tracking-widest text-muted font-bold mt-0.5">Mastery</div>
              </div>
            </ProgressRing>
            <div className="mt-3 grid grid-cols-3 gap-1 text-[10px] text-center w-full">
              <Tick on={ts.conceptRead} label="Read" />
              <Tick on={ts.labCompleted} label="Lab" />
              <Tick on={ts.quizPassed} label="Quiz" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                tab === t.id
                  ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                  : 'text-muted hover:text-current'
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1 px-2">
          {tab === 'read' && (
            <>
              <FontButton onClick={() => setFontScale(Math.max(0.9, fontScale - 0.1))} disabled={fontScale <= 0.9}><Minus size={12} /></FontButton>
              <span className="text-[10px] font-extrabold text-muted tabular-nums">{Math.round(fontScale * 100)}%</span>
              <FontButton onClick={() => setFontScale(Math.min(1.4, fontScale + 0.1))} disabled={fontScale >= 1.4}><Plus size={12} /></FontButton>
            </>
          )}
        </div>
      </div>

      {/* tab body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {tab === 'read' && (
            <ReadTab topic={topic} fontScale={fontScale} />
          )}
          {tab === 'lab' && (
            <LabPanel topicId={topic.id} lab={topic.lab} />
          )}
          {tab === 'quiz' && (
            <QuizPanel topicId={topic.id} questions={topic.quiz || []} />
          )}
          {tab === 'flashcards' && (
            <FlashcardDeck topicId={topic.id} cards={topic.flashcards || []} />
          )}
          {tab === 'notes' && (
            <NotesTab
              topicId={topic.id}
              draft={draftNotes}
              setDraft={setDraftNotes}
              onSave={() => setTopicNotes(topic.id, draftNotes)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* related */}
      {topic.related?.length > 0 && (
        <section className="surface rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={14} className="text-aws-orange" />
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Related topics</h3>
          </div>
          <ul className="flex flex-wrap gap-2">
            {topic.related.map((rid) => {
              const ref = findTopicAnywhere(rid);
              if (!ref) return null;
              return (
                <li key={rid}>
                  <Link
                    to={`/learning/${ref.category.id}/${ref.topic.id}`}
                    className="chip bg-[var(--card-2)] border border-token text-xs font-bold hover:border-aws-orange/60 hover:bg-aws-orange/5 transition"
                  >
                    {ref.category.icon} {ref.topic.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* prev/next */}
      <nav className="flex items-center justify-between gap-3 print:hidden">
        {prev ? (
          <Link
            to={`/learning/${category.id}/${prev.id}`}
            className="flex-1 surface rounded-2xl p-4 hover:bg-[var(--card-2)] transition focus-ring group"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
              <ChevronLeft size={11} /> Previous
            </div>
            <div className="text-sm font-bold mt-1 truncate">{prev.title}</div>
          </Link>
        ) : <div className="flex-1" />}
        {next ? (
          <Link
            to={`/learning/${category.id}/${next.id}`}
            className="flex-1 surface rounded-2xl p-4 text-right hover:bg-[var(--card-2)] transition focus-ring group"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-muted inline-flex items-center gap-1">
              Next <ChevronRight size={11} />
            </div>
            <div className="text-sm font-bold mt-1 truncate">{next.title}</div>
          </Link>
        ) : <div className="flex-1" />}
      </nav>

      <ReadingMode open={readingMode} onClose={() => setReadingMode(false)} topic={topic} category={category} fontScale={fontScale} />
    </article>
  );
}

function ReadTab({ topic, fontScale }) {
  return (
    <div className="space-y-5" style={{ fontSize: `${fontScale}rem`, lineHeight: 1.65 }}>
      {topic.simpleEnglish && (
        <Section title="In simple English" icon={Sparkles}>
          <p className="leading-relaxed">{topic.simpleEnglish}</p>
        </Section>
      )}
      {topic.deepDive && (
        <Section title="Deep dive" icon={BookOpen}>
          <p className="leading-relaxed whitespace-pre-wrap">{topic.deepDive}</p>
        </Section>
      )}
      {topic.keyPoints?.length > 0 && (
        <Section title="Key points" icon={Target}>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {topic.keyPoints.map((kp, i) => (
              <li key={i} className="rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
                {typeof kp === 'string' ? (
                  <span className="text-sm leading-relaxed">{kp}</span>
                ) : (
                  <>
                    <div className="font-bold text-sm">{kp.front}</div>
                    <div className="text-xs text-muted leading-relaxed mt-1">{kp.back}</div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {topic.useCase && (
        <Section title="Real-world use case" icon={Layers}>
          <p className="leading-relaxed">{topic.useCase}</p>
        </Section>
      )}

      {/* exam + interview prep */}
      {(topic.examQuestions?.length || topic.interviewQuestions?.length) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {topic.examQuestions?.length > 0 && (
            <Section title="Common exam questions" icon={Award}>
              <ul className="space-y-1.5 text-sm">
                {topic.examQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-aws-orange mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {topic.interviewQuestions?.length > 0 && (
            <Section title="Common interview questions" icon={Award}>
              <ul className="space-y-1.5 text-sm">
                {topic.interviewQuestions.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-electric mt-1.5 flex-shrink-0" />
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      ) : null}

      {/* external resources */}
      {(topic.awsDocs || topic.youtube) && (
        <Section title="Best resources" icon={ExternalLink}>
          <div className="flex flex-wrap gap-2">
            {topic.awsDocs && (
              <a href={topic.awsDocs} target="_blank" rel="noreferrer"
                 className="chip bg-[var(--card-2)] border border-token text-xs font-bold hover:bg-[var(--card)]">
                <ExternalLink size={11} /> AWS docs
              </a>
            )}
            {topic.youtube && (
              <a href={topic.youtube} target="_blank" rel="noreferrer"
                 className="chip bg-danger/10 text-danger border border-danger/30 text-xs font-bold">
                <Youtube size={12} /> Video walkthrough
              </a>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

function NotesTab({ topicId, draft, setDraft, onSave }) {
  return (
    <div className="surface rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Your notes</h3>
        <span className="text-[10px] text-muted">Autosaves when you click away</span>
      </div>
      <textarea
        rows={12}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onSave}
        placeholder="What's the one thing about this topic you don't want to forget?"
        className="w-full bg-[var(--card-2)] border border-token rounded-xl p-3 text-sm leading-relaxed focus-ring focus:border-aws-orange resize-y"
      />
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="surface rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {Icon ? <Icon size={14} className="text-aws-orange" /> : null}
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Tick({ on, label }) {
  return (
    <div className={cn(
      'rounded-md px-1 py-1 font-extrabold uppercase tracking-widest',
      on ? 'bg-success/15 text-success' : 'bg-[var(--card-2)] text-muted'
    )}>
      {label}
    </div>
  );
}

function FontButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid place-items-center w-6 h-6 rounded-md transition',
        disabled ? 'text-muted opacity-40' : 'text-muted hover:text-current hover:bg-[var(--card)]'
      )}
    >{children}</button>
  );
}
