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

  it('adds relationship-free internal hyperlinks to sanitized sheet names in valid OOXML order', async () => {
    const sheets: XlsxSheet[] = [{
      name: '概要',
      rows: [['section'], ['フィールド設定へ']],
      merges: ['A1:B1'],
      dataValidations: [{ sqref: 'A2:A2', values: ['フィールド設定へ'] }],
      internalHyperlinks: [{
        ref: 'a2',
        targetSheet: "フィールド/設定'詳細",
        targetCell: 'b3',
        tooltip: '詳細差分へ "移動"'
      }],
      print: { orientation: 'landscape' }
    }, {
      name: "フィールド/設定'詳細",
      rows: [['header'], ['x'], ['target']]
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const styles = extractEntry(buf, 'xl/styles.xml');

    expect(xml).toContain('<hyperlinks><hyperlink ref="A2"');
    expect(xml).toContain('location="&apos;フィールド_設定&apos;&apos;詳細&apos;!B3"');
    expect(xml).toContain('tooltip="詳細差分へ &quot;移動&quot;"');
    expect(xml).not.toContain('r:id=');
    expect(xml).toMatch(/<c r="A2" s="13"/);
    expect(styles).toContain('<fonts count="6">');
    expect(styles).toContain('<cellXfs count="18">');
    expect(xml.indexOf('<mergeCells ')).toBeLessThan(xml.indexOf('<dataValidations '));
    expect(xml.indexOf('<dataValidations ')).toBeLessThan(xml.indexOf('<hyperlinks>'));
    expect(xml.indexOf('<hyperlinks>')).toBeLessThan(xml.indexOf('<printOptions '));
    expect(findCentralDirEntries(buf)).not.toContain('xl/worksheets/_rels/sheet1.xml.rels');
  });

  it('rejects unsafe internal hyperlink references and resolves duplicate sheets by index without formulas', async () => {
    const sheets: XlsxSheet[] = [{
      name: '概要',
      rows: [['header'], ['safe'], ['unsafe'], ['unresolved']],
      internalHyperlinks: [
        { ref: 'A2', targetSheetIndex: 2, targetCell: 'A1' },
        { ref: 'A3', targetSheet: 'Detail', targetCell: 'A1" external="1' },
        { ref: 'XFE1048577', targetSheet: 'Detail', targetCell: 'A1' },
        { ref: 'A4', targetSheet: '=HYPERLINK("https://example.invalid")', targetCell: 'A1' }
      ]
    }, {
      name: 'Detail',
      rows: [['first']]
    }, {
      name: 'Detail',
      rows: [['second']]
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');

    expect(xml).toContain('<hyperlink ref="A2" location="&apos;Detail_2&apos;!A1"/>');
    expect(xml).not.toContain('<hyperlink ref="A3"');
    expect(xml).not.toContain('<hyperlink ref="A4"');
    expect(xml).not.toContain('XFE1048577');
    expect(xml).not.toContain('<f>');
    expect(xml).not.toContain('https://example.invalid');
  });

  it('writes row outlines with bounded levels and combines outline and print properties safely', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['parent'], ['detail 1'], ['detail 2'], ['next parent']],
      rowOutlines: [
        { collapsed: true },
        { level: 1, hidden: true },
        { level: 99, hidden: true },
        { level: -1, hidden: true }
      ],
      outlineSummaryBelow: false,
      print: { orientation: 'portrait' }
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');

    expect(xml).toContain('<sheetPr><outlinePr summaryBelow="0" summaryRight="1"/><pageSetUpPr fitToPage="1"/></sheetPr>');
    expect(xml).toContain('<sheetFormatPr defaultRowHeight="16" outlineLevelRow="7"/>');
    expect(xml).toMatch(/<row r="1" collapsed="1">/);
    expect(xml).toMatch(/<row r="2" outlineLevel="1" hidden="1">/);
    expect(xml).toMatch(/<row r="3" outlineLevel="7" hidden="1">/);
    expect(xml).toMatch(/<row r="4">/);
    expect(xml.indexOf('<sheetPr>')).toBeLessThan(xml.indexOf('<sheetViews>'));
    expect(xml.indexOf('<sheetData>')).toBeLessThan(xml.indexOf('<autoFilter '));
    expect(xml.indexOf('<autoFilter ')).toBeLessThan(xml.indexOf('<printOptions '));
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
    expect(xml).toMatch(/<c r="A2" s="11" t="inlineStr"><is><t[^>]*><\/t><\/is><\/c>/);
    expect(xml).toMatch(/<c r="B2" s="11" t="inlineStr"><is><t[^>]*><\/t><\/is><\/c>/);
    expect(xml).toContain('<dataValidations count="1">');
    expect(xml).toContain('sqref="A2:A2"');
    expect(xml).toContain('&quot;未確認,確認済み&quot;');
    expect(xml).not.toContain('<f>');
  });

  it('applies source, target, comparison-divider, and warning roles without changing the header style', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['role', 'header divider'], ['source', 'source divider'], ['target', 'source group'], ['warning', 'target group']],
      rowStyles: ['warning', 'source', 'target', 'warning'],
      cellStyles: [
        [undefined, 'headerDivider'],
        [undefined, 'sourceDivider'],
        [undefined, 'sourceGroup'],
        [undefined, 'targetGroup']
      ]
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).toMatch(/<c r="A1" s="1"/);
    expect(xml).toMatch(/<c r="B1" s="15"/);
    expect(xml).toMatch(/<c r="A2" s="3"/);
    expect(xml).toMatch(/<c r="B2" s="14"/);
    expect(xml).toMatch(/<c r="A3" s="4"/);
    expect(xml).toMatch(/<c r="B3" s="16"/);
    expect(xml).toMatch(/<c r="A4" s="5"/);
    expect(xml).toMatch(/<c r="B4" s="17"/);
  });

  it('uses a restrained role palette with neutral KPI styles and no severity colors', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['title'], ['ok', 'neutral', 'danger'], ['review', 'info', 'link']],
      cellStyles: [
        ['title'],
        ['kpiGood', 'kpiWarning', 'kpiDanger'],
        ['review', 'info', 'hyperlink']
      ]
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const styles = extractEntry(buf, 'xl/styles.xml');
    expect(xml).toMatch(/<c r="A1" s="6"/);
    expect(xml).toMatch(/<c r="A2" s="8"/);
    expect(xml).toMatch(/<c r="B2" s="9"/);
    expect(xml).toMatch(/<c r="C2" s="10"/);
    expect(xml).toMatch(/<c r="A3" s="11"/);
    expect(xml).toMatch(/<c r="B3" s="12"/);
    expect(xml).toMatch(/<c r="C3" s="13"/);
    expect(styles).toContain('<fills count="7">');
    expect(styles).toContain('<borders count="5">');
    expect(styles).toContain('<cellXfs count="18">');
    expect(styles).toContain('<right style="medium"><color rgb="FF64748B"/></right>');
    expect(styles).toContain('rgb="FF1E3A5F"');
    expect(styles).toContain('rgb="FFF1F5F9"');
    expect(styles).toContain('rgb="FFEFF6FF"');
    expect(styles).toContain('rgb="FFFEF2F2"');
    expect(styles).toContain('rgb="FFFFF8D6"');
    expect(styles).not.toContain('rgb="FFDCFCE7"');
    expect(styles).not.toContain('rgb="FFF5F3FF"');
    expect(styles).not.toContain('rgb="FFFFF7ED"');
    expect(styles).not.toContain('<left style="thin"');
    expect(styles).not.toContain('<right style="thin"');
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
