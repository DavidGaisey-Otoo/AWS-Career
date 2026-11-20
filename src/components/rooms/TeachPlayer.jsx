/**
 * TeachPlayer.jsx — "Teach me this gig": slides read aloud.
 *
 * Same lesson format as the Exams Study Prep app (### / - / ~ / >), parsed
 * in lib/gigInbox.js. Uses the browser's own speechSynthesis: no API, no
 * cost, nothing leaves the laptop. Long text is spoken a sentence at a time
 * because Chrome stalls on long utterances.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Headphones, Pause, Play, Volume2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { EmptyState } from '../common/EmptyState.jsx';
import { parseLesson, speechPieces } from '../../lib/gigInbox.js';
import { cn } from '../../lib/utils.js';

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function englishVoices() {
  if (!canSpeak()) return [];
  return window.speechSynthesis.getVoices().filter((v) => /^en[-_]/i.test(v.lang));
}

export function TeachPlayer({ lesson, title }) {
  const slides = useMemo(() => parseLesson(lesson), [lesson]);
  const [index, setIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [listenAll, setListenAll] = useState(false);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState(englishVoices);
  const [voiceName, setVoiceName] = useState('');
  const run = useRef(0); // bumps to cancel an in-flight read

  useEffect(() => {
    if (!canSpeak()) return undefined;
    const load = () => setVoices(englishVoices());
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = () => {
    run.current += 1;
    if (canSpeak()) window.speechSynthesis.cancel();
    setSpeaking(false);
    setListenAll(false);
  };

  const speakSlide = (i, continueAfter) => {
    if (!canSpeak() || !slides[i]) return;
    const id = ++run.current;
    window.speechSynthesis.cancel();
    const pieces = speechPieces(`${slides[i].title}. ${slides[i].say}`);
    const voice = voices.find((v) => v.name === voiceName);
    setSpeaking(true);
    let n = 0;
    const next = () => {
      if (run.current !== id) return;
      if (n >= pieces.length) {
        if (continueAfter && i + 1 < slides.length) {
          setIndex(i + 1);
          setTimeout(() => { if (run.current === id) speakSlide(i + 1, true); }, 600);
        } else { setSpeaking(false); setListenAll(false); }
        return;
      }
      const u = new SpeechSynthesisUtterance(pieces[n++]);
      u.rate = rate;
      if (voice) u.voice = voice;
      u.onend = next;
      u.onerror = next;
      window.speechSynthesis.speak(u);
    };
    next();
  };

  const go = (i) => { stop(); setIndex(Math.max(0, Math.min(slides.length - 1, i))); };

  if (!slides.length) {
    return <EmptyState tone="quiet" icon={Headphones} title="No lesson in this pack yet"
      description={'Ask Claude: "teach me this gig". It writes lesson.md into the gig folder.'} />;
  }
  const s = slides[index];

  return (
    <div className="space-y-3">
      <div className="surface rounded-2xl p-5 min-h-[260px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-muted">{title} · slide {index + 1} of {slides.length}</span>
          {speaking && <span className="text-[11px] font-bold text-success inline-flex items-center gap-1"><Volume2 size={12} /> reading</span>}
        </div>
        <h3 className="text-lg font-extrabold mt-2">{s.title}</h3>
        {s.points.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-sm">
            {s.points.map((p, i) => <li key={i} className="flex gap-2"><span className="text-aws-orange">•</span><span>{p}</span></li>)}
          </ul>
        )}
        {s.flows.map((flow, i) => (
          <div key={i} className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={flow.join(' then ')}>
            {flow.map((step, j) => (
              <span key={j} className="inline-flex items-center gap-1.5">
                <span className="rounded-lg border border-token bg-[var(--card-2)] px-2.5 py-1 text-[12px] font-bold">{step}</span>
                {j < flow.length - 1 && <ChevronRight size={14} className="text-aws-orange" />}
              </span>
            ))}
          </div>
        ))}
        <p className="mt-4 text-[13px] text-muted leading-relaxed border-l-2 border-aws-orange pl-3">{s.say}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" icon={ChevronLeft} onClick={() => go(index - 1)} disabled={index === 0}>Back</Button>
        {speaking
          ? <Button size="sm" icon={Pause} onClick={stop}>Stop</Button>
          : <Button size="sm" icon={Play} onClick={() => speakSlide(index, false)} disabled={!canSpeak()}>Read this slide</Button>}
        <Button variant="ghost" size="sm" icon={Headphones} disabled={!canSpeak() || speaking}
          onClick={() => { setListenAll(true); speakSlide(index, true); }}>
          {listenAll ? 'Listening…' : 'Listen to the whole lesson'}
        </Button>
        <Button variant="ghost" size="sm" iconRight={ChevronRight} onClick={() => go(index + 1)} disabled={index === slides.length - 1}>Next</Button>
        <label className="text-[11px] text-muted inline-flex items-center gap-1 ml-auto">
          Speed
          <select value={rate} onChange={(e) => setRate(Number(e.target.value))} className="bg-[var(--card-2)] border border-token rounded px-1 py-0.5">
            {[0.8, 0.9, 1, 1.1, 1.25].map((r) => <option key={r} value={r}>{r}×</option>)}
          </select>
        </label>
        {voices.length > 1 && (
          <select aria-label="Voice" value={voiceName} onChange={(e) => setVoiceName(e.target.value)}
            className="text-[11px] bg-[var(--card-2)] border border-token rounded px-1 py-0.5 max-w-[180px]">
            <option value="">Default voice</option>
            {voices.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
          </select>
        )}
      </div>
      {!canSpeak() && <p className="text-[11px] text-warning">This browser cannot read aloud. The slides still work; use Chrome or Edge to hear them.</p>}

      <div className="flex flex-wrap gap-1">
        {slides.map((sl, i) => (
          <button key={i} onClick={() => go(i)} title={sl.title}
            className={cn('h-1.5 w-6 rounded-full', i === index ? 'bg-aws-orange' : 'bg-[var(--card-2)] hover:bg-aws-orange/50')} />
        ))}
      </div>
    </div>
  );
}
