import { describe, it, expect } from 'vitest';
import {
  buildXlsxBlob,
  makeExcelCellTextVisible,
  type XlsxSheet
} from '../../src/diff/xlsx-builder';

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

  it('fails fast when workbook or sheet dimensions exceed Excel limits', () => {
    expect(() => buildXlsxBlob([])).toThrow(/at least one worksheet/);
    expect(() => buildXlsxBlob([{
      name: 'too many rows',
      rows: new Array(1048577) as XlsxSheet['rows']
    }])).toThrow(/rows exceeds the Excel limit \(1,048,576\)/);
    expect(() => buildXlsxBlob([{
      name: 'too many columns',
      rows: [new Array(16385)]
    }])).toThrow(/columns exceeds the Excel limit \(16,384\)/);
    expect(() => buildXlsxBlob([{
      name: 'too many widths',
      rows: [],
      colWidths: new Array(16385)
    }])).toThrow(/column widths exceeds the Excel limit \(16,384\)/);
    expect(() => buildXlsxBlob([{
      name: 'too many cell style columns',
      rows: [],
      cellStyles: [new Array(16385)]
    }])).toThrow(/cell style row 1 columns exceeds the Excel limit \(16,384\)/);

    for (const sheet of [
      { name: 'row styles', rows: [], rowStyles: new Array(1048577) },
      { name: 'row heights', rows: [], rowHeights: new Array(1048577) },
      { name: 'row outlines', rows: [], rowOutlines: new Array(1048577) },
      { name: 'cell style rows', rows: [], cellStyles: new Array(1048577) }
    ] as XlsxSheet[]) {
      expect(() => buildXlsxBlob([sheet])).toThrow(/exceeds the Excel limit \(1,048,576\)/);
    }
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

  it('replaces XML-forbidden characters and lone surrogates before validating sheet names', async () => {
    const sheets: XlsxSheet[] = [
      {
        name: `bad\u0001\\\uD800/name:${'x'.repeat(40)}`,
        rows: [['x']]
      },
      {
        name: `${'x'.repeat(30)}😀`,
        rows: [['x']]
      },
      {
        name: `${'y'.repeat(28)}😀`,
        rows: [['x']]
      },
      {
        name: `${'y'.repeat(28)}😀`,
        rows: [['x']]
      }
    ];
    const workbook = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/workbook.xml');
    const sheetNames = [...workbook.matchAll(/<sheet name="([^"]+)"/g)].map((match) => match[1]);
    const sheetName = sheetNames[0];

    expect(sheetName).toHaveLength(31);
    expect(sheetName).toMatch(/^bad____name_/);
    expect(sheetName).not.toMatch(/[\\\/\?\*\[\]:]/);
    expect(sheetName).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/);
    expect(sheetName).not.toContain('⟦U+');
    expect(sheetNames[1]).toBe('x'.repeat(30));
    expect(sheetNames[2]).toBe(`${'y'.repeat(28)}😀`);
    expect(sheetNames[3]).toBe(`${'y'.repeat(28)}_2`);
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

  it('renders XML 1.0-forbidden characters visibly and distinguishes literal token prefixes', async () => {
    const forbidden = '\u0000\u0001\u0008\u000B\u000C\u000E\u001F\uFFFE\uFFFF';
    const visibleTokens = '⟦U+0000⟧⟦U+0001⟧⟦U+0008⟧⟦U+000B⟧⟦U+000C⟧⟦U+000E⟧⟦U+001F⟧⟦U+FFFE⟧⟦U+FFFF⟧';
    expect(makeExcelCellTextVisible(forbidden)).toBe(visibleTokens);
    expect(makeExcelCellTextVisible('⟦U+0001⟧')).toBe('⟦⟦U+0001⟧');
    expect(makeExcelCellTextVisible('\t\n\r')).toBe('\t\n\r');

    const sheets: XlsxSheet[] = [{
      name: 'Sheet1',
      rows: [['value'], [`before${forbidden}after`], ['⟦U+0001⟧']]
    }];
    const sheet1 = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(sheet1).toContain(`before${visibleTokens}after`);
    expect(sheet1).toContain('⟦⟦U+0001⟧');
    expect(sheet1).not.toContain('\u0001');
    expect(sheet1).not.toContain('\uFFFE');
    expect(sheet1).not.toContain('\uFFFF');
  });

  it('renders lone surrogates visibly while preserving valid surrogate pairs', async () => {
    const value = `before\uD800middle\uDC00after😀`;
    const visible = 'before⟦U+D800⟧middle⟦U+DC00⟧after😀';
    expect(makeExcelCellTextVisible(value)).toBe(visible);

    const sheets: XlsxSheet[] = [{ name: 'Sheet1', rows: [['value'], [value]] }];
    const sheet1 = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(sheet1).toContain(visible);
  });

  it('preserves CR, LF, and CRLF as distinct cell text sequences', async () => {
    const value = 'A\rB\nC\r\nD&#13;';
    const sheets: XlsxSheet[] = [{ name: 'Sheet1', rows: [['value'], [value]] }];
    const sheet1 = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    const cellText = /<c r="A2"[^>]*><is><t[^>]*>([\s\S]*?)<\/t><\/is><\/c>/.exec(sheet1)?.[1];

    expect(cellText).toBe('A&#13;B\nC&#13;\nD&amp;#13;');
    expect(cellText).not.toContain('\r');
  });

  it('strips XML-forbidden characters from structural XML attributes instead of expanding them', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'Sheet1',
      rows: [['value'], ['x']],
      dataValidations: [{
        sqref: 'A2:A2',
        values: ['ok\u0001\uD800value'],
        promptTitle: 'title\u0001\uD800',
        prompt: 'prompt\uFFFE\uDC00'
      }]
    }];
    const sheet1 = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(sheet1).toContain('promptTitle="title"');
    expect(sheet1).toContain('prompt="prompt"');
    expect(sheet1).toContain('<formula1>&quot;okvalue&quot;</formula1>');
    expect(sheet1).not.toContain('⟦U+');
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

  it('keeps only ordered A1 ranges and cell references within Excel bounds', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['linked']],
      autoFilter: false,
      merges: [
        'A1:B1',
        'XFD1048576:XFD1048576',
        'XFE1:XFE1',
        'A1048577:A1048577',
        'B1:A1',
        'A2:A1'
      ],
      dataValidations: [
        { sqref: 'A1:A1', values: ['ok'] },
        { sqref: 'XFD1048576:XFD1048576', values: ['edge'] },
        { sqref: 'XFE1:XFE1', values: ['outside column'] },
        { sqref: 'A1048577:A1048577', values: ['outside row'] },
        { sqref: 'B1:A1', values: ['reversed columns'] },
        { sqref: 'A2:A1', values: ['reversed rows'] }
      ],
      internalHyperlinks: [
        { ref: 'A1', targetSheet: 'S', targetCell: 'XFD1048576' },
        { ref: 'XFE1', targetSheet: 'S', targetCell: 'A1' },
        { ref: 'A1048577', targetSheet: 'S', targetCell: 'A1' },
        { ref: 'A2', targetSheet: 'S', targetCell: 'XFE1' }
      ]
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');

    expect(xml).toContain('<mergeCells count="2">');
    expect(xml).toContain('<mergeCell ref="A1:B1"/>');
    expect(xml).toContain('<mergeCell ref="XFD1048576:XFD1048576"/>');
    expect(xml).toContain('<dataValidations count="2">');
    expect(xml).toContain('sqref="A1:A1"');
    expect(xml).toContain('sqref="XFD1048576:XFD1048576"');
    expect(xml).toContain('<hyperlink ref="A1" location="&apos;S&apos;!XFD1048576"/>');
    expect(xml).not.toContain('XFE1');
    expect(xml).not.toContain('A1048577');
    expect(xml).not.toContain('B1:A1');
    expect(xml).not.toContain('A2:A1');
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
    expect(styles).toContain('<fonts count="16">');
    expect(styles).toContain('<cellXfs count="37">');
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

  it('adds A4 print setup, display zoom, repeating titles, and a safe footer without deriving formulas from cell values', async () => {
    const sheets: XlsxSheet[] = [{
      name: "一覧'確認",
      rows: [['group'], ['header'], ['=USER_TEXT()']],
      zoomScale: 85,
      print: {
        orientation: 'landscape',
        fitToWidth: 1,
        fitToHeight: 0,
        repeatRows: { from: 1, to: 2 },
        repeatColumns: { from: 1, to: 4 },
        horizontalCentered: true,
        footer: '&Rページ &P / &N'
      }
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const sheet = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const workbook = extractEntry(buf, 'xl/workbook.xml');
    expect(sheet).toContain('<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>');
    expect(sheet).toContain('zoomScale="85" zoomScaleNormal="85"');
    expect(sheet).toContain('<printOptions horizontalCentered="1"');
    expect(sheet).toContain('<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>');
    expect(sheet).toContain('<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>');
    expect(sheet).toContain('<headerFooter><oddFooter>&amp;Rページ &amp;P / &amp;N</oddFooter></headerFooter>');
    expect(workbook).toContain('name="_xlnm.Print_Titles" localSheetId="0"');
    expect(workbook).toContain('&apos;一覧&apos;&apos;確認&apos;!$1:$2');
    expect(workbook).toContain('&apos;一覧&apos;&apos;確認&apos;!$A:$D');
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

  it('can opt in to true blank styled cells without changing the legacy default', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['status', 'memo'], ['', '']],
      cellStyles: [[], ['review', 'review']],
      styledEmptyCellsAsBlank: true
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).toContain('<c r="A2" s="11"/>');
    expect(xml).toContain('<c r="B2" s="11"/>');
    expect(xml).not.toMatch(/<c r="A2"[^>]*t="inlineStr"/);
    expect(xml).not.toMatch(/<c r="B2"[^>]*t="inlineStr"/);
  });

  it('materializes missing table cells through maxCols and gives normal cells four thin edges', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['h1', 'h2', 'h3'], ['value'], ['link']],
      headerRow: 1,
      cellStyles: [[], [], ['actionLink']],
      materializeEmptyCellsFromRow: 1
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const styles = extractEntry(buf, 'xl/styles.xml');

    for (let row = 1; row <= 3; row += 1) {
      for (const column of ['A', 'B', 'C']) expect(xml).toContain(`<c r="${column}${row}"`);
    }
    expect(xml).toContain('<c r="B2" s="2"/>');
    expect(xml).toContain('<c r="C2" s="2"/>');
    expect(xml).toContain('<c r="B3" s="2"/>');
    expect(xml).toContain('<c r="C3" s="2"/>');
    expect(xml).not.toMatch(/<c r="[BC]2"[^>]*t="inlineStr"/);
    expect(xml).toContain('<c r="A3" s="30"');

    const borderBlock = /<borders\b[^>]*>([\s\S]*?)<\/borders>/.exec(styles)?.[1] || '';
    const borders = [...borderBlock.matchAll(/<border>([\s\S]*?)<\/border>/g)].map((match) => match[1]);
    expect(borders).toHaveLength(2);
    for (const edge of ['left', 'right', 'top', 'bottom']) {
      expect(borders[1]).toContain(`<${edge} style="thin"><color rgb="FFE2E8F0"/></${edge}>`);
    }
    expect(borders[1]).not.toMatch(/style="(?:medium|thick)"/);

    const cellXfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] || '';
    const cellXfs = [...cellXfsBlock.matchAll(/<xf\b[^>]*>/g)].map((match) => match[0]);
    cellXfs.forEach((xf, index) => {
      const expectedBorderId = [0, 6].includes(index) ? '0' : '1';
      expect(xf).toContain(`borderId="${expectedBorderId}"`);
      if (expectedBorderId === '1') expect(xf).toContain('applyBorder="1"');
    });
    expect(cellXfs[30]).toContain('borderId="1"');
    expect(cellXfs[30]).toContain('applyBorder="1"');
    expect(cellXfs[32]).toContain('fillId="4"');
    expect(cellXfs[32]).toContain('borderId="1"');
    expect(cellXfs[32]).toContain('applyFill="1"');
    expect(cellXfs[32]).toContain('applyBorder="1"');
  });

  it('suppresses number-stored-as-text warnings across the used range without adding formulas or external links', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['ID', 'value'], ['00123', '=USER_TEXT()'], ['', '0456']],
      materializeEmptyCellsFromRow: 1,
      print: { footer: '&R&P / &N' }
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');

    expect(xml).toContain('<ignoredErrors><ignoredError sqref="A1:B3" numberStoredAsText="1"/></ignoredErrors>');
    expect(xml.indexOf('<headerFooter>')).toBeLessThan(xml.indexOf('<ignoredErrors>'));
    expect(xml.indexOf('<ignoredErrors>')).toBeLessThan(xml.indexOf('</worksheet>'));
    expect(xml).not.toContain('<f>');
    expect(xml).not.toContain('r:id=');
  });

  it('does not emit ignoredErrors for a sheet without a used range', async () => {
    const sheets: XlsxSheet[] = [{ name: 'S', rows: [] }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    expect(xml).not.toContain('<ignoredErrors>');
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

  it('uses a restrained role palette that separates direction, change facts, and review inputs', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [
        ['title'],
        ['ok', 'neutral', 'danger', 'change'],
        ['review', 'info', 'link', 'choice'],
        ['added', 'removed', 'changed', 'moved'],
        ['before', 'after', 'absent']
      ],
      cellStyles: [
        ['title'],
        ['kpiGood', 'kpiWarning', 'kpiDanger', 'kpiChange'],
        ['review', 'info', 'hyperlink', 'reviewChoice'],
        ['changeAdded', 'changeRemoved', 'changeChanged', 'changeMoved'],
        ['diffBefore', 'diffAfter', 'diffAbsent']
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
    expect(xml).toMatch(/<c r="D2" s="19"/);
    expect(xml).toMatch(/<c r="D3" s="29"/);
    expect(xml).toMatch(/<c r="A4" s="25"/);
    expect(xml).toMatch(/<c r="B4" s="26"/);
    expect(xml).toMatch(/<c r="C4" s="27"/);
    expect(xml).toMatch(/<c r="D4" s="28"/);
    expect(xml).toMatch(/<c r="A5" s="37"/);
    expect(xml).toMatch(/<c r="B5" s="38"/);
    expect(xml).toMatch(/<c r="C5" s="39"/);
    expect(styles).toContain('<fonts count="18">');
    expect(styles).toContain('<fills count="10">');
    expect(styles).toContain('<borders count="2">');
    expect(styles).toContain('<cellXfs count="40">');
    expect(styles).not.toContain('Consolas');
    expect(styles).toContain('color rgb="FF991B1B"');
    expect(styles).toContain('color rgb="FF166534"');
    expect(styles).not.toMatch(/style="(?:medium|thick)"/);
    expect(styles).toContain('rgb="FF1E3A5F"');
    expect(styles).toContain('rgb="FFF1F5F9"');
    expect(styles).toContain('rgb="FFEFF6FF"');
    expect(styles).toContain('rgb="FFFEF2F2"');
    expect(styles).toContain('rgb="FFFFFBEB"');
    expect(styles).toContain('rgb="FFECFDF5"');
    expect(styles).toContain('rgb="FFF5F3FF"');
    expect(styles).toContain('<left style="thin"');
    expect(styles).toContain('<right style="thin"');
    expect(styles).toContain('<top style="thin"');
    expect(styles).toContain('<bottom style="thin"');

    const cellXfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] || '';
    const cellXfs = [...cellXfsBlock.matchAll(/<xf\b[^>]*>/g)].map((match) => match[0]);
    expect(cellXfs[32]).toContain('fillId="4"');
    expect(cellXfs[32]).toContain('borderId="1"');
    expect(cellXfs[39]).toContain('fillId="3"');
    expect(cellXfs[39]).toContain('borderId="1"');
    const borderIds = [...cellXfsBlock.matchAll(/<xf\b[^>]*\bborderId="([0-9]+)"[^>]*>/g)]
      .map((match) => match[1]);
    expect(new Set(borderIds)).toEqual(new Set(['0', '1']));
    expect(borderIds.filter((borderId) => borderId === '0')).toHaveLength(2);
  });

  it('adds opt-in monospace raw styles without changing existing style indexes', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['before', 'after', 'warning'], ['{"path":"C:\\\\tmp"}', '{"ok":true}', 'raw warning']],
      cellStyles: [[], ['rawDiffBefore', 'rawDiffAfter', 'rawWarning']]
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const styles = extractEntry(buf, 'xl/styles.xml');

    expect(xml).toMatch(/<c r="A2" s="40"/);
    expect(xml).toMatch(/<c r="B2" s="41"/);
    expect(xml).toMatch(/<c r="C2" s="42"/);
    expect(styles).toContain('<fonts count="21">');
    expect(styles).toContain('<cellXfs count="45">');

    const fontsBlock = /<fonts\b[^>]*>([\s\S]*?)<\/fonts>/.exec(styles)?.[1] || '';
    const fonts = [...fontsBlock.matchAll(/<font>([\s\S]*?)<\/font>/g)].map((match) => match[1]);
    expect(fonts).toHaveLength(21);
    for (const index of [18, 19, 20]) {
      expect(fonts[index]).toContain('<name val="Consolas"/>');
      expect(fonts[index]).toContain('<family val="3"/>');
    }
    expect(fonts[18]).toContain('<color rgb="FF991B1B"/>');
    expect(fonts[19]).toContain('<color rgb="FF166534"/>');
    expect(fonts[20]).toContain('<color rgb="FF92400E"/>');

    const cellXfsBlock = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] || '';
    const cellXfs = [...cellXfsBlock.matchAll(/<xf\b[^>]*>/g)].map((match) => match[0]);
    expect(cellXfs).toHaveLength(45);
    expect(cellXfs[37]).toContain('fontId="16"');
    expect(cellXfs[38]).toContain('fontId="17"');
    expect(cellXfs[39]).toContain('fontId="0"');
    expect(cellXfs[40]).toContain('fontId="18" fillId="5"');
    expect(cellXfs[41]).toContain('fontId="19" fillId="8"');
    expect(cellXfs[42]).toContain('fontId="20" fillId="6"');
    expect(cellXfs[43]).toContain('fontId="5" fillId="5"');
    expect(cellXfs[43]).toContain('borderId="1"');
    expect(cellXfs[43]).toContain('applyFont="1"');
    expect(cellXfs[43]).toContain('applyFill="1"');
    expect(cellXfs[43]).toContain('applyBorder="1"');
    expect(cellXfs[43]).toContain('applyAlignment="1"');
    expect(cellXfs[44]).toContain('fontId="5" fillId="8"');
    expect(cellXfs[44]).toContain('borderId="1"');
    expect(cellXfs[44]).toContain('applyFont="1"');
    expect(cellXfs[44]).toContain('applyFill="1"');
    expect(cellXfs[44]).toContain('applyBorder="1"');
    expect(cellXfs[44]).toContain('applyAlignment="1"');

    const cellXfEntries = [...cellXfsBlock.matchAll(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g)]
      .map((match) => match[0]);
    expect(cellXfEntries[43]).toContain('<alignment vertical="top" wrapText="1"/>');
    expect(cellXfEntries[44]).toContain('<alignment vertical="top" wrapText="1"/>');
  });

  it('maps semantic aliases to existing style indexes without adding XFs', async () => {
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [[
        'good KPI', 'warning KPI', 'danger KPI',
        'good', 'difference', 'incomplete', 'error',
        'warning link', 'before link', 'after link'
      ]],
      cellStyles: [[
        'kpiStatusGood', 'kpiStatusWarning', 'kpiStatusDanger',
        'statusGood', 'statusDifference', 'statusIncomplete', 'statusError',
        'warningLink', 'diffBeforeLink', 'diffAfterLink'
      ]]
    }];
    const buf = await blobToBuffer(buildXlsxBlob(sheets));
    const xml = extractEntry(buf, 'xl/worksheets/sheet1.xml');
    const styles = extractEntry(buf, 'xl/styles.xml');

    expect(xml).toMatch(/<c r="A1" s="33"/);
    expect(xml).toMatch(/<c r="B1" s="35"/);
    expect(xml).toMatch(/<c r="C1" s="34"/);
    expect(xml).toMatch(/<c r="D1" s="25"/);
    expect(xml).toMatch(/<c r="E1" s="28"/);
    expect(xml).toMatch(/<c r="F1" s="27"/);
    expect(xml).toMatch(/<c r="G1" s="26"/);
    expect(xml).toMatch(/<c r="H1" s="43"/);
    expect(xml).toMatch(/<c r="I1" s="43"/);
    expect(xml).toMatch(/<c r="J1" s="44"/);
    expect(styles).toContain('<fonts count="21">');
    expect(styles).toContain('<cellXfs count="45">');
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

  it('truncates oversized text only at grapheme boundaries', async () => {
    const originalLength = 40000;
    const suffixLength = `\n…（Excelセル上限32,767文字のため省略・元${originalLength}文字・識別:00000000）`.length;
    const keep = 32767 - suffixLength;
    const atBoundary = (cluster: string, naiveClusterUnits: number): { value: string; expectedPrefix: string } => {
      const expectedPrefix = 'a'.repeat(keep - naiveClusterUnits);
      const remaining = originalLength - expectedPrefix.length - cluster.length;
      return { value: expectedPrefix + cluster + 'b'.repeat(remaining), expectedPrefix };
    };
    const cases = [
      atBoundary('👨‍👩‍👧‍👦', 2),
      atBoundary('e\u0301', 1),
      atBoundary('🇯🇵', 2)
    ];
    const sheets: XlsxSheet[] = [{
      name: 'S',
      rows: [['value'], ...cases.map(({ value }) => [value])]
    }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');

    cases.forEach(({ expectedPrefix }, index) => {
      const ref = `A${index + 2}`;
      const cellText = new RegExp(`<c r="${ref}"[^>]*><is><t[^>]*>([\\s\\S]*?)<\\/t><\\/is><\\/c>`).exec(xml)?.[1];
      const preview = cellText?.split('\n…（Excelセル上限32,767文字のため省略')[0];
      expect(preview).toBe(expectedPrefix);
      expect(cellText?.length).toBeLessThanOrEqual(32767);
    });
  });

  it('applies the Excel cell limit after forbidden characters expand to visible escapes', async () => {
    const forbiddenCharacters = '\u0001'.repeat(6000);
    const sheets: XlsxSheet[] = [{ name: 'S', rows: [['value'], [forbiddenCharacters]] }];
    const xml = extractEntry(await blobToBuffer(buildXlsxBlob(sheets)), 'xl/worksheets/sheet1.xml');
    const match = xml.match(/<c r="A2"[^>]*><is><t[^>]*>([\s\S]*?)<\/t><\/is><\/c>/);
    expect(match).not.toBeNull();
    const text = match![1];
    expect(text.length).toBeLessThanOrEqual(32767);
    expect(text).toContain('⟦U+0001⟧');
    expect(text).not.toContain('\u0001');
    expect(text).toMatch(/\n…（Excelセル上限32,767文字のため省略・元48000文字・識別:[0-9a-f]{8}）$/);
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
