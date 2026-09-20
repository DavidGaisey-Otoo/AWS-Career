/**
 * LocalLibraryContext.jsx — hand over the folder once, not a file at a time.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * The first version asked for one file per document. In practice the
 * picker opens wherever the browser last was — usually Downloads — and
 * the documents are not there, so every single document meant navigating
 * the whole way back down the tree again. Ten documents, ten journeys.
 *
 * A browser can be handed a whole directory in one go. Do that once and
 * every document in the workspace resolves against it immediately.
 *
 * Nothing is uploaded, nothing is persisted. File handles live in memory
 * for this tab only, and are gone on reload — which is also why the
 * prompt to choose the folder has to stay cheap to answer.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { baseName, looksLikeExpected } from '../lib/localFileReader.js';

const LocalLibraryContext = createContext(null);

/** Key a file by its name alone — the folder it came from does not matter. */
const keyFor = (name) => baseName(name).toLowerCase();

export function LocalLibraryProvider({ children }) {
  const [files, setFiles] = useState(() => new Map());
  // Folders accumulate. The documents may be split across two of them,
  // and picking the second must not discard the first.
  const [folders, setFolders] = useState(() => []);

  const addFiles = useCallback((fileList) => {
    const picked = Array.from(fileList || []);
    if (!picked.length) return { added: 0, folder: null };

    // webkitRelativePath is "<folder>/<maybe/sub>/<file>"; the first
    // segment is what the person actually chose.
    const relative = picked.find((f) => f.webkitRelativePath)?.webkitRelativePath || '';
    const folder = relative ? relative.split('/')[0] : null;

    setFiles((current) => {
      const next = new Map(current);
      for (const file of picked) next.set(keyFor(file.name), file);
      return next;
    });
    if (folder) setFolders((current) => (current.includes(folder) ? current : [...current, folder]));
    return { added: picked.length, folder };
  }, []);

  const clear = useCallback(() => {
    setFiles(new Map());
    setFolders([]);
  }, []);

  /**
   * Find the file a record points at.
   *
   * Exact name first. Failing that, a stem comparison, because a document
   * that has been re-saved as "Report (1).docx" or had its underscores
   * turned into spaces is still the document — but two genuinely
   * different files never match, so nothing is shown under the wrong name.
   */
  const find = useCallback((path) => {
    if (!path || files.size === 0) return null;
    const wanted = keyFor(path);
    const exact = files.get(wanted);
    if (exact) return exact;
    for (const [name, file] of files) {
      if (looksLikeExpected(name, path)) return file;
    }
    return null;
  }, [files]);

  const folderLabel = folders.length === 0 ? null
    : folders.length === 1 ? folders[0]
    : `${folders.length} folders`;

  const value = useMemo(() => ({
    files, addFiles, clear, find,
    count: files.size,
    folders, folderLabel,
    ready: files.size > 0,
  }), [files, addFiles, clear, find, folders, folderLabel]);

  return <LocalLibraryContext.Provider value={value}>{children}</LocalLibraryContext.Provider>;
}

/** Safe to call outside the provider — returns an empty library. */
export function useLocalLibrary() {
  return useContext(LocalLibraryContext) || {
    files: new Map(), count: 0, folders: [], folderLabel: null, ready: false,
    addFiles: () => ({ added: 0, folder: null }), clear: () => {}, find: () => null,
  };
}
