'use strict';

import { SECTION_DEFS, SYSTEM_FIELD_TYPES } from '../constants.js';
import { esc, downloadText, showToast, stableStringify, buildExportFilename } from '../utils.js';
import { FIELD_TYPE_JP, lookupEnum } from '../kintone-enums.js';
import { fetchBundle, ensureBundleShape } from '../api.js';
import { setStatus, setBusy } from '../ui/components.js';
import { commonParams } from './diff.js';
import { getToolDocument } from '../ui/dialog.js';
import {
  buildCombinedFieldImpactIndex,
  collectFieldDefinitions,
  extractFieldPathInfo
} from '../diff/enrich.js';
import { loadExternalLibrary } from '../utils.js';

let cytoscapeDagreRegistered = false;

const NOTIFICATION_CATEGORIES = Object.freeze([
  { key: 'notifications', label: '一般通知', icon: '🔔' },
  { key: 'perRecordNotifications', label: 'レコード条件通知', icon: '📋' },
  { key: 'reminderNotifications', label: 'リマインダー通知', icon: '⏰' }
]);

const FIELD_GRAPH_DETAIL_HINT = '<div style="color:#94a3b8;font-size:12px;padding:12px">ノードをクリックすると詳細を表示</div>';
const ANALYZE_STYLE_ID = 'kusAnalyzeEnhancementStyle';

let _analyzeBundle = null;
let _analyzeBundleSig = '';
let _analyzeTargetBundle = null;
let _analyzeTargetBundleSig = '';
let _analyzeControlsBound = false;
let _layoutDiffToggleTimer = 0;

const _fieldImpactState = {
  sig: '',
  allRows: []
};

const _notificationState = {
  sig: '',
  rows: []
};

const _permissionState = {
  sig: '',
  appRows: [],
  fieldRows: [],
  recordRows: [],
  uniqueEntityCount: 0
};

const _layoutState = {
  sourceSig: '',
  targetSig: '',
  diffMode: false
};

const _graphState = {
  sig: '',
  hideIsolated: false,
  allFields: {},
  incomingMap: new Map(),
  outgoingMap: new Map()
};

function getAnalyzeSourceSignature() {
  const c = commonParams();
  return stableStringify(c.source || ({} as any));
}

function getAnalyzeTargetSignature(sections = []) {
  const c = commonParams();
  return stableStringify({
    target: c.target || ({} as any),
    sections: [...new Set((sections || []).filter(Boolean))].sort()
  });
}

function sectionLabel(key) {
  return SECTION_DEFS.find((s) => s.key === key)?.label || key;
}

function escapeCsvCell(value) {
  const text = String(value == null ? '' : value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filenameBase, header, rows) {
  const lines = [header.map(escapeCsvCell).join(',')];
  (rows || []).forEach((row) => {
    lines.push((row || []).map(escapeCsvCell).join(','));
  });
  downloadText(buildExportFilename(filenameBase, 'csv'), `\uFEFF${lines.join('\n')}`, 'text/csv;charset=utf-8');
}

function normalizeEntityInfo(entity) {
  const type = String(entity?.type || '').trim();
  const code = String(entity?.code || entity?.name || type || '-').trim() || '-';
  const icon = type === 'USER' ? '👤' : type === 'GROUP' ? '👥' : type === 'ORGANIZATION' ? '🏢' : '📌';
  return {
    type,
    code,
    icon,
    label: `${icon} ${code}`,
    key: `${type}:${code}`
  };
}

function renderAnalyzeStatGrid(cards) {
  const items = (cards || []).filter((item) => item && item.label);
  if (!items.length) return '';
  return `<div class="analyze-stat-grid">${items.map((item) => `
    <section class="analyze-stat-card">
      <div class="analyze-stat-label">${esc(item.label)}</div>
      <div class="analyze-stat-value">${esc(String(item.value ?? '-'))}</div>
      ${item.note ? `<div class="analyze-stat-note">${esc(item.note)}</div>` : ''}
    </section>
  `).join('')}</div>`;
}

function renderAnalyzeCallout(message, tone = 'info') {
  if (!message) return '';
  return `<div class="analyze-callout analyze-callout--${esc(tone)}">${esc(message)}</div>`;
}

function buildAnalyzeStaleNotice(storedSig, message) {
  if (!storedSig || storedSig === getAnalyzeSourceSignature()) return '';
  return renderAnalyzeCallout(message || '接続条件が変わっています。再実行すると最新状態に更新されます。', 'warn');
}

function ensureAnalyzeEnhancementStyles() {
  const doc = getToolDocument();
  if (!doc || doc.getElementById(ANALYZE_STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = ANALYZE_STYLE_ID;
  style.textContent = `
#kintone-unified-suite-v2 .analyze-stat-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(148px,1fr));
  gap:10px;
  margin-bottom:12px;
}
#kintone-unified-suite-v2 .analyze-stat-card{
  padding:12px 14px;
  border:1px solid #dbeafe;
  border-radius:12px;
  background:linear-gradient(180deg,#f8fbff,#ffffff);
  box-shadow:0 2px 8px rgba(15,23,42,.04);
}
#kintone-unified-suite-v2 .analyze-stat-label{
  font-size:11px;
  font-weight:800;
  color:#475569;
}
#kintone-unified-suite-v2 .analyze-stat-value{
  margin-top:4px;
  font-size:20px;
  font-weight:900;
  color:#0f172a;
  letter-spacing:0;
}
#kintone-unified-suite-v2 .analyze-stat-note{
  margin-top:4px;
  font-size:11px;
  color:#64748b;
  line-height:1.45;
}
#kintone-unified-suite-v2 .analyze-callout{
  margin-bottom:12px;
  padding:10px 12px;
  border-radius:10px;
  border:1px solid #bfdbfe;
  background:#eff6ff;
  color:#1d4ed8;
  font-size:12px;
  line-height:1.55;
}
#kintone-unified-suite-v2 .analyze-callout--warn{
  border-color:#fdba74;
  background:#fff7ed;
  color:#c2410c;
}
#kintone-unified-suite-v2 .analyze-soft-toolbar{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  align-items:center;
  margin-bottom:12px;
}
#kintone-unified-suite-v2 .analyze-soft-search{
  flex:1;
  min-width:220px;
  border:1px solid #cbd5e1;
  border-radius:8px;
  padding:8px 12px;
  font-size:12px;
}
#kintone-unified-suite-v2 .analyze-inline-detail{
  margin-top:8px;
}
#kintone-unified-suite-v2 .analyze-inline-detail > summary{
  cursor:pointer;
  font-size:11px;
  font-weight:700;
  color:#2563eb;
}
#kintone-unified-suite-v2 .analyze-inline-detail-body{
  margin-top:8px;
  display:flex;
  flex-direction:column;
  gap:6px;
}
#kintone-unified-suite-v2 .analyze-ref-list-item,
#kintone-unified-suite-v2 .field-graph-mini-item{
  padding:8px 10px;
  background:#f8fafc;
  border:1px solid #e2e8f0;
  border-radius:8px;
  font-size:11px;
  line-height:1.5;
}
#kintone-unified-suite-v2 .analyze-ref-kind,
#kintone-unified-suite-v2 .field-graph-mini-kind{
  margin-left:6px;
  font-weight:700;
  color:#334155;
}
#kintone-unified-suite-v2 .analyze-ref-path,
#kintone-unified-suite-v2 .field-graph-mini-path{
  display:block;
  margin-top:4px;
  color:#64748b;
  font-size:10px;
  white-space:pre-wrap;
  word-break:break-all;
}
#kintone-unified-suite-v2 .analyze-code-list{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-top:8px;
}
#kintone-unified-suite-v2 .analyze-code-chip{
  display:inline-flex;
  align-items:center;
  padding:4px 8px;
  border-radius:999px;
  background:#f8fafc;
  border:1px solid #dbeafe;
  color:#1e3a8a;
  font-size:11px;
  font-weight:700;
}
#kintone-unified-suite-v2 .field-graph-mini-list{
  display:flex;
  flex-direction:column;
  gap:8px;
}
@media (max-width:960px){
  #kintone-unified-suite-v2 .field-graph-wrapper{
    grid-template-columns:1fr;
    height:auto;
  }
  #kintone-unified-suite-v2 .field-graph-cy{
    min-height:380px;
  }
}
`;
  doc.head.appendChild(style);
}

function handleAnalyzeInlineError(error, fallbackMessage) {
  console.error(error);
  setBusy(false);
  const message = fallbackMessage || error?.message || String(error);
  setStatus(`エラー: ${message}`, true);
  showToast(`エラー: ${message}`, 'error').catch(() => {});
}

function bindAnalyzeControls() {
  if (_analyzeControlsBound) return;
  const doc = getToolDocument();
  const fieldSearch = doc.getElementById('u_analyzeFieldSearch');
  const fieldFilter = doc.getElementById('u_analyzeFieldFilter');
  const layoutDiff = doc.getElementById('u_analyzeLayoutDiff');

  if (fieldSearch) {
    fieldSearch.addEventListener('input', () => {
      if (_fieldImpactState.allRows.length) renderFieldImpactAnalysisResult();
    });
  }
  if (fieldFilter) {
    fieldFilter.addEventListener('change', () => {
      if (_fieldImpactState.allRows.length) renderFieldImpactAnalysisResult();
    });
  }
  if (layoutDiff) {
    layoutDiff.addEventListener('change', () => {
      if (!_layoutState.sourceSig) return;
      clearTimeout(_layoutDiffToggleTimer);
      _layoutDiffToggleTimer = window.setTimeout(() => {
        runLayoutPreview().catch((error) => handleAnalyzeInlineError(error, 'レイアウト比較の更新に失敗しました'));
      }, 120);
    });
  }

  _analyzeControlsBound = true;
}

async function ensureAnalyzeBundle(options: any = {}) {
  bindAnalyzeControls();
  ensureAnalyzeEnhancementStyles();

  const c = commonParams();
  if (!c.source.appId) throw new Error('対象アプリIDを入力してください');

  const sig = getAnalyzeSourceSignature();
  if (!options.force && _analyzeBundle && _analyzeBundleSig === sig) {
    return _analyzeBundle;
  }

  setBusy(true, '対象アプリの全設定を取得中...');
  const sections = SECTION_DEFS.map((s) => s.key);
  const bundle = await fetchBundle({
    appId: c.source.appId,
    guestId: c.source.guestId,
    preview: !!c.source.preview,
    sections,
    onProgress: (p, l) => setStatus(`取得中 ${Math.round(p * 100)}% (${l})`)
  });
  ensureBundleShape(bundle);
  _analyzeBundle = bundle;
  _analyzeBundleSig = sig;
  return bundle;
}

async function ensureAnalyzeTargetBundle(options: any = {}) {
  bindAnalyzeControls();
  ensureAnalyzeEnhancementStyles();

  const c = commonParams();
  if (!c.target.appId) return null;

  const sections: string[] = [...new Set((options.sections || ['layoutSettings', 'fieldSettings']).filter(Boolean) as string[])];
  const sig = getAnalyzeTargetSignature(sections);
  if (!options.force && _analyzeTargetBundle && _analyzeTargetBundleSig === sig) {
    return _analyzeTargetBundle;
  }

  setBusy(true, '比較先アプリの設定を取得中...');
  const bundle = await fetchBundle({
    appId: c.target.appId,
    guestId: c.target.guestId,
    preview: !!c.target.preview,
    sections,
    onProgress: (p, l) => setStatus(`比較先を取得中 ${Math.round(p * 100)}% (${l})`)
  });
  ensureBundleShape(bundle);
  _analyzeTargetBundle = bundle;
  _analyzeTargetBundleSig = sig;
  return bundle;
}

function countCollection(value, key) {
  const source = key ? value?.[key] : value;
  if (Array.isArray(source)) return source.length;
  if (source && typeof source === 'object' && !source._fetchError) return Object.keys(source).length;
  return 0;
}

function countCustomizeFiles(customizeSettings) {
  if (!customizeSettings || customizeSettings._fetchError) return 0;
  const countBucket = (bucket) => ['js', 'css'].reduce((sum, key) => {
    const list = bucket?.[key];
    return sum + (Array.isArray(list) ? list.length : 0);
  }, 0);
  return countBucket(customizeSettings.desktop || ({} as any)) + countBucket(customizeSettings.mobile || ({} as any));
}

function collectFetchIssues(bundle) {
  return SECTION_DEFS
    .map((section) => {
      const payload = bundle.sections?.[section.key];
      if (!payload?._fetchError) return null;
      return {
        key: section.key,
        label: section.label,
        message: String(payload._fetchError || '')
      };
    })
    .filter(Boolean);
}

function getTopDependencyNodes(graphData, limit = 6) {
  const codes = Object.keys(graphData?.allFields || ({} as any));
  return codes.map((code) => {
    const field = graphData.allFields[code] || ({} as any);
    const incoming = graphData.incomingMap.get(code) || [];
    const outgoing = graphData.outgoingMap.get(code) || [];
    return {
      code,
      label: field.label || '',
      type: field.type || '',
      incoming: incoming.length,
      outgoing: outgoing.length,
      total: incoming.length + outgoing.length
    };
  })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || b.incoming - a.incoming || a.code.localeCompare(b.code))
    .slice(0, limit);
}

function buildAnalyzeDashboardData(bundle) {
  const c = commonParams();
  const fields = collectFieldDefinitions(
    bundle.sections?.fieldSettings?.properties || bundle.sections?.fieldSettings || ({} as any)
  );
  const fieldRows = buildFieldImpactRows(bundle);
  const usedFields = fieldRows.filter((row) => row.refCount > 0);
  // 「未使用候補」はユーザーが操作可能なフィールドだけが対象。
  // RECORD_NUMBER/CREATOR/MODIFIER/CREATED_TIME/UPDATED_TIME/CATEGORY/STATUS 等の
  // ビルトインメタは参照ゼロでも削除/非表示できないため除外する。
  const unusedFields = fieldRows.filter((row) => row.refCount === 0 && !isBuiltinSystemFieldType(row.type));
  const highImpactFields = fieldRows.filter((row) => row.refCount >= 3);
  const notificationRows = buildNotificationRows(bundle);
  const permissionData = buildPermissionMatrixData(bundle);
  const layoutData = bundle.sections?.layoutSettings;
  const layoutSummary = layoutData && !layoutData._fetchError
    ? collectLayoutSummary(layoutData.layout || [], fields)
    : null;
  const graphData = buildFieldGraphData(bundle, { hideIsolated: false });
  const processSettings = bundle.sections?.processSettings || ({} as any);
  const customizeFiles = countCustomizeFiles(bundle.sections?.customizeSettings);
  const fetchIssues = collectFetchIssues(bundle);
  const permissionTotal = permissionData.appRows.length + permissionData.fieldRows.length + permissionData.recordRows.length;
  const appName = String(
    bundle.sections?.appSettings?.name
    || bundle.sections?.appInfo?.name
    || ''
  ).trim();

  return {
    appId: c.source.appId || bundle.appId || '',
    appName,
    guestId: c.source.guestId || bundle.guestId || '',
    preview: !!c.source.preview,
    fetchedAt: bundle.fetchedAt || '',
    fieldRows,
    fieldCount: fieldRows.length,
    usedFields,
    unusedFields,
    highImpactFields,
    notificationRows,
    permissionData,
    permissionTotal,
    layoutSummary,
    graphData,
    viewCount: countCollection(bundle.sections?.viewSettings, 'views'),
    reportCount: countCollection(bundle.sections?.reportSettings, 'reports'),
    processStateCount: countCollection(processSettings, 'states'),
    processActionCount: countCollection(processSettings, 'actions'),
    pluginCount: countCollection(bundle.sections?.pluginSettings, 'plugins'),
    customizeFiles,
    fetchIssues,
    topDependencies: getTopDependencyNodes(graphData),
    topFields: usedFields.slice(0, 8)
  };
}

function getDashboardAttentionItems(data) {
  const items = [];
  if (data.fetchIssues.length) {
    items.push({
      tone: 'danger',
      title: '取得失敗があります',
      value: `${data.fetchIssues.length}件`,
      note: data.fetchIssues.slice(0, 3).map((item) => item.label).join(' / '),
      subtab: 'dashboard'
    });
  }
  if (data.highImpactFields.length) {
    items.push({
      tone: 'warn',
      title: '参照数が多いフィールド',
      value: `${data.highImpactFields.length}件`,
      note: '変更前にビュー・計算式・通知・権限の確認を推奨',
      subtab: 'fieldImpact'
    });
  }
  if (data.unusedFields.length) {
    items.push({
      tone: 'info',
      title: '未使用候補',
      value: `${data.unusedFields.length}件`,
      note: '削除候補ではなく、まず運用上の利用有無を確認',
      subtab: 'fieldImpact',
      filter: 'unused'
    });
  }
  if (data.graphData.edgeCount) {
    items.push({
      tone: 'info',
      title: 'フィールド依存',
      value: `${data.graphData.edgeCount}本`,
      note: '計算式・ルックアップ等のフィールド間関係',
      subtab: 'fieldGraph'
    });
  }
  if (data.permissionData.fieldRows.length || data.permissionData.recordRows.length) {
    items.push({
      tone: 'warn',
      title: '個別権限',
      value: `${data.permissionData.fieldRows.length + data.permissionData.recordRows.length}件`,
      note: 'フィールド/レコード権限は反映前に対象者を確認',
      subtab: 'permissions'
    });
  }
  if (data.notificationRows.length) {
    items.push({
      tone: 'info',
      title: '通知設定',
      value: `${data.notificationRows.length}件`,
      note: '条件・宛先の意図確認に移動できます',
      subtab: 'notifications'
    });
  }
  if (data.layoutSummary?.unplacedCodes?.length) {
    items.push({
      tone: 'warn',
      title: 'レイアウト外フィールド',
      value: `${data.layoutSummary.unplacedCodes.length}件`,
      note: 'フォーム配置されていない項目があります',
      subtab: 'layoutPreview'
    });
  }
  if (data.customizeFiles) {
    items.push({
      tone: 'info',
      title: 'JS/CSSカスタマイズ',
      value: `${data.customizeFiles}件`,
      note: '画面挙動への影響を別途確認',
      subtab: 'dashboard'
    });
  }
  return items;
}

function renderDashboardAttention(items) {
  if (!items.length) {
    return '<div class="analyze-dashboard-empty">大きな確認ポイントは見つかりませんでした。詳細タブで個別確認できます。</div>';
  }
  return `<div class="analyze-dashboard-attention">${items.map((item) => `
    <section class="analyze-dashboard-attention-item analyze-dashboard-attention-item--${esc(item.tone)}">
      <div class="analyze-dashboard-attention-main">
        <div class="analyze-dashboard-attention-title">${esc(item.title)}</div>
        <div class="analyze-dashboard-attention-note">${esc(item.note || '-')}</div>
      </div>
      <div class="analyze-dashboard-attention-side">
        <div class="analyze-dashboard-attention-value">${esc(item.value)}</div>
        ${item.subtab && item.subtab !== 'dashboard'
          ? `<button type="button" class="btn sub" data-act="openAnalyzeSubtab" data-analyze-subtab="${esc(item.subtab)}" data-analyze-filter="${esc(item.filter || '')}">詳細へ</button>`
          : ''}
      </div>
    </section>
  `).join('')}</div>`;
}

function renderDashboardList(rows, options: any = {}) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return `<div class="analyze-dashboard-empty">${esc(options.empty || '該当なし')}</div>`;
  return `<div class="analyze-dashboard-list">${list.slice(0, options.limit || 6).map((row) => `
    <div class="analyze-dashboard-list-row">
      <div class="analyze-dashboard-list-main">
        <div class="analyze-dashboard-list-title">${esc(row.code || row.title || '-')}</div>
        <div class="analyze-dashboard-list-note">${esc(row.label || row.note || row.type || '-')}</div>
      </div>
      <div class="analyze-dashboard-list-metric">${esc(row.metric || row.refCount || row.total || 0)}</div>
    </div>
  `).join('')}</div>`;
}

function renderAnalyzeDashboard(data) {
  const attentionItems = getDashboardAttentionItems(data);
  const riskLevel = attentionItems.filter((item) => item.tone === 'danger' || item.tone === 'warn').length;
  const fetchedAt = data.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : '-';
  const topFields = data.topFields.map((row) => ({
    code: row.code,
    label: row.label || row.type,
    metric: `${row.refCount}参照`
  }));
  const dependencyRows = data.topDependencies.map((row) => ({
    code: row.code,
    label: `${row.label || row.type || '-'} / 入:${row.incoming} 出:${row.outgoing}`,
    metric: row.total
  }));
  const unusedRows = data.unusedFields.slice(0, 6).map((row) => ({
    code: row.code,
    label: row.label || row.type,
    metric: '未使用'
  }));

  return `
    <div class="analyze-dashboard-hero">
      <div class="analyze-dashboard-hero-main">
        <div class="analyze-dashboard-kicker">影響分析ダッシュボード</div>
        <div class="analyze-dashboard-title">${esc(data.appName || `App ${data.appId}`)}</div>
        <div class="analyze-dashboard-meta">
          <span>App ${esc(data.appId || '-')}</span>
          <span>${esc(data.preview ? 'プレビュー' : '本番')}</span>
          <span>${data.guestId ? `Guest ${esc(data.guestId)}` : '通常スペース'}</span>
          <span>${esc(fetchedAt)}</span>
        </div>
      </div>
      <div class="analyze-dashboard-risk">
        <div class="analyze-dashboard-risk-label">要確認</div>
        <div class="analyze-dashboard-risk-value">${riskLevel}</div>
      </div>
    </div>
    ${renderAnalyzeStatGrid([
      { label: '総フィールド', value: data.fieldCount, note: `未使用候補 ${data.unusedFields.length}` },
      { label: '参照あり', value: data.usedFields.length, note: `高参照 ${data.highImpactFields.length}` },
      { label: '依存エッジ', value: data.graphData.edgeCount, note: `孤立 ${data.graphData.isolatedCount}` },
      { label: '通知', value: data.notificationRows.length, note: '一般/条件/リマインダー' },
      { label: '権限設定', value: data.permissionTotal, note: `対象 ${data.permissionData.uniqueEntityCount}` },
      { label: 'レイアウト外', value: data.layoutSummary?.unplacedCodes?.length || 0, note: 'フォーム未配置' }
    ])}
    <section class="analyze-dashboard-section">
      <div class="analyze-dashboard-section-head">
        <div>
          <div class="analyze-dashboard-section-title">確認ポイント</div>
          <div class="analyze-dashboard-section-note">反映や整理の前に見ておきたい領域です。</div>
        </div>
      </div>
      ${renderDashboardAttention(attentionItems)}
    </section>
    <div class="analyze-dashboard-grid">
      <section class="analyze-dashboard-panel">
        <div class="analyze-dashboard-panel-head">
          <div>
            <div class="analyze-dashboard-panel-title">参照数上位フィールド</div>
            <div class="analyze-dashboard-panel-note">変更影響が出やすい順</div>
          </div>
          <button type="button" class="btn sub" data-act="openAnalyzeSubtab" data-analyze-subtab="fieldImpact">開く</button>
        </div>
        ${renderDashboardList(topFields, { empty: '参照ありフィールドなし' })}
      </section>
      <section class="analyze-dashboard-panel">
        <div class="analyze-dashboard-panel-head">
          <div>
            <div class="analyze-dashboard-panel-title">依存が多いフィールド</div>
            <div class="analyze-dashboard-panel-note">入力/出力の関係が多い順</div>
          </div>
          <button type="button" class="btn sub" data-act="openAnalyzeSubtab" data-analyze-subtab="fieldGraph">開く</button>
        </div>
        ${renderDashboardList(dependencyRows, { empty: '依存関係なし' })}
      </section>
      <section class="analyze-dashboard-panel">
        <div class="analyze-dashboard-panel-head">
          <div>
            <div class="analyze-dashboard-panel-title">未使用候補</div>
            <div class="analyze-dashboard-panel-note">参照なしとして検出</div>
          </div>
          <button type="button" class="btn sub" data-act="openAnalyzeSubtab" data-analyze-subtab="fieldImpact" data-analyze-filter="unused">開く</button>
        </div>
        ${renderDashboardList(unusedRows, { empty: '未使用候補なし' })}
      </section>
      <section class="analyze-dashboard-panel">
        <div class="analyze-dashboard-panel-head">
          <div>
            <div class="analyze-dashboard-panel-title">設定ボリューム</div>
            <div class="analyze-dashboard-panel-note">確認範囲の見積もり</div>
          </div>
        </div>
        <div class="analyze-dashboard-mini-metrics">
          <span>ビュー ${esc(data.viewCount)}</span>
          <span>グラフ ${esc(data.reportCount)}</span>
          <span>プロセス ${esc(data.processStateCount)}状態 / ${esc(data.processActionCount)}アクション</span>
          <span>プラグイン ${esc(data.pluginCount)}</span>
          <span>JS/CSS ${esc(data.customizeFiles)}</span>
        </div>
      </section>
    </div>
    ${data.fetchIssues.length ? `
      <section class="analyze-dashboard-section">
        <div class="analyze-dashboard-section-title">取得失敗セクション</div>
        <div class="analyze-dashboard-fetch-issues">
          ${data.fetchIssues.map((issue) => `<div><strong>${esc(issue.label)}</strong><span>${esc(issue.message)}</span></div>`).join('')}
        </div>
      </section>` : ''}`;
}

export async function runAnalyzeDashboard() {
  const bundle = await ensureAnalyzeBundle();
  const el = getToolDocument().getElementById('u_analyzeDashboardResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');
  const data = buildAnalyzeDashboardData(bundle);
  el.innerHTML = `
    ${buildAnalyzeStaleNotice(_analyzeBundleSig, '接続条件が変わっています。再更新すると最新のダッシュボードになります。')}
    ${renderAnalyzeDashboard(data)}
  `;
  setBusy(false);
  setStatus(`影響分析ダッシュボードを更新しました (App ${data.appId})`);
}

/**
 * kintone のビルトイン/システムメタフィールド種別。
 * これらは form-fields API からは返るが利用者が削除・非表示にできないため、
 * 「未使用候補」のような操作可能性を前提とする集計からは除外する。
 */
const BUILTIN_SYSTEM_FIELD_TYPES = new Set([
  'RECORD_NUMBER',
  '__ID__',
  '__REVISION__',
  'CREATOR',
  'MODIFIER',
  'CREATED_TIME',
  'UPDATED_TIME',
  'CATEGORY',
  'STATUS',
  'STATUS_ASSIGNEE'
]);

function isBuiltinSystemFieldType(type: string | undefined | null): boolean {
  return BUILTIN_SYSTEM_FIELD_TYPES.has(String(type || '').toUpperCase());
}

function summarizeSectionRefs(refs) {
  const counts = new Map();
  (refs || []).forEach((ref) => {
    const key = ref.section || sectionLabel(ref.sectionKey || '') || '-';
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([label, count]) => `${label}:${count}`)
    .join(' / ');
}

function buildFieldImpactRows(bundle) {
  const index = buildCombinedFieldImpactIndex(bundle);
  const allFields = collectFieldDefinitions(
    bundle.sections?.fieldSettings?.properties || bundle.sections?.fieldSettings || ({} as any)
  );

  return Object.keys(allFields).map((code) => {
    const field = allFields[code] || ({} as any);
    const refs = (index.get(code) || []).slice().sort((a, b) => {
      const aSec = String(a.section || a.sectionKey || '');
      const bSec = String(b.section || b.sectionKey || '');
      if (aSec !== bSec) return aSec.localeCompare(bSec);
      return String(a.path || '').localeCompare(String(b.path || ''));
    });
    return {
      code,
      label: field.label || field.name || '',
      type: field.type || '',
      refCount: refs.length,
      refs,
      sectionSummary: summarizeSectionRefs(refs)
    };
  }).sort((a, b) => {
    if (b.refCount !== a.refCount) return b.refCount - a.refCount;
    return String(a.code).localeCompare(String(b.code));
  });
}

function getFieldImpactFilterState() {
  const doc = getToolDocument();
  return {
    searchTerm: String((doc.getElementById('u_analyzeFieldSearch') as HTMLInputElement | null)?.value || '').trim().toLowerCase(),
    filterMode: String((doc.getElementById('u_analyzeFieldFilter') as HTMLInputElement | null)?.value || '')
  };
}

function getFilteredFieldImpactRows() {
  const { searchTerm, filterMode } = getFieldImpactFilterState();
  return (_fieldImpactState.allRows || []).filter((row) => {
    // ダッシュボードの「未使用候補」と整合させ、ビルトインメタは「未使用」フィルタから除外。
    if (filterMode === 'unused' && (row.refCount > 0 || isBuiltinSystemFieldType(row.type))) return false;
    if (filterMode === 'used' && row.refCount === 0) return false;
    if (!searchTerm) return true;
    const searchText = [
      row.code,
      row.label,
      row.type,
      row.sectionSummary,
      ...(row.refs || []).map((ref) => `${ref.section || ref.sectionKey || ''} ${ref.kind || ''} ${ref.path || ''}`)
    ].join('\n').toLowerCase();
    return searchText.includes(searchTerm);
  });
}

function renderFieldImpactRefs(refs) {
  if (!refs.length) return '<span style="color:#94a3b8">未使用</span>';
  const chips = refs.slice(0, 5).map((ref) =>
    `<span class="analyze-ref-chip" title="${esc(ref.path)}">${esc(ref.section || sectionLabel(ref.sectionKey || ''))} / ${esc(ref.kind || '-')}</span>`
  ).join('');
  const more = refs.length > 5 ? `<span class="analyze-ref-more">他${refs.length - 5}件</span>` : '';
  const detailRows = refs.map((ref) => `
    <div class="analyze-ref-list-item">
      <span class="analyze-ref-chip">${esc(ref.section || sectionLabel(ref.sectionKey || ''))}</span>
      <span class="analyze-ref-kind">${esc(ref.kind || '-')}</span>
      <code class="analyze-ref-path">${esc(ref.path || '-')}</code>
    </div>
  `).join('');
  return `
    <div>${chips}${more}</div>
    <details class="analyze-inline-detail">
      <summary>参照元を表示 (${refs.length}件)</summary>
      <div class="analyze-inline-detail-body">${detailRows}</div>
    </details>
  `;
}

function renderFieldImpactAnalysisResult() {
  ensureAnalyzeEnhancementStyles();

  const el = getToolDocument().getElementById('u_analyzeFieldImpactResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');

  if (!_fieldImpactState.allRows.length) {
    el.innerHTML = '<div style="color:#64748b;font-size:12px;padding:12px">まだ影響分析を実行していません。</div>';
    return [];
  }

  const rows = getFilteredFieldImpactRows();
  if (!rows.length) {
    el.innerHTML = `
      ${buildAnalyzeStaleNotice(_fieldImpactState.sig, '接続条件が変わっています。必要なら再実行してください。')}
      <div style="color:#64748b;font-size:12px;padding:12px">条件に合うフィールドが見つかりませんでした。</div>`;
    return [];
  }

  const allRows = _fieldImpactState.allRows;
  const usedCount = allRows.filter((row) => row.refCount > 0).length;
  const unusedCount = allRows.length - usedCount;
  const topRefCount = allRows[0]?.refCount || 0;

  const tableRows = rows.map((row) => {
    const rowClass = row.refCount === 0 ? ' class="analyze-row--unused"' : '';
    return `<tr${rowClass}>
      <td class="analyze-td-code">${esc(row.code)}</td>
      <td class="analyze-td">${esc(row.label || '-')}</td>
      <td class="analyze-td"><span class="analyze-type-badge">${esc(row.type || '-')}</span></td>
      <td class="analyze-td-count">${row.refCount}</td>
      <td class="analyze-td">${esc(row.sectionSummary || '-')}</td>
      <td class="analyze-td-refs">${renderFieldImpactRefs(row.refs)}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    ${buildAnalyzeStaleNotice(_fieldImpactState.sig, '接続条件が変わっています。再実行すると最新の参照関係になります。')}
    ${renderAnalyzeStatGrid([
      { label: '総フィールド', value: allRows.length, note: 'サブテーブル内含む' },
      { label: '使用中', value: usedCount, note: '参照あり' },
      { label: '未使用', value: unusedCount, note: '参照なし' },
      { label: '最大参照数', value: topRefCount, note: '最も参照された項目' }
    ])}
    <div class="analyze-summary">表示中: ${rows.length} / 検索条件に一致したフィールドを参照数順で表示しています。</div>
    <div class="analyze-table-wrap">
      <table class="analyze-table">
        <thead><tr>
          <th>コード</th><th>ラベル</th><th>タイプ</th><th>参照数</th><th>主要セクション</th><th>参照元</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>`;

  return rows;
}

export async function runFieldImpactAnalysis() {
  const bundle = await ensureAnalyzeBundle();
  _fieldImpactState.sig = getAnalyzeSourceSignature();
  _fieldImpactState.allRows = buildFieldImpactRows(bundle);
  const rows = renderFieldImpactAnalysisResult();
  setBusy(false);
  setStatus(`フィールド影響分析完了 (${rows.length}件表示 / 全${_fieldImpactState.allRows.length}件)`);
}

export function exportFieldImpactCsv() {
  if (!_fieldImpactState.allRows.length) {
    showToast('先にフィールド影響分析を実行してください', 'warn');
    return;
  }
  const rows = getFilteredFieldImpactRows();
  if (!rows.length) {
    showToast('出力対象のフィールドがありません', 'warn');
    return;
  }
  const csvRows = [];
  rows.forEach((row) => {
    const typeJp = lookupEnum(FIELD_TYPE_JP, row.type) || row.type;
    if (!row.refs.length) {
      csvRows.push([row.code, row.label, typeJp, row.refCount, '', '', '']);
      return;
    }
    row.refs.forEach((ref) => {
      csvRows.push([
        row.code,
        row.label,
        typeJp,
        row.refCount,
        ref.section || sectionLabel(ref.sectionKey || ''),
        ref.kind || '',
        ref.path || ''
      ]);
    });
  });
  downloadCsvFile(
    '影響分析',
    ['フィールドコード', 'ラベル', 'タイプ', '参照数', '参照元セクション', '参照種別', 'パス'],
    csvRows
  );
  setStatus(`フィールド影響分析CSVを出力しました (${rows.length}件)`);
}

function buildPermissionMatrixData(bundle) {
  const uniqueEntities = new Set();
  const appRows = [];
  const fieldRows = [];
  const recordRows = [];

  const appAcl = bundle.sections?.appAcl;
  if (appAcl && !appAcl._fetchError) {
    const rights = appAcl.rights || [];
    rights.forEach((right) => {
      const entity = normalizeEntityInfo(right.entity);
      uniqueEntities.add(entity.key);
      appRows.push({
        entityLabel: entity.label,
        searchText: `${entity.label} ${entity.type} ${entity.code}`.toLowerCase(),
        permissions: {
          appEditable: !!right.appEditable,
          recordViewable: !!right.recordViewable,
          recordAddable: !!right.recordAddable,
          recordEditable: !!right.recordEditable,
          recordDeletable: !!right.recordDeletable,
          recordImportable: !!right.recordImportable,
          recordExportable: !!right.recordExportable
        }
      });
    });
  }

  const fieldAcl = bundle.sections?.fieldAcl;
  if (fieldAcl && !fieldAcl._fetchError) {
    const rights = fieldAcl.rights || [];
    rights.forEach((right) => {
      const entities = (right.entities || []).map((entry) => {
        const entity = normalizeEntityInfo(entry.entity);
        uniqueEntities.add(entity.key);
        const flags = [];
        if (entry.viewable === false) flags.push('閲覧×');
        if (entry.editable === false) flags.push('編集×');
        if (!flags.length) flags.push('制限なし');
        return {
          entityLabel: entity.label,
          accessLabel: flags.join('/'),
          searchText: `${entity.label} ${flags.join(' ')}`.toLowerCase()
        };
      });
      fieldRows.push({
        code: right.code || '-',
        entities,
        searchText: `${right.code || ''} ${entities.map((entity) => entity.searchText).join(' ')}`.toLowerCase()
      });
    });
  }

  const recordPermissions = bundle.sections?.recordPermissions;
  if (recordPermissions && !recordPermissions._fetchError) {
    const rights = recordPermissions.rights || [];
    rights.forEach((right) => {
      const entities = (right.entities || []).map((entry) => {
        const entity = normalizeEntityInfo(entry.entity);
        uniqueEntities.add(entity.key);
        const ops = [];
        if (entry.viewable !== undefined) ops.push(entry.viewable ? '閲覧✅' : '閲覧❌');
        if (entry.editable !== undefined) ops.push(entry.editable ? '編集✅' : '編集❌');
        if (entry.deletable !== undefined) ops.push(entry.deletable ? '削除✅' : '削除❌');
        return {
          entityLabel: entity.label,
          accessLabel: ops.join('/'),
          searchText: `${entity.label} ${ops.join(' ')}`.toLowerCase()
        };
      });
      const condition = String(right.filterCond || '-');
      recordRows.push({
        condition,
        entities,
        searchText: `${condition} ${entities.map((entity) => entity.searchText).join(' ')}`.toLowerCase()
      });
    });
  }

  return {
    appRows,
    fieldRows,
    recordRows,
    uniqueEntityCount: uniqueEntities.size
  };
}

function getPermissionSearchTerm() {
  return String((getToolDocument().getElementById('u_analyzePermissionSearchLocal') as HTMLInputElement | null)?.value || '').trim().toLowerCase();
}

function getFilteredPermissionData() {
  const keyword = getPermissionSearchTerm();
  if (!keyword) {
    return {
      appRows: _permissionState.appRows,
      fieldRows: _permissionState.fieldRows,
      recordRows: _permissionState.recordRows
    };
  }
  return {
    appRows: _permissionState.appRows.filter((row) => row.searchText.includes(keyword)),
    fieldRows: _permissionState.fieldRows.filter((row) => row.searchText.includes(keyword)),
    recordRows: _permissionState.recordRows.filter((row) => row.searchText.includes(keyword))
  };
}

function exportPermissionMatrixCsv() {
  if (!_permissionState.sig) {
    showToast('先に権限情報を表示してください', 'warn');
    return;
  }
  const filtered = getFilteredPermissionData();
  const rows = [];
  filtered.appRows.forEach((row) => {
    rows.push([
      'アプリ権限',
      row.entityLabel,
      '',
      row.permissions.appEditable ? 'ON' : 'OFF',
      row.permissions.recordViewable ? 'ON' : 'OFF',
      row.permissions.recordAddable ? 'ON' : 'OFF',
      row.permissions.recordEditable ? 'ON' : 'OFF',
      row.permissions.recordDeletable ? 'ON' : 'OFF',
      row.permissions.recordImportable ? 'ON' : 'OFF',
      row.permissions.recordExportable ? 'ON' : 'OFF'
    ]);
  });
  filtered.fieldRows.forEach((row) => {
    row.entities.forEach((entity) => {
      rows.push(['フィールド権限', entity.entityLabel, row.code, '', '', '', '', '', '', entity.accessLabel]);
    });
    if (!row.entities.length) rows.push(['フィールド権限', '', row.code, '', '', '', '', '', '', '制限なし']);
  });
  filtered.recordRows.forEach((row) => {
    row.entities.forEach((entity) => {
      rows.push(['レコード権限', entity.entityLabel, row.condition, '', '', '', '', '', '', entity.accessLabel]);
    });
    if (!row.entities.length) rows.push(['レコード権限', '', row.condition, '', '', '', '', '', '', '制限なし']);
  });

  if (!rows.length) {
    showToast('出力対象の権限情報がありません', 'warn');
    return;
  }
  downloadCsvFile(
    '権限マトリクス',
    ['カテゴリ', 'エンティティ', '対象/条件', '管理', '閲覧', '追加', '編集', '削除', '読込/書出', '備考'],
    rows
  );
  setStatus('権限マトリクスCSVを出力しました');
}

function ensurePermissionScaffold(el) {
  const doc = getToolDocument();
  if (doc.getElementById('u_analyzePermissionBody')) return;
  el.innerHTML = `
    <div class="analyze-soft-toolbar">
      <input type="text" id="u_analyzePermissionSearchLocal" class="analyze-soft-search" placeholder="エンティティ / フィールド / 条件で検索">
      <button type="button" class="btn sub" id="u_analyzePermissionCsvLocal">CSV出力</button>
    </div>
    <div id="u_analyzePermissionBody"></div>`;
  doc.getElementById('u_analyzePermissionSearchLocal')?.addEventListener('input', renderPermissionMatrixResult);
  doc.getElementById('u_analyzePermissionCsvLocal')?.addEventListener('click', exportPermissionMatrixCsv);
}

function renderPermissionMatrixResult() {
  ensureAnalyzeEnhancementStyles();

  const el = getToolDocument().getElementById('u_analyzePermissionResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');

  if (!_permissionState.sig) {
    el.innerHTML = '<div style="color:#94a3b8;padding:12px">まだ権限情報を取得していません。</div>';
    return;
  }

  ensurePermissionScaffold(el);

  const body = getToolDocument().getElementById('u_analyzePermissionBody');
  if (!body) return;

  const filtered = getFilteredPermissionData();
  const total = _permissionState.appRows.length + _permissionState.fieldRows.length + _permissionState.recordRows.length;
  const visible = filtered.appRows.length + filtered.fieldRows.length + filtered.recordRows.length;

  const appRowsHtml = filtered.appRows.map((row) => {
    const ops = [
      row.permissions.appEditable,
      row.permissions.recordViewable,
      row.permissions.recordAddable,
      row.permissions.recordEditable,
      row.permissions.recordDeletable,
      row.permissions.recordImportable,
      row.permissions.recordExportable
    ];
    return `<tr>
      <td class="perm-entity">${esc(row.entityLabel)}</td>
      ${ops.map((value) => `<td class="perm-cell ${value ? 'perm-cell--allow' : 'perm-cell--deny'}">${value ? '✅' : '❌'}</td>`).join('')}
    </tr>`;
  }).join('');

  const fieldRowsHtml = filtered.fieldRows.map((row) => {
    const entities = row.entities.map((entity) =>
      `<span class="perm-entity-badge">${esc(entity.entityLabel)}: ${esc(entity.accessLabel)}</span>`
    ).join(' ');
    return `<tr><td class="analyze-td-code">${esc(row.code)}</td><td class="analyze-td-refs">${entities || '<span style="color:#94a3b8">-</span>'}</td></tr>`;
  }).join('');

  const recordRowsHtml = filtered.recordRows.map((row) => {
    const entities = row.entities.map((entity) =>
      `<span class="perm-entity-badge">${esc(entity.entityLabel)}: ${esc(entity.accessLabel)}</span>`
    ).join(' ');
    return `<tr><td class="analyze-td" style="max-width:320px;word-break:break-all">${esc(row.condition)}</td><td class="analyze-td-refs">${entities || '<span style="color:#94a3b8">-</span>'}</td></tr>`;
  }).join('');

  body.innerHTML = `
    ${buildAnalyzeStaleNotice(_permissionState.sig, '接続条件が変わっています。再取得すると権限情報を最新化できます。')}
    ${renderAnalyzeStatGrid([
      { label: '表示中', value: visible, note: `全 ${total} 件` },
      { label: 'アプリ権限', value: filtered.appRows.length, note: `全 ${_permissionState.appRows.length} 件` },
      { label: 'フィールド権限', value: filtered.fieldRows.length, note: `全 ${_permissionState.fieldRows.length} 件` },
      { label: '対象エンティティ', value: _permissionState.uniqueEntityCount, note: 'ユーザー/組織/グループ' }
    ])}
    <div class="analyze-summary">表示中: ${visible} / 検索条件に一致した権限設定のみを表示しています。</div>
    <div class="perm-section">
      <div class="perm-section-title">📋 アプリ権限 (${filtered.appRows.length}件)</div>
      <div class="analyze-table-wrap"><table class="analyze-table perm-table">
        <thead><tr><th>エンティティ</th><th class="perm-th">管理</th><th class="perm-th">閲覧</th><th class="perm-th">追加</th><th class="perm-th">編集</th><th class="perm-th">削除</th><th class="perm-th">ﾃﾞｰﾀ読込</th><th class="perm-th">ﾃﾞｰﾀ書出</th></tr></thead>
        <tbody>${appRowsHtml || '<tr><td colspan="8" style="color:#94a3b8">該当なし</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="perm-section">
      <div class="perm-section-title">🔒 フィールド権限 (${filtered.fieldRows.length}件)</div>
      <div class="analyze-table-wrap"><table class="analyze-table">
        <thead><tr><th>フィールド</th><th>エンティティ別アクセス</th></tr></thead>
        <tbody>${fieldRowsHtml || '<tr><td colspan="2" style="color:#94a3b8">該当なし</td></tr>'}</tbody>
      </table></div>
    </div>
    <div class="perm-section">
      <div class="perm-section-title">📝 レコード権限 (${filtered.recordRows.length}件)</div>
      <div class="analyze-table-wrap"><table class="analyze-table">
        <thead><tr><th>条件式</th><th>エンティティ別アクセス</th></tr></thead>
        <tbody>${recordRowsHtml || '<tr><td colspan="2" style="color:#94a3b8">該当なし</td></tr>'}</tbody>
      </table></div>
    </div>`;
}

export async function runPermissionMatrix() {
  const bundle = await ensureAnalyzeBundle();
  const data = buildPermissionMatrixData(bundle);
  _permissionState.sig = getAnalyzeSourceSignature();
  _permissionState.appRows = data.appRows;
  _permissionState.fieldRows = data.fieldRows;
  _permissionState.recordRows = data.recordRows;
  _permissionState.uniqueEntityCount = data.uniqueEntityCount;
  renderPermissionMatrixResult();
  setBusy(false);
  setStatus(`権限マトリクスの表示完了 (${data.appRows.length + data.fieldRows.length + data.recordRows.length}件)`);
}

function buildNotificationRows(bundle) {
  const rows = [];
  NOTIFICATION_CATEGORIES.forEach((category) => {
    const section = bundle.sections?.[category.key];
    if (!section || section._fetchError) return;
    const notifications = section.notifications || [];
    notifications.forEach((notification) => {
      const condition = String(notification.filterCond || notification.condition || '-');
      const targets = (notification.targets || notification.entities || []).map((target) => {
        const entity = normalizeEntityInfo(target.entity || target);
        return entity.label;
      });
      rows.push({
        category,
        title: String(notification.title || ''),
        condition,
        targets,
        searchText: `${category.label} ${notification.title || ''} ${condition} ${targets.join(' ')}`.toLowerCase()
      });
    });
  });
  return rows;
}

function getNotificationSearchTerm() {
  return String((getToolDocument().getElementById('u_analyzeNotificationSearchLocal') as HTMLInputElement | null)?.value || '').trim().toLowerCase();
}

function getFilteredNotificationRows() {
  const keyword = getNotificationSearchTerm();
  if (!keyword) return _notificationState.rows;
  return _notificationState.rows.filter((row) => row.searchText.includes(keyword));
}

function exportNotificationVisualizerCsv() {
  if (!_notificationState.sig) {
    showToast('先に通知設定を表示してください', 'warn');
    return;
  }
  const rows = getFilteredNotificationRows().map((row) => [
    row.category.label,
    row.title,
    row.condition,
    row.targets.length,
    row.targets.join(' / ')
  ]);
  if (!rows.length) {
    showToast('出力対象の通知設定がありません', 'warn');
    return;
  }
  downloadCsvFile('通知一覧', ['種別', 'タイトル', '条件', '宛先数', '宛先'], rows);
  setStatus('通知設定CSVを出力しました');
}

function ensureNotificationScaffold(el) {
  const doc = getToolDocument();
  if (doc.getElementById('u_analyzeNotificationBody')) return;
  el.innerHTML = `
    <div class="analyze-soft-toolbar">
      <input type="text" id="u_analyzeNotificationSearchLocal" class="analyze-soft-search" placeholder="タイトル / 条件 / 宛先で検索">
      <button type="button" class="btn sub" id="u_analyzeNotificationCsvLocal">CSV出力</button>
    </div>
    <div id="u_analyzeNotificationBody"></div>`;
  doc.getElementById('u_analyzeNotificationSearchLocal')?.addEventListener('input', renderNotificationVisualizerResult);
  doc.getElementById('u_analyzeNotificationCsvLocal')?.addEventListener('click', exportNotificationVisualizerCsv);
}

function renderNotificationVisualizerResult() {
  ensureAnalyzeEnhancementStyles();

  const el = getToolDocument().getElementById('u_analyzeNotificationResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');

  if (!_notificationState.sig) {
    el.innerHTML = '<div style="color:#94a3b8;padding:12px">まだ通知設定を取得していません。</div>';
    return;
  }

  ensureNotificationScaffold(el);

  const body = getToolDocument().getElementById('u_analyzeNotificationBody');
  if (!body) return;

  const rows = getFilteredNotificationRows();
  const uniqueTargets = new Set(rows.flatMap((row) => row.targets));
  const withConditions = rows.filter((row) => row.condition && row.condition !== '-').length;

  const tableRows = rows.map((row) => {
    const targets = row.targets.map((target) =>
      `<span class="notif-target-badge">${esc(target)}</span>`
    ).join(' ') || '<span style="color:#94a3b8">-</span>';
    return `<tr>
      <td class="analyze-td"><span class="notif-category-badge">${row.category.icon} ${esc(row.category.label)}</span></td>
      <td class="analyze-td">${esc(row.title || '-')}</td>
      <td class="analyze-td" style="max-width:300px;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px">${esc(row.condition)}</td>
      <td class="analyze-td-refs">${targets}</td>
    </tr>`;
  }).join('');

  const flowCards = rows.map((row) => `
    <div class="notif-flow-card">
      <div class="notif-flow-category">${row.category.icon} ${esc(row.category.label)}</div>
      ${row.title ? `<div class="notif-flow-title">${esc(row.title)}</div>` : ''}
      <div class="notif-flow-row">
        <div class="notif-flow-cond">${esc(row.condition || '(条件なし)')}</div>
        <div class="notif-flow-arrow">→</div>
        <div class="notif-flow-targets">${esc(row.targets.join(', ') || '-')}</div>
      </div>
    </div>
  `).join('');

  body.innerHTML = `
    ${buildAnalyzeStaleNotice(_notificationState.sig, '接続条件が変わっています。再取得すると通知情報を最新化できます。')}
    ${renderAnalyzeStatGrid([
      { label: '表示中', value: rows.length, note: `全 ${_notificationState.rows.length} 件` },
      { label: '条件あり', value: withConditions, note: 'filterCond / condition' },
      { label: '宛先総数', value: rows.reduce((sum, row) => sum + row.targets.length, 0), note: '通知ごとの宛先合計' },
      { label: '宛先種類', value: uniqueTargets.size, note: '重複除外' }
    ])}
    <div class="analyze-summary">表示中: ${rows.length} / 通知設定をテーブルとフローで確認できます。</div>
    <details class="diff-fold">
      <summary class="diff-fold-summary"><span class="diff-fold-title">テーブルビュー</span></summary>
      <div class="diff-fold-body">
        <div class="analyze-table-wrap"><table class="analyze-table">
          <thead><tr><th>種別</th><th>タイトル</th><th>条件</th><th>宛先</th></tr></thead>
          <tbody>${tableRows || '<tr><td colspan="4" style="color:#94a3b8">該当なし</td></tr>'}</tbody>
        </table></div>
      </div>
    </details>
    <details class="diff-fold">
      <summary class="diff-fold-summary"><span class="diff-fold-title">フロービュー</span></summary>
      <div class="diff-fold-body"><div class="notif-flow-list">${flowCards || '<div style="color:#94a3b8">該当なし</div>'}</div></div>
    </details>`;
}

export async function runNotificationVisualizer() {
  const bundle = await ensureAnalyzeBundle();
  _notificationState.sig = getAnalyzeSourceSignature();
  _notificationState.rows = buildNotificationRows(bundle);

  const el = getToolDocument().getElementById('u_analyzeNotificationResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');

  if (!_notificationState.rows.length) {
    el.innerHTML = '<div style="color:#94a3b8;padding:12px">通知設定がありません。</div>';
    setBusy(false);
    setStatus('通知設定の取得完了（設定なし）');
    return;
  }

  renderNotificationVisualizerResult();
  setBusy(false);
  setStatus(`通知設定の可視化完了 (${_notificationState.rows.length}件)`);
}

function renderLayoutField(item, fieldDefs) {
  const code = item.code || '';
  const type = item.type || '';
  const fieldDef = fieldDefs[code] || ({} as any);
  const label = fieldDef.label || item.label || code;
  const width = item.size?.width ? `width:${item.size.width}` : '';

  if (type === 'LABEL') {
    return `<div class="layout-item layout-label" style="${width}"><span class="layout-label-text">${esc(item.value || label)}</span></div>`;
  }
  if (type === 'SPACER') {
    const elementId = item.elementId ? `id="${esc(item.elementId)}"` : '';
    return `<div class="layout-item layout-spacer" ${elementId} style="${width};min-height:${item.size?.height || '20px'}"></div>`;
  }
  if (type === 'HR') {
    return `<div class="layout-item layout-hr" style="${width}"><hr></div>`;
  }
  if (type === 'REFERENCE_TABLE') {
    return `<div class="layout-item layout-ref-table" style="${width}"><span class="layout-type-badge">関連テーブル</span> ${esc(code)}</div>`;
  }

  const typeBadge = `<span class="layout-type-badge">${esc(fieldDef.type || type || '-')}</span>`;
  const required = fieldDef.required ? '<span class="layout-required">*</span>' : '';
  return `<div class="layout-item layout-field" style="${width}" title="${esc(code)}">
    <div class="layout-field-label">${esc(label)}${required}</div>
    <div class="layout-field-meta">${typeBadge} ${esc(code)}</div>
  </div>`;
}

function renderLayoutRows(rows, fieldDefs) {
  if (!Array.isArray(rows)) return '';
  return rows.map((row) => {
    const type = row.type || 'ROW';
    if (type === 'GROUP') {
      const groupCode = row.code || '';
      const groupLabel = fieldDefs[groupCode]?.label || row.label || groupCode || 'グループ';
      return `<details class="layout-group" open>
        <summary class="layout-group-summary"><span class="layout-type-badge">GROUP</span> ${esc(groupLabel)}</summary>
        <div class="layout-group-body">${renderLayoutRows(row.layout || [], fieldDefs)}</div>
      </details>`;
    }
    if (type === 'SUBTABLE') {
      const tableCode = row.code || '';
      const tableLabel = fieldDefs[tableCode]?.label || row.label || tableCode || 'テーブル';
      const subFields = (row.fields || []).map((field) => renderLayoutField(field, fieldDefs)).join('');
      return `<div class="layout-subtable">
        <div class="layout-subtable-header"><span class="layout-type-badge">SUBTABLE</span> ${esc(tableLabel)}</div>
        <div class="layout-row">${subFields}</div>
      </div>`;
    }
    return `<div class="layout-row">${(row.fields || []).map((field) => renderLayoutField(field, fieldDefs)).join('')}</div>`;
  }).join('');
}

function collectLayoutSummary(layout, fieldDefs) {
  const placedCodes = new Set();
  let rowCount = 0;
  let groupCount = 0;
  let subtableCount = 0;
  let fieldCount = 0;
  let staticCount = 0;

  const markCode = (code) => {
    const safeCode = String(code || '').trim();
    if (!safeCode) return;
    placedCodes.add(safeCode);
  };

  const walkItem = (item) => {
    if (!item || typeof item !== 'object') return;
    if (item.type === 'GROUP' && Array.isArray(item.layout)) {
      groupCount += 1;
      walkRows(item.layout);
      return;
    }
    if (item.type === 'SUBTABLE' && Array.isArray(item.fields)) {
      subtableCount += 1;
      if (item.code) {
        markCode(item.code);
        fieldCount += 1;
      }
      item.fields.forEach((child) => {
        if (child?.code) {
          markCode(child.code);
          fieldCount += 1;
        } else {
          staticCount += 1;
        }
      });
      return;
    }
    if (item.code) {
      markCode(item.code);
      fieldCount += 1;
      return;
    }
    staticCount += 1;
  };

  const walkRows = (rows) => {
    (rows || []).forEach((row) => {
      if (!row || typeof row !== 'object') return;
      rowCount += 1;
      if (row.type === 'GROUP' && Array.isArray(row.layout)) {
        groupCount += 1;
        walkRows(row.layout);
        return;
      }
      (row.fields || []).forEach((item) => walkItem(item));
    });
  };

  walkRows(layout || []);

  const unplacedCodes = Object.keys(fieldDefs || ({} as any)).filter((code) => {
    const type = String(fieldDefs[code]?.type || '');
    if (SYSTEM_FIELD_TYPES.has(type)) return false;
    return !placedCodes.has(code);
  });

  return {
    rowCount,
    groupCount,
    subtableCount,
    fieldCount,
    staticCount,
    placedCodes,
    unplacedCodes
  };
}

function renderLayoutUnplacedFields(title, summary, fieldDefs) {
  if (!summary?.unplacedCodes?.length) return '';
  const labels = summary.unplacedCodes.slice(0, 12).map((code) => {
    const field = fieldDefs[code] || ({} as any);
    const label = field.label || field.name || code;
    return `<span class="analyze-code-chip">${esc(code)} / ${esc(label)}</span>`;
  }).join('');
  const more = summary.unplacedCodes.length > 12
    ? `<div class="analyze-stat-note">ほか ${summary.unplacedCodes.length - 12} 件</div>`
    : '';
  return `
    <details class="diff-fold">
      <summary class="diff-fold-summary"><span class="diff-fold-title">${esc(title)} のレイアウト外フィールド (${summary.unplacedCodes.length}件)</span></summary>
      <div class="diff-fold-body">
        <div class="analyze-code-list">${labels}</div>
        ${more}
      </div>
    </details>`;
}

function setDiffCount(a, b) {
  let count = 0;
  a.forEach((value) => {
    if (b.has(value)) count += 1;
  });
  return count;
}

export async function runLayoutPreview() {
  const bundle = await ensureAnalyzeBundle();
  ensureAnalyzeEnhancementStyles();

  const el = getToolDocument().getElementById('u_analyzeLayoutResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');

  const layoutData = bundle.sections?.layoutSettings;
  if (!layoutData || layoutData._fetchError) {
    el.innerHTML = '<div style="color:#94a3b8;padding:12px">レイアウト設定の取得に失敗しました。</div>';
    setBusy(false);
    setStatus('レイアウト設定の取得に失敗しました', true);
    return;
  }

  const c = commonParams();
  const diffMode = !!(getToolDocument().getElementById('u_analyzeLayoutDiff') as HTMLInputElement | null)?.checked;
  const sourceLayout = layoutData.layout || [];
  const sourceFieldDefs = collectFieldDefinitions(
    bundle.sections?.fieldSettings?.properties || bundle.sections?.fieldSettings || ({} as any)
  );
  const sourceSummary = collectLayoutSummary(sourceLayout, sourceFieldDefs);

  let targetPaneHtml = '';
  let compareHtml = '';
  let targetSummary = null;
  let targetFieldDefs = {};

  if (diffMode) {
    if (!c.target.appId) {
      compareHtml = renderAnalyzeCallout('差分比較モードを使うには比較先アプリIDを入力してください。接続パネルの比較先を設定すると並列比較できます。', 'warn');
    } else {
      try {
        const targetBundle = await ensureAnalyzeTargetBundle({ sections: ['layoutSettings', 'fieldSettings'] });
        const targetLayout = targetBundle?.sections?.layoutSettings?.layout || [];
        targetFieldDefs = collectFieldDefinitions(
          targetBundle?.sections?.fieldSettings?.properties || targetBundle?.sections?.fieldSettings || ({} as any)
        );
        targetSummary = collectLayoutSummary(targetLayout, targetFieldDefs);

        const commonCount = setDiffCount(sourceSummary.placedCodes, targetSummary.placedCodes);
        const sourceOnly = sourceSummary.placedCodes.size - commonCount;
        const targetOnly = targetSummary.placedCodes.size - commonCount;

        compareHtml = renderAnalyzeStatGrid([
          { label: '比較元配置', value: sourceSummary.placedCodes.size, note: `行 ${sourceSummary.rowCount}` },
          { label: '比較先配置', value: targetSummary.placedCodes.size, note: `行 ${targetSummary.rowCount}` },
          { label: '共通配置', value: commonCount, note: '両方にあるコード' },
          { label: '片側のみ', value: `${sourceOnly} / ${targetOnly}`, note: '比較元のみ / 比較先のみ' }
        ]);

        targetPaneHtml = `
          <div class="layout-diff-pane">
            <div class="layout-diff-label">比較先 (App: ${esc(c.target.appId)} / ${esc(c.target.preview ? 'プレビュー' : '本番')})</div>
            <div class="layout-preview-container">${renderLayoutRows(targetLayout, targetFieldDefs)}</div>
            ${renderLayoutUnplacedFields('比較先', targetSummary, targetFieldDefs)}
          </div>`;
      } catch (error) {
        targetPaneHtml = `<div class="layout-diff-pane">${renderAnalyzeCallout(`比較先の取得に失敗しました: ${error.message || String(error)}`, 'warn')}</div>`;
      }
    }
  }

  _layoutState.sourceSig = getAnalyzeSourceSignature();
  _layoutState.targetSig = diffMode ? getAnalyzeTargetSignature(['layoutSettings', 'fieldSettings']) : '';
  _layoutState.diffMode = diffMode;

  el.innerHTML = `
    ${buildAnalyzeStaleNotice(_layoutState.sourceSig, '接続条件が変わっています。必要なら再表示してください。')}
    ${renderAnalyzeStatGrid([
      { label: '行数', value: sourceSummary.rowCount, note: '比較元レイアウト' },
      { label: '配置フィールド', value: sourceSummary.fieldCount, note: '比較元の配置数' },
      { label: 'グループ', value: sourceSummary.groupCount, note: 'GROUP ブロック' },
      { label: 'テーブル', value: sourceSummary.subtableCount, note: 'SUBTABLE ブロック' }
    ])}
    ${compareHtml}
    <div class="layout-diff-container${diffMode && targetPaneHtml ? ' layout-diff-mode' : ''}">
      <div class="layout-diff-pane">
        ${diffMode ? `<div class="layout-diff-label">比較元 (App: ${esc(c.source.appId)} / ${esc(c.source.preview ? 'プレビュー' : '本番')})</div>` : ''}
        <div class="layout-preview-container">${renderLayoutRows(sourceLayout, sourceFieldDefs)}</div>
        ${renderLayoutUnplacedFields('比較元', sourceSummary, sourceFieldDefs)}
      </div>
      ${targetPaneHtml}
    </div>`;

  setBusy(false);
  setStatus(`レイアウトプレビュー表示完了 (比較元 ${sourceSummary.rowCount}行)`);
}

const FIELD_TYPE_COLORS = {
  SINGLE_LINE_TEXT: '#3b82f6',
  MULTI_LINE_TEXT: '#3b82f6',
  RICH_TEXT: '#3b82f6',
  NUMBER: '#f59e0b',
  CALC: '#ea580c',
  CHECK_BOX: '#8b5cf6',
  RADIO_BUTTON: '#8b5cf6',
  DROP_DOWN: '#8b5cf6',
  MULTI_SELECT: '#8b5cf6',
  DATE: '#06b6d4',
  TIME: '#06b6d4',
  DATETIME: '#06b6d4',
  LINK: '#6366f1',
  USER_SELECT: '#ec4899',
  ORGANIZATION_SELECT: '#ec4899',
  GROUP_SELECT: '#ec4899',
  FILE: '#78716c',
  SUBTABLE: '#a855f7',
  REFERENCE_TABLE: '#10b981',
  LOOKUP: '#10b981',
  STATUS: '#64748b',
  STATUS_ASSIGNEE: '#64748b',
  RECORD_NUMBER: '#64748b',
  CREATOR: '#64748b',
  MODIFIER: '#64748b',
  CREATED_TIME: '#64748b',
  UPDATED_TIME: '#64748b',
  CATEGORY: '#64748b'
};

function extractOwningFieldCode(path) {
  const info = extractFieldPathInfo(path);
  if (info?.activeCode) return info.activeCode;
  const match = String(path || '').match(/properties\.([^.[]+)(?:\.fields\.([^.[]+))?/);
  if (!match) return '';
  return match[2] || match[1] || '';
}

function buildFieldGraphData(bundle, options: any = {}) {
  const index = buildCombinedFieldImpactIndex(bundle);
  const allFields = collectFieldDefinitions(
    bundle.sections?.fieldSettings?.properties || bundle.sections?.fieldSettings || ({} as any)
  );
  const incomingMap = new Map();
  const outgoingMap = new Map();
  const edgeSeen = new Set();
  const rawEdges = [];

  const pushRef = (map, key, value) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };

  Object.keys(allFields).forEach((code) => {
    if (!incomingMap.has(code)) incomingMap.set(code, []);
    if (!outgoingMap.has(code)) outgoingMap.set(code, []);
  });

  for (const [targetCode, refs] of index.entries()) {
    if (!allFields[targetCode]) continue;
    refs.forEach((ref) => {
      const sourceCode = extractOwningFieldCode(ref.path);
      if (!sourceCode || sourceCode === targetCode || !allFields[sourceCode]) return;
      const sig = `${sourceCode}->${targetCode}:${ref.kind || ''}:${ref.path || ''}`;
      if (edgeSeen.has(sig)) return;
      edgeSeen.add(sig);
      const edgeInfo = {
        source: sourceCode,
        target: targetCode,
        label: ref.kind || sectionLabel(ref.sectionKey || ''),
        path: ref.path || '',
        section: ref.section || sectionLabel(ref.sectionKey || ''),
        kind: ref.kind || ''
      };
      rawEdges.push(edgeInfo);
      pushRef(outgoingMap, sourceCode, edgeInfo);
      pushRef(incomingMap, targetCode, edgeInfo);
    });
  }

  const connectedCodes = new Set();
  rawEdges.forEach((edge) => {
    connectedCodes.add(edge.source);
    connectedCodes.add(edge.target);
  });

  const allCodes = Object.keys(allFields).sort();
  const nodeCodes = options.hideIsolated
    ? allCodes.filter((code) => connectedCodes.has(code))
    : allCodes;
  const nodeCodeSet = new Set(nodeCodes);

  const elements: Array<{ data: any }> = nodeCodes.map((code) => {
    const field = allFields[code] || ({} as any);
    const fieldType = field.type || '';
    return {
      data: {
        id: code,
        label: field.label ? `${code}\n${field.label}` : code,
        fieldType,
        color: FIELD_TYPE_COLORS[fieldType] || '#94a3b8',
        refCount: (incomingMap.get(code) || []).length,
        outgoingCount: (outgoingMap.get(code) || []).length
      }
    };
  });

  rawEdges.forEach((edge, idx) => {
    if (!nodeCodeSet.has(edge.source) || !nodeCodeSet.has(edge.target)) return;
    elements.push({
      data: {
        id: `e${idx}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        path: edge.path,
        section: edge.section,
        kind: edge.kind
      }
    });
  });

  return {
    elements,
    allFields,
    incomingMap,
    outgoingMap,
    totalNodeCount: allCodes.length,
    isolatedCount: allCodes.length - connectedCodes.size,
    edgeCount: rawEdges.length,
    visibleNodeCount: nodeCodes.length
  };
}

function renderFieldGraphMiniList(items, emptyText, mode) {
  if (!items.length) return `<div style="color:#94a3b8">${esc(emptyText)}</div>`;
  return `<div class="field-graph-mini-list">${items.map((item) => {
    const code = mode === 'incoming' ? item.source : item.target;
    return `<div class="field-graph-mini-item">
      <div><strong>${esc(code)}</strong><span class="field-graph-mini-kind">${esc(item.kind || item.label || '-')}</span></div>
      <code class="field-graph-mini-path">${esc(item.section || '-')} / ${esc(item.path || '-')}</code>
    </div>`;
  }).join('')}</div>`;
}

function renderFieldGraphDetail(detailEl, nodeId, fieldGraphData) {
  if (!detailEl) return;
  if (!nodeId || !fieldGraphData) {
    detailEl.innerHTML = FIELD_GRAPH_DETAIL_HINT;
    return;
  }

  const field = fieldGraphData.allFields[nodeId] || ({} as any);
  const incoming = (fieldGraphData.incomingMap.get(nodeId) || []).slice().sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return String(a.path || '').localeCompare(String(b.path || ''));
  });
  const outgoing = (fieldGraphData.outgoingMap.get(nodeId) || []).slice().sort((a, b) => {
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    return String(a.path || '').localeCompare(String(b.path || ''));
  });

  detailEl.innerHTML = `
    <div class="field-graph-detail-head">
      <div class="field-graph-detail-code">${esc(nodeId)}</div>
      <div class="field-graph-detail-label">${esc(field.label || '-')}</div>
      <span class="layout-type-badge">${esc(formatFieldTypeLabel(field.type))}</span>
    </div>
    ${renderAnalyzeStatGrid([
      { label: '参照される数', value: incoming.length, note: 'この項目を使う側' },
      { label: '参照する数', value: outgoing.length, note: 'この項目が使う側' }
    ])}
    <div class="field-graph-detail-section">
      <div class="field-graph-detail-section-title">参照元 (${incoming.length}件)</div>
      ${renderFieldGraphMiniList(incoming, '参照元なし', 'incoming')}
    </div>
    <div class="field-graph-detail-section" style="margin-top:12px">
      <div class="field-graph-detail-section-title">参照先 (${outgoing.length}件)</div>
      ${renderFieldGraphMiniList(outgoing, '参照先なし', 'outgoing')}
    </div>`;
}


function formatFieldTypeLabel(fieldType) {
  const code = String(fieldType || '').trim();
  if (!code) return '-';
  return FIELD_TYPE_JP[code] || code;
}

function applyFieldGraphSearch(cy, term) {
  const keyword = String(term || '').trim().toLowerCase();
  cy.elements().removeClass('faded');
  cy.nodes().removeClass('search-hit');
  if (!keyword) return;

  const matchedNodes = cy.nodes().filter((node) => {
    const label = String(node.data('label') || '').toLowerCase();
    return node.id().toLowerCase().includes(keyword) || label.includes(keyword);
  });
  const matchedNodeIds = new Set(matchedNodes.map((node) => node.id()));

  const visibleNodeIds = new Set();
  const visibleEdgeIds = new Set();
  matchedNodes.forEach((node) => {
    visibleNodeIds.add(node.id());
    node.connectedEdges().forEach((edge) => {
      visibleEdgeIds.add(edge.id());
      visibleNodeIds.add(edge.source().id());
      visibleNodeIds.add(edge.target().id());
    });
  });

  cy.nodes().forEach((node) => {
    if (matchedNodeIds.has(node.id())) node.addClass('search-hit');
    if (!visibleNodeIds.has(node.id())) node.addClass('faded');
  });
  cy.edges().forEach((edge) => {
    if (!visibleEdgeIds.has(edge.id())) edge.addClass('faded');
  });
}

export async function runFieldDependencyGraph() {
  const bundle = await ensureAnalyzeBundle();
  ensureAnalyzeEnhancementStyles();

  const el = getToolDocument().getElementById('u_analyzeFieldGraphResult');
  if (!el) throw new Error('結果表示エリアが見つかりません');

  const hideIsolated = !!(getToolDocument().getElementById('u_fieldGraphHideIsolated') as HTMLInputElement | null)?.checked;
  const data = buildFieldGraphData(bundle, { hideIsolated });
  _graphState.sig = getAnalyzeSourceSignature();
  _graphState.hideIsolated = hideIsolated;
  _graphState.allFields = data.allFields;
  _graphState.incomingMap = data.incomingMap;
  _graphState.outgoingMap = data.outgoingMap;

  if (!data.edgeCount) {
    el.innerHTML = `
      ${buildAnalyzeStaleNotice(_graphState.sig, '接続条件が変わっています。必要なら再生成してください。')}
      ${renderAnalyzeStatGrid([
        { label: '総フィールド', value: data.totalNodeCount, note: '孤立ノードのみ' },
        { label: '依存エッジ', value: 0, note: '計算式・ルックアップなど' }
      ])}
      <div style="color:#94a3b8;padding:12px">フィールド間の依存関係は見つかりませんでした。全フィールドが独立しています。</div>`;
    setBusy(false);
    setStatus('依存グラフ生成完了（依存関係なし）');
    return;
  }

  el.innerHTML = `
    ${buildAnalyzeStaleNotice(_graphState.sig, '接続条件が変わっています。再生成すると最新の依存グラフになります。')}
    ${renderAnalyzeStatGrid([
      { label: '表示ノード', value: data.visibleNodeCount, note: `総 ${data.totalNodeCount} ノード` },
      { label: '依存エッジ', value: data.edgeCount, note: '抽出できた関係' },
      { label: '孤立ノード', value: data.isolatedCount, note: hideIsolated ? '現在は非表示' : '現在は表示中' }
    ])}
    <div class="field-graph-toolbar">
      <input type="text" id="u_fieldGraphSearch" placeholder="フィールドコード / ラベルで検索..." class="field-graph-search">
      <select id="u_fieldGraphLayout" class="field-graph-layout-select">
        <option value="dagre">Dagre (階層)</option>
        <option value="cose">フォース</option>
        <option value="breadthfirst">ツリー</option>
        <option value="circle">円形</option>
      </select>
      <label class="chip"><input type="checkbox" id="u_fieldGraphHideIsolated" ${hideIsolated ? 'checked' : ''}> 孤立ノードを隠す</label>
      <button type="button" class="btn sub" data-act="fieldGraphRelayout">再レイアウト</button>
      <button type="button" class="btn sub" data-act="fieldGraphExportPng">PNG保存</button>
    </div>
    <div class="field-graph-wrapper">
      <div id="u_fieldGraphCy" class="field-graph-cy"></div>
      <div id="u_fieldGraphDetail" class="field-graph-detail">${FIELD_GRAPH_DETAIL_HINT}</div>
    </div>`;

  try {
    await loadExternalLibrary('cytoscape');
    await loadExternalLibrary('dagre');
    await loadExternalLibrary('cytoscapeDagre');
  } catch (error) {
    el.innerHTML = `<div style="color:#ef4444;padding:12px">Cytoscape ライブラリの読込に失敗しました: ${esc(error.message || String(error))}</div>`;
    setBusy(false);
    setStatus('依存グラフの表示に失敗しました', true);
    return;
  }

  const doc = getToolDocument();
  const container = doc.getElementById('u_fieldGraphCy');
  const detailEl = doc.getElementById('u_fieldGraphDetail');
  if (!container || !detailEl) {
    setBusy(false);
    return;
  }

  // 既存の Cytoscape インスタンスがあれば破棄してメモリ/リスナリークを防ぐ
  const previousCy = (el as any)._cyInstance;
  if (previousCy && typeof previousCy.destroy === 'function') {
    try { previousCy.destroy(); } catch (_) { /* noop */ }
    (el as any)._cyInstance = null;
  }
  // コンテナを空に戻し、前回の listener 登録フラグもリセット
  container.innerHTML = '';

  // スクリプトは loadExternalScript によりメインページの window にロードされるため、
  // ツールがポップアップウィンドウで動作している場合でも window を直接参照する。
  const w = window as any;
  if (!cytoscapeDagreRegistered && w.cytoscapeDagre && w.cytoscape) {
    w.cytoscape.use(w.cytoscapeDagre);
    cytoscapeDagreRegistered = true;
  }

  const cy = w.cytoscape({
    container,
    elements: data.elements,
    style: [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          'font-size': '11px',
          'text-valign': 'center',
          'text-halign': 'center',
          'background-color': 'data(color)',
          'border-width': 1.5,
          'border-color': '#475569',
          color: '#0f172a',
          padding: '8px',
          shape: 'round-rectangle',
          width: 'label',
          height: 'label',
          'text-wrap': 'wrap',
          'text-max-width': '120px'
        }
      },
      {
        selector: 'edge',
        style: {
          width: 2,
          'line-color': '#94a3b8',
          'target-arrow-color': '#64748b',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '9px',
          color: '#64748b',
          'text-background-opacity': 1,
          'text-background-color': '#f8fafc',
          'text-background-padding': '2px'
        }
      },
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 4,
          'border-color': '#2563eb',
          'background-blacken': -0.18
        }
      },
      {
        selector: 'edge.highlighted',
        style: {
          width: 3,
          'line-color': '#2563eb',
          'target-arrow-color': '#2563eb',
          opacity: 1
        }
      },
      {
        selector: 'node.search-hit',
        style: {
          'border-width': 4,
          'border-color': '#f59e0b'
        }
      },
      {
        selector: 'node.faded',
        style: {
          opacity: 0.16,
          'text-opacity': 0.15
        }
      },
      {
        selector: 'edge.faded',
        style: {
          opacity: 0.06,
          'text-opacity': 0
        }
      }
    ],
    layout: { name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 80 }
  });

  (el as any)._cyInstance = cy;

  cy.on('tap', 'node', (event) => {
    const nodeId = event.target.id();
    cy.elements().removeClass('highlighted');
    event.target.addClass('highlighted');
    event.target.connectedEdges().addClass('highlighted');
    event.target.connectedEdges().connectedNodes().addClass('highlighted');
    renderFieldGraphDetail(detailEl, nodeId, data);
  });

  cy.on('tap', (event) => {
    if (event.target !== cy) return;
    cy.elements().removeClass('highlighted');
    renderFieldGraphDetail(detailEl, '', data);
  });

  // 再生成のたびにリスナが多重登録されないよう、ノードを clone で置換してから付け直す
  const searchEl = doc.getElementById('u_fieldGraphSearch') as HTMLInputElement | null;
  if (searchEl && searchEl.parentNode) {
    const fresh = searchEl.cloneNode(true) as HTMLInputElement;
    fresh.value = searchEl.value;
    searchEl.parentNode.replaceChild(fresh, searchEl);
    fresh.addEventListener('input', (event: Event) => {
      applyFieldGraphSearch(cy, (event.target as HTMLInputElement).value);
    });
  }
  const hideEl = doc.getElementById('u_fieldGraphHideIsolated') as HTMLInputElement | null;
  if (hideEl && hideEl.parentNode) {
    const fresh = hideEl.cloneNode(true) as HTMLInputElement;
    fresh.checked = hideEl.checked;
    hideEl.parentNode.replaceChild(fresh, hideEl);
    fresh.addEventListener('change', () => {
      runFieldDependencyGraph().catch((error) => handleAnalyzeInlineError(error, '依存グラフの再生成に失敗しました'));
    });
  }

  setBusy(false);
  setStatus(`依存グラフ生成完了 (ノード: ${data.visibleNodeCount}, エッジ: ${data.edgeCount})`);
}

export function fieldGraphRelayout() {
  const el = getToolDocument().getElementById('u_analyzeFieldGraphResult');
  const cy = (el as any)?._cyInstance;
  if (!cy) {
    showToast('先に依存グラフを生成してください', 'warn');
    return;
  }
  const layoutName = (getToolDocument().getElementById('u_fieldGraphLayout') as HTMLInputElement | null)?.value || 'dagre';
  const options = layoutName === 'dagre'
    ? { name: 'dagre', rankDir: 'LR', nodeSep: 50, rankSep: 80 }
    : { name: layoutName };
  cy.layout(options).run();
}

export function fieldGraphExportPng() {
  const el = getToolDocument().getElementById('u_analyzeFieldGraphResult');
  const cy = (el as any)?._cyInstance;
  if (!cy) {
    showToast('先に依存グラフを生成してください', 'warn');
    return;
  }
  const png = cy.png({ scale: 2, bg: '#f8fafc' });
  const link = getToolDocument().createElement('a');
  link.href = png;
  link.download = buildExportFilename('フィールド依存グラフ', 'png');
  link.click();
  setStatus('PNGを保存しました');
}
