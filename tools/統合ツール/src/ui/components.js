'use strict';

import {
  SECTION_DEFS,
  SETTINGS_EXPORT_SCOPE_DEFS,
  TAB_CONNECTION_NEEDS
} from '../constants.js';
import { state } from '../state.js';
import {
  esc,
  getPreviewStateLabel,
  getDiffTypeDisplayLabel,
  getSeverityDisplayLabel
} from '../utils.js';
import {
  getSelectedDiffRows,
  getRenderedDiffRows,
  resolveDiffExportMode,
  resolveDiffExportContentMode,
  getDiffExportContentLabel,
  buildIgnoreKeySuggestions
} from '../diff/filter.js';
import {
  getActualDiffRows,
  countActualDiffRows,
  summarizeRows,
  getActiveDiffNormalizationLabels
} from '../diff/engine.js';
import { summarizeSeverity } from '../diff/enrich.js';
import { isReflectNodeModeEffective } from '../reflect/nodeModeUi.js';
import { saveCurrentDialogState, getToolDocument } from './dialog.js';
import { renderRichDiff } from '../oss_integrations.js';

let ui = {};

const deps = {
  buildDiffWarningInfo: null,
  renderRowColumns: null,
  stringifyForDiff: null,
  selectedScopeKeys: null,
  reflectRowModeById: null,
  reflectRowDesiredValue: null,
  getActiveReflectRow: null,
  resolveApplyScopes: null,
  commonParams: null,
  currentDiffSignature: null,
  parseLookupMapInput: null,
  makeApplyPlanSignature: null,
  getSelectedReflectRows: null,
  switchTab: null,
  scheduleGuidedTourLayout: null,
  stableStringify: null
};

export function setComponentUi(uiRefs) {
  ui = uiRefs;
}

export function setComponentDeps(overrides) {
  Object.assign(deps, overrides);
}

export function setStatus(msg, isError) {
  if (!ui.status) return;
  ui.status.textContent = msg;
  ui.status.style.background = '';
  ui.status.style.color = '';
  ui.status.classList.remove('status--neutral', 'status--error');
  ui.status.classList.add(isError ? 'status--error' : 'status--neutral');
  const bar = ui.status.closest?.('.status-bar');
  if (bar) bar.classList.toggle('status-bar--error', !!isError);
}

export function setBusy(isBusy, message) {
  const root = ui.status?.closest(`#${CSS.escape?.('kintone-unified-suite-v2') || 'kintone-unified-suite-v2'}`);
  if (message && ui.busyText) ui.busyText.textContent = message;
  if (root) root.classList.toggle('busy', !!isBusy);
}

export function switchSubTab(parentKey, subKey, options = {}) {
  if (!parentKey) return;
  const tabs = ui.subTabs.filter((tab) => tab.dataset.subtabParent === parentKey);
  const panes = ui.subPanes.filter((pane) => pane.dataset.subpaneParent === parentKey);
  if (!tabs.length || !panes.length) return;
  const fallback = state.activeSubTabs[parentKey] || tabs[0]?.dataset.subtab || '';
  const key = tabs.some((tab) => tab.dataset.subtab === subKey) ? subKey : fallback;
  state.activeSubTabs[parentKey] = key;
  if (parentKey === 'reflect' && ui.nodeMode) {
    ui.nodeMode.checked = key === 'node';
  }
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.subtab === key));
  panes.forEach((pane) => pane.classList.toggle('active', pane.dataset.subpane === key));
  if (state.guidedTourActive && deps.scheduleGuidedTourLayout) deps.scheduleGuidedTourLayout();
  if (options.persist !== false) saveCurrentDialogState();
}

export function switchTab(tabKey, options) {
  const key = ui.tabs.some((t) => t.dataset.tab === tabKey) ? tabKey : 'diff';
  state.activeTab = key;
  ui.tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === key));
  ui.panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === key));
  
  const root = getToolDocument().getElementById('kintone-unified-suite-v2');
  if (root) {
    const needs = TAB_CONNECTION_NEEDS[key] || {};
    root.classList.toggle('tab-is-diff-or-reflect', key === 'diff' || key === 'reflect');
    root.classList.toggle('tab-needs-app-inputs', !!(needs.appInputs));
    root.classList.toggle('tab-needs-target', !!(needs.target));
    root.classList.toggle('tab-needs-connection-actions', !!(needs.connectionActions));

    const lead = root.querySelector('#u_connectionLead');
    if (lead) {
      if (!needs.appInputs) {
        lead.textContent = '';
      } else if (needs.target) {
        lead.textContent = '比較元・比較先の数値IDと、ゲストスペース利用時はゲストIDを入力します。';
      } else {
        lead.textContent = '対象アプリの数値IDと、ゲストスペース利用時はゲストIDを入力します。';
      }
    }
  }

  if (state.guidedTourActive && deps.scheduleGuidedTourLayout) deps.scheduleGuidedTourLayout();
  if (!options || options.persist !== false) saveCurrentDialogState();
}

function diffScopeTooltip(s) {
  let t = `API ${s.endpoint} の設定を比較・取得の対象に含めます。`;
  if (!s.put) t += '（PUT 反映 API はありません。差分確認・エクスポート用途向けです。）';
  if (s.key === 'pluginSettings') {
    t += ' 試験的機能: 反映先にプラグインが未インストールだとエラーになることがあります。';
  }
  return t;
}

export function renderScopeChips() {
  ui.diffScopes.innerHTML = SECTION_DEFS.map((s) =>
    `<label class="chip" title="${esc(diffScopeTooltip(s))}"><input type="checkbox" value="${s.key}" ${s.key === 'pluginSettings' ? '' : 'checked'}>${s.label}</label>`
  ).join('');
  ui.applyScopes.innerHTML = SECTION_DEFS.filter((s) => s.put).map((s) =>
    `<label class="chip" title="${esc(diffScopeTooltip(s))}"><input type="checkbox" value="${s.key}" ${s.key === 'pluginSettings' ? '' : 'checked'}>${s.label}</label>`
  ).join('');
  ui.settingsExportScopes.innerHTML = SETTINGS_EXPORT_SCOPE_DEFS.map((s) =>
    `<label class="chip" title="${esc(diffScopeTooltip(s))}"><input type="checkbox" value="${s.key}" checked>${s.label}</label>`
  ).join('');
}

export function setSettingsExportScopeSelection(checked) {
  [...ui.settingsExportScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
    c.checked = !!checked;
  });
  saveCurrentDialogState();
}

export function renderIgnoreKeyChips() {
  const tags = getToolDocument().getElementById('u_ignoreKeysTags');
  if (!tags) return;
  const val = ui.ignoreKeys.value || '';
  const keys = val.split(',').map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    tags.innerHTML = '<span style="color:#94a3b8;font-size:11px;padding:2px 0">追加の無視キーなし（上のデフォルトキーは常に除外）</span>';
    renderDiffSuggestionChips();
    return;
  }
  tags.innerHTML = keys.map((k) =>
    `<span class="chip" style="user-select:none">${esc(k)}<button type="button" style="border:none;background:none;cursor:pointer;padding:0 0 0 4px;font-size:12px;color:#64748b;line-height:1" data-act="removeIgnoreKey" data-key="${esc(k)}">×</button></span>`
  ).join('');
  renderDiffSuggestionChips();
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
  const sections = [...new Set([...(state.lastDiffRows || []).map((r) => r.sectionKey), ...(state.lastFetchIssues || []).map((r) => r.sectionKey)].filter(Boolean))];
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
  if (!total && !issues && !state.lastDiffAt) {
    ui.diffSelectionState.textContent = '差分未実行';
    return;
  }
  ui.diffSelectionState.textContent =
    `選択 ${selected}/${total}件 / 表示中 ${rendered}件 / API取得失敗 ${issues}件 / 出力対象 ${resolveDiffExportMode() === 'all' ? '全差分' : resolveDiffExportMode() === 'selected' ? '選択差分' : resolveDiffExportMode() === 'visible' ? '現在表示中' : '全差分'} / 出力内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} / 正規化 ${normalization.join(', ') || '-'}`;
}

export function renderDiffWarningBox() {
  if (!ui.diffWarnBox) return;
  const warning = deps.buildDiffWarningInfo(state.lastDiffRows, state.lastFetchIssues);
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

export function renderLookupMapRows() {
  const container = getToolDocument().getElementById('u_lookupMapRows');
  if (!container) return;
  let map = {};
  try { map = deps.parseLookupMapInput(ui.lookupMap.value); } catch (e) { map = {}; }
  const entries = Object.entries(map);
  if (entries.length === 0) {
    container.innerHTML = '<div class="muted" style="padding:2px 0">変換ルールなし</div>';
    return;
  }
  container.innerHTML = entries.map(([from, to], i) =>
    `<div class="btns" style="margin-top:4px" data-lookup-row="${i}">` +
    `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換元</span>` +
    `<input type="text" class="lookup-from" value="${esc(from)}" placeholder="変換元 AppID" style="flex:1;min-width:0">` +
    `<span style="align-self:center;padding:0 4px;color:#64748b">→</span>` +
    `<span style="align-self:center;font-size:11px;color:#64748b;white-space:nowrap">変換先</span>` +
    `<input type="text" class="lookup-to" value="${esc(to)}" placeholder="変換先 AppID" style="flex:1;min-width:0">` +
    `<button type="button" class="btn sub" data-act="removeLookupMapRow" data-row="${i}" style="padding:4px 8px">×</button>` +
    `</div>`
  ).join('');
}

export function syncLookupMapFromRows() {
  const container = getToolDocument().getElementById('u_lookupMapRows');
  if (!container) return;
  const rows = container.querySelectorAll('[data-lookup-row]');
  const map = {};
  rows.forEach((row) => {
    const from = (row.querySelector('.lookup-from')?.value || '').trim();
    const to = (row.querySelector('.lookup-to')?.value || '').trim();
    if (from && to) map[from] = to;
  });
  ui.lookupMap.value = Object.keys(map).length ? JSON.stringify(map) : '';
}

function resolveBundleRevision(bundle) {
  const revisions = bundle?.meta?.sectionRevisions || {};
  for (const key of ['appSettings', 'fieldSettings', 'layoutSettings', 'viewSettings', 'processSettings']) {
    const revision = revisions[key];
    if (revision != null && revision !== '') return String(revision);
  }
  const first = Object.values(revisions).find((value) => value != null && value !== '');
  return first != null ? String(first) : '';
}

export function renderBundleState() {
  const fmtFetchTime = (v) => {
    if (!v) return '-';
    try { return new Date(v).toLocaleString(); } catch (e) { return String(v); }
  };
  const describeBundle = (label, bundle, importedName, imported) => {
    if (!bundle) return `${label}: API取得`;
    const previewText = getPreviewStateLabel(bundle.preview);
    const revisionText = resolveBundleRevision(bundle) || '-';
    const guestText = bundle.guestId ? `ゲスト ${bundle.guestId}` : '通常空間';
    if (imported) {
      return `${label}: 読込済み(${importedName || bundle.appId || '-'}) [${previewText} / rev ${revisionText} / ${guestText}]`;
    }
    return `${label}: API取得済み(アプリ ${bundle.appId || '-'} / ${previewText} / rev ${revisionText} / ${guestText} / ${fmtFetchTime(bundle.fetchedAt)})`;
  };
  const sourceText = describeBundle('比較元', state.importedSourceBundle || state.lastSourceBundle, state.importedSourceName, !!state.importedSourceBundle);
  const targetText = describeBundle('比較先', state.importedTargetBundle || state.lastTargetBundle, state.importedTargetName, !!state.importedTargetBundle);
  ui.bundleState.textContent = `${sourceText} / ${targetText}`;
  const rangeMode = isReflectNodeModeEffective()
    ? `選択ノード(${state.reflectSelectedIds.size})`
    : (ui.applyDiffOnly?.checked ? '前回差分セクションのみ' : '選択セクション');
  let readMeta = '';
  try {
    const c = deps.commonParams();
    readMeta = `取得API 比較元:${getPreviewStateLabel(c.source.preview)} · 比較先:${getPreviewStateLabel(c.target.preview)}`;
  } catch (e) {
    readMeta = '取得API 比較元:- · 比較先:-';
  }
  ui.reflectMode.textContent = `${readMeta} · 反映PUT: 比較先プレビュー（常にプレビューAPI） · 範囲: ${rangeMode}`;
  if (ui.commonDataState) {
    const diffSummary = summarizeRows(state.lastDiffRows || []);
    const diffInfo = state.lastDiffAt
      ? `差分: ${fmtFetchTime(state.lastDiffAt)} (差分 ${countActualDiffRows(state.lastDiffRows)}件 / 同一 ${diffSummary.same}件 / 取得失敗 ${state.lastFetchIssues.length}件)`
      : '差分: 未実行';
    ui.commonDataState.textContent = `${sourceText} / ${targetText} / ${diffInfo}`;
  }
  renderDiffSelectionState();
  renderReflectAssistPanel();
}

export function syncReflectSimpleLayout() {
  const layout = getToolDocument().getElementById('u_reflectLayout');
  if (layout && ui.reflectSimpleMode) {
    layout.classList.toggle('reflect-layout--simple', !!ui.reflectSimpleMode.checked);
  }
}

export function renderReflectModeUi() {
  const node = isReflectNodeModeEffective();
  const scopeChecks = [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')];
  scopeChecks.forEach((c) => { c.disabled = node; });
  if (ui.applyDiffOnly) ui.applyDiffOnly.disabled = node;
  ui.nodeWarn.style.display = node ? 'block' : 'none';
  ui.nodeControls.style.display = node ? 'block' : 'none';
  if (ui.reflectNodeWorkbench) ui.reflectNodeWorkbench.style.display = node ? 'flex' : 'none';
  ui.reflectNodeList.style.display = node ? 'block' : 'none';
  if (ui.reflectNodeDetail) ui.reflectNodeDetail.style.display = node ? 'flex' : 'none';
  if (ui.nodeFilterBlock) ui.nodeFilterBlock.style.display = node ? 'block' : 'none';
  if (ui.sectionOptionsBlock) ui.sectionOptionsBlock.style.display = node ? 'none' : 'block';
  if (ui.reflectHint) {
    ui.reflectHint.style.display = node ? 'block' : 'none';
    ui.reflectHint.textContent = node
      ? `ノード反映モード: 差分ノードを選択して部分反映します（選択: ${state.reflectSelectedIds.size}件 / Undo: ${state.reflectUndoStack.length}）`
      : '';
  }
  if (ui.modeSectionBtn && ui.modeNodeBtn) {
    ui.modeSectionBtn.className = node ? 'btn sub reflect-mode-tab' : 'btn ok reflect-mode-tab';
    ui.modeSectionBtn.style.cssText = 'padding:5px 10px;font-size:11px';
    ui.modeNodeBtn.className = node ? 'btn ok reflect-mode-tab' : 'btn sub reflect-mode-tab';
    ui.modeNodeBtn.style.cssText = 'padding:5px 10px;font-size:11px';
    ui.modeSectionBtn.setAttribute('aria-selected', node ? 'false' : 'true');
    ui.modeNodeBtn.setAttribute('aria-selected', node ? 'true' : 'false');
  }
  if (ui.reflectOverview) ui.reflectOverview.style.display = 'block';
  if (ui.reflectAssist) ui.reflectAssist.style.display = 'block';
  if (ui.reflectOptionsCard) ui.reflectOptionsCard.style.display = 'block';
  syncReflectSimpleLayout();
  renderReflectAssistPanel();
  renderReflectSidebar();
  renderReflectNodeDetail();
}

function getEffectiveReflectScopeInfo() {
  const baseScopes = deps.selectedScopeKeys(ui.applyScopes);
  if (isReflectNodeModeEffective()) {
    return { baseScopes, effectiveScopes: [...baseScopes], warning: '' };
  }
  try {
    return {
      baseScopes,
      effectiveScopes: deps.resolveApplyScopes(baseScopes),
      warning: ''
    };
  } catch (e) {
    return {
      baseScopes,
      effectiveScopes: [...baseScopes],
      warning: e.message || String(e)
    };
  }
}

function getCurrentReflectPlanSignature() {
  const c = deps.commonParams();
  if (isReflectNodeModeEffective()) {
    const rows = deps.getSelectedReflectRows();
    if (!rows.length) return '';
    const nodeSigRows = rows
      .map((r) => ({ id: r._id, sectionKey: r.sectionKey, mode: deps.reflectRowModeById(r._id), type: r.type, path: r.path }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    return deps.makeApplyPlanSignature('nodes', {
      targetApp: c.target.appId,
      targetGuest: c.target.guestId,
      sourceApp: c.source.appId,
      sourceGuest: c.source.guestId,
      nodes: nodeSigRows,
      lookupMap: ui.lookupMap.value.trim()
    });
  }
  const scopeInfo = getEffectiveReflectScopeInfo();
  if (!scopeInfo.baseScopes.length || scopeInfo.warning) return '';
  return deps.makeApplyPlanSignature('section', {
    targetApp: c.target.appId,
    targetGuest: c.target.guestId,
    sourceApp: c.source.appId,
    sourceGuest: c.source.guestId,
    scopes: scopeInfo.effectiveScopes,
    lookupMap: ui.lookupMap.value.trim()
  });
}

export function buildReflectAssistHtml() {
  const c = deps.commonParams();
  const isNode = isReflectNodeModeEffective();
  const scopeInfo = getEffectiveReflectScopeInfo();
  const effectiveScopeSet = new Set(scopeInfo.effectiveScopes);
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const actualDiffRows = getActualDiffRows(state.lastDiffRows || []);
  const selectedNodeRows = deps.getSelectedReflectRows();
  const targetRows = isNode
    ? selectedNodeRows
    : actualDiffRows.filter((row) => effectiveScopeSet.has(row.sectionKey));
  const sev = summarizeSeverity(targetRows);
  const planSignature = getCurrentReflectPlanSignature();
  const planReady = !!state.lastApplyPlan && !!planSignature && state.lastApplyPlan.signature === planSignature;
  const planTime = planReady ? new Date(state.lastApplyPlan.createdAt).toLocaleString() : '';
  const backupReady = !!ui.autoBackupPreview?.checked;
  const stopOnError = !!ui.stopOnError?.checked;
  const backupState = ui.backupStatus && ui.backupStatus.style.display !== 'none'
    ? String(ui.backupStatus.textContent || '').trim()
    : '';
  const targetCountLabel = isNode ? '選択ノード' : '実反映セクション';
  const targetCountValue = isNode ? selectedNodeRows.length : scopeInfo.effectiveScopes.length;
  const safetyLabel = (backupReady && stopOnError) ? '推奨設定' : '要確認';
  const warnings = [];
  if (!diffReady) warnings.push('差分比較が未実行、または条件が変わっています。まず差分を確定してください。');
  if (!scopeInfo.baseScopes.length && !isNode) warnings.push('左の一覧から反映セクションを選択してください。');
  if (scopeInfo.warning) warnings.push(scopeInfo.warning);
  if (isNode && !state.reflectRows.length) warnings.push('ノードモードです。まず「差分ノード読込」で候補を表示してください。');
  if (!backupReady) warnings.push('バックアップ自動保存がOFFです。反映前に手動バックアップを推奨します。');

  const steps = [
    {
      no: 'Step 1',
      title: isNode ? '差分と反映ノードを確認' : '差分と反映セクションを確認',
      desc: diffReady
        ? `${countActualDiffRows(state.lastDiffRows)}件の差分を保持中`
        : '差分比較を最新状態にしてください',
      cls: diffReady ? 'done' : 'current'
    },
    {
      no: 'Step 2',
      title: '反映プラン確認',
      desc: planReady
        ? `最新プラン確認済み${planTime ? ` (${planTime})` : ''}`
        : 'APIリクエスト内容を確認して安全性を見ます',
      cls: planReady ? 'done' : (diffReady ? 'current' : '')
    },
    {
      no: 'Step 3',
      title: '比較先プレビューへ反映',
      desc: backupReady
        ? 'バックアップ保存とあわせて実行できます'
        : '反映前にバックアップを取ってから進めてください',
      cls: planReady ? 'current' : ''
    }
  ];

  const primaryDiffAction = diffReady
    ? `<button class="btn sub" data-act="goDiffReview">差分結果を確認</button>`
    : `<button class="btn sub" data-act="runDiff">差分比較を実行</button>`;
  const nodeLoadAction = isNode && !state.reflectRows.length
    ? '<button class="btn sub" data-act="loadReflectNodes">差分ノード読込</button>'
    : '';
  const scopeDiffAction = !isNode && actualDiffRows.length
    ? '<button class="btn sub" data-act="applyScopeDiffOnly">差分のみ選択</button>'
    : '';

  return `<div class="reflect-assist">
    <div class="reflect-guide">
      <div class="reflect-guide-head">
        <div>
          <div class="reflect-guide-title">${isNode ? '細かい差分を選んでプレビューへ反映します' : 'セクション単位で安全にプレビューへ反映します'}</div>
          <div class="reflect-guide-sub">比較先アプリ ${esc(c.target.appId || '-')} / 反映先は常にプレビューです。まず差分を見て、次にプラン確認、その後に反映の順で進めます。</div>
        </div>
        <span class="reflect-guide-badge">${esc(isNode ? 'ノード選択モード' : 'セクションモード')}</span>
      </div>
      <div class="reflect-step-grid">
        ${steps.map((step) => `<div class="reflect-step-card${step.cls ? ` ${step.cls}` : ''}">
          <div class="reflect-step-no">${esc(step.no)}</div>
          <div class="reflect-step-title">${esc(step.title)}</div>
          <div class="reflect-step-desc">${esc(step.desc)}</div>
        </div>`).join('')}
      </div>
    </div>
    <div class="reflect-summary-grid">
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">対象</div>
        <div class="reflect-summary-value">${targetCountValue}</div>
        <div class="reflect-summary-meta">${esc(targetCountLabel)} / ${isNode ? `候補 ${state.reflectRows.length}件` : `選択 ${scopeInfo.baseScopes.length}件`}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">対象差分</div>
        <div class="reflect-summary-value">${targetRows.length}</div>
        <div class="reflect-summary-meta">高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">安全設定</div>
        <div class="reflect-summary-value">${esc(safetyLabel)}</div>
        <div class="reflect-summary-meta">バックアップ ${backupReady ? 'ON' : 'OFF'} / エラー時 ${stopOnError ? '中断' : '継続'} / 本番デプロイは管理画面で手動</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">プラン状態</div>
        <div class="reflect-summary-value">${esc(planReady ? '確認済み' : '未確認')}</div>
        <div class="reflect-summary-meta">${esc(planReady ? `最新確認: ${planTime}` : 'まだ反映プラン確認を実行していません')}</div>
      </div>
    </div>
    <div class="reflect-context-actions">
      ${primaryDiffAction}
      ${nodeLoadAction}
      ${scopeDiffAction}
    </div>
    <p class="reflect-action-hint">プラン確認・バックアップ・プレビュー反映は<strong>画面下の固定バー</strong>から操作します。本番デプロイはツールから実行できません。</p>
    ${warnings.length ? warnings.map((msg) => `<div class="reflect-warning">${esc(msg)}</div>`).join('') : '<div class="reflect-good">現在の条件でそのまま進めます。変更前の確認は「反映プラン確認」で行えます。</div>'}
    ${backupState ? `<div class="reflect-good">${esc(backupState)}</div>` : ''}
  </div>`;
}

export function renderReflectPlanInline() {
  const el = getToolDocument().getElementById('u_reflectPlanInline');
  if (!el) return;
  const planSig = getCurrentReflectPlanSignature();
  const plan = state.lastApplyPlan;
  const hasPlan = !!(plan && Array.isArray(plan.logs) && plan.logs.length);
  const planReady = hasPlan && !!planSig && plan.signature === planSig;
  const stalePlan = hasPlan && (!!planSig ? plan.signature !== planSig : true);

  if (planReady) {
    const stamp = new Date(plan.createdAt).toLocaleString();
    const logs = plan.logs || [];
    const maxLines = 48;
    const head = logs.slice(0, maxLines).join('\n');
    const more = logs.length > maxLines ? `\n… 他 ${logs.length - maxLines} 行（全文は下部の結果エリアを参照）` : '';
    el.innerHTML = `<div class="reflect-plan-inline__head">
      <span class="reflect-plan-inline__title">反映プラン（現在の条件と一致）</span>
      <span class="reflect-plan-inline__meta">予定リクエスト ${plan.totalReq || 0} 件 · ${esc(stamp)}</span>
    </div>
    <pre class="reflect-plan-inline__pre">${esc(head)}${esc(more)}</pre>`;
    return;
  }
  if (stalePlan && hasPlan) {
    el.innerHTML = `<div class="reflect-plan-inline reflect-plan-inline--stale">
      <div class="reflect-plan-inline__head"><span class="reflect-plan-inline__title">プランは現在の条件と一致しません</span></div>
      <p class="reflect-plan-inline__muted">差分・反映セクション・ノード・ルックアップ等が変わった可能性があります。再度「反映プラン確認」を実行してください。</p>
    </div>`;
    return;
  }
  el.innerHTML = `<div class="reflect-plan-inline reflect-plan-inline--empty">
    <div class="reflect-plan-inline__head"><span class="reflect-plan-inline__title">プラン要約</span></div>
    <p class="reflect-plan-inline__muted">「反映プラン確認」を実行すると、ここにログ要約が表示されます。詳細は下部の<strong>結果</strong>エリアにも出力されます。</p>
  </div>`;
}

export function renderReflectFooterBadges() {
  const el = getToolDocument().getElementById('u_reflectFooterBadges');
  if (!el) return;
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const planSig = getCurrentReflectPlanSignature();
  const plan = state.lastApplyPlan;
  const planReady = !!(plan && planSig && plan.signature === planSig);
  el.innerHTML = `
    <span class="reflect-footer-badge${diffReady ? ' reflect-footer-badge--ok' : ' reflect-footer-badge--warn'}">差分 ${diffReady ? '最新' : '要再実行'}</span>
    <span class="reflect-footer-badge${planReady ? ' reflect-footer-badge--ok' : ' reflect-footer-badge--warn'}">プラン ${planReady ? '確認済み' : '未確認'}</span>`;
}

export function renderReflectAssistPanel() {
  if (!ui.reflectAssist) return;
  ui.reflectAssist.innerHTML = buildReflectAssistHtml();
  renderReflectHowto();
  renderReflectPlanInline();
  renderReflectFooterBadges();
}

function renderReflectHowto() {
  if (!ui.reflectHowto) return;
  const isNode = isReflectNodeModeEffective();
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const planSig = getCurrentReflectPlanSignature();
  const planReady = !!(state.lastApplyPlan && planSig && state.lastApplyPlan.signature === planSig);
  const selectedNodes = deps.getSelectedReflectRows().length;
  const nodeRows = (state.reflectRows || []).length;
  const modeLabel = isNode ? 'ノード選択モード' : 'セクションモード';
  const nodeStep = isNode
    ? `<li style="margin:4px 0">${nodeRows > 0 ? '✅' : '⬜'} <strong>差分ノード読込</strong>（候補 ${nodeRows}件 / 選択 ${selectedNodes}件）</li>`
    : '';
  const step1 = diffReady ? '✅' : '⬜';
  const step2 = planReady ? '✅' : '⬜';
  const step3 = planReady ? '▶' : '⬜';
  ui.reflectHowto.innerHTML = `
    <details open style="border:1px solid #dbe3ed;border-radius:10px;background:#fff;padding:8px 10px">
      <summary style="cursor:pointer;font-weight:700;color:#1e293b">使い方ガイド（${esc(modeLabel)}）</summary>
      <div style="margin-top:8px;font-size:12px;color:#334155;line-height:1.7">
        <ol style="margin:0;padding-left:18px">
          <li style="margin:4px 0">${step1} <strong>差分比較</strong>を実行して最新差分を作成</li>
          ${nodeStep}
          <li style="margin:4px 0">${step2} <strong>反映プラン確認</strong>で API 実行内容を確認</li>
          <li style="margin:4px 0">${step3} <strong>比較元 → 比較先(プレビュー) 反映</strong>を実行</li>
        </ol>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          <button class="btn sub" data-act="runDiff">① 差分比較</button>
          ${isNode ? '<button class="btn sub" data-act="loadReflectNodes">② 差分ノード読込</button>' : ''}
          <button class="btn sub" data-act="previewApplyPlan">③ 反映プラン確認</button>
          <button class="btn ok" data-act="applyPreview">④ プレビュー反映</button>
        </div>
      </div>
    </details>`;
}

function getDiffCountsBySection() {
  const counts = {};
  for (const row of getActualDiffRows(state.lastDiffRows || [])) {
    const key = row.sectionKey || '';
    if (!key) continue;
    if (!counts[key]) counts[key] = { total: 0, added: 0, removed: 0, changed: 0 };
    counts[key].total++;
    if (row.type === 'added') counts[key].added++;
    else if (row.type === 'removed') counts[key].removed++;
    else if (row.type === 'changed') counts[key].changed++;
  }
  return counts;
}

export function renderReflectSidebar() {
  const container = getToolDocument().getElementById('u_reflectSidebarSections');
  if (!container) return;
  const diffCounts = getDiffCountsBySection();
  const selectedScopes = new Set(deps.selectedScopeKeys(ui.applyScopes));
  const isNode = isReflectNodeModeEffective();
  const activeSec = state.reflectActiveSidebarSection;
  let checkedCount = 0;
  const putSections = SECTION_DEFS.filter((d) => d.put);

  const items = putSections.map((def) => {
    const count = diffCounts[def.key] || null;
    const checked = selectedScopes.has(def.key);
    if (checked) checkedCount++;
    const isActive = activeSec === def.key;
    const badgeText = count ? `${count.total}` : '-';
    const badgeCls = count && count.total > 0 ? 'sec-badge has-diff' : 'sec-badge';
    const disabledAttr = isNode ? 'disabled' : '';
    return `<div class="sidebar-item${isActive ? ' active' : ''}" data-sidebar-sec="${def.key}">
      <input type="checkbox" class="sec-check" value="${def.key}" ${checked ? 'checked' : ''} ${disabledAttr} data-apply-scope>
      <span class="sec-label">${esc(def.label)}</span>
      <span class="${badgeCls}">${badgeText}</span>
    </div>`;
  }).join('');

  container.innerHTML = items;
  const sidebarCount = getToolDocument().getElementById('u_sidebarCount');
  if (sidebarCount) sidebarCount.textContent = `${checkedCount} / ${putSections.length}`;

  syncApplyScopesFromSidebar();
}

export function syncApplyScopesFromSidebar() {
  const sidebarChecks = getToolDocument().querySelectorAll('#u_reflectSidebarSections [data-apply-scope]');
  const selected = new Set();
  sidebarChecks.forEach((c) => { if (c.checked) selected.add(c.value); });
  const scopeChecks = [...ui.applyScopes.querySelectorAll('input[type="checkbox"]')];
  scopeChecks.forEach((c) => { c.checked = selected.has(c.value); });
}

export function renderReflectMainPanel() {
  const overview = getToolDocument().getElementById('u_reflectOverview');
  if (!overview) return;
  renderReflectAssistPanel();
  const isNode = isReflectNodeModeEffective();
  overview.style.display = 'block';
  const activeSec = state.reflectActiveSidebarSection;
  const diffCounts = getDiffCountsBySection();
  const selectedScopes = new Set(deps.selectedScopeKeys(ui.applyScopes));

  if (isNode) {
    const rows = deps.getSelectedReflectRows();
    const sev = summarizeSeverity(rows);
    overview.innerHTML = `
      <div class="sec-preview" style="border-color:#bfdbfe;background:#f8fbff">
        <div class="sec-preview-title" style="color:#1d4ed8">ノード反映の現在地</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill">候補 ${state.reflectRows.length}件</span>
          <span class="sec-diff-pill">選択 ${rows.length}件</span>
          <span class="sec-diff-pill">比較元 ${rows.filter((r) => deps.reflectRowModeById(r._id) === 'src').length}</span>
          <span class="sec-diff-pill">比較先 ${rows.filter((r) => deps.reflectRowModeById(r._id) === 'tgt').length}</span>
        </div>
        <div class="muted" style="margin-top:8px">重要度: 高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
      </div>`;
    if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = 'ノード反映';
    return;
  }

  if (activeSec) {
    const def = SECTION_DEFS.find((d) => d.key === activeSec);
    if (!def) { overview.innerHTML = ''; return; }
    const count = diffCounts[activeSec] || { total: 0, added: 0, removed: 0, changed: 0 };
    const rows = getActualDiffRows(state.lastDiffRows || []).filter((r) => r.sectionKey === activeSec);
    const topPaths = rows.slice(0, 12).map((r) => {
      const cls = r.type === 'added' ? '#166534' : (r.type === 'removed' ? '#b91c1c' : '#92400e');
      const typeLabel = r.moved ? `${r.type}(moved)` : (r.type || '-');
      return `<tr><td style="color:${cls};font-weight:700;width:80px">${esc(typeLabel)}</td><td style="font-family:monospace;font-size:10px;color:#64748b;word-break:break-all">${esc(r.path || '-')}</td></tr>`;
    }).join('');
    const moreCount = rows.length > 12 ? rows.length - 12 : 0;

    overview.innerHTML = `
      <div class="sec-preview">
        <div class="sec-preview-title">${esc(def.label)}</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill">差分 ${count.total}件</span>
          <span class="sec-diff-pill" style="color:#166534">追加 ${count.added}</span>
          <span class="sec-diff-pill" style="color:#b91c1c">削除 ${count.removed}</span>
          <span class="sec-diff-pill" style="color:#92400e">変更 ${count.changed}</span>
        </div>
        ${count.total > 0 ? `<div style="margin-top:10px;max-height:200px;overflow:auto">
          <table><thead><tr><th style="width:80px">種別</th><th>パス</th></tr></thead><tbody>${topPaths}</tbody></table>
          ${moreCount > 0 ? `<div class="muted" style="padding:6px 8px;text-align:center">他 ${moreCount}件...</div>` : ''}
        </div>` : '<div class="muted" style="margin-top:8px">差分なし（または差分比較未実行）</div>'}
      </div>`;
    if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = def.label;
  } else {
    const putSections = SECTION_DEFS.filter((d) => d.put);
    const cards = putSections.filter((def) => selectedScopes.has(def.key)).map((def) => {
      const count = diffCounts[def.key] || { total: 0, added: 0, removed: 0, changed: 0 };
      const barTotal = Math.max(count.total, 1);
      return `<div class="sec-overview-card" data-sidebar-nav="${def.key}">
        <div class="soc-label">${esc(def.label)}</div>
        <div class="soc-stats">${count.total > 0 ? `差分 ${count.total}件 (A:${count.added} R:${count.removed} C:${count.changed})` : '差分なし'}</div>
        ${count.total > 0 ? `<div class="soc-bar">
          ${count.added > 0 ? `<div class="fill added" style="width:${(count.added / barTotal) * 100}%;display:inline-block"></div>` : ''}
          ${count.removed > 0 ? `<div class="fill removed" style="width:${(count.removed / barTotal) * 100}%;display:inline-block"></div>` : ''}
          ${count.changed > 0 ? `<div class="fill changed" style="width:${(count.changed / barTotal) * 100}%;display:inline-block"></div>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');

    const totalDiff = Object.values(diffCounts).reduce((s, c) => s + c.total, 0);
    overview.innerHTML = `
      <div class="sec-preview" style="border-color:#c7d2fe;background:#eef2ff">
        <div class="sec-preview-title" style="color:#4338ca">反映概要</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill" style="border-color:#c7d2fe">選択セクション ${selectedScopes.size}件</span>
          <span class="sec-diff-pill" style="border-color:#c7d2fe">総差分 ${totalDiff}件</span>
        </div>
      </div>
      ${selectedScopes.size > 0 ? `<div class="sec-overview-grid">${cards}</div>` : '<div class="muted" style="text-align:center;padding:20px">反映セクションを左のサイドバーから選択してください</div>'}`;
    if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = '反映概要';
  }
}

export function renderReflectNodeList() {
  const extractPropertyKeyFromPath = (path) => {
    const text = String(path || '');
    if (!text) return '';
    const m = text.match(/(?:^|\.)(?:properties|fields)\.([^.[\]]+)/);
    if (m?.[1]) return m[1];
    const head = text.split('.')[0] || '';
    return head.includes('[') ? head.split('[')[0] : head;
  };
  const rows = state.reflectRows || [];
  if (!rows.length) {
    const emptyText = state.lastDiffAt
      ? '反映対象の差分ノードはありません。'
      : '差分ノード未読込（差分比較後に「差分ノード読込」）';
    ui.reflectNodeList.innerHTML = `<div style="padding:10px;font-size:12px;color:#64748b">${emptyText}</div>`;
    if (ui.nodePropertyList) ui.nodePropertyList.innerHTML = '<div class="muted" style="padding:6px">差分ノード読込後に表示されます</div>';
    if (ui.nodePropertyChips) ui.nodePropertyChips.innerHTML = '<span class="muted" style="font-size:10px">未選択（すべて対象）</span>';
    state.reflectActiveNodeId = '';
    renderReflectNodeDetail();
    renderBundleState();
    renderReflectModeUi();
    renderReflectAssistPanel();
    return;
  }
  const keyword = (ui.nodeSearch?.value || '').toLowerCase();
  const filterSec = ui.nodeFilterSection?.value || '';
  const filterType = ui.nodeFilterType?.value || '';
  const filterSev = ui.nodeFilterSeverity?.value || '';
  const propertyPanel = ui.nodePropertyPanel;
  const propertyList = ui.nodePropertyList;
  const propertyChips = ui.nodePropertyChips;
  const propertyMap = new Map();
  rows.forEach((r) => {
    const key = extractPropertyKeyFromPath(r.path);
    if (!key) return;
    propertyMap.set(key, (propertyMap.get(key) || 0) + 1);
  });
  if (!(state.reflectPropertyFilters instanceof Set)) state.reflectPropertyFilters = new Set();
  state.reflectPropertyFilters = new Set([...state.reflectPropertyFilters].filter((key) => propertyMap.has(key)));
  if (propertyPanel) propertyPanel.style.display = state.reflectPropertyPanelOpen ? 'block' : 'none';
  const sortedProps = [...propertyMap.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  if (propertyList) {
    propertyList.innerHTML = sortedProps.length
      ? sortedProps.map(([key, count]) =>
        `<label style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 2px;border-bottom:1px solid #f1f5f9">
          <span style="display:flex;align-items:center;gap:8px;min-width:0">
            <input type="checkbox" data-reflect-prop="${esc(key)}" ${state.reflectPropertyFilters.has(key) ? 'checked' : ''}>
            <span style="font-size:11px;color:#0f172a;word-break:break-all">${esc(key)}</span>
          </span>
          <span style="font-size:10px;color:#64748b">${count}件</span>
        </label>`
      ).join('')
      : '<div class="muted" style="padding:6px">選択可能なプロパティはありません</div>';
  }
  if (propertyChips) {
    const selectedProps = [...state.reflectPropertyFilters];
    propertyChips.innerHTML = selectedProps.length
      ? selectedProps.map((key) =>
        `<button type="button" class="chip" data-act="removeReflectPropertyFilter" data-prop="${esc(key)}" style="font-size:10px;padding:2px 6px;border:none;cursor:pointer">${esc(key)} ×</button>`
      ).join('')
      : '<span class="muted" style="font-size:10px">未選択（すべて対象）</span>';
  }
  const filterProps = state.reflectPropertyFilters instanceof Set ? state.reflectPropertyFilters : new Set();
  const filtered = rows.filter((r) => {
    if (keyword && !(r.path || '').toLowerCase().includes(keyword)
      && !(r.section || '').toLowerCase().includes(keyword)
      && !(r.sectionKey || '').toLowerCase().includes(keyword)) return false;
    if (filterSec && r.sectionKey !== filterSec) return false;
    if (filterType && r.type !== filterType) return false;
    if (filterSev && (r.severity || 'low').toUpperCase() !== filterSev) return false;
    if (filterProps.size && !filterProps.has(extractPropertyKeyFromPath(r.path))) return false;
    return true;
  });
  const activeRow = deps.getActiveReflectRow(filtered.map((r) => r._id));
  const selected = state.reflectSelectedIds || new Set();
  const selectedCount = rows.filter((r) => selected.has(r._id)).length;
  const selectedRows = rows.filter((r) => selected.has(r._id));
  const srcCount = selectedRows.filter((r) => deps.reflectRowModeById(r._id) === 'src').length;
  const tgtCount = selectedRows.length - srcCount;
  const sev = summarizeSeverity(selectedRows);
  const header = `<div style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;background:#f8fafc">候補 ${rows.length}件 / 表示 ${filtered.length}件 / 選択 ${selectedCount}件 / 比較元 ${srcCount} / 比較先 ${tgtCount} / 高:${sev.high} 中:${sev.medium} 低:${sev.low}</div>`;
  if (!filtered.length) {
    ui.reflectNodeList.innerHTML = `${header}<div style="padding:12px;font-size:12px;color:#64748b">条件に一致するノードがありません。検索または絞り込み条件を見直してください。</div>`;
    renderReflectNodeDetail();
    renderBundleState();
    renderReflectModeUi();
    renderReflectAssistPanel();
    return;
  }
  const body = filtered.slice(0, 1200).map((r) => {
    const cls = r.type === 'added' ? '#166534' : (r.type === 'removed' ? '#b91c1c' : '#92400e');
    const checked = selected.has(r._id) ? 'checked' : '';
    const mode = deps.reflectRowModeById(r._id);
    const typeLabel = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
    const severity = String(r.severity || 'low').toLowerCase();
    const sevBg = severity === 'high' ? '#fee2e2' : (severity === 'medium' ? '#fef3c7' : '#dbeafe');
    const sevColor = severity === 'high' ? '#991b1b' : (severity === 'medium' ? '#92400e' : '#1d4ed8');
    return `<tr class="reflect-node-row${activeRow?._id === r._id ? ' active' : ''}" data-node-open="${esc(r._id)}">
      <td><input type="checkbox" data-node-id="${esc(r._id)}" ${checked}></td>
      <td><button type="button" data-node-mode="${esc(r._id)}" style="border:1px solid #cbd5e1;border-radius:6px;padding:2px 6px;font-size:10px;background:${mode === 'src' ? '#dbeafe' : '#dcfce7'};color:${mode === 'src' ? '#1d4ed8' : '#166534'};font-weight:700;cursor:pointer">${mode === 'src' ? '比較元' : '比較先'}</button></td>
      <td><span style="display:inline-block;padding:1px 6px;border-radius:999px;background:${sevBg};color:${sevColor};font-size:10px;font-weight:700">${esc(getSeverityDisplayLabel(severity))}</span></td>
      <td>${esc(r.section || '-')}</td>
      <td style="color:${cls};font-weight:700">${esc(typeLabel)}</td>
      <td title="${esc(r.path || '-')}">${esc(r.path || '-')}</td>
    </tr>`;
  }).join('');
  ui.reflectNodeList.innerHTML = `${header}<table>
    <thead><tr><th style="width:52px">選択</th><th style="width:66px">反映元</th><th style="width:82px">重要度</th><th>セクション</th><th>種別</th><th>パス</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
  renderReflectNodeDetail();
  renderBundleState();
  renderReflectModeUi();
  renderReflectAssistPanel();
}

export function renderReflectNodeDetail() {
  if (!ui.reflectNodeDetail) return;
  if (!isReflectNodeModeEffective()) {
    ui.reflectNodeDetail.innerHTML = '';
    ui.reflectNodeDetail.style.display = 'none';
    return;
  }
  ui.reflectNodeDetail.style.display = 'flex';
  if (ui.reflectNodeList && !ui.reflectNodeList.querySelector('[data-node-open]') && (state.reflectRows || []).length) {
    ui.reflectNodeDetail.innerHTML = '<div class="reflect-node-detail-empty">表示中のノードがありません。左の検索条件や絞り込みを調整してください。</div>';
    return;
  }
  const visibleIds = Array.from(ui.reflectNodeList?.querySelectorAll('[data-node-open]') || []).map((el) => el.dataset.nodeOpen).filter(Boolean);
  const row = deps.getActiveReflectRow(visibleIds.length ? visibleIds : null);
  if (!row) {
    ui.reflectNodeDetail.innerHTML = '<div class="reflect-node-detail-empty">選択中または表示中のノードがありません。左の一覧から差分ノードを選ぶと、ここに比較内容と反映値を表示します。</div>';
    return;
  }

  const selected = state.reflectSelectedIds.has(row._id);
  const mode = deps.reflectRowModeById(row._id);
  const severity = String(row.severity || 'low').toLowerCase();
  const activeTab = ['diff', 'src', 'tgt', 'apply'].includes(state.reflectDetailTab) ? state.reflectDetailTab : 'diff';
  const useCharDiff = !!ui.charDiff?.checked;
  const tabs = [
    { key: 'diff', label: '差分' },
    { key: 'src', label: '比較元' },
    { key: 'tgt', label: '比較先' },
    { key: 'apply', label: '反映値' }
  ];
  let bodyHtml = '';
  if (activeTab === 'diff') {
    const cols = deps.renderRowColumns(row, useCharDiff);
    bodyHtml = `<div class="reflect-node-detail-note">差分表示です。反映元を「比較元 / 比較先」で切り替えると、実際に採用される値は「反映値」タブで確認できます。</div>
      <div id="u_richDiffContainer_${esc(row._id)}" class="reflect-rich-diff-container" style="margin-bottom:8px;border:1px solid #e2e8f0;border-radius:8px;overflow:auto;max-height:400px;"></div>
      <details style="margin-top:4px">
        <summary style="cursor:pointer;font-size:11px;color:#64748b;padding:4px 0">従来の差分表示を開く</summary>
        <div class="diff-view">
          <div class="reflect-node-compare">
            <div class="reflect-node-card">
              <div class="reflect-node-card-head">比較元</div>
              <div class="reflect-node-card-body">${cols.left}</div>
            </div>
            <div class="reflect-node-card">
              <div class="reflect-node-card-head">比較先</div>
              <div class="reflect-node-card-body">${cols.right}</div>
            </div>
          </div>
        </div>
      </details>`;
  } else {
    const value = activeTab === 'src'
      ? row.left
      : (activeTab === 'tgt' ? row.right : deps.reflectRowDesiredValue(row));
    const title = activeTab === 'src'
      ? '比較元JSON'
      : (activeTab === 'tgt' ? '比較先JSON' : `反映値JSON (${mode === 'src' ? '比較元' : '比較先'}を採用)`);
    bodyHtml = `<div class="reflect-node-detail-note">${activeTab === 'apply' ? `このノードは現在「${mode === 'src' ? '比較元' : '比較先'}」を反映元として扱います。` : 'JSONをそのまま確認できます。'}</div>
      <div class="reflect-node-card">
        <div class="reflect-node-card-head">${esc(title)}</div>
        <div class="reflect-node-card-body"><pre class="reflect-node-json">${esc(deps.stringifyForDiff(value))}</pre></div>
      </div>`;
  }

  const impactText = (row.impactRefs || [])
    .map((ref) => `${ref.section || ref.sectionKey || '-'} / ${ref.kind || '-'}${ref.label ? ` / ${ref.label}` : ''}`)
    .join('\n');
  ui.reflectNodeDetail.innerHTML = `<div class="reflect-node-detail-head">
    <div class="reflect-node-detail-eyebrow">Node Workbench</div>
    <div class="reflect-node-detail-title">${esc(row.section || '-')} / ${esc(getDiffTypeDisplayLabel(row.type, { moved: !!row.moved }))}</div>
    <div class="reflect-node-detail-path">${esc(row.path || '-')}</div>
    <div class="reflect-node-badges">
      <span class="reflect-node-badge ${esc(severity)}">${esc(getSeverityDisplayLabel(severity))}重要度</span>
      <span class="reflect-node-badge">${selected ? '選択中' : '未選択'}</span>
      <span class="reflect-node-badge">${mode === 'src' ? '比較元を反映' : '比較先を維持'}</span>
    </div>
    <div class="reflect-node-actions">
      <button class="btn ${selected ? 'sub' : 'ok'}" data-act="toggleActiveReflectNodeSelection">${selected ? '選択解除' : 'このノードを選択'}</button>
      <button class="btn ok" data-act="toggleActiveReflectNodeMode">${mode === 'src' ? '比較先へ切替' : '比較元へ切替'}</button>
      <button class="btn sub" data-act="focusActiveReflectNodeDiff">差分タブで開く</button>
      <button class="btn sub" data-copy-val="${esc(row.path || '')}">パスコピー</button>
    </div>
  </div>
  <div class="reflect-node-detail-tabs">
    ${tabs.map((tab) => `<button class="reflect-node-tab${tab.key === activeTab ? ' active' : ''}" data-node-detail-tab="${tab.key}">${esc(tab.label)}</button>`).join('')}
  </div>
  <div class="reflect-node-detail-body">
    <div class="reflect-node-meta">
      ${row.reasonSummary ? `<div class="reflect-node-meta-item"><strong>差分理由:</strong> ${esc(row.reasonSummary)}</div>` : ''}
      ${row.renameCandidate ? `<div class="reflect-node-meta-item"><strong>名称変更候補:</strong> ${esc(row.renameCandidate.fromCode || '-')} → ${esc(row.renameCandidate.toCode || '-')}${row.renameCandidate.matchedBy ? `<br><strong>判定:</strong> ${esc(row.renameCandidate.matchedBy)}` : ''}</div>` : ''}
      ${row.impactCount ? `<div class="reflect-node-meta-item"><strong>影響:</strong> ${esc(row.impactSummary || `${row.impactCount}件`)}${impactText ? `<br><pre class="reflect-node-json" style="padding:6px 0 0;background:transparent">${esc(impactText)}</pre>` : ''}</div>` : ''}
    </div>
    ${bodyHtml}
  </div>`;

  // Asynchronously render local rich diff if on the diff tab
  if (activeTab === 'diff') {
    const containerId = `u_richDiffContainer_${row._id}`;
    setTimeout(() => {
      const diffContainer = getToolDocument().getElementById(containerId);
      if (diffContainer) {
        const leftStr = deps.stringifyForDiff(row.left);
        const rightStr = deps.stringifyForDiff(row.right);
        renderRichDiff(leftStr, rightStr, diffContainer, {
          fileName: row.path || 'settings.json',
          leftLabel: '比較元',
          rightLabel: '比較先',
          sideBySide: true
        }).catch((err) => {
          diffContainer.innerHTML = `<div style="padding:8px;color:#64748b;font-size:11px">リッチ差分表示の読み込み中にエラーが発生しました。下の「従来の差分表示」をご利用ください。</div>`;
          console.warn('Rich diff error:', err);
        });
      }
    }, 50);
  }
}

export function renderAppIdConfirmSection(appIdRefs) {
  if (!appIdRefs || !appIdRefs.length) return '<div style="color:#64748b;font-size:12px;margin-bottom:8px">関連アプリIDなし</div>';
  const rows = appIdRefs.map((r) =>
    `<tr><td style="padding:3px 8px;font-size:11px">${esc(r.fieldCode)}</td>` +
    `<td style="padding:3px 8px;font-size:11px">${esc(r.type)}</td>` +
    `<td style="padding:3px 8px;font-size:11px;font-weight:700">${esc(r.refAppId)}</td>` +
    `<td style="padding:3px 8px;font-size:11px;color:${r.convertedAppId ? '#2563eb' : '#94a3b8'}">${r.convertedAppId ? `→ ${esc(r.convertedAppId)}` : '-'}</td>` +
    `<td style="padding:3px 8px;font-size:11px">${esc(r.section)}</td></tr>`
  ).join('');
  return `<div style="margin-bottom:10px">
    <div style="font-weight:600;font-size:12px;margin-bottom:4px;color:#dc2626">関連アプリID一覧 (${appIdRefs.length}件)</div>
    <div style="max-height:160px;overflow:auto;border:1px solid #e2e8f0;border-radius:6px">
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:4px 8px;text-align:left">フィールド</th>
          <th style="padding:4px 8px;text-align:left">種別</th>
          <th style="padding:4px 8px;text-align:left">参照先アプリID</th>
          <th style="padding:4px 8px;text-align:left">変換後</th>
          <th style="padding:4px 8px;text-align:left">セクション</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}
