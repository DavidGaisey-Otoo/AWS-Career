import { motion } from 'framer-motion';
import {
  ArrowRight, BarChart3, Brain, GraduationCap, Layers, Mic, Sparkles, Wand2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useAI } from '../context/AIContext.jsx';
import { cn } from '../lib/utils.js';

const SYSTEMS = [
  {
    id: 'assistant',
    to: '/ai/assistant',
    icon: Brain,
    title: 'AI Study Assistant',
    blurb: 'Chat with a senior AWS architect. Explain, quiz, troubleshoot, write IaC.',
    accent: 'from-aws-orange/30 to-aws-orange/5 text-aws-orange',
  },
  {
    id: 'coach',
    to: '/ai/coach',
    icon: Wand2,
    title: 'AI Career Coach',
    blurb: 'Profile + proposal + pricing + interview prep + 6 more freelance tools.',
    accent: 'from-electric/30 to-electric/5 text-electric',
  },
  {
    id: 'study-plan',
    to: '/ai/study-plan',
    icon: GraduationCap,
    title: 'Smart Study Plan',
    blurb: 'Day-by-day calendar to your exam date — weighted by domain percentages.',
    accent: 'from-success/30 to-success/5 text-success',
  },
  {
    id: 'arch',
    to: '/architecture',
    icon: Layers,
    title: 'Architecture Studio',
    blurb: 'Drag AWS services onto a canvas. Get AI review + cost estimate.',
    accent: 'from-warning/30 to-warning/5 text-warning',
  },
  {
    id: 'interview',
    to: '/ai/interview',
    icon: Mic,
    title: 'Mock Interview Simulator',
    blurb: '7 roles × 4 levels. Turn-based interviewer with model answers + scoring.',
    accent: 'from-aws-orange/30 to-aws-orange/5 text-aws-orange',
  },
  {
    id: 'analytics',
    to: '/analytics',
    icon: BarChart3,
    title: 'Personal Learning Analytics',
    blurb: 'Velocity, retention, mastery heatmap, burnout risk, exam predictions.',
    accent: 'from-electric/30 to-electric/5 text-electric',
  },
];

export default function AIHub() {
  const { state } = useAI();
  const chatCount = state.chat.length;
  const diagramCount = state.diagrams.length;
  const interviewCount = state.interviews.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Systems"
        title="Six intelligent systems, one app."
        subtitle="Each tool is dedicated to a real outcome — answering, coaching, scheduling, designing, interviewing, analyzing. Pick one to start."
        icon={Sparkles}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SYSTEMS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={s.to}
                className="group surface rounded-2xl p-5 h-full flex flex-col relative overflow-hidden gradient-border hover:shadow-soft-xl transition focus-ring"
              >
                <div className={cn(
                  'absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl opacity-50 bg-gradient-to-br',
                  s.accent,
                )} />
                <div className="relative">
                  <div className={cn(
                    'w-12 h-12 rounded-2xl grid place-items-center bg-gradient-to-br shadow-glow-orange mb-4',
                    s.accent,
                  )}>
                    <Icon size={22} strokeWidth={2.25} />
                  </div>
                  <h3 className="text-lg font-extrabold tracking-tight">{s.title}</h3>
                  <p className="text-sm text-muted mt-1 leading-relaxed flex-1">{s.blurb}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-aws-orange group-hover:underline">
                    Open <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </section>

      {/* Usage strip */}
      <section className="surface rounded-2xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Strip label="Chat messages" value={chatCount} />
        <Strip label="Saved AI notes" value={state.savedNotes.length} />
        <Strip label="Saved diagrams" value={diagramCount} />
        <Strip label="Mock interviews" value={interviewCount} />
      </section>
    </div>
  );
}

function Strip({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-black tabular-nums text-gradient">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-bold mt-0.5">{label}</div>
    </div>
  );
}
