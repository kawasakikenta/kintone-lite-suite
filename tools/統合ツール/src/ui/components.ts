'use strict';

import {
  FEATURE_DEFS,
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
import { REFLECT_QUICK_PRESETS } from '../constants.js';
import { saveCurrentDialogState, getToolDocument } from './dialog.js';
import { renderRichDiff } from '../oss_integrations.js';

let ui: Record<string, any> = {};

const deps: Record<string, any> = {
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

export function setStatus(msg, isError = false) {
  if (!ui.status) return;
  ui.status.textContent = msg;
  ui.status.style.background = '';
  ui.status.style.color = '';
  ui.status.classList.remove('status--neutral', 'status--error');
  ui.status.classList.add(isError ? 'status--error' : 'status--neutral');
  const bar = ui.status.closest?.('.status-bar');
  if (bar) bar.classList.toggle('status-bar--error', !!isError);
}

export function setBusy(isBusy, message = '') {
  const root = ui.status?.closest(`#${CSS.escape?.('kintone-unified-suite-v2') || 'kintone-unified-suite-v2'}`);
  if (message && ui.busyText) ui.busyText.textContent = message;
  if (root) root.classList.toggle('busy', !!isBusy);
}

function getFeatureDef(featureKey) {
  return FEATURE_DEFS.find((item) => item.key === featureKey) || null;
}

function buildFeatureSummary(def) {
  if (!def) return '';
  const parts = [def.desc || ''];
  if (Array.isArray(def.recommendedFor) && def.recommendedFor.length) {
    parts.push(`おすすめ: ${def.recommendedFor.join(' / ')}`);
  }
  if (def.riskLevel === 'warning') {
    parts.push('変更系のため実行前に内容確認を推奨');
  } else if (def.riskLevel === 'safe') {
    parts.push('確認・出力中心で比較的安全');
  }
  return parts.filter(Boolean).join(' ・ ');
}

function setFeatureBreadcrumb(def, tabKey) {
  if (!ui.featureBreadcrumb) return;
  const tab = String(tabKey || def?.tab || '').trim();
  const tabLabel = ui.tabs.find((item) => item.dataset.tab === tab)?.textContent?.trim() || '機能';
  const featureLabel = def?.label ? ` / ${def.label}` : '';
  ui.featureBreadcrumb.textContent = `ホーム / ${tabLabel}${featureLabel}`;
}

function applyFeatureGroupClass(root, group) {
  if (!root) return;
  root.classList.remove('feat-vis', 'feat-data', 'feat-change');
  if (group === 'vis') root.classList.add('feat-vis');
  else if (group === 'data') root.classList.add('feat-data');
  else root.classList.add('feat-change');
}

export function showLauncherScreen(options: any = {}) {
  const root = getToolDocument().getElementById('kintone-unified-suite-v2');
  if (!root) return;
  state.activeFeatureKey = '';
  root.classList.remove('screen-feature', 'feat-vis', 'feat-data', 'feat-change');
  root.classList.add('screen-launcher');
  if (ui.featureTitle) ui.featureTitle.textContent = '';
  if (ui.featureConn) ui.featureConn.textContent = '';
  if (ui.featureBreadcrumb) ui.featureBreadcrumb.textContent = 'ホーム / 機能';
  setConnectionPanelCollapsed(false);
  updateConnectionStepIndicators();
  if (options.persist !== false) saveCurrentDialogState();
}

export function openFeatureScreen(featureKey, options: any = {}) {
  const def = getFeatureDef(featureKey);
  const root = getToolDocument().getElementById('kintone-unified-suite-v2');
  if (!def || !root) return null;

  state.activeFeatureKey = def.key;
  root.classList.remove('screen-launcher');
  root.classList.add('screen-feature');
  applyFeatureGroupClass(root, def.group);

  switchTab(def.tab || def.tabs?.[0] || 'reflect', { persist: false });
  if (def.subTab) switchSubTab(def.tab, def.subTab, { persist: false });
  if (def.diffSubTab) switchSubTab('diff', def.diffSubTab, { persist: false });

  if (ui.featureTitle) ui.featureTitle.textContent = def.label;
  if (ui.featureConn) ui.featureConn.textContent = buildFeatureSummary(def);
  setFeatureBreadcrumb(def, def.tab || def.tabs?.[0]);

  const sourceAppFilled = !!(ui.sourceApp?.value || '').trim();
  const targetAppFilled = !!(ui.targetApp?.value || '').trim();
  const needs = TAB_CONNECTION_NEEDS[def.tab || def.tabs?.[0] || 'reflect'] || ({} as any);
  const connReady = needs.target ? (sourceAppFilled && targetAppFilled) : sourceAppFilled;
  setConnectionPanelCollapsed(!!connReady);

  updateConnectionStepIndicators();

  if (options.persist !== false) saveCurrentDialogState();

  if (def.focusSelector && options.focus !== false) {
    const targetWindow = getToolDocument().defaultView || window;
    targetWindow.requestAnimationFrame(() => {
      const target = getToolDocument().querySelector(def.focusSelector);
      target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  }

  return def;
}

export function switchSubTab(parentKey, subKey, options: any = {}) {
  if (!parentKey) return;
  const tabs = ui.subTabs.filter((tab) => tab.dataset.subtabParent === parentKey);
  const panes = ui.subPanes.filter((pane) => pane.dataset.subpaneParent === parentKey);
  if (!tabs.length || !panes.length) return;
  const fallback = state.activeSubTabs[parentKey] || tabs[0]?.dataset.subtab || '';
  const key = tabs.some((tab) => tab.dataset.subtab === subKey) ? subKey : fallback;
  state.activeSubTabs[parentKey] = key;
  if (parentKey === 'reflect' && ui.nodeMode) {
    ui.nodeMode.checked = key === 'diff';
  }
  tabs.forEach((tab) => {
    const active = tab.dataset.subtab === key;
    tab.classList.toggle('active', active);
    tab.dataset.state = active ? 'selected' : 'idle';
  });
  panes.forEach((pane) => pane.classList.toggle('active', pane.dataset.subpane === key));
  if (state.guidedTourActive && deps.scheduleGuidedTourLayout) deps.scheduleGuidedTourLayout();
  if (options.persist !== false) saveCurrentDialogState();
}

function snapshotCurrentTabResult() {
  if (!ui.result) return;
  const prevTab = state.activeTab;
  if (!prevTab) return;
  if (prevTab === 'diff') return; // diff タブは state.lastDiffRows から再描画される
  const html = ui.result.innerHTML || '';
  if (!state.lastResultByTab || typeof state.lastResultByTab !== 'object') {
    state.lastResultByTab = {};
  }
  if (html && html !== '<div class="main-result-placeholder"><p class="main-result-placeholder-title">結果エリア</p><p class="main-result-placeholder-body">このタブの操作結果やログがここに表示されます。</p></div>') {
    state.lastResultByTab[prevTab] = html;
  }
}

function restoreTabResult(nextKey) {
  if (!ui.result) return;
  if (nextKey === 'diff') return; // diff タブは renderResultRows 側で描画
  const stored = state.lastResultByTab && state.lastResultByTab[nextKey];
  if (typeof stored === 'string' && stored.length) {
    ui.result.innerHTML = stored;
  }
}

export function switchTab(tabKey, options: any = {}) {
  const key = ui.tabs.some((t) => t.dataset.tab === tabKey) ? tabKey : 'reflect';
  if (state.activeTab !== key) snapshotCurrentTabResult();
  state.activeTab = key;
  ui.tabs.forEach((t) => {
    const active = t.dataset.tab === key;
    t.classList.toggle('active', active);
    t.dataset.state = active ? 'selected' : 'idle';
  });
  ui.panes.forEach((p) => p.classList.toggle('active', p.dataset.pane === key));
  
  const root = getToolDocument().getElementById('kintone-unified-suite-v2');
  if (root) {
    if (root.classList.contains('screen-feature')) {
      const matches = FEATURE_DEFS.filter((def) => (def.tab || def.tabs?.[0]) === key);
      const currentFeature = getFeatureDef(state.activeFeatureKey);
      const currentMatchesTab = currentFeature && (currentFeature.tab || currentFeature.tabs?.[0]) === key;
      if (key !== 'reflect' && matches.length === 1) {
        state.activeFeatureKey = matches[0].key;
      } else if (!currentMatchesTab) {
        state.activeFeatureKey = matches.find((def) => def.key === 'reflect')?.key || matches[0]?.key || '';
      }
      const activeFeature = getFeatureDef(state.activeFeatureKey);
      if (activeFeature) {
        applyFeatureGroupClass(root, activeFeature.group);
        if (ui.featureTitle) ui.featureTitle.textContent = activeFeature.label;
        if (ui.featureConn) ui.featureConn.textContent = buildFeatureSummary(activeFeature);
        setFeatureBreadcrumb(activeFeature, key);
      }
    }
    const needs = TAB_CONNECTION_NEEDS[key] || ({} as any);
    root.classList.toggle('tab-is-diff', key === 'diff');
    root.classList.toggle('tab-is-diff-or-reflect', key === 'diff' || key === 'reflect' || key === 'field' || key === 'jsconfig');
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
    if (ui.sourceAppLabel) {
      ui.sourceAppLabel.innerHTML = needs.target ? '比較元アプリID <span class="req">必須</span>' : '対象アプリID <span class="req">必須</span>';
    }
    if (ui.sourceGuestLabel) {
      ui.sourceGuestLabel.textContent = needs.target ? '比較元 ゲストID' : '対象 ゲストID';
    }
    if (ui.targetAppLabel) {
      ui.targetAppLabel.innerHTML = '比較先アプリID <span class="req">必須</span>';
    }
    if (ui.targetGuestLabel) {
      ui.targetGuestLabel.textContent = '比較先 ゲストID';
    }
    if (ui.connectionSearchAssign) {
      [...ui.connectionSearchAssign.options].forEach((opt) => {
        const val = opt.value;
        let enabled = true;
        if (val === 'target') enabled = !!needs.target;
        if (val === 'diffMulti') enabled = key === 'diff';
        opt.disabled = !enabled;
      });
      const cur = ui.connectionSearchAssign.value;
      if (ui.connectionSearchAssign.selectedOptions[0]?.disabled) {
        const firstEnabled = [...ui.connectionSearchAssign.options].find((opt) => !opt.disabled);
        if (firstEnabled) ui.connectionSearchAssign.value = firstEnabled.value;
      } else if (!cur) {
        ui.connectionSearchAssign.value = 'source';
      }
    }
  }

  if (state.guidedTourActive && deps.scheduleGuidedTourLayout) deps.scheduleGuidedTourLayout();
  updateConnectionStepIndicators();
  restoreTabResult(key);
  if (!options || options.persist !== false) saveCurrentDialogState();
}

export function updateConnectionStepIndicators() {
  const step1 = ui.step1Indicator;
  const step2 = ui.step2Indicator;
  const step3 = ui.step3Indicator;
  const summaryInline = ui.connectionSummaryInline;
  if (!step1 && !step2 && !step3 && !summaryInline) return;

  const root = getToolDocument().getElementById('kintone-unified-suite-v2');
  const sourceApp = (ui.sourceApp?.value || '').trim();
  const sourceGuest = (ui.sourceGuest?.value || '').trim();
  const targetApp = (ui.targetApp?.value || '').trim();
  const targetGuest = (ui.targetGuest?.value || '').trim();
  const needs = TAB_CONNECTION_NEEDS[state.activeTab] || ({} as any);
  const hasConnection = needs.target ? (!!sourceApp && !!targetApp) : !!sourceApp;
  const hasCommonData = !!(state.lastSourceBundle || state.importedSourceBundle) && !!(state.lastTargetBundle || state.importedTargetBundle);
  const activeFeature = getFeatureDef(state.activeFeatureKey);
  const featureSelected = !!activeFeature && root?.classList.contains('screen-feature');
  const currentStep = !hasConnection ? 1 : (featureSelected ? 3 : 2);

  if (step1) {
    step1.textContent = hasConnection ? '入力済み' : '未入力';
    step1.dataset.stepState = currentStep === 1 ? 'current' : (hasConnection ? 'done' : 'pending');
  }
  if (step2) {
    step2.textContent = hasCommonData ? '取得済み' : '未取得';
    step2.dataset.stepState = currentStep === 2 ? 'current' : (hasCommonData ? 'done' : 'pending');
  }
  if (step3) {
    const step3Active = hasConnection && featureSelected;
    step3.textContent = featureSelected ? activeFeature.label : '未選択';
    step3.dataset.stepState = step3Active ? 'current' : 'pending';
  }
  if (summaryInline) {
    const fmt = (id, guest) => {
      if (!id) return '<span class="cs-empty">未設定</span>';
      const g = guest ? `<span class="cs-guest">(ゲスト ${esc(guest)})</span>` : '';
      return `<span class="cs-id">#${esc(id)}</span>${g}`;
    };
    if (!needs.appInputs) {
      summaryInline.innerHTML = '';
    } else if (needs.target) {
      summaryInline.innerHTML = `<span class="cs-label">比較元</span> ${fmt(sourceApp, sourceGuest)} <span class="cs-arrow" aria-hidden="true">→</span> <span class="cs-label">比較先</span> ${fmt(targetApp, targetGuest)}`;
    } else {
      summaryInline.innerHTML = `<span class="cs-label">対象</span> ${fmt(sourceApp, sourceGuest)}`;
    }
  }
}

export function setConnectionPanelCollapsed(collapsed) {
  const panel = ui.connectionPanel;
  const btn = ui.connectionToggleBtn;
  if (!panel) return;
  panel.classList.toggle('is-collapsed', !!collapsed);
  if (btn) {
    btn.textContent = collapsed ? '設定を開く' : '設定を折りたたむ';
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  }
}

function diffScopeTooltip(s) {
  let t = `API ${s.endpoint} の設定を比較・取得の対象に含めます。`;
  if (!s.put) t += '（PUT 反映 API はありません。差分確認・エクスポート用途向けです。）';
  if (s.key === 'pluginSettings') {
    t += ' 試験的機能: 反映先にプラグインが未インストールだとエラーになることがあります。';
  }
  return t;
}

const SCOPE_PICKER_META = Object.freeze({
  diff: Object.freeze({
    title: '比較対象セクション',
    sub: '差分比較で取得する API 設定を選びます。'
  }),
  reflect: Object.freeze({
    title: '反映するセクション',
    sub: 'プレビュー反映でまとめて適用するセクションを選びます。'
  }),
  settingsExport: Object.freeze({
    title: '取得対象セクション',
    sub: '設定一括取得で保存する API 設定を、JS/CSS設定も含めて選びます。'
  })
});

function scopeSummaryLabel(defs, selectedKeys, options: any = {}) {
  const labelByKey = new Map((defs || []).map((def) => [def.key, def.label]));
  const labels = (selectedKeys || []).map((key) => labelByKey.get(key) || key).filter(Boolean);
  const total = (defs || []).length;
  const selected = labels.length;
  const head = `<strong>${selected} / ${total}件を選択</strong>`;
  if (!selected) return `${head} / ${options.emptyText || '未選択です'}`;
  const tail = labels.slice(0, 3).join(' / ');
  const more = labels.length > 3 ? ` / ほか${labels.length - 3}件` : '';
  const extra = options.extraText ? ` / ${options.extraText}` : '';
  return `${head} / ${tail}${more}${extra}`;
}

export function renderScopePickerSummaries() {
  const diffSummary = getToolDocument().getElementById('u_diffScopeSummary');
  if (diffSummary) {
    diffSummary.innerHTML = scopeSummaryLabel(
      SECTION_DEFS,
      deps.selectedScopeKeys?.(ui.diffScopes) || [],
      { emptyText: '比較対象がまだ選ばれていません' }
    );
  }

  const reflectSummary = getToolDocument().getElementById('u_reflectScopeSummary');
  if (reflectSummary) {
    const extraText = isReflectNodeModeEffective()
      ? '差分を選んで反映モード中'
      : (ui.applyDiffOnly?.checked ? '差分ありセクションのみ反映' : '');
    reflectSummary.innerHTML = scopeSummaryLabel(
      SECTION_DEFS.filter((def) => def.put),
      deps.selectedScopeKeys?.(ui.applyScopes) || [],
      { emptyText: '反映対象がまだ選ばれていません', extraText }
    );
  }

  const settingsSummary = getToolDocument().getElementById('u_settingsExportScopeSummary');
  if (settingsSummary) {
    settingsSummary.innerHTML = scopeSummaryLabel(
      SETTINGS_EXPORT_SCOPE_DEFS,
      deps.selectedScopeKeys?.(ui.settingsExportScopes) || [],
      { emptyText: '取得対象がまだ選ばれていません' }
    );
  }
}

export function openScopePicker(kind) {
  if (!ui.scopePickerModal) return;
  const meta = SCOPE_PICKER_META[kind] || SCOPE_PICKER_META.diff;
  ui.scopePickerModal.hidden = false;
  ui.scopePickerModal.dataset.scopePickerKind = kind;
  if (ui.scopePickerTitle) ui.scopePickerTitle.textContent = meta.title;
  if (ui.scopePickerSub) ui.scopePickerSub.textContent = meta.sub;
  [...getToolDocument().querySelectorAll('[data-scope-picker-panel]')].forEach((panel) => {
    panel.classList.toggle('active', panel.getAttribute('data-scope-picker-panel') === kind);
  });
  const firstFocusable = ui.scopePickerModal.querySelector(
    `[data-scope-picker-panel="${kind}"] button, [data-scope-picker-panel="${kind}"] input[type="checkbox"]`
  );
  getToolDocument().body.classList.add('scope-picker-open');
  if (firstFocusable) {
    getToolDocument().defaultView?.requestAnimationFrame?.(() => firstFocusable.focus());
  }
}

export function closeScopePicker() {
  if (!ui.scopePickerModal) return;
  ui.scopePickerModal.hidden = true;
  delete ui.scopePickerModal.dataset.scopePickerKind;
  getToolDocument().body.classList.remove('scope-picker-open');
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
  renderScopePickerSummaries();
}

export function setSettingsExportScopeSelection(checked) {
  [...ui.settingsExportScopes.querySelectorAll('input[type="checkbox"]')].forEach((c) => {
    c.checked = !!checked;
  });
  renderScopePickerSummaries();
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
    `選択 ${selected}/${total}件 ・ 表示 ${rendered}件 ・ API失敗 ${issues}件 ・ 出力 ${resolveDiffExportMode() === 'all' ? '全差分' : resolveDiffExportMode() === 'selected' ? '選択差分' : resolveDiffExportMode() === 'visible' ? '現在表示中' : '全差分'} ・ 内容 ${getDiffExportContentLabel(resolveDiffExportContentMode())} ・ 正規化 ${normalization.join(', ') || '-'}`;
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
    const from = ((row.querySelector('.lookup-from') as HTMLInputElement | null)?.value || '').trim();
    const to = ((row.querySelector('.lookup-to') as HTMLInputElement | null)?.value || '').trim();
    if (from && to) map[from] = to;
  });
  ui.lookupMap.value = Object.keys(map).length ? JSON.stringify(map) : '';
}

function resolveBundleRevision(bundle) {
  const revisions = bundle?.meta?.sectionRevisions || ({} as any);
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
      return `${label}: 保存済みJSONを読込 (${importedName || bundle.appId || '-'}) [${previewText} / rev ${revisionText} / ${guestText}]`;
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
  updateConnectionStepIndicators();
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
      ? `差分を選んで反映: 候補から必要な差分だけ選びます（選択 ${state.reflectSelectedIds.size}件 / 元に戻す ${state.reflectUndoStack.length}回）`
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
  renderScopePickerSummaries();
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
  const checklist = state.reflectApplyChecklist && typeof state.reflectApplyChecklist === 'object'
    ? state.reflectApplyChecklist
    : {};
  const checklistDone = ['diff', 'plan', 'target'].filter((key) => !!checklist[key]).length;
  const targetCountLabel = isNode ? '選んだ差分' : '選んだセクション';
  const targetCountValue = isNode ? selectedNodeRows.length : scopeInfo.effectiveScopes.length;
  const nonFieldScopes = scopeInfo.effectiveScopes.filter((key) => key && key !== 'fieldSettings');
  const firstNonFieldScope = nonFieldScopes[0] || '';
  const safetyLabel = (checklistDone === 3 && backupReady && stopOnError) ? '準備OK' : '要見直し';
  const warnings: string[] = [];
  if (!diffReady) warnings.push('差分比較がまだ最新ではありません。「差分比較」または「差分比較して候補作成」から最新化してください。');
  if (!scopeInfo.baseScopes.length && !isNode) warnings.push('「反映セクションを選ぶ」から、今回まとめて反映するセクションを選んでください。');
  if (scopeInfo.warning) warnings.push(scopeInfo.warning);
  if (isNode && !state.reflectRows.length) warnings.push('差分を選んで反映モードです。まず「差分比較して候補作成」で候補を出してください。');
  if (checklistDone < 3) warnings.push('画面下の反映前チェックを完了してください。');
  if (!backupReady) warnings.push('バックアップ自動保存がOFFです。反映前に「今の比較先を保存」をおすすめします。');

  const nodeLoadAction = isNode && !state.reflectRows.length
    ? `<button class="btn sub" data-act="${diffReady ? 'loadReflectNodes' : 'runDiffLoadReflectNodes'}">${diffReady ? '差分候補を読込' : '差分比較して候補作成'}</button>`
    : '';
  const scopeDiffAction = !isNode && actualDiffRows.length
    ? '<button class="btn sub" data-act="applyScopeDiffOnly">差分があるセクションだけ選ぶ</button>'
    : '';
  const fieldEditorAction = !isNode && scopeInfo.effectiveScopes.includes('fieldSettings')
    ? '<button class="btn sub" data-act="openReflectPreviewEditor">フィールド確認を開く</button>'
    : '';
  const sectionEditorAction = !isNode && firstNonFieldScope
    ? `<button class="btn sub" data-act="openSectionPreviewEditor" data-section="${esc(firstNonFieldScope)}">他設定を編集</button>`
    : '';
  const selectedSrcCount = selectedNodeRows.filter((row) => deps.reflectRowModeById(row._id) === 'src').length;
  const selectedTgtCount = selectedNodeRows.length - selectedSrcCount;
  const selectedSectionLabels = scopeInfo.effectiveScopes
    .map((key) => SECTION_DEFS.find((item) => item.key === key)?.label || key)
    .slice(0, 6);
  const selectionMeta = isNode
    ? `候補 ${state.reflectRows.length}件 / 選択 ${selectedNodeRows.length}件 / 比較元採用 ${selectedSrcCount}件 / 比較先維持 ${selectedTgtCount}件`
    : `${selectedSectionLabels.join('、') || '未選択'}${scopeInfo.effectiveScopes.length > 6 ? `、他${scopeInfo.effectiveScopes.length - 6}件` : ''}`;
  const routeLabel = isNode ? '詳細ルート' : '標準ルート';
  const routeTitle = isNode ? '個別差分を選んで反映' : 'セクション単位で反映';
  const routeSub = isNode
    ? '必要な差分だけを選び、採用元を切り替えて反映します。'
    : '差分があるセクションを選び、プラン確認後にまとめて反映します。';
  const currentStep = !diffReady ? 1 : (!targetCountValue ? 2 : (!planReady ? 3 : 4));
  const stepHtml = [
    { no: 1, title: '差分を作る', meta: diffReady ? `最新差分 ${actualDiffRows.length}件` : '未実行または条件変更あり', done: diffReady },
    { no: 2, title: '対象を選ぶ', meta: targetCountValue ? `${targetCountLabel} ${targetCountValue}件` : '反映対象が未選択', done: targetCountValue > 0 },
    { no: 3, title: 'プラン確認', meta: planReady ? `確認済み ${state.lastApplyPlan?.totalReq || 0}req` : '未確認', done: planReady },
    { no: 4, title: 'プレビュー反映', meta: checklistDone === 3 ? 'チェック完了' : `チェック ${checklistDone}/3`, done: checklistDone === 3 && planReady }
  ].map((step) => `<div class="reflect-flow-step${step.done ? ' is-done' : ''}${currentStep === step.no ? ' is-current' : ''}">
      <div class="reflect-flow-step__no">${String(step.no).padStart(2, '0')}</div>
      <div class="reflect-flow-step__body">
        <div class="reflect-flow-step__title">${esc(step.title)}</div>
        <div class="reflect-flow-step__meta">${esc(step.meta)}</div>
      </div>
    </div>`).join('');
  const nextAction = !diffReady
    ? `<button class="btn btn-primary-emphasis" data-act="${isNode ? 'runDiffLoadReflectNodes' : 'runDiff'}">${isNode ? '差分比較して候補作成' : '差分比較を実行'}</button>`
    : (!targetCountValue
      ? (isNode
        ? (state.reflectRows.length ? '<button class="btn btn-primary-emphasis" data-act="selectVisibleReflectNodes">表示中を選択</button>' : '<button class="btn btn-primary-emphasis" data-act="loadReflectNodes">差分候補を読込</button>')
        : '<button class="btn btn-primary-emphasis" data-act="openReflectScopePicker">反映セクションを選ぶ</button>')
      : (!planReady
        ? '<button class="btn btn-primary-emphasis" data-act="previewApplyPlan">実行前プラン確認</button>'
        : '<button class="btn ok" data-act="applyPreview">プレビューへ反映</button>'));
  const modeSwitchAction = isNode
    ? '<button class="btn sub" data-act="reflectModeSection">セクション単位へ戻る</button>'
    : '<button class="btn sub" data-act="reflectModeNode">差分ごとに選ぶ</button>';
  const planAction = targetCountValue
    ? '<button class="btn sub" data-act="previewApplyPlan">プラン確認</button>'
    : (isNode
      ? (state.reflectRows.length ? '<button class="btn sub" data-act="selectVisibleReflectNodes">表示中を選択</button>' : `<button class="btn sub" data-act="${diffReady ? 'loadReflectNodes' : 'runDiffLoadReflectNodes'}">${diffReady ? '差分候補を読込' : '差分比較して候補作成'}</button>`)
      : '<button class="btn sub" data-act="openReflectScopePicker">対象を選ぶ</button>');
  const jsonRouteAction = '<button class="btn sub" data-act="reflectModeJson">JSON詳細へ</button>';
  const targetAdjustActions = [
    scopeDiffAction,
    nodeLoadAction,
    fieldEditorAction,
    sectionEditorAction
  ].filter(Boolean).join('');
  const routeSwitchActions = [
    modeSwitchAction,
    jsonRouteAction
  ].filter(Boolean).join('');

  return `<div class="reflect-assist">
    <div class="reflect-command-center">
      <div class="reflect-command-head">
        <div>
          <div class="reflect-command-kicker">Preview Apply Route</div>
          <div class="reflect-guide-title">${esc(routeTitle)}</div>
          <div class="reflect-guide-sub">比較先 App ${esc(c.target.appId || '-')} / 書き込み先はプレビューAPIです。画面に出す操作は標準ルートに絞り、細かい調整は詳細ルートにまとめています。</div>
        </div>
        <div class="reflect-command-next">
          <span class="reflect-guide-badge">${esc(routeLabel)}</span>
        </div>
      </div>
      <div class="reflect-flow">${stepHtml}</div>
      <div class="reflect-route-panel">
        <section class="reflect-route-primary">
          <div class="reflect-route-primary__copy">
            <div class="reflect-route-primary__label">${esc(routeLabel)}</div>
            <div class="reflect-route-primary__title">${esc(routeTitle)}</div>
            <div class="reflect-route-primary__meta">${esc(routeSub)} ${esc(selectionMeta || '未選択')}</div>
          </div>
          <div class="reflect-route-primary__action">${nextAction}</div>
        </section>
        <details class="reflect-route-details">
          <summary>
            <span>詳細ルート・補助操作</span>
            <small>個別差分、JSON、本番比較、手動確認</small>
          </summary>
          <div class="reflect-route-detail-grid">
            <section>
              <div class="reflect-route-detail-title">ルート切替</div>
              <div class="reflect-route-detail-actions">${routeSwitchActions}</div>
            </section>
            <section>
              <div class="reflect-route-detail-title">対象調整</div>
              <div class="reflect-route-detail-actions">${targetAdjustActions || '<span class="muted">現在の選択では追加調整はありません</span>'}</div>
            </section>
            <section>
              <div class="reflect-route-detail-title">確認補助</div>
              <div class="reflect-route-detail-actions">
                ${planAction}
                <button class="btn sub" data-act="runDiffAndPlan">差分比較してプラン</button>
                <button class="btn sub" data-act="runPreviewProdDiff">プレビュー⇔本番を比較</button>
                <button class="btn sub" data-act="markReflectTargetConfirmed">反映先を確認済みにする</button>
              </div>
            </section>
          </div>
        </details>
      </div>
    </div>
    <div class="reflect-summary-grid">
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">反映対象</div>
        <div class="reflect-summary-value">${targetCountValue}</div>
        <div class="reflect-summary-meta">${esc(targetCountLabel)} / ${isNode ? `候補 ${state.reflectRows.length}件` : `選択 ${scopeInfo.baseScopes.length}件`}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">反映される差分</div>
        <div class="reflect-summary-value">${targetRows.length}</div>
        <div class="reflect-summary-meta">高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">反映前チェック</div>
        <div class="reflect-summary-value">${esc(safetyLabel)}</div>
        <div class="reflect-summary-meta">チェック ${checklistDone}/3 / バックアップ ${backupReady ? 'ON' : 'OFF'} / エラー時 ${stopOnError ? '中断' : '継続'}</div>
      </div>
      <div class="reflect-summary-card">
        <div class="reflect-summary-label">プラン確認</div>
      <div class="reflect-summary-value">${esc(planReady ? '確認済み' : '未確認')}</div>
      <div class="reflect-summary-meta">${esc(planReady ? `最新確認: ${planTime}` : 'まだ実行前プラン確認をしていません')}</div>
      </div>
    </div>
    <p class="reflect-action-hint">基本は標準ルートだけで完結します。差分単位の採用元切替、JSON編集、本番との差分確認は「詳細ルート・補助操作」から開きます。</p>
    ${warnings.length ? warnings.map((msg) => `<div class="reflect-warning">${esc(msg)}</div>`).join('') : '<div class="reflect-good">このまま「実行前プラン確認」へ進めます。最終確認後に「プレビューへ反映」を実行してください。</div>'}
    ${backupState ? `<div class="reflect-good">${esc(backupState)}${state.lastPreviewBackupPayload ? ' / 必要なら「直前保存を戻す」で元に戻せます。' : ''}</div>` : ''}
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
      <span class="reflect-plan-inline__title">実行前プラン（現在の条件と一致）</span>
      <span class="reflect-plan-inline__meta">予定リクエスト ${plan.totalReq || 0} 件 · ${esc(stamp)}</span>
    </div>
    <pre class="reflect-plan-inline__pre">${esc(head)}${esc(more)}</pre>`;
    return;
  }
  if (stalePlan && hasPlan) {
    el.innerHTML = `<div class="reflect-plan-inline reflect-plan-inline--stale">
      <div class="reflect-plan-inline__head"><span class="reflect-plan-inline__title">前回のプランは古くなっています</span></div>
      <p class="reflect-plan-inline__muted">差分・反映対象・差分候補・ルックアップ等が変わった可能性があります。再度「実行前プラン確認」を実行してください。</p>
    </div>`;
    return;
  }
  el.innerHTML = `<div class="reflect-plan-inline reflect-plan-inline--empty">
    <div class="reflect-plan-inline__head"><span class="reflect-plan-inline__title">まだプラン未確認です</span></div>
    <p class="reflect-plan-inline__muted">「実行前プラン確認」を実行すると、ここにログ要約が表示されます。詳細は下部の<strong>結果</strong>エリアにも出力されます。</p>
  </div>`;
}

function buildSectionPreviewCardHtml(secKey, info) {
  const label = esc(info?.label || secKey);
  const shape = info?.shape;
  if (shape === 'map' && info.preview) {
    const p = info.preview;
    const counter = `<span class="reflect-preview-counter reflect-preview-counter--add">追加 ${p.addedCount}</span>` +
      `<span class="reflect-preview-counter reflect-preview-counter--upd">更新 ${p.updatedCount}</span>` +
      `<span class="reflect-preview-counter reflect-preview-counter--rm">削除 ${p.removedCount}</span>`;
    if (!p.totalCount) {
      return `<details class="reflect-preview-card"><summary><span class="reflect-preview-card__label">${label}</span>${counter}<span class="reflect-preview-card__muted">変更なし</span></summary></details>`;
    }
    const renderKey = (title, className, item, bothCols) => {
      if (bothCols) {
        return `<div class="reflect-preview-row reflect-preview-row--${className}">
          <div class="reflect-preview-row__key">${esc(item.key)}</div>
          <div class="reflect-preview-row__grid">
            <div class="reflect-preview-col"><div class="reflect-preview-col__label">変更前</div><pre class="reflect-preview-col__pre">${esc(item.before ?? '(なし)')}</pre></div>
            <div class="reflect-preview-col"><div class="reflect-preview-col__label">変更後</div><pre class="reflect-preview-col__pre">${esc(item.after ?? '(なし)')}</pre></div>
          </div>
        </div>`;
      }
      return `<div class="reflect-preview-row reflect-preview-row--${className}">
        <div class="reflect-preview-row__key">${esc(title)}: ${esc(item.key)}</div>
        <pre class="reflect-preview-row__pre">${esc(item.after ?? item.before ?? '')}</pre>
      </div>`;
    };
    const added = (p.addedKeys || []).map((item) => renderKey('追加', 'add', item, false)).join('');
    const updated = (p.updatedKeys || []).map((item) => renderKey('更新', 'upd', item, true)).join('');
    const removed = (p.removedKeys || []).map((item) => renderKey('削除', 'rm', item, false)).join('');
    const truncated = p.truncated ? `<div class="reflect-preview-card__muted">…一部省略（全${p.totalCount}件のうち先頭のみ表示）</div>` : '';
    return `<details class="reflect-preview-card"><summary><span class="reflect-preview-card__label">${label}</span>${counter}</summary>
      <div class="reflect-preview-card__body">
        ${added}${updated}${removed}${truncated}
      </div>
    </details>`;
  }
  if (shape === 'whole' && info.wholePreview) {
    const w = info.wholePreview;
    if (!w.changed) {
      return `<details class="reflect-preview-card"><summary><span class="reflect-preview-card__label">${label}</span><span class="reflect-preview-card__muted">変更なし</span></summary></details>`;
    }
    return `<details class="reflect-preview-card"><summary><span class="reflect-preview-card__label">${label}</span><span class="reflect-preview-counter reflect-preview-counter--upd">セクション全体更新</span></summary>
      <div class="reflect-preview-card__body">
        <div class="reflect-preview-row__grid">
          <div class="reflect-preview-col"><div class="reflect-preview-col__label">変更前</div><pre class="reflect-preview-col__pre">${esc(w.beforeText)}</pre></div>
          <div class="reflect-preview-col"><div class="reflect-preview-col__label">変更後</div><pre class="reflect-preview-col__pre">${esc(w.afterText)}</pre></div>
        </div>
      </div>
    </details>`;
  }
  return '';
}

export function renderReflectPlanPreview() {
  const el = getToolDocument().getElementById('u_reflectPlanPreview');
  if (!el) return;
  const planSig = getCurrentReflectPlanSignature();
  const plan = state.lastApplyPlan;
  const planReady = !!(plan && planSig && plan.signature === planSig);
  if (!planReady) {
    el.innerHTML = '';
    return;
  }
  const previews = plan.sectionPreviews || ({} as any);
  const entries = Object.entries(previews) as Array<[string, any]>;
  if (!entries.length) {
    el.innerHTML = '';
    return;
  }
  const changedEntries = entries.filter(([, info]) => {
    if (info?.shape === 'map') return (info.preview?.totalCount || 0) > 0;
    if (info?.shape === 'whole') return !!info.wholePreview?.changed;
    return false;
  });
  const totalChanges = changedEntries.reduce((acc, [, info]) => {
    if (info?.shape === 'map') return acc + (info.preview?.totalCount || 0);
    return acc + 1;
  }, 0);
  const keyword = String(state.reflectPlanPreviewKeyword || '').toLowerCase();
  const visibleEntries = keyword
    ? entries.filter(([key, info]) => {
        const label = String(info?.label || key || '').toLowerCase();
        return label.includes(keyword) || key.toLowerCase().includes(keyword);
      })
    : entries;
  const changedOnly = !!state.reflectPlanPreviewChangedOnly;
  const filteredEntries = changedOnly
    ? visibleEntries.filter(([, info]) => {
        if (info?.shape === 'map') return (info.preview?.totalCount || 0) > 0;
        if (info?.shape === 'whole') return !!info.wholePreview?.changed;
        return false;
      })
    : visibleEntries;
  const cards = filteredEntries.map(([key, info]) => buildSectionPreviewCardHtml(key, info)).filter(Boolean).join('');
  const emptyMsg = !cards
    ? `<div class="muted" style="padding:8px;font-size:11px">該当セクションはありません${keyword ? `（キーワード「${esc(keyword)}」）` : ''}</div>`
    : '';
  const keywordVal = esc(state.reflectPlanPreviewKeyword || '');
  el.innerHTML = `<div class="reflect-plan-preview__wrap">
    <div class="reflect-plan-preview__head">
      <span class="reflect-plan-preview__title">反映後プレビュー（ビフォー / アフター）</span>
      <span class="reflect-plan-preview__meta">変更 ${totalChanges}件 / ${changedEntries.length}セクション（表示 ${filteredEntries.length}/${entries.length}）</span>
    </div>
    <div class="reflect-plan-preview__toolbar" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0 8px">
      <input type="text" id="u_reflectPlanPreviewSearch" placeholder="セクション名で絞り込み" value="${keywordVal}" style="flex:1;min-width:140px;padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;font-size:11px">
      <label class="chip" style="font-size:10px" title="変更があるセクションだけ表示"><input type="checkbox" id="u_reflectPlanPreviewChangedOnly" ${changedOnly ? 'checked' : ''}> 変更ありのみ</label>
      <button type="button" class="btn sub" data-act="reflectPlanPreviewExpandAll" style="padding:3px 8px;font-size:10px" title="全セクションを展開">全て開く</button>
      <button type="button" class="btn sub" data-act="reflectPlanPreviewCollapseAll" style="padding:3px 8px;font-size:10px" title="全セクションを畳む">全て閉じる</button>
    </div>
    <p class="reflect-plan-preview__hint">各セクションのカードをクリックすると、反映前後のJSONを並べて確認できます。</p>
    <div class="reflect-plan-preview__list">${cards}${emptyMsg}</div>
  </div>`;

  const search = el.querySelector('#u_reflectPlanPreviewSearch') as (HTMLInputElement & { _kusBound?: boolean }) | null;
  if (search && !search._kusBound) {
    search._kusBound = true;
    let timer = 0;
    search.addEventListener('input', (e) => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        state.reflectPlanPreviewKeyword = (e.target as HTMLInputElement).value || '';
        renderReflectPlanPreview();
      }, 150);
    });
  }
  const changedToggle = el.querySelector('#u_reflectPlanPreviewChangedOnly') as (HTMLInputElement & { _kusBound?: boolean }) | null;
  if (changedToggle && !changedToggle._kusBound) {
    changedToggle._kusBound = true;
    changedToggle.addEventListener('change', (e) => {
      state.reflectPlanPreviewChangedOnly = !!(e.target as HTMLInputElement).checked;
      renderReflectPlanPreview();
    });
  }
}

export function renderReflectFooterBadges() {
  const el = getToolDocument().getElementById('u_reflectFooterBadges');
  if (!el) return;
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const diffRowCount = getActualDiffRows(state.lastDiffRows || []).length;
  const planSig = getCurrentReflectPlanSignature();
  const plan = state.lastApplyPlan;
  const planReady = !!(plan && planSig && plan.signature === planSig);
  const isNode = isReflectNodeModeEffective();
  const scopeCount = (deps.selectedScopeKeys?.(ui.applyScopes) || []).length;
  const selectedNodeCount = deps.getSelectedReflectRows ? deps.getSelectedReflectRows().length : 0;
  const blockReasons: string[] = [];
  if (!diffReady) blockReasons.push('差分比較を最新化してください');
  else if (diffRowCount === 0) blockReasons.push('差分が 0 件のため反映は不要です');
  if (isNode) {
    if (!(state.reflectRows || []).length) blockReasons.push('差分候補をまず読込してください');
    else if (selectedNodeCount === 0) blockReasons.push('反映する差分ノードを選択してください');
  } else {
    if (scopeCount === 0) blockReasons.push('反映セクションを 1 つ以上選択してください');
  }
  const canApply = blockReasons.length === 0;
  const blockHtml = blockReasons.length
    ? `<span class="reflect-footer-badge reflect-footer-badge--warn" title="${esc(blockReasons.join(' / '))}">反映不可: ${esc(blockReasons[0])}</span>`
    : '<span class="reflect-footer-badge reflect-footer-badge--ok">反映可能</span>';
  el.innerHTML = `
    <span class="reflect-footer-badge${diffReady ? ' reflect-footer-badge--ok' : ' reflect-footer-badge--warn'}">差分 ${diffReady ? `最新 (${diffRowCount}件)` : '要再実行'}</span>
    <span class="reflect-footer-badge${planReady ? ' reflect-footer-badge--ok' : ' reflect-footer-badge--warn'}">プラン ${planReady ? '確認済み' : '未確認'}</span>
    ${blockHtml}`;
  const doc = getToolDocument();
  const applyBtn = doc.getElementById('u_footerApply') as HTMLButtonElement | null;
  const planBtn = doc.getElementById('u_footerPlan') as HTMLButtonElement | null;
  const dryBtn = doc.getElementById('u_footerDryRun') as HTMLButtonElement | null;
  const applyDisabled = !canApply;
  const planDisabled = !(diffReady && diffRowCount > 0 && (isNode ? (state.reflectRows || []).length > 0 : scopeCount > 0));
  if (applyBtn) {
    applyBtn.disabled = applyDisabled;
    applyBtn.classList.toggle('is-disabled', applyDisabled);
    applyBtn.title = applyDisabled
      ? `反映できない状態です: ${blockReasons.join(' / ')}`
      : '選択した内容を比較先のプレビュー環境へ書き込みます。未確認時はプラン確認が先に開きます';
  }
  if (planBtn) {
    planBtn.disabled = planDisabled;
    planBtn.classList.toggle('is-disabled', planDisabled);
    planBtn.title = planDisabled
      ? 'プラン確認する前に差分比較と反映対象の選択を行ってください'
      : '比較先プレビューに対するAPIリクエスト内容を結果欄に表示します（実行前の確認）';
  }
  if (dryBtn) {
    dryBtn.disabled = planDisabled;
    dryBtn.classList.toggle('is-disabled', planDisabled);
    dryBtn.title = planDisabled
      ? 'ドライラン前に差分比較と反映対象の選択を行ってください'
      : 'APIを叩かずに、予定されているリクエスト一式をJSONファイルとして保存します（ドライラン）';
  }
}

export function renderReflectAssistPanel() {
  if (!ui.reflectAssist) return;
  ui.reflectAssist.innerHTML = buildReflectAssistHtml();
  renderReflectHowto();
  renderReflectPlanInline();
  renderReflectPlanPreview();
  renderReflectPostApplyCard();
  renderReflectApplyReport();
  renderReflectApplyHistory();
  renderReflectQuickPresets();
  renderReflectFooterBadges();
}

/**
 * 直近の反映結果レポート（セクションごとの成功/失敗/スキップ）を描画します。
 */
export function renderReflectApplyReport() {
  const host = getToolDocument().getElementById('u_reflectApplyReport');
  if (!host) return;
  const report = state.lastApplyReport;
  if (!report || !Array.isArray(report.sections) || !report.sections.length) {
    host.innerHTML = '';
    return;
  }
  const cls = report.hadError ? 'reflect-apply-report--warn' : 'reflect-apply-report--ok';
  const modeLabel = {
    section: 'セクションまとめ反映',
    nodes: '差分選択モード',
    patch: 'JSONパッチ反映',
    retry: '失敗セクション再反映',
    restore: 'バックアップ復元'
  }[report.mode] || report.mode || '反映';
  const stamp = new Date(report.completedAt).toLocaleString();
  const sectionHtml = report.sections.map((s) => {
    const statusCls = s.status === 'ok' ? 'ok' : s.status === 'ng' ? 'ng' : 'skipped';
    const statusLabel = s.status === 'ok' ? '成功' : s.status === 'ng' ? '失敗' : 'スキップ';
    const msg = s.message ? `<span class="reflect-apply-section__msg" title="${esc(s.message)}">${esc(s.message)}</span>` : '';
    return `<div class="reflect-apply-section">
      <span class="reflect-apply-section__label">${esc(s.label || s.sectionKey)}</span>
      <span class="reflect-apply-section__status ${statusCls}">${statusLabel}</span>
      ${msg}
    </div>`;
  }).join('');
  const retryBtn = report.ngCount > 0
    ? '<button type="button" class="btn ok" data-act="retryFailedSections" title="直近の反映で失敗したセクションだけを再送信します">失敗セクションだけ再反映</button>'
    : '';
  host.className = `reflect-apply-report ${cls}`;
  host.innerHTML = `<div class="reflect-apply-report__head">
      <span class="reflect-apply-report__title">直近の反映結果 — ${esc(modeLabel)}</span>
      <span class="reflect-apply-report__meta">比較先 ${esc(report.appId || '-')} / ${esc(stamp)}</span>
    </div>
    <div class="reflect-apply-report__counters">
      <span class="reflect-apply-counter reflect-apply-counter--ok">成功 ${report.okCount}</span>
      <span class="reflect-apply-counter reflect-apply-counter--ng">失敗 ${report.ngCount}</span>
      <span class="reflect-apply-counter reflect-apply-counter--skip">スキップ ${report.skipCount}</span>
    </div>
    <div class="reflect-apply-report__sections">${sectionHtml}</div>
    <div class="reflect-apply-report__actions">
      ${retryBtn}
      <button type="button" class="btn sub" data-act="copyApplyReport" title="レポート内容をクリップボードへコピーします">テキストでコピー</button>
      <button type="button" class="btn sub" data-act="dismissApplyReport" title="このレポートを閉じます">閉じる</button>
    </div>`;
}

/**
 * 反映履歴（セッション保存）を描画します。デフォルトは折り畳み。
 */
export function renderReflectApplyHistory() {
  const host = getToolDocument().getElementById('u_reflectApplyHistory');
  if (!host) return;
  const history = Array.isArray(state.reflectApplyHistory) ? state.reflectApplyHistory : [];
  if (!history.length) {
    host.innerHTML = '';
    return;
  }
  const open = state.reflectApplyHistoryOpen ? ' open' : '';
  const items = history.map((entry) => {
    const hasErr = entry.hadError || (entry.ngCount || 0) > 0;
    const modeLabel = {
      section: 'まとめ反映',
      nodes: '差分選択',
      patch: 'JSONパッチ',
      retry: '再反映',
      restore: '復元'
    }[entry.mode] || entry.mode || '反映';
    const time = new Date(entry.at).toLocaleString();
    const scopeLabel = (entry.scopes || []).slice(0, 4).join(', ') + ((entry.scopes || []).length > 4 ? ` 他${entry.scopes.length - 4}` : '');
    return `<div class="reflect-apply-history__item${hasErr ? ' has-error' : ''}" title="${esc(scopeLabel)}">
      <span class="reflect-apply-history__time">${esc(time)}</span>
      <span class="reflect-apply-history__summary">[${esc(modeLabel)}] 比較先 ${esc(entry.appId || '-')} / ${esc(scopeLabel || '-')}</span>
      <span class="reflect-apply-history__stats" style="color:${hasErr ? '#991b1b' : '#166534'}">OK ${entry.okCount || 0} / NG ${entry.ngCount || 0}</span>
    </div>`;
  }).join('');
  host.innerHTML = `<details${open} data-act-host="reflectApplyHistory">
      <summary>
        <span>反映履歴（このセッション ${history.length}件）</span>
        <button type="button" class="btn sub" data-act="clearApplyHistory" style="padding:2px 8px;font-size:10px" title="履歴を消去">クリア</button>
      </summary>
      <div class="reflect-apply-history__list">${items}</div>
    </details>`;
  // Bind toggle persistence
  const details = host.querySelector('details') as (HTMLDetailsElement & { _kusBound?: boolean }) | null;
  if (details && !details._kusBound) {
    details._kusBound = true;
    details.addEventListener('toggle', () => {
      state.reflectApplyHistoryOpen = details.open;
    });
  }
}

/**
 * 差分ノードモード用のクイックプリセット（ワンクリックでまとめて選択）を描画します。
 */
export function renderReflectQuickPresets() {
  const host = getToolDocument().getElementById('u_reflectQuickPresets');
  if (!host) return;
  if (!isReflectNodeModeEffective()) {
    host.innerHTML = '';
    return;
  }
  const rowCount = (state.reflectRows || []).length;
  const disabled = rowCount === 0;
  const disabledAttr = disabled ? 'disabled aria-disabled="true" style="opacity:.55;cursor:not-allowed"' : '';
  const label = '<span class="reflect-quick-presets__label">クイック選択:</span>';
  const buttons = REFLECT_QUICK_PRESETS.map((p) => {
    const modeAttr = `data-mode="${esc(p.mode || 'src')}"`;
    const hint = p.hint ? ` title="${esc(p.hint)}"` : '';
    return `<button type="button" class="reflect-quick-preset" data-act="applyReflectQuickPreset" data-preset="${esc(p.id)}" ${modeAttr}${hint} ${disabledAttr}>${esc(p.label)}</button>`;
  }).join('');
  host.innerHTML = `${label}${buttons}${disabled ? '<span class="muted" style="font-size:10px;align-self:center">差分候補を読込後に利用可</span>' : ''}`;
}

export function renderReflectPostApplyCard() {
  const host = getToolDocument().getElementById('u_reflectPostApply');
  if (!host) return;
  const appliedAt = state.lastApplyCompletedAt;
  if (!appliedAt) { host.innerHTML = ''; host.style.display = 'none'; return; }
  const appliedAtNum = Number(appliedAt);
  const diffReady = !!state.lastDiffAt && state.lastDiffSignature === deps.currentDiffSignature();
  const diffStale = !diffReady || (state.lastDiffAt && appliedAtNum > Number(state.lastDiffAt));
  const minutesAgo = Math.max(0, Math.round((Date.now() - appliedAtNum) / 60000));
  const ageLabel = minutesAgo === 0 ? 'たった今' : `${minutesAgo}分前`;
  const modeLabel = state.lastApplyCompletedMode === 'nodes' ? '差分選択モード' : 'まとめて反映モード';
  const hadError = !!state.lastApplyCompletedHadError;
  const statusCls = hadError ? 'reflect-post-apply--warn' : 'reflect-post-apply--ok';
  const statusLabel = hadError ? '一部エラーあり' : '正常完了';
  const staleNote = diffStale
    ? '<span class="reflect-post-apply__hint">反映後の実機状態はまだ比較されていません。「今すぐ再比較」で差分が 0 件になったか確認できます。</span>'
    : '<span class="reflect-post-apply__hint">現在表示中の差分は反映後の最新状態と同期済みです。</span>';
  host.style.display = 'block';
  host.innerHTML = `<div class="reflect-post-apply ${statusCls}">
    <div class="reflect-post-apply__head">
      <span class="reflect-post-apply__title">反映${ageLabel}に完了しました（${esc(modeLabel)} / ${esc(statusLabel)}）</span>
      <div class="reflect-post-apply__actions">
        <button type="button" class="btn ok" data-act="postApplyRecompare" title="反映後の比較先プレビューを再取得して差分比較を実行します"${diffStale ? '' : ' disabled'}>今すぐ再比較</button>
        <button type="button" class="btn sub" data-act="dismissPostApplyCard" title="このお知らせを閉じます">閉じる</button>
      </div>
    </div>
    ${staleNote}
  </div>`;
}

function renderReflectHowto() {
  if (!ui.reflectHowto) return;
  ui.reflectHowto.innerHTML = '';
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
  renderScopePickerSummaries();
}

export function syncApplyScopesFromSidebar() {
  const sidebarChecks = getToolDocument().querySelectorAll<HTMLInputElement>('#u_reflectSidebarSections [data-apply-scope]');
  const selected = new Set<string>();
  sidebarChecks.forEach((c) => { if (c.checked) selected.add(c.value); });
  const scopeChecks = [...(ui.applyScopes as Element).querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
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
        <div class="sec-preview-title" style="color:#1d4ed8">差分選択の状況</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill">候補 ${state.reflectRows.length}件</span>
          <span class="sec-diff-pill">選択 ${rows.length}件</span>
          <span class="sec-diff-pill">比較元 ${rows.filter((r) => deps.reflectRowModeById(r._id) === 'src').length}</span>
          <span class="sec-diff-pill">比較先 ${rows.filter((r) => deps.reflectRowModeById(r._id) === 'tgt').length}</span>
        </div>
        <div class="muted" style="margin-top:8px">重要度: 高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
      </div>`;
    if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = '差分を選んで反映';
    return;
  }

  if (activeSec) {
    const def = SECTION_DEFS.find((d) => d.key === activeSec);
    if (!def) { overview.innerHTML = ''; return; }
    const count = diffCounts[activeSec] || { total: 0, added: 0, removed: 0, changed: 0 };
    const rows = getActualDiffRows(state.lastDiffRows || []).filter((r) => r.sectionKey === activeSec);
    const openEditorBtn = activeSec === 'fieldSettings'
      ? '<button class="btn primary-action" data-act="openReflectPreviewEditor">フィールド確認を開く</button>'
      : `<button class="btn primary-action" data-act="openSectionPreviewEditor" data-section="${esc(activeSec)}">このセクションを編集</button>`;
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
        <div class="reflect-section-actions">
          ${openEditorBtn}
          <button class="btn sub" data-act="goDiffReview">差分一覧でこの差分を見る</button>
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

    const totalDiff = Object.values(diffCounts).reduce((s: number, c: any) => s + (c?.total || 0), 0);
    const fieldSelected = selectedScopes.has('fieldSettings');
    const hasNonFieldSelected = [...selectedScopes].some((key) => key && key !== 'fieldSettings');
    overview.innerHTML = `
      <div class="sec-preview" style="border-color:#c7d2fe;background:#eef2ff">
        <div class="sec-preview-title" style="color:#4338ca">まとめて反映の全体像</div>
        <div class="sec-diff-summary">
          <span class="sec-diff-pill" style="border-color:#c7d2fe">選択セクション ${selectedScopes.size}件</span>
          <span class="sec-diff-pill" style="border-color:#c7d2fe">総差分 ${totalDiff}件</span>
        </div>
      </div>
      ${selectedScopes.size > 0 ? `<div class="sec-overview-grid">${cards}</div>
      <div class="reflect-inline-note">選んだセクションの中で、フィールドは「フィールド確認」、ビュー・レイアウト・通知・権限などは「他設定を編集」から細かく直せます。</div>
      <div class="reflect-inline-list">
        ${fieldSelected ? '<button class="btn sub" data-act="openReflectPreviewEditor">フィールド確認を開く</button>' : ''}
        ${hasNonFieldSelected ? '<button class="btn sub" data-act="openSectionPreviewEditor">他設定を編集</button>' : ''}
      </div>` : '<div class="muted" style="text-align:center;padding:20px">「反映セクションを選ぶ」から、まとめて反映したいセクションを選んでください</div>'}`;
    if (ui.reflectMainTitle) ui.reflectMainTitle.textContent = 'いまの反映内容';
  }
}

export function renderReflectActiveFilterChips() {
  const host = ui.activeFilterChips;
  if (!host) return;
  const keyword = (ui.nodeSearch?.value || '').trim();
  const filterSec = ui.nodeFilterSection?.value || '';
  const filterType = ui.nodeFilterType?.value || '';
  const filterSev = ui.nodeFilterSeverity?.value || '';
  const propFilters = state.reflectPropertyFilters instanceof Set ? [...state.reflectPropertyFilters] : [];
  const chips: string[] = [];
  if (keyword) {
    chips.push(`<button type="button" class="reflect-active-chip reflect-active-chip--kw" data-act="removeActiveFilter" data-filter-kind="keyword" title="キーワード絞り込みを解除">キーワード: ${esc(keyword)} <span class="reflect-active-chip__x">×</span></button>`);
  }
  if (filterSec) {
    const label = SECTION_DEFS.find((d) => d.key === filterSec)?.label || filterSec;
    chips.push(`<button type="button" class="reflect-active-chip" data-act="removeActiveFilter" data-filter-kind="section" title="セクション絞り込みを解除">セクション: ${esc(label)} <span class="reflect-active-chip__x">×</span></button>`);
  }
  if (filterType) {
    const label = getDiffTypeDisplayLabel(filterType) || filterType;
    chips.push(`<button type="button" class="reflect-active-chip reflect-active-chip--type" data-act="removeActiveFilter" data-filter-kind="type" title="種別絞り込みを解除">種別: ${esc(label)} <span class="reflect-active-chip__x">×</span></button>`);
  }
  if (filterSev) {
    const label = getSeverityDisplayLabel(filterSev.toLowerCase()) || filterSev;
    chips.push(`<button type="button" class="reflect-active-chip reflect-active-chip--sev" data-act="removeActiveFilter" data-filter-kind="severity" title="重要度絞り込みを解除">重要度: ${esc(label)} <span class="reflect-active-chip__x">×</span></button>`);
  }
  propFilters.forEach((key) => {
    chips.push(`<button type="button" class="reflect-active-chip reflect-active-chip--prop" data-act="removeReflectPropertyFilter" data-prop="${esc(key)}" title="プロパティ「${esc(key)}」の絞り込みを解除">プロパティ: ${esc(key)} <span class="reflect-active-chip__x">×</span></button>`);
  });
  if (!chips.length) { host.innerHTML = ''; return; }
  host.innerHTML = `<span class="reflect-active-chips__label">適用中の絞り込み</span>${chips.join('')}<button type="button" class="reflect-active-chip-clear" data-act="clearReflectNodeFilters" title="すべての絞り込み条件を解除">すべて解除</button>`;
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
      ? '反映対象の差分候補はありません。'
      : '差分候補はまだ読み込まれていません（差分比較後に「差分候補を読込」）';
    ui.reflectNodeList.innerHTML = `<div style="padding:10px;font-size:12px;color:#64748b">${emptyText}</div>`;
    if (ui.nodePropertyList) ui.nodePropertyList.innerHTML = '<div class="muted" style="padding:6px">差分候補を読み込むと表示されます</div>';
    if (ui.nodePropertyChips) ui.nodePropertyChips.innerHTML = '<span class="muted" style="font-size:10px">未選択（すべて対象）</span>';
    state.reflectActiveNodeId = '';
    renderReflectActiveFilterChips();
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
  const buildNodeSearchText = (r) => [
    r.path || '',
    r.section || '',
    r.sectionKey || '',
    r.type || '',
    r.severity || '',
    r.reasonSummary || '',
    r.impactSummary || '',
    r.renameCandidate ? `${r.renameCandidate.fromCode || ''} ${r.renameCandidate.toCode || ''}` : '',
    ...(r.impactRefs || []).map((ref) => `${ref.section || ''} ${ref.kind || ''} ${ref.path || ''} ${ref.label || ''}`)
  ].join('\n').toLowerCase();
  const filtered = rows.filter((r) => {
    if (keyword && !buildNodeSearchText(r).includes(keyword)) return false;
    if (filterSec && r.sectionKey !== filterSec) return false;
    if (filterType === 'moved') {
      if (!r.moved) return false;
    } else if (filterType && r.type !== filterType) {
      return false;
    }
    if (filterSev && (r.severity || 'low').toUpperCase() !== filterSev) return false;
    if (filterProps.size && !filterProps.has(extractPropertyKeyFromPath(r.path))) return false;
    return true;
  });
  const activeRow = deps.getActiveReflectRow(filtered.map((r) => r._id));
  const selected = state.reflectSelectedIds || new Set();
  const selectedRows = rows.filter((r) => selected.has(r._id));
  const selectedCount = selectedRows.length;
  const srcCount = selectedRows.filter((r) => deps.reflectRowModeById(r._id) === 'src').length;
  const tgtCount = selectedRows.length - srcCount;
  const sev = summarizeSeverity(selectedRows);
  const header = `<div class="reflect-node-list-summary">
    <div class="reflect-node-list-summary__main">候補 ${rows.length}件 / 表示 ${filtered.length}件 / 選択 ${selectedCount}件</div>
    <div class="reflect-node-list-summary__sub">比較元採用 ${srcCount} / 比較先維持 ${tgtCount} / 高 ${sev.high} / 中 ${sev.medium} / 低 ${sev.low}</div>
  </div>`;
  renderReflectActiveFilterChips();
  if (!filtered.length) {
    ui.reflectNodeList.innerHTML = `${header}<div class="reflect-node-empty">条件に一致する差分候補がありません。検索または絞り込み条件を見直してください。</div>`;
    renderReflectNodeDetail();
    renderBundleState();
    renderReflectModeUi();
    renderReflectAssistPanel();
    return;
  }
  const visibleRows = filtered.slice(0, 1200);
  const truncatedCount = Math.max(0, filtered.length - visibleRows.length);
  const body = visibleRows.map((r) => {
    const checked = selected.has(r._id) ? 'checked' : '';
    const mode = deps.reflectRowModeById(r._id);
    const typeLabel = getDiffTypeDisplayLabel(r.type, { moved: !!r.moved });
    const severity = String(r.severity || 'low').toLowerCase();
    const typeClass = r.moved ? 'moved' : (r.type || 'changed');
    const reason = String(r.reasonSummary || '').trim();
    const impact = String(r.impactSummary || '').trim() || (r.impactCount ? `影響 ${r.impactCount}件` : '');
    const rename = r.renameCandidate
      ? `名称変更候補 ${r.renameCandidate.fromCode || '-'} → ${r.renameCandidate.toCode || '-'}`
      : '';
    const metaItems = [reason, impact, rename].filter(Boolean);
    const modeLabel = mode === 'src' ? '比較元を採用' : '比較先を維持';
    const selectedLabel = selected.has(r._id) ? '選択中' : '未選択';
    return `<article class="reflect-node-card-item${activeRow?._id === r._id ? ' is-active' : ''}${selected.has(r._id) ? ' is-selected' : ''}" data-node-open="${esc(r._id)}">
      <div class="reflect-node-card-headline">
        <label class="reflect-node-card-check" title="${esc(selectedLabel)}">
          <input type="checkbox" data-node-id="${esc(r._id)}" ${checked}>
          <span>${esc(selectedLabel)}</span>
        </label>
        <div class="reflect-node-card-badges">
          <span class="reflect-node-list-badge reflect-node-list-badge--${esc(severity)}">重要度 ${esc(getSeverityDisplayLabel(severity))}</span>
          <span class="reflect-node-type reflect-node-type--${esc(typeClass)}">${esc(typeLabel)}</span>
        </div>
      </div>
      <div class="reflect-node-card-main">
        <div class="reflect-node-card-title">${esc(r.section || '-')}</div>
        <div class="reflect-node-card-path" title="${esc(r.path || '-')}">${esc(r.path || '-')}</div>
        ${metaItems.length ? `<div class="reflect-node-card-meta">${metaItems.map((item) => `<span>${esc(item)}</span>`).join('')}</div>` : ''}
      </div>
      <div class="reflect-node-card-actions">
        <button type="button" class="reflect-node-mode-btn reflect-node-mode-btn--${esc(mode)}" data-node-mode="${esc(r._id)}">${esc(modeLabel)}</button>
        <span class="reflect-node-card-hint">クリックで詳細表示</span>
      </div>
    </article>`;
  }).join('');
  ui.reflectNodeList.innerHTML = `${header}<div class="reflect-node-card-list">${body}</div>${truncatedCount ? `<div class="reflect-node-list-more">他 ${truncatedCount}件は絞り込みで表示できます</div>` : ''}`;
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
    ui.reflectNodeDetail.innerHTML = '<div class="reflect-node-detail-empty">表示中の差分候補がありません。左の検索条件や絞り込みを調整してください。</div>';
    return;
  }
  const visibleIds = Array.from((ui.reflectNodeList as Element | null)?.querySelectorAll<HTMLElement>('[data-node-open]') || []).map((el) => el.dataset.nodeOpen).filter(Boolean);
  const row = deps.getActiveReflectRow(visibleIds.length ? visibleIds : null);
  if (!row) {
    ui.reflectNodeDetail.innerHTML = '<div class="reflect-node-detail-empty">差分候補を選ぶと、ここで比較内容と実際に反映される値を確認できます。</div>';
    return;
  }

  const selected = state.reflectSelectedIds.has(row._id);
  const mode = deps.reflectRowModeById(row._id);
  const severity = String(row.severity || 'low').toLowerCase();
  const activeTab = ['diff', 'sbs', 'src', 'tgt', 'apply'].includes(state.reflectDetailTab) ? state.reflectDetailTab : 'diff';
  const useCharDiff = !!ui.charDiff?.checked;
  const tabs = [
    { key: 'diff', label: '差分' },
    { key: 'sbs', label: '並列ビュー' },
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
  } else if (activeTab === 'sbs') {
    const leftJson = deps.stringifyForDiff(row.left);
    const rightJson = deps.stringifyForDiff(row.right);
    const applyJson = deps.stringifyForDiff(deps.reflectRowDesiredValue(row));
    bodyHtml = `<div class="reflect-node-detail-note">比較元 / 比較先 / 反映値の 3 面同時表示です。現在の反映モードは<strong>${mode === 'src' ? '比較元' : '比較先'}採用</strong>。ボタンでワンクリック切替できます。</div>
      <div class="reflect-node-sbs" style="grid-template-columns:1fr 1fr 1fr">
        <div class="reflect-node-sbs__col">
          <div class="reflect-node-sbs__label">比較元 (src)</div>
          <pre class="reflect-node-sbs__pre">${esc(leftJson)}</pre>
        </div>
        <div class="reflect-node-sbs__col">
          <div class="reflect-node-sbs__label">比較先 (tgt)</div>
          <pre class="reflect-node-sbs__pre">${esc(rightJson)}</pre>
        </div>
        <div class="reflect-node-sbs__col" style="border-color:${mode === 'src' ? '#c7d2fe' : '#a7f3d0'};background:${mode === 'src' ? '#eef2ff' : '#ecfdf5'}">
          <div class="reflect-node-sbs__label" style="background:${mode === 'src' ? '#e0e7ff' : '#d1fae5'}">反映値 — ${mode === 'src' ? '比較元採用' : '比較先維持'}</div>
          <pre class="reflect-node-sbs__pre">${esc(applyJson)}</pre>
        </div>
      </div>`;
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
    <div class="reflect-node-detail-eyebrow">差分の詳細</div>
    <div class="reflect-node-detail-title">${esc(row.section || '-')} / ${esc(getDiffTypeDisplayLabel(row.type, { moved: !!row.moved }))}</div>
    <div class="reflect-node-detail-path">${esc(row.path || '-')}</div>
    <div class="reflect-node-badges">
      <span class="reflect-node-badge ${esc(severity)}">${esc(getSeverityDisplayLabel(severity))}重要度</span>
      <span class="reflect-node-badge">${selected ? '選択中' : '未選択'}</span>
      <span class="reflect-node-badge">${mode === 'src' ? '比較元を採用' : '比較先を残す'}</span>
    </div>
    <div class="reflect-node-actions">
      <button class="btn ${selected ? 'sub' : 'ok'}" data-act="toggleActiveReflectNodeSelection">${selected ? '選択解除' : 'このノードを選択'}</button>
      <button class="btn ok" data-act="toggleActiveReflectNodeMode">${mode === 'src' ? '比較先を採用' : '比較元を採用'}</button>
      <button class="btn sub" data-act="focusActiveReflectNodeDiff">上の差分一覧で開く</button>
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
