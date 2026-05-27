import { describe, it, expect } from 'vitest';
import { buildXlsxBlob, type XlsxSheet } from '../../src/diff/xlsx-builder';

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const ab = await blob.arrayBuffer();
  return Buffer.from(ab);
}

function findCentralDirEntries(buf: Buffer): string[] {
  // EOCD is the last 22 bytes (no zip comment in our writer).
  const eocdOffset = buf.length - 22;
  expect(buf.readUInt32LE(eocdOffset)).toBe(0x06054b50);
  const cdSize = buf.readUInt32LE(eocdOffset + 12);
  const cdStart = buf.readUInt32LE(eocdOffset + 16);

  const names: string[] = [];
  let off = cdStart;
  const end = cdStart + cdSize;
  while (off < end) {
    expect(buf.readUInt32LE(off)).toBe(0x02014b50);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const name = buf.slice(off + 46, off + 46 + nameLen).toString('utf8');
    names.push(name);
    off += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

function extractEntry(buf: Buffer, name: string): string {
  // Find local file header by linear scan
  for (let off = 0; off < buf.length - 4; off++) {
    if (buf.readUInt32LE(off) === 0x04034b50) {
      const nameLen = buf.readUInt16LE(off + 26);
      const extraLen = buf.readUInt16LE(off + 28);
      const entryName = buf.slice(off + 30, off + 30 + nameLen).toString('utf8');
      const compressed = buf.readUInt32LE(off + 18);
      if (entryName === name) {
        const dataStart = off + 30 + nameLen + extraLen;
        return buf.slice(dataStart, dataStart + compressed).toString('utf8');
      }
    }
  }
  throw new Error(`entry not found: ${name}`);
}

describe('diff/xlsx-builder', () => {
  it('produces a valid xlsx zip with the expected parts', async () => {
    const sheets: XlsxSheet[] = [
      { name: 'シート1', rows: [['列A', '列B'], ['値1', 42]] },
      { name: '別の/危ない:名前', rows: [['x'], ['y']] }
    ];
    const blob = buildXlsxBlob(sheets);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const buf = await blobToBuffer(blob);
    expect(buf.length).toBeGreaterThan(100);

    const names = findCentralDirEntries(buf).sort();
    expect(names).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml'
    ]);
  });

  it('sanitizes sheet names (forbidden chars, length, duplicates)', async () => {
    const longName = 'a'.repeat(40);
    const sheets: XlsxSheet[] = [
      { name: 'a/b:c?[d]*e\\f', rows: [['x']] },
      { name: longName, rows: [['x']] },
      { name: longName, rows: [['x']] }
    ];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const workbook = extractEntry(buf, 'xl/workbook.xml');
    // forbidden chars become "_"
    expect(workbook).toContain('a_b_c__d__e_f');
    // long names are truncated to 31; duplicates get _2 suffix
    const aOnce = 'a'.repeat(31);
    expect(workbook).toContain(`name="${aOnce}"`);
    expect(workbook).toMatch(/name="a{29}_2"/);
  });

  it('escapes XML special characters in cell values', async () => {
    const sheets: XlsxSheet[] = [
      { name: 'Sheet1', rows: [['<tag>'], ['a & b'], ['"quoted"']] }
    ];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const sheet1 = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    expect(sheet1).toContain('&lt;tag&gt;');
    expect(sheet1).toContain('a &amp; b');
    expect(sheet1).toContain('&quot;quoted&quot;');
  });

  it('writes numbers as <v> and strings as inline strings', async () => {
    const sheets: XlsxSheet[] = [
      { name: 'Sheet1', rows: [['head'], [123], ['text']] }
    ];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<c r="A2"[^>]*><v>123<\/v><\/c>/);
    expect(xml).toMatch(/<c r="A3"[^>]*t="inlineStr"><is><t[^>]*>text<\/t><\/is><\/c>/);
  });

  it('includes freeze pane + autofilter when there is a header row', async () => {
    const sheets: XlsxSheet[] = [
      { name: 'S', rows: [['h1', 'h2'], ['a', 'b']] }
    ];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    expect(xml).toContain('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
    expect(xml).toContain('<autoFilter ref="A1:B2"/>');
  });

  it('honors freezeHeader=false and autoFilter=false', async () => {
    const sheets: XlsxSheet[] = [
      { name: 'S', rows: [['h1'], ['a']], freezeHeader: false, autoFilter: false }
    ];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    expect(xml).not.toContain('<pane ');
    expect(xml).not.toContain('<autoFilter ');
  });
});
