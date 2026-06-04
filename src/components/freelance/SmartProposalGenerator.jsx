/**
 * SmartProposalGenerator.jsx — FR-02
 *
 * The structured 6-section proposal generator UI.
 *
 * Auto-reads pasted job descriptions (and ?prefill= from URL when the user
 * clicked "Generate Proposal" on the Gig Feed), emits a Hook /
 * Understanding / My Approach / Why Me / Timeline / CTA proposal in the
 * 200-350-word range, and gives the user every editing affordance they
 * need: Copy, Edit (toggle inline editor), Regenerate (new variant),
 * Shorten, Expand, plus a live word counter.
 *
 * Does NOT replace the existing ProposalBuilder — sits beside it as a
 * dedicated sub-tab.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles, Wand2, Copy, Check, RefreshCw, Minimize2, Maximize2,
  Pencil, Save, FileText, ClipboardPaste, AlertCircle, Eye, Target,
  Mail,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { useFreelance } from '../../context/FreelanceContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { generateSmartProposal, wordCount } from '../../lib/smartProposalGenerator.js';
import { logProposal } from '../../lib/proposalLog.js';
import { ApproachRecommendationPanel } from '../build/ApproachRecommendationPanel.jsx';
import { getApproachById } from '../../lib/approachRecommender.js';
import { BookDiscoveryCallButton } from '../calendar/BookDiscoveryCallButton.jsx';
import { RateBenchmarkCard } from './RateBenchmarkCard.jsx';
import { ProactiveSuggestionsBanner } from '../common/ProactiveSuggestionsBanner.jsx';
import { cn } from '../../lib/utils.js';

const TARGET_LOW = 200;
const TARGET_HIGH = 350;

export function SmartProposalGenerator() {
  const { profile } = useApp();
  const { addProposal } = useFreelance();
  const toast = useToast();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [jd, setJd] = useState(() => params.get('prefill') || '');
  const [proposal, setProposal] = useState(null);
  const [edited, setEdited] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [seed, setSeed] = useState(0);
  const [lengthMode, setLengthMode] = useState('normal'); // normal | short | long
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [approach, setApproach] = useState(null); // FR-04 — null = use recommended

  // FR-02: react to deep-link prefill from Gig Feed
  useEffect(() => {
    const p = params.get('prefill');
    if (p && p !== jd) {
      setJd(p);
      // Auto-generate when arriving via deep-link
      setTimeout(() => doGenerate({ jdOverride: p, seedOverride: 0, lengthOverride: 'normal' }), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // FR-04: apply the chosen approach annotation to the proposal text
  // This is a non-destructive transform — `edited` and `proposal.fullText`
  // stay untouched, we just decorate the My-approach section on the fly.
  const displayText = useMemo(() => {
    const base = edited || proposal?.fullText || '';
    if (!proposal || !approach) return base;
    return injectApproachLine(base, approach);
  }, [edited, proposal, approach]);

  const wc = useMemo(() => wordCount(displayText), [displayText]);
  const wcStatus = useMemo(() => {
    if (wc === 0) return { tone: 'opacity-50', label: '' };
    if (wc < TARGET_LOW) return { tone: 'text-warning', label: `too short (target ${TARGET_LOW}-${TARGET_HIGH})` };
    if (wc > TARGET_HIGH) return { tone: 'text-warning', label: `over target (${TARGET_LOW}-${TARGET_HIGH})` };
    return { tone: 'text-success', label: 'in target range' };
  }, [wc]);

  function doGenerate({ jdOverride, seedOverride, lengthOverride } = {}) {
    setError('');
    const useJd = jdOverride ?? jd;
    if (!useJd.trim()) {
      setError('Paste a job description first — even a short one works.');
      return;
    }
    try {
      const result = generateSmartProposal({
        jd: useJd,
        profile,
        seed: seedOverride ?? seed,
        lengthMode: lengthOverride ?? lengthMode,
      });
      setProposal(result);
      setEdited(result.fullText);
      setIsEditing(false);

      // FR-05: auto-log the proposal (dedupes by JD + same day, so
      // regenerates update the existing entry instead of inflating count)
      try {
        logProposal({
          jd: useJd,
          gigTitle: result.analysis?.projectTitle || '',
          platform: 'manual',
          text: result.fullText,
          approach: approach || 'auto',
          services: result.analysis?.services || [],
        });
      } catch (logErr) {
        // Non-fatal — proposal generation succeeded, logging failed
        console.warn('[SmartProposalGenerator] auto-log failed:', logErr);
      }
    } catch (err) {
      console.error('[SmartProposalGenerator]', err);
      setError('Could not generate proposal — try a longer job description.');
    }
  }

  function handleRegenerate() {
    const next = seed + 1;
    setSeed(next);
    doGenerate({ seedOverride: next });
    toast?.info?.('New variant generated');
  }

  function handleShorten() {
    setLengthMode('short');
    doGenerate({ lengthOverride: 'short' });
  }

  function handleExpand() {
    setLengthMode('long');
    doGenerate({ lengthOverride: 'long' });
  }

  function handleNormal() {
    setLengthMode('normal');
    doGenerate({ lengthOverride: 'normal' });
  }

  async function handleCopy() {
    const text = displayText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(stripMarkdown(text));
      setCopied(true);
      toast?.success?.('Proposal copied to clipboard');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast?.error?.('Clipboard blocked — select the text manually with Ctrl+A.');
    }
  }

  function handlePasteFromClipboard() {
    navigator.clipboard.readText()
      .then((t) => {
        if (!t?.trim()) return toast?.info?.('Clipboard is empty');
        setJd(t);
        toast?.success?.('Pasted from clipboard');
      })
      .catch(() => toast?.error?.('Clipboard read blocked — paste manually with Ctrl+V.'));
  }

  // FR-03: format proposal as email + deep-link to Email Outreach tab
  function handleAlsoSendAsEmail() {
    if (!proposal) return;
    const proposalText = displayText;
    const title = proposal.analysis?.projectTitle || 'your AWS project';
    const clientFirst = proposal.analysis?.clientName?.split(' ')[0] || 'there';

    // Re-format the markdown-flavoured proposal into a clean email
    const emailBody = formatProposalAsEmail(proposalText, clientFirst, proposal.meta?.firstName || 'David');
    const subject = `Proposal — ${title}`;

    const search = new URLSearchParams({
      tab: 'outreach',
      mode: 'followup',     // proposal-style emails fit best as a follow-up tone
      title,
      subject,
      prefill: emailBody,
    });
    navigate(`/freelance?${search.toString()}`);
    toast?.success?.('Proposal copied into Email Outreach');
  }

  function handleSaveToTracker() {
    if (!proposal) return;
    const entry = {
      title: proposal.analysis?.projectTitle || 'Smart-generated proposal',
      client: proposal.analysis?.clientName || 'Prospect',
      content: displayText,
      approach: approach || 'auto',
      jd: jd,
      services: proposal.analysis?.services || [],
      status: 'draft',
      source: 'smart-generator',
      createdAt: new Date().toISOString(),
    };
    addProposal?.(entry);
    toast?.success?.('Saved to Proposals → Tracker');
  }

  return (
    <div className="space-y-4">
      {/* ─────── Header ─────── */}
      <div className="surface rounded-2xl p-5 gradient-border">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
          FR-02 · Smart Generator
        </div>
        <h2 className="text-xl font-extrabold flex items-center gap-2">
          <Sparkles size={18} className="text-aws-orange" />
          6-Section Smart Proposal
        </h2>
        <p className="text-[12.5px] opacity-80 mt-1.5 leading-relaxed">
          Paste the job description (or arrive here from the Live Gigs tab). I'll generate a personalised
          proposal with <strong>Hook · Understanding · My Approach · Why Me · Timeline · CTA</strong> in the
          200-350 word range. Hit <em>Regenerate</em> for a different angle, <em>Shorten</em> or <em>Expand</em>
          to adjust length, then <em>Copy</em> or <em>Save to Tracker</em>.
        </p>
      </div>

      {/* ─────── Input ─────── */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
            Job description
          </label>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePasteFromClipboard}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
            >
              <ClipboardPaste size={11} /> Paste from clipboard
            </button>
            {jd && (
              <span className="text-[10.5px] opacity-60">{wordCount(jd)} words in JD</span>
            )}
          </div>
        </div>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={6}
          placeholder="Paste the full job description here — title, requirements, budget, timeline, anything they mentioned. The more detail, the more personalised the proposal."
          className="w-full rounded-xl bg-[var(--card-2)] border border-token px-3 py-2.5 text-[13px] outline-none focus:border-aws-orange resize-y leading-relaxed"
        />

        {error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => doGenerate()}
            disabled={!jd.trim()}
            className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Wand2 size={14} /> {proposal ? 'Regenerate' : 'Generate proposal'}
          </button>
          {proposal && (
            <>
              <button
                onClick={handleRegenerate}
                className="btn btn-ghost inline-flex items-center gap-1.5"
                title="Different angle, same JD"
              >
                <RefreshCw size={12} /> New variant
              </button>
              <div className="inline-flex items-center gap-0 rounded-lg overflow-hidden border border-token">
                <button
                  onClick={handleShorten}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] font-bold transition',
                    lengthMode === 'short' ? 'bg-aws-orange/15 text-aws-orange' : 'hover:bg-[var(--card-2)]'
                  )}
                  title="Aim for ~200 words"
                >
                  <Minimize2 size={11} /> Shorten
                </button>
                <button
                  onClick={handleNormal}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] font-bold transition border-l border-token',
                    lengthMode === 'normal' ? 'bg-aws-orange/15 text-aws-orange' : 'hover:bg-[var(--card-2)]'
                  )}
                  title="Aim for ~275 words"
                >
                  <Target size={11} /> Target
                </button>
                <button
                  onClick={handleExpand}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 text-[11.5px] font-bold transition border-l border-token',
                    lengthMode === 'long' ? 'bg-aws-orange/15 text-aws-orange' : 'hover:bg-[var(--card-2)]'
                  )}
                  title="Aim for ~350 words"
                >
                  <Maximize2 size={11} /> Expand
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─────── Phase 5 Proactive Suggestions ─────── */}
      {proposal && (
        <ProactiveSuggestionsBanner
          brief={jd}
          services={proposal.analysis?.services || []}
        />
      )}

      {/* ─────── FR-04 Recommended Approach panel ─────── */}
      {proposal && (
        <ApproachRecommendationPanel
          brief={jd}
          services={proposal.analysis?.services || []}
          value={approach}
          onChange={(id) => setApproach(id)}
        />
      )}

      {/* ─────── FR-06 Rate Benchmark ─────── */}
      {proposal && <RateBenchmarkCard brief={jd} />}

      {/* ─────── Output ─────── */}
      {proposal && (
        <div className="surface rounded-2xl p-5 space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-token">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
                Your proposal
              </span>
              <span className={cn('text-[11px] font-bold', wcStatus.tone)} title="Target: 200-350 words">
                {wc} words {wcStatus.label && `· ${wcStatus.label}`}
              </span>
              {proposal.meta?.cert && (
                <span className="text-[10.5px] opacity-60">
                  · cert: {proposal.meta.cert.replace(/AWS Certified /, '')}
                </span>
              )}
              {profile?.savedHourlyRate?.amount > 0 && (
                <span className="text-[10.5px] font-bold text-success" title="Your saved floor rate — set on /rate-calculator">
                  · your floor: ${Math.round(profile.savedHourlyRate.amount)}/hr
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEditing((e) => !e)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
              >
                {isEditing ? <><Eye size={11} /> Preview</> : <><Pencil size={11} /> Edit</>}
              </button>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
              >
                {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
              </button>
              <button
                onClick={handleAlsoSendAsEmail}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold border border-aws-orange/40 text-aws-orange hover:bg-aws-orange/10 transition"
                title="Open this proposal in Email Outreach pre-filled"
              >
                <Mail size={11} /> Also send as Email
              </button>
              <BookDiscoveryCallButton
                variant="outline"
                defaultTitle={`Discovery call — ${proposal.analysis?.projectTitle || 'AWS project'}`}
                defaultDescription={`Project: ${proposal.analysis?.projectTitle || 'AWS project'}\n\nServices: ${(proposal.analysis?.services || []).join(', ') || 'TBD'}\n\nNotes from proposal:\n${stripMarkdown(displayText).slice(0, 500)}`}
              />
              <button
                onClick={handleSaveToTracker}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11.5px] font-bold bg-gradient-aws text-ink-950 hover:brightness-110 transition"
              >
                <Save size={11} /> Save to Tracker
              </button>
            </div>
          </div>

          {/* Body — edit mode or preview */}
          {isEditing ? (
            <textarea
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              rows={18}
              className="w-full rounded-xl bg-[var(--card-2)] border border-token px-3 py-3 text-[13px] outline-none focus:border-aws-orange leading-relaxed font-mono"
            />
          ) : (
            <ProposalPreview text={displayText} sections={proposal.sections} />
          )}

          {/* Section legend (always visible) */}
          <SectionLegend sections={proposal.sections} />
        </div>
      )}

      {/* Empty hint */}
      {!proposal && !jd && (
        <div className="surface rounded-2xl p-10 text-center opacity-70 border border-dashed border-token">
          <FileText size={28} className="mx-auto mb-3 opacity-50" />
          <div className="text-sm font-bold mb-1">No proposal yet</div>
          <div className="text-[12px]">
            Paste a job description above, or visit the <strong>Live Gigs</strong> tab and click "Generate Proposal" on any card to arrive here pre-filled.
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Preview — renders the markdown-ish proposal text with section headers
// styled, paragraphs preserved.
// ════════════════════════════════════════════════════════════════════
function ProposalPreview({ text }) {
  const lines = (text || '').split('\n');
  return (
    <article className="prose-proposal max-w-none rounded-xl bg-[var(--card-2)] border border-token p-4 space-y-2 text-[13.5px] leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const headerMatch = line.match(/^\*\*([^*]+)\*\*$/);
        if (headerMatch) {
          return (
            <h4 key={i} className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange pt-2">
              {headerMatch[1]}
            </h4>
          );
        }
        if (/^\d+\.\s/.test(line) || /^• /.test(line)) {
          return <div key={i} className="pl-3">{line}</div>;
        }
        return <p key={i} className="m-0">{line}</p>;
      })}
    </article>
  );
}

function SectionLegend({ sections }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {sections.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--card-2)] border border-token text-[10px] font-bold"
        >
          <Check size={9} className="text-success" /> {s.label}
        </span>
      ))}
    </div>
  );
}

// Strip markdown bold (**) when copying so the recipient sees clean plain text
function stripMarkdown(s) {
  return String(s || '').replace(/\*\*([^*]+)\*\*/g, '$1');
}

// FR-04 — Add a "Delivered as <approach>" sentence under the My approach
// header. Non-destructive — operates on a copy of the text.
const APPROACH_DELIVERY_LINE = {
  console:   '_Delivered as click-by-click AWS Console instructions with annotated screenshots._',
  cli:       '_Delivered as bash scripts using the AWS CLI v2 — drop them in your CI pipeline._',
  terraform: '_Delivered as Terraform modules with remote state, plan/apply review, reusable across dev/staging/prod._',
  cfn:       '_Delivered as CloudFormation templates (or AWS CDK if you prefer TypeScript) — fully AWS-native._',
};

function injectApproachLine(text, approachId) {
  const line = APPROACH_DELIVERY_LINE[approachId];
  if (!line) return text;
  // First, strip any previous approach line we may have inserted earlier
  let out = String(text || '').replace(/^_Delivered as [^\n]+_\n/gm, '');
  // Then inject the new line right after the **My approach** header
  out = out.replace(/(\*\*My approach\*\*)\n/, `$1\n${line}\n`);
  return out;
}

// FR-03: convert markdown-flavoured proposal → clean email body.
// Markdown headers (**X**) become plain header lines, bullets stay,
// numbered approach steps stay.
function formatProposalAsEmail(proposalText, clientFirst, firstName) {
  let body = String(proposalText || '');
  // Replace **X** with plain headers
  body = body.replace(/^\*\*([^*]+)\*\*$/gm, '$1');
  // Tidy double blanks
  body = body.replace(/\n{3,}/g, '\n\n').trim();
  // Email needs a fresh top-line greeting (the proposal had one but we
  // want to be sure it addresses the client by their real name)
  const lines = body.split('\n');
  if (/^hi\s/i.test(lines[0])) {
    lines[0] = `Hi ${clientFirst},`;
    body = lines.join('\n');
  } else {
    body = `Hi ${clientFirst},\n\n${body}`;
  }
  // The proposal already ends with a CTA — leave it. Add a sign-off if
  // none is detected.
  if (!/—\s*\w+\s*$/.test(body) && !/best regards/i.test(body)) {
    body += `\n\nBest regards,\n${firstName}`;
  }
  return body;
}
