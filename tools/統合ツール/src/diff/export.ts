import {
  SECTION_DEFS, TOOL_ID,
  LINE_DIFF_MAX_CELLS, CHAR_DIFF_MAX_CELLS,
  DEFAULT_IGNORE_KEYS, DIFF_NORMALIZATION_PRESETS
} from '../constants.js';
import {
  esc, deepClone, safeJsonForScript, stableStringify, decodeHtmlEntities, stripHtmlToText,
  getDiffTypeDisplayLabel, getSeverityDisplayLabel,
  getIssueSideLabel, getPreviewStateLabel, getThemeDisplayLabel,
  renderSectionIconHtml, extractAppNameFromBundle
} from '../utils.js';
import { state, ui } from '../state.js';
import {
  getActualDiffRows, getActionableDiffRows, countActualDiffRows,
  hasIncompleteActualDiffTruncation, parseIgnoreRules,
  summarizeRows, summarizeFetchIssues,
  normalizeIgnoreToken, getPathLeafKey,
  getActiveDiffNormalizationLabels, normalizeSectionForCompare,
  detectProcessStateRenames,
  expandSubtableRowsForDisplay,
  expandEntityRowsForDisplay
} from './engine.js';
import { summarizeSeverity, extractFieldPathInfo, getFieldRowPayload } from './enrich.js';
import { buildIgnoreKeySuggestions, getFilteredDiffRowsWithoutSectionFilter, getFavoriteDiffRows } from './filter.js';
import { resolveBundleRevision, pickBundleSections } from '../api.js';
import { getToolDocument } from '../ui/dialog.js';
import { buildCategoryViewHtml } from './category-view.js';
import { decodeRow, isSemanticSection } from './path-decoder.js';
import {
  isSensitiveSameDiffRow,
  redactSensitiveSameDiffRows,
  SENSITIVE_SAME_VALUE_REDACTION
} from './export-safety.js';

// ---------------------------------------------------------------------------
// Diff display helpers
// ---------------------------------------------------------------------------

export function stringifyForDiff(value) {
  if (value === undefined) return '（未定義）';
  const out = JSON.stringify(value, null, 2);
  return out == null ? String(value) : out;
}

// ---------------------------------------------------------------------------
// Subtable (テーブル) friendly formatting for in-panel diff columns.
// For SUBTABLE field snapshots and their `fields` maps, raw JSON is hard to
// scan; render a compact "1. ラベル / 型 / コード" listing so a table diff
// becomes line-comparable like plain text.
// ---------------------------------------------------------------------------
function isSubtableFieldMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.values(value);
  if (!entries.length) return false;
  return entries.every((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    return ('code' in item) || ('type' in item) || ('label' in item);
  });
}

function formatSubtableChildLine(child, idx) {
  const label = child?.label ?? child?.name ?? child?.code ?? '（未設定）';
  const typeLabel = child?.type ? String(child.type) : 'フィールド';
  const code = child?.code ?? '-';
  return `${idx + 1}. ${label} / ${typeLabel} / ${code}`;
}

function formatSubtableChildrenText(fields) {
  const entries = Object.values(fields || ({} as any));
  if (!entries.length) return '（項目なし）';
  return entries.map(formatSubtableChildLine).join('\n');
}

function formatSubtableSnapshotText(value) {
  const head = [
    `フィールド名: ${value.label ?? value.name ?? '（未設定）'}`,
    `フィールドコード: ${value.code ?? '-'}`,
    'フィールド型: テーブル (SUBTABLE)'
  ];
  return `${head.join('\n')}\n----\nテーブル内の項目:\n${formatSubtableChildrenText(value.fields)}`;
}

function isSubtableFieldsPath(path) {
  return typeof path === 'string'
    && /^fieldSettings\.properties\.[^.[\]]+\.fields(?:\.[^.[\]]+)?$/.test(path);
}

function isSubtableFieldRootPath(path) {
  return typeof path === 'string'
    && /^fieldSettings\.properties\.[^.[\]]+$/.test(path);
}

/**
 * kintone の LABEL フィールドや一部のテキストプロパティは任意の HTML
 * (`<div><span style="..."><font color="..."> ... </font></span></div>` 等) を
 * 保持できる。差分カラムへ生で出すと HTML タグが羅列されて読めないため、
 * タグを剥がして表示用テキストに整形する。
 */
function stripLabelHtmlTags(text: string): string {
  return stripHtmlToText(text);
}

/**
 * オブジェクト内の HTML を含みうる文字列プロパティ (`label` / `name` など) を
 * 再帰的に整形した複製を返す。元オブジェクトは変更しない。
 */
function sanitizeHtmlBearingProps<T>(value: T): T {
  if (value == null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeHtmlBearingProps(item)) as unknown as T;
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value as Record<string, any>)) {
    if (typeof v === 'string' && (k === 'label' || k === 'name')) {
      out[k] = stripLabelHtmlTags(v);
    } else if (v && typeof v === 'object') {
      out[k] = sanitizeHtmlBearingProps(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

// API 取得・比較前処理だけで使う補助値は、HTML に元セクションの一部として
// 重複収録しない。キー名だけで全階層から落とすと、`_body` という正規の
// フィールドコード等まで消えるため、予約済みのセクション形状に限定する。
const REPORT_SECTION_ROOT_SCRATCH_KEYS = new Set([
  '_partial',
  '_fetchError',
  '_bodyFetchStats',
  '_configFetchStats'
]);

const REPORT_CUSTOMIZE_ITEM_SCRATCH_KEYS = new Set([
  '_bodyText',
  '_bodyHash',
  '_bodyUnavailable'
]);

function stripCustomizeItemScratch(value: any): void {
  if (Array.isArray(value)) {
    value.forEach((item) => stripCustomizeItemScratch(item));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const key of REPORT_CUSTOMIZE_ITEM_SCRATCH_KEYS) delete value[key];
  Object.values(value).forEach((child) => stripCustomizeItemScratch(child));
}

function stripPluginItemScratch(value: any): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  if (Array.isArray(value.plugins)) {
    value.plugins.forEach((plugin) => {
      if (plugin && typeof plugin === 'object' && !Array.isArray(plugin)) delete plugin._config;
    });
    return;
  }
  // セクション全体ではなく、展開済みのプラグイン1件が行値になっている場合。
  if (Object.prototype.hasOwnProperty.call(value, 'id')) delete value._config;
}

function sanitizeReportSectionValue<T>(sectionKey: string, value: T): T {
  const cloned = deepClone(value);
  if (cloned == null || typeof cloned !== 'object') return cloned;
  if (!Array.isArray(cloned)) {
    for (const key of REPORT_SECTION_ROOT_SCRATCH_KEYS) delete (cloned as Record<string, any>)[key];
  }
  if (sectionKey === 'customizeSettings') stripCustomizeItemScratch(cloned);
  if (sectionKey === 'pluginSettings') stripPluginItemScratch(cloned);
  return cloned;
}

function sanitizeReportRowValue(row: any, value: any): any {
  if (isSensitiveSameDiffRow(row)) return SENSITIVE_SAME_VALUE_REDACTION;
  return sanitizeReportSectionValue(String(row?.sectionKey || ''), value);
}

type DiffTruncationScanStatus = 'complete' | 'partial' | 'unscanned';

function diffTruncationScanStatusOf(section: any): DiffTruncationScanStatus {
  if (section?.scanStatus === 'complete' || section?.scanStatus === 'partial' || section?.scanStatus === 'unscanned') {
    return section.scanStatus;
  }
  if (section?.scanned === false) return 'unscanned';
  if (section?.partiallyScanned === true || section?.omittedDiffCount === null) return 'partial';
  return 'complete';
}

function diffTruncationSectionLabel(section: any): string {
  return String(section?.section || section?.sectionKey || '未分類');
}

function knownOmittedDiffCount(section: any): number {
  const raw = section?.omittedDiffCount ?? section?.droppedDiff ?? 0;
  const count = Number(raw);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export function stringifyRowValueForDiff(value, path) {
  if (value === undefined) return '（未定義）';
  // customizeSettings の JS/CSS 本文（preprocess で `file._body` に格納）は
  // 文字列のままでライン diff を効かせる。
  if (typeof value === 'string' && /customizeSettings\..+\.file\._body$/.test(String(path || ''))) {
    return value;
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (value.type === 'SUBTABLE' && value.fields && typeof value.fields === 'object') {
      return formatSubtableSnapshotText(sanitizeHtmlBearingProps(value));
    }
    if (isSubtableFieldsPath(path) && isSubtableFieldMap(value)) {
      return `テーブル内の項目:\n${formatSubtableChildrenText(sanitizeHtmlBearingProps(value))}`;
    }
    if (isSubtableFieldRootPath(path) && isSubtableFieldMap(value)) {
      return `テーブル内の項目:\n${formatSubtableChildrenText(sanitizeHtmlBearingProps(value))}`;
    }
    // LABEL 含むレイアウトアイテムや、label プロパティに HTML を持つ任意オブジェクトを正規化。
    if (typeof (value as any).label === 'string' && (value as any).label.includes('<')) {
      return stringifyForDiff(sanitizeHtmlBearingProps(value));
    }
  }
  // path がレイアウト系の場合は HTML 含み得るので一律サニタイズ。
  if (typeof path === 'string' && path.startsWith('layoutSettings')) {
    return stringifyForDiff(sanitizeHtmlBearingProps(value));
  }
  // path がフィールド label 直下なら文字列もサニタイズ。
  if (typeof value === 'string' && typeof path === 'string'
      && (/\.label$/.test(path) || /^layoutSettings\b/.test(path))) {
    return stripLabelHtmlTags(value);
  }
  return stringifyForDiff(value);
}

export function getDiffExportContentLabel(mode) {
  return mode === 'withCompared'
    ? '比較設定込み（取扱注意）'
    : '差分行のみ（全設定は未収録）';
}

export function shouldIncludeComparedContent(mode) {
  return mode === 'withCompared';
}

const FIELD_CHANGE_PROP_LABELS = {
  label: 'フィールド名',
  noLabel: 'フィールド名を表示しない',
  required: '必須項目にする',
  unique: '値の重複を禁止する',
  hideExpression: '計算式を表示しない',
  maxLength: '文字数の上限',
  minLength: '文字数の下限',
  maxValue: '入力値の上限',
  minValue: '入力値の下限',
  defaultValue: '初期値',
  defaultNowValue: '現在日時を初期値にする',
  code: 'フィールドコード',
  options: '項目と順番',
  align: '並び',
  displayScale: '小数点以下の表示桁数',
  digit: '桁区切りを表示する',
  unit: '単位',
  unitPosition: '単位の位置',
  protocol: 'リンクの種類',
  expression: '計算式',
  thumbnailSize: '画像サイズ',
  referenceTable: '関連レコード一覧設定',
  lookup: 'ルックアップ設定',
  fields: 'テーブル内の項目'
};

function fieldChangePropTitleFromInfo(info, row) {
  if (!info) return row.path || '-';
  if (info.isFieldRoot || info.isSubFieldRoot) return '';
  if (!info.tailTokens.length) return row.path || '-';
  if (FIELD_CHANGE_PROP_LABELS[info.leafKey]) return FIELD_CHANGE_PROP_LABELS[info.leafKey];
  if (String(row?.path || '').includes('.lookup.')) return 'ルックアップ設定';
  if (String(row?.path || '').includes('.referenceTable.')) return '関連レコード一覧設定';
  if (String(row?.path || '').includes('.options.')) return '項目と順番';
  if (String(row?.path || '').includes('.fields.')) return 'テーブル内の項目';
  return info.tailTokens.map((t) => (typeof t === 'number' ? '[' + t + ']' : String(t))).join('.');
}

// ---------------------------------------------------------------------------
// Line-level & char-level diff algorithms (in-panel rendering)
// ---------------------------------------------------------------------------

export function buildLineDiffOps(leftLines, rightLines) {
  const n = leftLines.length;
  const m = rightLines.length;
  if (n * m > LINE_DIFF_MAX_CELLS) return null;

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = leftLines[i] === rightLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops: any[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && leftLines[i] === rightLines[j]) {
      ops.push({ type: 'same', left: leftLines[i], right: rightLines[j] });
      i += 1;
      j += 1;
      continue;
    }

    const down = i < n ? dp[i + 1][j] : -1;
    const right = j < m ? dp[i][j + 1] : -1;
    const diag = (i < n && j < m) ? dp[i + 1][j + 1] : -1;
    if (i < n && j < m && diag >= down && diag >= right) {
      ops.push({ type: 'replace', left: leftLines[i], right: rightLines[j] });
      i += 1;
      j += 1;
      continue;
    }

    if (j < m && (i >= n || right >= down)) {
      ops.push({ type: 'add', right: rightLines[j] });
      j += 1;
    } else if (i < n) {
      ops.push({ type: 'del', left: leftLines[i] });
      i += 1;
    } else {
      break;
    }
  }
  return ops;
}

export function buildCharDiffHtml(leftText, rightText) {
  const segmentGraphemes = (text: any): string[] => {
    const normalized = String(text ?? '');
    if (!normalized) return [];
    const IntlAny: any = Intl as any;
    if (typeof IntlAny !== 'undefined' && typeof IntlAny.Segmenter === 'function') {
      try {
        const segmenter = new IntlAny.Segmenter('ja', { granularity: 'grapheme' });
        return Array.from(segmenter.segment(normalized), (seg: any) => seg.segment);
      } catch (_) {
        /* fallback */
      }
    }
    return Array.from(normalized);
  };
  const a = segmentGraphemes(leftText);
  const b = segmentGraphemes(rightText);
  if (!a.length || !b.length) return null;
  if (a.length * b.length > CHAR_DIFF_MAX_CELLS) return null;

  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: any[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: 'same', ch: a[i - 1] });
      i -= 1;
      j -= 1;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: 'add', ch: b[j - 1] });
      j -= 1;
    } else if (i > 0) {
      ops.push({ type: 'del', ch: a[i - 1] });
      i -= 1;
    } else {
      break;
    }
  }
  ops.reverse();

  let left = '';
  let right = '';
  for (const op of ops) {
    if (op.type === 'same') {
      const ch = esc(op.ch);
      left += ch;
      right += ch;
    } else if (op.type === 'del') {
      left += `<mark class="diff-char-del">${esc(op.ch)}</mark>`;
    } else {
      right += `<mark class="diff-char-add">${esc(op.ch)}</mark>`;
    }
  }
  return { left, right };
}

// ---------------------------------------------------------------------------
// Row column rendering (in-panel diff view)
// ---------------------------------------------------------------------------

export function renderChangedColumns(row, useCharDiff) {
  const leftText = stringifyRowValueForDiff(row.left, row.path);
  const rightText = stringifyRowValueForDiff(row.right, row.path);
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  const ops = buildLineDiffOps(leftLines, rightLines);
  if (!ops) {
    return {
      left: `<pre class="diff-pre del">${esc(leftText)}</pre>`,
      right: `<pre class="diff-pre add">${esc(rightText)}</pre>`
    };
  }

  let leftHtml = '';
  let rightHtml = '';
  let leftNo = 0;
  let rightNo = 0;
  for (const op of ops) {
    if (op.type === 'same') {
      leftNo += 1;
      rightNo += 1;
      leftHtml += `<div class="diff-line"><span class="diff-ln">${leftNo}</span>${esc(op.left || '')}</div>`;
      rightHtml += `<div class="diff-line"><span class="diff-ln">${rightNo}</span>${esc(op.right || '')}</div>`;
      continue;
    }
    if (op.type === 'replace') {
      leftNo += 1;
      rightNo += 1;
      const charDiff = useCharDiff ? buildCharDiffHtml(op.left, op.right) : null;
      leftHtml += `<div class="diff-line del"><span class="diff-ln">${leftNo}</span>${charDiff ? charDiff.left : esc(op.left || '')}</div>`;
      rightHtml += `<div class="diff-line add"><span class="diff-ln">${rightNo}</span>${charDiff ? charDiff.right : esc(op.right || '')}</div>`;
      continue;
    }
    if (op.type === 'del') {
      leftNo += 1;
      leftHtml += `<div class="diff-line del"><span class="diff-ln">${leftNo}</span>${esc(op.left || '')}</div>`;
      rightHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
      continue;
    }
    rightNo += 1;
    leftHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
    rightHtml += `<div class="diff-line add"><span class="diff-ln">${rightNo}</span>${esc(op.right || '')}</div>`;
  }

  return {
    left: `<div class="diff-scroll">${leftHtml}</div>`,
    right: `<div class="diff-scroll">${rightHtml}</div>`
  };
}

export function renderRowColumns(row, useCharDiff) {
  // 非フィールド系セクションは "where / what" を抽出した
  // セマンティック表示に切替える。フィールド/レイアウトは既存ロジック維持。
  if (isSemanticSection(row?.sectionKey)) {
    const decoded = decodeRow(row);
    if (decoded) {
      return renderSemanticRowColumns(row, decoded, useCharDiff);
    }
  }
  if (row.type === 'same') {
    return {
      left: `<pre class="diff-pre" style="color:var(--dv-sub);font-style:italic">${esc(stringifyRowValueForDiff(row.left, row.path))}</pre>`,
      right: '<pre class="diff-pre" style="color:var(--dv-sub);font-style:italic">（同一）</pre>'
    };
  }
  if (row.type === 'added') {
    return {
      left: '<pre class="diff-pre empty">（なし）</pre>',
      right: `<pre class="diff-pre add">${esc(stringifyRowValueForDiff(row.right, row.path))}</pre>`
    };
  }
  if (row.type === 'removed') {
    return {
      left: `<pre class="diff-pre del">${esc(stringifyRowValueForDiff(row.left, row.path))}</pre>`,
      right: '<pre class="diff-pre empty">（なし）</pre>'
    };
  }
  return renderChangedColumns(row, useCharDiff);
}

function renderWhereChipsHtml(decoded): string {
  const sectChip = `<span class="diff-sem-chip diff-sem-chip--sec">${decoded.sectionIcon ? esc(decoded.sectionIcon) + ' ' : ''}${esc(decoded.sectionLabel)}</span>`;
  const whereChips = (decoded.whereChips || []).map((c) => {
    const muted = c.muted ? ' diff-sem-chip--muted' : '';
    return `<span class="diff-sem-chip${muted}">${c.icon ? esc(c.icon) + ' ' : ''}${esc(c.label)}</span>`;
  }).join('');
  const propChip = decoded.propLabel
    ? `<span class="diff-sem-chip diff-sem-chip--prop">${decoded.propIcon ? esc(decoded.propIcon) + ' ' : ''}${esc(decoded.propLabel)}</span>`
    : '';
  return `<div class="diff-sem-chips">${sectChip}${whereChips}${propChip}</div>`;
}

function renderSemanticValueBlock(text: string, kind: 'add' | 'del' | 'empty' | 'same'): string {
  const cls = kind === 'empty' ? 'empty' : kind;
  const safe = esc(text || '');
  return `<div class="diff-sem-val diff-sem-val--${cls}">${safe.replace(/\n/g, '<br>')}</div>`;
}

function renderSemanticRowColumns(row, decoded, useCharDiff): { left: string; right: string } {
  const chips = renderWhereChipsHtml(decoded);
  if (row.type === 'same') {
    return {
      left: `${chips}${renderSemanticValueBlock(decoded.beforeText, 'same')}`,
      right: `${chips}<div class="diff-sem-val diff-sem-val--same">（同一）</div>`
    };
  }
  if (row.type === 'added') {
    return {
      left: `${chips}${renderSemanticValueBlock('（なし）', 'empty')}`,
      right: `${chips}${renderSemanticValueBlock(decoded.afterText, 'add')}`
    };
  }
  if (row.type === 'removed') {
    return {
      left: `${chips}${renderSemanticValueBlock(decoded.beforeText, 'del')}`,
      right: `${chips}${renderSemanticValueBlock('（なし）', 'empty')}`
    };
  }
  // changed: 既存の line/char diff をラベル化済みテキストにも適用
  const leftLines = String(decoded.beforeText || '').split('\n');
  const rightLines = String(decoded.afterText || '').split('\n');
  const ops = buildLineDiffOps(leftLines, rightLines);
  if (!ops) {
    return {
      left: `${chips}${renderSemanticValueBlock(decoded.beforeText, 'del')}`,
      right: `${chips}${renderSemanticValueBlock(decoded.afterText, 'add')}`
    };
  }
  let leftHtml = '';
  let rightHtml = '';
  let lno = 0;
  let rno = 0;
  for (const op of ops) {
    if (op.type === 'same') {
      lno += 1; rno += 1;
      leftHtml  += `<div class="diff-line"><span class="diff-ln">${lno}</span>${esc(op.left || '')}</div>`;
      rightHtml += `<div class="diff-line"><span class="diff-ln">${rno}</span>${esc(op.right || '')}</div>`;
      continue;
    }
    if (op.type === 'replace') {
      lno += 1; rno += 1;
      const cd = useCharDiff ? buildCharDiffHtml(op.left, op.right) : null;
      leftHtml  += `<div class="diff-line del"><span class="diff-ln">${lno}</span>${cd ? cd.left : esc(op.left || '')}</div>`;
      rightHtml += `<div class="diff-line add"><span class="diff-ln">${rno}</span>${cd ? cd.right : esc(op.right || '')}</div>`;
      continue;
    }
    if (op.type === 'del') {
      lno += 1;
      leftHtml  += `<div class="diff-line del"><span class="diff-ln">${lno}</span>${esc(op.left || '')}</div>`;
      rightHtml += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
      continue;
    }
    rno += 1;
    leftHtml  += '<div class="diff-line pad"><span class="diff-ln"></span></div>';
    rightHtml += `<div class="diff-line add"><span class="diff-ln">${rno}</span>${esc(op.right || '')}</div>`;
  }
  return {
    left:  `${chips}<div class="diff-sem-scroll diff-sem-val diff-sem-val--del">${leftHtml}</div>`,
    right: `${chips}<div class="diff-sem-scroll diff-sem-val diff-sem-val--add">${rightHtml}</div>`
  };
}

export function renderDiffRowMeta(row) {
  const tags: string[] = [];
  const lines: string[] = [];
  if (row.reasonSummary) {
    tags.push(`<span class="diff-meta-tag reason">${esc(row.reasonSummary)}</span>`);
  }
  if (row.notationOnly) {
    tags.push(`<span class="diff-meta-tag notation" title="型・表記だけが異なり、値としては同じです（例: &quot;100&quot; と 100）">表記のみ</span>`);
  }
  if (row.emptyOnly) {
    tags.push(`<span class="diff-meta-tag notation" title="空文字・null・空配列・空オブジェクトなど、空値同士の差です">空値ゆれ</span>`);
  }
  if (row.renameCandidate) {
    const renameTip = `名称変更候補: ${String(row.renameCandidate.fromCode || '-')} → ${String(row.renameCandidate.toCode || '-')}`
      + (row.renameCandidate.matchedBy ? ` / 判定: ${String(row.renameCandidate.matchedBy)}` : '');
    tags.push(`<span class="diff-meta-tag rename" title="${esc(renameTip)}">名称変更候補</span>`);
    if (row.renameCandidate.matchedBy) {
      lines.push(`<div class="diff-meta-line"><strong>判定:</strong> ${esc(row.renameCandidate.matchedBy)}</div>`);
    }
  }
  if (row.impactCount) {
    tags.push(`<span class="diff-meta-tag impact" title="${esc(String(row.impactCount))}件">影響</span>`);
    const impactText = (row.impactRefs || [])
      .map((ref) => `${ref.section || ref.sectionKey || '-'}:${ref.kind || '-'}${ref.label ? `(${ref.label})` : ''}`)
      .join(' / ');
    const detail = impactText || row.impactSummary || '';
    lines.push(`<div class="diff-meta-line"><strong>影響:</strong> ${esc(detail)}</div>`);
  }
  if (!tags.length && !lines.length) return '';
  return `<div class="diff-meta">
      ${tags.length ? `<div class="diff-meta-tags">${tags.join('')}</div>` : ''}
      ${lines.join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// Diff row keyword / filter matching
// ---------------------------------------------------------------------------

export function diffRowMatchesKeyword(row, keyword) {
  if (!keyword) return true;
  return buildDiffRowSearchText(row).includes(keyword);
}

function buildDiffRowSearchText(row) {
  const safe = (v) => {
    try { return v === undefined ? '' : JSON.stringify(v); }
    catch { return String(v); }
  };
  // 非フィールド系は decodeRow が返す日本語ラベルも検索対象に含める。
  // 例: 「営業部」「閲覧」「アプリ権限」がそのまま検索キーワードとして使える。
  const semanticTokens = isSemanticSection(row?.sectionKey)
    ? (decodeRow(row)?.searchableTokens || [])
    : [];
  return [
    row.section || '',
    row.sectionKey || '',
    row.severity || '',
    row.path || '',
    row.reasonSummary || '',
    row.renameCandidate ? `${row.renameCandidate.fromCode || ''} ${row.renameCandidate.toCode || ''}` : '',
    row.impactSummary || '',
    ...(row.impactRefs || []).map((ref) => `${ref.section || ''} ${ref.kind || ''} ${ref.path || ''}`),
    ...semanticTokens,
    safe(row.left),
    safe(row.right)
  ].join('\n').toLowerCase();
}

function collectFieldLabelMapFromProperties(properties: any, out: Map<string, Set<string>> = new Map<string, Set<string>>()) {
  if (!properties || typeof properties !== 'object') return out;
  (Object.entries(properties) as Array<[string, any]>).forEach(([code, field]) => {
    if (!field || typeof field !== 'object') return;
    const label = String(field.label || field.name || '').trim();
    if (label) {
      if (!out.has(code)) out.set(code, new Set<string>());
      out.get(code)!.add(label);
    }
    if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
      collectFieldLabelMapFromProperties(field.fields, out);
    }
  });
  return out;
}

function buildFieldLabelMapFromBundle(bundle: any): Map<string, Set<string>> {
  const props = bundle?.fieldSettings?.properties;
  return collectFieldLabelMapFromProperties(props, new Map<string, Set<string>>());
}

function resolveDiffRowFieldTerms(row: any, sourceBundle: any, targetBundle: any) {
  const terms = new Set<string>();
  const fieldInfo = extractFieldPathInfo(row?.path);
  if (fieldInfo?.activeCode) terms.add(fieldInfo.activeCode);
  if (row?.renameCandidate?.fromCode) terms.add(row.renameCandidate.fromCode);
  if (row?.renameCandidate?.toCode) terms.add(row.renameCandidate.toCode);
  const payload = getFieldRowPayload(row);
  if (payload?.code) terms.add(String(payload.code));
  const sourceMap = buildFieldLabelMapFromBundle(sourceBundle);
  const targetMap = buildFieldLabelMapFromBundle(targetBundle);
  [...terms].forEach((code: string) => {
    (sourceMap.get(code) || new Set<string>()).forEach((label: string) => terms.add(label));
    (targetMap.get(code) || new Set<string>()).forEach((label: string) => terms.add(label));
  });
  return [...terms].filter(Boolean);
}

function resolveDiffRowTableContext(row, sourceBundle, targetBundle) {
  const empty = { isTableField: false, tableCode: '', tableLabel: '' };
  if (!row || row.sectionKey !== 'fieldSettings') return empty;
  const info = extractFieldPathInfo(row.path);
  if (!info || !info.isSubField) return empty;
  const tableCode = String(info.rootCode || '').trim();
  if (!tableCode) return empty;
  const src = sourceBundle?.fieldSettings?.properties?.[tableCode];
  const tgt = targetBundle?.fieldSettings?.properties?.[tableCode];
  const tableLabel = String(tgt?.label || tgt?.name || src?.label || src?.name || tableCode).trim();
  return {
    isTableField: true,
    tableCode,
    tableLabel
  };
}

export function diffRowMatchesFieldNameKeyword(row, keyword, sourceBundle, targetBundle) {
  if (!keyword) return true;
  const terms = resolveDiffRowFieldTerms(row, sourceBundle, targetBundle).join('\n').toLowerCase();
  if (!terms) return false;
  return terms.includes(keyword);
}

export function diffIssueMatchesKeyword(issue, keyword) {
  if (!keyword) return true;
  const text = [
    issue.section || '',
    issue.sectionKey || '',
    issue.side || '',
    issue.sourceError || '',
    issue.targetError || '',
    issue.message || ''
  ].join('\n').toLowerCase();
  return text.includes(keyword);
}

export function diffRowMatchesFilters(row, filters) {
  if (filters.keyword) {
    if (filters.searchByFieldName) {
      if (!diffRowMatchesFieldNameKeyword(row, filters.keyword, filters.sourceBundle, filters.targetBundle)) return false;
    } else if (!diffRowMatchesKeyword(row, filters.keyword)) {
      return false;
    }
  }
  if (filters.section && row.sectionKey !== filters.section) return false;
  if (filters.type === 'moved') {
    if (!row.moved) return false;
  } else if (filters.type && row.type !== filters.type) {
    return false;
  }
  if (filters.severity && String(row.severity || 'low') !== filters.severity) return false;
  const tableContext = resolveDiffRowTableContext(row, filters.sourceBundle, filters.targetBundle);
  if (filters.tableFieldsOnly && !tableContext.isTableField) return false;
  if (filters.tableKeyword) {
    if (!tableContext.isTableField) return false;
    const tableText = `${tableContext.tableCode}\n${tableContext.tableLabel}`.toLowerCase();
    if (!tableText.includes(filters.tableKeyword)) return false;
  }
  if (filters.favoritesOnly) {
    const p = String(row.path || '').trim();
    if (!state.diffFavoritePaths.has(p)) return false;
  }
  if (filters.hideViewed && row.type !== 'same' && isDiffRowViewed(row)) return false;
  return true;
}

export function getCurrentDiffFilterState() {
  return {
    keyword: String(ui.diffSearch?.value || '').trim().toLowerCase(),
    section: ui.diffFilterSection?.value || state.diffFilterSection || '',
    type: ui.diffFilterType?.value || state.diffFilterType || '',
    severity: ui.diffFilterSeverity?.value || state.diffFilterSeverity || '',
    tableFieldsOnly: !!ui.diffFilterTableOnly?.checked || !!state.diffFilterTableOnly,
    tableKeyword: String(ui.diffFilterTableKeyword?.value || state.diffFilterTableKeyword || '').trim().toLowerCase(),
    searchByFieldName: !!ui.diffSearchFieldName?.checked || !!state.diffSearchFieldName,
    sourceBundle: state.lastSourceBundle,
    targetBundle: state.lastTargetBundle,
    favoritesOnly: !!state.diffFavoritesOnly,
    hideViewed: !!state.diffHideViewed
  };
}

// ---------------------------------------------------------------------------
// Viewed (レビュー済み) helpers — パスベースで永続化
// ---------------------------------------------------------------------------

// 接続単位スコープ — 同じ比較元/比較先ペアに対するレビュー状態だけを共有する
export function getDiffReviewScope() {
  const src = String(ui.sourceApp?.value || '').trim();
  const srcGuest = String(ui.sourceGuest?.value || '').trim();
  const tgt = String(ui.targetApp?.value || '').trim();
  const tgtGuest = String(ui.targetGuest?.value || '').trim();
  if (!src && !tgt) return '';
  return `${src}@${srcGuest}#${tgt}@${tgtGuest}`;
}

export function diffViewedKey(row) {
  if (!row) return '';
  const section = String(row.sectionKey || '');
  const path = String(row.path || '');
  const type = String(row.type || '');
  if (!path && !section) return '';
  const scope = getDiffReviewScope();
  return `${scope}\t${section}\t${path}\t${type}`;
}

function legacyDiffViewedKey(row) {
  if (!row) return '';
  const section = String(row.sectionKey || '');
  const path = String(row.path || '');
  const type = String(row.type || '');
  if (!path && !section) return '';
  return `\t${section}\t${path}\t${type}`;
}

export function isDiffRowViewed(row) {
  const key = diffViewedKey(row);
  if (!key) return false;
  if (state.diffViewedKeys.has(key)) return true;
  const legacy = legacyDiffViewedKey(row);
  return !!legacy && state.diffViewedKeys.has(legacy);
}

export function getDiffReviewMeta(row) {
  const key = diffViewedKey(row);
  if (!key || !state.diffReviewMeta || typeof state.diffReviewMeta !== 'object') {
    return { key: '', status: '', note: '' };
  }
  let raw = state.diffReviewMeta[key];
  if (!raw || typeof raw !== 'object') {
    const legacy = legacyDiffViewedKey(row);
    if (legacy && state.diffReviewMeta[legacy]) raw = state.diffReviewMeta[legacy];
  }
  if (!raw || typeof raw !== 'object') return { key, status: '', note: '' };
  const status = raw.status === 'todo' || raw.status === 'ignored' ? raw.status : '';
  const note = String(raw.note || '').trim();
  return { key, status, note };
}

function renderDiffReviewControls(row) {
  if (!row || row.type === 'same') return '';
  const meta = getDiffReviewMeta(row);
  const hasMeta = !!(meta.status || meta.note);
  const todoActive = meta.status === 'todo' ? ' is-active' : '';
  const ignoredActive = meta.status === 'ignored' ? ' is-active' : '';
  const noteActive = meta.note ? ' is-active' : '';
  return `<div class="diff-review-tools" aria-label="レビュー状態">
      <button type="button" class="diff-review-btn diff-review-btn--todo${todoActive}" data-diff-review-action="todo" data-diff-review-id="${esc(row._id || '')}" title="要対応としてマーク">要対応</button>
      <button type="button" class="diff-review-btn diff-review-btn--ignored${ignoredActive}" data-diff-review-action="ignored" data-diff-review-id="${esc(row._id || '')}" title="無視してよい差分としてマーク">無視</button>
      <button type="button" class="diff-review-btn diff-review-btn--note${noteActive}" data-diff-review-action="note" data-diff-review-id="${esc(row._id || '')}" title="この差分にメモを残す">${meta.note ? 'メモあり' : 'メモ'}</button>
      ${hasMeta ? `<button type="button" class="diff-review-btn diff-review-btn--clear" data-diff-review-action="clear" data-diff-review-id="${esc(row._id || '')}" title="レビュー状態を解除">解除</button>` : ''}
    </div>${meta.note ? `<div class="diff-review-note" title="${esc(meta.note)}">メモ: ${esc(meta.note)}</div>` : ''}`;
}

export function countViewedInRows(rows) {
  if (!rows || !rows.length) return 0;
  let n = 0;
  for (const row of rows) {
    if (!row || row.type === 'same') continue;
    if (isDiffRowViewed(row)) n += 1;
  }
  return n;
}

export function getFilteredDiffRows(rows) {
  const list = rows || state.lastDiffRows || [];
  const filters = getCurrentDiffFilterState();
  const ex = state.diffExcludeSections;
  return list.filter((row) => {
    if (Array.isArray(ex) && ex.length && ex.includes(row.sectionKey)) return false;
    return diffRowMatchesFilters(row, filters);
  });
}

export function getFilteredFetchIssues(issues) {
  const list = issues || state.lastFetchIssues || [];
  const filters = getCurrentDiffFilterState();
  return list.filter((issue) => {
    if (filters.section && issue.sectionKey !== filters.section) return false;
    if (filters.keyword && !diffIssueMatchesKeyword(issue, filters.keyword)) return false;
    return true;
  });
}

export function getFilteredPartialIssues(issues) {
  const list = issues || state.lastPartialIssues || [];
  const filters = getCurrentDiffFilterState();
  return list.filter((issue) => {
    if (filters.section && issue.sectionKey !== filters.section) return false;
    if (filters.keyword && !diffIssueMatchesKeyword(issue, filters.keyword)) return false;
    return true;
  });
}

export function getSelectedDiffRows(rows?: any[]): any[] {
  const selected = state.diffSelectedIds || new Set<string>();
  return (rows || state.lastDiffRows || []).filter((row: any) => selected.has(row._id));
}

export function getRenderedDiffRows(rows?: any[]): any[] {
  const filtered = getFilteredDiffRows(rows);
  const grouped: Array<{ key: string; rows: any[] }> = groupDiffRowsBySection(filtered);
  const out: any[] = [];
  for (const group of grouped) {
    if (state.diffCollapsedSections.has(group.key)) continue;
    const visible = Math.max(40, state.diffSectionVisibleCounts[group.key] || 80);
    out.push(...group.rows.slice(0, visible));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Section grouping
// ---------------------------------------------------------------------------

export function groupDiffRowsBySection(rows) {
  const labelByKey = new Map(SECTION_DEFS.map((d) => [d.key, d.label]));
  const orderByKey = new Map(SECTION_DEFS.map((d, i) => [d.key, i]));
  const grouped = new Map();

  for (const row of rows) {
    const key = row.sectionKey || row.section || '未分類';
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        label: labelByKey.get(key) || row.section || key,
        rows: []
      });
    }
    grouped.get(key).rows.push(row);
  }

  return [...grouped.values()].sort((a, b) => {
    const oa = orderByKey.has(a.key) ? (orderByKey.get(a.key) ?? 9999) : 9999;
    const ob = orderByKey.has(b.key) ? (orderByKey.get(b.key) ?? 9999) : 9999;
    if (oa !== ob) return oa - ob;
    return String(a.label).localeCompare(String(b.label));
  });
}

// ---------------------------------------------------------------------------
// Warning / threshold helpers
// ---------------------------------------------------------------------------

export function parseDiffWarnThreshold() {
  const raw = String(ui.diffWarnThreshold?.value || '').trim();
  if (!raw) return 0;
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}

export function buildDiffWarningInfo(rows, issues, partialIssues?) {
  const threshold = parseDiffWarnThreshold();
  const diffCount = countActualDiffRows(rows || state.lastDiffRows || []);
  const issueCount = (issues || state.lastFetchIssues || []).length;
  const partialIssueCount = (partialIssues || state.lastPartialIssues || []).length;
  const total = diffCount + issueCount + partialIssueCount;
  const exceeded = threshold > 0 && total >= threshold;
  return { threshold, diffCount, issueCount, partialIssueCount, total, exceeded };
}

// ---------------------------------------------------------------------------
// Export mode resolution
// ---------------------------------------------------------------------------

export function resolveDiffExportMode() {
  return ui.diffExportMode?.value || state.diffExportMode || 'all';
}

export function resolveDiffExportContentMode() {
  return ui.diffExportContent?.value || state.diffExportContent || 'diffOnly';
}


export function buildDiffExportComparedBundles(sourceBundle: any, targetBundle: any, scopes: readonly string[] | null | undefined) {
  const compareScopes: string[] = [...new Set((scopes || []).filter(Boolean) as string[])];
  return {
    scopes: compareScopes,
    sourceBundle: pickBundleSections(sourceBundle, compareScopes),
    targetBundle: pickBundleSections(targetBundle, compareScopes)
  };
}

function getSectionLabel(sectionKeyOrLabel) {
  const raw = String(sectionKeyOrLabel || '').trim();
  if (!raw) return '-';
  return SECTION_DEFS.find((item) => item.key === raw || item.label === raw)?.label || raw;
}

function getSectionOrder(sectionKeyOrLabel) {
  const raw = String(sectionKeyOrLabel || '').trim();
  const index = SECTION_DEFS.findIndex((item) => item.key === raw || item.label === raw);
  return index >= 0 ? index : 9999;
}

function getRelativeDiffPath(row) {
  const path = String(row?.path || '').trim();
  const secKey = String(row?.sectionKey || '').trim();
  if (!path) return '';
  if (!secKey) return path;
  if (path === secKey) return '（セクション全体）';
  if (path.startsWith(`${secKey}.`)) return path.slice(secKey.length + 1);
  if (path.startsWith(`${secKey}[`)) return path.slice(secKey.length);
  return path;
}

function compactDiffValuePreview(value, maxLength = 140) {
  const raw = stringifyForDiff(value).replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  return raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw;
}

function getBundleExportMeta(bundle) {
  return {
    appId: String(bundle?.appId || ''),
    appName: extractAppNameFromBundle(bundle),
    guestId: String(bundle?.guestId || ''),
    preview: !!bundle?.preview,
    revision: resolveBundleRevision(bundle) || '',
    fetchedAt: bundle?.fetchedAt || '',
    sectionCount: Object.keys(bundle?.sections || ({} as any)).length
  };
}

function buildDiffTypeSummary(rows) {
  const summarized = summarizeRows(rows || []);
  return {
    totalRows: summarized.total,
    diffCount: countActualDiffRows(rows || []),
    sameCount: summarized.same,
    added: summarized.added,
    removed: summarized.removed,
    changed: summarized.changed,
    moved: summarized.moved
  };
}

function buildCompactFetchIssue(issue) {
  return {
    sectionKey: String(issue?.sectionKey || ''),
    sectionLabel: getSectionLabel(issue?.sectionKey || issue?.section),
    side: String(issue?.side || ''),
    message: String(issue?.message || ''),
    sourceError: String(issue?.sourceError || ''),
    targetError: String(issue?.targetError || '')
  };
}

function buildCompactDiffRow(row) {
  return {
    sectionKey: String(row?.sectionKey || ''),
    sectionLabel: getSectionLabel(row?.sectionKey || row?.section),
    type: String(row?.type || ''),
    severity: String(row?.severity || 'low'),
    path: String(row?.path || ''),
    relativePath: getRelativeDiffPath(row),
    moved: !!row?.moved,
    reasonSummary: String(row?.reasonSummary || ''),
    impactCount: Number(row?.impactCount || 0),
    impactSummary: String(row?.impactSummary || ''),
    renameCandidate: row?.renameCandidate || null,
    preview: {
      source: compactDiffValuePreview(row?.left),
      target: compactDiffValuePreview(row?.right)
    }
  };
}

export function buildDiffSectionSummaries(rows, fetchIssues: any[] = [], partialIssues: any[] = []) {
  const groupedRows = new Map();
  const issueKeys = new Set();
  const partialIssueKeys = new Set();
  (rows || []).forEach((row) => {
    const key = String(row?.sectionKey || row?.section || '').trim() || '未分類';
    if (!groupedRows.has(key)) groupedRows.set(key, []);
    groupedRows.get(key).push(row);
  });
  (fetchIssues || []).forEach((issue) => {
    const key = String(issue?.sectionKey || issue?.section || '').trim();
    if (key) issueKeys.add(key);
  });
  (partialIssues || []).forEach((issue) => {
    const key = String(issue?.sectionKey || issue?.section || '').trim();
    if (key) partialIssueKeys.add(key);
  });
  const keys = [...new Set([...groupedRows.keys(), ...issueKeys, ...partialIssueKeys])];
  keys.sort((a, b) => {
    const ao = getSectionOrder(a);
    const bo = getSectionOrder(b);
    if (ao !== bo) return ao - bo;
    return String(getSectionLabel(a)).localeCompare(String(getSectionLabel(b)));
  });
  return keys.map((sectionKey) => {
    const sectionRows = groupedRows.get(sectionKey) || [];
    const diffRows = getActualDiffRows(sectionRows);
    const typeSummary = buildDiffTypeSummary(sectionRows);
    const severity = summarizeSeverity(sectionRows);
    const issueCount = (fetchIssues || []).filter((issue) => String(issue?.sectionKey || issue?.section || '').trim() === sectionKey).length;
    const partialIssueCount = (partialIssues || []).filter((issue) => String(issue?.sectionKey || issue?.section || '').trim() === sectionKey).length;
    const reasonCounts = new Map();
    diffRows.forEach((row) => {
      const reason = String(row?.reasonSummary || '').trim();
      if (!reason) return;
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
    });
    const topReasons = [...reasonCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));
    const samplePaths = [...new Set(diffRows.map((row) => getRelativeDiffPath(row)).filter(Boolean))].slice(0, 3);
    return {
      sectionKey,
      sectionLabel: getSectionLabel(sectionKey),
      ...typeSummary,
      fetchIssueCount: issueCount,
      partialIssueCount,
      severity,
      topReasons,
      samplePaths
    };
  });
}

export function buildDiffHighlightRows(rows, limit = 8) {
  const severityWeight = { high: 300, medium: 200, low: 100 };
  return getActualDiffRows(rows || [])
    .map((row, index) => {
      let score = severityWeight[row?.severity] || 0;
      if (row?.type === 'removed') score += 30;
      else if (row?.type === 'added') score += 18;
      else score += 12;
      if (row?.renameCandidate) score += 12;
      if (row?.moved) score += 6;
      score += Math.min(40, Number(row?.impactCount || 0) * 4);
      return { row, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ row }) => ({
      ...buildCompactDiffRow(row),
      impactRefs: Array.isArray(row?.impactRefs) ? row.impactRefs.slice(0, 3) : []
    }));
}

function buildCompactRowsBySection(rows) {
  const grouped = {};
  (rows || []).forEach((row) => {
    const key = String(row?.sectionKey || row?.section || '').trim() || '未分類';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(buildCompactDiffRow(row));
  });
  return grouped;
}

export function buildDiffExportPayload({
  sourceBundle,
  targetBundle,
  rows,
  fetchIssues,
  partialIssues,
  ignoreKeys,
  exportMode,
  exportLabel,
  exportContentMode,
  exportContentLabel,
  normalizationState,
  warning,
  truncation,
  compareScopes,
  compareSourceBundle,
  compareTargetBundle
}: any = {}) {
  const safeRows = redactSensitiveSameDiffRows(Array.isArray(rows) ? rows : []);
  const safeIssues = Array.isArray(fetchIssues) ? fetchIssues : [];
  const safePartialIssues = Array.isArray(partialIssues) ? partialIssues : [];
  const stateMap = normalizationState || ({} as any);
  const sectionSummaries = buildDiffSectionSummaries(safeRows, safeIssues, safePartialIssues);
  const typeSummary = buildDiffTypeSummary(safeRows);
  const compared = shouldIncludeComparedContent(exportContentMode) && Array.isArray(compareScopes) && compareScopes.length
    ? {
        scopes: [...new Set(compareScopes.filter(Boolean))],
        sourceBundle: compareSourceBundle || null,
        targetBundle: compareTargetBundle || null
      }
    : null;
  return {
    generatedAt: new Date().toISOString(),
    export: {
      mode: exportMode || 'all',
      label: exportLabel || '全差分',
      contentMode: exportContentMode || 'diffOnly',
      contentLabel: exportContentLabel || getDiffExportContentLabel(exportContentMode),
      ignoreKeys: String(ignoreKeys || ''),
      normalizationState: stateMap,
      normalizationLabels: getActiveDiffNormalizationLabels(stateMap)
    },
    source: getBundleExportMeta(sourceBundle),
    target: getBundleExportMeta(targetBundle),
    summary: {
      ...typeSummary,
      fetchIssueCount: safeIssues.length,
      partialIssueCount: safePartialIssues.length,
      incompleteComparison: safeIssues.length > 0
        || safePartialIssues.length > 0
        || hasIncompleteActualDiffTruncation(truncation),
      sectionCount: sectionSummaries.length,
      sectionsWithDiff: sectionSummaries.filter((item) => item.diffCount > 0).length,
      severity: summarizeSeverity(safeRows),
      warning: warning || {
        threshold: 0,
        diffCount: typeSummary.diffCount,
        issueCount: safeIssues.length,
        partialIssueCount: safePartialIssues.length,
        total: typeSummary.diffCount + safeIssues.length + safePartialIssues.length,
        exceeded: false
      },
      // 差分/同一証跡の上限情報。同一証跡だけの省略は actualDiffIncomplete=false。
      truncation: truncation || null
    },
    sectionSummaries,
    highlights: buildDiffHighlightRows(safeRows),
    fetchIssues: safeIssues.map(buildCompactFetchIssue),
    partialIssues: deepClone(safePartialIssues),
    details: {
      rows: safeRows,
      rowsCompact: safeRows.map(buildCompactDiffRow),
      rowsBySection: buildCompactRowsBySection(safeRows)
    },
    compared
  };
}

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

const MD_FIELD_TYPE_LABELS = {
  SINGLE_LINE_TEXT: '文字列（1行）',
  MULTI_LINE_TEXT: '文字列（複数行）',
  RICH_TEXT: 'リッチテキスト',
  NUMBER: '数値',
  CALC: '計算',
  CHECK_BOX: 'チェックボックス',
  RADIO_BUTTON: 'ラジオボタン',
  DROP_DOWN: 'ドロップダウン',
  MULTI_SELECT: '複数選択',
  DATE: '日付',
  TIME: '時刻',
  DATETIME: '日時',
  LINK: 'リンク',
  FILE: '添付ファイル',
  USER_SELECT: 'ユーザー選択',
  ORGANIZATION_SELECT: '組織選択',
  GROUP_SELECT: 'グループ選択',
  CATEGORY: 'カテゴリー',
  STATUS: 'ステータス',
  STATUS_ASSIGNEE: '作業者',
  SUBTABLE: 'テーブル',
  REFERENCE_TABLE: '関連レコード一覧',
  RECORD_NUMBER: 'レコード番号',
  CREATOR: '作成者',
  CREATED_TIME: '作成日時',
  MODIFIER: '更新者',
  UPDATED_TIME: '更新日時',
  SPACER: 'スペース',
  HR: '罫線',
  LABEL: 'ラベル',
  GROUP: 'グループ',
  LOOKUP: 'ルックアップ'
};

const MD_VIEW_TYPE_LABELS = {
  LIST: '一覧',
  CALENDAR: 'カレンダー',
  CUSTOM: 'カスタマイズ'
};

const MD_REPORT_CHART_LABELS = {
  BAR: '棒グラフ',
  COLUMN: '縦棒グラフ',
  LINE: '折れ線グラフ',
  PIE: '円グラフ',
  PIVOT_TABLE: 'クロス集計表',
  TABLE: '表',
  AREA: '面グラフ',
  SPLINE: 'スプライン',
  SPLINE_AREA: 'スプライン面',
  SCATTER: '散布図'
};

const MD_ENTITY_TYPE_LABELS = {
  USER: 'ユーザー',
  GROUP: 'グループ',
  ORGANIZATION: '組織',
  FIELD_ENTITY: 'フィールド',
  CREATOR: 'レコード作成者',
  CUSTOM_FIELD: 'カスタムフィールド'
};

const MD_PROCESS_ASSIGNEE_TYPE_LABELS = {
  ONE: '1人選出（候補から1人）',
  ANYONE: '候補の誰でも（先着）',
  ALL: '全員（全員の処理が必要）'
};

const MD_FIELD_ACCESSIBILITY_LABELS = {
  WRITE: '閲覧・編集可',
  READ: '閲覧のみ',
  NONE: 'アクセス不可'
};

const MD_REPORT_CHART_MODE_LABELS = {
  NORMAL: '通常',
  STACKED: '積み上げ',
  PERCENTAGE: '100%積み上げ'
};

const MD_AGGREGATION_TYPE_LABELS = {
  COUNT: '件数',
  SUM: '合計',
  AVG: '平均',
  MAX: '最大値',
  MIN: '最小値'
};

const MD_CUSTOMIZE_SCOPE_LABELS = {
  ALL: '全ユーザー',
  ADMIN: '管理者のみ',
  NONE: '無効'
};

const MD_RESOURCE_TYPE_LABELS = {
  URL: 'URL指定',
  FILE: 'ファイル指定'
};

const MD_ICON_TYPE_LABELS = {
  PRESET: 'プリセット',
  FILE: 'アップロードファイル'
};

const MD_LANGUAGE_LABELS = {
  default: '既定',
  ja: '日本語',
  en: '英語',
  zh: '中国語',
  user: 'ユーザー設定言語'
};

const MD_THEME_LABELS = {
  WHITE: 'ホワイト',
  RED: 'レッド',
  BLUE: 'ブルー',
  GREEN: 'グリーン',
  YELLOW: 'イエロー',
  BLACK: 'ブラック',
  CLIPBOARD: 'クリップボード',
  BINDER: 'バインダー',
  PENCIL: 'ペンシル',
  CLIPS: 'クリップ'
};

const MD_VIEW_BUILTIN_LABELS = {
  ASSIGNEE: '作業者ビュー',
  UNDONE: '未完了レコード',
  ACTIVE_BY_USER: '自分が処理すべきレコード',
  RECORDS_OF_USER: '自分が関わるレコード'
};

const MD_PAGINATION_LABELS = {
  ROW: '行ページャ',
  PAGE: 'ページ番号'
};

function mdProcessAssigneeTypeLabel(value) {
  const key = String(value || '').trim();
  if (!key) return '';
  return MD_PROCESS_ASSIGNEE_TYPE_LABELS[key] || key;
}

function mdLookupLabel(map, value) {
  const key = String(value || '').trim();
  if (!key) return '';
  return map[key] || key;
}

function mdEsc(value) {
  return decodeHtmlEntities(value)
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function mdFieldTypeLabel(type) {
  const key = String(type || '').trim();
  return MD_FIELD_TYPE_LABELS[key] || key || '';
}

function mdEntityList(entities) {
  if (!Array.isArray(entities) || entities.length === 0) return '';
  return entities.map((e) => {
    const entity = e?.entity || e;
    if (!entity) return '';
    const typeLabel = MD_ENTITY_TYPE_LABELS[entity.type] || entity.type || '';
    const code = entity.code ? `\`${entity.code}\`` : '';
    const parts = [typeLabel, code].filter(Boolean);
    const subs = e?.includeSubs ? '（配下含む）' : '';
    return parts.join(': ') + subs;
  }).filter(Boolean).join(' / ');
}

function mdBoolMark(value) {
  if (value === true) return '○';
  return '';
}

function mdTable(headers, rows) {
  if (!rows || rows.length === 0) return '';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((r) => `| ${r.map(mdEsc).join(' | ')} |`).join('\n');
  return `${head}\n${sep}\n${body}`;
}

function mdRawJson(sec) {
  return [
    '<details><summary>APIレスポンス（生データ）</summary>',
    '',
    '```json',
    JSON.stringify(sec, null, 2),
    '```',
    '',
    '</details>'
  ].join('\n');
}

function mdFormatDefaultValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value.map((v) => (v && typeof v === 'object' ? JSON.stringify(v) : decodeHtmlEntities(v))).join(' / ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return decodeHtmlEntities(value);
}

function mdFieldOptions(options: any): string {
  if (!options || typeof options !== 'object') return '';
  const entries = (Object.values(options) as any[]).map((opt: any) => ({
    label: opt?.label ?? '',
    index: Number(opt?.index ?? 0)
  }));
  entries.sort((a, b) => a.index - b.index);
  return entries.map((o) => decodeHtmlEntities(o.label)).filter(Boolean).join(' / ');
}

function mdRenderAppSettings(sec: any) {
  const rows = [
    ['アプリ名', sec.name || ''],
    ['説明', stripHtmlToText(sec.description || '')],
    ['アイコン', sec.icon?.type ? `${mdLookupLabel(MD_ICON_TYPE_LABELS, sec.icon.type)}${sec.icon.key ? `（${sec.icon.key}）` : ''}` : ''],
    ['テーマ', mdLookupLabel(MD_THEME_LABELS, sec.theme) || ''],
    ['タイトルフィールド', sec.titleField?.selectFieldCode || (sec.titleField?.isDefaultTitleField ? '（既定）' : '')],
    ['サムネイル', sec.enableThumbnails ? '有効' : '無効'],
    ['コメント', sec.enableComments ? '有効' : '無効'],
    ['一括削除', sec.enableBulkDeletion ? '有効' : '無効'],
    ['レコード複製', sec.enableDuplicateRecord ? '有効' : '無効'],
    ['インライン編集', sec.enableInlineRecordEditing ? '有効' : '無効'],
    ['会計年度開始月', sec.firstMonthOfFiscalYear != null ? String(sec.firstMonthOfFiscalYear) : ''],
    ['リビジョン', sec.revision != null ? String(sec.revision) : '']
  ].filter((r) => r[1] !== '');
  return mdTable(['項目', '値'], rows);
}

function mdRenderFieldSettings(sec: any) {
  const props = sec?.properties || ({} as any);
  const rows: any[][] = [];
  const subtables: any[] = [];
  (Object.values(props) as any[]).forEach((f: any) => {
    if (!f) return;
    rows.push([
      f.code || '',
      stripHtmlToText(f.label || ''),
      mdFieldTypeLabel(f.type),
      f.required ? '○' : '',
      f.unique ? '○' : '',
      mdFormatDefaultValue(f.defaultValue),
      mdFieldOptions(f.options) || (f.expression ? `式: ${f.expression}` : '')
    ]);
    if (f.type === 'SUBTABLE' && f.fields) {
      subtables.push(f);
    }
  });
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const parts: string[] = [];
  parts.push(`- フィールド数: ${rows.length}`);
  parts.push('');
  parts.push(mdTable(
    ['コード', 'フィールド名', '種別', '必須', '重複禁止', '初期値', '選択肢/式'],
    rows
  ));
  subtables.forEach((tbl: any) => {
    parts.push('');
    parts.push(`#### テーブル: \`${tbl.code}\` — ${stripHtmlToText(tbl.label || '')}`);
    parts.push('');
    const subRows = (Object.values(tbl.fields || ({} as any)) as any[]).map((f: any) => [
      f.code || '',
      stripHtmlToText(f.label || ''),
      mdFieldTypeLabel(f.type),
      f.required ? '○' : '',
      mdFormatDefaultValue(f.defaultValue),
      mdFieldOptions(f.options) || (f.expression ? `式: ${f.expression}` : '')
    ]);
    subRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    parts.push(mdTable(['コード', 'フィールド名', '種別', '必須', '初期値', '選択肢/式'], subRows));
  });
  return parts.join('\n');
}

function mdRenderLayoutItem(item, depth = 0) {
  const indent = '  '.repeat(depth);
  const out: string[] = [];
  if (!item) return out;
  if (item.type === 'ROW') {
    const codes = (item.fields || []).map((f) => {
      if (f.type === 'LABEL') return `[ラベル]${stripHtmlToText(f.label || '')}`;
      if (f.type === 'SPACER') return `[スペース${f.elementId ? `:${f.elementId}` : ''}]`;
      if (f.type === 'HR') return '[罫線]';
      const width = f.size?.width;
      const widthLabel = width != null ? ` (${width}${typeof width === 'number' ? 'px' : ''})` : '';
      return `\`${f.code || ''}\`${widthLabel}`;
    }).join(' | ');
    out.push(`${indent}- 行: ${codes || '（空）'}`);
  } else if (item.type === 'SUBTABLE') {
    out.push(`${indent}- テーブル: \`${item.code}\``);
  } else if (item.type === 'GROUP') {
    out.push(`${indent}- グループ: \`${item.code}\` — ${stripHtmlToText(item.label || '')}`);
    (item.layout || []).forEach((child) => {
      out.push(...mdRenderLayoutItem(child, depth + 1));
    });
  }
  return out;
}

function mdRenderLayoutSettings(sec) {
  const layout = sec?.layout || [];
  const lines: string[] = [];
  layout.forEach((item) => lines.push(...mdRenderLayoutItem(item)));
  return lines.join('\n');
}

function mdRenderViewSettings(sec: any) {
  const views = sec?.views || ({} as any);
  const entries = (Object.entries(views) as Array<[string, any]>).map(([name, v]) => ({ name, ...(v as any) }));
  entries.sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
  const rows = entries.map((v: any) => {
    const builtinNote = v.builtinType
      ? (mdLookupLabel(MD_VIEW_BUILTIN_LABELS, v.builtinType) || v.builtinType)
      : '';
    const extras: string[] = [];
    if (v.customView || v.html) extras.push('カスタムHTMLあり');
    if (v.pager === false) extras.push('ページャー無効');
    if (v.paginationStyle) {
      const paginationLabel = mdLookupLabel(MD_PAGINATION_LABELS, v.paginationStyle) || v.paginationStyle;
      extras.push(`ページャー:${paginationLabel}`);
    }
    return [
      v.name || '',
      (MD_VIEW_TYPE_LABELS as any)[v.type] || v.type || '',
      String(v.index ?? ''),
      builtinNote,
      Array.isArray(v.fields) ? v.fields.join(' / ') : '',
      v.filterCond || '',
      v.sort || '',
      extras.join(' / ')
    ];
  });
  return mdTable(['ビュー名', '種別', '表示順', '組み込み種別', '表示フィールド', '絞り込み条件', 'ソート', '備考'], rows);
}

function mdRenderReportSettings(sec: any) {
  const reports = sec?.reports || ({} as any);
  const entries = (Object.entries(reports) as Array<[string, any]>).map(([name, r]) => ({ name, ...(r as any) }));
  entries.sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
  const rows = entries.map((r: any) => [
    r.name || '',
    (MD_REPORT_CHART_LABELS as any)[r.chartType] || r.chartType || '',
    mdLookupLabel(MD_REPORT_CHART_MODE_LABELS, r.chartMode),
    (r.groups || []).map((g: any) => g.code).filter(Boolean).join(' / '),
    (r.aggregations || []).map((a: any) => {
      const typeLabel = mdLookupLabel(MD_AGGREGATION_TYPE_LABELS, a.type);
      return `${typeLabel}（${a.code || ''}）`;
    }).join(' / '),
    r.filterCond || '',
    r.periodicReport?.active ? '定期実行あり' : ''
  ]);
  return mdTable(['レポート名', 'チャート', 'モード', '分類', '集計', '絞り込み条件', '定期実行'], rows);
}

function mdRenderProcessSettings(sec: any) {
  const parts: string[] = [];
  parts.push(`- プロセス管理: ${sec?.enable ? '有効' : '無効'}`);
  parts.push('');
  const states = sec?.states || ({} as any);
  const stateEntries = (Object.entries(states) as Array<[string, any]>).map(([name, s]) => ({ name, ...(s as any) }));
  stateEntries.sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
  if (stateEntries.length) {
    parts.push('#### ステータス');
    parts.push('');
    parts.push(mdTable(
      ['ステータス名', '表示順', '作業者の選び方', '作業者候補'],
      stateEntries.map((s) => [
        s.name || '',
        s.index ?? '',
        mdProcessAssigneeTypeLabel(s.assignee?.type),
        mdEntityList(s.assignee?.entities)
      ])
    ));
    parts.push('');
  }
  const actions = Array.isArray(sec?.actions) ? sec.actions : [];
  if (actions.length) {
    parts.push('#### アクション');
    parts.push('');
    parts.push(mdTable(
      ['アクション名', '遷移元（From）', '遷移先（To）', '絞り込み条件'],
      actions.map((a) => [
        a.name || '',
        Array.isArray(a.from) ? a.from.join(' / ') : (a.from || ''),
        a.to || '',
        a.filterCond || ''
      ])
    ));
  }
  return parts.join('\n');
}

function mdRenderPluginSettings(sec) {
  const plugins = sec?.plugins || [];
  const rows = plugins.map((p) => [
    p.id || '',
    p.name || '',
    p.version || '',
    p.description || ''
  ]);
  return mdTable(['プラグインID', '名称', 'バージョン', '説明'], rows);
}

function mdRenderCustomizeSettings(sec) {
  const parts: string[] = [];
  parts.push(`- 適用範囲（スコープ）: ${mdLookupLabel(MD_CUSTOMIZE_SCOPE_LABELS, sec?.scope) || '（未設定）'}`);
  parts.push('');
  ['desktop', 'mobile'].forEach((area) => {
    const zone = sec?.[area];
    if (!zone) return;
    parts.push(`#### ${area === 'desktop' ? 'PC（デスクトップ）' : 'モバイル'}`);
    parts.push('');
    ['js', 'css'].forEach((kind) => {
      const list = zone[kind];
      if (!Array.isArray(list) || list.length === 0) return;
      parts.push(`- ${kind.toUpperCase()}（${kind === 'js' ? 'JavaScript' : 'スタイルシート'}）:`);
      list.forEach((item) => {
        let src = '';
        if (item.type === 'URL') src = item.url || '';
        else if (item.file) src = `ファイル: ${item.file.name || item.file.fileKey || ''}`;
        const typeLabel = mdLookupLabel(MD_RESOURCE_TYPE_LABELS, item.type);
        parts.push(`  - ${typeLabel || '(種別不明)'}: ${src}`);
      });
    });
    parts.push('');
  });
  return parts.join('\n').trimEnd();
}

function mdRenderActionSettings(sec) {
  const actions = sec?.actions || [];
  const list = Array.isArray(actions) ? actions : Object.values(actions);
  const rows = list.map((a) => [
    a.name || '',
    a.index ?? '',
    a.destApp ? (a.destApp.code || a.destApp.app || '') : '',
    Array.isArray(a.entities) && a.entities.length ? mdEntityList(a.entities) : 'すべてのユーザー',
    String((a.mappings || []).length)
  ]);
  return mdTable(['アクション名', '表示順', '連携先アプリ', '利用できるユーザー', 'マッピング数'], rows);
}

function mdRenderAclRights(rights, columns) {
  if (!Array.isArray(rights) || rights.length === 0) return '';
  return mdTable(
    ['対象', ...columns.map((c) => c.label)],
    rights.map((r) => [
      mdEntityList([{ entity: r.entity, includeSubs: r.includeSubs }]) || r.code || r.filterCond || '',
      ...columns.map((c) => mdBoolMark(r[c.key]))
    ])
  );
}

function mdRenderAppAcl(sec) {
  return mdRenderAclRights(sec?.rights, [
    { key: 'appEditable', label: 'アプリ管理' },
    { key: 'recordViewable', label: '閲覧' },
    { key: 'recordAddable', label: '追加' },
    { key: 'recordEditable', label: '編集' },
    { key: 'recordDeletable', label: '削除' },
    { key: 'recordImportable', label: '読込' },
    { key: 'recordExportable', label: '書出' }
  ]);
}

function mdRenderFieldAcl(sec) {
  const rights = sec?.rights || [];
  const parts: string[] = [];
  rights.forEach((r) => {
    parts.push(`#### \`${r.code || ''}\``);
    parts.push('');
    parts.push(mdTable(
      ['対象', 'アクセス権'],
      (r.entities || []).map((e) => [
        mdEntityList([{ entity: e.entity, includeSubs: e.includeSubs }]),
        mdLookupLabel(MD_FIELD_ACCESSIBILITY_LABELS, e.accessibility)
      ])
    ));
    parts.push('');
  });
  return parts.join('\n').trimEnd();
}

function mdRenderRecordPermissions(sec) {
  const rights = sec?.rights || [];
  const parts: string[] = [];
  rights.forEach((r, idx) => {
    parts.push(`#### 条件 ${idx + 1}${r.filterCond ? `: \`${r.filterCond}\`` : ''}`);
    parts.push('');
    parts.push(mdTable(
      ['対象', '閲覧', '編集', '削除'],
      (r.entities || []).map((e) => [
        mdEntityList([{ entity: e.entity, includeSubs: e.includeSubs }]),
        mdBoolMark(e.viewable),
        mdBoolMark(e.editable),
        mdBoolMark(e.deletable)
      ])
    ));
    parts.push('');
  });
  return parts.join('\n').trimEnd();
}

function mdRenderNotifications(sec) {
  const list = sec?.notifications || [];
  const rows = list.map((n) => [
    mdEntityList([{ entity: n.entity, includeSubs: n.includeSubs }]),
    mdBoolMark(n.recordAdded),
    mdBoolMark(n.recordEdited),
    mdBoolMark(n.commentAdded),
    mdBoolMark(n.statusChanged),
    mdBoolMark(n.fileImported)
  ]);
  const parts: string[] = [];
  if (sec?.notifyToCommenter != null) {
    parts.push(`- コメント投稿者へ通知: ${sec.notifyToCommenter ? '有効' : '無効'}`);
    parts.push('');
  }
  parts.push(mdTable(
    ['対象', 'レコード追加', 'レコード編集', 'コメント', 'ステータス変更', 'ファイル取込'],
    rows
  ));
  return parts.join('\n');
}

function mdRenderPerRecordNotifications(sec) {
  const list = sec?.notifications || [];
  return mdTable(
    ['タイトル', '絞り込み条件', '通知先'],
    list.map((n) => [n.title || '', n.filterCond || '', mdEntityList(n.targets)])
  );
}

function mdRenderReminderNotifications(sec) {
  const list = sec?.notifications || [];
  const parts: string[] = [];
  if (sec?.timezone) {
    parts.push(`- タイムゾーン: ${sec.timezone}`);
    parts.push('');
  }
  parts.push(mdTable(
    ['タイトル', '基準フィールド', '通知タイミング', '絞り込み条件', '通知先'],
    list.map((n) => {
      const t = n.timing || ({} as any);
      const timingParts: any[] = [];
      if (t.daysLater != null && t.daysLater !== '') {
        const d = Number(t.daysLater);
        timingParts.push(!Number.isFinite(d) ? String(t.daysLater) : (d === 0 ? '当日' : (d > 0 ? `${d}日後` : `${Math.abs(d)}日前`)));
      }
      if (t.hoursLater != null && t.hoursLater !== '') {
        const h = Number(t.hoursLater);
        timingParts.push(!Number.isFinite(h) ? String(t.hoursLater) : (h === 0 ? '同時刻' : (h > 0 ? `${h}時間後` : `${Math.abs(h)}時間前`)));
      }
      if (t.time) timingParts.push(`${t.time}`);
      return [n.title || '', t.code ? `\`${t.code}\`` : '', timingParts.join(' '), n.filterCond || '', mdEntityList(n.targets)];
    })
  ));
  return parts.join('\n');
}

function mdRenderCategories(sec) {
  const parts: string[] = [];
  parts.push(`- カテゴリー機能: ${sec?.enabled ? '有効' : '無効'}`);
  parts.push('');
  const list = sec?.categories || [];
  parts.push(mdTable(
    ['コード', '名称', '表示順'],
    list.map((c) => [c.code || '', c.name || '', c.index ?? ''])
  ));
  return parts.join('\n');
}

const MD_SECTION_RENDERERS = {
  appSettings: mdRenderAppSettings,
  fieldSettings: mdRenderFieldSettings,
  layoutSettings: mdRenderLayoutSettings,
  viewSettings: mdRenderViewSettings,
  reportSettings: mdRenderReportSettings,
  processSettings: mdRenderProcessSettings,
  pluginSettings: mdRenderPluginSettings,
  customizeSettings: mdRenderCustomizeSettings,
  actionSettings: mdRenderActionSettings,
  appAcl: mdRenderAppAcl,
  fieldAcl: mdRenderFieldAcl,
  recordPermissions: mdRenderRecordPermissions,
  notifications: mdRenderNotifications,
  perRecordNotifications: mdRenderPerRecordNotifications,
  reminderNotifications: mdRenderReminderNotifications,
  categories: mdRenderCategories
};

function mdBundleSummary(bundle) {
  const sections = bundle?.sections || ({} as any);
  const rows: any[][] = [];
  const fields = sections.fieldSettings?.properties || ({} as any);
  const fieldValues: any[] = Object.values(fields);
  const fieldCount = Object.keys(fields).length;
  const subtableFieldCount = fieldValues.reduce((sum: number, field: any) => {
    if (!field || field.type !== 'SUBTABLE' || !field.fields) return sum;
    return sum + Object.keys(field.fields).length;
  }, 0);
  const requiredCount = fieldValues.filter((field: any) => !!field?.required).length;
  const lookupCount = fieldValues.filter((field: any) => !!field?.lookup).length;
  const referenceCount = fieldValues.filter((field: any) => !!field?.referenceTable).length;
  const viewCount = Object.keys(sections.viewSettings?.views || ({} as any)).length;
  const reportCount = Object.keys(sections.reportSettings?.reports || ({} as any)).length;
  const stateCount = Object.keys(sections.processSettings?.states || ({} as any)).length;
  const actionCount = Array.isArray(sections.processSettings?.actions) ? sections.processSettings.actions.length : 0;
  const pluginCount = (sections.pluginSettings?.plugins || []).length;
  const notifCount = (sections.notifications?.notifications || []).length;
  const customizeCount = ['desktop', 'mobile'].reduce((sum, area) => {
    const zone = sections.customizeSettings?.[area] || ({} as any);
    return sum + (zone.js || []).length + (zone.css || []).length;
  }, 0);
  if (fieldCount) rows.push(['フィールド数', String(fieldCount)]);
  if (subtableFieldCount) rows.push(['テーブル内フィールド数', String(subtableFieldCount)]);
  if (requiredCount) rows.push(['必須フィールド数', String(requiredCount)]);
  if (lookupCount) rows.push(['ルックアップ数', String(lookupCount)]);
  if (referenceCount) rows.push(['関連レコード一覧数', String(referenceCount)]);
  if (viewCount) rows.push(['ビュー数', String(viewCount)]);
  if (reportCount) rows.push(['レポート数', String(reportCount)]);
  if (stateCount) rows.push(['ステータス数', String(stateCount)]);
  if (actionCount) rows.push(['プロセスアクション数', String(actionCount)]);
  if (pluginCount) rows.push(['プラグイン数', String(pluginCount)]);
  if (notifCount) rows.push(['一般通知宛先数', String(notifCount)]);
  if (customizeCount) rows.push(['JS/CSSカスタマイズ数', String(customizeCount)]);
  return rows.length ? mdTable(['項目', '件数'], rows) : '';
}

function mdDesignReviewPoints(bundle: any) {
  const sections = bundle?.sections || ({} as any);
  const fields: any[] = Object.values(sections.fieldSettings?.properties || ({} as any));
  const points: string[] = [];
  const lookupCount = fields.filter((field: any) => !!field?.lookup).length;
  const calcCount = fields.filter((field: any) => !!(field?.expression || field?.formula)).length;
  const permissionCount = (sections.appAcl?.rights || []).length
    + (sections.recordPermissions?.rights || []).length
    + (sections.fieldAcl?.rights || []).length;
  const customizeCount = ['desktop', 'mobile'].reduce((sum: number, area: string) => {
    const zone = sections.customizeSettings?.[area] || ({} as any);
    return sum + (zone.js || []).length + (zone.css || []).length;
  }, 0);
  if (lookupCount) points.push(`- ルックアップ設定が ${lookupCount} 件あります。参照先アプリIDとフィールドマッピングを確認してください。`);
  if (calcCount) points.push(`- 計算式フィールドが ${calcCount} 件あります。参照フィールド変更時の影響を確認してください。`);
  if (permissionCount) points.push(`- 権限設定エントリが ${permissionCount} 件あります。移行前後でユーザー/組織/グループの差異を確認してください。`);
  if (customizeCount) points.push(`- JS/CSSカスタマイズが ${customizeCount} 件あります。URL・ファイル参照・読み込み順を確認してください。`);
  if (sections.processSettings?.enable) points.push('- プロセス管理が有効です。ステータス、作業者、アクション条件を確認してください。');
  return points.length ? points.join('\n') : '- 特に目立つ確認ポイントはありません。';
}

function mdDesignSectionRows(bundle: any) {
  const sections = bundle?.sections || ({} as any);
  return SECTION_DEFS
    .filter((def) => sections[def.key])
    .map((def): string[] => {
      const sec = sections[def.key];
      let count: number | string = '';
      if (def.key === 'fieldSettings') count = Object.keys(sec?.properties || ({} as any)).length;
      else if (def.key === 'viewSettings') count = Object.keys(sec?.views || ({} as any)).length;
      else if (def.key === 'reportSettings') count = Object.keys(sec?.reports || ({} as any)).length;
      else if (def.key === 'processSettings') count = Object.keys(sec?.states || ({} as any)).length;
      else if (def.key === 'pluginSettings') count = (sec?.plugins || []).length;
      else if (Array.isArray(sec?.rights)) count = sec.rights.length;
      else if (Array.isArray(sec?.notifications)) count = sec.notifications.length;
      else count = sec && typeof sec === 'object' ? Object.keys(sec).length : '';
      return [def.label, def.key, count === '' ? '-' : String(count)];
    });
}

export function bundleToMarkdown(bundle: any) {
  const sections = bundle?.sections || ({} as any);
  const appName = decodeHtmlEntities(sections.appSettings?.name || '');
  const lines: string[] = [];
  lines.push('# kintone アプリ設計書');
  lines.push('');
  if (appName) {
    lines.push(`> ${appName}`);
    lines.push('');
  }
  lines.push(mdTable(['項目', '値'], [
    ['アプリID', bundle.appId],
    ['ゲストスペースID', bundle.guestId || '(通常空間)'],
    ['プレビュー取得', bundle.preview ? 'はい' : 'いいえ'],
    ['取得日時', bundle.fetchedAt]
  ]));
  lines.push('');

  const available = SECTION_DEFS.filter((def) => sections[def.key]);
  if (available.length) {
    lines.push('## 目次');
    lines.push('');
    available.forEach((def) => {
      const slug = def.label.replace(/\s+/g, '-');
      lines.push(`- [${def.label}](#${slug})`);
    });
    lines.push('');
  }

  const summary = mdBundleSummary(bundle);
  if (summary) {
    lines.push('## サマリー');
    lines.push('');
    lines.push(summary);
    lines.push('');
  }

  lines.push('## 確認ポイント');
  lines.push('');
  lines.push(mdDesignReviewPoints(bundle));
  lines.push('');

  const sectionRows = mdDesignSectionRows(bundle);
  if (sectionRows.length) {
    lines.push('## 出力セクション');
    lines.push('');
    lines.push(mdTable(['セクション', 'キー', '件数'], sectionRows));
    lines.push('');
  }

  for (const def of SECTION_DEFS) {
    const sec = sections[def.key];
    if (!sec) continue;
    lines.push(`## ${def.label}`);
    lines.push('');
    const renderer = MD_SECTION_RENDERERS[def.key];
    let rendered = '';
    if (renderer) {
      try { rendered = renderer(sec) || ''; } catch (e) { rendered = ''; }
    }
    if (rendered.trim()) {
      lines.push(rendered);
      lines.push('');
    } else {
      lines.push('（データなし）');
      lines.push('');
    }
    lines.push(mdRawJson(sec));
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Patch JSON export
// ---------------------------------------------------------------------------

export function buildPatchPayload(rows, sourceBundle, targetBundle) {
  const grouped = {};
  const diffRows = getActionableDiffRows(rows);
  for (const r of diffRows) {
    const section = r.section || '未分類';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push({
      type: r.type,
      path: r.path,
      sourceValue: r.left,
      targetValue: r.right,
      moved: !!r.moved,
      movedFrom: r.movedFrom,
      movedTo: r.movedTo,
      arrayKey: r.arrayKey,
      arrayKeyValue: r.arrayKeyValue,
      reasonSummary: r.reasonSummary || '',
      severity: r.severity || 'low',
      renameCandidate: r.renameCandidate || null,
      impactCount: r.impactCount || 0,
      impactRefs: r.impactRefs || []
    });
  }
  const byType = { added: 0, removed: 0, changed: 0, moved: 0 };
  diffRows.forEach((row) => {
    if (row?.type === 'added') byType.added += 1;
    else if (row?.type === 'removed') byType.removed += 1;
    else byType.changed += 1;
    if (row?.moved) byType.moved += 1;
  });
  const sectionsMeta = (Object.entries(grouped) as Array<[string, any[]]>)
    .map(([sectionLabel, sectionRows]) => {
      const sectionKey = SECTION_DEFS.find((item) => item.label === sectionLabel || item.key === sectionLabel)?.key || sectionLabel;
      const sectionTypeSummary = { totalRows: sectionRows.length, diffCount: sectionRows.length, sameCount: 0, added: 0, removed: 0, changed: 0, moved: 0 };
      sectionRows.forEach((row: any) => {
        if (row?.type === 'added') sectionTypeSummary.added += 1;
        else if (row?.type === 'removed') sectionTypeSummary.removed += 1;
        else sectionTypeSummary.changed += 1;
        if (row?.moved) sectionTypeSummary.moved += 1;
      });
      return {
        sectionKey,
        sectionLabel: getSectionLabel(sectionKey),
        ...sectionTypeSummary
      };
    })
    .sort((a, b) => getSectionOrder(a.sectionKey) - getSectionOrder(b.sectionKey) || a.sectionLabel.localeCompare(b.sectionLabel));
  return {
    generatedAt: new Date().toISOString(),
    source: getBundleExportMeta(sourceBundle),
    target: getBundleExportMeta(targetBundle),
    summary: {
      diffCount: diffRows.length,
      sectionCount: sectionsMeta.length,
      byType
    },
    sectionsMeta,
    sections: grouped
  };
}

// ---------------------------------------------------------------------------
// HTML report export
// ---------------------------------------------------------------------------

export const DIFF_HTML_MAX_EXPORT_ROWS = 2000;

type DiffHtmlExportRowCategory = 'actualDiff' | 'displayOnly' | 'same';

type DiffHtmlExportCategoryCount = {
  total: number;
  rendered: number;
  omitted: number;
};

export type DiffHtmlExportRowSelectionSummary = {
  policy: 'actualDiff > displayOnly > same';
  limit: number;
  expandedRows: number;
  renderedRows: number;
  omittedRows: number;
  truncated: boolean;
  categories: Record<DiffHtmlExportRowCategory, DiffHtmlExportCategoryCount>;
};

/**
 * HTML レポートに収録する行を、実差分 → 表示専用の補助行 → 同一行の順に選ぶ。
 * 選択後は元の表示順へ戻すため、親子関係やセクション順は維持される。
 */
export function selectDiffHtmlRowsForExport(
  displayRows: any[],
  maxRows = DIFF_HTML_MAX_EXPORT_ROWS
): { rows: any[]; summary: DiffHtmlExportRowSelectionSummary } {
  const sourceRows = Array.isArray(displayRows) ? displayRows : [];
  const limit = Number.isFinite(maxRows)
    ? Math.max(0, Math.floor(maxRows))
    : DIFF_HTML_MAX_EXPORT_ROWS;
  const priority: DiffHtmlExportRowCategory[] = ['actualDiff', 'displayOnly', 'same'];
  const buckets: Record<DiffHtmlExportRowCategory, Array<{ row: any; index: number }>> = {
    actualDiff: [],
    displayOnly: [],
    same: []
  };

  sourceRows.forEach((row, index) => {
    const category: DiffHtmlExportRowCategory = row?._displayOnly
      ? 'displayOnly'
      : row?.type === 'same'
        ? 'same'
        : 'actualDiff';
    buckets[category].push({ row, index });
  });

  const selected: Array<{ row: any; index: number }> = [];
  const renderedCounts: Record<DiffHtmlExportRowCategory, number> = {
    actualDiff: 0,
    displayOnly: 0,
    same: 0
  };
  priority.forEach((category) => {
    const remaining = limit - selected.length;
    if (remaining <= 0) return;
    const picked = buckets[category].slice(0, remaining);
    selected.push(...picked);
    renderedCounts[category] = picked.length;
  });
  selected.sort((a, b) => a.index - b.index);

  const categorySummary = (category: DiffHtmlExportRowCategory): DiffHtmlExportCategoryCount => ({
    total: buckets[category].length,
    rendered: renderedCounts[category],
    omitted: buckets[category].length - renderedCounts[category]
  });
  const renderedRows = selected.length;
  const omittedRows = sourceRows.length - renderedRows;

  return {
    rows: selected.map((entry) => entry.row),
    summary: {
      policy: 'actualDiff > displayOnly > same',
      limit,
      expandedRows: sourceRows.length,
      renderedRows,
      omittedRows,
      truncated: omittedRows > 0,
      categories: {
        actualDiff: categorySummary('actualDiff'),
        displayOnly: categorySummary('displayOnly'),
        same: categorySummary('same')
      }
    }
  };
}

const DIFF_HTML_REVIEW_STATE_KIND = 'kintone-diff-review-state';
const DIFF_HTML_REVIEW_STATE_VERSION = 1;
const DIFF_HTML_REVIEW_STATE_MAX_BYTES = 2 * 1024 * 1024;

/**
 * レビュー状態の照合専用ハッシュ。暗号用途ではなく、同じ比較結果を再生成した際に
 * 順番依存の `_id` を使わず同じ行へ戻すための決定的な短縮値として使う。
 */
function hashDiffHtmlReviewText(text: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul((first ^ code) >>> 0, 0x01000193) >>> 0;
    second = Math.imul((second ^ code ^ index) >>> 0, 0x85ebca6b) >>> 0;
    second ^= second >>> 13;
  }
  return first.toString(16).padStart(8, '0') + (second >>> 0).toString(16).padStart(8, '0');
}

function diffHtmlReviewRowMaterial(row: any): Record<string, any> {
  const leftDefined = row?.left !== undefined;
  const rightDefined = row?.right !== undefined;
  const arrayKeyValueDefined = row?.arrayKeyValue !== undefined;
  return {
    version: DIFF_HTML_REVIEW_STATE_VERSION,
    sectionKey: String(row?.sectionKey || ''),
    path: String(row?.path || ''),
    type: String(row?.type || ''),
    moved: !!row?.moved,
    arrayKey: String(row?.arrayKey || ''),
    arrayKeyValueDefined,
    arrayKeyValue: arrayKeyValueDefined ? row.arrayKeyValue : null,
    leftDefined,
    left: leftDefined ? row.left : null,
    rightDefined,
    right: rightDefined ? row.right : null
  };
}

function prepareDiffHtmlReviewRows(rows: any[]): { rows: any[]; reviewKeys: string[] } {
  const occurrenceByHash = new Map<string, number>();
  const reviewKeys: string[] = [];
  const keyedRows = (rows || []).map((row) => {
    if (!row || row.type === 'same' || row._displayOnly) return row;
    const hash = hashDiffHtmlReviewText(stableStringify(diffHtmlReviewRowMaterial(row)));
    const occurrence = (occurrenceByHash.get(hash) || 0) + 1;
    occurrenceByHash.set(hash, occurrence);
    const reviewKey = `review-v${DIFF_HTML_REVIEW_STATE_VERSION}-${hash}-${occurrence}`;
    reviewKeys.push(reviewKey);
    return { ...row, _reviewKey: reviewKey };
  });
  return { rows: keyedRows, reviewKeys };
}

/**
 * diffOnly の差分行に、レポートUIで使用しない主観的な補助情報を収録しない。
 * left/right の実データ内に同名キーが存在する可能性があるため、行自身と表示用子行だけを対象にする。
 */
function stripDiffHtmlSubjectiveRowMetadata(row: any): any {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const { severity: _severity, impactSummary: _impactSummary, __childRows, ...rest } = row;
  if (!Array.isArray(__childRows)) return rest;
  return {
    ...rest,
    __childRows: __childRows.map(stripDiffHtmlSubjectiveRowMetadata)
  };
}

function buildDiffHtmlReviewFingerprint(context: Record<string, any>, reviewKeys: string[]): string {
  const material = stableStringify({
    version: DIFF_HTML_REVIEW_STATE_VERSION,
    source: context.source,
    target: context.target,
    scopes: context.scopes,
    exportMode: context.exportMode,
    exportContentMode: context.exportContentMode,
    incompleteComparison: !!context.incompleteComparison,
    truncated: !!context.truncated,
    rowSelection: context.rowSelection,
    reviewKeys: [...reviewKeys].sort()
  });
  return `report-v${DIFF_HTML_REVIEW_STATE_VERSION}-${hashDiffHtmlReviewText(material)}`;
}

export function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys, options: any = {}) {
  // 既存の直接呼び出しは後方互換のため比較設定込みとして扱う。実際のUI経由では
  // 必ず exportContentMode を渡し、全設定スナップショットを収録しない diffOnly を既定にする。
  const exportContentMode = options.exportContentMode === 'diffOnly' ? 'diffOnly' : 'withCompared';
  const includesComparedContent = shouldIncludeComparedContent(exportContentMode);
  const withSameSections = (() => {
    const baseRows = Array.isArray(rows)
      ? rows.filter((row) => includesComparedContent || row?.type !== 'same').map((row) => row && typeof row === 'object'
        ? {
            ...row,
            left: sanitizeReportRowValue(row, row.left),
            right: sanitizeReportRowValue(row, row.right),
            ...(isSensitiveSameDiffRow(row) ? { sensitiveValueRedacted: true } : {})
          }
        : row)
      : [];
    // diffOnly は「差分行のみ」の出力なので、生セクションから同一行を合成しない。
    const scopeList = includesComparedContent && Array.isArray(scopes) ? scopes.filter(Boolean) : [];
    if (!scopeList.length || !sourceBundle?.sections || !targetBundle?.sections) return baseRows;
    const issueSectionSet = new Set((Array.isArray(options.fetchIssues) ? options.fetchIssues : [])
      .map((issue) => issue?.sectionKey)
      .filter(Boolean));
    const hasEngineCompletionInfo = Object.prototype.hasOwnProperty.call(options, 'truncation');
    const isCompleteExportRange = String(options.exportMode || 'all') === 'all';
    const truncatedSectionSet = new Set((Array.isArray(options.truncation?.sections) ? options.truncation.sections : [])
      .map((item) => item?.sectionKey)
      .filter(Boolean));
    const rowSectionSet = new Set(baseRows.map((row) => row?.sectionKey).filter(Boolean));
    const presetState = options.normalizationState || ({} as any);
    for (const sec of scopeList) {
      if (rowSectionSet.has(sec) || issueSectionSet.has(sec) || truncatedSectionSet.has(sec)) continue;
      // 選択行・表示中などの部分出力では、行が無いことを「同一」の根拠にできない。
      if (hasEngineCompletionInfo && !isCompleteExportRange) continue;
      const sourceSec = sourceBundle.sections?.[sec];
      const targetSec = targetBundle.sections?.[sec];
      if (!sourceSec || !targetSec) continue;
      const normalizedSource = normalizeSectionForCompare(sec, sourceSec, presetState);
      const normalizedTarget = normalizeSectionForCompare(sec, targetSec, presetState);
      // エンジン結果に行が無く、取得失敗・打ち切りにも該当しない scope は、
      // ignore/preprocess 適用後に同一と確定済み。判定情報のない直接呼出しだけ意味比較へフォールバックする。
      if (!hasEngineCompletionInfo && stableStringify(normalizedSource) !== stableStringify(normalizedTarget)) continue;
      const sectionLabel = (SECTION_DEFS.find((def) => def.key === sec) || ({} as any)).label || sec;
      const sameRow = {
        _id: `same:${sec}`,
        sectionKey: sec,
        section: sectionLabel,
        type: 'same',
        path: sec,
        severity: 'low'
      };
      baseRows.push({
        ...sameRow,
        left: sanitizeReportRowValue(sameRow, normalizedSource),
        right: sanitizeReportRowValue(sameRow, normalizedTarget),
        ...(isSensitiveSameDiffRow(sameRow) ? { sensitiveValueRedacted: true } : {})
      });
      rowSectionSet.add(sec);
    }
    return baseRows;
  })();
  const summary = summarizeRows(withSameSections);
  const sectionText = (scopes || []).map((k) => (SECTION_DEFS.find((d) => d.key === k)?.label || k)).join(', ');
  const sectionLabelMap = Object.fromEntries(SECTION_DEFS.map((d) => [d.key, d.label]));
  // 非フィールド行のエンティティ種別 → 日本語ラベル（enrich.ts と同期）
  const entityKindLabelMap: Record<string, string> = {
    view: 'ビュー', report: 'グラフ', state: 'ステータス', action: '遷移アクション',
    appAction: 'アクション', aclEntry: '権限エントリー', fieldAclEntry: 'フィールド権限',
    recordAclEntry: 'レコード権限', notification: '通知',
    perRecordNotification: 'レコード条件通知', reminderNotification: 'リマインダー通知',
    category: 'カテゴリ', plugin: 'プラグイン', jsCss: 'JS/CSS', layoutRow: 'レイアウト行'
  };
  // 差分一覧の見通しを良くするため、SUBTABLE 追加/削除行をテーブル内フィールド単位に、
  // 非フィールドのセクション全体追加/削除をエンティティ単位に、それぞれ事前展開する。
  const displayRows = expandSubtableRowsForDisplay(expandEntityRowsForDisplay(withSameSections));
  const exportSelection = selectDiffHtmlRowsForExport(displayRows);
  const exportRows = exportSelection.rows;
  // レポート表示専用の短い日本語見出し。値は複製せず、辞書で変換した場所・項目名だけを
  // 付与することで、diffOnly の収録範囲や機密値の扱いを変えない。
  const baseReportRows = exportRows.map((row) => {
    const decoded = decodeRow(row);
    if (!decoded) return row;
    const contextLabels = (decoded.whereChips || [])
      .filter((chip) => !chip.muted)
      .map((chip) => String(chip.label || '').trim())
      .filter(Boolean);
    const title = [...contextLabels, String(decoded.propLabel || '').trim()].filter(Boolean).join(' / ');
    return title ? { ...row, _reportDisplayTitle: title } : row;
  });
  const preparedReviewRows = prepareDiffHtmlReviewRows(baseReportRows);
  const reportRows = includesComparedContent
    ? preparedReviewRows.rows
    : preparedReviewRows.rows.map(stripDiffHtmlSubjectiveRowMetadata);
  const sensitiveDiffSections = [...new Set(exportRows
    .filter((row) => !row?._displayOnly && row?.type !== 'same' && ['customizeSettings', 'pluginSettings'].includes(String(row?.sectionKey || '')))
    .map((row) => String(row.sectionKey)))] as string[];
  const redactedSensitiveSections = [...new Set(exportRows
    .filter((row) => isSensitiveSameDiffRow(row))
    .map((row) => String(row.sectionKey || ''))
    .filter(Boolean))] as string[];
  const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
  const partialIssues = Array.isArray(options.partialIssues) ? options.partialIssues : [];
  const warning = options.warning || { threshold: 0, exceeded: false, total: withSameSections.length + fetchIssues.length };
  /** kintone-ui-component UMD / Kucs グローバルと一致させる */
  const KUC_REPORT_VERSION = '1.24.0';
  const engineTruncation = options.truncation || null;
  const actualDiffTruncation = hasIncompleteActualDiffTruncation(engineTruncation) ? engineTruncation : null;
  const engineTruncationSections = Array.isArray(actualDiffTruncation?.sections) ? actualDiffTruncation.sections : [];
  const partialTruncationSections = engineTruncationSections
    .filter((section: any) => diffTruncationScanStatusOf(section) === 'partial');
  const unscannedTruncationSections = engineTruncationSections
    .filter((section: any) => diffTruncationScanStatusOf(section) === 'unscanned');
  const completeKnownTruncationSections = engineTruncationSections
    .filter((section: any) => diffTruncationScanStatusOf(section) === 'complete' && knownOmittedDiffCount(section) > 0);
  const partialTruncationLabels = partialTruncationSections.map(diffTruncationSectionLabel);
  const unscannedTruncationLabels = unscannedTruncationSections
    .map(diffTruncationSectionLabel);
  const completeKnownTruncationLabels = completeKnownTruncationSections
    .map((section: any) => `${diffTruncationSectionLabel(section)}（${knownOmittedDiffCount(section)}件）`);
  const truncationRangeSummary = [
    partialTruncationLabels.length
      ? `部分走査・総件数不明（表示件数は下限）: ${partialTruncationLabels.join('、')}。`
      : '',
    unscannedTruncationLabels.length
      ? `未走査・件数不明: ${unscannedTruncationLabels.join('、')}。`
      : '',
    completeKnownTruncationLabels.length
      ? `走査完了・未収録件数既知: ${completeKnownTruncationLabels.join('、')}。`
      : ''
  ].filter(Boolean).join(' ');
  const diffNavRangeNote = !actualDiffTruncation
    ? ''
    : partialTruncationLabels.length && unscannedTruncationLabels.length
      ? '（部分走査・未走査を含む・総件数不明）'
      : partialTruncationLabels.length
        ? '（部分走査を含む・総件数不明）'
        : unscannedTruncationLabels.length
          ? '（未走査を含む・件数不明）'
          : '（比較範囲不完全）';
  const incompleteComparisonWarnings = [
    actualDiffTruncation
      ? `差分検出が上限 ${Number(actualDiffTruncation.diffLimit || 0)} 件で打ち切られています。未検出の差分が存在します。${truncationRangeSummary ? ` ${truncationRangeSummary}` : ''}`
      : '',
    fetchIssues.length
      ? `設定取得に ${fetchIssues.length} 件失敗しています。取得失敗セクションは比較できていません。`
      : '',
    partialIssues.length
      ? `JS/CSS等の本文取得に ${partialIssues.length} 件の未検証があります。該当項目は本文ではなく fileKey 等で比較されています。`
      : '',
    exportSelection.summary.truncated
      ? `HTML収録上限により表示用展開後の行が ${exportSelection.summary.omittedRows} 件省略されています。`
      : ''
  ].filter(Boolean);
  const visibleStateRenameNoticeCount = withSameSections.filter((row: any) => row?._stateRenameNotice).length;
  const bundledStateRenameNoticeCount = (Array.isArray(scopes) && scopes.includes('processSettings'))
    ? detectProcessStateRenames(
      sourceBundle?.sections?.processSettings,
      targetBundle?.sections?.processSettings
    ).size
    : 0;
  const stateRenameNoticeCount = Math.max(visibleStateRenameNoticeCount, bundledStateRenameNoticeCount);
  const canBuildReflectJson = includesComparedContent
    && incompleteComparisonWarnings.length === 0
    && stateRenameNoticeCount === 0;
  const reflectJsonBlockedReason = !includesComparedContent
    ? '差分行のみのレポートには比較設定が収録されていないため、反映JSONは作成できません'
    : stateRenameNoticeCount > 0
      ? 'プロセスの状態名変更を含むため、このレポートでは反映JSONを作成できません。プロセス管理はセクション全体を置き換えるAPIのため、状態名変更以外の選択にも改名が混入します。管理画面で手動確認してください'
      : canBuildReflectJson
        ? ''
        : '比較結果が不完全なため、反映JSONは作成できません。取得失敗や本文未検証、差分・HTML収録上限を解消して再比較してください';
  const normalizationState = options.normalizationState || ({} as any);
  const sourceExportMeta = getBundleExportMeta(sourceBundle);
  const targetExportMeta = getBundleExportMeta(targetBundle);
  const reportRowSelection = {
    ...exportSelection.summary,
    baseRows: withSameSections.length
  };
  const reviewStateFingerprint = buildDiffHtmlReviewFingerprint({
    source: {
      appId: sourceExportMeta.appId,
      guestId: sourceExportMeta.guestId,
      preview: sourceExportMeta.preview
    },
    target: {
      appId: targetExportMeta.appId,
      guestId: targetExportMeta.guestId,
      preview: targetExportMeta.preview
    },
    scopes: scopes || [],
    exportMode: options.exportMode || 'all',
    exportContentMode,
    incompleteComparison: incompleteComparisonWarnings.length > 0,
    truncated: exportSelection.summary.truncated,
    rowSelection: reportRowSelection
  }, preparedReviewRows.reviewKeys);
  const reportMeta = {
    generatedAt: new Date().toISOString(),
    scopes: scopes || [],
    sectionText,
    ignoreKeys: String(ignoreKeys || ''),
    exportMode: options.exportMode || 'all',
    exportLabel: options.exportLabel || '全差分',
    exportContentMode,
    exportContentLabel: options.exportContentLabel || getDiffExportContentLabel(exportContentMode),
    comparedContentIncluded: includesComparedContent,
    normalizationState,
    normalizationLabels: getActiveDiffNormalizationLabels(normalizationState),
    warning,
    source: sourceExportMeta,
    target: targetExportMeta,
    summary,
    fetchIssues,
    partialIssueCount: partialIssues.length,
    partialIssues,
    sensitiveDiffSections,
    redactedSensitiveSections,
    truncation: engineTruncation,
    incompleteComparison: incompleteComparisonWarnings.length > 0,
    comparisonWarnings: incompleteComparisonWarnings,
    reflectJsonAvailable: canBuildReflectJson,
    reflectJsonBlockedReason,
    totalRows: exportSelection.summary.expandedRows,
    renderedRows: exportSelection.summary.renderedRows,
    truncated: exportSelection.summary.truncated,
    rowSelection: reportRowSelection,
    reviewState: {
      kind: DIFF_HTML_REVIEW_STATE_KIND,
      version: DIFF_HTML_REVIEW_STATE_VERSION,
      maxBytes: DIFF_HTML_REVIEW_STATE_MAX_BYTES,
      fingerprint: reviewStateFingerprint,
      actionableRowCount: preparedReviewRows.reviewKeys.length
    }
  };
  const targetGuestId = String(reportMeta.target.guestId || '').trim();
  const targetPreviewApiPrefix = targetGuestId
    ? `/k/guest/${encodeURIComponent(targetGuestId)}/v1/preview`
    : '/k/v1/preview';
  const diffTotal = summary.added + summary.removed + summary.changed;
  const objectiveContentChangedCount = Math.max(0, summary.changed - summary.moved);
  const objectiveFactCards = [
    summary.added > 0
      ? `<article class="report-fact report-fact--added"><span>比較先のみに存在</span><strong>${summary.added}</strong><small>比較元にはありません</small></article>`
      : '',
    summary.removed > 0
      ? `<article class="report-fact report-fact--removed"><span>比較元のみに存在</span><strong>${summary.removed}</strong><small>比較先にはありません</small></article>`
      : '',
    objectiveContentChangedCount > 0
      ? `<article class="report-fact report-fact--changed"><span>両方に存在・内容が異なる</span><strong>${objectiveContentChangedCount}</strong><small>値または設定が異なります</small></article>`
      : '',
    summary.moved > 0
      ? `<article class="report-fact report-fact--moved"><span>並び順が異なる</span><strong>${summary.moved}</strong><small>内容とは別に集計</small></article>`
      : '',
    includesComparedContent && summary.same > 0
      ? `<article class="report-fact report-fact--same"><span>内容は同じ</span><strong>${summary.same}</strong><small>比較証跡として収録</small></article>`
      : ''
  ].filter(Boolean);
  const objectiveFactCardsHtml = objectiveFactCards.length
    ? objectiveFactCards.join('')
    : '<article class="report-fact report-fact--same report-fact--empty"><span>差分は見つかりませんでした</span><strong>0</strong><small>選択した設定は一致しています</small></article>';
  const formatAppDisplay = (meta: any) => {
    const id = String(meta?.appId || '-');
    const name = String(meta?.appName || '').trim();
    return name ? `${name}（アプリ ${id}）` : `アプリ ${id}`;
  };
  const sourceAppDisplay = formatAppDisplay(reportMeta.source);
  const targetAppDisplay = formatAppDisplay(reportMeta.target);
  // レポート内「詳細オプション」用の正規化プリセット定義。
  // 比較時に適用済み（applied）のものは行が既に除外されているため、レポート側では解除不可として表示する。
  const clientNormalizationPresets = Object.entries(DIFF_NORMALIZATION_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    sections: [...preset.sections],
    ignoreKeys: [...preset.ignoreKeys].map((k) => String(k).toLowerCase()),
    unorderedArrays: !!preset.unorderedArrays,
    applied: !!normalizationState[key]
  }));
  const advPresetChecksHtml = clientNormalizationPresets.map((preset) =>
    `<label class="chk adv-chk${preset.applied ? ' is-baked' : ''}"${preset.applied ? ' title="比較時に適用済みです（該当行はレポートに含まれていません）"' : ''}><input type="checkbox" data-preset-toggle="${esc(preset.key)}"${preset.applied ? ' checked disabled' : ''}> ${esc(preset.label)}を無視${preset.applied ? '<span class="adv-baked-tag">適用済</span>' : ''}</label>`
  ).join('');
  const appliedIgnoreTokens = [...new Set(String(reportMeta.ignoreKeys || '')
    .split(/[\n\r,、，;；]+/)
    .map((token) => token.trim())
    .filter(Boolean))];
  const appliedIgnoreSummary = appliedIgnoreTokens.length
    ? `比較時の無視キー ${appliedIgnoreTokens.length}件: ${appliedIgnoreTokens.join('、')}`
    : '比較時の無視キー 0件（なし）';
  const appliedNormalizationSummary = reportMeta.normalizationLabels.length
    ? `比較時の正規化 ${reportMeta.normalizationLabels.length}件: ${reportMeta.normalizationLabels.join('、')}`
    : '比較時の正規化 0件（なし）';
  const contentDisclosureHtml = includesComparedContent
    ? `<div class="report-content-disclosure report-content-disclosure--caution" data-content-disclosure="withCompared" role="note" aria-label="収録内容と反映方向"><strong>取扱注意: 比較設定込み</strong><span>比較設定・フィールド詳細・設定証跡JSONを収録しています。反映JSONは、比較元の設定値で比較先を上書きする方向です。${canBuildReflectJson ? '' : `反映JSONは利用できません。${esc(reflectJsonBlockedReason)}`}</span></div>`
    : '<div class="report-content-disclosure" data-content-disclosure="diffOnly" role="note" aria-label="収録内容の注意"><strong>差分行のみ（全設定は未収録）</strong><span>全設定スナップショットは収録していませんが、変更された差分行の比較元・比較先の値は収録しています。Excelにも同じ差分値が収録され、取得不完全時はエラー等の原文も含まれるため、共有前に内容を確認してください。</span></div>';
  const stateRenameSafetyNoticeHtml = !stateRenameNoticeCount
    ? ''
    : visibleStateRenameNoticeCount === stateRenameNoticeCount
      ? `<div class="warn">ℹ プロセスの状態名変更が ${stateRenameNoticeCount} 件あります。変更件数に含めていますが、プロセス管理はセクション全体を置き換えるAPIのため、このレポートでは反映JSON全体を無効にしています。管理画面で手動確認してください。</div>`
      : `<div class="warn">ℹ 比較設定全体でプロセスの状態名変更を ${stateRenameNoticeCount} 件検出しました。この出力範囲には ${visibleStateRenameNoticeCount} 件を収録しているため、画面の変更件数は出力範囲に含まれる改名だけを数えています。プロセス管理はセクション全体を置き換えるAPIのため、このレポートでは反映JSON全体を無効にしています。管理画面で手動確認してください。</div>`;
  const noticesHtml = [
    includesComparedContent && incompleteComparisonWarnings.length > 0 ? `<div class="warn"><b>⛔ 比較結果が不完全なため、反映JSONの選択・保存・コピーを無効にしています。</b> 比較元/比較先JSONは比較時の証跡として保存できます。</div>` : '',
    warning.threshold ? `<div class="warn">警告しきい値: ${warning.threshold} / 合計 ${warning.total}${warning.exceeded ? ' (超過)' : ''}</div>` : '',
    sensitiveDiffSections.length ? `<div class="warn">🔒 このHTMLには ${sensitiveDiffSections.map((key) => esc(sectionLabelMap[key] || key)).join('・')} の差分値（JS/CSS本文やプラグイン設定値を含む場合があります）が収録されています。共有先と保管場所を確認してください。取得時の内部キャッシュは重複収録していません。</div>` : '',
    redactedSensitiveSections.length ? `<div class="warn">🔒 ${redactedSensitiveSections.map((key) => esc(sectionLabelMap[key] || key)).join('・')} の同一行は、機密値を重複収録しないため値を省略しています。</div>` : '',
    stateRenameSafetyNoticeHtml,
    reportMeta.truncated ? `<div class="warn">${reportMeta.rowSelection.categories.actualDiff.omitted ? '⚠ <b>収録上限により実差分も省略されているため、このレポートは不完全です。</b> ' : '※ 実差分を優先して収録しました。'}表示用展開後 ${reportMeta.rowSelection.expandedRows} 件のうち ${reportMeta.rowSelection.renderedRows} 件を収録し、${reportMeta.rowSelection.omittedRows} 件を省略しました（省略: 実差分 ${reportMeta.rowSelection.categories.actualDiff.omitted} 件 / 表示専用の補助行 ${reportMeta.rowSelection.categories.displayOnly.omitted} 件 / 同一行 ${reportMeta.rowSelection.categories.same.omitted} 件）。</div>` : '',
    actualDiffTruncation ? `<div class="warn">⚠ 差分件数が上限（${actualDiffTruncation.diffLimit}件）に達したため、超過分は検出されておらずこのレポートに含まれていません。${partialTruncationLabels.length ? `<b>部分走査・総件数不明（表示件数は下限）: ${partialTruncationLabels.map((label) => esc(label)).join('・')}。</b>` : ''}${unscannedTruncationLabels.length ? `<b>未走査・件数不明: ${unscannedTruncationLabels.map((label) => esc(label)).join('・')}。</b>` : ''}${completeKnownTruncationLabels.length ? `<b>走査完了・未収録件数既知: ${completeKnownTruncationLabels.map((label) => esc(label)).join('・')}。</b>` : ''}<b>このレポートは不完全です。</b>無視キーやセクション絞り込みで差分を減らして再比較してください。</div>` : '',
    engineTruncation && !actualDiffTruncation && Number(engineTruncation.droppedSame || 0) > 0
      ? `<div class="warn">ℹ 同一証跡は上限 ${Number(engineTruncation.sameLimit || 0)} 件まで収録し、${Number(engineTruncation.droppedSame || 0)} 件を省略しました。実差分の検出結果は完全です。</div>`
      : '',
    partialIssues.length ? `<div class="warn">⚠ <b>本文未検証 ${partialIssues.length}件</b> — JS/CSS等の本文を取得できなかったため、該当項目は本文ではなく fileKey 等で比較しています。${partialIssues.map((issue) => `<div class="msg">${esc(issue.section || issue.sectionKey || '-')} / ${esc(getIssueSideLabel(issue.side))}: ${esc(issue.message || issue.reason || '本文を取得できませんでした')}</div>`).join('')}</div>` : '',
    fetchIssues.length ? `<details class="issue-box">
          <summary>API取得失敗 ${fetchIssues.length}件</summary>
          <table>
            <thead><tr><th style="width:200px">セクション</th><th style="width:90px">対象</th><th>内容</th></tr></thead>
            <tbody>${fetchIssues.map((issue) => `<tr><td>${esc(issue.section || issue.sectionKey || '-')}</td><td>${esc(getIssueSideLabel(issue.side))}</td><td><div class="msg">${esc(issue.message || '-')}</div></td></tr>`).join('')}</tbody>
          </table>
        </details>` : ''
  ].filter(Boolean).join('');
  const reflectJsonDisabledAttrs = canBuildReflectJson
    ? ''
    : ` disabled aria-disabled="true" title="${esc(reflectJsonBlockedReason)}"`;
  const comparedContentModeNote = includesComparedContent
    ? (canBuildReflectJson
      ? '比較設定込み（取扱注意・反映JSONを利用可能）'
      : stateRenameNoticeCount > 0
        ? '比較設定込み（取扱注意・状態名変更の安全対策により反映JSONは無効）'
        : '比較設定込み（取扱注意・比較不完全のため反映JSONは無効）')
    : '差分行のみ（全設定は未収録）';

  // 比較設定込みを明示した場合だけ、レポート単体の設定JSON・フィールド詳細・
  // 反映JSON作成に必要な生セクションを埋め込む。diffOnly では空値だけを埋め込み、
  // 差分行の left/right 以外から設定本文が漏れないようにする。
  const pickSectionsForReport = (bundle: any) => {
    const out: any = {};
    if (!includesComparedContent) return out;
    (Array.isArray(scopes) ? scopes : []).forEach((key) => {
      if (bundle?.sections && bundle.sections[key] !== undefined) {
        out[key] = sanitizeReportSectionValue(key, bundle.sections[key]);
      }
    });
    return out;
  };
  const srcSectionsForReport = pickSectionsForReport(sourceBundle);
  const tgtSectionsForReport = pickSectionsForReport(targetBundle);
  const srcFieldProps = (() => {
    const s = srcSectionsForReport.fieldSettings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
    if (s.properties && typeof s.properties === 'object' && !Array.isArray(s.properties)) return s.properties;
    return s;
  })();
  const tgtFieldProps = (() => {
    const s = tgtSectionsForReport.fieldSettings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
    if (s.properties && typeof s.properties === 'object' && !Array.isArray(s.properties)) return s.properties;
    return s;
  })();
  const srcLayoutRows = includesComparedContent ? (sourceBundle?.sections?.layoutSettings?.layout || []) : [];
  const tgtLayoutRows = includesComparedContent ? (targetBundle?.sections?.layoutSettings?.layout || []) : [];

  const logicScript = `
(() => {
  const REPORT_ROWS = ${safeJsonForScript(reportRows)};
  const ROW_SEARCH_TEXT_CACHE = new WeakMap();
  const REPORT_SEARCH_DEBOUNCE_MS = 150;
  const SECTION_LABEL_MAP = ${safeJsonForScript(sectionLabelMap)};
  const ENTITY_KIND_LABEL_MAP = ${safeJsonForScript(entityKindLabelMap)};
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const REVIEW_STATE_KIND = String(REPORT_META.reviewState.kind || '');
  const REVIEW_STATE_VERSION = Number(REPORT_META.reviewState.version || 0);
  const REVIEW_STATE_MAX_BYTES = Number(REPORT_META.reviewState.maxBytes || ${DIFF_HTML_REVIEW_STATE_MAX_BYTES});
  const REVIEW_STATE_FINGERPRINT = String(REPORT_META.reviewState.fingerprint || '');
  const HAS_COMPARED_CONTENT = ${includesComparedContent ? 'true' : 'false'};
  const CAN_BUILD_REFLECT_JSON = !!REPORT_META.reflectJsonAvailable;
  const REFLECT_JSON_BLOCK_REASON = String(REPORT_META.reflectJsonBlockedReason || '反映JSONを作成できません');
  const DIFF_NAV_RANGE_NOTE = ${safeJsonForScript(diffNavRangeNote)};
  const TARGET_PREVIEW_API_PREFIX = ${safeJsonForScript(targetPreviewApiPrefix)};
  const NORMALIZATION_PRESETS = ${safeJsonForScript(clientNormalizationPresets)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const ACTIVE_TAB_KEY = '${TOOL_ID}:diffReportActiveTab';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();
  let typeFilterValue = 'all';
  let sectionFilterValue = 'all';
  let diffSortValue = 'standard';
  let focusModeEnabled = false;
  let compactDensityEnabled = false;
  let mobileToolbarExpanded = false;
  // 表示視点（both=左右比較 / source=比較元のみ / target=比較先のみ）
  let viewSideValue = 'both';
  // レポート内「詳細オプション」の状態（表示のみの絞り込み。比較のやり直しは行わない）
  const activePresetKeys = new Set();
  let extraIgnoreRules = null;
  const expandedVals = new Set();
  const sameOpen = new Set();
  const KUC_SEMVER = '${KUC_REPORT_VERSION}';
  const FIELD_PROPS_SRC = ${safeJsonForScript(srcFieldProps)};
  const FIELD_PROPS_TGT = ${safeJsonForScript(tgtFieldProps)};
  const SOURCE_SECTIONS = ${safeJsonForScript(srcSectionsForReport)};
  const TARGET_SECTIONS = ${safeJsonForScript(tgtSectionsForReport)};
  const LAYOUT_ROWS_SRC = ${safeJsonForScript(srcLayoutRows)};
  const LAYOUT_ROWS_TGT = ${safeJsonForScript(tgtLayoutRows)};
  const FLAT_FIELD_PROPS_SRC = collectFlatFieldMap(FIELD_PROPS_SRC);
  const FLAT_FIELD_PROPS_TGT = collectFlatFieldMap(FIELD_PROPS_TGT);
  let activeFieldCode = '';
  let detailModalOpen = false;
  let fieldDetailReturnFocus = null;
  const reportMemory = new Map();
  // 確認済みチェック（このレポートを開いている間だけ保持）
  const reviewedKeys = new Set();
  // 反映JSON作成用の選択状態（差分行キー → 行 / フィールドコード）
  const selectedRows = new Map();
  const selectedFieldCodes = new Set();
  // フィールド単位ビューの種別絞り込み
  let fieldStatusFilterValue = 'all';
  // 表示中の行キー → 行データ（コピー・確認チェックの参照用）
  const rowLookup = new Map();
  // j/k キーによる差分ジャンプの現在位置
  let diffFocusIndex = -1;
  let diffFocusKey = '';
  let diffNavigationTargets = [];
  let diffStickyFrame = 0;
  let mobileSidebarReturnFocus = null;
  let mobileSidebarScrollY = 0;
  let reportSearchTimer = 0;
  let reportSearchFrame = 0;
  let searchCompositionActive = false;

  function isRawJsonMode() {
    const el = document.getElementById('rawJson');
    return !!(el && el.checked);
  }

  function showToast(message) {
    let el = document.getElementById('reportToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'reportToast';
      el.className = 'report-toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-atomic', 'true');
      const host = document.querySelector('.settings-shell') || document.body;
      host.appendChild(el);
    }
    el.textContent = String(message || '');
    el.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => el.classList.remove('is-visible'), 2200);
  }

  function copyTextToClipboard(text, doneMessage) {
    const value = String(text == null ? '' : text);
    const fallback = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast(doneMessage || 'コピーしました');
      } catch (e) {
        showToast('コピーに失敗しました');
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value)
        .then(() => showToast(doneMessage || 'コピーしました'))
        .catch(fallback);
    } else {
      fallback();
    }
  }

  function isActionableReviewRow(row) {
    return !!row && row.type !== 'same' && !row._displayOnly;
  }

  function reviewProgressOf(rows) {
    const actionable = (rows || []).filter(isActionableReviewRow);
    const reviewed = actionable.filter((row) => reviewedKeys.has(rowStateKey(row))).length;
    const total = actionable.length;
    const percent = total ? Math.round((reviewed / total) * 100) : 100;
    return { actionable, reviewed, total, pending: Math.max(0, total - reviewed), percent };
  }

  function syncReviewedStat(rows) {
    const progress = reviewProgressOf(rows || getDetailFilteredRows());
    const reviewedEl = document.getElementById('stat-reviewed');
    if (reviewedEl) reviewedEl.textContent = String(progress.reviewed);
    const valueEl = document.getElementById('sidebarReviewProgressValue');
    if (valueEl) valueEl.textContent = progress.reviewed + ' / ' + progress.total + '（' + progress.percent + '%）';
    const barEl = document.getElementById('sidebarReviewProgressBar');
    if (barEl) {
      barEl.setAttribute('aria-valuemax', String(progress.total));
      barEl.setAttribute('aria-valuenow', String(progress.reviewed));
      barEl.setAttribute('aria-valuetext', '確認済み ' + progress.reviewed + '件 / 全 ' + progress.total + '件（' + progress.percent + '%）');
    }
    const fillEl = document.getElementById('sidebarReviewProgressFill');
    if (fillEl) fillEl.style.width = progress.percent + '%';
    return progress;
  }

  function syncSelectedStat() {
    const el = document.getElementById('stat-selected');
    if (el) el.textContent = String(selectedRows.size + selectedFieldCodes.size);
  }

  function preferredScrollBehavior() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  function syncDiffStickyOffset() {
    const toolbar = document.querySelector('#main .diff-toolbar');
    const offset = toolbar ? Math.ceil(toolbar.getBoundingClientRect().height + 8) : 0;
    document.documentElement.style.setProperty('--diff-toolbar-offset', offset + 'px');
  }

  function scheduleDiffStickyOffsetSync() {
    if (diffStickyFrame) window.cancelAnimationFrame(diffStickyFrame);
    diffStickyFrame = window.requestAnimationFrame(() => {
      diffStickyFrame = 0;
      syncDiffStickyOffset();
    });
  }

  function syncDiffNavPosition() {
    const currentIndex = diffNavigationTargets.findIndex((target) => target.key === diffFocusKey);
    diffFocusIndex = currentIndex;
    if (currentIndex < 0) diffFocusKey = '';
    const position = document.getElementById('diffNavPosition');
    if (position) {
      position.textContent = '現在位置 ' + (currentIndex >= 0 ? currentIndex + 1 : 0) + ' / ' + diffNavigationTargets.length + DIFF_NAV_RANGE_NOTE;
    }
    const focusPosition = document.getElementById('focusContextPosition');
    if (focusPosition) {
      focusPosition.textContent = (currentIndex >= 0 ? currentIndex + 1 : 0) + ' / ' + diffNavigationTargets.length;
    }
    document.querySelectorAll('[data-diff-nav]').forEach((btn) => {
      const direction = btn.getAttribute('data-diff-nav');
      const atStart = currentIndex === 0 && direction === 'prev';
      const atEnd = currentIndex === diffNavigationTargets.length - 1 && direction === 'next';
      btn.disabled = diffNavigationTargets.length === 0 || atStart || atEnd;
    });
  }

  function focusDiffRow(key, options) {
    const opts = options || {};
    let active = null;
    document.querySelectorAll('#main [data-diff-row-key]').forEach((row) => {
      const isCurrent = row.getAttribute('data-diff-row-key') === key;
      row.classList.toggle('drow--focus', isCurrent);
      row.setAttribute('aria-current', isCurrent ? 'true' : 'false');
      if (isCurrent) active = row;
    });
    if (!active) return false;
    if (opts.focus !== false) {
      try { active.focus({ preventScroll: true }); } catch (e) { active.focus(); }
    }
    if (opts.scroll !== false) {
      active.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'center' });
    }
    return true;
  }

  function moveDiffFocus(delta) {
    if (!diffNavigationTargets.length) {
      diffFocusIndex = -1;
      diffFocusKey = '';
      syncDiffNavPosition();
      return;
    }
    const currentIndex = diffNavigationTargets.findIndex((target) => target.key === diffFocusKey);
    const nextIndex = currentIndex < 0
      ? (delta < 0 ? diffNavigationTargets.length - 1 : 0)
      : Math.min(diffNavigationTargets.length - 1, Math.max(0, currentIndex + delta));
    if (currentIndex >= 0 && nextIndex === currentIndex) {
      showToast(delta < 0 ? '先頭の差分です' : '末尾の差分です');
      syncDiffNavPosition();
      return;
    }
    const target = diffNavigationTargets[nextIndex];
    diffFocusIndex = nextIndex;
    diffFocusKey = target.key;
    const expanded = collapsed.delete(target.sectionKey);
    if (expanded) render();
    syncDiffNavPosition();
    requestAnimationFrame(() => {
      focusDiffRow(target.key);
      syncDiffNavPosition();
    });
  }

  function downloadTextFile(filename, text, mime) {
    const blob = new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function reviewStateAllowedKeys() {
    return new Set(REPORT_ROWS
      .filter((row) => row && row.type !== 'same' && !row._displayOnly && row._reviewKey)
      .map((row) => String(row._reviewKey)));
  }

  function setReviewStateStatus(message, isError) {
    const el = document.getElementById('reviewStateStatus');
    if (el) {
      el.textContent = String(message || '');
      el.classList.toggle('is-error', !!isError);
    }
    if (message) showToast(message);
  }

  function buildReviewStatePayload() {
    const allowedKeys = reviewStateAllowedKeys();
    const savedKeys = [...reviewedKeys]
      .filter((key) => allowedKeys.has(key))
      .sort();
    return {
      kind: REVIEW_STATE_KIND,
      version: REVIEW_STATE_VERSION,
      savedAt: new Date().toISOString(),
      reportFingerprint: REVIEW_STATE_FINGERPRINT,
      report: {
        generatedAt: REPORT_META.generatedAt || '',
        source: {
          appId: REPORT_META.source.appId || '',
          guestId: REPORT_META.source.guestId || '',
          preview: !!REPORT_META.source.preview
        },
        target: {
          appId: REPORT_META.target.appId || '',
          guestId: REPORT_META.target.guestId || '',
          preview: !!REPORT_META.target.preview
        },
        actionableRowCount: allowedKeys.size,
        incompleteComparison: !!REPORT_META.incompleteComparison,
        truncated: !!REPORT_META.truncated
      },
      reviewedKeys: savedKeys
    };
  }

  function saveReviewStateJson() {
    try {
      const payload = buildReviewStatePayload();
      const stamp = String(payload.savedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'review';
      const sourceId = String(REPORT_META.source.appId || '-');
      const targetId = String(REPORT_META.target.appId || '-');
      downloadTextFile('差分レビュー状態_' + sourceId + '_vs_' + targetId + '_' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
      setReviewStateStatus('レビュー状態JSONを保存しました（確認済み ' + payload.reviewedKeys.length + '件）', false);
    } catch (error) {
      setReviewStateStatus('レビュー状態JSONの保存に失敗しました', true);
    }
  }

  function readReviewStateFile(file) {
    if (file && typeof file.text === 'function') return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('ファイルを読み込めませんでした'));
      reader.readAsText(file, 'utf-8');
    });
  }

  function isReviewStateObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function validateReviewStatePayload(payload) {
    if (!isReviewStateObject(payload)) throw new Error('レビュー状態JSONの形式が正しくありません');
    if (payload.kind !== REVIEW_STATE_KIND) throw new Error('レビュー状態JSONの種類が正しくありません');
    if (payload.version !== REVIEW_STATE_VERSION) throw new Error('対応していないレビュー状態JSONのバージョンです');
    if (payload.reportFingerprint !== REVIEW_STATE_FINGERPRINT) {
      throw new Error('別の差分レポートのレビュー状態なので読み込めません');
    }
    if (!isReviewStateObject(payload.report)) throw new Error('レビュー状態JSONのレポート情報がありません');
    if (!Array.isArray(payload.reviewedKeys)) throw new Error('レビュー状態JSONの確認済み一覧が正しくありません');

    const allowedKeys = reviewStateAllowedKeys();
    if (Number(payload.report.actionableRowCount) !== allowedKeys.size) {
      throw new Error('レビュー対象件数が現在の差分レポートと一致しません');
    }
    if (payload.reviewedKeys.length > allowedKeys.size) {
      throw new Error('確認済み件数が現在のレビュー対象件数を超えています');
    }

    const nextReviewedKeys = new Set();
    payload.reviewedKeys.forEach((key) => {
      if (typeof key !== 'string' || !key || key.length > 128) {
        throw new Error('レビュー状態JSONに不正な行キーがあります');
      }
      if (!allowedKeys.has(key)) {
        throw new Error('レビュー状態JSONに現在の差分レポートにはない行が含まれています');
      }
      if (nextReviewedKeys.has(key)) {
        throw new Error('レビュー状態JSONに重複した行があります');
      }
      nextReviewedKeys.add(key);
    });
    return nextReviewedKeys;
  }

  async function loadReviewStateJson(file) {
    if (!file) return;
    if (Number(file.size || 0) > REVIEW_STATE_MAX_BYTES) {
      setReviewStateStatus('レビュー状態JSONは2MB以下のファイルを選択してください', true);
      return;
    }
    try {
      const text = await readReviewStateFile(file);
      if (text.length > REVIEW_STATE_MAX_BYTES) {
        throw new Error('レビュー状態JSONは2MB以下のファイルを選択してください');
      }
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw new Error('レビュー状態JSONを解析できませんでした');
      }
      // ここまで現在状態は変更せず、全項目の検証が完了してから一度に置き換える。
      const nextReviewedKeys = validateReviewStatePayload(payload);
      reviewedKeys.clear();
      nextReviewedKeys.forEach((key) => reviewedKeys.add(key));
      render();
      if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
      syncReviewedStat(getDetailFilteredRows());
      setReviewStateStatus('レビュー状態JSONを読み込みました（確認済み ' + nextReviewedKeys.size + '件）', false);
    } catch (error) {
      const message = error && error.message ? error.message : 'レビュー状態JSONの読込に失敗しました';
      setReviewStateStatus(message, true);
    }
  }

  // 現在の絞り込み条件（詳細オプション・検索・種別チップ）で表示される差分行を平坦に返す
  function collectVisibleDiffRowsForExport() {
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const hideReviewed = !!(document.getElementById('hideReviewed') || {}).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    return getDetailFilteredRows().filter((row) => {
      if (hideSame && row.type === 'same') return false;
      if (hideReviewed && row.type !== 'same' && reviewedKeys.has(rowStateKey(row))) return false;
      return rowMatches(row, keyword);
    }).filter(sectionFilterMatches).filter(typeFilterMatches);
  }

  function csvEscape(v) {
    const raw = String(v == null ? '' : v);
    // Excel 等で CSV を開いた際、先頭空白の後に = + - @ が続く値も式として
    // 評価され得るため、文字列として扱われるよう先頭に apostrophe を付ける。
    const s = /^[\\t\\r\\n ]*[=+\\-@]/.test(raw) ? "'" + raw : raw;
    if (/[",\\n\\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportVisibleRowsAsCsv() {
    const rows = collectVisibleDiffRowsForExport();
    if (!rows.length) {
      showToast('出力対象の行がありません');
      return;
    }
    const header = ['セクション', '種別', 'パス', '比較元', '比較先', '確認済み'];
    const lines = [header.map(csvEscape).join(',')];
    rows.forEach((row) => {
      lines.push([
        SECTION_LABEL_MAP[row.sectionKey || ''] || row.section || row.sectionKey || '',
        diffTypeLabel(row.type, row.moved),
        row.path || '',
        safeText(row.left),
        safeText(row.right),
        reviewedKeys.has(rowStateKey(row)) ? '済' : ''
      ].map(csvEscape).join(','));
    });
    const stamp = String(REPORT_META.generatedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'report';
    downloadTextFile('差分一覧_' + stamp + '.csv', '\\ufeff' + lines.join('\\r\\n'), 'text/csv');
    showToast('CSVを保存しました（' + rows.length + '行）');
  }

  function mdCell(v, maxLen) {
    const limit = maxLen || 200;
    let s = String(v == null ? '' : v);
    if (s.length > limit) s = s.slice(0, limit) + '…';
    return s.replace(/\\|/g, '\\\\|').replace(/\\r?\\n/g, '<br>');
  }

  function copyVisibleRowsAsMarkdown() {
    const rows = collectVisibleDiffRowsForExport();
    if (!rows.length) {
      showToast('出力対象の行がありません');
      return;
    }
    const bySection = new Map();
    rows.forEach((row) => {
      const key = row.sectionKey || row.section || '未分類';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(row);
    });
    const parts = ['# 設定差分（アプリ ' + (REPORT_META.source.appId || '-') + ' → アプリ ' + (REPORT_META.target.appId || '-') + '）', ''];
    bySection.forEach((list, key) => {
      parts.push('## ' + (SECTION_LABEL_MAP[key] || key) + '（' + list.length + '件）', '');
      parts.push('| 種別 | パス | 比較元 | 比較先 |');
      parts.push('| --- | --- | --- | --- |');
      list.forEach((row) => {
        parts.push('| ' + mdCell(diffTypeLabel(row.type, row.moved), 20)
          + ' | ' + mdCell(row.path || '', 160)
          + ' | ' + mdCell(safeText(row.left), 200)
          + ' | ' + mdCell(safeText(row.right), 200) + ' |');
      });
      parts.push('');
    });
    copyTextToClipboard(parts.join('\\n'), 'Markdownをコピーしました（' + rows.length + '行）');
  }

  function safeStorageGet(key) {
    return reportMemory.has(key) ? reportMemory.get(key) : null;
  }

  function safeStorageSet(key, value) {
    reportMemory.set(key, String(value));
  }

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeText(v) {
    if (v === undefined) return '（未定義）';
    const out = JSON.stringify(v, null, 2);
    return out == null ? String(v) : out;
  }

  function diffTypeLabel(type, moved) {
    const map = { added: '追加', removed: '削除', changed: '変更', moved: '移動', same: '同一' };
    const base = map[type] || String(type || '-');
    return moved && type !== 'moved' ? base + '(移動)' : base;
  }

  function rowExistenceLabel(row) {
    if (row && row.type === 'added') return '比較先のみに存在';
    if (row && row.type === 'removed') return '比較元のみに存在';
    return '両方に存在';
  }

  function rowDifferenceLabels(row) {
    if (row && (row.type === 'added' || row.type === 'removed')) return ['片側のみ'];
    if (row && row.type === 'same') return ['内容は同じ'];
    if (row && (row.moved || row.type === 'moved')) return ['並び順が異なる'];
    const labels = [];
    if (row && row.type === 'changed') labels.push('内容が異なる');
    return labels.length ? labels : ['差分あり'];
  }

  function rowDifferenceLabel(row) {
    return rowDifferenceLabels(row).join('・');
  }

  function renderRowFacts(row) {
    const typeClass = row && row.type === 'same'
      ? 'same'
      : row && row.type === 'added'
        ? 'added'
        : row && row.type === 'removed'
          ? 'removed'
          : 'changed';
    return '<span class="fact-chip fact-chip--existence fact-chip--' + typeClass + '" data-row-existence="' + escHtml(rowExistenceLabel(row)) + '">' + escHtml(rowExistenceLabel(row)) + '</span>'
      + rowDifferenceLabels(row).map((label) => '<span class="fact-chip fact-chip--difference fact-chip--' + typeClass + '" data-row-difference="' + escHtml(label) + '">' + escHtml(label) + '</span>').join('');
  }

  function issueSideLabel(side) {
    if (side === 'source') return '比較元';
    if (side === 'target') return '比較先';
    if (side === 'both') return '両方';
    return String(side || '-');
  }

  function rowSearchText(row) {
    if (!row || typeof row !== 'object') return '';
    const cached = ROW_SEARCH_TEXT_CACHE.get(row);
    if (cached !== undefined) return cached;
    const text = [
      row.section || '',
      row.sectionKey || '',
      row.path || '',
      row.reasonSummary || '',
      row.renameCandidate ? (row.renameCandidate.fromCode || '') + ' ' + (row.renameCandidate.toCode || '') : '',
      ...((row.impactRefs || []).map((ref) => (ref.section || ref.sectionKey || '') + ' ' + (ref.kind || '') + ' ' + (ref.label || '') + ' ' + (ref.path || ''))),
      safeText(row.left),
      safeText(row.right)
    ].join('\\n').toLowerCase();
    ROW_SEARCH_TEXT_CACHE.set(row, text);
    return text;
  }

  function rowMatches(row, keyword) {
    if (!keyword) return true;
    return rowSearchText(row).includes(keyword);
  }

  // ---- 詳細オプション（無視キー / 正規化プリセット）による表示絞り込み ----
  // 差分エンジンの isIgnoredPath と同じ判定（キー・パス・ワイルドカード）を
  // レポート内で再現し、出力済みの行を後から非表示にできるようにする。

  function normIgnoreToken(token) {
    return String(token == null ? '' : token)
      .replace(/[\\u200b\\u200c\\u200d\\ufeff]/g, '')
      .replace(/^[\\s\\u3000]+|[\\s\\u3000]+$/g, '')
      .toLowerCase();
  }

  function trimIgnoreToken(token) {
    return String(token == null ? '' : token)
      .replace(/[\\u200b\\u200c\\u200d\\ufeff]/g, '')
      .replace(/^[\\s\\u3000]+|[\\s\\u3000]+$/g, '');
  }

  function decodeExactIgnorePathRule(token) {
    const raw = trimIgnoreToken(token);
    if (raw.slice(0, 5).toLowerCase() !== 'path:') return null;
    try {
      return trimIgnoreToken(decodeURIComponent(raw.slice(5))) || null;
    } catch (e) {
      return null;
    }
  }

  function compileIgnoreWildcard(token) {
    const escaped = token.replace(/[.+?^\${}()|[\\]\\\\]/g, '\\\\$&').replace(/\\*/g, '.*');
    return new RegExp('^' + escaped + '$');
  }

  function parseExtraIgnoreRules(text) {
    const keySet = [];
    const pathSet = [];
    const exactPathSet = [];
    const keyPatterns = [];
    const pathPatterns = [];
    String(text || '')
      .split(/[\\n\\r,\\u3001\\uff0c;\\uff1b]+/)
      .map(trimIgnoreToken)
      .filter(Boolean)
      .forEach((rawToken) => {
        const exactPath = decodeExactIgnorePathRule(rawToken);
        if (exactPath) {
          exactPathSet.push(exactPath);
          return;
        }
        const token = normIgnoreToken(rawToken);
        const isPath = token.indexOf('.') >= 0 || token.indexOf('[') >= 0;
        const cleaned = token;
        if (cleaned.indexOf('*') >= 0) {
          try {
            const re = compileIgnoreWildcard(cleaned);
            if (isPath) pathPatterns.push(re);
            else keyPatterns.push(re);
          } catch (e) { /* 不正なパターンは無視 */ }
          return;
        }
        if (isPath) pathSet.push(cleaned);
        else keySet.push(cleaned);
      });
    if (!keySet.length && !pathSet.length && !exactPathSet.length && !keyPatterns.length && !pathPatterns.length) return null;
    return { keySet, pathSet, exactPathSet, keyPatterns, pathPatterns };
  }

  function ignorePathLeafKey(path) {
    const m = String(path || '').match(/([^[.\\]]+)(?:\\[\\d+\\])?$/);
    return m ? m[1] : '';
  }

  function matchesIgnoreRules(rules, path) {
    if (!rules) return false;
    const exactPath = trimIgnoreToken(path);
    if (exactPath && rules.exactPathSet.indexOf(exactPath) >= 0) return true;
    const normalizedPath = normIgnoreToken(path);
    if (!normalizedPath) return false;
    if (rules.pathSet.indexOf(normalizedPath) >= 0) return true;
    for (const re of rules.pathPatterns) { if (re.test(normalizedPath)) return true; }
    const leaf = ignorePathLeafKey(normalizedPath);
    if (!leaf) return false;
    if (rules.keySet.indexOf(leaf) >= 0) return true;
    for (const re of rules.keyPatterns) { if (re.test(leaf)) return true; }
    return false;
  }

  function pathPropTokens(path) {
    const out = [];
    const re = /([^[.\\]]+)/g;
    let m;
    const s = String(path || '');
    while ((m = re.exec(s)) !== null) {
      if (!/^\\d+$/.test(m[1])) out.push(m[1]);
    }
    return out;
  }

  function presetSuppressesRow(preset, row) {
    if (preset.sections.indexOf(String(row.sectionKey || '')) < 0) return false;
    // 順序無視系プリセット: 純粋な移動行（内容同一・位置のみ変化）を除外
    if (preset.unorderedArrays && row.moved && row.type === 'changed') return true;
    if (preset.ignoreKeys.length) {
      const tokens = pathPropTokens(row.path);
      for (const token of tokens) {
        if (preset.ignoreKeys.indexOf(normIgnoreToken(token)) >= 0) return true;
      }
    }
    return false;
  }

  function passesDetailFilters(row) {
    if (extraIgnoreRules && matchesIgnoreRules(extraIgnoreRules, row.path)) return false;
    if (activePresetKeys.size) {
      for (const preset of NORMALIZATION_PRESETS) {
        if (preset.applied || !activePresetKeys.has(preset.key)) continue;
        if (presetSuppressesRow(preset, row)) return false;
      }
    }
    return true;
  }

  function getDetailFilteredRows() {
    if (!extraIgnoreRules && !activePresetKeys.size) return REPORT_ROWS;
    return REPORT_ROWS.filter(passesDetailFilters);
  }

  function buildLineDiffOps(leftLines, rightLines) {
    const n = leftLines.length;
    const m = rightLines.length;
    if (n * m > LINE_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = leftLines[i] === rightLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && leftLines[i] === rightLines[j]) {
        ops.push({ type: 'same', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      const down = i < n ? dp[i + 1][j] : -1;
      const right = j < m ? dp[i][j + 1] : -1;
      const diag = (i < n && j < m) ? dp[i + 1][j + 1] : -1;
      if (i < n && j < m && diag >= down && diag >= right) {
        ops.push({ type: 'replace', left: leftLines[i], right: rightLines[j] });
        i += 1;
        j += 1;
        continue;
      }
      if (j < m && (i >= n || right >= down)) {
        ops.push({ type: 'add', right: rightLines[j] });
        j += 1;
      } else if (i < n) {
        ops.push({ type: 'del', left: leftLines[i] });
        i += 1;
      } else {
        break;
      }
    }
    return ops;
  }

  function buildCharDiff(leftText, rightText) {
    const a = [...String(leftText || '')];
    const b = [...String(rightText || '')];
    if (!a.length || !b.length) return null;
    if (a.length * b.length > CHAR_DIFF_MAX_CELLS) return null;
    const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    const ops = [];
    let i = a.length;
    let j = b.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.push({ t: 'same', c: a[i - 1] });
        i -= 1;
        j -= 1;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        ops.push({ t: 'add', c: b[j - 1] });
        j -= 1;
      } else if (i > 0) {
        ops.push({ t: 'del', c: a[i - 1] });
        i -= 1;
      } else {
        break;
      }
    }
    ops.reverse();
    let left = '';
    let right = '';
    for (const op of ops) {
      if (op.t === 'same') {
        const c = escHtml(op.c);
        left += c;
        right += c;
      } else if (op.t === 'del') {
        left += '<mark class="cdel">' + escHtml(op.c) + '</mark>';
      } else {
        right += '<mark class="cadd">' + escHtml(op.c) + '</mark>';
      }
    }
    return { left, right };
  }

  // 値表示の方針:
  //  - 1行かつ短い値はインラインで「旧 → 新」を1行に表示（カード2ペインを使わない）
  //  - 追加/削除は片側のみをフル幅で表示（空の「（なし）」ペインを作らない）
  //  - 複数行の変更のみ左右ペア（行単位LCS + 文字ハイライト）で表示
  const INLINE_VALUE_MAX = 120;
  const LONG_VALUE_COLLAPSE_CHARS = 1400;
  const LONG_VALUE_COLLAPSE_LINES = 18;

  function isInlineText(text) {
    return text.indexOf('\\n') === -1 && text.length <= INLINE_VALUE_MAX;
  }

  function renderInlineLane(side, tone, content) {
    const isSource = side === 'source';
    const lane = isSource ? 'before' : 'after';
    const english = isSource ? 'BEFORE' : 'AFTER';
    const japanese = isSource ? '比較元' : '比較先';
    return '<span class="val-lane val-lane--' + lane + '">'
      + '<span class="val-lane-label"><b>' + english + '</b><small>' + japanese + '</small></span>'
      + '<span class="vi-val vi-val--' + tone + '">' + content + '</span>'
      + '</span>';
  }

  function renderDuoLaneHeader(side, detail) {
    const isSource = side === 'source';
    return '<span class="duo-lane duo-lane--' + (isSource ? 'before' : 'after') + '">'
      + '<b>' + (isSource ? 'BEFORE' : 'AFTER') + '</b>'
      + '<small>' + escHtml(detail || (isSource ? '比較元' : '比較先')) + '</small>'
      + '</span>';
  }

  function shouldHideUnchangedDiffLines() {
    const el = document.getElementById('hideUnchangedLines');
    return !!(el && el.checked);
  }

  function activeViewSide() {
    return viewSideValue === 'source' || viewSideValue === 'target' ? viewSideValue : '';
  }

  function renderChangedDuo(row, useCharDiff) {
    const side = activeViewSide();
    if (side) return renderChangedSolo(row, useCharDiff, side);
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    const ops = buildLineDiffOps(leftText.split('\\n'), rightText.split('\\n'));
    let body = '';
    if (!ops) {
      body = '<div class="duo-row">'
        + '<div class="duo-cell del" data-side-label="比較元"><pre class="blk">' + escHtml(leftText) + '</pre></div>'
        + '<div class="duo-cell add" data-side-label="比較先"><pre class="blk">' + escHtml(rightText) + '</pre></div>'
        + '</div>';
    } else {
      let leftNo = 0;
      let rightNo = 0;
      const hideSameLines = shouldHideUnchangedDiffLines();
      body = ops.map((op) => {
        if (op.type === 'same') {
          leftNo += 1;
          rightNo += 1;
          const l = '<span class="ln">' + leftNo + '</span><span class="lt">' + escHtml(op.left || '') + '</span>';
          if (hideSameLines) return '';
          const r = '<span class="ln">' + rightNo + '</span><span class="lt">' + escHtml(op.right || '') + '</span>';
          return '<div class="duo-row"><div class="duo-cell" data-side-label="比較元">' + l + '</div><div class="duo-cell" data-side-label="比較先">' + r + '</div></div>';
        }
        if (op.type === 'replace') {
          leftNo += 1;
          rightNo += 1;
          const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
          const l = '<span class="ln">' + leftNo + '</span><span class="lt">' + (cd ? cd.left : escHtml(op.left || '')) + '</span>';
          const r = '<span class="ln">' + rightNo + '</span><span class="lt">' + (cd ? cd.right : escHtml(op.right || '')) + '</span>';
          return '<div class="duo-row"><div class="duo-cell del" data-side-label="比較元">' + l + '</div><div class="duo-cell add" data-side-label="比較先">' + r + '</div></div>';
        }
        if (op.type === 'del') {
          leftNo += 1;
          const l = '<span class="ln">' + leftNo + '</span><span class="lt">' + escHtml(op.left || '') + '</span>';
          return '<div class="duo-row"><div class="duo-cell del" data-side-label="比較元">' + l + '</div><div class="duo-cell pad"></div></div>';
        }
        rightNo += 1;
        const r = '<span class="ln">' + rightNo + '</span><span class="lt">' + escHtml(op.right || '') + '</span>';
        return '<div class="duo-row"><div class="duo-cell pad"></div><div class="duo-cell add" data-side-label="比較先">' + r + '</div></div>';
      }).join('');
      if (!body && hideSameLines) body = '<div class="duo-empty">変更行はありません</div>';
    }
    return '<div class="duo-wrap">'
      + '<div class="duo-head">' + renderDuoLaneHeader('source', '比較元') + renderDuoLaneHeader('target', '比較先') + '</div>'
      + '<div class="duo scroll">' + body + '</div>'
      + '</div>';
  }

  // 片側視点: 選択したアプリの内容だけを1カラムで表示し、変更箇所のみ色付けする
  function renderChangedSolo(row, useCharDiff, side) {
    const isSrc = side === 'source';
    const ownText = safeText(isSrc ? row.left : row.right);
    const ops = buildLineDiffOps(safeText(row.left).split('\\n'), safeText(row.right).split('\\n'));
    const tone = isSrc ? 'del' : 'add';
    const sideLabel = escHtml(issueSideLabel(side));
    let body = '';
    if (!ops) {
      body = '<div class="duo-row duo-row--solo"><div class="duo-cell ' + tone + '" data-side-label="' + sideLabel + '"><pre class="blk">' + escHtml(ownText) + '</pre></div></div>';
    } else {
      const hideSameLines = shouldHideUnchangedDiffLines();
      let no = 0;
      body = ops.map((op) => {
        if (op.type === 'same') {
          no += 1;
          if (hideSameLines) return '';
          return '<div class="duo-row duo-row--solo"><div class="duo-cell" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + escHtml((isSrc ? op.left : op.right) || '') + '</span></div></div>';
        }
        if (op.type === 'replace') {
          no += 1;
          const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
          const marked = cd ? (isSrc ? cd.left : cd.right) : escHtml((isSrc ? op.left : op.right) || '');
          return '<div class="duo-row duo-row--solo"><div class="duo-cell ' + tone + '" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + marked + '</span></div></div>';
        }
        if (op.type === 'del') {
          if (!isSrc) return '';
          no += 1;
          return '<div class="duo-row duo-row--solo"><div class="duo-cell del" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + escHtml(op.left || '') + '</span></div></div>';
        }
        if (isSrc) return '';
        no += 1;
        return '<div class="duo-row duo-row--solo"><div class="duo-cell add" data-side-label="' + sideLabel + '"><span class="ln">' + no + '</span><span class="lt">' + escHtml(op.right || '') + '</span></div></div>';
      }).join('');
      if (!body) body = '<div class="duo-empty">' + escHtml(issueSideLabel(side) + '側に表示できる変更行はありません') + '</div>';
    }
    return '<div class="duo-wrap">'
      + '<div class="duo-head duo-head--solo">' + renderDuoLaneHeader(side, issueSideLabel(side) + 'から見た内容') + '</div>'
      + '<div class="duo scroll">' + body + '</div>'
      + '</div>';
  }

  // 片側視点でのシンプル値表示（同一・追加・削除・インライン変更）
  function renderValueAreaOneSide(row, useCharDiff, side) {
    const isSrc = side === 'source';
    const sideName = issueSideLabel(side);
    const ownText = safeText(isSrc ? row.left : row.right);
    if (row.type === 'same') {
      if (isInlineText(ownText)) {
        return '<div class="val-inline"><span class="vi-val vi-val--same" data-side-label="' + escHtml(sideName) + '">' + escHtml(ownText) + '</span></div>';
      }
      return '<div class="val-single val-single--same"><div class="scroll"><pre class="blk">' + escHtml(ownText) + '</pre></div></div>';
    }
    if (row.type === 'added' || row.type === 'removed') {
      const isAdd = row.type === 'added';
      const existsHere = isAdd ? !isSrc : isSrc;
      if (!existsHere) {
        const reason = isAdd ? '比較先で追加された設定' : '比較元にのみ存在する設定';
        return '<div class="val-inline"><span class="vi-val vi-val--absent">' + escHtml(sideName + 'には存在しません（' + reason + '）') + '</span></div>';
      }
      const text = safeText(isAdd ? row.right : row.left);
      const cls = isAdd ? 'add' : 'del';
      if (isInlineText(text)) {
        return '<div class="val-inline val-inline--lanes">' + renderInlineLane(side, cls, escHtml(text)) + '</div>';
      }
      return '<div class="val-single val-single--' + cls + '">'
        + '<div class="val-single-head">' + escHtml(sideName + (isAdd ? '（追加された設定）' : '（削除された設定）')) + '</div>'
        + '<div class="scroll"><pre class="blk">' + escHtml(text) + '</pre></div>'
        + '</div>';
    }
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    if (isInlineText(leftText) && isInlineText(rightText)) {
      const cd = useCharDiff ? buildCharDiff(leftText, rightText) : null;
      const marked = cd ? (isSrc ? cd.left : cd.right) : escHtml(ownText);
      return '<div class="val-inline val-inline--lanes">'
        + renderInlineLane(side, isSrc ? 'del' : 'add', marked)
        + '</div>';
    }
    return renderChangedSolo(row, useCharDiff, side);
  }

  function renderValueArea(row, useCharDiff) {
    const viewSide = activeViewSide();
    if (viewSide) return renderValueAreaOneSide(row, useCharDiff, viewSide);
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    if (row.type === 'same') {
      if (isInlineText(leftText)) {
        return '<div class="val-inline"><span class="vi-val vi-val--same">' + escHtml(leftText) + '</span></div>';
      }
      return '<div class="val-single val-single--same"><div class="scroll"><pre class="blk">' + escHtml(leftText) + '</pre></div></div>';
    }
    if (row.type === 'added' || row.type === 'removed') {
      const isAdd = row.type === 'added';
      const text = isAdd ? rightText : leftText;
      const cls = isAdd ? 'add' : 'del';
      if (isInlineText(text)) {
        return '<div class="val-inline val-inline--lanes">' + renderInlineLane(isAdd ? 'target' : 'source', cls, escHtml(text)) + '</div>';
      }
      return '<div class="val-single val-single--' + cls + '">'
        + '<div class="val-single-head">' + (isAdd ? '比較先（追加された設定）' : '比較元（削除された設定）') + '</div>'
        + '<div class="scroll"><pre class="blk">' + escHtml(text) + '</pre></div>'
        + '</div>';
    }
    if (isInlineText(leftText) && isInlineText(rightText)) {
      const cd = useCharDiff ? buildCharDiff(leftText, rightText) : null;
      return '<div class="val-inline val-inline--lanes">'
        + renderInlineLane('source', 'del', cd ? cd.left : escHtml(leftText))
        + '<span class="vi-arrow" aria-hidden="true">→</span>'
        + renderInlineLane('target', 'add', cd ? cd.right : escHtml(rightText))
        + '</div>';
    }
    return renderChangedDuo(row, useCharDiff);
  }

  function wrapLongValueHtml(row, valueHtml) {
    const texts = [safeText(row && row.left), safeText(row && row.right)];
    const maxChars = Math.max(...texts.map((text) => text.length));
    const maxLines = Math.max(...texts.map((text) => text.split('\\n').length));
    if (maxChars <= LONG_VALUE_COLLAPSE_CHARS && maxLines <= LONG_VALUE_COLLAPSE_LINES) return valueHtml;
    return '<details class="long-value">'
      + '<summary><span>長い設定値を表示</span><small>' + maxChars.toLocaleString('ja-JP') + '文字 / ' + maxLines + '行</small></summary>'
      + '<div class="long-value-body">' + valueHtml + '</div>'
      + '</details>';
  }

  function renderRowMeta(row) {
    const tags = [];
    if (row.reasonSummary) tags.push('<span class="meta-tag reason">' + escHtml(row.reasonSummary) + '</span>');
    if (row.renameCandidate) {
      const renameTip = '名称変更候補: ' + String(row.renameCandidate.fromCode || '-') + ' → ' + String(row.renameCandidate.toCode || '-')
        + (row.renameCandidate.matchedBy ? ' / 判定: ' + String(row.renameCandidate.matchedBy) : '');
      tags.push('<span class="meta-tag rename" title="' + escHtml(renameTip) + '">名称変更候補</span>');
    }
    if (!tags.length) return '';
    return '<div class="meta-wrap">' +
      (tags.length ? '<div class="meta-tags">' + tags.join('') + '</div>' : '') +
      '</div>';
  }

  // ---- 「JSONで比較」: フィールド単位に区切った WinMerge 風の左右比較 ----

  function stripInternalFieldKeys(def) {
    if (!def || typeof def !== 'object' || Array.isArray(def)) return def;
    const out = {};
    Object.keys(def).forEach((k) => {
      if (k === '__parentTableCode' || k === '__parentTableLabel') return;
      out[k] = def[k];
    });
    return out;
  }

  function buildFieldJsonGroups(rows) {
    const map = new Map();
    const passthrough = [];
    (rows || []).forEach((row) => {
      const info = extractFieldPathInfo(row.path);
      if (!info || !info.rootCode) {
        passthrough.push(row);
        return;
      }
      if (!map.has(info.rootCode)) map.set(info.rootCode, []);
      map.get(info.rootCode).push(row);
    });
    const groups = [];
    map.forEach((bucket, code) => {
      let src = stripInternalFieldKeys(FIELD_PROPS_SRC[code] || null);
      let tgt = stripInternalFieldKeys(FIELD_PROPS_TGT[code] || null);
      if (!src && !tgt) {
        const rootRow = bucket.find((row) => {
          const info = extractFieldPathInfo(row.path);
          return !!info && (info.isFieldRoot || info.isSubFieldRoot);
        }) || bucket[0];
        src = rootRow.left && typeof rootRow.left === 'object' ? rootRow.left : null;
        tgt = rootRow.right && typeof rootRow.right === 'object' ? rootRow.right : null;
      }
      const status = src && tgt ? 'changed' : (tgt ? 'added' : 'removed');
      const ref = tgt || src || ({});
      groups.push({
        code,
        rows: bucket,
        src,
        tgt,
        status,
        label: String(ref.label || ref.name || code),
        type: String(ref.type || '-'),
        reviewRow: {
          _id: 'field-json:' + code,
          sectionKey: FIELD_SECTION_KEY,
          section: SECTION_LABEL_MAP[FIELD_SECTION_KEY] || 'フィールド設定',
          path: FIELD_SECTION_KEY + '.properties.' + code,
          type: status,
          _displayOnly: !bucket.some((row) => isActionableReviewRow(row)),
          __childRows: bucket
        }
      });
    });
    return { groups, passthrough };
  }

  function renderFieldJsonBlockHtml(group, useCharDiff) {
    const toneCls = group.status === 'added' ? 'added' : group.status === 'removed' ? 'removed' : 'changed';
    const checked = selectedFieldCodes.has(group.code);
    const selectable = CAN_BUILD_REFLECT_JSON && (group.rows || []).some((row) => row && row.type !== 'same' && !row._displayOnly && !row._nonActionable);
    const reviewRow = group.reviewRow;
    const reviewKey = rowStateKey(reviewRow);
    const reviewable = isActionableReviewRow(reviewRow);
    const reviewed = isReviewRowComplete(reviewRow);
    const fieldItemLabel = String(group.label || group.code || 'フィールド');
    rowLookup.set(reviewKey, reviewRow);
    let body;
    if (group.src && group.tgt) {
      body = renderChangedDuo({ left: group.src, right: group.tgt, type: 'changed' }, useCharDiff);
    } else {
      const isAdd = !!group.tgt;
      const viewSide = activeViewSide();
      if (viewSide && ((viewSide === 'source' && !group.src) || (viewSide === 'target' && !group.tgt))) {
        body = '<div class="val-inline"><span class="vi-val vi-val--absent">' + escHtml(issueSideLabel(viewSide) + 'にはこのフィールドは存在しません（' + (isAdd ? '比較先のみに存在' : '比較元のみに存在') + '）') + '</span></div>';
      } else {
        body = '<div class="val-single val-single--' + (isAdd ? 'add' : 'del') + '">'
          + '<div class="val-single-head">' + (isAdd ? '比較先のみに存在するフィールド' : '比較元のみに存在するフィールド') + '</div>'
          + '<div class="scroll"><pre class="blk">' + escHtml(safeText(group.tgt || group.src)) + '</pre></div>'
          + '</div>';
      }
    }
    return '<article class="fj-block fj-block--' + toneCls + (reviewed ? ' drow--reviewed' : '') + '" tabindex="-1" data-diff-row-key="' + escHtml(reviewKey) + '" aria-current="false">'
      + '<div class="fj-head">'
      +   renderRowFacts(reviewRow)
      +   '<span class="fj-title">' + escHtml(group.label) + '</span>'
      +   '<code class="fj-code">' + escHtml(group.code) + '</code>'
      +   '<span class="fj-type">' + escHtml(fieldTypeDisplayLabel(group.type)) + '</span>'
      +   '<span class="fj-spacer"></span>'
      +   (selectable
        ? '<label class="row-select' + (checked ? ' is-on' : '') + '" title="このフィールドを反映JSONの対象にする">'
          + '<input type="checkbox" data-select-field="' + escHtml(group.code) + '" aria-label="' + escHtml(fieldItemLabel + 'を反映JSONの対象に選択') + '"' + (checked ? ' checked' : '') + '> 選択</label>'
        : '<span class="muted" title="' + escHtml(CAN_BUILD_REFLECT_JSON ? '表示専用または同一のため反映対象にできません' : REFLECT_JSON_BLOCK_REASON) + '">'
          + (CAN_BUILD_REFLECT_JSON ? '反映対象外' : '反映利用不可') + '</span>')
      + (reviewable
        ? (!reviewed ? '<button type="button" class="row-review-next" data-review-next="' + escHtml(reviewKey) + '" aria-label="' + escHtml(fieldItemLabel + 'を確認済みにして次へ') + '">確認して次へ</button>' : '')
          + '<label class="row-reviewed' + (reviewed ? ' is-on' : '') + '"><input type="checkbox" data-review-toggle="' + escHtml(reviewKey) + '" aria-label="' + escHtml(fieldItemLabel + 'を確認済みにする') + '"' + (reviewed ? ' checked' : '') + '> 確認済み</label>'
        : '<span class="row-display-only">表示専用</span>')
      + '</div>'
      + '<div class="fj-body">' + body + '</div>'
      + '</article>';
  }

  // ---- 選択差分 → 反映用APIパラメータJSON ----
  // 比較元(source)の設定値を比較先(target)アプリへ反映する方向で組み立てる。
  // form/fields はフィールド単位の部分更新ができるため PUT/POST/DELETE に分解し、
  // それ以外の「全体置き換え型」APIは比較元セクション全体をそのままpayloadにする。

  const INCOMPLETE_COMPARISON_WARNINGS = Array.isArray(REPORT_META.comparisonWarnings)
    ? REPORT_META.comparisonWarnings.map((item) => String(item || '')).filter(Boolean)
    : [];

  function withReflectRequestSafety(request, safety) {
    const opts = safety || ({});
    const warnings = [
      ...INCOMPLETE_COMPARISON_WARNINGS,
      ...(Array.isArray(opts.warnings) ? opts.warnings : [])
    ].filter(Boolean);
    return Object.assign(request, {
      replacesEntireSection: !!opts.replacesEntireSection,
      destructive: !!opts.destructive,
      incompleteComparison: !!REPORT_META.incompleteComparison,
      warnings: warnings
    });
  }

  function wholeSectionReplaceWarning(label, selectedCount) {
    return String(label || 'このセクション') + 'は全体置き換えAPIです。選択した '
      + String(selectedCount || 0) + ' 行だけでなく、選択していない設定も比較元セクション全体の内容で上書きされます。';
  }

  const SECTION_REFLECT_APIS = {
    layoutSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/form/layout.json', build: (sec) => ({ layout: (sec && sec.layout) || sec || [] }) },
    viewSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/views.json', build: (sec) => ({ views: (sec && sec.views) || sec || ({}) }), note: 'このAPIはビュー全体を置き換えます。payloadに含まれないビューは削除されます' },
    reportSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/reports.json', build: (sec) => ({ reports: (sec && sec.reports) || sec || ({}) }), note: 'このAPIはグラフ全体を置き換えます' },
    processSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/status.json', build: (sec) => {
      const p = {};
      if (sec && sec.enable !== undefined) p.enable = sec.enable;
      if (sec && sec.states !== undefined) p.states = sec.states;
      if (sec && sec.actions !== undefined) p.actions = sec.actions;
      return p;
    } },
    actionSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/actions.json', build: (sec) => ({ actions: (sec && sec.actions) || sec || ({}) }) },
    appAcl: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/acl.json', build: (sec) => ({ rights: (sec && sec.rights) || sec || [] }) },
    fieldAcl: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/field/acl.json', build: (sec) => ({ rights: (sec && sec.rights) || sec || [] }) },
    recordPermissions: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/record/acl.json', build: (sec) => ({ rights: (sec && sec.rights) || sec || [] }) },
    notifications: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/notifications/general.json', build: (sec) => {
      const p = { notifications: (sec && sec.notifications) || sec || [] };
      if (sec && sec.notifyToCommenter !== undefined) p.notifyToCommenter = sec.notifyToCommenter;
      return p;
    } },
    perRecordNotifications: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/notifications/perRecord.json', build: (sec) => ({ notifications: (sec && sec.notifications) || sec || [] }) },
    reminderNotifications: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/notifications/reminder.json', build: (sec) => {
      const p = { notifications: (sec && sec.notifications) || sec || [] };
      if (sec && sec.timezone) p.timezone = sec.timezone;
      return p;
    } },
    customizeSettings: { method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/customize.json', build: (sec) => {
      const p = {};
      if (sec && sec.scope) p.scope = sec.scope;
      if (sec && sec.desktop !== undefined) p.desktop = sec.desktop;
      if (sec && sec.mobile !== undefined) p.mobile = sec.mobile;
      return p;
    }, note: 'FILE指定のJS/CSSは比較先環境で fileKey を再アップロードする必要があります' }
  };

  function buildAppSettingsReflectPayload(rows, sec) {
    const payload = {};
    (rows || []).forEach((row) => {
      const rel = relativePathFromRow(row.path, 'appSettings');
      const tokens = tokenizePath(rel == null ? '' : rel);
      const key = typeof tokens[0] === 'string' ? tokens[0] : '';
      if (key && sec && sec[key] !== undefined) payload[key] = sec[key];
    });
    return payload;
  }

  function buildFieldReflectRequests(fieldRows, app, requests) {
    const FIELD_REFLECT_BATCH_LIMIT = 100;
    const codes = new Set();
    (fieldRows || []).forEach((row) => {
      const info = extractFieldPathInfo(row.path);
      if (info && info.rootCode) codes.add(info.rootCode);
    });
    selectedFieldCodes.forEach((code) => {
      if (!fieldCodeHasActualDiff(code)) return;
      // フィールド単位ビューで選んだテーブル内フィールドは親テーブルのコードへ丸める
      const def = FLAT_FIELD_PROPS_SRC[code] || FLAT_FIELD_PROPS_TGT[code];
      codes.add(def && def.__parentTableCode ? def.__parentTableCode : code);
    });
    if (!codes.size) return;
    const updateProps = {};
    const addProps = {};
    const deleteCodes = [];
    codes.forEach((code) => {
      const src = FIELD_PROPS_SRC[code];
      const tgt = FIELD_PROPS_TGT[code];
      if (src && tgt) updateProps[code] = src;
      else if (src) addProps[code] = src;
      else if (tgt) deleteCodes.push(code);
    });
    const label = SECTION_LABEL_MAP[FIELD_SECTION_KEY] || 'フィールド設定';
    const pushPropertyBatches = (properties, method, actionLabel) => {
      const entries = Object.entries(properties || {});
      const totalBatches = Math.ceil(entries.length / FIELD_REFLECT_BATCH_LIMIT);
      for (let offset = 0; offset < entries.length; offset += FIELD_REFLECT_BATCH_LIMIT) {
        const batchEntries = entries.slice(offset, offset + FIELD_REFLECT_BATCH_LIMIT);
        const batchIndex = Math.floor(offset / FIELD_REFLECT_BATCH_LIMIT) + 1;
        requests.push(withReflectRequestSafety(
          {
            section: FIELD_SECTION_KEY,
            sectionLabel: label + '（' + actionLabel + (totalBatches > 1 ? ' ' + batchIndex + '/' + totalBatches : '') + '）',
            method: method,
            api: TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json',
            payload: { app: app, properties: Object.fromEntries(batchEntries) },
            batch: { index: batchIndex, total: totalBatches, limit: FIELD_REFLECT_BATCH_LIMIT }
          },
          { replacesEntireSection: false, destructive: false }
        ));
      }
    };
    pushPropertyBatches(updateProps, 'PUT', '更新');
    pushPropertyBatches(addProps, 'POST', '追加');
    if (deleteCodes.length) {
      const totalBatches = Math.ceil(deleteCodes.length / FIELD_REFLECT_BATCH_LIMIT);
      for (let offset = 0; offset < deleteCodes.length; offset += FIELD_REFLECT_BATCH_LIMIT) {
        const batchIndex = Math.floor(offset / FIELD_REFLECT_BATCH_LIMIT) + 1;
        requests.push(withReflectRequestSafety({
          section: FIELD_SECTION_KEY,
          sectionLabel: label + '（削除候補・手動確認' + (totalBatches > 1 ? ' ' + batchIndex + '/' + totalBatches : '') + '）',
          method: null,
          api: null,
          candidateApi: TARGET_PREVIEW_API_PREFIX + '/app/form/fields.json',
          candidateMethod: 'DELETE',
          payload: { app: app, fields: deleteCodes.slice(offset, offset + FIELD_REFLECT_BATCH_LIMIT) },
          batch: { index: batchIndex, total: totalBatches, limit: FIELD_REFLECT_BATCH_LIMIT },
          requiresExplicitDeleteOptIn: true,
          note: '比較先のみに存在するフィールドです。自動DELETEリクエストは生成していません'
        }, {
          replacesEntireSection: false,
          destructive: true,
          warnings: [
            '比較先のみに存在するフィールドの自動削除は安全のため無効です。内容を確認し、必要な場合だけ管理画面等で手動削除してください。',
            'フィールドを削除すると、そのフィールドに保存されているレコードデータも失われる可能性があります。'
          ]
        }));
      }
    }
  }

  function buildPluginReflectRequests(secRows, srcSec, app, label, selectedPaths, requests) {
    const sourcePlugins = Array.isArray(srcSec && srcSec.plugins)
      ? srcSec.plugins
      : (Array.isArray(srcSec) ? srcSec : []);
    const ids = new Set();
    const manualPaths = [];
    (secRows || []).forEach((row) => {
      if (!row || row.type !== 'removed') {
        manualPaths.push(row && row.path ? row.path : 'pluginSettings');
        return;
      }
      if (String(row.path || '') === 'pluginSettings') {
        sourcePlugins.forEach((plugin) => {
          if (plugin && plugin.id) ids.add(String(plugin.id));
        });
        return;
      }
      const sourcePluginId = row.left && typeof row.left === 'object' && row.left.id
        ? row.left.id
        : (row.arrayKey === 'id' && row.arrayKeyValue != null ? row.arrayKeyValue : '');
      if (sourcePluginId && typeof sourcePluginId !== 'object') ids.add(String(sourcePluginId));
      else manualPaths.push(row.path || 'pluginSettings');
    });
    if (ids.size) {
      requests.push(withReflectRequestSafety(
        {
          section: 'pluginSettings',
          sectionLabel: label + '（比較元のみを追加）',
          method: 'POST',
          api: TARGET_PREVIEW_API_PREFIX + '/app/plugins.json',
          payload: { app: app, ids: [...ids] },
          selectedPaths: selectedPaths
        },
        {
          replacesEntireSection: false,
          destructive: false,
          warnings: ['選択した比較元のみのプラグインだけを追加します。設定値は各プラグイン画面で手動反映してください。']
        }
      ));
    }
    if (manualPaths.length) {
      requests.push(withReflectRequestSafety(
        {
          section: 'pluginSettings',
          sectionLabel: label + '（手動確認）',
          method: null,
          api: null,
          selectedPaths: manualPaths,
          note: '比較先のみのプラグイン削除やプラグイン設定値の変更は自動反映しません'
        },
        {
          replacesEntireSection: false,
          destructive: false,
          warnings: ['プラグインの削除・設定変更は影響を確認し、管理画面で手動反映してください。']
        }
      ));
    }
  }

  function fieldCodeHasActualDiff(code) {
    const expected = String(code || '');
    if (!expected) return false;
    return REPORT_ROWS.some((row) => {
      if (!row || row.sectionKey !== FIELD_SECTION_KEY || row.type === 'same' || row._displayOnly || row._nonActionable) return false;
      const info = extractFieldPathInfo(row.path);
      return !!info && (info.activeCode === expected || info.rootCode === expected);
    });
  }

  function buildReflectJson() {
    if (!CAN_BUILD_REFLECT_JSON) return null;
    if (!selectedRows.size && !selectedFieldCodes.size) return null;
    const app = String(REPORT_META.target.appId || '');
    const bySection = new Map();
    selectedRows.forEach((row) => {
      if (!row || row._displayOnly || row._nonActionable || row.type === 'same') return;
      const key = row.sectionKey || '';
      if (!bySection.has(key)) bySection.set(key, []);
      bySection.get(key).push(row);
    });
    const requests = [];
    buildFieldReflectRequests(bySection.get(FIELD_SECTION_KEY) || [], app, requests);
    bySection.forEach((secRows, secKey) => {
      if (secKey === FIELD_SECTION_KEY) return;
      const label = SECTION_LABEL_MAP[secKey] || secKey;
      const selectedPaths = secRows.map((row) => row.path || '').filter(Boolean);
      const srcSec = SOURCE_SECTIONS[secKey];
      if (secKey === 'appSettings') {
        const payload = buildAppSettingsReflectPayload(secRows, srcSec);
        requests.push(withReflectRequestSafety(
          { section: secKey, sectionLabel: label, method: 'PUT', api: TARGET_PREVIEW_API_PREFIX + '/app/settings.json', payload: Object.assign({ app: app }, payload), selectedPaths: selectedPaths },
          { replacesEntireSection: false, destructive: false }
        ));
        return;
      }
      if (secKey === 'pluginSettings') {
        buildPluginReflectRequests(secRows, srcSec, app, label, selectedPaths, requests);
        return;
      }
      const def = SECTION_REFLECT_APIS[secKey];
      if (!def) {
        requests.push(withReflectRequestSafety(
          { section: secKey, sectionLabel: label, method: null, api: null, note: 'このセクションを直接更新できる公開APIがないため、sourceValue を参考に手動で反映してください', sourceValue: srcSec === undefined ? null : srcSec, selectedPaths: selectedPaths },
          { replacesEntireSection: false, destructive: false, warnings: ['公開APIで自動反映できないため、手動確認が必要です。'] }
        ));
        return;
      }
      const replacesEntireSection = def.replacesEntireSection !== false;
      const requestWarnings = [];
      if (replacesEntireSection) requestWarnings.push(wholeSectionReplaceWarning(label, secRows.length));
      if (def.note) requestWarnings.push(def.note);
      const req = withReflectRequestSafety(
        { section: secKey, sectionLabel: label, method: def.method, api: def.api, payload: Object.assign({ app: app }, def.build(srcSec)), selectedPaths: selectedPaths },
        {
          replacesEntireSection: replacesEntireSection,
          destructive: replacesEntireSection || !!def.destructive,
          warnings: requestWarnings
        }
      );
      if (def.note) req.note = def.note;
      requests.push(req);
    });
    if (!requests.length) return null;
    return {
      generatedAt: new Date().toISOString(),
      description: '選択した差分を比較先アプリへ反映するためのAPIパラメータ（比較元の設定値を使用）',
      source: { appId: REPORT_META.source.appId || '', appName: REPORT_META.source.appName || '' },
      target: { appId: REPORT_META.target.appId || '', appName: REPORT_META.target.appName || '', guestId: REPORT_META.target.guestId || '' },
      incompleteComparison: !!REPORT_META.incompleteComparison,
      warnings: [...INCOMPLETE_COMPARISON_WARNINGS],
      comparisonContext: {
        fetchIssues: REPORT_META.fetchIssues || [],
        partialIssues: REPORT_META.partialIssues || [],
        truncation: REPORT_META.truncation || null,
        rowSelection: REPORT_META.rowSelection || null
      },
      deployNote: 'preview系APIで反映した後、' + TARGET_PREVIEW_API_PREFIX + '/app/deploy.json で運用環境へ反映してください',
      requests: requests
    };
  }

  function exportReflectJson(copyOnly) {
    if (!CAN_BUILD_REFLECT_JSON) {
      showToast(REFLECT_JSON_BLOCK_REASON);
      return;
    }
    const payload = buildReflectJson();
    if (!payload) {
      showToast('反映する差分が選択されていません（行やフィールドの「選択」にチェックしてください）');
      return;
    }
    const text = JSON.stringify(payload, null, 2);
    if (copyOnly) {
      copyTextToClipboard(text, '反映用JSONをコピーしました（' + payload.requests.length + 'リクエスト）');
      return;
    }
    const stamp = String(REPORT_META.generatedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'report';
    downloadTextFile('反映用パラメータ_' + stamp + '.json', text, 'application/json');
    showToast('反映用JSONを保存しました（' + payload.requests.length + 'リクエスト）');
  }

  // ---- 作成時に利用した比較元/比較先の設定JSON出力 ----

  function exportComparedBundleJson(side) {
    if (!HAS_COMPARED_CONTENT) {
      showToast('差分行のみのレポートには設定本文が収録されていません');
      return;
    }
    const isSource = side === 'source';
    const meta = isSource ? REPORT_META.source : REPORT_META.target;
    const payload = {
      generatedAt: REPORT_META.generatedAt,
      purpose: 'comparisonEvidence',
      evidenceOnly: true,
      evidenceNote: 'このJSONは比較時に利用した取得済み設定の証跡です。反映用APIパラメータではありません。',
      side: side,
      sideLabel: isSource ? '比較元' : '比較先',
      appId: meta.appId || '',
      appName: meta.appName || '',
      scopes: REPORT_META.scopes || [],
      ignoreKeys: REPORT_META.ignoreKeys || '',
      normalizationLabels: REPORT_META.normalizationLabels || [],
      incompleteComparison: !!REPORT_META.incompleteComparison,
      warnings: [...INCOMPLETE_COMPARISON_WARNINGS],
      comparisonContext: {
        fetchIssues: REPORT_META.fetchIssues || [],
        partialIssues: REPORT_META.partialIssues || [],
        truncation: REPORT_META.truncation || null,
        rowSelection: REPORT_META.rowSelection || null
      },
      sections: isSource ? SOURCE_SECTIONS : TARGET_SECTIONS
    };
    const stamp = String(REPORT_META.generatedAt || '').replace(/[-:TZ.]/g, '').slice(0, 14) || 'report';
    downloadTextFile((isSource ? '比較元設定_' : '比較先設定_') + (meta.appId || '-') + '_' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
    showToast((isSource ? '比較元' : '比較先') + 'の設定JSONを保存しました');
  }

  function groupBySection(rows) {
    const order = {};
    const defs = ${safeJsonForScript(SECTION_DEFS.map((d, i) => ({ key: d.key, label: d.label, order: i })))};
    defs.forEach((d) => { order[d.key] = d.order; });
    const map = new Map();
    for (const row of rows) {
      const key = row.sectionKey || row.section || '未分類';
      const label = SECTION_LABEL_MAP[key] || row.section || key;
      if (!map.has(key)) map.set(key, { key, label, rows: [] });
      map.get(key).rows.push(row);
    }
    return [...map.values()].sort((a, b) => {
      const oa = Object.prototype.hasOwnProperty.call(order, a.key) ? order[a.key] : 9999;
      const ob = Object.prototype.hasOwnProperty.call(order, b.key) ? order[b.key] : 9999;
      if (oa !== ob) return oa - ob;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  function collapseFieldRowsForDiffTable(rows) {
    const groups = new Map();
    const passthrough = [];
    (rows || []).forEach((row) => {
      if (row.sectionKey !== FIELD_SECTION_KEY) {
        passthrough.push(row);
        return;
      }
      const info = extractFieldPathInfo(row.path);
      if (!info?.rootPath) {
        passthrough.push(row);
        return;
      }
      if (!groups.has(info.rootPath)) groups.set(info.rootPath, []);
      groups.get(info.rootPath).push(row);
    });

    const collapsed = [];
    groups.forEach((bucket, rootPath) => {
      if (!bucket.length) return;
      const rootRow = bucket.find((row) => {
        const info = extractFieldPathInfo(row.path);
        return !!info && (info.isFieldRoot || info.isSubFieldRoot);
      }) || bucket[0];
      if (bucket.length === 1) {
        collapsed.push(rootRow);
        return;
      }
      const impactRefMap = new Map();
      let impactCount = 0;
      bucket.forEach((row) => {
        impactCount = Math.max(impactCount, Number(row.impactCount || 0));
        (row.impactRefs || []).forEach((ref) => {
          const key = [ref.sectionKey || ref.section || '', ref.kind || '', ref.path || '', ref.label || ''].join('|');
          if (!impactRefMap.has(key)) impactRefMap.set(key, ref);
        });
      });
      const impactRefs = [...impactRefMap.values()];
      impactCount = Math.max(impactCount, impactRefs.length);
      const diffKidCount = bucket.filter((row) => row.type !== 'same').length;
      const reasonSummary = diffKidCount
        ? 'フィールド内の設定差分 ' + diffKidCount + '件'
        : 'フィールド単位に集約（設定差分 ' + bucket.length + '件）';
      collapsed.push({
        ...rootRow,
        // ルート行自体は同一でも、配下プロパティに差分があればこの集約行は「変更」として扱う
        type: diffKidCount && rootRow.type === 'same' ? 'changed' : rootRow.type,
        path: rootPath,
        left: rootRow.left,
        right: rootRow.right,
        reasonSummary,
        __childRows: bucket,
        renameCandidate: bucket.find((row) => row.renameCandidate)?.renameCandidate || rootRow.renameCandidate || null,
        impactCount,
        impactRefs,
        impactSummary: bucket.find((row) => row.impactSummary)?.impactSummary || rootRow.impactSummary || '',
        __fieldRowCount: bucket.length
      });
    });
    return [...passthrough, ...collapsed];
  }

  function relativePathLabel(row) {
    const path = String(row?.path || '');
    const secKey = String(row?.sectionKey || '');
    if (!path) return '-';
    if (!secKey) return path;
    if (path === secKey) return '（セクション全体）';
    if (path.startsWith(secKey + '.')) return path.slice(secKey.length + 1);
    if (path.startsWith(secKey + '[')) return path.slice(secKey.length);
    return path;
  }

  function summarizeGroupRows(rows) {
    const out = { total: rows.length, diffCount: 0, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    rows.forEach((row) => {
      if (row.type === 'same') {
        out.same += 1;
        return;
      }
      out.diffCount += 1;
      if (row.type === 'added') out.added += 1;
      else if (row.type === 'removed') out.removed += 1;
      else if (row.moved || row.type === 'moved') out.moved += 1;
      else out.changed += 1;
    });
    return out;
  }

  function groupSummaryLabel(rows) {
    const s = summarizeGroupRows(rows);
    const parts = ['差分 ' + s.diffCount];
    if (s.added) parts.push('比較先のみ ' + s.added);
    if (s.removed) parts.push('比較元のみ ' + s.removed);
    if (s.changed) parts.push('内容差 ' + s.changed);
    if (s.moved) parts.push('並び順差 ' + s.moved);
    if (s.same) parts.push('同じ ' + s.same);
    return parts.join(' / ');
  }

  function reportRowTitle(row) {
    const fullPath = String(row?.path || '-');
    const relPath = relativePathLabel(row);
    if (row?.sectionKey === FIELD_SECTION_KEY) {
      const info = extractFieldPathInfo(fullPath);
      if (info) {
        const code = info.activeCode || '';
        const field = getFieldRowPayload(row) || getFieldDefinition(code, 'source') || getFieldDefinition(code, 'target') || ({});
        const fieldLabel = String(field.label || field.name || code || 'フィールド');
        const propTitle = fieldChangePropTitle(info, row);
        return fieldLabel + (propTitle ? ' · ' + propTitle : '');
      }
    }
    if (row?._reportDisplayTitle) return String(row._reportDisplayTitle);
    if (row?.entityLabel || row?.entityKind) {
      const sectionLabel = SECTION_LABEL_MAP[row?.sectionKey || ''] || row?.section || '';
      const kindLabel = ENTITY_KIND_LABEL_MAP[row?.entityKind || ''] || '';
      const parts = [];
      if (sectionLabel) parts.push(sectionLabel);
      if (row?.entityLabel) parts.push((kindLabel ? kindLabel + '「' + row.entityLabel + '」' : row.entityLabel));
      if (row?.entityPropLabel) parts.push(row.entityPropLabel);
      if (parts.length) return parts.join(' / ');
    }
    return relPath || fullPath;
  }

  function renderPathCell(row) {
    const fullPath = String(row?.path || '-');
    const pathMain = reportRowTitle(row);
    let html = '<div class="path-main">' + escHtml(pathMain) + '</div>';
    const technicalRows = [];
    if (row?.sectionKey === FIELD_SECTION_KEY) {
      const info = extractFieldPathInfo(fullPath);
      const code = info?.activeCode || '';
      if (code) technicalRows.push(['フィールドコード', code]);
    }
    if (row?.entityCode) technicalRows.push(['識別コード', String(row.entityCode)]);
    if (fullPath && fullPath !== '-') technicalRows.push(['設定パス', fullPath]);
    if (technicalRows.length) {
      html += '<details class="path-tech"><summary>技術情報</summary><div class="path-tech-body">'
        + technicalRows.map((item) => '<div><span>' + escHtml(item[0]) + '</span><code>' + escHtml(item[1]) + '</code></div>').join('')
        + '</div></details>';
    }
    const relatedRefs = Array.isArray(row?.impactRefs) ? row.impactRefs.filter(Boolean) : [];
    const relatedCount = Math.max(Number(row?.impactCount || 0), relatedRefs.length);
    if (relatedCount) {
      html += '<details class="related-settings"><summary>関連している設定 ' + relatedCount + '件</summary>'
        + (relatedRefs.length
          ? '<ul>' + relatedRefs.map((ref) => {
              const label = ref.label || ref.kind || ref.section || ref.sectionKey || '関連設定';
              const path = ref.path ? ' / ' + ref.path : '';
              return '<li><span>' + escHtml(label) + '</span><code>' + escHtml(path) + '</code></li>';
            }).join('') + '</ul>'
          : '<p>関連件数のみ検出されています。</p>')
        + '</details>';
    }
    return html + renderRowMeta(row);
  }

  function settingsTone(row) {
    if (row.type === 'same') return 'same';
    if (row.type === 'removed') return 'src';
    if (row.type === 'added') return 'tgt';
    return 'chg';
  }

  const FIELD_SECTION_KEY = 'fieldSettings';

  function relativePathFromRow(path, secKey) {
    if (!path) return '';
    if (path === secKey) return '';
    if (path.startsWith(secKey + '.')) return path.slice(secKey.length + 1);
    if (path.startsWith(secKey + '[')) return path.slice(secKey.length);
    return null;
  }

  function tokenizePath(path) {
    if (!path) return [];
    const out = [];
    const re = /([^[.\\]]+)|\\[(\\d+)\\]/g;
    let m;
    while ((m = re.exec(path)) !== null) {
      if (m[1] != null) out.push(m[1]);
      else out.push(Number(m[2]));
    }
    return out;
  }

  function extractFieldPathInfo(path) {
    const rel = relativePathFromRow(path, FIELD_SECTION_KEY);
    if (rel == null) return null;
    const tokens = tokenizePath(rel);
    if (tokens[0] !== 'properties' || typeof tokens[1] !== 'string') return null;
    const rootCode = tokens[1];
    const isSubField = tokens[2] === 'fields' && typeof tokens[3] === 'string';
    const subFieldCode = isSubField ? tokens[3] : '';
    const tailTokens = tokens.slice(isSubField ? 4 : 2);
    return {
      rootCode,
      subFieldCode,
      activeCode: subFieldCode || rootCode,
      isSubField,
      tailTokens,
      leafKey: tailTokens.length ? String(tailTokens[tailTokens.length - 1]) : '',
      isFieldRoot: !isSubField && tailTokens.length === 0,
      isSubFieldRoot: isSubField && tailTokens.length === 0,
      rootPath: isSubField
        ? FIELD_SECTION_KEY + '.properties.' + rootCode + '.fields.' + subFieldCode
        : FIELD_SECTION_KEY + '.properties.' + rootCode
    };
  }

  function getFieldRowPayload(row) {
    if (!row || row.sectionKey !== FIELD_SECTION_KEY) return null;
    const info = extractFieldPathInfo(row.path);
    if (!info) return null;
    if (row.type === 'added') return row.right;
    if (row.type === 'removed') return row.left;
    return row.right != null ? row.right : row.left;
  }

  function jsonEq(a, b) {
    if (a === b) return true;
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  function isSubtableFieldsMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.values(value);
    if (!entries.length) return false;
    return entries.every((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      return ('code' in item) || ('type' in item) || ('label' in item);
    });
  }

  // counterpart（比較相手側の fields マップ）を渡すと、相手側に無い行・値が異なる行へ差分色を付ける。
  function renderSubtableFieldsTableHtml(fields, counterpart, side) {
    if (!fields || typeof fields !== 'object') {
      return '<div class="sl-empty">（なし）</div>';
    }
    const entries = Object.values(fields);
    if (!entries.length) return '<div class="sl-empty">（項目なし）</div>';
    const cp = (counterpart && typeof counterpart === 'object' && !Array.isArray(counterpart)) ? counterpart : null;
    const cpByCode = {};
    if (cp) {
      Object.entries(cp).forEach(([key, child]) => {
        const code = String((child && child.code) || key);
        cpByCode[code] = child;
      });
    }
    const headerHtml = '<thead><tr>' +
      '<th class="st-col-no">#</th>' +
      '<th class="st-col-label">フィールド名</th>' +
      '<th class="st-col-type">フィールド型</th>' +
      '<th class="st-col-code">フィールドコード</th>' +
      '<th class="st-col-req">必須</th>' +
      '</tr></thead>';
    const bodyHtml = '<tbody>' + entries.map((child, idx) => {
      const label = String(child?.label || child?.name || child?.code || '（未設定）');
      const typeCode = String(child?.type || '').trim();
      const typeLabel = fieldTypeDisplayLabel(typeCode);
      const code = String(child?.code || '-');
      const required = !!child?.required;
      let trCls = '';
      if (cp) {
        const other = cpByCode[code];
        if (!other) trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
        else if (!jsonEq(child, other)) trCls = ' class="kv-chg"';
      }
      return '<tr' + trCls + '>' +
        '<td class="st-col-no">' + String(idx + 1) + '</td>' +
        '<td class="st-col-label">' + escHtml(label) + '</td>' +
        '<td class="st-col-type"><span class="st-type-chip" data-type="' + escHtml(typeCode) + '">' + escHtml(typeLabel) + '</span></td>' +
        '<td class="st-col-code"><code>' + escHtml(code) + '</code></td>' +
        '<td class="st-col-req">' + (required ? '<span class="st-req">必須</span>' : '') + '</td>' +
      '</tr>';
    }).join('') + '</tbody>';
    return '<div class="st-wrap"><table class="st-fields">' + headerHtml + bodyHtml + '</table></div>';
  }

  function renderSubtableFieldCardHtml(field) {
    const typeLabel = fieldTypeDisplayLabel(field?.type);
    const label = String(field?.label || field?.name || field?.code || '（未設定）');
    const code = String(field?.code || '-');
    const head = '<div class="st-card-head">' +
      '<span class="st-card-kind">' + escHtml(typeLabel) + '</span>' +
      '<span class="st-card-title">' + escHtml(label) + '</span>' +
      '<code class="st-card-code">' + escHtml(code) + '</code>' +
    '</div>';
    const body = renderSubtableFieldsTableHtml(field?.fields);
    return '<div class="st-card">' + head + body + '</div>';
  }

  // ---- 関連レコード一覧設定 / ルックアップ設定の日本語表示ヘルパー ----

  function valueScalarText(v) {
    if (v === undefined || v === null || v === '') return '（なし）';
    return String(v);
  }

  function refConditionText(v) {
    if (!v || typeof v !== 'object') return valueScalarText(v);
    return '自アプリ「' + valueScalarText(v.field) + '」 ＝ 参照アプリ「' + valueScalarText(v.relatedField) + '」';
  }

  function refRelatedAppText(v) {
    if (!v || typeof v !== 'object') return valueScalarText(v);
    const parts = ['アプリID: ' + valueScalarText(v.app)];
    if (v.code) parts.push('アプリコード: ' + v.code);
    return parts.join(' / ');
  }

  function sortLabelText(v) {
    const s = String(v == null ? '' : v);
    if (!s) return '（なし）';
    return s.replace(/\\basc\\b/g, '（昇順）').replace(/\\bdesc\\b/g, '（降順）');
  }

  function listLabelText(v) {
    if (Array.isArray(v)) return v.length ? v.join(' / ') : '（なし）';
    return valueScalarText(v);
  }

  function fieldMappingsText(v) {
    if (!Array.isArray(v) || !v.length) return '（なし）';
    return v.map((m, i) => String(i + 1) + '. コピー先「' + valueScalarText(m && m.field) + '」 ← コピー元「' + valueScalarText(m && m.relatedField) + '」').join('\\n');
  }

  function settingValueText(key, value) {
    if (value === undefined) return '';
    if (key === 'condition') return refConditionText(value);
    if (key === 'relatedApp') return refRelatedAppText(value);
    if (key === 'sort') return sortLabelText(value);
    if (key === 'displayFields' || key === 'lookupPickerFields') return listLabelText(value);
    if (key === 'fieldMappings') return fieldMappingsText(value);
    if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return valueScalarText(value);
    }
    let j;
    try { j = JSON.stringify(value); } catch (e) { j = String(value); }
    return localizeJsonEnums(j);
  }

  function textToCellHtml(text) {
    return escHtml(text).replace(/\\n/g, '<br>');
  }

  // 変更されたセルの文字単位ハイライト。複数行はセル全体の色のみで表現する。
  function charMarkedCellHtml(thisText, otherText, side) {
    if (thisText.indexOf('\\n') >= 0 || otherText.indexOf('\\n') >= 0) return textToCellHtml(thisText);
    const cd = side === 'tgt' ? buildCharDiff(otherText, thisText) : buildCharDiff(thisText, otherText);
    if (!cd) return textToCellHtml(thisText);
    return side === 'tgt' ? cd.right : cd.left;
  }

  const REFERENCE_TABLE_KEY_ORDER = ['relatedApp', 'condition', 'displayFields', 'filterCond', 'size', 'sort'];
  const LOOKUP_KEY_ORDER = ['relatedApp', 'relatedKeyField', 'fieldMappings', 'lookupPickerFields', 'filterCond', 'sort'];

  // referenceTable / lookup の設定オブジェクトを日本語ラベル付きキー値表で描画する。
  // counterpart（比較相手側の同設定）を渡すと、異なる行へ差分色と文字単位ハイライトを付ける。
  function renderSettingKvTable(kind, value, counterpart, side) {
    const orderedKeys = kind === 'referenceTable' ? REFERENCE_TABLE_KEY_ORDER : LOOKUP_KEY_ORDER;
    const cp = (counterpart && typeof counterpart === 'object' && !Array.isArray(counterpart)) ? counterpart : null;
    const keys = [];
    orderedKeys.forEach((k) => {
      if ((value && k in value) || (cp && k in cp)) keys.push(k);
    });
    Object.keys(value || ({})).forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); });
    if (cp) Object.keys(cp).forEach((k) => { if (keys.indexOf(k) < 0) keys.push(k); });
    const rows = keys.map((k) => {
      const hasHere = !!value && (k in value);
      const hasThere = !!cp && (k in cp);
      const thisText = hasHere ? settingValueText(k, value[k]) : '';
      const otherText = hasThere ? settingValueText(k, cp[k]) : '';
      let trCls = '';
      let cellHtml;
      if (!cp) {
        cellHtml = textToCellHtml(thisText);
      } else if (!hasHere) {
        trCls = ' class="kv-ghost"';
        cellHtml = '<span class="sl-empty">（設定なし）</span>';
      } else if (!hasThere) {
        trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
        cellHtml = textToCellHtml(thisText);
      } else if (thisText !== otherText) {
        trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
        cellHtml = charMarkedCellHtml(thisText, otherText, side);
      } else {
        cellHtml = textToCellHtml(thisText);
      }
      return '<tr' + trCls + '><th title="' + escHtml(k) + '">' + escHtml(SETTING_KEY_LABELS[k] || k) + '</th><td>' + cellHtml + '</td></tr>';
    }).join('');
    return '<table class="sl-mini-table">' + rows + '</table>';
  }

  function formatFieldValueBrief(val, opts) {
    const o = (opts && typeof opts === 'object') ? opts : ({});
    const cp = (o.counterpart && typeof o.counterpart === 'object' && !Array.isArray(o.counterpart)) ? o.counterpart : null;
    const side = o.side === 'tgt' ? 'tgt' : 'src';
    if (val === undefined) return '<span class="sl-empty">（なし）</span>';
    if (val === null) return escHtml('null');
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      // 単独の API ENUM 文字列（"CREATOR" / "BAR" 等）を日本語ラベルに置換
      const s = String(val);
      const labeled = FIELD_TYPE_LABELS[s] || s;
      return escHtml(labeled);
    }
    if (Array.isArray(val)) {
      let j;
      try { j = JSON.stringify(val); } catch (e) { j = String(val); }
      return '<span class="sl-val-mono">' + escHtml(localizeJsonEnums(j)) + '</span>';
    }
    if (t === 'object') {
      // 関連レコード一覧設定 / ルックアップ設定: 日本語キー + 差分色付きのキー値表
      if (o.kind === 'referenceTable' || o.kind === 'lookup') {
        return renderSettingKvTable(o.kind, val, cp, side);
      }
      // SUBTABLE 全体: テーブル情報 + 内部フィールドを表形式でレンダリング
      if (val.type === 'SUBTABLE' && val.fields && typeof val.fields === 'object') {
        return renderSubtableFieldCardHtml(val);
      }
      // テーブルの fields マップ: 直接表形式でレンダリング
      if (isSubtableFieldsMap(val)) {
        return renderSubtableFieldsTableHtml(val, cp, side);
      }
      const keys = Object.keys(val);
      if (keys.length && keys.length <= 10) {
        const rows = keys.slice(0, 10).map((k) => {
          const v = val[k];
          let cell;
          if (v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            // type/フィールド型を持つ key の場合は値を ENUM ラベルに置換
            const stringified = v === undefined ? '（未定義）' : JSON.stringify(v);
            cell = escHtml(localizeJsonEnums(stringified));
          } else if (k === 'fields' && isSubtableFieldsMap(v)) {
            cell = renderSubtableFieldsTableHtml(v, cp && isSubtableFieldsMap(cp.fields) ? cp.fields : null, side);
          } else {
            let j;
            try { j = JSON.stringify(v); } catch (e) { j = String(v); }
            cell = escHtml(localizeJsonEnums(j));
          }
          let trCls = '';
          if (cp && !jsonEq(val[k], cp[k])) {
            trCls = side === 'tgt' ? ' class="kv-add"' : ' class="kv-del"';
          }
          return '<tr' + trCls + '><th title="' + escHtml(k) + '">' + escHtml(FIELD_SETTING_LABELS[k] || SETTING_KEY_LABELS[k] || k) + '</th><td>' + cell + '</td></tr>';
        }).join('');
        let ghostRows = '';
        if (cp) {
          Object.keys(cp).forEach((k) => {
            if (keys.indexOf(k) >= 0) return;
            ghostRows += '<tr class="kv-ghost"><th title="' + escHtml(k) + '">' + escHtml(FIELD_SETTING_LABELS[k] || SETTING_KEY_LABELS[k] || k) + '</th><td><span class="sl-empty">（設定なし）</span></td></tr>';
          });
        }
        return '<table class="sl-mini-table">' + rows + ghostRows + '</table>';
      }
    }
    let j;
    try { j = JSON.stringify(val); } catch (e) { j = String(val); }
    return '<span class="sl-val-mono">' + escHtml(localizeJsonEnums(j)) + '</span>';
  }

  function formatFieldValuePlain(val, maxLen) {
    const n = maxLen == null ? 8000 : maxLen;
    if (val === undefined) return '（なし）';
    if (val === null) return 'null';
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      const s = String(val);
      return s.length > n ? s.slice(0, n) + '…' : s;
    }
    let j;
    try {
      j = JSON.stringify(val, null, 2);
    } catch (e) {
      j = String(val);
    }
    return j.length > n ? j.slice(0, n) + '…' : j;
  }

  const FIELD_TYPE_LABELS = {
    SINGLE_LINE_TEXT: '文字列（1行）',
    MULTI_LINE_TEXT: '文字列（複数行）',
    RICH_TEXT: 'リッチテキスト',
    NUMBER: '数値',
    CALC: '計算',
    CHECK_BOX: 'チェックボックス',
    RADIO_BUTTON: 'ラジオボタン',
    DROP_DOWN: 'ドロップダウン',
    MULTI_SELECT: '複数選択',
    DATE: '日付',
    TIME: '時刻',
    DATETIME: '日時',
    LINK: 'リンク',
    FILE: '添付ファイル',
    USER_SELECT: 'ユーザー選択',
    ORGANIZATION_SELECT: '組織選択',
    GROUP_SELECT: 'グループ選択',
    CATEGORY: 'カテゴリー',
    STATUS: 'ステータス',
    STATUS_ASSIGNEE: '作業者',
    SUBTABLE: 'テーブル',
    REFERENCE_TABLE: '関連レコード一覧',
    RECORD_NUMBER: 'レコード番号',
    CREATOR: '作成者',
    CREATED_TIME: '作成日時',
    MODIFIER: '更新者',
    UPDATED_TIME: '更新日時',
    SPACER: 'スペース',
    HR: '罫線',
    LABEL: 'ラベル',
    GROUP: 'グループ',
    LOOKUP: 'ルックアップ'
  };

  const FIELD_SETTING_LABELS = {
    label: 'フィールド名',
    name: 'フィールド名',
    code: 'フィールドコード',
    noLabel: 'フィールド名を表示しない',
    required: '必須項目にする',
    unique: '重複禁止にする',
    defaultValue: '初期値',
    defaultNowValue: '現在日時を初期値にする',
    description: '説明',
    minLength: '最小文字数',
    maxLength: '最大文字数',
    minValue: '最小値',
    maxValue: '最大値',
    expression: '計算式',
    hideExpression: '計算式を表示しない',
    options: '項目と順番',
    protocol: 'プロトコル',
    displayScale: '小数点以下の表示桁数',
    digit: '桁区切りを表示する',
    unit: '単位記号',
    unitPosition: '単位記号の位置',
    align: '並び',
    format: '表示形式',
    entities: '選択候補',
    fields: 'テーブル内の項目',
    referenceTable: '関連レコード一覧設定',
    lookup: 'ルックアップ設定'
  };

  // 関連レコード一覧設定 / ルックアップ設定オブジェクト内のキー → 日本語ラベル
  // （kintone のフィールド設定ダイアログの項目名に揃える）
  const SETTING_KEY_LABELS = {
    condition: '表示条件（フィールドの一致）',
    displayFields: '表示するフィールド',
    filterCond: '絞り込み条件',
    relatedApp: '参照するアプリ',
    size: '一度に表示する最大件数',
    sort: 'ソート',
    relatedKeyField: 'コピー元のフィールド',
    fieldMappings: 'ほかのフィールドのコピー',
    lookupPickerFields: '選択画面に表示するフィールド',
    field: '自アプリのフィールド',
    relatedField: '参照するアプリのフィールド',
    app: '参照するアプリID',
    thumbnailSize: 'サムネイルの大きさ'
  };

  const FIELD_ALIGN_LABELS = Object.freeze({
    horizontal: '横',
    vertical: '縦',
    HORIZONTAL: '横',
    VERTICAL: '縦'
  });

  const FIELD_UNIT_POSITION_LABELS = Object.freeze({
    BEFORE: '前に付ける',
    AFTER: '後ろに付ける'
  });

  const CALC_FORMAT_LABELS = Object.freeze({
    NUMBER: '数値（例: 1000）',
    NUMBER_DIGIT: '数値（例: 1,000）',
    DATETIME: '日時（例: 2012-08-06 2:03）',
    DATE: '日付（例: 2012-08-06）',
    TIME: '時刻（例: 2:03）',
    HOUR_MINUTE: '時間（例: 26時間3分）',
    DAY_HOUR_MINUTE: '時間（例: 1日2時間3分）'
  });

  function fieldTypeDisplayLabel(type) {
    const key = String(type || '').trim();
    return FIELD_TYPE_LABELS[key] || key || 'フィールド';
  }

  // diff HTML の値セル内 JSON 文字列に含まれる kintone API ENUM トークンを日本語ラベルへ置換する。
  // 「フィールド型 / ACL エンティティ型 / ビュー / グラフ / 通知タイミング / Webhook イベント」などを網羅。
  function localizeJsonEnums(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return jsonStr;
    let out = jsonStr;
    const dictionaries = [
      FIELD_TYPE_LABELS,
      // 重複は longer-key first ソートで解消されるため一括連結する
      Object.freeze({
        // ACL / 通知の対象エンティティ
        USER: 'ユーザー', ORGANIZATION: '組織', FIELD_ENTITY: 'フィールド値',
        LOGIN_USER: 'ログインユーザー', ALL: '全員',
        CUSTOM_FIELD: 'カスタムフィールド',
        // Chart / Aggregation
        BAR: '横棒グラフ', COLUMN: '縦棒グラフ', LINE: '折れ線グラフ', PIE: '円グラフ',
        PIVOT_TABLE: 'クロス集計表', AREA: '面グラフ', SPLINE: 'スプライン',
        SPLINE_AREA: 'スプライン面', SCATTER: '散布図',
        COUNT: '件数', SUM: '合計', AVG: '平均', MAX: '最大値', MIN: '最小値',
        NORMAL: '通常', STACKED: '積み上げ', PERCENTAGE: '100%積み上げ',
        // Process assignee
        ONE: '1人選出', ANYONE: '候補の誰でも',
        // Customize / scope
        URL: 'URL指定', ADMIN: '管理者のみ', NONE: '無効',
        // Notification timing
        CREATION: 'レコード作成時', DAYS_OF_WEEK: '曜日指定', WEEKLY: '毎週', MONTHLY: '毎月',
        // Webhook events
        ADD_RECORD: 'レコード追加', UPDATE_RECORD: 'レコード編集',
        DELETE_RECORD: 'レコード削除', UPDATE_STATUS: 'ステータス変更',
        ADD_COMMENT: 'コメント追加', DELETE_COMMENT: 'コメント削除',
        // View kind
        LIST: '一覧', CALENDAR: 'カレンダー', CUSTOM: 'カスタマイズ',
        // Date grouping unit
        YEAR: '年', QUARTER: '四半期', MONTH: '月', WEEK: '週', DAY: '日',
        HOUR: '時', MINUTE: '分'
      })
    ];
    const merged = {};
    dictionaries.forEach((d) => Object.assign(merged, d));
    const keys = Object.keys(merged).sort((a, b) => b.length - a.length);
    for (const key of keys) {
      const jp = merged[key];
      // クォート付きトークン: "ENUM" → "JP"
      out = out.split('"' + key + '"').join('"' + jp + '"');
    }
    return out;
  }

  function fieldAlignDisplayLabel(align) {
    const key = String(align || '').trim();
    return FIELD_ALIGN_LABELS[key] || (key || '（未設定）');
  }

  function fieldUnitPositionDisplayLabel(unitPosition) {
    const key = String(unitPosition || '').trim() || 'BEFORE';
    return FIELD_UNIT_POSITION_LABELS[key] || key;
  }

  function calcFormatDisplayLabel(format) {
    const key = String(format || '').trim() || 'NUMBER';
    return CALC_FORMAT_LABELS[key] || key;
  }

  function hasMeaningfulFieldValue(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value !== '';
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
  }

  function collectFieldOptionLabels(options) {
    if (!options || typeof options !== 'object') return '';
    return Object.keys(options).map((key) => {
      const option = options[key];
      if (!option || typeof option !== 'object') return String(key);
      return String(option.label || key);
    }).join(' / ');
  }

  function collectSortedFieldOptions(options) {
    if (!options || typeof options !== 'object') return [];
    return Object.keys(options)
      .map((key) => {
        const option = options[key];
        return {
          label: String(option?.label || key),
          index: Number(option?.index ?? Number.MAX_SAFE_INTEGER)
        };
      })
      .sort((a, b) => a.index - b.index || a.label.localeCompare(b.label))
      .map((item) => item.label);
  }

  function formatFieldOptionLines(options) {
    const items = collectSortedFieldOptions(options);
    if (!items.length) return '（なし）';
    return items.map((label, idx) => String(idx + 1) + '. ' + label).join('\\\\n');
  }

  function formatSubtableFieldLines(fields) {
    if (!fields || typeof fields !== 'object') return '（なし）';
    const lines = Object.values(fields).map((child, idx) => {
      const label = String(child?.label || child?.name || child?.code || '（未設定）');
      const typeLabel = fieldTypeDisplayLabel(child?.type);
      const code = String(child?.code || '-');
      return String(idx + 1) + '. ' + label + ' / ' + typeLabel + ' / ' + code;
    });
    return lines.length ? lines.join('\\\\n') : '（なし）';
  }

  function formatFieldSettingValue(value, options = {}) {
    if (options.html) {
      return (value == null || value === '')
        ? '<span class="sl-empty">（なし）</span>'
        : String(value);
    }
    if (options.subtableFields) {
      return renderSubtableFieldsTableHtml(value, options.counterpart, options.side);
    }
    if (options.boolLabel) return value ? 'オン' : 'オフ';
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      return formatFieldValueBrief(value, { kind: options.kind, counterpart: options.counterpart, side: options.side });
    }
    if (value === undefined || value === null || value === '') return '（なし）';
    return escHtml(String(value));
  }

  function renderFieldToggleRow(label, checked, changed) {
    return '<div class="kf-toggle' + (checked ? ' is-on' : '') + (changed ? ' kf-toggle--diff' : '') + '">' +
      '<span class="kf-toggle-box" aria-hidden="true"></span>' +
      '<span class="kf-toggle-label">' + escHtml(label) + '</span>' +
      (changed ? '<span class="kf-diff-chip">差分</span>' : '') +
    '</div>';
  }

  function renderFieldFormRow(label, value, options = {}) {
    const valueCls = 'kf-value'
      + (options.textarea ? ' kf-value--textarea' : '')
      + ((options.html || options.subtableFields) ? ' kf-value--rich' : '');
    return '<section class="kf-row' + (options.full ? ' kf-row--full' : '') + (options.diff ? ' kf-row--diff' : '') + '">' +
      '<div class="kf-label">' + escHtml(label) + (options.required ? ' <span class="kf-required">*</span>' : '') + (options.diff ? ' <span class="kf-diff-chip">差分</span>' : '') + '</div>' +
      '<div class="' + valueCls + '">' + formatFieldSettingValue(value, options) + '</div>' +
    '</section>';
  }

  function renderFieldBlock(title, innerHtml) {
    return '<div class="kf-extra">' +
      '<div class="kf-extra-title">' + escHtml(title) + '</div>' +
      innerHtml +
    '</div>';
  }

  function renderFieldUnitBlock(field, other) {
    return renderFieldBlock(
      '単位記号',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('記号', field.unit || '', { diff: !!other && !jsonEq(field.unit, other.unit) }) +
        renderFieldFormRow('位置', fieldUnitPositionDisplayLabel(field.unitPosition), { diff: !!other && !jsonEq(field.unitPosition, other.unitPosition) }) +
      '</div>'
    );
  }

  function renderFieldLimitsBlock(field, other) {
    return renderFieldBlock(
      '値の制限（整数で指定）',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('最小', field.minValue, { diff: !!other && !jsonEq(field.minValue, other.minValue) }) +
        renderFieldFormRow('最大', field.maxValue, { diff: !!other && !jsonEq(field.maxValue, other.maxValue) }) +
      '</div>'
    );
  }

  // other（比較相手側の同フィールド定義）が渡された場合、値が異なる行へ差分フラグを立てる。
  function buildFieldExtraRows(field, other, side) {
    const rows = [];
    const changedKeys = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    const push = (label, value, options = {}, diffKeys) => {
      if (!hasMeaningfulFieldValue(value)) return;
      if (diffKeys && changedKeys(diffKeys)) options = Object.assign({}, options, { diff: true });
      rows.push({ label, value, options });
    };
    push('タイプ', fieldTypeDisplayLabel(field.type), {}, ['type']);
    push('説明', field.description, { textarea: true, maxLen: 600 }, ['description']);
    push('最小文字数', field.minLength, {}, ['minLength']);
    push('最大文字数', field.maxLength, {}, ['maxLength']);
    push('最小値', field.minValue, {}, ['minValue']);
    push('最大値', field.maxValue, {}, ['maxValue']);
    push('プロトコル', field.protocol, {}, ['protocol']);
    if (field.digit !== undefined) push('桁区切りを表示する', field.digit, { boolLabel: true }, ['digit']);
    push('小数点以下の表示桁数', field.displayScale, {}, ['displayScale']);
    push('単位記号', field.unit, {}, ['unit']);
    if (field.unitPosition) push('単位記号の位置', fieldUnitPositionDisplayLabel(field.unitPosition), {}, ['unitPosition']);
    if (field.align) push('並び', fieldAlignDisplayLabel(field.align), {}, ['align']);
    if (field.format) push('表示形式', calcFormatDisplayLabel(field.format), {}, ['format']);
    if (field.hideExpression !== undefined) push('計算式を表示しない', field.hideExpression, { boolLabel: true }, ['hideExpression']);
    if (field.options) push('項目と順番', formatFieldOptionLines(field.options), { textarea: true, maxLen: 600 }, ['options']);
    if (field.entities) push('選択候補', Array.isArray(field.entities) ? field.entities.join(' / ') : field.entities, { textarea: true, maxLen: 600 }, ['entities']);
    if (field.expression) push('計算式', field.expression, { textarea: true, maxLen: 600 }, ['expression']);
    if (field.lookup) push('ルックアップ設定', field.lookup, { textarea: true, maxLen: 600, kind: 'lookup', counterpart: other ? other.lookup : undefined, side }, ['lookup']);
    if (field.referenceTable) push('関連レコード一覧設定', field.referenceTable, { textarea: true, maxLen: 600, kind: 'referenceTable', counterpart: other ? other.referenceTable : undefined, side }, ['referenceTable']);
    if (field.fields) push('テーブル内の項目', field.fields, { subtableFields: true, full: true, counterpart: other ? other.fields : undefined, side }, ['fields']);
    if (field.__parentTableCode) push('テーブル', field.__parentTableLabel || field.__parentTableCode);
    return rows;
  }

  function renderGenericFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    const extras = buildFieldExtraRows(field, other, side);
    const toggleRows = [
      renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel),
      renderFieldToggleRow('必須項目にする', !!field.required, !!other && !!field.required !== !!other.required)
    ];
    if (field.unique !== undefined) toggleRows.push(renderFieldToggleRow('重複禁止にする', !!field.unique, !!other && !!field.unique !== !!other.unique));
    if (field.defaultNowValue !== undefined) toggleRows.push(renderFieldToggleRow('現在日時を初期値にする', !!field.defaultNowValue, !!other && !!field.defaultNowValue !== !!other.defaultNowValue));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' + toggleRows.join('') + '</div>' +
      renderFieldFormRow('初期値', field.defaultNowValue ? '現在日時を使用' : field.defaultValue, { textarea: true, full: true, maxLen: 600, diff: dif(['defaultValue', 'defaultNowValue']) }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) }) +
      (extras.length ? '<div class="kf-extra"><div class="kf-extra-title">その他の設定</div><div class="kf-extra-grid">' + extras.map((item) => renderFieldFormRow(item.label, item.value, item.options)).join('') + '</div></div>' : '');
  }

  function renderRadioFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
      '</div>' +
      renderFieldFormRow('項目と順番', formatFieldOptionLines(field.options), { textarea: true, full: true, maxLen: 1200, diff: dif(['options']) }) +
      renderFieldFormRow('並び', fieldAlignDisplayLabel(field.align), { full: true, diff: dif(['align']) }) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true, diff: dif(['defaultValue']) }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderNumberFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
        renderFieldToggleRow('桁区切りを表示する', !!field.digit, !!other && !!field.digit !== !!other.digit) +
        renderFieldToggleRow('必須項目にする', !!field.required, !!other && !!field.required !== !!other.required) +
        renderFieldToggleRow('値の重複を禁止する', !!field.unique, !!other && !!field.unique !== !!other.unique) +
      '</div>' +
      renderFieldLimitsBlock(field, other) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true, diff: dif(['defaultValue']) }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true, diff: dif(['displayScale']) }) +
      renderFieldUnitBlock(field, other) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderCalcFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
      '</div>' +
      renderFieldFormRow('計算式', field.expression, { required: true, textarea: true, full: true, maxLen: 1200, diff: dif(['expression']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('計算式を表示しない', !!field.hideExpression, !!other && !!field.hideExpression !== !!other.hideExpression) +
      '</div>' +
      renderFieldFormRow('表示形式', calcFormatDisplayLabel(field.format), { full: true, diff: dif(['format']) }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true, diff: dif(['displayScale']) }) +
      renderFieldUnitBlock(field, other) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderSubtableFieldSnapshotBody(field, other, side) {
    const dif = (keys) => !!other && keys.some((k) => !jsonEq(field[k], other[k]));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true, diff: dif(['label', 'name']) }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel, !!other && !!field.noLabel !== !!other.noLabel) +
      '</div>' +
      renderFieldFormRow('テーブル内の項目', field.fields, { subtableFields: true, full: true, counterpart: other ? other.fields : undefined, side, diff: dif(['fields']) }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true, diff: dif(['code']) });
  }

  function renderFieldSnapshotCard(sideLabel, field, tone, otherField) {
    if (!field) {
      return '<section class="fd-snapshot fd-snapshot--' + tone + '"><div class="fd-pane-label">' + escHtml(sideLabel) + '</div><div class="fd-empty">この側にはフィールドがありません。</div></section>';
    }
    // フィールド型が異なる場合は行単位の対応が取れないため、型の差分のみ強調する
    const other = otherField && String(otherField.type || '') === String(field.type || '') ? otherField : null;
    const typeChanged = !!otherField && String(otherField.type || '') !== String(field.type || '');
    const typeLabel = fieldTypeDisplayLabel(field.type);
    const bodyHtml =
      field.type === 'RADIO_BUTTON' ? renderRadioFieldSnapshotBody(field, other, tone)
      : field.type === 'NUMBER' ? renderNumberFieldSnapshotBody(field, other, tone)
      : field.type === 'CALC' ? renderCalcFieldSnapshotBody(field, other, tone)
      : field.type === 'SUBTABLE' ? renderSubtableFieldSnapshotBody(field, other, tone)
      : renderGenericFieldSnapshotBody(field, other, tone);
    return '<section class="fd-snapshot fd-snapshot--' + tone + '">' +
      '<div class="kf-modal">' +
        '<div class="kf-modal-head">' +
          '<div class="kf-modal-title"><span class="kf-type-icon" aria-hidden="true"></span><strong>' + escHtml(typeLabel) + ' の設定</strong>' + (typeChanged ? '<span class="kf-diff-chip" title="比較相手とフィールド型が異なります">型が差分</span>' : '') + '</div>' +
          '<span class="kf-side kf-side--' + tone + '">' + escHtml(sideLabel) + '</span>' +
        '</div>' +
        '<div class="kf-modal-body">' +
          bodyHtml +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function fieldChangePropTitle(info, row) {
    if (!info) return row.path || '-';
    if (info.isFieldRoot || info.isSubFieldRoot) return '';
    if (!info.tailTokens.length) return row.path || '-';
    if (FIELD_SETTING_LABELS[info.leafKey]) return FIELD_SETTING_LABELS[info.leafKey];
    if (String(row?.path || '').includes('.lookup.')) return 'ルックアップ設定';
    if (String(row?.path || '').includes('.referenceTable.')) return '関連レコード一覧設定';
    if (String(row?.path || '').includes('.options.')) return '項目と順番';
    if (String(row?.path || '').includes('.fields.')) return 'テーブル内の項目';
    return info.tailTokens.map((t) => (typeof t === 'number' ? '[' + t + ']' : String(t))).join('.');
  }

  function collectFlatFieldMap(properties, out) {
    const dest = out || ({});
    function walk(props, parentMeta) {
      Object.entries(props || ({})).forEach(([code, field]) => {
        if (!field || typeof field !== 'object' || Array.isArray(field)) return;
        const normalizedCode = String(field.code || code);
        const next = { ...field, code: normalizedCode };
        if (parentMeta) {
          next.__parentTableCode = parentMeta.code;
          next.__parentTableLabel = parentMeta.label;
        }
        dest[normalizedCode] = next;
        if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
          walk(field.fields, {
            code: normalizedCode,
            label: String(field.label || field.name || normalizedCode)
          });
        }
      });
    }
    walk(properties, null);
    return dest;
  }

  function getFieldDefinition(code, side) {
    if (!code) return null;
    return side === 'target' ? (FLAT_FIELD_PROPS_TGT[code] || null) : (FLAT_FIELD_PROPS_SRC[code] || null);
  }

  function collectLayoutItemCodes(value, out) {
    const bucket = out || [];
    if (Array.isArray(value)) {
      value.forEach((item) => collectLayoutItemCodes(item, bucket));
      return bucket;
    }
    if (!value || typeof value !== 'object') return bucket;
    if (value.code) bucket.push(String(value.code));
    if (Array.isArray(value.fields)) collectLayoutItemCodes(value.fields, bucket);
    if (Array.isArray(value.layout)) collectLayoutItemCodes(value.layout, bucket);
    return bucket;
  }

  function collectLayoutFieldCodes(rows, out) {
    return collectLayoutItemCodes(rows || [], out || []);
  }

  function getValueAtTokens(root, tokens) {
    let cur = root;
    for (const token of tokens || []) {
      if (cur == null) return undefined;
      cur = cur[token];
    }
    return cur;
  }

  function findLayoutFieldCodeByPath(path) {
    const rel = relativePathFromRow(path, 'layoutSettings');
    if (rel == null) return '';
    const tokens = tokenizePath(rel);
    const roots = [{ layout: LAYOUT_ROWS_SRC }, { layout: LAYOUT_ROWS_TGT }];
    for (const root of roots) {
      for (let i = tokens.length; i > 0; i--) {
        const value = getValueAtTokens(root, tokens.slice(0, i));
        if (value && typeof value === 'object' && !Array.isArray(value) && value.code) {
          return String(value.code);
        }
      }
    }
    return '';
  }

  function resolveLayoutRowCodes(row) {
    const codes = new Set();
    const rel = relativePathFromRow(row?.path, 'layoutSettings');
    const tokens = tokenizePath(rel);
    const leaf = tokens.length ? tokens[tokens.length - 1] : '';
    if ((leaf === 'code' || leaf === 'fieldCode') && typeof row?.left === 'string') codes.add(String(row.left));
    if ((leaf === 'code' || leaf === 'fieldCode') && typeof row?.right === 'string') codes.add(String(row.right));
    collectLayoutItemCodes(row?.left, []).forEach((code) => codes.add(String(code)));
    collectLayoutItemCodes(row?.right, []).forEach((code) => codes.add(String(code)));
    const byPath = findLayoutFieldCodeByPath(row?.path || '');
    if (byPath) codes.add(byPath);
    return [...codes].filter(Boolean);
  }

  function fieldStatusLabel(status) {
    if (status === 'added') return '追加';
    if (status === 'removed') return '削除';
    if (status === 'modified') return '変更';
    return '同一';
  }

  function fieldStatusTone(status) {
    if (status === 'added') return 'added';
    if (status === 'removed') return 'removed';
    if (status === 'modified') return 'changed';
    return 'same';
  }

  function collectAllFieldCodes() {
    const codes = new Set([...Object.keys(FLAT_FIELD_PROPS_SRC || ({})), ...Object.keys(FLAT_FIELD_PROPS_TGT || ({}))]);
    REPORT_ROWS.forEach((row) => {
      if (!row) return;
      if (row.sectionKey === FIELD_SECTION_KEY) {
        const info = extractFieldPathInfo(row.path);
        const code = info?.activeCode || getFieldRowPayload(row)?.code || '';
        if (code) codes.add(String(code));
        return;
      }
      if (row.sectionKey === 'layoutSettings') {
        resolveLayoutRowCodes(row).forEach((code) => codes.add(String(code)));
      }
    });
    return [...codes];
  }

  function buildFieldReviewModel() {
    const sourceLayoutOrder = [...new Set(collectLayoutFieldCodes(LAYOUT_ROWS_SRC, []))];
    const targetLayoutOrder = [...new Set(collectLayoutFieldCodes(LAYOUT_ROWS_TGT, []))];
    const sourceOrderMap = new Map(sourceLayoutOrder.map((code, idx) => [code, idx]));
    const targetOrderMap = new Map(targetLayoutOrder.map((code, idx) => [code, idx]));
    const groupMap = new Map();

    function ensureGroup(code) {
      const safeCode = String(code || '').trim();
      if (!safeCode) return null;
      if (!groupMap.has(safeCode)) {
        groupMap.set(safeCode, {
          code: safeCode,
          sourceField: FLAT_FIELD_PROPS_SRC[safeCode] || null,
          targetField: FLAT_FIELD_PROPS_TGT[safeCode] || null,
          fieldRows: [],
          layoutRows: []
        });
      }
      return groupMap.get(safeCode);
    }

    collectAllFieldCodes().forEach((code) => ensureGroup(code));

    getDetailFilteredRows().forEach((row) => {
      if (!row) return;
      if (row.sectionKey === FIELD_SECTION_KEY) {
        const info = extractFieldPathInfo(row.path);
        const code = info?.activeCode || getFieldRowPayload(row)?.code || '';
        const group = ensureGroup(code);
        if (group) group.fieldRows.push(row);
        return;
      }
      if (row.sectionKey === 'layoutSettings') {
        resolveLayoutRowCodes(row).forEach((code) => {
          const group = ensureGroup(code);
          if (group) group.layoutRows.push(row);
        });
      }
    });

    const statusOrder = { modified: 0, added: 1, removed: 2, unchanged: 3 };
    const groups = [...groupMap.values()].map((group) => {
      const field = group.targetField || group.sourceField || { code: group.code };
      const label = String(field.label || field.name || group.code);
      const type = String(field.type || group.sourceField?.type || group.targetField?.type || '-');
      const diffFieldRows = group.fieldRows.filter((row) => row.type !== 'same');
      const diffLayoutRows = group.layoutRows.filter((row) => row.type !== 'same');
      const diffRows = [...diffFieldRows];
      const allRows = [...group.fieldRows, ...group.layoutRows];
      const impactRefs = [];
      const impactSeen = new Set();
      allRows.forEach((row) => {
        (row.impactRefs || []).forEach((ref) => {
          const sig = [ref.sectionKey, ref.kind, ref.path, ref.label].join('|');
          if (impactSeen.has(sig)) return;
          impactSeen.add(sig);
          impactRefs.push(ref);
        });
      });
      const status = !group.sourceField && group.targetField
        ? 'added'
        : group.sourceField && !group.targetField
          ? 'removed'
          : diffFieldRows.length
            ? 'modified'
            : 'unchanged';
      const layoutIndex = sourceOrderMap.has(group.code)
        ? sourceOrderMap.get(group.code)
        : targetOrderMap.has(group.code)
          ? targetOrderMap.get(group.code) + 10000
          : 999999;
      return {
        ...group,
        label,
        type,
        status,
        diffCount: diffRows.length,
        settingDiffCount: diffFieldRows.length,
        layoutDiffCount: diffLayoutRows.length,
        impactCount: impactRefs.length,
        impactRefs,
        rows: diffRows,
        allRows,
        parentTableCode: String(field.__parentTableCode || ''),
        parentTableLabel: String(field.__parentTableLabel || ''),
        layoutIndex
      };
    }).sort((a, b) => {
      const ao = statusOrder[a.status] ?? 9;
      const bo = statusOrder[b.status] ?? 9;
      if (ao !== bo) return ao - bo;
      if (a.layoutIndex !== b.layoutIndex) return a.layoutIndex - b.layoutIndex;
      return String(a.code).localeCompare(String(b.code));
    });

    return {
      groups,
      groupMap: new Map(groups.map((group) => [group.code, group])),
      sourceLayoutOrder,
      targetLayoutOrder
    };
  }

  function fieldGroupSearchText(group) {
    return [
      group.code,
      group.label,
      group.type,
      group.parentTableCode,
      group.parentTableLabel,
      ...group.allRows.map((row) => row.path || ''),
      ...group.allRows.map((row) => row.reasonSummary || ''),
      ...group.allRows.map((row) => safeText(row.left)),
      ...group.allRows.map((row) => safeText(row.right))
    ].join('\\n').toLowerCase();
  }

  function fieldGroupMatchesKeyword(group, keyword) {
    if (!keyword) return true;
    return fieldGroupSearchText(group).includes(keyword);
  }

  function ensureActiveFieldCode(groups, options) {
    const preserveMissing = !!options?.preserveMissing;
    if (!groups.length) {
      if (!preserveMissing) activeFieldCode = '';
      return activeFieldCode;
    }
    if (activeFieldCode && groups.some((group) => group.code === activeFieldCode)) return activeFieldCode;
    if (preserveMissing && activeFieldCode) return activeFieldCode;
    const preferred = groups.find((group) => group.diffCount > 0) || groups[0];
    activeFieldCode = preferred.code;
    return activeFieldCode;
  }

  function updateStatsFromCounts(counts) {
    document.getElementById('stat-total').textContent = String(counts.total || 0);
    document.getElementById('stat-added').textContent = String(counts.added || 0);
    document.getElementById('stat-removed').textContent = String(counts.removed || 0);
    document.getElementById('stat-changed').textContent = String(counts.changed || 0);
    document.getElementById('stat-moved').textContent = String(counts.moved || 0);
    document.getElementById('stat-same').textContent = String(counts.same || 0);
  }

  function updateStatsFromFieldGroups(groups) {
    const counts = { total: groups.length, added: 0, removed: 0, changed: 0, moved: 0, same: 0 };
    groups.forEach((group) => {
      if (group.status === 'added') counts.added += 1;
      else if (group.status === 'removed') counts.removed += 1;
      else if (group.status === 'modified') counts.changed += 1;
      else counts.same += 1;
      if (group.allRows.some((row) => !!row.moved)) counts.moved += 1;
    });
    updateStatsFromCounts(counts);
  }

  function renderFieldSummaryChips(group, options) {
    const includeLayout = !!options?.includeLayout;
    const chips = [];
    if (group.settingDiffCount) chips.push('<span class="fc-chip">設定 ' + group.settingDiffCount + '</span>');
    if (includeLayout && group.layoutDiffCount) chips.push('<span class="fc-chip">配置 ' + group.layoutDiffCount + '</span>');
    if (group.parentTableCode) chips.push('<span class="fc-chip fc-chip--muted">テーブル ' + escHtml(group.parentTableLabel || group.parentTableCode) + '</span>');
    if (!chips.length) chips.push('<span class="fc-chip fc-chip--muted">差分なし</span>');
    return chips.join('');
  }

  function buildFieldDetailEntries(group, hideSame) {
    const entries = [];
    group.fieldRows.forEach((row) => {
      if (hideSame && row.type === 'same') return;
      entries.push({
        area: 'フィールド設定',
        title: fieldChangePropTitle(extractFieldPathInfo(row.path), row),
        row
      });
    });
    const typeOrder = { removed: 0, added: 1, changed: 2, same: 3 };
    return entries.sort((a, b) => {
      if (a.area !== b.area) return a.area === 'フィールド設定' ? -1 : 1;
      const ao = typeOrder[a.row.type] ?? 9;
      const bo = typeOrder[b.row.type] ?? 9;
      if (ao !== bo) return ao - bo;
      return String(a.row.path || '').localeCompare(String(b.row.path || ''));
    });
  }


  function renderFieldChangeSummary(entries) {
    if (!entries.length) return '';
    const visible = entries.slice(0, 10);
    const rest = entries.length - visible.length;
    return '<div class="fd-change-summary" aria-label="設定差分の要約">' +
      '<div class="fd-change-summary__title">変更項目</div>' +
      '<div class="fd-change-summary__chips">' +
        visible.map((entry) => {
          const tone = entry.row.type === 'added' ? 'added' : entry.row.type === 'removed' ? 'removed' : entry.row.type === 'same' ? 'same' : 'changed';
          return '<span class="fd-change-chip fd-change-chip--' + tone + '" title="' + escHtml(entry.row.path || '-') + '">' +
            '<b>' + escHtml(diffTypeLabel(entry.row.type, entry.row.moved)) + '</b>' + escHtml(entry.title || relativePathLabel(entry.row)) +
          '</span>';
        }).join('') +
        (rest > 0 ? '<span class="fd-change-chip fd-change-chip--more">ほか ' + rest + ' 件</span>' : '') +
      '</div>' +
    '</div>';
  }

  function renderFieldDetailPanel(code, model, options) {
    const group = model.groupMap.get(code || '');
    if (!group) {
      return '<section class="fd-panel"><div class="fd-empty">対象のフィールドが現在の表示条件に含まれていません。検索条件か「同一項目を隠す」を見直してから、もう一度「設定差分を開く」を押してください。</div></section>';
    }
    const entries = buildFieldDetailEntries(group, !!options?.hideSame);
    const tone = fieldStatusTone(group.status);
    return '<section class="fd-panel">' +
      '<div class="fd-head">' +
        '<div>' +
          '<div class="fd-title">' + escHtml(group.label) + '</div>' +
          '<div class="fd-sub">フィールドコード: <code>' + escHtml(group.code) + '</code> / 型: ' + escHtml(fieldTypeDisplayLabel(group.type)) + (group.parentTableCode ? ' / テーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
        '</div>' +
        '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
      '</div>' +
      '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
      renderFieldChangeSummary(entries) +
      '<div class="fd-snapshots">' +
        renderFieldSnapshotCard('比較元', group.sourceField, 'src', group.targetField) +
        renderFieldSnapshotCard('比較先', group.targetField, 'tgt', group.sourceField) +
      '</div>' +
    '</section>';
  }

  function closeFieldDetailModal() {
    const returnFocus = fieldDetailReturnFocus;
    detailModalOpen = false;
    fieldDetailReturnFocus = null;
    const modal = document.getElementById('fieldDetailModal');
    const body = document.getElementById('fieldDetailModalBody');
    if (modal) modal.hidden = true;
    if (body) body.innerHTML = '';
    document.body.classList.remove('has-modal-open');
    if (returnFocus && returnFocus.isConnected && typeof returnFocus.focus === 'function') {
      returnFocus.focus();
    }
  }

  function syncFieldDetailModal(model, options) {
    const modal = document.getElementById('fieldDetailModal');
    const body = document.getElementById('fieldDetailModalBody');
    const title = document.getElementById('fieldDetailModalTitle');
    const sub = document.getElementById('fieldDetailModalSub');
    if (!modal || !body || !title || !sub) return;
    if (!detailModalOpen) {
      closeFieldDetailModal();
      return;
    }
    const group = model?.groupMap?.get(activeFieldCode || '');
    if (!group) {
      closeFieldDetailModal();
      return;
    }
    title.textContent = group.label || group.code || 'フィールド詳細';
    sub.textContent = 'フィールドコード: ' + (group.code || '-') + ' / 型: ' + fieldTypeDisplayLabel(group.type) + (group.parentTableCode ? ' / テーブル: ' + (group.parentTableLabel || group.parentTableCode) : '');
    body.innerHTML = renderFieldDetailPanel(activeFieldCode, model, options);
    modal.hidden = false;
    document.body.classList.add('has-modal-open');
    const dialog = modal.querySelector('[role="dialog"]');
    if (dialog && !dialog.contains(document.activeElement)) {
      const firstFocus = dialog.querySelector('[data-modal-close]') || dialog;
      if (typeof firstFocus.focus === 'function') firstFocus.focus();
    }
  }

  function openFieldDetail(code, rerender, trigger) {
    if (!HAS_COMPARED_CONTENT) {
      showToast('差分行のみのレポートにはフィールド設定本文が収録されていません');
      return;
    }
    const safeCode = String(code || '').trim();
    if (!safeCode) return;
    fieldDetailReturnFocus = trigger || document.activeElement;
    activeFieldCode = safeCode;
    detailModalOpen = true;
    if (typeof rerender === 'function') rerender();
  }

  function bindFieldSelectionButtons(root, rerender) {
    if (!root) return;
    root.querySelectorAll('[data-field-select]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = String(btn.getAttribute('data-field-select') || '').trim();
        if (!code) return;
        openFieldDetail(code, rerender, btn);
      });
    });
  }

  function renderSettingsLikeView() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    if (!HAS_COMPARED_CONTENT) {
      root.innerHTML = '<div class="no-diff">差分行のみのレポートにはフィールド設定本文が収録されていないため、フィールド単位表示は利用できません。</div>';
      return;
    }
    const nav = document.getElementById('nav');
    if (nav) nav.innerHTML = '';
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    const model = buildFieldReviewModel();
    const groups = model.groups.filter((group) => {
      if (!group.fieldRows.length && group.layoutDiffCount > 0) return false;
      if (hideSame && group.status === 'unchanged') return false;
      if (!fieldGroupMatchesKeyword(group, keyword)) return false;
      return true;
    });
    updateStatsFromFieldGroups(groups);
    if (!groups.length) {
      closeFieldDetailModal();
      root.innerHTML = '<div class="no-diff">表示対象のフィールドがありません。検索条件か「同一項目を隠す」・詳細オプションを見直してください。</div>';
      return;
    }
    // 差分一覧と同じ「種別」チップでフィールドカードを絞り込む
    const statusCounts = { added: 0, removed: 0, changed: 0, same: 0 };
    groups.forEach((group) => {
      if (group.status === 'added') statusCounts.added += 1;
      else if (group.status === 'removed') statusCounts.removed += 1;
      else if (group.status === 'modified') statusCounts.changed += 1;
      else statusCounts.same += 1;
    });
    const statusChips = [
      { key: 'all', label: '全て', count: groups.length },
      { key: 'added', label: '追加', count: statusCounts.added },
      { key: 'removed', label: '削除', count: statusCounts.removed },
      { key: 'changed', label: '変更', count: statusCounts.changed }
    ];
    if (!hideSame) statusChips.push({ key: 'same', label: '同一', count: statusCounts.same });
    if (fieldStatusFilterValue !== 'all' && !statusChips.some((c) => c.key === fieldStatusFilterValue)) fieldStatusFilterValue = 'all';
    const visibleGroups = groups.filter((group) => {
      if (fieldStatusFilterValue === 'all') return true;
      if (fieldStatusFilterValue === 'same') return group.status === 'unchanged';
      if (fieldStatusFilterValue === 'changed') return group.status === 'modified';
      return group.status === fieldStatusFilterValue;
    });
    const toolbarHtml = '<div class="diff-toolbar" role="toolbar" aria-label="フィールド単位ビューの絞り込み">'
      + '<div class="diff-toolbar-row">'
      + '<span class="diff-toolbar-label">種別</span>'
      + statusChips.map((c) =>
        '<button type="button" class="tchip tchip--' + c.key + (fieldStatusFilterValue === c.key ? ' is-active' : '') + '" data-field-status-chip="' + c.key + '" aria-pressed="' + (fieldStatusFilterValue === c.key ? 'true' : 'false') + '">'
        + c.label + '<b>' + c.count + '</b></button>'
      ).join('')
      + '<span class="diff-toolbar-spacer"></span>'
      + '<span class="diff-toolbar-count">表示 <b>' + visibleGroups.length + '</b> / ' + groups.length + ' 件</span>'
      + '</div>'
      + '</div>';
    ensureActiveFieldCode(visibleGroups, { preserveMissing: detailModalOpen });
    const modelForView = { groupMap: new Map(visibleGroups.map((group) => [group.code, group])) };
    root.innerHTML = '<div class="sl-board">' +
      toolbarHtml +
      '<div class="sl-legend" role="note">' +
        '<span><strong>フィールド単位</strong>で、フィールドごとの設定差分をまとめて確認できます。</span>' +
        '<span><i class="sl-dot sl-dot--src"></i> 比較元のみ</span>' +
        '<span><i class="sl-dot sl-dot--tgt"></i> 比較先のみ</span>' +
        '<span><i class="sl-dot sl-dot--chg"></i> 差分あり</span>' +
        '<span>「設定差分を開く」でポップアップ表示</span>' +
        (!hideSame ? '<span><i class="sl-dot sl-dot--same"></i> 同一</span>' : '') +
      '</div>' +
      '<div class="fc-shell">' +
        '<div class="fc-list">' +
          (visibleGroups.length ? visibleGroups.map((group, idx) => {
            const tone = fieldStatusTone(group.status);
            const isActive = group.code === activeFieldCode;
            const isSelected = selectedFieldCodes.has(group.code);
            const isReflectSelectable = CAN_BUILD_REFLECT_JSON && (group.fieldRows || []).some((row) => row && row.type !== 'same' && !row._displayOnly && !row._nonActionable);
            return '<article class="fc-card fc-card--' + tone + (isActive ? ' is-active' : '') + '" id="field_card_' + idx + '">' +
              '<div class="fc-card-head">' +
                '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
                '<span class="fc-code">' + escHtml(group.code) + '</span>' +
                (isReflectSelectable
                  ? '<label class="row-select' + (isSelected ? ' is-on' : '') + '" title="このフィールドを反映JSONの対象にする">' +
                      '<input type="checkbox" data-select-field="' + escHtml(group.code) + '" aria-label="' + escHtml(String(group.label || group.code) + 'を反映JSONの対象に選択') + '"' + (isSelected ? ' checked' : '') + '> 選択</label>'
                  : '<span class="muted" title="' + escHtml(CAN_BUILD_REFLECT_JSON ? '表示専用・同一・レイアウト参照のみのため反映対象にできません' : REFLECT_JSON_BLOCK_REASON) + '">' +
                      (CAN_BUILD_REFLECT_JSON ? '反映対象外' : '反映利用不可') + '</span>') +
              '</div>' +
              '<div class="fc-title">' + escHtml(group.label) + '</div>' +
              '<div class="fc-sub">' + escHtml(fieldTypeDisplayLabel(group.type)) + (group.parentTableCode ? ' / テーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
              '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
              '<button type="button" class="btn' + (isActive ? ' primary' : '') + '" data-field-select="' + escHtml(group.code) + '" aria-label="' + escHtml(String(group.label || group.code) + (group.diffCount ? 'の設定差分を開く' : 'の設定を開く')) + '">' + escHtml(group.diffCount ? '設定差分を開く' : '設定を開く') + '</button>' +
            '</article>';
          }).join('') : '<div class="no-diff">この種別に該当するフィールドがありません。</div>') +
        '</div>' +
      '</div>' +
    '</div>';
    root.querySelectorAll('[data-field-status-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.getAttribute('data-field-status-chip') || 'all';
        fieldStatusFilterValue = fieldStatusFilterValue === next ? 'all' : next;
        renderSettingsLikeView();
      });
    });
    if (nav) {
      visibleGroups.forEach((group, idx) => {
        const navItem = document.createElement('button');
        navItem.type = 'button';
        navItem.className = 'nav-item' + (group.code === activeFieldCode ? ' active' : '');
        if (group.code === activeFieldCode) navItem.setAttribute('aria-current', 'true');
        navItem.innerHTML = '<span>' + escHtml(group.code) + '</span><span class="badge">' + String(group.diffCount || 0) + '</span>';
        navItem.onclick = () => {
          activeFieldCode = group.code;
          renderSettingsLikeView();
          const el = document.getElementById('field_card_' + idx);
          if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'nearest' });
        };
        nav.appendChild(navItem);
      });
    }
    bindFieldSelectionButtons(root, renderSettingsLikeView);
    syncFieldDetailModal(modelForView, { hideSame });
  }

  function getActiveReportTab() {
    const btn = document.querySelector('.settings-tab:not(.passive)[data-report-tab]');
    return btn ? btn.getAttribute('data-report-tab') : 'diff';
  }

  function renderSettingsLikeViewLegacy() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    const filtered = REPORT_ROWS.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      return rowMatches(row, keyword);
    });
    const fieldRows = filtered.filter((row) => row.sectionKey === FIELD_SECTION_KEY);
    updateStats(fieldRows);
    const nav = document.getElementById('nav');
    if (nav) nav.innerHTML = '';
    if (!fieldRows.length) {
      root.innerHTML = '<div class="no-diff">フィールド設定の差分がありません。比較対象セクションに「フィールド設定」を含めて出力するか、検索・「同一を隠す」を調整してください。</div>';
      return;
    }
    const groups = groupFieldSettingsRows(fieldRows);
    const Kuc = getKuc();
    const useKuc = !!Kuc && !document.body.classList.contains('dark');

    function buildLegendHtml(kucOn) {
      let h = '<div class="sl-legend" role="note">';
      if (kucOn) {
        h += '<span><strong>フィールド設定のみ</strong> · kintone UI Component（KUC）' + KUC_SEMVER + ' の FieldGroup / TextArea で、管理画面のフォームに近い見た目にしています（CDN読込が必要です）。</span>';
      } else {
        h += '<span><strong>フィールド設定のみ</strong> · フィールド単位で項目ごとに比較します。KUC が読み込めない環境・ダークテーマ時はこのレイアウトになります。</span>';
      }
      h += '<span><i class="sl-dot sl-dot--src"></i> 比較元のみ（青）</span>';
      h += '<span><i class="sl-dot sl-dot--tgt"></i> 比較先のみ（緑）</span>';
      h += '<span><i class="sl-dot sl-dot--chg"></i> 変更・移動（黄）</span>';
      if (!hideSame) h += '<span><i class="sl-dot sl-dot--same"></i> 同一</span>';
      h += '</div>';
      return h;
    }

    if (useKuc) {
      root.innerHTML = '';
      const board = document.createElement('div');
      board.className = 'sl-board sl-board--kuc';
      board.innerHTML = buildLegendHtml(true);
      groups.forEach((g, idx) => {
        const info0 = g.info;
        const headLine = info0 ? summarizeFieldGroupHeader(g.rows, info0) : 'その他（パス単位）';
        const navLabel = info0 ? info0.activeCode : 'その他';
        const inner = document.createElement('div');
        inner.className = 'sl-kuc-fg-inner';
        g.rows.forEach((row) => {
          const info = extractFieldPathInfo(row.path);
          const tone = settingsTone(row);
          const badge = diffTypeLabel(row.type, row.moved);
          const propTitle = fieldChangePropTitle(info, row);
          const wrap = document.createElement('div');
          wrap.className = 'sl-kuc-row sl-item--' + tone;
          const top = document.createElement('div');
          top.className = 'sl-kuc-row-head';
          const b = document.createElement('span');
          b.className = 'sl-badge';
          b.textContent = badge;
          const title = document.createElement('span');
          title.className = 'sl-prop-name';
          title.title = row.path || '';
          title.textContent = propTitle;
          top.appendChild(b);
          top.appendChild(title);
          wrap.appendChild(top);
          const sub = document.createElement('div');
          sub.className = 'sl-path sl-path--sub';
          sub.title = row.path || '';
          sub.textContent = row.path || '-';
          wrap.appendChild(sub);
          const metaHost = document.createElement('div');
          metaHost.className = 'sl-kuc-meta';
          metaHost.innerHTML = renderRowMeta(row);
          wrap.appendChild(metaHost);
          const pair = document.createElement('div');
          const pairSide = activeViewSide();
          pair.className = 'sl-kuc-pair' + (pairSide ? ' sl-kuc-pair--solo' : '');
          if (pairSide !== 'target') {
            const leftTa = new Kuc.TextArea({
              label: '比較元',
              value: formatFieldValuePlain(row.left),
              disabled: true,
              requiredIcon: false
            });
            pair.appendChild(leftTa);
          }
          if (pairSide !== 'source') {
            const rightTa = new Kuc.TextArea({
              label: '比較先',
              value: formatFieldValuePlain(row.right),
              disabled: true,
              requiredIcon: false
            });
            pair.appendChild(rightTa);
          }
          wrap.appendChild(pair);
          inner.appendChild(wrap);
        });
        const fg = new Kuc.FieldGroup({
          label: headLine + '（' + g.rows.length + ' 件）',
          expanded: true,
          content: inner
        });
        fg.id = 'slg_' + idx;
        fg.className = 'sl-kuc-field-group';
        board.appendChild(fg);
        if (nav) {
          const navItem = document.createElement('button');
          navItem.type = 'button';
          navItem.className = 'nav-item';
          navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
          navItem.onclick = () => {
            const el = document.getElementById('slg_' + idx);
            if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
          };
          nav.appendChild(navItem);
        }
      });
      root.appendChild(board);
      return;
    }

    let html = '<div class="sl-board">';
    html += buildLegendHtml(false);
    groups.forEach((g, idx) => {
      const info0 = g.info;
      const headLine = info0 ? summarizeFieldGroupHeader(g.rows, info0) : 'その他（パス単位）';
      const navLabel = info0 ? info0.activeCode : 'その他';
      html += '<section class="sl-group" id="slg_' + idx + '">';
      html += '<header class="sl-group-head"><span class="sl-group-title">' + escHtml(headLine) + '</span>';
      html += '<span class="sl-group-count">' + g.rows.length + ' 件</span></header>';
      html += '<div class="sl-items">';
      g.rows.forEach((row) => {
        const info = extractFieldPathInfo(row.path);
        const tone = settingsTone(row);
        const badge = diffTypeLabel(row.type, row.moved);
        const propTitle = fieldChangePropTitle(info, row);
        html += '<article class="sl-item sl-item--' + tone + ' sl-item--prop">';
        html += '<div class="sl-item-top">';
        html += '<span class="sl-badge">' + escHtml(badge) + '</span>';
        html += '<div class="sl-prop-name" title="' + escHtml(row.path || '-') + '">' + escHtml(propTitle) + '</div>';
        html += '</div>';
        html += '<div class="sl-path sl-path--sub" title="' + escHtml(row.path || '-') + '">' + escHtml(row.path || '-') + '</div>';
        html += renderRowMeta(row);
        // referenceTable / lookup のパスなら日本語キー + 差分色付きのキー値表で比較する
        const kvKind = /\\.referenceTable(\\.|$)/.test(row.path || '') ? 'referenceTable'
          : (/\\.lookup(\\.|$)/.test(row.path || '') ? 'lookup' : '');
        const slSide = activeViewSide();
        html += '<div class="sl-pair' + (slSide ? ' sl-pair--solo' : '') + '">';
        if (slSide !== 'target') {
          html += '<div class="sl-pair-col"><div class="sl-pane-h">比較元</div><div class="sl-pane sl-pane--src sl-pane--kv">' + formatFieldValueBrief(row.left, { kind: kvKind, counterpart: row.right, side: 'src' }) + '</div></div>';
        }
        if (slSide !== 'source') {
          html += '<div class="sl-pair-col"><div class="sl-pane-h">比較先</div><div class="sl-pane sl-pane--tgt sl-pane--kv">' + formatFieldValueBrief(row.right, { kind: kvKind, counterpart: row.left, side: 'tgt' }) + '</div></div>';
        }
        html += '</div></article>';
      });
      html += '</div></section>';
      if (nav) {
        const navItem = document.createElement('button');
        navItem.type = 'button';
        navItem.className = 'nav-item';
        navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
        navItem.onclick = () => {
          const el = document.getElementById('slg_' + idx);
          if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
        };
        nav.appendChild(navItem);
      }
    });
    html += '</div>';
    root.innerHTML = html;
  }

  function updateStats(rows) {
    let added = 0;
    let removed = 0;
    let changed = 0;
    let moved = 0;
    let same = 0;
    for (const row of rows) {
      if (row.type === 'same') same += 1;
      else if (row.type === 'added') added += 1;
      else if (row.type === 'removed') removed += 1;
      else if (row.moved || row.type === 'moved') moved += 1;
      else changed += 1;
    }
    document.getElementById('stat-total').textContent = String(rows.length);
    document.getElementById('stat-added').textContent = String(added);
    document.getElementById('stat-removed').textContent = String(removed);
    document.getElementById('stat-changed').textContent = String(changed);
    document.getElementById('stat-moved').textContent = String(moved);
    document.getElementById('stat-same').textContent = String(same);
  }

  function setActiveTab(tabName) {
    const KNOWN_TABS = ['diff', 'settingsLike'];
    const requestedTab = KNOWN_TABS.indexOf(tabName) >= 0 ? tabName : 'diff';
    const nextTab = !HAS_COMPARED_CONTENT && requestedTab === 'settingsLike' ? 'diff' : requestedTab;
    document.querySelectorAll('[data-report-tab]').forEach((btn) => {
      const active = btn.getAttribute('data-report-tab') === nextTab;
      btn.classList.toggle('passive', !active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });
    document.querySelectorAll('[data-report-pane]').forEach((pane) => {
      pane.hidden = pane.getAttribute('data-report-pane') !== nextTab;
    });
    if (nextTab !== 'settingsLike') closeFieldDetailModal();
    safeStorageSet(ACTIVE_TAB_KEY, nextTab);
    if (nextTab === 'settingsLike') renderSettingsLikeView();
    else render();
  }

  function cancelScheduledReportSearch() {
    if (reportSearchTimer) {
      clearTimeout(reportSearchTimer);
      reportSearchTimer = 0;
    }
    if (reportSearchFrame) {
      window.cancelAnimationFrame(reportSearchFrame);
      reportSearchFrame = 0;
    }
  }

  function setReportRenderBusy(busy) {
    const main = document.getElementById('main');
    if (main) main.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function syncReportFilterStatus(viewState) {
    const status = document.getElementById('reportFilterStatus');
    if (!status || !viewState) return;
    const message = '表示 ' + viewState.visibleRows.length + '件、全体 ' + viewState.scopeRows.length
      + '件、未確認 ' + viewState.progress.pending + '件';
    if (status.textContent !== message) status.textContent = message;
  }

  function finishReportRender(viewState) {
    setReportRenderBusy(false);
    syncReportFilterStatus(viewState);
  }

  function applyReportFilterChange() {
    render();
    if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  }

  function onReportFilterChange() {
    cancelScheduledReportSearch();
    applyReportFilterChange();
  }

  function scheduleReportSearchRender() {
    cancelScheduledReportSearch();
    setReportRenderBusy(true);
    reportSearchTimer = window.setTimeout(() => {
      reportSearchTimer = 0;
      reportSearchFrame = window.requestAnimationFrame(() => {
        reportSearchFrame = 0;
        applyReportFilterChange();
      });
    }, REPORT_SEARCH_DEBOUNCE_MS);
  }

  function rowStateKey(row) {
    return String(row._reviewKey || row._id || ((row.sectionKey || '') + '|' + (row.path || '') + '|' + (row.type || '')));
  }

  function typeFilterMatches(row) {
    if (typeFilterValue === 'all') return true;
    if (typeFilterValue === 'moved') return !!row.moved;
    if (typeFilterValue === 'changed') return !row.moved && row.type !== 'moved' && row.type !== 'same' && row.type !== 'added' && row.type !== 'removed';
    return row.type === typeFilterValue;
  }

  function sectionFilterMatches(row) {
    if (sectionFilterValue === 'all') return true;
    return String(row && (row.sectionKey || row.section) || '') === sectionFilterValue;
  }

  function buildReviewQueueHtml(rows) {
    const progress = reviewProgressOf(rows);
    const pending = progress.actionable.filter((row) => !reviewedKeys.has(rowStateKey(row)));
    const samples = pending.slice(0, 3);
    const headline = pending.length
      ? '未確認の差分を上から確認できます'
      : '現在の対象はすべて確認済みです';
    return '<section class="review-queue review-queue--' + (pending.length ? 'pending' : 'clear') + '" aria-labelledby="reviewQueueTitle" tabindex="-1">'
      + '<div class="review-queue-mark" aria-hidden="true">' + (pending.length ? '→' : '✓') + '</div>'
      + '<div class="review-queue-main">'
      +   '<span class="review-queue-kicker">レビュー受信箱</span>'
      +   '<strong id="reviewQueueTitle">' + escHtml(headline) + '</strong>'
      +   '<span class="review-queue-note">未確認 ' + pending.length + '件 / レビュー対象 ' + progress.total + '件。判断による並び替えをせず、レポートの定義順で表示します。</span>'
      +   '<div class="review-progress review-progress--queue">'
      +     '<div class="review-progress-copy"><span>確認済み</span><strong>' + progress.reviewed + ' / ' + progress.total + '（' + progress.percent + '%）</strong></div>'
      +     '<div class="review-progress-track" role="progressbar" aria-label="レビュー進捗" aria-valuemin="0" aria-valuemax="' + progress.total + '" aria-valuenow="' + progress.reviewed + '" aria-valuetext="確認済み ' + progress.reviewed + '件 / 全 ' + progress.total + '件（' + progress.percent + '%）"><span style="width:' + progress.percent + '%"></span></div>'
      +   '</div>'
      +   (samples.length ? '<div class="review-queue-samples" aria-label="次に確認する差分">' + samples.map((row) => '<button type="button" data-review-jump="' + escHtml(rowStateKey(row)) + '">' + escHtml(reportRowTitle(row)) + '</button>').join('') + '</div>' : '')
      + '</div>'
      + '</section>';
  }

  function buildActiveFiltersHtml(keyword, hideSame, hideReviewed) {
    const chips = [];
    const typeLabels = { added: '比較先のみ', removed: '比較元のみ', changed: '内容が異なる', moved: '並び順が異なる', same: '同じ' };
    if (typeFilterValue !== 'all') chips.push(['type', '種別: ' + (typeLabels[typeFilterValue] || typeFilterValue)]);
    if (sectionFilterValue !== 'all') chips.push(['section', 'セクション: ' + (SECTION_LABEL_MAP[sectionFilterValue] || sectionFilterValue)]);
    if (keyword) chips.push(['search', '検索: ' + keyword]);
    if (hideSame) chips.push(['hideSame', '同一を非表示']);
    if (hideReviewed) chips.push(['hideReviewed', '確認済みを非表示']);
    const extraIgnoreInput = document.getElementById('extraIgnoreKeys');
    if (extraIgnoreInput && String(extraIgnoreInput.value || '').trim()) chips.push(['extraIgnore', '追加の無視キー']);
    if (activePresetKeys.size) chips.push(['presets', '追加プリセット ' + activePresetKeys.size + '件']);
    if (!chips.length) {
      return '<div class="active-filters active-filters--empty"><span class="active-filters-label">適用中</span><span>絞り込みなし</span></div>';
    }
    return '<div class="active-filters" aria-label="適用中の絞り込み">'
      + '<span class="active-filters-label">適用中</span>'
      + chips.map((item) => '<button type="button" class="active-filter-chip" data-clear-filter="' + item[0] + '" aria-label="' + escHtml(item[1] + 'を解除') + '">'
        + escHtml(item[1]) + '<span aria-hidden="true">×</span></button>').join('')
      + '<button type="button" class="active-filter-clear" data-clear-filter="all">一覧条件をすべて解除</button>'
      + '</div>';
  }

  function sortRowsForDisplay(rows) {
    if (diffSortValue === 'standard') return rows;
    const typeOrder = { removed: 0, added: 1, changed: 2, same: 3 };
    return rows.slice().sort((a, b) => {
      const d = ((typeOrder[a.type] != null ? typeOrder[a.type] : 9) - (typeOrder[b.type] != null ? typeOrder[b.type] : 9));
      if (d) return d;
      return String(a.path || '').localeCompare(String(b.path || ''));
    });
  }

  function buildToolbarHtml(rows, hideSame, hideReviewed, shownCount, keyword, scopeCount, pendingCount) {
    const s = summarizeGroupRows(rows);
    const chips = [
      { key: 'all', label: 'すべて', count: rows.length },
      { key: 'added', label: '比較先のみ', count: s.added },
      { key: 'removed', label: '比較元のみ', count: s.removed },
      { key: 'changed', label: '内容が異なる', count: s.changed }
    ];
    if (s.moved) chips.push({ key: 'moved', label: '並び順が異なる', count: s.moved });
    if (!hideSame) chips.push({ key: 'same', label: '同じ', count: s.same });
    const sortOptions = [
      ['standard', '標準（定義順）'],
      ['type', '存在状況・差分内容順']
    ];
    const sectionKeys = [...new Set(rows.map((row) => String(row && (row.sectionKey || row.section) || '')).filter(Boolean))];
    const sectionOptions = [['all', 'すべてのセクション']].concat(sectionKeys.map((key) => [key, SECTION_LABEL_MAP[key] || key]));
    const sourceContextLabel = String((REPORT_META.source.appName ? REPORT_META.source.appName + ' · ' : '') + 'App ' + (REPORT_META.source.appId || '-'));
    const targetContextLabel = String((REPORT_META.target.appName ? REPORT_META.target.appName + ' · ' : '') + 'App ' + (REPORT_META.target.appId || '-'));
    return '<div class="diff-toolbar" role="toolbar" aria-label="差分一覧の絞り込みと並び替え">'
      + '<div class="diff-toolbar-heading">'
      +   '<div class="diff-toolbar-title"><strong>差分レビュー</strong><span>絞り込み・移動・表示密度</span></div>'
      +   '<div class="diff-scope-counts" aria-label="差分件数">'
      +     '<span>全体 <b>' + scopeCount + '</b></span>'
      +     '<span>表示中 <b>' + shownCount + '</b></span>'
      +     '<span>未確認 <b>' + pendingCount + '</b></span>'
      +   '</div>'
      +   '<button type="button" class="mobile-toolbar-toggle" data-mobile-toolbar-toggle aria-expanded="' + (mobileToolbarExpanded ? 'true' : 'false') + '" aria-controls="diffToolbarFilters diffToolbarSort">' + (mobileToolbarExpanded ? '条件を閉じる' : '条件を開く') + '</button>'
      + '</div>'
      + '<div class="focus-context" aria-label="集中表示中の比較対象">'
      +   '<span class="focus-context-pair" title="' + escHtml(sourceContextLabel + ' → ' + targetContextLabel) + '"><span class="focus-context-side"><small>BEFORE</small><b>' + escHtml(sourceContextLabel) + '</b></span><i aria-hidden="true">→</i><span class="focus-context-side"><small>AFTER</small><b>' + escHtml(targetContextLabel) + '</b></span></span>'
      +   '<span class="focus-context-stat">現在 <strong id="focusContextPosition">0 / 0</strong></span>'
      +   '<span class="focus-context-stat">未確認 <strong>' + pendingCount + '</strong></span>'
      + '</div>'
      + '<div id="diffToolbarFilters" class="diff-toolbar-row diff-toolbar-row--filters">'
      + '<span class="diff-toolbar-label">種別</span>'
      + chips.map((c) =>
        '<button type="button" class="tchip tchip--' + c.key + (typeFilterValue === c.key ? ' is-active' : '') + '" data-type-chip="' + c.key + '" aria-pressed="' + (typeFilterValue === c.key ? 'true' : 'false') + '">'
        + c.label + '<b>' + c.count + '</b></button>'
      ).join('')
      + '<span class="diff-toolbar-spacer"></span>'
      + '<label class="diff-sort">セクション <select id="diffSectionSel" aria-label="セクションで絞り込み">'
      + sectionOptions.map((o) => '<option value="' + escHtml(o[0]) + '"' + (sectionFilterValue === o[0] ? ' selected' : '') + '>' + escHtml(o[1]) + '</option>').join('')
      + '</select></label>'
      + '</div>'
      + '<div class="diff-toolbar-row diff-toolbar-row--navigation">'
      + '<span class="diff-toolbar-label">確認順</span>'
      + '<button type="button" class="tchip" data-diff-nav="prev" title="前の差分へ移動（k キー）" aria-label="前の差分へ移動">前へ</button>'
      + '<span id="diffNavPosition" class="diff-nav-position" role="status" aria-live="polite" aria-atomic="true">現在位置 0 / 0' + DIFF_NAV_RANGE_NOTE + '</span>'
      + '<button type="button" class="tchip" data-diff-nav="next" title="次の差分へ移動（j キー）" aria-label="次の差分へ移動">次へ</button>'
      + '<span class="diff-toolbar-spacer"></span>'
      + '<label id="diffToolbarSort" class="diff-sort">並び順 <select id="diffSortSel">'
      + sortOptions.map((o) => '<option value="' + o[0] + '"' + (diffSortValue === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('')
      + '</select></label>'
      + '<div class="diff-display-modes" aria-label="表示モード">'
      +   '<button type="button" class="tchip" data-density-toggle aria-pressed="' + (compactDensityEnabled ? 'true' : 'false') + '">' + (compactDensityEnabled ? '密度: コンパクト' : '密度: 標準') + '</button>'
      +   '<button type="button" class="tchip" data-focus-mode aria-pressed="' + (focusModeEnabled ? 'true' : 'false') + '">' + (focusModeEnabled ? '集中表示を終了' : '集中表示') + '</button>'
      + '</div>'
      + '</div>'
      + buildActiveFiltersHtml(keyword, hideSame, hideReviewed)
      + '</div>';
  }

  function sectionCountChips(s) {
    const parts = [];
    if (s.added) parts.push('<span class="cnt cnt--add" title="比較先のみ ' + s.added + '件">比較先のみ ' + s.added + '</span>');
    if (s.removed) parts.push('<span class="cnt cnt--del" title="比較元のみ ' + s.removed + '件">比較元のみ ' + s.removed + '</span>');
    if (s.changed) parts.push('<span class="cnt cnt--chg" title="内容が異なる ' + s.changed + '件">内容差 ' + s.changed + '</span>');
    if (s.same) parts.push('<span class="cnt cnt--same" title="内容は同じ ' + s.same + '件">同じ ' + s.same + '</span>');
    if (!parts.length) parts.push('<span class="cnt cnt--same">0件</span>');
    return parts.join('');
  }

  function renderAggChildrenHtml(row, useCharDiff) {
    const kids = (row.__childRows || []).filter((kid) => kid.type !== 'same');
    if (!kids.length) return '';
    return '<div class="agg-list">' + kids.map((kid) => {
      const info = extractFieldPathInfo(kid.path);
      const title = fieldChangePropTitle(info, kid);
      const tc = kid.type === 'added' ? 'added' : kid.type === 'removed' ? 'removed' : 'changed';
      return '<div class="agg-item">'
        + '<div class="agg-item-head">'
        +   '<span class="mini-chip mini-chip--' + tc + '">' + escHtml(diffTypeLabel(kid.type, kid.moved)) + '</span>'
        +   '<span class="agg-prop" title="' + escHtml(kid.path || '-') + '">' + escHtml(title) + '</span>'
        + '</div>'
        + '<div class="agg-val">' + renderValueArea(kid, useCharDiff) + '</div>'
        + '</div>';
    }).join('') + '</div>';
  }

  function renderDiffRowHtml(row, useCharDiff) {
    const typeClass = row.type === 'same' ? 'same' : (row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed'));
    const key = rowStateKey(row);
    rowLookup.set(key, row);
    const hasDiffKids = !isRawJsonMode() && !!(row.__childRows && row.__childRows.some((kid) => kid.type !== 'same'));
    let valueHtml = '';
    if (hasDiffKids) {
      valueHtml = renderAggChildrenHtml(row, useCharDiff);
    } else if (row.type === 'same' && !isInlineText(safeText(row.left))) {
      // 大きな同一値は折りたたみ、要求時のみ展開してノイズを抑える
      valueHtml = expandedVals.has(key)
        ? renderValueArea(row, useCharDiff) + '<button type="button" class="val-reveal" data-row-toggle="' + escHtml(key) + '">内容を隠す ▴</button>'
        : '<button type="button" class="val-reveal" data-row-toggle="' + escHtml(key) + '">同一の内容を表示 ▾</button>';
    } else {
      valueHtml = renderValueArea(row, useCharDiff);
    }
    if (valueHtml && !hasDiffKids && row.type !== 'same') {
      valueHtml = wrapLongValueHtml(row, valueHtml);
    }
    const reviewed = isReviewRowComplete(row);
    const selected = selectedRows.has(key);
    const focused = key === diffFocusKey;
    const rowItemLabel = reportRowTitle(row);
    const actionsHtml = '<span class="drow-actions">'
      + '<button type="button" class="row-act" data-copy-path="' + escHtml(row.path || '') + '" title="設定パスをコピー" aria-label="' + escHtml(rowItemLabel + 'の設定パスをコピー') + '">パス</button>'
      + '<button type="button" class="row-act" data-copy-row="' + escHtml(key) + '" title="比較元・比較先の値をJSONでコピー" aria-label="' + escHtml(rowItemLabel + 'の比較元・比較先の値をコピー') + '">コピー</button>'
      + (row.type !== 'same'
          ? (CAN_BUILD_REFLECT_JSON && row.type !== 'same' && !row._displayOnly && !row._nonActionable
          ? '<label class="row-select' + (selected ? ' is-on' : '') + '" title="この差分を反映JSONの対象にする">'
            + '<input type="checkbox" data-select-toggle="' + escHtml(key) + '" aria-label="' + escHtml(rowItemLabel + 'を反映JSONの対象に選択') + '"' + (selected ? ' checked' : '') + '> 選択'
            + '</label>'
          : '')
          + (!row._displayOnly && !reviewed
            ? '<button type="button" class="row-review-next" data-review-next="' + escHtml(key) + '" title="確認済みにして次の未確認差分へ移動（Rキー）" aria-label="' + escHtml(rowItemLabel + 'を確認済みにして次へ') + '">確認して次へ</button>'
            : '')
          + (!row._displayOnly
            ? '<label class="row-reviewed' + (reviewed ? ' is-on' : '') + '" title="確認済みにする（サイドバーの「確認済みを隠す」と連動）">'
              + '<input type="checkbox" data-review-toggle="' + escHtml(key) + '" aria-label="' + escHtml(rowItemLabel + 'を確認済みにする') + '"' + (reviewed ? ' checked' : '') + '> 確認済み'
              + '</label>'
            : '<span class="row-display-only" title="取得状況などを示す表示専用行です">表示専用</span>')
        : '')
      + '</span>';
    return '<article class="drow drow--' + typeClass + (reviewed ? ' drow--reviewed' : '') + (focused ? ' drow--focus' : '') + '"'
      + ' tabindex="-1" data-diff-row-key="' + escHtml(key) + '" aria-current="' + (focused ? 'true' : 'false') + '"'
      + ' aria-label="' + escHtml(rowExistenceLabel(row) + '・' + rowDifferenceLabel(row) + ': ' + reportRowTitle(row)) + '">'
      + '<div class="drow-head">'
      +   '<span class="drow-facts">' + renderRowFacts(row) + '</span>'
      +   '<div class="drow-title">' + renderPathCell(row) + '</div>'
      +   actionsHtml
      + '</div>'
      + (valueHtml ? '<div class="drow-val">' + valueHtml + '</div>' : '')
      + '</article>';
  }

  function getReportViewState() {
    const hideSame = !!(document.getElementById('hideSame') || {}).checked;
    const hideReviewed = !!(document.getElementById('hideReviewed') || {}).checked;
    const keywordRaw = String((document.getElementById('search') || {}).value || '').trim();
    const keyword = keywordRaw.toLowerCase();
    const scopeRows = getDetailFilteredRows();
    const filterBaseRows = scopeRows.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      if (hideReviewed && row.type !== 'same' && reviewedKeys.has(rowStateKey(row))) return false;
      return rowMatches(row, keyword);
    });
    const visibleRows = filterBaseRows.filter(sectionFilterMatches).filter(typeFilterMatches);
    return {
      hideSame,
      hideReviewed,
      keywordRaw,
      scopeRows,
      filterBaseRows,
      visibleRows,
      progress: reviewProgressOf(scopeRows)
    };
  }

  function render() {
    cancelScheduledReportSearch();
    setReportRenderBusy(true);
    const viewState = getReportViewState();
    const hideSame = viewState.hideSame;
    const useCharDiff = !!(document.getElementById('charDiff')).checked;
    const filteredAll = viewState.filterBaseRows;
    const filtered = viewState.visibleRows;
    updateStats(filtered);
    syncReviewedStat(viewState.scopeRows);
    if (getActiveReportTab() !== 'diff') {
      finishReportRender(viewState);
      return;
    }

    const nav = document.getElementById('nav');
    const main = document.getElementById('main');
    nav.innerHTML = '';
    rowLookup.clear();

    let html = '<div id="reviewQueueHost">' + buildReviewQueueHtml(viewState.scopeRows) + '</div>'
      + buildToolbarHtml(
        filteredAll,
        hideSame,
        viewState.hideReviewed,
        filtered.length,
        viewState.keywordRaw,
        viewState.scopeRows.length,
        viewState.progress.pending
      );

    if (!filtered.length) {
      diffNavigationTargets = [];
      diffFocusKey = '';
      diffFocusIndex = -1;
      html += '<div class="no-diff"><strong>この条件に該当する行はありません</strong><span>上の適用中フィルターから条件を1つずつ解除するか、「一覧条件をすべて解除」を選んでください。</span><button type="button" class="btn" data-clear-filter="all">一覧条件をすべて解除</button></div>';
      main.innerHTML = html;
      scheduleDiffStickyOffsetSync();
      syncDiffNavPosition();
      finishReportRender(viewState);
      return;
    }

    const groups = groupBySection(filtered);
    const sectionReviewProgress = new Map();
    viewState.scopeRows.filter(isActionableReviewRow).forEach((row) => {
      const sectionKey = row.sectionKey || row.section || '未分類';
      const progress = sectionReviewProgress.get(sectionKey) || { reviewed: 0, total: 0 };
      progress.total += 1;
      if (reviewedKeys.has(rowStateKey(row))) progress.reviewed += 1;
      sectionReviewProgress.set(sectionKey, progress);
    });
    const nextNavigationTargets = [];
    const seenNavigationKeys = new Set();
    groups.forEach((g, idx) => {
      const secId = 'sec_' + idx;
      const collapsedNow = collapsed.has(g.key);
      const displayRows = sortRowsForDisplay(!isRawJsonMode() && g.key === FIELD_SECTION_KEY ? collapseFieldRowsForDiffTable(g.rows) : g.rows);
      const groupSummary = summarizeGroupRows(displayRows);
      const reviewProgress = sectionReviewProgress.get(g.key) || { reviewed: 0, total: 0 };
      const reviewComplete = reviewProgress.total > 0 && reviewProgress.reviewed === reviewProgress.total;
      const reviewProgressHtml = reviewProgress.total
        ? '<span class="sec-review-progress' + (reviewComplete ? ' is-complete' : '') + '" title="このセクションのレビュー進捗">' + (reviewComplete ? '✓ ' : '') + reviewProgress.reviewed + ' / ' + reviewProgress.total + '</span>'
        : '';
      const navItem = document.createElement('button');
      navItem.type = 'button';
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="nav-item-meta">' + reviewProgressHtml + '<span class="badge">' + groupSummary.diffCount + '</span></span>';
      navItem.onclick = () => {
        collapsed.delete(g.key);
        render();
        setTimeout(() => {
          const el = document.getElementById(secId);
          if (el) el.scrollIntoView({ behavior: preferredScrollBehavior(), block: 'start' });
        }, 20);
      };
      nav.appendChild(navItem);

      const diffRows = displayRows.filter((row) => row.type !== 'same');
      const sameRows = displayRows.filter((row) => row.type === 'same');
      const fieldJsonParts = isRawJsonMode() && g.key === FIELD_SECTION_KEY ? buildFieldJsonGroups(diffRows) : null;
      const navigationRows = fieldJsonParts
        ? fieldJsonParts.groups.map((group) => group.reviewRow).concat(fieldJsonParts.passthrough)
        : diffRows;
      navigationRows.filter((row) => !row._displayOnly).forEach((row) => {
        const key = rowStateKey(row);
        if (!key || seenNavigationKeys.has(key)) return;
        seenNavigationKeys.add(key);
        nextNavigationTargets.push({ key, sectionKey: g.key });
      });
      html += '<section class="sec" id="' + secId + '">';
      html += '<div class="sec-head" data-sec-toggle="' + escHtml(g.key) + '" role="button" tabindex="0" aria-expanded="' + (collapsedNow ? 'false' : 'true') + '">'
        + '<span class="sec-head-title"><span class="sec-caret">' + (collapsedNow ? '▶' : '▼') + '</span>' + escHtml(g.label) + '</span>'
        + '<span class="sec-counts">' + reviewProgressHtml + sectionCountChips(groupSummary) + '</span>'
        + '</div>';
      if (!collapsedNow && isRawJsonMode() && g.key === FIELD_SECTION_KEY) {
        // JSONで比較: フィールド単位に区切り、設定JSON全体を左右比較する
        const parts = fieldJsonParts;
        html += '<div class="fj-list">';
        html += parts.groups.map((grp) => renderFieldJsonBlockHtml(grp, useCharDiff)).join('');
        html += parts.passthrough.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        if (!parts.groups.length && !parts.passthrough.length) {
          html += '<div class="drow-empty">表示対象のフィールドがありません。</div>';
        }
        if (sameRows.length) {
          html += '<div class="fj-same-note">差分のない設定 ' + sameRows.length + '件はJSON比較では表示していません。</div>';
        }
        html += '</div>';
      } else if (!collapsedNow) {
        html += '<div class="drow-list">';
        html += diffRows.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        if (sameRows.length && typeFilterValue !== 'same') {
          const openNow = sameOpen.has(g.key);
          html += '<button type="button" class="same-fold" data-same-fold="' + escHtml(g.key) + '" aria-expanded="' + (openNow ? 'true' : 'false') + '">'
            + '<span class="sec-caret">' + (openNow ? '▼' : '▶') + '</span>同一の設定 ' + sameRows.length + '件を' + (openNow ? '隠す' : '表示') + '</button>';
          if (openNow) html += sameRows.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        } else if (sameRows.length) {
          html += sameRows.map((row) => renderDiffRowHtml(row, useCharDiff)).join('');
        }
        if (!diffRows.length && !sameRows.length) {
          html += '<div class="drow-empty">表示対象の行がありません。</div>';
        }
        html += '</div>';
      }
      html += '</section>';
    });
    diffNavigationTargets = nextNavigationTargets;
    if (!diffNavigationTargets.some((target) => target.key === diffFocusKey)) {
      const focusFallback = focusModeEnabled
        ? diffNavigationTargets.find((target) => {
          const row = rowLookup.get(target.key);
          return row && rowHasPendingReview(row);
        }) || diffNavigationTargets[0]
        : null;
      diffFocusKey = focusFallback ? focusFallback.key : '';
    }
    main.innerHTML = html;
    scheduleDiffStickyOffsetSync();
    focusDiffRow(diffFocusKey, { focus: false, scroll: false });
    syncDiffNavPosition();
    finishReportRender(viewState);
  }

  function reviewKeysForRow(row) {
    const keys = [];
    const add = (item) => {
      if (!isActionableReviewRow(item)) return;
      const key = rowStateKey(item);
      if (key && keys.indexOf(key) < 0) keys.push(key);
    };
    add(row);
    (row?.__childRows || []).forEach(add);
    return keys;
  }

  function isReviewRowComplete(row) {
    const key = rowStateKey(row);
    if (reviewedKeys.has(key)) return true;
    const childKeys = (row?.__childRows || [])
      .filter(isActionableReviewRow)
      .map((child) => rowStateKey(child));
    return childKeys.length > 0 && childKeys.every((childKey) => reviewedKeys.has(childKey));
  }

  function rowHasPendingReview(row) {
    return !isReviewRowComplete(row);
  }

  function renderedReviewKey(reviewKey) {
    if (diffNavigationTargets.some((target) => target.key === reviewKey)) return reviewKey;
    for (const [key, row] of rowLookup.entries()) {
      if (reviewKeysForRow(row).indexOf(reviewKey) >= 0) return key;
    }
    return '';
  }

  function nextPendingNavigationTarget(key) {
    const currentIndex = Math.max(0, diffNavigationTargets.findIndex((target) => target.key === key));
    const ordered = diffNavigationTargets.slice(currentIndex + 1).concat(diffNavigationTargets.slice(0, currentIndex));
    return ordered.find((target) => {
      const row = rowLookup.get(target.key);
      return row && rowHasPendingReview(row);
    }) || null;
  }

  function focusReviewCompletion(progress) {
    const message = progress.pending
      ? '現在の表示条件のレビューが完了しました。全体では未確認 ' + progress.pending + '件です'
      : 'すべてのレビューが完了しました';
    if (focusModeEnabled) {
      focusModeEnabled = false;
      applyDisplayModeClasses();
    }
    diffFocusKey = '';
    diffFocusIndex = -1;
    focusDiffRow('', { focus: false, scroll: false });
    syncDiffNavPosition();
    showToast(message);
    requestAnimationFrame(() => {
      const queue = document.querySelector('#reviewQueueHost .review-queue');
      if (queue && typeof queue.focus === 'function') {
        try { queue.focus({ preventScroll: true }); } catch (e) { queue.focus(); }
      }
    });
  }

  function reviewAndMoveNext(key) {
    const row = rowLookup.get(key);
    if (!row || !isActionableReviewRow(row)) return;
    const nextTarget = nextPendingNavigationTarget(key);
    reviewKeysForRow(row).forEach((reviewKey) => reviewedKeys.add(reviewKey));
    diffFocusKey = nextTarget ? nextTarget.key : '';
    render();
    const progress = syncReviewedStat(getDetailFilteredRows());
    if (!nextTarget) {
      focusReviewCompletion(progress);
      return;
    }
    requestAnimationFrame(() => {
      if (!focusDiffRow(nextTarget.key)) {
        focusReviewCompletion(progress);
        return;
      }
      syncDiffNavPosition();
      showToast('確認済みにしました。次の未確認差分へ移動しました');
    });
  }

  function applyDisplayModeClasses() {
    document.body.classList.toggle('diff-focus-mode', focusModeEnabled);
    document.body.classList.toggle('diff-density-compact', compactDensityEnabled);
    document.body.classList.toggle('mobile-toolbar-expanded', mobileToolbarExpanded);
    document.querySelectorAll('[data-focus-mode]').forEach((button) => {
      button.setAttribute('aria-pressed', focusModeEnabled ? 'true' : 'false');
      button.textContent = focusModeEnabled ? '集中表示を終了' : '集中表示';
    });
    document.querySelectorAll('[data-density-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', compactDensityEnabled ? 'true' : 'false');
      button.textContent = compactDensityEnabled ? '密度: コンパクト' : '密度: 標準';
    });
    document.querySelectorAll('[data-mobile-toolbar-toggle]').forEach((button) => {
      button.setAttribute('aria-expanded', mobileToolbarExpanded ? 'true' : 'false');
      button.textContent = mobileToolbarExpanded ? '条件を閉じる' : '条件を開く';
    });
    scheduleDiffStickyOffsetSync();
  }

  function jumpToReviewKey(key) {
    if (!key) return;
    typeFilterValue = 'all';
    sectionFilterValue = 'all';
    const search = document.getElementById('search');
    const hideReviewed = document.getElementById('hideReviewed');
    if (search) search.value = '';
    if (hideReviewed) hideReviewed.checked = false;
    const sourceRow = getDetailFilteredRows().find((row) => rowStateKey(row) === key);
    if (sourceRow) collapsed.delete(sourceRow.sectionKey || sourceRow.section || '未分類');
    diffFocusKey = '';
    render();
    requestAnimationFrame(() => {
      const renderedKey = renderedReviewKey(key);
      if (!renderedKey) {
        showToast('対象の差分を現在の表示で開けませんでした');
        return;
      }
      diffFocusKey = renderedKey;
      focusDiffRow(renderedKey);
      syncDiffNavPosition();
    });
  }

  function jumpToFirstPendingReview() {
    if (getActiveReportTab() !== 'diff') setActiveTab('diff');
    const firstPending = getDetailFilteredRows().find((row) => isActionableReviewRow(row) && rowHasPendingReview(row));
    if (!firstPending) {
      focusReviewCompletion(syncReviewedStat(getDetailFilteredRows()));
      return;
    }
    jumpToReviewKey(rowStateKey(firstPending));
  }

  function handleMainClick(e) {
    const mobileToolbarToggle = e.target.closest('[data-mobile-toolbar-toggle]');
    if (mobileToolbarToggle) {
      mobileToolbarExpanded = !mobileToolbarExpanded;
      applyDisplayModeClasses();
      return;
    }
    const reviewNext = e.target.closest('[data-review-next]');
    if (reviewNext) {
      reviewAndMoveNext(reviewNext.getAttribute('data-review-next') || '');
      return;
    }
    const reviewJump = e.target.closest('[data-review-jump]');
    if (reviewJump) {
      jumpToReviewKey(reviewJump.getAttribute('data-review-jump') || '');
      return;
    }
    const densityToggle = e.target.closest('[data-density-toggle]');
    if (densityToggle) {
      compactDensityEnabled = !compactDensityEnabled;
      applyDisplayModeClasses();
      return;
    }
    const focusModeToggle = e.target.closest('[data-focus-mode]');
    if (focusModeToggle) {
      focusModeEnabled = !focusModeEnabled;
      let focusTarget = null;
      if (focusModeEnabled) {
        focusTarget = diffNavigationTargets.find((target) => target.key === diffFocusKey)
          || diffNavigationTargets.find((target) => {
          const row = rowLookup.get(target.key);
          return row && rowHasPendingReview(row);
        }) || diffNavigationTargets[0] || null;
        if (focusTarget) {
          diffFocusKey = focusTarget.key;
          collapsed.delete(focusTarget.sectionKey);
        }
      }
      applyDisplayModeClasses();
      if (focusModeEnabled && focusTarget) {
        render();
        requestAnimationFrame(() => focusDiffRow(focusTarget.key));
      }
      return;
    }
    const clearFilter = e.target.closest('[data-clear-filter]');
    if (clearFilter) {
      const key = clearFilter.getAttribute('data-clear-filter') || '';
      const clearAll = key === 'all';
      if (clearAll || key === 'type') typeFilterValue = 'all';
      if (clearAll || key === 'section') sectionFilterValue = 'all';
      if (clearAll || key === 'search') document.getElementById('search').value = '';
      if (clearAll || key === 'hideSame') document.getElementById('hideSame').checked = false;
      if (clearAll || key === 'hideReviewed') document.getElementById('hideReviewed').checked = false;
      if (clearAll || key === 'extraIgnore') {
        const input = document.getElementById('extraIgnoreKeys');
        if (input) input.value = '';
        extraIgnoreRules = null;
      }
      if (clearAll || key === 'presets') {
        activePresetKeys.clear();
        document.querySelectorAll('[data-preset-toggle]:not(:disabled)').forEach((cb) => { cb.checked = false; });
      }
      render();
      requestAnimationFrame(() => {
        const focusTarget = key === 'type'
          ? document.querySelector('[data-type-chip="all"]')
          : key === 'section'
            ? document.getElementById('diffSectionSel')
          : document.getElementById('search');
        const visibleTarget = focusTarget && focusTarget.offsetParent !== null
          ? focusTarget
          : document.getElementById('mobileSidebarToggle');
        if (visibleTarget && typeof visibleTarget.focus === 'function') visibleTarget.focus();
      });
      return;
    }
    const chip = e.target.closest('[data-type-chip]');
    if (chip) {
      const next = chip.getAttribute('data-type-chip') || 'all';
      typeFilterValue = typeFilterValue === next ? 'all' : next;
      const focusType = typeFilterValue;
      render();
      requestAnimationFrame(() => {
        const target = document.querySelector('[data-type-chip="' + focusType + '"]');
        if (target && typeof target.focus === 'function') target.focus();
      });
      return;
    }
    const navBtn = e.target.closest('[data-diff-nav]');
    if (navBtn) {
      moveDiffFocus(navBtn.getAttribute('data-diff-nav') === 'prev' ? -1 : 1);
      return;
    }
    const copyPathBtn = e.target.closest('[data-copy-path]');
    if (copyPathBtn) {
      copyTextToClipboard(copyPathBtn.getAttribute('data-copy-path') || '', 'パスをコピーしました');
      return;
    }
    const copyValBtn = e.target.closest('[data-copy-row]');
    if (copyValBtn) {
      const row = rowLookup.get(copyValBtn.getAttribute('data-copy-row') || '');
      if (row) {
        const payload = {
          セクション: SECTION_LABEL_MAP[row.sectionKey || ''] || row.section || row.sectionKey || '',
          種別: diffTypeLabel(row.type, row.moved),
          パス: row.path || '',
          比較元: row.left === undefined ? null : row.left,
          比較先: row.right === undefined ? null : row.right
        };
        let text;
        try { text = JSON.stringify(payload, null, 2); } catch (err) { text = String(row.path || ''); }
        copyTextToClipboard(text, '差分の値をコピーしました');
      }
      return;
    }
    const fold = e.target.closest('[data-same-fold]');
    if (fold) {
      const key = fold.getAttribute('data-same-fold') || '';
      if (sameOpen.has(key)) sameOpen.delete(key);
      else sameOpen.add(key);
      render();
      return;
    }
    const reveal = e.target.closest('[data-row-toggle]');
    if (reveal) {
      const key = reveal.getAttribute('data-row-toggle') || '';
      if (expandedVals.has(key)) expandedVals.delete(key);
      else expandedVals.add(key);
      render();
      return;
    }
    const head = e.target.closest('[data-sec-toggle]');
    if (head) {
      const key = head.getAttribute('data-sec-toggle') || '';
      if (collapsed.has(key)) collapsed.delete(key);
      else collapsed.add(key);
      render();
    }
  }

  function syncThemeButtonLabel() {
    const btn = document.getElementById('themeBtn');
    if (!btn) return;
    btn.textContent = document.body.classList.contains('dark') ? 'ライトに切替' : 'ダークに切替';
  }

  function toggleTheme() {
    document.body.classList.toggle('dark');
    safeStorageSet(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
    syncThemeButtonLabel();
    if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  }

  function collapseAll() {
    if (getActiveReportTab() !== 'diff') return;
    for (const row of REPORT_ROWS) collapsed.add(row.sectionKey || row.section || '未分類');
    render();
  }

  function expandAll() {
    if (getActiveReportTab() !== 'diff') return;
    collapsed.clear();
    render();
  }

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, setActiveTab };

  function isMobileSidebarViewport() {
    return !!(window.matchMedia && window.matchMedia('(max-width: 1080px)').matches);
  }

  function isMobileSidebarOpen() {
    const aside = document.querySelector('aside');
    return !!(aside && aside.classList.contains('is-open'));
  }

  function mobileSidebarFocusable() {
    const panel = document.getElementById('sidebarPanels');
    return panel
      ? Array.from(panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], summary, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hidden && element.getClientRects().length > 0)
      : [];
  }

  function closeMobileSidebar(restoreFocus) {
    const aside = document.querySelector('aside');
    const panel = document.getElementById('sidebarPanels');
    const backdrop = document.getElementById('sidebarBackdrop');
    const main = document.querySelector('main');
    if (aside) aside.classList.remove('is-open');
    document.body.classList.remove('sidebar-drawer-open');
    if (panel) {
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      panel.removeAttribute('aria-labelledby');
    }
    if (backdrop) backdrop.hidden = true;
    if (main) main.removeAttribute('inert');
    if (mobileSidebarToggle) {
      mobileSidebarToggle.setAttribute('aria-expanded', 'false');
      mobileSidebarToggle.textContent = '条件・出力';
    }
    if (restoreFocus !== false && mobileSidebarReturnFocus && typeof mobileSidebarReturnFocus.focus === 'function') {
      mobileSidebarReturnFocus.focus();
    }
    window.scrollTo(0, mobileSidebarScrollY);
    mobileSidebarReturnFocus = null;
  }

  function openMobileSidebar() {
    if (!isMobileSidebarViewport()) return;
    const aside = document.querySelector('aside');
    const panel = document.getElementById('sidebarPanels');
    const backdrop = document.getElementById('sidebarBackdrop');
    const main = document.querySelector('main');
    if (!aside || !panel) return;
    mobileSidebarReturnFocus = document.activeElement;
    mobileSidebarScrollY = window.scrollY || 0;
    aside.classList.add('is-open');
    document.body.classList.add('sidebar-drawer-open');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'sidebarDrawerTitle');
    if (backdrop) backdrop.hidden = false;
    if (main) main.setAttribute('inert', '');
    if (mobileSidebarToggle) {
      mobileSidebarToggle.setAttribute('aria-expanded', 'true');
      mobileSidebarToggle.textContent = '閉じる';
    }
    requestAnimationFrame(() => {
      const closeButton = document.getElementById('sidebarDrawerClose');
      const first = closeButton || mobileSidebarFocusable()[0] || panel;
      if (first && typeof first.focus === 'function') first.focus();
      window.scrollTo(0, mobileSidebarScrollY);
    });
  }

  window.addEventListener('resize', () => {
    scheduleDiffStickyOffsetSync();
    if (!isMobileSidebarViewport() && isMobileSidebarOpen()) closeMobileSidebar(false);
  });

  const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
  if (mobileSidebarToggle) {
    mobileSidebarToggle.onclick = () => {
      if (isMobileSidebarOpen()) closeMobileSidebar(true);
      else openMobileSidebar();
    };
  }
  const mobileSidebarClose = document.getElementById('sidebarDrawerClose');
  if (mobileSidebarClose) mobileSidebarClose.onclick = () => closeMobileSidebar(true);
  const mobileSidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (mobileSidebarBackdrop) mobileSidebarBackdrop.onclick = () => closeMobileSidebar(true);

  document.getElementById('hideSame').onchange = onReportFilterChange;
  document.getElementById('charDiff').onchange = onReportFilterChange;
  document.getElementById('hideUnchangedLines').onchange = onReportFilterChange;
  const rawJsonInput = document.getElementById('rawJson');
  if (rawJsonInput) rawJsonInput.onchange = onReportFilterChange;
  document.getElementById('hideReviewed').onchange = onReportFilterChange;
  document.querySelectorAll('input[name="viewSide"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      viewSideValue = radio.value === 'source' || radio.value === 'target' ? radio.value : 'both';
      onReportFilterChange();
    });
  });
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('compositionstart', () => {
      searchCompositionActive = true;
      cancelScheduledReportSearch();
      setReportRenderBusy(false);
    });
    searchInput.addEventListener('compositionend', () => {
      searchCompositionActive = false;
      scheduleReportSearchRender();
    });
    searchInput.addEventListener('input', (event) => {
      if (searchCompositionActive || event.isComposing) return;
      scheduleReportSearchRender();
    });
  }
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('collapseBtn').onclick = collapseAll;
  document.getElementById('expandBtn').onclick = expandAll;
  document.getElementById('csvBtn').onclick = exportVisibleRowsAsCsv;
  document.getElementById('mdBtn').onclick = copyVisibleRowsAsMarkdown;
  const reviewStateSaveBtn = document.getElementById('reviewStateSaveBtn');
  const reviewStateLoadBtn = document.getElementById('reviewStateLoadBtn');
  const reviewStateFile = document.getElementById('reviewStateFile');
  if (reviewStateSaveBtn) reviewStateSaveBtn.onclick = saveReviewStateJson;
  if (reviewStateLoadBtn && reviewStateFile) {
    reviewStateLoadBtn.onclick = () => reviewStateFile.click();
    reviewStateFile.onchange = async () => {
      const file = reviewStateFile.files && reviewStateFile.files[0];
      reviewStateLoadBtn.disabled = true;
      try {
        await loadReviewStateJson(file);
      } finally {
        // 同じファイルを続けて選択しても change が発火するよう必ずリセットする。
        reviewStateFile.value = '';
        reviewStateLoadBtn.disabled = false;
        reviewStateLoadBtn.focus();
      }
    };
  }
  const reflectJsonBtn = document.getElementById('reflectJsonBtn');
  const reflectJsonCopyBtn = document.getElementById('reflectJsonCopyBtn');
  const srcJsonBtn = document.getElementById('srcJsonBtn');
  const tgtJsonBtn = document.getElementById('tgtJsonBtn');
  const settingsLikeRoot = document.getElementById('settingsLikeRoot');
  if (reflectJsonBtn) reflectJsonBtn.onclick = () => exportReflectJson(false);
  if (reflectJsonCopyBtn) reflectJsonCopyBtn.onclick = () => exportReflectJson(true);
  if (srcJsonBtn) srcJsonBtn.onclick = () => exportComparedBundleJson('source');
  if (tgtJsonBtn) tgtJsonBtn.onclick = () => exportComparedBundleJson('target');
  if (settingsLikeRoot) settingsLikeRoot.addEventListener('change', handleSelectionChange);
  const extraIgnoreInput = document.getElementById('extraIgnoreKeys');
  if (extraIgnoreInput) {
    extraIgnoreInput.addEventListener('input', () => {
      extraIgnoreRules = parseExtraIgnoreRules(extraIgnoreInput.value);
      onReportFilterChange();
    });
  }
  document.querySelectorAll('[data-preset-toggle]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const key = cb.getAttribute('data-preset-toggle') || '';
      if (cb.checked) activePresetKeys.add(key);
      else activePresetKeys.delete(key);
      onReportFilterChange();
    });
  });
  function handleSelectionChange(e) {
    const selectToggle = e.target && e.target.closest ? e.target.closest('[data-select-toggle]') : null;
    if (selectToggle) {
      if (!CAN_BUILD_REFLECT_JSON) {
        selectToggle.checked = false;
        showToast(REFLECT_JSON_BLOCK_REASON);
        return true;
      }
      const key = selectToggle.getAttribute('data-select-toggle') || '';
      const row = rowLookup.get(key);
      if (selectToggle.checked && row) selectedRows.set(key, row);
      else selectedRows.delete(key);
      const label = selectToggle.closest('.row-select');
      if (label) label.classList.toggle('is-on', selectToggle.checked);
      syncSelectedStat();
      return true;
    }
    const selectField = e.target && e.target.closest ? e.target.closest('[data-select-field]') : null;
    if (selectField) {
      if (!CAN_BUILD_REFLECT_JSON) {
        selectField.checked = false;
        showToast(REFLECT_JSON_BLOCK_REASON);
        return true;
      }
      const code = selectField.getAttribute('data-select-field') || '';
      if (selectField.checked && fieldCodeHasActualDiff(code)) selectedFieldCodes.add(code);
      else selectedFieldCodes.delete(code);
      const label = selectField.closest('.row-select');
      if (label) label.classList.toggle('is-on', selectField.checked);
      syncSelectedStat();
      return true;
    }
    return false;
  }

  document.getElementById('main').addEventListener('change', (e) => {
    if (handleSelectionChange(e)) return;
    if (e.target && e.target.id === 'diffSortSel') {
      diffSortValue = e.target.value || 'standard';
      render();
      requestAnimationFrame(() => document.getElementById('diffSortSel')?.focus());
      return;
    }
    if (e.target && e.target.id === 'diffSectionSel') {
      sectionFilterValue = e.target.value || 'all';
      render();
      requestAnimationFrame(() => document.getElementById('diffSectionSel')?.focus());
      return;
    }
    const reviewToggle = e.target && e.target.closest ? e.target.closest('[data-review-toggle]') : null;
    if (reviewToggle) {
      const key = reviewToggle.getAttribute('data-review-toggle') || '';
      const row = rowLookup.get(key);
      const hideReviewed = !!(document.getElementById('hideReviewed') || {}).checked;
      if (reviewToggle.checked && hideReviewed) {
        reviewAndMoveNext(key);
        return;
      }
      const reviewKeys = row ? reviewKeysForRow(row) : [key];
      reviewKeys.forEach((reviewKey) => {
        if (reviewToggle.checked) reviewedKeys.add(reviewKey);
        else reviewedKeys.delete(reviewKey);
      });
      render();
      requestAnimationFrame(() => {
        const nextToggle = Array.from(document.querySelectorAll('[data-review-toggle]'))
          .find((input) => input.getAttribute('data-review-toggle') === key);
        if (nextToggle && typeof nextToggle.focus === 'function') nextToggle.focus();
      });
    }
  });
  document.getElementById('main').addEventListener('click', handleMainClick);
  const startPendingReviewBtn = document.getElementById('startPendingReviewBtn');
  if (startPendingReviewBtn) startPendingReviewBtn.onclick = jumpToFirstPendingReview;
  document.getElementById('main').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const head = e.target.closest ? e.target.closest('[data-sec-toggle]') : null;
    if (!head) return;
    e.preventDefault();
    handleMainClick({ target: head });
  });
  document.querySelectorAll('[data-report-tab]').forEach((btn) => {
    btn.onclick = () => setActiveTab(btn.getAttribute('data-report-tab'));
    btn.onkeydown = (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const tabs = Array.from(document.querySelectorAll('[data-report-tab]'));
      const current = tabs.indexOf(btn);
      const nextIndex = e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? tabs.length - 1
          : (current + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const next = tabs[nextIndex];
      if (!next) return;
      setActiveTab(next.getAttribute('data-report-tab'));
      next.focus();
    };
  });

  document.addEventListener('keydown', (e) => {
    if (isMobileSidebarOpen()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobileSidebar(true);
        return;
      }
      if (e.key === 'Tab') {
        const panel = document.getElementById('sidebarPanels');
        const focusable = mobileSidebarFocusable();
        if (panel && focusable.length) {
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          } else if (!panel.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
        return;
      }
    }
    if (e.key === 'Escape' && detailModalOpen) {
      e.preventDefault();
      closeFieldDetailModal();
      return;
    }
    if (e.key === 'Tab' && detailModalOpen) {
      const modal = document.getElementById('fieldDetailModal');
      const dialog = modal && modal.querySelector('[role="dialog"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')) : [];
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!dialog.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      if (focusModeEnabled) {
        focusModeEnabled = false;
        applyDisplayModeClasses();
      }
      if (isMobileSidebarViewport()) {
        if (!isMobileSidebarOpen()) openMobileSidebar();
        requestAnimationFrame(() => document.getElementById('search')?.focus());
      } else {
        document.getElementById('search').focus();
      }
      return;
    }
    const shortcutTarget = e.target && e.target.closest ? e.target : null;
    const inInteractiveTarget = !!(shortcutTarget && (
      /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(shortcutTarget.tagName || '')
      || shortcutTarget.isContentEditable
      || shortcutTarget.closest('button,a,summary,[contenteditable]:not([contenteditable="false"])')
    ));
    const commonShortcutBlocked = !!(e.isComposing || e.repeat || inInteractiveTarget);
    if (!commonShortcutBlocked && !e.ctrlKey && !e.metaKey && !e.altKey && getActiveReportTab() === 'diff') {
      if (e.key === 'j') { e.preventDefault(); moveDiffFocus(1); return; }
      if (e.key === 'k') { e.preventDefault(); moveDiffFocus(-1); return; }
    }
    const reviewShortcutBlocked = !!(
      commonShortcutBlocked
      || e.ctrlKey
      || e.metaKey
      || e.altKey
    );
    if (!reviewShortcutBlocked && String(e.key || '').toLowerCase() === 'r' && getActiveReportTab() === 'diff') {
      const activeRow = document.activeElement && document.activeElement.closest
        ? document.activeElement.closest('[data-diff-row-key]')
        : null;
      const key = diffFocusKey || activeRow?.getAttribute('data-diff-row-key') || '';
      if (key) {
        e.preventDefault();
        reviewAndMoveNext(key);
      } else {
        showToast('J/Kキーで確認する差分を選択してください');
      }
      return;
    }
    if (e.key === 'Escape') {
      if (e.isComposing || e.repeat) return;
      if (commonShortcutBlocked && e.target !== document.getElementById('search')) return;
      const search = document.getElementById('search');
      if (!search || !String(search.value || '')) return;
      e.preventDefault();
      search.value = '';
      onReportFilterChange();
    }
  });

  const detailModal = document.getElementById('fieldDetailModal');
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal || e.target?.closest('[data-modal-close]')) {
        closeFieldDetailModal();
      }
    });
  }

  if (safeStorageGet(THEME_KEY) === 'dark') document.body.classList.add('dark');
  syncThemeButtonLabel();
  setActiveTab(safeStorageGet(ACTIVE_TAB_KEY) || 'diff');
})();
`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>kintone差分レポート</title>
  <style>
    :root{
      --bg:#f1f5f9;--fg:#0f172a;--card:#ffffff;--card-soft:#f8fafc;--border:#e2e8f0;--sidebar:#eef2f7;--sidebar-fg:#334155;
      --accent:#2563eb;--accent-strong:#1d4ed8;--accent-soft:#dbeafe;--header:#ffffff;--header-border:#e2e8f0;
      --add:#ecfdf5;--add-fg:#047857;--del:#fef2f2;--del-fg:#b91c1c;--pad:#f1f5f9;--muted:#64748b;
      --mark-add:#86efac;--mark-del:#fca5a5;--shadow:0 4px 6px -1px rgba(15,23,42,.06),0 12px 24px -4px rgba(15,23,42,.08);
      --pill-total:#475569;--pill-add:#15803d;--pill-del:#b91c1c;--pill-chg:#b45309;--pill-move:#7c3aed;--pill-same:#0d9488;--pill-err:#c2410c;
      --focus:0 0 0 3px rgba(37,99,235,.35);--diff-toolbar-offset:64px;
    }
    body.dark{
      color-scheme:dark;
      --bg:#0c1222;--fg:#e2e8f0;--card:#111827;--card-soft:#1e293b;--border:#334155;--sidebar:#0f172a;--sidebar-fg:#cbd5e1;
      --accent:#3b82f6;--accent-strong:#60a5fa;--accent-soft:#1e3a5f;--header:#111827;--header-border:#334155;
      --add:#064e3b;--add-fg:#6ee7b7;--del:#450a0a;--del-fg:#fca5a5;--pad:#1e293b;--muted:#94a3b8;
      --mark-add:#134e4a;--mark-del:#7f1d1d;--shadow:0 4px 24px rgba(0,0,0,.35);
      --pill-total:#94a3b8;--pill-add:#4ade80;--pill-del:#f87171;--pill-chg:#fbbf24;--pill-move:#c4b5fd;--pill-same:#2dd4bf;--pill-err:#fb923c;
      --focus:0 0 0 3px rgba(96,165,250,.4);
    }
    *{box-sizing:border-box}
    html,body{height:100%}
    html{scroll-behavior:smooth}
    body{
      margin:0;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;background:var(--bg);color:var(--fg);
      display:flex;min-height:100vh;-webkit-font-smoothing:antialiased;
      background-image:radial-gradient(ellipse 120% 80% at 100% -20%,rgba(37,99,235,.07),transparent 50%),
        radial-gradient(ellipse 100% 60% at 0% 100%,rgba(14,165,233,.06),transparent 45%);
    }
    body.dark{
      background-image:radial-gradient(ellipse 120% 80% at 100% -20%,rgba(59,130,246,.12),transparent 50%),
        radial-gradient(ellipse 100% 60% at 0% 100%,rgba(6,182,212,.08),transparent 45%);
    }
    aside{
      width:300px;min-width:280px;background:var(--sidebar);color:var(--sidebar-fg);display:flex;flex-direction:column;
      border-right:1px solid var(--border);position:sticky;top:0;align-self:flex-start;height:100vh;max-height:100vh;z-index:2;
      overflow-y:auto;backdrop-filter:saturate(1.1) blur(8px);
    }
    .sidebar-panels{display:flex;flex:1;min-height:0;flex-direction:column}
    .sidebar-drawer-head,.sidebar-backdrop{display:none}
    main{flex:1;overflow:auto;padding:28px 32px 40px;min-width:0}
    .sb-head{position:relative;padding:20px 18px 16px;border-bottom:1px solid var(--border);background:linear-gradient(165deg,var(--card) 0%,var(--card-soft) 100%)}
    .sb-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .mobile-filter-toggle{display:none;border:1px solid var(--accent);border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);padding:7px 11px;font-size:11px;font-weight:800;cursor:pointer}
    .mobile-filter-toggle:focus-visible{outline:none;box-shadow:var(--focus)}
    .sb-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .sb-title{margin-top:12px;font-size:21px;font-weight:800;color:var(--fg);letter-spacing:-.02em}
    .sb-meta{font-size:11px;color:var(--muted);margin-top:10px;line-height:1.75}
    .sb-panel{margin:12px 14px;border:1px solid var(--border);border-radius:16px;background:var(--card);box-shadow:var(--shadow)}
    .sb-stats{padding:14px 16px;font-size:12px;line-height:1.9}
    .sb-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}
    .sb-stat{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed var(--border)}
    .sb-stat:nth-last-child(-n+2){border-bottom:none}
    .sb-stat b{font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
    .sidebar-review-progress{display:flex;flex-direction:column;gap:7px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border)}
    .sidebar-review-progress--solo{margin-bottom:0;padding-bottom:0;border-bottom:0}
    .review-state-transfer-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:14px}
    .review-state-transfer-actions .btn{min-width:0;padding-inline:7px;line-height:1.35}
    .review-state-status{grid-column:1/-1;margin:0;font-size:10px;line-height:1.5;color:var(--muted)}
    .review-state-status.is-error{color:#b91c1c;font-weight:700}
    body.dark .review-state-status.is-error{color:#fca5a5}
    .sb-ctrl{padding:16px}
    .sidebar-count-details>summary{display:flex;align-items:center;min-height:36px;color:var(--accent-strong);font-size:11px;font-weight:800;cursor:pointer;list-style:none}
    .sidebar-count-details>summary::-webkit-details-marker{display:none}
    .sidebar-count-details>summary::before{content:"▸";margin-right:7px;color:var(--muted);font-size:9px}
    .sidebar-count-details[open]>summary::before{transform:rotate(90deg)}
    .sidebar-count-details .sb-stat-grid{margin-top:8px}
    .sb-ctrl .field-label{display:block;font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--muted);text-transform:uppercase;margin-bottom:6px}
    .sb-ctrl label.chk{display:flex;align-items:center;gap:10px;font-size:12px;margin-bottom:10px;color:var(--fg);cursor:pointer}
    .sb-ctrl input[type="checkbox"]{width:16px;height:16px;accent-color:var(--accent);cursor:pointer}
    .sb-ctrl input[type="text"]{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--card-soft);color:var(--fg);font-size:12px;transition:border-color .15s,box-shadow .15s}
    .sb-ctrl input[type="text"]:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus)}
    .search-hint{margin:8px 0 0;font-size:10px;color:var(--muted);line-height:1.5}
    .kbd{display:inline-block;padding:2px 6px;border-radius:6px;border:1px solid var(--border);background:var(--card-soft);font-size:10px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--fg)}
    .sb-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:14px}
    .btn{border:1px solid var(--border);background:var(--card-soft);color:var(--fg);border-radius:10px;padding:9px 11px;font-size:11px;font-weight:700;cursor:pointer;transition:background .15s,border-color .15s,transform .1s,box-shadow .15s}
    .btn:hover{background:var(--card);border-color:var(--muted)}
    .btn:active{transform:scale(.98)}
    .btn:focus-visible{outline:none;box-shadow:var(--focus)}
    button:disabled,.btn:disabled,.tchip:disabled,.row-act:disabled,select:disabled,input:disabled{cursor:not-allowed!important;box-shadow:none!important;filter:saturate(.25);opacity:.58}
    .chk:has(input:disabled),.vs-opt:has(input:disabled),.row-select:has(input:disabled){color:var(--muted)!important;cursor:not-allowed!important;opacity:.62}
    .btn.primary{background:linear-gradient(180deg,#3b82f6,var(--accent));color:#fff;border-color:#1d4ed8;box-shadow:0 2px 8px rgba(37,99,235,.35)}
    .btn.primary:hover{filter:brightness(1.06)}
    body.dark .btn.primary{background:linear-gradient(180deg,#60a5fa,var(--accent));border-color:#2563eb}
    #navWrap{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--border);margin-top:4px;padding-top:8px}
    .nav-label{padding:4px 18px 8px;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    #nav{flex:1;overflow:auto;padding:0 10px 20px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    #nav::-webkit-scrollbar{width:6px}
    #nav::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .nav-item{display:flex;width:calc(100% - 8px);justify-content:space-between;align-items:center;padding:11px 14px;font:inherit;font-size:12px;text-align:left;cursor:pointer;border-radius:12px;margin:3px 4px;color:var(--fg);background:transparent;border:1px solid transparent;transition:background .15s,border-color .15s,transform .1s}
    .nav-item:hover{background:var(--card);border-color:var(--border);box-shadow:var(--shadow)}
    .nav-item:active{transform:scale(.99)}
    .nav-item:focus-visible{outline:none;box-shadow:var(--focus)}
    .nav-item-meta{display:inline-flex;align-items:center;gap:5px;flex:0 0 auto}
    .badge{display:inline-block;min-width:26px;text-align:center;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;font-variant-numeric:tabular-nums}
    .topbar{
      display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:17px 20px 18px;border:1px solid var(--header-border);
      border-radius:20px;background:linear-gradient(135deg,var(--header) 0%,var(--card-soft) 100%);box-shadow:var(--shadow);position:relative;overflow:hidden
    }
    .topbar::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#06b6d4,var(--accent-strong))}
    .topbar-main{display:flex;flex:1;flex-direction:column;gap:8px;min-width:0}
    .topbar-eyebrow-row{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
    .topbar-title{font-size:clamp(1.12rem,2.2vw,1.42rem);font-weight:800;line-height:1.3;letter-spacing:-.02em;color:var(--fg)}
    .topbar-compare{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:9px;width:min(860px,100%)}
    .topbar-app-card{display:grid;grid-template-columns:auto auto minmax(0,1fr);align-items:center;gap:7px;padding:8px 11px;border:1px solid var(--border);border-top:3px solid var(--muted);border-radius:11px;background:var(--card);min-width:0}
    .topbar-app-card--source{border-top-color:#475569;background:linear-gradient(180deg,#f8fafc,var(--card))}
    .topbar-app-card--target{border-top-color:#2563eb;background:linear-gradient(180deg,#eff6ff,var(--card))}
    body.dark .topbar-app-card--source{background:linear-gradient(180deg,#1e293b,var(--card))}
    body.dark .topbar-app-card--target{background:linear-gradient(180deg,#172554,var(--card))}
    .topbar-app-eyebrow{font-size:9px;font-weight:900;letter-spacing:.08em;color:var(--fg)}
    .topbar-app-side{font-size:10px;font-weight:800;color:var(--muted);white-space:nowrap}
    .topbar-app-card strong{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--fg)}
    .topbar-arrow{display:grid;place-items:center;color:var(--accent);font-size:18px;font-weight:900;transition:transform .15s}
    .topbar-desc{font-size:11px;color:var(--muted);line-height:1.55;max-width:92ch}
    .topbar-desc b{color:var(--fg)}
    .header-badge{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;white-space:nowrap;writing-mode:horizontal-tb;border:1px solid var(--border);background:var(--card-soft);border-radius:999px;padding:6px 11px;font-size:10px;font-weight:700;color:var(--muted)}
    .settings-shell{margin-top:14px;border:1px solid var(--border);border-radius:20px;background:var(--card);box-shadow:var(--shadow)}
    .settings-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%);border-radius:20px 20px 0 0}
    .settings-tab{
      padding:8px 16px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:12px;font-weight:800;
      border:1px solid transparent;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .1s
    }
    .settings-tab.passive{background:transparent;color:var(--muted);border-color:var(--border);font-weight:700}
    .settings-tab.passive:hover{border-color:var(--accent-soft);color:var(--fg)}
    .settings-tab:focus-visible{outline:none;box-shadow:var(--focus)}
    .settings-tab:active:not(.passive){transform:scale(.98)}
    .tab-pane[hidden]{display:none!important}
    .warn{font-size:11px;color:#b45309;margin-top:10px;padding:10px 12px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;line-height:1.6}
    body.dark .warn{color:#fbbf24;background:#422006;border-color:#92400e}
    .report-notices{display:flex;flex-direction:column;gap:8px;margin-bottom:10px}
    .report-notices .warn{margin-top:0}
    .issue-box{margin:0;border:1px solid #fdba74;border-radius:16px;background:#fff7ed;padding:12px 18px;box-shadow:0 4px 16px -4px rgba(180,83,9,.15)}
    body.dark .issue-box{background:#1c1410;border-color:#78350f}
    .issue-box>summary{cursor:pointer;font-size:13px;font-weight:800;color:#9a3412;padding:4px 0}
    body.dark .issue-box>summary{color:#fb923c}
    .issue-box table{width:100%;border-collapse:collapse;font-size:11px}
    .issue-box th,.issue-box td{border-bottom:1px solid var(--border);padding:10px 12px;text-align:left;vertical-align:top}
    .issue-box th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
    .issue-box .msg{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .content{padding:14px}
    #reviewQueueHost{margin-bottom:10px}
    .review-queue{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:10px 13px;border:1px solid var(--border);border-radius:14px;background:linear-gradient(135deg,var(--card),var(--card-soft));box-shadow:var(--shadow)}
    .review-queue--alert{border-color:#fca5a5;background:linear-gradient(135deg,#fff7f7,#fff)}
    .review-queue--watch{border-color:#fcd34d;background:linear-gradient(135deg,#fffbeb,#fff)}
    .review-queue--clear{border-color:#86efac;background:linear-gradient(135deg,#f0fdf4,#fff)}
    body.dark .review-queue--alert{background:linear-gradient(135deg,#2b1014,var(--card));border-color:#7f1d1d}
    body.dark .review-queue--watch{background:linear-gradient(135deg,#2a2008,var(--card));border-color:#78350f}
    body.dark .review-queue--clear{background:linear-gradient(135deg,#052e16,var(--card));border-color:#166534}
    .review-queue-mark{display:grid;place-items:center;width:36px;height:36px;border-radius:11px;background:var(--fg);color:var(--card);font-size:19px;font-weight:900}
    .review-queue--alert .review-queue-mark{background:#dc2626;color:#fff}
    .review-queue--watch .review-queue-mark{background:#d97706;color:#fff}
    .review-queue--clear .review-queue-mark{background:#16a34a;color:#fff}
    .review-queue-main{display:flex;flex-direction:column;gap:2px;min-width:0}
    .review-queue-kicker{font-size:9px;font-weight:900;letter-spacing:.09em;color:var(--muted);text-transform:uppercase}
    .review-queue-main>strong{font-size:14px;line-height:1.3;color:var(--fg)}
    .review-queue-note{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums}
    .review-progress{display:flex;flex-direction:column;gap:4px;min-width:0}
    .review-progress--queue{max-width:430px;margin-top:3px}
    .review-progress-copy{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:9px;color:var(--muted)}
    .review-progress-copy strong{font-size:10px;color:var(--fg);font-variant-numeric:tabular-nums;white-space:nowrap}
    .review-progress-track{height:6px;border-radius:999px;background:var(--border);overflow:hidden}
    .review-progress-track>span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--accent),#06b6d4);transition:width .2s ease}
    .review-progress-note{font-size:8px;line-height:1.45;color:var(--muted)}
    .review-queue-samples{display:flex;gap:4px;flex-wrap:wrap;margin-top:3px}
    .review-queue-samples button{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:2px 7px;border:1px solid var(--border);border-radius:999px;background:var(--card);font-size:9px;color:var(--fg);cursor:pointer}
    .review-queue-samples button:hover{border-color:var(--accent)}
    .review-queue-samples button:focus-visible{outline:none;box-shadow:var(--focus)}
    .review-queue-actions{display:flex;flex-direction:column;align-items:stretch;gap:5px}
    .review-queue-action{border:1px solid var(--accent);border-radius:9px;background:var(--accent);color:#fff;padding:8px 11px;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}
    .review-queue-action--secondary{background:var(--card);color:var(--accent-strong)}
    .review-queue-action:hover{filter:brightness(1.07)}
    .review-queue-action:focus-visible{outline:none;box-shadow:var(--focus)}
    .diff-toolbar{position:sticky;top:0;z-index:6;display:flex;flex-direction:column;gap:6px;margin-bottom:12px;padding:8px 11px;border:1px solid var(--border);border-top:3px solid var(--accent);border-radius:14px;background:var(--card);background:color-mix(in srgb,var(--card) 95%,transparent);box-shadow:0 8px 24px rgba(15,23,42,.1);backdrop-filter:blur(12px)}
    .diff-toolbar-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:5px;border-bottom:1px solid var(--border)}
    .diff-toolbar-heading>.diff-toolbar-title{display:flex;flex-direction:column;gap:1px}
    .diff-toolbar-heading strong{font-size:12px;color:var(--fg)}
    .diff-toolbar-heading>.diff-toolbar-title span{font-size:9px;color:var(--muted)}
    .focus-context{display:none;align-items:center;gap:8px;min-width:0;padding:7px 9px;border:1px solid var(--accent);border-radius:10px;background:var(--accent-soft);color:var(--accent-strong)}
    .focus-context-pair{display:flex;align-items:center;gap:7px;min-width:0;flex:1}
    .focus-context-side{display:flex;align-items:center;gap:5px;min-width:0}
    .focus-context-side small{flex:0 0 auto;font-size:8px;font-weight:900;letter-spacing:.06em}
    .focus-context-pair b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}
    .focus-context-pair i{flex:0 0 auto;font-style:normal;font-weight:900}
    .focus-context-stat{display:inline-flex;align-items:center;gap:4px;flex:0 0 auto;padding:3px 7px;border-radius:999px;background:var(--card);font-size:9px;color:var(--muted);white-space:nowrap}
    .focus-context-stat strong{font-size:10px;color:var(--fg);font-variant-numeric:tabular-nums}
    .diff-scope-counts{display:flex;align-items:center;gap:5px;flex-wrap:wrap;justify-content:flex-end}
    .diff-scope-counts span{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border:1px solid var(--border);border-radius:999px;background:var(--card-soft);font-size:9px;font-weight:700;color:var(--muted);white-space:nowrap}
    .diff-scope-counts b{font-size:10px;color:var(--fg);font-variant-numeric:tabular-nums}
    .mobile-toolbar-toggle{display:none;border:1px solid var(--accent);border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);padding:5px 9px;font-size:9px;font-weight:800;cursor:pointer}
    .mobile-toolbar-toggle:focus-visible{outline:none;box-shadow:var(--focus)}
    .diff-toolbar-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .diff-toolbar-row--navigation{padding-top:1px}
    .diff-toolbar-spacer{flex:1}
    .diff-toolbar-label{min-width:44px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-right:2px}
    .diff-sort{display:inline-flex;align-items:center;gap:6px;font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
    .diff-sort select{padding:6px 8px;border:1px solid var(--border);border-radius:8px;background:var(--card-soft);color:var(--fg);font-size:11px;font-weight:600;cursor:pointer}
    .diff-sort select:focus-visible{outline:none;box-shadow:var(--focus)}
    .diff-toolbar-count{font-size:11px;color:var(--muted);font-weight:700;white-space:nowrap}
    .diff-toolbar-count b{color:var(--fg);font-variant-numeric:tabular-nums}
    .diff-nav-position{min-width:96px;text-align:center;font-size:11px;color:var(--muted);font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
    .diff-display-modes{display:inline-flex;align-items:center;gap:5px}
    .tchip{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border-radius:999px;border:1px solid var(--border);background:var(--card-soft);color:var(--fg);font-size:11px;font-weight:700;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
    .tchip b{font-size:11px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--muted)}
    .tchip:hover{border-color:var(--muted)}
    .tchip:active{transform:scale(.97)}
    .tchip:focus-visible{outline:none;box-shadow:var(--focus)}
    .tchip:disabled{opacity:.45;cursor:not-allowed;transform:none}
    .tchip--added b{color:var(--pill-add)}
    .tchip--removed b{color:var(--pill-del)}
    .tchip--changed b{color:var(--pill-chg)}
    .tchip--moved b{color:var(--pill-move)}
    .tchip--same b{color:var(--pill-same)}
    .tchip.is-active{border-color:var(--accent);background:var(--accent-soft);color:var(--accent-strong)}
    .tchip.is-active b{color:var(--accent-strong)}
    .active-filters{display:flex;align-items:center;gap:5px;flex-wrap:wrap;padding-top:5px;border-top:1px dashed var(--border);font-size:9px;color:var(--muted)}
    .active-filters-label{font-weight:900;letter-spacing:.05em;text-transform:uppercase}
    .active-filter-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid #93c5fd;border-radius:999px;background:#eff6ff;color:#1d4ed8;padding:4px 8px;font-size:10px;font-weight:800;cursor:pointer}
    .active-filter-chip span{font-size:13px;line-height:1}
    .active-filter-chip:hover{border-color:var(--accent)}
    .active-filter-chip:focus-visible,.active-filter-clear:focus-visible{outline:none;box-shadow:var(--focus)}
    body.dark .active-filter-chip{background:#172554;color:#bfdbfe;border-color:#1d4ed8}
    .active-filter-clear{border:none;background:transparent;color:var(--accent-strong);padding:4px 6px;font-size:10px;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer}
    .active-filters--empty{opacity:.78}
    .sec{border:1px solid var(--border);border-radius:16px;background:var(--card);margin-bottom:14px;box-shadow:0 8px 26px -14px rgba(15,23,42,.32);scroll-margin-top:calc(var(--diff-toolbar-offset) + 12px)}
    .sec-head{position:sticky;top:var(--diff-toolbar-offset);z-index:5;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:11px 14px;border-radius:15px 15px 0 0;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card) 0%,var(--card-soft) 100%);font-size:13px;font-weight:850;cursor:pointer;user-select:none;transition:filter .15s,box-shadow .15s}
    .sec-head:hover{filter:brightness(.985)}
    .sec-head:focus-visible{outline:none;box-shadow:var(--focus)}
    body.dark .sec-head:hover{filter:brightness(1.08)}
    .sec-head-title{display:inline-flex;align-items:center;gap:8px;min-width:0}
    .sec-caret{font-size:9px;color:var(--muted);flex-shrink:0}
    .sec-counts{display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
    .sec-review-progress{display:inline-flex;align-items:center;padding:3px 8px;border:1px solid var(--border);border-radius:999px;background:var(--card);color:var(--muted);font-size:9px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
    .sec-review-progress.is-complete{border-color:#86efac;background:#ecfdf5;color:#15803d}
    body.dark .sec-review-progress.is-complete{border-color:#166534;background:#052e16;color:#86efac}
    .cnt{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums;border:1px solid transparent;white-space:nowrap}
    .cnt--add{background:#dcfce7;color:#166534;border-color:#86efac}
    .cnt--del{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .cnt--chg{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .cnt--same{background:var(--card-soft);color:var(--muted);border-color:var(--border)}
    body.dark .cnt--add{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .cnt--del{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .cnt--chg{background:#78350f;color:#fde68a;border-color:#b45309}
    .drow-list{display:flex;flex-direction:column;border-radius:0 0 15px 15px;overflow:hidden}
    .drow{padding:11px 14px 13px;border-bottom:1px solid var(--border);border-left:5px solid transparent;background:var(--card);scroll-margin-top:calc(var(--diff-toolbar-offset) + 58px);transition:background .15s,box-shadow .15s}
    .drow:last-child{border-bottom:none}
    .drow:hover{background:var(--card-soft)}
    .drow--added{border-left-color:#16a34a}
    .drow--removed{border-left-color:#dc2626}
    .drow--changed{border-left-color:#ca8a04}
    .drow--same{border-left-color:transparent;background:var(--card-soft)}
    .drow--same .path-main{font-weight:600;color:var(--muted)}
    .drow--reviewed{opacity:1;background:linear-gradient(90deg,rgba(22,163,74,.14) 0 9px,var(--card) 9px);box-shadow:inset 0 0 0 1px rgba(22,163,74,.08)}
    .drow--reviewed:hover{background:linear-gradient(90deg,rgba(22,163,74,.18) 0 9px,var(--card-soft) 9px)}
    body.dark .drow--reviewed{background:linear-gradient(90deg,rgba(74,222,128,.18) 0 9px,var(--card) 9px)}
    .drow--focus{position:relative;z-index:1;opacity:1;outline:3px solid var(--accent);outline-offset:-3px;background:var(--accent-soft);box-shadow:inset 7px 0 0 var(--accent)}
    .drow--focus .drow-head::before{content:"現在";display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:var(--accent);color:#fff;font-size:10px;font-weight:800;white-space:nowrap}
    .fj-block.drow--focus .fj-head::before{content:"現在";display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:var(--accent);color:#fff;font-size:10px;font-weight:800;white-space:nowrap}
    .drow:focus-visible{outline:3px solid var(--accent);outline-offset:-3px}
    @supports (content-visibility:auto){
      .drow,.fj-block,.fc-card{content-visibility:auto;contain-intrinsic-size:auto 180px}
      .drow.drow--focus,.drow[aria-current="true"],.drow:focus-within,.fj-block.drow--focus,.fj-block[aria-current="true"],.fj-block:focus-within,.fc-card.is-active,.fc-card:focus-within{content-visibility:visible}
    }
    .drow-head{display:flex;gap:9px;align-items:flex-start}
    .drow-title{flex:1;min-width:0}
    .drow-actions{display:inline-flex;align-items:center;gap:6px;flex-shrink:0}
    .row-act{border:1px solid var(--border);background:var(--card-soft);color:var(--muted);border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700;cursor:pointer;transition:color .15s,border-color .15s}
    .row-act:hover{color:var(--fg);border-color:var(--muted)}
    .row-act:focus-visible{outline:none;box-shadow:var(--focus)}
    .row-review-next{border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:8px;padding:4px 9px;font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}
    .row-review-next:hover{filter:brightness(1.06)}
    .row-review-next:focus-visible{outline:none;box-shadow:var(--focus)}
    .row-reviewed{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
    .row-reviewed input{width:12px;height:12px;accent-color:var(--accent);cursor:pointer;margin:0}
    .row-reviewed.is-on{background:#ecfdf5;color:#15803d;border-color:#86efac}
    body.dark .row-reviewed.is-on{background:#052e16;color:#86efac;border-color:#166534}
    .row-display-only{display:inline-flex;align-items:center;padding:3px 9px;border-radius:999px;border:1px dashed var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;white-space:nowrap}
    .row-select{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;white-space:nowrap}
    .row-select input{width:12px;height:12px;accent-color:var(--accent);cursor:pointer;margin:0}
    .row-select.is-on{background:var(--accent-soft);color:var(--accent-strong);border-color:var(--accent)}
    .fj-list{display:flex;flex-direction:column;gap:12px}
    .fj-block{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
    .fj-block.drow--reviewed{background:linear-gradient(90deg,rgba(22,163,74,.16) 0 9px,var(--card) 9px);box-shadow:inset 0 0 0 1px rgba(22,163,74,.1)}
    .fj-block.drow--focus{background:var(--accent-soft);outline:3px solid var(--accent);outline-offset:-3px;box-shadow:inset 7px 0 0 var(--accent)}
    .fj-block--added{border-left:5px solid #16a34a}
    .fj-block--removed{border-left:5px solid #dc2626}
    .fj-block--changed{border-left:5px solid #ca8a04}
    .fj-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:9px 12px;border-bottom:1px solid var(--border);background:var(--card-soft)}
    .fj-title{font-size:13px;font-weight:800;color:var(--fg)}
    .fj-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;color:var(--muted)}
    .fj-type{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--card);color:var(--muted)}
    .fj-spacer{flex:1}
    .fj-body{padding:10px 12px}
    .fj-body .duo{max-height:420px}
    .fj-same-note{padding:8px 12px;font-size:11px;color:var(--muted)}
    .report-toast{display:none;align-items:center;justify-content:center;margin:8px 12px 0;padding:9px 14px;border:1px solid var(--accent);border-radius:10px;background:var(--accent-soft);color:var(--accent-strong);font-size:11px;font-weight:800;line-height:1.45;text-align:center}
    .report-toast.is-visible{display:flex}
    .report-filter-status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .drow-val{margin-top:10px;padding-left:2px}
    .drow-empty{padding:20px;font-size:12px;color:var(--muted);text-align:center}
    .val-inline{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;line-height:1.6}
    .val-inline--lanes{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:stretch;gap:9px}
    .val-inline--lanes>.val-lane:only-child{grid-column:1/-1}
    .val-lane{display:flex;flex-direction:column;gap:5px;min-width:0;padding:8px;border:1px solid var(--border);border-radius:11px;background:var(--card-soft)}
    .val-lane--before{border-top:3px solid #dc2626}
    .val-lane--after{border-top:3px solid #16a34a}
    .val-lane-label{display:flex;align-items:baseline;gap:7px;padding:0 2px}
    .val-lane-label b{font-size:10px;letter-spacing:.08em;color:var(--fg)}
    .val-lane-label small{font-size:9px;font-weight:700;color:var(--muted)}
    .val-lane .vi-val{display:block;width:100%}
    .vi-val{display:inline-block;max-width:100%;padding:3px 10px;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;word-break:break-word;border:1px solid transparent}
    .vi-val--del{background:var(--del);color:var(--del-fg);border-color:rgba(220,38,38,.18)}
    .vi-val--add{background:var(--add);color:var(--add-fg);border-color:rgba(22,163,74,.18)}
    .vi-val--same{background:var(--card-soft);color:var(--muted);border-color:var(--border)}
    .vi-val--absent{background:var(--card-soft);color:var(--muted);border:1px dashed var(--border)}
    .vi-val[data-side-label]::before,.duo-cell[data-side-label]::before{display:none}
    .vi-arrow{color:var(--muted);font-weight:800;flex-shrink:0}
    .val-single{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}
    .val-single-head{padding:6px 11px;border-bottom:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:800;letter-spacing:.04em;color:var(--muted)}
    .val-single--add .blk{background:var(--add);color:var(--add-fg)}
    .val-single--del .blk{background:var(--del);color:var(--del-fg)}
    .val-single--same .blk{color:var(--muted)}
    .val-reveal{display:inline-flex;align-items:center;gap:6px;margin-top:2px;padding:5px 12px;border-radius:999px;border:1px dashed var(--border);background:transparent;color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;transition:border-color .15s,color .15s}
    .val-reveal:hover{border-color:var(--muted);color:var(--fg)}
    .val-reveal:focus-visible{outline:none;box-shadow:var(--focus)}
    .val-single + .val-reveal{margin-top:8px}
    .duo-wrap{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}
    .duo-head{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-bottom:1px solid var(--border);background:var(--pad)}
    .duo-head .duo-lane{display:flex;align-items:baseline;gap:8px;padding:8px 12px;border-top:3px solid transparent}
    .duo-head .duo-lane--before{border-top-color:#dc2626}
    .duo-head .duo-lane--after{border-top-color:#16a34a}
    .duo-head .duo-lane b{font-size:10px;letter-spacing:.08em;color:var(--fg)}
    .duo-head .duo-lane small{font-size:9px;font-weight:700;color:var(--muted)}
    .duo-head .duo-lane + .duo-lane{border-left:1px solid var(--border)}
    .duo{max-height:320px}
    .duo-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
    .duo-cell{display:flex;min-width:0;min-height:1.6em;line-height:1.6;padding:0 8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word}
    .duo-cell + .duo-cell{border-left:1px solid var(--border)}
    .duo-cell.del{background:var(--del);color:var(--del-fg)}
    .duo-cell.add{background:var(--add);color:var(--add-fg)}
    .duo-cell.pad{background:var(--pad);opacity:.7}
    .duo-empty{padding:10px 12px;font-size:11px;color:var(--muted);background:var(--card-soft);text-align:center}
    .duo-head--solo{grid-template-columns:1fr}
    .duo-row--solo{grid-template-columns:1fr}
    .view-side{display:flex;gap:6px;margin:2px 0 10px}
    .view-side .vs-opt{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--fg);cursor:pointer;border:1px solid var(--border);border-radius:8px;padding:4px 9px;background:var(--card)}
    .view-side .vs-opt input{margin:0}
    .view-side .vs-opt:has(input:checked){border-color:var(--accent);color:var(--accent-strong);background:var(--accent-soft);font-weight:700}
    .duo-cell .blk{flex:1}
    .lt{flex:1;min-width:0}
    .same-fold{display:flex;align-items:center;gap:8px;width:100%;padding:9px 14px;border:none;border-top:1px dashed var(--border);background:var(--card-soft);color:var(--muted);font-size:11px;font-weight:700;cursor:pointer;text-align:left;transition:color .15s}
    .same-fold:hover{color:var(--fg)}
    .same-fold:focus-visible{outline:none;box-shadow:var(--focus)}
    .long-value{border:1px solid var(--border);border-radius:12px;background:var(--card-soft);overflow:hidden}
    .long-value>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;cursor:pointer;color:var(--fg);font-size:11px;font-weight:800;list-style:none}
    .long-value>summary::-webkit-details-marker{display:none}
    .long-value>summary::before{content:"▸";color:var(--accent);font-size:10px;transition:transform .15s}
    .long-value[open]>summary::before{transform:rotate(90deg)}
    .long-value>summary span{flex:1}
    .long-value>summary small{font-size:9px;font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}
    .long-value>summary:focus-visible{outline:none;box-shadow:inset var(--focus)}
    .long-value-body{padding:0 10px 10px}
    .agg-list{display:flex;flex-direction:column;gap:8px}
    .agg-item{border:1px solid var(--border);border-radius:10px;padding:8px 11px 10px;background:var(--card-soft)}
    .agg-item-head{display:flex;align-items:center;gap:8px;min-width:0}
    .agg-prop{font-size:12px;font-weight:700;color:var(--fg);min-width:0;word-break:break-word}
    .agg-val{margin-top:6px}
    .agg-val .duo-wrap,.agg-val .val-single{background:var(--card)}
    .mini-chip{display:inline-flex;align-items:center;justify-content:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid transparent;white-space:nowrap;flex-shrink:0}
    .mini-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .mini-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .mini-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    body.dark .mini-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .mini-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .mini-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    .type-chip{display:inline-flex;align-items:center;justify-content:center;min-width:52px;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid transparent;white-space:nowrap;flex-shrink:0;margin-top:1px}
    .type-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .type-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .type-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .type-chip--same{background:#ccfbf1;color:#0f766e;border-color:#5eead4}
    body.dark .type-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .type-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .type-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    body.dark .type-chip--same{background:#134e4a;color:#99f6e4;border-color:#0f766e}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--muted);font-size:11px}
    .path-main{font-size:13px;font-weight:800;color:var(--fg);margin-bottom:3px;word-break:break-word;line-height:1.45}
    .path-sub{font-size:10px;line-height:1.45;color:var(--muted);word-break:break-all}
    .path-tech{margin-top:3px;max-width:100%}
    .path-tech>summary{display:inline-flex;align-items:center;gap:5px;color:var(--muted);font-size:9px;font-weight:700;cursor:pointer;list-style:none}
    .path-tech>summary::-webkit-details-marker{display:none}
    .path-tech>summary::before{content:"▸";font-size:8px;transition:transform .15s}
    .path-tech[open]>summary::before{transform:rotate(90deg)}
    .path-tech>summary:focus-visible{outline:none;border-radius:5px;box-shadow:var(--focus)}
    .path-tech-body{display:grid;gap:4px;margin-top:5px;padding:7px 9px;border:1px dashed var(--border);border-radius:8px;background:var(--card-soft)}
    .path-tech-body>div{display:grid;grid-template-columns:auto minmax(0,1fr);gap:7px;align-items:start}
    .path-tech-body span{font-size:9px;color:var(--muted);white-space:nowrap}
    .path-tech-body code{font-size:9px;color:var(--fg);word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .meta-wrap{margin-top:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
    .meta-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    .meta-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:600;color:var(--fg)}
    .meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
    .meta-tag.rename{background:#ecfdf5;color:#15803d;border-color:#86efac}
    body.dark .meta-tag.reason{background:#431407;color:#fdba74;border-color:#9a3412}
    body.dark .meta-tag.rename{background:#052e16;color:#86efac;border-color:#166534}
    .meta-line{font-size:10px;line-height:1.5;color:var(--muted)}
    .meta-line strong{color:var(--fg)}
    .scroll{max-height:300px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    .scroll::-webkit-scrollbar{width:6px;height:6px}
    .scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .ln{min-width:34px;display:inline-block;text-align:right;margin-right:8px;padding-right:6px;border-right:1px solid var(--border);font-size:10px;color:var(--muted);user-select:none;flex-shrink:0}
    .blk{margin:0;padding:10px 12px;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:3px;padding:0 2px;text-decoration:underline 2px;text-underline-offset:2px}
    mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:3px;padding:0 2px;text-decoration:line-through 2px}
    .sb-advanced .adv-summary{cursor:pointer;font-size:11px;font-weight:800;color:var(--fg);list-style:none;display:flex;align-items:center;gap:6px}
    .sb-advanced .adv-summary::-webkit-details-marker{display:none}
    .sb-advanced .adv-summary::before{content:"▸";display:inline-block;font-size:9px;color:var(--muted);transition:transform .15s}
    .sb-advanced details[open] .adv-summary::before{transform:rotate(90deg)}
    .adv-note{margin:10px 0;font-size:10px;line-height:1.6;color:var(--muted)}
    .adv-textarea{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid var(--border);border-radius:10px;background:var(--card-soft);color:var(--fg);font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;transition:border-color .15s,box-shadow .15s}
    .adv-textarea:focus{outline:none;border-color:var(--accent);box-shadow:var(--focus)}
    .adv-baked{margin:8px 0 0;font-size:10px;line-height:1.6;color:var(--muted);word-break:break-all}
    .adv-checks{display:flex;flex-direction:column;gap:2px;margin-top:12px}
    .sb-ctrl .adv-checks label.chk{margin-bottom:6px;font-size:11px;line-height:1.5;align-items:flex-start}
    .sb-ctrl .adv-checks label.chk input[type="checkbox"]{margin-top:1px;flex-shrink:0}
    .adv-chk.is-baked{opacity:.65}
    .adv-baked-tag{display:inline-block;margin-left:4px;padding:1px 6px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:9px;font-weight:800;white-space:nowrap}
    .no-diff{display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;font-size:12px;font-weight:500;padding:24px;color:var(--muted);background:linear-gradient(180deg,var(--card-soft),var(--card));border:1px dashed var(--border);border-radius:16px}
    .no-diff strong{font-size:14px;color:#0d9488}
    .no-diff span{max-width:62ch;line-height:1.6}
    body.dark .no-diff{color:#5eead4}
    body.has-modal-open{overflow:hidden}
    .sl-root{padding:16px 18px 28px;background:var(--card-soft);min-height:320px;border-radius:0 0 20px 20px}
    .sl-board{display:flex;flex-direction:column;gap:18px;max-width:1280px;margin:0 auto}
    .sl-legend{display:flex;flex-wrap:wrap;gap:12px 18px;margin-bottom:4px;padding:12px 14px;border-radius:12px;background:var(--card);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--fg);box-shadow:var(--shadow)}
    .sl-legend span{display:inline-flex;align-items:center;gap:8px}
    .sl-dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .sl-dot--src{background:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.25)}
    .sl-dot--tgt{background:#16a34a;box-shadow:0 0 0 2px rgba(22,163,74,.25)}
    .sl-dot--chg{background:#ca8a04;box-shadow:0 0 0 2px rgba(202,138,4,.3)}
    .sl-dot--same{background:#64748b;box-shadow:0 0 0 2px rgba(100,116,139,.25)}
    .sl-group{border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
    .sl-group-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;background:linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%);border-bottom:1px solid var(--border)}
    body.dark .sl-group-head{background:linear-gradient(180deg,#1e293b 0%,#162032 100%)}
    .sl-group-title{font-size:13px;font-weight:800;color:var(--fg);letter-spacing:.02em}
    .sl-group-count{font-size:11px;font-weight:700;color:var(--muted)}
    .sl-items{display:flex;flex-direction:column;gap:12px;padding:14px 16px 18px}
    .sl-item{border-radius:12px;padding:12px 14px 14px;border:1px solid var(--border);border-left:5px solid var(--border);font-size:12px;line-height:1.55}
    .sl-item--src{background:rgba(37,99,235,.09);border-left-color:#2563eb}
    .sl-item--tgt{background:rgba(22,163,74,.1);border-left-color:#16a34a}
    .sl-item--chg{background:rgba(234,179,8,.16);border-left-color:#ca8a04}
    .sl-item--same{background:var(--card-soft);border-left-color:#94a3b8;opacity:.95}
    body.dark .sl-item--src{background:rgba(59,130,246,.14)}
    body.dark .sl-item--tgt{background:rgba(34,197,94,.14)}
    body.dark .sl-item--chg{background:rgba(234,179,8,.12)}
    .sl-item-top{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-start;margin-bottom:6px}
    .sl-badge{font-size:10px;font-weight:800;padding:4px 10px;border-radius:999px;flex-shrink:0}
    .sl-item--src .sl-badge{background:#dbeafe;color:#1e40af}
    .sl-item--tgt .sl-badge{background:#dcfce7;color:#166534}
    .sl-item--chg .sl-badge{background:#fef08a;color:#854d0e}
    .sl-item--same .sl-badge{background:#e2e8f0;color:#475569}
    body.dark .sl-item--src .sl-badge{background:#1e3a5f;color:#93c5fd}
    body.dark .sl-item--tgt .sl-badge{background:#14532d;color:#86efac}
    body.dark .sl-item--chg .sl-badge{background:#713f12;color:#fde047}
    body.dark .sl-item--same .sl-badge{background:#334155;color:#cbd5e1}
    .sl-path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;word-break:break-all;color:var(--muted);flex:1;min-width:0}
    .sl-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
    .sl-pair--solo{grid-template-columns:1fr}
    .sl-pair-col{min-width:0}
    @media (max-width:900px){.sl-pair{grid-template-columns:1fr}}
    .sl-pane-h{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
    .sl-pane{margin:0;padding:10px 11px;border-radius:8px;font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow:auto;line-height:1.45}
    .sl-pane--kv{font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif;font-size:11px;line-height:1.5}
    .sl-prop-name{font-size:12px;font-weight:800;color:var(--fg);flex:1;min-width:0}
    .sl-path--sub{font-size:10px;margin:0 0 8px;opacity:.9}
    .sl-empty{font-style:italic;color:var(--muted)}
    .sl-val-mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;word-break:break-word}
    .sl-mini-table{width:100%;border-collapse:collapse;font-size:10px;margin:0}
    .sl-mini-table th,.sl-mini-table td{border:1px solid var(--border);padding:6px 8px;text-align:left;vertical-align:top}
    .sl-mini-table th{width:38%;font-weight:700;color:var(--muted);background:var(--card-soft)}
    tr.kv-del>td{background:var(--del);color:var(--del-fg)}
    tr.kv-add>td{background:var(--add);color:var(--add-fg)}
    tr.kv-chg>td{background:#fef3c7;color:#92400e}
    body.dark tr.kv-chg>td{background:#78350f;color:#fde68a}
    tr.kv-del>th,tr.kv-add>th,tr.kv-chg>th{box-shadow:inset 3px 0 0 #ca8a04}
    tr.kv-ghost>td,tr.kv-ghost>th{background:var(--pad);color:var(--muted);font-style:italic}
    .sl-mini-table mark.cdel,.st-fields mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:2px;padding:0 1px;text-decoration:line-through 2px}
    .sl-mini-table mark.cadd,.st-fields mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:2px;padding:0 1px;text-decoration:underline 2px;text-underline-offset:2px}
    .kf-row--diff .kf-value{border-color:#f59e0b;box-shadow:inset 3px 0 0 #f59e0b,inset 0 1px 2px rgba(15,23,42,.04);background:#fffbeb}
    body.dark .kf-row--diff .kf-value{background:#2a2008;border-color:#b45309}
    .kf-diff-chip{display:inline-block;margin-left:6px;padding:1px 7px;border-radius:999px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;font-size:9px;font-weight:800;vertical-align:middle;white-space:nowrap}
    body.dark .kf-diff-chip{background:#78350f;color:#fde68a;border-color:#b45309}
    .kf-toggle--diff .kf-toggle-label{background:#fef3c7;color:#92400e;border-radius:6px;padding:1px 6px}
    body.dark .kf-toggle--diff .kf-toggle-label{background:#78350f;color:#fde68a}
    .st-wrap{width:100%;overflow-x:auto;border:1px solid var(--border);border-radius:10px;background:var(--card)}
    .st-fields{width:100%;border-collapse:collapse;font-size:11px;margin:0;table-layout:fixed}
    .st-fields thead{background:var(--card-soft)}
    .st-fields th{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding:8px 10px;text-align:left;border-bottom:1px solid var(--border);white-space:nowrap}
    .st-fields td{padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:middle;word-break:break-word}
    .st-fields tbody tr:last-child td{border-bottom:none}
    .st-fields tbody tr:hover{background:var(--card-soft)}
    .st-fields .st-col-no{width:38px;font-variant-numeric:tabular-nums;color:var(--muted);text-align:right}
    .st-fields .st-col-label{font-weight:600;color:var(--fg)}
    .st-fields .st-col-type{width:120px}
    .st-fields .st-col-code{width:180px}
    .st-fields .st-col-code code{font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--card-soft);border:1px solid var(--border);padding:2px 6px;border-radius:6px;color:var(--fg);word-break:break-all}
    .st-fields .st-col-req{width:60px;text-align:center}
    .st-type-chip{display:inline-block;padding:2px 8px;border-radius:999px;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:700;border:1px solid #c7d2fe}
    body.dark .st-type-chip{background:#1e293b;color:#a5b4fc;border-color:#334155}
    .st-req{display:inline-block;background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px}
    .st-card{border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden;box-shadow:var(--shadow)}
    .st-card-head{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--card-soft);border-bottom:1px solid var(--border);flex-wrap:wrap}
    .st-card-kind{display:inline-block;padding:3px 9px;border-radius:999px;background:#e0e7ff;color:#3730a3;font-size:10px;font-weight:800;border:1px solid #c7d2fe;flex-shrink:0}
    body.dark .st-card-kind{background:#1e293b;color:#a5b4fc;border-color:#334155}
    .st-card-title{font-size:13px;font-weight:700;color:var(--fg);flex:1;min-width:0;word-break:break-word}
    .st-card-code{font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--card);border:1px solid var(--border);padding:2px 6px;border-radius:6px;color:var(--muted);flex-shrink:0}
    .st-card .st-wrap{border:none;border-radius:0;background:transparent}
    .kf-value--rich{padding:10px;min-height:0;display:block}
    body.dark .kf-value--rich{background:#0b1320}
    @media (max-width:720px){
      .st-fields .st-col-type{width:auto}
      .st-fields .st-col-code{width:auto}
    }
    .sl-item--prop{padding-bottom:12px}
    .sl-board--kuc .sl-legend{margin-bottom:8px}
    #settingsLikeRoot:has(.sl-board--kuc){background:#f7f9fa}
    body.dark #settingsLikeRoot:has(.sl-board--kuc){background:transparent}
    .sl-kuc-field-group{display:block;width:100%;max-width:100%;box-sizing:border-box}
    .sl-kuc-fg-inner{display:flex;flex-direction:column;gap:14px;padding:4px 0 8px;min-width:0}
    .sl-kuc-row{border:1px solid var(--border);border-radius:8px;padding:12px 14px;background:var(--card-soft);border-left-width:5px;min-width:0}
    .sl-kuc-row-head{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-bottom:6px}
    .sl-kuc-meta{margin-bottom:8px}
    .sl-kuc-pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;min-width:0}
    .sl-kuc-pair--solo{grid-template-columns:1fr}
    @media (max-width:900px){.sl-kuc-pair{grid-template-columns:1fr}}
    .sl-kuc-pair kuc-textarea-1-24-0{display:block;min-width:0;width:100%}
    .sl-pane--src{background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.22)}
    .sl-pane--tgt{background:rgba(22,163,74,.07);border:1px solid rgba(22,163,74,.28)}
    body.dark .sl-pane--src{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35)}
    body.dark .sl-pane--tgt{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)}
    body.diff-focus-mode aside,body.diff-focus-mode .topbar,body.diff-focus-mode .settings-tabs{display:none}
    body.diff-focus-mode #reviewQueueHost{display:none}
    body.diff-focus-mode .focus-context{display:flex}
    body.diff-focus-mode .sec:not(:has(.drow--focus)){display:none}
    body.diff-focus-mode .drow:not(.drow--focus),body.diff-focus-mode .fj-block:not(.drow--focus),body.diff-focus-mode .same-fold{display:none}
    body.diff-focus-mode .report-workspace{grid-template-columns:minmax(0,1fr)}
    body.diff-focus-mode .report-workspace>main{grid-column:1/-1}
    body.diff-focus-mode main{padding-top:12px}
    body.diff-focus-mode .settings-shell{margin-top:0}
    body.diff-focus-mode .content{padding-top:10px}
    body.diff-density-compact .review-queue{padding:7px 10px}
    body.diff-density-compact .review-queue-samples{display:none}
    body.diff-density-compact .diff-toolbar{padding:6px 9px;gap:4px}
    body.diff-density-compact .sec-head{padding:8px 11px}
    body.diff-density-compact .drow{padding:8px 11px 9px}
    body.diff-density-compact .drow-val{margin-top:6px}
    body.diff-density-compact .val-lane{padding:5px 7px}
    body.diff-density-compact .path-tech{margin-top:1px}
    @media (max-width:1080px){
      body{display:block}
      body.sidebar-drawer-open{overflow:hidden}
      aside{position:relative;top:auto;height:auto;max-height:none;width:auto;min-width:0;overflow:visible;border-right:none;border-bottom:1px solid var(--border);z-index:20;backdrop-filter:none}
      aside.is-open{z-index:90}
      .sb-head{display:block;padding:9px 12px}
      .sb-head .sb-kicker,.sb-meta{display:none}
      .sb-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .sb-title{margin:0;font-size:16px;line-height:1.3}
      .mobile-filter-toggle{display:inline-flex;align-items:center;justify-content:center;margin:0;white-space:nowrap}
      .sidebar-panels{display:none;position:fixed;top:0;right:0;bottom:0;z-index:92;width:min(370px,calc(100vw - 24px));max-height:100vh;overflow-y:auto;background:var(--sidebar);border-left:1px solid var(--border);box-shadow:-18px 0 48px rgba(15,23,42,.24);overscroll-behavior:contain}
      aside.is-open .sidebar-panels{display:flex}
      .sidebar-drawer-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--border);background:var(--card)}
      .sidebar-drawer-head strong{font-size:14px;color:var(--fg)}
      .sidebar-backdrop{padding:0}
      aside.is-open .sidebar-backdrop:not([hidden]){display:block;position:fixed;inset:0;z-index:91;width:100%;height:100%;border:0;border-radius:0;background:rgba(15,23,42,.48);backdrop-filter:blur(3px);cursor:pointer}
      main{padding:14px 14px 26px}
      .diff-toolbar,.sec-head{position:static}
      .sec,.drow{scroll-margin-top:12px}
      .review-queue{grid-template-columns:auto minmax(0,1fr)}
      .review-queue-actions{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
      .review-queue-action{width:100%}
      .val-inline--lanes{grid-template-columns:1fr}
      .val-inline--lanes .vi-arrow{transform:rotate(90deg);justify-self:center}
      .duo-row{grid-template-columns:1fr}
      .duo-cell + .duo-cell{border-left:none}
      .duo-cell.pad{display:none}
      .duo-head{display:none}
      .duo-cell[data-side-label]{align-items:flex-start;gap:8px;padding-top:5px;padding-bottom:5px}
      .duo-cell[data-side-label]::before,.vi-val[data-side-label]::before{content:attr(data-side-label);display:inline-flex;flex:0 0 auto;align-items:center;padding:1px 6px;border:1px solid currentColor;border-radius:999px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;font-size:11px;font-weight:800;line-height:1.4;opacity:.78}
      .vi-val[data-side-label]{display:inline-flex;align-items:baseline;gap:7px}
    }
    @media (max-width:560px){
      main{padding:10px 8px 20px}
      .topbar{padding:12px 12px 13px;border-radius:15px}
      .topbar-title{font-size:1.12rem}
      .topbar-eyebrow-row{align-items:center}
      .header-badge{padding:5px 8px;font-size:11px;line-height:1.2;white-space:nowrap;writing-mode:horizontal-tb}
      .topbar-compare{grid-template-columns:1fr;gap:4px}
      .topbar-arrow{height:14px;transform:rotate(90deg)}
      .topbar-app-card{grid-template-columns:auto auto minmax(0,1fr);padding:7px 9px}
      .topbar-app-card strong{overflow:visible;text-overflow:clip;white-space:normal;word-break:break-word}
      .topbar-desc{font-size:10px;line-height:1.45}
      .settings-shell{margin-top:9px;border-radius:15px}
      .settings-tabs{padding:7px 8px;border-radius:15px 15px 0 0}
      .settings-tab{padding:7px 13px}
      .content{padding:8px}
      .report-notices{margin-bottom:8px}
      .warn{padding:8px 9px;font-size:11px}
      .review-queue{padding:8px 9px;gap:7px}
      .review-queue-mark{width:32px;height:32px;border-radius:10px;font-size:17px}
      .review-queue-main>strong{font-size:13px}
      .review-queue-note{font-size:11px}
      .review-progress--queue{max-width:none}
      .review-progress-note,.review-queue-samples{display:none}
      .review-queue-actions{grid-template-columns:repeat(2,minmax(0,1fr))}
      .review-queue-action{padding:8px 6px;white-space:normal;line-height:1.25}
      .diff-toolbar{padding:8px;border-radius:13px}
      .diff-toolbar-heading,.diff-toolbar-row{align-items:stretch}
      .diff-toolbar-heading{flex-direction:column;gap:5px}
      .diff-scope-counts{justify-content:flex-start}
      .mobile-toolbar-toggle{display:inline-flex;align-self:flex-start}
      .diff-toolbar-row--filters{display:none}
      body.mobile-toolbar-expanded .diff-toolbar-row--filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      .diff-toolbar-row--navigation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      .diff-toolbar-label,.diff-toolbar-spacer{display:none}
      .tchip{justify-content:center}
      .diff-sort{grid-column:1/-1;justify-content:space-between}
      .diff-toolbar-row--navigation>#diffToolbarSort{display:none}
      body.mobile-toolbar-expanded .diff-toolbar-row--navigation>#diffToolbarSort{display:inline-flex}
      .diff-sort select{flex:1;min-width:0}
      .diff-display-modes{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}
      .diff-nav-position{grid-column:1/-1;grid-row:1;text-align:left}
      .active-filters{align-items:flex-start}
      .active-filters-label{width:100%}
      .active-filters--empty{display:none}
      .focus-context{display:none;grid-template-columns:minmax(0,1fr) auto;gap:5px;padding:6px 7px}
      body.diff-focus-mode .focus-context{display:grid}
      .focus-context-pair{grid-column:1/-1}
      .focus-context-pair b{font-size:10px}
      .sec{border-radius:14px}
      .sec-head{align-items:flex-start;padding:10px;border-radius:13px 13px 0 0}
      .sec-counts{gap:4px}
      .cnt{padding:3px 6px;font-size:9px}
      .drow{padding:10px 9px 12px}
      .report-toast{margin:7px 8px 0;padding:8px 10px;font-size:10px}
      body.sidebar-drawer-open .report-toast{display:none}
      .drow-head{flex-wrap:wrap}
      .drow-title{order:3;flex-basis:100%}
      .drow-actions{width:100%;margin-left:0;flex-wrap:wrap}
      .row-review-next{margin-left:auto}
      .path-tech-body>div{grid-template-columns:1fr}
      .val-lane{padding:7px}
    }
    .nav-item.active{background:var(--card);border-color:var(--accent-soft);box-shadow:var(--shadow)}
    .fc-shell{display:flex;flex-direction:column;gap:16px}
    .fc-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
    .fc-card{border:1px solid var(--border);border-radius:16px;padding:14px 16px;background:var(--card);box-shadow:var(--shadow);display:flex;flex-direction:column;gap:10px}
    .fc-card.is-active{border-color:var(--accent);box-shadow:0 0 0 1px rgba(37,99,235,.18),var(--shadow)}
    .fc-card--added{border-left:5px solid #16a34a}
    .fc-card--removed{border-left:5px solid #dc2626}
    .fc-card--changed{border-left:5px solid #ca8a04}
    .fc-card--same{border-left:5px solid #94a3b8}
    .fc-card-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .fc-code{font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}
    .fc-title{font-size:15px;font-weight:800;line-height:1.4;color:var(--fg)}
    .fc-sub{font-size:11px;color:var(--muted);line-height:1.6}
    .fc-chip-row{display:flex;flex-wrap:wrap;gap:8px}
    .fc-chip-row--compact{margin-top:2px}
    .fc-chip{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:var(--card-soft);border:1px solid var(--border);font-size:10px;font-weight:700;color:var(--fg)}
    .fc-chip--muted{color:var(--muted)}
    .fd-overlay{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,23,42,.48);backdrop-filter:blur(6px)}
    .fd-overlay[hidden]{display:none!important}
    .fd-overlay-dialog{width:min(1240px,100%);max-height:calc(100vh - 48px);display:flex;flex-direction:column;border:1px solid var(--border);border-radius:24px;background:var(--card);box-shadow:0 24px 64px rgba(15,23,42,.28);overflow:hidden}
    .fd-overlay-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:18px 20px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%)}
    .fd-overlay-title{font-size:20px;font-weight:800;line-height:1.35;color:var(--fg)}
    .fd-overlay-sub{margin-top:6px;font-size:11px;line-height:1.7;color:var(--muted);word-break:break-word}
    .fd-overlay-actions{display:flex;align-items:center;gap:10px}
    .fd-overlay-hint{font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}
    .fd-overlay-body{padding:18px;background:var(--card-soft);overflow:auto}
    .fd-overlay-body .fd-panel{border:none;box-shadow:none;padding:0;background:transparent}
    .fd-overlay-body .fd-empty{background:var(--card)}
    .fd-panel{border:1px solid var(--border);border-radius:18px;background:var(--card);box-shadow:var(--shadow);padding:18px}
    .fd-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}
    .fd-title{font-size:18px;font-weight:800;line-height:1.35;color:var(--fg)}
    .fd-sub{margin-top:4px;font-size:11px;color:var(--muted);line-height:1.7}
    .fd-sub code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .fd-status{display:inline-flex;align-items:center;justify-content:center;padding:5px 10px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid transparent;white-space:nowrap}
    .fd-status--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .fd-status--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .fd-status--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .fd-status--same{background:#e2e8f0;color:#475569;border-color:#cbd5e1}
    body.dark .fd-status--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .fd-status--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .fd-status--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    body.dark .fd-status--same{background:#334155;color:#cbd5e1;border-color:#475569}
    .fd-snapshots{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0 18px}
    .fd-snapshot{border:1px solid var(--border);border-radius:18px;padding:0;background:#fff;overflow:hidden}
    .fd-snapshot--src{box-shadow:0 10px 24px -18px rgba(37,99,235,.4)}
    .fd-snapshot--tgt{box-shadow:0 10px 24px -18px rgba(22,163,74,.4)}
    body.dark .fd-snapshot{background:#0f172a}
    .fd-pane-label{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
    .fd-mini-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .fd-mini-cell{padding:9px 10px;border-radius:10px;background:var(--card);border:1px solid var(--border);min-width:0}
    .fd-mini-cell span{display:block;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
    .fd-mini-value{font-size:11px;line-height:1.5;color:var(--fg);word-break:break-word}
    .fd-section h3{margin:0 0 12px;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--fg)}
    .fd-change-summary{margin:14px 0 16px;border:1px solid var(--border);border-radius:14px;background:var(--card-soft);padding:12px 14px}
    .fd-change-summary__title{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
    .fd-change-summary__chips{display:flex;flex-wrap:wrap;gap:8px}
    .fd-change-chip{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:5px 9px;border-radius:999px;border:1px solid var(--border);background:var(--card);font-size:10px;font-weight:700;color:var(--fg)}
    .fd-change-chip b{font-size:9px;letter-spacing:.03em;text-transform:uppercase}
    .fd-change-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .fd-change-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .fd-change-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .fd-change-chip--same,.fd-change-chip--more{background:var(--card);color:var(--muted)}
    body.dark .fd-change-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .fd-change-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .fd-change-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    .fd-entry-list{display:flex;flex-direction:column;gap:12px}
    .fd-entry{border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:var(--card-soft)}
    .fd-entry--added{border-left:5px solid #16a34a}
    .fd-entry--removed{border-left:5px solid #dc2626}
    .fd-entry--changed{border-left:5px solid #ca8a04}
    .fd-entry--same{border-left:5px solid #94a3b8}
    .fd-entry-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-bottom:6px}
    .fd-entry-area,.fd-entry-type{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;font-size:10px;font-weight:700;border:1px solid var(--border);background:var(--card)}
    .fd-entry-top strong{font-size:13px;color:var(--fg)}
    .fd-path{font-size:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted);margin-bottom:8px;word-break:break-all}
    .fd-entry-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .fd-entry-col{min-width:0}
    .fd-entry-diff{margin-top:10px}
    .fd-entry-diff .val-inline{font-size:12px}
    .fd-entry-diff .duo{max-height:220px}
    .fd-entry-body{padding:10px 11px;border-radius:10px;border:1px solid var(--border);background:var(--card);font-size:11px;line-height:1.55;word-break:break-word}
    .fd-empty{padding:18px;border:1px dashed var(--border);border-radius:12px;background:var(--card-soft);font-size:12px;line-height:1.7;color:var(--muted)}
    .kf-modal{display:flex;flex-direction:column;background:#fff}
    body.dark .kf-modal{background:#0f172a}
    .kf-modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid #d7dde6;background:#fbfcfd}
    body.dark .kf-modal-head{border-bottom-color:#243245;background:#162032}
    .kf-modal-title{display:flex;align-items:center;gap:10px;min-width:0;color:#1f2a44}
    body.dark .kf-modal-title{color:#e5eefb}
    .kf-modal-title strong{font-size:15px;line-height:1.4;font-weight:700}
    .kf-type-icon{width:20px;height:24px;border:2px solid #8d99ae;border-radius:3px;display:inline-block;position:relative;background:linear-gradient(180deg,#fff,#f2f5f9);flex-shrink:0}
    .kf-type-icon::before,.kf-type-icon::after{content:"";position:absolute;left:4px;right:4px;height:2px;background:#8d99ae;border-radius:999px}
    .kf-type-icon::before{top:6px}
    .kf-type-icon::after{top:12px}
    body.dark .kf-type-icon{border-color:#8fb3e0;background:linear-gradient(180deg,#20314a,#162032)}
    body.dark .kf-type-icon::before,body.dark .kf-type-icon::after{background:#8fb3e0}
    .kf-side{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;font-size:10px;font-weight:800;border:1px solid transparent;white-space:nowrap}
    .kf-side--src{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
    .kf-side--tgt{background:#ecfdf5;color:#15803d;border-color:#bbf7d0}
    body.dark .kf-side--src{background:#172554;color:#bfdbfe;border-color:#1d4ed8}
    body.dark .kf-side--tgt{background:#052e16;color:#bbf7d0;border-color:#15803d}
    .kf-modal-body{display:flex;flex-direction:column;gap:16px;padding:18px}
    .kf-row{display:flex;flex-direction:column;gap:8px}
    .kf-row--full{grid-column:1 / -1}
    .kf-label{font-size:11px;font-weight:700;color:#24324a}
    body.dark .kf-label{color:#dbe7f6}
    .kf-required{color:#dc2626;font-weight:800}
    .kf-value{border:1px solid #d5dce5;border-radius:10px;background:#fff;min-height:46px;padding:12px 14px;font-size:13px;line-height:1.6;color:#1f2937;display:flex;align-items:flex-start;word-break:break-word;box-shadow:inset 0 1px 2px rgba(15,23,42,.04)}
    .kf-value--textarea{min-height:96px;white-space:pre-wrap}
    body.dark .kf-value{border-color:#31435b;background:#0b1320;color:#e2e8f0;box-shadow:none}
    .kf-toggle-list{display:flex;flex-direction:column;gap:10px}
    .kf-toggle{display:flex;align-items:center;gap:12px;font-size:13px;color:#1f2937}
    body.dark .kf-toggle{color:#e2e8f0}
    .kf-toggle-box{width:22px;height:22px;border-radius:4px;border:2px solid #d5dce5;background:#fff;position:relative;flex-shrink:0}
    .kf-toggle.is-on .kf-toggle-box{border-color:#4c97d2;background:#4c97d2}
    .kf-toggle.is-on .kf-toggle-box::after{content:"";position:absolute;left:6px;top:1px;width:6px;height:12px;border-right:3px solid #fff;border-bottom:3px solid #fff;transform:rotate(45deg)}
    body.dark .kf-toggle-box{border-color:#31435b;background:#0b1320}
    .kf-extra{display:flex;flex-direction:column;gap:10px}
    .kf-extra-title{font-size:11px;font-weight:800;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
    .kf-extra-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    @media (max-width:900px){
      .fd-overlay{padding:12px}
      .fd-overlay-head,.kf-modal-head{flex-direction:column;align-items:flex-start}
      .fd-overlay-actions{width:100%;justify-content:space-between}
      .fd-snapshots,.fd-entry-grid,.fd-mini-grid,.kf-extra-grid{grid-template-columns:1fr}
    }

    /* Human-first report shell: direction -> completeness -> facts -> review. */
    body{display:block;min-width:0;background:#f4f6f8;background-image:none}
    body.dark{background:#0b1220;background-image:none}
    .skip-link{position:fixed;left:12px;top:10px;z-index:120;transform:translateY(-160%);padding:10px 14px;border-radius:8px;background:var(--fg);color:var(--card);font-size:12px;font-weight:800;text-decoration:none}
    .skip-link:focus{transform:translateY(0);outline:3px solid var(--accent);outline-offset:2px}
    .report-hero,.report-workspace{width:min(calc(100% - 32px),1440px);margin-inline:auto}
    .report-hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);align-items:stretch;gap:11px 16px;margin-top:16px;padding:21px 22px;border-radius:20px;background:linear-gradient(145deg,var(--card) 0%,color-mix(in srgb,var(--card) 90%,var(--accent-soft)) 100%);box-shadow:0 22px 56px -38px rgba(15,37,63,.62);overflow:visible}
    .report-hero::before{height:4px;background:var(--accent)}
    .report-hero .topbar-main{grid-column:1/-1;display:grid;grid-template-columns:minmax(260px,.78fr) minmax(480px,1.22fr);grid-template-rows:auto auto 1fr;align-items:start;gap:7px 28px}
    .report-hero .topbar-eyebrow-row,.report-hero .topbar-title,.report-hero .topbar-lead{grid-column:1}
    .report-hero .topbar-compare{grid-column:2;grid-row:1/4;align-self:stretch}
    .report-hero .topbar-title{margin:0;font-size:clamp(1.45rem,3vw,2rem)}
    .topbar-lead{max-width:72ch;margin:0;color:var(--muted);font-size:13px;line-height:1.7}
    .report-hero .topbar-compare{width:100%;max-width:none;gap:12px}
    .report-hero .topbar-app-card{grid-template-columns:1fr;align-content:center;gap:3px;min-height:78px;padding:12px 15px;border-top:1px solid var(--border);border-left:4px solid #475569;background:var(--card-soft)}
    .report-hero .topbar-app-card--source{border-left-color:#475569;background:var(--card-soft)}
    .report-hero .topbar-app-card--target{border-left-color:var(--accent);background:var(--card-soft)}
    body.dark .report-hero .topbar-app-card--source,body.dark .report-hero .topbar-app-card--target{background:var(--card-soft)}
    .report-hero .topbar-app-eyebrow{font-size:12px;letter-spacing:.04em}
    .report-hero .topbar-app-side{font-size:11px}
    .report-hero .topbar-app-card strong{font-size:14px;white-space:normal;overflow:visible;word-break:break-word}
    .report-content-disclosure{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:5px 12px;padding:11px 14px;border:1px solid #d6b456;border-left:4px solid #9a6700;border-radius:12px;background:#fffaf0;color:#5f4300;font-size:12px;line-height:1.6}
    .report-content-disclosure strong{white-space:nowrap;font-size:12px}
    .report-content-disclosure--caution{border-color:#e0a06b;border-left-color:#b45309;background:#fff7ed;color:#7c2d12}
    body.dark .report-content-disclosure{border-color:#8b6824;background:#2a210d;color:#fde68a}
    body.dark .report-content-disclosure--caution{border-color:#9a5a24;background:#2f190d;color:#fed7aa}
    .report-step-label{display:block;margin-bottom:3px;color:var(--muted);font-size:11px;font-weight:850;letter-spacing:.06em;text-transform:uppercase}
    .report-completeness{grid-column:1/-1;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px 13px;padding:13px 14px;border:1px solid var(--border);border-radius:14px;background:var(--card-soft)}
    .report-completeness--incomplete{border-color:#f0c36a;background:#fffaf0}
    .report-completeness--complete{border-color:#9bc8ac;background:#f4fbf6}
    body.dark .report-completeness--incomplete{border-color:#8b6824;background:#2a210d}
    body.dark .report-completeness--complete{border-color:#245b3c;background:#0d281a}
    .report-completeness-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#334155;color:#fff;font-size:17px;font-weight:900}
    .report-completeness--incomplete .report-completeness-mark{background:#a16207}
    .report-completeness--complete .report-completeness-mark{background:#15803d}
    .report-completeness-copy h2,.report-facts h2{margin:0;color:var(--fg);font-size:16px;line-height:1.45}
    .report-completeness-copy p{margin:4px 0 0;color:var(--muted);font-size:12px;line-height:1.65}
    .report-diagnostics{grid-column:2;min-width:0;border-top:1px solid color-mix(in srgb,var(--border) 80%,transparent);padding-top:9px}
    .report-diagnostics>summary{display:inline-flex;align-items:center;min-height:36px;color:var(--accent-strong);font-size:11px;font-weight:800;cursor:pointer}
    .report-diagnostics>summary:focus-visible,.tool-details-summary:focus-visible,.related-settings>summary:focus-visible{outline:none;box-shadow:var(--focus);border-radius:7px}
    .report-diagnostics .report-notices{margin:8px 0 0}
    .report-review-start{grid-column:1/-1;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:16px;padding:13px 16px;border:1px solid color-mix(in srgb,var(--accent) 42%,var(--border));border-radius:16px;background:color-mix(in srgb,var(--accent-soft) 58%,var(--card))}
    .report-review-start span{color:var(--muted);font-size:12px;line-height:1.65}
    .report-review-start button{min-height:46px;padding:10px 16px;border:1px solid var(--accent);border-radius:11px;background:linear-gradient(180deg,#3b82f6,var(--accent));color:#fff;font-size:13px;font-weight:850;cursor:pointer;white-space:normal;box-shadow:0 10px 24px -16px rgba(37,99,235,.9)}
    .report-review-start button:hover{filter:brightness(.96)}
    .report-review-start button:focus-visible{outline:3px solid color-mix(in srgb,var(--accent) 48%,transparent);outline-offset:3px}
    .report-facts{grid-column:1/-1;padding-top:4px}
    .report-facts-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:10px}
    .report-facts-head>p{max-width:52ch;margin:0;color:var(--muted);font-size:11px;line-height:1.6;text-align:right}
    .report-fact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px}
    .report-fact-grid article{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;min-width:0;padding:13px 14px 12px;border:1px solid var(--border);border-radius:14px;background:var(--card);overflow:hidden}
    .report-fact-grid article::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:#64748b}
    .report-fact--added::before{background:#15803d!important}
    .report-fact--removed::before{background:#b91c1c!important}
    .report-fact--changed::before{background:#b45309!important}
    .report-fact--moved::before{background:#7c3aed!important}
    .report-fact--same::before{background:#64748b!important}
    .report-fact--empty{grid-column:1/-1}
    .report-fact-grid span{align-self:center;color:var(--fg);font-size:12px;font-weight:750;line-height:1.5}
    .report-fact-grid strong{grid-row:1/3;grid-column:2;align-self:center;font-size:24px;font-variant-numeric:tabular-nums}
    .report-fact-grid small{color:var(--muted);font-size:11px;line-height:1.5}
    .report-meta-line{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px 14px;padding-top:10px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;line-height:1.5}
    .report-workspace{display:grid;grid-template-columns:minmax(248px,282px) minmax(0,1fr);align-items:start;gap:16px;margin-top:16px;margin-bottom:36px}
    .report-workspace>aside{position:sticky;top:12px;width:auto;min-width:0;height:calc(100vh - 24px);max-height:calc(100vh - 24px);border:1px solid var(--border);border-radius:16px;background:var(--sidebar);overflow:auto;box-shadow:none;backdrop-filter:none}
    .report-workspace>main{min-width:0;padding:0;overflow:visible}
    .report-workspace .settings-shell{margin-top:0;border-radius:16px;box-shadow:0 12px 40px -30px rgba(15,23,42,.45)}
    .report-workspace .settings-tabs{border-radius:16px 16px 0 0}
    .tool-details{padding:0!important}
    .tool-details-summary{display:flex;align-items:center;min-height:46px;padding:12px 16px;color:var(--fg);font-size:11px;font-weight:850;cursor:pointer;list-style:none}
    .tool-details-summary::-webkit-details-marker{display:none}
    .tool-details-summary::before{content:"▸";margin-right:7px;color:var(--muted);font-size:9px}
    .tool-details[open] .tool-details-summary::before{transform:rotate(90deg)}
    .tool-details-body{padding:0 16px 16px;border-top:1px solid var(--border)}
    .tool-details-body>.field-label:first-child{margin-top:14px}
    .drow-list{gap:9px;padding:10px;background:var(--card-soft);overflow:visible}
    .drow{border:1px solid var(--border);border-left:4px solid #94a3b8;border-radius:14px;background:var(--card);box-shadow:0 12px 28px -30px rgba(15,37,63,.62)}
    .drow--added{border-left-color:#0f766e}
    .drow--removed{border-left-color:#475569}
    .drow--changed{border-left-color:#b45309}
    .drow-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px 12px}
    .drow-facts{display:flex;grid-column:1/-1;gap:6px;flex-wrap:wrap}
    .drow-title{grid-column:1;min-width:0}
    .drow-actions{grid-column:2;align-self:start}
    .fact-chip{display:inline-flex;align-items:center;gap:6px;min-height:26px;padding:3px 8px;border:1px solid var(--border);border-radius:999px;background:var(--card-soft);color:var(--fg);font-size:11px;font-weight:750;line-height:1.35}
    .fact-chip::before{content:"";width:7px;height:7px;border-radius:50%;background:#64748b;flex:0 0 auto}
    .fact-chip--added::before{background:#0f766e}
    .fact-chip--removed::before{background:#475569}
    .fact-chip--changed::before{background:#b45309}
    .fact-chip--same::before{background:#64748b}
    .fact-chip--difference{background:var(--card)}
    .path-main{font-size:14px;line-height:1.55}
    .path-tech>summary,.related-settings>summary{display:inline-flex;align-items:center;min-height:30px;color:var(--muted);font-size:11px;font-weight:750;cursor:pointer}
    .related-settings{margin-top:2px}
    .related-settings>summary::before{content:"▸";margin-right:5px;font-size:8px}
    .related-settings[open]>summary::before{transform:rotate(90deg)}
    .related-settings ul{display:grid;gap:5px;margin:2px 0 0;padding:8px 10px 8px 26px;border:1px dashed var(--border);border-radius:8px;background:var(--card-soft)}
    .related-settings li{font-size:11px;line-height:1.5;color:var(--fg)}
    .related-settings code{display:block;color:var(--muted);font-size:11px;word-break:break-all}
    .related-settings p{margin:2px 0 0;padding:8px 10px;border:1px dashed var(--border);border-radius:8px;color:var(--muted);font-size:11px}
    .review-queue{border-color:var(--border);background:var(--card);box-shadow:none}
    .review-queue--pending .review-queue-mark{background:var(--accent);color:#fff}
    .review-queue--clear .review-queue-mark{background:#15803d;color:#fff}
    .review-queue-note{line-height:1.5}
    .diff-toolbar{border-top-width:1px;box-shadow:0 10px 30px -25px rgba(15,23,42,.65)}
    .tchip{min-height:36px}
    .settings-tab,.btn,.row-act,.row-review-next,.row-reviewed,.row-select{min-height:36px}

    @media (max-width:900px){
      .report-hero{display:flex;flex-direction:column}
      .report-hero .topbar-main{display:flex;flex-direction:column;gap:9px}
      .report-hero .topbar-compare{width:100%;max-width:980px}
      .report-hero .topbar-app-card{grid-template-columns:auto auto minmax(0,1fr);min-height:66px;padding:12px 14px}
      .report-review-start{display:flex;flex-direction:row;align-items:center;justify-content:space-between}
    }
    @media (max-width:1080px){
      .report-hero,.report-workspace{width:min(calc(100% - 24px),1440px)}
      .report-workspace{display:block}
      .report-workspace>aside{position:relative;top:auto;width:auto;height:auto;max-height:none;margin-bottom:12px;overflow:visible}
      .report-workspace>main{padding:0}
      .report-fact-grid{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
    }
    @media (max-width:768px){
      .report-hero,.report-workspace{width:calc(100% - 16px)}
      .report-hero{gap:12px;margin-top:8px;padding:15px;border-radius:16px}
      .report-hero .topbar-compare{grid-template-columns:1fr;gap:6px}
      .report-hero .topbar-arrow{height:16px;transform:rotate(90deg)}
      .report-completeness{grid-template-columns:auto minmax(0,1fr);padding:13px}
      .report-content-disclosure{grid-template-columns:1fr}
      .report-content-disclosure strong{white-space:normal}
      .report-diagnostics{grid-column:1/-1}
      .report-facts-head{display:block}
      .report-facts-head>p{margin-top:5px;text-align:left}
      .report-fact-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .val-inline--lanes,.duo-row,.fd-entry-grid,.sl-pair{grid-template-columns:1fr}
      .duo-head{display:none}
      .drow-head{grid-template-columns:1fr}
      .drow-facts,.drow-title,.drow-actions{grid-column:1}
      .drow-actions{width:100%;margin-left:0;justify-content:flex-start;flex-wrap:wrap}
      .report-workspace button,.report-workspace input,.report-workspace select,.report-workspace summary{min-height:44px}
      .report-review-start{align-items:stretch;flex-direction:column}
      .report-review-start button{width:100%}
    }
    @media (max-width:480px){
      .report-hero{gap:9px;padding:12px}
      .report-hero .topbar-main{gap:6px}
      .report-hero .topbar-title{font-size:1.5rem}
      .topbar-lead{font-size:12px;line-height:1.55}
      .report-hero .topbar-compare{gap:5px}
      .report-hero .topbar-app-card{min-height:56px;padding:10px 12px}
      .report-hero .topbar-arrow{height:12px}
      .report-content-disclosure{gap:3px;padding:9px 11px;font-size:11px;line-height:1.55}
      .report-completeness{grid-template-columns:auto minmax(0,1fr);gap:9px;padding:11px}
      .report-completeness-copy h2{font-size:15px}
      .report-completeness-copy p{font-size:11px;line-height:1.55}
      .report-review-start{gap:8px;padding:10px 12px}
      .report-fact-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      .report-fact-grid article{padding:10px 12px}
      .report-fact-grid article:last-child:nth-child(odd){grid-column:1/-1}
      .report-completeness-mark{width:30px;height:30px}
      .topbar-eyebrow-row{align-items:flex-start;flex-direction:column}
      .header-badge{white-space:normal}
      .report-meta-line{display:grid;gap:4px}
      .drow-list{padding:7px}
      .drow{padding:10px 9px}
      .fact-chip{white-space:normal}
      .review-queue{grid-template-columns:1fr}
      .review-queue-actions{grid-column:1}
    }
    @media (forced-colors:active){
      .report-content-disclosure,.report-completeness,.report-review-start,.report-fact-grid article,.drow,.fact-chip{forced-color-adjust:auto;border:1px solid CanvasText}
      .fact-chip::before{border:1px solid CanvasText;background:CanvasText}
      :focus-visible{outline:2px solid Highlight!important;outline-offset:2px;box-shadow:none!important}
    }
    @media print{
      @page{size:A4;margin:12mm}
      :root,body.dark{--bg:#fff;--fg:#0f172a;--card:#fff;--card-soft:#f8fafc;--border:#cbd5e1;--sidebar:#f8fafc;--sidebar-fg:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--accent-soft:#dbeafe;--muted:#475569;color-scheme:light}
      body.dark .report-content-disclosure{border-color:#d6b456;border-left-color:#9a6700;background:#fffaf0;color:#5f4300}
      body.dark .report-content-disclosure--caution{border-color:#e0a06b;border-left-color:#b45309;background:#fff7ed;color:#7c2d12}
      body.dark .report-completeness--incomplete{border-color:#f0c36a;background:#fffaf0}
      body.dark .report-completeness--complete{border-color:#9bc8ac;background:#f4fbf6}
      aside,.sb-panel .btn,.settings-tabs,.search-hint,.diff-toolbar,.drow-actions,.review-queue-actions,.skip-link,.report-review-start{display:none!important}
      body{display:block;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .report-hero,.report-workspace{width:100%;margin:0}
      .report-hero{display:block;padding:0 0 14px;border:none;background:#fff}
      .report-hero>*{margin-bottom:10px}
      .report-hero .topbar-main{display:block}
      .report-hero .topbar-compare{margin-top:10px}
      .report-workspace{display:block}
      main{padding:0!important}
      .settings-shell,.sec,.topbar{box-shadow:none}
      .report-diagnostics>summary{display:none}
      .report-diagnostics>.report-notices{display:flex!important}
      .drow-list{gap:6px;padding:6px;background:#fff}
      .sec-head{break-after:avoid}
      .drow,.fj-block,.fc-card,.duo-wrap,.report-fact-grid article{break-inside:avoid}
      details:not([open])>*:not(summary){display:block!important}
      details>summary{break-after:avoid}
      .drow,.fj-block,.fc-card{content-visibility:visible!important;contain-intrinsic-size:none!important}
    }
    @media (prefers-reduced-motion:reduce){
      *,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#reportReview">差分レビューへ移動</a>
  <header class="topbar report-hero" data-report-overview aria-labelledby="reportTitle">
    <div class="topbar-main">
      <div class="topbar-eyebrow-row">
        <div class="sb-kicker">kintone 設定差分</div>
        <span class="header-badge">${esc(reportMeta.exportLabel || '全差分')} · ${esc(reportMeta.exportContentLabel)}</span>
      </div>
      <h1 id="reportTitle" class="topbar-title">設定差分レポート</h1>
      <p class="topbar-lead">比較元の設定と比較先の設定を、同じ項目どうしで確認するためのレポートです。</p>
      <div class="topbar-compare" role="group" aria-label="比較方向">
        <section class="topbar-app-card topbar-app-card--source" aria-label="比較元アプリ">
          <span class="topbar-app-eyebrow">比較元</span>
          <span class="topbar-app-side">現在の値</span>
          <strong>${esc(sourceAppDisplay)}</strong>
        </section>
        <span class="topbar-arrow" aria-hidden="true">→</span>
        <section class="topbar-app-card topbar-app-card--target" aria-label="比較先アプリ">
          <span class="topbar-app-eyebrow">比較先</span>
          <span class="topbar-app-side">比較する値</span>
          <strong>${esc(targetAppDisplay)}</strong>
        </section>
      </div>
    </div>

    ${contentDisclosureHtml}

    <section class="report-completeness report-completeness--${reportMeta.incompleteComparison ? 'incomplete' : 'complete'}" data-comparison-status="${reportMeta.incompleteComparison ? 'incomplete' : 'complete'}" aria-labelledby="comparisonStatusTitle">
      <span class="report-completeness-mark" aria-hidden="true">${reportMeta.incompleteComparison ? '!' : '✓'}</span>
      <div class="report-completeness-copy">
        <span class="report-step-label">1 · 比較の完全性</span>
        <h2 id="comparisonStatusTitle">${reportMeta.incompleteComparison ? 'この結果だけでは、全差分を断定できません' : '比較対象の取得と差分検出は完了しています'}</h2>
        <p>${reportMeta.incompleteComparison
          ? `${incompleteComparisonWarnings.length}件の未完了要因があります。件数は確認できた範囲の下限として扱ってください。`
          : '取得失敗・本文未検証・検出上限による打ち切りはありません。'}</p>
      </div>
      ${noticesHtml ? `<details class="report-diagnostics"${reportMeta.incompleteComparison ? ' open' : ''}><summary>${reportMeta.incompleteComparison ? '未完了の要因を確認' : '取得範囲と収録内容の詳細'}</summary><div class="report-notices">${noticesHtml}</div></details>` : ''}
    </section>

    ${preparedReviewRows.reviewKeys.length ? `<div class="report-review-start" data-review-start><span>未確認の差分を定義順に確認します。確認状態はレポート内で記録できます。</span><button type="button" id="startPendingReviewBtn">未確認レビューを開始（${preparedReviewRows.reviewKeys.length}件）</button></div>` : ''}

    <section class="report-facts" data-objective-counts aria-labelledby="objectiveCountsTitle">
      <div class="report-facts-head">
        <div>
          <span class="report-step-label">2 · 確認できた客観的な件数</span>
          <h2 id="objectiveCountsTitle">存在状況と差分内容</h2>
        </div>
        <p>判断や優先順位は付けず、比較で確認できた事実だけを表示します。</p>
      </div>
      <div class="report-fact-grid">
        ${objectiveFactCardsHtml}
      </div>
    </section>

    <div class="report-meta-line">
      <span>生成 ${esc(reportMeta.generatedAt)}</span>
      <span>対象 ${esc(sectionText || '-')}</span>
      <span>${esc(comparedContentModeNote)}</span>
      <span data-applied-ignore>${esc(appliedIgnoreSummary)}</span>
      <span data-applied-normalization>${esc(appliedNormalizationSummary)}</span>
    </div>
  </header>

  <div class="report-workspace" data-report-workspace>
  <aside data-report-tools>
    <div class="sb-head">
      <div class="sb-kicker">kintone アプリ設定の比較</div>
      <div class="sb-head-row">
        <div class="sb-title">検索・表示</div>
        <button type="button" id="mobileSidebarToggle" class="mobile-filter-toggle" aria-expanded="false" aria-controls="sidebarPanels">条件・出力</button>
      </div>
      <div class="sb-meta">
        生成日時: ${esc(reportMeta.generatedAt)}<br>
        対象: ${esc(sectionText || '-')}<br>
        出力対象: ${esc(reportMeta.exportLabel || '全差分')}<br>
        内容: ${esc(comparedContentModeNote)}
      </div>
    </div>
    <button type="button" id="sidebarBackdrop" class="sidebar-backdrop" aria-label="絞り込みを閉じる" hidden></button>
    <div id="sidebarPanels" class="sidebar-panels">
    <div class="sidebar-drawer-head">
      <strong id="sidebarDrawerTitle">検索・表示・出力</strong>
      <button type="button" id="sidebarDrawerClose" class="btn">閉じる</button>
    </div>
    <div class="sb-panel sb-stats">
      <div class="sidebar-review-progress sidebar-review-progress--solo">
        <div class="review-progress-copy"><span>レビュー進捗</span><strong id="sidebarReviewProgressValue">0 / ${diffTotal}（0%）</strong></div>
        <div id="sidebarReviewProgressBar" class="review-progress-track" role="progressbar" aria-label="レビュー進捗" aria-valuemin="0" aria-valuemax="${diffTotal}" aria-valuenow="0" aria-valuetext="確認済み 0件 / 全 ${diffTotal}件（0%）"><span id="sidebarReviewProgressFill" style="width:0%"></span></div>
      </div>
    </div>
    <div class="sb-panel sb-ctrl">
      <span class="field-label">項目を検索</span>
      <input type="text" id="search" placeholder="項目名・値・理由で検索" aria-label="差分の検索" autocomplete="off">
      <p class="search-hint"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">F</kbd> / <kbd class="kbd">⌘</kbd>+<kbd class="kbd">F</kbd> で検索 · <kbd class="kbd">J</kbd>/<kbd class="kbd">K</kbd> で移動 · <kbd class="kbd">R</kbd> で確認して次へ · <kbd class="kbd">Esc</kbd> でクリア</p>
      <span class="field-label" style="margin-top:14px">表示設定</span>
      <label class="chk"><input type="checkbox" id="hideSame"> 同一項目を隠す</label>
      <label class="chk"><input type="checkbox" id="charDiff" checked> 文字単位ハイライト</label>
      <label class="chk"><input type="checkbox" id="hideUnchangedLines" checked> 複数行差分は変更行だけ表示</label>
      ${includesComparedContent ? '<label class="chk" title="フィールドごとに区切って、設定JSON全体を左右に並べて行単位で比較します（WinMerge風）"><input type="checkbox" id="rawJson"> JSONで比較（フィールド単位）</label>' : ''}
      <label class="chk" title="「確認」チェックを付けた差分行を一覧から隠します"><input type="checkbox" id="hideReviewed"> 確認済みを隠す</label>
      <span class="field-label">表示視点</span>
      <div class="view-side" role="radiogroup" aria-label="差分の表示視点" title="どちらか一方のアプリから見た内容だけを表示します（追加・削除の判定は変わりません）">
        <label class="vs-opt"><input type="radio" name="viewSide" value="both" checked> 両側</label>
        <label class="vs-opt"><input type="radio" name="viewSide" value="source"> 比較元</label>
        <label class="vs-opt"><input type="radio" name="viewSide" value="target"> 比較先</label>
      </div>
      <div class="sb-btns">
        <button type="button" class="btn" id="collapseBtn">全折畳</button>
        <button type="button" class="btn" id="expandBtn">全展開</button>
        <button type="button" class="btn" id="csvBtn" title="表示中の差分行をCSVファイルとして保存">CSV保存</button>
        <button type="button" class="btn" id="mdBtn" title="表示中の差分行をMarkdown表としてクリップボードにコピー">MDコピー</button>
        <button type="button" class="btn" id="themeBtn" style="grid-column:span 2">ダークに切替</button>
      </div>
    </div>
    <div class="sb-panel sb-stats">
      <details class="sidebar-count-details">
        <summary>件数の内訳</summary>
        <div class="sb-stat-grid">
          <div class="sb-stat"><span>表示中</span><b id="stat-total">${summary.total}</b></div>
          <div class="sb-stat"><span>比較先のみ</span><b id="stat-added">${summary.added}</b></div>
          <div class="sb-stat"><span>比較元のみ</span><b id="stat-removed">${summary.removed}</b></div>
          <div class="sb-stat"><span>内容差</span><b id="stat-changed">${objectiveContentChangedCount}</b></div>
          <div class="sb-stat"><span>並び順差</span><b id="stat-moved">${summary.moved}</b></div>
          <div class="sb-stat"><span>同じ</span><b id="stat-same">${summary.same}</b></div>
          <div class="sb-stat"><span>確認済み</span><b id="stat-reviewed">0</b></div>
          <div class="sb-stat"><span>選択中</span><b id="stat-selected">0</b></div>
        </div>
        <div style="margin-top:10px;font-size:11px;color:var(--muted)">取得失敗: <b>${fetchIssues.length}</b></div>
      </details>
    </div>
    ${includesComparedContent ? `<details class="sb-panel sb-ctrl tool-details">
      <summary class="tool-details-summary">出力・反映・比較証跡</summary>
      <div class="tool-details-body">
      <span class="field-label">反映JSON（選択差分 → APIパラメータ）</span>
      <p class="search-hint" style="margin-top:0">${canBuildReflectJson
        ? '行やフィールドの「選択」にチェックした差分から、比較元の設定値で比較先アプリを上書きするためのAPIパラメータJSONを作成します。'
        : esc(reflectJsonBlockedReason)}</p>
      <div class="sb-btns">
        <button type="button" class="btn" id="reflectJsonBtn"${reflectJsonDisabledAttrs}>反映JSON保存</button>
        <button type="button" class="btn" id="reflectJsonCopyBtn"${reflectJsonDisabledAttrs}>反映JSONコピー</button>
      </div>
      <span class="field-label" style="margin-top:10px">作成時に利用した設定JSON（比較証跡）</span>
      <div class="sb-btns">
        <button type="button" class="btn" id="srcJsonBtn">比較元JSON</button>
        <button type="button" class="btn" id="tgtJsonBtn">比較先JSON</button>
      </div>
      </div>
    </details>` : ''}
    <div class="sb-panel sb-ctrl sb-advanced">
      <details class="adv">
        <summary class="adv-summary">詳細オプション（表示の絞り込み）</summary>
        <p class="adv-note">出力前と同じ条件をこのレポート上でも選択できます。比較のやり直しは行わず、該当する差分行を表示から除外します。</p>
        <span class="field-label">無視キー（追加）</span>
        <textarea id="extraIgnoreKeys" class="adv-textarea" rows="2" placeholder="無視キー（カンマ区切り）" aria-label="追加の無視キー"></textarea>
        ${reportMeta.ignoreKeys ? `<p class="adv-baked">比較時に適用済みの無視キー: ${esc(reportMeta.ignoreKeys)}</p>` : ''}
        <div class="adv-checks">
          ${advPresetChecksHtml}
        </div>
      </details>
    </div>
    <details class="sb-panel sb-ctrl tool-details review-state-tools">
      <summary class="tool-details-summary">レビュー状態を引き継ぐ</summary>
      <div class="tool-details-body">
        <p class="search-hint">別の端末や担当者へ確認済み状態だけを引き継ぐための補助機能です。</p>
        <div class="review-state-transfer-actions" aria-label="レビュー状態JSONの保存と読込">
          <button type="button" class="btn" id="reviewStateSaveBtn" title="このレポートの確認済み状態をJSONファイルに保存">状態を保存</button>
          <button type="button" class="btn" id="reviewStateLoadBtn" aria-controls="reviewStateFile" title="このレポート用に保存した確認済み状態JSONを読み込んで置き換え">状態を読込</button>
          <input type="file" id="reviewStateFile" accept="application/json,.json" hidden>
          <p id="reviewStateStatus" class="review-state-status" role="status" aria-live="polite">JSONファイルで保存・読込できます（最大2MB）</p>
        </div>
      </div>
    </details>
    <div id="navWrap">
      <div class="nav-label">セクションへジャンプ</div>
      <div id="nav"></div>
    </div>
    </div>
  </aside>
  <main id="reportReview" data-review-workspace tabindex="-1">
    <div class="settings-shell">
      <div class="settings-tabs" role="tablist" aria-label="レポート表示切替">
        <button id="reportTabDiff" type="button" role="tab" class="settings-tab" data-report-tab="diff" aria-selected="true" aria-controls="reportPaneDiff" tabindex="0">差分一覧</button>
        ${includesComparedContent ? '<button id="reportTabSettingsLike" type="button" role="tab" class="settings-tab passive" data-report-tab="settingsLike" aria-selected="false" aria-controls="reportPaneSettingsLike" tabindex="-1">フィールド単位</button>' : ''}
      </div>
      <div id="reportToast" class="report-toast" role="status" aria-live="polite" aria-atomic="true"></div>

      <section id="reportPaneDiff" class="tab-pane" data-report-pane="diff" role="tabpanel" aria-labelledby="reportTabDiff">
        <div class="content">
          <p id="reportFilterStatus" class="report-filter-status" role="status" aria-live="polite" aria-atomic="true">表示 ${summary.total}件、全体 ${reportRows.length}件、未確認 ${preparedReviewRows.reviewKeys.length}件</p>
          <div id="main" aria-busy="false"></div>
        </div>
      </section>

      ${includesComparedContent ? `<section id="reportPaneSettingsLike" class="tab-pane" data-report-pane="settingsLike" role="tabpanel" aria-labelledby="reportTabSettingsLike" hidden>
        <div class="content" style="padding:0">
          <p class="muted" style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6"><strong>フィールド単位</strong>で、フィールドごとの設定差分を1つの項目にまとめて確認します。検索と「同一項目を隠す」が連動し、カードのボタンから詳細を表示できます。</p>
          <div id="settingsLikeRoot" class="sl-root"></div>
        </div>
      </section>` : ''}
    </div>

    ${includesComparedContent ? `<div id="fieldDetailModal" class="fd-overlay" hidden>
      <div class="fd-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="fieldDetailModalTitle" aria-describedby="fieldDetailModalSub" tabindex="-1">
        <div class="fd-overlay-head">
          <div>
            <div class="sb-kicker">フィールドの設定差分</div>
            <div id="fieldDetailModalTitle" class="fd-overlay-title">フィールド詳細</div>
            <div id="fieldDetailModalSub" class="fd-overlay-sub">フィールドコード: - / 型: -</div>
          </div>
          <div class="fd-overlay-actions">
            <span class="fd-overlay-hint">Esc で閉じる</span>
            <button type="button" class="btn" data-modal-close>閉じる</button>
          </div>
        </div>
        <div id="fieldDetailModalBody" class="fd-overlay-body"></div>
      </div>
    </div>` : ''}
  </main>
  </div>
  <script>${logicScript}</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// UI sync helpers (in-panel diff view)
// ---------------------------------------------------------------------------

export function syncDiffThemeButton() {
  if (!ui.diffThemeBtn) return;
  ui.diffThemeBtn.textContent = `比較テーマ: ${getThemeDisplayLabel(state.diffViewTheme)}`;
}

export function renderDiffSuggestionChips() {
  if (!ui.diffSuggestedIgnore) return;
  state.diffIgnoreSuggestions = buildIgnoreKeySuggestions(state.lastDiffRows, ui.ignoreKeys.value);
  if (!state.lastDiffRows.length) {
    ui.diffSuggestedIgnore.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">差分比較後に候補を表示します</span>';
    return;
  }
  if (!state.diffIgnoreSuggestions.length) {
    ui.diffSuggestedIgnore.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">候補なし</span>';
    return;
  }
  ui.diffSuggestedIgnore.innerHTML = state.diffIgnoreSuggestions.map((item) =>
    `<button type="button" class="btn sub" data-act="addSuggestedIgnore" data-key="${esc(item.key)}" style="font-size:11px;padding:4px 8px">＋${esc(item.key)} <span style="opacity:.8">(${item.count})</span></button>`
  ).join('');
}

export function renderDiffFilterOptions() {
  if (!ui.diffFilterSection) return;
  const ex = state.diffExcludeSections;
  let sections = [...new Set([
    ...(state.lastDiffRows || []).map((r) => r.sectionKey),
    ...(state.lastFetchIssues || []).map((r) => r.sectionKey),
    ...(state.lastPartialIssues || []).map((r) => r.sectionKey)
  ].filter(Boolean))];
  if (Array.isArray(ex) && ex.length) {
    sections = sections.filter((k) => !ex.includes(k));
  }
  const current = state.diffFilterSection || ui.diffFilterSection.value || '';
  ui.diffFilterSection.innerHTML = '<option value="">全セクション</option>' +
    sections.map((secKey) => {
      const label = SECTION_DEFS.find((d) => d.key === secKey)?.label || secKey;
      return `<option value="${esc(secKey)}">${esc(label)}</option>`;
    }).join('');
  ui.diffFilterSection.value = sections.includes(current) ? current : '';
  state.diffFilterSection = ui.diffFilterSection.value;
}

// 出力メニュー内のライブ件数プレビュー。
// 現在の範囲（全件/選択/表示中/お気に入り）で実際に何件出力されるかを、
// 保存ボタンを押す前に確認できるようにする。
export function renderDiffExportSummary() {
  const host = getToolDocument().getElementById('u_diffExportSummary');
  if (!host) return;
  const total = (state.lastDiffRows || []).length;
  const issues = (state.lastFetchIssues || []).length;
  const partialIssues = (state.lastPartialIssues || []).length;
  if (!total && !issues && !partialIssues && !state.lastDiffAt) {
    host.className = 'diff-export-panel__summary is-empty';
    host.textContent = '差分比較を実行すると出力対象の件数が表示されます';
    return;
  }
  const mode = resolveDiffExportMode();
  const resolved = mode === 'selected'
    ? { label: '選択行', rows: getSelectedDiffRows() }
    : mode === 'visible'
      ? { label: '表示中', rows: getRenderedDiffRows() }
      : mode === 'favorites'
        ? { label: 'お気に入り', rows: getFavoriteDiffRows() }
        : { label: '全件', rows: state.lastDiffRows || [] };
  const actual = countActualDiffRows(resolved.rows);
  if (mode !== 'all' && !resolved.rows.length) {
    host.className = 'diff-export-panel__summary is-warn';
    host.textContent = `⚠ 「${resolved.label}」に該当する差分がありません。このまま出力するとエラーになります。範囲を変えるか、行を選択してください。`;
    return;
  }
  const s = summarizeRows(resolved.rows);
  const breakdown = `追加${s.added} / 削除${s.removed} / 変更${s.changed}${s.moved ? ` / 移動${s.moved}` : ''}${s.same ? ` / 同一${s.same}` : ''}`;
  const issueNote = mode === 'all' && issues ? ` ＋ 取得失敗 ${issues}件` : '';
  const partialIssueNote = mode === 'all' && partialIssues ? ` ＋ 本文未検証 ${partialIssues}件` : '';
  const truncation = state.lastDiffTruncation;
  const truncated = hasIncompleteActualDiffTruncation(truncation);
  const droppedSame = Number(truncation?.droppedSame || 0);
  const incomplete = truncated || partialIssues > 0;
  host.className = `diff-export-panel__summary${incomplete ? ' is-warn' : ''}`;
  host.innerHTML = `出力対象: <b>${esc(resolved.label)} ${actual}件</b>（${breakdown}）${issueNote}${partialIssueNote}`
    + `<span class="diff-export-panel__summary-sub">内容: ${esc(getDiffExportContentLabel(resolveDiffExportContentMode()))}</span>`
    + (truncated ? '<span class="diff-export-panel__summary-sub">⚠ 差分上限打ち切りが発生しています。出力は不完全です。</span>' : '')
    + (!truncated && droppedSame > 0 ? `<span class="diff-export-panel__summary-sub">ℹ 同一証跡 ${droppedSame}件を省略しています（実差分の走査は完了）。</span>` : '')
    + (partialIssues ? '<span class="diff-export-panel__summary-sub">⚠ JS/CSS等に本文未検証があります。fileKey 等による比較結果です。</span>' : '');
}

export function renderDiffSelectionState() {
  renderDiffExportSummary();
  if (!ui.diffSelectionState) return;
  const total = (state.lastDiffRows || []).length;
  const selected = getSelectedDiffRows().length;
  const rendered = getRenderedDiffRows().length;
  const issues = (state.lastFetchIssues || []).length;
  const partialIssues = (state.lastPartialIssues || []).length;
  const normalization = getActiveDiffNormalizationLabels();
  let reviewTodo = 0;
  let reviewIgnored = 0;
  let reviewNotes = 0;
  for (const row of (state.lastDiffRows || [])) {
    if (!row || row.type === 'same') continue;
    const meta = getDiffReviewMeta(row);
    if (meta.status === 'todo') reviewTodo += 1;
    if (meta.status === 'ignored') reviewIgnored += 1;
    if (meta.note) reviewNotes += 1;
  }
  const reviewSummary = `レビュー 要対応 ${reviewTodo}件 / 無視 ${reviewIgnored}件 / メモ ${reviewNotes}件`;
  const exportModeLabelMap = {
    all: '全件（比較結果）',
    selected: '選択済み行のみ',
    visible: '現在表示中のみ',
    favorites: 'お気に入り行のみ'
  };
  if (!total && !issues && !partialIssues && !state.lastDiffAt) {
    ui.diffSelectionState.textContent = '⏳ まだ差分を実行していません';
    ui.diffSelectionState.classList.add('is-empty-state');
    return;
  }
  ui.diffSelectionState.classList.remove('is-empty-state');
  ui.diffSelectionState.textContent =
    `選択 ${selected}/${total}件 / 表示中 ${rendered}件 / API取得失敗 ${issues}件 / 本文未検証 ${partialIssues}件 / ${reviewSummary} / 出力対象 ${exportModeLabelMap[resolveDiffExportMode()] || '全件（比較結果）'} / 出力内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} / 正規化 ${normalization.join(', ') || '-'}`;
}

export function renderDiffWarningBox() {
  if (!ui.diffWarnBox) return;
  const warning = buildDiffWarningInfo(state.lastDiffRows, state.lastFetchIssues, state.lastPartialIssues);
  if (!warning.threshold) {
    ui.diffWarnBox.style.display = 'none';
    ui.diffWarnBox.textContent = '';
    return;
  }
  if (!warning.exceeded) {
    ui.diffWarnBox.style.display = 'none';
    ui.diffWarnBox.textContent = '';
    return;
  }
  ui.diffWarnBox.style.display = 'block';
  ui.diffWarnBox.textContent = `差分 ${warning.diffCount}件 + API取得失敗 ${warning.issueCount}件 + 本文未検証 ${warning.partialIssueCount}件 = ${warning.total}件 が警告しきい値 ${warning.threshold}件以上です。`;
}

// ---------------------------------------------------------------------------
// Main in-panel diff result renderer
// ---------------------------------------------------------------------------

const ENTITY_KIND_INTAB_LABELS: Record<string, string> = {
  view: 'ビュー', report: 'グラフ', state: 'ステータス', action: '遷移アクション',
  appAction: 'アクション', aclEntry: '権限エントリー', fieldAclEntry: 'フィールド権限',
  recordAclEntry: 'レコード権限', notification: '通知',
  perRecordNotification: 'レコード条件通知', reminderNotification: 'リマインダー通知',
  category: 'カテゴリ', plugin: 'プラグイン', jsCss: 'JS/CSS', layoutRow: 'レイアウト行'
};

function formatDiffPathRich(row) {
  const p = String(row?.path || '-');
  if (p === '-') return esc(p);
  const fieldInfo = extractFieldPathInfo(row?.path);
  if (!fieldInfo && (row?.entityLabel || row?.entityKind)) {
    const sectionLabel = SECTION_DEFS.find((d) => d.key === row?.sectionKey)?.label || row?.section || '';
    const kindLabel = ENTITY_KIND_INTAB_LABELS[row?.entityKind || ''] || '';
    const propLabel = String(row?.entityPropLabel || '');
    const sectionHtml = sectionLabel
      ? `<span class="diff-path-chip diff-path-chip--section" title="${esc(sectionLabel)}">${esc(sectionLabel)}</span>`
      : '';
    const kindChipHtml = kindLabel
      ? `<span class="diff-path-chip diff-path-chip--entity" title="${esc(kindLabel)}">${esc(kindLabel)}</span>`
      : '';
    const propHtml = propLabel ? `<span class="diff-path-prop"> · ${esc(propLabel)}</span>` : '';
    const arrowHtml = sectionHtml && kindChipHtml ? '<span class="diff-path-arrow" aria-hidden="true">▸</span>' : '';
    return `
      <span class="diff-path-line diff-path-context">
        ${sectionHtml}
        ${arrowHtml}
        ${kindChipHtml}
        <span class="diff-path-name"><strong>${esc(row?.entityLabel || '-')}</strong></span>
        ${propHtml}
      </span>
      <span class="diff-path-line diff-path-rich" title="${esc(p)}"><span class="diff-path-prefix">${esc(p)}</span></span>`;
  }
  if (fieldInfo) {
    const readFieldDef = (code, side) => {
      if (!code) return null;
      const bundle = side === 'target' ? state.lastTargetBundle : state.lastSourceBundle;
      return bundle?.fieldSettings?.properties?.[code] || null;
    };
    const readSubFieldDef = (tableCode, subFieldCode, side) => {
      const table = readFieldDef(tableCode, side);
      return table?.fields?.[subFieldCode] || null;
    };
    const formatCodeName = (field, code) => {
      const label = String(field?.label || field?.name || '').trim();
      return label ? `${label} (${code})` : String(code || '');
    };
    const resolveFieldName = (code: string | undefined | null, tableCode?: string | null) => {
      if (!code) return '';
      if (tableCode) {
        const sub = readSubFieldDef(tableCode, code, 'target') || readSubFieldDef(tableCode, code, 'source');
        return formatCodeName(sub, code);
      }
      const f = readFieldDef(code, 'target') || readFieldDef(code, 'source');
      return formatCodeName(f, code);
    };
    const isTableRoot = fieldInfo.isFieldRoot
      && (row?.left?.type === 'SUBTABLE' || row?.right?.type === 'SUBTABLE');
    const propLabel = fieldChangePropTitleFromInfo(fieldInfo, row);
    const propHtml = propLabel ? `<span class="diff-path-prop"> · ${esc(propLabel)}</span>` : '';
    const rel = p.startsWith('fieldSettings.') ? p.slice('fieldSettings.'.length) : p;
    let contextHtml;
    if (fieldInfo.isSubField) {
      const tableName = resolveFieldName(fieldInfo.rootCode) || fieldInfo.rootCode;
      const subName = resolveFieldName(fieldInfo.subFieldCode, fieldInfo.rootCode) || fieldInfo.subFieldCode;
      contextHtml = `
        <span class="diff-path-line diff-path-context">
          <span class="diff-path-chip diff-path-chip--table" title="テーブル">⊞ テーブル</span>
          <span class="diff-path-name">${esc(tableName)}</span>
          <span class="diff-path-arrow" aria-hidden="true">▸</span>
          <span class="diff-path-chip diff-path-chip--subfield" title="テーブル内フィールド">↳ テーブル内</span>
          <span class="diff-path-name diff-path-name--child"><strong>${esc(subName)}</strong></span>
          ${propHtml}
        </span>`;
    } else if (isTableRoot) {
      const tableName = resolveFieldName(fieldInfo.activeCode) || fieldInfo.activeCode;
      contextHtml = `
        <span class="diff-path-line diff-path-context">
          <span class="diff-path-chip diff-path-chip--table" title="テーブル">⊞ テーブル</span>
          <span class="diff-path-name"><strong>${esc(tableName)}</strong></span>
          ${propHtml}
        </span>`;
    } else {
      const fieldName = resolveFieldName(fieldInfo.activeCode) || fieldInfo.activeCode;
      contextHtml = `
        <span class="diff-path-line diff-path-context">
          <span class="diff-path-chip diff-path-chip--field" title="フィールド">▣ フィールド</span>
          <span class="diff-path-name"><strong>${esc(fieldName)}</strong></span>
          ${propHtml}
        </span>`;
    }
    return contextHtml +
      `<span class="diff-path-line diff-path-rich" title="${esc(p)}"><span class="diff-path-prefix">${esc(rel)}</span></span>`;
  }
  return `<span class="diff-path-line diff-path-rich" title="${esc(p)}"><span class="diff-path-prefix">${esc(p)}</span></span>`;
}

function buildDiffSummaryBars(summary) {
  const seg = [
    ['diff-bar-added', summary.added],
    ['diff-bar-removed', summary.removed],
    ['diff-bar-changed', summary.changed],
    ['diff-bar-moved', summary.moved]
  ].filter(([, n]) => n > 0);
  if (!seg.length) return '';
  const inner = seg.map(([cls, n]) =>
    `<span class="diff-bar ${cls}" style="flex:${Math.max(1, n)}"></span>`
  ).join('');
  return `<div class="diff-summary-bars" role="presentation" aria-hidden="true">${inner}</div>`;
}

function buildDiffImpactCardsHtml(rows) {
  const actual = getActualDiffRows(rows);
  if (!actual.length) return '';
  const bySection = new Map();
  for (const row of actual) {
    const key = row.sectionKey || '';
    if (!key) continue;
    const slot = bySection.get(key) || { key, label: '', total: 0, added: 0, removed: 0, changed: 0, moved: 0, high: 0, medium: 0, low: 0, viewed: 0 };
    slot.label = SECTION_DEFS.find((d) => d.key === key)?.label || key;
    slot.total += 1;
    if (row.type === 'added') slot.added += 1;
    else if (row.type === 'removed') slot.removed += 1;
    else if (row.type === 'changed') slot.changed += 1;
    if (row.moved) slot.moved += 1;
    const sev = row.severity || 'low';
    if (sev === 'high') slot.high += 1;
    else if (sev === 'medium') slot.medium += 1;
    else slot.low += 1;
    if (isDiffRowViewed(row)) slot.viewed += 1;
    bySection.set(key, slot);
  }
  const items = [...bySection.values()].sort((a, b) => (b.high - a.high) || (b.total - a.total));
  if (!items.length) return '';
  const curSec = ui.diffFilterSection?.value || state.diffFilterSection || '';
  const cards = items.map((item) => {
    const progress = item.total > 0 ? Math.min(1, item.viewed / item.total) : 0;
    const progressPct = Math.round(progress * 100);
    const warnIcon = item.high > 0
      ? `<span class="diff-impact-card-warn" title="高重要度 ${item.high}件">⚠ 高 ${item.high}</span>`
      : '';
    const stats = [
      item.added ? `<span class="diff-impact-stat added" title="追加">+${item.added}</span>` : '',
      item.removed ? `<span class="diff-impact-stat removed" title="削除">-${item.removed}</span>` : '',
      item.changed ? `<span class="diff-impact-stat changed" title="変更">~${item.changed}</span>` : '',
      item.moved ? `<span class="diff-impact-stat moved" title="移動">↕${item.moved}</span>` : ''
    ].filter(Boolean).join('');
    const activeClass = curSec === item.key ? ' is-active' : '';
    const reviewed = item.total === item.viewed ? ' is-complete' : '';
    // D7: severity-tinted left border + section icon
    const sevTone = item.high > 0 ? ' diff-impact-card--high' : item.medium > 0 ? ' diff-impact-card--medium' : ' diff-impact-card--low';
    return `<button type="button" class="diff-impact-card${activeClass}${reviewed}${sevTone}" data-diff-sec-nav="${esc(item.key)}" title="${esc(item.label)} へジャンプ">
        <div class="diff-impact-card-head">
          ${renderSectionIconHtml(item.key, { withTooltip: item.label })}
          <span class="diff-impact-card-title">${esc(item.label)}</span>
          ${warnIcon}
        </div>
        <div class="diff-impact-card-total">${item.total}<span class="diff-impact-card-unit">件</span></div>
        <div class="diff-impact-stats">${stats}</div>
        <div class="diff-impact-progress" title="レビュー済み ${item.viewed}/${item.total}">
          <div class="diff-impact-progress-bar" style="width:${progressPct}%"></div>
          <span class="diff-impact-progress-label">レビュー ${item.viewed}/${item.total}</span>
        </div>
      </button>`;
  }).join('');
  return `<div class="diff-impact-cards" role="region" aria-label="セクション別インパクト">${cards}</div>`;
}

function buildDiffSectionNavHtml(rows) {
  const cur = ui.diffFilterSection?.value || state.diffFilterSection || '';
  const baseRows = getFilteredDiffRowsWithoutSectionFilter(rows);
  const grouped = groupDiffRowsBySection(baseRows);
  const sel = state.diffSelectedIds || new Set();
  const selectedInBase = baseRows.filter((r) => sel.has(r._id || '')).length;
  const total = baseRows.length;
  const pills = [
    `<button type="button" class="diff-sec-pill${!cur ? ' is-active' : ''}" data-diff-sec-nav="" title="全セクション（セクション以外のフィルタはそのまま）">すべて <span class="diff-sec-pill-n">${total}</span>${selectedInBase ? `<span class="diff-sec-pill-sel">選択${selectedInBase}</span>` : ''}</button>`
  ];
  for (const g of grouped) {
    const nSel = g.rows.filter((r) => sel.has(r._id)).length;
    const active = cur === g.key ? ' is-active' : '';
    pills.push(
      `<button type="button" class="diff-sec-pill${active}" data-diff-sec-nav="${esc(g.key)}" title="${esc(g.label)}">${renderSectionIconHtml(g.key)}<span>${esc(g.label)}</span> <span class="diff-sec-pill-n">${g.rows.length}</span>${nSel ? `<span class="diff-sec-pill-sel">${nSel}</span>` : ''}</button>`
    );
  }
  return `<nav class="diff-sec-nav" aria-label="セクションで絞り込み">${pills.join('')}</nav>`;
}

function scheduleDiffPopoutSync() {
  queueMicrotask(() => {
    import('./popout.js').then((m) => {
      try { m.syncDiffPopoutMirror(); } catch (e) { /* ignore */ }
    }).catch(() => {});
  });
}

function paintDiffOffViewPlaceholder(rows) {
  if (!ui.result) return;
  const list = rows || state.lastDiffRows || [];
  const n = list.length;
  const m = (state.lastFetchIssues || []).length;
  const p = (state.lastPartialIssues || []).length;
  if (!n && !m && !p) {
    ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア（ヘッダー差分）</p><p class="main-result-placeholder-body">差分比較後は、比較条件の下にある<strong>差分結果の整理・出力</strong>から一覧・絞り込み・出力を確認できます。</p></div>`;
    return;
  }
  const notes = [m ? `取得失敗 ${m} 件` : '', p ? `本文未検証 ${p} 件` : ''].filter(Boolean).join(' / ');
  ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">差分 ${n} 行を保持中${notes ? `（${notes}）` : ''}</p><p class="main-result-placeholder-body">一覧・チェック・出力は<strong>差分結果の整理・出力</strong>で行ってください。</p></div>`;
}

/** 差分以外のタブへ移したときに、差分テーブルが残り続けないようにする */
export const MAIN_RESULT_IDLE_HTML = `
<div class="main-result-placeholder">
  <p class="main-result-placeholder-title">使い方ガイド</p>
  <ol class="main-result-placeholder-steps">
    <li><strong>① 接続</strong> 比較元・比較先アプリIDを入力（必要ならゲストID／プレビュー切替）</li>
    <li><strong>② 比較</strong> 「差分比較」を実行すると差分テーブルがここに出ます</li>
    <li><strong>③ 確認</strong> 「JSON / 出力 / 詳細」で内容や CSV/Markdown 等にエクスポート</li>
    <li><strong>④ 反映</strong> 「プレビュー反映」タブで対象を選んで比較先プレビューへ書き込み</li>
  </ol>
  <p class="main-result-placeholder-body">
    キーボードショートカット: <kbd>1</kbd>=差分 <kbd>2</kbd>=反映 <kbd>5</kbd>=ER図 <kbd>?</kbd>=ヘルプ <kbd>Esc</kbd>=ランチャーに戻る
  </p>
</div>`;

export function renderResultRows(rows) {
  // テーブル（SUBTABLE）の追加/削除行をテーブル内フィールド単位に、非フィールド
  // セクションの「丸ごと追加/削除」をエンティティ単位に展開して表示する。
  // 展開行には _displayOnly フラグを付与しており、反映系のロジックからは除外される。
  rows = expandSubtableRowsForDisplay(expandEntityRowsForDisplay(rows || []));
  const summary = summarizeRows(rows);
  const severitySummary = summarizeSeverity(rows);
  const fetchSummary = summarizeFetchIssues(state.lastFetchIssues);
  const renameCount = new Set((rows || []).map((row) => row.renameCandidate?.id).filter(Boolean)).size;
  const impactCount = (rows || []).filter((row) => row.impactCount > 0).length;
  syncDiffThemeButton();
  const useCharDiff = !!ui.charDiff?.checked;
  const filteredRows = getFilteredDiffRows(rows);
  const grouped = groupDiffRowsBySection(filteredRows);
  const filteredSeverity = summarizeSeverity(filteredRows);
  const filteredIssues = getFilteredFetchIssues(state.lastFetchIssues);
  const filteredPartialIssues = getFilteredPartialIssues(state.lastPartialIssues);
  const renderedRows = getRenderedDiffRows(rows);
  const selectedRows = getSelectedDiffRows(rows);
  const rawKeyword = String(ui.diffSearch?.value || '').trim();

  renderDiffSelectionState();
  renderDiffSuggestionChips();
  renderDiffWarningBox();

  const impactCardsHtml = rows.length ? buildDiffImpactCardsHtml(rows) : '';
  const sectionNavHtml = rows.length ? buildDiffSectionNavHtml(rows) : '';
  const viewedCount = countViewedInRows(rows);
  const actualTotal = summary.total - summary.same;
  const viewedPct = actualTotal > 0 ? Math.round((viewedCount / actualTotal) * 100) : 0;
  const hideViewedActive = !!state.diffHideViewed;
  const viewedControlsHtml = actualTotal > 0 ? `
      <div class="diff-viewed-controls" role="group" aria-label="レビュー進捗">
        <span class="diff-viewed-progress" title="差分 ${actualTotal}件中 ${viewedCount}件をレビュー済みにしています">
          <span class="diff-viewed-progress-bar"><span class="diff-viewed-progress-fill" style="width:${viewedPct}%"></span></span>
          <span class="diff-viewed-progress-text">レビュー ${viewedCount}/${actualTotal} (${viewedPct}%)</span>
        </span>
        <button type="button" class="diff-viewed-btn${hideViewedActive ? ' is-active' : ''}" data-act="toggleHideViewed" title="レビュー済みの行を一覧から隠します">${hideViewedActive ? '✓ 済みを隠す（ON）' : '済みを隠す'}</button>
        <button type="button" class="diff-viewed-btn" data-act="markVisibleViewed" title="現在表示中の差分すべてをレビュー済みにします">表示中をレビュー済みに</button>
        <button type="button" class="diff-viewed-btn" data-act="clearViewed" title="すべてのレビュー済みフラグを外します">すべて未レビューへ</button>
      </div>
    ` : '';

  // D2: number-first stat chips replacing the long pill row
  const totalActual = summary.total - summary.same;
  const statChipsHtml = `
      <div class="diff-stat-chip-row" role="group" aria-label="差分サマリー">
        <div class="diff-stat-chip diff-stat-chip--accent" title="差分の総件数（同一除く）">
          <div class="diff-stat-chip__num">${totalActual}</div>
          <div class="diff-stat-chip__label">差分</div>
        </div>
        <div class="diff-stat-chip${summary.added ? ' diff-stat-chip--add' : ''}" title="追加">
          <div class="diff-stat-chip__num">+${summary.added}</div>
          <div class="diff-stat-chip__label">追加</div>
        </div>
        <div class="diff-stat-chip${summary.removed ? ' diff-stat-chip--rm' : ''}" title="削除">
          <div class="diff-stat-chip__num">−${summary.removed}</div>
          <div class="diff-stat-chip__label">削除</div>
        </div>
        <div class="diff-stat-chip${summary.changed ? ' diff-stat-chip--chg' : ''}" title="変更">
          <div class="diff-stat-chip__num">~${summary.changed}</div>
          <div class="diff-stat-chip__label">変更</div>
        </div>
        ${summary.moved ? `<div class="diff-stat-chip diff-stat-chip--mv" title="移動"><div class="diff-stat-chip__num">↕${summary.moved}</div><div class="diff-stat-chip__label">移動</div></div>` : ''}
        <div class="diff-stat-chip${severitySummary.high > 0 ? ' diff-stat-chip--high' : ''}" title="重要度 高">
          <div class="diff-stat-chip__num">${severitySummary.high}</div>
          <div class="diff-stat-chip__label">高</div>
        </div>
        <div class="diff-stat-chip${severitySummary.medium > 0 ? ' diff-stat-chip--mid' : ''}" title="重要度 中">
          <div class="diff-stat-chip__num">${severitySummary.medium}</div>
          <div class="diff-stat-chip__label">中</div>
        </div>
        <div class="diff-stat-chip" title="重要度 低">
          <div class="diff-stat-chip__num">${severitySummary.low}</div>
          <div class="diff-stat-chip__label">低</div>
        </div>
        ${summary.same ? `<div class="diff-stat-chip" title="同一"><div class="diff-stat-chip__num">${summary.same}</div><div class="diff-stat-chip__label">同一</div></div>` : ''}
        ${fetchSummary.total ? `<div class="diff-stat-chip diff-stat-chip--err" title="API取得失敗"><div class="diff-stat-chip__num">${fetchSummary.total}</div><div class="diff-stat-chip__label">取得失敗</div></div>` : ''}
        ${state.lastPartialIssues?.length ? `<div class="diff-stat-chip diff-stat-chip--err" title="JS/CSS等の本文未検証"><div class="diff-stat-chip__num">${state.lastPartialIssues.length}</div><div class="diff-stat-chip__label">本文未検証</div></div>` : ''}
        ${selectedRows.length ? `<div class="diff-stat-chip diff-stat-chip--accent" title="選択中"><div class="diff-stat-chip__num">${selectedRows.length}</div><div class="diff-stat-chip__label">選択</div></div>` : ''}
        ${viewedCount ? `<div class="diff-stat-chip diff-stat-chip--ok" title="レビュー済"><div class="diff-stat-chip__num">${viewedCount}</div><div class="diff-stat-chip__label">レビュー済</div></div>` : ''}
        ${renameCount ? `<div class="diff-stat-chip" title="名称変更候補"><div class="diff-stat-chip__num">${renameCount}</div><div class="diff-stat-chip__label">改名候補</div></div>` : ''}
      </div>`;

  const viewMode = state.diffViewMode === 'category' ? 'category' : 'table';
  const viewModeToggleHtml = `
      <div class="diff-view-mode-toggle" role="group" aria-label="差分の表示モード切替">
        <span class="diff-view-mode-toggle__lbl">表示</span>
        <button type="button" class="diff-view-mode-btn${viewMode === 'table' ? ' is-active' : ''}" data-act="setDiffViewMode" data-mode="table" title="差分行を表形式で一覧表示（既定）">📋 行一覧</button>
        <button type="button" class="diff-view-mode-btn${viewMode === 'category' ? ' is-active' : ''}" data-act="setDiffViewMode" data-mode="category" title="権限・プロセス・通知などをカテゴリ別の可視化で表示">🗂 セクション別</button>
      </div>`;

  const truncation = state.lastDiffTruncation;
  const truncationSections = Array.isArray(truncation?.sections) ? truncation.sections : [];
  const truncationPartial = truncationSections
    .filter((section) => diffTruncationScanStatusOf(section) === 'partial');
  const truncationUnscanned = truncationSections
    .filter((section) => diffTruncationScanStatusOf(section) === 'unscanned');
  const actualDiffTruncated = hasIncompleteActualDiffTruncation(truncation);
  const truncationHtml = actualDiffTruncated ? `
      <div class="diff-truncation-warn" role="alert">
        <span class="diff-truncation-warn__icon" aria-hidden="true">⚠</span>
        <div class="diff-truncation-warn__body">
          <strong>差分が上限（${truncation.diffLimit}件）に達したため、超過分は検出されていません${truncation.droppedDiff ? `（判明分だけで ${truncation.droppedDiff}件が欠落）` : ''}。${truncationPartial.length ? ` 部分走査セクション ${truncationPartial.length}件は総件数不明で、表示件数は下限です。` : ''}${truncationUnscanned.length ? ` 未走査セクション ${truncationUnscanned.length}件は件数不明です。` : ''}</strong>
          この比較結果は不完全なため、反映対象の判断には使わないでください。
          無視キーや正規化プリセットでノイズを減らすか、比較セクションを絞って再実行してください。
          ${truncationSections.length ? `<div class="diff-truncation-warn__sections">打ち切り発生セクション: ${truncationSections.map((s) => {
            const label = esc(diffTruncationSectionLabel(s));
            const scanStatus = diffTruncationScanStatusOf(s);
            if (scanStatus === 'unscanned') return `${label}（未走査・件数不明）`;
            if (scanStatus === 'partial') return `${label}（部分走査・総件数不明／表示件数は下限）`;
            return `${label}（走査完了・未収録 ${knownOmittedDiffCount(s)}件）`;
          }).join(' / ')}</div>` : ''}
        </div>
      </div>` : Number(truncation?.droppedSame || 0) > 0 ? `
      <div class="diff-truncation-warn" role="status">
        <span class="diff-truncation-warn__icon" aria-hidden="true">ℹ</span>
        <div class="diff-truncation-warn__body">
          <strong>同一証跡は上限（${truncation.sameLimit}件）まで表示し、${truncation.droppedSame}件を省略しました。</strong>
          実差分の検出結果は完全です。
        </div>
      </div>` : '';

  const summaryHtml = `
      <div class="diff-summary-head" role="region" aria-label="差分サマリー">
        ${truncationHtml}
        ${buildDiffSummaryBars(summary)}
        ${statChipsHtml}
        <div class="diff-summary diff-summary--meta">
          <span class="diff-info">表示 ${renderedRows.length}/${filteredRows.length}/${rows.length}</span>
          ${filteredRows.length !== rows.length ? `<span class="diff-info">絞込中: 高 ${filteredSeverity.high} / 中 ${filteredSeverity.medium} / 低 ${filteredSeverity.low}</span>` : ''}
          ${rawKeyword ? `<span class="diff-info">検索: ${esc(rawKeyword)}</span>` : ''}
        </div>
        ${viewModeToggleHtml}
        ${viewMode === 'table' ? impactCardsHtml : ''}
        ${viewedControlsHtml}
        ${viewMode === 'table' ? sectionNavHtml : ''}
      </div>
    `;

  const issueHtml = filteredIssues.length ? `<section class="diff-issues">
      <div class="diff-issues-head">API取得失敗 ${filteredIssues.length}件</div>
      <table class="diff-issue-table">
        <thead><tr><th style="width:200px">セクション</th><th style="width:100px">対象</th><th>内容</th></tr></thead>
        <tbody>${filteredIssues.map((issue) => `<tr>
          <td>${esc(issue.section || issue.sectionKey || '-')}</td>
          <td>${esc(getIssueSideLabel(issue.side))}</td>
          <td><div class="diff-issue-msg">${esc(issue.message || '-')}</div></td>
        </tr>`).join('')}</tbody>
      </table>
    </section>` : '';

  const partialIssueHtml = filteredPartialIssues.length ? `<section class="diff-issues" role="alert">
      <div class="diff-issues-head">⚠ 本文未検証 ${filteredPartialIssues.length}件</div>
      <table class="diff-issue-table">
        <thead><tr><th style="width:200px">セクション</th><th style="width:100px">対象</th><th>内容</th></tr></thead>
        <tbody>${filteredPartialIssues.map((issue) => `<tr>
          <td>${esc(issue.section || issue.sectionKey || '-')}</td>
          <td>${esc(getIssueSideLabel(issue.side))}</td>
          <td><div class="diff-issue-msg">${esc(issue.message || '本文を取得できなかったため、fileKey 等で比較しました')}</div></td>
        </tr>`).join('')}</tbody>
      </table>
    </section>` : '';

  if (!rows.length && !state.lastFetchIssues.length && !state.lastPartialIssues.length) {
    ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''}">
        ${summaryHtml}
        <div class="diff-empty">差分はありません。</div>
      </div>`;
    scheduleDiffPopoutSync();
    return;
  }

  if (viewMode === 'category') {
    // セクション別ビュー: 権限/プロセス/通知/ビュー/レイアウト/JS-CSS/アプリ設定 を
    // カテゴリ別タブの可視化（マトリクス・カード・図）でレンダリングする。
    ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''} diff-view--category">
        ${summaryHtml}
        ${partialIssueHtml}
        ${issueHtml}
        ${buildCategoryViewHtml(rows)}
      </div>`;
    scheduleDiffPopoutSync();
    try {
      getToolDocument().dispatchEvent(new CustomEvent('kus:diffRendered', { detail: { count: rows.length, mode: 'category' } }));
    } catch (e) { /* ignore */ }
    return;
  }

  if (!filteredRows.length && !filteredIssues.length && !filteredPartialIssues.length) {
    ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''}">
        ${summaryHtml}
        <div class="diff-empty">検索条件に一致する差分はありません。</div>
      </div>`;
    scheduleDiffPopoutSync();
    return;
  }

  const sectionHtml = grouped.map((g) => {
    const collapsed = state.diffCollapsedSections.has(g.key);
    // D4: section icon + per-type counts in head
    const secCounts = g.rows.reduce(
      (acc, r) => {
        if (!r) return acc;
        if (r.type === 'added') acc.added += 1;
        else if (r.type === 'removed') acc.removed += 1;
        else if (r.type === 'changed') acc.changed += 1;
        else if (r.type === 'moved') acc.moved += 1;
        else if (r.type === 'same') acc.same += 1;
        const sev = String(r.severity || 'low').toLowerCase();
        if (sev === 'high') acc.high += 1;
        else if (sev === 'medium') acc.medium += 1;
        else acc.low += 1;
        return acc;
      },
      { added: 0, removed: 0, changed: 0, moved: 0, same: 0, high: 0, medium: 0, low: 0 }
    );
    const headBadges = [
      secCounts.added ? `<span class="diff-sec-badge diff-sec-badge--add" title="追加">+${secCounts.added}</span>` : '',
      secCounts.removed ? `<span class="diff-sec-badge diff-sec-badge--rm" title="削除">−${secCounts.removed}</span>` : '',
      secCounts.changed ? `<span class="diff-sec-badge diff-sec-badge--chg" title="変更">~${secCounts.changed}</span>` : '',
      secCounts.moved ? `<span class="diff-sec-badge diff-sec-badge--mv" title="移動">↕${secCounts.moved}</span>` : '',
      secCounts.high ? `<span class="diff-sec-badge diff-sec-badge--high" title="高重要度">⚠ ${secCounts.high}</span>` : ''
    ].filter(Boolean).join('');
    const head = `<div class="diff-sec-head" data-diff-sec-toggle="${esc(g.key)}">
        <span class="diff-sec-head__title">
          <span class="diff-sec-head__chev" aria-hidden="true">${collapsed ? '▶' : '▼'}</span>
          ${renderSectionIconHtml(g.key, { withTooltip: g.label })}
          <span class="diff-sec-head__label">${esc(g.label)}</span>
        </span>
        <span class="diff-sec-head__badges">${headBadges}</span>
        <span class="diff-sec-meta">${g.rows.length} 件</span>
      </div>`;
    if (collapsed) return `<section class="diff-sec">${head}</section>`;

    const visible = Math.max(40, state.diffSectionVisibleCounts[g.key] || 80);
    const renderRows = g.rows.slice(0, visible);
    const rowsHtml = renderRows.map((r) => {
      const typeLabel = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
      const typeClass = r.type === 'same' ? 'same' : (r.type === 'added' ? 'added' : (r.type === 'removed' ? 'removed' : 'changed'));
      const sev = r.severity || 'low';
      const sevClass = sev === 'high' ? 'sev-high' : (sev === 'medium' ? 'sev-medium' : 'sev-low');
      const cols = renderRowColumns(r, useCharDiff);
      const selected = state.diffSelectedIds.has(r._id) ? 'checked' : '';
      const rowAccent = `diff-row-t-${typeClass}`;
      const rowFieldInfo = extractFieldPathInfo(r?.path);
      const isSubfieldRow = !!(rowFieldInfo?.isSubField) || !!r._expandedFromTable;
      const isTableRootRow = !!(rowFieldInfo?.isFieldRoot)
        && (r?.left?.type === 'SUBTABLE' || r?.right?.type === 'SUBTABLE');
      const hierarchyClass = isSubfieldRow
        ? ' diff-row-subfield'
        : (isTableRootRow ? ' diff-row-table-root' : '');
      const canReflect = !r._displayOnly && !r._nonActionable && !!r.sectionKey;
      const reflectBtn = canReflect
        ? `<button type="button" class="diff-mini-btn diff-mini-btn--reflect" data-send-to-reflect="${esc(r._id || '')}" title="この差分ノードだけを反映対象に追加し、反映タブへ移動します">反映へ送る</button>`
        : '';
      const rowLeafKey = r?.path ? getPathLeafKey(r.path) : '';
      const rowPath = String(r?.path || '');
      const ignoreKeyBtn = rowLeafKey
        ? `<button type="button" class="diff-mini-btn diff-mini-btn--ignore" data-act="ignoreRowKey" data-key="${esc(rowLeafKey)}" title="このキー名 (${esc(rowLeafKey)}) を無視キーに追加。同名キーが現れる差分はすべて除外されます">キー無視</button>`
        : '';
      const ignorePathBtn = rowPath
        ? `<button type="button" class="diff-mini-btn diff-mini-btn--ignore" data-act="ignoreRowPath" data-path="${esc(rowPath)}" title="このパス (${esc(rowPath)}) ぴったりだけを無視。配列のインデックスや位置も含めて完全一致">パス無視</button>`
        : '';
      const viewed = isDiffRowViewed(r);
      const viewedChecked = viewed ? 'checked' : '';
      const viewedClass = viewed ? ' diff-row-viewed' : '';
      const focusClass = state.diffFocusedRowId === r._id ? ' diff-row-focused' : '';
      // D1: severity left-border via class on TR + viewed-faded class (S15)
      const sevBorderClass = sev === 'high' ? ' diff-row-sev-high' : sev === 'medium' ? ' diff-row-sev-medium' : ' diff-row-sev-low';
      const reviewedFadedClass = viewed ? ' is-reviewed-faded' : '';
      // D3: diff type icon
      const typeGlyph = r.type === 'added' ? '+' : r.type === 'removed' ? '−' : r.type === 'same' ? '＝' : (r.moved ? '↕' : '~');
      const sevGlyph = sev === 'high' ? '⚠' : sev === 'medium' ? '⚡' : '◦';
      return `<tr class="${rowAccent}${selected ? ' diff-row-selected' : ''}${hierarchyClass}${viewedClass}${focusClass}${sevBorderClass}${reviewedFadedClass}" data-diff-row-tr="${esc(r._id)}">
          <td><input type="checkbox" data-diff-row-id="${esc(r._id)}" aria-label="この差分を選択" ${selected}></td>
          <td class="diff-viewed-cell">
            <label class="diff-viewed-toggle" title="レビュー済みとしてマーク（キー: v）">
              <input type="checkbox" data-diff-viewed-id="${esc(r._id)}" aria-label="レビュー済み" ${viewedChecked}>
              <span class="diff-viewed-mark" aria-hidden="true">${viewed ? '✓' : ''}</span>
            </label>
          </td>
          <td><span class="diff-sev-pill diff-sev-pill--${sev}" title="${esc(getSeverityDisplayLabel(sev))}重要度"><span class="diff-sev-pill__icon">${sevGlyph}</span>${esc(getSeverityDisplayLabel(sev))}</span></td>
          <td><span class="diff-type-pill diff-type-pill--${typeClass}" title="${esc(typeLabel || '-')}"><span class="diff-type-pill__icon">${typeGlyph}</span>${esc(typeLabel || '-')}</span></td>
          <td>
            <div class="diff-tools">
              <button type="button" class="diff-mini-btn" data-copy-val="${esc(r.path || '')}">パス</button>
              ${reflectBtn}
              ${ignoreKeyBtn}
              ${ignorePathBtn}
            </div>
            <div class="diff-path diff-path-cell" title="${esc(r.path || '-')}">${formatDiffPathRich(r)}</div>
            ${renderDiffRowMeta(r)}
            ${renderDiffReviewControls(r)}
          </td>
          <td class="diff-cell">${cols.left}</td>
          <td class="diff-cell">${cols.right}</td>
        </tr>`;
    }).join('');
    const remain = g.rows.length - renderRows.length;
    const moreHtml = remain > 0
      ? `<div class="diff-more"><button class="btn sub" data-act="moreDiffRows" data-sec="${esc(g.key)}">さらに表示 (${remain}件)</button></div>`
      : '';

    return `<section class="diff-sec">
        ${head}
        <table class="diff-table">
          <thead><tr><th style="width:56px">選択</th><th style="width:48px" title="レビュー済みチェック（キー: v）">済</th><th style="width:90px">重要度</th><th style="width:120px">種別</th><th style="width:260px">パス</th><th>比較元</th><th>比較先</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        ${moreHtml}
      </section>`;
  }).join('');

  ui.result.innerHTML = `<div class="diff-view ${state.diffViewTheme === 'dark' ? 'dark' : ''}">
      ${summaryHtml}
      ${partialIssueHtml}
      ${issueHtml}
      ${!rows.length ? '<div class="diff-empty">比較差分はありません。取得失敗または本文未検証のみ検出されています。</div>' : ''}
      ${sectionHtml}
    </div>`;
  scheduleDiffPopoutSync();
  try {
    getToolDocument().dispatchEvent(new CustomEvent('kus:diffRendered', { detail: { count: rows.length } }));
  } catch (e) { /* ignore */ }
}
