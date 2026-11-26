import { useState } from 'react';
import { Award, BadgeCheck, BookOpen, Briefcase, Coins, Plus, Trash2 } from 'lucide-react';
import { useMyFacts } from '../../hooks/useMyFacts.js';
import { KNOWN_CERTIFICATES, certificateProblem, skillStatus } from '../../lib/myFacts.js';
import { cn } from '../../lib/utils.js';

const input = 'rounded-lg border border-token bg-[var(--card-2)] px-2 py-1 text-[12.5px]';

function Row({ label, children }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 text-[12.5px]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function OwnAccounts({ ids, onChange }) {
  const [draft, setDraft] = useState('');
  const clean = draft.replace(/\D/g, '');
  return (
    <div className="space-y-1.5">
      {ids.map((id) => (
        <div key={id} className="flex items-center justify-between text-[12.5px]">
          <span className="font-mono">…{String(id).slice(-4)}</span>
          <button aria-label="Remove account" onClick={() => onChange(ids.filter((x) => x !== id))}><Trash2 size={12} /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className={cn(input, 'flex-1')} inputMode="numeric" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your account ID" />
        <button disabled={clean.length !== 12 || ids.includes(clean)} onClick={() => { onChange([...ids, clean]); setDraft(''); }} className="btn btn-ghost !text-[12px] disabled:opacity-40">Add</button>
      </div>
    </div>
  );
}

/**
 * What a proposal may claim. The truth check reads only from here, so
 * this is the one place a new claim becomes allowed, and a certificate
 * needs the month it was earned.
 */
export function MyFacts() {
  const { facts, detail, update, updateUpwork } = useMyFacts();
  const [certId, setCertId] = useState('');
  const [earned, setEarned] = useState('');
  const [expires, setExpires] = useState('');
  const [problem, setProblem] = useState('');
  const today = new Date().toISOString().slice(0, 7);
  const skills = skillStatus(facts);
  const extra = detail.extraCertificates || [];

  const addCert = () => {
    const cert = { id: certId, earned, expires: expires || null };
    const p = certificateProblem(cert, facts);
    setProblem(p || '');
    if (p) return;
    update({ extraCertificates: [...extra, { ...cert, name: KNOWN_CERTIFICATES.find((c) => c.id === certId)?.name }] });
    setCertId(''); setEarned(''); setExpires('');
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4 max-w-5xl">
      <section className="surface rounded-2xl p-4 space-y-2">
        <h2 className="flex items-center gap-2 text-[14px] font-bold"><Award size={15} className="text-aws-orange" /> Certificates you hold</h2>
        <ul className="space-y-1.5">
          {facts.certificates.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span className="flex items-center gap-1.5"><BadgeCheck size={13} className="text-success" /> {c.name}</span>
              <span className={cn('text-muted', c.expires && c.expires < today && 'text-danger')}>
                {c.earned ? `since ${c.earned}` : 'date not recorded'}{c.expires ? ` · expires ${c.expires}` : ''}
                {extra.some((e) => e.id === c.id) && (
                  <button className="ml-2 align-middle" aria-label={`Remove ${c.name}`} onClick={() => update({ extraCertificates: extra.filter((e) => e.id !== c.id) })}><Trash2 size={12} /></button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {facts.studying.length > 0 && (
          <p className="text-[12px] text-muted flex items-center gap-1.5"><BookOpen size={12} /> Studying for: {facts.studying.map((s) => s.name).join(', ')}. Proposals may say "studying for", never "certified".</p>
        )}
        <div className="border-t border-token pt-2 space-y-1.5">
          <div className="text-[12px] font-semibold">Passed a new one?</div>
          <div className="flex flex-wrap gap-2 items-center">
            <select value={certId} onChange={(e) => setCertId(e.target.value)} className={input} aria-label="Certificate">
              <option value="">Choose…</option>
              {KNOWN_CERTIFICATES.filter((c) => !facts.certificates.some((h) => h.id === c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="month" value={earned} onChange={(e) => setEarned(e.target.value)} className={input} aria-label="Month earned" />
            <input type="month" value={expires} onChange={(e) => setExpires(e.target.value)} className={input} aria-label="Month it expires" />
            <button onClick={addCert} className="btn btn-ghost !text-[12px] inline-flex items-center gap-1"><Plus size={12} /> Add</button>
          </div>
          <p className="text-[11.5px] text-muted">Earned month first, then expiry. Only add it once the result is in.</p>
          {problem && <p className="text-[12px] text-danger">{problem}</p>}
        </div>
      </section>

      <section className="surface rounded-2xl p-4 space-y-1">
        <h2 className="flex items-center gap-2 text-[14px] font-bold mb-1"><Briefcase size={15} className="text-aws-orange" /> Experience and work</h2>
        <Row label="Years in IT (from your profile)"><span className="font-semibold">{facts.yearsInIT}+</span></Row>
        <Row label="Years of paid cloud/AWS work">
          <input type="number" min="0" max="40" value={facts.cloudYears} onChange={(e) => update({ cloudYears: Number(e.target.value) || 0 })} className={cn(input, 'w-20')} />
        </Row>
        <Row label="Paid client jobs finished">
          <input type="number" min="0" value={facts.clientJobsCompleted} onChange={(e) => update({ clientJobsCompleted: Number(e.target.value) || 0 })} className={cn(input, 'w-20')} />
        </Row>
        <Row label="Upwork reviews">
          <input type="number" min="0" value={facts.upworkReviews} onChange={(e) => update({ upworkReviews: Number(e.target.value) || 0 })} className={cn(input, 'w-20')} />
        </Row>
        <Row label="Hourly rate (USD)">
          <input type="number" min="0" value={facts.hourlyRate ?? ''} onChange={(e) => update({ hourlyRate: Number(e.target.value) || null })} className={cn(input, 'w-20')} />
        </Row>
        <div className="pt-2 text-[12px] font-semibold">Portfolio</div>
        <ul className="text-[12.5px] space-y-0.5">
          {facts.portfolio.map((p) => <li key={p.id}>• {p.title} <span className="text-muted">({p.where})</span></li>)}
        </ul>
      </section>

      <section className="surface rounded-2xl p-4 space-y-1">
        <h2 className="flex items-center gap-2 text-[14px] font-bold mb-1"><Coins size={15} className="text-aws-orange" /> Upwork</h2>
        <Row label="ID verification done (35 Connects, needed before applying)">
          <input type="checkbox" checked={facts.upwork.idVerified} onChange={(e) => updateUpwork({ idVerified: e.target.checked })} />
        </Row>
        <Row label="Connects you have now">
          <input type="number" min="0" value={facts.upwork.connectsBalance} onChange={(e) => updateUpwork({ connectsBalance: Number(e.target.value) || 0 })} className={cn(input, 'w-20')} />
        </Row>
        <Row label="Price per Connect (USD, approximate)">
          <input type="number" min="0" step="0.01" value={facts.upwork.pricePerConnect} onChange={(e) => updateUpwork({ pricePerConnect: Number(e.target.value) || 0.15 })} className={cn(input, 'w-20')} />
        </Row>
        <p className="text-[11.5px] text-muted">Upwork sets the Connect price, so check it when you buy.</p>
      </section>

      <section className="surface rounded-2xl p-4 space-y-1.5">
        <h2 className="text-[14px] font-bold">Your own AWS accounts</h2>
        <p className="text-[11.5px] text-muted">Your practice account IDs (12 digits). Jobs → Delivery refuses to unlock client work while you are signed in to one of these. Kept in this browser only.</p>
        <OwnAccounts ids={detail.ownAccountIds || []} onChange={(ownAccountIds) => update({ ownAccountIds })} />
      </section>

      <section className="surface rounded-2xl p-4">
        <h2 className="text-[14px] font-bold mb-1">Skills</h2>
        <p className="text-[11.5px] text-muted mb-2">These come from your profile file. Ask Claude to move a skill across once you have really used it.</p>
        <div className="flex flex-wrap gap-1.5">
          {skills.filter((s) => s.have).map((s) => <span key={s.id} className="rounded-full border border-token px-2 py-0.5 text-[11.5px] text-success">{s.label}</span>)}
        </div>
        <div className="text-[12px] font-semibold mt-3 mb-1">Still to learn (proposals may not claim these)</div>
        <div className="flex flex-wrap gap-1.5">
          {skills.filter((s) => !s.have).map((s) => <span key={s.id} className="rounded-full border border-token px-2 py-0.5 text-[11.5px] text-muted">{s.label}</span>)}
        </div>
      </section>
    </div>
  );
}
