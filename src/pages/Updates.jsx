/**
 * Updates.jsx — the "what's new + how do I update?" page.
 *
 * Three sections:
 *   1. App version + changelog (manually curated in data/appChangelog.js)
 *   2. Live AWS What's New feed (best-effort fetch — CORS-friendly proxies)
 *   3. How-to-update guide (the app is a Vite frontend — updates come via
 *      Claude Code right now, but we explain it clearly + offer a one-click
 *      "open Claude Code with the update command" link)
 *
 * Why no auto-update: this is a personal Vite app you run locally. Pushing
 * code from inside the browser would require a backend + write access to
 * your source tree, which we deliberately don't have. Claude Code is the
 * right tool for the job — we just make it convenient.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, RefreshCw, ExternalLink, Wrench, Rocket, CheckCircle2,
  AlertCircle, BookOpen, Newspaper, Loader2, Terminal, GitBranch, Shield,
  ChevronDown, ChevronRight, Calendar, Tag, Github,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/Button.jsx';
import { APP_CHANGELOG, currentVersion, latestEntry } from '../data/appChangelog.js';
import { LinkText } from '../lib/linkify.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { STORAGE_KEY } from '../lib/constants.js';

const TABS = [
  { id: 'app',         label: 'App changelog',    icon: Sparkles },
  { id: 'aws-news',    label: 'AWS What\'s New',  icon: Newspaper },
  { id: 'how-to-update', label: 'How to update',  icon: Wrench },
];

export default function Updates() {
  const [tab, setTab] = useState('app');
  return (
    <div className="space-y-6">
      <Header />
      <TabBar tab={tab} setTab={setTab} />
      {tab === 'app'           && <AppChangelogTab />}
      {tab === 'aws-news'      && <AwsNewsTab />}
      {tab === 'how-to-update' && <HowToUpdateTab />}
    </div>
  );
}

// ─────────────────── header ───────────────────

function Header() {
  const latest = latestEntry();
  return (
    <div className="rounded-3xl border border-token bg-gradient-to-br from-[var(--brand)]/10 via-transparent to-transparent p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw size={18} className="text-[var(--brand)]" />
            <h1 className="text-2xl font-bold tracking-tight">Updates</h1>
          </div>
          <p className="text-sm opacity-70 max-w-2xl">
            What's shipped in your app, what's new in AWS itself, and how to pull the next batch of
            updates into your local copy.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">App version</span>
          <span className="text-2xl font-bold font-mono tabular-nums">v{currentVersion()}</span>
          {latest?.date && (
            <span className="text-[10px] opacity-60">Last ship: {latest.date}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBar({ tab, setTab }) {
  return (
    <div className="flex gap-2 border-b border-token overflow-x-auto no-scrollbar">
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              active ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// APP CHANGELOG
// ═══════════════════════════════════════════════════════════════════

function AppChangelogTab() {
  return (
    <div className="space-y-4">
      {APP_CHANGELOG.map((entry, i) => (
        <ChangelogEntry key={entry.id} entry={entry} latest={i === 0} />
      ))}
    </div>
  );
}

function ChangelogEntry({ entry, latest }) {
  const [open, setOpen] = useState(latest);
  return (
    <div className={`rounded-2xl border ${latest ? 'border-[var(--brand)]/40 bg-[var(--brand)]/5' : 'border-token bg-[var(--card)]'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-5 py-4 flex items-center gap-3 hover:bg-[var(--card-2)]/30 rounded-2xl"
      >
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${latest ? 'bg-[var(--brand)] text-black' : 'bg-[var(--card-2)]'}`}>
          {latest ? <Rocket size={16} /> : <Tag size={14} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-70 mb-0.5">
            <span className="font-mono font-bold">v{entry.version}</span>
            <span>·</span>
            <Calendar size={9} />
            <span>{entry.date}</span>
            {latest && <span className="ml-1 text-[var(--brand)] font-bold">LATEST</span>}
          </div>
          <h3 className="text-base font-bold tracking-tight">{entry.highlight}</h3>
        </div>
        {open ? <ChevronDown size={16} className="opacity-50" /> : <ChevronRight size={16} className="opacity-50" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-token pt-4">
              {entry.sections.added?.length > 0 && (
                <ChangelogSection title="Added" icon={Sparkles} tone="success" items={entry.sections.added} />
              )}
              {entry.sections.changed?.length > 0 && (
                <ChangelogSection title="Changed" icon={RefreshCw} tone="electric" items={entry.sections.changed} />
              )}
              {entry.sections.fixed?.length > 0 && (
                <ChangelogSection title="Fixed" icon={CheckCircle2} tone="warning" items={entry.sections.fixed} />
              )}
              {entry.sections.notes?.length > 0 && (
                <ChangelogSection title="Notes" icon={AlertCircle} tone="muted" items={entry.sections.notes} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangelogSection({ title, icon: Icon, tone, items }) {
  const toneClasses = {
    success: 'text-success',
    electric: 'text-electric',
    warning: 'text-warning',
    muted: 'text-muted',
  };
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5 ${toneClasses[tone]}`}>
        <Icon size={11} />
        {title}
      </div>
      <ul className="space-y-1.5 text-sm">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${toneClasses[tone]}`} style={{ background: 'currentColor' }} />
            <span><LinkText>{item}</LinkText></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// AWS WHAT'S NEW (live feed)
// ═══════════════════════════════════════════════════════════════════

function AwsNewsTab() {
  const [cache, setCache] = useLocalStorage(`${STORAGE_KEY}::aws-news-cache`, { items: [], at: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const fresh = cache.at && Date.now() - cache.at < 1000 * 60 * 60; // 1 hour

  async function fetchNews() {
    setBusy(true);
    setError(null);
    try {
      const items = await fetchAwsWhatsNew();
      setCache({ items, at: Date.now() });
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  // Auto-fetch on first mount if we have nothing or stale data
  useEffect(() => {
    if (!cache.items?.length || !fresh) fetchNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-token bg-[var(--card)] p-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2"><Newspaper size={16} /> AWS What's New (live)</h3>
          <p className="text-xs opacity-70 mt-0.5">
            Pulled from <a href="https://aws.amazon.com/about-aws/whats-new/recent/" target="_blank" rel="noreferrer" className="underline text-electric">aws.amazon.com</a>.
            {cache.at && <span className="ml-1">Last refreshed {timeAgo(cache.at)}.</span>}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchNews} disabled={busy} icon={busy ? Loader2 : RefreshCw}>
          {busy ? 'Fetching…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 text-sm text-warning flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <strong>Couldn't fetch live feed:</strong> {error}
            <p className="mt-1 opacity-80">Open the AWS feed directly:&nbsp;
              <a href="https://aws.amazon.com/about-aws/whats-new/recent/" target="_blank" rel="noreferrer" className="underline">
                aws.amazon.com/about-aws/whats-new/recent →
              </a>
            </p>
          </div>
        </div>
      )}

      {(cache.items || []).length === 0 && !busy && !error ? (
        <div className="rounded-xl border border-token bg-[var(--card)] p-8 text-center text-sm opacity-60">
          No items cached yet. Click Refresh.
        </div>
      ) : (
        <div className="space-y-2">
          {(cache.items || []).slice(0, 30).map((it, i) => (
            <a
              key={i}
              href={it.link}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-token bg-[var(--card)] p-4 hover:border-[var(--brand)]/40 transition group"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--brand)]/15 text-[var(--brand)] flex items-center justify-center">
                  <Newspaper size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60 mb-1">
                    <Calendar size={9} />
                    <span>{formatDate(it.pubDate)}</span>
                  </div>
                  <h4 className="text-sm font-bold tracking-tight group-hover:text-[var(--brand)]">
                    {it.title}
                  </h4>
                  {it.summary && (
                    <p className="text-xs opacity-70 mt-1 line-clamp-2">{it.summary}</p>
                  )}
                </div>
                <ExternalLink size={12} className="opacity-40 group-hover:opacity-100 shrink-0 mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Best-effort fetch of the AWS What's New RSS feed.
 *
 * AWS doesn't set CORS headers on the feed, so we go through a public
 * CORS-relay (jina.ai r.jina.ai) which proxies + strips headers + returns
 * the body as text. If that's unavailable, we surface a friendly error
 * and link the user to the direct page.
 */
async function fetchAwsWhatsNew() {
  const proxyUrl = 'https://r.jina.ai/https://aws.amazon.com/about-aws/whats-new/recent/feed/';
  const res = await fetch(proxyUrl, { headers: { Accept: 'application/xml' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  return parseRssItems(text).slice(0, 50);
}

/**
 * Very small / forgiving RSS parser. Handles both raw RSS XML and the
 * Markdown the r.jina.ai proxy sometimes returns.
 */
function parseRssItems(text) {
  // Case 1 — raw RSS XML
  if (text.trim().startsWith('<')) {
    try {
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const items = [...doc.querySelectorAll('item')];
      return items.map((node) => ({
        title:   node.querySelector('title')?.textContent?.trim() || '(untitled)',
        link:    node.querySelector('link')?.textContent?.trim()  || '#',
        pubDate: node.querySelector('pubDate')?.textContent?.trim() || '',
        summary: stripHtml(node.querySelector('description')?.textContent || '').slice(0, 240),
      })).filter((x) => x.link !== '#');
    } catch {
      // fall through to text parsing
    }
  }

  // Case 2 — markdown-ish text from r.jina.ai. We grep [title](link) pairs.
  const items = [];
  const re = /\[([^\]]{6,})\]\((https?:\/\/aws\.amazon\.com\/about-aws\/whats-new\/[^\s)]+)\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    items.push({ title: m[1].trim(), link: m[2], pubDate: '', summary: '' });
    if (items.length >= 60) break;
  }
  return items;
}

function stripHtml(s) {
  return (s || '').replace(/<[^>]+>/g, '').trim();
}

function formatDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : s;
  } catch { return s; }
}

function timeAgo(ts) {
  const secs = Math.round((Date.now() - ts) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.round(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.round(secs / 3600)} hr ago`;
  return `${Math.round(secs / 86400)} day(s) ago`;
}

// ═══════════════════════════════════════════════════════════════════
// HOW TO UPDATE
// ═══════════════════════════════════════════════════════════════════

function HowToUpdateTab() {
  const updateCmd = `cd "$(pwd)" && claude "Update AWS Career Launchpad Pro — pull the latest changes Claude has shipped, run the build, restart the dev server."`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-[var(--brand)]/30 bg-[var(--brand)]/[0.04] p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
            <Wrench size={18} />
          </div>
          <div>
            <h3 className="text-lg font-bold">Updating the app</h3>
            <p className="text-sm opacity-80 mt-1">
              This app is a local Vite React frontend you run on your machine. Updates ship as code
              changes — easiest path is to ask <strong>Claude Code</strong> to apply them.
            </p>
          </div>
        </div>
      </div>

      <StepCard num={1} title="Open Claude Code in this project's folder" icon={Terminal}>
        <p>
          Open a terminal in <code className="px-1 py-0.5 rounded bg-[var(--card-2)] text-xs">C:\Users\zinc9\OneDrive\Desktop\Projects\AWS Prep</code> and run:
        </p>
        <pre className="mt-2 rounded-lg bg-[var(--card-2)]/60 border border-token p-3 text-xs font-mono overflow-x-auto">claude</pre>
        <p className="mt-2 text-xs opacity-70">
          If you don't have Claude Code installed yet, get it at&nbsp;
          <a href="https://docs.claude.com/claude-code/setup" target="_blank" rel="noreferrer" className="underline text-electric">
            docs.claude.com/claude-code/setup
          </a>.
        </p>
      </StepCard>

      <StepCard num={2} title="Ask Claude Code for the latest changes" icon={Sparkles}>
        <p>Paste this prompt:</p>
        <pre className="mt-2 rounded-lg bg-[var(--card-2)]/60 border border-token p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
{`Run a sweep on AWS Career Launchpad Pro:
1. Re-verify the Console UI references in stepGuide.js against the current AWS console (check the AWS What's New feed for anything that changed in the last 14 days).
2. Add any new walkthroughs that would help me on the next 3 projects in my roadmap.
3. Make sure all URL strings in the data files render as clickable in the UI.
4. Run npm run build at the end and confirm it succeeds.`}
        </pre>
        <p className="mt-2 text-xs opacity-70">
          Claude will read the codebase, make the changes, run the build, and tell you what shipped.
        </p>
      </StepCard>

      <StepCard num={3} title="Refresh this app — HMR picks the changes up" icon={Rocket}>
        <p>
          If the dev server is still running (<code className="px-1 py-0.5 rounded bg-[var(--card-2)] text-xs">npm run dev</code>),
          Vite's hot-module reload swaps the new files in automatically. If you closed the server, run:
        </p>
        <pre className="mt-2 rounded-lg bg-[var(--card-2)]/60 border border-token p-3 text-xs font-mono overflow-x-auto">npm run dev -- --port 5273</pre>
      </StepCard>

      <StepCard num={4} title="(Optional) Pull changes from a git remote" icon={GitBranch}>
        <p>If you've connected this repo to GitHub:</p>
        <pre className="mt-2 rounded-lg bg-[var(--card-2)]/60 border border-token p-3 text-xs font-mono overflow-x-auto">git pull origin main && npm install && npm run dev</pre>
      </StepCard>

      <StepCard num={5} title="What Claude can check for you automatically" icon={Shield}>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span> AWS What's New since last visit — flag anything that impacts your walkthroughs.</li>
          <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span> AWS Console UI redesigns — re-verify screenshots / labels.</li>
          <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span> AWS Security Bulletins relevant to services you've deployed.</li>
          <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span> Free Tier changes that would break your $5 budget assumptions.</li>
          <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span> npm package vulnerabilities (npm audit).</li>
          <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span> AWS SDK version bumps so verifier calls keep working.</li>
        </ul>
        <p className="mt-3 text-xs opacity-70">
          Just say: <em>"Claude, do a freshness sweep — check everything in this list and tell me what needs updating."</em>
        </p>
      </StepCard>

      <div className="rounded-2xl border border-token bg-[var(--card)] p-4 flex items-center gap-3">
        <Github size={16} className="text-[var(--brand)]" />
        <div className="flex-1">
          <div className="text-sm font-bold">Want auto-update via GitHub?</div>
          <div className="text-xs opacity-70">
            Push this project to a private GitHub repo, then ask Claude to set up a&nbsp;
            <a href="https://docs.github.com/en/actions" target="_blank" rel="noreferrer" className="underline text-electric">
              GitHub Action
            </a>
            &nbsp;that opens a PR whenever AWS ships a relevant change.
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ num, title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl border border-token bg-[var(--card)] p-5">
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-aws text-ink-950 flex items-center justify-center font-extrabold text-sm">
          {num}
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold flex items-center gap-2">
            {Icon && <Icon size={14} className="text-[var(--brand)]" />}
            {title}
          </h4>
        </div>
      </div>
      <div className="pl-12 text-sm space-y-1">{children}</div>
    </div>
  );
}
