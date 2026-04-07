import {
  SECTION_DEFS, TOOL_ID,
  LINE_DIFF_MAX_CELLS, CHAR_DIFF_MAX_CELLS,
  DEFAULT_IGNORE_KEYS, DIFF_NORMALIZATION_PRESETS
} from '../constants.js';
import {
  esc, deepClone, safeJsonForScript,
  getDiffTypeDisplayLabel, getSeverityDisplayLabel,
  getIssueSideLabel, getPreviewStateLabel, getThemeDisplayLabel
} from '../utils.js';
import { state, ui } from '../state.js';
import {
  getActualDiffRows, countActualDiffRows, parseIgnoreRules,
  summarizeRows, summarizeFetchIssues,
  normalizeIgnoreToken, getPathLeafKey,
  getActiveDiffNormalizationLabels, normalizeSectionForCompare
} from './engine.js';
import { summarizeSeverity, extractFieldPathInfo, getFieldRowPayload } from './enrich.js';
import { buildIgnoreKeySuggestions, getFilteredDiffRowsWithoutSectionFilter } from './filter.js';
import { resolveBundleRevision, pickBundleSections } from '../api.js';

// ---------------------------------------------------------------------------
// Diff display helpers
// ---------------------------------------------------------------------------

export function stringifyForDiff(value) {
  if (value === undefined) return '（未定義）';
  const out = JSON.stringify(value, null, 2);
  return out == null ? String(value) : out;
}

export function getDiffExportContentLabel(mode) {
  return mode === 'withCompared' ? '差分 + 比較設定' : '差分のみ';
}

export function shouldIncludeComparedContent(mode) {
  return mode === 'withCompared';
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

export function buildCharDiffHtml(leftText, rightText) {
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
  const leftText = stringifyForDiff(row.left);
  const rightText = stringifyForDiff(row.right);
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
  if (row.type === 'same') {
    const text = stringifyForDiff(row.left);
    const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
    return {
      left: `<pre class="diff-pre" style="color:var(--dv-sub);font-style:italic">${esc(preview)}</pre>`,
      right: '<pre class="diff-pre" style="color:var(--dv-sub);font-style:italic">（同一）</pre>'
    };
  }
  if (row.type === 'added') {
    return {
      left: '<pre class="diff-pre empty">（なし）</pre>',
      right: `<pre class="diff-pre add">${esc(stringifyForDiff(row.right))}</pre>`
    };
  }
  if (row.type === 'removed') {
    return {
      left: `<pre class="diff-pre del">${esc(stringifyForDiff(row.left))}</pre>`,
      right: '<pre class="diff-pre empty">（なし）</pre>'
    };
  }
  return renderChangedColumns(row, useCharDiff);
}

export function renderDiffRowMeta(row) {
  const tags = [];
  const lines = [];
  if (row.reasonSummary) {
    tags.push(`<span class="diff-meta-tag reason">${esc(row.reasonSummary)}</span>`);
  }
  if (row.renameCandidate) {
    tags.push(`<span class="diff-meta-tag rename">名称変更候補 ${esc(row.renameCandidate.fromCode || '-')} → ${esc(row.renameCandidate.toCode || '-')}</span>`);
    if (row.renameCandidate.matchedBy) {
      lines.push(`<div class="diff-meta-line"><strong>判定:</strong> ${esc(row.renameCandidate.matchedBy)}</div>`);
    }
  }
  if (row.impactCount) {
    tags.push(`<span class="diff-meta-tag impact">影響 ${row.impactCount}件</span>`);
    const impactText = (row.impactRefs || [])
      .map((ref) => `${ref.section || ref.sectionKey || '-'}:${ref.kind || '-'}${ref.label ? `(${ref.label})` : ''}`)
      .join(' / ');
    lines.push(`<div class="diff-meta-line"><strong>影響:</strong> ${esc(impactText || row.impactSummary || '')}${row.impactCount > (row.impactRefs || []).length ? ` ... +${row.impactCount - (row.impactRefs || []).length}` : ''}</div>`);
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
  return [
    row.section || '',
    row.sectionKey || '',
    row.severity || '',
    row.path || '',
    row.reasonSummary || '',
    row.renameCandidate ? `${row.renameCandidate.fromCode || ''} ${row.renameCandidate.toCode || ''}` : '',
    row.impactSummary || '',
    ...(row.impactRefs || []).map((ref) => `${ref.section || ''} ${ref.kind || ''} ${ref.path || ''}`),
    safe(row.left),
    safe(row.right)
  ].join('\n').toLowerCase();
}

function collectFieldLabelMapFromProperties(properties, out = new Map()) {
  if (!properties || typeof properties !== 'object') return out;
  Object.entries(properties).forEach(([code, field]) => {
    if (!field || typeof field !== 'object') return;
    const label = String(field.label || field.name || '').trim();
    if (label) {
      if (!out.has(code)) out.set(code, new Set());
      out.get(code).add(label);
    }
    if (field.type === 'SUBTABLE' && field.fields && typeof field.fields === 'object') {
      collectFieldLabelMapFromProperties(field.fields, out);
    }
  });
  return out;
}

function buildFieldLabelMapFromBundle(bundle) {
  const props = bundle?.fieldSettings?.properties;
  return collectFieldLabelMapFromProperties(props, new Map());
}

function resolveDiffRowFieldTerms(row, sourceBundle, targetBundle) {
  const terms = new Set();
  const fieldInfo = extractFieldPathInfo(row?.path);
  if (fieldInfo?.activeCode) terms.add(fieldInfo.activeCode);
  if (row?.renameCandidate?.fromCode) terms.add(row.renameCandidate.fromCode);
  if (row?.renameCandidate?.toCode) terms.add(row.renameCandidate.toCode);
  const payload = getFieldRowPayload(row);
  if (payload?.code) terms.add(String(payload.code));
  const sourceMap = buildFieldLabelMapFromBundle(sourceBundle);
  const targetMap = buildFieldLabelMapFromBundle(targetBundle);
  [...terms].forEach((code) => {
    (sourceMap.get(code) || []).forEach((label) => terms.add(label));
    (targetMap.get(code) || []).forEach((label) => terms.add(label));
  });
  return [...terms].filter(Boolean);
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
  if (filters.favoritesOnly) {
    const p = String(row.path || '').trim();
    if (!state.diffFavoritePaths.has(p)) return false;
  }
  return true;
}

export function getCurrentDiffFilterState() {
  return {
    keyword: String(ui.diffSearch?.value || '').trim().toLowerCase(),
    section: ui.diffFilterSection?.value || state.diffFilterSection || '',
    type: ui.diffFilterType?.value || state.diffFilterType || '',
    severity: ui.diffFilterSeverity?.value || state.diffFilterSeverity || '',
    searchByFieldName: !!ui.diffSearchFieldName?.checked || !!state.diffSearchFieldName,
    sourceBundle: state.lastSourceBundle,
    targetBundle: state.lastTargetBundle,
    favoritesOnly: !!state.diffFavoritesOnly
  };
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

export function getSelectedDiffRows(rows) {
  const selected = state.diffSelectedIds || new Set();
  return (rows || state.lastDiffRows || []).filter((row) => selected.has(row._id));
}

export function getRenderedDiffRows(rows) {
  const filtered = getFilteredDiffRows(rows);
  const grouped = groupDiffRowsBySection(filtered);
  const out = [];
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
    const oa = orderByKey.has(a.key) ? orderByKey.get(a.key) : 9999;
    const ob = orderByKey.has(b.key) ? orderByKey.get(b.key) : 9999;
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

export function resolveDiffExportRows(mode) {
  const exportMode = mode || resolveDiffExportMode();
  if (exportMode === 'selected') {
    const rows = getSelectedDiffRows();
    if (!rows.length) throw new Error('選択差分がありません');
    return { mode: exportMode, label: '選択差分', rows };
  }
  if (exportMode === 'visible') {
    const rows = getRenderedDiffRows();
    if (!rows.length) throw new Error('現在表示中の差分がありません');
    return { mode: exportMode, label: '現在表示中', rows };
  }
  if (exportMode === 'favorites') {
    const rows = (state.lastDiffRows || []).filter((row) => state.diffFavoritePaths.has(String(row.path || '').trim()));
    if (!rows.length) throw new Error('お気に入り差分がありません');
    return { mode: exportMode, label: 'お気に入り差分', rows };
  }
  return { mode: 'all', label: '全差分', rows: state.lastDiffRows || [] };
}

export function resolveDiffExportComparedScopes(exportInfo, scopes) {
  const fallbackScopes = [...new Set((scopes || []).filter(Boolean))];
  if ((exportInfo?.mode || 'all') === 'all') return fallbackScopes;
  const rowScopes = [...new Set((exportInfo?.rows || []).map((row) => row.sectionKey).filter(Boolean))];
  if (rowScopes.length) return rowScopes;
  const issueScopes = [...new Set((state.lastFetchIssues || []).map((issue) => issue.sectionKey).filter(Boolean))];
  return issueScopes.length ? issueScopes : fallbackScopes;
}

export function buildDiffExportComparedBundles(sourceBundle, targetBundle, scopes) {
  const compareScopes = [...new Set((scopes || []).filter(Boolean))];
  return {
    scopes: compareScopes,
    sourceBundle: pickBundleSections(sourceBundle, compareScopes),
    targetBundle: pickBundleSections(targetBundle, compareScopes)
  };
}

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

export function bundleToMarkdown(bundle) {
  const lines = [];
  lines.push('# kintone 設計書');
  lines.push('');
  lines.push(`- アプリID: ${bundle.appId}`);
  lines.push(`- ゲストスペースID: ${bundle.guestId || '(通常空間)'}`);
  lines.push(`- プレビュー取得: ${bundle.preview ? 'はい' : 'いいえ'}`);
  lines.push(`- 取得日時: ${bundle.fetchedAt}`);
  lines.push('');
  for (const def of SECTION_DEFS) {
    const sec = bundle.sections[def.key];
    if (!sec) continue;
    lines.push(`## ${def.label}`);
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(sec, null, 2));
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Patch JSON export
// ---------------------------------------------------------------------------

export function buildPatchPayload(rows, sourceBundle, targetBundle) {
  const grouped = {};
  for (const r of getActualDiffRows(rows)) {
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
  return {
    generatedAt: new Date().toISOString(),
    source: { appId: sourceBundle?.appId || '', guestId: sourceBundle?.guestId || '', preview: !!sourceBundle?.preview },
    target: { appId: targetBundle?.appId || '', guestId: targetBundle?.guestId || '', preview: !!targetBundle?.preview },
    sections: grouped
  };
}

// ---------------------------------------------------------------------------
// HTML report export
// ---------------------------------------------------------------------------

export function buildDiffHtml(sourceBundle, targetBundle, rows, scopes, ignoreKeys, options = {}) {
  const withSameSections = (() => {
    const baseRows = Array.isArray(rows) ? [...rows] : [];
    const scopeList = Array.isArray(scopes) ? scopes.filter(Boolean) : [];
    if (!scopeList.length || !sourceBundle?.sections || !targetBundle?.sections) return baseRows;
    const issueSectionSet = new Set((Array.isArray(options.fetchIssues) ? options.fetchIssues : [])
      .map((issue) => issue?.sectionKey)
      .filter(Boolean));
    const rowSectionSet = new Set(baseRows.map((row) => row?.sectionKey).filter(Boolean));
    const presetState = options.normalizationState || {};
    for (const sec of scopeList) {
      if (rowSectionSet.has(sec) || issueSectionSet.has(sec)) continue;
      const sourceSec = sourceBundle.sections?.[sec];
      const targetSec = targetBundle.sections?.[sec];
      if (!sourceSec || !targetSec) continue;
      const normalizedSource = normalizeSectionForCompare(sec, sourceSec, presetState);
      const normalizedTarget = normalizeSectionForCompare(sec, targetSec, presetState);
      if (JSON.stringify(normalizedSource) !== JSON.stringify(normalizedTarget)) continue;
      const sectionLabel = (SECTION_DEFS.find((def) => def.key === sec) || {}).label || sec;
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
  const MAX_EXPORT_ROWS = 2000;
  const exportRows = withSameSections.slice(0, MAX_EXPORT_ROWS);
  const fetchIssues = Array.isArray(options.fetchIssues) ? options.fetchIssues : [];
  const normalizationLabels = getActiveDiffNormalizationLabels(options.normalizationState || {});
  const warning = options.warning || { threshold: 0, exceeded: false, total: withSameSections.length + fetchIssues.length };
  const exportContentMode = options.exportContentMode || 'diffOnly';
  const exportContentLabel = options.exportContentLabel || getDiffExportContentLabel(exportContentMode);
  const compareScopes = Array.isArray(options.compareScopes) ? options.compareScopes : [];
  const compareSourceBundle = options.compareSourceBundle || null;
  const compareTargetBundle = options.compareTargetBundle || null;
  /** kintone-ui-component UMD / Kucs グローバルと一致させる */
  const KUC_REPORT_VERSION = '1.24.0';
  const reportMeta = {
    generatedAt: new Date().toISOString(),
    ignoreKeys: String(ignoreKeys || ''),
    scopes: scopes || [],
    sectionText,
    exportMode: options.exportMode || 'all',
    exportLabel: options.exportLabel || '全差分',
    exportContentMode,
    exportContentLabel,
    normalizationLabels,
    warning,
    source: {
      appId: sourceBundle?.appId || '',
      guestId: sourceBundle?.guestId || '',
      preview: !!sourceBundle?.preview,
      revision: resolveBundleRevision(sourceBundle) || ''
    },
    target: {
      appId: targetBundle?.appId || '',
      guestId: targetBundle?.guestId || '',
      preview: !!targetBundle?.preview,
      revision: resolveBundleRevision(targetBundle) || ''
    },
    summary,
    fetchIssues,
    totalRows: withSameSections.length,
    renderedRows: exportRows.length,
    truncated: withSameSections.length > exportRows.length,
    compareScopes
  };

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
  const REPORT_META = ${safeJsonForScript(reportMeta)};
  const THEME_KEY = '${TOOL_ID}:diffReportTheme';
  const ACTIVE_TAB_KEY = '${TOOL_ID}:diffReportActiveTab';
  const LINE_DIFF_MAX_CELLS = ${LINE_DIFF_MAX_CELLS};
  const CHAR_DIFF_MAX_CELLS = ${CHAR_DIFF_MAX_CELLS};
  const collapsed = new Set();
  const KUC_SEMVER = '${KUC_REPORT_VERSION}';
  const FIELD_PROPS_SRC = ${safeJsonForScript(srcFieldProps)};
  const FIELD_PROPS_TGT = ${safeJsonForScript(tgtFieldProps)};

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
      const text = safeText(row.left);
      const preview = text.length > 200 ? text.slice(0, 200) + '...' : text;
      return {
        left: '<pre class="blk same">' + escHtml(preview) + '</pre>',
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
    const lines = [];
    if (row.reasonSummary) tags.push('<span class="meta-tag reason">' + escHtml(row.reasonSummary) + '</span>');
    if (row.renameCandidate) {
      tags.push('<span class="meta-tag rename">名称変更候補 ' + escHtml(row.renameCandidate.fromCode || '-') + ' → ' + escHtml(row.renameCandidate.toCode || '-') + '</span>');
      if (row.renameCandidate.matchedBy) {
        lines.push('<div class="meta-line"><strong>判定:</strong> ' + escHtml(row.renameCandidate.matchedBy) + '</div>');
      }
    }
    if (row.impactCount) {
      tags.push('<span class="meta-tag impact">影響 ' + escHtml(String(row.impactCount)) + '件</span>');
      const impactText = (row.impactRefs || []).map((ref) => (ref.section || ref.sectionKey || '-') + ':' + (ref.kind || '-')).join(' / ');
      lines.push('<div class="meta-line"><strong>影響:</strong> ' + escHtml(impactText || row.impactSummary || '') + '</div>');
    }
    if (!tags.length && !lines.length) return '';
    return '<div class="meta-wrap">' +
      (tags.length ? '<div class="meta-tags">' + tags.join('') + '</div>' : '') +
      lines.join('') +
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

  function formatFieldValueBrief(val, maxLen) {
    const n = maxLen == null ? 320 : maxLen;
    if (val === undefined) return '<span class="sl-empty">（なし）</span>';
    if (val === null) return escHtml('null');
    const t = typeof val;
    if (t === 'string' || t === 'number' || t === 'boolean') {
      let s = String(val);
      if (s.length > n) s = s.slice(0, n) + '…';
      return escHtml(s);
    }
    if (Array.isArray(val)) {
      let j;
      try { j = JSON.stringify(val); } catch (e) { j = String(val); }
      if (j.length > n) j = j.slice(0, n) + '…';
      return '<span class="sl-val-mono">' + escHtml(j) + '</span>';
    }
    if (t === 'object') {
      const keys = Object.keys(val);
      if (keys.length && keys.length <= 10) {
        const rows = keys.slice(0, 10).map((k) => {
          const v = val[k];
          let cell;
          if (v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            cell = escHtml(v === undefined ? '（未定義）' : JSON.stringify(v));
          } else {
            let j;
            try { j = JSON.stringify(v); } catch (e) { j = String(v); }
            if (j.length > 120) j = j.slice(0, 120) + '…';
            cell = escHtml(j);
          }
          return '<tr><th>' + escHtml(k) + '</th><td>' + cell + '</td></tr>';
        }).join('');
        return '<table class="sl-mini-table">' + rows + '</table>';
      }
    }
    let j;
    try { j = JSON.stringify(val); } catch (e) { j = String(val); }
    if (j.length > n) j = j.slice(0, n) + '…';
    return '<span class="sl-val-mono">' + escHtml(j) + '</span>';
  }

  function getKuc() {
    return window.Kucs && window.Kucs[KUC_SEMVER] ? window.Kucs[KUC_SEMVER] : null;
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

  function fieldChangePropTitle(info, row) {
    if (!info) return row.path || '-';
    if (info.isFieldRoot || info.isSubFieldRoot) return 'フィールド定義（全体）';
    if (!info.tailTokens.length) return row.path || '-';
    return info.tailTokens.map((t) => (typeof t === 'number' ? '[' + t + ']' : String(t))).join('.');
  }

  function summarizeFieldGroupHeader(rows, infoSample) {
    const code = infoSample ? infoSample.activeCode : '';
    let ftype = '';
    let label = '';
    for (let i = 0; i < rows.length; i++) {
      const p = getFieldRowPayload(rows[i]);
      if (p && typeof p === 'object' && !Array.isArray(p) && p.type) {
        ftype = String(p.type || '');
        label = String(p.label != null ? p.label : (p.name != null ? p.name : ''));
        break;
      }
    }
    let sub = code;
    if (ftype) sub += ' · ' + ftype;
    if (label) sub += ' · ' + label;
    return sub;
  }

  function groupFieldSettingsRows(rows) {
    const buckets = new Map();
    const other = [];
    for (const row of rows) {
      if (row.sectionKey !== FIELD_SECTION_KEY) continue;
      const info = extractFieldPathInfo(row.path);
      if (!info) {
        other.push(row);
        continue;
      }
      const k = info.rootPath;
      if (!buckets.has(k)) buckets.set(k, { key: k, info, rows: [] });
      buckets.get(k).rows.push(row);
    }
    const list = [...buckets.values()].sort((a, b) => String(a.key).localeCompare(String(b.key)));
    if (other.length) list.push({ key: FIELD_SECTION_KEY, info: null, rows: other });
    return list;
  }

  function getActiveReportTab() {
    const btn = document.querySelector('.settings-tab:not(.passive)[data-report-tab]');
    return btn ? btn.getAttribute('data-report-tab') : 'summary';
  }

  function renderSettingsLikeView() {
    const root = document.getElementById('settingsLikeRoot');
    if (!root) return;
    const hideSame = !!document.getElementById('hideSame').checked;
    const keyword = String(document.getElementById('search').value || '').trim().toLowerCase();
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

  // ---------------------------------------------------------------------------
  // kintone フォームプレビュー
  // ---------------------------------------------------------------------------

  const FP_TYPE_LABELS = {
    SINGLE_LINE_TEXT: '文字列(1行)', MULTI_LINE_TEXT: '文字列(複数行)', RICH_TEXT: 'リッチエディター',
    NUMBER: '数値', CHECK_BOX: 'チェックボックス', RADIO_BUTTON: 'ラジオボタン',
    DROP_DOWN: 'ドロップダウン', MULTI_SELECT: '複数選択',
    DATE: '日付', TIME: '時刻', DATETIME: '日時', LINK: 'リンク',
    USER_SELECT: 'ユーザー選択', GROUP_SELECT: 'グループ選択', ORGANIZATION_SELECT: '組織選択',
    FILE: '添付ファイル', CALC: '計算', LOOKUP: 'ルックアップ',
    REFERENCE_TABLE: '関連レコード一覧', SUBTABLE: 'サブテーブル',
    HR: '罫線', LABEL: 'ラベル', SPACER: 'スペース'
  };

  function fpInputCtrl(field) {
    const type = field.type || '';
    const opts = Object.values(field.options || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    const eh = escHtml;
    switch (type) {
      case 'SINGLE_LINE_TEXT': case 'LINK':
        return '<div class="fp-ctrl fp-text"><div class="fp-mock"></div></div>';
      case 'MULTI_LINE_TEXT':
        return '<div class="fp-ctrl"><div class="fp-mock fp-mock-tall"></div></div>';
      case 'RICH_TEXT':
        return '<div class="fp-ctrl fp-rt"><div class="fp-rt-bar"><b>B</b>&nbsp;<em>I</em>&nbsp;<u>U</u></div><div class="fp-mock fp-mock-tall"></div></div>';
      case 'NUMBER': {
        const u = field.unit ? '<span class="fp-unit">' + eh(field.unit) + '</span>' : '';
        const pre = field.unitPosition !== 'AFTER' ? u : '';
        const post = field.unitPosition === 'AFTER' ? u : '';
        return '<div class="fp-ctrl fp-num">' + pre + '<div class="fp-mock fp-mock-num"></div>' + post + '</div>';
      }
      case 'CHECK_BOX':
        return '<div class="fp-ctrl fp-choices">' + opts.slice(0, 4).map((o) => '<label class="fp-choice"><span class="fp-chk"></span><span>' + eh(o.label) + '</span></label>').join('') + (opts.length > 4 ? '<span class="fp-more">…+' + (opts.length - 4) + '</span>' : '') + '</div>';
      case 'RADIO_BUTTON':
        return '<div class="fp-ctrl fp-choices">' + opts.slice(0, 4).map((o) => '<label class="fp-choice"><span class="fp-radio"></span><span>' + eh(o.label) + '</span></label>').join('') + (opts.length > 4 ? '<span class="fp-more">…+' + (opts.length - 4) + '</span>' : '') + '</div>';
      case 'DROP_DOWN':
        return '<div class="fp-ctrl fp-dd"><span class="fp-dd-val">' + eh(field.defaultValue || (opts[0] && opts[0].label) || '選択してください') + '</span><span class="fp-dd-caret">▾</span></div>';
      case 'MULTI_SELECT':
        return '<div class="fp-ctrl fp-ms">' + opts.slice(0, 3).map((o) => '<span class="fp-tag">' + eh(o.label) + '</span>').join('') + (opts.length > 3 ? '<span class="fp-more">+' + (opts.length - 3) + '</span>' : '') + '</div>';
      case 'DATE':
        return '<div class="fp-ctrl fp-dt"><span class="fp-dt-ph">YYYY/MM/DD</span></div>';
      case 'TIME':
        return '<div class="fp-ctrl fp-dt"><span class="fp-dt-ph">HH:MM</span></div>';
      case 'DATETIME':
        return '<div class="fp-ctrl fp-dt"><span class="fp-dt-ph">YYYY/MM/DD HH:MM</span></div>';
      case 'FILE':
        return '<div class="fp-ctrl fp-file"><span>&#128206;</span><span>添付ファイル</span></div>';
      case 'USER_SELECT': case 'GROUP_SELECT': case 'ORGANIZATION_SELECT':
        return '<div class="fp-ctrl fp-entity"><span class="fp-ep">＋</span><span>追加</span></div>';
      case 'CALC':
        return '<div class="fp-ctrl fp-calc"><span class="fp-ceq">=</span><span class="fp-cexpr">' + eh(field.expression || '計算式') + '</span></div>';
      case 'LOOKUP':
        return '<div class="fp-ctrl fp-lookup"><div class="fp-mock fp-mock-lk"></div><span class="fp-lb">参照</span></div>';
      case 'REFERENCE_TABLE':
        return '<div class="fp-ctrl fp-ref"><span>▤</span><span>関連レコード一覧</span></div>';
      case 'SUBTABLE':
        return '<div class="fp-ctrl fp-sub"><div class="fp-sub-bar">▶ サブテーブル</div></div>';
      case 'HR':
        return '<div class="fp-ctrl"><hr class="fp-hr"></div>';
      case 'LABEL':
        return '<div class="fp-ctrl fp-lbl-f"><span>' + eh(field.label || '') + '</span></div>';
      case 'SPACER':
        return '<div class="fp-ctrl fp-spacer"></div>';
      default:
        return '<div class="fp-ctrl fp-unknown"><span class="fp-tn">' + eh(type || '?') + '</span></div>';
    }
  }

  function fpField(field, statusKey) {
    const type = field.type || '';
    const label = field.label || field.code || type;
    const required = !!field.required;
    const typeLabel = FP_TYPE_LABELS[type] || type;
    const eh = escHtml;
    return '<div class="fp-field fp-field-' + statusKey + '">' +
      '<div class="fp-field-lbl">' +
        '<span class="fp-lbl-text">' + eh(label) + '</span>' +
        (required ? '<span class="fp-req">必須</span>' : '') +
        '<span class="fp-type-chip">' + eh(typeLabel) + '</span>' +
      '</div>' +
      '<div class="fp-field-ctrl">' + fpInputCtrl(field) + '</div>' +
      '</div>';
  }

  function computeFieldDiff(before, after) {
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    const rows = [];
    for (const code of keys) {
      const bf = (before || {})[code];
      const af = (after || {})[code];
      if (!bf && af) rows.push({ code, status: 'added', before: null, after: af });
      else if (bf && !af) rows.push({ code, status: 'removed', before: bf, after: null });
      else {
        let same = true;
        try { same = JSON.stringify(bf) === JSON.stringify(af); } catch (e) {}
        rows.push({ code, status: same ? 'unchanged' : 'modified', before: bf, after: af });
      }
    }
    const order = { added: 0, removed: 1, modified: 2, unchanged: 3 };
    rows.sort((a, b) => (order[a.status] || 0) - (order[b.status] || 0));
    return rows;
  }

  function renderFormPreview() {
    const root = document.getElementById('formPreviewRoot');
    if (!root) return;
    const srcKeys = Object.keys(FIELD_PROPS_SRC || {});
    const tgtKeys = Object.keys(FIELD_PROPS_TGT || {});
    if (!srcKeys.length && !tgtKeys.length) {
      root.innerHTML = '<div class="no-diff">フィールド設定データがありません。比較対象セクションに「フィールド設定」を含めてHTML出力してください。</div>';
      return;
    }
    const hideSame = !!document.getElementById('hideSame').checked;
    const keyword = String(document.getElementById('search').value || '').trim().toLowerCase();
    let diff = computeFieldDiff(FIELD_PROPS_SRC, FIELD_PROPS_TGT);
    if (hideSame) diff = diff.filter((r) => r.status !== 'unchanged');
    if (keyword) {
      diff = diff.filter((r) => {
        const text = [r.code, (r.before && r.before.label) || '', (r.after && r.after.label) || ''].join(' ').toLowerCase();
        return text.includes(keyword);
      });
    }
    if (!diff.length) {
      root.innerHTML = '<div class="no-diff">表示対象のフィールドがありません。</div>';
      return;
    }
    let html = '<div class="fp-view">';
    html += '<div class="fp-view-hd"><div class="fp-view-hd-cell">比較元</div><div class="fp-view-hd-cell fp-hd-r">比較先</div></div>';
    html += '<div class="fp-view-body">';
    for (const row of diff) {
      const srcStatus = row.status === 'removed' ? 'removed' : (row.status === 'modified' ? 'modified' : 'unchanged');
      const tgtStatus = row.status === 'added' ? 'added' : (row.status === 'modified' ? 'modified' : 'unchanged');
      const srcCell = row.before ? fpField(row.before, srcStatus) : '<div class="fp-absent"><span>（なし）</span></div>';
      const tgtCell = row.after ? fpField(row.after, tgtStatus) : '<div class="fp-absent"><span>（なし）</span></div>';
      html += '<div class="fp-pair fp-pair-' + row.status + '"><div class="fp-col">' + srcCell + '</div><div class="fp-col fp-col-r">' + tgtCell + '</div></div>';
    }
    html += '</div></div>';
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
    const nextTab = tabName || 'summary';
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
    try { localStorage.setItem(ACTIVE_TAB_KEY, nextTab); } catch (e) {}
    if (nextTab === 'settingsLike') renderSettingsLikeView();
    else if (nextTab === 'formPreview') renderFormPreview();
    else if (nextTab === 'diff') render();
    else {
      const hideSame = !!document.getElementById('hideSame').checked;
      const kw = String(document.getElementById('search').value || '').trim().toLowerCase();
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
    else if (getActiveReportTab() === 'formPreview') renderFormPreview();
  }

  function render() {
    const hideSame = !!document.getElementById('hideSame').checked;
    const useCharDiff = !!document.getElementById('charDiff').checked;
    const keyword = String(document.getElementById('search').value || '').trim().toLowerCase();
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
      const navItem = document.createElement('div');
      navItem.className = 'nav-item';
      navItem.innerHTML = '<span>' + escHtml(g.label) + '</span><span class="badge">' + g.rows.length + '</span>';
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
      head.innerHTML = '<span>' + (collapsedNow ? '▶' : '▼') + ' ' + escHtml(g.label) + '</span><span class="sec-meta">' + g.rows.length + ' 件</span>';
      head.onclick = () => {
        if (collapsed.has(g.key)) collapsed.delete(g.key);
        else collapsed.add(g.key);
        render();
      };
      sec.appendChild(head);

      if (!collapsedNow) {
        const table = document.createElement('table');
        table.className = 'diff-table';
        table.innerHTML = '<thead><tr><th style="width:110px">種別</th><th style="width:260px">パス</th><th>比較元</th><th>比較先</th></tr></thead>';
        const tbody = document.createElement('tbody');
        g.rows.forEach((row) => {
          const tr = document.createElement('tr');
          const typeLabel = diffTypeLabel(row.type, row.moved);
          const cells = renderRowCells(row, useCharDiff);
          const typeClass = row.type === 'same' ? 'same' : (row.type === 'added' ? 'added' : (row.type === 'removed' ? 'removed' : 'changed'));
          tr.innerHTML =
            '<td class="type ' + typeClass + '">' + escHtml(typeLabel) + '</td>' +
            '<td class="path" title="' + escHtml(row.path || '-') + '">' + escHtml(row.path || '-') + renderRowMeta(row) + '</td>' +
            '<td class="cell">' + cells.left + '</td>' +
            '<td class="cell">' + cells.right + '</td>';
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        sec.appendChild(table);
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
    localStorage.setItem(THEME_KEY, document.body.classList.contains('dark') ? 'dark' : 'light');
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
      alert('出力できる差分がありません');
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
    a.download = 'patch_' + REPORT_META.source.appId + '_vs_' + REPORT_META.target.appId + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.__diffReport = { render, toggleTheme, collapseAll, expandAll, exportPatch, setActiveTab, renderFormPreview };

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
      document.getElementById('search').value = '';
      onReportFilterChange();
    }
  });

  if (localStorage.getItem(THEME_KEY) === 'dark') document.body.classList.add('dark');
  syncThemeButtonLabel();
  setActiveTab(localStorage.getItem(ACTIVE_TAB_KEY) || 'summary');
  render();
  if (getActiveReportTab() === 'settingsLike') renderSettingsLikeView();
  else if (getActiveReportTab() === 'formPreview') renderFormPreview();
})();
`;

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>kintone差分レポート</title>
  <script src="https://cdn.jsdelivr.net/npm/kintone-ui-component@${KUC_REPORT_VERSION}/umd/kuc.min.js" crossorigin="anonymous"></script>
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
    .summary-strip{display:flex;gap:10px;flex-wrap:wrap;padding:18px;border-bottom:1px solid var(--border);background:var(--card)}
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
    .diff-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}
    .diff-table th,.diff-table td{border-bottom:1px solid var(--border);padding:10px 12px;vertical-align:top;text-align:left}
    .diff-table th{position:sticky;top:0;background:var(--card);z-index:1;font-size:10px;font-weight:800;letter-spacing:.05em;color:var(--muted);text-transform:uppercase}
    .type{font-weight:800}
    .type.added{color:#15803d}
    .type.removed{color:#b91c1c}
    .type.changed{color:#b45309}
    .type.same{color:#0d9488}
    .path{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;word-break:break-all;color:var(--muted);font-size:11px}
    .meta-wrap{margin-top:8px;font-family:"Noto Sans JP","Hiragino Kaku Gothic ProN",Meiryo,sans-serif}
    .meta-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
    .meta-tag{display:inline-flex;align-items:center;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--pad);font-size:10px;font-weight:600;color:var(--fg)}
    .meta-tag.reason{background:#fff7ed;color:#9a3412;border-color:#fdba74}
    .meta-tag.rename{background:#ecfdf5;color:#15803d;border-color:#86efac}
    .meta-tag.impact{background:#eff6ff;color:#1d4ed8;border-color:#93c5fd}
    .meta-line{font-size:10px;line-height:1.5;color:var(--muted)}
    .meta-line strong{color:var(--fg)}
    .cell{padding:0;overflow:hidden}
    .scroll{max-height:330px;overflow:auto;scrollbar-width:thin;scrollbar-color:var(--border) transparent}
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
    /* Form Preview (fp-*) */
    .fp-root{padding:16px 18px 28px;background:var(--card-soft);min-height:320px}
    .fp-view{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--card)}
    .fp-view-hd{display:grid;grid-template-columns:1fr 1fr;position:sticky;top:0;z-index:2}
    .fp-view-hd-cell{padding:8px 14px;font-size:12px;font-weight:700;color:#fff;background:#1e40af;letter-spacing:.03em}
    .fp-hd-r{border-left:2px solid rgba(255,255,255,.25)}
    body.dark .fp-view-hd-cell{background:#1e3a5f}
    .fp-view-body{display:flex;flex-direction:column}
    .fp-pair{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border);align-items:stretch}
    .fp-pair:last-child{border-bottom:none}
    .fp-col{display:flex;flex-direction:column}
    .fp-col-r{border-left:1px solid var(--border)}
    .fp-field{display:flex;align-items:stretch;width:100%;min-height:44px;border-left:3px solid transparent;box-sizing:border-box}
    .fp-field-unchanged{border-left-color:var(--border);background:var(--card-soft)}
    .fp-field-added{border-left-color:#16a34a;background:#f0fdf4}
    body.dark .fp-field-added{background:#052e16}
    .fp-field-removed{border-left-color:#dc2626;background:#fef2f2;opacity:.75}
    body.dark .fp-field-removed{background:#1c0a0a}
    .fp-field-modified{border-left-color:#d97706;background:#fffbeb}
    body.dark .fp-field-modified{background:#1c1407}
    .fp-field-lbl{display:flex;flex-direction:column;justify-content:center;gap:3px;width:40%;max-width:150px;min-width:72px;flex-shrink:0;padding:8px 10px;background:#f1f5f9;border-right:1px solid var(--border);box-sizing:border-box}
    body.dark .fp-field-lbl{background:#1e293b}
    .fp-lbl-text{font-size:11px;font-weight:700;color:var(--fg);line-height:1.3;word-break:break-all}
    .fp-req{display:inline-block;background:#dc2626;color:#fff;font-size:9px;font-weight:700;padding:1px 4px;border-radius:2px;width:fit-content}
    .fp-type-chip{font-size:9px;color:var(--muted);background:var(--border);padding:1px 4px;border-radius:2px;display:inline-block;width:fit-content}
    .fp-field-ctrl{flex:1;padding:8px 10px;display:flex;align-items:center;min-width:0;background:var(--card)}
    .fp-ctrl{width:100%}
    .fp-mock{height:26px;border:1px solid var(--border);border-radius:3px;background:var(--card)}
    .fp-mock-tall{height:54px}
    .fp-mock-num{width:90px;display:inline-block}
    .fp-mock-lk{flex:1}
    .fp-rt{display:flex;flex-direction:column;gap:3px;width:100%}
    .fp-rt-bar{display:flex;gap:5px;padding:3px 7px;background:var(--card-soft);border:1px solid var(--border);border-radius:3px 3px 0 0;font-size:11px;font-weight:700;color:var(--muted)}
    .fp-num{display:flex;align-items:center;gap:5px}
    .fp-unit{font-size:12px;font-weight:600;color:var(--muted)}
    .fp-choices{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}
    .fp-choice{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--fg);cursor:default}
    .fp-chk{width:13px;height:13px;border:1px solid var(--muted);border-radius:2px;display:inline-block;flex-shrink:0}
    .fp-radio{width:13px;height:13px;border:1px solid var(--muted);border-radius:50%;display:inline-block;flex-shrink:0}
    .fp-dd{display:flex;align-items:center;border:1px solid var(--border);border-radius:3px;background:var(--card);padding:4px 7px;max-width:180px}
    .fp-dd-val{flex:1;font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .fp-dd-caret{color:var(--muted);font-size:10px;margin-left:3px;flex-shrink:0}
    .fp-ms{display:flex;flex-wrap:wrap;gap:3px}
    .fp-tag{background:#dbeafe;color:#1e40af;font-size:10px;padding:2px 6px;border-radius:999px}
    body.dark .fp-tag{background:#1e3a5f;color:#93c5fd}
    .fp-dt{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:3px;background:var(--card);padding:4px 7px}
    .fp-dt-ph{font-size:10px;color:var(--muted);font-family:ui-monospace,monospace}
    .fp-file{display:flex;align-items:center;gap:5px;padding:4px 8px;border:1px dashed var(--muted);border-radius:5px;font-size:11px;color:var(--muted);background:var(--card-soft);max-width:140px}
    .fp-entity{display:inline-flex;align-items:center;gap:3px;background:var(--accent-soft);border:1px solid var(--border);border-radius:999px;padding:3px 9px;font-size:11px;color:var(--accent-strong)}
    .fp-ep{font-weight:700;font-size:13px}
    .fp-calc{display:flex;align-items:center;gap:4px}
    .fp-ceq{font-size:14px;font-weight:700;color:#6366f1}
    .fp-cexpr{font-size:10px;color:var(--muted);font-family:ui-monospace,monospace;background:var(--accent-soft);padding:2px 5px;border-radius:3px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .fp-lookup{display:flex;align-items:center;gap:6px;width:100%}
    .fp-lb{background:var(--card-soft);border:1px solid var(--border);border-radius:3px;padding:3px 7px;font-size:10px;color:var(--fg);white-space:nowrap}
    .fp-ref{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--muted);padding:5px 7px;background:var(--card-soft);border:1px solid var(--border);border-radius:5px}
    .fp-sub{border:1px solid var(--border);border-radius:5px;overflow:hidden;background:var(--card-soft);width:100%}
    .fp-sub-bar{padding:5px 9px;font-size:10px;font-weight:700;color:var(--muted);background:var(--card-soft);border-bottom:1px solid var(--border)}
    .fp-hr{border:none;border-top:1px solid var(--border);margin:4px 0}
    .fp-lbl-f{font-size:12px;color:var(--fg)}
    .fp-spacer{height:18px}
    .fp-unknown{display:flex;align-items:center}
    .fp-tn{font-size:9px;color:var(--muted);background:var(--card-soft);padding:2px 5px;border-radius:2px}
    .fp-more{font-size:9px;color:var(--muted);background:var(--card-soft);padding:1px 4px;border-radius:2px}
    .fp-absent{display:flex;align-items:center;justify-content:center;min-height:44px;width:100%;background:var(--card-soft);padding:8px;box-sizing:border-box}
    .fp-absent span{font-size:11px;color:var(--muted);font-style:italic}
    @media (max-width:900px){.fp-pair{grid-template-columns:1fr}.fp-col-r{border-left:none;border-top:1px solid var(--border)}}
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
        出力内容: ${esc(reportMeta.exportContentLabel || '差分のみ')}
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
      <input type="text" id="search" placeholder="パス・値・理由で絞り込み" aria-label="差分の検索" autocomplete="off">
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
        <div class="sb-kicker">kintone-like Visual Compare</div>
        <div class="topbar-title">アプリ設定の差分を、設定画面に近い見た目でレビュー</div>
        <div class="topbar-desc">比較元・比較先のメタ情報、差分件数、比較対象セクションを一画面に集約し、各セクションは変更種別ごとのハイライト付きで確認できます。</div>
      </div>
      <div class="header-actions">
        <span class="header-badge">セクション ${esc(String((scopes || []).length || 0))}</span>
        <span class="header-badge">出力 ${esc(reportMeta.exportContentLabel || '差分のみ')}</span>
        <span class="header-badge">警告 ${warning.threshold ? esc(String(warning.total)) : 'OFF'}</span>
      </div>
    </div>

    <div class="settings-shell">
      <div class="settings-tabs" role="tablist" aria-label="レポート表示切替">
        <button type="button" role="tab" class="settings-tab" data-report-tab="summary" aria-selected="true">サマリー</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="diff" aria-selected="false">差分一覧</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="settingsLike" aria-selected="false">フィールド比較</button>
        <button type="button" role="tab" class="settings-tab passive" data-report-tab="formPreview" aria-selected="false">フォームプレビュー</button>
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

        <div class="summary-strip">
          <span class="pill pill--total">総件数 <span class="count">${summary.total}</span></span>
          <span class="pill pill--added">追加 <span class="count">${summary.added}</span></span>
          <span class="pill pill--removed">削除 <span class="count">${summary.removed}</span></span>
          <span class="pill pill--changed">変更 <span class="count">${summary.changed}</span></span>
          <span class="pill pill--moved">移動 <span class="count">${summary.moved}</span></span>
          <span class="pill pill--same">同一 <span class="count">${summary.same}</span></span>
          <span class="pill pill--err">取得失敗 <span class="count">${fetchIssues.length}</span></span>
        </div>

        <div class="info-grid">
          <section class="panel">
            <h3>比較条件</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">無視キー</span><span>${esc(reportMeta.ignoreKeys || '-')}</span></div>
              <div class="detail-row"><span class="detail-key">出力対象</span><span>${esc(reportMeta.exportLabel || '全差分')}</span></div>
              <div class="detail-row"><span class="detail-key">出力内容</span><span>${esc(reportMeta.exportContentLabel || '差分のみ')}</span></div>
              <div class="detail-row"><span class="detail-key">セクション</span><span>${esc(sectionText || '-')}</span></div>
            </div>
            ${warning.threshold ? `<div class="warn">警告しきい値: ${warning.threshold} / 合計 ${warning.total}${warning.exceeded ? ' (超過)' : ''}</div>` : ''}
            ${reportMeta.truncated ? `<div class="warn">※ 出力負荷を抑えるため、先頭 ${reportMeta.renderedRows} 件のみをレポートに含めています（元件数 ${reportMeta.totalRows} 件）。</div>` : ''}
          </section>
          <section class="panel">
            <h3>レビュー補助</h3>
            <div class="detail-list">
              <div class="detail-row"><span class="detail-key">文字差分</span><span>行内ハイライト対応</span></div>
              <div class="detail-row"><span class="detail-key">検索</span><span>パス / 値 / 理由</span></div>
              <div class="detail-row"><span class="detail-key">ナビゲーション</span><span>左ペインからセクション移動</span></div>
              <div class="detail-row"><span class="detail-key">出力</span><span>Patch JSON / コピー</span></div>
            </div>
          </section>
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
          <p class="muted" style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6"><strong>フィールド設定</strong>の差分のみ。ライト表示時は <strong>kintone UI Component（KUC ${KUC_REPORT_VERSION}）</strong> の FieldGroup・TextArea で管理画面に近いフォーム表示にします（先頭で jsDelivr から読み込み）。ダークテーマ・オフライン時は従来のカード表示に切り替わります。左の「同一を隠す」「検索」も連動します。</p>
          <div id="settingsLikeRoot" class="sl-root"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="formPreview" hidden>
        <div class="content" style="padding:0">
          <p style="margin:0;padding:12px 18px 0;font-size:11px;line-height:1.6;color:var(--muted)"><strong>フィールド設定</strong>の比較元／比較先を、kintoneのフォーム設定画面に近いレイアウトで並べて表示します。左の「同一を隠す」「検索」が連動します。</p>
          <div id="formPreviewRoot" class="fp-root"></div>
        </div>
      </section>

      <section class="tab-pane" data-report-pane="compare" hidden>
        ${compareHtml || '<div class="content"><div class="no-diff">比較対象設定の出力はありません。</div></div>'}
      </section>
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

export function renderDiffSelectionState() {
  if (!ui.diffSelectionState) return;
  const total = (state.lastDiffRows || []).length;
  const selected = getSelectedDiffRows().length;
  const rendered = getRenderedDiffRows().length;
  const issues = (state.lastFetchIssues || []).length;
  const normalization = getActiveDiffNormalizationLabels();
  const exportModeLabelMap = {
    all: '全件（比較結果）',
    selected: '選択済み行のみ',
    visible: '現在表示中のみ',
    favorites: 'お気に入り行のみ'
  };
  if (!total && !issues && !state.lastDiffAt) {
    ui.diffSelectionState.textContent = '差分未実行';
    return;
  }
  ui.diffSelectionState.textContent =
    `選択 ${selected}/${total}件 / 表示中 ${rendered}件 / API取得失敗 ${issues}件 / 出力対象 ${exportModeLabelMap[resolveDiffExportMode()] || '全件（比較結果）'} / 出力内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} / 正規化 ${normalization.join(', ') || '-'}`;
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

function formatDiffPathRich(path) {
  const p = String(path || '-');
  if (p === '-') return esc(p);
  const parts = p.split('.').filter(Boolean);
  if (parts.length <= 2) {
    return `<span class="diff-path-line">${esc(p)}</span>`;
  }
  const head = parts.slice(0, -2).join('.');
  const tail = parts.slice(-2).join('.');
  return `<span class="diff-path-line diff-path-rich" title="${esc(p)}"><span class="diff-path-prefix">${esc(head)}</span><span class="diff-path-sep">…</span><span class="diff-path-tail">${esc(tail)}</span></span>`;
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

function buildDiffSectionNavHtml(rows) {
  const cur = ui.diffFilterSection?.value || state.diffFilterSection || '';
  const baseRows = getFilteredDiffRowsWithoutSectionFilter(rows);
  const grouped = groupDiffRowsBySection(baseRows);
  const sel = state.diffSelectedIds || new Set();
  const selectedInBase = baseRows.filter((r) => sel.has(r._id)).length;
  const total = baseRows.length;
  const pills = [
    `<button type="button" class="diff-sec-pill${!cur ? ' is-active' : ''}" data-diff-sec-nav="" title="全セクション（セクション以外のフィルタはそのまま）">すべて <span class="diff-sec-pill-n">${total}</span>${selectedInBase ? `<span class="diff-sec-pill-sel">選択${selectedInBase}</span>` : ''}</button>`
  ];
  for (const g of grouped) {
    const nSel = g.rows.filter((r) => sel.has(r._id)).length;
    const active = cur === g.key ? ' is-active' : '';
    pills.push(
      `<button type="button" class="diff-sec-pill${active}" data-diff-sec-nav="${esc(g.key)}" title="${esc(g.label)}">${esc(g.label)} <span class="diff-sec-pill-n">${g.rows.length}</span>${nSel ? `<span class="diff-sec-pill-sel">${nSel}</span>` : ''}</button>`
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
    ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア（差分比較）</p><p class="main-result-placeholder-body">ここに出す詳細テーブルは<strong>結果整理</strong>サブタブを開いたときだけ表示します。このサブタブでは比較条件の設定に集中できます。</p></div>`;
    return;
  }
  ui.result.innerHTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">差分 ${n} 行を保持中${m ? `（取得失敗 ${m} 件）` : ''}</p><p class="main-result-placeholder-body">一覧・チェック・出力は<strong>結果整理</strong>サブタブで行ってください。</p></div>`;
}

/** 差分以外のタブへ移したときに、差分テーブルが残り続けないようにする */
export const MAIN_RESULT_IDLE_HTML = `<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア</p><p class="main-result-placeholder-body">このタブの操作結果やログがここに表示されます。</p></div>`;

export function renderResultRows(rows) {
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

  if (state.activeTab === 'diff' && state.activeSubTabs.diff !== 'view') {
    paintDiffOffViewPlaceholder(rows);
    scheduleDiffPopoutSync();
    return;
  }

  const sectionNavHtml = rows.length ? buildDiffSectionNavHtml(rows) : '';

  const summaryHtml = `
      <div class="diff-summary-head" role="region" aria-label="差分サマリー">
        ${buildDiffSummaryBars(summary)}
        <div class="diff-summary">
        <span class="diff-pill">総件数 ${summary.total}</span>
        <span class="diff-pill">追加 ${summary.added}</span>
        <span class="diff-pill">削除 ${summary.removed}</span>
        <span class="diff-pill">変更 ${summary.changed}</span>
        <span class="diff-pill">移動 ${summary.moved}</span>
        ${summary.same ? `<span class="diff-pill">同一 ${summary.same}</span>` : ''}
        <span class="diff-pill">高 ${severitySummary.high}</span>
        <span class="diff-pill">中 ${severitySummary.medium}</span>
        <span class="diff-pill">低 ${severitySummary.low}</span>
        <span class="diff-pill">取得失敗 ${fetchSummary.total}</span>
        <span class="diff-pill">選択 ${selectedRows.length}</span>
        <span class="diff-pill">名称変更候補 ${renameCount}</span>
        <span class="diff-pill">影響情報あり ${impactCount}</span>
        <span class="diff-info">表示 ${renderedRows.length}/${filteredRows.length}/${rows.length}</span>
        ${filteredRows.length !== rows.length ? `<span class="diff-info">絞込重要度 高:${filteredSeverity.high} / 中:${filteredSeverity.medium} / 低:${filteredSeverity.low}</span>` : ''}
        ${rawKeyword ? `<span class="diff-info">検索: ${esc(rawKeyword)}</span>` : ''}
        </div>
        ${sectionNavHtml}
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
    const head = `<div class="diff-sec-head" data-diff-sec-toggle="${esc(g.key)}">
        <span>${collapsed ? '▶' : '▼'} ${esc(g.label)}</span>
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
      return `<tr class="${rowAccent}${selected ? ' diff-row-selected' : ''}">
          <td><input type="checkbox" data-diff-row-id="${esc(r._id)}" ${selected}></td>
          <td><span class="sev-badge ${sevClass}">${esc(getSeverityDisplayLabel(sev))}</span></td>
          <td class="diff-type ${typeClass}">${esc(typeLabel || '-')}</td>
          <td>
            <div class="diff-tools">
              <button type="button" class="diff-mini-btn" data-copy-val="${esc(r.path || '')}">パス</button>
            </div>
            <div class="diff-path diff-path-cell" title="${esc(r.path || '-')}">${formatDiffPathRich(r.path)}</div>
            ${renderDiffRowMeta(r)}
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
          <thead><tr><th style="width:56px">選択</th><th style="width:90px">重要度</th><th style="width:120px">種別</th><th style="width:260px">パス</th><th>比較元</th><th>比較先</th></tr></thead>
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
}
