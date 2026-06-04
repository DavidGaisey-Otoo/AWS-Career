/**
 * icalExport.js — RFC 5545 iCalendar (.ics) generator.
 *
 * Why this exists: Google Calendar OAuth has been a friction point
 * (Client Secret pasting, redirect URI mismatches, PKCE storage). This
 * is the user-zero-config alternative — generate a .ics file in the
 * browser, the user double-clicks it, and their default calendar app
 * (Apple Calendar, Outlook, Google Calendar, Thunderbird, anything)
 * adds it instantly. Works offline. No accounts, no OAuth, no API.
 *
 * The format is plain text per RFC 5545 — well-supported everywhere
 * since 1998. Spec: https://datatracker.ietf.org/doc/html/rfc5545
 */

/**
 * @param {Object} opts
 * @param {string} opts.summary            — event title
 * @param {string} [opts.description]      — body (sanitised + escaped)
 * @param {string} [opts.location]         — physical or virtual location
 * @param {Date|string} opts.start         — start time
 * @param {Date|string} opts.end           — end time
 * @param {string[]} [opts.attendees]      — email addresses
 * @param {string} [opts.organizerEmail]   — your email (cosmetic)
 * @param {string} [opts.organizerName]    — your name
 * @param {string} [opts.url]              — link surfaced in supporting clients
 * @returns {string} The .ics file contents
 */
export function buildIcs({
  summary,
  description = '',
  location = '',
  start,
  end,
  attendees = [],
  organizerEmail = '',
  organizerName = '',
  url = '',
} = {}) {
  const dtStart = toIcsDate(start);
  const dtEnd   = toIcsDate(end);
  const dtStamp = toIcsDate(new Date());
  const uid     = `awscl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@aws-career-launchpad`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AWS Career Launchpad Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary || 'Untitled event')}`,
  ];

  if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
  if (location)    lines.push(`LOCATION:${escapeIcs(location)}`);
  if (url)         lines.push(`URL:${escapeIcs(url)}`);

  if (organizerEmail) {
    const cn = organizerName ? `;CN=${escapeIcs(organizerName)}` : '';
    lines.push(`ORGANIZER${cn}:mailto:${organizerEmail}`);
  }

  for (const att of attendees) {
    if (!att) continue;
    lines.push(`ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${att}`);
  }

  // Default reminder: 10 minutes before
  lines.push(
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-PT10M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  );

  return lines.join('\r\n');  // RFC 5545 requires CRLF line endings
}

/**
 * Trigger a browser download of the .ics file.
 *
 * @param {Object} opts — same shape as buildIcs
 * @param {string} [opts.filename='event.ics']
 */
export function downloadIcs(opts) {
  const text = buildIcs(opts);
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (opts?.filename || sanitiseFilename(opts?.summary) || 'event') + '.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Tiny delay before revoke so iOS Safari has time to grab the data
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Build a Google Calendar quick-add URL. Useful when the user prefers
 * Google over their default app — they can click this link, Google
 * Calendar opens pre-filled, they save. NO OAuth needed.
 *
 * Reference:
 * https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/google.md
 */
export function googleCalendarQuickAddUrl({ summary, description = '', location = '', start, end }) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: summary || '',
    dates: `${toIcsDate(start)}/${toIcsDate(end)}`,
    details: description || '',
    location: location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Outlook.com web quick-add — same idea, different vendor.
 */
export function outlookQuickAddUrl({ summary, description = '', location = '', start, end }) {
  const s = new Date(start).toISOString();
  const e = new Date(end).toISOString();
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: summary || '',
    body: description || '',
    location: location || '',
    startdt: s,
    enddt: e,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

// ════════════════════════════════════════════════════════════════════
// Internals
// ════════════════════════════════════════════════════════════════════

/** Convert a Date/ISO to "YYYYMMDDTHHmmssZ" — RFC 5545 form, always UTC. */
function toIcsDate(d) {
  const dt = new Date(d);
  return [
    dt.getUTCFullYear(),
    pad(dt.getUTCMonth() + 1),
    pad(dt.getUTCDate()),
    'T',
    pad(dt.getUTCHours()),
    pad(dt.getUTCMinutes()),
    pad(dt.getUTCSeconds()),
    'Z',
  ].join('');
}
function pad(n) { return String(n).padStart(2, '0'); }

/** Escape per RFC 5545 section 3.3.11. */
function escapeIcs(text) {
  return String(text || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g,  '\\;')
    .replace(/,/g,  '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

function sanitiseFilename(s) {
  return String(s || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}
