'use strict';

import { SECTION_DEFS } from '../constants.js';
import { state, ui } from '../state.js';
import {
  esc,
  nowStamp,
  downloadText,
  selectedScopeKeys,
  extractAppNameFromBundle,
  buildAppFilenameLabel
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
import { setStatus } from '../ui/components.js';
import { getToolDocument } from '../ui/dialog.js';

const RESULT_HOST_ID = 'u_reflectPreviewProdDiff';
const PREVIEW_PROD_STATE_KEY = Symbol.for('kus.reflect.previewProdDiff');

function getPreviewProdState() {
  if (!state[PREVIEW_PROD_STATE_KEY]) {
    state[PREVIEW_PROD_STATE_KEY] = {
      lastResult: null,
      appId: '',
      guestId: '',
      runAt: null
    };
  }
  return state[PREVIEW_PROD_STATE_KEY];
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

function formatCounts(summary) {
  return `追加 ${summary.added} / 削除 ${summary.removed} / 変更 ${summary.changed}${summary.moved ? ` / 移動 ${summary.moved}` : ''}`;
}

function formatSectionBreakdown(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = row?.sectionKey || '';
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  if (!counts.size) return '';
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => {
      const label = SECTION_DEFS.find((d) => d.key === key)?.label || key;
      return `<li><span class="sec-name">${esc(label)}</span><span class="sec-count">${n}件</span></li>`;
    })
    .join('');
}

function formatRowsPreview(rows, limit) {
  const shown = rows.slice(0, limit);
  if (!shown.length) return '';
  const items = shown.map((row) => {
    const typeLabel = row.type === 'added' ? '追加' : row.type === 'removed' ? '削除' : row.type === 'changed' ? '変更' : row.type || '';
    const cls = `pvd-type pvd-type--${esc(row.type || '')}`;
    const section = SECTION_DEFS.find((d) => d.key === row.sectionKey)?.label || row.sectionKey || '';
    return `<li><span class="${cls}">${esc(typeLabel)}</span> <span class="pvd-section">${esc(section)}</span> <code class="pvd-path">${esc(row.path || '')}</code></li>`;
  }).join('');
  const more = rows.length > limit ? `<li class="pvd-more">…ほか ${rows.length - limit} 件</li>` : '';
  return `<ul class="pvd-row-list">${items}${more}</ul>`;
}

function renderResult(host, payload) {
  if (!host) return;
  if (!payload) {
    host.innerHTML = '';
    host.style.display = 'none';
    return;
  }
  const { runAt, appId, guestId, scopes, summary, severity, totalActual, fetchIssues, previewBundle, productionBundle } = payload;
  const actualRows = getActualDiffRows(payload.rows || []);
  const sections = formatSectionBreakdown(actualRows);
  const breakdownHtml = sections
    ? `<ul class="pvd-section-list">${sections}</ul>`
    : '<div class="muted" style="margin:6px 0 0">プレビューと本番は一致しています（差分 0件）</div>';
  const issueHtml = fetchIssues && fetchIssues.length
    ? `<div class="pvd-issues">取得失敗 ${fetchIssues.length}件: ${esc(fetchIssues.map((x) => x.section || x.sectionKey).filter(Boolean).join(', '))}</div>`
    : '';
  const previewApp = extractAppNameFromBundle(previewBundle) || '';
  const prodApp = extractAppNameFromBundle(productionBundle) || '';
  const appLabel = previewApp || prodApp ? ` / ${esc(previewApp || prodApp)}` : '';
  const rowsPreview = formatRowsPreview(actualRows, 10);
  const stamp = runAt ? new Date(runAt).toLocaleString() : '';
  host.style.display = 'block';
  host.innerHTML = `
    <div class="pvd-card">
      <div class="pvd-head">
        <div class="pvd-title">プレビュー ⇔ 本番 差分比較</div>
        <div class="pvd-meta">App ${esc(appId)}${guestId ? ` / guest ${esc(guestId)}` : ''}${appLabel}${stamp ? ` ・ ${esc(stamp)}` : ''}</div>
      </div>
      <div class="pvd-summary">
        <span class="pvd-pill pvd-pill--total">差分 ${totalActual}件</span>
        <span class="pvd-pill">${esc(formatCounts(summary))}</span>
        <span class="pvd-pill pvd-pill--sev">重要度 高:${severity.high} / 中:${severity.medium} / 低:${severity.low}</span>
        <span class="pvd-pill pvd-pill--scope">対象 ${scopes.length}セクション</span>
      </div>
      ${issueHtml}
      <div class="pvd-section-head">セクション別の差分件数</div>
      ${breakdownHtml}
      ${rowsPreview ? `<div class="pvd-section-head">差分の先頭 10 件</div>${rowsPreview}` : ''}
      <div class="pvd-actions">
        <button type="button" class="btn sub" data-act="exportPreviewProdDiffJson">JSONで保存</button>
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

  const payload = {
    appId,
    guestId,
    scopes,
    runAt: new Date().toISOString(),
    previewBundle,
    productionBundle,
    rows,
    summary,
    severity,
    totalActual,
    fetchIssues: diffResult.fetchIssues || []
  };
  const bucket = getPreviewProdState();
  bucket.lastResult = payload;
  bucket.appId = appId;
  bucket.guestId = guestId;
  bucket.runAt = payload.runAt;

  renderResult(host, payload);
  const direction = '比較元=プレビュー / 比較先=本番';
  setStatus(`プレビュー⇔本番 差分比較 完了 (${direction}): 差分 ${totalActual}件 / 取得失敗 ${diffResult.fetchIssues?.length || 0}件 / ${formatCounts(summary)} / 高:${severity.high} 中:${severity.medium} 低:${severity.low}`);
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
  const filename = `preview_prod_diff_${appLabel}_${nowStamp()}.json`;
  const body = {
    kind: 'preview-production-diff',
    exportedAt: new Date().toISOString(),
    target: { appId: payload.appId, guestId: payload.guestId },
    scopes: payload.scopes,
    direction: { source: 'preview', target: 'production' },
    summary: payload.summary,
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

export function closePreviewProdDiff() {
  const bucket = getPreviewProdState();
  bucket.lastResult = null;
  const host = getToolDocument().getElementById(RESULT_HOST_ID);
  if (host) {
    host.innerHTML = '';
    host.style.display = 'none';
  }
  setStatus('プレビュー⇔本番 差分の表示を閉じました');
}
