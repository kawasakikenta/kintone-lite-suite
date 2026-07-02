import {
  SECTION_DEFS, TOOL_ID,
  LINE_DIFF_MAX_CELLS, CHAR_DIFF_MAX_CELLS,
  DEFAULT_IGNORE_KEYS, DIFF_NORMALIZATION_PRESETS
} from '../constants.js';
import {
  esc, deepClone, safeJsonForScript, decodeHtmlEntities, stripHtmlToText,
  getDiffTypeDisplayLabel, getSeverityDisplayLabel,
  getIssueSideLabel, getPreviewStateLabel, getThemeDisplayLabel,
  renderSectionIconHtml
} from '../utils.js';
import { state, ui } from '../state.js';
import {
  getActualDiffRows, countActualDiffRows, parseIgnoreRules,
  summarizeRows, summarizeFetchIssues,
  normalizeIgnoreToken, getPathLeafKey,
  getActiveDiffNormalizationLabels, normalizeSectionForCompare,
  expandSubtableRowsForDisplay,
  expandEntityRowsForDisplay
} from './engine.js';
import { summarizeSeverity, extractFieldPathInfo, getFieldRowPayload } from './enrich.js';
import { buildIgnoreKeySuggestions, getFilteredDiffRowsWithoutSectionFilter, getFavoriteDiffRows } from './filter.js';
import { resolveBundleRevision, pickBundleSections } from '../api.js';
import { getToolDocument } from '../ui/dialog.js';
import { buildCategoryViewHtml } from './category-view.js';
import { decodeRow, isSemanticSection } from './path-decoder.js';

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
  return mode === 'withCompared' ? '行データ + 比較設定' : '行データのみ';
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

export function buildDiffWarningInfo(rows, issues) {
  const threshold = parseDiffWarnThreshold();
  const diffCount = countActualDiffRows(rows || state.lastDiffRows || []);
  const issueCount = (issues || state.lastFetchIssues || []).length;
  const total = diffCount + issueCount;
  const exceeded = threshold > 0 && total >= threshold;
  return { threshold, diffCount, issueCount, total, exceeded };
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

export function buildDiffSectionSummaries(rows, fetchIssues: any[] = []) {
  const groupedRows = new Map();
  const issueKeys = new Set();
  (rows || []).forEach((row) => {
    const key = String(row?.sectionKey || row?.section || '').trim() || '未分類';
    if (!groupedRows.has(key)) groupedRows.set(key, []);
    groupedRows.get(key).push(row);
  });
  (fetchIssues || []).forEach((issue) => {
    const key = String(issue?.sectionKey || issue?.section || '').trim();
    if (key) issueKeys.add(key);
  });
  const keys = [...new Set([...groupedRows.keys(), ...issueKeys])];
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
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeIssues = Array.isArray(fetchIssues) ? fetchIssues : [];
  const stateMap = normalizationState || ({} as any);
  const sectionSummaries = buildDiffSectionSummaries(safeRows, safeIssues);
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
      sectionCount: sectionSummaries.length,
      sectionsWithDiff: sectionSummaries.filter((item) => item.diffCount > 0).length,
      severity: summarizeSeverity(safeRows),
      warning: warning || {
        threshold: 0,
        diffCount: typeSummary.diffCount,
        issueCount: safeIssues.length,
        total: typeSummary.diffCount + safeIssues.length,
        exceeded: false
      },
      // 差分エンジンの上限打ち切り情報。truncated: true のとき、この出力は不完全。
      truncation: truncation?.truncated ? truncation : null
    },
    sectionSummaries,
    highlights: buildDiffHighlightRows(safeRows),
    fetchIssues: safeIssues.map(buildCompactFetchIssue),
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
  const diffRows = getActualDiffRows(rows);
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

export function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys, options: any = {}) {
  const withSameSections = (() => {
    const baseRows = Array.isArray(rows) ? [...rows] : [];
    const scopeList = Array.isArray(scopes) ? scopes.filter(Boolean) : [];
    if (!scopeList.length || !sourceBundle?.sections || !targetBundle?.sections) return baseRows;
    const issueSectionSet = new Set((Array.isArray(options.fetchIssues) ? options.fetchIssues : [])
      .map((issue) => issue?.sectionKey)
      .filter(Boolean));
    const rowSectionSet = new Set(baseRows.map((row) => row?.sectionKey).filter(Boolean));
    const presetState = options.normalizationState || ({} as any);
    for (const sec of scopeList) {
      if (rowSectionSet.has(sec) || issueSectionSet.has(sec)) continue;
      const sourceSec = sourceBundle.sections?.[sec];
      const targetSec = targetBundle.sections?.[sec];
      if (!sourceSec || !targetSec) continue;
      const normalizedSource = normalizeSectionForCompare(sec, sourceSec, presetState);
      const normalizedTarget = normalizeSectionForCompare(sec, targetSec, presetState);
      if (JSON.stringify(normalizedSource) !== JSON.stringify(normalizedTarget)) continue;
      const sectionLabel = (SECTION_DEFS.find((def) => def.key === sec) || ({} as any)).label || sec;
      baseRows.push({
        _id: `same:${sec}`,
        sectionKey: sec,
        section: sectionLabel,
        type: 'same',
        path: sec,
        left: normalizedSource,
        right: normalizedTarget,
        severity: 'low'
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
  const MAX_EXPORT_ROWS = 2000;
  // 差分一覧の見通しを良くするため、SUBTABLE 追加/削除行をテーブル内フィールド単位に、
  // 非フィールドのセクション全体追加/削除をエンティティ単位に、それぞれ事前展開する。
  const displayRows = expandSubtableRowsForDisplay(expandEntityRowsForDisplay(withSameSections));
  const exportRows = displayRows.slice(0, MAX_EXPORT_ROWS);
  const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
  const warning = options.warning || { threshold: 0, exceeded: false, total: withSameSections.length + fetchIssues.length };
  const exportContentMode = options.exportContentMode || 'diffOnly';
  const exportContentLabel = options.exportContentLabel || getDiffExportContentLabel(exportContentMode);
  const compareScopes = Array.isArray(options.compareScopes) ? options.compareScopes : [];
  const compareSourceBundle = options.compareSourceBundle || null;
  const compareTargetBundle = options.compareTargetBundle || null;
  /** kintone-ui-component UMD / Kucs グローバルと一致させる */
  const KUC_REPORT_VERSION = '1.24.0';
  const engineTruncation = options.truncation?.truncated ? options.truncation : null;
  const exportPayload = buildDiffExportPayload({
    sourceBundle,
    targetBundle,
    rows: withSameSections,
    fetchIssues,
    ignoreKeys,
    exportMode: options.exportMode || 'all',
    exportLabel: options.exportLabel || '全差分',
    exportContentMode,
    exportContentLabel,
    normalizationState: options.normalizationState || ({} as any),
    warning,
    truncation: engineTruncation,
    compareScopes,
    compareSourceBundle,
    compareTargetBundle
  });
  const reportMeta = {
    generatedAt: exportPayload.generatedAt,
    scopes: scopes || [],
    sectionText,
    ignoreKeys: exportPayload.export.ignoreKeys,
    exportMode: exportPayload.export.mode,
    exportLabel: exportPayload.export.label,
    exportContentMode: exportPayload.export.contentMode,
    exportContentLabel: exportPayload.export.contentLabel,
    normalizationLabels: exportPayload.export.normalizationLabels,
    warning: exportPayload.summary.warning,
    source: exportPayload.source,
    target: exportPayload.target,
    summary,
    diffOverview: exportPayload.summary,
    sectionSummaries: exportPayload.sectionSummaries,
    highlights: exportPayload.highlights,
    fetchIssues,
    totalRows: withSameSections.length,
    renderedRows: exportRows.length,
    truncated: withSameSections.length > exportRows.length,
    compareScopes
  };
  const sectionSummaryRowsHtml = reportMeta.sectionSummaries.map((item) => `<tr>
        <td>
          <div class="sum-table-name">${esc(item.sectionLabel)}</div>
          <div class="sum-table-sub">${esc(
            item.topReasons.length
              ? item.topReasons.map((reason) => `${reason.reason} (${reason.count})`).join(' / ')
              : item.samplePaths.join(' / ') || '-'
          )}</div>
        </td>
        <td>${item.diffCount}</td>
        <td>${item.added}</td>
        <td>${item.removed}</td>
        <td>${item.changed}</td>
        <td>${item.sameCount}</td>
        <td>${item.fetchIssueCount}</td>
        <td>${item.severity.high} / ${item.severity.medium} / ${item.severity.low}</td>
      </tr>`).join('');
  const sectionSummaryHtml = reportMeta.sectionSummaries.length
    ? `<section class="panel">
            <h3>セクション別サマリー</h3>
            <div class="sum-table-wrap">
              <table class="sum-table">
                <thead><tr><th>セクション</th><th>差分</th><th>追加</th><th>削除</th><th>変更</th><th>同一</th><th>取得失敗</th><th>高 / 中 / 低</th></tr></thead>
                <tbody>${sectionSummaryRowsHtml}</tbody>
              </table>
            </div>
          </section>`
    : `<section class="panel"><h3>セクション別サマリー</h3><div class="muted-note">対象セクションはありません。</div></section>`;
  const highlightCardsHtml = reportMeta.highlights.map((item) => `<article class="highlight-card">
        <div class="highlight-top">
          <span class="meta-tag reason">${esc(getDiffTypeDisplayLabel(item.type, { moved: item.moved }))}</span>
          <span class="meta-tag impact">重要度 ${esc(getSeverityDisplayLabel(item.severity))}</span>
        </div>
        <div class="highlight-title">${esc(item.sectionLabel)} / ${esc(item.relativePath || item.path || '-')}</div>
        <div class="highlight-sub">${esc(item.reasonSummary || '-')}</div>
        ${item.impactSummary ? `<div class="highlight-sub">影響: ${esc(item.impactSummary)}</div>` : ''}
        ${item.renameCandidate ? `<div class="highlight-sub">名称変更候補: ${esc(item.renameCandidate.fromCode || '-')} → ${esc(item.renameCandidate.toCode || '-')}</div>` : ''}
        <div class="highlight-preview">
          <div class="highlight-pane"><span class="highlight-pane-label">比較元</span>${esc(item.preview.source || '（なし）')}</div>
          <div class="highlight-pane"><span class="highlight-pane-label">比較先</span>${esc(item.preview.target || '（なし）')}</div>
        </div>
      </article>`).join('');
  const highlightSummaryHtml = reportMeta.highlights.length
    ? `<section class="panel">
            <h3>注目差分</h3>
            <div class="highlight-list">${highlightCardsHtml}</div>
          </section>`
    : `<section class="panel"><h3>注目差分</h3><div class="muted-note">注目差分はありません。</div></section>`;
  const diffTotal = summary.added + summary.removed + summary.changed;
  const diffRate = summary.total ? Math.round((diffTotal / summary.total) * 100) : 0;
  const severitySummary = reportMeta.diffOverview?.severity || { high: 0, medium: 0, low: 0 };

  const compareSectionsHtml = shouldIncludeComparedContent(exportContentMode) && compareScopes.length
    ? compareScopes.map((secKey) => {
      const label = sectionLabelMap[secKey] || secKey;
      const sourceValue = compareSourceBundle?.sections?.[secKey];
      const targetValue = compareTargetBundle?.sections?.[secKey];
      const sourceRevision = compareSourceBundle?.meta?.sectionRevisions?.[secKey] || '-';
      const targetRevision = compareTargetBundle?.meta?.sectionRevisions?.[secKey] || '-';
      return `<section class="compare-sec">
          <div class="compare-head">
            <span>${esc(label)}</span>
            <span class="compare-head-meta">比較元 rev ${esc(sourceRevision)} / 比較先 rev ${esc(targetRevision)}</span>
          </div>
          <div class="compare-grid">
            <div class="compare-card">
              <div class="compare-title">比較元</div>
              <pre class="compare-pre">${esc(stringifyForDiff(sourceValue))}</pre>
            </div>
            <div class="compare-card">
              <div class="compare-title">比較先</div>
              <pre class="compare-pre">${esc(stringifyForDiff(targetValue))}</pre>
            </div>
          </div>
        </section>`;
    }).join('')
    : '';
  const compareHtml = compareSectionsHtml ? `<section class="compare-box">
      <div class="compare-box-head">比較対象設定 (${compareScopes.length}セクション)</div>
      ${compareSectionsHtml}
    </section>` : '';

  const srcFieldProps = (() => {
    const s = sourceBundle?.sections?.fieldSettings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
    if (s.properties && typeof s.properties === 'object' && !Array.isArray(s.properties)) return s.properties;
    return s;
  })();
  const tgtFieldProps = (() => {
    const s = targetBundle?.sections?.fieldSettings;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return {};
    if (s.properties && typeof s.properties === 'object' && !Array.isArray(s.properties)) return s.properties;
    return s;
  })();

  const logicScript = `
(() => {
  const REPORT_ROWS = ${safeJsonForScript(exportRows)};
  const SECTION_LABEL_MAP = ${safeJsonForScript(sectionLabelMap)};
  const ENTITY_KIND_LABEL_MAP = ${safeJsonForScript(entityKindLabelMap)};
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const ACTIVE_TAB_KEY = '${TOOL_ID}:diffReportActiveTab';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();
  const KUC_SEMVER = '${KUC_REPORT_VERSION}';
  const FIELD_PROPS_SRC = ${safeJsonForScript(srcFieldProps)};
  const FIELD_PROPS_TGT = ${safeJsonForScript(tgtFieldProps)};
  const LAYOUT_ROWS_SRC = ${safeJsonForScript(sourceBundle?.sections?.layoutSettings?.layout || [])};
  const LAYOUT_ROWS_TGT = ${safeJsonForScript(targetBundle?.sections?.layoutSettings?.layout || [])};
  const FLAT_FIELD_PROPS_SRC = collectFlatFieldMap(FIELD_PROPS_SRC);
  const FLAT_FIELD_PROPS_TGT = collectFlatFieldMap(FIELD_PROPS_TGT);
  let activeFieldCode = '';
  let detailModalOpen = false;
  const reportMemory = new Map();

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

  function issueSideLabel(side) {
    if (side === 'source') return '比較元';
    if (side === 'target') return '比較先';
    if (side === 'both') return '両方';
    return String(side || '-');
  }

  function rowMatches(row, keyword) {
    if (!keyword) return true;
    const text = [
      row.section || '',
      row.sectionKey || '',
      row.path || '',
      row.reasonSummary || '',
      row.renameCandidate ? (row.renameCandidate.fromCode || '') + ' ' + (row.renameCandidate.toCode || '') : '',
      row.impactSummary || '',
      ...((row.impactRefs || []).map((ref) => (ref.section || '') + ' ' + (ref.kind || '') + ' ' + (ref.path || ''))),
      safeText(row.left),
      safeText(row.right)
    ].join('\\n').toLowerCase();
    return text.includes(keyword);
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

  function renderChangedCells(row, useCharDiff) {
    const leftText = safeText(row.left);
    const rightText = safeText(row.right);
    const leftLines = leftText.split('\\n');
    const rightLines = rightText.split('\\n');
    const ops = buildLineDiffOps(leftLines, rightLines);
    if (!ops) {
      return {
        left: '<pre class="blk del">' + escHtml(leftText) + '</pre>',
        right: '<pre class="blk add">' + escHtml(rightText) + '</pre>'
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
        leftHtml += '<div class="line"><span class="ln">' + leftNo + '</span>' + escHtml(op.left || '') + '</div>';
        rightHtml += '<div class="line"><span class="ln">' + rightNo + '</span>' + escHtml(op.right || '') + '</div>';
      } else if (op.type === 'replace') {
        leftNo += 1;
        rightNo += 1;
        const cd = useCharDiff ? buildCharDiff(op.left, op.right) : null;
        leftHtml += '<div class="line del"><span class="ln">' + leftNo + '</span>' + (cd ? cd.left : escHtml(op.left || '')) + '</div>';
        rightHtml += '<div class="line add"><span class="ln">' + rightNo + '</span>' + (cd ? cd.right : escHtml(op.right || '')) + '</div>';
      } else if (op.type === 'del') {
        leftNo += 1;
        leftHtml += '<div class="line del"><span class="ln">' + leftNo + '</span>' + escHtml(op.left || '') + '</div>';
        rightHtml += '<div class="line pad"><span class="ln"></span></div>';
      } else {
        rightNo += 1;
        leftHtml += '<div class="line pad"><span class="ln"></span></div>';
        rightHtml += '<div class="line add"><span class="ln">' + rightNo + '</span>' + escHtml(op.right || '') + '</div>';
      }
    }
    return {
      left: '<div class="scroll">' + leftHtml + '</div>',
      right: '<div class="scroll">' + rightHtml + '</div>'
    };
  }

  function renderRowCells(row, useCharDiff) {
    if (row.type === 'same') {
      return {
        left: '<pre class="blk same">' + escHtml(safeText(row.left)) + '</pre>',
        right: '<pre class="blk same-note">（同一）</pre>'
      };
    }
    if (row.type === 'added') {
      return {
        left: '<pre class="blk empty">（なし）</pre>',
        right: '<pre class="blk add">' + escHtml(safeText(row.right)) + '</pre>'
      };
    }
    if (row.type === 'removed') {
      return {
        left: '<pre class="blk del">' + escHtml(safeText(row.left)) + '</pre>',
        right: '<pre class="blk empty">（なし）</pre>'
      };
    }
    return renderChangedCells(row, useCharDiff);
  }

  function renderRowMeta(row) {
    const tags = [];
    if (row.reasonSummary) tags.push('<span class="meta-tag reason">' + escHtml(row.reasonSummary) + '</span>');
    if (row.renameCandidate) {
      const renameTip = '名称変更候補: ' + String(row.renameCandidate.fromCode || '-') + ' → ' + String(row.renameCandidate.toCode || '-')
        + (row.renameCandidate.matchedBy ? ' / 判定: ' + String(row.renameCandidate.matchedBy) : '');
      tags.push('<span class="meta-tag rename" title="' + escHtml(renameTip) + '">名称変更候補</span>');
    }
    if (row.impactCount) {
      const impactText = (row.impactRefs || [])
        .map((ref) => (ref.section || ref.sectionKey || '-') + ':' + (ref.kind || '-'))
        .join(' / ');
      tags.push('<span class="meta-tag impact" title="' + escHtml(String(row.impactCount)) + '件">影響</span>');
    }
    if (!tags.length) return '';
    return '<div class="meta-wrap">' +
      (tags.length ? '<div class="meta-tags">' + tags.join('') + '</div>' : '') +
      '</div>';
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
      const reasonSummary = 'フィールド単位に集約（設定差分 ' + bucket.length + '件）';
      collapsed.push({
        ...rootRow,
        path: rootPath,
        left: rootRow.left,
        right: rootRow.right,
        reasonSummary,
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
      else out.changed += 1;
      if (row.moved) out.moved += 1;
    });
    return out;
  }

  function groupSummaryLabel(rows) {
    const s = summarizeGroupRows(rows);
    const parts = ['差分 ' + s.diffCount];
    if (s.added) parts.push('追加 ' + s.added);
    if (s.removed) parts.push('削除 ' + s.removed);
    if (s.changed) parts.push('変更 ' + s.changed);
    if (s.moved) parts.push('移動 ' + s.moved);
    if (s.same) parts.push('同一 ' + s.same);
    return parts.join(' / ');
  }

  function renderPathCell(row) {
    const fullPath = String(row?.path || '-');
    const relPath = relativePathLabel(row);
    let pathMain = relPath || fullPath;
    if (row?.sectionKey === FIELD_SECTION_KEY) {
      const info = extractFieldPathInfo(fullPath);
      if (info) {
        const code = info.activeCode || '';
        const field = getFieldRowPayload(row) || getFieldDefinition(code, 'source') || getFieldDefinition(code, 'target') || ({});
        const fieldLabel = String(field.label || field.name || code || 'フィールド');
        const propTitle = fieldChangePropTitle(info, row);
        pathMain = fieldLabel + (code ? ' (' + code + ')' : '') + (propTitle ? ' / ' + propTitle : '');
      }
    } else if (row?.entityLabel || row?.entityKind) {
      const sectionLabel = SECTION_LABEL_MAP[row?.sectionKey || ''] || row?.section || '';
      const kindLabel = ENTITY_KIND_LABEL_MAP[row?.entityKind || ''] || '';
      const parts = [];
      if (sectionLabel) parts.push(sectionLabel);
      if (row?.entityLabel) parts.push((kindLabel ? kindLabel + '「' + row.entityLabel + '」' : row.entityLabel));
      if (row?.entityPropLabel) parts.push(row.entityPropLabel);
      pathMain = parts.join(' / ') || pathMain;
    }
    let html = '<div class="path-main">' + escHtml(pathMain) + '</div>';
    if (relPath && relPath !== fullPath && row?.sectionKey !== FIELD_SECTION_KEY) {
      html += '<div class="path-sub">' + escHtml(fullPath) + '</div>';
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

  function isSubtableFieldsMap(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const entries = Object.values(value);
    if (!entries.length) return false;
    return entries.every((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      return ('code' in item) || ('type' in item) || ('label' in item);
    });
  }

  function renderSubtableFieldsTableHtml(fields) {
    if (!fields || typeof fields !== 'object') {
      return '<div class="sl-empty">（なし）</div>';
    }
    const entries = Object.values(fields);
    if (!entries.length) return '<div class="sl-empty">（項目なし）</div>';
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
      return '<tr>' +
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

  function formatFieldValueBrief(val, _maxLen) {
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
      // SUBTABLE 全体: テーブル情報 + 内部フィールドを表形式でレンダリング
      if (val.type === 'SUBTABLE' && val.fields && typeof val.fields === 'object') {
        return renderSubtableFieldCardHtml(val);
      }
      // テーブルの fields マップ: 直接表形式でレンダリング
      if (isSubtableFieldsMap(val)) {
        return renderSubtableFieldsTableHtml(val);
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
            cell = renderSubtableFieldsTableHtml(v);
          } else {
            let j;
            try { j = JSON.stringify(v); } catch (e) { j = String(v); }
            cell = escHtml(localizeJsonEnums(j));
          }
          return '<tr><th>' + escHtml(k) + '</th><td>' + cell + '</td></tr>';
        }).join('');
        return '<table class="sl-mini-table">' + rows + '</table>';
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
      return renderSubtableFieldsTableHtml(value);
    }
    if (options.boolLabel) return value ? 'ON' : 'OFF';
    if (Array.isArray(value) || (value && typeof value === 'object')) return formatFieldValueBrief(value, options.maxLen || 240);
    if (value === undefined || value === null || value === '') return '（なし）';
    return escHtml(String(value));
  }

  function renderFieldToggleRow(label, checked) {
    return '<div class="kf-toggle' + (checked ? ' is-on' : '') + '">' +
      '<span class="kf-toggle-box" aria-hidden="true"></span>' +
      '<span class="kf-toggle-label">' + escHtml(label) + '</span>' +
    '</div>';
  }

  function renderFieldFormRow(label, value, options = {}) {
    const valueCls = 'kf-value'
      + (options.textarea ? ' kf-value--textarea' : '')
      + ((options.html || options.subtableFields) ? ' kf-value--rich' : '');
    return '<section class="kf-row' + (options.full ? ' kf-row--full' : '') + '">' +
      '<div class="kf-label">' + escHtml(label) + (options.required ? ' <span class="kf-required">*</span>' : '') + '</div>' +
      '<div class="' + valueCls + '">' + formatFieldSettingValue(value, options) + '</div>' +
    '</section>';
  }

  function renderFieldBlock(title, innerHtml) {
    return '<div class="kf-extra">' +
      '<div class="kf-extra-title">' + escHtml(title) + '</div>' +
      innerHtml +
    '</div>';
  }

  function renderFieldUnitBlock(field) {
    return renderFieldBlock(
      '単位記号',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('記号', field.unit || '') +
        renderFieldFormRow('位置', fieldUnitPositionDisplayLabel(field.unitPosition)) +
      '</div>'
    );
  }

  function renderFieldLimitsBlock(field) {
    return renderFieldBlock(
      '値の制限（整数で指定）',
      '<div class="kf-extra-grid">' +
        renderFieldFormRow('最小', field.minValue) +
        renderFieldFormRow('最大', field.maxValue) +
      '</div>'
    );
  }

  function buildFieldExtraRows(field) {
    const rows = [];
    const push = (label, value, options = {}) => {
      if (!hasMeaningfulFieldValue(value)) return;
      rows.push({ label, value, options });
    };
    push('タイプ', fieldTypeDisplayLabel(field.type));
    push('説明', field.description, { textarea: true, maxLen: 600 });
    push('最小文字数', field.minLength);
    push('最大文字数', field.maxLength);
    push('最小値', field.minValue);
    push('最大値', field.maxValue);
    push('プロトコル', field.protocol);
    if (field.digit !== undefined) push('桁区切りを表示する', field.digit, { boolLabel: true });
    push('小数点以下の表示桁数', field.displayScale);
    push('単位記号', field.unit);
    if (field.unitPosition) push('単位記号の位置', fieldUnitPositionDisplayLabel(field.unitPosition));
    if (field.align) push('並び', fieldAlignDisplayLabel(field.align));
    if (field.format) push('表示形式', calcFormatDisplayLabel(field.format));
    if (field.hideExpression !== undefined) push('計算式を表示しない', field.hideExpression, { boolLabel: true });
    if (field.options) push('項目と順番', formatFieldOptionLines(field.options), { textarea: true, maxLen: 600 });
    if (field.entities) push('選択候補', Array.isArray(field.entities) ? field.entities.join(' / ') : field.entities, { textarea: true, maxLen: 600 });
    if (field.expression) push('計算式', field.expression, { textarea: true, maxLen: 600 });
    if (field.lookup) push('ルックアップ設定', field.lookup, { textarea: true, maxLen: 600 });
    if (field.referenceTable) push('関連レコード一覧設定', field.referenceTable, { textarea: true, maxLen: 600 });
    if (field.fields) push('テーブル内の項目', field.fields, { subtableFields: true, full: true });
    if (field.__parentTableCode) push('テーブル', field.__parentTableLabel || field.__parentTableCode);
    return rows;
  }

  function renderGenericFieldSnapshotBody(field) {
    const extras = buildFieldExtraRows(field);
    const toggleRows = [
      renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel),
      renderFieldToggleRow('必須項目にする', !!field.required)
    ];
    if (field.unique !== undefined) toggleRows.push(renderFieldToggleRow('重複禁止にする', !!field.unique));
    if (field.defaultNowValue !== undefined) toggleRows.push(renderFieldToggleRow('現在日時を初期値にする', !!field.defaultNowValue));
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' + toggleRows.join('') + '</div>' +
      renderFieldFormRow('初期値', field.defaultNowValue ? '現在日時を使用' : field.defaultValue, { textarea: true, full: true, maxLen: 600 }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true }) +
      (extras.length ? '<div class="kf-extra"><div class="kf-extra-title">その他の設定</div><div class="kf-extra-grid">' + extras.map((item) => renderFieldFormRow(item.label, item.value, item.options)).join('') + '</div></div>' : '');
  }

  function renderRadioFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
      '</div>' +
      renderFieldFormRow('項目と順番', formatFieldOptionLines(field.options), { textarea: true, full: true, maxLen: 1200 }) +
      renderFieldFormRow('並び', fieldAlignDisplayLabel(field.align), { full: true }) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderNumberFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
        renderFieldToggleRow('桁区切りを表示する', !!field.digit) +
        renderFieldToggleRow('必須項目にする', !!field.required) +
        renderFieldToggleRow('値の重複を禁止する', !!field.unique) +
      '</div>' +
      renderFieldLimitsBlock(field) +
      renderFieldFormRow('初期値', field.defaultValue, { full: true }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true }) +
      renderFieldUnitBlock(field) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderCalcFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
      '</div>' +
      renderFieldFormRow('計算式', field.expression, { required: true, textarea: true, full: true, maxLen: 1200 }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('計算式を表示しない', !!field.hideExpression) +
      '</div>' +
      renderFieldFormRow('表示形式', calcFormatDisplayLabel(field.format), { full: true }) +
      renderFieldFormRow('小数点以下の表示桁数', field.displayScale, { full: true }) +
      renderFieldUnitBlock(field) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderSubtableFieldSnapshotBody(field) {
    return renderFieldFormRow('フィールド名', field.label || field.name || '（未設定）', { required: true }) +
      '<div class="kf-toggle-list">' +
        renderFieldToggleRow('フィールド名を表示しない', !!field.noLabel) +
      '</div>' +
      renderFieldFormRow('テーブル内の項目', field.fields, { subtableFields: true, full: true }) +
      renderFieldFormRow('フィールドコード', field.code || '-', { required: true, full: true });
  }

  function renderFieldSnapshotCard(sideLabel, field, tone) {
    if (!field) {
      return '<section class="fd-snapshot fd-snapshot--' + tone + '"><div class="fd-pane-label">' + escHtml(sideLabel) + '</div><div class="fd-empty">この側にはフィールドがありません。</div></section>';
    }
    const typeLabel = fieldTypeDisplayLabel(field.type);
    const bodyHtml =
      field.type === 'RADIO_BUTTON' ? renderRadioFieldSnapshotBody(field)
      : field.type === 'NUMBER' ? renderNumberFieldSnapshotBody(field)
      : field.type === 'CALC' ? renderCalcFieldSnapshotBody(field)
      : field.type === 'SUBTABLE' ? renderSubtableFieldSnapshotBody(field)
      : renderGenericFieldSnapshotBody(field);
    return '<section class="fd-snapshot fd-snapshot--' + tone + '">' +
      '<div class="kf-modal">' +
        '<div class="kf-modal-head">' +
          '<div class="kf-modal-title"><span class="kf-type-icon" aria-hidden="true"></span><strong>' + escHtml(typeLabel) + ' の設定</strong></div>' +
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

    REPORT_ROWS.forEach((row) => {
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
    if (group.impactCount) chips.push('<span class="fc-chip">影響 ' + group.impactCount + '</span>');
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
          '<div class="fd-sub">code: <code>' + escHtml(group.code) + '</code> / type: ' + escHtml(group.type || '-') + (group.parentTableCode ? ' / テーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
        '</div>' +
        '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
      '</div>' +
      '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
      '<div class="fd-snapshots">' +
        renderFieldSnapshotCard('比較元', group.sourceField, 'src') +
        renderFieldSnapshotCard('比較先', group.targetField, 'tgt') +
      '</div>' +
      (entries.length ? (
        '<div class="fd-section">' +
          '<h3>設定差分</h3>' +
          '<div class="fd-entry-list">' +
            entries.map((entry) => {
              const row = entry.row;
              const rowTone = row.type === 'added' ? 'added' : row.type === 'removed' ? 'removed' : row.type === 'same' ? 'same' : 'changed';
              return '<article class="fd-entry fd-entry--' + rowTone + '">' +
                '<div class="fd-entry-top">' +
                  '<span class="fd-entry-area">' + escHtml(entry.area) + '</span>' +
                  '<span class="fd-entry-type">' + escHtml(diffTypeLabel(row.type, row.moved)) + '</span>' +
                  '<strong>' + escHtml(entry.title || relativePathLabel(row)) + '</strong>' +
                '</div>' +
                '<div class="fd-path">' + escHtml(row.path || '-') + '</div>' +
                renderRowMeta(row) +
                '<div class="fd-entry-grid">' +
                  '<div class="fd-entry-col"><div class="fd-pane-label">比較元</div><div class="fd-entry-body">' + formatFieldValueBrief(row.left, 280) + '</div></div>' +
                  '<div class="fd-entry-col"><div class="fd-pane-label">比較先</div><div class="fd-entry-body">' + formatFieldValueBrief(row.right, 280) + '</div></div>' +
                '</div>' +
              '</article>';
            }).join('') +
          '</div>' +
        '</div>'
      ) : '<div class="fd-empty">このフィールドに表示対象の差分はありません。</div>') +
    '</section>';
  }

  function closeFieldDetailModal() {
    detailModalOpen = false;
    const modal = document.getElementById('fieldDetailModal');
    const body = document.getElementById('fieldDetailModalBody');
    if (modal) modal.hidden = true;
    if (body) body.innerHTML = '';
    document.body.classList.remove('has-modal-open');
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
    sub.textContent = 'code: ' + (group.code || '-') + ' / type: ' + (group.type || '-') + (group.parentTableCode ? ' / テーブル: ' + (group.parentTableLabel || group.parentTableCode) : '');
    body.innerHTML = renderFieldDetailPanel(activeFieldCode, model, options);
    modal.hidden = false;
    document.body.classList.add('has-modal-open');
  }

  function openFieldDetail(code, rerender) {
    const safeCode = String(code || '').trim();
    if (!safeCode) return;
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
        openFieldDetail(code, rerender);
      });
    });
  }

  function renderSettingsLikeView() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
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
      root.innerHTML = '<div class="no-diff">表示対象のフィールドがありません。検索条件か「同一項目を隠す」を見直してください。</div>';
      return;
    }
    ensureActiveFieldCode(groups, { preserveMissing: detailModalOpen });
    const modelForView = { groupMap: new Map(groups.map((group) => [group.code, group])) };
    root.innerHTML = '<div class="sl-board">' +
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
          groups.map((group, idx) => {
            const tone = fieldStatusTone(group.status);
            const isActive = group.code === activeFieldCode;
            return '<article class="fc-card fc-card--' + tone + (isActive ? ' is-active' : '') + '" id="field_card_' + idx + '">' +
              '<div class="fc-card-head">' +
                '<span class="fd-status fd-status--' + tone + '">' + escHtml(fieldStatusLabel(group.status)) + '</span>' +
                '<span class="fc-code">' + escHtml(group.code) + '</span>' +
              '</div>' +
              '<div class="fc-title">' + escHtml(group.label) + '</div>' +
              '<div class="fc-sub">' + escHtml(group.type || '-') + (group.parentTableCode ? ' / サブテーブル: ' + escHtml(group.parentTableLabel || group.parentTableCode) : '') + '</div>' +
              '<div class="fc-chip-row">' + renderFieldSummaryChips(group) + '</div>' +
              '<button type="button" class="btn' + (isActive ? ' primary' : '') + '" data-field-select="' + escHtml(group.code) + '">' + escHtml(group.diffCount ? '設定差分を開く' : '設定を開く') + '</button>' +
            '</article>';
          }).join('') +
        '</div>' +
      '</div>' +
    '</div>';
    if (nav) {
      groups.forEach((group, idx) => {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item' + (group.code === activeFieldCode ? ' active' : '');
        navItem.innerHTML = '<span>' + escHtml(group.code) + '</span><span class="badge">' + String(group.diffCount || 0) + '</span>';
        navItem.onclick = () => {
          activeFieldCode = group.code;
          renderSettingsLikeView();
          const el = document.getElementById('field_card_' + idx);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        nav.appendChild(navItem);
      });
    }
    bindFieldSelectionButtons(root, renderSettingsLikeView);
    syncFieldDetailModal(modelForView, { hideSame });
  }

  function getActiveReportTab() {
    const btn = document.querySelector('.settings-tab:not(.passive)[data-report-tab]');
    return btn ? btn.getAttribute('data-report-tab') : 'summary';
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
          pair.className = 'sl-kuc-pair';
          const leftTa = new Kuc.TextArea({
            label: '比較元',
            value: formatFieldValuePlain(row.left),
            disabled: true,
            requiredIcon: false
          });
          const rightTa = new Kuc.TextArea({
            label: '比較先',
            value: formatFieldValuePlain(row.right),
            disabled: true,
            requiredIcon: false
          });
          pair.appendChild(leftTa);
          pair.appendChild(rightTa);
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
          const navItem = document.createElement('div');
          navItem.className = 'nav-item';
          navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
          navItem.onclick = () => {
            const el = document.getElementById('slg_' + idx);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        html += '<div class="sl-pair">';
        html += '<div class="sl-pair-col"><div class="sl-pane-h">比較元</div><div class="sl-pane sl-pane--src sl-pane--kv">' + formatFieldValueBrief(row.left) + '</div></div>';
        html += '<div class="sl-pair-col"><div class="sl-pane-h">比較先</div><div class="sl-pane sl-pane--tgt sl-pane--kv">' + formatFieldValueBrief(row.right) + '</div></div>';
        html += '</div></article>';
      });
      html += '</div></section>';
      if (nav) {
        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.innerHTML = '<span>' + escHtml(navLabel) + '</span><span class="badge">' + g.rows.length + '</span>';
        navItem.onclick = () => {
          const el = document.getElementById('slg_' + idx);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      else {
        changed += 1;
        if (row.moved) moved += 1;
      }
    }
    document.getElementById('stat-total').textContent = String(rows.length);
    document.getElementById('stat-added').textContent = String(added);
    document.getElementById('stat-removed').textContent = String(removed);
    document.getElementById('stat-changed').textContent = String(changed);
    document.getElementById('stat-moved').textContent = String(moved);
    document.getElementById('stat-same').textContent = String(same);
  }

  function setActiveTab(tabName) {
    const KNOWN_TABS = ['summary', 'diff', 'settingsLike', 'compare'];
    const nextTab = KNOWN_TABS.indexOf(tabName) >= 0 ? tabName : 'summary';
    document.querySelectorAll('[data-report-tab]').forEach((btn) => {
      const active = btn.getAttribute('data-report-tab') === nextTab;
      btn.classList.toggle('passive', !active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-report-pane]').forEach((pane) => {
      pane.hidden = pane.getAttribute('data-report-pane') !== nextTab;
    });
    const navWrap = document.getElementById('navWrap');
    if (navWrap) navWrap.hidden = (nextTab !== 'diff' && nextTab !== 'settingsLike');
    if (nextTab !== 'settingsLike') closeFieldDetailModal();
    safeStorageSet(ACTIVE_TAB_KEY, nextTab);
    if (nextTab === 'settingsLike') renderSettingsLikeView();
    else if (nextTab === 'diff') render();
    else {
      const hideSame = !!(document.getElementById('hideSame')).checked;
      const kw = String((document.getElementById('search')).value || '').trim().toLowerCase();
      const allFiltered = REPORT_ROWS.filter((row) => {
        if (hideSame && row.type === 'same') return false;
        return rowMatches(row, kw);
      });
      updateStats(allFiltered);
    }
  }

  function onReportFilterChange() {
    render();
    if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  }

  function render() {
    const hideSame = !!(document.getElementById('hideSame')).checked;
    const useCharDiff = !!(document.getElementById('charDiff')).checked;
    const keyword = String((document.getElementById('search')).value || '').trim().toLowerCase();
    const filtered = REPORT_ROWS.filter((row) => {
      if (hideSame && row.type === 'same') return false;
      return rowMatches(row, keyword);
    });
    updateStats(filtered);
    if (getActiveReportTab() !== 'diff') return;

    const nav = document.getElementById('nav');
    const main = document.getElementById('main');
    nav.innerHTML = '';
    main.innerHTML = '';

    if (!filtered.length) {
      main.innerHTML = '<div class="no-diff">表示対象の差分がありません。</div>';
      return;
    }

    const groups = groupBySection(filtered);
    groups.forEach((g, idx) => {
      const secId = 'sec_' + idx;
      const collapsedNow = collapsed.has(g.key);
      const groupSummary = summarizeGroupRows(g.rows);
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="badge">' + groupSummary.diffCount + '</span>';
      navItem.onclick = () => {
        collapsed.delete(g.key);
        render();
        setTimeout(() => {
          const el = document.getElementById(secId);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 20);
      };
      nav.appendChild(navItem);

      const sec = document.createElement('section');
      sec.id = secId;
      sec.className = 'sec';
      const head = document.createElement('div');
      head.className = 'sec-head';
      head.innerHTML = '<span>' + (collapsedNow ? '▶' : '▼') + ' ' + escHtml(g.label) + '</span><span class="sec-meta">' + escHtml(groupSummaryLabel(g.rows)) + '</span>';
      head.onclick = () => {
        if (collapsed.has(g.key)) collapsed.delete(g.key);
        else collapsed.add(g.key);
        render();
      };
      sec.appendChild(head);

      if (!collapsedNow) {
        const displayRows = g.key === FIELD_SECTION_KEY ? collapseFieldRowsForDiffTable(g.rows) : g.rows;
        const list = document.createElement('div');
        list.className = 'diff-card-list';
        displayRows.forEach((row) => {
          const typeLabel = diffTypeLabel(row.type, row.moved);
          const cells = renderRowCells(row, useCharDiff);
          const typeClass = row.type === 'same' ? 'same' : (row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed'));
          const card = document.createElement('article');
          const sevToken = String(row.severity || 'low').toLowerCase();
          const sevCls = sevToken === 'high' ? ' sev-high' : sevToken === 'medium' ? ' sev-medium' : ' sev-low';
          const reviewedCls = '';
          card.className = 'diff-card diff-card--' + typeClass + sevCls + reviewedCls;
          card.innerHTML =
            '<div class="diff-card-head">' +
              '<span class="type-chip type-chip--' + typeClass + '">' + escHtml(typeLabel) + '</span>' +
              '<div class="diff-card-path path" title="' + escHtml(row.path || '-') + '">' + renderPathCell(row) + '</div>' +
            '</div>' +
            '<div class="diff-pane-grid">' +
              '<section class="diff-pane"><div class="diff-pane-title">比較元</div><div class="cell">' + cells.left + '</div></section>' +
              '<section class="diff-pane"><div class="diff-pane-title">比較先</div><div class="cell">' + cells.right + '</div></section>' +
            '</div>';
          list.appendChild(card);
        });
        sec.appendChild(list);
      }
      main.appendChild(sec);
    });
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

  function exportPatch() {
    const patchRows = REPORT_ROWS.filter((row) => row.type !== 'same');
    if (!patchRows.length) {
      window.alert('出力できる差分がありません');
      return;
    }
    const grouped = {};
    patchRows.forEach((row) => {
      const key = row.sectionKey || row.section || '未分類';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        type: row.type,
        path: row.path,
        sourceValue: row.left,
        targetValue: row.right,
        moved: !!row.moved,
        movedFrom: row.movedFrom,
        movedTo: row.movedTo,
        arrayKey: row.arrayKey,
        arrayKeyValue: row.arrayKeyValue,
        reasonSummary: row.reasonSummary || '',
        renameCandidate: row.renameCandidate || null,
        impactCount: row.impactCount || 0,
        impactRefs: row.impactRefs || []
      });
    });
    const payload = {
      generatedAt: new Date().toISOString(),
      source: REPORT_META.source,
      target: REPORT_META.target,
      sections: grouped
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '反映パッチ_app' + REPORT_META.source.appId + '_vs_app' + REPORT_META.target.appId + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, exportPatch, setActiveTab };

  document.getElementById('hideSame').onchange = onReportFilterChange;
  document.getElementById('charDiff').onchange = onReportFilterChange;
  document.getElementById('search').oninput = onReportFilterChange;
  document.getElementById('themeBtn').onclick = toggleTheme;
  document.getElementById('collapseBtn').onclick = collapseAll;
  document.getElementById('expandBtn').onclick = expandAll;
  document.getElementById('patchBtn').onclick = exportPatch;
  document.querySelectorAll('[data-report-tab]').forEach((btn) => {
    btn.onclick = () => setActiveTab(btn.getAttribute('data-report-tab'));
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      document.getElementById('search').focus();
    }
    if (e.key === 'Escape') {
      if (detailModalOpen) {
        e.preventDefault();
        closeFieldDetailModal();
        return;
      }
      (document.getElementById('search')).value = '';
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
  setActiveTab(safeStorageGet(ACTIVE_TAB_KEY) || 'summary');
  render();
  if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
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
      --focus:0 0 0 3px rgba(37,99,235,.35);
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
      backdrop-filter:saturate(1.1) blur(8px);
    }
    main{flex:1;overflow:auto;padding:28px 32px 40px;min-width:0}
    .sb-head{padding:20px 18px 16px;border-bottom:1px solid var(--border);background:linear-gradient(165deg,var(--card) 0%,var(--card-soft) 100%)}
    .sb-kicker{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .sb-title{margin-top:12px;font-size:21px;font-weight:800;color:var(--fg);letter-spacing:-.02em}
    .sb-meta{font-size:11px;color:var(--muted);margin-top:10px;line-height:1.75}
    .sb-panel{margin:12px 14px;border:1px solid var(--border);border-radius:16px;background:var(--card);box-shadow:var(--shadow)}
    .sb-stats{padding:14px 16px;font-size:12px;line-height:1.9}
    .sb-stat-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px}
    .sb-stat{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px dashed var(--border)}
    .sb-stat:nth-last-child(-n+2){border-bottom:none}
    .sb-stat b{font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
    .sb-ctrl{padding:16px}
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
    .btn.primary{background:linear-gradient(180deg,#3b82f6,var(--accent));color:#fff;border-color:#1d4ed8;box-shadow:0 2px 8px rgba(37,99,235,.35)}
    .btn.primary:hover{filter:brightness(1.06)}
    body.dark .btn.primary{background:linear-gradient(180deg,#60a5fa,var(--accent));border-color:#2563eb}
    #navWrap{flex:1;min-height:0;display:flex;flex-direction:column;border-top:1px solid var(--border);margin-top:4px;padding-top:8px}
    .nav-label{padding:4px 18px 8px;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    #nav{flex:1;overflow:auto;padding:0 10px 20px;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    #nav::-webkit-scrollbar{width:6px}
    #nav::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .nav-item{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;font-size:12px;cursor:pointer;border-radius:12px;margin:3px 4px;color:var(--fg);border:1px solid transparent;transition:background .15s,border-color .15s,transform .1s}
    .nav-item:hover{background:var(--card);border-color:var(--border);box-shadow:var(--shadow)}
    .nav-item:active{transform:scale(.99)}
    .badge{display:inline-block;min-width:26px;text-align:center;padding:3px 9px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:10px;font-weight:800;font-variant-numeric:tabular-nums}
    .topbar{
      display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:22px 24px;border:1px solid var(--header-border);
      border-radius:20px;background:linear-gradient(135deg,var(--header) 0%,var(--card-soft) 100%);box-shadow:var(--shadow);position:relative;overflow:hidden
    }
    .topbar::before{content:"";position:absolute;left:0;top:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),#06b6d4,var(--accent-strong))}
    .topbar-main{display:flex;flex-direction:column;gap:12px;min-width:0}
    .topbar-title{font-size:clamp(1.15rem,2.5vw,1.5rem);font-weight:800;line-height:1.35;letter-spacing:-.02em;color:var(--fg)}
    .topbar-desc{font-size:13px;color:var(--muted);line-height:1.75;max-width:62ch}
    .header-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .header-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--card-soft);border-radius:999px;padding:7px 12px;font-size:11px;font-weight:600;color:var(--muted)}
    .settings-shell{margin-top:20px;border:1px solid var(--border);border-radius:20px;overflow:hidden;background:var(--card);box-shadow:var(--shadow)}
    .settings-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:14px 18px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%)}
    .settings-tab{
      padding:10px 18px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:12px;font-weight:800;
      border:1px solid transparent;cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .1s
    }
    .settings-tab.passive{background:transparent;color:var(--muted);border-color:var(--border);font-weight:700}
    .settings-tab.passive:hover{border-color:var(--accent-soft);color:var(--fg)}
    .settings-tab:focus-visible{outline:none;box-shadow:var(--focus)}
    .settings-tab:active:not(.passive){transform:scale(.98)}
    .tab-pane[hidden]{display:none!important}
    .app-compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;padding:18px;border-bottom:1px solid var(--border);background:var(--card-soft)}
    .app-card{border:1px solid var(--border);border-radius:16px;background:var(--card);padding:16px;position:relative;overflow:hidden;transition:box-shadow .2s}
    .app-card:hover{box-shadow:0 8px 24px -6px rgba(15,23,42,.1)}
    body.dark .app-card:hover{box-shadow:0 8px 28px -6px rgba(0,0,0,.4)}
    .app-card::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(180deg,var(--accent),#06b6d4);border-radius:4px 0 0 4px}
    .app-card.target::before{background:linear-gradient(180deg,#64748b,#475569)}
    .app-role{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;background:var(--accent-soft);color:var(--accent-strong);font-size:11px;font-weight:800}
    .app-card.target .app-role{background:#e2e8f0;color:#475569}
    body.dark .app-card.target .app-role{background:#1e293b;color:#cbd5e1}
    .app-title{margin-top:12px;font-size:20px;font-weight:800;letter-spacing:-.02em}
    .app-meta-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .meta-card{padding:11px 13px;border-radius:12px;background:var(--card-soft);border:1px solid var(--border);transition:border-color .15s}
    .meta-card:hover{border-color:var(--accent-soft)}
    .meta-card .label{display:block;font-size:10px;font-weight:700;color:var(--muted);margin-bottom:5px;letter-spacing:.02em}
    .meta-card .value{display:block;font-size:12px;font-weight:800;color:var(--fg);word-break:break-word}
    .summary-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:12px;padding:18px;border-bottom:1px solid var(--border);background:var(--card)}
    .metric-card{position:relative;overflow:hidden;border:1px solid var(--border);border-radius:14px;background:linear-gradient(180deg,var(--card-soft),var(--card));padding:14px 16px;min-height:104px;box-shadow:0 8px 22px -16px rgba(15,23,42,.5)}
    .metric-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--muted)}
    .metric-card--total::before{background:var(--pill-total)}
    .metric-card--diff::before,.metric-card--changed::before{background:var(--pill-chg)}
    .metric-card--added::before{background:var(--pill-add)}
    .metric-card--removed::before{background:var(--pill-del)}
    .metric-card--severity::before{background:#dc2626}
    .metric-label{font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
    .metric-value{margin-top:8px;font-size:28px;line-height:1;font-weight:800;color:var(--fg);font-variant-numeric:tabular-nums}
    .metric-sub{margin-top:10px;font-size:11px;line-height:1.45;color:var(--muted)}
    .pill{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:999px;padding:8px 14px;font-size:11px;background:var(--card-soft);font-weight:700;transition:border-color .15s,transform .1s}
    .pill:hover{border-color:var(--muted)}
    .pill .count{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums}
    .pill--total .count{color:var(--pill-total)}
    .pill--added .count{color:var(--pill-add)}
    .pill--removed .count{color:var(--pill-del)}
    .pill--changed .count{color:var(--pill-chg)}
    .pill--moved .count{color:var(--pill-move)}
    .pill--same .count{color:var(--pill-same)}
    .pill--err .count{color:var(--pill-err)}
    .info-grid{display:grid;grid-template-columns:1.35fr .95fr;gap:18px;padding:18px;border-bottom:1px solid var(--border);background:var(--card)}
    .panel{border:1px solid var(--border);border-radius:16px;background:var(--card-soft);padding:16px 18px;position:relative}
    .panel::before{content:"";position:absolute;left:18px;top:0;width:36px;height:3px;background:linear-gradient(90deg,var(--accent),transparent);border-radius:0 0 3px 3px}
    .panel h3{margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:.04em;color:var(--fg);text-transform:uppercase}
    .detail-list{display:grid;gap:10px}
    .detail-row{display:flex;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:1px dashed var(--border);font-size:12px;line-height:1.5}
    .detail-row:last-child{padding-bottom:0;border-bottom:none}
    .detail-key{color:var(--muted);font-weight:600;flex-shrink:0}
    .warn{font-size:11px;color:#b45309;margin-top:10px;padding:10px 12px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;line-height:1.6}
    body.dark .warn{color:#fbbf24;background:#422006;border-color:#92400e}
    .muted-note{font-size:12px;color:var(--muted);line-height:1.7}
    .sum-table-wrap{overflow:auto}
    .sum-table{width:100%;border-collapse:collapse;font-size:11px}
    .sum-table th,.sum-table td{padding:10px 12px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
    .sum-table th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);white-space:nowrap}
    .sum-table-name{font-weight:800;color:var(--fg);margin-bottom:4px}
    .sum-table-sub{font-size:10px;line-height:1.5;color:var(--muted)}
    .highlight-list{display:grid;gap:10px}
    .highlight-card{border:1px solid var(--border);border-radius:14px;padding:12px 14px;background:var(--card);box-shadow:var(--shadow)}
    .highlight-top{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
    .highlight-title{font-size:12px;font-weight:800;color:var(--fg);line-height:1.45}
    .highlight-sub{font-size:10px;line-height:1.6;color:var(--muted);margin-top:4px}
    .highlight-preview{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .highlight-pane{border:1px solid var(--border);border-radius:10px;padding:8px 10px;background:var(--card-soft);font-size:10px;line-height:1.5;color:var(--fg);word-break:break-word}
    .highlight-pane-label{display:block;font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
    @media (max-width:900px){.highlight-preview{grid-template-columns:1fr}}
    .issue-box{margin:18px;border:1px solid #fdba74;border-radius:16px;background:#fff7ed;padding:16px 18px;box-shadow:0 4px 16px -4px rgba(180,83,9,.15)}
    body.dark .issue-box{background:#1c1410;border-color:#78350f}
    .issue-box h3{margin:0 0 12px;font-size:13px;font-weight:800;color:#9a3412}
    body.dark .issue-box h3{color:#fb923c}
    .issue-box table{width:100%;border-collapse:collapse;font-size:11px}
    .issue-box th,.issue-box td{border-bottom:1px solid var(--border);padding:10px 12px;text-align:left;vertical-align:top}
    .issue-box th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
    .issue-box .msg{white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    .content{padding:18px}
    .sec{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:var(--card);margin-bottom:16px;box-shadow:var(--shadow)}
    .sec-head{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:linear-gradient(180deg,var(--card-soft) 0%,var(--card) 100%);font-size:13px;font-weight:800;cursor:pointer;user-select:none;transition:filter .15s}
    .sec-head:hover{filter:brightness(.985)}
    body.dark .sec-head:hover{filter:brightness(1.08)}
    .sec-meta{font-size:10px;font-weight:700;color:var(--muted)}
    .diff-card-list{display:flex;flex-direction:column;gap:12px;padding:14px;background:var(--card-soft)}
    .diff-card{border:1px solid var(--border);border-left:5px solid var(--border);border-radius:14px;background:var(--card);box-shadow:0 8px 20px -16px rgba(15,23,42,.45);overflow:hidden}
    .diff-card--added{border-left-color:#16a34a}
    .diff-card--removed{border-left-color:#dc2626}
    .diff-card--changed{border-left-color:#ca8a04}
    .diff-card--same{border-left-color:#0d9488}
    .diff-card-head{display:grid;grid-template-columns:auto minmax(0,1fr);gap:12px;align-items:flex-start;padding:12px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--card),var(--card-soft))}
    .type-chip{display:inline-flex;align-items:center;justify-content:center;min-width:62px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:800;border:1px solid transparent;white-space:nowrap}
    .type-chip--added{background:#dcfce7;color:#166534;border-color:#86efac}
    .type-chip--removed{background:#fee2e2;color:#991b1b;border-color:#fca5a5}
    .type-chip--changed{background:#fef3c7;color:#92400e;border-color:#fcd34d}
    .type-chip--same{background:#ccfbf1;color:#0f766e;border-color:#5eead4}
    body.dark .type-chip--added{background:#14532d;color:#bbf7d0;border-color:#166534}
    body.dark .type-chip--removed{background:#450a0a;color:#fecaca;border-color:#991b1b}
    body.dark .type-chip--changed{background:#78350f;color:#fde68a;border-color:#b45309}
    body.dark .type-chip--same{background:#134e4a;color:#99f6e4;border-color:#0f766e}
    .diff-card-path{min-width:0}
    .diff-pane-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px 14px 14px}
    .diff-pane{min-width:0;border:1px solid var(--border);border-radius:12px;background:var(--card);overflow:hidden}
    .diff-pane-title{padding:8px 11px;border-bottom:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.05em;text-transform:uppercase}
    .diff-pane .cell{display:block}
    .diff-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
    .diff-table th,.diff-table td{border-bottom:1px solid var(--border);padding:10px 12px;vertical-align:top;text-align:left}
    .diff-table th{position:sticky;top:0;background:var(--card);z-index:1;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    .type{font-weight:800}
    .type.added{color:#15803d}
    .type.removed{color:#b91c1c}
    .type.changed{color:#b45309}
    .type.same{color:#0d9488}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--muted);font-size:11px}
    .path-main{font-size:11px;font-weight:700;color:var(--fg);margin-bottom:4px;word-break:break-all}
    .path-sub{font-size:10px;line-height:1.45;color:var(--muted);word-break:break-all}
    .meta-wrap{margin-top:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
    .meta-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    .meta-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:600;color:var(--fg)}
    .meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
    .meta-tag.rename{background:#ecfdf5;color:#15803d;border-color:#86efac}
    .meta-tag.impact{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd}
    .meta-line{font-size:10px;line-height:1.5;color:var(--muted)}
    .meta-line strong{color:var(--fg)}
    .cell{padding:0;overflow:hidden}
    .scroll{max-height:300px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
    .scroll::-webkit-scrollbar{width:6px;height:6px}
    .scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:999px}
    .line{display:flex;min-height:1.6em;line-height:1.6;padding:0 8px;white-space:pre-wrap;word-break:break-word}
    .line.add{background:var(--add);color:var(--add-fg)}
    .line.del{background:var(--del);color:var(--del-fg)}
    .line.pad{background:var(--pad);opacity:.75}
    .ln{min-width:36px;display:inline-block;text-align:right;margin-right:8px;padding-right:6px;border-right:1px solid var(--border);font-size:10px;color:var(--muted);user-select:none;flex-shrink:0}
    .blk{margin:0;padding:12px;white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.55}
    .blk.add{background:var(--add);color:var(--add-fg)}
    .blk.del{background:var(--del);color:var(--del-fg)}
    .blk.same{color:var(--muted);font-style:italic}
    .blk.same-note{color:#0d9488;font-style:italic;font-weight:600}
    .blk.empty{font-style:italic;color:var(--muted)}
    mark.cadd{background:var(--mark-add);color:var(--add-fg);border-radius:3px;padding:0 2px}
    mark.cdel{background:var(--mark-del);color:var(--del-fg);border-radius:3px;padding:0 2px}
    .compare-box{margin:0 18px 18px;border:1px solid var(--border);border-radius:18px;background:var(--card);overflow:hidden;box-shadow:var(--shadow)}
    .compare-box-head{padding:14px 18px;background:linear-gradient(180deg,var(--accent-soft) 0%,var(--card) 100%);color:var(--accent-strong);font-size:13px;font-weight:800;border-bottom:1px solid var(--border)}
    .compare-sec{border-bottom:1px solid var(--border)}
    .compare-sec:last-child{border-bottom:none}
    .compare-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;background:var(--pad);font-size:12px;font-weight:800}
    .compare-head-meta{font-size:10px;color:var(--muted);font-weight:600}
    .compare-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;padding:14px}
    .compare-card{border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
    .compare-title{padding:9px 12px;background:var(--pad);font-size:11px;font-weight:800}
    .compare-pre{margin:0;padding:12px;max-height:340px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;line-height:1.5}
    .no-diff{text-align:center;font-size:14px;font-weight:600;padding:36px 24px;color:#0d9488;background:linear-gradient(180deg,var(--card-soft),var(--card));border:1px dashed var(--border);border-radius:16px}
    body.dark .no-diff{color:#5eead4}
    body.has-modal-open{overflow:hidden}
    .sl-root{padding:16px 18px 28px;background:var(--card-soft);min-height:320px}
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
    @media (max-width:900px){.sl-kuc-pair{grid-template-columns:1fr}}
    .sl-kuc-pair kuc-textarea-1-24-0{display:block;min-width:0;width:100%}
    .sl-pane--src{background:rgba(37,99,235,.06);border:1px solid rgba(37,99,235,.22)}
    .sl-pane--tgt{background:rgba(22,163,74,.07);border:1px solid rgba(22,163,74,.28)}
    body.dark .sl-pane--src{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35)}
    body.dark .sl-pane--tgt{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)}
    @media (max-width:1080px){
      body{display:block}
      aside{position:relative;height:auto;max-height:none;width:auto;border-right:none;border-bottom:1px solid var(--border)}
      main{padding:18px 16px 28px}
      .app-compare,.info-grid,.compare-grid{grid-template-columns:1fr}
      .header-actions{justify-content:flex-start}
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
      .fd-snapshots,.fd-entry-grid,.fd-mini-grid,.kf-extra-grid,.diff-pane-grid{grid-template-columns:1fr}
      .diff-card-head{grid-template-columns:1fr}
    }
    @media print{
      aside,.header-actions,.sb-panel .btn,.settings-tabs,.search-hint{display:none!important}
      body{display:block;background:#fff}
      main{padding:0}
      .settings-shell,.sec,.compare-box,.topbar{box-shadow:none}
    }
  </style>
</head>
<body>
  <aside>
    <div class="sb-head">
      <div class="sb-kicker">Visual Diff / Settings Review</div>
      <div class="sb-title">差分レポート</div>
      <div class="sb-meta">
        生成日時: ${esc(reportMeta.generatedAt)}<br>
        対象: ${esc(sectionText || '-')}<br>
        出力対象: ${esc(reportMeta.exportLabel || '全差分')}<br>
        出力内容: ${esc(reportMeta.exportContentLabel || '行データのみ')}
      </div>
    </div>
    <div class="sb-panel sb-stats">
      <div class="sb-stat-grid">
        <div class="sb-stat"><span>総件数</span><b id="stat-total">${summary.total}</b></div>
        <div class="sb-stat"><span>追加</span><b id="stat-added">${summary.added}</b></div>
        <div class="sb-stat"><span>削除</span><b id="stat-removed">${summary.removed}</b></div>
        <div class="sb-stat"><span>変更</span><b id="stat-changed">${summary.changed}</b></div>
        <div class="sb-stat"><span>移動</span><b id="stat-moved">${summary.moved}</b></div>
        <div class="sb-stat"><span>同一</span><b id="stat-same">${summary.same}</b></div>
      </div>
      <div style="margin-top:10px;font-size:11px;color:var(--muted)">取得失敗: <b>${fetchIssues.length}</b></div>
    </div>
    <div class="sb-panel sb-ctrl">
      <label class="chk"><input type="checkbox" id="hideSame"> 同一項目を隠す</label>
      <label class="chk"><input type="checkbox" id="charDiff" checked> 文字単位ハイライト</label>
      <span class="field-label">検索</span>
      <input type="text" id="search" placeholder="パス・値・理由・フィールド名で絞り込み" aria-label="差分の検索" autocomplete="off">
      <p class="search-hint"><kbd class="kbd">Ctrl</kbd>+<kbd class="kbd">F</kbd> / <kbd class="kbd">⌘</kbd>+<kbd class="kbd">F</kbd> でフォーカス · <kbd class="kbd">Esc</kbd> でクリア</p>
      <div class="sb-btns">
        <button type="button" class="btn" id="collapseBtn">全折畳</button>
        <button type="button" class="btn" id="expandBtn">全展開</button>
        <button type="button" class="btn" id="themeBtn">ダークに切替</button>
        <button type="button" class="btn primary" id="patchBtn" style="grid-column:span 2">パッチJSON出力</button>
      </div>
    </div>
    <div id="navWrap" hidden>
      <div class="nav-label">セクションへジャンプ</div>
      <div id="nav"></div>
    </div>
  </aside>
  <main>
    <div class="topbar">
      <div class="topbar-main">
        <div class="sb-kicker">Field Diff Review</div>
        <div class="topbar-title">フィールド単位で、設定差分をまとめてレビュー</div>
        <div class="topbar-desc">フィールドごとの差分を1項目ずつ整理し、「設定差分を開く」からポップアップで詳細を確認できます。値の差分一覧と合わせて、一覧領域を広く使いながら確認できます。</div>
      </div>
      <div class="header-actions">
        <span class="header-badge">セクション ${esc(String((scopes || []).length || 0))}</span>
        <span class="header-badge">出力 ${esc(reportMeta.exportContentLabel || '行データのみ')}</span>
        <span class="header-badge">警告 ${warning.threshold ? esc(String(warning.total)) : 'OFF'}</span>
      </div>
    </div>

    <div class="settings-shell">
      <div class="settings-tabs" role="tablist" aria-label="レポート表示切替">
        <button type="button" role="tab" class="settings-tab" data-report-tab="summary" aria-selected="true">サマリー</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="diff" aria-selected="false">差分一覧</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="settingsLike" aria-selected="false">フィールド単位</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="compare" aria-selected="false">比較対象設定</button>
      </div>

      <section class="tab-pane" data-report-pane="summary">
        <div class="app-compare">
          <section class="app-card source">
            <div class="app-role">比較元 Source</div>
            <div class="app-title">アプリ ${esc(reportMeta.source.appId || '-')}</div>
            <div class="app-meta-grid">
              <div class="meta-card"><span class="label">ゲストスペース</span><span class="value">${esc(reportMeta.source.guestId || '(通常空間)')}</span></div>
              <div class="meta-card"><span class="label">モード</span><span class="value">${reportMeta.source.preview ? 'プレビュー' : '本番'}</span></div>
              <div class="meta-card"><span class="label">Revision</span><span class="value">${esc(reportMeta.source.revision || '-')}</span></div>
              <div class="meta-card"><span class="label">比較対象</span><span class="value">${esc(sectionText || '-')}</span></div>
            </div>
          </section>
          <section class="app-card target">
            <div class="app-role">比較先 Target</div>
            <div class="app-title">アプリ ${esc(reportMeta.target.appId || '-')}</div>
            <div class="app-meta-grid">
              <div class="meta-card"><span class="label">ゲストスペース</span><span class="value">${esc(reportMeta.target.guestId || '(通常空間)')}</span></div>
              <div class="meta-card"><span class="label">モード</span><span class="value">${reportMeta.target.preview ? 'プレビュー' : '本番'}</span></div>
              <div class="meta-card"><span class="label">Revision</span><span class="value">${esc(reportMeta.target.revision || '-')}</span></div>
              <div class="meta-card"><span class="label">正規化</span><span class="value">${esc(reportMeta.normalizationLabels.join(', ') || '-')}</span></div>
            </div>
          </section>
        </div>

        <div class="summary-strip" aria-label="差分サマリー">
          <article class="metric-card metric-card--total"><div class="metric-label">総件数</div><div class="metric-value">${summary.total}</div><div class="metric-sub">表示対象に含まれる行数</div></article>
          <article class="metric-card metric-card--diff"><div class="metric-label">差分</div><div class="metric-value">${diffTotal}</div><div class="metric-sub">全体の ${diffRate}% が変更対象</div></article>
          <article class="metric-card metric-card--added"><div class="metric-label">追加</div><div class="metric-value">${summary.added}</div><div class="metric-sub">比較先に追加された設定</div></article>
          <article class="metric-card metric-card--removed"><div class="metric-label">削除</div><div class="metric-value">${summary.removed}</div><div class="metric-sub">比較先から無くなった設定</div></article>
          <article class="metric-card metric-card--changed"><div class="metric-label">変更 / 移動</div><div class="metric-value">${summary.changed}</div><div class="metric-sub">移動 ${summary.moved} / 同一 ${summary.same}</div></article>
          <article class="metric-card metric-card--severity"><div class="metric-label">重要度</div><div class="metric-value">${severitySummary.high}</div><div class="metric-sub">高 / 中 ${severitySummary.medium} / 低 ${severitySummary.low} / 取得失敗 ${fetchIssues.length}</div></article>
        </div>

        <div class="info-grid">
          <section class="panel">
            <h3>比較条件</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">無視キー</span><span>${esc(reportMeta.ignoreKeys || '-')}</span></div>
              <div class="detail-row"><span class="detail-key">出力対象</span><span>${esc(reportMeta.exportLabel || '全差分')}</span></div>
              <div class="detail-row"><span class="detail-key">出力内容</span><span>${esc(reportMeta.exportContentLabel || '行データのみ')}</span></div>
              <div class="detail-row"><span class="detail-key">セクション</span><span>${esc(sectionText || '-')}</span></div>
            </div>
            ${warning.threshold ? `<div class="warn">警告しきい値: ${warning.threshold} / 合計 ${warning.total}${warning.exceeded ? ' (超過)' : ''}</div>` : ''}
            ${reportMeta.truncated ? `<div class="warn">※ 出力負荷を抑えるため、先頭 ${reportMeta.renderedRows} 件のみをレポートに含めています（元件数 ${reportMeta.totalRows} 件）。</div>` : ''}
            ${engineTruncation ? `<div class="warn">⚠ 差分件数が上限（${engineTruncation.diffLimit}件）に達したため、超過分は検出されておらずこのレポートに含まれていません。<b>このレポートは不完全です。</b>無視キーやセクション絞り込みで差分を減らして再比較してください。</div>` : ''}
          </section>
          <section class="panel">
            <h3>レビュー補助</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">文字差分</span><span>行内ハイライト対応</span></div>
              <div class="detail-row"><span class="detail-key">検索</span><span>パス / 値 / 理由 / フィールド名</span></div>
              <div class="detail-row"><span class="detail-key">ナビゲーション</span><span>左ペインからセクション / フィールド移動</span></div>
              <div class="detail-row"><span class="detail-key">出力</span><span>Patch JSON / フィールド詳細レビュー</span></div>
            </div>
          </section>
        </div>

        <div class="info-grid info-grid--review">
          ${sectionSummaryHtml}
          ${highlightSummaryHtml}
        </div>

        ${fetchIssues.length ? `<div class="issue-box">
          <h3>API取得失敗 ${fetchIssues.length}件</h3>
          <table>
            <thead><tr><th style="width:200px">セクション</th><th style="width:90px">対象</th><th>内容</th></tr></thead>
            <tbody>${fetchIssues.map((issue) => `<tr><td>${esc(issue.section || issue.sectionKey || '-')}</td><td>${esc(getIssueSideLabel(issue.side))}</td><td><div class="msg">${esc(issue.message || '-')}</div></td></tr>`).join('')}</tbody>
          </table>
        </div>` : ''}
      </section>

      <section class="tab-pane" data-report-pane="diff" hidden>
        <div class="content">
          <div id="main"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="settingsLike" hidden>
        <div class="content" style="padding:0">
          <p class="muted" style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6"><strong>フィールド単位</strong>で、フィールドごとの設定差分と影響範囲を1つの項目にまとめて確認します。左の検索と「同一項目を隠す」が連動し、カードのボタンから詳細をポップアップ表示できます。</p>
          <div id="settingsLikeRoot" class="sl-root"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="compare" hidden>
        ${compareHtml || '<div class="content"><div class="no-diff">比較対象設定の出力はありません。</div></div>'}
      </section>
    </div>

    <div id="fieldDetailModal" class="fd-overlay" hidden>
      <div class="fd-overlay-dialog" role="dialog" aria-modal="true" aria-labelledby="fieldDetailModalTitle">
        <div class="fd-overlay-head">
          <div>
            <div class="sb-kicker">Field Detail Popup</div>
            <div id="fieldDetailModalTitle" class="fd-overlay-title">フィールド詳細</div>
            <div id="fieldDetailModalSub" class="fd-overlay-sub">code: - / type: -</div>
          </div>
          <div class="fd-overlay-actions">
            <span class="fd-overlay-hint">Esc で閉じる</span>
            <button type="button" class="btn" data-modal-close>閉じる</button>
          </div>
        </div>
        <div id="fieldDetailModalBody" class="fd-overlay-body"></div>
      </div>
    </div>
  </main>
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
  let sections = [...new Set([...(state.lastDiffRows || []).map((r) => r.sectionKey), ...(state.lastFetchIssues || []).map((r) => r.sectionKey)].filter(Boolean))];
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
  if (!total && !issues && !state.lastDiffAt) {
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
  const truncated = !!state.lastDiffTruncation?.truncated;
  host.className = `diff-export-panel__summary${truncated ? ' is-warn' : ''}`;
  host.innerHTML = `出力対象: <b>${esc(resolved.label)} ${actual}件</b>（${breakdown}）${issueNote}`
    + `<span class="diff-export-panel__summary-sub">内容: ${esc(getDiffExportContentLabel(resolveDiffExportContentMode()))}</span>`
    + (truncated ? '<span class="diff-export-panel__summary-sub">⚠ 差分上限打ち切りが発生しています。出力は不完全です。</span>' : '');
}

export function renderDiffSelectionState() {
  renderDiffExportSummary();
  if (!ui.diffSelectionState) return;
  const total = (state.lastDiffRows || []).length;
  const selected = getSelectedDiffRows().length;
  const rendered = getRenderedDiffRows().length;
  const issues = (state.lastFetchIssues || []).length;
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
  if (!total && !issues && !state.lastDiffAt) {
    ui.diffSelectionState.textContent = '⏳ まだ差分を実行していません';
    ui.diffSelectionState.classList.add('is-empty-state');
    return;
  }
  ui.diffSelectionState.classList.remove('is-empty-state');
  ui.diffSelectionState.textContent =
    `選択 ${selected}/${total}件 / 表示中 ${rendered}件 / API取得失敗 ${issues}件 / ${reviewSummary} / 出力対象 ${exportModeLabelMap[resolveDiffExportMode()] || '全件（比較結果）'} / 出力内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} / 正規化 ${normalization.join(', ') || '-'}`;
}

export function renderDiffWarningBox() {
  if (!ui.diffWarnBox) return;
  const warning = buildDiffWarningInfo(state.lastDiffRows, state.lastFetchIssues);
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
  ui.diffWarnBox.textContent = `差分 ${warning.diffCount}件 + API取得失敗 ${warning.issueCount}件 = ${warning.total}件 が警告しきい値 ${warning.threshold}件以上です。`;
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
  if (!n && !m) {
    ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア（ヘッダー差分）</p><p class="main-result-placeholder-body">差分比較後は、比較条件の下にある<strong>差分結果の整理・出力</strong>から一覧・絞り込み・出力を確認できます。</p></div>`;
    return;
  }
  ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">差分 ${n} 行を保持中${m ? `（取得失敗 ${m} 件）` : ''}</p><p class="main-result-placeholder-body">一覧・チェック・出力は<strong>差分結果の整理・出力</strong>で行ってください。</p></div>`;
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
  const truncationHtml = truncation?.truncated ? `
      <div class="diff-truncation-warn" role="alert">
        <span class="diff-truncation-warn__icon" aria-hidden="true">⚠</span>
        <div class="diff-truncation-warn__body">
          <strong>差分が上限（${truncation.diffLimit}件）に達したため、超過分は検出されていません${truncation.droppedDiff ? `（判明分だけで ${truncation.droppedDiff}件が欠落）` : ''}。</strong>
          この比較結果は不完全なため、反映対象の判断には使わないでください。
          無視キーや正規化プリセットでノイズを減らすか、比較セクションを絞って再実行してください。
          ${truncation.sections?.length ? `<div class="diff-truncation-warn__sections">打ち切り発生セクション: ${truncation.sections.map((s) => `${esc(s.section)}${s.droppedDiff ? `（${s.droppedDiff}件以上）` : ''}`).join(' / ')}</div>` : ''}
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

  if (!rows.length && !state.lastFetchIssues.length) {
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
        ${issueHtml}
        ${buildCategoryViewHtml(rows)}
      </div>`;
    scheduleDiffPopoutSync();
    try {
      getToolDocument().dispatchEvent(new CustomEvent('kus:diffRendered', { detail: { count: rows.length, mode: 'category' } }));
    } catch (e) { /* ignore */ }
    return;
  }

  if (!filteredRows.length && !filteredIssues.length) {
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
      const canReflect = !r._displayOnly && !!r.sectionKey;
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
      ${issueHtml}
      ${!rows.length ? '<div class="diff-empty">比較差分はありません。API取得失敗のみ検出されています。</div>' : ''}
      ${sectionHtml}
    </div>`;
  scheduleDiffPopoutSync();
  try {
    getToolDocument().dispatchEvent(new CustomEvent('kus:diffRendered', { detail: { count: rows.length } }));
  } catch (e) { /* ignore */ }
}
