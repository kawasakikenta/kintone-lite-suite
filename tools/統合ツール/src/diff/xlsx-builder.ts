'use strict';

/**
 * 追加ライブラリ無しで .xlsx (OOXML / SpreadsheetML) を組み立てる最小実装。
 * - 圧縮なし (STORE) の ZIP コンテナを自前で構築。
 * - 文字列はインライン文字列 (<is><t>) で書き出し、共有文字列表は持たない。
 * - スタイルは「ヘッダ (太字+塗り)」「データ (top + wrapText)」「タイトル」の3種のみ。
 *
 * 差分比較タブの XLSX 出力で利用。SheetJS など外部 CDN に依存しないため、
 * オフライン環境やゲストスペースでも安定して動作する。
 */

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// ---------------------------------------------------------------------------
// ZIP container (no compression)
// ---------------------------------------------------------------------------

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    crcTable = t;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = (crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry { name: string; data: Uint8Array; }

function buildStoredZip(entries: ZipEntry[]): Blob {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const DOS_TIME = 0;
  const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
  const enc = new TextEncoder();
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const data = e.data;
    const crc = crc32(data);
    const size = data.length;
    const lfh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lfh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, DOS_TIME, true);
    dv.setUint16(12, DOS_DATE, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);
    parts.push(lfh, data);

    const cdh = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cdh.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, DOS_TIME, true);
    cdv.setUint16(14, DOS_DATE, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    cdh.set(nameBytes, 46);
    central.push(cdh);
    offset += lfh.length + data.length;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) { parts.push(c); cdSize += c.length; }
  const eocd = new Uint8Array(22);
  const edv = new DataView(eocd.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, central.length, true);
  edv.setUint16(10, central.length, true);
  edv.setUint32(12, cdSize, true);
  edv.setUint32(16, cdStart, true);
  edv.setUint16(20, 0, true);
  parts.push(eocd);
  return new Blob(parts as BlobPart[], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escapeXml(s: unknown): string {
  return String(s ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colRef(n: number): string {
  let s = '';
  let v = n;
  while (v > 0) { const r = (v - 1) % 26; s = String.fromCharCode(65 + r) + s; v = Math.floor((v - 1) / 26); }
  return s;
}

function sanitizeSheetName(name: string, index: number, used: Set<string>): string {
  let n = String(name || `Sheet${index + 1}`).replace(/[\\\/\?\*\[\]:]/g, '_');
  if (n.length > 31) n = n.slice(0, 31);
  if (!n) n = `Sheet${index + 1}`;
  let candidate = n;
  let i = 2;
  while (used.has(candidate)) {
    const suffix = `_${i++}`;
    candidate = (n.length + suffix.length > 31 ? n.slice(0, 31 - suffix.length) : n) + suffix;
  }
  used.add(candidate);
  return candidate;
}

// ---------------------------------------------------------------------------
// Sheet / Workbook XML
// ---------------------------------------------------------------------------

export type XlsxCellValue = string | number | boolean | null | undefined;
export interface XlsxSheet {
  name: string;
  /**
   * 2D rows. 1 行目はヘッダ扱い (太字+塗り)。
   * セル値は文字列 / 数値 / boolean / null / undefined。
   */
  rows: XlsxCellValue[][];
  /** ヘッダ行をフリーズしない場合は false。既定: true */
  freezeHeader?: boolean;
  /** AutoFilter を付ける場合は true。既定: true */
  autoFilter?: boolean;
  /** 各列の幅 (文字数換算)。未指定なら内容から自動推定。 */
  colWidths?: number[];
}

const MIN_COL_W = 10;
const MAX_COL_W = 60;

function estimateColWidth(rows: XlsxCellValue[][], col: number): number {
  let max = MIN_COL_W;
  const limit = Math.min(rows.length, 500); // ざっくり上位 500 行で推定
  for (let r = 0; r < limit; r++) {
    const v = rows[r] ? rows[r][col] : undefined;
    if (v == null) continue;
    const text = String(v);
    // 改行は1行ごとに分けて、最大行長を採用
    let maxLine = 0;
    for (const line of text.split('\n')) {
      // 全角文字は約2幅、ASCIIは約1幅で概算
      let w = 0;
      for (let i = 0; i < line.length; i++) {
        const code = line.charCodeAt(i);
        w += (code > 127 || code === 0) ? 2 : 1;
      }
      if (w > maxLine) maxLine = w;
    }
    if (maxLine > max) max = maxLine;
  }
  return Math.min(MAX_COL_W, max + 2);
}

function buildSheetXml(sheet: XlsxSheet): string {
  const rows = sheet.rows || [];
  const maxCols = rows.reduce((n, r) => Math.max(n, r ? r.length : 0), 0);
  const widths = sheet.colWidths && sheet.colWidths.length
    ? sheet.colWidths
    : Array.from({ length: maxCols }, (_, i) => estimateColWidth(rows, i));

  const out: string[] = [];
  out.push(XML_HEADER);
  out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');

  // Freeze pane on row 2
  const freeze = sheet.freezeHeader !== false && rows.length > 0;
  if (freeze) {
    out.push('<sheetViews><sheetView workbookViewId="0">');
    out.push('<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>');
    out.push('</sheetView></sheetViews>');
  }

  // Default row height a bit larger to fit wrap
  out.push('<sheetFormatPr defaultRowHeight="16"/>');

  // Column widths
  if (widths.length) {
    out.push('<cols>');
    widths.forEach((w, i) => {
      const cw = Math.max(MIN_COL_W, Math.min(MAX_COL_W, Number(w) || MIN_COL_W));
      out.push(`<col min="${i + 1}" max="${i + 1}" width="${cw}" customWidth="1"/>`);
    });
    out.push('</cols>');
  }

  out.push('<sheetData>');
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const cells: string[] = [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null || v === undefined || v === '') continue;
      const ref = `${colRef(c + 1)}${r + 1}`;
      const styleAttr = r === 0 ? ' s="1"' : ' s="2"';
      if (typeof v === 'number' && Number.isFinite(v)) {
        cells.push(`<c r="${ref}"${styleAttr}><v>${v}</v></c>`);
      } else if (typeof v === 'boolean') {
        cells.push(`<c r="${ref}"${styleAttr} t="b"><v>${v ? 1 : 0}</v></c>`);
      } else {
        cells.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`);
      }
    }
    out.push(`<row r="${r + 1}">${cells.join('')}</row>`);
  }
  out.push('</sheetData>');

  // AutoFilter
  if (sheet.autoFilter !== false && rows.length > 1 && maxCols > 0) {
    out.push(`<autoFilter ref="A1:${colRef(maxCols)}${rows.length}"/>`);
  }

  out.push('</worksheet>');
  return out.join('');
}

function buildWorkbookXml(sheets: { name: string }[]): string {
  const items = sheets
    .map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${items}</sheets></workbook>`;
}

function buildWorkbookRels(sheets: { name: string }[]): string {
  const items = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}</Relationships>`;
}

function buildContentTypes(sheets: { name: string }[]): string {
  const overrides = sheets
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('');
  return `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
    + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
    + overrides
    + '</Types>';
}

function buildRootRels(): string {
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
    + '</Relationships>';
}

function buildStylesXml(): string {
  // xfId 0: 既定 / 1: ヘッダ (太字 + 塗り + 折返し + 中央寄せ) / 2: データ (top + wrap)
  return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + '<fonts count="2">'
    +   '<font><sz val="11"/><name val="Meiryo"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF0F172A"/></font>'
    + '</fonts>'
    + '<fills count="3">'
    +   '<fill><patternFill patternType="none"/></fill>'
    +   '<fill><patternFill patternType="gray125"/></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFE0F2FE"/><bgColor indexed="64"/></patternFill></fill>'
    + '</fills>'
    + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + '<cellXfs count="3">'
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    +   '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    + '</cellXfs>'
    + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
    + '</styleSheet>';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildXlsxBlob(sheets: XlsxSheet[]): Blob {
  const enc = new TextEncoder();
  const used = new Set<string>();
  const safe = sheets.map((s, i) => ({ ...s, name: sanitizeSheetName(s.name, i, used) }));

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: enc.encode(buildContentTypes(safe)) },
    { name: '_rels/.rels', data: enc.encode(buildRootRels()) },
    { name: 'xl/workbook.xml', data: enc.encode(buildWorkbookXml(safe)) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(buildWorkbookRels(safe)) },
    { name: 'xl/styles.xml', data: enc.encode(buildStylesXml()) }
  ];
  safe.forEach((s, i) => {
    entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(buildSheetXml(s)) });
  });
  return buildStoredZip(entries);
}
