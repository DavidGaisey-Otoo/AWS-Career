/**
 * LocalFileViewer.jsx — open the document the record points at.
 *
 * The workspace can say where a document is but cannot reach your drive;
 * the app has no backend by design. A browser can read a file you hand it
 * yourself, though, so that is the way in.
 *
 * Hand over the whole folder once (see LocalLibraryContext) and every
 * document resolves against it with no further picking. Choosing one file
 * at a time is still possible, but it is the fallback, not the path — the
 * picker opens wherever the browser last was, which is rarely where the
 * documents actually live.
 *
 * Nothing is uploaded and nothing is saved.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileWarning, FolderOpen, X } from 'lucide-react';
import { Markdown } from '../ai/Markdown.jsx';
import { FolderPicker } from './FolderPicker.jsx';
import { useLocalLibrary } from '../../context/LocalLibraryContext.jsx';
import {
  baseName, fileKindFor, humanSize, looksLikeExpected, readLocalFile,
} from '../../lib/localFileReader.js';

export function LocalFileViewer({ path }) {
  const inputRef = useRef(null);
  const library = useLocalLibrary();
  const [opened, setOpened] = useState(null);
  const [error, setError] = useState(null);
  const [mismatch, setMismatch] = useState(null);
  const [busy, setBusy] = useState(false);

  const expected = baseName(path || '');
  const kind = fileKindFor(path || '');
  const readable = kind !== 'unknown' && kind !== 'office-legacy';
  const fromLibrary = path ? library.find(path) : null;

  // An object URL is a live handle on memory; drop it when it is replaced
  // or the panel closes.
  const urlRef = useRef(null);
  useEffect(() => {
    urlRef.current = opened?.url || null;
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, [opened]);

  const show = async (file) => {
    setBusy(true); setError(null);
    try {
      if (!looksLikeExpected(file.name, path)) setMismatch(file.name); else setMismatch(null);
      setOpened(await readLocalFile(file));
    } catch (err) {
      setOpened(null);
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  // Once the folder is open, a document should just appear. Switching
  // between documents must not mean answering a dialog each time.
  useEffect(() => {
    setOpened(null); setError(null); setMismatch(null);
    if (!path || !readable || !fromLibrary) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        const result = await readLocalFile(fromLibrary);
        if (!cancelled) setOpened(result);
      } catch (err) {
        if (!cancelled) setError(err?.message || String(err));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [path, fromLibrary, readable]);

  if (!path) return null;

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await show(file);
  };

  return (
    <div className="surface rounded-xl p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen size={14} className="text-aws-orange shrink-0" />
        <span className="text-[11px] text-muted min-w-0 break-all">{path}</span>
        {readable && (
          <span className="ml-auto flex items-center gap-2">
            {!library.ready && <FolderPicker compact />}
            <button onClick={() => inputRef.current?.click()} disabled={busy}
                    className="btn btn-ghost !text-[11px] !py-1.5">
              {busy ? 'Reading…' : 'Pick this one file'}
            </button>
          </span>
        )}
        {!readable && <span className="text-[11px] text-muted ml-auto">Cannot be displayed here</span>}
        <input ref={inputRef} type="file" onChange={pick} className="hidden" />
      </div>

      {!opened && !error && !busy && (
        <p className="text-[11px] text-muted">
          {!readable
            ? <>Only .docx can be read here, not the older .doc, .xls or .ppt formats.</>
            : library.ready
              ? <>Not found in <strong className="text-current">{library.folderLabel || 'the folder you opened'}</strong>. Looking for <strong className="text-current">{expected}</strong> — choose a different folder, or pick this one file.</>
              : <>Open your documents folder once and every document here opens by itself. Nothing is uploaded or saved.</>}
        </p>
      )}

      {mismatch && (
        <p className="text-[11px] text-warning flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          You picked <strong>{mismatch}</strong>, but this record points at <strong>{expected}</strong>. Showing it anyway.
        </p>
      )}

      {error && (
        <p className="text-[11px] text-danger flex items-start gap-1.5">
          <FileWarning size={12} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}

      {opened && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span className="font-bold text-current">{opened.name}</span>
            <span>{humanSize(opened.size)}</span>
            {opened.note && <span>· {opened.note}</span>}
            <button onClick={() => setOpened(null)} className="ml-auto inline-flex items-center gap-1 hover:text-aws-orange">
              <X size={11} /> Close
            </button>
          </div>

          {opened.kind === 'image' && (
            <img src={opened.url} alt={opened.name} className="max-w-full rounded-lg border border-token" />
          )}

          {opened.kind === 'pdf' && (
            <iframe src={opened.url} title={opened.name}
                    className="w-full h-[34rem] rounded-lg border border-token" />
          )}

          {opened.kind === 'markdown' && (
            <div className="rounded-lg border border-token p-3 max-h-[34rem] overflow-y-auto">
              <Markdown source={opened.text} />
            </div>
          )}

          {(opened.kind === 'text' || opened.kind === 'docx') && (
            <pre className="rounded-lg border border-token p-3 text-[11.5px] leading-relaxed max-h-[34rem] overflow-auto whitespace-pre-wrap">
              {opened.text || '(This file contains no readable text.)'}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
