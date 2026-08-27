'use strict';

import { buildStoredZip, type StoredZipEntry } from '../archive/stored-zip.js';

/**
 * 追加ライブラリ無しで .xlsx (OOXML / SpreadsheetML) を組み立てる最小実装。
 * - 圧縮なし (STORE) の ZIP コンテナを自前で構築。
 * - 文字列はインライン文字列 (<is><t>) で書き出し、共有文字列表は持たない。
 * - 見出し・比較元/先・警告・レビュー入力欄という役割別の最小限のスタイルを内蔵。
 *
 * 差分比較タブの XLSX 出力で利用。SheetJS など外部 CDN に依存しないため、
 * オフライン環境やゲストスペースでも安定して動作する。
 */

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

function escapeXml(s: unknown): string {
  return String(s ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g, '')
    // Excel は _xHHHH_ を特殊エスケープとして解釈するため、リテラルの先頭 _ を逃がす。
    .replace(/_(?=[xX][0-9A-Fa-f]{4}_)/g, '_x005F_')
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
  n = n.replace(/^'+|'+$/g, '_');
  if (n.length > 31) n = n.slice(0, 31);
  if (!n) n = `Sheet${index + 1}`;
  let candidate = n;
  let i = 2;
  while (used.has(candidate.toLocaleLowerCase('en-US'))) {
    const suffix = `_${i++}`;
    candidate = (n.length + suffix.length > 31 ? n.slice(0, 31 - suffix.length) : n) + suffix;
  }
  used.add(candidate.toLocaleLowerCase('en-US'));
  return candidate;
}

// ---------------------------------------------------------------------------
// Sheet / Workbook XML
// ---------------------------------------------------------------------------

export type XlsxCellValue = string | number | boolean | null | undefined;
export type XlsxCellStyle =
  | 'normal'
  | 'source'
  | 'sourceDivider'
  | 'sourceGroup'
  | 'target'
  | 'targetGroup'
  | 'warning'
  | 'title'
  | 'sectionHeader'
  | 'kpiGood'
  | 'kpiWarning'
  | 'kpiDanger'
  | 'kpiChange'
  | 'review'
  | 'reviewChoice'
  | 'info'
  | 'headerDivider'
  | 'hyperlink'
  | 'subtitle'
  | 'summaryLabel'
  | 'summaryValue'
  | 'center'
  | 'zebra'
  | 'zebraCenter'
  | 'changeAdded'
  | 'changeRemoved'
  | 'changeChanged'
  | 'changeMoved'
  | 'actionLink'
  | 'category'
  | 'directionArrow'
  | 'metricValueAdded'
  | 'metricValueRemoved'
  | 'metricValueChanged'
  | 'metricValueMoved'
  | 'diffBefore'
  | 'diffAfter'
  | 'diffAbsent';
export type XlsxRowStyle = XlsxCellStyle;
export interface XlsxDataValidation {
  /** 適用範囲。例: A2:A100 */
  sqref: string;
  /** ドロップダウン候補。カンマを含まない短い文字列向け。 */
  values: string[];
  promptTitle?: string;
  prompt?: string;
}
export interface XlsxPrintSettings {
  orientation?: 'portrait' | 'landscape';
  /** 0 はページ数を固定しない指定。 */
  fitToWidth?: number;
  /** 0 はページ数を固定しない指定。 */
  fitToHeight?: number;
  /** 各印刷ページで繰り返す行（1始まり・両端を含む）。 */
  repeatRows?: { from: number; to: number };
  /** 各印刷ページで繰り返す列（1始まり・両端を含む）。 */
  repeatColumns?: { from: number; to: number };
  /** 印刷範囲を水平方向の中央へ配置する。 */
  horizontalCentered?: boolean;
  /** フッター。Excel の &P / &N などのページ記号を利用できる。 */
  footer?: string;
}
export interface XlsxInternalHyperlink {
  /** リンクを設定するセル。例: A2 */
  ref: string;
  /** 遷移先シート名。元の名前とサニタイズ後の名前のどちらでも指定可能。 */
  targetSheet?: string;
  /** 遷移先シート（0始まり）。同名シートを確実に指定したい場合に使用。 */
  targetSheetIndex?: number;
  /** 遷移先セル。既定: A1 */
  targetCell?: string;
  /** Excel でリンクにマウスを置いたときの説明。 */
  tooltip?: string;
}
export interface XlsxRowOutline {
  /** Excel のアウトラインレベル（1～7）。範囲外は安全な範囲へ丸める。 */
  level?: number;
  /** level > 0 の詳細行を初期状態で隠す。 */
  hidden?: boolean;
  /** グループの要約行に折りたたみマークを表示する。 */
  collapsed?: boolean;
}
export interface XlsxSheet {
  name: string;
  /**
   * 2D rows. 1 行目はヘッダ扱い (太字+塗り)。
   * セル値は文字列 / 数値 / boolean / null / undefined。
   */
  rows: XlsxCellValue[][];
  /** ヘッダ行をフリーズしない場合は false。既定: true */
  freezeHeader?: boolean;
  /** 固定する行数。指定時は freezeHeader より優先。 */
  freezeRows?: number;
  /** 固定する列数。既定: 0。 */
  freezeColumns?: number;
  /** AutoFilter を付ける場合は true。既定: true */
  autoFilter?: boolean;
  /** 表見出し行（1始まり）。見出しスタイルと AutoFilter の起点になる。既定: 1。 */
  headerRow?: number;
  /** 各列の幅 (文字数換算)。未指定なら内容から自動推定。 */
  colWidths?: number[];
  /** 行ごとの表示用途。headerRow の見出しスタイルを優先する。 */
  rowStyles?: XlsxRowStyle[];
  /** セルごとの表示用途。見出し行を含め rowStyles / 既定見出しより優先する。 */
  cellStyles?: Array<Array<XlsxCellStyle | undefined>>;
  /** 行高。未指定の行は既定値。 */
  rowHeights?: number[];
  /** スタイル付き空セルを inlineStr ではなく真正の空セルとして書き出す。既定は従来互換の false。 */
  styledEmptyCellsAsBlank?: boolean;
  /** 指定した1始まりの行以降は最大列数まで空セルも書き出し、表の罫線を途切れさせない。 */
  materializeEmptyCellsFromRow?: number;
  /** 結合セル範囲。例: A1:D1 */
  merges?: string[];
  /** 入力候補のドロップダウン。 */
  dataValidations?: XlsxDataValidation[];
  /** 同じブック内だけを遷移先にできる安全な内部ハイパーリンク。 */
  internalHyperlinks?: XlsxInternalHyperlink[];
  /** 行ごとのアウトライン指定。rows と同じ0始まりの添字を使う。 */
  rowOutlines?: Array<XlsxRowOutline | undefined>;
  /** アウトラインの要約行を詳細行の下に置く場合は true。既定: true。 */
  outlineSummaryBelow?: boolean;
  /** グリッド線を非表示にする場合は false。既定: true。 */
  showGridLines?: boolean;
  /** 初期表示倍率（10～400）。 */
  zoomScale?: number;
  /** 印刷方向、横幅へのフィット、見出しの繰り返し。 */
  print?: XlsxPrintSettings;
}

const MIN_COL_W = 10;
const MAX_COL_W = 60;
const EXCEL_CELL_TEXT_LIMIT = 32767;

function shortTextHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeExcelCellText(value: unknown): string {
  const text = String(value ?? '');
  if (text.length <= EXCEL_CELL_TEXT_LIMIT) return text;
  const suffix = `\n…（Excelセル上限32,767文字のため省略・元${text.length}文字・識別:${shortTextHash(text)}）`;
  let keep = EXCEL_CELL_TEXT_LIMIT - suffix.length;
  // UTF-16 サロゲートペアの途中で切らない。
  if (keep > 0 && /[\uD800-\uDBFF]/.test(text.charAt(keep - 1))) keep -= 1;
  return text.slice(0, Math.max(0, keep)) + suffix;
}

const CELL_STYLE_INDEX: Record<XlsxCellStyle, number> = {
  normal: 2,
  source: 3,
  sourceDivider: 14,
  sourceGroup: 16,
  target: 4,
  targetGroup: 17,
  warning: 5,
  title: 6,
  sectionHeader: 7,
  kpiGood: 8,
  kpiWarning: 9,
  kpiDanger: 10,
  review: 11,
  info: 12,
  headerDivider: 15,
  hyperlink: 13,
  subtitle: 18,
  kpiChange: 19,
  summaryLabel: 20,
  summaryValue: 21,
  center: 22,
  zebra: 23,
  zebraCenter: 24,
  changeAdded: 25,
  changeRemoved: 26,
  changeChanged: 27,
  changeMoved: 28,
  reviewChoice: 29,
  actionLink: 30,
  category: 31,
  directionArrow: 32,
  metricValueAdded: 33,
  metricValueRemoved: 34,
  metricValueChanged: 35,
  metricValueMoved: 36,
  diffBefore: 37,
  diffAfter: 38,
  diffAbsent: 39
};

interface ResolvedInternalHyperlink {
  ref: string;
  targetSheet: string;
  targetCell: string;
  tooltip?: string;
}

function normalizedPaneCount(value: unknown, max: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
}

function normalizedPositiveInt(value: unknown, fallback: number, max: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
}

function normalizedNonNegativeInt(value: unknown, fallback: number, max: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
}

function normalizedZoomScale(value: unknown): number | null {
  if (value == null) return null;
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(10, Math.min(400, n)) : null;
}

function buildPaneXml(freezeRows: number, freezeColumns: number): string {
  if (!freezeRows && !freezeColumns) return '';
  const attrs: string[] = [];
  if (freezeColumns) attrs.push(`xSplit="${freezeColumns}"`);
  if (freezeRows) attrs.push(`ySplit="${freezeRows}"`);
  attrs.push(`topLeftCell="${colRef(freezeColumns + 1)}${freezeRows + 1}"`);
  attrs.push(`activePane="${freezeRows && freezeColumns ? 'bottomRight' : freezeColumns ? 'topRight' : 'bottomLeft'}"`);
  attrs.push('state="frozen"');
  return `<pane ${attrs.join(' ')}/>`;
}

function isSafeCellRange(value: string): boolean {
  return /^[A-Z]{1,3}[1-9][0-9]*:[A-Z]{1,3}[1-9][0-9]*$/.test(value);
}

function isSafeCellRef(value: string): boolean {
  const match = /^([A-Z]{1,3})([1-9][0-9]*)$/.exec(value);
  if (!match) return false;
  let column = 0;
  for (const char of match[1]) column = column * 26 + char.charCodeAt(0) - 64;
  const row = Number(match[2]);
  return column >= 1 && column <= 16384 && Number.isSafeInteger(row) && row <= 1048576;
}

function normalizedOutline(value: XlsxRowOutline | undefined): Required<XlsxRowOutline> {
  const rawLevel = Math.floor(Number(value?.level));
  const level = Number.isFinite(rawLevel) ? Math.max(0, Math.min(7, rawLevel)) : 0;
  return {
    level,
    hidden: level > 0 && value?.hidden === true,
    collapsed: value?.collapsed === true
  };
}

function resolveInternalHyperlinks(
  sheets: XlsxSheet[],
  safeSheetNames: string[],
  links: XlsxInternalHyperlink[] | undefined
): ResolvedInternalHyperlink[] {
  const resolved: ResolvedInternalHyperlink[] = [];
  const seenRefs = new Set<string>();
  for (const link of links || []) {
    const ref = String(link?.ref || '').toUpperCase();
    const targetCell = String(link?.targetCell || 'A1').toUpperCase();
    if (!isSafeCellRef(ref) || !isSafeCellRef(targetCell) || seenRefs.has(ref)) continue;

    let targetIndex = Number.isInteger(link.targetSheetIndex) ? Number(link.targetSheetIndex) : -1;
    if (targetIndex < 0 || targetIndex >= safeSheetNames.length) {
      const requested = String(link.targetSheet || '');
      targetIndex = sheets.findIndex((sheet) => String(sheet.name || '') === requested);
      if (targetIndex < 0) {
        const folded = requested.toLocaleLowerCase('en-US');
        targetIndex = safeSheetNames.findIndex((name) => name.toLocaleLowerCase('en-US') === folded);
      }
    }
    if (targetIndex < 0 || targetIndex >= safeSheetNames.length) continue;

    seenRefs.add(ref);
    resolved.push({
      ref,
      targetSheet: safeSheetNames[targetIndex],
      targetCell,
      tooltip: link.tooltip == null ? undefined : String(link.tooltip).slice(0, 255)
    });
  }
  return resolved;
}

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

function buildSheetXml(sheet: XlsxSheet, internalHyperlinks: ResolvedInternalHyperlink[]): string {
  const rows = sheet.rows || [];
  const maxCols = rows.reduce((n, r) => Math.max(n, r ? r.length : 0), 0);
  const headerRow = normalizedPositiveInt(sheet.headerRow, 1, Math.max(1, rows.length));
  const widths = sheet.colWidths && sheet.colWidths.length
    ? sheet.colWidths
    : Array.from({ length: maxCols }, (_, i) => estimateColWidth(rows, i));
  const hyperlinkRefs = new Set(internalHyperlinks.map((link) => link.ref));
  const materializeEmptyCellsFromRow = sheet.materializeEmptyCellsFromRow == null
    ? null
    : normalizedPositiveInt(sheet.materializeEmptyCellsFromRow, 1, Math.max(1, rows.length));
  const outlines = rows.map((_, index) => normalizedOutline(sheet.rowOutlines?.[index]));
  const maxOutlineLevel = outlines.reduce((max, outline) => Math.max(max, outline.level), 0);
  const hasOutline = maxOutlineLevel > 0 || outlines.some((outline) => outline.collapsed);

  const out: string[] = [];
  out.push(XML_HEADER);
  out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');

  if (sheet.print || hasOutline) {
    out.push('<sheetPr>');
    if (hasOutline) out.push(`<outlinePr summaryBelow="${sheet.outlineSummaryBelow === false ? 0 : 1}" summaryRight="1"/>`);
    if (sheet.print) out.push('<pageSetUpPr fitToPage="1"/>');
    out.push('</sheetPr>');
  }

  // Freeze panes. freezeRows が未指定なら従来どおりヘッダ1行を固定する。
  const freezeRows = normalizedPaneCount(sheet.freezeRows == null
    ? (sheet.freezeHeader !== false && rows.length > 0 ? 1 : 0)
    : sheet.freezeRows, 1048575);
  // XFD が最終列なので、固定列は 16,383 列まで（右ペインの先頭が XFD）。
  const freezeColumns = normalizedPaneCount(sheet.freezeColumns, 16383);
  const paneXml = buildPaneXml(freezeRows, freezeColumns);
  const zoomScale = normalizedZoomScale(sheet.zoomScale);
  if (paneXml || sheet.showGridLines === false || zoomScale != null) {
    const gridLines = sheet.showGridLines === false ? ' showGridLines="0"' : '';
    const zoom = zoomScale == null ? '' : ` zoomScale="${zoomScale}" zoomScaleNormal="${zoomScale}"`;
    out.push(`<sheetViews><sheetView workbookViewId="0"${gridLines}${zoom}>`);
    if (paneXml) out.push(paneXml);
    out.push('</sheetView></sheetViews>');
  }

  // Default row height a bit larger to fit wrap
  out.push(`<sheetFormatPr defaultRowHeight="16"${maxOutlineLevel ? ` outlineLevelRow="${maxOutlineLevel}"` : ''}/>`);

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
    const materializeEmptyCells = materializeEmptyCellsFromRow != null && r + 1 >= materializeEmptyCellsFromRow;
    const cellCount = materializeEmptyCells ? maxCols : row.length;
    for (let c = 0; c < cellCount; c++) {
      const v = row[c];
      const explicitCellStyle = sheet.cellStyles?.[r]?.[c];
      const isEmptyCell = v === null || v === undefined || v === '';
      // 入力欄などの明示スタイル、または表の連続罫線を保つ対象範囲は空でも書き出す。
      if (isEmptyCell && !explicitCellStyle && !materializeEmptyCells) continue;
      const ref = `${colRef(c + 1)}${r + 1}`;
      const rowStyle = sheet.rowStyles?.[r] || 'normal';
      const styleIndex = explicitCellStyle
        ? CELL_STYLE_INDEX[explicitCellStyle]
        : r + 1 === headerRow
          ? 1
          : hyperlinkRefs.has(ref) && rowStyle === 'normal'
            ? CELL_STYLE_INDEX.hyperlink
            : CELL_STYLE_INDEX[rowStyle];
      const styleAttr = ` s="${styleIndex}"`;
      if (isEmptyCell && (materializeEmptyCells || (explicitCellStyle && sheet.styledEmptyCellsAsBlank === true))) {
        cells.push(`<c r="${ref}"${styleAttr}/>`);
      } else if (typeof v === 'number' && Number.isFinite(v)) {
        cells.push(`<c r="${ref}"${styleAttr}><v>${v}</v></c>`);
      } else if (typeof v === 'boolean') {
        cells.push(`<c r="${ref}"${styleAttr} t="b"><v>${v ? 1 : 0}</v></c>`);
      } else {
        cells.push(`<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${escapeXml(normalizeExcelCellText(v))}</t></is></c>`);
      }
    }
    const rowHeight = Number(sheet.rowHeights?.[r]);
    const heightAttr = Number.isFinite(rowHeight) && rowHeight > 0
      ? ` ht="${Math.min(409, rowHeight)}" customHeight="1"`
      : '';
    const outline = outlines[r];
    const outlineAttrs = [
      outline.level ? ` outlineLevel="${outline.level}"` : '',
      outline.hidden ? ' hidden="1"' : '',
      outline.collapsed ? ' collapsed="1"' : ''
    ].join('');
    out.push(`<row r="${r + 1}"${heightAttr}${outlineAttrs}>${cells.join('')}</row>`);
  }
  out.push('</sheetData>');

  // AutoFilter
  if (sheet.autoFilter !== false && rows.length >= headerRow && maxCols > 0) {
    out.push(`<autoFilter ref="A${headerRow}:${colRef(maxCols)}${rows.length}"/>`);
  }

  // OOXML schema order: autoFilter precedes mergeCells.
  const merges = (sheet.merges || []).filter(isSafeCellRange);
  if (merges.length) {
    out.push(`<mergeCells count="${merges.length}">`);
    for (const ref of merges) out.push(`<mergeCell ref="${ref}"/>`);
    out.push('</mergeCells>');
  }

  const validations = (sheet.dataValidations || []).filter((validation) => (
    isSafeCellRange(validation.sqref)
    && validation.values.length > 0
    && validation.values.every((value) => !String(value).includes(','))
    && validation.values.map(String).join(',').length <= 255
  ));
  if (validations.length) {
    out.push(`<dataValidations count="${validations.length}">`);
    for (const validation of validations) {
      const promptTitle = validation.promptTitle ? ` promptTitle="${escapeXml(validation.promptTitle)}"` : '';
      const prompt = validation.prompt ? ` prompt="${escapeXml(validation.prompt)}"` : '';
      const formula = `&quot;${escapeXml(validation.values.map((value) => String(value).replace(/"/g, '""')).join(','))}&quot;`;
      out.push(`<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${validation.sqref}"${promptTitle}${prompt}><formula1>${formula}</formula1></dataValidation>`);
    }
    out.push('</dataValidations>');
  }

  // 内部リンクは relationship を作らず location のみを使う。外部URLや数式は受け付けない。
  if (internalHyperlinks.length) {
    out.push('<hyperlinks>');
    for (const hyperlink of internalHyperlinks) {
      const formulaSheetName = hyperlink.targetSheet.replace(/'/g, "''");
      const location = `'${formulaSheetName}'!${hyperlink.targetCell}`;
      const tooltip = hyperlink.tooltip ? ` tooltip="${escapeXml(hyperlink.tooltip)}"` : '';
      out.push(`<hyperlink ref="${hyperlink.ref}" location="${escapeXml(location)}"${tooltip}/>`);
    }
    out.push('</hyperlinks>');
  }

  if (sheet.print) {
    const orientation = sheet.print.orientation === 'landscape' ? 'landscape' : 'portrait';
    const fitToWidth = normalizedNonNegativeInt(sheet.print.fitToWidth, 1, 32767);
    const fitToHeight = normalizedNonNegativeInt(sheet.print.fitToHeight, 0, 32767);
    const horizontalCentered = sheet.print.horizontalCentered === true ? 1 : 0;
    out.push(`<printOptions horizontalCentered="${horizontalCentered}" verticalCentered="0" gridLines="0" headings="0"/>`);
    out.push('<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>');
    out.push(`<pageSetup paperSize="9" orientation="${orientation}" fitToWidth="${fitToWidth}" fitToHeight="${fitToHeight}"/>`);
    if (sheet.print.footer) {
      out.push(`<headerFooter><oddFooter>${escapeXml(String(sheet.print.footer).slice(0, 255))}</oddFooter></headerFooter>`);
    }
  }

  // 識別子など数値に見える文字列も意図的なテキストとして出力しているため、
  // Excel の「数値が文字列として保存されています」警告は使用範囲全体で抑止する。
  // このビルダーはセル数式と外部リンクを生成しないので、計算結果の警告を隠すことはない。
  if (maxCols > 0 && maxCols <= 16384 && rows.length > 0 && rows.length <= 1048576) {
    out.push(`<ignoredErrors><ignoredError sqref="A1:${colRef(maxCols)}${rows.length}" numberStoredAsText="1"/></ignoredErrors>`);
  }

  out.push('</worksheet>');
  return out.join('');
}

function buildWorkbookXml(sheets: Array<{ name: string; print?: XlsxPrintSettings }>): string {
  const items = sheets
    .map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  const printTitles = sheets.flatMap((sheet, index) => {
    const repeatRows = sheet.print?.repeatRows;
    const repeatColumns = sheet.print?.repeatColumns;
    if (!repeatRows && !repeatColumns) return [];
    // シート名は式中では単引用符で囲み、内部の単引用符を二重化する。
    const formulaSheetName = sheet.name.replace(/'/g, "''");
    const ranges: string[] = [];
    if (repeatRows) {
      const from = normalizedPositiveInt(repeatRows.from, 1, 1048576);
      const to = Math.max(from, normalizedPositiveInt(repeatRows.to, from, 1048576));
      ranges.push(`'${formulaSheetName}'!$${from}:$${to}`);
    }
    if (repeatColumns) {
      const from = normalizedPositiveInt(repeatColumns.from, 1, 16384);
      const to = Math.max(from, normalizedPositiveInt(repeatColumns.to, from, 16384));
      ranges.push(`'${formulaSheetName}'!$${colRef(from)}:$${colRef(to)}`);
    }
    return [`<definedName name="_xlnm.Print_Titles" localSheetId="${index}">${escapeXml(ranges.join(','))}</definedName>`];
  }).join('');
  const definedNames = printTitles ? `<definedNames>${printTitles}</definedNames>` : '';
  return `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${items}</sheets>${definedNames}</workbook>`;
}

function buildWorkbookRels(sheets: { name: string }[]): string {
  const items = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  const styles = `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`;
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items}${styles}</Relationships>`;
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

const CUSTOMER_DIFF_STYLES = new Set<XlsxCellStyle>(['diffBefore', 'diffAfter', 'diffAbsent']);

function sheetsUseCustomerDiffStyles(sheets: XlsxSheet[]): boolean {
  return sheets.some((sheet) => (
    sheet.rowStyles?.some((style) => CUSTOMER_DIFF_STYLES.has(style))
    || sheet.cellStyles?.some((row) => row?.some((style) => !!style && CUSTOMER_DIFF_STYLES.has(style)))
  ));
}

function buildStylesXml(includeCustomerDiffStyles: boolean): string {
  // 色は「比較方向」「変更事実」「情報区分」の役割に限定する。
  // 0: 既定 / 1: 表見出し / 2: データ / 3..36: 共通UI / 37..39: 提出版の変更前後
  return `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<fonts count="${includeCustomerDiffStyles ? 18 : 16}">`
    +   '<font><sz val="11"/><name val="Meiryo"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FFFFFFFF"/></font>'
    +   '<font><b/><sz val="18"/><name val="Meiryo"/><color rgb="FFFFFFFF"/></font>'
    +   '<font><b/><sz val="12"/><name val="Meiryo"/><color rgb="FF1E3A5F"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF0F172A"/></font>'
    +   '<font><u/><sz val="11"/><name val="Meiryo"/><color rgb="FF0563C1"/></font>'
    +   '<font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF1E3A5F"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF15803D"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FFB91C1C"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FFB45309"/></font>'
    +   '<font><b/><sz val="11"/><name val="Meiryo"/><color rgb="FF7C3AED"/></font>'
    +   '<font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF15803D"/></font>'
    +   '<font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FFB91C1C"/></font>'
    +   '<font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FFB45309"/></font>'
    +   '<font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF7C3AED"/></font>'
    +   '<font><b/><sz val="16"/><name val="Meiryo"/><color rgb="FF2563EB"/></font>'
    +   (includeCustomerDiffStyles
      ? '<font><sz val="11"/><name val="Meiryo"/><color rgb="FF991B1B"/></font>'
        + '<font><sz val="11"/><name val="Meiryo"/><color rgb="FF166534"/></font>'
      : '')
    + '</fonts>'
    + '<fills count="10">'
    +   '<fill><patternFill patternType="none"/></fill>'
    +   '<fill><patternFill patternType="gray125"/></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFFEF2F2"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFBEB"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFECFDF5"/><bgColor indexed="64"/></patternFill></fill>'
    +   '<fill><patternFill patternType="solid"><fgColor rgb="FFF5F3FF"/><bgColor indexed="64"/></patternFill></fill>'
    + '</fills>'
    + '<borders count="2">'
    +   '<border><left/><right/><top/><bottom/><diagonal/></border>'
    +   '<border><left style="thin"><color rgb="FFE2E8F0"/></left><right style="thin"><color rgb="FFE2E8F0"/></right><top style="thin"><color rgb="FFE2E8F0"/></top><bottom style="thin"><color rgb="FFE2E8F0"/></bottom><diagonal/></border>'
    + '</borders>'
    + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
    + `<cellXfs count="${includeCustomerDiffStyles ? 40 : 37}">`
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
    +   '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" horizontal="left"/></xf>'
    +   '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="6" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="left" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="7" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="8" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="9" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="10" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="4" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="15" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf>'
    +   '<xf numFmtId="0" fontId="11" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="12" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="13" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   '<xf numFmtId="0" fontId="14" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
    +   (includeCustomerDiffStyles
      ? '<xf numFmtId="0" fontId="16" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
        + '<xf numFmtId="0" fontId="17" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>'
        + '<xf numFmtId="0" fontId="0" fillId="7" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf>'
      : '')
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
  const safeSheetNames = safe.map((sheet) => sheet.name);
  const hyperlinksBySheet = safe.map((sheet) => resolveInternalHyperlinks(sheets, safeSheetNames, sheet.internalHyperlinks));

  const entries: StoredZipEntry[] = [
    { name: '[Content_Types].xml', data: enc.encode(buildContentTypes(safe)) },
    { name: '_rels/.rels', data: enc.encode(buildRootRels()) },
    { name: 'xl/workbook.xml', data: enc.encode(buildWorkbookXml(safe)) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(buildWorkbookRels(safe)) },
    { name: 'xl/styles.xml', data: enc.encode(buildStylesXml(sheetsUseCustomerDiffStyles(safe))) }
  ];
  safe.forEach((s, i) => {
    entries.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc.encode(buildSheetXml(s, hyperlinksBySheet[i])) });
  });
  return buildStoredZip(entries, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}
