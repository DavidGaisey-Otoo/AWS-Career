import { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Github, Loader2, Lock, RefreshCw, Rocket, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { usePortfolio } from '../context/PortfolioContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { generateCustomProject } from '../lib/customProjects.js';
import {
  inspectRepository, listAuthorizedRepositories, listRepositoryBranches, repositoryAnalysisBrief,
} from '../lib/githubProjectImporter.js';

export default function GitHubProjects() {
  const nav = useNavigate();
  const toast = useToast();
  const { addCustomProject } = usePortfolio();
  const [repos, setRepos] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('main');
  const [analysis, setAnalysis] = useState(null);

  const filtered = useMemo(() => repos.filter((repo) => repo.fullName.toLowerCase().includes(query.toLowerCase())), [repos, query]);

  async function loadRepos() {
    setBusy(true); setError(''); setAnalysis(null);
    try { setRepos(await listAuthorizedRepositories()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function choose(repo) {
    setSelected(repo); setBranch(repo.defaultBranch); setAnalysis(null); setError(''); setBusy(true);
    try { setBranches(await listRepositoryBranches(repo.fullName)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function analyze() {
    if (!selected) return;
    setBusy(true); setError('');
    try { setAnalysis(await inspectRepository(selected.fullName, branch)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  function createGuidedProject() {
    if (!analysis) return;
    const project = generateCustomProject({
      title: selected.name.replace(/[-_]+/g, ' '),
      brief: repositoryAnalysisBrief(analysis),
    });
    project.sourceRepository = { fullName: selected.fullName, branch, htmlUrl: selected.htmlUrl };
    const saved = addCustomProject(project);
    if (!saved) return toast.error('The imported project could not be saved.');
    toast.success('Repository imported as a guided project. No AWS resources were created.');
    nav(`/portfolio/${project.id}`);
  }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Secure GitHub import" title="GitHub → guided AWS project" subtitle="Select an authorized repository, inspect deployment metadata, learn the recommended AWS architecture, then approve each deployment stage." icon={Github} />

      <div className="surface rounded-2xl p-4 border-l-4 border-l-success flex gap-3">
        <ShieldCheck className="text-success shrink-0" size={20} />
        <div className="text-xs leading-relaxed"><strong>Read scope is controlled.</strong> The importer lists only repositories your GitHub App can access. It reads file names plus a small deployment-manifest allowlist, never <code>.env</code>, keys, credentials, or application data. Importing does not deploy or push code.</div>
      </div>

      <button onClick={loadRepos} disabled={busy} className="btn btn-primary">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Load authorized repositories
      </button>

      {error && <div className="rounded-xl border border-danger/40 bg-danger/5 p-3 text-xs text-danger flex gap-2"><AlertTriangle size={14} />{error}</div>}

      {repos.length > 0 && (
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-4">
          <section className="surface rounded-2xl p-4 space-y-3">
            <div className="relative"><Search size={14} className="absolute left-3 top-3 opacity-50" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your repositories" className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--card-2)] border border-token text-sm" /></div>
            <div className="space-y-2 max-h-[520px] overflow-auto">
              {filtered.map((repo) => <button key={repo.id} onClick={() => choose(repo)} disabled={repo.archived || repo.disabled} className={`w-full text-left rounded-xl border p-3 ${selected?.id === repo.id ? 'border-aws-orange bg-aws-orange/10' : 'border-token hover:border-aws-orange/50'} disabled:opacity-50`}>
                <div className="font-bold text-sm flex items-center gap-1.5">{repo.private && <Lock size={11} />}{repo.fullName}</div>
                <div className="text-[11px] opacity-65 mt-1">{repo.language || 'Language unknown'} · updated {new Date(repo.updatedAt).toLocaleDateString()}</div>
              </button>)}
            </div>
          </section>

          <section className="surface rounded-2xl p-5 space-y-4">
            {!selected ? <p className="text-sm opacity-60">Choose a repository to continue.</p> : <>
              <div className="flex justify-between gap-3"><div><h2 className="font-extrabold">{selected.fullName}</h2><p className="text-xs opacity-70">{selected.description || 'No repository description.'}</p></div><a href={selected.htmlUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a></div>
              <label className="text-xs font-bold block">Branch<select value={branch} onChange={(e) => { setBranch(e.target.value); setAnalysis(null); }} className="mt-1 w-full rounded-xl bg-[var(--card-2)] border border-token p-2.5">{branches.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
              <button onClick={analyze} disabled={busy} className="btn btn-primary">{busy ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Analyze safely</button>
              {analysis && <Analysis analysis={analysis} onImport={createGuidedProject} />}
            </>}
          </section>
        </div>
      )}
    </div>
  );
}

function Analysis({ analysis, onImport }) {
  return <div className="space-y-3 pt-3 border-t border-token">
    <div className="grid sm:grid-cols-2 gap-2 text-xs"><Fact label="Detected" value={analysis.framework} /><Fact label="Project type" value={analysis.kind} /><Fact label="Build" value={analysis.buildCommand || 'Not detected'} /><Fact label="Files inspected" value={`${analysis.fileCount} names; ${analysis.manifestsRead.length} safe manifests`} /></div>
    <div className="rounded-xl bg-[var(--card-2)] p-3"><div className="font-bold text-xs mb-1">Recommended AWS pattern</div><p className="text-xs leading-relaxed">{analysis.awsPattern}</p></div>
    {analysis.secretLikeFiles.length > 0 && <div className="rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs"><strong>Secret review required:</strong> {analysis.secretLikeFiles.length} secret-like filename(s) detected. Their contents were not read.</div>}
    <div><div className="font-bold text-xs mb-1">Required before deployment</div><ul className="text-xs space-y-1">{analysis.blockers.map((item) => <li key={item} className="flex gap-1.5"><AlertTriangle size={11} className="text-warning mt-0.5 shrink-0" />{item}</li>)}</ul></div>
    <div className="rounded-xl border border-warning/40 p-3 text-xs"><strong>Deployment status: Review required.</strong> Import creates a study project only. AWS deployment stays locked until build, tests, secrets, cost, and development health evidence pass.</div>
    {analysis.deploymentProfile && <div className="rounded-xl border border-sky-400/30 bg-sky-400/5 p-3">
      <div className="font-bold text-xs">Front-end deployment journey · {analysis.deploymentProfile.label}</div>
      <ol className="mt-2 space-y-1 text-xs list-decimal pl-4">{analysis.deploymentProfile.stages.map((stage) => <li key={stage}>{stage}</li>)}</ol>
      {analysis.sensitiveDomain && <p className="mt-2 text-xs text-warning"><strong>Synthetic data only.</strong> A successful AWS deployment is not proof of HIPAA, GDPR, or other health-data compliance.</p>}
    </div>}
    <button onClick={onImport} className="btn btn-primary w-full"><Rocket size={14} /> Import and start guided project</button>
  </div>;
}
function Fact({ label, value }) { return <div className="rounded-lg border border-token p-2"><div className="text-[10px] uppercase opacity-55 font-bold">{label}</div><div className="font-semibold mt-0.5">{value}</div></div>; }
