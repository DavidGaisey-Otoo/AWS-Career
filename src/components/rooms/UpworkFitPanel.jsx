import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleHelp, Coins, PenLine, ShieldAlert, XCircle } from 'lucide-react';
import { useMyFacts } from '../../hooks/useMyFacts.js';
import { useLocalStorage } from '../../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../../lib/constants.js';
import { assessUpworkFit, connectsCost, verdictLine } from '../../lib/upworkFit.js';
import { DAILY_KEY_SUFFIX, updateToday } from '../../lib/dailyJobCheck.js';
import { cn } from '../../lib/utils.js';

const VERDICT = {
  GO: { tone: 'text-success', Icon: CheckCircle2, label: 'GO' },
  MAYBE: { tone: 'text-warning', Icon: CircleHelp, label: 'MAYBE' },
  SKIP: { tone: 'text-danger', Icon: XCircle, label: 'SKIP' },
};

function Signal({ label, signal }) {
  return (
    <div className="rounded-xl border border-token px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wider text-muted">{label}</div>
      <div className={cn('text-[12.5px] font-semibold', !signal.known && 'text-muted')}>
        {signal.known ? signal.label : 'Unknown (not in the paste)'}
      </div>
    </div>
  );
}

/**
 * GO / MAYBE / SKIP for a pasted Upwork job, at your level. Reads the
 * client panel too, so paste the whole job page, not just the description.
 */
export function UpworkFitPanel({ text }) {
  const { facts } = useMyFacts();
  const [, setLog] = useLocalStorage(`${STORAGE_KEY}${DAILY_KEY_SUFFIX}`, []);
  const [manualConnects, setManualConnects] = useState('');
  const [logged, setLogged] = useState(false);

  const fit = useMemo(() => assessUpworkFit(text, facts), [text, facts]);
  const connects = useMemo(() => {
    if (!fit) return null;
    const n = Number(manualConnects);
    if (fit.client.connects.known || !(n > 0)) return fit.connects;
    return connectsCost({ connects: { known: true, value: n }, budget: fit.budget, facts });
  }, [fit, manualConnects, facts]);

  if (!fit) return null;
  const v = VERDICT[fit.verdict];

  const logIt = () => {
    setLog((log) => updateToday(log, { checked: 1, go: fit.verdict === 'GO' ? 1 : 0 }));
    setLogged(true);
  };

  return (
    <section className="surface rounded-2xl p-5 space-y-4" aria-label="Upwork fit">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10.5px] uppercase tracking-widest text-muted font-bold">For you, at your level</div>
          <div className={cn('flex items-center gap-2 text-2xl font-black', v.tone)}>
            <v.Icon size={22} /> {v.label}
            <span className="text-[13px] font-bold text-muted tabular-nums">score {fit.score}/100</span>
          </div>
          <p className="text-[13px] mt-1">{verdictLine(fit)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {fit.verdict !== 'SKIP' && (
            <Link to={`/jobs/proposals?view=write&prefill=${encodeURIComponent(text.slice(0, 4000))}`} className="btn btn-primary !text-[12px] inline-flex items-center gap-1.5">
              <PenLine size={13} /> Write the proposal
            </Link>
          )}
          <button onClick={logIt} disabled={logged} className="btn btn-ghost !text-[12px] disabled:opacity-50">
            {logged ? 'Logged for today' : 'Log as checked today'}
          </button>
        </div>
      </div>

      {fit.skips.length > 0 && (
        <div>
          <div className="text-[12px] font-bold text-danger mb-1">Why skip</div>
          <ul className="text-[12.5px] space-y-0.5">{fit.skips.map((s) => <li key={s.id}>• {s.label}</li>)}</ul>
        </div>
      )}
      {fit.good.length > 0 && (
        <div>
          <div className="text-[12px] font-bold text-success mb-1">Work on your list</div>
          <ul className="text-[12.5px] space-y-0.5">{fit.good.map((g) => <li key={g.id}>• {g.label}</li>)}</ul>
        </div>
      )}
      {fit.cautions.length > 0 && (
        <div>
          <div className="text-[12px] font-bold text-warning mb-1">Check first</div>
          <ul className="text-[12.5px] space-y-0.5">{fit.cautions.map((c) => <li key={c}>• {c}</li>)}</ul>
        </div>
      )}

      <div>
        <div className="text-[12px] font-bold mb-1.5">The client</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Signal label="Payment" signal={fit.client.payment} />
          <Signal label="Spent" signal={fit.client.spent} />
          <Signal label="Rating" signal={fit.client.rating} />
          <Signal label="Proposals" signal={fit.client.proposals} />
          <Signal label="Hire rate" signal={fit.client.hireRate} />
          <Signal label="Budget" signal={{ known: fit.budget.kind !== 'unknown', label: fit.budget.label }} />
        </div>
      </div>

      <div className="rounded-xl border border-token p-3 space-y-1.5">
        <div className="flex items-center gap-2 text-[12.5px] font-bold"><Coins size={14} className="text-aws-orange" /> Connects</div>
        {connects?.known ? (
          <p className="text-[12.5px]">
            {connects.connects} Connects ≈ <strong>${connects.dollars.toFixed(2)}</strong> (estimate at ${connects.pricePerConnect}/Connect)
            {connects.worth !== 'unknown' && <> · <span className={cn('font-semibold', connects.worth === 'worth it' ? 'text-success' : connects.worth === 'borderline' ? 'text-warning' : 'text-danger')}>{connects.worth}</span></>}
          </p>
        ) : (
          <label className="flex items-center gap-2 text-[12.5px]">
            Connects this job costs:
            <input type="number" min="1" max="99" value={manualConnects} onChange={(e) => setManualConnects(e.target.value)}
                   className="w-20 rounded-lg border border-token bg-[var(--card-2)] px-2 py-1" placeholder="e.g. 8" />
          </label>
        )}
        <ul className="text-[12px] text-muted space-y-0.5">{(connects?.notes || []).map((n) => <li key={n}>• {n}</li>)}</ul>
        {!facts.upwork.idVerified && (
          <p className="text-[12px] text-warning flex items-center gap-1.5"><ShieldAlert size={13} /> Mark ID verification done in <Link to="/grow/facts" className="underline">My facts</Link> once Upwork confirms it.</p>
        )}
      </div>

      <details className="text-[12.5px]">
        <summary className="cursor-pointer font-bold">Before you spend Connects</summary>
        <ul className="mt-1.5 space-y-0.5">{fit.checklist.map((c) => <li key={c}>☐ {c}</li>)}</ul>
      </details>
      <p className="text-[11.5px] text-muted">The app never applies for you. You paste the proposal into Upwork and press Submit yourself.</p>
    </section>
  );
}
