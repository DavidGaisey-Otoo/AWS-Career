import { deflateRawSync } from 'node:zlib';
import {
  baseName, docxXmlToText, extractDocxText, fileKindFor, findZipEntry,
  humanSize, looksLikeExpected,
} from '../localFileReader.js';

/**
 * The workspace could say where a document was but not show it, because
 * the app has no backend and cannot read a path off a drive. A browser
 * can read a file the person hands it, so the gap closes there.
 *
 * Six of the documents are Word files, which makes "cannot display this"
 * nearly useless — so a .docx is unzipped and read with the platform's
 * own inflater rather than a dependency. That parser is the risky part,
 * so it is exercised against a real ZIP built here, not a stub.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Build a genuine ZIP so the central-directory walk is really tested. */
function makeZip(entries) {
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = Buffer.from(name, 'utf8');
    const raw = Buffer.from(content, 'utf8');
    const deflated = deflateRawSync(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 8);                   // deflate
    local.writeUInt32LE(0, 14);                  // crc — not checked by the reader
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(deflated.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt32LE(offset, 42);

    chunks.push(local, nameBytes, deflated);
    central.push(cd, nameBytes);
    offset += local.length + nameBytes.length + deflated.length;
  }

  const body = Buffer.concat(chunks);
  const dir = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(dir.length, 12);
  eocd.writeUInt32LE(body.length, 16);

  const all = Buffer.concat([body, dir, eocd]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength);
}

const DOC_XML = `<?xml version="1.0"?>
<w:document xmlns:w="x"><w:body>
<w:p><w:r><w:t>AWS Identity and Account Security Assessment</w:t></w:r></w:p>
<w:p><w:r><w:t>Prepared for</w:t></w:r><w:tab/><w:r><w:t>Northwind &amp; Co</w:t></w:r></w:p>
<w:p/>
<w:p><w:r><w:t>Root MFA is enabled.</w:t></w:r></w:p>
</w:body></w:document>`;

export async function runLocalFileReaderTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // ───────── recognising what a file is ─────────

  await test('a file is recognised from a Windows or POSIX path', () => {
    assert(fileKindFor('evidence\\aws-budgets-overview.png') === 'image', 'a Windows path image was missed');
    assert(fileKindFor('documentation/Report.md') === 'markdown', 'markdown was missed');
    assert(fileKindFor('documentation\\Assessment.docx') === 'docx', 'docx was missed');
    assert(fileKindFor('x/y/notes.txt') === 'text', 'text was missed');
    assert(fileKindFor('a/b/plan.pdf') === 'pdf', 'pdf was missed');
  });

  await test('the older Office formats are called out, not silently failed', () => {
    // .doc is not a zip, so it would fail deep inside the parser with an
    // unhelpful error if it were treated as readable.
    assert(fileKindFor('old/Report.doc') === 'office-legacy', '.doc was not distinguished from .docx');
    assert(fileKindFor('old/Book.xls') === 'office-legacy', '.xls was not distinguished');
  });

  await test('the file name is taken from either slash style', () => {
    assert(baseName('evidence\\a\\b.png') === 'b.png', 'backslashes not handled');
    assert(baseName('evidence/a/b.png') === 'b.png', 'forward slashes not handled');
    assert(baseName('') === '', 'an empty path threw or invented a name');
  });

  // ───────── picking the wrong file ─────────

  await test('a re-saved file is still recognised as the right one', () => {
    assert(looksLikeExpected('Assessment.docx', 'documentation\\Assessment.docx'), 'an exact match was rejected');
    assert(looksLikeExpected('David Gaisey-Otoo AWS Assessment.docx', 'documentation\\David_Gaisey-Otoo_AWS_Assessment.docx'),
      'underscores versus spaces was treated as a different file');
  });

  await test('a genuinely different file is flagged', () => {
    assert(!looksLikeExpected('holiday-photo.png', 'evidence\\aws-budgets-overview.png'),
      'an unrelated file was accepted as the expected one');
  });

  // ───────── reading Word text ─────────

  await test('paragraphs become lines and entities are decoded', () => {
    const text = docxXmlToText(DOC_XML);
    assert(text.includes('AWS Identity and Account Security Assessment'), 'the heading was lost');
    assert(text.includes('Northwind & Co'), 'an XML entity was not decoded: ' + text.slice(0, 80));
    assert(text.includes('Prepared for\tNorthwind'), 'a tab was not preserved');
    assert(text.split('\n').length >= 3, 'paragraphs did not become separate lines');
  });

  await test('no markup survives into the text', () => {
    const text = docxXmlToText(DOC_XML);
    assert(!/<[^>]+>/.test(text), 'XML tags leaked into the output: ' + text.slice(0, 80));
  });

  await test('a real .docx is unzipped and read', async () => {
    const zip = makeZip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': DOC_XML });
    const text = await extractDocxText(zip);
    assert(text.includes('Root MFA is enabled.'), 'the document body was not recovered: ' + text.slice(0, 80));
  });

  await test('the entry is found by name, not by position', () => {
    // word/document.xml is rarely the first entry in a real .docx.
    const zip = makeZip({ 'a.xml': '<a/>', 'b.xml': '<b/>', 'word/document.xml': DOC_XML });
    const entry = findZipEntry(zip, 'word/document.xml');
    assert(entry && entry.dataStart > 0, 'a later entry was not located');
    assert(findZipEntry(zip, 'word/missing.xml') === null, 'a missing entry did not report missing');
  });

  await test('something that is not a zip fails with a sentence you can act on', async () => {
    const notAZip = new TextEncoder().encode('This is a plain text file, not a Word document.').buffer;
    let message = '';
    try { await extractDocxText(notAZip); } catch (error) { message = error.message; }
    assert(/docx|word/i.test(message), 'the error does not say what was wrong: ' + message);
  });

  // ───────── small things that are visible ─────────

  await test('sizes are readable', () => {
    assert(humanSize(512) === '512 B', 'bytes wrong: ' + humanSize(512));
    assert(humanSize(44000) === '43 KB', 'kilobytes wrong: ' + humanSize(44000));
    assert(humanSize(2_400_000) === '2.3 MB', 'megabytes wrong: ' + humanSize(2_400_000));
    assert(humanSize(undefined) === '', 'a missing size printed something');
  });

  return { allPassed: results.every((r) => r.pass), results };
}
