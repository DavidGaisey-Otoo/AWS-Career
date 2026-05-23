import { Download, Link2, Printer, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext.jsx';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { Button } from '../ui/Button.jsx';

/**
 * Encodes a compact snapshot of completed subtask IDs + XP into a URL.
 * For privacy this stays client-side — anyone with the link sees the
 * completion state but no notes or timers.
 */
function buildShareLink(state) {
  const completed = Object.keys(state.subtasks).filter((k) => state.subtasks[k]);
  const payload = {
    v: 1,
    c: completed,
    x: state.xp,
    s: state.streak.current,
  };
  const enc = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = new URL(window.location.href);
  url.pathname = '/roadmap';
  url.searchParams.set('snapshot', enc);
  return url.toString();
}

export function ExportShare() {
  const toast = useToast();
  const { state, overall } = useRoadmap();
  const { profile } = useApp();
  const [copied, setCopied] = useState(false);

  const onPrint = () => {
    document.body.classList.add('printing-roadmap');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-roadmap'), 500);
    }, 80);
  };

  const onShare = async () => {
    const url = buildShareLink(state);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!', {
        description: `${Math.round(overall.percent)}% complete — share your progress.`,
      });
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My AWS Career Launchpad progress',
            text: `${profile.name || 'I'} just hit ${Math.round(overall.percent)}% on the AWS roadmap.`,
            url,
          });
        } catch { /* user cancelled — ignore */ }
      }
    } catch {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button variant="ghost" icon={Printer} onClick={onPrint}>Print / PDF</Button>
      <Button variant="ghost" icon={copied ? Link2 : Share2} onClick={onShare}>
        {copied ? 'Link copied!' : 'Share progress'}
      </Button>
    </div>
  );
}
