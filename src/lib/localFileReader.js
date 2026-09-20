/**
 * localFileReader.js — actually show the document, not a record of it.
 *
 * ════════════════════════════════════════════════════════════════════
 * WHY
 * ════════════════════════════════════════════════════════════════════
 * The workspace knows a document exists and where it sits on disk:
 *
 *     File    evidence\aws-network-baseline-cloudshell.png
 *
 * That is a description of a document, not a document. This app has no
 * backend and cannot read a path off your drive — that is an
 * architectural invariant, not an oversight. But a browser can read a
 * file the person themselves hands it, and that is enough to close the
 * gap: pick the file once, see it in place.
 *
 * Nothing read here is persisted. The bytes stay in memory for as long as
 * the panel is open, which keeps bulk payloads out of localStorage.
 *
 * ════════════════════════════════════════════════════════════════════
 * .docx WITHOUT A LIBRARY
 * ════════════════════════════════════════════════════════════════════
 * Six of these documents are Word files, so "we cannot display this" is
 * close to useless. A .docx is a ZIP holding word/document.xml, and the
 * platform already ships an inflater in DecompressionStream. So the ZIP
 * central directory is walked here directly rather than adding a
 * dependency for it.
 *
 * This extracts the text. It is not a Word renderer: no images, no
 * tables-as-tables, no styling. It is for reading what the document
 * says, and it says so rather than pretending to be more.
 */

const IMAGE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const TEXT = /\.(txt|log|csv|json|ya?ml|tf|sh|js|mjs|cjs|ts|xml|html?)$/i;
const MARKDOWN = /\.(md|markdown)$/i;
const DOCX = /\.docx$/i;
const PDF = /\.pdf$/i;

/** What kind of thing is this, judged by name alone? */
export function fileKindFor(nameOrPath = '') {
  const name = String(nameOrPath).split(/[\\/]/).pop() || '';
  if (IMAGE.test(name)) return 'image';
  if (MARKDOWN.test(name)) return 'markdown';
  if (PDF.test(name)) return 'pdf';
  if (DOCX.test(name)) return 'docx';
  if (TEXT.test(name)) return 'text';
  if (/\.(doc|xls|xlsx|ppt|pptx)$/i.test(name)) return 'office-legacy';
  return 'unknown';
}

/** Just the file name from a path written in either slash style. */
export function baseName(path = '') {
  return String(path).split(/[\\/]/).pop() || '';
}

/** Does the file the person picked look like the one we asked for? */
export function looksLikeExpected(pickedName, expectedPath) {
  const expected = baseName(expectedPath).toLowerCase();
  if (!expected) return true;
  const picked = String(pickedName || '').toLowerCase();
  if (picked === expected) return true;
  // Word writes "Name.docx"; people rename and re-save constantly. Match
  // on the stem without punctuation so a re-save is not treated as wrong.
  const stem = (s) => s.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '');
  return stem(picked) === stem(expected);
}

const u16 = (view, at) => view.getUint16(at, true);
const u32 = (view, at) => view.getUint32(at, true);

/**
 * Locate one entry inside a ZIP by walking the central directory.
 * @returns {{ dataStart:number, method:number, compressedSize:number }|null}
 */
export function findZipEntry(buffer, wantedPath) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // The end-of-central-directory record sits at the very end, after a
  // comment of unknown length, so it is found by scanning backwards.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0 && i > bytes.length - 22 - 65536; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;

  const entries = u16(view, eocd + 10);
  let at = u32(view, eocd + 16);

  for (let n = 0; n < entries; n++) {
    if (at + 46 > bytes.length || u32(view, at) !== 0x02014b50) return null;
    const method = u16(view, at + 10);
    const compressedSize = u32(view, at + 20);
    const nameLength = u16(view, at + 28);
    const extraLength = u16(view, at + 30);
    const commentLength = u16(view, at + 32);
    const localOffset = u32(view, at + 42);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));

    if (name === wantedPath) {
      // The local header repeats the name and extra fields, and its extra
      // length often differs from the central one — so read it, do not
      // assume it.
      if (u32(view, localOffset) !== 0x04034b50) return null;
      const localNameLength = u16(view, localOffset + 26);
      const localExtraLength = u16(view, localOffset + 28);
      return {
        dataStart: localOffset + 30 + localNameLength + localExtraLength,
        method,
        compressedSize,
      };
    }
    at += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

/** Inflate a raw deflate stream using the platform's own decompressor. */
async function inflateRaw(slice) {
  const stream = new Blob([slice]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Turn Word's document.xml into readable text.
 *
 * Paragraphs become lines, tabs become tabs, and everything else is
 * dropped. Exported separately so it can be tested without a ZIP.
 */
export function docxXmlToText(xml = '') {
  return String(xml)
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Read the text out of a .docx held in memory. */
export async function extractDocxText(buffer) {
  const entry = findZipEntry(buffer, 'word/document.xml');
  if (!entry) throw new Error('This does not look like a Word .docx file — no word/document.xml inside it.');
  const slice = new Uint8Array(buffer, entry.dataStart, entry.compressedSize);
  let xmlBytes;
  if (entry.method === 0) xmlBytes = slice;            // stored, not compressed
  else if (entry.method === 8) xmlBytes = await inflateRaw(slice);
  else throw new Error(`Unsupported compression inside the .docx (method ${entry.method}).`);
  return docxXmlToText(new TextDecoder().decode(xmlBytes));
}

/**
 * Read a file the person picked.
 *
 * @returns {{ kind, name, size, text?, url?, note? }} — `url` is an object
 *   URL the caller must revoke when it is finished with it.
 */
export async function readLocalFile(file) {
  const kind = fileKindFor(file.name);
  const common = { kind, name: file.name, size: file.size };

  if (kind === 'image' || kind === 'pdf') {
    return { ...common, url: URL.createObjectURL(file) };
  }
  if (kind === 'text' || kind === 'markdown') {
    return { ...common, text: await file.text() };
  }
  if (kind === 'docx') {
    const text = await extractDocxText(await file.arrayBuffer());
    return {
      ...common,
      text,
      note: 'Text only — images, tables and formatting are not shown.',
    };
  }
  if (kind === 'office-legacy') {
    throw new Error('Only the newer .docx format can be read here, not the older .doc / .xls / .ppt formats.');
  }
  throw new Error(`No reader for this file type (${file.name}).`);
}

/** A readable size, for confirming you picked the file you meant. */
export function humanSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
