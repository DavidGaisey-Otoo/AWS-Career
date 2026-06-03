/**
 * BookDiscoveryCallButton.jsx — IN-01 reusable button + modal.
 *
 * Drops into any surface that wants to schedule a discovery call:
 *   - Smart Proposal Generator (next to "Also send as Email")
 *   - Email Outreach tab
 *   - Discovery Call Prep page
 *
 * Behaviour:
 *   - If Google Calendar isn't connected → link to Settings
 *   - Otherwise opens a modal: title, attendee email, date/time
 *   - On submit: creates a 30-min event with Google Meet link, shows
 *     success state with copyable Meet link + "Open in Calendar"
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, CalendarPlus, CheckCircle2, AlertCircle, Loader2, X,
  Copy, ExternalLink, Video, Settings, Clock,
} from 'lucide-react';
import { createEvent, isConnected } from '../../lib/googleCalendar.js';
import { cn } from '../../lib/utils.js';

export function BookDiscoveryCallButton({
  defaultTitle = 'Discovery call',
  defaultDescription = '',
  defaultAttendee = '',
  variant = 'primary', // primary | outline | ghost
  className = '',
}) {
  const [open, setOpen] = useState(false);

  if (!isConnected()) {
    return (
      <Link
        to="/settings?section=integrations"
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-dashed border-token opacity-70 hover:opacity-100 hover:border-aws-orange hover:text-aws-orange transition',
          className
        )}
        title="Connect Google Calendar first"
      >
        <Calendar size={12} /> Connect Calendar to book
      </Link>
    );
  }

  const btnClass = variant === 'primary'
    ? 'bg-gradient-aws text-ink-950 hover:brightness-110'
    : variant === 'outline'
    ? 'border border-aws-orange/40 text-aws-orange hover:bg-aws-orange/10'
    : 'border border-token hover:border-aws-orange hover:text-aws-orange';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition',
          btnClass,
          className
        )}
      >
        <CalendarPlus size={12} /> Book discovery call
      </button>
      {open && (
        <BookingModal
          defaultTitle={defaultTitle}
          defaultDescription={defaultDescription}
          defaultAttendee={defaultAttendee}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════
// Modal
// ════════════════════════════════════════════════════════════════════
function BookingModal({ defaultTitle, defaultDescription, defaultAttendee, onClose }) {
  // Default to tomorrow at 14:00 local
  const tomorrow2pm = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(14, 0, 0, 0);
    return toLocalInputValue(d);
  }, []);

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [attendee, setAttendee] = useState(defaultAttendee);
  const [startLocal, setStartLocal] = useState(tomorrow2pm);
  const [durationMin, setDurationMin] = useState(30);
  const [addMeet, setAddMeet] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    setSubmitting(true);
    setError('');
    try {
      const start = new Date(startLocal);
      const end = new Date(start.getTime() + durationMin * 60 * 1000);
      const event = await createEvent({
        summary: title,
        description,
        start,
        end,
        attendeeEmail: attendee.trim() || undefined,
        addMeetLink: addMeet,
      });
      setResult(event);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function copyMeetLink() {
    if (!result?.meetLink) return;
    navigator.clipboard.writeText(result.meetLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="surface rounded-2xl p-5 max-w-md w-full shadow-2xl border border-token max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              IN-01 · Google Calendar
            </div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <CalendarPlus size={18} className="text-aws-orange" />
              {result ? 'Event created' : 'Book discovery call'}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-[var(--card-2)] transition">
            <X size={16} />
          </button>
        </div>

        {/* SUCCESS STATE */}
        {result && (
          <div className="space-y-3">
            <div className="rounded-xl bg-success/5 border border-success/30 p-3 flex items-start gap-2">
              <CheckCircle2 size={14} className="text-success mt-0.5 flex-shrink-0" />
              <div className="text-[12.5px]">
                <div className="font-bold">Event scheduled</div>
                <div className="opacity-75 mt-0.5">
                  {attendee && <>Invite sent to <strong>{attendee}</strong>. </>}
                  Added to your primary calendar.
                </div>
              </div>
            </div>

            {result.meetLink && (
              <div>
                <div className="text-[10.5px] font-bold opacity-75 mb-1 flex items-center gap-1">
                  <Video size={11} /> GOOGLE MEET LINK
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-[var(--card-2)] border border-token rounded px-2 py-1.5 text-[11.5px] font-mono break-all">
                    {result.meetLink}
                  </code>
                  <button onClick={copyMeetLink} className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11px] font-bold border border-token hover:border-aws-orange hover:text-aws-orange transition">
                    {copied ? <><CheckCircle2 size={11} className="text-success" /> Copied</> : <><Copy size={11} /> Copy</>}
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {result.htmlLink && (
                <a
                  href={result.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-1.5"
                >
                  Open in Calendar <ExternalLink size={11} />
                </a>
              )}
              <button onClick={onClose} className="btn btn-ghost">Done</button>
            </div>
          </div>
        )}

        {/* FORM STATE */}
        {!result && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="text-[10.5px] font-bold opacity-75">TITLE</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[13px] outline-none focus:border-aws-orange"
              />
            </label>

            <label className="block">
              <span className="text-[10.5px] font-bold opacity-75">ATTENDEE EMAIL (optional)</span>
              <input
                type="email"
                value={attendee}
                onChange={(e) => setAttendee(e.target.value)}
                placeholder="client@example.com"
                className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-3 py-1.5 text-[13px] outline-none focus:border-aws-orange"
              />
              <span className="text-[10px] opacity-60 mt-0.5 block">Google emails them the invite automatically.</span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10.5px] font-bold opacity-75 flex items-center gap-1">
                  <Clock size={10} /> START
                </span>
                <input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  required
                  className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-2 py-1.5 text-[12.5px] outline-none focus:border-aws-orange"
                />
              </label>
              <label className="block">
                <span className="text-[10.5px] font-bold opacity-75">DURATION</span>
                <select
                  value={durationMin}
                  onChange={(e) => setDurationMin(parseInt(e.target.value, 10))}
                  className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-2 py-1.5 text-[12.5px] outline-none focus:border-aws-orange cursor-pointer"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-[10.5px] font-bold opacity-75">DESCRIPTION (optional)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Agenda or notes for the call"
                className="w-full mt-1 rounded-lg bg-[var(--card-2)] border border-token px-3 py-2 text-[12.5px] outline-none focus:border-aws-orange leading-snug"
              />
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={addMeet}
                onChange={(e) => setAddMeet(e.target.checked)}
                className="accent-aws-orange"
              />
              <Video size={12} className="text-aws-orange" />
              <span className="text-[12px] font-bold">Add Google Meet link</span>
            </label>

            {error && (
              <div className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger flex items-start gap-2">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <div className="break-words">{error}</div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting
                  ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
                  : <><CalendarPlus size={13} /> Create event</>
                }
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
              <Link to="/settings?section=integrations" className="inline-flex items-center gap-1 text-[11px] opacity-60 hover:opacity-100 ml-auto self-center" title="Calendar settings">
                <Settings size={11} />
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ────────── helpers ──────────
function toLocalInputValue(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
