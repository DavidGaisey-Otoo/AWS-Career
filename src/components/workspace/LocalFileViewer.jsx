/**
 * LocalFileViewer.jsx — open the document the record points at.
 *
 * The workspace can say where a document is but cannot reach your drive;
 * the app has no backend by design. A browser can read a file you hand it
 * yourself, though, so this asks for that one file and then shows it.
 *
 * Nothing is uploaded and nothing is saved. The bytes live in this
 * component for as long as the panel is open.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileWarning, FolderOpen, X } from 'lucide-react';
import { Markdown } from '../ai/Markdown.jsx';
import {
  baseName, fileKindFor, humanSize, looksLikeExpected, readLocalFile,
} from '../../lib/localFileReader.js';

export function LocalFileViewer({ path }) {
  const inputRef = useRef(null);
  const [opened, setOpened] = useState(null);
  const [error, setError] = useState(null);
  const [mismatch, setMismatch] = useState(null);
  const [busy, setBusy] = useState(false);

  // An object URL is a live handle on memory; drop it when it is replaced
  // or the panel closes.
  useEffect(() => () => { if (opened?.url) URL.revokeObjectURL(opened.url); }, [opened]);

  if (!path) return null;

  const expected = baseName(path);
  const kind = fileKindFor(path);
  const readable = kind !== 'unknown' && kind !== 'office-legacy';

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';           // so picking the same file again re-reads it
    if (!file) return;
    setBusy(true); setError(null); setMismatch(null);
    try {
      if (!looksLikeExpected(file.name, path)) setMismatch(file.name);
      if (opened?.url) URL.revokeObjectURL(opened.url);
      setOpened(await readLocalFile(file));
    } catch (err) {
      setOpened(null);
      setError(err?.message || String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface rounded-xl p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen size={14} className="text-aws-orange shrink-0" />
        <span className="text-[11px] text-muted min-w-0 break-all">{path}</span>
        {readable ? (
          <button onClick={() => inputRef.current?.click()} disabled={busy}
                  className="btn btn-ghost !text-[11px] !py-1.5 ml-auto">
            {busy ? 'Reading…' : opened ? 'Open a different file' : 'Open this file'}
          </button>
        ) : (
          <span className="text-[11px] text-muted ml-auto">Cannot be displayed here</span>
        )}
        <input ref={inputRef} type="file" onChange={pick} className="hidden" />
      </div>

      {!opened && !error && (
        <p className="text-[11px] text-muted">
          {readable
            ? <>This app has no server and cannot read your drive, so it cannot fetch the file itself. Choose <strong className="text-current">{expected}</strong> and it will be shown here. Nothing is uploaded or saved.</>
            : <>Only .docx can be read here, not the older .doc, .xls or .ppt formats. Open it from the folder above.</>}
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
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="font-bold text-current">{opened.name}</span>
            <span>{humanSize(opened.size)}</span>
            {opened.note && <span>· {opened.note}</span>}
            <button onClick={() => { if (opened.url) URL.revokeObjectURL(opened.url); setOpened(null); setMismatch(null); }}
                    className="ml-auto inline-flex items-center gap-1 hover:text-aws-orange">
              <X size={11} /> Close
            </button>
          </div>

          {opened.kind === 'image' && (
            <img src={opened.url} alt={opened.name}
                 className="max-w-full rounded-lg border border-token" />
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
