/**
 * GenerateNoteButton.jsx — drop-in CTA to create + save a study note
 * from a walkthrough or lesson. Always creates a NEW entry (never
 * overwrites) per the NT-01 spec.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotebookPen, CheckCircle2 } from 'lucide-react';
import {
  generateNoteFromWalkthrough, generateNoteFromLesson,
} from '../../lib/studyNotesGenerator.js';
import { saveNote } from '../../lib/studyNotesStore.js';
import { useToast } from '../../context/ToastContext.jsx';
import { cn } from '../../lib/utils.js';

/**
 * Props:
 *   - mode: 'walkthrough' | 'lesson'
 *   - walkthrough? — walkthrough object
 *   - lesson? — lesson object
 *   - variant: 'primary' | 'outline' | 'ghost'
 *   - extraServices, extraConcepts? — passed to generator
 */
export function GenerateNoteButton({
  mode = 'walkthrough',
  walkthrough,
  lesson,
  variant = 'outline',
  extraServices = [],
  extraConcepts = [],
  className = '',
  label = 'Generate Study Notes',
}) {
  const toast = useToast();
  const nav = useNavigate();
  const [saved, setSaved] = useState(false);

  function handleClick() {
    let note;
    try {
      if (mode === 'walkthrough') {
        if (!walkthrough) { toast?.warning?.('No walkthrough data to save'); return; }
        note = generateNoteFromWalkthrough(walkthrough, { extraServices, extraConcepts });
      } else if (mode === 'lesson') {
        if (!lesson) { toast?.warning?.('No lesson data to save'); return; }
        note = generateNoteFromLesson(lesson);
      } else {
        toast?.error?.('Unknown note source'); return;
      }
      const stored = saveNote(note);
      setSaved(true);
      toast?.success?.('Note saved to My Notes');
      setTimeout(() => setSaved(false), 2000);
      // Tiny delay so the user sees the green confirm before navigating
      setTimeout(() => nav(`/my-notes/${stored.id}`), 700);
    } catch (err) {
      console.error('[GenerateNoteButton]', err);
      toast?.error?.('Could not generate note — check console');
    }
  }

  const btnClass = variant === 'primary'
    ? 'bg-gradient-aws text-ink-950 hover:brightness-110'
    : variant === 'outline'
    ? 'border border-aws-orange/40 text-aws-orange hover:bg-aws-orange/10'
    : 'border border-token hover:border-aws-orange hover:text-aws-orange';

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition',
        btnClass,
        className
      )}
      title="Auto-generate a structured study note and save it to My Notes"
    >
      {saved
        ? <><CheckCircle2 size={13} /> Saved — opening…</>
        : <><NotebookPen size={13} /> {label}</>
      }
    </button>
  );
}
