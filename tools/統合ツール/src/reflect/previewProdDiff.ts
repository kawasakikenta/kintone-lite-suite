'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import {
  esc,
  downloadText,
  selectedScopeKeys,
  extractAppNameFromBundle,
  buildAppFilenameLabel,
  buildExportFilename,
  getSeverityDisplayLabel
} from '../utils.js';
import { fetchBundle } from '../api.js';
import {
  computeDiffRows,
  countActualDiffRows,
  summarizeRows,
  getActualDiffRows,
  getDiffNormalizationPresetState
} from '../diff/engine.js';
import { enrichDiffRows, summarizeSeverity } from '../diff/enrich.js';
import { stringifyRowValueForDiff } from '../diff/export.js';
import { setStatus } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';

const RESULT_HOST_ID = 'u_reflectPreviewProdDiff';

function getPreviewProdState() {
  if (!state.reflectPreviewProdDiff) {
    state.reflectPreviewProdDiff = {
      lastResult: null,
      appId: '',
      guestId: '',
      runAt: null,
      filters: {
        section: '',
        type: '',
        severity: '',
        keyword: ''
      }
    };
  }
  return state.reflectPreviewProdDiff;
}

function resolveReflectScopes() {
  const selected = selectedScopeKeys(ui.applyScopes);
  if (selected && selected.length) return selected;
  return SECTION_DEFS.filter((d) => d.put).map((d) => d.key);
}

function ensureResultHost() {
  const doc = getToolDocument();
  let host = doc.getElementById(RESULT_HOST_ID);
  if (host) return host;
  const planPreview = doc.getElementById('u_reflectPlanPreview');
  const overview = doc.getElementById('u_reflectOverview');
  const anchor = planPreview || overview;
  if (!anchor || !anchor.parentNode) return null;
  host = doc.createElement('div');
  host.id = RESULT_HOST_ID;
  host.className = 'reflect-preview-prod-diff';
  host.setAttribute('aria-live', 'polite');
  anchor.parentNode.insertBefore(host, anchor.nextSibling);
  return host;
}

function summarizePreviewProdTypes(rows) {
  const out = { previewOnly: 0, productionOnly: 0, changed: 0, moved: 0 };
  (rows || []).forEach((row) => {
    const kind = getPreviewProdRowKind(row);
    if (kind === 'removed') out.previewOnly += 1;
    else if (kind === 'added') out.productionOnly += 1;
    else if (kind === 'moved') out.moved += 1;
    else if (kind === 'changed') out.changed += 1;
  });
  return out;
}

function formatPreviewProdCounts(typeSummary) {
  return `プレビューのみ ${typeSummary.previewOnly} / 本番のみ ${typeSummary.productionOnly} / 値違い ${typeSummary.changed}${typeSummary.moved ? ` / 移動 ${typeSummary.moved}` : ''}`;
}

function buildSectionBreakdown(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = row?.sectionKey || '';
    if (!key) continue;
    const current = counts.get(key) || { key, total: 0, high: 0, medium: 0, low: 0 };
    current.total += 1;
    const severity = String(row.severity || 'low');
    if (severity === 'high') current.high += 1;
    else if (severity === 'medium') current.medium += 1;
    else current.low += 1;
    counts.set(key, current);
  }
  return [...counts.values()].sort((a, b) => b.total - a.total || getSectionLabel(a.key).localeCompare(getSectionLabel(b.key)));
}

function getSectionLabel(key) {
  return SECTION_DEFS.find((d) => d.key === key)?.label || key || '-';
}

function getPreviewProdTypeInfo(type) {
  if (type === 'removed') {
    return { key: 'previewOnly', label: 'プレビューのみ', note: '本番にまだ無い設定', className: 'preview-only' };
  }
  if (type === 'added') {
    return { key: 'productionOnly', label: '本番のみ', note: 'プレビューには無い設定', className: 'production-only' };
  }
  if (type === 'changed') {
    return { key: 'changed', label: '値違い', note: '同じ項目の値が違う', className: 'changed' };
  }
  if (type === 'moved') {
    return { key: 'moved', label: '移動', note: '並び順の差分', className: 'moved' };
  }
  return { key: String(type || ''), label: String(type || '-'), note: '', className: String(type || '') };
}

function getPreviewProdRowKind(row) {
  if (row?.moved) return 'moved';
  return String(row?.type || '');
}

function formatPreviewValue(value, path) {
  if (value === undefined) return '（なし）';
  const text = stringifyRowValueForDiff(value, path);
  if (text.length <= 4800) return text;
  return `${text.slice(0, 4800)}\n...（長いため一部省略）`;
}

function getFilterState() {
  const bucket = getPreviewProdState();
  if (!bucket.filters || typeof bucket.filters !== 'object') {
    bucket.filters = { section: '', type: '', severity: '', keyword: '' };
  }
  return bucket.filters;
}

function rowMatchesPreviewProdFilters(row, filters) {
  if (filters.section && row.sectionKey !== filters.section) return false;
  if (filters.type && getPreviewProdRowKind(row) !== filters.type) return false;
  if (filters.severity && String(row.severity || 'low') !== filters.severity) return false;
  const keyword = String(filters.keyword || '').trim().toLowerCase();
  if (!keyword) return true;
  const haystack = [
    row.path,
    row.section,
    getSectionLabel(row.sectionKey),
    getPreviewProdTypeInfo(getPreviewProdRowKind(row)).label,
    row.type,
    row.severity,
    row.reasonSummary,
    formatPreviewValue(row.left, row.path),
    formatPreviewValue(row.right, row.path)
  ].join('\n').toLowerCase();
  return haystack.includes(keyword);
}

function getFilteredRows(rows) {
  const filters = getFilterState();
  return (rows || []).filter((row) => rowMatchesPreviewProdFilters(row, filters));
}

function renderMetricCard(label, value, note, className = '') {
  return `<section class="pvd-metric ${className}">
    <div class="pvd-metric-label">${esc(label)}</div>
    <div class="pvd-metric-value">${esc(String(value))}</div>
    ${note ? `<div class="pvd-metric-note">${esc(note)}</div>` : ''}
  </section>`;
}

function renderTypeFilters(typeSummary, activeType) {
  const defs = [
    { key: '', type: '', label: 'すべて', value: typeSummary.previewOnly + typeSummary.productionOnly + typeSummary.changed + typeSummary.moved },
    { key: 'previewOnly', type: 'removed', label: 'プレビューのみ', value: typeSummary.previewOnly },
    { key: 'productionOnly', type: 'added', label: '本番のみ', value: typeSummary.productionOnly },
    { key: 'changed', type: 'changed', label: '値違い', value: typeSummary.changed },
    { key: 'moved', type: 'moved', label: '移動', value: typeSummary.moved }
  ];
  return defs.map((item) => {
    const active = String(activeType || '') === String(item.type || '');
    return `<button type="button" class="pvd-filter-chip${active ? ' is-active' : ''}" data-act="setPreviewProdDiffFilter" data-filter-kind="type" data-filter-value="${esc(item.type)}">
      ${esc(item.label)} <strong>${esc(String(item.value))}</strong>
    </button>`;
  }).join('');
}

function renderSeverityFilters(severity, activeSeverity) {
  const defs = [
    { key: '', label: 'すべて', value: severity.high + severity.medium + severity.low },
    { key: 'high', label: '高', value: severity.high },
    { key: 'medium', label: '中', value: severity.medium },
    { key: 'low', label: '低', value: severity.low }
  ];
  return defs.map((item) => {
    const active = String(activeSeverity || '') === item.key;
    return `<button type="button" class="pvd-filter-chip pvd-filter-chip--sev-${esc(item.key || 'all')}${active ? ' is-active' : ''}" data-act="setPreviewProdDiffFilter" data-filter-kind="severity" data-filter-value="${esc(item.key)}">
      重要度 ${esc(item.label)} <strong>${esc(String(item.value))}</strong>
    </button>`;
  }).join('');
}

function renderSectionCards(sectionBreakdown, activeSection) {
  if (!sectionBreakdown.length) return '';
  return `<div class="pvd-section-cards">
    ${sectionBreakdown.map((item) => {
      const active = activeSection === item.key;
      return `<button type="button" class="pvd-section-card${active ? ' is-active' : ''}" data-act="setPreviewProdDiffFilter" data-filter-kind="section" data-filter-value="${esc(item.key)}">
        <span class="pvd-section-card-name">${esc(getSectionLabel(item.key))}</span>
        <span class="pvd-section-card-count">${esc(String(item.total))}</span>
        <span class="pvd-section-card-sev">高 ${item.high} / 中 ${item.medium} / 低 ${item.low}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function renderActiveFilterSummary(filters, filteredCount, totalCount) {
  const parts = [];
  if (filters.section) parts.push(`セクション: ${getSectionLabel(filters.section)}`);
  if (filters.type) parts.push(`差分: ${getPreviewProdTypeInfo(filters.type).label}`);
  if (filters.severity) parts.push(`重要度: ${getSeverityDisplayLabel(filters.severity)}`);
  if (filters.keyword) parts.push(`検索: ${filters.keyword}`);
  const label = parts.length ? parts.join(' / ') : '絞り込みなし';
  return `<div class="pvd-filter-state">
    <span>${esc(label)}</span>
    <strong>${filteredCount} / ${totalCount} 件表示</strong>
  </div>`;
}

function renderDiffRows(rows) {
  if (!rows.length) {
    return `<div class="pvd-empty">
      <div class="pvd-empty-title">条件に合う差分はありません</div>
      <div class="pvd-empty-text">絞り込みを解除すると他のプレビュー差分を確認できます。</div>
    </div>`;
  }
  const groups = new Map();
  rows.forEach((row) => {
    const key = row.sectionKey || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });
  return [...groups.entries()].map(([sectionKey, sectionRows]) => `
    <section class="pvd-row-section">
      <div class="pvd-row-section-head">
        <span>${esc(getSectionLabel(sectionKey))}</span>
        <strong>${sectionRows.length}件</strong>
      </div>
      <div class="pvd-row-cards">
        ${sectionRows.map((row, idx) => renderDiffRowCard(row, idx)).join('')}
      </div>
    </section>
  `).join('');
}

function renderDiffRowCard(row, idx) {
  const type = getPreviewProdTypeInfo(getPreviewProdRowKind(row));
  const severity = String(row.severity || 'low');
  const previewValue = formatPreviewValue(row.left, row.path);
  const productionValue = formatPreviewValue(row.right, row.path);
  const open = idx < 3 ? ' open' : '';
  return `<details class="pvd-row-card pvd-row-card--${esc(type.className)}"${open}>
    <summary class="pvd-row-summary">
      <span class="pvd-type pvd-type--${esc(type.className)}" title="${esc(type.note)}">${esc(type.label)}</span>
      <span class="pvd-sev pvd-sev--${esc(severity)}">重要度 ${esc(getSeverityDisplayLabel(severity))}</span>
      <code class="pvd-path">${esc(row.path || '')}</code>
    </summary>
    ${row.reasonSummary ? `<div class="pvd-row-reason">${esc(row.reasonSummary)}</div>` : ''}
    <div class="pvd-compare-grid">
      <div class="pvd-compare-col">
        <div class="pvd-compare-head pvd-compare-head--preview">プレビュー</div>
        <pre class="pvd-compare-pre">${esc(previewValue)}</pre>
      </div>
      <div class="pvd-compare-col">
        <div class="pvd-compare-head pvd-compare-head--prod">本番</div>
        <pre class="pvd-compare-pre">${esc(productionValue)}</pre>
      </div>
    </div>
  </details>`;
}

function renderResult(host, payload) {
  if (!host) return;
  if (!payload) {
    host.innerHTML = '';
    host.style.display = 'none';
    return;
  }
  const { runAt, appId, guestId, scopes, severity, totalActual, fetchIssues, previewBundle, productionBundle } = payload;
  const actualRows = getActualDiffRows(payload.rows || []);
  const filters = getFilterState();
  const filteredRows = getFilteredRows(actualRows);
  const sectionBreakdown = buildSectionBreakdown(actualRows);
  const typeSummary = summarizePreviewProdTypes(actualRows);
  const noDiff = totalActual === 0 && (!fetchIssues || !fetchIssues.length);
  const issueHtml = fetchIssues && fetchIssues.length
    ? `<div class="pvd-issues"><strong>取得失敗 ${fetchIssues.length}件</strong><span>${esc(fetchIssues.map((x) => x.section || x.sectionKey).filter(Boolean).join(', '))}</span></div>`
    : '';
  const previewApp = extractAppNameFromBundle(previewBundle) || '';
  const prodApp = extractAppNameFromBundle(productionBundle) || '';
  const appLabel = previewApp || prodApp ? ` / ${esc(previewApp || prodApp)}` : '';
  const stamp = runAt ? new Date(runAt).toLocaleString() : '';
  host.style.display = 'block';
  host.innerHTML = `
    <div class="pvd-card">
      <div class="pvd-head">
        <div>
          <div class="pvd-title">プレビュー ⇔ 本番 差分比較</div>
          <div class="pvd-subtitle">デプロイ待ちの設定差分を、プレビュー側と本番側で並べて確認します。</div>
        </div>
        <div class="pvd-meta">App ${esc(appId)}${guestId ? ` / guest ${esc(guestId)}` : ''}${appLabel}${stamp ? ` ・ ${esc(stamp)}` : ''}</div>
      </div>
      <div class="pvd-metrics">
        ${renderMetricCard('差分', totalActual, 'プレビューと本番の差', 'pvd-metric--total')}
        ${renderMetricCard('プレビューのみ', typeSummary.previewOnly, '本番にまだ無い設定', 'pvd-metric--preview')}
        ${renderMetricCard('本番のみ', typeSummary.productionOnly, 'プレビューには無い設定', 'pvd-metric--prod')}
        ${renderMetricCard('値違い', typeSummary.changed, '同じ項目の変更', 'pvd-metric--changed')}
        ${renderMetricCard('高重要度', severity.high, `中 ${severity.medium} / 低 ${severity.low}`, 'pvd-metric--severity')}
      </div>
      ${issueHtml}
      ${noDiff ? `
        <div class="pvd-empty pvd-empty--clean">
          <div class="pvd-empty-title">プレビューと本番は一致しています</div>
          <div class="pvd-empty-text">反映セクション ${scopes.length} 件の範囲では、デプロイ待ちの差分はありません。</div>
        </div>` : `
        <div class="pvd-section-head">セクション別の差分</div>
        ${renderSectionCards(sectionBreakdown, filters.section)}
        <div class="pvd-filter-panel">
          <div class="pvd-filter-row">${renderTypeFilters(typeSummary, filters.type)}</div>
          <div class="pvd-filter-row">${renderSeverityFilters(severity, filters.severity)}</div>
          <div class="pvd-search-row">
            <input type="text" id="u_previewProdSearch" value="${esc(filters.keyword || '')}" placeholder="パス / 値 / セクションで検索">
            <button type="button" class="btn sub" data-act="applyPreviewProdDiffSearch">検索</button>
            <button type="button" class="btn sub" data-act="clearPreviewProdDiffFilters">絞り込み解除</button>
          </div>
          ${renderActiveFilterSummary(filters, filteredRows.length, actualRows.length)}
        </div>
        <div class="pvd-section-head">差分一覧</div>
        ${renderDiffRows(filteredRows)}
      `}
      <div class="pvd-actions">
        <button type="button" class="btn sub" data-act="exportPreviewProdDiffJson">JSONで保存</button>
        <button type="button" class="btn sub" data-act="exportPreviewProdDiffCsv">CSVで保存</button>
        <button type="button" class="btn sub" data-act="closePreviewProdDiff">閉じる</button>
      </div>
      <p class="pvd-hint muted">デプロイ待ちの変更（＝プレビューにあって本番に無い変更）を一覧できます。反映セクションの選択に合わせて対象を絞り込みます。</p>
    </div>`;
}

export async function runPreviewProductionDiff() {
  const appId = String(ui.targetApp?.value || '').trim();
  if (!appId) {
    setStatus('比較先アプリIDを入力してください', true);
    return;
  }
  const guestId = String(ui.targetGuest?.value || '').trim();
  const scopes = resolveReflectScopes();
  if (!scopes.length) {
    setStatus('反映セクションを 1 つ以上選択してください', true);
    return;
  }

  const host = ensureResultHost();
  const label = `App ${appId}${guestId ? `/guest ${guestId}` : ''}`;
  setStatus(`プレビュー⇔本番 差分比較: ${label} プレビューを取得中...`);
  const previewBundle = await fetchBundle({
    appId,
    guestId,
    preview: true,
    sections: scopes,
    onProgress: (p, l) => setStatus(`プレビュー⇔本番 差分比較: プレビュー取得 ${Math.round(p * 100)}% (${l})`)
  });
  setStatus(`プレビュー⇔本番 差分比較: ${label} 本番を取得中...`);
  const productionBundle = await fetchBundle({
    appId,
    guestId,
    preview: false,
    sections: scopes,
    onProgress: (p, l) => setStatus(`プレビュー⇔本番 差分比較: 本番取得 ${Math.round(p * 100)}% (${l})`)
  });

  setStatus('プレビュー⇔本番 差分比較: 差分計算中...');
  const ignoreKeysText = String(ui.ignoreKeys?.value || '');
  const diffResult = computeDiffRows(previewBundle, productionBundle, scopes, ignoreKeysText, {
    normalizationPresetState: getDiffNormalizationPresetState(),
    includeSame: false
  });
  const rows = enrichDiffRows(diffResult.rows, previewBundle, productionBundle);
  const summary = summarizeRows(rows);
  const severity = summarizeSeverity(rows);
  const totalActual = countActualDiffRows(rows);
  const previewProdSummary = summarizePreviewProdTypes(getActualDiffRows(rows));

  const payload = {
    appId,
    guestId,
    scopes,
    runAt: new Date().toISOString(),
    previewBundle,
    productionBundle,
    rows,
    summary,
    previewProdSummary,
    severity,
    totalActual,
    fetchIssues: diffResult.fetchIssues || []
  };
  const bucket = getPreviewProdState();
  bucket.lastResult = payload;
  bucket.filters = { section: '', type: '', severity: '', keyword: '' };
  bucket.appId = appId;
  bucket.guestId = guestId;
  bucket.runAt = payload.runAt;

  renderResult(host, payload);
  const direction = '比較元=プレビュー / 比較先=本番';
  setStatus(`プレビュー⇔本番 差分比較 完了 (${direction}): 差分 ${totalActual}件 / 取得失敗 ${diffResult.fetchIssues?.length || 0}件 / ${formatPreviewProdCounts(previewProdSummary)} / 高:${severity.high} 中:${severity.medium} 低:${severity.low}`);
}

export function exportPreviewProdDiffJson() {
  const bucket = getPreviewProdState();
  const payload = bucket.lastResult;
  if (!payload) {
    setStatus('先に「プレビュー⇔本番を比較」を実行してください', true);
    return;
  }
  const appName = extractAppNameFromBundle(payload.previewBundle) || extractAppNameFromBundle(payload.productionBundle) || '';
  const appLabel = buildAppFilenameLabel(payload.appId, appName);
  const filename = buildExportFilename('プレビュー本番差分', 'json', { appLabel });
  const body = {
    kind: 'preview-production-diff',
    exportedAt: new Date().toISOString(),
    target: { appId: payload.appId, guestId: payload.guestId },
    scopes: payload.scopes,
    direction: { source: 'preview', target: 'production' },
    summary: payload.summary,
    previewProductionSummary: payload.previewProdSummary,
    severity: payload.severity,
    totalActual: payload.totalActual,
    fetchIssues: payload.fetchIssues,
    rows: payload.rows,
    preview: payload.previewBundle,
    production: payload.productionBundle
  };
  downloadText(filename, JSON.stringify(body, null, 2), 'application/json');
  setStatus(`プレビュー⇔本番 差分をJSONに保存しました: ${filename}`);
}

function csvCell(value: unknown): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** プレビュー⇔本番差分の行配列を CSV テキストへ変換する（純粋関数 / テスト対象）。 */
export function buildPreviewProdDiffCsv(rows: any[]): string {
  const header = ['セクション', '差分種別', '重要度', 'パス', '理由', 'プレビュー値', '本番値'];
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows || []) {
    const type = getPreviewProdTypeInfo(getPreviewProdRowKind(row));
    const severity = String(row?.severity || 'low');
    lines.push([
      getSectionLabel(row?.sectionKey),
      type.label,
      getSeverityDisplayLabel(severity),
      row?.path || '',
      row?.reasonSummary || '',
      formatPreviewValue(row?.left, row?.path),
      formatPreviewValue(row?.right, row?.path)
    ].map(csvCell).join(','));
  }
  return lines.join('\r\n');
}

export function exportPreviewProdDiffCsv() {
  const bucket = getPreviewProdState();
  const payload = bucket.lastResult;
  if (!payload) {
    setStatus('先に「プレビュー⇔本番を比較」を実行してください', true);
    return;
  }
  const rows = getActualDiffRows(payload.rows || []);
  if (!rows.length) {
    setStatus('CSVに保存できる差分がありません', true);
    return;
  }
  const appName = extractAppNameFromBundle(payload.previewBundle) || extractAppNameFromBundle(payload.productionBundle) || '';
  const appLabel = buildAppFilenameLabel(payload.appId, appName);
  const filename = buildExportFilename('プレビュー本番差分', 'csv', { appLabel });
  // Excel で文字化けしないよう UTF-8 BOM を付与する
  const csv = `﻿${buildPreviewProdDiffCsv(rows)}`;
  downloadText(filename, csv, 'text/csv;charset=utf-8');
  setStatus(`プレビュー⇔本番 差分をCSVに保存しました: ${filename}（${rows.length}件）`);
}

function rerenderLastResult() {
  const bucket = getPreviewProdState();
  const host = ensureResultHost();
  if (!bucket.lastResult || !host) return false;
  // 再描画で innerHTML を差し替えると検索ボックスのフォーカス/キャレットが失われるため復元する
  const doc = getToolDocument();
  const active = doc.activeElement as HTMLInputElement | null;
  const searchFocused = !!active && active.id === 'u_previewProdSearch';
  const caret = searchFocused ? active.selectionStart : null;
  renderResult(host, bucket.lastResult);
  if (searchFocused) {
    const next = doc.getElementById('u_previewProdSearch') as HTMLInputElement | null;
    if (next) {
      next.focus();
      const pos = caret == null ? next.value.length : Math.min(caret, next.value.length);
      try { next.setSelectionRange(pos, pos); } catch { /* noop */ }
    }
  }
  return true;
}

export function setPreviewProdDiffFilter(kind, value) {
  const filters = getFilterState();
  const key = String(kind || '');
  if (!['section', 'type', 'severity'].includes(key)) return;
  const nextValue = String(value || '');
  filters[key] = filters[key] === nextValue ? '' : nextValue;
  if (rerenderLastResult()) {
    const label = key === 'section'
      ? (filters[key] ? getSectionLabel(filters[key]) : '解除')
      : (filters[key] || '解除');
    setStatus(`プレビュー⇔本番 差分の絞り込みを更新しました: ${label}`);
  }
}

export function applyPreviewProdDiffSearch() {
  const filters = getFilterState();
  filters.keyword = String((getToolDocument().getElementById('u_previewProdSearch') as HTMLInputElement | null)?.value || '').trim();
  if (rerenderLastResult()) {
    setStatus(filters.keyword ? `プレビュー⇔本番 差分を検索しました: ${filters.keyword}` : 'プレビュー⇔本番 差分の検索を解除しました');
  }
}

export function clearPreviewProdDiffFilters() {
  const bucket = getPreviewProdState();
  bucket.filters = { section: '', type: '', severity: '', keyword: '' };
  if (rerenderLastResult()) {
    setStatus('プレビュー⇔本番 差分の絞り込みを解除しました');
  }
}

export function closePreviewProdDiff() {
  const bucket = getPreviewProdState();
  bucket.lastResult = null;
  bucket.filters = { section: '', type: '', severity: '', keyword: '' };
  const host = getToolDocument().getElementById(RESULT_HOST_ID);
  if (host) {
    host.innerHTML = '';
    host.style.display = 'none';
  }
  setStatus('プレビュー⇔本番 差分の表示を閉じました');
}
