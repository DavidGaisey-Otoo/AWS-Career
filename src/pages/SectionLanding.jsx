import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { SECTIONS } from '../lib/navSections.js';

/**
 * One generic landing page per top-level section.
 * Renders the section's children as a card grid.
 *
 * Usage in App.jsx:
 *   <Route path="/learn"     element={<SectionLanding sectionId="learn" />} />
 *   <Route path="/exam-hub"  element={<SectionLanding sectionId="exam" />} />
 *   <Route path="/build"     element={<SectionLanding sectionId="build" />} />
 *   <Route path="/earn"      element={<SectionLanding sectionId="earn" />} />
 */
export default function SectionLanding({ sectionId }) {
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section) {
    return <div className="surface rounded-2xl p-8 text-center text-muted">Unknown section.</div>;
  }
  const Icon = section.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={section.label}
        title={section.blurb}
        subtitle={`Pick a sub-section to continue. ${section.children.length} tools live in here.`}
        icon={Icon}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {section.children.map((c, i) => {
          const CIcon = c.icon;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
            >
              <Link
                to={c.path}
                className="group surface rounded-2xl p-5 h-full flex flex-col gap-3 hover:border-aws-orange/40 transition focus-ring relative overflow-hidden"
              >
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl bg-aws-orange/10 group-hover:bg-aws-orange/20 transition" />
                <div className="relative flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl grid place-items-center bg-gradient-aws text-ink-950 shadow-glow-orange">
                    <CIcon size={18} strokeWidth={2.5} />
                  </div>
                  <ChevronRight size={16} className="text-muted group-hover:text-aws-orange transition" />
                </div>
                <div className="relative">
                  <h3 className="text-base font-extrabold tracking-tight">{c.label}</h3>
                  <p className="text-[12px] text-muted mt-1 leading-relaxed">
                    Open <span className="font-mono text-aws-orange">{c.path}</span>
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </section>
    </div>
  );
}
