/**
 * LocalAIPanel.jsx — EX-26: turn on free, private AI from a local Ollama.
 *
 * Deliberately honest about the three constraints, because discovering them
 * yourself mid-study is worse than being told up front:
 *   - it only works when running the app locally (HTTPS blocks http://localhost)
 *   - a small local model is slow-ish (a few seconds per answer)
 *   - it is grounded, so it re-explains the app's own text rather than
 *     recalling AWS facts — which is what keeps it safe for exam prep
 */

import { useEffect, useState } from 'react';
import {
  Cpu, CheckCircle2, AlertTriangle, Loader2, RefreshCw, ExternalLink, Shield,
} from 'lucide-react';
import {
  readSettings, writeSettings, checkAvailability, LOCAL_LLM_DEFAULT_HOST,
} from '../../lib/localLLM.js';
import { cn } from '../../lib/utils.js';

export function LocalAIPanel() {
  const [settings, setSettings] = useState(() => readSettings());
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  async function probe(host = settings.host) {
    setChecking(true);
    const r = await checkAvailability({ host });
    setStatus(r);
    // Auto-select a sensible model the first time it connects
    if (r.ok && !settings.model && r.suggested) {
      const next = { ...settings, model: r.suggested };
      setSettings(next);
      writeSettings({ model: r.suggested });
    }
    setChecking(false);
  }

  useEffect(() => { probe(); /* eslint-disable-next-line */ }, []);

  function update(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeSettings(patch);
  }

  return (
    <section className="surface rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-electric mb-1">
            Free · private · offline
          </div>
          <h3 className="text-[15px] font-extrabold flex items-center gap-2">
            <Cpu size={16} className="text-electric" /> Local AI
          </h3>
          <p className="text-[12.5px] opacity-80 mt-1 leading-relaxed max-w-xl">
            Adds the one thing the rule engines cannot do — re-explaining a question
            when the written explanation doesn&apos;t land. Runs a model on this machine
            through Ollama: no API key, no cost per use, nothing leaves your device.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="w-4 h-4 accent-electric"
          />
          <span className="text-[12.5px] font-bold">{settings.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {/* Connection status */}
      <div className={cn(
        'rounded-xl border p-3 flex items-start gap-2.5',
        checking ? 'border-token bg-[var(--card-2)]/40'
          : status?.ok ? 'border-success/40 bg-success/5'
          : 'border-warning/40 bg-warning/5'
      )}>
        {checking ? <Loader2 size={15} className="animate-spin shrink-0 mt-0.5" />
          : status?.ok ? <CheckCircle2 size={15} className="text-success shrink-0 mt-0.5" />
          : <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />}
        <div className="flex-1 min-w-0 text-[12px] leading-relaxed">
          {checking && 'Checking for a local model…'}
          {!checking && status?.ok && (
            <>
              <strong className="text-success">Connected.</strong>{' '}
              {status.models.length} model{status.models.length === 1 ? '' : 's'} available.
            </>
          )}
          {!checking && status && !status.ok && (
            <>
              <strong className="text-warning">Not available.</strong> {status.message}
              {status.reason === 'unreachable' && (
                <div className="mt-1.5 opacity-80">
                  Install from{' '}
                  <a href="https://ollama.com" target="_blank" rel="noopener noreferrer"
                     className="text-electric font-bold hover:underline inline-flex items-center gap-0.5">
                    ollama.com <ExternalLink size={9} />
                  </a>, then run <code className="text-electric">ollama pull llama3.2:3b</code>
                </div>
              )}
            </>
          )}
        </div>
        <button onClick={() => probe()} disabled={checking}
                className="btn btn-ghost !text-[11px] !py-1 tap-44 shrink-0 gap-1">
          <RefreshCw size={11} /> Recheck
        </button>
      </div>

      {/* Model picker */}
      {status?.ok && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-60">Model</span>
            <select
              value={settings.model || ''}
              onChange={(e) => update({ model: e.target.value })}
              className="mt-1 w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12.5px] font-mono cursor-pointer"
            >
              {status.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <span className="text-[10.5px] opacity-60 mt-1 block">
              Smaller is faster. llama3.2:3b answers in a few seconds; 8B models take far longer.
            </span>
          </label>
          <label className="block">
            <span className="text-[11px] font-extrabold uppercase tracking-widest opacity-60">Server</span>
            <input
              type="text"
              value={settings.host}
              onChange={(e) => update({ host: e.target.value })}
              onBlur={() => probe()}
              placeholder={LOCAL_LLM_DEFAULT_HOST}
              className="mt-1 w-full rounded-lg bg-[var(--card-2)] border border-token px-2.5 py-2 text-[12.5px] font-mono outline-none focus:border-electric"
            />
            <span className="text-[10.5px] opacity-60 mt-1 block">
              Ollama&apos;s default is {LOCAL_LLM_DEFAULT_HOST}.
            </span>
          </label>
        </div>
      )}

      {/* The honest constraints */}
      <div className="rounded-xl border border-token bg-[var(--card-2)]/30 p-3 space-y-1.5 text-[11.5px] leading-relaxed">
        <div className="font-extrabold flex items-center gap-1.5 text-[12px]">
          <Shield size={12} className="text-electric" /> What to expect
        </div>
        <p>
          <strong>It only rephrases, never recalls.</strong> A small local model will state
          AWS facts confidently and wrongly, which for exam prep is worse than silence. So it
          is only ever given the explanation already written in the question bank and asked to
          say it differently — it is instructed to refuse rather than invent.
        </p>
        <p>
          <strong>Local runs only.</strong> Browsers block an HTTPS page from calling
          http://localhost, so this works when you run the app yourself
          (<code className="text-electric">npm run dev</code>), not on the deployed site.
        </p>
        <p>
          <strong>Everything still works without it.</strong> The twelve rule-based review
          systems and all exam features are unchanged; this only adds an extra button under
          question explanations.
        </p>
      </div>
    </section>
  );
}
