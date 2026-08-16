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
    const rels = extractEntry(buf, 'xl/_rels/workbook.xml.rels');
    expect(rels).toContain('relationships/styles');
    expect(rels).toContain('Target="styles.xml"');
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

  it('sanitizes edge apostrophes and de-duplicates names case-insensitively', async () => {
    const sheets: XlsxSheet[] = [
      { name: "'Edge'", rows: [['x']] },
      { name: 'Case', rows: [['x']] },
      { name: 'case', rows: [['x']] }
    ];
    const workbook = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/workbook.xml');
    expect(workbook).toContain('name="_Edge_"');
    expect(workbook).toContain('name="Case"');
    expect(workbook).toContain('name="case_2"');
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

  it('removes XML 1.0 noncharacters that make Excel reject the workbook', async () => {
    const sheets: XlsxSheet[] = [{ name: 'Sheet1', rows: [['value'], ['before\uFFFEafter\uFFFF']] }];
    const sheet1 = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(sheet1).toContain('beforeafter');
    expect(sheet1).not.toContain('\uFFFE');
    expect(sheet1).not.toContain('\uFFFF');
  });

  it('preserves text that looks like an Excel _xHHHH_ escape sequence', async () => {
    const sheets: XlsxSheet[] = [{ name: 'Sheet1', rows: [['value'], ['abc_x0041_def'], ['_x000A_'], ['_x005F_x0041_']] }];
    const sheet1 = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(sheet1).toContain('abc_x005F_x0041_def');
    expect(sheet1).toContain('_x005F_x000A_');
    expect(sheet1).toContain('_x005F_x005F_x005F_x0041_');
    expect(sheet1).not.toContain('>abc_x0041_def<');
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

  it('supports frozen rows and columns, hidden gridlines, merged titles, and valid OOXML order', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['title', '', ''], ['h1', 'h2', 'h3'], ['a', 'b', 'c']],
      headerRow: 2,
      freezeRows: 2,
      freezeColumns: 2,
      showGridLines: false,
      merges: ['A1:C1']
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).toContain('showGridLines="0"');
    expect(xml).toContain('<pane xSplit="2" ySplit="2" topLeftCell="C3" activePane="bottomRight" state="frozen"/>');
    expect(xml).toContain('<mergeCell ref="A1:C1"/>');
    expect(xml).toContain('<autoFilter ref="A2:C3"/>');
    expect(xml).toMatch(/<c r="A2" s="1"/);
    expect(xml.indexOf('<autoFilter ')).toBeLessThan(xml.indexOf('<mergeCells '));
  });

  it('adds A4 print setup and repeating header rows without deriving formulas from cell values', async () => {
    const sheets: XlsxSheet[] = [{
      name: "一覧'確認",
      rows: [['group'], ['header'], ['=USER_TEXT()']],
      print: {
        orientation: 'landscape',
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 1, to: 2 }
      }
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const sheet = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const workbook = extractEntry(buf, 'xl/workbook.xml');
    expect(sheet).toContain('<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
    expect(sheet).toContain('<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>');
    expect(sheet).toContain('<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    expect(workbook).toContain('name="_xlnm.Print_Titles" localSheetId="0"');
    expect(workbook).toContain('&apos;一覧&apos;&apos;確認&apos;!$1:$2');
    expect(sheet).toContain('=USER_TEXT()');
    expect(sheet).not.toContain('<f>');
  });

  it('writes styled empty review cells and a safe list validation', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['status', 'memo'], ['', '']],
      cellStyles: [[], ['review', 'review']],
      dataValidations: [{
        sqref: 'A2:A2',
        values: ['未確認', '確認済み'],
        promptTitle: '確認状態',
        prompt: '進捗を選択'
      }]
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<c r="A2" s="17" t="inlineStr"><is><t[^>]*><\/t><\/is><\/c>/);
    expect(xml).toMatch(/<c r="B2" s="17" t="inlineStr"><is><t[^>]*><\/t><\/is><\/c>/);
    expect(xml).toContain('<dataValidations count="1">');
    expect(xml).toContain('sqref="A2:A2"');
    expect(xml).toContain('&quot;未確認,確認済み&quot;');
    expect(xml).not.toContain('<f>');
  });

  it('applies semantic row styles without changing the header style', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['type'], ['added'], ['removed'], ['changed'], ['same'], ['reference'], ['warning']],
      rowStyles: ['warning', 'added', 'removed', 'changed', 'same', 'reference', 'warning']
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<c r="A1" s="1"/);
    expect(xml).toMatch(/<c r="A2" s="3"/);
    expect(xml).toMatch(/<c r="A3" s="4"/);
    expect(xml).toMatch(/<c r="A4" s="5"/);
    expect(xml).toMatch(/<c r="A5" s="6"/);
    expect(xml).toMatch(/<c r="A6" s="7"/);
    expect(xml).toMatch(/<c r="A7" s="8"/);
  });

  it('applies title, KPI, severity, and per-cell styles', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['title'], ['ok', 'warn', 'danger'], ['high', 'medium', 'low']],
      cellStyles: [
        ['title'],
        ['kpiGood', 'kpiWarning', 'kpiDanger'],
        ['severityHigh', 'severityMedium', 'severityLow']
      ]
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<c r="A1" s="9"/);
    expect(xml).toMatch(/<c r="A2" s="11"/);
    expect(xml).toMatch(/<c r="B2" s="12"/);
    expect(xml).toMatch(/<c r="C2" s="13"/);
    expect(xml).toMatch(/<c r="A3" s="14"/);
    expect(xml).toMatch(/<c r="B3" s="15"/);
    expect(xml).toMatch(/<c r="C3" s="16"/);
  });

  it('truncates oversized text to the Excel cell limit without splitting a surrogate pair', async () => {
    const oversized = '😀'.repeat(20000);
    const sheets: XlsxSheet[] = [{ name: 'S', rows: [['value'], [oversized]] }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    const match = xml.match(/<c r="A2"[^>]*><is><t[^>]*>([\s\S]*?)<\/t><\/is><\/c>/);
    expect(match).not.toBeNull();
    const text = match![1];
    expect(text.length).toBeLessThanOrEqual(32767);
    expect(text).toContain('Excelセル上限32,767文字のため省略');
    expect(text).toMatch(/元40000文字・識別:[0-9a-f]{8}/);
    expect(/[\uD800-\uDBFF]$/.test(text)).toBe(false);
  });

  it('adds a distinct hash when long values differ only after the visible prefix', async () => {
    const common = 'x'.repeat(39999);
    const sheets: XlsxSheet[] = [{ name: 'S', rows: [['value'], [`${common}A`], [`${common}B`]] }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    const hashes = [...xml.matchAll(/識別:([0-9a-f]{8})/g)].map((match) => match[1]);
    expect(hashes).toHaveLength(2);
    expect(hashes[0]).not.toBe(hashes[1]);
  });
});
