import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight, BookmarkPlus, Brain, ChevronLeft, Copy, Eraser, RotateCcw,
  Send, Sparkles, User,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Markdown } from '../components/ai/Markdown.jsx';
import { TypingDots } from '../components/ai/TypingDots.jsx';
import { PageHeader } from '../components/common/PageHeader.jsx';
import { useAI } from '../context/AIContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SUGGESTED_PROMPTS, buildResponse, classifyIntent, streamText } from '../lib/aiEngine.js';
import { cn } from '../lib/utils.js';

const TYPING_DELAY_MS = 380;

export default function AIAssistant() {
  const { state, appendMessage, replaceLastMessage, clearChat, saveAINote } = useAI();
  const toast = useToast();
  const nav = useNavigate();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const cancelStreamRef = useRef(null);
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);

  const messages = state.chat;
  const hasMessages = messages.length > 0;

  useEffect(() => {
    // Autoscroll to bottom on new chunks
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => () => cancelStreamRef.current?.(), []);

  // Pick up a pre-filled question from a roadmap "Ask AI for a hint" click.
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('ai-assistant:prefill');
      if (prefill) {
        sessionStorage.removeItem('ai-assistant:prefill');
        // Drop it into the input so the user can review before sending.
        setInput(prefill);
        // Focus the input so they can press Enter immediately.
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } catch { /* ignore */ }
  }, []);

  const send = (raw) => {
    const text = (raw ?? input).trim();
    if (!text || thinking) return;
    setInput('');
    appendMessage({ role: 'user', text });

    const { intent, payload } = classifyIntent(text);
    const response = buildResponse({ intent, payload });

    // Reserve the assistant slot
    setThinking(true);
    setTimeout(() => {
      appendMessage({ role: 'assistant', text: '', suggestions: response.suggestions, links: response.links });
      setThinking(false);
      cancelStreamRef.current = streamText(response.text, (chunk) => {
        replaceLastMessage({ text: chunk });
      }, {
        msPerChunk: 14,
        chunkSize: 4,
      });
    }, TYPING_DELAY_MS);
  };

  const stop = () => { cancelStreamRef.current?.(); cancelStreamRef.current = null; };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/ai" className="inline-flex items-center gap-1 text-xs font-bold text-muted hover:text-aws-orange">
        <ChevronLeft size={14} /> AI hub
      </Link>

      <PageHeader
        eyebrow="AI Study Assistant"
        title="Talk to a senior AWS architect"
        subtitle="Explain services, generate practice questions, troubleshoot errors, write Terraform, summarize whitepapers. Persistent chat — your full history stays."
        icon={Brain}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (confirm('Clear all chat history?')) clearChat(); }}
              className="btn btn-ghost !px-3" title="Clear chat"
            ><Eraser size={14} /></button>
          </div>
        }
      />

      {/* Chat surface */}
      <div className="surface rounded-3xl flex flex-col overflow-hidden gradient-border" style={{ height: 'min(72vh, 720px)' }}>
        {/* Scrollback */}
        <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!hasMessages ? (
            <EmptyState onPick={(p) => send(p)} />
          ) : messages.map((m, i) => (
            <ChatBubble
              key={m.id}
              m={m}
              isLast={i === messages.length - 1}
              onCopy={() => copyToClipboard(m.text, toast)}
              onSave={() => { saveAINote('chat', m.text); toast.success('Saved to AI notes'); }}
              onSuggestion={(s) => send(s)}
              onLink={(l) => l.to && nav(l.to)}
            />
          ))}
          {thinking && (
            <ChatBubble
              m={{ role: 'assistant', text: '', thinking: true }}
              onCopy={() => {}} onSave={() => {}} onSuggestion={() => {}}
            />
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-token p-3 sm:p-4 bg-[var(--card-2)]/40">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
              placeholder="Ask anything AWS — services, errors, code, exam prep…"
              className="flex-1 resize-none bg-[var(--card)] border border-token rounded-xl px-3.5 py-2.5 text-sm leading-relaxed focus-ring focus:border-aws-orange max-h-40"
              style={{ minHeight: 44 }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className={cn('btn btn-primary !px-3 h-[44px]', (!input.trim() || thinking) && 'opacity-40 cursor-not-allowed')}
            >
              <Send size={14} />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted">
            <span>↵ to send · Shift+↵ for newline</span>
            <span>{messages.length} message{messages.length === 1 ? '' : 's'} · persistent</span>
          </div>
        </div>
      </div>

      {/* Saved AI notes */}
      {state.savedNotes.length > 0 && <SavedNotes />}
    </div>
  );
}

// ----------------- ChatBubble -----------------

function ChatBubble({ m, isLast, onCopy, onSave, onSuggestion, onLink }) {
  const isUser = m.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn('flex gap-2.5 sm:gap-3', isUser ? 'justify-end' : '')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-aws grid place-items-center text-ink-950 flex-shrink-0 shadow-glow-orange">
          <Brain size={16} strokeWidth={2.5} />
        </div>
      )}
      <div className={cn('flex-1 max-w-[80%]', isUser && 'flex flex-col items-end')}>
        <div className={cn(
          'rounded-2xl px-4 py-3 transition',
          isUser
            ? 'bg-gradient-aws text-ink-950 shadow-glow-orange'
            : 'surface-2 border border-token text-[var(--text)]',
        )}>
          {m.thinking ? <TypingDots /> : (
            isUser
              ? <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">{m.text}</p>
              : <Markdown source={m.text || ''} />
          )}
        </div>
        {!isUser && !m.thinking && m.text && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <BubbleAction icon={Copy} label="Copy" onClick={onCopy} />
            <BubbleAction icon={BookmarkPlus} label="Save" onClick={onSave} />
            {(m.links || []).map((l, i) => (
              <button
                key={i}
                onClick={() => onLink?.(l)}
                className="inline-flex items-center gap-1 chip border border-aws-orange/40 bg-aws-orange/10 text-aws-orange text-[11px] font-bold"
              >
                {l.label} <ArrowRight size={10} />
              </button>
            ))}
            {isLast && (m.suggestions || []).map((s, i) => (
              <button
                key={`s-${i}`}
                onClick={() => onSuggestion(s)}
                className="inline-flex items-center gap-1 chip border border-token bg-[var(--card-2)] hover:bg-[var(--card)] text-[11px] font-bold transition"
              >
                <Sparkles size={10} className="text-aws-orange" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-[var(--card-2)] border border-token grid place-items-center text-muted flex-shrink-0">
          <User size={16} />
        </div>
      )}
    </motion.div>
  );
}

function BubbleAction({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold text-muted hover:text-aws-orange hover:bg-[var(--card-2)] transition"
    >
      <Icon size={11} /> {label}
    </button>
  );
}

function EmptyState({ onPick }) {
  return (
    <div className="h-full grid place-items-center p-6">
      <div className="max-w-2xl text-center">
        <div className="inline-grid place-items-center w-16 h-16 rounded-3xl bg-gradient-aws shadow-glow-orange mb-4">
          <Brain size={28} className="text-ink-950" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Ask me anything AWS.</h2>
        <p className="text-sm text-muted mt-2">
          I can explain services simply, write Terraform, summarize whitepapers, generate
          practice questions, and troubleshoot errors.
        </p>
        <div className="mt-6 grid sm:grid-cols-2 gap-2 text-left">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className="group flex items-center gap-2.5 rounded-xl border border-token bg-[var(--card-2)]/40 hover:bg-[var(--card-2)] hover:border-aws-orange/40 transition focus-ring p-3 text-sm font-semibold text-left"
            >
              <Sparkles size={14} className="text-aws-orange flex-shrink-0 group-hover:scale-110 transition" />
              <span className="flex-1">{p}</span>
              <ArrowRight size={12} className="text-muted group-hover:text-aws-orange transition" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavedNotes() {
  const { state, deleteAINote } = useAI();
  return (
    <section className="surface rounded-2xl p-5">
      <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-aws-orange mb-3">
        Saved from AI ({state.savedNotes.length})
      </h3>
      <ul className="space-y-2">
        {state.savedNotes.slice(0, 8).map((n) => (
          <li key={n.id} className="group rounded-xl border border-token bg-[var(--card-2)]/40 p-3">
            <div className="text-[11px] text-muted mb-1 flex items-center justify-between">
              <span className="font-bold uppercase tracking-widest">{n.source}</span>
              <button
                onClick={() => deleteAINote(n.id)}
                className="text-[10px] text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition font-bold"
              >Remove</button>
            </div>
            <div className="text-xs leading-relaxed line-clamp-4">{n.text}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function copyToClipboard(text, toast) {
  try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); }
  catch { toast.error('Could not copy'); }
}
