import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { KEYWORD_GROUPS } from '../data/saaStudyTools.js';

export default function ExamStrategy() {
  return <div className="space-y-6">
    <PageHeader eyebrow="Study · Exam strategy" title="Read the requirement, not just the services" subtitle="Translate examiner wording into architecture constraints before judging the options." icon={KeyRound} />
    <div className="rounded-2xl border border-aws-orange/30 bg-aws-orange/5 p-5 text-sm leading-relaxed">
      <strong>Three-pass method:</strong> identify the workload, underline the hard constraints, then eliminate any answer that violates even one constraint. “BEST” means the option that satisfies the complete requirement—not the most powerful architecture.
    </div>
    <div className="grid gap-4 lg:grid-cols-2">{KEYWORD_GROUPS.map(g => <section key={g.title} className="surface rounded-2xl p-5"><h2 className="font-extrabold">{g.title}</h2><div className="mt-3 divide-y divide-[var(--border)]">{g.items.map(([k,v]) => <div key={k} className="py-3"><div className="text-sm font-extrabold text-aws-orange">{k}</div><p className="mt-1 text-sm text-muted leading-relaxed">{v}</p></div>)}</div></section>)}</div>
    <Link to="/exam/saa-c03/run/review" className="btn btn-primary">Apply this in Review mode</Link>
  </div>;
}
