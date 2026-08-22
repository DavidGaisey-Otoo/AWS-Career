import { Check, CheckCircle2, ClipboardCopy, FileText } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { CONTRACT_TEMPLATES, PRE_SIGN_CHECKLIST } from '../../data/contractTemplates.js';
import { cn } from '../../lib/utils.js';
import { findDraftMarkers } from '../../lib/businessWorkflow.js';

export function ContractLibrary() {
  const [active, setActive] = useState(null);
  const [vars, setVars] = useState({});
  const [checks, setChecks] = useState({});
  const { profile } = useApp();
  const { state } = useFreelance();
  const toast = useToast();

  const open = (t) => {
    setActive(t);
    setVars({
      your_name: profile?.name || 'Your Name',
      your_first_name: (profile?.name || 'Your Name').split(' ')[0],
      client_name: '',
      client_first_name: '',
      client_country: '',
      project_title: '',
      start_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      currency: state.goals.currency || 'USD',
      amount: '',
      invoice_number: 'INV-0001',
      days_overdue: '5',
      late_fee_pct: '5',
      iac_tool: 'Terraform',
      request_summary: '',
      impact_summary: '',
      extra_cost: '',
    });
  };

  const filledBody = active ? interpolate(active.body, vars) : '';
  const draftMarkers = findDraftMarkers(filledBody);

  const copy = async () => {
    if (draftMarkers.length && !confirm(`This draft still contains ${draftMarkers.length} unresolved placeholder(s). Copy it as an incomplete draft anyway?`)) return;
    try {
      await navigator.clipboard.writeText(filledBody);
      toast.success(draftMarkers.length ? 'Incomplete draft copied — review before sharing' : 'Reviewed draft copied');
    } catch { toast.error('Could not copy'); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      {/* List */}
      <div className="space-y-2">
        <ul className="space-y-2">
          {CONTRACT_TEMPLATES.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => open(t)}
                className={cn(
                  'w-full text-left surface rounded-2xl p-3.5 transition focus-ring',
                  active?.id === t.id ? 'border-aws-orange shadow-glow-orange' : 'hover:border-aws-orange/40'
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <div className="text-sm font-extrabold">{t.title}</div>
                    <div className="text-[11px] text-muted">{t.short}</div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>

        {/* Pre-sign checklist */}
        <div className="surface rounded-2xl p-4 mt-3">
          <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={11} /> Before you sign anything
          </h4>
          <ul className="space-y-1.5">
            {PRE_SIGN_CHECKLIST.map((c, i) => {
              const k = `c-${i}`;
              const on = !!checks[k];
              return (
                <li key={k}>
                  <button onClick={() => setChecks((s) => ({ ...s, [k]: !s[k] }))}
                          className="flex items-start gap-2 text-xs w-full text-left hover:text-current transition">
                    <span className={cn(
                      'mt-0.5 w-4 h-4 rounded grid place-items-center flex-shrink-0 border',
                      on ? 'bg-success text-white border-success' : 'border-token bg-[var(--card-2)]'
                    )}>
                      {on && <Check size={10} />}
                    </span>
                    <span className={cn(on ? 'line-through text-muted' : '')}>{c}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Preview / editor */}
      <div className="surface rounded-2xl p-5 min-h-[400px]">
        {!active ? (
          <div className="h-full grid place-items-center text-center text-muted py-12">
            <div>
              <FileText size={28} className="mx-auto mb-2 text-aws-orange" />
              <div className="text-sm font-bold">Pick a template to start</div>
              <div className="text-xs mt-1">Fill the variables on the left, copy to clipboard, share with the client.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
                {active.icon} {active.title}
              </div>
              <button onClick={copy} className="btn btn-primary !text-xs !py-1.5">
                <ClipboardCopy size={12} /> Copy
              </button>
            </div>
            <div className="rounded-lg border border-warning/35 bg-warning/5 p-2.5 text-[11px] mb-3 leading-relaxed">
              <strong>Draft only.</strong> This is not legal advice, an electronic signature, client acceptance, or a sent contract.
              {draftMarkers.length > 0 && <> Resolve {draftMarkers.length} highlighted-style placeholder(s) before sharing: {draftMarkers.slice(0, 4).join(', ')}.</>}
            </div>
            {/* Placeholders */}
            {active.placeholders?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {active.placeholders.map((p) => (
                  <label key={p} className="block">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted">{p.replace(/_/g, ' ')}</span>
                    <input
                      value={vars[p] || ''}
                      onChange={(e) => setVars((v) => ({ ...v, [p]: e.target.value }))}
                      className="mt-1 w-full bg-[var(--card-2)] border border-token rounded-md px-2 py-1.5 text-xs font-semibold focus-ring focus:border-aws-orange"
                    />
                  </label>
                ))}
              </div>
            )}
            {/* Rendered body */}
            <pre className="text-xs leading-relaxed whitespace-pre-wrap rounded-xl border border-token bg-[var(--card-2)]/40 p-3 font-mono max-h-[60vh] overflow-y-auto">
              {filledBody}
            </pre>
          </>
        )}
      </div>
    </div>
  );
}

function interpolate(text, vars) {
  return (text || '').replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] != null && vars[k] !== '' ? String(vars[k]) : `{${k}}`);
}
