/**
 * GenerateFullScriptModal.jsx — PJ-02 Full Unified Script Generator UI.
 *
 * Modal with 4 format tabs. Each tab shows:
 *   - Format description
 *   - Scrollable preview of the generated script
 *   - Copy to Clipboard + Download buttons
 *
 * Triggered by the "Generate Full Project Script" button at the bottom
 * of a completed Deep Walkthrough.
 */

import { useEffect, useMemo, useState } from 'react';
import { X, Copy, Download, Check, FileText, Rocket } from 'lucide-react';
import {
  SCRIPT_FORMATS, downloadScript,
} from '../../lib/walkthroughScriptGenerator.js';
import { DeployFromScriptModal } from '../deploy/DeployFromScriptModal.jsx';
import { DeployReviewPanel } from '../deploy-review/DeployReviewPanel.jsx';
import { cn } from '../../lib/utils.js';

export function GenerateFullScriptModal({ walkthrough, open, onClose, region }) {
  const [activeFormatId, setActiveFormatId] = useState('console');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);  // DP-01

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const activeFormat = SCRIPT_FORMATS.find((f) => f.id === activeFormatId);

  const generated = useMemo(() => {
    if (!walkthrough || !activeFormat) return '';
    try {
      // AD-01: pass the per-project region so AWS_REGION + provider blocks use it
      return activeFormat.generate(walkthrough, { region });
    } catch (err) {
      return `# Error generating ${activeFormat.label}:\n# ${err.message}`;
    }
  }, [walkthrough, activeFormat, region]);

  const filename = `${walkthrough?.id || 'walkthrough'}.${activeFormat?.extension || 'txt'}`;

  function handleCopy() {
    navigator.clipboard?.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    downloadScript(filename, generated, activeFormat.mime);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  }

  // Reset copy/download confirmations when switching tabs
  useEffect(() => {
    setCopied(false);
    setDownloaded(false);
  }, [activeFormatId]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="surface rounded-3xl gradient-border max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-token">
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-0.5">
              PJ-02 · Full project script
            </div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <FileText size={18} className="text-aws-orange" /> Generate Full Project Script
            </h2>
            <p className="text-[12px] opacity-70 mt-1">
              <strong>{walkthrough?.title}</strong> · {walkthrough?.steps?.length} steps merged into one production-quality script.
              {region && <> · region: <strong className="text-aws-orange">{region}</strong></>}
            </p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-current p-1 rounded hover:bg-[var(--card-2)]">
            <X size={18} />
          </button>
        </div>

        {/* Format tabs */}
        <div className="p-4 border-b border-token">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-aws-orange mb-2">
            Choose your format
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SCRIPT_FORMATS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFormatId(f.id)}
                className={cn(
                  'rounded-xl border-2 p-3 text-left transition',
                  activeFormatId === f.id
                    ? 'border-aws-orange bg-aws-orange/10'
                    : 'border-token hover:border-aws-orange/40'
                )}
              >
                <div className="text-2xl mb-1">{f.icon}</div>
                <div className="text-[12.5px] font-extrabold leading-snug mb-0.5">{f.label}</div>
                <div className="text-[10px] opacity-70">.{f.extension}</div>
              </button>
            ))}
          </div>
          {activeFormat && (
            <p className="text-[11.5px] opacity-75 mt-2.5 italic leading-snug">
              {activeFormat.description}
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-token bg-[var(--card-2)]/30">
          <div className="text-[11.5px] opacity-75 font-mono">
            📄 {filename} <span className="opacity-50">· {generated.length.toLocaleString()} chars · {generated.split('\n').length} lines</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy} className={cn('btn text-xs', copied ? 'btn-primary' : 'btn-ghost')}>
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
            <button onClick={handleDownload} className={cn('btn text-xs', downloaded ? 'btn-primary' : 'btn-primary')}>
              {downloaded ? <><Check size={14} /> Downloaded</> : <><Download size={14} /> Download {activeFormat?.extension?.toUpperCase()}</>}
            </button>
            {/* DP-01: Deploy to AWS */}
            <button
              onClick={() => setDeployOpen(true)}
              className="btn text-xs inline-flex items-center gap-1.5 bg-gradient-aws text-ink-950 hover:brightness-110"
              title={activeFormatId === 'cfn'
                ? 'Deploy this CloudFormation stack to your AWS account'
                : `Open ${activeFormat?.label} run-locally instructions`}
            >
              <Rocket size={14} /> Deploy to AWS
            </button>
          </div>
        </div>

        {/* DP-01 deploy modal */}
        <DeployFromScriptModal
          open={deployOpen}
          onClose={() => setDeployOpen(false)}
          format={activeFormatId}
          script={generated}
          defaultStackName={`awscl-${walkthrough?.id || 'stack'}-${Date.now().toString(36).slice(-4)}`}
          defaultRegion={region}
        />

        {/* Preview + DEPLOY-01 pre-flight review */}
        <div className="flex-1 overflow-auto">
          <pre className="bg-[var(--card-2)]/60 p-4 text-[12px] leading-relaxed font-mono whitespace-pre max-h-[40vh] overflow-auto">
            <code>{generated}</code>
          </pre>
          {generated && generated.length > 50 && (
            <div className="p-4 border-t border-token">
              <DeployReviewPanel
                template={generated}
                format={activeFormatId === 'cfn' ? 'cfn' : activeFormatId === 'tf' ? 'terraform' : activeFormatId === 'console' ? 'cli' : 'json'}
                region={region}
              />
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="px-4 py-3 border-t border-token bg-[var(--card-2)]/40 text-[10.5px] opacity-70">
          ⚠ This script merges per-step snippets — review references, parameters, and resource names before deploying to production.
          AWS resources cost money — never run unfamiliar scripts unattended.
        </div>
      </div>
    </div>
  );
}
