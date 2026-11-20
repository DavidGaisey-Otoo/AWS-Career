/**
 * gigFolder.js — open the private "AWS Gigs" folder from the browser.
 *
 * The app has no server and never uploads anything (CLAUDE.md §1). Chrome
 * and Edge can still read a folder the person picks, via the File System
 * Access API, and can keep the permission handle in IndexedDB so the folder
 * reopens next time with one click. Other browsers fall back to a one-off,
 * read-only folder upload (<input webkitdirectory>), held for the tab only.
 *
 * Only `status.json` is ever written, and only inside a gig folder. File
 * contents are kept in memory, never in localStorage (gig data includes
 * client details and is bulk).
 */
import { GIG_FILES, GIG_ID, MAX_GIG_FILE_BYTES, parseGigFolder, serializeStatus, sortGuides } from './gigInbox.js';

const DB = 'aws-gigs';
const STORE = 'handles';
const KEY = 'gigs-root';

export const canUseFolderAccess = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDo(mode, fn) {
  const db = await idb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}

export async function rememberedFolder() {
  try { return (await idbDo('readonly', (s) => s.get(KEY))) || null; } catch { return null; }
}

export async function forgetFolder() {
  try { await idbDo('readwrite', (s) => s.delete(KEY)); } catch { /* nothing stored */ }
}

/** Ask for the folder. Read-write, so stage changes can be saved. */
export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ id: 'aws-gigs', mode: 'readwrite', startIn: 'documents' });
  try { await idbDo('readwrite', (s) => s.put(handle, KEY)); } catch { /* still usable this session */ }
  return handle;
}

/** 'granted' | 'prompt' | 'denied'. requestPermission needs a user click. */
export async function folderPermission(handle, ask = false) {
  const opts = { mode: 'readwrite' };
  if (!handle?.queryPermission) return 'denied';
  let state = await handle.queryPermission(opts);
  if (state === 'prompt' && ask) state = await handle.requestPermission(opts);
  return state;
}

async function readText(fileHandle) {
  const file = await fileHandle.getFile();
  if (file.size > MAX_GIG_FILE_BYTES) throw new Error(`${file.name} is larger than 1 MB and was not opened.`);
  return file.text();
}

/**
 * Read every gig in the folder.
 * @returns {{ gigs, checks:[{name,text}], skipped:string[] }}
 */
export async function readGigsFromHandle(root) {
  const gigs = [];
  const checks = [];
  const guides = [];
  const skipped = [];
  for await (const [name, entry] of root.entries()) {
    if (entry.kind !== 'directory') continue;
    if (name === 'checks' || name === 'guides') {
      const into = name === 'checks' ? checks : guides;
      for await (const [cname, centry] of entry.entries()) {
        if (centry.kind === 'file' && /\.md$/i.test(cname)) {
          try { into.push({ name: cname, text: await readText(centry) }); } catch (e) { skipped.push(e.message); }
        }
      }
      continue;
    }
    if (!GIG_ID.test(name)) { skipped.push(`${name} (not a gig folder)`); continue; }
    const files = {};
    for (const fname of GIG_FILES) {
      try { files[fname] = await readText(await entry.getFileHandle(fname)); }
      catch (e) { if (e?.name !== 'NotFoundError') skipped.push(`${name}/${fname}: ${e.message}`); }
    }
    gigs.push(parseGigFolder(name, files));
  }
  checks.sort((a, b) => b.name.localeCompare(a.name));
  return { gigs, checks, guides: sortGuides(guides), skipped };
}

/** Fallback: files from <input webkitdirectory>, grouped by sub-folder. */
export async function readGigsFromFileList(fileList) {
  const groups = new Map();
  const checks = [];
  const guides = [];
  const skipped = [];
  for (const file of Array.from(fileList || [])) {
    const parts = (file.webkitRelativePath || file.name).split('/');
    // parts: [root, gigFolder, file] or [root, 'checks', file]
    if (parts.length !== 3) continue;
    const [, folder, fname] = parts;
    if (file.size > MAX_GIG_FILE_BYTES) { skipped.push(`${folder}/${fname} is larger than 1 MB`); continue; }
    if (folder === 'checks' || folder === 'guides') {
      if (/\.md$/i.test(fname)) (folder === 'checks' ? checks : guides).push({ name: fname, text: await file.text() });
      continue;
    }
    if (!GIG_FILES.includes(fname)) continue;
    if (!groups.has(folder)) groups.set(folder, {});
    groups.get(folder)[fname] = await file.text();
  }
  const gigs = [];
  for (const [folder, files] of groups) {
    if (GIG_ID.test(folder)) gigs.push(parseGigFolder(folder, files));
    else skipped.push(`${folder} (not a gig folder)`);
  }
  checks.sort((a, b) => b.name.localeCompare(a.name));
  return { gigs, checks, guides: sortGuides(guides), skipped };
}

/** Write one gig's status.json. The only write this app makes to the folder. */
export async function saveStatus(root, gigId, status) {
  if (!GIG_ID.test(gigId)) throw new Error('Not a gig folder.');
  const dir = await root.getDirectoryHandle(gigId);
  const fh = await dir.getFileHandle('status.json', { create: true });
  const w = await fh.createWritable();
  await w.write(serializeStatus(status));
  await w.close();
}
