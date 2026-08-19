import { ArrowRight, Bookmark, Brain, CheckCircle2, Clock3, GraduationCap, RotateCcw, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useExam } from '../context/ExamContext.jsx';
import { getCert } from '../data/certs.js';
import { readinessSignal, servicePerformance } from '../data/examModes.js';

const CERT_ID = 'saa-c03';
export default function SAAHome() {
  const { getCertState, certStats } = useExam();
  const cert = getCert(CERT_ID); const state = getCertState(CERT_ID);
  const stats = certStats.find(s => s.id === CERT_ID); const attempts = state.attempts || [];
  const mocks = attempts.filter(a => ['standard','timed','final'].includes(a.mode));
  const recentMock = mocks.at(-1); const perf = servicePerformance(state, cert).filter(x => x.attempts >= 2);
  const weak = [...perf].sort((a,b)=>(a.pct??101)-(b.pct??101)).slice(0,3);
  const strong = perf.filter(x=>x.attempts>=3).sort((a,b)=>b.pct-a.pct).slice(0,3);
  const readiness = readinessSignal(state, cert);
  const totalCorrect = attempts.reduce((n,a)=>n+a.correct,0);
  const bookmarkCount = Object.keys(state.bookmarks || {}).length;
  return <div className="space-y-6">
    <section className="surface rounded-3xl p-6 sm:p-8 border border-aws-orange/30">
      <div className="flex flex-wrap items-start gap-5"><div className="flex-1 min-w-[240px]"><div className="text-[11px] font-extrabold uppercase tracking-[.2em] text-aws-orange">AWS Certified Solutions Architect — Associate</div><h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">SAA-C03 Exam Readiness</h1><p className="mt-2 max-w-2xl text-sm text-muted leading-relaxed">One focused platform for architecture study, deliberate practice, realistic mocks, and evidence-based revision.</p></div><div className="rounded-2xl bg-[var(--card-2)] border border-token p-5 min-w-[210px]"><div className="text-4xl font-black text-aws-orange">{readiness.pct}%</div><div className="text-xs font-bold mt-1">{readiness.pct >= 80 ? 'Strong' : readiness.pct >= 60 ? 'Needs review' : 'Building readiness'}</div><p className="text-[11px] text-muted mt-2 max-w-[230px]">{readiness.reason} This is guidance, not a pass guarantee.</p></div></div>
      <div className="mt-6 flex flex-wrap gap-2"><Link to="/exam/saa-c03/run/review" className="btn btn-primary">Continue studying <ArrowRight size={14}/></Link><Link to="/exam/saa-c03/run/standard" className="btn btn-ghost"><GraduationCap size={14}/> Mock exam</Link><Link to="/saa-review" className="btn btn-ghost"><RotateCcw size={14}/> Review mistakes</Link></div>
    </section>
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Metric icon={Target} label="Overall accuracy" value={stats?.totalQuestionsAnswered ? `${stats.accuracy}%` : '—'} /><Metric icon={Clock3} label="Questions attempted" value={stats?.totalQuestionsAnswered || 0}/><Metric icon={CheckCircle2} label="Questions correct" value={totalCorrect}/><Metric icon={Bookmark} label="Bookmarked" value={bookmarkCount}/></section>
    <section className="grid gap-4 lg:grid-cols-3"><Panel title="Weak topics" empty="Complete practice questions to identify weak topics." items={weak.map(x=>`${x.label} · ${x.pct}%`)} tone="danger"/><Panel title="Strong topics" empty="Strength needs at least three varied attempts." items={strong.map(x=>`${x.label} · ${x.pct}%`)} tone="success"/><div className="surface rounded-2xl p-5"><h2 className="font-extrabold">Mock exam scores</h2>{mocks.length ? <div className="mt-3 space-y-2 text-sm"><p>Recent <strong>{recentMock.scaledScore}/1000</strong></p><p>Best <strong>{Math.max(...mocks.map(x=>x.scaledScore))}/1000</strong></p><p className="text-muted">{mocks.length} completed mock{mocks.length===1?'':'s'}</p></div>:<p className="mt-3 text-sm text-muted">No mock exams completed yet.</p>}</div></section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Action to="/saa-roadmap" icon={Target} title="Study roadmap" sub="Plan domain coverage"/><Action to="/service-comparisons" icon={Brain} title="Service battles" sub="Resolve common traps"/><Action to="/exam-strategy" icon={Brain} title="Keyword trainer" sub="Decode exam wording"/><Action to="/analytics" icon={Target} title="Progress analytics" sub="Decide what to study next"/></section>
  </div>;
}
function Metric({icon:Icon,label,value}){return <div className="surface rounded-2xl p-4"><Icon size={16} className="text-aws-orange"/><div className="mt-3 text-2xl font-black tabular-nums">{value}</div><div className="text-[11px] text-muted font-bold">{label}</div></div>}
function Panel({title,items,empty,tone}){return <div className="surface rounded-2xl p-5"><h2 className="font-extrabold">{title}</h2>{items.length?<ul className="mt-3 space-y-2">{items.map(x=><li key={x} className={`text-sm font-bold text-${tone}`}>{x}</li>)}</ul>:<p className="mt-3 text-sm text-muted">{empty}</p>}</div>}
function Action({to,icon:Icon,title,sub}){return <Link to={to} className="surface rounded-2xl p-4 hover:border-aws-orange/50 focus-ring"><Icon size={18} className="text-aws-orange"/><h3 className="mt-3 font-extrabold">{title}</h3><p className="text-xs text-muted mt-1">{sub}</p></Link>}
