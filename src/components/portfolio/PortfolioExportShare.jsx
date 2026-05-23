import {
  Eye, Link2, Monitor, Printer, Share2, Smartphone, Users,
} from 'lucide-react';
import { useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { Button } from '../ui/Button.jsx';
import { cn } from '../../lib/utils.js';

/**
 * Top-level toolbar for portfolio export, sharing, and preview modes.
 * - PDF export: triggers print stylesheet (already wired in index.css)
 * - Public URL: copies a link toggleable on/off by `publicShareEnabled`
 * - Preview modes: simulates client view (mobile / desktop)
 */
export function PortfolioExportShare({ previewDevice, setPreviewDevice, previewMode, setPreviewMode }) {
  const toast = useToast();
  const { state, togglePublicShare, intelligence } = usePortfolio();
  const { profile } = useApp();
  const [copied, setCopied] = useState(false);

  const onPrint = () => {
    document.body.classList.add('printing-portfolio');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-portfolio'), 500);
    }, 80);
  };

  const onShare = async () => {
    if (!state.publicShareEnabled) {
      togglePublicShare();
      toast.success('Public portfolio enabled', {
        description: 'Anyone with this link can view your portfolio.',
      });
    }
    const url = new URL(window.location.href);
    url.pathname = '/portfolio';
    url.searchParams.set('view', 'public');
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied!', {
        description: `${profile.name || 'Portfolio'} · ${intelligence.portfolioScore}/100`,
      });
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My AWS Portfolio',
            text: `${profile.name || 'I'} just hit ${intelligence.portfolioScore}/100 on the AWS portfolio.`,
            url: url.toString(),
          });
        } catch { /* user cancelled */ }
      }
    } catch {
      toast.error('Could not copy link');
    }
  };

  const onUnshare = () => {
    togglePublicShare();
    toast.info('Public portfolio disabled');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {/* Preview mode toggle */}
      <div className="inline-flex items-center bg-[var(--card-2)] border border-token rounded-xl p-1">
        <ToggleBtn
          active={previewMode === 'editor'}
          onClick={() => setPreviewMode('editor')}
          icon={Users}
          label="Editor"
        />
        <ToggleBtn
          active={previewMode === 'public'}
          onClick={() => setPreviewMode('public')}
          icon={Eye}
          label="Client view"
        />
      </div>

      {previewMode === 'public' && (
        <div className="inline-flex items-center bg-[var(--card-2)] border border-token rounded-xl p-1">
          <ToggleBtn
            active={previewDevice === 'desktop'}
            onClick={() => setPreviewDevice('desktop')}
            icon={Monitor}
            label="Desktop"
          />
          <ToggleBtn
            active={previewDevice === 'mobile'}
            onClick={() => setPreviewDevice('mobile')}
            icon={Smartphone}
            label="Mobile"
          />
        </div>
      )}

      <Button variant="ghost" icon={Printer} onClick={onPrint}>PDF</Button>
      <Button
        variant={state.publicShareEnabled ? 'glass' : 'ghost'}
        icon={copied ? Link2 : Share2}
        onClick={onShare}
      >
        {copied ? 'Link copied!' : state.publicShareEnabled ? 'Share' : 'Make public'}
      </Button>
      {state.publicShareEnabled && (
        <button
          onClick={onUnshare}
          className="text-[11px] font-bold text-muted hover:text-danger transition"
        >
          Disable public
        </button>
      )}
      {state.publicShareEnabled && (
        <span className="chip bg-success/15 text-success border border-success/30 text-[11px] font-bold">
          {state.visitorCount} visits
        </span>
      )}
    </div>
  );
}

function ToggleBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition',
        active ? 'bg-aws-orange text-ink-950 shadow-glow-orange' : 'text-muted hover:text-current'
      )}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
