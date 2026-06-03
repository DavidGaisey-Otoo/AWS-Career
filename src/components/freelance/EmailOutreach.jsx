/**
 * EmailOutreach.jsx — FR-03
 *
 * A focused, simplified email composer inside the Freelance Hub. Three
 * outreach modes covering the freelance lifecycle:
 *
 *   1. Follow-up    — after a proposal was sent and went quiet
 *   2. Cold outreach — to a prospect who hasn't asked for a quote yet
 *   3. Thank you    — after a gig wraps, to ask for review / referral
 *
 * Auto-reads URL params from FR-02:
 *   ?prefill=<encoded body>   → drops into the Body field
 *   ?subject=<encoded>        → drops into Subject
 *   ?title=<encoded>          → used to seed subject suggestions
 *   ?mode=followup|cold|thanks
 *
 * Generates subject lines from the gig title using a small set of
 * battle-tested patterns.
 *
 * The dedicated full Email System (10-type composer + tracker +
 * library at /email-composer) is NOT removed — there's a prominent
 * "Open full Email System →" link at the top of this tab.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Mail, Send, Copy, Check, Sparkles, ExternalLink, RefreshCw,
  ArrowRight, ClipboardPaste, AlertCircle, MessageCircle, Heart, Search,
  Wand2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { gmailComposeUrl, outlookComposeUrl, mailtoUrl } from '../../data/emailTemplates.js';
import { BookDiscoveryCallButton } from '../calendar/BookDiscoveryCallButton.jsx';
import { cn } from '../../lib/utils.js';

// ════════════════════════════════════════════════════════════════════
// Outreach modes
// ════════════════════════════════════════════════════════════════════
const MODES = [
  {
    id: 'followup',
    label: 'Follow-up',
    icon: MessageCircle,
    blurb: 'After you sent a proposal and they went quiet. Short, friendly nudge.',
  },
  {
    id: 'cold',
    label: 'Cold outreach',
    icon: Search,
    blurb: 'To a prospect who has not asked for a quote. Lead with value, not a pitch.',
  },
  {
    id: 'thanks',
    label: 'Thank you',
    icon: Heart,
    blurb: 'After a gig wraps. Ask for a review or a referral while you are top of mind.',
  },
];

// ════════════════════════════════════════════════════════════════════
// Subject-line generator — picks from battle-tested patterns
// ════════════════════════════════════════════════════════════════════
function subjectsFor(mode, gigTitle) {
  const t = gigTitle ? cleanTitle(gigTitle) : 'your AWS project';
  switch (mode) {
    case 'followup':
      return [
        `Following up on the ${t} proposal`,
        `Re: ${t} — quick check-in`,
        `Still interested in moving forward with ${t}?`,
        `Quick nudge on ${t}`,
        `${t} — anything I can clarify?`,
      ];
    case 'cold':
      return [
        `Idea for your AWS setup at {{company}}`,
        `Cutting AWS costs at {{company}} — quick thought`,
        `Saw your team is hiring AWS — could I help?`,
        `2-minute read: AWS architecture suggestion for {{company}}`,
        `Noticed {{company}} is scaling on AWS — happy to share what I'd do`,
      ];
    case 'thanks':
      return [
        `Thank you — ${t} is live`,
        `${t} delivered — and a small ask`,
        `It was a pleasure working on ${t}`,
        `${t} wrap-up + a quick favour`,
        `Thanks for trusting me with ${t}`,
      ];
    default:
      return [`Re: ${t}`];
  }
}

// ════════════════════════════════════════════════════════════════════
// Body builders — when no prefill is provided
// ════════════════════════════════════════════════════════════════════
function bodyFor(mode, { gigTitle, firstName, recipientName }) {
  const t = gigTitle ? cleanTitle(gigTitle) : 'your AWS project';
  const greet = `Hi ${recipientName || 'there'},`;
  const sign = `Best regards,\n${firstName || 'David'}`;
  switch (mode) {
    case 'followup':
      return [
        greet, '',
        `Just floating my proposal on ${t} back to the top of your inbox in case it got buried.`,
        '',
        `Happy to jump on a 15-minute call this week to walk through anything — architecture, timeline, scope, or budget. Just send me a time that works for you.`,
        '',
        `If the project moved in a different direction, no worries — would still love a quick "not now" so I know to stop nudging.`,
        '',
        sign,
      ].join('\n');

    case 'cold':
      return [
        greet, '',
        `I came across your work and noticed you are running on AWS. I am an AWS-certified architect who has built ${t.length < 30 ? 'production stacks' : 'similar production stacks'} for teams like yours.`,
        '',
        `Without making this a long pitch — here is one specific idea I would explore at your company:`,
        ` • Move the [workload] to [service] to cut [cost/latency/effort] by ~30%`,
        '',
        `If that sounds useful, I would happily share a free 1-page architecture sketch in exchange for 15 minutes of your time. No commitment.`,
        '',
        sign,
      ].join('\n');

    case 'thanks':
      return [
        greet, '',
        `Just a quick note to say thank you for trusting me with ${t}. It was a real pleasure to deliver.`,
        '',
        `Two small asks while it is fresh:`,
        ` 1. If the work hit the mark, a short review on [Upwork / LinkedIn / Trustpilot] would mean a lot.`,
        ` 2. If you know anyone else struggling with AWS, an introduction would be hugely appreciated — I can offer them a free consultation.`,
        '',
        `Either way — wishing you and the team continued success.`,
        '',
        sign,
      ].join('\n');

    default:
      return greet + '\n\n' + sign;
  }
}

// ════════════════════════════════════════════════════════════════════
// Main component
// ════════════════════════════════════════════════════════════════════
export function EmailOutreach() {
  const { profile } = useApp();
  const toast = useToast();
  const [params] = useSearchParams();

  const firstName = (profile?.name || 'David').split(' ')[0];

  const [mode, setMode] = useState(() => {
    const m = params.get('mode');
    return MODES.some((x) => x.id === m) ? m : 'followup';
  });
  const [gigTitle, setGigTitle] = useState(() => decodeMaybe(params.get('title')) || '');
  const [recipientName, setRecipientName] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(() => decodeMaybe(params.get('subject')) || '');
  const [body, setBody] = useState(() => decodeMaybe(params.get('prefill')) || '');
  const [copied, setCopied] = useState(false);

  // FR-03: react to deep-link prefill (so re-navigating to this tab updates fields)
  useEffect(() => {
    const newTitle = decodeMaybe(params.get('title'));
    const newSubject = decodeMaybe(params.get('subject'));
    const newBody = decodeMaybe(params.get('prefill'));
    const newMode = params.get('mode');
    if (newTitle && newTitle !== gigTitle) setGigTitle(newTitle);
    if (newSubject && newSubject !== subject) setSubject(newSubject);
    if (newBody && newBody !== body) setBody(newBody);
    if (newMode && MODES.some((x) => x.id === newMode)) setMode(newMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // If body is empty when mode changes, generate from template
  function generateBody() {
    const b = bodyFor(mode, { gigTitle, firstName, recipientName });
    setBody(b);
  }

  // If subject is empty, suggest one
  function suggestSubject() {
    const list = subjectsFor(mode, gigTitle);
    setSubject(list[0]);
  }

  const subjectSuggestions = useMemo(
    () => subjectsFor(mode, gigTitle),
    [mode, gigTitle]
  );

  async function handleCopy() {
    const text = `Subject: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast?.success?.('Email copied to clipboard');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast?.error?.('Clipboard blocked — select the text manually.');
    }
  }

  function handlePasteFromClipboard() {
    navigator.clipboard.readText()
      .then((t) => {
        if (!t?.trim()) return toast?.info?.('Clipboard is empty');
        setBody(t);
        toast?.success?.('Pasted from clipboard');
      })
      .catch(() => toast?.error?.('Clipboard read blocked.'));
  }

  // External mail-client launchers — reuse the existing helpers
  const ctx = { to: to.trim(), subject: subject.trim(), body: body.trim() };
  const gmailHref = gmailComposeUrl(ctx);
  const outlookHref = outlookComposeUrl(ctx);
  const mailtoHref = mailtoUrl(ctx);

  return (
    <div className="space-y-4">
      {/* ─────── Header ─────── */}
      <div className="surface rounded-2xl p-5 gradient-border">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-1">
              FR-03 · Email outreach (in-hub shortcut)
            </div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Mail size={18} className="text-aws-orange" />
              Send the email that wins the gig
            </h2>
            <p className="text-[12.5px] opacity-80 mt-1.5 leading-relaxed max-w-2xl">
              A focused composer for the 3 emails that move freelance work forward:
              <strong> follow-up</strong>, <strong>cold outreach</strong>, and <strong>thank you</strong>.
              Use this for quick sends; jump to the full system for tracker + 10 templates + library.
            </p>
          </div>
          <Link
            to="/email-composer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
          >
            Open full Email System <ArrowRight size={11} />
          </Link>
        </div>

        {/* Mode picker */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition',
                  active
                    ? 'border-aws-orange bg-aws-orange/10 shadow-glow-orange'
                    : 'border-token hover:border-aws-orange/40'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={13} className={active ? 'text-aws-orange' : ''} />
                  <span className={cn('text-[12.5px] font-extrabold', active && 'text-aws-orange')}>
                    {m.label}
                  </span>
                </div>
                <div className="text-[11px] opacity-75 leading-snug">{m.blurb}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────── Context ─────── */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
          Context (used to personalise the email)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[10.5px] font-bold opacity-75 mb-1">Gig / project title</div>
            <input
              type="text"
              value={gigTitle}
              onChange={(e) => setGigTitle(e.target.value)}
              placeholder="e.g. AWS Lambda data pipeline"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-bold opacity-75 mb-1">Recipient first name</div>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Sarah"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </div>
          <div>
            <div className="text-[10.5px] font-bold opacity-75 mb-1">To (email address)</div>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="sarah@example.com"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={generateBody} className="btn btn-primary inline-flex items-center gap-1.5">
            <Wand2 size={13} /> {body ? 'Regenerate body' : 'Generate from template'}
          </button>
          <button onClick={handlePasteFromClipboard} className="btn btn-ghost inline-flex items-center gap-1.5">
            <ClipboardPaste size={12} /> Paste from clipboard
          </button>
        </div>
      </div>

      {/* ─────── Subject ─────── */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
            Subject line
          </label>
          <button
            onClick={suggestSubject}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition"
          >
            <Sparkles size={10} /> Auto-suggest
          </button>
        </div>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Click a suggestion below or type your own"
          className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[13px] font-bold outline-none focus:border-aws-orange"
        />
        <div className="flex flex-wrap gap-1.5">
          {subjectSuggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setSubject(s)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[10.5px] font-bold border transition text-left',
                s === subject
                  ? 'border-aws-orange bg-aws-orange/15 text-aws-orange'
                  : 'border-token opacity-75 hover:opacity-100 hover:border-aws-orange/40'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ─────── Body ─────── */}
      <div className="surface rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange">
            Email body
          </label>
          <span className="text-[10.5px] opacity-60">
            {body ? `${body.trim().split(/\s+/).filter(Boolean).length} words` : 'empty'}
          </span>
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          placeholder="Click 'Generate from template' above to start, or paste a proposal from the Smart Generator using the 'Also send as Email' button there."
          className="w-full rounded-xl bg-[var(--card-2)] border border-token px-3 py-3 text-[13px] outline-none focus:border-aws-orange leading-relaxed"
        />

        {!body && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[11.5px] flex items-start gap-2">
            <AlertCircle size={12} className="text-warning mt-0.5 flex-shrink-0" />
            <span>
              <strong>Tip:</strong> Click <em>Generate from template</em> to start, or jump back to the Smart Generator
              and click <em>Also send as Email</em> to drop a proposal in here pre-formatted.
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-token">
          <button
            onClick={handleCopy}
            disabled={!body}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition disabled:opacity-50"
          >
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy subject + body</>}
          </button>
          <a
            href={gmailHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if (!body) e.preventDefault(); }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold bg-gradient-aws text-ink-950 hover:brightness-110 transition',
              !body && 'opacity-50 pointer-events-none'
            )}
          >
            <Send size={12} /> Open in Gmail <ExternalLink size={10} />
          </a>
          <a
            href={outlookHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { if (!body) e.preventDefault(); }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition',
              !body && 'opacity-50 pointer-events-none'
            )}
          >
            <Send size={12} /> Open in Outlook <ExternalLink size={10} />
          </a>
          <a
            href={mailtoHref}
            onClick={(e) => { if (!body) e.preventDefault(); }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition',
              !body && 'opacity-50 pointer-events-none'
            )}
          >
            <Mail size={12} /> Default mail app
          </a>
          <BookDiscoveryCallButton
            variant="outline"
            defaultTitle={gigTitle ? `Discovery call — ${gigTitle}` : 'Discovery call'}
            defaultDescription={body || subject}
            defaultAttendee={to}
            className="ml-auto"
          />
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function decodeMaybe(s) {
  if (!s) return '';
  try { return decodeURIComponent(s); } catch { return s; }
}

function cleanTitle(t) {
  const s = String(t || '').trim();
  if (s.length > 60) return s.slice(0, 60).replace(/\s\S*$/, '') + '…';
  return s;
}
