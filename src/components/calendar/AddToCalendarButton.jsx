/**
 * AddToCalendarButton.jsx — zero-OAuth replacement for BookDiscoveryCallButton.
 *
 * Drops the same UX (one-click "add this to my calendar") but without
 * any Google account, OAuth, client secret, or redirect URI mess. The
 * dropdown gives the user three choices:
 *
 *   1. Download .ics   — works with ANY calendar app on ANY device
 *   2. Open in Google Calendar  — opens GCal with pre-filled fields
 *   3. Open in Outlook          — opens Outlook web with pre-filled fields
 *
 * No login, no API call, no permissions popup. The .ics file generated
 * via icalExport.js is RFC 5545 compliant and supported by Apple
 * Calendar, Outlook, Thunderbird, Google Calendar, Yahoo Calendar,
 * Proton Calendar, and basically every calendar app shipped since 1998.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, CalendarPlus, Download, ExternalLink, ChevronDown, X, Clock } from 'lucide-react';
import { downloadIcs, googleCalendarQuickAddUrl, outlookQuickAddUrl } from '../../lib/icalExport.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

/**
 * Props:
 *   defaultTitle, defaultDescription, defaultAttendee, defaultDurationMin
 *   variant: 'primary' | 'outline' | 'ghost'
 *   label?: override the button text
 */
export function AddToCalendarButton({
  defaultTitle = 'Discovery call',
  defaultDescription = '',
  defaultAttendee = '',
  defaultDurationMin = 30,
  variant = 'outline',
  label = 'Add to Calendar',
  className = '',
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const btnClass = variant === 'primary'
    ? 'bg-gradient-aws text-ink-950 hover:brightness-110'
    : variant === 'outline'
    ? 'border border-aws-orange/40 text-aws-orange hover:bg-aws-orange/10'
    : 'border border-token hover:border-aws-orange hover:text-aws-orange';

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition',
          btnClass,
          className
        )}
      >
        <CalendarPlus size={13} /> {label}
      </button>
      {modalOpen && (
        <AddToCalendarModal
          defaultTitle={defaultTitle}
          defaultDescription={defaultDescription}
          defaultAttendee={defaultAttendee}
          defaultDurationMin={defaultDurationMin}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Modal
// ════════════════════════════════════════════════════════════════════
function AddToCalendarModal({ defaultTitle, defaultDescription, defaultAttendee, defaultDurationMin, onClose }) {
  const toast = useToast();
  const tomorrow2pm = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [attendee, setAttendee] = useState(defaultAttendee);
  const [location, setLocation] = useState('');
  const [startLocal, setStartLocal] = useState(tomorrow2pm);
  const [durationMin, setDurationMin] = useState(defaultDurationMin);

  const startDate = useMemo(() => new Date(startLocal), [startLocal]);
  const endDate   = useMemo(() => new Date(startDate.getTime() + durationMin * 60_000), [startDate, durationMin]);

  function fullDescription() {
    const parts = [];
    if (description) parts.push(description);
    if (attendee)    parts.push(`Attendee: ${attendee}`);
    return parts.join('\n\n');
  }

  function handleDownload() {
    downloadIcs({
      summary: title,
      description: fullDescription(),
      location,
      start: startDate,
      end: endDate,
      attendees: attendee ? [attendee] : [],
    });
    toast?.success?.('Downloaded — double-click the .ics file to add it');
    onClose();
  }

  function handleGoogle() {
    const url = googleCalendarQuickAddUrl({
      summary: title,
      description: fullDescription(),
      location,
      start: startDate,
      end: endDate,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  }

  function handleOutlook() {
    const url = outlookQuickAddUrl({
      summary: title,
      description: fullDescription(),
      location,
      start: startDate,
      end: endDate,
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto border border-token shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              Zero-OAuth · Universal
            </div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <Calendar size={16} className="text-aws-orange" /> Add to Calendar
            </h3>
            <p className="text-[11.5px] opacity-70 mt-0.5">
              Works with Apple Calendar, Outlook, Google Calendar, Thunderbird — anything.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--card-2)] transition">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="TITLE">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[13px] outline-none focus:border-aws-orange"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="START">
              <input
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
              />
            </Field>
            <Field label="DURATION">
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value, 10))}
                className="w-full rounded-lg bg-[var(--card-2)] border border-token px-2 py-1.5 text-[12.5px] outline-none focus:border-aws-orange cursor-pointer"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </Field>
          </div>

          <Field label="ATTENDEE EMAIL (optional)">
            <input
              type="email"
              value={attendee}
              onChange={(e) => setAttendee(e.target.value)}
              placeholder="client@example.com"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </Field>

          <Field label="LOCATION / MEETING LINK (optional)">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Zoom URL, address, or 'Phone call'"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
            />
          </Field>

          <Field label="NOTES">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Agenda or context for the call"
              className="w-full rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12.5px] outline-none focus:border-aws-orange leading-snug"
            />
          </Field>

          {/* Three options */}
          <div className="pt-2 space-y-2 border-t border-token">
            <div className="text-[10.5px] font-extrabold uppercase tracking-widest text-aws-orange mb-1.5">
              Pick how to add
            </div>
            <button onClick={handleDownload}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-extrabold bg-gradient-aws text-ink-950 hover:brightness-110 transition">
              <Download size={13} /> Download .ics (any calendar)
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleGoogle}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
                <ExternalLink size={11} /> Google Calendar
              </button>
              <button onClick={handleOutlook}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
                <ExternalLink size={11} /> Outlook
              </button>
            </div>
            <p className="text-[10.5px] opacity-60 italic">
              Google/Outlook open their web compose pre-filled — no login needed if you&apos;re already signed in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-bold opacity-75 mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
