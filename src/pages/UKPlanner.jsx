import { motion } from 'framer-motion';
import {
  AlertCircle, Banknote, Briefcase, Calendar, Check, CheckCircle2, ChevronRight,
  ClipboardCopy, CreditCard, ExternalLink, FileText, Globe2, HelpCircle, Info,
  Landmark, MessageSquarePlus, Plane, PoundSterling, ShieldCheck, Sparkles,
  TrendingUp, Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { ProgressRing } from '../components/roadmap/ProgressRing.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useFreelance } from '../context/FreelanceContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useUK } from '../context/UKContext.jsx';
import {
  APPLICATION_DOC_CHECKLIST, APPLICATION_STATUSES, FREELANCE_UK_GUIDE,
  FX_GHS_GBP_TIPS, IR35_DECISION, PAYMENT_PROVIDERS, STAGE_DOCS,
  UK_CITIES, UK_STUDENT_BANKS, UNI_COMMS_TEMPLATE, VISA_CHECKLIST, WORK_RIGHTS,
} from '../data/ukPlanner.js';
import { cn, formatDate } from '../lib/utils.js';

const TABS = [
  { id: 'overview',    label: 'Overview',          icon: Plane },
  { id: 'application', label: 'Application',       icon: FileText },
  { id: 'visa',        label: 'Visa checklist',    icon: ShieldCheck },
  { id: 'cost',        label: 'Cost of living',    icon: PoundSterling },
  { id: 'rights',      label: 'Work rights',       icon: Globe2 },
  { id: 'freelance',   label: 'Freelance in UK',   icon: Briefcase },
  { id: 'banking',     label: 'Banking & payments',icon: Wallet },
];

export default function UKPlanner() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="UK transition planner"
        title="From Ghana to the UK, one step at a time."
        subtitle="University application, visa, cost of living, student work rights, freelancing legally. All in one tracker."
        icon={Plane}
      />

      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-[var(--card-2)] p-1 border border-token">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition focus-ring',
                      tab === t.id ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
                                   : 'text-muted hover:text-current'
                    )}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
        {tab === 'overview'    && <Overview onJump={setTab} />}
        {tab === 'application' && <Application />}
        {tab === 'visa'        && <Visa />}
        {tab === 'cost'        && <CostOfLiving />}
        {tab === 'rights'      && <WorkRights />}
        {tab === 'freelance'   && <FreelanceUK />}
        {tab === 'banking'     && <Banking />}
      </motion.div>
    </div>
  );
}

// ============================ OVERVIEW ============================

function Overview({ onJump }) {
  const { state } = useUK();
  const appPct = (() => {
    const order = APPLICATION_STATUSES.findIndex((s) => s.id === state.application.status);
    return Math.round(((order + 1) / APPLICATION_STATUSES.length) * 100);
  })();
  const visaTotal = VISA_CHECKLIST.length;
  const visaDone = Object.keys(state.visaChecklist || {}).filter((k) => state.visaChecklist[k]).length;
  const visaPct = visaTotal ? Math.round((visaDone / visaTotal) * 100) : 0;
  const docsTotal = APPLICATION_DOC_CHECKLIST.length;
  const docsDone = Object.keys(state.application.documents || {}).filter((k) => state.application.documents[k]).length;
  const docsPct = docsTotal ? Math.round((docsDone / docsTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <section className="surface rounded-3xl p-6 gradient-border relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative grid gap-5 lg:grid-cols-3">
          <Ring percent={appPct} label="Application"     onClick={() => onJump('application')} />
          <Ring percent={docsPct} label="Documents"      onClick={() => onJump('application')} />
          <Ring percent={visaPct} label="Visa checklist" onClick={() => onJump('visa')} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <NextStepCard tab="application" title="Update application status" body="Track where you are in the admissions cycle." onJump={onJump} />
        <NextStepCard tab="cost"        title="Estimate UK cost of living" body="Pick a city and see how much you need per month." onJump={onJump} />
        <NextStepCard tab="freelance"   title="Plan freelance in UK"        body="HMRC, IR35, banking and Self Assessment in plain English." onJump={onJump} />
      </section>
    </div>
  );
}

function Ring({ percent, label, onClick }) {
  return (
    <button onClick={onClick} className="text-center group focus-ring rounded-2xl p-2">
      <div className="flex justify-center">
        <ProgressRing percent={percent} size={140} stroke={10} accent="rainbow">
          <div className="text-2xl font-black tabular-nums text-gradient">{percent}%</div>
        </ProgressRing>
      </div>
      <div className="mt-2 text-sm font-extrabold tracking-tight group-hover:text-aws-orange transition">{label}</div>
    </button>
  );
}

function NextStepCard({ tab, title, body, onJump }) {
  return (
    <button onClick={() => onJump(tab)}
            className="surface rounded-2xl p-4 text-left hover:border-aws-orange/40 transition focus-ring">
      <h4 className="text-sm font-extrabold tracking-tight">{title}</h4>
      <p className="text-xs text-muted mt-1">{body}</p>
    </button>
  );
}

// ============================ APPLICATION ============================

function Application() {
  const { state, updateApplication, toggleDoc, addComm, setStageDate, setStageNote } = useUK();
  const toast = useToast();
  const [commDraft, setCommDraft] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [openStage, setOpenStage] = useState(null);

  const app = state.application;
  const currentStageIdx = APPLICATION_STATUSES.findIndex((s) => s.id === app.status);

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Application details</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <In label="University" value={app.universityName} onChange={(v) => updateApplication({ universityName: v })} wide />
          <In label="Programme" value={app.programme} onChange={(v) => updateApplication({ programme: v })} wide />
          <In label="Reference" value={app.reference} onChange={(v) => updateApplication({ reference: v })} />
          <In label="Application fee (GBP)" type="number" value={app.applicationFeeGBP || 0}
              onChange={(v) => updateApplication({ applicationFeeGBP: Number(v) || 0 })} />
          <In label="Submitted on" type="date" value={(app.submittedOn || '').slice(0, 10)}
              onChange={(v) => updateApplication({ submittedOn: v ? new Date(v).toISOString() : null })} />
          <In label="Course start date" type="date" value={(app.startDate || '').slice(0, 10)}
              onChange={(v) => updateApplication({ startDate: v ? new Date(v).toISOString() : null })} />
        </div>
        <div className="mt-3">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Status</span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {APPLICATION_STATUSES.map((s) => (
              <button key={s.id} onClick={() => updateApplication({ status: s.id })}
                      className={cn('chip border text-[11px] font-bold transition',
                                    app.status === s.id ? s.color : 'border-token bg-[var(--card-2)] text-muted hover:text-current')}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual stage tracker — Stage 13 */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Journey progress</h3>
          <span className="text-[10px] text-muted">{Math.max(0, currentStageIdx)} of {APPLICATION_STATUSES.length - 1} stages complete</span>
        </div>
        {/* Bar */}
        <div className="relative h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-gradient-aws transition-all"
               style={{ width: `${Math.max(0, (currentStageIdx / (APPLICATION_STATUSES.length - 1)) * 100)}%` }} />
        </div>
        {/* Stages grid */}
        <ol className="grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {APPLICATION_STATUSES.map((s, i) => {
            const done = i <= currentStageIdx;
            const isCurrent = i === currentStageIdx;
            return (
              <li key={s.id}>
                <button
                  onClick={() => setOpenStage(openStage === s.id ? null : s.id)}
                  className={cn(
                    'w-full text-left rounded-lg border p-2 transition focus-ring',
                    isCurrent ? 'border-aws-orange/60 bg-aws-orange/10'
                              : done ? 'border-success/40 bg-success/10'
                                     : 'border-token bg-[var(--card-2)]/30',
                  )}
                >
                  <div className={cn(
                    'text-[9px] font-extrabold uppercase tracking-widest',
                    isCurrent ? 'text-aws-orange' : done ? 'text-success' : 'text-muted',
                  )}>Stage {i + 1}</div>
                  <div className="text-[11px] font-extrabold mt-0.5 truncate">{s.label}</div>
                  {app.stageDates?.[s.id] && (
                    <div className="text-[9px] text-muted mt-0.5">{new Date(app.stageDates[s.id]).toLocaleDateString()}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Stage detail */}
        {openStage && (
          <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm font-extrabold">
                {APPLICATION_STATUSES.find((s) => s.id === openStage)?.label}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Key date</label>
                <input
                  type="date"
                  value={(app.stageDates?.[openStage] || '').slice(0, 10)}
                  onChange={(e) => setStageDate(openStage, e.target.value ? new Date(e.target.value).toISOString() : null)}
                  className="bg-[var(--card)] border border-token rounded-md px-2 py-1 text-xs focus-ring focus:border-aws-orange"
                />
              </div>
            </div>

            {(STAGE_DOCS[openStage] || []).length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-muted mb-1">Required for this stage</div>
                <ul className="space-y-0.5 text-[11px]">
                  {STAGE_DOCS[openStage].map((d) => {
                    const checked = !!app.documents?.[d];
                    return (
                      <li key={d}>
                        <button onClick={() => toggleDoc(d)} className="flex items-start gap-2 hover:text-current w-full text-left">
                          <span className={cn(
                            'mt-0.5 w-3.5 h-3.5 rounded grid place-items-center flex-shrink-0 border',
                            checked ? 'bg-success text-white border-success' : 'border-token bg-[var(--card)]',
                          )}>{checked && <Check size={8} />}</span>
                          <span className={checked ? 'line-through text-muted' : ''}>{d}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase font-extrabold tracking-widest text-muted">Notes</label>
              <textarea
                value={app.stageNotes?.[openStage] || ''}
                onChange={(e) => setStageNote(openStage, e.target.value)}
                rows={2}
                className="mt-1 w-full bg-[var(--card)] border border-token rounded-md px-2 py-1.5 text-xs focus-ring focus:border-aws-orange resize-y"
                placeholder="Anything to remember about this stage…"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => { updateApplication({ status: openStage }); toast.success('Status updated'); }}
                className="btn btn-ghost !text-[11px]"
              >Set as current status</button>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Document checklist</h3>
          <ul className="space-y-1.5">
            {APPLICATION_DOC_CHECKLIST.map((doc) => {
              const done = !!app.documents?.[doc];
              return (
                <li key={doc}>
                  <button onClick={() => toggleDoc(doc)}
                          className="flex items-start gap-2 text-xs w-full text-left hover:text-current">
                    <span className={cn('mt-0.5 w-4 h-4 rounded grid place-items-center flex-shrink-0 border',
                                        done ? 'bg-success text-white border-success' : 'border-token bg-[var(--card-2)]')}>
                      {done && <Check size={10} />}
                    </span>
                    <span className={done ? 'line-through text-muted' : ''}>{doc}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="surface rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest">Communication log</h3>
            <button onClick={() => setShowTemplate(true)} className="btn btn-ghost !text-[11px] !py-1">
              <FileText size={11} /> Templates
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <input value={commDraft} onChange={(e) => setCommDraft(e.target.value)}
                   placeholder="Quick note — e.g. 'Replied to admissions'"
                   className="flex-1 bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-xs focus-ring focus:border-aws-orange" />
            <button onClick={() => {
              if (!commDraft.trim()) return;
              addComm(commDraft.trim()); setCommDraft(''); toast.success('Logged');
            }} className="btn btn-primary !text-xs"><MessageSquarePlus size={12} /> Log</button>
          </div>
          {(app.comms || []).length === 0 ? (
            <p className="text-xs text-muted italic">No communications logged yet.</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {app.comms.map((c) => (
                <li key={c.id} className="rounded-lg border border-token bg-[var(--card-2)]/40 p-2 text-xs">
                  <div className="text-[10px] text-muted">{formatDate(c.at)} · {c.channel}</div>
                  <div className="mt-0.5 whitespace-pre-wrap">{c.note}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showTemplate && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setShowTemplate(false)} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="relative surface rounded-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto p-5 gradient-border">
            <h3 className="text-lg font-extrabold tracking-tight mb-3">University comms templates</h3>
            {UNI_COMMS_TEMPLATE.map((t) => (
              <div key={t.id} className="mb-3 rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">{t.label}</h4>
                  <button onClick={() => {
                    navigator.clipboard.writeText(t.body).then(() => toast.success('Copied'));
                  }} className="text-muted hover:text-aws-orange"><ClipboardCopy size={12} /></button>
                </div>
                <pre className="text-[11px] whitespace-pre-wrap leading-relaxed">{t.body}</pre>
              </div>
            ))}
            <button onClick={() => setShowTemplate(false)} className="btn btn-primary w-full">Done</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ============================ VISA ============================

function Visa() {
  const { state, toggleVisaStep } = useUK();
  const groups = useMemo(() => {
    const out = { pre: [], apply: [], post: [] };
    for (const s of VISA_CHECKLIST) out[s.group].push(s);
    return out;
  }, []);

  const total = VISA_CHECKLIST.length;
  const done = Object.keys(state.visaChecklist || {}).filter((k) => state.visaChecklist[k]).length;

  return (
    <div className="space-y-4">
      <section className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center gap-4">
          <ShieldCheck size={28} className="text-aws-orange" />
          <div className="flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">Student visa progress</h2>
            <p className="text-xs text-muted mt-1">
              {done} / {total} steps done. UKVI typically decides student visas in 3 weeks.
            </p>
            <div className="mt-3 h-2 rounded-full bg-[var(--card-2)] overflow-hidden">
              <div className="h-full bg-gradient-aws transition-all"
                   style={{ width: `${(done / total) * 100}%` }} />
            </div>
          </div>
          <a href="https://www.gov.uk/student-visa" target="_blank" rel="noreferrer"
             className="btn btn-ghost !text-xs">
            <ExternalLink size={12} /> gov.uk
          </a>
        </div>
      </section>

      {[['pre', 'Before you apply'], ['apply', 'Apply'], ['post', 'After approval']].map(([k, label]) => (
        <div key={k} className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">{label}</h3>
          <ul className="space-y-1.5">
            {groups[k].map((s) => {
              const done = !!state.visaChecklist?.[s.id];
              return (
                <li key={s.id}>
                  <button onClick={() => toggleVisaStep(s.id)}
                          className="flex items-start gap-2 text-sm w-full text-left hover:text-current">
                    <span className={cn('mt-0.5 w-5 h-5 rounded grid place-items-center flex-shrink-0 border',
                                        done ? 'bg-success text-white border-success' : 'border-token bg-[var(--card-2)]')}>
                      {done && <Check size={11} />}
                    </span>
                    <span className={done ? 'line-through text-muted' : ''}>{s.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================ COST OF LIVING ============================

function CostOfLiving() {
  const { state, setSelectedCity, setFreelanceMonthlyGBP } = useUK();
  const { earningsStats, convertFromUSD } = useFreelance();
  const city = UK_CITIES.find((c) => c.id === state.selectedCity) || UK_CITIES[0];

  const total = Object.values(city.costs).reduce((s, n) => s + n, 0);

  // Convert current monthly USD earnings to GBP for context
  const monthlyEarningsGBP = Math.round(convertFromUSD(earningsStats.thisMonthUSD, 'GBP'));

  // Student loan assumption (set conservatively — user can adjust freelance to fit)
  const studentLoanGBP = 0;   // placeholder — students typically don't have UK loans as international
  const needFromFreelance = Math.max(0, total - studentLoanGBP);
  const onTrack = (state.freelanceMonthlyGBP || 0) >= needFromFreelance;

  const COLORS = ['#FF9900', '#00D4FF', '#7C3AED', '#00C853', '#FFD600', '#FF4444', '#94A3B8', '#34D399'];

  return (
    <div className="space-y-4">
      <div className="surface rounded-2xl p-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-2">Pick a city</h3>
        <div className="flex flex-wrap gap-1.5">
          {UK_CITIES.map((c) => (
            <button key={c.id} onClick={() => setSelectedCity(c.id)}
                    className={cn('chip border text-xs font-bold transition',
                                  state.selectedCity === c.id ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                                                              : 'border-token bg-[var(--card-2)] text-muted hover:text-current')}>
              {c.name}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-2">{city.blurb}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="surface rounded-2xl p-5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Monthly expenses — {city.name}</h3>
          <ul className="space-y-1.5">
            {Object.entries(city.costs).map(([k, v], i) => (
              <li key={k} className="flex items-center gap-3 text-xs">
                <span className="w-2 h-2 rounded" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="tabular-nums font-bold">£{v.toLocaleString()}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-token flex items-center justify-between">
            <span className="text-sm font-extrabold">Total monthly</span>
            <span className="text-xl font-black tabular-nums text-aws-orange">£{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="surface rounded-2xl p-5 gradient-border relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-56 h-56 bg-aws-orange/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3">Freelance income needed</h3>
            <p className="text-xs text-muted mb-3">
              International students typically don\'t qualify for UK loans, so freelance income covers most living costs.
            </p>
            <div className="text-3xl font-black tabular-nums text-aws-orange">£{needFromFreelance.toLocaleString()}<span className="text-sm font-bold text-muted ml-2">/ month</span></div>
            <p className="text-[11px] text-muted">To cover {city.name} living costs after any tuition arrangements.</p>

            <div className="mt-4">
              <label className="text-[10px] uppercase tracking-widest font-extrabold text-muted">Your expected freelance income (£/mo)</label>
              <input type="number" value={state.freelanceMonthlyGBP || 0}
                     onChange={(e) => setFreelanceMonthlyGBP(e.target.value)}
                     className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-base font-extrabold tabular-nums focus-ring focus:border-aws-orange" />
            </div>

            <div className={cn('mt-3 rounded-lg border p-3 text-sm',
              onTrack ? 'border-success/30 bg-success/[0.04] text-success'
                      : 'border-warning/30 bg-warning/[0.04] text-warning')}>
              <strong>{onTrack ? '✓ On track.' : 'Gap detected.'}</strong>{' '}
              {onTrack
                ? `Your £${(state.freelanceMonthlyGBP || 0).toLocaleString()}/mo target covers it with £${((state.freelanceMonthlyGBP - needFromFreelance)).toLocaleString()}/mo headroom.`
                : `Lift target by £${(needFromFreelance - (state.freelanceMonthlyGBP || 0)).toLocaleString()}/mo or pick a cheaper city.`}
            </div>

            {earningsStats.thisMonthUSD > 0 && (
              <p className="mt-3 text-[11px] text-muted">
                Your current monthly earnings translate to about{' '}
                <strong className="text-current">£{monthlyEarningsGBP.toLocaleString()}/mo</strong>.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================ WORK RIGHTS ============================

function WorkRights() {
  return (
    <div className="space-y-3">
      <div className="surface rounded-2xl p-4">
        <div className="flex items-start gap-2 text-xs text-muted">
          <Info size={14} className="text-aws-orange flex-shrink-0 mt-0.5" />
          <span>
            General guidance based on standard Student-visa conditions. Always confirm with your university's international office + UKVI before relying on any item.
          </span>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {WORK_RIGHTS.map((r) => (
          <li key={r.id} className="surface rounded-2xl p-4">
            <h4 className="text-sm font-extrabold tracking-tight">{r.title}</h4>
            <p className="text-xs text-muted leading-relaxed mt-1.5">{r.body}</p>
          </li>
        ))}
      </ul>
      <IR35DecisionTree />
    </div>
  );
}

function IR35DecisionTree() {
  const [path, setPath] = useState([0]);
  const [verdict, setVerdict] = useState(null);
  const branchIdx = path[path.length - 1];
  const branch = IR35_DECISION.branches[branchIdx];

  const pick = (answer) => {
    if (answer.verdict) {
      setVerdict(answer.verdict);
    } else if (answer.next != null) {
      setPath((p) => [...p, answer.next]);
    }
  };
  const reset = () => { setPath([0]); setVerdict(null); };

  return (
    <div className="surface rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-extrabold flex items-center gap-2">
        <HelpCircle size={14} className="text-aws-orange" /> {IR35_DECISION.title}
      </h3>
      <p className="text-[12px] text-muted">{IR35_DECISION.intro}</p>

      {verdict ? (
        <div className={cn(
          'rounded-lg border p-3 text-sm font-bold',
          verdict.includes('does NOT')
            ? 'border-success/40 bg-success/10 text-success'
            : verdict.includes('OUTSIDE')
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-warning/40 bg-warning/10 text-warning',
        )}>
          {verdict}
        </div>
      ) : (
        <div className="rounded-lg border border-token bg-[var(--card-2)]/30 p-3 space-y-2">
          <div className="text-[12px] font-bold">{branch.q}</div>
          <div className="space-y-1">
            {branch.answers.map((a, i) => (
              <button
                key={i}
                onClick={() => pick(a)}
                className="w-full text-left rounded-md border border-token bg-[var(--card)] hover:border-aws-orange/40 px-2.5 py-1.5 text-[12px] font-bold transition"
              >
                <ChevronRight size={11} className="inline text-aws-orange" /> {a.a}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-right">
        <button onClick={reset} className="text-[10px] font-bold text-aws-orange hover:underline">Reset</button>
      </div>
    </div>
  );
}

// ============================ FREELANCE IN UK ============================

function FreelanceUK() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {FREELANCE_UK_GUIDE.map((r) => (
        <li key={r.id} className="surface rounded-2xl p-4">
          <h4 className="text-sm font-extrabold tracking-tight">{r.title}</h4>
          <p className="text-xs text-muted leading-relaxed mt-1.5">{r.body}</p>
        </li>
      ))}
    </ul>
  );
}

// ============================ BANKING (Stage 13) ============================

function Banking() {
  return (
    <div className="space-y-4">
      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Banknote size={12} className="text-aws-orange" /> Payment providers — receiving international income
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAYMENT_PROVIDERS.map((p) => (
            <div key={p.id} className="rounded-2xl border border-token bg-[var(--card-2)]/30 p-4">
              <h4 className="text-sm font-extrabold tracking-tight">{p.name}</h4>
              <p className="text-[11px] text-muted mt-1">{p.blurb}</p>
              <ol className="mt-3 space-y-1 text-[12px] list-decimal list-inside leading-snug">
                {p.steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2">
          <Landmark size={12} className="text-aws-orange" /> UK student bank account options
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {UK_STUDENT_BANKS.map((b) => (
            <div key={b.id} className="rounded-2xl border border-token bg-[var(--card-2)]/30 p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-extrabold tracking-tight">{b.name}</h4>
                <span className={cn(
                  'chip border text-[10px] font-bold',
                  b.type === 'Digital'
                    ? 'border-aws-orange/40 bg-aws-orange/10 text-aws-orange'
                    : 'border-token bg-[var(--card)] text-muted',
                )}>{b.type}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-success mb-0.5">Pros</div>
                  <ul className="space-y-0.5 text-[11px]">
                    {b.pros.map((p, i) => <li key={i}>✓ {p}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-extrabold uppercase text-warning mb-0.5">Cons</div>
                  <ul className="space-y-0.5 text-[11px] text-muted">
                    {b.cons.map((c, i) => <li key={i}>✗ {c}</li>)}
                  </ul>
                </div>
              </div>
              <p className="text-[11px] text-muted mt-2 italic">{b.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2">
          <CreditCard size={12} className="text-aws-orange" /> Receiving international payments legally
        </h3>
        <ul className="space-y-1.5 text-[12px]">
          <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" /> Declare all freelance income in your annual Self Assessment.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" /> Use bank-of-record statements (Wise, Payoneer) as evidence — keep PDFs.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" /> Convert to GBP at the date of receipt for tax — never the date of withdrawal.</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={11} className="text-success shrink-0 mt-0.5" /> Anti-money-laundering rules: large inbound transfers (£10k+) may trigger a check — keep the source documented.</li>
        </ul>
      </section>

      <section className="surface rounded-2xl p-5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-widest mb-3 flex items-center gap-2">
          <TrendingUp size={12} className="text-aws-orange" /> GHS → GBP transfer tips
        </h3>
        <ul className="space-y-1.5 text-[12px]">
          {FX_GHS_GBP_TIPS.map((t, i) => (
            <li key={i} className="flex items-start gap-2"><ChevronRight size={11} className="text-aws-orange shrink-0 mt-0.5" /> {t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ============================ shared ============================

function In({ label, value, onChange, type = 'text', wide }) {
  return (
    <label className={cn('block', wide && 'col-span-2')}>
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{label}</span>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)}
             className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-lg px-3 py-2 text-sm font-semibold focus-ring focus:border-aws-orange" />
    </label>
  );
}
