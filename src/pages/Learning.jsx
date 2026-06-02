import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, Library, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { CategoryTree } from '../components/learning/CategoryTree.jsx';
import { DailyDigest } from '../components/learning/DailyDigest.jsx';
import { DailyStudyPlanCard } from '../components/study/DailyStudyPlanCard.jsx';
import { WhitepaperLibrary } from '../components/learning/WhitepaperLibrary.jsx';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { useLearning } from '../context/LearningContext.jsx';
import { LEARNING_CATEGORIES, TOTAL_TOPICS } from '../data/learning.js';
import { cn } from '../lib/utils.js';

export default function Learning() {
  const { categoryStats, overallProgress, bookmarkedTopics, recentTopics } = useLearning();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning Lab"
        title="AWS, end to end"
        subtitle="14 categories · 100+ topics · every one with simple-English explanations, deep dives, hands-on labs, quizzes, and flashcards. Reach any topic in 3 clicks."
        icon={BookOpen}
      />

      <DailyDigest />

      {/* EX-20: Daily Study Plan — auto-generates from exam date + weak topics */}
      <DailyStudyPlanCard />

      {/* hero progress */}
      <motion.section
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="surface rounded-3xl p-5 sm:p-7 gradient-border relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid gap-5 lg:grid-cols-[200px_1fr] items-center">
          <div className="flex justify-center">
            <ProgressRing percent={overallProgress} size={180} stroke={12} accent="rainbow" mega>
              <div className="text-center">
                <div className="text-3xl font-black tracking-tight text-gradient">{overallProgress}<span className="text-base">%</span></div>
                <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-1">Overall mastery</div>
              </div>
            </ProgressRing>
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Pick a category, pick a topic.</h2>
            <p className="text-sm text-muted mt-1">
              {TOTAL_TOPICS} topics across 14 categories. Networking is intentionally expanded — it&apos;s your edge.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="chip bg-electric/10 text-electric border border-electric/30 font-bold">
                {bookmarkedTopics.length} saved
              </span>
              <span className="chip bg-success/10 text-success border border-success/30 font-bold">
                {categoryStats.reduce((a, c) => a + c.conceptPct * c.total / 100, 0).toFixed(0)} topics read
              </span>
              <span className="chip bg-warning/10 text-warning border border-warning/30 font-bold">
                {categoryStats.reduce((a, c) => a + c.quizPct * c.total / 100, 0).toFixed(0)} quizzes passed
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* category grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {LEARNING_CATEGORIES.map((cat, i) => {
          const stat = categoryStats.find((s) => s.id === cat.id);
          const first = cat.topics[0];
          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
            >
              <Link
                to={`/learning/${cat.id}/${first.id}`}
                className={cn(
                  'group surface rounded-2xl p-4 h-full flex flex-col gap-3 hover:border-aws-orange/40 transition focus-ring relative overflow-hidden',
                  cat.expanded && 'gradient-border'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl">{cat.icon}</span>
                  <ProgressRing percent={stat.avgMastery} size={36} stroke={4} accent="orange" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-extrabold tracking-tight">{cat.title}</h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    {cat.topics.length} topics · {stat.conceptPct}% read
                  </p>
                  {cat.expanded && (
                    <span className="inline-flex items-center gap-1 mt-2 chip bg-aws-orange/10 text-aws-orange border border-aws-orange/30 text-[10px] font-bold">
                      <Sparkles size={9} /> Expanded for you
                    </span>
                  )}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </section>

      {/* bookmarks + recents */}
      {(bookmarkedTopics.length > 0 || recentTopics.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {bookmarkedTopics.length > 0 && (
            <section className="surface rounded-2xl p-5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3 flex items-center gap-2">
                <Library size={12} /> Bookmarked
              </h3>
              <ul className="space-y-1">
                {bookmarkedTopics.slice(0, 6).map(({ category, topic }) => (
                  <li key={topic.id}>
                    <Link to={`/learning/${category.id}/${topic.id}`}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--card-2)] text-sm">
                      <span className="text-base">{category.icon}</span>
                      <span className="flex-1 truncate font-semibold">{topic.title}</span>
                      <span className="text-[10px] text-muted">{category.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {recentTopics.length > 0 && (
            <section className="surface rounded-2xl p-5">
              <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3 flex items-center gap-2">
                <GraduationCap size={12} /> Recently studied
              </h3>
              <ul className="space-y-1">
                {recentTopics.slice(0, 6).map(({ category, topic }) => (
                  <li key={topic.id}>
                    <Link to={`/learning/${category.id}/${topic.id}`}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--card-2)] text-sm">
                      <span className="text-base">{category.icon}</span>
                      <span className="flex-1 truncate font-semibold">{topic.title}</span>
                      <span className="text-[10px] text-muted">{category.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <WhitepaperLibrary />
    </div>
  );
}
