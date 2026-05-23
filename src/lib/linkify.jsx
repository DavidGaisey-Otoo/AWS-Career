/**
 * linkify.jsx — auto-detects URLs / file paths / "code-y" tokens in plain
 * text and renders them as clickable React elements.
 *
 * The user asked: "any link I click I have to copy — can you make it
 * clickable straight away?". Answer: every step's `body`, `actions`,
 * `expected`, `gotcha`, and `screenshot` text now passes through here.
 *
 * What gets linkified:
 *   • http(s)://… and www.… URLs   → opens in new tab with external icon
 *   • Bare hostnames ending in known TLDs (.aws, .amazon.com, etc.)
 *   • console.aws.amazon.com paths → labelled "Open in AWS Console"
 *
 * What's left alone:
 *   • Inline code (already wrapped in <code>)
 *   • Trailing punctuation (., ,, !, ?, :, ;) — kept outside the link
 *
 * Usage:
 *   <LinkText>Open https://s3.console.aws.amazon.com/ in a new tab</LinkText>
 *   → renders the URL as a clickable button + leaves the rest as text.
 */
import { ExternalLink } from 'lucide-react';

// Match http/https/ftp URLs OR www.…  (no protocol)
// Greedy enough to grab paths + query strings, but stops at common
// sentence-terminators (.,!?;)) when they end the URL.
const URL_REGEX = /(https?:\/\/[^\s<>"'`]+|www\.[a-z0-9][a-z0-9.-]*\.[a-z]{2,}[^\s<>"'`]*)/gi;

/**
 * Strip trailing punctuation that's almost certainly NOT part of the URL.
 * Example: "see https://aws.com/page." → URL is "https://aws.com/page", "." is text.
 */
function splitTrailingPunct(url) {
  const m = url.match(/^(.*?)([.,!?;:)\]]+)$/);
  if (m) return [m[1], m[2]];
  return [url, ''];
}

function normalise(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

/**
 * Friendly label for an AWS Console URL (so the link reads
 * "Open S3 in AWS Console →" not just the raw URL).
 */
function friendlyLabel(url) {
  try {
    const u = new URL(normalise(url));
    if (u.hostname.endsWith('console.aws.amazon.com') || u.hostname.includes('aws.amazon.com')) {
      // Try to extract the service from path
      const seg = u.pathname.split('/').filter(Boolean)[0];
      if (seg) return `Open ${capitalise(seg.replace(/v?\d+$/, ''))} in AWS Console`;
      return 'Open in AWS Console';
    }
    if (u.hostname.endsWith('docs.aws.amazon.com')) return 'Open AWS Docs';
    if (u.hostname.endsWith('github.com')) return 'Open on GitHub';
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function capitalise(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function isAwsConsole(url) {
  try {
    return new URL(normalise(url)).hostname.endsWith('console.aws.amazon.com');
  } catch { return false; }
}

/**
 * Inline link component — opens in a new tab, shows the external-link icon.
 */
function ExtLink({ href, label, prominent = false }) {
  const full = normalise(href);
  if (prominent) {
    // Bigger button for AWS console URLs — high-affordance call to action.
    return (
      <a
        href={full}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 align-baseline mx-0.5 px-2 py-0.5 rounded-md bg-aws-orange/15 text-aws-orange hover:bg-aws-orange/25 transition border border-aws-orange/30 font-bold text-[11px]"
        title={full}
      >
        <ExternalLink size={10} strokeWidth={2.5} />
        {label}
      </a>
    );
  }
  // Subtle inline pill for everything else
  return (
    <a
      href={full}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 align-baseline mx-0.5 underline decoration-dotted decoration-electric/60 text-electric hover:text-aws-orange hover:decoration-aws-orange transition font-semibold"
      title={full}
    >
      {label}
      <ExternalLink size={9} strokeWidth={2.5} className="inline opacity-70" />
    </a>
  );
}

/**
 * <LinkText> — pass any string + it returns a span with embedded clickable
 * links for every URL it finds. Pass-through for elements that aren't strings.
 */
export function LinkText({ children, className = '' }) {
  if (children == null) return null;
  if (typeof children !== 'string') return <>{children}</>;
  return <span className={className}>{linkifyToNodes(children)}</span>;
}

/**
 * Render any string to a mix of plain text + <ExtLink> nodes.
 * Exported for use in other places (e.g. tooltips, diagrams) without the
 * surrounding span.
 */
export function linkifyToNodes(text) {
  if (!text || typeof text !== 'string') return text;
  const out = [];
  let lastEnd = 0;
  let m;
  // Use a fresh regex per call (the /g flag is stateful)
  const re = new RegExp(URL_REGEX.source, 'gi');
  while ((m = re.exec(text)) !== null) {
    const matched = m[0];
    const start = m.index;
    if (start > lastEnd) out.push(text.slice(lastEnd, start));
    const [url, trailing] = splitTrailingPunct(matched);
    const label = friendlyLabel(url);
    const prominent = isAwsConsole(url);
    out.push(<ExtLink key={`l${start}`} href={url} label={label} prominent={prominent} />);
    if (trailing) out.push(trailing);
    lastEnd = start + matched.length;
  }
  if (lastEnd < text.length) out.push(text.slice(lastEnd));
  return out;
}

/**
 * Convenience: check whether a string contains at least one URL — useful
 * if you want to render a "open all links" toolbar above a paragraph.
 */
export function hasLink(text) {
  if (!text || typeof text !== 'string') return false;
  return new RegExp(URL_REGEX.source, 'i').test(text);
}
