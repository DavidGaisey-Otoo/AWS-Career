/**
 * ResourceSearch.jsx — Phase 1: search your OWN live AWS account.
 *
 * Reads go through DeployContext.readWithPassword, which means every
 * query here lands in the same immutable audit log as everything else the
 * app does to your account. That is deliberate: "what did I look at, and
 * when" is part of the security story, not an afterthought.
 *
 * ── On holding the deploy password in memory ─────────────────────────
 * The vault never caches the password, and BUILD/DESTROY/ADMIN actions
 * re-prompt every single time. Search is different in kind: you run
 * twenty queries in a row, and re-typing a password twenty times trains
 * people to pick a weak one. So this page holds the password in React
 * state — memory only, never localStorage, cleared on unmount and by an
 * explicit Lock button. That is a real tradeoff and the UI says so out
 * loud rather than hiding it. It is bounded to READ-tier actions, which
 * the tier model already defines as having no side effects.
 */
import { motion } from 'framer-motion';
import {
  AlertTriangle, Database, ExternalLink, Eye, Info, Lock, Play, Search,
  ShieldAlert, ShieldCheck, Tag, Terminal, Unlock,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { AWS_REGIONS } from '../context/AWSContext.jsx';
import { useDeploy } from '../context/DeployContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  RESOURCE_QUERY_LIBRARY,
  buildQuery,
  columnsFor,
  consoleUrlFor,
  evaluateFindings,
  matchQueries,
  parseConfigResults,
  readOnlyProblem,
  summariseResults,
  worstSeverity,
} from '../lib/resourceSearch.js';
import { cn } from '../lib/utils.js';

const SEVERITY_STYLE = {
  high:    { chip: 'bg-danger/15 text-danger border-danger/40',        icon: ShieldAlert },
  medium:  { chip: 'bg-amber-500/15 text-amber-400 border-amber-500/40', icon: AlertTriangle },
  low:     { chip: 'bg-sky-500/15 text-sky-400 border-sky-500/40',     icon: Info },
  unknown: { chip: 'bg-white/10 text-muted border-token',              icon: Eye },
};

export default function ResourceSearch() {
  const toast = useToast();
  const { hasVault, verifyPassword, readWithPassword } = useDeploy();

  const [password, setPassword] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [region, setRegion] = useState('eu-west-1');

  const [recorder, setRecorder] = useState(null);
  const [question, setQuestion] = useState('');
  const [inputs, setInputs] = useState({});
  const [customSql, setCustomSql] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { source, label, rows, parseErrors, nextToken, query }

  // The password lives only as long as this page is mounted.
  useEffect(() => () => setPassword(''), []);

  const suggestions = useMemo(() => matchQueries(question, 3), [question]);
  const customProblem = useMemo(
    () => (customSql.trim() ? readOnlyProblem(customSql) : null),
    [customSql]
  );

  // ─────────────────────────── session ───────────────────────────

  async function handleUnlock() {
    if (!password) return;
    try {
      const ok = await verifyPassword(password);
      if (!ok) {
        toast.error('Wrong deploy password.');
        return;
      }
      setUnlocked(true);
      toast.success('Unlocked for this page. Reads only.');
      // The recorder check is driven by the effect below, which fires on
      // this state change. Calling it here too would double every unlock
      // in the audit log.
    } catch (err) {
      toast.error(err.message || 'Unlock failed.');
    }
  }

  function handleLock() {
    setPassword('');
    setUnlocked(false);
    setRecorder(null);
    setResult(null);
    setError(null);
    toast.success('Locked. Password cleared from memory.');
  }

  // ───────────────────────── prerequisite ─────────────────────────

  /**
   * An advanced query against an account with no recorder SUCCEEDS and
   * returns zero rows. Without this check the UI would report "no
   * resources found" to someone with a full account. Always ask first.
   */
  const checkRecorder = useCallback(
    async (pw, rgn) => {
      try {
        const res = await readWithPassword({
          actionId: 'config.recorder-status',
          params: { region: rgn },
          password: pw,
        });
        setRecorder(res.result);
      } catch (err) {
        setRecorder({ error: err.message });
      }
    },
    [readWithPassword]
  );

  useEffect(() => {
    if (unlocked && password) checkRecorder(password, region);
    // Re-check whenever the region changes — the recorder is per-region.
  }, [region, unlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────── queries ───────────────────────────

  async function runConfigQuery(sql, label, { append = false, nextToken = null } = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await readWithPassword({
        actionId: 'config.advanced-query',
        params: { query: sql, region, limit: 100, nextToken },
        password,
      });
      // Rows come from `raw` — `result` is the audited summary and
      // deliberately carries no payload.
      const { rows, errors } = parseConfigResults(res.raw?.Results);
      setResult((prev) => ({
        source: 'config',
        label,
        query: sql,
        rows: append && prev ? [...prev.rows, ...rows] : rows,
        parseErrors: errors,
        nextToken: res.result.nextToken,
      }));
    } catch (err) {
      setError(err.message || 'Query failed.');
      if (!append) setResult(null);
    } finally {
      setBusy(false);
    }
  }

  function runLibraryQuery(entry) {
    try {
      const sql = buildQuery(entry, inputs);
      runConfigQuery(sql, entry.label);
    } catch (err) {
      setError(err.message);
    }
  }

  async function runTagSearch({ append = false, paginationToken = null } = {}) {
    setBusy(true);
    setError(null);
    try {
      const res = await readWithPassword({
        actionId: 'tagging.get-resources',
        params: { tagKey: inputs.tagKey || '', tagValue: inputs.tagValue || '', region, paginationToken },
        password,
      });
      const rows = res.raw?.rows || [];
      setResult((prev) => ({
        source: 'tagging',
        label: inputs.tagKey ? `Tagged "${inputs.tagKey}"` : 'All tagged resources',
        query: null,
        rows: append && prev ? [...prev.rows, ...rows] : rows,
        parseErrors: [],
        nextToken: res.result.nextToken,
      }));
    } catch (err) {
      setError(err.message || 'Tag search failed.');
      if (!append) setResult(null);
    } finally {
      setBusy(false);
    }
  }

  // ─────────────────────────── render ───────────────────────────

  if (!hasVault) {
    return (
      <div className="space-y-4">
        <PageHeader
          eyebrow="Resource Search"
          title="Search your live AWS account."
          subtitle="Ask what is actually running, what it costs you, and what is misconfigured — read-only."
          icon={Search}
        />
        <section className="surface rounded-2xl p-6 text-center space-y-3">
          <Database size={28} className="mx-auto text-muted" />
          <h2 className="text-lg font-bold">No credential vault yet</h2>
          <p className="text-sm text-muted max-w-md mx-auto">
            Resource Search reads your account through the same encrypted vault the Deploy Console
            uses. Set it up once — read-only keys are enough for everything on this page.
          </p>
          <Link to="/deploy">
            <Button variant="primary" icon={Lock}>Set up the vault</Button>
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Resource Search"
        title="Search your live AWS account."
        subtitle="Ask what is actually running, what it costs you, and what is misconfigured. Every query is read-only and recorded in your audit log."
        icon={Search}
        actions={
          unlocked ? (
            <Button variant="ghost" size="sm" icon={Lock} onClick={handleLock}>Lock</Button>
          ) : null
        }
      />

      {/* ── session unlock ── */}
      {!unlocked ? (
        <section className="surface rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Unlock size={16} className="text-aws-orange" />
            <h2 className="font-bold">Unlock for this session</h2>
          </div>
          <p className="text-xs text-muted max-w-2xl">
            Your deploy password decrypts the vault in memory for as long as this page is open.
            It is never written to disk, and Lock clears it immediately. Only read-tier actions
            can run from here — nothing on this page can change your account.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Deploy password"
              className="flex-1 min-w-[220px] bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm"
            />
            <Button variant="primary" icon={Unlock} onClick={handleUnlock} disabled={!password}>
              Unlock
            </Button>
          </div>
        </section>
      ) : (
        <>
          {/* ── region + recorder prerequisite ── */}
          <section className="surface rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="bg-[var(--card-2)] border border-token rounded-lg px-3 py-1.5 text-sm"
              >
                {AWS_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>{r.id} — {r.label}</option>
                ))}
              </select>
            </div>
            <RecorderBanner recorder={recorder} region={region} />
          </section>

          {/* ── ask a question ── */}
          <section className="surface rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Search size={16} className="text-aws-orange" />
              <h2 className="font-bold">Ask about your account</h2>
            </div>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. which security groups are open to the internet?"
              className="w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2.5 text-sm"
            />
            {question.trim() && suggestions.length === 0 && (
              <p className="text-xs text-muted">
                No saved query matches that. Pick one below, or write the SQL yourself.
              </p>
            )}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                {suggestions.map(({ entry }) => (
                  <QueryCard
                    key={entry.id}
                    entry={entry}
                    inputs={inputs}
                    setInputs={setInputs}
                    onRun={() => runLibraryQuery(entry)}
                    busy={busy}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── library ── */}
          <section className="surface rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-aws-orange" />
              <h2 className="font-bold">Saved queries</h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {RESOURCE_QUERY_LIBRARY.map((entry) => (
                <QueryCard
                  key={entry.id}
                  entry={entry}
                  inputs={inputs}
                  setInputs={setInputs}
                  onRun={() => runLibraryQuery(entry)}
                  busy={busy}
                  compact
                />
              ))}
            </div>
          </section>

          {/* ── tag search ── */}
          <section className="surface rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-aws-orange" />
              <h2 className="font-bold">Find by tag</h2>
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted">No recorder needed</span>
            </div>
            <p className="text-xs text-muted max-w-2xl">
              Uses the Resource Groups Tagging API, which works whether or not AWS Config is on —
              but it only sees resources that carry tags.
            </p>
            <div className="flex flex-wrap gap-2">
              <input
                value={inputs.tagKey || ''}
                onChange={(e) => setInputs((v) => ({ ...v, tagKey: e.target.value }))}
                placeholder="Tag key (blank = all tagged)"
                className="flex-1 min-w-[160px] bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={inputs.tagValue || ''}
                onChange={(e) => setInputs((v) => ({ ...v, tagValue: e.target.value }))}
                placeholder="Tag value (optional)"
                className="flex-1 min-w-[160px] bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-sm"
              />
              <Button variant="ghost" icon={Play} onClick={() => runTagSearch()} disabled={busy}>Search tags</Button>
            </div>
          </section>

          {/* ── raw SQL ── */}
          <section className="surface rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-aws-orange" />
              <h2 className="font-bold">Write your own query</h2>
            </div>
            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={3}
              spellCheck={false}
              placeholder="SELECT resourceId, resourceType, awsRegion WHERE resourceType = 'AWS::S3::Bucket'"
              className="w-full bg-[var(--card-2)] border border-token rounded-xl px-3 py-2 text-xs font-mono"
            />
            {customProblem && (
              <p className="text-xs text-danger flex items-center gap-1.5">
                <AlertTriangle size={12} /> {customProblem}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                icon={Play}
                disabled={busy || !customSql.trim() || !!customProblem}
                onClick={() => runConfigQuery(customSql.trim(), 'Custom query')}
              >
                Run query
              </Button>
              <a
                href="https://docs.aws.amazon.com/config/latest/developerguide/querying-AWS-resources.html"
                target="_blank" rel="noreferrer"
                className="text-xs text-muted hover:text-aws-orange inline-flex items-center gap-1"
              >
                Query syntax <ExternalLink size={11} />
              </a>
            </div>
          </section>

          {/* ── results ── */}
          {error && (
            <section className="surface rounded-2xl p-4 border-danger/40 bg-danger/5">
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-danger">Query failed</div>
                  {/* The real AWS message, verbatim — it is the useful part. */}
                  <p className="text-xs mt-1 font-mono break-words">{error}</p>
                </div>
              </div>
            </section>
          )}

          {result && (
            <ResultsPanel
              result={result}
              busy={busy}
              onLoadMore={() =>
                result.source === 'config'
                  ? runConfigQuery(result.query, result.label, { append: true, nextToken: result.nextToken })
                  : runTagSearch({ append: true, paginationToken: result.nextToken })
              }
            />
          )}
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════

function RecorderBanner({ recorder, region }) {
  if (!recorder) {
    return <p className="text-xs text-muted">Checking AWS Config recorder in {region}…</p>;
  }
  if (recorder.error) {
    return (
      <div className="text-xs flex items-start gap-2 text-amber-400">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>Could not read recorder status: <span className="font-mono">{recorder.error}</span></span>
      </div>
    );
  }
  if (recorder.recording) {
    return (
      <div className="space-y-1.5">
        <div className="text-xs flex items-start gap-2 text-emerald-400">
          <ShieldCheck size={14} className="shrink-0 mt-0.5" />
          <span>Config recorder is running in {region}. Query results reflect recorded configuration.</span>
        </div>
        {!recorder.includesGlobal && (
          <div className="text-xs flex items-start gap-2 text-amber-400">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>
              This recorder does not include global resource types, so the IAM query will return
              zero rows even if you have roles. That is a recorder setting, not an empty account.
            </span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 text-xs space-y-1.5">
      <div className="flex items-center gap-2 font-bold text-amber-400">
        <AlertTriangle size={14} />
        {recorder.configured ? 'Config recorder is not recording' : 'No Config recorder in this region'}
      </div>
      <p className="text-muted">
        Advanced queries will succeed and return <strong>zero rows</strong> — which is not the same
        as an empty account. Tag search below still works without it.
      </p>
      <p className="text-muted">
        Turning recording on is a billed feature: AWS Config charges per configuration item recorded.
        Enable it in the console if you want it.
      </p>
      <a
        href={`https://${region}.console.aws.amazon.com/config/home?region=${region}#/settings`}
        target="_blank" rel="noreferrer"
        className="inline-flex items-center gap-1 font-bold text-aws-orange hover:underline"
      >
        Open Config settings <ExternalLink size={11} />
      </a>
    </div>
  );
}

function QueryCard({ entry, inputs, setInputs, onRun, busy, compact }) {
  return (
    <div className="rounded-xl border border-token bg-[var(--card-2)] p-3 space-y-2">
      <div className="font-bold text-sm">{entry.label}</div>
      {!compact && <p className="text-xs text-muted">{entry.why}</p>}
      {(entry.inputs || []).map((input) => (
        <input
          key={input.id}
          value={inputs[input.id] || ''}
          onChange={(e) => setInputs((v) => ({ ...v, [input.id]: e.target.value }))}
          placeholder={`${input.label} — e.g. ${input.placeholder}`}
          className="w-full bg-[var(--card)] border border-token rounded-lg px-2.5 py-1.5 text-xs"
        />
      ))}
      <div className="flex items-center justify-between gap-2">
        <code className="text-[10px] text-muted font-mono truncate flex-1" title={entry.sql}>{entry.sql}</code>
        <Button variant="ghost" size="sm" icon={Play} onClick={onRun} disabled={busy}>Run</Button>
      </div>
    </div>
  );
}

function ResultsPanel({ result, busy, onLoadMore }) {
  const { rows, parseErrors, label, source, nextToken } = result;
  const summary = useMemo(() => summariseResults(rows), [rows]);
  const columns = useMemo(() => columnsFor(rows), [rows]);

  return (
    <section className="surface rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">{label}</h2>
          {/* Source labelling: a Config row and a tag row are different evidence. */}
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted mt-0.5">
            Your resources · {source === 'config' ? 'AWS Config' : 'Resource Groups Tagging API'}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="px-2 py-1 rounded-lg bg-white/10 font-bold">{summary.total} rows</span>
          {summary.findings.high > 0 && (
            <span className={cn('px-2 py-1 rounded-lg border font-bold', SEVERITY_STYLE.high.chip)}>
              {summary.findings.high} high
            </span>
          )}
          {summary.findings.medium > 0 && (
            <span className={cn('px-2 py-1 rounded-lg border font-bold', SEVERITY_STYLE.medium.chip)}>
              {summary.findings.medium} medium
            </span>
          )}
          {summary.findings.unknown > 0 && (
            <span className={cn('px-2 py-1 rounded-lg border font-bold', SEVERITY_STYLE.unknown.chip)}>
              {summary.findings.unknown} unverified
            </span>
          )}
        </div>
      </div>

      {parseErrors.length > 0 && (
        <p className="text-xs text-amber-400 flex items-center gap-1.5">
          <AlertTriangle size={12} />
          {parseErrors.length} row{parseErrors.length === 1 ? '' : 's'} could not be parsed and {parseErrors.length === 1 ? 'is' : 'are'} not shown.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No rows. If the Config recorder is off in this region, that is the reason — not an empty account.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-token">
                  {columns.map((c) => (
                    <th key={c} className="py-2 px-2 font-bold whitespace-nowrap">{c}</th>
                  ))}
                  <th className="py-2 px-2 font-bold">Findings</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <ResultRow key={`${row.resourceId || 'row'}-${i}`} row={row} columns={columns} />
                ))}
              </tbody>
            </table>
          </div>
          {nextToken && (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={busy}>
                {busy ? 'Loading…' : 'Load more'}
              </Button>
              {/* Never let a truncated result set read as the whole answer. */}
              <span className="text-xs text-muted">More results available — this is not the full set.</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function ResultRow({ row, columns }) {
  const findings = useMemo(() => evaluateFindings(row), [row]);
  const worst = worstSeverity(findings);
  const url = consoleUrlFor(row);

  return (
    <motion.tr
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className={cn('border-b border-token/50 align-top', worst === 'high' && 'bg-danger/5')}
    >
      {columns.map((c) => (
        <td key={c} className="py-2 px-2 font-mono max-w-[260px] truncate" title={stringify(row[c])}>
          {stringify(row[c])}
        </td>
      ))}
      <td className="py-2 px-2 space-y-1">
        {findings.length === 0 ? (
          <span className="text-muted">—</span>
        ) : (
          findings.map((f, i) => {
            const style = SEVERITY_STYLE[f.severity] || SEVERITY_STYLE.unknown;
            const Icon = style.icon;
            return (
              <div key={i} className={cn('inline-flex items-start gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold', style.chip)} title={f.detail}>
                <Icon size={10} className="mt-0.5 shrink-0" />
                <span>{f.label}</span>
              </div>
            );
          })
        )}
      </td>
      <td className="py-2 px-2">
        {url && (
          <a href={url} target="_blank" rel="noreferrer" className="text-aws-orange hover:underline inline-flex items-center gap-1">
            <ExternalLink size={11} />
          </a>
        )}
      </td>
    </motion.tr>
  );
}

function stringify(value) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
